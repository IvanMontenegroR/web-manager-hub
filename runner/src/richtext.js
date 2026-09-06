// Los campos de CUERPO de Drupal no son un textarea: son un textarea ESCONDIDO con un
// CKEditor 5 montado encima. Escribirlos tiene tres trampas, y las tres se pagaron caro:
//
//   1. El editor se monta y se desmonta SOLO. Cambiar el formato de texto no manda
//      ninguna peticion a Drupal — destruye el editor y crea otro, ahi nomas en el
//      navegador. Como no hay peticion, esperar el AJAX de Drupal no sirve de nada: hay
//      que esperar al editor. Escribir en el medio del cambio es escribirle a un editor
//      que se esta muriendo: el texto se ve un instante y despues no esta.
//   2. Tocarle el DOM por abajo lo rompe. CKEditor mantiene su propio modelo y un mapa
//      contra el DOM; vaciar el contenteditable a mano deja ese mapa mintiendo y el
//      editor empieza a tirar errores de null. Lo que se ve escrito no esta en el modelo,
//      y al guardar no viaja nada.
//   3. El textarea NO tiene el valor hasta que alguien lo sincroniza. Leerlo para
//      verificar da vacio aunque el texto este a la vista.
//
// Como se llega al editor: por el `ckeditorInstance` que CKEditor deja en el elemento
// editable. Esa es la unica via que no depende de como el sitio registre sus editores —
// `Drupal.CKEditor5Instances` es de Drupal y puede no estar, o estar y no coincidir.
// Se prueba igual como segunda opcion, pero el editable manda.

// La ultima no es una ruta distinta: es volver a probar el editor DESPUES de esperarlo.
// Si Drupal lo monto tarde, se llevo puesto lo que hubiera en el textarea, y esta es la
// oportunidad de escribirle al editor que ahora si existe.
const RUTAS = ['editor', 'tecleado', 'textarea', 'editor-tarde']

// Espera a que el campo se ASIENTE: o hay un editor VIVO, o quedo claro que este campo
// no va a tener editor y lo que hay es el textarea pelado.
//
// La pregunta dificil es la segunda. "El textarea se ve" NO alcanza: Drupal carga
// CKEditor tarde — el subform aparece por AJAX y el editor monta segundos despues —, asi
// que un textarea a la vista puede ser un campo sin editor o uno cuyo editor todavia
// viene en camino. Escribir en el segundo caso es tirar el texto: cuando el editor monta,
// arranca con lo suyo y pisa el textarea.
//
// Quien sabe la respuesta es Drupal: `drupalSettings.editor.formats` lista los formatos
// que tienen editor. Si el formato de este campo esta ahi, se espera y punto, sin
// heuristicas. La heuristica del textarea queda solo para cuando eso no se puede saber.
export async function esperarEditor(page, ta, opciones = {}) {
  const { formato = null, ms = 20000 } = opciones
  return ta.evaluate((el, [tope, fmt]) => new Promise((listo) => {
    const t0 = Date.now()
    const QUIETO = 900
    let visibleDesde = null

    // true = va a tener editor, false = no, null = no se puede saber.
    const tendraEditor = () => {
      const F = window.drupalSettings && window.drupalSettings.editor
        && window.drupalSettings.editor.formats
      const activo = fmt || el.getAttribute('data-editor-active-text-format')
      if (!F || !activo) return null
      return !!F[activo]
    }

    const mirar = () => {
      const cont = el.closest('.js-form-item, .form-item') || el.parentElement
      const ed = cont && cont.querySelector('.ck-editor__editable')
      if (ed && ed.ckeditorInstance) return listo('editor')

      // Medio editor dibujado tambien cuenta como "esta montando": no es momento de
      // escribir el textarea.
      const montando = !!(cont && cont.querySelector('.ck-editor'))
      if (tendraEditor() !== true && !montando) {
        // OJO con este "esta a la vista": al DESTRUIR el editor, CKEditor devuelve el
        // textarea a la pantalla por un instante, justo antes de que monte el siguiente.
        // Creerle a ese instante es escribir en el hueco entre un editor y el otro.
        if (el.offsetParent !== null) {
          if (visibleDesde == null) visibleDesde = Date.now()
          if (Date.now() - visibleDesde > QUIETO) return listo('textarea')
        } else {
          visibleDesde = null
        }
      }
      if (Date.now() - t0 > tope) return listo(null)
      setTimeout(mirar, 100)
    }
    mirar()
  }), [ms, formato]).catch(() => null)
}

// Escribe el valor y COMPRUEBA que haya quedado, ruta por ruta. Si la primera no pega, se
// prueba la siguiente en vez de dar el campo por escrito: un cuerpo vacio no se nota
// hasta que alguien abre la pagina en el sitio.
// Devuelve { via, intentos } — `via` null significa que ninguna funciono.
export async function escribirRich(page, ta, valor) {
  const intentos = []
  for (const via of RUTAS) {
    if (via === 'editor-tarde') await esperarEditor(page, ta, { ms: 8000 })
    const pudo = await porRuta(page, ta, String(valor), via === 'editor-tarde' ? 'editor' : via)
    if (!pudo) { intentos.push(`${via}: no disponible`); continue }
    const leido = await leerRich(page, ta)
    if (leido) return { via, intentos }
    intentos.push(`${via}: escribio y quedo vacio`)
  }
  return { via: null, intentos }
}

async function porRuta(page, ta, valor, via) {
  if (via === 'editor') {
    return ta.evaluate((el, h) => {
      const ed = window.__runnerCk(el)
      if (!ed) return false
      try {
        ed.setData(h)
        // Deja el valor tambien en el textarea. Drupal lo hace al enviar el formulario,
        // pero el runner necesita poder LEERLO antes para verificar.
        if (typeof ed.updateSourceElement === 'function') ed.updateSourceElement()
        return true
      } catch { return false }
    }, aHtml(valor)).catch(() => false)
  }

  if (via === 'tecleado') {
    // Se TECLEA en el contenteditable. Nunca se le toca el innerHTML — eso es lo que le
    // rompe a CKEditor el mapa entre su modelo y el DOM.
    const editable = editableDe(ta)
    if (!(await editable.count())) return false
    try {
      await editable.first().click({ timeout: 3000 })
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
      await page.keyboard.insertText(valor)
      return true
    } catch { return false }
  }

  // El textarea, aunque este escondido: `fill` exige que se vea y aca eso no sirve.
  return ta.evaluate((el, v) => {
    el.value = v
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }, valor).catch(() => false)
}

// Lo que hay AHORA en el campo, como texto plano.
export async function leerRich(page, ta) {
  const porApi = await ta.evaluate((el) => {
    const ed = window.__runnerCk(el)
    if (!ed) return null
    try { return ed.getData() } catch { return null }
  }).catch(() => null)
  if (porApi != null) return textoPlano(porApi)

  const editable = editableDe(ta)
  if (await editable.count()) return textoPlano(await editable.first().innerText())
  return textoPlano(await ta.inputValue().catch(() => ''))
}

// Todo lo que se sabe del campo, para cuando algo falla. Sin esto, un "quedo vacio" no
// dice si el problema fue encontrar el editor, escribirle, o que se lo comio despues.
export async function diagnosticoRich(page, ta) {
  const d = await ta.evaluate((el) => {
    const cont = el.closest('.js-form-item, .form-item') || el.parentElement
    const editable = cont && cont.querySelector('.ck-editor__editable')
    const M = window.Drupal && window.Drupal.CKEditor5Instances
    const ed = window.__runnerCk(el)
    let enEditor = null
    if (ed) { try { enEditor = ed.getData() } catch (e) { enEditor = 'ERROR: ' + e.message } }
    return {
      editable: !editable ? 'no hay' : (editable.ckeditorInstance ? 'con instancia' : 'SIN instancia'),
      mapDrupal: M ? `${M.size} instancia(s)` : 'no existe',
      textarea: el.offsetParent === null ? 'escondido' : 'a la vista',
      enEditor,
      enEditable: editable ? editable.innerText : null,
      enTextarea: el.value,
    }
  }).catch((e) => ({ error: e.message }))
  const corto = (v) => (v == null ? '—' : String(v).replace(/\s+/g, ' ').trim().slice(0, 40))
  return `editable ${d.editable}, Map de Drupal ${d.mapDrupal}, textarea ${d.textarea}, `
    + `editor dice "${corto(d.enEditor)}", editable dice "${corto(d.enEditable)}", `
    + `textarea dice "${corto(d.enTextarea)}"`
}

// El contenteditable que CKEditor pone al lado del textarea, si lo hay.
const editableDe = (ta) => ta
  .locator('xpath=ancestor::*[contains(@class,"js-form-item") or contains(@class,"form-item")][1]')
  .locator('.ck-editor__editable[contenteditable="true"]')

// La busqueda del editor se instala UNA vez por pagina para no repetirla en cada
// `evaluate`. Va como init script: corre antes que el JS del sitio, en cada navegacion.
export async function prepararPagina(page) {
  const buscador = () => {
    window.__runnerCk = (el) => {
      // 1. El propio CKEditor deja la instancia colgada del elemento editable.
      const cont = el.closest('.js-form-item, .form-item') || el.parentElement
      const editable = cont && cont.querySelector('.ck-editor__editable')
      if (editable && editable.ckeditorInstance) return editable.ckeditorInstance
      // 2. El registro de Drupal, por si el editable todavia no esta.
      const M = window.Drupal && window.Drupal.CKEditor5Instances
      if (M && typeof M.values === 'function') {
        for (const c of M.values()) if (c && c.sourceElement === el) return c
        const id = el.getAttribute('data-ckeditor5-id')
        if (id != null) return M.get(id) || M.get(Number(id)) || null
      }
      return null
    }
  }
  await page.addInitScript(buscador)
  // La pagina puede estar ya cargada (el navegador queda abierto entre corridas).
  await page.evaluate(buscador).catch(() => {})
}

export const aHtml = (texto) => String(texto)
  .split(/\n{2,}/)
  .map((p) => `<p>${escaparHtml(p).replace(/\n/g, '<br>')}</p>`)
  .join('')

const escaparHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const textoPlano = (html) => String(html == null ? '' : html)
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(p|div|li|h\d)>/gi, '\n')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

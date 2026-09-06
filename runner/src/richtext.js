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
// Por eso todo pasa por la API del editor: `setData` para escribir, `getData` para leer y
// `updateSourceElement` para dejar el valor tambien en el textarea. Si no hay editor
// montado (un formato de texto plano), se escribe el textarea y listo.

// Espera a que el campo se ASIENTE: o se monta un editor, o el textarea queda a la vista
// (que es lo que pasa con un formato sin editor). Cualquiera de las dos sirve.
export async function esperarEditor(page, ta, ms = 10000) {
  return ta.evaluate((el, tope) => new Promise((listo) => {
    const t0 = Date.now()
    const QUIETO = 900
    let visibleDesde = null
    const mirar = () => {
      const M = window.Drupal && window.Drupal.CKEditor5Instances
      if (M && typeof M.values === 'function') {
        for (const c of M.values()) if (c && c.sourceElement === el) return listo('editor')
      }
      // OJO con este "esta a la vista": al DESTRUIR el editor, CKEditor devuelve el
      // textarea a la pantalla por un instante, justo antes de que monte el siguiente.
      // Creerle a ese instante es escribir en el hueco entre un editor y el otro, que es
      // exactamente el bug que esto viene a arreglar. Por eso tiene que quedarse quieto
      // un rato antes de darlo por bueno.
      if (el.offsetParent !== null) {
        if (visibleDesde == null) visibleDesde = Date.now()
        if (Date.now() - visibleDesde > QUIETO) return listo('textarea')
      } else {
        visibleDesde = null
      }
      if (Date.now() - t0 > tope) return listo(null)
      setTimeout(mirar, 100)
    }
    mirar()
  }), ms).catch(() => null)
}

// Escribe el valor. Devuelve POR DONDE lo escribio, que es lo que hace falta saber cuando
// algo sale mal: no es lo mismo que haya fallado la API del editor que el textarea.
export async function escribirRich(page, ta, valor) {
  const html = aHtml(valor)

  const porApi = await ta.evaluate((el, h) => {
    // Drupal guarda las instancias en un Map global y le pone al textarea un
    // `data-ckeditor5-id`, pero lo que no miente es el `sourceElement` del propio editor.
    const M = window.Drupal && window.Drupal.CKEditor5Instances
    let ed = null
    if (M && typeof M.values === 'function') {
      for (const c of M.values()) if (c && c.sourceElement === el) { ed = c; break }
      const id = ed ? null : el.getAttribute('data-ckeditor5-id')
      if (id != null) ed = M.get(id) || M.get(Number(id)) || null
    }
    if (!ed) return null
    try {
      ed.setData(h)
      // Deja el valor tambien en el textarea. Drupal lo hace al enviar el formulario,
      // pero el runner necesita poder LEERLO antes para verificar.
      if (typeof ed.updateSourceElement === 'function') ed.updateSourceElement()
      return 'editor'
    } catch { return null }
  }, html).catch(() => null)
  if (porApi) return porApi

  // Sin API: se TECLEA en el contenteditable. Nunca se le toca el innerHTML — eso es lo
  // que rompia el editor.
  const editable = editableDe(ta)
  if (await editable.count()) {
    await editable.first().click()
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
    await page.keyboard.insertText(String(valor))
    return 'tecleado'
  }

  await ta.fill(String(valor))
  return 'textarea'
}

// Lo que hay AHORA en el campo, como texto plano.
export async function leerRich(page, ta) {
  const porApi = await ta.evaluate((el) => {
    const M = window.Drupal && window.Drupal.CKEditor5Instances
    let ed = null
    if (M && typeof M.values === 'function') {
      for (const c of M.values()) if (c && c.sourceElement === el) { ed = c; break }
      const id = ed ? null : el.getAttribute('data-ckeditor5-id')
      if (id != null) ed = M.get(id) || M.get(Number(id)) || null
    }
    if (!ed) return null
    try { return ed.getData() } catch { return null }
  }).catch(() => null)
  if (porApi != null) return textoPlano(porApi)

  const editable = editableDe(ta)
  if (await editable.count()) return textoPlano(await editable.first().innerText())
  return textoPlano(await ta.inputValue().catch(() => ''))
}

// El contenteditable que CKEditor pone al lado del textarea, si lo hay.
const editableDe = (ta) => ta
  .locator('xpath=ancestor::*[contains(@class,"js-form-item") or contains(@class,"form-item")][1]')
  .locator('.ck-editor__editable[contenteditable="true"]')

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

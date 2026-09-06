// El MOTOR: toma un manifiesto + un mapping y arma la pagina en el formulario de
// Drupal, manejando el navegador con la sesion que vos ya abriste.
//
// Reglas de la casa, y no son negociables:
//   - Siempre BORRADOR. El runner no publica: destilda "Publicado" si el mapping dice
//     donde esta. Nada de lo que hace llega al publico sin que un humano lo apruebe.
//   - No modifica contenido existente: solo entra a "crear contenido".
//   - Si algo no cuadra, FRENA. Un campo que no aparece es un error, no un aviso: una
//     pagina a medio armar es peor que una que no se armo.
//   - Las IMAGENES no se tocan (ver README): el editor las sube a mano.
import { resolveSelector, rowSelector, widgetDsel, namePath, fieldWrapper } from './mapping.js'

const IMAGE_KINDS = new Set(['image', 'media', 'file'])
const MAX_DELTA = 100
// Cuantas veces se vuelve a intentar un alta que fallo POR EL SERVIDOR.
const REINTENTOS = 3
const culpaDelServidor = (lineas) => lineas.some((t) => /HTTP (5\d\d|429)\b/.test(t))

export async function buildPage({ page, mapping, manifest, save = false, onStep = () => {}, esperaSubform = 45000 }) {
  // Drupal, cuando algo falla, dice "revisa la consola del navegador". El runner puede
  // hacer eso: se escuchan los errores y se pegan al mensaje si la corrida termina mal.
  const consola = []
  const anotar = (t) => { if (consola.length < 40) consola.push(String(t).replace(/\s+/g, ' ').slice(0, 200)) }
  const oyentes = [
    ['console', (m) => { if (m.type() === 'error') anotar(m.text()) }],
    ['pageerror', (e) => anotar('JS: ' + e.message)],
    ['response', (r) => { if (r.status() >= 400) anotar(`HTTP ${r.status()} ${r.url()}`) }],
  ]
  for (const [ev, fn] of oyentes) page.on(ev, fn)
  try {
    return await armarPagina({ page, mapping, manifest, save, onStep, esperaSubform, consola })
  } catch (e) {
    if (consola.length) e.message += ` — La consola del navegador dice: ${consola.slice(-3).join(' | ')}`
    throw e
  } finally {
    for (const [ev, fn] of oyentes) page.off(ev, fn)
  }
}

async function armarPagina({ page, mapping, manifest, save, onStep, esperaSubform, consola = [] }) {
  const site = mapping.site.replace(/\/+$/, '')
  const url = new URL(mapping.nodeAdd, site + '/').href

  onStep(`Abriendo ${url}`)
  await page.goto(url, { waitUntil: 'domcontentloaded' })

  if (/\/user\/login/.test(page.url())) {
    throw new Error('Drupal pidio login. Corre primero: page-runner login')
  }

  onStep(`Titulo: ${manifest.page.title}`)
  await escribir(page.locator(mapping.title).first(), manifest.page.title)

  // El alias esta DESHABILITADO mientras Pathauto lo genere solo: hay que destildarlo
  // antes de poder escribirlo.
  if (manifest.page.path && mapping.path) {
    if (mapping.pathauto) {
      const auto = page.locator(mapping.pathauto).first()
      if (await auto.count()) await tildar(auto, false)
    }
    onStep(`Alias: ${manifest.page.path}`)
    await escribir(page.locator(mapping.path).first(), manifest.page.path)
  }

  // Despublicado SIEMPRE, salvo que el manifiesto pida lo contrario Y el mapping sepa
  // donde esta el check.
  if (mapping.published) {
    const wants = manifest.page.published === true
    const box = page.locator(mapping.published).first()
    if (await box.count()) await tildar(box, wants)
    if (wants) onStep('OJO: el manifiesto pide PUBLICADA')
  }

  const ctx = { mapping, page, onStep, esperaSubform, consola, escritos: [] }
  const root = { dsel: mapping.paragraphs.dsel, base: mapping.paragraphs.base, add: mapping.paragraphs.add }
  let n = 0
  for (const block of manifest.blocks) {
    n += 1
    await addBlock(ctx, block, `${n}`, root)
  }

  // Repaso final. Agregar un bloque hace que Drupal re-dibuje el formulario, asi que un
  // campo que quedo bien al escribirlo puede haberse vaciado despues. Mejor enterarse
  // aca que descubrir la pagina vacia en el CMS.
  const vacios = []
  for (const w of ctx.escritos) {
    if (!w || esVacio(w.valor)) continue
    if (esVacio(await leerCampo(page, w.f, w.selector))) vacios.push(w.ref)
  }
  if (vacios.length) {
    throw new Error(`Se llenaron los campos pero al final quedaron VACIOS: ${vacios.join(', ')}. `
      + 'Suele pasar cuando el formulario se vuelve a dibujar despues de escribir.')
  }
  onStep(`Campos escritos y verificados: ${ctx.escritos.filter(Boolean).length}`)

  if (!save) {
    onStep('Listo (sin guardar). Revisa el formulario y guarda vos.')
    return { saved: false, url: page.url() }
  }

  onStep('Guardando…')
  await page.locator(mapping.save).first().click()
  await page.waitForLoadState('domcontentloaded')
  const after = page.url()
  const nodeId = (/\/node\/(\d+)/.exec(after) || [])[1] || null
  return { saved: true, url: after, nodeId }
}

// Agrega UN paragraph y llena sus campos. `holder` es donde vive la lista: el campo de
// paragraphs del nodo, o un slot adentro del subform de un contenedor. Sus plantillas
// ya vienen resueltas salvo el `{delta}`, que se decide aca.
async function addBlock(ctx, block, num, holder) {
  const { mapping, page, onStep, esperaSubform, consola } = ctx
  const def = mapping.paragraphs.types[block.type]
  if (!def) throw new Error(`El mapping no conoce el paragraph "${block.type}"`)

  // El delta es la primera posicion LIBRE de esta lista. Se pregunta por el DOM en vez
  // de contar filas: una fila se direcciona por su data-drupal-selector, que es exacto.
  const delta = await freeDelta(page, holder.dsel)
  const dsel = resolveSelector(holder.dsel, { delta })
  const base = resolveSelector(holder.base, { delta })
  const vars = { base, delta, dsel, dselw: widgetDsel(dsel), npath: namePath(dsel) }

  onStep(`  ${num}. ${def.label || block.type}`)

  // El alta va por AJAX y se espera a que aparezca el subform de ESTE delta.
  //
  // Si el servidor contesta 502/503/504, no es que el mapping este mal: es el CMS que
  // tardo demasiado y el proxy corto. Una persona apretaria de nuevo, asi que el runner
  // tambien — pero SOLO ante un error del servidor, y solo despues de confirmar que la
  // fila no aparecio. Cualquier otra falla sigue frenando en seco, como corresponde.
  const fila = page.locator(rowSelector(dsel)).first()
  let puesto = false
  for (let intento = 1; intento <= REINTENTOS && !puesto; intento++) {
    const desde = consola.length
    if (intento > 1) onStep(`     El CMS no respondio. Reintento ${intento - 1} de ${REINTENTOS - 1}…`)
    await clickAdd(page, holder.add, def, block.type)
    puesto = await fila.waitFor({ state: 'attached', timeout: esperaSubform }).then(() => true).catch(() => false)
    // Si no fue el servidor, insistir no va a cambiar nada.
    if (!puesto && !culpaDelServidor(consola.slice(desde))) break
  }
  if (!puesto) {
    // El mensaje tiene que traer la EVIDENCIA: que filas hay realmente en esa lista y si
    // Drupal se quejo de algo. Sin eso, del otro lado solo queda adivinar — y quien lo
    // corre no tiene como mirar el DOM.
    const prefijo = String(holder.dsel).split('{delta}')[0]
    const hay = await page.evaluate((p) => [...document.querySelectorAll('[data-drupal-selector]')]
      .map((e) => e.getAttribute('data-drupal-selector'))
      .filter((d) => d && d.startsWith(p)).slice(0, 20), prefijo).catch(() => [])
    const quejas = await page.locator('.messages--error, .messages.error').allInnerTexts().catch(() => [])
    throw new Error(`No aparecio el subform de "${block.type}" despues de agregarlo `
      + `(esperaba ${rowSelector(dsel)}).`
      + (quejas.length ? ` Drupal dice: "${quejas.join(' | ').replace(/\s+/g, ' ').trim().slice(0, 300)}".` : '')
      + ` Con el prefijo "${prefijo}" hay: ${hay.length ? hay.join(', ') : 'NADA'}.`
      + (culpaDelServidor(consola) ? ' ESTO NO ES EL RUNNER: el CMS contesto con un error de '
        + 'servidor (5xx), o sea que tardo demasiado. Volve a probar en un rato.' : ''))
  }

  // Desplegables del formulario (Optional fields, Avanzado, Classy, Atributos): si el
  // campo vive adentro, hay que abrirlos antes de escribir. Los selectores ya traen el
  // delta, asi que apuntan a UNO solo; el que no exista en este tipo se saltea.
  for (const tpl of [...(mapping.paragraphs.open || []), ...(def.open || [])]) {
    const d = page.locator(resolveSelector(tpl, vars)).first()
    if (!(await d.count())) continue
    if (await d.evaluate((el) => el.tagName === 'DETAILS' && el.open)) continue
    await d.locator('> summary').first().click()
  }

  for (const [key, value] of Object.entries(block.fields || {})) {
    const f = def.fields?.[key]
    if (!f) throw new Error(`El mapping de "${block.type}" no tiene el campo "${key}"`)
    if (IMAGE_KINDS.has(f.kind)) { onStep(`     (imagen "${key}": se sube a mano)`); continue }
    ctx.escritos.push(await fillField(page, f, vars, value, `${block.type}.${key}`))
  }

  // Contenedores: sus hijos van adentro del slot que les toca, no en la lista del nodo.
  if (block.children?.length) {
    const slots = def.children?.slots
    if (!slots?.length) throw new Error(`"${block.type}" tiene hijos pero el mapping no declara "children.slots"`)
    let k = 0
    const enSlot = {}
    for (const child of block.children) {
      k += 1
      const i = child.slot || 0
      const slot = slots[i]
      if (!slot) throw new Error(`"${block.type}" no tiene el slot ${i} (tiene ${slots.length})`)
      // `max` = cuantos componentes entran en esa ranura. Una pestaña lleva UNO solo:
      // en el CMS el tab item tiene un componente, no una lista. Mejor frenar aca que
      // dejar la mitad de la pestaña afuera.
      enSlot[i] = (enSlot[i] || 0) + 1
      if (slot.max != null && enSlot[i] > slot.max) {
        throw new Error(`"${block.type}" acepta ${slot.max} componente(s) en "${slot.label || i}" `
          + `y el manifiesto pone ${enSlot[i]}`)
      }
      // Se resuelven las variables del PADRE y se deja `{delta}`, que es el del hijo.
      const padre = { base, dsel, dselw: vars.dselw, npath: vars.npath }
      const dselHijo = resolveSelector(slot.dsel, padre)
      await addBlock(ctx, child, `${num}.${k}`, {
        dsel: dselHijo,
        base: resolveSelector(slot.base, padre),
        // `enMedio` no se escribe en el mapping: sale de como Drupal nombra las cosas,
        // igual que {dselw} y {npath}. Un mapping puede declararlo si su sitio difiere.
        add: {
          enMedio: EN_MEDIO(fieldWrapper(dselHijo)),
          enMedioAbre: EN_MEDIO_GENERICO(fieldWrapper(dselHijo)),
          ...resolveIn(slot.add, padre),
        },
      })
    }
  }
}

function resolveIn(add, vars) {
  const out = { ...add }
  for (const k of ['select', 'button', 'open', 'enMedio']) if (out[k]) out[k] = resolveSelector(out[k], vars)
  return out
}

// Los botones de "agregar en el medio" de paragraphs_features, acotados a ESA lista.
// Hay de dos clases y hacen cosas distintas:
//   - el de un bundle puntual (`data-paragraph-bundle`) agrega ESE tipo de una;
//   - el generico ("+ Add"), que aparece cuando la lista acepta muchos tipos, ABRE el
//     dialogo de paragraphs_ee y recien ahi esta el boton del tipo.
const EN_MEDIO = (wrapper) => `[data-drupal-selector="${wrapper}"] `
  + 'button.paragraphs-features__add-in-between__button[data-paragraph-bundle="{bundle}"]'
const EN_MEDIO_GENERICO = (wrapper) => `[data-drupal-selector="${wrapper}"] `
  + 'button.paragraphs-features__add-in-between__button:not([data-paragraph-bundle])'

const seVe = async (loc) => (await loc.count()) > 0 && await loc.first().isVisible()

// El PRIMERO QUE SE VEA, no el primero del DOM. Un mismo `name` puede estar repetido —
// el formulario trae el dialogo de tipos escondido y jQuery lo monta aparte —, asi que
// `.first()` puede quedarse esperando para siempre a un elemento que nunca se muestra.
async function esperarVisible(page, sel, ms) {
  const hasta = Date.now() + ms
  for (;;) {
    const loc = page.locator(sel)
    const n = await loc.count()
    for (let i = 0; i < n; i++) if (await loc.nth(i).isVisible().catch(() => false)) return loc.nth(i)
    if (Date.now() > hasta) return null
    await page.waitForTimeout(250)
  }
}

// La primera posicion libre de la lista. Corta apenas encuentra un hueco, asi que en
// una pagina normal son un par de consultas.
async function freeDelta(page, dselTpl) {
  for (let d = 0; d < MAX_DELTA; d++) {
    if (!(await page.locator(rowSelector(resolveSelector(dselTpl, { delta: d }))).count())) return d
  }
  throw new Error(`Mas de ${MAX_DELTA} paragraphs en la misma lista: algo esta mal.`)
}

// Dos formas de agregar un paragraph, segun como este configurado el widget:
//   - "select":  un desplegable de tipos + un boton
//   - "buttons": un boton por tipo; si estan detras de un modal, `open` lo abre primero
// Drupal no termina de procesar una peticion AJAX cuando el DOM ya cambio: hay un rato
// en el que la anterior sigue viva. Si se le encima otra, el servidor contesta con
// "Oops, something went wrong" y NO pasa nada — que es exactamente lo que se ve cuando
// se elige el tipo en el desplegable (que tambien tiene AJAX) y se aprieta Agregar en el
// mismo instante. Asi que se espera a que no quede ninguna en vuelo.
async function esperarAjax(page, max = 20000) {
  await page.waitForTimeout(120)   // que la peticion alcance a arrancar
  await page.waitForFunction(() => {
    const hayThrobber = !!document.querySelector('.ajax-progress, .ajax-progress-throbber, .ajax-progress-fullscreen')
    const D = window.Drupal
    const enVuelo = D && D.ajax && Array.isArray(D.ajax.instances)
      && D.ajax.instances.some((i) => i && i.ajaxing)
    return !hayThrobber && !enVuelo
  }, null, { timeout: max }).catch(() => { /* si no se puede saber, se sigue igual */ })
}

async function clickAdd(page, add, def, type) {
  if (add.mode === 'select') {
    const sel = page.locator(add.select).first()
    if (!(await sel.count())) throw new Error(`No encontre el desplegable de tipos (${add.select})`)
    if (def.value) await sel.selectOption(def.value)
    else await sel.selectOption({ label: def.label })
    // El desplegable tambien dispara AJAX: apretar Agregar sin esperar rompe las dos.
    await esperarAjax(page)
    await page.locator(add.button).first().click()
    await esperarAjax(page)
    return
  }
  if (add.mode === 'buttons') {
    const bundle = def.value || type
    // Hay hasta TRES formas de agregar en una ranura, y cual esta a la vista depende de
    // como quedo la lista. Se prueban en orden y se usa la que se VE:
    //
    // 1. "Agregar en el medio" (paragraphs_features). Cuando esta activado para ese
    //    campo, Drupal ESCONDE el area de agregar del final (le pone display:none) y
    //    pone un boton por bundle adentro de la tabla — el que toca una persona. Se
    //    clickea el ULTIMO, que es el que agrega al final y no al principio.
    if (add.enMedio) {
      const b = page.locator(resolveSelector(add.enMedio, { bundle })).last()
      if (await seVe(b)) { await b.click(); await esperarAjax(page); return }
    }
    // 2. Algo que ABRA la lista de tipos, porque el boton del bundle todavia no existe:
    //    el "+ Add" generico de paragraphs_features (cuando la lista acepta muchos tipos)
    //    o el modal de paragraphs_ee. Se usa el primero que se vea, nunca los dos.
    for (const sel of [add.enMedioAbre, add.open].filter(Boolean)) {
      const b = page.locator(sel).last()
      if (await seVe(b)) { await b.click(); await esperarAjax(page); break }
    }
    // 3. El boton suelto del bundle: una lista de un solo tipo, o el que abrio el modal.
    const selBoton = resolveSelector(add.button, { bundle })
    const btn = await esperarVisible(page, selBoton, 20000)
    if (!btn) {
      // La etiqueta sola no alcanza para saber que ES cada boton: va el markup, que dice
      // la clase y si trae data-paragraph-bundle. Es la diferencia entre "agrega este
      // tipo" y "abre el dialogo".
      const opciones = await page.evaluate(() => [...document.querySelectorAll(
        'input[name="button_add_modal"], button.paragraphs-features__add-in-between__button, .field-add-more-submit')]
        .filter((e) => e.offsetParent !== null)
        .map((e) => e.outerHTML.replace(/\s+/g, ' ').slice(0, 220)).slice(0, 6)).catch(() => [])
      // Y sobre el boton que se esperaba: si existe pero no se ve, lo que importa es
      // QUIEN lo tapa. Eso es lo que separa "el selector esta mal" de "esta escondido".
      const nombre = /name="([^"]+)"/.exec(selBoton)?.[1]
      const suerte = nombre ? await page.evaluate((n) => [...document.querySelectorAll(`[name="${n}"]`)]
        .map((el) => {
          let tapa = null
          for (let p = el.parentElement; p && !tapa; p = p.parentElement) {
            const cs = getComputedStyle(p)
            if (cs.display === 'none' || cs.visibility === 'hidden') tapa = (p.className || p.tagName).toString().slice(0, 70)
          }
          return `${el.offsetParent !== null ? 'SE VE' : 'escondido'}${tapa ? ' por ' + tapa : ''}`
        }), nombre).catch(() => []) : []

      throw new Error(`No aparecio el boton para agregar "${type}" en este contenedor. `
        + `Elementos con name="${nombre}": ${suerte.length ? suerte.join(' | ') : 'NINGUNO'}. `
        + `Los botones de alta que SI se ven ahora: ${opciones.length ? opciones.join('  ///  ') : 'ninguno'}.`)
    }
    await btn.click()
    await esperarAjax(page)
    return
  }
  throw new Error(`Modo de alta desconocido: "${add.mode}"`)
}

// Un campo puede EXISTIR y no verse: en el formulario del nodo, el alias y la
// publicacion viven en paneles plegados de la barra lateral, y en un paragraph hay
// grupos que arrancan cerrados. Antes de tocar cualquier cosa se abren todos los
// <details> que la tapan — que es lo que haria una persona. Sin esto, Playwright espera
// 30 segundos un elemento que esta ahi pero escondido, y la corrida se corta.
async function revelar(loc) {
  await loc.evaluate((node) => {
    for (let p = node.parentElement; p; p = p.parentElement) {
      if (p.tagName === 'DETAILS' && !p.open) p.open = true
    }
  }).catch(() => { /* si no se puede evaluar, se intenta igual: quiza ya se ve */ })
}

async function escribir(loc, valor) {
  await revelar(loc)
  await loc.fill(String(valor))
}

async function tildar(loc, valor) {
  await revelar(loc)
  await loc.setChecked(!!valor)
}

async function fillField(page, f, vars, value, ref) {
  const selector = resolveSelector(f.sel, vars)
  const total = await page.locator(selector).count()
  if (!total) throw new Error(`No encontre el campo ${ref} (${selector})`)

  // Un mismo `name` puede estar repetido en la pagina (el formulario deja plantillas
  // escondidas), asi que se busca el que SE VE — despues de abrir los paneles que lo
  // tapen. La excepcion es un cuerpo con CKEditor: ahi el textarea esta oculto a
  // proposito y lo que se ve es el editor, asi que se toma el primero.
  let el = page.locator(selector).first()
  if (f.kind !== 'richtext') {
    for (let i = 0; i < total; i++) {
      const cand = page.locator(selector).nth(i)
      await revelar(cand)
      if (await cand.isVisible().catch(() => false)) { el = cand; break }
    }
  } else {
    await revelar(el)
  }

  if (f.kind === 'select') {
    // Se intenta por VALOR de maquina, que es lo que guarda nuestro catalogo; si esa
    // opcion no existe se prueba por etiqueta antes de darse por vencido.
    try { await el.selectOption(String(value)) }
    catch { await el.selectOption({ label: String(value) }) }
  } else if (f.kind === 'checkbox') {
    await el.setChecked(!!value)
  } else if (f.kind === 'richtext') {
    // El formato de texto va PRIMERO: el CMS arranca en uno que no admite HTML, y
    // cambiarlo con contenido ya cargado dispara el aviso de Drupal de que se pierde.
    if (f.format) {
      const fmt = page.locator(resolveSelector(f.format.sel, vars)).first()
      if (await fmt.count()) {
        try { await fmt.selectOption(f.format.value) } catch { /* ese formato no esta: se deja el que haya */ }
      }
    }
    // Con CKEditor el textarea queda oculto y lo que se escribe es un contenteditable.
    // Si no hay editor montado (campo de texto plano), se llena el textarea y listo.
    const editable = editorDe(page, selector)
    if (await editable.count()) {
      await editable.click()
      await editable.evaluate((node) => { node.innerHTML = '' })
      await page.keyboard.insertText(String(value))
    } else {
      await el.fill(String(value))
    }
  } else {
    await el.fill(String(value))
  }

  // VERIFICAR. Un campo que se llena y queda vacio es peor que un error: la pagina sale
  // armada pero sin contenido y nadie se entera hasta que la mira. Si no quedo, se frena.
  const puesto = await loQueQuedo(page, f, selector, el)
  if (esVacio(puesto) && !esVacio(value)) {
    throw new Error(`Escribi ${ref} pero el campo quedo vacio (${selector}). `
      + `Se esperaba "${String(value).slice(0, 60)}" y hay ${JSON.stringify(puesto)}. `
      + `Elementos con ese selector: ${total}.`)
  }
  return { selector, f, ref, valor: value }
}

// Lee un campo eligiendo el mismo elemento que se lleno: el que se ve, salvo el cuerpo
// con CKEditor, que por diseño esta oculto.
async function leerCampo(page, f, selector) {
  const n = await page.locator(selector).count()
  if (!n) return null
  let el = page.locator(selector).first()
  if (f.kind !== 'richtext') {
    for (let i = 0; i < n; i++) {
      const c = page.locator(selector).nth(i)
      if (await c.isVisible().catch(() => false)) { el = c; break }
    }
  }
  return loQueQuedo(page, f, selector, el)
}

// Que hay AHORA en el campo, en la forma que corresponda a su tipo.
async function loQueQuedo(page, f, selector, el) {
  try {
    if (f.kind === 'checkbox') return await el.isChecked()
    if (f.kind === 'richtext') {
      const editable = editorDe(page, selector)
      if (await editable.count()) return (await editable.first().innerText()).trim()
    }
    return await el.inputValue()
  } catch { return null }
}

// El contenteditable de CKEditor que corresponde a ese textarea, si lo hay.
const editorDe = (page, selector) => page.locator(selector)
  .locator('xpath=ancestor::*[contains(@class,"js-form-item") or contains(@class,"form-item")][1]')
  .locator('.ck-editor__editable[contenteditable="true"]')

// "Vacio" para el CMS incluye el valor con el que arrancan los selects de Drupal.
const esVacio = (v) => v === null || v === undefined || v === '' || v === '_none'


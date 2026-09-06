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
import { resolveSelector, rowSelector, widgetDsel, namePath } from './mapping.js'

const IMAGE_KINDS = new Set(['image', 'media', 'file'])
const MAX_DELTA = 100

export async function buildPage({ page, mapping, manifest, save = false, onStep = () => {}, esperaSubform = 30000 }) {
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

  const ctx = { mapping, page, onStep, esperaSubform }
  const root = { dsel: mapping.paragraphs.dsel, base: mapping.paragraphs.base, add: mapping.paragraphs.add }
  let n = 0
  for (const block of manifest.blocks) {
    n += 1
    await addBlock(ctx, block, `${n}`, root)
  }

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
  const { mapping, page, onStep, esperaSubform } = ctx
  const def = mapping.paragraphs.types[block.type]
  if (!def) throw new Error(`El mapping no conoce el paragraph "${block.type}"`)

  // El delta es la primera posicion LIBRE de esta lista. Se pregunta por el DOM en vez
  // de contar filas: una fila se direcciona por su data-drupal-selector, que es exacto.
  const delta = await freeDelta(page, holder.dsel)
  const dsel = resolveSelector(holder.dsel, { delta })
  const base = resolveSelector(holder.base, { delta })
  const vars = { base, delta, dsel, dselw: widgetDsel(dsel), npath: namePath(dsel) }

  onStep(`  ${num}. ${def.label || block.type}`)
  await clickAdd(page, holder.add, def, block.type)

  // El alta va por AJAX: se espera a que aparezca el subform de ESTE delta.
  await page.locator(rowSelector(dsel)).first().waitFor({ state: 'attached', timeout: esperaSubform })
    .catch(async () => {
      // Si no aparecio, el mensaje tiene que traer la EVIDENCIA: que filas hay realmente
      // en esa lista y si Drupal se quejo de algo. Sin eso, del otro lado solo queda
      // adivinar — y quien lo corre no tiene como mirar el DOM.
      const prefijo = String(holder.dsel).split('{delta}')[0]
      const hay = await page.evaluate((p) => [...document.querySelectorAll('[data-drupal-selector]')]
        .map((e) => e.getAttribute('data-drupal-selector'))
        .filter((d) => d && d.startsWith(p)).slice(0, 20), prefijo).catch(() => [])
      const quejas = await page.locator('.messages--error, .messages.error').allInnerTexts().catch(() => [])
      throw new Error(`No aparecio el subform de "${block.type}" despues de agregarlo `
        + `(esperaba ${rowSelector(dsel)}).`
        + (quejas.length ? ` Drupal dice: "${quejas.join(' | ').replace(/\s+/g, ' ').trim().slice(0, 300)}".` : '')
        + ` Con el prefijo "${prefijo}" hay: ${hay.length ? hay.join(', ') : 'NADA'}.`)
    })

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
    await fillField(page, f, vars, value, `${block.type}.${key}`)
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
      await addBlock(ctx, child, `${num}.${k}`, {
        dsel: resolveSelector(slot.dsel, { base, dsel, dselw: vars.dselw, npath: vars.npath }),
        base: resolveSelector(slot.base, { base, dsel, dselw: vars.dselw, npath: vars.npath }),
        add: resolveIn(slot.add, { base, dsel, dselw: vars.dselw, npath: vars.npath }),
      })
    }
  }
}

function resolveIn(add, vars) {
  const out = { ...add }
  for (const k of ['select', 'button', 'open']) if (out[k]) out[k] = resolveSelector(out[k], vars)
  return out
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
async function clickAdd(page, add, def, type) {
  if (add.mode === 'select') {
    const sel = page.locator(add.select).first()
    if (!(await sel.count())) throw new Error(`No encontre el desplegable de tipos (${add.select})`)
    if (def.value) await sel.selectOption(def.value)
    else await sel.selectOption({ label: def.label })
    await page.locator(add.button).first().click()
    return
  }
  if (add.mode === 'buttons') {
    if (add.open) {
      const opener = page.locator(add.open).first()
      if (await opener.count()) await opener.click()
    }
    const btn = page.locator(resolveSelector(add.button, { bundle: def.value || type })).first()
    await btn.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {
      throw new Error(`No aparecio el boton para agregar "${type}" en este contenedor.`)
    })
    await btn.click()
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
  const el = page.locator(selector).first()
  if (!(await el.count())) throw new Error(`No encontre el campo ${ref} (${selector})`)
  await revelar(el)

  if (f.kind === 'select') {
    // Se intenta por VALOR de maquina, que es lo que guarda nuestro catalogo; si esa
    // opcion no existe se prueba por etiqueta antes de darse por vencido.
    try { await el.selectOption(String(value)) }
    catch { await el.selectOption({ label: String(value) }) }
    return
  }
  if (f.kind === 'checkbox') { await el.setChecked(!!value); return }

  if (f.kind === 'richtext') {
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
    const editable = page.locator(selector).locator('xpath=ancestor::*[contains(@class,"js-form-item") or contains(@class,"form-item")][1]')
      .locator('.ck-editor__editable[contenteditable="true"]').first()
    if (await editable.count()) {
      await editable.click()
      await editable.evaluate((node) => { node.innerHTML = '' })
      await page.keyboard.insertText(String(value))
      return
    }
    await el.fill(String(value))
    return
  }

  await el.fill(String(value))
}

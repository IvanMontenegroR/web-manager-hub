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
import { resolveSelector, baseFor } from './mapping.js'

const IMAGE_KINDS = new Set(['image', 'media', 'file'])

export async function buildPage({ page, mapping, manifest, save = false, onStep = () => {} }) {
  const site = mapping.site.replace(/\/+$/, '')
  const url = new URL(mapping.nodeAdd, site + '/').href

  onStep(`Abriendo ${url}`)
  await page.goto(url, { waitUntil: 'domcontentloaded' })

  if (/\/user\/login/.test(page.url())) {
    throw new Error('Drupal pidio login. Corre primero: page-runner login')
  }

  onStep(`Titulo: ${manifest.page.title}`)
  await page.locator(mapping.title).first().fill(manifest.page.title)

  if (manifest.page.path && mapping.path) {
    await page.locator(mapping.path).first().fill(manifest.page.path)
  }

  // Despublicado SIEMPRE, salvo que el manifiesto pida lo contrario Y el mapping sepa
  // donde esta el check.
  if (mapping.published) {
    const wants = manifest.page.published === true
    const box = page.locator(mapping.published).first()
    if (await box.count()) await box.setChecked(wants)
    if (wants) onStep('OJO: el manifiesto pide PUBLICADA')
  }

  const ctx = { mapping, page, onStep }
  let n = 0
  for (const block of manifest.blocks) {
    n += 1
    await addBlock(ctx, block, `${n}`, {
      row: mapping.paragraphs.row,
      base: mapping.paragraphs.base,
      add: mapping.paragraphs.add,
      scope: null,
    })
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

// Agrega UN paragraph y llena sus campos. `holder` describe donde vive la lista:
// en el nodo (el campo de paragraphs del nodo) o adentro del subform de un contenedor.
async function addBlock(ctx, block, num, holder) {
  const { mapping, page, onStep } = ctx
  const def = mapping.paragraphs.types[block.type]
  if (!def) throw new Error(`El mapping no conoce el paragraph "${block.type}"`)

  const rowSel = holder.scope ? `${holder.scope} ${holder.row}` : holder.row
  const before = await page.locator(rowSel).count()

  onStep(`  ${num}. ${def.label || block.type}`)
  await clickAdd(page, holder.add, def, holder.scope)

  // El alta va por AJAX: se espera a que aparezca la fila nueva.
  await page.waitForFunction(
    ([sel, prev]) => document.querySelectorAll(sel).length > prev,
    [rowSel, before],
    { timeout: 20000 },
  ).catch(() => {
    throw new Error(`No aparecio el subform de "${block.type}" despues de agregarlo. `
      + 'Revisa el selector "row" del mapping.')
  })

  const delta = before // el nuevo queda al final
  const base = resolveSelector(holder.base, { base: holder.scope ? baseFor(mapping, delta) : '', delta })

  // Desplegables del formulario (Optional fields, Avanzado, Classy): si el campo vive
  // adentro, hay que abrirlos antes de escribir.
  //
  // Se buscan DENTRO de la fila de ESTE paragraph. Buscarlos en toda la pagina abriria
  // siempre el del primer bloque: todos los subforms tienen un "Optional fields".
  const row = page.locator(rowSel).nth(delta)
  for (const sum of def.open || []) {
    const s = row.locator(resolveSelector(sum, { base, delta })).first()
    if (await s.count()) {
      const open = await s.evaluate((el) => !!el.closest('details')?.open)
      if (!open) await s.click()
    }
  }

  for (const [key, value] of Object.entries(block.fields || {})) {
    const f = def.fields?.[key]
    if (!f) throw new Error(`El mapping de "${block.type}" no tiene el campo "${key}"`)
    if (IMAGE_KINDS.has(f.kind)) { onStep(`     (imagen "${key}": se sube a mano)`); continue }
    await fillField(page, resolveSelector(f.sel, { base, delta }), f.kind || 'text', value, `${block.type}.${key}`)
  }

  // Contenedores: sus hijos van adentro de SU subform, no en la lista del nodo.
  if (block.children?.length) {
    if (!def.children) throw new Error(`"${block.type}" tiene hijos pero el mapping no declara "children"`)
    // OJO con `{delta}`: en los selectores del hijo el delta es el DEL HIJO, no el del
    // contenedor. Se resuelve solo `{base}` y se deja `{delta}` para que lo complete
    // cada hijo cuando sepa en que posicion cayo.
    const vars = { base, delta: '{delta}' }
    let k = 0
    for (const child of block.children) {
      k += 1
      await addBlock(ctx, child, `${num}.${k}`, {
        row: resolveSelector(def.children.row, vars),
        base: resolveSelector(def.children.base, vars),
        add: resolveSelectors(def.children.add, vars),
        scope: null,
      })
    }
  }
}

function resolveSelectors(add, vars) {
  const out = { ...add }
  for (const k of ['select', 'button']) if (out[k]) out[k] = resolveSelector(out[k], vars)
  return out
}

// Dos formas de agregar un paragraph, segun como este configurado el widget:
//   - "button": un boton por tipo ("Add Content: Text")
//   - "select": un desplegable de tipos + un boton de agregar
async function clickAdd(page, add, def, scope) {
  if (add.mode === 'select') {
    const sel = page.locator(scope ? `${scope} ${add.select}` : add.select).first()
    if (!(await sel.count())) throw new Error(`No encontre el desplegable de tipos (${add.select})`)
    if (def.value) await sel.selectOption(def.value)
    else await sel.selectOption({ label: def.label })
    await page.locator(scope ? `${scope} ${add.button}` : add.button).first().click()
    return
  }
  // mode: button
  const label = (add.labelTemplate || 'Add {label}').replace('{label}', def.label || '')
  const btn = page.locator(`input[type=submit][value="${label}"], button:has-text("${label}")`).first()
  if (!(await btn.count())) throw new Error(`No encontre el boton "${label}"`)
  await btn.click()
}

async function fillField(page, selector, kind, value, ref) {
  const el = page.locator(selector).first()
  if (!(await el.count())) throw new Error(`No encontre el campo ${ref} (${selector})`)

  if (kind === 'select') {
    // Se intenta por VALOR de maquina, que es lo que guarda nuestro catalogo; si esa
    // opcion no existe se prueba por etiqueta antes de darse por vencido.
    try { await el.selectOption(String(value)) }
    catch { await el.selectOption({ label: String(value) }) }
    return
  }
  if (kind === 'checkbox') { await el.setChecked(!!value); return }

  if (kind === 'richtext') {
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

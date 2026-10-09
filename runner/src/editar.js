// EDITAR una pagina que YA existe en el CMS: cambia campos puntuales de sus bloques, con el
// mismo vocabulario que los manifiestos (`field_c_text`, `classy.text_align`,
// `field_block.productos`...), asi lo que se aprende armando sirve para corregir.
//
// Por que existe ademas de `tools/aplicar.mjs`: aplicar manda el formulario por HTTP con los
// nombres exactos de Drupal, y para eso abre la pagina ENTERA ("Editar todo"); en una pagina
// larga ese AJAX da 502. Tampoco sabe agregar filas (un producto mas en un carrusel) ni pasar
// por CKEditor. Esto maneja el formulario como una persona: abre SOLO las filas que toca,
// escribe con las mismas funciones que usa el armado y verifica antes de guardar.
//
// Un cambio dice DONDE y QUE:
//   { "bloque": 3, "campo": "field_c_text", "valor": "..." }             el 3er bloque de la pagina
//   { "bloque": { "tipo": "block", "n": 1 }, "campo": "field_block.productos", "valor": [...] }
//   { "bloque": { "titulo": "Ingredientes" }, "item": 2, "campo": "field_c_text", "valor": "..." }
//   { "campo": "raw:title[0][value]", "valor": "..." }                  un campo del NODO por su name
// `item` = la card / el hijo N del bloque (1 = el primero). `antes` (opcional) = lo que tiene
// que decir hoy: si no coincide, la pagina se saltea entera y no se toca nada (nadie pisa el
// trabajo de otro). `raw:` sirve para cualquier tipo de contenido (productos, articulos) sin
// mapping: es el name exacto del campo en el formulario.
//
// Reglas, las mismas que el armado: ensayo por defecto; frena ante lo que no entiende; deja un
// mensaje en el historial de revisiones; despues de guardar repasa el Classy que toco.
import { resolveSelector, rowSelector, widgetDsel, namePath } from './mapping.js'
import { esperarAjax } from './esperas.js'
import { prepararPagina } from './richtext.js'
import { fillField, llenarLista, repasarClassy, revisarEscritos, leerCampo } from './build.js'

const enGuiones = (b) => String(b).replace(/_/g, '-')
const norm = (v) => (typeof v === 'string' ? v.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim() : JSON.stringify(v))

// Las filas sueltas de la pagina: delta, bundle (de la clase paragraph-type--x) y el resumen
// que Drupal muestra con la fila plegada (sirve para encontrar un bloque por su titulo).
async function filasDeLaPagina(page, dselTpl) {
  const prefijo = dselTpl.split('{delta}')[0]
  return page.evaluate((prefijo) => {
    const out = []
    for (let d = 0; d < 200; d++) {
      const el = document.querySelector(`[data-drupal-selector="${prefijo}${d}"]`)
      if (!el) break
      const clase = (n) => (n && typeof n.className === 'string' ? n.className : '')
      let bundle = null
      for (const n of [el.closest('tr'), el, el.parentElement, el.querySelector('[class*="paragraph-type--"]')]) {
        const m = /paragraph-type--([a-z0-9-]+)/.exec(clase(n)); if (m) { bundle = m[1]; break }
      }
      const resumen = ((el.closest('tr') || el).innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300)
      out.push({ delta: d, bundle, resumen })
    }
    return out
  }, prefijo)
}

function tipoDelBundle(mapping, bundle) {
  for (const [k, def] of Object.entries(mapping.paragraphs.types)) {
    if (enGuiones(def.value || k) === bundle) return [k, def]
  }
  return [null, null]
}

function resolverBloque(filas, bloque, mapping) {
  if (typeof bloque === 'number') return filas[bloque - 1] || null
  if (bloque?.tipo) {
    const def = mapping.paragraphs.types[bloque.tipo]
    const b = enGuiones(def?.value || bloque.tipo)
    return filas.filter((f) => f.bundle === b)[(bloque.n || 1) - 1] || null
  }
  if (bloque?.titulo) return filas.find((f) => f.resumen.toLowerCase().includes(String(bloque.titulo).toLowerCase())) || null
  return null
}

async function abrirFila(page, vars, esperaSubform) {
  const subform = page.locator(`[data-drupal-selector="${vars.dsel}-subform"]`)
  if (await subform.count()) return
  const b = page.locator(`input[name="${vars.npath}_edit"], button[name="${vars.npath}_edit"]`).first()
  if (!(await b.count())) throw new Error(`no encontre el boton para abrir la fila ${vars.dsel}`)
  await b.click(); await esperarAjax(page)
  await subform.first().waitFor({ state: 'attached', timeout: esperaSubform })
}

// Un campo crudo (`raw:<name>`): el tipo sale del elemento mismo.
async function campoCrudo(page, name) {
  const sel = `[name="${name}"]`
  const el = page.locator(sel).first()
  if (!(await el.count())) return null
  const kind = await el.evaluate((e) => (e.tagName === 'SELECT' ? 'select' : e.tagName === 'TEXTAREA' ? 'richtext'
    : e.type === 'checkbox' ? 'checkbox' : 'text'))
  return { kind, sel }
}

export async function editarPagina({ page, mapping, pagina, mensaje, save = false, onStep = () => {}, esperaSubform = 45000 }) {
  const site = mapping.site.replace(/\/+$/, '')
  await prepararPagina(page)
  let nid = pagina.nid
  if (!nid) {
    await page.goto(site + pagina.ruta, { waitUntil: 'domcontentloaded', timeout: 180000 })
    nid = await page.evaluate(() => {
      const h = [...document.querySelectorAll('a[href*="/node/"]')].map((a) => a.getAttribute('href')).find((x) => /\/node\/\d+\/edit/.test(x)) || ''
      return (/\/node\/(\d+)/.exec(h) || [])[1] || null
    })
    if (!nid) throw new Error(`${pagina.ruta}: no encontre el nodo (¿existe? ¿hay sesion?)`)
  }
  await page.goto(`${site}/node/${nid}/edit`, { waitUntil: 'domcontentloaded', timeout: 180000 })
  if (/\/user\/login/.test(page.url())) throw new Error('Drupal pidio login')
  if (pagina.ruta && mapping.path) {
    const alias = await page.locator(mapping.path).first().inputValue().catch(() => null)
    if (alias && alias !== pagina.ruta) throw new Error(`el nodo ${nid} es ${alias}, no ${pagina.ruta}: no se toca`)
  }
  const raiz = mapping.paragraphs
  const filas = await filasDeLaPagina(page, raiz.dsel)
  onStep(`${pagina.ruta || 'node/' + nid}: ${filas.length} bloques en la pagina`)

  // Primero se RESUELVE todo (donde cae cada cambio) y se chequea `antes`; recien despues se
  // escribe. Asi un cambio que no se encuentra frena la pagina antes de tocar nada.
  const ctx = { mapping, page, onStep, esperaSubform, consola: [], escritos: [], classyAnidado: [] }
  const plan = []
  for (const [i, c] of pagina.cambios.entries()) {
    const ref = `cambio ${i + 1} (${c.campo})`
    if (String(c.campo).startsWith('raw:')) { plan.push({ c, ref, raw: c.campo.slice(4) }); continue }
    const fila = resolverBloque(filas, c.bloque, mapping)
    if (!fila) throw new Error(`${ref}: no encontre el bloque ${JSON.stringify(c.bloque)}`)
    const [tipo, def] = tipoDelBundle(mapping, fila.bundle)
    if (!def) throw new Error(`${ref}: el bloque ${fila.delta + 1} es "${fila.bundle}" y el mapping no lo conoce`)
    const dsel = resolveSelector(raiz.dsel, { delta: fila.delta })
    let vars = { delta: fila.delta, dsel, base: resolveSelector(raiz.base, { delta: fila.delta }), dselw: widgetDsel(dsel), npath: namePath(dsel) }
    let defCampo = def; let quien = `bloque ${fila.delta + 1} (${tipo})`
    if (c.item) {
      const slot = def.children?.slots?.[c.slot || 0]
      if (!slot) throw new Error(`${ref}: "${tipo}" no tiene hijos`)
      const padre = { base: vars.base, dsel: vars.dsel, dselw: vars.dselw, npath: vars.npath }
      const d = c.item - 1
      const dselHijo = resolveSelector(resolveSelector(slot.dsel, padre), { delta: d })
      plan.push({ c, ref, padreVars: vars, hijo: { dsel: dselHijo, base: resolveSelector(resolveSelector(slot.base, padre), { delta: d }), slotDef: slot } })
      continue
    }
    const f = defCampo.fields?.[c.campo]
    if (!f) throw new Error(`${ref}: "${tipo}" no tiene el campo "${c.campo}" en el mapping`)
    plan.push({ c, ref, vars, f, quien })
  }

  const cambios = []
  for (const p of plan) {
    let { f, vars } = p
    if (p.raw) {
      f = await campoCrudo(page, p.raw)
      if (!f) throw new Error(`${p.ref}: no existe el campo "${p.raw}" en el formulario`)
      vars = {}
    } else if (p.hijo) {
      await abrirFila(page, p.padreVars, esperaSubform)
      const vh = { dsel: p.hijo.dsel, base: p.hijo.base, dselw: widgetDsel(p.hijo.dsel), npath: namePath(p.hijo.dsel) }
      if (!(await page.locator(rowSelector(vh.dsel)).count())) throw new Error(`${p.ref}: el bloque no tiene el item ${p.c.item}`)
      await abrirFila(page, vh, esperaSubform)
      const bundle = await page.locator(rowSelector(vh.dsel)).first().evaluate((el) => {
        const n = [el.closest('tr'), el, el.querySelector('[class*="paragraph-type--"]')].find((x) => x && /paragraph-type--/.test(x.className || ''))
        return n ? /paragraph-type--([a-z0-9-]+)/.exec(n.className)[1] : null
      })
      const [tipoH, defH] = tipoDelBundle(mapping, bundle)
      f = defH?.fields?.[p.c.campo]
      if (!f) throw new Error(`${p.ref}: el item ${p.c.item} (${tipoH || bundle}) no tiene el campo "${p.c.campo}"`)
      vars = vh
    } else {
      await abrirFila(page, vars, esperaSubform)
    }
    const selector = resolveSelector(f.sel, { ...vars, i: 0 })
    const hoy = f.kind === 'lista' ? null : await leerCampo(page, f, selector)
    if (p.c.antes !== undefined && f.kind !== 'lista' && norm(hoy ?? '') !== norm(p.c.antes)) {
      throw new Error(`${p.ref}: hoy dice ${JSON.stringify(hoy)}, no ${JSON.stringify(p.c.antes)}. No se toca la pagina.`)
    }
    if (['media', 'mediaNuevo', 'mediaLibrary'].includes(f.kind)) {
      throw new Error(`${p.ref}: cambiar imagenes todavia no esta soportado (hay que quitar el medio actual primero)`)
    }
    const desde = ctx.escritos.length
    if (f.kind === 'lista') {
      const valores = Array.isArray(p.c.valor) ? p.c.valor : [p.c.valor]
      ctx.escritos.push(...await llenarLista(ctx, f, vars, valores, p.ref))
      // Las filas que sobran de antes se vacian: una fila vacia Drupal la descarta al guardar.
      for (let i = valores.length; i < 200; i++) {
        const s = resolveSelector(f.sel, { ...vars, i })
        if (!(await page.locator(s).count())) break
        await page.locator(s).first().evaluate((e) => { e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })) })
      }
    } else {
      ctx.escritos.push(await fillField(ctx, f, vars, p.c.valor, p.ref))
    }
    const problemas = await revisarEscritos(page, ctx.escritos.slice(desde))
    if (problemas.length) throw new Error(`${p.ref}: no quedo como se escribio: ${problemas.join('; ')}`)
    if (String(p.c.campo).startsWith('classy.') && f.kind === 'select') {
      ctx.classyAnidado.push({ sel: selector, value: p.c.valor, ref: p.ref, editar: `${vars.npath}_edit` })
    }
    cambios.push({ campo: p.c.campo, bloque: p.c.bloque, item: p.c.item, antes: hoy, despues: p.c.valor })
    onStep(`   ${p.ref}: ${JSON.stringify(hoy)?.slice(0, 70)} -> ${JSON.stringify(p.c.valor)?.slice(0, 70)}`)
  }

  if (!save) { onStep('   (ensayo: no se guardo)'); return { nid, guardada: false, cambios } }
  const log = page.locator('textarea[name="revision_log[0][value]"]')
  if (await log.count()) await log.evaluate((n, v) => { n.value = v }, mensaje || 'migration-mx: edicion en lote')
  const antes = page.url()
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 240000 }).catch(() => {}),
    page.locator(mapping.save).first().click(),
  ])
  if (page.url() === antes || /\/edit$/.test(new URL(page.url()).pathname)) {
    const msg = (await page.locator('[role="alert"], .messages--error').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ').slice(0, 400)
    throw new Error(`Drupal no guardo. ${msg}`)
  }
  onStep('   guardada')
  if (ctx.classyAnidado.length) await repasarClassy(ctx, nid)
  return { nid, guardada: true, cambios }
}

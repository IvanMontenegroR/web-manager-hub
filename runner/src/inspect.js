// RECONOCIMIENTO del formulario. Es el primer comando que hay que correr contra el
// Drupal de verdad: vuelca TODO lo que el formulario tiene (campos, selects con sus
// opciones, botones de agregar paragraph, desplegables) para poder escribir el mapping
// con datos y no de memoria.
//
// No escribe nada en el CMS: entra a la pagina de crear contenido y lee el DOM.
import { writeFileSync } from 'node:fs'

const DUMP = () => {
  // Etiqueta visible de un control, buscando el <label for> y, si no hay, el label
  // mas cercano del contenedor que Drupal arma para cada campo.
  const labelOf = (el) => {
    const byFor = el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
    if (byFor) return byFor.innerText.trim()
    const wrap = el.closest('.js-form-item, .form-item, .field--widget, fieldset')
    const lab = wrap && wrap.querySelector('label, legend')
    return lab ? lab.innerText.trim() : ''
  }
  // Cadena de <summary> que hay que abrir para llegar al control. Es lo que despues
  // va en `open` del mapping: si el campo vive adentro de "Optional fields", el runner
  // tiene que abrirlo antes de escribir.
  const detailsOf = (el) => {
    const out = []
    for (let d = el.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) {
      const s = d.querySelector(':scope > summary')
      if (s) out.unshift(s.innerText.trim())
    }
    return out
  }
  const visible = (el) => !!(el.offsetParent || el.getClientRects().length)

  const controls = [...document.querySelectorAll('input, select, textarea')]
    .filter((el) => el.type !== 'hidden')
    .map((el) => ({
      tag: el.tagName.toLowerCase(),
      type: el.type || null,
      name: el.name || null,
      id: el.id || null,
      selector: el.getAttribute('data-drupal-selector') || null,
      label: labelOf(el),
      details: detailsOf(el),
      visible: visible(el),
      options: el.tagName === 'SELECT'
        ? [...el.options].map((o) => ({ value: o.value, label: o.text.trim() }))
        : undefined,
    }))

  // Botones de agregar paragraph: Drupal usa o un boton por tipo, o un desplegable de
  // tipos + un boton "Add". Se vuelcan los dos para poder elegir el `mode` del mapping.
  const addButtons = [...document.querySelectorAll('input[type=submit], button')]
    .map((el) => ({ name: el.name || null, value: el.value || el.innerText.trim(), id: el.id || null, visible: visible(el) }))
    .filter((b) => /add|agregar|añadir/i.test(b.value || ''))

  const detailsTree = [...document.querySelectorAll('details')].map((d) => ({
    summary: d.querySelector(':scope > summary')?.innerText.trim() || '',
    open: d.open,
    selector: d.getAttribute('data-drupal-selector') || null,
  }))

  return { url: location.href, title: document.title, controls, addButtons, details: detailsTree }
}

export async function inspectForm(page, url, outFile) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  // El formulario de paragraphs monta pedazos por AJAX; se le da aire.
  await page.waitForTimeout(1500)
  const dump = await page.evaluate(DUMP)

  writeFileSync(outFile, JSON.stringify(dump, null, 2))

  // Borrador de mapping: agrupa los campos por el prefijo de su `name`, que es como
  // Drupal separa el nodo de cada subform de paragraph. Es un PUNTO DE PARTIDA para
  // editar a mano, no un mapping listo.
  const draft = {}
  for (const c of dump.controls) {
    if (!c.name) continue
    const m = /^([a-z0-9_]+)\[(\d+)\]\[subform\]\[([a-z0-9_]+)\]/i.exec(c.name)
    const key = m ? `${m[1]}[delta][subform]` : '(nodo)'
    draft[key] = draft[key] || []
    draft[key].push({ campo: m ? m[3] : c.name, label: c.label, tipo: c.tag === 'select' ? 'select' : c.type, dentroDe: c.details })
  }
  writeFileSync(outFile.replace(/\.json$/, '-draft.json'), JSON.stringify(draft, null, 2))

  return dump
}

export function summarize(dump) {
  const selects = dump.controls.filter((c) => c.tag === 'select')
  const lines = [
    `URL           ${dump.url}`,
    `Controles     ${dump.controls.length} (${dump.controls.filter((c) => c.visible).length} visibles)`,
    `Selects       ${selects.length}`,
    `Desplegables  ${dump.details.map((d) => d.summary).filter(Boolean).join(' | ') || '(ninguno)'}`,
    '',
    'Botones de agregar:',
    ...(dump.addButtons.length
      ? dump.addButtons.map((b) => `  - "${b.value}"  name=${b.name || '-'}`)
      : ['  (ninguno: puede que el desplegable de tipos aparezca recien al abrir la seccion)']),
  ]
  return lines.join('\n')
}

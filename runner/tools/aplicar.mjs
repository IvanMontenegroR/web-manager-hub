#!/usr/bin/env node
// Aplica un PLAN de cambios a paginas que ya existen en el CMS: cambia campos puntuales,
// por su nombre exacto del formulario, y nada mas.
//
//   npm run aplicar -- cambios/adopta-ctas.json           ENSAYO: no guarda nada
//   npm run aplicar -- cambios/adopta-ctas.json --save    de verdad
//
// El plan (lo arma quien planea, a partir de lo que devolvio `leer`):
//
//   {
//     "sitio": "content-mx",
//     "mensaje": "Batch: CTAs de Adopta al formulario nuevo",
//     "paginas": [
//       { "ruta": "/adopta/tenencia-responsable", "nid": 1160, "cambios": [
//         { "campo": "field_ln_n_components[8][subform][field_c_link][0][uri]",
//           "antes": "#", "despues": "https://..." }
//       ] }
//     ]
//   }
//
// Las reglas, que son las que hacen que se pueda correr sin mirar cada pagina:
//   - Solo escribe en un sitio marcado `escribe` (content). Leer se puede en cualquiera.
//   - ANTES de cambiar, el valor actual tiene que ser `antes`. Si alguien lo toco desde
//     que se leyo, la pagina entera se saltea y se avisa: no se pisa trabajo de nadie.
//   - Un campo que no existe en el formulario frena esa pagina (no se crea nada).
//   - Toca SOLO los campos del plan: todo lo demas viaja tal cual estaba, incluido el
//     estado de moderacion (una pagina publicada sigue publicada).
//   - Deja un mensaje de revision (`mensaje`), asi el historial de la pagina dice que
//     cambio y por que, y se puede volver atras desde Revisiones.
//   - DESPUES de guardar vuelve a leer la pagina entera y la compara con la de antes:
//     tiene que haber cambiado exactamente lo del plan. Cualquier otra diferencia se
//     informa como ERROR.
import fs from 'node:fs'
import path from 'node:path'
import { SITIOS, Sesion, ErrorDrupal, formDelNodo, camposDelForm, decode } from './drupal-http.js'

// Lo que cambia solo en cada pedido o al guardar, y no cuenta como diferencia.
const VOLATIL = /^(form_build_id|form_token|changed|revision_log\[|revision$|revision_information|_triggering|_drupal_ajax)|\[_weight\]$|\[changed\]/

export function validarPlan(plan) {
  const err = []
  if (!plan || typeof plan !== 'object') return ['El plan no es un objeto JSON.']
  if (!plan.sitio) err.push('Falta "sitio".')
  if (!plan.mensaje) err.push('Falta "mensaje" (va al historial de revisiones de cada pagina).')
  if (!Array.isArray(plan.paginas) || !plan.paginas.length) err.push('Falta "paginas".')
  for (const [i, p] of (plan.paginas || []).entries()) {
    if (!p.ruta && !p.nid) err.push(`paginas[${i}]: falta "ruta" o "nid".`)
    if (!Array.isArray(p.cambios) || !p.cambios.length) err.push(`paginas[${i}]: sin "cambios".`)
    const vistos = new Set()
    for (const [j, c] of (p.cambios || []).entries()) {
      if (!c.campo || !('antes' in c) || !('despues' in c)) err.push(`paginas[${i}].cambios[${j}]: hace falta "campo", "antes" y "despues".`)
      if (vistos.has(c.campo)) err.push(`paginas[${i}]: el campo ${c.campo} aparece dos veces.`)
      vistos.add(c.campo)
      if (/^(form_|op$|_)/.test(c.campo || '')) err.push(`paginas[${i}].cambios[${j}]: ${c.campo} no es un campo de contenido.`)
    }
  }
  return err
}

/** El sitio del plan, y el candado: solo se escribe donde el sitio lo permite. */
export function sitioDelPlan(plan, guardar, sitios = SITIOS) {
  const sitio = sitios[plan.sitio]
  if (!sitio) throw new ErrorDrupal(`Sitio desconocido: ${plan.sitio}.`)
  if (guardar && !sitio.escribe) throw new ErrorDrupal(`${plan.sitio} es de SOLO LECTURA: aca no se escribe.`)
  return sitio
}

const norm = v => String(v ?? '').replace(/\r\n/g, '\n')

/** Que haria el plan sobre estos pares del formulario. No toca nada. */
export function prepararCambios(pares, cambios) {
  const problemas = []
  const nuevos = pares.map(p => [...p])
  for (const c of cambios) {
    const idx = nuevos.map((p, i) => (p[0] === c.campo ? i : -1)).filter(i => i >= 0)
    if (idx.length > 1) { problemas.push(`${c.campo}: aparece ${idx.length} veces en el formulario (campo multiple), no se cambia por nombre.`); continue }
    const actual = idx.length ? nuevos[idx[0]][1] : null
    // Un campo vacio puede no viajar (checkbox destildado, select sin valor): vale como "".
    if (actual === null && norm(c.antes) !== '') { problemas.push(`${c.campo}: no existe en el formulario.`); continue }
    if (norm(actual ?? '') !== norm(c.antes)) {
      problemas.push(`${c.campo}: el valor actual no es el del plan.\n      plan:   ${JSON.stringify(c.antes)}\n      actual: ${JSON.stringify(actual)}`)
      continue
    }
    // `despues: null` = el campo NO viaja. Es como se destilda un checkbox en Drupal (un
    // checkbox con valor "" cuenta como tildado): por ejemplo, despublicar con status[value].
    if (c.despues === null) { if (idx.length) nuevos[idx[0]] = null; continue }
    if (idx.length) nuevos[idx[0]][1] = c.despues
    else nuevos.push([c.campo, c.despues])
  }
  return { nuevos: nuevos.filter(Boolean), problemas }
}

/** Diferencias entre dos lecturas del formulario, ignorando lo volatil. */
export function diferencias(antes, despues) {
  const mapa = pares => {
    const m = new Map()
    for (const [k, v] of pares) if (!VOLATIL.test(k)) m.set(k, m.has(k) ? [].concat(m.get(k), v) : v)
    return m
  }
  const a = mapa(antes), d = mapa(despues)
  const out = []
  for (const k of new Set([...a.keys(), ...d.keys()])) {
    if (JSON.stringify(a.get(k) ?? null) !== JSON.stringify(d.get(k) ?? null)) out.push({ campo: k, antes: a.get(k) ?? null, despues: d.get(k) ?? null })
  }
  return out
}

function botonGuardar(form) {
  const m = form.match(/<input\b[^>]*data-drupal-selector="edit-submit"[^>]*>/) || form.match(/<button\b[^>]*data-drupal-selector="edit-submit"[^>]*>/)
  if (!m) return null
  const name = m[0].match(/\bname="([^"]*)"/)?.[1] || 'op'
  const value = decode(m[0].match(/\bvalue="([^"]*)"/)?.[1] || '')
  return [name, value]
}

export async function aplicarPagina(sesion, pagina, { mensaje, guardar, log = s => process.stdout.write(s) }) {
  const nid = pagina.nid ?? await sesion.nid(pagina.ruta)
  const titulo = `${pagina.ruta ?? ''} (nodo ${nid})`
  const { html, accion } = await sesion.formAbierto(nid)
  const form = formDelNodo(html).html
  const pares = camposDelForm(form)
  const { nuevos, problemas } = prepararCambios(pares, pagina.cambios)
  if (problemas.length) {
    log(`\n${titulo}: SALTEADA, no se cambio nada.\n${problemas.map(p => '    ' + p).join('\n')}\n`)
    return { nid, ruta: pagina.ruta, resultado: 'salteada', problemas }
  }
  log(`\n${titulo}\n`)
  for (const c of pagina.cambios) log(`    ${c.campo}\n      ${JSON.stringify(c.antes)}  ->  ${JSON.stringify(c.despues)}\n`)
  const guardarBtn = botonGuardar(form)
  if (!guardarBtn) throw new ErrorDrupal(`${titulo}: no encontre el boton Guardar del formulario.`)
  if (!guardar) { log('    (ensayo: no se guardo)\n'); return { nid, ruta: pagina.ruta, resultado: 'ensayo' } }

  const envio = nuevos.filter(([k]) => !/^revision_log\[0\]\[value\]$/.test(k))
  if (!envio.some(([k]) => k === 'revision') && /name="revision"/.test(form)) envio.push(['revision', '1'])
  envio.push(['revision_log[0][value]', mensaje], guardarBtn)
  const res = await sesion.post(accion, envio)
  const cuerpo = await res.text()
  if (!(res.status >= 300 && res.status < 400)) {
    const errores = [...cuerpo.matchAll(/class="[^"]*messages--error[^"]*"[\s\S]*?<\/div>/g)]
      .map(m => decode(m[0].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()).join(' | ')
    throw new ErrorDrupal(`${titulo}: Drupal no guardo (respuesta ${res.status}). ${errores || 'Sin mensaje de error visible.'}`)
  }

  // Verificacion: la pagina entera, antes y despues.
  const { html: html2 } = await sesion.formAbierto(nid)
  const despues = camposDelForm(formDelNodo(html2).html)
  const dif = diferencias(pares, despues)
  const esperadas = new Map(pagina.cambios.map(c => [c.campo, c]))
  const raras = dif.filter(d => !esperadas.has(d.campo) || norm(d.despues ?? '') !== norm(esperadas.get(d.campo).despues))
  const faltan = pagina.cambios.filter(c => norm(c.antes) !== norm(c.despues) && !dif.some(d => d.campo === c.campo))
  if (raras.length || faltan.length) {
    log(`    GUARDADO, PERO LA VERIFICACION NO CIERRA:\n`)
    for (const d of raras) log(`      cambio inesperado ${d.campo}: ${JSON.stringify(d.antes)} -> ${JSON.stringify(d.despues)}\n`)
    for (const c of faltan) log(`      no quedo aplicado ${c.campo}\n`)
    log(`      Se puede volver atras desde /node/${nid}/revisions.\n`)
    return { nid, ruta: pagina.ruta, resultado: 'verificacion-fallida', raras, faltan: faltan.map(c => c.campo) }
  }
  log('    guardado y verificado\n')
  return { nid, ruta: pagina.ruta, resultado: 'guardado' }
}

async function main() {
  const args = process.argv.slice(2)
  const guardar = args.includes('--save')
  const archivo = args.find(a => !a.startsWith('--'))
  if (!archivo) throw new ErrorDrupal('Uso: npm run aplicar -- <plan.json> [--save]')
  const plan = JSON.parse(fs.readFileSync(archivo, 'utf8'))
  const errores = validarPlan(plan)
  if (errores.length) throw new ErrorDrupal('El plan no es valido:\n  ' + errores.join('\n  '))
  const sitio = sitioDelPlan(plan, guardar)

  const total = plan.paginas.reduce((n, p) => n + p.cambios.length, 0)
  process.stdout.write(`${guardar ? 'APLICANDO' : 'ENSAYO (sin guardar)'}: ${total} cambios en ${plan.paginas.length} paginas de ${sitio.base}\n`)
  const sesion = new Sesion(sitio)
  await sesion.login()
  const resultados = []
  for (const p of plan.paginas) {
    try {
      resultados.push(await aplicarPagina(sesion, p, { mensaje: plan.mensaje, guardar }))
    } catch (e) {
      process.stdout.write(`\n${p.ruta ?? 'node/' + p.nid}: ERROR: ${e.message}\n`)
      resultados.push({ ruta: p.ruta, nid: p.nid, resultado: 'error', error: e.message })
    }
  }
  const cuenta = resultados.reduce((m, r) => ({ ...m, [r.resultado]: (m[r.resultado] || 0) + 1 }), {})
  process.stdout.write(`\nResumen: ${Object.entries(cuenta).map(([k, v]) => `${v} ${k}`).join(', ')}\n`)
  if (guardar) {
    fs.mkdirSync('logs', { recursive: true })
    fs.appendFileSync(path.join('logs', 'aplicar.jsonl'), JSON.stringify({ fecha: new Date().toISOString(), plan: archivo, sitio: plan.sitio, usuario: sesion.usuario, mensaje: plan.mensaje, resultados }) + '\n')
  }
  if (resultados.some(r => r.resultado !== 'guardado' && r.resultado !== 'ensayo')) process.exitCode = 2
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => { console.error(e instanceof ErrorDrupal ? `ERROR: ${e.message}` : e); process.exit(1) })
}

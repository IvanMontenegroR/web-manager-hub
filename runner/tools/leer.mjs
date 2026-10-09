#!/usr/bin/env node
// Lee paginas del CMS tal como estan: cada paragraph, su posicion, su tipo y cada campo con
// su nombre EXACTO del formulario y su valor. Solo lee: abre el formulario de edicion,
// despliega los paragraphs ("Editar todo") y NUNCA lo envia.
//
//   npm run leer -- /adopta/tenencia-responsable          una pagina
//   npm run leer -- /adopta --prefijo                     todas las que empiezan con /adopta
//   npm run leer -- node/1160 /otra --sitio content-mx    varias, por ruta o por nodo
//
// Escribe lecturas/<ruta>.json (no se versiona: es contenido del CMS) y muestra el arbol.
// Ese JSON es lo que se usa para planear un cambio: de ahi salen los `campo` y `antes` del
// plan que despues corre `aplicar`.
import fs from 'node:fs'
import path from 'node:path'
import { SITIOS, Sesion, arbol, ErrorDrupal } from './drupal-http.js'

export function slugDe(ruta) {
  return String(ruta).replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9._-]+/gi, '__') || 'inicio'
}

export async function leerPagina(sesion, { ruta, nid }) {
  nid ??= await sesion.nid(ruta)
  const { html } = await sesion.formAbierto(nid)
  const { pagina, paragraphs } = arbol(html)
  return {
    ruta: ruta ?? pagina['path[0][alias]'] ?? `node/${nid}`,
    nid,
    titulo: pagina['title[0][value]'] ?? null,
    estado: pagina['moderation_state[0][state]'] ?? null,
    leido: new Date().toISOString(),
    sitio: sesion.sitio.base,
    pagina,
    paragraphs,
  }
}

export function imprimir(l, out = process.stdout) {
  out.write(`\n${l.ruta}  (nodo ${l.nid}${l.estado ? `, ${l.estado}` : ''})  ${l.titulo ?? ''}\n`)
  for (const p of l.paragraphs) {
    const sangria = '  '.repeat((p.ruta?.match(/>/g) || []).length + 1)
    out.write(`${sangria}[${p.ruta}] ${p.etiqueta ?? p.tipo}${p.cerrado ? '  (cerrado, sin leer)' : ''}\n`)
    for (const [k, v] of Object.entries(p.campos)) {
      if (/\[classy\]|\[options\]\[attributes\]/.test(k) && /^_none$|^default$|^left$|^lg$/.test(String(v))) continue
      const txt = String(v).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      out.write(`${sangria}    ${k} = ${txt.length > 110 ? txt.slice(0, 110) + '…' : txt}\n`)
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : null }
  const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? (args.splice(i, 1), true) : false }
  const sitioNombre = opt('--sitio') || 'content-mx'
  const salida = opt('--salida') || 'lecturas'
  const prefijo = flag('--prefijo')
  const silencioso = flag('--json')
  const sitio = SITIOS[sitioNombre]
  if (!sitio) throw new ErrorDrupal(`Sitio desconocido: ${sitioNombre}. Conocidos: ${Object.keys(SITIOS).join(', ')}`)
  if (!args.length) throw new ErrorDrupal('Uso: npm run leer -- <ruta|node/N> [...] [--prefijo] [--sitio content-mx]')

  const sesion = new Sesion(sitio)
  await sesion.login()
  let objetivos = []
  for (const a of args) {
    if (prefijo) objetivos.push(...await sesion.rutasConPrefijo(a))
    else objetivos.push({ ruta: /^\/?node\/\d+$|^\d+$/.test(a) ? undefined : a, nid: /^\/?node\/(\d+)$/.exec(a)?.[1] ?? (/^\d+$/.test(a) ? a : undefined) })
  }
  if (!objetivos.length) throw new ErrorDrupal('No encontre paginas para leer.')
  fs.mkdirSync(salida, { recursive: true })
  for (const o of objetivos) {
    try {
      const l = await leerPagina(sesion, { ruta: o.ruta, nid: o.nid && Number(o.nid) })
      const archivo = path.join(salida, slugDe(l.ruta) + '.json')
      fs.writeFileSync(archivo, JSON.stringify(l, null, 1))
      if (!silencioso) imprimir(l)
      process.stdout.write(`  -> ${archivo}\n`)
    } catch (e) {
      process.stdout.write(`\n${o.ruta ?? 'node/' + o.nid}: NO SE PUDO LEER: ${e.message}\n`)
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => { console.error(e instanceof ErrorDrupal ? `ERROR: ${e.message}` : e); process.exit(1) })
}

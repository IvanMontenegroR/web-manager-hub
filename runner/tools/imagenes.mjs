// RECORTA las imagenes de un plan a la medida EXACTA que pide el componente donde caen.
//
//   node tools/imagenes.mjs planes/ imagenes/          # todos los planes
//   node tools/imagenes.mjs planes/conoce-purina.json imagenes/
//
// POR QUE HACE FALTA. Las imagenes del sitio viejo estan cortadas para el sitio viejo.
// Una foto de card de 500×360 no es la card apaisada de 485×280 ni la vertical de
// 822×1230: cambia la proporcion, o sea que hay que RECORTAR, y a veces no alcanza el
// tamaño y hay que pedirla de nuevo. Dejar la URL vieja apuntada en el CMS es dejar la
// pagina rota de una forma que no se ve hasta produccion.
//
// LAS MEDIDAS NO SE ESCRIBEN ACA. Salen de `getSpecs` del catalogo del hub, la misma
// funcion que usa la matriz de contenido y el placeholder del mockup. Si una medida
// cambia ahi, se vuelve a correr esto y listo.
//
// POR QUE CHROME Y NO UNA LIBRERIA DE IMAGENES. Misma razon que en placeholders.mjs: en
// una maquina corporativa instalar `sharp` (binario nativo) o ImageMagick es pelearse
// con el proxy y con permisos. El navegador ya esta, ya sabe bajar de esa red y ya sabe
// dibujar. El recorte es un `object-fit: cover` y una captura.
//
// QUE ESCRIBE. Los archivos recortados en la carpeta destino, y de vuelta en el plan
// deja el registro de cada imagen:
//     "image": { "origen": "...", "archivo": "...", "de": "500×360", "a": "485×280",
//                "modo": "recorte" | "ESTIRADA", "kb": 84 }
// El `origen` se conserva a proposito: es lo que el hub muestra en el preview, y es la
// unica forma de volver atras si el recorte salio mal.
import { readFileSync, writeFileSync, mkdirSync, statSync, readdirSync } from 'node:fs'
import { join, resolve, basename, dirname } from 'node:path'
import { openBrowser } from '../src/browser.js'
import { getComponent, getSpecs } from '../../src/data/components.js'

const args = process.argv.slice(2)
const [entrada, destino] = args.filter((a) => !a.startsWith('--'))
if (!entrada || !destino) {
  process.stderr.write('uso: node tools/imagenes.mjs <planes/ | plan.json> <carpeta-imagenes>\n')
  process.exit(2)
}
const CALIDAD = Number(args.find((a) => a.startsWith('--calidad='))?.split('=')[1] || 82)

// "2100×700px" -> { w, h }. Una spec puede no tener la vista (varias solo traen desktop).
function medida(txt) {
  const m = /^(\d+)\s*[×x]\s*(\d+)/.exec(String(txt || '').trim())
  return m ? { w: Number(m[1]), h: Number(m[2]) } : null
}

// Que vista es cada campo de imagen. La convencion del catalogo es estable: `image` y
// `background_image` son desktop, y los `*_mobile` son mobile.
const vistaDe = (key) => (/_mobile$/.test(key) ? 'mobile' : 'desktop')

// Los campos de tipo `image` de un componente, incluidos los de adentro de una lista.
// Salen del CATALOGO, no de una lista escrita a mano: un componente nuevo con una imagen
// nueva entra solo.
function camposImagen(def) {
  const sueltos = [], enLista = []
  for (const f of (def?.fields || [])) {
    if (f.type === 'image') sueltos.push(f.key)
    if (f.type === 'list') {
      for (const sf of (f.item || [])) if (sf.type === 'image') enLista.push([f.key, sf.key])
    }
  }
  return { sueltos, enLista }
}

// Todas las imagenes de un bloque, con la medida que le toca a cada una.
function imagenesDe(bloque) {
  const def = getComponent(bloque.componente)
  if (!def) return []
  const specs = getSpecs(def, bloque.contenido || {})
  const objetivo = (vista) => medida(specs[0]?.[vista])
  const { sueltos, enLista } = camposImagen(def)
  const out = []
  const uno = (contenedor, key, etiqueta) => {
    const v = contenedor?.[key]
    const origen = typeof v === 'string' ? v : v?.origen
    if (!origen || !/^https?:/.test(origen)) return
    const obj = objetivo(vistaDe(key))
    if (!obj) return    // esa vista no tiene medida declarada: no se inventa
    out.push({ contenedor, key, origen, ...obj, etiqueta })
  }
  for (const k of sueltos) uno(bloque.contenido, k, k)
  for (const [lista, k] of enLista) {
    ;(bloque.contenido?.[lista] || []).forEach((it, i) => uno(it, k, `${lista}${i + 1}-${k}`))
  }
  return out
}

// Recorre el arbol del plan (bloques + hijos).
function todosLosBloques(plan) {
  const out = []
  const rec = (arr) => { for (const b of (arr || [])) { out.push(b); rec(b.hijos) } }
  rec(plan.bloques)
  return out
}

// ---------------------------------------------------------------------------------
const planes = statSync(resolve(entrada)).isDirectory()
  ? readdirSync(resolve(entrada)).filter((f) => f.endsWith('.json')).map((f) => join(resolve(entrada), f))
  : [resolve(entrada)]

const { ctx, page } = await openBrowser({ profileDir: '.profile', headless: true,
  ...(process.env.RUNNER_CHROME ? { executablePath: process.env.RUNNER_CHROME } : {}) })

let hechas = 0, estiradas = 0, fallaron = 0
try {
  for (const archivo of planes) {
    const plan = JSON.parse(readFileSync(archivo, 'utf8'))
    const slug = basename(archivo, '.json')
    const carpeta = join(resolve(destino), slug)
    const bloques = todosLosBloques(plan)
    let n = 0
    process.stderr.write(`\n${slug}\n`)

    for (const [i, bloque] of bloques.entries()) {
      for (const img of imagenesDe(bloque)) {
        n += 1
        const nombre = `${String(i + 1).padStart(2, '0')}-${bloque.componente}-${img.etiqueta}.jpg`
        const salida = join(carpeta, nombre)
        try {
          // Se bajan los BYTES con el contexto del navegador (misma red, mismas cookies,
          // mismo proxy) y se dibujan como data: URI. Cargar la imagen por su URL en un
          // <img> y pasarla por canvas no sirve: sin cabeceras CORS el canvas queda
          // "tainted" y no se puede exportar.
          const res = await ctx.request.get(img.origen, { timeout: 30000 })
          if (!res.ok()) throw new Error(`HTTP ${res.status()}`)
          const buf = await res.body()
          const mime = res.headers()['content-type'] || 'image/jpeg'
          const data = `data:${mime};base64,${buf.toString('base64')}`

          await page.setViewportSize({ width: img.w, height: img.h })
          await page.setContent(
            `<style>html,body{margin:0}
             #c{width:${img.w}px;height:${img.h}px;overflow:hidden}
             img{width:100%;height:100%;object-fit:cover;display:block}</style>
             <div id="c"><img src="${data}"></div>`, { waitUntil: 'load' })
          // El tamaño NATURAL sale del navegador, no de la extraccion: es el unico dato
          // que dice si esto es un recorte o un estiramiento.
          const nat = await page.evaluate(() => {
            const i = document.querySelector('img')
            return { w: i.naturalWidth, h: i.naturalHeight }
          })
          mkdirSync(dirname(salida), { recursive: true })
          await page.locator('#c').screenshot({ path: salida, type: 'jpeg', quality: CALIDAD })

          // Escala necesaria para CUBRIR el destino. >1 = la fuente no da y se estira.
          const escala = Math.max(img.w / (nat.w || 1), img.h / (nat.h || 1))
          const estirada = escala > 1.001
          if (estirada) estiradas += 1
          const kb = Math.round(statSync(salida).size / 1024)
          img.contenedor[img.key] = {
            origen: img.origen,
            archivo: join(slug, nombre),
            de: `${nat.w}×${nat.h}`,
            a: `${img.w}×${img.h}`,
            modo: estirada ? 'ESTIRADA' : 'recorte',
            kb,
          }
          if (estirada) {
            plan.revisar.push(`IMAGEN ESTIRADA: ${img.etiqueta} del bloque ${i + 1} (${bloque.componente}) es de ${nat.w}×${nat.h} y hace falta ${img.w}×${img.h}. No alcanza: hay que pedirla de nuevo, agrandarla se ve mal.`)
          }
          hechas += 1
          process.stderr.write(`  ${estirada ? '!' : '·'} ${nombre}  ${nat.w}×${nat.h} -> ${img.w}×${img.h}  ${kb}kb\n`)
        } catch (e) {
          fallaron += 1
          plan.revisar.push(`IMAGEN que no se pudo bajar: ${img.origen} (${String(e.message).slice(0, 80)})`)
          process.stderr.write(`  x ${nombre}  ${String(e.message).slice(0, 60)}\n`)
        }
      }
    }
    if (!n) process.stderr.write('  (sin imagenes)\n')
    writeFileSync(archivo, JSON.stringify(plan, null, 2) + '\n', 'utf8')
  }
} finally {
  await ctx.close()
}

process.stderr.write(`\n${hechas} imagen/es recortada/s en ${resolve(destino)}\n`)
if (estiradas) process.stderr.write(`${estiradas} NO alcanzaban la medida y quedaron estiradas: estan marcadas en el plan, hay que pedirlas de nuevo.\n`)
if (fallaron) process.stderr.write(`${fallaron} no se pudieron bajar (quedaron anotadas en el plan).\n`)

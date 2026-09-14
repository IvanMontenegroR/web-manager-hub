// RECORTA las imagenes de una pagina a la medida EXACTA que pide el componente donde
// caen, y deja el indice para subirlas a la Media library.
//
//   node tools/imagenes.mjs planes/ imagenes/          # todos los planes
//   node tools/imagenes.mjs planes/conoce-purina.json imagenes/
//   node tools/imagenes.mjs --hub=/conoce-purina imagenes/   # una pagina YA armada en el hub
//
// LAS DOS ENTRADAS. Una pagina puede llegar por dos caminos y los dos terminan en el CMS:
// del sitio viejo (extraer -> plan -> aca) o armada a mano en el builder del hub. La
// segunda no tiene archivo de plan, asi que se lee derecho de la base con `--hub`. Es el
// mismo trabajo: lo unico que cambia es de donde salen los bloques. Sin esto, una pagina
// del hub llegaba al manifiesto pidiendo medios que nadie habia recortado ni subido.
//
// POR QUE HACE FALTA. Las imagenes del sitio viejo estan cortadas para el sitio viejo.
// Una foto de card de 500×360 no es la card apaisada de 485×280 ni la vertical de
// 822×1230: cambia la proporcion, o sea que hay que RECORTAR, y a veces no alcanza el
// tamaño y hay que pedirla de nuevo.
//
// LAS MEDIDAS NO SE ESCRIBEN ACA. Salen de `getSpecs` del catalogo del hub, la misma
// funcion que usa la matriz de contenido y el placeholder del mockup.
//
// POR QUE CHROME Y NO UNA LIBRERIA DE IMAGENES. Misma razon que en placeholders.mjs: en
// una maquina corporativa instalar `sharp` (binario nativo) o ImageMagick es pelearse
// con el proxy. El navegador ya esta, ya sabe bajar de esa red y ya sabe dibujar. El
// recorte es un `object-fit: cover` y una captura.
//
// UN MEDIO SON DOS ARCHIVOS. El bundle del CMS es `responsive_image` y lleva Image
// Desktop e Image Mobile adentro, las dos obligatorias. Asi que `image` y `image_mobile`
// no son dos medios: son uno con dos archivos. Y cuando el hub no trae una foto mobile
// aparte, se recorta la MISMA foto a la medida de mobile, que es mejor que repetir el
// archivo de desktop. Solo si el catalogo no declara medida mobile se repite el de
// desktop, porque el campo es obligatorio y no hay de donde sacar otra.
//
// QUE ESCRIBE. Los archivos recortados en `<destino>/<slug>/`, un `INDICE.json` por
// pagina (que es lo que lee el subidor), y de vuelta en el plan el registro de cada
// imagen:
//     "image": { "origen": "...", "medio": "...", "archivo": "...", "de": "500×360",
//                "a": "485×280", "modo": "recorte", "kb": 84 }
// El `origen` se conserva a proposito: es lo que el hub muestra en el preview, y es la
// unica forma de volver atras si el recorte salio mal.
import { readFileSync, writeFileSync, mkdirSync, statSync, readdirSync, copyFileSync } from 'node:fs'
import { join, resolve, basename, dirname } from 'node:path'
import { openBrowser } from '../src/browser.js'
import { mediosDeBloque, campoBase } from './medios.js'
import { leerPagina } from './hub.js'
import { slugDePagina, planDelHub } from './paginas.js'

const args = process.argv.slice(2)
const hub = args.find((a) => a.startsWith('--hub='))?.split('=')[1]
const market = args.find((a) => a.startsWith('--market='))?.split('=')[1] || 'MX'
const [uno, dos] = args.filter((a) => !a.startsWith('--'))
const entrada = hub ? null : uno
const destino = hub ? uno : dos
if ((!entrada && !hub) || !destino) {
  process.stderr.write('uso: node tools/imagenes.mjs <planes/ | plan.json> <carpeta-imagenes>\n'
    + '     node tools/imagenes.mjs --hub=<path-de-la-pagina> <carpeta-imagenes> [--market=MX]\n')
  process.exit(2)
}
const CALIDAD = Number(args.find((a) => a.startsWith('--calidad='))?.split('=')[1] || 82)

// Recorre el arbol del plan (bloques + hijos).
function todosLosBloques(plan) {
  const out = []
  const rec = (arr) => { for (const b of (arr || [])) { out.push(b); rec(b.hijos) } }
  rec(plan.bloques)
  return out
}

// ---------------------------------------------------------------------------------
// Las paginas a recortar, ya con la misma forma vengan de donde vengan. `archivo` en null
// = vino del hub y no hay plan que actualizar: lo que se anota para revisar se imprime.
let entradas
if (hub) {
  const leido = await leerPagina(hub, market)
  if (!leido) {
    process.stderr.write(`No existe la pagina ${hub} [${market}] en el hub.\n`)
    process.exit(1)
  }
  entradas = [{
    archivo: null,
    slug: slugDePagina(leido.pagina.path),
    plan: { pagina: leido.pagina, bloques: leido.bloques.map(planDelHub), revisar: [] },
  }]
} else {
  const planes = statSync(resolve(entrada)).isDirectory()
    ? readdirSync(resolve(entrada)).filter((f) => f.endsWith('.json')).map((f) => join(resolve(entrada), f))
    : [resolve(entrada)]
  entradas = planes.map((archivo) => ({
    archivo,
    slug: basename(archivo, '.json'),
    plan: JSON.parse(readFileSync(archivo, 'utf8')),
  }))
}

const { ctx, page } = await openBrowser({ profileDir: '.profile', headless: true,
  ...(process.env.RUNNER_CHROME ? { executablePath: process.env.RUNNER_CHROME } : {}) })

// Baja los bytes con el contexto del navegador (misma red, mismas cookies, mismo proxy) y
// los dibuja como data: URI. Cargar la imagen por su URL en un <img> y pasarla por canvas
// no sirve: sin cabeceras CORS el canvas queda "tainted" y no se puede exportar.
async function recortar({ origen, w, h, salida }) {
  const res = await ctx.request.get(origen, { timeout: 30000 })
  if (!res.ok()) throw new Error(`HTTP ${res.status()}`)
  const buf = await res.body()
  const mime = res.headers()['content-type'] || 'image/jpeg'
  const data = `data:${mime};base64,${buf.toString('base64')}`

  await page.setViewportSize({ width: w, height: h })
  await page.setContent(
    `<style>html,body{margin:0}
     #c{width:${w}px;height:${h}px;overflow:hidden}
     img{width:100%;height:100%;object-fit:cover;display:block}</style>
     <div id="c"><img src="${data}"></div>`, { waitUntil: 'load' })
  // El tamaño NATURAL sale del navegador, no de la extraccion: es el unico dato que dice
  // si esto es un recorte o un estiramiento.
  const nat = await page.evaluate(() => {
    const i = document.querySelector('img')
    return { w: i.naturalWidth, h: i.naturalHeight }
  })
  mkdirSync(dirname(salida), { recursive: true })
  await page.locator('#c').screenshot({ path: salida, type: 'jpeg', quality: CALIDAD })
  return { nat, escala: Math.max(w / (nat.w || 1), h / (nat.h || 1)) }
}

let hechas = 0, estiradas = 0, fallaron = 0
try {
  for (const { archivo, slug, plan } of entradas) {
    const carpeta = join(resolve(destino), slug)
    const indice = []
    process.stderr.write(`\n${slug}\n`)

    for (const [i, bloque] of todosLosBloques(plan).entries()) {
      for (const medio of mediosDeBloque(bloque, slug)) {
        const donde = `bloque ${i + 1} (${bloque.componente}) — ${medio.etiqueta}`
        try {
          const dsk = `${medio.nombre}-desktop.jpg`
          const r = await recortar({ ...medio.desktop, salida: join(carpeta, dsk) })
          const estirada = r.escala > 1.001
          if (estirada) estiradas += 1

          // El archivo de MOBILE. Si el catalogo no declara medida mobile se repite el de
          // desktop: el campo es obligatorio en el CMS y no hay de donde sacar otra.
          let mob = `${medio.nombre}-mobile.jpg`
          if (medio.mobile) {
            await recortar({ ...medio.mobile, salida: join(carpeta, mob) })
          } else {
            copyFileSync(join(carpeta, dsk), join(carpeta, mob))
          }

          const kb = Math.round(statSync(join(carpeta, dsk)).size / 1024)
          const registro = {
            origen: medio.desktop.origen,
            medio: medio.nombre,
            archivo: join(slug, dsk),
            de: `${r.nat.w}×${r.nat.h}`,
            a: `${medio.desktop.w}×${medio.desktop.h}`,
            modo: estirada ? 'ESTIRADA' : 'recorte',
            kb,
          }
          medio.campo.contenedor[medio.campo.key] = registro
          // El campo de mobile del hub queda apuntando al mismo medio: en el CMS es UNA
          // sola entidad con las dos imagenes adentro.
          if (medio.campoMobile) {
            medio.campoMobile.contenedor[medio.campoMobile.key] = { ...registro, archivo: join(slug, mob) }
          }
          indice.push({
            nombre: medio.nombre, desktop: { archivo: dsk }, mobile: { archivo: mob },
            alt: medio.campo.contenedor[`${campoBase(medio.campo.key)}_alt`] || '',
          })

          if (estirada) {
            plan.revisar.push(`IMAGEN ESTIRADA: ${donde} es de ${r.nat.w}×${r.nat.h} y hace falta `
              + `${medio.desktop.w}×${medio.desktop.h}. No alcanza: hay que pedirla de nuevo, agrandarla se ve mal.`)
          }
          hechas += 1
          process.stderr.write(`  ${estirada ? '!' : '·'} ${medio.nombre}  ${r.nat.w}×${r.nat.h} -> `
            + `${medio.desktop.w}×${medio.desktop.h}${medio.mobile ? ` + ${medio.mobile.w}×${medio.mobile.h}` : ' (mobile repite desktop)'}  ${kb}kb\n`)
        } catch (e) {
          fallaron += 1
          plan.revisar.push(`IMAGEN que no se pudo bajar: ${medio.desktop.origen} (${String(e.message).slice(0, 80)})`)
          process.stderr.write(`  x ${medio.nombre}  ${String(e.message).slice(0, 60)}\n`)
        }
      }
    }

    if (!indice.length) process.stderr.write('  (sin imagenes)\n')
    else {
      mkdirSync(carpeta, { recursive: true })
      writeFileSync(join(carpeta, 'INDICE.json'), JSON.stringify(indice, null, 2) + '\n', 'utf8')
    }
    // Del hub no se escribe nada: la pagina ya esta armada y el origen de cada foto es lo
    // que el builder muestra. Lo que habria ido al plan se imprime, que es donde se busca.
    if (archivo) writeFileSync(archivo, JSON.stringify(plan, null, 2) + '\n', 'utf8')
    else for (const r of plan.revisar) process.stderr.write(`  ! ${r}\n`)
  }
} finally {
  await ctx.close()
}

process.stderr.write(`\n${hechas} medio/s recortado/s en ${resolve(destino)}\n`)
if (estiradas) process.stderr.write(`${estiradas} NO alcanzaban la medida y quedaron estirados: estan marcados en el plan, hay que pedirlos de nuevo.\n`)
if (fallaron) process.stderr.write(`${fallaron} no se pudieron bajar (quedaron anotados en el plan).\n`)
process.stderr.write('\nSiguiente: subirlos a la Media library con\n  npm run subir-medios -- imagenes/<pagina>\n')

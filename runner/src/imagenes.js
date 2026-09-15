// RECORTAR las imagenes de una pagina a la medida que pide cada componente.
//
// Vive en `src/` y no adentro de la herramienta de terminal porque lo usan DOS: la CLI
// (`tools/imagenes.mjs`) y la INTERFAZ, que tiene que poder armar la pagina entera sin
// que nadie abra una consola. Chrome no deja abrir el mismo perfil dos veces, asi que la
// interfaz no puede llamar a la CLI como proceso aparte: le pasa SU navegador y listo.
//
// USA UNA PESTAÑA APARTE (`ctx.newPage()`). El recorte cambia el tamaño de la ventana y
// reemplaza el contenido de la pagina: hacerlo sobre la pestaña de la interfaz se llevaria
// puesto el formulario de Drupal a medio armar.
//
// POR QUE CHROME Y NO UNA LIBRERIA DE IMAGENES. En una maquina corporativa instalar
// `sharp` (binario nativo) o ImageMagick es pelearse con el proxy. El navegador ya esta,
// ya sabe bajar de esa red y ya sabe dibujar. El recorte es un `object-fit: cover` y una
// captura.
//
// LAS MEDIDAS NO SE ESCRIBEN ACA: salen de `getSpecs` del catalogo del hub, la misma
// funcion que usa la matriz de contenido y el placeholder del mockup.
import { writeFileSync, mkdirSync, statSync, copyFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { mediosDeBloque, campoBase } from '../tools/medios.js'

// Recorre el arbol de la pagina (bloques + hijos).
function todosLosBloques(plan) {
  const out = []
  const rec = (arr) => { for (const b of (arr || [])) { out.push(b); rec(b.hijos) } }
  rec(plan.bloques)
  return out
}

/**
 * Recorta los medios de UNA pagina y deja el INDICE.json que lee el subidor.
 *
 * @param {object} o
 * @param {import('playwright-core').BrowserContext} o.ctx  para bajar los bytes con las
 *   cookies y el proxy de la sesion abierta
 * @param {object} o.plan     `{ pagina, bloques, revisar }` (ver tools/paginas.js)
 * @param {string} o.slug     nombra la carpeta y va adelante del nombre de cada medio
 * @param {string} o.destino  carpeta madre; los archivos van a `<destino>/<slug>/`
 * @returns {Promise<{indice, hechas, estiradas, fallaron, notas}>}
 */
export async function recortarPagina({ ctx, plan, slug, destino, calidad = 82, onStep = () => {} }) {
  const carpeta = join(resolve(destino), slug)
  const indice = []
  const notas = []
  let hechas = 0, estiradas = 0, fallaron = 0

  // Pestaña propia, y se cierra pase lo que pase: si queda abierta, la proxima corrida
  // hereda una ventana con una imagen gigante adentro.
  const page = await ctx.newPage()
  try {
    // Baja los bytes con el contexto del navegador (misma red, mismas cookies, mismo
    // proxy) y los dibuja como data: URI. Cargar la imagen por su URL en un <img> y
    // pasarla por canvas no sirve: sin cabeceras CORS el canvas queda "tainted" y no se
    // puede exportar.
    const recortar = async ({ origen, w, h, salida }) => {
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
      // El tamaño NATURAL sale del navegador, no de la extraccion: es el unico dato que
      // dice si esto es un recorte o un estiramiento.
      const nat = await page.evaluate(() => {
        const i = document.querySelector('img')
        return { w: i.naturalWidth, h: i.naturalHeight }
      })
      mkdirSync(dirname(salida), { recursive: true })
      await page.locator('#c').screenshot({ path: salida, type: 'jpeg', quality: calidad })
      return { nat, escala: Math.max(w / (nat.w || 1), h / (nat.h || 1)) }
    }

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
          const mob = `${medio.nombre}-mobile.jpg`
          if (medio.mobile) await recortar({ ...medio.mobile, salida: join(carpeta, mob) })
          else copyFileSync(join(carpeta, dsk), join(carpeta, mob))

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
            notas.push(`IMAGEN ESTIRADA: ${donde} es de ${r.nat.w}×${r.nat.h} y hace falta `
              + `${medio.desktop.w}×${medio.desktop.h}. No alcanza: hay que pedirla de nuevo, `
              + 'agrandarla se ve mal.')
          }
          hechas += 1
          onStep(`  ${estirada ? '!' : '·'} ${medio.nombre}  ${r.nat.w}×${r.nat.h} -> `
            + `${medio.desktop.w}×${medio.desktop.h}`
            + `${medio.mobile ? ` + ${medio.mobile.w}×${medio.mobile.h}` : ' (mobile repite desktop)'}  ${kb}kb`)
        } catch (e) {
          fallaron += 1
          notas.push(`IMAGEN que no se pudo bajar: ${medio.desktop.origen} (${String(e.message).slice(0, 80)})`)
          onStep(`  x ${medio.nombre}  ${String(e.message).slice(0, 60)}`)
        }
      }
    }
  } finally {
    await page.close().catch(() => {})
  }

  // El INDICE es el contrato con el subidor: dice que DOS archivos forman cada medio y
  // con que nombre queda. Sin imagenes no se escribe: una carpeta con un indice vacio
  // haria que el subidor se queje de que no hay nada, y no tener fotos no es un error.
  if (indice.length) {
    mkdirSync(carpeta, { recursive: true })
    writeFileSync(join(carpeta, 'INDICE.json'), JSON.stringify(indice, null, 2) + '\n', 'utf8')
  }
  if (plan.revisar) plan.revisar.push(...notas)

  return { indice, hechas, estiradas, fallaron, notas, carpeta }
}

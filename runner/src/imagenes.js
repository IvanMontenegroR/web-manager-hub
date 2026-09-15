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
import { request } from 'playwright-core'
import { mediosDeBloque, archivosDeBloque, archivoDe, campoBase } from '../tools/medios.js'

// La red de una empresa suele INSPECCIONAR TLS: un proxy se pone en el medio y firma los
// certificados con su propia CA. Windows confia en esa CA (por eso Chrome navega bien),
// pero Playwright no usa el almacen de Windows, usa el suyo — y la descarga se cae con
// "self-signed certificate in certificate chain".
//
// La salida limpia es darle la CA de la empresa: se exporta del almacen de Windows y se
// apunta `NODE_EXTRA_CA_CERTS` al archivo. Cuando esa variable esta puesta no se hace nada
// especial, que es como tiene que ser.
//
// Sin ella, se REINTENTA sin validar el certificado, avisando fuerte, y SOLO para esto:
// bajar imagenes publicas del sitio viejo para recortarlas. Es una descarga anonima, sin
// cookies y sin credenciales, y los bytes se ven despues en la captura. La sesion de
// Drupal NO pasa por aca: sigue con su contexto, que valida como siempre. La alternativa
// era que el runner no funcionara en la unica maquina donde tiene que funcionar.
const ES_DE_CERTIFICADO = /self[- ]signed certificate|unable to verify|CERT_|certificate chain/i


// El tamaño natural de una imagen, preguntandoselo al navegador.
async function medidaDe(page, data) {
  return await page.evaluate(async (d) => {
    const i = new Image()
    await new Promise((ok) => { i.onload = ok; i.onerror = ok; i.src = d })
    return { w: i.naturalWidth, h: i.naturalHeight }
  }, data)
}

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
 * @returns {Promise<{indice, archivos, hechas, estiradas, fallaron, notas, carpeta}>}
 *   `indice` son los MEDIOS (lo que sube `subir-medios`); `archivos`, las imagenes que no
 *   son un medio sino un campo de otro medio (la portada del video), que sube el armado.
 */
export async function recortarPagina({ ctx, plan, slug, destino, calidad = 82, onStep = () => {} }) {
  const carpeta = join(resolve(destino), slug)
  const indice = []
  // Las imagenes que NO son un medio: van aparte del INDICE a proposito, porque el INDICE
  // es el contrato con `subir-medios` y esto no se sube por ahi.
  const archivos = []
  const notas = []
  let hechas = 0, estiradas = 0, fallaron = 0

  // Pestaña propia, y se cierra pase lo que pase: si queda abierta, la proxima corrida
  // hereda una ventana con una imagen gigante adentro.
  const page = await ctx.newPage()
  // El que se usa para bajar: arranca siendo el de la sesion, que valida el certificado.
  // Si la red mete su CA en el medio, se cambia UNA vez por uno que no valida y se avisa.
  let bajar = ctx.request
  let relajado = null
  const bajarBytes = async (origen) => {
    try {
      return await bajar.get(origen, { timeout: 30000 })
    } catch (e) {
      if (!ES_DE_CERTIFICADO.test(e.message) || relajado) throw e
      onStep('  ! La red de la empresa inspecciona TLS y Playwright no confia en su '
        + 'certificado. Se bajan las imagenes SIN validarlo — son fotos publicas del sitio '
        + 'viejo, sin cookies ni credenciales. Para evitarlo, exporta la CA de la empresa y '
        + 'poné NODE_EXTRA_CA_CERTS apuntando al archivo.')
      relajado = await request.newContext({ ignoreHTTPSErrors: true })
      bajar = relajado
      return await bajar.get(origen, { timeout: 30000 })
    }
  }

  try {
    // Baja los bytes con el contexto del navegador (misma red, mismas cookies, mismo
    // proxy) y los dibuja como data: URI. Cargar la imagen por su URL en un <img> y
    // pasarla por canvas no sirve: sin cabeceras CORS el canvas queda "tainted" y no se
    // puede exportar.
    const recortar = async ({ origen, w, h, salida }) => {
      const res = await bajarBytes(origen)
      if (!res.ok()) throw new Error(`HTTP ${res.status()}`)
      const buf = await res.body()
      const mime = res.headers()['content-type'] || 'image/jpeg'
      const data = `data:${mime};base64,${buf.toString('base64')}`

      // SIN MEDIDA a la que recortar, se guarda el archivo tal cual: ni se re-encoda ni se
      // toca. Es mejor que la del sitio viejo llegue entera a que no llegue.
      if (!w || !h) {
        mkdirSync(dirname(salida), { recursive: true })
        writeFileSync(salida, buf)
        const nat = await medidaDe(page, data)
        return { nat, escala: 1, sinMedida: true }
      }

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
          const ext = medio.desktop.w ? 'jpg' : (/\.(png|gif|jpe?g|webp)(\?|$)/i.exec(medio.desktop.origen)?.[1] || 'jpg').toLowerCase()
          const dsk = `${medio.nombre}-desktop.${ext}`
          const r = await recortar({ ...medio.desktop, salida: join(carpeta, dsk) })
          const estirada = r.escala > 1.001
          if (estirada) estiradas += 1

          // El archivo de MOBILE. Si el catalogo no declara medida mobile se repite el de
          // desktop: el campo es obligatorio en el CMS y no hay de donde sacar otra.
          const mob = `${medio.nombre}-mobile.${ext}`
          if (medio.mobile) await recortar({ ...medio.mobile, salida: join(carpeta, mob) })
          else copyFileSync(join(carpeta, dsk), join(carpeta, mob))

          const kb = Math.round(statSync(join(carpeta, dsk)).size / 1024)
          const registro = {
            origen: medio.desktop.origen,
            medio: medio.nombre,
            archivo: join(slug, dsk),
            de: `${r.nat.w}×${r.nat.h}`,
            a: r.sinMedida ? `${r.nat.w}×${r.nat.h}` : `${medio.desktop.w}×${medio.desktop.h}`,
            modo: r.sinMedida ? 'original' : (estirada ? 'ESTIRADA' : 'recorte'),
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
            + (r.sinMedida ? 'sin cambios (el catalogo no declara medida para este componente)'
              : `${medio.desktop.w}×${medio.desktop.h}`)
            + `${medio.mobile ? ` + ${medio.mobile.w}×${medio.mobile.h}` : ' (mobile repite desktop)'}  ${kb}kb`)
        } catch (e) {
          fallaron += 1
          notas.push(`IMAGEN que no se pudo bajar: ${medio.desktop.origen} (${String(e.message).slice(0, 80)})`)
          onStep(`  x ${medio.nombre}  ${String(e.message).slice(0, 60)}`)
        }
      }

      // Las que NO son un medio propio sino un campo de otro medio: hoy la portada del
      // video. Se recortan igual, pero NO van al INDICE — el que las sube es el armado,
      // adentro del formulario donde crea el video, no `subir-medios`.
      for (const arch of archivosDeBloque(bloque, slug)) {
        const donde = `bloque ${i + 1} (${bloque.componente}) — ${arch.etiqueta}`
        try {
          const nombre = archivoDe(arch)
          const r = await recortar({ origen: arch.origen, w: arch.w, h: arch.h, salida: join(carpeta, nombre) })
          const estirada = r.escala > 1.001
          if (estirada) estiradas += 1
          hechas += 1
          archivos.push({
            nombre: arch.nombre, archivo: join(slug, nombre), key: arch.key,
            deCampo: arch.deCampo, alt: arch.alt,
          })
          if (estirada) {
            notas.push(`IMAGEN ESTIRADA: ${donde} es de ${r.nat.w}×${r.nat.h} y hace falta `
              + `${arch.w}×${arch.h}. No alcanza: hay que pedirla de nuevo, agrandarla se ve mal.`)
          }
          onStep(`  ${estirada ? '!' : '·'} ${arch.nombre}  ${r.nat.w}×${r.nat.h} -> `
            + (r.sinMedida ? 'sin cambios (el catalogo no declara medida para este campo)' : `${arch.w}×${arch.h}`)
            + '  (va adentro del medio del video, no a la libreria)')
        } catch (e) {
          fallaron += 1
          notas.push(`IMAGEN que no se pudo bajar: ${arch.origen} (${String(e.message).slice(0, 80)})`)
          onStep(`  x ${arch.nombre}  ${String(e.message).slice(0, 60)}`)
        }
      }
    }
  } finally {
    await page.close().catch(() => {})
    if (relajado) await relajado.dispose().catch(() => {})
  }

  // El INDICE es el contrato con el subidor: dice que DOS archivos forman cada medio y
  // con que nombre queda. Sin imagenes no se escribe: una carpeta con un indice vacio
  // haria que el subidor se queje de que no hay nada, y no tener fotos no es un error.
  if (indice.length) {
    mkdirSync(carpeta, { recursive: true })
    writeFileSync(join(carpeta, 'INDICE.json'), JSON.stringify(indice, null, 2) + '\n', 'utf8')
  }
  if (plan.revisar) plan.revisar.push(...notas)

  return { indice, archivos, hechas, estiradas, fallaron, notas, carpeta }
}

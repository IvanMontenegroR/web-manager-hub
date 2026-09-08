// Prueba la CADENA entera contra el sitio viejo de mentira:
//
//   extraer.mjs  ->  plan.mjs  ->  imagenes.mjs  ->  cargar.mjs --seco
//
// Lo que verifica no es que "corra": es que cada paso haga lo que promete.
//   - el banner sale con su foto, que en el HTML no es un <img> sino un background-image
//     dentro de un <style> (mobile y desktop separados);
//   - las cards NO cuentan los slides clonados por slick;
//   - el titulo de una card (un <h5>) llega al plan;
//   - las imagenes quedan en la medida EXACTA que pide el componente;
//   - una foto mas chica que su destino se marca ESTIRADA en vez de pasar de largo;
//   - una descripcion mas larga que la que muestra la card apaisada queda flageada.
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { servirSitioViejo } from './sitio-viejo.mjs'
import { openBrowser } from '../src/browser.js'

// El sitio de mentira se sirve en 127.0.0.1. Si la maquina tiene un proxy configurado
// por entorno (una corporativa lo tiene, y este contenedor tambien), Chrome manda hasta
// el localhost al proxy y el goto se cuelga hasta el timeout. Se excluye ANTES de
// arrancar nada, asi lo heredan tambien los procesos hijos.
process.env.NO_PROXY = process.env.no_proxy = '127.0.0.1,localhost'

const CHROME = process.env.RUNNER_CHROME
const tmp = mkdtempSync(join(tmpdir(), 'pipeline-'))
let fallas = 0
const ok = (cond, que) => {
  process.stdout.write(`${cond ? '  ok  ' : '  FALLA '}${que}\n`)
  if (!cond) fallas += 1
}
// ASINCRONICO a proposito. El sitio de mentira lo sirve ESTE proceso, y `execFileSync`
// bloquea el event loop: el hijo pedia la pagina y nadie se la contestaba nunca, asi que
// se colgaba hasta el timeout. Con await, el server sigue atendiendo.
const correr = (script, args) => new Promise((ok, mal) => {
  execFile(process.execPath, [script, ...args],
    { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' },
    (err, out, errOut) => (err ? mal(new Error(`${script}: ${errOut || err.message}`)) : ok(out + errOut)))
})

const sitio = await servirSitioViejo()
try {
  // --- 1. EXTRAER
  const salida = join(tmp, 'salida')
  writeFileSync(join(tmp, 'urls.txt'), `${sitio.url}/purina/pagina-de-prueba\n`)
  await correr('tools/extraer.mjs', [join(tmp, 'urls.txt'), salida])
  const leido = JSON.parse(readFileSync(join(salida, 'paginas.jsonl'), 'utf8').trim())
  ok(leido.status === 200, 'la pagina se leyo')

  const tipos = (leido.estructura || []).map((b) => b.tipo)
  ok(tipos[0] === 'banner', `el primer bloque es el banner (fue ${tipos[0]})`)
  const banner = leido.estructura[0]
  ok(banner.fondo?.desktop?.includes('banner-desktop'), 'el banner trae su foto de DESKTOP, que en el HTML es un background-image adentro de un @media')
  ok(banner.fondo?.mobile?.includes('banner-mobile'), 'y la de MOBILE, que es la regla de afuera del @media')

  const carrusel = leido.estructura.find((b) => b.tipo === 'carrusel')
  ok(carrusel?.slides.length === 2, `el carrusel tiene 2 slides reales, sin los clonados de slick (fueron ${carrusel?.slides.length})`)
  ok(carrusel?.slides[0].titulo === 'Inspiración para innovar', 'el titulo de la card (un <h5>) llego')

  const acordeon = leido.estructura.find((b) => b.tipo === 'acordeon')
    || leido.estructura.find((b) => b.tipo === 'columnas')?.columnas.flat().find((b) => b.tipo === 'acordeon')
  ok(acordeon?.items.length === 3, `el acordeon quedo con sus 3 items juntos por data-bs-parent (fueron ${acordeon?.items.length})`)

  // --- 2. PLAN
  const planes = join(tmp, 'planes')
  await correr('tools/plan.mjs', [join(salida, 'paginas.jsonl'), planes])
  const archivo = join(planes, readdirSync(planes)[0])
  const plan = JSON.parse(readFileSync(archivo, 'utf8'))

  ok(plan.pagina.path === '/pagina-de-prueba', `la ruta nueva se saco el prefijo /purina (quedo ${plan.pagina.path})`)
  const comps = plan.bloques.map((b) => b.componente)
  ok(comps[0] === 'banner', 'el banner se tradujo a un banner')
  ok(comps.includes('card_grid'), 'el carrusel se tradujo a un Card Grid')
  ok(comps.includes('external_video'), 'el iframe de YouTube se tradujo a un Video externo')
  ok(comps.includes('layout_columns_2'), 'el layout de 2 columnas del sitio viejo se reconocio')

  const cols = plan.bloques.find((b) => b.componente === 'layout_columns_2')
  ok(cols?.hijos?.some((h) => h.componente === 'accordion_grid' && h.slot === 1),
    'el acordeon quedo ADENTRO de la segunda columna')

  const grid = plan.bloques.find((b) => b.componente === 'card_grid')
  ok(grid.contenido.items.length === 2, 'el Card Grid tiene las 2 cards reales')
  ok(grid.contenido.items[0].cta_url === '/purina/innovacion', 'la card se llevo el link del boton')
  ok(plan.revisar.some((r) => /dos <h1>|2 <h1>/i.test(r) || /h1/.test(r)), 'los dos <h1> quedaron flageados')
  ok(plan.revisar.some((r) => /caracteres/.test(r)), 'la descripcion que no entra en la card apaisada quedo flageada')
  ok(plan.revisar.some((r) => /ALINEACION/.test(r)), 'la alineacion del banner quedo flageada: se decide mirando la foto')

  // --- 3. IMAGENES
  const imgs = join(tmp, 'imagenes')
  await correr('tools/imagenes.mjs', [planes, imgs])
  const plan2 = JSON.parse(readFileSync(archivo, 'utf8'))
  const grid2 = plan2.bloques.find((b) => b.componente === 'card_grid')
  const b2 = plan2.bloques[0]

  ok(b2.contenido.image?.a === '2100×700', `la foto del banner se recorto a la medida del Secondary Hero (quedo ${b2.contenido.image?.a})`)
  ok(b2.contenido.image?.modo === 'recorte', 'y como la original era mas grande, es un recorte y no un estiramiento')
  ok(grid2.contenido.items[0].image?.a === '485×280', `la card apaisada pide 485×280 (quedo ${grid2.contenido.items[0].image?.a})`)
  ok(grid2.contenido.items[1].image?.modo === 'ESTIRADA', 'la foto de 300×200 NO alcanza para 485×280 y se marco ESTIRADA')
  ok(plan2.revisar.some((r) => /ESTIRADA/.test(r)), 'y quedo anotado en las notas de la pagina, que es donde se busca')

  // La medida se verifica en el ARCHIVO, no en lo que dice el plan: es lo unico que
  // prueba que el recorte se hizo de verdad.
  const { ctx, page } = await openBrowser({ profileDir: join(tmp, '.perfil'), headless: true,
    ...(CHROME ? { executablePath: CHROME } : {}) })
  try {
    const archivoCard = join(imgs, grid2.contenido.items[0].image.archivo)
    const medida = await page.evaluate(async (data) => {
      const i = new Image()
      await new Promise((r) => { i.onload = r; i.src = data })
      return `${i.naturalWidth}×${i.naturalHeight}`
    }, `data:image/jpeg;base64,${readFileSync(archivoCard).toString('base64')}`)
    ok(medida === '485×280', `el archivo en disco mide 485×280 de verdad (mide ${medida})`)
  } finally { await ctx.close() }

  // --- 4. CARGAR (en seco: no toca la base)
  const seco = await correr('tools/cargar.mjs', [planes, '--seco'])
  ok(/no se escribio nada/.test(seco), 'la corrida en seco no escribe')
  ok(/card_grid/.test(seco), 'y muestra los bloques que cargaria')
} finally {
  sitio.cerrar()
  rmSync(tmp, { recursive: true, force: true })
}

process.stdout.write(fallas ? `\n${fallas} falla/s\n` : '\nTodo bien.\n')
process.exit(fallas ? 1 : 0)

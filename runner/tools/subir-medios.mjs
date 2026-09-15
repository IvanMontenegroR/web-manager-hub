// Sube a la Media library las imagenes ya recortadas de una pagina.
//
//   npm run login                          (una vez)
//   npm run subir-medios -- imagenes/conoce-purina
//   npm run subir-medios -- imagenes/conoce-purina --solo banner
//
// Es el paso que va ENTRE recortar y armar la pagina. El runner no sube imagenes mientras
// construye: ELIGE de la libreria por nombre. Asi que primero tienen que estar arriba.
//
// Por que separado y no adentro del build: si la subida falla a la mitad, no queda una
// pagina a medio armar con la mitad de las fotos. Y como es idempotente, reintentar no
// duplica nada — un medio que ya existe se saltea.
//
// Lee el `INDICE.json` que escribio tools/imagenes.mjs, que dice que dos archivos forman
// cada medio y con que nombre queda. Ese nombre es el que el manifiesto pide despues.
import { resolve } from 'node:path'
import { openBrowser } from '../src/browser.js'
import { loadMapping } from '../src/mapping.js'
import { subirPlaceholders } from '../src/media.js'

// Una pasada sola: lo que empieza con `--` es una opcion y se lleva el valor que sigue;
// lo demas es posicional. Mucho mas simple que adivinar despues cual valor era de quien.
// Las BANDERAS son las que no llevan valor: si no estuvieran declaradas se comerian el
// argumento de al lado, que es de otro.
const BANDERAS = new Set(['sin-alt'])
const opciones = {}
const sueltos = []
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i]
  if (!a.startsWith('--')) { sueltos.push(a); continue }
  const n = a.slice(2)
  opciones[n] = BANDERAS.has(n) ? true : process.argv[++i]
}
const opt = (n) => opciones[n]
const [carpeta] = sueltos
if (!carpeta) {
  process.stderr.write('uso: node tools/subir-medios.mjs <carpeta-de-la-pagina> '
    + '[--solo <texto>] [--alt <texto> | --sin-alt]\n')
  process.exit(2)
}

const mapping = loadMapping(opt('mapping') || 'mapping/purina-latam.json')

// EL ALT DE RESERVA. El alt de una foto de una pagina real no lo escribe el mercado, lo
// carga SEO (por eso en la matriz de contenido es un campo de la hoja CMS y no de la de
// Contenido). Asi que casi siempre va a faltar y hay que decidir que se pone.
//
// Se pone una marca que se pueda BUSCAR en la Media library, no un alt inventado: un
// texto plausible parece cargado y no lo corrige nadie. Se puede cambiar con --alt "...".
//
// `--sin-alt` los deja vacios. Es lo que uno querria — un campo vacio es lo mas facil de
// encontrar despues — pero en ESTE CMS el alt es obligatorio y Drupal no guarda el medio:
// la corrida frena diciendo exactamente eso. Queda la opcion para poder comprobarlo
// contra el CMS en vez de confiar en una nota.
const ALT_PENDIENTE = 'PENDIENTE - cargar alt'
const altDeReserva = () => (opt('sin-alt') ? '' : (opt('alt') || ALT_PENDIENTE))

let ctx, page
try {
  ;({ ctx, page } = await openBrowser({
    browser: opt('browser') || 'chrome',
    profileDir: opt('profile'),
    slowMo: Number(opt('slowmo') ?? 120),
    ...(process.env.RUNNER_CHROME ? { executablePath: process.env.RUNNER_CHROME } : {}),
  }))
  const r = await subirPlaceholders({
    page, mapping, carpeta: resolve(carpeta), solo: opt('solo'),
    // Estas son fotos de una pagina DE VERDAD, no material de relleno: el alt de
    // reserva no puede decir "Placeholder de prueba", que viaja al sitio publico y
    // parece cargado. Dice lo que es — que falta — y se puede buscar en la libreria.
    alUsar: altDeReserva(),
    onStep: (s) => process.stdout.write(s + '\n'),
  })
  process.stdout.write(`\n${r.subidos} subido/s, ${r.salteados} ya estaban, de ${r.total}.\n`)
  // El alt lo carga SEO, no el mercado, asi que casi siempre va a faltar. No frena, pero
  // no puede pasar callado: es lo que lee Google y un lector de pantalla.
  if (r.sinAlt?.length) {
    process.stdout.write(`\n${r.sinAlt.length} medio/s subieron sin alt propio `
      + (String(r.alUsado || '').trim()
        ? `y quedaron con "${r.alUsado}", que se puede buscar en la Media library:\n`
        : 'y quedaron VACIOS, como se pidio con --sin-alt:\n'))
    for (const n of r.sinAlt) process.stdout.write(`  · ${n}\n`)
    process.stdout.write('Hay que completarlos en la Media library antes de publicar la pagina.\n')
  }
  process.stdout.write('\nSiguiente: armar la pagina con\n  npm run build -- manifests/<pagina>.json\n')
} finally {
  if (ctx) await ctx.close()
}

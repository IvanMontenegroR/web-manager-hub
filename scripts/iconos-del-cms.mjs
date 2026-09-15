// Baja el sprite de iconos del CMS y lo convierte en `src/data/cmsIcons.js`.
//
//   node scripts/iconos-del-cms.mjs
//
// POR QUE UN SCRIPT Y NO COPIAR A MANO. Los iconos son 133 dibujos del tema de Purina:
// escribirlos seria inventarlos. Esto los trae del sitio, que es la fuente, y deja anotado
// de donde salieron. Cuando desarrollo agregue o cambie uno, se vuelve a correr.
//
// POR QUE SE GUARDAN COMO DATOS Y NO SE USA EL SPRITE CON <use>. El export a Excel captura
// los mockups con html2canvas, que no resuelve `<use href="...#nombre">`: los iconos
// saldrian en blanco justo en la matriz de contenido, que es el entregable. Guardados como
// el contenido de cada simbolo se dibujan como SVG comun y la captura los ve.
//
// Casi todos pintan con `currentColor`, asi que toman el color del bloque donde caen.
import { writeFileSync } from 'node:fs'

const SPRITE = 'https://content-ef5-purina-latam-mx.pantheonsite.io'
  + '/themes/custom/purina/Content/img/sprite.svg'
const SALIDA = new URL('../src/data/cmsIcons.js', import.meta.url)

const res = await fetch(SPRITE)
if (!res.ok) {
  process.stderr.write(`No pude bajar el sprite: HTTP ${res.status} ${SPRITE}\n`)
  process.exit(1)
}
const svg = await res.text()

// Los `<defs>` del sprite son compartidos por todos los simbolos. Solo uno los usa hoy,
// pero el que los use tiene que llevarselos puestos: suelto, el `url(#a)` no apunta a
// nada. Y el id se renombra por icono, porque dos iconos iguales en la misma pagina
// serian dos ids repetidos en el documento.
const defs = /<defs>([\s\S]*?)<\/defs>/.exec(svg)?.[1] || ''
const idsDeLosDefs = [...defs.matchAll(/id="([^"]+)"/g)].map((m) => m[1])

const iconos = {}
for (const [, nombre, viewBox, dentro] of svg.matchAll(/<symbol id="([^"]+)" viewBox="([^"]+)">([\s\S]*?)<\/symbol>/g)) {
  let inner = dentro
  const usados = idsDeLosDefs.filter((id) => inner.includes(`url(#${id})`))
  if (usados.length) {
    let d = defs
    for (const id of usados) {
      const unico = `cmsicon-${nombre}-${id}`
      d = d.replaceAll(`id="${id}"`, `id="${unico}"`)
      inner = inner.replaceAll(`url(#${id})`, `url(#${unico})`)
    }
    inner = `<defs>${d}</defs>${inner}`
  }
  iconos[nombre] = { viewBox, inner }
}

const nombres = Object.keys(iconos)
if (!nombres.length) {
  process.stderr.write('El sprite no trajo ningun <symbol>. ¿Cambio el formato?\n')
  process.exit(1)
}

const cabecera = `// LOS ICONOS DEL CMS, tal cual los dibuja el sitio. GENERADO — no se edita a mano:
// se vuelve a correr \`node scripts/iconos-del-cms.mjs\`, que los baja del sprite del tema
// de Purina. Ahi esta explicado por que se guardan asi y no con <use>.
//
// Sprite: ${SPRITE}
// ${nombres.length} iconos.
//
// \`inner\` es el contenido del simbolo y va adentro de un <svg> con su \`viewBox\`. Casi
// todos pintan con \`currentColor\`: toman el color de donde caen.
`

writeFileSync(SALIDA, `${cabecera}export const CMS_ICON_SVG = ${JSON.stringify(iconos, null, 0)}\n`, 'utf8')
process.stdout.write(`${nombres.length} iconos -> src/data/cmsIcons.js\n`)

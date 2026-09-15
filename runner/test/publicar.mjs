// Prueba la CADENA de publicar: que pasos son, en que orden, y que le pasa a cada uno.
//
// No corre ninguno — eso necesita navegador, base y CMS. Lo que se verifica aca es lo que
// se puede romper sin darse cuenta: que la subida vaya ANTES de armar (si no, el runner
// busca en la libreria fotos que todavia no estan), que el ensayo no mande `--save`, y que
// cada paso apunte a la carpeta y al archivo que dejo el anterior.
import { pasos } from '../tools/publicar.js'

let fallas = 0
const ok = (cond, que) => {
  process.stdout.write(`${cond ? '  ok  ' : '  FALLA '}${que}\n`)
  if (!cond) fallas += 1
}

const P = { path: '/conoce-purina', market: 'MX' }
const ensayo = pasos(P)
const guardando = pasos({ ...P, save: true })

const scripts = ensayo.map((p) => p.script)
ok(scripts.join() === 'tools/imagenes.mjs,tools/manifiesto.mjs,tools/subir-medios.mjs,src/cli.js',
  `los cuatro pasos, en orden (${scripts.join(' -> ')})`)

const iSubir = scripts.indexOf('tools/subir-medios.mjs')
const iArmar = scripts.indexOf('src/cli.js')
ok(iSubir < iArmar,
  'subir va ANTES de armar: el runner ELIGE las fotos de la libreria, no las sube mientras construye')

// Cada paso tiene que apuntar a lo que dejo el anterior. Es el error que no se ve leyendo:
// una carpeta o un nombre distinto y el paso siguiente no encuentra nada.
const [recortar, manifiesto, subir, armar] = ensayo
ok(recortar.args.includes('--hub=/conoce-purina'),
  'el recortador lee la pagina del HUB, que es la que no tiene archivo de plan')
ok(recortar.args.includes('imagenes'), 'y recorta en imagenes/, donde busca el subidor')
ok(subir.args.includes('imagenes/conoce-purina'),
  'el subidor busca en la carpeta de ESA pagina (imagenes/conoce-purina)')
ok(manifiesto.args[0] === '/conoce-purina', 'el manifiesto se pide por el path de la pagina')
ok(armar.args.includes('manifests/conoce-purina.json'),
  'y se arma con el archivo que el manifiesto escribio (manifests/conoce-purina.json)')

// La regla de la casa: sin --save no se escribe. Si esto se invierte, una corrida de
// prueba publica en el CMS.
ok(!JSON.stringify(ensayo).includes('--save'), 'el ENSAYO no manda --save en ningun paso')
ok(guardando.at(-1).args.includes('--save'), 'y con --save solo lo lleva el paso que arma')
ok(guardando.slice(0, -1).every((p) => !p.args.includes('--save')),
  'los otros tres pasos nunca lo llevan: no tienen nada que guardar')

// Una pagina sin fotos no es un error: es una pagina sin fotos.
const sinFotos = pasos({ ...P, hayImagenes: false })
ok(sinFotos.find((p) => p.script === 'tools/subir-medios.mjs')?.saltear === true,
  'sin imagenes, el paso de subir se saltea en vez de fallar por una carpeta que no existe')
ok(sinFotos.filter((p) => p.saltear).length === 1, 'y no se saltea ningun otro')

// El path manda sobre el slug: el nombre de la carpeta y el del manifiesto salen de ahi.
const otra = pasos({ path: '/como-apoyamos-refugios' })
ok(otra[2].args.includes('imagenes/como-apoyamos-refugios')
  && otra[3].args.includes('manifests/como-apoyamos-refugios.json'),
  'otra pagina usa su propio slug en los dos lados')

process.stdout.write(fallas ? `\n${fallas} falla/s\n` : '\nTodo bien.\n')
process.exit(fallas ? 1 : 0)

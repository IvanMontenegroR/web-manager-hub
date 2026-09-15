// Prueba el EMPAREJADO de videos del widget Media library, sin navegador.
//
// Es la parte que decide si el runner encuentra el video o frena, y la que mas facil se
// rompe en silencio: si empareja de menos, frena por algo que si estaba; si empareja de
// mas, mete en la pagina un video que no es.
//
// Por que por URL y no por nombre: el buscador del modal filtra por NOMBRE, y el nombre lo
// pone YouTube ("A ti te importa de donde viene su alimento"). El hub tiene la URL.
//
// Las URLs de ejemplo salieron de la libreria REAL de Purina: el mismo video esta cargado
// como `youtu.be/...` y como `youtube.com/watch?v=...`, y por eso se compara el ID.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { idDeVideo, mismoVideo, urlsDeLaFila } from '../src/mediaLibrary.js'
import { loadMapping, resolveSelector } from '../src/mapping.js'

const TMP = join(tmpdir(), `mapping-sin-sel-${process.pid}.json`)
let fallas = 0
const ok = (cond, que) => {
  process.stdout.write(`${cond ? '  ok  ' : '  FALLA '}${que}\n`)
  if (!cond) fallas += 1
}

ok(idDeVideo('https://www.youtube.com/watch?v=3-COT6aQbPo') === '3-COT6aQbPo', 'saca el id de una URL de YouTube')
ok(idDeVideo('https://youtu.be/3-COT6aQbPo') === '3-COT6aQbPo', 'y de una corta youtu.be')
ok(idDeVideo('https://youtu.be/1TCc3XnovMI?si=SFGQOuOradI5h2jI') === '1TCc3XnovMI',
  'y de una compartida con ?si=, que es como las pega la gente')
ok(idDeVideo('https://www.youtube.com/embed/3-COT6aQbPo') === '3-COT6aQbPo', 'y de una de embed')
ok(idDeVideo('https://vimeo.com/76979871') === '76979871', 'Vimeo tambien: el CMS lo acepta')
ok(idDeVideo('https://ejemplo.com/cosa') === null, 'y lo que no reconoce devuelve null, no un id inventado')

// El caso de verdad: Conoce Purina pide la URL larga y en la libreria esta la corta.
ok(mismoVideo('https://www.youtube.com/watch?v=3-COT6aQbPo', 'https://youtu.be/3-COT6aQbPo'),
  'la URL larga y la corta del MISMO video emparejan')
ok(!mismoVideo('https://www.youtube.com/watch?v=3-COT6aQbPo', 'https://youtu.be/1TCc3XnovMI'),
  'dos videos distintos NO emparejan')
ok(mismoVideo('https://ejemplo.com/v/1/', 'https://ejemplo.com/v/1'),
  'si de ninguna se saca id, se comparan las URLs normalizadas')
ok(!mismoVideo('', 'https://youtu.be/abc123'), 'y una URL vacia no empareja con nada')

// La fila de la grilla no dice la URL en ningun lado visible: viene adentro del iframe de
// oembed, escapada y con la URL original en el parametro `url=`. Este HTML es un recorte
// del real.
const FILA = `<div class="js-media-library-item"><div data-video-oembed-media-lazy="&lt;iframe
  src=&quot;https://content-ef5-purina-latam-mx.pantheonsite.io/media/oembed?url=https%3A//youtu.be/3-COT6aQbPo&amp;amp;max_width=0&quot;&gt;&lt;/iframe&gt;"></div>
  <div class="media-library-item__name">A ti te importa de donde viene su alimento</div></div>`

const urls = urlsDeLaFila(FILA)
ok(urls.includes('https://youtu.be/3-COT6aQbPo'),
  `saca la URL original de adentro del iframe de oembed (${urls.join(' | ') || 'ninguna'})`)
ok(urls.some((u) => mismoVideo(u, 'https://www.youtube.com/watch?v=3-COT6aQbPo')),
  'y esa fila empareja con lo que pide el hub, que es todo el punto')
ok(urlsDeLaFila('<div>sin videos</div>').length === 0, 'una fila sin video no inventa URLs')

// EL CAMPO. Emparejar bien no sirve de nada si el runner no encuentra donde poner el
// video: la corrida de Conoce Purina llego hasta aca y freno con "No encontre el campo
// (undefined)" porque el mapping declaraba el kind y se olvidaba del selector. Un campo
// sin `sel` es un error del mapping y tiene que verse al CARGARLO, no con Drupal abierto y
// la pagina a medio armar.
const M = loadMapping('mapping/purina-latam.json')
const video = M.paragraphs.types.c_externalvideo.fields.field_c_external_video
ok(video.kind === 'mediaLibrary', 'el video externo es un media library widget, no un inline entity form')
const campo = resolveSelector(video.sel, { dsel: resolveSelector(M.paragraphs.dsel, { delta: 1 }) })
ok(campo === '[data-drupal-selector="edit-field-ln-n-components-1-subform-field-c-external-video-wrapper"]',
  `el selector del campo resuelve al wrapper del widget (${campo})`)

// Y el motivo de fondo: que ningun otro campo se quede sin selector sin que nadie se entere.
const roto = JSON.parse(readFileSync('mapping/purina-latam.json', 'utf8'))
delete roto.paragraphs.types.c_externalvideo.fields.field_c_external_video.sel
writeFileSync(TMP, JSON.stringify(roto))
let freno = ''
try { loadMapping(TMP) } catch (e) { freno = e.message }
unlinkSync(TMP)
ok(/field_c_external_video/.test(freno) && /sel/.test(freno),
  `cargar un mapping con un campo sin "sel" frena y dice cual (${freno.slice(0, 90) || 'no freno'})`)

process.stdout.write(fallas ? `\n${fallas} falla/s\n` : '\nTodo bien.\n')
process.exit(fallas ? 1 : 0)

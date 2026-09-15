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
import { idDeVideo, mismoVideo, urlsDeLaFila } from '../src/mediaLibrary.js'

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

process.stdout.write(fallas ? `\n${fallas} falla/s\n` : '\nTodo bien.\n')
process.exit(fallas ? 1 : 0)

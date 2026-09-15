// Prueba la TRADUCCION hub -> manifiesto, sin base y sin navegador.
//
// Lo que verifica no es que "salga un JSON": es que cada machine name que emite EXISTA en
// el mapping real, y que las tres traducciones que no son cambiar un nombre esten bien:
//   - las cards de un Card Grid (campo repetible en el hub) se vuelven paragraphs hijos;
//   - Classy y Avanzado se prefijan solos, sin una segunda lista escrita a mano;
//   - las imagenes viajan por NOMBRE de medio, no por URL: el runner elige de la Media
//     library, no sube, y el nombre lo calcula la misma funcion que uso el recortador.
// Y que FRENE ante lo que no sabe, en vez de dejar pasar un manifiesto a medias.
import { aManifiesto, ErrorDeTraduccion, SIN_DESTINO } from '../tools/traducir.js'
import { nombreDeMedio, mediosDeBloque, archivosDeBloque, archivoDe } from '../tools/medios.js'
import { planDelHub, rutaDeImagen } from '../tools/paginas.js'
import { loadMapping } from '../src/mapping.js'
import { validateManifest } from '../src/manifest.js'

const tipos = loadMapping('mapping/purina-latam.json').paragraphs.types
let fallas = 0
const ok = (cond, que) => {
  process.stdout.write(`${cond ? '  ok  ' : '  FALLA '}${que}\n`)
  if (!cond) fallas += 1
}

const PAGINA = { name: 'Pagina de prueba', path: '/prueba' }
const BLOQUES = [
  // El breadcrumb NO es un paragraph del CMS: tiene que desaparecer, avisando.
  { component_key: 'breadcrumb', content: { items: [{ label: 'Inicio', url: '/' }] } },
  { component_key: 'banner', content: {
    type: 'title-description', title: 'Un titular', title_tag: 'h1',
    description: 'La bajada.', banner_align: 'banner_left_center',
    image: 'https://ejemplo.com/foto.png',
  } },
  { component_key: 'card_grid', content: {
    view_mode: 'slider-default-card', card_style_card: 'card_grid_default_square',
    title: 'Las cards', title_tag: 'h2',
    items: [
      { title: 'Card uno', title_tag: 'h3', description: 'Texto.',
        image: 'https://ejemplo.com/card.png', cta_label: 'Leer mas', cta_url: '/una' },
      // Texto de boton sin destino: el CMS NO deja guardar asi.
      { title: 'Card dos', title_tag: 'h3', description: 'Otro texto.', cta_label: 'Leer mas' },
    ],
  } },
  { component_key: 'text', content: {
    body: 'Cuerpo del bloque.', title: 'Con dos botones', title_tag: 'h2',
    ctas: [{ label: 'Uno', url: '/uno' }, { label: 'Dos', url: '/dos' }],
  } },
  // El video con su PORTADA: la portada no es un medio, es un campo del medio del video.
  { component_key: 'external_video', content: {
    title: 'Mira el video', video_url: 'https://www.youtube.com/watch?v=3-COT6aQbPo',
    thumb: 'https://ejemplo.com/portada.png', thumb_alt: 'Un gato comiendo',
  } },
]

const { manifiesto, avisos, pendientes } = aManifiesto(PAGINA, BLOQUES, tipos)

validateManifest(manifiesto, '(prueba)')
ok(true, 'el manifiesto pasa el validador del runner')
ok(manifiesto.page.published === false, 'la pagina sale como BORRADOR (regla de la casa)')

const tiposEmitidos = manifiesto.blocks.map((b) => b.type)
ok(!tiposEmitidos.includes('breadcrumb'), 'el breadcrumb no viaja al CMS')
ok(avisos.some((a) => /breadcrumb/.test(a)), 'y se avisa que se omitio, en vez de desaparecer callado')
ok(tiposEmitidos.join() === 'banner,ln_c_cardgrid,c_text,c_externalvideo',
  `los otros cuatro se tradujeron a sus paragraphs (fueron ${tiposEmitidos.join()})`)

const banner = manifiesto.blocks[0]
ok(banner.fields.field_html === 'La bajada.',
  'la bajada del banner va a field_html, que NO es el field_c_text de los demas bloques')
ok(banner.fields['classy.banner_align'] === 'banner_left_center',
  'la alineacion se prefijo sola como classy., sin una lista escrita a mano')
ok(!JSON.stringify(banner.fields).includes('ejemplo.com'),
  'la URL de la imagen NO viaja al CMS')
ok(banner.fields.field_c_image === nombreDeMedio({ slug: 'prueba', componente: 'banner', campo: 'image', origen: 'https://ejemplo.com/foto.png' }),
  `viaja el NOMBRE del medio, calculado igual que en el recortador (${banner.fields.field_c_image})`)
ok(!('field_c_image' in Object.fromEntries(Object.entries(banner.fields).filter(([k]) => k.includes('mobile')))),
  'y el mobile NO va aparte: en el CMS es UNA entidad con las dos imagenes adentro')
ok(pendientes.some((p) => p.url.includes('foto.png') && p.medio),
  'y queda listado como pendiente, para poder avisar si todavia no se subio')

const grid = manifiesto.blocks[1]
ok(grid.children?.length === 2, `las 2 cards se volvieron paragraphs hijos (fueron ${grid.children?.length})`)
ok(grid.children.every((c) => c.type === 'ln_c_grid_card_item' && c.slot === 0),
  'del tipo Card Grid Item, en la ranura de Cards')
ok(grid.children[0].fields['field_c_link.uri'] === '/una',
  'la card se llevo su link, que en la card es plano y no una lista')
ok(grid.fields['classy.card_style_card'] === 'card_grid_default_square',
  'el estilo de card (lo que la hace apaisada) llego al CMS')

ok(manifiesto.blocks[2].fields['field_c_link.title'] === 'Uno', 'del bloque de texto viaja el primer boton')
ok(avisos.some((a) => /boton\/es mas/.test(a)),
  'y se avisa del segundo, que el mapping no puede direccionar — no se pierde en silencio')

// Drupal valida el link ENTERO: texto sin URI no deja guardar la pagina, y te enteras
// recien al apretar Guardar con todo cargado. Paso de verdad con la card "Purina Cuida".
ok(grid.children[1].fields['field_c_link.uri'] === SIN_DESTINO,
  `un boton con texto y sin destino sale con "${SIN_DESTINO}", que el CMS si acepta`)
ok(avisos.some((a) => /no tiene destino/.test(a)),
  'y queda avisado, porque hay que completarlo — no es una solucion, es que se pueda guardar')

// EL CIERRE ENTRE LAS DOS HERRAMIENTAS. El recortador nombra los archivos que sube, y el
// traductor escribe el nombre que el runner va a BUSCAR en la libreria. Si no calculan
// igual, el runner frena con el navegador abierto por un medio que no aparece — y eso no
// lo ve ningun test que mire una sola de las dos. Aca se corren las DOS sobre la misma
// pagina y se comparan los nombres.
//
// Paso de verdad con las cards: el recortador las nombraba con el bloque (`card_grid`) y
// el traductor con el paragraph hijo (`card_grid_item`), que es lo que son en el CMS.
const recortados = new Set()
for (const b of BLOQUES.map(planDelHub)) {
  for (const m of mediosDeBloque(b, 'prueba')) recortados.add(m.nombre)
}
const pedidos = pendientes.map((p) => p.medio)
const sinRecortar = pedidos.filter((m) => !recortados.has(m))
ok(pedidos.length >= 2, `el traductor pide ${pedidos.length} medios (banner y card)`)
ok(recortados.size >= 2, `el recortador nombra ${recortados.size} medios sobre la misma pagina`)
ok(sinRecortar.length === 0,
  `todos los medios que pide el traductor los nombra igual el recortador${sinRecortar.length ? ` (no: ${sinRecortar.join(', ')})` : ''}`)

// LA PORTADA DEL VIDEO. No es un medio: es un campo del MEDIO del video, que se sube
// adentro del mismo formulario donde se pega la URL. Asi que no viaja por nombre de
// libreria sino por RUTA del archivo recortado, pegada al campo del video — y no tiene
// que aparecer ni en los pendientes ni entre los medios que el recortador nombra, porque
// `subir-medios` no la sube.
const video = manifiesto.blocks[3]
const campoVideo = video.fields.field_c_external_video
ok(campoVideo?.url === 'https://www.youtube.com/watch?v=3-COT6aQbPo',
  'el link del video sigue siendo el link del video')
ok(campoVideo?.thumb?.alt === 'Un gato comiendo', 'y se lleva el alt de la portada, que en este CMS es obligatorio')

const bloqueVideo = planDelHub(BLOQUES[4])
const [portada] = archivosDeBloque(bloqueVideo, 'prueba')
ok(campoVideo?.thumb?.archivo === rutaDeImagen('prueba', archivoDe(portada)),
  `la ruta que pide el manifiesto es la MISMA que escribe el recortador (${campoVideo?.thumb?.archivo})`)
ok(portada.w === 2784 && portada.h === 1566,
  `la portada se recorta a la medida del playbook del CMS (${portada.w}×${portada.h})`)
ok(!mediosDeBloque(bloqueVideo, 'prueba').length,
  'y NO se enumera como medio: seria una entidad de la libreria que nadie referencia')
ok(!pendientes.some((p) => p.url.includes('portada.png')),
  'ni queda como pendiente de subir: la sube el armado, no subir-medios')

// Sin link del video no hay medio que crear, asi que la portada no tiene donde ir.
{
  const solaLaPortada = [{ component_key: 'external_video', content: { thumb: 'https://ejemplo.com/portada.png' } }]
  const r = aManifiesto(PAGINA, solaLaPortada, tipos)
  ok(r.avisos.some((a) => /portada/.test(a)),
    'una portada sin link de video avisa en vez de perderse callada')
}

// SIN PORTADA CARGADA SE BAJA LA DE YOUTUBE. Es el caso normal — nadie carga una — y sin
// ella el CMS deja el video con el cuadro vacio. El mercado sigue pudiendo cargar la suya,
// y entonces manda la suya.
{
  const soloElLink = [{ component_key: 'external_video', content: {
    video_url: 'https://www.youtube.com/watch?v=3-COT6aQbPo',
  } }]
  const r = aManifiesto(PAGINA, soloElLink, tipos)
  const campo = r.manifiesto.blocks[0].fields.field_c_external_video
  ok(!!campo?.thumb?.archivo, 'un video sin portada cargada igual viaja con una')
  const [auto] = archivosDeBloque(planDelHub(soloElLink[0]), 'prueba')
  ok(auto.origen === 'https://img.youtube.com/vi/3-COT6aQbPo/maxresdefault.jpg',
    'que sale de YouTube en la mejor calidad que publica')
  ok(auto.alternativas.length === 2 && auto.derivada,
    'con su respaldo por si ese video no tiene maxresdefault')
  ok(auto.w === null && auto.ratio === 16 / 9,
    'y se recorta a 16:9 sin agrandarla: estirar 1280 hasta 2784 no agrega informacion')
  ok(campo.thumb.archivo === rutaDeImagen('prueba', archivoDe(auto)),
    'y la ruta sigue siendo la misma que escribe el recortador')
  // Viaja marcada porque manda una decision: si YouTube no contesta, una portada que el
  // runner se consiguio solo no puede tirar abajo la pagina entera.
  ok(campo.thumb.derivada === true, 'y va marcada como derivada, no como un dato de la pagina')

  // Lo cargado a mano gana: la derivada es un relleno, no una imposicion.
  const conLaSuya = [{ component_key: 'external_video', content: {
    video_url: 'https://www.youtube.com/watch?v=3-COT6aQbPo',
    thumb: 'https://ejemplo.com/la-mia.png',
  } }]
  const [propia] = archivosDeBloque(planDelHub(conLaSuya[0]), 'prueba')
  ok(propia.origen === 'https://ejemplo.com/la-mia.png' && !propia.derivada,
    'si el mercado carga una portada, manda la suya y no se baja nada')
  ok(propia.w === 2784 && propia.h === 1566,
    `y esa si va a la medida que pide el CMS (${propia.w}×${propia.h})`)
}

// TODO machine name emitido tiene que existir en el mapping. Es lo que evita descubrir
// un nombre mal escrito recien con el navegador abierto.
let malos = 0
const revisar = (bs) => bs.forEach((b) => {
  for (const f of Object.keys(b.fields || {})) if (!(f in (tipos[b.type]?.fields || {}))) malos += 1
  if (b.children) revisar(b.children)
})
revisar(manifiesto.blocks)
ok(malos === 0, `los ${countFields(manifiesto.blocks)} campos emitidos existen en el mapping (${malos} no)`)

function countFields(bs) {
  return bs.reduce((n, b) => n + Object.keys(b.fields || {}).length + countFields(b.children || []), 0)
}

// Y que FRENE. Un componente sin traduccion y un campo cargado que no sabe donde poner.
const frena = (bloques, que) => {
  try { aManifiesto(PAGINA, bloques, tipos); ok(false, `${que} — NO freno`) }
  catch (e) { ok(e instanceof ErrorDeTraduccion, `${que} — freno: ${e.message.slice(0, 70)}...`) }
}
frena([{ component_key: 'timeline', content: { title: 'x' } }],
  'un componente que no sabe traducir')
frena([{ component_key: 'banner', content: { title: 'x', campo_inventado: 'con valor' } }],
  'un campo cargado que no sabe a donde va')

process.stdout.write(fallas ? `\n${fallas} falla/s\n` : '\nTodo bien.\n')
process.exit(fallas ? 1 : 0)

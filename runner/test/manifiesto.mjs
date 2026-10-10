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

const PAGINA = { name: 'Pagina de prueba', path: '/prueba', brand: 'Pro Plan' }
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
ok(manifiesto.page.published === true, 'la pagina sale PUBLICADA (regla de content, ver CRITERIOS.md)')
ok(manifiesto.page.brand === (PAGINA.brand || null), `la marca de la pagina viaja al manifiesto (${manifiesto.page.brand})`)

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

const frena = (bloques, que) => {
  try { aManifiesto(PAGINA, bloques, tipos); ok(false, `${que} — NO freno`) }
  catch (e) { ok(e instanceof ErrorDeTraduccion, `${que} — freno: ${e.message.slice(0, 70)}...`) }
}

// TEXTO + IMAGEN. La posicion de la imagen es un select nuestro (Izquierda / Derecha) y en
// el CMS es un select de Classy cuyos valores de maquina salen del formulario real. La
// equivalencia vive en el mapping (`opciones` del campo); sin ella, frena.
{
  const bloque = { component_key: 'text_image', content: {
    title: 'Testimonio real', title_tag: 'h3', body: 'Un texto.',
    image: 'https://ejemplo.com/testimonio.jpg', image_position: 'Derecha',
    cta_label: 'Ver mas', cta_url: '/mas',
  } }
  const campoPos = 'classy.dsu_c_sideimagetext_image_position'
  const sinOpciones = !tipos.c_sideimagetext.fields[campoPos].opciones

  if (sinOpciones) {
    try { aManifiesto(PAGINA, [bloque], tipos); ok(false, 'texto + imagen sin opciones confirmadas — NO freno') }
    catch (e) {
      ok(e instanceof ErrorDeTraduccion && /opciones/.test(e.message),
        'sin las opciones de la posicion en el mapping, frena en vez de mandar "Derecha" a ciegas')
    }
  }

  // Con la tabla puesta (valores DE PRUEBA, no los del sitio): se traduce entero.
  const conOpciones = structuredClone(tipos)
  conOpciones.c_sideimagetext.fields[campoPos].opciones = { Izquierda: 'prueba-izq', Derecha: 'prueba-der' }
  const r = aManifiesto(PAGINA, [bloque], conOpciones)
  const ti = r.manifiesto.blocks[0]
  ok(ti.type === 'c_sideimagetext', 'el Texto + Imagen va al paragraph c_sideimagetext')
  ok(ti.fields[campoPos] === 'prueba-der', 'la posicion viaja con el valor de maquina de la tabla, no con "Derecha"')
  ok(ti.fields.field_c_text === 'Un texto.' && ti.fields['field_c_link.uri'] === '/mas',
    'se lleva el cuerpo y su link suelto')
  ok(Object.keys(ti.fields).every((f) => f in tipos.c_sideimagetext.fields),
    'todos sus campos existen en el mapping real')
  const nombres = new Set(mediosDeBloque(planDelHub(bloque), 'prueba').map((m) => m.nombre))
  ok(nombres.has(ti.fields.field_c_image),
    `su imagen se nombra igual que en el recortador (${ti.fields.field_c_image})`)

  try {
    aManifiesto(PAGINA, [{ ...bloque, content: { ...bloque.content, image_position: 'Arriba' } }], conOpciones)
    ok(false, 'una posicion que no esta en la tabla — NO freno')
  } catch (e) { ok(e instanceof ErrorDeTraduccion, 'una posicion que no esta en la tabla frena') }

  const sinPos = { ...bloque, content: { ...bloque.content } }
  delete sinPos.content.image_position
  ok(aManifiesto(PAGINA, [sinPos], tipos).manifiesto.blocks[0].type === 'c_sideimagetext',
    'sin posicion cargada no hace falta la tabla')
}

// CONTENEDORES. El layout de 2 columnas manda cada hijo a su columna (el tab_index del hub
// es el indice de columna). Las pestañas se arman en TRES niveles: el Tabs, un Tab por
// pestaña y UN componente adentro de cada Tab.
{
  const layout = { component_key: 'layout_columns_2', content: { spacing: 'space_py_0' }, hijos: [
    { component_key: 'text', content: { body: 'Izquierda.' }, tab_index: 0 },
    { component_key: 'text', content: { body: 'Derecha.' }, tab_index: 1 },
  ] }
  const lay = aManifiesto(PAGINA, [layout], tipos).manifiesto.blocks[0]
  ok(lay.type === 'layout_columns_2' && lay.children?.length === 2, 'el layout de 2 columnas lleva sus dos hijos')
  ok(lay.children[0].slot === 0 && lay.children[1].slot === 1, 'cada hijo en su columna')
  ok(lay.fields['classy.spacing'] === 'space_py_0', 'su Classy se prefija solo')

  const tabs = { component_key: 'tabs', content: { tabs: [{ label: 'Perros', description: 'Para perros.' }, { label: 'Gatos' }] }, hijos: [
    { component_key: 'text', content: { body: 'Uno.' }, tab_index: 0 },
    { component_key: 'text', content: { body: 'Dos.' }, tab_index: 1 },
  ] }
  const tb = aManifiesto(PAGINA, [tabs], tipos).manifiesto.blocks[0]
  ok(tb.type === 'comp_tabs' && tb.children?.length === 2, 'las pestañas son un Tabs con un Tab por pestaña')
  ok(tb.children.every((c) => c.type === 'comp_tabs_tab_item' && c.slot === 0), 'cada pestaña es un comp_tabs_tab_item')
  ok(tb.children[0].fields.field_title === 'Perros' && tb.children[0].fields.field_description === 'Para perros.',
    'con su nombre y su descripcion')
  ok(tb.children[1].children?.[0]?.type === 'c_text' && tb.children[1].children[0].fields.field_c_text === 'Dos.',
    'y el componente de cada pestaña ADENTRO de su Tab')
  let valido = true
  try { validateManifest(aManifiesto(PAGINA, [tabs, layout], tipos).manifiesto, '(contenedores)') } catch { valido = false }
  ok(valido, 'el manifiesto con contenedores pasa el validador del runner')

  // Una pestaña borrada no pierde sus hijos: caen en la ultima.
  const huerfano = { ...tabs, hijos: [...tabs.hijos.slice(0, 1), { component_key: 'text', content: { body: 'Tres.' }, tab_index: 5 }] }
  const th = aManifiesto(PAGINA, [huerfano], tipos).manifiesto.blocks[0]
  ok(th.children[1].children?.[0]?.fields.field_c_text === 'Tres.', 'un hijo de una pestaña borrada cae en la ultima')

  frena([{ ...tabs, hijos: [...tabs.hijos, { component_key: 'text', content: { body: 'Otro.' }, tab_index: 0 }] }],
    'dos componentes en una pestaña (el CMS acepta UNO)')
  frena([{ ...tabs, hijos: [{ component_key: 'accordion_grid', content: { items: [{ title: 'x', text: 'y' }] }, tab_index: 0 }] }],
    'un acordeon adentro de una pestaña (el CMS no lo admite)')
  // El Tabs del CMS no tiene titulo: el del hub va a un bloque de Texto justo antes.
  const conTitulo = aManifiesto(PAGINA, [{ ...tabs, content: { ...tabs.content, title: 'Nuestras marcas', title_tag: 'h2', subtitle: 'Bajada.' } }], tipos).manifiesto.blocks
  ok(conTitulo.length === 2 && conTitulo[0].type === 'c_text' && conTitulo[1].type === 'comp_tabs',
    'el titulo de las pestañas va en un Texto ANTES del Tabs')
  ok(conTitulo[0].fields.field_c_advanced_title === 'Nuestras marcas' && conTitulo[0].fields['field_c_advanced_title.html_tag'] === 'h2'
    && conTitulo[0].fields.field_c_text === 'Bajada.', 'con su titulo, su tag y la bajada como cuerpo')
}

// EL CARRUSEL DE PRODUCTOS = Block "Selected Product" en Carousel, con muestras de la marca.
{
  const muestras = loadMapping('mapping/purina-latam.json').productosMuestra
  const pl = { component_key: 'product_list', content: {
    title: 'Explora', title_tag: 'h2', subtitle: 'Bajada', show_petid: true, show_filters: true, filters: 'Seco, Húmedo',
    show_left_image: true, left_image: 'https://ejemplo.com/izq.jpg', see_more_text: 'Ver todos',
    products: [{ title: 'Uno' }, { title: 'Dos' }],
  } }
  const r = aManifiesto({ ...PAGINA, brand: 'Dog Chow' }, [pl], tipos, { productosMuestra: muestras })
  const b = r.manifiesto.blocks[0]
  ok(b.type === 'block', 'el carrusel de productos es un paragraph Block')
  const orden = Object.keys(b.fields)
  ok(orden[0] === 'field_block.plugin' && b.fields['field_block.plugin'] === 'pl_product_selected_product_block',
    'el bloque "Selected Product" va PRIMERO (recarga el formulario)')
  ok(b.fields['field_block.display'] === 'carousel', 'en Carousel')
  ok(Array.isArray(b.fields['field_block.productos']) && b.fields['field_block.productos'].length === 2
    && b.fields['field_block.productos'].every((x) => muestras['Dog Chow'].includes(x)), 'tantos productos como tenia, de MUESTRA y de la misma marca')
  ok(b.fields.field_background_image && r.pendientes.some((p) => p.campo === 'left_image'), 'la imagen izquierda va a field_background_image')
  ok(b.fields['advanced.include_see_more_button'] === true && b.fields['advanced.see_more_uri'] === '#',
    'el "Ver todos" sin destino va con # (y se avisa)')
  ok(!Object.keys(b.fields).some((k) => /pet|filter/i.test(k)), 'sin Pet ID ni pestañas de filtro')
  ok(r.avisos.some((a) => /MUESTRA/.test(a)) && r.avisos.some((a) => /Pet ID/.test(a)), 'avisa las muestras y lo que saca')
}

// LA LINEA DE TIEMPO = History Grid, un hito por item con año, imagen, titulo y cuerpo.
{
  const tl = { component_key: 'timeline', content: { title: 'Historia', subtitle: 'Bajada',
    items: [{ year: '1894', title: 'Inicio', description: 'Texto.', image: 'https://ejemplo.com/h.jpg' }] } }
  const b = aManifiesto(PAGINA, [tl], tipos).manifiesto.blocks[0]
  ok(b.type === 'history_grid' && b.children?.[0]?.type === 'history_grid_item', 'la linea de tiempo es un History Grid con sus hitos')
  ok(b.children[0].fields.field_history_year === '1894' && b.children[0].fields.field_c_image, 'cada hito con su año y su imagen')
}

// Sin medida mobile en el catalogo (el c_image con la imagen abajo), la foto mobile PROPIA del
// hub va tal cual; antes se repetia la de desktop.
{
  const ci = { component_key: 'content_image', content: { title: 'x', image_position: 'image_bottom',
    image: 'https://ejemplo.com/d.jpg', image_mobile: 'https://ejemplo.com/m.jpg' } }
  const [m] = mediosDeBloque(planDelHub(ci), 'prueba')
  ok(m && m.mobile?.origen === 'https://ejemplo.com/m.jpg' && m.mobile.w === null,
    'la imagen mobile del hub se usa aunque el componente no declare medida mobile')
  const [s] = mediosDeBloque(planDelHub({ ...ci, content: { ...ci.content, image_mobile: undefined } }), 'prueba')
  ok(s && s.mobile === null, 'sin foto mobile en el hub, se sigue repitiendo la de desktop')
}

// LA PAGINA DE PRODUCTOS: filtro por mascota + listado de la marca, dos Block como los de F5.
{
  const r = aManifiesto(PAGINA, [
    { component_key: 'product_filter', content: { title: 'Descubre productos según mascota' } },
    { component_key: 'product_grid', content: {} },
  ], tipos)
  const [f, g] = r.manifiesto.blocks
  ok(f.type === 'block' && f.fields['field_block.plugin'] === 'pl_base_pet_type_url_filter_block'
    && f.fields['field_block.query_name'] === 'pettype' && f.fields['field_block.filtro_titulo'] === 'Descubre productos según mascota',
    'el filtro por mascota es el Block del filtro, con su titulo')
  ok(g.type === 'block' && g.fields['field_block.plugin'] === 'views_block:products_search-product_results_block_cont_brand'
    && g.fields['field_block.items_per_page'] === '20', 'el listado es el Block de productos de la marca, 20 por pagina')
}

// EL BUSCADOR CON IA del hero viaja al CMS (va en todas las homes de marca); Pet ID no.
{
  const r = aManifiesto(PAGINA, [{ component_key: 'banner', content: { title: 'x', show_search: true, search_fixed_mobile: true } }], tipos)
  const f = r.manifiesto.blocks[0].fields
  ok(f.field_show_search === true && f.field_search_ai_pos_fixed_mob === true, 'el buscador con IA del banner viaja al CMS')
}

// Y que FRENE. Un componente sin traduccion y un campo cargado que no sabe donde poner.
frena([{ component_key: 'species_selector', content: { title: 'x' } }],
  'un componente que no sabe traducir')
frena([{ component_key: 'banner', content: { title: 'x', campo_inventado: 'con valor' } }],
  'un campo cargado que no sabe a donde va')

process.stdout.write(fallas ? `\n${fallas} falla/s\n` : '\nTodo bien.\n')
process.exit(fallas ? 1 : 0)

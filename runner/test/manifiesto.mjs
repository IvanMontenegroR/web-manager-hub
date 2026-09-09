// Prueba la TRADUCCION hub -> manifiesto, sin base y sin navegador.
//
// Lo que verifica no es que "salga un JSON": es que cada machine name que emite EXISTA en
// el mapping real, y que las tres traducciones que no son cambiar un nombre esten bien:
//   - las cards de un Card Grid (campo repetible en el hub) se vuelven paragraphs hijos;
//   - Classy y Avanzado se prefijan solos, sin una segunda lista escrita a mano;
//   - las imagenes NO viajan: el runner elige de la Media library, no sube.
// Y que FRENE ante lo que no sabe, en vez de dejar pasar un manifiesto a medias.
import { aManifiesto, ErrorDeTraduccion } from '../tools/traducir.js'
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
      { title: 'Card dos', title_tag: 'h3', description: 'Otro texto.' },
    ],
  } },
  { component_key: 'text', content: {
    body: 'Cuerpo del bloque.', title: 'Con dos botones', title_tag: 'h2',
    ctas: [{ label: 'Uno', url: '/uno' }, { label: 'Dos', url: '/dos' }],
  } },
]

const { manifiesto, avisos, pendientes } = aManifiesto(PAGINA, BLOQUES, tipos)

validateManifest(manifiesto, '(prueba)')
ok(true, 'el manifiesto pasa el validador del runner')
ok(manifiesto.page.published === false, 'la pagina sale como BORRADOR (regla de la casa)')

const tiposEmitidos = manifiesto.blocks.map((b) => b.type)
ok(!tiposEmitidos.includes('breadcrumb'), 'el breadcrumb no viaja al CMS')
ok(avisos.some((a) => /breadcrumb/.test(a)), 'y se avisa que se omitio, en vez de desaparecer callado')
ok(tiposEmitidos.join() === 'banner,ln_c_cardgrid,c_text',
  `los otros tres se tradujeron a sus paragraphs (fueron ${tiposEmitidos.join()})`)

const banner = manifiesto.blocks[0]
ok(banner.fields.field_html === 'La bajada.',
  'la bajada del banner va a field_html, que NO es el field_c_text de los demas bloques')
ok(banner.fields['classy.banner_align'] === 'banner_left_center',
  'la alineacion se prefijo sola como classy., sin una lista escrita a mano')
ok(!JSON.stringify(banner.fields).includes('ejemplo.com'),
  'la imagen NO viaja en el manifiesto: el runner elige de la libreria, no sube')
ok(pendientes.some((p) => p.url.includes('foto.png')),
  'pero queda listada como pendiente de subir a la Media library')

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

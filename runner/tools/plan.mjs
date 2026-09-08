// BORRADOR del plan de una pagina: traduce la ESTRUCTURA leida del sitio viejo a los
// componentes del catalogo nuevo.
//
//   node tools/plan.mjs salida/paginas.jsonl planes/            # todas las leidas
//   node tools/plan.mjs salida/paginas.jsonl planes/ --url=...  # una sola
//
// QUE ES UN PLAN Y POR QUE EXISTE. Armar una pagina tiene dos mitades que no se parecen
// en nada:
//
//   MECANICO   leer el sitio viejo, recortar las imagenes, escribir las filas, y mas
//              adelante cargarlo en el CMS. Se automatiza y se automatiza entero.
//   CRITERIO   que componente, que variante, como se alinea el banner, que copy se
//              acorta, que se tira. NO se automatiza: depende de MIRAR la pagina.
//
// El plan es donde vive el criterio. Este script escribe un BORRADOR — la parte que sale
// sola — y marca en `revisar` todo lo que decidio a ciegas. Despues se corrige a mano (o
// con ayuda) y ese archivo corregido es el que alimenta a `imagenes.mjs` y `cargar.mjs`.
// Es la misma idea que el manifiesto del runner: un archivo declara QUE va, y las
// herramientas lo ejecutan sin opinar.
//
// LO QUE ESTE SCRIPT NO HACE, A PROPOSITO. No inventa el tipo de banner ni la alineacion
// ni acorta un texto largo. Pone un default razonable y lo FLAGEA. Un default silencioso
// es peor que ninguno: se cuela hasta produccion.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import {
  CARD_SQUARE, CARD_SQUARE_DESC_MAX, BT_SECONDARY_HERO, LAYOUT_COLUMNS,
} from '../../src/data/components.js'

const args = process.argv.slice(2)
const soloUrl = args.find((a) => a.startsWith('--url='))?.slice(6)
const [entrada, destino] = args.filter((a) => !a.startsWith('--'))
if (!entrada || !destino) {
  process.stderr.write('uso: node tools/plan.mjs <paginas.jsonl> <carpeta-planes> [--url=...]\n')
  process.exit(2)
}

const lim = (s, n = 600) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n)

// Las direcciones de imagen tienen que salir ABSOLUTAS: el que despues las baja y las
// recorta es otro proceso y una ruta relativa ahi no resuelve a nada. `estructura.js` ya
// las absolutiza, pero una extraccion vieja puede traerlas relativas.
const abs = (u, base) => { try { return new URL(u, base).href } catch { return u || '' } }

// El slug con el que se nombra el archivo del plan y la carpeta de imagenes.
function slugDe(url) {
  return new URL(url).pathname
    .replace(/^\/purina\//, '').replace(/^\/|\/$/g, '')
    .replace(/[^\w-]+/g, '-') || 'home'
}

// La ruta NUEVA. En el sitio nuevo se cae el prefijo /purina, que es lo unico que
// sabemos con certeza; el resto de la ruta se respeta. Si hay que cambiarla, se cambia
// en el plan — para eso es un archivo.
function rutaNueva(url) {
  const p = new URL(url).pathname.replace(/^\/purina(?=\/|$)/, '')
  return p.replace(/\/$/, '') || '/'
}

// ---------------------------------------------------------------------------------
// TRADUCCION de un bloque del sitio viejo a un componente del catalogo.
//
// Cada rama devuelve { componente, contenido, revisar[], hijos[] }. `revisar` es lo que
// despues baja a las notas de la pagina: son las decisiones que este script NO puede
// tomar bien y alguien tiene que mirar.

const layoutPorVariante = (v) => {
  // El sitio viejo se declara solo: `layout-columns-3`, `layout-33-66`, `layout-25-25-50`.
  const n = String(v || '').replace(/^layout-/, '')
  const directo = { 'columns-1': 'layout_columns_1', 'columns-2': 'layout_columns_2',
    'columns-3': 'layout_columns_3', 'columns-4': 'layout_columns_4' }[n]
  if (directo) return directo
  const key = 'layout_' + n.replace(/-/g, '_')
  return LAYOUT_COLUMNS.some((c) => c.key === key) ? key : null
}

function traducirBloque(b, ctx) {
  const revisar = []

  if (b.tipo === 'banner') {
    // El TIPO y la ALINEACION dependen de la imagen: de que tan alto es el banner y de
    // donde esta el sujeto en la foto (si el perro esta a la derecha, el texto va a la
    // izquierda). Ninguna de las dos se puede sacar del HTML, asi que van flageadas.
    const contenido = {
      type: BT_SECONDARY_HERO,
      title: lim(b.titulo, 200),
      // El primer banner de la pagina es el h1; los de mas abajo no.
      title_tag: ctx.primerBanner ? 'h1' : 'h2',
    }
    const bajada = (b.texto || []).filter(Boolean).join(' ')
    if (bajada) contenido.description = lim(bajada, 800)
    if (b.fondo?.desktop) contenido.image = abs(b.fondo.desktop, ctx.base)
    if (b.fondo?.mobile && b.fondo.mobile !== b.fondo.desktop) contenido.image_mobile = abs(b.fondo.mobile, ctx.base)
    revisar.push('BANNER: el tipo quedo en Secondary Hero por defecto. Mirar el alto real del banner en el sitio: si ocupa la pantalla entera es Main Hero.')
    revisar.push('BANNER: falta la ALINEACION (Banner Align Content). Se decide MIRANDO la foto: el texto va del lado contrario al sujeto.')
    if (!contenido.image) revisar.push('BANNER: no se encontro imagen de fondo. Si la pagina se leyo con una version vieja del extractor, volver a leerla.')
    return { componente: 'banner', contenido, revisar }
  }

  if (b.tipo === 'acordeon') {
    return { componente: 'accordion_grid', revisar, contenido: {
      items: (b.items || []).map((it) => ({
        title: lim(it.titulo, 200), title_tag: 'h3', text: lim(it.cuerpo, 1500),
      })),
    } }
  }

  if (b.tipo === 'carrusel' || b.tipo === 'card') {
    const slides = b.tipo === 'card' ? [b] : (b.slides || [])
    const items = slides.filter((s) => s.titulo || s.texto).map((s) => {
      const it = { title: lim(s.titulo, 120), title_tag: 'h3' }
      if (s.texto) it.description = lim(s.texto, 600)
      if (s.imagen?.src) it.image = abs(s.imagen.src, ctx.base)
      if (s.cta?.texto) it.cta_label = lim(s.cta.texto, 80)
      if (s.cta?.href) it.cta_url = s.cta.href
      return it
    })
    // La forma la decide el Card - Style Card, no el modo de vista. La apaisada es la
    // que se puede armar recortando fotos apaisadas; la vertical pide retrato, o sea
    // foto nueva. Sin evidencia de lo contrario, apaisada.
    const contenido = {
      view_mode: 'slider-default-card', card_style_card: CARD_SQUARE, items,
    }
    const largas = items.filter((i) => (i.description || '').length > CARD_SQUARE_DESC_MAX)
    if (largas.length) {
      revisar.push(`CARDS: ${largas.length} descripcion/es pasan los ${CARD_SQUARE_DESC_MAX} caracteres que muestra la card apaisada y se van a ver cortadas: ${largas.map((i) => `"${i.title}" (${i.description.length})`).join(', ')}. Hay que acortarlas o usar cards verticales.`)
    }
    if (items.some((i) => i.cta_label)) {
      revisar.push('CARDS: el sitio viejo tiene un boton con texto en las cards. NINGUN modo del Card Grid dibuja un boton: la card entera es el link y se marca con una flecha. El texto queda cargado igual, pero no se ve.')
    }
    return { componente: 'card_grid', contenido, revisar }
  }

  if (b.tipo === 'tabs') {
    const hijos = []
    ;(b.items || []).forEach((t, i) => {
      for (const hijo of (t.hijos || [])) {
        const tr = traducirBloque(hijo, ctx)
        if (tr) hijos.push({ ...tr, slot: i })
      }
    })
    // En el CMS una pestaña lleva UN componente. Si el sitio viejo mete varios, hay que
    // decidir como se agrupan: no lo puede decidir un script.
    for (const [i, t] of (b.items || []).entries()) {
      const n = hijos.filter((h) => h.slot === i).length
      if (n > 1) revisar.push(`PESTAÑAS: la pestaña "${t.titulo}" trae ${n} bloques y en el CMS una pestaña admite UNO solo. Hay que unirlos o repensar la pestaña.`)
    }
    return { componente: 'tabs', revisar, hijos, contenido: {
      tabs: (b.items || []).map((t) => ({ label: lim(t.titulo, 120) })),
    } }
  }

  if (b.tipo === 'columnas') {
    const key = layoutPorVariante(b.variante)
    if (!key) {
      revisar.push(`COLUMNAS: el sitio declara "${b.variante}" y no tenemos ese layout. Se dejo el contenido suelto, sin columnas.`)
      return { suelto: (b.columnas || []).flat().map((h) => traducirBloque(h, ctx)).filter(Boolean) }
    }
    const hijos = []
    ;(b.columnas || []).forEach((col, i) => {
      for (const hijo of col) {
        const tr = traducirBloque(hijo, ctx)
        if (tr) hijos.push({ ...tr, slot: i })
      }
    })
    return { componente: key, contenido: {}, revisar, hijos }
  }

  if (b.tipo === 'imagen') {
    // Una imagen sola con texto adentro suele merecer ser otra cosa (un banner, o texto
    // de verdad). No lo decide un script, pero si lo puede señalar: una imagen muy
    // apaisada es casi siempre una infografia con el texto quemado adentro.
    if (b.w && b.h && b.w / b.h > 3) {
      revisar.push(`IMAGEN: ${b.w}×${b.h} es una franja muy apaisada, tipico de una infografia con el texto adentro de la imagen. Eso no lo lee Google ni un lector de pantalla: conviene rehacerla como contenido.`)
    }
    return { componente: 'content_image', revisar, contenido: {
      image: abs(b.src, ctx.base), image_position: 'image_bottom',
    } }
  }

  if (b.tipo === 'texto') {
    if (!b.plano) return null
    return { componente: 'text', revisar, contenido: { body: lim(b.plano, 4000) } }
  }

  if (b.tipo === 'iframe') {
    const src = b.src || ''
    if (/youtube|youtu\.be|vimeo/.test(src)) {
      return { componente: 'external_video', revisar, contenido: { video_url: src } }
    }
    revisar.push(`IFRAME externo sin componente propio: ${src}. Puede ser un formulario (Qualifio) o un PDF; no se reconstruye desde el copy.`)
    return { componente: 'text', revisar, contenido: { body: `[PENDIENTE] Esta pagina embebe ${src}` } }
  }

  return null
}

// ---------------------------------------------------------------------------------
function planDe(d) {
  const ctx = { primerBanner: true, base: d.final || d.pedida }
  const bloques = []
  for (const b of (d.estructura || [])) {
    const tr = traducirBloque(b, ctx)
    if (!tr) continue
    if (b.tipo === 'banner') ctx.primerBanner = false
    // Una rama puede devolver varios bloques sueltos (ej. un layout que no tenemos).
    if (tr.suelto) bloques.push(...tr.suelto); else bloques.push(tr)
  }

  const revisar = []
  if (!d.estructura?.length) {
    revisar.push('Esta pagina se leyo SIN estructura (extractor viejo): el plan salio vacio o incompleto. Volver a correr tools/extraer.mjs.')
  }
  // Los h1 son de la pagina, no de un bloque: dos es un error de SEO que no hay razon
  // para arrastrar al sitio nuevo.
  if ((d.h1 || []).length > 1) {
    revisar.push(`SEO: el sitio viejo tiene ${d.h1.length} <h1> ("${d.h1.join('" / "')}"). En la pagina nueva tiene que quedar UNO: el segundo suele ir como bajada del banner.`)
  }
  for (const b of bloques) revisar.push(...(b.revisar || []))

  const url = d.final || d.pedida
  return {
    pagina: {
      name: lim((d.titulo || '').split('|')[0], 120) || slugDe(url),
      path: rutaNueva(url),
      market: 'MX',
      category: '',            // se completa a mano: la categoria del tracker
      status: 'In progress',
      url_old: d.pedida,
      url_new: rutaNueva(url),
    },
    revisar,
    bloques: bloques.map(({ revisar: _r, ...b }) => b),
  }
}

// ---------------------------------------------------------------------------------
const porUrl = new Map()
for (const l of readFileSync(entrada, 'utf8').split('\n')) {
  if (!l.trim()) continue
  try { const d = JSON.parse(l); if (!d.error) porUrl.set(d.pedida, d) } catch { /* linea a medias */ }
}

mkdirSync(resolve(destino), { recursive: true })
let n = 0, conRevisar = 0
for (const d of porUrl.values()) {
  if (soloUrl && d.pedida !== soloUrl) continue
  const plan = planDe(d)
  const archivo = join(resolve(destino), `${slugDe(d.final || d.pedida)}.json`)
  writeFileSync(archivo, JSON.stringify(plan, null, 2) + '\n', 'utf8')
  n += 1
  if (plan.revisar.length) conRevisar += 1
  process.stderr.write(`  ${plan.pagina.path}  ${plan.bloques.length} bloque/s`
    + (plan.revisar.length ? `  ${plan.revisar.length} a revisar` : '') + '\n')
}
process.stderr.write(`\n${n} plan/es en ${resolve(destino)}`
  + (conRevisar ? `; ${conRevisar} con cosas para mirar.\n` : '.\n')
  + 'Siguiente: revisar los planes, despues tools/imagenes.mjs y tools/cargar.mjs\n')

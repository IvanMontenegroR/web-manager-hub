// LA TRADUCCION: una pagina del hub -> un manifiesto del runner.
//
// Es una funcion PURA (no lee la base ni escribe archivos) para poder probarla contra
// paginas de mentira, sin Supabase y sin navegador. La entrada/salida la maneja
// tools/manifiesto.mjs.
//
// POR QUE HAY QUE TRADUCIR. El hub y el CMS hablan distinto a proposito. El hub habla en
// componentes ("card_grid", `title`, `description`) porque es lo que se lee al armar una
// pagina; el CMS habla en paragraphs y machine names ("ln_c_cardgrid",
// `field_c_advanced_title`, `field_html`). Los machine names salen del MAPPING, que se
// escribio volcando el formulario de verdad — no de memoria.
//
// Dos traducciones que no son cambiar un nombre:
//
//   LISTAS -> HIJOS. En el hub las cards de un Card Grid y los items de un acordeon son
//   un campo repetible: son los mismos datos con mucha menos maquinaria. En el CMS cada
//   uno es un paragraph hijo (`ln_c_grid_card_item`, `accordion_item`).
//
//   CLASSY y AVANZADO son mecanicos: el hub ya usa las MISMAS claves que el mapping
//   (`background_color`, `card_style_card`...), asi que van con el prefijo y listo.
//
// LAS IMAGENES NO VAN. Regla de la casa: el runner ELIGE de la Media library, nunca sube.
// El valor de un campo de imagen en el CMS es el NOMBRE del medio, y lo que hay en el hub
// son URLs. Se omiten y se devuelven como pendientes; la pagina se arma igual, con la
// estructura y TODO el texto, en borrador.
//
// FRENA ante lo que no sabe: un componente sin traduccion, un campo cargado que no sabe
// donde poner, o un machine name que el mapping no tiene. Un manifiesto a medias que
// parece completo es peor que uno que no se genero.
import { getComponent, G_CLASSY, G_ADV } from '../../src/data/components.js'

const T = {
  titulo: { title: 'field_c_advanced_title', title_tag: 'field_c_advanced_title.html_tag' },
  subtitulo: { subtitle: 'field_c_advanced_subtitle', subtitle_tag: 'field_c_advanced_subtitle.html_tag' },
  tamanos: { title_size: 'field_title_size', subtitle_size: 'field_subtitle_size' },
}

export const PARAGRAFOS = {
  // El breadcrumb no existe como paragraph: el sitio lo arma solo con la ruta del nodo.
  breadcrumb: { omitir: 'el sitio lo arma solo con la ruta del nodo, no es un paragraph' },

  banner: {
    tipo: 'banner',
    campos: {
      type: 'field_banner_type',
      remove_overlay: 'field_remover_overlay_background',
      ...T.titulo,
      // OJO: la bajada del banner NO es `field_c_text` como en los demas: es `field_html`.
      description: 'field_html',
      show_search: 'field_show_search',
      search_fixed_mobile: 'field_search_ai_pos_fixed_mob',
    },
    // En el CMS es UN Media que resuelve desktop y mobile solo; en el hub son dos campos
    // porque el mercado entrega los dos archivos.
    media: { image: 'field_c_image', image_mobile: null },
    ctas: 'field_c_link',
  },

  text: {
    tipo: 'c_text',
    campos: { body: 'field_c_text', ...T.titulo, ...T.subtitulo },
    ctas: 'field_c_link',
  },

  content_image: {
    tipo: 'c_image',
    campos: { body: 'field_c_text', ...T.titulo, ...T.subtitulo, ...T.tamanos },
    media: { image: 'field_c_image', image_alt: null, image_mobile: null, image_mobile_alt: null },
    ctas: 'field_c_link',
  },

  external_video: {
    tipo: 'c_externalvideo',
    campos: { ...T.titulo, video_url: 'field_c_external_video' },
  },

  card_grid: {
    tipo: 'ln_c_cardgrid',
    campos: {
      view_mode: 'field_c_cardgrid_view_mode',
      show_card_pet_id: 'field_show_card_pet_id',
      ...T.titulo, ...T.subtitulo, ...T.tamanos,
    },
    media: { background_image: 'field_media' },
    lista: { campo: 'items', como: 'card_grid_item', slot: 0 },
  },

  card_grid_item: {
    tipo: 'ln_c_grid_card_item',
    campos: {
      ...T.titulo, ...T.subtitulo,
      icon: 'field_icon', description: 'field_c_text', show_ia_icon: 'field_show_ia_icon',
      section_id: 'advanced.section_id', css_class: 'advanced.css_class',
      bg_color: 'classy.background_color',
    },
    media: { image: 'field_c_image', image_alt: null, image_mobile: null, image_mobile_alt: null },
    // La card tiene UN link suelto, no una lista.
    ctaPlano: { cta_label: 'field_c_link.title', cta_url: 'field_c_link.uri', cta_target: 'field_c_link.target' },
  },

  accordion_grid: {
    tipo: 'accordion_grid',
    campos: {},
    lista: { campo: 'items', como: 'accordion_item', slot: 0 },
  },

  accordion_item: {
    tipo: 'accordion_item',
    campos: {
      ...T.titulo, text: 'field_c_text',
      visibility: 'advanced.enable_visibility_control',
      section_id: 'advanced.section_id', css_class: 'advanced.css_class',
    },
  },
}

// Campos del hub que no viajan al CMS: los consume esta misma traduccion.
const SOLO_DEL_HUB = new Set(['items', 'ctas', 'tabs'])

// Las claves de Classy y Avanzado salen del CATALOGO, que usa las mismas que el mapping.
// Asi no hay una segunda lista escrita a mano que se pueda desincronizar.
const CLASSY = new Set()
const AVANZADO = new Set()
for (const componente of Object.keys(PARAGRAFOS)) {
  for (const f of (getComponent(componente)?.fields || [])) {
    if (f.group === G_CLASSY) CLASSY.add(f.key)
    if (f.group === G_ADV) AVANZADO.add(f.key)
  }
}

const vacio = (v) => v === undefined || v === null || v === '' ||
  (Array.isArray(v) && !v.length) ||
  (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length)

// Una imagen del hub es una URL, o el objeto que deja imagenes.mjs. Para esto son lo
// mismo: ninguna de las dos es un NOMBRE de medio, que es lo unico que el CMS acepta.
const urlDe = (v) => (typeof v === 'string' ? v : v?.origen || '')

export class ErrorDeTraduccion extends Error {}

/**
 * @param {{name?: string, path?: string}} pagina
 * @param {Array} bloques  arbol de componentes del hub ({component_key, content, hijos})
 * @param {{fields: object}} porTipo  mapping.paragraphs.types, para verificar los nombres
 */
export function aManifiesto(pagina, bloques, porTipo = null) {
  const pendientes = []
  const avisos = []
  const frenar = (msg) => { throw new ErrorDeTraduccion(msg) }

  // Si se le pasa el mapping, se comprueba que el machine name EXISTA. Un nombre mal
  // escrito frena aca y no a mitad de camino con el navegador abierto.
  const verificar = (tipo, campo, donde) => {
    if (!porTipo) return
    const t = porTipo[tipo]
    if (!t) frenar(`el mapping no tiene el paragraph "${tipo}" (${donde}). Correr \`npm run inspect\` y agregarlo.`)
    if (!(campo in t.fields)) {
      frenar(`el mapping de "${tipo}" no tiene el campo "${campo}" (${donde}). `
        + `O esta mal escrito en la tabla de traducir.js, o falta en el mapping.`)
    }
  }

  function traducir(componente, contenido, donde) {
    const def = PARAGRAFOS[componente]
    if (!def) {
      frenar(`no se como traducir el componente "${componente}" (${donde}). `
        + 'Falta su paragraph en el mapping, o su entrada en la tabla de traducir.js.')
    }
    if (def.omitir) { avisos.push(`${donde}: se omite el ${componente} — ${def.omitir}`); return null }

    const fields = {}
    const poner = (campo, valor) => { verificar(def.tipo, campo, donde); fields[campo] = valor }

    for (const [k, v] of Object.entries(contenido || {})) {
      if (vacio(v)) continue
      if (def.campos[k]) { poner(def.campos[k], v); continue }
      if (def.ctaPlano?.[k]) { poner(def.ctaPlano[k], v); continue }
      if (def.media && k in def.media) {
        const url = urlDe(v)
        if (url) pendientes.push({ donde, campo: k, destino: def.media[k], url })
        continue   // nunca va al manifiesto: el runner elige de la libreria, no sube
      }
      if (SOLO_DEL_HUB.has(k)) continue
      if (CLASSY.has(k)) { poner(`classy.${k}`, v); continue }
      if (AVANZADO.has(k)) { poner(`advanced.${k}`, v); continue }
      frenar(`el campo "${k}" de ${donde} (${componente}) tiene valor `
        + `${JSON.stringify(v).slice(0, 60)} y no se a que campo del CMS corresponde.`)
    }

    // `field_c_link` es multivaluado en el CMS, pero el mapping direcciona UNO. Se manda
    // el primero y los otros se avisan, en vez de perderlos en silencio.
    if (def.ctas && Array.isArray(contenido?.ctas) && contenido.ctas.length) {
      const [primero, ...resto] = contenido.ctas
      for (const [k, sufijo] of [['label', 'title'], ['url', 'uri'], ['target', 'target'],
        ['rel', 'rel'], ['aria_label', 'aria_label']]) {
        if (primero?.[k]) poner(`${def.ctas}.${sufijo}`, primero[k])
      }
      if (resto.length) {
        avisos.push(`${donde}: el bloque tiene ${resto.length} boton/es mas y el mapping direcciona `
          + `uno solo. Hay que agregarlos a mano: ${resto.map((c) => `"${c.label || c.url}"`).join(', ')}`)
      }
    }

    const bloque = { type: def.tipo, fields }
    const hijos = []
    if (def.lista) {
      for (const [i, item] of (contenido?.[def.lista.campo] || []).entries()) {
        const h = traducir(def.lista.como, item, `${donde} > item ${i + 1}`)
        if (h) hijos.push({ ...h, slot: def.lista.slot })
      }
    }
    if (hijos.length) bloque.children = hijos
    return bloque
  }

  const blocks = []
  for (const [i, b] of bloques.entries()) {
    const donde = `bloque ${i + 1}`
    const t = traducir(b.component_key, b.content, donde)
    if (!t) continue
    // Contenedores del hub (pestañas, layouts): sus hijos son componentes de verdad, y
    // su ranura sale del `tab_index`, que es el indice de slot.
    if (b.hijos?.length && !PARAGRAFOS[b.component_key]?.lista) {
      const dentro = b.hijos
        .map((h, j) => {
          const th = traducir(h.component_key, h.content, `${donde} > adentro ${j + 1}`)
          return th && { ...th, slot: h.tab_index ?? 0 }
        })
        .filter(Boolean)
      if (dentro.length) t.children = [...(t.children || []), ...dentro]
    }
    blocks.push(t)
  }

  return {
    manifiesto: {
      _: 'Generado por tools/manifiesto.mjs desde el hub. Las imagenes NO van aca: el runner '
        + 'ELIGE de la Media library, no sube. Ver la lista de pendientes que imprime la herramienta.',
      manifest: 1,
      page: { title: pagina.name, path: pagina.path, published: false },
      blocks,
    },
    avisos,
    pendientes,
  }
}

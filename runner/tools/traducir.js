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
// LAS IMAGENES VAN POR NOMBRE. El runner ELIGE de la Media library, no sube: el valor de
// un campo de imagen en el CMS es el NOMBRE del medio. Ese nombre se calcula con la misma
// funcion que uso `imagenes.mjs` al recortarlas (ver tools/medios.js), asi que las dos
// herramientas no se pueden separar.
//
// Un medio son DOS archivos (Image Desktop e Image Mobile) pero UNA entidad, asi que
// `image` y `image_mobile` del hub apuntan al mismo nombre y al CMS va uno solo.
//
// Los medios se devuelven ademas como `pendientes`, para poder avisar si todavia no se
// subieron: si falta uno, el runner frena al no encontrarlo en la libreria.
//
// FRENA ante lo que no sabe: un componente sin traduccion, un campo cargado que no sabe
// donde poner, o un machine name que el mapping no tiene. Un manifiesto a medias que
// parece completo es peor que uno que no se genero.
import { getComponent, G_CLASSY, G_ADV } from '../../src/data/components.js'
import { nombreDeMedio, campoBase, origenDe } from './medios.js'
import { slugDePagina } from './paginas.js'
import { PARAGRAFOS } from './paragrafos.js'

// Campos del hub que no viajan al CMS: los consume esta misma traduccion.
const SOLO_DEL_HUB = new Set(['items', 'ctas', 'tabs'])

// Destino de relleno para un boton que todavia no sabe a donde va. Es un ancla a la
// misma pagina: el CMS lo acepta y no lleva a ningun lado.
export const SIN_DESTINO = '#'

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

export class ErrorDeTraduccion extends Error {}

/**
 * @param {{name?: string, path?: string}} pagina
 * @param {Array} bloques  arbol de componentes del hub ({component_key, content, hijos})
 * @param {{fields: object}} porTipo  mapping.paragraphs.types, para verificar los nombres
 */
export function aManifiesto(pagina, bloques, porTipo = null) {
  // El slug es el de la pagina, el mismo que nombra el plan y la carpeta de imagenes.
  const slug = slugDePagina(pagina.path)
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
        const url = origenDe(v)
        // `def.media[k]` en null = ese campo del hub no tiene campo propio en el CMS
        // (el mobile vive dentro del mismo medio que el desktop). Se registra igual como
        // pendiente, pero no se escribe dos veces.
        if (url && def.media[k]) {
          const medio = nombreDeMedio({ slug, componente, campo: k, origen: url })
          poner(def.media[k], medio)
          pendientes.push({ donde, campo: campoBase(k), medio, url })
        }
        continue
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

    // UN LINK CON TEXTO Y SIN DESTINO NO SE PUEDE GUARDAR. Drupal valida el campo entero:
    // si `title` tiene algo y `uri` esta vacio, el formulario no deja guardar la pagina —
    // y lo descubris recien al apretar Guardar, con todo cargado.
    //
    // Pasa de verdad: una card que sabemos como se llama el boton pero todavia no a donde
    // va. Se pone "#", que es un ancla a la misma pagina — el CMS lo acepta, no lleva a
    // ningun lado y se ve en el contenido, asi que despues se encuentra para corregirlo.
    // Inventar una URL seria peor: quedaria un link roto que parece cargado.
    for (const base of [def.ctas, def.ctaPlano && 'field_c_link'].filter(Boolean)) {
      if (fields[`${base}.title`] && !fields[`${base}.uri`]) {
        poner(`${base}.uri`, SIN_DESTINO)
        avisos.push(`${donde}: el boton "${fields[`${base}.title`]}" no tiene destino. `
          + `Se pone "${SIN_DESTINO}" para que el CMS lo acepte — HAY QUE COMPLETARLO.`)
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

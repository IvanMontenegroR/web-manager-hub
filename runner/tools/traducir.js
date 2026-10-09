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
import { nombreDeMedio, campoBase, origenDe, archivosDeBloque, archivoDe } from './medios.js'
import { slugDePagina, rutaDeImagen } from './paginas.js'
import { PARAGRAFOS } from './paragrafos.js'

// Campos del hub que no viajan al CMS: los consume esta misma traduccion.
const SOLO_DEL_HUB = new Set(['items', 'ctas', 'tabs'])

// LO QUE NO VA EN EL LANZAMIENTO: no hay buscador con IA ni registro / inicio de sesion
// (Pet ID). Si el bloque lo tiene prendido en el hub, se descarta avisando: el CMS lo
// dejaria visible y no funcionaria.
const SIN_LANZAMIENTO = {
  show_search: 'el buscador con IA', search_fixed_mobile: 'el buscador con IA',
  search_suggestions: 'las sugerencias del buscador con IA',
  show_card_pet_id: 'la card Pet ID', show_petid: 'la card Pet ID',
}

// Destino de relleno para un boton que todavia no sabe a donde va. Es un ancla a la
// misma pagina: el CMS lo acepta y no lleva a ningun lado.
export const SIN_DESTINO = '#'

// Las claves de Classy y Avanzado salen del CATALOGO, que usa las mismas que el mapping.
// Asi no hay una segunda lista escrita a mano que se pueda desincronizar.
const CLASSY = new Set()
const AVANZADO = new Set()
// Los campos que son una imagen ADENTRO de otro medio (la portada del video). No tienen
// campo propio en el paragraph: viajan pegados al campo que crea ese medio, y por eso el
// recorrido de arriba los saltea en vez de frenar por no saber donde ponerlos.
const DENTRO_DE_UN_MEDIO = new Map()
for (const componente of Object.keys(PARAGRAFOS)) {
  const suyos = new Set()
  for (const f of (getComponent(componente)?.fields || [])) {
    if (f.group === G_CLASSY) CLASSY.add(f.key)
    if (f.group === G_ADV) AVANZADO.add(f.key)
    if (f.insideMedia) { suyos.add(f.key); suyos.add(`${f.key}_alt`) }
  }
  if (suyos.size) DENTRO_DE_UN_MEDIO.set(componente, suyos)
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
export function aManifiesto(pagina, bloques, porTipo = null, { productosMuestra = null } = {}) {
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

  // Un select cuyo valor en el hub NO es el valor de maquina del CMS (la posicion de la
  // imagen del Texto + Imagen: "Izquierda" en el hub). La equivalencia es de ESTE sitio,
  // asi que vive en el mapping, en `opciones` del campo, y sale del volcado del
  // formulario. Si no esta, o no trae ese valor, se frena: mandar "Izquierda" a un select
  // que espera otra cosa es un valor inventado, y el orden por defecto del CMS dejaria la
  // imagen del lado que no era sin que nadie se entere.
  function valorDelCms(def, k, v, donde) {
    if (!def.conOpciones?.includes(k) || !porTipo) return v
    const campo = def.campos[k]
    const opciones = porTipo[def.tipo]?.fields?.[campo]?.opciones
    if (!opciones) {
      frenar(`${donde}: el mapping no tiene confirmadas las opciones de "${campo}" (${def.tipo}). `
        + 'Agregá `opciones` a ese campo en el mapping, con el valor del hub y el de maquina '
        + 'del CMS, sacados del volcado del formulario (npm run inspect).')
    }
    if (!(v in opciones)) {
      frenar(`${donde}: "${v}" no esta en las opciones de "${campo}" del mapping `
        + `(conoce: ${Object.keys(opciones).join(', ')}).`)
    }
    return opciones[v]
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
    // Valores que el tipo de bloque exige siempre (el bloque del Block). Van PRIMERO: el
    // select que los define recarga el formulario, y los demas campos viven en lo que trae.
    for (const [campo, valor] of Object.entries(def.fijos || {})) poner(campo, valor)

    for (const [k, v] of Object.entries(contenido || {})) {
      if (vacio(v)) continue
      if (k in SIN_LANZAMIENTO) {
        if (v === true || (Array.isArray(v) && v.length)) {
          avisos.push(`${donde}: se saca ${SIN_LANZAMIENTO[k]}, que no va en el lanzamiento.`)
        }
        continue
      }
      if (def.descartar?.includes(k)) {
        if (k === 'filters' && v) avisos.push(`${donde}: las pestañas de filtro ("${v}") no existen en el carrusel del CMS; se sacan.`)
        continue
      }
      if (def.productos && k === 'products') continue
      if (def.verMas && (k === def.verMas.texto || k === def.verMas.url)) continue
      if (def.campos[k]) { poner(def.campos[k], valorDelCms(def, k, v, donde)); continue }
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
      // La portada del video y su alt se consumen mas abajo, cuando ya se sabe que el
      // campo del video quedo puesto: van pegados a el, no a un campo propio.
      if (DENTRO_DE_UN_MEDIO.get(componente)?.has(k)) continue
      if (CLASSY.has(k)) { poner(`classy.${k}`, v); continue }
      if (AVANZADO.has(k)) { poner(`advanced.${k}`, v); continue }
      frenar(`el campo "${k}" de ${donde} (${componente}) tiene valor `
        + `${JSON.stringify(v).slice(0, 60)} y no se a que campo del CMS corresponde.`)
    }

    // LA PORTADA DEL VIDEO. No es un medio: es un campo del medio del video, que se sube
    // adentro del mismo formulario donde se pega la URL. Por eso no va a un campo del
    // paragraph sino PEGADA al del video, y el valor de ese campo deja de ser una URL
    // pelada para ser `{ url, thumb }`.
    //
    // Va con la RUTA del archivo recortado, no con un nombre de la libreria: el que la
    // sube es el armado, en el momento de crear el medio. El nombre lo calcula la misma
    // funcion que uso el recortador (`archivoDe`), asi que los dos procesos coinciden.
    for (const arch of archivosDeBloque({ componente, contenido }, slug)) {
      const campo = def.campos?.[arch.deCampo]
      if (!campo) {
        frenar(`${donde}: hay una "${arch.key}" cargada que va adentro del medio de `
          + `"${arch.deCampo}", pero ese campo no esta en la tabla de traducir.js.`)
      }
      // Sin el link del video no hay medio que crear, y entonces no hay donde meter la
      // portada. Se avisa en vez de inventar: es un bloque a medio cargar en el hub.
      if (!fields[campo]) {
        avisos.push(`${donde}: hay portada cargada pero el video no tiene link, asi que la `
          + 'portada no se puede subir. Cargá el link en el hub y volvé a generar.')
        continue
      }
      fields[campo] = {
        url: fields[campo],
        thumb: {
          archivo: rutaDeImagen(slug, archivoDe(arch)),
          alt: arch.alt,
          // `derivada` = no la cargo nadie, la bajo el runner de YouTube. Importa para
          // decidir que hacer si el archivo no esta: una portada que el runner se consiguio
          // solo no puede frenar la pagina entera, y una que cargo el mercado si.
          ...(arch.derivada ? { derivada: true } : {}),
        },
      }
    }

    // LOS PRODUCTOS DEL CARRUSEL. Todavia no estan migrados al CMS, asi que van muestras
    // REALES de la misma marca (del mapping), tantas como tenia el bloque. Se avisa: hay
    // que reemplazarlas cuando se migren los productos.
    if (def.productos) {
      const pedidos = (contenido?.products || []).filter((x) => x?.title)
      const pool = productosMuestra?.[pagina?.brand] || productosMuestra?._
      if (!pool?.length) frenar(`${donde}: no hay productos de muestra en el mapping (productosMuestra) para "${pagina?.brand || 'sin marca'}".`)
      const n = Math.max(1, Math.min(pedidos.length || 3, pool.length))
      poner(def.productos, pool.slice(0, n))
      avisos.push(`${donde}: el carrusel lleva ${n} producto/s de MUESTRA de ${pagina?.brand || 'Purina'}`
        + (pedidos.length ? ` en lugar de: ${pedidos.map((x) => x.title).join(' / ')}` : '')
        + '. Reemplazar cuando se migren los productos.')
    }
    // EL BOTON "VER TODOS" del carrusel es el "See more" del paragraph (Avanzado).
    if (def.verMas && (contenido?.[def.verMas.texto] || contenido?.[def.verMas.url])) {
      poner('advanced.include_see_more_button', true)
      if (contenido[def.verMas.texto]) poner('advanced.see_more_title', contenido[def.verMas.texto])
      poner('advanced.see_more_uri', contenido[def.verMas.url] || SIN_DESTINO)
      if (!contenido[def.verMas.url]) {
        avisos.push(`${donde}: el boton "${contenido[def.verMas.texto]}" no tiene destino. `
          + `Se pone "${SIN_DESTINO}" para que el CMS lo acepte — HAY QUE COMPLETARLO.`)
      }
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

  // LAS PESTAÑAS. En el hub son UN bloque con una lista de pestañas y los componentes
  // colgando con su `tab_index`; en el CMS son tres niveles: el Tabs, un Tab por pestaña
  // y UN componente adentro de cada Tab (la cardinalidad del campo es 1).
  function pestanas(def, b, donde) {
    const lista = Array.isArray(b.content?.tabs) ? b.content.tabs : []
    if (!lista.length) frenar(`${donde}: el bloque de pestañas no tiene pestañas cargadas.`)
    const hijosDe = lista.map(() => [])
    for (const [j, h] of (b.hijos || []).entries()) {
      // Una pestaña borrada no pierde sus hijos: caen en la ULTIMA, igual que en el builder.
      const k = Math.min(h.tab_index ?? 0, lista.length - 1)
      const th = traducir(h.component_key, h.content, `${donde} > pestaña ${k + 1}`)
      if (!th) continue
      if (!def.admite.includes(th.type)) {
        frenar(`${donde} > pestaña ${k + 1}: una pestaña del CMS no admite "${th.type}" `
          + `(admite ${def.admite.join(', ')}).`)
      }
      hijosDe[k].push(th)
    }
    return lista.map((tab, k) => {
      if (hijosDe[k].length > 1) {
        frenar(`${donde} > pestaña ${k + 1} ("${tab?.label || ''}"): tiene ${hijosDe[k].length} `
          + 'componentes y en el CMS una pestaña lleva UNO solo.')
      }
      const fields = {}
      for (const [kk, campo] of Object.entries(def.campos)) {
        if (vacio(tab?.[kk])) continue
        verificar(def.como, campo, `${donde} > pestaña ${k + 1}`)
        fields[campo] = tab[kk]
      }
      // El fondo de la pestaña (Full Background). Se nombra igual que lo nombra
      // `mediosDeBloque` para una imagen de lista: con el componente del BLOQUE ('tabs'),
      // porque la tabla no declara la lista como paragraph hijo.
      for (const [kk, campo] of Object.entries(def.media || {})) {
        const url = origenDe(tab?.[kk])
        if (!url || !campo) continue
        verificar(def.como, campo, `${donde} > pestaña ${k + 1}`)
        const medio = nombreDeMedio({ slug, componente: 'tabs', campo: kk, origen: url })
        fields[campo] = medio
        pendientes.push({ donde: `${donde} > pestaña ${k + 1}`, campo: campoBase(kk), medio, url })
      }
      const item = { type: def.como, fields, slot: 0 }
      if (hijosDe[k].length) item.children = [{ ...hijosDe[k][0], slot: 0 }]
      return item
    })
  }

  const blocks = []
  for (const [i, b0] of bloques.entries()) {
    const donde = `bloque ${i + 1}`
    let b = b0
    // EL TITULO DE LAS PESTAÑAS. El Tabs del CMS no tiene titulo de bloque (lo que se ve
    // arriba de cada pestaña es la etiqueta de ESA pestaña). El titulo y la bajada del
    // hub van a un bloque de Texto justo antes, que es como se ve igual.
    if (PARAGRAFOS[b.component_key]?.pestanas && (b.content?.title || b.content?.subtitle)) {
      const { title, title_tag, subtitle, ...resto } = b.content
      // Es un TITULO de seccion, no un bloque de texto: sin aire propio (space_py_0), asi
      // queda pegado a sus pestañas y el aire separa secciones (ver CRITERIOS, Spacing). Salvo
      // justo despues de un banner, que deja solo 16px abajo: ahi conserva su 20/20.
      const previo = bloques[i - 1]?.component_key
      const pegado = previo && !['banner', 'banner_wrapper', 'breadcrumb'].includes(previo)
      const encabezado = traducir('text', { title, title_tag, body: subtitle, ...(pegado ? { spacing: 'space_py_0' } : {}) }, `${donde} (titulo de las pestañas)`)
      if (encabezado) blocks.push(encabezado)
      avisos.push(`${donde}: el titulo de las pestañas va en un bloque de Texto antes, porque el Tabs del CMS no tiene titulo.`)
      b = { ...b, content: resto }
    }
    const t = traducir(b.component_key, b.content, donde)
    if (!t) continue
    const pest = PARAGRAFOS[b.component_key]?.pestanas
    if (pest) {
      t.children = pestanas(pest, b, donde)
    } else if (b.hijos?.length && !PARAGRAFOS[b.component_key]?.lista) {
      // Contenedores de ranuras FIJAS (los layouts): sus hijos son componentes de verdad,
      // y su ranura sale del `tab_index`, que es el indice de slot.
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
      // Publicada: las paginas que se cargan en content quedan publicadas (CRITERIOS.md).
      // La MARCA de la pagina (el campo Brand del nodo) es la que le pone los colores a
      // toda la pagina: el fondo, el texto por defecto y los acentos (Pro Plan negro y
      // dorado, Dog Chow verde). Sin ella la pagina sale con el tema Purina.
      page: { title: pagina.name, path: pagina.path, published: true, brand: pagina.brand || null },
      blocks,
    },
    avisos,
    pendientes,
  }
}

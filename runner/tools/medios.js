// El NOMBRE de un medio, y como se agrupan los campos de imagen en medios.
//
// Vive aparte porque lo usan DOS herramientas que tienen que coincidir EXACTAMENTE:
// `imagenes.mjs`, que recorta los archivos y escribe el indice para subirlos, y
// `traducir.js`, que escribe ese mismo nombre en el manifiesto. Si una lo calcula
// distinto que la otra, el runner pide un medio que no existe y frena. Una sola funcion
// es la unica forma de que no se separen.
//
// UN MEDIO SON DOS ARCHIVOS. El bundle del CMS es `responsive_image`: lleva Image
// Desktop e Image Mobile adentro, las dos obligatorias. Por eso `image` y su
// `image_mobile` NO son dos medios, son uno.
//
// POR QUE EL NOMBRE LLEVA UN HASH DEL ORIGEN. La primera version usaba el numero de
// bloque, y eso se rompe solo: alcanza con que alguien reordene los bloques en el
// builder despues de recortar para que el manifiesto pida un nombre que ya no existe.
// El origen de la imagen no cambia con el orden, asi que el nombre tampoco.
import { createHash } from 'node:crypto'
import { getComponent, getSpecs } from '../../src/data/components.js'
import { PARAGRAFOS } from './paragrafos.js'

const limpio = (s) => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// El campo base de un medio: `image_mobile` y `image` son el MISMO medio.
export const campoBase = (key) => String(key).replace(/_mobile$/, '')

// Una imagen del hub puede ser una URL o el objeto que deja imagenes.mjs. Para el nombre
// vale siempre el ORIGEN: es lo unico que identifica a la foto y no cambia al recortar.
export const origenDe = (v) => (typeof v === 'string' ? v : v?.origen || '')

/**
 * El nombre con el que el medio queda en la Media library, y con el que el manifiesto lo
 * pide. Lleva la pagina adelante para encontrarlo de un tecleo y para que dos paginas no
 * se pisen; el campo, para saber de que parte del bloque salio; y seis caracteres del
 * origen, que lo hacen unico y estable.
 *
 * Un medio de Drupal es reutilizable, asi que dos paginas con la misma foto suben dos
 * medios. Se acepta a proposito: un nombre predecible vale mas que ahorrar duplicados,
 * porque las fotos del sitio viejo se van a reemplazar igual.
 */
export function nombreDeMedio({ slug, componente, campo, origen }) {
  const firma = createHash('sha1').update(String(origen)).digest('hex').slice(0, 6)
  return [slug, limpio(componente), limpio(campoBase(campo)), firma].filter(Boolean).join('-')
}

// "2100×700px" -> { w, h }. Una spec puede no tener la vista (varias solo traen desktop).
function medida(txt) {
  const m = /^(\d+)\s*[×x]\s*(\d+)/.exec(String(txt || '').trim())
  return m ? { w: Number(m[1]), h: Number(m[2]) } : null
}

// Los campos de tipo `image` de un componente, incluidos los de adentro de una lista.
// Salen del CATALOGO, no de una lista escrita a mano: un componente nuevo con una imagen
// nueva entra solo.
function camposImagen(def) {
  const sueltos = [], enLista = []
  for (const f of (def?.fields || [])) {
    if (f.type === 'image') sueltos.push(f.key)
    if (f.type === 'list') {
      for (const sf of (f.item || [])) if (sf.type === 'image') enLista.push([f.key, sf.key])
    }
  }
  return { sueltos, enLista }
}

/**
 * Los MEDIOS de un bloque: uno por campo de imagen (juntando su `_mobile`), con el nombre
 * que le toca, la medida de cada vista y de donde sale cada archivo.
 *
 * Vive ACA y no en el recortador porque el nombre tiene que ser el mismo que pide el
 * traductor. La imagen de una card se nombra con el paragraph HIJO (`card_grid_item`),
 * no con el bloque, porque para el CMS esa card ya es su propio paragraph — y es asi
 * como la pide el manifiesto. Nombrarla con el padre hacia que se recortara y se subiera
 * con un nombre y se pidiera con otro: el runner frenaba con el navegador abierto por un
 * medio que no aparecia en la libreria.
 *
 * @param {{componente: string, contenido: object}} bloque
 * @param {string} slug  el de la pagina (ver paginas.js)
 */
export function mediosDeBloque(bloque, slug) {
  const def = getComponent(bloque.componente)
  if (!def) return []
  const specs = getSpecs(def, bloque.contenido || {})
  const objetivo = { desktop: medida(specs[0]?.desktop), mobile: medida(specs[0]?.mobile) }

  // En que paragraph hijo se convierte cada lista. Sale de la MISMA tabla que usa el
  // traductor, asi que no hay una segunda lista que se pueda desincronizar.
  const itemDe = (lista) => {
    const l = PARAGRAFOS[bloque.componente]?.lista
    return l?.campo === lista ? l.como : bloque.componente
  }

  const { sueltos, enLista } = camposImagen(def)
  const campos = []
  for (const k of sueltos) {
    campos.push({ contenedor: bloque.contenido, key: k, etiqueta: k, componente: bloque.componente })
  }
  for (const [lista, k] of enLista) {
    ;(bloque.contenido?.[lista] || []).forEach((it, i) => {
      campos.push({ contenedor: it, key: k, etiqueta: `${lista}${i + 1}-${k}`, componente: itemDe(lista) })
    })
  }

  // Se agrupan por campo BASE: `image` y `image_mobile` son el mismo medio. La etiqueta
  // lleva el numero de item para que dos cards no se pisen entre si.
  const porMedio = new Map()
  for (const c of campos) {
    const clave = campoBase(c.etiqueta)
    if (!porMedio.has(clave)) porMedio.set(clave, {})
    porMedio.get(clave)[/_mobile$/.test(c.key) ? 'mobile' : 'desktop'] = c
  }

  const out = []
  for (const par of porMedio.values()) {
    // El origen del medio es el de DESKTOP. Sin el no hay medio: una foto solo de mobile
    // no se puede subir, porque el campo de desktop es obligatorio.
    const origen = origenDe(par.desktop?.contenedor?.[par.desktop?.key])
    if (!origen || !/^https?:/.test(origen)) continue
    // SIN MEDIDA DECLARADA no se inventa una, pero tampoco se saltea el medio: se sube la
    // foto TAL CUAL. Saltearlo dejaba al traductor pidiendo un medio que nadie producia, y
    // la pagina no se podia armar nunca. Hay componentes cuyas medidas todavia no sabemos
    // (el Imagen con Image position "image_bottom", por ejemplo): que no sepamos a cuanto
    // recortarla no es razon para que la imagen no llegue al CMS.
    out.push({
      // El campo se nombra PELADO (`image`), sin el `items1-` que solo sirve para agrupar
      // aca: el traductor tampoco lo tiene, porque para el la card ya es su propio
      // paragraph.
      nombre: nombreDeMedio({ slug, componente: par.desktop.componente, campo: par.desktop.key, origen }),
      etiqueta: campoBase(par.desktop.etiqueta),
      campo: par.desktop,
      // Si el hub no trae foto mobile aparte, se recorta la misma.
      // `w`/`h` en null = sin medida: se sube el original sin tocarlo.
      desktop: { origen, ...(objetivo.desktop || { w: null, h: null }) },
      mobile: objetivo.mobile
        ? { origen: origenDe(par.mobile?.contenedor?.[par.mobile?.key]) || origen, ...objetivo.mobile }
        : null,
      campoMobile: par.mobile || null,
    })
  }
  return out
}

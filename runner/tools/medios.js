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

// ELEGIR un medio del widget MEDIA LIBRARY: el modal con grilla y buscador.
//
// Es OTRO widget que el de `mediaExistente.js`, no una variante. En este CMS conviven los
// dos y se distinguen por la clase del campo:
//
//   field--widget-inline-entity-form-complex  -> el de las imagenes (un autocompletar)
//   field--widget-media-library-widget        -> este (un modal con grilla)
//
// El de las imagenes es el de `field_c_image`; este es el de `field_c_external_video`, el
// video de YouTube. El runner los trataba igual — ninguno de los dos, en realidad: el
// video caia en "campos que no se como llenar" y quedaba vacio.
//
// NO CREA MEDIOS, igual que el otro. El modal ofrece un formulario "Agregar External
// Video a traves de URL" que crearia uno al vuelo, y esta a proposito sin usar: un medio
// de Drupal se REUTILIZA, y crear uno por pagina llena la libreria de duplicados que
// despues no limpia nadie. En la libreria de Purina ya hay TRES del mismo video. Si el
// que pide el manifiesto no esta, frena y dice cual falta.
//
// SE BUSCA POR URL, NO POR NOMBRE. El buscador del modal filtra por NOMBRE, y el nombre de
// un video lo pone YouTube ("A ti te importa de donde viene su alimento"): el hub no lo
// tiene ni tiene por que. Lo que el hub tiene es la URL, asi que se compara eso — y se
// compara el ID del video, no la cadena entera, porque la misma pagina puede estar
// guardada como `youtu.be/XXX` o como `youtube.com/watch?v=XXX` y son el mismo video.
// Cada fila de la grilla trae su URL adentro del iframe de oembed.
import { esperarAjax, esperarVisible } from './esperas.js'

// Sacados del HTML real del modal. Se pueden pisar desde el mapping en "mediaLibrary".
export const MEDIA_LIBRARY = {
  abrir: '[data-drupal-selector$="-open-button"]',
  modal: '.media-library-widget-modal',
  fila: '.js-media-library-item',
  // El click va en el "trigger" de la fila, que es lo que Drupal escucha; tildar el
  // checkbox a mano no dispara su JS y el boton de insertar no se habilita.
  elegir: '.js-click-to-select-trigger',
  insertar: '.media-library-select',
  // Lo que queda en el campo cuando el medio ya esta puesto.
  puesto: '.js-media-library-selection',
  vacio: '.media-library-widget-empty-text',
}

/**
 * El ID de un video de YouTube, venga como venga la URL. Es lo unico que identifica al
 * video: la misma pagina puede estar guardada de varias formas y todas valen.
 * Devuelve null si no se reconoce — y entonces se compara la URL entera, que es lo mejor
 * que se puede hacer sin inventar.
 */
export function idDeVideo(url) {
  const s = String(url || '')
  const m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/.exec(s)
  if (m) return m[1]
  const v = /vimeo\.com\/(?:video\/)?(\d{6,})/.exec(s)
  return v ? v[1] : null
}

// Dos URLs son el mismo video si coinciden sus IDs; y si de alguna no se saca ID, se
// comparan las URLs normalizadas.
export function mismoVideo(a, b) {
  const ia = idDeVideo(a)
  const ib = idDeVideo(b)
  if (ia && ib) return ia === ib
  const limpia = (u) => String(u || '').trim().replace(/\/+$/, '').toLowerCase()
  return !!limpia(a) && limpia(a) === limpia(b)
}

// Las URLs que menciona el HTML de una fila de la grilla. Drupal mete el iframe de oembed
// con la URL original adentro del parametro `url=`, tanto en el atributo `data-...-lazy`
// como en el src directo, asi que se sacan todas y se prueba con cada una.
export function urlsDeLaFila(html) {
  const out = []
  for (const m of String(html || '').matchAll(/[?&]url=([^&"'\s]+)/g)) {
    try { out.push(decodeURIComponent(m[1].replace(/&amp;/g, '&'))) } catch { out.push(m[1]) }
  }
  return out
}

export async function elegirDeLaLibreria({ page, campo, url, cfg, ref }) {
  const c = { ...MEDIA_LIBRARY, ...(cfg || {}) }

  const abrir = await esperarVisible(page, `${campo} ${c.abrir}`, 10000)
  if (!abrir) {
    throw new Error(`No encontre el boton que abre la Media library de ${ref} `
      + `(${campo} ${c.abrir}). Si este campo no es un media library widget, corregi `
      + '"mediaLibrary" en el mapping.')
  }
  await abrir.click()
  await esperarAjax(page)

  const modal = await esperarVisible(page, c.modal, 20000)
  if (!modal) throw new Error(`No se abrio el modal de la Media library de ${ref} (${c.modal})`)

  try {
    const filas = page.locator(`${c.modal} ${c.fila}`)
    const n = await filas.count()
    let elegida = null
    const vistas = []
    for (let i = 0; i < n; i++) {
      const html = await filas.nth(i).innerHTML().catch(() => '')
      const urls = urlsDeLaFila(html)
      vistas.push(...urls)
      if (urls.some((u) => mismoVideo(u, url))) { elegida = filas.nth(i); break }
    }

    if (!elegida) {
      // Lo unico que sirve para arreglarlo: que se pide, cuantos se miraron, y que el
      // runner no lo va a crear solo.
      throw new Error(`No hay ningun medio con el video ${url} en la libreria (${ref}). `
        + `Se miraron ${n} de la primera pagina, los mas recientes primero`
        + (vistas.length ? ` (por ejemplo: ${vistas.slice(0, 3).join(' | ')})` : '')
        + '. El runner NO crea medios: crealo a mano en el CMS (el modal tiene "Agregar '
        + 'External Video a traves de URL") y volve a correr. Si YA existe pero esta mas '
        + 'atras en la grilla, no lo veo desde aca.')
    }

    await elegida.locator(c.elegir).first().click()
    // El boton de insertar del pie del dialogo es el que Drupal habilita; el que esta
    // adentro del form viene con display:none.
    const insertar = await esperarVisible(page, `${c.modal} ${c.insertar}:visible`, 10000)
      || await esperarVisible(page, `${c.modal} ${c.insertar}`, 5000)
    if (!insertar) throw new Error(`No encontre el boton "Insertar seleccionado" de ${ref}`)
    await insertar.click()
    await esperarAjax(page)
  } finally {
    // Si algo fallo con el modal abierto, la pagina queda tapada y el resto de la corrida
    // no puede tocar nada. Se cierra siempre.
    const abierto = await page.locator(c.modal).count().catch(() => 0)
    if (abierto) await page.locator(`${c.modal} .ui-dialog-titlebar-close`).first().click().catch(() => {})
  }

  return await leerSeleccion(page, campo, c)
}

// Que quedo en el campo. El widget reemplaza el "No se han seleccionado elementos media."
// por la ficha del medio, asi que alcanza con leer el contenedor de la seleccion.
export async function leerSeleccion(page, campo, cfg) {
  const c = { ...MEDIA_LIBRARY, ...(cfg || {}) }
  const sel = page.locator(`${campo} ${c.puesto}`).first()
  if (!(await sel.count().catch(() => 0))) return ''
  return (await sel.innerText().catch(() => '')).replace(/\s+/g, ' ').trim()
}

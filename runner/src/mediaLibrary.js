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
// BUSCA, Y SI NO ESTA LO CREA. La regla de la casa es que el runner arme la pagina de
// punta a punta y no deje nada pendiente para hacer a mano. Pero buscar primero no es
// opcional: un medio de Drupal se REUTILIZA, y crear uno por pagina llena la libreria de
// duplicados que despues no limpia nadie — de un solo video de Purina ya hay TRES. Asi
// que se busca, y crear es el camino de excepcion, no el primero.
//
// Esto es distinto de las IMAGENES, que se suben en su propio paso (`subir-medios`) antes
// de construir. Un video no tiene archivo que subir: es una URL, y crearlo es pegar esa
// URL en el formulario del modal. Por eso aca si se puede hacer en el momento.
//
// SE BUSCA POR URL, NO POR NOMBRE. El buscador del modal filtra por NOMBRE, y el nombre de
// un video lo pone YouTube ("A ti te importa de donde viene su alimento"): el hub no lo
// tiene ni tiene por que. Lo que el hub tiene es la URL, asi que se compara eso — y se
// compara el ID del video, no la cadena entera, porque la misma pagina puede estar
// guardada como `youtu.be/XXX` o como `youtube.com/watch?v=XXX` y son el mismo video.
// Cada fila de la grilla trae su URL adentro del iframe de oembed.
//
// LA PORTADA ("Video thumb") va adentro de ese mismo formulario: es un campo del MEDIO
// del video, no un medio aparte. Es opcional — sin ella el sitio muestra la de YouTube —
// y solo se puede poner al CREAR: un medio que ya existe se reutiliza, y pisarle la
// portada se la cambiaria a todas las paginas que lo referencian.
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { esperarAjax, esperarVisible } from './esperas.js'
import { ALT_DE_RESERVA } from './media.js'

// Sacados del HTML real del modal. Se pueden pisar desde el mapping en "mediaLibrary".
export const MEDIA_LIBRARY = {
  abrir: '[data-drupal-selector$="-open-button"]',
  modal: '.media-library-widget-modal',
  fila: '.js-media-library-item',
  // El click va en el "trigger" de la fila, que es lo que Drupal escucha; tildar el
  // checkbox a mano no dispara su JS y el boton de insertar no se habilita.
  elegir: '.js-click-to-select-trigger',
  insertar: '.media-library-select',
  // El alta por URL: el campo, el boton que le pregunta a YouTube, y el que guarda.
  // Guardar vive en el pie del dialogo porque el del form viene con display:none.
  url: 'input[name="url"]',
  agregar: '.media-library-add-form-oembed-submit',
  nombre: 'input[name="media[0][fields][name][0][value]"]',
  // La PORTADA ("Video thumb"): un archivo que se sube en el mismo formulario, no una
  // referencia a otro medio. El `name` lleva la ruta del form anidado adentro del modal
  // (`media[0][fields][field_media_image]` -> `media_0_fields_field_media_image_0`).
  // El alt va por sufijo, como en el otro subidor: el `name` completo cambia con la ruta.
  thumb: 'input[name="files[media_0_fields_field_media_image_0]"]',
  thumbAlt: 'input[name^="media[0][fields][field_media_image]"][name$="[alt]"]',
  // El hidden que Drupal llena cuando la subida TERMINA. Es la señal de que ya se puede
  // buscar el alt: antes de eso el campo todavia no existe en el DOM.
  thumbListo: 'input[name="media[0][fields][field_media_image][0][fids]"]',
  guardar: '.ui-dialog-buttonpane button.button--primary',
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

/**
 * La PORTADA del video ("Video thumb"): un archivo que se sube en el mismo formulario del
 * medio, entre pegar la URL y guardar — tal cual lo cuenta el playbook del CMS.
 *
 * Es OPCIONAL de verdad: sin portada cargada el sitio muestra la de YouTube, asi que no
 * tener una no es un dato que falte. Y si el formulario de este sitio no trae el campo, se
 * sigue de largo avisando en vez de frenar: el video se crea igual, que es lo que importa.
 *
 * El alt SI se llena cuando hay portada: en este CMS es obligatorio y, sin texto, Drupal
 * rechaza el medio entero.
 */
async function subirPortada({ page, c, thumb, ref, onStep }) {
  const ruta = resolve(thumb.archivo)
  if (!existsSync(ruta)) {
    throw new Error(`La portada del video de ${ref} no esta en disco (${ruta}). `
      + 'La recorta el paso de imagenes: si ese paso no corrio o fallo, mira sus pasos.')
  }

  const file = page.locator(`${c.modal} ${c.thumb}`).first()
  if (!(await file.count())) {
    onStep(`     (el formulario del medio no tiene campo de portada (${c.thumb}): el video `
      + 'se crea sin ella y el sitio va a mostrar la de YouTube)')
    return
  }

  onStep(`     subiendo la portada del video (${thumb.archivo})`)
  await file.setInputFiles(ruta)
  // Drupal sube por AJAX apenas cambia el input; el `fids` es lo unico que dice que el
  // archivo YA esta en el servidor. Escribir el alt antes es escribir sobre un campo que
  // el AJAX va a redibujar.
  await page.waitForFunction((s) => {
    const el = document.querySelector(s)
    return !!(el && el.value && el.value !== '0')
  }, `${c.modal} ${c.thumbListo}`, { timeout: 120000 }).catch(() => {
    throw new Error(`Drupal no termino de subir la portada del video de ${ref} `
      + `(${c.thumbListo} sigue vacio). Puede ser el archivo (medida o peso) o el servidor.`)
  })
  await esperarAjax(page)

  const alt = String(thumb.alt || '').trim() || ALT_DE_RESERVA
  const campoAlt = await esperarVisible(page, `${c.modal} ${c.thumbAlt}`, 10000)
  if (campoAlt) await campoAlt.fill(alt)
  else onStep(`     (la portada subio pero no encontre su alt (${c.thumbAlt}); si el CMS lo `
    + 'exige, va a quejarse al guardar)')
}

// Crea el medio pegando la URL en el formulario del modal. Drupal le pregunta a YouTube
// por oembed y vuelve con los campos ya llenos — el nombre incluido, que es el titulo del
// video. Ese nombre se deja como viene: es el que el editor va a reconocer en la libreria,
// y ponerle uno nuestro solo lo haria mas dificil de encontrar.
//
// Es tambien el UNICO momento en que se puede poner la portada: despues el medio ya
// existe y es de todas las paginas que lo referencian.
async function crearDesdeUrl({ page, c, url, thumb, ref, onStep = () => {} }) {
  const input = await esperarVisible(page, `${c.modal} ${c.url}`, 10000)
  if (!input) {
    throw new Error(`El video ${url} no esta en la libreria y el modal de ${ref} no tiene `
      + `el campo para agregarlo por URL (${c.url}). Habria que crearlo a mano en el CMS.`)
  }
  await input.fill(url)

  const agregar = await esperarVisible(page, `${c.modal} ${c.agregar}`, 10000)
  if (!agregar) throw new Error(`No encontre el boton "Agregar" del modal de ${ref} (${c.agregar})`)
  await agregar.click()
  await esperarAjax(page)

  // La señal de que YouTube contesto: el formulario del medio, con el nombre ya puesto.
  // Sin esperarla, Guardar se aprieta sobre un formulario que todavia no existe.
  const nombre = await esperarVisible(page, `${c.modal} ${c.nombre}`, 30000)
  if (!nombre) {
    const queja = await page.locator(`${c.modal} .messages--error, ${c.modal} .form-item--error-message`)
      .allInnerTexts().catch(() => [])
    throw new Error(`Pegue ${url} en el modal de ${ref} pero el CMS no devolvio el `
      + 'formulario del medio. '
      + (queja.length ? `Dice: ${queja.join(' | ').replace(/\s+/g, ' ').slice(0, 200)}` : 'No dijo nada.')
      + ' Puede ser que el proveedor no este permitido (solo YouTube y Vimeo).')
  }

  // La portada va ANTES de guardar: es un campo mas de este mismo formulario.
  if (thumb) await subirPortada({ page, c, thumb, ref, onStep })

  const guardar = await esperarVisible(page, `${c.modal} ${c.guardar}`, 10000)
  if (!guardar) throw new Error(`No encontre el boton de guardar del modal de ${ref} (${c.guardar})`)
  await guardar.click()
  await esperarAjax(page)
}

export async function elegirDeLaLibreria({ page, campo, url, thumb, cfg, ref, onStep = () => {} }) {
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
      // No esta en la grilla: se crea pegando la URL, que es lo que haria una persona.
      // Se avisa, porque un medio nuevo es algo que queda en la libreria para siempre.
      onStep(`     el video no estaba en la libreria (${n} miradas): lo creo desde la URL`)
      await crearDesdeUrl({ page, c, url, thumb, ref, onStep })
    } else {
      // LA PORTADA NO SE PISA. El medio ya existe y se REUTILIZA: la portada es un campo
      // suyo, asi que cambiarla acá la cambiaria en todas las paginas que lo referencian,
      // y esta corrida no tiene forma de saber cuales son ni si alguien la eligio a
      // proposito. Se avisa y se sigue: el video queda bien puesto, que es lo pedido.
      if (thumb) {
        onStep('     (el video ya estaba en la libreria: se reutiliza y NO se le toca la '
          + 'portada — es un campo del medio y cambiarla afectaria a las demas paginas que '
          + 'lo usan. Si hay que cambiarla, va a mano en el CMS, una vez.)')
      }
      await elegida.locator(c.elegir).first().click()
    }

    // El boton de insertar del pie del dialogo es el que Drupal habilita; el que esta
    // adentro del form viene con display:none. Despues de crear, el modal a veces ya
    // inserta solo: si el boton no esta, no es un error.
    const insertar = await esperarVisible(page, `${c.modal} ${c.insertar}:visible`, 10000)
    if (insertar) {
      await insertar.click()
      await esperarAjax(page)
    } else if (elegida) {
      throw new Error(`No encontre el boton "Insertar seleccionado" de ${ref}`)
    }
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

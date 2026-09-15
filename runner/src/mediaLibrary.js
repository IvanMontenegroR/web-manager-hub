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
  // El nombre que muestra cada fila de la grilla. Es lo unico que identifica al medio
  // desde afuera, y con el se lo vuelve a encontrar en el listado de administracion para
  // completarle la portada cuando el medio ya existia.
  nombreFila: '.media-library-item__name',
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

/**
 * La PORTADA que publica YouTube para un video, en la mejor calidad que haya.
 *
 * Devuelve una LISTA en orden de preferencia, y no una sola URL, porque `maxresdefault`
 * no existe siempre: YouTube lo genera a partir del master y los videos viejos o subidos
 * en baja no lo tienen. Ahi contesta 404 y hay que bajar el siguiente.
 *
 *   maxresdefault  1280×720   16:9 de verdad. Lo mejor que da YouTube.
 *   hqdefault       480×360   existe SIEMPRE, pero es 4:3 CON BANDAS NEGRAS arriba y
 *                             abajo. Por eso el recorte va a 16:9: las saca.
 *
 * `sddefault` y `mqdefault` quedan afuera a proposito: el primero tiene las mismas bandas
 * que hqdefault sin ser mucho mas grande, y el segundo (320×180) es demasiado chico para
 * una portada a lo ancho.
 *
 * El PRIMERO de la lista es ademas el que nombra el archivo, asi que no cambia aunque la
 * descarga termine cayendo al segundo: los dos procesos que calculan ese nombre no se
 * hablan y tienen que llegar al mismo resultado.
 *
 * Vimeo no entra: su portada no esta en una URL predecible, hay que preguntarle a su API.
 * Devuelve lista vacia y el runner sigue sin portada, que es lo que hace hoy.
 */
export function portadasDeVideo(url) {
  const id = idDeVideo(url)
  if (!id || !/youtu/i.test(String(url))) return []
  return [
    `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
  ]
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
    // Una portada DERIVADA la bajo el runner de YouTube: si no esta, casi siempre es que
    // YouTube no contesto. El video se crea igual y se avisa — frenar la pagina entera por
    // una imagen que nadie cargo seria desproporcionado. Una que cargo alguien SI frena:
    // eso es un dato de la pagina que se estaria perdiendo en silencio.
    if (thumb.derivada) {
      onStep(`     (no esta la portada bajada de YouTube (${thumb.archivo}): el video se `
        + 'crea sin ella y en el sitio queda el cuadro vacio)')
      return
    }
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

  // El nombre del medio cuando YA existia. Sirve para ir a completarle la portada
  // despues, con el modal ya cerrado.
  let yaEstaba = ''
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
      // El nombre se lee ANTES de insertar: despues el modal se cierra y la grilla no
      // existe mas. Es con lo que se vuelve a encontrar el medio para completarlo.
      yaEstaba = (await elegida.locator(c.nombreFila).first().innerText().catch(() => '')).trim()
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

  // El medio YA EXISTIA, asi que la portada no se pudo poner al crearlo. Se va a
  // completarla a su ficha, en otra pestaña — pero solo si no tiene ninguna.
  if (thumb && yaEstaba) {
    await completarPortada({ page, c, nombre: yaEstaba, thumb, ref, onStep })
  }

  return await leerSeleccion(page, campo, c)
}

/**
 * Le pone la portada a un medio que YA EXISTE, entrando a su ficha.
 *
 * SOLO SI NO TIENE NINGUNA. Llenar un campo vacio no es lo mismo que pisar lo que alguien
 * eligio: un medio se comparte entre todas las paginas que lo referencian, asi que
 * cambiarle una portada cargada seria decidir por ellas. Dejarlo vacio, en cambio, deja el
 * video sin nada — que es el problema que esto viene a resolver.
 *
 * VA EN OTRA PESTAÑA. En la principal esta el formulario del nodo a medio armar: navegar
 * ahi se lo lleva puesto y hay que empezar de cero.
 *
 * Y NO FRENA LA CORRIDA. El video ya quedo puesto en la pagina, que es lo que se pidio; si
 * no se le puede completar la portada, se dice y se sigue. Frenar por esto seria tirar
 * abajo una pagina entera por un campo de otra entidad.
 */
async function completarPortada({ page, c, nombre, thumb, ref, onStep }) {
  const cfg = c.medio || {}
  const lista = cfg.lista || '/admin/content/media?name={nombre}'
  if (!existsSync(resolve(thumb.archivo))) {
    onStep(`     (el video ya estaba en la libreria pero la portada no esta en disco `
      + `(${thumb.archivo}): mira los pasos del recorte)`)
    return
  }
  const tab = await page.context().newPage()
  try {
    const destino = new URL(lista.replace('{nombre}', encodeURIComponent(nombre)), page.url())
    await tab.goto(destino.href, { waitUntil: 'domcontentloaded' })

    // El link de editar de la fila que se llama EXACTAMENTE asi. Exacto porque un nombre
    // puede ser prefijo de otro, y editar el medio equivocado se descubre tarde.
    const links = tab.locator('a[href*="/media/"][href*="/edit"]')
    const cuantos = await links.count()
    let editar = null
    for (let i = 0; i < cuantos; i++) {
      const fila = links.nth(i).locator('xpath=ancestor::tr[1]')
      const txt = (await fila.innerText().catch(() => '')).replace(/\s+/g, ' ')
      if (txt.includes(nombre)) { editar = await links.nth(i).getAttribute('href'); break }
    }
    if (!editar) {
      onStep(`     (el video ya estaba en la libreria y no encontre su ficha para ponerle `
        + `portada: buscá "${nombre}" en Contenido > Media y subila a mano)`)
      return
    }

    await tab.goto(new URL(editar, tab.url()).href, { waitUntil: 'domcontentloaded' })

    // ¿Ya tiene una? El `fids` con valor significa que hay un archivo cargado.
    const fids = tab.locator(cfg.subido || 'input[name="field_media_image[0][fids]"]').first()
    const tiene = await fids.inputValue().catch(() => '')
    if (tiene && tiene !== '0') {
      onStep('     (el video ya estaba en la libreria y ya tiene su propia portada: no se toca)')
      return
    }

    const campo = tab.locator(cfg.archivo || 'input[name="files[field_media_image_0]"]').first()
    if (!(await campo.count())) {
      onStep(`     (la ficha del video no tiene campo de portada: subila a mano en "${nombre}")`)
      return
    }
    onStep(`     el video ya estaba en la libreria y sin portada: se la pongo (${thumb.archivo})`)
    await campo.setInputFiles(resolve(thumb.archivo))
    await tab.waitForFunction((s) => {
      const el = document.querySelector(s)
      return !!(el && el.value && el.value !== '0')
    }, cfg.subido || 'input[name="field_media_image[0][fids]"]', { timeout: 120000 })
    await esperarAjax(tab)

    const alt = await esperarVisible(tab, cfg.alt || 'input[name$="[alt]"]', 10000)
    if (alt) await alt.fill(String(thumb.alt || '').trim() || ALT_DE_RESERVA)

    const guardar = await esperarVisible(tab, cfg.guardar || 'input[name="op"][value="Guardar"]', 10000)
    if (!guardar) {
      onStep('     (subi la portada pero no encontre el boton de guardar de la ficha: '
        + 'quedo SIN guardar, hay que entrar a mano)')
      return
    }
    await guardar.click()
    await tab.waitForLoadState('domcontentloaded')

    const quejas = await tab.locator('.messages--error, .messages.error').allInnerTexts().catch(() => [])
    if (quejas.length) {
      onStep(`     (el CMS rechazo la portada: ${quejas.join(' | ').replace(/\s+/g, ' ').slice(0, 160)})`)
    } else {
      onStep('     portada puesta en el medio del video')
    }
  } catch (e) {
    onStep(`     (no pude completarle la portada al video de ${ref}: `
      + `${String(e.message).slice(0, 120)}. El video quedo puesto igual.)`)
  } finally {
    await tab.close().catch(() => {})
  }
}

// Que quedo en el campo. El widget reemplaza el "No se han seleccionado elementos media."
// por la ficha del medio, asi que alcanza con leer el contenedor de la seleccion.
export async function leerSeleccion(page, campo, cfg) {
  const c = { ...MEDIA_LIBRARY, ...(cfg || {}) }
  const sel = page.locator(`${campo} ${c.puesto}`).first()
  if (!(await sel.count().catch(() => 0))) return ''
  return (await sel.innerText().catch(() => '')).replace(/\s+/g, ' ').trim()
}

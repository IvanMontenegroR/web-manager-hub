// Subir imagenes a la MEDIA LIBRARY de Drupal, de a una, con la sesion ya abierta.
//
// Es IDEMPOTENTE a proposito: antes de subir busca si ya hay un media con ese nombre y
// lo saltea. Un media de Drupal se REUTILIZA — la misma imagen se referencia desde
// cuantos paragraphs haga falta —, asi que subir de nuevo en cada corrida solo llenaria
// la libreria de duplicados, y limpiarlos despues no lo hace nadie.
//
// El nombre del media es el nombre del archivo sin extension. Ese nombre es el
// identificador con el que el manifiesto va a pedir la imagen.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { esperarAjax, esperarVisible } from './esperas.js'

// Los selectores salen del HTML REAL de /media/add/image de este sitio, no de un Drupal
// generico. Si en otro sitio son distintos se corrigen en el mapping bajo "media", sin
// tocar el codigo.
export const MEDIA_POR_DEFECTO = {
  // El bundle es `responsive_image`, NO `image`: es el que piden los campos de los
  // componentes. Un medio de este tipo lleva DOS imagenes adentro — Image Desktop e
  // Image Mobile, las dos obligatorias — y por eso cada placeholder son dos archivos.
  // Subirlo como `image` fue el error que costo una tanda entera: la imagen quedaba en
  // la libreria pero el autocompletar del campo no la ofrecia nunca, porque filtra por
  // bundle.
  add: '/media/add/responsive_image',
  lista: '/admin/content/media?name={nombre}',
  archivo: 'input[name="files[field_media_image_0]"]',
  archivoMobile: 'input[name="files[field_image_mobile_0]"]',
  subidoMobile: 'input[name="field_image_mobile[0][fids]"]',
  // La señal de que la subida TERMINO. El widget de archivo de Drupal deja este hidden
  // vacio hasta que el AJAX vuelve con el id del archivo subido.
  //
  // El formulario ANTES de elegir el archivo no se parece al de despues: no hay alt, no
  // hay vista previa, no hay nada. Todo eso — el alt incluido — lo dibuja el AJAX cuando
  // termina de subir. Por eso la señal es el `fids` y no un campo cualquiera: es el unico
  // dato que significa "el archivo YA esta en el servidor", y no depende de que este
  // formulario tenga o no cada campo.
  subido: 'input[name="field_media_image[0][fids]"]',
  // El alt aparece RECIEN despues de subir, adentro del widget que el AJAX redibuja. Por
  // eso se busca despues de esperar el `fids` y no antes: antes no existe. Es del campo
  // de DESKTOP y es obligatorio; el de mobile no lo pide.
  alt: 'input[name="field_media_image[0][alt]"]',
  nombre: 'input[name="name[0][value]"]',
  // Gin repite Guardar en su barra pegajosa: hay DOS con el mismo name. Se aprieta el
  // que se ve (mismo problema que los botones de alta de paragraphs).
  guardar: 'input[name="op"][value="Guardar"], input[name="op"][value="Save"], '
    + 'button[name="op"][value="Guardar"], button[name="op"][value="Save"]',
  alUsar: 'Placeholder de prueba',
  // Un media NO es contenido publicado en el sitio: es material que el editor elige desde
  // la libreria. Uno despublicado no se puede elegir, asi que la regla de "siempre
  // borrador" (que vale para las PAGINAS) aca no aplica y se deja como viene el
  // formulario. Poner `publicar: false` lo destilda, si algun sitio lo prefiere asi.
  publicado: 'input[name="status[value]"]',
  publicar: null,
}

export async function subirPlaceholders({ page, mapping, carpeta, solo, onStep = () => {} }) {
  const cfg = { ...MEDIA_POR_DEFECTO, ...(mapping.media || {}) }
  const url = (r) => new URL(r, mapping.site.replace(/\/+$/, '') + '/').href

  if (!existsSync(carpeta)) throw new Error(`No existe la carpeta ${carpeta}`)
  // El INDICE dice que archivos forman cada medio. Se lee en vez de deducirlo del nombre
  // de los archivos: un componente que algun dia se llame "algo-mobile" romperia
  // cualquier regla que parsee nombres.
  const indice = join(carpeta, 'INDICE.json')
  if (!existsSync(indice)) {
    throw new Error(`Falta ${indice}. Se genera con: node tools/placeholders.mjs`)
  }
  const archivos = JSON.parse(readFileSync(indice, 'utf8'))
    .map((g) => ({ nombre: g.nombre, desktop: g.desktop.archivo, mobile: g.mobile.archivo }))
    .filter((g) => !solo || g.nombre.includes(solo))
  if (!archivos.length) {
    throw new Error(solo ? `Ningun placeholder contiene "${solo}"` : `No hay placeholders en ${carpeta}`)
  }

  await page.goto(url('/user'), { waitUntil: 'domcontentloaded' })
  if (/\/user\/login/.test(page.url())) {
    throw new Error('No hay sesion en Drupal. Abri page-runner y toca "Conectar con Drupal" primero.')
  }

  let subidos = 0
  let salteados = 0
  onStep(`${archivos.length} imagenes para subir a ${mapping.site}`)

  for (const archivo of archivos) {
    const nombre = archivo.nombre
    const r = await conReintentos(() => unaImagen({ page, cfg, url, carpeta, archivo, nombre }),
      { onStep, nombre })
    if (r === 'salteada') { salteados += 1; onStep(`  =  ${nombre} (ya estaba)`) }
    else { subidos += 1; onStep(`  +  ${nombre}`) }
  }
  return { subidos, salteados, total: archivos.length }
}

// Treinta y seis imagenes seguidas contra un CMS remoto es un rato largo, y basta un
// parpadeo de la red — cambiar de wifi, la VPN, la maquina que se suspende — para cortar
// todo. Eso NO es un error del runner ni del CMS: es la red, y una persona simplemente
// volveria a intentar. Asi que se reintenta, con esperas cada vez mas largas, y solo ante
// fallas de red. Cualquier otra cosa (Drupal que rechaza el archivo, un selector que no
// aparece) sigue frenando en seco, que es lo que corresponde.
const ES_DE_RED = /net::ERR_|ERR_NETWORK|ERR_CONNECTION|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_TIMED_OUT|Timeout .* exceeded/i

async function conReintentos(fn, { onStep, nombre, veces = 4 }) {
  for (let i = 1; ; i++) {
    try { return await fn() } catch (e) {
      if (i >= veces || !ES_DE_RED.test(e.message)) throw e
      const espera = 2000 * 2 ** (i - 1)
      onStep(`  …  ${nombre}: se corto la red, reintento ${i} de ${veces - 1} en ${espera / 1000}s`)
      await new Promise((r) => setTimeout(r, espera))
    }
  }
}

async function unaImagen({ page, cfg, url, carpeta, archivo, nombre }) {
  // ¿Ya esta? Se busca el nombre EXACTO: uno mas largo puede contener a este.
  await page.goto(url(cfg.lista.replace('{nombre}', encodeURIComponent(nombre))),
    { waitUntil: 'domcontentloaded' })
  if (await page.getByText(nombre, { exact: true }).count().catch(() => 0)) {
    return 'salteada'
  }

  await page.goto(url(cfg.add), { waitUntil: 'domcontentloaded' })
  await subirArchivo(page, cfg, cfg.archivo, cfg.subido, join(carpeta, archivo.desktop), nombre, 'desktop')
  await subirArchivo(page, cfg, cfg.archivoMobile, cfg.subidoMobile, join(carpeta, archivo.mobile), nombre, 'mobile')

  // Si este formulario pide alt, se llena; si no lo pide, no se inventa nada.
  const alt = await siEsta(page, cfg.alt)
  if (alt) await alt.fill(cfg.alUsar)

  // El nombre del media es el identificador: se fuerza al del archivo. Drupal lo
  // precarga con el nombre del archivo CON extension, asi que hay que pisarlo.
  const campoNombre = await esperarVisible(page, cfg.nombre, 5000)
  if (!campoNombre) {
    throw new Error(`No encontre el campo "Nombre" (${cfg.nombre}) en ${cfg.add}. `
      + 'Corregi "media.nombre" en el mapping.')
  }
  await campoNombre.fill(nombre)

  if (cfg.publicar === false) {
    const pub = await siEsta(page, cfg.publicado)
    if (pub) await pub.uncheck().catch(() => {})
  }

  const guardar = await esperarVisible(page, cfg.guardar, 10000)
  if (!guardar) {
    throw new Error(`No encontre el boton de guardar (${cfg.guardar}) en ${cfg.add}. `
      + 'Corregi "media.guardar" en el mapping.')
  }
  await guardar.click()
  await page.waitForLoadState('domcontentloaded')

  const quejas = await page.locator('.messages--error, .messages.error').allInnerTexts().catch(() => [])
  if (quejas.length) {
    throw new Error(`Drupal rechazo "${nombre}": `
      + quejas.join(' | ').replace(/\s+/g, ' ').trim().slice(0, 300)
      + ' — se puede volver a correr: las que ya estan se saltean.')
  }
  return 'subida'
}

// Un campo OPCIONAL: si el formulario no lo tiene, se sigue de largo AL INSTANTE. Un
// formulario de medios que no pida alt es perfectamente valido — el alt puede vivir en el
// campo que REFERENCIA al medio — y esperarlo "por las dudas" en cada imagen serian
// minutos regalados.
async function siEsta(page, sel, ms = 2000) {
  if (!(await page.locator(sel).count())) return null
  return esperarVisible(page, sel, ms)
}

// Un archivo del formulario. Son dos —- desktop y mobile -— y cada uno tiene su input y
// su propio `fids`: hay que esperar el de CADA uno, porque suben de a uno por AJAX.
async function subirArchivo(page, cfg, selArchivo, selFids, ruta, nombre, cual) {
  const file = page.locator(selArchivo).first()
  if (!(await file.count())) {
    throw new Error(`No encontre el campo de archivo ${cual} en ${cfg.add} (${selArchivo}). `
      + 'Si el formulario de medios de este sitio es otro, corregi "media" en el mapping.')
  }
  await file.setInputFiles(ruta)
  await esperarSubida(page, cfg, `${nombre} (${cual})`, selFids)
}

// Drupal sube el archivo por AJAX apenas cambia el input, y hasta que vuelve el
// formulario no tiene ni nombre ni nada que guardar. Se espera al `fids`, que es el
// unico dato que dice "el archivo YA esta en el servidor".
async function esperarSubida(page, cfg, nombre, selFids) {
  const sel = selFids || cfg.subido
  const hay = await page.locator(sel).count()
  if (!hay) {
    throw new Error(`No encontre "${sel}" en ${cfg.add}, que es como se sabe que la `
      + 'subida termino. Corregi "media.subido" en el mapping.')
  }
  await page.waitForFunction((s2) => {
    const el = document.querySelector(s2)
    const v = el && el.value
    return !!v && v !== '0'
  }, sel, { timeout: 120000 }).catch(() => {
    throw new Error(`Drupal no termino de subir "${nombre}" (${sel} sigue vacio). `
      + 'Puede ser el archivo (medida o peso) o el servidor. Se puede volver a correr: '
      + 'las que ya estan se saltean.')
  })
  // El AJAX redibuja el widget entero: si se escribe encima mientras vuelve, se pierde.
  await esperarAjax(page)
}

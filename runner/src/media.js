// Subir imagenes a la MEDIA LIBRARY de Drupal, de a una, con la sesion ya abierta.
//
// Es IDEMPOTENTE a proposito: antes de subir busca si ya hay un media con ese nombre y
// lo saltea. Un media de Drupal se REUTILIZA — la misma imagen se referencia desde
// cuantos paragraphs haga falta —, asi que subir de nuevo en cada corrida solo llenaria
// la libreria de duplicados, y limpiarlos despues no lo hace nadie.
//
// El nombre del media es el nombre del archivo sin extension. Ese nombre es el
// identificador con el que el manifiesto va a pedir la imagen.
import { readdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { esperarAjax, esperarVisible } from './esperas.js'

// Los selectores salen del HTML REAL de /media/add/image de este sitio, no de un Drupal
// generico. Si en otro sitio son distintos se corrigen en el mapping bajo "media", sin
// tocar el codigo.
export const MEDIA_POR_DEFECTO = {
  add: '/media/add/image',
  lista: '/admin/content/media?name={nombre}',
  archivo: 'input[type="file"]',
  // La señal de que la subida TERMINO. El widget de archivo de Drupal deja este hidden
  // vacio hasta que el AJAX vuelve con el id del archivo subido. Antes se esperaba a que
  // apareciera el campo alt, y en este formulario alt NO EXISTE: se esperaba para siempre
  // a algo que no iba a llegar, y peor, se apretaba Guardar antes de que subiera nada.
  subido: 'input[name="field_media_image[0][fids]"]',
  // Este formulario no tiene alt. Otros si: si esta, se llena; si no, no pasa nada.
  alt: 'input[name$="[alt]"]',
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
  const archivos = readdirSync(carpeta).filter((f) => f.endsWith('.png'))
    .filter((f) => !solo || f.includes(solo)).sort()
  if (!archivos.length) throw new Error(`No hay ningun PNG en ${carpeta}`)

  await page.goto(url('/user'), { waitUntil: 'domcontentloaded' })
  if (/\/user\/login/.test(page.url())) {
    throw new Error('No hay sesion en Drupal. Abri page-runner y toca "Conectar con Drupal" primero.')
  }

  let subidos = 0
  let salteados = 0
  onStep(`${archivos.length} imagenes para subir a ${mapping.site}`)

  for (const archivo of archivos) {
    const nombre = basename(archivo, '.png')

    // ¿Ya esta? Se busca el nombre EXACTO: uno mas largo puede contener a este.
    await page.goto(url(cfg.lista.replace('{nombre}', encodeURIComponent(nombre))),
      { waitUntil: 'domcontentloaded' })
    if (await page.getByText(nombre, { exact: true }).count().catch(() => 0)) {
      salteados += 1
      onStep(`  =  ${nombre} (ya estaba)`)
      continue
    }

    await page.goto(url(cfg.add), { waitUntil: 'domcontentloaded' })
    const file = page.locator(cfg.archivo).first()
    if (!(await file.count())) {
      throw new Error(`No encontre el campo de archivo en ${cfg.add} (${cfg.archivo}). `
        + 'Si el formulario de medios de este sitio es otro, corregi "media" en el mapping.')
    }
    await file.setInputFiles(join(carpeta, archivo))
    await esperarSubida(page, cfg, nombre)

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
        + ` — subidas antes de frenar: ${subidos}. Se puede volver a correr: las que ya estan se saltean.`)
    }
    subidos += 1
    onStep(`  +  ${nombre}`)
  }
  return { subidos, salteados, total: archivos.length }
}

// Un campo OPCIONAL: si el formulario no lo tiene, se sigue de largo AL INSTANTE. Nada
// de esperar un rato "por las dudas": el alt no esta en este formulario y esperarlo en
// cada imagen son minutos regalados, que es justo lo que hacia antes.
async function siEsta(page, sel, ms = 2000) {
  if (!(await page.locator(sel).count())) return null
  return esperarVisible(page, sel, ms)
}

// Drupal sube el archivo por AJAX apenas cambia el input, y hasta que vuelve el
// formulario no tiene ni nombre ni nada que guardar. Se espera al `fids`, que es el
// unico dato que dice "el archivo YA esta en el servidor".
async function esperarSubida(page, cfg, nombre) {
  const hay = await page.locator(cfg.subido).count()
  if (!hay) {
    throw new Error(`No encontre "${cfg.subido}" en ${cfg.add}, que es como se sabe que la `
      + 'subida termino. Corregi "media.subido" en el mapping.')
  }
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel)
    const v = el && el.value
    return !!v && v !== '0'
  }, cfg.subido, { timeout: 120000 }).catch(() => {
    throw new Error(`Drupal no termino de subir "${nombre}" (${cfg.subido} sigue vacio). `
      + 'Puede ser el archivo (medida o peso) o el servidor. Se puede volver a correr: '
      + 'las que ya estan se saltean.')
  })
  // El AJAX redibuja el widget entero: si se escribe encima mientras vuelve, se pierde.
  await esperarAjax(page)
}

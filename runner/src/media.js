// Subir imagenes a la MEDIA LIBRARY de Drupal, de a una, con la sesion ya abierta.
//
// Es IDEMPOTENTE a proposito: antes de subir busca si ya hay un media con ese nombre y
// lo saltea. Un media de Drupal se REUTILIZA — la misma imagen se referencia desde
// cuantos paragraphs haga falta —, asi que subir de nuevo en cada corrida solo llenaria
// la librería de duplicados, y limpiarlos despues no lo hace nadie.
//
// El nombre del media es el nombre del archivo sin extension. Ese nombre es el
// identificador con el que el manifiesto va a pedir la imagen.
import { readdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'

// Formulario de "crear medio" de un Drupal estandar. Si este sitio lo tiene distinto se
// corrige en el mapping bajo "media", sin tocar el codigo.
export const MEDIA_POR_DEFECTO = {
  add: '/media/add/image',
  lista: '/admin/content/media?name={nombre}',
  archivo: 'input[type="file"]',
  nombre: 'input[name="name[0][value]"]',
  alt: 'input[name$="[alt]"]',
  guardar: 'input[name="op"][value="Guardar"], input[name="op"][value="Save"]',
  alUsar: 'Placeholder de prueba',
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

    // Drupal sube el archivo por AJAX y recien despues muestra el alt: que aparezca es la
    // señal de que la subida termino.
    const alt = page.locator(cfg.alt).first()
    await alt.waitFor({ state: 'visible', timeout: 60000 }).catch(() => {})
    if (await alt.count()) await alt.fill(cfg.alUsar)

    // El nombre del media es el identificador: se fuerza al del archivo.
    const campoNombre = page.locator(cfg.nombre).first()
    if (await campoNombre.count()) await campoNombre.fill(nombre)

    await page.locator(cfg.guardar).first().click()
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

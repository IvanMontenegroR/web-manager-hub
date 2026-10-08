// Crea un medio ADENTRO del formulario (inline entity form con un solo boton, "Añadir nuevo
// elemento multimedia"). Es el widget del fondo de una pestaña (`comp_tabs_tab_item` /
// `field_c_image`): a diferencia del resto de los campos de imagen, NO ofrece "elemento
// multimedia existente", asi que no hay medio de la libreria que elegir — hay que crearlo
// ahi, subiendo los dos archivos (desktop y mobile) del mismo responsive image.
//
// Los archivos son los que dejo `imagenes.mjs` en imagenes/<pagina>/, con el nombre del
// medio: `<nombre>-desktop.<ext>` y `<nombre>-mobile.<ext>`.
//
// Leido del formulario de content (2026-10): Nombre, "Añadir archivo nuevo" desktop
// (field_media_image) y mobile (field_image_mobile), y "Crear elemento multimedia".
import { readdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { esperarAjax, esperarVisible } from './esperas.js'

const SEL = {
  abrir: '[data-drupal-selector$="-actions-ief-add"]',
  nombre: 'input[name$="[name][0][value]"]',
  archivo: (campo) => `input[type="file"][name*="_${campo}_0"]`,
  fids: (campo) => `input[name$="[${campo}][0][fids]"]`,
  alt: (campo) => `input[name$="[${campo}][0][alt]"]`,
  crear: '[data-drupal-selector$="-ief-add-save"]',
}

/** Los dos archivos de un medio, buscados en imagenes/<cualquier pagina>/. */
export function archivosDelMedio(nombre, raiz = resolve('imagenes')) {
  if (!existsSync(raiz)) return {}
  for (const dir of readdirSync(raiz, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue
    const archivos = readdirSync(join(raiz, dir.name))
    const de = (vista) => archivos.find((a) => a.startsWith(`${nombre}-${vista}.`))
    if (de('desktop')) {
      return {
        desktop: join(raiz, dir.name, de('desktop')),
        mobile: de('mobile') ? join(raiz, dir.name, de('mobile')) : join(raiz, dir.name, de('desktop')),
      }
    }
  }
  return {}
}

async function subir(page, campo, cual, archivo, alt, ref) {
  const input = page.locator(`${campo} ${SEL.archivo(cual)}`).first()
  if (!(await input.count())) throw new Error(`No encontre el campo de archivo "${cual}" de ${ref}`)
  await input.setInputFiles(archivo)
  // Drupal sube solo al elegir el archivo; si el JS no lo dispara, esta el boton.
  const boton = page.locator(`${campo} input[name$="_${cual}_0_upload_button"]`).first()
  const fids = page.locator(`${campo} ${SEL.fids(cual)}`).first()
  const hasta = Date.now() + 90000
  let apretado = false
  while (Date.now() < hasta) {
    const v = await fids.inputValue().catch(() => '')
    if (v) break
    if (!apretado && Date.now() > hasta - 80000 && (await boton.count()) && (await boton.isVisible().catch(() => false))) {
      await boton.dispatchEvent('mousedown').catch(() => {}); apretado = true
    }
    await page.waitForTimeout(500)
  }
  if (!(await fids.inputValue().catch(() => ''))) throw new Error(`El archivo ${cual} de ${ref} no termino de subir`)
  await esperarAjax(page)
  const a = page.locator(`${campo} ${SEL.alt(cual)}`).first()
  if (await a.count()) await a.fill(alt)
}

export async function crearMedioEnLinea({ page, campo, nombre, alt, ref }) {
  const archivos = archivosDelMedio(nombre)
  if (!archivos.desktop) {
    throw new Error(`No encontre los archivos del medio "${nombre}" (${ref}) en imagenes/. `
      + 'Corre primero imagenes.mjs para esa pagina.')
  }
  const abrir = await esperarVisible(page, `${campo} ${SEL.abrir}`, 10000)
  if (!abrir) throw new Error(`No encontre "Añadir nuevo elemento multimedia" en ${ref} (${campo})`)
  await abrir.dispatchEvent('mousedown')
  await esperarAjax(page)
  const n = await esperarVisible(page, `${campo} ${SEL.nombre}`, 15000)
  if (!n) throw new Error(`No aparecio el formulario del medio nuevo de ${ref}`)
  await n.fill(nombre)
  await subir(page, campo, 'field_media_image', archivos.desktop, alt, ref)
  await subir(page, campo, 'field_image_mobile', archivos.mobile, alt, ref)
  const crear = page.locator(`${campo} ${SEL.crear}`).first()
  if (!(await crear.count())) throw new Error(`No encontre "Crear elemento multimedia" en ${ref}`)
  await crear.dispatchEvent('mousedown')
  await esperarAjax(page)
  await page.waitForTimeout(1500)
  const texto = await page.locator(`${campo} table`).first().innerText().catch(() => '')
  if (!texto.includes(nombre)) {
    const err = await page.locator(`${campo} .form-item--error-message, ${campo} .messages--error`).allInnerTexts().catch(() => [])
    throw new Error(`Cree "${nombre}" en ${ref} pero el campo no lo muestra. ${err.join(' ').slice(0, 160)}`)
  }
  return { texto }
}

// ELEGIR una imagen que YA esta en la Media library. Nunca subirla.
//
// La regla no es un detalle de implementacion, es la regla de la casa: el runner no crea
// medios. Si la imagen que pide el manifiesto no esta, FRENA y dice cual falta. Subir por
// las suyas llenaria la libreria de duplicados — un medio de Drupal se reutiliza — y
// nadie los limpia despues. Para subir esta `npm run subir-placeholders`, que es otra
// cosa y se corre a proposito.
//
// En este CMS el campo de imagen es un INLINE ENTITY FORM con dos botones:
//   "Añadir nuevo elemento multimedia"      -> crea uno (el runner NO lo toca)
//   "Añadir elemento multimedia existente"  -> abre un autocompletar (este)
// El autocompletar es el de Drupal: se teclea, baja una lista, se elige, y un segundo
// boton confirma. Hay que TECLEAR de verdad — un `fill` no dispara el autocompletar,
// que escucha las teclas.
import { esperarAjax, esperarVisible } from './esperas.js'

// Sacados del HTML real del formulario. Van por `data-drupal-selector` terminado en, y
// acotados al fieldset del campo, porque el nombre completo del boton lleva adentro toda
// la ruta del paragraph (`ief-field_ln_n_components-1-subform-…`) y armarla a mano es
// pedir que se rompa. Se pueden pisar desde el mapping en "mediaExistente".
export const MEDIA_EXISTENTE = {
  abrir: '[data-drupal-selector$="-actions-ief-add-existing"]',
  buscar: 'input[data-drupal-selector$="-entity-id"]',
  opciones: 'ul.ui-autocomplete li',
  confirmar: '[data-drupal-selector$="-ief-reference-save"]',
  error: '.form-item--error-message, .messages--error',
}

export async function elegirMedia({ page, campo, nombre, cfg, ref }) {
  const c = { ...MEDIA_EXISTENTE, ...(cfg || {}) }

  const abrir = await esperarVisible(page, `${campo} ${c.abrir}`, 10000)
  if (!abrir) {
    throw new Error(`No encontre el boton "elemento multimedia existente" de ${ref} `
      + `(${campo} ${c.abrir}). Si este campo no es un inline entity form, corregi `
      + '"mediaExistente" en el mapping.')
  }
  await abrir.click()
  await esperarAjax(page)

  const input = await esperarVisible(page, `${campo} ${c.buscar}`, 15000)
  if (!input) throw new Error(`No aparecio el buscador de medios de ${ref} (${campo} ${c.buscar})`)

  // Tecleado de verdad: el autocompletar de Drupal escucha teclas, no valores.
  await input.click()
  await input.fill('')
  await input.pressSequentially(nombre, { delay: 25 })

  // La lista tarda: es una consulta al servidor por cada tecleo.
  const opcion = await esperarOpcion(page, c.opciones, nombre, 12000)
  if (opcion) {
    await opcion.click()
  } else {
    // Sin lista, Drupal igual resuelve un nombre EXACTO si es unico. Si no existe, lo
    // dice el propio formulario al confirmar, y eso se lee abajo.
    await input.fill(nombre)
  }

  const ok = await esperarVisible(page, `${campo} ${c.confirmar}`, 10000)
  if (!ok) throw new Error(`No encontre el boton que confirma el medio de ${ref} (${c.confirmar})`)
  await ok.click()
  await esperarAjax(page)

  // Confirmar tambien va por AJAX: el resultado — la fila con el medio, o la queja de que
  // no existe — llega despues. Leer una sola vez es leer antes de tiempo.
  const hasta = Date.now() + 20000
  for (;;) {
    const queja = await page.locator(`${campo} ${c.error}`).allInnerTexts().catch(() => [])
    const texto = (queja.join(' ') || '').replace(/\s+/g, ' ').trim()
    if (texto) {
      throw new Error(`Drupal no acepto la imagen "${nombre}" en ${ref}: ${texto.slice(0, 200)}. `
        + 'Si el medio no existe todavia, subi los placeholders: npm run subir-placeholders')
    }
    const puesto = await leerMedia(page, campo)
    if (puesto.includes(nombre) || Date.now() > hasta) return puesto
    await page.waitForTimeout(200)
  }
}

// Lo que el campo muestra ahora. Con el medio puesto, el inline entity form dibuja una
// fila con su nombre; es la unica forma de comprobar que quedo.
export async function leerMedia(page, campo) {
  const t = await page.locator(campo).first().innerText().catch(() => '')
  return String(t).replace(/\s+/g, ' ').trim()
}

// La opcion cuyo texto es EXACTAMENTE el nombre pedido. Un nombre puede ser prefijo de
// otro (…-desktop-2100x1050 y …-desktop-2100x1050-v2), y elegir el que no era pasa
// desapercibido hasta que alguien mira la pagina.
async function esperarOpcion(page, sel, nombre, ms) {
  const hasta = Date.now() + ms
  for (;;) {
    const loc = page.locator(sel)
    const n = await loc.count()
    for (let i = 0; i < n; i++) {
      const it = loc.nth(i)
      if (!(await it.isVisible().catch(() => false))) continue
      const t = (await it.innerText().catch(() => '')).trim()
      if (t === nombre) return it
    }
    if (Date.now() > hasta) return null
    await page.waitForTimeout(200)
  }
}

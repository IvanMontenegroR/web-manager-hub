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

  // Se le pregunta a Drupal DIRECTO, por el mismo endpoint que usa el autocompletar. El
  // input trae su ruta en `data-autocomplete-path`, con el token y todo. Tres ventajas
  // sobre teclear y esperar que baje la lista: devuelve el valor exacto que Drupal quiere
  // ("Nombre (id)"), no depende de que la lista aparezca, y cuando NO hay resultado se
  // puede decir que SI hay, que es lo unico que sirve para arreglarlo.
  const opciones = await consultar(page, input, nombre)
  const hay = Array.isArray(opciones) ? opciones : []
  const exacta = hay.find((o) => etiqueta(o) === nombre)

  if (exacta) {
    // El valor de maquina es "Nombre (id)": es lo que Drupal valida al confirmar.
    await input.fill(String(exacta.value ?? nombre))
  } else if (opciones === null) {
    // Sin endpoint (otro widget, otro Drupal): se vuelve a teclear y esperar la lista.
    await input.click()
    await input.fill('')
    await input.pressSequentially(nombre, { delay: 25 })
    const opcion = await esperarOpcion(page, c.opciones, nombre, 12000)
    if (opcion) await opcion.click()
    else await input.fill(nombre)
  } else {
    // Aca esta la respuesta que faltaba: que hay en la libreria que se le parezca.
    const parecidos = await consultar(page, input, recorte(nombre))
    const nombres = (parecidos || []).map(etiqueta).filter(Boolean).slice(0, 8)
    throw new Error(`No hay ningun medio llamado "${nombre}" (${ref}). `
      + (nombres.length
        ? `En la libreria, empezando por "${recorte(nombre)}", hay: ${nombres.join(' | ')}. `
          + 'Si los nombres tienen otra forma, el manifiesto tiene que usar ESA.'
        : `Tampoco hay nada que empiece con "${recorte(nombre)}": esa imagen no se subio. `
          + 'Subila desde la interfaz, en "Imagenes de prueba".'))
  }

  // Escribir en el autocompletar dispara su propia consulta al servidor. Apretar
  // Confirmar sin esperarla es encimarle otra peticion, y Drupal contesta "Oops,
  // something went wrong" — el mismo choque que rompia los botones de agregar.
  await esperarAjax(page)
  const enElCampo = await input.inputValue().catch(() => null)

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
      // Lo que sabe el runner va PRIMERO: si Drupal se explaya, el recorte se come su
      // mensaje y no el nuestro. Y lo que hace falta para entender esto es justamente
      // que devolvio el buscador y que quedo escrito en el campo.
      throw new Error(`Drupal no acepto la imagen "${nombre}" en ${ref}. `
        + `El buscador devolvio ${hay.length} opcion(es)`
        + (exacta ? `, la exacta era ${JSON.stringify(String(exacta.value))}` : ' y ninguna exacta')
        + `; en el campo quedo ${JSON.stringify(enElCampo)}. `
        + `Drupal dice: ${texto.slice(0, 300)}`)
    }
    const puesto = await leerMedia(page, campo)
    if (puesto.includes(nombre) || Date.now() > hasta) return puesto
    await page.waitForTimeout(200)
  }
}

// Le pregunta al endpoint del autocompletar que hay para ese texto. Devuelve la lista, o
// null si este input no declara endpoint (y entonces hay que teclear a mano).
// Va por `page.request`, que usa las cookies de la sesion abierta: no navega, asi que no
// se lleva puesto el formulario a medio armar.
async function consultar(page, input, texto) {
  const ruta = await input.getAttribute('data-autocomplete-path').catch(() => null)
  if (!ruta) return null
  const url = new URL(ruta, page.url())
  url.searchParams.set('q', texto)
  try {
    const r = await page.request.get(url.href, { headers: { accept: 'application/json' } })
    if (!r.ok()) return null
    const j = await r.json()
    return Array.isArray(j) ? j : []
  } catch { return null }
}

// Drupal devuelve `label` con HTML escapado y `value` como "Nombre (id)". El nombre
// limpio es lo que se compara contra el manifiesto.
const etiqueta = (o) => String(o?.label ?? o?.value ?? '')
  .replace(/<[^>]*>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#0?39;/g, "'")
  .replace(/\s*\(\d+\)\s*$/, '')
  .trim()

// Un prefijo para buscar parecidos: sin la medida ni la vista del final, que es justo
// donde suelen estar las diferencias.
const recorte = (nombre) => nombre.split('-').slice(0, 3).join('-') || nombre

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

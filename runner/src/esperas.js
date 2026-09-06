// Las dos esperas que hacen falta en CUALQUIER formulario de Drupal, no solo en el de
// paragraphs: por eso viven aparte del motor y las usan tambien el subidor de medios.

// Drupal no termina de procesar una peticion AJAX cuando el DOM ya cambio: hay un rato
// en el que la anterior sigue viva. Si se le encima otra, el servidor contesta con
// "Oops, something went wrong" y NO pasa nada — que es exactamente lo que se ve cuando
// se elige el tipo en un desplegable (que tambien tiene AJAX) y se aprieta el boton en
// el mismo instante. Asi que se espera a que no quede ninguna en vuelo.
export async function esperarAjax(page, max = 20000) {
  await page.waitForTimeout(120)   // que la peticion alcance a arrancar
  await page.waitForFunction(() => {
    const hayThrobber = !!document.querySelector('.ajax-progress, .ajax-progress-throbber, .ajax-progress-fullscreen')
    const D = window.Drupal
    const enVuelo = D && D.ajax && Array.isArray(D.ajax.instances)
      && D.ajax.instances.some((i) => i && i.ajaxing)
    return !hayThrobber && !enVuelo
  }, null, { timeout: max }).catch(() => { /* si no se puede saber, se sigue igual */ })
}

// El PRIMERO QUE SE VEA, no el primero del DOM. Un mismo `name` puede estar repetido —
// el formulario de paragraphs trae el dialogo de tipos escondido, y Gin repite el boton
// Guardar en su barra pegajosa —, asi que `.first()` puede quedarse esperando para
// siempre a un elemento que nunca se muestra.
export async function esperarVisible(page, sel, ms) {
  const hasta = Date.now() + ms
  for (;;) {
    const loc = page.locator(sel)
    const n = await loc.count()
    for (let i = 0; i < n; i++) if (await loc.nth(i).isVisible().catch(() => false)) return loc.nth(i)
    if (Date.now() > hasta) return null
    await page.waitForTimeout(250)
  }
}

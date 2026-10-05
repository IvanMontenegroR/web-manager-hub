// El paragraph Block: elegir el bloque RECARGA el formulario (AJAX) y los productos son un
// campo que se repite con "Añadir otro elemento". Formulario de mentira, navegador de verdad.
import { chromium } from 'playwright-core'
import { fillField, llenarLista } from '../src/build.js'
import { esperarAjax } from '../src/esperas.js'

const B = 'field_ln_n_components[0][subform]'
const HTML = `<!doctype html><html><body><form>
<select name="${B}[field_block][0][plugin_id]"><option value="">-</option><option value="pl_product_selected_product_block">Selected Product</option></select>
<div id="settings"></div>
<script>
  // Como Drupal: mientras la peticion esta en vuelo hay un throbber, y la configuracion
  // aparece DESPUES. Llenar antes de que llegue es escribirle a un campo que no existe.
  document.querySelector('select').addEventListener('change', () => {
    const t = document.createElement('div'); t.className = 'ajax-progress'; document.body.appendChild(t)
    setTimeout(() => {
      document.getElementById('settings').innerHTML =
        '<select name="${B}[field_block][0][settings][display_type]"><option value="list">Listado</option><option value="carousel">Carousel</option></select>'
        + '<div id="filas"><input name="${B}[field_block][0][settings][items_fixed_products][0][fixed_products]"></div>'
        + '<input type="submit" name="field_ln_n_components_0_subform_field_block_0_settings_items_fixed_products_add_more" value="Añadir otro elemento">'
      document.querySelector('[value="Añadir otro elemento"]').addEventListener('click', (e) => {
        e.preventDefault()
        const n = document.querySelectorAll('#filas input').length
        const t2 = document.createElement('div'); t2.className = 'ajax-progress'; document.body.appendChild(t2)
        setTimeout(() => {
          document.getElementById('filas').insertAdjacentHTML('beforeend', '<input name="${B}[field_block][0][settings][items_fixed_products][' + n + '][fixed_products]">')
          t2.remove()
        }, 400)
      })
      t.remove()
    }, 600)
  })
</script></form></body></html>`

let fallas = 0
const ok = (c, m) => { console.log(`  ${c ? 'ok' : 'FALLA'}  ${m}`); if (!c) fallas++ }
const browser = await chromium.launch({ executablePath: process.env.RUNNER_CHROME || undefined })
const page = await browser.newPage()
await page.setContent(HTML)
const ctx = { page, mapping: {}, onStep: () => {}, escritos: [] }
const vars = { base: B, npath: 'field_ln_n_components_0', dsel: 'x' }
const plugin = { sel: 'select[name="{base}[field_block][0][plugin_id]"]', kind: 'select', ajax: true }
await fillField(ctx, plugin, vars, 'pl_product_selected_product_block', 'plugin')
await esperarAjax(page)
ok(await page.locator(`select[name="${B}[field_block][0][settings][display_type]"]`).count() === 1, 'despues del AJAX aparece la configuracion del bloque')
await fillField(ctx, { sel: 'select[name="{base}[field_block][0][settings][display_type]"]', kind: 'select' }, vars, 'carousel', 'display')
const lista = { kind: 'lista', sel: 'input[name="{base}[field_block][0][settings][items_fixed_products][{i}][fixed_products]"]',
  add: 'input[name="{npath}_subform_field_block_0_settings_items_fixed_products_add_more"]' }
const productos = ['Producto A (1)', 'Producto B (2)', 'Producto C (3)']
const escritos = await llenarLista(ctx, lista, vars, productos, 'productos')
const valores = await page.locator('#filas input').evaluateAll((els) => els.map((e) => e.value))
ok(JSON.stringify(valores) === JSON.stringify(productos), `los 3 productos, cada uno en su fila (${JSON.stringify(valores)})`)
ok(escritos.length === 3, 'y cada fila queda verificada')
await browser.close()
console.log(fallas ? `\n${fallas} falla/s` : '\nTodo bien.')
process.exit(fallas ? 1 : 0)

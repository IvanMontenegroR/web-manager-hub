// El MOTOR: toma un manifiesto + un mapping y arma la pagina en el formulario de
// Drupal, manejando el navegador con la sesion que vos ya abriste.
//
// Reglas de la casa, y no son negociables:
//   - El tilde "Publicado" queda como lo pide el manifiesto (`page.published`, por defecto
//     borrador). Las paginas del hub van PUBLICADAS: es la regla de content.
//   - No modifica contenido existente: solo entra a "crear contenido". La unica excepcion es
//     `page.nid`, que AGREGA bloques al final de una pagina nuestra (confirmada por el alias)
//     sin tocar lo que ya tenia.
//   - Si algo no cuadra, FRENA. Un campo que no aparece es un error, no un aviso: una
//     pagina a medio armar es peor que una que no se armo.
//   - Las IMAGENES se ELIGEN de la Media library por su nombre, nunca se suben. Si la
//     que pide el manifiesto no esta, frena y dice cual falta.
import { resolveSelector, rowSelector, widgetDsel, namePath, fieldWrapper, listPath, KINDS_SIN_SELECTOR } from './mapping.js'
import { esperarAjax, esperarVisible } from './esperas.js'
import { esperarEditor, escribirRich, leerRich, diagnosticoRich, prepararPagina, sinMarcas } from './richtext.js'
import { elegirMedia, leerMedia } from './mediaExistente.js'
import { crearMedioEnLinea } from './mediaNuevo.js'
import { ALT_DE_RESERVA } from './media.js'
import { elegirDeLaLibreria, leerSeleccion } from './mediaLibrary.js'

// Los que el runner todavia NO sabe tocar. `media` salio de la lista: ese si se elige.
// La lista vive en el mapping porque es la misma que decide que campo puede no declarar
// selector — son la misma idea dicha dos veces si se escriben aparte.
const IMAGE_KINDS = KINDS_SIN_SELECTOR
const MAX_DELTA = 100
// Cuantas veces se vuelve a intentar un alta que fallo POR EL SERVIDOR.
const REINTENTOS = 3
const culpaDelServidor = (lineas) => lineas.some((t) => /HTTP (5\d\d|429)\b/.test(t))

export async function buildPage({ page, mapping, manifest, save = false, onStep = () => {}, esperaSubform = 45000 }) {
  // Drupal, cuando algo falla, dice "revisa la consola del navegador". El runner puede
  // hacer eso: se escuchan los errores y se pegan al mensaje si la corrida termina mal.
  const consola = []
  const anotar = (t) => { if (consola.length < 40) consola.push(String(t).replace(/\s+/g, ' ').slice(0, 200)) }
  const oyentes = [
    ['console', (m) => { if (m.type() === 'error') anotar(m.text()) }],
    ['pageerror', (e) => anotar('JS: ' + e.message)],
    ['response', (r) => { if (r.status() >= 400) anotar(`HTTP ${r.status()} ${r.url()}`) }],
  ]
  for (const [ev, fn] of oyentes) page.on(ev, fn)
  try {
    return await armarPagina({ page, mapping, manifest, save, onStep, esperaSubform, consola })
  } catch (e) {
    if (consola.length) e.message += ` — La consola del navegador dice: ${consola.slice(-3).join(' | ')}`
    throw e
  } finally {
    for (const [ev, fn] of oyentes) page.off(ev, fn)
  }
}

async function armarPagina({ page, mapping, manifest, save, onStep, esperaSubform, consola = [] }) {
  const site = mapping.site.replace(/\/+$/, '')
  // AGREGAR a una pagina que ya existe (`page.nid`): se abre su formulario de edicion y los
  // bloques del manifiesto van AL FINAL. Lo que ya tenia no se toca. Sirve para armar una
  // pagina larga en varias vueltas, guardando entre una y otra: un alta enorme en un solo
  // formulario es la que se corta a mitad de camino.
  const agregar = manifest.page.nid ? String(manifest.page.nid) : null
  const url = agregar ? `${site}/node/${agregar}/edit` : new URL(mapping.nodeAdd, site + '/').href

  onStep(`Abriendo ${url}`)
  await prepararPagina(page)

  // No se pisa nada: si la direccion ya responde en el sitio (una pagina, una redireccion,
  // algo despublicado), se frena ANTES de tocar el formulario. Crear igual dejaria dos
  // nodos peleando por el mismo alias, y Drupal le pondria "-0" al nuestro sin avisar.
  if (manifest.page.path && !agregar) {
    const destino = site + manifest.page.path
    const r = await page.request.get(destino, { maxRedirects: 0, failOnStatusCode: false })
    if (r.status() !== 404) {
      throw new Error(`${manifest.page.path} ya existe en el sitio (responde ${r.status()}). `
        + 'No se crea para no pisar nada: si hay que reemplazarla, se decide aparte.')
    }
  }

  // LAS REFERENCIAS A PRODUCTOS tienen que existir. Un producto borrado o despublicado
  // no falla al escribirlo: falla al GUARDAR, con todo el formulario ya cargado. Se
  // revisan antes de empezar.
  const faltan = await referenciasQueFaltan(page, site, manifest, mapping)
  if (faltan.length) {
    throw new Error(`Estos productos no existen en el sitio: ${faltan.join(' | ')}. `
      + 'Corregí productosMuestra en el mapping (o el manifiesto) y volvé a correr.')
  }
  if (contarReferencias(manifest, mapping)) onStep('Productos referenciados: todos existen en el sitio')

  await page.goto(url, { waitUntil: 'domcontentloaded' })

  if (/\/user\/login/.test(page.url())) {
    throw new Error('Drupal pidio login. Corre primero: page-runner login')
  }

  // Agregando, la pagina tiene que ser la que dice el manifiesto: se confirma por el alias
  // antes de tocar nada. Titulo, alias, publicado y marca quedan como estan.
  if (agregar) {
    const alias = mapping.path ? await page.locator(mapping.path).first().inputValue().catch(() => null) : null
    if (!manifest.page.path || alias !== manifest.page.path) {
      throw new Error(`El node ${agregar} tiene el alias ${alias ?? '(ninguno)'} y el manifiesto pide `
        + `${manifest.page.path || '(ninguno)'}: no se agrega nada a una pagina que no es la del manifiesto.`)
    }
    onStep(`Agregando al final de ${alias} (node ${agregar})`)
  } else {
    onStep(`Titulo: ${manifest.page.title}`)
    await escribir(page.locator(mapping.title).first(), manifest.page.title)

    // El alias esta DESHABILITADO mientras Pathauto lo genere solo: hay que destildarlo
    // antes de poder escribirlo.
    if (manifest.page.path && mapping.path) {
      if (mapping.pathauto) {
        const auto = page.locator(mapping.pathauto).first()
        if (await auto.count()) await tildar(auto, false)
      }
      onStep(`Alias: ${manifest.page.path}`)
      await escribir(page.locator(mapping.path).first(), manifest.page.path)
    }

    // El tilde "Publicado" queda como lo pide el manifiesto (por defecto destildado). En
    // content viene TILDADO de entrada y vive fuera del <form>, en la barra de Gin: por eso
    // se fija siempre, para que el resultado no dependa del default del sitio.
    if (mapping.published) {
      const wants = manifest.page.published === true
      const box = page.locator(mapping.published).first()
      if (await box.count()) await tildar(box, wants)
      onStep(wants ? 'Queda PUBLICADA' : 'Queda en BORRADOR')
    }

    // La MARCA. Es la que le pone los colores a toda la pagina (fondo, texto por defecto,
    // acentos), asi que una marca que no se encuentra FRENA: dejarla en "- Ninguno -" sacaria
    // una pagina de Pro Plan en blanco y negro sin que nadie lo note.
    if (mapping.brand) {
      const sel = page.locator(mapping.brand).first()
      const quiere = claveMarca(manifest.page.brand)
      if (quiere && await sel.count()) {
        const opciones = await sel.locator('option').evaluateAll((os) => os.map((o) => ({ value: o.value, label: o.textContent })))
        const elegida = opciones.find((o) => claveMarca(o.label) === quiere)
        if (!elegida) {
          throw new Error(`La marca "${manifest.page.brand}" no esta en el campo Brand del sitio `
            + `(ofrece: ${opciones.filter((o) => o.value !== '_none').map((o) => o.label.trim()).join(', ')}).`)
        }
        await revelar(sel)
        await sel.selectOption(elegida.value)
        onStep(`Marca: ${elegida.label.trim()}`)
      } else if (quiere) {
        throw new Error(`La pagina es de ${manifest.page.brand} pero el formulario no tiene el campo Brand (${mapping.brand}).`)
      } else {
        onStep('Marca: ninguna (tema Purina)')
      }
  }
  }

  const ctx = { mapping, page, onStep, esperaSubform, consola,
    escritos: [], pendientes: [], listas: new Set(), imagenes: [], precreadas: new Map(), classyAnidado: [] }
  const root = { dsel: mapping.paragraphs.dsel, base: mapping.paragraphs.base, add: mapping.paragraphs.add }
  ctx.root = root
  // Agregando, las filas que ya tiene la pagina llegan PLEGADAS (sin campos en el DOM) y
  // `filasPrevias` las veria vacias: se marcan como que no hay nada para reusar, asi un
  // bloque del mismo tipo nunca cae encima de uno que ya tenia contenido.
  if (agregar) ctx.precreadas.set(root.dsel, [])

  onStep('Armando la estructura…')
  let n = 0
  for (const block of manifest.blocks) {
    n += 1
    await addBlock(ctx, block, `${n}`, root)
  }

  // Paragraphs CIERRA las filas ya agregadas cada vez que se agrega otra: en vez del
  // subform queda un resumen y los campos directamente NO existen en el DOM. Antes de
  // llenar hay que volver a abrirlas. Cada lista trae un boton que las abre todas de
  // una; van de afuera hacia adentro, porque la lista de un contenedor no existe hasta
  // que su fila esta abierta.
  for (const tpl of ctx.listas) {
    // Agregando NO se abre la lista de la pagina: abriria tambien todos los bloques que ya
    // tenia, y con 15+ bloques abiertos el formulario manda tantos campos que el servidor
    // descarta el envio sin decir nada ("no guardo", sin mensaje). Cada bloque nuevo se
    // abre solo, al llenarlo (ver abajo).
    if (agregar && tpl === root.dsel) continue
    const n = listPath(tpl)
    const b = page.locator(`input[name="${n}_edit_all"], button[name="${n}_edit_all"]`).first()
    if (await b.count() && await b.isVisible().catch(() => false)) {
      await b.click()
      await esperarAjax(page)
    }
  }

  onStep('Llenando los campos…')
  if (agregar) {
    // Abrir una fila pliega la anterior (Drupal se queda con lo cargado, pero los campos
    // salen del DOM): cada bloque se verifica apenas se llena, antes de abrir el siguiente.
    for (const p of ctx.pendientes) {
      const desde = ctx.escritos.length
      await llenarBloque(ctx, p)
      const problemas = await revisarEscritos(page, ctx.escritos.slice(desde))
      if (problemas.length) {
        throw new Error(`Se llenaron los campos pero no quedaron como se escribieron: ${problemas.join('; ')}.`)
      }
    }
    onStep(`Campos escritos y verificados: ${ctx.escritos.filter(Boolean).length}`)
  } else {
    for (const p of ctx.pendientes) await llenarBloque(ctx, p)
  }

  // Repaso final. Agregar un bloque hace que Drupal re-dibuje el formulario, asi que un
  // campo que quedo bien al escribirlo puede haberse vaciado despues. Mejor enterarse
  // aca que descubrir la pagina vacia en el CMS.
  // Se compara contra lo que quedo AL ESCRIBIRLO, no contra lo que pedia el manifiesto:
  // asi tambien se caza un campo que despues cambio a otra cosa, no solo el que se vacio.
  // Un select que se resetea a "- Ninguno -" y uno que queda con otra opcion son el mismo
  // problema, y antes solo se veia el primero.
  const problemas = agregar ? [] : await revisarEscritos(page, ctx.escritos)
  if (problemas.length) {
    throw new Error(`Se llenaron los campos pero al final no quedaron como se escribieron: `
      + `${problemas.join('; ')}. Suele pasar cuando el formulario se vuelve a dibujar `
      + 'despues de escribir.')
  }
  if (!agregar) onStep(`Campos escritos y verificados: ${ctx.escritos.filter(Boolean).length}`)

  if (!save) {
    onStep('Listo (sin guardar). Revisa el formulario y guarda vos.')
    return { saved: false, url: page.url(), imagenes: ctx.imagenes }
  }

  onStep('Guardando…')
  const antes = page.url()
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 120000 }).catch(() => {}),
    page.locator(mapping.save).first().click(),
  ])
  const after = page.url()
  // GUARDADO = Drupal salio del formulario de alta. Si sigue en /node/add (o en la misma
  // URL), lo rechazo: se lee el mensaje de error y se FRENA, en vez de anunciar un guardado
  // que no paso (paso con un producto cuyo nombre tenia una coma).
  if (after === antes || /\/node\/add\/|\/node\/\d+\/edit/.test(after)) {
    const msg = (await page.locator('[role="alert"], .messages--error, [data-drupal-messages] .messages').allInnerTexts().catch(() => []))
      .join(' | ').replace(/\s+/g, ' ').trim().slice(0, 600)
    throw new Error(`Drupal no guardo la pagina (sigue en ${after}). ${msg ? 'Dice: ' + msg : 'Sin mensaje visible.'}`)
  }
  let nodeId = (/\/node\/(\d+)/.exec(after) || [])[1] || null
  nodeId ??= agregar
  nodeId ??= await page.evaluate(() => {
    const h = document.querySelector('link[rel="shortlink"]')?.href
      || [...document.querySelectorAll('a[href*="/node/"]')].map((a) => a.getAttribute('href')).find((x) => /\/node\/\d+\/edit/.test(x)) || ''
    return (/\/node\/(\d+)/.exec(h) || [])[1] || null
  })
  if (ctx.classyAnidado.length) await repasarClassy(ctx, nodeId)
  return { saved: true, url: after, nodeId, imagenes: ctx.imagenes }
}

// Lee de nuevo lo escrito y dice lo que no quedo igual. Se compara contra lo que quedo AL
// ESCRIBIRLO, no contra el manifiesto: asi tambien se caza un campo que cambio a otra cosa.
export async function revisarEscritos(page, escritos) {
  const problemas = []
  for (const w of escritos) {
    if (!w || esVacio(w.valor)) continue
    const hay = await leerCampo(page, w.f, w.selector)
    // Un cuerpo que se vacia solo no dice nada por si mismo: lo que hace falta saber es
    // si el editor estaba, por donde se escribio y quien se quedo con el texto.
    const detalle = w.f.kind === 'richtext'
      ? ` [se escribio por "${w.rutaRich}"; ${await diagnosticoRich(page, page.locator(w.selector).first())}]`
      : ''
    if (esVacio(hay)) problemas.push(`${w.ref} quedo VACIO${detalle}`)
    else if (!igual(hay, w.puesto)) {
      problemas.push(`${w.ref} decia ${cita(w.puesto)} y ahora dice ${cita(hay)}${detalle}`)
    }
  }
  return problemas
}

// El Classy de un paragraph AGREGADO se pierde al guardar: el formulario lo muestra elegido y
// Drupal guarda "Default". Empezo a verse en los anidados (el segundo banner de un Banner
// Wrapper en /proplan/perros) y despues tambien en bloques sueltos (el mosaico de
// /purina-one/por-que-cambiar-a-one quedo con las cajas en el rojo por defecto, el Card Style
// Square de /referencia/cards volvio a Default). Editando el nodo ya guardado SI se guarda, asi
// que despues del alta se vuelve a abrir el formulario, se re-eligen esos valores y se guarda
// de nuevo. Solo se tocan los que quedaron distintos de lo que el runner cargo.
//
// Se abre SOLO la fila de cada bloque que hay que mirar, no "Editar todo": en una pagina larga
// ese AJAX trae el formulario entero y el servidor contesta 502. Abrir una fila pliega la
// anterior, pero Drupal se queda con lo elegido en ella.
export async function repasarClassy(ctx, nodeId) {
  const { mapping, page, onStep, esperaSubform } = ctx
  if (!nodeId) { onStep('AVISO: no se pudo leer el node id para repasar el Classy de los bloques agregados.'); return }
  onStep(`Repasando el Classy de ${ctx.classyAnidado.length} campo(s) en node/${nodeId}…`)
  await page.goto(`${mapping.site}/node/${nodeId}/edit`, { waitUntil: 'domcontentloaded', timeout: 180000 })
  // Se abre una fila haciendo click en su boton de editar, si esta a la vista.
  const abrir = async (nombre, sel) => {
    const b = page.locator(`[name="${nombre}"]`).first()
    if (!(await b.count())) return
    await b.dispatchEvent('mousedown')
    await esperarAjax(page)
    await sel.waitFor({ state: 'attached', timeout: esperaSubform }).catch(() => {})
  }
  let cambios = 0
  for (const r of ctx.classyAnidado) {
    const sel = page.locator(r.sel).first()
    // Se abre cada fila del camino, de afuera hacia adentro: el bloque de la pagina, y si el
    // campo es de un hijo, la del hijo. Un componente adentro de una PESTAÑA tiene una fila mas
    // en el medio (la pestaña): por eso se recorre el nombre entero y no solo bloque + hijo.
    // Sin eso el select no aparecia y la pagina quedaba con el Classy de las pestañas en Default.
    const partes = r.editar.replace(/_edit$/, '').split('_subform_')
    for (let i = 1; i <= partes.length && !(await sel.count()); i++) {
      await abrir(`${partes.slice(0, i).join('_subform_')}_edit`, sel)
    }
    if (!(await sel.count())) throw new Error(`Repaso del Classy: no encontre ${r.ref} (${r.sel}) en el formulario guardado`)
    // El valor del manifiesto puede ser el de MAQUINA ("image_bottom") o la ETIQUETA que ve
    // el editor ("Primary White", que en el CMS es "background_card_primary_white"). Se
    // resuelve a la opcion real antes de comparar: comparar contra la etiqueta daba distinto
    // siempre y "reponia" un valor que no existe en el select, o sea que lo rompia.
    const { antes, quiere } = await sel.evaluate((e, v) => {
      const o = [...e.options].find((x) => x.value === v)
        || [...e.options].find((x) => x.textContent.trim().toLowerCase() === v.trim().toLowerCase())
      return { antes: e.value, quiere: o ? o.value : null }
    }, String(r.value))
    if (quiere === null) throw new Error(`Repaso del Classy: ${r.ref} no ofrece la opcion "${r.value}"`)
    if (antes === quiere) continue
    // Esta adentro del desplegable Classy, cerrado: se elige sin abrirlo.
    await sel.evaluate((e, v) => { e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })) }, quiere)
    onStep(`     ${r.ref}: el CMS lo guardo en "${antes}", se vuelve a poner "${quiere}"`)
    cambios += 1
  }
  if (!cambios) { onStep('     todo quedo bien guardado, no hace falta re-guardar'); return }
  const log = page.locator('textarea[name="revision_log[0][value]"]')
  if (await log.count()) await log.fill('migration-mx: re-aplica el Classy que no quedo al guardar')
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 180000 }).catch(() => {}),
    page.locator(mapping.save).first().click(),
  ])
  if (/\/edit$/.test(new URL(page.url()).pathname)) throw new Error('Repaso del Classy: Drupal no guardo la segunda pasada')
  onStep(`     re-guardada (${cambios} campo(s))`)
}
// Nombre de antes, cuando solo se repasaban los anidados.
export const repasarClassyAnidado = repasarClassy

// Agrega UN paragraph y llena sus campos. `holder` es donde vive la lista: el campo de
// paragraphs del nodo, o un slot adentro del subform de un contenedor. Sus plantillas
// ya vienen resueltas salvo el `{delta}`, que se decide aca.
async function addBlock(ctx, block, num, holder) {
  const { mapping, page, onStep, esperaSubform, consola } = ctx
  const def = mapping.paragraphs.types[block.type]
  if (!def) throw new Error(`El mapping no conoce el paragraph "${block.type}"`)

  // Donde cae este bloque. Puede ser una fila NUEVA (la primera posicion libre) o una
  // que el CMS ya traia vacia — ver `reservarFila`.
  const { delta, reusar } = await reservarFila(ctx, holder, def, block.type)
  const dsel = resolveSelector(holder.dsel, { delta })
  const base = resolveSelector(holder.base, { delta })
  const vars = { base, delta, dsel, dselw: widgetDsel(dsel), npath: namePath(dsel) }

  onStep(`  ${num}. ${def.label || block.type}`
    + (reusar ? ' (en la fila vacia que ya traia el CMS)' : ''))

  // El alta va por AJAX y se espera a que aparezca el subform de ESTE delta.
  //
  // Si el servidor contesta 502/503/504, no es que el mapping este mal: es el CMS que
  // tardo demasiado y el proxy corto. Una persona apretaria de nuevo, asi que el runner
  // tambien — pero SOLO ante un error del servidor, y solo despues de confirmar que la
  // fila no aparecio. Cualquier otra falla sigue frenando en seco, como corresponde.
  const fila = page.locator(rowSelector(dsel)).first()
  // Reusando no hay nada que agregar: la fila ya esta.
  let puesto = reusar
  for (let intento = 1; intento <= REINTENTOS && !puesto; intento++) {
    const desde = consola.length
    if (intento > 1) onStep(`     El CMS no respondio. Reintento ${intento - 1} de ${REINTENTOS - 1}…`)
    await clickAdd(page, holder.add, def, block.type)
    puesto = await fila.waitFor({ state: 'attached', timeout: esperaSubform }).then(() => true).catch(() => false)
    // Si no fue el servidor, insistir no va a cambiar nada.
    if (!puesto && !culpaDelServidor(consola.slice(desde))) break
  }
  if (!puesto) {
    // El mensaje tiene que traer la EVIDENCIA: que filas hay realmente en esa lista y si
    // Drupal se quejo de algo. Sin eso, del otro lado solo queda adivinar — y quien lo
    // corre no tiene como mirar el DOM.
    const prefijo = String(holder.dsel).split('{delta}')[0]
    const hay = await page.evaluate((p) => [...document.querySelectorAll('[data-drupal-selector]')]
      .map((e) => e.getAttribute('data-drupal-selector'))
      .filter((d) => d && d.startsWith(p)).slice(0, 20), prefijo).catch(() => [])
    const quejas = await page.locator('.messages--error, .messages.error').allInnerTexts().catch(() => [])
    throw new Error(`No aparecio el subform de "${block.type}" despues de agregarlo `
      + `(esperaba ${rowSelector(dsel)}).`
      + (quejas.length ? ` Drupal dice: "${quejas.join(' | ').replace(/\s+/g, ' ').trim().slice(0, 300)}".` : '')
      + ` Con el prefijo "${prefijo}" hay: ${hay.length ? hay.join(', ') : 'NADA'}.`
      + (culpaDelServidor(consola) ? ' ESTO NO ES EL RUNNER: el CMS contesto con un error de '
        + 'servidor (5xx), o sea que tardo demasiado. Volve a probar en un rato.' : ''))
  }

  // Los campos NO se llenan aca. Cada alta hace que Drupal re-dibuje el formulario, y
  // eso borra lo que se haya escrito antes: si se llena sobre la marcha, la pagina
  // termina armada y vacia. Asi que primero se arma TODA la estructura y despues se
  // llena de una, cuando ya no queda ningun AJAX por delante.
  ctx.pendientes.push({ block, def, vars, num, anidado: holder !== ctx.root })
  ctx.listas.add(holder.dsel)

  // Contenedores: sus hijos van adentro del slot que les toca, no en la lista del nodo.
  if (block.children?.length) {
    const slots = def.children?.slots
    if (!slots?.length) throw new Error(`"${block.type}" tiene hijos pero el mapping no declara "children.slots"`)
    let k = 0
    const enSlot = {}
    for (const child of block.children) {
      k += 1
      const i = child.slot || 0
      const slot = slots[i]
      if (!slot) throw new Error(`"${block.type}" no tiene el slot ${i} (tiene ${slots.length})`)
      // `max` = cuantos componentes entran en esa ranura. Una pestaña lleva UNO solo:
      // en el CMS el tab item tiene un componente, no una lista. Mejor frenar aca que
      // dejar la mitad de la pestaña afuera.
      enSlot[i] = (enSlot[i] || 0) + 1
      if (slot.max != null && enSlot[i] > slot.max) {
        throw new Error(`"${block.type}" acepta ${slot.max} componente(s) en "${slot.label || i}" `
          + `y el manifiesto pone ${enSlot[i]}`)
      }
      // Se resuelven las variables del PADRE y se deja `{delta}`, que es el del hijo.
      const padre = { base, dsel, dselw: vars.dselw, npath: vars.npath }
      const dselHijo = resolveSelector(slot.dsel, padre)
      await addBlock(ctx, child, `${num}.${k}`, {
        dsel: dselHijo,
        base: resolveSelector(slot.base, padre),
        // `enMedio` no se escribe en el mapping: sale de como Drupal nombra las cosas,
        // igual que {dselw} y {npath}. Un mapping puede declararlo si su sitio difiere.
        add: {
          enMedio: EN_MEDIO(fieldWrapper(dselHijo)),
          enMedioAbre: EN_MEDIO_GENERICO(fieldWrapper(dselHijo)),
          ...resolveIn(slot.add, padre),
        },
      })
    }
  }
}

// Llena los campos de un paragraph ya agregado. Antes abre los desplegables del
// formulario (Optional fields, Avanzado, Classy, Atributos), porque un campo que vive
// adentro no se puede tocar con el panel cerrado.
async function llenarBloque(ctx, { block, def, vars, num, anidado }) {
  const { mapping, page, onStep, esperaSubform } = ctx
  const campos = Object.entries(block.fields || {})

  // Por las dudas: si "abrir todas" no alcanzo, esta fila trae su propio boton. Se abre
  // AUNQUE el bloque no tenga campos propios (un contenedor de pestañas): sus hijos viven
  // adentro, y agregando a una pagina existente la fila puede haber quedado plegada.
  const subform = page.locator(`[data-drupal-selector="${vars.dsel}-subform"]`)
  if (!(await subform.count())) {
    const editar = page.locator(`input[name="${vars.npath}_edit"], button[name="${vars.npath}_edit"]`).first()
    if (await editar.count()) {
      await editar.click()
      await esperarAjax(page)
      await subform.first().waitFor({ state: 'attached', timeout: esperaSubform }).catch(() => {})
    }
  }

  if (!campos.length) return

  for (const tpl of [...(mapping.paragraphs.open || []), ...(def.open || [])]) {
    const d = page.locator(resolveSelector(tpl, vars)).first()
    if (!(await d.count())) continue
    if (await d.evaluate((el) => el.tagName === 'DETAILS' && el.open)) continue
    await d.locator('> summary').first().click()
  }

  onStep(`  ${num}. ${def.label || block.type}: ${campos.length} campo(s)`)
  for (const [key, value] of campos) {
    const f = def.fields?.[key]
    if (!f) throw new Error(`El mapping de "${block.type}" no tiene el campo "${key}"`)
    const ref = `${num}. ${block.type}.${key}`
    if (IMAGE_KINDS.has(f.kind)) {
      onStep(`     (imagen "${key}": se elige a mano)`)
      await guardarWidget(ctx, key, vars, ref)
      continue
    }
    if (f.kind === 'media') {
      onStep(`     imagen "${key}": eligiendo "${value}" de la libreria`)
      ctx.escritos.push(await ponerMedia(ctx, f, vars, String(value), ref))
      continue
    }
    // Un inline entity form SIN "existente" (el fondo de una pestaña): el medio se crea ahi
    // mismo con los archivos que dejo imagenes.mjs.
    if (f.kind === 'mediaNuevo') {
      onStep(`     imagen "${key}": creando "${value}" en el formulario`)
      const campo = resolveSelector(f.sel, vars)
      const r = await crearMedioEnLinea({ page: ctx.page, campo, nombre: String(value), alt: ALT_DE_RESERVA, ref })
      ctx.escritos.push({ selector: campo, f, ref, valor: String(value), puesto: r.texto })
      continue
    }
    // El OTRO widget de medios: el modal con grilla. Lo usa el video externo. Se elige por
    // URL porque el nombre del medio lo pone YouTube y el hub no lo tiene.
    if (f.kind === 'mediaLibrary') {
      // El valor puede ser la URL pelada o `{ url, thumb }`: la portada viaja pegada al
      // video porque en el CMS es un campo de SU medio, no un campo del paragraph.
      const v = (value && typeof value === 'object') ? value : { url: String(value) }
      onStep(`     video "${key}": buscando ${v.url} en la Media library`
        + (v.thumb ? ' (con portada)' : ''))
      ctx.escritos.push(await ponerDeLaLibreria(ctx, f, vars, v, ref))
      continue
    }
    // Un campo que se REPITE con "Añadir otro elemento" (los productos del carrusel): el
    // formulario trae la primera fila y cada una de las demas se pide con el boton.
    if (f.kind === 'lista') {
      ctx.escritos.push(...await llenarLista(ctx, f, vars, value, ref))
      continue
    }
    // El numero va en la referencia: con dos cards iguales, "ln_c_grid_card_item.field_c_text"
    // no dice CUAL de las dos, y son justo las que hay que ir a mirar.
    ctx.escritos.push(await fillField(ctx, f, vars, value, ref))
    if (key.startsWith('classy.') && f.kind === 'select') {
      ctx.classyAnidado.push({ sel: resolveSelector(f.sel, vars), value, ref, editar: `${vars.npath}_edit` })
    }
    // Un select que RECARGA parte del formulario al cambiar (el bloque del paragraph Block:
    // al elegirlo, Drupal trae su configuracion por AJAX). Los campos que siguen viven en
    // lo que llega, asi que hay que esperarlo antes de seguir llenando.
    if (f.ajax) await esperarAjax(page)
  }
}

function resolveIn(add, vars) {
  const out = { ...add }
  for (const k of ['select', 'button', 'open', 'enMedio']) if (out[k]) out[k] = resolveSelector(out[k], vars)
  if (out.alternativa) out.alternativa = resolveIn(out.alternativa, vars)
  return out
}

// Los botones de "agregar en el medio" de paragraphs_features, acotados a ESA lista.
// Hay de dos clases y hacen cosas distintas:
//   - el de un bundle puntual (`data-paragraph-bundle`) agrega ESE tipo de una;
//   - el generico ("+ Add"), que aparece cuando la lista acepta muchos tipos, ABRE el
//     dialogo de paragraphs_ee y recien ahi esta el boton del tipo.
const EN_MEDIO = (wrapper) => `[data-drupal-selector="${wrapper}"] `
  + 'button.paragraphs-features__add-in-between__button[data-paragraph-bundle="{bundle}"]'
const EN_MEDIO_GENERICO = (wrapper) => `[data-drupal-selector="${wrapper}"] `
  + 'button.paragraphs-features__add-in-between__button:not([data-paragraph-bundle])'

const seVe = async (loc) => (await loc.count()) > 0 && await loc.first().isVisible()

// EN QUE FILA va este bloque.
//
// Cuando la lista de un paragraph es OBLIGATORIA, Drupal ABRE el formulario con una fila
// ya puesta y vacia — al card grid, por ejemplo, le nace un card item de entrada. Si el
// runner la ignora y agrega la suya al lado, la pagina termina con una card fantasma que
// nadie cargo y que despues hay que borrar a mano. Asi que primero se usan las que ya
// estan, y recien despues se agrega.
//
// Solo se reusa una fila que cumpla las DOS cosas: ser del mismo bundle que el bloque, y
// estar vacia. Escribir encima de algo que ya tenia contenido seria pisar trabajo ajeno,
// que es justo lo que el runner no hace.
async function reservarFila(ctx, holder, def, type) {
  const { page, onStep } = ctx
  // La lista se mira UNA sola vez, antes de agregarle nada: despues de la primera alta ya
  // no se puede distinguir lo que traia el CMS de lo que puso el runner.
  if (!ctx.precreadas.has(holder.dsel)) {
    ctx.precreadas.set(holder.dsel, await filasPrevias(page, holder.dsel))
  }
  const cola = ctx.precreadas.get(holder.dsel)
  const primera = cola[0]
  const bundle = enGuiones(def.value || type)

  const mismoTipo = primera && (primera.bundle ? primera.bundle === bundle : primera.titulo === def.label)
  if (primera && primera.vacia && mismoTipo) {
    cola.shift()
    return { delta: primera.delta, reusar: true }
  }
  if (primera) {
    // No se toca y no se vuelve a mirar: si la primera no sirve, reusar una de mas abajo
    // dejaria igual un hueco en el medio. Se avisa, porque una fila de mas en la pagina
    // es algo que alguien va a tener que mirar.
    onStep(`     (la lista ya traia una fila ${primera.bundle || primera.titulo ? `"${primera.bundle || primera.titulo}"` : 'de tipo desconocido'}`
      + `${primera.vacia ? ' vacia' : ' con contenido'} en la posicion ${primera.delta}: se deja como esta)`
      + (primera.porque ? ` [${primera.porque}]` : ''))
    cola.length = 0
  }
  return { delta: await freeDelta(page, holder.dsel), reusar: false }
}

// Las filas que la lista YA tiene, en orden, con lo unico que hace falta saber de cada
// una: de que bundle es y si esta vacia.
async function filasPrevias(page, dselTpl) {
  const out = []
  for (let d = 0; d < MAX_DELTA; d++) {
    const loc = page.locator(rowSelector(resolveSelector(dselTpl, { delta: d }))).first()
    if (!(await loc.count())) break
    out.push({ delta: d, ...(await loc.evaluate(mirarFila).catch(() => ({ bundle: null, vacia: false }))) })
  }
  return out
}

// Se ejecuta DENTRO del navegador, asi que va como una funcion sola, sin dependencias.
//
// El bundle sale de la clase `paragraph-type--<bundle-en-guiones>` que Drupal le pone a
// la fila (en el CMS va en el <tr>; el orden de busqueda cubre las dos formas). Se mira
// la fila propia y unos pocos ancestros a proposito: subiendo de mas se termina leyendo
// el bundle del paragraph PADRE, que siempre esta ahi.
const mirarFila = (el) => {
  const clase = (n) => (n && typeof n.className === 'string' ? n.className : '')
  let bundle = null
  const cerca = [el.closest('tr'), el, el.parentElement, el.parentElement?.parentElement]
  for (const n of cerca) {
    const m = /paragraph-type--([a-z0-9-]+)/.exec(clase(n))
    if (m) { bundle = m[1]; break }
  }
  // En algunas listas (las del Banner Wrapper) la clase no va en la fila sino en el
  // wrapper del subform, adentro. Se toma la PRIMERA que aparezca, que es la propia: las de
  // los paragraphs anidados vienen despues en el orden del documento.
  if (!bundle) {
    const m = /paragraph-type--([a-z0-9-]+)/.exec(clase(el.querySelector('[class*="paragraph-type--"]')))
    if (m) bundle = m[1]
  }
  // Y en otras (las del Banner Wrapper) no hay clase en ningun lado: lo unico que dice el
  // tipo es la etiqueta de la cabecera de la fila ("Banner"). Va aparte del bundle porque es
  // la etiqueta que ve el editor, no el nombre de maquina.
  const titulo = (el.querySelector('.paragraph-type-title')?.textContent || '').trim()
  // Campos que Drupal trae con valor puesto y que no dicen nada sobre si alguien cargo
  // contenido: el peso de la fila, el formato de texto, el idioma.
  // Tampoco el selector de "que tipo agregar" de una lista anidada ([add_more]): una
  // pestaña recien nacida lo trae puesto en el primer tipo y no tiene nada cargado.
  const TECNICOS = /\[(_weight|format|_original_delta|langcode|bundle)\]$|\[add_more\]|\[options\]\[attributes\]/
  let vacia = true
  let porque = null // el campo que la hizo contar como cargada: va en el aviso
  const campos = el.querySelectorAll('input[type="text"], input[type="url"], input[type="email"],'
    + ' input[type="number"], textarea, select')
  for (const c of campos) {
    if (TECNICOS.test(c.name || '')) continue
    if (c.type === 'submit') continue
    const v = String(c.value || '').trim()
    if (v && v !== '_none') { vacia = false; porque = `${c.name}=${v.slice(0, 40)}`; break }
  }
  return { bundle, titulo, vacia, porque }
}

// `ln_c_grid_card_item` -> `ln-c-grid-card-item`, que es como Drupal escribe el bundle en
// las clases del formulario.
const enGuiones = (bundle) => String(bundle).replace(/_/g, '-')

// La primera posicion libre de la lista. Corta apenas encuentra un hueco, asi que en
// una pagina normal son un par de consultas.
async function freeDelta(page, dselTpl) {
  for (let d = 0; d < MAX_DELTA; d++) {
    if (!(await page.locator(rowSelector(resolveSelector(dselTpl, { delta: d }))).count())) return d
  }
  throw new Error(`Mas de ${MAX_DELTA} paragraphs en la misma lista: algo esta mal.`)
}

// Dos formas de agregar un paragraph, segun como este configurado el widget:
//   - "select":  un desplegable de tipos + un boton
//   - "buttons": un boton por tipo; si estan detras de un modal, `open` lo abre primero
async function clickAdd(page, add, def, type) {
  if (add.mode === 'select') {
    const sel = page.locator(add.select).first()
    // Una ranura puede ofrecer el alta de DOS maneras segun el estado del formulario (en
    // las pestañas: "Párrafo type" + boton, o un dropbutton de Gin). `alternativa` es la otra.
    if (!(await sel.count()) && add.alternativa) return clickAdd(page, add.alternativa, def, type)
    if (!(await sel.count())) throw new Error(`No encontre el desplegable de tipos (${add.select})`)
    if (add.sinAjaxAlElegir) {
      // El desplegable de algunas ranuras dispara un AJAX que en el CMS esta ROTO (en las
      // pestañas, paragraphs_features tira un TypeError y el alta posterior no aparece).
      // Drupal no necesita ese AJAX: lee el valor del desplegable al apretar el boton. Se
      // pone el valor sin disparar el evento, como si nunca se hubiera recargado.
      const ok = await sel.evaluate((s, v) => {
        const o = [...s.options].find((x) => x.value === v.value || (!v.value && x.text.trim() === v.label))
        if (!o) return false
        s.value = o.value; return true
      }, { value: def.value || null, label: def.label })
      if (!ok) throw new Error(`El desplegable de tipos no ofrece "${def.value || def.label}"`)
    } else if (def.value) await sel.selectOption(def.value)
    else await sel.selectOption({ label: def.label })
    // El desplegable tambien dispara AJAX: apretar Agregar sin esperar rompe las dos.
    await esperarAjax(page)
    await page.locator(add.button).first().click()
    await esperarAjax(page)
    return
  }
  if (add.mode === 'buttons') {
    const bundle = def.value || type
    // Hay hasta TRES formas de agregar en una ranura, y cual esta a la vista depende de
    // como quedo la lista. Se prueban en orden y se usa la que se VE:
    //
    // 1. "Agregar en el medio" (paragraphs_features). Cuando esta activado para ese
    //    campo, Drupal ESCONDE el area de agregar del final (le pone display:none) y
    //    pone un boton por bundle adentro de la tabla — el que toca una persona. Se
    //    clickea el ULTIMO, que es el que agrega al final y no al principio.
    if (add.enMedio) {
      const b = page.locator(resolveSelector(add.enMedio, { bundle })).last()
      if (await seVe(b)) { await b.click(); await esperarAjax(page); return }
    }
    // 2. Algo que ABRA la lista de tipos, porque el boton del bundle todavia no existe:
    //    el "+ Add" generico de paragraphs_features (cuando la lista acepta muchos tipos)
    //    o el modal de paragraphs_ee. Se usa el primero que se vea, nunca los dos.
    for (const sel of [add.enMedioAbre, add.open].filter(Boolean)) {
      const b = page.locator(sel).last()
      if (await seVe(b)) { await b.click(); await esperarAjax(page); break }
    }
    // 3. El boton suelto del bundle: una lista de un solo tipo, o el que abrio el modal.
    const selBoton = resolveSelector(add.button, { bundle })
    const btn = await esperarVisible(page, selBoton, 20000)
    if (!btn) {
      // La etiqueta sola no alcanza para saber que ES cada boton: va el markup, que dice
      // la clase y si trae data-paragraph-bundle. Es la diferencia entre "agrega este
      // tipo" y "abre el dialogo".
      const opciones = await page.evaluate(() => [...document.querySelectorAll(
        'input[name="button_add_modal"], button.paragraphs-features__add-in-between__button, .field-add-more-submit')]
        .filter((e) => e.offsetParent !== null)
        .map((e) => e.outerHTML.replace(/\s+/g, ' ').slice(0, 220)).slice(0, 6)).catch(() => [])
      // Y sobre el boton que se esperaba: si existe pero no se ve, lo que importa es
      // QUIEN lo tapa. Eso es lo que separa "el selector esta mal" de "esta escondido".
      const nombre = /name="([^"]+)"/.exec(selBoton)?.[1]
      const suerte = nombre ? await page.evaluate((n) => [...document.querySelectorAll(`[name="${n}"]`)]
        .map((el) => {
          let tapa = null
          for (let p = el.parentElement; p && !tapa; p = p.parentElement) {
            const cs = getComputedStyle(p)
            if (cs.display === 'none' || cs.visibility === 'hidden') tapa = (p.className || p.tagName).toString().slice(0, 70)
          }
          return `${el.offsetParent !== null ? 'SE VE' : 'escondido'}${tapa ? ' por ' + tapa : ''}`
        }), nombre).catch(() => []) : []

      throw new Error(`No aparecio el boton para agregar "${type}" en este contenedor. `
        + `Elementos con name="${nombre}": ${suerte.length ? suerte.join(' | ') : 'NINGUNO'}. `
        + `Los botones de alta que SI se ven ahora: ${opciones.length ? opciones.join('  ///  ') : 'ninguno'}.`)
    }
    await btn.click()
    await esperarAjax(page)
    return
  }
  throw new Error(`Modo de alta desconocido: "${add.mode}"`)
}

// Un campo puede EXISTIR y no verse: en el formulario del nodo, el alias y la
// publicacion viven en paneles plegados de la barra lateral, y en un paragraph hay
// grupos que arrancan cerrados. Antes de tocar cualquier cosa se abren todos los
// <details> que la tapan — que es lo que haria una persona. Sin esto, Playwright espera
// 30 segundos un elemento que esta ahi pero escondido, y la corrida se corta.
async function revelar(loc) {
  await loc.evaluate((node) => {
    for (let p = node.parentElement; p; p = p.parentElement) {
      if (p.tagName === 'DETAILS' && !p.open) p.open = true
    }
  }).catch(() => { /* si no se puede evaluar, se intenta igual: quiza ya se ve */ })
}

// La marca como se compara: sin ®/™, sin acentos, sin mayusculas, sin espacios y sin el
// "Purina" del nombre. Asi "Purina One" del hub encuentra "Purina® One®" del CMS y "Felix"
// encuentra "Purina®  Felix®". "Purina" a secas queda vacio: es la marca paraguas, sin tema.
export function claveMarca(nombre) {
  return String(nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[®™]/g, '').replace(/\bpurina\b/g, '').replace(/[^a-z0-9]/g, '')
}

async function escribir(loc, valor) {
  await revelar(loc)
  await loc.fill(String(valor))
}

async function tildar(loc, valor) {
  await revelar(loc)
  await loc.setChecked(!!valor)
}

/**
 * EL FORMATO DE TEXTO de un campo de cuerpo. Deja elegido el PRIMERO de la lista de
 * preferencia que este desplegable ofrezca de verdad, y devuelve cual quedo.
 *
 * Es una preferencia y no un valor fijo porque los campos no ofrecen los mismos formatos:
 * uno puede tener "Purina Markdown" y otro no. Antes el mapping pedia `rich_text` a secas
 * y, si no estaba, se quedaba callado con el que hubiera — que en este CMS arranca en
 * "Email HTML".
 *
 * POR QUE MARKDOWN PRIMERO. El texto del hub viaja en notacion markdown (`**negrita**`,
 * `[texto](link)`): eso es lo que escribe el mercado en la matriz de contenido. Con un
 * formato HTML esos asteriscos entran LITERALES y se ven asi en el sitio. Con el formato
 * markdown son negrita de verdad. O sea que no es una preferencia de estilo: es que el
 * texto llegue como se escribio.
 */
async function elegirFormato(page, selector, cfg, ref, onStep) {
  const preferidos = cfg?.preferidos || []
  const sel = page.locator(selector).first()
  if (!(await sel.count())) return null

  const hay = await sel.evaluate((s) => [...s.options].map((o) => o.value)).catch(() => [])
  const elegido = preferidos.find((p) => hay.includes(p))
  const actual = await sel.inputValue().catch(() => null)

  if (!elegido) {
    onStep?.(`     (${ref}: el CMS no ofrece ninguno de los formatos preferidos `
      + `(${preferidos.join(', ')}); queda "${actual}". Las que ofrece: ${hay.join(', ')})`)
    return actual
  }
  // Solo se toca si hace falta: cada cambio destruye el editor y monta otro, y un
  // remonte de gusto es una ventana mas para que algo salga mal.
  if (actual === elegido) return elegido
  try {
    await sel.selectOption(elegido)
    return elegido
  } catch {
    onStep?.(`     (${ref}: no pude poner el formato "${elegido}"; queda "${actual}")`)
    return actual
  }
}

// Recibe el `ctx` entero — y no solo la pagina — porque el formato de texto es una regla
// del SITIO, no del campo: vive en el mapping y hay que poder leerla desde aca.
export async function fillField(ctx, f, vars, value, ref) {
  const { page } = ctx
  const selector = resolveSelector(f.sel, vars)
  const total = await page.locator(selector).count()
  if (!total) throw new Error(`No encontre el campo ${ref} (${selector})`)
  let rutaRich = null

  // Un mismo `name` puede estar repetido en la pagina (el formulario deja plantillas
  // escondidas), asi que se busca el que SE VE — despues de abrir los paneles que lo
  // tapen. La excepcion es un cuerpo con CKEditor: ahi el textarea esta oculto a
  // proposito y lo que se ve es el editor, asi que se toma el primero.
  let el = page.locator(selector).first()
  if (f.kind !== 'richtext') {
    for (let i = 0; i < total; i++) {
      const cand = page.locator(selector).nth(i)
      await revelar(cand)
      if (await cand.isVisible().catch(() => false)) { el = cand; break }
    }
  } else {
    await revelar(el)
  }

  if (f.kind === 'select') {
    // Se intenta por VALOR de maquina, que es lo que guarda nuestro catalogo; si esa
    // opcion no existe se prueba por etiqueta antes de darse por vencido.
    //
    // Con esperas CORTAS y a proposito: si la opcion no existe, Playwright reintenta
    // hasta agotar el minuto y termina diciendo "did not find some options", que no dice
    // cual se pidio ni cuales habia. Un valor mal escrito en el manifiesto es el error
    // mas facil de cometer y merece un mensaje que se lea.
    const puesto = await elegirOpcion(el, String(value))
    if (!puesto) {
      const hay = await el.evaluate((s) => [...s.options]
        .map((o) => (o.text && o.text !== o.value ? `${o.value} ("${o.text}")` : o.value))
        .filter((v) => v !== '' && v !== '_none')).catch(() => [])
      throw new Error(`"${value}" no es una opcion de ${ref}. Las que acepta el CMS: `
        + `${hay.join(', ') || 'ninguna (el desplegable esta vacio)'}. `
        + 'Corregi el valor en el manifiesto.')
    }
  } else if (f.kind === 'checkbox') {
    await el.setChecked(!!value)
  } else if (f.kind === 'richtext') {
    // El formato de texto va PRIMERO: el CMS arranca en uno que no admite HTML, y
    // cambiarlo con contenido ya cargado dispara el aviso de Drupal de que se pierde.
    const elegido = f.format
      ? await elegirFormato(page, resolveSelector(f.format.sel, vars), ctx.mapping.formatoTexto, ref, ctx.onStep)
      : null
    // Cambiar el formato DESTRUYE el editor y monta otro, y eso no es una peticion de
    // Drupal: `esperarAjax` no lo ve. Escribir en el medio del cambio es escribirle al
    // editor que se esta muriendo — el texto se ve un instante y despues no esta.
    await esperarEditor(page, el, { formato: elegido })
    const plano = !!(ctx.mapping.formatoTexto?.planos || []).includes(elegido)
    const r = await escribirRich(page, el, String(value), { plano })
    rutaRich = r.via
    if (!r.via) {
      throw new Error(`No pude escribir ${ref}: ${r.intentos.join('; ')}. `
        + `Estado del campo: ${await diagnosticoRich(page, el)}`)
    }
  } else {
    // Campo de texto plano: las marcas del hub entrarian literales (ver `sinMarcas`).
    await el.fill(sinMarcas(value))
  }

  // VERIFICAR. Un campo que se llena y queda vacio es peor que un error: la pagina sale
  // armada pero sin contenido y nadie se entera hasta que la mira. Si no quedo, se frena.
  const puesto = await loQueQuedo(page, f, selector, el)
  if (esVacio(puesto) && !esVacio(value)) {
    throw new Error(`Escribi ${ref} pero el campo quedo vacio (${selector}). `
      + `Se esperaba "${String(value).slice(0, 60)}" y hay ${JSON.stringify(puesto)}. `
      + `Elementos con ese selector: ${total}.`)
  }
  return { selector, f, ref, valor: value, puesto, rutaRich }
}

// Las referencias "Nombre (nid)" de los campos repetibles del manifiesto (los productos
// del carrusel), con el nid aparte.
function referencias(manifest, mapping) {
  const out = []
  const recorrer = (bloques) => {
    for (const b of bloques || []) {
      const def = mapping.paragraphs?.types?.[b.type]
      for (const [k, v] of Object.entries(b.fields || {})) {
        if (def?.fields?.[k]?.kind !== 'lista') continue
        for (const x of [].concat(v)) {
          const nid = /\((\d+)\)\s*$/.exec(String(x))?.[1]
          if (nid) out.push({ texto: String(x), nid })
        }
      }
      recorrer(b.children)
    }
  }
  recorrer(manifest.blocks)
  return out
}
const contarReferencias = (manifest, mapping) => referencias(manifest, mapping).length

// Cuales de esas referencias NO existen: el nodo responde 404 (o 403, que es lo que da un
// nodo despublicado a quien no lo puede ver). Cada nid se consulta una sola vez.
export async function referenciasQueFaltan(page, site, manifest, mapping) {
  const faltan = []
  const vistos = new Map()
  for (const r of referencias(manifest, mapping)) {
    if (!vistos.has(r.nid)) {
      const res = await page.request.get(`${site}/node/${r.nid}`, { maxRedirects: 0, failOnStatusCode: false })
      vistos.set(r.nid, res.status())
    }
    const st = vistos.get(r.nid)
    if (st === 404 || st === 403) faltan.push(`${r.texto} (responde ${st})`)
  }
  return faltan
}

// Llena un campo repetible fila por fila. `f.sel` lleva `{i}` (la fila) y `f.add` es el
// boton "Añadir otro elemento" de ese campo. La fila 0 viene en el formulario; las demas
// se piden de a una y se espera a que aparezcan, igual que haria una persona.
export async function llenarLista(ctx, f, vars, valores, ref) {
  const { page } = ctx
  const lista = Array.isArray(valores) ? valores : [valores]
  const escritos = []
  for (const [i, v] of lista.entries()) {
    const sel = resolveSelector(f.sel, { ...vars, i })
    if (!(await page.locator(sel).count())) {
      const boton = page.locator(resolveSelector(f.add, vars)).last()
      if (!(await boton.count())) throw new Error(`${ref}: no encontre el boton para agregar la fila ${i + 1} (${resolveSelector(f.add, vars)})`)
      await revelar(boton)
      await boton.click()
      await esperarAjax(page)
      await page.locator(sel).first().waitFor({ state: 'attached', timeout: 20000 })
        .catch(() => { throw new Error(`${ref}: apreté "Añadir otro elemento" y no aparecio la fila ${i + 1}`) })
    }
    const valor = f.referencia ? citarReferencia(v) : v
    escritos.push(await fillField(ctx, { ...f, kind: 'text', sel: f.sel.replaceAll('{i}', String(i)) }, vars, valor, `${ref}[${i}]`))
  }
  return escritos
}

// Un autocompletado de referencias de Drupal SEPARA POR COMA: "Purina One carne, pollo y
// cordero (666)" lo lee como dos productos y el segundo no existe, asi que el formulario no
// se guarda. La regla de Drupal es encerrar entre comillas dobles el valor que lleva coma
// (y duplicar las comillas que tenga adentro).
export function citarReferencia(v) {
  const t = String(v ?? '')
  if (!t.includes(',') || /^".*"$/.test(t.trim())) return t
  return `"${t.replace(/"/g, '""')}"`
}

// Elige un medio YA subido. El valor del manifiesto es el NOMBRE del medio en la
// libreria, que para los placeholders es el nombre del archivo sin el .png.
async function ponerMedia(ctx, f, vars, nombre, ref) {
  const { page, mapping } = ctx
  const campo = resolveSelector(f.sel, vars)
  if (!(await page.locator(campo).count())) {
    throw new Error(`No encontre el campo de imagen ${ref} (${campo})`)
  }
  const r = await elegirMedia({ page, campo, nombre, cfg: mapping.mediaExistente, ref })
  // El sitio a veces muestra "Oops, something went wrong" porque su propio JS se rompe
  // procesando la respuesta, aunque el medio haya quedado enganchado. No es motivo para
  // frenar —- el resultado esta -— pero tampoco para callarlo: si despues algo sale raro,
  // conviene saber que el CMS venia quejandose.
  if (r.ruido) ctx.onStep(`     (el CMS se quejo pero la imagen quedo: ${r.ruido.slice(0, 90)})`)
  // La verificacion es la de siempre, y aca importa el doble: un autocompletar que no
  // engancho deja el campo igual de vacio que antes, sin decir nada.
  if (!r.texto.includes(nombre)) {
    throw new Error(`Elegi "${nombre}" en ${ref} pero el campo no lo muestra. `
      + `Dice: "${r.texto.slice(0, 120)}".`)
  }
  return { selector: campo, f, ref, valor: nombre, puesto: r.texto }
}

// Elige un medio del modal con grilla (Media library). Igual que `ponerMedia`, no crea
// nada: si el video que pide el manifiesto no esta en la libreria, frena.
async function ponerDeLaLibreria(ctx, f, vars, { url, thumb }, ref) {
  const { page, mapping } = ctx
  const campo = resolveSelector(f.sel, vars)
  if (!(await page.locator(campo).count())) {
    throw new Error(`No encontre el campo de video ${ref} (${campo})`)
  }
  const puesto = await elegirDeLaLibreria({
    page, campo, url, thumb, ref, onStep: ctx.onStep,
    // `medio` son los selectores de la FICHA de un medio (los mismos que usa el subidor de
    // fotos): hacen falta para completarle la portada a un video que ya estaba en la
    // libreria, que se edita en su propia pagina y no en el modal.
    cfg: { ...mapping.mediaLibrary, medio: mapping.media },
  })
  // Un modal que se cerro sin enganchar nada deja el campo igual de vacio que antes, sin
  // decir nada: la verificacion es lo unico que lo distingue de haber funcionado.
  if (!puesto) {
    throw new Error(`Elegi el video ${url} en ${ref} pero el campo quedo vacio.`)
  }
  return { selector: campo, f, ref, valor: url, puesto }
}

// Se guarda el HTML del widget de cada campo de IMAGEN. El runner todavia no sabe
// elegirlas, y para enseñarle hace falta ver como es ese widget en ESTE sitio: no es lo
// mismo una Media library (un modal con buscador) que un inline entity form (un
// autocompletar). Adivinarlo sale caro, y el propio formulario lo tiene a mano.
//
// El campo no trae selector en el mapping, asi que se busca por el nombre: Drupal arma el
// `data-drupal-selector` con el nombre del campo en guiones.
async function guardarWidget(ctx, key, vars, ref) {
  const { page } = ctx
  const enGuiones = key.split('.').pop().replace(/_/g, '-')
  const fila = rowSelector(vars.dsel)
  const cand = page.locator(`${fila} [data-drupal-selector*="${enGuiones}"]`).first()
  if (!(await cand.count())) return
  const html = await cand.evaluate((el, filaSel) => {
    // El wrapper de mas AFUERA que siga siendo del campo: ahi es donde vive el boton que
    // abre el selector, que es justo lo que hay que ver.
    const f = el.closest(filaSel)
    let n = el
    for (let p = el.parentElement; p && p !== f; p = p.parentElement) {
      if (/field|media|image/i.test(p.className || '')) n = p
    }
    return n.outerHTML
  }, fila).catch(() => null)
  // Un widget puede ser enorme (una Media library trae su modal entero). Con el principio
  // alcanza para ver de que clase es y como se abre.
  if (html) ctx.imagenes.push({ ref, html: html.slice(0, 20000) })
}

// Por valor de maquina y, si no, por etiqueta. Devuelve si pudo.
async function elegirOpcion(el, valor) {
  for (const como of [valor, { label: valor }]) {
    try { await el.selectOption(como, { timeout: 4000 }); return true } catch { /* la otra */ }
  }
  return false
}

// Dos lecturas del mismo campo son "la misma" si dicen lo mismo: los espacios de un
// cuerpo con formato no cuentan.
const igual = (a, b) => norma(a) === norma(b)
const norma = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : v)
const cita = (v) => (typeof v === 'string' ? `"${v.slice(0, 60)}"` : JSON.stringify(v))

// Lee un campo eligiendo el mismo elemento que se lleno: el que se ve, salvo el cuerpo
// con CKEditor, que por diseño esta oculto.
export async function leerCampo(page, f, selector) {
  const n = await page.locator(selector).count()
  if (!n) return null
  let el = page.locator(selector).first()
  if (f.kind !== 'richtext') {
    for (let i = 0; i < n; i++) {
      const c = page.locator(selector).nth(i)
      if (await c.isVisible().catch(() => false)) { el = c; break }
    }
  }
  return loQueQuedo(page, f, selector, el)
}

// Que hay AHORA en el campo, en la forma que corresponda a su tipo.
async function loQueQuedo(page, f, selector, el) {
  try {
    if (f.kind === 'checkbox') return await el.isChecked()
    if (f.kind === 'richtext') return await leerRich(page, el)
    // Un medio no tiene "valor": lo que hay es la fila que dibuja el inline entity form
    // con el nombre del medio adentro.
    if (f.kind === 'media' || f.kind === 'mediaNuevo') return await leerMedia(page, selector)
    if (f.kind === 'mediaLibrary') return await leerSeleccion(page, selector)
    return await el.inputValue()
  } catch { return null }
}

// "Vacio" para el CMS incluye el valor con el que arrancan los selects de Drupal.
const esVacio = (v) => v === null || v === undefined || v === '' || v === '_none'


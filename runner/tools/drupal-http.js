// Acceso a Drupal por HTTP, sin navegador: la sesion, el formulario de edicion de un nodo,
// abrir sus paragraphs y volcar el arbol de campos. Lo usan `leer` y `aplicar`.
//
// Por que HTTP y no el navegador: para LEER y para cambiar un valor que ya existe no hace
// falta dibujar nada. El formulario de edicion ya trae cada campo con su nombre exacto
// (`field_ln_n_components[8][subform][field_c_link][0][uri]`), y lo unico que pide JS es
// abrir los paragraphs cerrados, que es un pedido AJAX comun ("Editar todo"). Asi corre
// igual en tu maquina y en una sesion en la nube, y no depende de Chrome.
//
// Lo que hace el navegador y esto NO: crear paragraphs nuevos, subir archivos, el CKEditor.
// Eso sigue siendo del motor (`src/build.js`).
import readline from 'node:readline'

export const SITIOS = {
  // Solo se ESCRIBE en content: preprod y prod los arma F5 exportando desde ahi.
  'content-mx': { base: 'https://content-ef5-purina-latam-mx.pantheonsite.io', env: 'CONTENT', mkt: 'MX', escribe: true },
}

export const USER_AGENT = 'migration-mx'

export class ErrorDrupal extends Error {}

// ---------------------------------------------------------------------------------------
// HTML: lo justo para leer un formulario de Drupal. No es un parser general.

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }
export function decode(s) {
  if (!s || !s.includes('&')) return s ?? ''
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
    return NAMED[e.toLowerCase()] ?? m
  })
}

function attrs(src) {
  const a = {}
  for (const m of src.matchAll(/([^\s=/"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g)) {
    a[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '')
  }
  return a
}

/** El <form> de edicion del nodo (el primero cuyo id es node-...-form). */
export function formDelNodo(html) {
  const m = html.match(/<form\b[^>]*\bid="node-[^"]*-form"[^>]*>/)
  if (!m) throw new ErrorDrupal('No encontre el formulario del nodo en la pagina (¿sesion vencida o sin permiso?).')
  const ini = m.index
  const fin = html.indexOf('</form>', ini)
  return { abre: attrs(m[0].slice(5, -1)), html: html.slice(ini, fin < 0 ? undefined : fin + 7) }
}

/**
 * Los pares nombre/valor que el navegador mandaria al enviar el formulario (los
 * "controles exitosos"): sin botones, sin archivos, sin deshabilitados, sin checkboxes
 * destildados. El orden se respeta, y un nombre puede repetirse (select multiple).
 */
export function camposDelForm(html) {
  const pares = []
  const re = /<(\/?)(input|select|option|textarea)\b([^>]*)>/gi
  let sel = null
  let m
  while ((m = re.exec(html))) {
    const [, cierra, tag0, resto] = m
    const tag = tag0.toLowerCase()
    if (cierra) {
      if (tag === 'select' && sel) {
        if (!sel.alguno && !sel.multiple && sel.primero != null && !sel.disabled) pares.push([sel.name, sel.primero])
        sel = null
      }
      continue
    }
    const a = attrs(resto)
    if (tag === 'input') {
      const tipo = (a.type || 'text').toLowerCase()
      if (!a.name || 'disabled' in a) continue
      if (['submit', 'button', 'image', 'file', 'reset'].includes(tipo)) continue
      if ((tipo === 'checkbox' || tipo === 'radio') && !('checked' in a)) continue
      pares.push([a.name, a.value ?? (tipo === 'checkbox' ? 'on' : '')])
    } else if (tag === 'select') {
      sel = { name: a.name, multiple: 'multiple' in a, disabled: 'disabled' in a || !a.name, alguno: false, primero: null }
    } else if (tag === 'option' && sel) {
      // Sin value, el valor de la opcion es su texto.
      let valor = a.value
      if (valor === undefined) {
        const fin = html.indexOf('<', re.lastIndex)
        valor = decode(html.slice(re.lastIndex, fin < 0 ? undefined : fin)).trim()
      }
      if (sel.primero == null) sel.primero = valor
      if ('selected' in a && !sel.disabled) { pares.push([sel.name, valor]); sel.alguno = true }
    } else if (tag === 'textarea') {
      const fin = html.toLowerCase().indexOf('</textarea>', re.lastIndex)
      const texto = decode(html.slice(re.lastIndex, fin))
      re.lastIndex = fin + 11
      // El navegador saca UN salto de linea inicial del contenido de un textarea.
      if (a.name && !('disabled' in a)) pares.push([a.name, texto.replace(/^\r?\n/, '')])
    }
  }
  return pares
}

/** Los botones de un formulario por nombre: { name: value }. */
export function botones(html) {
  const b = {}
  for (const m of html.matchAll(/<(?:input|button)\b([^>]*)>/gi)) {
    const a = attrs(m[1])
    if (a.name && (a.type || '').toLowerCase() === 'submit') b[a.name] = a.value ?? ''
  }
  return b
}

// Reemplaza el elemento cuyo id empieza con `prefijo` (Drupal le pega un sufijo aleatorio,
// `--AbC123`, que cambia en cada respuesta) por `nuevo`, balanceando las etiquetas.
function reemplazarElemento(html, prefijo, nuevo) {
  const re = new RegExp(`<([a-z0-9]+)\\b[^>]*\\bid="${prefijo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:--[^"]*)?"`, 'i')
  const m = re.exec(html)
  if (!m) return null
  const tag = m[1].toLowerCase()
  const tags = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi')
  tags.lastIndex = m.index
  let prof = 0
  let t
  while ((t = tags.exec(html))) {
    prof += t[1] ? -1 : 1
    if (prof === 0) return html.slice(0, m.index) + nuevo + html.slice(tags.lastIndex)
  }
  return null
}

/** Aplica la respuesta AJAX de Drupal (los comandos que importan) al HTML de la pagina. */
export function aplicarComandos(html, comandos) {
  for (const c of comandos) {
    if (c.command === 'update_build_id') html = html.split(c.old).join(c.new)
    if (c.command === 'insert' && typeof c.data === 'string' && c.data.trim()) {
      // Sin selector, Drupal reemplaza el "wrapper" del elemento que disparo el AJAX; ese
      // wrapper es el elemento raiz de `data`, y su id (sin el sufijo) lo encuentra aca.
      const raiz = c.data.match(/^\s*(?:<!--[\s\S]*?-->\s*)*<[a-z0-9]+\b[^>]*\bid="([^"]+)"/i)
      const id = c.selector?.startsWith('#') ? c.selector.slice(1) : raiz?.[1]
      if (!id) continue
      const prefijo = id.replace(/--[A-Za-z0-9_-]+$/, '')
      const nuevo = reemplazarElemento(html, prefijo, c.data)
      if (nuevo == null) throw new ErrorDrupal(`La respuesta de Drupal trae ${prefijo} y no lo encuentro en la pagina.`)
      html = nuevo
    }
  }
  return html
}

// ---------------------------------------------------------------------------------------
// El arbol: que paragraph es cada campo.

const CAMPO_RAIZ = 'field_ln_n_components'

/**
 * Lee el formulario ya abierto y devuelve la pagina como lista de paragraphs, cada uno con
 * su clave (la ruta de su nombre en el formulario), su tipo y sus campos CON VALOR.
 * Un paragraph que sigue cerrado aparece igual, con `cerrado: true` y sin campos.
 */
export function arbol(html) {
  const { html: form } = formDelNodo(html)
  const pares = camposDelForm(form)

  // Fila de cada paragraph: <tr class="draggable paragraph-type--x"> y despues, su primer
  // campo con [subform] (o su boton de editar si esta cerrado).
  //
  // La clave sale del primer nombre con [subform] que aparece despues: es el prefijo MAS
  // CORTO que todavia no tiene dueño. No alcanza con tomar el primer campo propio: un
  // Accordion Grid dibuja la tabla de sus items ANTES que sus campos, asi que lo primero
  // que sigue es un campo de un hijo; pero los padres van antes que los hijos, asi que
  // el prefijo libre mas corto es siempre el de esta fila.
  const filas = []
  const usadas = new Set()
  const re = /<tr\b[^>]*class="[^"]*\bparagraph-type--([a-z0-9-]+)[^"]*"[^>]*>/gi
  let m
  while ((m = re.exec(form))) {
    const sigue = form.slice(re.lastIndex)
    const tr = sigue.search(/<tr\b/i)
    const propio = tr < 0 ? sigue : sigue.slice(0, tr)
    const etiqueta = propio.match(/paragraph-type-label[^>]*>\s*([^<]+?)\s*</)?.[1]
    // Cerrado: tiene su boton Editar y ningun campo (los campos no estan en el HTML).
    const editar = propio.match(/name="([a-z0-9_]+)_edit"/)
    const conCampo = sigue.match(/name="([^"]*\[subform\][^"]*)"/)
    let clave = null
    if (conCampo && !(editar && !/\[subform\]/.test(propio))) {
      const n = conCampo[1]
      for (let i = n.indexOf('[subform]'); i >= 0; i = n.indexOf('[subform]', i + 1)) {
        const k = n.slice(0, i)
        if (!usadas.has(k)) { clave = k; break }
      }
    }
    if (clave) usadas.add(clave)
    filas.push({ tipo: m[1].replace(/-/g, '_'), etiqueta: etiqueta && decode(etiqueta), clave, boton: editar?.[1] ?? null })
  }

  const paragraphs = []
  const porClave = new Map()
  for (const f of filas) {
    if (!f.clave) {
      paragraphs.push({ clave: null, ruta: f.boton, tipo: f.tipo, etiqueta: f.etiqueta, cerrado: true, campos: {} })
      continue
    }
    if (porClave.has(f.clave)) continue
    const p = { clave: f.clave, ruta: rutaLegible(f.clave), tipo: f.tipo, etiqueta: f.etiqueta, cerrado: false, campos: {} }
    porClave.set(f.clave, p)
    paragraphs.push(p)
  }
  // Cada campo va al paragraph mas profundo cuya clave es su prefijo.
  const claves = [...porClave.keys()].sort((a, b) => b.length - a.length)
  const pagina = {}
  for (const [nombre, valor] of pares) {
    if (valor === '' || valor == null) continue
    if (!nombre.startsWith(CAMPO_RAIZ + '[')) {
      if (/^(title|path|moderation_state|status|langcode)\[/.test(nombre)) pagina[nombre] = valor
      continue
    }
    if (/\[_weight\]$/.test(nombre)) continue
    const clave = claves.find(k => nombre.startsWith(k + '[subform]'))
    if (!clave) continue
    const p = porClave.get(clave)
    const rel = nombre.slice(clave.length + '[subform]'.length)
    p.campos[rel] = p.campos[rel] === undefined ? valor : [].concat(p.campos[rel], valor)
  }
  return { pagina, paragraphs }
}

// field_ln_n_components[2][subform][field_c_subitems][0] -> "2 > field_c_subitems 0"
export function rutaLegible(clave) {
  return clave.slice(CAMPO_RAIZ.length)
    .split('[subform]')
    .map(t => t.replace(/^\[|\]$/g, '').split('][').join(' '))
    .join(' > ')
}

// ---------------------------------------------------------------------------------------
// La sesion.

async function preguntar(texto, oculto = false) {
  if (!process.stdin.isTTY) return ''
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  if (oculto) rl._writeToOutput = s => { if (s.includes(texto)) rl.output.write(s) }
  const r = await new Promise(res => rl.question(texto, res))
  rl.close()
  if (oculto) process.stdout.write('\n')
  return r
}

/** Las credenciales salen de DRUPAL_MCP_USER_<ENV>_<MKT> / DRUPAL_MCP_PASS_<ENV>_<MKT>, o se preguntan. */
export async function credenciales(sitio) {
  const sfx = `${sitio.env}_${sitio.mkt}`
  const user = process.env[`DRUPAL_MCP_USER_${sfx}`] || await preguntar(`Usuario de Drupal (${sfx.toLowerCase()}): `)
  const pass = process.env[`DRUPAL_MCP_PASS_${sfx}`] || await preguntar('Contraseña (no se muestra): ', true)
  if (!user || !pass) throw new ErrorDrupal(`Faltan las credenciales: DRUPAL_MCP_USER_${sfx} y DRUPAL_MCP_PASS_${sfx}.`)
  return { user, pass }
}

export class Sesion {
  constructor(sitio, { pausa = 800 } = {}) {
    this.sitio = sitio
    this.cookies = new Map()
    this.pausa = pausa // entre pedidos: de a poco, sin rafagas
  }

  async _fetch(url, opts = {}) {
    if (this._ultimo) {
      const falta = this.pausa - (Date.now() - this._ultimo)
      if (falta > 0) await new Promise(r => setTimeout(r, falta))
    }
    this._ultimo = Date.now()
    const headers = { 'user-agent': USER_AGENT, ...(opts.headers || {}) }
    if (this.cookies.size) headers.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ')
    const res = await fetch(url, { ...opts, headers, redirect: 'manual' })
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [kv] = c.split(';')
      const i = kv.indexOf('=')
      const k = kv.slice(0, i).trim()
      const v = kv.slice(i + 1).trim()
      if (/deleted|^$/.test(v) || /max-age=0/i.test(c)) this.cookies.delete(k)
      else this.cookies.set(k, v)
    }
    return res
  }

  // GET siguiendo redirecciones; devuelve { status, url, html }.
  async get(ruta) {
    let url = new URL(ruta, this.sitio.base).href
    for (let i = 0; i < 6; i++) {
      const res = await this._fetch(url)
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        url = new URL(res.headers.get('location'), url).href
        continue
      }
      return { status: res.status, url, html: await res.text() }
    }
    throw new ErrorDrupal(`Demasiadas redirecciones en ${ruta}`)
  }

  // POST urlencoded. No sigue la redireccion: quien llama decide (un 303 = guardo bien).
  async post(ruta, pares, headers = {}) {
    const body = new URLSearchParams(pares.map(([k, v]) => [k, v ?? '']))
    return this._fetch(new URL(ruta, this.sitio.base).href, {
      method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
    })
  }

  async login({ user, pass } = {}) {
    if (!user || !pass) ({ user, pass } = await credenciales(this.sitio))
    const { html } = await this.get('/user/login')
    const fbi = html.match(/name="form_build_id" value="([^"]+)"/)?.[1]
    if (!fbi) throw new ErrorDrupal('No encontre el formulario de login.')
    const op = html.match(/<form[^>]*id="user-login-form"[\s\S]*?<input[^>]*type="submit"[^>]*value="([^"]*)"/)?.[1] ?? 'Log in'
    const res = await this.post('/user/login', [['name', user], ['pass', pass], ['form_build_id', fbi], ['form_id', 'user_login_form'], ['op', decode(op)]])
    if (!(res.status >= 300 && res.status < 400)) throw new ErrorDrupal('Drupal rechazo el login (usuario o contraseña).')
    await res.arrayBuffer().catch(() => {})
    this.usuario = user
    return true
  }

  /** De una ruta del sitio (/adopta/x) o "node/123" al numero de nodo. */
  async nid(ruta) {
    const directo = String(ruta).match(/^\/?node\/(\d+)$/) || String(ruta).match(/^(\d+)$/)
    if (directo) return Number(directo[1])
    const { status, html } = await this.get(ruta)
    if (status !== 200) throw new ErrorDrupal(`${ruta}: el sitio responde ${status}.`)
    const n = html.match(/data-history-node-id="(\d+)"/) || html.match(/rel="shortlink" href="[^"]*\/node\/(\d+)"/) || html.match(/\/node\/(\d+)\/edit/)
    if (!n) throw new ErrorDrupal(`${ruta}: no pude saber que nodo es.`)
    return Number(n[1])
  }

  /** Las rutas que empiezan con `prefijo`, sacadas del listado de alias de URL. */
  async rutasConPrefijo(prefijo) {
    const rutas = new Map()
    for (let page = 0; page < 20; page++) {
      const { html } = await this.get(`/admin/config/search/path?search=${encodeURIComponent(prefijo.replace(/^\//, ''))}&page=${page}`)
      let nuevas = 0
      for (const fila of html.split(/<tr\b/i).slice(1)) {
        const celdas = [...fila.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(c => decode(c[1].replace(/<[^>]+>/g, '')).trim())
        const alias = celdas.find(c => c.startsWith('/'))
        const sistema = celdas.find(c => /^\/node\/\d+$/.test(c))
        if (alias && sistema && (alias === prefijo || alias.startsWith(prefijo.replace(/\/$/, '') + '/')) && !rutas.has(alias)) {
          rutas.set(alias, Number(sistema.split('/')[2])); nuevas++
        }
      }
      if (!/rel="next"|pager__item--next/.test(html) || !nuevas) break
    }
    return [...rutas].map(([ruta, nid]) => ({ ruta, nid }))
  }

  /** El formulario de edicion con TODOS los paragraphs abiertos. No guarda nada. */
  async formAbierto(nid) {
    let { status, html } = await this.get(`/node/${nid}/edit`)
    if (status !== 200) throw new ErrorDrupal(`node/${nid}/edit: el sitio responde ${status}.`)
    const accion = formDelNodo(html).abre.action || `/node/${nid}/edit`
    const apretados = new Set()
    for (let i = 0; i < 40; i++) {
      // "Editar todo" de cada lista de paragraphs, de afuera hacia adentro.
      const pendiente = Object.entries(botones(formDelNodo(html).html))
        .find(([n]) => n.startsWith(CAMPO_RAIZ) && n.endsWith('_edit_all') && !apretados.has(n))
      if (!pendiente) break
      apretados.add(pendiente[0])
      const pares = [...camposDelForm(formDelNodo(html).html),
        ['_triggering_element_name', pendiente[0]], ['_triggering_element_value', pendiente[1]], ['_drupal_ajax', '1']]
      const url = accion + (accion.includes('?') ? '&' : '?') + 'ajax_form=1&_wrapper_format=drupal_ajax'
      const res = await this.post(url, pares, { accept: 'application/json', 'x-requested-with': 'XMLHttpRequest' })
      const texto = await res.text()
      const i0 = texto.indexOf('[')
      if (res.status !== 200 || i0 < 0) throw new ErrorDrupal(`Abrir ${pendiente[0]}: Drupal respondio ${res.status}.`)
      html = aplicarComandos(html, JSON.parse(texto.slice(i0)))
    }
    return { html, accion }
  }
}

// La INTERFAZ: un servidor chiquito que se abre en el navegador de todos los dias, para
// que armar una pagina no requiera terminal.
//
// Por que una pagina local y no una ventana de escritorio: el runner tiene que manejar
// un navegador con la sesion de Drupal del usuario, asi que corre si o si en la maquina
// de la persona. Una pagina servida en 127.0.0.1 usa el navegador que ya esta instalado,
// no agrega una sola dependencia, se ve igual en Mac y en Windows, y el codigo sigue
// siendo legible — nada empaquetado, nada firmado.
//
// SEGURIDAD. Un servidor local que puede manejar la sesion de Drupal no puede quedar
// abierto a cualquiera:
//   - escucha SOLO en 127.0.0.1, nunca en la red;
//   - cada arranque genera un TOKEN aleatorio que va en la URL y que toda llamada tiene
//     que repetir. Sin el, no se responde nada;
//   - se rechaza cualquier pedido con `Origin` de otro lado, para que una pagina web
//     abierta en otra pestaña no pueda dispararle ordenes (CSRF);
//   - y se rechaza un `Host` que no sea 127.0.0.1, que es lo que evita el rebinding de
//     DNS. Nada de esto es paranoia de mas: es lo que va a preguntar compliance.
import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { openBrowser } from './browser.js'
import { loadManifest, countBlocks, validateManifest } from './manifest.js'
import { missingTypes } from './mapping.js'
import { buildPage } from './build.js'
import { subirPlaceholders } from './media.js'
import { recortarPagina } from './imagenes.js'
import { leerPagina } from '../tools/hub.js'
import { aManifiesto } from '../tools/traducir.js'
import { slugDePagina, planDelHub } from '../tools/paginas.js'
import { logRun } from './log.js'

// El alt que se le pone a una foto que no trae uno propio. Es una marca BUSCABLE en la
// Media library, no un alt inventado: un texto plausible parece cargado y no lo corrige
// nadie. Mismo valor que usa `tools/subir-medios.mjs`.
const ALT_DE_RESERVA = 'Alt Placeholder'

const AQUI = fileURLToPath(new URL('.', import.meta.url))
const APP = join(AQUI, 'ui', 'app.html')

export async function startUi({ mapping, mappingFile, openOpts = {}, manifestDir = 'manifests' }) {
  const token = randomBytes(24).toString('hex')

  // UN solo navegador para toda la sesion: el login lo abre y las corridas lo reusan,
  // asi la persona no vuelve a loguearse en cada pagina.
  let nav = null
  let abriendo = null
  const vivo = () => !!nav && !nav.cerrado

  async function navegador() {
    if (nav?.cerrado) nav = null
    if (nav) return nav
    // Dos clics seguidos no tienen que abrir dos navegadores.
    if (abriendo) return abriendo
    abriendo = (async () => {
      // Al cerrar la ventana, Chrome tarda un momento en soltar el perfil. Sin reintento,
      // volver a abrir justo despues falla con "el perfil esta en uso".
      let ultimo
      for (let i = 0; i < 4; i++) {
        try {
          const n = await openBrowser(openOpts)
          n.ctx.on('close', () => { n.cerrado = true; sesion = null })
          nav = n
          return n
        } catch (e) {
          ultimo = e
          await new Promise((ok) => setTimeout(ok, 800))
        }
      }
      throw new Error(`No se pudo abrir el navegador: ${ultimo?.message || 'desconocido'}`)
    })()
    try { return await abriendo } finally { abriendo = null }
  }

  // ¿Hay sesion? Se pregunta por HTTP con las cookies del perfil, NO navegando la
  // ventana: mientras la persona escribe sus credenciales, moverle la pagina de abajo
  // le borra lo que puso. El valor queda cacheado y la pagina lo lee de ahi, asi que el
  // refresco automatico no le pega a Drupal cada pocos segundos.
  //   null = no lo sabemos (no hay navegador abierto)  ·  true/false = comprobado
  let sesion = null
  async function comprobarSesion({ abrir = false } = {}) {
    if (!vivo()) {
      if (!abrir) { sesion = null; return sesion }
      await navegador()
    }
    try {
      const res = await nav.ctx.request.get(new URL('/user', mapping.site).href, { timeout: 15000 })
      sesion = res.ok() && !/\/user\/login/.test(res.url())
    } catch { sesion = false }
    return sesion
  }

  // Una corrida por vez. El estado vive aca y la pagina lo consulta cada medio segundo:
  // mas simple que un stream y no se pierde nada si la pestaña se recarga.
  let corrida = null
  const nuevaCorrida = (archivo, save, tipo = 'pagina') => (corrida = {
    archivo, save, tipo, estado: 'corriendo', pasos: [], resultado: null, error: null,
    desde: new Date().toISOString(),
  })

  function manifiestos() {
    const dir = resolve(manifestDir)
    if (!existsSync(dir)) return []
    return readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => {
      const archivo = join(manifestDir, f)
      try {
        const m = loadManifest(archivo)
        return {
          archivo, nombre: f, titulo: m.page.title, ruta: m.page.path || null,
          publicada: m.page.published === true,
          bloques: countBlocks(m.blocks), falta: missingTypes(mapping, m.blocks),
        }
      } catch (e) {
        return { archivo, nombre: f, error: e.message }
      }
    })
  }

  // LA CADENA ENTERA, no solo el ultimo paso.
  //
  // La interfaz armaba la pagina a partir del archivo de manifiesto y nada mas: no lo
  // regeneraba desde el hub, no recortaba y no subia. Eso hacia que dependiera de que
  // alguien hubiera corrido tres comandos antes, en orden, y que el archivo estuviera al
  // dia — y cuando no lo estaba no fallaba nada, simplemente se armaba una pagina con
  // datos viejos. Paso con Conoce Purina: el manifiesto no pedia ninguna imagen y el
  // banner quedo vacio sin un solo error.
  //
  // Va todo aca y no llamando a las herramientas como procesos aparte porque Chrome no
  // deja abrir el mismo perfil dos veces: el navegador de la interfaz es EL navegador.
  async function correr(archivo, save) {
    const c = nuevaCorrida(archivo, save)
    if (!(await comprobarSesion({ abrir: true }))) {
      c.estado = 'error'
      c.error = 'No hay sesion en Drupal. Conectate primero.'
      return
    }
    const { ctx, page } = await navegador()
    // Fuera del try: el catch necesita el titulo para el registro, y si el manifiesto
    // todavia no se leyo no hay titulo que poner.
    let m = null
    try {
      m = await alDia({ archivo, ctx, onStep: (s) => c.pasos.push(s) })
      const falta = missingTypes(mapping, m.blocks)
      if (falta.length) throw new Error(`El mapping no conoce: ${falta.join(', ')}`)
      const res = await buildPage({ page, mapping, manifest: m, save, onStep: (s) => c.pasos.push(s) })
      const widgets = guardarWidgets(res.imagenes)
      // CUALES quedaron sin tocar. Sin los nombres, el aviso dice "los campos de imagen" y
      // uno busca un problema con las fotos — cuando el que sobra puede ser otro campo con
      // widget de archivo (paso con el video externo, que en el mapping figura como
      // imagen). El nombre del campo es lo unico que hace falta para saber cual mirar.
      const sinTocar = (res.imagenes || []).map((i) => i.ref)
      logRun({ manifest: archivo, title: m.page.title, ...res, imagenes: undefined, widgets, sinTocar })
      c.estado = 'listo'
      c.resultado = { ...res, imagenes: undefined, widgets, sinTocar, titulo: m.page.title }
    } catch (e) {
      // Una foto de como quedo la pantalla: es lo que hace falta para entender un error
      // contra el CMS, y quien lo corre no tiene por que saber mirar el DOM.
      c.foto = await sacarFoto(page).catch(() => null)
      logRun({ manifest: archivo, title: m?.page?.title, error: e.message, foto: c.foto })
      c.estado = 'error'
      c.error = e.message
    }
  }

  // Deja el manifiesto AL DIA antes de armar: lo regenera desde el hub, recorta las fotos
  // y las sube a la Media library. Es la cadena de `npm run publicar` metida adentro de
  // la interfaz, para que sean la misma cosa y no dos caminos que se desincronizan.
  //
  // Si la pagina NO esta en el hub (un manifiesto escrito a mano, o pegado), se usa el
  // archivo tal cual y se dice. No es un error: el hub es *uno* de los generadores de
  // manifiestos, no el unico.
  async function alDia({ archivo, ctx, onStep }) {
    const previo = loadManifest(archivo)
    const path = previo.page?.path
    if (!path) {
      onStep('El manifiesto no dice de que pagina del hub sale: se usa tal cual.')
      return previo
    }

    let leido = null
    try {
      leido = await leerPagina(path, previo.page?.market || 'MX')
    } catch (e) {
      onStep(`No se pudo leer el hub (${String(e.message).slice(0, 80)}): se usa el manifiesto que hay.`)
      return previo
    }
    if (!leido) {
      onStep(`La pagina ${path} no esta en el hub: se usa el manifiesto que hay.`)
      return previo
    }

    // 1. Recortar. Va ANTES de traducir porque el traductor pide los medios por nombre y
    // ese nombre lo calculan las dos partes con la misma funcion (ver tools/medios.js).
    const slug = slugDePagina(leido.pagina.path)
    onStep(`Leyendo ${path} del hub y recortando sus imagenes…`)
    const plan = { pagina: leido.pagina, bloques: leido.bloques.map(planDelHub), revisar: [] }
    const rec = await recortarPagina({ ctx, plan, slug, destino: 'imagenes', onStep })
    for (const n of rec.notas) onStep(`  ! ${n}`)

    // 2. Subir los medios recortados. Idempotente: los que ya estan se saltean.
    if (rec.indice.length) {
      onStep(`Subiendo ${rec.indice.length} medio/s a la Media library…`)
      const { page } = await navegador()
      const r = await subirPlaceholders({
        page, mapping, carpeta: rec.carpeta, alUsar: ALT_DE_RESERVA, onStep,
      })
      onStep(`${r.subidos} subido/s, ${r.salteados} ya estaban.`)
      if (r.sinAlt?.length) {
        onStep(`OJO: ${r.sinAlt.length} medio/s quedaron con el alt "${r.alUsado}" — hay que completarlo.`)
      }
    }

    // 3. Traducir a manifiesto y dejarlo en disco, que es lo que se arma.
    const { manifiesto, avisos } = aManifiesto(leido.pagina, leido.bloques, mapping.paragraphs?.types)
    for (const a of avisos) onStep(`  · ${a}`)
    writeFileSync(resolve(archivo), JSON.stringify(manifiesto, null, 2) + '\n', 'utf8')
    onStep(`Manifiesto al dia: ${countBlocks(manifiesto.blocks)} paragraph/s.`)
    return manifiesto
  }

  // Subir los placeholders desde la interfaz. Va por aca y no por la terminal porque el
  // perfil de Chrome es UNO: con la ventana de la interfaz abierta, un segundo proceso
  // no puede usarlo (Chrome lo bloquea y aborta para no corromperlo). Y porque los
  // content editors no van a abrir una terminal, que es de lo que se trata todo esto.
  async function subir(solo) {
    const c = nuevaCorrida(null, false, 'imagenes')
    if (!(await comprobarSesion({ abrir: true }))) {
      c.estado = 'error'
      c.error = 'No hay sesion en Drupal. Conectate primero.'
      return
    }
    const { page } = await navegador()
    try {
      const r = await subirPlaceholders({
        page, mapping, solo: solo || undefined,
        carpeta: resolve('placeholders'),
        onStep: (t) => c.pasos.push(t),
      })
      c.estado = 'listo'
      c.resultado = { ...r }
    } catch (e) {
      c.foto = await sacarFoto(page).catch(() => null)
      c.estado = 'error'
      c.error = e.message
    }
  }

  const rutas = {
    // Lee el estado CACHEADO: no toca Drupal ni la ventana. La pagina lo consulta cada
    // pocos segundos y tiene que ser inofensivo.
    'GET /api/estado': async () => ({
      sitio: mapping.site, mapping: basename(mappingFile),
      sesion, navegador: vivo(), manifiestos: manifiestos(), corrida,
    }),
    'GET /api/corrida': async () => corrida,
    // Abre la ventana y comprueba. Si el perfil ya tenia la sesion de la vez pasada,
    // esto solo alcanza y la persona no vuelve a escribir nada.
    'POST /api/conectar': async () => {
      const { page } = await navegador()
      // Directo a la pantalla de login, no a la home: es a lo que se vino. Si la sesion
      // ya estaba viva, Drupal redirige solo al perfil y no hay nada que escribir.
      const donde = new URL('/user/login', mapping.site).href
      await page.goto(donde, { waitUntil: 'domcontentloaded' }).catch(() => {})
      return { sesion: await comprobarSesion() }
    },
    'POST /api/sesion': async () => ({ sesion: await comprobarSesion({ abrir: true }) }),
    'POST /api/build': async (body) => {
      if (corrida?.estado === 'corriendo') throw new Error('Ya hay una pagina armandose.')
      if (!body?.archivo) throw new Error('Falta el manifiesto.')
      // No se espera: la pagina sigue el avance por /api/corrida.
      correr(body.archivo, !!body.save).catch(() => {})
      return { ok: true }
    },
    'POST /api/subir-imagenes': async (body) => {
      if (corrida?.estado === 'corriendo') throw new Error('Ya hay algo corriendo.')
      subir(body?.solo).catch(() => {})
      return { ok: true }
    },
    'POST /api/guardar-manifiesto': async (body) => {
      // Un manifiesto que vino de otro lado (el hub, un mail) se deja en manifests/.
      const m = validateManifest(body?.contenido, body?.nombre || '(pegado)')
      const nombre = (body?.nombre || `${m.page.title}.json`).replace(/[^\w.\- ]+/g, '_').replace(/(\.json)?$/, '.json')
      const destino = join(resolve(manifestDir), nombre)
      writeFileSync(destino, JSON.stringify(m, null, 2) + '\n')
      return { nombre }
    },
    'POST /api/cerrar-navegador': async () => {
      if (vivo()) await nav.ctx.close().catch(() => {})
      nav = null
      sesion = null
      return { ok: true }
    },
  }

  const server = createServer(async (req, res) => {
    const enviar = (code, obj) => {
      res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify(obj ?? null))
    }
    try {
      const url = new URL(req.url, 'http://127.0.0.1')
      const puerto = server.address().port

      // Solo desde esta maquina, solo con el token de este arranque.
      const host = (req.headers.host || '').split(':')[0]
      if (host !== '127.0.0.1' && host !== 'localhost') return enviar(403, { error: 'host no permitido' })
      const origen = req.headers.origin
      if (origen && origen !== `http://127.0.0.1:${puerto}` && origen !== `http://localhost:${puerto}`) {
        return enviar(403, { error: 'origen no permitido' })
      }
      const dado = url.searchParams.get('t') || req.headers['x-token']
      if (dado !== token) return enviar(403, { error: 'token invalido' })

      if (req.method === 'GET' && url.pathname === '/') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        return res.end(readFileSync(APP, 'utf8'))
      }

      const ruta = rutas[`${req.method} ${url.pathname}`]
      if (!ruta) return enviar(404, { error: 'no existe' })

      let body = null
      if (req.method === 'POST') {
        const crudo = await leerCuerpo(req)
        body = crudo ? JSON.parse(crudo) : null
      }
      return enviar(200, await ruta(body))
    } catch (e) {
      return enviar(400, { error: e.message })
    }
  })

  await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
  const url = `http://127.0.0.1:${server.address().port}/?t=${token}`
  return { server, url, cerrar: async () => { if (vivo()) await nav.ctx.close().catch(() => {}); server.close() } }
}

// El HTML de los widgets de imagen, para poder enseñarle al runner a elegirlas. Cada
// sitio los arma distinto (una Media library es un modal con buscador, un inline entity
// form es un autocompletar), y sin ver el de ESTE no se puede escribir el mapping.
function guardarWidgets(imagenes) {
  if (!imagenes || !imagenes.length) return null
  const f = resolve('logs', 'campos-imagen.html')
  mkdirSync(dirname(f), { recursive: true })
  writeFileSync(f, imagenes.map((i) => `<!-- ===== ${i.ref} ===== -->\n${i.html}`).join('\n\n'))
  return f
}

async function sacarFoto(page) {
  const f = resolve('logs', `error-${new Date().toISOString().replace(/[:.]/g, '-')}.png`)
  mkdirSync(dirname(f), { recursive: true })
  await page.screenshot({ path: f, fullPage: true })
  return f
}

function leerCuerpo(req) {
  return new Promise((ok, mal) => {
    let d = ''
    req.on('data', (c) => {
      d += c
      if (d.length > 4e6) { mal(new Error('el manifiesto es demasiado grande')); req.destroy() }
    })
    req.on('end', () => ok(d))
    req.on('error', mal)
  })
}

// Abre la URL en el navegador de TODOS LOS DIAS (no el del runner).
export function abrirEnNavegador(url) {
  const cmd = process.platform === 'darwin' ? ['open', [url]]
    : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
      : ['xdg-open', [url]]
  try { spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore' }).unref() } catch { /* se abre a mano */ }
}

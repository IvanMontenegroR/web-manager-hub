// Abre el navegador del SISTEMA (Chrome o Edge) con un perfil propio del runner.
//
// Dos decisiones que importan en una maquina corporativa:
//   - `playwright-core` en vez de `playwright`: el paquete completo se descarga su
//     propio Chromium (~150MB) de un CDN de Microsoft al instalar, y el proxy de la
//     empresa suele bloquearlo. `playwright-core` no descarga nada y con `channel`
//     usa el Chrome/Edge que ya esta instalado.
//   - PERFIL PERSISTENTE propio, en `.profile/` adentro del runner. La sesion de
//     Drupal queda ahi despues de que te logueas UNA vez a mano, asi que el runner
//     nunca ve ni guarda tu contraseña. Y es un perfil aparte: no se toca el de tu
//     navegador de todos los dias.
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

export const CHANNELS = { chrome: 'chrome', edge: 'msedge' }

export async function openBrowser({ browser = 'chrome', profileDir, slowMo = 0, executablePath, headless = false } = {}) {
  // Para correr fuera de una PC con Chrome instalado (un servidor, una sesion remota):
  // RUNNER_CHROME apunta a un binario de Chromium, RUNNER_PROFILE al perfil a usar y
  // RUNNER_UA es el User-Agent con el que se presenta (ej. "migration-mx"). Sin esas
  // variables todo queda como siempre.
  executablePath = executablePath || process.env.RUNNER_CHROME || undefined
  profileDir = process.env.RUNNER_PROFILE || profileDir
  // `executablePath` es la valvula de escape: si la deteccion del canal falla (una
  // instalacion de Chrome fuera del path habitual), se apunta al binario a mano. Es
  // ademas lo que usa el test contra el Drupal de mentira.
  const channel = executablePath ? undefined : CHANNELS[browser]
  if (!channel && !executablePath) throw new Error(`Navegador desconocido: ${browser}. Usa chrome o edge.`)
  const dir = resolve(profileDir || '.profile')
  mkdirSync(dir, { recursive: true })

  // Siempre CON ventana: el login es manual y hay que poder ver que esta pasando.
  // `slowMo` deja seguir los pasos a ojo y ademas no atropella al servidor.
  const ctx = await chromium.launchPersistentContext(dir, {
    ...(channel ? { channel } : { executablePath }),
    headless,
    slowMo,
    viewport: null,
    // Ancho de escritorio garantizado: por debajo de ~1024px Gin esconde la barra lateral
    // (alias, publicacion) y sus campos quedan invisibles aunque existan.
    args: ['--start-maximized', '--window-size=1600,1000'],
    ...(process.env.RUNNER_UA ? { userAgent: process.env.RUNNER_UA } : {}),
  })
  const page = ctx.pages()[0] || (await ctx.newPage())
  return { ctx, page }
}

// ¿Estamos logueados? En Drupal alcanza con pedir una ruta que exige sesion y ver si
// nos manda al login. No se asume nada del theme.
export async function isLoggedIn(page, site) {
  let res = await page.goto(new URL('/user', site).href, { waitUntil: 'domcontentloaded' })
  if (await pasarAvisoSandbox(page)) res = await page.goto(new URL('/user', site).href, { waitUntil: 'domcontentloaded' })
  const url = page.url()
  // Sin sesion Drupal manda al login, o muestra el formulario en la misma URL.
  const hayLogin = await page.locator('input[name="pass"]').count()
  return !!res && !/\/user\/login/.test(url) && !hayLogin
}

// Pantheon pone un aviso ("Sandbox Environment Notice") delante de TODO el sitio hasta que
// se toca "Continue" una vez; despues queda una cookie. En el Chrome de todos los dias ya
// se toco y no se ve, pero en un perfil nuevo tapa el login y el formulario. Devuelve true
// si lo paso.
export async function pasarAvisoSandbox(page) {
  if (!/Sandbox Environment Notice/i.test(await page.title().catch(() => ''))) return false
  await Promise.all([
    page.waitForLoadState('domcontentloaded').catch(() => {}),
    page.getByRole('button', { name: /continue/i }).click(),
  ])
  await page.waitForTimeout(1000)
  return true
}

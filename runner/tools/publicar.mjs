// Publica una pagina del hub en el CMS, de punta a punta.
//
//   npm run publicar -- /conoce-purina            # ENSAYO: no guarda nada
//   npm run publicar -- /conoce-purina --save     # de verdad
//   npm run publicar -- /conoce-purina --desde=3  # retomar desde un paso
//
// Corre los cuatro pasos en orden y FRENA en el primero que falle, diciendo con que
// retomar. Los pasos siguen existiendo sueltos (`npm run imagenes`, `npm run manifiesto`,
// ...) para cuando hace falta rehacer uno solo; esto es el camino de todos los dias.
//
// POR QUE ENSAYO POR DEFECTO. Regla de la casa: el runner no escribe en el CMS si no se
// lo piden. Sin `--save` el ultimo paso arma la pagina en el formulario y la deja abierta
// para mirarla, sin guardar.
//
// QUE PASOS SON Y POR QUE EN ESE ORDEN esta en publicar.js, que es una funcion pura y se
// prueba sin navegador.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pasos } from './publicar.js'
import { slugDePagina } from './paginas.js'

const args = process.argv.slice(2)
const market = args.find((a) => a.startsWith('--market='))?.split('=')[1] || 'MX'
const desde = Number(args.find((a) => a.startsWith('--desde='))?.split('=')[1] || 1)
const save = args.includes('--save')
const [path] = args.filter((a) => !a.startsWith('--'))
if (!path) {
  process.stderr.write('uso: node tools/publicar.mjs <path-de-la-pagina> [--market=MX] [--save] [--desde=N]\n'
    + '     el path es el de la pagina en el hub, por ejemplo /conoce-purina\n')
  process.exit(2)
}

const slug = slugDePagina(path)
// Si ya se recorto antes, se sabe aca si hay fotos. Si el paso 1 todavia no corrio, se
// asume que si y se vuelve a mirar cuando toque: recien entonces existe la carpeta.
const hayFotos = () => existsSync(resolve(`imagenes/${slug}/INDICE.json`))

const correr = (script, argv) => new Promise((ok, mal) => {
  const p = spawn(process.execPath, [script, ...argv], { stdio: 'inherit' })
  p.on('error', mal)
  p.on('close', (code) => (code === 0 ? ok() : mal(new Error(`salio con codigo ${code}`))))
})

const lista = pasos({ path, market, save, hayImagenes: true })
process.stdout.write(`\nPublicar ${path} [${market}] — ${save ? 'GUARDANDO' : 'ensayo, no guarda'}\n`)

for (const paso of lista) {
  if (paso.n < desde) {
    process.stdout.write(`\n— ${paso.n}/4  ${paso.que}  (salteado por --desde=${desde})\n`)
    continue
  }
  // La decision de saltear la subida se toma con la carpeta ya recortada, no antes.
  if (paso.script === 'tools/subir-medios.mjs' && !hayFotos()) {
    process.stdout.write(`\n— ${paso.n}/4  ${paso.que}  (se saltea: la pagina no tiene imagenes)\n`)
    continue
  }

  process.stdout.write(`\n=== ${paso.n}/4  ${paso.que}\n`)
  try {
    await correr(paso.script, paso.args)
  } catch (e) {
    process.stderr.write(`\nFRENO en el paso ${paso.n} (${paso.que}): ${e.message}\n`)
    process.stderr.write(`Cuando este resuelto, retomar con:\n`
      + `  npm run publicar -- ${path} --desde=${paso.n}${save ? ' --save' : ''}\n`)
    process.exit(1)
  }
}

process.stdout.write(save
  ? '\nListo: la pagina quedo GUARDADA como borrador en el CMS.\n'
  : '\nListo: fue un ensayo, no se guardo nada. Para guardarla:\n'
    + `  npm run publicar -- ${path} --save\n`)

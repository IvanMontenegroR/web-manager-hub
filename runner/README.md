# page-runner

Arma paginas en Drupal (nodo + paragraphs) a partir de un **manifiesto JSON**, manejando
el navegador con **la sesion del propio usuario**.

No es parte de Web Manager Hub: es una herramienta suelta. El hub va a ser *uno* de los
programas que generan manifiestos; cualquier otro proyecto puede generarlos con otra
cosa, o escribirlos a mano.

```
manifiesto.json  +  mapping.json  ->  page-runner  ->  borrador en Drupal
   que pagina        como es el
   hay que armar     formulario de
                     ESE Drupal
```

## Por que esta partido en dos

El **manifiesto** describe la pagina sin saber nada de Drupal: que paragraphs, en que
orden, con que valores. Es el contrato que sobrevive a todo lo demas — si mañana se
habilita JSON:API, el mismo archivo alimenta esa version, que es mas rapida y mas facil
de aprobar.

El **mapping** es lo unico especifico de un sitio: como se llaman los campos y donde
estan en el formulario. Vive en un archivo, fuera del codigo. Otro proyecto se soporta
escribiendo un mapping, sin tocar el programa.

## Instalacion

Requiere **Node 20+** y **Chrome o Edge ya instalado**. No descarga navegadores: usa el
que ya esta en la maquina (por eso la dependencia es `playwright-core` y no `playwright`,
que se baja su propio Chromium de ~150MB y el proxy corporativo suele bloquearlo).

```bash
cd runner
npm install
```

## Uso

**1. Loguearse una vez.** Se abre una ventana, entras con tu usuario como siempre. La
sesion queda en el perfil del runner (`.profile/`, que no se versiona). El runner nunca
ve ni guarda tu contraseña.

```bash
node src/cli.js login --mapping mapping/purina-latam.json
```

**2. Inspeccionar el formulario.** Este es el primer paso real contra el CMS: vuelca
todos los campos, los selects con sus opciones, los botones de agregar paragraph y los
desplegables. **Solo lee, no escribe nada.** Con esa salida se escribe el mapping.

```bash
node src/cli.js inspect --mapping mapping/purina-latam.json --out dump.json
```

Deja dos archivos: `dump.json` (todo) y `dump-draft.json` (los campos agrupados por
paragraph, que es el borrador para completar el mapping).

**3. Armar una pagina.** Sin `--save` llena el formulario y lo deja abierto para que lo
mires. Con `--save` guarda el borrador.

```bash
node src/cli.js build manifests/tenencia.json --mapping mapping/purina-latam.json
node src/cli.js build manifests/*.json --mapping mapping/purina-latam.json --save
```

Opciones: `--browser chrome|edge`, `--profile <dir>`, `--slowmo <ms>`, `--keepopen`.

## Reglas de la casa

- **Siempre borrador.** El runner no publica. Si el mapping sabe donde esta el check de
  publicado, lo destilda. Nada llega al publico sin que un humano lo apruebe.
- **No modifica nada existente.** Solo entra a "crear contenido". No edita, no borra.
- **Frena ante la duda.** Un campo que el mapping no conoce, o que no aparece en el
  formulario, es un ERROR y corta la corrida. Una pagina a medio armar es peor que una
  que no se armo. Si corta antes de `--save`, no quedo nada en el CMS.
- **Las imagenes no se automatizan.** Subir a la Media library (archivo + alt + decidir
  si se reusa un media existente) se hace a mano. El runner arma toda la estructura y
  todo el texto con la configuracion correcta; el editor sube las imagenes y publica.
  Un campo de imagen en el manifiesto se saltea con aviso.

## Para la revision de compliance

- **Que hace:** crea nodos nuevos, despublicados, en el CMS, llenando el mismo
  formulario que llenaria una persona. Nada mas.
- **Que NO hace:** no publica, no borra, no modifica contenido existente, no toca otros
  content types, no cambia configuracion del sitio.
- **Credenciales:** no pide, no guarda y no transmite contraseñas. Usa la sesion que el
  usuario abre a mano en su navegador. No hay tokens ni claves en el codigo ni en disco.
- **A donde viaja la informacion:** a ningun lado. El programa habla unicamente con el
  host de Drupal que dice el mapping. Sin telemetria, sin servicios de terceros, sin
  llamadas de red mas alla de ese host.
- **Dependencias:** una sola (`playwright-core`, con version fija), la libreria de
  automatizacion de navegador de Microsoft. El resto es Node estandar.
- **Carga sobre el servidor:** de a una pagina, en serie, con una demora configurable
  entre acciones (`--slowmo`, 120ms por defecto). No hay paralelismo ni scraping.
- **Auditoria:** cada corrida deja una linea en `logs/runs.jsonl` con la fecha, el
  manifiesto, el titulo y el node id creado, o el error. Local, no sale de la maquina.
- **Rollback:** todo lo creado queda despublicado, y el log dice exactamente que node
  ids se crearon para poder borrarlos.
- **Codigo:** fuente legible, sin ofuscar y sin empaquetar en un ejecutable, para que se
  pueda revisar entero. Son unos pocos cientos de lineas.

Conviene preguntar tambien si en la organizacion esto cae bajo gobernanza de **RPA**
(automatizacion de interfaces), que suele ser un proceso distinto al de aprobar un
script comun.

## Estructura

```
src/cli.js        comandos (login | inspect | build)
src/browser.js    abre Chrome/Edge del sistema con perfil propio
src/manifest.js   formato del manifiesto + validacion
src/mapping.js    formato del mapping + resolucion de selectores
src/inspect.js    volcado del formulario real
src/build.js      el motor: agrega paragraphs, abre desplegables, llena campos
src/log.js        registro local de corridas
mapping/          un archivo por sitio (se escribe con la salida de inspect)
manifests/        las paginas a armar
test/             Drupal de mentira + prueba del motor
```

## Tests

```bash
npm test
```

Levanta un Drupal de mentira que reproduce las formas del formulario real de Paragraphs
(los `name` con delta y subform, el alta por AJAX, los `<details>` plegados, CKEditor
sobre un textarea) y verifica que el motor sabe agregar, esperar, abrir desplegables,
llenar texto / rich text / selects, anidar hijos en un contenedor, dejar la pagina
despublicada, leer el node id y **frenar** ante un campo desconocido.

Lo que el test **no** puede decir es si el mapping es correcto: eso solo lo dice el CMS
de verdad. Por eso el orden es `inspect` primero, y `build` contra QA despues.

## Estado

El motor esta probado contra el formulario de mentira. **Falta correr `inspect` contra
el Drupal real** para escribir el mapping de Purina LATAM: los selectores de
`mapping/purina-latam.example.json` son una plantilla con la forma esperada, no valores
verificados.

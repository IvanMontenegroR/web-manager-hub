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

### Con la interfaz (lo normal)

**Doble clic** en `Abrir page-runner.command` (Mac) o `Abrir page-runner.bat` (Windows).
Se abre una pagina en tu navegador de todos los dias y ahi esta todo: iniciar sesion,
elegir la pagina, probarla sin guardar, crearla. No hace falta terminal.

La primera vez instala las dependencias solo, y si falta Node.js te lo dice en castellano
en vez de tirar un error.

Los tres pasos de la pantalla:

1. **Sesion en Drupal.** "Iniciar sesion" abre una ventana de Chrome. Entras con tu
   usuario como siempre, la dejas abierta y volves a tocar "Ya me logueé". Se hace una
   sola vez: la sesion queda en el perfil del runner y el runner nunca ve tu contraseña.
2. **Elegis la pagina.** Lista lo que haya en `manifests/`, con su titulo, cuantos
   bloques tiene y su ruta. Un manifiesto que pida un paragraph que el mapping todavia no
   conoce aparece bloqueado y dice cual falta, en vez de fallar a mitad de camino. Tambien
   se puede pegar un manifiesto que te haya dado el hub y queda guardado en esa carpeta.
3. **Dos botones.** *Probar sin guardar* llena el formulario para que lo mires y **no crea
   nada** en el CMS. *Crear borrador* lo guarda despublicado y te da el link para revisar,
   subir las imagenes y publicar. Los pasos se ven en vivo mientras corre.

### Por terminal

Lo mismo, para quien lo prefiera o para automatizar:

```bash
node src/cli.js ui                                        # la interfaz
node src/cli.js login   --mapping mapping/purina-latam.json
node src/cli.js build   manifests/ejemplo-tabs.json --mapping mapping/purina-latam.json
node src/cli.js build   manifests/*.json --mapping mapping/purina-latam.json --save
```

Sin `--save` llena el formulario y **deja la ventana abierta** para que lo mires: no
escribe nada en el CMS. Con `--save` aprieta Guardar y deja el borrador despublicado.

Si hay un solo archivo en `mapping/`, `--mapping` se puede omitir.
Otras opciones: `--browser chrome|edge`, `--profile <dir>`, `--slowmo <ms>`, `--keepopen`.

**Si el CMS cambia** (un campo nuevo, un paragraph nuevo), hay dos formas de rehacer el
mapping. `inspect` lo vuelca desde el sitio — solo lee, no escribe nada:

```bash
node src/cli.js inspect --mapping mapping/purina-latam.json --out dump.json
```

y `verify` compara el mapping contra un volcado del HTML guardado a mano, sin conexion:

```bash
npm run verify -- mapping/purina-latam.json form.html
```

## Reglas de la casa

- **Siempre borrador.** El runner no publica. Si el mapping sabe donde esta el check de
  publicado, lo destilda. Nada llega al publico sin que un humano lo apruebe.
- **No modifica nada existente.** Solo entra a "crear contenido". No edita, no borra.
- **Frena ante la duda.** Un campo que el mapping no conoce, o que no aparece en el
  formulario, es un ERROR y corta la corrida. Una pagina a medio armar es peor que una
  que no se armo. Si corta antes de `--save`, no quedo nada en el CMS.
- **Las imagenes no se automatizan TODAVIA.** Subir a la Media library (archivo + alt +
  decidir si se reusa un media existente) se hace a mano. El runner arma toda la
  estructura y todo el texto con la configuracion correcta; el editor sube las imagenes y
  publica. Un campo de imagen en el manifiesto se saltea con aviso.

## Placeholders

`placeholders/` trae una imagen de relleno por cada medida que pide el CMS — 36 archivos,
desktop y mobile — para subir UNA vez a la Media library y tener siempre algo que elegir
mientras se prueba, sin esperar el material definitivo. Cada una dice su medida bien
grande y la palabra PLACEHOLDER, para que se note si alguna se escapa.

Las medidas NO estan escritas a mano: salen de `src/data/components.js`, la misma fuente
que usa la matriz de contenido. Si ahi cambia una, se regeneran:

```bash
node tools/placeholders.mjs
```

`placeholders/INDICE.md` dice que archivo va en que componente. **Elegirlas desde el
manifiesto todavia no esta hecho**: hoy el runner saltea los campos de imagen, asi que
por ahora se seleccionan a mano en el CMS.

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
- **La interfaz es un servidor LOCAL**, no un sitio: escucha solo en `127.0.0.1`, nunca en
  la red. Cada arranque genera un token aleatorio que va en la URL y que toda llamada
  tiene que repetir; se rechaza cualquier pedido con un `Origin` de otro lado (para que
  una web abierta en otra pestaña no pueda darle ordenes) y cualquier `Host` que no sea
  `127.0.0.1` (rebinding de DNS). Esta cubierto por `npm test`.

Conviene preguntar tambien si en la organizacion esto cae bajo gobernanza de **RPA**
(automatizacion de interfaces), que suele ser un proceso distinto al de aprobar un
script comun.

## Estructura

```
Abrir page-runner.*    doble clic: instala si falta y abre la interfaz
src/cli.js             comandos (ui | login | inspect | build)
src/ui.js              servidor local de la interfaz (solo 127.0.0.1, con token)
src/ui/app.html        la interfaz
src/browser.js         abre Chrome/Edge del sistema con perfil propio
src/manifest.js        formato del manifiesto + validacion
src/mapping.js         formato del mapping + resolucion de selectores
src/inspect.js         volcado del formulario real
src/build.js           el motor: agrega paragraphs, abre desplegables, llena campos
src/log.js             registro local de corridas
mapping/               un archivo por sitio
manifests/             las paginas a armar
test/fake-drupal.mjs   Drupal de mentira con las formas del real
test/smoke.mjs         prueba del motor
test/ui.mjs            prueba del servidor de la interfaz, permisos incluidos
test/verify-mapping.mjs prueba del mapping contra un volcado del HTML
```

## Como direcciona los campos

Drupal le pega un **sufijo aleatorio a cada `id`** (`…-top-type--2CcdPKqYQCQ`), asi que
los selectores se apoyan siempre en `name=` o `data-drupal-selector=`. Cada paragraph se
direcciona por su **delta** — la primera posicion libre de la lista — y no contando
filas: mas exacto y no se confunde con los hijos.

Del delta salen las tres formas en que Drupal escribe la misma ruta, que el motor calcula
solo y los selectores del mapping pueden usar:

| variable  | ejemplo                                | donde aparece                     |
|-----------|----------------------------------------|-----------------------------------|
| `{base}`  | `field_ln_n_components[4][subform]`     | el `name` de los campos           |
| `{dsel}`  | `edit-field-ln-n-components-4`          | `data-drupal-selector` de la fila |
| `{dselw}` | `edit-field-ln-n-components-widget-4`   | los grupos plegables (field_group)|
| `{npath}` | `field_ln_n_components_4`               | los botones de agregar            |

### Contenedores: las pestañas

Un paragraph que acepta hijos declara `children.slots`: una ranura por lugar donde pueden
caer, con su propio `dsel`, `base` y boton de alta escritos con las variables del PADRE.
El hijo del manifiesto elige con `"slot": 0`.

Las pestañas son el caso mas anidado, y en el CMS son **dos paragraphs**, no uno:

```
comp_tabs                 el bloque de pestañas   (Tab type: Only Tabs | Full Background)
└─ comp_tabs_tab_item     UNA pestaña             (Title, Description, Background Image)
   └─ field_component     el contenido de esa pestaña — UN componente
```

O sea que un Tabs con tres pestañas son **siete** paragraphs: el Tabs, tres Tab y tres
componentes. En el manifiesto eso se escribe como un arbol de tres niveles, cada uno con
sus `children` (ver `manifests/ejemplo-tabs.json`).

Lo que hay que tener presente es la **cardinalidad**: `field_component` acepta **UNO**.
No es una decision nuestra, es como esta configurado el campo — con la pestaña ocupada
Drupal ni siquiera dibuja el boton de agregar. Por eso la ranura declara `"max": 1` y el
motor frena antes de tocar el navegador si el manifiesto le pone dos. El hub hace lo
mismo del otro lado: con la pestaña llena no ofrece el boton de agregar.

Las dos ranuras se agregan distinto, y el mapping lo dice. La lista de pestañas acepta un
solo bundle, asi que el boton "Añadir Tab" esta suelto. El contenido de una pestaña acepta
nueve tipos (`banner`, `banner_wrapper`, `block`, `html`, `ln_c_cardgrid`,
`c_externalvideo`, `c_image`, `c_sideimagetext`, `c_text` — **no** los layouts, ni otro
Tabs, ni un Accordion) y estan en un **dropbutton de Gin**: el primero a la vista y los
otros ocho plegados detras del toggle, que hay que abrir antes de poder clickearlos. No es
el modal de paragraphs_ee que usan las columnas de un layout: son tres formas distintas de
agregar y cada ranura declara la suya.

Dos cosas mas que el formulario real obliga y el mapping declara: los campos de cuerpo
arrancan en un **formato de texto que no admite HTML**, asi que el formato se cambia
ANTES de escribir; y el **alias de URL** esta deshabilitado mientras Pathauto lo genere
solo, asi que se destilda antes de poder escribirlo.

## Tests

```bash
npm test
```

Usa el **Chrome del sistema**, igual que una corrida de verdad (`RUNNER_CHROME=<binario>`
para apuntar a otro, en CI o si Chrome esta fuera del path habitual). Levanta un Drupal de
mentira que reproduce las formas del formulario real de Paragraphs
(los `name` con delta y subform, los `id` con sufijo aleatorio, el alta por AJAX, las tres
formas de agregar — desplegable+boton en el nodo, un boton por tipo detras de un modal en
las columnas de un layout, y el dropbutton de Gin con los tipos plegados en una pestaña —,
los contenedores con varios slots, los `<details>` plegados y CKEditor sobre un textarea)
y verifica que el motor sabe agregar, esperar, abrir desplegables, cambiar el formato de
texto, llenar texto / rich text / selects / checkboxes, anidar hijos en el slot que les
toca — incluido un contenedor adentro de otro, que es la forma del Tabs —, dejar la pagina
despublicada, escribir el alias, leer el node id y **frenar** ante un campo, un slot que no
existe o una ranura pasada de su tope.

Eso prueba el MOTOR. Para probar el MAPPING sin tocar el CMS esta el otro:

```bash
npm run verify -- mapping/purina-latam.json form.html
```

que resuelve cada selector del mapping y comprueba que ese `name` exista de verdad en un
volcado del formulario. El volcado se guarda a mano desde el navegador, sobre
`/node/add/<tipo>` **con un paragraph de cada clase ya agregado** (los subforms no existen
en el DOM hasta que se los agrega). Ese archivo **no se versiona**: lleva el token CSRF de
la sesion, rutas internas y nombres de usuario.

Lo que ninguno de los dos puede decir es si el CMS acepta la pagina: eso solo lo dice
`build` contra el sitio.

## Estado

El mapping de Purina LATAM (`mapping/purina-latam.json`) esta escrito a partir del HTML
real de `/node/add/dsu_component_page` en **preprod MX**. Son dos volcados: uno con 8
paragraphs sueltos (**275 selectores, 0 sin encontrar**) y otro con un Tabs de 3 pestañas
(**132 selectores, 0 sin encontrar**). `npm test` pasa.

Cubre 12 paragraphs: `c_text`, `c_image`, `c_sideimagetext`, `c_externalvideo`,
`ln_c_cardgrid` (+ `ln_c_grid_card_item`), `accordion_grid` (+ `accordion_item`),
`layout_columns_2`, `banner` y `comp_tabs` (+ `comp_tabs_tab_item`). Los demas del CMS
(los otros 11 layouts, `banner_wrapper`, `dsu_tint`…) **no estan**: hace falta un volcado
con uno de cada uno agregado para escribirlos, y hasta entonces un manifiesto que los pida
se frena solo.

Los 12 estan verificados contra el HTML real, el alta de una pestaña incluida: hizo falta
un volcado extra de una pestaña **vacia**, porque con la ranura llena Drupal esconde el
widget de alta y no habia nada que mirar.

**Falta la primera corrida contra el CMS.** Todo lo verificable sin conexion esta
verificado; lo que no se puede saber offline es si Drupal acepta la pagina que resulta.
La primera prueba conviene hacerla sin `--save`, mirando el formulario.

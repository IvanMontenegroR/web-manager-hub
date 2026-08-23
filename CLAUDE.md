# Web Manager Hub

Herramienta interna y personal de gestion de proyectos web para Nestle Purina LATAM.
Un unico usuario (el Websites Expert). Gestiona landings ejecutadas por 5 agencias
partner (BNN, F5, Hive, MSE, NBS) en 12 mercados.

Construidos: **Web Projects** (Gantt/cronograma), **Calendario** (lanzamientos por mercado),
**Referencias** (hub de info de consulta: SLAs + Marcas + Stakeholders; antes era el modulo **SLAs**),
**Tareas** (Kanban de coordinacion de la migracion; antes vivia dentro de Ecosystem 2.0) y **Ecosystem 2.0**
(hub de la migracion: documentacion — playbooks del backend v2.0 — y modulos futuros como creacion de
paginas). **Daily Ops** sigue como placeholder en el shell.

El modulo **Referencias** (`src/modules/Referencias.jsx`) tiene un nav de secciones (persistido en
`localStorage['wmh_ref_section']`):
- **SLAs**: la seccion original — pestanas General (edita `sla_definitions`, el autofill de tareas; antes
  vivia en Admin → SLAs) + una pestana por agencia (BNN, NBS) que renderiza `partner_slas` (BNN como lista
  por categoria; NBS pivoteado en matriz por volumen de paginas). El sub-tab activo sigue en
  `localStorage['wmh_sla_tab']`.
- **Marcas**: ficha por marca (`directory_brands`) — responsable(s), especie, guidelines, links, notas.
- **Stakeholders**: directorio de personas (`directory_stakeholders`) — quien se encarga de que (marcas o
  temas libres), rol, contacto. NO esta atado por FK a las marcas: el link es por nombre (loose coupling),
  para poder buscar contactos de cualquier cosa. Ambas secciones hacen su propio fetch tolerante (si la
  tabla no existe muestran el SETUP_SQL) y traen un boton de seed inicial. Ver `src/lib/directoryDb.js` y
  `src/components/directory/`.

## Stack (decisiones)

- **Vite + React 18** (SPA estatica). Sin router: la navegacion entre modulos es por
  estado (`src/App.jsx`), lo que simplifica el hosteo en un subpath de GitHub Pages.
- **Supabase JS** (`@supabase/supabase-js`) para lectura/escritura en vivo desde el
  cliente. RLS abierto en fase dummy; la proteccion se cierra mas adelante.
- **date-fns** para fechas; **lucide-react** para iconos; **xlsx** (SheetJS) para export.
- **CSS plano** con variables (`src/index.css`), sin framework de estilos. Herramienta
  densa: se prioriza legibilidad y densidad. Ancla de marca: rojo Purina `#ED1C24`.
  Los colores de partner salen de la tabla `partners` (no se hardcodean).
- **Deploy:** GitHub Pages via GitHub Actions, redeploy automatico en cada push a `main`.

## Base de datos (Supabase, proyecto Purina-Hub)

Ref `mgcxlsjmlkfhjbsihczu`. El esquema YA existe (no se recrea, solo se consume):

- `partners(id, name, color, country, created_at)` (incluye a **Purina** como partner, color rojo de
  marca `#ED1C24`; `country` = codigo de calendario de feriados, ej. MX/CO/PY/AR/BR/BR-SP.
  Purina esta dividida en dos partners, ambos con `country` NULL a proposito: **Purina Mercado** usa el
  `market` del proyecto, y **Purina Región** usa `project.region_country` (elegible por proyecto, con
  fallback al `market`). La distincion es por nombre: `isPurinaRegion` en `src/lib/countries.js` matchea
  "Región" en el nombre. Ver `sql/2026_purina_region_y_panama.sql` para el setup)
- `sla_definitions(id, action_name, sla_days, created_at)` (`sla_days` = dias HABILES; fases internas del
  cronograma que autocompletan `planned_days` al crear una tarea. Se editan en el modulo **SLAs**, pestaña
  General)
- `partner_slas(id, partner_id, category, activity, tier, value, sort_order, created_at)` (referencia de
  SLAs por agencia del modulo **SLAs**. `category` = grupo, `activity` = fila, `tier` = columna de volumen
  (NULL = valor unico/merge que ocupa toda la fila), `value` = dias o rango en TEXTO ("3", "8 - 12 days",
  "N/A"). BNN es lista simple (sin tier); NBS es matriz por volumen de paginas. FK ON DELETE CASCADE.
  RLS abierta. Solo BNN y NBS cargados hoy)
- `holidays(id, country, date, name, created_at)` (feriados **por pais/calendario**, unique(country,date).
  Codigos en `src/lib/countries.js`. Datos 2026 best-effort, editables desde el modal Feriados)
- `projects(id, name, brand, market, region_country, start_date, market_launch, status, archived, created_at)`
  (`market` = codigo de pais/mercado, se usa como calendario de feriados para las tareas de Purina Mercado.
  `region_country` = codigo de calendario opcional para las tareas de **Purina Región** en ese proyecto
  (si es NULL cae al `market`); se elige en el ProjectModal.
  `market_launch` = fecha objetivo de lanzamiento del mercado, opcional; deadline visual en el Gantt.
  `archived` = bool; los archivados se ocultan del cronograma activo y del analisis, y se muestran
  en un acordeon con su propio Gantt al final)
- `tasks(id, project_id, partner_id, action_name, planned_start, planned_days,
  planned_end GENERADA, actual_start, actual_end, status, delay_reason, excluded_holidays,
  depends_on, is_meeting, is_extra, sort_order, created_at)` (`excluded_holidays` = jsonb array de ISO: feriados que NO
  frenan esta tarea puntualmente, ej. hay backup approver de otro pais. `depends_on` = jsonb array de
  task ids predecesoras finish-to-start. `is_meeting` = bool: marca la tarea como reunion; muestra un
  icono (Users / 👥) en el Gantt y en el export a Excel.
  `is_extra` = bool: la tarea NO estaba en el plan original, se agrego porque aparecio trabajo no previsto
  (ej. una vuelta adicional de feedback). Muestra icono CirclePlus + chip `EXTRA` en el Gantt y prefijo `➕`
  + nombre en negrita en el Excel, con su entrada en Referencias. Su barra va en **AMBAR** (`EXTRA_COLOR`
  `#E0A526` en el Gantt, `EXTRA_BAR` `FFF2D08A` en el Excel) en vez del color por estado: son DOS colores
  con DOS significados que no se pisan — **ambar = esto no estaba en el plan** (corre el proyecto igual de
  quien sea la culpa), **rojo rayado = se paso de su SLA** (imputable al partner). Una tarea extra que
  ademas se pasa muestra las dos cosas. En la hoja "Timeline unificado" las barras van por AGENCIA, no por
  estado, asi que ahi el ambar no aplica y las extra se distinguen solo por el `➕`.
  Ver "Vueltas extra de feedback" abajo)
- `ecosystem_tasks(id, market, section, topic, owner, status, priority, notes, deadline,
  checklist jsonb, tags jsonb, sort_order, created_at)` (tabla del **Kanban de coordinacion** de la
  migracion, que hoy vive en el modulo **Tareas** (antes en Ecosystem 2.0); independiente de projects/tasks.
  El tablero se divide en **dos ejes**: `market` (filtro principal, pestañas — `ECO_MARKETS` =
  MX|BR|CAM|**General**, donde General = tarea transversal; se persiste en `localStorage['wmh_eco_market']`)
  y `section`, que por historia guarda el **topic** (lista CERRADA `ECO_TOPICS` = Web|CIAM|Buy Now|CRM|Proceso;
  filtra DENTRO del mercado activo, y sus contadores tambien). La tarjeta muestra el badge de mercado solo
  cuando se ven todos los mercados juntos.
  Una tarjeta es **TEMA + NOTA** y nada mas: los viejos `issue` (Problema / situacion) y `action` (Accion
  a tomar) se sacaron del tablero y su contenido se migro a `notes` (ver `sql/2026_ecosystem_tasks_solo_nota.sql`);
  las columnas siguen en la DB como respaldo pero la app ya no las escribe.
  `status` = Open|In Progress|On Hold|Done.
  `priority` = alta|media|baja. `tags` = jsonb array de strings libres (sugerido `Helo`, ver `DEFAULT_TAGS`);
  se muestran como chips en la tarjeta y hay una barra de filtro por tag. Desde esa barra, el boton
  "Resumen <tag>" (`buildTagSummary`) arma el status del 1:1 de las tarjetas de ese tag (lista plana, sin
  agrupar por estado; cada una = tema en NEGRITA y debajo la nota, una linea por renglon). Devuelve
  `{ html, text }`: el modal muestra el HTML renderizado (lo que se va a pegar) y "Copiar con formato"
  escribe `text/html` + `text/plain` al portapapeles con `ClipboardItem`, asi Outlook pega negritas y
  listas de verdad (`copyRich`; si el navegador no soporta ClipboardItem cae al texto plano). El boton de
  email sigue siendo `mailto:`, que solo admite texto plano. El texto de las tarjetas va ESCAPADO (`esc`)
  porque el HTML se inyecta con `dangerouslySetInnerHTML`.
  Al pie agrega un bloque "STATUS DE PROYECTOS" con una linea por proyecto deduplicado
  por `brand` (los archivados se excluyen; ej. los 5 Fancy Feast quedan en una sola linea "Fancy Feast"),
  con el status en blanco para completar a mano; usa `projects` de `DataContext`. `checklist` = jsonb array de
  {text, done, deadline?} (cada sub-item puede tener su
  propia deadline). El **deadline efectivo** (`effectiveDeadline`) = la fecha mas temprana entre el
  `deadline` propio y las deadlines de los items del checklist NO hechos; manda para el color y el orden.
  La tarjeta muestra un chip con la deadline propia y otro (icono ListChecks) con la del checklist mas
  cercana. Orden dentro de cada columna (`ecoOrder`): PREDOMINA el deadline EFECTIVO (con fecha van arriba,
  por fecha asc), luego la prioridad (alta>media>baja), y `sort_order` como desempate.
  **Deadline por defecto**: una tarjeta nueva arranca con 1 semana (`DEFAULT_DEADLINE_DAYS`, editable en el
  modal). **Follow-up** (`isFollowUp`) es un tag **VIRTUAL** (no se guarda): a la MITAD del camino entre
  `created_at` y el deadline efectivo, la tarjeta se pinta amarilla (`.eco-card.soon`) y suma el chip
  `Follow-up`, que tambien filtra desde la barra de tags (`ecoTags` = tags guardados + virtuales).
  RLS abierta igual que el resto. Se crea con el SQL de `src/lib/ecosystemDb.js`
  -> `SETUP_SQL`; si falta, el modulo muestra ese SQL en pantalla. NO se carga en `fetchAll`: el modulo hace
  su propio fetch y tolera que la tabla no exista, para no romper el resto de la app)
- `directory_brands(id, name, owners jsonb, species, color, guidelines, links jsonb, notes, sort_order,
  created_at)` y `directory_stakeholders(id, name, role, areas jsonb, email, phone, notes, sort_order,
  created_at)` (tablas del hub **Referencias**, secciones Marcas y Stakeholders. `owners`/`areas` = arrays
  de nombres en TEXTO — el link marca↔persona es por nombre, NO por FK, a proposito (loose coupling, para
  buscar contactos de cualquier cosa). `links` = jsonb `[{label,url}]`. RLS abierta. Igual que
  `ecosystem_tasks`: NO van en `fetchAll`; cada vista hace su propio fetch tolerante y muestra el
  `SETUP_SQL` de `src/lib/directoryDb.js` si la tabla falta, con boton de seed inicial)

CRITICO: `planned_end` es una **columna generada** en Postgres (`planned_start + planned_days - 1`,
dias CALENDARIO) que **se ignora en la app**: la UI recalcula `planned_end` en **dias habiles**
en `src/lib/dates.js` (`plannedEnd`). Nunca se escribe. En inserts/updates solo se mandan
`planned_start` y `planned_days`. No se puede hacer la columna generada consciente de feriados
(estan en otra tabla), por eso el calculo real vive en el front.

DIAS HABILES: todo lo que sea "dias" (planned_days, retraso, solapamiento) cuenta solo dias
habiles = sin sabados/domingos ni feriados. Ver `src/lib/dates.js` (`isBusinessDay`,
`addBusinessDays`, `businessDaysBetween`). El calendario de feriados de cada tarea se resuelve en
`DataContext`: `country` = `partner.country` o, si es NULL (Purina), `project.market`; feriados
efectivos = los de ese pais MENOS los `excluded_holidays` de la tarea. El set efectivo se adjunta a
cada task enriquecida como `holidaysSet`. En el Gantt, findes y feriados se pintan POR ENCIMA de las
barras (`.day-over`) para que se vea que no son laborales. Al hover, el feriado muestra un tooltip
con su nombre + calendario (`countryName`, ej. "Navidad — México" / "... — Brasil – São Paulo") + fecha;
el nombre sale de un lookup `country|date` sobre la tabla `holidays` (`.day-over.holiday` con
`pointer-events: auto`).

FKs: `tasks.project_id` ON DELETE CASCADE; `tasks.partner_id` ON DELETE SET NULL.

## Logica clave

- **Solapamientos** (`src/lib/analysis.js` -> `detectOverlaps`): comparacion por pares de
  todas las tasks. Conflicto = mismo `partner_id`, `project_id` distinto, y la interseccion de
  sus rangos **REALES/proyectados** (`renderStart..renderEnd`) contiene al menos un dia **habil**
  (findes/feriados del partner no cuentan). Las tareas **GO-LIVE** son hitos de 1 dia y **NO
  cuentan** para solapamiento (se excluyen del detector). El Excel muestra la lista completa de
  solapamientos al pie de la hoja "Resumen (semanas)".
- **Retrasos** (`detectDelays`): una tarea esta atrasada si cerro tarde (`actual_end > planned_end`)
  O sigue abierta y ya paso su fin planeado (se mide contra HOY). Ambos casos son "atraso" y se
  tratan/pintan IGUAL (mismo rojo). El fin de referencia es `delayEnd` (= `actual_end` o HOY). El
  delta en **dias habiles** se dibuja como extension rayada (de `planned_end` a `delayEnd`).
- La razon de retraso es **obligatoria** en el form cuando `actual_end > planned_end`
  (`src/components/modals/TaskModal.jsx`).
- **Adelantos** (espejo del atraso, `withDerived`): una tarea que cerro ANTES de su fin plan
  (`actual_end < planned_end`) marca los dias ahorrados en **verde** (`.bar-ahead`, "-Nd" en dias
  habiles, de `actual_end` a `planned_end`) — mismo tratamiento que el rojo pero al reves. Solo cuenta
  con entrega REAL (`actual_end`), nunca por proyeccion. En el Excel: relleno verde en esas celdas +
  `Nd (-Nd)` verde en la columna DÍAS + entrada "Adelanto" en Referencias.
- **Vueltas extra de feedback** (`is_extra`): cuando aparece una ronda que NO estaba en el plan (ej. la
  region pide una revision adicional despues de haber cerrado su feedback), NUNCA se reabre la tarea ya
  completada ni se estira su ventana: se agrega un **par nuevo** de tareas marcadas `is_extra`, y la
  siguiente del plan pasa a depender de la ultima del par (asi la proyeccion empuja el resto y el fantasma
  muestra cuanto se corrio el proyecto). La convencion de a QUIEN se le imputa el atraso:
  - La tarea de **quien pidio la vuelta** (ej. "Feedback Adicional Purina Región") nace con
    `planned_days = 1`, arrancando el dia habil siguiente al cierre de la ronda anterior. Como el plan es
    de 1 dia, TODO lo que consuma por encima cae como atraso rojo imputado a ese partner: es tiempo de
    calendario que no deberia haberse gastado.
  - La tarea de **quien ejecuta el ajuste** (ej. "Ajustes Adicionales BNN") nace con
    `planned_days = el SLA del partner para una ronda de ajustes` (no con lo que efectivamente tardo).
    Si entra en SLA no se pinta rojo — el ajuste es consecuencia forzosa del feedback, no culpa suya —
    pero si se pasa del SLA, ese exceso SI es suyo y se ve. La agencia se mide por lo que controla.
- **Proyeccion / forecast** (`src/lib/projection.js` -> `computeProjection`): NO destructiva. El
  baseline (`planned_start`/`planned_days`) no se toca. `computeProjection` indexa TODAS las tareas,
  asi que resuelve dependencias **entre proyectos** (rollouts regionales). Por dependencias
  (`depends_on`) se calcula `projStart`: si la predecesora que manda termina DESPUES del baseline, se
  **empuja** (`pushed`); si YA cerro de verdad ANTES (predecesora firme = con `actual_end`), se
  **adelanta** (`pulled`) por debajo del baseline. Sin entrega real no se adelanta (se mantiene el
  worst-case). Fin efectivo = `actual_end` si termino, si no `max(plannedEnd(projStart), hoy)` (una
  tarea abierta y vencida empuja desde hoy). En el Gantt la **barra solida es la realidad/proyeccion**
  (`renderStart..renderEnd`, color por estado; el tramo pasado del plan va rayado rojo si hay atraso)
  y el **plan original** se dibuja como **fantasma** hueco (`.bar-ghost`) solo cuando la realidad se
  corrio. El tooltip muestra Plan, Real y la predecesora culpable (`pushedByName`). Las tareas tipo
  SEO no son predecesoras de otras (no bloquean).
- **Vistas del cronograma** (WebProjects): toggles en la topbar, todos preferencias locales.
  `zoom` (`day`/`week`) se pasa al `Gantt`; en semana el ancho de columna baja de 34px a 11px
  (`--day-w`) y el header solo etiqueta los lunes (`d/m`); persiste en `localStorage['wmh_zoom']`.
  `showGhosts` prende/apaga el fantasma del plan original (`.bar-ghost` + `.bar-link`); **apagado
  por defecto**, persiste en `localStorage['wmh_ghosts']`. `hidden` es un Set de `project.id`
  ocultados manualmente del cronograma activo, persistido en `localStorage['wmh_hidden_projects']`;
  se restauran desde una barra de chips. Ocultar != archivar (archivar es persistente en DB y va al
  acordeon; ocultar es solo una preferencia de vista local). Los botones de admin (Partners, SLAs,
  Feriados) viven en un menu desplegable **Admin** (`.dropdown`) en vez de sueltos en la topbar.
  Tambien se recuerdan `hidePast` (`wmh_hidepast`) y el acordeon de archivados (`wmh_archived_open`).
  Otras preferencias persistidas: la vista del Calendario (`wmh_cal_view`, default mes; el cursor
  arranca en hoy) y los filtros del Kanban de **Tareas**: mercado (`wmh_eco_market`), topic (`wmh_eco_filter`,
  key heredada de cuando vivia en Ecosystem) y tag (`wmh_eco_tag`); los tres caen a "Todos" si el valor
  guardado ya no existe. Los popovers transitorios
  (dropdown Admin, barra de ocultos) NO se recuerdan.
- **Ecosystem 2.0 = hub** (`src/modules/Ecosystem.jsx`): ya no es el Kanban (se mudo a **Tareas**). Es un
  landing con dos secciones — Documentacion (playbooks del backend v2.0, ver `src/data/playbooks.js`) y
  Modulos. Los playbooks se renderizan con `DocViewer` (`src/components/docs/`): TOC por H1, figuras con
  lightbox, tablas y filas termino/definicion. El contenido sale de los `.docx` originales parseados a
  bloques JSON en `src/data/`; las imagenes viven en `public/docs/` y se referencian con
  `import.meta.env.BASE_URL`.
- **Creacion de paginas** (`src/components/pages/`, se abre desde la seccion Modulos de Ecosystem 2.0):
  modulo para armar las paginas de la migracion. Dos capas:
  1. **Tracker** (`PagesTracker`) — lista de paginas (`pages`) con estado (Not started|Filling Matrix|
     In progress|On hold|Complete (outliers)|Done, ver `PAGE_STATUS_LABEL`: el valor guardado es el del
     proceso en ingles y la UI muestra la etiqueta en castellano. "Complete (outliers)" es el ANTEULTIMO
     paso: esta todo salvo lo que quedo colgado por algo de afuera; cuando eso se destraba pasa a Done) y orden por prioridad (reordenable,
     persiste `sort_order`). Cada pagina lleva ademas cuatro enlaces de referencia opcionales —
     `url_old` (sitio viejo), `url_new` (sitio nuevo), `url_copydeck` y `url_figma` — que se editan en el
     PageModal; todos menos el copydeck bajan precargados a la matriz de contenido exportada. Son
     columnas OPCIONALES:
     `withOptionalCols` las saca del payload si la tabla todavia no las tiene (ver
     `sql/2026_pages_urls_y_status.sql`). El boton
     "Armar" abre el builder de esa pagina. Se separa por **mercado** (pestañas, `PAGE_MARKETS`) y dentro
     de cada mercado se agrupa por **categoria** (`pages.category`, lista ABIERTA — `PAGE_CATEGORIES` son
     solo sugerencias; sin categoria = pagina suelta arriba de todo, ej. la Home). La **subcategoria**
     existe solo dentro de la categoria `Marca` (`BRAND_CATEGORY`) y ES la columna `brand`
     (`pageSubcategory`), la misma que define el tema visual: una sola fuente de verdad, para que no haya
     dos campos diciendo lo mismo. El reordenar es DENTRO del grupo. Categorias y subcategorias se pliegan
     con un click en su cabecera; se persiste lo COLAPSADO (`localStorage['wmh_pages_collapsed']`, key
     `mercado|categoria[|subcategoria]`) para que un grupo nuevo aparezca siempre abierto.
  2. **Builder** (`PageBuilder`) — 3 paneles: paleta de componentes | canvas con el preview EN VIVO de la
     pagina armandose | editor de contenido del componente seleccionado. Cada componente sale del catalogo
     `src/data/components.js` (define sus CAMPOS de Drupal: text|textarea|url|select|image|list). Los
     mockups se renderizan en `ComponentPreview` (`preview/`); agregar un componente = una entrada en el
     catalogo + un render ahi. Los componentes colocados viven en `page_components` (page_id, component_key,
     content jsonb, sort_order).
     **VARIANTES**: un componente puede tener un campo `type` (select) que cambia su layout y que campos
     pide — lo usan el Banner (Banner Type) y el **Carrusel de cards** (`CMT_VARIANTS`: verticales / con
     icono / apaisadas con texto abajo / apaisadas con titulo arriba / **numeradas** — card blanca sin
     imagen con el numero en un chip, que NO es un campo: sale del orden de las cards). Los campos se
     filtran con `onlyTypes`/`hideTypes` (`visibleFields` para los de primer nivel, `visibleSubFields` para
     los subcampos de una lista, que ademas filtra por `roles`), y las medidas de imagen con
     `specKey`/`specsByType` + `defaultType` (la variante que vale cuando `type` no esta cargado; sin el,
     un componente recien agregado se quedaria sin medidas). La variante por DEFECTO tiene que ser la que
     ya existia, asi las paginas armadas antes no cambian. El "Alt Text" del Excel se pide por VARIANTE
     (`componentHasImage(def, content)`): las que no llevan imagen no lo muestran.
     El **Background Color** del CMS es una lista de TOKENS (`BG_COLORS`, compartida por el Banner y el
     bloque de Texto), no un hex. Para poder pintarlo en el mockup hay un mapa `BG_TOKENS` token -> hex
     con SOLO los que conocemos con certeza (Primary Red, Primary White); el resto queda sin pintar a
     proposito — inventar el color de un design system seria peor que no mostrarlo. Cuando desarrollo pase
     la paleta, se agrega la entrada y el mockup la toma sola.
     El Carrusel de cards ademas configura por pagina el **fondo del bloque** y el **color del header**
     (titulo, subtitulo y flechas — NO el texto de las cards, `--txt` + la clase `cp-cmt--hastxt`). El
     fondo son dos keys que nunca conviven: `color` en la variante con iconos (la banda, que hereda de la
     marca) y `background_color` en las demas, donde por defecto NO hay fondo. Un campo de color
     `clearable` significa "vacio = sin color": el form lo muestra como "Sin color" con un boton para
     quitarlo, en vez de un rojo que parece cargado.
     **FULL BLEED**: un bloque con FONDO PINTADO es una **seccion**, no una card: la banda de color cubre
     todo el ancho y solo el contenido queda dentro del container, sin borde redondeado, y si es el ULTIMO
     bloque de la pagina va PEGADO al footer (una franja que corta antes del pie deja un blanco que en el
     sitio no existe). El criterio es el FONDO, no el componente ni la posicion: un bloque sin fondo no
     tiene nada que se vea cortarse y no se toca. Lo marca el preview con la clase `.cp-bleed` cuando
     efectivamente pinta un color — hoy el bloque de Texto con Background Color y el Card Grid en las
     variantes de carrusel (con fondo cargado, o con la banda de la variante con iconos, que siempre tiene
     color). Un token que todavia no esta en `BG_TOKENS` no lleva la clase: la regla sigue lo que SE VE.
     El breakout va en el `.pb-block` (tiene `overflow:hidden`, adentro se recortaria) y apunta al render
     PROPIO del bloque (`> .cp-render > .cp-bleed`), asi un texto con fondo metido en una columna de un
     layout no hace sangrar al contenedor. `--bleed-x` es el padding lateral propio de cada bloque, para
     compensarlo con el gutter y que el contenido no se corra respecto de los bloques sin fondo.
     **CONTENEDORES y SLOTS**: un componente marcado `container: true` no tiene contenido visual propio
     mas alla de su cabecera: su contenido son OTROS componentes. La pagina es un ARBOL de un nivel —
     `page_components.parent_id` (FK a si misma, ON DELETE CASCADE) y `tab_index`. Los sueltos tienen
     `parent_id` NULL. El `sort_order` es por GRUPO: los hijos de un slot se ordenan entre ellos, aparte
     de los bloques sueltos.
     Cada contenedor declara sus **SLOTS** (`slotsOf`), que son las ranuras donde caen los hijos, y hay
     dos clases: **fijos**, declarados en el componente (`slots`) — las columnas de un layout — y
     **variables**, que salen del contenido — una pestaña por cada `tabs` cargada (`tabList` /
     `TAB_SAMPLE`). El hijo apunta al suyo con `tab_index`, que se sigue llamando asi por historia (nacio
     con las pestañas) pero es el **indice de slot** y vale para cualquier contenedor. Si se borra una
     pestaña, sus hijos NO se pierden: caen en el ULTIMO slot (mismo criterio en el builder y en el Excel).
     La UNICA diferencia entre las dos clases es como se ven: en las **pestañas** se ve un slot por vez
     (los demas se montan fuera de pantalla, `.pb-tabpanel--off`, para que el export capture tambien lo
     que esta en las pestañas cerradas); en las **columnas** se ven todos a la vez. En el builder el
     contenido de cada slot se le pasa al preview por `slots` (un nodo por slot, en orden) y se agrega con
     el boton que aparece adentro. El arbol es de UN nivel: la paleta de ese boton excluye los
     contenedores, asi que no se anidan (en el CMS si se puede, es una limitacion nuestra).
     Contenedores de hoy: `tabs` (= `comp_tabs` + `comp_tabs_tab_item`), `banner_wrapper` y los
     **12 `layout_columns_*`**
     (`LAYOUT_COLUMNS`: 100 / 50 / 33 / 25 / 20 y las asimetricas 25_25_50, 25_50_25, 25_75, 33_66,
     50_25_25, 66_33, 75_25). Cada layout declara los `widths` de sus columnas en porcentaje y el mockup
     los dibuja como `fr` proporcionales. Ver `sql/2026_page_components_tabs.sql`.
     El **`banner_wrapper`** ("Carrusel de banners") es el paragraph `Banner Wrapper` del CMS: NO es un
     banner, es el envoltorio que agrupa varios `banner` hijos y los rota. Tiene **un solo slot fijo** —
     en el CMS los banners son un campo multivaluado del wrapper, no ranuras distintas — y el
     `sort_order` de los hijos ES el orden de los slides. En el mockup los slides van APILADOS (no de a
     uno) con una banda arriba que lo aclara: asi se pueden ver y editar todos, y la captura del Excel
     los muestra a los dos. No tiene campos propios: falta el subform de Drupal, asi que solo declara
     Avanzado (lo unico que Drupal agrega a TODOS los paragraphs por igual) y no se le inventa Classy.
     Reemplaza al viejo campo `slides` del Banner, que nunca existio en el CMS
     (ver `sql/2026_banner_wrapper.sql`); el Banner vuelve a ser UNO solo, con su Media en todos los
     tipos, el Promotional incluido.
     **CARD GRID** (`card_grid`) = el paragraph `ln_c_cardgrid` del CMS. UN solo componente del que salen
     el mosaico y todas las variantes de cards: lo que cambia el layout es el **Modo de vista**
     (`CARD_GRID_MODES`, 11 valores), no el componente. Reemplaza a `mosaic` y `commitment_carousel`, que
     quedan `deprecated` (siguen renderizando lo ya armado pero salen de la paleta). Trae la estructura
     completa del CMS: titulo/subtitulo con HTML tag, background image, subitems (titulo+tag, icono,
     descripcion, subtitulo+tag, imagen desktop y mobile **cada una con su alt**, CTA con texto/URL/destino,
     background color, section ID y CSS por card), el bloque **Avanzado** (See more, visibilidad Gato/Perro,
     section ID, CSS) y los 13 selects de **Classy**. Ver `sql/2026_card_grid_migracion.sql`.
     La **PALETA** (`PALETTE`) es una lista aparte de `COMPONENTS`: sus items pueden ser un componente o un
     ATAJO con contenido inicial. Los modos de vista entran como atajos ("Mosaico", "Cards verticales"...)
     para elegir por como se ve, pero lo que se guarda es siempre `card_grid` + `view_mode`.
     Un `option` de un select puede ser un string o `{ value, label }`: se guarda el valor de maquina del
     CMS (`grid-cards`) y se muestra/exporta la etiqueta que ve el editor en Drupal. `emptyLabelFor` dice
     que muestra Drupal cuando el select esta vacio (`Default` en Classy, `- Ninguno -` en los HTML tag).
     `BG_COLORS` son los 39 tokens reales y `CMS_ICONS` los ~130 iconos, los dos sacados del formulario.
  3. **Export a Excel** (`src/lib/exportPage.js`, usa `html2canvas`): **DOS hojas espejadas**. La hoja
     **Contenido** es para el mercado (solo lo que carga: los `cms:true` no aparecen) y la hoja **CMS** es
     la guia del content editor: mismo orden que el formulario de Drupal, con las etiquetas EXACTAS
     (`cmsLabel`) y TODOS los campos, incluidos los tecnicos. El contenido NO se duplica: cada celda de la
     hoja CMS es una **formula** `IF('Contenido'!Cn="","",'Contenido'!Cn)`, asi lo que carga el mercado
     aparece del otro lado sin copiar nada. `cellRef` registra en que fila quedo cada campo mientras se
     arma la hoja Contenido. Esas celdas van en gris y la hoja CMS se **protege** (sin contraseña) para que
     nadie pise una formula. Los nombres de las hojas son FIJOS porque las formulas los referencian.
     Arriba de todo, debajo del logo Purina, va el bloque **Referencias**: link del Figma, contraseña del
     Figma, web vieja y web nueva. Los tres links se precargan desde `pages.url_figma` / `url_old` /
     `url_new` (si no hay valor queda la pista gris "Pegá acá el link"); la **contraseña** del Figma se
     completa siempre en el Excel — cambia por vuelta de diseño, no vale la pena guardarla. La galeria
     "Todos los componentes" no lo lleva (es un catalogo, no una pagina: misma señal que `metas:false`).
     La **tira de banners** (con 2+ banners, el primero inline y los demas en bloques a la derecha) es
     SOLO de la galeria (`bannerStrip: true`): ahi los banners son las variantes del Banner Type. En una
     pagina de verdad dos banners son dos bloques — tipicamente los slides de un `banner_wrapper` — y
     cada uno va en su lugar del arbol.
     La hoja Contenido tiene, por pagina, una seccion por componente
     con una imagen del componente RENDERIZADO CON SU CONTENIDO (captura del preview) + tabla campo→contenido,
     numeradas `1`, `2`, `3`… Un bloque de pestañas suma **una banda oscura por pestaña** (`3.1 — Pestaña:
     Gato`) y debajo las secciones de sus componentes (`3.1.1`, `3.1.2`…); la imagen del contenedor muestra
     la pestaña abierta, y la de la pagina entera solo apila los bloques SUELTOS (los hijos ya van adentro
     de la captura de su contenedor). Durante la captura, el body lleva la clase `pb-exporting` para que
     los bloques anidados se capturen SIN el chrome del builder (barra de edicion y boton de agregar).
     Todo esto para que los editores carguen en el CMS. Los mockups usan alto FIJO (no aspect-ratio) y la captura fija
     el ancho en px, porque html2canvas resuelve mal aspect-ratio y los width:% sin ancho explicito.
     A la DERECHA de todo (ultima columna) va **la pagina entera** en UNA sola imagen, sin division por
     campos: `stackImages` apila header + cada componente + footer (mismas capturas, memoizadas en `shots`)
     para ver de un vistazo como quedaria armada. La galeria de componentes la apaga (`fullPage: false`).
     Un campo con `noneOption` (ej. "Aplica a" -> "Sin iconos" en el carrusel de marcas) NO baja al Excel
     cuando esta en esa opcion: no hay nada que cargar (`excelSkip`). Un componente sin NINGUN campo de
     mercado (los contenedores de columnas: todo lo suyo es tecnico) no dibuja la tabla, solo una linea
     que aclara que el contenido va en los componentes de adentro.
  **AVANZADO y CLASSY**: no son campos de un componente, son dos bloques que Drupal le agrega a CADA
  paragraph. Se declaran una sola vez — `advanced()` (visibilidad por especie, See more, Section ID,
  Custom CSS) y `classy(...keys)` (los selects de estilo, sacados de `CLASSY_FIELDS`) — y cada componente
  los engancha pidiendo los que le aplican, EN EL ORDEN en que los muestra el formulario de Drupal, que es
  el orden de la hoja CMS. Antes estaban copiados a mano adentro de `card_grid` y cada componente nuevo
  tenia que repetir veinte campos. Los dos caen en grupos plegables del form (`G_ADV` / `G_CLASSY`).
  **RICH TEXT**: todo campo de CUERPO es rich text en el CMS. El formato se ESCRIBE con una notacion tipo
  markdown DENTRO del mismo texto — `**negrita**`, `_cursiva_`, `[texto](link)`, `- ` / `1. ` para listas,
  un salto de linea = `<br>` y una linea en blanco = parrafo nuevo — asi el dato viaja entero en un solo
  campo y el mercado lo edita sin herramientas raras. El editor no obliga a escribirla: la barra del
  textarea tiene botones que la insertan sobre lo seleccionado, con los ATAJOS de siempre (los mismos que
  Word y Docs: Ctrl/⌘ + B negrita, I cursiva, K enlace, ⇧8 viñetas, ⇧7 numerada). Todo es toggle: el
  mismo boton (o el mismo atajo) pone y saca. Ver `src/lib/richText.js` (`parseInline` para lo inline, `parseRich` para los
  bloques) y, en el preview, `<Rich>` (bloques, va donde antes habia un `<p>` porque un `<ul>` adentro de
  un `<p>` es HTML invalido) contra `<RT>` (solo inline, para los textos de una linea como subtitulos o
  citas). Que campo lleva cual sale del TIPO: `textarea` = cuerpo = bloques; `text` = una linea = inline.
  Las marcas NO se ven en ningun lado: son la forma de ESCRIBIR el formato, no de leerlo. En el Excel se
  convierten a formato de VERDAD — una celda xlsx acepta `{ richText: [{ text, font }] }`, asi que la
  negrita es negrita, las listas salen con viñeta o numero y los saltos se ven (`toExcelRich`, con
  `wrapText`). En un `richText` ExcelJS IGNORA la fuente de la celda, por eso cada pedazo se lleva puesta
  la fuente base. Un texto sin ninguna marca vuelve como string pelado: una celda comun se edita mejor.
  El enlace se PINTA como enlace (azul y subrayado) adentro del parrafo, pero no es clickeable ahi: en
  xlsx el hipervinculo es por CELDA, no por pedazo de texto, asi que el link de verdad baja ademas a su
  propia fila. La hoja CMS no repite el formato: sus celdas son formulas a la hoja
  Contenido, y una formula devuelve texto.
  El **bloque de Texto** es `c_text`: el cuerpo es el unico campo propio, titulo y subtitulo son
  opcionales (cada uno con su HTML tag) y el **CTA es REPETIBLE** (`ctas`, porque `field_c_link` es
  multivaluado) con destino, rel y ARIA label.
  El **Banner** guarda los valores de MAQUINA del CMS, que no siempre se parecen a la etiqueta:
  "Secondary Hero" es `title-description` y "Banner Card" es `banner-menu` (ver `BANNER_TYPES`). Su Link
  tambien es multivaluado (`ctas`) y su Classy son solo dos selects: Background Color y Banner Align
  Content. Suma el checkbox "Remover Overlay Background" y el grupo **Search AI** (mostrar el buscador,
  fijarlo en mobile, y las sugerencias). El Media va en TODOS los tipos, el Promotional incluido: ahi la
  imagen es lo unico que hay. Para varios banners rotando esta el `banner_wrapper`.
  El **`c_image`** ("Imagen") es una imagen con texto encima: el Media lleva desktop y mobile, cada uno
  con su **alt obligatorio**, y eso es lo unico que el mercado entrega (el editor ya sabe subirlo). Suma
  Title Size / SubTitle Size y un Classy propio con Image position e Image Style. Todo lo visual sale de Classy — `content_text_styles`
  (una o dos columnas), `text_align`, `background_color`/`text_color` (tokens) y `style_button` con las
  CUATRO opciones reales (vacio = Default el rojo, mas Outline / Secondary / Text).
  El **Acordeon** (`accordion_grid`) es el paragraph del CMS. Sus items son `accordion_item`, que en
  Drupal son paragraphs hijos, pero como lo unico que llevan es titulo + cuerpo van como campo repetible:
  son los mismos datos con mucha menos maquinaria. El `accordion_item` no tiene panel Classy en el CMS.
  El viejo **`fifty_fifty`** queda `deprecated`: en el CMS nunca fue un componente, son un
  `layout_columns_2` con un `c_text` en la primera columna y un `accordion_grid` en la segunda. Los tres
  bloques ya armados se migraron con `sql/2026_estructura_cms.sql` (que ademas migra el bloque de Texto a
  las keys nuevas).
  Fetch tolerante + SETUP_SQL en `src/lib/pagesDb.js`. Al pie de `src/data/components.js` esta el
  inventario de lo que FALTA para espejar el CMS: `CMS_PENDING_PARAGRAPHS` (los paragraphs que no tenemos)
  y `CMS_PENDING_SUBFORMS` (los componentes nuestros a los que les falta el subform real de Drupal para
  cerrarlos — hasta tenerlo, sus campos son una aproximacion y no se les declara Classy sin inventar).
  Los componentes se renderizan dentro de un container (`.pb-page`, gutter lateral que replica el
  `.container` real). La paleta va agrupada por familia (`paletteGroups`): con los 12 layouts adentro,
  una lista plana de 30 items no se lee.
  El builder tiene toggle Editar/Vista previa: en preview oculta paleta/editor/toolbars y muestra la
  pagina a sangre con el gutter real (sin los espacios de edicion).
  El **Header** (`preview/SiteHeader.jsx`) y el **Footer** (`preview/SiteFooter.jsx`) del sitio son
  GLOBALES (mismos en todas las paginas): se renderizan fijos arriba/abajo del canvas y se incluyen como
  secciones arriba/abajo del export (imagen), NO son componentes editables por pagina. Para capturarlos
  bien se fuerza el ancho a desktop (1180px) en `snapshot(node, forceWidth)`.
- **Control del dia** (`src/lib/analysis.js` -> `buildDailyControl`, panel `ControlPanel`): reemplaza al
  viejo panel de solapamientos (la deteccion de conflictos sigue viva para pintar el Gantt en rojo).
  Clasifica las tareas activas relativo a HOY en dias habiles usando SOLO fechas reales/comprometidas:
  el fin **planeado** (`planned_end`) para las abiertas y `actual_end` para las cerradas. NO usa el
  forecast: una tarea que vencio pero se corrio para adelante por delays de una predecesora (nunca
  arranco) NO aparece. Buckets: `overdueOpen` (arrancaron, vencieron su plan y siguen abiertas =
  `t.isDelayed`, atraso propio real, bloque urgente), `dueToday` (fin planeado = hoy), `upcoming` (fin
  planeado en 1..3 dias habiles) y `recentlyDone` (cerradas en los ultimos 0..3 dias habiles, con badge
  a tiempo/tarde). Ventanas de 3 dias habiles; cada tarea usa su propio `holidaysSet`.

## Estructura

```
src/
  lib/         supabase, db (CRUD), ecosystemDb (Kanban CRUD + seed + SETUP_SQL),
               directoryDb (Marcas + Stakeholders CRUD + seed + SETUP_SQL),
               pagesDb (paginas + page_components CRUD + SETUP_SQL), dates,
               analysis (overlaps/delays/control), colors, exportTimeline + exportPage (Excel),
               countries, flags
  data/        playbooks (metadata) + intro/component-playbook.json (bloques de los .docx),
               components (catalogo de componentes del builder: campos por componente)
  context/     DataContext (carga todo + refresh, expone derivados memoizados)
  components/
    gantt/     Gantt.jsx (header por dia/semana, findes, hoy, barras, tooltip)
    panels/    ControlPanel (foco del dia), DelayPanel, LaunchWidget
    modals/    ProjectModal, TaskModal, PartnersModal, HolidaysModal, EcoTaskModal, SlaItemModal
    docs/      DocViewer (render de playbooks: TOC, figuras, tablas, lightbox)
    directory/ BrandsView, StakeholdersView, BrandModal, StakeholderModal, SetupNotice
    pages/     PagesTracker (lista), PageModal, PageBuilder (paleta+canvas+editor),
               ContentForm, preview/ComponentPreview (mockups por componente)
    ui/        Modal
  modules/     WebProjects (orquesta todo), Calendar, Tareas (Kanban), Ecosystem (hub docs +
               modulos futuros), Referencias (SLAs + Marcas + Stakeholders), Placeholder
```

## Variables de entorno

Publicas por diseno (la publishable key es de cliente; la proteccion real es RLS).
Nunca se hardcodean; el `.env` local esta en `.gitignore`.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY` (publishable key `sb_publishable_...`)

Local: copiar `.env.example` a `.env`. CI: cargadas como **Repo Variables** en
Settings -> Secrets and variables -> Actions -> Variables.

## Correr en local

```bash
npm install
cp .env.example .env   # y completar VITE_SUPABASE_KEY
npm run dev            # http://localhost:5174
npm run build          # build de produccion a dist/
npm run preview        # previsualizar el build
```

## Deploy

Push a `main` dispara `.github/workflows/deploy.yml`: build con las Repo Variables ->
Pages. `base` de Vite = `/web-manager-hub/` (repo project page). Live:
`https://ivanmontenegror.github.io/web-manager-hub/`.

Repo privado: GitHub Pages en repos privados requiere plan Pro/Team.

## Fases futuras (NO construidas)

- Daily Ops, Tareas (placeholders hoy).
- Generacion de emails y notificaciones con la API de Anthropic **desde una Edge Function**
  (la key vive server-side, nunca en el front). El `.mcp.json` ya apunta al proyecto
  Purina-Hub para gestionar migraciones/RLS/Edge Functions desde Claude Code.

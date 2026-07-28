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
  depends_on, is_meeting, sort_order, created_at)` (`excluded_holidays` = jsonb array de ISO: feriados que NO
  frenan esta tarea puntualmente, ej. hay backup approver de otro pais. `depends_on` = jsonb array de
  task ids predecesoras finish-to-start. `is_meeting` = bool: marca la tarea como reunion; muestra un
  icono (Users / 👥) en el Gantt y en el export a Excel)
- `ecosystem_tasks(id, section, topic, issue, action, owner, status, priority, notes, deadline,
  checklist jsonb, tags jsonb, sort_order, created_at)` (tabla del **Kanban de coordinacion** de la
  migracion, que hoy vive en el modulo **Tareas** (antes en Ecosystem 2.0); independiente de projects/tasks.
  `status` = Open|In Progress|On Hold|Done.
  `priority` = alta|media|baja. `tags` = jsonb array de strings libres (sugerido `Helo`, ver `DEFAULT_TAGS`);
  se muestran como chips en la tarjeta y hay una barra de filtro por tag. Desde esa barra, el boton
  "Resumen <tag>" (`buildTagSummary`) genera un texto plano de las tarjetas de ese tag (lista plana, sin
  agrupar por estado; cada una muestra solo nombre=tema + accion a tomar) para copiar o abrir en el email
  semanal (`mailto:`). Al pie agrega un bloque "STATUS DE PROYECTOS" con una linea por proyecto deduplicado
  por `brand` (los archivados se excluyen; ej. los 5 Fancy Feast quedan en una sola linea "Fancy Feast"),
  con el status en blanco para completar a mano; usa `projects` de `DataContext`. `checklist` = jsonb array de
  {text, done, deadline?} (cada sub-item puede tener su
  propia deadline). El **deadline efectivo** (`effectiveDeadline`) = la fecha mas temprana entre el
  `deadline` propio y las deadlines de los items del checklist NO hechos; manda para el color y el orden.
  La tarjeta muestra un chip con la deadline propia y otro (icono ListChecks) con la del checklist mas
  cercana. Orden dentro de cada columna (`ecoOrder`): PREDOMINA el deadline EFECTIVO (con fecha van arriba,
  por fecha asc), luego la prioridad (alta>media>baja), y `sort_order` como desempate. RLS abierta igual que el resto. Se crea con el SQL de `src/lib/ecosystemDb.js`
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
  arranca en hoy) y el filtro de seccion del Kanban de **Tareas** (`wmh_eco_filter`, key heredada de cuando
  vivia en Ecosystem; cae a "Todas" si la seccion guardada ya no existe). Los popovers transitorios
  (dropdown Admin, barra de ocultos) NO se recuerdan.
- **Ecosystem 2.0 = hub** (`src/modules/Ecosystem.jsx`): ya no es el Kanban (se mudo a **Tareas**). Es un
  landing con dos secciones — Documentacion (playbooks del backend v2.0, ver `src/data/playbooks.js`) y
  Modulos. Los playbooks se renderizan con `DocViewer` (`src/components/docs/`): TOC por H1, figuras con
  lightbox, tablas y filas termino/definicion. El contenido sale de los `.docx` originales parseados a
  bloques JSON en `src/data/`; las imagenes viven en `public/docs/` y se referencian con
  `import.meta.env.BASE_URL`.
- **Creacion de paginas** (`src/components/pages/`, se abre desde la seccion Modulos de Ecosystem 2.0):
  modulo para armar las paginas de la migracion. Dos capas:
  1. **Tracker** (`PagesTracker`) — lista de paginas (`pages`) con estado (Not started|In progress|On hold|
     Done, ver `PAGE_STATUS_LABEL`) y orden por prioridad (reordenable, persiste `sort_order`). El boton
     "Armar" abre el builder de esa pagina.
  2. **Builder** (`PageBuilder`) — 3 paneles: paleta de componentes | canvas con el preview EN VIVO de la
     pagina armandose | editor de contenido del componente seleccionado. Cada componente sale del catalogo
     `src/data/components.js` (define sus CAMPOS de Drupal: text|textarea|url|select|image|list). Los
     mockups se renderizan en `ComponentPreview` (`preview/`); agregar un componente = una entrada en el
     catalogo + un render ahi. Los componentes colocados viven en `page_components` (page_id, component_key,
     content jsonb, sort_order).
  3. **Export a Excel** (`src/lib/exportPage.js`, usa `html2canvas`): por pagina, una seccion por componente
     con una imagen del componente RENDERIZADO CON SU CONTENIDO (captura del preview) + tabla campo→contenido,
     para que los editores carguen en el CMS. Los mockups usan alto FIJO (no aspect-ratio) y la captura fija
     el ancho en px, porque html2canvas resuelve mal aspect-ratio y los width:% sin ancho explicito.
  Fetch tolerante + SETUP_SQL en `src/lib/pagesDb.js`. Catalogo inicial (piloto): banner, brand_logos,
  card_grid, text, text_image, big_number_grid, external_video, article_list.
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

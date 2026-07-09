# Web Manager Hub

Herramienta interna y personal de gestion de proyectos web para Nestle Purina LATAM.
Un unico usuario (el Websites Expert). Gestiona landings ejecutadas por 5 agencias
partner (BNN, F5, Hive, MSE, NBS) en 12 mercados.

Arquitectura de 4 modulos; en esta fase solo esta construido **Web Projects**. Los
otros tres (Daily Ops, Tareas, Ecosystem 2.0) son placeholders en el shell.

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
  Purina tiene `country` NULL a proposito: sus tareas usan el `market` del proyecto)
- `sla_definitions(id, action_name, sla_days, created_at)` (`sla_days` = dias HABILES)
- `holidays(id, country, date, name, created_at)` (feriados **por pais/calendario**, unique(country,date).
  Codigos en `src/lib/countries.js`. Datos 2026 best-effort, editables desde el modal Feriados)
- `projects(id, name, brand, market, start_date, market_launch, status, archived, created_at)`
  (`market` = codigo de pais/mercado, se usa como calendario de feriados para las tareas de Purina.
  `market_launch` = fecha objetivo de lanzamiento del mercado, opcional; deadline visual en el Gantt.
  `archived` = bool; los archivados se ocultan del cronograma activo y del analisis, y se muestran
  en un acordeon con su propio Gantt al final)
- `tasks(id, project_id, partner_id, action_name, planned_start, planned_days,
  planned_end GENERADA, actual_start, actual_end, status, delay_reason, excluded_holidays,
  depends_on, sort_order, created_at)` (`excluded_holidays` = jsonb array de ISO: feriados que NO
  frenan esta tarea puntualmente, ej. hay backup approver de otro pais. `depends_on` = jsonb array de
  task ids predecesoras finish-to-start)

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
barras (`.day-over`) para que se vea que no son laborales.

FKs: `tasks.project_id` ON DELETE CASCADE; `tasks.partner_id` ON DELETE SET NULL.

## Logica clave

- **Solapamientos** (`src/lib/analysis.js` -> `detectOverlaps`): comparacion por pares de
  todas las tasks. Conflicto = mismo `partner_id`, `project_id` distinto, y la interseccion de
  sus rangos `[planned_start, planned_end]` contiene al menos un dia **habil** (findes/feriados
  del partner no cuentan).
- **Retrasos** (`detectDelays`): `actual_end > planned_end`. El delta en **dias habiles** es la
  magnitud del atraso, y se dibuja como extension rayada (hasta el fin real) despues de la barra.
- La razon de retraso es **obligatoria** en el form cuando `actual_end > planned_end`
  (`src/components/modals/TaskModal.jsx`).
- **Proyeccion / forecast** (`src/lib/projection.js` -> `computeProjection`): NO destructiva. El
  baseline (`planned_start`/`planned_days`) no se toca. Por dependencias (`depends_on`) se calcula
  `projStart = max(inicio_baseline, dia habil siguiente al fin efectivo de las predecesoras)`. Fin
  efectivo = `actual_end` si termino, si no `max(plannedEnd(projStart), hoy)` (una tarea abierta y
  vencida empuja desde hoy). En el Gantt, si una tarea sin `actual_end` queda empujada, se dibuja una
  barra **forecast** punteada (`.bar-forecast`) y el tooltip muestra la predecesora culpable
  (`pushedByName`). Las tareas tipo SEO no son predecesoras de otras (no bloquean).

## Estructura

```
src/
  lib/         supabase, db (CRUD), dates, analysis (overlaps/delays), colors, exportXlsx
  context/     DataContext (carga todo + refresh, expone derivados memoizados)
  components/
    gantt/     Gantt.jsx (header por dia, findes, hoy, barras, tooltip)
    panels/    OverlapPanel, DelayPanel
    modals/    ProjectModal, TaskModal, PartnersModal, SlaModal
    ui/        Modal
  modules/     WebProjects (orquesta todo), Placeholder (modulos futuros)
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

- Daily Ops, Tareas, Ecosystem 2.0 (placeholders hoy).
- Generacion de emails y notificaciones con la API de Anthropic **desde una Edge Function**
  (la key vive server-side, nunca en el front). El `.mcp.json` ya apunta al proyecto
  Purina-Hub para gestionar migraciones/RLS/Edge Functions desde Claude Code.

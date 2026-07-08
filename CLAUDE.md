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

- `partners(id, name, color, created_at)`
- `sla_definitions(id, action_name, sla_days, created_at)`
- `projects(id, name, brand, market, start_date, market_launch, status, created_at)`
  (`market_launch` = fecha objetivo de lanzamiento del mercado, opcional; deadline visual en el Gantt)
- `tasks(id, project_id, partner_id, action_name, planned_start, planned_days,
  planned_end GENERADA, actual_start, actual_end, status, delay_reason, sort_order, created_at)`

CRITICO: `planned_end` es una **columna generada** (`planned_start + planned_days - 1`).
Nunca se escribe. En inserts/updates solo se mandan `planned_start` y `planned_days`
(ver `src/lib/db.js`). El `planned_end` para la UI se recalcula en `src/lib/dates.js`.

FKs: `tasks.project_id` ON DELETE CASCADE; `tasks.partner_id` ON DELETE SET NULL.

## Logica clave

- **Solapamientos** (`src/lib/analysis.js` -> `detectOverlaps`): comparacion por pares de
  todas las tasks. Conflicto = mismo `partner_id`, `project_id` distinto, y rangos
  `[planned_start, planned_end]` (inclusivos) que se intersectan. Un dia compartido en el
  borde (fin de una = inicio de otra) cuenta como conflicto.
- **Retrasos** (`detectDelays`): `actual_end > planned_end`. El delta en dias es la
  magnitud del atraso, y se dibuja como extension rayada despues de la barra plan.
- La razon de retraso es **obligatoria** en el form cuando `actual_end > planned_end`
  (`src/components/modals/TaskModal.jsx`).

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

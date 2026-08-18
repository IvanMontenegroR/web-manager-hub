-- Kanban de Tareas: se parte la categorizacion vieja (una sola columna `section`
-- con una mezcla de paginas y temas) en DOS ejes:
--   - `market`: MX | BR | CAM | General  (filtro principal del tablero)
--   - `section`: el TOPIC, lista cerrada  Web | CIAM | Buy Now | CRM | Proceso
-- Las 38 tarjetas que existian eran todas de MX.
-- Ya aplicado en Purina-Hub (migracion `ecosystem_tasks_market_and_topics`).

alter table public.ecosystem_tasks add column if not exists market text;

update public.ecosystem_tasks set market = 'MX' where market is null;

-- Secciones que eran paginas/areas del sitio -> topic Web.
update public.ecosystem_tasks set section = 'Web'
 where section in ('Articles','Brands','Club Purina','History','Home page','Menu','Producto','Vetline');

update public.ecosystem_tasks set section = 'CRM' where section = 'Contact us';

-- Las que estaban en el cajon de sastre 'General' se reparten por tema.
update public.ecosystem_tasks set section = 'CIAM'
 where topic in ('CIAM Full','One Pager de que falta de CIAM');
update public.ecosystem_tasks set section = 'Buy Now' where topic = 'Wayvia Buy Now';
update public.ecosystem_tasks set section = 'CRM' where topic = 'Ecosystem 2.0 CRM';
update public.ecosystem_tasks set section = 'Web'
 where topic in ('Creación de Páginas Ecosystem 2.0','Migración de Articulos y Productos','Orden de Marcas/Productos');

-- El resto de 'General' es proceso/gestion. Va ULTIMO: barre lo que quedo sin reasignar.
update public.ecosystem_tasks set section = 'Proceso' where section = 'General';

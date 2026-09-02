-- Tenencia Responsable — "Paso 1: ¡Prepara todo...!" pasa a cards APAISADAS y su primera
-- descripcion se acorta al largo que la card muestra entera. Ya aplicado.
-- Respaldo: backups.page_components_backup_paso1_apaisadas.
--
-- Los otros dos carruseles de la pagina (Perros y Gatos) ya se habian migrado; este
-- bloque — el de 3 cards, el que en el CMS se veia como "Slider Background Cards Default
-- (Max 3 cards)" — habia quedado atras. En el sitio no tiene fondo, asi que lo correcto
-- es `slider-default-card` con el Card - Style Card en "Card Grid Default Square": la
-- FORMA de la card la decide el estilo, no el modo de vista.
--
-- El texto: la card apaisada tiene alto fijo y el sitio corta la descripcion a los 111
-- caracteres (asi se ve hoy en produccion, cortada en "...tales como sus dimension"). Se
-- reescribio para que entre entera. Ver CARD_SQUARE_DESC_MAX en src/data/components.js.

create table if not exists backups.page_components_backup_paso1_apaisadas as
select id, page_id, component_key, content, parent_id, tab_index, sort_order, now() as backed_up_at
from public.page_components where id = 'd9ce2259-7a46-4bf6-8510-9cd51dcdccba';
alter table backups.page_components_backup_paso1_apaisadas enable row level security;

update public.page_components
set content = jsonb_set(
      jsonb_set(content, '{view_mode}', '"slider-default-card"'::jsonb),
      '{card_style_card}', '"card_grid_default_square"'::jsonb)
where id = 'd9ce2259-7a46-4bf6-8510-9cd51dcdccba';

-- Card 1 "Espacio en el hogar": 133 -> 111 caracteres, sin perder ninguna idea.
update public.page_components
set content = jsonb_set(content, '{items,0,description}',
      to_jsonb('Cada mascota necesita un lugar y tamaño distintos según sus características, como sus dimensiones o su energía.'::text))
where id = 'd9ce2259-7a46-4bf6-8510-9cd51dcdccba';

-- PENDIENTE: la card 2 ("Tiempo disponible") tiene 128 caracteres y tambien se corta.
-- No se toca sin confirmar el texto — es copy del mercado, no una config.

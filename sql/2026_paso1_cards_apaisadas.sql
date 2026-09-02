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
-- El texto: la card apaisada tiene alto fijo y la descripcion de 133 caracteres se ve
-- cortada en produccion ("...tales como sus dimension"). Se reescribio mas corta, sin
-- perder ninguna idea. OJO: el limite NO es de 111 — la card de al lado tiene 128 y se
-- ve entera. Lo que corta es el ALTO, no la cantidad de caracteres.
-- Ver CARD_SQUARE_DESC_MAX en src/data/components.js.

create table if not exists backups.page_components_backup_paso1_apaisadas as
select id, page_id, component_key, content, parent_id, tab_index, sort_order, now() as backed_up_at
from public.page_components where id = 'd9ce2259-7a46-4bf6-8510-9cd51dcdccba';
alter table backups.page_components_backup_paso1_apaisadas enable row level security;

update public.page_components
set content = jsonb_set(
      jsonb_set(content, '{view_mode}', '"slider-default-card"'::jsonb),
      '{card_style_card}', '"card_grid_default_square"'::jsonb)
where id = 'd9ce2259-7a46-4bf6-8510-9cd51dcdccba';

-- Card 1 "Espacio en el hogar": 133 -> 121 caracteres. Se cambia "dependiente de" por
-- "segun" y "tales como" por "como"; el resto del texto del mercado queda igual.
update public.page_components
set content = jsonb_set(content, '{items,0,description}',
      to_jsonb('Cada mascota necesita un lugar y tamaño diferentes según sus características, como sus dimensiones o su nivel de energía.'::text))
where id = 'd9ce2259-7a46-4bf6-8510-9cd51dcdccba';

-- Las otras dos cards del bloque quedan como estan: 128 y 109 caracteres, las dos se ven
-- enteras en el sitio.

-- El bloque tenia cargado un subtitulo que NO es de esta pagina ("La nutricion de las
-- mascotas es clave... Este es nuestro Compromiso Purina®"): quedo de copiar otro bloque.
-- Se saca, no se reemplaza — en el sitio el Paso 1 no tiene subtitulo.
update public.page_components set content = content - 'subtitle'
where id = 'd9ce2259-7a46-4bf6-8510-9cd51dcdccba';

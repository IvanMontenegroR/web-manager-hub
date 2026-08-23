-- Migracion de `mosaic` y `commitment_carousel` al componente `card_grid`, que espeja
-- el paragraph `ln_c_cardgrid` del CMS: las dos cosas eran el MISMO componente de
-- Drupal en modos de vista distintos. Ya aplicada (15 filas: 6 mosaicos + 9 carruseles).
--
-- Respaldo previo en `page_components_backup_cardgrid` (id, page_id, component_key,
-- content, backed_up_at). Se puede volver atras desde ahi.

create table if not exists page_components_backup_cardgrid as
select id, page_id, component_key, content, now() as backed_up_at
from page_components
where component_key in ('mosaic', 'commitment_carousel');

-- 1) MOSAICO -> Card Grid en modo grid-cards.
-- Cada card del CMS son DOS bloques de nuestro mosaico: el par (imagen) y el impar
-- (titulo + texto). Se recorren de a pares respetando el orden cargado.
with pares as (
  select pc.id,
         jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
           'image',       nullif(pc.content->'blocks'->(k*2)   ->>'image', ''),
           'title',       nullif(pc.content->'blocks'->(k*2+1) ->>'title', ''),
           'description', nullif(pc.content->'blocks'->(k*2+1) ->>'text',  '')
         )) order by k) as items
  from page_components pc
  cross join lateral generate_series(0, jsonb_array_length(pc.content->'blocks') / 2 - 1) as k
  where pc.component_key = 'mosaic'
  group by pc.id
)
update page_components pc
set component_key = 'card_grid',
    content = jsonb_strip_nulls(jsonb_build_object(
      'view_mode',             'grid-cards',
      'title',                 nullif(pc.content->>'title', ''),
      'title_tag',             nullif(pc.content->>'title_tag', ''),
      'subtitle',              nullif(pc.content->>'subtitle', ''),
      -- El color era un hex; pasa al token equivalente cuando lo conocemos.
      'background_card_color', case lower(pc.content->>'color')
                                 when '#ed1c24' then 'Primary Red'
                                 when '#ffffff' then 'Primary White' end,
      'items',                 pares.items
    ))
from pares
where pares.id = pc.id;

-- 2) CARRUSEL DE CARDS -> Card Grid. La variante pasa a ser el modo de vista.
-- Los ICONOS se traducen de los nombres viejos en español a los del CMS: si no,
-- quedarian fuera del select nuevo y se perderian al guardar la tarjeta.
update page_components pc
set component_key = 'card_grid',
    content = jsonb_strip_nulls(jsonb_build_object(
      'view_mode', case pc.content->>'type'
                     when 'Cards con icono'                  then 'slider-card-icons-square'
                     when 'Cards apaisadas con texto abajo'  then 'slider-background-default-card'
                     when 'Cards numeradas'                  then 'cards-numbers'
                     else 'slider-default-card' end,   -- sin `type` = la vertical, que era el default
      'title',            nullif(pc.content->>'title', ''),
      'title_tag',        nullif(pc.content->>'title_tag', ''),
      'subtitle',         nullif(pc.content->>'subtitle', ''),
      'background_color', case lower(coalesce(pc.content->>'background_color', pc.content->>'color'))
                            when '#ed1c24' then 'Primary Red'
                            when '#ffffff' then 'Primary White' end,
      'text_color',       case lower(pc.content->>'text_color')
                            when '#ed1c24' then 'Primary Red'
                            when '#ffffff' then 'Primary White' end,
      'title_card_color', case lower(pc.content->>'accent')
                            when '#ed1c24' then 'Primary Red'
                            when '#ffffff' then 'Primary White' end,
      'items', (
        select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
          'icon',         case it->>'icon' when 'pata' then 'paw' when 'gato' then 'cat'
                                           when 'perro' then 'dog' else nullif(it->>'icon','') end,
          'image',        nullif(it->>'image', ''),
          'image_mobile', nullif(it->>'image_mobile', ''),
          'title',        nullif(it->>'title', ''),
          'description',  nullif(it->>'description', ''),
          'cta_url',      nullif(it->>'url', '')       -- en el CMS el link de la card es el CTA
        )) order by ord)
        from jsonb_array_elements(pc.content->'items') with ordinality as e(it, ord)
      )
    ))
where pc.component_key = 'commitment_carousel';

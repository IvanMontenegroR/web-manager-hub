-- Categorias en el tracker de "Creacion de paginas". La categoria agrupa la lista
-- (Marca, Purina Adopta...); sin categoria = pagina suelta, va arriba de todo (la Home).
-- La subcategoria existe solo dentro de "Marca" y ES la columna `brand`, que ya define
-- el tema visual del builder: una sola fuente de verdad, sin dos campos que se
-- desincronicen. Ya aplicado en Purina-Hub (migracion `pages_category`).

alter table public.pages add column if not exists category text;

update public.pages set category = 'Marca', brand = 'Pro Plan'    where path = '/pro-plan';
update public.pages set category = 'Marca', brand = 'Fancy Feast' where path = '/fancy-feast';
update public.pages set category = 'Marca', brand = 'Purina One'  where path = '/purina-one';
update public.pages set category = 'Marca', brand = 'Dog Chow'    where path = '/dog-chow';

update public.pages set category = 'Purina Adopta' where path like '/purina-adopta/%';

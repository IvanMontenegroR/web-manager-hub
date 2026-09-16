-- El MENU del sitio de MEXICO (purina:header-main), tal cual la matriz que completo el
-- mercado. Se corre UNA vez en el SQL editor de Supabase.
--
-- Es un upsert por mercado: la fila de MX es unica, asi que esto la crea o la reemplaza.
-- El arbol entero va en el jsonb `items` (ver src/lib/menuDb.js): los cinco menus
-- principales, cada uno con sus submenus, su icono y sus tarjetas.
--
-- GENERADO desde `DEFAULT_MENU` de src/data/siteMenu.js, que es la misma estructura que
-- usa la app: asi lo que queda en la base y lo que dibuja el mockup no se pueden separar.
-- Si hay que cambiar el menu, se cambia alla y se vuelve a generar.
--
-- Las URLs van VACIAS: la matriz vino sin ellas. Se completan en el editor del menu.
--
-- Requiere la tabla `site_menu` (SETUP_SQL de src/lib/menuDb.js).

insert into public.site_menu (market, items, updated_at)
values ('MX', '[
  {
    "label": "Alimento",
    "layout": "boxes",
    "search": {
      "label": "Encuentra su alimento ideal",
      "placeholder": "Cuéntanos qué necesita tu mascota…"
    },
    "groups": [
      {
        "title": "Perros",
        "icon": "dog",
        "links": [
          {
            "label": "Cachorro",
            "url": ""
          },
          {
            "label": "Adulto",
            "url": ""
          },
          {
            "label": "Senior",
            "url": ""
          }
        ]
      },
      {
        "title": "Gatos",
        "icon": "cat",
        "links": [
          {
            "label": "Gatito",
            "url": ""
          },
          {
            "label": "Adulto",
            "url": ""
          },
          {
            "label": "Senior",
            "url": ""
          }
        ]
      },
      {
        "title": "Tipo de alimento",
        "icon": "pet_supplies",
        "links": [
          {
            "label": "Alimento Seco",
            "url": ""
          },
          {
            "label": "Alimento Húmedo",
            "url": ""
          },
          {
            "label": "Premios y Snacks",
            "url": ""
          },
          {
            "label": "Suplementos",
            "url": ""
          }
        ]
      }
    ],
    "more": {
      "label": "Ver productos",
      "url": ""
    },
    "promos": []
  },
  {
    "label": "Marcas",
    "layout": "boxes",
    "groups": [
      {
        "title": "Para Gatos",
        "icon": "cat",
        "links": [
          {
            "label": "Pro Plan®",
            "url": ""
          },
          {
            "label": "Felix®",
            "url": ""
          },
          {
            "label": "Cat Chow®",
            "url": ""
          },
          {
            "label": "Fancy Feast®",
            "url": ""
          }
        ]
      },
      {
        "title": "Para Perros",
        "icon": "dog",
        "links": [
          {
            "label": "Pro Plan®",
            "url": ""
          },
          {
            "label": "Dog Chow®",
            "url": ""
          },
          {
            "label": "Beneful®",
            "url": ""
          },
          {
            "label": "Purina One®",
            "url": ""
          }
        ]
      }
    ],
    "more": {
      "label": "Ver todas",
      "url": ""
    },
    "promos": [
      {
        "title": "Pregunta a un experto",
        "text": "Recibe asesoría personalizada y encuentra el alimento adecuado para tu mascota.",
        "image": "",
        "url": ""
      },
      {
        "title": "Consejos para cuidar a tu mascota",
        "text": "Únete a Club Purina® y recibe recomendaciones, novedades y contenido personalizado.",
        "image": "",
        "url": ""
      }
    ]
  },
  {
    "label": "Red Purina®",
    "layout": "links",
    "links": [
      {
        "label": "Lo más leído",
        "url": "",
        "icon": "newsmode"
      },
      {
        "label": "Comunidad Purina®",
        "url": "",
        "icon": "forum"
      }
    ],
    "promos": [
      {
        "title": "Pregunta a un experto",
        "text": "Recibe asesoría personalizada y aprende más de tu mascota.",
        "image": "",
        "url": ""
      },
      {
        "title": "Consejos para cuidar a tu mascota",
        "text": "Únete a Club Purina® y recibe recomendaciones, novedades y contenido personalizado.",
        "image": "",
        "url": ""
      }
    ]
  },
  {
    "label": "Servicios",
    "layout": "links",
    "links": [
      {
        "label": "Adopta una mascota",
        "url": "",
        "icon": "adocao"
      },
      {
        "label": "Contacta a un experto",
        "url": "",
        "icon": "chat"
      },
      {
        "label": "Conoce nuestro programa de Breeders",
        "url": "",
        "icon": "genetics"
      },
      {
        "label": "Encuentra dónde dejar a tu mascota",
        "url": "",
        "icon": "hotel"
      },
      {
        "label": "Tiendas",
        "url": "",
        "icon": "storefront"
      },
      {
        "label": "Yo Reciclo",
        "url": ""
      }
    ],
    "promos": [
      {
        "title": "Pregunta a un experto",
        "text": "Recibe asesoría personalizada y aprende más de tu mascota.",
        "image": "",
        "url": ""
      },
      {
        "title": "Consejos para cuidar a tu mascota",
        "text": "Únete a Club Purina® y recibe recomendaciones, novedades y contenido personalizado.",
        "image": "",
        "url": ""
      }
    ]
  },
  {
    "label": "Conoce Purina®",
    "layout": "links",
    "links": [
      {
        "label": "Nuestra historia",
        "url": "",
        "icon": "history"
      },
      {
        "label": "Prensa",
        "url": "",
        "icon": "newsmode"
      },
      {
        "label": "Aliados",
        "url": "",
        "icon": "handshake"
      },
      {
        "label": "Preguntas frecuentes",
        "url": "",
        "icon": "help"
      },
      {
        "label": "Profesionales",
        "url": "",
        "icon": "stethoscope"
      },
      {
        "label": "Contacto",
        "url": "",
        "icon": "mail"
      },
      {
        "label": "Club Purina®",
        "url": "",
        "icon": "workspace_premium"
      }
    ],
    "promos": []
  }
]'::jsonb, now())
on conflict (market) do update
  set items = excluded.items,
      updated_at = now();

-- El MENU del sitio de MEXICO (purina:header-main): la matriz que completo el mercado,
-- ajustada con la revision del sitio viejo (Consejos y cuidados, marcas, Donde comprar). Se corre UNA vez en el SQL editor de Supabase.
--
-- Es un upsert por mercado: la fila de MX es unica, asi que esto la crea o la reemplaza.
-- El arbol entero va en el jsonb `items` (ver src/lib/menuDb.js): los cinco menus
-- principales, cada uno con sus submenus, su icono y sus tarjetas.
--
-- GENERADO desde `DEFAULT_MENU` de src/data/siteMenu.js, que es la misma estructura que
-- usa la app: asi lo que queda en la base y lo que dibuja el mockup no se pueden separar.
-- Si hay que cambiar el menu, se cambia alla y se vuelve a generar.
--
-- Las URLs son las de preprod; las vacias no tienen pagina todavia.
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
            "url": "/productos?field_product_life_stage%5B6%5D=6"
          },
          {
            "label": "Adulto",
            "url": "/productos?field_product_life_stage%5B22%5D=22&pettype=30"
          },
          {
            "label": "Senior",
            "url": "/productos?field_product_life_stage%5B1%5D=1&pettype=30"
          }
        ]
      },
      {
        "title": "Gatos",
        "icon": "cat",
        "links": [
          {
            "label": "Gatito",
            "url": "/productos?field_product_life_stage%5B54%5D=54"
          },
          {
            "label": "Adulto",
            "url": "/productos?field_product_life_stage%5B22%5D=22&pettype=18"
          },
          {
            "label": "Senior",
            "url": "/productos?field_product_life_stage%5B1%5D=1&pettype=18"
          }
        ]
      },
      {
        "title": "Tipo de alimento",
        "icon": "pet_supplies",
        "links": [
          {
            "label": "Alimento Seco",
            "url": "/productos?field_product_food_type%5B8%5D=8"
          },
          {
            "label": "Alimento Húmedo",
            "url": "/productos?field_product_food_type%5B4%5D=4"
          },
          {
            "label": "Premios y Snacks",
            "url": "/productos?field_product_food_type%5B26%5D=26"
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
      "url": "/productos"
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
            "url": "/proplan"
          },
          {
            "label": "Felix®",
            "url": "/felix"
          },
          {
            "label": "Cat Chow®",
            "url": "/catchow"
          },
          {
            "label": "Fancy Feast®",
            "url": "/fancy-feast"
          },
          {
            "label": "Purina® One®",
            "url": "/purina-one"
          },
          {
            "label": "Gatina®",
            "url": "/gatina"
          },
          {
            "label": "Excellent®",
            "url": "/excellent"
          },
          {
            "label": "Dentalife®",
            "url": "/dentalife"
          }
        ]
      },
      {
        "title": "Para Perros",
        "icon": "dog",
        "links": [
          {
            "label": "Pro Plan®",
            "url": "/proplan"
          },
          {
            "label": "Dog Chow®",
            "url": "/dogchow"
          },
          {
            "label": "Beneful®",
            "url": "/beneful"
          },
          {
            "label": "Excellent®",
            "url": "/excellent"
          },
          {
            "label": "Purina® One®",
            "url": "/purina-one"
          },
          {
            "label": "Campeón®",
            "url": "/campeon"
          },
          {
            "label": "Dentalife®",
            "url": "/dentalife"
          }
        ]
      }
    ],
    "more": {
      "label": "Conoce nuestras marcas",
      "url": "/nuestras-marcas"
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
    "label": "Consejos y cuidados",
    "layout": "boxes",
    "groups": [
      {
        "title": "Perros",
        "icon": "dog",
        "links": [
          {
            "label": "Nutrición",
            "url": "/articulos/nutricion?pettype=30"
          },
          {
            "label": "Cuidado y bienestar",
            "url": "/articulos/cuidado-y-bienestar?pettype=30"
          },
          {
            "label": "Cambios en mi mascota",
            "url": "/articulos/cambios-em-mi-mascota?pettype=30"
          },
          {
            "label": "Entrenamiento",
            "url": "/articulos/entrenamiento?pettype=30"
          }
        ]
      },
      {
        "title": "Gatos",
        "icon": "cat",
        "links": [
          {
            "label": "Nutrición",
            "url": "/articulos/nutricion?pettype=18"
          },
          {
            "label": "Cuidado y bienestar",
            "url": "/articulos/cuidado-y-bienestar?pettype=18"
          },
          {
            "label": "Cambios en mi mascota",
            "url": "/articulos/cambios-em-mi-mascota?pettype=18"
          },
          {
            "label": "Entrenamiento",
            "url": "/articulos/entrenamiento?pettype=18"
          }
        ]
      }
    ],
    "more": {
      "label": "Ver todos los artículos",
      "url": "/articulos"
    },
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
        "url": "/adopta",
        "icon": "adocao"
      },
      {
        "label": "Contacta a un experto",
        "url": "https://wa.me/+525549637160",
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
        "label": "Dónde comprar",
        "url": "/donde-comprar",
        "icon": "storefront"
      },
      {
        "label": "Yo Reciclo",
        "url": "/purina-cuida/por-el-planeta/reciclando-con-purina"
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
        "url": "/conoce-purina/historia",
        "icon": "history"
      },
      {
        "label": "Prensa",
        "url": "",
        "icon": "newsmode"
      },
      {
        "label": "Preguntas frecuentes",
        "url": "",
        "icon": "help"
      },
      {
        "label": "Contacto",
        "url": "/contacto",
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

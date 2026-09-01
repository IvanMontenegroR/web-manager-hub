#!/usr/bin/env python3
"""Recorta las imagenes de las cards APAISADAS a las medidas del CMS, en 2x.

    python3 tools/cards_resize.py <carpeta-destino> <img1> <img2> ...

Las imagenes se toman EN ORDEN y se les asigna el slug de `SLUGS` por posicion, asi
que hay que pasarlas en el orden de las cards. Con --slugs se usa otra lista.

De cada original salen DOS archivos:

    <slug>-desktop.jpg   970x560   (485x280 @2x)
    <slug>-mobile.jpg    670x560   (335x280 @2x)

SIN DEFORMAR: la imagen se escala hasta CUBRIR la medida pedida y se recorta lo que
sobra, centrado. Es lo unico que se puede hacer sin estirar, porque desktop y mobile
no comparten proporcion (1.73 contra 1.20): mobile es bastante mas cuadrada, asi que
recorta mas a los costados. Si un motivo queda mal cortado, se ajusta con --anchor.
"""
import argparse
import re
import sys
import unicodedata
from pathlib import Path

from PIL import Image, ImageOps

# Medidas del CMS (1x) y el factor. Ver `specsByType` en src/data/components.js.
DESKTOP = (485, 280)
MOBILE = (335, 280)
SCALE = 2
QUALITY = 85  # el CMS pide max 500kb; con esto sobra de lejos

# Las cards del carrusel "Perros" de Tenencia Responsable, en orden.
SLUGS = [
    'actividades-fisicas',
    'socializacion',
    'alimentacion',
    'banos-y-aseos',
    'entrenamiento',
    'espacio',
]


def slugify(text):
    """'Baños y aseos' -> 'banos-y-aseos'."""
    n = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode()
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', n.lower())).strip('-')


def cover(img, size, anchor):
    """Escala hasta cubrir `size` y recorta el excedente. Nunca deforma."""
    # `anchor` va de 0 (izquierda / arriba) a 1 (derecha / abajo); 0.5 = centrado.
    return ImageOps.fit(img, size, method=Image.LANCZOS, centering=anchor)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('dest')
    ap.add_argument('images', nargs='+')
    ap.add_argument('--slugs', help='lista separada por comas, en el orden de las imagenes')
    ap.add_argument('--anchor', default='0.5,0.5',
                    help='centro del recorte x,y de 0 a 1 (default 0.5,0.5 = centrado)')
    ap.add_argument('--quality', type=int, default=QUALITY)
    a = ap.parse_args()

    slugs = [slugify(s) for s in a.slugs.split(',')] if a.slugs else SLUGS
    if len(a.images) > len(slugs):
        sys.exit(f'Hay {len(a.images)} imagenes y solo {len(slugs)} slugs. Pasa --slugs.')
    ax, ay = (float(v) for v in a.anchor.split(','))
    dest = Path(a.dest)
    dest.mkdir(parents=True, exist_ok=True)

    for src, slug in zip(a.images, slugs):
        img = Image.open(src)
        # EXIF de orientacion: sin esto una foto de celular sale rotada.
        img = ImageOps.exif_transpose(img)
        # JPG no tiene alfa: un PNG transparente se aplana sobre blanco.
        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGBA')
            flat = Image.new('RGB', img.size, (255, 255, 255))
            flat.paste(img, mask=img.split()[-1])
            img = flat
        else:
            img = img.convert('RGB')

        w0, h0 = img.size
        for label, (w, h) in (('desktop', DESKTOP), ('mobile', MOBILE)):
            tw, th = w * SCALE, h * SCALE
            if w0 < tw or h0 < th:
                print(f'  OJO  {slug}-{label}: el original es {w0}x{h0} y hace falta '
                      f'{tw}x{th}. Se agranda y va a perder nitidez.')
            out = dest / f'{slug}-{label}.jpg'
            cover(img, (tw, th), (ax, ay)).save(
                out, 'JPEG', quality=a.quality, optimize=True, progressive=True)
            kb = out.stat().st_size / 1024
            print(f'  {out.name:<32} {tw}x{th}  {kb:.0f}kb')


if __name__ == '__main__':
    main()

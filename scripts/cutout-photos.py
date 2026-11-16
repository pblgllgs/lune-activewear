"""Recorta el fondo claro de una foto de producto y la guarda en WebP con transparencia.

Pensado para fotos de prendas sobre fondo blanco o gris muy claro (estudio). El
fondo se vuelve transparente con una rampa de luminancia: lo oscuro queda opaco,
lo claro desaparece y la sombra suave queda semitransparente. Así la prenda se
puede montar sobre el fondo crema de la tienda sin el rectángulo blanco.

Uso:
    python scripts/cutout-photos.py entrada.jpg salida.webp
    python scripts/cutout-photos.py entrada.jpg salida.webp --height 1380 --bottom 1640

Requiere Pillow (`pip install pillow`). Es una herramienta local de preparación:
no se ejecuta en el build ni en Cloudflare.

Nota: si la foto tiene fondo de color (no claro), este método no sirve; hace
falta un recorte manual o una herramienta de segmentación.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

CANVAS = (1000, 1700)
TARGET_H = 1380
BOTTOM = 1640
# Luminancia: por debajo de LO la prenda es opaca; por encima de HI es fondo.
LO, HI = 205.0, 234.0
# Alfa mínimo para considerar que un píxel es parte de la prenda.
CROP_ALPHA = 30


def cutout(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGB")
    width, height = image.size
    result = Image.new("RGBA", (width, height))
    src = image.load()
    dst = result.load()
    for y in range(height):
        for x in range(width):
            r, g, b = src[x, y]
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            alpha = (HI - lum) / (HI - LO)
            alpha = 0.0 if alpha <= 0 else (1.0 if alpha >= 1 else alpha)
            dst[x, y] = (r, g, b, round(alpha * 255))
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Recorta el fondo claro de una foto de producto.")
    parser.add_argument("source", type=Path)
    parser.add_argument("target", type=Path)
    parser.add_argument("--height", type=int, default=TARGET_H, help="alto de la prenda en píxeles")
    parser.add_argument("--bottom", type=int, default=BOTTOM, help="y del borde inferior")
    parser.add_argument("--canvas", default=f"{CANVAS[0]}x{CANVAS[1]}", help="lienzo WxH")
    args = parser.parse_args()

    canvas_w, canvas_h = (int(value) for value in args.canvas.lower().split("x"))
    cut = cutout(args.source)

    mask = cut.split()[3].point(lambda value: 255 if value > CROP_ALPHA else 0)
    box = mask.getbbox()
    if box is None:
        raise SystemExit("No se detectó la prenda: revisa el contraste del fondo.")

    garment = cut.crop(box)
    scale = args.height / garment.height
    garment = garment.resize(
        (max(1, round(garment.width * scale)), args.height), Image.LANCZOS
    )

    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    x = (canvas_w - garment.width) // 2
    y = args.bottom - garment.height
    canvas.alpha_composite(garment, (x, y))

    args.target.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(args.target, "WEBP", quality=90, method=6)
    print(
        f"{args.source.name}: recorte {box} -> {args.target} "
        f"({args.target.stat().st_size // 1024} KB, {garment.width}x{garment.height})"
    )


if __name__ == "__main__":
    main()

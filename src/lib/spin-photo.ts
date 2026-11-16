/**
 * Prepara una foto para el giro de 180° de la ficha.
 *
 * Hace lo mismo que `scripts/cutout-photos.py`, pero en el navegador al subir la
 * foto desde el admin: quita el fondo claro con una rampa de luminancia y
 * normaliza el lienzo (1000×1700, prenda de 1380 px de alto apoyada en y=1640).
 * Así la foto del frente y la de la espalda coinciden al girar la tarjeta.
 *
 * No hay segmentación ni IA: lo oscuro queda opaco, lo claro desaparece y la
 * sombra suave queda semitransparente. Sirve para fotos sobre fondo blanco o
 * gris muy claro; con fondo de color hay que subir un PNG/WebP ya recortado.
 */
const CANVAS_W = 1000;
const CANVAS_H = 1700;
const TARGET_H = 1380;
const BOTTOM = 1640;
/** Luminancia: por debajo de LO la prenda es opaca; por encima de HI es fondo. */
const LO = 205;
const HI = 234;
/** Alfa mínimo para considerar que un píxel es parte de la prenda. */
const CROP_ALPHA = 30;
/** Se procesa a este ancho como máximo: el lienzo final mide 1000 px. */
const MAX_SOURCE_W = 1400;

function context2d(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("El navegador no pudo procesar la imagen.");
  return ctx;
}

export async function cutoutPhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_SOURCE_W / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const source = document.createElement("canvas");
    source.width = width;
    source.height = height;
    const ctx = context2d(source);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const image = ctx.getImageData(0, 0, width, height);
    const px = image.data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        const alpha = Math.min(1, Math.max(0, (HI - lum) / (HI - LO)));
        px[i + 3] = Math.round(alpha * 255);
        if (px[i + 3] > CROP_ALPHA) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      throw new Error(
        "No se detectó la prenda: el fondo es demasiado oscuro o la foto no tiene contraste."
      );
    }

    ctx.putImageData(image, 0, 0);

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const targetW = Math.max(1, Math.round((cropW * TARGET_H) / cropH));

    const output = document.createElement("canvas");
    output.width = CANVAS_W;
    output.height = CANVAS_H;
    const outCtx = context2d(output);
    outCtx.drawImage(
      source,
      minX,
      minY,
      cropW,
      cropH,
      Math.round((CANVAS_W - targetW) / 2),
      BOTTOM - TARGET_H,
      targetW,
      TARGET_H
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      output.toBlob(resolve, "image/webp", 0.9)
    );
    if (!blob) throw new Error("No se pudo generar la imagen recortada.");

    // Safari antiguo no exporta WebP: se guarda como PNG con transparencia.
    const type = blob.type || "image/png";
    const extension = type === "image/webp" ? "webp" : "png";
    const base = file.name.replace(/\.[^.]+$/, "").trim() || "giro";
    return new File([blob], `${base}.${extension}`, { type });
  } finally {
    bitmap.close();
  }
}

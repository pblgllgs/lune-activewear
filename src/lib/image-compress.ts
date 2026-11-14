/**
 * Compresión de fotos de reseñas en el navegador.
 * Una foto de móvil sin comprimir pesa 4–8 MB; aquí se reduce a ~1600 px y JPEG
 * de calidad 0.82 antes de subirla a R2.
 */
export const ACCEPTED_REVIEW_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

/** Devuelve un mensaje de error legible o `null` si la foto es válida. */
export function validateReviewPhoto(file: File): string | null {
  if (!ACCEPTED_REVIEW_PHOTO_TYPES.includes(file.type)) {
    return "Formato no compatible. Usa JPG, PNG o WebP.";
  }
  if (file.size > MAX_INPUT_BYTES) {
    return "La foto supera los 8 MB. Elige una imagen más liviana.";
  }
  return null;
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Algunos navegadores no soportan todos los formatos con createImageBitmap.
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    image.src = url;
  });
}

/** Redimensiona y recomprime la foto. Siempre devuelve un JPEG. */
export async function compressImage(file: File): Promise<File> {
  const image = await loadImage(file);
  const sourceWidth = "width" in image ? image.width : 0;
  const sourceHeight = "height" in image ? image.height : 0;
  if (!sourceWidth || !sourceHeight) throw new Error("No se pudo leer la imagen.");

  const scale = Math.min(1, MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo procesar la imagen.");
  context.drawImage(image, 0, 0, width, height);
  if ("close" in image) image.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  );
  if (!blob) throw new Error("No se pudo comprimir la imagen.");

  const baseName = file.name.replace(/\.[^.]+$/, "") || "foto";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

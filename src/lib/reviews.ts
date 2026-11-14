import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logAudit } from "@/lib/audit";
import { deleteFromR2 } from "@/lib/upload";

/** Máximo de fotos que puede adjuntar una clienta a su comentario. */
export const MAX_REVIEW_PHOTOS = 3;

export interface Review {
  id: string;
  productId: string;
  productName?: string;
  name: string;
  text: string;
  rating?: number;
  /** URLs públicas de las fotos subidas a R2 (máximo 3). */
  photos: string[];
  /** `true` cuando la reseña se cruzó con una compra confirmada de la clienta. */
  verifiedPurchase: boolean;
  /** Pedido que respalda la compra verificada. */
  orderId?: string;
  /** UID de la sesión que envió la reseña, si la había. */
  userId?: string;
  approved: boolean;
  createdAt: string;
}

function normalizePhotos(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((url): url is string => typeof url === "string" && url.trim().length > 0)
    .slice(0, MAX_REVIEW_PHOTOS);
}

function normalizeReview(id: string, data: Record<string, unknown>): Review {
  const ratingRaw = data.rating;
  const rating =
    typeof ratingRaw === "number" && Number.isFinite(ratingRaw)
      ? Math.min(5, Math.max(1, Math.round(ratingRaw)))
      : undefined;
  return {
    id,
    productId: String(data.productId ?? ""),
    ...(data.productName ? { productName: String(data.productName) } : {}),
    name: String(data.name ?? ""),
    text: String(data.text ?? ""),
    ...(rating ? { rating } : {}),
    photos: normalizePhotos(data.photos),
    verifiedPurchase: Boolean(data.verifiedPurchase),
    ...(data.orderId ? { orderId: String(data.orderId) } : {}),
    ...(data.userId ? { userId: String(data.userId) } : {}),
    approved: Boolean(data.approved),
    createdAt: String(data.createdAt ?? ""),
  };
}

export async function getApprovedReviews(productId: string): Promise<Review[]> {
  if (!db) return [];
  try {
    const q = query(
      collection(db, "products", productId, "reviews"),
      where("approved", "==", true),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => normalizeReview(d.id, d.data() as Record<string, unknown>));
  } catch (error) {
    console.warn("No se pudieron leer los comentarios del producto.", error);
    return [];
  }
}

export async function submitReview(input: {
  productId: string;
  productName: string;
  name: string;
  text: string;
  rating?: number;
  photos?: string[];
  verifiedPurchase?: boolean;
  orderId?: string;
  userId?: string;
}): Promise<void> {
  if (!db) throw new Error("Los comentarios no están disponibles en este momento.");
  const name = input.name.trim().slice(0, 80);
  const text = input.text.trim().slice(0, 1200);
  if (!name) throw new Error("Escribe tu nombre.");
  if (!text) throw new Error("Escribe tu comentario.");
  const photos = normalizePhotos(input.photos);
  const rating =
    input.rating && Number.isFinite(input.rating)
      ? Math.min(5, Math.max(1, Math.round(input.rating)))
      : undefined;
  // La verificación solo cuenta si viene acompañada del pedido que la respalda.
  const verifiedPurchase = Boolean(input.verifiedPurchase && input.orderId);
  const ref = await addDoc(collection(db, "products", input.productId, "reviews"), {
    productId: input.productId,
    productName: input.productName,
    name,
    text,
    ...(rating ? { rating } : {}),
    photos,
    verifiedPurchase,
    ...(verifiedPurchase && input.orderId ? { orderId: input.orderId } : {}),
    ...(input.userId ? { userId: input.userId } : {}),
    approved: false,
    createdAt: new Date().toISOString(),
  });

  void logAudit({
    action: "review.create",
    entity: "review",
    entityId: ref.id,
    entityLabel: input.productName,
    summary: `Envió un comentario en «${input.productName}».`,
    metadata: {
      productId: input.productId,
      rating: rating ?? null,
      photos: photos.length,
      verifiedPurchase,
    },
    source: "web",
  });
}

/** Admin: comentarios pendientes de todos los productos. */
export async function getPendingReviews(): Promise<Review[]> {
  if (!db) return [];
  try {
    const q = query(collectionGroup(db, "reviews"), where("approved", "==", false));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => normalizeReview(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  } catch (error) {
    console.warn("No se pudieron leer los comentarios pendientes.", error);
    return [];
  }
}

/** Admin: comentarios publicados de todos los productos. */
export async function getPublishedReviews(): Promise<Review[]> {
  if (!db) return [];
  try {
    const q = query(collectionGroup(db, "reviews"), where("approved", "==", true));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => normalizeReview(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  } catch (error) {
    console.warn("No se pudieron leer los comentarios publicados.", error);
    return [];
  }
}

/**
 * Recalcula la nota media y el número de reseñas del producto.
 * Se ejecuta después de aprobar, ocultar o eliminar un comentario.
 */
async function recomputeProductRating(productId: string): Promise<void> {
  if (!db) return;
  try {
    const snap = await getDocs(
      query(collection(db, "products", productId, "reviews"), where("approved", "==", true))
    );
    const ratings = snap.docs
      .map((d) => d.data().rating)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const ratingCount = ratings.length;
    const ratingAvg =
      ratingCount === 0
        ? 0
        : Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratingCount) * 10) / 10;
    await updateDoc(doc(db, "products", productId), { ratingAvg, ratingCount });
  } catch (error) {
    // La nota media es un extra: si falla, la moderación ya se guardó.
    console.warn("No se pudo actualizar la nota media del producto.", error);
  }
}

export async function approveReview(productId: string, reviewId: string): Promise<void> {
  if (!db) throw new Error("Firebase no está configurado.");
  await updateDoc(doc(db, "products", productId, "reviews", reviewId), { approved: true });
  await recomputeProductRating(productId);
  void logAudit({
    action: "review.approve",
    entity: "review",
    entityId: reviewId,
    entityLabel: productId,
    summary: "Aprobó un comentario y lo publicó.",
    metadata: { productId },
  });
}

/** Admin: vuelve a ocultar un comentario publicado (queda pendiente de revisión). */
export async function hideReview(productId: string, reviewId: string): Promise<void> {
  if (!db) throw new Error("Firebase no está configurado.");
  await updateDoc(doc(db, "products", productId, "reviews", reviewId), { approved: false });
  await recomputeProductRating(productId);
  void logAudit({
    action: "review.hide",
    entity: "review",
    entityId: reviewId,
    entityLabel: productId,
    summary: "Ocultó un comentario publicado.",
    metadata: { productId },
  });
}

export async function deleteReview(productId: string, reviewId: string): Promise<void> {
  if (!db) throw new Error("Firebase no está configurado.");
  const ref = doc(db, "products", productId, "reviews", reviewId);
  let photos: string[] = [];
  try {
    const snap = await getDoc(ref);
    photos = normalizePhotos(snap.data()?.photos);
  } catch (error) {
    console.warn("No se pudieron leer las fotos del comentario antes de eliminarlo.", error);
  }

  await deleteDoc(ref);
  // Las fotos viven en R2: si falla el borrado no se bloquea la eliminación.
  await Promise.allSettled(photos.map((url) => deleteFromR2(url)));
  await recomputeProductRating(productId);
  void logAudit({
    action: "review.delete",
    entity: "review",
    entityId: reviewId,
    entityLabel: productId,
    summary: "Eliminó un comentario.",
    metadata: { productId, photos: photos.length },
  });
}

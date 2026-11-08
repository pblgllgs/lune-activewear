import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Review {
  id: string;
  productId: string;
  productName?: string;
  name: string;
  text: string;
  rating?: number;
  approved: boolean;
  createdAt: string;
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
}): Promise<void> {
  if (!db) throw new Error("Los comentarios no están disponibles en este momento.");
  const name = input.name.trim().slice(0, 80);
  const text = input.text.trim().slice(0, 1200);
  if (!name) throw new Error("Escribe tu nombre.");
  if (!text) throw new Error("Escribe tu comentario.");
  const rating =
    input.rating && Number.isFinite(input.rating)
      ? Math.min(5, Math.max(1, Math.round(input.rating)))
      : undefined;
  await addDoc(collection(db, "products", input.productId, "reviews"), {
    productId: input.productId,
    productName: input.productName,
    name,
    text,
    ...(rating ? { rating } : {}),
    approved: false,
    createdAt: new Date().toISOString(),
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

export async function approveReview(productId: string, reviewId: string): Promise<void> {
  if (!db) throw new Error("Firebase no está configurado.");
  await updateDoc(doc(db, "products", productId, "reviews", reviewId), { approved: true });
}

export async function deleteReview(productId: string, reviewId: string): Promise<void> {
  if (!db) throw new Error("Firebase no está configurado.");
  await deleteDoc(doc(db, "products", productId, "reviews", reviewId));
}

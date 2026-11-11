import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { sanitizeRichText } from "@/lib/rich-text";
import type { Guide, GuideInput } from "@/types/guide";

const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export function normalizeGuide(id: string, data: Record<string, unknown>): Guide {
  const title = str(data.title);
  const slug = str(data.slug) || id;
  return {
    id,
    slug,
    title,
    excerpt: str(data.excerpt),
    content: sanitizeRichText(str(data.content)),
    coverImage: str(data.coverImage) || undefined,
    published: data.published === true,
    createdAt: str(data.createdAt) || undefined,
    updatedAt: str(data.updatedAt) || undefined,
    publishedAt: str(data.publishedAt) || undefined,
  };
}

export function slugifyGuide(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function guidePath(slug: string): string {
  return `/guias/${slug}`;
}

export function subscribeGuides(callback: (guides: Guide[]) => void, all = false): () => void {
  if (!db) {
    callback([]);
    return () => {};
  }
  const ref = collection(db, "guides");
  const q = all ? ref : query(ref, where("published", "==", true));
  return onSnapshot(
    q,
    (snap) => {
      const guides = snap.docs
        .map((d) => normalizeGuide(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => (b.publishedAt || b.updatedAt || b.createdAt || "").localeCompare(a.publishedAt || a.updatedAt || a.createdAt || ""));
      callback(guides);
    },
    () => callback([])
  );
}

export async function getGuideBySlug(slug: string): Promise<Guide | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, "guides", slug));
  if (!snap.exists()) return null;
  return normalizeGuide(snap.id, snap.data() as Record<string, unknown>);
}

export async function listPublishedGuides(): Promise<Guide[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, "guides"), where("published", "==", true)));
  return snap.docs
    .map((d) => normalizeGuide(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => (b.publishedAt || b.updatedAt || b.createdAt || "").localeCompare(a.publishedAt || a.updatedAt || a.createdAt || ""));
}

export async function saveGuide(input: GuideInput, existingId?: string): Promise<string> {
  if (!db) throw new Error("Firebase no está configurado.");
  const now = new Date().toISOString();
  const slug = slugifyGuide(input.slug || input.title);
  if (!slug) throw new Error("La guía necesita un título o slug válido.");
  if (!existingId) {
    const existing = await getDoc(doc(db, "guides", slug));
    if (existing.exists()) throw new Error("Ya existe una guía con ese slug/título.");
  }
  const payload = {
    slug,
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    content: sanitizeRichText(input.content),
    coverImage: input.coverImage?.trim() || "",
    published: input.published === true,
    updatedAt: now,
    ...(input.published ? { publishedAt: now } : {}),
  };
  if (existingId) {
    const ref = doc(db, "guides", existingId);
    if (existingId !== slug) {
      // move document to new slug id
      const prev = await getDoc(ref);
      await setDoc(doc(db, "guides", slug), {
        ...(prev.exists() ? prev.data() : {}),
        ...payload,
        createdAt: prev.exists() ? (prev.data().createdAt || now) : now,
      });
      await deleteDoc(ref);
      return slug;
    }
    const prev = await getDoc(ref);
    await updateDoc(ref, {
      ...payload,
      ...(prev.exists() && prev.data().createdAt ? {} : { createdAt: now }),
    });
    return existingId;
  }
  await setDoc(doc(db, "guides", slug), { ...payload, createdAt: now });
  return slug;
}

export async function deleteGuide(id: string): Promise<void> {
  if (!db) throw new Error("Firebase no está configurado.");
  await deleteDoc(doc(db, "guides", id));
}

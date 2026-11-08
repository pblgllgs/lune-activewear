import { useEffect, useRef, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ImagePlus, Plus, Save, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { uploadToR2 } from "@/lib/upload";
import {
  DEFAULT_HERO_SLIDES,
  DEFAULT_SITE_CONTENT,
  getSiteContent,
  type HeroSlide,
  type HeroSlideFit,
  type HeroSlidePosition,
  type SiteContent,
} from "@/lib/site-content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageWithFallback } from "@/components/shop/ImageWithFallback";

type AboutSlotKey = "aboutImageOne" | "aboutImageTwo";

interface DraftImage {
  url: string;
  file?: File;
}

interface DraftSlide extends DraftImage {
  fit: HeroSlideFit;
  position: HeroSlidePosition;
}

const ABOUT_SLOTS: { key: AboutSlotKey; label: string; hint: string }[] = [
  {
    key: "aboutImageOne",
    label: "Nosotros · imagen principal",
    hint: "Foto vertical grande del collage (recomendado 1000 px de ancho).",
  },
  {
    key: "aboutImageTwo",
    label: "Nosotros · imagen secundaria",
    hint: "Foto horizontal del collage (recomendado 1000 px de ancho).",
  },
];

const fitClass = (fit: HeroSlideFit) => (fit === "contain" ? "object-contain" : "object-cover");

const positionClass = (position: HeroSlidePosition) => {
  if (position === "top") return "object-top";
  if (position === "bottom") return "object-bottom";
  return "object-center";
};

function toAboutDrafts(content: SiteContent): Record<AboutSlotKey, DraftImage> {
  return {
    aboutImageOne: { url: content.aboutImageOne },
    aboutImageTwo: { url: content.aboutImageTwo },
  };
}

function toHeroDrafts(content: SiteContent): DraftSlide[] {
  const slides = content.heroSlides.length ? content.heroSlides : DEFAULT_HERO_SLIDES;
  return slides.map((slide) => ({ ...slide }));
}

function ImageSlot({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: DraftImage;
  onChange: (draft: DraftImage) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-base">{label}</Label>
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-secondary">
        <ImageWithFallback src={value.url} alt={label} className="h-full w-full object-cover" />
        {value.file && (
          <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
            se subirá al guardar
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange({ url: URL.createObjectURL(file), file });
          e.target.value = "";
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          <ImagePlus className="h-3.5 w-3.5" /> Subir imagen
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!value.url}
          onClick={() => onChange({ url: "" })}
        >
          <X className="h-3.5 w-3.5" /> Quitar
        </Button>
      </div>

      <Input
        value={value.file ? "" : value.url}
        onChange={(e) => onChange({ url: e.target.value })}
        placeholder={value.file ? "Archivo pendiente de subir" : "https://... (o sube un archivo)"}
        disabled={Boolean(value.file)}
      />
    </div>
  );
}

function HeroImageList({
  items,
  onChange,
}: {
  items: DraftSlide[];
  onChange: (items: DraftSlide[]) => void;
}) {
  const addInputRef = useRef<HTMLInputElement>(null);

  const updateAt = (index: number, patch: Partial<DraftSlide>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const removeAt = (index: number) => {
    const target = items[index];
    if (target?.file) URL.revokeObjectURL(target.url);
    onChange(items.filter((_, i) => i !== index));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base">Carrusel del inicio</Label>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Estas imágenes se deslizan en la portada. Usa las flechas para ordenarlas: la primera es
          la que se ve al entrar. En cada foto elige cómo se muestra: <strong>Completa</strong> la
          ajusta entera sin recortar (ideal para fotos muy verticales) y <strong>Rellenar</strong>
          ocupa todo el panel aunque recorte los bordes.
        </p>
      </div>

      {items.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No hay imágenes. Agrega al menos una para el carrusel.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <div key={`hero-${index}`} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider2 text-muted-foreground">
                Slide {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label={`Mover slide ${index + 1} a la izquierda`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label={`Mover slide ${index + 1} a la derecha`}
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  aria-label={`Quitar slide ${index + 1}`}
                  onClick={() => removeAt(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-secondary">
              <ImageWithFallback
                src={item.url}
                alt={`Slide ${index + 1} del carrusel`}
                className={`h-full w-full ${fitClass(item.fit)} ${positionClass(item.position)}`}
              />
              {item.file && (
                <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  se subirá al guardar
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider2 text-muted-foreground">
                Tamaño en el carrusel
              </Label>
              <Select
                value={item.fit}
                onValueChange={(value) => updateAt(index, { fit: value as HeroSlideFit })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contain">Completa (sin recortar)</SelectItem>
                  <SelectItem value="cover">Rellenar el panel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider2 text-muted-foreground">
                Encuadre
              </Label>
              <Select
                value={item.position}
                disabled={item.fit === "contain"}
                onValueChange={(value) => updateAt(index, { position: value as HeroSlidePosition })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="top">Arriba</SelectItem>
                  <SelectItem value="bottom">Abajo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      <input
        ref={addInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) {
            onChange([
              ...items,
              ...files.map((file) => ({
                url: URL.createObjectURL(file),
                file,
                fit: "contain" as const,
                position: "center" as const,
              })),
            ]);
          }
          e.target.value = "";
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => addInputRef.current?.click()}>
          <Plus className="h-3.5 w-3.5" /> Agregar imágenes
        </Button>
      </div>
    </div>
  );
}

export function ContentManager() {
  const [heroDrafts, setHeroDrafts] = useState<DraftSlide[]>(() =>
    toHeroDrafts(DEFAULT_SITE_CONTENT)
  );
  const [aboutDrafts, setAboutDrafts] = useState<Record<AboutSlotKey, DraftImage>>(() =>
    toAboutDrafts(DEFAULT_SITE_CONTENT)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getSiteContent()
      .then((content) => {
        if (!active) return;
        setHeroDrafts(toHeroDrafts(content));
        setAboutDrafts(toAboutDrafts(content));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateAbout = (key: AboutSlotKey) => (draft: DraftImage) =>
    setAboutDrafts((current) => ({ ...current, [key]: draft }));

  const save = async () => {
    if (!db) {
      toast.error("Firebase no está configurado.");
      return;
    }
    setSaving(true);
    try {
      const resolve = async (draft: DraftImage, fallback: string) => {
        if (draft.file) {
          const url = await uploadToR2(draft.file, "site");
          URL.revokeObjectURL(draft.url);
          return url;
        }
        return draft.url.trim() || fallback;
      };

      const heroSlides: HeroSlide[] = [];
      for (const draft of heroDrafts) {
        const url = await resolve(draft, "");
        if (url) heroSlides.push({ url, fit: draft.fit, position: draft.position });
      }
      const finalSlides = heroSlides.length ? heroSlides : DEFAULT_HERO_SLIDES;

      const payload: SiteContent = {
        heroImage: finalSlides[0].url,
        heroImages: finalSlides.map((slide) => slide.url),
        heroSlides: finalSlides,
        aboutImageOne: await resolve(
          aboutDrafts.aboutImageOne,
          DEFAULT_SITE_CONTENT.aboutImageOne
        ),
        aboutImageTwo: await resolve(
          aboutDrafts.aboutImageTwo,
          DEFAULT_SITE_CONTENT.aboutImageTwo
        ),
      };

      await setDoc(
        doc(db, "settings", "site"),
        { ...payload, updatedAt: new Date().toISOString() },
        { merge: true }
      );

      setHeroDrafts(toHeroDrafts(payload));
      setAboutDrafts(toAboutDrafts(payload));
      toast.success("Contenido del sitio actualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el contenido.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Imágenes del sitio</CardTitle>
        <CardDescription>
          Administra el carrusel del inicio y las fotos de Nosotros. Las imágenes nuevas se suben a
          Cloudflare R2 al guardar. Las anteriores se conservan en R2 por si quieres volver a usarlas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando contenido…</p>
        ) : (
          <>
            <HeroImageList items={heroDrafts} onChange={setHeroDrafts} />

            <div className="grid gap-8 border-t pt-8 md:grid-cols-2">
              {ABOUT_SLOTS.map((slot) => (
                <ImageSlot
                  key={slot.key}
                  label={slot.label}
                  hint={slot.hint}
                  value={aboutDrafts[slot.key]}
                  onChange={updateAbout(slot.key)}
                />
              ))}
            </div>
          </>
        )}

        <Button onClick={save} disabled={saving || loading} className="w-full">
          <Save className="h-4 w-4" />
          {saving ? "Guardando…" : "Guardar imágenes del sitio"}
        </Button>
      </CardContent>
    </Card>
  );
}

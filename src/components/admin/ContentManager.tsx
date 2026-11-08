import { useEffect, useRef, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { ImagePlus, Save, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { uploadToR2 } from "@/lib/upload";
import {
  DEFAULT_SITE_CONTENT,
  getSiteContent,
  type SiteContent,
} from "@/lib/site-content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageWithFallback } from "@/components/shop/ImageWithFallback";

type SlotKey = "heroImage" | "aboutImageOne" | "aboutImageTwo";

interface DraftImage {
  url: string;
  file?: File;
}

const SLOTS: { key: SlotKey; label: string; hint: string }[] = [
  {
    key: "heroImage",
    label: "Hero del inicio",
    hint: "Imagen grande de la portada (recomendado 1400 px de ancho, vertical).",
  },
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

function toDrafts(content: SiteContent): Record<SlotKey, DraftImage> {
  return {
    heroImage: { url: content.heroImage },
    aboutImageOne: { url: content.aboutImageOne },
    aboutImageTwo: { url: content.aboutImageTwo },
  };
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

export function ContentManager() {
  const [drafts, setDrafts] = useState<Record<SlotKey, DraftImage>>(() =>
    toDrafts(DEFAULT_SITE_CONTENT)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getSiteContent()
      .then((content) => {
        if (active) setDrafts(toDrafts(content));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const update = (key: SlotKey) => (draft: DraftImage) =>
    setDrafts((current) => ({ ...current, [key]: draft }));

  const save = async () => {
    if (!db) {
      toast.error("Firebase no está configurado.");
      return;
    }
    setSaving(true);
    try {
      const payload: SiteContent = {
        heroImage: DEFAULT_SITE_CONTENT.heroImage,
        aboutImageOne: DEFAULT_SITE_CONTENT.aboutImageOne,
        aboutImageTwo: DEFAULT_SITE_CONTENT.aboutImageTwo,
      };

      for (const slot of SLOTS) {
        const draft = drafts[slot.key];
        if (draft.file) {
          payload[slot.key] = await uploadToR2(draft.file, "site");
          URL.revokeObjectURL(draft.url);
        } else {
          payload[slot.key] = draft.url.trim() || DEFAULT_SITE_CONTENT[slot.key];
        }
      }

      await setDoc(
        doc(db, "settings", "site"),
        { ...payload, updatedAt: new Date().toISOString() },
        { merge: true }
      );

      setDrafts(toDrafts(payload));
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
          Reemplaza el hero del inicio y las fotos de Nosotros. Las imágenes nuevas se suben a
          Cloudflare R2 al guardar. Las anteriores se conservan en R2 por si quieres volver a usarlas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando contenido…</p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            <div className="md:col-span-2">
              <ImageSlot
                label={SLOTS[0].label}
                hint={SLOTS[0].hint}
                value={drafts.heroImage}
                onChange={update("heroImage")}
              />
            </div>
            <ImageSlot
              label={SLOTS[1].label}
              hint={SLOTS[1].hint}
              value={drafts.aboutImageOne}
              onChange={update("aboutImageOne")}
            />
            <ImageSlot
              label={SLOTS[2].label}
              hint={SLOTS[2].hint}
              value={drafts.aboutImageTwo}
              onChange={update("aboutImageTwo")}
            />
          </div>
        )}

        <Button onClick={save} disabled={saving || loading} className="w-full">
          <Save className="h-4 w-4" />
          {saving ? "Guardando…" : "Guardar imágenes del sitio"}
        </Button>
      </CardContent>
    </Card>
  );
}

import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { BookOpen, Eye, EyeOff, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/firebase";
import { deleteGuide, saveGuide, slugifyGuide, subscribeGuides } from "@/lib/guides";
import { getSiteContent } from "@/lib/site-content";
import { usePagination } from "@/lib/use-pagination";
import { isUploadConfigured, uploadToR2 } from "@/lib/upload";
import type { Guide } from "@/types/guide";

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  published: boolean;
};

const EMPTY: FormState = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  published: false,
};

export function GuidesManager() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [editing, setEditing] = useState<Guide | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [guidesVisible, setGuidesVisible] = useState(true);
  const [savingVisibility, setSavingVisibility] = useState(false);

  useEffect(() => subscribeGuides(setGuides, true), []);

  useEffect(() => {
    getSiteContent().then((content) => setGuidesVisible(content.guidesEnabled));
  }, []);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview("");
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const pagination = usePagination(guides, { pageSize: 10 });

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setCoverFile(null);
    setCreating(true);
  };

  const startEdit = (guide: Guide) => {
    setCreating(false);
    setEditing(guide);
    setForm({
      title: guide.title,
      slug: guide.slug || guide.id,
      excerpt: guide.excerpt || "",
      content: guide.content || "",
      coverImage: guide.coverImage || "",
      published: guide.published,
    });
    setCoverFile(null);
  };

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
    setForm(EMPTY);
    setCoverFile(null);
  };

  const onSave = async () => {
    if (form.title.trim().length < 3) {
      toast.error("Escribe un título para la guía.");
      return;
    }
    if (form.excerpt.trim().length < 10) {
      toast.error("Escribe un resumen/extracto breve.");
      return;
    }
    if (form.content.replace(/<[^>]*>/g, "").trim().length < 20) {
      toast.error("Escribe el contenido de la guía.");
      return;
    }
    try {
      setSaving(true);
      let coverImage = form.coverImage.trim();
      if (coverFile) {
        if (!isUploadConfigured()) throw new Error("Las subidas a R2 no están configuradas.");
        coverImage = await uploadToR2(coverFile, "guides");
      }
      const id = await saveGuide(
        {
          title: form.title,
          slug: form.slug || slugifyGuide(form.title),
          excerpt: form.excerpt,
          content: form.content,
          coverImage,
          published: form.published,
        },
        editing?.id
      );
      toast.success(editing ? "Guía actualizada." : "Guía creada.");
      if (!editing) setEditing({ ...(editing as any), id } as Guide);
      closeForm();
      setCreating(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la guía.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (guide: Guide) => {
    const result = await Swal.fire({
      title: "¿Eliminar guía?",
      text: `Se eliminará "${guide.title}". Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#b42318",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteGuide(guide.id);
      toast.success("Guía eliminada.");
      if (editing?.id === guide.id) closeForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la guía.");
    }
  };

  const toggleGuidesVisibility = async () => {
    if (!db) {
      toast.error("Firebase no está configurado.");
      return;
    }
    const next = !guidesVisible;
    try {
      setSavingVisibility(true);
      await setDoc(doc(db, "settings", "site"), { guidesEnabled: next }, { merge: true });
      setGuidesVisible(next);
      toast.success(next ? "Guías visibles en el menú." : "Guías ocultas del menú.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la visibilidad.");
    } finally {
      setSavingVisibility(false);
    }
  };

  const showForm = creating || Boolean(editing);
  const slugPreview = slugifyGuide(form.slug || form.title);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle className="text-base">Visibilidad en el sitio</CardTitle>
            <CardDescription>
              Muestra u oculta el enlace “Guías” en el menú de navegación.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant={guidesVisible ? "outline" : "secondary"}
            onClick={() => void toggleGuidesVisibility()}
            disabled={savingVisibility}
          >
            {guidesVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {savingVisibility
              ? "Guardando…"
              : guidesVisible
                ? "Visible en el menú"
                : "Oculta del menú"}
          </Button>
        </CardHeader>
      </Card>
      {showForm ? (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{editing ? "Editar guía" : "Nueva guía"}</CardTitle>
                <CardDescription>
                  Crea contenido tipo blog/guía para SEO (ej.: cómo elegir calza, guía de tallas, outfits).
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={closeForm}>
                <X className="h-4 w-4" /> Cerrar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="g-title">Título *</Label>
                <Input id="g-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="g-slug">Slug / URL</Label>
                <Input id="g-slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder={slugPreview || "se-genera-desde-el-titulo"} className="mt-1" />
                <p className="mt-1 text-[11px] text-muted-foreground">URL: /guias/{slugPreview || "..."}</p>
              </div>
              <div className="flex items-end gap-2 pb-1">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.published} onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))} />
                  Publicada (visible en el sitio)
                </label>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="g-excerpt">Resumen / extracto *</Label>
                <Textarea id="g-excerpt" value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} rows={2} className="mt-1" placeholder="Breve descripción para listado y SEO (meta description)." />
              </div>
              <div className="sm:col-span-2">
                <Label>Contenido *</Label>
                <div className="mt-1">
                  <RichTextEditor value={form.content} onChange={(content) => setForm((f) => ({ ...f, content }))} placeholder="Escribe la guía…" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label>Imagen de portada</Label>
                <div className="mt-2 flex flex-wrap items-start gap-3">
                  {(coverPreview || form.coverImage) && (
                    <img src={coverPreview || form.coverImage} alt="" className="h-24 w-40 rounded-md border object-cover" />
                  )}
                  <div className="space-y-2">
                    <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
                    <Input value={form.coverImage} onChange={(e) => setForm((f) => ({ ...f, coverImage: e.target.value }))} placeholder="o URL de imagen" />
                    {form.coverImage && !coverFile && (
                      <Button type="button" variant="outline" size="sm" onClick={() => setForm((f) => ({ ...f, coverImage: "" }))}>Quitar imagen</Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-3">
              <Button variant="ghost" onClick={closeForm} disabled={saving}>Cancelar</Button>
              <Button onClick={() => void onSave()} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar guía"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end">
          <Button onClick={startCreate}><Plus className="h-4 w-4" /> Nueva guía</Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> Guías / Blog</CardTitle>
          <CardDescription>Artículos publicados y borradores para contenido SEO del sitio.</CardDescription>
        </CardHeader>
        <CardContent>
          {guides.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Aún no hay guías. Crea la primera para empezar con contenido SEO.
            </p>
          ) : (
            <div className="space-y-3">
              {pagination.pageItems.map((guide) => (
                <div key={guide.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md border bg-secondary">
                    {guide.coverImage ? <img src={guide.coverImage} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{guide.title}</p>
                      {guide.published ? (
                        <Badge className="gap-1"><Eye className="h-3 w-3" /> Publicada</Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1"><EyeOff className="h-3 w-3" /> Borrador</Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">/guias/{guide.slug || guide.id}</p>
                    {guide.excerpt && <p className="line-clamp-1 text-xs text-muted-foreground">{guide.excerpt}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="Editar" onClick={() => startEdit(guide)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" title="Eliminar" onClick={() => void onDelete(guide)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
} from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import Swal from "sweetalert2";
import {
  AlertCircle,
  Eye,
  ImagePlus,
  LayoutDashboard,
  Link2,
  LogOut,
  Package,
  Pencil,
  Plus,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";
import { deleteFromR2, isUploadConfigured, slugify, uploadToR2 } from "@/lib/upload";
import { normalizeProduct, seedDemoProducts } from "@/lib/catalog";
import { totalStock } from "@/lib/stock";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import { formatCLP } from "@/lib/utils";
import type { Product, ProductColor } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Tab = "dashboard" | "nuevo" | "productos";

const ADMIN_EMAILS = ((import.meta.env.VITE_ADMIN_EMAILS as string) || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "Único"];

/* ------------------------------ Sin configurar ------------------------------ */

function SetupNotice() {
  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-16">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-secondary">
            <AlertCircle className="h-5 w-5" />
          </div>
          <CardTitle>Panel en modo demostración</CardTitle>
          <CardDescription>
            La tienda está funcionando con el catálogo de ejemplo. Para administrar productos
            reales, conecta Firebase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Crea un archivo <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">.env</code> en la raíz del proyecto con:</p>
          <pre className="overflow-x-auto rounded-lg bg-secondary p-4 text-xs leading-relaxed text-foreground">
{`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ADMIN_EMAILS=admin@luneactivewear.cl`}
          </pre>
          <p>
            Para subir imágenes a Cloudflare R2 agrega también{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">VITE_R2_WORKER_URL</code> y{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">VITE_UPLOAD_TOKEN</code>.
          </p>
          <Button asChild className="w-full">
            <Link to="/tienda">
              <Eye className="h-4 w-4" /> Ver la tienda
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------ Login ------------------------------ */

function LoginForm({ firebaseAuth }: { firebaseAuth: Auth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch {
      setError("Credenciales incorrectas o usuario sin permisos.");
    }
  };

  return (
    <div className="container flex min-h-[75vh] items-center justify-center py-16">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <span className="mx-auto pl-[0.35em] font-display text-2xl font-semibold tracking-[0.35em]">
            LUNÉ
          </span>
          <CardTitle className="mt-4 text-xl">Acceso administrador</CardTitle>
          <CardDescription>Gestiona el catálogo de la tienda.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full">Entrar</Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-wider2 text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> o <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              signInWithPopup(firebaseAuth, new GoogleAuthProvider()).catch(() =>
                setError("No se pudo iniciar sesión con Google.")
              )
            }
          >
            Entrar con Google
          </Button>

          <Link
            to="/"
            className="mt-5 block text-center text-[10px] uppercase tracking-wider2 text-muted-foreground underline-offset-4 hover:underline"
          >
            Volver a la tienda
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------ Formulario ------------------------------ */

interface DraftImage {
  id: string;
  url: string;
  file?: File;
}

function ProductForm({ editing }: { editing: Product | null }) {
  const [form, setForm] = useState(() => ({
    name: editing?.name ?? "",
    category: editing?.category ?? CATEGORIES[0].id,
    price: editing ? String(editing.price) : "",
    compareAtPrice: editing?.compareAtPrice ? String(editing.compareAtPrice) : "",
    description: editing?.description ?? "",
    composition: editing?.composition ?? "",
    care: editing?.care ?? "",
    shipping:
      editing?.shipping ?? "Despacho a todo Chile en 2 a 5 días hábiles. Retiro gratis en Chillán.",
    featured: editing?.featured ?? false,
    isNew: editing?.isNew ?? false,
  }));

  const [sizes, setSizes] = useState<string[]>(
    editing?.sizes?.length ? editing.sizes : ["S", "M", "L"]
  );
  const [stockBySize, setStockBySize] = useState<Record<string, number>>(() => {
    const initialSizes = editing?.sizes?.length ? editing.sizes : ["S", "M", "L"];
    return Object.fromEntries(
      initialSizes.map((size) => [size, editing?.stockBySize?.[size] ?? 5])
    );
  });
  const [colors, setColors] = useState<ProductColor[]>(
    editing?.colors?.length ? editing.colors : [{ name: "Chocolate", hex: "#49372D" }]
  );
  const [images, setImages] = useState<DraftImage[]>(
    editing ? editing.images.map((url) => ({ id: url, url })) : []
  );
  const [urlInput, setUrlInput] = useState("");
  const [status, setStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm({ ...form, [key]: e.target.value });

  const toggleSize = (size: string) => {
    setSizes((current) =>
      current.includes(size) ? current.filter((s) => s !== size) : [...current, size]
    );
    setStockBySize((current) =>
      current[size] === undefined ? { ...current, [size]: 5 } : current
    );
  };

  const setStock = (size: string, value: string) =>
    setStockBySize((current) => ({
      ...current,
      [size]: Math.max(0, Math.floor(Number(value) || 0)),
    }));

  const updateColor = (index: number, patch: Partial<ProductColor>) =>
    setColors((current) => current.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  const removeColor = (index: number) =>
    setColors((current) => current.filter((_, i) => i !== index));

  const addColor = () => setColors((current) => [...current, { name: "", hex: "#B9A99C" }]);

  const handlePickFiles = (files: File[]) => {
    if (!files.length) return;
    const drafts: DraftImage[] = files.map((file) => ({
      id: `f${Math.random().toString(36).slice(2)}`,
      url: URL.createObjectURL(file),
      file,
    }));
    setImages((current) => [...current, ...drafts]);
  };

  const removeImage = (id: string) =>
    setImages((current) => {
      const image = current.find((i) => i.id === id);
      if (image?.file) URL.revokeObjectURL(image.url);
      return current.filter((i) => i.id !== id);
    });

  const addUrls = () => {
    const urls = urlInput
      .split(/[\n,]/)
      .map((u) => u.trim())
      .filter((u) => /^https?:\/\//.test(u));
    if (!urls.length) {
      setUrlInput("");
      return;
    }
    setImages((current) => {
      const existing = new Set(current.map((i) => i.url));
      const next = urls
        .filter((u) => !existing.has(u))
        .map((url) => ({ id: url, url }));
      return [...current, ...next];
    });
    setUrlInput("");
    toast.success("Imágenes agregadas por URL.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    if (sizes.length === 0) {
      toast.error("Selecciona al menos una talla.");
      return;
    }
    if (!db) {
      toast.error("Firebase no está configurado.");
      return;
    }

    const slug = slugify(name);
    setStatus("Subiendo imágenes…");

    try {
      const urls: string[] = [];
      for (const image of images) {
        if (image.file) {
          urls.push(await uploadToR2(image.file, `products/${slug}`));
        } else {
          urls.push(image.url);
        }
      }

      const payload = {
        name,
        category: form.category,
        price: Number(form.price) || 0,
        ...(form.compareAtPrice ? { compareAtPrice: Number(form.compareAtPrice) } : {}),
        description: form.description,
        composition: form.composition,
        care: form.care,
        shipping: form.shipping,
        sizes,
        stockBySize: Object.fromEntries(
          sizes.map((size) => [size, Math.max(0, Math.floor(stockBySize[size] ?? 0))])
        ),
        colors: colors.filter((c) => c.name.trim()),
        images: urls,
        featured: form.featured,
        isNew: form.isNew,
        updatedAt: new Date().toISOString(),
      };

      if (editing) {
        await updateDoc(doc(db, "products", editing.id), payload);
        const removed = editing.images.filter((url) => !urls.includes(url));
        for (const url of removed) {
          try {
            await deleteFromR2(url);
          } catch {
            /* best effort */
          }
        }
        toast.success("Producto actualizado correctamente.");
      } else {
        await addDoc(collection(db, "products"), {
          ...payload,
          createdAt: new Date().toISOString(),
        });
        toast.success("Producto publicado correctamente.");
        setImages([]);
        setColors([{ name: "Chocolate", hex: "#49372D" }]);
        setSizes(["S", "M", "L"]);
        setStockBySize({ S: 5, M: 5, L: 5 });
        setForm({
          name: "",
          category: CATEGORIES[0].id,
          price: "",
          compareAtPrice: "",
          description: "",
          composition: "",
          care: "",
          shipping: "Despacho a todo Chile en 2 a 5 días hábiles. Retiro gratis en Chillán.",
          featured: false,
          isNew: false,
        });
      }
      setStatus("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      setStatus(`Error: ${message}`);
      toast.error(message);
    }
  };

  const pendingFiles = images.filter((i) => i.file).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editing ? `Editar: ${editing.name}` : "Nuevo producto"}</CardTitle>
        <CardDescription>
          Completa la información de la prenda. Las imágenes se suben a Cloudflare R2 al guardar
          {pendingFiles > 0 ? ` (${pendingFiles} pendiente${pendingFiles === 1 ? "" : "s"})` : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nombre del producto *</Label>
              <Input value={form.name} onChange={set("name")} required placeholder="Calza Flare" />
              {form.name.trim() && (
                <p className="text-[11px] text-muted-foreground">Carpeta R2: products/{slugify(form.name)}/</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Precio (CLP) *</Label>
                <Input type="number" value={form.price} onChange={set("price")} required min={0} />
              </div>
              <div className="space-y-2">
                <Label>Precio anterior</Label>
                <Input
                  type="number"
                  value={form.compareAtPrice}
                  onChange={set("compareAtPrice")}
                  min={0}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Descripción *</Label>
              <Textarea value={form.description} onChange={set("description")} required rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Composición</Label>
              <Textarea value={form.composition} onChange={set("composition")} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Cuidado de la prenda</Label>
              <Textarea value={form.care} onChange={set("care")} rows={2} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Envíos y devoluciones</Label>
              <Textarea value={form.shipping} onChange={set("shipping")} rows={2} />
            </div>
          </div>

          {/* Tallas y stock */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-base">Tallas disponibles *</Label>
              <span className="text-[11px] text-muted-foreground">
                Cantidad por talla · 0 = agotada
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`min-w-12 rounded-md border px-3 py-2 text-xs transition ${
                    sizes.includes(size)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input hover:border-primary"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            {sizes.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {SIZE_OPTIONS.filter((size) => sizes.includes(size)).map((size) => (
                  <div key={size} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Talla {size}</Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={stockBySize[size] ?? 0}
                      onChange={(e) => setStock(size, e.target.value)}
                      aria-label={`Cantidad disponible talla ${size}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Colores */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-base">Colores</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addColor}>
                <Plus className="h-3.5 w-3.5" /> Agregar color
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {colors.map((color, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color.hex}
                    onChange={(e) => updateColor(index, { hex: e.target.value })}
                    className="h-10 w-12 cursor-pointer rounded-md border border-input bg-card p-1"
                    aria-label={`Color ${index + 1}`}
                  />
                  <Input
                    value={color.name}
                    onChange={(e) => updateColor(index, { name: e.target.value })}
                    placeholder="Nombre del color (Chocolate)"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeColor(index)}
                    aria-label="Quitar color"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Imágenes */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-base">Imágenes</Label>
              <span className="text-[11px] text-muted-foreground">{images.length} imagen(es)</span>
            </div>

            <div className="mt-3 rounded-lg border border-dashed p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  handlePickFiles(e.target.files ? [...e.target.files] : []);
                  e.target.value = "";
                }}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Subir imágenes</p>
                  <p className="text-xs text-muted-foreground">
                    {isUploadConfigured()
                      ? "Se subirán a R2 al guardar el producto."
                      : "R2 no está configurado: puedes pegar URLs de imágenes."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4" /> Seleccionar archivos
                </Button>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://... (una URL por línea)"
                />
                <Button type="button" variant="outline" onClick={addUrls}>
                  <Link2 className="h-4 w-4" /> Agregar URL
                </Button>
              </div>
            </div>

            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {images.map((image) => (
                  <div key={image.id} className="group relative">
                    <img
                      src={image.url}
                      alt=""
                      className="h-24 w-full rounded-md border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow"
                      aria-label="Quitar imagen"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {image.file && (
                      <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[9px] text-white">
                        nueva
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              Destacado en inicio
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isNew}
                onChange={(e) => setForm({ ...form, isNew: e.target.checked })}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              Marcar como nuevo
            </label>
          </div>

          <Button type="submit" className="w-full">
            <UploadCloud className="h-4 w-4" />
            {editing ? "Guardar cambios" : "Publicar producto"}
          </Button>
          {status && <p className="text-center text-sm text-muted-foreground">{status}</p>}
        </form>
      </CardContent>
    </Card>
  );
}

/* ------------------------------ Menú ------------------------------ */

const MENU: { tab: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { tab: "dashboard", label: "Resumen", icon: LayoutDashboard },
  { tab: "nuevo", label: "Nuevo producto", icon: Plus },
  { tab: "productos", label: "Productos", icon: Package },
];

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const currentAuth = auth;
    if (!currentAuth) return;
    return onAuthStateChanged(currentAuth, (user) => {
      const allowed = Boolean(user?.email && ADMIN_EMAILS.includes(user.email));
      setIsAdmin(allowed);
      if (user?.email && !ADMIN_EMAILS.includes(user.email)) {
        void signOut(currentAuth);
      }
    });
  }, []);

  useEffect(() => {
    if (!isAdmin || !db) return;
    return onSnapshot(collection(db, "products"), (snap) => {
      setProducts(
        snap.docs
          .map((d) => normalizeProduct(d.id, d.data()))
          .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      );
    });
  }, [isAdmin]);

  const stats = useMemo(() => {
    const value = products.reduce((sum, p) => sum + (p.price || 0), 0);
    return {
      count: products.length,
      featured: products.filter((p) => p.featured).length,
      stock: products.reduce((sum, product) => sum + totalStock(product), 0),
      value,
    };
  }, [products]);

  if (!isFirebaseConfigured || !auth) return <SetupNotice />;

  if (isAdmin === null) {
    return <p className="py-20 text-center text-sm text-muted-foreground">Cargando…</p>;
  }

  if (!isAdmin) return <LoginForm firebaseAuth={auth} />;

  const firebaseAuth = auth;

  const toggleFeatured = async (product: Product) => {
    if (!db) return;
    await updateDoc(doc(db, "products", product.id), { featured: !product.featured });
    toast.success(product.featured ? "Quitado de destacados." : "Marcado como destacado.");
  };

  const remove = async (product: Product) => {    if (!db) return;
    const result = await Swal.fire({
      title: "¿Eliminar producto?",
      text: `Se eliminará "${product.name}" junto con sus imágenes de R2. Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#8f3f38",
    });
    if (!result.isConfirmed) return;

    try {
      await deleteDoc(doc(db, "products", product.id));
      for (const url of product.images) {
        try {
          await deleteFromR2(url);
        } catch {
          /* best effort */
        }
      }
      toast.success("Producto eliminado.");
    } catch {
      toast.error("No se pudo eliminar el producto.");
    }
  };

  const importDemo = async () => {
    if (!db) return;
    const result = await Swal.fire({
      title: "¿Importar catálogo de ejemplo?",
      text: "Se crearán los productos de demostración en Firestore para que puedas editarlos, cambiarles las fotos y ajustar precios.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, importar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#49372D",
    });
    if (!result.isConfirmed) return;

    setSeeding(true);
    try {
      const total = await seedDemoProducts();
      toast.success(`${total} productos importados al catálogo.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo importar el catálogo.");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="container flex min-h-[80vh] flex-col gap-6 py-8 md:flex-row md:py-10">
      <aside className="md:w-60 md:shrink-0">
        <div className="flex flex-col gap-1 rounded-xl border bg-card p-3 md:sticky md:top-24">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-[10px] uppercase tracking-brand text-muted-foreground">Panel</span>
            <Button variant="ghost" size="icon" onClick={() => signOut(firebaseAuth)} title="Cerrar sesión">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          {MENU.map((item) => (
            <Button
              key={item.tab}
              variant={tab === item.tab ? "secondary" : "ghost"}
              className="justify-start normal-case tracking-normal"
              onClick={() => {
                setTab(item.tab);
                if (item.tab !== "nuevo") setEditing(null);
              }}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
              {item.tab === "productos" && products.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">{products.length}</span>
              )}
            </Button>
          ))}
          <Link
            to="/"
            className="mt-2 flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground transition hover:bg-secondary"
          >
            <Eye className="h-4 w-4" /> Ver tienda
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-brand text-muted-foreground">Administración</p>
            <h1 className="mt-1 font-display text-3xl font-medium tracking-tight">Catálogo</h1>
          </div>
          {firebaseAuth.currentUser?.email && (
            <p className="text-xs text-muted-foreground">{firebaseAuth.currentUser.email}</p>
          )}
        </div>

        {tab === "dashboard" && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-3xl">{stats.count}</CardTitle>
                  <CardDescription>Productos publicados</CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-3xl">{stats.stock}</CardTitle>
                  <CardDescription>Unidades en stock</CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-3xl">{stats.featured}</CardTitle>
                  <CardDescription>Destacados en inicio</CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">{formatCLP(stats.value)}</CardTitle>
                  <CardDescription>Valor total del catálogo</CardDescription>
                </CardHeader>
              </Card>
            </div>

            {products.length === 0 && (
              <Card className="border-primary/25 bg-secondary/40">
                <CardHeader>
                  <CardTitle className="text-lg">Tu catálogo está vacío</CardTitle>
                  <CardDescription>
                    Importa el catálogo de ejemplo para tener una base editable, o crea tu primer
                    producto desde cero.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button onClick={importDemo} disabled={seeding}>
                    <UploadCloud className="h-4 w-4" />
                    {seeding ? "Importando…" : "Importar catálogo de ejemplo"}
                  </Button>
                  <Button variant="outline" onClick={() => setTab("nuevo")}>
                    <Plus className="h-4 w-4" /> Crear producto
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Acciones rápidas</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button onClick={() => setTab("nuevo")}>
                  <Plus className="h-4 w-4" /> Crear producto
                </Button>
                <Button variant="outline" onClick={() => setTab("productos")}>
                  <Package className="h-4 w-4" /> Gestionar catálogo
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {tab === "nuevo" && <ProductForm editing={editing} />}

        {tab === "productos" && (
          <>
            {editing ? (
              <div className="space-y-4">
                <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
                  ← Volver a la lista
                </Button>
                <ProductForm editing={editing} />
              </div>
            ) : products.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
                  <p>Aún no hay productos publicados.</p>
                  <Button onClick={() => setTab("nuevo")}>
                    <Plus className="h-4 w-4" /> Crear el primero
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {products.map((product) => (
                  <Card key={product.id}>
                    <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
                      <div className="h-16 w-14 shrink-0 overflow-hidden rounded-md border bg-secondary">
                        {product.images[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-display font-medium">{product.name}</p>
                          {product.featured && (
                            <Badge variant="secondary">
                              <Star className="h-3 w-3" /> Destacado
                            </Badge>
                          )}
                          {product.isNew && <Badge variant="accent">Nuevo</Badge>}
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {categoryLabel(product.category)} · {formatCLP(product.price)} ·{" "}
                          {product.sizes.join(" / ") || "sin tallas"} · {product.images.length} imágenes
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          Stock:{" "}
                          {product.sizes.length > 0
                            ? product.sizes
                                .map((size) => `${size} ${product.stockBySize?.[size] ?? "—"}`)
                                .join(" · ")
                            : "sin tallas"}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Destacar"
                          onClick={() => toggleFeatured(product)}
                        >
                          <Star
                            className={
                              product.featured ? "h-4 w-4 fill-primary text-primary" : "h-4 w-4"
                            }
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Editar"
                          onClick={() => {
                            setEditing(product);
                            setTab("nuevo");
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Eliminar"
                          onClick={() => remove(product)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

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
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { toast } from "sonner";
import Swal from "sweetalert2";
import {
  AlertCircle,
  BarChart3,
  Boxes,
  ClipboardList,
  Eye,
  EyeOff,
  Hash,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Minus,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Settings,
  Star,
  Trash2,
  Truck,
  UploadCloud,
  X,
} from "lucide-react";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";
import { isAdminEmail } from "@/lib/admin";
import { AuthSettings } from "@/components/admin/AuthSettings";
import { ContentManager } from "@/components/admin/ContentManager";
import { InventoryPanel } from "@/components/admin/InventoryPanel";
import { OrdersManager } from "@/components/admin/OrdersManager";
import { SalesManager } from "@/components/admin/SalesManager";
import { ProductPreview } from "@/components/admin/ProductPreview";
import { ReviewsModeration } from "@/components/admin/ReviewsModeration";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { SuppliersManager } from "@/components/admin/SuppliersManager";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/lib/use-pagination";
import { deleteFromR2, isUploadConfigured, slugify, uploadToR2 } from "@/lib/upload";
import { normalizeProduct, seedDemoProducts } from "@/lib/catalog";
import { richTextToPlainText, sanitizeRichText } from "@/lib/rich-text";
import { defaultSizeGuide, resolveSizeGuide } from "@/lib/size-guide";
import { generateSku } from "@/lib/sku";
import { SIZE_OPTIONS } from "@/lib/sizes";
import { LAST_UNITS_THRESHOLD, totalStock } from "@/lib/stock";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import { formatCLP } from "@/lib/utils";
import { useSeo } from "@/lib/seo";
import type { Product, ProductColor, SizeGuideRow } from "@/types/product";
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

type Tab =
  | "dashboard"
  | "nuevo"
  | "productos"
  | "inventario"
  | "proveedores"
  | "ordenes"
  | "ventas"
  | "contenido"
  | "comentarios"
  | "ajustes";

/** Columnas editables de la guía de tallas: cada medida es un rango desde/hasta. */const SIZE_GUIDE_FIELDS = [  { label: "Busto", min: "bustMin", max: "bustMax" },
  { label: "Cintura", min: "waistMin", max: "waistMax" },
  { label: "Cadera", min: "hipMin", max: "hipMax" },
] as const;

/* ------------------------------ Stock por talla ------------------------------ */

const MAX_STOCK = 9999;

function clampStock(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_STOCK, Math.max(0, Math.floor(value)));
}

/**
 * Input de stock por talla: solo dígitos, botones − / +, selección al enfocar,
 * normaliza al salir (o con Enter) y deja vaciar el campo mientras se escribe.
 */
function StockInput({
  size,
  value,
  onChange,
}: {
  size: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);

  // Cambios externos (restaurar, cambiar de producto) solo si no se está editando.
  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const next = clampStock(Number(raw) || 0);
    setText(String(next));
    onChange(next);
  };

  const step = (delta: number) => {
    const next = clampStock(value + delta);
    setText(String(next));
    onChange(next);
  };

  return (
    <div
      className={`flex h-10 items-stretch overflow-hidden rounded-md border bg-background transition focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 ${
        value === 0 ? "border-destructive/40" : ""
      }`}
    >
      <button
        type="button"
        tabIndex={-1}
        onClick={() => step(-1)}
        disabled={value <= 0}
        aria-label={`Restar una unidad a la talla ${size}`}
        className="flex w-9 shrink-0 items-center justify-center text-muted-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        value={text}
        aria-label={`Cantidad disponible talla ${size}`}
        onFocus={(e) => {
          focused.current = true;
          const target = e.currentTarget;
          requestAnimationFrame(() => target.select());
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
          setText(raw);
          // Mientras se escribe se deja el campo vacío; al salir se normaliza a 0.
          if (raw !== "") onChange(clampStock(Number(raw)));
        }}
        onBlur={() => {
          focused.current = false;
          commit(text);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(text);
            e.currentTarget.blur();
          }
        }}
        className={`min-w-0 flex-1 border-x bg-transparent text-center text-sm tabular-nums outline-none ${
          value === 0 ? "text-destructive" : ""
        }`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => step(1)}
        aria-label={`Sumar una unidad a la talla ${size}`}
        className="flex w-9 shrink-0 items-center justify-center text-muted-foreground transition hover:bg-secondary"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

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
  /** Nombre del color al que se asocia la foto. Vacío = sin color. */
  color?: string;
}

function ProductForm({
  editing,
  takenSkus,
}: {
  editing: Product | null;
  takenSkus: string[];
}) {
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
    published: editing?.published ?? true,
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
    editing
      ? editing.images.map((url) => {
          const color = editing.imageColors?.[url] ?? "";
          return {
            id: url,
            url,
            // Si el color guardado ya no existe, se deja sin asignar.
            color: editing.colors?.some((c) => c.name === color) ? color : "",
          };
        })
      : []
  );
  const [sizeGuide, setSizeGuide] = useState<SizeGuideRow[]>(() =>
    editing ? resolveSizeGuide(editing) : defaultSizeGuide()
  );
  const [status, setStatus] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const publishIntentRef = useRef<boolean>(true);
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

  const setStock = (size: string, value: number) =>
    setStockBySize((current) => ({
      ...current,
      [size]: clampStock(value),
    }));

  const totalUnits = sizes.reduce((sum, size) => sum + (stockBySize[size] ?? 0), 0);

  const updateSizeGuide = (
    size: string,
    key: keyof Omit<SizeGuideRow, "size">,
    value: string
  ) =>
    setSizeGuide((current) =>
      current.map((row) =>
        row.size === size
          ? { ...row, [key]: Math.max(0, Math.floor(Number(value) || 0)) }
          : row
      )
    );

  const namedColors = colors.filter((c) => c.name.trim());
  /** Color por defecto para fotos nuevas: el primero de la lista. */
  const defaultImageColor = namedColors[0]?.name ?? "";

  const updateColor = (index: number, patch: Partial<ProductColor>) => {
    const target = colors[index];
    if (target && patch.name !== undefined && patch.name !== target.name) {
      // Mantiene la asociación de las fotos cuando se renombra el color.
      setImages((current) =>
        current.map((image) =>
          image.color === target.name ? { ...image, color: patch.name } : image
        )
      );
    }
    setColors((current) => current.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const removeColor = (index: number) => {
    const target = colors[index];
    if (target) {
      setImages((current) =>
        current.map((image) => (image.color === target.name ? { ...image, color: "" } : image))
      );
    }
    setColors((current) => current.filter((_, i) => i !== index));
  };

  const addColor = () => setColors((current) => [...current, { name: "", hex: "#B9A99C" }]);

  const updateImageColor = (id: string, color: string) =>
    setImages((current) => current.map((image) => (image.id === id ? { ...image, color } : image)));

  const handlePickFiles = (files: File[]) => {
    if (!files.length) return;
    const drafts: DraftImage[] = files.map((file) => ({
      id: `f${Math.random().toString(36).slice(2)}`,
      url: URL.createObjectURL(file),
      file,
      color: defaultImageColor,
    }));
    setImages((current) => [...current, ...drafts]);
  };

  const removeImage = (id: string) =>
    setImages((current) => {
      const image = current.find((i) => i.id === id);
      if (image?.file) URL.revokeObjectURL(image.url);
      return current.filter((i) => i.id !== id);
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    if (richTextToPlainText(form.description).length === 0) {
      toast.error("Escribe una descripción para el producto.");
      return;
    }
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
      const uploaded: { url: string; color?: string }[] = [];
      for (const image of images) {
        const url = image.file
          ? await uploadToR2(image.file, `products/${slug}`)
          : image.url;
        uploaded.push({ url, color: image.color?.trim() || undefined });
      }
      const urls = uploaded.map((image) => image.url);
      const imageColors = Object.fromEntries(
        uploaded
          .filter((image) => image.color)
          .map((image) => [image.url, image.color as string])
      );
      // El SKU se fija al crear y no cambia al editar; si un producto antiguo
      // no lo tiene, se genera en su primer guardado.
      const sku = editing?.sku?.trim() || generateSku(form.category, takenSkus);

      const payload = {
        name,
        sku,
        category: form.category,
        price: Number(form.price) || 0,
        ...(form.compareAtPrice ? { compareAtPrice: Number(form.compareAtPrice) } : {}),
        description: sanitizeRichText(form.description),
        composition: form.composition,
        care: form.care,
        shipping: form.shipping,
        sizes,
        stockBySize: Object.fromEntries(
          sizes.map((size) => [size, Math.max(0, Math.floor(stockBySize[size] ?? 0))])
        ),
        sizeGuide: sizeGuide.map((row) => ({
          size: row.size,
          bustMin: Math.max(0, Math.floor(row.bustMin || 0)),
          bustMax: Math.max(0, Math.floor(row.bustMax || 0)),
          waistMin: Math.max(0, Math.floor(row.waistMin || 0)),
          waistMax: Math.max(0, Math.floor(row.waistMax || 0)),
          hipMin: Math.max(0, Math.floor(row.hipMin || 0)),
          hipMax: Math.max(0, Math.floor(row.hipMax || 0)),
        })),
        colors: colors
          .map((c) => ({ ...c, name: c.name.trim() }))
          .filter((c) => c.name),
        images: urls,
        imageColors,
        featured: form.featured,
        isNew: form.isNew,
        published: publishIntentRef.current,
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
        // El ID del documento es el slug: mantiene URLs limpias (/producto/<slug>)
        // y permite que la Function del edge resuelva la ficha sin rebuild.
        const existing = await getDoc(doc(db, "products", slug));
        if (existing.exists()) {
          setStatus("");
          toast.error(
            `Ya existe un producto con el nombre "${name}". Edítalo o usa otro nombre.`
          );
          return;
        }
        await setDoc(doc(db, "products", slug), {
          ...payload,
          createdAt: new Date().toISOString(),
        });
        toast.success("Producto publicado correctamente.");
        setImages([]);
        setColors([{ name: "Chocolate", hex: "#49372D" }]);
        setSizes(["S", "M", "L"]);
        setStockBySize({ S: 5, M: 5, L: 5 });
        setSizeGuide(defaultSizeGuide());
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
          published: true,
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

  /** Borrador tal como quedará publicado: alimenta la vista previa. */
  const draft = useMemo<Product>(() => {
    const slug = slugify(form.name);
    return {
      id: editing?.id ?? (slug || "producto"),
      sku: editing?.sku,
      name: form.name.trim(),
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
      sizeGuide,
      colors: colors
        .map((color) => ({ ...color, name: color.name.trim() }))
        .filter((color) => color.name),
      images: images.map((image) => image.url),
      imageColors: Object.fromEntries(
        images
          .filter((image) => image.color?.trim())
          .map((image) => [image.url, image.color!.trim()])
      ),
      featured: form.featured,
      isNew: form.isNew,
      published: publishIntentRef.current,
    };
  }, [
    editing,
    form,
    sizes,
    stockBySize,
    sizeGuide,
    colors,
    images,
  ]);

  const previewUrl = `/producto/${editing?.id ?? (slugify(form.name) || "slug-del-producto")}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{editing ? `Editar: ${editing.name}` : "Nuevo producto"}</CardTitle>
            <CardDescription>
              Completa la información de la prenda. Las imágenes se suben a Cloudflare R2 al guardar
              {pendingFiles > 0 ? ` (${pendingFiles} pendiente${pendingFiles === 1 ? "" : "s"})` : ""}.
            </CardDescription>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              {editing?.sku ? (
                <>
                  <span>
                    SKU:{" "}
                    <span className="font-mono font-medium tracking-wide text-foreground">
                      {editing.sku}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="underline underline-offset-2 transition hover:text-foreground"
                    onClick={() => {
                      void navigator.clipboard?.writeText(editing.sku ?? "");
                      toast.success("SKU copiado.");
                    }}
                  >
                    Copiar
                  </button>
                </>
              ) : (
                <span>El SKU se genera automáticamente al guardar.</span>
              )}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreviewOpen(true)}
            className="shrink-0"
          >
            <Eye className="h-4 w-4" />
            Vista previa
          </Button>
        </div>
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
              <Label htmlFor="product-description">Descripción *</Label>
              <RichTextEditor
                id="product-description"
                value={form.description}
                onChange={(value) => setForm((current) => ({ ...current, description: value }))}
                placeholder="Describe la prenda, su calce, su tela y para qué ocasión la usarías…"
              />
              <p className="text-[11px] text-muted-foreground">
                Puedes usar negrita, cursiva, títulos, listas y enlaces. Se muestra en la ficha
                del producto.
              </p>
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
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {SIZE_OPTIONS.filter((size) => sizes.includes(size)).map((size) => {
                    const stock = stockBySize[size] ?? 0;
                    return (
                      <div key={size} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <Label className="text-xs text-muted-foreground">Talla {size}</Label>
                          {stock === 0 ? (
                            <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive">
                              Agotada
                            </span>
                          ) : stock <= LAST_UNITS_THRESHOLD ? (
                            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                              Bajo
                            </span>
                          ) : null}
                        </div>
                        <StockInput
                          size={size}
                          value={stock}
                          onChange={(value) => setStock(size, value)}
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Total: <span className="font-medium text-foreground">{totalUnits}</span>{" "}
                  {totalUnits === 1 ? "unidad" : "unidades"} en {sizes.length}{" "}
                  {sizes.length === 1 ? "talla" : "tallas"}. Escribe la cantidad o usa − / +.
                </p>
              </div>
            )}
          </div>

          {/* Guía de tallas */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-base">Guía de tallas</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSizeGuide(defaultSizeGuide())}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restaurar valores
              </Button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Medidas del cuerpo en cm. Se muestran en la ficha del producto; las tallas
              disponibles se destacan automáticamente. Si un producto no tiene valores propios,
              se usan estos por defecto.
            </p>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b text-[10px] uppercase tracking-wider2 text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Talla</th>
                    <th className="py-2 pr-3 font-medium">Busto (cm)</th>
                    <th className="py-2 pr-3 font-medium">Cintura (cm)</th>
                    <th className="py-2 font-medium">Cadera (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {sizeGuide.map((row) => (
                    <tr key={row.size} className="border-b border-primary/5 last:border-0">
                      <td className="py-1.5 pr-3 font-medium">{row.size}</td>
                      {SIZE_GUIDE_FIELDS.map((field) => (
                        <td key={field.label} className="py-1.5 pr-3 last:pr-0">
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              step={1}
                              value={row[field.min]}
                              onChange={(e) =>
                                updateSizeGuide(row.size, field.min, e.target.value)
                              }
                              aria-label={`${field.label} desde, talla ${row.size}`}
                              className="h-9 w-[4.5rem] px-2 text-center"
                              placeholder="80"
                            />
                            <span className="text-muted-foreground">–</span>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              step={1}
                              value={row[field.max]}
                              onChange={(e) =>
                                updateSizeGuide(row.size, field.max, e.target.value)
                              }
                              aria-label={`${field.label} hasta, talla ${row.size}`}
                              className="h-9 w-[4.5rem] px-2 text-center"
                              placeholder="84"
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                      : "R2 no está configurado: las fotos no se podrán subir hasta configurarlo."}
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
            </div>

            <p className="mt-2 text-[11px] text-muted-foreground">
              Asigna cada foto a un color: en la ficha, al elegir ese color se cargan solo sus
              fotos. Las fotos sin color se usan como respaldo si un color no tiene imágenes.
            </p>
            {namedColors.length === 0 && (
              <p className="mt-1 text-[11px] text-amber-700">
                Agrega al menos un color para poder asociar las fotos.
              </p>
            )}

            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {images.map((image) => (
                  <div key={image.id} className="space-y-2 rounded-lg border p-2">
                    <div className="relative">
                      <img
                        src={image.url}
                        alt=""
                        className="h-28 w-full rounded-md border object-cover"
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
                    <Select
                      value={image.color || "__none__"}
                      onValueChange={(value) =>
                        updateImageColor(image.id, value === "__none__" ? "" : value)
                      }
                      disabled={namedColors.length === 0}
                    >
                      <SelectTrigger
                        className="h-8 text-[11px]"
                        aria-label="Color asociado a la foto"
                      >
                        <SelectValue placeholder="Sin color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin color</SelectItem>
                        {namedColors.map((color) => (
                          <SelectItem key={color.name} value={color.name}>
                            <span className="flex items-center gap-2">
                              <span
                                className="h-3 w-3 rounded-full border border-primary/20"
                                style={{ backgroundColor: color.hex }}
                              />
                              {color.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              Publicado (visible en la tienda)
            </label>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="submit"
              variant="outline"
              className="flex-1"
              onClick={() => {
                publishIntentRef.current = false;
              }}
            >
              <EyeOff className="h-4 w-4" />
              Guardar como borrador
            </Button>
            <Button
              type="submit"
              className="flex-1"
              onClick={() => {
                publishIntentRef.current = true;
              }}
            >
              <UploadCloud className="h-4 w-4" />
              {editing ? "Guardar y publicar" : "Publicar producto"}
            </Button>
          </div>
          {status && <p className="text-center text-sm text-muted-foreground">{status}</p>}
        </form>
      </CardContent>

      <ProductPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        product={draft}
        url={previewUrl}
      />
    </Card>
  );
}

/* ------------------------------ Menú ------------------------------ */

const MENU: { tab: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { tab: "dashboard", label: "Resumen", icon: LayoutDashboard },
  { tab: "nuevo", label: "Nuevo producto", icon: Plus },
  { tab: "productos", label: "Productos", icon: Package },
  { tab: "inventario", label: "Inventario", icon: Boxes },
  { tab: "proveedores", label: "Proveedores", icon: Truck },
  { tab: "ordenes", label: "Órdenes de compra", icon: ClipboardList },
  { tab: "ventas", label: "Ventas", icon: BarChart3 },
  { tab: "comentarios", label: "Comentarios", icon: MessageSquare },
  { tab: "contenido", label: "Contenido", icon: ImagePlus },
  { tab: "ajustes", label: "Ajustes", icon: Settings },
];

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [fillingSkus, setFillingSkus] = useState(false);

  useSeo({
    title: "Administración | LUNÉ Activewear",
    description: "Panel privado de administración de LUNÉ Activewear.",
    path: "/admin",
    noindex: true,
  });

  useEffect(() => {
    const currentAuth = auth;
    if (!currentAuth) return;
    return onAuthStateChanged(currentAuth, (user) => {
      const allowed = isAdminEmail(user?.email);
      setIsAdmin(allowed);
      if (user?.email && !allowed) {
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

  /**
   * Migración única: los productos creados antes del SKU reciben uno al abrir el
   * panel admin. El ref evita reintentos si alguna escritura falla.
   */
  const skuBackfillStarted = useRef(false);
  useEffect(() => {
    if (!isAdmin || !db || skuBackfillStarted.current) return;
    const missing = products.filter((product) => !product.sku);
    if (missing.length === 0) return;
    skuBackfillStarted.current = true;
    const taken = new Set(
      products.map((product) => product.sku).filter((sku): sku is string => Boolean(sku))
    );
    void (async () => {
      let created = 0;
      for (const product of missing) {
        try {
          const sku = generateSku(product.category, taken);
          taken.add(sku);
          await updateDoc(doc(db, "products", product.id), { sku });
          created += 1;
        } catch {
          /* best effort: se puede reintentar con el botón del dashboard */
        }
      }
      if (created > 0) {
        toast.success(
          created === 1 ? "SKU generado para 1 producto." : `SKUs generados para ${created} productos.`
        );
      }
    })();
  }, [isAdmin, products]);

  const stats = useMemo(() => {
    const stock = products.reduce((sum, product) => sum + totalStock(product), 0);
    // Valor del inventario: precio de cada prenda × unidades registradas.
    const value = products.reduce(
      (sum, product) => sum + (product.price || 0) * totalStock(product),
      0
    );
    return {
      count: products.length,
      featured: products.filter((p) => p.featured).length,
      stock,
      value,
    };
  }, [products]);

  const takenSkus = useMemo(
    () => products.map((p) => p.sku).filter((sku): sku is string => Boolean(sku)),
    [products]
  );
  const missingSkus = products.filter((p) => !p.sku).length;

  const productPagination = usePagination(products, { pageSize: 10 });

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

  /** Genera y guarda el SKU de los productos creados antes de esta función. */
  const fillMissingSkus = async () => {
    if (!db) return;
    const missing = products.filter((product) => !product.sku);
    if (missing.length === 0) return;
    setFillingSkus(true);
    try {
      const taken = new Set(takenSkus);
      for (const product of missing) {
        const sku = generateSku(product.category, taken);
        taken.add(sku);
        await updateDoc(doc(db, "products", product.id), { sku });
      }
      toast.success(
        missing.length === 1 ? "SKU generado." : `${missing.length} SKUs generados.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      toast.error(message);
    } finally {
      setFillingSkus(false);
    }
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
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 normal-case tracking-normal text-muted-foreground hover:text-foreground"
              onClick={() => firebaseAuth && void signOut(firebaseAuth)}
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-xs">Cerrar sesión</span>
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
            <h1 className="mt-1 font-display text-3xl font-medium tracking-tight">
              {tab === "contenido"
                ? "Contenido del sitio"
                : tab === "comentarios"
                  ? "Comentarios"
                  : tab === "inventario"
                    ? "Inventario"
                    : tab === "proveedores"
                      ? "Proveedores"
                      : tab === "ordenes"
                        ? "Órdenes de compra"
                        : tab === "ventas"
                          ? "Ventas"
                          : tab === "ajustes"
                            ? "Ajustes"
                            : "Catálogo"}
            </h1>
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
                  <CardDescription>Valor del inventario (precio × unidades)</CardDescription>
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
                <Button variant="outline" onClick={() => setTab("inventario")}>
                  <Boxes className="h-4 w-4" /> Ver inventario
                </Button>
                <Button variant="outline" onClick={() => setTab("proveedores")}>
                  <Truck className="h-4 w-4" /> Proveedores
                </Button>
                <Button variant="outline" onClick={() => setTab("ordenes")}>
                  <ClipboardList className="h-4 w-4" /> Órdenes de compra
                </Button>
                {missingSkus > 0 && (
                  <Button variant="outline" onClick={fillMissingSkus} disabled={fillingSkus}>
                    <Hash className="h-4 w-4" />
                    {fillingSkus
                      ? "Generando SKUs…"
                      : `Generar SKUs faltantes (${missingSkus})`}
                  </Button>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {tab === "nuevo" && <ProductForm editing={editing} takenSkus={takenSkus} />}

        {tab === "inventario" && (
          <InventoryPanel
            products={products}
            onEdit={(product) => {
              setEditing(product);
              setTab("nuevo");
            }}
          />
        )}

        {tab === "proveedores" && <SuppliersManager products={products} />}
        {tab === "ordenes" && <OrdersManager />}
        {tab === "ventas" && <SalesManager />}

        {tab === "productos" && (
          <>
            {editing ? (
              <div className="space-y-4">
                <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
                  ← Volver a la lista
                </Button>
                <ProductForm editing={editing} takenSkus={takenSkus} />
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
                {productPagination.pageItems.map((product) => (
                  <Card key={product.id} className={product.published === false ? "opacity-70" : ""}>
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
                          {product.sku ? (
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] tracking-wide"
                              title="Código SKU"
                            >
                              {product.sku}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Sin SKU
                            </Badge>
                          )}
                          {product.published === false && (
                            <Badge variant="outline">
                              <EyeOff className="h-3 w-3" /> Borrador
                            </Badge>
                          )}
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
                <Pagination
                  page={productPagination.page}
                  pageSize={productPagination.pageSize}
                  total={productPagination.total}
                  totalPages={productPagination.totalPages}
                  onPageChange={productPagination.setPage}
                  onPageSizeChange={productPagination.setPageSize}
                  itemLabel="productos"
                  className="pt-1"
                />
              </div>
            )}
          </>
        )}

        {tab === "comentarios" && <ReviewsModeration />}
        {tab === "contenido" && <ContentManager />}
        {tab === "ajustes" && <AuthSettings />}
      </main>
    </div>
  );
}

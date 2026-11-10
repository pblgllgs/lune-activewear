import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Link2,
  RefreshCw,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import type { Product } from "@/types/product";
import { categoryLabel } from "@/lib/categories";
import {
  isSizeSoldOut,
  isSoldOut,
  LAST_UNITS_THRESHOLD,
  LOW_STOCK_THRESHOLD,
  sizeStock,
  totalStock,
} from "@/lib/stock";
import { discountPercent, formatCLP } from "@/lib/utils";
import { richTextToDisplayHtml, richTextToPlainText } from "@/lib/rich-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/shop/ImageWithFallback";
import { ProductCard } from "@/components/shop/ProductCard";

export interface PreviewIssue {
  level: "error" | "warning" | "info";
  text: string;
}

/**
 * Revisión del borrador antes de publicar: detecta los errores que más caro
 * salen después (precio en 0, tallas sin stock, descuento que no se muestra,
 * descripción vacía, imágenes de menos, etc.).
 */
export function buildPreviewIssues(product: Product): PreviewIssue[] {
  const issues: PreviewIssue[] = [];

  if (!product.name.trim()) {
    issues.push({ level: "error", text: "Falta el nombre del producto." });
  }
  if (!product.price || product.price <= 0) {
    issues.push({ level: "error", text: "El precio está en 0 o vacío." });
  }
  if (product.sizes.length === 0) {
    issues.push({ level: "error", text: "No hay tallas seleccionadas: la prenda no se puede comprar." });
  }
  if (product.compareAtPrice && product.compareAtPrice <= product.price) {
    issues.push({
      level: "warning",
      text: "El precio anterior no es mayor que el precio actual: no se mostrará descuento.",
    });
  }
  if (product.images.length === 0) {
    issues.push({
      level: "warning",
      text: "Sin imágenes: se verá el placeholder de marca en la tienda y en la ficha.",
    });
  }
  const descriptionText = richTextToPlainText(product.description);
  if (!descriptionText) {
    issues.push({
      level: "warning",
      text: "Sin descripción: es el texto que muestra Google y el que se copia al WhatsApp.",
    });
  }
  if (product.colors.length === 0) {
    issues.push({ level: "info", text: "Sin colores: la ficha mostrará «Único»." });
  }
  const unassignedImages = product.images.filter((url) => !product.imageColors?.[url]);
  if (product.images.length > 0 && product.colors.length > 0 && unassignedImages.length > 0) {
    issues.push({
      level: "info",
      text: `${unassignedImages.length} foto(s) sin color: al seleccionarlas no se cambia el color de la ficha.`,
    });
  }
  if (descriptionText.length > 160) {
    issues.push({
      level: "info",
      text: `La descripción tiene ${descriptionText.length} caracteres: en Google se recortan unos 155.`,
    });
  }
  if (product.sizes.length > 0 && totalStock(product) === 0) {
    issues.push({
      level: "warning",
      text: "Todas las tallas están en 0: se publicará con la etiqueta «Agotado».",
    });
  }
  const soldOutSizes = product.sizes.filter((size) => isSizeSoldOut(product, size));
  if (soldOutSizes.length > 0 && soldOutSizes.length < product.sizes.length) {
    issues.push({
      level: "info",
      text: `${soldOutSizes.join(", ")} sin stock: aparecerán tachadas y se podrá pedir aviso de reposición.`,
    });
  }

  return issues;
}

interface ProductPreviewProps {
  open: boolean;
  onClose: () => void;
  /** Producto tal como quedaría publicado. */
  product: Product;
  /** URL que tendrá la prenda (solo informativa). */
  url: string;
}

/**
 * Vista previa del producto antes de publicar: muestra la tarjeta que se ve en
 * la tienda y la ficha de producto, con una revisión de los datos pendientes.
 */
export function ProductPreview({ open, onClose, product, url }: ProductPreviewProps) {
  const [view, setView] = useState<"card" | "detail">("card");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const issues = buildPreviewIssues(product);
  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-foreground/45 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Vista previa del producto"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mx-auto flex min-h-full w-full max-w-6xl items-start justify-center p-0 sm:p-6">
        <div className="relative w-full bg-background shadow-2xl sm:my-4">
          <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-background/95 px-5 py-4 backdrop-blur sm:px-7">
            <div>
              <p className="text-[10px] uppercase tracking-brand text-muted-foreground">
                Vista previa
              </p>
              <h2 className="font-display text-xl font-medium tracking-tight">
                {product.name.trim() || "Producto sin nombre"}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Así se verá en la tienda. Nada se publica hasta que guardes.
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Cerrar vista previa"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/15 transition hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1fr)_300px]">
            {/* Vista previa */}
            <div className="min-w-0">
              <div className="flex gap-1 rounded-md bg-secondary p-1">
                {(
                  [
                    { id: "card", label: "En la tienda" },
                    { id: "detail", label: "Ficha de producto" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setView(tab.id)}
                    className={`flex-1 rounded px-3 py-2 text-[11px] uppercase tracking-wider2 transition ${
                      view === tab.id
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-lg border bg-background p-4 sm:p-6">
                {view === "card" ? (
                  <div className="mx-auto max-w-[240px]">
                    <p className="mb-3 text-center text-[10px] uppercase tracking-wider2 text-muted-foreground">
                      Tarjeta de la tienda
                    </p>
                    <div className="pointer-events-none">
                      <ProductCard product={product} />
                    </div>
                  </div>
                ) : (
                  <DetailPreview product={product} />
                )}
              </div>
            </div>

            {/* Revisión */}
            <aside className="min-w-0">
              <div className="rounded-lg border p-4">
                <h3 className="text-[10px] uppercase tracking-wider2">Revisión</h3>

                {issues.length === 0 ? (
                  <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    Todo listo para publicar.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {issues.map((issue) => (
                      <li key={issue.text} className="flex items-start gap-2 text-xs leading-relaxed">
                        {issue.level === "error" ? (
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                        ) : issue.level === "warning" ? (
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        ) : (
                          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="text-muted-foreground">{issue.text}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {(errors.length > 0 || warnings.length > 0) && (
                  <p className="mt-4 border-t pt-3 text-[11px] text-muted-foreground">
                    {errors.length > 0 && (
                      <span className="block text-destructive">
                        {errors.length} {errors.length === 1 ? "error" : "errores"} que conviene corregir.
                      </span>
                    )}
                    {warnings.length > 0 && (
                      <span className="block">{warnings.length} avisos de contenido.</span>
                    )}
                  </p>
                )}
              </div>

              <div className="mt-4 rounded-lg border p-4">
                <h3 className="text-[10px] uppercase tracking-wider2">Ficha técnica</h3>
                <dl className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Categoría</dt>
                    <dd>{categoryLabel(product.category)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Precio</dt>
                    <dd>{formatCLP(product.price)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Tallas</dt>
                    <dd>{product.sizes.length ? product.sizes.join(" · ") : "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Unidades</dt>
                    <dd>{totalStock(product)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Colores</dt>
                    <dd className="text-right">
                      {product.colors.length
                        ? product.colors.map((color) => color.name).join(" · ")
                        : "Único"}
                    </dd>
                  </div>
                </dl>

                <p className="mt-4 flex items-start gap-2 border-t pt-3 text-[11px] text-muted-foreground">
                  <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="break-all">{url}</span>
                </p>
              </div>

              <Button type="button" className="mt-4 w-full" onClick={onClose}>
                Volver al formulario
              </Button>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Réplica de la ficha de producto (`/producto/<slug>`) con los datos del borrador. */
function DetailPreview({ product }: { product: Product }) {
  const discount = discountPercent(product.price, product.compareAtPrice);
  const soldOut = isSoldOut(product);
  const size = product.sizes.find((s) => !isSizeSoldOut(product, s)) ?? product.sizes[0] ?? "";
  const color = product.colors[0]?.name ?? "Único";
  const currentStock = size ? sizeStock(product, size) : null;
  const images = product.images.length ? product.images : [""];

  return (
    <div className="pointer-events-none">
      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        <span>Inicio</span>
        <span>/</span>
        <span>Tienda</span>
        <span>/</span>
        <span className="text-foreground">{product.name.trim() || "Producto"}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="min-w-0">
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-secondary">
            <ImageWithFallback
              src={images[0]}
              alt={product.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute left-4 top-4 flex flex-col gap-1.5">
              {product.isNew && <Badge variant="accent">Nuevo</Badge>}
              {discount > 0 && <Badge>-{discount}%</Badge>}
              {soldOut && <Badge variant="secondary">Agotado</Badge>}
            </div>
          </div>

          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((image, i) => (
                <div
                  key={`${image}-${i}`}
                  className={`h-20 w-16 shrink-0 overflow-hidden rounded-md border-2 ${
                    i === 0 ? "border-primary" : "border-transparent opacity-70"
                  }`}
                >
                  <ImageWithFallback src={image} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-brand text-muted-foreground">
            {categoryLabel(product.category)}
          </p>
          <h3 className="mt-2 font-display text-3xl font-medium tracking-tight">
            {product.name.trim() || "Nombre del producto"}
          </h3>
          {product.sku && (
            <p className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              SKU {product.sku}
            </p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <span className="font-display text-2xl">{formatCLP(product.price)}</span>
            {discount > 0 && product.compareAtPrice && (
              <>
                <span className="text-sm text-muted-foreground line-through">
                  {formatCLP(product.compareAtPrice)}
                </span>
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] uppercase tracking-wider2">
                  -{discount}%
                </span>
              </>
            )}
          </div>

          <div
            className="rich-text mt-5 text-sm leading-relaxed text-muted-foreground"
            dangerouslySetInnerHTML={{
              __html:
                richTextToDisplayHtml(product.description) ||
                '<p class="text-muted-foreground">Sin descripción.</p>',
            }}
          />

          {product.colors.length > 0 && (
            <div className="mt-7">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider2">Color</p>
                <p className="text-xs text-muted-foreground">{color}</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <div
                    key={c.name}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                      color === c.name ? "border-primary" : "border-transparent"
                    }`}
                    title={c.name}
                  >
                    <span
                      className="h-6 w-6 rounded-full border border-primary/15"
                      style={{ backgroundColor: c.hex }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider2">Talla</p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.sizes.map((s) => {
                const out = isSizeSoldOut(product, s);
                return (
                  <span
                    key={s}
                    className={`min-w-11 rounded-md border px-3 py-2 text-center text-xs ${
                      out
                        ? "border-input text-muted-foreground/50 line-through"
                        : size === s
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input"
                    }`}
                  >
                    {s}
                  </span>
                );
              })}
            </div>
            {currentStock !== null && currentStock > 0 && currentStock <= LOW_STOCK_THRESHOLD && (
              <p
                className={`mt-2 text-xs ${
                  currentStock <= LAST_UNITS_THRESHOLD ? "font-medium text-primary" : "text-muted-foreground"
                }`}
              >
                {currentStock <= LAST_UNITS_THRESHOLD ? "Últimas" : "Quedan"} {currentStock} unidad
                {currentStock === 1 ? "" : "es"} en talla {size}.
              </p>
            )}
          </div>

          <div className="mt-7 flex flex-col gap-3">
            <div className="inline-flex h-12 items-center justify-between self-start rounded-md border sm:w-32">
              <span className="w-10 text-center text-muted-foreground">−</span>
              <span className="text-sm">1</span>
              <span className="w-10 text-center text-muted-foreground">+</span>
            </div>
            <Button size="lg" className="w-full" disabled={currentStock === 0}>
              <ShoppingBag className="h-4 w-4" />
              {currentStock === 0 ? "Talla agotada" : "Agregar al carrito"}
            </Button>
          </div>

          <Button size="lg" variant="whatsapp-outline" className="mt-3 w-full">
            Comprar por WhatsApp
          </Button>

          <div className="mt-6 flex flex-col gap-2 rounded-lg bg-secondary/60 p-4 text-xs text-muted-foreground">
            <p className="flex items-center gap-2">
              <Truck className="h-4 w-4" /> Envío gratis en compras sobre $50.000.
            </p>
            <p className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Cambios dentro de 15 días con la prenda sin uso.
            </p>
          </div>

          <div className="mt-6 divide-y rounded-lg border">
            {[
              { title: "Composición", content: product.composition },
              { title: "Cuidado de la prenda", content: product.care },
              { title: "Envíos y devoluciones", content: product.shipping },
            ]
              .filter((section) => section.content)
              .map((section) => (
                <details key={section.title} className="group" open>
                  <summary className="flex list-none items-center justify-between px-4 py-3.5 text-[11px] uppercase tracking-wider2">
                    {section.title}
                  </summary>
                  <p className="whitespace-pre-line px-4 pb-4 text-sm leading-relaxed text-muted-foreground">
                    {section.content}
                  </p>
                </details>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

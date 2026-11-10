import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";
import { getProduct, getProducts } from "@/lib/catalog";
import { categoryLabel } from "@/lib/categories";
import { resolveSizeGuide } from "@/lib/size-guide";
import {
  firstAvailableSize,
  isSizeSoldOut,
  isSoldOut,
  LAST_UNITS_THRESHOLD,
  LOW_STOCK_THRESHOLD,
  sizeStock,
} from "@/lib/stock";
import { discountPercent, formatCLP } from "@/lib/utils";
import { whatsappLink } from "@/lib/constants";
import { breadcrumbJsonLd, productJsonLd, truncate, useSeo } from "@/lib/seo";
import { getApprovedReviews, submitReview, type Review } from "@/lib/reviews";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import type { Product } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageWithFallback } from "@/components/shop/ImageWithFallback";
import { ProductCard } from "@/components/shop/ProductCard";
import { SizeGuide } from "@/components/shop/SizeGuide";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { addItem, openCart } = useCart();
  const { has: isFavorite, toggle: toggleFavorite } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [qty, setQty] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewName, setReviewName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSending, setReviewSending] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);

  useSeo({
    title: product
      ? `${product.name} — ${categoryLabel(product.category)} | LUNÉ Activewear`
      : "Producto | LUNÉ Activewear",
    description: product
      ? truncate(product.description)
      : "Descubre la colección de ropa deportiva femenina LUNÉ Activewear, diseñada en Chillán, Chile.",
    path: `/producto/${id ?? ""}`,
    image: product?.images[0],
    type: "product",
    noindex: !loading && !product,
    jsonLd: product
      ? [
          productJsonLd(product),
          breadcrumbJsonLd([
            { name: "Inicio", path: "/" },
            { name: "Tienda", path: "/tienda" },
            {
              name: categoryLabel(product.category),
              path: `/categoria/${product.category}`,
            },
            { name: product.name, path: `/producto/${product.id}` },
          ]),
        ]
      : undefined,
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setIndex(0);
    setQty(1);
    getProduct(id)
      .then((found) => {
        setProduct(found);
        setSize(found ? firstAvailableSize(found) : "Único");
        setColor(found?.colors[0]?.name ?? "Único");
      })
      .finally(() => setLoading(false));

    getApprovedReviews(id).then(setReviews).catch(() => setReviews([]));
    getProducts().then((all) => setRelated(all.filter((p) => p.id !== id)));
  }, [id]);

  /**
   * Fotos del color seleccionado. Si el color no tiene fotos asignadas se usan
   * las que no tienen color (productos antiguos) y, en último caso, todas.
   */
  const images = useMemo(() => {
    if (!product) return [];
    const mapped = product.imageColors ?? {};
    const assigned = product.images.filter((url) => mapped[url] === color);
    if (assigned.length > 0) return assigned;
    const unassigned = product.images.filter((url) => !mapped[url]);
    if (unassigned.length > 0) return unassigned;
    return product.images;
  }, [product, color]);

  if (loading) {
    return (
      <div className="container py-20">
        <p className="text-center text-sm text-muted-foreground">Cargando producto…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container flex flex-col items-center gap-4 py-24 text-center">
        <p className="font-display text-3xl">Producto no encontrado</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Puede que ya no esté disponible. Revisa el resto de la colección.
        </p>
        <Button asChild>
          <Link to="/tienda">Volver a la tienda</Link>
        </Button>
      </div>
    );
  }

  const discount = discountPercent(product.price, product.compareAtPrice);
  const sameCategory = related.filter((p) => p.category === product.category).slice(0, 4);
  const suggestions = sameCategory.length > 0 ? sameCategory : related.slice(0, 4);
  const currentImage = images[index] ?? images[0];
  const soldOut = isSoldOut(product);
  const currentStock = sizeStock(product, size);
  const soldOutSizes = product.sizes.filter((s) => isSizeSoldOut(product, s));
  const favorite = isFavorite(product.id);

  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setIndex((i) => (i + 1) % images.length);

  const handleAdd = () => {
    if (currentStock === 0) {
      toast.error("Esa talla está agotada.");
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: currentImage ?? "",
      size,
      color,
      qty,
      stock: currentStock ?? undefined,
    });
    toast.success(`${product.name} se agregó al carrito.`);
    openCart();
  };

  const handleWhatsApp = () => {
    const text = [
      "Hola Luné! Me interesa esta prenda:",
      `${product.name}`,
      `Talla: ${size}`,
      `Color: ${color}`,
      `Cantidad: ${qty}`,
      `Precio: ${formatCLP(product.price * qty)}`,
    ].join("\n");
    window.open(whatsappLink(text), "_blank", "noopener,noreferrer");
  };

  const handleFavorite = () => {
    toggleFavorite(product.id);
    toast.success(favorite ? "Quitado de favoritos." : "Guardado en favoritos.");
  };

  const notifyLink = (soldOutSize: string) =>
    whatsappLink(
      [
        "Hola Luné! Quiero que me avisen cuando vuelva a estar disponible:",
        product.name,
        `Talla: ${soldOutSize}`,
        `Color: ${color}`,
        "",
        "Mi nombre:",
      ].join("\n")
    );

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setReviewSending(true);
    try {
      await submitReview({
        productId: product.id,
        productName: product.name,
        name: reviewName,
        text: reviewText,
        rating: reviewRating,
      });
      setReviewSent(true);
      setReviewName("");
      setReviewText("");
      setReviewRating(5);
      toast.success("Gracias. Tu comentario será revisado antes de publicarse.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar el comentario.");
    } finally {
      setReviewSending(false);
    }
  };

  return (
    <div className="container py-8 md:py-12">
      <nav aria-label="Migas de pan" className="mb-6 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Inicio
        </Link>
        <span>/</span>
        <Link to="/tienda" className="hover:text-foreground">
          Tienda
        </Link>
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Galería */}
        <div className="min-w-0">
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-secondary">
            <ImageWithFallback
              src={currentImage}
              alt={`${product.name} — ${categoryLabel(product.category)} LUNÉ Activewear`}
              priority
              className="h-full w-full object-cover"
            />

            <div className="absolute left-4 top-4 flex flex-col gap-1.5">
              {product.isNew && <Badge variant="accent">Nuevo</Badge>}
              {discount > 0 && <Badge>-{discount}%</Badge>}
              {soldOut && <Badge variant="secondary">Agotado</Badge>}
            </div>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 backdrop-blur transition hover:bg-background"
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 backdrop-blur transition hover:bg-background"
                  aria-label="Imagen siguiente"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <span className="absolute bottom-4 right-4 rounded-full bg-background/80 px-2.5 py-1 text-[10px] backdrop-blur">
                  {index + 1} / {images.length}
                </span>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((image, i) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-20 w-16 shrink-0 overflow-hidden rounded-md border-2 transition ${
                    i === index ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                  aria-label={`Ver imagen ${i + 1}`}
                >
                  <ImageWithFallback src={image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Información */}
        <div className="min-w-0 lg:py-2">
          <p className="text-[10px] uppercase tracking-brand text-muted-foreground">
            {categoryLabel(product.category)}
          </p>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
                {product.name}
              </h1>
              {product.sku && (
                <p className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  SKU {product.sku}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleFavorite}
              aria-pressed={favorite}
              aria-label={favorite ? "Quitar de favoritos" : "Guardar en favoritos"}
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/15 transition hover:bg-secondary"
            >
              <Heart className={`h-4 w-4 ${favorite ? "fill-primary text-primary" : ""}`} />
            </button>
          </div>

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

          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{product.description}</p>

          {/* Color */}
          {product.colors.length > 0 && (
            <div className="mt-7">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider2">Color</p>
                <p className="text-xs text-muted-foreground">{color}</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      setColor(c.name);
                      setIndex(0);
                    }}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition ${
                      color === c.name ? "border-primary" : "border-transparent"
                    }`}
                    aria-label={`Color ${c.name}`}
                    title={c.name}
                  >
                    <span
                      className="h-6 w-6 rounded-full border border-primary/15"
                      style={{ backgroundColor: c.hex }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Talla */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider2">Talla</p>
              <SizeGuide sizes={product.sizes} rows={resolveSizeGuide(product)} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.sizes.map((s) => {
                const out = isSizeSoldOut(product, s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSize(s);
                      setQty(1);
                    }}
                    disabled={out}
                    title={out ? "Talla agotada" : undefined}
                    className={`min-w-11 rounded-md border px-3 py-2 text-xs transition ${
                      out
                        ? "cursor-not-allowed border-input text-muted-foreground/50 line-through"
                        : size === s
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input hover:border-primary"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {currentStock === 0 && (
              <p className="mt-2 text-xs text-destructive">Esta talla está agotada.</p>
            )}
            {currentStock !== null && currentStock > 0 && currentStock <= LOW_STOCK_THRESHOLD && (
              <p
                className={`mt-2 text-xs ${
                  currentStock <= LAST_UNITS_THRESHOLD
                    ? "font-medium text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {currentStock <= LAST_UNITS_THRESHOLD ? "Últimas" : "Quedan"} {currentStock} unidad
                {currentStock === 1 ? "" : "es"} en talla {size}.
              </p>
            )}

            {soldOutSizes.length > 0 && (
              <div className="mt-4 rounded-lg border border-dashed border-primary/20 p-3">
                <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">
                  ¿Tu talla está agotada?
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {soldOutSizes.map((soldOutSize) => (
                    <a
                      key={soldOutSize}
                      href={notifyLink(soldOutSize)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-whatsapp/40 px-3 py-1.5 text-[10px] uppercase tracking-wider2 text-whatsapp transition hover:border-whatsapp hover:bg-whatsapp hover:text-whatsapp-foreground"
                    >
                      <Bell className="h-3 w-3" />
                      Avísame talla {soldOutSize}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cantidad + agregar */}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <div className="inline-flex h-12 items-center justify-between rounded-md border sm:w-32">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-full w-10 items-center justify-center transition hover:bg-secondary"
                aria-label="Restar unidad"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="text-sm">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                disabled={currentStock !== null && qty >= currentStock}
                className="flex h-full w-10 items-center justify-center transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Sumar unidad"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <Button
              size="lg"
              className="flex-1"
              onClick={handleAdd}
              disabled={currentStock === 0}
            >
              <ShoppingBag className="h-4 w-4" />
              {currentStock === 0 ? "Talla agotada" : "Agregar al carrito"}
            </Button>
          </div>

          <Button size="lg" variant="whatsapp-outline" className="mt-3 w-full" onClick={handleWhatsApp}>
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

          {/* Detalles */}
          <div className="mt-6 divide-y rounded-lg border">
            {[
              { title: "Composición", content: product.composition },
              { title: "Cuidado de la prenda", content: product.care },
              { title: "Envíos y devoluciones", content: product.shipping },
            ]
              .filter((section) => section.content)
              .map((section) => (
                <details key={section.title} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-[11px] uppercase tracking-wider2">
                    {section.title}
                    <Plus className="h-4 w-4 transition group-open:rotate-45" />
                  </summary>
                  <p className="whitespace-pre-line px-4 pb-4 text-sm leading-relaxed text-muted-foreground">
                    {section.content}
                  </p>
                </details>
              ))}
          </div>
        </div>
      </div>

      {/* Comentarios (aprobados por el equipo) */}
      <section className="mt-16 border-t pt-12">
        <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
          Comentarios
        </h2>

        {reviews.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Aún no hay comentarios aprobados para este producto.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-xl border bg-card p-5">
                {review.rating ? (
                  <div className="flex items-center gap-0.5" aria-label={`${review.rating} de 5 estrellas`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < review.rating! ? "fill-primary text-primary" : "text-primary/20"}`}
                      />
                    ))}
                  </div>
                ) : null}
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">“{review.text}”</p>
                <p className="mt-3 text-xs font-medium uppercase tracking-wider2">{review.name}</p>
              </article>
            ))}
          </div>
        )}

        <div className="mt-10 max-w-xl rounded-xl border bg-secondary/30 p-5 md:p-6">
          <h3 className="font-display text-lg font-medium">Deja tu comentario</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Tu comentario será revisado por el equipo antes de publicarse.
          </p>

          {reviewSent ? (
            <p className="mt-4 rounded-md border bg-background p-3 text-sm text-muted-foreground">
              ¡Gracias! Recibimos tu comentario y lo revisaremos pronto.
            </p>
          ) : (
            <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="review-name" className="text-[11px] uppercase tracking-wider2 text-muted-foreground">
                    Nombre
                  </Label>
                  <Input
                    id="review-name"
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    placeholder="Tu nombre"
                    maxLength={80}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider2 text-muted-foreground">
                    Calificación
                  </Label>
                  <div className="flex items-center gap-1 pt-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReviewRating(n)}
                        className="p-0.5"
                        aria-label={`${n} estrella${n === 1 ? "" : "s"}`}
                      >
                        <Star
                          className={`h-5 w-5 transition ${
                            n <= reviewRating ? "fill-primary text-primary" : "text-primary/25 hover:text-primary/50"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="review-text" className="text-[11px] uppercase tracking-wider2 text-muted-foreground">
                  Comentario
                </Label>
                <Textarea
                  id="review-text"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={4}
                  placeholder="Cuéntanos tu experiencia con esta prenda"
                  maxLength={1200}
                  required
                />
              </div>
              <Button type="submit" disabled={reviewSending}>
                {reviewSending ? "Enviando…" : "Enviar comentario"}
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* Relacionados */}
      {suggestions.length > 0 && (
        <section className="mt-20 border-t pt-12">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
              También te puede gustar
            </h2>
            <Link
              to="/tienda"
              className="text-[10px] uppercase tracking-wider2 underline-offset-4 hover:underline"
            >
              Ver todo
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
            {suggestions.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

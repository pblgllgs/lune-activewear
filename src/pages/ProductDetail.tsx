import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { getProduct, getProducts } from "@/lib/catalog";
import { categoryLabel } from "@/lib/categories";
import { discountPercent, formatCLP } from "@/lib/utils";
import { whatsappLink } from "@/lib/constants";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/shop/ImageWithFallback";
import { ProductCard } from "@/components/shop/ProductCard";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { addItem, openCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setIndex(0);
    setQty(1);
    getProduct(id)
      .then((found) => {
        setProduct(found);
        setSize(found?.sizes[0] ?? "Único");
        setColor(found?.colors[0]?.name ?? "Único");
      })
      .finally(() => setLoading(false));

    getProducts().then((all) => setRelated(all.filter((p) => p.id !== id)));
  }, [id]);

  const images = useMemo(() => product?.images ?? [], [product]);

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

  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setIndex((i) => (i + 1) % images.length);

  const handleAdd = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: currentImage ?? "",
      size,
      color,
      qty,
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

  return (
    <div className="container py-8 md:py-12">
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
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
              alt={product.name}
              className="h-full w-full object-cover"
            />

            <div className="absolute left-4 top-4 flex flex-col gap-1.5">
              {product.isNew && <Badge variant="accent">Nuevo</Badge>}
              {discount > 0 && <Badge>-{discount}%</Badge>}
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
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight md:text-4xl">
            {product.name}
          </h1>

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
                    onClick={() => setColor(c.name)}
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
              <Link to="/#contacto" className="text-[10px] uppercase tracking-wider2 underline underline-offset-4">
                Guía de tallas
              </Link>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`min-w-11 rounded-md border px-3 py-2 text-xs transition ${
                    size === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input hover:border-primary"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
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
                className="flex h-full w-10 items-center justify-center transition hover:bg-secondary"
                aria-label="Sumar unidad"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <Button size="lg" className="flex-1" onClick={handleAdd}>
              <ShoppingBag className="h-4 w-4" /> Agregar al carrito
            </Button>
          </div>

          <Button size="lg" variant="outline" className="mt-3 w-full" onClick={handleWhatsApp}>
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

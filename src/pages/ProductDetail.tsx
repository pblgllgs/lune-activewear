import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import Swal from "sweetalert2";
import {
  BadgeCheck,
  Bell,
  ChevronLeft,
  ChevronRight,
  Heart,
  ImagePlus,
  Minus,
  Plus,
  RefreshCw,
  RotateCw,
  ShoppingBag,
  Star,
  Truck,
  X,
} from "lucide-react";
import { getProduct, getProducts } from "@/lib/catalog";
import { categoryLabel } from "@/lib/categories";
import { resolveSizeGuide } from "@/lib/size-guide";
import {
  firstAvailableColor,
  firstAvailableSize,
  isColorSoldOut,
  isSizeSoldOut,
  isSoldOut,
  LAST_UNITS_THRESHOLD,
  LOW_STOCK_THRESHOLD,
  sizeStock,
} from "@/lib/stock";
import { discountPercent, formatCLP } from "@/lib/utils";
import { useContact } from "@/lib/use-contact";
import { richTextToDisplayHtml, richTextToPlainText } from "@/lib/rich-text";
import { usePagination } from "@/lib/use-pagination";
import { breadcrumbJsonLd, productJsonLd, truncate, useSeo } from "@/lib/seo";
import { getApprovedReviews, MAX_REVIEW_PHOTOS, submitReview, type Review } from "@/lib/reviews";
import { getMyOrders } from "@/lib/orders";
import { subscribeRestock } from "@/lib/restock";
import { deleteFromR2, isUploadConfigured, uploadToR2 } from "@/lib/upload";
import { compressImage, validateReviewPhoto } from "@/lib/image-compress";
import { SALE_STATUSES } from "@/types/order";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import type { Product } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import { ImageWithFallback } from "@/components/shop/ImageWithFallback";
import { ProductCard } from "@/components/shop/ProductCard";
import { SizeGuide } from "@/components/shop/SizeGuide";
import { ProductSpin } from "@/components/product/ProductSpin";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { addItem, openCart } = useCart();
  const { has: isFavorite, toggle: toggleFavorite } = useWishlist();
  const { whatsappLink } = useContact();
  const { user, displayName } = useAuth();

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
  const [reviewPhotos, setReviewPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [verifiedOrderId, setVerifiedOrderId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [showSpin, setShowSpin] = useState(false);
  const touchX = useRef<number | null>(null);
  const reviewPhotosRef = useRef(reviewPhotos);
  const uploadsEnabled = isUploadConfigured();

  const reviewPagination = usePagination(reviews, { pageSize: 6, resetKey: id });

  useSeo({
    title: product
      ? `${product.name} — ${categoryLabel(product.category)} | LUNÉ Activewear`
      : "Producto | LUNÉ Activewear",
    description: product
      ? truncate(richTextToPlainText(product.description))
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
    setShowSpin(false);
    setQty(1);
    getProduct(id)
      .then((found) => {
        setProduct(found);
        // Sin fotos normales, el giro es la única vista: se abre directamente.
        setShowSpin(
          Boolean(
            found &&
              found.spinEnabled !== false &&
              found.images.length === 0 &&
              found.spinByColor &&
              Object.keys(found.spinByColor).length > 0
          )
        );
        setSize(found ? firstAvailableSize(found) : "Único");
        // El color inicial sigue a la primera foto si tiene uno asignado; si está agotado, usa el primero disponible.
        const firstUrl = found?.images[0];
        const firstColor = firstUrl ? found?.imageColors?.[firstUrl]?.trim() : undefined;
        const validFirstColor =
          firstColor && found?.colors.some((c) => c.name.trim() === firstColor)
            ? found.colors.find((c) => c.name.trim() === firstColor)?.name
            : undefined;
        const initialColor = found
          ? (validFirstColor && !isColorSoldOut(found, validFirstColor) && validFirstColor) ||
            firstAvailableColor(found)
          : "Único";
        setColor(initialColor ?? found?.colors[0]?.name ?? "Único");
        setSize(found ? firstAvailableSize(found, initialColor) : "Único");
      })
      .finally(() => setLoading(false));

    getApprovedReviews(id).then(setReviews).catch(() => setReviews([]));
    getProducts().then((all) => setRelated(all.filter((p) => p.id !== id)));
  }, [id]);

  // Sello de compra verificada: cruza la sesión con los pedidos confirmados.
  useEffect(() => {
    if (!product || !user?.email) {
      setVerifiedOrderId(null);
      return;
    }
    let active = true;
    getMyOrders(user.email, user.uid)
      .then((orders) => {
        if (!active) return;
        const match = orders.find(
          (order) =>
            SALE_STATUSES.includes(order.status) &&
            order.items.some((item) => item.productId === product.id)
        );
        setVerifiedOrderId(match?.id ?? null);
      })
      .catch(() => {
        if (active) setVerifiedOrderId(null);
      });
    return () => {
      active = false;
    };
  }, [product, user]);

  // El nombre de la sesión se propone en el formulario (se puede cambiar).
  useEffect(() => {
    setReviewName((current) => current || displayName);
  }, [displayName]);

  useEffect(() => {
    reviewPhotosRef.current = reviewPhotos;
  }, [reviewPhotos]);

  // Libera las miniaturas al salir de la ficha.
  useEffect(
    () => () => {
      reviewPhotosRef.current.forEach((photo) => URL.revokeObjectURL(photo.preview));
    },
    []
  );

  // Cierra la foto ampliada con Escape.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  /**
   * El carrusel muestra todas las fotos del producto. Al elegir una foto se
   * selecciona automáticamente el color asociado (si lo tiene).
   */
  const images = useMemo(() => product?.images ?? [], [product]);

  /**
   * Giro de 180° disponible en el producto. Se usa el del color activo o, si
   * ese color no tiene, el primero configurado; al abrirlo se activa su color,
   * igual que al elegir una foto. Va como última diapositiva del carrusel.
   */
  const spin = useMemo(() => {
    const map = product?.spinByColor;
    if (!product || !map || product.spinEnabled === false) return null;
    const names = new Set(product.colors.map((entry) => entry.name.trim()));
    const usable = Object.entries(map).filter(
      ([name]) => name === "*" || names.has(name.trim())
    );
    if (usable.length === 0) return null;
    const [name, entry] = usable.find(([key]) => key === color) ?? usable[0];
    return { front: entry.front, back: entry.back, color: name === "*" ? color : name };
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
  const currentStock = sizeStock(product, size, color);
  const soldOutSizes = product.sizes.filter((s) => isSizeSoldOut(product, s, color));
  const favorite = isFavorite(product.id);

  /** Color asociado a una foto, solo si existe en los colores del producto. */
  const colorForImage = (url: string | undefined) => {
    if (!url) return undefined;
    const name = product.imageColors?.[url]?.trim();
    if (!name) return undefined;
    return product.colors.find((c) => c.name.trim() === name)?.name;
  };

  /** Selecciona una foto y, si tiene color asignado, lo activa. */
  const selectImage = (nextIndex: number) => {
    setShowSpin(false);
    setIndex(nextIndex);
    const name = colorForImage(images[nextIndex]);
    if (name) {
      setColor(name);
      if (isSizeSoldOut(product, size, name)) {
        setSize(firstAvailableSize(product, name));
        setQty(1);
      }
    }
  };

  const selectColor = (name: string) => {
    setShowSpin(false);
    setColor(name);
    const first = images.findIndex(
      (url) => product.imageColors?.[url]?.trim() === name.trim()
    );
    if (first >= 0) setIndex(first);
    if (isSizeSoldOut(product, size, name)) {
      setSize(firstAvailableSize(product, name));
      setQty(1);
    } else {
      const max = sizeStock(product, size, name);
      if (typeof max === "number" && qty > max) setQty(Math.max(1, max));
    }
  };

  /** Diapositivas del carrusel: fotos + el giro (si el producto lo tiene). */
  const slideCount = images.length + (spin ? 1 : 0);
  const position = showSpin ? images.length + 1 : index + 1;

  /** Abre el giro y activa su color, como al elegir una foto. */
  const showSpinSlide = () => {
    if (!spin) return;
    setShowSpin(true);
    if (spin.color && spin.color !== color) {
      setColor(spin.color);
      const first = images.findIndex(
        (url) => product.imageColors?.[url]?.trim() === spin.color.trim()
      );
      if (first >= 0) setIndex(first);
      if (isSizeSoldOut(product, size, spin.color)) {
        setSize(firstAvailableSize(product, spin.color));
        setQty(1);
      }
    }
  };

  const prev = () => {
    if (showSpin) {
      setShowSpin(false);
      return;
    }
    if (index === 0 && spin) {
      showSpinSlide();
      return;
    }
    selectImage((index - 1 + images.length) % images.length);
  };

  const next = () => {
    if (showSpin) {
      setShowSpin(false);
      return;
    }
    if (spin && index === images.length - 1) {
      showSpinSlide();
      return;
    }
    selectImage((index + 1) % images.length);
  };

  const handleAdd = () => {
    if (currentStock === 0) {
      toast.error(`Esa combinación (${color}, talla ${size}) está agotada.`);
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

  const handleRestock = async (soldOutSize: string) => {
    const result = await Swal.fire({
      title: "Avísame cuando vuelva",
      html: `<p style="margin:0;font-size:13px;color:#7A6C61;line-height:1.5;">Te enviaremos un correo cuando repongamos esta talla.</p>`,
      input: "email",
      inputLabel: `${product.name} · ${color} · Talla ${soldOutSize}`,
      inputValue: user?.email ?? "",
      inputPlaceholder: "tu@correo.cl",
      showCancelButton: true,
      confirmButtonText: "Avísame",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#49372D",
      inputValidator: (value) =>
        !value || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)
          ? "Escribe un correo válido."
          : undefined,
    });
    if (!result.isConfirmed || typeof result.value !== "string") return;

    try {
      await subscribeRestock(product.id, {
        email: result.value,
        size: soldOutSize,
        color,
      });
      toast.success("Listo, te avisaremos cuando vuelva a estar disponible.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo guardar el aviso."
      );
    }
  };

  const addPhotos = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!user) {
      toast.error("Inicia sesión para adjuntar fotos a tu comentario.");
      return;
    }
    if (!uploadsEnabled) {
      toast.error("La subida de fotos no está disponible en este momento.");
      return;
    }
    const remaining = MAX_REVIEW_PHOTOS - reviewPhotos.length;
    if (remaining <= 0) {
      toast.message(`Puedes adjuntar hasta ${MAX_REVIEW_PHOTOS} fotos.`);
      return;
    }
    const selected = Array.from(files);
    if (selected.length > remaining) {
      toast.message(`Puedes adjuntar hasta ${MAX_REVIEW_PHOTOS} fotos.`);
    }
    const next: { file: File; preview: string }[] = [];
    for (const file of selected.slice(0, remaining)) {
      const error = validateReviewPhoto(file);
      if (error) {
        toast.error(error);
        continue;
      }
      next.push({ file, preview: URL.createObjectURL(file) });
    }
    if (next.length > 0) setReviewPhotos((current) => [...current, ...next]);
  };

  const removePhoto = (index: number) => {
    setReviewPhotos((current) => {
      const photo = current[index];
      if (photo) URL.revokeObjectURL(photo.preview);
      return current.filter((_, i) => i !== index);
    });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setReviewSending(true);
    const uploaded: string[] = [];
    try {
      // Las fotos se suben recién al enviar: así no quedan archivos huérfanos
      // si la clienta abandona el formulario.
      for (const photo of reviewPhotos) {
        const compressed = await compressImage(photo.file);
        uploaded.push(await uploadToR2(compressed, `reviews/${product.id}`));
      }
      await submitReview({
        productId: product.id,
        productName: product.name,
        name: reviewName,
        text: reviewText,
        rating: reviewRating,
        photos: uploaded,
        verifiedPurchase: Boolean(verifiedOrderId),
        orderId: verifiedOrderId ?? undefined,
        userId: user?.uid,
      });
      reviewPhotos.forEach((photo) => URL.revokeObjectURL(photo.preview));
      setReviewPhotos([]);
      setReviewSent(true);
      setReviewName("");
      setReviewText("");
      setReviewRating(5);
      toast.success(
        uploaded.length > 0
          ? "Gracias. Revisaremos tu comentario y sus fotos antes de publicarlos."
          : "Gracias. Tu comentario será revisado antes de publicarse."
      );
    } catch (error) {
      // Si falla el envío, borra las fotos ya subidas para no dejar basura en R2.
      await Promise.allSettled(uploaded.map((url) => deleteFromR2(url)));
      toast.error(error instanceof Error ? error.message : "No se pudo enviar el comentario.");
    } finally {
      setReviewSending(false);
    }
  };

  return (
    <div className="container py-8 pb-80 md:py-12 lg:pb-12">
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
          <div
            className="relative aspect-[4/5] touch-pan-y overflow-hidden rounded-xl bg-secondary"
            onTouchStart={(event) => {
              if (showSpin) return;
              touchX.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              if (showSpin || touchX.current === null || slideCount < 2) return;
              const delta =
                (event.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
              touchX.current = null;
              if (Math.abs(delta) > 40) {
                if (delta < 0) next();
                else prev();
              }
            }}
          >
            {showSpin && spin ? (
              <ProductSpin
                front={spin.front}
                back={spin.back}
                alt={product.name}
                className="h-full w-full"
              />
            ) : (
              <ImageWithFallback
                src={currentImage}
                alt={`${product.name} — ${categoryLabel(product.category)} LUNÉ Activewear`}
                priority
                className="h-full w-full object-cover"
              />
            )}

            <div className="absolute left-4 top-4 flex flex-col gap-1.5">
              {product.isNew && <Badge variant="accent">Nuevo</Badge>}
              {discount > 0 && <Badge>-{discount}%</Badge>}
              {soldOut && <Badge variant="secondary">Agotado</Badge>}
            </div>

            {slideCount > 1 && (
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
                  {position} / {slideCount}
                </span>
              </>
            )}
          </div>

          {(slideCount > 1 || Boolean(spin)) && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((image, i) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => selectImage(i)}
                  className={`h-20 w-16 shrink-0 overflow-hidden rounded-md border-2 transition ${
                    i === index && !showSpin
                      ? "border-primary"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                  aria-label={`Ver imagen ${i + 1}`}
                >
                  <ImageWithFallback src={image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
              {spin && (
                <button
                  type="button"
                  onClick={showSpinSlide}
                  className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-md border-2 bg-secondary transition ${
                    showSpin ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                  aria-label="Ver el giro de 180°"
                >
                  <img
                    src={spin.front}
                    alt=""
                    className="h-full w-full object-contain p-1"
                    draggable={false}
                  />
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-background/85 py-0.5 text-[8px] uppercase tracking-wider text-muted-foreground">
                    <RotateCw className="h-2.5 w-2.5" /> Girar
                  </span>
                </button>
              )}
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
              <h1 className="hidden font-display text-3xl font-medium tracking-tight md:text-4xl lg:block">
                {product.name}
              </h1>
              {product.sku && (
                <p className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  SKU {product.sku}
                </p>
              )}
              {product.ratingCount ? (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="flex items-center gap-0.5"
                    aria-label={`${product.ratingAvg ?? 0} de 5 estrellas`}
                  >
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < Math.round(product.ratingAvg ?? 0)
                            ? "fill-primary text-primary"
                            : "text-primary/20"
                        }`}
                      />
                    ))}
                  </span>
                  <span>{(product.ratingAvg ?? 0).toFixed(1)}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {product.ratingCount} reseña{product.ratingCount === 1 ? "" : "s"}
                  </span>
                </div>
              ) : null}
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

          <div className="mt-4 hidden items-center gap-3 lg:flex">
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
            dangerouslySetInnerHTML={{ __html: richTextToDisplayHtml(product.description) }}
          />

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
                    onClick={() => selectColor(c.name)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition ${
                      color === c.name ? "border-primary" : "border-transparent"
                    } ${isColorSoldOut(product, c.name) ? "opacity-40" : ""}`}
                    aria-label={`Color ${c.name}${isColorSoldOut(product, c.name) ? " (agotado)" : ""}`}
                    title={isColorSoldOut(product, c.name) ? `${c.name} (agotado)` : c.name}
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
                const out = isSizeSoldOut(product, s, color);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSize(s);
                      const max = sizeStock(product, s, color);
                      setQty((q) => (typeof max === "number" ? Math.min(Math.max(1, q), max) : Math.max(1, q)));
                    }}
                    disabled={out}
                    title={out ? `Talla agotada en ${color}` : undefined}
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
              <p className="mt-2 text-xs text-destructive">
                Esta talla está agotada en {color}.
              </p>
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
                {currentStock === 1 ? "" : "es"} en talla {size} · {color}.
              </p>
            )}
            {currentStock !== null && currentStock > LOW_STOCK_THRESHOLD && (
              <p className="mt-2 text-xs text-muted-foreground">
                {currentStock} unidades disponibles en talla {size} · {color}.
              </p>
            )}
            {currentStock === null && (
              <p className="mt-2 text-xs text-muted-foreground">Disponible en talla {size} · {color}.</p>
            )}

            {soldOutSizes.length > 0 && (
              <div className="mt-4 rounded-lg border border-dashed border-primary/20 p-3">
                <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">
                  ¿Tu talla está agotada en {color}?
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {soldOutSizes.map((soldOutSize) => (
                    <button
                      key={soldOutSize}
                      type="button"
                      onClick={() => void handleRestock(soldOutSize)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-3 py-1.5 text-[10px] uppercase tracking-wider2 text-primary transition hover:border-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      <Bell className="h-3 w-3" />
                      Avísame talla {soldOutSize}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Te enviaremos un correo cuando repongamos esa talla. También puedes{" "}
                  <a
                    href={notifyLink(soldOutSizes[0])}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 transition hover:text-foreground"
                  >
                    escribirnos por WhatsApp
                  </a>
                  .
                </p>
              </div>
            )}
          </div>

          {/* Cantidad + agregar */}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <div className="inline-flex h-12 w-full items-center justify-between rounded-md border sm:w-32">
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
              className="hidden w-full sm:flex-1 lg:inline-flex"
              onClick={handleAdd}
              disabled={currentStock === 0}
            >
              <ShoppingBag className="h-4 w-4" />
              {currentStock === 0 ? "Agotado en este color" : "Agregar al carrito"}
            </Button>
          </div>

          <Button
            size="lg"
            variant="whatsapp"
            className="mt-3 hidden w-full lg:inline-flex"
            onClick={handleWhatsApp}
          >
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
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {reviewPagination.pageItems.map((review) => (
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
                  {review.photos.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {review.photos.map((photo, i) => (
                        <button
                          key={photo}
                          type="button"
                          onClick={() => setLightbox(photo)}
                          className="h-16 w-16 overflow-hidden rounded-md border transition hover:opacity-90"
                          aria-label={`Ampliar foto ${i + 1} de ${review.name}`}
                        >
                          <ImageWithFallback
                            src={photo}
                            alt={`Foto de la reseña de ${review.name}`}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <p className="text-xs font-medium uppercase tracking-wider2">{review.name}</p>
                    {review.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider2 text-primary">
                        <BadgeCheck className="h-3 w-3" />
                        Compra verificada
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <Pagination
              page={reviewPagination.page}
              pageSize={reviewPagination.pageSize}
              total={reviewPagination.total}
              totalPages={reviewPagination.totalPages}
              onPageChange={reviewPagination.setPage}
              onPageSizeChange={reviewPagination.setPageSize}
              itemLabel="comentarios"
              className="mt-6"
            />
          </>
        )}

        <div className="mt-10 max-w-xl rounded-xl border bg-secondary/30 p-5 md:p-6">
          <h3 className="font-display text-lg font-medium">Deja tu comentario</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Tu comentario será revisado por el equipo antes de publicarse.
          </p>
          {verifiedOrderId && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-primary">
              <BadgeCheck className="h-3.5 w-3.5" />
              Compra verificada: tu reseña llevará el sello.
            </p>
          )}

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

              <div className="space-y-2">
                <Label
                  htmlFor={user ? "review-photos" : undefined}
                  className="text-[11px] uppercase tracking-wider2 text-muted-foreground"
                >
                  Fotos (opcional)
                </Label>
                {user ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      {reviewPhotos.map((photo, i) => (
                        <div
                          key={photo.preview}
                          className="relative h-20 w-20 overflow-hidden rounded-md border"
                        >
                          <img
                            src={photo.preview}
                            alt={`Foto ${i + 1} de tu comentario`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(i)}
                            aria-label="Quitar foto"
                            className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5 shadow-sm transition hover:bg-background"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      {reviewPhotos.length < MAX_REVIEW_PHOTOS && (
                        <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-[10px] uppercase tracking-wider2 text-muted-foreground transition hover:bg-secondary/40">
                          <ImagePlus className="h-4 w-4" />
                          Añadir
                          <input
                            id="review-photos"
                            name="review-photos"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            className="sr-only"
                            onChange={(e) => {
                              addPhotos(e.target.files);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Hasta {MAX_REVIEW_PHOTOS} fotos. Se revisan antes de publicarse.
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    <Link to="/cuenta" className="underline underline-offset-2 hover:text-foreground">
                      Inicia sesión
                    </Link>{" "}
                    para adjuntar fotos y obtener el sello de compra verificada.
                  </p>
                )}
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

      {/* CTA fija en móvil/tablet: botones de compra siempre visibles. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
        <div className="container flex flex-col gap-2 px-0 sm:px-2">
          <div className="min-w-0">
            <p className="truncate text-[28px] font-bold leading-tight text-foreground">{product.name}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              <span className="truncate">
                {color} · Talla {size}
              </span>
              <span className="font-medium text-foreground">{formatCLP(product.price * qty)}</span>
              {discount > 0 && product.compareAtPrice ? (
                <>
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider2 text-accent-foreground">
                    -{discount}%
                  </span>
                  <span className="line-through">{formatCLP(product.compareAtPrice * qty)}</span>
                </>
              ) : null}
            </div>
            {product.colors.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => selectColor(c.name)}
                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition ${
                      color === c.name ? "border-primary" : "border-transparent"
                    } ${isColorSoldOut(product, c.name) ? "opacity-40" : ""}`}
                    aria-label={`Color ${c.name}${isColorSoldOut(product, c.name) ? " (agotado)" : ""}`}
                    title={isColorSoldOut(product, c.name) ? `${c.name} (agotado)` : c.name}
                  >
                    <span
                      className="h-5 w-5 rounded-full border border-primary/15"
                      style={{ backgroundColor: c.hex }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            size="lg"
            className="w-full"
            onClick={handleAdd}
            disabled={currentStock === 0}
          >
            <ShoppingBag className="h-4 w-4" />
            {currentStock === 0 ? "Agotado en este color" : "Agregar al carrito"}
          </Button>
          <Button
            size="lg"
            variant="whatsapp"
            className="w-full"
            onClick={handleWhatsApp}
          >
            Comprar por WhatsApp
          </Button>
        </div>
      </div>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Foto ampliada de la reseña"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Cerrar foto"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition hover:bg-background"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightbox}
            alt="Foto de la reseña"
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

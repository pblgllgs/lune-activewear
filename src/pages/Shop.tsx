import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowUpDown, X } from "lucide-react";
import { getProducts } from "@/lib/catalog";
import { CATEGORIES, categoryInfo } from "@/lib/categories";
import { isSizeSoldOut } from "@/lib/stock";
import { matchesQuery } from "@/lib/search";
import { breadcrumbJsonLd, collectionPageJsonLd, useSeo } from "@/lib/seo";
import { ProductCard } from "@/components/shop/ProductCard";
import { PRICE_RANGES, ShopFilters } from "@/components/shop/ShopFilters";
import type { Product } from "@/types/product";

const SORTS = [
  { id: "featured", label: "Destacados" },
  { id: "new", label: "Novedades" },
  { id: "price-asc", label: "Menor precio" },
  { id: "price-desc", label: "Mayor precio" },
];

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { categoria: pathCategory } = useParams<{ categoria?: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("featured");

  /** URL nueva por categoría: /categoria/<id>. La antigua ?categoria=<id> se redirige. */
  const legacyCategory = searchParams.get("categoria");
  const activeCategory = pathCategory ?? legacyCategory ?? "todas";
  const category = activeCategory === "todas" ? undefined : categoryInfo(activeCategory);
  const invalidCategory = activeCategory !== "todas" && !category;
  const selectedSizes = (searchParams.get("tallas") ?? "").split(",").filter(Boolean);
  const selectedColors = (searchParams.get("colores") ?? "").split(",").filter(Boolean);
  const priceRange = searchParams.get("precio") ?? "";
  const searchQuery = searchParams.get("buscar") ?? "";
  const activeFilterCount =
    selectedSizes.length + selectedColors.length + (priceRange ? 1 : 0);

  // Las URL antiguas con ?categoria= pasan a /categoria/<id> conservando filtros.
  useEffect(() => {
    if (!legacyCategory) return;
    const next = new URLSearchParams(searchParams);
    next.delete("categoria");
    const query = next.toString();
    const base = legacyCategory === "todas" ? "/tienda" : `/categoria/${legacyCategory}`;
    navigate(query ? `${base}?${query}` : base, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legacyCategory]);

  const seoPath = searchQuery
    ? "/tienda"
    : category
      ? `/categoria/${category.id}`
      : "/tienda";

  useSeo({
    title: searchQuery
      ? `Búsqueda: “${searchQuery}” — Tienda | LUNÉ Activewear`
      : category
        ? `${category.label} — Tienda | LUNÉ Activewear`
        : "Tienda — Calzas, petos, shorts y poleras | LUNÉ Activewear",
    description: searchQuery
      ? `Resultados de búsqueda para “${searchQuery}” en LUNÉ Activewear.`
      : category
        ? `${category.blurb} Descubre nuestra colección de ${category.label.toLowerCase()} LUNÉ Activewear, diseñada en Chillán, Chile, con envíos a todo el país.`
        : "Explora calzas, petos, shorts y poleras LUNÉ Activewear. Ropa deportiva femenina diseñada en Chillán, Chile, con envíos a todo el país y compra por WhatsApp.",
    path: seoPath,
    noindex: Boolean(searchQuery) || invalidCategory,
    jsonLd:
      category && !searchQuery
        ? [
            collectionPageJsonLd({
              name: `${category.label} — LUNÉ Activewear`,
              description: `${category.blurb} Colección de ${category.label.toLowerCase()} LUNÉ Activewear.`,
              path: seoPath,
            }),
            breadcrumbJsonLd([
              { name: "Inicio", path: "/" },
              { name: "Tienda", path: "/tienda" },
              { name: category.label, path: seoPath },
            ]),
          ]
        : collectionPageJsonLd({
            name: "Tienda LUNÉ Activewear",
            description:
              "Colección de ropa deportiva femenina LUNÉ Activewear: calzas, petos, shorts y poleras.",
            path: "/tienda",
          }),
  });

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list =
      activeCategory === "todas"
        ? [...products]
        : products.filter((p) => p.category === activeCategory);

    if (selectedSizes.length > 0) {
      list = list.filter((product) =>
        selectedSizes.some(
          (size) => product.sizes.includes(size) && !isSizeSoldOut(product, size)
        )
      );
    }

    if (selectedColors.length > 0) {
      list = list.filter((product) =>
        product.colors.some((color) => selectedColors.includes(color.name))
      );
    }

    const range = PRICE_RANGES.find((item) => item.id === priceRange);
    if (range) {
      list = list.filter((product) => product.price >= range.min && product.price <= range.max);
    }

    if (searchQuery.trim()) {
      list = list.filter((product) => matchesQuery(product, searchQuery));
    }

    switch (sort) {
      case "price-asc":
        return list.sort((a, b) => a.price - b.price);
      case "price-desc":
        return list.sort((a, b) => b.price - a.price);
      case "new":
        return list.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
      default:
        return list.sort(
          (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured))
        );
    }
  }, [products, activeCategory, selectedSizes, selectedColors, priceRange, searchQuery, sort]);

  /** Actualiza un parámetro de la URL sin perder los demás filtros. */
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  /** Cambia de categoría conservando los filtros activos en la URL. */
  const setCategory = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete("categoria");
    const query = next.toString();
    const base = id === "todas" ? "/tienda" : `/categoria/${id}`;
    navigate(query ? `${base}?${query}` : base);
  };

  const toggleValue = (key: string, current: string[], value: string) => {
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    setParam(key, next.length > 0 ? next.join(",") : null);
  };

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("tallas");
    next.delete("colores");
    next.delete("precio");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="container py-12 md:py-16">
      <header className="max-w-2xl">
        <p className="text-[10px] uppercase tracking-brand text-muted-foreground md:text-[11px]">
          {category ? `Tienda · ${category.label}` : "Tienda"}
        </p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight md:text-5xl">
          {invalidCategory
            ? "Categoría no encontrada"
            : category
              ? category.label
              : "Nuestra colección"}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
          {invalidCategory
            ? "La categoría que buscas no existe o cambió de nombre. Revisa toda la colección."
            : category
              ? `${category.blurb} Prendas LUNÉ Activewear diseñadas en Chillán, Chile, con envíos a todo el país y compra por WhatsApp.`
              : "Calzas, petos, shorts y poleras pensadas para moverte con comodidad y estilo. Elige tus favoritas y armá tu outfit Luné."}
        </p>
      </header>

      <div className="mt-10 flex flex-col gap-4 border-y py-4 md:flex-row md:items-center md:justify-between">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => setCategory("todas")}
            className={`shrink-0 rounded-full px-4 py-2 text-[10px] uppercase tracking-wider2 transition ${
              activeCategory === "todas"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
            }`}
          >
            Todas
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-[10px] uppercase tracking-wider2 transition ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 md:justify-end">
          <span className="text-xs text-muted-foreground">
            {loading ? "Cargando…" : `${filtered.length} producto${filtered.length === 1 ? "" : "s"}`}
          </span>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-md border border-input bg-card px-2 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6 lg:grid lg:grid-cols-[220px_1fr] lg:items-start lg:gap-10">
        <ShopFilters
          products={products}
          selectedSizes={selectedSizes}
          selectedColors={selectedColors}
          priceRange={priceRange}
          resultCount={filtered.length}
          onToggleSize={(size) => toggleValue("tallas", selectedSizes, size)}
          onToggleColor={(color) => toggleValue("colores", selectedColors, color)}
          onChangePrice={(id) => setParam("precio", priceRange === id ? null : id)}
          onClear={clearFilters}
        />

        <div>
          {searchQuery && (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-secondary px-4 py-3 lg:mt-0">
              <p className="text-xs text-muted-foreground">
                Resultados para{" "}
                <span className="font-medium text-foreground">“{searchQuery}”</span>
              </p>
              <button
                type="button"
                onClick={() => setParam("buscar", null)}
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider2 text-muted-foreground underline underline-offset-4 transition hover:text-foreground"
              >
                <X className="h-3 w-3" />
                Limpiar búsqueda
              </button>
            </div>
          )}

          {loading ? (
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:mt-0 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/5] rounded-xl bg-secondary" />
                  <div className="mt-3 h-3 w-2/3 rounded bg-secondary" />
                  <div className="mt-2 h-3 w-1/3 rounded bg-secondary" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-10 flex flex-col items-center gap-4 text-center lg:mt-0">
              {searchQuery ? (
                <>
                  <p className="font-display text-2xl">
                    No encontramos prendas para “{searchQuery}”.
                  </p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Revisa la ortografía o prueba con otra palabra.
                  </p>
                  <button
                    type="button"
                    onClick={() => setParam("buscar", null)}
                    className="rounded-md bg-primary px-5 py-2.5 text-[11px] uppercase tracking-wider2 text-primary-foreground"
                  >
                    Limpiar búsqueda
                  </button>
                </>
              ) : activeFilterCount > 0 ? (
                <>
                  <p className="font-display text-2xl">No encontramos prendas con esos filtros.</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Prueba quitando una talla, un color o el tramo de precio.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-md bg-primary px-5 py-2.5 text-[11px] uppercase tracking-wider2 text-primary-foreground"
                  >
                    Limpiar filtros
                  </button>
                </>
              ) : invalidCategory ? (
                <>
                  <p className="font-display text-2xl">No encontramos esa categoría.</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Revisa el menú de categorías o mira toda la colección.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCategory("todas")}
                    className="rounded-md bg-primary px-5 py-2.5 text-[11px] uppercase tracking-wider2 text-primary-foreground"
                  >
                    Ver toda la tienda
                  </button>
                </>
              ) : (
                <>
                  <p className="font-display text-2xl">Aún no hay prendas en esta categoría.</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Estamos preparando nuevos lanzamientos. Mientras tanto, revisa toda la colección.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCategory("todas")}
                    className="rounded-md bg-primary px-5 py-2.5 text-[11px] uppercase tracking-wider2 text-primary-foreground"
                  >
                    Ver todo
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:mt-0 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";
import { getProducts } from "@/lib/catalog";
import { CATEGORIES } from "@/lib/categories";
import { ProductCard } from "@/components/shop/ProductCard";
import type { Product } from "@/types/product";

const SORTS = [
  { id: "featured", label: "Destacados" },
  { id: "new", label: "Novedades" },
  { id: "price-asc", label: "Menor precio" },
  { id: "price-desc", label: "Mayor precio" },
];

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("featured");

  const activeCategory = searchParams.get("categoria") ?? "todas";

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const list =
      activeCategory === "todas"
        ? [...products]
        : products.filter((p) => p.category === activeCategory);

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
  }, [products, activeCategory, sort]);

  const setCategory = (id: string) => {
    if (id === "todas") {
      setSearchParams({});
    } else {
      setSearchParams({ categoria: id });
    }
  };

  return (
    <div className="container py-12 md:py-16">
      <header className="max-w-2xl">
        <p className="text-[10px] uppercase tracking-brand text-muted-foreground md:text-[11px]">
          Tienda
        </p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight md:text-5xl">
          Nuestra colección
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
          Calzas, petos, shorts y poleras pensadas para moverte con comodidad y estilo. Elige tus
          favoritas y armá tu outfit Luné.
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
            <SlidersHorizontal className="h-3.5 w-3.5" />
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

      {loading ? (
        <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[4/5] rounded-xl bg-secondary" />
              <div className="mt-3 h-3 w-2/3 rounded bg-secondary" />
              <div className="mt-2 h-3 w-1/3 rounded bg-secondary" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
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
        </div>
      ) : (
        <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

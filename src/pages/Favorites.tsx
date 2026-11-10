import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { getProducts } from "@/lib/catalog";
import { useSeo } from "@/lib/seo";
import { useWishlist } from "@/context/WishlistContext";
import { ProductCard } from "@/components/shop/ProductCard";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/lib/use-pagination";
import type { Product } from "@/types/product";

export default function Favorites() {
  const { ids, clear } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useSeo({
    title: "Tus favoritos | LUNÉ Activewear",
    description: "Las prendas LUNÉ Activewear que guardaste para volver a verlas.",
    path: "/favoritos",
    noindex: true,
  });

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  const favorites = useMemo(() => {
    const byId = new Map(products.map((product) => [product.id, product]));
    return ids.flatMap((id) => {
      const product = byId.get(id);
      return product ? [product] : [];
    });
  }, [ids, products]);

  const pagination = usePagination(favorites, {
    pageSize: 12,
    resetKey: ids.join(","),
  });

  return (
    <div className="container py-12 md:py-16">
      <header className="max-w-2xl">
        <p className="text-[10px] uppercase tracking-brand text-muted-foreground md:text-[11px]">
          Favoritos
        </p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight md:text-5xl">
          Tus prendas guardadas
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
          Guarda las prendas que te gustan y vuelve cuando quieras. Se conservan en este
          dispositivo.
        </p>
      </header>

      {loading ? (
        <p className="mt-16 text-center text-sm text-muted-foreground">Cargando favoritos…</p>
      ) : favorites.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <Heart className="h-7 w-7 text-muted-foreground" />
          </span>
          <p className="font-display text-2xl">Todavía no tienes favoritos.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Toca el corazón en cualquier prenda para guardarla aquí.
          </p>
          <Link
            to="/tienda"
            className="rounded-md bg-primary px-5 py-2.5 text-[11px] uppercase tracking-wider2 text-primary-foreground"
          >
            Ver la colección
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 flex items-center justify-between gap-4 border-b pb-3">
            <p className="text-xs text-muted-foreground">
              {favorites.length} prenda{favorites.length === 1 ? "" : "s"} guardada
              {favorites.length === 1 ? "" : "s"}
            </p>
            <button
              type="button"
              onClick={clear}
              className="text-[10px] uppercase tracking-wider2 text-muted-foreground underline underline-offset-4 transition hover:text-foreground"
            >
              Vaciar favoritos
            </button>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {pagination.pageItems.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            itemLabel="prendas"
            className="mt-10"
          />
        </>
      )}
    </div>
  );
}

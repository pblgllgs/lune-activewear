import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { getProducts } from "@/lib/catalog";
import { categoryLabel } from "@/lib/categories";
import { matchesQuery } from "@/lib/search";
import { formatCLP } from "@/lib/utils";
import { ImageWithFallback } from "@/components/shop/ImageWithFallback";
import type { Product } from "@/types/product";

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

const SUGGESTIONS = ["Calza", "Peto", "Short", "Polera", "Chocolate"];

/** Buscador con resultados en vivo, en un diálogo modal. */
export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = previous;
      window.clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!open || products.length > 0) return;
    setLoading(true);
    getProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [open, products.length]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const term = query.trim();

  const matches = useMemo(
    () => (term ? products.filter((product) => matchesQuery(product, term)) : []),
    [products, term]
  );
  const results = matches.slice(0, 6);

  if (!open) return null;

  const goToResults = () => {
    onClose();
    navigate(term ? `/tienda?buscar=${encodeURIComponent(term)}` : "/tienda");
  };

  return (
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-label="Buscar productos"
    >
      <button
        type="button"
        aria-label="Cerrar búsqueda"
        onClick={onClose}
        className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
      />

      <div className="relative mx-auto flex h-full w-full max-w-2xl flex-col bg-background shadow-xl sm:mt-20 sm:h-auto sm:max-h-[72vh] sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b p-4 sm:p-5">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                goToResults();
              }
            }}
            placeholder="Buscar calzas, petos, colores…"
            aria-label="Buscar productos"
            className="min-w-0 flex-1 bg-transparent font-display text-lg tracking-tight outline-none placeholder:text-muted-foreground/70 sm:text-xl"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar búsqueda"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/15 transition hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {!term ? (
            <div>
              <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">
                Búsquedas frecuentes
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setQuery(suggestion)}
                    className="rounded-full border border-primary/15 bg-card px-3 py-1.5 text-[10px] uppercase tracking-wider2 transition hover:border-primary/40"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Buscando…</p>
          ) : results.length === 0 ? (
            <div className="py-8 text-center">
              <p className="font-display text-xl">No encontramos “{term}”.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Prueba con otra palabra o revisa toda la colección.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate("/tienda");
                }}
                className="mt-4 rounded-md bg-primary px-5 py-2.5 text-[11px] uppercase tracking-wider2 text-primary-foreground"
              >
                Ver toda la tienda
              </button>
            </div>
          ) : (
            <ul className="divide-y">
              {results.map((product) => (
                <li key={product.id}>
                  <Link
                    to={`/producto/${product.id}`}
                    onClick={onClose}
                    className="group flex items-center gap-3 py-3"
                  >
                    <div className="h-16 w-14 shrink-0 overflow-hidden rounded-md bg-secondary">
                      <ImageWithFallback
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] uppercase tracking-wider2 text-muted-foreground">
                        {categoryLabel(product.category)}
                      </p>
                      <p className="truncate font-display text-base font-medium">{product.name}</p>
                    </div>
                    <p className="shrink-0 text-sm font-medium">{formatCLP(product.price)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {term && (
          <div className="border-t p-4 sm:p-5">
            <button
              type="button"
              onClick={goToResults}
              className="w-full rounded-md bg-primary px-5 py-2.5 text-[11px] uppercase tracking-wider2 text-primary-foreground"
            >
              {matches.length > 6 ? "Ver los" : "Ver"} {matches.length} resultado
              {matches.length === 1 ? "" : "s"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/types/product";
import { categoryLabel } from "@/lib/categories";
import { discountPercent, formatCLP } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ImageWithFallback } from "@/components/shop/ImageWithFallback";

export function ProductCard({ product }: { product: Product }) {
  const discount = discountPercent(product.price, product.compareAtPrice);

  return (
    <Link to={`/producto/${product.id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-secondary">
        <ImageWithFallback
          src={product.images[0]}
          alt={product.name}
          className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
        />

        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {product.isNew && <Badge variant="accent">Nuevo</Badge>}
          {discount > 0 && <Badge>-{discount}%</Badge>}
        </div>

        <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-primary opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-3">
        <p className="text-[10px] uppercase tracking-wider2 text-muted-foreground">
          {categoryLabel(product.category)}
        </p>
        <div className="mt-0.5 flex items-baseline justify-between gap-3">
          <h3 className="truncate font-display text-base font-medium">{product.name}</h3>
          <p className="shrink-0 text-sm font-medium">{formatCLP(product.price)}</p>
        </div>
        {discount > 0 && product.compareAtPrice && (
          <p className="mt-0.5 text-xs text-muted-foreground line-through">
            {formatCLP(product.compareAtPrice)}
          </p>
        )}
      </div>
    </Link>
  );
}

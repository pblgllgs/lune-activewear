import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Heart, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { CATEGORIES } from "@/lib/categories";
import { SearchDialog } from "@/components/shop/SearchDialog";

const links = [
  { label: "Inicio", to: "/" },
  { label: "Tienda", to: "/tienda" },
  { label: "Nosotros", to: "/nosotros" },
  { label: "Contacto", to: "/#contacto" },
];

function Wordmark() {
  return (
    <Link to="/" className="flex flex-col items-center leading-none" aria-label="LUNÉ Activewear — Inicio">
      <span className="pl-[0.35em] font-display text-2xl font-semibold tracking-[0.35em] text-primary md:text-[26px]">
        LUNÉ
      </span>
      <span className="mt-1 pl-[0.45em] text-[8px] uppercase tracking-[0.45em] text-muted-foreground md:text-[9px]">
        Activewear
      </span>
    </Link>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { count, openCart } = useCart();
  const { count: wishlistCount } = useWishlist();
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.hash]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container grid h-20 grid-cols-[1fr_auto_1fr] items-center">
        {/* Navegación escritorio / hamburguesa móvil */}
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="text-[11px] uppercase tracking-wider2 text-foreground/80 transition hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex h-10 w-10 items-center justify-center justify-self-start rounded-md transition hover:bg-secondary md:hidden"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Wordmark />

        <div className="flex items-center justify-end gap-1">
          <Link
            to="/cuenta"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md transition hover:bg-secondary"
            aria-label="Mi cuenta"
          >
            <UserRound className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md transition hover:bg-secondary"
            aria-label="Buscar productos"
            aria-haspopup="dialog"
          >
            <Search className="h-5 w-5" />
          </button>
          <Link
            to="/favoritos"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-md transition hover:bg-secondary"
            aria-label={`Ver favoritos (${wishlistCount})`}
          >
            <Heart className="h-5 w-5" />
            {wishlistCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-semibold text-accent-foreground">
                {wishlistCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={openCart}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-md transition hover:bg-secondary"
            aria-label={`Abrir carrito (${count} productos)`}
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="container flex flex-col gap-1 py-5">
            {links.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2.5 font-display text-lg tracking-wide transition hover:bg-secondary"
              >
                {link.label}
              </Link>
            ))}

            <p className="mt-4 px-2 text-[10px] uppercase tracking-brand text-muted-foreground">
              Categorías
            </p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/categoria/${cat.id}`}
                  onClick={() => setOpen(false)}
                  className="rounded-md bg-secondary px-3 py-2 text-xs uppercase tracking-wider2"
                >
                  {cat.label}
                </Link>
              ))}
            </div>

            <Link
              to="/cuenta"
              onClick={() => setOpen(false)}
              className="mt-4 flex items-center gap-2 px-2 py-2 text-[11px] uppercase tracking-wider2 text-muted-foreground"
            >
              <UserRound className="h-4 w-4" /> Mi cuenta
            </Link>

            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="mt-1 px-2 py-2 text-[11px] uppercase tracking-wider2 text-muted-foreground"
            >
              Administración
            </Link>
          </div>
        </div>
      )}
      </header>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";
import { useSeo } from "@/lib/seo";
import { getSiteContent } from "@/lib/site-content";
import Home from "@/pages/Home";

const Shop = lazy(() => import("@/pages/Shop"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const Favorites = lazy(() => import("@/pages/Favorites"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const About = lazy(() => import("@/pages/About"));
const Account = lazy(() => import("@/pages/Account"));
const Admin = lazy(() => import("@/pages/Admin"));
const Guides = lazy(() => import("@/pages/Guides"));
const GuideDetail = lazy(() => import("@/pages/GuideDetail"));

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
}

function NotFound() {
  const { pathname } = useLocation();

  useSeo({
    title: "Página no encontrada | LUNÉ Activewear",
    description: "La página que buscas no existe o cambió de dirección.",
    path: pathname,
    noindex: true,
  });

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-[10px] uppercase tracking-brand text-muted-foreground">Error 404</p>
      <h1 className="font-display text-4xl font-medium">Esta página no existe.</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Puede que el enlace haya cambiado. Vuelve al inicio o revisa la colección.
      </p>
      <Link
        to="/"
        className="rounded-md bg-primary px-6 py-3 text-[11px] uppercase tracking-wider2 text-primary-foreground"
      >
        Volver al inicio
      </Link>
    </div>
  );
}

function RouteFallback() {
  return (
    <div className="container py-24 text-center text-sm text-muted-foreground">
      Cargando…
    </div>
  );
}

function App() {
  useEffect(() => {
    void getSiteContent();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <ScrollToTop />
            <Toaster richColors position="top-right" />
            <div className="flex min-h-screen flex-col bg-background">
              <AnnouncementBar />
              <Navbar />
              <main className="flex-1">
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/tienda" element={<Shop />} />
                    <Route path="/categoria/:categoria" element={<Shop />} />
                    <Route path="/producto/:id" element={<ProductDetail />} />
                    <Route path="/favoritos" element={<Favorites />} />
                    <Route path="/guias" element={<Guides />} />
                    <Route path="/guias/:slug" element={<GuideDetail />} />
                    <Route path="/privacidad" element={<Privacy />} />
                    <Route path="/nosotros" element={<About />} />
                    <Route path="/cuenta" element={<Account />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </main>
              <Footer />
              <CartDrawer />
              <CookieBanner />
              <WhatsAppFloat />
            </div>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

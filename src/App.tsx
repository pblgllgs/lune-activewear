import { useEffect } from "react";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { CartProvider } from "@/context/CartContext";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";
import Home from "@/pages/Home";
import Shop from "@/pages/Shop";
import ProductDetail from "@/pages/ProductDetail";
import About from "@/pages/About";
import Admin from "@/pages/Admin";

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
}

function NotFound() {
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

function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <ScrollToTop />
        <Toaster richColors position="top-right" />
        <div className="flex min-h-screen flex-col bg-background">
          <AnnouncementBar />
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/tienda" element={<Shop />} />
              <Route path="/producto/:id" element={<ProductDetail />} />
              <Route path="/nosotros" element={<About />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <CartDrawer />
          <WhatsAppFloat />
        </div>
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;

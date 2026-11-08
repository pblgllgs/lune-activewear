import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import {
  EMAIL,
  LOCATION,
  SOCIAL,
  WHATSAPP_DISPLAY,
  whatsappLink,
} from "@/lib/constants";
import { CATEGORIES } from "@/lib/categories";
import { openCookiePreferences } from "@/lib/consent";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

const helpLinks = [
  { label: "Preguntas frecuentes", to: "/#preguntas" },
  { label: "Envíos y devoluciones", to: "/#preguntas" },
  { label: "Guía de tallas", to: "/#preguntas" },
  { label: "Nosotros", to: "/nosotros" },
  { label: "Contacto", to: "/#contacto" },
  { label: "Política de datos", to: "/privacidad" },
];

export function Footer() {
  const [email, setEmail] = useState("");

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    const text = `Hola Luné! Quiero recibir novedades y lanzamientos. Mi correo es: ${email}`;
    window.open(whatsappLink(text), "_blank", "noopener,noreferrer");
    setEmail("");
  };

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.3fr]">
          {/* Marca */}
          <div>
            <Link to="/" className="inline-flex flex-col leading-none">
              <span className="pl-[0.35em] font-display text-2xl font-semibold tracking-[0.35em]">
                LUNÉ
              </span>
              <span className="mt-1 pl-[0.45em] text-[8px] uppercase tracking-[0.45em] text-primary-foreground/60">
                Activewear
              </span>
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-primary-foreground/70">
              Ropa deportiva femenina diseñada en Chillán, Chile. Prendas para acompañarte dentro y
              fuera del gimnasio, con comodidad y estilo.
            </p>
            <div className="mt-6 flex gap-2">
              <a
                href={SOCIAL.instagram}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram de Luné"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/25 transition hover:border-primary-foreground hover:bg-primary-foreground hover:text-primary"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
              <a
                href={SOCIAL.whatsapp}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp de Luné"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/25 transition hover:border-primary-foreground hover:bg-primary-foreground hover:text-primary"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Tienda */}
          <div>
            <h3 className="text-[11px] uppercase tracking-brand text-primary-foreground/50">Tienda</h3>
            <ul className="mt-5 space-y-3 text-sm text-primary-foreground/80">
              <li>
                <Link to="/tienda" className="transition hover:text-primary-foreground">
                  Ver todo
                </Link>
              </li>
              {CATEGORIES.map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/categoria/${cat.id}`}
                    className="transition hover:text-primary-foreground"
                  >
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Ayuda */}
          <div>
            <h3 className="text-[11px] uppercase tracking-brand text-primary-foreground/50">Ayuda</h3>
            <ul className="mt-5 space-y-3 text-sm text-primary-foreground/80">
              {helpLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="transition hover:text-primary-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={openCookiePreferences}
                  className="text-left transition hover:text-primary-foreground"
                >
                  Preferencias de cookies
                </button>
              </li>
            </ul>
          </div>

          {/* Contacto + newsletter */}
          <div>
            <h3 className="text-[11px] uppercase tracking-brand text-primary-foreground/50">
              Hablemos
            </h3>
            <ul className="mt-5 space-y-3 text-sm text-primary-foreground/80">
              <li>
                <a
                  href={SOCIAL.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 transition hover:text-primary-foreground"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" /> {WHATSAPP_DISPLAY}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${EMAIL}`}
                  className="flex items-center gap-2 transition hover:text-primary-foreground"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" /> {EMAIL}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0" /> {LOCATION}
              </li>
            </ul>

            <h3 className="mt-7 text-[11px] uppercase tracking-brand text-primary-foreground/50">
              Novedades
            </h3>
            <form onSubmit={handleNewsletter} className="mt-3 flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Tu correo"
                className="h-10 w-full min-w-0 rounded-md border border-primary-foreground/25 bg-transparent px-3 text-sm text-primary-foreground placeholder:text-primary-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-foreground/60"
              />
              <button
                type="submit"
                aria-label="Suscribirme a las novedades"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-foreground text-primary transition hover:opacity-90"
              >
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </form>
            <p className="mt-2 text-[11px] text-primary-foreground/50">
              Lanzamientos y ofertas, directo a tu correo.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-primary-foreground/15">
        <div className="container flex flex-col items-center justify-between gap-3 py-5 text-center text-[11px] text-primary-foreground/60 sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} LUNÉ Activewear · Diseñado en Chillán, Chile</p>
          <div className="flex items-center gap-4">
            <p>Sporty · Feminine · Modern</p>
            <Link to="/admin" className="transition hover:text-primary-foreground">
              Administración
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

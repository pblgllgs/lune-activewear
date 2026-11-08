# LUNÉ Activewear

Tienda online de ropa deportiva femenina construida sobre el patrón del proyecto
**solar-energy**: React 19 + Vite + TypeScript + Tailwind CSS 3 + shadcn/ui + Firebase
(Auth + Firestore) + Cloudflare R2.

> Marca: **LUNÉ Activewear** · Chillán, Chile · Sporty · Feminine · Modern

## Desarrollo

```bash
npm install
npm run dev
```

La tienda funciona **sin configurar nada**: si no hay credenciales de Firebase se muestra
un catálogo de demostración con imágenes de referencia. El panel `/admin` queda en modo
informativo hasta conectar Firebase.

## Configuración

1. Copia `.env.example` a `.env` y completa las variables.
2. Crea un proyecto en Firebase y habilita **Authentication** (email/contraseña y Google)
   y **Firestore**.
3. Publica las reglas: `firebase deploy --only firestore:rules` (o pégalas desde
   `firestore.rules`).
4. Agrega los emails administradores en `VITE_ADMIN_EMAILS` y en `firestore.rules`.
5. Crea el usuario administrador en Firebase Authentication.
6. (Opcional) Despliega el worker de R2 para subir imágenes:
   ```bash
   cd worker
   npm install
   npx wrangler secret put UPLOAD_TOKEN
   npm run deploy
   ```
   Luego define `VITE_R2_WORKER_URL` y `VITE_UPLOAD_TOKEN`.

## Scripts

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (`prebuild` sitemap → `tsc -b && vite build` → `postbuild` páginas SEO) |
| `npm run preview` | Previsualiza el build (no aplica `_redirects`) |
| `npm run sitemap` | Regenera `public/sitemap.xml` desde Firestore |
| `npm run lint` | oxlint |

## Estructura

```
src/
  components/
    admin/       ContentManager (hero e imágenes de Nosotros)
    contact/     ContactSection (formulario → WhatsApp)
    layout/      AnnouncementBar, Navbar, Footer, CartDrawer, WhatsAppFloat
    shop/        ProductCard, ShopFilters, SearchDialog, SizeGuide, ImageWithFallback,
                 SectionHeading, FaqSection
    ui/          Componentes shadcn/ui
  context/       CartContext (carrito) y WishlistContext (favoritos), ambos en localStorage
  lib/           firebase, catalog (datos demo + Firestore), stock, size-guide, search,
                 site-content, seo (metadatos + JSON-LD), upload (R2), utils, constants
  pages/         Home, Shop, ProductDetail, Favorites, Privacy, About, Admin
  types/         Product, ProductColor
scripts/         sitemap y páginas estáticas de SEO (pre/post build) + test del edge
functions/       Pages Functions (edge): meta de productos y sitemap dinámico
worker/          Cloudflare Worker para R2 (upload/serve/delete)
```

## Rutas

| Ruta | Contenido |
|---|---|
| `/` | Home: hero, categorías, destacados, FAQ y contacto |
| `/tienda` | Catálogo completo con filtros y orden |
| `/categoria/<id>` | Categoría con URL propia e indexable (`calzas`, `petos`, `shorts`, `poleras`) |
| `/producto/:id` | Ficha de producto con guía de tallas, stock y WhatsApp |
| `/favoritos` | Wishlist del dispositivo (`noindex`) |
| `/privacidad` | Política de datos (Ley 21.719) y cookies |
| `/nosotros` | Historia de la marca |
| `/admin` | Panel de administración (`noindex`) |

## Datos

- Colección Firestore: `products`.
- Cada documento: `name`, `category`, `price`, `compareAtPrice?`, `description`,
  `composition?`, `care?`, `shipping?`, `sizes[]`, `stockBySize{}`, `sizeGuide[]`,
  `colors[{name,hex}]`, `images[]`, `featured`, `isNew`, `createdAt`, `updatedAt`.
- `stockBySize`: unidades por talla; una talla ausente o `null` se considera sin límite,
  `0` significa agotada.
- `sizeGuide`: filas `{ size, bustMin, bustMax, waistMin, waistMax, hipMin, hipMax }` con
  medidas del cuerpo en cm. Si el producto no las define, se usan las de
  `DEFAULT_SIZE_GUIDE` (`src/lib/size-guide.ts`). Se edita por producto en Admin.
- Documento `settings/site`: `heroSlides[{url, fit, position}]` (carrusel del inicio),
  `heroImage`/`heroImages` (compatibilidad), `aboutImageOne`, `aboutImageTwo`; editable
  desde Admin → Contenido. `fit` es `contain` (foto completa) o `cover` (rellena y recorta)
  y `position` (`center`/`top`/`bottom`) elige el encuadre.
- En Admin → Contenido las imágenes se agregan solo subiéndolas (sin campos de URL). Al
  subir una foto se detecta su orientación: vertical → `contain`, horizontal → `cover`;
  el ajuste y el encuadre se pueden cambiar por slide.
- Las imágenes se guardan en R2 bajo `products/<slug>/` y `site/`.

## SEO

- `src/lib/seo.ts` (`useSeo`) actualiza título, descripción, canonical, Open Graph, Twitter
  y JSON-LD en cada ruta.
- `prebuild` genera `public/sitemap.xml` desde Firestore.
- `postbuild` genera HTML estático con metadatos propios para `/tienda`, `/nosotros`,
  `/admin` y cada producto, más las reglas de `_redirects` y `dist/_routes.json`.
- `functions/` (Pages Functions) sirve `/producto/<slug>` y `/sitemap.xml` en el edge: leen
  Firestore en cada petición e inyectan title, description, canonical, Open Graph, Twitter
  y JSON-LD, así que **un producto nuevo ya tiene meta propia sin redesplegar**. Los
  slugs inexistentes devuelven 404 con `noindex`. `dist/_routes.json` limita las
  invocaciones de Functions a esas dos rutas.
- `VITE_SITE_URL` define canonical, Open Graph y sitemap. La URL actual
  (`https://lune-activewear.pages.dev`) es provisoria: al comprar el dominio definitivo
  basta cambiarla y redesplegar.

## Pendientes de personalización

- Confirmar `INSTAGRAM` en `src/lib/constants.ts` (WhatsApp y correo ya son reales).
- Reemplazar las imágenes de demostración por fotos reales de las prendas.
- Ajustar precios, tallas y descripciones en el panel admin.

## Despliegue

Cloudflare Pages: build `npm run build`, output `dist`. `public/_redirects` se regenera en
el `postbuild` con las rutas estáticas de SEO y el catch-all de la SPA; `public/_headers`
aplica `noindex` a `/admin`.

El proyecto de Pages está conectado al repositorio de GitHub: **cada `git push` a `master`
compila y publica solo**. No hace falta ejecutar `npx wrangler pages deploy` (genera
despliegues duplicados).

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
2. Crea un proyecto en Firebase y habilita **Authentication** (email/contraseña, Google y
   **Email link** para las clientas) y **Firestore**.
3. Publica las reglas: `firebase deploy --only firestore:rules` (o pégalas desde
   `firestore.rules`).
4. Agrega los emails administradores en `VITE_ADMIN_EMAILS` y en `firestore.rules`.
5. Crea el usuario administrador en Firebase Authentication.
6. Autoriza los dominios de la app en Authentication → Settings → Authorized domains
   (`localhost` y el dominio de Pages) para que funcione el enlace mágico.
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
    ui/          Componentes shadcn/ui + Pagination reutilizable
  context/       CartContext (carrito), WishlistContext (favoritos) y AuthContext (sesión)
  lib/           firebase, auth (magic link), auth-settings, catalog (datos demo + Firestore),
                 stock, size-guide, search, site-content, seo (metadatos + JSON-LD), upload
                 (R2), use-pagination, utils, constants
  pages/         Home, Shop, ProductDetail, Favorites, Account, Privacy, About, Admin
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
| `/cuenta` | Acceso de clientas con enlace al correo y «Mis pedidos» (`noindex`) |
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
- En el formulario de producto las fotos también se eligen solo con el selector de
  archivos (múltiple); no hay entrada manual de URLs.
- Las imágenes se guardan en R2 bajo `products/<slug>/` y `site/`.
- Documento `settings/auth`: `magicLinkEnabled` controla el enlace mágico de `/cuenta`
  (lectura pública, escritura admin). Se activa o desactiva en Admin → Ajustes; si no
  existe, se asume activo.
- Colección `orders`: además de los datos de la clienta, cada orden guarda
  `customerEmail` (minúsculas) y `userId` (si hay sesión) para «Mis pedidos».

## Descripción enriquecida

La descripción del producto se edita con un editor liviano
(`src/components/admin/RichTextEditor.tsx`) que permite negrita, cursiva, subrayado,
título, párrafo, listas, enlaces y quitar formato.

- Se guarda HTML saneado con **DOMPurify** (`src/lib/rich-text.ts`) y se vuelve a sanear
  al mostrarlo en la ficha y en la vista previa.
- Las descripciones antiguas en texto plano se siguen viendo igual, con sus saltos de
  línea.
- El SEO (meta, JSON-LD y páginas estáticas) usa el texto plano de la descripción.

## Paginación

Todas las listas y tablas dinámicas usan paginación local en el cliente con
`src/lib/use-pagination.ts` (`usePagination`) y `src/components/ui/pagination.tsx`.

- Muestra el rango visible («Mostrando 1–10 de 34»), números con elipsis,
  anterior/siguiente y un selector **Por página**.
- Se oculta sola cuando toda la lista cabe en una página.
- Vuelve a la página 1 al cambiar búsqueda, filtros u orden (`resetKey`) y se ajusta si se
  elimina el último elemento de la página actual.

| Lugar | Lista / tabla | Por página |
|---|---|---|
| `/tienda` y `/categoria/*` | Productos | 12 |
| `/favoritos` | Prendas guardadas | 12 |
| `/cuenta` | Mis pedidos | 10 |
| Admin → Productos | Catálogo | 10 |
| Admin → Inventario | Tabla de inventario | 10 |
| Admin → Proveedores | Proveedores | 10 |
| Admin → Proveedores (desplegado) | Productos del proveedor | 6 |
| Admin → Proveedores (formulario) | Selector de productos | 12 |
| Admin → Proveedores (compra) | Historial de compras | 5 |
| Admin → Órdenes de compra | Historial de órdenes | 10 |
| Admin → Comentarios | Pendientes de revisión | 10 |
| Ficha de producto | Comentarios aprobados | 6 |

No se paginan las listas limitadas por diseño (4 destacados del inicio, 6 resultados del
buscador rápido, carrito, slides ordenables de Contenido) ni las tablas estáticas
(legales, FAQ, guía de tallas).

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

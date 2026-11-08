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
| `npm run build` | Build de producción (`tsc -b && vite build`) |
| `npm run preview` | Previsualiza el build |
| `npm run lint` | oxlint |

## Estructura

```
src/
  components/
    contact/     ContactSection (formulario → WhatsApp)
    layout/      AnnouncementBar, Navbar, Footer, CartDrawer, WhatsAppFloat
    shop/        ProductCard, ImageWithFallback, SectionHeading
    ui/          Componentes shadcn/ui
  context/       CartContext (carrito persistido en localStorage)
  lib/           firebase, catalog (datos demo + Firestore), upload (R2), utils, constants
  pages/         Home, Shop, ProductDetail, About, Admin
  types/         Product, ProductColor
worker/          Cloudflare Worker para R2 (upload/serve/delete)
```

## Datos

- Colección Firestore: `products`.
- Cada documento: `name`, `category`, `price`, `compareAtPrice?`, `description`,
  `composition?`, `care?`, `shipping?`, `sizes[]`, `colors[{name,hex}]`, `images[]`,
  `featured`, `isNew`, `createdAt`, `updatedAt`.
- Las imágenes se guardan en R2 bajo `products/<slug>/`.

## Pendientes de personalización

- Reemplazar `WHATSAPP_NUMBER`, `EMAIL`, `INSTAGRAM` y `LOCATION` en `src/lib/constants.ts`.
- Reemplazar las imágenes de demostración por fotos reales de las prendas.
- Ajustar precios, tallas y descripciones en el panel admin.

## Despliegue

Cloudflare Pages: build `npm run build`, output `dist`. El archivo `public/_redirects`
resuelve el routing de la SPA.

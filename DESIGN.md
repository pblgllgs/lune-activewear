# Sistema de diseño — LUNÉ Activewear

## Identidad

Marca de ropa deportiva femenina de Chillán, Chile. Editorial, cálida y sofisticada:
la ropa es protagonista y los colores de la web transmiten delicadeza sin perder
energía. **Sporty · Feminine · Modern.**

## Paleta

| Uso | Color | Hex |
|---|---|---|
| Fondo principal | Porcelana Mist | `#F8F5F1` |
| Secciones destacadas | Crema suave | `#EEE7DF` |
| Botones y texto principal | Chocolate | `#49372D` |
| Detalles y etiquetas | Rosa empolvado | `#EADDE0` |
| Detalles neutros | Taupe cálido | `#B9A99C` |
| Tarjetas y espacios | Marfil blanco | `#FFFFFF` |
| Pie de página | Chocolate + texto porcelana | — |

Proporción recomendada: **70%** porcelana/blanco, **20%** chocolate/crema,
**10%** rosa empolvado/taupe.

Variables HSL en `src/index.css` (`--background`, `--primary`, `--secondary`, `--accent`…).
El rosa empolvado se usa como **fondo decorativo**, no para textos pequeños.

## Tipografía

- **Display / títulos:** Jost (geométrica, 300–600). Títulos con `tracking-tight`.
- **Cuerpo:** Inter (300–600).
- **Eyebrows / etiquetas:** mayúsculas, `tracking-[0.18em]` a `[0.3em]`, 10–11 px.
- Wordmark: `LUNÉ` con `tracking-[0.35em]` + `ACTIVEWEAR` debajo con mayor tracking.

## Componentes

- **Botones:** chocolate sólido, texto porcelana, mayúsculas pequeñas con tracking.
  Variante outline con borde chocolate al 25 %.
- **Tarjetas:** blancas, borde hairline (`--border`), radio 12 px, sin sombras fuertes.
- **Badges:** píldora, mayúsculas 10 px. `accent` (rosa) para "Nuevo", chocolate para descuentos.
- **Imágenes de producto:** proporción **4:5**, `object-cover`, mucho aire alrededor.
- **Separación:** generosa. Secciones `py-16 md:py-24`; grillas con `gap-y-10`.

## Tono de comunicación

Cercano, femenino y directo. Mezcla de español chileno neutro con guiños editoriales en
inglés (`Move with Luné`, `Confidence in every move`). Evitar tecnicismos y mayúsculas
sostenidas en párrafos.

## Referencias visuales

Las capturas de referencia están en la raíz del proyecto (`*.jpg`): hero con imagen
grande + panel crema, grilla "Encuentra tu estilo" (Calzas, Petos, Shorts, Poleras),
statement en rosa empolvado y footer chocolate con wordmark centrado.

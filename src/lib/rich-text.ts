import DOMPurify from "dompurify";

/**
 * Etiquetas permitidas en la descripción enriquecida. Se dejan fuera estilos,
 * scripts, iframes y cualquier atributo de evento.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "h3",
  "h4",
  "blockquote",
  "a",
  "div",
  "span",
];

const ALLOWED_ATTR = ["href", "title", "target", "rel"];

/** Limpia el HTML de la descripción y deja solo etiquetas seguras. */
export function sanitizeRichText(value: string): string {
  if (!value) return "";
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

/** Convierte la descripción enriquecida a texto plano (SEO, búsquedas, conteos). */
export function richTextToPlainText(value: string): string {
  if (!value) return "";
  if (typeof document === "undefined") {
    return value
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  const container = document.createElement("div");
  container.innerHTML = value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, " ");
  return (container.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** ¿La descripción no tiene contenido visible? */
export function richTextIsEmpty(value: string): boolean {
  return richTextToPlainText(value).length === 0;
}

/** Escapa texto plano para insertarlo como HTML sin interpretar etiquetas. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * HTML listo para mostrar en la ficha:
 * - descripciones nuevas con etiquetas → se sanean;
 * - descripciones antiguas en texto plano → se respetan los saltos de línea.
 */
export function richTextToDisplayHtml(value: string): string {
  if (!value?.trim()) return "";
  const hasMarkup = /<[a-z][\s\S]*>/i.test(value);
  if (!hasMarkup) {
    const normalized = value.replace(/\\r\\n|\\n|\\r/g, "\n");
    return escapeHtml(normalized).replace(/\r?\n/g, "<br />");
  }
  return sanitizeRichText(value);
}

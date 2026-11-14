/** Respuestas JSON homogéneas para las Pages Functions. */

export function json(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

export function methodNotAllowed(): Response {
  return json({ error: "Método no permitido." }, 405, { allow: "POST" });
}

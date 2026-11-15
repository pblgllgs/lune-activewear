/**
 * Levanta Vite y las Pages Functions en la misma terminal (`npm run dev:all`).
 *
 * Vite no ejecuta las Functions de `functions/`, así que en desarrollo hay dos
 * procesos: `npm run dev` (web en :5173) y `npm run dev:api` (wrangler en
 * :8788, al que Vite pasa `/api/*`). Si el segundo no está corriendo, el proxy
 * responde 502 y fallan los correos, la prueba de correo y la reposición.
 *
 * `wrangler pages dev` sirve los archivos estáticos de `dist/`: si falta, hay
 * que compilar una vez con `npm run build` (las Functions se leen del código
 * fuente, así que los cambios en `functions/` no necesitan rebuild).
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

if (!existsSync("dist/index.html")) {
  console.error(
    "[dev:all] Falta la carpeta dist/. Ejecuta `npm run build` una vez y vuelve a intentarlo."
  );
  process.exit(1);
}

const isWindows = process.platform === "win32";
const npm = isWindows ? "npm.cmd" : "npm";

let stopping = false;

function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (isWindows) {
      // npm lanza un proceso hijo: hay que matar el árbol completo.
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  }
  process.exitCode = code;
}

const children = [
  { name: "web", args: ["run", "dev"] },
  { name: "api", args: ["run", "dev:api"] },
].map(({ name, args }) => {
  const child = spawn(npm, args, { stdio: "inherit", shell: isWindows });
  child.on("exit", (code) => {
    if (stopping) return;
    console.log(`\n[dev:all] ${name} terminó (código ${code ?? 0}). Cerrando el resto.`);
    stop(code ?? 0);
  });
  child.on("error", (error) => {
    console.error(`[dev:all] no se pudo iniciar ${name}: ${error.message}`);
    stop(1);
  });
  return child;
});

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

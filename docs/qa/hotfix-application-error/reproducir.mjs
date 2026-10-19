// Reproducción del «Application error: a client-side exception has occurred» y prueba del hotfix.
// Documento: docs/plans/hotfix_application_error_plan.md
//
// Simula lo que pasa tras un despliegue: el HTML ya está en el navegador, pero los chunks que
// se piden DESPUÉS (los diferidos: toaster/Modal del layout raíz, fibras del hero) ya no
// existen en el servidor → 404.
//
// Requisitos: un build de producción servido (`npm run build:safe && npm start`, puerto 3001).
// Usa el playwright-core y el Chromium que ya trae axi-server (no instala nada).
//
//   node docs/qa/hotfix-application-error/reproducir.mjs                 # /auth/login, 404 siempre
//   node docs/qa/hotfix-application-error/reproducir.mjs --once          # 404 solo en la 1.ª carga
//   node docs/qa/hotfix-application-error/reproducir.mjs --path=/        # la home (fibras del hero)
//   BASE=http://localhost:3001 node docs/qa/hotfix-application-error/reproducir.mjs
//
// Resultado esperado
//   ANTES del hotfix: «Application error» en pantalla → REPRODUCIDO.
//   CON el hotfix:    la página sigue usable, como mucho UNA recarga, y llega al menos un
//                     POST a /api/client-errors (la línea `client_error` sale en la consola del
//                     `npm start`).
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../../../axi-server/package.json"));
const { chromium } = require("playwright-core");

const BASE = process.env.BASE ?? "http://localhost:3001";
const args = process.argv.slice(2);
const once = args.includes("--once");
const path = (args.find((a) => a.startsWith("--path="))?.slice(7)) ?? "/auth/login";
const out = join(here, "evidencia");
mkdirSync(out, { recursive: true });

// Los chunks del HTML inicial se sirven; los que se pidan después, no (como tras un swap).
const html = await (await fetch(BASE + path)).text();
const initial = new Set([...html.matchAll(/\/_next\/static\/[^"'\\\s]+\.js/g)].map((m) => m[0]));

const browser = await chromium.launch();
const page = await browser.newPage();
let loads = 0;
let blocked = 0;
const reports = [];
// Cargas = peticiones de documento del marco principal (una recarga = una más). No
// `framenavigated`: el router de Next hace replaceState al hidratar y contaría de más.
page.on("request", (r) => r.isNavigationRequest() && r.frame() === page.mainFrame() && (loads += 1));
page.on("request", (r) => r.url().includes("/api/client-errors") && reports.push(r.postData()));
await page.route("**/_next/static/chunks/**", (route) => {
  const p = new URL(route.request().url()).pathname;
  if (initial.has(p) || (once && loads > 1)) return route.continue();
  blocked += 1;
  return route.fulfill({ status: 404, body: "Not Found" });
});

await page.goto(BASE + path, { waitUntil: "load" });
// El toaster se pide en el primer reposo (≤ 2,5 s); dejamos margen para la recarga.
await page.waitForTimeout(8000);

const body = await page.locator("body").innerText();
const crashed = body.includes("Application error");
const branded = body.includes("Algo no cargó bien");
const shot = join(out, `${path.replace(/\W+/g, "_") || "home"}-${once ? "once" : "always"}.png`);
await page.screenshot({ path: shot, fullPage: false });
await browser.close();

console.log(JSON.stringify({ path, mode: once ? "once" : "always", chunksBloqueados: blocked, cargas: loads, reportes: reports.length, pantallaGenerica: crashed, pantallaDeMarca: branded, captura: shot }, null, 2));
if (crashed) console.log("→ REPRODUCIDO: Next pintó «Application error» (comportamiento ANTES del hotfix).");
else if (loads > 2) console.log("→ FALLO: más de una recarga (posible bucle).");
else console.log("→ OK: sin pantalla genérica; recargas = " + (loads - 1) + ".");
process.exit(crashed || loads > 2 ? 1 : 0);

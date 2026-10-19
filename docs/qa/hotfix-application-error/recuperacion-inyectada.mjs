// Prueba de la CAPA 2 (script de recuperación en línea) sobre cualquier entorno YA desplegado,
// sin build local: inyecta CHUNK_RECOVERY_SCRIPT (leído de src/core/lib/chunk-recovery.ts) con
// addInitScript, bloquea con 404 los chunks que no venían en el HTML (como tras un swap) e
// intercepta el beacon de telemetría EN LOCAL (no llega nada al servidor; solo hace GET).
//
//   node docs/qa/hotfix-application-error/recuperacion-inyectada.mjs /auth/login once
//   node docs/qa/hotfix-application-error/recuperacion-inyectada.mjs /auth/login always
//   BASE=https://axi-connect.co OUT=/ruta/capturas node ...
//
// Esperado: `once` → loads 2 (una recarga), crashed false. `always` → loads 2 (sin bucle).
// Documento: docs/plans/hotfix_application_error_plan.md
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(new URL("../../../../axi-server/package.json", import.meta.url));
const { chromium } = require("playwright-core");
const src = readFileSync(new URL("../../../src/core/lib/chunk-recovery.ts", import.meta.url), "utf8");
let script = src.split("export const CHUNK_RECOVERY_SCRIPT = `")[1].split("`;")[0]
  .replace("${JSON.stringify(CHUNK_RELOAD_KEY)}", '"axi:chunk-reload"').replace("${CHUNK_RELOAD_WINDOW_MS}", "30000")
  .replace("${JSON.stringify(CLIENT_ERRORS_ENDPOINT)}", '"/api/client-errors"');
const BASE = process.env.BASE ?? "https://axi-connect.co", path = process.argv[2] ?? "/auth/login", mode = process.argv[3] ?? "once";
const html = await (await fetch(BASE + path)).text();
const initial = new Set([...html.matchAll(/\/_next\/static\/[^"'\\\s]+\.js/g)].map((m) => m[0]));
const browser = await chromium.launch(); const page = await browser.newPage();
await page.addInitScript(script);
let loads = 0, blocked = 0; const reports = [];
page.on("request", (r) => r.isNavigationRequest() && r.frame() === page.mainFrame() && (loads += 1));
await page.route("**/api/client-errors", (r) => { reports.push(r.request().postData()); return r.fulfill({ status: 204 }); });
await page.route("**/_next/static/chunks/**", (route) => {
  const p = new URL(route.request().url()).pathname;
  if (initial.has(p) || (mode === "once" && loads > 1)) return route.continue();
  blocked += 1; return route.fulfill({ status: 404, body: "Not Found" });
});
await page.goto(BASE + path, { waitUntil: "load" }); await page.waitForTimeout(9000);
const body = await page.locator("body").innerText();
await page.screenshot({ path: `${process.env.OUT ?? "/tmp"}/inject-${path.replace(/\W+/g, "_")}-${mode}.png` });
console.log(JSON.stringify({ path, mode, blocked, loads, reports: reports.length, firstReport: reports[0], crashed: body.includes("Application error"), loginVisible: body.includes("Ingresar") }));
await browser.close();

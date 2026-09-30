#!/usr/bin/env node
/**
 * Presupuesto de JavaScript por ruta (programa «Landing cinematográfica», F0).
 *
 * Lee los manifiestos de un `next build` ya hecho y calcula, por ruta, el JS
 * de primera carga comprimido con gzip: los chunks raíz (`rootMainFiles`) más
 * los de la página y todos sus layouts, sin repetir. Falla si una ruta supera
 * su techo en `scripts/bundle-budget.json`.
 *
 * Uso:
 *   npm run build && npm run budget          # comprueba
 *   node scripts/check-bundle-budget.mjs --report   # solo imprime la tabla
 *
 * Por qué no parsear la salida de `next build`: es texto para humanos, cambia
 * de formato entre versiones y no está disponible en un build cacheado.
 */
import { gzipSync } from "node:zlib";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const NEXT = path.join(ROOT, ".next");
const BUDGET_FILE = path.join(ROOT, "scripts", "bundle-budget.json");
const reportOnly = process.argv.includes("--report");

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

if (!existsSync(path.join(NEXT, "app-build-manifest.json"))) {
  console.error("No hay build: corre `npm run build` antes del presupuesto.");
  process.exit(2);
}

const appManifest = readJson(path.join(NEXT, "app-build-manifest.json")).pages;
const buildManifest = readJson(path.join(NEXT, "build-manifest.json"));
const rootFiles = (buildManifest.rootMainFiles ?? []).filter((f) => f.endsWith(".js"));

const gzCache = new Map();
function gz(file) {
  if (!gzCache.has(file)) {
    const abs = path.join(NEXT, file);
    gzCache.set(file, existsSync(abs) ? gzipSync(readFileSync(abs)).length : 0);
  }
  return gzCache.get(file);
}

/** `/(public)/page` → `/`; `/(private)/(content)/dashboard/page` → `/dashboard`. */
function routeOf(entry) {
  const clean = entry
    .replace(/\/page$/, "")
    .split("/")
    .filter((s) => s && !(s.startsWith("(") && s.endsWith(")")) && !s.startsWith("@"))
    .join("/");
  return "/" + clean;
}

/** Los layouts de una página: todos los prefijos de su ruta de archivo. */
function layoutsOf(entry) {
  const parts = entry.replace(/\/page$/, "").split("/").filter(Boolean);
  const out = ["/layout"];
  for (let i = 1; i <= parts.length; i++) out.push("/" + parts.slice(0, i).join("/") + "/layout");
  return out.filter((l) => appManifest[l]);
}

function firstLoad(entry) {
  const files = new Set(rootFiles);
  for (const key of [...layoutsOf(entry), entry]) for (const f of appManifest[key] ?? []) if (f.endsWith(".js")) files.add(f);
  let total = 0;
  for (const f of files) total += gz(f);
  return total;
}

const shared = rootFiles.reduce((n, f) => n + gz(f), 0) + (appManifest["/layout"] ?? []).filter((f) => f.endsWith(".js") && !rootFiles.includes(f)).reduce((n, f) => n + gz(f), 0);

const pages = Object.keys(appManifest).filter((k) => k.endsWith("/page"));
const byRoute = new Map();
for (const entry of pages) {
  const route = routeOf(entry);
  // Una ruta con varias entradas (interceptadas, slots): se queda la más pesada.
  byRoute.set(route, Math.max(byRoute.get(route) ?? 0, firstLoad(entry)));
}

const kb = (n) => (n / 1024).toFixed(1) + " kB";
const budget = existsSync(BUDGET_FILE) ? readJson(BUDGET_FILE) : { shared: null, routes: {} };

const rows = [["(común a todas)", shared, budget.shared]];
for (const [route, size] of [...byRoute.entries()].sort((a, b) => b[1] - a[1])) rows.push([route, size, budget.routes?.[route] ?? null]);

let failed = 0;
for (const [route, size, limitKb] of rows) {
  const over = limitKb != null && size / 1024 > limitKb;
  if (over) failed++;
  if (reportOnly || limitKb != null) {
    const mark = limitKb == null ? "   " : over ? "✗  " : "✓  ";
    console.log(`${mark}${kb(size).padStart(10)}  ${limitKb != null ? ("≤ " + limitKb + " kB").padEnd(12) : "".padEnd(12)}${route}`);
  }
}

if (reportOnly) process.exit(0);
if (failed) {
  console.error(`\n${failed} ruta(s) superan su presupuesto. Revisa qué se importó de forma estática (ANALYZE=true npm run build).`);
  process.exit(1);
}
console.log("\nPresupuesto de JS por ruta: todo en orden.");

import fs from "node:fs";
import path from "node:path";

/**
 * Cada ruta INTERCEPTADA (`@slot/(.)x`) necesita su gemela REAL (`x/page.tsx`):
 * `(.)` solo intercepta al navegar desde su propio segmento; al llegar desde
 * otro (el 360) o al recargar la URL, sin la real hay un 404 (QA DQ-H2:
 * «Nueva oportunidad» desde el 360).
 *
 * Sin excepciones: una interceptada nueva sin gemela hace caer el test.
 */
const APP = path.resolve(__dirname, "..");
const INTERCEPT = /^\((\.{1,3})\)(.*)$/;

function pageDirs(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === "__tests__") continue;
    const full = path.join(dir, entry.name);
    if (fs.existsSync(path.join(full, "page.tsx"))) out.push(full);
    pageDirs(full, out);
  }
  return out;
}

/** Segmentos de URL: fuera los grupos `(x)` y los slots `@x`; resuelve `(.)`, `(..)` y `(...)`. */
function urlOf(dir: string): { url: string; intercepted: boolean } {
  let segments: string[] = [];
  let intercepted = false;
  for (const part of path.relative(APP, dir).split(path.sep)) {
    const match = INTERCEPT.exec(part);
    if (match) {
      intercepted = true;
      if (match[1] === "..") segments = segments.slice(0, -1);
      if (match[1] === "...") segments = [];
      if (match[2]) segments.push(match[2]);
    } else if (part.startsWith("@") || (part.startsWith("(") && part.endsWith(")"))) {
      continue;
    } else {
      segments.push(part);
    }
  }
  return { url: `/${segments.join("/")}`, intercepted };
}

describe("rutas interceptadas", () => {
  const routes = pageDirs(APP).map(urlOf);
  const real = new Set(routes.filter((route) => !route.intercepted).map((route) => route.url));
  const intercepted = routes.filter((route) => route.intercepted).map((route) => route.url);

  it("encuentra las interceptadas del proyecto (la guarda mira algo)", () => {
    expect(intercepted).toContain("/crm/pipeline/create");
    expect(intercepted.length).toBeGreaterThan(10);
  });

  it("toda ruta interceptada tiene su página real, sin excepciones", () => {
    const missing = intercepted.filter((url) => !real.has(url));
    expect(missing).toEqual([]);
  });

  it("«Nueva oportunidad» (/crm/pipeline/create) tiene su ruta real", () => {
    expect(real.has("/crm/pipeline/create")).toBe(true);
  });

  it("/crm/contacts/create es un segmento ESTÁTICO junto a [contactId]: Next resuelve primero el estático", () => {
    // Orden de resolución de Next: estático > dinámico. Con `create/page.tsx`
    // presente, recargar /crm/contacts/create ya no abre la 360 de un contacto «create».
    const contacts = path.join(APP, "(private)", "crm", "contacts");
    expect(fs.existsSync(path.join(contacts, "create", "page.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(contacts, "[contactId]"))).toBe(true);
    expect(real.has("/crm/contacts/create")).toBe(true);
  });
});

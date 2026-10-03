/**
 * Una variable registrada con `@property` tiene tipo: cualquier valor que no
 * sea de ese tipo se computa como su `initial-value`, y con `inherits: false`
 * los hijos no la ven. `var(--x, 1)` tampoco cae al respaldo, porque la
 * registrada siempre tiene valor. Así se rompió la regla del seguimiento
 * (2026-10-03): `--ry` de la pose del teléfono es <angle>, la regla escribía
 * `--ry: 1`, quedaba en 0deg, `calc(248px * 0deg)` era inválido y todos los
 * eventos caían en y=0. Este guardia compara cada declaración y cada respaldo
 * de `var()` con el tipo registrado.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "../../../../..");
const CSS = [join(ROOT, "app/globals.css"), join(ROOT, "modules/landing/ui/film/film.css")];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "__tests__" || name === "node_modules") continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(css|tsx?)$/.test(name)) out.push(p);
  }
  return out;
}

const TYPE: Record<string, RegExp> = {
  "<angle>": /^-?[\d.]+(deg|rad|grad|turn)$|^0$/,
  "<length>": /^-?[\d.]+(px|rem|em|vh|vw|svh|dvh|%)$|^0$/,
  "<number>": /^-?[\d.]+$/,
};

/** Valores que no se pueden juzgar en estático (otra variable, calc, palabras clave CSS). */
const dynamic = (v: string) => /var\(|calc\(|\$\{|^(inherit|initial|unset|revert)$/.test(v);

function registered(css: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of css.matchAll(/@property\s+(--[\w-]+)\s*\{[^}]*?syntax:\s*"([^"]+)"/g)) out.set(m[1], m[2]);
  return out;
}

function misuses(source: string, props: Map<string, string>): string[] {
  const bad: string[] = [];
  for (const [name, syntax] of props) {
    const ok = TYPE[syntax];
    if (!ok) continue;
    const esc = name.replace(/-/g, "\\-");
    // Declaraciones en CSS (`--ry: 1;`) y en objetos de JS (`"--ry": "1"`).
    const decl = new RegExp(`(?:^|[\\s{;"'])${esc}["']?\\s*:\\s*["'\`]?([^;}"'\`,\\n]+)`, "g");
    for (const m of source.matchAll(decl)) {
      const v = m[1].trim();
      if (!dynamic(v) && !ok.test(v)) bad.push(`${name}: ${v}`);
    }
    // Respaldos: `var(--ry, 1)`.
    for (const m of source.matchAll(new RegExp(`var\\(\\s*${esc}\\s*,\\s*([^)]+)\\)`, "g"))) {
      const v = m[1].trim();
      if (!dynamic(v) && !ok.test(v)) bad.push(`var(${name}, ${v})`);
    }
  }
  return bad;
}

describe("variables CSS registradas con @property", () => {
  const props = new Map<string, string>();
  for (const f of CSS) for (const [k, v] of registered(readFileSync(f, "utf8"))) props.set(k, v);

  it("encuentra los registros (si no, el guardia no vigila nada)", () => {
    expect(props.get("--ry")).toBe("<angle>");
    expect(props.get("--ty")).toBe("<length>");
    expect(props.size).toBeGreaterThanOrEqual(8);
  });

  it("detecta un uso numérico de un nombre registrado como ángulo", () => {
    expect(misuses(".film-ruler { --ry: 1; }", props)).toEqual(["--ry: 1"]);
    expect(misuses("const ry = (y) => `calc(${y}px * var(--ry, 1))`;", props)).toEqual(["var(--ry, 1)"]);
    expect(misuses(`gsap.set(el, { "--ty": "34px", "--ry": "-30deg" })`, props)).toEqual([]);
  });

  it("ningún archivo de src usa un nombre registrado con otro tipo", () => {
    const found: string[] = [];
    for (const f of walk(ROOT)) {
      for (const b of misuses(readFileSync(f, "utf8"), props)) found.push(`${f.slice(ROOT.length + 1)} → ${b}`);
    }
    expect(found).toEqual([]);
  });
});

// Generador de las imágenes del correo de bienvenida (N6 del plan «Entrega y bienvenida»).
//
// Renderiza cada lienzo de `src/<pieza>.html` con Chromium a 2x (600 px de ancho → 1200 px) y lo
// pasa a JPEG con sharp (calidad 84, mozjpeg, croma 4:4:4). El resultado se escribe en
// `public/images/email/welcome/<pieza>.jpg`, que es lo que enlaza la plantilla del servidor.
//
// Por qué Chromium y no sharp sobre los SVG: sharp (librsvg) no aplica igual el filtro
// `feTurbulence` del trazo a mano ni la fuente de los rótulos, y deforma las dos cosas.
// sharp solo se usa aquí para comprimir el PNG que ya pintó el navegador.
//
// Uso (desde la raíz de axi-client):
//   node scripts/email-welcome/render.mjs            # las cinco piezas
//   node scripts/email-welcome/render.mjs hero kit   # solo esas
//
// Variables:
//   PW_PATH     ruta al paquete playwright si no está instalado en este repo
//               (p. ej. /home/davela/dev/kodecol/node_modules/playwright)
//   SHARP_PATH  ruta al paquete sharp si no se resuelve desde este repo
//               (p. ej. /home/davela/dev/axi/axi-server/node_modules/sharp)
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const PIECES = ["hero", "phones", "tiles", "week", "kit"];
const SRC_DIR = path.join(here, "src");
const OUT_DIR = path.resolve(here, "..", "..", "public", "images", "email", "welcome");
const JPEG = { quality: 84, mozjpeg: true, chromaSubsampling: "4:4:4" };

/** Carga un paquete por la ruta de la variable, o por la resolución normal del repo. */
function load(envVar, pkg) {
  const target = process.env[envVar] || pkg;
  try {
    return require(target);
  } catch (error) {
    console.error(
      `No se pudo cargar «${pkg}» (${target}). Instálalo en el repo o indica su ruta en ${envVar}.`,
    );
    throw error;
  }
}

async function main() {
  const requested = process.argv.slice(2);
  const unknown = requested.filter((name) => !PIECES.includes(name));
  if (unknown.length) {
    throw new Error(`Piezas desconocidas: ${unknown.join(", ")}. Válidas: ${PIECES.join(", ")}`);
  }
  const list = requested.length ? requested : PIECES;

  const { chromium } = load("PW_PATH", "playwright");
  const sharp = load("SHARP_PATH", "sharp");

  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      deviceScaleFactor: 2,
      viewport: { width: 700, height: 1200 },
    });
    for (const name of list) {
      await page.goto(pathToFileURL(path.join(SRC_DIR, `${name}.html`)).href);
      // Sin esperar a las fuentes, el primer render sale con la de respaldo.
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(150);
      const canvas = await page.$("#c");
      if (!canvas) throw new Error(`${name}.html no tiene el lienzo #c`);
      const png = await canvas.screenshot({ omitBackground: false });
      const jpg = await sharp(png).jpeg(JPEG).toBuffer();
      const out = path.join(OUT_DIR, `${name}.jpg`);
      await writeFile(out, jpg);
      console.log(`ok ${name} → ${path.relative(process.cwd(), out)} (${Math.round(jpg.length / 1024)} KB)`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

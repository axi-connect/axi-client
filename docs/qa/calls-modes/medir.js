// Renderiza cada vista del mockup en 375/768/1280 × claro/oscuro y mide desbordes.
// Uso: node render-mockup.js <html> <outdir>
const path = require("path");
const fs = require("fs");
const { chromium } = require("/home/davela/dev/axi/axi-server/node_modules/playwright-core");

const [, , htmlPath, outDir] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const WIDTHS = [375, 768, 1280];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("file://" + path.resolve(htmlPath));
  const views = await page.$$eval(".mk-view", (b) => b.map((x) => x.dataset.view));
  const report = [];
  for (const theme of ["light", "dark"]) {
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      for (const v of views) {
        await page.evaluate((id) => {
          document.querySelectorAll(".mk-view").forEach((b) => { if (b.dataset.view === id) b.click(); });
        }, v);
        await page.waitForTimeout(80);
        const m = await page.evaluate(() => {
          const doc = document.documentElement;
          const over = doc.scrollWidth - doc.clientWidth;
          const bad = [];
          const vw = doc.clientWidth;
          document.querySelectorAll(".view:not([hidden]) *").forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.width === 0) return;
            let a = el.parentElement, clippedByAncestor = false;
            while (a && a !== document.body) { const o = getComputedStyle(a).overflowX; if (o === "hidden" || o === "auto" || o === "scroll" || o === "clip") { clippedByAncestor = true; break; } a = a.parentElement; }
            if (clippedByAncestor) return;
            if (r.right > vw + 1 || r.left < -1) {
              const cls = (el.className && typeof el.className === "string") ? el.className.split(" ").slice(0, 2).join(".") : "";
              bad.push(`${el.tagName.toLowerCase()}.${cls} right=${Math.round(r.right)}`);
            }
          });
          // texto recortado: elementos con overflow hidden + ellipsis no cuentan; buscamos scrollWidth > clientWidth sin overflow:auto
          const clipped = [];
          document.querySelectorAll(".view:not([hidden]) p, .view:not([hidden]) span, .view:not([hidden]) h1, .view:not([hidden]) h2").forEach((el) => {
            const cs = getComputedStyle(el);
            if (el.scrollWidth > el.clientWidth + 2 && cs.overflowX !== "auto" && cs.overflowX !== "scroll" && cs.textOverflow !== "ellipsis" && cs.whiteSpace === "nowrap") {
              clipped.push(`${el.tagName.toLowerCase()}.${(el.className||"").toString().split(" ")[0]}: ${el.textContent.trim().slice(0, 30)}`);
            }
          });
          return { over, bad: bad.slice(0, 8), clipped: clipped.slice(0, 8), h: doc.scrollHeight };
        });
        const file = `${v}-${w}-${theme}.png`;
        await page.screenshot({ path: path.join(outDir, file), fullPage: true });
        report.push({ view: v, w, theme, ...m });
      }
    }
  }
  await browser.close();
  const problems = report.filter((r) => r.over > 0 || r.bad.length || r.clipped.length);
  console.log(`renders: ${report.length} · con hallazgos: ${problems.length}`);
  for (const r of problems) console.log(JSON.stringify(r));
  fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 1));
})();

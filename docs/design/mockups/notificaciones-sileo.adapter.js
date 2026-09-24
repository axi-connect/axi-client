import React from "react";
import { createRoot } from "react-dom/client";
import { Toaster, sileo } from "sileo";

/* ------------------------------------------------------------------
   Adaptador propuesto (futuro core/notifications/notify.ts).
   Mantiene el contrato de useAlert().showAlert: 384 llamadas intactas.
------------------------------------------------------------------- */
const PILL_MAX = 34;
const FALLBACK = { success: "Listo", error: "No se pudo completar", warning: "Atención", info: "Aviso", neutral: "Aviso" };
const DURATION = { success: 4000, info: 5000, neutral: 5000, warning: 7000, error: 8000 };
const METHOD = { success: "success", error: "error", warning: "warning", info: "info", neutral: "info" };

function toOptions(a) {
  const tone = a.tone || "neutral";
  let title = a.title, description = a.description;
  if (title && title.length > PILL_MAX) {
    // 1) «Cabeza — cola» o «Cabeza: cola»: la cabeza va a la píldora, la cola al cuerpo.
    const m = title.match(/^(.{3,34}?)(?:\s[—–-]\s|:\s)(.+)$/);
    const rest = m ? m[2].charAt(0).toUpperCase() + m[2].slice(1) : title;
    description = description ? `${rest}. ${description}` : rest;
    // 2) Sin cabeza utilizable (p. ej. errorMessage(err) del servidor): título por tono.
    title = m ? m[1] : FALLBACK[tone];
  }
  const action = a.actions && a.actions[0];
  return {
    title, description,
    duration: action ? null : (a.autoCloseMs ?? DURATION[tone]),
    button: action ? { title: action.label, onClick: action.onClick } : undefined,
    icon: tone === "info" || tone === "neutral" ? INFO_ICON : undefined,
    // Sin id, sileo usa "sileo-default": cada aviso se transforma sobre el anterior (una ranura).
    // Con id propio (clave no tipada, verificada en dist 0.1.5) se apilan.
    ...(cfg.stack === "stack" || (cfg.stack === "errors" && (tone === "error" || tone === "warning")) ? { id: `axi-${++seq}` } : {}),
  };
}

let root, cfg = { position: "top-center", mode: "ink", stack: "errors", offsetTop: 12 };
let seq = 0;
const INFO_ICON = React.createElement("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
  React.createElement("circle", { cx: 12, cy: 12, r: 10 }), React.createElement("path", { d: "M12 16v-4" }), React.createElement("path", { d: "M12 8h.01" }));
function tokens() {
  const cs = getComputedStyle(document.documentElement);
  return { fg: cs.getPropertyValue("--foreground").trim(), bg: cs.getPropertyValue("--toast-surface").trim() || cs.getPropertyValue("--background").trim() };
}
function appIsDark() {
  const t = document.documentElement.getAttribute("data-theme");
  if (t) return t === "dark";
  return matchMedia("(prefers-color-scheme: dark)").matches;
}
function render() {
  const t = tokens();
  const dark = appIsDark();
  const ink = cfg.mode === "ink";
  const fill = ink ? t.fg : t.bg;
  const pillIsDark = ink ? !dark : dark;
  document.documentElement.dataset.pill = pillIsDark ? "dark" : "light";
  document.documentElement.dataset.toastMode = cfg.mode;
  root.render(React.createElement(Toaster, {
    position: cfg.position,
    offset: cfg.position.startsWith("top") ? { top: cfg.offsetTop, right: 16, left: 16 } : { bottom: 16, right: 16, left: 16 },
    theme: pillIsDark ? "light" : "dark",
    options: { fill, roundness: 16, styles: { title: "axi-t", description: "axi-d", button: "axi-b", badge: "axi-bd" } },
  }));
}

window.AxiToast = {
  mount(el) { root = createRoot(el); render();
    new MutationObserver(() => requestAnimationFrame(render)).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
  },
  configure(next) { cfg = { ...cfg, ...next }; sileo.clear(); render(); },
  showAlert(a) { return sileo[METHOD[a.tone || "neutral"]](toOptions(a)); },
  promise(p, o) { return sileo.promise(p, o); },
  clear() { sileo.clear(); },
  toOptions,
};

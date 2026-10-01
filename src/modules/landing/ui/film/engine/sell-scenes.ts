/**
 * Tanda 3 · vender (plan §13): foto, llamada, bóveda y equipo. Cada línea dura
 * `SPAN` y los tramos son los de la tabla de §13 sobre `p` de 0 a 1 (`atP`).
 *
 * El hilo está archivado (§15): ningún tramo espera a la cabeza del hilo; la
 * onda de la llamada y el haz de la foto son trazos de la escena.
 *
 * Lo que es discreto (etapas encendidas, quién atiende, el reloj, el texto que
 * se escribe) se pinta en un `onUpdate` y se deshace al revertir el motor
 * (cleanup en `gsap.context()`), así que parar el motor deja el HTML final.
 * Sin fijar, cada escena usa los tramos de pase de `spanTimeline` (QA de §11).
 */
import { gsap } from "gsap";

import { SPAN, atP, segP, setText, showIn, spanTimeline, visible, type Ctx, type Scene } from "@/modules/landing/ui/film/engine/film-kit";


/**
 * Un pintor por frame sobre `p` (0–1). Pinta el inicio al construir y registra
 * `restore` para cuando el motor se revierte.
 */
function painter(tl: gsap.core.Timeline, paint: (p: number) => void, restore: () => void) {
  const proxy = { p: 0 };
  paint(0);
  tl.fromTo(proxy, { p: 0 }, { p: 1, ease: "none", duration: SPAN, onUpdate: () => paint(proxy.p) }, 0);
  gsap.context()?.add(() => restore);
}

/* ─────────────────────────────── foto ─────────────────────────────── */

export const photo: Scene = (section: HTMLElement, ctx: Ctx) => {
  const tl = spanTimeline(section, ctx, 130);
  const out = { ease: "power3.out" };

  const sheets = visible(section, "[data-anim=photo-sheet]");
  if (sheets.length) tl.fromTo(sheets, { opacity: 0.3 }, { ...out, opacity: 1, duration: atP(0.14) }, 0);

  // 0,14–0,46: el haz baja por la captura y se apaga al terminar.
  const scans = visible(section, "[data-anim=photo-scan]");
  if (scans.length) {
    tl.fromTo(scans, { yPercent: 0 }, { yPercent: 100, ease: "none", duration: atP(0.32), immediateRender: false }, atP(0.14));
    tl.fromTo(scans, { opacity: 0 }, { opacity: 1, ease: "none", duration: atP(0.01) }, atP(0.14));
    tl.to(scans, { opacity: 0, ease: "none", duration: atP(0.02) }, atP(0.45));
  }

  showIn(tl, visible(section, "[data-anim=photo-recognized]"), 0.46, 0.56);

  // 0,55–0,72: el producto exacto sale del estante; el resto baja a 0,55.
  const tiles = visible(section, "[data-anim=photo-tile]");
  if (tiles.length) tl.fromTo(tiles, { opacity: 1 }, { ...out, opacity: 0.55, duration: atP(0.17) }, atP(0.55));
  const slots = visible(section, "[data-anim=photo-slot]");
  if (slots.length) tl.fromTo(slots, { opacity: 1 }, { ...out, opacity: 0, duration: atP(0.17) }, atP(0.55));
  const matches = visible(section, "[data-anim=photo-match]");
  if (matches.length) tl.from(matches, { ...out, opacity: 0, y: 0, scale: 0.86, duration: atP(0.17) }, atP(0.55));

  showIn(tl, visible(section, "[data-anim=photo-reply]"), 0.8, 0.92);
};

/* ────────────────────────────── llamada ────────────────────────────── */

/**
 * La llamada se escucha (plan §20): ya no se fija ni se reproduce con el
 * scroll. Al pasar solo entran la esfera, los costados y la línea de tiempo;
 * la voz la pone el visitante con la esfera (`scenes/call-scene.tsx`).
 */
export const call: Scene = (section: HTMLElement, ctx: Ctx) => {
  const tl = spanTimeline(section, ctx, 100);
  const orb = visible(section, "[data-anim=call-orb]");
  if (orb.length) tl.fromTo(orb, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, ease: "power3.out", duration: atP(0.45) }, 0);
  showIn(tl, visible(section, "[data-anim=call-side]"), 0.25, 0.65);
  showIn(tl, visible(section, "[data-anim=call-time]"), 0.45, 0.85);
};

/* ─────────────────────────────── bóveda ─────────────────────────────── */

export const vault: Scene = (section: HTMLElement, ctx: Ctx) => {
  const tl = spanTimeline(section, ctx, 120);
  const tags = visible(section, "[data-anim=vault-tag]");

  // 0–0,4: la etiqueta se balancea desde el ojal, amortiguada (16°).
  // 0,45–0,56: solo tiembla, porque el precio no cambia.
  painter(
    tl,
    (p) => {
      const swing = segP(p, 0, 0.4);
      const shake = segP(p, 0.45, 0.56);
      const rot = (swing < 1 ? 16 * Math.exp(-4 * swing) * Math.cos(swing * 11) : 0) + 1.6 * Math.sin(shake * Math.PI * 6) * (1 - shake);
      for (const t of tags) t.style.transform = `rotate(${rot.toFixed(2)}deg)`;
    },
    () => {
      for (const t of tags) t.style.removeProperty("transform");
    },
  );

  showIn(tl, visible(section, "[data-anim=vault-ask]"), 0.34, 0.44);
  showIn(tl, visible(section, "[data-anim=vault-answer]"), 0.6, 0.7);
  // 0,7–0,86: el cupón se imprime debajo de la etiqueta.
  const coupons = visible(section, "[data-anim=vault-coupon]");
  if (coupons.length) tl.fromTo(coupons, { opacity: 0, y: -40 }, { opacity: 1, y: 0, ease: "power3.out", duration: atP(0.16) }, atP(0.7));
};

/* ─────────────────────────────── equipo ─────────────────────────────── */

/** Quién atiende en `p`: 0 Axi, 1 en cola (0,45), 2 contigo (0,55), y Axi otra vez desde 0,9. */
const modeAt = (p: number) => (p >= 0.9 ? 0 : p >= 0.55 ? 2 : p >= 0.45 ? 1 : 0);

export const team: Scene = (section: HTMLElement, ctx: Ctx) => {
  const tl = spanTimeline(section, ctx, 130);

  // 0–0,3: la tapa se abre desde la bisagra (−76° → 6°). Solo en escritorio:
  // en móvil el portátil se ve de frente. El dorso se ve hasta −40° y la
  // pantalla se enciende desde −30°.
  if (ctx.desktop) {
    const lids = Array.from(section.querySelectorAll<HTMLElement>("[data-anim=team-lid]"));
    const shells = Array.from(section.querySelectorAll<HTMLElement>("[data-anim=team-shell]"));
    const screens = visible(section, "[data-anim=team-screen]");
    const lid = { a: -76 };
    const paintLid = () => {
      const a = lid.a;
      for (const l of lids) l.style.transform = `rotateX(${a.toFixed(2)}deg)`;
      for (const s of shells) s.style.opacity = a < -40 ? "1" : "0";
      for (const s of screens) s.style.opacity = Math.min(1, Math.max(0, (a + 30) / 30)).toFixed(3);
    };
    paintLid();
    tl.fromTo(lid, { a: -76 }, { a: 6, ease: "power3.out", duration: atP(0.3), onUpdate: paintLid }, 0);
    gsap.context()?.add(() => () => {
      for (const el of [...lids, ...shells, ...screens]) {
        el.style.removeProperty("transform");
        el.style.removeProperty("opacity");
      }
    });
  }

  showIn(tl, visible(section, "[data-anim=team-ask]"), 0.32, 0.4, 8);
  showIn(tl, visible(section, "[data-anim=team-note]"), 0.45, 0.52, 8);
  showIn(tl, visible(section, "[data-anim=team-back]"), 0.9, 0.97, 8);

  // 0,6–0,78: Laura escribe su respuesta, letra a letra.
  const replies = visible(section, "[data-anim=team-reply]");
  const texts = visible(section, "[data-anim=team-reply-text]");
  const startMode = section.dataset.mode ?? "0";
  const startReturned = section.hasAttribute("data-returned");

  painter(
    tl,
    (p) => {
      const typed = segP(p, 0.6, 0.78);
      for (const t of texts) {
        const full = t.dataset.full ?? "";
        setText(t, full.slice(0, Math.max(1, Math.round(full.length * typed))));
      }
      for (const r of replies) r.style.opacity = typed > 0 ? "1" : "0";
      const mode = String(modeAt(p));
      if (section.dataset.mode !== mode) section.dataset.mode = mode;
      // 0,86: se pulsa «Devolver a Axi» y queda marcado.
      const returned = p >= 0.86;
      if (section.hasAttribute("data-returned") !== returned) section.toggleAttribute("data-returned", returned);
    },
    () => {
      for (const t of texts) setText(t, t.dataset.full ?? "");
      for (const r of replies) r.style.removeProperty("opacity");
      section.dataset.mode = startMode;
      section.toggleAttribute("data-returned", startReturned);
    },
  );
};

/** Para registrar en `SCENES` del motor. */
export const SELL_SCENES = { photo, call, vault, team } as const;

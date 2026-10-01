/**
 * El video inmersivo (plan §23): fijada, el titular se va y el marco se abre
 * hasta la pantalla entera. Solo transform y opacity; el radio del recorte se
 * compensa con la escala para que se vea constante y llegue a 0 a sangre.
 */
import { gsap } from "gsap";

import { atP, segP, sceneTimeline, PASS_DESKTOP, SPAN, visible, writer, type Ctx, type Scene } from "@/modules/landing/ui/film/engine/film-kit";

/** El marco en reposo: la pantalla entera a esta escala, algo bajo el centro. */
const S0_DESKTOP = 0.6;
const RADIUS = 28;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export const video: Scene = (section: HTMLElement, ctx: Ctx) => {
  // En móvil el máster vertical ya va a sangre desde el principio (film-video.css):
  // abrir un marco en el tramo corto de la entrada no se alcanzaba a ver.
  if (!ctx.desktop) return;
  const tl = sceneTimeline(section, ctx, 180, PASS_DESKTOP);
  tl.to({}, { duration: 0 }, SPAN);
  const frames = visible(section, "[data-anim=video-frame]");
  const clips = visible(section, "[data-anim=video-clip]");
  const heads = visible(section, "[data-anim=head]");
  const vignettes = visible(section, "[data-anim=video-vignette]");
  const caps = visible(section, "[data-anim=video-cap]");
  const s0 = S0_DESKTOP;
  const w = writer();
  const proxy = { p: 0 };
  const paint = (p: number) => {
    const open = easeOut(segP(p, 0.12, 0.72));
    const s = s0 + (1 - s0) * open;
    w.write(frames, "transform", `translate3d(0, ${((1 - open) * 9).toFixed(2)}%, 0) scale(${s.toFixed(4)})`);
    // El radio vive en el recorte, dentro de la escala: dividirlo lo deja constante.
    for (const c of clips) {
      const r = ((1 - open) * RADIUS) / s;
      const v = `${r.toFixed(2)}px`;
      if (c.style.borderRadius !== v) c.style.borderRadius = v;
    }
    w.write(vignettes, "opacity", (0.3 + 0.7 * open).toFixed(3));
    w.write(caps, "opacity", segP(p, 0.7, 0.9).toFixed(3));
  };
  paint(0);
  tl.fromTo(proxy, { p: 0 }, { p: 1, ease: "none", duration: atP(1), onUpdate: () => paint(proxy.p) }, 0);
  // El titular entra con el reveal del kit antes del pin y se va al abrirse el marco.
  if (heads.length) tl.to(heads, { opacity: 0, y: -40, ease: "none", duration: atP(0.26) }, atP(0.04));
  gsap.context()?.add(() => () => {
    w.restore();
    for (const c of clips) c.style.removeProperty("border-radius");
  });
};

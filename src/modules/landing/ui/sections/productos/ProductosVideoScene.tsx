import { PRODUCTOS_ANCHORS, VIDEO_SCENE } from "@/modules/landing/ui/content/productos.content";
import { ProductosVideoPlayer } from "./ProductosVideo";

/** #video — «Quien lo construye / te lo cuenta.» El video del fundador antes del cierre (D5). */
export function ProductosVideoScene() {
  return (
    <section id={PRODUCTOS_ANCHORS.video} aria-labelledby="video-title" className="pj-scene pj-video justify-center gap-10">
      <div className="pj-glow" aria-hidden="true" />
      <div className="relative z-[1] flex flex-col items-center gap-3 text-center">
        <p className="pj-eyebrow text-[var(--axi-brand)]">{VIDEO_SCENE.eyebrow}</p>
        <h2 id="video-title" className="pj-h pj-h-lg">
          {VIDEO_SCENE.strong} <span className="t">{VIDEO_SCENE.thin}</span>
        </h2>
      </div>
      <div className="pj-video-frame">
        <ProductosVideoPlayer />
      </div>
    </section>
  );
}

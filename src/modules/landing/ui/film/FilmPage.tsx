import "./film.css";

import { lazy } from "react";

import type { PublicCatalog } from "@/modules/landing/domain/public-catalog";
import { FilmRoot } from "@/modules/landing/ui/film/FilmRoot";
import { FollowupScene, RadarScene } from "@/modules/landing/ui/film/scenes/capture";
import { AxelScene } from "@/modules/landing/ui/film/scenes/axel";
import { CollectScene } from "@/modules/landing/ui/film/scenes/collect";
import { GoalScene } from "@/modules/landing/ui/film/scenes/goal";
import { MeasureScene } from "@/modules/landing/ui/film/scenes/measure";
import { PipelineScene } from "@/modules/landing/ui/film/scenes/pipeline";
import { CloseScene } from "@/modules/landing/ui/film/scenes/close";
import { HeroScene, NicheScene } from "@/modules/landing/ui/film/scenes/opening";
import { PhilosophyScene } from "@/modules/landing/ui/film/scenes/philosophy";
import { FaqScene, PricingScene } from "@/modules/landing/ui/film/scenes/after";
import { ChatScene } from "@/modules/landing/ui/film/scenes/sell";
import { CallScene, PhotoScene, TeamScene, VaultScene } from "@/modules/landing/ui/film/scenes/sell-moments";

/**
 * La home: una película por scroll (plan `landing_cinematica_plan.md`,
 * storyboard aprobado el 2026-09-30).
 *
 * Todas las escenas son Server Components: su HTML llega completo y en su
 * fotograma final. `FilmRoot` es la única isla cliente (nicho, guía de progreso
 * y carga diferida del motor de animación).
 */
/**
 * El piloto automático (plan §19): construido, pero fuera de la página hasta
 * que el piloto esté en producción (D11, `FILM_FEATURES.pilot`). La condición
 * es el literal que inlina `next.config.ts` y no `FILM_FEATURES`, y va en una
 * rama: solo así webpack descarta el `import()` apagado, y con él el CSS y la
 * fuente de la escena (con un valor importado, o tras un `return`, quedaban
 * enlazados en `/`).
 */
const PilotScene =
  process.env.FILM_PILOT === "1" ? lazy(() => import("@/modules/landing/ui/film/scenes/pilot").then((m) => ({ default: m.PilotScene }))) : null;

export function FilmPage({ catalog }: { catalog: PublicCatalog | null }) {
  return (
    <FilmRoot>
      <HeroScene />
      <PhilosophyScene />
      <NicheScene />
      <RadarScene />
      {PilotScene ? <PilotScene /> : null}
      <FollowupScene />
      <ChatScene />
      <PhotoScene />
      <CallScene />
      <VaultScene />
      <TeamScene />
      <CollectScene />
      <PipelineScene />
      <GoalScene />
      <AxelScene />
      <MeasureScene />
      <PricingScene catalog={catalog} />
      <FaqScene />
      <CloseScene />
    </FilmRoot>
  );
}

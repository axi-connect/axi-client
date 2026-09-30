import "./film.css";

import type { PublicCatalog } from "@/modules/landing/domain/public-catalog";
import { FilmRoot } from "@/modules/landing/ui/film/FilmRoot";
import { FollowupScene, RadarScene } from "@/modules/landing/ui/film/scenes/capture";
import { AxelScene, CollectScene, GoalScene, MeasureScene, PipelineScene } from "@/modules/landing/ui/film/scenes/grow";
import { CloseScene, HeroScene, NicheScene } from "@/modules/landing/ui/film/scenes/opening";
import { FaqScene, PricingScene } from "@/modules/landing/ui/film/scenes/after";
import { CallScene, ChatScene, PhotoScene, TeamScene, VaultScene } from "@/modules/landing/ui/film/scenes/sell";

/**
 * La home: una película por scroll (plan `landing_cinematica_plan.md`,
 * storyboard aprobado el 2026-09-30).
 *
 * Todas las escenas son Server Components: su HTML llega completo y en su
 * fotograma final. `FilmRoot` es la única isla cliente (nicho, guía de progreso
 * y carga diferida del motor de animación).
 */
export function FilmPage({ catalog }: { catalog: PublicCatalog | null }) {
  return (
    <FilmRoot>
      <HeroScene />
      <NicheScene />
      <RadarScene />
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

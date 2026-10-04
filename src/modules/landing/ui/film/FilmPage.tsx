import "./film.css";
import type { ReactNode } from "react";

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
import { PilotScene } from "@/modules/landing/ui/film/scenes/pilot";
import { FaqScene, PricingScene } from "@/modules/landing/ui/film/scenes/after";
import { ChatScene } from "@/modules/landing/ui/film/scenes/sell";
import { CallScene, PhotoScene, TeamScene, VaultScene } from "@/modules/landing/ui/film/scenes/sell-moments";
import { VideoScene } from "@/modules/landing/ui/film/scenes/video";

/**
 * La home: una película por scroll (plan `landing_cinematica_plan.md`,
 * storyboard aprobado el 2026-09-30).
 *
 * Todas las escenas son Server Components: su HTML llega completo y en su
 * fotograma final. `FilmRoot` es la única isla cliente (nicho, guía de progreso
 * y carga diferida del motor de animación).
 */

/**
 * El envoltorio de una escena que el motor fija (las de `PINNED`, film-kit): en
 * el HTML es un bloque neutro; en escritorio el motor lo convierte en su
 * recorrido (`pin-spacer`, con el relleno detrás). Viene ya del servidor para
 * que el motor no tenga que mover la escena dentro de uno nuevo: reinsertarla
 * recalculaba los estilos de toda la escena (180 ms el piloto con CPU ×4).
 */
function Pin({ children }: { children: ReactNode }) {
  return <div className="film-pin">{children}</div>;
}

export function FilmPage({ catalog }: { catalog: PublicCatalog | null }) {
  return (
    <FilmRoot>
      <HeroScene />
      <Pin>
        <VideoScene />
      </Pin>
      <NicheScene />
      <Pin>
        <RadarScene />
      </Pin>
      <Pin>
        <PilotScene />
      </Pin>
      <Pin>
        <FollowupScene />
      </Pin>
      <Pin>
        <ChatScene />
      </Pin>
      <Pin>
        <PhotoScene />
      </Pin>
      <CallScene />
      <Pin>
        <VaultScene />
      </Pin>
      <Pin>
        <TeamScene />
      </Pin>
      <Pin>
        <CollectScene />
      </Pin>
      <Pin>
        <PipelineScene />
      </Pin>
      <Pin>
        <GoalScene />
      </Pin>
      <Pin>
        <AxelScene />
      </Pin>
      <Pin>
        <MeasureScene />
      </Pin>
      <PricingScene catalog={catalog} />
      <FaqScene />
      <CloseScene />
    </FilmRoot>
  );
}

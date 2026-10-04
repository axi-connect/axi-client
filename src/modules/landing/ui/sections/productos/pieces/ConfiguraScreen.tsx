import { PIECE_SCREENS } from "@/modules/landing/ui/content/productos.content";
import { AssistantAvatar } from "@/shared/components/features/assistant/avatar/AssistantAvatar";
import { AssistantStage } from "@/shared/components/features/assistant/avatar/AssistantStage";
import { Glyph } from "./parts";

const S = PIECE_SCREENS.configura;
const MIC = "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3";
const CHAT = "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.5A8 8 0 1 1 21 12z";

/**
 * Los agentes, como en el panel (mockup Estudio de agentes): cada uno con su
 * personaje real —los mismos de la app—, su rol, su estado, el canal que lo
 * usa y su voz. Se configuran, no se programan.
 */
export function ConfiguraScreen() {
  return (
    <div className="pp-agents2">
      <div className="pp-page-head">
        <div>
          <h4 className="pp-page-title">{S.title}</h4>
          <p className="pp-page-sub">{S.sub}</p>
        </div>
        <span className="pp-act" data-primary="">
          + {S.create}
        </span>
      </div>
      <div className="pp-agents2-grid">
        {S.agents.map((a) => (
          <div key={a.name} className="pp-card pp-agents2-card">
            <AssistantStage className="pp-agents2-stage">
              <AssistantAvatar expression={a.expression} character={a.character} color={a.color} transitionMs={0} />
            </AssistantStage>
            <div className="pp-agents2-body">
              <span className="pp-agents2-name">
                <b>{a.name}</b>
                <span className="pp-agents2-status" data-tone={a.statusTone}>
                  <i aria-hidden="true" />
                  {a.status}
                </span>
              </span>
              <span className="pp-muted">{a.role}</span>
              <span className="pp-agents2-chips">
                <span className="pp-agents2-chip">
                  <Glyph d={CHAT} size={12} />
                  {a.channel}
                </span>
                <span className="pp-agents2-chip">
                  <Glyph d={MIC} size={12} />
                  {a.voice}
                </span>
              </span>
            </div>
          </div>
        ))}
        <div className="pp-agents2-new">
          <span className="pp-agents2-plus">+</span>
          <b>{S.createCard.title}</b>
          <span className="pp-dim">{S.createCard.sub}</span>
        </div>
      </div>
    </div>
  );
}

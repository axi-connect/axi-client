import { PIECE_SCREENS } from "@/modules/landing/ui/content/productos.content";
import { Kicker, Pill } from "./parts";

const S = PIECE_SCREENS.configura;

/** El estudio del agente: quién es, cómo habla y sus reglas en frases cortas. */
export function ConfiguraScreen() {
  return (
    <div className="pp-agent">
      <div className="pp-tile pp-agent-id" data-tone="violet">
        <span className="pp-agent-avatar" aria-hidden="true">
          {S.name.slice(0, 1)}
        </span>
        <span className="pp-agent-name">{S.name}</span>
        <span className="pp-muted">{S.role}</span>
        <span className="pp-grow" />
        <Pill tone="ok">● {S.status}</Pill>
      </div>
      <div className="pp-tile">
        <Kicker>{S.toneLabel}</Kicker>
        <div className="pp-choices">
          {S.tones.map((t) => (
            <span key={t.label} className="pp-choice" data-on={t.selected ? "" : undefined}>
              <b>{t.label}</b>
              <span>{t.hint}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="pp-tile">
        <Kicker>{S.rolesLabel}</Kicker>
        <div className="pp-wrap">
          {S.roles.map((r, i) => (
            <Pill key={r} tone={i === 0 ? "violet" : "muted"}>
              {r}
            </Pill>
          ))}
        </div>
      </div>
      <div className="pp-tile pp-rules">
        {S.rules.map((rule) => (
          <div key={rule.label} className="pp-rule">
            <Kicker>{rule.label}</Kicker>
            <span>{rule.text}</span>
          </div>
        ))}
      </div>
      <span className="pp-saved">{S.saved}</span>
    </div>
  );
}

import { artifactHref, artifactLinkLabel } from "../artifact-links";
import type { ProposalArtifact } from "../cmo";

function artifact(over: Partial<ProposalArtifact>): ProposalArtifact {
  return { type: "promotion", id: "abc", label: "Sin nombre", before: null, after: null, ...over };
}

describe("artifactHref", () => {
  it("la campaña va a su ruta propia, que es la única que existe", () => {
    expect(artifactHref(artifact({ type: "campaign", id: "c1" }))).toBe("/marketing/campaigns/c1");
  });

  it("promoción, regla y mensaje van a su vista con el borrador indicado", () => {
    expect(artifactHref(artifact({ type: "promotion", id: "p1" }))).toBe(
      "/marketing/promotions?promotion=p1",
    );
    expect(artifactHref(artifact({ type: "automation", id: "a1" }))).toBe(
      "/marketing/automations?automation=a1",
    );
    expect(artifactHref(artifact({ type: "template", id: "t1" }))).toBe(
      "/marketing/settings/templates?template=t1",
    );
  });

  it("sin id NO hay enlace: llevar al listado es peor que no enlazar", () => {
    for (const type of ["campaign", "promotion", "automation", "template"] as const) {
      expect(artifactHref(artifact({ type, id: null }))).toBeNull();
    }
  });

  it("el guion de ventas lleva a la lista de agentes: su id es del playbook, no del agente", () => {
    expect(artifactHref(artifact({ type: "agent_playbook", id: "pb1" }))).toBe("/admin/agents");
    expect(artifactHref(artifact({ type: "agent_playbook", id: null }))).toBe("/admin/agents");
  });

  it("el segmento no tiene pantalla: ninguna herramienta lo emite con id", () => {
    expect(artifactHref(artifact({ type: "segment", id: "s1" }))).toBeNull();
  });
});

describe("artifactLinkLabel", () => {
  it("nombra el destino como lo que el dueño va a ver al llegar", () => {
    expect(artifactLinkLabel("promotion")).toBe("Ver la promoción");
    expect(artifactLinkLabel("automation")).toBe("Ver la regla");
    expect(artifactLinkLabel("template")).toBe("Ver el mensaje");
    expect(artifactLinkLabel("campaign")).toBe("Ver la campaña");
    expect(artifactLinkLabel("agent_playbook")).toBe("Ver el agente");
  });
});

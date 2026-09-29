import {
  BUYING_ROLE_LABELS,
  initialsOf,
  providerPlanOf,
  revealCeiling,
  revealStateOf,
  type RevealCandidate,
  type TenantProviderKeyDTO,
} from "../person";

const COSTS = { email: 1, phone: 8 };

function candidate(overrides: Partial<RevealCandidate> = {}): RevealCandidate {
  return {
    id: "p-1",
    masked: true,
    source: "apollo_people",
    email: null,
    phone: null,
    has_email: true,
    has_phone: true,
    ...overrides,
  };
}

describe("revelar · lo que cuesta ANTES de pulsar", () => {
  it("cuenta solo lo que Apollo dice tener y aún no tenemos", () => {
    const ceiling = revealCeiling(
      [
        candidate({ id: "a" }),
        candidate({ id: "b", has_email: false }),
        candidate({ id: "c", email: "ya@lo.tengo" }),
      ],
      false,
      COSTS,
    );
    expect(ceiling).toEqual({ emails: 1, phones: 0, credits: 1 });
  });

  it("con el celular, suma lo que declara la cuenta por cada uno", () => {
    expect(revealCeiling([candidate(), candidate({ id: "b" })], true, COSTS)).toEqual({
      emails: 2,
      phones: 2,
      credits: 18,
    });
  });

  it("SIN PRECIO DECLARADO NO HAY TECHO: nunca se inventa una cifra", () => {
    expect(revealCeiling([candidate()], false, { email: null, phone: null }).credits).toBeNull();
  });

  it("lo que no es de Apollo no se revela", () => {
    expect(revealStateOf(candidate({ source: "rues_open" }))).toBe("not_apollo");
    expect(revealCeiling([candidate({ source: "rues_open" })], true, COSTS).credits).toBe(0);
  });

  it("revelado = ya no enmascarado", () => {
    expect(revealStateOf(candidate({ masked: false }))).toBe("revealed");
    expect(revealStateOf(candidate())).toBe("revealable");
  });
});

describe("personas · piezas de la fila", () => {
  it("iniciales del nombre, sin signos", () => {
    expect(initialsOf("Carolina Ruiz")).toBe("CR");
    expect(initialsOf("María V.")).toBe("MV");
    expect(initialsOf(null)).toBe("?");
  });

  it("todos los papeles tienen su palabra", () => {
    expect(Object.keys(BUYING_ROLE_LABELS).sort()).toEqual(
      ["approves", "decides", "recommends", "unknown", "uses"].sort(),
    );
  });

  it("el plan de la llave se dice por lo que deja hacer", () => {
    const base = { configured: true, capabilities: ["enrich_company"] } as TenantProviderKeyDTO;
    expect(providerPlanOf(base)).toBe("companies_only");
    expect(providerPlanOf({ ...base, capabilities: ["discover", "enrich_company"] })).toBe(
      "people_and_companies",
    );
    expect(providerPlanOf({ ...base, configured: false })).toBe("none");
  });
});

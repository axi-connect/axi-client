import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import type { ContactPointsDTO, DecisionMakerDTO } from "../../../domain/lead";
import { LeadDecisionMakerCard } from "../LeadDecisionMakerCard";

afterEach(cleanup);

/** Datos ficticios del tenant de pruebas «Norte Studio». */
const POINTS: ContactPointsDTO = {
  emails: [
    { value: "mariana.restrepo@casalumbre.example", type: "con_nombre", source: "site_extractor", source_url: null, primary: true },
    { value: "info@casalumbre.example", type: "generico", source: "google_places", source_url: null, primary: false },
  ],
  phones: [
    { value: "+573105550142", type: "celular", whatsapp: true, source: "site_extractor", source_url: null, primary: true },
  ],
};
const NO_POINTS: ContactPointsDTO = { emails: [], phones: [] };

function decider(overrides: Partial<DecisionMakerDTO> = {}): DecisionMakerDTO {
  return {
    person_id: "p-1",
    name: "Mariana Restrepo Gil",
    title: "Representante legal y gerente",
    role: "decides",
    level: "fact",
    confirmed_by: "source",
    provider: "rues",
    evidence_url: null,
    email: null,
    phone: null,
    in_crm: false,
    member_confirmed: false,
    doubt: null,
    ...overrides,
  };
}

function setup(
  decisionMaker: DecisionMakerDTO | null,
  options: {
    canManage?: boolean;
    canPromote?: boolean;
    points?: ContactPointsDTO;
    searching?: boolean;
    searchedBefore?: boolean;
  } = {},
) {
  const handlers = { onSearch: jest.fn(), onConfirm: jest.fn(), onDismiss: jest.fn(), onAddToCrm: jest.fn() };
  render(
    <LeadDecisionMakerCard
      decisionMaker={decisionMaker}
      points={options.points ?? POINTS}
      emailVerification="verified"
      canManage={options.canManage ?? true}
      canPromote={options.canPromote ?? true}
      busy={false}
      searching={options.searching ?? false}
      searchedBefore={options.searchedBefore ?? true}
      {...handlers}
    />,
  );
  return handlers;
}

describe("LeadDecisionMakerCard", () => {
  describe("confirmada (un hecho)", () => {
    it("la nombra con su cargo, su papel y de dónde se sabe", () => {
      setup(decider());
      expect(screen.getByText("Confirmada")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Mariana Restrepo Gil" })).toHaveAttribute("href", "/marketing/leads/p-1");
      expect(screen.getByText(/Representante legal y gerente/)).toBeInTheDocument();
      expect(screen.getByText("decide")).toBeInTheDocument();
      expect(screen.getByText("Según el registro mercantil")).toBeInTheDocument();
    });

    it("sin datos propios, enseña lo principal del negocio para llegarle", () => {
      setup(decider());
      expect(screen.getByText("+57 310 555 0142")).toBeInTheDocument();
      expect(screen.getByText("Tiene WhatsApp")).toBeInTheDocument();
      expect(screen.getByText("mariana.restrepo@casalumbre.example")).toBeInTheDocument();
      expect(screen.getByText("Buzón verificado")).toBeInTheDocument();
      // Solo los dos principales: el genérico se queda en «Correos · N».
      expect(screen.queryByText("info@casalumbre.example")).toBeNull();
      // Sin correo ni teléfono PROPIOS no hay con qué crearla en el CRM.
      expect(screen.queryByRole("button", { name: "Añadir al CRM" })).toBeNull();
    });

    it("con datos propios, enseña los suyos y deja añadirla al CRM", () => {
      const handlers = setup(decider({ email: "mariana@casalumbre.example" }));
      expect(screen.getByText("mariana@casalumbre.example")).toBeInTheDocument();
      expect(screen.getByText("Su correo")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Añadir al CRM" }));
      expect(handlers.onAddToCrm).toHaveBeenCalledWith("p-1");
    });

    it("de un hecho del registro solo se ofrece «No es quien decide» (la persona existe)", () => {
      const handlers = setup(decider());
      expect(screen.queryByRole("button", { name: "No es" })).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "No es quien decide" }));
      expect(handlers.onDismiss).toHaveBeenCalledWith("p-1");
    });

    it("M4 · un hecho de Apollo NO se trata como del registro: se ofrece «No es»", () => {
      setup(decider({ provider: "apollo", confirmed_by: "source" }));
      expect(screen.getByRole("button", { name: "No es" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "No es quien decide" })).toBeNull();
      expect(screen.getByText("Según Apollo")).toBeInTheDocument();
    });

    it("de una confirmada por el equipo se ofrece «No es» (quien monta la tarjeta pregunta qué no es)", () => {
      setup(decider({ confirmed_by: "person", provider: "site_extractor" }));
      expect(screen.getByRole("button", { name: "No es" })).toBeInTheDocument();
    });

    it("si ya está en el CRM lo dice y no ofrece acciones", () => {
      setup(decider({ in_crm: true, email: "mariana@casalumbre.example" }));
      expect(screen.getByText("Ya está en tu CRM.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Añadir al CRM" })).toBeNull();
      expect(screen.queryByRole("button", { name: "No es" })).toBeNull();
    });

    it("confirmada por el equipo: dice que salió del sitio y lo confirmó tu equipo", () => {
      setup(decider({ confirmed_by: "person", provider: "site_extractor" }));
      expect(screen.getByText("Confirmada")).toBeInTheDocument();
      expect(screen.getByText("Salió de su sitio web y lo confirmó tu equipo")).toBeInTheDocument();
    });
  });

  describe("por confirmar (una pista del sitio)", () => {
    const HINT = decider({
      name: "Julián Cárdenas Mora",
      title: null,
      level: "hypothesis",
      confirmed_by: null,
      provider: "site_extractor",
      evidence_url: "https://casalumbre.example/nosotros",
      member_confirmed: false,
      doubt: "from_site",
    });

    it("NUNCA dice «Confirmada»: dice «Por confirmar» y por qué dudar", () => {
      setup(HINT);
      expect(screen.getByText("Por confirmar")).toBeInTheDocument();
      expect(screen.queryByText("Confirmada")).toBeNull();
      expect(screen.getByText("Aparece en su sitio web, sin cargo")).toBeInTheDocument();
      expect(screen.getByText(/Puede no trabajar aquí/)).toBeInTheDocument();
      expect(screen.getByText("no pasa a tu CRM como quien decide")).toBeInTheDocument();
    });

    it("no enseña datos para llegarle ni deja añadirla al CRM", () => {
      setup(HINT);
      expect(screen.queryByText("+57 310 555 0142")).toBeNull();
      expect(screen.queryByRole("button", { name: "Añadir al CRM" })).toBeNull();
    });

    it("«Sí, es quien decide» confirma; «No es» descarta; y se puede ver dónde aparece", () => {
      const handlers = setup(HINT);
      fireEvent.click(screen.getByRole("button", { name: "Sí, es quien decide" }));
      expect(handlers.onConfirm).toHaveBeenCalledWith("p-1");
      fireEvent.click(screen.getByRole("button", { name: "No es" }));
      expect(handlers.onDismiss).toHaveBeenCalledWith("p-1");
      expect(screen.getByRole("link", { name: /ver dónde aparece/ })).toHaveAttribute(
        "href",
        "https://casalumbre.example/nosotros",
      );
    });

    it("M2 · tras «Sí trabaja aquí» ya no dice «Puede no trabajar aquí»: lo pendiente es si decide", () => {
      const handlers = setup({ ...HINT, member_confirmed: true, doubt: null });
      expect(screen.getByText("Por confirmar")).toBeInTheDocument();
      expect(screen.getByText(/Trabaja aquí; falta confirmar si decide\./)).toBeInTheDocument();
      expect(screen.queryByText(/Puede no trabajar aquí/)).toBeNull();
      // Y lo único que cabe negar es que decide.
      expect(screen.queryByRole("button", { name: "No es" })).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "No es quien decide" }));
      expect(handlers.onDismiss).toHaveBeenCalledWith("p-1");
      expect(screen.getByRole("button", { name: "Sí, es quien decide" })).toBeInTheDocument();
    });

    it("M3 · el motivo sale de la duda real: la que no tiene procedencia no «salió del sitio»", () => {
      setup({ ...HINT, provider: null, evidence_url: null, doubt: "no_source" });
      expect(screen.getByText(/no quedó guardado de dónde salió/)).toBeInTheDocument();
      expect(screen.queryByText(/los sitios traen testimonios/)).toBeNull();
    });

    it("M3 · la del sitio conserva su motivo", () => {
      setup(HINT);
      expect(screen.getByText(/los sitios traen testimonios y textos de plantilla/)).toBeInTheDocument();
    });

    it("sin permiso de gestionar no hay botones, pero la pista se sigue viendo como pista", () => {
      setup(HINT, { canManage: false });
      expect(screen.getByText("Por confirmar")).toBeInTheDocument();
      expect(screen.queryByRole("button")).toBeNull();
    });
  });

  describe("sin identificar", () => {
    it("si NUNCA se buscó, lo dice y el botón es «Buscar quién decide»", () => {
      const handlers = setup(null, { points: NO_POINTS, searchedBefore: false });
      expect(screen.getByText(/Aún no la hemos buscado/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Buscar quién decide" }));
      expect(handlers.onSearch).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("button", { name: "Buscar otra vez" })).toBeNull();
    });

    it("lo dice y ofrece buscar otra vez", () => {
      const handlers = setup(null, { points: NO_POINTS });
      expect(screen.getByText("Sin identificar")).toBeInTheDocument();
      expect(screen.getByText("Todavía no sabemos quién decide")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Buscar otra vez" }));
      expect(handlers.onSearch).toHaveBeenCalledTimes(1);
    });

    it("mientras busca, el botón lo dice y no se puede repetir", () => {
      setup(null, { searching: true });
      expect(screen.getByRole("button", { name: "Buscando…" })).toBeDisabled();
    });

    it("sin permiso de gestionar no hay botón", () => {
      setup(null, { canManage: false });
      expect(screen.queryByRole("button")).toBeNull();
    });
  });

  it("peor caso: un nombre de 100 caracteres se corta con difuminado, no con «…», y conserva el texto entero", () => {
    const long = "Distribuidora y Comercializadora de Insumos Odontológicos y Hospitalarios del Altiplano Cundiboyacense";
    setup(decider({ name: long }));
    const name = screen.getByTitle(long);
    expect(name.className).toContain("truncate");
    expect(name.textContent).toBe(long);
    expect(name.textContent).not.toContain("…");
  });
});

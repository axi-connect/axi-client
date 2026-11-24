import { cleanup, render, screen, within } from "@testing-library/react";

import type { ContactPointsDTO } from "../../../domain/lead";
import { ContactPointGroups } from "../ContactPointList";

afterEach(cleanup);

const LONG_MAIL = "direccion.administrativa.y.financiera@distribuidora-insumos-altiplano-cundiboyacense.example";

/** Datos ficticios del tenant de pruebas «Norte Studio». */
const POINTS: ContactPointsDTO = {
  emails: [
    { value: "mariana.restrepo@casalumbre.example", type: "con_nombre", source: "site_extractor", source_url: null, primary: true },
    { value: "gerencia@casalumbre.example", type: "de_cargo", source: "site_extractor", source_url: null, primary: false },
    { value: "info@casalumbre.example", type: "generico", source: "google_places", source_url: null, primary: false },
    { value: "casalumbre.hotel@gmail.example", type: "gratuito", source: null, source_url: null, primary: false },
  ],
  phones: [
    { value: "+573105550142", type: "celular", whatsapp: true, source: "site_extractor", source_url: null, primary: true },
    { value: "+576015550188", type: "fijo", whatsapp: false, source: "google_places", source_url: null, primary: false },
    { value: "+573155550107", type: "celular", whatsapp: false, source: "rues", source_url: null, primary: false },
  ],
};

const row = (text: string) => screen.getByText(text).closest("li") as HTMLElement;

describe("ContactPointGroups — «Correos · N» y «Teléfonos · N»", () => {
  it("cuenta y lista TODOS, con su tipo y de dónde salió cada uno", () => {
    render(<ContactPointGroups points={POINTS} emailVerification={null} />);

    expect(screen.getByRole("heading", { name: "Correos · 4" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Teléfonos · 3" })).toBeInTheDocument();
    expect(within(row("gerencia@casalumbre.example")).getByText("De cargo")).toBeInTheDocument();
    expect(within(row("gerencia@casalumbre.example")).getByText("Su sitio web")).toBeInTheDocument();
    expect(within(row("info@casalumbre.example")).getByText("Genérico")).toBeInTheDocument();
    expect(within(row("info@casalumbre.example")).getByText("Google Maps")).toBeInTheDocument();
    expect(within(row("casalumbre.hotel@gmail.example")).getByText("Gratuito del negocio")).toBeInTheDocument();
    expect(within(row("+57 601 555 0188")).getByText("Fijo")).toBeInTheDocument();
    expect(within(row("+57 315 555 0107")).getByText("Registro mercantil")).toBeInTheDocument();
  });

  it("marca cuál es el principal, y solo ese", () => {
    render(<ContactPointGroups points={POINTS} emailVerification={null} />);

    expect(screen.getAllByText("Principal")).toHaveLength(2);
    expect(within(row("mariana.restrepo@casalumbre.example")).getByText("Principal")).toBeInTheDocument();
    expect(within(row("+57 310 555 0142")).getByText("Principal")).toBeInTheDocument();
  });

  it("WhatsApp: «Tiene WhatsApp» si lo publica; en un celular sin enlace, «sin confirmar»; en un fijo, nada", () => {
    render(<ContactPointGroups points={POINTS} emailVerification={null} />);

    expect(within(row("+57 310 555 0142")).getByText("Tiene WhatsApp")).toBeInTheDocument();
    expect(within(row("+57 310 555 0142")).getByText("Enlace de WhatsApp en su sitio")).toBeInTheDocument();
    expect(within(row("+57 315 555 0107")).getByText("WhatsApp sin confirmar")).toBeInTheDocument();
    expect(within(row("+57 601 555 0188")).queryByText(/WhatsApp/)).toBeNull();
  });

  it("la verificación que existe hoy es la del principal: los demás no llevan pastilla", () => {
    render(<ContactPointGroups points={POINTS} emailVerification="verified" />);

    expect(screen.getAllByText("Buzón verificado")).toHaveLength(1);
    expect(within(row("mariana.restrepo@casalumbre.example")).getByText("Buzón verificado")).toBeInTheDocument();
  });

  it("un buzón que rebota lo dice", () => {
    render(<ContactPointGroups points={POINTS} emailVerification="undeliverable" />);
    expect(within(row("mariana.restrepo@casalumbre.example")).getByText("No recibe correo")).toBeInTheDocument();
  });

  it("cada dato se puede copiar (el valor entero, no el texto agrupado)", () => {
    render(<ContactPointGroups points={POINTS} emailVerification={null} />);
    expect(screen.getAllByRole("button", { name: "Copiar correo" })).toHaveLength(4);
    expect(screen.getAllByRole("button", { name: "Copiar teléfono" })).toHaveLength(3);
  });

  it("sin correos no pinta su grupo; sin nada, no pinta nada", () => {
    const { container, rerender } = render(
      <ContactPointGroups points={{ emails: [], phones: POINTS.phones }} emailVerification={null} />,
    );
    expect(screen.queryByRole("heading", { name: /Correos/ })).toBeNull();
    expect(screen.getByRole("heading", { name: "Teléfonos · 3" })).toBeInTheDocument();
    rerender(<ContactPointGroups points={{ emails: [], phones: [] }} emailVerification={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("peor caso: un correo de 90 caracteres se parte en renglones y NUNCA pierde el dominio", () => {
    render(
      <ContactPointGroups
        points={{
          emails: [{ value: LONG_MAIL, type: "de_cargo", source: null, source_url: null, primary: true }],
          phones: [],
        }}
        emailVerification={null}
      />,
    );
    const value = screen.getByTitle(LONG_MAIL);
    expect(value.className).toContain("break-all");
    expect(value.className).not.toContain("truncate");
    expect(value.textContent).toBe(LONG_MAIL);
  });

  it("un teléfono sí se corta con difuminado (no hay dominio que perder)", () => {
    render(<ContactPointGroups points={POINTS} emailVerification={null} />);
    expect(screen.getByTitle("+573105550142").className).toContain("truncate");
  });
});

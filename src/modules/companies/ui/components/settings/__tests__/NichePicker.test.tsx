import { fireEvent, render, screen } from "@testing-library/react";

const mockFeatures = jest.fn();
jest.mock("@/shared/auth/features.hooks", () => ({
  useFeatures: () => mockFeatures(),
}));

import {
  NichePicker,
  nichePreview,
} from "@/modules/companies/ui/components/settings/NichePicker";

const FEATURES = [
  { code: "payment_plans", label: "Planes de pago" },
  { code: "collections", label: "Cobranza" },
  { code: "fx_quotes", label: "Precios en otra moneda" },
  { code: "documents", label: "Documentos del cliente" },
];
const DEFAULTS = {
  hotels_tourism: ["payment_plans", "collections", "fx_quotes", "documents"],
  professional_services: ["documents"],
};

describe("NichePicker (premium P1: el tipo de negocio dice lo que sugiere)", () => {
  beforeEach(() =>
    mockFeatures.mockReturnValue({
      features: FEATURES,
      nicheDefaults: DEFAULTS,
    }),
  );

  it("nichePreview: marca exactamente lo que el tipo sugiere; un tipo fuera del mapa no sugiere nada; sin mapa, nada", () => {
    expect(
      nichePreview("professional_services", DEFAULTS, FEATURES),
    ).toMatchObject({
      suggested: 1,
      rows: [
        { on: false },
        { on: false },
        { on: false },
        { code: "documents", on: true },
      ],
    });
    expect(nichePreview("retail_fashion", DEFAULTS, FEATURES)?.suggested).toBe(
      0,
    );
    expect(nichePreview("hotels_tourism", null, FEATURES)).toBeNull();
  });

  it("sin cambios dice «Así está hoy»; al elegir otro tipo dice cuántas sugiere y avisa al formulario", () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <NichePicker
        value="hotels_tourism"
        saved="hotels_tourism"
        onChange={onChange}
      />,
    );
    const island = screen.getByRole("region", { name: "Al guardar" });
    expect(island).toHaveTextContent("Así está hoy");
    expect(
      screen.getByRole("radio", { name: "Hoteles y turismo" }),
    ).toHaveAttribute("aria-checked", "true");

    fireEvent.click(
      screen.getByRole("radio", { name: "Servicios profesionales" }),
    );
    expect(onChange).toHaveBeenCalledWith("professional_services");

    rerender(
      <NichePicker
        value="professional_services"
        saved="hotels_tourism"
        onChange={onChange}
      />,
    );
    expect(
      screen.getByRole("region", { name: "Al guardar" }),
    ).toHaveTextContent("1 de 4 funciones sugeridas");
  });

  it("un tipo que no sugiere nada lo dice con calma, y sin el mapa la isla no se inventa", () => {
    const { rerender } = render(
      <NichePicker
        value="retail_fashion"
        saved="hotels_tourism"
        onChange={jest.fn()}
      />,
    );
    expect(
      screen.getByRole("region", { name: "Al guardar" }),
    ).toHaveTextContent("Sin funciones de cobro");
    mockFeatures.mockReturnValue({ features: FEATURES, nicheDefaults: null });
    rerender(
      <NichePicker
        value="retail_fashion"
        saved="hotels_tourism"
        onChange={jest.fn()}
      />,
    );
    expect(screen.queryByRole("region", { name: "Al guardar" })).toBeNull();
  });
});

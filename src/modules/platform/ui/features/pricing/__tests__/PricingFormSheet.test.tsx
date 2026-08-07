import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PricingRate } from "../../../../domain/pricing";
import { PricingFormSheet } from "../PricingFormSheet";

jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn() }),
}));

const createMutateAsync = jest.fn();
const updateMutateAsync = jest.fn();
jest.mock("../../../../infrastructure/api/hooks/use-pricing", () => ({
  useCreatePricing: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdatePricing: () => ({ mutateAsync: updateMutateAsync, isPending: false }),
}));

// El DetailSheet real usa portal + framer-motion; para el form basta el contenido.
jest.mock("@/shared/components/features/detail-sheet", () => ({
  DetailSheet: ({ open, title, children }: { open: boolean; title?: React.ReactNode; children?: React.ReactNode }) =>
    open ? (
      <div>
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

const RATE: PricingRate = {
  id: "r-1",
  provider: "anthropic",
  unit: "tokens",
  model: "claude-sonnet-5",
  display_name: "Claude Sonnet 4.5",
  is_default: false,
  input_cost_per_mtok_usd: 3,
  output_cost_per_mtok_usd: 15,
  cache_read_per_mtok_usd: 0.3,
  margin_multiplier: 1.3,
  effective_from: "2026-07-01T00:00:00.000Z",
  effective_to: null,
};

describe("PricingFormSheet", () => {
  beforeEach(() => jest.clearAllMocks());

  it("crear muestra el aviso de upsert y el hint del fallback", () => {
    render(<PricingFormSheet open onOpenChange={() => {}} rate={null} />);
    expect(screen.getByText(/es un upsert/i)).toBeInTheDocument();
    expect(screen.getByText(/usa \* como modelo/i)).toBeInTheDocument();
  });

  it("en edición, proveedor/modelo/vigente-desde quedan bloqueados con hint", () => {
    render(<PricingFormSheet open onOpenChange={() => {}} rate={RATE} />);

    expect(screen.getByLabelText("Proveedor")).toHaveAttribute("data-disabled");
    expect(screen.getByLabelText(/modelo/i)).toBeDisabled();
    expect(screen.getByLabelText(/vigente desde/i)).toBeDisabled();
    expect(screen.getAllByText(/inmutable tras la creación/i).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(/versionado por vigencia/i)).toBeInTheDocument();
  });

  it("crear mapea el DTO con fechas ISO y caché null si va vacía", async () => {
    createMutateAsync.mockResolvedValueOnce({ id: "r-9" });
    const onOpenChange = jest.fn();
    render(<PricingFormSheet open onOpenChange={onOpenChange} rate={null} />);

    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: "gpt-5-mini" } });
    // El catálogo de modelos del tenant sale de estas tarifas: sin nombre
    // visible el selector del agente mostraría el id técnico
    fireEvent.change(screen.getByLabelText(/nombre visible/i), { target: { value: "GPT-5 mini" } });
    fireEvent.change(screen.getByLabelText(/entrada/i), { target: { value: "0.25" } });
    fireEvent.change(screen.getByLabelText(/salida/i), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/margen/i), { target: { value: "1.4" } });
    fireEvent.change(screen.getByLabelText(/vigente desde/i), { target: { value: "2026-08-01" } });
    fireEvent.click(screen.getByRole("button", { name: /crear tarifa/i }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(createMutateAsync).toHaveBeenCalledWith({
      provider: "anthropic",
      // Compat: el DTO exige unidad; el selector de unidad llega en F3
      unit: "tokens",
      model: "gpt-5-mini",
      display_name: "GPT-5 mini",
      is_default: false,
      input_cost_per_mtok_usd: 0.25,
      output_cost_per_mtok_usd: 2,
      cache_read_per_mtok_usd: null,
      margin_multiplier: 1.4,
      effective_from: "2026-08-01T00:00:00.000Z",
    });
  });

  it("un modelo del catálogo no se crea sin nombre visible", async () => {
    render(<PricingFormSheet open onOpenChange={() => {}} rate={null} />);

    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: "gpt-5-mini" } });
    fireEvent.change(screen.getByLabelText(/entrada/i), { target: { value: "0.25" } });
    fireEvent.change(screen.getByLabelText(/salida/i), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/margen/i), { target: { value: "1.4" } });
    fireEvent.change(screen.getByLabelText(/vigente desde/i), { target: { value: "2026-08-01" } });
    fireEvent.click(screen.getByRole("button", { name: /crear tarifa/i }));

    await waitFor(() =>
      expect(screen.getByText(/necesita un nombre visible/i)).toBeInTheDocument(),
    );
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it("la tarifa fallback (*) NO exige nombre visible: no es un modelo elegible", async () => {
    createMutateAsync.mockResolvedValueOnce({ id: "r-10" });
    const onOpenChange = jest.fn();
    render(<PricingFormSheet open onOpenChange={onOpenChange} rate={null} />);

    fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: "*" } });
    fireEvent.change(screen.getByLabelText(/entrada/i), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/salida/i), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText(/margen/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/vigente desde/i), { target: { value: "2026-08-01" } });
    fireEvent.click(screen.getByRole("button", { name: /crear tarifa/i }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.not.objectContaining({ display_name: expect.anything() }),
    );
  });

  it("editar cierra la vigencia enviando effective_to ISO y el margen siempre", async () => {
    updateMutateAsync.mockResolvedValueOnce(undefined);
    render(<PricingFormSheet open onOpenChange={() => {}} rate={RATE} />);

    fireEvent.change(screen.getByLabelText(/vigente hasta/i), { target: { value: "2026-07-17" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    expect(updateMutateAsync).toHaveBeenCalledWith({
      id: "r-1",
      body: expect.objectContaining({
        margin_multiplier: 1.3,
        effective_to: "2026-07-17T00:00:00.000Z",
      }),
    });
  });

  it("una tarifa por caracteres (voz) ajusta labels y deshabilita salida/caché", () => {
    render(
      <PricingFormSheet
        open
        onOpenChange={() => {}}
        rate={{
          ...RATE,
          provider: "elevenlabs",
          unit: "characters",
          model: "eleven_flash_v2_5",
          display_name: "Eleven Flash v2.5",
          output_cost_per_mtok_usd: 0,
          cache_read_per_mtok_usd: null,
        }}
      />,
    );

    expect(screen.getByLabelText(/entrada \(usd\/m caracteres\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/salida/i)).toBeDisabled();
    expect(screen.getByLabelText(/caché/i)).toBeDisabled();
    expect(screen.getByText(/Tarifa por caracteres \(voz\)/)).toBeInTheDocument();
  });
});

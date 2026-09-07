import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { MetaSignupConfigDTO } from "@/modules/channels/domain/meta-signup";

const getMetaSignupConfig = jest.fn<Promise<MetaSignupConfigDTO | null>, [string]>();
jest.mock("@/modules/channels/infrastructure/services/meta-signup.adapter", () => ({
  getMetaSignupConfig: (product: string) => getMetaSignupConfig(product),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { WhatsAppNumberModeStep } = require("../WhatsAppNumberModeStep") as typeof import("../WhatsAppNumberModeStep");

function config(coexistence_enabled: boolean): MetaSignupConfigDTO {
  return {
    enabled: true,
    app_id: "111",
    config_id: "cfg-1",
    graph_api_version: "v23.0",
    product: "whatsapp",
    coexistence_enabled,
  };
}

/**
 * Paso «Tu número» (F1). Lo que se prueba es la política, no el dibujo: qué
 * camino queda preseleccionado según el entorno, y que la coexistencia apagada
 * se OFRECE deshabilitada en vez de esconderse.
 */
describe("WhatsAppNumberModeStep", () => {
  beforeEach(() => jest.clearAllMocks());

  it("con coexistencia disponible la preselecciona: es el camino recomendado (D7)", async () => {
    getMetaSignupConfig.mockResolvedValue(config(true));
    const onChange = jest.fn();
    render(<WhatsAppNumberModeStep value={null} onChange={onChange} onContinue={jest.fn()} />);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("coexistence"));
    expect(screen.getByText(/recomendado/i)).toBeInTheDocument();
    expect(screen.queryByText(/muy pronto/i)).toBeNull();
  });

  it("con coexistencia apagada la tarjeta queda deshabilitada con «Muy pronto» y preselecciona el estándar", async () => {
    getMetaSignupConfig.mockResolvedValue(config(false));
    const onChange = jest.fn();
    render(<WhatsAppNumberModeStep value={null} onChange={onChange} onContinue={jest.fn()} />);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("standard"));
    expect(screen.getByText(/muy pronto/i)).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios[0]).toHaveAttribute("aria-disabled", "true");
  });

  it("un fallo al leer la configuración no rompe el paso: se sigue por el estándar", async () => {
    getMetaSignupConfig.mockRejectedValue(new Error("red"));
    const onChange = jest.fn();
    render(<WhatsAppNumberModeStep value={null} onChange={onChange} onContinue={jest.fn()} />);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("standard"));
  });

  it("no pisa una elección ya hecha y «Continuar» exige haber elegido", async () => {
    getMetaSignupConfig.mockResolvedValue(config(true));
    const onChange = jest.fn();
    const onContinue = jest.fn();
    render(
      <WhatsAppNumberModeStep value="standard" onChange={onChange} onContinue={onContinue} />,
    );

    await waitFor(() => expect(getMetaSignupConfig).toHaveBeenCalledWith("whatsapp"));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("sin elección, «Continuar» está deshabilitado", () => {
    getMetaSignupConfig.mockReturnValue(new Promise(() => undefined));
    render(<WhatsAppNumberModeStep value={null} onChange={jest.fn()} onContinue={jest.fn()} />);

    expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled();
  });
});

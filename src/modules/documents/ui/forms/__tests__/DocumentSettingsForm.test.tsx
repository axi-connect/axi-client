import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type {
  DocumentTypeView,
  DocumentsSettingsDTO,
} from "@/modules/documents/domain/template";

const mockUpdate = jest.fn<Promise<DocumentsSettingsDTO>, [unknown]>();
jest.mock(
  "@/modules/documents/infrastructure/services/documents-service.adapter",
  () => ({ updateDocumentsSettings: (body: unknown) => mockUpdate(body) }),
);
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn() }),
}));

import { DocumentSettingsForm } from "@/modules/documents/ui/forms/DocumentSettingsForm";

const type = (code: string, label: string): DocumentTypeView =>
  ({
    code,
    label,
    issuable: true,
    issue_subject: "order",
    issue_policy: "once",
    regenerable: true,
    default_prefix: code.slice(0, 3).toUpperCase(),
    data_domains: [],
    allowed_blocks: [],
    required_blocks: [],
    legal_notice: null,
    variables: [],
  }) as unknown as DocumentTypeView;

const SETTINGS = {
  issuer: {
    legal_name: null,
    tax_id_label: "NIT",
    address: null,
    city: null,
    phone: null,
    email: null,
    footer_note: null,
  },
  numbering: {
    prefixes: {},
    next: { contract: { next_value: 1, started: false } },
  },
  auto_issue: {
    contract_on_confirm: false,
    contract_on_deposit_verified: false,
    receipt_on_payment_verified: false,
  },
  auto_send: {
    contract: { whatsapp: false, email: false },
    receipt: { whatsapp: false, email: false },
  },
  hsm_fallback: null,
  prefix_defaults: { contract: "CTR" },
  company_defaults: {
    name: "Axi Demo",
    nit: "900.1",
    address: null,
    city: null,
  },
} as unknown as DocumentsSettingsDTO;

function renderForm() {
  mockUpdate.mockImplementation((body) =>
    Promise.resolve({
      ...SETTINGS,
      ...(body as object),
    } as DocumentsSettingsDTO),
  );
  render(
    <DocumentSettingsForm
      settings={SETTINGS}
      types={[type("contract", "Contrato")]}
      onSaved={jest.fn()}
    />,
  );
  const save = screen.getByRole("button", { name: "Guardar ajustes" });
  expect(save).toBeDisabled();
  return save;
}

/**
 * QA real F9 (bloqueante): los tres bloques de «Emisión y envío automáticos»
 * cambiaban el control pero «Guardar ajustes» seguía deshabilitado, porque el
 * setValue del campo personalizado no marcaba el formulario como sucio.
 */
describe("DocumentSettingsForm · emisión y envío automáticos se GUARDAN", () => {
  beforeEach(() => jest.clearAllMocks());

  it("el recibo automático enciende «Guardar» y viaja en el payload", async () => {
    const save = renderForm();
    fireEvent.click(screen.getByRole("switch", { name: "Recibo automático" }));
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0]?.[0]).toMatchObject({
      auto_issue: { receipt_on_payment_verified: true },
    });
  });

  it("«Cuándo se emite el contrato» enciende «Guardar» y viaja como los dos booleanos", async () => {
    const save = renderForm();
    fireEvent.click(
      screen.getByRole("radio", { name: /Al verificar el anticipo/ }),
    );
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0]?.[0]).toMatchObject({
      auto_issue: {
        contract_on_confirm: false,
        contract_on_deposit_verified: true,
      },
    });
  });

  it("un interruptor de «Por dónde se manda» y la plantilla de respaldo también", async () => {
    const save = renderForm();
    fireEvent.click(screen.getByRole("switch", { name: "Recibo · correo" }));
    fireEvent.change(screen.getByPlaceholderText("documento_listo"), {
      target: { value: "documento_listo" },
    });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0]?.[0]).toMatchObject({
      auto_send: { receipt: { email: true } },
      hsm_fallback: { name: "documento_listo", language: "es" },
    });
  });
});

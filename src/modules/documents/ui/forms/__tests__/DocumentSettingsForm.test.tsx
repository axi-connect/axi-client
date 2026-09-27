import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

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

const TYPES = [
  type("contract", "Contrato"),
  type("statement", "Estado de cuenta"),
];

/** Automáticos guardados EN TRUE: el emisor no debe tocarlos al guardar. */
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
    next: {
      contract: { next_value: 121, started: true },
      statement: { next_value: 1, started: false },
    },
  },
  auto_issue: {
    contract_on_confirm: true,
    contract_on_deposit_verified: false,
    receipt_on_payment_verified: true,
  },
  auto_send: {
    contract: { whatsapp: true, email: true },
    receipt: { whatsapp: false, email: true },
  },
  hsm_fallback: { name: "documento_listo", language: "es" },
  prefix_defaults: { contract: "CTR", statement: "EDC" },
  company_defaults: {
    name: "JuanitoXpeditions",
    nit: "901.234.567-8",
    address: "Calle 93 # 11-27",
    city: "Bogotá",
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
      types={TYPES}
      onSaved={jest.fn()}
    />,
  );
}

const island = () =>
  screen.getByRole("region", { name: "Así firma tus papeles" });

describe("DocumentSettingsForm · emisor y numeración (premium P6)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("el siguiente número del tipo que ya emitió va bloqueado; el virgen se puede fijar y dice cómo saldrá", () => {
    renderForm();
    expect(screen.getByLabelText("Contrato · siguiente número")).toBeDisabled();
    const statement = screen.getByLabelText(
      "Estado de cuenta · siguiente número",
    );
    expect(statement).toBeEnabled();
    fireEvent.change(statement, { target: { value: "40" } });
    const year = String(new Date().getFullYear());
    expect(within(island()).getByText(`EDC-${year}-0040`)).toBeInTheDocument();
    // El bloqueado sigue con el número del servidor aunque no se pueda tocar.
    expect(within(island()).getByText(`CTR-${year}-0121`)).toBeInTheDocument();
  });

  it("la isla dice lo que imprime «Partes»: lo escrito manda y lo vacío cae a Mi empresa", () => {
    renderForm();
    const lines = () =>
      within(island())
        .getAllByRole("listitem")
        .map((item) => item.textContent);
    expect(lines()).toEqual([
      "JuanitoXpeditions",
      "NIT 901.234.567-8",
      "Calle 93 # 11-27, Bogotá",
    ]);
    fireEvent.change(screen.getByLabelText("Razón social"), {
      target: { value: "JuanitoXpeditions S.A.S." },
    });
    fireEvent.change(screen.getByLabelText("Ciudad"), {
      target: { value: "Medellín" },
    });
    expect(lines()).toEqual([
      "JuanitoXpeditions S.A.S.",
      "NIT 901.234.567-8",
      "Calle 93 # 11-27, Medellín",
    ]);
  });

  it("la nota al pie se presenta como lo que es: va en el correo, no en el PDF", () => {
    renderForm();
    expect(screen.getByText(/El PDF no la lleva/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nota al pie del correo"), {
      target: { value: "RNT 45012" },
    });
    expect(
      within(island()).getByText(/Al pie del correo de cada envío/),
    ).toHaveTextContent("«RNT 45012»");
  });

  it("sin cambios no hay barra; al guardar viaja el emisor y los automáticos quedan como estaban", async () => {
    renderForm();
    expect(
      screen.queryByRole("button", { name: "Guardar ajustes" }),
    ).toBeNull();
    fireEvent.change(screen.getByLabelText("Teléfono"), {
      target: { value: "+57 300 123 4567" },
    });
    const save = await screen.findByRole("button", { name: "Guardar ajustes" });
    fireEvent.click(save);
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0]?.[0]).toMatchObject({
      issuer: { phone: "+57 300 123 4567", legal_name: null },
      auto_issue: {
        contract_on_confirm: true,
        receipt_on_payment_verified: true,
      },
      auto_send: { contract: { whatsapp: true, email: true } },
      hsm_fallback: { name: "documento_listo", language: "es" },
    });
    // El contador bloqueado nunca viaja.
    expect(
      (mockUpdate.mock.calls[0]?.[0] as { numbering: { start_at?: unknown } })
        .numbering.start_at,
    ).toBeUndefined();
  });

  it("descartar vuelve a lo guardado y la barra se va", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Teléfono"), {
      target: { value: "123" },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Descartar" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Guardar ajustes" }),
      ).toBeNull(),
    );
    expect(screen.getByLabelText("Teléfono")).toHaveValue("");
  });
});

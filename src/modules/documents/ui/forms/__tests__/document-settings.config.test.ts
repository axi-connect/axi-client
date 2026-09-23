import type {
  DocumentTypeView,
  DocumentsSettingsDTO,
} from "@/modules/documents/domain/template";
import {
  buildDocumentSettingsFields,
  fromSettingsDto,
  toSettingsPayload,
} from "@/modules/documents/ui/forms/config/document-settings.config";

function type(code: string, label: string): DocumentTypeView {
  return {
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
  };
}

const TYPES = [
  type("contract", "Contrato"),
  type("statement", "Estado de cuenta"),
];

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
    contract_on_confirm: false,
    contract_on_deposit_verified: false,
    receipt_on_payment_verified: false,
  },
  auto_send: {
    contract: { whatsapp: false, email: false },
    receipt: { whatsapp: false, email: false },
  },
  hsm_fallback: null,
  prefix_defaults: { contract: "CTR", statement: "EDC" },
  company_defaults: { name: "Axi", nit: "900.1", address: null, city: null },
} as unknown as DocumentsSettingsDTO;

describe("«Siguiente número» (F8) en el formulario de ajustes", () => {
  it("los valores iniciales son los contadores que enseñó el servidor", () => {
    expect(fromSettingsDto(SETTINGS, TYPES).start_at).toEqual({
      contract: "121",
      statement: "1",
    });
  });

  it("el campo del tipo que ya emitió va bloqueado y lo dice; el virgen dice cómo saldrá", () => {
    const fields = buildDocumentSettingsFields({
      types: TYPES,
      defaults: SETTINGS.company_defaults,
      prefixDefaults: SETTINGS.prefix_defaults,
      next: SETTINGS.numbering.next,
    });
    const contract = fields.find((field) => field.name === "start_at.contract");
    const statement = fields.find(
      (field) => field.name === "start_at.statement",
    );
    expect(contract?.isDisabled?.({} as never)).toBe(true);
    expect(String(contract?.description)).toMatch(/Ya salió el primero/);
    expect(statement?.isDisabled?.({} as never)).toBe(false);
    expect(String(statement?.description)).toMatch(/EDC-2026-0001/);
    // El «siguiente número» va al lado de su prefijo, tipo por tipo
    const names = fields.map((field) => String(field.name));
    expect(names.indexOf("start_at.contract")).toBe(
      names.indexOf("prefixes.contract") + 1,
    );
  });

  it("solo viaja lo que cambió y no está bloqueado: un 409 por nada no se pide", () => {
    const values = fromSettingsDto(SETTINGS, TYPES);
    // Sin tocar nada: sin start_at en el payload
    expect(
      toSettingsPayload(values, SETTINGS).numbering.start_at,
    ).toBeUndefined();
    // Mover el virgen a 40 → viaja como número; el bloqueado nunca, aunque cambie el valor
    const moved = { ...values, start_at: { contract: "999", statement: "40" } };
    expect(toSettingsPayload(moved, SETTINGS).numbering.start_at).toEqual({
      statement: 40,
    });
    // Vacío = no tocar
    expect(
      toSettingsPayload({ ...values, start_at: { statement: "" } }, SETTINGS)
        .numbering.start_at,
    ).toBeUndefined();
  });
});

import type {
  DocumentTypeView,
  DocumentsSettingsDTO,
} from "@/modules/documents/domain/template";
import {
  buildDocumentSettingsFields,
  contractIssueOf,
  documentSettingsSchema,
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

describe("Emisión y envío automáticos (F9) en el formulario de ajustes", () => {
  it("dos booleanos → una opción; los dos en true (datos viejos) caen a «al confirmar», que dispara primero", () => {
    expect(
      contractIssueOf({
        contract_on_confirm: false,
        contract_on_deposit_verified: false,
        receipt_on_payment_verified: false,
      }),
    ).toBe("never");
    expect(
      contractIssueOf({
        contract_on_confirm: false,
        contract_on_deposit_verified: true,
        receipt_on_payment_verified: false,
      }),
    ).toBe("on_deposit_verified");
    expect(
      contractIssueOf({
        contract_on_confirm: true,
        contract_on_deposit_verified: true,
        receipt_on_payment_verified: false,
      }),
    ).toBe("on_confirm");
  });

  it("del DTO al formulario y de vuelta: los campos planos se vuelven a anidar como el wire", () => {
    const dto = {
      ...SETTINGS,
      auto_issue: {
        contract_on_confirm: false,
        contract_on_deposit_verified: true,
        receipt_on_payment_verified: true,
      },
      auto_send: {
        contract: { whatsapp: true, email: false },
        receipt: { whatsapp: true, email: true },
      },
      hsm_fallback: { name: "documento_listo", language: "es_CO" },
    } as DocumentsSettingsDTO;
    const values = fromSettingsDto(dto, TYPES);
    expect(values).toMatchObject({
      contract_issue: "on_deposit_verified",
      receipt_on_payment_verified: true,
      send_contract_whatsapp: true,
      send_contract_email: false,
      send_receipt_whatsapp: true,
      send_receipt_email: true,
      hsm_name: "documento_listo",
      hsm_language: "es_CO",
    });
    const payload = toSettingsPayload(values, dto);
    expect(payload.auto_issue).toEqual(dto.auto_issue);
    expect(payload.auto_send).toEqual(dto.auto_send);
    expect(payload.hsm_fallback).toEqual(dto.hsm_fallback);
    // «Al confirmar» apaga el otro booleano: nunca viajan los dos en true
    expect(
      toSettingsPayload({ ...values, contract_issue: "on_confirm" }, dto)
        .auto_issue,
    ).toEqual({
      contract_on_confirm: true,
      contract_on_deposit_verified: false,
      receipt_on_payment_verified: true,
    });
  });

  it("plantilla de respaldo: sin nombre viaja null (apaga el respaldo); con nombre y sin idioma, `es`", () => {
    const values = fromSettingsDto(SETTINGS, TYPES);
    expect(toSettingsPayload(values, SETTINGS).hsm_fallback).toBeNull();
    expect(
      toSettingsPayload({ ...values, hsm_name: "documento_listo" }, SETTINGS)
        .hsm_fallback,
    ).toEqual({ name: "documento_listo", language: "es" });
    expect(
      toSettingsPayload(
        { ...values, hsm_name: " documento_listo ", hsm_language: "en_US" },
        SETTINGS,
      ).hsm_fallback,
    ).toEqual({ name: "documento_listo", language: "en_US" });
  });

  it("validación: el nombre sigue el patrón de Meta; un idioma sin plantilla se marca (ambos o ninguno); nombre sin idioma pasa", () => {
    const values = fromSettingsDto(SETTINGS, TYPES);
    const ok = documentSettingsSchema.safeParse({
      ...values,
      hsm_name: "documento_listo",
    });
    expect(ok.success).toBe(true);
    const badName = documentSettingsSchema.safeParse({
      ...values,
      hsm_name: "Documento Listo",
    });
    expect(badName.success).toBe(false);
    const orphanLanguage = documentSettingsSchema.safeParse({
      ...values,
      hsm_language: "es",
    });
    expect(orphanLanguage.success).toBe(false);
    if (!orphanLanguage.success) {
      expect(orphanLanguage.error.issues[0]?.path).toEqual(["hsm_name"]);
    }
    const badLanguage = documentSettingsSchema.safeParse({
      ...values,
      hsm_name: "documento_listo",
      hsm_language: "espanol",
    });
    expect(badLanguage.success).toBe(false);
  });
});

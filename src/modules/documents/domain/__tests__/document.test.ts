import type { DocumentTypeView } from "@/modules/documents/domain/template";
import {
  latestChange,
  canRetry,
  DOCUMENT_STATUS_LABELS,
  documentStatusTone,
  isDocumentInFlight,
  isOutdated,
  issueOptions,
  sortDocuments,
  type DocumentDTO,
  type DocumentStatus,
} from "@/modules/documents/domain/document";

function doc(overrides: Partial<DocumentDTO> = {}): DocumentDTO {
  return {
    id: "d1",
    type_code: "contract",
    type_label: "Contrato",
    status: "rendered",
    number: "CTR-2026-0120",
    contact_id: "c1",
    order_id: "o1",
    payment_id: null,
    template_source: "system",
    template_version_id: null,
    size_bytes: 1000,
    page_count: 2,
    rendered_at: "2026-09-16T10:00:00.000Z",
    error_code: null,
    attempts: 1,
    issued_by: "user",
    issued_by_user_id: null,
    regenerated_from_id: null,
    superseded_at: null,
    created_at: "2026-09-16T10:00:00.000Z",
    updated_at: "2026-09-16T10:00:00.000Z",
    last_delivery: { whatsapp: null, email: null },
    ...overrides,
  };
}

function type(
  code: string,
  overrides: Partial<DocumentTypeView> = {},
): DocumentTypeView {
  return {
    code,
    label: code,
    issuable: true,
    issue_subject: "order",
    issue_policy: "once",
    regenerable: true,
    default_prefix: "X",
    data_domains: [],
    allowed_blocks: [],
    required_blocks: [],
    legal_notice: null,
    variables: [],
    ...overrides,
  };
}

describe("documento emitido — lecturas puras", () => {
  it("todos los estados tienen etiqueta y tono; generando es transitorio", () => {
    const statuses: DocumentStatus[] = [
      "queued",
      "rendering",
      "rendered",
      "failed",
      "superseded",
    ];
    for (const status of statuses) {
      expect(DOCUMENT_STATUS_LABELS[status]).toBeTruthy();
      expect(documentStatusTone(status)).toBeTruthy();
    }
    expect(documentStatusTone("rendered")).toBe("ok");
    expect(documentStatusTone("queued")).toBe("busy");
    expect(documentStatusTone("failed")).toBe("bad");
    expect(documentStatusTone("superseded")).toBe("off");
    expect(isDocumentInFlight("rendering")).toBe(true);
    expect(isDocumentInFlight("rendered")).toBe(false);
  });

  it("desactualizado: el pedido cambió DESPUÉS del papel; nunca para un reemplazado ni sin fecha", () => {
    const paper = doc({ created_at: "2026-09-16T10:00:00.000Z" });
    expect(isOutdated(paper, "2026-09-19T08:00:00.000Z")).toBe(true);
    expect(isOutdated(paper, "2026-09-16T09:00:00.000Z")).toBe(false);
    expect(isOutdated(paper, "2026-09-16T10:00:00.000Z")).toBe(false);
    expect(isOutdated(paper, null)).toBe(false);
    expect(
      isOutdated(doc({ status: "superseded" }), "2027-01-01T00:00:00.000Z"),
    ).toBe(false);
  });

  it("reintentar: solo un failed con rondas disponibles (tres rondas → regenerar)", () => {
    expect(canRetry(doc({ status: "failed", attempts: 1 }))).toBe(true);
    expect(canRetry(doc({ status: "failed", attempts: 2 }))).toBe(true);
    expect(canRetry(doc({ status: "failed", attempts: 3 }))).toBe(false);
    expect(canRetry(doc({ status: "rendered", attempts: 1 }))).toBe(false);
  });

  it("el menú «Emitir» ofrece solo lo emitible sobre la entidad y marca lo que ya existe (uno por entidad)", () => {
    const types = [
      type("contract"),
      type("receipt", { issue_subject: "payment" }),
      type("cuenta_cobro", { issue_policy: "many" }),
      type("statement", { issue_policy: "many" }),
      type("commercial_invoice", { issuable: false }),
    ];
    const existing = doc({ type_code: "contract", number: "CTR-2026-0120" });
    const gone = doc({ id: "d0", type_code: "contract", status: "superseded" });
    const cc = doc({
      id: "d2",
      type_code: "cuenta_cobro",
      number: "CC-2026-0001",
    });
    const options = issueOptions(types, { kind: "order", id: "o1" }, [
      gone,
      existing,
      cc,
    ]);
    expect(options.map((option) => option.type.code)).toEqual([
      "contract",
      "cuenta_cobro",
      "statement",
    ]);
    expect(options[0]?.existing?.number).toBe("CTR-2026-0120");
    // Numerada por pedido: nunca «ya existe», aunque haya una
    expect(options[1]?.existing).toBeNull();
    // Sobre un pago, el recibo entra y el contrato no
    expect(
      issueOptions(types, { kind: "payment", id: "p1" }, []).map(
        (o) => o.type.code,
      ),
    ).toEqual(["receipt"]);
  });

  it("ordena: vigentes primero (más reciente arriba), reemplazados al final", () => {
    const sorted = sortDocuments([
      doc({ id: "old", created_at: "2026-09-01T00:00:00.000Z" }),
      doc({
        id: "gone",
        status: "superseded",
        created_at: "2026-09-20T00:00:00.000Z",
      }),
      doc({ id: "new", created_at: "2026-09-10T00:00:00.000Z" }),
    ]);
    expect(sorted.map((d) => d.id)).toEqual(["new", "old", "gone"]);
  });
});

describe("QA F8: latestChange — reprogramar también desactualiza el papel", () => {
  it("toma la fecha MÁS reciente entre el pedido y la reprogramación; ignora las ausentes", () => {
    expect(
      latestChange("2026-09-20T10:00:00.000Z", "2026-09-24T10:00:00.000Z"),
    ).toBe("2026-09-24T10:00:00.000Z");
    expect(
      latestChange("2026-09-24T10:00:00.000Z", "2026-09-20T10:00:00.000Z"),
    ).toBe("2026-09-24T10:00:00.000Z");
    expect(latestChange("2026-09-20T10:00:00.000Z", null)).toBe(
      "2026-09-20T10:00:00.000Z",
    );
    expect(latestChange(null, undefined)).toBeNull();
  });

  it("un contrato emitido ANTES de reprogramar sale desactualizado aunque el pedido no haya cambiado", () => {
    const paper = {
      status: "rendered" as const,
      created_at: "2026-09-22T10:00:00.000Z",
    };
    const orderUpdated = "2026-09-21T10:00:00.000Z";
    expect(isOutdated(paper, orderUpdated)).toBe(false);
    expect(
      isOutdated(paper, latestChange(orderUpdated, "2026-09-24T10:00:00.000Z")),
    ).toBe(true);
  });
});

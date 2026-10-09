import { quotaBatchNotice } from "../quota";
import {
  GIB,
  cellStops,
  cellUnitBytes,
  driveModel,
  durationPhrase,
  formatStorageBytes,
  groupByOrigin,
  headFigure,
  headLine,
  measuredAgo,
  pacePhrases,
  quotaProvenance,
  splitBytes,
  windowPhrase,
  type StorageSummaryDTO,
} from "../storage";
import { routeModel } from "../route";
import { quotaNotice, quotaNoticeTitle, readQuotaExceeded, UPLOADS_BLOCKED_HINT } from "../quota";

const MIB = 1024 ** 2;

function summary(overrides: Partial<StorageSummaryDTO> = {}): StorageSummaryDTO {
  return {
    company_id: "c1",
    name: "Clínica Dermalux",
    plan_name: "Crecimiento",
    used_bytes: 12.6 * GIB,
    quota_bytes: 15 * GIB,
    quota_source: "plan",
    grace_pct: 5,
    pct_used: 84,
    state: "warning",
    blocks_uploads: false,
    room_bytes: 3.15 * GIB,
    by_category: [
      { category: "inbound_media", origin: "customer", bytes: 8.1 * GIB, objects: 1200 },
      { category: "catalog_image", origin: "team", bytes: 2 * GIB, objects: 300 },
      { category: "outbound_upload", origin: "team", bytes: 1 * GIB, objects: 90 },
      { category: "call_recording", origin: "system", bytes: 1 * GIB, objects: 40 },
      { category: "platform_asset", origin: "platform", bytes: 0.5 * GIB, objects: 2 },
    ],
    growth: {
      per_month_bytes: 0.8 * GIB,
      days_to_full: 90,
      series: [
        { day: "2026-04-10", bytes: 7.8 * GIB },
        { day: "2026-07-10", bytes: 10.1 * GIB },
        { day: "2026-10-08", bytes: 12.6 * GIB },
      ],
      window_days: 180,
    },
    measured_at: "2026-10-08T12:00:00Z",
    ...overrides,
  };
}

describe("formato es-CO de bytes", () => {
  it("GB y TB con un decimal y coma; MB y KB enteros", () => {
    expect(formatStorageBytes(12.6 * GIB)).toBe("12,6 GB");
    expect(formatStorageBytes(15 * GIB)).toBe("15 GB");
    expect(formatStorageBytes(3 * GIB)).toBe("3 GB");
    expect(formatStorageBytes(512 * MIB)).toBe("512 MB");
    expect(formatStorageBytes(1.2 * 1024 * GIB)).toBe("1,2 TB");
    expect(formatStorageBytes(300)).toBe("300 B");
  });

  it("cero y valores inválidos son «0 B», nunca NaN", () => {
    expect(formatStorageBytes(0)).toBe("0 B");
    expect(formatStorageBytes(Number.NaN)).toBe("0 B");
    expect(formatStorageBytes(-5)).toBe("0 B");
  });

  it("la unidad forzada sirve para «0 GB libres de 15 GB»", () => {
    expect(splitBytes(0, "GB")).toEqual({ value: "0", unit: "GB" });
  });
});

describe("orígenes", () => {
  it("agrupa en clientes / tu equipo / Axi (system y platform son Axi), en orden fijo", () => {
    const totals = groupByOrigin(summary().by_category);
    expect(totals.map((total) => total.group)).toEqual(["customers", "team", "axi"]);
    expect(totals[0].bytes).toBeCloseTo(8.1 * GIB);
    expect(totals[1].bytes).toBeCloseTo(3 * GIB);
    expect(totals[1].objects).toBe(390);
    expect(totals[2].bytes).toBeCloseTo(1.5 * GIB);
  });

  it("un origen sin archivos sigue presente con 0 (la ficha no cambia de forma)", () => {
    const totals = groupByOrigin([{ category: "inbound_media", origin: "customer", bytes: GIB, objects: 1 }]);
    expect(totals).toHaveLength(3);
    expect(totals[1]).toEqual({ group: "team", bytes: 0, objects: 0 });
  });
});

describe("«Tu disco»", () => {
  it("1 GB por cuadro con la cuota aprobada (15 GB → 15 cuadros)", () => {
    expect(cellUnitBytes(15 * GIB)).toBe(GIB);
    const model = driveModel(summary());
    expect(model.cells).toHaveLength(15);
    expect(model.unitCaption).toBe("Cada cuadro es 1 GB");
    expect(model.caption).toBe("15 GB");
  });

  it("cuotas grandes suben el cuadro y pequeñas lo bajan, nunca más de 20 cuadros", () => {
    expect(cellUnitBytes(150 * GIB)).toBe(10 * GIB);
    expect(cellUnitBytes(1 * GIB)).toBeCloseTo(0.1 * GIB);
    expect(driveModel(summary({ quota_bytes: 150 * GIB })).cells.length).toBeLessThanOrEqual(20);
  });

  it("espejo de _cell_bg: el cuadro que cruza dos orígenes lleva los dos tramos; los libres son null", () => {
    const segments = [
      { group: "customers" as const, size: 8.1 },
      { group: "team" as const, size: 3 },
      { group: "axi" as const, size: 1.5 },
    ];
    const crossing = cellStops(8, segments);
    expect(crossing?.map((stop) => stop.group)).toEqual(["customers", "team"]);
    expect(crossing?.[0].from).toBe(0);
    expect(crossing?.[0].to).toBeCloseTo(10);
    expect(cellStops(0, segments)).toEqual([{ group: "customers", from: 0, to: 100 }]);
    expect(cellStops(13, segments)).toBeNull();
  });

  it("los cuadros llenos y libres suman lo usado: 12,6 GB de 15 → 12 llenos, 1 parcial, 2 libres", () => {
    const { cells } = driveModel(summary());
    expect(cells.filter((cell) => cell === null)).toHaveLength(2);
    const partial = cells[12];
    expect(partial).not.toBeNull();
    expect(partial?.[partial.length - 1].to).toBeCloseTo(60);
  });

  it("sin cuota el disco mide lo ocupado y dice «Sin tope»", () => {
    const model = driveModel(summary({ quota_bytes: null, state: "unlimited", used_bytes: 3.4 * GIB }));
    expect(model.caption).toBe("Sin tope");
    expect(model.cells.length).toBeGreaterThan(0);
  });
});

describe("frases de «Tu espacio»", () => {
  it("con cuota la cifra es lo que QUEDA, con su procedencia", () => {
    expect(headFigure(summary())).toEqual({ value: "2,4", unit: "GB libres de 15 GB" });
    expect(quotaProvenance(summary())).toBe("Incluido en tu plan Crecimiento");
    expect(quotaProvenance(summary({ quota_source: "override" }))).toBe("Ampliado por soporte");
  });

  it("lleno: «0 GB libres» (no «0 B») y la frase de que los clientes siguen llegando", () => {
    const full = summary({ used_bytes: 15 * GIB, state: "full", blocks_uploads: true });
    expect(headFigure(full)).toEqual({ value: "0", unit: "GB libres de 15 GB" });
    expect(headLine(full).map((part) => part.text).join("")).toContain("siguen llegando completos");
  });

  it("sin cuota la cifra es lo ocupado", () => {
    expect(headFigure(summary({ quota_bytes: null, state: "unlimited", used_bytes: 3.4 * GIB }))).toEqual({
      value: "3,4",
      unit: "GB ocupados",
    });
  });

  it("dice cuánto dura lo que queda a este ritmo, sin regañar", () => {
    const line = headLine(summary()).map((part) => part.text).join("");
    expect(line).toBe("Te quedan 2,4 GB: unos 3 meses a tu ritmo actual.");
    expect(line).not.toMatch(/consumido|%/);
  });

  it("sin ritmo (days_to_full null) dice lo que queda de la cuota", () => {
    const line = headLine(summary({ growth: { ...summary().growth, days_to_full: null } })).map((part) => part.text).join("");
    expect(line).toBe("Te quedan 2,4 GB de 15 GB.");
  });

  it("duraciones legibles", () => {
    expect(durationPhrase(0.5)).toBe("menos de un día");
    expect(durationPhrase(5)).toBe("unos 5 días");
    expect(durationPhrase(21)).toBe("unas 3 semanas");
    expect(durationPhrase(35)).toBe("unas 5 semanas");
    expect(durationPhrase(90)).toBe("unos 3 meses");
    expect(durationPhrase(1000)).toBe("más de dos años");
  });

  it("la medición tiene procedencia relativa", () => {
    const now = new Date("2026-10-08T12:04:30Z");
    expect(measuredAgo("2026-10-08T12:00:00Z", now)).toBe("Medido hace 4 min");
    expect(measuredAgo("2026-10-08T12:04:10Z", now)).toBe("Medido hace un momento");
    expect(measuredAgo("2026-10-08T09:00:00Z", now)).toBe("Medido hace 3 h");
    expect(windowPhrase(180)).toBe("Según tus últimos 6 meses");
    expect(windowPhrase(30)).toBe("Según tus últimos 30 días");
  });
});

describe("«Tu ritmo»", () => {
  const now = new Date("2026-10-08T12:00:00Z");

  it("con proyección nombra el mes del tope y lo que más ocupa", () => {
    const pace = pacePhrases(summary(), now);
    expect(pace?.title).toBe("Llegas al tope hacia enero");
    expect(pace?.body).toContain("≈ 819 MB al mes");
    expect(pace?.body).toContain("lo que te envían tus clientes");
  });

  it("lleno: llegó al tope, sin proyección", () => {
    const pace = pacePhrases(summary({ state: "full", used_bytes: 15 * GIB, blocks_uploads: true, room_bytes: 0 }), now);
    expect(pace?.title).toBe("Llegaste al tope");
    // C-2, el otro signo: pasado el 100 % pero dentro del margen se sigue subiendo
    const margin = summary({ state: "full", used_bytes: 15.4 * GIB, blocks_uploads: false, room_bytes: 0.35 * GIB });
    expect(pacePhrases(margin, now)?.title).toBe("Estás usando el margen");
    expect(headLine(margin).map((part) => part.text).join("")).toContain("estás usando el margen");
    const route = routeModel(summary({ state: "full", used_bytes: 15 * GIB }));
    expect(route?.projection).toBeNull();
  });

  it("se oculta sin cuota o sin serie", () => {
    expect(pacePhrases(summary({ quota_bytes: null, state: "unlimited" }), now)).toBeNull();
    expect(pacePhrases(summary({ growth: { ...summary().growth, series: [] } }), now)).toBeNull();
    expect(routeModel(summary({ growth: { ...summary().growth, series: [{ day: "2026-10-08", bytes: 1 }] } }))).toBeNull();
  });

  it("la proyección llega al tope (la línea punteada termina en la raya de la cuota)", () => {
    const route = routeModel(summary());
    expect(route).not.toBeNull();
    expect(route?.projection?.reachesCap).toBe(true);
    expect(route?.projection?.to.y).toBeCloseTo(route?.capY ?? 0);
    expect(route?.labels.map((label) => label.text)).toEqual(["abr", "hoy", "ene"]);
  });

  it("una proyección lejana se recorta y no llega al tope (no aplasta la historia)", () => {
    const route = routeModel(summary({ growth: { ...summary().growth, days_to_full: 3000 } }));
    expect(route?.projection?.reachesCap).toBe(false);
    expect(route?.projection?.to.y).toBeGreaterThan(route?.capY ?? 0);
    expect(route?.labels).toHaveLength(2);
  });
});

describe("el 507 storage/quota_exceeded", () => {
  const http507 = {
    status: 507,
    code: "storage/quota_exceeded",
    problem: {
      details: {
        scope: "tenant",
        used_bytes: 15 * GIB,
        quota_bytes: 15 * GIB,
        incoming_bytes: 2 * MIB,
        pct_used: 100,
        category: "outbound_upload",
        support_cta: { kind: "contact_support" },
      },
    },
  };

  it("lo reconoce por su code y lee los detalles", () => {
    expect(readQuotaExceeded(http507)).toEqual({
      scope: "tenant",
      used_bytes: 15 * GIB,
      quota_bytes: 15 * GIB,
      incoming_bytes: 2 * MIB,
      pct_used: 100,
      category: "outbound_upload",
    });
  });

  it("cualquier otro error no es el 507 (ni siquiera otro 507)", () => {
    expect(readQuotaExceeded({ status: 413, code: "conversations/upload_too_large" })).toBeNull();
    expect(readQuotaExceeded({ status: 507, code: "other/thing" })).toBeNull();
    expect(readQuotaExceeded(new Error("Failed to fetch"))).toBeNull();
    expect(readQuotaExceeded(null)).toBeNull();
  });

  it("título de la píldora ≤ 34 caracteres, con el nombre recortado", () => {
    expect(quotaNoticeTitle("promo.jpg")).toBe("No subimos «promo.jpg»");
    const long = quotaNoticeTitle("catalogo-completo-temporada-navidad-2026.pdf");
    expect(long.length).toBeLessThanOrEqual(34);
    expect(long.endsWith("…»")).toBe(true);
    expect(quotaNoticeTitle(null)).toBe("No subimos el archivo");
  });

  it("«Ver espacio» solo para quien puede verlo; el resto lee a quién pedírselo", () => {
    const details = readQuotaExceeded(http507);
    if (details === null) throw new Error("debía reconocer el 507");
    expect(quotaNotice(details, "a.jpg", true).showSeeStorage).toBe(true);
    const operator = quotaNotice(details, "a.jpg", false);
    expect(operator.showSeeStorage).toBe(false);
    expect(operator.description).toBe(UPLOADS_BLOCKED_HINT);
  });

  it("la capacidad del servidor llena no culpa al tenant ni ofrece «Ver espacio»", () => {
    const details = readQuotaExceeded({ ...http507, problem: { details: { scope: "platform_capacity" } } });
    if (details === null) throw new Error("debía reconocer el 507");
    const notice = quotaNotice(details, "a.jpg", true);
    expect(notice.showSeeStorage).toBe(false);
    expect(notice.description).not.toContain("Tu espacio");
  });
});

describe("aviso del 507 por lote (C-3)", () => {
  const tenant = { scope: "tenant" as const, used_bytes: 1, quota_bytes: 1, incoming_bytes: 1, pct_used: 100, category: "catalog_image" };

  it("un lote de cuatro es UNA píldora que dice el motivo", () => {
    const notice = quotaBatchNotice(tenant, ["IMG_1.jpg", "IMG_2.jpg", "IMG_3.jpg", "IMG_4.jpg"], true);
    expect(notice.title).toBe("Tu espacio está lleno");
    expect(notice.description).toContain("No subimos 4 archivos.");
    expect(notice.showSeeStorage).toBe(true);
  });

  it("uno solo lleva su nombre; sin permiso no ofrece «Ver espacio»", () => {
    const notice = quotaBatchNotice(tenant, ["promo.jpg"], false);
    expect(notice.description).toContain("No subimos «promo.jpg».");
    expect(notice.showSeeStorage).toBe(false);
  });

  it("un lote sin nombre (la cola de fotos) no habla de «el archivo»", () => {
    expect(quotaBatchNotice(tenant, [null], true).description).toContain("No se subieron los archivos nuevos.");
  });

  it("la reserva del servidor no culpa al tenant", () => {
    const notice = quotaBatchNotice({ ...tenant, scope: "platform_capacity" }, ["a.jpg"], true);
    expect(notice.title).toBe("El almacenamiento está en pausa");
    expect(notice.showSeeStorage).toBe(false);
  });
});

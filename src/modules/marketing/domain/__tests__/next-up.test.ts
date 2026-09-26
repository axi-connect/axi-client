import type { AutomationDTO } from "../automation";
import { marketingNextUpHeadline, marketingNextUpItems, type MetaStatus } from "../next-up";
import type { PromotionDTO } from "../promotion";

const NOW = new Date("2026-09-23T15:00:00.000Z");

function rule(over: Partial<AutomationDTO> = {}): AutomationDTO {
  return {
    id: "a1",
    name: "Oferta para cerrar",
    // Solo `deal_stalled` escribe fuera de la ventana de 24 h: es el que exige plantilla de Meta.
    trigger_type: "deal_stalled",
    delay_minutes: 7200,
    enabled: false,
    hsm_template_name: null,
    ...over,
  } as AutomationDTO;
}

function promo(over: Partial<PromotionDTO> = {}): PromotionDTO {
  return {
    id: "p1",
    name: "Amor y amistad",
    enabled: true,
    starts_at: "2026-09-01T00:00:00.000Z",
    ends_at: null,
    max_redemptions_total: null,
    redemptions_count: 0,
    ...over,
  } as PromotionDTO;
}

const META: MetaStatus = { approved: 5, pending: 0, rejected: 0, rejectedName: null, window: { limit: 1000, used: 100, remaining: 900 } };

const base = { automations: [], promotions: [], drafts: 0, meta: META, now: NOW };

describe("marketingNextUpItems", () => {
  it("sin nada a medias, no pinta filas", () => {
    expect(marketingNextUpItems(base)).toEqual([]);
  });

  it("una regla que escribe pasadas 24 h sin plantilla no puede enviar, y enlaza a ESA regla", () => {
    const [item] = marketingNextUpItems({ ...base, automations: [rule()] });
    expect(item.key).toBe("blocked-rules");
    expect(item.detail).toContain("Oferta para cerrar");
    expect(item.href).toBe("/marketing/automations?automation=a1");
  });

  it("ordena por gravedad: rechazada, luego avisos, luego borradores", () => {
    const items = marketingNextUpItems({
      ...base,
      automations: [rule()],
      drafts: 2,
      meta: { ...META, rejected: 1, rejectedName: "promo_septiembre" },
    });
    expect(items.map((item) => item.key)).toEqual(["rejected-template", "blocked-rules", "drafts"]);
    expect(items[0].detail).toContain("promo_septiembre");
    expect(marketingNextUpHeadline(items)).toBe("Algo necesita tu revisión");
  });

  it("una promoción viva que vence en 48 h o va por el 90 % de su tope pide atención; una lejana, no", () => {
    const items = marketingNextUpItems({
      ...base,
      promotions: [
        promo({ id: "p1", name: "Vence mañana", ends_at: "2026-09-24T20:00:00.000Z" }),
        promo({ id: "p2", name: "Casi agotada", max_redemptions_total: 50, redemptions_count: 46 }),
        promo({ id: "p3", name: "Tranquila", ends_at: "2026-10-30T00:00:00.000Z" }),
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0].count).toBe(2);
  });

  it("una apagada o vencida no se cuenta como «por vencer»", () => {
    const items = marketingNextUpItems({
      ...base,
      promotions: [promo({ enabled: false, ends_at: "2026-09-24T00:00:00.000Z" })],
    });
    expect(items).toEqual([]);
  });

  it("el cupo de Meta avisa por debajo del 10 %, y nunca con tope desconocido", () => {
    const low = marketingNextUpItems({ ...base, meta: { ...META, window: { limit: 1000, used: 950, remaining: 50 } } });
    expect(low.map((item) => item.key)).toEqual(["quota-low"]);
    const unknown = marketingNextUpItems({ ...base, meta: { ...META, window: { limit: null, used: 0, remaining: null } } });
    expect(unknown).toEqual([]);
  });

  it("sin leer Meta (undefined) o sin número Cloud (null) no inventa filas de Meta", () => {
    expect(marketingNextUpItems({ ...base, meta: undefined })).toEqual([]);
    expect(marketingNextUpItems({ ...base, meta: null })).toEqual([]);
  });
});

describe("marketingNextUpHeadline", () => {
  it("una fila se nombra; varias se agrupan", () => {
    const one = marketingNextUpItems({ ...base, drafts: 1 });
    expect(marketingNextUpHeadline(one)).toBe("Una cosa a medio camino");
    const two = marketingNextUpItems({ ...base, drafts: 1, automations: [rule()] });
    expect(marketingNextUpHeadline(two)).toBe("Esto está a medio camino");
  });
});

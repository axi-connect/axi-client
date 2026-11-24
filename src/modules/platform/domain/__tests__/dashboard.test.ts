import { joinNames, latestIso, recentTenants, tenantStats, trialEndsPhrase, trialsEndingSoon } from "../dashboard";
import type { TenantListItem } from "../tenant";

const NOW = Date.parse("2026-11-24T15:00:00Z");
const DAY = 86_400_000;

function tenant(id: string, overrides: Partial<TenantListItem> = {}): TenantListItem {
  return {
    id,
    name: `Empresa ${id}`,
    nit: `900${id}`,
    status: "active",
    status_reason: null,
    trial_ends_at: null,
    city: null,
    country_code: "CO",
    users_count: 1,
    created_at: "2026-11-01T00:00:00Z",
    ...overrides,
  };
}

describe("cifras del Inicio", () => {
  it("los 6 datos de siempre salen de la lista", () => {
    const stats = tenantStats(
      [
        tenant("1", { users_count: 12 }),
        tenant("2", { users_count: 3 }),
        tenant("3", { status: "trial", users_count: 2 }),
        tenant("4", { status: "suspended", users_count: 8 }),
      ],
      4,
    );
    expect(stats).toEqual({ total: 4, active: 2, trial: 1, suspended: 1, users: 25 });
  });

  it("pruebas que vencen esta semana: solo en prueba, sin vencidas, la más cercana primero", () => {
    const list = [
      tenant("a", { status: "trial", trial_ends_at: new Date(NOW + 5 * DAY).toISOString() }),
      tenant("b", { status: "trial", trial_ends_at: new Date(NOW + 1 * DAY + 3_600_000).toISOString() }),
      tenant("c", { status: "trial", trial_ends_at: new Date(NOW + 9 * DAY).toISOString() }),
      tenant("d", { status: "trial", trial_ends_at: new Date(NOW - DAY).toISOString() }),
      tenant("e", { status: "active", trial_ends_at: new Date(NOW + DAY).toISOString() }),
      tenant("f", { status: "trial", trial_ends_at: null }),
    ];
    const soon = trialsEndingSoon(list, NOW);
    expect(soon.map((entry) => entry.tenant.id)).toEqual(["b", "a"]);
    expect(soon.map((entry) => entry.daysLeft)).toEqual([1, 5]);
  });

  it("frases de vencimiento", () => {
    expect(trialEndsPhrase(0)).toBe("vence hoy");
    expect(trialEndsPhrase(1)).toBe("vence mañana");
    expect(trialEndsPhrase(4)).toBe("vence en 4 días");
  });

  it("las empresas recientes, de la más nueva a la más vieja", () => {
    const list = [
      tenant("x", { created_at: "2026-10-01T00:00:00Z" }),
      tenant("y", { created_at: "2026-11-20T00:00:00Z" }),
      tenant("z", { created_at: "2026-11-02T00:00:00Z" }),
    ];
    expect(recentTenants(list, 2).map((t) => t.id)).toEqual(["y", "z"]);
  });

  it("la alerta más reciente no depende del orden del servidor", () => {
    expect(latestIso(["2026-11-20T10:00:00Z", "2026-11-24T09:00:00Z", "2026-11-22T00:00:00Z", "basura"])).toBe(
      "2026-11-24T09:00:00Z",
    );
    expect(latestIso([])).toBeNull();
  });

  it("une nombres como una persona", () => {
    expect(joinNames(["A"])).toBe("A");
    expect(joinNames(["A", "B"])).toBe("A y B");
    expect(joinNames(["A", "B", "C"])).toBe("A, B y C");
    expect(joinNames(["A", "B", "C", "D", "E"])).toBe("A, B, C y 2 más");
  });
});

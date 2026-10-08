jest.mock("@/modules/storage/infrastructure/services/storage-service.adapter", () => ({
  getStorageSummary: jest.fn(),
}));

import { STORAGE_QUOTA_EXCEEDED_EVENT, reportQuotaExceeded } from "../notices/report-quota-exceeded";
import { useStorageStore } from "../stores/storage.store";

const quota507 = (scope: string) => ({
  status: 507,
  code: "storage/quota_exceeded",
  problem: { details: { scope, pct_used: 101 } },
});

describe("estado vivo de las subidas", () => {
  beforeEach(() => useStorageStore.getState().reset());

  it("un 507 del tenant apaga las subidas y avisa al vigía con el nombre del archivo", () => {
    const heard = jest.fn();
    window.addEventListener(STORAGE_QUOTA_EXCEEDED_EVENT, heard);
    expect(reportQuotaExceeded(quota507("tenant"), "promo.jpg")).toBe(true);
    window.removeEventListener(STORAGE_QUOTA_EXCEEDED_EVENT, heard);

    expect(useStorageStore.getState().live).toEqual({ state: "full", blocks_uploads: true, pct_used: 101 });
    expect(heard).toHaveBeenCalledTimes(1);
    expect((heard.mock.calls[0][0] as CustomEvent).detail.fileName).toBe("promo.jpg");
  });

  it("otro error no es asunto del espacio: no apaga nada ni avisa", () => {
    const heard = jest.fn();
    window.addEventListener(STORAGE_QUOTA_EXCEEDED_EVENT, heard);
    expect(reportQuotaExceeded({ status: 500, code: "internal/error" }, "a.jpg")).toBe(false);
    window.removeEventListener(STORAGE_QUOTA_EXCEEDED_EVENT, heard);

    expect(useStorageStore.getState().live.blocks_uploads).toBe(false);
    expect(heard).not.toHaveBeenCalled();
  });

  it("la capacidad del servidor llena avisa pero NO apaga el clip del tenant", () => {
    expect(reportQuotaExceeded(quota507("platform_capacity"), "a.jpg")).toBe(true);
    expect(useStorageStore.getState().live.blocks_uploads).toBe(false);
  });

  it("el evento WS mueve el estado en los dos sentidos (lleno → con espacio)", () => {
    const base = { company_id: "c1", used_bytes: 1, quota_bytes: 2, previous: null };
    useStorageStore.getState().onQuotaState({ ...base, state: "full", pct_used: 100, blocks_uploads: true });
    expect(useStorageStore.getState().live.blocks_uploads).toBe(true);
    useStorageStore.getState().onQuotaState({ ...base, state: "ok", previous: "full", pct_used: 40, blocks_uploads: false });
    expect(useStorageStore.getState().live).toEqual({ state: "ok", blocks_uploads: false, pct_used: 40 });
  });
});

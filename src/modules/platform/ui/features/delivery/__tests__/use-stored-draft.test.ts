import { act, renderHook } from "@testing-library/react";
import { deliveryDraftStorageKey } from "../../../../domain/delivery";
import { DRAFT_AUTOSAVE_MS, readStoredDraft, useStoredDraft } from "../use-stored-draft";
import type { DeliveryFormValues } from "../delivery-form.config";

const KEY = deliveryDraftStorageKey("t1");
// Valores completos: el lector del borrador descarta lo que no tenga la forma de la versión 1.
const base: DeliveryFormValues = {
  offer: { package_code: "esencial", volume_tier_code: "c1000", promotion_code: "", billing_period: "monthly" },
  restart_trial: true,
  session_date: "2026-09-25",
  call_day2_at: "2026-09-28T10:00",
  call_day5_at: "2026-09-30T15:30",
  digest_time: "07:30",
  advisor: { name: "Asesora", whatsapp_e164: "+573001234567", email: "a@x.co" },
  cc: [],
} as DeliveryFormValues;
const edited = { ...base, cc: ["caja@x.co"] } as DeliveryFormValues;

beforeEach(() => {
  window.localStorage.clear();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

describe("useStoredDraft (autoguardado)", () => {
  it("lo precargado no se guarda; un cambio se guarda tras la pausa y NO saca el aviso de «Retomaste»", () => {
    const { result, rerender } = renderHook((values: DeliveryFormValues) =>
      useStoredDraft({ storageKey: KEY, values, baseline: base, initial: null }),
    { initialProps: base });
    act(() => jest.advanceTimersByTime(DRAFT_AUTOSAVE_MS * 2));
    expect(readStoredDraft(KEY)).toBeNull();

    rerender(edited);
    act(() => jest.advanceTimersByTime(DRAFT_AUTOSAVE_MS - 1));
    expect(readStoredDraft(KEY)).toBeNull();
    act(() => jest.advanceTimersByTime(1));
    expect(readStoredDraft(KEY)?.values.cc).toEqual(["caja@x.co"]);
    expect(result.current.savedAt).not.toBeNull();
    expect(result.current.resumed).toBeNull();
  });

  it("al volver a entrar con un borrador, «resumed» lo trae; «Descartar» lo borra", () => {
    const stored = { saved_at: "2026-09-25T15:00:00.000Z", values: edited };
    window.localStorage.setItem(KEY, JSON.stringify({ version: 1, ...stored }));
    const initial = readStoredDraft(KEY);
    const { result } = renderHook(() => useStoredDraft({ storageKey: KEY, values: edited, baseline: edited, initial }));
    expect(result.current.resumed?.saved_at).toBe("2026-09-25T15:00:00.000Z");

    act(() => result.current.discard(base));
    expect(result.current.resumed).toBeNull();
    expect(result.current.savedAt).toBeNull();
    expect(readStoredDraft(KEY)).toBeNull();
  });
});

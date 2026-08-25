import { CONSENT_STORAGE_KEY, onConsentChange, readConsent, writeConsent } from "@/core/analytics/consent";

describe("consentimiento", () => {
  beforeEach(() => window.localStorage.clear());

  it("sin decisión previa devuelve null (hay que preguntar)", () => {
    expect(readConsent()).toBeNull();
  });

  it("persiste y relee la decisión", () => {
    writeConsent("granted");
    expect(readConsent()).toBe("granted");
    writeConsent("denied");
    expect(readConsent()).toBe("denied");
  });

  it("ignora un valor corrupto en vez de tratarlo como consentimiento", () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, "yes-please");
    expect(readConsent()).toBeNull();
  });

  it("notifica a los suscriptores y permite darse de baja", () => {
    const seen: string[] = [];
    const off = onConsentChange((s) => seen.push(s));

    writeConsent("granted");
    off();
    writeConsent("denied");

    expect(seen).toEqual(["granted"]);
  });
});

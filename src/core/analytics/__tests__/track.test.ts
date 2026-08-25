/**
 * `track` no hace nada si la analítica está apagada, y `ANALYTICS_ENABLED` se
 * resuelve al cargar el módulo. Para probar el mapeo hay que recargar
 * `core/config/env` con NODE_ENV=production, igual que hace la suite de env.
 */
describe("track", () => {
  const load = async (enabled: boolean) => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_GA_ID = enabled ? "G-TEST12345" : "";
    process.env.NEXT_PUBLIC_META_PIXEL_ID = enabled ? "123456789012345" : "";
    if (enabled) {
      Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    }
    return import("@/core/analytics/track");
  };

  afterEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "test", configurable: true });
    delete process.env.NEXT_PUBLIC_GA_ID;
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    delete window.gtag;
    delete window.fbq;
  });

  it("traduce el evento del dominio al nombre estándar de cada destino", async () => {
    const { track } = await load(true);
    const gtag = jest.fn();
    const fbq = jest.fn();
    window.gtag = gtag;
    window.fbq = fbq as unknown as typeof window.fbq;

    track({ name: "demo_form_submit", params: { volume: "lt_300" } });

    // GA4 usa `generate_lead`; Meta usa el evento estándar `Lead`, no uno
    // personalizado, para que las campañas puedan optimizar por él.
    expect(gtag).toHaveBeenCalledWith("event", "generate_lead", { volume: "lt_300" });
    expect(fbq).toHaveBeenCalledWith("track", "Lead", { volume: "lt_300" });
  });

  it("no emite nada cuando la analítica está apagada", async () => {
    const { track } = await load(false);
    const gtag = jest.fn();
    window.gtag = gtag;

    track({ name: "whatsapp_click", params: { location: "hero", path: "/" } });

    expect(gtag).not.toHaveBeenCalled();
  });
});

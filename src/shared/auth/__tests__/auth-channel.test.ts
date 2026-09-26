/**
 * El canal que recarga las demás pestañas del panel cuando la sesión de
 * soporte toma o suelta el navegador. Un doble de BroadcastChannel en memoria
 * reparte cada mensaje a TODAS las instancias abiertas menos la emisora (como
 * el real); el filtro por `tabId` es lo que evita que la pestaña emisora se
 * recargue a sí misma a través de otra instancia suya.
 */
type Listener = ((event: MessageEvent<unknown>) => void) | null;

class FakeChannel {
  static open = new Set<FakeChannel>();
  onmessage: Listener = null;
  constructor(public name: string) {
    FakeChannel.open.add(this);
  }
  postMessage(data: unknown) {
    for (const other of FakeChannel.open) {
      if (other !== this && other.name === this.name) other.onmessage?.({ data } as MessageEvent<unknown>);
    }
  }
  close() {
    FakeChannel.open.delete(this);
  }
}

describe("auth-channel", () => {
  const original = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;

  beforeEach(() => {
    FakeChannel.open.clear();
    (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = FakeChannel;
    jest.resetModules();
  });

  afterAll(() => {
    (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = original;
  });

  it("la misma pestaña no recibe su propio aviso", async () => {
    const { broadcastAuthChange, onAuthChange } = await import("../auth-channel");
    const handler = jest.fn();
    const stop = onAuthChange(handler);
    broadcastAuthChange("support-started");
    expect(handler).not.toHaveBeenCalled();
    stop();
  });

  it("otra pestaña (otro tabId) sí lo recibe", async () => {
    const { onAuthChange } = await import("../auth-channel");
    const handler = jest.fn();
    const stop = onAuthChange(handler);
    // Otra pestaña: su propio módulo, su propio tabId
    new FakeChannel("axi-auth").postMessage({ type: "support-ended", tabId: "otra-pestana" });
    expect(handler).toHaveBeenCalledWith("support-ended");
    stop();
  });

  it("solo el panel de cliente sigue la identidad de las cookies", async () => {
    const { followsTenantIdentity } = await import("../auth-channel");
    expect(followsTenantIdentity("/dashboard")).toBe(true);
    expect(followsTenantIdentity("/crm/contacts")).toBe(true);
    expect(followsTenantIdentity("/platform/tenants")).toBe(false);
    expect(followsTenantIdentity("/auth/soporte")).toBe(false);
  });
});

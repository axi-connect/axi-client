import { CHANNEL_KIND_LABELS, type ChannelKind } from "../channel";
import {
  CHANNEL_PROVIDERS,
  channelProvider,
  connectableProviders,
  effectiveConnectStrategy,
  type ChannelBrandClass,
  type ChannelIconId,
} from "../channel-providers";

/**
 * El registry es el contrato que hace que añadir Instagram en F5 sea un cambio
 * de dominio y no un rediseño. Estas pruebas defienden las tres propiedades de
 * las que depende esa promesa.
 */
describe("registry de proveedores de canal", () => {
  const KINDS = Object.keys(CHANNEL_KIND_LABELS) as ChannelKind[];

  it("cubre TODOS los kinds del dominio", () => {
    // Un kind sin descriptor revienta la vista al pintar ese canal, y solo se
    // descubriría con ese canal delante. Aquí se descubre al añadir el enum.
    for (const kind of KINDS) {
      expect(CHANNEL_PROVIDERS[kind]).toBeDefined();
      expect(channelProvider(kind).kind).toBe(kind);
    }
    expect(Object.keys(CHANNEL_PROVIDERS)).toHaveLength(KINDS.length);
  });

  it("no contiene ni un color crudo: solo identificadores de clase", () => {
    // DESIGN-SYSTEM §11, primer punto del checklist. Un hex aquí sería un color
    // que no responde al tema y que Tailwind no puede resolver.
    const allowedBrandClasses: ChannelBrandClass[] = [
      "brand-whatsapp",
      "brand-instagram",
      "brand-messenger",
      "brand-fault",
    ];
    const allowedIcons: ChannelIconId[] = ["whatsapp", "qr", "instagram", "messenger", "robot"];

    for (const provider of Object.values(CHANNEL_PROVIDERS)) {
      expect(allowedBrandClasses).toContain(provider.brand_class);
      expect(allowedIcons).toContain(provider.icon_id);
      expect(JSON.stringify(provider)).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    }
  });

  it("deja fuera el simulador de lo conectable y pone el recomendado primero", () => {
    const connectable = connectableProviders();

    // El simulador existe y funciona, pero lo crea plataforma para QA:
    // ofrecerlo aquí sería ofrecer un canal que no atiende a nadie
    expect(connectable.map((provider) => provider.kind)).not.toContain("simulator");
    expect(connectable[0].recommended).toBe(true);
    expect(connectable[0].kind).toBe("whatsapp_cloud");
  });

  it("solo un proveedor va marcado como recomendado", () => {
    const recommended = Object.values(CHANNEL_PROVIDERS).filter((p) => p.recommended === true);
    expect(recommended).toHaveLength(1);
  });

  it("todo lo que se conecta con Embedded Signup declara su producto de Meta", () => {
    // `meta_product` es el query param OBLIGATORIO de
    // GET /channels/meta/embedded-signup/config. Sin él, F3 no puede pedir la
    // configuración y el popup no abriría.
    for (const provider of Object.values(CHANNEL_PROVIDERS)) {
      if (provider.connect_strategy === "embedded_signup") {
        expect(provider.meta_product).toBeDefined();
      }
    }
  });

  it("cada proveedor conectable declara SUS prerrequisitos, no los de WhatsApp", () => {
    // Es la comprobación de que el registry gobierna de verdad y no hay un `if`
    // escondido en el checklist: si Instagram mostrara los de WhatsApp, el
    // usuario buscaría un número de teléfono que Instagram no tiene
    for (const provider of connectableProviders()) {
      expect(provider.prerequisites.length).toBeGreaterThan(0);
    }
    expect(channelProvider("instagram_dm").prerequisites.map((p) => p.id)).toContain(
      "professional_account",
    );
    expect(channelProvider("facebook_messenger").prerequisites.map((p) => p.id)).toContain(
      "page_admin",
    );
    expect(channelProvider("whatsapp_cloud").prerequisites.map((p) => p.id)).not.toContain(
      "page_admin",
    );
  });

  it("Instagram y Messenger avisan de que NO tienen plantillas fuera de 24 h", () => {
    // Es una limitación del producto de Meta, no un detalle de implementación:
    // prometer lo mismo que WhatsApp es prometer algo que no existe
    for (const kind of ["instagram_dm", "facebook_messenger"] as const) {
      const item = channelProvider(kind).prerequisites.find(
        (p) => p.id === "no_templates_outside_window",
      );
      expect(item?.critical).toBe(true);
    }
  });

  it("la estrategia EFECTIVA separa lo que se ofrece hoy de lo que es el objetivo", () => {
    // El descriptor de Instagram declara `embedded_signup` como objetivo, pero su
    // `availability: manual_only` es lo que decide por dónde va HOY: el backend
    // tiene su adaptador de envío pero no su alta por botón. Cuando la tenga,
    // cambia una palabra del registry y el wizard ofrece el popup.
    expect(channelProvider("instagram_dm").connect_strategy).toBe("embedded_signup");
    expect(effectiveConnectStrategy(channelProvider("instagram_dm"))).toBe("manual");
    expect(effectiveConnectStrategy(channelProvider("whatsapp_cloud"))).toBe("embedded_signup");
    expect(effectiveConnectStrategy(channelProvider("whatsapp_web"))).toBe("qr");
  });

  it("el prerrequisito que más altas rompe está marcado como crítico", () => {
    const cloud = channelProvider("whatsapp_cloud");
    const critical = cloud.prerequisites.filter((item) => item.critical === true);

    expect(critical).toHaveLength(1);
    expect(critical[0].id).toBe("phone_not_in_whatsapp");
    // El aviso tiene que decir la consecuencia, no solo la condición
    expect(critical[0].detail).toContain("deja de funcionar en el celular");
  });
});

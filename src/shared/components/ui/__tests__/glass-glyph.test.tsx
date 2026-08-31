import { render } from "@testing-library/react";
import { GlassGlyph } from "@/shared/components/ui/glyphs";
import { GLYPH_GEOMETRY, GLYPH_KINDS } from "@/shared/components/ui/glyphs";

/**
 * Lo que jsdom SÍ puede afirmar de un glifo: su estructura de capas, sus
 * ganchos de estilo y que los `defs` no colisionan. Lo que no: la apariencia —
 * el CSS se mapea a `identity-obj-proxy`, así que no hay estilos computados, y
 * el material entero vive en `globals.css`. Eso lo valida el mockup y la
 * revisión visual, no un test.
 */
describe("GlassGlyph", () => {
  it("expone las diez familias, y cada una con su geometría", () => {
    expect(GLYPH_KINDS).toHaveLength(10);
    for (const kind of GLYPH_KINDS) {
      const geo = GLYPH_GEOMETRY[kind];
      expect(geo.front.length).toBeGreaterThan(0);
      expect(geo.core.rx).toBeGreaterThan(0);
    }
  });

  it("es decorativo: aria-hidden y sin nodo accesible", () => {
    const { container } = render(<GlassGlyph kind="conversation" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    // Un <title> duplicaría en el lector el h2 del propio estado vacío.
    expect(container.querySelector("title")).toBeNull();
  });

  it("el tier decide el tamaño Y el detalle, que no pueden desincronizarse", () => {
    const { container: sm } = render(<GlassGlyph kind="conversation" tier="sm" />);
    const { container: lg } = render(<GlassGlyph kind="conversation" tier="lg" />);

    // `sm` dibuja cinco capas: a 32 px las otras cuatro caen bajo el píxel.
    expect(sm.querySelectorAll("[data-layer]")).toHaveLength(5);
    expect(lg.querySelectorAll("[data-layer]")).toHaveLength(9);

    // El foco especular fijo SÍ entra en `sm`: sin él, a tamaño pequeño el
    // glifo deja de leerse como vidrio y queda en silueta.
    expect(sm.querySelector('[data-layer="hot"]')).not.toBeNull();
    // El reflejo viajero y el pedestal, no.
    expect(sm.querySelector('[data-layer="sheen"]')).toBeNull();
    expect(sm.querySelector('[data-layer="plate"]')).toBeNull();
  });

  it("la escala del sistema es 48 / 96 / 176 px", () => {
    // Decisión del dueño tras ver la primera escala (32/64/128) en el panel: se
    // veía pequeña. Va con test porque es una decisión de diseño, no un default
    // — y porque el tamaño lo fija el tier, así que encogerlo es un cambio de
    //   una línea que nadie notaría en review.
    const expected = { sm: "size-12", md: "size-24", lg: "size-44" } as const;
    for (const [tier, size] of Object.entries(expected)) {
      const { container } = render(
        <GlassGlyph kind="conversation" tier={tier as "sm" | "md" | "lg"} />,
      );
      expect(container.querySelector("svg")?.getAttribute("class")).toContain(size);
    }
  });

  it("emite las dos clases modificadoras, acento y tier", () => {
    // El tier no es solo tamaño: `.glass-glyph--lg` / `--sm` ajustan el grosor
    // del rim y del grabado en `globals.css`. Sin la clase, esas reglas nunca
    // se aplican y el trazo se pierde a 128 px.
    const { container } = render(<GlassGlyph kind="time" tier="lg" />);
    const cls = container.querySelector("svg")?.getAttribute("class") ?? "";
    expect(cls).toContain("glass-glyph--amber");
    expect(cls).toContain("glass-glyph--lg");
  });

  it("no lleva ni un hex ni backdrop-filter: el material es CSS", () => {
    // El test de revocación de DESIGN-SYSTEM §7 hecho ejecutable. El argumento
    // de que un glifo no es una superficie (y no le aplica el mandamiento 3) se
    // apoya en no usar `backdrop-filter`, así que se blinda aquí.
    for (const kind of GLYPH_KINDS) {
      const { container } = render(<GlassGlyph kind={kind} />);
      const markup = container.innerHTML;
      expect(markup).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(markup).not.toContain("backdrop-filter");
      expect(markup).not.toContain("<filter");
    }
  });

  it("cada instancia tiene sus propios defs: dos glifos no comparten gradientes", () => {
    // Sin esto, un ancestro oculto rompería los gradientes de todas las demás
    // instancias — el mismo motivo documentado en `BrandMark`.
    const { container } = render(
      <>
        <GlassGlyph kind="money" />
        <GlassGlyph kind="money" />
      </>,
    );
    const ids = [...container.querySelectorAll("[id]")].map((el) => el.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("el acento sale de la familia, no del llamador", () => {
    const { container } = render(<GlassGlyph kind="money" />);
    // «Dinero» es ámbar por el acento del módulo de facturación.
    expect(container.querySelector("svg")?.getAttribute("class")).toContain("glass-glyph--amber");
    const { container: neutral } = render(<GlassGlyph kind="noresults" />);
    // «Sin resultados» es neutro a propósito: un filtro sin resultados no es
    // una carencia que merezca color.
    expect(neutral.querySelector("svg")?.getAttribute("class")).toContain("glass-glyph--muted");
  });
});

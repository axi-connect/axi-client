import { sanitizeCompany, COMPANY_MAX_LENGTH } from "../company";
import { CASES, markedSlideCount, parseCases, respondsTo, serializeCases, toggleCase } from "../diagnosis";
import { CLIP_DURATIONS, clipSources, type ClipId } from "../media";
import { plansFromCatalog } from "../plans";
import { SLIDES, slideIndexById } from "../slides";
import type { PublicCatalog } from "@/modules/landing/public";

describe("guion de /overview", () => {
  it("cada lámina tiene un ancla ASCII única que sirve de hash", () => {
    const ids = SLIDES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it("toda lámina de recorrido tiene su clip y los doce clips se usan una sola vez", () => {
    const clips = SLIDES.filter((s) => s.kind === "clip").map((s) => s.clip);
    expect(clips.every(Boolean)).toBe(true);
    expect(new Set(clips).size).toBe(clips.length);
    expect([...clips].sort()).toEqual((Object.keys(CLIP_DURATIONS) as ClipId[]).sort());
  });

  it("cada lámina lleva la nota del vendedor y la clave con una palabra en coral", () => {
    for (const slide of SLIDES) {
      expect(slide.note.length).toBeGreaterThan(20);
      expect(slide.key.some((segment) => segment.accent)).toBe(true);
    }
  });

  it("todo caso del diagnóstico tiene al menos una lámina que le responde", () => {
    for (const c of CASES) expect(SLIDES.some((s) => respondsTo(s, [c.tag]))).toBe(true);
  });

  it("busca una lámina por su ancla", () => {
    expect(slideIndexById("portada")).toBe(0);
    expect(slideIndexById("no-existe")).toBe(-1);
  });
});

describe("diagnóstico en la URL", () => {
  it("lee solo casos válidos, sin repetidos y en el orden del panel", () => {
    expect(parseCases("excel, tarde ,TARDE,nada,meta")).toEqual(["tarde", "excel", "meta"]);
    expect(parseCases("")).toEqual([]);
    expect(parseCases(null)).toEqual([]);
  });

  it("serializa y alterna sin perder el orden", () => {
    expect(serializeCases(["meta", "tarde"])).toBe("tarde,meta");
    expect(toggleCase(["tarde"], "excel")).toEqual(["tarde", "excel"]);
    expect(toggleCase(["tarde", "excel"], "tarde")).toEqual(["excel"]);
  });

  it("cuenta las láminas que responden a lo marcado", () => {
    expect(markedSlideCount([])).toBe(0);
    expect(markedSlideCount(["excel"])).toBe(1);
    expect(markedSlideCount(["tarde"])).toBeGreaterThan(2);
  });
});

describe("«preparado para»", () => {
  it("deja el nombre de un negocio tal cual", () => {
    expect(sanitizeCompany("Almacén La 14 & Cía.")).toBe("Almacén La 14 & Cía.");
  });

  it("quita lo que no es de un nombre y colapsa espacios", () => {
    expect(sanitizeCompany("  <script>alert(1)</script>   Norte   Studio ")).toBe("scriptalert(1)/script Norte Studio");
    expect(sanitizeCompany("Tienda 🚀 Nube")).toBe("Tienda Nube");
  });

  it("corta los nombres largos y descarta los vacíos", () => {
    expect(sanitizeCompany("x".repeat(200))?.length).toBe(COMPANY_MAX_LENGTH);
    expect(sanitizeCompany("   ")).toBeNull();
    expect(sanitizeCompany("--- ...")).toBeNull();
    expect(sanitizeCompany(null)).toBeNull();
  });
});

describe("clips", () => {
  it("por defecto apunta a Cloudinary: el MP4 subido y el WebM y el póster derivados por URL", () => {
    const src = clipSources("meta", "celular");
    expect(src.mp4).toBe("https://res.cloudinary.com/dpfnxj52w/video/upload/overview/celular/meta.mp4");
    expect(src.webm).toBe("https://res.cloudinary.com/dpfnxj52w/video/upload/vc_vp9,q_auto/overview/celular/meta.webm");
    // El póster es el último cuadro (9 s − 0,1)
    expect(src.poster).toBe("https://res.cloudinary.com/dpfnxj52w/video/upload/so_8.9,w_900,f_auto,q_auto/overview/celular/meta.jpg");
  });

  it("con un origen alterno usa la estructura de archivos de la producción", () => {
    expect(clipSources("gancho", "pantalla", "/assets/overview/")).toEqual({
      mp4: "/assets/overview/pantalla/gancho.mp4",
      webm: "/assets/overview/pantalla/gancho.webm",
      poster: "/assets/overview/pantalla/gancho.webp",
    });
  });
});

describe("planes en vivo", () => {
  const catalog = (promotion: PublicCatalog["promotion"] = null): PublicCatalog => ({
    asOf: "2026-11-18T15:00:00.000Z",
    version: "v",
    volumes: [{ id: "t1000", label: "1.000", conversations: 1000, feeCop: 169_900 }],
    defaultVolumeId: "t1000",
    packageFees: { esencial: 90_000, crecimiento: 200_000, escala: 400_000 },
    legacyPackageCop: {},
    modulePrices: {},
    enterpriseFloorCop: null,
    promotion,
    planUnits: {},
  });

  it("toma las cifras del catálogo al tramo por defecto, con Crecimiento como ancla", () => {
    const view = plansFromCatalog(catalog(), new Date("2026-11-18T15:00:00Z"));
    expect(view?.cards.map((c) => [c.slug, c.monthlyCop, c.listCop, c.anchor])).toEqual([
      ["esencial", 259_900, null, false],
      ["crecimiento", 369_900, null, true],
      ["escala", 569_900, null, false],
    ]);
    expect(view?.volumeLabel).toBe("1.000 conversaciones");
    expect(view?.promotion).toBeNull();
  });

  it("sin catálogo no inventa precios", () => {
    expect(plansFromCatalog(null, new Date())).toBeNull();
  });
});

import { breadcrumbSchema, faqSchema, organizationSchema, webSiteSchema } from "@/core/seo/site";

describe("schemas del sitio", () => {
  it("no declara datos que el sitio no tiene", () => {
    const org = JSON.stringify(organizationSchema());

    // Estas ausencias son deliberadas, no un olvido: axi no tiene perfiles
    // sociales propios ni reseñas, y afirmarlo sería falso ante Google.
    expect(org).not.toContain("sameAs");
    expect(org).not.toContain("aggregateRating");
    expect(JSON.stringify(webSiteSchema())).not.toContain("potentialAction");
  });

  it("la organización y el sitio comparten @id para no duplicar la entidad", () => {
    const orgId = (organizationSchema() as { "@id": string })["@id"];
    expect(webSiteSchema().publisher).toEqual({ "@id": orgId });
  });

  it("convierte los pares q/a del contenido en preguntas", () => {
    const schema = faqSchema([{ q: "¿Sirve?", a: "Sí." }]);

    expect(schema.mainEntity).toEqual([
      { "@type": "Question", name: "¿Sirve?", acceptedAnswer: { "@type": "Answer", text: "Sí." } },
    ]);
  });

  it("las migas siempre arrancan en la home y numeran desde 1", () => {
    const trail = breadcrumbSchema(["/precios"]).itemListElement as unknown as Array<Record<string, unknown>>;

    expect(trail).toHaveLength(2);
    expect(trail[0]).toMatchObject({ position: 1, name: "Inicio" });
    expect(trail[1]).toMatchObject({ position: 2, name: "Precios" });
  });
});

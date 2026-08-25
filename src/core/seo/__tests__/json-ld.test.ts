import { serializeJsonLd } from "@/core/seo/json-ld";

describe("serializeJsonLd", () => {
  it("escapa '<' para que no se pueda cerrar el script desde dentro", () => {
    const out = serializeJsonLd({ name: "</script><img onerror=alert(1)>" });

    // Lo que importa: la cadena literal "</script>" no sobrevive.
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<img");
    // Solo se escapa "<": basta para romper la secuencia de cierre.
    expect(out).toContain("\\u003c/script>");
  });

  it("escapa la apertura de comentario HTML", () => {
    expect(serializeJsonLd({ a: "<!--" })).not.toContain("<!--");
  });

  it("sigue produciendo JSON válido y equivalente", () => {
    const data = { "@type": "Organization", name: "Axi Connect", tricky: "a < b" };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });
});

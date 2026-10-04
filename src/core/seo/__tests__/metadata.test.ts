import { pageMetadata } from "@/core/seo/metadata";
import { OG_CARDS } from "@/core/seo/og-cards";
import { OG_IMAGE } from "@/core/seo/site";

type Img = { url: string; alt?: string };
const images = (path: string) => {
  const m = pageMetadata({ title: "T", description: "D", path });
  const og = (m.openGraph?.images as Img[])[0];
  const tw = (m.twitter?.images as string[])[0];
  return { og, tw };
};

describe("tarjeta de enlace por ruta (plan §26)", () => {
  it("una ruta con tarjeta propia declara la suya en og y en twitter", () => {
    const { og, tw } = images("/precios");
    expect(new URL(og.url).pathname).toBe("/og/precios");
    expect(og.alt).toBe(OG_CARDS["/precios"].alt);
    expect(tw).toBe(og.url);
  });

  it("una ruta sin tarjeta propia usa la de inicio, no la de otra página", () => {
    const { og, tw } = images("/soluciones");
    expect(og.url).toBe(OG_IMAGE.url);
    expect(new URL(og.url).pathname).toBe("/opengraph-image");
    expect(tw).toBe(OG_IMAGE.url);
  });

  it("la imagen de inicio vive en la raíz y describe lo que se ve", () => {
    expect(new URL(OG_IMAGE.url).pathname).toBe("/opengraph-image");
    expect(OG_IMAGE.alt).toBe(OG_CARDS["/"].alt);
    expect(OG_IMAGE.alt).not.toBe("Axi Connect · Vende en cada conversación");
  });
});

import {
  issuerLines,
  type IssuerDraft,
} from "@/modules/documents/domain/issuer";

const EMPTY: IssuerDraft = {
  legal_name: "",
  tax_id_label: "",
  address: "",
  city: "",
  phone: "",
  email: "",
};
const COMPANY = {
  name: "JuanitoXpeditions",
  nit: "901.234.567-8",
  address: "Calle 93 # 11-27",
  city: "Bogotá",
};

/** Espejo de `issuerLines` del servidor (materialize.ts): mismo orden, mismas caídas. */
describe("issuerLines", () => {
  it("todo vacío: nombre del negocio, NIT con la etiqueta de siempre y el lugar de Mi empresa", () => {
    expect(issuerLines(EMPTY, COMPANY)).toEqual([
      "JuanitoXpeditions",
      "NIT 901.234.567-8",
      "Calle 93 # 11-27, Bogotá",
    ]);
  });

  it("lo escrito manda sobre la ficha, y teléfono y correo entran al final", () => {
    expect(
      issuerLines(
        {
          legal_name: " JX S.A.S. ",
          tax_id_label: "RUT",
          address: "",
          city: "Medellín",
          phone: "+57 300",
          email: "hola@jx.co",
        },
        COMPANY,
      ),
    ).toEqual([
      "JX S.A.S.",
      "RUT 901.234.567-8",
      "Calle 93 # 11-27, Medellín",
      "+57 300",
      "hola@jx.co",
    ]);
  });

  it("sin NIT ni lugar en la ficha, esas líneas no salen (nada de «NIT null» ni comas sueltas)", () => {
    expect(
      issuerLines(EMPTY, { name: "Axi", nit: null, address: null, city: null }),
    ).toEqual(["Axi"]);
    expect(
      issuerLines(
        { ...EMPTY, city: "Cali" },
        { name: "Axi", nit: null, address: null, city: null },
      ),
    ).toEqual(["Axi", "Cali"]);
  });
});

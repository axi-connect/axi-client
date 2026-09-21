import {
  choiceOf,
  defaultHsmMapping,
  hsmPreviewValue,
  HSM_STATIC_PREFIX,
  isEntryResolved,
  resizeHsmMapping,
  staticTextOf,
  unresolvedHsmSlots,
} from "../hsm-params";

const sample = { first_name: "Laura", full_name: "Laura Restrepo", company_name: "Savage" };

describe("hsm-params — de qué se rellena cada hueco", () => {
  it("reconoce el origen guardado, incluido el texto fijo", () => {
    expect(choiceOf("contact_first_name")).toBe("contact_first_name");
    expect(choiceOf("static:septiembre")).toBe(HSM_STATIC_PREFIX);
    expect(choiceOf("custom_field:ciudad")).toBeNull();
    expect(staticTextOf("static:Oferta: 20%")).toBe("Oferta: 20%");
  });

  it("sugiere el nombre en el primero y deja el resto SIN decidir", () => {
    // Adivinar de más sale caro: un valor plausible pero equivocado se manda a
    // cientos de personas sin que nadie lo relea.
    expect(defaultHsmMapping(3)).toEqual([
      { index: 1, source: "contact_first_name" },
      { index: 2, source: HSM_STATIC_PREFIX },
      { index: 3, source: HSM_STATIC_PREFIX },
    ]);
    expect(defaultHsmMapping(0)).toEqual([]);
  });

  it("al cambiar de plantilla conserva lo que ya se había decidido", () => {
    const previous = [
      { index: 1, source: "company_name" },
      { index: 2, source: "static:30%" },
    ];
    expect(resizeHsmMapping(previous, 3)).toEqual([
      { index: 1, source: "company_name" },
      { index: 2, source: "static:30%" },
      { index: 3, source: HSM_STATIC_PREFIX },
    ]);
    expect(resizeHsmMapping(previous, 1)).toEqual([{ index: 1, source: "company_name" }]);
  });

  it("un texto fijo vacío NO cuenta como decidido", () => {
    expect(isEntryResolved({ index: 1, source: "contact_first_name" })).toBe(true);
    expect(isEntryResolved({ index: 1, source: "static:30%" })).toBe(true);
    expect(isEntryResolved({ index: 1, source: HSM_STATIC_PREFIX })).toBe(false);
    expect(isEntryResolved({ index: 1, source: "static:   " })).toBe(false);
  });

  it("nombra los huecos que faltan, para poder decírselo al operador", () => {
    expect(
      unresolvedHsmSlots([
        { index: 1, source: "contact_first_name" },
        { index: 2, source: HSM_STATIC_PREFIX },
        { index: 3, source: "static: " },
      ]),
    ).toEqual(["{{2}}", "{{3}}"]);
  });

  it("la previa devuelve null en el hueco sin decidir, para que se vea el {{n}}", () => {
    expect(hsmPreviewValue("contact_first_name", sample)).toBe("Laura");
    expect(hsmPreviewValue("contact_name", sample)).toBe("Laura Restrepo");
    expect(hsmPreviewValue("company_name", sample)).toBe("Savage");
    expect(hsmPreviewValue("static:30%", sample)).toBe("30%");
    expect(hsmPreviewValue(HSM_STATIC_PREFIX, sample)).toBeNull();
    expect(hsmPreviewValue("custom_field:ciudad", sample)).toBeNull();
  });
});

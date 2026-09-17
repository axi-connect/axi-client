import { TIMEZONES, timezoneLabel } from "@/shared/data/countries";
import { NICHES } from "@/modules/onboarding/public";
import {
  buildCompanyFormFields,
  companyFormSchema,
  companyToFormValues,
  toUpdateCompanyDTO,
} from "@/modules/companies/ui/forms/config/company.config";

describe("company.config", () => {
  it("la descripción se limita a 500 (lo que exige el backend), no a 2000", () => {
    const base = { name: "X", timezone: "America/Bogota" };
    expect(companyFormSchema.safeParse({ ...base, activity_description: "a".repeat(500) }).success).toBe(true);
    expect(companyFormSchema.safeParse({ ...base, activity_description: "a".repeat(501) }).success).toBe(false);
  });

  it("las zonas horarias salen del catálogo de países y se etiquetan con el país", () => {
    expect(TIMEZONES).toContain("America/Bogota");
    expect(timezoneLabel("America/Bogota")).toBe("America/Bogota (Colombia)");
    expect(timezoneLabel("Pacific/Auckland")).toBe("Pacific/Auckland");
  });

  it("los vacíos viajan como null (borran) y la zona horaria siempre viaja", () => {
    expect(
      toUpdateCompanyDTO({
        name: "Savage",
        isotype_url: "",
        address: "",
        city: "Bogotá",
        industry: "",
        niche_code: "",
        activity_description: "",
        timezone: "America/Bogota",
      }),
    ).toEqual({
      name: "Savage",
      isotype_url: null,
      address: null,
      city: "Bogotá",
      industry: null,
      niche_code: null,
      activity_description: null,
      timezone: "America/Bogota",
    });
  });

  it("el tipo de negocio viaja como `niche_code` y sale del catálogo compartido con el alta", () => {
    const dto = toUpdateCompanyDTO({
      name: "JuanitoXpeditions",
      isotype_url: "",
      address: "",
      city: "",
      industry: "Expediciones",
      niche_code: "hotels_tourism",
      activity_description: "",
      timezone: "America/Bogota",
    });
    expect(dto.niche_code).toBe("hotels_tourism");
    expect(NICHES.map((niche) => niche.code)).toContain("hotels_tourism");
    // El campo existe en el formulario y precede a «Industria» (texto del prompt)
    const names = buildCompanyFormFields().map((field) => field.name);
    expect(names).toContain("niche_code");
    expect(names.indexOf("niche_code")).toBeLessThan(names.indexOf("industry"));
  });

  it("una empresa sin tipo de negocio abre el formulario con el select vacío, no con basura", () => {
    const values = companyToFormValues({
      name: "Savage",
      niche_code: null,
      industry: null,
      isotype_url: null,
      address: null,
      city: null,
      activity_description: null,
      timezone: "America/Bogota",
    } as never);
    expect(values.niche_code).toBe("");
  });
});

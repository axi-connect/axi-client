import {
  companyFormSchema,
  timezoneLabel,
  TIMEZONES,
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
        activity_description: "",
        timezone: "America/Bogota",
      }),
    ).toEqual({
      name: "Savage",
      isotype_url: null,
      address: null,
      city: "Bogotá",
      industry: null,
      activity_description: null,
      timezone: "America/Bogota",
    });
  });
});

import {
  activePeopleFilters,
  canSearchPeople,
  EMPTY_PEOPLE_FILTERS,
  peopleSearchInput,
} from "../people-filters";

describe("filtros de Personas → búsqueda", () => {
  it("ES UNA BÚSQUEDA DE LAS DE SIEMPRE: fuente apollo_people, modo navegar, una página", () => {
    const input = peopleSearchInput({ ...EMPTY_PEOPLE_FILTERS, titles: ["Dueño"] }, null);
    expect(input).toMatchObject({ source: "apollo_people", mode: "browse", limit: 25 });
  });

  it("«201+» son los tres rangos de arriba de Apollo", () => {
    const input = peopleSearchInput({ ...EMPTY_PEOPLE_FILTERS, titles: ["Dueño"], sizes: ["201+"] }, null);
    expect(input.company?.employee_ranges).toEqual(["201,500", "501,1000", "1001,100000"]);
  });

  it("la industria viaja como palabra clave: Apollo no entiende CIIU", () => {
    const input = peopleSearchInput(
      { ...EMPTY_PEOPLE_FILTERS, titles: ["Dueño"], categoryId: "restaurante" },
      "Restaurantes",
    );
    expect(input.company?.keywords).toBe("restaurantes");
    expect(input.company?.ciiu).toEqual([]);
  });

  it("«celular directo» NO viaja: filtra la página que se ve", () => {
    const input = peopleSearchInput({ ...EMPTY_PEOPLE_FILTERS, titles: ["Dueño"], directPhone: true }, null);
    expect(JSON.stringify(input)).not.toContain("direct");
  });

  it("sin cargo ni jerarquía no hay pregunta", () => {
    expect(canSearchPeople(EMPTY_PEOPLE_FILTERS)).toBe(false);
    expect(canSearchPeople({ ...EMPTY_PEOPLE_FILTERS, seniorities: ["owner"] })).toBe(true);
  });

  it("cuenta los filtros puestos para «Limpiar»", () => {
    expect(activePeopleFilters(EMPTY_PEOPLE_FILTERS)).toBe(0);
    expect(activePeopleFilters({ ...EMPTY_PEOPLE_FILTERS, titles: ["x"], hiring: true, city: "Cali" })).toBe(3);
  });
});

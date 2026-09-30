import type { StartSearchInput } from "./search";

/**
 * P2 · los filtros de la pestaña Personas (tablero 5) y cómo se convierten en
 * una búsqueda. TypeScript puro: la vista pinta, esto decide.
 */

export interface PeopleFilters {
  titles: string[];
  includeSimilar: boolean;
  seniorities: string[];
  /** Id de la categoría (el nicho con su CIIU). null = cualquiera. */
  categoryId: string | null;
  city: string;
  sizes: string[];
  emailVerified: boolean;
  /** Filtro de la PÁGINA que se ve: Apollo no filtra por celular antes de revelar. */
  directPhone: boolean;
  hiring: boolean;
}

export const EMPTY_PEOPLE_FILTERS: PeopleFilters = {
  titles: [],
  includeSimilar: true,
  seniorities: [],
  categoryId: null,
  city: "",
  sizes: [],
  emailVerified: false,
  directPhone: false,
  hiring: false,
};

/** Jerarquías, dichas como las diría el dueño. El valor es el de Apollo. */
export const SENIORITY_OPTIONS: readonly { value: string; label: string }[] = [
  { value: "owner", label: "Dueño" },
  { value: "founder", label: "Fundador" },
  { value: "c_suite", label: "Directivo" },
  { value: "director", label: "Director" },
  { value: "manager", label: "Gerente" },
  { value: "head", label: "Jefe" },
];

/** Tamaños del tablero. «201+» son los tres rangos de arriba de Apollo. */
export const SIZE_OPTIONS: readonly { value: string; label: string; ranges: string[] }[] = [
  { value: "1-10", label: "1–10", ranges: ["1,10"] },
  { value: "11-50", label: "11–50", ranges: ["11,50"] },
  { value: "51-200", label: "51–200", ranges: ["51,200"] },
  { value: "201+", label: "201+", ranges: ["201,500", "501,1000", "1001,100000"] },
];

/** Cuántas personas se piden por página: las que caben en la tabla. */
export const PEOPLE_PAGE_SIZE = 25;

/**
 * ¿Hay algo que buscar? Sin cargo, sin jerarquía y sin empresa no hay
 * pregunta (el servidor lo rechaza igual con su motivo).
 */
export function canSearchPeople(filters: PeopleFilters): boolean {
  return filters.titles.length > 0 || filters.seniorities.length > 0;
}

/** Cuántos filtros hay puestos, para «Limpiar». */
export function activePeopleFilters(filters: PeopleFilters): number {
  return (
    (filters.titles.length > 0 ? 1 : 0) +
    (filters.seniorities.length > 0 ? 1 : 0) +
    (filters.categoryId === null ? 0 : 1) +
    (filters.city.trim().length > 0 ? 1 : 0) +
    (filters.sizes.length > 0 ? 1 : 0) +
    (filters.emailVerified ? 1 : 0) +
    (filters.directPhone ? 1 : 0) +
    (filters.hiring ? 1 : 0)
  );
}

/**
 * La búsqueda que sale de los filtros. Es una `prospecting_search` como las
 * demás —fuente `apollo_people`, modo `browse`—: no hay un buscador aparte.
 */
export function peopleSearchInput(
  filters: PeopleFilters,
  categoryLabel: string | null,
): StartSearchInput {
  const ranges = SIZE_OPTIONS.filter((option) => filters.sizes.includes(option.value)).flatMap(
    (option) => option.ranges,
  );
  const city = filters.city.trim();
  return {
    source: "apollo_people",
    mode: "browse",
    limit: PEOPLE_PAGE_SIZE,
    country: "CO",
    ...(city.length > 0 ? { city } : {}),
    person: {
      titles: filters.titles,
      seniorities: filters.seniorities as NonNullable<StartSearchInput["person"]>["seniorities"],
      include_similar: filters.includeSimilar,
      email_verified: filters.emailVerified,
      hiring: filters.hiring,
    },
    company: {
      ciiu: [],
      domains: [],
      employee_ranges: ranges as NonNullable<StartSearchInput["company"]>["employee_ranges"],
      // Apollo no entiende CIIU: la industria viaja como palabra clave.
      keywords: categoryLabel === null ? null : categoryLabel.toLowerCase(),
    },
  };
}

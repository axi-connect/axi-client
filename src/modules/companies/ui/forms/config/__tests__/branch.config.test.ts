import type { BranchDTO } from "@/modules/companies/domain/branch";
import {
  branchFormSchema,
  branchFromCompanyAddress,
  branchToFormValues,
  defaultBranchValues,
  toBranchScheduleInputs,
  toCreateBranchDTO,
  toUpdateBranchDTO,
} from "@/modules/companies/ui/forms/config/branch.config";

const ORIGINAL: BranchDTO = {
  id: "br-1",
  name: "Centro",
  address: "Cra 7 # 12-34",
  city: "Bogotá",
  country_code: "CO",
  latitude: 4.6,
  longitude: -74.07,
  directions: "Al frente del parque",
  is_main: true,
  is_active: true,
  position: 0,
  schedules: [{ id: "s1", weekday: 6, opens_at: "10:00", closes_at: "14:00" }],
  created_at: "2026-09-01T10:00:00.000Z",
  updated_at: "2026-09-01T10:00:00.000Z",
};

describe("branch.config", () => {
  it("la primera sede nace principal; la semilla desde la empresa copia dirección y ciudad", () => {
    expect(defaultBranchValues(true).is_main).toBe(true);
    expect(defaultBranchValues(false).is_main).toBe(false);
    expect(branchFromCompanyAddress({ address: "Av 68 # 1-10", city: "Bogotá" })).toMatchObject({
      name: "Sede principal",
      address: "Av 68 # 1-10",
      city: "Bogotá",
      is_main: true,
    });
  });

  it("una sede con horario propio carga use_company_hours=false y sus filas", () => {
    const values = branchToFormValues(ORIGINAL);
    expect(values.use_company_hours).toBe(false);
    expect(values.schedules[6]).toMatchObject({ enabled: true, opens_at: "10:00", closes_at: "14:00" });
    expect(branchToFormValues({ ...ORIGINAL, schedules: [] }).use_company_hours).toBe(true);
  });

  it("coordenadas a medias o un horario propio inválido no pasan la validación", () => {
    const base = { ...defaultBranchValues(true), name: "Norte", address: "Cl 120 # 6A-05" };
    expect(branchFormSchema.safeParse(base).success).toBe(true);
    expect(branchFormSchema.safeParse({ ...base, latitude: 4.6 }).success).toBe(false);
    const own = branchToFormValues(ORIGINAL);
    own.schedules[6] = { ...own.schedules[6], opens_at: "18:00", closes_at: "08:00" };
    expect(branchFormSchema.safeParse(own).success).toBe(false);
  });

  it("crear: viaja el país de la empresa, y solo lo que tiene valor", () => {
    expect(toCreateBranchDTO({ ...defaultBranchValues(true), name: "Norte", address: "Cl 120" }, "CO")).toEqual({
      name: "Norte",
      address: "Cl 120",
      country_code: "CO",
      is_main: true,
      is_active: true,
    });
  });

  it("editar: vaciar indicaciones que existían manda null; quitar el pin manda ambas coordenadas null", () => {
    const values = { ...branchToFormValues(ORIGINAL), directions: "", latitude: null, longitude: null };
    expect(toUpdateBranchDTO(values, ORIGINAL)).toEqual({
      name: "Centro",
      address: "Cra 7 # 12-34",
      is_main: true,
      is_active: true,
      city: "Bogotá",
      directions: null,
      latitude: null,
      longitude: null,
    });
  });

  it("horario: usar el de la empresa envía [] (heredar); propio envía solo los días encendidos", () => {
    expect(toBranchScheduleInputs(branchToFormValues({ ...ORIGINAL, schedules: [] }))).toEqual([]);
    expect(toBranchScheduleInputs(branchToFormValues(ORIGINAL))).toEqual([
      { weekday: 6, opens_at: "10:00", closes_at: "14:00" },
    ]);
  });
});

import {
  defaultRoutineInput,
  funnelOf,
  hourLabel,
  itemTitle,
  scheduleLabel,
  sourceSummary,
  stepsDone,
  validateRoutine,
} from "../autopilot";

describe("autopilot — cómo se dice un horario", () => {
  it("lun a vie, diario y días sueltos, con las horas como se dicen", () => {
    expect(scheduleLabel({ days: [1, 2, 3, 4, 5], times: ["14:00", "08:00"], timezone: "America/Bogota", leads_per_run: 25 })).toBe(
      "Lun a vie · 8:00 y 14:00",
    );
    expect(scheduleLabel({ days: [1, 2, 3, 4, 5, 6, 7], times: ["07:30"], timezone: "America/Bogota", leads_per_run: 10 })).toBe(
      "Diario · 7:30",
    );
    expect(scheduleLabel({ days: [4, 2], times: ["09:00"], timezone: "America/Bogota", leads_per_run: 15 })).toBe(
      "Mar y jue · 9:00",
    );
    expect(hourLabel("08:05")).toBe("8:05");
  });
});

describe("autopilot — en qué paso va", () => {
  it("un paso está hecho al alcanzar su ÚLTIMO cierre: buscar termina al acabar la búsqueda", () => {
    expect(stepsDone(null)).toBe(0);
    expect(stepsDone("search")).toBe(0);
    expect(stepsDone("await_search")).toBe(1);
    expect(stepsDone("gate")).toBe(5);
    // El lote de un piloto asistido no es un paso propio.
    expect(stepsDone("approve")).toBe(5);
    expect(stepsDone("contact")).toBe(6);
  });
});

describe("autopilot — lo que se ve de una ejecución", () => {
  it("el embudo sale de los contadores del motor, en cero si falta alguno", () => {
    expect(funnelOf({ found: 48, qualified: 19 }).map((entry) => entry.value)).toEqual([48, 19, 0]);
  });

  it("una cuenta sin nombre no se enseña como un id", () => {
    expect(itemTitle({ display_name: "Carolina Ruiz", company_name: "La Brasa Parrilla" })).toBe(
      "Carolina Ruiz · La Brasa Parrilla",
    );
    expect(itemTitle({})).toBe("Cuenta sin nombre");
  });


  it("qué busca, en una línea", () => {
    expect(sourceSummary({ person: { titles: ["Dueño", "Gerente"] }, city: "Medellín" })).toBe("Dueño, Gerente · Medellín");
    expect(sourceSummary({})).toBe("Sin filtros");
  });
});

describe("autopilot — antes de guardar", () => {
  it("un piloto nuevo con valores prudentes solo pide nombre y secuencia", () => {
    const draft = defaultRoutineInput("America/Bogota");
    expect(draft.mode).toBe("assisted");
    expect(validateRoutine(draft).map((problem) => problem.field)).toEqual(["name", "follow_up"]);
  });

  it("el tope por ejecución no pasa del mensual", () => {
    const draft = { ...defaultRoutineInput("America/Bogota"), name: "Radar", follow_up: { sequence_id: "s-1" } };
    expect(validateRoutine({ ...draft, budget: { per_run: 700, per_month: 600 } })[0]?.field).toBe("budget");
    expect(validateRoutine(draft)).toEqual([]);
  });
});

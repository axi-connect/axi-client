import { actionTargets, selectionIsVisible } from "../selection";

/**
 * Este fichero existe por un informe del dueño: el botón decía «Eliminar 175» y
 * el diálogo que abría preguntaba «¿Eliminar 24 leads?».
 *
 * La causa era que la vista tenía TRES nociones de «la selección» —el rótulo
 * leía una, el diálogo otra y la petición una tercera—, y las dos últimas se
 * filtraban contra la página cargada. Lo que se blinda aquí es la regla que lo
 * arregla: **un id que no está en pantalla no se descarta.**
 */

type Row = { id: string; promoted: boolean };

const PAGE: Row[] = [
  { id: "a", promoted: false },
  { id: "b", promoted: true },
  { id: "c", promoted: false },
];

const borrable = (row: Row) => !row.promoted;

describe("actionTargets", () => {
  it("EL BUG: un id de otra página NO se descarta", () => {
    // Es la mitad del defecto: con 175 marcados, `Eliminar` mandaba solo los de
    // la página y el rótulo seguía diciendo 175. De una fila que no tenemos
    // cargada no se puede juzgar nada; juzga el backend y lo cuenta el informe.
    const selected = new Set(["a", "z-de-otra-pagina"]);
    expect(actionTargets(selected, PAGE, borrable)).toEqual(["a", "z-de-otra-pagina"]);
  });

  it("una fila VISIBLE que no cumple sí se descarta", () => {
    // `b` ya es contacto del CRM: está a la vista, se puede juzgar, y mandarlo
    // sería pedirle al backend un borrado que va a rechazar.
    expect(actionTargets(new Set(["a", "b", "c"]), PAGE, borrable)).toEqual(["a", "c"]);
  });

  it("el número del rótulo es la longitud de lo que se manda", () => {
    // La propiedad que cierra el informe: no hay dos cuentas que puedan
    // discrepar, hay un arreglo y su longitud.
    const targets = actionTargets(new Set(["a", "b", "c", "z"]), PAGE, borrable);
    expect(targets.length).toBe(3);
    expect(targets).toEqual(["a", "c", "z"]);
  });

  it("sin nada marcado no hay a quién actuar", () => {
    expect(actionTargets(new Set(), PAGE, borrable)).toEqual([]);
  });
});

describe("selectionIsVisible", () => {
  it("con toda la selección en pantalla se puede afirmar una cuenta derivada", () => {
    expect(selectionIsVisible(new Set(["a", "b"]), PAGE)).toBe(true);
  });

  it("con un id de otra página, NO", () => {
    // Es lo que hace que el diálogo deje de dar cifra de supervivientes en vez
    // de inventarla.
    expect(selectionIsVisible(new Set(["a", "z"]), PAGE)).toBe(false);
  });
});

/**
 * De una selección a los ids sobre los que ACTÚA un botón.
 *
 * Existe por un informe del dueño: el botón decía «Eliminar 175» y el diálogo que
 * abría preguntaba «¿Eliminar 24 leads?». La causa era que la vista tenía tres
 * nociones distintas de «la selección» —el rótulo leía una, el diálogo otra y la
 * petición una tercera— y las tres podían discrepar. Aquí hay UNA, y el rótulo,
 * el diálogo y la petición leen su longitud y su contenido.
 *
 * **La regla que importa: un id que no está en la página PASA.** La selección
 * abarca varias páginas a propósito —eso es «seleccionar los 175 que cumplen el
 * filtro»— y de una fila que no tenemos cargada no se puede juzgar si la acción
 * le aplica. Descartarla sería tirar la selección, que es exactamente el defecto
 * que se está arreglando: promover y buscar datos actuaban en silencio sobre los
 * 25 de la página mientras el botón decía 175. Quien juzga esas filas es el
 * backend, y las tres acciones del módulo devuelven resultado por lead
 * (`queued`, `promoted`/`failed`, `deleted`/`kept`/`missing`), así que lo que
 * sobreviva se cuenta después con nombre y motivo.
 *
 * TypeScript puro: ni React ni HTTP.
 */

/** Los ids que se van a mandar, en el orden de la selección. */
export function actionTargets<T extends { id: string }>(
  selected: ReadonlySet<string>,
  /** Las filas que están cargadas AHORA. Normalmente la página en pantalla. */
  onPage: readonly T[],
  /** ¿La acción aplica a esta fila? Solo se pregunta de las que se ven. */
  allowed: (row: T) => boolean,
): string[] {
  const visible = new Map(onPage.map((row) => [row.id, row]));
  return [...selected].filter((id) => {
    const row = visible.get(id);
    return row === undefined || allowed(row);
  });
}

/**
 * ¿Está toda la selección a la vista?
 *
 * Es lo que decide si una cifra derivada de las filas cargadas se puede afirmar.
 * Con la selección entera en pantalla, «3 ya son contactos del CRM y se
 * quedarán» es exacto; en cuanto hay un id de otra página, ese número sería
 * inventado y la copia tiene que dejar de dar cifra.
 */
export function selectionIsVisible<T extends { id: string }>(
  selected: ReadonlySet<string>,
  onPage: readonly T[],
): boolean {
  const visible = new Set(onPage.map((row) => row.id));
  for (const id of selected) if (!visible.has(id)) return false;
  return true;
}

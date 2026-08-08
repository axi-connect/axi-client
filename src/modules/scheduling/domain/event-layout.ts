/**
 * Layout de solapes de la grilla horaria (semana/día). Con `slot_capacity > 1`
 * las citas simultáneas son lo normal, no la excepción: cada cluster de solape
 * transitivo se reparte en columnas y todos sus eventos comparten el ancho.
 *
 * Puro y sin DOM: la UI traduce `column/columns` a `left/width` porcentuales.
 */
export type LayoutInput = {
  id: string;
  startMin: number;
  endMin: number;
};

export type LayoutBox = LayoutInput & {
  /** Columna asignada (0-based) y total de columnas de su cluster. */
  column: number;
  columns: number;
};

export function layoutDayEvents(events: LayoutInput[]): LayoutBox[] {
  // Duración mínima efectiva de 1 min: un evento degenerado (end <= start)
  // no debe compartir columna con uno que empiece en el mismo minuto.
  const sorted = events
    .map((e) => ({ ...e, endMin: Math.max(e.endMin, e.startMin + 1) }))
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin || a.id.localeCompare(b.id));

  const result: LayoutBox[] = [];
  let cluster: LayoutBox[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const columns = columnEnds.length;
    for (const box of cluster) box.columns = columns;
    result.push(...cluster);
    cluster = [];
    columnEnds = [];
    clusterEnd = -1;
  };

  for (const event of sorted) {
    if (cluster.length > 0 && event.startMin >= clusterEnd) flush();

    let column = columnEnds.findIndex((end) => end <= event.startMin);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(event.endMin);
    } else {
      columnEnds[column] = event.endMin;
    }

    cluster.push({ ...event, column, columns: 0 });
    clusterEnd = Math.max(clusterEnd, event.endMin);
  }
  flush();

  return result;
}

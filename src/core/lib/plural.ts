/**
 * «1 contacto» / «12 contactos». La ÚNICA pluralización del panel: antes había
 * una copia por módulo (support-sessions, el MultiSelect, la modal de lote) y
 * seis ternarios `=== 1 ?` sueltos, cada uno con su propio riesgo de «1 contactos».
 */
export function plural(count: number, one: string, many: string): string {
  return `${String(count)} ${count === 1 ? one : many}`;
}

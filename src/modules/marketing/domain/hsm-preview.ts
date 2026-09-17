/**
 * Vista previa de una plantilla de Meta, en segmentos para que la UI resalte
 * los huecos.
 *
 * Solo sabe de `{{n}}` y de dónde empieza y acaba cada hueco. **Quién rellena
 * cada uno no es asunto suyo**: lo dice el que llama, con `valueAt`. Por eso la
 * comparten dos vocabularios distintos — el estrecho de la apertura del CRM
 * (nombre, tema, empresa) y el ancho de las campañas, que además admite texto
 * fijo y campos personalizados— sin que ninguno tenga que conocer al otro.
 */

export type PreviewSegment = { text: string; variable: boolean };

/**
 * `valueAt` recibe el número del hueco (1, 2, …) y devuelve lo que va dentro,
 * o `null` si todavía no se ha decidido: entonces se pinta el `{{n}}` crudo,
 * que es exactamente lo que el operador tiene que ver para ir a rellenarlo.
 */
export function renderHsmPreview(
  body: string,
  valueAt: (index: number) => string | null,
): PreviewSegment[] {
  const segments: PreviewSegment[] = [];
  let cursor = 0;
  for (const match of body.matchAll(/\{\{(\d+)\}\}/g)) {
    if (match.index > cursor) {
      segments.push({ text: body.slice(cursor, match.index), variable: false });
    }
    const value = valueAt(Number(match[1]));
    segments.push({ text: value === null ? match[0] : value, variable: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < body.length) segments.push({ text: body.slice(cursor), variable: false });
  return segments;
}

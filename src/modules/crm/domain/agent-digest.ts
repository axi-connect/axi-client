import type { AgentDigestDTO } from "./activity";

/**
 * Qué cifras del parte del agente se pintan, y en qué orden.
 *
 * TypeScript puro — cero React. Existe porque el orden NO es el del contrato:
 * las cinco cifras no valen lo mismo y ordenarlas en el componente habría
 * dejado la regla sin test.
 *
 * - **Lo que acabó en compra va primero**: es la única que responde «¿esto da
 *   dinero?». Y solo aparece si es > 0: un cero en verde no es un resultado.
 * - `reached` es el denominador y va después. Solo, no significa nada: «12
 *   mensajes enviados» no le dice a nadie si la automatización sirve.
 * - **Una cifra en cero se cae de la línea**, no se imprime «0 respondieron».
 * - `failed` no está aquí: es la única con control y la pinta el componente
 *   como botón.
 */
export type DigestFigure = { key: string; value: number; label: string; good?: boolean };

export type AgentDigestCounts = AgentDigestDTO["counts"];

function plural(value: number, one: string, many: string): string {
  return value === 1 ? one : many;
}

export function agentDigestFigures(counts: AgentDigestCounts): DigestFigure[] {
  const figures: DigestFigure[] = [];
  if (counts.converted > 0) {
    figures.push({ key: "converted", value: counts.converted, label: "en compra", good: true });
  }
  if (counts.reached > 0) {
    figures.push({
      key: "reached",
      value: counts.reached,
      label: plural(counts.reached, "seguimiento", "seguimientos"),
    });
  }
  if (counts.replied > 0) {
    figures.push({
      key: "replied",
      value: counts.replied,
      label: plural(counts.replied, "respondió", "respondieron"),
    });
  }
  if (counts.calls_connected > 0) {
    figures.push({
      key: "calls",
      value: counts.calls_connected,
      label: plural(counts.calls_connected, "llamada atendida", "llamadas atendidas"),
    });
  }
  return figures;
}

/**
 * Las dos cifras del resumen de la bandeja mezclada: cuánto trabajo hizo y qué
 * salió de ahí. El resto es detalle que pertenece al modo agente.
 */
export function agentDigestTeaser(counts: AgentDigestCounts): DigestFigure[] {
  return agentDigestFigures(counts).filter(
    (figure) => figure.key === "converted" || figure.key === "reached",
  );
}

/**
 * ¿Hay algo que contar?
 *
 * Con todo a cero la línea no se pinta: un «0 seguimientos» dos días seguidos
 * es ruido, y el vacío del modo agente ya cuenta esa historia. `failed` cuenta
 * como algo que decir aunque no haya salido nada — es justo lo que hay que ver.
 */
export function hasDigestNews(counts: AgentDigestCounts): boolean {
  return counts.reached > 0 || counts.failed > 0;
}

/**
 * En la bandeja MEZCLADA el resumen solo aparece si hay un resultado o un
 * fallo. Que haya salido trabajo, sin desenlace, no justifica ocupar una línea
 * encima de una lista que es mayoritariamente humana.
 */
export function hasTeaserNews(counts: AgentDigestCounts): boolean {
  return counts.converted > 0 || counts.failed > 0;
}

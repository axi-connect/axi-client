import { PILL_MAX, type AppAlert } from "./to-options";

/**
 * El contrato de un aviso (DESIGN-SYSTEM §9.4), como lista de faltas para los
 * tests de los módulos: se comprueba el `showAlert` que dispara cada flujo, no
 * solo que se pintó algo. Vacío = cumple.
 *
 * - El título cabe en la píldora (≤ 34), sin punto final.
 * - El mensaje del servidor nunca es el título: si el test conoce el texto del
 *   error (`serverMessage`), el título no puede contenerlo.
 * - La duración la pone el tono: un `autoCloseMs` es falta salvo que el test
 *   lo declare justificado (`allowAutoClose`).
 * - Un botón como mucho.
 */
export function alertContractViolations(
  alert: AppAlert,
  opts: { serverMessage?: string; allowAutoClose?: boolean } = {},
): string[] {
  const faults: string[] = [];
  const title = alert.title.trim();
  if (title.length > PILL_MAX)
    faults.push(
      `título de ${String(title.length)} > ${String(PILL_MAX)}: «${title}»`,
    );
  if (/[.]$/.test(title)) faults.push(`título con punto final: «${title}»`);
  if (opts.serverMessage && title.includes(opts.serverMessage)) {
    faults.push(`el mensaje del servidor va en el título: «${title}»`);
  }
  if (alert.autoCloseMs !== undefined && !opts.allowAutoClose) {
    faults.push(
      `autoCloseMs ${String(alert.autoCloseMs)} sin justificar: la duración la pone el tono`,
    );
  }
  if ((alert.actions?.length ?? 0) > 1) faults.push("más de un botón");
  return faults;
}

/**
 * Para usar sobre `mockShowAlert.mock.calls[n][0]`: falla con la lista de
 * faltas. Úsalo con el PEOR caso real del texto (el nombre de tipo más largo,
 * el número más largo), no con el más corto.
 */
export function expectAlertContract(
  alert: unknown,
  opts: { serverMessage?: string; allowAutoClose?: boolean } = {},
): void {
  const faults = alertContractViolations(alert as AppAlert, opts);
  if (faults.length > 0) {
    throw new Error(`El aviso no cumple §9.4:\n- ${faults.join("\n- ")}`);
  }
}

import type { Schemas } from "@/core/api/types";

/**
 * «Axi propone» en Pilotos (P6b, mockup aprobado por el dueño): las propuestas
 * de los pilotos (`source: "autopilot"`) viven en `cmo_proposal` y viajan con el
 * mismo contrato que las de Axel (`ProposalListDto`, `ApprovalResultDto`).
 */
export type PilotProposalDTO = Schemas["ProposalListDto"]["data"][number];
export type PilotApprovalDTO = Schemas["ApprovalResultDto"];

/** Un renglón de «Qué cambia si lo aplicas». */
export interface ChangeRow {
  label: string;
  before: string;
  after: string;
}

interface Patch {
  routine_id: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

const credits = (value: number) => `${value.toLocaleString("es-CO")} créditos`;

/** «09:00 y 15:00», «09:00, 12:00 y 15:00». */
function timesLabel(times: unknown): string {
  if (!Array.isArray(times)) return "—";
  const list = times.filter((time): time is string => typeof time === "string");
  if (list.length <= 1) return list[0] ?? "—";
  return `${list.slice(0, -1).join(", ")} y ${list[list.length - 1]}`;
}

function field(fields: Record<string, unknown>, group: string, key: string): unknown {
  const value = fields[group];
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
}

/** Los cambios del artefacto `autopilot_routine_patch`, leídos a la defensiva. */
export function proposalPatches(proposal: PilotProposalDTO): Patch[] {
  const artifact = proposal.artifacts.find(
    (item): item is Record<string, unknown> =>
      item !== null && typeof item === "object" && (item as { type?: unknown }).type === "autopilot_routine_patch",
  );
  const spec = artifact?.spec;
  const patches = spec !== null && typeof spec === "object" ? (spec as { patches?: unknown }).patches : undefined;
  if (!Array.isArray(patches)) return [];
  return patches.flatMap((item) => {
    if (item === null || typeof item !== "object") return [];
    const patch = item as Record<string, unknown>;
    const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";
    if (typeof patch.routine_id !== "string" || !isObject(patch.before) || !isObject(patch.after)) return [];
    return [{ routine_id: patch.routine_id, before: patch.before, after: patch.after }];
  });
}

const ROWS: { group: string; key: string; label: string; format: (value: unknown) => string }[] = [
  { group: "schedule", key: "times", label: "Horario", format: timesLabel },
  { group: "schedule", key: "leads_per_run", label: "Cuentas por turno", format: (value) => (typeof value === "number" ? String(value) : "—") },
  { group: "budget", key: "per_run", label: "Tope por salida", format: (value) => (typeof value === "number" ? credits(value) : "—") },
  { group: "budget", key: "per_month", label: "Tope del mes", format: (value) => (typeof value === "number" ? credits(value) : "—") },
];

/**
 * «Qué cambia si lo aplicas»: solo lo que cambia. Con varios pilotos (mover el
 * tope de uno a otro) cada renglón lleva el nombre del piloto.
 */
export function changeRows(proposal: PilotProposalDTO, routineNames: ReadonlyMap<string, string>): ChangeRow[] {
  const patches = proposalPatches(proposal);
  const many = patches.length > 1;
  return patches.flatMap((patch) =>
    ROWS.flatMap((row) => {
      const before = field(patch.before, row.group, row.key);
      const after = field(patch.after, row.group, row.key);
      if (after === undefined || JSON.stringify(before) === JSON.stringify(after)) return [];
      const name = routineNames.get(patch.routine_id);
      return [
        {
          label: many && name !== undefined ? `${row.label} · ${name}` : row.label,
          before: row.format(before),
          after: row.format(after),
        },
      ];
    }),
  );
}

/** El piloto al que lleva «Ver el piloto»: el primero que el ajuste toca. */
export function proposalRoutineId(proposal: PilotProposalDTO): string | null {
  return proposalPatches(proposal)[0]?.routine_id ?? null;
}

/** Un motivo de rechazo vacío no viaja; uno corto no lo acepta el servidor (8–300). */
export function rejectReason(raw: string): { reason?: string; error?: string } {
  const reason = raw.trim();
  if (reason === "") return {};
  if (reason.length < 8) return { error: "Escribe un poco más (al menos 8 caracteres) o déjalo vacío." };
  return { reason: reason.slice(0, 300) };
}

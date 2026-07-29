"use client";

import { z } from "zod";
import type { FieldConfig } from "@/shared/components/features/dynamic-form";
import { createCustomField, createInputField } from "@/shared/components/features/dynamic-form";
import {
  ACTIVITY_KIND_LABELS,
  type ActivityKind,
  type CreateActivityDTO,
} from "@/modules/crm/domain/activity";
import { ContactPicker } from "@/modules/crm/ui/forms/ContactPicker";

const NO_ASSIGNEE = "__none__";

/**
 * Config del formulario de actividad/tarea (POST /crm/activities). El mismo
 * config sirve desde la bandeja, el 360 y el rail del deal: `isVisible` por
 * kind gobierna vencimiento y asignación (solo tareas — CHECK del backend).
 */
export const activityFormSchema = z
  .object({
    contact: z
      .object({ id: z.string(), label: z.string() })
      .nullable()
      .refine((value) => value !== null, "Selecciona el contacto"),
    kind: z.enum(["note", "call", "meeting", "task"]),
    title: z.string().trim().min(1, "Título requerido").max(200),
    body: z.string().trim().max(2000).optional().or(z.literal("")),
    due_at: z.string(),
    assigned_user_id: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.kind === "task" && values.due_at.trim() === "") {
      ctx.addIssue({
        code: "custom",
        path: ["due_at"],
        message: "Una tarea necesita fecha de vencimiento",
      });
    }
  });

export type ActivityFormValues = z.infer<typeof activityFormSchema>;

export function defaultActivityFormValues(preset?: {
  contact?: { id: string; label: string };
  kind?: ActivityKind;
}): ActivityFormValues {
  return {
    contact: preset?.contact ?? null,
    kind: preset?.kind ?? "task",
    title: "",
    body: "",
    due_at: "",
    assigned_user_id: NO_ASSIGNEE,
  };
}

export function buildActivityFormFields(options: {
  users: Array<{ id: string; name: string }>;
  /** Contacto fijado (desde el 360/rail): el picker se deshabilita. */
  contactLocked: boolean;
}): ReadonlyArray<FieldConfig<ActivityFormValues>> {
  return [
    createCustomField<ActivityFormValues>(
      "contact",
      ({ value, setValue, getError }) =>
        options.contactLocked ? (
          <p className="flex h-9 items-center rounded-md border border-border bg-muted px-3 text-sm">
            {(value as ActivityFormValues["contact"])?.label}
          </p>
        ) : (
          <ContactPicker
            value={value as ActivityFormValues["contact"]}
            onChange={(contact) => setValue("contact", contact)}
            error={getError()}
          />
        ),
      { label: "Contacto" },
    ),
    createCustomField<ActivityFormValues>(
      "kind",
      ({ value, setValue }) => (
        <select
          value={value as ActivityKind}
          onChange={(e) => setValue("kind", e.target.value as ActivityKind)}
          className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          aria-label="Tipo de actividad"
        >
          {(Object.keys(ACTIVITY_KIND_LABELS) as ActivityKind[]).map((kind) => (
            <option key={kind} value={kind}>
              {ACTIVITY_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
      ),
      { label: "Tipo" },
    ),
    createInputField<ActivityFormValues>("title", {
      label: "Título",
      placeholder: "Llamar para confirmar cotización",
      colSpan: { base: 1, md: 2 },
    }),
    createInputField<ActivityFormValues>("body", {
      label: "Detalle (opcional)",
      inputKind: "textarea",
      colSpan: { base: 1, md: 2 },
    }),
    createCustomField<ActivityFormValues>(
      "due_at",
      ({ value, setValue, getError }) => (
        <div className="space-y-1">
          <input
            type="datetime-local"
            value={value as string}
            onChange={(e) => setValue("due_at", e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            aria-label="Vence"
            aria-invalid={Boolean(getError())}
          />
          {getError() && <p className="text-xs text-destructive">{getError()}</p>}
        </div>
      ),
      { label: "Vence", isVisible: (values) => values.kind === "task" },
    ),
    createCustomField<ActivityFormValues>(
      "assigned_user_id",
      ({ value, setValue }) => (
        <select
          value={value as string}
          onChange={(e) => setValue("assigned_user_id", e.target.value)}
          className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          aria-label="Asignada a"
        >
          <option value={NO_ASSIGNEE}>Sin asignar</option>
          {options.users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      ),
      { label: "Asignada a", isVisible: (values) => values.kind === "task" },
    ),
  ] as const;
}

export function toCreateActivityDTO(
  values: ActivityFormValues,
  dealId?: string,
): CreateActivityDTO {
  const isTask = values.kind === "task";
  return {
    contact_id: (values.contact as { id: string }).id,
    kind: values.kind,
    title: values.title,
    body: values.body || undefined,
    deal_id: dealId ?? undefined,
    due_at: isTask && values.due_at ? new Date(values.due_at).toISOString() : undefined,
    assigned_user_id:
      isTask && values.assigned_user_id !== NO_ASSIGNEE ? values.assigned_user_id : undefined,
  };
}

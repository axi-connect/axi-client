"use client";

/**
 * «Entrar como soporte» (entrega F3): motivo, ticket, duración y la contraseña
 * del admin otra vez (hasta que exista el doble factor). Al confirmar, la
 * consola emite la sesión y abre la pestaña `/auth/soporte#code=…`.
 *
 * La pestaña se abre en el MISMO gesto del clic (`window.open` antes de la
 * llamada) para que el navegador no la bloquee; cuando llega el código, se le
 * pone la dirección. Si falla, esa pestaña en blanco se cierra. El diálogo no
 * se cierra solo (keepOpen): se cierra al abrir la sesión.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useController, useFormContext, useWatch, type Control, type UseFormReturn } from "react-hook-form";
import { Check, ExternalLink, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { isHttpError, API_ERROR_CODES } from "@/core/api/problem";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { createCustomField, createInputField, DynamicForm } from "@/shared/components/features/dynamic-form";
import { cn } from "@/core/lib/utils";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Button } from "@/shared/components/ui/button";
import { Callout } from "@/shared/components/ui/callout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { supportTabUrl } from "../../../domain/support-sessions";
import type { TenantListItem } from "../../../domain/tenant";
import { useIssueSupportSession } from "../../../infrastructure/api/hooks/use-support-sessions";
import {
  defaultSupportSessionValues,
  supportSessionSchema,
  toIssueSupportSessionDTO,
  type SupportSessionFormValues,
} from "./support-session-form.config";

const FORM_ID = "support-session-form";

const DURATION_ITEMS = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "60", label: "60 min" },
] as const;

type DurationValue = (typeof DURATION_ITEMS)[number]["value"];

function DurationField({ control }: { control: Control<SupportSessionFormValues> }) {
  const { field } = useController({ control, name: "minutes" });
  const value = DURATION_ITEMS.find((item) => item.value === field.value)?.value ?? "60";
  return (
    <SegmentedControl
      label="Duración de la sesión"
      size="sm"
      surface="inline"
      value={value}
      onValueChange={(next: DurationValue) => field.onChange(next)}
      items={DURATION_ITEMS}
      className="w-full [&>*]:flex-1"
    />
  );
}

const FIELDS = [
  createInputField<SupportSessionFormValues>("reason", {
    inputKind: "textarea",
    label: "Motivo (queda en la auditoría)",
    placeholder: "El agente no cotiza los combos desde ayer; reviso el catálogo.",
    colSpan: { base: 1, md: 2 },
  }),
  createCustomField<SupportSessionFormValues>("minutes", ({ control }) => <DurationField control={control} />, {
    label: "Duración",
  }),
  createInputField<SupportSessionFormValues>("ticket_ref", {
    label: "Ticket (opcional)",
    placeholder: "SUP-1234",
    autoComplete: "off",
  }),
  createInputField<SupportSessionFormValues>("password", {
    inputKind: "password",
    label: "Confirma con tu contraseña",
    autoComplete: "current-password",
    description: "Mientras no exista el doble factor, pedimos tu contraseña otra vez.",
    colSpan: { base: 1, md: 2 },
  }),
];

/** Motivos frecuentes: un toque escribe el comienzo y el admin completa el detalle. */
const QUICK_REASONS = [
  { label: "Catálogo", text: "Reviso el catálogo: " },
  { label: "Agente", text: "Reviso la configuración del agente: " },
  { label: "Pagos", text: "Configuro el primer medio de pago: " },
  { label: "WhatsApp", text: "Reviso el canal de WhatsApp: " },
] as const;

function QuickReasons() {
  const { control, setValue, setFocus } = useFormContext<SupportSessionFormValues>();
  const reason = useWatch({ control, name: "reason" }) ?? "";
  return (
    <div className="space-y-2">
      <p id="support-quick-reasons" className="text-sm font-medium">
        ¿Qué vas a revisar?
      </p>
      <div role="group" aria-labelledby="support-quick-reasons" className="flex flex-wrap gap-2">
        {QUICK_REASONS.map((item) => {
          const active = reason.startsWith(item.text);
          return (
            <button
              key={item.label}
              type="button"
              aria-pressed={active}
              onClick={() => {
                // Si ya había un motivo de otro atajo, se cambia el comienzo y se conserva el detalle.
                const current = QUICK_REASONS.find((other) => reason.startsWith(other.text));
                const detail = current ? reason.slice(current.text.length) : reason;
                setValue("reason", `${item.text}${detail}`, { shouldDirty: true });
                setFocus("reason");
              }}
              className={cn(
                "h-9 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-accent",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const CAN = ["Ver todo el panel", "Configurar agente y catálogo", "Crear el primer medio de pago"] as const;
const CANNOT = ["Tocar usuarios ni contraseñas", "Editar o borrar medios de pago", "Exportar datos o borrar la cuenta"] as const;

function SupportScope() {
  return (
    <div className="space-y-3 rounded-2xl bg-muted/60 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide uppercase">Puedes</p>
          <ul className="space-y-1.5">
            {CAN.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide uppercase">No puedes</p>
          <ul className="space-y-1.5">
            {CANNOT.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <X aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        Queda registrado: tu nombre, el motivo, la duración y cada pantalla que abras.
      </p>
    </div>
  );
}

/** Sube los valores del formulario al diálogo (para saber, en el clic, si abrir la pestaña). */
function ValuesObserver({ onValues }: { onValues: (values: SupportSessionFormValues) => void }) {
  const { control } = useFormContext<SupportSessionFormValues>();
  const values = useWatch({ control });
  useEffect(() => onValues(values as SupportSessionFormValues), [values, onValues]);
  return null;
}

export function SupportSessionDialog({
  open,
  onOpenChange,
  tenant,
  initialReason,
  next,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Pick<TenantListItem, "id" | "name">;
  /** Motivo precargado (desde un bloqueo de «Preparar entrega»). */
  initialReason?: string;
  /** Pantalla del panel a la que entra la pestaña tras el canje (lista blanca en /auth/soporte). */
  next?: string;
}) {
  const { showAlert } = useAlert();
  const issue = useIssueSupportSession(tenant.id);
  const initialValues = useMemo(
    () => ({ ...defaultSupportSessionValues, reason: initialReason ?? "" }),
    [initialReason],
  );
  const valuesRef = useRef<SupportSessionFormValues>(initialValues);
  const popupRef = useRef<Window | null>(null);
  const [blockedUrl, setBlockedUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const onValues = useCallback((values: SupportSessionFormValues) => {
    valuesRef.current = values;
  }, []);

  function closePopup() {
    popupRef.current?.close();
    popupRef.current = null;
  }

  /** En el clic, antes de validar en el servidor: la pestaña nace del gesto. */
  function openTabInGesture() {
    setFormError(null);
    if (!supportSessionSchema.safeParse(valuesRef.current).success) return;
    popupRef.current = window.open("about:blank", "_blank");
  }

  async function submit(values: SupportSessionFormValues, form: UseFormReturn<SupportSessionFormValues>) {
    try {
      const issued = await issue.mutateAsync(toIssueSupportSessionDTO(values));
      const url = supportTabUrl(issued.handoff_code, next);
      const popup = popupRef.current;
      popupRef.current = null;
      if (popup && !popup.closed) {
        popup.location.href = url;
        onOpenChange(false);
        showAlert({
          tone: "success",
          title: "Sesión de soporte abierta",
          description: `Se abrió en una pestaña nueva. Dura hasta ${values.minutes} min y queda registrada.`,
          autoCloseMs: 6000,
        });
      } else {
        // El navegador bloqueó la pestaña: un clic más, dentro de los 60 s del código.
        setBlockedUrl(url);
      }
    } catch (error) {
      closePopup();
      if (isHttpError(error) && error.is(API_ERROR_CODES.supportReauthFailed)) {
        form.setError("password", { type: "server", message: "La contraseña no coincide. Revísala." });
        return;
      }
      if (isHttpError(error) && (error.status === 429 || error.is(API_ERROR_CODES.supportReauthLocked))) {
        setFormError("Demasiados intentos: espera unos minutos antes de volver a probar.");
        return;
      }
      if (applyServerValidation(error, form)) return;
      setFormError(errorMessage(error));
    }
  }

  function handleOpenChange(next: boolean) {
    if (issue.isPending) return;
    if (!next) {
      setBlockedUrl(null);
      setFormError(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Entrar como soporte a «{tenant.name}»</DialogTitle>
          <DialogDescription>
            Entras sin conocer la contraseña de nadie. El cliente no ve ningún aviso; tu nombre y cada pantalla quedan en
            la auditoría.
          </DialogDescription>
        </DialogHeader>

        {blockedUrl ? (
          <div className="space-y-3">
            <Callout tone="warn" icon={ExternalLink}>
              El navegador bloqueó la pestaña nueva. Ábrela ahora: el código vale 60 segundos.
            </Callout>
            <Button asChild className="w-full">
              <a
                href={blockedUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  setBlockedUrl(null);
                  onOpenChange(false);
                }}
              >
                <ExternalLink aria-hidden="true" />
                Abrir la pestaña de soporte
              </a>
            </Button>
          </div>
        ) : (
          <>
            <DynamicForm<SupportSessionFormValues>
              id={FORM_ID}
              schema={supportSessionSchema}
              defaultValues={initialValues}
              fields={FIELDS}
              onSubmit={submit}
              renderFieldsWrapper={(grid) => (
                <>
                  <QuickReasons />
                  {grid}
                  <ValuesObserver onValues={onValues} />
                </>
              )}
            />
            <SupportScope />
            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={issue.isPending}>
                Cancelar
              </Button>
              <Button type="submit" form={FORM_ID} onClick={openTabInGesture} disabled={issue.isPending}>
                {issue.isPending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <ExternalLink aria-hidden="true" />}
                {issue.isPending ? "Abriendo…" : "Abrir en una pestaña nueva"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

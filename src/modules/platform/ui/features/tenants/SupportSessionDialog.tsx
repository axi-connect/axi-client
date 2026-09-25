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
import { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext, useWatch, type UseFormReturn } from "react-hook-form";
import { ExternalLink, LoaderCircle, ShieldCheck } from "lucide-react";
import { isHttpError, API_ERROR_CODES } from "@/core/api/problem";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { createInputField, DynamicForm } from "@/shared/components/features/dynamic-form";
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
import { SUPPORT_MAX_MINUTES, SUPPORT_MIN_MINUTES, supportTabUrl } from "../../../domain/support-sessions";
import type { TenantListItem } from "../../../domain/tenant";
import { useIssueSupportSession } from "../../../infrastructure/api/hooks/use-support-sessions";
import {
  defaultSupportSessionValues,
  supportSessionSchema,
  toIssueSupportSessionDTO,
  type SupportSessionFormValues,
} from "./support-session-form.config";

const FORM_ID = "support-session-form";

const FIELDS = [
  createInputField<SupportSessionFormValues>("reason", {
    inputKind: "textarea",
    label: "Motivo (queda en la auditoría)",
    placeholder: "El agente no cotiza los combos desde ayer; reviso el catálogo.",
    colSpan: { base: 1, md: 2 },
  }),
  createInputField<SupportSessionFormValues>("ticket_ref", {
    label: "Ticket (opcional)",
    placeholder: "SUP-1234",
    autoComplete: "off",
  }),
  createInputField<SupportSessionFormValues>("minutes", {
    inputKind: "number",
    label: "Duración (min)",
    description: `De ${SUPPORT_MIN_MINUTES} a ${SUPPORT_MAX_MINUTES} minutos`,
    inputProps: { min: SUPPORT_MIN_MINUTES, max: SUPPORT_MAX_MINUTES, step: 5 },
  }),
  createInputField<SupportSessionFormValues>("password", {
    inputKind: "password",
    label: "Tu contraseña",
    autoComplete: "current-password",
    description: "Mientras no exista el doble factor, pedimos tu contraseña otra vez.",
    colSpan: { base: 1, md: 2 },
  }),
];

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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Pick<TenantListItem, "id" | "name">;
}) {
  const { showAlert } = useAlert();
  const issue = useIssueSupportSession(tenant.id);
  const valuesRef = useRef<SupportSessionFormValues>(defaultSupportSessionValues);
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
      const url = supportTabUrl(issued.handoff_code);
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Entrar como soporte a «{tenant.name}»</DialogTitle>
          <DialogDescription>
            Entras a la cuenta para depurar sin conocer la contraseña de nadie. El cliente no ve ningún aviso.
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
              defaultValues={defaultSupportSessionValues}
              fields={FIELDS}
              onSubmit={submit}
              renderFieldsWrapper={(grid) => (
                <>
                  {grid}
                  <ValuesObserver onValues={onValues} />
                </>
              )}
            />
            <Callout tone="neutral" icon={ShieldCheck}>
              Queda registrado: tu nombre, el motivo, la duración y cada pantalla que abras. Dura como máximo{" "}
              {SUPPORT_MAX_MINUTES} minutos y no permite cambiar usuarios, credenciales, pagos ni borrar la cuenta.
            </Callout>
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

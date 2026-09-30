"use client";

import { useId, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { ContactPicker } from "@/modules/crm/public";
import {
  createOptOut,
  type CreateOptOutSource,
} from "@/modules/marketing/infrastructure/services/opt-outs-service.adapter";

const REASON_HELP: Record<CreateOptOutSource, string> = {
  manual:
    "Deja de recibir campañas, recuperación y seguimientos comerciales. Puedes volver a incluirlo si te lo pide.",
  habeas_data:
    "El titular pidió que no se usen sus datos. Sale de todo contacto comercial, por todos los canales. Queda en el registro legal con tu usuario y la fecha.",
};

/**
 * Alta manual de una baja (P1): la pide el cliente por teléfono o en persona, o
 * ejerce habeas data (Ley 1581). Habeas data sobre alguien que ya estaba de
 * baja no es un error: el servidor sube el origen de la baja viva.
 */
export function RegisterOptOutDialog({
  open,
  onOpenChange,
  onRegistered,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered: () => Promise<void> | void;
}) {
  const { showAlert } = useAlert();
  const contactLabelId = useId();
  const [contact, setContact] = useState<{ id: string; label: string } | null>(null);
  const [source, setSource] = useState<CreateOptOutSource>("manual");
  const [duplicate, setDuplicate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setContact(null);
    setSource("manual");
    setDuplicate(false);
  }

  async function submit() {
    if (contact === null) return;
    setSubmitting(true);
    try {
      const result = await createOptOut(contact.id, source);
      await onRegistered();
      showAlert({
        tone: "success",
        title: result.upgraded ? "Baja actualizada a habeas data" : "Baja registrada",
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      if (isHttpError(err) && err.code === "marketing/opt_out_already_active") setDuplicate(true);
      else showAlert({ tone: "error", title: errorMessage(err, "No se pudo registrar la baja") });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <DialogHeader className="px-5 pt-6 pr-14 pb-2 text-left sm:px-6">
          <DialogTitle className="font-heading text-xl leading-tight font-bold tracking-tight text-balance">
            Registrar baja
          </DialogTitle>
          <DialogDescription className="text-pretty">
            Quien esté en esta lista no recibe campañas, recuperación ni seguimientos comerciales.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 px-5 pt-3 pb-1 sm:px-6">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-sm font-medium" id={contactLabelId}>
              Contacto
            </span>
            <ContactPicker
              labelledBy={contactLabelId}
              value={contact}
              onChange={(next) => {
                setContact(next);
                setDuplicate(false);
              }}
            />
            {duplicate && (
              <p role="alert" className="text-destructive text-sm text-pretty">
                Este contacto ya tiene una baja activa. Si pidió habeas data, elige ese motivo.
              </p>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-sm font-medium">Motivo</span>
            <SegmentedControl
              value={source}
              onValueChange={(next) => {
                setSource(next);
                setDuplicate(false);
              }}
              label="Motivo de la baja"
              surface="inline"
              // Las dos opciones siempre a la vista: a 390 px no caben en una
              // línea y el segmentado las escondería tras su scroll interno.
              className="w-full [&>button]:h-auto [&>button]:min-h-9 [&>button]:flex-1 [&>button]:shrink [&>button]:py-1.5 [&>button]:leading-tight [&>button]:whitespace-normal"
              items={[
                { value: "manual", label: "Pidió no recibir mensajes" },
                { value: "habeas_data", label: "Habeas data (Ley 1581)" },
              ]}
            />
            <p
              className={
                source === "habeas_data"
                  ? "bg-accent-violet/7 rounded-2xl px-3 py-2.5 text-sm text-pretty"
                  : "text-muted-foreground text-sm text-pretty"
              }
            >
              {REASON_HELP[source]}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap-reverse justify-end gap-2 px-5 pt-4 pb-6 sm:px-6">
          <DialogClose asChild>
            <Button variant="outline" type="button" className="rounded-full">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            className="rounded-full"
            disabled={contact === null || duplicate || submitting}
            onClick={() => void submit()}
          >
            {submitting && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
            Registrar baja
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

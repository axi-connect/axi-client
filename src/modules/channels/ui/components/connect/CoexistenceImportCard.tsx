"use client";

import { useState } from "react";
import { Hourglass, LoaderCircle, Smartphone } from "lucide-react";

import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import { requestCoexistenceSync } from "@/modules/channels/infrastructure/services/meta-signup.adapter";

type Coexistence = NonNullable<ChannelDTO["coexistence"]>;

/**
 * Importar contactos e historial desde la app del celular (F1).
 *
 * Vive en la pantalla de éxito y no en ajustes porque Meta solo acepta la
 * importación UNA vez por tipo y dentro de las 24 h siguientes a conectar: la
 * decisión hay que ponerla delante del usuario con el reloj a la vista. Lo que
 * llegue (progreso, rechazo desde la app) lo pinta F2 con los webhooks; aquí
 * el estado pasa de «pendiente» a «pedido».
 */
export function CoexistenceImportCard({
  channel,
  onChannel,
}: {
  channel: ChannelDTO;
  /** El backend devuelve el canal actualizado; quien monta la tarjeta lo guarda. */
  onChannel: (channel: ChannelDTO) => void;
}) {
  const coexistence = channel.coexistence;
  const [contacts, setContacts] = useState(true);
  // D1: marcado por defecto. El tenant puede desmarcarlo; es su única oportunidad.
  const [history, setHistory] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (coexistence === null || coexistence === undefined) return null;

  const closesAt = new Date(coexistence.sync_window_closes_at);
  const windowClosed = closesAt.getTime() <= Date.now();
  const contactsPending = coexistence.sync.contacts === "pending";
  const historyPending = coexistence.sync.history === "pending";
  const nothingPending = !contactsPending && !historyPending;
  const nothingSelected = !(contacts && contactsPending) && !(history && historyPending);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await requestCoexistenceSync(channel.id, {
        contacts: contacts && contactsPending,
        history: history && historyPending,
      });
      onChannel(updated);
    } catch (err) {
      setError(
        errorMessage(
          err,
          isHttpError(err)
            ? "No pudimos pedir la importación."
            : "No pudimos pedir la importación. Revisa tu conexión y vuelve a intentarlo.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="coexistence-import-title"
      className="overflow-hidden rounded-lg border border-border"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 bg-muted/60 px-4 py-3">
        <div className="flex gap-3">
          <Smartphone aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-muted-foreground" />
          <div>
            <h3 id="coexistence-import-title" className="font-semibold">
              Trae lo que ya tienes en el celular
            </h3>
            <p className="text-sm text-muted-foreground">
              Así tu agente reconoce a tus clientes desde el primer mensaje.
            </p>
          </div>
        </div>
        {!nothingPending && (
          <p
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium",
              windowClosed ? "text-muted-foreground" : "text-warning",
            )}
          >
            <Hourglass aria-hidden="true" className="size-3.5" />
            {windowClosed
              ? "La importación ya no está disponible"
              : `Disponible hasta ${formatDeadline(closesAt)}`}
          </p>
        )}
      </div>

      {windowClosed && !nothingPending ? (
        <p className="p-4 text-sm text-muted-foreground">
          Pasaron más de 24 horas desde la conexión y Meta ya no acepta la importación. Para traer
          tus contactos o chats habría que desconectar el número y volver a conectarlo.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          <ImportRow
            id="coexistence-import-contacts"
            label="Importar contactos"
            detail="Nombres y números de tu agenda de WhatsApp Business. Solo rellena los que Axi no tenga; nunca pisa un nombre que tu equipo haya escrito."
            state={coexistence.sync.contacts}
            checked={contacts}
            onCheckedChange={setContacts}
            disabled={!contactsPending || submitting}
          />
          <ImportRow
            id="coexistence-import-history"
            label="Importar los chats de los últimos 6 meses"
            detail="Las conversaciones llegan cerradas y ordenadas, sin disparar al agente. Las fotos y audios de más de 14 días no se recuperan: Meta ya no los entrega."
            state={coexistence.sync.history}
            checked={history}
            onCheckedChange={setHistory}
            disabled={!historyPending || submitting}
          />
          <li className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-muted-foreground">
              {nothingPending
                ? "Pedido a la app. Deja WhatsApp Business abierta en el celular: los contactos y los chats irán apareciendo en Axi."
                : "Deja WhatsApp Business abierta en el celular hasta que termine. Puedes seguir usando Axi mientras."}
            </p>
            {!nothingPending && (
              <Button disabled={nothingSelected || submitting} onClick={() => void submit()}>
                {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
                Importar ahora
              </Button>
            )}
          </li>
        </ul>
      )}

      {error !== null && (
        <p role="alert" className="border-t border-border px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

function ImportRow({
  id,
  label,
  detail,
  state,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: string;
  detail: string;
  state: Coexistence["sync"]["contacts"] | Coexistence["sync"]["history"];
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled: boolean;
}) {
  return (
    <li className="flex items-start gap-3 p-4">
      <Checkbox
        id={id}
        checked={state === "pending" ? checked : true}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.currentTarget.checked)}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
      {state !== "pending" && <StatePill state={state} />}
    </li>
  );
}

function StatePill({ state }: { state: string }) {
  const label =
    state === "completed"
      ? "Listo"
      : state === "in_progress"
        ? "Importando"
        : state === "declined"
          ? "Rechazado en la app"
          : "Pedido";
  const tone =
    state === "completed"
      ? "border-transparent bg-success/[0.12] text-success"
      : state === "declined"
        ? "border-transparent bg-warning/[0.12] text-warning"
        : "border-transparent bg-accent-violet/12 text-accent-violet";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tone,
      )}
    >
      {label}
    </span>
  );
}

function formatDeadline(date: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

"use client";

import { useEffect, useRef } from "react";
import {
  Check,
  Circle,
  ExternalLink,
  Info,
  LoaderCircle,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import type { ChannelDTO } from "@/modules/channels/domain/channel";
import type { ChannelProvider } from "@/modules/channels/domain/channel-providers";
import type { EmbeddedSignupPhase } from "@/modules/channels/domain/meta-signup";
import {
  useEmbeddedSignup,
  type EmbeddedSignupError,
} from "@/modules/channels/infrastructure/hooks/use-embedded-signup";
import { ManualCredentialsFallback } from "./ManualCredentialsFallback";
import { MetaPinForm } from "./MetaPinForm";

/**
 * Paso 3: el botón. Un estado visible a la vez.
 *
 * Dos invariantes que no son estéticas:
 *
 * - **El botón nace deshabilitado** y se habilita al llegar a `ready`. Es la
 *   consecuencia visible de D2: `FB.login` tiene que invocarse síncronamente
 *   dentro del handler, así que el SDK se precarga al montar. Si en una revisión
 *   el botón nace habilitado, la regla se rompió y el popup se bloqueará en los
 *   navegadores que más importan.
 * - **El foco vuelve al botón en cada transición terminal.** Cuando el popup se
 *   cierra, el foco estaba en una ventana que ya no existe: sin esto, quien
 *   navega con teclado se queda sin punto de partida.
 */
const IN_PROGRESS: readonly EmbeddedSignupPhase[] = ["preparing", "popup_open", "exchanging"];
const TERMINAL: readonly EmbeddedSignupPhase[] = [
  "cancelled",
  "error",
  "popup_blocked",
  "unavailable",
];

export function EmbeddedSignupButton({
  provider,
  channelName,
  onConnected,
  onManualCreated,
  fallback,
  intro,
}: {
  provider: ChannelProvider;
  channelName: string;
  onConnected: (channel: ChannelDTO) => void;
  /** Alta manual. Solo en el wizard: al reconectar no se crea nada. */
  onManualCreated?: () => void;
  /**
   * Reemplaza el camino manual por otro. Lo usa la reconexión, donde la vía
   * alternativa es ROTAR el token de un canal que ya existe, no crear uno nuevo.
   */
  fallback?: React.ReactNode;
  /** Contexto que va sobre el botón. La reconexión avisa aquí del mismo número. */
  intro?: React.ReactNode;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { phase, error, channel, start, submitPin, submittingPin, reset } = useEmbeddedSignup({
    product: provider.meta_product ?? "whatsapp",
    channelName,
    onConnected,
  });

  useEffect(() => {
    if (TERMINAL.includes(phase)) buttonRef.current?.focus();
  }, [phase]);

  if (phase === "awaiting_pin" && channel !== null) {
    return (
      <MetaPinForm
        channel={channel}
        error={error}
        submitting={submittingPin}
        onSubmit={submitPin}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-5 rounded-lg border border-border p-4 md:p-6">
        {intro}
        <div>{renderAction({ phase, buttonRef, start, reset })}</div>

        {/* Región viva para lo que está EN CURSO: `polite` no interrumpe al
            lector de pantalla en mitad de una frase */}
        <div role="status" aria-live="polite" className="space-y-4">
          {IN_PROGRESS.includes(phase) && renderProgress(phase)}
        </div>

        {/* Y `assertive` para lo terminal: si el intento se cayó, hay que
            interrumpir, porque el usuario está esperando algo que no va a pasar */}
        <div role="alert" aria-live="assertive" className="space-y-4">
          {phase === "popup_blocked" && <PopupBlockedNotice />}
          {phase === "cancelled" && <CancelledNotice />}
          {phase === "error" && <ErrorNotice error={error} />}
          {phase === "unavailable" && <UnavailableNotice error={error} />}
        </div>
      </div>

      {/* El camino alternativo sube a aviso visible cuando el conector no cargó */}
      {fallback ?? (
        <ManualCredentialsFallback
          prominent={phase === "unavailable"}
          onCreated={onManualCreated ?? (() => undefined)}
        />
      )}
    </div>
  );
}

function renderAction({
  phase,
  buttonRef,
  start,
  reset,
}: {
  phase: EmbeddedSignupPhase;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  start: () => void;
  reset: () => void;
}) {
  if (phase === "preparing") {
    return (
      <Button ref={buttonRef} size="lg" disabled>
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        Preparando la conexión…
      </Button>
    );
  }
  if (phase === "popup_open") {
    return (
      <Button ref={buttonRef} size="lg" disabled>
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        Esperando a Meta…
      </Button>
    );
  }
  if (phase === "exchanging") {
    return (
      <Button ref={buttonRef} size="lg" disabled>
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        Activando el canal…
      </Button>
    );
  }
  if (phase === "unavailable") {
    return (
      <Button ref={buttonRef} size="lg" disabled>
        <ExternalLink aria-hidden="true" className="size-4" />
        Conectar con Meta
      </Button>
    );
  }
  // `ready`, `cancelled`, `popup_blocked` y `error` comparten el mismo botón: la
  // salida de todos ellos es volver a abrir el popup, nunca reintentar el `code`
  return (
    <Button
      ref={buttonRef}
      size="lg"
      onClick={() => {
        if (phase !== "ready") reset();
        start();
      }}
    >
      <ExternalLink aria-hidden="true" className="size-4" />
      {phase === "ready" ? "Conectar con Meta" : "Volver a intentar"}
    </Button>
  );
}

function renderProgress(phase: EmbeddedSignupPhase) {
  if (phase === "preparing") {
    return (
      <p className="text-xs text-muted-foreground">
        Un momento: estamos cargando el conector de Meta. El botón se activa en cuanto esté listo.
      </p>
    );
  }

  // Saber cuánto falta reduce el abandono: son los pasos que verá DENTRO del
  // popup, no los nuestros
  const steps = [
    "Eliges el negocio y el número",
    "Meta verifica el número por SMS o llamada",
    "Aceptas los permisos",
    "Activamos el canal",
  ];
  const active = phase === "exchanging" ? 3 : 0;

  return (
    <div className="space-y-3">
      <p>
        {phase === "exchanging"
          ? "Autorización recibida. Ya no necesitas la ventana de Meta."
          : "Completa la autorización en la ventana que se abrió. Si no la ves, revisa detrás de esta."}
      </p>
      <ol className="space-y-1.5">
        {steps.map((label, index) => {
          const done = index < active;
          const current = index === active;
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-2.5 text-sm",
                done || current ? "text-foreground" : "text-muted-foreground",
                current && "font-medium",
              )}
            >
              <span className="grid size-4 shrink-0 place-items-center">
                {done ? (
                  <Check aria-hidden="true" className="size-4 text-success" />
                ) : current ? (
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-primary" />
                ) : (
                  <Circle aria-hidden="true" className="size-3 text-muted-foreground" />
                )}
              </span>
              {label}
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-muted-foreground">
        {phase === "exchanging"
          ? "Esto tarda unos segundos. No cierres esta página."
          : "Puedes cancelar cerrando esa ventana; no se conectará nada."}
      </p>
    </div>
  );
}

function Notice({
  tone,
  icon,
  title,
  children,
}: {
  tone: "warning" | "info" | "danger";
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-md border p-4",
        tone === "warning" && "border-warning/40 bg-warning/[0.09]",
        tone === "info" && "border-info/40 bg-info/[0.08]",
        tone === "danger" && "border-destructive/40 bg-destructive/[0.08]",
      )}
    >
      <span
        className={cn(
          "mt-0.5 shrink-0",
          tone === "warning" && "text-warning",
          tone === "info" && "text-info",
          tone === "danger" && "text-destructive",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 space-y-1.5">
        <p className="font-semibold">{title}</p>
        {children}
      </div>
    </div>
  );
}

function PopupBlockedNotice() {
  return (
    <Notice
      tone="warning"
      icon={<TriangleAlert aria-hidden="true" className="size-4.5" />}
      title="Tu navegador bloqueó la ventana de Meta"
    >
      <p className="text-muted-foreground">
        Busca el aviso de ventanas emergentes en la barra de direcciones y permítelas para esta
        página. Después vuelve a pulsar el botón.
      </p>
      <p className="text-xs text-muted-foreground">
        En Chrome y Edge es un icono a la derecha de la dirección. En Safari, en Preferencias →
        Sitios web → Ventanas emergentes. En Firefox, en la barra amarilla que aparece arriba.
      </p>
    </Notice>
  );
}

function CancelledNotice() {
  return (
    <Notice
      tone="info"
      icon={<Info aria-hidden="true" className="size-4.5" />}
      title="Cerraste la ventana antes de terminar"
    >
      <p className="text-muted-foreground">
        No se conectó nada y no se guardó ningún dato. Puedes volver a intentarlo cuando quieras.
      </p>
    </Notice>
  );
}

function ErrorNotice({ error }: { error: EmbeddedSignupError | null }) {
  return (
    <Notice
      tone="danger"
      icon={<XCircle aria-hidden="true" className="size-4.5" />}
      title="No pudimos conectar el canal"
    >
      <p className="text-muted-foreground">
        {error?.message ?? "Vuelve a intentarlo; la autorización se reinicia desde cero."}
      </p>
      {error !== null && (
        // El código no está para que el usuario lo entienda, sino para que lo
        // cite si escribe a soporte
        <p className="text-xs text-muted-foreground">
          Código de referencia: <span className="font-mono">{error.code}</span>
        </p>
      )}
    </Notice>
  );
}

function UnavailableNotice({ error }: { error: EmbeddedSignupError | null }) {
  return (
    <Notice
      tone="warning"
      icon={<TriangleAlert aria-hidden="true" className="size-4.5" />}
      title="No pudimos abrir el conector de Meta"
    >
      <p className="text-muted-foreground">
        {error?.message ??
          "Suele ser un bloqueador de anuncios o la red de tu empresa. Puedes usar el camino manual de abajo."}
      </p>
    </Notice>
  );
}

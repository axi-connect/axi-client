"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  CircleCheck,
  LoaderCircle,
  Mail,
  MessageCircle,
  Send,
  TriangleAlert,
} from "lucide-react";

import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { useRadioGroup } from "@/core/hooks/use-radio-group";
import { errorMessage } from "@/core/lib/error-messages";
import { formatShortDate } from "@/core/lib/format";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  CHANNEL_LABELS,
  defaultChannel,
  emailAvailability,
  sendFacts,
  whatsappAvailability,
  type ChannelAvailability,
  type DeliveryChannel,
  type DocumentSendOptionsDTO,
  type SendDocumentResultDTO,
  type WhatsappAvailability,
} from "@/modules/documents/domain/delivery";
import type { DocumentDTO } from "@/modules/documents/domain/document";
import {
  getDocumentSendOptions,
  sendDocument,
} from "@/modules/documents/infrastructure/services/documents-service.adapter";
import { PaperMark } from "./PaperMark";

/** Qué se abre: el documento y, si viene de «Reintentar», el canal ya elegido. */
export type SendIntent = { document: DocumentDTO; channel?: DeliveryChannel };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Quien puede configurar plantillas ve el enlace; el resto, a quién pedirlo. */
const TEMPLATES_PERMISSION = "document_templates:manage";
const TEMPLATES_PATH = "/settings/company/documentos";

/**
 * «Enviar» (F9 Cobros; premium P8): dos tarjetas apiladas, una elección, y un
 * resumen de hechos que dice lo MISMO que hará el motor. El servidor calcula el preflight con las fuentes
 * con las que manda; aquí solo se leen sus cuatro ramas de WhatsApp (ventana
 * abierta, fuera con plantilla, fuera sin plantilla, sin canal) y si la ficha
 * tiene correo. La ficha es la única dirección de registro: sin correo allí
 * no hay campo para inventarse uno; con correo, se puede usar otro «solo esta
 * vez» sin tocar la ficha.
 *
 * Controlado con `intent` (como `PaymentReviewDialog`): `null` = cerrado.
 */
export function SendDocumentDialog({
  intent,
  subjectLabel,
  onOpenChange,
  onSent,
  onInFlight,
}: {
  intent: SendIntent | null;
  /** «la reserva JX-0042»: de dónde es el papel. */
  subjectLabel?: string;
  onOpenChange: (open: boolean) => void;
  /** 202: la fila ya dice «Enviando…» con el documento devuelto. */
  onSent: (result: SendDocumentResultDTO) => void;
  /** 409: alguien lo mandó antes; la lista se vuelve a pedir. */
  onInFlight?: () => void;
}) {
  const { hasPermission } = useAuth();
  const { showAlert } = useAlert();
  const canConfigure = hasPermission(TEMPLATES_PERMISSION);
  const [options, setOptions] = useState<DocumentSendOptionsDTO | null>(null);
  const [optionsFailed, setOptionsFailed] = useState(false);
  const [channel, setChannel] = useState<DeliveryChannel | null>(null);
  const [otherEmail, setOtherEmail] = useState(false);
  const [toEmail, setToEmail] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const alive = useRef(true);

  const documentId = intent?.document.id ?? null;
  const preferred = intent?.channel;

  // El preflight se pide al abrir y se descarta si el diálogo se cierra antes.
  useEffect(() => {
    alive.current = true;
    setOptions(null);
    setOptionsFailed(false);
    setChannel(null);
    setOtherEmail(false);
    setToEmail("");
    setInlineError(null);
    if (documentId === null) return;
    const controller = new AbortController();
    getDocumentSendOptions(documentId, controller.signal)
      .then((loaded) => {
        if (!alive.current) return;
        setOptions(loaded);
        setChannel(defaultChannel(loaded, preferred, canConfigure));
      })
      .catch((error: unknown) => {
        if (!alive.current || controller.signal.aborted) return;
        // Sin preflight, las dos tarjetas quedan activas: el servidor revalida al enviar.
        console.error("No se pudo consultar por dónde enviar", error);
        setOptionsFailed(true);
        setChannel(preferred ?? "whatsapp");
      });
    return () => {
      alive.current = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se ancla al documento abierto
  }, [documentId]);

  // Teclado del grupo (patrón ARIA): un tabulador y flechas entre los canales
  // que sirven. Va antes del `return` temprano: es un hook.
  const selectable = (["whatsapp", "email"] as const).filter(
    (which) =>
      optionsFailed ||
      (options !== null &&
        (which === "whatsapp"
          ? whatsappAvailability(options, canConfigure).enabled
          : emailAvailability(options).enabled)),
  );
  const radio = useRadioGroup(selectable, channel, (next) => {
    setChannel(next);
    setInlineError(null);
  });

  if (intent === null) return null;
  const { document } = intent;

  const whatsapp: WhatsappAvailability | null =
    options === null ? null : whatsappAvailability(options, canConfigure);
  const email: ChannelAvailability | null =
    options === null ? null : emailAvailability(options);
  const loading = options === null && !optionsFailed;
  const enabled = (which: DeliveryChannel) =>
    optionsFailed
      ? true
      : which === "whatsapp"
        ? whatsapp?.enabled === true
        : email?.enabled === true;
  const summary = (which: DeliveryChannel) =>
    optionsFailed
      ? "El servidor lo revisa al enviar."
      : ((which === "whatsapp" ? whatsapp?.summary : email?.summary) ?? "");
  const contactName = options?.contact?.display_name ?? null;
  const facts =
    options === null || channel === null ? [] : sendFacts(options, channel);
  const canSubmit = channel !== null && !loading && !submitting;

  async function submit() {
    if (channel === null || submitting) return;
    const other = channel === "email" && otherEmail ? toEmail.trim() : "";
    if (channel === "email" && otherEmail) {
      if (!EMAIL.test(other)) {
        setInlineError("Escribe un correo válido para este envío.");
        return;
      }
    }
    setInlineError(null);
    setSubmitting(true);
    try {
      const result = await sendDocument(document.id, {
        channel,
        ...(other !== "" ? { to_email: other } : {}),
      });
      onOpenChange(false);
      onSent(result);
      // §9.4: el título cabe en la píldora; el dato (número, canal) va al cuerpo.
      showAlert({
        tone: "success",
        title: `${document.type_label} en camino`,
        description: `${document.number} por ${CHANNEL_LABELS[channel]}. Te avisamos aquí si no sale.`,
      });
    } catch (error) {
      if (
        isHttpError(error) &&
        error.is(API_ERROR_CODES.documentContactWithoutEmail)
      ) {
        // Queda abierto: la salida (otro correo, o la ficha) está aquí mismo.
        setInlineError(errorMessage(error));
      } else if (
        isHttpError(error) &&
        error.is(API_ERROR_CODES.documentDeliveryInFlight)
      ) {
        onOpenChange(false);
        onInFlight?.();
        showAlert({
          tone: "info",
          title: "Ya va en camino",
          description: "Alguien lo envió antes. La fila avisa cuando salga.",
        });
      } else {
        showAlert({
          tone: "error",
          title: "No se pudo enviar",
          description: errorMessage(error),
        });
      }
    } finally {
      if (alive.current) setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-0.5 text-left">
          <PaperMark
            typeCode={document.type_code}
            className="row-span-2 mx-1 scale-110"
          />
          <DialogTitle className="font-heading text-2xl leading-tight font-bold tracking-tight">
            Enviar {document.type_label.toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs text-foreground/85">
              {document.number}
            </span>
            {subjectLabel !== undefined ? ` de ${subjectLabel}` : ""}
            {contactName !== null ? (
              <>
                {" · a "}
                <b className="font-medium text-foreground">{contactName}</b>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div role="radiogroup" aria-label="Por dónde" className="grid gap-2">
          {loading ? (
            <>
              <Skeleton className="h-[68px] rounded-2xl" />
              <Skeleton className="h-[68px] rounded-2xl" />
            </>
          ) : (
            (["whatsapp", "email"] as const).map((which) => (
              <ChannelCard
                key={which}
                channel={which}
                checked={channel === which}
                disabled={!enabled(which)}
                summary={summary(which)}
                previous={previousSent(document, which)}
                keyboard={selectable.includes(which) ? radio(which) : undefined}
                onSelect={() => {
                  setChannel(which);
                  setInlineError(null);
                }}
              />
            ))
          )}
        </div>

        {!loading && facts.length > 0 ? (
          <dl className="m-0 rounded-2xl bg-secondary/60 px-4 py-1">
            {facts.map((fact) => (
              <div
                key={fact.label}
                className="flex flex-col gap-0.5 border-t border-border py-2.5 text-[13px] first:border-t-0 sm:flex-row sm:justify-between sm:gap-4"
              >
                <dt className="shrink-0 text-muted-foreground">{fact.label}</dt>
                <dd className="sm:text-right">{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {!loading &&
        channel === "whatsapp" &&
        whatsapp?.notice &&
        whatsapp.notice.tone === "warn" ? (
          <Notice>
            {whatsapp.notice.text}
            {whatsapp.mode === "no_hsm" ? (
              whatsapp.notice.configureLink ? (
                <>
                  {" "}
                  <Link
                    href={TEMPLATES_PATH}
                    className="font-medium text-foreground underline underline-offset-[3px]"
                  >
                    Configurar plantilla
                  </Link>{" "}
                  en Mi empresa › Documentos, o mandarlo por correo.
                </>
              ) : (
                " Quien administra puede configurarla en Mi empresa › Documentos; mientras, mándalo por correo."
              )
            ) : null}
          </Notice>
        ) : null}
        {!loading && channel === null && whatsapp?.mode === "no_hsm" ? (
          <Notice>
            {whatsapp.notice?.text}
            {whatsapp.notice?.configureLink ? (
              <>
                {" "}
                <Link
                  href={TEMPLATES_PATH}
                  className="font-medium text-foreground underline underline-offset-[3px]"
                >
                  Configurar plantilla
                </Link>{" "}
                en Mi empresa › Documentos.
              </>
            ) : null}
          </Notice>
        ) : null}

        {!loading && channel === "email" && enabled("email") ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="inline-flex min-h-6 w-fit items-center gap-1.5 text-[13px] font-medium"
              aria-expanded={otherEmail}
              onClick={() => setOtherEmail((value) => !value)}
            >
              {otherEmail ? (
                <ChevronDown className="size-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-3.5 text-muted-foreground" />
              )}
              Usar otro correo solo esta vez
            </button>
            {otherEmail ? (
              <>
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  aria-label="Otro correo para este envío"
                  placeholder="nombre@empresa.com"
                  value={toEmail}
                  aria-invalid={inlineError !== null}
                  onChange={(event) => {
                    setToEmail(event.target.value);
                    setInlineError(null);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  La ficha del contacto no cambia: este destino es solo para
                  este envío.
                </p>
              </>
            ) : null}
          </div>
        ) : null}

        {inlineError !== null ? (
          <p role="alert" className="text-sm text-destructive">
            {inlineError}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Volver
          </Button>
          <Button onClick={() => void submit()} disabled={!canSubmit}>
            {submitting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {submitting
              ? "Enviando…"
              : channel === null
                ? "Enviar"
                : `Enviar por ${CHANNEL_LABELS[channel]}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** «Ya se envió por correo el 12 sep»: reenviar es legítimo y se dice. */
function previousSent(
  document: DocumentDTO,
  channel: DeliveryChannel,
): string | null {
  const last = document.last_delivery[channel];
  if (last === null || (last.status !== "sent" && last.status !== "delivered"))
    return null;
  const at = last.resolved_at ?? last.queued_at ?? last.created_at;
  return `Ya se envió por ${CHANNEL_LABELS[channel]} el ${formatShortDate(at)}`;
}

function ChannelCard({
  channel,
  checked,
  disabled,
  summary,
  previous,
  keyboard,
  onSelect,
}: {
  channel: DeliveryChannel;
  checked: boolean;
  disabled: boolean;
  summary: string;
  previous: string | null;
  keyboard?: ReturnType<ReturnType<typeof useRadioGroup<DeliveryChannel>>>;
  onSelect: () => void;
}) {
  const Icon = channel === "whatsapp" ? MessageCircle : Mail;
  const label = channel === "whatsapp" ? "WhatsApp" : "Correo";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      {...keyboard}
      onClick={onSelect}
      className={cn(
        "relative grid grid-cols-[36px_minmax(0,1fr)_18px] items-center gap-3 rounded-2xl border border-border bg-background px-3.5 py-3 text-left transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        checked && "border-foreground ring-1 ring-foreground ring-inset",
        disabled && "bg-secondary/50 opacity-60",
      )}
    >
      <span className="grid size-9 place-items-center rounded-xl bg-secondary text-foreground">
        <Icon className="size-[17px]" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[14.5px] font-semibold tracking-[-0.005em]">
          {label}
        </span>
        <span className="mt-0.5 block text-[12.5px] leading-[1.45] text-muted-foreground">
          {summary}
        </span>
        {previous !== null ? (
          <span className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CircleCheck
              aria-hidden="true"
              className="size-3 shrink-0 text-success"
            />
            {previous}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "grid size-[18px] place-items-center rounded-full border-[1.5px] border-border",
          checked && "border-foreground",
        )}
      >
        {checked ? (
          <span className="size-2 rounded-full bg-foreground" />
        ) : null}
      </span>
    </button>
  );
}

/**
 * El aviso de la plantilla que falta es un ESTADO que dura mientras el diálogo
 * está abierto: `Alert` en línea (§9.4), color solo en el icono. Lo que sí va a
 * pasar no es un aviso: son los hechos del resumen (`sendFacts`).
 */
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <Alert variant="warning" className="rounded-xl">
      <TriangleAlert aria-hidden="true" />
      <AlertDescription className="text-[13px] leading-relaxed">
        <span>{children}</span>
      </AlertDescription>
    </Alert>
  );
}

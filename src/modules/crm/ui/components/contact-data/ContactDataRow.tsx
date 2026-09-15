"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, CircleCheck, Pencil, Sparkles, type LucideIcon } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import {
  FIELD_SOURCE_LABELS,
  capturedAtLabel,
  defineFieldHref,
  fieldLabel,
  formatFieldValue,
  isVerified,
  needsReview,
  type ContactDataField,
  type ContactFieldReviewBody,
  type FieldScalar,
} from "@/modules/crm/domain/contact-data";
import { ContactDataRowMenu } from "./ContactDataRowMenu";
import { ContactFieldEditor } from "./ContactFieldEditor";
import { RejectFieldDialog } from "./RejectFieldDialog";
import type { ContactDataVariant } from "./types";

/** Botón fantasma de icono de la fila (Confirmar · Corregir). */
function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7 rounded-full text-muted-foreground hover:text-foreground"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="size-3.5" aria-hidden />
    </Button>
  );
}

function Separator() {
  return (
    <span aria-hidden className="opacity-50">
      ·
    </span>
  );
}

/** Enlace de texto dentro de la línea secundaria («Usar», «Ignorar», «Añadir al formulario»). */
const INLINE_LINK =
  "rounded-sm font-medium text-foreground underline decoration-border underline-offset-[3px] outline-none hover:decoration-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50";

function AiMark({ size }: { size: "card" | "rail" }) {
  return (
    <Sparkles
      className={cn("-mr-0.5 text-accent-violet", size === "card" ? "size-[11px]" : "size-[10px]")}
      aria-hidden
    />
  );
}

/**
 * Línea secundaria: quién · cuándo (· detalle). Una sola línea atenuada, con el
 * punto ámbar delante cuando hay algo por revisar.
 */
function MetaLine({
  field,
  variant,
  actorName,
  canManage,
  busy,
  proposalHidden,
  onUseProposal,
  onIgnoreProposal,
}: {
  field: ContactDataField;
  variant: ContactDataVariant;
  actorName: string | null;
  canManage: boolean;
  busy: boolean;
  proposalHidden: boolean;
  onUseProposal: () => void;
  onIgnoreProposal: () => void;
}) {
  // Una propuesta ignorada deja de contar como pendiente en esta vista.
  const review = needsReview({ ...field, proposal: proposalHidden ? null : field.proposal });
  const parts: React.ReactNode[] = [];
  const push = (node: React.ReactNode) => {
    if (parts.length > 0) parts.push(<Separator key={`sep-${parts.length}`} />);
    parts.push(node);
  };
  const when = field.captured_at === null ? null : capturedAtLabel(field.captured_at);

  if (field.state === "missing" || (field.value === null && field.state !== "invalid")) {
    if (field.attempts > 0) {
      push(
        <span key="who" className="inline-flex items-center gap-1">
          <AiMark size={variant} /> Agente IA
        </span>,
      );
      push(<span key="req">{field.required ? "obligatorio" : "opcional"}</span>);
      push(
        <span key="attempts">
          lo pidió {field.attempts} {field.attempts === 1 ? "vez" : "veces"} sin respuesta
        </span>,
      );
    } else {
      push(<span key="req">{field.required ? "Obligatorio" : "Opcional"}</span>);
      push(<span key="pending">aún no se ha pedido</span>);
    }
  } else {
    if (field.source === "ai_agent") {
      push(
        <span key="who" className="inline-flex items-center gap-1">
          <AiMark size={variant} /> Agente IA
        </span>,
      );
    } else if (field.source === "user") {
      push(<span key="who">{actorName ?? FIELD_SOURCE_LABELS.user}</span>);
    } else if (field.source !== null) {
      push(<span key="who">{FIELD_SOURCE_LABELS[field.source]}</span>);
    }
    if (when !== null && when !== "") push(<span key="when">{when}</span>);

    if (field.state === "invalid") {
      push(
        <span key="invalid">
          {field.raw_value !== null ? `recibió «${field.raw_value}», ` : ""}
          {field.invalid_reason ?? "no es un valor válido"}
        </span>,
      );
    } else if (
      field.source === "ai_agent" &&
      field.raw_value !== null &&
      field.raw_value !== String(field.value)
    ) {
      push(<span key="said">dijo «{field.raw_value}»</span>);
    }
  }

  if (field.proposal !== null && !proposalHidden) {
    push(
      <span key="proposal" className="inline-flex flex-wrap items-center gap-x-1.5">
        <span className="inline-flex items-center gap-1">
          <AiMark size={variant} /> el agente propone «{formatFieldValue(field, field.proposal.value)}»
        </span>
        {canManage && (
          <>
            <button type="button" className={INLINE_LINK} onClick={onUseProposal} disabled={busy}>
              Usar
            </button>
            <button type="button" className={INLINE_LINK} onClick={onIgnoreProposal} disabled={busy}>
              Ignorar
            </button>
          </>
        )}
      </span>,
    );
  }

  if (!field.defined) {
    push(
      <span key="orphan" className="inline-flex flex-wrap items-center gap-x-1.5">
        campo sin definir
        <Link href={defineFieldHref(field.flow)} className={INLINE_LINK}>
          Añadir al formulario
        </Link>
      </span>,
    );
  }

  if (parts.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-1.5 text-muted-foreground",
        variant === "card" ? "mt-px text-xs leading-[1.45]" : "text-[11.5px]",
      )}
    >
      {review && (
        <>
          <span aria-hidden className="mr-0.5 size-1.5 shrink-0 rounded-full bg-warning" />
          <span className="sr-only">Por revisar.</span>
        </>
      )}
      {parts}
    </div>
  );
}

/**
 * Una fila etiqueta → valor con su origen y sus acciones.
 *
 * Reposo: etiqueta muted, valor medium (✓ verde si está verificado), línea
 * secundaria. Hover/focus-within: aparecen Confirmar · Corregir · ⋯ (siempre
 * visibles en pantallas táctiles). Corregir sustituye el valor por el control
 * del tipo; Rechazar pide confirmación en un diálogo.
 */
export function ContactDataRow({
  field,
  variant,
  canManage,
  actorName,
  highlighted,
  onReview,
}: {
  field: ContactDataField;
  variant: ContactDataVariant;
  canManage: boolean;
  /** Nombre del operador que lo escribió («Isabel»); null → «Operador». */
  actorName: string | null;
  /** Acaba de cambiar por WebSocket: se resalta y se apaga solo. */
  highlighted: boolean;
  onReview: (body: ContactFieldReviewBody) => Promise<void>;
}) {
  const { showAlert } = useAlert();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  // F1: «Ignorar» solo oculta la propuesta en esta vista; no hay endpoint para descartarla.
  const [proposalHidden, setProposalHidden] = useState(false);

  const label = fieldLabel(field);
  const hasValue = field.value !== null;
  const verified = isVerified(field);
  const valueText = hasValue ? formatFieldValue(field) : "Sin dato";

  const run = async (body: ContactFieldReviewBody): Promise<boolean> => {
    setBusy(true);
    try {
      await onReview(body);
      return true;
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, `No se pudo actualizar «${label}»`),
        open: true,
      });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const save = async (value: FieldScalar) => {
    if (await run({ value })) setEditing(false);
  };

  const actions =
    canManage && !editing ? (
      <dd
        className={cn(
          "flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:opacity-100 [@media(hover:none)]:opacity-100",
          variant === "card" ? "-mt-1" : "col-start-2 row-start-1 row-span-3 self-center",
        )}
      >
        {hasValue && !verified && (
          <ActionButton
            icon={Check}
            label={`Confirmar ${label}`}
            onClick={() => void run({ action: "confirm" })}
            disabled={busy}
          />
        )}
        <ActionButton
          icon={Pencil}
          label={`Corregir ${label}`}
          onClick={() => setEditing(true)}
          disabled={busy}
        />
        {variant === "card" && hasValue && (
          <ContactDataRowMenu
            fieldLabel={label}
            canRelease={field.protected}
            busy={busy}
            onRelease={() => void run({ action: "release" })}
            onReject={() => setRejectOpen(true)}
          />
        )}
      </dd>
    ) : null;

  const meta = editing ? null : (
    <MetaLine
      field={field}
      variant={variant}
      actorName={actorName}
      canManage={canManage}
      busy={busy}
      proposalHidden={proposalHidden}
      onUseProposal={() => {
        if (field.proposal !== null) void run({ value: field.proposal.value });
      }}
      onIgnoreProposal={() => setProposalHidden(true)}
    />
  );

  const valueNode = editing ? (
    <ContactFieldEditor
      field={field}
      variant={variant}
      busy={busy}
      onSave={(value) => void save(value)}
      onCancel={() => setEditing(false)}
    />
  ) : (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1.5 leading-[1.4] font-medium",
        variant === "card" ? "text-sm" : "text-[13.5px]",
      )}
    >
      <span className={cn("truncate", !hasValue && "font-normal text-muted-foreground")}>
        {valueText}
      </span>
      {verified && (
        <CircleCheck
          className={cn("shrink-0 text-success", variant === "card" ? "size-3.5" : "size-[13px]")}
          role="img"
          aria-label="Verificado"
        />
      )}
    </div>
  );

  return (
    <div
      data-code={field.code}
      className={cn(
        "group relative border-b border-border/50 last:border-b-0 transition-colors duration-1000",
        variant === "card"
          ? "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-5 gap-y-1 py-[11px] md:grid-cols-[180px_minmax(0,1fr)_auto]"
          : "grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 py-[7px]",
        editing && (variant === "card" ? "-mx-3.5 rounded-md border-b-transparent bg-secondary px-3.5 py-3" : "rounded-md bg-secondary px-2"),
        highlighted && !editing && (variant === "card" ? "-mx-3.5 rounded-md bg-accent px-3.5" : "-mx-2 rounded-md bg-accent px-2"),
      )}
    >
      <dt
        className={cn(
          "text-muted-foreground",
          variant === "card"
            ? "col-span-full pt-px text-[13px] leading-[1.4] md:col-span-1"
            : "col-start-1 text-[11.5px] tracking-[.01em]",
          editing && variant === "card" && "md:pt-[7px]",
        )}
      >
        {label}
      </dt>
      {variant === "card" ? (
        <dd className="min-w-0">
          {valueNode}
          {meta}
        </dd>
      ) : (
        <>
          <dd className="col-start-1 min-w-0">{valueNode}</dd>
          {meta !== null && <dd className="col-start-1 min-w-0">{meta}</dd>}
        </>
      )}
      {actions}
      {rejectOpen && (
        <RejectFieldDialog
          open={rejectOpen}
          onOpenChange={setRejectOpen}
          valueLabel={valueText}
          onConfirm={() => void run({ action: "reject" })}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowLeftRight, TriangleAlert } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Avatar } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Modal } from "@/shared/components/ui/modal";
import { FormSkeleton } from "@/shared/components/features/loading";
import {
  contactDisplayName,
  type ContactDTO,
  type DuplicatePairDTO,
} from "@/modules/crm/domain/contact";
import { CONTACT_STAGE_LABELS } from "@/modules/crm/domain/enums";
import {
  getContact,
  mergeContacts,
} from "@/modules/crm/infrastructure/services/contacts-service.adapter";

type ComparisonRow = { label: string; value: (c: ContactDTO) => string | null };

const COMPARISON_ROWS: ComparisonRow[] = [
  { label: "Teléfono", value: (c) => c.phone },
  { label: "Correo", value: (c) => c.email },
  { label: "Ciudad", value: (c) => c.city },
  { label: "Etapa", value: (c) => CONTACT_STAGE_LABELS[c.lifecycle_stage] },
];

/**
 * Fusión de duplicados (C11): comparación lado a lado con elección de ganador
 * (⇄ invierte), aviso IRREVERSIBLE y confirmación tipeando el nombre del
 * perdedor. Tras el merge, el caller navega al 360 del ganador.
 */
export function MergeDialog({
  pair,
  open,
  onOpenChange,
  onMerged,
}: {
  pair: DuplicatePairDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMerged: (winnerId: string) => void;
}) {
  const { showAlert } = useAlert();
  const [contacts, setContacts] = useState<{ a: ContactDTO; b: ContactDTO } | null>(null);
  const [winnerSide, setWinnerSide] = useState<"a" | "b">("a");
  const [confirmation, setConfirmation] = useState("");
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!open) return;
    setContacts(null);
    setWinnerSide("a");
    setConfirmation("");
    Promise.all([getContact(pair.contact_a_id), getContact(pair.contact_b_id)])
      .then(([a, b]) => setContacts({ a, b }))
      .catch((err: unknown) => {
        showAlert({
          tone: "error",
          title: errorMessage(err, "No se pudieron cargar los contactos"),
          open: true,
        });
        onOpenChange(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pair.contact_a_id, pair.contact_b_id]);

  const winner = contacts ? (winnerSide === "a" ? contacts.a : contacts.b) : null;
  const loser = contacts ? (winnerSide === "a" ? contacts.b : contacts.a) : null;
  const loserName = useMemo(() => (loser ? contactDisplayName(loser) : ""), [loser]);
  const confirmed = confirmation.trim().toLowerCase() === loserName.trim().toLowerCase();

  const handleMerge = async () => {
    if (!winner || !loser || !confirmed) return;
    setMerging(true);
    try {
      await mergeContacts(winner.id, loser.id);
      showAlert({ tone: "success", title: "Contactos fusionados", open: true });
      onOpenChange(false);
      onMerged(winner.id);
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo completar la fusión"),
        open: true,
      });
    } finally {
      setMerging(false);
    }
  };

  const column = (contact: ContactDTO, role: "winner" | "loser") => {
    const name = contactDisplayName(contact);
    return (
      <div
        className={cn(
          "min-w-0 flex-1 rounded-xl border p-3",
          role === "winner" ? "border-success/40 bg-success/5" : "border-border",
        )}
      >
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {role === "winner" ? "Se conserva" : "Desaparece"}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Avatar src={contact.avatar_url} alt={name} fallback={name} size={28} />
          <p className="truncate text-sm font-semibold">{name}</p>
        </div>
        <dl className="mt-3 space-y-1.5">
          {COMPARISON_ROWS.map((row) => {
            const value = row.value(contact);
            const other = row.value(role === "winner" ? (loser as ContactDTO) : (winner as ContactDTO));
            const differs = value !== other;
            return (
              <div key={row.label} className="flex items-baseline justify-between gap-2 text-xs">
                <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
                <dd
                  className={cn(
                    "min-w-0 truncate text-right",
                    differs ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {value ?? "—"}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      config={{
        title: "Fusionar contactos",
        description: "Todo lo del perdedor (conversaciones, pedidos, deals, tags) se reasigna al ganador.",
        className: "sm:max-w-xl",
        actions: [],
      }}
    >
      {!contacts || !winner || !loser ? (
        <FormSkeleton fields={4} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-stretch gap-2">
            {column(winner, "winner")}
            <div className="flex flex-col items-center justify-center gap-1">
              <ArrowLeft className="size-4 text-muted-foreground" aria-hidden />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Invertir ganador y perdedor"
                onClick={() => {
                  setWinnerSide((side) => (side === "a" ? "b" : "a"));
                  setConfirmation("");
                }}
              >
                <ArrowLeftRight className="size-4" />
              </Button>
            </div>
            {column(loser, "loser")}
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/8 p-3 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            <p>
              Esta acción es <strong>irreversible</strong>: “{loserName}” desaparecerá y todo su
              historial pasará al ganador.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="merge-confirmation" className="text-xs font-medium text-muted-foreground">
              Escribe el nombre del perdedor para confirmar
            </label>
            <Input
              id="merge-confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={loserName}
              autoComplete="off"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!confirmed || merging}
              onClick={() => void handleMerge()}
            >
              {merging ? "Fusionando…" : "Fusionar contactos"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

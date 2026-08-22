"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CopyCheck } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { TableSkeleton } from "@/shared/components/features/loading";
import {
  DUPLICATE_REASON_LABELS,
  type DuplicatePairDTO,
} from "@/modules/crm/domain/contact";
import { listDuplicates } from "@/modules/crm/infrastructure/services/contacts-service.adapter";
import { MergeDialog } from "@/modules/crm/ui/components/contact-detail/MergeDialog";

/**
 * Duplicados sugeridos (`GET /contacts/duplicates`, determinista, máx 50):
 * pares con motivo + confianza y acción Fusionar (MergeDialog comparativo).
 * `contact.merged` por WS retira en vivo los pares del contacto perdedor.
 */
export default function ContactDuplicatesPage() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { socket } = useSocket("inbox");

  const [pairs, setPairs] = useState<DuplicatePairDTO[] | null>(null);
  const [selected, setSelected] = useState<DuplicatePairDTO | null>(null);

  const load = useCallback(async () => {
    try {
      setPairs(await listDuplicates());
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudieron cargar los duplicados"),
        open: true,
      });
      setPairs([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Merge hecho por otro usuario: fuera los pares que involucren al perdedor.
  useSocketEvent(socket, "contact.merged", (event) => {
    setPairs(
      (prev) =>
        prev?.filter(
          (pair) =>
            pair.contact_a_id !== event.merged_contact_id &&
            pair.contact_b_id !== event.merged_contact_id,
        ) ?? prev,
    );
  });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <Link
          href="/crm/contacts"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Contactos
        </Link>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">Posibles duplicados</h2>
        <p className="text-sm text-muted-foreground">
          Detección determinista por email exacto o nombre similar (máximo 50 pares).
        </p>
      </div>

      {pairs === null ? (
        <TableSkeleton rows={4} showHeader={false} />
      ) : pairs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-background py-20 text-center">
          <CopyCheck className="size-10 text-muted-foreground" aria-hidden />
          <div>
            <p className="font-medium">Sin duplicados aparentes</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tu base de contactos está limpia.
            </p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-background">
          {pairs.map((pair) => (
            <li
              key={`${pair.contact_a_id}-${pair.contact_b_id}`}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {pair.a_name ?? "Sin nombre"}{" "}
                  <span className="font-normal text-muted-foreground">y</span>{" "}
                  {pair.b_name ?? "Sin nombre"}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="secondary">{DUPLICATE_REASON_LABELS[pair.reason]}</Badge>
                  <span
                    className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums"
                    aria-label={`Confianza ${Math.round(pair.confidence * 100)}%`}
                  >
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-info"
                        style={{ width: `${Math.round(pair.confidence * 100)}%` }}
                      />
                    </span>
                    {Math.round(pair.confidence * 100)}%
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => setSelected(pair)}
              >
                Fusionar…
              </Button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <MergeDialog
          pair={selected}
          open={selected !== null}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          onMerged={(winnerId) => {
            void load();
            router.push(`/crm/contacts/${winnerId}`);
          }}
        />
      )}
    </div>
  );
}

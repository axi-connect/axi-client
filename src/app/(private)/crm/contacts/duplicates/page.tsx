"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { Button } from "@/shared/components/ui/button";
import { TableSkeleton } from "@/shared/components/features/loading";
import { EmptyState } from "@/shared/components/features/empty-state";
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
    <div className="mx-auto w-full min-w-0 max-w-4xl space-y-5">
      <div>
        <Link
          href="/crm/contacts"
          className="inline-flex min-h-6 items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Contactos
        </Link>
        <h1 className="mt-3 font-heading text-3xl leading-tight font-bold tracking-tight md:text-4xl">Posibles duplicados</h1>
        <p className="mt-1.5 text-sm text-pretty text-muted-foreground">
          {pairs === null
            ? "Buscando parejas por correo exacto o nombre parecido…"
            : `${pairs.length === 1 ? "1 pareja" : `${pairs.length} parejas`} por correo exacto o nombre parecido. Fusionar deja una sola ficha con todo lo de las dos; nada se fusiona solo.`}
        </p>
      </div>

      {pairs === null ? (
        <TableSkeleton rows={4} showHeader={false} />
      ) : pairs.length === 0 ? (
        <EmptyState
          glyph="uptodate"
          variant="solid"
          title="Sin duplicados aparentes"
          description="Tu base de contactos está limpia."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
          {pairs.map((pair) => (
            <li
              key={`${pair.contact_a_id}-${pair.contact_b_id}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_10rem_auto]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" title={`${pair.a_name ?? "Sin nombre"} y ${pair.b_name ?? "Sin nombre"}`}>
                  {pair.a_name ?? "Sin nombre"}{" "}
                  <span className="font-normal text-muted-foreground">y</span>{" "}
                  {pair.b_name ?? "Sin nombre"}
                </p>
              </div>
              <div className="order-last col-span-2 flex min-w-0 items-center gap-3 sm:order-none sm:col-span-1 sm:flex-col sm:items-stretch sm:gap-1.5">
                <span className="inline-flex h-6 w-fit shrink-0 items-center rounded-full bg-muted px-2.5 text-xs font-medium whitespace-nowrap">
                  {DUPLICATE_REASON_LABELS[pair.reason]}
                </span>
                <span
                  className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted-foreground tabular-nums"
                  aria-label={`Confianza ${Math.round(pair.confidence * 100)}%`}
                >
                  <span aria-hidden className="h-1.5 min-w-10 flex-1 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-foreground" style={{ width: `${Math.round(pair.confidence * 100)}%` }} />
                  </span>
                  {Math.round(pair.confidence * 100)} %
                </span>
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

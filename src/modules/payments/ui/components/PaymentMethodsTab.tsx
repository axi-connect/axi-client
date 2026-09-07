"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Plus } from "lucide-react";
import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/shared/components/features/empty-state";
import type { PaymentMethodDTO } from "@/modules/payments/domain/payment-method";
import {
  deletePaymentMethod,
  listPaymentMethods,
} from "@/modules/payments/infrastructure/services/payment-methods-service.adapter";
import { PaymentMethodCard } from "./PaymentMethodCard";
import { PaymentMethodFormSheet } from "./PaymentMethodFormSheet";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; methods: PaymentMethodDTO[] }
  | { kind: "forbidden" }
  | { kind: "error"; message: string };

/**
 * Pestaña «Medios de pago» de Mi empresa. Autosuficiente: carga, crea, edita y
 * borra (`/payment-methods`, capacidad `sales`). Estado local a propósito —
 * nadie más lee esta lista en vivo y no hay WS (§9). Si el plan no incluye
 * ventas, el backend responde 403 `entitlements/capability_not_granted` y aquí
 * se explica en vez de romper: la pestaña ya no se pinta sin la capacidad, pero
 * la URL directa existe.
 */
export function PaymentMethodsTab() {
  const { showAlert, showModal, closeModal } = useAlert();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [editing, setEditing] = useState<PaymentMethodDTO | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await listPaymentMethods();
      setState({ kind: "ready", methods: [...data].sort((a, b) => a.position - b.position) });
    } catch (error) {
      if (isHttpError(error) && error.is(API_ERROR_CODES.capabilityNotGranted)) {
        setState({ kind: "forbidden" });
        return;
      }
      setState({ kind: "error", message: errorMessage(error, "No se pudieron cargar los medios de pago") });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  const openEdit = (method: PaymentMethodDTO) => {
    setEditing(method);
    setSheetOpen(true);
  };
  const handleDelete = (method: PaymentMethodDTO) => {
    showModal({
      title: "Eliminar medio de pago",
      description: `“${method.label}” dejará de ofrecerse. Los pagos ya reportados conservan su nombre.`,
      actions: [
        { label: "Cancelar", variant: "outline", asClose: true, id: "payment-method-del-cancel" },
        {
          label: "Eliminar",
          variant: "destructive",
          asClose: false,
          id: "payment-method-del-confirm",
          onClick: () => {
            deletePaymentMethod(method.id)
              .then(() => {
                setState((prev) =>
                  prev.kind === "ready" ? { kind: "ready", methods: prev.methods.filter((m) => m.id !== method.id) } : prev,
                );
                showAlert({ tone: "success", title: "Medio de pago eliminado", open: true });
              })
              .catch((error: unknown) =>
                showAlert({ tone: "error", title: errorMessage(error, "No se pudo eliminar"), open: true }),
              )
              .finally(() => closeModal());
          },
        },
      ],
      className: "sm:max-w-md",
    });
  };

  if (state.kind === "forbidden") {
    return (
      <EmptyState
        icon={Lock}
        accent="brand"
        variant="solid"
        title="Tu plan no incluye ventas"
        description="Los medios de pago forman parte del módulo de ventas. Actívalo para que la IA pueda cobrar y registrar comprobantes."
        action={
          <Button asChild className="rounded-full">
            <Link href="/billing">Ver planes</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Medios de pago</h2>
          <p className="text-sm text-muted-foreground">
            Cuentas y formas de pago que la IA comparte al cobrar. Nunca inventa un número: usa exactamente lo que escribas aquí.
          </p>
        </div>
        <Button type="button" className="rounded-full" onClick={openCreate}>
          <Plus className="size-4" aria-hidden />
          Agregar medio de pago
        </Button>
      </div>

      {state.kind === "loading" ? (
        <div className="space-y-3" role="status" aria-busy="true" aria-label="Cargando medios de pago">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : state.kind === "error" ? (
        <p role="alert" className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {state.message}
        </p>
      ) : state.methods.length === 0 ? (
        <EmptyState
          glyph="money"
          title="Aún no hay medios de pago"
          description="Agrega tu Nequi, cuenta bancaria o efectivo contraentrega. La IA los compartirá cuando el cliente pregunte cómo pagar."
          action={
            <Button type="button" variant="outline" className="rounded-full" onClick={openCreate}>
              Agregar medio de pago
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {state.methods.map((method) => (
            <PaymentMethodCard key={method.id} method={method} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <PaymentMethodFormSheet
        open={sheetOpen}
        method={editing}
        onOpenChange={setSheetOpen}
        onSaved={() => void load()}
      />
    </div>
  );
}

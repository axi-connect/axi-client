"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Phone, PhoneIncoming, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DataTable } from "@/shared/components/features/data-table";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { PageHeader } from "@/shared/components/layout/page-header";
import { ProblemAlert } from "../../components/ProblemAlert";
import { sortRows } from "../../lib/sort-rows";
import { toCallNumberRow, type CallNumberRow } from "../../../domain/call-provisioning";
import {
  useCallAccountsQuery,
  useCallNumbersQuery,
} from "../../../infrastructure/api/hooks/use-call-provisioning";
import { CallAccountCard } from "./CallAccountCard";
import { ConnectTwilioSheet } from "./TwilioCredentialsSheets";
import { BuyNumberSheet } from "./BuyNumberSheet";
import { ImportNumberSheet } from "./ImportNumberSheet";
import { ImportCallerIdSheet } from "./ImportCallerIdSheet";
import { callNumberColumns } from "./calls-numbers-table.config";

type NumbersSort = { by: keyof CallNumberRow & string; dir: "asc" | "desc" };

/**
 * /platform/calls — aprovisionamiento de telefonía: la cuenta madre de Twilio
 * (llave cifrada, sonda de salud, caps de gasto) y el inventario de números
 * (comprar → stock → asignar a tenant → liberar). Calco estructural de la
 * feature de proveedores de prospecting.
 */
export function CallsView() {
  const accounts = useCallAccountsQuery();
  const numbers = useCallNumbersQuery();

  const [connecting, setConnecting] = useState(false);
  const [buying, setBuying] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importingCallerId, setImportingCallerId] = useState(false);
  const [sort, setSort] = useState<NumbersSort>({ by: "created_at", dir: "desc" });
  const [page, setPage] = useState(1);

  const account = (accounts.data ?? [])[0] ?? null;
  const canBuy = account !== null && account.enabled;

  const rows = useMemo(
    () => sortRows((numbers.data ?? []).map(toCallNumberRow), sort.by, sort.dir),
    [numbers.data, sort],
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Llamadas"
        description="La cuenta madre de Twilio y el inventario de números. Las llaves y los números los pone axi: el tenant recibe un número asignado y consume su cuota de minutos."
      />

      <section>
        <h2 className="font-heading mb-3 text-base font-bold">Cuenta madre</h2>
        {accounts.isPending ? (
          <TableSkeleton rows={2} />
        ) : accounts.isError ? (
          <ProblemAlert error={accounts.error} onRetry={() => void accounts.refetch()} />
        ) : (accounts.data ?? []).length === 0 ? (
          <EmptyState
            icon={Phone}
            accent="violet"
            title="Twilio no está conectado"
            description="Sin cuenta madre no hay telefonía: conecta la cuenta, enciéndela y compra el primer número. La credencial se valida contra Twilio antes de guardarse."
            action={
              <Button className="rounded-full" onClick={() => setConnecting(true)}>
                <Plus className="size-4" aria-hidden />
                Conectar Twilio
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {(accounts.data ?? []).map((item) => (
              <CallAccountCard key={item.id} account={item} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-bold">Números</h2>
            <p className="text-muted-foreground text-xs">
              Comprar crea una renta mensual en Twilio; el número entra al stock y de ahí se
              asigna a un tenant con su agente.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Importar no exige la cuenta encendida: no crea gasto nuevo */}
            <Button
              variant="outline"
              className="rounded-full"
              disabled={account === null}
              title={account === null ? "Primero conecta la cuenta madre" : undefined}
              onClick={() => setImporting(true)}
            >
              <PhoneIncoming className="size-4" aria-hidden />
              Importar de Twilio
            </Button>
            {/* Identificador verificado: el +57 del negocio como From de las salientes */}
            <Button
              variant="outline"
              className="rounded-full"
              disabled={account === null}
              title={account === null ? "Primero conecta la cuenta madre" : undefined}
              onClick={() => setImportingCallerId(true)}
            >
              <BadgeCheck className="size-4" aria-hidden />
              Importar identificador
            </Button>
            <Button
              className="rounded-full"
              disabled={!canBuy}
              title={canBuy ? undefined : "Necesitas la cuenta madre conectada y ENCENDIDA"}
              onClick={() => setBuying(true)}
            >
              <ShoppingCart className="size-4" aria-hidden />
              Comprar número
            </Button>
          </div>
        </div>

        {numbers.isPending ? (
          <TableSkeleton rows={4} />
        ) : numbers.isError ? (
          <ProblemAlert error={numbers.error} onRetry={() => void numbers.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            accent="violet"
            title="Todavía no hay números"
            description="Compra el primero — o impórtalo si ya lo tienes en Twilio: aparece aquí en stock y luego se asigna al tenant que va a llamar."
            action={
              account !== null ? (
                <Button variant="outline" className="rounded-full" onClick={() => setImporting(true)}>
                  <PhoneIncoming className="size-4" aria-hidden />
                  Importar de Twilio
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DataTable<CallNumberRow>
            data={rows}
            columns={callNumberColumns}
            pagination={{ page, pageSize: 10 }}
            onPageChange={setPage}
            sorting={{ by: sort.by, dir: sort.dir }}
            preferredSearchFields={["phone_number", "company_name"]}
            onSortChange={(by, dir) => setSort({ by, dir })}
          />
        )}
      </section>

      {connecting && <ConnectTwilioSheet onClose={() => setConnecting(false)} />}
      {buying && account !== null && (
        <BuyNumberSheet accountId={account.id} onClose={() => setBuying(false)} />
      )}
      {importing && account !== null && (
        <ImportNumberSheet accountId={account.id} onClose={() => setImporting(false)} />
      )}
      {importingCallerId && account !== null && (
        <ImportCallerIdSheet accountId={account.id} onClose={() => setImportingCallerId(false)} />
      )}
    </div>
  );
}

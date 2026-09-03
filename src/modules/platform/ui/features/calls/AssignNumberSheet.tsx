"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Switch } from "@/shared/components/ui/switch";
import { TenantSelect } from "../../components/TenantSelect";
import type { CallNumberRow } from "../../../domain/call-provisioning";
import {
  useAssignCallNumber,
  useTenantCallAgentsQuery,
} from "../../../infrastructure/api/hooks/use-call-provisioning";

/**
 * Asignar un número a un tenant: empresa + QUIÉN CONTESTA (agente IA activo
 * del tenant destino) + entrantes. Sin agente, la originación fallaría con
 * `no_agent` — por eso el selector es obligatorio.
 */
export function AssignNumberSheet({
  number,
  onClose,
}: {
  number: CallNumberRow;
  onClose: () => void;
}) {
  const assign = useAssignCallNumber();
  // Un identificador de llamada solo se MUESTRA al llamar: no contesta ni tiene
  // agente (el servidor lo rechaza), así que esos campos no se ofrecen.
  const isCallerId = number.kind === "caller_id";
  const [companyId, setCompanyId] = useState<string>(number.company_id ?? "");
  const [agentId, setAgentId] = useState<string>("");
  const [inbound, setInbound] = useState(number.inbound_enabled);
  const [error, setError] = useState<string | null>(null);

  const agents = useTenantCallAgentsQuery(companyId === "" || isCallerId ? null : companyId);

  // Cambiar de empresa invalida el agente elegido: era de la anterior.
  useEffect(() => {
    setAgentId("");
  }, [companyId]);

  const submit = () => {
    setError(null);
    assign.mutate(
      {
        id: number.id,
        company_id: companyId,
        default_ai_agent_id: isCallerId || agentId === "" ? null : agentId,
        inbound_enabled: isCallerId ? false : inbound,
      },
      {
        onSuccess: onClose,
        onError: (caught) => setError(errorMessage(caught, "No se pudo asignar el número")),
      },
    );
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            Asignar <span className="font-mono">{number.phone_number}</span>
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-6">
          <SheetDescription>
            {isCallerId
              ? "Las llamadas salientes del tenant mostrarán este número (su +57) en vez del +1 de Twilio. Solo se muestra al llamar: quien contesta y recibe las entrantes sigue siendo el número Twilio del tenant."
              : "El tenant verá este número como suyo: sus llamadas salen desde él y, si habilitas las entrantes, su agente las contesta."}
          </SheetDescription>

          <div>
            <p className="mb-1 text-sm font-semibold">Empresa</p>
            <TenantSelect
              value={companyId}
              onValueChange={setCompanyId}
              disableSuspended
              className="w-full"
              placeholder="Elige la empresa"
            />
          </div>

          {!isCallerId && (
            <div>
              <p className="mb-1 text-sm font-semibold">Quién contesta</p>
              <Select
                value={agentId === "" ? undefined : agentId}
                onValueChange={setAgentId}
                disabled={companyId === "" || agents.isLoading}
              >
                <SelectTrigger className="w-full" aria-label="Agente que contesta">
                  <SelectValue
                    placeholder={
                      companyId === ""
                        ? "Primero elige la empresa"
                        : agents.isLoading
                          ? "Cargando agentes…"
                          : "Elige el agente IA"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(agents.data ?? []).map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {companyId !== "" && agents.isError && (
                <p className="text-destructive bg-destructive/8 border-destructive/25 mt-1 rounded-md border px-3 py-2 text-xs">
                  {errorMessage(agents.error, "No se pudieron cargar los agentes del tenant")}
                </p>
              )}
              {companyId !== "" && agents.isSuccess && agents.data.length === 0 && (
                <p className="text-warning mt-1 text-xs">
                  Este tenant no tiene agentes IA activos: sin agente, el número no puede llamar ni
                  contestar.
                </p>
              )}
            </div>
          )}

          {!isCallerId && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Llamadas entrantes</p>
                <p className="text-muted-foreground text-xs">
                  El agente contesta cuando alguien llama a este número (atención entrante, F5).
                </p>
              </div>
              <Switch
                checked={inbound}
                onCheckedChange={setInbound}
                aria-label="Habilitar entrantes"
              />
            </div>
          )}

          {error !== null && (
            <p className="text-destructive bg-destructive/8 border-destructive/25 rounded-md border px-3 py-2 text-xs">
              {error}
            </p>
          )}

          <Button
            disabled={assign.isPending || companyId === "" || (!isCallerId && agentId === "")}
            onClick={submit}
          >
            {assign.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            {isCallerId ? "Asignar identificador" : "Asignar número"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

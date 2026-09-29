"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, UsersRound } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { BentoTile, StatePill } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

import {
  BUYING_ROLE_LABELS,
  EVIDENCE_PROVIDER_LABELS,
  PROMOTED_WITH_BUSINESS,
  initialsOf,
  type LeadPersonDTO,
  type RevealCosts,
} from "../../domain/person";
import {
  discardLead,
  getLeadPeople,
  promoteLeads,
  revealLeads,
} from "../../infrastructure/services/prospecting-service.adapter";
import { RevealButtons } from "./RevealButtons";

/**
 * «Personas de este negocio» (tablero 5b).
 *
 * Quién decide, quién recomienda y quién usa, con la fuente que lo atestigua
 * (el registro mercantil, su web, Apollo). Cada persona se revela, se añade al
 * CRM o se omite aquí mismo; y las que deciden o recomiendan se pueden pasar
 * todas de una vez.
 *
 * Presentacional salvo sus propios datos: el padre le avisa con `refreshKey`
 * cuando termina una pasada de «Buscar personas».
 */
export function LeadPeopleSection({
  leadId,
  refreshKey,
  searching,
  costs,
  canManage,
  canPromote,
  onSearch,
  onPeopleChange,
}: {
  leadId: string;
  refreshKey: number;
  searching: boolean;
  costs: RevealCosts;
  canManage: boolean;
  canPromote: boolean;
  onSearch: () => void;
  onPeopleChange?: (people: LeadPersonDTO[]) => void;
}) {
  const { showAlert } = useAlert();
  const [people, setPeople] = useState<LeadPersonDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [waitingPhone, setWaitingPhone] = useState<ReadonlySet<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const result = await getLeadPeople(leadId);
      setPeople(result.items);
      setLoadError(null);
      onPeopleChange?.(result.items);
      setWaitingPhone((current) => {
        const next = new Set(
          [...current].filter((id) => result.items.find((person) => person.id === id)?.phone === null),
        );
        return next.size === current.size ? current : next;
      });
    } catch (caught) {
      setLoadError(errorMessage(caught, "Revisa tu conexión e intenta otra vez."));
    }
  }, [leadId, onPeopleChange]);

  useEffect(() => void load(), [load, refreshKey]);

  // Mientras se espera un celular (llega en minutos), se pregunta cada tanto.
  useEffect(() => {
    if (waitingPhone.size === 0) return;
    const timer = setInterval(() => void load(), 15_000);
    return () => clearInterval(timer);
  }, [waitingPhone, load]);

  async function reveal(person: LeadPersonDTO, fields: ("email" | "phone")[]) {
    setBusyId(person.id);
    try {
      await revealLeads([person.id], fields);
      if (fields.includes("phone")) setWaitingPhone((current) => new Set([...current, person.id]));
      // El correo llega en segundos: se relee enseguida y otra vez al poco.
      setTimeout(() => void load(), 3_000);
    } catch (caught) {
      showAlert({ tone: "error", title: "No se pudo revelar", description: errorMessage(caught) });
    } finally {
      setBusyId(null);
    }
  }

  async function promote(ids: string[]) {
    try {
      const result = await promoteLeads(ids);
      showAlert(
        result.failed.length === 0
          ? {
              tone: "success",
              title: ids.length === 1 ? "Añadida al CRM" : `${String(result.promoted.length)} añadidas al CRM`,
            }
          : { tone: "warning", title: "Algunas no se añadieron", description: result.failed[0]?.reason },
      );
      await load();
    } catch (caught) {
      showAlert({ tone: "error", title: "No se pudo añadir al CRM", description: errorMessage(caught) });
    }
  }

  async function omit(person: LeadPersonDTO) {
    try {
      await discardLead(person.id, "Omitida desde la ficha del negocio");
      await load();
    } catch (caught) {
      showAlert({ tone: "error", title: "No se pudo omitir", description: errorMessage(caught) });
    }
  }

  const promotable = (people ?? []).filter(
    (person) =>
      !person.in_crm &&
      PROMOTED_WITH_BUSINESS.includes(person.buying_role) &&
      (person.email !== null || person.phone !== null),
  );

  return (
    <BentoTile
      label="Personas de este negocio · quién decide, quién recomienda, quién usa"
      aside={
        searching ? (
          <StatePill tone="info">
            <LoaderCircle aria-hidden className="size-3 animate-spin motion-reduce:animate-none" />
            Buscando personas
          </StatePill>
        ) : undefined
      }
      className="gap-3"
    >
      {people === null && loadError === null ? (
        <div className="flex flex-col gap-3" role="status" aria-label="Cargando personas">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : loadError !== null ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-muted-foreground text-sm">No pudimos leer las personas: {loadError}</p>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : people !== null && people.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground text-sm text-pretty">
            {searching
              ? "Estamos preguntando al registro mercantil, a su web y a Apollo."
              : "Aún no buscamos a quién decide aquí. Buscar no gasta créditos: miramos el registro mercantil, su web y Apollo por dominio."}
          </p>
          {canManage && !searching && (
            <Button variant="outline" className="rounded-full" onClick={onSearch}>
              <UsersRound aria-hidden className="size-4" />
              Buscar personas
            </Button>
          )}
        </div>
      ) : (
        <>
          <ul className="divide-border divide-y">
            {(people ?? []).map((person) => (
              <li key={person.id} className="flex flex-wrap items-start gap-3 py-3 first:pt-0">
                <span
                  aria-hidden
                  className="bg-muted text-muted-foreground grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold"
                >
                  {initialsOf(person.display_name)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link
                    href={`/marketing/leads/${person.id}`}
                    className="truncate font-medium hover:underline"
                    title={person.display_name ?? undefined}
                  >
                    {person.display_name ?? "Sin nombre"}
                  </Link>
                  <p className="text-muted-foreground text-xs text-pretty">
                    {person.title !== null && <>{person.title} · </>}
                    <span className="text-foreground font-semibold">{BUYING_ROLE_LABELS[person.buying_role]}</span>
                    {person.decision_maker_confidence !== null && (
                      <span className="tabular-nums"> · confianza {person.decision_maker_confidence}</span>
                    )}
                  </p>
                  {person.evidence_provider !== null && (
                    <span
                      className="bg-muted inline-flex w-fit max-w-full items-center gap-1.5 truncate rounded-full px-2 py-0.5 text-[11px]"
                      title={person.evidence ?? undefined}
                    >
                      <span className="font-semibold">
                        {EVIDENCE_PROVIDER_LABELS[person.evidence_provider] ?? person.evidence_provider}
                      </span>
                      {person.evidence_level === "hypothesis" && <span className="text-muted-foreground">· hipótesis</span>}
                      {person.evidence_url !== null && (
                        <a
                          href={person.evidence_url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-muted-foreground truncate underline-offset-2 hover:underline"
                        >
                          · ver
                        </a>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <RevealButtons
                    target={{
                      id: person.id,
                      masked: person.masked,
                      revealable: person.source === "apollo_people",
                      email: person.email,
                      phone: person.phone,
                      has_email: person.has_email,
                      has_phone: person.has_phone,
                      in_crm: person.in_crm,
                    }}
                    costs={costs}
                    busy={busyId === person.id}
                    waitingPhone={waitingPhone.has(person.id)}
                    disabled={!canManage}
                    onReveal={(fields) => void reveal(person, fields)}
                  />
                  {!person.in_crm && (
                    <div className="flex gap-1">
                      {canPromote && (person.email !== null || person.phone !== null) && (
                        <Button variant="outline" size="sm" className="rounded-full" onClick={() => void promote([person.id])}>
                          Añadir al CRM
                        </Button>
                      )}
                      {canManage && (
                        <Button variant="ghost" size="sm" className="rounded-full" onClick={() => void omit(person)}>
                          Omitir
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <p className="text-muted-foreground max-w-sm text-xs text-pretty">
              Buscar personas no gasta créditos. Revelar sí, de tu saldo en Apollo, y solo si lo encuentra.
            </p>
            {canPromote && promotable.length > 0 && (
              <Button variant="contrast" className="rounded-full" onClick={() => void promote(promotable.map((person) => person.id))}>
                {promotable.length === 1
                  ? "Añadir al CRM a quien decide"
                  : `Añadir las ${String(promotable.length)} que deciden o recomiendan al CRM`}
              </Button>
            )}
          </div>
        </>
      )}
    </BentoTile>
  );
}

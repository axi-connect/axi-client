"use client";

import Link from "next/link";
import { ArrowUpRight, Check, RefreshCw, UserRoundPlus, UserRoundSearch, X } from "lucide-react";

import { BentoTile, StatePill } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";

import {
  decisionMakerEvidence,
  type ContactPointsDTO,
  type DecisionMakerDTO,
} from "../../domain/lead";
import { BUYING_ROLE_LABELS, initialsOf } from "../../domain/person";
import { EmailWay, PhoneWay, WayItem, WayTag } from "./ContactPointList";

/**
 * «Quién decide», lo primero de la ficha de un negocio.
 *
 * Tres estados, y la diferencia entre los dos primeros es la regla de todo el
 * proyecto: un HECHO (lo dice el registro mercantil o lo confirmó alguien del
 * equipo) se nombra; una PISTA (un nombre leído en su sitio web) se enseña
 * «por confirmar», con «Sí, es quien decide» y «No es» a un toque. La mitad de
 * las personas que salen de un sitio no trabajan ahí.
 */
export function LeadDecisionMakerCard({
  decisionMaker,
  points,
  emailVerification,
  canManage,
  canPromote,
  busy,
  searching,
  onSearch,
  onConfirm,
  onDismiss,
  onAddToCrm,
}: {
  decisionMaker: DecisionMakerDTO | null;
  /** Los datos del negocio: con qué llegarle cuando la persona no tiene los suyos. */
  points: ContactPointsDTO;
  emailVerification: "verified" | "undeliverable" | null;
  canManage: boolean;
  canPromote: boolean;
  busy: boolean;
  searching: boolean;
  onSearch: () => void;
  onConfirm: (personId: string) => void;
  onDismiss: (personId: string) => void;
  onAddToCrm: (personId: string) => void;
}) {
  if (decisionMaker === null) {
    return (
      <BentoTile label="Quién decide" aside={<StatePill tone="neutral">Sin identificar</StatePill>}>
        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-3.5 gap-y-2">
          <Avatar>
            <UserRoundSearch aria-hidden className="size-[18px]" />
          </Avatar>
          <div className="min-w-0">
            <p className="text-[17px] leading-tight font-semibold text-pretty">Todavía no sabemos quién decide</p>
            <p className="text-muted-foreground mt-0.5 text-[13px] text-pretty">
              La buscamos en el registro mercantil y en su sitio web.
            </p>
          </div>
          {canManage && (
            <div className="col-span-2 flex flex-wrap gap-2 min-[520px]:col-start-2">
              <Button variant="outline" size="sm" className="rounded-full" disabled={busy || searching} onClick={onSearch}>
                <RefreshCw aria-hidden className="size-3.5" />
                {searching ? "Buscando…" : "Buscar otra vez"}
              </Button>
            </div>
          )}
        </div>
      </BentoTile>
    );
  }

  const personId = decisionMaker.person_id;
  const name = (
    <p className="truncate text-[17px] leading-tight font-semibold" title={decisionMaker.name}>
      {personId === null ? (
        decisionMaker.name
      ) : (
        <Link href={`/marketing/leads/${personId}`} className="hover:underline">
          {decisionMaker.name}
        </Link>
      )}
    </p>
  );

  if (decisionMaker.level === "hypothesis") {
    return (
      <BentoTile label="Quién decide" aside={<StatePill tone="warning">Por confirmar</StatePill>}>
        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-3.5 gap-y-2">
          <Avatar>{initialsOf(decisionMaker.name)}</Avatar>
          <div className="min-w-0">
            {name}
            <p className="text-muted-foreground mt-0.5 text-[13px] text-pretty">
              {decisionMakerEvidence(decisionMaker)}
              {decisionMaker.title === null ? ", sin cargo" : ` · ${decisionMaker.title}`}
            </p>
          </div>
          <p className="col-span-2 flex gap-2.5 text-[13.5px] text-pretty min-[520px]:col-start-2">
            <span aria-hidden className="bg-warning mt-[0.5em] size-2 shrink-0 rounded-full" />
            <span>
              Puede no trabajar aquí: los sitios traen testimonios y textos de plantilla. Mientras no lo confirmes,{" "}
              <span className="font-semibold">no pasa a tu CRM como quien decide</span>.
            </span>
          </p>
          <div className="col-span-2 flex flex-wrap items-center gap-2 min-[520px]:col-start-2">
            {canManage && personId !== null && (
              <>
                <Button variant="outline" size="sm" className="rounded-full" disabled={busy} onClick={() => onConfirm(personId)}>
                  <Check aria-hidden className="size-3.5" />
                  Sí, es quien decide
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full" disabled={busy} onClick={() => onDismiss(personId)}>
                  <X aria-hidden className="size-3.5" />
                  No es
                </Button>
              </>
            )}
            {decisionMaker.evidence_url !== null && (
              <EvidenceLink href={decisionMaker.evidence_url}>ver dónde aparece</EvidenceLink>
            )}
          </div>
        </div>
      </BentoTile>
    );
  }

  // Con qué llegarle: lo suyo si lo tiene; si no, lo principal del negocio.
  const ownWays = decisionMaker.phone !== null || decisionMaker.email !== null;
  const phone = points.phones.find((way) => way.primary) ?? points.phones[0];
  const email = points.emails.find((way) => way.primary) ?? points.emails[0];

  return (
    <BentoTile label="Quién decide" aside={<StatePill tone="success">Confirmada</StatePill>}>
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-3.5 gap-y-2">
        <Avatar>{initialsOf(decisionMaker.name)}</Avatar>
        <div className="min-w-0">
          {name}
          <p className="text-muted-foreground mt-0.5 text-[13px] text-pretty">
            {decisionMaker.title !== null && <>{decisionMaker.title} · </>}
            <span className="text-foreground font-semibold">{BUYING_ROLE_LABELS[decisionMaker.role]}</span>
          </p>
        </div>
        <div className="col-span-2 flex flex-wrap items-center gap-1.5 min-[520px]:col-start-2">
          <span className="text-muted-foreground text-xs">{decisionMakerEvidence(decisionMaker)}</span>
          {decisionMaker.evidence_url !== null && <EvidenceLink href={decisionMaker.evidence_url}>ver</EvidenceLink>}
        </div>
        {(ownWays || phone !== undefined || email !== undefined) && (
          <ul className="border-border col-span-2 mt-1 flex flex-col rounded-2xl border px-3.5 py-0.5 min-[520px]:col-start-2">
            {ownWays ? (
              <>
                {decisionMaker.phone !== null && (
                  <WayItem value={decisionMaker.phone} copyLabel="teléfono" best source={null}>
                    <WayTag>Su teléfono</WayTag>
                  </WayItem>
                )}
                {decisionMaker.email !== null && (
                  <WayItem value={decisionMaker.email} copyLabel="correo" best source={null}>
                    <WayTag>Su correo</WayTag>
                  </WayItem>
                )}
              </>
            ) : (
              <>
                {phone !== undefined && <PhoneWay phone={phone} showPrimary={false} />}
                {email !== undefined && (
                  <EmailWay email={email} verification={emailVerification} showPrimary={false} />
                )}
              </>
            )}
          </ul>
        )}
        {personId !== null && (
          <div className="col-span-2 flex flex-wrap items-center gap-2 min-[520px]:col-start-2">
            {decisionMaker.in_crm ? (
              <span className="text-muted-foreground text-xs">Ya está en tu CRM.</span>
            ) : (
              <>
                {canPromote && ownWays && (
                  <Button variant="outline" size="sm" className="rounded-full" disabled={busy} onClick={() => onAddToCrm(personId)}>
                    <UserRoundPlus aria-hidden className="size-3.5" />
                    Añadir al CRM
                  </Button>
                )}
                {canManage && (
                  <Button variant="ghost" size="sm" className="rounded-full" disabled={busy} onClick={() => onDismiss(personId)}>
                    <X aria-hidden className="size-3.5" />
                    No es
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </BentoTile>
  );
}

function Avatar({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="bg-muted text-muted-foreground grid size-11 shrink-0 place-items-center rounded-full text-[13px] font-semibold"
    >
      {children}
    </span>
  );
}

function EvidenceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="decoration-border hover:decoration-foreground inline-flex min-h-6 items-center gap-1 text-[12.5px] font-medium underline underline-offset-4"
    >
      {children}
      <ArrowUpRight aria-hidden className="size-3.5" />
    </a>
  );
}

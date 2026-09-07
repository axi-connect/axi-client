"use client";

import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { StatusDotBadge } from "@/shared/components/ui/status-badges";
import { coProvinceName } from "@/modules/shipping/domain/co-provinces";
import {
  describeRateCondition,
  describeRatePrice,
  isRestOfCountry,
  RATE_KIND_LABELS,
  type ShippingRateDTO,
  type ShippingZoneDTO,
} from "@/modules/shipping/domain/shipping";

/** Departamentos visibles antes del «+N». */
const MAX_PROVINCE_CHIPS = 5;

/**
 * Una zona con sus tarifas (mockup «Ajustes · Envíos»). `readOnly` bajo
 * gobierno del proveedor: se ve igual, sin lápices ni papeleras.
 */
export function ZoneCard({
  zone,
  readOnly,
  onEditZone,
  onDeleteZone,
  onAddRate,
  onEditRate,
  onDeleteRate,
}: {
  zone: ShippingZoneDTO;
  readOnly: boolean;
  onEditZone: (zone: ShippingZoneDTO) => void;
  onDeleteZone: (zone: ShippingZoneDTO) => void;
  onAddRate: (zone: ShippingZoneDTO) => void;
  onEditRate: (zone: ShippingZoneDTO, rate: ShippingRateDTO) => void;
  onDeleteRate: (zone: ShippingZoneDTO, rate: ShippingRateDTO) => void;
}) {
  const names = zone.province_codes.map(coProvinceName);
  const shown = names.slice(0, MAX_PROVINCE_CHIPS);
  const rest = names.length - shown.length;

  return (
    <article className={cn("rounded-2xl border border-border bg-background", !zone.is_active && "opacity-70")}>
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <MapPin aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <h3 className="text-[0.9375rem] font-semibold">{zone.name}</h3>
          {isRestOfCountry(zone) ? (
            <Badge variant="outline" className="text-muted-foreground">
              {zone.country_code === "CO" ? "Los demás departamentos" : `Todo el país · ${zone.country_code}`}
            </Badge>
          ) : (
            <>
              {shown.map((name) => (
                <Badge key={name} variant="outline">
                  {name}
                </Badge>
              ))}
              {rest > 0 && (
                <Badge variant="outline" className="text-muted-foreground" title={names.slice(MAX_PROVINCE_CHIPS).join(", ")}>
                  +{rest}
                </Badge>
              )}
            </>
          )}
          {!zone.is_active && <StatusDotBadge tone="off">Inactiva</StatusDotBadge>}
        </div>
        {!readOnly && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" aria-label={`Editar zona ${zone.name}`} onClick={() => onEditZone(zone)}>
              <Pencil aria-hidden="true" className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              aria-label={`Eliminar zona ${zone.name}`}
              onClick={() => onDeleteZone(zone)}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          </div>
        )}
      </header>

      <ul className="mt-3 divide-y divide-border/60 border-t border-border/60">
        {zone.rates.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted-foreground">
            Sin tarifas: la IA no puede cotizar esta zona todavía.
          </li>
        )}
        {zone.rates.map((rate) => {
          const price = describeRatePrice(rate);
          const condition = describeRateCondition(rate);
          return (
            <li key={rate.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium", !rate.is_active && "text-muted-foreground line-through")}>
                  {rate.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {condition ?? (rate.kind === "live" ? "Según peso o destino" : "Sin condición")}
                </p>
              </div>
              {rate.kind === "live" ? (
                <StatusDotBadge tone="warning">{RATE_KIND_LABELS.live}</StatusDotBadge>
              ) : null}
              <span className={cn("shrink-0 text-sm font-semibold tabular-nums", !price.known && "font-normal text-muted-foreground")}>
                {price.text}
              </span>
              {!readOnly && (
                <div className="flex gap-0.5">
                  <Button variant="ghost" size="icon" className="size-8" aria-label={`Editar tarifa ${rate.name}`} onClick={() => onEditRate(zone, rate)}>
                    <Pencil aria-hidden="true" className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    aria-label={`Eliminar tarifa ${rate.name}`}
                    onClick={() => onDeleteRate(zone, rate)}
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {!readOnly && (
        <div className="border-t border-border/60 px-2 py-1.5">
          <Button variant="ghost" size="sm" onClick={() => onAddRate(zone)}>
            <Plus aria-hidden="true" className="size-4" />
            Agregar tarifa
          </Button>
        </div>
      )}
    </article>
  );
}

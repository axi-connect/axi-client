"use client";

import { useEffect, useState } from "react";

import { isHttpError } from "@/core/api/problem";
import { useFeatures } from "@/shared/auth/features.hooks";
import type {
  FxSettingsDTO,
  LatestFxRateDTO,
} from "@/modules/payments/domain/fx-settings";
import {
  getFxSettings,
  getLatestFxRate,
} from "@/modules/payments/infrastructure/services/fx-service.adapter";

/** Lo que el pedido necesita para decir «≈ $ X a la tasa de hoy». */
export type IndicativeQuote = {
  /** Moneda en la que se cobra (la de destino). */
  currency: string;
  rate: number;
  valid_from: string;
};

/**
 * La tasa con la que se cotiza HOY, para un importe en `currency` que todavía
 * no está congelado (QA real F3: el pedido en USD sin confirmar no decía a
 * cuántos pesos equivale). Es la misma que usa el agente y la que se congelará
 * al confirmar, así que es indicativa y la pantalla lo dice.
 *
 * `null` —y nada que pintar— si la función `fx_quotes` está apagada, si el
 * negocio apagó «Mostrar el precio en pesos al cotizar», si ya cobra en esa
 * moneda o si no hay tasa. Un 403 es ese mismo silencio; otro fallo, también
 * silencio, pero con rastro.
 */
export function useIndicativeQuote(
  currency: string | null,
  enabled = true,
): IndicativeQuote | null {
  const { loaded, hasFeature } = useFeatures();
  const active =
    enabled && currency !== null && loaded && hasFeature("fx_quotes");
  const [quote, setQuote] = useState<IndicativeQuote | null>(null);

  useEffect(() => {
    if (!active || currency === null) {
      setQuote(null);
      return;
    }
    let alive = true;
    getFxSettings()
      .then(async (settings: FxSettingsDTO) => {
        if (
          !settings.show_indicative_quotes ||
          settings.settlement_currency === currency
        )
          return null;
        const latest: LatestFxRateDTO = await getLatestFxRate(
          currency,
          settings.settlement_currency,
        );
        return latest.effective === null
          ? null
          : {
              currency: settings.settlement_currency,
              rate: latest.effective.rate,
              valid_from: latest.effective.valid_from,
            };
      })
      .then((next) => {
        if (alive) setQuote(next);
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setQuote(null);
        if (!(isHttpError(error) && error.status === 403)) {
          console.error("No se pudo leer la tasa de hoy", error);
        }
      });
    return () => {
      alive = false;
    };
  }, [active, currency]);

  return quote;
}

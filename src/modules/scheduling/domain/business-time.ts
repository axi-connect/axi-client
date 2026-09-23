/**
 * Re-export fino. El helper vive en `core/lib/business-time.ts` desde F3 del
 * método comercial: `commercial` necesitaba la misma aritmética de días
 * (`addDaysToKey` a mediodía UTC, `weekStartKey`, `weekdayOfKey`) y un slice
 * no importa de otro por ruta profunda. Los consumidores de agenda ya importan
 * de `core`; esto queda para su test histórico.
 */
export * from "@/core/lib/business-time";

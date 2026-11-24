"use client";

/**
 * Tarjeta del Inicio: alertas disparadas recientes (misma query key que el
 * contador del menú y la pestaña de Alertas: una sola petición). La regla se
 * lee con su nombre de persona; el código queda en el `title`.
 */
import Link from "next/link";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import { ALERT_RULE_LABELS, humanLabel } from "../../../domain/labels";
import { useAlertsQuery } from "../../../infrastructure/api/hooks/use-analytics";
import { QueryBoundary } from "../../components/QueryBoundary";
import { ListSkeleton, ListTile } from "./parts";

export function RecentAlertsCard() {
  const query = useAlertsQuery("triggered");

  return (
    <ListTile label="Alertas recientes" footNote="Disparadas" footHref="/platform/analytics" footLabel="Ver alertas">
      <QueryBoundary
        query={query}
        isEmpty={(data) => data.data.length === 0}
        loading={<ListSkeleton rows={3} />}
        empty={<p className="py-6 text-center text-sm text-muted-foreground">Sin alertas activas. Todo en orden.</p>}
      >
        {(data) => (
          <ul className="flex flex-col">
            {data.data.slice(0, 5).map((alert) => {
              const rule = humanLabel(ALERT_RULE_LABELS, alert.rule);
              return (
                <li
                  key={alert.id}
                  className="grid grid-cols-[8px_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-0.5 border-t border-border-soft py-2.5 first:border-t-0 first:pt-0"
                >
                  <span aria-hidden="true" className="mt-[0.45rem] size-2 rounded-full bg-warning" />
                  <span className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]" title={rule.code}>
                    {rule.label}
                  </span>
                  <RelativeDate iso={alert.created_at} className="text-xs whitespace-nowrap text-muted-foreground tabular-nums" />
                  <Link
                    href={`/platform/tenants/${alert.company_id}`}
                    prefetch={false}
                    title={alert.company_name ? undefined : alert.company_id}
                    className="col-start-2 block max-w-full truncate rounded-sm text-xs text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {alert.company_name ?? "Empresa sin nombre"}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </QueryBoundary>
    </ListTile>
  );
}

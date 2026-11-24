"use client";

/**
 * Franja de TODO el panel de plataforma cuando un proveedor que paga axi está
 * en crítico: sin saldo, llave inválida o saldo crítico (alerta de saldos,
 * 24-nov; mockup aprobado). Se pega arriba con el aviso de sesión. Un error al
 * pedirla no pinta nada: la franja avisa, no es la fuente de la verdad
 * (Dinero › Saldos muestra el error en su sitio).
 */
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { alertHeadline } from "../../domain/balances";
import { useBalanceAlertsQuery } from "../../infrastructure/api/hooks/use-balances";

export function ProviderBalanceBanner() {
  const { data } = useBalanceAlertsQuery();
  const critical = data?.items.filter((item) => item.level === "critical") ?? [];
  const first = critical[0];
  if (!first) return null;
  const others = critical.length - 1;

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm md:px-8"
    >
      <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-destructive" />
      <p className="min-w-0 flex-[1_1_20rem] text-foreground text-pretty">
        <strong className="font-semibold">{alertHeadline(first)}</strong>{" "}
        <span className="text-foreground/80">
          {first.reason === "low_balance" ? `Si se acaba, ${first.impact}.` : `Mientras siga así, ${first.impact}.`}
        </span>
        {others > 0 ? (
          <span className="text-foreground/80">
            {" "}
            Y {others === 1 ? "1 proveedor más" : `${String(others)} proveedores más`} en crítico.
          </span>
        ) : null}
      </p>
      <Link
        href={`/platform/balances?proveedor=${encodeURIComponent(first.provider)}`}
        className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-background px-4 text-sm font-semibold text-foreground shadow-[var(--shadow-float)] transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
      >
        Ver {first.name}
      </Link>
    </div>
  );
}

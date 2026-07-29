"use client";

import { useRouter } from "next/navigation";
import { DealDetailRail } from "./components/DealDetailRail";

/**
 * Adaptador de ruta → rail (patrón OrderDetailRoute). `back` para la ruta
 * interceptada (el atrás del navegador cierra); `replace` para hard-nav
 * (/crm/pipeline/deal/[id] directo, p.ej. desde una notificación).
 */
export function DealDetailRoute({
  dealId,
  closeBehavior,
}: {
  dealId: string;
  closeBehavior: "back" | "replace";
}) {
  const router = useRouter();

  return (
    <div className="h-full shrink-0 lg:py-4 lg:pr-4">
      <DealDetailRail
        dealId={dealId}
        onClose={() => {
          if (closeBehavior === "back") router.back();
          else router.push("/crm/pipeline");
        }}
      />
    </div>
  );
}

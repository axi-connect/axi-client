import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";

/**
 * Estado como `Badge secondary` + punto (auditoría F0, DESIGN-SYSTEM §2.2): el
 * color es señal REDUNDANTE (el texto ya lo dice), nunca portador de contraste
 * — los tintes «--*-soft» inventados fallaban AA en claro.
 */
export function StatusDotBadge({
  tone,
  children,
  className,
}: {
  tone: "ok" | "off" | "warning";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn("gap-1.5", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full",
          tone === "ok" && "bg-success",
          tone === "warning" && "bg-warning",
          tone === "off" && "bg-muted-foreground/50",
        )}
      />
      {children}
    </Badge>
  );
}

/** Origen «Shopify»: el badge de origen del catálogo, con el punto de la marca. */
export function ShopifyOriginBadge({ className }: { className?: string }) {
  return (
    <Badge variant="secondary" className={cn("gap-1.5", className)}>
      <span aria-hidden="true" className="size-2 rounded-full bg-logo-shopify" />
      Shopify
    </Badge>
  );
}

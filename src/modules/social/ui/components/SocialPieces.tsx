import { cn } from "@/core/lib/utils";
import { ChannelKindIcon } from "@/modules/channels/public";
import { StatePill } from "@/shared/components/features/bento";
import { STATUS_LABELS, type SocialAutomationDTO } from "@/modules/social/domain/social";

/**
 * Piezas chicas de Marketing › Redes. Las filas agrupadas siguen el lenguaje
 * de los editores de Marketing (el de pilotos): grupo con título, filas con la
 * etiqueta a la izquierda y el control a la derecha, nota al pie.
 */
export function Group({
  title,
  foot,
  children,
}: {
  title?: string;
  foot?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {title !== undefined && (
        <p className="text-muted-foreground px-4 pb-0.5 text-[11.5px] font-semibold tracking-[0.06em] uppercase">
          {title}
        </p>
      )}
      {children}
      {foot !== undefined && <p className="text-muted-foreground px-4 text-xs text-pretty">{foot}</p>}
    </div>
  );
}

export function Rows({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "border-border bg-background divide-border flex flex-col divide-y overflow-hidden rounded-2xl border",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Row({
  label,
  hint,
  htmlFor,
  stack = false,
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor?: string;
  stack?: boolean;
  children?: React.ReactNode;
}) {
  const Label = htmlFor === undefined ? "span" : "label";
  return (
    <div
      className={cn(
        "flex min-h-12 min-w-0 gap-3.5 px-4 py-2.5",
        stack ? "flex-col items-stretch gap-2" : "items-center justify-between",
      )}
    >
      <Label
        {...(htmlFor === undefined ? {} : { htmlFor })}
        className={cn("flex min-w-0 flex-col", !stack && "min-w-20 flex-1")}
      >
        <span className="text-sm font-medium">{label}</span>
        {hint !== undefined && <span className="text-muted-foreground text-xs text-pretty">{hint}</span>}
      </Label>
      {children !== undefined && (
        <div className={cn("min-w-0", stack ? "w-full" : "flex shrink items-center justify-end")}>
          {children}
        </div>
      )}
    </div>
  );
}

const STATUS_TONES: Record<SocialAutomationDTO["status"], "success" | "neutral" | "warning"> = {
  active: "success",
  draft: "neutral",
  paused: "warning",
};

export function AutomationStatus({ status }: { status: SocialAutomationDTO["status"] }) {
  return <StatePill tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</StatePill>;
}

/** Instagram o Facebook, con el logo de la marca (§7 del sistema de diseño). */
export function NetworkIcon({
  network,
  className,
}: {
  network: "instagram" | "facebook";
  className?: string;
}) {
  return (
    <ChannelKindIcon
      kind={network === "instagram" ? "instagram_dm" : "facebook_messenger"}
      className={className}
      aria-label={network === "instagram" ? "Instagram" : "Facebook"}
    />
  );
}

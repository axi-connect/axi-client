/**
 * Piezas comunes de las tarjetas del Inicio (rediseño F1): la tarjeta con su
 * pie de «Ver …», la fila de persona/empresa y la silueta de carga.
 */
import { cn } from "@/core/lib/utils";
import { BentoLink } from "@/shared/components/features/bento";
import { Skeleton } from "@/shared/components/ui/skeleton";

/** Una tarjeta de lista del Inicio: etiqueta, contenido y un pie con la nota y el enlace. */
export function ListTile({
  label,
  aside,
  footNote,
  footHref,
  footLabel,
  children,
  className,
}: {
  label: string;
  aside?: React.ReactNode;
  footNote: string;
  footHref: string;
  footLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-4 rounded-3xl border border-border bg-card p-5", className)}>
      <header className="flex min-h-6 flex-wrap items-center justify-between gap-2">
        <h2 className="truncate font-sans text-xs font-normal text-muted-foreground">{label}</h2>
        {aside ? <span className="text-xs text-muted-foreground">{aside}</span> : null}
      </header>
      <div className="min-w-0 flex-1">{children}</div>
      <footer className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">{footNote}</span>
        <BentoLink href={footHref}>{footLabel}</BentoLink>
      </footer>
    </section>
  );
}

/** Inicial(es) en un disco neutro: un solo acento por vista (coral), sin teñir avatares. */
export function Monogram({ text, className }: { text: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground",
        className,
      )}
    >
      {text}
    </span>
  );
}

/** «Norte Studio» → «NS»; «Café Montaña SAS» → «CM». */
export function monogramOf(name: string): string {
  const words = name.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word));
  const letters = words.length >= 2 ? `${words[0]![0]}${words[1]![0]}` : (words[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="flex flex-col gap-4">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}

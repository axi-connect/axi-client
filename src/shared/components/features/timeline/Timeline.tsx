import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";

/**
 * Timeline vertical genérico: lista ordenada con línea conectora, nodo tonal
 * con icono y hasta tres líneas de texto por entrada.
 *
 * Es la ÚNICA implementación del patrón en el proyecto: la consumen el
 * historial 360 del contacto, la actividad del pedido y el rail de contexto
 * del inbox. Es presentacional puro — quién trae los datos, cómo pagina y qué
 * labels usa es responsabilidad del slice.
 */

export type TimelineTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "destructive"
  | "violet";

const TONE_CLASSES: Record<TimelineTone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  info: "bg-info/12 text-info",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  violet: "bg-accent-violet/12 text-accent-violet",
};

export interface TimelineItem {
  /** Clave estable de la entrada (única dentro de la lista). */
  id: string;
  /** Icono del nodo; se renderiza a `size-3.5` para uniformar el ritmo visual. */
  icon: React.ComponentType<{ className?: string }>;
  tone?: TimelineTone;
  /** Línea principal — por convención, la ENTIDAD del evento. */
  title: React.ReactNode;
  /** Línea secundaria opcional: nota, cita textual o detalle largo. */
  description?: React.ReactNode;
  /** Línea de metadatos: fuente, autor, tiempo relativo. */
  meta?: React.ReactNode;
  /** Chip a la derecha del título (p. ej. `<AiBadge />`). */
  badge?: React.ReactNode;
  /**
   * Nodo hueco en vez de relleno: la entrada todavía NO ha ocurrido.
   *
   * El timeline nació como feed de cosas pasadas, donde todo estaba hecho por
   * definición. Un stepper necesita distinguir lo que va a pasar de lo que ya
   * pasó, y un nodo relleno para algo pendiente lo da por hecho.
   */
  pending?: boolean;
  /**
   * Contenido desplegable bajo la entrada.
   *
   * Deja el detalle a un clic sin sacarlo de su sitio: la lista se sigue
   * leyendo de un vistazo y quien quiera saber qué trajo una fuente concreta
   * lo abre ahí mismo. `defaultOpen` para el paso que está corriendo.
   */
  content?: React.ReactNode;
  defaultOpen?: boolean;
}

/**
 * Distintivo de autoría del agente IA. Vive aquí porque el mismo chip aparece
 * en el historial del contacto, en el del deal y en la bandeja de tareas.
 */
export function AiBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 border-accent-violet/40 text-accent-violet", className)}
    >
      <Sparkles className="size-3" aria-hidden />
      IA
    </Badge>
  );
}

export function TimelineSkeleton({
  rows = 3,
  label = "Cargando historial",
  className,
}: {
  rows?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-7 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

/**
 * El detalle de una entrada, plegado por defecto.
 *
 * `<details>` nativo y no un estado en React: trae la accesibilidad y el
 * teclado resueltos, y no obliga a que el Timeline —que es presentacional
 * puro— tenga estado propio ni deje de poder renderizarse en el servidor.
 */
function TimelineDetail({
  defaultOpen,
  children,
}: {
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="group mt-1.5" open={defaultOpen}>
      <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1 text-xs transition-colors">
        <ChevronDown
          aria-hidden
          className="size-3 transition-transform group-open:rotate-180"
        />
        <span className="group-open:hidden">Ver detalle</span>
        <span className="hidden group-open:inline">Ocultar detalle</span>
      </summary>
      <div className="border-border-soft bg-secondary/50 mt-2 rounded-md border p-2.5">
        {children}
      </div>
    </details>
  );
}

export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  if (items.length === 0) return null;

  return (
    <ol className={cn("space-y-0", className)}>
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
            {/* Conectora: se omite en la última entrada para no dejar un cabo suelto */}
            {index < items.length - 1 && (
              <span
                aria-hidden
                className="absolute top-7 left-[13px] h-[calc(100%-1.75rem)] w-px bg-border"
              />
            )}
            <span
              className={cn(
                "z-10 flex size-7 shrink-0 items-center justify-center rounded-full",
                item.pending === true
                  ? "border border-border text-muted-foreground"
                  : TONE_CLASSES[item.tone ?? "neutral"],
              )}
            >
              <Icon className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              {/* El título envuelve en vez de truncar: en rails estrechos
                  (340-380px) recortar deja el evento sin sentido. */}
              <div className="flex flex-wrap items-center gap-x-1.5">
                <p className="min-w-0 text-sm break-words">{item.title}</p>
                {item.badge}
              </div>
              {item.description !== undefined && item.description !== null && (
                <p className="text-xs text-muted-foreground">{item.description}</p>
              )}
              {item.meta !== undefined && item.meta !== null && (
                <p className="text-xs text-muted-foreground">{item.meta}</p>
              )}
              {item.content !== undefined && item.content !== null && (
                <TimelineDetail defaultOpen={item.defaultOpen === true}>
                  {item.content}
                </TimelineDetail>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

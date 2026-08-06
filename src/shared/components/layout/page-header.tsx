import { cn } from "@/core/lib/utils";

type PageHeaderProps = {
  title: React.ReactNode;
  /** Una frase: qué es esta pantalla y para qué sirve. */
  description?: React.ReactNode;
  /** Botones de la derecha. La acción primaria va la última. */
  actions?: React.ReactNode;
  /** `h1` en la raíz de una sección, `h2` en una sub-vista dentro de ella. */
  level?: "h1" | "h2";
  /** Se pinta entre el título y la descripción (badge de estado, contador). */
  badge?: React.ReactNode;
  className?: string;
};

/**
 * Encabezado de página del panel privado: título + descripción + acciones.
 * El patrón estaba copiado a mano en una docena de vistas con tamaños y
 * espaciados que no coincidían; aquí queda una sola versión.
 *
 * La escala es la de DESIGN-SYSTEM §3.2 (H1 `text-3xl`, H2 `text-xl`, ambos
 * `tracking-tight`), y el layout es flex con `gap`: las páginas no añaden
 * márgenes propios entre el encabezado y lo que sigue.
 */
export function PageHeader({
  title,
  description,
  actions,
  level = "h1",
  badge,
  className,
}: PageHeaderProps) {
  const Heading = level;
  return (
    <div
      className={cn("flex flex-wrap items-start justify-between gap-4", className)}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <Heading
            className={cn(
              "tracking-tight font-semibold",
              level === "h1" ? "text-3xl" : "text-xl",
            )}
          >
            {title}
          </Heading>
          {badge}
        </div>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

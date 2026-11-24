"use client";

/**
 * Los cuatro estados de una lectura del panel, en UN sitio (rediseño F1):
 * cargando → silueta; error → `ProblemAlert` con «Reintentar»; vacío → el
 * `EmptyState` que pase la vista; listo → `children(data)`.
 *
 * La regla «error ≠ vacío» la decide `queryView()` (dominio, con tests): un
 * fallo nunca se pinta como «no hay nada». Con datos en pantalla y un refresco
 * fallido, se conservan los datos y se avisa encima.
 */
import { queryView, type QueryLike } from "../../domain/query-view";
import { ProblemAlert } from "./ProblemAlert";

type QueryBoundaryProps<T> = {
  query: QueryLike<T> & { error: unknown; refetch: () => unknown };
  /** Qué cuenta como vacío. Por defecto, nunca (una ficha suelta). */
  isEmpty?: (data: T) => boolean;
  loading: React.ReactNode;
  empty?: React.ReactNode;
  children: (data: T) => React.ReactNode;
  /** Forma del error: franja (`inline`) o ficha (`tile`, con `errorLabel`). */
  errorVariant?: "inline" | "tile";
  errorLabel?: string;
  className?: string;
};

export function QueryBoundary<T>({
  query,
  isEmpty = () => false,
  loading,
  empty = null,
  children,
  errorVariant = "inline",
  errorLabel,
  className,
}: QueryBoundaryProps<T>) {
  const { view, refreshFailed } = queryView(query, isEmpty);
  const retry = () => void query.refetch();

  if (view === "loading") return <>{loading}</>;
  if (view === "error") {
    return (
      <ProblemAlert error={query.error} onRetry={retry} variant={errorVariant} label={errorLabel} className={className} />
    );
  }
  if (view === "empty") return <>{empty}</>;
  return (
    <>
      {refreshFailed ? <ProblemAlert error={query.error} onRetry={retry} className={className} /> : null}
      {children(query.data as T)}
    </>
  );
}

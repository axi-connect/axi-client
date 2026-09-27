"use client";

import { AlertCircle, Search, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import BasicPagination from "@/shared/components/ui/pagination";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Las piezas compartidas de las listas cortas del catálogo (tipos de producto
 * y catálogos, catálogo premium F4): el buscador con «Borrar», el pie con la
 * paginación, la silueta y el error en línea.
 */

export function ListSearch({ value, onChange, placeholder, label }: { value: string; onChange: (next: string) => void; placeholder: string; label: string }) {
  return (
    <div className="relative min-w-0 flex-1 basis-56 sm:max-w-xs">
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={value ? "h-9 rounded-full pr-9 pl-9" : "h-9 rounded-full pl-9"}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Borrar la búsqueda"
          className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function ListFooter({
  summary,
  page,
  pages,
  onPage,
}: {
  summary: string;
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
      <span className="text-xs text-muted-foreground tabular-nums">{summary}</span>
      {pages > 1 ? <BasicPagination totalPages={pages} page={page} onPageChange={onPage} /> : null}
    </div>
  );
}

export function ListSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-4 py-2">
      {["58%", "44%", "66%"].map((width) => (
        <div key={width} className="flex items-center gap-4">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 rounded-md" style={{ width }} />
            <Skeleton className="h-2.5 w-1/3 rounded-md" />
          </div>
          <Skeleton className="hidden h-6 w-40 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}

export function ListLoadError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertCircle aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <Button variant="outline" size="sm" className="mt-2 rounded-full px-4 text-foreground" onClick={onRetry}>
          Reintentar
        </Button>
      </AlertDescription>
    </Alert>
  );
}

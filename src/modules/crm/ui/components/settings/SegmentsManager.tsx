"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Download, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useAuth } from "@/shared/auth/auth.hooks";
import { exportContactsUrl } from "@/modules/crm/infrastructure/services/imports-service.adapter";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { TableSkeleton } from "@/shared/components/features/loading";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  compactSegmentFilters,
  segmentFilterChips,
  type SegmentContactDTO,
  type SegmentDTO,
  type SegmentFilters,
  type TagDTO,
} from "@/modules/crm/domain/segment";
import { AudienceFilterBuilder } from "@/modules/crm/ui/components/segments/AudienceFilterBuilder";
import { BulkFollowUpButton } from "@/modules/crm/ui/components/BulkFollowUpButton";
import { EnrollInSequenceButton } from "@/modules/crm/ui/components/EnrollInSequenceButton";
import {
  createSegment,
  deleteSegment,
  listSegmentContacts,
  listSegments,
  listTags,
  updateSegment,
} from "@/modules/crm/infrastructure/services/segments-service.adapter";

/** Builder del DSL: SOLO las claves del zod backend (claves extrañas → 400). */
function SegmentBuilder({
  segment,
  tags,
  onDone,
  onCancel,
}: {
  segment: SegmentDTO | null;
  tags: TagDTO[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const { showAlert } = useAlert();
  const initial = (segment?.filters ?? {}) as SegmentFilters;
  const [name, setName] = useState(segment?.name ?? "");
  const [description, setDescription] = useState(segment?.description ?? "");
  const [filters, setFilters] = useState<SegmentFilters>(initial);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showAlert({ tone: "error", title: "Ponle un nombre al segmento" });
      return;
    }
    setSaving(true);
    try {
      const dto = {
        name: trimmed,
        description: description.trim() || null,
        filters: compactSegmentFilters(filters),
      };
      if (segment !== null) await updateSegment(segment.id, dto);
      else await createSegment(dto);
      showAlert({ tone: "success", title: segment !== null ? "Segmento actualizado" : "Segmento creado" });
      onDone();
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo guardar el segmento") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="@container space-y-4 rounded-3xl border border-border bg-card p-5">
      <h2 className="truncate font-heading text-base font-bold">
        {segment !== null ? `Editar «${segment.name}»` : "Nuevo segmento"}
      </h2>

      <div className="grid gap-3">
        <div className="space-y-1.5">
          <label htmlFor="seg-name" className="text-xs font-medium text-muted-foreground">Nombre</label>
          <Input id="seg-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Leads calientes" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="seg-desc" className="text-xs font-medium text-muted-foreground">Descripción (opcional)</label>
          <Input id="seg-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Lead con score alto listo para llamar" />
        </div>

      </div>

      <AudienceFilterBuilder
        value={filters}
        onChange={setFilters}
        tags={tags}
        idPrefix="seg"
      />

      <div className="flex justify-end gap-2">
        <Button variant="ghost" className="rounded-full" onClick={onCancel}>Cancelar</Button>
        <Button className="rounded-full" disabled={saving} onClick={() => void handleSave()}>
          {saving ? "Guardando…" : "Guardar segmento"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Ficha de segmento (lienzo CRM premium F4): nombre y cuántos contactos cumple
 * HOY (`GET :id/contacts` con una fila: basta el `meta.total`), los filtros en
 * chips y lo que se hace con él. La vista previa de cinco sigue a un clic.
 */
function SegmentCard({
  segment,
  tags,
  onEdit,
  onDelete,
}: {
  segment: SegmentDTO;
  tags: TagDTO[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { showAlert } = useAlert();
  const { hasPermission } = useAuth();
  const canExport = hasPermission("contacts:export");
  const [expanded, setExpanded] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [preview, setPreview] = useState<SegmentContactDTO[] | null>(null);
  const chips = segmentFilterChips(segment.filters as SegmentFilters, tags);

  useEffect(() => {
    let alive = true;
    listSegmentContacts(segment.id, { page: 1, page_size: 1 })
      .then((res) => {
        if (alive) setTotal(res.meta.total);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [segment.id, segment.updated_at]);

  const handleExport = () => {
    window.open(exportContactsUrl({ segment_id: segment.id }), "_blank");
    showAlert({
      tone: "info",
      title: "Exportación iniciada — esta descarga queda auditada",
    });
  };

  const togglePreview = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && preview === null) {
      listSegmentContacts(segment.id, { page: 1, page_size: 5 })
        .then((res) => {
          setTotal(res.meta.total);
          setPreview(res.data);
        })
        .catch((err: unknown) => {
          showAlert({ tone: "error", title: errorMessage(err, "No se pudo ejecutar el segmento") });
          setExpanded(false);
        });
    }
  };

  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-3xl border border-border bg-card p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-heading text-base font-bold" title={segment.name}>
            {segment.name}
          </h3>
          {segment.description && (
            <p className="truncate text-xs text-muted-foreground" title={segment.description}>
              {segment.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            {total === null ? (
              <Skeleton className="h-6 w-10 rounded-md" />
            ) : (
              <span className="font-heading text-2xl leading-none font-bold tabular-nums">{total}</span>
            )}
            <span className="text-xs text-muted-foreground">{total === 1 ? "contacto" : "contactos"}</span>
          </div>
          <span className="-mr-2 flex items-center">
            {canExport && (
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-full"
                aria-label={`Exportar ${segment.name} a CSV`}
                onClick={handleExport}
              >
                <Download className="size-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="size-9 rounded-full" aria-label={`Editar ${segment.name}`} onClick={onEdit}>
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-full text-muted-foreground hover:text-destructive"
              aria-label={`Eliminar ${segment.name}`}
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
            </Button>
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap gap-1.5">
        {chips.length === 0 ? (
          <span className="inline-flex h-7 items-center rounded-full border border-border px-3 text-xs text-muted-foreground">
            Todos los contactos
          </span>
        ) : (
          chips.map((chip) => (
            <span
              key={chip.label}
              title={`${chip.label}: ${chip.value}`}
              className="inline-flex h-7 max-w-full min-w-0 items-center gap-1 rounded-full border border-border px-3 text-xs"
            >
              <span className="shrink-0 text-muted-foreground">{chip.label}</span>
              <span className="truncate font-medium">{chip.value}</span>
            </span>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
        {/* F4a: el segmento deja de ser solo una lista que se mira. Se
            resuelve AL PROGRAMAR: los que entren después no reciben nada de
            ese lote — para eso están las secuencias. */}
        <BulkFollowUpButton
          audience={{ source: "segment", segment_id: segment.id }}
          audienceLabel={`Del segmento «${segment.name}»`}
          label="Poner al agente a trabajar"
          variant="outline"
        />
        <EnrollInSequenceButton audience={{ source: "segment", segment_id: segment.id }} />
        <button
          type="button"
          onClick={togglePreview}
          aria-expanded={expanded}
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium hover:bg-muted"
        >
          <Users className="size-3.5" aria-hidden />
          Ver contactos
          <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} aria-hidden />
        </button>
      </div>

      {expanded && preview !== null && (
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {preview.length === 0 ? (
            <li className="px-3 py-2.5 text-xs text-muted-foreground">Ningún contacto cumple los filtros.</li>
          ) : (
            preview.map((contact) => (
              <li key={contact.id} className="flex min-w-0 items-center justify-between gap-2 px-3 py-2.5 text-xs">
                <span className="min-w-0 truncate font-medium">{contact.full_name ?? contact.phone ?? contact.email ?? "Sin nombre"}</span>
                <span className="shrink-0 text-muted-foreground">{contact.city ?? ""}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </li>
  );
}

export function SegmentsManager() {
  const { showAlert, showModal, closeModal } = useAlert();
  const [segments, setSegments] = useState<SegmentDTO[] | null>(null);
  const [tags, setTags] = useState<TagDTO[]>([]);
  /** null = builder cerrado; "new" = crear; SegmentDTO = editar. */
  const [editing, setEditing] = useState<SegmentDTO | "new" | null>(null);

  const load = () => {
    Promise.all([listSegments(), listTags().catch(() => [] as TagDTO[])])
      .then(([segmentsRes, tagsRes]) => {
        setSegments(segmentsRes);
        setTags(tagsRes);
      })
      .catch((err: unknown) => {
        showAlert({ tone: "error", title: errorMessage(err, "No se pudieron cargar los segmentos") });
        setSegments([]);
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = (segment: SegmentDTO) => {
    showModal({
      title: "Eliminar segmento",
      description: `¿Eliminar “${segment.name}”? Los contactos no se ven afectados.`,
      actions: [
        { label: "Cancelar", variant: "outline", asClose: true, id: "seg-del-cancel" },
        {
          label: "Eliminar",
          variant: "destructive",
          asClose: false,
          id: "seg-del-confirm",
          onClick: () => {
            deleteSegment(segment.id)
              .then(() => {
                setSegments((prev) => prev?.filter((item) => item.id !== segment.id) ?? prev);
                showAlert({ tone: "success", title: "Segmento eliminado" });
              })
              .catch((err: unknown) =>
                showAlert({ tone: "error", title: errorMessage(err, "No se pudo eliminar") }),
              )
              .finally(() => closeModal());
          },
        },
      ],
      className: "sm:max-w-md",
    });
  };

  if (segments === null) return <TableSkeleton rows={4} showHeader={false} />;

  return (
    <div className="@container min-w-0">
      <div className="grid min-w-0 items-start gap-4 @min-[60rem]:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
        <section className="min-w-0 space-y-3" aria-label="Segmentos">
          <p className="px-1 text-xs text-muted-foreground">
            {segments.length} {segments.length === 1 ? "segmento" : "segmentos"} · se recalculan solos cuando cambian los contactos
          </p>
          {segments.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-border px-5 py-8 text-center text-sm text-pretty text-muted-foreground">
              Sin segmentos todavía. Un segmento guarda un filtro de contactos para ponerlo a trabajar, inscribirlo en una
              secuencia o exportarlo.
            </p>
          ) : (
            <ul className="space-y-3">
              {segments.map((segment) => (
                <SegmentCard
                  key={segment.id}
                  segment={segment}
                  tags={tags}
                  onEdit={() => setEditing(segment)}
                  onDelete={() => handleDelete(segment)}
                />
              ))}
            </ul>
          )}
        </section>

        <div className="min-w-0 @min-[60rem]:sticky @min-[60rem]:top-4">
          {editing !== null ? (
            <SegmentBuilder
              key={editing === "new" ? "new" : editing.id}
              segment={editing === "new" ? null : editing}
              tags={tags}
              onDone={() => {
                setEditing(null);
                load();
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-3xl border border-dashed border-border p-5">
              <h2 className="font-heading text-base font-bold">Nuevo segmento</h2>
              <p className="text-sm text-pretty text-muted-foreground">
                Elige quién entra con filtros; el segmento se mantiene al día solo.
              </p>
              <Button variant="outline" className="rounded-full" onClick={() => setEditing("new")}>
                <Plus className="size-4" />
                Nuevo segmento
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

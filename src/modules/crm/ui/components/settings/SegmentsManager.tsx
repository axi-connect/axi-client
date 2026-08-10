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
import {
  compactSegmentFilters,
  describeSegmentFilters,
  type SegmentContactDTO,
  type SegmentDTO,
  type SegmentFilters,
  type TagDTO,
} from "@/modules/crm/domain/segment";
import { AudienceFilterBuilder } from "@/modules/crm/ui/components/segments/AudienceFilterBuilder";
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
      showAlert({ tone: "error", title: "Ponle un nombre al segmento", open: true });
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
      showAlert({ tone: "success", title: segment !== null ? "Segmento actualizado" : "Segmento creado", open: true });
      onDone();
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo guardar el segmento"), open: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-primary/30 bg-background p-4 md:p-6">
      <h3 className="text-base font-semibold">
        {segment !== null ? `Editar “${segment.name}”` : "Nuevo segmento"}
      </h3>

      <div className="grid gap-3 md:grid-cols-2">
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
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button disabled={saving} onClick={() => void handleSave()}>
          {saving ? "Guardando…" : "Guardar segmento"}
        </Button>
      </div>
    </div>
  );
}

/** Card de segmento con vista previa expandible (`GET :id/contacts`). */
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
  const [preview, setPreview] = useState<{ total: number; rows: SegmentContactDTO[] } | null>(null);

  const handleExport = () => {
    window.open(exportContactsUrl({ segment_id: segment.id }), "_blank");
    showAlert({
      tone: "info",
      title: "Exportación iniciada — esta descarga queda auditada",
      open: true,
    });
  };

  const togglePreview = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && preview === null) {
      listSegmentContacts(segment.id, { page: 1, page_size: 5 })
        .then((res) => setPreview({ total: res.meta.total, rows: res.data }))
        .catch((err: unknown) => {
          showAlert({ tone: "error", title: errorMessage(err, "No se pudo ejecutar el segmento"), open: true });
          setExpanded(false);
        });
    }
  };

  return (
    <li className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{segment.name}</p>
          {segment.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{segment.description}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {describeSegmentFilters(segment.filters as SegmentFilters, tags)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {canExport && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={`Exportar ${segment.name} a CSV`}
              onClick={handleExport}
            >
              <Download className="size-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="size-7" aria-label={`Editar ${segment.name}`} onClick={onEdit}>
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            aria-label={`Eliminar ${segment.name}`}
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <button
        type="button"
        onClick={togglePreview}
        aria-expanded={expanded}
        className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand transition-colors hover:opacity-80"
      >
        <Users className="size-3.5" aria-hidden />
        {preview !== null ? `${preview.total} contactos` : "Ver contactos"}
        <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} aria-hidden />
      </button>

      {expanded && preview !== null && (
        <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
          {preview.rows.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">Ningún contacto cumple los filtros.</li>
          ) : (
            preview.rows.map((contact) => (
              <li key={contact.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
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
        showAlert({ tone: "error", title: errorMessage(err, "No se pudieron cargar los segmentos"), open: true });
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
                showAlert({ tone: "success", title: "Segmento eliminado", open: true });
              })
              .catch((err: unknown) =>
                showAlert({ tone: "error", title: errorMessage(err, "No se pudo eliminar"), open: true }),
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
    <div className="space-y-4">
      {editing !== null ? (
        <SegmentBuilder
          segment={editing === "new" ? null : editing}
          tags={tags}
          onDone={() => {
            setEditing(null);
            load();
          }}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <Button variant="outline" className="rounded-full" onClick={() => setEditing("new")}>
          <Plus className="size-4" />
          Nuevo segmento
        </Button>
      )}

      {segments.length === 0 && editing === null ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Sin segmentos todavía. Un segmento guarda un filtro de contactos para reutilizarlo y exportarlo.
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
    </div>
  );
}

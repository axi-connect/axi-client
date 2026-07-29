"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { TableSkeleton } from "@/shared/components/features/loading";
import type { TagDTO } from "@/modules/crm/domain/segment";
import {
  createTag,
  deleteTag,
  listTags,
  updateTag,
} from "@/modules/crm/infrastructure/services/segments-service.adapter";

/**
 * CRUD de etiquetas (gate crm:manage). El POST/PATCH devuelven la lista
 * completa — el estado siempre es la verdad del backend. El delete es HARD
 * (limpia los joins con contactos): se confirma con el contador a la vista.
 */
function TagRow({
  tag,
  onSaved,
  onDelete,
}: {
  tag: TagDTO;
  onSaved: (tags: TagDTO[]) => void;
  onDelete: (tag: TagDTO) => void;
}) {
  const { showAlert } = useAlert();
  const [name, setName] = useState(tag.name);

  useEffect(() => setName(tag.name), [tag.name]);

  const patch = (dto: { name?: string; color?: string | null }) => {
    updateTag(tag.id, dto)
      .then(onSaved)
      .catch((err: unknown) =>
        showAlert({ tone: "error", title: errorMessage(err, "No se pudo guardar la etiqueta"), open: true }),
      );
  };

  return (
    <li className="flex items-center gap-2.5 px-4 py-2.5">
      <input
        type="color"
        value={tag.color ?? "#a1a1aa"}
        onChange={(e) => patch({ color: e.target.value })}
        aria-label={`Color de ${tag.name}`}
        className="size-7 shrink-0 cursor-pointer rounded-md border border-input bg-background p-0.5"
      />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          const trimmed = name.trim();
          if (trimmed && trimmed !== tag.name) patch({ name: trimmed });
          else setName(tag.name);
        }}
        maxLength={40}
        className="h-8 max-w-56"
        aria-label="Nombre de la etiqueta"
      />
      <span className="text-xs text-muted-foreground tabular-nums">
        {tag.contact_count} contacto{tag.contact_count === 1 ? "" : "s"}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="ml-auto size-7 text-muted-foreground hover:text-destructive"
        aria-label={`Eliminar etiqueta ${tag.name}`}
        onClick={() => onDelete(tag)}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </li>
  );
}

export function TagsManager() {
  const { showAlert, showModal, closeModal } = useAlert();
  const [tags, setTags] = useState<TagDTO[] | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    listTags()
      .then(setTags)
      .catch((err: unknown) => {
        showAlert({ tone: "error", title: errorMessage(err, "No se pudieron cargar las etiquetas"), open: true });
        setTags([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = (tag: TagDTO) => {
    showModal({
      title: "Eliminar etiqueta",
      description: `“${tag.name}” se quitará de sus ${tag.contact_count} contacto${tag.contact_count === 1 ? "" : "s"}. Esta acción no se puede deshacer.`,
      actions: [
        { label: "Cancelar", variant: "outline", asClose: true, id: "tag-del-cancel" },
        {
          label: "Eliminar",
          variant: "destructive",
          asClose: false,
          id: "tag-del-confirm",
          onClick: () => {
            deleteTag(tag.id)
              .then(() => {
                setTags((prev) => prev?.filter((item) => item.id !== tag.id) ?? prev);
                showAlert({ tone: "success", title: "Etiqueta eliminada", open: true });
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

  if (tags === null) return <TableSkeleton rows={4} showHeader={false} />;

  return (
    <div className="space-y-3">
      {tags.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Aún no hay etiquetas. Crea la primera para clasificar tus contactos.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-background">
          {tags.map((tag) => (
            <TagRow key={tag.id} tag={tag} onSaved={setTags} onDelete={handleDelete} />
          ))}
        </ul>
      )}

      <form
        className="flex items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          const name = newName.trim();
          if (!name) return;
          createTag({ name })
            .then((fresh) => {
              setTags(fresh);
              setNewName("");
            })
            .catch((err: unknown) =>
              showAlert({ tone: "error", title: errorMessage(err, "No se pudo crear la etiqueta"), open: true }),
            );
        }}
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nueva etiqueta…"
          maxLength={40}
          className="h-9 max-w-60"
          aria-label="Nombre de la nueva etiqueta"
        />
        <Button type="submit" size="sm" variant="outline" className="rounded-full">
          <Plus className="size-3.5" />
          Crear
        </Button>
      </form>
    </div>
  );
}

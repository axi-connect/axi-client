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
  maxCount,
  onSaved,
  onDelete,
}: {
  tag: TagDTO;
  /** El que más contactos tiene: la barra es relativa a él. */
  maxCount: number;
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
        showAlert({ tone: "error", title: errorMessage(err, "No se pudo guardar la etiqueta") }),
      );
  };

  const color = tag.color ?? "#a1a1aa";
  const share = maxCount > 0 ? tag.contact_count / maxCount : 0;

  return (
    <li className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-x-2 gap-y-1.5 border-t border-border px-3 py-2 first:border-t-0 @min-[36rem]:grid-cols-[2.25rem_minmax(0,1fr)_minmax(8rem,14rem)_2.25rem] @min-[36rem]:px-4">
      {/* El color como punto: el input nativo encima, invisible (objetivo de 36 px). */}
      <label className="relative grid size-9 cursor-pointer place-items-center rounded-full hover:bg-muted">
        <span aria-hidden className="size-3 rounded-full ring-1 ring-foreground/10" style={{ backgroundColor: color }} />
        <input
          type="color"
          value={color}
          onChange={(e) => patch({ color: e.target.value })}
          aria-label={`Color de ${tag.name}`}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          const trimmed = name.trim();
          if (trimmed && trimmed !== tag.name) patch({ name: trimmed });
          else setName(tag.name);
        }}
        maxLength={40}
        title={name}
        className="h-9 min-w-0 rounded-xl border-transparent bg-transparent shadow-none hover:border-input focus-visible:border-input"
        aria-label="Nombre de la etiqueta"
      />
      <Button
        variant="ghost"
        size="icon"
        className="size-9 rounded-full text-muted-foreground hover:text-destructive @min-[36rem]:order-last"
        aria-label={`Eliminar etiqueta ${tag.name}`}
        onClick={() => onDelete(tag)}
      >
        <Trash2 className="size-4" />
      </Button>
      <span className="col-span-full grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pl-[2.75rem] @min-[36rem]:col-span-1 @min-[36rem]:pl-0">
        <span aria-hidden className="h-2 overflow-hidden rounded-full bg-muted">
          <span className="block h-full rounded-full" style={{ width: `${String(Math.round(share * 100))}%`, backgroundColor: color }} />
        </span>
        <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
          {tag.contact_count} contacto{tag.contact_count === 1 ? "" : "s"}
        </span>
      </span>
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
        showAlert({ tone: "error", title: errorMessage(err, "No se pudieron cargar las etiquetas") });
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
                showAlert({ tone: "success", title: "Etiqueta eliminada" });
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

  if (tags === null) return <TableSkeleton rows={4} showHeader={false} />;

  const maxCount = Math.max(0, ...tags.map((tag) => tag.contact_count));
  const unused = tags.filter((tag) => tag.contact_count === 0).length;

  return (
    <div className="@container min-w-0">
      <div className="grid min-w-0 items-start gap-4 @min-[52rem]:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
        <section className="@container min-w-0 overflow-hidden rounded-3xl border border-border bg-card" aria-label="Etiquetas">
          <header className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-2 @min-[36rem]:px-5">
            <h2 className="font-heading text-base font-bold">Etiquetas · {tags.length}</h2>
            {unused > 0 && (
              <span className="text-xs whitespace-nowrap text-muted-foreground">
                {unused} sin usar
              </span>
            )}
          </header>
          {tags.length === 0 ? (
            <p className="px-5 pt-2 pb-6 text-sm text-pretty text-muted-foreground">
              Aún no hay etiquetas. Crea la primera para clasificar tus contactos.
            </p>
          ) : (
            <ul className="border-t border-border">
              {tags.map((tag) => (
                <TagRow key={tag.id} tag={tag} maxCount={maxCount} onSaved={setTags} onDelete={handleDelete} />
              ))}
            </ul>
          )}
        </section>

        <form
          className="flex min-w-0 flex-col gap-3 rounded-3xl border border-border bg-card p-5 @min-[52rem]:sticky @min-[52rem]:top-4"
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
                showAlert({ tone: "error", title: errorMessage(err, "No se pudo crear la etiqueta") }),
              );
          }}
        >
          <h2 className="font-heading text-base font-bold">Nueva etiqueta</h2>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Semana Santa"
            maxLength={40}
            className="h-9 rounded-xl"
            aria-label="Nombre de la nueva etiqueta"
          />
          <p className="text-xs text-pretty text-muted-foreground">El color se elige después, en su punto de la lista.</p>
          <Button type="submit" size="sm" className="w-fit rounded-full">
            <Plus className="size-3.5" />
            Crear etiqueta
          </Button>
        </form>
      </div>
    </div>
  );
}

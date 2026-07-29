"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { TagDTO } from "@/modules/crm/domain/segment";
import {
  CONTACT_SOURCE_LABELS,
  CONTACT_STAGE_LABELS,
  CONTACT_STAGE_ORDER,
  type ContactLifecycleStage,
  type ContactSource,
} from "@/modules/crm/domain/enums";
import { listTags } from "@/modules/crm/infrastructure/services/segments-service.adapter";

const ALL = "__all__";
const SCORE_STEPS = [25, 50, 75] as const;

export type ContactFiltersValue = {
  lifecycle_stage?: ContactLifecycleStage;
  source?: ContactSource;
  city?: string;
  tag_id?: string;
  min_score?: number;
  sort?: "created_at" | "score";
};

/**
 * Filtros del listado de contactos: etapa y fuente siempre visibles;
 * ciudad, tag, score y orden viven en el popover "Más filtros" y sus valores
 * activos se muestran como chips removibles (el estado no se esconde).
 */
export function ContactFilters({
  value,
  onChange,
}: {
  value: ContactFiltersValue;
  onChange: (value: ContactFiltersValue) => void;
}) {
  const [tags, setTags] = useState<TagDTO[]>([]);
  const [cityDraft, setCityDraft] = useState(value.city ?? "");

  useEffect(() => {
    // Los tags alimentan solo el filtro: si falla, el select queda vacío.
    listTags().then(setTags).catch(() => setTags([]));
  }, []);

  useEffect(() => {
    setCityDraft(value.city ?? "");
  }, [value.city]);

  const tagName = (id: string) => tags.find((tag) => tag.id === id)?.name ?? "etiqueta";
  const hasAdvanced =
    value.city !== undefined ||
    value.tag_id !== undefined ||
    value.min_score !== undefined ||
    value.sort === "score";
  const hasFilters =
    hasAdvanced || value.lifecycle_stage !== undefined || value.source !== undefined;

  const chip = (label: string, clear: () => void) => (
    <Badge key={label} variant="secondary" className="gap-1 pr-1">
      {label}
      <button
        type="button"
        aria-label={`Quitar filtro ${label}`}
        className="rounded-full p-0.5 transition-colors hover:bg-foreground/10"
        onClick={clear}
      >
        <X className="size-3" />
      </button>
    </Badge>
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={value.lifecycle_stage ?? ALL}
          onValueChange={(v: string) =>
            onChange({
              ...value,
              lifecycle_stage: v === ALL ? undefined : (v as ContactLifecycleStage),
            })
          }
        >
          <SelectTrigger className="h-9 w-full sm:w-36" aria-label="Filtrar por etapa">
            <SelectValue placeholder="Etapa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las etapas</SelectItem>
            {CONTACT_STAGE_ORDER.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {CONTACT_STAGE_LABELS[stage]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={value.source ?? ALL}
          onValueChange={(v: string) =>
            onChange({ ...value, source: v === ALL ? undefined : (v as ContactSource) })
          }
        >
          <SelectTrigger className="h-9 w-full sm:w-40" aria-label="Filtrar por fuente">
            <SelectValue placeholder="Fuente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las fuentes</SelectItem>
            {(Object.keys(CONTACT_SOURCE_LABELS) as ContactSource[]).map((source) => (
              <SelectItem key={source} value={source}>
                {CONTACT_SOURCE_LABELS[source]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="h-9">
              <SlidersHorizontal className="size-4" />
              Más filtros
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="crm-filter-city" className="text-xs font-medium text-muted-foreground">
                Ciudad
              </label>
              <Input
                id="crm-filter-city"
                value={cityDraft}
                placeholder="Bogotá"
                className="h-9"
                onChange={(e) => setCityDraft(e.target.value)}
                onBlur={() => onChange({ ...value, city: cityDraft.trim() || undefined })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onChange({ ...value, city: cityDraft.trim() || undefined });
                  }
                }}
              />
            </div>

            {tags.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Etiqueta</span>
                <Select
                  value={value.tag_id ?? ALL}
                  onValueChange={(v: string) =>
                    onChange({ ...value, tag_id: v === ALL ? undefined : v })
                  }
                >
                  <SelectTrigger className="h-9 w-full" aria-label="Filtrar por etiqueta">
                    <SelectValue placeholder="Etiqueta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todas</SelectItem>
                    {tags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>
                        {tag.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Score mínimo</span>
              <Select
                value={value.min_score !== undefined ? String(value.min_score) : ALL}
                onValueChange={(v: string) =>
                  onChange({ ...value, min_score: v === ALL ? undefined : Number(v) })
                }
              >
                <SelectTrigger className="h-9 w-full" aria-label="Filtrar por score mínimo">
                  <SelectValue placeholder="Score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Cualquiera</SelectItem>
                  {SCORE_STEPS.map((step) => (
                    <SelectItem key={step} value={String(step)}>
                      ≥ {step}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Ordenar por</span>
              <Select
                value={value.sort ?? "created_at"}
                onValueChange={(v: string) =>
                  onChange({ ...value, sort: v === "score" ? "score" : undefined })
                }
              >
                <SelectTrigger className="h-9 w-full" aria-label="Ordenar contactos">
                  <SelectValue placeholder="Orden" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Más recientes</SelectItem>
                  <SelectItem value="score">Mayor score</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>

        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => onChange({})}
          >
            <X className="size-4" />
            Limpiar
          </Button>
        )}
      </div>

      {hasAdvanced && (
        <div className="flex flex-wrap items-center gap-1.5">
          {value.city !== undefined &&
            chip(`Ciudad: ${value.city}`, () => onChange({ ...value, city: undefined }))}
          {value.tag_id !== undefined &&
            chip(`Etiqueta: ${tagName(value.tag_id)}`, () =>
              onChange({ ...value, tag_id: undefined }),
            )}
          {value.min_score !== undefined &&
            chip(`Score ≥ ${value.min_score}`, () =>
              onChange({ ...value, min_score: undefined }),
            )}
          {value.sort === "score" &&
            chip("Orden: mayor score", () => onChange({ ...value, sort: undefined }))}
        </div>
      )}
    </div>
  );
}

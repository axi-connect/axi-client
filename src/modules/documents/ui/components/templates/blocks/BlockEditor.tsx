"use client";

import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import type {
  TemplateBlock,
  TemplateVariableView,
} from "@/modules/documents/domain/template";
import { BlockTextField } from "./BlockTextField";
import { WhenEditor } from "./WhenEditor";

/** Límites del servidor (`template_document.ts`); el 400 de zod los confirma. */
export const LIMITS = {
  heading: 120,
  text: 3000,
  label: 120,
  footer: 600,
  clauses: 20,
  pairs: 12,
} as const;

interface EditorProps<B extends TemplateBlock> {
  block: B;
  variables: readonly TemplateVariableView[];
  onChange: (next: TemplateBlock) => void;
}

/**
 * El formulario de UN bloque, desplegado bajo su fila. Mapeo EXHAUSTIVO por
 * tipo (`never` en el default, como `AttributeValueInput`): un tipo de bloque
 * nuevo en el servidor no se pinta como texto libre por accidente — no compila.
 */
export function BlockEditor({
  block,
  variables,
  onChange,
}: EditorProps<TemplateBlock>) {
  switch (block.type) {
    case "heading":
      return (
        <BlockTextField
          value={block.text}
          onChange={(text) => onChange({ ...block, text })}
          variables={variables}
          maxLength={LIMITS.heading}
          label="Texto del título"
          rows={1}
        />
      );
    case "paragraph":
      return (
        <div className="flex flex-col gap-3">
          <BlockTextField
            value={block.text}
            onChange={(text) => onChange({ ...block, text })}
            variables={variables}
            maxLength={LIMITS.text}
            label="Texto del párrafo"
          />
          <WhenEditor
            blockId={block.id}
            value={block.when}
            onChange={(when) => onChange({ ...block, when })}
          />
        </div>
      );
    case "page_footer":
      return (
        <BlockTextField
          value={block.text}
          onChange={(text) => onChange({ ...block, text })}
          variables={variables}
          maxLength={LIMITS.footer}
          label="Texto del pie de página"
          rows={2}
        />
      );
    case "clauses":
      return (
        <ClausesEditor
          block={block}
          variables={variables}
          onChange={onChange}
        />
      );
    case "key_values":
      return (
        <KeyValuesEditor
          block={block}
          variables={variables}
          onChange={onChange}
        />
      );
    case "parties":
      return (
        <div className="grid gap-3 md:grid-cols-3">
          <Field id={`${block.id}-show`} label="Mostrar">
            <Select
              value={block.show}
              onValueChange={(show) =>
                onChange({ ...block, show: show as typeof block.show })
              }
            >
              <SelectTrigger id={`${block.id}-show`} className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Emisor y cliente</SelectItem>
                <SelectItem value="issuer">Solo el emisor</SelectItem>
                <SelectItem value="counterparty">Solo el cliente</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field id={`${block.id}-issuer`} label="Etiqueta del emisor">
            <Input
              id={`${block.id}-issuer`}
              value={block.issuer_label}
              maxLength={LIMITS.label}
              onChange={(event) =>
                onChange({ ...block, issuer_label: event.target.value })
              }
            />
          </Field>
          <Field id={`${block.id}-counterparty`} label="Etiqueta del cliente">
            <Input
              id={`${block.id}-counterparty`}
              value={block.counterparty_label}
              maxLength={LIMITS.label}
              onChange={(event) =>
                onChange({ ...block, counterparty_label: event.target.value })
              }
            />
          </Field>
        </div>
      );
    case "line_items_table":
      return (
        <div className="flex flex-col gap-2">
          <Toggle
            id={`${block.id}-qty`}
            label="Columna de cantidad"
            checked={block.show_quantity}
            onChange={(show_quantity) => onChange({ ...block, show_quantity })}
          />
          <Toggle
            id={`${block.id}-unit`}
            label="Columna de precio unitario"
            checked={block.show_unit_price}
            onChange={(show_unit_price) =>
              onChange({ ...block, show_unit_price })
            }
          />
          <DataNote>
            Las filas salen de los datos al emitir: una por ítem vendido. Sin
            ítems, el bloque no aparece.
          </DataNote>
        </div>
      );
    case "totals":
      return (
        <div className="flex flex-col gap-2">
          <Toggle
            id={`${block.id}-dual`}
            label="Mostrar también el total en la moneda de origen y la tasa aplicada"
            checked={block.show_dual_currency}
            onChange={(show_dual_currency) =>
              onChange({ ...block, show_dual_currency })
            }
          />
          <DataNote>
            Solo se pinta la conversión si el documento la tiene; un pedido en
            pesos sale sin ella.
          </DataNote>
        </div>
      );
    case "schedule_table":
      return (
        <div className="flex flex-col gap-2">
          <Toggle
            id={`${block.id}-paid`}
            label="Columna de lo pagado por cuota"
            checked={block.show_paid}
            onChange={(show_paid) => onChange({ ...block, show_paid })}
          />
          <DataNote>
            Una fila por cuota. Solo aparece si el documento tiene plan de
            pagos: un pago único sale sin tabla.
          </DataNote>
        </div>
      );
    case "payment_summary":
      return (
        <DataNote>
          Valor, fecha, medio, referencia y saldo posterior del pago. Todo sale
          de los datos del pago.
        </DataNote>
      );
    case "signatures":
      return (
        <div className="grid gap-3 md:grid-cols-3">
          <Field id={`${block.id}-sig-issuer`} label="Firma del emisor">
            <Input
              id={`${block.id}-sig-issuer`}
              value={block.issuer_label}
              maxLength={LIMITS.label}
              onChange={(event) =>
                onChange({ ...block, issuer_label: event.target.value })
              }
            />
          </Field>
          <Field id={`${block.id}-sig-counterparty`} label="Firma del cliente">
            <Input
              id={`${block.id}-sig-counterparty`}
              value={block.counterparty_label}
              maxLength={LIMITS.label}
              onChange={(event) =>
                onChange({ ...block, counterparty_label: event.target.value })
              }
            />
          </Field>
          <div className="self-end">
            <Toggle
              id={`${block.id}-date`}
              label="Con línea de fecha"
              checked={block.show_date}
              onChange={(show_date) => onChange({ ...block, show_date })}
            />
          </div>
        </div>
      );
    case "image":
      return (
        <Field id={`${block.id}-align`} label="Posición del logo">
          <Select
            value={block.align}
            onValueChange={(align) =>
              onChange({ ...block, align: align as typeof block.align })
            }
          >
            <SelectTrigger id={`${block.id}-align`} className="h-9 md:w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">A la izquierda</SelectItem>
              <SelectItem value="center">Centrado</SelectItem>
              <SelectItem value="right">A la derecha</SelectItem>
            </SelectContent>
          </Select>
          <DataNote>
            Es el isotipo de Mi empresa; sin logo, el bloque no aparece. Nunca
            una URL escrita a mano.
          </DataNote>
        </Field>
      );
    case "legal_notice":
      return (
        <DataNote>
          Texto fijo de este tipo de documento. No se edita: es la parte legal.
        </DataNote>
      );
    case "divider":
      return (
        <DataNote>Una línea separadora. No tiene nada que configurar.</DataNote>
      );
    case "spacer":
      return (
        <Field id={`${block.id}-size`} label="Tamaño">
          <Select
            value={block.size}
            onValueChange={(size) =>
              onChange({ ...block, size: size as typeof block.size })
            }
          >
            <SelectTrigger id={`${block.id}-size`} className="h-9 md:w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Pequeño</SelectItem>
              <SelectItem value="md">Mediano</SelectItem>
              <SelectItem value="lg">Grande</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      );
    default: {
      const exhaustive: never = block;
      return exhaustive;
    }
  }
}

function ClausesEditor({
  block,
  variables,
  onChange,
}: EditorProps<Extract<TemplateBlock, { type: "clauses" }>>) {
  const items = block.items;
  const setItems = (next: typeof items) => onChange({ ...block, items: next });
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3">
        {items.map((item, index) => {
          const position = index + 1;
          return (
            <li
              key={index}
              className="overflow-hidden rounded-xl border border-border bg-background"
            >
              <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2 text-sm">
                <span className="grid size-6 place-items-center rounded-md bg-secondary text-xs font-semibold text-brand">
                  {position}
                </span>
                <Input
                  aria-label={`Título de la cláusula ${String(position)}`}
                  placeholder="Título (opcional)"
                  className="h-8 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                  value={item.title ?? ""}
                  maxLength={LIMITS.label}
                  onChange={(event) =>
                    setItems(
                      items.map((row, i) =>
                        i === index
                          ? {
                              ...row,
                              title:
                                event.target.value === ""
                                  ? null
                                  : event.target.value,
                            }
                          : row,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={`Subir la cláusula ${String(position)}`}
                  disabled={index === 0}
                  onClick={() => setItems(swap(items, index, index - 1))}
                >
                  <ChevronUp aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={`Bajar la cláusula ${String(position)}`}
                  disabled={index === items.length - 1}
                  onClick={() => setItems(swap(items, index, index + 1))}
                >
                  <ChevronDown aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={`Quitar la cláusula ${String(position)}`}
                  onClick={() => setItems(items.filter((_, i) => i !== index))}
                >
                  <X aria-hidden="true" className="size-4" />
                </Button>
              </div>
              <div className="p-3">
                <BlockTextField
                  value={item.body}
                  onChange={(body) =>
                    setItems(
                      items.map((row, i) =>
                        i === index ? { ...row, body } : row,
                      ),
                    )
                  }
                  variables={variables}
                  maxLength={LIMITS.text}
                  label={`Texto de la cláusula ${String(position)}`}
                  rows={3}
                />
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={items.length >= LIMITS.clauses}
          onClick={() => setItems([...items, { title: null, body: "" }])}
        >
          <Plus aria-hidden="true" className="size-3.5" />
          Añadir cláusula
        </Button>
        <span className="text-xs tabular-nums text-muted-foreground">
          {items.length} de {LIMITS.clauses} cláusulas
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Switch
            id={`${block.id}-numbered`}
            checked={block.numbered}
            onCheckedChange={(numbered) => onChange({ ...block, numbered })}
          />
          <Label
            htmlFor={`${block.id}-numbered`}
            className="text-xs text-muted-foreground"
          >
            Numeradas
          </Label>
        </div>
      </div>
      <WhenEditor
        blockId={block.id}
        value={block.when}
        onChange={(when) => onChange({ ...block, when })}
      />
    </div>
  );
}

function KeyValuesEditor({
  block,
  variables,
  onChange,
}: EditorProps<Extract<TemplateBlock, { type: "key_values" }>>) {
  const pairs = block.pairs;
  const setPairs = (next: typeof pairs) => onChange({ ...block, pairs: next });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {pairs.map((pair, index) => {
          const position = index + 1;
          return (
            <div
              key={index}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-start gap-2"
            >
              <Input
                aria-label={`Etiqueta del par ${String(position)}`}
                placeholder="Etiqueta"
                value={pair.label}
                maxLength={LIMITS.label}
                onChange={(event) =>
                  setPairs(
                    pairs.map((row, i) =>
                      i === index ? { ...row, label: event.target.value } : row,
                    ),
                  )
                }
              />
              <BlockTextField
                value={pair.value}
                onChange={(value) =>
                  setPairs(
                    pairs.map((row, i) =>
                      i === index ? { ...row, value } : row,
                    ),
                  )
                }
                variables={variables}
                maxLength={LIMITS.text}
                label={`Valor del par ${String(position)}`}
                rows={1}
                placeholder="Valor, con variables"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9"
                aria-label={`Quitar el par ${String(position)}`}
                onClick={() => setPairs(pairs.filter((_, i) => i !== index))}
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pairs.length >= LIMITS.pairs}
          onClick={() => setPairs([...pairs, { label: "", value: "" }])}
        >
          <Plus aria-hidden="true" className="size-3.5" />
          Añadir par
        </Button>
        <span className="text-xs tabular-nums text-muted-foreground">
          {pairs.length} de {LIMITS.pairs}
        </span>
      </div>
      <DataNote>
        Un par cuyo valor quede vacío al emitir (una variable sin dato) se omite
        entero.
      </DataNote>
      <WhenEditor
        blockId={block.id}
        value={block.when}
        onChange={(when) => onChange({ ...block, when })}
      />
    </div>
  );
}

function swap<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const a = next[from];
  const b = next[to];
  if (a === undefined || b === undefined) return next;
  next[from] = b;
  next[to] = a;
  return next;
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
    </div>
  );
}

function DataNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
  );
}

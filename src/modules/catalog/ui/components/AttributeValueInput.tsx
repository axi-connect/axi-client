"use client";

import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { attributeOptions, type AttributeType, type ProductTypeAttributeDTO } from "@/modules/catalog/domain/product-type";

export const UNSET_OPTION = "__unset__";

export type AttributeScalar = string | number | boolean;

/**
 * El control de UN valor de atributo EAV, según su tipo. **Mapeo exhaustivo**:
 * el `switch` cubre todos los `AttributeType` y el caso imposible se comprueba
 * con `never`, así que añadir un tipo al contrato rompe el build en lugar de
 * caer en silencio a un campo de texto.
 *
 * Esto último no es teórico: `date` (F2 del programa Cobros, la fecha de la
 * salida de una expedición) llegó al contrato y los tres sitios que pintaban
 * atributos —ficha de producto, formulario de variante y editor de filas— lo
 * habrían tratado como texto libre sin un solo error. Por eso el control es
 * uno solo y vive aquí.
 */
export function AttributeValueInput({
  attribute,
  id,
  value,
  disabled,
  invalid,
  placeholder,
  onChange,
}: {
  attribute: ProductTypeAttributeDTO;
  id: string;
  value: AttributeScalar | undefined;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  onChange: (value: AttributeScalar | undefined) => void;
}) {
  const type: AttributeType = attribute.type;
  switch (type) {
    case "select":
      return (
        <Select
          value={value === undefined ? UNSET_OPTION : String(value)}
          onValueChange={(next: string) => onChange(next === UNSET_OPTION ? undefined : next)}
        >
          <SelectTrigger id={id} className="w-full" disabled={disabled} aria-invalid={invalid}>
            <SelectValue placeholder={placeholder ?? "Sin definir"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNSET_OPTION}>Sin definir</SelectItem>
            {attributeOptions(attribute).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "boolean":
      return (
        <label className="flex h-9 items-center gap-2 text-sm">
          <input
            id={id}
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={value === true}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
          />
          Sí
        </label>
      );
    case "number":
      return (
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          className="tabular-nums"
          value={value === undefined ? "" : String(value)}
          disabled={disabled}
          aria-invalid={invalid}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))}
        />
      );
    case "date":
      // El wire es ISO `YYYY-MM-DD`, que es justo lo que da y espera el input
      // nativo: sin conversión y sin zona horaria de por medio.
      return (
        <Input
          id={id}
          type="date"
          value={value === undefined ? "" : String(value)}
          disabled={disabled}
          aria-invalid={invalid}
          onChange={(event) => onChange(event.target.value === "" ? undefined : event.target.value)}
        />
      );
    case "text":
      return (
        <Input
          id={id}
          value={value === undefined ? "" : String(value)}
          disabled={disabled}
          maxLength={120}
          aria-invalid={invalid}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value === "" ? undefined : event.target.value)}
        />
      );
    default: {
      // Un tipo nuevo en el contrato llega aquí y NO compila: es el punto del
      // mapeo exhaustivo. Se añade su caso arriba, no un fallback.
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

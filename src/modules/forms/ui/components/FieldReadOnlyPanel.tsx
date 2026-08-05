import { FieldList, type FieldItem } from "@/shared/components/features/field-list";
import {
  FIELD_TYPE_LABELS,
  type EditableFormField,
} from "@/modules/forms/domain/form";

/**
 * El dato seleccionado sin permiso de escritura.
 *
 * Es un `<dl>`, no un formulario con los inputs deshabilitados: ocho inputs
 * grises se leen como un formulario roto, mientras una ficha se lee como
 * información. Diferencia gratuita y muy visible.
 */
export function FieldReadOnlyPanel({ field }: { field: EditableFormField }) {
  const options = (field.options ?? []).filter((option) => option.trim() !== "");

  const items: FieldItem[] = [
    { label: "Nombre del dato", value: field.label },
    { label: "Tipo de dato", value: FIELD_TYPE_LABELS[field.type] },
    { label: "Obligatorio", value: field.required ? "Sí" : "No" },
    { label: "Opciones", value: options.join(" · "), hideWhenEmpty: true },
    { label: "Cómo debe preguntarlo", value: field.ai_prompt ?? "", block: true, hideWhenEmpty: true },
    { label: "Clave técnica", value: field.code, copyable: field.code },
  ];

  return <FieldList items={items} layout="grid" />;
}

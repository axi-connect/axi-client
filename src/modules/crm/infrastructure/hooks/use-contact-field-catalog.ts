"use client";

import { useEffect, useState } from "react";
import { getTenantFormsSafe } from "@/modules/crm/infrastructure/services/forms.cache";

export type ContactFieldOption = {
  /** Lo que viaja en `custom_field:<code>`: una clave de `custom_fields` o una columna del contacto. */
  code: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "boolean" | "phone" | "email";
};

/**
 * Columnas de la ficha que un hueco puede leer además de `custom_fields`.
 * Espejo de `contact_data_columns.ts` del servidor (mismos códigos, etiquetas y
 * tipos): si el código de un hueco es una columna, el servidor lee la columna
 * —que es donde los formularios y `save_contact_data` la guardan— y si no,
 * `custom_fields[code]`. `first_name` y `full_name` no están: son orígenes
 * propios del selector («Nombre del contacto», «Nombre completo»).
 */
export type ContactColumnCode =
  | "last_name"
  | "email"
  | "phone"
  | "document_type"
  | "document_number"
  | "birthdate"
  | "address"
  | "city";

export const CONTACT_COLUMN_FIELDS: readonly (ContactFieldOption & { code: ContactColumnCode })[] = [
  { code: "last_name", label: "Apellido", type: "text" },
  { code: "email", label: "Email", type: "email" },
  { code: "phone", label: "Teléfono", type: "phone" },
  { code: "document_type", label: "Tipo de documento", type: "select" },
  { code: "document_number", label: "Número de documento", type: "text" },
  { code: "birthdate", label: "Fecha de nacimiento", type: "date" },
  { code: "address", label: "Dirección", type: "text" },
  { code: "city", label: "Ciudad", type: "text" },
];

/**
 * El catálogo de campos del contacto que un hueco de plantilla puede leer
 * (hotfix 2026-09-29): los campos que el tenant definió en sus formularios
 * activos —por su etiqueta, no por su código— más las columnas de la ficha. Es lo
 * que hace que «Campo del contacto» escale: un campo nuevo en un formulario
 * aparece aquí sin tocar código. Los booleanos se omiten: «true» no es un
 * texto que se pueda leer en un mensaje.
 */
export function useContactFieldCatalog(): ContactFieldOption[] {
  const [fields, setFields] = useState<ContactFieldOption[]>([...CONTACT_COLUMN_FIELDS]);
  useEffect(() => {
    let alive = true;
    void getTenantFormsSafe().then((forms) => {
      if (!alive) return;
      const seen = new Set<string>(CONTACT_COLUMN_FIELDS.map((column) => column.code));
      const custom: ContactFieldOption[] = [];
      for (const form of forms) {
        if (!form.is_active) continue;
        for (const field of form.fields) {
          if (field.type === "boolean" || seen.has(field.code)) continue;
          seen.add(field.code);
          custom.push({ code: field.code, label: field.label, type: field.type });
        }
      }
      setFields([...custom, ...CONTACT_COLUMN_FIELDS]);
    });
    return () => {
      alive = false;
    };
  }, []);
  return fields;
}

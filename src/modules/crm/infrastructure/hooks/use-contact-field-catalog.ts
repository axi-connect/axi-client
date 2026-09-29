"use client";

import { useEffect, useState } from "react";
import { getTenantFormsSafe } from "@/modules/crm/infrastructure/services/forms.cache";

export type ContactFieldOption = {
  /** Lo que viaja en `custom_field:<code>`: una clave de `custom_fields` o una columna del contacto. */
  code: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "boolean" | "phone" | "email";
};

/** Columnas del contacto que un hueco puede usar además de los campos personalizados. */
const CONTACT_COLUMNS: readonly ContactFieldOption[] = [
  { code: "city", label: "Ciudad", type: "text" },
  { code: "email", label: "Correo", type: "email" },
  { code: "phone", label: "Teléfono", type: "phone" },
];

/**
 * El catálogo de campos del contacto que un hueco de plantilla puede leer
 * (hotfix 2026-09-29): los campos que el tenant definió en sus formularios
 * activos —por su etiqueta, no por su código— más tres columnas fijas. Es lo
 * que hace que «Campo del contacto» escale: un campo nuevo en un formulario
 * aparece aquí sin tocar código. Los booleanos se omiten: «true» no es un
 * texto que se pueda leer en un mensaje.
 */
export function useContactFieldCatalog(): ContactFieldOption[] {
  const [fields, setFields] = useState<ContactFieldOption[]>([...CONTACT_COLUMNS]);
  useEffect(() => {
    let alive = true;
    void getTenantFormsSafe().then((forms) => {
      if (!alive) return;
      const seen = new Set(CONTACT_COLUMNS.map((column) => column.code));
      const custom: ContactFieldOption[] = [];
      for (const form of forms) {
        if (!form.is_active) continue;
        for (const field of form.fields) {
          if (field.type === "boolean" || seen.has(field.code)) continue;
          seen.add(field.code);
          custom.push({ code: field.code, label: field.label, type: field.type });
        }
      }
      setFields([...custom, ...CONTACT_COLUMNS]);
    });
    return () => {
      alive = false;
    };
  }, []);
  return fields;
}

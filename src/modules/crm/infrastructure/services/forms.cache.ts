import { listForms, type FormDefinitionDTO } from "@/modules/forms/public";

/**
 * Formularios de captura del tenant, cacheados a nivel de módulo.
 *
 * La columna «Datos» de la tabla de contactos necesita los campos definidos
 * para calcular `n / total` por fila; pedir `/forms` en cada página de la tabla
 * sería una petición por paginación para un recurso que cambia una vez al mes.
 * Se pide **una vez por sesión** y se cachea la PROMESA (dos tablas montadas en
 * el mismo tick comparten la petición). Un fallo no se cachea, y degrada a
 * «sin formularios»: la tabla nunca se cae por esta columna.
 */

let formsPromise: Promise<FormDefinitionDTO[]> | null = null;

export function getTenantForms(): Promise<FormDefinitionDTO[]> {
  formsPromise ??= listForms()
    .then((list) => list.data)
    .catch((error: unknown) => {
      formsPromise = null;
      throw error;
    });
  return formsPromise;
}

/** Igual que `getTenantForms` pero nunca rechaza: sin datos → lista vacía. */
export function getTenantFormsSafe(): Promise<FormDefinitionDTO[]> {
  return getTenantForms().catch(() => []);
}

/** Solo para tests: descarta la caché compartida. */
export function clearTenantFormsCache(): void {
  formsPromise = null;
}

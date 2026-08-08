import { contactDisplayName, getContact } from "@/modules/crm/public";
import { listProducts } from "@/modules/catalog/public";

/**
 * Cache a nivel de módulo de nombres de contacto y de servicio (patrón
 * `crm/tenant-users.cache.ts`): los DTO de cita solo traen `contact_id` /
 * `product_id` y el panel los hidrata client-side.
 *
 * - Contactos: no hay endpoint batch → `GET /contacts/:id` solo para ids
 *   únicos ausentes, en tandas de concurrencia acotada. Un fallo individual
 *   degrada a fallback sin romper la grilla. (Follow-up backend: `?ids=`.)
 * - Servicios: una sola llamada `kind=service` por sesión (catálogo pequeño).
 */
const CONTACT_FALLBACK = "Contacto";
const CONCURRENCY = 6;

const contactNames = new Map<string, string>();
const contactInFlight = new Map<string, Promise<void>>();

async function fetchContactName(id: string): Promise<void> {
  try {
    const contact = await getContact(id);
    contactNames.set(id, contactDisplayName(contact));
  } catch {
    // 404/permiso: fallback estable; NO se cachea para permitir reintento
    // en la próxima hidratación.
  }
}

/** Resuelve nombres para `ids`; devuelve el snapshot (solo los resueltos). */
export async function hydrateContactNames(ids: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids)];
  const missing = unique.filter((id) => !contactNames.has(id) && !contactInFlight.has(id));

  // Pool simple de concurrencia acotada sobre los faltantes.
  const queue = [...missing];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      const promise = fetchContactName(id).finally(() => contactInFlight.delete(id as string));
      contactInFlight.set(id, promise);
      await promise;
    }
  });
  await Promise.all(workers);
  // Esperar también los que otro consumidor dejó en vuelo.
  await Promise.all(unique.map((id) => contactInFlight.get(id)).filter(Boolean));

  return Object.fromEntries(
    unique.map((id) => [id, contactNames.get(id) ?? CONTACT_FALLBACK] as const),
  );
}

let servicesPromise: Promise<Map<string, string>> | null = null;

/** Nombres de TODOS los servicios del catálogo (una petición por sesión). */
export function hydrateServiceNames(): Promise<Map<string, string>> {
  if (!servicesPromise) {
    servicesPromise = listProducts({ kind: "service", page_size: 100 })
      .then((res) => new Map(res.data.map((p) => [p.id, p.name] as const)))
      .catch((err: unknown) => {
        servicesPromise = null;
        throw err;
      });
  }
  return servicesPromise;
}

/** Solo para tests: resetea el estado del módulo. */
export function __resetEntityNamesCache(): void {
  contactNames.clear();
  contactInFlight.clear();
  servicesPromise = null;
}

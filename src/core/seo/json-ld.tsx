import type { Thing, WithContext } from "schema-dts";

/**
 * Serializa un grafo JSON-LD para incrustarlo en un `<script>`.
 *
 * `JSON.stringify` ya neutraliza las comillas, pero NO el carácter `<`: dentro
 * de un bloque `application/ld+json` la secuencia `</script>` cierra la
 * etiqueta desde dentro del propio string, y `<!--` abre un comentario. Escapar
 * `<` mata los dos vectores de una vez.
 *
 * Hoy todo el contenido sale de constantes del repositorio, así que no hay
 * superficie de inyección. Se escapa igualmente porque el día que un precio o
 * una FAQ vengan del backend nadie va a acordarse de volver aquí.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Bloque de datos estructurados. Server Component a propósito: se renderiza en
 * el HTML y no cuesta un solo byte de JavaScript en el cliente.
 */
export function JsonLd({ data }: { data: WithContext<Thing> }) {
  return (
    <script
      type="application/ld+json"
      // El contenido va escapado por `serializeJsonLd`.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

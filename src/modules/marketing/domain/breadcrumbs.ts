/**
 * Las migas de las plantillas de Meta para el header privado (hsm-media F3), en
 * datos como las de /comercial: el layout es de servidor y se las pasa al
 * header sin funciones. Forma de `BreadcrumbConfig` de
 * `shared/components/layout/private-header`.
 *
 * El segmento de la plantilla dice «Plantilla», no su id (en producción un
 * UUID; auditoría F3, R3). `/settings/meta-templates/[id]` redirige a su
 * `/edit`, así que la miga enlaza a algo que existe.
 */
export const META_TEMPLATES_BREADCRUMBS = {
  children: {
    "/settings/meta-templates": { new: "Nueva", "*": "Plantilla" },
  },
} as const satisfies {
  children: Readonly<Record<string, Readonly<Record<string, string>>>>;
};

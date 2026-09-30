/**
 * Las migas de /scheduling para el header privado, en datos (el layout es de
 * servidor). `/scheduling/calendar/appointment` no tiene page.tsx propia (solo
 * `[appointmentId]` debajo): su miga no enlaza. La cita se nombra «Cita», no
 * por su id; el segmento intermedio ya dice lo mismo, así que el id queda
 * como «Detalle».
 */
export const SCHEDULING_BREADCRUMBS = {
  unlinked: ["/scheduling/calendar/appointment"],
  children: {
    "/scheduling/calendar/appointment": { "*": "Detalle" },
  },
} as const satisfies {
  unlinked: readonly string[];
  children: Readonly<Record<string, Readonly<Record<string, string>>>>;
};

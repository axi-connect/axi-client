/**
 * Las migas de /scheduling para el header privado, en datos (el layout es de
 * servidor): «Agenda › Calendario › Cita». `/scheduling/calendar/appointment`
 * no tiene page.tsx propia (solo `[appointmentId]` debajo) y diría lo mismo
 * que su hijo, así que no se pinta; la cita se nombra «Cita», no por su id.
 */
export const SCHEDULING_BREADCRUMBS = {
  unlinked: ["/scheduling/calendar/appointment"],
  hidden: ["/scheduling/calendar/appointment"],
  children: {
    "/scheduling/calendar/appointment": { "*": "Cita" },
  },
} as const satisfies {
  unlinked: readonly string[];
  hidden: readonly string[];
  children: Readonly<Record<string, Readonly<Record<string, string>>>>;
};

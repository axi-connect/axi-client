import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ContactTimelineFeed } from "./ContactTimelineFeed";

/**
 * Sección "Historial" del Contacto 360: card + título + acción de nueva
 * actividad. Toda la mecánica (fuentes, cursor, estados) vive en
 * `ContactTimelineFeed`, que el rail del inbox reutiliza sin este chrome.
 */
export function ContactTimeline({
  contactId,
  createActivityHref,
  scheduleFollowUpHref,
  canRevert = false,
}: {
  contactId: string;
  /** Link al modal de nueva actividad/tarea (@form de la bandeja, F4). */
  createActivityHref?: string;
  /** F2: link al flujo «Programar seguimiento» (solo con `crm:automate`). */
  scheduleFollowUpHref?: string;
  /** Recorrido (F4 comercial): «Deshacer» en los cambios de etapa (`crm:manage`). */
  canRevert?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-background p-4 md:p-6">
      <ContactTimelineFeed
        contactId={contactId}
        canRevert={canRevert}
        header={
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">Historial</h3>
            {createActivityHref !== undefined && (
              <Button asChild variant="outline" size="sm" className="h-7 rounded-full text-xs">
                <Link href={createActivityHref}>
                  <Plus className="size-3" />
                  Actividad
                </Link>
              </Button>
            )}
            {scheduleFollowUpHref !== undefined && (
              <Button asChild variant="outline" size="sm" className="h-7 rounded-full text-xs">
                <Link href={scheduleFollowUpHref}>
                  <Sparkles className="size-3 text-accent-violet" />
                  Programar seguimiento
                </Link>
              </Button>
            )}
          </div>
        }
      />
    </section>
  );
}

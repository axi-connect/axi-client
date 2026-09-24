import { JOURNEY_CHANGED_EVENT, type JourneyChangedDetail } from "@/modules/crm/domain/journey";

/**
 * El aviso «cambió el recorrido de este contacto» entre la card «Recorrido»,
 * el historial y la página del 360 (arquitectura §9: CustomEvents del DOM
 * entre piezas sin padre común). Va con `detail` para que cada listener
 * filtre por contacto y no recargue la ficha de otro.
 */
export function emitJourneyChanged(detail: JourneyChangedDetail): void {
  window.dispatchEvent(new CustomEvent<JourneyChangedDetail>(JOURNEY_CHANGED_EVENT, { detail }));
}

/** Suscribe a los cambios del recorrido de UN contacto; devuelve el `unsubscribe`. */
export function subscribeJourneyChanged(
  contactId: string,
  handler: (detail: JourneyChangedDetail) => void,
): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<JourneyChangedDetail | undefined>).detail;
    if (detail === undefined || detail.contactId !== contactId) return;
    handler(detail);
  };
  window.addEventListener(JOURNEY_CHANGED_EVENT, listener);
  return () => window.removeEventListener(JOURNEY_CHANGED_EVENT, listener);
}

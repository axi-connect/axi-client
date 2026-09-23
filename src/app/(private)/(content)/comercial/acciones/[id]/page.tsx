import type { Metadata } from "next";

import { ActionSheetRoute } from "@/modules/commercial/ui/ActionSheetRoute";
import { CommercialView } from "@/modules/commercial/ui/CommercialView";

export const metadata: Metadata = { title: "Acción propuesta · Comercial" };

/**
 * Navegación DURA (recarga, enlace compartido, o la tarjeta de Axel desde
 * `/cmo`: la intercepción solo aplica dentro de `/comercial`): la ruta del mes
 * con la acción abierta encima. Cerrar lleva a `/comercial` (`replace`). La
 * campanita no enlaza aquí: sus avisos del ritmo abren `/comercial`.
 */
export default async function CommercialActionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <CommercialView />
      <ActionSheetRoute proposalId={id} closeBehavior="replace" />
    </>
  );
}

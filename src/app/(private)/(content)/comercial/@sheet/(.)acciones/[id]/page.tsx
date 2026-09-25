"use client";

import { use } from "react";

import { ActionSheetRoute } from "@/modules/commercial/ui/ActionSheetRoute";

/** Navegación suave a /comercial/acciones/[id]: la acción abre como panel sobre la ruta del mes. */
export default function InterceptedCommercialAction({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ActionSheetRoute proposalId={id} closeBehavior="back" />;
}

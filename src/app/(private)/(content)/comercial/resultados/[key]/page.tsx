import type { Metadata } from "next";

import { CommercialView } from "@/modules/commercial/ui/CommercialView";
import { KeyResultSheetRoute } from "@/modules/commercial/ui/KeyResultSheetRoute";

export const metadata: Metadata = { title: "Resultado clave · Comercial" };

/** Navegación DURA: la ruta del mes con el resultado abierto encima; cerrar vuelve a `/comercial`. */
export default async function CommercialKeyResultPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return (
    <>
      <CommercialView />
      <KeyResultSheetRoute resultKey={key} closeBehavior="replace" />
    </>
  );
}

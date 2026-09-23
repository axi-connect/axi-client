"use client";

import { use } from "react";

import { KeyResultSheetRoute } from "@/modules/commercial/ui/KeyResultSheetRoute";

/** Navegación suave a /comercial/resultados/[key]: el resultado abre como panel sobre la ruta del mes. */
export default function InterceptedKeyResult({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  return <KeyResultSheetRoute resultKey={key} closeBehavior="back" />;
}

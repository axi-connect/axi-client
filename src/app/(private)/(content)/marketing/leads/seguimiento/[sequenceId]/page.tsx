import { Suspense } from "react";
import type { Metadata } from "next";

import { SequenceTrackingView } from "@/modules/prospecting/ui/SequenceTrackingView";

export const metadata: Metadata = {
  title: "Seguimiento",
  description: "Qué pasó con cada negocio de una secuencia, por WhatsApp y correo.",
};

export default async function SequenceTrackingPage({ params }: { params: Promise<{ sequenceId: string }> }) {
  const { sequenceId } = await params;
  return (
    <Suspense>
      <SequenceTrackingView sequenceId={sequenceId} />
    </Suspense>
  );
}

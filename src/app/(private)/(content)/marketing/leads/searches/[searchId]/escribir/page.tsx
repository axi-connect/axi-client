import type { Metadata } from "next";

import { WriteToSearchView } from "@/modules/prospecting/ui/WriteToSearchView";

export const metadata: Metadata = {
  title: "Escribirles",
  description: "De una búsqueda a la secuencia, con la imagen para WhatsApp y correo.",
};

export default async function WriteToSearchPage({ params }: { params: Promise<{ searchId: string }> }) {
  const { searchId } = await params;
  return <WriteToSearchView searchId={searchId} />;
}

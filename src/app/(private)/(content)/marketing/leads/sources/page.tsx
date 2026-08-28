import type { Metadata } from "next";

import { SourcesView } from "@/modules/prospecting/ui/SourcesView";

export const metadata: Metadata = {
  title: "Fuentes",
  description: "De dónde traemos leads y qué puedes hacer con cada uno.",
};

export default function SourcesPage() {
  return <SourcesView />;
}

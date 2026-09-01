import type { Metadata } from "next";

import { SearchesView } from "@/modules/prospecting/ui/SearchesView";

export const metadata: Metadata = {
  title: "Búsquedas",
  description: "Sal a buscar negocios que todavía no te conocen.",
};

export default function SearchesPage() {
  return <SearchesView />;
}

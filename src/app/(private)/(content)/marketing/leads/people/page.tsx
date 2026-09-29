import type { Metadata } from "next";

import { PeopleView } from "@/modules/prospecting/ui/PeopleView";

export const metadata: Metadata = {
  title: "Personas",
  description: "Busca a quien decide, por cargo y por empresa.",
};

export default function PeoplePage() {
  return <PeopleView />;
}

import type { Metadata } from "next";

import { AutopilotListView } from "@/modules/autopilot/ui/AutopilotListView";

export const metadata: Metadata = {
  title: "Rutas",
  description: "Rutas que salen a buscar clientes, los califican y les escriben, en su horario y dentro de su tope.",
};

export default function AutopilotPage() {
  return <AutopilotListView />;
}

import type { Metadata } from "next";

import { AutopilotListView } from "@/modules/autopilot/ui/AutopilotListView";

export const metadata: Metadata = {
  title: "Automatización",
  description: "Pilotos que buscan, califican y contactan solos, en su horario y dentro de su tope.",
};

export default function AutopilotPage() {
  return <AutopilotListView />;
}

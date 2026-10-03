import type { Metadata } from "next";

import { RunLiveView } from "@/modules/autopilot/ui/RunLiveView";

export const metadata: Metadata = { title: "Salida" };

export default async function RunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  return <RunLiveView runId={runId} />;
}

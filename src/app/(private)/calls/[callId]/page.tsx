"use client";

import { use } from "react";
import { CallDetailView } from "@/modules/calls/ui/CallDetailView";

export default function CallDetailPage({ params }: { params: Promise<{ callId: string }> }) {
  const { callId } = use(params);
  return <CallDetailView callId={callId} />;
}

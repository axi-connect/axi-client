import type { Metadata } from "next";
import { SocialEditorView } from "@/modules/social/ui/SocialEditorView";

export const metadata: Metadata = { title: "Automatización · Redes" };

export default async function SocialAutomationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SocialEditorView automationId={id} />;
}

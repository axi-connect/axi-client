import type { Metadata } from "next";
import { SocialEditorView } from "@/modules/social/ui/SocialEditorView";

export const metadata: Metadata = { title: "Nueva automatización · Redes" };

export default function NewSocialAutomationPage() {
  return <SocialEditorView automationId={null} />;
}

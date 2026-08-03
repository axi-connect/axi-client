import { redirect } from "next/navigation";

/** /platform/quality → Escenarios (TEMPORAL: en F3 el default pasa a /runs). */
export default function PlatformQualityPage() {
  redirect("/platform/quality/scenarios");
}

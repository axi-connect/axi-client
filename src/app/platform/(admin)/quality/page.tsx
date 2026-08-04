import { redirect } from "next/navigation";

/** /platform/quality → Ejecuciones (default de la sección). */
export default function PlatformQualityPage() {
  redirect("/platform/quality/runs");
}

import { redirect } from "next/navigation";
import { META_TEMPLATES_HREF } from "@/core/lib/hsm-copy";

/** F7 (2026-09-28): las plantillas de Meta viven en Configuración; los enlaces viejos siguen llegando. */
export default function MarketingMetaTemplatesPage() {
  redirect(META_TEMPLATES_HREF);
}

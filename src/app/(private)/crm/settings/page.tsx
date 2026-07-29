import { redirect } from "next/navigation";

/** Raíz de Configuración: aterriza en el editor de pipelines. */
export default function CrmSettingsIndexPage() {
  redirect("/crm/settings/pipelines");
}

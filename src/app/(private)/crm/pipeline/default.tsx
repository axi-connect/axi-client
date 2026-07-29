import { PipelineView } from "@/modules/crm/ui/PipelineView";

/**
 * Fallback del slot children: al interceptar /crm/pipeline/deal/[id] o
 * /crm/pipeline/create desde OTRO segmento (p.ej. el 360), el board se monta
 * detrás del rail/modal en vez de romper con 404.
 */
export default function CrmPipelineDefault() {
  return <PipelineView />;
}

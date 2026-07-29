import { TasksView } from "@/modules/crm/ui/TasksView";

/**
 * Fallback del slot children: al interceptar /crm/tasks/create desde otro
 * segmento (360, rail del deal), la bandeja se monta detrás del modal.
 */
export default function CrmTasksDefault() {
  return <TasksView />;
}

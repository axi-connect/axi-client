"use client";

/**
 * Columna derecha del simulacro: pestañas Estado | Traza. La traza se pide
 * cuando crece el transcript (cada respuesta del agente deja un turno).
 */
import { Gauge, Route } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import type { SessionDetail } from "../../../../../domain/quality-sessions";
import { useSessionTraceQuery } from "../../../../../infrastructure/api/hooks/use-quality-sessions";
import { SessionStatePanel } from "./SessionStatePanel";
import { TurnTraceTimeline } from "./TurnTraceTimeline";

type SessionInspectorProps = {
  session: SessionDetail;
  transcriptLength: number;
  onEnd: () => void;
  onPurge: () => void;
  ending: boolean;
};

export function SessionInspector({ session, transcriptLength, onEnd, onPurge, ending }: SessionInspectorProps) {
  const traceQuery = useSessionTraceQuery(session.id, transcriptLength);
  return (
    <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-card" aria-label="Inspector de la sesión">
      <Tabs defaultValue="state" className="flex min-h-0 flex-1 flex-col">
        <div className="px-4 pt-4 pb-1">
          <TabsList surface="inline" className="w-full">
            <TabsTrigger value="state" className="flex-1">
              <Gauge aria-hidden="true" />
              Estado
            </TabsTrigger>
            <TabsTrigger value="trace" className="flex-1">
              <Route aria-hidden="true" />
              Traza
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="state" className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-4">
          <SessionStatePanel session={session} onEnd={onEnd} onPurge={onPurge} ending={ending} />
        </TabsContent>
        <TabsContent value="trace" className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-4">
          <TurnTraceTimeline trace={traceQuery.data} loading={traceQuery.isPending} />
        </TabsContent>
      </Tabs>
    </aside>
  );
}

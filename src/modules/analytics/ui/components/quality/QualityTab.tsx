"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isHttpError } from "@/core/api/problem";
import { useAuth } from "@/shared/auth/auth.hooks";
import { getEvaluation } from "@/modules/analytics/infrastructure/services/analytics-service.adapter";
import { useAnalyticsStore } from "@/modules/analytics/infrastructure/stores/analytics.store";
import type { EvaluationDTO } from "@/modules/analytics/domain/analytics";
import { QualityScoreCard } from "./QualityScoreCard";
import { TopIssuesCard } from "./TopIssuesCard";
import { AgentQualityTable } from "./AgentQualityTable";
import {
  DEFAULT_EVALUATION_FILTERS,
  EvaluationsTable,
  type EvaluationFilters,
} from "./EvaluationsTable";
import { EvaluationSheet } from "./EvaluationSheet";
import { EvaluationActions } from "./EvaluationActions";
import { JudgeAgreementCard } from "./JudgeAgreementCard";
import { StaggerIn } from "@/modules/analytics/ui/components/StaggerIn";

/**
 * Tab Calidad: el plano del LLM-judge. El disclaimer permanente ES el
 * principio rector en la UI — juicio para mejorar, no cifras de negocio.
 * Las acciones (calibrar, re-evaluar) solo se renderizan con `analytics:manage`.
 */
export function QualityTab({
  initialIssueCode,
  initialEvalConversationId,
}: {
  /** Deep-link `?issue=` o cross-link desde el top de problemas. */
  initialIssueCode?: string | null;
  /** Deep-link `?eval=<conversation_id>` (WS/alertas): abre el Sheet. */
  initialEvalConversationId?: string | null;
}) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("analytics:manage");

  const period = useAnalyticsStore((state) => state.period);
  const performance = useAnalyticsStore((state) => state.performance);
  const topIssues = useAnalyticsStore((state) => state.topIssues);
  const judgeAgreement = useAnalyticsStore((state) => state.judgeAgreement);
  const loadQuality = useAnalyticsStore((state) => state.loadQuality);
  const refreshJudgeAgreement = useAnalyticsStore((state) => state.refreshJudgeAgreement);
  const lastEvaluationCompleted = useAnalyticsStore(
    (state) => state.lastEvaluationCompleted,
  );

  const [filters, setFilters] = useState<EvaluationFilters>({
    ...DEFAULT_EVALUATION_FILTERS,
    issueCode: initialIssueCode ?? null,
  });
  const [selected, setSelected] = useState<EvaluationDTO | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notEvaluated, setNotEvaluated] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  // Deep-link `?eval=<conversation_id>`: fetch puntual y apertura del Sheet.
  // 404 = "sin evaluar" (estado, no error). Solo al primer montaje del tab.
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (!initialEvalConversationId || deepLinkHandled.current) return;
    deepLinkHandled.current = true;
    let cancelled = false;
    getEvaluation(initialEvalConversationId)
      .then((evaluation) => {
        if (cancelled) return;
        setSelected(evaluation);
        setNotEvaluated(false);
        setSheetOpen(true);
      })
      .catch((err) => {
        if (cancelled || !isHttpError(err) || err.status !== 404) return;
        setSelected(null);
        setNotEvaluated(true);
        setSheetOpen(true);
      });
    return () => {
      cancelled = true;
    };
  }, [initialEvalConversationId]);

  // WS `analytics.evaluation_completed`: si el Sheet abierto es de esa
  // conversación, fetch puntual del detalle (cierra el loop de re-evaluar);
  // la lista siempre se refresca (el resultado nuevo debe aparecer).
  const sheetConversationId = sheetOpen ? selected?.conversation_id : null;
  useEffect(() => {
    if (!lastEvaluationCompleted) return;
    setRefreshToken((token) => token + 1);
    if (sheetConversationId !== lastEvaluationCompleted.conversation_id) return;
    let cancelled = false;
    getEvaluation(lastEvaluationCompleted.conversation_id)
      .then((evaluation) => {
        if (!cancelled) {
          setSelected(evaluation);
          setNotEvaluated(false);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvaluationCompleted]);

  const agents = useMemo(
    () =>
      (performance.data?.agents ?? []).map((agent) => ({
        agent_id: agent.agent_id,
        name: agent.name,
      })),
    [performance.data],
  );

  const agentName = selected?.ai_agent_id
    ? (agents.find((agent) => agent.agent_id === selected.ai_agent_id)?.name ?? "Agente")
    : "Agente";

  const openEvaluation = (evaluation: EvaluationDTO) => {
    setSelected(evaluation);
    setNotEvaluated(false);
    setSheetOpen(true);
  };

  const handleCalibrated = () => {
    setRefreshToken((token) => token + 1);
    void refreshJudgeAgreement();
  };

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        Evaluaciones hechas por una IA supervisora. Son un juicio de calidad para
        mejorar, no cifras de negocio.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <StaggerIn index={0} className="lg:col-span-2">
          <QualityScoreCard
            section={performance}
            period={period}
            onRetry={() => void loadQuality()}
            className="h-full"
          />
        </StaggerIn>
        <StaggerIn index={1} className="lg:col-span-3">
          <TopIssuesCard
            section={topIssues}
            onIssueClick={(issueCode) => setFilters((prev) => ({ ...prev, issueCode }))}
            onRetry={() => void loadQuality()}
            className="h-full"
          />
        </StaggerIn>
      </div>

      <StaggerIn index={2}>
        <AgentQualityTable section={performance} onRetry={() => void loadQuality()} />
      </StaggerIn>

      <StaggerIn index={3}>
        <EvaluationsTable
          period={period}
          filters={filters}
          agents={agents}
          refreshToken={refreshToken}
          onFiltersChange={setFilters}
          onOpenEvaluation={openEvaluation}
        />
      </StaggerIn>

      <StaggerIn index={4}>
        <JudgeAgreementCard section={judgeAgreement} />
      </StaggerIn>

      <EvaluationSheet
        evaluation={selected}
        notEvaluated={notEvaluated}
        agentName={agentName}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        footer={
          canManage && selected ? (
            <EvaluationActions evaluation={selected} onCalibrated={handleCalibrated} />
          ) : undefined
        }
      />
    </div>
  );
}

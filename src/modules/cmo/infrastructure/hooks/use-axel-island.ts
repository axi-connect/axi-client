"use client";

import { useEffect, useMemo, useRef } from "react";
import { ArrowRight, Keyboard } from "lucide-react";

import type { BriefingDTO, CmoQuestionDTO } from "@/modules/cmo/domain/cmo";
import type { AxelNews } from "@/modules/cmo/infrastructure/stores/cmo.store";
import {
  useIslandQueue,
  type AssistantIslandQuestion,
  type AssistantIslandSummary,
} from "@/shared/components/features/assistant";

interface AxelIslandInput {
  /** Novedades del socket que la isla aún no contó. */
  news: AxelNews[];
  /** La isla las toma una a una: salen del store. */
  takeNews: (id: string) => void;
  /** El informe para el resumen. Si no está, se pide al tocar «Ver». */
  briefing: BriefingDTO | null;
  loadBriefing: () => Promise<BriefingDTO | null>;
  /** La pregunta viva del hilo (solo en /cmo), o `null`. */
  liveQuestion: { id: string; question: CmoQuestionDTO } | null;
  liveVisible: boolean;
  thinking: boolean;
  /** Chat vacío: manda el escenario L y lo que llegue espera (auditoría F1, N4). */
  empty: boolean;
  onPick: (label: string) => void;
  onWrite: () => void;
  /** «Ver propuestas» del resumen: el tablero (en /cmo) o /cmo (fuera). */
  onOpenBoard: () => void;
  /** «Ver» de una propuesta nueva. */
  onOpenProposal: (proposalId: string) => void;
}

/**
 * La isla de Axel (plan island_live_plan.md, F4 y F4b). Lo que hasta ahora se
 * tiraba —el titular del informe y el nombre de cada propuesta nueva— llega
 * como aviso con «Ver»; «Ver» del informe despliega el resumen en tres líneas,
 * que se puede escuchar. En /cmo, además, la pregunta viva sube a la isla
 * cuando su burbuja no se ve (D1).
 */
export function useAxelIsland(input: AxelIslandInput) {
  const { news, takeNews, briefing, loadBriefing, liveQuestion, liveVisible, thinking, empty, onPick, onWrite } = input;

  const question = useMemo<AssistantIslandQuestion | null>(() => {
    if (liveQuestion === null || liveVisible || thinking || empty) return null;
    const { question: asked } = liveQuestion;
    return {
      kind: "question",
      id: `question-${liveQuestion.id}`,
      eyebrow: "te pregunta",
      title: asked.question,
      speech: asked.question,
      actions: [
        ...asked.options.map((option, index) => ({
          id: `option-${String(index)}`,
          label: option.label,
          onSelect: () => {
            onPick(option.label);
          },
        })),
        ...(asked.allow_free_text ? [{ id: "write", label: "Escribir", icon: Keyboard, onSelect: onWrite }] : []),
      ],
    };
  }, [liveQuestion, liveVisible, thinking, empty, onPick, onWrite]);

  const queue = useIslandQueue({ question, paused: thinking || empty });
  const { push, dismiss } = queue;

  /* Las salidas se leen por ref: un callback nuevo no vuelve a empujar nada. */
  const latest = useRef({ briefing, loadBriefing, onOpenBoard: input.onOpenBoard, onOpenProposal: input.onOpenProposal });
  useEffect(() => {
    latest.current = { briefing, loadBriefing, onOpenBoard: input.onOpenBoard, onOpenProposal: input.onOpenProposal };
  });

  /* Cada novedad se cuenta UNA vez, aunque la lista llegue otra vez igual (un
     store que tarda en vaciarla, un render intermedio): sin esto, empujar
     re-renderiza, la lista vuelve y se empuja de nuevo. */
  const delivered = useRef(new Set<string>());
  useEffect(() => {
    for (const item of news) {
      takeNews(item.id);
      if (delivered.current.has(item.id)) continue;
      delivered.current.add(item.id);
      push({
        kind: "notice",
        id: item.id,
        glow: "ai",
        title: item.title,
        body: item.body,
        action: {
          id: "ver",
          label: "Ver",
          onSelect: () => {
            dismiss(item.id);
            if (item.kind === "proposal" && item.proposal_id !== null) {
              latest.current.onOpenProposal(item.proposal_id);
              return;
            }
            const show = (data: BriefingDTO | null) => {
              if (data === null) {
                latest.current.onOpenBoard();
                return;
              }
              push(summaryItem(data, latest.current.onOpenBoard));
            };
            const known = latest.current.briefing;
            if (known !== null && `briefing-${known.id}` === item.id) show(known);
            else void latest.current.loadBriefing().then(show).catch(() => { latest.current.onOpenBoard(); });
          },
        },
      });
    }
  }, [news, takeNews, push, dismiss]);

  return queue;
}

/** El resumen del informe: su frase y hasta tres señales, para leer o escuchar. */
export function summaryItem(briefing: BriefingDTO, onOpenBoard: () => void): AssistantIslandSummary {
  const highlights = briefing.highlights.slice(0, 3).map((line) => ({ label: line.label, detail: line.detail, tone: line.tone }));
  return {
    kind: "summary",
    id: `summary-${briefing.id}`,
    eyebrow: `Informe de hoy`,
    title: briefing.summary,
    highlights,
    speech: [briefing.summary, ...highlights.map((line) => `${line.label}: ${line.detail}.`)].join(" "),
    actions: [{ id: "board", label: "Ver propuestas", icon: ArrowRight, onSelect: onOpenBoard }],
  };
}

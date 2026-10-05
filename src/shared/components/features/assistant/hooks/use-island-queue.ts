"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AssistantIslandItem, AssistantIslandQuestion } from "../types";

/**
 * Un aviso sin botón se va solo a este plazo (DESIGN-SYSTEM §9.4: advertencia
 * 7 s). Se DESCARTA, no se pliega: estuvo en pantalla y se vio; dejarlo en el
 * punto hacía que la píldora acumulara «6 pendientes» de cosas ya leídas
 * (auditoría F1, M3). Solo lo que la persona pliega a mano queda en el punto.
 */
export const ISLAND_NOTICE_MS = 7000;

/** Prioridad de lo que la isla despliega: menor gana. */
const RANK: Record<AssistantIslandItem["kind"], number> = { question: 0, notice: 1, summary: 2 };

interface Entry {
  item: AssistantIslandItem;
  folded: boolean;
  /** Orden de llegada: a igual prioridad, lo más nuevo manda. */
  seq: number;
}

export interface IslandQueue {
  /** Lo que la isla despliega ahora, o `null` (la píldora). */
  current: AssistantIslandItem | null;
  /** Lo plegado que se puede volver a abrir: la píldora enseña el punto. */
  pending: number;
  /** Añade o reemplaza (mismo `id`) un aviso o un resumen, y lo despliega. */
  push: (item: AssistantIslandItem) => void;
  /** Lo saca de la cola. */
  dismiss: (id: string) => void;
  /** Pliega lo desplegado: queda en el punto. */
  fold: () => void;
  /** Despliega lo último que se plegó. */
  expand: () => void;
}

interface Options {
  /**
   * La pregunta viva cuando su burbuja NO está a la vista (decisión D1 del
   * dueño), o `null`. No se empuja: la deriva el slice de su estado, y la cola
   * solo recuerda si la persona la plegó.
   */
  question?: AssistantIslandQuestion | null;
  /** Mientras trabaja o dicta la isla tiene otra forma: los avisos esperan y su plazo no corre. */
  paused?: boolean;
}

/**
 * La cola de la isla: decide qué se despliega, sin enseñar nunca dos cosas.
 *
 * - Prioridad: pregunta > aviso > resumen; a igual prioridad, lo más reciente.
 * - Plegar deja el ítem en el punto de la píldora; tocarla lo vuelve a abrir.
 *   El aviso que se va solo, en cambio, se descarta: ya se vio.
 * - **Un solo timer**, y solo mientras hay un aviso sin botón desplegado y la
 *   pestaña está visible: en reposo la isla no tiene nada corriendo (§6).
 */
export function useIslandQueue({ question = null, paused = false }: Options = {}): IslandQueue {
  const [entries, setEntries] = useState<readonly Entry[]>([]);
  const [foldedQuestion, setFoldedQuestion] = useState<string | null>(null);
  const seqRef = useRef(0);

  const questionOpen = question !== null && foldedQuestion !== question.id;
  const open = useMemo(() => pickOpen(entries), [entries]);
  const current: AssistantIslandItem | null = questionOpen ? question : (open?.item ?? null);

  const pending =
    entries.filter((entry) => entry.folded).length + (question !== null && foldedQuestion === question.id ? 1 : 0);

  const push = useCallback((item: AssistantIslandItem) => {
    seqRef.current += 1;
    const seq = seqRef.current;
    setEntries((list) => [...list.filter((entry) => entry.item.id !== item.id), { item, folded: false, seq }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    // Sin nada que quitar, el MISMO array: descartar lo que no está no puede
    // provocar un render (ni, desde un efecto, un bucle de ellos).
    setEntries((list) =>
      list.some((entry) => entry.item.id === id) ? list.filter((entry) => entry.item.id !== id) : list,
    );
  }, []);

  const fold = useCallback(() => {
    if (questionOpen) {
      setFoldedQuestion(question.id);
      return;
    }
    setEntries((list) => {
      const target = pickOpen(list);
      return target === null ? list : list.map((entry) => (entry === target ? { ...entry, folded: true } : entry));
    });
  }, [question, questionOpen]);

  const expand = useCallback(() => {
    if (question !== null && foldedQuestion === question.id) {
      setFoldedQuestion(null);
      return;
    }
    setEntries((list) => {
      const folded = list.filter((entry) => entry.folded);
      const last = folded.reduce<Entry | null>((best, entry) => (best === null || entry.seq > best.seq ? entry : best), null);
      if (last === null) return list;
      seqRef.current += 1;
      const seq = seqRef.current;
      return list.map((entry) => (entry === last ? { ...entry, folded: false, seq } : entry));
    });
  }, [question, foldedQuestion]);

  /* El plazo del aviso: un solo `setTimeout`, que se cancela al cambiar lo
     desplegado, al pausar y al ocultar la pestaña (vuelve a contar al volver). */
  const timedId =
    current !== null && current.kind === "notice" && current.action === undefined && !paused ? current.id : null;
  const timedMs = current !== null && current.kind === "notice" ? (current.autoCloseMs ?? ISLAND_NOTICE_MS) : 0;
  useEffect(() => {
    if (timedId === null) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const arm = () => {
      if (timer !== null || document.visibilityState === "hidden") return;
      timer = setTimeout(() => {
        timer = null;
        setEntries((list) => list.filter((entry) => entry.item.id !== timedId));
      }, timedMs);
    };
    const disarm = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") disarm();
      else arm();
    };
    arm();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disarm();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [timedId, timedMs]);

  return { current, pending, push, dismiss, fold, expand };
}

function pickOpen(entries: readonly Entry[]): Entry | null {
  let best: Entry | null = null;
  for (const entry of entries) {
    if (entry.folded) continue;
    if (
      best === null ||
      RANK[entry.item.kind] < RANK[best.item.kind] ||
      (RANK[entry.item.kind] === RANK[best.item.kind] && entry.seq > best.seq)
    ) {
      best = entry;
    }
  }
  return best;
}

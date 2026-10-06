"use client";

import { useEffect, useMemo, useState } from "react";
import { errorMessage } from "@/core/lib/error-messages";
import type { HsmTemplateDTO } from "@/modules/marketing/domain/template-catalog";
import {
  categoryAction,
  remapExamples,
  reviewDraftOf,
  type TemplateCategoryReview,
  type UtilityRewrite,
} from "@/modules/marketing/domain/template-category-review";
import type { TemplateButton } from "@/modules/marketing/domain/template-pieces";
import {
  useJevCategoryReview,
  type JevReviewStatus,
} from "@/modules/marketing/infrastructure/hooks/use-jev-category-review";
import { proposeUtilityRewrite } from "@/modules/marketing/infrastructure/services/templates-service.adapter";

type Category = HsmTemplateDTO["category"];

/** Lo más que se espera a Jev al enviar: si tarda más, se envía sin su opinión. */
const SUBMIT_WAIT_MS = 2_500;

export type RewriteState =
  | { kind: "closed" }
  | { kind: "loading" }
  | { kind: "ready"; proposal: UtilityRewrite }
  | { kind: "empty" }
  | { kind: "error"; message: string };

/** Lo que la píldora de la isla tiene que decir. */
export type JevPillState =
  | { kind: "waiting" }
  | { kind: "reading" }
  | { kind: "agrees"; review: TemplateCategoryReview }
  | { kind: "differs"; review: TemplateCategoryReview }
  | { kind: "switched"; review: TemplateCategoryReview };

/**
 * Jev en el constructor (hotfix 131049, maqueta v2 aprobada el 2026-10-06).
 * Orquesta lo que la página hace con su revisión, sin tocar cómo se arma el
 * borrador (`useHsmTemplateDraft`):
 *
 * - **Categoría automática**: si el usuario no la eligió y Jev está seguro,
 *   la cambia y lo dice con «Deshacer». Si la eligió, solo propone.
 * - **Versión de utilidad**: a pedido; «Aplicar» reemplaza cuerpo y pie,
 *   conserva el ejemplo de cada variable que queda y pasa a utilidad.
 * - **Al enviar**: si Jev la ve de otra categoría, una pregunta en la isla.
 *   Avisa, nunca bloquea: Meta decide.
 */
export function useJevAdvisor({
  headerText,
  body,
  footer,
  buttons,
  examples,
  category,
  locked,
  isEditing,
  invalid,
  setBody,
  setFooter,
  setExamples,
  setCategory,
  submit,
}: {
  headerText: string | null;
  body: string;
  footer: string | null;
  buttons: readonly TemplateButton[];
  examples: readonly string[];
  category: Category;
  /** Aprobada: Meta no deja cambiar su categoría. */
  locked: boolean;
  isEditing: boolean;
  /** El formulario tiene errores: el envío los enseña antes que a Jev. */
  invalid: boolean;
  setBody: (body: string) => void;
  setFooter: (footer: string | null) => void;
  setExamples: (examples: string[]) => void;
  setCategory: (category: Category) => void;
  submit: () => Promise<void>;
}) {
  const draft = useMemo(
    () => reviewDraftOf({ headerText, body, footer, buttons }),
    [headerText, body, footer, buttons],
  );
  const { status, review, flush, ensureFresh } = useJevCategoryReview(draft);

  // Al editar, la categoría ya la decidió alguien: Jev no la cambia solo.
  const [touched, setTouched] = useState(isEditing);
  const [switchedFrom, setSwitchedFrom] = useState<Category | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [rewrite, setRewrite] = useState<RewriteState>({ kind: "closed" });
  const [confirming, setConfirming] = useState(false);

  const current = status === "ready" ? review : null;
  const action = current === null ? "none" : categoryAction({ current: category, review: current, touched, locked });

  useEffect(() => {
    if (action !== "auto" || current === null) return;
    setSwitchedFrom(category);
    setCategory(current.category);
    // Solo cuando llega un veredicto nuevo; `category` cambia aquí mismo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, current?.review_key]);

  // Una pregunta de envío pendiente deja de valer si cambia lo que se envía.
  useEffect(() => setConfirming(false), [category, current?.review_key]);

  const pill: JevPillState = pillState(status, review, category, switchedFrom);

  /** El usuario eligió en «¿Para qué es?»: desde aquí Jev solo propone. */
  function pickCategory(next: Category) {
    setTouched(true);
    setSwitchedFrom(null);
    setCategory(next);
  }

  function undoSwitch() {
    if (switchedFrom === null) return;
    pickCategory(switchedFrom);
  }

  function adoptReviewedCategory() {
    if (review === null || locked) return;
    pickCategory(review.category);
    setPanelOpen(false);
  }

  async function requestRewrite() {
    setPanelOpen(false);
    setRewrite({ kind: "loading" });
    try {
      const proposal = await proposeUtilityRewrite(draft);
      setRewrite(proposal === null ? { kind: "empty" } : { kind: "ready", proposal });
    } catch (error) {
      setRewrite({
        kind: "error",
        message: errorMessage(error, "Jev no pudo escribir la propuesta. Inténtalo en un momento"),
      });
    }
  }

  function applyRewrite() {
    if (rewrite.kind !== "ready") return;
    const { proposal } = rewrite;
    setBody(proposal.body);
    setFooter(proposal.footer);
    setExamples(remapExamples(examples, proposal.variables));
    if (!locked) pickCategory("utility");
    setRewrite({ kind: "closed" });
  }

  /**
   * «Enviar»: con errores, el formulario los enseña primero. Si Jev la ve de
   * otra categoría (con certeza), la isla pregunta antes; si Jev tarda, se
   * envía sin esperarlo.
   */
  async function guardedSubmit() {
    if (invalid || locked) return submit();
    const fresh = await Promise.race([
      ensureFresh(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), SUBMIT_WAIT_MS)),
    ]);
    if (fresh !== null && fresh.confident && fresh.category !== category && fresh.category !== "authentication") {
      setConfirming(true);
      return;
    }
    return submit();
  }

  function confirmSubmit() {
    setConfirming(false);
    void submit();
  }

  function reviewBeforeSubmit() {
    setConfirming(false);
    setPanelOpen(true);
  }

  return {
    pill,
    review,
    category,
    locked,
    flush,
    panelOpen,
    setPanelOpen,
    pickCategory,
    undoSwitch,
    adoptReviewedCategory,
    rewrite,
    requestRewrite,
    applyRewrite,
    closeRewrite: () => setRewrite({ kind: "closed" }),
    confirming,
    guardedSubmit,
    confirmSubmit,
    reviewBeforeSubmit,
  };
}

export type JevAdvisor = ReturnType<typeof useJevAdvisor>;

function pillState(
  status: JevReviewStatus,
  review: TemplateCategoryReview | null,
  category: Category,
  switchedFrom: Category | null,
): JevPillState {
  if (status === "reviewing") return { kind: "reading" };
  if (status !== "ready" && status !== "unavailable") return { kind: "waiting" };
  if (review === null) return { kind: "waiting" };
  if (review.category !== category) return { kind: "differs", review };
  if (switchedFrom !== null && switchedFrom !== category) return { kind: "switched", review };
  return { kind: "agrees", review };
}

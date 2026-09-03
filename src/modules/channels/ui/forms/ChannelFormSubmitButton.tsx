"use client";

import { LoaderCircle } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

/**
 * El botón que envía un `ChannelForm` desde FUERA del `<form>`.
 *
 * Usa el atributo `form` del botón —HTML a secas— en vez de
 * `document.getElementById(...).requestSubmit()`: tres hosts tenían esa línea
 * copiada, ninguno sabía si el formulario estaba enviando, y dos de ellos
 * podían convivir en el DOM con el mismo id. Se pinta desde `renderSubmit`,
 * que es quien conoce `formId` y `submitting`.
 */
export function ChannelFormSubmitButton({
  formId,
  submitting,
  children,
  variant = "outline",
}: {
  formId: string;
  submitting: boolean;
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  return (
    <Button type="submit" form={formId} variant={variant} disabled={submitting}>
      {submitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
      {children}
    </Button>
  );
}

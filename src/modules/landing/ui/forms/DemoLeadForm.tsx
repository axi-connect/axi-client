"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";

import { salesWhatsAppUrl } from "@/core/config/env";
import { track } from "@/core/analytics/track";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { createDemoLead } from "@/modules/landing/infrastructure/services/lead-service.adapter";
import type { MonthlyConversationRange } from "@/modules/landing/domain/lead";
import {
  defaultDemoLeadFormValues,
  demoLeadFormSchema,
  MONTHLY_CONVERSATION_OPTIONS,
  monthlyConversationLabel,
  toDemoLeadPayload,
  type DemoLeadFormValues,
} from "@/modules/landing/ui/forms/config/demo-lead.config";
import {
  buildDemoLeadWaText,
  FINAL_CTA,
} from "@/modules/landing/ui/content/landing.content";

/**
 * Formulario "Agenda tu demo" (§11): 4 campos, ni uno más.
 * El submit valida, registra el lead (adapter con TODO de `POST /leads`) y
 * convierte por la vía real de hoy: abre WhatsApp con el mensaje prellenado.
 */
export function DemoLeadForm() {
  const { form } = FINAL_CTA;
  const [submitted, setSubmitted] = useState(false);
  const successRef = useRef<HTMLDivElement | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DemoLeadFormValues>({
    resolver: zodResolver(demoLeadFormSchema),
    defaultValues: defaultDemoLeadFormValues,
  });
  const volume = watch("monthly_conversations");

  const onSubmit = handleSubmit(async (values) => {
    await createDemoLead(toDemoLeadPayload(values));
    const waText = buildDemoLeadWaText({
      name: values.name,
      businessName: values.business_name,
      whatsapp: values.whatsapp,
      volumeLabel: monthlyConversationLabel(values.monthly_conversations),
    });
    // Única instrumentación explícita del sitio: la delegación de clics de
    // `core/analytics/outbound.ts` cubre los enlaces `wa.me`, pero esto es un
    // `window.open`, no un clic sobre un `<a>`, así que no lo ve.
    track({ name: "demo_form_submit", params: { volume: values.monthly_conversations } });
    window.open(salesWhatsAppUrl(waText), "_blank", "noopener");
    setSubmitted(true);
    requestAnimationFrame(() => successRef.current?.focus());
  });

  if (submitted) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="flex h-full min-h-72 flex-col items-start justify-center gap-3 outline-none"
      >
        <h3 className="font-heading text-xl font-bold">{form.successTitle}</h3>
        <p className="text-muted-foreground text-[15px] leading-relaxed">{form.successBody}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" aria-live="polite">
      <h3 className="text-xl font-semibold">{form.title}</h3>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lead-name" className="sr-only">
          Nombre
        </Label>
        <Input
          id="lead-name"
          placeholder={form.namePlaceholder}
          autoComplete="name"
          aria-invalid={!!errors.name}
          className="h-12"
          {...register("name")}
        />
        {errors.name ? <p className="text-destructive text-xs">{errors.name.message}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lead-business" className="sr-only">
          Nombre de tu negocio
        </Label>
        <Input
          id="lead-business"
          placeholder={form.businessPlaceholder}
          autoComplete="organization"
          aria-invalid={!!errors.business_name}
          className="h-12"
          {...register("business_name")}
        />
        {errors.business_name ? (
          <p className="text-destructive text-xs">{errors.business_name.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lead-whatsapp" className="sr-only">
          WhatsApp
        </Label>
        <Input
          id="lead-whatsapp"
          type="tel"
          placeholder={form.whatsappPlaceholder}
          autoComplete="tel"
          aria-invalid={!!errors.whatsapp}
          className="h-12"
          {...register("whatsapp")}
        />
        {errors.whatsapp ? (
          <p className="text-destructive text-xs">{errors.whatsapp.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lead-volume" className="text-muted-foreground text-sm font-normal">
          {form.volumeLabel}
        </Label>
        <Select
          value={volume}
          onValueChange={(value) =>
            setValue("monthly_conversations", value as MonthlyConversationRange, {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger id="lead-volume" className="h-12 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHLY_CONVERSATION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" size="lg" disabled={isSubmitting} className="mt-1.5 h-12 text-base">
        {isSubmitting ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
        {form.submit}
      </Button>
      <p className="text-muted-foreground text-center text-[13px]">{form.microcopy}</p>
    </form>
  );
}

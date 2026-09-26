"use client";

import { useMemo } from "react";
import { useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, TriangleAlert } from "lucide-react";

import { useRadioGroup } from "@/core/hooks/use-radio-group";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import {
  BentoTile,
  InkIsland,
  Kicker,
} from "@/shared/components/features/bento";
import { UnsavedChangesDock } from "@/shared/components/features/island";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { automationStory } from "@/modules/documents/domain/automation";
import type {
  DocumentTypeView,
  DocumentsSettingsDTO,
} from "@/modules/documents/domain/template";
import { updateDocumentsSettings } from "@/modules/documents/infrastructure/services/documents-service.adapter";
import { PaperMark } from "@/modules/documents/ui/components/list/PaperMark";
import {
  CONTRACT_ISSUE_LABELS,
  CONTRACT_ISSUE_OPTIONS,
  documentSettingsSchema,
  fromSettingsDto,
  numberingExample,
  toSettingsPayload,
  type ContractIssue,
  type DocumentSettingsFormValues,
} from "./config/document-settings.config";

type Values = DocumentSettingsFormValues;
type SendField =
  | "send_contract_whatsapp"
  | "send_contract_email"
  | "send_receipt_whatsapp"
  | "send_receipt_email";

/**
 * Automáticos (F9 Cobros, premium P8): lo que se emite y se envía solo. Cuándo
 * sale el contrato, el recibo con cada pago, por dónde se manda lo que sale
 * solo y la plantilla de respaldo de WhatsApp. La isla «Lo que sale solo»
 * cuenta el BORRADOR como lo que le pasa a una reserva de principio a fin.
 *
 * Comparte esquema y payload con «Emisor y numeración»: el emisor y los
 * prefijos viajan tal como están guardados (el PUT es de sección).
 */
export function DocumentAutomationForm({
  settings,
  types,
  onSaved,
}: {
  settings: DocumentsSettingsDTO;
  types: readonly DocumentTypeView[];
  onSaved: (next: DocumentsSettingsDTO) => void;
}) {
  const { showAlert } = useAlert();
  const defaults = useMemo(
    () => fromSettingsDto(settings, types),
    [settings, types],
  );
  const form = useForm<Values>({
    resolver: zodResolver(documentSettingsSchema),
    defaultValues: defaults,
  });
  const { isDirty, isSubmitting, errors } = form.formState;
  const set = (name: keyof Values, value: Values[keyof Values]) =>
    form.setValue(name, value as never, {
      shouldDirty: true,
      shouldValidate: true,
    });

  async function save(values: Values) {
    try {
      const saved = await updateDocumentsSettings(
        toSettingsPayload(values, settings),
      );
      form.reset(fromSettingsDto(saved, types));
      onSaved(saved);
      showAlert({
        tone: "success",
        title: "Automáticos guardados",
        description:
          "Actúan sobre lo que se emita desde ahora; lo ya emitido no se reenvía solo.",
      });
    } catch (error) {
      if (!applyServerValidation(error, form)) {
        showAlert({
          tone: "error",
          title: "No se pudo guardar",
          description: errorMessage(error),
        });
      }
    }
  }

  return (
    <Form {...form}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(save)}
        onReset={(event) => {
          event.preventDefault();
          form.reset();
        }}
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="flex min-w-0 flex-col gap-4">
            <IssueTile control={form.control} set={set} />
            <SendTile control={form.control} set={set} />
            <HsmTile control={form.control} />
          </div>
          <StoryIsland control={form.control} settings={settings} />
        </div>
        <UnsavedChangesDock
          dirty={isDirty}
          submitting={isSubmitting}
          invalid={Object.keys(errors).length > 0}
          detail="Actúa sobre lo que se emita desde ahora."
          submitLabel="Guardar ajustes"
        />
      </form>
    </Form>
  );
}

type Setter = (name: keyof Values, value: Values[keyof Values]) => void;

function IssueTile({
  control,
  set,
}: {
  control: Control<Values>;
  set: Setter;
}) {
  const [issue, receipt] = useWatch({
    control,
    name: ["contract_issue", "receipt_on_payment_verified"],
  });
  const radio = useRadioGroup(CONTRACT_ISSUE_OPTIONS, issue, (next) =>
    set("contract_issue", next),
  );
  return (
    <BentoTile
      label="Cuándo sale el contrato"
      aside={
        <span className="text-xs text-muted-foreground">Uno por reserva</span>
      }
    >
      {/* Tres columnas solo si la ficha es ancha: con la isla al lado mide la
          mitad de la ventana (container query). */}
      <div className="@container">
        <div
          role="radiogroup"
          aria-label="Cuándo se emite el contrato"
          className="grid gap-2.5 @2xl:grid-cols-3"
        >
          {CONTRACT_ISSUE_OPTIONS.map((option: ContractIssue) => {
            const checked = issue === option;
            const copy = CONTRACT_ISSUE_LABELS[option];
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={checked}
                {...radio(option)}
                onClick={() => set("contract_issue", option)}
                className={cn(
                  "relative flex flex-col gap-1.5 rounded-2xl border border-border bg-background px-3.5 py-3.5 text-left transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  checked &&
                    "border-foreground ring-1 ring-foreground ring-inset",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-3 right-3 grid size-[18px] place-items-center rounded-full border-[1.5px] border-border",
                    checked &&
                      "border-foreground bg-foreground text-background",
                  )}
                >
                  {checked ? <Check className="size-[11px]" /> : null}
                </span>
                <span className="pr-6 text-sm font-semibold tracking-[-0.005em]">
                  {copy.title}
                </span>
                <span className="text-[12.5px] leading-[1.45] text-muted-foreground">
                  {copy.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between gap-5 border-t border-border pt-3.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Recibo automático</p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
            Con cada pago verificado sale un recibo a nombre del cliente; no se
            emite a mano.
          </p>
        </div>
        <Switch
          size="lg"
          checked={receipt}
          onCheckedChange={(on) => set("receipt_on_payment_verified", on)}
          aria-label="Recibo automático"
        />
      </div>
    </BentoTile>
  );
}

/**
 * «Y se envía solo»: contrato y recibo × WhatsApp y correo. SOLO gobiernan lo
 * que se emite solo; lo manual pasa por el diálogo «Enviar». WhatsApp sin
 * plantilla de respaldo avisa aquí, donde se decide.
 */
function SendTile({ control, set }: { control: Control<Values>; set: Setter }) {
  const [issue, receipt, cw, ce, rw, re, hsm] = useWatch({
    control,
    name: [
      "contract_issue",
      "receipt_on_payment_verified",
      "send_contract_whatsapp",
      "send_contract_email",
      "send_receipt_whatsapp",
      "send_receipt_email",
      "hsm_name",
    ],
  });
  const rows: {
    code: "contract" | "receipt";
    label: string;
    hint: string;
    whatsapp: [SendField, boolean];
    email: [SendField, boolean];
  }[] = [
    {
      code: "contract",
      label: "Contrato",
      hint: issue === "never" ? "No sale solo" : "Al quedar listo",
      whatsapp: ["send_contract_whatsapp", cw],
      email: ["send_contract_email", ce],
    },
    {
      code: "receipt",
      label: "Recibo",
      hint: receipt ? "Al quedar listo" : "No sale solo",
      whatsapp: ["send_receipt_whatsapp", rw],
      email: ["send_receipt_email", re],
    },
  ];
  const noHsm = hsm.trim() === "" && (cw || rw);
  return (
    <BentoTile
      label="Y se envía solo"
      aside={
        <span className="text-right text-xs text-muted-foreground">
          Lo que emites tú pasa por «Enviar»
        </span>
      }
    >
      <div
        aria-hidden="true"
        className="grid grid-cols-[minmax(0,1fr)_76px_76px] gap-x-3 text-xs text-muted-foreground sm:grid-cols-[minmax(0,1fr)_112px_112px]"
      >
        <span />
        <span className="text-center">Por WhatsApp</span>
        <span className="text-center">Por correo</span>
      </div>
      <ul className="m-0 list-none p-0">
        {rows.map((row) => (
          <li
            key={row.code}
            className="grid grid-cols-[minmax(0,1fr)_76px_76px] items-center gap-x-3 border-t border-border py-3 sm:grid-cols-[minmax(0,1fr)_112px_112px]"
          >
            <span className="flex min-w-0 items-center gap-3">
              <PaperMark typeCode={row.code} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{row.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {row.hint}
                </span>
              </span>
            </span>
            {[row.whatsapp, row.email].map(([name, checked], index) => (
              <span key={name} className="flex justify-center">
                <Switch
                  size="lg"
                  checked={checked}
                  onCheckedChange={(on) => set(name, on)}
                  aria-label={`${row.label} · ${index === 0 ? "WhatsApp" : "correo"}`}
                />
              </span>
            ))}
          </li>
        ))}
      </ul>
      {noHsm ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <AlertDescription className="text-[12.5px]">
            Fuera de las 24 h, por WhatsApp no saldrá el PDF hasta que
            configures la plantilla de respaldo.
          </AlertDescription>
        </Alert>
      ) : null}
    </BentoTile>
  );
}

function HsmTile({ control }: { control: Control<Values> }) {
  return (
    <BentoTile label="Plantilla de respaldo">
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        WhatsApp solo deja escribir libremente durante 24 h desde el último
        mensaje del cliente. Pasadas, sale esta plantilla aprobada de Meta y{" "}
        <b className="font-medium whitespace-nowrap text-foreground">
          el PDF cuando responda
        </b>
        .
      </p>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
        <FormField
          control={control}
          name="hsm_name"
          render={({ field }) => (
            <FormItem className="min-w-0 content-start">
              <FormLabel>Nombre de la plantilla en Meta</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="documento_listo"
                  className="font-mono text-[13px]"
                  autoComplete="off"
                  maxLength={512}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="hsm_language"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Idioma</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="es"
                  className="font-mono text-[13px]"
                  autoComplete="off"
                  maxLength={5}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        Tiene que ser una plantilla{" "}
        <b className="font-medium text-foreground">sin variables</b>: su texto
        debe valer para cualquier documento («tu documento está listo;
        respóndenos y te lo enviamos»). Vacío = fuera de las 24 h no se manda
        nada, y la fila del pedido lo dice.
      </p>
    </BentoTile>
  );
}

/**
 * «Lo que sale solo»: la reserva de ejemplo de principio a fin según el
 * borrador (`automationStory`). Cristal con brillo de marca: lo hace el
 * sistema, no el agente.
 */
function StoryIsland({
  control,
  settings,
}: {
  control: Control<Values>;
  settings: DocumentsSettingsDTO;
}) {
  const values = useWatch({ control }) as Values;
  const nextFor = (code: "contract" | "receipt") => {
    const state = settings.numbering.next[code];
    return numberingExample({
      prefix: settings.numbering.prefixes[code] ?? "",
      fallbackPrefix: settings.prefix_defaults[code] ?? "",
      startAt: "",
      started: true,
      nextValue: state?.next_value ?? 1,
    });
  };
  const story = automationStory(
    {
      contract_issue: values.contract_issue,
      receipt_on_payment_verified: values.receipt_on_payment_verified,
      send_contract_whatsapp: values.send_contract_whatsapp,
      send_contract_email: values.send_contract_email,
      send_receipt_whatsapp: values.send_receipt_whatsapp,
      send_receipt_email: values.send_receipt_email,
      hsm_name: values.hsm_name ?? "",
    },
    { contract: nextFor("contract"), receipt: nextFor("receipt") },
  );
  return (
    <InkIsland
      label="Lo que sale solo"
      className="gap-4 self-start p-5 md:p-6 xl:sticky xl:top-6"
    >
      <div className="flex flex-col gap-1.5">
        <Kicker>Lo que sale solo</Kicker>
        <p className="font-heading text-xl leading-tight font-bold tracking-tight md:text-2xl">
          Una reserva, de principio a fin
        </p>
        <p className="text-[12.5px] text-muted-foreground">{story.summary}</p>
      </div>
      <ol className="m-0 flex list-none flex-col p-0">
        {story.steps.map((step) => (
          <li
            key={step.key}
            className="grid grid-cols-[30px_minmax(0,1fr)] gap-3 border-t border-border py-3"
          >
            <span className="flex justify-center pt-0.5">
              {step.issues ? (
                <PaperMark typeCode={step.key} />
              ) : (
                <span
                  aria-hidden="true"
                  className="block h-[38px] w-[30px] rounded-[3px] border-[1.5px] border-dashed border-border"
                />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-[11.5px] text-muted-foreground">
                {step.when}
              </span>
              <span className="mt-0.5 block text-sm font-semibold">
                {step.what}
              </span>
              <span className="mt-0.5 block text-[12.5px] leading-relaxed text-foreground/80">
                {step.how}
              </span>
            </span>
          </li>
        ))}
      </ol>
      {story.whatsappGap ? (
        <p className="rounded-2xl border border-dashed border-border px-3.5 py-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
          Si el cliente lleva más de 24 h sin escribir, por WhatsApp{" "}
          <b className="font-medium text-foreground">no sale</b>: falta la
          plantilla de respaldo.
        </p>
      ) : null}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Lo que emites a mano no sale solo: pasa por «Enviar», que dice antes lo
        que va a pasar.
      </p>
    </InkIsland>
  );
}

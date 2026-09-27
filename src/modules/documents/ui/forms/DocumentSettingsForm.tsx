"use client";

import { useMemo } from "react";
import { useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";

import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import {
  BentoTile,
  InkIsland,
  Kicker,
} from "@/shared/components/features/bento";
import { UnsavedChangesDock } from "@/shared/components/features/island";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { issuerLines } from "@/modules/documents/domain/issuer";
import type {
  DocumentTypeView,
  DocumentsSettingsDTO,
} from "@/modules/documents/domain/template";
import { updateDocumentsSettings } from "@/modules/documents/infrastructure/services/documents-service.adapter";
import { PaperMark } from "@/modules/documents/ui/components/list/PaperMark";
import {
  documentSettingsSchema,
  fromSettingsDto,
  numberingExample,
  toSettingsPayload,
  type DocumentSettingsFormValues,
} from "./config/document-settings.config";

type Values = DocumentSettingsFormValues;

/**
 * Emisor y numeración (F7 Cobros, premium P6): quién firma los papeles y cómo
 * se numeran. Dos fichas —«Quién emite» y «Numeración»— y la isla «Así firma
 * tus papeles», que lee el BORRADOR y dice lo que imprimirá el bloque
 * «Partes». Lo vacío cae a la ficha de Mi empresa; el NIT y el isotipo siempre
 * salen de allí. Los prefijos no reinician la cuenta.
 *
 * Comparte esquema y payload con la pestaña Automáticos: el PUT es de sección
 * y los automáticos viajan tal como están guardados.
 */
export function DocumentSettingsForm({
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
  const issuable = types.filter((type) => type.issuable);
  const company = settings.company_defaults;

  async function save(values: Values) {
    try {
      const saved = await updateDocumentsSettings(
        toSettingsPayload(values, settings),
      );
      form.reset(fromSettingsDto(saved, types));
      onSaved(saved);
      showAlert({
        tone: "success",
        title: "Ajustes de documentos guardados",
        description:
          "Se aplican a los documentos que se emitan desde ahora; lo ya emitido conserva su emisor y su número.",
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

  const text = (
    name: keyof Pick<
      Values,
      "legal_name" | "tax_id_label" | "address" | "city" | "phone" | "email"
    >,
    label: string,
    description: string,
    extra: { placeholder?: string; type?: string } = {},
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="min-w-0 content-start">
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} {...extra} autoComplete="off" />
          </FormControl>
          <FormDescription>{description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

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
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-4">
            <BentoTile
              label="Quién emite"
              aside={
                <span className="text-xs text-muted-foreground">
                  Lo vacío cae a Mi empresa
                </span>
              }
            >
              {/* Por el ancho de la ficha, no el de la ventana: con la isla al lado
                  la ficha mide la mitad (container query). */}
              <div className="@container">
                <div className="grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-3.5 @lg:grid-cols-2 @4xl:grid-cols-3">
                  {text(
                    "legal_name",
                    "Razón social",
                    "Vacío: sale el nombre del negocio.",
                    { placeholder: company.name },
                  )}
                  {text(
                    "tax_id_label",
                    "Etiqueta del NIT",
                    `Se imprime delante de ${company.nit}: «NIT», «RUT», «CIF»…`,
                  )}
                  {text("address", "Dirección", "Vacío: la de Mi empresa.", {
                    placeholder:
                      company.address ?? "Sin dirección en Mi empresa",
                  })}
                  {text("city", "Ciudad", "Vacío: la de Mi empresa.", {
                    placeholder: company.city ?? "Sin ciudad en Mi empresa",
                  })}
                  {text("phone", "Teléfono", "Sale en «Partes».", {
                    type: "tel",
                  })}
                  {text("email", "Correo", "Sale en «Partes».", {
                    type: "email",
                  })}
                  <FormField
                    control={form.control}
                    name="footer_note"
                    render={({ field }) => (
                      <FormItem className="min-w-0 content-start @lg:col-span-2 @4xl:col-span-3">
                        <FormLabel>Nota al pie del correo</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} />
                        </FormControl>
                        {/* El servidor la pone al pie del correo de envío (F9), no en el PDF. */}
                        <FormDescription>
                          Una línea al final del correo con que se envía cada
                          documento. El PDF no la lleva.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </BentoTile>

            <BentoTile
              label="Numeración"
              aside={
                <span className="text-xs text-muted-foreground">
                  Prefijo · siguiente número · cómo sale
                </span>
              }
            >
              <ul className="@container m-0 list-none p-0">
                {issuable.map((type) => (
                  <NumberingRow
                    key={type.code}
                    type={type}
                    control={form.control}
                    fallbackPrefix={
                      settings.prefix_defaults[
                        type.code as keyof typeof settings.prefix_defaults
                      ] ?? type.default_prefix
                    }
                    state={
                      settings.numbering.next[
                        type.code as keyof typeof settings.numbering.next
                      ]
                    }
                  />
                ))}
              </ul>
              <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                Los prefijos son por tipo y{" "}
                <strong className="font-medium text-foreground">
                  no reinician la cuenta
                </strong>
                : lo que ya salió conserva su número. El siguiente número solo
                se fija{" "}
                <strong className="font-medium text-foreground">antes</strong>{" "}
                de emitir el primero de cada tipo; después, el consecutivo ya es
                un hecho.
              </p>
            </BentoTile>
          </div>

          <IssuerIsland
            control={form.control}
            company={company}
            types={issuable}
            settings={settings}
          />
        </div>

        <UnsavedChangesDock
          dirty={isDirty}
          submitting={isSubmitting}
          invalid={Object.keys(errors).length > 0}
          detail="Se aplica a lo que se emita desde ahora."
          submitLabel="Guardar ajustes"
        />
      </form>
    </Form>
  );
}

type NumberState =
  DocumentsSettingsDTO["numbering"]["next"][keyof DocumentsSettingsDTO["numbering"]["next"]];

/** Una fila por tipo: papelito, prefijo, siguiente número (o candado) y cómo sale. */
function NumberingRow({
  type,
  control,
  fallbackPrefix,
  state,
}: {
  type: DocumentTypeView;
  control: Control<Values>;
  fallbackPrefix: string;
  state: NumberState | undefined;
}) {
  const started = state?.started === true;
  const nextValue = state?.next_value ?? 1;
  const [prefix, startAt] = useWatch({
    control,
    name: [`prefixes.${type.code}`, `start_at.${type.code}`] as const,
  }) as [string | undefined, string | undefined];
  const example = numberingExample({
    prefix: prefix ?? "",
    fallbackPrefix,
    startAt: startAt ?? "",
    started,
    nextValue,
  });
  return (
    <li className="grid grid-cols-[30px_minmax(0,1fr)] items-start gap-x-3.5 gap-y-2.5 border-t border-border py-3 first:border-t-0 first:pt-0 @2xl:grid-cols-[30px_minmax(0,1fr)_92px_128px_132px] @2xl:items-center">
      <PaperMark typeCode={type.code} />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{type.label}</p>
        <p className="text-xs text-muted-foreground">
          {started
            ? "Ya salió el primero: la cuenta sigue sola."
            : "Aún no sale el primero: fija desde dónde cuenta."}
        </p>
      </div>
      <FormField
        control={control}
        name={`prefixes.${type.code}`}
        render={({ field }) => (
          <FormItem className="col-start-2 @2xl:col-start-auto">
            <FormLabel className="sr-only">{type.label} · prefijo</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ""}
                placeholder={fallbackPrefix}
                maxLength={6}
                autoComplete="off"
                className="h-9 font-mono uppercase"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`start_at.${type.code}`}
        render={({ field }) => (
          <FormItem className="col-start-2 @2xl:col-start-auto">
            <FormLabel className="sr-only">
              {type.label} · siguiente número
            </FormLabel>
            <div className="flex items-center gap-2">
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  disabled={started}
                  inputMode="numeric"
                  maxLength={7}
                  autoComplete="off"
                  className="h-9 font-mono"
                />
              </FormControl>
              {started ? (
                <Lock
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
              ) : null}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
      <p className="col-start-2 font-mono text-[13px] text-foreground/85 @2xl:col-start-auto @2xl:text-right">
        <span className="sr-only">Saldrá como </span>
        {example}
      </p>
    </li>
  );
}

/**
 * «Así firma tus papeles»: el emisor tal como lo imprime «Partes» —la misma
 * regla que el servidor, con lo escrito ahora—, el próximo número de cada tipo
 * y, si hay, la nota que va al pie del correo. Cristal: es contenido.
 */
function IssuerIsland({
  control,
  company,
  types,
  settings,
}: {
  control: Control<Values>;
  company: DocumentsSettingsDTO["company_defaults"];
  types: readonly DocumentTypeView[];
  settings: DocumentsSettingsDTO;
}) {
  const values = useWatch({ control }) as Values;
  const lines = issuerLines(
    {
      legal_name: values.legal_name ?? "",
      tax_id_label: values.tax_id_label ?? "",
      address: values.address ?? "",
      city: values.city ?? "",
      phone: values.phone ?? "",
      email: values.email ?? "",
    },
    company,
  );
  const note = (values.footer_note ?? "").trim();
  return (
    <InkIsland
      label="Así firma tus papeles"
      className="gap-4 self-start p-5 md:p-6 xl:sticky xl:top-6"
    >
      <div className="flex flex-col gap-1.5">
        <Kicker>Así firma tus papeles</Kicker>
        <p className="font-heading text-xl leading-tight font-bold tracking-tight md:text-2xl">
          Lo que dice de ti cada papel
        </p>
      </div>
      {/* Papel blanco también en oscuro, como la hoja del editor. */}
      <div className="rounded-md bg-white px-4 py-3.5 text-zinc-600 shadow-sm">
        <p className="text-[10px] font-semibold tracking-[0.1em] text-zinc-500 uppercase">
          En «Partes»
        </p>
        <ul className="mt-1.5 flex list-none flex-col gap-0.5 p-0 text-[12.5px] leading-snug">
          {lines.map((line, index) => (
            <li
              key={`${String(index)}-${line}`}
              className={index === 0 ? "font-semibold text-zinc-900" : ""}
            >
              {line}
            </li>
          ))}
        </ul>
      </div>
      <dl className="m-0">
        {types.map((type) => {
          const state =
            settings.numbering.next[
              type.code as keyof typeof settings.numbering.next
            ];
          const example = numberingExample({
            prefix: values.prefixes?.[type.code] ?? "",
            fallbackPrefix:
              settings.prefix_defaults[
                type.code as keyof typeof settings.prefix_defaults
              ] ?? type.default_prefix,
            startAt: values.start_at?.[type.code] ?? "",
            started: state?.started === true,
            nextValue: state?.next_value ?? 1,
          });
          return (
            <div
              key={type.code}
              className="flex justify-between gap-3 border-t border-border py-2 text-[13px]"
            >
              <dt className="min-w-0 truncate text-muted-foreground">
                {type.label}
              </dt>
              <dd className="font-mono text-[12.5px]">{example}</dd>
            </div>
          );
        })}
      </dl>
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        {note === "" ? (
          "El NIT y el isotipo salen de Mi empresa › General. Lo ya emitido conserva su emisor y su número."
        ) : (
          <>
            Al pie del correo de cada envío:{" "}
            <span className="text-foreground">«{note}»</span>
          </>
        )}
      </p>
    </InkIsland>
  );
}

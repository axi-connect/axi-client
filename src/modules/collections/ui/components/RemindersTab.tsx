"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  LoaderCircle,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Switch } from "@/shared/components/ui/switch";
import { InkIsland, Kicker } from "@/shared/components/features/bento";
import { TemplateTextField } from "@/shared/components/features/template-text-field/TemplateTextField";
import {
  MAX_TEMPLATE_BODY,
  REMINDER_TEMPLATE_HINTS,
  REMINDER_TEMPLATE_KEYS,
  REMINDER_TEMPLATE_LABELS,
  REMINDER_VARIABLE_LABELS,
  previewSegments,
  renderReminderPreview,
  SAMPLE_REMINDER_VARS,
  type CollectionsPolicyDTO,
  type CollectionsSettingsDTO,
  type ReminderTemplateKey,
  unknownReminderVariables,
} from "@/modules/collections/domain/reminder";
import {
  getCollectionsPolicy,
  saveCollectionsPolicy,
} from "@/modules/collections/infrastructure/services/collections-service.adapter";
import { ReminderCadenceRow } from "./ReminderCadenceRow";
import { ReminderThread } from "./ReminderThread";

/** El mismo tope que valida el servidor: 6 desfases por dirección. */
const MAX_OFFSETS = 6;

/**
 * Cómo y cuándo le habla el negocio a quien le debe (F5 del programa Cobros;
 * bento con la isla «Así le escribimos» en Cobros premium P5).
 *
 * Pestaña propia y no una sección de «Plan de pagos», y la razón es de fondo:
 * el plan de pagos es **el trato** —anticipo, cuotas, fechas— y cada pedido lo
 * congela al confirmarlo; la cadencia y los textos son **la operación** y se
 * leen vivos en cada envío. Juntarlos obligaría al dueño a recordar cuál de
 * los ajustes que tiene delante alcanza a los clientes que ya le deben y cuál
 * no. Separados, cada pestaña tiene una sola respuesta, y esta la dice.
 */
export function RemindersTab() {
  const { showAlert } = useAlert();
  const [policy, setPolicy] = useState<CollectionsSettingsDTO | null>(null);
  const [editing, setEditing] = useState<ReminderTemplateKey | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCollectionsPolicy()
      .then(setPolicy)
      .catch((err: unknown) => {
        setBlocked(isHttpError(err) && err.is(API_ERROR_CODES.featureDisabled));
      });
  }, []);

  const patch = useCallback((changes: Partial<CollectionsPolicyDTO>) => {
    setPolicy((current) =>
      current === null ? current : { ...current, ...changes },
    );
  }, []);

  // Una variable inventada en CUALQUIER aviso frena el guardado general, no
  // solo el del diálogo de ese texto: el servidor también responde 422.
  const brokenTemplates =
    policy === null
      ? []
      : (
          Object.keys(policy.templates) as (keyof typeof policy.templates)[]
        ).filter(
          (which) =>
            unknownReminderVariables(
              policy.templates[which].body,
              policy.available_variables,
            ).length > 0,
        );

  async function save() {
    if (policy === null) return;
    setSaving(true);
    try {
      // `available_variables` es de SOLO LECTURA: se quita antes de guardar en
      // vez de confiar en que el servidor la descarte. Lo que se manda dice lo
      // que se quiere cambiar.
      const { available_variables, ...deal } = policy;
      setPolicy({
        ...(await saveCollectionsPolicy(deal)),
        available_variables,
      });
      showAlert({
        tone: "success",
        title: "Recordatorios guardados",
        description: "Vale también para los pedidos que ya están en marcha.",
      });
    } catch (err) {
      showAlert({
        tone: "error",
        title: "No se pudo guardar",
        description: errorMessage(err),
      });
    } finally {
      setSaving(false);
    }
  }

  if (blocked) {
    return (
      <p className="text-sm text-muted-foreground">
        Este negocio no persigue cobros, así que no manda recordatorios. Se
        activan en Mi empresa › Funciones, junto con el plan de pagos.
      </p>
    );
  }
  if (policy === null) return <Skeleton className="h-64 w-full rounded-3xl" />;

  if (editing !== null) {
    return (
      <TemplateEditor
        which={editing}
        policy={policy}
        onPatch={patch}
        onClose={() => setEditing(null)}
        onSave={() => void save()}
        saving={saving}
      />
    );
  }

  const channelsOff =
    !policy.reminder_channels.whatsapp && !policy.reminder_channels.email;

  function patchTemplate(which: ReminderTemplateKey, enabled: boolean) {
    if (policy === null) return;
    patch({
      templates: {
        ...policy.templates,
        [which]: { ...policy.templates[which], enabled },
      },
    });
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] [&>*]:min-w-0">
      <div className="flex flex-col gap-4">
        <Card title="Cuándo escribimos">
          <ReminderCadenceRow
            label="Antes de vencer"
            hint="Días antes de cada cuota; «el día» es el del vencimiento"
            days={policy.reminder_days_before}
            max={MAX_OFFSETS}
            onChange={(reminder_days_before) =>
              patch({
                reminder_days_before: [...reminder_days_before].sort(
                  (a, b) => b - a,
                ),
              })
            }
          />
          <ReminderCadenceRow
            label="Después de vencer"
            hint="Días de mora, si no ha pagado"
            days={policy.overdue_reminder_days}
            max={MAX_OFFSETS}
            onChange={(overdue_reminder_days) =>
              patch({
                overdue_reminder_days: [...overdue_reminder_days].sort(
                  (a, b) => a - b,
                ),
              })
            }
          />
          <SettingRow
            label="Callar si el cliente promete pagar"
            hint="Hasta la fecha que prometió; si pasa sin pago, vuelven solos"
            control={
              <Switch
                size="lg"
                checked={policy.pause_on_promise}
                aria-label="Callar si el cliente promete pagar"
                onCheckedChange={(pause_on_promise) =>
                  patch({ pause_on_promise })
                }
              />
            }
          />
          <Note>
            Cada aviso sale{" "}
            <b className="font-medium text-foreground">una sola vez</b> y en su
            día exacto: «faltan 7 días» no se repite los siete días siguientes.
          </Note>
        </Card>

        <Card title="Qué decimos">
          {REMINDER_TEMPLATE_KEYS.map((key) => {
            const label = REMINDER_TEMPLATE_LABELS[key].toLowerCase();
            const template = policy.templates[key];
            return (
              <div
                key={key}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-t border-border/60 py-4 first-of-type:border-t-0 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
              >
                <div className="col-span-2 min-w-0 sm:col-span-1">
                  <p
                    className={`text-sm font-semibold ${template.enabled ? "" : "text-muted-foreground"}`}
                  >
                    {REMINDER_TEMPLATE_LABELS[key]}
                  </p>
                  <p
                    className="mt-0.5 truncate text-[13px] text-muted-foreground"
                    title={renderReminderPreview(template.body)}
                  >
                    {template.enabled
                      ? `«${renderReminderPreview(template.body)}»`
                      : REMINDER_TEMPLATE_HINTS[key]}
                  </p>
                </div>
                {/* «Antes de vencer» nombra dos filas de esta pantalla —cuándo
                    se escribe y qué se dice—, así que el nombre accesible dice
                    cuál de las dos es. */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-self-start rounded-full px-3 sm:justify-self-auto"
                  aria-label={`Editar el texto de ${label}`}
                  onClick={() => setEditing(key)}
                >
                  Editar texto
                </Button>
                <Switch
                  size="lg"
                  checked={template.enabled}
                  aria-label={`Enviar el aviso de ${label}`}
                  onCheckedChange={(enabled) => patchTemplate(key, enabled)}
                />
              </div>
            );
          })}
          {policy.hsm_templates.overdue === undefined &&
          policy.templates.overdue.enabled &&
          policy.reminder_channels.whatsapp ? (
            <Alert variant="warning" className="mb-2 rounded-2xl">
              <TriangleAlert aria-hidden="true" />
              <AlertTitle>No hay plantilla aprobada para la mora</AlertTitle>
              <AlertDescription>
                <span>
                  Fuera de la ventana de 24 horas de WhatsApp solo pasa una
                  plantilla que Meta haya aprobado, y quien lleva días sin
                  escribir es justo el que hay que perseguir: sin ella, ese
                  aviso no sale.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 w-fit rounded-full"
                  onClick={() => setEditing("overdue")}
                >
                  Elegir plantilla
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          <Note>
            Lo que cambies aquí vale{" "}
            <b className="font-medium text-foreground">
              también para los pedidos que ya están en marcha
            </b>
            . El calendario de un cliente se pactó con él y no se toca; cómo le
            hablas, no lo pactaste con nadie.
          </Note>
        </Card>

        <Card title="Por dónde">
          <SettingRow
            label="WhatsApp"
            hint="Por el canal del pedido; fuera de las 24 h, con la plantilla aprobada"
            control={
              <Switch
                size="lg"
                checked={policy.reminder_channels.whatsapp}
                aria-label="Avisar por WhatsApp"
                onCheckedChange={(whatsapp) =>
                  patch({
                    reminder_channels: {
                      ...policy.reminder_channels,
                      whatsapp,
                    },
                  })
                }
              />
            }
          />
          <SettingRow
            label="Correo"
            hint="Solo a quien tenga correo en su ficha"
            control={
              <Switch
                size="lg"
                checked={policy.reminder_channels.email}
                aria-label="Avisar por correo"
                onCheckedChange={(email) =>
                  patch({
                    reminder_channels: { ...policy.reminder_channels, email },
                  })
                }
              />
            }
          />
        </Card>

        {brokenTemplates.length > 0 ? (
          <Alert variant="warning" className="rounded-2xl">
            <TriangleAlert aria-hidden="true" />
            <AlertDescription>
              <span>
                No se puede guardar:{" "}
                {brokenTemplates.length === 1 ? "el aviso" : "los avisos"}{" "}
                <b className="font-medium text-foreground">
                  {brokenTemplates
                    .map((which) =>
                      REMINDER_TEMPLATE_LABELS[which].toLowerCase(),
                    )
                    .join(", ")}
                </b>{" "}
                {brokenTemplates.length === 1 ? "usa" : "usan"} variables que el
                servidor no sabe rellenar y saldrían tal cual en el WhatsApp del
                cliente.
              </span>
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="flex justify-end">
          <Button
            onClick={() => void save()}
            disabled={saving || brokenTemplates.length > 0}
          >
            {saving ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : null}
            Guardar recordatorios
          </Button>
        </div>
      </div>

      <ReminderThread policy={policy} channelsOff={channelsOff} />
    </div>
  );
}

/**
 * El texto de UN aviso, con su resultado al lado.
 *
 * El interruptor de encendido vive también aquí: apagarlo no borra el texto,
 * así que la decisión y lo que se apaga tienen que verse juntos. La vista
 * previa marca las variables que el servidor no sabe rellenar en vez de
 * esconderlas: saldrían tal cual.
 */
function TemplateEditor({
  which,
  policy,
  onPatch,
  onClose,
  onSave,
  saving,
}: {
  which: ReminderTemplateKey;
  policy: CollectionsSettingsDTO;
  onPatch: (changes: Partial<CollectionsSettingsDTO>) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const template = policy.templates[which];
  const hsm = policy.hsm_templates[which];
  const label = REMINDER_TEMPLATE_LABELS[which].toLowerCase();
  const unknown = unknownReminderVariables(
    template.body,
    policy.available_variables,
  );

  function patchTemplate(changes: Partial<typeof template>) {
    onPatch({
      templates: { ...policy.templates, [which]: { ...template, ...changes } },
    });
  }

  function patchHsm(changes: { name?: string; language?: string }) {
    const next = {
      name: hsm?.name ?? "",
      language: hsm?.language ?? "es",
      ...changes,
    };
    onPatch({
      hsm_templates: {
        ...policy.hsm_templates,
        // Una HSM a medias no sirve de nada y el servidor la descarta entera:
        // mejor no guardarla que guardar algo que no va a usarse.
        [which]: next.name.trim() === "" ? undefined : next,
      },
    });
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] [&>*]:min-w-0">
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-6 w-fit items-center gap-1 rounded-md text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Recordatorios
        </button>

        <Card title={`El aviso de «${label}»`}>
          <SettingRow
            label="Enviar este aviso"
            hint="Apagarlo no borra el texto: deja de salir y queda dicho en el historial de cada plan"
            control={
              <Switch
                size="lg"
                checked={template.enabled}
                aria-label={`Enviar el aviso de ${label}`}
                onCheckedChange={(enabled) => patchTemplate({ enabled })}
              />
            }
          />
          <div className="border-t border-border/60 py-4">
            <TemplateTextField
              value={template.body}
              onChange={(body) => patchTemplate({ body })}
              variables={policy.available_variables}
              labels={REMINDER_VARIABLE_LABELS}
              maxLength={MAX_TEMPLATE_BODY}
              label={`Texto del aviso de ${label}`}
              rows={6}
              {...(unknown.length === 0
                ? {}
                : {
                    error: `El servidor no sabe rellenar ${unknown
                      .map((name) => `{{${name}}}`)
                      .join(
                        ", ",
                      )}: saldría tal cual en el WhatsApp del cliente.`,
                  })}
            />
          </div>
        </Card>

        <Card title="Fuera de la ventana de 24 horas">
          <SettingRow
            label="Plantilla aprobada de Meta"
            hint="El nombre exacto con el que Meta la aprobó"
            control={
              <Input
                value={hsm?.name ?? ""}
                placeholder="cobro_recordatorio"
                aria-label="Nombre de la plantilla aprobada de Meta"
                onChange={(event) => patchHsm({ name: event.target.value })}
                className="h-9 w-full sm:w-[220px]"
              />
            }
          />
          <SettingRow
            label="Idioma"
            control={
              <Input
                value={hsm?.language ?? "es"}
                aria-label="Idioma de la plantilla aprobada"
                onChange={(event) => patchHsm({ language: event.target.value })}
                className="h-9 w-20"
              />
            }
          />
          <Note>
            WhatsApp solo deja escribir libremente durante 24 horas desde el
            último mensaje del cliente. Pasadas esas horas sale esta plantilla;
            sin ella, el aviso no sale.
          </Note>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Volver
          </Button>
          <Button onClick={onSave} disabled={saving || unknown.length > 0}>
            {saving ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : null}
            Guardar el texto
          </Button>
        </div>
      </div>

      <InkIsland label="Así le llega" className="gap-4 xl:sticky xl:top-6">
        <div className="flex flex-col gap-1.5">
          <Kicker>Así le llega</Kicker>
          <p className="font-heading text-xl leading-tight font-bold tracking-tight">
            {SAMPLE_REMINDER_VARS.contact_name} · cuota{" "}
            {SAMPLE_REMINDER_VARS.installment_seq} de{" "}
            {SAMPLE_REMINDER_VARS.installments_count}
          </p>
        </div>
        {template.enabled ? (
          <p className="max-w-[92%] self-end rounded-[18px] rounded-br-[6px] bg-card px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line shadow-sm">
            {previewSegments(template.body, policy.available_variables).map(
              (part, index) =>
                part.unknown ? (
                  <mark
                    key={index}
                    className="rounded bg-destructive/10 px-0.5 text-destructive underline decoration-wavy"
                  >
                    {part.text}
                  </mark>
                ) : (
                  <span key={index}>{part.text}</span>
                ),
            )}
          </p>
        ) : (
          <p className="rounded-2xl border border-dashed border-border px-3.5 py-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
            Este aviso está apagado: ese día no se escribe nada.
          </p>
        )}
        {hsm === undefined ? null : (
          <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-muted-foreground">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 size-3.5 shrink-0"
            />
            <span>
              Fuera de la ventana de 24 h sale{" "}
              <b className="font-medium text-foreground">{hsm.name}</b>, y su
              texto lo fija Meta: lo de arriba no se le aplica.
            </span>
          </p>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground">
          No es un ejemplo escrito a mano: es tu texto con las cifras de un
          pedido. Cambia una palabra y cambia aquí.
        </p>
      </InkIsland>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card px-5 pb-1 md:px-6">
      <h2 className="pt-5 pb-1 text-xs font-normal text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-[72ch] border-t border-border/60 py-3.5 text-[12.5px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

function SettingRow({
  label,
  hint,
  control,
}: {
  label: string;
  hint?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border/60 py-4 first-of-type:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        {hint === undefined ? null : (
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, ShieldCheck, TriangleAlert } from "lucide-react";

import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Switch } from "@/shared/components/ui/switch";
import { TemplateTextField } from "@/shared/components/features/template-text-field/TemplateTextField";
import {
  MAX_TEMPLATE_BODY,
  REMINDER_TEMPLATE_HINTS,
  REMINDER_TEMPLATE_KEYS,
  REMINDER_TEMPLATE_LABELS,
  REMINDER_VARIABLE_LABELS,
  renderReminderPreview,
  unknownReminderVariables,
  type CollectionsPolicyDTO,
  type CollectionsSettingsDTO,
  type ReminderTemplateKey,
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
 * Cómo y cuándo le habla el negocio a quien le debe (F5 del programa Cobros).
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
  if (policy === null) return <Skeleton className="h-64 w-full rounded-2xl" />;

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

  return (
    <div className="grid items-start gap-9 lg:grid-cols-[minmax(0,1fr)_372px]">
      <div>
        <section>
          <SectionTitle>Cuándo escribimos</SectionTitle>
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <ReminderCadenceRow
              first
              label="Antes de vencer"
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
              hint="Hasta la fecha que prometió"
              control={
                <Switch
                  checked={policy.pause_on_promise}
                  aria-label="Callar si el cliente promete pagar"
                  onCheckedChange={(pause_on_promise) =>
                    patch({ pause_on_promise })
                  }
                />
              }
            />
          </div>
          <Note>
            Cada aviso sale{" "}
            <b className="font-medium text-foreground">una sola vez</b> y en su
            día exacto: «faltan 7 días» no se repite los siete días siguientes.
            Un recordatorio diario deja de leerse justo antes de la fecha que
            importa.
          </Note>
        </section>

        <section className="mt-7">
          <SectionTitle>Qué decimos</SectionTitle>
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            {REMINDER_TEMPLATE_KEYS.map((key, index) => (
              <button
                key={key}
                type="button"
                // «Antes de vencer» nombra dos filas de esta pantalla —cuándo
                // se escribe y qué se dice—, así que el nombre accesible dice
                // cuál de las dos es.
                aria-label={`Editar el texto de ${REMINDER_TEMPLATE_LABELS[key].toLowerCase()}`}
                onClick={() => setEditing(key)}
                className={`relative grid min-h-[56px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.03] ${
                  index === 0
                    ? ""
                    : "before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-border/60"
                }`}
              >
                <span
                  className={
                    policy.templates[key].enabled ? "" : "text-muted-foreground"
                  }
                >
                  <span className="block text-sm">
                    {REMINDER_TEMPLATE_LABELS[key]}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
                    {REMINDER_TEMPLATE_HINTS[key]}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  {policy.templates[key].enabled ? (
                    "Encendido"
                  ) : (
                    <b className="font-medium text-foreground">Apagado</b>
                  )}
                  <ChevronRight aria-hidden="true" className="size-4" />
                </span>
              </button>
            ))}
          </div>
          {policy.hsm_templates.overdue === undefined &&
          policy.templates.overdue.enabled ? (
            <Alert variant="warning" className="mt-3 rounded-2xl">
              <TriangleAlert aria-hidden="true" />
              <AlertTitle>No hay plantilla aprobada para la mora</AlertTitle>
              <AlertDescription>
                <span>
                  Fuera de la ventana de 24 horas de WhatsApp solo pasa una
                  plantilla que Meta haya aprobado, y quien lleva días sin
                  escribir es justo el que hay que perseguir: sin ella, ese
                  aviso no sale.
                </span>
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
        </section>

        <section className="mt-7">
          <SectionTitle>Por dónde</SectionTitle>
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <SettingRow
              first
              label="WhatsApp"
              control={
                <Switch
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
          </div>
        </section>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => void save()} disabled={saving}>
            Guardar recordatorios
          </Button>
        </div>
      </div>

      <ReminderThread
        templates={policy.templates}
        hasOverdueHsm={policy.hsm_templates.overdue !== undefined}
        channelsOff={channelsOff}
      />
    </div>
  );
}

/**
 * El texto de UN aviso, con su resultado al lado.
 *
 * El interruptor de encendido vive aquí y no en la lista: apagarlo no borra el
 * texto, así que la decisión y lo que se apaga tienen que verse juntos.
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
    <div className="grid items-start gap-9 lg:grid-cols-[minmax(0,1fr)_372px]">
      <div>
        <button
          type="button"
          onClick={onClose}
          className="mb-4 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Recordatorios
        </button>

        <SectionTitle>
          El aviso de «{REMINDER_TEMPLATE_LABELS[which].toLowerCase()}»
        </SectionTitle>
        <div className="mb-3.5 overflow-hidden rounded-2xl border border-border bg-background">
          <SettingRow
            first
            label="Enviar este aviso"
            hint="Apagarlo no borra el texto: deja de salir y queda dicho en el historial de cada plan"
            control={
              <Switch
                checked={template.enabled}
                aria-label={`Enviar el aviso de ${REMINDER_TEMPLATE_LABELS[which].toLowerCase()}`}
                onCheckedChange={(enabled) => patchTemplate({ enabled })}
              />
            }
          />
        </div>

        <TemplateTextField
          value={template.body}
          onChange={(body) => patchTemplate({ body })}
          variables={policy.available_variables}
          labels={REMINDER_VARIABLE_LABELS}
          maxLength={MAX_TEMPLATE_BODY}
          label={`Texto del aviso de ${REMINDER_TEMPLATE_LABELS[which].toLowerCase()}`}
          rows={6}
          {...(unknown.length === 0
            ? {}
            : {
                error: `El servidor no sabe rellenar ${unknown
                  .map((name) => `{{${name}}}`)
                  .join(", ")}: saldría tal cual en el WhatsApp del cliente.`,
              })}
        />

        <section className="mt-7">
          <SectionTitle>Fuera de la ventana de 24 horas</SectionTitle>
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <SettingRow
              first
              label="Plantilla aprobada de Meta"
              control={
                <Input
                  value={hsm?.name ?? ""}
                  placeholder="cobro_recordatorio"
                  aria-label="Nombre de la plantilla aprobada de Meta"
                  onChange={(event) => patchHsm({ name: event.target.value })}
                  className="h-8 w-[200px]"
                />
              }
            />
            <SettingRow
              label="Idioma"
              control={
                <Input
                  value={hsm?.language ?? "es"}
                  aria-label="Idioma de la plantilla aprobada"
                  onChange={(event) =>
                    patchHsm({ language: event.target.value })
                  }
                  className="h-8 w-20"
                />
              }
            />
          </div>
          <Note>
            WhatsApp solo deja escribir libremente durante 24 horas desde el
            último mensaje del cliente. Pasadas esas horas sale esta plantilla;
            sin ella, el aviso no sale.
          </Note>
        </section>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Volver
          </Button>
          <Button onClick={onSave} disabled={saving || unknown.length > 0}>
            Guardar el texto
          </Button>
        </div>
      </div>

      <aside className="rounded-[20px] border border-border bg-background p-5">
        <p className="text-[12.5px] text-muted-foreground">Con los datos de</p>
        <p className="mt-0.5 text-[15.5px] font-semibold tracking-[-0.01em]">
          Laura Gómez · cuota 2 de 3
        </p>
        <div className="mt-5">
          <p className="pb-3 text-center text-[11.5px] text-muted-foreground">
            Así se verá
          </p>
          <p className="max-w-[88%] self-end rounded-[16px] rounded-br-[5px] bg-secondary px-3.5 py-2.5 text-[13px] leading-relaxed">
            {renderReminderPreview(template.body)}
          </p>
        </div>
        {hsm === undefined ? null : (
          <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-relaxed text-muted-foreground">
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
        <Note className="pt-4">
          No es un ejemplo escrito a mano: es tu texto con las cifras de un
          pedido. Cambia una palabra y cambia aquí.
        </Note>
      </aside>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 pb-2.5 text-[13px] font-medium text-muted-foreground">
      {children}
    </p>
  );
}

function Note({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`max-w-[62ch] px-1 pt-2.5 text-[12.5px] leading-relaxed text-muted-foreground ${className ?? ""}`}
    >
      {children}
    </p>
  );
}

function SettingRow({
  label,
  hint,
  control,
  first,
}: {
  label: string;
  hint?: string;
  control: React.ReactNode;
  first?: boolean;
}) {
  return (
    <div
      className={`relative grid min-h-[56px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 ${
        first === true
          ? ""
          : "before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-border/60"
      }`}
    >
      <span>
        <span className="block text-sm">{label}</span>
        {hint === undefined ? null : (
          <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
      {control}
    </div>
  );
}

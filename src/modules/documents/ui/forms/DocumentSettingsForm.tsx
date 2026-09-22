"use client";

import { useMemo } from "react";

import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { DynamicForm } from "@/shared/components/features/dynamic-form";
import { Button } from "@/shared/components/ui/button";
import type {
  DocumentTypeView,
  DocumentsSettingsDTO,
} from "@/modules/documents/domain/template";
import { updateDocumentsSettings } from "@/modules/documents/infrastructure/services/documents-service.adapter";
import {
  buildDocumentSettingsFields,
  documentSettingsSchema,
  fromSettingsDto,
  toSettingsPayload,
  type DocumentSettingsFormValues,
} from "./config/document-settings.config";

/**
 * Quién emite y cómo se numera (F7 Cobros). `DynamicForm` con verja de sucio:
 * el botón solo se enciende con cambios. Lo vacío cae a la ficha de Mi
 * empresa; el NIT y el isotipo siempre salen de allí. Los prefijos no
 * reinician la cuenta: lo que ya salió conserva su número.
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
  const fields = useMemo(
    () =>
      buildDocumentSettingsFields({
        types,
        defaults: settings.company_defaults,
        prefixDefaults: settings.prefix_defaults,
      }),
    [types, settings.company_defaults, settings.prefix_defaults],
  );
  const defaults = useMemo(
    () => fromSettingsDto(settings, types),
    [settings, types],
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-base font-medium">Quién emite</h3>
        <p className="mt-1 max-w-[62ch] text-sm text-muted-foreground">
          Esto es lo que sale como emisor en el papel. Lo que dejes vacío cae a
          la ficha de Mi empresa; el NIT y el isotipo siempre salen de allí.
        </p>
      </div>
      <DynamicForm<DocumentSettingsFormValues>
        key={JSON.stringify(defaults)}
        schema={documentSettingsSchema}
        fields={fields}
        defaultValues={defaults}
        columns={{ base: 1, md: 2 }}
        onSubmit={async (values, form) => {
          try {
            const saved = await updateDocumentsSettings(
              toSettingsPayload(values),
            );
            onSaved(saved);
            showAlert({
              tone: "success",
              title: "Emisor y numeración guardados",
              description:
                "Se aplican a los documentos que se emitan desde ahora.",
              autoCloseMs: 3000,
            });
          } catch (error) {
            if (!applyServerValidation(error, form)) {
              showAlert({
                tone: "error",
                title: errorMessage(error, "No se pudo guardar"),
              });
            }
          }
        }}
        actions={{
          render: ({ submitting, dirty }) => (
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={submitting || !dirty}>
                Guardar ajustes
              </Button>
            </div>
          ),
        }}
      />
      <p className="text-xs leading-relaxed text-muted-foreground">
        Los prefijos son por tipo y{" "}
        <strong className="font-medium text-foreground">
          no reinician la cuenta
        </strong>
        : el siguiente número sigue la que ya llevas y lo que ya salió conserva
        el suyo.
      </p>
    </div>
  );
}

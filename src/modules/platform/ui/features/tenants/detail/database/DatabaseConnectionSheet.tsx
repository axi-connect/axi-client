"use client";

/**
 * Drawer de configuración de la conexión (crear/editar/rotar credencial)
 * sobre `DetailSheet` + `DynamicForm` (patrón PlanFormSheet). Toda edición
 * devuelve el estado a `pending` → aviso explícito.
 * 409 `tenant_db/provision_in_progress` → toast "espera a que termine".
 */
import { TriangleAlert } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { useAlert } from "@/core/providers/alert-provider";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { isHttpError } from "@/core/api/problem";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import {
  createCustomField,
  createInputField,
  DynamicForm,
} from "@/shared/components/features/dynamic-form";
import type { FieldConfig } from "@/shared/components/features/dynamic-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { SSL_MODES, type TenantDatabaseView } from "../../../../../domain/database";
import { useUpsertTenantDatabase } from "../../../../../infrastructure/api/hooks/use-tenant-database";
import {
  databaseConnectionSchema,
  defaultDatabaseConnectionValues,
  toUpsertDatabaseDTO,
  type DatabaseConnectionValues,
} from "./database-connection.config";

type DatabaseConnectionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
  /** Config vigente; `null` = primera configuración. */
  database: TenantDatabaseView | null;
};

export function DatabaseConnectionSheet({
  open,
  onOpenChange,
  tenantId,
  tenantName,
  database,
}: DatabaseConnectionSheetProps) {
  const { showAlert } = useAlert();
  const upsert = useUpsertTenantDatabase(tenantId);
  const hasCredentials = database?.credentials_configured === true;

  const defaultValues: DatabaseConnectionValues = database
    ? {
        host: database.host,
        port: database.port,
        database_name: database.database_name,
        username: database.username,
        ssl_mode: database.ssl_mode,
        pool_max: database.pool_max,
        password: "",
      }
    : defaultDatabaseConnectionValues;

  const fields: FieldConfig<DatabaseConnectionValues>[] = [
    createInputField<DatabaseConnectionValues>("host", {
      label: "Host *",
      placeholder: "db.acme.internal",
      autoComplete: "off",
    }),
    createInputField<DatabaseConnectionValues>("port", {
      label: "Puerto *",
      inputKind: "number",
      inputProps: { min: 1, max: 65535 },
    }),
    createInputField<DatabaseConnectionValues>("database_name", {
      label: "Base de datos *",
      placeholder: "acme_prod",
      autoComplete: "off",
      inputProps: { className: "font-mono" },
    }),
    createInputField<DatabaseConnectionValues>("username", {
      label: "Usuario *",
      placeholder: "axi_app",
      autoComplete: "off",
      inputProps: { className: "font-mono" },
    }),
    createCustomField<DatabaseConnectionValues>("ssl_mode", ({ value, setValue }) => (
      <Select
        value={String(value ?? "require")}
        onValueChange={(mode) => setValue("ssl_mode", mode as DatabaseConnectionValues["ssl_mode"])}
      >
        <SelectTrigger className="w-full" aria-label="Modo SSL">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SSL_MODES.map((mode) => (
            <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    ), { label: "SSL" }),
    createInputField<DatabaseConnectionValues>("pool_max", {
      label: "Pool máx (1–50)",
      inputKind: "number",
      inputProps: { min: 1, max: 50 },
    }),
    createInputField<DatabaseConnectionValues>("password", {
      label: hasCredentials ? "Contraseña (rotación)" : "Contraseña *",
      inputKind: "password",
      placeholder: hasCredentials ? "•••••••• configurada" : "••••••••",
      autoComplete: "new-password",
      colSpan: { base: 1, md: 2 },
      description: hasCredentials
        ? "Déjala vacía para conservar la actual. Escribir una nueva ROTA la credencial."
        : "Mínimo 8 caracteres. No vuelve a mostrarse.",
    }),
  ];

  async function onSubmit(values: DatabaseConnectionValues, form: UseFormReturn<DatabaseConnectionValues>) {
    try {
      await upsert.mutateAsync(toUpsertDatabaseDTO(values));
      showAlert({
        tone: "success",
        title: "Conexión guardada",
        description: "El estado volvió a pending: valida y reprovisiona la base.",
        autoCloseMs: 6000,
      });
      onOpenChange(false);
    } catch (error) {
      if (applyServerValidation(error, form)) return;
      if (isHttpError(error) && error.is("tenant_db/provision_in_progress")) {
        showAlert({
          tone: "warning",
          title: "Provisión en curso",
          description: "Espera a que termine antes de editar la conexión.",
        });
        return;
      }
      showAlert({ tone: "error", title: "No se pudo guardar la conexión", description: errorMessage(error) });
    }
  }

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={database ? "Editar conexión" : "Configurar conexión"}
      subtitle={tenantName}
      size="lg"
    >
      <div className="space-y-4 p-4">
        {database && (
          <Alert className="border-warning/30 bg-warning/5">
            <TriangleAlert aria-hidden="true" className="size-4 text-warning" />
            <AlertTitle>Editar devuelve el estado a pending</AlertTitle>
            <AlertDescription>Tendrás que revalidar y reprovisionar la base.</AlertDescription>
          </Alert>
        )}

        <DynamicForm<DatabaseConnectionValues>
          schema={databaseConnectionSchema}
          defaultValues={defaultValues}
          fields={fields}
          onSubmit={onSubmit}
          actions={{
            render: ({ submitting }) => (
              <div className="flex w-full items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={upsert.isPending}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting || upsert.isPending}>
                  {upsert.isPending ? "Guardando…" : "Guardar"}
                </Button>
              </div>
            ),
          }}
        />
      </div>
    </DetailSheet>
  );
}

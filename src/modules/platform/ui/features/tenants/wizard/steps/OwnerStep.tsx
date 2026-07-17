"use client";

/**
 * Paso 2 · Propietario. La contraseña se genera/copia aquí y NO vuelve a
 * mostrarse después del alta (el backend nunca la devuelve) — el aviso es
 * parte del contrato de UX.
 */
import { useState } from "react";
import { ArrowRight, Check, Copy, Eye, EyeOff, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { createCustomField, DynamicForm } from "@/shared/components/features/dynamic-form";
import { useCopy } from "../../../../hooks/use-copy";
import { DraftBackButton } from "../DraftBackButton";
import {
  buildOwnerBaseFields,
  defaultOwnerStepValues,
  generatePassword,
  ownerStepSchema,
  type OwnerStepValues,
} from "./owner-step.config";

type OwnerStepProps = {
  defaultValues: OwnerStepValues;
  onBack: (values: OwnerStepValues) => void;
  onNext: (values: OwnerStepValues) => void;
};

export function OwnerStep({ defaultValues, onBack, onNext }: OwnerStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { copied, copy } = useCopy();

  const passwordField = createCustomField<OwnerStepValues>("password", ({ value, setValue, getError }) => {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="owner-password"
              type={showPassword ? "text" : "password"}
              value={String(value ?? "")}
              onChange={(e) => setValue("password", e.target.value)}
              placeholder="••••••••••••"
              autoComplete="new-password"
              className="pr-9 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 mr-3 flex items-center text-muted-foreground"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setValue("password", generatePassword());
              setShowPassword(true);
            }}
          >
            <RefreshCw aria-hidden="true" />
            Generar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => { if (value) void copy(String(value)); }}
            aria-label="Copiar contraseña"
          >
            {copied ? <Check aria-hidden="true" className="text-success" /> : <Copy aria-hidden="true" />}
            {copied ? "Copiada" : "Copiar"}
          </Button>
        </div>
        {getError() && <p className="text-sm text-destructive">{getError()}</p>}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TriangleAlert aria-hidden="true" className="size-3.5 text-warning" />
          Guárdala ahora: se muestra una sola vez.
        </p>
      </div>
    );
  }, { label: "Contraseña *", colSpan: { base: 1, md: 2 }, htmlFor: "owner-password" });

  return (
    <DynamicForm<OwnerStepValues>
      schema={ownerStepSchema}
      defaultValues={{ ...defaultOwnerStepValues, ...defaultValues }}
      fields={[...buildOwnerBaseFields(), passwordField]}
      onSubmit={(values) => onNext(values)}
      actions={{
        render: ({ submitting }) => (
          <div className="flex w-full items-center justify-between">
            <DraftBackButton<OwnerStepValues> onBack={onBack} />
            <Button type="submit" disabled={submitting}>
              Siguiente
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        ),
      }}
    />
  );
}

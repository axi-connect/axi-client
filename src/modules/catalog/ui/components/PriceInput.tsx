"use client";

import { useEffect, useState } from "react";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/core/lib/utils";
import { formatMoney, parseMoneyToCents } from "@/core/lib/format";

/** Centavos → texto editable sin símbolo (`45000` → `45.000`). */
function centsToInputText(cents: number | null, currency: string): string {
  if (cents === null || !Number.isFinite(cents)) return "";
  return formatMoney(cents, currency).replace(/[^\d.,]/g, "").trim();
}

/**
 * Input de dinero: el usuario escribe en formato es-CO (`45.000` / `45.000,50`)
 * y el componente emite centavos (int) o `null` si está vacío. Formatea al
 * perder el foco; nunca mientras se escribe.
 */
export function PriceInput({
  id,
  value,
  onChange,
  currency = "COP",
  placeholder,
  disabled,
  className,
  "aria-invalid": ariaInvalid,
}: {
  id?: string;
  value: number | null;
  onChange: (cents: number | null) => void;
  currency?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
}) {
  const [text, setText] = useState(() => centsToInputText(value, currency));
  const [focused, setFocused] = useState(false);

  // Sincroniza cambios externos (reset del form, carga async) sin pisar el tecleo.
  useEffect(() => {
    if (!focused) setText(centsToInputText(value, currency));
  }, [value, currency, focused]);

  return (
    <div className={cn("relative", className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
      >
        $
      </span>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={text}
        disabled={disabled}
        placeholder={placeholder ?? "0"}
        aria-invalid={ariaInvalid}
        className="pl-7 tabular-nums"
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          onChange(raw.trim() === "" ? null : parseMoneyToCents(raw));
        }}
        onBlur={() => {
          setFocused(false);
          setText(centsToInputText(value, currency));
        }}
      />
    </div>
  );
}

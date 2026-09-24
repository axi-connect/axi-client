"use client";

/** Intenciones del tenant (system + propias) como lista elegible. */
import { Check } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useTenantIntentions } from "../../../../../infrastructure/api/hooks/use-tenant-lookup";

type IntentionPickerProps = {
  companyId: string;
  value: string | null;
  onChange: (code: string) => void;
};

export function IntentionPicker({ companyId, value, onChange }: IntentionPickerProps) {
  const intentions = useTenantIntentions(companyId);
  if (intentions.isPending) {
    return (
      <div className="space-y-1.5">
        <Skeleton className="h-9 w-full rounded-[10px]" />
        <Skeleton className="h-9 w-full rounded-[10px]" />
      </div>
    );
  }
  const rows = intentions.data ?? [];
  return (
    <ul className="max-h-72 space-y-1 overflow-y-auto" aria-label="Intenciones del tenant">
      {rows.map((intention) => {
        const picked = value === intention.code;
        return (
          <li key={intention.id}>
            <button
              type="button"
              onClick={() => onChange(intention.code)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-[10px] border px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-secondary",
                picked ? "border-brand bg-accent" : "border-border",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate font-mono text-xs">{intention.code}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {intention.description}
                  {intention.is_system ? " · sistema" : ""}
                </span>
              </span>
              {picked && <Check aria-hidden="true" className="size-4 shrink-0 text-brand" />}
            </button>
          </li>
        );
      })}
      {rows.length === 0 && <li className="px-2 py-1 text-xs text-muted-foreground">El tenant no tiene intenciones.</li>}
    </ul>
  );
}

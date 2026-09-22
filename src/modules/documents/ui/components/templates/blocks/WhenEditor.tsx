"use client";

import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  WHEN_PATH_LABELS,
  type WhenCondition,
  type WhenPath,
} from "@/modules/documents/domain/template";

const NONE = "__always__";

/**
 * La única condición que un bloque admite: «solo si hay X» / «solo si NO hay
 * X», sobre el vocabulario cerrado del servidor. Sin expresiones: lo que se
 * decide aquí lo decide `materialize` una vez y F8 no interpreta nada.
 */
export function WhenEditor({
  blockId,
  value,
  onChange,
}: {
  blockId: string;
  value: WhenCondition | null | undefined;
  onChange: (next: WhenCondition | null) => void;
}) {
  const selected = value == null ? NONE : `${value.is}:${value.path}`;
  const options = (Object.keys(WHEN_PATH_LABELS) as WhenPath[]).flatMap(
    (path) => [
      { key: `present:${path}`, label: `Solo si ${WHEN_PATH_LABELS[path]}` },
      { key: `absent:${path}`, label: `Solo si NO ${WHEN_PATH_LABELS[path]}` },
    ],
  );
  const id = `when-${blockId}`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        Cuándo aparece
      </Label>
      <Select
        value={selected}
        onValueChange={(next) => {
          if (next === NONE) return onChange(null);
          const [is, path] = next.split(":") as [
            "present" | "absent",
            WhenPath,
          ];
          onChange({ is, path });
        }}
      >
        <SelectTrigger id={id} className="h-8 w-full text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Siempre</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.key} value={option.key}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

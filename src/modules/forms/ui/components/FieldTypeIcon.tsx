import { AtSign, Calendar, Hash, List, Phone, ToggleLeft, Type } from "lucide-react";
import { cn } from "@/core/lib/utils";
import type { FormFieldType } from "@/modules/forms/domain/form";

/**
 * Icono por tipo de dato. Va en `text-muted-foreground`: el tipo es metadato,
 * no estado — el color queda reservado para IA (violeta) y acción (coral).
 */
const ICONS: Record<FormFieldType, typeof Type> = {
  text: Type,
  number: Hash,
  select: List,
  date: Calendar,
  boolean: ToggleLeft,
  phone: Phone,
  email: AtSign,
};

export function FieldTypeIcon({ type, className }: { type: FormFieldType; className?: string }) {
  const Icon = ICONS[type];
  return <Icon className={cn("size-4 shrink-0 text-muted-foreground", className)} aria-hidden />;
}

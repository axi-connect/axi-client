"use client";

import {
  Building2,
  FileBadge,
  FileSignature,
  FileText,
  ListOrdered,
  Presentation,
  Receipt,
  type LucideIcon,
} from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import type { DocumentTypeView } from "@/modules/documents/domain/template";

const TYPE_ICONS: Record<string, LucideIcon> = {
  contract: FileSignature,
  quote: FileText,
  proposal: Presentation,
  receipt: Receipt,
  statement: ListOrdered,
  cuenta_cobro: FileBadge,
  commercial_invoice: FileText,
};

/** Panel aparte, no un tipo: emisor y numeración. */
export const SETTINGS_TAB = "__settings__";

/**
 * Pastillas de tipo: cambian el panel, no la URL (DESIGN-SYSTEM §9.3), así
 * que son `Tabs` y no `NavTabs`. Solo los tipos emitibles se ofrecen; al
 * final, separada, la pestaña de emisor y numeración.
 */
export function DocumentKindTabs({
  types,
  value,
  onChange,
}: {
  types: readonly DocumentTypeView[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList
        variant="pill"
        size="sm"
        surface="inline"
        aria-label="Tipo de documento"
      >
        {types
          .filter((type) => type.issuable)
          .map((type) => {
            const Icon = TYPE_ICONS[type.code] ?? FileText;
            return (
              <TabsTrigger key={type.code} value={type.code}>
                <Icon aria-hidden="true" className="size-[15px]" />
                {type.label}
              </TabsTrigger>
            );
          })}
        <span
          aria-hidden="true"
          className="mx-1 h-5 w-px self-center bg-border"
        />
        <TabsTrigger value={SETTINGS_TAB}>
          <Building2 aria-hidden="true" className="size-[15px]" />
          Emisor y numeración
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

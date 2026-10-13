"use client";

/**
 * Aviso discreto al 80 % (lienzo T2): una vez por sesión, en el Panel, solo a
 * quien ve el espacio (owner/admin: el vigía solo carga el resumen con
 * `storage:read`). Dice lo que queda y cuánto alcanza, sin regañar.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, HardDrive, X } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { durationPhrase, formatStorageBytes, freeBytes, STORAGE_SETTINGS_PATH } from "@/modules/storage/domain/storage";
import { useStorageStore } from "@/modules/storage/infrastructure/stores/storage.store";

const SEEN_KEY = "axi.storage.warning_seen";

function alreadySeen(): boolean {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    window.sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Sin sessionStorage (modo privado estricto): el aviso vuelve a salir, nada más
  }
}

export function StorageWarningNotice({ className }: { className?: string }) {
  const summary = useStorageStore((store) => store.summary);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setHidden(alreadySeen());
  }, []);

  const visible = !hidden && summary !== null && summary.state === "warning" && freeBytes(summary) !== null;

  // «Una vez por sesión» de verdad: visto al mostrarse, no solo al cerrarlo (C-10)
  useEffect(() => {
    if (visible) markSeen();
  }, [visible]);

  if (!visible || summary === null) return null;
  const left = freeBytes(summary) ?? 0;
  const days = summary.growth.days_to_full;

  // Una sola línea de 44 px (C-10, lienzo T2b): en el celular se ocultan
  // «de espacio» y el ritmo para que quepa sin partirse
  return (
    <div
      role="status"
      className={cn(
        "flex h-11 min-w-0 items-center gap-2.5 rounded-2xl border border-border bg-muted pr-1.5 pl-3.5 text-sm",
        className,
      )}
    >
      <HardDrive className="size-4 shrink-0 text-warning" aria-hidden="true" />
      <p className="min-w-0 flex-1 truncate">
        Te quedan <span className="font-semibold">{formatStorageBytes(left)}</span>
        <span className="max-sm:hidden"> de espacio</span>
        {days !== null && days > 0 ? (
          <span className="text-muted-foreground max-sm:hidden"> · a tu ritmo, {durationPhrase(days)}</span>
        ) : null}
      </p>
      <Link
        href={STORAGE_SETTINGS_PATH}
        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[10px] px-2 font-medium whitespace-nowrap hover:bg-background focus-visible:outline-2 focus-visible:outline-ring"
      >
        Ver espacio
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 rounded-[10px] text-muted-foreground"
        aria-label="Cerrar aviso de espacio"
        onClick={() => setHidden(true)}
      >
        <X className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

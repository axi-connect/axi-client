"use client";

/**
 * Aviso discreto al 80 % (lienzo T2): una vez por sesión, en el Panel, solo a
 * quien ve el espacio (owner/admin: el vigía solo carga el resumen con
 * `storage:read`). Dice lo que queda y cuánto alcanza, sin regañar.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { HardDrive, X } from "lucide-react";
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

  if (hidden || summary === null || summary.state !== "warning") return null;
  const left = freeBytes(summary);
  if (left === null) return null;
  const days = summary.growth.days_to_full;

  return (
    <div
      role="status"
      className={`grid grid-cols-[20px_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border border-border bg-muted px-4 py-3 text-sm ${className ?? ""}`}
    >
      <HardDrive className="mt-0.5 size-[18px] text-warning" aria-hidden="true" />
      <div className="min-w-0">
        <p>
          <span className="font-medium">Te quedan {formatStorageBytes(left)} de espacio.</span>{" "}
          {days !== null && days > 0 ? `A tu ritmo alcanza para ${durationPhrase(days)}.` : null}
        </p>
        <Button asChild variant="outline" size="sm" className="mt-2 h-7 rounded-full text-xs">
          <Link href={STORAGE_SETTINGS_PATH} onClick={markSeen}>
            Ver espacio
          </Link>
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 rounded-full"
        aria-label="Cerrar aviso de espacio"
        onClick={() => {
          markSeen();
          setHidden(true);
        }}
      >
        <X className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

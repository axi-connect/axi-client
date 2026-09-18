"use client";

import { useStoredAccessory } from "@/shared/components/features/assistant/hooks/use-stored-accessory";
import type { AssistantAccessory } from "@/shared/components/features/assistant/avatar/avatar-rig";

const STORAGE = {
  storageKey: "axi.cmo.axel.accessory",
  changeEvent: "cmo:axel-appearance:change",
} as const;

/**
 * Qué lleva puesto Axel (hoy: diadema o nada). Preferencia local del navegador
 * que el dueño elige en `/cmo/settings`; la mecánica vive en el kit
 * (`useStoredAccessory`), aquí solo la clave de Axel.
 */
export function useAxelAccessory(): [AssistantAccessory, (next: AssistantAccessory) => void] {
  return useStoredAccessory(STORAGE);
}

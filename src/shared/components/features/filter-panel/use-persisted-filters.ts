"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

/**
 * La clave de unos filtros guardados en este navegador:
 * `axi:<ámbito>:v<versión>:<companyId>:<userId>`.
 *
 * Por empresa Y por usuario: quien cambia de empresa no hereda los filtros de
 * la otra, y dos personas en el mismo equipo no se pisan. La versión va en la
 * clave para que un cambio de forma deje lo viejo atrás sin tener que leerlo.
 *
 * Devuelve `null` sin sesión: sin dueño claro, no se guarda nada.
 */
export function persistedFiltersKey({
  scope,
  version,
  companyId,
  userId,
}: {
  scope: string;
  version: number;
  companyId: string | null | undefined;
  userId: string | null | undefined;
}): string | null {
  if (!companyId || !userId) return null;
  return `axi:${scope}:v${String(version)}:${companyId}:${userId}`;
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Sin acceso al almacenamiento (modo privado, política del sitio): no hay nada guardado.
    return null;
  }
}

function parse<T>(raw: string | null, sanitize: (value: unknown) => T | null): T | null {
  if (raw === null) return null;
  try {
    return sanitize(JSON.parse(raw));
  } catch {
    // JSON corrupto: se ignora, y la escritura siguiente lo limpia.
    return null;
  }
}

function writeRaw(key: string, json: string | null): void {
  try {
    if (json === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, json);
  } catch {
    // Es una comodidad: si no se guarda, los filtros igual se aplican en la pantalla.
  }
}

export type UsePersistedFiltersOptions<T> = {
  /** De `persistedFiltersKey`. `null` ⇒ funciona como un `useState` normal, sin guardar. */
  storageKey: string | null;
  /**
   * La clave todavía no se sabe (la sesión está cargando). Mientras tanto
   * `ready` es `false`: quien lista no debería pedir nada todavía, o pediría
   * sin filtros y la respuesta vieja podría llegar después de la buena.
   */
  pending?: boolean;
  /** El valor sin filtros. Se lee una vez. */
  initial: T;
  /** Valida lo guardado contra lo que hoy existe; `null` ⇒ se descarta entero. */
  sanitize: (raw: unknown) => T | null;
  /** «No hay nada que guardar»: en vez de escribir el valor vacío, se borra la entrada. */
  isEmpty?: (value: T) => boolean;
};

/**
 * Unos filtros que sobreviven a la navegación y a la recarga, guardados en
 * `localStorage`.
 *
 * - **Sin `window` en el render.** El primer pintado (servidor e hidratación)
 *   usa `initial`; lo guardado se aplica en un efecto, y `ready` dice cuándo.
 * - **Se valida al leer.** Lo que `sanitize` no reconoce se descarta; un JSON
 *   roto se ignora.
 * - **Se escribe solo cuando el valor cambia**, comparando con lo último
 *   escrito, y nunca antes de haber leído (si no, el vacío inicial borraría lo
 *   guardado).
 * - **Vaciar es olvidar:** cuando `isEmpty` dice que no queda nada, la entrada
 *   se borra. «Limpiar filtros» no necesita hacer nada más.
 * - El accesor de `localStorage` puede lanzar: todo va en try/catch.
 */
export function usePersistedFilters<T>({
  storageKey,
  pending = false,
  initial,
  sanitize,
  isEmpty,
}: UsePersistedFiltersOptions<T>): {
  value: T;
  setValue: Dispatch<SetStateAction<T>>;
  ready: boolean;
} {
  const [value, setValue] = useState<T>(initial);
  /** Para qué clave se leyó ya lo guardado; `undefined` ⇒ todavía para ninguna. */
  const [restoredFor, setRestoredFor] = useState<string | null | undefined>(undefined);
  /** Lo que hay ahora mismo en el almacenamiento, para no escribir lo mismo dos veces. */
  const lastWritten = useRef<string | null>(null);
  const initialRef = useRef(initial);
  const sanitizeRef = useRef(sanitize);
  const isEmptyRef = useRef(isEmpty);
  useEffect(() => {
    sanitizeRef.current = sanitize;
    isEmptyRef.current = isEmpty;
  });

  useEffect(() => {
    if (pending || restoredFor === storageKey) return;
    if (storageKey === null) {
      lastWritten.current = null;
      // Sin dueño (sin sesión): no hay nada que recuperar. Si antes había otra
      // clave, sus filtros no pasan a este estado anónimo.
      if (restoredFor !== undefined) setValue(initialRef.current);
    } else {
      const raw = readRaw(storageKey);
      // Lo CRUDO, a propósito: si lo guardado traía basura, la escritura
      // siguiente ve que difiere y deja solo lo válido (o borra la entrada).
      lastWritten.current = raw;
      setValue(parse(raw, sanitizeRef.current) ?? initialRef.current);
    }
    setRestoredFor(storageKey);
  }, [pending, storageKey, restoredFor]);

  const ready = !pending && restoredFor === storageKey;

  useEffect(() => {
    if (!ready || storageKey === null) return;
    const empty = isEmptyRef.current?.(value) ?? false;
    const json = empty ? null : JSON.stringify(value);
    if (json === lastWritten.current) return;
    writeRaw(storageKey, json);
    lastWritten.current = json;
  }, [ready, storageKey, value]);

  return { value, setValue, ready };
}

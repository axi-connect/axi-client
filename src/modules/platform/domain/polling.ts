/**
 * Intervalos de polling del panel (spec §2.3) como funciones PURAS: los
 * hooks las delegan en `refetchInterval` de TanStack. Reglas:
 *   · Estados terminales → `false` (cero requests de más).
 *   · ReLoginModal abierto → `false` (el token venció; se reanuda al renovar).
 *   · Provisión: 3 s; pasados 10 min degrada a 15 s (job largo, no colgar).
 *   · Migración de datos: 5 s constante.
 */
import { isDbSettled, isMigrationRunning, type DbStatus, type MigrationStatus } from "./database";

export const DB_POLL_MS = 3_000;
export const DB_POLL_DEGRADED_MS = 15_000;
export const DB_POLL_DEGRADE_AFTER_MS = 10 * 60 * 1000;
export const MIGRATION_POLL_MS = 5_000;
export const ANALYTICS_POLL_MS = 60_000;

/** Analytics y badge de alertas: refresco de 60 s salvo re-login abierto. */
export function analyticsPollInterval(reloginOpen: boolean): number | false {
  return reloginOpen ? false : ANALYTICS_POLL_MS;
}

export function databasePollInterval(args: {
  status: DbStatus | null | undefined;
  /** Epoch ms en que el status entró en transitorio (para degradar). */
  pollStartedAt: number | null;
  reloginOpen: boolean;
  now?: number;
}): number | false {
  const { status, pollStartedAt, reloginOpen, now = Date.now() } = args;
  if (!status || isDbSettled(status) || reloginOpen) return false;
  if (pollStartedAt !== null && now - pollStartedAt >= DB_POLL_DEGRADE_AFTER_MS) {
    return DB_POLL_DEGRADED_MS;
  }
  return DB_POLL_MS;
}

export function migrationPollInterval(args: {
  status: MigrationStatus | null | undefined;
  reloginOpen: boolean;
}): number | false {
  const { status, reloginOpen } = args;
  if (!status || !isMigrationRunning(status) || reloginOpen) return false;
  return MIGRATION_POLL_MS;
}

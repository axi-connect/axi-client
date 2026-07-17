/**
 * Dominio de la base de datos dedicada del tenant (F14). TypeScript PURO:
 * máquina de estados, checklist de validación con remedios, precondiciones
 * de la migración de datos y parseo DEFENSIVO del Json opaco del backend.
 *
 * Máquina de estados (spec §5.4):
 *   [sin configurar] → PUT → pending → validar → provision(202+poll)
 *   → validating → migrating → active | error(last_error)
 *   active → disable → disabled · active ∧ plan sbs → migrate-data(202+poll)
 */
import type { Schemas } from "@/core/api/types";

export type TenantDatabaseView = Schemas["TenantDatabaseViewDto"];
export type UpsertTenantDatabaseDTO = Schemas["UpsertTenantDatabaseDto"];
export type DbValidationResult = Schemas["DbValidationResultDto"];
export type DataMigration = Schemas["DataMigrationListDto"]["data"][number];

export type DbStatus = TenantDatabaseView["status"];
export type MigrationStatus = DataMigration["status"];
export type SslMode = TenantDatabaseView["ssl_mode"];

/** Formato exigido por el backend para nombre de base y usuario. */
export const DB_IDENTIFIER_REGEX = /^[a-z_][a-z0-9_$]*$/;

export const SSL_MODES: { value: SslMode; label: string }[] = [
  { value: "require", label: "require (recomendado)" },
  { value: "verify_full", label: "verify_full" },
  { value: "disable", label: "disable" },
];

/** Camino feliz de la provisión (el stepper lo pinta; error/disabled van aparte). */
export const DB_STATUS_STEPS = ["Pendiente", "Validando", "Migrando", "Activa"] as const;

const DB_STEP_BY_STATUS: Partial<Record<DbStatus, number>> = {
  pending: 0,
  validating: 1,
  migrating: 2,
  active: 3,
};

/** Índice del stepper para el status (null = fuera del camino feliz). */
export function dbStatusStep(status: DbStatus): number | null {
  return DB_STEP_BY_STATUS[status] ?? null;
}

/** Fases de la migración de datos (terminales failed/rolled_back van aparte). */
export const MIGRATION_STEPS = ["Copiando", "Cutover", "Verificando", "Completada"] as const;

const MIGRATION_STEP_BY_STATUS: Partial<Record<MigrationStatus, number>> = {
  pending: 0,
  copying: 0,
  cutover: 1,
  verifying: 2,
  completed: 3,
};

export function migrationStep(status: MigrationStatus): number | null {
  return MIGRATION_STEP_BY_STATUS[status] ?? null;
}

/** ¿El status de la DB está asentado (no hay job en vuelo que pollear)? */
export function isDbSettled(status: DbStatus): boolean {
  return status === "pending" || status === "active" || status === "error" || status === "disabled";
}

export function isMigrationRunning(status: MigrationStatus): boolean {
  return status === "pending" || status === "copying" || status === "cutover" || status === "verifying";
}

// ─── Checklist de validación (POST /validate, síncrono) ────────────────────

export type ChecklistItem = {
  key: string;
  label: string;
  ok: boolean;
  /** Remedio accionable cuando falla (spec §7). */
  remedy?: string;
  /** Snippet copiable (p.ej. CREATE EXTENSION). */
  snippet?: string;
};

export function buildChecklist(result: DbValidationResult): ChecklistItem[] {
  return [
    {
      key: "connection",
      label: "Conexión",
      ok: result.connection,
      remedy: result.connection
        ? undefined
        : result.error ?? "Verifica host, puerto, credenciales y firewall.",
    },
    {
      key: "server_version",
      label: result.server_version ? `PostgreSQL ${result.server_version}` : "Versión del servidor",
      ok: result.connection && result.server_version !== null,
      remedy: result.server_version ? undefined : "No se pudo leer la versión del servidor.",
    },
    {
      key: "version_supported",
      label: "Versión soportada",
      ok: result.version_supported,
      remedy: result.version_supported ? undefined : "Versión de PostgreSQL no soportada por axi.",
    },
    {
      key: "pg_trgm",
      label: "Extensión pg_trgm",
      ok: result.pg_trgm,
      remedy: result.pg_trgm ? undefined : "Instala la extensión en la base destino:",
      snippet: result.pg_trgm ? undefined : "CREATE EXTENSION pg_trgm;",
    },
    {
      key: "unaccent",
      label: "Extensión unaccent",
      ok: result.unaccent,
      remedy: result.unaccent ? undefined : "Instala la extensión en la base destino:",
      snippet: result.unaccent ? undefined : "CREATE EXTENSION unaccent;",
    },
    {
      key: "can_create",
      label: "Privilegio CREATE",
      ok: result.can_create,
      remedy: result.can_create ? undefined : "El usuario necesita CREATE sobre la base destino.",
    },
  ];
}

export function checklistPasses(result: DbValidationResult): boolean {
  return buildChecklist(result).every((item) => item.ok);
}

// ─── Precondiciones de migrate-data (spec §5.4) ─────────────────────────────

export type Precondition = {
  key: string;
  label: string;
  ok: boolean;
  /** Remedio con destino sugerido cuando falla. */
  remedy?: string;
};

export function migrationPreconditions(args: {
  db: TenantDatabaseView | null;
  planTier: "sbs" | "enterprise" | null;
  migrationRunning: boolean;
}): Precondition[] {
  const { db, planTier, migrationRunning } = args;
  return [
    {
      key: "db_active",
      label: "Base dedicada activa",
      ok: db?.status === "active",
      remedy: db?.status === "active" ? undefined : "Configura, valida y provisiona la base primero.",
    },
    {
      key: "schema",
      label: db?.migration_version ? `Schema al día (${db.migration_version})` : "Schema al día",
      ok: Boolean(db?.migration_version),
      remedy: db?.migration_version ? undefined : "Provisiona la base para aplicar el schema.",
    },
    {
      key: "plan_sbs",
      label: "Plan actual sbs",
      ok: planTier === "sbs",
      remedy:
        planTier === "sbs"
          ? undefined
          : planTier === "enterprise"
            ? "Este tenant ya opera en enterprise."
            : "Asigna un plan sbs antes de migrar.",
    },
    {
      key: "no_running",
      label: "Sin migración en curso",
      ok: !migrationRunning,
      remedy: migrationRunning ? "Espera a que la migración actual termine." : undefined,
    },
  ];
}

// ─── Parseo defensivo del Json opaco (progress / stats) ─────────────────────

export type MigrationModelProgress = { model: string; copied: number };

/**
 * `progress` llega como Json libre (cursors + copiados por modelo). Se
 * extraen pares string→number de forma tolerante; cualquier otra forma
 * degrada a lista vacía (nunca rompe la vista).
 */
export function parseMigrationProgress(progress: unknown): MigrationModelProgress[] {
  if (typeof progress !== "object" || progress === null || Array.isArray(progress)) return [];
  const source =
    "copied" in progress && typeof (progress as Record<string, unknown>).copied === "object"
      ? ((progress as Record<string, unknown>).copied as Record<string, unknown>)
      : (progress as Record<string, unknown>);
  return Object.entries(source)
    .filter((entry): entry is [string, number] => typeof entry[1] === "number")
    .map(([model, copied]) => ({ model, copied }));
}

export type MigrationModelStats = { model: string; source: number | null; target: number | null };

/**
 * `stats` llega como Json libre (conteos origen/destino por modelo). Acepta
 * `{model: {source, target}}` o `{source: {...}, target: {...}}`.
 */
export function parseMigrationStats(stats: unknown): MigrationModelStats[] {
  if (typeof stats !== "object" || stats === null || Array.isArray(stats)) return [];
  const record = stats as Record<string, unknown>;

  const asCounts = (value: unknown): Record<string, number> => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).filter(
        (entry): entry is [string, number] => typeof entry[1] === "number",
      ),
    );
  };

  // Forma {source: {model: n}, target: {model: n}}
  if ("source" in record || "target" in record) {
    const source = asCounts(record.source);
    const target = asCounts(record.target);
    const models = [...new Set([...Object.keys(source), ...Object.keys(target)])].sort();
    return models.map((model) => ({
      model,
      source: source[model] ?? null,
      target: target[model] ?? null,
    }));
  }

  // Forma {model: {source, target}}
  return Object.entries(record)
    .map(([model, value]) => {
      if (typeof value !== "object" || value === null) return null;
      const row = value as Record<string, unknown>;
      const source = typeof row.source === "number" ? row.source : null;
      const target = typeof row.target === "number" ? row.target : null;
      if (source === null && target === null) return null;
      return { model, source, target };
    })
    .filter((row): row is MigrationModelStats => row !== null);
}

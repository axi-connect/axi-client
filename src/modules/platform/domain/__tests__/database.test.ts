import {
  buildChecklist,
  checklistPasses,
  dbStatusStep,
  migrationPreconditions,
  migrationStep,
  parseMigrationProgress,
  parseMigrationStats,
  type DbValidationResult,
  type TenantDatabaseView,
} from "../database";

const validation = (over: Partial<DbValidationResult>): DbValidationResult => ({
  connection: true,
  server_version: "16.4",
  version_supported: true,
  pg_trgm: true,
  unaccent: true,
  can_create: true,
  ...over,
});

const db = (over: Partial<TenantDatabaseView>): TenantDatabaseView => ({
  id: "d-1",
  company_id: "t-1",
  host: "db.acme.internal",
  port: 5432,
  database_name: "acme_prod",
  username: "axi_app",
  ssl_mode: "require",
  pool_max: 10,
  status: "active",
  last_validated_at: "2026-07-17T10:00:00Z",
  provisioned_at: "2026-07-16T10:00:00Z",
  migration_version: "20260716120000",
  last_error: null,
  credentials_configured: true,
  created_at: "2026-07-15T10:00:00Z",
  updated_at: "2026-07-16T10:00:00Z",
  ...over,
});

describe("buildChecklist", () => {
  it("todo verde → 6 checks ok y checklistPasses true", () => {
    const items = buildChecklist(validation({}));
    expect(items).toHaveLength(6);
    expect(items.every((item) => item.ok)).toBe(true);
    expect(checklistPasses(validation({}))).toBe(true);
  });

  it("extensión faltante → ✘ con remedio y snippet copiable", () => {
    const items = buildChecklist(validation({ unaccent: false }));
    const unaccent = items.find((item) => item.key === "unaccent")!;
    expect(unaccent.ok).toBe(false);
    expect(unaccent.snippet).toBe("CREATE EXTENSION unaccent;");
    expect(checklistPasses(validation({ unaccent: false }))).toBe(false);
  });

  it("sin conexión → usa el error del server como remedio si existe", () => {
    const items = buildChecklist(
      validation({ connection: false, server_version: null, error: "timeout tras 5s" }),
    );
    expect(items[0]).toMatchObject({ ok: false, remedy: "timeout tras 5s" });
    // Sin versión leída, el check de versión también falla.
    expect(items[1].ok).toBe(false);
  });
});

describe("migrationPreconditions", () => {
  it("todo listo → 4 precondiciones ok", () => {
    const items = migrationPreconditions({ db: db({}), planTier: "sbs", migrationRunning: false });
    expect(items.every((item) => item.ok)).toBe(true);
  });

  it("db no activa y plan enterprise → ✘ con remedios distintos", () => {
    const items = migrationPreconditions({
      db: db({ status: "pending", migration_version: null }),
      planTier: "enterprise",
      migrationRunning: true,
    });
    expect(items.map((item) => item.ok)).toEqual([false, false, false, false]);
    expect(items[2].remedy).toMatch(/ya opera en enterprise/i);
  });

  it("sin DB configurada → precondiciones de DB en ✘", () => {
    const items = migrationPreconditions({ db: null, planTier: "sbs", migrationRunning: false });
    expect(items[0].ok).toBe(false);
    expect(items[1].ok).toBe(false);
  });
});

describe("steps de la máquina de estados", () => {
  it("mapea el camino feliz de la DB y deja error/disabled fuera", () => {
    expect(dbStatusStep("pending")).toBe(0);
    expect(dbStatusStep("validating")).toBe(1);
    expect(dbStatusStep("migrating")).toBe(2);
    expect(dbStatusStep("active")).toBe(3);
    expect(dbStatusStep("error")).toBeNull();
    expect(dbStatusStep("disabled")).toBeNull();
  });

  it("mapea las fases de migración y deja failed/rolled_back fuera", () => {
    expect(migrationStep("copying")).toBe(0);
    expect(migrationStep("cutover")).toBe(1);
    expect(migrationStep("verifying")).toBe(2);
    expect(migrationStep("completed")).toBe(3);
    expect(migrationStep("failed")).toBeNull();
    expect(migrationStep("rolled_back")).toBeNull();
  });
});

describe("parseo defensivo de progress/stats", () => {
  it("progress con forma {copied: {model: n}}", () => {
    const rows = parseMigrationProgress({ cursors: { messages: "abc" }, copied: { messages: 89_120, contacts: 3_310 } });
    expect(rows).toEqual([
      { model: "messages", copied: 89_120 },
      { model: "contacts", copied: 3_310 },
    ]);
  });

  it("progress plano {model: n} y valores no numéricos filtrados", () => {
    expect(parseMigrationProgress({ messages: 10, note: "x" })).toEqual([{ model: "messages", copied: 10 }]);
  });

  it("progress malformado degrada a [] sin lanzar", () => {
    expect(parseMigrationProgress(null)).toEqual([]);
    expect(parseMigrationProgress("50%")).toEqual([]);
    expect(parseMigrationProgress([1, 2])).toEqual([]);
  });

  it("stats con forma {source: {...}, target: {...}} alinea modelos", () => {
    const rows = parseMigrationStats({ source: { messages: 89_120, contacts: 3_310 }, target: { messages: 89_118 } });
    expect(rows).toEqual([
      { model: "contacts", source: 3_310, target: null },
      { model: "messages", source: 89_120, target: 89_118 },
    ]);
  });

  it("stats con forma {model: {source, target}} y malformados fuera", () => {
    const rows = parseMigrationStats({ messages: { source: 5, target: 5 }, junk: "x" });
    expect(rows).toEqual([{ model: "messages", source: 5, target: 5 }]);
    expect(parseMigrationStats(undefined)).toEqual([]);
  });
});

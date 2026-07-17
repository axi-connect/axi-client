import {
  databasePollInterval,
  DB_POLL_DEGRADE_AFTER_MS,
  DB_POLL_DEGRADED_MS,
  DB_POLL_MS,
  MIGRATION_POLL_MS,
  migrationPollInterval,
} from "../polling";

const NOW = 1_800_000_000_000;

describe("databasePollInterval", () => {
  it("3 s en estados transitorios (validating/migrating)", () => {
    expect(databasePollInterval({ status: "validating", pollStartedAt: NOW, reloginOpen: false, now: NOW })).toBe(DB_POLL_MS);
    expect(databasePollInterval({ status: "migrating", pollStartedAt: NOW, reloginOpen: false, now: NOW })).toBe(DB_POLL_MS);
  });

  it("degrada a 15 s pasados 10 min de job en vuelo", () => {
    expect(
      databasePollInterval({
        status: "validating",
        pollStartedAt: NOW - DB_POLL_DEGRADE_AFTER_MS,
        reloginOpen: false,
        now: NOW,
      }),
    ).toBe(DB_POLL_DEGRADED_MS);
  });

  it("false en estados asentados (sin requests de más)", () => {
    for (const status of ["pending", "active", "error", "disabled"] as const) {
      expect(databasePollInterval({ status, pollStartedAt: null, reloginOpen: false, now: NOW })).toBe(false);
    }
    expect(databasePollInterval({ status: null, pollStartedAt: null, reloginOpen: false })).toBe(false);
  });

  it("false con el ReLoginModal abierto (se reanuda al renovar)", () => {
    expect(databasePollInterval({ status: "migrating", pollStartedAt: NOW, reloginOpen: true, now: NOW })).toBe(false);
  });
});

describe("migrationPollInterval", () => {
  it("5 s mientras la migración corre", () => {
    for (const status of ["pending", "copying", "cutover", "verifying"] as const) {
      expect(migrationPollInterval({ status, reloginOpen: false })).toBe(MIGRATION_POLL_MS);
    }
  });

  it("false en terminales y con re-login abierto", () => {
    for (const status of ["completed", "failed", "rolled_back"] as const) {
      expect(migrationPollInterval({ status, reloginOpen: false })).toBe(false);
    }
    expect(migrationPollInterval({ status: "copying", reloginOpen: true })).toBe(false);
    expect(migrationPollInterval({ status: null, reloginOpen: false })).toBe(false);
  });
});

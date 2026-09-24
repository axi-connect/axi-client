import { importFinishedAfter } from "../use-quality-datasets";

jest.mock("../../platform-client", () => ({ platformClient: { GET: jest.fn() } }));

describe("importFinishedAfter (M11)", () => {
  it("solo cuenta un resumen terminado después del arranque del import", () => {
    const since = new Date("2026-09-24T10:00:00.000Z").getTime();
    expect(importFinishedAfter(null, since)).toBe(false);
    expect(importFinishedAfter({ finished_at: "2026-09-24T09:50:00.000Z" }, since)).toBe(false);
    expect(importFinishedAfter({ finished_at: "2026-09-24T10:00:03.000Z" }, since)).toBe(true);
  });
});

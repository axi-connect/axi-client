import { bytesToGb, formatQuota, gbToBytes, GIB, parseQuotaInput } from "../storage-quota";

describe("storage-quota", () => {
  it("convierte GB ↔ bytes con GiB, como el disco", () => {
    expect(gbToBytes(15)).toBe(15 * GIB);
    expect(bytesToGb(15 * GIB)).toBe(15);
    expect(bytesToGb(null)).toBeNull();
    expect(gbToBytes(null)).toBeNull();
  });

  it("formatea en español: coma decimal, MB bajo 1 GB y «Sin límite»", () => {
    expect(formatQuota(15 * GIB)).toBe("15 GB");
    expect(formatQuota(1.5 * GIB)).toBe("1,5 GB");
    expect(formatQuota(512 * 1024 ** 2)).toBe("512 MB");
    expect(formatQuota(null)).toBe("Sin límite");
  });

  it("lee el input: vacío = sin tope, coma decimal, negativos inválidos", () => {
    expect(parseQuotaInput("")).toBeNull();
    expect(parseQuotaInput("2,5")).toBe(2.5);
    expect(parseQuotaInput("40")).toBe(40);
    expect(parseQuotaInput("-1")).toBeUndefined();
    expect(parseQuotaInput("mucho")).toBeUndefined();
  });
});

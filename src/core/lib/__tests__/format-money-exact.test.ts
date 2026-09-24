import { formatMoney, formatMoneyExact } from "@/core/lib/format";

describe("formatMoneyExact: nunca esconde una fracción", () => {
  it("con centavos los enseña aunque sea COP; redondo, igual que formatMoney", () => {
    expect(formatMoneyExact(20, "COP")).toMatch(/\$\s?0,20/);
    expect(formatMoney(20, "COP")).toMatch(/\$\s?0$/);
    expect(formatMoneyExact(68_552_220, "COP")).toMatch(/685\.522,20/);
    expect(formatMoneyExact(68_552_200, "COP")).toBe(
      formatMoney(68_552_200, "COP"),
    );
    expect(formatMoneyExact(35_000, "USD")).toBe(formatMoney(35_000, "USD"));
  });
});

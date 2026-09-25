import { canSendDelivery, platformRoleFromToken } from "../platform-role";

function token(claims: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${encode({ alg: "HS256" })}.${encode(claims)}.firma`;
}

describe("platformRoleFromToken", () => {
  it("lee el claim platform_role", () => {
    expect(platformRoleFromToken(token({ sub: "u", platform_role: "support" }))).toBe("support");
    expect(platformRoleFromToken(token({ sub: "u", platform_role: "super_admin" }))).toBe("super_admin");
  });

  it("null sin token, con un token roto o con un rol desconocido", () => {
    expect(platformRoleFromToken(null)).toBeNull();
    expect(platformRoleFromToken("no-es-un-jwt")).toBeNull();
    expect(platformRoleFromToken("a.%%%.c")).toBeNull();
    expect(platformRoleFromToken(token({ platform_role: "root" }))).toBeNull();
  });
});

describe("canSendDelivery", () => {
  it("solo super_admin envía; support solo ve", () => {
    expect(canSendDelivery("super_admin")).toBe(true);
    expect(canSendDelivery("support")).toBe(false);
    expect(canSendDelivery("billing_ops")).toBe(false);
  });

  it("sin rol conocido no bloquea en la UI (decide el servidor)", () => {
    expect(canSendDelivery(null)).toBe(true);
  });
});

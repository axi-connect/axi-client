import { commenterLabel } from "@/modules/social/domain/social";

describe("commenterLabel", () => {
  it("Instagram: el @usuario", () => {
    expect(commenterLabel({ network: "instagram", from_username: "cliente.demo" })).toBe("@cliente.demo");
  });

  it("Facebook: el nombre visible, sin @", () => {
    expect(commenterLabel({ network: "facebook", from_username: "Cliente Demo" })).toBe("Cliente Demo");
  });

  it("sin nombre: «Alguien»", () => {
    expect(commenterLabel({ network: "facebook", from_username: null })).toBe("Alguien");
    expect(commenterLabel({ network: "instagram", from_username: "  " })).toBe("Alguien");
  });
});

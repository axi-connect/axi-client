import { planFor } from "@/modules/orders/ui/components/detail/OrderDetailRail";

describe("planFor (auditoría P1–P5, M6: el plan va con su pedido)", () => {
  it("devuelve el plan leído solo si es del pedido que se mira", () => {
    const loaded = { orderId: "o1", plan: { id: "plan-o1" } };
    expect(planFor(loaded, "o1")).toEqual({ id: "plan-o1" });
    // Al cambiar al pedido o2, hasta que llega el suyo, no hay plan.
    expect(planFor(loaded, "o2")).toBeNull();
  });
});

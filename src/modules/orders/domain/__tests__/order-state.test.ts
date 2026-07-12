import {
  canTransition,
  dragActionFor,
  isKanbanStatus,
  isTerminal,
  KANBAN_COLUMNS,
  ORDER_TRANSITIONS,
} from "../order-state";
import type { OrderStatus } from "../order";

/**
 * La máquina del frontend debe ser ESPEJO de order_transitions.ts del backend:
 * un drift aquí produce drags que el backend rechaza con 409.
 */
describe("order-state", () => {
  it("refleja la máquina de estados del backend", () => {
    expect(ORDER_TRANSITIONS).toEqual({
      draft: ["pending", "cancelled"],
      pending: ["confirmed", "payment_reported", "cancelled"],
      confirmed: ["payment_reported", "paid", "cancelled"],
      payment_reported: ["paid", "confirmed", "pending", "cancelled"],
      paid: ["fulfilled", "cancelled"],
      fulfilled: [],
      cancelled: [],
    });
  });

  it("canTransition valida transiciones legales e ilegales", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("payment_reported", "pending")).toBe(true);
    expect(canTransition("fulfilled", "cancelled")).toBe(false);
    expect(canTransition("draft", "paid")).toBe(false);
  });

  it("fulfilled y cancelled son terminales", () => {
    expect(isTerminal("fulfilled")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
    expect(isTerminal("paid")).toBe(false);
  });

  it("el kanban excluye draft y cancelled", () => {
    expect(isKanbanStatus("draft" as OrderStatus)).toBe(false);
    expect(isKanbanStatus("cancelled" as OrderStatus)).toBe(false);
    expect(KANBAN_COLUMNS).toEqual([
      "pending",
      "confirmed",
      "payment_reported",
      "paid",
      "fulfilled",
    ]);
  });

  it("cada acción de drag corresponde a una transición legal del backend", () => {
    expect(dragActionFor("pending", "confirmed")).toBe("confirm");
    expect(dragActionFor("confirmed", "payment_reported")).toBe("report_payment");
    expect(dragActionFor("payment_reported", "paid")).toBe("verify_payment");
    expect(dragActionFor("paid", "fulfilled")).toBe("fulfill");
    // Retrocesos NO se arrastran (los produce el backend al rechazar un pago)
    expect(dragActionFor("payment_reported", "confirmed")).toBeNull();
    expect(dragActionFor("confirmed", "paid")).toBeNull();
  });
});

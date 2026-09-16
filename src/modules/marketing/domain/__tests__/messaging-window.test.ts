import { daysToDeliver, messagingWindowNotice } from "../messaging-window";

const window_ = (over: Partial<{ limit: number | null; used: number; remaining: number | null }> = {}) => ({
  limit: 250,
  used: 0,
  remaining: 250,
  ...over,
});

describe("messaging-window — en cuántos días cabe la campaña", () => {
  it("reparte por el cupo", () => {
    expect(daysToDeliver(820, 250)).toBe(4);
    expect(daysToDeliver(250, 250)).toBe(1);
    expect(daysToDeliver(251, 250)).toBe(2);
  });

  it("sin tope conocido sale entero, y `null` NO es cero", () => {
    expect(daysToDeliver(5000, null)).toBeNull();
    expect(messagingWindowNotice(5000, window_({ limit: null, remaining: null }))).toBeNull();
  });

  it("no avisa de lo que cabe hoy: sería ruido", () => {
    expect(messagingWindowNotice(200, window_())).toBeNull();
    expect(messagingWindowNotice(250, window_())).toBeNull();
  });

  it("avisa cuando de verdad va a tardar", () => {
    // Es la diferencia entre «tarda más de lo que esperaba» y «esto está roto».
    expect(messagingWindowNotice(820, window_())).toEqual({
      days: 4,
      limit: 250,
      remaining: 250,
    });
  });

  it("cuenta el cupo YA gastado, que es el caso normal a media jornada", () => {
    // 820 con 50 libres: hoy caben 50 y quedan 770 a 250/día → 1 + 4 = 5.
    expect(messagingWindowNotice(820, window_({ used: 200, remaining: 50 }))).toMatchObject({
      days: 5,
    });
  });

  it("y por eso deja de CALLAR cuando queda poco cupo", () => {
    // 250 destinatarios con 50 libres tardan dos días, no uno. Calculando con
    // el cupo entero daba «1 día» y no se avisaba nada.
    expect(messagingWindowNotice(250, window_({ used: 200, remaining: 50 }))).toMatchObject({
      days: 2,
    });
  });

  it("sin cupo cargado todavía, no inventa", () => {
    expect(messagingWindowNotice(820, null)).toBeNull();
  });
});

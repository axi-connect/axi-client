import {
  activeSegmentIndex,
  activeWordIndex,
  estimatedSpeechMs,
  segmentStartMs,
  segmentWindows,
} from "@/modules/calls/domain/recording-sync";

describe("sincronía transcripción ↔ grabación (premium F2)", () => {
  it("el segmento suena en spoken_at_ms + desfase; sin spoken_at_ms cae a at_ms", () => {
    expect(segmentStartMs({ at_ms: 9_000, spoken_at_ms: 4_000, text: "x" }, 2_250)).toBe(6_250);
    expect(segmentStartMs({ at_ms: 9_000, spoken_at_ms: null, text: "x" }, 2_250)).toBe(11_250);
    expect(segmentStartMs({ at_ms: 9_000, text: "x" }, null)).toBe(9_000);
  });

  it("cada ventana termina en el siguiente segmento o al acabar de decirse, lo que llegue antes", () => {
    const windows = segmentWindows(
      [
        { at_ms: 0, spoken_at_ms: 2_000, text: "Hola, ¿hablo con Laura?" },
        { at_ms: 0, spoken_at_ms: 9_000, text: "Sí." },
        { at_ms: 0, spoken_at_ms: 10_000, text: "x".repeat(200) },
      ],
      0,
      20_000,
    );
    expect(windows[0]).toEqual({ start: 2_000, end: 2_000 + estimatedSpeechMs("Hola, ¿hablo con Laura?") });
    expect(windows[1]).toEqual({ start: 9_000, end: 9_800 }); // mínimo de 0,8 s
    expect(windows[2]).toEqual({ start: 10_000, end: 20_000 }); // no pasa del total
  });

  it("marcas desordenadas no producen ventanas que retroceden", () => {
    const windows = segmentWindows(
      [
        { at_ms: 5_000, text: "uno" },
        { at_ms: 3_000, text: "dos" },
      ],
      0,
      10_000,
    );
    expect(windows[1]?.start).toBe(5_000);
  });

  it("segmento activo = el último que ya empezó; antes del primero, ninguno", () => {
    const windows = [
      { start: 1_000, end: 3_000 },
      { start: 4_000, end: 6_000 },
    ];
    expect(activeSegmentIndex(windows, 500)).toBe(-1);
    expect(activeSegmentIndex(windows, 1_000)).toBe(0);
    expect(activeSegmentIndex(windows, 3_500)).toBe(0); // en el silencio sigue el último
    expect(activeSegmentIndex(windows, 5_000)).toBe(1);
  });

  it("palabra activa proporcional a la longitud de cada palabra; fuera de la ventana, -1", () => {
    const window = { start: 0, end: 1_000 };
    expect(activeWordIndex("Hola Laura", window, 0)).toBe(0);
    expect(activeWordIndex("Hola Laura", window, 999)).toBe(1);
    expect(activeWordIndex("Hola Laura", window, 1_000)).toBe(-1);
    expect(activeWordIndex("", window, 10)).toBe(-1);
  });
});

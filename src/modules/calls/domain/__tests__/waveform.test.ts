import { computePeaks, peakAt } from "@/modules/calls/domain/waveform";

describe("picos de la grabación (premium F2)", () => {
  it("mezcla las pistas tomando el pico mayor de cada cubeta y normaliza a 1", () => {
    const caller = new Float32Array([0.1, -0.2, 0, 0, 0, 0]);
    const agent = new Float32Array([0, 0, 0, 0.4, -0.8, 0]);
    const peaks = computePeaks([caller, agent], 3);
    expect(peaks).toHaveLength(3);
    [0.25, 0.5, 1].forEach((expected, index) => expect(peaks[index]).toBeCloseTo(expected, 5));
  });

  it("una grabación casi muda no se infla a pantalla completa", () => {
    const peaks = computePeaks([new Float32Array([0.01, 0.01])], 2);
    expect(Math.max(...peaks)).toBeLessThan(0.5);
  });

  it("sin audio o sin cubetas, vacío", () => {
    expect(computePeaks([], 10)).toEqual([]);
    expect(computePeaks([new Float32Array([0.5])], 0)).toEqual([]);
  });

  it("peakAt interpola entre cubetas y acota la posición", () => {
    expect(peakAt([0, 1], 0.5)).toBeCloseTo(0.5);
    expect(peakAt([0, 1], 2)).toBe(1);
    expect(peakAt([], 0.5)).toBe(0);
  });
});

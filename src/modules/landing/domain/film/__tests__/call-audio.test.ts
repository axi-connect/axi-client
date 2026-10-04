/**
 * Escucha la llamada (plan §20): los subtítulos, la onda, las etapas y las notas
 * se sincronizan con el audio real. Lo que se comprueba es lo que el visitante
 * ve y oye a la vez: cada palabra se enciende dentro del tramo en que se dice,
 * en orden, y nada ocurre después de que la llamada termina.
 */
import {
  CALL_NOTES,
  CALL_PEAKS,
  CALL_PHRASES,
  CALL_STAGES,
  CALL_START,
  CALL_TOTAL,
  CALL_TRACKS,
  CALL_WORDS,
  callClock,
  litCount,
} from "../call-audio"

describe("la llamada de ejemplo", () => {
  it.each([0, 1] as const)("pista %i: las palabras son el texto de sus tramos, en orden y dentro de su tramo", (track) => {
    const words = CALL_WORDS[track]
    expect(words.map((w) => w.word).join(" ")).toBe(CALL_PHRASES[track].map(([, , text]) => text).join(" "))
    for (let i = 1; i < words.length; i++) expect(words[i].at).toBeGreaterThan(words[i - 1].at)
    for (const [from, to, text] of CALL_PHRASES[track]) {
      const inPhrase = words.filter((w) => text.split(" ").includes(w.word) && w.at >= from && w.at < to)
      expect(inPhrase.length).toBe(text.split(" ").length)
    }
    const last = CALL_PHRASES[track][CALL_PHRASES[track].length - 1]
    expect(last[1]).toBeLessThanOrEqual(CALL_TRACKS[track].duration)
  })

  it("litCount: nada antes de la primera palabra, todo al final, y nunca retrocede", () => {
    for (const track of [0, 1] as const) {
      const first = CALL_WORDS[track][0].at
      expect(litCount(track, first - 0.01)).toBe(0)
      expect(litCount(track, first)).toBe(1)
      expect(litCount(track, CALL_TRACKS[track].duration)).toBe(CALL_WORDS[track].length)
      let prev = 0
      for (let t = 0; t <= CALL_TRACKS[track].duration; t += 0.05) {
        const n = litCount(track, t)
        expect(n).toBeGreaterThanOrEqual(prev)
        prev = n
      }
    }
  })

  it("etapas y notas van en orden y caen dentro de la llamada", () => {
    for (const list of [CALL_STAGES.map(([, at]) => at), CALL_NOTES.map(([, , at]) => at)]) {
      expect([...list].sort((a, b) => a - b)).toEqual(list)
      for (const at of list) {
        expect(at).toBeGreaterThanOrEqual(0)
        expect(at).toBeLessThan(CALL_TOTAL)
      }
    }
    // La propuesta y el cierre los dice Axi: caen en su pista.
    expect(CALL_STAGES[2][1]).toBeGreaterThan(CALL_START[1])
  })

  it("la onda: una barra por ~62 ms de cada pista, en [0, 1]", () => {
    CALL_PEAKS.forEach((peaks, track) => {
      expect(Math.abs(peaks.length * 0.0625 - CALL_TRACKS[track].duration)).toBeLessThan(0.1)
      for (const v of peaks) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    })
  })

  it("las notas no prometen un canal de envío (§19.6)", () => {
    for (const [, value] of CALL_NOTES) expect(value).not.toMatch(/whatsapp|instagram|correo|sms/i)
  })

  it("el reloj", () => {
    expect(callClock(0)).toBe("0:00")
    expect(callClock(4.99)).toBe("0:04")
    expect(callClock(CALL_TOTAL)).toBe("0:12")
  })
})

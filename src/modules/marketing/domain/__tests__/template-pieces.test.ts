import {
  breaksDesktop,
  canAddButton,
  groupButtons,
  visibleButtons,
  type TemplateButton,
} from "../template-pieces";

const quick = (text = "Sí"): TemplateButton => ({ type: "quick_reply", text });
const url = (text = "Ir"): TemplateButton => ({ type: "url", text, url: "https://x.co" });
const phone = (): TemplateButton => ({ type: "phone_number", text: "Llámanos", phone_number: "1" });

describe("template-pieces — los topes de Meta", () => {
  it("apaga el añadir por tipo, no solo por el total", () => {
    expect(canAddButton([url(), url()], "url")).toBe(false);
    expect(canAddButton([url(), url()], "quick_reply")).toBe(true);
    expect(canAddButton([phone()], "phone_number")).toBe(false);
  });

  it("y por el total de diez", () => {
    const nine = Array.from({ length: 9 }, () => quick());
    expect(canAddButton(nine, "url")).toBe(true);
    expect(canAddButton([...nine, url()], "quick_reply")).toBe(false);
  });
});

describe("agrupar las rápidas", () => {
  it("las junta, porque intercaladas Meta rechaza la plantilla entera", () => {
    // «rápida, enlace, rápida» es lo que su API llama «invalid combination».
    const mixed = [quick("Sí"), url("Ir"), quick("No")];
    expect(groupButtons(mixed).map((button) => button.type)).toEqual([
      "quick_reply",
      "quick_reply",
      "url",
    ]);
  });

  it("y conserva el orden dentro de cada grupo", () => {
    const ordered = [url("A"), quick("1"), url("B"), quick("2")];
    expect(groupButtons(ordered).map((button) => (button as { text: string }).text)).toEqual([
      "1",
      "2",
      "A",
      "B",
    ]);
  });
});

describe("lo que el cliente verá de verdad", () => {
  it("con más de tres, WhatsApp enseña dos y esconde el resto", () => {
    expect(visibleButtons([quick(), url(), phone()])).toEqual({
      shown: [quick(), url(), phone()],
      hidden: 0,
    });
    const four = [quick("1"), quick("2"), url("A"), phone()];
    expect(visibleButtons(four).shown).toHaveLength(2);
    expect(visibleButtons(four).hidden).toBe(2);
  });

  it("avisa de lo que NO se ve en WhatsApp de escritorio", () => {
    // Cuatro o más, o una rápida mezclada con otro tipo.
    expect(breaksDesktop([quick(), quick()])).toBe(false);
    expect(breaksDesktop([url(), phone()])).toBe(false);
    expect(breaksDesktop([quick(), url()])).toBe(true);
    expect(breaksDesktop([quick(), quick(), quick(), quick()])).toBe(true);
  });
});

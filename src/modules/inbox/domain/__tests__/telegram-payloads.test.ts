import {
  extractContactReaction,
  extractInteractivePayload,
  extractSharedContact,
  startedChat,
} from "../inbox";

describe("payloads del canal Telegram", () => {
  it("lee la petición nativa del dato", () => {
    expect(
      extractInteractivePayload({ interactive: { kind: "request", body: "¿Tu número?", request: "phone" } }),
    ).toEqual({ kind: "request", body: "¿Tu número?", request: "phone" });
    expect(extractInteractivePayload({ interactive: { kind: "request", body: "x", request: "foto" } })).toBeNull();
  });

  it("conserva la sección de cada opción", () => {
    const parsed = extractInteractivePayload({
      interactive: {
        kind: "options",
        body: "Horarios",
        options: [
          { id: "slot:a", title: "12:30", section: "Sáb 18 oct" },
          { id: "slot:b", title: "13:00", section: "Dom 19 oct" },
        ],
      },
    });
    expect(parsed?.kind === "options" ? parsed.options.map((option) => option.section) : null).toEqual([
      "Sáb 18 oct",
      "Dom 19 oct",
    ]);
  });

  it("reconoce el inicio del chat", () => {
    expect(startedChat({ bot_command: "start" })).toBe(true);
    expect(startedChat({ bot_command: "otro" })).toBe(false);
    expect(startedChat(null)).toBe(false);
  });

  it("lee el contacto compartido", () => {
    expect(
      extractSharedContact({
        shared_contact: { phone_number: "+573104827719", first_name: "Camila", last_name: "Rojas", verified: true },
      }),
    ).toEqual({ phone_number: "+573104827719", name: "Camila Rojas", verified: true });
    expect(extractSharedContact({ shared_contact: { first_name: "x" } })).toBeNull();
  });

  it("lee la reacción del cliente y la ausencia de ella", () => {
    expect(extractContactReaction({ contact_reaction: { emoji: "❤", at: "2026-10-12T15:00:00.000Z" } })).toBe("❤");
    expect(extractContactReaction({ contact_reaction: null })).toBeNull();
    expect(extractContactReaction({})).toBeNull();
  });
});

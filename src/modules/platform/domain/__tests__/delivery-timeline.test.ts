import { deliveryTimeline } from "../delivery-timeline";

const base = {
  status: "sent" as const,
  created_at: "2026-09-25T06:00:02Z",
  password_set_at: null,
  cc: ["caja@laespiga.co"],
  steps: { offer: true, trial: true, invite: true, kit: true, committed: true },
  attempts: [
    { attempt: 1, audience: "owner" as const, recipient: "andrea@laespiga.co", recipient_masked: "an***@la***.co", status: "sent" as const, provider_message_id: "re_1", error: null, sent_at: "2026-09-25T06:00:05Z" },
    { attempt: 1, audience: "team" as const, recipient: "caja@laespiga.co", recipient_masked: "ca***@la***.co", status: "sent" as const, provider_message_id: "re_2", error: null, sent_at: "2026-09-25T06:00:06Z" },
  ],
};
const owner = { name: "Andrea Rincón", email: "andrea@laespiga.co" };

describe("deliveryTimeline", () => {
  it("enviada: todo hecho y la contraseña esperando", () => {
    const items = deliveryTimeline(base, owner);
    expect(items.map((item) => [item.id, item.state])).toEqual([
      ["committed", "done"],
      ["invite", "done"],
      ["owner_mail", "done"],
      ["team_mail", "done"],
      ["password", "waiting"],
    ]);
    expect(items[2]).toMatchObject({ title: "Correo entregado a andrea@laespiga.co", at: "2026-09-25T06:00:05Z" });
    expect(items[4]?.title).toBe("Andrea crea su contraseña");
  });

  it("el enlace no tiene hora propia en el contrato: no se inventa", () => {
    expect(deliveryTimeline(base, owner).find((item) => item.id === "invite")?.at).toBeNull();
  });

  it("contraseña creada: el último paso queda hecho con su hora", () => {
    const items = deliveryTimeline({ ...base, password_set_at: "2026-09-25T06:12:00Z" }, owner);
    expect(items.at(-1)).toMatchObject({ state: "done", at: "2026-09-25T06:12:00Z" });
  });

  it("sin copia al equipo no hay paso de copia", () => {
    const items = deliveryTimeline({ ...base, cc: [], attempts: base.attempts.filter((a) => a.audience === "owner") }, owner);
    expect(items.some((item) => item.id === "team_mail")).toBe(false);
  });

  it("una copia que falló se nombra y el correo del dueño en cola queda activo", () => {
    const items = deliveryTimeline(
      {
        ...base,
        status: "mail_queued",
        attempts: [
          { ...base.attempts[0]!, status: "pending", sent_at: null },
          { ...base.attempts[1]!, status: "failed", error: "Buzón inexistente", sent_at: null },
        ],
      },
      owner,
    );
    expect(items.find((item) => item.id === "owner_mail")).toMatchObject({ state: "active", title: "Correo del dueño en camino", at: null });
    expect(items.find((item) => item.id === "team_mail")).toMatchObject({
      state: "failed",
      title: "La copia no salió a caja@laespiga.co",
      detail: "Buzón inexistente",
    });
    expect(items.at(-1)?.state).toBe("active");
  });
});

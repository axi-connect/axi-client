import { groupMessagesByDay } from "../group-messages-by-day"
import type { UiMessage } from "@/modules/inbox/domain/inbox"

const msg = (id: string, created_at: string) => ({ id, created_at }) as UiMessage
const local = (y: number, m: number, d: number, h: number) => new Date(y, m - 1, d, h).toISOString()

describe("groupMessagesByDay", () => {
  it("agrupa por día LOCAL con claves estables y respeta el orden", () => {
    const groups = groupMessagesByDay([
      msg("a", local(2026, 9, 9, 23)),
      msg("b", local(2026, 9, 10, 0)),
      msg("c", local(2026, 9, 10, 9)),
    ])
    expect(groups.map((g) => g.key)).toEqual(["2026-09-09", "2026-09-10"])
    expect(groups[1].items.map((m) => m.id)).toEqual(["b", "c"])
  })
  it("vacío ⇒ sin grupos; fecha inválida cae en el grupo anterior", () => {
    expect(groupMessagesByDay([])).toEqual([])
    const groups = groupMessagesByDay([msg("a", local(2026, 9, 9, 10)), msg("b", "nope")])
    expect(groups).toHaveLength(1)
    expect(groups[0].items).toHaveLength(2)
  })
})

import { render } from "@testing-library/react"
import { ChannelKindIcon } from "../ChannelKindIcon"
import type { ChannelKind } from "@/modules/channels/domain/channel"

const KINDS: ChannelKind[] = ["whatsapp_cloud", "whatsapp_web", "instagram_dm", "facebook_messenger", "simulator"]

describe("ChannelKindIcon", () => {
  it.each(KINDS)("pinta un glifo para %s, oculto al lector por defecto", (kind) => {
    const { container } = render(<ChannelKindIcon kind={kind} className="size-3" />)
    expect(container.querySelector("svg")).not.toBeNull()
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull()
  })
  it("con aria-label se anuncia como imagen", () => {
    const { getByRole } = render(<ChannelKindIcon kind="instagram_dm" aria-label="Instagram" />)
    expect(getByRole("img", { name: "Instagram" })).toBeInTheDocument()
  })
})

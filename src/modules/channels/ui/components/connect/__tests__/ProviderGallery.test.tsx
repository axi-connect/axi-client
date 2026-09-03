import { render, screen } from "@testing-library/react"

import { channelProvider, connectableProviders } from "@/modules/channels/domain/channel-providers"
import { ProviderGallery } from "../ProviderGallery"

describe("ProviderGallery", () => {
  it("por defecto ofrece todo lo conectable del registry", () => {
    render(<ProviderGallery selected={null} onSelect={jest.fn()} />)
    expect(screen.getAllByRole("radio")).toHaveLength(connectableProviders().length)
  })

  it("con `providers` acotados solo pinta esos", () => {
    render(
      <ProviderGallery
        selected={null}
        onSelect={jest.fn()}
        providers={[channelProvider("whatsapp_cloud")]}
      />,
    )
    const radios = screen.getAllByRole("radio")
    expect(radios).toHaveLength(1)
    expect(radios[0]).toHaveAccessibleName(/whatsapp/i)
    expect(screen.queryByText(/instagram/i)).toBeNull()
  })
})

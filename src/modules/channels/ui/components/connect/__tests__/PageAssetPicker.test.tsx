import { fireEvent, render, screen } from "@testing-library/react"

import type { PageAsset } from "@/modules/channels/infrastructure/hooks/use-page-signup"
import { PageAssetPicker } from "../PageAssetPicker"

function asset(overrides: Partial<PageAsset> & { asset_id: string }): PageAsset {
  return {
    name: `Página ${overrides.asset_id}`,
    username: null,
    unavailable: false,
    already_connected: false,
    ...overrides,
  } as PageAsset
}

describe("PageAssetPicker", () => {
  it("con un solo activo disponible avanza solo, y UNA sola vez aunque el padre re-renderice", () => {
    const onChoose = jest.fn()
    const assets = [asset({ asset_id: "a" }), asset({ asset_id: "b", unavailable: true })]
    const view = render(<PageAssetPicker assets={assets} product="messenger" connecting={false} onChoose={onChoose} />)

    // `onChoose` cambia de identidad en cada render del padre: antes el efecto
    // dependía de `assets` con un eslint-disable; ahora la auto-elección va por ref
    view.rerender(<PageAssetPicker assets={assets} product="messenger" connecting onChoose={jest.fn()} />)
    view.rerender(<PageAssetPicker assets={assets} product="messenger" connecting onChoose={jest.fn()} />)

    expect(onChoose).toHaveBeenCalledTimes(1)
    expect(onChoose).toHaveBeenCalledWith("a")
    // «Conectando…» es una región viva: quien no ve la pantalla también se entera
    expect(screen.getByRole("status")).toHaveTextContent(/conectando página a/i)
  })

  it("con varias pinta un radiogroup de verdad: radios directos, foco rotatorio y flechas", () => {
    const onChoose = jest.fn()
    render(
      <PageAssetPicker
        assets={[asset({ asset_id: "a" }), asset({ asset_id: "b" }), asset({ asset_id: "c" })]}
        product="messenger"
        connecting={false}
        onChoose={onChoose}
      />,
    )

    const group = screen.getByRole("radiogroup", { name: /cuentas autorizadas/i })
    const radios = screen.getAllByRole("radio")
    expect(radios).toHaveLength(3)
    // Los radios son hijos directos del grupo (envoltura propia, sin <li>)
    expect(radios[0].closest("[role=radiogroup]")).toBe(group)
    // La primera queda preseleccionada y es la única en el orden de tabulación
    expect(radios[0]).toHaveAttribute("aria-checked", "true")
    expect(radios[0]).toHaveAttribute("tabindex", "0")
    expect(radios[1]).toHaveAttribute("tabindex", "-1")

    fireEvent.keyDown(group, { key: "ArrowDown" })
    expect(screen.getAllByRole("radio")[1]).toHaveAttribute("aria-checked", "true")
    fireEvent.keyDown(group, { key: "ArrowUp" })
    fireEvent.keyDown(group, { key: "ArrowUp" })
    // Rota: desde la primera, arriba va a la última
    expect(screen.getAllByRole("radio")[2]).toHaveAttribute("aria-checked", "true")

    fireEvent.click(screen.getByRole("button", { name: /^conectar$/i }))
    expect(onChoose).toHaveBeenCalledWith("c")
  })

  it("el motivo de una opción tomada va JUNTO al radio, no dentro, y lo describe", () => {
    render(
      <PageAssetPicker
        assets={[asset({ asset_id: "a" }), asset({ asset_id: "b", unavailable: true }), asset({ asset_id: "c" })]}
        product="messenger"
        connecting={false}
        onChoose={jest.fn()}
      />,
    )

    const taken = screen.getAllByRole("radio")[1]
    expect(taken).toBeDisabled()
    const reason = screen.getByText(/ya está conectada en otra cuenta de axi/i)
    // Un botón deshabilitado no recibe foco: su texto interno no lo lee nadie
    expect(taken).not.toContainElement(reason)
    expect(taken).toHaveAttribute("aria-describedby", reason.id)
  })

  it("el icono del @usuario es el del producto: Instagram o Facebook", () => {
    const assets = [
      asset({ asset_id: "a", username: "tienda" }),
      asset({ asset_id: "b", username: "otra" }),
    ]
    const ig = render(<PageAssetPicker assets={assets} product="instagram" connecting={false} onChoose={jest.fn()} />)
    expect(ig.container.querySelector(".lucide-instagram")).not.toBeNull()
    expect(ig.container.querySelector(".lucide-facebook")).toBeNull()
    ig.unmount()

    const fb = render(<PageAssetPicker assets={assets} product="messenger" connecting={false} onChoose={jest.fn()} />)
    expect(fb.container.querySelector(".lucide-facebook")).not.toBeNull()
    expect(fb.container.querySelector(".lucide-instagram")).toBeNull()
  })
})

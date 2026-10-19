import { safeTimeZone } from "@/core/lib/format"
import { onMediaQueryChange } from "@/core/lib/media-query"

/** Hotfix «Application error»: lo que lanzaba en el render del dashboard y del panel. */
describe("safeTimeZone", () => {
  it("devuelve la zona si el navegador la conoce", () => {
    expect(safeTimeZone("America/Bogota")).toBe("America/Bogota")
  })

  it.each([["Mars/Olympus"], [""], [null], [undefined]])("con %p cae a la del navegador (undefined)", (tz) => {
    expect(safeTimeZone(tz)).toBeUndefined()
  })
})

describe("onMediaQueryChange", () => {
  it("usa addEventListener si existe", () => {
    const mql = { addEventListener: jest.fn(), removeEventListener: jest.fn() } as unknown as MediaQueryList
    const fn = jest.fn()
    onMediaQueryChange(mql, fn)()
    expect(mql.addEventListener).toHaveBeenCalledWith("change", fn)
    expect(mql.removeEventListener).toHaveBeenCalledWith("change", fn)
  })

  it("en Safari < 14 cae a addListener/removeListener", () => {
    const mql = { addListener: jest.fn(), removeListener: jest.fn() } as unknown as MediaQueryList
    const fn = jest.fn()
    onMediaQueryChange(mql, fn)()
    expect(mql.addListener).toHaveBeenCalledWith(fn)
    expect(mql.removeListener).toHaveBeenCalledWith(fn)
  })
})

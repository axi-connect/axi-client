const success = jest.fn((opts: { id?: string }) => opts.id ?? "x")
const error = jest.fn((opts: { id?: string }) => opts.id ?? "x")
const warning = jest.fn((opts: { id?: string }) => opts.id ?? "x")
jest.mock("sileo", () => ({
  sileo: { success, error, warning, info: jest.fn(() => "i"), dismiss: jest.fn(), promise: jest.fn() },
}))

import { DEDUPE_WINDOW_MS, notify } from "../notify"

const FORBIDDEN = "Los usuarios, la facturación y los pagos no se pueden cambiar desde una sesión de soporte."

beforeEach(() => jest.clearAllMocks())

describe("notify.fromAlert: un solo aviso por texto en una ventana corta (QA H2-1)", () => {
  it("el aviso de la página y el de la barra de soporte con el mismo texto salen UNA vez", () => {
    const t = 1_000_000
    notify.fromAlert({ tone: "warning", title: "No disponible en soporte", description: FORBIDDEN }, t)
    notify.fromAlert({ tone: "error", title: "No se pudo completar", description: FORBIDDEN }, t + 200)
    expect(warning).toHaveBeenCalledTimes(1)
    expect(error).not.toHaveBeenCalled()
  })

  it("pasada la ventana, vuelve a avisar; un texto distinto avisa siempre", () => {
    const t = 2_000_000
    notify.fromAlert({ tone: "success", title: "Guardado", description: "Uno" }, t)
    notify.fromAlert({ tone: "success", title: "Guardado", description: "Dos" }, t + 10)
    notify.fromAlert({ tone: "success", title: "Guardado", description: "Uno" }, t + DEDUPE_WINDOW_MS + 1)
    expect(success).toHaveBeenCalledTimes(3)
  })
})

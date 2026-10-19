import { render, screen, fireEvent } from "@testing-library/react"

import { ErrorRecovery } from "../ErrorRecovery"
import { QuietBoundary } from "../QuietBoundary"
import { reloadOnce } from "@/core/lib/chunk-recovery"
import { reportClientError } from "@/core/lib/report-client-error"

jest.mock("@/core/lib/report-client-error", () => ({ reportClientError: jest.fn() }))
jest.mock("@/core/lib/chunk-recovery", () => ({
  ...jest.requireActual("@/core/lib/chunk-recovery"),
  reloadOnce: jest.fn(),
}))

const reload = reloadOnce as jest.Mock
const report = reportClientError as jest.Mock

/** Hotfix «Application error»: la pantalla de marca que sustituye a la genérica de Next. */
describe("ErrorRecovery", () => {
  beforeEach(() => {
    reload.mockReset()
    report.mockReset()
  })

  it("un error cualquiera: informa, ofrece reintentar y no enseña el mensaje técnico", () => {
    const reset = jest.fn()
    const error = Object.assign(new Error("Cannot read properties of undefined (reading 'x')"), { digest: "d1g3st" })
    render(<ErrorRecovery error={error} reset={reset} boundary="private" inline />)

    expect(screen.getByRole("heading", { name: "Algo no cargó bien" })).toBeInTheDocument()
    expect(screen.queryByText(/Cannot read/)).not.toBeInTheDocument()
    expect(screen.getByText("Código: d1g3st")).toBeInTheDocument()
    expect(report).toHaveBeenCalledWith({ kind: "boundary", error, boundary: "private" })
    expect(reload).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it("un chunk que no cargó recarga sola (una vez) y lo dice", () => {
    reload.mockReturnValue(true)
    const error = Object.assign(new Error("Loading chunk 98213 failed."), { name: "ChunkLoadError" })
    render(<ErrorRecovery error={error} reset={jest.fn()} boundary="root" />)

    expect(reload).toHaveBeenCalledTimes(1)
    expect(report).toHaveBeenCalledWith({ kind: "chunk", error, boundary: "root" })
    expect(screen.getByText("Actualizando a la versión más reciente…")).toBeInTheDocument()
  })

  it("si ya recargó hace poco, no insiste: ofrece recargar a mano", () => {
    reload.mockReturnValue(false)
    const error = Object.assign(new Error("Loading chunk 98213 failed."), { name: "ChunkLoadError" })
    render(<ErrorRecovery error={error} reset={jest.fn()} boundary="global" />)

    expect(screen.getByRole("button", { name: "Recargar la página" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument()
  })
})

describe("QuietBoundary", () => {
  beforeEach(() => report.mockReset())

  it("una pieza accesoria que lanza desaparece sin tumbar a sus hermanos", () => {
    const Boom = () => {
      throw Object.assign(new Error("Loading chunk 7 failed."), { name: "ChunkLoadError" })
    }
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {})
    render(
      <div>
        <p>La página sigue</p>
        <QuietBoundary name="toaster">
          <Boom />
        </QuietBoundary>
      </div>,
    )
    consoleError.mockRestore()

    expect(screen.getByText("La página sigue")).toBeInTheDocument()
    expect(report).toHaveBeenCalledWith(expect.objectContaining({ kind: "chunk", boundary: "quiet:toaster" }))
  })
})

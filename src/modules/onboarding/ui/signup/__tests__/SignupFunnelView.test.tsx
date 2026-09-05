import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"

import { SignupFunnelView } from "../SignupFunnelView"
import { FIXTURE_CATALOG } from "@/modules/landing/domain/testing/catalog.fixture"
import { LoginError } from "@/core/providers/auth-provider"
import { API_ERROR_CODES } from "@/core/api/problem"

const replace = jest.fn()
// Un solo objeto router, como en Next: un router nuevo por render dispararía
// los efectos que lo tienen como dependencia en cada render.
const router = { replace, push: jest.fn() }
let search = new URLSearchParams("")
jest.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => search,
}))

const signup = jest.fn()
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ signup }),
  useSession: () => ({ status: "unauthenticated", user: null, isAuthenticated: false }),
}))

// La validación async de RHF+Zod se ralentiza con la suite en paralelo.
const WAIT = { timeout: 5000 }
jest.setTimeout(20_000)

// Una pregunta por pantalla (mockup v3): la empresa son dos pantallas y la
// persona propietaria otras dos.
async function fillCompany(nit = "901.234.567-8") {
  fireEvent.change(await screen.findByLabelText(/nombre de la empresa/i, undefined, WAIT), { target: { value: "La Parrilla de Joao" } })
  fireEvent.change(screen.getByLabelText(/^nit/i), { target: { value: nit } })
  fireEvent.click(screen.getByRole("button", { name: /continuar/i }))
  fireEvent.change(await screen.findByLabelText(/ciudad/i, undefined, WAIT), { target: { value: "Medellín" } })
  fireEvent.click(screen.getByRole("button", { name: /continuar/i }))
  await waitFor(() => expect(screen.getByLabelText(/correo de trabajo/i)).toBeInTheDocument(), WAIT)
}

async function fillAccount() {
  fireEvent.change(screen.getByLabelText(/tu nombre/i), { target: { value: "Joao Pereira" } })
  fireEvent.change(screen.getByLabelText(/correo de trabajo/i), { target: { value: "joao@laparrilla.co" } })
  fireEvent.click(screen.getByRole("button", { name: /continuar/i }))
  fireEvent.change(await screen.findByLabelText(/contraseña/i, { selector: "input" }, WAIT), { target: { value: "Parrilla2026!" } })
  fireEvent.click(screen.getByRole("checkbox"))
  fireEvent.click(screen.getByRole("button", { name: /crear mi cuenta/i }))
}

/** Del final del funnel: la línea de resumen que acompaña al CTA. */
function summary() {
  return within(screen.getByLabelText(/resumen de tu elección/i))
}

describe("SignupFunnelView", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.sessionStorage.clear()
    search = new URLSearchParams("")
  })

  it("sin oferta no deja continuar y explica por qué", async () => {
    render(<SignupFunnelView catalog={FIXTURE_CATALOG} />)
    const next = await screen.findByRole("button", { name: /continuar/i })
    expect(next).toBeDisabled()
    expect(screen.getByText(/elige un paquete o al menos un módulo/i)).toBeInTheDocument()
  })

  it("preselecciona el paquete de la URL y entra directo a Empresa", async () => {
    // `sbs` es el enlace del catálogo retirado: aterriza en su equivalente,
    // que es Crecimiento. El nombre viejo ya no existe en ningún sitio.
    search = new URLSearchParams("plan=sbs")
    render(<SignupFunnelView catalog={FIXTURE_CATALOG} />)

    await screen.findByLabelText(/nombre de la empresa/i, undefined, WAIT)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/cómo se llama tu empresa/i)
    // La ruta al pie marca la parada activa y deja volver a la anterior.
    const route = within(screen.getByRole("navigation", { name: /recorrido del registro/i }))
    expect(route.getByLabelText("Empresa")).toHaveAttribute("aria-current", "step")
    expect(route.getByRole("button", { name: /volver a oferta/i })).toBeInTheDocument()

    await fillCompany()
    await fillAccount()
    expect(summary().getByText(/crecimiento/i)).toBeInTheDocument()
  })

  it("el resumen final recoge los dos ejes que llegaron en el enlace", async () => {
    search = new URLSearchParams("plan=escala&volumen=5000&periodo=annual")
    render(<SignupFunnelView catalog={FIXTURE_CATALOG} />)

    await fillCompany()
    await fillAccount()
    const line = summary()
    expect(line.getByText(/escala/i)).toBeInTheDocument()
    expect(line.getByText(/5\.000 al mes/)).toBeInTheDocument()
    expect(line.getByText(/anual, con 1 mes gratis/i)).toBeInTheDocument()
  })

  it("manda Enterprise a ventas", async () => {
    search = new URLSearchParams("plan=enterprise")
    render(<SignupFunnelView catalog={FIXTURE_CATALOG} />)
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/contacto"))
  })

  it("preselecciona módulos, los alterna y avisa cuando el paquete sale mejor", async () => {
    search = new URLSearchParams("modulo=calls")
    render(<SignupFunnelView catalog={FIXTURE_CATALOG} />)
    // Con módulos en la URL también se entra a Empresa; volvemos a Oferta.
    await screen.findByLabelText(/nombre de la empresa/i, undefined, WAIT)
    fireEvent.click(screen.getByRole("button", { name: /atrás/i }))

    const calls = await screen.findByRole("checkbox", { name: /llamadas con ia/i })
    expect(calls).toHaveAttribute("aria-checked", "true")
    fireEvent.click(screen.getByRole("checkbox", { name: /captación de leads/i }))
    expect(screen.getByRole("note")).toHaveTextContent(/crecimiento/i)
  })

  it("crea la cuenta con el wire en snake_case y manda al onboarding", async () => {
    search = new URLSearchParams("plan=free_trial")
    signup.mockResolvedValueOnce({ success: true, company_id: "c1", user_id: "u1", trial_ends_at: "2026-09-08" })
    render(<SignupFunnelView catalog={FIXTURE_CATALOG} />)

    await fillCompany()
    await fillAccount()

    await waitFor(() => expect(signup).toHaveBeenCalledTimes(1), WAIT)
    const payload = signup.mock.calls[0][0]
    expect(payload.offer).toEqual({ kind: "package", codes: ["free_trial"] })
    expect(payload.company).toMatchObject({ name: "La Parrilla de Joao", nit: "901234567-8", country_code: "CO", city: "Medellín" })
    expect(payload.owner).toMatchObject({ email: "joao@laparrilla.co" })
    expect(payload.accepted_terms).toBe(true)
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding?welcome=1"))
    expect(window.sessionStorage.getItem("axi.signup.draft.v1")).toBeNull()
  })

  it("un NIT ya registrado devuelve a Empresa con el error en el campo", async () => {
    search = new URLSearchParams("plan=sbs")
    signup.mockRejectedValueOnce(new LoginError({ code: API_ERROR_CODES.nitTaken, status: 409, message: "taken" }))
    render(<SignupFunnelView catalog={FIXTURE_CATALOG} />)

    await fillCompany()
    await fillAccount()

    await waitFor(() => expect(screen.getByText(/este nit ya tiene una cuenta/i)).toBeInTheDocument(), WAIT)
    expect(screen.getByLabelText(/nombre de la empresa/i)).toHaveValue("La Parrilla de Joao")
  })

  it("un correo en uso devuelve a «Tú» con el error en el campo", async () => {
    search = new URLSearchParams("plan=sbs")
    signup.mockRejectedValueOnce(new LoginError({ code: API_ERROR_CODES.emailInUse, status: 409, message: "in use" }))
    render(<SignupFunnelView catalog={FIXTURE_CATALOG} />)

    await fillCompany()
    await fillAccount()

    // Vuelve a la pantalla «Tú», donde vive el correo, con el error en el campo.
    await waitFor(() => expect(screen.getByText(/este correo ya tiene una cuenta/i)).toBeInTheDocument(), WAIT)
    expect(screen.getByLabelText(/correo de trabajo/i)).toHaveValue("joao@laparrilla.co")
  })

  it("con demasiados intentos avisa cuánto esperar", async () => {
    search = new URLSearchParams("plan=sbs")
    signup.mockRejectedValueOnce(new LoginError({ code: "http/429", status: 429, message: "slow", retryAfterSeconds: 90 }))
    render(<SignupFunnelView catalog={FIXTURE_CATALOG} />)

    await fillCompany()
    await fillAccount()

    await waitFor(() => expect(screen.getByText(/reintenta en 90 s/i)).toBeInTheDocument(), WAIT)
  })
})

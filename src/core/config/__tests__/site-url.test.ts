export {}

/**
 * `SITE_URL` y los ids de analítica se resuelven en carga del módulo, igual que
 * `SALES_WHATSAPP`, así que cada caso recarga `env` aislado (mismo patrón que
 * `env.test.ts`).
 */
const ORIGINAL_URL = process.env.NEXT_PUBLIC_APP_URL
const ORIGINAL_GA = process.env.NEXT_PUBLIC_GA_ID

type SiteEnvModule = typeof import("../env")

async function loadEnv(vars: Record<string, string | undefined>): Promise<SiteEnvModule> {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  let mod: SiteEnvModule | undefined
  await jest.isolateModulesAsync(async () => {
    mod = await import("../env")
  })
  return mod!
}

afterEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_URL
  if (ORIGINAL_GA === undefined) delete process.env.NEXT_PUBLIC_GA_ID
  else process.env.NEXT_PUBLIC_GA_ID = ORIGINAL_GA
})

describe("SITE_URL", () => {
  it("normaliza al origen, sin barra ni ruta sobrante", async () => {
    const { SITE_URL } = await loadEnv({ NEXT_PUBLIC_APP_URL: "https://axi-connect.co/" })
    expect(SITE_URL).toBe("https://axi-connect.co")
  })

  it("lanza si falta: un canonical apuntando a localhost no da error en ningún sitio", async () => {
    await expect(loadEnv({ NEXT_PUBLIC_APP_URL: undefined })).rejects.toThrow(/NEXT_PUBLIC_APP_URL/)
  })

  it("trata la cadena vacía como ausente (así llega una Variable no definida en CI)", async () => {
    await expect(loadEnv({ NEXT_PUBLIC_APP_URL: "   " })).rejects.toThrow(/Falta NEXT_PUBLIC_APP_URL/)
  })

  it("lanza si no es una URL absoluta", async () => {
    await expect(loadEnv({ NEXT_PUBLIC_APP_URL: "axi-connect.co" })).rejects.toThrow(/URL absoluta/)
  })

  it("compone rutas absolutas sin doble barra", async () => {
    const { siteUrl } = await loadEnv({ NEXT_PUBLIC_APP_URL: "https://axi-connect.co" })
    expect(siteUrl("/precios")).toBe("https://axi-connect.co/precios")
    expect(siteUrl("/")).toBe("https://axi-connect.co/")
  })
})

describe("ids de analítica", () => {
  const base = { NEXT_PUBLIC_APP_URL: "https://axi-connect.co" }

  it("degradan a null si faltan: no pueden romper el build de un desarrollador", async () => {
    const { GA_MEASUREMENT_ID, ANALYTICS_ENABLED } = await loadEnv({ ...base, NEXT_PUBLIC_GA_ID: undefined })
    expect(GA_MEASUREMENT_ID).toBeNull()
    expect(ANALYTICS_ENABLED).toBe(false)
  })

  it("lanzan si están mal formados: un id con typo no mide y nadie lo nota", async () => {
    await expect(loadEnv({ ...base, NEXT_PUBLIC_GA_ID: "UA-12345" })).rejects.toThrow(/NEXT_PUBLIC_GA_ID/)
  })

  it("aceptan un id válido", async () => {
    const { GA_MEASUREMENT_ID } = await loadEnv({ ...base, NEXT_PUBLIC_GA_ID: "G-ABC1234567" })
    expect(GA_MEASUREMENT_ID).toBe("G-ABC1234567")
  })
})

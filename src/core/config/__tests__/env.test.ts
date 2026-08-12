/**
 * `SALES_WHATSAPP` es el único punto donde se define el número comercial, y se
 * resuelve en carga del módulo. Por eso cada caso recarga `env` aislado con su
 * propia variable de entorno en vez de importarlo arriba.
 */

const ORIGINAL = process.env.NEXT_PUBLIC_SALES_WHATSAPP

type EnvModule = typeof import("../env")

/** Carga `env.ts` limpio con el valor dado (o sin variable si es `undefined`). */
async function loadEnv(value: string | undefined): Promise<EnvModule> {
  if (value === undefined) delete process.env.NEXT_PUBLIC_SALES_WHATSAPP
  else process.env.NEXT_PUBLIC_SALES_WHATSAPP = value

  let mod: EnvModule | undefined
  await jest.isolateModulesAsync(async () => {
    mod = await import("../env")
  })
  return mod!
}

afterEach(() => {
  process.env.NEXT_PUBLIC_SALES_WHATSAPP = ORIGINAL
})

describe("SALES_WHATSAPP (normalización)", () => {
  it("acepta el número ya canónico", async () => {
    expect((await loadEnv("573224970950")).SALES_WHATSAPP).toBe("573224970950")
  })

  it("completa el indicativo de un celular colombiano dictado sin él", async () => {
    // El bug que traía .env.local: wa.me/3224970950 no resuelve
    expect((await loadEnv("3224970950")).SALES_WHATSAPP).toBe("573224970950")
  })

  it("tolera '+', espacios y guiones como los escribe la gente", async () => {
    expect((await loadEnv("+57 322 497 0950")).SALES_WHATSAPP).toBe("573224970950")
    expect((await loadEnv("322-497-09-50")).SALES_WHATSAPP).toBe("573224970950")
    expect((await loadEnv("(322) 497 0950")).SALES_WHATSAPP).toBe("573224970950")
  })

  it("respeta números internacionales sin tocarles el indicativo", async () => {
    expect((await loadEnv("+1 415 555 2671")).SALES_WHATSAPP).toBe("14155552671")
  })
})

describe("SALES_WHATSAPP (fail-fast)", () => {
  it("lanza si la variable falta", async () => {
    await expect(loadEnv(undefined)).rejects.toThrow(/Falta NEXT_PUBLIC_SALES_WHATSAPP/)
  })

  it("lanza si la variable está vacía o no trae dígitos", async () => {
    await expect(loadEnv("")).rejects.toThrow(/Falta NEXT_PUBLIC_SALES_WHATSAPP/)
    await expect(loadEnv("no tengo")).rejects.toThrow(/Falta NEXT_PUBLIC_SALES_WHATSAPP/)
  })

  it("lanza si el número no es E.164 plausible", async () => {
    await expect(loadEnv("12345")).rejects.toThrow(/no es un número E.164 plausible/)
    await expect(loadEnv("1234567890123456")).rejects.toThrow(/no es un número E.164 plausible/)
  })
})

describe("salesWhatsAppUrl", () => {
  it("sin mensaje devuelve el enlace pelado", async () => {
    expect((await loadEnv("573224970950")).salesWhatsAppUrl()).toBe("https://wa.me/573224970950")
  })

  it("con mensaje lo prellena codificado", async () => {
    expect((await loadEnv("573224970950")).salesWhatsAppUrl("Hola, ¿precio?")).toBe(
      "https://wa.me/573224970950?text=Hola%2C%20%C2%BFprecio%3F",
    )
  })
})

describe("formatSalesWhatsApp", () => {
  it("agrupa el patrón colombiano", async () => {
    expect((await loadEnv("573224970950")).formatSalesWhatsApp()).toBe("+57 322 497 0950")
  })

  it("fuera de ese patrón solo antepone el '+', sin inventar agrupación", async () => {
    expect((await loadEnv("+1 415 555 2671")).formatSalesWhatsApp()).toBe("+14155552671")
  })
})

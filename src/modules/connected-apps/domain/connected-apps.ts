/**
 * Apps conectadas a Axi por la puerta MCP (F5 «Axel OS»): la pantalla de
 * consentimiento OAuth y «Aplicaciones conectadas» en /cuenta. TypeScript puro.
 *
 * Los tipos calcan los DTO del servidor (`axi-server/src/modules/mcp/presentation/dto/oauth_consent.dto.ts`)
 * hasta que `schema.d.ts` se regenere al integrar las ramas: regenerarlo aquí
 * arrastraría todos los cambios de API de `feat/axel-os`.
 */

/** Ver = `area:leer`; ver y cambiar = `area:escribir`. «Sin acceso» no viaja. */
export type ScopeLevel = "leer" | "escribir"
export type AreaChoice = "no" | ScopeLevel

export interface ConsentScope {
  scope: string
  toolset: string
  title: string
  summary: string
  /** El nivel que PIDIÓ la app: la persona puede bajarlo, nunca subirlo. */
  level: ScopeLevel
}

export interface ConsentRequest {
  id: string
  client: {
    client_id: string
    name: string
    uri: string | null
    logo_uri: string | null
    /** `cimd`: identidad verificada por su dominio; `dcr`: nombre autodeclarado. */
    source: "cimd" | "dcr"
  }
  /** A dónde vuelve el navegador al decidir. */
  redirect_host: string
  /** Vuelve a 127.0.0.1/localhost: una app que corre en un computador. */
  loopback: boolean
  scopes: ConsentScope[]
  person: { name: string; company: string; role: string }
  expires_at: string
}

export interface ConnectedApp {
  id: string
  client: {
    client_id: string
    name: string
    uri: string | null
    logo_uri: string | null
    source: "cimd" | "dcr"
  }
  scopes: string[]
  /** Los alcances con el nombre del área (lo arma el servidor desde su catálogo). */
  areas: { scope: string; title: string; level: ScopeLevel }[]
  connected_at: string
  last_used_at: string | null
}

/** Lo que la pantalla elige de entrada: exactamente lo que la app pidió. */
export function initialChoices(scopes: readonly ConsentScope[]): Record<string, AreaChoice> {
  return Object.fromEntries(scopes.map((scope) => [scope.toolset, scope.level]))
}

/**
 * Los alcances que se conceden: un `area:nivel` por cada área que no quedó en
 * «Sin acceso», sin pasar nunca de lo pedido (el servidor también lo recorta).
 */
export function grantedScopes(
  scopes: readonly ConsentScope[],
  choices: Readonly<Record<string, AreaChoice>>,
): string[] {
  return scopes.flatMap((scope) => {
    const choice = choices[scope.toolset] ?? scope.level
    if (choice === "no") return []
    const level: ScopeLevel = scope.level === "leer" ? "leer" : choice
    return [`${scope.toolset}:${level}`]
  })
}

/** «Catálogo e inventario · ver y cambiar» para las fichas de «Aplicaciones conectadas». */
export function areaChipLabel(area: { title: string; level: ScopeLevel }): string {
  return `${area.title} · ${area.level === "escribir" ? "ver y cambiar" : "ver"}`
}

/** Iniciales para el sello de la persona («Camila Pérez» → «CP»). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase()
}

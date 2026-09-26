"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/core/lib/utils"
import { SidebarTrigger, useSidebar } from "@/shared/components/layout/sidebar/core"
import { ThemeToggle } from "@/shared/components/layout/theme-toggle"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip"
import { ChevronRight } from "lucide-react"

const LABELS: Record<string, string> = {
	"dashboard": "Dashboard",
	"companies": "Empresas",
	"users": "Usuarios",
	"roles": "Roles",
	// Un slug en inglés dentro de una UI en español es un defecto en cualquier
	// ruta, no solo en marketing: `settings` ya se pintaba crudo en /settings/*.
	"settings": "Configuración",
	"marketing": "Marketing",
	"campaigns": "Campañas",
	"automations": "Recuperación",
	"promotions": "Promociones",
	// Solo existe /marketing/settings/templates: los textos propios del tenant.
	"templates": "Mensajes",
	"meta-templates": "Plantillas de Meta",
	"opt-outs": "Bajas",
	"new": "Nueva",
	// Método comercial: /comercial, /comercial/meta, /comercial/acciones/:id,
	// /comercial/resultados/:key (Q20: salía «comercial» en minúscula). Las
	// migas de sus rutas dinámicas llegan por `breadcrumbs` (V6).
	"comercial": "Comercial",
	"meta": "Meta",
	"acciones": "Acciones",
	"resultados": "Resultados",
	// Cobros y ajustes (QA real F1–F4: la miga decía «company › funciones»)
	"company": "Mi empresa",
	"funciones": "Funciones",
	"documentos": "Documentos",
	"sucursales": "Sucursales",
	"payments": "Pagos",
	"moneda": "Moneda y TRM",
	"plan": "Plan de pagos",
	"recordatorios": "Recordatorios",
	"orders": "Pedidos",
	"receivables": "Cartera",
	"catalog": "Catálogo",
	"products": "Productos",
	"product-types": "Tipos de producto",
	"shipping": "Envíos",
	"channels": "Canales",
	"integrations": "Integraciones",
	"crm": "CRM",
	"contacts": "Contactos",
	"billing": "Facturación",
	"invoices": "Facturas",
}

/**
 * Un identificador no es una etiqueta: la miga no enseña «0199a3f2-…» (QA real
 * F3/F4). Se nombra por la ruta que lo contiene; sin nombre conocido, «Detalle».
 * Lo que un módulo declare en `children` sigue mandando.
 */
const ID_SEGMENT = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+)$/i
const DETAIL_LABELS: Record<string, string> = {
	"/orders": "Pedido",
	"/catalog/products": "Producto",
	"/catalog/product-types": "Tipo de producto",
	"/crm/contacts": "Contacto",
	"/billing/invoices": "Factura",
	"/settings/channels": "Canal",
	"/settings/integrations": "Integración",
	"/marketing/campaigns": "Campaña",
}

/**
 * Lo que un módulo sabe de sus migas y el header no (V6). Son DATOS, no
 * funciones: el layout que lo pasa es de servidor. Llega desde la capa app
 * (shared no importa de modules, arquitectura §3.3).
 */
export type BreadcrumbConfig = {
	/** Rutas sin page.tsx propia: su miga se pinta sin enlace (enlazarla era un 404). */
	unlinked?: readonly string[]
	/** Etiqueta del segmento hijo de una ruta: `{ "/x/resultados": { sales: "Ventas", "*": "Resultado" } }`. */
	children?: Readonly<Record<string, Readonly<Record<string, string>>>>
}

type Crumb = { href: string; label: string; linked: boolean }

/** Las migas de un pathname: etiqueta legible y si la ruta tiene página. */
export function buildCrumbs(pathname: string, config: readonly BreadcrumbConfig[] = []): Crumb[] {
	const parts = pathname.split("/").filter(Boolean)
	const unlinked = new Set(config.flatMap((entry) => entry.unlinked ?? []))
	return parts.map((seg, idx) => {
		const href = "/" + parts.slice(0, idx + 1).join("/")
		const parent = "/" + parts.slice(0, idx).join("/")
		const childLabels = config.map((entry) => entry.children?.[parent]).find((labels) => labels !== undefined)
		const idLabel = ID_SEGMENT.test(seg) ? (DETAIL_LABELS[parent] ?? "Detalle") : undefined
		const label = childLabels?.[seg] ?? childLabels?.["*"] ?? LABELS[seg] ?? idLabel ?? seg
		return { href, label, linked: !unlinked.has(href) }
	})
}

type PrivateHeaderProps = {
	/** Acciones de la derecha (p.ej. la campana de notificaciones). Se inyectan
	    desde la capa app: shared no puede importar de modules (arquitectura §3.3). */
	actions?: React.ReactNode
	/** Migas que conocen los módulos (rutas sin página, segmentos dinámicos). */
	breadcrumbs?: readonly BreadcrumbConfig[]
}

export function PrivateHeader({ actions, breadcrumbs }: PrivateHeaderProps) {
	const pathname = usePathname()
	const { state, isMobile } = useSidebar()
	// Este trigger NO es redundante con el botón de la cabecera del sidebar: en
	// móvil el menú es un sheet, y con el sheet cerrado no hay sidebar donde
	// alojar ningún control. Es la única entrada.
	const sidebarLabel = isMobile
		? "Abrir menú"
		: state === "collapsed"
			? "Expandir menú"
			: "Colapsar menú"
	const crumbs = buildCrumbs(pathname, breadcrumbs)

	return (
		// El glass ocupa todo el ancho; el contenido del header se centra con el
		// mismo max-w + gutters que el contenido de página para que el
		// breadcrumb quede alineado con las vistas del grupo (content).
		//
		// Sin `sticky`/`z` propios: los aporta el grupo pegado del layout, que
		// agrupa header + banner de trial. Y SIN altura fija a propósito —
		// ninguna vista debe depender de cuánto mide (DESIGN-SYSTEM §4.2).
		<div className="glass py-2">
			<div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 md:px-6">
			<Tooltip>
				<TooltipTrigger asChild>
					<SidebarTrigger aria-label={sidebarLabel} />
				</TooltipTrigger>
				<TooltipContent side="bottom" sideOffset={6}>
					{sidebarLabel}
				</TooltipContent>
			</Tooltip>
			{/* En móvil (<sm) solo se muestra la página actual (último crumb); el
			    rastro completo aparece desde sm para no desbordar el header. */}
			<nav aria-label="Breadcrumb" className="min-w-0 text-sm text-muted-foreground">
				<ol className="flex items-center gap-2">
					<li className="hidden sm:block">
						<Link prefetch={false} href="/dashboard" className="hover:text-foreground transition-colors">Inicio</Link>
					</li>
					{crumbs.map((c, i) => {
						const isLast = i === crumbs.length - 1
						return (
							<li key={c.href} className={cn("items-center gap-2", isLast ? "flex" : "hidden sm:flex")}>
								<ChevronRight className={cn("h-4 w-4", isLast && "hidden sm:block")} />
								{isLast ? (
									<span className="truncate text-foreground">{c.label}</span>
								) : !c.linked ? (
									<span>{c.label}</span>
								) : (
									<Link prefetch={false} href={c.href} className="hover:text-foreground transition-colors">{c.label}</Link>
								)}
							</li>
						)
					})}
				</ol>
			</nav>
			<div className="ml-auto flex items-center gap-1">
				{actions}
				<ThemeToggle />
			</div>
			</div>
		</div>
	)
}
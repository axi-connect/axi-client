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
}

type PrivateHeaderProps = {
	/** Acciones de la derecha (p.ej. la campana de notificaciones). Se inyectan
	    desde la capa app: shared no puede importar de modules (arquitectura §3.3). */
	actions?: React.ReactNode
}

export function PrivateHeader({ actions }: PrivateHeaderProps) {
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
	const parts = pathname.split("/").filter(Boolean)
	const crumbs = parts.map((seg, idx) => {
		const href = "/" + parts.slice(0, idx + 1).join("/")
		return { href, label: LABELS[seg] || seg }
	})

	return (
		// El glass ocupa todo el ancho; el contenido del header se centra con el
		// mismo max-w + gutters que el contenido de página para que el
		// breadcrumb quede alineado con las vistas del grupo (content).
		<div className="glass sticky top-0 z-40 py-2">
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
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/layout/sidebar/core"
import { ChevronRight } from "lucide-react"

const LABELS: Record<string, string> = {
	"dashboard": "Dashboard",
	"companies": "Empresas",
	"users": "Usuarios",
	"roles": "Roles",
}

export function PrivateHeader() {
	const pathname = usePathname()
	const parts = pathname.split("/").filter(Boolean)
	const crumbs = parts.map((seg, idx) => {
		const href = "/" + parts.slice(0, idx + 1).join("/")
		return { href, label: LABELS[seg] || seg }
	})

	return (
		<div className="flex items-center gap-3 px-4 py-2">
			<SidebarTrigger />
			<nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
				<ol className="flex items-center gap-2">
					<li>
						<Link prefetch={false} href="/dashboard" className="hover:text-foreground transition-colors">Inicio</Link>
					</li>
					{crumbs.map((c, i) => (
						<li key={c.href} className="flex items-center gap-2">
							<ChevronRight className="h-4 w-4" />
							{i < crumbs.length - 1 ? (
								<Link prefetch={false} href={c.href} className="hover:text-foreground transition-colors">{c.label}</Link>
							) : (
								<span className="text-foreground">{c.label}</span>
							)}
						</li>
					))}
				</ol>
			</nav>
		</div>
	)
}
"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { salesWhatsAppUrl } from "@/core/config/env";
import { Badge } from "@/shared/components/ui/badge";
import { BrandCard } from "@/shared/components/ui/brand-card";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/shared/components/ui/navigation-menu";
import {
  SITE_NAV,
  type SiteNavCard,
  type SiteNavItem,
  type SiteNavPanelFooter,
  type SiteNavRow,
} from "@/shared/components/layout/site/site-nav.content";

/**
 * Mega-menú de escritorio. Los datos salen íntegros de `site-nav.content.ts`:
 * este archivo solo decide cómo se pintan, así que añadir una entrada al menú
 * nunca obliga a tocar JSX.
 *
 * Todo es contenido estático — cero fetch, cero estado de servidor. Es cliente
 * solo porque el primitivo de Radix necesita interacción.
 */

/** Pinta el fragmento entre `**` en peso fuerte. Un solo tramo por frase. */
function Claim({ text }: { text: string }) {
  const [before, strong, after] = text.split("**");
  return (
    <p className="text-muted-foreground text-sm">
      {before}
      {strong ? <b className="text-foreground font-semibold">{strong}</b> : null}
      {after}
    </p>
  );
}

function PanelCard({ card, className }: { card: SiteNavCard; className?: string }) {
  const Icon = card.icon;
  return (
    <li className={className}>
      <NavigationMenuLink asChild>
        <Link href={card.href} prefetch={false} className="block h-full rounded-xl p-0">
          {/* `justify-start` y no el `justify-between` que trae `BrandCard`: en
              una rejilla de altura igualada, "between" empuja el icono arriba y
              el texto abajo y abre un hueco en medio. Aquí el icono va EN LÍNEA
              con el título, que además es como se leen las filas de la columna
              derecha. */}
          <BrandCard surface="glass" className="justify-start gap-1.5 px-4 py-3">
            <div className="relative flex items-center gap-2">
              <Icon aria-hidden="true" className="text-foreground/75 group-hover:text-brand size-4 shrink-0 transition-colors" />
              <span className="text-foreground text-[0.8125rem] leading-tight font-semibold tracking-tight">
                {card.name}
              </span>
            </div>
            {/* Dos líneas como máximo: con descripciones de largo distinto, sin
                el clamp una tarjeta estira toda su fila. */}
            <span className="text-muted-foreground line-clamp-2 text-xs leading-snug">
              {card.description}
            </span>
          </BrandCard>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}

function PanelRow({ row }: { row: SiteNavRow }) {
  const Icon = row.icon;
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          href={row.href}
          prefetch={false}
          className="group hover:bg-accent/50 flex h-max flex-row items-center gap-2.5 rounded-lg px-2.5 py-1.5"
        >
          <Icon aria-hidden="true" className="text-muted-foreground group-hover:text-brand size-4 shrink-0 transition-colors" />
          <span className="text-sm">{row.name}</span>
          {row.badge ? (
            <Badge variant="secondary" className="font-normal">
              {row.badge}
            </Badge>
          ) : null}
          <ArrowRight
            aria-hidden="true"
            className="ml-auto size-4 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
          />
        </Link>
      </NavigationMenuLink>
    </li>
  );
}

/**
 * Barra inferior del panel: es la razón de ser del mega-menú. Sin auto-registro,
 * agendar la demo y escribir por WhatsApp son las dos únicas conversiones que
 * existen, así que ningún panel se cierra sin ofrecerlas.
 */
function PanelFooter({ footer }: { footer: SiteNavPanelFooter }) {
  return (
    <div className="border-border/50 bg-foreground/[0.02] col-span-full flex flex-wrap items-center gap-x-5 gap-y-2.5 border-t px-4 py-3">
      <Claim text={footer.claim} />
      <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2">
        {footer.whatsappMessage ? (
          <NavigationMenuLink asChild>
            <a
              href={salesWhatsAppUrl(footer.whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand flex flex-row items-center gap-2 px-0 py-0 text-sm font-medium"
            >
              <MessageCircle aria-hidden="true" className="size-4" />
              Escríbenos por WhatsApp
            </a>
          </NavigationMenuLink>
        ) : null}
        {footer.secondary ? (
          <NavigationMenuLink asChild>
            <Link
              href={footer.secondary.href}
              prefetch={false}
              className="hover:text-brand px-0 py-0 text-sm font-medium"
            >
              {footer.secondary.name}
            </Link>
          </NavigationMenuLink>
        ) : null}
        <NavigationMenuLink asChild>
          <Link
            href="/contacto"
            prefetch={false}
            className="bg-brand text-primary-foreground hover:bg-brand/90 rounded-full px-4 py-2 text-sm font-medium"
          >
            Agenda tu demo
          </Link>
        </NavigationMenuLink>
      </div>
    </div>
  );
}

/**
 * Reparto de la última fila de tarjetas.
 *
 * La rejilla se declara en **6 sub-columnas** para que las filas incompletas se
 * repartan el ancho en vez de dejar un hueco: Producto tiene 5 tarjetas en 3
 * columnas, y con una rejilla normal la última fila eran dos tarjetas y un
 * agujero del tamaño de una tercera. Aquí esas dos se reparten la fila entera.
 *
 * Se deriva de los datos —cuántas tarjetas hay y en cuántas columnas— así que
 * añadir o quitar una entrada del menú no obliga a tocar nada.
 */
function cardSpan(index: number, total: number, columns: 2 | 3): string {
  const base = 6 / columns;
  const remainder = total % columns;
  const firstOfLastRow = total - remainder;
  if (remainder === 0 || index < firstOfLastRow) {
    return base === 2 ? "md:col-span-2" : "md:col-span-3";
  }
  const spanOfLastRow = 6 / remainder;
  return spanOfLastRow === 6 ? "md:col-span-6" : spanOfLastRow === 3 ? "md:col-span-3" : "md:col-span-2";
}

function MegaPanel({ item }: { item: Extract<SiteNavItem, { kind: "mega" }> }) {
  return (
    <NavigationMenuContent>
      <div
        className={cn(
          // Columna derecha de ancho FIJO: con una fracción, al estrechar el
          // panel las etiquetas de dos palabras partían en dos líneas.
          "grid w-full md:grid-cols-[1fr_15rem]",
          // El ancho lo publica el viewport del primitivo leyendo esta caja.
          item.cardColumns === 3 ? "md:w-[min(90vw,54rem)]" : "md:w-[min(90vw,48rem)]",
        )}
      >
        <ul className="border-border/50 grid grow gap-2 p-3 md:grid-cols-6 md:border-r">
          {item.cards.map((card, index) => (
            <PanelCard
              key={card.href}
              card={card}
              className={cardSpan(index, item.cards.length, item.cardColumns)}
            />
          ))}
        </ul>

        <div className="p-3">
          <p className="text-muted-foreground px-2.5 pb-1.5 text-[0.6875rem] font-medium tracking-widest uppercase">
            {item.side.title}
          </p>
          <ul className="space-y-px">
            {item.side.rows.map((row) => (
              <PanelRow key={row.href} row={row} />
            ))}
          </ul>
        </div>

        <PanelFooter footer={item.footer} />
      </div>
    </NavigationMenuContent>
  );
}

/**
 * Cáscara del menú: es el `Root` de Radix y el ancla del panel.
 *
 * Envuelve a la barra en lugar de vivir dentro de ella, y esa inversión es un
 * REQUISITO, no una preferencia de estilo: la barra lleva `.glass`, y un
 * elemento con `backdrop-filter` crea un *backdrop root* que deja a sus
 * descendientes sin nada que difuminar. Con el panel dentro de la barra, su
 * cristal se veía completamente transparente. Como hermano, difumina la página.
 */
export function SiteNavShell({ children }: { children: React.ReactNode }) {
  return (
    <NavigationMenu aria-label="Principal" className="block w-full">
      {children}
    </NavigationMenu>
  );
}

/** Los disparadores. Van dentro de la barra; el panel lo monta la cáscara. */
export function SiteNavList() {
  return (
    <NavigationMenuList className="hidden lg:flex">
        {SITE_NAV.map((item) =>
          item.kind === "mega" ? (
            <NavigationMenuItem key={item.name}>
              <NavigationMenuTrigger>{item.name}</NavigationMenuTrigger>
              <MegaPanel item={item} />
            </NavigationMenuItem>
          ) : (
            <NavigationMenuItem key={item.name}>
              <NavigationMenuLink asChild>
                <Link
                  href={item.href}
                  prefetch={false}
                  className="hover:bg-accent/60 flex-row items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium"
                >
                  {item.name}
                  {item.badge ? (
                    <Badge variant="secondary" className="font-normal">
                      {item.badge}
                    </Badge>
                  ) : null}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ),
        )}
    </NavigationMenuList>
  );
}

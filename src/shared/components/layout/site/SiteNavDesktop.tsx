"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { salesWhatsAppUrl } from "@/core/config/env";
import { Badge } from "@/shared/components/ui/badge";
import { GridCard } from "@/shared/components/ui/grid-card";
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

function PanelCard({ card, index }: { card: SiteNavCard; index: number }) {
  const Icon = card.icon;
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link href={card.href} prefetch={false} className="block h-full rounded-xl p-0">
          {/* `pattern={index}`: la textura de cada tarjeta se deriva de su
              posición, así la fila no se ve repetida y el HTML es idéntico en
              servidor y cliente. */}
          <GridCard pattern={index}>
            <Icon aria-hidden="true" className="text-foreground/75 group-hover:text-brand relative size-5 transition-colors" />
            <div className="relative">
              <span className="text-foreground block text-sm font-semibold tracking-tight">
                {card.name}
              </span>
              <span className="text-muted-foreground mt-1.5 block text-xs leading-relaxed">
                {card.description}
              </span>
            </div>
          </GridCard>
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
          className="group hover:bg-accent/60 flex h-max flex-row items-center gap-2.5 rounded-lg px-2.5 py-2"
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
    <div className="border-border/60 bg-foreground/[0.03] col-span-full flex flex-wrap items-center gap-x-5 gap-y-3 border-t px-5 py-3.5">
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

function MegaPanel({ item }: { item: Extract<SiteNavItem, { kind: "mega" }> }) {
  return (
    <NavigationMenuContent>
      <div
        className={cn(
          "grid w-full md:grid-cols-[1fr_0.36fr]",
          // El ancho lo publica el viewport del primitivo leyendo esta caja.
          item.cardColumns === 3 ? "md:w-[min(88vw,60rem)]" : "md:w-[min(88vw,52rem)]",
        )}
      >
        <ul
          className={cn(
            "border-border/60 grid grow gap-3 p-4 md:border-r",
            item.cardColumns === 3 ? "md:grid-cols-3" : "md:grid-cols-2",
          )}
        >
          {item.cards.map((card, index) => (
            <PanelCard key={card.href} card={card} index={index} />
          ))}
        </ul>

        <div className="p-4">
          <p className="text-muted-foreground px-2.5 pb-2 text-[0.6875rem] font-medium tracking-widest uppercase">
            {item.side.title}
          </p>
          <ul className="space-y-0.5">
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

export function SiteNavDesktop() {
  return (
    <NavigationMenu className="hidden lg:flex" aria-label="Principal">
      <NavigationMenuList>
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
    </NavigationMenu>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight, Menu, MessageCircle, X } from "lucide-react";

import { salesWhatsAppUrl } from "@/core/config/env";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { BrandLockup } from "@/shared/components/ui/brand-lockup";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/components/ui/accordion";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { ThemeToggle } from "@/shared/components/layout/theme-toggle";
import {
  SITE_NAV,
  type SiteNavCard,
  type SiteNavRow,
} from "@/shared/components/layout/site/site-nav.content";

/**
 * Menú móvil. Es un `Sheet` con acordeones, no un panel a mano: el primitivo
 * aporta focus trap, cierre con Escape, bloqueo de scroll y `aria-modal`, que
 * la versión anterior implementaba a mano (y le faltaba el focus trap).
 *
 * Los ítems con hijos van en acordeón porque en móvil se degradaban a enlace
 * plano y sus hijos eran INALCANZABLES desde el celular — el dispositivo por el
 * que llega el ICP.
 *
 * El botón nativo de cierre del `Sheet` se oculta (`[&>button]:hidden`, mismo
 * recurso que el sidebar móvil en `sidebar/core.tsx`) para poner el cierre en la
 * cabecera, donde el pulgar lo alcanza.
 */

function MobileEntry({
  item,
  description,
  icon: Icon,
  badge,
}: {
  item: { name: string; href: string };
  description?: string;
  icon: SiteNavCard["icon"];
  badge?: string;
}) {
  return (
    <li>
      <SheetClose asChild>
        <Link
          href={item.href}
          prefetch={false}
          className="hover:bg-accent/60 flex items-center gap-3 rounded-lg p-2 transition-colors"
        >
          <span className="border-border bg-foreground/[0.03] flex size-10 shrink-0 items-center justify-center rounded-xl border">
            <Icon aria-hidden="true" className="text-muted-foreground size-4" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="text-sm font-medium">{item.name}</span>
              {badge ? (
                <Badge variant="secondary" className="font-normal">
                  {badge}
                </Badge>
              ) : null}
            </span>
            {description ? (
              <span className="text-muted-foreground line-clamp-2 block text-xs leading-snug">
                {description}
              </span>
            ) : null}
          </span>
        </Link>
      </SheetClose>
    </li>
  );
}

export function SiteNavMobile({
  session,
  ctaHref,
  ctaLabel,
  onCtaClick,
}: {
  session: { text: string; href: string };
  ctaHref: string;
  ctaLabel: string;
  onCtaClick: () => void;
}) {
  const megaItems = SITE_NAV.filter((item) => item.kind === "mega");
  const linkItems = SITE_NAV.filter((item) => item.kind === "link");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full lg:hidden" aria-label="Abrir menú">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-md [&>button]:hidden"
        /* Un cajón de navegación no tiene nada que describir: son enlaces, y una
           frase explicándolos sería relleno. Esta es la forma que documenta Radix
           para decir «no hay descripción a propósito» y que deje de avisar. */
        aria-describedby={undefined}
      >
        {/* El título es obligatorio para el diálogo (lo anuncia el lector de
            pantalla), pero visualmente lo sustituye la marca. */}
        <SheetTitle className="sr-only">Menú de navegación</SheetTitle>

        <div className="border-border/60 flex h-16 items-center justify-between border-b px-4">
          <SheetClose asChild>
            <BrandLockup size="sm" />
          </SheetClose>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Cerrar menú">
              <X className="size-5" />
            </Button>
          </SheetClose>
        </div>

        {/* `nav` y no `div`: es la navegación primaria en móvil, y sin el
            landmark el lector de pantalla no puede saltar a ella. El desktop ya
            lo tiene vía Radix NavigationMenu, que renderiza su propio `nav`. */}
        <nav aria-label="Principal" className="sidebar-scroll flex-1 overflow-y-auto px-4 py-3">
          <Accordion type="single" collapsible>
            {megaItems.map((item) => (
              <AccordionItem key={item.name} value={item.name}>
                <AccordionTrigger className="text-base hover:no-underline">
                  {item.name}
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="grid gap-0.5">
                    {item.cards.map((card) => (
                      <MobileEntry
                        key={card.href}
                        item={card}
                        description={card.description}
                        icon={card.icon}
                      />
                    ))}
                    {item.side.rows.map((row: SiteNavRow) => (
                      <MobileEntry key={row.href} item={row} icon={row.icon} badge={row.badge} />
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <ul className="mt-2 grid gap-0.5">
            {linkItems.map((item) => (
              <li key={item.href}>
                <SheetClose asChild>
                  <Link
                    href={item.href}
                    prefetch={false}
                    className="hover:bg-accent/60 flex items-center gap-2 rounded-lg px-2 py-3.5 text-base font-medium transition-colors"
                  >
                    {item.name}
                    {item.badge ? (
                      <Badge variant="secondary" className="font-normal">
                        {item.badge}
                      </Badge>
                    ) : null}
                    <ArrowRight aria-hidden="true" className="text-muted-foreground ml-auto size-4" />
                  </Link>
                </SheetClose>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-border/60 flex flex-col gap-3 border-t p-4">
          <div className="flex justify-center pb-1">
            <ThemeToggle />
          </div>
          <a
            href={salesWhatsAppUrl("Hola, quiero ver Axi Connect funcionando con mi negocio.")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-brand flex items-center justify-center gap-2 text-sm font-medium transition-colors"
          >
            <MessageCircle aria-hidden="true" className="size-4" />
            Escríbenos por WhatsApp
          </a>
          <SheetClose asChild>
            <Link
              href={session.href}
              prefetch={false}
              className="text-foreground hover:text-brand block w-full rounded-lg py-2.5 text-center text-sm font-medium transition-colors"
            >
              {session.text}
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link
              href={ctaHref}
              prefetch={false}
              onClick={onCtaClick}
              className="bg-brand-gradient text-primary-foreground block w-full rounded-xl py-3 text-center text-sm font-medium transition-all duration-200 hover:brightness-110"
            >
              {ctaLabel}
            </Link>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronDown, Menu, X } from 'lucide-react';

import { SiteThemeChoice } from '@/shared/components/layout/site/SiteThemeChoice';
import {
    SITE_INTENTS,
    SITE_ISLAND,
    SITE_MENU_LINKS,
    type SiteIntent,
} from '@/shared/components/layout/site/site-nav.content';

/**
 * El menú móvil del nav en isla (§18.1): una hoja de cristal con un acordeón
 * por intención, los enlaces planos, «Iniciar sesión», el tema y el CTA.
 * Es un Dialog de Radix (el mismo primitivo que el `Sheet` de antes): foco
 * atrapado, Esc cierra, `aria-modal` y bloqueo del scroll de fondo.
 */
export function SiteMenuSheet({
    session,
    ctaHref,
    ctaLabel,
    onCtaClick,
    dark,
}: {
    /** En la home el escenario es oscuro en los dos temas: la hoja también (`.dark`). */
    dark: boolean;
    session: { text: string; href: string };
    ctaHref: string;
    ctaLabel: string;
    onCtaClick: () => void;
}) {
    const [open, setOpen] = useState(false);
    // Atrás del navegador cierra la hoja (una entrada de historial mientras está
    // abierta) y pasar a escritorio también (auditoría, m10).
    useEffect(() => {
        if (!open) return;
        window.history.pushState({ siteSheet: true }, '');
        const onPop = () => setOpen(false);
        const wide = window.matchMedia('(min-width: 1024px)');
        const onWide = () => wide.matches && setOpen(false);
        window.addEventListener('popstate', onPop);
        wide.addEventListener('change', onWide);
        return () => {
            window.removeEventListener('popstate', onPop);
            wide.removeEventListener('change', onWide);
            // Cerrada por Esc, un enlace o el botón: se retira la entrada que puso.
            if (window.history.state?.siteSheet) window.history.back();
        };
    }, [open]);
    const [intent, setIntent] = useState<SiteIntent['id'] | null>('vender');
    const close = () => setOpen(false);
    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <button type="button" className="site-btn site-menu-btn" aria-label={open ? SITE_ISLAND.closeMenu : SITE_ISLAND.openMenu}>
                    {open ? <X className="size-[18px]" aria-hidden="true" /> : <Menu className="size-[18px]" aria-hidden="true" />}
                </button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Content
                    className={`site-nav-sheet site-sheet site-glass site-glass-deep${dark ? ' dark' : ''}`}
                    aria-describedby={undefined}
                    // Al cerrar, Radix devuelve el foco al botón del menú (m10).
                >
                    <Dialog.Title className="sr-only">{SITE_ISLAND.menuTitle}</Dialog.Title>
                    <p className="site-panel-k">{SITE_ISLAND.ask}</p>
                    {SITE_INTENTS.map((it) => {
                        const isOpen = intent === it.id;
                        const panelId = `site-acc-${it.id}`;
                        return (
                            <div key={it.id} className="site-acc" data-open={isOpen ? '' : undefined} data-tone={it.tone}>
                                <button
                                    type="button"
                                    className="site-btn"
                                    aria-expanded={isOpen}
                                    aria-controls={panelId}
                                    onClick={() => setIntent(isOpen ? null : it.id)}
                                >
                                    <span className="site-intent-icon" aria-hidden="true">
                                        <i />
                                    </span>
                                    <span className="flex-1">
                                        <span className="site-intent-name">{it.name}</span>
                                        <span className="site-intent-promise">{it.promise}</span>
                                    </span>
                                    <ChevronDown className="site-chev size-4" aria-hidden="true" />
                                </button>
                                {isOpen ? (
                                    <ul id={panelId}>
                                        {it.cards.map((c) => {
                                            const Icon = c.icon;
                                            return (
                                                <li key={c.name}>
                                                    <Link prefetch={false} href={c.href} onClick={close}>
                                                        <Icon className="size-[17px]" strokeWidth={1.7} aria-hidden="true" />
                                                        {c.name}
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : null}
                            </div>
                        );
                    })}
                    <div className="site-sheet-links">
                        {[SITE_MENU_LINKS.pricing, ...SITE_MENU_LINKS.more].map((l) => (
                            <Link key={l.href} prefetch={false} href={l.href} className="site-link" onClick={close}>
                                {l.name}
                            </Link>
                        ))}
                    </div>
                    <div className="site-sheet-row">
                        <Link prefetch={false} href={session.href} className="site-link" onClick={close}>
                            {session.text}
                        </Link>
                        <SiteThemeChoice className="site-sheet-theme" label={SITE_ISLAND.theme} />
                    </div>
                    <Link
                        prefetch={false}
                        href={ctaHref}
                        className="site-cta"
                        onClick={() => {
                            close();
                            onCtaClick();
                        }}
                    >
                        {ctaLabel}
                    </Link>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

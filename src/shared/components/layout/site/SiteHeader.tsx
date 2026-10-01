'use client';

import './site-nav.css';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Menu, X } from 'lucide-react';

import { useAuthContext } from '@/core/providers/auth-provider';
import { useSplashOptional } from '@/core/providers/splash-provider';
import { BrandMark } from '@/shared/components/ui/brand-mark';
import { SiteMenuPanel } from '@/shared/components/layout/site/SiteMenuPanel';
import { SiteMenuSheet } from '@/shared/components/layout/site/SiteMenuSheet';
import { SiteThemeChoice } from '@/shared/components/layout/site/SiteThemeChoice';
import { ISLAND_AT, islandOnFilm, islandOnPage, readProgress, type IslandChapter } from '@/shared/components/layout/site/site-island';
import {
    SITE_INTENTS,
    SITE_ISLAND,
    SITE_MENU_LINKS,
    SITE_NAV_CTA,
    SITE_NAV_FILM_CTA,
    SITE_NAV_SESSION,
    type SiteIntent,
} from '@/shared/components/layout/site/site-nav.content';
// El contrato público de la película (plan §18): la isla lo escucha, la película solo emite.
import { FILM_ACTIVITY_EVENT, FILM_CHAPTER_EVENT, type FilmActivityDetail } from '@/modules/landing/ui/film/film-events';

/** Lo que dura el aviso de `film:activity` en la isla (§18.1). */
const TOAST_MS = 3000;

/**
 * El nav del sitio público en isla (plan §18.1, lienzo aprobado el 2026-09-30).
 *
 * - Escritorio: barra de cristal con el logo, tres menús por intención (Vender
 *   y cobrar, Crecer, Atender), Precios, la sesión y el CTA. Pasados 120 px de
 *   scroll se vuelve isla: isotipo, anillo de progreso, capítulo, menú y
 *   «Prueba gratis». En la home la alimentan `film:chapter` y `film:activity`;
 *   fuera de ella, el nombre de la página y lo leído.
 * - El panel del menú no es modal: Esc, un clic fuera o un enlace lo cierran.
 * - Móvil: la isla fija y la hoja de cristal (SiteMenuSheet).
 * - El tema: píldora vertical fija en escritorio fuera de la home; en móvil, en la hoja.
 *
 * Sin framer-motion ni el mega-menú de Radix: el cambio de barra a isla es CSS
 * (`transform` y `opacity`), y el anillo y los textos de la isla se escriben por
 * ref, sin volver a renderizar en cada punto de avance.
 */
export default function SiteHeader() {
    const { status, user } = useAuthContext();
    const splash = useSplashOptional();
    const pathname = usePathname();
    const onFilm = pathname === '/';
    const session = SITE_NAV_SESSION[status];

    const [island, setIsland] = useState(false);
    const [open, setOpen] = useState<SiteIntent['id'] | null>(null);
    const [toast, setToast] = useState<FilmActivityDetail | null>(null);
    const [islandTitle, setIslandTitle] = useState('');
    const ringRef = useRef<SVGCircleElement>(null);
    const subRef = useRef<HTMLSpanElement>(null);
    const navRef = useRef<HTMLElement>(null);
    const panelId = useId();

    // Con sesión el CTA lleva a la app (y repite el splash de marca); sin sesión,
    // a la prueba en la home y a la demo en el resto (D14).
    const guestCta = onFilm ? SITE_NAV_FILM_CTA : SITE_NAV_CTA;
    const isAuthenticated = status === 'authenticated';
    const ctaHref = isAuthenticated ? '/workspace/inbox' : guestCta.href;
    const ctaLabel = isAuthenticated ? (user?.name ?? 'Ir a la app') : guestCta.label;
    const ctaShort = !isAuthenticated && 'shortLabel' in guestCta ? guestCta.shortLabel : ctaLabel;
    const onCtaClick = () => {
        if (isAuthenticated) splash.start();
    };

    // La isla: cuándo aparece y qué dice. Fuera de la home, lo leído (por ref).
    useEffect(() => {
        const el = document.querySelector<HTMLElement>('[data-app-scroll]');
        if (!el) return;
        let frame = 0;
        const paint = (title: string, sub: string, ring: number) => {
            setIslandTitle((t) => (t === title ? t : title));
            if (subRef.current && subRef.current.textContent !== sub) subRef.current.textContent = sub;
            ringRef.current?.style.setProperty('stroke-dasharray', `${Math.max(0.0001, ring).toFixed(3)} 2`);
        };
        const update = () => {
            frame = 0;
            setIsland(el.scrollTop > ISLAND_AT);
            if (!onFilm) {
                const t = islandOnPage(pathname, readProgress(el.scrollTop, el.scrollHeight, el.clientHeight));
                paint(t.title, t.sub, t.ring);
            }
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        const onChapter = (e: Event) => {
            const t = islandOnFilm((e as CustomEvent<IslandChapter>).detail);
            paint(t.title, t.sub, t.ring);
        };
        let timer = 0;
        const onActivity = (e: Event) => {
            setToast((e as CustomEvent<FilmActivityDetail>).detail);
            window.clearTimeout(timer);
            timer = window.setTimeout(() => setToast(null), TOAST_MS);
        };
        if (onFilm) {
            const t = islandOnFilm(null);
            paint(t.title, t.sub, t.ring);
            window.addEventListener(FILM_CHAPTER_EVENT, onChapter);
            window.addEventListener(FILM_ACTIVITY_EVENT, onActivity);
        }
        update();
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            el.removeEventListener('scroll', onScroll);
            window.removeEventListener(FILM_CHAPTER_EVENT, onChapter);
            window.removeEventListener(FILM_ACTIVITY_EVENT, onActivity);
            window.clearTimeout(timer);
            if (frame) cancelAnimationFrame(frame);
            setToast(null);
        };
    }, [onFilm, pathname]);

    // El panel: Esc y un clic fuera lo cierran; cambiar de página también.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(null);
        };
        const onDown = (e: PointerEvent) => {
            if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(null);
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onDown);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onDown);
        };
    }, [open]);
    useEffect(() => setOpen(null), [pathname]);

    const active = SITE_INTENTS.find((i) => i.id === open) ?? SITE_INTENTS[0];
    const toggle = (id: SiteIntent['id']) => setOpen((o) => (o === id ? null : id));
    const close = () => setOpen(null);

    return (
        // En la home la película es oscura en los dos temas: el nav usa los tokens oscuros.
        <header
            ref={navRef}
            className={`site-nav${onFilm ? ' dark theme-dark-island' : ''}`}
            data-island={island ? '' : undefined}
        >
            <nav aria-label="Principal">
                {/* La barra (escritorio, arriba de todo). */}
                <div className="site-bar site-glass" inert={island}>
                    <Link prefetch={false} href="/" className="site-brand" aria-label="Axi Connect, inicio">
                        <BrandMark className="size-[26px]" aria-hidden="true" />
                        <span className="site-brand-name">axi connect</span>
                    </Link>
                    {SITE_INTENTS.map((it) => (
                        <button
                            key={it.id}
                            type="button"
                            className="site-btn"
                            data-tone={it.tone}
                            aria-expanded={open === it.id}
                            aria-controls={open ? panelId : undefined}
                            onClick={() => toggle(it.id)}
                        >
                            <span className="site-dot" aria-hidden="true" />
                            {it.name}
                            <ChevronDown className="site-chev size-3.5" aria-hidden="true" />
                        </button>
                    ))}
                    <Link prefetch={false} href={SITE_MENU_LINKS.pricing.href} className="site-btn">
                        {SITE_MENU_LINKS.pricing.name}
                    </Link>
                    <span className="site-spacer" />
                    <Link prefetch={false} href={session.href} className="site-btn">
                        {session.text}
                    </Link>
                    <Link prefetch={false} href={ctaHref} className="site-cta" onClick={onCtaClick}>
                        <span className="site-cta-long">{ctaLabel}</span>
                        <span className="site-cta-short">{ctaShort}</span>
                        <ArrowRight className="size-[15px]" aria-hidden="true" />
                    </Link>
                </div>

                {/* La isla (escritorio, al bajar). */}
                <div className="site-island site-glass" data-toast={toast ? '' : undefined} inert={!island}>
                    <div className="site-island-row">
                        <Link prefetch={false} href="/" className="site-island-mark" aria-label="Axi Connect, inicio">
                            <BrandMark className="size-[22px]" aria-hidden="true" />
                        </Link>
                        <svg className="site-ring" viewBox="0 0 26 26" aria-hidden="true">
                            <circle className="track" cx="13" cy="13" r="11" />
                            <circle ref={ringRef} className="value" cx="13" cy="13" r="11" pathLength={1} strokeDasharray="0.0001 2" transform="rotate(-90 13 13)" />
                        </svg>
                        <span className="site-island-text" aria-live="off">
                            <span className="site-island-title">{islandTitle || SITE_ISLAND.fallback}</span>
                            <span ref={subRef} className="site-island-sub" />
                        </span>
                        <span className="site-spacer flex-1" />
                        <button
                            type="button"
                            className="site-btn site-menu-btn"
                            aria-label={open ? SITE_ISLAND.closeMenu : SITE_ISLAND.openMenu}
                            aria-expanded={open !== null}
                            aria-controls={open ? panelId : undefined}
                            onClick={() => setOpen((o) => (o ? null : 'vender'))}
                        >
                            {open ? <X className="size-[18px]" aria-hidden="true" /> : <Menu className="size-[18px]" aria-hidden="true" />}
                        </button>
                        <Link prefetch={false} href={ctaHref} className="site-cta" onClick={onCtaClick}>
                            {ctaShort}
                        </Link>
                    </div>
                    <div className="site-toast" aria-hidden={!toast}>
                        <span className="site-toast-check" aria-hidden="true">
                            <Check className="size-[15px]" strokeWidth={2.6} />
                        </span>
                        <span className="site-toast-text">
                            <span className="site-toast-title">{toast?.title}</span>
                            <span className="site-toast-detail">{toast?.detail}</span>
                        </span>
                        <span className="site-toast-when">ahora</span>
                    </div>
                </div>

                {/* Móvil: la isla fija y la hoja. */}
                <div className="site-mobile site-glass">
                    <Link prefetch={false} href="/" className="site-island-mark" aria-label="Axi Connect, inicio">
                        <BrandMark className="size-[22px]" aria-hidden="true" />
                    </Link>
                    <span className="site-brand-name">axi connect</span>
                    <span className="flex-1" />
                    <Link prefetch={false} href={ctaHref} className="site-cta" onClick={onCtaClick}>
                        {ctaShort}
                    </Link>
                    <SiteMenuSheet dark={onFilm} session={session} ctaHref={ctaHref} ctaLabel={ctaLabel} onCtaClick={onCtaClick} />
                </div>

                {open ? <SiteMenuPanel id={panelId} active={active} onPick={setOpen} onNavigate={close} ctaHref={ctaHref} ctaLabel={ctaLabel} /> : null}
            </nav>

            {/* El tema: en escritorio, fuera de la home (allí el escenario es oscuro en los dos temas). */}
            {onFilm ? null : <SiteThemeChoice className="site-theme-pill site-glass" label={SITE_ISLAND.theme} />}
        </header>
    );
}

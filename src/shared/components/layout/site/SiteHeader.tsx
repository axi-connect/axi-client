'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, ArrowRight } from 'lucide-react';

import { spring, fade } from '@/core/styles/motion';
import { useAuthContext } from '@/core/providers/auth-provider';
import { useSplashOptional } from '@/core/providers/splash-provider';
import { useBodyScrollLock } from '@/shared/components/features/detail-sheet/hooks/useBodyScrollLock';
import { ThemeToggle } from '@/shared/components/layout/theme-toggle';
import { BrandMark } from '@/shared/components/ui/brand-mark';
import { Badge } from '@/shared/components/ui/badge';
import {
    SITE_NAV,
    SITE_NAV_CTA,
    SITE_NAV_SESSION,
    type SiteNavItem,
} from '@/shared/components/layout/site/site-nav.content';

/* ────────────────────────── Nav de escritorio ────────────────────────── */

/**
 * Entrada del nav con submenú.
 *
 * Accesibilidad: el disparador es un `<button>` real con `aria-expanded` /
 * `aria-haspopup` / `aria-controls`, y el panel abre por hover **y** por
 * click/teclado. La versión anterior era un `<div>` con `onMouseEnter` sobre un
 * `Link`: el submenú era inalcanzable por teclado y en táctil, y el label
 * navegaba a una ruta que no existía.
 */
function NavDropdown({ item }: { item: SiteNavItem }) {
    const panelId = useId();
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

    const close = useCallback(() => setOpen(false), []);

    // Enfoca el ítem `index` del panel, abriéndolo si hace falta.
    const focusItem = useCallback((index: number) => {
        const children = item.children ?? [];
        if (children.length === 0) return;
        const wrapped = (index + children.length) % children.length;
        // rAF: el panel puede estar montándose en este mismo tick.
        requestAnimationFrame(() => itemRefs.current[wrapped]?.focus());
    }, [item.children]);

    const onTriggerKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
            focusItem(0);
        }
    };

    const onPanelKeyDown = (event: React.KeyboardEvent) => {
        const children = item.children ?? [];
        const current = itemRefs.current.findIndex((node) => node === document.activeElement);
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            focusItem(current + 1);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            focusItem(current - 1);
        } else if (event.key === 'Home') {
            event.preventDefault();
            focusItem(0);
        } else if (event.key === 'End') {
            event.preventDefault();
            focusItem(children.length - 1);
        }
    };

    return (
        <div
            ref={containerRef}
            className="relative"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={close}
            // Cierra al salir el foco del subárbol (tabular fuera del panel).
            onBlur={(event) => {
                if (!containerRef.current?.contains(event.relatedTarget as Node | null)) close();
            }}
            onKeyDown={(event) => {
                if (event.key === 'Escape' && open) {
                    event.preventDefault();
                    close();
                    // Devuelve el foco al disparador: si estaba dentro del panel,
                    // perderlo dejaría al usuario de teclado sin punto de partida.
                    containerRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
                }
            }}
        >
            <button
                type="button"
                aria-expanded={open}
                aria-haspopup="menu"
                aria-controls={panelId}
                onClick={() => setOpen((value) => !value)}
                onKeyDown={onTriggerKeyDown}
                className="text-foreground hover:text-brand focus-visible:ring-ring/50 flex cursor-pointer items-center gap-1 rounded-md font-medium transition-colors duration-200 focus-visible:ring-[3px] focus-visible:outline-none"
            >
                <span>{item.name}</span>
                <ChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        id={panelId}
                        role="menu"
                        aria-label={item.name}
                        onKeyDown={onPanelKeyDown}
                        // `glass-overlay` (no `glass`): más opaco y con más blur,
                        // es el material que el design system reserva para
                        // legibilidad sobre contenido en movimiento
                        // (DESIGN-SYSTEM §5.1). Con `.glass` el texto del submenú
                        // competía con la landing que pasa por debajo.
                        className="glass-overlay absolute top-full left-0 mt-2 w-72 overflow-hidden rounded-xl p-1.5"
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={fade.fast}
                    >
                        {item.children?.map((child, index) => (
                            <Link
                                key={child.name}
                                ref={(node) => {
                                    itemRefs.current[index] = node;
                                }}
                                role="menuitem"
                                prefetch={false}
                                href={child.href}
                                onClick={close}
                                className="hover:bg-accent focus-visible:bg-accent focus-visible:ring-ring/50 block rounded-lg px-3 py-2.5 transition-colors duration-200 focus-visible:ring-[3px] focus-visible:outline-none"
                            >
                                <span className="text-foreground block text-sm font-medium">
                                    {child.name}
                                </span>
                                <span className="text-muted-foreground block text-xs">
                                    {child.description}
                                </span>
                            </Link>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ─────────────────────────── Menú móvil ─────────────────────────── */

function MobileNavItem({ item, onNavigate }: { item: SiteNavItem; onNavigate: () => void }) {
    const panelId = useId();
    const [open, setOpen] = useState(false);

    // Sin hijos: enlace plano. Antes los ítems con submenú se degradaban a
    // enlace en móvil, así que sus hijos eran INALCANZABLES desde el celular
    // — el dispositivo desde el que llega el ICP.
    if (!item.children) {
        return (
            <Link
                prefetch={false}
                href={item.href}
                onClick={onNavigate}
                className="text-foreground hover:text-brand flex items-center gap-2 rounded-lg px-4 py-3 font-medium transition-colors duration-200"
            >
                {item.name}
                {item.badge ? (
                    <Badge variant="secondary" className="font-normal">
                        {item.badge}
                    </Badge>
                ) : null}
            </Link>
        );
    }

    return (
        <div>
            <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen((value) => !value)}
                className="text-foreground hover:text-brand flex w-full cursor-pointer items-center justify-between rounded-lg px-4 py-3 font-medium transition-colors duration-200"
            >
                <span>{item.name}</span>
                <ChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {open ? (
                <div id={panelId} className="border-border/60 ml-4 space-y-0.5 border-l pl-2">
                    {item.children.map((child) => (
                        <Link
                            key={child.name}
                            prefetch={false}
                            href={child.href}
                            onClick={onNavigate}
                            className="text-muted-foreground hover:text-brand block rounded-lg px-3 py-2 text-sm transition-colors duration-200"
                        >
                            {child.name}
                        </Link>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

/* ──────────────────────────── Header ──────────────────────────── */

export default function SiteHeader({ scrollContainerRef }: { scrollContainerRef: React.RefObject<HTMLDivElement | null> }) {
    const { status, user } = useAuthContext();
    const splash = useSplashOptional();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const mobileMenuId = useId();
    const session = SITE_NAV_SESSION[status];

    useBodyScrollLock(isMobileMenuOpen);

    useEffect(() => {
        const currentElement = scrollContainerRef.current;
        if (!currentElement) return;
        const handleScroll = () => setIsScrolled(currentElement.scrollTop > 20);
        // `passive`: el handler no cancela el gesto, y así el navegador no tiene
        // que esperarlo para hacer scroll.
        currentElement.addEventListener('scroll', handleScroll, { passive: true });
        return () => currentElement.removeEventListener('scroll', handleScroll);
    }, [scrollContainerRef]);

    // Escape cierra el menú móvil (antes solo se cerraba tocando el scrim).
    useEffect(() => {
        if (!isMobileMenuOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsMobileMenuOpen(false);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isMobileMenuOpen]);

    const headerVariants = {
        animate: { y: 0, opacity: 1 },
        initial: { y: -100, opacity: 0 },
        // Debe incluir y/opacity: si se llega aquí directo desde `initial`
        // (scroll inmediato al cargar), framer-motion congelaría el header
        // invisible al no tener objetivo para esas propiedades.
        scrolled: { y: 0, opacity: 1 },
    };

    // Con sesión activa el CTA lleva a la app (y repite el splash de marca);
    // sin sesión lleva a la demo. Un visitante nuevo no quiere el inbox: antes
    // apuntaba a /workspace/inbox y el middleware lo rebotaba al login.
    const isAuthenticated = status === 'authenticated';
    const ctaHref = isAuthenticated ? '/workspace/inbox' : SITE_NAV_CTA.href;
    const ctaLabel = isAuthenticated ? (user?.name ?? 'Ir a la app') : SITE_NAV_CTA.label;

    return (
        <motion.header
            initial="initial"
            variants={headerVariants}
            animate={isScrolled ? 'scrolled' : 'animate'}
            transition={fade.slow}
            // El borde de 1px existe SIEMPRE (transparente en reposo): togglear
            // `.glass` a secas hacía saltar border-width 0→1px y `transition-all`
            // interpolaba el border-color desde el gris por defecto — el "flash"
            // de borde iluminado al cambiar de estado. Solo transicionan las
            // propiedades del material (fondo, borde, sombra, blur).
            className={`fixed top-0 right-0 left-0 z-50 border border-transparent transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ${
                isScrolled
                    ? 'glass'
                    : 'bg-transparent shadow-none [-webkit-backdrop-filter:saturate(100%)_blur(0px)] [backdrop-filter:saturate(100%)_blur(0px)]'
            }`}
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between lg:h-20">
                    <motion.div
                        className="flex items-center space-x-2"
                        whileHover={{ scale: 1.05 }}
                        transition={spring.snappy}
                    >
                        {/* BrandMark (SVG inline) en lugar de <Image> remota: el
                            isotipo se servía desde Cloudinary — request externo en
                            el critical path del LCP — y el PNG local pesa 423 KB
                            para renderizar 32px. */}
                        <Link prefetch={false} href="/" className="flex items-center space-x-2">
                            <BrandMark className="size-8" />
                            <span className="text-brand-gradient bg-clip-text text-xl font-bold text-transparent font-heading">
                                axi connect
                            </span>
                        </Link>
                    </motion.div>

                    <nav aria-label="Principal" className="hidden items-center space-x-8 lg:flex">
                        {SITE_NAV.map((item) =>
                            item.children ? (
                                <NavDropdown key={item.name} item={item} />
                            ) : (
                                <Link
                                    key={item.name}
                                    prefetch={false}
                                    href={item.href}
                                    className="text-foreground hover:text-brand flex items-center gap-2 font-medium transition-colors duration-200"
                                >
                                    <span>{item.name}</span>
                                    {item.badge ? (
                                        <Badge variant="secondary" className="font-normal">
                                            {item.badge}
                                        </Badge>
                                    ) : null}
                                </Link>
                            ),
                        )}
                    </nav>

                    <div className="hidden items-center space-x-4 lg:flex">
                        <ThemeToggle />
                        <Link
                            prefetch={false}
                            href={session.href}
                            className="text-foreground hover:text-brand font-medium transition-colors duration-200"
                        >
                            {session.text}
                        </Link>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Link
                                prefetch={false}
                                href={ctaHref}
                                className="bg-brand-gradient text-primary-foreground inline-flex items-center space-x-2 rounded-full px-6 py-2.5 font-medium transition-all duration-200 hover:brightness-110"
                                onClick={() => { if (isAuthenticated) splash.start() }}
                            >
                                <span>{ctaLabel}</span>
                                <ArrowRight aria-hidden="true" className="h-4 w-4" />
                            </Link>
                        </motion.div>
                    </div>

                    <motion.button
                        type="button"
                        aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                        aria-expanded={isMobileMenuOpen}
                        aria-controls={mobileMenuId}
                        className="hover:bg-muted focus-visible:ring-ring/50 cursor-pointer rounded-lg p-2 transition-colors duration-200 focus-visible:ring-[3px] focus-visible:outline-none lg:hidden"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        whileTap={{ scale: 0.95 }}
                    >
                        {isMobileMenuOpen ? (
                            <X aria-hidden="true" className="h-6 w-6" />
                        ) : (
                            <Menu aria-hidden="true" className="h-6 w-6" />
                        )}
                    </motion.button>
                </div>

                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <>
                            <motion.div
                                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMobileMenuOpen(false)}
                            />
                            <motion.div
                                id={mobileMenuId}
                                role="dialog"
                                aria-modal="true"
                                aria-label="Menú de navegación"
                                // Ancho acotado al viewport: `w-80` fijo con
                                // `right-4` se salía de pantallas de 320px.
                                className="glass-overlay fixed top-16 right-4 z-50 max-h-[calc(100vh-5rem)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl lg:hidden"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <div className="space-y-6 p-6">
                                    <div className="space-y-1">
                                        {SITE_NAV.map((item) => (
                                            <MobileNavItem
                                                key={item.name}
                                                item={item}
                                                onNavigate={() => setIsMobileMenuOpen(false)}
                                            />
                                        ))}
                                    </div>

                                    <div className="border-border space-y-3 border-t pt-6">
                                        <div className="flex justify-center pb-2">
                                            <ThemeToggle />
                                        </div>
                                        <Link
                                            prefetch={false}
                                            href={session.href}
                                            className="text-foreground hover:text-brand block w-full rounded-lg py-3 text-center font-medium transition-colors duration-200"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            {session.text}
                                        </Link>
                                        <Link
                                            prefetch={false}
                                            href={ctaHref}
                                            className="bg-brand-gradient text-primary-foreground block w-full rounded-lg py-3 text-center font-medium transition-all duration-200 hover:brightness-110"
                                            onClick={() => {
                                                setIsMobileMenuOpen(false);
                                                if (isAuthenticated) splash.start();
                                            }}
                                        >
                                            {ctaLabel}
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </motion.header>
    );
}

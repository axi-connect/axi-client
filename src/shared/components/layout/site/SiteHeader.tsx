'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import { spring, fade } from '@/core/styles/motion';
import { useAuthContext } from '@/core/providers/auth-provider';
import { useSplashOptional } from '@/core/providers/splash-provider';
import { ThemeToggle } from '@/shared/components/layout/theme-toggle';
import { BrandMark } from '@/shared/components/ui/brand-mark';
import { SiteNavDesktop } from '@/shared/components/layout/site/SiteNavDesktop';
import { SiteNavMobile } from '@/shared/components/layout/site/SiteNavMobile';
import {
    SITE_NAV_CTA,
    SITE_NAV_SESSION,
} from '@/shared/components/layout/site/site-nav.content';

/**
 * Header del sitio público. Aquí vive solo el armazón —marca, estado de scroll,
 * acciones y CTA—; el menú lo montan `SiteNavDesktop` (mega-menú de Radix) y
 * `SiteNavMobile` (`Sheet` + acordeones).
 *
 * El desplegable propio que había antes resolvía la accesibilidad a mano y
 * funcionaba; se retiró porque un mega-menú de dos columnas necesita además
 * orientación entre disparadores, transiciones direccionales y foco por panel.
 * Lo que se conserva palabra por palabra: apertura por hover **y** por
 * click/teclado, cierre con Escape, material `glass-overlay` en el panel, CTA
 * sensible a la sesión y bloqueo de scroll en móvil (ahora lo aporta el `Sheet`).
 */
export default function SiteHeader({
    scrollContainerRef,
}: {
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
    const { status, user } = useAuthContext();
    const splash = useSplashOptional();
    const [isScrolled, setIsScrolled] = useState(false);
    const session = SITE_NAV_SESSION[status];

    useEffect(() => {
        const currentElement = scrollContainerRef.current;
        if (!currentElement) return;
        const handleScroll = () => setIsScrolled(currentElement.scrollTop > 20);
        // `passive`: el handler no cancela el gesto, y así el navegador no tiene
        // que esperarlo para hacer scroll.
        currentElement.addEventListener('scroll', handleScroll, { passive: true });
        return () => currentElement.removeEventListener('scroll', handleScroll);
    }, [scrollContainerRef]);

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
    const onCtaClick = () => {
        if (isAuthenticated) splash.start();
    };

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
                <div className="flex h-16 items-center justify-between gap-4 lg:h-20">
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
                            <span className="text-brand-gradient font-heading bg-clip-text text-xl font-bold text-transparent">
                                axi connect
                            </span>
                        </Link>
                    </motion.div>

                    <SiteNavDesktop />

                    <div className="hidden items-center gap-4 lg:flex">
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
                                onClick={onCtaClick}
                            >
                                <span>{ctaLabel}</span>
                                <ArrowRight aria-hidden="true" className="h-4 w-4" />
                            </Link>
                        </motion.div>
                    </div>

                    <SiteNavMobile
                        session={session}
                        ctaHref={ctaHref}
                        ctaLabel={ctaLabel}
                        onCtaClick={onCtaClick}
                    />
                </div>
            </div>
        </motion.header>
    );
}

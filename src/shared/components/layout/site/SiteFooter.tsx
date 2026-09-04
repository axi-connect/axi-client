'use client';

import Link from 'next/link';

import { BrandMark } from '@/shared/components/ui/brand-mark';
import { KodecolBanner } from '@/shared/components/layout/site/KodecolBanner';
import { SocialIcon } from '@/shared/components/layout/site/SocialIcon';
import {
  SITE_FOOTER_COLUMNS,
  SITE_SOCIALS,
} from '@/shared/components/layout/site/site-nav.content';

export default function SiteFooter() {
  return (
    <footer className="relative z-10 mt-8 w-full overflow-hidden pt-16 pb-8">
      {/* Superficie: `.bg-brand-ambient` del design system (globals.css), no un
          material propio. Antes esto era un `<style jsx global>` con su propia
          paleta y distribución — divergía del hero en espacio de color,
          saturación, borde y token por tema. Además, definir clases globales
          desde aquí ya secuestró `.glass` en toda la app una vez: la regla es
          que el material vive en globals.css, no en el componente. */}
      <div className="bg-brand-ambient border-border relative mx-auto flex max-w-6xl flex-col items-center gap-8 rounded-2xl border px-6 py-10 md:flex-row md:items-start md:justify-between md:gap-12">
        <div className="flex flex-col items-center md:items-start">
          {/* BrandMark inline: el isotipo se cargaba desde Cloudinary (request
              externo) y el PNG local pesa 423 KB para renderizar 36px. */}
          <Link href="/" className="mb-4 flex items-center gap-2">
            <BrandMark className="size-9" />
            <span className="text-brand-wordmark text-2xl font-semibold tracking-tight font-heading">
              axi connect
            </span>
          </Link>
          <p className="text-muted-foreground mb-6 max-w-sm text-center text-sm leading-relaxed text-pretty md:text-left">
            Donde la tecnología entiende a las personas y las empresas se vuelven
            más humanas.
          </p>

          {SITE_SOCIALS.length > 0 ? (
            <div className="text-brand mt-2 flex gap-3">
              {SITE_SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={`Axi Connect en ${social.label}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground focus-visible:ring-ring/50 rounded-md p-1 transition-colors duration-200 focus-visible:ring-[3px] focus-visible:outline-none"
                >
                  <SocialIcon name={social.icon} className="h-5 w-5" />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <nav
          aria-label="Pie de página"
          className="flex w-full flex-col gap-9 text-center md:w-auto md:flex-row md:justify-end md:gap-12 md:text-left"
        >
          {SITE_FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <div className="text-brand mb-3 text-xs font-semibold tracking-widest uppercase">
                {column.title}
              </div>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-foreground/70 hover:text-brand text-sm transition-colors duration-200"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <KodecolBanner />

      <div className="text-muted-foreground relative z-10 mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs">
        <span>&copy; {new Date().getFullYear()} Axi Connect</span>
        <span aria-hidden="true">·</span>
        <span>Colombia</span>
        <span aria-hidden="true">·</span>
        <Link href="/legal/terminos" className="hover:text-brand transition-colors">
          Términos
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/legal/privacidad" className="hover:text-brand transition-colors">
          Privacidad
        </Link>
      </div>
    </footer>
  );
}

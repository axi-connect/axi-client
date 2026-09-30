"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { useAuthContext } from "@/core/providers/auth-provider";
import { useSplashOptional } from "@/core/providers/splash-provider";
import { BrandMark } from "@/shared/components/ui/brand-mark";

/**
 * La cabecera de la home: la píldora de la referencia aprobada el 2026-09-30.
 * Isotipo en un círculo claro, los enlaces en una píldora clara con el
 * indicador de tres puntos bajo el activo, y «Iniciar sesión» en tinta. En
 * móvil, hamburguesa y hoja clara bajo la cabecera.
 *
 * Solo la monta `/` (PublicHeader): el resto del sitio conserva SiteHeader.
 * Los enlaces son planos a propósito: la película ya cuenta el producto y la
 * cabecera no compite con ella con mega-menús. Colores por tokens de la capa
 * 1 bajo `.dark`: la píldora «blanca» es `--foreground` y su texto `--background`.
 */

const LINKS = [
  { label: "Inicio", href: "/", active: true },
  { label: "Producto", href: "/productos" },
  { label: "Precios", href: "/precios" },
  { label: "Casos", href: "/casos" },
  { label: "Contacto", href: "/contacto" },
] as const;

const SHADOW = "shadow-[0_4px_14px_rgb(0_0_0/0.16)]";

function useSession() {
  const { status, user } = useAuthContext();
  const splash = useSplashOptional();
  const signedIn = status === "authenticated";
  return {
    href: signedIn ? "/workspace/inbox" : "/auth/login",
    label: signedIn ? (user?.name ?? "Ir a la app") : "Iniciar sesión",
    onClick: () => {
      if (signedIn) splash?.start();
    },
  };
}

function Logo() {
  return (
    <Link
      href="/"
      prefetch={false}
      aria-label="axi connect, inicio"
      className={cn(
        "grid size-[clamp(40px,4.4vw,46px)] shrink-0 place-items-center rounded-full bg-foreground transition-transform duration-200 hover:scale-[1.04]",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none max-md:size-12",
        SHADOW,
      )}
    >
      <BrandMark className="size-[72%]" />
    </Link>
  );
}

export function FilmHeader() {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const menuId = useId();

  // El menú móvil se cierra con Escape, al volver a escritorio y al navegar.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onResize = () => window.innerWidth >= 768 && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    document.body.classList.add("menu-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.classList.remove("menu-open");
    };
  }, [open]);

  return (
    <header className="dark theme-dark-island fixed inset-x-0 top-0 z-50 text-foreground">
      <div className="film-header mx-auto flex max-w-[760px] items-center justify-center gap-[clamp(14px,2.4vw,24px)] px-4 pt-[clamp(14px,2.4vh,24px)] max-md:justify-between">
        <Logo />

        <nav aria-label="Principal" className={cn("flex h-[clamp(44px,5.2vw,48px)] max-w-[460px] flex-1 items-center justify-between rounded-full bg-foreground px-2 max-md:hidden", SHADOW)}>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              prefetch={false}
              aria-current={"active" in l ? "page" : undefined}
              className={cn(
                "relative rounded-full px-3 py-2 text-[clamp(13px,1.4vw,15px)] font-medium tracking-[-0.01em] text-background transition-opacity duration-200",
                "opacity-50 hover:opacity-75 aria-[current=page]:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                "aria-[current=page]:after:absolute aria-[current=page]:after:bottom-[5px] aria-[current=page]:after:left-1/2 aria-[current=page]:after:size-[3px] aria-[current=page]:after:-translate-x-1/2 aria-[current=page]:after:rounded-full aria-[current=page]:after:bg-background",
                "aria-[current=page]:after:shadow-[-5px_0_0_var(--background),5px_0_0_var(--background)]",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <Link
          href={session.href}
          prefetch={false}
          onClick={session.onClick}
          className={cn(
            "inline-flex h-[clamp(44px,5.2vw,48px)] shrink-0 items-center rounded-full bg-[color-mix(in_srgb,var(--foreground)_14%,var(--background))] px-5 text-sm font-medium",
            "text-[color-mix(in_srgb,var(--foreground)_80%,transparent)] transition-[background-color,color,transform] duration-200 hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--foreground)_18%,var(--background))] hover:text-foreground",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none max-md:hidden",
            SHADOW,
          )}
        >
          {session.label}
        </Link>

        <button
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "relative hidden size-12 shrink-0 items-center justify-center rounded-full transition-colors duration-200 max-md:flex",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            open ? "bg-foreground" : "bg-[color-mix(in_srgb,var(--foreground)_14%,var(--background))]",
            SHADOW,
          )}
        >
          {[-6, 0, 6].map((y, i) => (
            <span
              key={y}
              aria-hidden="true"
              className={cn(
                "absolute h-[1.5px] w-[18px] rounded-full transition-[transform,opacity,background-color] duration-300",
                open ? "bg-background" : "bg-foreground",
                open && i === 1 && "opacity-0",
              )}
              style={{
                transform: open ? (i === 0 ? "rotate(45deg)" : i === 2 ? "rotate(-45deg)" : "none") : `translateY(${y}px)`,
              }}
            />
          ))}
        </button>
      </div>

      {open ? (
        <>
          <div className="film-overlay fixed inset-0 -z-10 bg-[rgb(0_0_0/0.62)] backdrop-blur-[6px] md:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
          <nav
            id={menuId}
            aria-label="Menú"
            className="film-menu mx-4 mt-3 flex flex-col gap-1 rounded-[28px] bg-foreground px-[18px] pt-[22px] pb-5 text-background shadow-[0_20px_60px_rgb(0_0_0/0.45)] md:hidden"
          >
            {LINKS.map((l, i) => (
              <Link
                key={l.href}
                href={l.href}
                prefetch={false}
                onClick={() => setOpen(false)}
                aria-current={"active" in l ? "page" : undefined}
                className="film-menu-link relative rounded-2xl px-4 py-3 text-center text-[17px] font-medium aria-[current=page]:after:absolute aria-[current=page]:after:bottom-2 aria-[current=page]:after:left-1/2 aria-[current=page]:after:size-[3px] aria-[current=page]:after:-translate-x-1/2 aria-[current=page]:after:rounded-full aria-[current=page]:after:bg-background aria-[current=page]:after:shadow-[-5px_0_0_var(--background),5px_0_0_var(--background)]"
                style={{ "--i": i } as React.CSSProperties}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/comenzar?plan=free_trial"
              prefetch={false}
              onClick={() => setOpen(false)}
              className="film-menu-link mt-3 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-semibold text-primary-foreground"
              style={{ "--i": LINKS.length } as React.CSSProperties}
            >
              Prueba 7 días gratis
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href={session.href}
              prefetch={false}
              onClick={() => {
                session.onClick();
                setOpen(false);
              }}
              className="film-menu-link mt-2 inline-flex h-12 items-center justify-center rounded-full bg-background font-medium text-foreground"
              style={{ "--i": LINKS.length + 1 } as React.CSSProperties}
            >
              {session.label}
            </Link>
          </nav>
        </>
      ) : null}
    </header>
  );
}

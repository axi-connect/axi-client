"use client";

import * as React from "react";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/core/lib/utils";

/**
 * Menú de navegación de la capa pública (Radix `navigation-menu`).
 *
 * Sustituye al desplegable propio que tenía `SiteHeader`: ese resolvía la
 * accesibilidad a mano (`aria-expanded`, flechas, Escape, cierre al salir el
 * foco) y funcionaba, pero un mega-menú con dos columnas y tarjetas necesita
 * además foco atrapado por panel, orientación entre disparadores y las
 * transiciones direccionales `data-motion` — que es exactamente lo que aporta
 * el primitivo. Lo que se conserva del componente anterior: apertura por hover
 * **y** por click/teclado, cierre con Escape y el material `glass-overlay`.
 *
 * No lleva z-index propio: vive dentro del `SiteHeader`, que ya establece su
 * capa (DESIGN-SYSTEM §4.4 prohíbe z-index sueltos en componentes).
 *
 * ⚠️ **REGLA DE MONTAJE, no es opcional.** El panel (`NavigationMenuViewport`)
 * NO puede ser descendiente de un elemento con `backdrop-filter`, `filter`,
 * `opacity < 1`, `transform` o `will-change`: cualquiera de esos crea un
 * *backdrop root*, y a partir de ahí el panel solo puede difuminar lo que se
 * pinte **dentro** de ese ancestro — que detrás del panel es nada. El síntoma es
 * exacto y desconcertante: el cristal del panel se ve completamente
 * transparente, con la página legible detrás y sin una pizca de blur, mientras
 * el mismo `backdrop-filter` funciona en la barra de arriba.
 *
 * Por eso el `Root` va **por fuera** de la barra con `.glass` y el panel queda
 * como HERMANO de esa barra, no como su hijo (ver `SiteHeader`). El `Root` es un
 * div sin material a propósito: si se le pone glass, rompe a sus propios hijos.
 */

function NavigationMenu({
  className,
  children,
  viewport = true,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Root> & {
  /** `false` monta el contenido bajo cada ítem en vez de en un viewport único. */
  viewport?: boolean;
}) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      data-viewport={viewport}
      // `relative`: es el ancla del panel absoluto. Sin material propio (ver la
      // regla de montaje de arriba).
      className={cn("group/navigation-menu relative", className)}
      {...props}
    >
      {children}
      {viewport ? <NavigationMenuViewport /> : null}
    </NavigationMenuPrimitive.Root>
  );
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn("group flex flex-1 list-none items-center justify-center gap-1", className)}
      {...props}
    />
  );
}

function NavigationMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn("relative", className)}
      {...props}
    />
  );
}

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(
        "group text-foreground hover:bg-accent/60 focus-visible:ring-ring/50 data-[state=open]:bg-accent/60",
        "inline-flex w-max cursor-pointer items-center justify-center gap-1 rounded-md px-3.5 py-2 text-sm font-medium",
        "outline-none transition-colors duration-200 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon
        aria-hidden="true"
        className="relative top-px size-3.5 transition-transform duration-300 group-data-[state=open]:rotate-180"
      />
    </NavigationMenuPrimitive.Trigger>
  );
}

function NavigationMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        // Transiciones direccionales del primitivo: el panel entra por el lado
        // desde el que venía el cursor, así el movimiento explica el recorrido.
        "data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out",
        "data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52",
        "data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52",
        "top-0 left-0 w-full md:absolute md:w-auto",
        className,
      )}
      {...props}
    />
  );
}

function NavigationMenuViewport({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
  return (
    // OJO: aquí NO va `isolate`. `isolation: isolate` está en la lista de
    // propiedades que crean un *backdrop root* (igual que `filter` u `opacity`),
    // así que con él el panel se queda otra vez sin nada que difuminar. Era la
    // segunda causa del cristal transparente, y venía de la plantilla original.
    // El apilamiento lo da el orden del DOM: el panel se pinta después que la
    // barra.
    <div className="absolute top-full left-0 flex w-full justify-center">
      <NavigationMenuPrimitive.Viewport
        data-slot="navigation-menu-viewport"
        className={cn(
          // `glass-menu` (§5.1): 72 % de fondo con 28px de blur. Es la receta
          // del mega-menú y no una de las otras dos a propósito — con la del
          // header (16px) el texto competía con la landing de detrás, y con la
          // de un modal (80 %) el panel se leía como una caja sólida. El blur
          // alto es lo que permite bajar la opacidad sin perder legibilidad.
          "glass-menu origin-top relative mt-2 overflow-hidden rounded-2xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-200",
          // El primitivo mide el panel activo y publica su tamaño en estas
          // variables: sin ellas el contenedor no puede animar el cambio de
          // alto entre paneles de distinta altura.
          "h-(--radix-navigation-menu-viewport-height) w-full md:w-(--radix-navigation-menu-viewport-width)",
          className,
        )}
        {...props}
      />
    </div>
  );
}

function NavigationMenuLink({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Link>) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        "hover:bg-accent/60 focus-visible:ring-ring/50 data-[active=true]:bg-accent/50",
        "flex flex-col justify-center gap-1 rounded-lg px-3 py-2 text-sm outline-none transition-colors duration-150",
        "focus-visible:ring-[3px]",
        className,
      )}
      {...props}
    />
  );
}

function NavigationMenuIndicator({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Indicator>) {
  return (
    <NavigationMenuPrimitive.Indicator
      data-slot="navigation-menu-indicator"
      className={cn(
        "data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in",
        "top-full flex h-2 items-end justify-center overflow-hidden",
        className,
      )}
      {...props}
    >
      <div className="bg-border relative top-[60%] size-2 rotate-45 rounded-tl-sm" />
    </NavigationMenuPrimitive.Indicator>
  );
}

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuViewport,
  NavigationMenuLink,
  NavigationMenuIndicator,
};

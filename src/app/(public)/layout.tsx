"use client";

import { useRef } from "react";
import SiteHeader from "@/shared/components/layout/site/SiteHeader";
import SiteFooter from "@/shared/components/layout/site/SiteFooter";
import { PublicAnalytics } from "@/core/analytics/ui/PublicAnalytics";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // `relative` en el contenedor de scroll: framer-motion (useScroll de la
  // landing) exige posición no estática para calcular offsets correctos.
  //
  // `w-full` y NO `w-screen`: 100vw incluye el ancho de la barra de scroll, que
  // este contenedor fuerza siempre — con `w-screen` la landing entera tenía
  // ~15px de scroll horizontal en cuanto la barra era visible.
  return (
    <div ref={scrollContainerRef} data-app-scroll className="relative h-screen w-full overflow-y-auto sidebar-scroll">
      {/* Solo en la capa pública: montarlo en el layout raíz mandaría a Google
          y a Meta las rutas del panel privado. */}
      <PublicAnalytics />
      <SiteHeader scrollContainerRef={scrollContainerRef} />
      {/* `main` es el landmark que faltaba en toda la capa pública: sin él, ni
          los lectores de pantalla ni los extractores de contenido de los
          buscadores pueden distinguir el contenido de la página del cromo
          (cabecera, menú, pie) que se repite en las doce rutas. */}
      <main className="flex flex-col items-center justify-center">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
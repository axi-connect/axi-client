"use client";

import SiteHero from "@/shared/components/layout/site/hero/SiteHero";
import SiteFramework from "@/shared/components/layout/site/sections/SiteFramework";
import SiteInboxShowcase from "@/shared/components/layout/site/sections/SiteInboxShowcase";

/**
 * Backup de la landing previa al rediseño (julio 2026).
 *
 * Copia 1:1 de la composición que vivía en `src/app/(public)/page.tsx` antes
 * de la landing de conversión (`modules/landing`). No está enrutada; existe
 * para poder restaurar o comparar sin excavar en git. Las secciones que
 * compone (SiteHero, SiteFramework, SiteInboxShowcase) siguen intactas en
 * `shared/components/layout/site/`.
 */
export default function LegacyLandingPage() {
  return (
    <div className="w-full">
      <SiteHero />
      <SiteFramework />
      <SiteInboxShowcase />
    </div>
  );
}

"use client";

import SiteHero from "@/shared/components/layout/site/hero/SiteHero";
import SiteFramework from "@/shared/components/layout/site/sections/SiteFramework";
import SiteInboxShowcase from "@/shared/components/layout/site/sections/SiteInboxShowcase";
// import SiteSectionLogoCloud from "@/shared/components/sections/site-section-logo-cloud";

export default function Home() {
  return (
    <div className="w-full">
      <SiteHero />
      {/* <SiteSectionLogoCloud /> */}
      <SiteFramework />
      <SiteInboxShowcase />
    </div>
  );
}
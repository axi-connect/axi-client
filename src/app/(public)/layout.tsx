"use client";

import { useRef } from "react";
import SiteHeader from "@/shared/components/layout/site/SiteHeader";
import SiteFooter from "@/shared/components/layout/site/SiteFooter";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={scrollContainerRef} className="h-screen w-screen overflow-y-auto sidebar-scroll">
      <SiteHeader scrollContainerRef={scrollContainerRef} />
      <div className="flex flex-col items-center justify-center">
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}
import SiteHeader from "@/components/layout/site/site-header";
import FooterGlow from "@/components/layout/site/site-footer";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="flex flex-col items-center justify-center">
        {children}
      </div>
      <FooterGlow />
    </div>
  );
}
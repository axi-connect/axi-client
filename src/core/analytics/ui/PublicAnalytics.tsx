"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

import { ANALYTICS_ENABLED, GA_MEASUREMENT_ID, META_PIXEL_ID } from "@/core/config/env";
import { attachOutboundTracking } from "@/core/analytics/outbound";
import { pageview } from "@/core/analytics/track";
import { onConsentChange, readConsent, type ConsentStatus } from "@/core/analytics/consent";
import { ConsentBanner } from "@/core/analytics/ui/ConsentBanner";

/**
 * Analítica de la capa PÚBLICA.
 *
 * Se monta en `app/(public)/layout.tsx` y NO en el layout raíz, aunque el raíz
 * sería más cómodo: el raíz envuelve también `(private)` y `/platform`, así que
 * montarlo ahí enviaría a Google y a Meta rutas como `/workspace/inbox/<id>` o
 * `/crm/contacts/<id>`. Eso son datos de las conversaciones de los clientes de
 * cada tenant, y además ensuciaría las métricas de marketing con el uso diario
 * del panel. La frontera de este componente es la frontera de privacidad.
 *
 * Nota sobre el orden de los scripts: `strategy="beforeInteractive"` solo es
 * válido en el layout raíz del App Router, así que no puede usarse aquí. No
 * hace falta: `dataLayer` es una cola, de modo que basta con que el script en
 * línea (que la crea y encola el `consent default`) se ejecute antes de que
 * `gtag.js` la procese. Al ir declarado primero, así ocurre.
 */
export function PublicAnalytics() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<ConsentStatus | null>(null);

  // La decisión se lee en efecto, nunca en render: `localStorage` no existe en
  // el servidor y leerlo en render provocaría un desajuste de hidratación.
  useEffect(() => {
    setConsent(readConsent());
    return onConsentChange(setConsent);
  }, []);

  // Propaga la decisión a Consent Mode. GA sigue cargado, pero deja de usar
  // cookies cuando está denegado.
  useEffect(() => {
    if (!ANALYTICS_ENABLED || consent === null) return;
    const value = consent === "granted" ? "granted" : "denied";
    window.gtag?.("consent", "update", {
      ad_storage: value,
      ad_user_data: value,
      ad_personalization: value,
      analytics_storage: value,
    });
  }, [consent]);

  // Una vista por navegación. `location.search` se lee aquí dentro y no con
  // `useSearchParams()`: ese hook fuerza el renderizado en cliente de todo el
  // subárbol, y dentro del efecto la información es la misma y sale gratis.
  useEffect(() => {
    if (!ANALYTICS_ENABLED) return;
    pageview(`${pathname}${window.location.search}`);
  }, [pathname]);

  useEffect(() => {
    if (!ANALYTICS_ENABLED) return;
    return attachOutboundTracking(() => window.location.pathname);
  }, []);

  if (!ANALYTICS_ENABLED) return null;

  return (
    <>
      {GA_MEASUREMENT_ID ? (
        <>
          <Script id="ga-bootstrap" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('consent', 'default', {
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                analytics_storage: 'denied',
                wait_for_update: 500
              });
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
            `}
          </Script>
          <Script
            id="ga-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          />
        </>
      ) : null}

      {/* El píxel solo existe tras un sí explícito: Meta no tiene un modo sin
          cookies equivalente al Consent Mode de Google. */}
      {META_PIXEL_ID && consent === "granted" ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      ) : null}

      <ConsentBanner />
    </>
  );
}

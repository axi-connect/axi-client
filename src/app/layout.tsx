import "./globals.css";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Poppins } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/core/providers/auth-provider";
import { ThemeProvider } from "@/core/providers/theme-provider";
import { AlertProvider } from "@/core/providers/alert-provider";
import { SplashProvider } from "@/core/providers/splash-provider";
import { MotionProvider } from "@/core/providers/motion-provider";
import { SITE_URL, siteUrl } from "@/core/config/env";
import { OG_IMAGE } from "@/core/seo/site";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Nexa en WOFF2 y no en TTF: es la fuente de los titulares, así que entra en la
 * ruta crítica del LCP y `next/font/local` la precarga. Los dos TTF originales
 * pesaban 287 KB juntos; en WOFF2 son 102 KB (-64 %) con el mismo trazado.
 */
const nexa = localFont({
  src: [
    { path: "../../public/fonts/nexa/Nexa-ExtraLight.woff2", weight: "200", style: "normal" },
    { path: "../../public/fonts/nexa/Nexa-Heavy.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-nexa",
  display: "swap",
});

/**
 * Sin el peso 300: no le quedaba ningún consumidor (`font-light` no aparece en
 * el proyecto), y `next/font/google` descarga y precarga un archivo por peso
 * declarado, se use o no.
 */
const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * Descripción por defecto del sitio. Vive aquí y no en el content de la landing
 * porque la heredan también las rutas que no son marketing (`/marketplace`,
 * legales) cuando no declaran la suya.
 */
const SITE_DESCRIPTION =
  "Atención al cliente omnicanal con IA: WhatsApp, Instagram y Messenger en un solo inbox, con agentes inteligentes y handoff humano.";

export const metadata: Metadata = {
  // `SITE_URL` lanza si falta (core/config/env.ts). Antes había aquí un
  // fallback a localhost que se activaba en producción, porque la variable no
  // estaba declarada en el Dockerfile ni en el workflow: todos los canonical y
  // todas las URLs de Open Graph apuntaban a `http://localhost:3001`.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Axi Connect — Vende por WhatsApp con agentes de IA",
    template: "%s — Axi Connect",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Axi Connect",
  alternates: { canonical: "/" },
  // Los números de la landing (precios, cifras) no son teléfonos: sin esto,
  // Safari en iOS los convierte en enlaces `tel:` y rompe la tipografía.
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: "website",
    siteName: "Axi Connect",
    title: "Axi Connect — Vende por WhatsApp con agentes de IA",
    description: SITE_DESCRIPTION,
    locale: "es_CO",
    url: siteUrl("/"),
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Axi Connect — Vende por WhatsApp con agentes de IA",
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Sin esto Google recorta el snippet y sirve una miniatura pequeña en
      // vez de la imagen de 1200×630 que ya tenemos.
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

/**
 * `themeColor` por esquema: pinta la barra del navegador en móvil. Va en
 * `viewport` y no en `metadata` porque Next 15 movió ahí los campos que afectan
 * al renderizado de la ventana.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  // Slot paralelo @modal: siempre presente (default.tsx devuelve null).
  modal: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistMono.variable} ${nexa.variable} ${poppins.variable} antialiased`}
      >
        <ThemeProvider>
          <MotionProvider>
          <AuthProvider>
            <AlertProvider>
              <SplashProvider>
                {children}
                {modal}
              </SplashProvider>
            </AlertProvider>
          </AuthProvider>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
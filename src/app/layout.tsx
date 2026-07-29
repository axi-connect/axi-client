import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Poppins } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/core/providers/auth-provider";
import { ThemeProvider } from "@/core/providers/theme-provider";
import { AlertProvider } from "@/core/providers/alert-provider";
import { SplashProvider } from "@/core/providers/splash-provider";
import { MotionProvider } from "@/core/providers/motion-provider";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const nexa = localFont({
  src: [
    { path: "../../public/fonts/nexa/Nexa-ExtraLight.ttf", weight: "200", style: "normal" },
    { path: "../../public/fonts/nexa/Nexa-Heavy.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-nexa",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"),
  title: {
    default: "axi connect",
    template: "%s — Axi Connect",
  },
  description:
    "Atención al cliente omnicanal con IA: WhatsApp, Instagram y Messenger en un solo inbox, con agentes inteligentes y handoff humano.",
  openGraph: {
    type: "website",
    siteName: "axi connect",
    title: "axi connect",
    description:
      "Atención al cliente omnicanal con IA: WhatsApp, Instagram y Messenger en un solo inbox.",
    locale: "es_CO",
  },
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
    <html lang="en" suppressHydrationWarning>
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
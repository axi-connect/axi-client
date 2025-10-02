import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Poppins } from "next/font/google";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/shared/auth/auth.context";
import { ThemeProvider } from "@/components/providers/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

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
  title: "Axi Connect",
  description: "Plataforma de CRM y marketplace de influencia",
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal?: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${nexa.variable} ${poppins.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            {children}
            {modal}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
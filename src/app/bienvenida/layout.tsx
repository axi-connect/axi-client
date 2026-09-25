import { Poppins, Shadows_Into_Light } from "next/font/google"

import s from "@/modules/welcome-kit/ui/welcome-kit.module.css"

/**
 * Fuentes del kit de bienvenida, solo para esta ruta: el layout raíz trae Nexa
 * y Poppins 400–700, pero el kit usa además Poppins 300 (el párrafo de la
 * bienvenida) y Shadows Into Light (las notas a mano). Montarlas en la raíz las
 * precargaría en todo el panel sin usarlas.
 */
const kitPoppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-kit-poppins",
  display: "swap",
})

const kitHand = Shadows_Into_Light({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-kit-hand",
  display: "swap",
})

export default function WelcomeKitLayout({ children }: { children: React.ReactNode }) {
  return <main className={`${kitPoppins.variable} ${kitHand.variable} ${s.page}`}>{children}</main>
}

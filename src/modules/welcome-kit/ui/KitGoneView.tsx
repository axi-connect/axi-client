import Link from "next/link"

import { BrandMark } from "@/shared/components/ui/brand-mark"
import s from "./welcome-kit.module.css"

/**
 * El enlace ya no abre un kit. Dos casos con copy propio:
 * - `gone`: el kit venció (30 días o plan activado) o el enlace no existe. El
 *   servidor no distingue a propósito, así que la pantalla tampoco.
 * - `unavailable`: el servidor no respondió; el enlace puede seguir vivo.
 * En los dos, la salida es el panel: todo lo configurado vive allí.
 */
export function KitGoneView({ reason }: { reason: "gone" | "unavailable" }) {
  const gone = reason === "gone"
  return (
    <div className={s.gone}>
      <BrandMark style={{ width: 48, height: 48 }} />
      <h1 className={s.goneTitle}>{gone ? "Tu kit ya cumplió su semana" : "No pudimos abrir tu kit"}</h1>
      <p className={s.goneText}>
        {gone
          ? "Este enlace ya no está activo. Lo que configuramos juntos sigue en tu panel."
          : "Algo falló de nuestro lado. Vuelve a abrir el enlace en unos minutos o entra a tu panel."}
      </p>
      <Link prefetch={false} href="/auth/login" className={s.cta}>
        Entrar a mi panel <span aria-hidden="true" className={s.ctaArrow}>→</span>
      </Link>
    </div>
  )
}

import Link from "next/link"

import { BrandMark } from "@/shared/components/ui/brand-mark"
import type { WelcomeKitUnavailableReason } from "../domain/welcome-kit"
import s from "./welcome-kit.module.css"

const COPY: Record<WelcomeKitUnavailableReason, { title: string; text: string }> = {
  gone: {
    title: "Tu kit ya cumplió su semana",
    text: "Este enlace ya no está activo. Lo que configuramos juntos sigue en tu panel.",
  },
  busy: {
    title: "Un momento",
    text: "Estamos con mucho tráfico; recarga en unos segundos.",
  },
  unavailable: {
    title: "No pudimos abrir tu kit",
    text: "Algo falló de nuestro lado. Vuelve a abrir el enlace en unos minutos o entra a tu panel.",
  },
}

/**
 * El enlace no abre un kit. Tres casos con copy propio:
 * - `gone`: el kit venció (30 días o plan activado) o el enlace no existe. El
 *   servidor no distingue a propósito, así que la pantalla tampoco.
 * - `busy`: el throttle del servidor (429). Pasa solo: la salida es recargar.
 * - `unavailable`: el servidor no respondió; el enlace puede seguir vivo.
 * En `gone` y `unavailable` la salida es el panel: todo lo configurado vive allí.
 */
export function KitGoneView({
  reason,
  reloadHref,
}: {
  reason: WelcomeKitUnavailableReason
  /** La URL del propio kit, para «Recargar» sin JS (solo en `busy`). */
  reloadHref?: string
}) {
  const copy = COPY[reason]
  return (
    <div className={s.gone}>
      <BrandMark style={{ width: 48, height: 48 }} />
      <h1 className={s.goneTitle}>{copy.title}</h1>
      <p className={s.goneText}>{copy.text}</p>
      {reason === "busy" && reloadHref ? (
        <a href={reloadHref} className={s.cta}>
          Recargar <span aria-hidden="true" className={s.ctaArrow}>→</span>
        </a>
      ) : (
        <Link prefetch={false} href="/auth/login" className={s.cta}>
          Entrar a mi panel <span aria-hidden="true" className={s.ctaArrow}>→</span>
        </Link>
      )}
    </div>
  )
}

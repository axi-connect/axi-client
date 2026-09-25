import { BrandMark } from "@/shared/components/ui/brand-mark"
import type { KitView } from "../../domain/kit-view"
import s from "../welcome-kit.module.css"

/** Por debajo de este ancho, el WhatsApp baja de línea y se alinea a la izquierda. */
const NARROW_WIDTH = 560

/** 06 · 05 · Contacto: la firma del asesor y su WhatsApp. */
export function KitContact({ view, width }: { view: KitView; width: number | null }) {
  const narrow = width !== null && width < NARROW_WIDTH
  return (
    <section data-screen-label="06 Contacto" className={s.contact}>
      <div className={s.signature}>
        <div className={s.signatureName}>
          <span>Cualquier cosa, escríbeme. Te acompaño toda la semana.</span>
          <span className={`${s.hand} ${s.advisorHand}`}>{view.advisorFirstName}</span>
          <span>{view.advisorName} · Axi Connect</span>
        </div>
        <a
          href={view.advisorWaHref}
          className={s.whatsapp}
          style={{ alignItems: narrow ? "flex-start" : "flex-end" }}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Escribirle a ${view.advisorFirstName} por WhatsApp al ${view.advisorPhone}`}
        >
          <span className={s.whatsappLabel}>WhatsApp</span>
          <span className={s.whatsappNumber}>{view.advisorPhone}</span>
        </a>
      </div>
      <div className={s.footer}>
        <div className={s.footerBrand}>
          <BrandMark style={{ width: 24, height: 24 }} />
          <span>axi connect</span>
        </div>
        <span className={s.footerTag}>Kit de bienvenida · {view.businessName}</span>
      </div>
    </section>
  )
}

/**
 * El video inmersivo (plan §23): las fuentes son las de /productos, por
 * Cloudinary en H.264 con su póster, y el texto no promete nada que el video no
 * muestre.
 */
import { HERO_VIDEO as FILM_VIDEO_SOURCES } from "@/modules/landing/ui/content/productos.content"

import { FILM_VIDEO } from "../video-content"

describe("el video de la película", () => {
  it.each(["desktop", "mobile"] as const)("%s: H.264 por Cloudinary, sin q_auto, con su póster", (v) => {
    const s = FILM_VIDEO_SOURCES[v]
    expect(s.mp4).toMatch(/^https:\/\/res\.cloudinary\.com\/.+\/video\/upload\/vc_h264,q_90,/)
    expect(s.mp4).not.toMatch(/q_auto/)
    expect(s.poster).toMatch(/f_jpg/)
  })

  it("el máster vertical es otro archivo, no un recorte del horizontal", () => {
    expect(FILM_VIDEO_SOURCES.mobile.mp4).not.toBe(FILM_VIDEO_SOURCES.desktop.mp4)
  })

  it("sin cifras inventadas en la copia", () => {
    for (const t of Object.values(FILM_VIDEO)) expect(t).not.toMatch(/\d+\s?%|\bx\d|\d{2,}/)
  })
})

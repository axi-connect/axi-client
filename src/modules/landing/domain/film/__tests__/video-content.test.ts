/**
 * El video inmersivo (plan §23): el video de la home por Cloudinary, en H.264,
 * con su póster, y el texto no promete nada que el video no muestre.
 */
import { FILM_VIDEO, FILM_VIDEO_SOURCES } from "../video-content"

describe("el video de la película", () => {
  it.each(["desktop", "mobile"] as const)("%s: el video de la home por Cloudinary, en mp4, con su póster", (v) => {
    const s = FILM_VIDEO_SOURCES[v]
    expect(s.mp4).toMatch(/^https:\/\/res\.cloudinary\.com\/dpfnxj52w\/video\/upload\/.+\/adelante-web-vista-previa_tbvxlp\.mp4$/)
    expect(s.mp4).not.toMatch(/q_auto/)
    expect(s.poster).toMatch(/f_jpg/)
  })

  it("móvil baja a 1080 de ancho; escritorio va sin re-codificar", () => {
    expect(FILM_VIDEO_SOURCES.mobile.mp4).toMatch(/w_1080/)
    expect(FILM_VIDEO_SOURCES.desktop.mp4).not.toMatch(/q_\d|w_\d/)
  })

  it("sin cifras inventadas en la copia", () => {
    for (const t of Object.values(FILM_VIDEO)) expect(t).not.toMatch(/\d+\s?%|\bx\d|\d{2,}/)
  })
})

import { http } from "@/core/services/http";
import type {
  IntakeSessionView,
  IntakeSkipReason,
  IntakeTurnResult,
  PatchAnswersResult,
} from "@/modules/intake/domain/intake";

/**
 * Adapter de la entrevista pública.
 *
 * **Todo va con `authenticate: false`**, y no es un detalle: quien abre este
 * enlace NO tiene sesión —ese es el punto entero de la función— así que las
 * peticiones salen directas al backend en vez de por el proxy BFF, que existe
 * para inyectar un Bearer que aquí no hay. Lo que autoriza es el token de la
 * ruta, que es el enlace mismo.
 */

const base = (token: string): string => `/public/intake/${encodeURIComponent(token)}`;

export const intakeService = {
  /**
   * Abrir el enlace: hilo, ficha y progreso en UNA petición.
   *
   * Una y no dos porque la pantalla necesita las dos mitades a la vez — la
   * conversación y la ficha son la misma verdad vista de dos maneras — y
   * pedirlas por separado dejaría media pantalla vacía en el primer render.
   */
  open(token: string, signal?: AbortSignal): Promise<IntakeSessionView> {
    return http.get<IntakeSessionView>(base(token), undefined, {
      authenticate: false,
      ...(signal === undefined ? {} : { signal }),
    });
  },

  message(token: string, message: string, voice: boolean): Promise<IntakeTurnResult> {
    return http.post<IntakeTurnResult>(
      `${base(token)}/messages`,
      { message, voice },
      { authenticate: false },
    );
  },

  /** Corregir la ficha sin pasar por el chat. No consume turno ni gasta IA. */
  patchAnswers(
    token: string,
    body: {
      answers?: { field_code: string; value: unknown }[];
      defer?: string[];
      resume?: string[];
      /** Saltar un dato con motivo, o reabrir uno saltado («sí aplica»). */
      skip?: { field_code: string; reason: IntakeSkipReason; note?: string | null }[];
      unskip?: string[];
    },
  ): Promise<PatchAnswersResult> {
    return http.patch<PatchAnswersResult>(`${base(token)}/answers`, body, {
      authenticate: false,
    });
  },

  /**
   * Dictado: audio → texto. Devuelve la transcripción SIN mandarla.
   *
   * Que no envíe directo es deliberado: whisper se equivoca, y mandar sin que
   * su autor lo lea convierte un error de transcripción en un dato mal guardado
   * del que nadie sabe el origen. Se pinta en el compositor y se corrige.
   */
  transcribe(token: string, audio: Blob): Promise<{ text: string }> {
    const form = new FormData();
    // El servidor decide por el content-type, pero el nombre no debe mentir:
    // Chrome y Android graban webm; Safari e iOS graban mp4.
    const ext = audio.type.includes("mp4") ? "m4a" : audio.type.includes("ogg") ? "ogg" : "webm";
    form.append("file", audio, `nota.${ext}`);
    return http.post<{ text: string }>(`${base(token)}/voice`, form, {
      authenticate: false,
    });
  },
};

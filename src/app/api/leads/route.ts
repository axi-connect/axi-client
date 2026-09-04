import { NextResponse, type NextRequest } from "next/server";
import { http } from "@/core/services/http";
import { isHttpError } from "@/core/api/problem";
import { DEMO_FORM_PUBLIC_KEY } from "@/modules/landing/domain/lead";

/**
 * POST /api/leads — envío del formulario de demo del sitio.
 *
 * Ruta intermedia y no llamada directa al API, por el mismo motivo que el
 * alta: el origen del backend no tiene por qué viajar al navegador, y la
 * dirección de quien envía la ve el servidor de Next sin depender de que un
 * proxy reenvíe cabeceras.
 *
 * La clave del formulario la pone el SERVIDOR y no el cuerpo de la petición.
 * Aceptarla del cliente convertiría esta ruta en un buzón universal: cualquiera
 * podría escribir contactos en el tenant de otro con solo cambiar un campo.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { code: "validation/failed", message: "Cuerpo de petición inválido" },
      { status: 400 },
    );
  }

  try {
    const created = await http.post<{ submission_id: string; contact_id: string | null }>(
      `/public/forms/${DEMO_FORM_PUBLIC_KEY}/submissions`,
      body,
      { authenticate: false },
    );
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (isHttpError(error)) {
      return NextResponse.json(
        { code: error.code, message: error.message, errors: error.validationIssues },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { code: "client/network", message: "No fue posible contactar al servidor" },
      { status: 503 },
    );
  }
}

import { bffProblem } from "@/shared/auth/bff-response";
import { NextResponse } from "next/server";
import { http } from "@/core/services/http";
import { isHttpError } from "@/core/api/problem";
import type { Schemas } from "@/core/api/types";

/**
 * GET /api/auth/sidebar — árbol de navegación filtrado por permisos.
 * Delegación directa de `GET /me/navigation`; devuelve el arreglo de ítems
 * (id, code, name, icon, path, sort_order, children[]) ya ordenables por
 * `sort_order`. Es solo metadata de UI: la autorización real la hace el backend.
 */
export async function GET() {
  try {
    const navigation = await http.get<Schemas["NavigationDto"]>("/me/navigation");
    return NextResponse.json(navigation.data);
  } catch (error) {
    const status = isHttpError(error) ? error.status : 500;
    return bffProblem(status, isHttpError(error) ? error.code : "client/network", "No fue posible cargar la navegación");
  }
}

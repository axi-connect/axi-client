"use client";

import { useEffect, useState } from "react";
import { platformRoleFromToken, type PlatformRole } from "../../domain/platform-role";
import { getPlatformToken } from "./token-storage";

/**
 * El rol del admin en sesión (claim del token en memoria). Se lee tras montar:
 * el token vive solo en el navegador. null = aún no se sabe o no hay rol.
 */
export function usePlatformRole(): PlatformRole | null {
  const [role, setRole] = useState<PlatformRole | null>(null);
  useEffect(() => {
    setRole(platformRoleFromToken(getPlatformToken()));
  }, []);
  return role;
}

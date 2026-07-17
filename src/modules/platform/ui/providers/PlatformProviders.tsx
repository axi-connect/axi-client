"use client";

/**
 * Providers raíz del panel de plataforma: QueryClient DEDICADO (no comparte
 * caché con el tenant) + sesión de super admin. Se montan en
 * `app/platform/layout.tsx` para cubrir también el login (el form usa
 * `usePlatformAuth`).
 */
import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createPlatformQueryClient } from "../../infrastructure/api/query-client";
import { PlatformAuthProvider } from "../../infrastructure/auth/platform-auth.context";

export function PlatformProviders({ children }: { children: React.ReactNode }) {
  // useState y no useMemo: garantiza UNA sola instancia por montaje (React
  // puede descartar renders con useMemo y duplicar la caché).
  const [queryClient] = useState(createPlatformQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <PlatformAuthProvider>{children}</PlatformAuthProvider>
    </QueryClientProvider>
  );
}

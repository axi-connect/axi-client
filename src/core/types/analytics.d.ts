/**
 * Tipos ambientes de los SDK de analítica. Los inyectan scripts externos
 * (`gtag.js` y `fbevents.js`), así que no hay módulo del que importarlos.
 *
 * Siempre opcionales: `PublicAnalytics` no monta nada fuera de producción ni
 * sin consentimiento, así que en la mayoría de los renders no existen.
 */
type GtagCommand = "js" | "config" | "event" | "consent" | "set";

type FbqMethod = "init" | "track" | "trackCustom" | "consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (command: GtagCommand, ...args: unknown[]) => void;
    fbq?: {
      (method: FbqMethod, ...args: unknown[]): void;
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
    };
    _fbq?: unknown;
  }
}

export {};

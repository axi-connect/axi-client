import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Shell de las páginas legales: medida de lectura acotada y navegación cruzada.
 *
 * Ancho `max-w-[720px]`: la medida de lectura cómoda para prosa larga son
 * 60–75 caracteres por línea. Las páginas de contenido del sitio usan 1200px,
 * pero aquí el objetivo es que el texto se lea, no que llene la pantalla.
 */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-6 pt-32 pb-20 sm:pt-40">
      {children}

      <nav
        aria-label="Documentos legales"
        className="border-border/60 mt-16 flex flex-wrap gap-x-6 gap-y-2 border-t pt-6 text-sm"
      >
        <Link href="/legal/terminos" className="text-muted-foreground hover:text-brand transition-colors">
          Términos y condiciones
        </Link>
        <Link href="/legal/privacidad" className="text-muted-foreground hover:text-brand transition-colors">
          Política de privacidad
        </Link>
        <Link href="/contacto" className="text-muted-foreground hover:text-brand transition-colors">
          Contacto
        </Link>
      </nav>
    </div>
  );
}

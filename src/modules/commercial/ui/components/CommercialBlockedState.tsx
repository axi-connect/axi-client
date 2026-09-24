"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { GlassGlyph } from "@/shared/components/ui/glyphs";

/**
 * Comercial no está en el plan del tenant (la capacidad es la del CRM: solo
 * lo ve un tenant sin CRM). Molde de `CmoBlockedState` sin personaje, y con
 * la misma regla: quitar la ansiedad primero —los agentes siguen vendiendo— y
 * después la salida. Sin códigos crudos: «403 entitlements/…» es del log, no
 * de la pantalla.
 */
export function CommercialBlockedState() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      <GlassGlyph kind="money" tier="md" />
      <h2 className="font-heading mt-5 text-xl font-bold">Comercial no está en tu plan</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Tus agentes siguen atendiendo y vendiendo. Activa Comercial para trazar la ruta del mes y que Axi te proponga cómo llegar.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/billing">
          Ver planes
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </Button>
    </div>
  );
}

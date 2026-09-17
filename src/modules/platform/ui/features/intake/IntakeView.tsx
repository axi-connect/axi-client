"use client";

/**
 * La consola de la puesta en marcha conversacional.
 *
 * **Dos apartados y no uno, porque son dos trabajos distintos:** los GUIONES
 * (qué se pregunta, con qué objetivo y tono — config sin deploy) y las
 * ENTREVISTAS (a quién se emitió, hasta dónde llegó, y aplicar lo recogido).
 *
 * Aquí NO se conversa. La conversación vive en un enlace público sin sesión,
 * porque si viviera dentro de un panel la barrera que vino a quitar seguiría
 * intacta: entrar, recordar la contraseña, encontrar la sección.
 */
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { IntakeSessionsPanel } from "./IntakeSessionsPanel";
import { IntakeBlueprintsPanel } from "./IntakeBlueprintsPanel";

export function IntakeView() {
  const [tab, setTab] = useState("sessions");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Puesta en marcha</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Entrevistas conversacionales para que un cliente deje su cuenta configurada sin recorrer
          las pestañas del panel. Se emite un enlace, se manda por WhatsApp, y lo recogido se
          aplica aquí tras revisarlo.
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="sessions">Entrevistas</TabsTrigger>
          <TabsTrigger value="blueprints">Guiones</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-5">
          <IntakeSessionsPanel />
        </TabsContent>
        <TabsContent value="blueprints" className="mt-5">
          <IntakeBlueprintsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe, Landmark, MapPin, Search, UsersRound } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { BrandLoader } from "@/shared/components/ui/brand-loader";
import { Button } from "@/shared/components/ui/button";
import { StatePill } from "@/shared/components/features/bento";
import {
  ProviderCard,
  ProviderCardGrid,
  type ProviderBrand,
} from "@/shared/components/features/provider-card";
import { ApolloKeyCard } from "./components/ApolloKeyCard";
import { CaptureHeader } from "./components/CaptureHeader";

import { CHANNEL_LABELS } from "../domain/lead";
import type { SearchSource, SourceCatalogItemDTO } from "../domain/search";
import { listSources } from "../infrastructure/services/prospecting-service.adapter";

const ICONS: Record<SearchSource, typeof MapPin> = {
  google_places: MapPin,
  openstreetmap: Globe,
  serp: Search,
  apollo_people: UsersRound,
  rues_open: Landmark,
};

/** El resplandor de cada fuente. Clases estáticas: Tailwind extrae en compilación. */
const BRANDS: Record<SearchSource, ProviderBrand> = {
  google_places: "maps",
  openstreetmap: "osm",
  serp: "serp",
  apollo_people: "neutral",
  rues_open: "neutral",
};

const SUBTITLES: Record<SearchSource, string> = {
  google_places: "Places API · con llave de Google Cloud",
  openstreetmap: "Mapa libre · sin llave",
  serp: "Serper · resultados de buscador",
  apollo_people: "Personas por cargo · con tu llave",
  rues_open: "Confecámaras · datos abiertos",
};

/**
 * Por qué una fuente no está disponible, dicho para el dueño del negocio.
 *
 * Antes la tarjeta decía «Tu plataforma todavía no encendió esta fuente» para
 * los cuatro motivos, y en el desplegable de búsqueda la fuente simplemente
 * desaparecía. El dueño veía «habilitado» en el panel y no la encontraba al
 * buscar, sin nada que uniera las dos cosas. El motivo lo calcula el backend
 * (`unavailable_reason`), que es quien de verdad lo sabe.
 */
const UNAVAILABLE_REASONS: Record<string, string> = {
  no_account: "Tu plataforma todavía no dio de alta esta fuente.",
  disabled: "Tu plataforma tiene esta fuente apagada.",
  unhealthy: "Esta fuente está dando problemas; tu plataforma ya lo sabe.",
  capped_day: "Esta fuente llegó a su tope de consultas de hoy. Vuelve mañana.",
  capped_month: "Esta fuente llegó a su tope del mes.",
  no_tenant_key: "Usa tu propia llave de Apollo: ponla abajo.",
  plan_without_api: "Tu plan de Apollo no incluye la API de personas.",
  out_of_credits: "Tu saldo de Apollo se agotó. Cuando recargues, en unas horas volvemos a intentarlo solos.",
};

/** Qué aporta cada fuente, dicho por lo que el dueño va a obtener. */
const PITCH: Record<SearchSource, string> = {
  google_places:
    "El catálogo más completo de Colombia: nombre, dirección y teléfono de casi cualquier negocio con puerta a la calle.",
  openstreetmap:
    "Mapa libre y gratuito. Trae menos negocios y casi nunca el correo, pero no gasta unidades de tu plan.",
  serp: "Resultados del buscador. Encuentra al que existe en la web sin estar en ningún mapa: agencias, mayoristas, servicios a domicilio.",
  apollo_people:
    "Quién decide, por cargo y por empresa. Buscar no gasta créditos; revelar el correo o el celular, sí, de tu saldo en Apollo.",
  rues_open:
    "El registro mercantil: negocios con matrícula activa por actividad y ciudad, su NIT y, si es persona natural, su dueño. Gratis; no trae teléfono.",
};

/**
 * De dónde traemos leads.
 *
 * Existe para responder una pregunta antes de gastar: **qué se puede hacer con
 * lo que traiga cada fuente.** Que un negocio sacado de un mapa no se pueda
 * tocar por WhatsApp se aprende aquí, no después de descubrir doscientos —y por
 * eso los canales permitidos están en la tarjeta y no en una nota al pie.
 */
export function SourcesView() {
  const [sources, setSources] = useState<SourceCatalogItemDTO[] | null>(null);
  /** No se pudo leer el catálogo: se dice con «Reintentar» en vez de enseñar una rejilla vacía. */
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    listSources()
      .then((catalog) => setSources(catalog.items))
      .catch((caught: unknown) => setLoadError(errorMessage(caught, "Revisa tu conexión e intenta otra vez.")));
  }, []);

  useEffect(() => load(), [load]);

  const header = (
    <CaptureHeader
      title="De dónde traemos leads"
      description="Las llaves las pone axi, salvo la de Apollo, que es tuya. Tú eliges la fuente y pagas por lo que uses."
    />
  );

  if (sources === null) {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        {header}
        {loadError === null ? (
          <BrandLoader />
        ) : (
          <div className="border-border bg-card flex flex-col items-start gap-3 rounded-3xl border p-6">
            <p className="font-heading text-xl font-bold tracking-tight">No pudimos cargar las fuentes</p>
            <p className="text-muted-foreground text-sm text-pretty">{loadError}</p>
            <Button variant="outline" className="rounded-full" onClick={load}>
              Reintentar
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {header}

      <ProviderCardGrid>
        {sources.map((source) => {
          const Icon = ICONS[source.source];
          const reason =
            source.unavailable_reason === null
              ? undefined
              : UNAVAILABLE_REASONS[source.unavailable_reason];
          return (
            <ProviderCard
              key={source.source}
              brand={BRANDS[source.source]}
              icon={<Icon aria-hidden="true" className="size-5.5" />}
              title={source.label}
              subtitle={SUBTITLES[source.source]}
              badge={
                <StatePill tone={source.available && source.free ? "success" : "neutral"}>
                  {source.available ? (source.free ? "Gratis" : "Consume unidades") : "No disponible"}
                </StatePill>
              }
              body={PITCH[source.source]}
              // Lo que hay que saber ANTES de descubrir doscientos, no después.
              // Sale de `allowedChannelsFor` en el backend, no de un texto a mano.
              chips={source.allowed_channels.map((channel) => CHANNEL_LABELS[channel])}
              /*
                Los dos, y el motivo primero. Con `??` la atribución de la ODbL
                tapaba el motivo justo en OpenStreetMap, que es la única fuente
                que la tiene: la única en la que el aviso no se podría leer.
              */
              footnote={[reason, source.attribution].filter(Boolean).join(" ") || undefined}
              /*
                ATENUAR SIGNIFICA «APAGADA», y nada más. La vitrina pasaba
                `inert` a las tres tarjetas —solo porque ninguna es clicable— y
                el resultado fue que OpenStreetMap, gratis y activa, se veía
                idéntica a una fuente que la plataforma no ha encendido. `static`
                es «solo informa»: misma superficie de marca, plena opacidad.
              */
              {...(source.available ? { static: true } : { inert: true })}
            />
          );
        })}
      </ProviderCardGrid>

      {/* La única llave que pone el negocio. Guardarla o quitarla cambia la tarjeta de Apollo: se recarga. */}
      <section aria-label="Tus llaves" className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <ApolloKeyCard onChanged={load} />
      </section>
    </div>
  );
}

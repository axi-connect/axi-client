"use client";

import { useEffect, useState } from "react";
import { Globe, MapPin, Search } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { BrandLoader } from "@/shared/components/ui/brand-loader";
import { Badge } from "@/shared/components/ui/badge";
import {
  ProviderCard,
  ProviderCardGrid,
  type ProviderBrand,
} from "@/shared/components/features/provider-card";
import { PageHeader } from "@/shared/components/layout/page-header";

import { CHANNEL_LABELS } from "../domain/lead";
import type { SearchSource, SourceCatalogItemDTO } from "../domain/search";
import { listSources } from "../infrastructure/services/prospecting-service.adapter";

const ICONS: Record<SearchSource, typeof MapPin> = {
  google_places: MapPin,
  openstreetmap: Globe,
  serp: Search,
};

/** El resplandor de cada fuente. Clases estáticas: Tailwind extrae en compilación. */
const BRANDS: Record<SearchSource, ProviderBrand> = {
  google_places: "maps",
  openstreetmap: "osm",
  serp: "serp",
};

const SUBTITLES: Record<SearchSource, string> = {
  google_places: "Places API · con llave de Google Cloud",
  openstreetmap: "Mapa libre · sin llave",
  serp: "Serper · resultados de buscador",
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
};

/** Qué aporta cada fuente, dicho por lo que el dueño va a obtener. */
const PITCH: Record<SearchSource, string> = {
  google_places:
    "El catálogo más completo de Colombia: nombre, dirección y teléfono de casi cualquier negocio con puerta a la calle.",
  openstreetmap:
    "Mapa libre y gratuito. Trae menos negocios y casi nunca el correo, pero no gasta unidades de tu plan.",
  serp: "Resultados del buscador. Encuentra al que existe en la web sin estar en ningún mapa: agencias, mayoristas, servicios a domicilio.",
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
  const { showAlert } = useAlert();
  const [sources, setSources] = useState<SourceCatalogItemDTO[] | null>(null);

  useEffect(() => {
    listSources()
      .then((catalog) => setSources(catalog.items))
      .catch((caught: unknown) => {
        showAlert({ tone: "error", title: errorMessage(caught) });
        setSources([]);
      });
  }, [showAlert]);

  if (sources === null) return <BrandLoader />;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="De dónde traemos leads"
        description="Las llaves las pone axi. Tú eliges la fuente y pagas por lo que uses, contra la cuota de tu plan."
      />

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
                <Badge variant="outline" className="shrink-0">
                  {source.available ? (source.free ? "Gratis" : "Consume unidades") : "No disponible"}
                </Badge>
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
    </div>
  );
}

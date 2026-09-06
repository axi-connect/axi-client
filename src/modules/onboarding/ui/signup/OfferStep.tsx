"use client";

import Link from "next/link";

import { formatAllowance } from "@/core/lib/commercial-units";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { MODULES, discountLabel, formatCop, planListCop, promotionOpen, volumeById, type PublicCatalog } from "@/modules/landing/public";
import {
  modulePrice,
  offerAxes,
  offerBlocker,
  packageBeatsModules,
  packagePlan,
  packagePriceCop,
  toggleModule,
  type OfferSelection,
  type PackageCode,
} from "@/modules/onboarding/domain/signup-draft";
import { FlowActions } from "@/modules/onboarding/ui/flow/FlowActions";
import { FlowTile } from "@/modules/onboarding/ui/flow/FlowTile";
import { MODULE_GRAPHICS, PACKAGE_GRAPHICS } from "@/modules/onboarding/ui/signup/graphics/OfferGraphics";

type OfferKind = "package" | "modules";

/** Una línea por paquete: lo que lo distingue del anterior, sin repetir el tagline. */
const PACKAGE_LINES: Record<PackageCode, string> = {
  free_trial: "Producto completo · después eliges tu plan",
  esencial: "El escalón de entrada",
  crecimiento: "Todo Esencial y más",
  escala: "Para varios equipos",
};

/**
 * Crecimiento va destacado y primero; Free Trial cierra la rejilla como salida
 * sin fricción y ocupa el mismo ancho que Crecimiento (decisión del dueño,
 * 2026-09-05: coherencia entre la primera y la última fila).
 */
const PACKAGE_ORDER: readonly PackageCode[] = ["crecimiento", "esencial", "escala", "free_trial"];
const FULL_WIDTH: ReadonlySet<PackageCode> = new Set(["crecimiento", "free_trial"]);

const TO_CONFIRM = "Precio a confirmar";

/**
 * Pantalla «Oferta» (mockup v3 «Flow»). Conmutador Paquete | Módulos
 * (`SegmentedControl`, un radiogroup) y debajo las fichas de cristal
 * (`FlowTile`: radio para paquetes, checkbox para módulos) con el gráfico de
 * capacidad que aprobó el dueño. El estado mixto es imposible por tipo;
 * cambiar de pestaña descarta lo otro.
 *
 * Las cifras salen del catálogo público que la página cargó en el servidor y
 * bajó por props (Tanda A3): aquí no se escribe ninguna. El precio del paquete
 * es el que ve hoy el visitante (promoción mientras siga abierta) y, tachado,
 * el de lista. Sin catálogo (API caído) la ficha dice «Precio a confirmar» y el
 * alta sigue: la prueba es gratis y el precio se cobra al terminar.
 */
export function OfferStep({
  selection,
  catalog,
  onChange,
  onNext,
}: {
  selection: OfferSelection | null;
  /** Catálogo público cargado por la página; `null` = precios «a confirmar». */
  catalog: PublicCatalog | null;
  onChange: (next: OfferSelection | null) => void;
  onNext: () => void;
}) {
  const kind: OfferKind = selection?.kind === "modules" ? "modules" : "package";
  const blocker = offerBlocker(selection);
  const suggestPackage = packageBeatsModules(selection, catalog);
  // El volumen es el eje que el visitante eligió en precios y viajó en la URL;
  // sin él, `offerAxes` resuelve el tramo por defecto del catálogo. Sin
  // catálogo no hay tramo que nombrar y la línea de conversaciones se omite.
  const { volume } = offerAxes(selection ?? { kind: "package", code: "esencial" }, catalog);
  const conversations = catalog && volume ? `${volumeById(catalog, volume).label} conversaciones` : null;
  const promotion = catalog && promotionOpen(catalog, new Date()) ? catalog.promotion : null;

  return (
    <div className="flex w-full flex-col items-center gap-2.5">
      <div className="flex w-full max-w-[700px] flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-between">
        <SegmentedControl<OfferKind>
          label="Tipo de oferta"
          value={kind}
          onValueChange={(next) => onChange(next === "package" ? null : { kind: "modules", codes: [] })}
          items={[
            { value: "package", label: "Paquete" },
            { value: "modules", label: "Módulos" },
          ]}
          surface="inline"
        />
        <p className="text-muted-foreground text-[13px]">
          {kind === "package" ? "El producto completo. Solo cambia cuántas conversaciones atiende." : "Solo la capacidad que te falta. Puedes elegir varias."}
        </p>
      </div>

      {kind === "package" ? (
        <div role="radiogroup" aria-label="Paquetes" className="grid w-full max-w-[700px] gap-2 sm:grid-cols-2">
          {PACKAGE_ORDER.map((code) => {
            const plan = packagePlan(code);
            const Graphic = PACKAGE_GRAPHICS[code];
            const paid = plan.group === "package";
            const list = paid && catalog ? planListCop(catalog, code, volume ?? catalog.defaultVolumeId) : null;
            const today = paid ? packagePriceCop(catalog, code, volume) : null;
            return (
              <FlowTile
                key={code}
                role="radio"
                testId={`offer-${code}`}
                checked={selection?.kind === "package" && selection.code === code}
                onClick={() => onChange({ kind: "package", code })}
                title={plan.name}
                badge={plan.badge ?? undefined}
                featured={plan.featured || FULL_WIDTH.has(code)}
                meta={
                  !paid ? (
                    "7 días gratis"
                  ) : today !== null ? (
                    <>
                      {formatCop(today)}
                      <small className="font-body text-muted-foreground ml-1.5 text-xs font-normal">COP/mes</small>
                    </>
                  ) : (
                    TO_CONFIRM
                  )
                }
                metaNote={
                  paid && promotion && list !== null && today !== null && list !== today ? (
                    <>
                      <s>{formatCop(list)}</s> lista · {discountLabel(promotion)} {promotion.name}
                    </>
                  ) : undefined
                }
                description={paid && conversations ? `${PACKAGE_LINES[code]} · ${conversations}` : PACKAGE_LINES[code]}
                graphic={<Graphic />}
              />
            );
          })}
        </div>
      ) : (
        <div role="group" aria-label="Módulos" className="grid w-full max-w-[700px] gap-2 sm:grid-cols-2">
          {MODULES.map((offer) => {
            const Graphic = MODULE_GRAPHICS[offer.id];
            const checked = selection?.kind === "modules" && selection.codes.includes(offer.id);
            const price = modulePrice(catalog, offer.id);
            return (
              <FlowTile
                key={offer.id}
                role="checkbox"
                testId={`offer-${offer.id}`}
                checked={checked}
                onClick={() => onChange(toggleModule(selection, offer.id))}
                title={offer.name}
                meta={
                  price !== null ? (
                    <>
                      {formatCop(price)}
                      <small className="font-body text-muted-foreground ml-1.5 text-xs font-normal">COP/mes</small>
                    </>
                  ) : (
                    TO_CONFIRM
                  )
                }
                description={`Tras la prueba · ${formatAllowance(offer.allowance)} al mes`}
                graphic={<Graphic />}
              />
            );
          })}
        </div>
      )}

      {suggestPackage ? (
        <p role="note" className="text-muted-foreground max-w-[700px] text-[13px] leading-relaxed">
          Con dos o más módulos, <strong className="text-foreground font-semibold">Crecimiento</strong> sale mejor y trae el producto completo.{" "}
          <Link href="/precios#planes" className="text-foreground font-semibold hover:underline">
            Comparar
          </Link>
        </p>
      ) : null}

      <FlowActions
        type="button"
        label="Continuar"
        onClick={onNext}
        disabled={blocker !== null}
        microcopy={blocker ?? "7 días gratis · sin tarjeta · si no sigues, tus datos quedan intactos"}
        className="mt-1"
      />
    </div>
  );
}

"use client";

import { SegmentedControl, type SegmentedItem } from "@/shared/components/ui/segmented";

/**
 * «Al menos N de M datos»: el rango 0..M como segmentado.
 *
 * Va sobre `SegmentedControl` y no sobre pastillas propias porque es
 * exactamente lo que ese componente resuelve —elegir entre pocas opciones
 * excluyentes, sin panel— y ya trae el `role="radiogroup"`, el tabindex móvil y
 * la navegación por flechas.
 *
 * Con `treatment="lift"`, que es una variante del MISMO componente y no una
 * copia: dentro de un panel de filtros «seleccionado» se dice con elevación y
 * no con relleno de color, y eso lo decidió el dueño mirando el mockup. La
 * alternativa era una 24ª implementación a mano del segmentado solo para
 * cambiarle el fondo.
 *
 * El 0 es «cualquiera» y **se serializa como ausencia**: `min_data=0` no es un
 * filtro, es ruido en la URL.
 */
export function CountSteps({
  label,
  max,
  value,
  noneLabel = "Cualquiera",
  onChange,
  className,
}: {
  label: string;
  max: number;
  value: number | undefined;
  noneLabel?: string;
  onChange: (next: number | undefined) => void;
  className?: string;
}) {
  const items: SegmentedItem<string>[] = [
    { value: "0", label: noneLabel },
    ...Array.from({ length: max }, (_, index) => ({
      value: String(index + 1),
      label: String(index + 1),
    })),
  ];

  return (
    <SegmentedControl
      label={label}
      size="sm"
      surface="inline"
      treatment="lift"
      items={items}
      className={className}
      value={String(value ?? 0)}
      onValueChange={(next) => {
        const parsed = Number(next);
        onChange(parsed > 0 ? parsed : undefined);
      }}
    />
  );
}

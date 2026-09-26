import { render, screen } from "@testing-library/react";

import type { ProductVariantDTO } from "@/modules/catalog/domain/product";
import {
  DepartureCalendar,
  departureLabel,
  departuresOf,
} from "@/modules/catalog/ui/components/DepartureCalendar";

const variant = (
  id: string,
  service_date: string | null,
  on_hand: number | null,
): ProductVariantDTO =>
  ({
    id,
    sku: id,
    name: null,
    attributes: {},
    price_cents: 350000,
    service_date,
    is_default: false,
    is_active: true,
    position: 0,
    stock:
      on_hand === null
        ? null
        : { on_hand, out_of_stock_threshold: 0, available: on_hand > 0 },
  }) as unknown as ProductVariantDTO;

// vie 25 sep 2026 a las 23:30 locales: en UTC ya sería el 26 y el 25 contaría como pasado
const NOW = new Date(2026, 8, 25, 23, 30);

describe("DepartureCalendar (premium P2: las salidas son variantes con fecha)", () => {
  it("departureLabel dice la fecha en voz alta, con el día de la semana correcto", () => {
    expect(departureLabel("2026-11-14")).toBe("sáb 14 nov");
    expect(departureLabel("2026-09-25")).toBe("vie 25 sep");
  });

  it("ordena por fecha, ignora variantes sin fecha y separa lo que ya salió en el día LOCAL", () => {
    const list = departuresOf(
      [
        variant("c", "2026-12-12", 9),
        variant("x", null, 3),
        variant("a", "2026-09-19", 1),
        variant("b", "2026-09-25", 4),
      ],
      NOW,
    );
    expect(list.map((d) => d.id)).toEqual(["a", "b", "c"]);
    expect(list.map((d) => d.past)).toEqual([true, false, false]);
  });

  it("cada nodo dice sus cupos: llena, uno, varios o sin inventario; sin salidas no se pinta", () => {
    const { rerender } = render(
      <DepartureCalendar
        now={NOW}
        variants={[
          variant("a", "2026-10-17", 0),
          variant("b", "2026-11-14", 1),
          variant("c", "2026-12-12", 9),
          variant("d", "2027-01-09", null),
        ]}
      />,
    );
    expect(screen.getByText("llena")).toBeInTheDocument();
    expect(screen.getByText("1 cupo")).toBeInTheDocument();
    expect(screen.getByText("9 cupos")).toBeInTheDocument();
    expect(screen.getByText("sin inventario")).toBeInTheDocument();
    rerender(
      <DepartureCalendar now={NOW} variants={[variant("x", null, 3)]} />,
    );
    expect(
      screen.queryByRole("region", { name: "Calendario de salidas" }),
    ).toBeNull();
  });
});

describe("departuresOf · la misma regla de cupos que la tabla (auditoría P1–P5, B8)", () => {
  const variant = (stock: unknown) =>
    ({
      id: "v",
      service_date: "2099-11-14",
      attributes: {},
      stock,
    }) as unknown as Parameters<typeof departuresOf>[0][number];

  it("agotada por su umbral es «llena» aunque queden unidades; disponible dice sus cupos", () => {
    expect(
      departuresOf([
        variant({ on_hand: 2, out_of_stock_threshold: 2, available: false }),
      ])[0]!.seatsLeft,
    ).toBe(0);
    expect(
      departuresOf([
        variant({ on_hand: 2, out_of_stock_threshold: 0, available: true }),
      ])[0]!.seatsLeft,
    ).toBe(2);
  });

  it("un servicio no lleva cupos", () => {
    expect(
      departuresOf(
        [variant({ on_hand: 5, out_of_stock_threshold: 0, available: true })],
        new Date(),
        true,
      )[0]!.seatsLeft,
    ).toBeNull();
  });
});

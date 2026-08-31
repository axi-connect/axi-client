import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Instagram, Mail } from "lucide-react";

import { FilterPanel } from "@/shared/components/features/filter-panel";
import type { FilterSchema, FilterValues } from "@/shared/components/features/filter-panel";

/**
 * Lo que blindan estos tests es el contrato BORRADOR-CONTRA-APLICADO y la
 * SEMÁNTICA de los controles, que son las dos cosas que un panel de filtros
 * hace mal por defecto:
 *
 * - Aplicar al tocar significa una consulta por clic y una lista que salta bajo
 *   el dedo; aquí nada viaja hasta «Ver N», y cerrar sin aplicar descarta.
 * - Un conmutador no excluyente pintado como `role="radio"` promete que elegir
 *   uno apaga los otros. Los tests lo asertan en negativo, que es la única
 *   forma de que no vuelva.
 *
 * El `DetailSheet` real usa portal + framer-motion + un retardo de 50 ms antes
 * de montar el contenido; se reemplaza por su esqueleto —cabecera, cuerpo, pie
 * y un cierre— porque lo que se prueba aquí es el panel, no la hoja (que tiene
 * su propia suite). El pie del mock se pinta igual que el real: si `renderFooter`
 * dejara de invocarse, estos tests se caen.
 */
jest.mock("@/shared/components/features/detail-sheet", () => ({
  DetailSheet: ({
    open,
    title,
    children,
    renderFooter,
    onOpenChange,
  }: {
    open: boolean;
    title?: React.ReactNode;
    children?: React.ReactNode;
    renderFooter?: () => React.ReactNode;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div role="dialog" aria-label={typeof title === "string" ? title : "Filtros"}>
        <button type="button" aria-label="Cerrar" onClick={() => onOpenChange(false)} />
        <div>{children}</div>
        <div>{renderFooter ? renderFooter() : null}</div>
      </div>
    ) : null,
}));

const SCHEMA: FilterSchema = {
  sections: [{ id: "datos", title: "Datos del lead" }],
  filters: [
    {
      kind: "multi",
      key: "status",
      label: "Estado",
      options: [
        { value: "new", label: "Nuevo" },
        { value: "contacted", label: "Contactado" },
      ],
    },
    {
      kind: "multi",
      key: "source",
      label: "Procedencia",
      layout: "cards",
      options: [
        { value: "openstreetmap", label: "Mapa", icon: Instagram, hint: "OpenStreetMap" },
        { value: "ctwa", label: "Anuncio", icon: Mail },
      ],
    },
    {
      kind: "single",
      key: "quality_status",
      label: "Calidad",
      layout: "cards",
      options: [
        { value: "good", label: "Bueno" },
        { value: "poor", label: "Flojo" },
      ],
    },
    {
      kind: "flags",
      key: "require",
      label: "Datos exigidos",
      section: "datos",
      modeKey: "require_mode",
      options: [
        { value: "instagram", label: "Instagram", icon: Instagram },
        { value: "email", label: "Correo", icon: Mail },
      ],
    },
    {
      kind: "steps",
      key: "min_score",
      label: "Calidad mínima",
      section: "datos",
      options: [
        { value: null, label: "Cualquiera" },
        { value: 60, label: "60 o más · bueno" },
      ],
    },
    { kind: "count", key: "min_data", label: "Datos completos", section: "datos", max: 5 },
    {
      kind: "switch",
      key: "verified_only",
      label: "Solo verificados",
      description: "Descarta los que no pasaron verificación.",
      caution: (value) => (value === true ? "Deja fuera a la mayoría de los leads de mapa." : null),
    },
    { kind: "text", key: "city", label: "Ciudad", placeholder: "Bogotá" },
  ],
};

function Harness({
  onApply,
  applied = {},
  resultCount,
}: {
  onApply: (values: FilterValues) => void;
  applied?: FilterValues;
  resultCount?: number | null;
}) {
  const [open, setOpen] = React.useState(true);
  const [value, setValue] = React.useState<FilterValues>(applied);

  return (
    <React.Fragment>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      <FilterPanel
        open={open}
        onOpenChange={setOpen}
        schema={SCHEMA}
        value={value}
        resultCount={resultCount}
        countNoun={{ one: "lead", many: "leads" }}
        onApply={(next) => {
          setValue(next);
          onApply(next);
        }}
      />
    </React.Fragment>
  );
}

const pill = (name: string) => screen.getByRole("button", { name: new RegExp(name) });

describe("FilterPanel", () => {
  it("no aplica nada hasta pulsar «Ver N»", () => {
    const onApply = jest.fn();
    render(<Harness onApply={onApply} resultCount={41} />);

    fireEvent.click(pill("Nuevo"));
    fireEvent.click(screen.getByRole("button", { name: "Contactado" }));
    // El fallo que evita: una consulta por clic y la lista saltando bajo el dedo.
    expect(onApply).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Ver 41 leads" }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({ status: ["new", "contacted"] });
  });

  it("cerrar sin aplicar descarta el borrador", () => {
    const onApply = jest.fn();
    render(<Harness onApply={onApply} resultCount={41} />);

    fireEvent.click(pill("Nuevo"));
    expect(screen.getByRole("button", { name: /Nuevo/ })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onApply).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
    // Se vuelve a sembrar de `value`, que sigue vacío.
    expect(screen.getByRole("button", { name: /Nuevo/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("reabrir siembra el borrador de lo YA aplicado", () => {
    const onApply = jest.fn();
    render(<Harness onApply={onApply} resultCount={41} applied={{ status: ["contacted"] }} />);

    expect(screen.getByRole("button", { name: /Contactado/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("«Limpiar» vacía el borrador pero no aplica por su cuenta", () => {
    const onApply = jest.fn();
    render(<Harness onApply={onApply} resultCount={41} applied={{ status: ["new"], city: "Cali" }} />);

    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));

    expect(screen.getByRole("button", { name: /Nuevo/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("textbox", { name: "Ciudad" })).toHaveValue("");
    expect(onApply).not.toHaveBeenCalled();
  });

  it("«Limpiar» está deshabilitado cuando no hay nada que limpiar", () => {
    render(<Harness onApply={jest.fn()} resultCount={0} />);

    expect(screen.getByRole("button", { name: "Limpiar" })).toBeDisabled();
  });

  it("el botón dice el número, y «Ver resultados» cuando no lo hay", () => {
    const { unmount } = render(<Harness onApply={jest.fn()} resultCount={41} />);
    expect(screen.getByRole("button", { name: "Ver 41 leads" })).toBeInTheDocument();
    unmount();

    render(<Harness onApply={jest.fn()} resultCount={1} />);
    expect(screen.getByRole("button", { name: "Ver 1 lead" })).toBeInTheDocument();
  });

  it("con la cuenta en vuelo el botón dice «Ver resultados» y SIGUE habilitado", () => {
    render(<Harness onApply={jest.fn()} resultCount={null} />);

    const apply = screen.getByRole("button", { name: "Ver resultados" });
    expect(apply).toBeInTheDocument();
    // Deshabilitarlo por un conteo de fondo hace que la pantalla parezca rota.
    expect(apply).toBeEnabled();
  });

  it("sin conteo declarado el botón dice «Aplicar filtros»", () => {
    render(<Harness onApply={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Aplicar filtros" })).toBeInTheDocument();
  });

  it("las pastillas multivalor son aria-pressed y NO radios", () => {
    render(<Harness onApply={jest.fn()} resultCount={41} />);

    const group = screen.getByRole("group", { name: "Estado" });
    const options = within(group).getAllByRole("button");

    expect(options).toHaveLength(2);
    options.forEach((option) => expect(option).toHaveAttribute("aria-pressed", "false"));
    // El fallo que evita: `role="radio"` prometería que elegir uno apaga el otro.
    expect(within(group).queryAllByRole("radio")).toHaveLength(0);
  });

  it("las tarjetas exclusivas son un radiogroup con una sola parada de tabulación", () => {
    render(<Harness onApply={jest.fn()} resultCount={41} />);

    const group = screen.getByRole("radiogroup", { name: "Calidad" });
    const radios = within(group).getAllByRole("radio");

    expect(radios).toHaveLength(2);
    expect(radios[0]).toHaveAttribute("tabindex", "0");
    expect(radios[1]).toHaveAttribute("tabindex", "-1");

    fireEvent.click(radios[1]);
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
    expect(radios[0]).toHaveAttribute("aria-checked", "false");
    expect(radios[1]).toHaveAttribute("tabindex", "0");
    expect(radios[0]).toHaveAttribute("tabindex", "-1");
  });

  it("las tarjetas multivalor siguen siendo aria-pressed, no radios", () => {
    render(<Harness onApply={jest.fn()} resultCount={41} />);

    const group = screen.getByRole("group", { name: "Procedencia" });

    expect(within(group).getAllByRole("button")[0]).toHaveAttribute("aria-pressed", "false");
    expect(within(group).queryAllByRole("radio")).toHaveLength(0);
  });

  it("el conmutador todos/alguno es un radiogroup y `all` se guarda como ausencia", () => {
    const onApply = jest.fn();
    render(<Harness onApply={onApply} resultCount={41} />);

    fireEvent.click(screen.getByRole("button", { name: /Instagram/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Al menos uno" }));
    fireEvent.click(screen.getByRole("button", { name: "Ver 41 leads" }));

    expect(onApply).toHaveBeenCalledWith({ require: ["instagram"], require_mode: "any" });
  });

  it("el interruptor viaja solo cuando está encendido, y su aviso aparece al elegir", () => {
    const onApply = jest.fn();
    render(<Harness onApply={onApply} resultCount={41} />);

    expect(screen.queryByText(/Deja fuera a la mayoría/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: "Solo verificados" }));
    expect(screen.getByText(/Deja fuera a la mayoría/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ver 41 leads" }));
    expect(onApply).toHaveBeenCalledWith({ verified_only: true });
  });

  it("pinta las secciones declaradas y deja lo suelto fuera de ellas", () => {
    render(<Harness onApply={jest.fn()} resultCount={41} />);

    expect(screen.getByRole("heading", { name: "Datos del lead" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Datos exigidos" })).toBeInTheDocument();
  });
});

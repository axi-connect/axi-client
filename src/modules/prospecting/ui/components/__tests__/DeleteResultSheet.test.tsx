import { render, screen } from "@testing-library/react";

import {
  DeleteResultSheet,
  needsDeleteSheet,
  type DeleteOutcome,
} from "../DeleteResultSheet";

// El panel real portaliza, anima y retrasa el contenido; el molde de la casa es
// simularlo y afirmar el CONTENIDO, que es lo que aquí se está probando.
jest.mock("@/shared/components/features/detail-sheet/DetailSheet", () => ({
  __esModule: true,
  default: ({
    open,
    title,
    subtitle,
    children,
    renderFooter,
  }: {
    open: boolean;
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    children?: React.ReactNode;
    renderFooter?: () => React.ReactNode;
  }) =>
    open ? (
      <div role="dialog">
        <h2>{title}</h2>
        <p>{subtitle}</p>
        {children}
        {renderFooter?.()}
      </div>
    ) : null,
}));

/**
 * Lo que blindan estos tests es que el informe **se pueda leer sin contar
 * filas**, y que el panel no se convierta en un trámite.
 *
 * El resultado de un borrado en lote no es un sí o un no: unos se van, otros
 * sobreviven por ser ya contactos del CRM, y otros ya no estaban cuando
 * llegamos. Si el dueño se entera de eso contando filas, el diseño falló.
 */

const CLEAN: DeleteOutcome = { asked: 3, deleted: 3, kept: [], missing: 0 };
const MESSY: DeleteOutcome = {
  asked: 184,
  deleted: 179,
  kept: [
    { name: "Kokoa & Co", reason: "Ya es un contacto del CRM" },
    { name: "Café Luz", reason: "Ya es un contacto del CRM" },
    { name: "Bar Once", reason: "Ya es un contacto del CRM" },
  ],
  missing: 2,
};

const NOUN = { one: "lead", many: "leads" };

describe("needsDeleteSheet — el panel solo si hay algo que explicar", () => {
  it("con todo limpio NO merece abrirse", () => {
    // Un panel obligatorio tras borrar tres filas sin novedad se aprende a
    // cerrar sin leer, y entonces no se lee el que sí importa.
    expect(needsDeleteSheet(CLEAN)).toBe(false);
  });

  it("con alguno que se quedó, sí", () => {
    expect(needsDeleteSheet({ ...CLEAN, kept: MESSY.kept })).toBe(true);
  });

  it("con alguno que ya no estaba, también", () => {
    // `missing` solo también merece explicación: el dueño pidió 3 y se
    // borraron 2, y sin decirlo parece que algo falló.
    expect(needsDeleteSheet({ ...CLEAN, deleted: 2, missing: 1 })).toBe(true);
  });
});

describe("DeleteResultSheet", () => {
  it("la cuenta se lee «N de M», y M es lo que se pidió", () => {
    // El backend garantiza `deleted + kept + missing = asked`: 179 + 3 + 2 = 184.
    render(
      <DeleteResultSheet open onOpenChange={() => undefined} outcome={MESSY} noun={NOUN} />,
    );
    expect(screen.getByText("179")).toBeInTheDocument();
    expect(screen.getByText(/leads eliminados de/)).toBeInTheDocument();
    expect(screen.getByText("184")).toBeInTheDocument();
  });

  it("lista a los que se quedaron CON su motivo, no solo el nombre", () => {
    render(
      <DeleteResultSheet open onOpenChange={() => undefined} outcome={MESSY} noun={NOUN} />,
    );
    expect(screen.getByText("Se quedaron (3)")).toBeInTheDocument();
    expect(screen.getByText("Kokoa & Co")).toBeInTheDocument();
    expect(screen.getAllByText("Ya es un contacto del CRM")).toHaveLength(3);
  });

  it("los ausentes se cuentan y se EXPLICAN, sin dar ids", () => {
    // `missing` es un número a propósito: tras un borrado masivo no se puede
    // saber cuál de los ausentes lo borramos nosotros, y dar ids sería
    // inventarse el detalle.
    render(
      <DeleteResultSheet open onOpenChange={() => undefined} outcome={MESSY} noun={NOUN} />,
    );
    expect(screen.getByText(/ya no existían cuando llegamos/)).toBeInTheDocument();
    expect(screen.getByText(/la puerta de admisión/)).toBeInTheDocument();
  });

  it("sin ausentes no inventa la línea", () => {
    render(
      <DeleteResultSheet
        open
        onOpenChange={() => undefined}
        outcome={{ ...MESSY, missing: 0 }}
        noun={NOUN}
      />,
    );
    expect(screen.queryByText(/ya no existían/)).toBeNull();
  });

  it("con uno solo, habla en singular", () => {
    render(
      <DeleteResultSheet
        open
        onOpenChange={() => undefined}
        outcome={{ asked: 2, deleted: 1, kept: [], missing: 1 }}
        noun={NOUN}
      />,
    );
    expect(screen.getByText(/lead eliminados de/)).toBeInTheDocument();
    expect(screen.getByText(/ya no existía cuando llegamos/)).toBeInTheDocument();
  });

  it("cerrado no pinta nada", () => {
    render(
      <DeleteResultSheet
        open={false}
        onOpenChange={() => undefined}
        outcome={MESSY}
        noun={NOUN}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

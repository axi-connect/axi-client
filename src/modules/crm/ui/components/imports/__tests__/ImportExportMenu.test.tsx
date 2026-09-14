import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ImportExportMenu } from "../ImportExportMenu";

const handlers = () => ({
  onDownloadTemplate: jest.fn(),
  onImport: jest.fn(),
  onExport: jest.fn(),
});

afterEach(cleanup);

function open() {
  fireEvent.click(screen.getByRole("button", { name: /importar \/ exportar/i }));
}

describe("ImportExportMenu (botón agrupado de la cabecera de Contactos)", () => {
  it("con import y export muestra las tres opciones, en orden, con el separador antes de Exportar", () => {
    render(<ImportExportMenu canImport canExport {...handlers()} />);
    open();
    const items = screen.getAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Descargar plantillaExcel con las columnas esperadas",
      "Importar contactosCSV o XLSX · hasta 10 MB",
      "Exportar contactosCSV con los filtros activos · queda auditado",
    ]);
    expect(screen.getByRole("menu").querySelectorAll(".bg-border")).toHaveLength(1);
  });

  it("solo export: un ítem y sin separador; solo import: dos ítems", () => {
    render(<ImportExportMenu canImport={false} canExport {...handlers()} />);
    open();
    expect(screen.getAllByRole("menuitem")).toHaveLength(1);
    expect(screen.getByRole("menu").querySelectorAll(".bg-border")).toHaveLength(0);
    cleanup();

    render(<ImportExportMenu canImport canExport={false} {...handlers()} />);
    open();
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      expect.stringContaining("Descargar plantilla"),
      expect.stringContaining("Importar contactos"),
    ]);
  });

  it("sin ninguno de los dos permisos no renderiza el botón", () => {
    const { container } = render(
      <ImportExportMenu canImport={false} canExport={false} {...handlers()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("cada ítem dispara su handler y cierra el menú", () => {
    const h = handlers();
    render(<ImportExportMenu canImport canExport {...h} />);

    open();
    fireEvent.click(screen.getByRole("menuitem", { name: /descargar plantilla/i }));
    expect(h.onDownloadTemplate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();

    open();
    fireEvent.click(screen.getByRole("menuitem", { name: /importar contactos/i }));
    expect(h.onImport).toHaveBeenCalledTimes(1);

    open();
    fireEvent.click(screen.getByRole("menuitem", { name: /exportar contactos/i }));
    expect(h.onExport).toHaveBeenCalledTimes(1);
  });
});

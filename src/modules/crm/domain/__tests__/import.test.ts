import {
  CONTACT_IMPORT_COLUMNS,
  IMPORT_ACCEPT_ATTRIBUTE,
  formatFileSize,
  validateImportFile,
} from "../import";

describe("domain/import", () => {
  it("validateImportFile: solo .csv/.xlsx, no vacío, ≤10 MB, con el motivo en español", () => {
    expect(validateImportFile({ name: "leads.xlsx", size: 48_000 })).toBeNull();
    expect(validateImportFile({ name: "LEADS.CSV", size: 10 })).toBeNull();
    expect(validateImportFile({ name: "presupuesto.pdf", size: 10 })).toMatch(/CSV o XLSX/);
    expect(validateImportFile({ name: "sin-extension", size: 10 })).toMatch(/CSV o XLSX/);
    expect(validateImportFile({ name: "vacio.csv", size: 0 })).toBe("El archivo está vacío.");
    expect(validateImportFile({ name: "grande.xlsx", size: 10 * 1024 * 1024 + 1 })).toMatch(
      /10 MB/,
    );
  });

  it("el atributo accept lleva extensiones y MIME de ambos formatos", () => {
    expect(IMPORT_ACCEPT_ATTRIBUTE).toContain(".csv");
    expect(IMPORT_ACCEPT_ATTRIBUTE).toContain(".xlsx");
    expect(IMPORT_ACCEPT_ATTRIBUTE).toContain("text/csv");
  });

  it("las 7 columnas de la guía coinciden con la plantilla del backend, en orden", () => {
    expect(CONTACT_IMPORT_COLUMNS.map((column) => column.header)).toEqual([
      "nombre",
      "apellido",
      "telefono",
      "correo",
      "ciudad",
      "direccion",
      "etapa",
    ]);
    expect(CONTACT_IMPORT_COLUMNS.filter((column) => column.requirement === "one_of")).toHaveLength(2);
  });

  it("formatFileSize en es-CO", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(48 * 1024)).toBe("48 KB");
    expect(formatFileSize(1.25 * 1024 * 1024)).toBe("1,3 MB");
  });
});

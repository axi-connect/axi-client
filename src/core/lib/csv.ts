/**
 * Export CSV client-side (F11). BOM UTF-8 para que Excel respete acentos;
 * separador coma con escaping RFC 4180.
 */
export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

function escapeCell(raw: string | number | null | undefined): string {
  const value = raw === null || raw === undefined ? "" : String(raw);
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((column) => escapeCell(column.header)).join(",");
  const lines = rows.map((row) =>
    columns.map((column) => escapeCell(column.value(row))).join(","),
  );
  const BOM = "\uFEFF";
  return `${BOM}${[header, ...lines].join("\n")}\n`;
}

/** Dispara la descarga del CSV en el navegador. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

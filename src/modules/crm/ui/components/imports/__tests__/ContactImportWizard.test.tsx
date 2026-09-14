import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ImportJobDTO } from "@/modules/crm/domain/import";
import { ContactImportWizard } from "../ContactImportWizard";

const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}));
jest.mock("@/core/realtime/use-socket", () => ({
  useSocket: () => ({ socket: null }),
  useSocketEvent: jest.fn(),
}));
jest.mock("@/core/lib/download", () => ({ triggerDownload: jest.fn() }));
jest.mock("@/modules/crm/infrastructure/import-guide.storage", () => ({
  readImportGuideSeen: jest.fn(),
  writeImportGuideSeen: jest.fn(),
}));
jest.mock("@/modules/crm/infrastructure/services/imports-service.adapter", () => ({
  createImport: jest.fn(),
  getImport: jest.fn(),
  importTemplateUrl: () => "/api/proxy/crm/imports/template",
}));
jest.mock("@/modules/crm/infrastructure/services/segments-service.adapter", () => ({
  listTags: jest.fn().mockResolvedValue([]),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const storage = require("@/modules/crm/infrastructure/import-guide.storage") as {
  readImportGuideSeen: jest.Mock;
  writeImportGuideSeen: jest.Mock;
};
const api = require("@/modules/crm/infrastructure/services/imports-service.adapter") as {
  createImport: jest.Mock;
  getImport: jest.Mock;
};
const download = require("@/core/lib/download") as { triggerDownload: jest.Mock };
/* eslint-enable @typescript-eslint/no-require-imports */

function job(over: Partial<ImportJobDTO> = {}): ImportJobDTO {
  return {
    id: "job-1",
    status: "pending",
    filename: "leads.xlsx",
    options: {},
    total_rows: null,
    created_count: 0,
    updated_count: 0,
    skipped_count: 0,
    error_count: 0,
    errors: [],
    created_by_user_id: null,
    started_at: null,
    finished_at: null,
    created_at: "2026-09-14T12:00:00.000Z",
    ...over,
  } as ImportJobDTO;
}

function chooseFile(name: string, size = 100) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([new Uint8Array(size)], name);
  fireEvent.change(input, { target: { files: [file] } });
}

beforeEach(() => {
  jest.clearAllMocks();
  storage.readImportGuideSeen.mockReturnValue(false);
});
afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

describe("ContactImportWizard", () => {
  it("modal, primera vez: arranca en la guía; «Entendido» + casilla guarda la preferencia y pasa al archivo", async () => {
    const onStepChange = jest.fn();
    render(<ContactImportWizard variant="modal" onStepChange={onStepChange} />);
    await screen.findByText(/Guía de carga/i);
    expect(onStepChange).toHaveBeenLastCalledWith("guide");

    fireEvent.click(screen.getByLabelText(/no volver a mostrar/i));
    fireEvent.click(screen.getByRole("button", { name: /entendido/i }));
    expect(storage.writeImportGuideSeen).toHaveBeenCalledWith(true);
    expect(onStepChange).toHaveBeenLastCalledWith("upload");
    expect(screen.getByText(/Arrastra tu CSV o XLSX/)).toBeInTheDocument();
  });

  it("guía ya descartada: arranca en el archivo; «Ver estructura» abre la guía con «Volver»", async () => {
    storage.readImportGuideSeen.mockReturnValue(true);
    render(<ContactImportWizard variant="modal" onClose={jest.fn()} />);
    await screen.findByText(/Arrastra tu CSV o XLSX/);

    fireEvent.click(screen.getByRole("button", { name: /ver estructura del archivo/i }));
    expect(screen.queryByLabelText(/no volver a mostrar/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(screen.getByText(/Arrastra tu CSV o XLSX/)).toBeInTheDocument();
  });

  it("«Ahora no» en la guía inicial cierra; «Descargar plantilla» dispara la descarga", async () => {
    const onClose = jest.fn();
    render(<ContactImportWizard variant="modal" onClose={onClose} />);
    await screen.findByText(/Guía de carga/i);
    fireEvent.click(screen.getByRole("button", { name: /descargar plantilla/i }));
    expect(download.triggerDownload).toHaveBeenCalledWith("/api/proxy/crm/imports/template");
    fireEvent.click(screen.getByRole("button", { name: /ahora no/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("rechaza un PDF con aviso y marca el dropzone; acepta un XLSX y habilita «Importar contactos»", async () => {
    render(<ContactImportWizard variant="embedded" />);
    await screen.findByText(/Arrastra tu CSV o XLSX/);
    const submit = screen.getByRole("button", { name: /importar contactos/i });
    expect(submit).toBeDisabled();

    chooseFile("presupuesto.pdf");
    expect(showAlert).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "error", description: expect.stringContaining("CSV o XLSX") }),
    );
    expect(screen.getByRole("alert").textContent).toMatch(/CSV o XLSX/);
    expect(submit).toBeDisabled();

    chooseFile("leads.xlsx", 48 * 1024);
    expect(screen.getByText("leads.xlsx")).toBeInTheDocument();
    expect(screen.getByText(/XLSX · 48 KB/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /importar contactos/i })).toBeEnabled();
  });

  it("sube, muestra el progreso, sigue el job por polling hasta el reporte y «Ver contactos» refresca la lista", async () => {
    jest.useFakeTimers();
    const onClose = jest.fn();
    const onJobDone = jest.fn();
    const refresh = jest.fn();
    window.addEventListener("crm:contacts:save:success", refresh);
    storage.readImportGuideSeen.mockReturnValue(true);
    api.createImport.mockResolvedValue(job());
    api.getImport.mockResolvedValue(
      job({
        status: "completed",
        total_rows: 3,
        created_count: 2,
        error_count: 1,
        errors: [{ row: 4, field: "etapa", message: "Etapa desconocida" }],
      }),
    );

    render(<ContactImportWizard variant="modal" onClose={onClose} onJobDone={onJobDone} />);
    await screen.findByText(/Arrastra tu CSV o XLSX/);
    chooseFile("leads.xlsx");
    fireEvent.click(screen.getByRole("button", { name: /importar contactos/i }));

    await screen.findByRole("progressbar");
    expect(api.createImport).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({ on_duplicate: "skip", tag_ids: [] }),
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(2100);
    });
    await waitFor(() => expect(screen.getByText("Completado")).toBeInTheDocument());
    expect(screen.getByText("Creados").previousSibling?.textContent).toBe("2");
    expect(screen.getByText("Etapa desconocida")).toBeInTheDocument();
    expect(onJobDone).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /ver contactos/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    window.removeEventListener("crm:contacts:save:success", refresh);
  });
});

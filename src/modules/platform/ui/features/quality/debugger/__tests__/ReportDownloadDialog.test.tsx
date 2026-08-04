import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReportDownloadDialog } from "../ReportDownloadDialog";
import { downloadConversationReport } from "../../../../../infrastructure/api/quality-report";

jest.mock("../../../../../infrastructure/api/quality-report", () => ({
  downloadConversationReport: jest.fn(async () => undefined),
}));

const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert }),
}));

const mockedDownload = downloadConversationReport as jest.MockedFunction<
  typeof downloadConversationReport
>;

describe("ReportDownloadDialog", () => {
  beforeEach(() => jest.clearAllMocks());

  function renderDialog() {
    return render(
      <ReportDownloadDialog
        open
        onOpenChange={jest.fn()}
        target={{ companyId: "t-1", conversationId: "conv-1" }}
      />,
    );
  }

  it("muestra SIEMPRE la advertencia de PII/propiedad intelectual y la auditoría", () => {
    renderDialog();
    expect(screen.getByText(/datos personales del cliente/)).toBeInTheDocument();
    expect(screen.getByText(/propiedad intelectual del tenant/)).toBeInTheDocument();
    expect(screen.getByText(/queda registrado en la auditoría/)).toBeInTheDocument();
  });

  it("descarga en md por defecto, sin apéndice crudo", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /Descargar$/ }));
    await waitFor(() =>
      expect(mockedDownload).toHaveBeenCalledWith({
        companyId: "t-1",
        conversationId: "conv-1",
        format: "md",
        includeRaw: false,
      }),
    );
  });

  it("respeta formato json + include_raw elegidos por el usuario", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: /JSON/ }));
    fireEvent.click(screen.getByLabelText(/apéndice/));
    fireEvent.click(screen.getByRole("button", { name: /Descargar$/ }));
    await waitFor(() =>
      expect(mockedDownload).toHaveBeenCalledWith({
        companyId: "t-1",
        conversationId: "conv-1",
        format: "json",
        includeRaw: true,
      }),
    );
  });

  it("error del backend → toast de error, el diálogo no se cierra solo", async () => {
    mockedDownload.mockRejectedValueOnce(new Error("boom"));
    const onOpenChange = jest.fn();
    render(
      <ReportDownloadDialog
        open
        onOpenChange={onOpenChange}
        target={{ companyId: "t-1", conversationId: "conv-1" }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Descargar$/ }));
    await waitFor(() => expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" })));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});

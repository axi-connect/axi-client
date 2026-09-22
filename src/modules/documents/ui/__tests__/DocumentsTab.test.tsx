import { render, screen } from "@testing-library/react";

const mockTypes = jest.fn<Promise<unknown>, []>();
const mockTemplates = jest.fn<Promise<unknown>, []>();
const mockSettings = jest.fn<Promise<unknown>, []>();
jest.mock(
  "@/modules/documents/infrastructure/services/documents-service.adapter",
  () => ({
    listDocumentTypes: () => mockTypes(),
    listDocumentTemplates: () => mockTemplates(),
    getDocumentsSettings: () => mockSettings(),
    previewDocumentTemplate: jest.fn(),
    saveDocumentTemplate: jest.fn(),
    resetDocumentTemplate: jest.fn(),
    updateDocumentsSettings: jest.fn(),
  }),
);
const mockHasPermission = jest.fn<boolean, [string]>(() => true);
jest.mock("@/core/providers/auth-provider", () => ({
  useAuthContext: () => ({ hasPermission: mockHasPermission }),
}));
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn() }),
}));

import { HttpError } from "@/core/api/problem";
import { DocumentsTab } from "@/modules/documents/ui/DocumentsTab";

describe("DocumentsTab", () => {
  beforeEach(() => {
    mockHasPermission.mockImplementation(() => true);
    mockTypes.mockReset();
  });

  it("sin la función explica el 403 y ofrece Funciones, volviendo a Mi empresa (no a Pagos)", async () => {
    const forbidden = new HttpError({
      status: 403,
      code: "features/feature_disabled",
      message: "apagada",
    });
    mockTypes.mockRejectedValue(forbidden);
    mockTemplates.mockRejectedValue(forbidden);
    mockSettings.mockRejectedValue(forbidden);
    render(<DocumentsTab />);
    expect(
      await screen.findByText("Aquí no hay documentos"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ir a Funciones" }),
    ).toHaveAttribute("href", "/settings/company/funciones");
    expect(
      screen.getByRole("link", { name: "Volver a Mi empresa" }),
    ).toHaveAttribute("href", "/settings/company");
  });

  it("sin el permiso es OTRO mensaje, y no pide nada al servidor", () => {
    mockHasPermission.mockImplementation(
      (code) => code !== "document_templates:manage",
    );
    render(<DocumentsTab />);
    expect(
      screen.getByText("Las plantillas las configura quien administra"),
    ).toBeInTheDocument();
    expect(mockTypes).not.toHaveBeenCalled();
  });
});

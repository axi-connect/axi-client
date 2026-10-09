import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PurgePreview, TenantStorage } from "../../../../domain/storage";
import { PurgePanel } from "../PurgePanel";
import { QuotaSheet } from "../QuotaSheet";

const GIB = 1024 ** 3;

jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn() }),
}));

jest.mock("@/shared/components/features/detail-sheet", () => ({
  DetailSheet: ({
    open,
    title,
    children,
    renderFooter,
  }: {
    open: boolean;
    title?: React.ReactNode;
    children?: React.ReactNode;
    renderFooter?: () => React.ReactNode;
  }) =>
    open ? (
      <div>
        <h2>{title}</h2>
        {children}
        {renderFooter?.()}
      </div>
    ) : null,
}));

const previewMutate = jest.fn();
const executeMutateAsync = jest.fn();
const quotaMutateAsync = jest.fn();
let previewData: PurgePreview | undefined;
let mockPreviewVariables: unknown;

jest.mock("../../../../infrastructure/api/hooks/use-storage", () => ({
  usePurgePreview: () => ({
    mutate: previewMutate,
    data: previewData,
    isPending: false,
    isError: false,
    variables: mockPreviewVariables,
  }),
  useExecutePurge: () => ({
    mutateAsync: executeMutateAsync,
    isPending: false,
  }),
  usePurgeRun: () => ({ data: undefined }),
  useRefreshTenantStorage: () => jest.fn(),
  useLargeFiles: () => ({ data: [], isPending: false }),
  useSetStorageQuota: () => ({
    mutateAsync: quotaMutateAsync,
    isPending: false,
  }),
}));

const STORAGE: TenantStorage = {
  company_id: "c-1",
  name: "Clínica Dermalux",
  plan_name: "Crecimiento",
  used_bytes: 15 * GIB,
  quota_bytes: 15 * GIB,
  quota_source: "plan",
  grace_pct: 0,
  pct_used: 100,
  state: "full",
  blocks_uploads: true,
  room_bytes: 0,
  by_category: [],
  growth: {
    per_month_bytes: 1.8 * GIB,
    days_to_full: 0,
    series: [],
    window_days: 180,
  },
  measured_at: "2026-10-08T12:00:00.000Z",
};

const PREVIEW: PurgePreview = {
  preview_id: "11111111-1111-7111-8111-111111111111",
  kind: "conversation_media",
  files: 318,
  bytes: 9.8 * GIB,
  by_category: { inbound_media: { files: 318, bytes: 9.8 * GIB } },
  kept: {
    shared: { files: 4, bytes: GIB },
    in_use: { files: 0, bytes: 0 },
    evidence: { files: 2, bytes: 1000 },
  },
  sample: [],
  cutoff: "2026-10-08T12:00:00.000Z",
  expires_at: "2026-10-08T12:15:00.000Z",
  confirm_phrase: "ELIMINAR clinica-dermalux",
};

describe("Depurar (platform)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    previewData = PREVIEW;
    mockPreviewVariables = {
      kind: "conversation_media",
      filter: { origin: "customer", mime_classes: ["video"], older_than_days: 180 },
    };
  });
  afterEach(() => jest.useRealTimers());

  it("la vista previa se pide con el filtro de la pantalla: videos de clientes de más de 6 meses", () => {
    render(<PurgePanel kind="conversation_media" storage={STORAGE} onClose={() => {}} />);
    jest.advanceTimersByTime(400);
    expect(previewMutate).toHaveBeenCalledWith({
      kind: "conversation_media",
      filter: {
        origin: "customer",
        mime_classes: ["video"],
        older_than_days: 180,
      },
    });
    expect(screen.getByText(/Se conservan/)).toBeInTheDocument();
    expect(screen.getByText(/otro mensaje más reciente los usa/)).toBeInTheDocument();
  });

  it("borrar exige la frase exacta y la contraseña; el botón no se habilita antes", async () => {
    jest.useRealTimers();
    executeMutateAsync.mockResolvedValue(PREVIEW.preview_id);
    render(<PurgePanel kind="conversation_media" storage={STORAGE} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar 9,8 GB" }));

    // El de la barra de tinta y el del diálogo: el del diálogo es el último
    const buttons = await screen.findAllByRole("button", {
      name: "Eliminar 9,8 GB",
    });
    const dialogSubmit = buttons.at(-1) as HTMLButtonElement;
    expect(dialogSubmit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Para confirmar/), {
      target: { value: "ELIMINAR otra" },
    });
    fireEvent.change(screen.getByLabelText("Tu contraseña"), {
      target: { value: "Secreta123!" },
    });
    expect(dialogSubmit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Para confirmar/), {
      target: { value: "ELIMINAR clinica-dermalux" },
    });
    expect(dialogSubmit).toBeEnabled();
    fireEvent.click(dialogSubmit);
    await waitFor(() =>
      expect(executeMutateAsync).toHaveBeenCalledWith({
        preview_id: PREVIEW.preview_id,
        confirm_phrase: "ELIMINAR clinica-dermalux",
        password: "Secreta123!",
      }),
    );
  });
});

describe("Cuota (platform)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("ampliar envía bytes con margen y motivo", async () => {
    quotaMutateAsync.mockResolvedValue(undefined);
    render(<QuotaSheet open onOpenChange={() => {}} storage={STORAGE} />);
    fireEvent.click(screen.getByRole("radio", { name: /Ampliada/ }));
    fireEvent.click(screen.getByRole("button", { name: "+10 GB" }));
    expect(screen.getByLabelText("Espacio")).toHaveValue("25");
    fireEvent.click(screen.getByRole("button", { name: "+5 %" }));
    fireEvent.change(screen.getByLabelText("Motivo"), {
      target: { value: "Paquete +10 GB" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cuota" }));
    await waitFor(() =>
      expect(quotaMutateAsync).toHaveBeenCalledWith({
        mode: "override",
        quota_bytes: 25 * GIB,
        grace_pct: 5,
        reason: "Paquete +10 GB",
      }),
    );
  });

  it("sin motivo no se guarda", () => {
    render(<QuotaSheet open onOpenChange={() => {}} storage={STORAGE} />);
    expect(screen.getByRole("button", { name: "Guardar cuota" })).toBeDisabled();
  });
});

describe("Depurar: la vista previa vieja no se confirma (C-5)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    previewData = PREVIEW;
  });

  it("si la vista previa salió de otro filtro, «Eliminar» espera y no abre el diálogo", () => {
    mockPreviewVariables = {
      kind: "conversation_media",
      filter: { origin: "customer", mime_classes: ["video"], older_than_days: 90 },
    };
    render(<PurgePanel kind="conversation_media" storage={STORAGE} onClose={() => {}} />);
    const button = screen.getByRole("button", { name: "Calculando…" });
    expect(button).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Eliminar 9,8 GB" })).toBeNull();
  });

  it("con la vista previa del filtro actual, el diálogo dice qué se borra", async () => {
    mockPreviewVariables = {
      kind: "conversation_media",
      filter: { origin: "customer", mime_classes: ["video"], older_than_days: 180 },
    };
    render(<PurgePanel kind="conversation_media" storage={STORAGE} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar 9,8 GB" }));
    expect(await screen.findByText("Videos de los clientes de más de 6 meses")).toBeInTheDocument();
  });
});

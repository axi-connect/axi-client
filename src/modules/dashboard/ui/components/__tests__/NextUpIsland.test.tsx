import { render, screen } from "@testing-library/react";

import { NextUpIsland } from "../NextUpIsland";
import type { DashboardPerms, Section } from "@/modules/dashboard/infrastructure/stores/dashboard.store";
import type { InboxCountsDTO, OrderStatsDTO, UsageSummaryDTO } from "@/modules/dashboard/domain/dashboard";
import type { ChannelHealth } from "@/modules/dashboard/domain/health";
import type { OnboardingResume } from "@/modules/onboarding/public";

const mockResume = jest.fn<OnboardingResume, []>(() => ({ state: "hidden" }));
jest.mock("@/modules/onboarding/public", () => ({ useOnboardingResume: () => mockResume() }));

const ALL: DashboardPerms = { orders: true, conversations: true, contacts: true, usage: true, channels: true };
const ready = <T,>(data: T): Section<T> => ({ status: "ready", data, error: null });
const loading = <T,>(): Section<T> => ({ status: "loading", data: null, error: null });

const attention = (patch: Partial<InboxCountsDTO> = {}) =>
  ready<InboxCountsDTO>({ queued: 4, mine: 3, ai: 16, all_open: 23, unread_total: 9, ...patch });
const sales = (pending: number) => ready({ kpis: { pending_verification: pending } } as unknown as OrderStatsDTO);
const usage = (aiPaused = false) => ready({ ai_paused: aiPaused, metrics: [], cost: { used_usd: 0, limit: null } } as unknown as UsageSummaryDTO);
const channels = (level: ChannelHealth["level"] = "ok") =>
  ready<ChannelHealth[]>([{ id: "c1", name: "@dermalux", kind: "instagram_dm", status: level === "ok" ? "connected" : "disconnected", level }]);

function renderIsland(patch: Partial<Parameters<typeof NextUpIsland>[0]> = {}) {
  return render(
    <NextUpIsland perms={ALL} attention={attention()} sales={sales(2)} channels={channels()} usage={usage()} {...patch} />,
  );
}

beforeEach(() => mockResume.mockReturnValue({ state: "hidden" }));

describe("NextUpIsland", () => {
  it("mientras carga un dato que la decide, pinta su silueta y no una isla que luego cambie", () => {
    renderIsland({ attention: loading() });
    expect(screen.getByRole("status", { name: /cargando lo próximo/i })).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("lo accionable, con la acción de la fila más grave primero", () => {
    renderIsland();
    const island = screen.getByRole("region", { name: "Lo próximo" });
    expect(island).toHaveClass("island");
    expect(screen.getByRole("heading", { name: "Esto te espera ahora" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /4 esperan en cola/i })).toHaveAttribute("href", "/workspace/inbox");
    expect(screen.getByRole("link", { name: /2 pagos por verificar/i })).toHaveAttribute("href", "/orders");
    expect(screen.getByText("La IA atiende 16 de las 23 abiertas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir al inbox" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver pagos" })).toBeInTheDocument();
  });

  it("un canal caído manda, aunque haya configuración pendiente", () => {
    mockResume.mockReturnValue({ state: "pending", pending: 2, steps: [], next: null, href: "/onboarding", dismiss: jest.fn() });
    renderIsland({ channels: channels("critical") });
    expect(screen.getByRole("heading", { name: "No puede esperar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reconectar Instagram" })).toHaveAttribute("href", "/settings/channels");
  });

  it("el primer día, los pasos de la configuración", () => {
    mockResume.mockReturnValue({
      state: "pending",
      pending: 2,
      steps: [
        { code: "niche", label: "Negocio", status: "done" },
        { code: "whatsapp", label: "WhatsApp", status: "pending" },
      ],
      next: { code: "whatsapp", label: "WhatsApp", status: "pending" },
      href: "/onboarding?step=whatsapp",
      dismiss: jest.fn(),
    });
    renderIsland({ attention: attention({ queued: 0, mine: 0 }), sales: sales(0) });
    expect(screen.getByRole("region", { name: "Empieza por aquí" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Te faltan 2 pasos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continuar" })).toHaveAttribute("href", "/onboarding?step=whatsapp");
    expect(screen.getByRole("button", { name: "Ocultar" })).toBeInTheDocument();
  });

  it("sin nada pendiente lo dice con calma", () => {
    renderIsland({ attention: attention({ queued: 0, mine: 0, ai: 12, all_open: 12 }), sales: sales(0) });
    expect(screen.getByRole("heading", { name: "Todo al día" })).toBeInTheDocument();
    expect(screen.getByText(/La IA atiende las 12 abiertas; si alguna te necesita, aparece aquí/)).toBeInTheDocument();
  });
});

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type {
  SocialAutomationDTO,
  SocialChannelDTO,
} from "@/modules/social/domain/social";
import { describeActivity, describeGaps, funnelStages } from "@/modules/social/domain/social";
import { SocialView } from "../SocialView";

/**
 * Marketing › Redes («Comenta y recibe»). Un montaje por escenario: montar
 * cuesta y una aserción no.
 */

jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/marketing/social",
  useSearchParams: () => new URLSearchParams(),
}));

const showAlert = jest.fn();
const showModal = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal, closeModal: jest.fn() }),
}));

jest.mock("@/modules/social/infrastructure/services/social-service.adapter", () => ({
  listSocialAutomations: jest.fn(),
  listSocialChannels: jest.fn(),
  activateSocialAutomation: jest.fn(),
  pauseSocialAutomation: jest.fn(),
  deleteSocialAutomation: jest.fn(),
  listSocialActivity: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const api = require("@/modules/social/infrastructure/services/social-service.adapter") as {
  listSocialAutomations: jest.Mock;
  listSocialChannels: jest.Mock;
  activateSocialAutomation: jest.Mock;
  pauseSocialAutomation: jest.Mock;
  listSocialActivity: jest.Mock;
};
/* eslint-enable @typescript-eslint/no-require-imports */

const IG: SocialChannelDTO = {
  id: "ch-ig",
  name: "Norte Studio",
  kind: "instagram_dm",
  username: "nortestudio",
  status: "connected",
  comments_subscribed: true,
  comments_reason: null,
};

function automation(over: Partial<SocialAutomationDTO> = {}): SocialAutomationDTO {
  return {
    id: "auto-1",
    name: "Reel de la colección",
    status: "active",
    channel_ids: ["ch-ig"],
    scope: "selected",
    media_ids: ["reel-1"],
    keywords: ["INFO"],
    accept_thread_replies: false,
    public_reply_enabled: true,
    public_reply_variants: ["¡Listo {nombre}! Te escribí por mensaje."],
    public_reply_hourly_cap: 30,
    opener: { text: "Tengo lista la guía.", button_title: "Envíamelo" },
    delivery: [{ type: "text", text: "Aquí está" }],
    invite_follow: false,
    agent_goal: null,
    test_mode: false,
    test_account_ids: [],
    gaps: [],
    funnel: { comments: 120, contacted: 90, opened: 45, delivered: 44, ignored: 30, failed: 1 },
    created_at: "2026-11-09T12:00:00.000Z",
    updated_at: "2026-11-09T12:00:00.000Z",
    ...over,
  };
}

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

describe("SocialView", () => {
  it("lista las automatizaciones con su embudo, el resumen y el interruptor", async () => {
    api.listSocialAutomations.mockResolvedValue([
      automation(),
      automation({
        id: "auto-2",
        name: "Borrador sin palabra",
        status: "draft",
        keywords: [],
        gaps: ["keywords", "opener"],
        funnel: { comments: 0, contacted: 0, opened: 0, delivered: 0, ignored: 0, failed: 0 },
      }),
    ]);
    api.listSocialChannels.mockResolvedValue([IG]);
    api.pauseSocialAutomation.mockResolvedValue(automation({ status: "paused" }));

    render(<SocialView />);

    expect(await screen.findByRole("heading", { name: "Reel de la colección" })).toBeInTheDocument();
    expect(screen.getByText("Comentan «INFO»")).toBeInTheDocument();
    // El borrador dice qué le falta, en palabras
    expect(
      screen.getByText("Te falta escribir la palabra que la gente comenta y escribir el mensaje privado."),
    ).toBeInTheDocument();
    // Incompleto no se puede activar desde la lista
    expect(screen.getByRole("switch", { name: "Activar" })).toBeDisabled();

    // Pausar: llama al servidor y avisa
    fireEvent.click(screen.getByRole("switch", { name: "Pausar" }));
    await waitFor(() => expect(api.pauseSocialAutomation).toHaveBeenCalledWith("auto-1"));
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ title: "Automatización pausada" }));
  });

  it("vacío y sin cuentas: invita a conectar Instagram o Facebook", async () => {
    api.listSocialAutomations.mockResolvedValue([]);
    api.listSocialChannels.mockResolvedValue([]);

    render(<SocialView />);

    expect(await screen.findByText("Convierte comentarios en ventas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Conectar Instagram o Facebook" })).toHaveAttribute(
      "href",
      "/settings/channels",
    );
  });

  it("una cuenta sin el permiso de comentarios pide reconectar", async () => {
    api.listSocialAutomations.mockResolvedValue([automation()]);
    api.listSocialChannels.mockResolvedValue([
      { ...IG, comments_subscribed: false, comments_reason: "Falta el permiso: instagram_manage_comments" },
    ]);

    render(<SocialView />);

    expect(
      await screen.findByText("Norte Studio todavía no puede responder comentarios."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a canales" })).toHaveAttribute("href", "/settings/channels");
  });
});

describe("vocabulario de Redes", () => {
  it("el embudo da el porcentaje sobre la etapa anterior", () => {
    const stages = funnelStages(automation().funnel);
    expect(stages.map((stage) => [stage.value, stage.rate])).toEqual([
      [120, null],
      [90, 75],
      [45, 50],
      [44, 98],
    ]);
  });

  it("las faltas se dicen en una frase", () => {
    expect(describeGaps([])).toBeNull();
    expect(describeGaps(["delivery"])).toBe("Te falta agregar lo que vas a entregar.");
  });

  it("cada comentario dice cómo le fue, con el motivo cuando no recibió nada", () => {
    const base = {
      id: "e",
      network: "instagram" as const,
      media_id: "m",
      from_username: "ana",
      comment_text: "hola",
      ignore_reason: null,
      fail_reason: null,
      public_reply_status: "none" as const,
      conversation_id: null,
      commented_at: null,
      private_replied_at: null,
      opened_at: null,
      delivered_at: null,
      created_at: "2026-11-09T12:00:00.000Z",
    };
    expect(describeActivity({ ...base, status: "delivered" })).toEqual({
      label: "Recibió la entrega",
      tone: "success",
    });
    expect(describeActivity({ ...base, status: "ignored", ignore_reason: "no_match" }).label).toBe(
      "No escribió la palabra",
    );
    expect(
      describeActivity({ ...base, status: "failed", fail_reason: "unknown_maybe_delivered" }).label,
    ).toBe("Puede que le haya llegado: Meta no confirmó");
  });
});

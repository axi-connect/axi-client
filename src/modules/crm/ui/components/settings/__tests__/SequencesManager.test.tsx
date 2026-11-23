import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { SequenceDTO, UpsertSequenceDTO } from "@/modules/crm/domain/sequences";
import { SequencesManager } from "../SequencesManager";

/**
 * Hotfix «guardar no borra». El editor no muestra la plantilla de WhatsApp de
 * un paso ni el diseño, la imagen y el botón de un correo, pero el PUT
 * reemplaza la secuencia entera: lo que el editor no devuelva, se pierde.
 * Camino real del panel: cargar → «Editar» → «Guardar secuencia».
 * Datos ficticios (tenant «Norte Studio»).
 */
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: () => true, status: "authenticated" }),
}));
const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}));
jest.mock("@/shared/auth/entitlements.hooks", () => ({
  useEntitlements: () => ({ entitlements: null, loaded: true, hasCapability: () => true }),
}));
jest.mock("@/modules/crm/ui/components/settings/SequenceEnrollmentsSheet", () => ({
  SequenceEnrollmentsSheet: () => null,
}));
jest.mock("@/modules/crm/infrastructure/services/sequences-service.adapter", () => ({
  listSequences: jest.fn(),
  createSequence: jest.fn(),
  updateSequence: jest.fn(),
  deleteSequence: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const api = require("@/modules/crm/infrastructure/services/sequences-service.adapter") as {
  listSequences: jest.Mock;
  createSequence: jest.Mock;
  updateSequence: jest.Mock;
};
/* eslint-enable @typescript-eslint/no-require-imports */

const OPENING = {
  channel_template_id: "0193a000-0000-7000-8000-000000000001",
  channel_id: "0193a000-0000-7000-8000-0000000000c1",
  name: "norte_studio_apertura",
  language: "es",
  params: ["company_name"],
  topic: null,
  header_image: { id: "nicho:estudios", personalize: true },
};
const BRAND_MAIL = {
  subject: "Una idea para {{business_name}}",
  body: "Hola {{first_name}}: te cuento cómo lo hacemos en Norte Studio.",
  design: "brand" as const,
  header_image: { id: "nicho:estudios", personalize: true },
  cta: { label: "Quiero verlo", target: "whatsapp" as const },
};

/** Lo que devuelve `GET /crm/sequences`: un «Mensaje» con plantilla y un correo «marca». */
function stored(): SequenceDTO {
  return {
    id: "0193a000-0000-7000-8000-00000000005e",
    name: "Estudios de diseño",
    description: "Prospección de Norte Studio",
    stop_on_reply: true,
    stop_on_conversion: true,
    is_active: true,
    next_sequence_id: null,
    steps: [
      {
        id: "0193a000-0000-7000-8000-000000000051",
        position: 1,
        offset_hours: 0,
        task_channel: "message",
        call_type: null,
        objective: "Presentarnos y preguntar qué necesita",
        opening_template: OPENING,
        message_template: null,
      },
      {
        id: "0193a000-0000-7000-8000-000000000052",
        position: 2,
        offset_hours: 48,
        task_channel: "email",
        call_type: null,
        objective: "Contarle la idea con un caso real",
        opening_template: null,
        message_template: BRAND_MAIL,
      },
    ],
    active_enrollments: 3,
    created_at: "2026-11-20T15:00:00.000Z",
    updated_at: "2026-11-20T15:00:00.000Z",
  };
}

/** La plantilla tal como la acepta el PUT (lo que derivó el servidor no viaja). */
const OPENING_INPUT = {
  channel_template_id: OPENING.channel_template_id,
  params: OPENING.params,
  topic: OPENING.topic,
  header_image: OPENING.header_image,
};

async function openEditor() {
  render(<SequencesManager />);
  fireEvent.click(await screen.findByRole("button", { name: "Editar Estudios de diseño" }));
  return screen.findByRole("button", { name: "Guardar secuencia" });
}

async function savedBody(): Promise<UpsertSequenceDTO> {
  await waitFor(() => expect(api.updateSequence).toHaveBeenCalledTimes(1));
  const [id, body] = api.updateSequence.mock.calls[0] as [string, UpsertSequenceDTO];
  expect(id).toBe(stored().id);
  return body;
}

beforeEach(() => {
  jest.clearAllMocks();
  api.listSequences.mockResolvedValue({ data: [stored()] });
  api.updateSequence.mockImplementation(() => Promise.resolve(stored()));
});
afterEach(cleanup);

describe("SequencesManager · guardar una secuencia existente no borra lo que el editor no muestra", () => {
  it("guardar sin cambiar nada devuelve la plantilla de WhatsApp y el diseño, la imagen y el botón del correo", async () => {
    fireEvent.click(await openEditor());
    const body = await savedBody();

    expect(body.steps).toHaveLength(2);
    expect(body.steps[0].task_channel).toBe("message");
    expect(body.steps[0].opening_template).toEqual(OPENING_INPUT);
    expect(body.steps[1].task_channel).toBe("email");
    expect(body.steps[1].message_template).toEqual(BRAND_MAIL);
  });

  it("editar el asunto del correo conserva su diseño, su imagen y su botón", async () => {
    const save = await openEditor();
    fireEvent.change(screen.getByLabelText("Asunto del correo del paso 2"), {
      target: { value: "Otra idea para {{business_name}}" },
    });
    fireEvent.click(save);
    const body = await savedBody();

    expect(body.steps[1].message_template).toEqual({
      ...BRAND_MAIL,
      subject: "Otra idea para {{business_name}}",
    });
    expect(body.steps[0].opening_template).toEqual(OPENING_INPUT);
  });

  it("quitar el primer paso no le pasa su plantilla al correo ni le quita lo suyo", async () => {
    const save = await openEditor();
    fireEvent.click(screen.getByRole("button", { name: "Quitar el paso 1" }));
    fireEvent.click(save);
    const body = await savedBody();

    expect(body.steps).toHaveLength(1);
    expect(body.steps[0].task_channel).toBe("email");
    expect(body.steps[0].opening_template ?? null).toBeNull();
    expect(body.steps[0].message_template).toEqual(BRAND_MAIL);
  });
});

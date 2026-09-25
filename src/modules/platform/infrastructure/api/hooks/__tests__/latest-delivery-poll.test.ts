import { DELIVERY_PASSWORD_POLL_MS, DELIVERY_QUEUED_POLL_MS, latestDeliveryPollMs } from "../use-delivery";

const delivery = (status: string, passwordSetAt: string | null = null) =>
  ({ delivery: { status, password_set_at: passwordSetAt } }) as never;

describe("latestDeliveryPollMs", () => {
  it("en cola: cada 5 s", () => {
    expect(latestDeliveryPollMs(delivery("committed"))).toBe(DELIVERY_QUEUED_POLL_MS);
    expect(latestDeliveryPollMs(delivery("mail_queued"))).toBe(DELIVERY_QUEUED_POLL_MS);
  });
  it("enviada y sin contraseña: cada 30 s, para enterarse de que la creó", () => {
    expect(latestDeliveryPollMs(delivery("sent"))).toBe(DELIVERY_PASSWORD_POLL_MS);
  });
  it("con contraseña, fallida, a medias o sin entrega: no refresca", () => {
    expect(latestDeliveryPollMs(delivery("sent", "2026-09-25T06:12:00Z"))).toBe(false);
    expect(latestDeliveryPollMs(delivery("failed"))).toBe(false);
    expect(latestDeliveryPollMs(delivery("draft"))).toBe(false);
    expect(latestDeliveryPollMs({ delivery: null } as never)).toBe(false);
    expect(latestDeliveryPollMs(undefined)).toBe(false);
  });
});

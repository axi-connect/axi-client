import {
  callsSettingsFormSchema,
  fromCallsSettingsDto,
  toCallsSettingsPayload,
} from "@/modules/calls/ui/forms/config/calls-settings.config";
import type { CallsSettingsDTO } from "@/modules/calls/domain/call";

const DTO: CallsSettingsDTO = {
  ai_enabled: true,
  recording_enabled: true,
  hangup_on_machine: false,
  legal_notice_text: "Esta llamada puede ser grabada para mejorar el servicio.",
  max_duration_seconds: 630,
  max_concurrent: 3,
  quiet_hours: { start_hour: 20, end_hour: 8 },
  ring_timeout_seconds: 45,
  silence_probe_seconds: 12,
  silence_hangup_seconds: 15,
};

describe("calls-settings.config", () => {
  it("el round-trip DTO → form → DTO no altera ningún valor (antes 630 s se convertía en 660)", () => {
    const values = fromCallsSettingsDto(DTO);
    expect(callsSettingsFormSchema.safeParse(values).success).toBe(true);
    expect(toCallsSettingsPayload(values)).toEqual(DTO);
  });

  it("expone los umbrales de silencio y el timbre con sus límites", () => {
    const values = fromCallsSettingsDto(DTO);
    expect(callsSettingsFormSchema.safeParse({ ...values, silence_probe_seconds: 2 }).success).toBe(
      false,
    );
    expect(callsSettingsFormSchema.safeParse({ ...values, ring_timeout_seconds: 60 }).success).toBe(
      false,
    );
    expect(
      callsSettingsFormSchema.safeParse({ ...values, max_duration_seconds: 1800 }).success,
    ).toBe(true);
  });
});

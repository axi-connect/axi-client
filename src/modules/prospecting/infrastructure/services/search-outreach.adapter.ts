import { http } from "@/core/services/http"
import type {
  EmailPreviewDTO,
  LookState,
  OutreachImageDTO,
  SearchOutreachResultDTO,
  SearchOutreachSummaryDTO,
  SequenceLookViewDTO,
} from "@/modules/prospecting/domain/search-outreach"
import { lookPayload } from "@/modules/prospecting/domain/search-outreach"

/** Adapter HTTP de «Escribirles» (Fase B2). */

export function getSearchOutreach(searchId: string): Promise<SearchOutreachSummaryDTO> {
  return http.get<SearchOutreachSummaryDTO>(`/autopilot/searches/${searchId}/outreach`)
}

export function enrollSearch(
  searchId: string,
  sequenceId: string,
  look: LookState | null,
): Promise<SearchOutreachResultDTO> {
  return http.post<SearchOutreachResultDTO>(`/autopilot/searches/${searchId}/outreach`, {
    sequence_id: sequenceId,
    look: look === null ? null : lookPayload(look),
  })
}

export interface SequenceOption {
  id: string
  name: string
  is_active: boolean
  /** Quienes la recorren ahora: el look de «Escribirles» también les cambia a ellos. */
  active_enrollments: number
  steps: {
    task_channel: string
    offset_hours: number
    message_template: { subject: string | null; body: string } | null
  }[]
}

export async function listSequenceOptions(): Promise<SequenceOption[]> {
  const res = await http.get<{
    data: {
      id: string
      name: string
      is_active: boolean
      active_enrollments: number
      steps: SequenceOption["steps"]
    }[]
  }>("/crm/sequences")
  return res.data.map((sequence) => ({
    id: sequence.id,
    name: sequence.name,
    is_active: sequence.is_active,
    active_enrollments: sequence.active_enrollments,
    steps: sequence.steps.map((step) => ({
      task_channel: step.task_channel,
      offset_hours: step.offset_hours,
      message_template:
        step.message_template === null
          ? null
          : { subject: step.message_template.subject, body: step.message_template.body },
    })),
  }))
}

export function getSequenceLook(sequenceId: string): Promise<SequenceLookViewDTO> {
  return http.get<SequenceLookViewDTO>(`/crm/sequences/${sequenceId}/look`)
}

export async function listOutreachImages(): Promise<OutreachImageDTO[]> {
  const res = await http.get<{ items: OutreachImageDTO[] }>("/outreach/images")
  return res.items
}

export function uploadOutreachImage(file: File): Promise<OutreachImageDTO> {
  const form = new FormData()
  form.append("file", file, file.name)
  return http.post<OutreachImageDTO>("/outreach/images", form)
}

export async function outreachImageUrl(input: {
  id: string
  personalize: boolean
  business_name: string | null
}): Promise<string | null> {
  const res = await http.post<{ url: string | null }>("/outreach/images/url", input)
  return res.url
}

export interface EmailPreviewInput {
  template: {
    subject: string | null
    body: string
    design: "text" | "brand"
    header_image: { id: string; personalize: boolean } | null
    cta: { label: string; target: "reply" | "whatsapp" } | null
  }
  sample_business: string | null
}

export function previewEmail(input: EmailPreviewInput): Promise<EmailPreviewDTO> {
  return http.post<EmailPreviewDTO>("/outreach/email/preview", input)
}

export function sendTestEmail(input: EmailPreviewInput): Promise<{ sent_to: string }> {
  return http.post<{ sent_to: string }>("/outreach/email/test", input)
}

/** El nombre de TU negocio (la variable `company_name` de las plantillas de WhatsApp). */
export async function getMyCompanyName(): Promise<string> {
  const company = await http.get<{ name: string }>("/companies/me")
  return company.name
}

import { http } from "@/core/services/http";
import type { Paginated } from "@/core/api/types";
import type {
  EnrollmentDTO,
  SequenceDTO,
  UpsertSequenceDTO,
} from "@/modules/crm/domain/sequences";
import type { BulkAudience } from "@/modules/crm/infrastructure/services/bulk-service.adapter";

export function listSequences(): Promise<{ data: SequenceDTO[] }> {
  return http.get<{ data: SequenceDTO[] }>("/crm/sequences");
}

export function getSequence(sequenceId: string): Promise<SequenceDTO> {
  return http.get<SequenceDTO>(`/crm/sequences/${sequenceId}`);
}

export function createSequence(body: UpsertSequenceDTO): Promise<SequenceDTO> {
  return http.post<SequenceDTO>("/crm/sequences", body);
}

/** PUT y no PATCH: guardar reemplaza los pasos enteros. */
export function updateSequence(sequenceId: string, body: UpsertSequenceDTO): Promise<SequenceDTO> {
  return http.put<SequenceDTO>(`/crm/sequences/${sequenceId}`, body);
}

export function deleteSequence(sequenceId: string): Promise<void> {
  return http.delete<void>(`/crm/sequences/${sequenceId}`);
}

export function listEnrollments(
  sequenceId: string,
  params: { status?: string; page: number; page_size: number },
): Promise<Paginated<EnrollmentDTO>> {
  return http.get<Paginated<EnrollmentDTO>>(`/crm/sequences/${sequenceId}/enrollments`, {
    ...(params.status === undefined ? {} : { status: params.status }),
    page: params.page,
    page_size: params.page_size,
  });
}

/** Inscribe una audiencia. Lo sirve el módulo que puede comprobar la baja. */
export function enrollInSequence(
  sequenceId: string,
  audience: BulkAudience,
): Promise<{ enrolled: number; skipped: { reason: string; count: number }[] }> {
  return http.post(`/crm/sequences/${sequenceId}/enroll`, audience);
}

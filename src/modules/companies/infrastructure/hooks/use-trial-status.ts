"use client"

import { useEffect, useState } from "react"
import { useSession } from "@/shared/auth/auth.hooks"
import type { CompanyDTO } from "@/modules/companies/domain/company"
import { loadMyCompanyOnce } from "@/modules/companies/infrastructure/services/company-cache"
import { calendarDaysUntil } from "@/modules/welcome-kit/domain/formatters"

/** Zona si la empresa no trae la suya (los clientes de hoy son de Colombia). */
const DEFAULT_TIMEZONE = "America/Bogota"

export interface TrialStatus {
  /** true solo si la empresa está en trial CON fecha de vencimiento. */
  active: boolean
  /**
   * Días de CALENDARIO que faltan, en la zona del tenant: la fecha local del fin
   * menos la de hoy (mínimo 0). Una prueba de 7 que vence el día 7 a las 23:59
   * da 7 el día 0 y 0 («termina hoy») el día 7.
   */
  daysLeft: number
  /** Vencimiento como Date (null si no hay trial acotado). */
  endsAt: Date | null
  /** Últimos 2 días: el aviso escala de chip discreto a banner con CTA. */
  ending: boolean
}

const NO_TRIAL: TrialStatus = { active: false, daysLeft: 0, endsAt: null, ending: false }

export function trialStatusFrom(
  company: Pick<CompanyDTO, "status" | "trial_ends_at" | "timezone">,
  now: Date = new Date(),
): TrialStatus {
  if (company.status !== "trial" || !company.trial_ends_at) return NO_TRIAL
  const endsAt = new Date(company.trial_ends_at)
  const days = calendarDaysUntil(company.trial_ends_at, company.timezone || DEFAULT_TIMEZONE, now)
  const daysLeft = Math.max(0, days ?? 0)
  return { active: true, daysLeft, endsAt, ending: daysLeft <= 2 }
}

/**
 * Estado del trial del tenant para el chip del header y el banner de
 * vencimiento. Comparte el cache one-shot de `GET /companies/me` con
 * `CompanyIdentity` — cero peticiones extra. Silencioso ante fallo (los
 * avisos de trial jamás rompen el shell).
 */
export function useTrialStatus(): TrialStatus {
  const { status } = useSession()
  const [trial, setTrial] = useState<TrialStatus>(NO_TRIAL)

  useEffect(() => {
    if (status !== "authenticated") return
    let ignore = false
    loadMyCompanyOnce()
      .then((company) => { if (!ignore) setTrial(trialStatusFrom(company)) })
      .catch(() => { /* sin aviso: el shell no se rompe por esto */ })
    return () => { ignore = true }
  }, [status])

  return trial
}

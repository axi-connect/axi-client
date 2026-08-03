"use client"

import { useEffect, useState } from "react"
import { useSession } from "@/shared/auth/auth.hooks"
import type { CompanyDTO } from "@/modules/companies/domain/company"
import { loadMyCompanyOnce } from "@/modules/companies/infrastructure/services/company-cache"

const DAY_MS = 24 * 60 * 60 * 1000

export interface TrialStatus {
  /** true solo si la empresa está en trial CON fecha de vencimiento. */
  active: boolean
  /** Días restantes (techo, mínimo 0). 0 = vence hoy. */
  daysLeft: number
  /** Vencimiento como Date (null si no hay trial acotado). */
  endsAt: Date | null
  /** Últimos 2 días: el aviso escala de chip discreto a banner con CTA. */
  ending: boolean
}

const NO_TRIAL: TrialStatus = { active: false, daysLeft: 0, endsAt: null, ending: false }

function toStatus(company: CompanyDTO): TrialStatus {
  if (company.status !== "trial" || !company.trial_ends_at) return NO_TRIAL
  const endsAt = new Date(company.trial_ends_at)
  const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / DAY_MS))
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
      .then((company) => { if (!ignore) setTrial(toStatus(company)) })
      .catch(() => { /* sin aviso: el shell no se rompe por esto */ })
    return () => { ignore = true }
  }, [status])

  return trial
}

import type { ApplicationStage } from '../types/application'

export const STAGE_ORDER: ApplicationStage[] = ['eyes_on', 'applied', 'interview', 'offer']

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  eyes_on: 'Eyes on',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
}

export function nextStage(stage: ApplicationStage): ApplicationStage | null {
  const idx = STAGE_ORDER.indexOf(stage)
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null
  return STAGE_ORDER[idx + 1]
}

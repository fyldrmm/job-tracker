import type { ArchiveReason } from '../types/application'

export const ARCHIVE_REASONS: { value: ArchiveReason; label: string }[] = [
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'no_response', label: 'No response' },
  { value: 'accepted', label: 'Accepted' },
]

export const ARCHIVE_REASON_LABELS: Record<ArchiveReason, string> = {
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  no_response: 'No response',
  accepted: 'Accepted',
}

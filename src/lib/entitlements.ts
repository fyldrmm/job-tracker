// The seam interview scheduling was built behind (PLAN.md M13, decision
// 2026-07-23): the feature shipped free rather than waiting on a paid tier
// that doesn't exist yet, on the condition that gating it later is a
// one-line change here, not a hunt through every call site that schedules
// a new round. Only NEW scheduling is gated -- viewing, editing or deleting
// an already-scheduled round is never blocked by this, since revoking
// access to data a user already entered would be a much bigger UX call than
// this stub is meant to make.
export function canScheduleInterviews(): boolean {
  return true
}

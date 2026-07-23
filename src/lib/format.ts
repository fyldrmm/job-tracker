export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${month}/${day}/${year}`
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Renders a UTC interview timestamp in the viewer's local time, spelled out
// manually rather than via toLocaleString -- that call's output format
// varies by the browser's locale (date order, comma placement), which would
// make this non-deterministic across users and untestable here.
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const month = MONTH_NAMES[d.getMonth()]
  const day = d.getDate()
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const hour24 = d.getHours()
  const hour12 = hour24 % 12 || 12
  const ampm = hour24 >= 12 ? 'PM' : 'AM'
  return `${month} ${day}, ${hour12}:${minutes} ${ampm}`
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${month}/${day}/${year}`
}

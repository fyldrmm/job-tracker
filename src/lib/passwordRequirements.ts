export const PASSWORD_REQUIREMENTS_TEXT =
  'At least 10 characters, with uppercase, lowercase, and a number.'

export function passwordMeetsRequirements(password: string): boolean {
  return (
    password.length >= 10 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password)
  )
}

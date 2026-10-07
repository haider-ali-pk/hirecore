/* Pure password rules, shared by the client form (hints) and the server
   actions (enforcement). */

export const PASSWORD_MIN_LENGTH = 12;

/** bcrypt ignores everything after 72 bytes, so longer input is rejected. */
export const PASSWORD_MAX_BYTES = 72;

/** Returns a user-facing message, or null when the password is acceptable. */
export function validatePassword(
  password: string,
  context: { email?: string } = {}
): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return "That password is too long. Use 72 characters or fewer.";
  }

  if (context.email && password.toLowerCase() === context.email.toLowerCase()) {
    return "Your password can't be your email address.";
  }

  if (/^(.)\1+$/.test(password)) {
    return "Choose something less repetitive.";
  }

  return null;
}
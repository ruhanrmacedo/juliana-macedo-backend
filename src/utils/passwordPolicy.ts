export const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_POLICY_ERROR =
  `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`;

export function getPasswordPolicyError(password: unknown): string | null {
  if (
    typeof password !== "string" ||
    password.length < MIN_PASSWORD_LENGTH
  ) {
    return PASSWORD_POLICY_ERROR;
  }

  return null;
}

export function assertValidPassword(
  password: unknown
): asserts password is string {
  const error = getPasswordPolicyError(password);
  if (error) throw new Error(error);
}

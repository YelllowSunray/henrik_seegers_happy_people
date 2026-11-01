/** Map Firebase Auth errors to next-intl `auth` keys. */
export function authErrorKey(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: string }).code)
      : "";
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const haystack = `${code} ${message}`.toLowerCase();

  if (
    haystack.includes("weak-password") ||
    haystack.includes("password should be at least") ||
    haystack.includes("password must be")
  ) {
    return "errorWeakPassword";
  }
  if (haystack.includes("email-already-in-use")) return "errorEmailInUse";
  if (haystack.includes("invalid-email")) return "errorInvalidEmail";
  if (haystack.includes("user-not-found")) return "errorUserNotFound";
  if (haystack.includes("wrong-password")) return "errorWrongPassword";
  if (haystack.includes("invalid-credential") || haystack.includes("invalid-login")) {
    return "errorInvalidCredential";
  }
  if (haystack.includes("too-many-requests")) return "errorTooMany";
  if (haystack.includes("network-request-failed")) return "errorNetwork";
  if (haystack.includes("user-disabled")) return "errorDisabled";
  if (haystack.includes("missing-email")) return "forgotNeedEmail";
  if (
    haystack.includes("invalid-action-code") ||
    haystack.includes("expired-action-code")
  ) {
    return "errorResetLink";
  }
  return "errorGeneric";
}

export const MIN_PASSWORD_LENGTH = 6;

/** User-facing hint for a FreeBusy / calendar access error code. */
export function calendarAccessMessage(code: string | undefined): string {
  switch (code) {
    case "INVALID_SERVICE_ACCOUNT_KEY":
      return "Invalid service account key — check GOOGLE_SERVICE_ACCOUNT_JSON PEM formatting";
    case "DWD_NOT_AUTHORIZED":
      return "Domain-wide delegation not authorized — add service account Client ID in Admin console";
    case "INVALID_GRANT":
      return "Impersonation failed — check GOOGLE_DWD_SUBJECT_EMAIL is a valid Workspace user";
    case "notFound":
    case "NOT_FOUND":
      return "No calendar access — impersonated user cannot view this calendar";
    case "forbidden":
      return "No calendar access — calendar sharing or DWD scope missing";
    default:
      return code
        ? `No calendar access (${code})`
        : "No calendar access";
  }
}

/** True when every member failed with the same auth/config error. */
export function isGlobalCalendarConfigError(
  errorCodes: Array<string | undefined>,
): boolean {
  if (errorCodes.length === 0) {
    return false;
  }
  const first = errorCodes[0];
  if (!first) {
    return false;
  }
  const globalCodes = new Set([
    "INVALID_SERVICE_ACCOUNT_KEY",
    "DWD_NOT_AUTHORIZED",
    "INVALID_GRANT",
  ]);
  return (
    globalCodes.has(first) && errorCodes.every((code) => code === first)
  );
}

export function globalCalendarConfigMessage(code: string): string {
  return calendarAccessMessage(code);
}

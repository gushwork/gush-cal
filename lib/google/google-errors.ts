export function getGoogleErrorStatus(error: unknown): number | undefined {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "status" in error.response
  ) {
    const status = (error.response as { status?: number }).status;
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
}

export function isGoogleNotFoundError(error: unknown): boolean {
  const status = getGoogleErrorStatus(error);
  return status === 404 || status === 410;
}

export function formatGoogleErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (
      error as { response?: { data?: { error?: { message?: string } } } }
    ).response;
    const apiMessage = response?.data?.error?.message;
    if (apiMessage) {
      return apiMessage;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Could not cancel calendar event";
}

const DEFAULT_PORT = 4000;

export function visualBaseUrl(): string {
  if (process.env.PLAYWRIGHT_BASE_URL) {
    return process.env.PLAYWRIGHT_BASE_URL.replace(/\/$/, "");
  }

  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  return `http://localhost:${port}`;
}

export async function isVisualServerReachable(
  baseURL = visualBaseUrl(),
): Promise<boolean> {
  try {
    const response = await fetch(`${baseURL}/login`, {
      redirect: "manual",
      signal: AbortSignal.timeout(3_000),
    });

    return response.status >= 200 && response.status < 500;
  } catch {
    return false;
  }
}

export const serverSkipMessage =
  "Visual route smoke skipped: no app on :4000. Start with `npm run dev` or set START_SERVER=1 for scripts/visual-audit.sh.";

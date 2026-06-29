const DEFAULT_PORT = 4000;

export function e2eBaseUrl(): string {
  if (process.env.PLAYWRIGHT_BASE_URL) {
    return process.env.PLAYWRIGHT_BASE_URL.replace(/\/$/, "");
  }

  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  return `http://localhost:${port}`;
}

export async function isE2eServerReachable(
  baseURL = e2eBaseUrl(),
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
  "E2E skipped: no app on :4000. Start with `npm run dev` or `START_SERVER=1 npm run test:e2e`.";

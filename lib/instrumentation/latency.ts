export type LatencyOptions = {
  budgetMs: number;
  log?: (line: string) => void;
};

const defaultLog = (line: string) => {
  console.warn(line);
};

export async function withLatency<T>(
  name: string,
  fn: () => Promise<T>,
  options: LatencyOptions,
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const elapsed = Math.round(performance.now() - start);
    if (elapsed > options.budgetMs) {
      const log = options.log ?? defaultLog;
      log(`[latency] ${name} ${elapsed}ms budget=${options.budgetMs}`);
    }
  }
}

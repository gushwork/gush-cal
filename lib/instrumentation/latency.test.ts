import { afterEach, describe, expect, it, vi } from "vitest";
import { withLatency } from "./latency";

describe("withLatency", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the fn result", async () => {
    const result = await withLatency("test.op", async () => "ok", { budgetMs: 100 });
    expect(result).toBe("ok");
  });

  it("does not log when under budget", async () => {
    const log = vi.fn();
    await withLatency("test.op", async () => undefined, { budgetMs: 100, log });
    expect(log).not.toHaveBeenCalled();
  });

  it("logs [latency] name elapsed budget when over budget", async () => {
    const log = vi.fn();
    await withLatency(
      "sf.lookup",
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      },
      { budgetMs: 10, log },
    );
    expect(log).toHaveBeenCalledOnce();
    const line = log.mock.calls[0]![0] as string;
    expect(line).toMatch(/^\[latency\] sf\.lookup \d+ms budget=10$/);
  });

  it("logs even when fn throws", async () => {
    const log = vi.fn();
    await expect(
      withLatency(
        "slow.fail",
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          throw new Error("boom");
        },
        { budgetMs: 10, log },
      ),
    ).rejects.toThrow("boom");
    expect(log).toHaveBeenCalledOnce();
  });
});

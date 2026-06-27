/**
 * Poll event outbox + scheduled triggers and deliver webhooks.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/run-outbox-worker.ts
 *
 * Run via cron every minute or as a long-polling loop (--loop).
 */
import { processOutboxBatch } from "@/lib/events/outbox";
import { processDueTriggers } from "@/lib/events/scheduler";
import { processDueEmailSteps } from "@/lib/email/executor";

const BATCH_SIZE = 50;
const LOOP_INTERVAL_MS = 60_000;

async function runOnce(): Promise<void> {
  const triggers = await processDueTriggers();
  const emailSteps = await processDueEmailSteps();
  const delivered = await processOutboxBatch(BATCH_SIZE);
  console.log(
    `[outbox-worker] triggers=${triggers} emailSteps=${emailSteps} delivered=${delivered} at=${new Date().toISOString()}`,
  );
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const loop = process.argv.includes("--loop");

  if (!loop) {
    await runOnce();
    return;
  }

  for (;;) {
    await runOnce();
    await new Promise((resolve) => setTimeout(resolve, LOOP_INTERVAL_MS));
  }
}

main().catch((error) => {
  console.error("[outbox-worker] fatal", error);
  process.exit(1);
});

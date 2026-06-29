import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

function loadLocalEnv(): void {
  for (const file of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), file);
    if (existsSync(path)) {
      loadEnv({ path });
      return;
    }
  }
}

export default async function globalSetup() {
  loadLocalEnv();
  if (process.env.SEED_E2E === "0") {
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.warn("e2e globalSetup: DATABASE_URL unset — skipping seed:e2e");
    return;
  }

  execSync("npm run seed:e2e", { stdio: "inherit", cwd: process.cwd() });
}

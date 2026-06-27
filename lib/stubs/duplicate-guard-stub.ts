import type { DuplicateGuardPort } from "@/lib/ports/duplicate-guard";

export function createDuplicateGuardStub(): DuplicateGuardPort {
  return {
    async check() {
      return { ok: true, allowed: true };
    },
  };
}

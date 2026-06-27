import type { ManageTokenPort } from "@/lib/ports/manage-token";

export function createManageTokenStub(): ManageTokenPort {
  return {
    async createForMeeting() {
      return { token: "stub", manageUrl: "/manage/stub" };
    },
    async validate() {
      return { ok: false, code: "INVALID" };
    },
    async revokeForMeeting() {},
  };
}

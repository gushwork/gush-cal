import { manageLinksFromManageUrl } from "@/lib/meeting-tokens/links";
import type { ManageTokenPort } from "@/lib/ports/manage-token";

export function createManageTokenStub(): ManageTokenPort {
  return {
    async createForMeeting(_meetingId, options) {
      const token = options?.token ?? "stub";
      return { token, ...manageLinksFromManageUrl(`/manage/${token}`) };
    },
    async validate() {
      return { ok: false, code: "INVALID" };
    },
    async revokeForMeeting() {},
  };
}

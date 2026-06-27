import { createHash, randomBytes } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getAuthBaseUrl } from "@/lib/auth/base-url";
import { getDb } from "@/lib/db/client";
import { meetingManageTokens, meetings } from "@/lib/db/schema";
import type { ManageTokenPort } from "@/lib/ports/manage-token";
import { TOKEN_EXPIRY_DAYS_AFTER_MEETING } from "./constants";

export function generateManageToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashManageToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function computeTokenExpiry(startsAt: string): string {
  const expiry = new Date(startsAt);
  expiry.setUTCDate(expiry.getUTCDate() + TOKEN_EXPIRY_DAYS_AFTER_MEETING);
  return expiry.toISOString();
}

function buildManageUrl(token: string): string {
  const base = getAuthBaseUrl();
  const path = `/manage/${token}`;
  return base ? `${base}${path}` : path;
}

export function createManageTokenPort(): ManageTokenPort {
  return {
    async createForMeeting(meetingId: string) {
      const db = getDb();

      const [meeting] = await db
        .select({ startsAt: meetings.startsAt })
        .from(meetings)
        .where(eq(meetings.id, meetingId))
        .limit(1);

      if (!meeting) {
        throw new Error("Meeting not found");
      }

      const now = new Date().toISOString();
      await db
        .update(meetingManageTokens)
        .set({ revokedAt: now })
        .where(
          and(
            eq(meetingManageTokens.meetingId, meetingId),
            isNull(meetingManageTokens.revokedAt),
          ),
        );

      const token = generateManageToken();
      await db.insert(meetingManageTokens).values({
        meetingId,
        tokenHash: hashManageToken(token),
        expiresAt: computeTokenExpiry(meeting.startsAt),
      });

      return { token, manageUrl: buildManageUrl(token) };
    },

    async validate(token: string) {
      const db = getDb();
      const tokenHash = hashManageToken(token);

      const [row] = await db
        .select({
          meetingId: meetingManageTokens.meetingId,
          expiresAt: meetingManageTokens.expiresAt,
          revokedAt: meetingManageTokens.revokedAt,
        })
        .from(meetingManageTokens)
        .where(eq(meetingManageTokens.tokenHash, tokenHash))
        .limit(1);

      if (!row) {
        return { ok: false, code: "INVALID" };
      }

      if (row.revokedAt) {
        return { ok: false, code: "REVOKED" };
      }

      if (new Date(row.expiresAt).getTime() <= Date.now()) {
        return { ok: false, code: "EXPIRED" };
      }

      return { ok: true, meetingId: row.meetingId };
    },

    async revokeForMeeting(meetingId: string) {
      const db = getDb();
      const now = new Date().toISOString();

      await db
        .update(meetingManageTokens)
        .set({ revokedAt: now })
        .where(
          and(
            eq(meetingManageTokens.meetingId, meetingId),
            isNull(meetingManageTokens.revokedAt),
          ),
        );
    },
  };
}

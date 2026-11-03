import { getAuthBaseUrl } from "@/lib/auth/base-url";

/** Guest-facing URLs derived from one manage token. */
export type ManageLinks = {
  /** Overview: meeting details with Reschedule and Cancel actions. */
  manageUrl: string;
  /** Opens straight into the reschedule time picker. */
  rescheduleUrl: string;
  /** Opens straight into the cancel confirmation. */
  cancelUrl: string;
};

/** Absolute when `APP_URL`/`AUTH_URL` is set (emails need absolute links). */
export function buildManageLinks(token: string): ManageLinks {
  const base = getAuthBaseUrl() ?? "";
  const manageUrl = `${base}/manage/${token}`;
  return manageLinksFromManageUrl(manageUrl);
}

/** Derives reschedule/cancel URLs from a stored manage URL. */
export function manageLinksFromManageUrl(manageUrl: string): ManageLinks {
  const trimmed = manageUrl.replace(/\/+$/, "");
  return {
    manageUrl: trimmed,
    rescheduleUrl: `${trimmed}/reschedule`,
    cancelUrl: `${trimmed}/cancel`,
  };
}

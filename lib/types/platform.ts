import type { UtcInstant } from "./index";

export type BookingUrlContext = {
  calendarSlug: string;
  teamSlug?: string;
  memberSlug?: string;
};

export type BookingTargetMode = "member" | "team" | "owner";

export type BookingTarget = {
  mode: BookingTargetMode;
  calendarId: string;
  teamId?: string;
  memberId?: string;
};

export type UnbookableOwnerPolicy =
  | "fallback_team_pool"
  | "fallback_team_pool_reassign";

export type OwnerNoSlotsPolicy = "strict_owner" | "overflow_team_pool";

export type TeamSelectionMode = "url_only" | "url_with_default";

export type CalendarRoutingSettings = {
  unbookableOwnerPolicy: UnbookableOwnerPolicy;
  ownerNoSlotsPolicy: OwnerNoSlotsPolicy;
};

export type AssignmentMode =
  | "first_free"
  | "strict_round_robin"
  | "load_balanced_round_robin"
  | "weighted_round_robin"
  | "random";

export type CalendarSchedulingSettings = {
  assignmentMode: AssignmentMode;
  teamSelectionMode: TeamSelectionMode;
  defaultTeamId: string | null;
  rescheduleAssignment: RescheduleAssignmentMode;
  strictRotation: Record<string, string>;
  weightedDeficits: Record<string, Record<string, number>>;
};

export type CalendarTeamPoolSettings = Pick<
  CalendarSchedulingSettings,
  "teamSelectionMode" | "defaultTeamId"
>;

export type DuplicateScope =
  | "calendar"
  | "scheduler"
  | "deployment"
  | "salesforce_connection";

export type DuplicateUxMode = "hard_block" | "soft_warn";

export type CalendarDuplicateSettings = {
  scope: DuplicateScope;
  uxMode: DuplicateUxMode;
};

export type RescheduleAssignmentMode = "keep_member" | "rerun_round_robin";

export type PostBookMode = "confirmation_page" | "redirect";

export type CalendarRedirectSettings = {
  postBookMode: PostBookMode;
  redirectUrlTemplate: string | null;
};

export type ManageUrlInjection = "auto_inject" | "template_opt_in";

export type SyncMode = "sync" | "async";

export type SalesforceSyncSettings = {
  onBook: SyncMode;
  onCancel: SyncMode;
  onReschedule: SyncMode;
  onReassign: SyncMode;
};

export type TriggerOffset = {
  type: "before" | "after";
  minutes: number;
};

export type CalendarSettings = {
  routing: CalendarRoutingSettings;
  scheduling: CalendarSchedulingSettings;
  duplicate: CalendarDuplicateSettings;
  redirect: CalendarRedirectSettings;
  manageUrlInjection: ManageUrlInjection;
  salesforceSync: SalesforceSyncSettings;
  triggerOffsets: TriggerOffset[];
};

export type Team = {
  id: string;
  calendarId: string;
  name: string;
  slug: string;
  sortOrder: number;
};

export type BookingLinkKind = "team" | "member" | "calendar";

export type BookingLink = {
  id: string;
  calendarId: string;
  kind: BookingLinkKind;
  slug: string;
  teamId: string | null;
  memberId: string | null;
  redirectOverride: string | null;
  enabled: boolean;
  publicUrl?: string;
};

export type AppEventType =
  | "meeting.booked"
  | "meeting.cancelled"
  | "meeting.rescheduled"
  | "meeting.reassigned"
  | "meeting.before"
  | "meeting.after"
  | "salesforce.sync_succeeded"
  | "salesforce.sync_failed"
  | "booking.duplicate_blocked"
  | "routing.owner_overflow";

export type SalesforceEventType = "book" | "cancel" | "reschedule" | "reassign";

export type FieldMapping = {
  source:
    | "guestEmail"
    | "startsAt"
    | "memberEmail"
    | "meetingId"
    | "teamSlug"
    | "static";
  staticValue?: string;
  targetFieldApiName: string;
};

export type SalesforceFieldMap = {
  id: string;
  calendarId: string;
  eventType: SalesforceEventType;
  objectApiName: string;
  lookupByEmail: boolean;
  createIfMissing: boolean;
  fieldMappings: FieldMapping[];
};

export type SequenceTimingAnchor =
  | "after_booking"
  | "before_meeting"
  | "after_meeting";

export type SequenceStepAction = "send_email" | "webhook" | "both";

export type EmailSequenceStep = {
  id: string;
  sequenceId: string;
  order: number;
  delayMinutes: number;
  timingAnchor: SequenceTimingAnchor;
  action: SequenceStepAction;
  subjectTemplate?: string;
  bodyTemplate?: string;
  webhookEventType?: AppEventType;
};

export type EmailSequence = {
  id: string;
  calendarId: string;
  name: string;
  enabled: boolean;
  triggerEvent: AppEventType;
};

export type RedirectVars = {
  meetingId: string;
  guestEmail?: string;
  memberEmail?: string;
  startsAt: UtcInstant;
  calendarSlug: string;
  teamSlug?: string;
};

export function defaultCalendarSettings(): CalendarSettings {
  return {
    routing: {
      unbookableOwnerPolicy: "fallback_team_pool_reassign",
      ownerNoSlotsPolicy: "overflow_team_pool",
    },
    scheduling: {
      assignmentMode: "load_balanced_round_robin",
      teamSelectionMode: "url_with_default",
      defaultTeamId: null,
      rescheduleAssignment: "keep_member",
      strictRotation: {},
      weightedDeficits: {},
    },
    duplicate: { scope: "scheduler", uxMode: "hard_block" },
    redirect: { postBookMode: "confirmation_page", redirectUrlTemplate: null },
    manageUrlInjection: "auto_inject",
    salesforceSync: {
      onBook: "async",
      onCancel: "async",
      onReschedule: "async",
      onReassign: "async",
    },
    triggerOffsets: [{ type: "before", minutes: 1440 }],
  };
}

import type {
  CalendarRoutingSettings,
  CalendarSchedulingSettings,
  CalendarSettings,
  RescheduleAssignmentMode,
  SyncMode,
  TeamSelectionMode,
  TriggerOffset,
} from "@/lib/types/platform";
import { defaultCalendarSettings } from "@/lib/types/platform";
import { defaultSchedulingSettings } from "./pool-key";

type LegacySettings = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readTeamSelectionMode(value: unknown): TeamSelectionMode | undefined {
  return value === "url_only" || value === "url_with_default"
    ? value
    : undefined;
}

function readRescheduleAssignment(
  value: unknown,
): RescheduleAssignmentMode | undefined {
  return value === "keep_member" || value === "rerun_round_robin"
    ? value
    : undefined;
}

function mergeScheduling(
  base: CalendarSchedulingSettings,
  patch: Partial<CalendarSchedulingSettings> | undefined,
  legacy: Partial<CalendarSchedulingSettings>,
): CalendarSchedulingSettings {
  const scheduling = { ...base, ...patch, ...legacy };
  return {
    assignmentMode: scheduling.assignmentMode ?? base.assignmentMode,
    teamSelectionMode:
      scheduling.teamSelectionMode ?? base.teamSelectionMode,
    defaultTeamId:
      scheduling.defaultTeamId !== undefined
        ? scheduling.defaultTeamId
        : base.defaultTeamId,
    rescheduleAssignment:
      scheduling.rescheduleAssignment ?? base.rescheduleAssignment,
    strictRotation: {
      ...base.strictRotation,
      ...(patch?.strictRotation ?? {}),
    },
    weightedDeficits: {
      ...base.weightedDeficits,
      ...(patch?.weightedDeficits ?? {}),
    },
  };
}

function slimRouting(raw: LegacySettings | undefined): CalendarRoutingSettings {
  const defaults = defaultCalendarSettings().routing;
  if (!raw) {
    return defaults;
  }
  return {
    unbookableOwnerPolicy:
      raw.unbookableOwnerPolicy === "fallback_team_pool" ||
      raw.unbookableOwnerPolicy === "fallback_team_pool_reassign"
        ? raw.unbookableOwnerPolicy
        : defaults.unbookableOwnerPolicy,
    ownerNoSlotsPolicy:
      raw.ownerNoSlotsPolicy === "strict_owner" ||
      raw.ownerNoSlotsPolicy === "overflow_team_pool"
        ? raw.ownerNoSlotsPolicy
        : defaults.ownerNoSlotsPolicy,
  };
}

function readDuplicate(raw: unknown): CalendarSettings["duplicate"] {
  const d = defaultCalendarSettings().duplicate;
  if (!isRecord(raw)) {
    return d;
  }
  const scope =
    raw.scope === "calendar" ||
    raw.scope === "scheduler" ||
    raw.scope === "deployment" ||
    raw.scope === "salesforce_connection"
      ? raw.scope
      : d.scope;
  const uxMode =
    raw.uxMode === "hard_block" || raw.uxMode === "soft_warn"
      ? raw.uxMode
      : d.uxMode;
  return { scope, uxMode };
}

function readRedirect(raw: unknown): CalendarSettings["redirect"] {
  const d = defaultCalendarSettings().redirect;
  if (!isRecord(raw)) {
    return d;
  }
  const postBookMode =
    raw.postBookMode === "confirmation_page" || raw.postBookMode === "redirect"
      ? raw.postBookMode
      : d.postBookMode;
  const redirectUrlTemplate =
    raw.redirectUrlTemplate === null
      ? null
      : readString(raw.redirectUrlTemplate) ?? d.redirectUrlTemplate;
  return { postBookMode, redirectUrlTemplate };
}

function readSyncMode(value: unknown, fallback: SyncMode): SyncMode {
  return value === "sync" || value === "async" ? value : fallback;
}

function readSalesforceSync(raw: unknown): CalendarSettings["salesforceSync"] {
  const d = defaultCalendarSettings().salesforceSync;
  if (!isRecord(raw)) {
    return d;
  }
  return {
    onBook: readSyncMode(raw.onBook, d.onBook),
    onCancel: readSyncMode(raw.onCancel, d.onCancel),
    onReschedule: readSyncMode(raw.onReschedule, d.onReschedule),
    onReassign: readSyncMode(raw.onReassign, d.onReassign),
  };
}

function readTriggerOffsets(raw: unknown): TriggerOffset[] {
  if (!Array.isArray(raw)) {
    return defaultCalendarSettings().triggerOffsets;
  }
  return raw.filter(
    (offset): offset is TriggerOffset =>
      isRecord(offset) &&
      (offset.type === "before" || offset.type === "after") &&
      typeof offset.minutes === "number" &&
      Number.isFinite(offset.minutes) &&
      offset.minutes >= 0,
  );
}

export function normalizeCalendarSettings(raw: unknown): CalendarSettings {
  const defaults = defaultCalendarSettings();
  if (!isRecord(raw)) {
    return defaults;
  }

  const routingRaw = isRecord(raw.routing) ? raw.routing : undefined;
  const schedulingRaw = isRecord(raw.scheduling) ? raw.scheduling : undefined;

  const legacyTeamSelection =
    readTeamSelectionMode(routingRaw?.teamSelectionMode) ??
    readTeamSelectionMode(raw.teamSelectionMode);
  const legacyDefaultTeamId =
    routingRaw?.defaultTeamId === null
      ? null
      : readString(routingRaw?.defaultTeamId) ??
        (raw.defaultTeamId === null
          ? null
          : readString(raw.defaultTeamId));
  const legacyReschedule =
    readRescheduleAssignment(raw.rescheduleAssignment) ??
    readRescheduleAssignment(schedulingRaw?.rescheduleAssignment);

  const schedulingPatch: Partial<CalendarSchedulingSettings> | undefined =
    schedulingRaw
      ? {
          assignmentMode:
            schedulingRaw.assignmentMode === "first_free" ||
            schedulingRaw.assignmentMode === "strict_round_robin" ||
            schedulingRaw.assignmentMode === "load_balanced_round_robin" ||
            schedulingRaw.assignmentMode === "weighted_round_robin" ||
            schedulingRaw.assignmentMode === "random"
              ? schedulingRaw.assignmentMode
              : undefined,
          teamSelectionMode: readTeamSelectionMode(
            schedulingRaw.teamSelectionMode,
          ),
          defaultTeamId:
            schedulingRaw.defaultTeamId === null
              ? null
              : readString(schedulingRaw.defaultTeamId),
          rescheduleAssignment: readRescheduleAssignment(
            schedulingRaw.rescheduleAssignment,
          ),
        }
      : undefined;

  const legacyScheduling: Partial<CalendarSchedulingSettings> = {};
  if (legacyReschedule !== undefined) {
    legacyScheduling.rescheduleAssignment = legacyReschedule;
  }
  if (legacyTeamSelection !== undefined) {
    legacyScheduling.teamSelectionMode = legacyTeamSelection;
  }
  if (legacyDefaultTeamId !== undefined) {
    legacyScheduling.defaultTeamId = legacyDefaultTeamId;
  }

  const scheduling = mergeScheduling(
    defaultSchedulingSettings(),
    schedulingPatch,
    legacyScheduling,
  );

  return {
    routing: slimRouting(routingRaw),
    scheduling,
    duplicate: readDuplicate(raw.duplicate),
    redirect: readRedirect(raw.redirect),
    manageUrlInjection:
      raw.manageUrlInjection === "auto_inject" ||
      raw.manageUrlInjection === "template_opt_in"
        ? raw.manageUrlInjection
        : defaults.manageUrlInjection,
    salesforceSync: readSalesforceSync(raw.salesforceSync),
    triggerOffsets: readTriggerOffsets(raw.triggerOffsets),
  };
}

/** Strip server-managed rotation state from client-facing PATCH payloads. */
export function stripServerSchedulingFields(
  patch: Partial<CalendarSchedulingSettings>,
): Partial<CalendarSchedulingSettings> {
  const { strictRotation: _s, weightedDeficits: _w, ...rest } = patch;
  return rest;
}

export function mergeCalendarSettings(
  current: CalendarSettings,
  patch: Partial<CalendarSettings>,
): CalendarSettings {
  const merged = normalizeCalendarSettings({
    ...current,
    routing: { ...current.routing, ...patch.routing },
    scheduling: {
      ...current.scheduling,
      ...stripServerSchedulingFields(patch.scheduling ?? {}),
    },
    duplicate: { ...current.duplicate, ...patch.duplicate },
    redirect: { ...current.redirect, ...patch.redirect },
    manageUrlInjection: patch.manageUrlInjection ?? current.manageUrlInjection,
    salesforceSync: { ...current.salesforceSync, ...patch.salesforceSync },
    triggerOffsets: patch.triggerOffsets ?? current.triggerOffsets,
    rescheduleAssignment: patch.scheduling?.rescheduleAssignment,
  });

  return {
    ...merged,
    scheduling: {
      ...merged.scheduling,
      strictRotation: current.scheduling.strictRotation,
      weightedDeficits: current.scheduling.weightedDeficits,
    },
  };
}

/** Settings safe for admin GET (omit server-managed maps). */
export function clientCalendarSettings(
  settings: CalendarSettings,
): CalendarSettings {
  return {
    ...settings,
    scheduling: {
      ...settings.scheduling,
      strictRotation: {},
      weightedDeficits: {},
    },
  };
}

import {
  calendarMembers,
  calendarSettings,
  emailSequenceSteps,
  emailSequences,
  meetings,
  scheduledTriggers,
} from "@/lib/db/schema";
import type { CalendarSettings } from "@/lib/types/platform";

type SequenceRow = {
  id: string;
  calendarId: string;
  name: string;
  enabled: boolean;
  triggerEvent: string;
};

type StepRow = {
  id: string;
  sequenceId: string;
  stepOrder: number;
  delayMinutes: number;
  timingAnchor: "after_booking" | "before_meeting" | "after_meeting";
  action: "send_email" | "webhook" | "both";
  subjectTemplate: string | null;
  bodyTemplate: string | null;
};

type MeetingRow = {
  id: string;
  calendarId: string;
  assignedMemberId: string;
  startsAt: string;
  guestEmail: string | null;
  cancelledAt: string | null;
};

type MemberRow = {
  id: string;
  calendarId: string;
  email: string;
};

type TriggerRow = {
  id: string;
  calendarId: string;
  meetingId: string;
  triggerType: string;
  fireAt: string;
  status: string;
  payload: Record<string, unknown> | null;
};

type SettingsRow = { calendarId: string; settings: CalendarSettings };

function snakeToCamel(name: string): string {
  return name.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function parseEq(sql: { queryChunks?: unknown[] }): {
  column: string;
  value: unknown;
} | null {
  const chunks = sql.queryChunks ?? [];
  const col = chunks.find(
    (chunk) =>
      chunk &&
      typeof chunk === "object" &&
      "name" in chunk &&
      typeof (chunk as { name?: string }).name === "string",
  ) as { name: string } | undefined;
  const param = chunks.find(
    (chunk) =>
      chunk &&
      typeof chunk === "object" &&
      chunk.constructor?.name === "Param",
  ) as { value: unknown } | undefined;
  if (!col?.name || !param) {
    return null;
  }
  return { column: snakeToCamel(col.name), value: param.value };
}

function chunkText(chunk: unknown): string | null {
  if (typeof chunk === "string") {
    return chunk;
  }
  if (
    chunk &&
    typeof chunk === "object" &&
    (chunk as { constructor?: { name?: string } }).constructor?.name ===
      "StringChunk"
  ) {
    const value = (chunk as { value?: string | string[] }).value;
    if (Array.isArray(value)) {
      return value.join("");
    }
    if (typeof value === "string") {
      return value;
    }
  }
  return null;
}

function parseLte(sql: { queryChunks?: unknown[] }): {
  column: string;
  value: unknown;
} | null {
  const chunks = sql.queryChunks ?? [];
  const hasLte = chunks.some((chunk) => {
    const text = chunkText(chunk);
    return text?.includes("<=") ?? false;
  });
  if (!hasLte) {
    return null;
  }
  return parseEq(sql);
}

function predicateFromSql(sql: { queryChunks?: unknown[] }): ((row: Record<string, unknown>) => boolean) | null {
  const lteClause = parseLte(sql);
  if (lteClause) {
    return (row) => {
      const rowVal = row[lteClause.column];
      if (typeof rowVal !== "string" || typeof lteClause.value !== "string") {
        return false;
      }
      return rowVal <= lteClause.value;
    };
  }

  const eqClause = parseEq(sql);
  if (eqClause) {
    return (row) => row[eqClause.column] === eqClause.value;
  }

  return null;
}

function extractPredicates(
  condition: unknown,
): Array<(row: Record<string, unknown>) => boolean> {
  if (!condition || typeof condition !== "object") {
    return [];
  }

  const sql = condition as { queryChunks?: unknown[] };
  const direct = predicateFromSql(sql);
  if (direct) {
    return [direct];
  }

  const nested = (sql.queryChunks ?? []).flatMap((chunk) => {
    if (chunk && typeof chunk === "object" && "queryChunks" in chunk) {
      return extractPredicates(chunk);
    }
    return [];
  });

  return nested;
}

function conditionMatcher(condition: unknown): (row: Record<string, unknown>) => boolean {
  const predicates = extractPredicates(condition);
  if (predicates.length === 0) {
    return () => true;
  }
  return (row) => predicates.every((predicate) => predicate(row));
}

function tableRows(table: unknown, store: EmailTestStore): Record<string, unknown>[] {
  if (table === emailSequences) {
    return store.sequences;
  }
  if (table === emailSequenceSteps) {
    return store.steps;
  }
  if (table === meetings) {
    return store.meetings;
  }
  if (table === calendarMembers) {
    return store.members;
  }
  if (table === calendarSettings) {
    return store.settings;
  }
  if (table === scheduledTriggers) {
    return store.triggers;
  }
  return [];
}

function pushRow(table: unknown, store: EmailTestStore, row: Record<string, unknown>) {
  if (table === emailSequences) {
    store.sequences.push(row as SequenceRow);
    return;
  }
  if (table === emailSequenceSteps) {
    store.steps.push(row as StepRow);
    return;
  }
  if (table === meetings) {
    store.meetings.push(row as MeetingRow);
    return;
  }
  if (table === scheduledTriggers) {
    store.triggers.push(row as TriggerRow);
  }
}

export type EmailTestStore = {
  sequences: SequenceRow[];
  steps: StepRow[];
  meetings: MeetingRow[];
  members: MemberRow[];
  settings: SettingsRow[];
  triggers: TriggerRow[];
};

export function createEmailTestDb() {
  const store: EmailTestStore = {
    sequences: [],
    steps: [],
    meetings: [],
    members: [],
    settings: [],
    triggers: [],
  };

  const db = {
    select: (projection?: Record<string, unknown>) => ({
      from: (table: unknown) => {
        const base = {
          where: (condition: unknown) => {
            const filtered = tableRows(table, store).filter((row) =>
              conditionMatcher(condition)(row),
            );
            return {
              limit: async (n: number) => {
                if (projection) {
                  return filtered.slice(0, n).map((row) => {
                    const out: Record<string, unknown> = {};
                    for (const [key, col] of Object.entries(projection)) {
                      if (key === "value") {
                        continue;
                      }
                      const colName = snakeToCamel(
                        (col as { name: string }).name,
                      );
                      out[key] = row[colName];
                    }
                    return out;
                  });
                }
                return filtered.slice(0, n);
              },
              orderBy: async () => {
                const sorted = [...filtered].sort(
                  (a, b) => (a.stepOrder as number) - (b.stepOrder as number),
                );
                return sorted;
              },
              then: (
                resolve: (value: unknown) => void,
                reject?: (reason: unknown) => void,
              ) => Promise.resolve(filtered).then(resolve, reject),
            };
          },
          orderBy: async () => {
            const rows = [...tableRows(table, store)];
            if (table === emailSequenceSteps) {
              rows.sort((a, b) => (a.stepOrder as number) - (b.stepOrder as number));
            }
            if (table === emailSequences) {
              rows.sort((a, b) => (a.name as string).localeCompare(b.name as string));
            }
            return rows;
          },
          innerJoin: () => ({
            where: async (condition: unknown) => {
              const seqRows = store.sequences.filter((row) =>
                conditionMatcher(condition)(row),
              );
              return seqRows.map((seq) => ({
                ...seq,
                sequenceId: seq.id,
              }));
            },
          }),
          then: (
            resolve: (value: unknown) => void,
            reject?: (reason: unknown) => void,
          ) => Promise.resolve(tableRows(table, store)).then(resolve, reject),
        };
        return base;
      },
    }),
    insert: (table: unknown) => ({
      values: (vals: Record<string, unknown> | Record<string, unknown>[]) => {
        const rows = Array.isArray(vals) ? vals : [vals];
        const inserted = rows.map((row) => {
          const withId = {
            ...row,
            id: (row.id as string | undefined) ?? crypto.randomUUID(),
          };
          pushRow(table, store, withId);
          return withId;
        });
        return {
          returning: async () => inserted,
          then: (
            resolve: (value: unknown) => void,
            reject?: (reason: unknown) => void,
          ) => Promise.resolve(inserted).then(resolve, reject),
        };
      },
    }),
    update: (table: unknown) => ({
      set: (patch: Record<string, unknown>) => ({
        where: (condition: unknown) => {
          const apply = () => {
            const updated: Record<string, unknown>[] = [];
            for (const row of tableRows(table, store)) {
              if (!conditionMatcher(condition)(row)) {
                continue;
              }
              Object.assign(row, patch);
              updated.push({ ...row });
            }
            return updated;
          };
          return {
            returning: async () => apply(),
            then: (
              resolve: (value: unknown) => void,
              reject?: (reason: unknown) => void,
            ) => Promise.resolve(apply()).then(resolve, reject),
          };
        },
      }),
    }),
    delete: (table: unknown) => ({
      where: (condition: unknown) => {
        const apply = () => {
          const deleted: Record<string, unknown>[] = [];
          const rows = tableRows(table, store);
          for (let i = rows.length - 1; i >= 0; i--) {
            if (conditionMatcher(condition)(rows[i]!)) {
              deleted.push({ ...rows[i]! });
              rows.splice(i, 1);
            }
          }
          if (table === emailSequences) {
            const deletedIds = new Set(deleted.map((d) => d.id as string));
            store.steps = store.steps.filter((s) => !deletedIds.has(s.sequenceId));
          }
          return deleted;
        };
        return {
          returning: async () => apply(),
          then: (
            resolve: (value: unknown) => void,
            reject?: (reason: unknown) => void,
          ) => Promise.resolve(apply()).then(resolve, reject),
        };
      },
    }),
  };

  return { db, store };
}

import {
  calendarMembers,
  calendarSettings,
  teamMembers,
  teams,
} from "@/lib/db/schema";
import type { CalendarSettings } from "@/lib/types/platform";

type TeamRow = {
  id: string;
  calendarId: string;
  name: string;
  slug: string;
  sortOrder: number;
};

type TeamMemberRow = { teamId: string; memberId: string };
type MemberRow = { id: string; calendarId: string };
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

function conditionMatcher(condition: unknown): (row: Record<string, unknown>) => boolean {
  const sql = condition as { queryChunks?: unknown[] };
  const chunks = sql.queryChunks ?? [];

  if (chunks.length === 3 && chunks[1] && typeof chunks[1] === "object") {
    const inner = chunks[1] as { queryChunks?: unknown[] };
    const parts = (inner.queryChunks ?? []).filter(
      (chunk) =>
        chunk &&
        typeof chunk === "object" &&
        "queryChunks" in (chunk as object),
    ) as { queryChunks?: unknown[] }[];
    if (parts.length > 0) {
      const predicates = parts.map((part) => conditionMatcher(part));
      return (row) => predicates.every((predicate) => predicate(row));
    }
  }

  const eqClause = parseEq(sql);
  if (eqClause) {
    return (row) => row[eqClause.column] === eqClause.value;
  }

  return () => true;
}

function tableRows(table: unknown, store: TeamsTestStore): Record<string, unknown>[] {
  if (table === teams) {
    return store.teams;
  }
  if (table === teamMembers) {
    return store.teamMembers;
  }
  if (table === calendarMembers) {
    return store.members;
  }
  if (table === calendarSettings) {
    return store.settings;
  }
  return [];
}

function pushRow(table: unknown, store: TeamsTestStore, row: Record<string, unknown>) {
  if (table === teams) {
    store.teams.push(row as TeamRow);
    return;
  }
  if (table === teamMembers) {
    store.teamMembers.push(row as TeamMemberRow);
    return;
  }
  if (table === calendarMembers) {
    store.members.push(row as MemberRow);
  }
}

export type TeamsTestStore = {
  teams: TeamRow[];
  teamMembers: TeamMemberRow[];
  members: MemberRow[];
  settings: SettingsRow[];
};

export function createTeamsTestDb() {
  const store: TeamsTestStore = {
    teams: [],
    teamMembers: [],
    members: [],
    settings: [],
  };

  const db = {
    select: (projection?: Record<string, unknown>) => ({
      from: (table: unknown) => {
        if (projection && "value" in projection) {
          return {
            from: (t: unknown) => ({
              where: async (condition: unknown) => {
                const rows = tableRows(t, store).filter((row) =>
                  conditionMatcher(condition)(row),
                );
                const orders = rows.map((row) => row.sortOrder as number);
                return [{ value: orders.length ? Math.max(...orders) : null }];
              },
            }),
          };
        }

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
                  (a, b) => (a.sortOrder as number) - (b.sortOrder as number),
                );
                return sorted;
              },
              then: (resolve: (value: unknown) => void) => resolve(filtered),
            };
          },
          orderBy: async () => {
            const rows = [...tableRows(table, store)].sort(
              (a, b) => (a.sortOrder as number) - (b.sortOrder as number),
            );
            return rows;
          },
          then: (resolve: (value: unknown) => void) =>
            resolve(tableRows(table, store)),
        };
        return base;
      },
    }),
    insert: (table: unknown) => ({
      values: (vals: Record<string, unknown> | Record<string, unknown>[]) => {
        const rows = Array.isArray(vals) ? vals : [vals];
        const insertRows = () =>
          rows.map((row) => {
            const withId = {
              ...row,
              id: (row.id as string | undefined) ?? crypto.randomUUID(),
            };
            pushRow(table, store, withId);
            return withId;
          });
        const inserted = insertRows();
        const result = {
          returning: async () => inserted,
          then: (
            resolve: (value: unknown) => void,
            reject?: (reason: unknown) => void,
          ) => Promise.resolve(inserted).then(resolve, reject),
        };
        return result;
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
          return deleted;
        };
        return {
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

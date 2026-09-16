export interface ClassView {
    id: string;
    batchName: string;
    teacher: string;
    startsAt: string;
    endsAt: string;
    /** When the join window actually opens (see lib/class-schedule.ts joinWindow) — display this instead of a hardcoded "X min before", which has drifted from the real value before. */
    joinOpensAt: string;
    status: string;
    joinable: boolean;
    /** Whether this caller has a ClassAttendance row for this instance — per-member, not the instance's own Scheduled/Completed/Cancelled status. */
    attended: boolean;
}

export interface SessionBalanceInfo {
    cycleStart: string;
    cycleEnd: string;
    granted: number;
    used: number;
    remaining: number;
    perCycle: number;
}

export type ClassAccessInfo =
    | { ok: true; sessionBalance?: SessionBalanceInfo | null; starter?: { used: number; limit: number } | null }
    | {
          ok: false;
          reason: string;
          paywall: boolean;
          outOfSessions?: boolean;
          sessionBalance?: SessionBalanceInfo | null;
          starter?: { used: number; limit: number } | null;
      };

export interface ClassesResponse {
    today: ClassView[];
    upcoming: ClassView[];
    access: ClassAccessInfo;
}

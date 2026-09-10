export interface ClassView {
  id: string;
  batchName: string;
  teacher: string;
  startsAt: string;
  endsAt: string;
  status: string;
  joinable: boolean;
}

export type ClassAccess =
  | { ok: true; starter?: { used: number; limit: number } }
  | { ok: false; reason: string; paywall: boolean; starter?: { used: number; limit: number } };

export interface ClassesResponse {
  today: ClassView[];
  upcoming: ClassView[];
  access: ClassAccess;
}

export interface BookingRow {
  id: string;
  type: "THERAPY_SESSION" | "CONSULTATION" | "SPECIAL_SESSION";
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  date: string;
  teacher: string;
  notes: string | null;
  hasMeetingLink: boolean;
}

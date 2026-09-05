export interface BookingRow {
    id: string;
    type?: string;
    status: string;
    date: string;
    time?: string;
    recurring?: boolean;
    notes?: string | null;
    teacher?: { name: string | null } | null;
}

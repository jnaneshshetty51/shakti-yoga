export type Series = { label: string; value: number }[];
export type RangeKey = "7d" | "30d" | "90d";

export interface Dashboard {
    generatedAt: string;
    range: string;
    partial: boolean;
    stats: {
        activeMembers: number;
        everydayMembers: number;
        therapyMembers: number;
        trialUsers: number;
        mrr: number;
        newMembers: number;
        newMembersDelta: number | null;
        lapsed: number;
        lapsedDelta: number | null;
        paused: number;
        renewalRevenue7d: number;
        renewalRevenue30d: number;
    };
    attention: {
        pendingBookings: number;
        unhandledMessages: number;
        newLeads: number;
        expiringSoon: number;
        failedPayments7d: number;
        therapyOutOfCredits: number;
        contentDrafts: number;
        bookingsNoLink: number;
        dormantMembers: number;
    };
    trends: { signups: Series; revenue: Series; attendance: Series };
    trialFunnel: {
        requested: number; scheduled: number; attended: number;
        converted: number; noShow: number; conversionRate: number;
    } | null;
    teacherLoad: { id: string; name: string; batches: number; upcomingSessions: number; hasAvailability: boolean }[];
    upcomingSessions: {
        id: string; member: string; teacher: string; type: string;
        status: string; at: string; hasLink: boolean;
    }[];
    upcomingClasses: { id: string; name: string; teacher: string; at: string; attendanceCount: number }[];
    activity: { id: string; kind: string; message: string; at: string }[];
    recentSignups: { id: string; name: string; email: string; role: string; plan: string | null; at: string }[];
    classFill: { classes: number; eligible: number; avgAttendees: number; rate: number };
    planMix: { label: string; value: number }[];
}

export const inr = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

export const inrShort = (n: number) =>
    n >= 1e7 ? `₹${(n / 1e7).toFixed(1)}Cr`
        : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L`
            : n >= 1e3 ? `₹${(n / 1e3).toFixed(1)}k`
                : `₹${Math.round(n)}`;

export function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(diff)) return "";
    const m = Math.round(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function whenLabel(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now.getTime() + 86400000).toDateString() === d.toDateString();
    const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
    if (sameDay) return `Today ${time}`;
    if (tomorrow) return `Tomorrow ${time}`;
    return `${d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} ${time}`;
}

export const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
    { value: "7d", label: "7d" },
    { value: "30d", label: "30d" },
    { value: "90d", label: "90d" },
];

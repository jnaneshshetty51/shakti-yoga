"use client";

import Link from "next/link";
import { LuUserPlus, LuCreditCard, LuCalendarPlus, LuMegaphone } from "react-icons/lu";
import { Card, CardHeader } from "@/components/admin/ui";

const ACTIONS = [
    { label: "Add lead", href: "/admin/crm?tab=leads", icon: LuUserPlus, hint: "A prospective student, before they convert" },
    { label: "Record payment", href: "/admin/finance?tab=payments", icon: LuCreditCard, hint: "Cash, UPI, or bank transfer" },
    { label: "New class batch", href: "/admin/classes?tab=batches", icon: LuCalendarPlus, hint: "Recurring weekly slot" },
    { label: "Send broadcast", href: "/admin/content?tab=broadcast", icon: LuMegaphone, hint: "Push notification to a segment" },
];

/** One-click jumps to the four "New" actions staff reach for most — each lands
 *  exactly where the real create control already lives, not a duplicate form. */
export function QuickActions() {
    return (
        <Card>
            <CardHeader title="Quick actions" />
            <div className="p-3 grid grid-cols-2 gap-2">
                {ACTIONS.map((a) => (
                    <Link
                        key={a.href}
                        href={a.href}
                        className="group flex flex-col gap-1.5 p-3 rounded-control border border-hairline hover:border-brand/30 hover:bg-brand/5 transition-colors"
                    >
                        <span className="w-8 h-8 rounded-control bg-brand/10 text-brand flex items-center justify-center">
                            <a.icon className="w-4 h-4" />
                        </span>
                        <span className="text-sm font-medium text-ink">{a.label}</span>
                        <span className="text-xs text-ink-subtle leading-snug">{a.hint}</span>
                    </Link>
                ))}
            </div>
        </Card>
    );
}

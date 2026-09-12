"use client";

import { useCallback, useEffect, useState } from "react";
import { SuperAdminGuard } from "@/components/admin/SuperAdminGuard";
import { PageHeader, PageLoading, Card, Badge, labelClass } from "@/components/admin/ui";

interface Settings {
    platformName: string;
    supportEmail: string;
    defaultTimezone: string;
    teacher_rate_class: string;
    teacher_rate_session: string;
    flag_iapEnabled: string;
    flag_annualDefault: string;
    flag_showStarter: string;
    flag_showFamily: string;
    flag_trialPaywallDay: string;
    social_instagram_url: string;
    social_youtube_url: string;
    social_facebook_url: string;
    social_whatsapp_url: string;
}

const SOCIAL_META: { key: keyof Settings; label: string; placeholder: string }[] = [
    { key: "social_instagram_url", label: "Instagram", placeholder: "https://instagram.com/shaktiyogakendra" },
    { key: "social_youtube_url", label: "YouTube", placeholder: "https://youtube.com/@shaktiyogakendra" },
    { key: "social_facebook_url", label: "Facebook", placeholder: "https://facebook.com/shaktiyogakendra" },
    { key: "social_whatsapp_url", label: "WhatsApp", placeholder: "https://wa.me/91XXXXXXXXXX" },
];

const FLAG_META: { key: keyof Settings; label: string; hint: string; type: "bool" | "num" }[] = [
    { key: "flag_iapEnabled", label: "In-app purchases", hint: "Use Apple/Google billing in the app where available (else web checkout)", type: "bool" },
    { key: "flag_annualDefault", label: "Default to annual", hint: "Paywall opens on the annual toggle", type: "bool" },
    { key: "flag_showStarter", label: "Show Starter tier", hint: "The ₹699 / 2-classes-a-week rung", type: "bool" },
    { key: "flag_showFamily", label: "Show Family plan", hint: "Two-member plan", type: "bool" },
    { key: "flag_trialPaywallDay", label: "Trial paywall day", hint: "Day of the 7-day trial the hard paywall appears", type: "num" },
];

interface Integrations {
    razorpay: boolean;
    minio: boolean;
}

export default function AdminSettingsPage() {
    return (
        <SuperAdminGuard>
            <SettingsInner />
        </SuperAdminGuard>
    );
}

function SettingsInner() {
    const [settings, setSettings] = useState<Settings>({
        platformName: "", supportEmail: "", defaultTimezone: "IST",
        teacher_rate_class: "500", teacher_rate_session: "800",
        flag_iapEnabled: "true", flag_annualDefault: "true", flag_showStarter: "true",
        flag_showFamily: "true", flag_trialPaywallDay: "6",
        social_instagram_url: "", social_youtube_url: "", social_facebook_url: "",
        social_whatsapp_url: "https://wa.me/917760222478",
    });
    const [integrations, setIntegrations] = useState<Integrations>({ razorpay: false, minio: false });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/settings");
            if (res.ok) {
                const data = await res.json();
                setSettings(data.settings);
                setIntegrations(data.integrations);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setStatus(null);
        try {
            const res = await fetch("/api/admin/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            if (!res.ok) throw new Error("Save failed");
            setStatus("Settings saved.");
        } catch {
            setStatus("Could not save settings.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <PageLoading title="Platform Settings" />;

    const integrationRow = (name: string, connected: boolean, hint: string) => (
        <div className="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-xl">
            <div>
                <div className="font-semibold text-sm text-gray-800">{name}</div>
                <div className="text-xs text-gray-500">{connected ? "Configured" : `Not configured — ${hint}`}</div>
            </div>
            <Badge tone={connected ? "green" : "gray"}>{connected ? "Connected" : "Off"}</Badge>
        </div>
    );

    return (
        <div>
            <PageHeader title="Platform Settings" subtitle="General settings and integration status." />

            {status && (
                <div className="mb-6 p-3 rounded-xl bg-accent/40 border border-primary/10 text-sm text-text max-w-3xl">{status}</div>
            )}

            <form onSubmit={save} className="max-w-3xl">
                <Card padded>
                    <h2 className="font-bold text-gray-800 mb-6">General Configuration</h2>

                    <div className="space-y-5">
                        <div>
                            <label className={labelClass}>Platform Name</label>
                            <input
                                type="text"
                                value={settings.platformName}
                                onChange={(e) => setSettings(s => ({ ...s, platformName: e.target.value }))}
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
                            />
                        </div>

                        <div>
                            <label className={labelClass}>Support Email</label>
                            <input
                                type="email"
                                value={settings.supportEmail}
                                onChange={(e) => setSettings(s => ({ ...s, supportEmail: e.target.value }))}
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
                            />
                        </div>

                        <div>
                            <label className={labelClass}>Default Timezone</label>
                            <select
                                value={settings.defaultTimezone}
                                onChange={(e) => setSettings(s => ({ ...s, defaultTimezone: e.target.value }))}
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
                            >
                                <option value="IST">IST (India Standard Time)</option>
                                <option value="UTC">UTC</option>
                            </select>
                        </div>

                        <div className="pt-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <h3 className="font-bold text-gray-800">Teacher payout rates (₹)</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Used for the estimate on each teacher&rsquo;s Earnings screen.</p>
                            </div>
                            <div>
                                <label className={labelClass}>Per completed class</label>
                                <input
                                    type="number" min={0}
                                    value={settings.teacher_rate_class}
                                    onChange={(e) => setSettings((s) => ({ ...s, teacher_rate_class: e.target.value }))}
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Per completed 1:1 session</label>
                                <input
                                    type="number" min={0}
                                    value={settings.teacher_rate_session}
                                    onChange={(e) => setSettings((s) => ({ ...s, teacher_rate_session: e.target.value }))}
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
                                />
                            </div>
                        </div>

                        <div className="pt-5 border-t border-gray-100 space-y-3">
                            <h3 className="font-bold text-gray-800">Paywall &amp; pricing</h3>
                            <p className="text-xs text-gray-500">Takes effect on the next app launch — no deploy needed.</p>
                            {FLAG_META.map((f) =>
                                f.type === "bool" ? (
                                    <label key={f.key} className="flex items-start gap-3 py-1 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="mt-1 h-4 w-4 accent-primary"
                                            checked={settings[f.key] === "true"}
                                            onChange={(e) => setSettings((s) => ({ ...s, [f.key]: e.target.checked ? "true" : "false" }))}
                                        />
                                        <span>
                                            <span className="text-sm font-medium text-gray-800">{f.label}</span>
                                            <span className="block text-xs text-gray-500">{f.hint}</span>
                                        </span>
                                    </label>
                                ) : (
                                    <div key={f.key}>
                                        <label className={labelClass}>{f.label}</label>
                                        <input
                                            type="number" min={0} max={7}
                                            value={settings[f.key]}
                                            onChange={(e) => setSettings((s) => ({ ...s, [f.key]: e.target.value }))}
                                            className="w-28 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                        <span className="ml-2 text-xs text-gray-500">{f.hint}</span>
                                    </div>
                                ),
                            )}
                        </div>

                        <div className="pt-5 border-t border-gray-100 space-y-3">
                            <h3 className="font-bold text-gray-800">Social Links</h3>
                            <p className="text-xs text-gray-500">Shown in the website footer. Leave blank to hide an icon.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {SOCIAL_META.map((f) => (
                                    <div key={f.key}>
                                        <label className={labelClass}>{f.label}</label>
                                        <input
                                            type="url"
                                            value={settings[f.key]}
                                            placeholder={f.placeholder}
                                            onChange={(e) => setSettings((s) => ({ ...s, [f.key]: e.target.value }))}
                                            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-5 border-t border-gray-100 space-y-3">
                            <h3 className="font-bold text-gray-800">Integrations</h3>
                            {integrationRow("Razorpay Payments", integrations.razorpay, "set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET")}
                            {integrationRow("MinIO Storage", integrations.minio, "set MINIO_ENDPOINT / MINIO_ACCESS_KEY")}
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
                        >
                            {saving ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                </Card>
            </form>
        </div>
    );
}

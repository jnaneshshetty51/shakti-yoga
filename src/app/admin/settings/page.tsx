"use client";

import { useCallback, useEffect, useState } from "react";

interface Settings {
    platformName: string;
    supportEmail: string;
    defaultTimezone: string;
}

interface Integrations {
    razorpay: boolean;
    daily: boolean;
    minio: boolean;
}

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<Settings>({ platformName: "", supportEmail: "", defaultTimezone: "IST" });
    const [integrations, setIntegrations] = useState<Integrations>({ razorpay: false, daily: false, minio: false });
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

    if (loading) {
        return (
            <div>
                <h1 className="font-serif text-3xl text-gray-800 mb-2">Platform Settings</h1>
                <div className="text-gray-500 mt-8">Loading...</div>
            </div>
        );
    }

    const integrationRow = (name: string, connected: boolean, hint: string) => (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded mb-3">
            <div>
                <div className="font-bold text-sm">{name}</div>
                <div className="text-xs text-gray-500">{connected ? "Configured" : `Not configured — ${hint}`}</div>
            </div>
            <span className={`text-xs font-bold uppercase ${connected ? "text-green-600" : "text-gray-400"}`}>
                {connected ? "Connected" : "Off"}
            </span>
        </div>
    );

    return (
        <div>
            <div className="mb-8">
                <h1 className="font-serif text-3xl text-gray-800 mb-2">Platform Settings</h1>
                <p className="text-gray-500">General settings and integration status.</p>
            </div>

            {status && (
                <div className="mb-6 p-3 rounded bg-accent/40 border border-primary/10 text-sm text-text max-w-3xl">{status}</div>
            )}

            <form onSubmit={save} className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 max-w-3xl">
                <h2 className="font-bold text-lg text-gray-800 mb-6">General Configuration</h2>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-text/60 uppercase tracking-wider mb-2">Platform Name</label>
                        <input
                            type="text"
                            value={settings.platformName}
                            onChange={(e) => setSettings(s => ({ ...s, platformName: e.target.value }))}
                            className="w-full p-3 border border-gray-200 rounded"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-text/60 uppercase tracking-wider mb-2">Support Email</label>
                        <input
                            type="email"
                            value={settings.supportEmail}
                            onChange={(e) => setSettings(s => ({ ...s, supportEmail: e.target.value }))}
                            className="w-full p-3 border border-gray-200 rounded"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-text/60 uppercase tracking-wider mb-2">Default Timezone</label>
                        <select
                            value={settings.defaultTimezone}
                            onChange={(e) => setSettings(s => ({ ...s, defaultTimezone: e.target.value }))}
                            className="w-full p-3 border border-gray-200 rounded"
                        >
                            <option value="IST">IST (India Standard Time)</option>
                            <option value="UTC">UTC</option>
                        </select>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4">Integrations</h3>
                        {integrationRow("Razorpay Payments", integrations.razorpay, "set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET")}
                        {integrationRow("Daily.co Live Video", integrations.daily, "set DAILY_API_KEY")}
                        {integrationRow("MinIO Storage", integrations.minio, "set MINIO_ENDPOINT / MINIO_ACCESS_KEY")}
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-3 bg-primary text-white font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors disabled:opacity-60"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </div>
    );
}

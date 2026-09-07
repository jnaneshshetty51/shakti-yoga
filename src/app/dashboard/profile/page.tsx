"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, PageLoading, Card, inputClass, labelClass } from "@/components/ui";

interface ProfileForm {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    timezone: string;
    goal: string;
    conditions: string;
    emailPref: boolean;
    whatsappPref: boolean;
    phonePref: boolean;
}

const EMPTY_FORM: ProfileForm = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    timezone: "IST",
    goal: "Stress Relief",
    conditions: "",
    emailPref: true,
    whatsappPref: false,
    phonePref: false,
};

function prefsToString(form: ProfileForm): string {
    return [form.emailPref && "Email", form.whatsappPref && "WhatsApp", form.phonePref && "Phone"]
        .filter(Boolean)
        .join(",");
}

export default function ProfilePage() {
    const { refreshUser } = useAuth();
    const [formData, setFormData] = useState<ProfileForm>(EMPTY_FORM);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadProfile = useCallback(async () => {
        try {
            const res = await fetch("/api/profile");
            if (!res.ok) throw new Error("Failed to load profile");
            const { profile } = await res.json();

            const [firstName, ...rest] = (profile.name || "").trim().split(" ");
            const prefs: string = profile.profile?.communicationPref || "";

            setAvatarUrl(profile.avatarUrl || null);
            setFormData({
                firstName: firstName || "",
                lastName: rest.join(" "),
                email: profile.email || "",
                phone: profile.phone || "",
                location: profile.country || "",
                timezone: profile.timezone || "IST",
                goal: profile.profile?.goals || "Stress Relief",
                conditions: profile.profile?.medicalHistory || "",
                emailPref: prefs.includes("Email"),
                whatsappPref: prefs.includes("WhatsApp"),
                phonePref: prefs.includes("Phone"),
            });
        } catch (error) {
            console.error("Failed to load profile:", error);
            setStatus("Could not load your profile. Please refresh.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        setUploadingAvatar(true);
        setStatus(null);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Upload failed");
            setAvatarUrl(data.avatarUrl);
            await refreshUser();
            setStatus("Photo updated.");
        } catch (error) {
            console.error("Avatar upload failed:", error);
            setStatus(error instanceof Error ? error.message : "Upload failed.");
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setStatus(null);
        try {
            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: `${formData.firstName} ${formData.lastName}`.trim(),
                    phone: formData.phone,
                    country: formData.location,
                    timezone: formData.timezone,
                    goals: formData.goal,
                    medicalHistory: formData.conditions,
                    communicationPref: prefsToString(formData),
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to save profile");
            }
            setStatus("Profile saved.");
        } catch (error) {
            console.error("Failed to save profile:", error);
            setStatus(error instanceof Error ? error.message : "Failed to save profile.");
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (field: keyof ProfileForm, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const initials = `${formData.firstName.charAt(0)}${formData.lastName.charAt(0)}`.toUpperCase() || "SY";

    if (loading) return <PageLoading title="My Profile" />;

    return (
        <div>
            <PageHeader title="My Profile" subtitle="Your details, timezone and health profile." />

            {status && (
                <div className="mb-6 p-3 rounded-xl bg-accent/40 border border-primary/10 text-sm text-text max-w-3xl">
                    {status}
                </div>
            )}

            <div className="grid md:grid-cols-3 gap-6">
                <Card padded className="text-center h-fit">
                    <div className="w-28 h-28 rounded-full mx-auto mb-3 overflow-hidden bg-secondary flex items-center justify-center text-3xl text-white font-bold font-serif">
                        {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            initials
                        )}
                    </div>
                    <h2 className="font-bold text-gray-800">
                        {formData.firstName} {formData.lastName}
                    </h2>
                    <p className="text-sm text-gray-500 mb-5 truncate">{formData.email}</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleAvatarFile}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="w-full py-2 rounded-full border border-primary text-primary text-sm font-semibold hover:bg-primary hover:text-white transition-colors disabled:opacity-60"
                    >
                        {uploadingAvatar ? "Uploading…" : "Edit photo"}
                    </button>
                </Card>

                <div className="md:col-span-2 space-y-6">
                    <Card padded>
                        <h3 className="font-bold text-gray-800 mb-5">Personal details</h3>
                        <form onSubmit={handleSaveChanges} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>First name</label>
                                <input type="text" value={formData.firstName} onChange={(e) => handleInputChange("firstName", e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Last name</label>
                                <input type="text" value={formData.lastName} onChange={(e) => handleInputChange("lastName", e.target.value)} className={inputClass} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelClass}>Email</label>
                                <input type="email" value={formData.email} disabled className={`${inputClass} bg-gray-50 text-gray-500`} />
                            </div>
                            <div>
                                <label className={labelClass}>Phone</label>
                                <input type="tel" value={formData.phone} onChange={(e) => handleInputChange("phone", e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Location</label>
                                <input type="text" value={formData.location} onChange={(e) => handleInputChange("location", e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Timezone</label>
                                <select value={formData.timezone} onChange={(e) => handleInputChange("timezone", e.target.value)} className={inputClass}>
                                    <option value="IST">IST (India Standard Time)</option>
                                    <option value="GMT">GMT (Greenwich Mean Time)</option>
                                    <option value="EST">EST (Eastern Standard Time)</option>
                                    <option value="PST">PST (Pacific Standard Time)</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelClass}>Communication preference</label>
                                <div className="flex flex-wrap gap-5">
                                    {([
                                        ["emailPref", "Email"],
                                        ["whatsappPref", "WhatsApp"],
                                        ["phonePref", "Phone call"],
                                    ] as const).map(([field, label]) => (
                                        <label key={field} className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                                            <input
                                                type="checkbox"
                                                className="accent-primary"
                                                checked={formData[field]}
                                                onChange={(e) => handleInputChange(field, e.target.checked)}
                                            />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="sm:col-span-2 pt-1">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
                                >
                                    {saving ? "Saving…" : "Save changes"}
                                </button>
                            </div>
                        </form>
                    </Card>

                    <Card padded>
                        <h3 className="font-bold text-gray-800 mb-5">Health profile</h3>
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Primary goal</label>
                                <select value={formData.goal} onChange={(e) => handleInputChange("goal", e.target.value)} className={inputClass}>
                                    <option value="Stress Relief">Stress Relief</option>
                                    <option value="Flexibility">Flexibility</option>
                                    <option value="Strength">Strength</option>
                                    <option value="Pain Management">Pain Management</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Injuries / conditions</label>
                                <textarea
                                    value={formData.conditions}
                                    onChange={(e) => handleInputChange("conditions", e.target.value)}
                                    className={inputClass}
                                    rows={3}
                                />
                            </div>
                            <p className="text-xs text-gray-400">Health profile changes are saved with the Save changes button above.</p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

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
    const { refreshUser, logout } = useAuth();
    const [formData, setFormData] = useState<ProfileForm>(EMPTY_FORM);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Session management state
    const [loggingOutOthers, setLoggingOutOthers] = useState(false);
    const [securityStatus, setSecurityStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Account deletion state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

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
                emailPref: prefs ? prefs.includes("Email") : true,
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
            await refreshUser();
            setStatus("Profile saved.");
        } catch (error) {
            console.error("Failed to save profile:", error);
            setStatus(error instanceof Error ? error.message : "Failed to save profile.");
        } finally {
            setSaving(false);
        }
    };

    const handleLogoutOthers = async () => {
        setLoggingOutOthers(true);
        setSecurityStatus(null);
        try {
            const res = await fetch("/api/auth/logout-all", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to log out other sessions");
            setSecurityStatus({ type: "success", text: data.message || "All other sessions have been logged out." });
        } catch (err) {
            setSecurityStatus({ type: "error", text: err instanceof Error ? err.message : "Failed to log out other sessions." });
        } finally {
            setLoggingOutOthers(false);
        }
    };

    const handleDeleteAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (deleteConfirmText.trim() !== "DELETE") {
            setDeleteError("Please type DELETE in capital letters to confirm.");
            return;
        }
        setDeletingAccount(true);
        setDeleteError(null);
        try {
            const res = await fetch("/api/profile", { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Could not delete your account");
            }
            await logout();
            window.location.href = "/";
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : "Could not delete account. Please try again.");
            setDeletingAccount(false);
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                <label htmlFor="profile-firstName" className={labelClass}>First name</label>
                                <input id="profile-firstName" type="text" value={formData.firstName} onChange={(e) => handleInputChange("firstName", e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label htmlFor="profile-lastName" className={labelClass}>Last name</label>
                                <input id="profile-lastName" type="text" value={formData.lastName} onChange={(e) => handleInputChange("lastName", e.target.value)} className={inputClass} />
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="profile-email" className={labelClass}>Email</label>
                                <input id="profile-email" type="email" value={formData.email} disabled className={`${inputClass} bg-gray-50 text-gray-500`} />
                            </div>
                            <div>
                                <label htmlFor="profile-phone" className={labelClass}>Phone</label>
                                <input id="profile-phone" type="tel" value={formData.phone} onChange={(e) => handleInputChange("phone", e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label htmlFor="profile-location" className={labelClass}>Location</label>
                                <input id="profile-location" type="text" value={formData.location} onChange={(e) => handleInputChange("location", e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label htmlFor="profile-timezone" className={labelClass}>Timezone</label>
                                <select id="profile-timezone" value={formData.timezone} onChange={(e) => handleInputChange("timezone", e.target.value)} className={inputClass}>
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
                                        <label key={field} className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 py-1.5">
                                            <input
                                                type="checkbox"
                                                className="accent-primary w-4 h-4"
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
                                <label htmlFor="profile-goal" className={labelClass}>Primary goal</label>
                                <select id="profile-goal" value={formData.goal} onChange={(e) => handleInputChange("goal", e.target.value)} className={inputClass}>
                                    <option value="Stress Relief">Stress Relief</option>
                                    <option value="Flexibility">Flexibility</option>
                                    <option value="Strength">Strength</option>
                                    <option value="Pain Management">Pain Management</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="profile-conditions" className={labelClass}>Injuries / conditions</label>
                                <textarea
                                    id="profile-conditions"
                                    value={formData.conditions}
                                    onChange={(e) => handleInputChange("conditions", e.target.value)}
                                    className={inputClass}
                                    rows={3}
                                />
                            </div>
                            <p className="text-xs text-gray-400">Health profile changes are saved with the Save changes button above.</p>
                        </div>
                    </Card>

                    {/* Security & Sessions */}
                    <Card padded>
                        <h3 className="font-bold text-gray-800 mb-2">Security & Active Sessions</h3>
                        <p className="text-xs text-gray-500 mb-4">
                            Manage your login sessions. If you left your account logged in on another device or computer, you can log out of all other sessions immediately.
                        </p>

                        {securityStatus && (
                            <div
                                className={`mb-4 p-3 rounded-lg text-sm ${
                                    securityStatus.type === "success"
                                        ? "bg-green-50 border border-green-200 text-green-700"
                                        : "bg-red-50 border border-red-200 text-red-700"
                                }`}
                            >
                                {securityStatus.text}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleLogoutOthers}
                            disabled={loggingOutOthers}
                            className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60"
                        >
                            {loggingOutOthers ? "Logging out other devices…" : "Log out of all other sessions"}
                        </button>
                    </Card>

                    {/* Danger Zone: Account Deletion */}
                    <Card padded className="border-red-100 bg-red-50/20">
                        <h3 className="font-bold text-red-700 mb-2">Danger Zone</h3>
                        <p className="text-xs text-gray-500 mb-4">
                            Permanently delete your account and personal data. Active subscriptions will be cancelled and upcoming bookings cleared. This action cannot be undone.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setDeleteConfirmText("");
                                setDeleteError(null);
                                setShowDeleteModal(true);
                            }}
                            className="px-4 py-2 rounded-full border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
                        >
                            Delete account
                        </button>
                    </Card>
                </div>
            </div>

            {/* Account Deletion Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
                        <h3 className="text-lg font-bold text-red-600 mb-2">Delete Account Permanently?</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            This will permanently delete your account, cancel any active memberships, scrub medical notes, and remove your personal information.
                        </p>

                        {deleteError && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                                {deleteError}
                            </div>
                        )}

                        <form onSubmit={handleDeleteAccount} className="space-y-4">
                            <div>
                                <label htmlFor="delete-confirm-input" className="block text-xs font-semibold text-gray-600 mb-1">
                                    Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm:
                                </label>
                                <input
                                    id="delete-confirm-input"
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    placeholder="DELETE"
                                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                                    autoFocus
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={deletingAccount}
                                    className="px-4 py-2 rounded-full text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={deleteConfirmText.trim() !== "DELETE" || deletingAccount}
                                    className="px-5 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    {deletingAccount ? "Deleting account…" : "Permanently delete"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}


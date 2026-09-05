"use client";

import { useCallback, useEffect, useState } from "react";

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
    return [
        form.emailPref && "Email",
        form.whatsappPref && "WhatsApp",
        form.phonePref && "Phone",
    ]
        .filter(Boolean)
        .join(",");
}

export default function ProfilePage() {
    const [formData, setFormData] = useState<ProfileForm>(EMPTY_FORM);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const loadProfile = useCallback(async () => {
        try {
            const res = await fetch("/api/profile");
            if (!res.ok) throw new Error("Failed to load profile");
            const { profile } = await res.json();

            const [firstName, ...rest] = (profile.name || "").trim().split(" ");
            const prefs: string = profile.profile?.communicationPref || "";

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

    const handleEditPhoto = () => {
        // Profile photos need a storage-backed avatar field on the User model
        // before this can be wired up (see docs/ENV_SETUP.md). Not available yet.
        setStatus("Profile photo uploads aren't available yet.");
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
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const initials =
        `${formData.firstName.charAt(0)}${formData.lastName.charAt(0)}`.toUpperCase() || "SY";

    if (loading) {
        return <div className="p-20 text-center text-text/60">Loading profile...</div>;
    }

    return (
        <div>
            <h1 className="font-serif text-3xl text-primary mb-8">My Profile</h1>

            {status && (
                <div className="mb-6 p-3 rounded bg-accent/40 border border-primary/10 text-sm text-text">
                    {status}
                </div>
            )}

            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-primary/10 text-center">
                        <div className="w-32 h-32 bg-secondary rounded-full mx-auto mb-4 flex items-center justify-center text-4xl text-white font-bold">
                            {initials}
                        </div>
                        <h2 className="font-serif text-xl font-bold text-text">{formData.firstName} {formData.lastName}</h2>
                        <p className="text-sm text-text/70 mb-6">{formData.email}</p>
                        <button
                            onClick={handleEditPhoto}
                            className="w-full py-2 border border-primary text-primary text-xs font-bold uppercase tracking-widest rounded hover:bg-primary hover:text-white transition-colors"
                        >
                            Edit Photo
                        </button>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <div className="bg-white p-8 rounded-lg shadow-sm border border-primary/10 mb-8">
                        <h3 className="font-serif text-xl text-text mb-6">Personal Details</h3>
                        <form onSubmit={handleSaveChanges} className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-text/60 uppercase tracking-wider mb-1">First Name</label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text/60 uppercase tracking-wider mb-1">Last Name</label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded text-sm"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-text/60 uppercase tracking-wider mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    disabled
                                    className="w-full p-2 border border-gray-200 rounded text-sm bg-gray-50 text-text/60"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text/60 uppercase tracking-wider mb-1">Phone</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text/60 uppercase tracking-wider mb-1">Location</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => handleInputChange('location', e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text/60 uppercase tracking-wider mb-1">Timezone</label>
                                <select
                                    value={formData.timezone}
                                    onChange={(e) => handleInputChange('timezone', e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded text-sm"
                                >
                                    <option value="IST">IST (India Standard Time)</option>
                                    <option value="GMT">GMT (Greenwich Mean Time)</option>
                                    <option value="EST">EST (Eastern Standard Time)</option>
                                    <option value="PST">PST (Pacific Standard Time)</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-text/60 uppercase tracking-wider mb-2">Communication Preference</label>
                                <div className="flex gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.emailPref}
                                            onChange={(e) => handleInputChange('emailPref', e.target.checked)}
                                            className="text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm">Email</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.whatsappPref}
                                            onChange={(e) => handleInputChange('whatsappPref', e.target.checked)}
                                            className="text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm">WhatsApp</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.phonePref}
                                            onChange={(e) => handleInputChange('phonePref', e.target.checked)}
                                            className="text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm">Phone Call</span>
                                    </label>
                                </div>
                            </div>

                            <div className="col-span-2 mt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-3 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors disabled:opacity-60"
                                >
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white p-8 rounded-lg shadow-sm border border-primary/10">
                        <h3 className="font-serif text-xl text-text mb-6">Health Profile</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-text/60 uppercase tracking-wider mb-1">Primary Goal</label>
                                <select
                                    value={formData.goal}
                                    onChange={(e) => handleInputChange('goal', e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded text-sm"
                                >
                                    <option value="Stress Relief">Stress Relief</option>
                                    <option value="Flexibility">Flexibility</option>
                                    <option value="Strength">Strength</option>
                                    <option value="Pain Management">Pain Management</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text/60 uppercase tracking-wider mb-1">Injuries / Conditions</label>
                                <textarea
                                    value={formData.conditions}
                                    onChange={(e) => handleInputChange('conditions', e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded text-sm"
                                    rows={3}
                                />
                            </div>
                            <p className="text-xs text-text/50">
                                Health profile changes are saved with the Save Changes button above.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

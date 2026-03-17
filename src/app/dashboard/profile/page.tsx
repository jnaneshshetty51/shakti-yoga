"use client";

import { useState } from "react";

export default function ProfilePage() {
    const [formData, setFormData] = useState({
        firstName: "Jnanesh",
        lastName: "Shetty",
        email: "jnanesh@example.com",
        phone: "+91 98765 43210",
        location: "Bangalore, India",
        timezone: "IST",
        goal: "Stress Relief",
        conditions: "Mild lower back pain occasionally.",
        emailPref: true,
        whatsappPref: true,
        phonePref: false,
    });

    const handleEditPhoto = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                // TODO: Upload to server
                alert(`Photo selected: ${file.name}\nUpload functionality coming soon!`);
            }
        };
        input.click();
    };

    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // TODO: Call API to save profile
            alert('Profile saved successfully!\n\nNote: Full API integration coming soon.');
            console.log('Saving profile:', formData);
        } catch (error) {
            console.error('Failed to save profile:', error);
            alert('Failed to save profile. Please try again.');
        }
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div>
            <h1 className="font-serif text-3xl text-primary mb-8">My Profile</h1>

            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-primary/10 text-center">
                        <div className="w-32 h-32 bg-secondary rounded-full mx-auto mb-4 flex items-center justify-center text-4xl text-white font-bold">
                            JS
                        </div>
                        <h2 className="font-serif text-xl font-bold text-text">{formData.firstName} {formData.lastName}</h2>
                        <p className="text-sm text-text/70 mb-6">Member since Nov 2025</p>
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
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded text-sm"
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
                                <button type="submit" className="px-6 py-3 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors">
                                    Save Changes
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
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

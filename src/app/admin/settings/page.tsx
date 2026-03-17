"use client";

export default function AdminSettingsPage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="font-serif text-3xl text-gray-800 mb-2">Platform Settings</h1>
                <p className="text-gray-500">Configure general settings, notifications, and integrations.</p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 max-w-3xl">
                <h2 className="font-bold text-lg text-gray-800 mb-6">General Configuration</h2>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-text/60 uppercase tracking-wider mb-2">Platform Name</label>
                        <input type="text" defaultValue="Shakti Yoga" className="w-full p-3 border border-gray-200 rounded" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-text/60 uppercase tracking-wider mb-2">Support Email</label>
                        <input type="email" defaultValue="support@shaktiyoga.com" className="w-full p-3 border border-gray-200 rounded" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-text/60 uppercase tracking-wider mb-2">Default Timezone</label>
                        <select className="w-full p-3 border border-gray-200 rounded">
                            <option>IST (India Standard Time)</option>
                            <option>UTC</option>
                        </select>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4">Integrations</h3>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded mb-4">
                            <div>
                                <div className="font-bold text-sm">Stripe Payments</div>
                                <div className="text-xs text-gray-500">Connected</div>
                            </div>
                            <button className="text-red-500 text-xs font-bold uppercase">Disconnect</button>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
                            <div>
                                <div className="font-bold text-sm">Zoom API</div>
                                <div className="text-xs text-gray-500">Not Connected</div>
                            </div>
                            <button className="text-primary text-xs font-bold uppercase">Connect</button>
                        </div>
                    </div>

                    <button className="px-6 py-3 bg-primary text-white font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

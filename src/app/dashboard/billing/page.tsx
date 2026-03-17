export default function BillingPage() {
    return (
        <div>
            <h1 className="font-serif text-3xl text-primary mb-8">Plan & Billing</h1>

            <div className="bg-white p-8 rounded-lg shadow-sm border border-primary/10 mb-8">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="font-serif text-xl text-text mb-2">Everyday Yoga Plan</h3>
                        <p className="text-text/70 text-sm">$59.00 / month</p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold uppercase tracking-widest rounded">Active</span>
                </div>

                <div className="flex gap-4">
                    <button className="px-4 py-2 bg-secondary text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-primary transition-colors">
                        Upgrade Plan
                    </button>
                    <button className="px-4 py-2 border border-red-200 text-red-500 text-xs font-bold uppercase tracking-widest rounded hover:bg-red-50 transition-colors">
                        Cancel Subscription
                    </button>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-100">
                    <h4 className="font-bold text-sm uppercase tracking-widest text-text/60 mb-4">Payment Method</h4>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center text-xs font-bold text-gray-500">VISA</div>
                        <div className="text-sm">•••• •••• •••• 4242</div>
                        <button className="text-primary text-xs font-bold uppercase tracking-widest hover:text-secondary ml-auto">Update</button>
                    </div>
                </div>
            </div>

            <h3 className="font-serif text-xl text-primary mb-4">Invoice History</h3>
            <div className="bg-white rounded-lg shadow-sm border border-primary/10 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-accent/30 text-text/70 font-bold uppercase tracking-wider">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Amount</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Invoice</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        <tr>
                            <td className="p-4">Nov 22, 2025</td>
                            <td className="p-4">$59.00</td>
                            <td className="p-4 text-green-600 font-bold">Paid</td>
                            <td className="p-4"><a href="#" className="text-primary hover:underline">Download</a></td>
                        </tr>
                        <tr>
                            <td className="p-4">Oct 22, 2025</td>
                            <td className="p-4">$59.00</td>
                            <td className="p-4 text-green-600 font-bold">Paid</td>
                            <td className="p-4"><a href="#" className="text-primary hover:underline">Download</a></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

"use client";

import { useCurrency } from '@/context/CurrencyContext';

export default function InvoicePage({ params: _params }: { params: Promise<{ id: string }> }) {
    // TODO: use React.use(_params) to read the real invoice id once this page reads from the DB
    const { formatPrice } = useCurrency();
    
    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-primary/10">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="font-serif text-2xl text-primary mb-2">Shakti Yoga Kendra</h1>
                    <p className="text-sm text-gray-500">LIG 77, Hudco 4th Main Rd, Doddangudde, Udupi, Karnataka 576102</p>
                    <p className="text-sm text-gray-500">contactus@shaktiyoga.in</p>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold text-gray-800">INVOICE</h2>
                    <p className="text-sm text-gray-500">#0001</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                    <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Bill To</h3>
                    <p className="font-medium">Student Name</p>
                    <p className="text-sm text-gray-600">student@email.com</p>
                </div>
                <div className="text-right">
                    <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Date</h3>
                    <p className="font-medium">November 22, 2025</p>
                </div>
            </div>

            <table className="w-full mb-8">
                <thead>
                    <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 text-xs font-bold uppercase text-gray-500">Description</th>
                        <th className="text-right py-3 text-xs font-bold uppercase text-gray-500">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    <tr>
                        <td className="py-4">Everyday Yoga Plan - Monthly Subscription</td>
                        <td className="py-4 text-right font-medium">{formatPrice(4900, true)}</td>
                    </tr>
                </tbody>
                <tfoot className="border-t-2 border-gray-200">
                    <tr>
                        <td className="py-4 font-bold">Total</td>
                        <td className="py-4 text-right font-bold text-lg">{formatPrice(4900, true)}</td>
                    </tr>
                </tfoot>
            </table>

            <div className="flex justify-between items-center">
                <button 
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-primary text-white text-sm font-bold uppercase tracking-widest rounded hover:bg-primary/90 transition-colors"
                >
                    Print Invoice
                </button>
                <a 
                    href="/dashboard/billing" 
                    className="text-sm text-gray-500 hover:text-primary transition-colors"
                >
                    ← Back to Billing
                </a>
            </div>
        </div>
    );
}
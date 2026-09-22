"use client";

import { useState } from "react";
import { LuUpload, LuFileSpreadsheet, LuX, LuCircleAlert, LuCircleCheck } from "react-icons/lu";
import { useToast } from "@/components/admin/Toast";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    staffList: { id: string; name: string }[];
};

type ParsedLead = {
    name: string;
    email: string;
    phone?: string;
    country?: string;
    source?: string;
    programInterest?: string;
    notes?: string;
};

export function LeadImportModal({ isOpen, onClose, onSuccess, staffList }: Props) {
    const { showToast } = useToast();
    const [rawText, setRawText] = useState("");
    const [defaultSource, setDefaultSource] = useState("OTHER");
    const [assignedToId, setAssignedToId] = useState("");
    const [campaign, setCampaign] = useState("offline_event");
    const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

    if (!isOpen) return null;

    const parseCsvText = (text: string) => {
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
        if (lines.length === 0) {
            setParsedLeads([]);
            return;
        }

        const results: ParsedLead[] = [];
        // Check if first line is a header
        const startIndex = lines[0].toLowerCase().includes("email") ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
            if (cols.length >= 2) {
                // assume col 0: Name, col 1: Email, col 2: Phone, col 3: Program, col 4: Notes
                const name = cols[0];
                const email = cols[1];
                const phone = cols[2] || undefined;
                const programInterest = cols[3] || undefined;
                const notes = cols[4] || undefined;

                if (name && email && email.includes("@")) {
                    results.push({ name, email, phone, programInterest, notes });
                }
            }
        }
        setParsedLeads(results);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) {
                setRawText(content);
                parseCsvText(content);
            }
        };
        reader.readAsText(file);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setRawText(val);
        parseCsvText(val);
    };

    const handleImportSubmit = async () => {
        if (parsedLeads.length === 0) {
            showToast("error", "No valid leads found to import.");
            return;
        }

        setImporting(true);
        setImportResult(null);

        try {
            const payload = {
                leads: parsedLeads.map((l) => ({
                    ...l,
                    source: defaultSource,
                    campaign: campaign || "bulk_import",
                    assignedToId: assignedToId || undefined,
                })),
            };

            const res = await fetch("/api/admin/leads/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Import failed");
            }

            setImportResult({
                imported: data.imported,
                skipped: data.skipped,
                errors: data.errors || [],
            });

            showToast("success", `Imported ${data.imported} leads!`);
            onSuccess();
        } catch (error) {
            showToast("error", error instanceof Error ? error.message : "Failed to import leads");
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-surface border border-hairline rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-hairline bg-surface-raised sticky top-0 z-10">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                            <LuUpload className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-ink">Bulk Import Leads</h2>
                            <p className="text-xs text-ink-subtle">Upload CSV or paste contacts from workshops, ads, or events</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full text-ink-subtle hover:text-ink hover:bg-surface transition-colors">
                        <LuX className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* File upload or paste */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-ink uppercase tracking-wider">Upload CSV or Paste Data</label>
                            <label className="cursor-pointer inline-flex items-center gap-1 text-xs text-brand font-medium hover:underline">
                                <LuFileSpreadsheet className="w-3.5 h-3.5" />
                                <span>Choose .csv file</span>
                                <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
                            </label>
                        </div>

                        <textarea
                            rows={5}
                            value={rawText}
                            onChange={handleTextChange}
                            placeholder="Name, Email, Phone, Program, Notes&#10;Ananya Sharma, ananya@example.com, 9876543210, EVERYDAY_YOGA, Interested in morning batch&#10;Rahul Verma, rahul@example.com, 9811122233, YOGA_THERAPY, Lower back pain"
                            className="w-full text-xs font-mono rounded-xl border border-hairline bg-surface px-3 py-2 text-ink placeholder:text-ink-subtle focus:outline-none focus:border-brand"
                        />
                        <p className="text-[11px] text-ink-subtle mt-1">
                            Format per line: <code className="text-brand">Name, Email, Phone, Program (optional), Notes (optional)</code>
                        </p>
                    </div>

                    {/* Default Settings */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-hairline">
                        <div>
                            <label className="text-xs font-semibold text-ink uppercase tracking-wider mb-1 block">Lead Source</label>
                            <select
                                value={defaultSource}
                                onChange={(e) => setDefaultSource(e.target.value)}
                                className="w-full text-xs rounded-control border border-hairline bg-surface px-2.5 py-1.5 text-ink focus:outline-none focus:border-brand"
                            >
                                <option value="WEBSITE">Website</option>
                                <option value="WHATSAPP">WhatsApp</option>
                                <option value="SOCIAL_MEDIA">Social Media</option>
                                <option value="REFERRAL">Referral</option>
                                <option value="OTHER">Other / Event</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-ink uppercase tracking-wider mb-1 block">Campaign Tag</label>
                            <input
                                type="text"
                                value={campaign}
                                onChange={(e) => setCampaign(e.target.value)}
                                placeholder="e.g. wellness_expo_2026"
                                className="w-full text-xs rounded-control border border-hairline bg-surface px-2.5 py-1.5 text-ink focus:outline-none focus:border-brand"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-ink uppercase tracking-wider mb-1 block">Assign Counselor</label>
                            <select
                                value={assignedToId}
                                onChange={(e) => setAssignedToId(e.target.value)}
                                className="w-full text-xs rounded-control border border-hairline bg-surface px-2.5 py-1.5 text-ink focus:outline-none focus:border-brand"
                            >
                                <option value="">Unassigned</option>
                                {staffList.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Preview summary */}
                    <div className="p-3 rounded-xl bg-surface-raised border border-hairline flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink">Ready to import:</span>
                            <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand font-bold">
                                {parsedLeads.length} valid {parsedLeads.length === 1 ? "lead" : "leads"}
                            </span>
                        </div>
                        {parsedLeads.length > 0 && (
                            <span className="text-ink-subtle text-[11px]">
                                Duplicates by email will be safely skipped.
                            </span>
                        )}
                    </div>

                    {/* Import result feedback */}
                    {importResult && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold">
                                <LuCircleCheck className="w-4 h-4 text-emerald-600" />
                                <span>Import Completed</span>
                            </div>
                            <p>
                                Successfully imported <strong>{importResult.imported}</strong> leads.{" "}
                                {importResult.skipped > 0 && (
                                    <span>(Skipped {importResult.skipped} duplicates or invalid rows).</span>
                                )}
                            </p>
                            {importResult.errors.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-emerald-200 text-[11px] text-red-600">
                                    <div className="flex items-center gap-1 font-semibold">
                                        <LuCircleAlert className="w-3.5 h-3.5" /> Issues noticed:
                                    </div>
                                    <ul className="list-disc pl-4 mt-0.5 space-y-0.5 max-h-20 overflow-y-auto">
                                        {importResult.errors.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium text-ink-subtle hover:text-ink transition-colors"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            disabled={importing || parsedLeads.length === 0}
                            onClick={handleImportSubmit}
                            className="px-5 py-2 rounded-control bg-brand text-white text-xs font-semibold hover:bg-brand-strong transition-all shadow-sm disabled:opacity-40"
                        >
                            {importing ? "Importing..." : `Import ${parsedLeads.length} Leads`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

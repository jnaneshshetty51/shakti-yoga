"use client";

import { useState } from "react";
import { LuMessageCircle, LuSend, LuX, LuCheck } from "react-icons/lu";
import { cleanWhatsAppPhone } from "@/lib/phone";
import { useToast } from "@/components/admin/Toast";

export type WhatsAppLead = {
    id: string;
    name: string;
    phone: string | null;
    programInterest?: string | null;
    status?: string;
};

type Props = {
    lead: WhatsAppLead | null;
    isOpen: boolean;
    onClose: () => void;
    onLogged?: () => void;
};

type Template = {
    id: string;
    title: string;
    description: string;
    content: (name: string, program?: string | null) => string;
};

const TEMPLATES: Template[] = [
    {
        id: "trial-invite",
        title: "1. Welcome & Free Trial Invite",
        description: "Initial outreach for new website/social leads",
        content: (name, program) =>
            `Namaste ${name}! 🙏 Thank you for reaching out to Shakti Yoga Kendra regarding ${program ? program.replace(/_/g, ' ') : 'our classes'}. We would love to invite you to experience a complimentary live trial session with our senior teachers. Which batch timing (morning or evening) suits your schedule best?`,
    },
    {
        id: "trial-reminder",
        title: "2. Trial Session Confirmation",
        description: "Reminder with preparation tips before their trial class",
        content: (name) =>
            `Namaste ${name}! Your trial session with Shakti Yoga is coming up. Please ensure you join 5-10 minutes prior on a light/empty stomach with your yoga mat, comfortable clothing, and a water bottle ready. Looking forward to practicing together! 🧘‍♀️`,
    },
    {
        id: "post-trial",
        title: "3. Post-Trial Follow-up & Offer",
        description: "Feedback and membership conversion offer",
        content: (name) =>
            `Namaste ${name}! We hope you had an invigorating trial session today. How did your body and breath feel during the practice? If you'd like to continue your daily journey, we have a limited-time welcome discount on our Everyday Yoga membership. Shall I share the details?`,
    },
    {
        id: "therapy-consult",
        title: "4. Yoga Therapy 1:1 Consultation",
        description: "Personalized intake for therapeutic healing",
        content: (name) =>
            `Namaste ${name}! Regarding your interest in our Yoga Therapy program, our certified therapists conduct a personalized 1:1 clinical intake assessment before designing your customized sequence. Let us know a convenient time for a brief 15-minute consultation.`,
    },
    {
        id: "re-engagement",
        title: "5. Warm Check-in & Re-engagement",
        description: "Follow up with leads who paused or stalled",
        content: (name) =>
            `Namaste ${name}! Just checking back from Shakti Yoga Kendra. We know life gets busy! Whenever you are ready to restart your wellness routine or book a trial class, our mats are ready for you. Would you like to explore this week's batch schedule?`,
    },
];

function WhatsAppTemplateForm({
    lead,
    onClose,
    onLogged,
}: {
    lead: WhatsAppLead;
    onClose: () => void;
    onLogged?: () => void;
}) {
    const { showToast } = useToast();
    const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATES[0].id);
    const [customMessage, setCustomMessage] = useState(
        TEMPLATES[0].content(lead.name, lead.programInterest)
    );
    const [autoLog, setAutoLog] = useState(true);

    const cleanPhone = cleanWhatsAppPhone(lead.phone);

    const handleSelectTemplate = (tmpl: Template) => {
        setSelectedTemplateId(tmpl.id);
        setCustomMessage(tmpl.content(lead.name, lead.programInterest));
    };

    const handleSend = async () => {
        if (!cleanPhone) {
            showToast("error", "No valid phone number for this lead");
            return;
        }

        const encoded = encodeURIComponent(customMessage);
        const waUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;

        // Auto log activity if enabled
        if (autoLog) {
            try {
                await fetch(`/api/admin/leads/${lead.id}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: "WHATSAPP",
                        content: `WhatsApp sent (${TEMPLATES.find((t) => t.id === selectedTemplateId)?.title}): "${customMessage.slice(0, 140)}..."`,
                    }),
                });
                onLogged?.();
            } catch {
                // If auto-log fails, still open WhatsApp
            }
        }

        window.open(waUrl, "_blank", "noopener,noreferrer");
        showToast("success", `WhatsApp opened for ${lead.name}`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-surface border border-hairline rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-hairline bg-surface-raised">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <LuMessageCircle className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-ink">WhatsApp Admissions Hub</h2>
                            <p className="text-xs text-ink-subtle">
                                To: {lead.name} ({lead.phone || "No phone"})
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full text-ink-subtle hover:text-ink hover:bg-surface transition-colors">
                        <LuX className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Template Picker */}
                    <div>
                        <label className="text-xs font-semibold text-ink uppercase tracking-wider mb-2 block">Choose Yoga Studio Template</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                            {TEMPLATES.map((t) => {
                                const isSelected = selectedTemplateId === t.id;
                                return (
                                    <button
                                        type="button"
                                        key={t.id}
                                        onClick={() => handleSelectTemplate(t)}
                                        className={`p-2.5 rounded-xl border text-left transition-all text-xs flex flex-col justify-between ${
                                            isSelected
                                                ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs"
                                                : "border-hairline bg-surface text-ink hover:bg-surface-raised"
                                        }`}
                                    >
                                        <div className="font-semibold text-xs flex items-center justify-between">
                                            <span>{t.title}</span>
                                            {isSelected && <LuCheck className="w-3.5 h-3.5 text-emerald-600" />}
                                        </div>
                                        <p className="text-[10px] text-ink-subtle mt-0.5">{t.description}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Editable Message Box */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-ink uppercase tracking-wider">Message Preview & Customization</label>
                            <span className="text-[10px] text-ink-subtle">You can edit before sending</span>
                        </div>
                        <textarea
                            rows={4}
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            className="w-full text-xs rounded-xl border border-hairline bg-surface px-3 py-2 text-ink placeholder:text-ink-subtle focus:outline-none focus:border-emerald-500"
                        />
                    </div>

                    {/* Auto-log Checkbox */}
                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="checkbox"
                            id="autolog-wa"
                            checked={autoLog}
                            onChange={(e) => setAutoLog(e.target.checked)}
                            className="w-4 h-4 rounded border-hairline text-emerald-600 focus:ring-emerald-500"
                        />
                        <label htmlFor="autolog-wa" className="text-xs text-ink cursor-pointer">
                            Auto-log this WhatsApp message in lead activity timeline
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-hairline">
                        <span className="text-xs text-ink-subtle">
                            {cleanPhone ? `Sends to +${cleanPhone}` : <span className="text-red-600 font-medium">Missing phone number</span>}
                        </span>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-medium text-ink-subtle hover:text-ink transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!cleanPhone || !customMessage.trim()}
                                onClick={handleSend}
                                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-control bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-sm disabled:opacity-40"
                            >
                                <LuSend className="w-3.5 h-3.5" /> Launch WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function WhatsAppTemplateModal({ lead, isOpen, onClose, onLogged }: Props) {
    if (!isOpen || !lead) return null;
    return <WhatsAppTemplateForm key={lead.id} lead={lead} onClose={onClose} onLogged={onLogged} />;
}

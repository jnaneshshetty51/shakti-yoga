"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui";

export type FieldType = "text" | "email" | "number" | "textarea" | "select" | "date" | "datetime-local" | "checkbox" | "image" | "video" | "audio";

export interface FieldDef {
    name: string;
    label: string;
    type?: FieldType;
    required?: boolean;
    options?: { label: string; value: string }[];
    placeholder?: string;
}

export type EntityValues = Record<string, string | number | boolean>;

interface Props {
    title: string;
    fields: FieldDef[];
    initial?: EntityValues;
    submitLabel?: string;
    onCancel: () => void;
    onSubmit: (values: EntityValues) => Promise<void>;
    /** Required if any field has type "image". Uploads the file, returns its URL. */
    uploadImage?: (file: File) => Promise<string>;
    /** Required if any field has type "video". Uploads the file, returns its URL. */
    uploadVideo?: (file: File) => Promise<string>;
    /** Required if any field has type "audio". Uploads the file, returns its URL. */
    uploadAudio?: (file: File) => Promise<string>;
}

const fieldInputClass =
    "w-full px-3 py-2 rounded-control border border-hairline text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand/40 transition";
const fieldLabelClass = "block text-xs font-semibold text-ink-subtle uppercase tracking-wider mb-1";

export default function EntityFormModal({
    title,
    fields,
    initial,
    submitLabel = "Save",
    onCancel,
    onSubmit,
    uploadImage,
    uploadVideo,
    uploadAudio,
}: Props) {
    const [uploading, setUploading] = useState<string | null>(null);
    const [values, setValues] = useState<EntityValues>(() => {
        const seed: EntityValues = {};
        for (const f of fields) {
            seed[f.name] = initial?.[f.name] ?? (f.type === "checkbox" ? false : "");
        }
        return seed;
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onCancel]);

    const set = (name: string, value: string | number | boolean) =>
        setValues((v) => ({ ...v, [name]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await onSubmit(values);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={onCancel}>
            <div
                className="bg-surface border border-hairline rounded-card shadow-overlay w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-hairline sticky top-0 bg-surface z-10">
                    <h3 className="font-semibold text-lg text-ink">{title}</h3>
                    <button onClick={onCancel} className="p-1.5 -mr-1.5 rounded-full text-ink-subtle hover:bg-black/[0.04] hover:text-ink-muted transition-colors">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-control text-sm">{error}</div>
                    )}

                    {fields.map((f) => (
                        <div key={f.name}>
                            <label htmlFor={`entity-field-${f.name}`} className={fieldLabelClass}>
                                {f.label}{f.required && " *"}
                            </label>

                            {f.type === "textarea" ? (
                                <textarea
                                    id={`entity-field-${f.name}`}
                                    value={String(values[f.name] ?? "")}
                                    onChange={(e) => set(f.name, e.target.value)}
                                    required={f.required}
                                    rows={3}
                                    className={fieldInputClass}
                                />
                            ) : f.type === "select" ? (
                                <select
                                    id={`entity-field-${f.name}`}
                                    value={String(values[f.name] ?? "")}
                                    onChange={(e) => set(f.name, e.target.value)}
                                    required={f.required}
                                    className={fieldInputClass}
                                >
                                    <option value="">Select…</option>
                                    {f.options?.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            ) : f.type === "checkbox" ? (
                                <input
                                    id={`entity-field-${f.name}`}
                                    type="checkbox"
                                    checked={Boolean(values[f.name])}
                                    onChange={(e) => set(f.name, e.target.checked)}
                                    className="h-4 w-4 accent-brand"
                                />
                            ) : f.type === "image" ? (
                                <div className="flex flex-wrap items-start gap-3">
                                    <div className="w-24 h-16 rounded-control bg-surface-sunken border border-hairline overflow-hidden shrink-0 flex items-center justify-center text-ink-subtle text-xs">
                                        {values[f.name]
                                            // eslint-disable-next-line @next/next/no-img-element
                                            ? <img src={String(values[f.name])} alt="" className="w-full h-full object-cover" />
                                            : "none"}
                                    </div>
                                    <div className="space-y-1">
                                        <input
                                            id={`entity-field-${f.name}`}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            disabled={!uploadImage || uploading === f.name}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                e.target.value = "";
                                                if (!file || !uploadImage) return;
                                                setUploading(f.name);
                                                setError(null);
                                                try {
                                                    set(f.name, await uploadImage(file));
                                                } catch (err) {
                                                    setError(err instanceof Error ? err.message : "Upload failed");
                                                } finally {
                                                    setUploading(null);
                                                }
                                            }}
                                            className="text-xs"
                                        />
                                        {uploading === f.name && <p className="text-xs text-ink-subtle">Uploading…</p>}
                                        {values[f.name] && (
                                            <button type="button" onClick={() => set(f.name, "")} className="block text-xs text-ink-subtle hover:text-red-500">
                                                remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : f.type === "video" ? (
                                <div className="flex flex-wrap items-start gap-3">
                                    <div className="w-24 h-16 rounded-control bg-surface-sunken border border-hairline overflow-hidden shrink-0 flex items-center justify-center text-ink-subtle text-xs text-center px-1">
                                        {values[f.name] ? "video attached" : "none"}
                                    </div>
                                    <div className="space-y-1">
                                        <input
                                            id={`entity-field-${f.name}`}
                                            type="file"
                                            accept="video/mp4,video/quicktime"
                                            disabled={!uploadVideo || uploading === f.name}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                e.target.value = "";
                                                if (!file || !uploadVideo) return;
                                                setUploading(f.name);
                                                setError(null);
                                                try {
                                                    set(f.name, await uploadVideo(file));
                                                } catch (err) {
                                                    setError(err instanceof Error ? err.message : "Upload failed");
                                                } finally {
                                                    setUploading(null);
                                                }
                                            }}
                                            className="text-xs"
                                        />
                                        {uploading === f.name && <p className="text-xs text-ink-subtle">Uploading…</p>}
                                        {values[f.name] && (
                                            <button type="button" onClick={() => set(f.name, "")} className="block text-xs text-ink-subtle hover:text-red-500">
                                                remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : f.type === "audio" ? (
                                <div className="flex flex-wrap items-start gap-3">
                                    <div className="w-24 h-16 rounded-control bg-surface-sunken border border-hairline overflow-hidden shrink-0 flex items-center justify-center text-ink-subtle text-xs text-center px-1">
                                        {values[f.name] ? "audio attached" : "none"}
                                    </div>
                                    <div className="space-y-1">
                                        <input
                                            id={`entity-field-${f.name}`}
                                            type="file"
                                            accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav"
                                            disabled={!uploadAudio || uploading === f.name}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                e.target.value = "";
                                                if (!file || !uploadAudio) return;
                                                setUploading(f.name);
                                                setError(null);
                                                try {
                                                    set(f.name, await uploadAudio(file));
                                                } catch (err) {
                                                    setError(err instanceof Error ? err.message : "Upload failed");
                                                } finally {
                                                    setUploading(null);
                                                }
                                            }}
                                            className="text-xs"
                                        />
                                        {uploading === f.name && <p className="text-xs text-ink-subtle">Uploading…</p>}
                                        {values[f.name] && (
                                            <button type="button" onClick={() => set(f.name, "")} className="block text-xs text-ink-subtle hover:text-red-500">
                                                remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <input
                                    id={`entity-field-${f.name}`}
                                    type={f.type || "text"}
                                    value={String(values[f.name] ?? "")}
                                    onChange={(e) => set(f.name, e.target.value)}
                                    required={f.required}
                                    placeholder={f.placeholder}
                                    className={fieldInputClass}
                                />
                            )}
                        </div>
                    ))}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" shape="pill" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button type="submit" shape="pill" loading={busy}>
                            {submitLabel}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

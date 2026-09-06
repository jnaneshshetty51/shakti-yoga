"use client";

import { useEffect, useState } from "react";

export type FieldType = "text" | "email" | "number" | "textarea" | "select" | "date" | "checkbox" | "image";

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
}

export default function EntityFormModal({
    title,
    fields,
    initial,
    submitLabel = "Save",
    onCancel,
    onSubmit,
    uploadImage,
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h3 className="font-serif text-xl text-gray-800">{title}</h3>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>
                    )}

                    {fields.map((f) => (
                        <div key={f.name}>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                {f.label}{f.required && " *"}
                            </label>

                            {f.type === "textarea" ? (
                                <textarea
                                    value={String(values[f.name] ?? "")}
                                    onChange={(e) => set(f.name, e.target.value)}
                                    required={f.required}
                                    rows={3}
                                    className="w-full p-2 border border-gray-200 rounded text-sm"
                                />
                            ) : f.type === "select" ? (
                                <select
                                    value={String(values[f.name] ?? "")}
                                    onChange={(e) => set(f.name, e.target.value)}
                                    required={f.required}
                                    className="w-full p-2 border border-gray-200 rounded text-sm"
                                >
                                    <option value="">Select…</option>
                                    {f.options?.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            ) : f.type === "checkbox" ? (
                                <input
                                    type="checkbox"
                                    checked={Boolean(values[f.name])}
                                    onChange={(e) => set(f.name, e.target.checked)}
                                    className="h-4 w-4"
                                />
                            ) : f.type === "image" ? (
                                <div className="flex items-start gap-3">
                                    <div className="w-24 h-16 rounded bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center text-gray-400 text-xs">
                                        {values[f.name]
                                            // eslint-disable-next-line @next/next/no-img-element
                                            ? <img src={String(values[f.name])} alt="" className="w-full h-full object-cover" />
                                            : "none"}
                                    </div>
                                    <div className="space-y-1">
                                        <input
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
                                        {uploading === f.name && <p className="text-xs text-gray-400">Uploading…</p>}
                                        {values[f.name] && (
                                            <button type="button" onClick={() => set(f.name, "")} className="block text-xs text-gray-400 hover:text-red-500">
                                                remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <input
                                    type={f.type || "text"}
                                    value={String(values[f.name] ?? "")}
                                    onChange={(e) => set(f.name, e.target.value)}
                                    required={f.required}
                                    placeholder={f.placeholder}
                                    className="w-full p-2 border border-gray-200 rounded text-sm"
                                />
                            )}
                        </div>
                    ))}

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={busy}
                            className="px-5 py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors disabled:opacity-60"
                        >
                            {busy ? "Saving…" : submitLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

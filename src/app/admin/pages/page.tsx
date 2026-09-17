"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, PageLoading, Tabs, Card, labelClass } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";
import type { AboutPageContent, HomePageContent, CorporatePageContent } from "@/lib/cms";
import Link from "next/link";
import { LuExternalLink, LuSave, LuRotateCcw } from "react-icons/lu";

type CmsTab = "about" | "home" | "corporate";

interface PagesData {
    about: AboutPageContent;
    home: HomePageContent;
    corporate: CorporatePageContent;
}

export function AdminPagesContent({ embedded = false }: { embedded?: boolean } = {}) {
    const { showToast } = useToast();
    const [tab, setTab] = useState<CmsTab>("about");
    const [data, setData] = useState<PagesData | null>(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/cms/pages");
            if (res.ok) {
                const json = await res.json();
                setData(json.pages);
            }
        } catch (e) {
            console.error("Failed to load CMS pages:", e);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleSave = async (page: CmsTab) => {
        if (!data) return;
        setSaving(true);
        try {
            const res = await fetch("/api/admin/cms/pages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ page, data: data[page] }),
            });
            if (!res.ok) throw new Error("Failed to save changes.");
            showToast("success", `${page.charAt(0).toUpperCase() + page.slice(1)} page updated successfully.`);
        } catch (err) {
            showToast("error", err instanceof Error ? err.message : "Error saving page content.");
        } finally {
            setSaving(false);
        }
    };

    if (!data) return <PageLoading title="Pages CMS" />;

    return (
        <div className={embedded ? "space-y-6" : "max-w-5xl space-y-6"}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {embedded ? (
                    <h2 className="font-serif text-lg font-bold text-ink-base">Pages CMS &amp; Content Editor</h2>
                ) : (
                    <PageHeader
                        title="Pages CMS &amp; Content Editor"
                        subtitle="Live editor for public page copy. Update narrative texts, hero headlines, and founder statements."
                    />
                )}
                <div className="flex items-center gap-2">
                    <Link
                        href={tab === "about" ? "/about" : tab === "corporate" ? "/corporate" : "/"}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-control border border-border-default text-xs font-semibold text-ink-muted hover:text-ink-base hover:bg-surface-elevated transition-colors"
                    >
                        <span>View Live {tab.toUpperCase()}</span>
                        <LuExternalLink className="text-sm" />
                    </Link>
                </div>
            </div>

            {!embedded && (
                <div className="p-4 rounded-card bg-surface-subtle border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div>
                        <span className="font-semibold text-ink-base flex items-center gap-1.5">
                            <span>📰</span> Articles &amp; Blog Publishing Studio
                        </span>
                        <p className="text-ink-subtle mt-0.5">Publish long-form yogic wisdom articles, essays, and stories with custom slugs &amp; CTAs.</p>
                    </div>
                    <Link
                        href="/admin/blog"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-control bg-primary text-white font-semibold hover:bg-primary/90 transition-colors shrink-0"
                    >
                        <span>Open Blog Studio</span>
                        <LuExternalLink className="text-xs" />
                    </Link>
                </div>
            )}

            <Tabs
                active={tab}
                onChange={(k) => setTab(k as CmsTab)}
                tabs={[
                    { key: "about", label: "About Page" },
                    { key: "home", label: "Homepage Hero & Banners" },
                    { key: "corporate", label: "Corporate Wellness" },
                ]}
            />

            {/* ABOUT PAGE EDITOR */}
            {tab === "about" && (
                <div className="space-y-6">
                    <Card padded className="space-y-4">
                        <div className="border-b border-border-subtle pb-3">
                            <h3 className="font-serif text-lg font-bold text-ink-base">Header &amp; Subtitle</h3>
                            <p className="text-xs text-ink-subtle">The banner introductory copy shown at the top of the About page.</p>
                        </div>
                        <div>
                            <label className={labelClass}>Page Header Title</label>
                            <input
                                type="text"
                                value={data.about.header_title}
                                onChange={(e) =>
                                    setData({
                                        ...data,
                                        about: { ...data.about, header_title: e.target.value },
                                    })
                                }
                                className="w-full px-3.5 py-2 text-sm rounded-control border border-border-default bg-surface-base focus:border-brand focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Page Subtitle</label>
                            <textarea
                                rows={2}
                                value={data.about.header_subtitle}
                                onChange={(e) =>
                                    setData({
                                        ...data,
                                        about: { ...data.about, header_subtitle: e.target.value },
                                    })
                                }
                                className="w-full px-3.5 py-2 text-sm rounded-control border border-border-default bg-surface-base focus:border-brand focus:outline-none"
                            />
                        </div>
                    </Card>

                    <Card padded className="space-y-4">
                        <div className="border-b border-border-subtle pb-3">
                            <h3 className="font-serif text-lg font-bold text-ink-base">Our Story &amp; Origins</h3>
                            <p className="text-xs text-ink-subtle">Narrative explaining the history and foundation of Shakti Yoga Kendra.</p>
                        </div>
                        <div>
                            <label className={labelClass}>Story Section Heading</label>
                            <input
                                type="text"
                                value={data.about.story_title}
                                onChange={(e) =>
                                    setData({
                                        ...data,
                                        about: { ...data.about, story_title: e.target.value },
                                    })
                                }
                                className="w-full px-3.5 py-2 text-sm rounded-control border border-border-default bg-surface-base focus:border-brand focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Paragraph 1 (The Udupi Heritage)</label>
                            <textarea
                                rows={3}
                                value={data.about.story_p1}
                                onChange={(e) =>
                                    setData({
                                        ...data,
                                        about: { ...data.about, story_p1: e.target.value },
                                    })
                                }
                                className="w-full px-3.5 py-2 text-sm rounded-control border border-border-default bg-surface-base focus:border-brand focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Paragraph 2 (Philosophy &amp; Sheaths)</label>
                            <textarea
                                rows={3}
                                value={data.about.story_p2}
                                onChange={(e) =>
                                    setData({
                                        ...data,
                                        about: { ...data.about, story_p2: e.target.value },
                                    })
                                }
                                className="w-full px-3.5 py-2 text-sm rounded-control border border-border-default bg-surface-base focus:border-brand focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Paragraph 3 (Global Community &amp; Live Sadhana)</label>
                            <textarea
                                rows={3}
                                value={data.about.story_p3}
                                onChange={(e) =>
                                    setData({
                                        ...data,
                                        about: { ...data.about, story_p3: e.target.value },
                                    })
                                }
                                className="w-full px-3.5 py-2 text-sm rounded-control border border-border-default bg-surface-base focus:border-brand focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Central Mission Statement / Quote</label>
                            <textarea
                                rows={2}
                                value={data.about.mission_quote}
                                onChange={(e) =>
                                    setData({
                                        ...data,
                                        about: { ...data.about, mission_quote: e.target.value },
                                    })
                                }
                                className="w-full px-3.5 py-2 text-sm rounded-control border border-border-default bg-surface-base focus:border-brand focus:outline-none font-serif italic"
                            />
                        </div>
                    </Card>

                    <Card padded className="space-y-4">
                        <div className="border-b border-border-subtle pb-3">
                            <h3 className="font-serif text-lg font-bold text-ink-base">Founder Biography</h3>
                            <p className="text-xs text-ink-subtle">Acharya Swastik's biography, background, and personal quote.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Founder Name &amp; Title</label>
                                <input
                                    type="text"
                                    value={data.about.founder_title}
                                    onChange={(e) =>
                                        setData({
                                            ...data,
                                            about: { ...data.about, founder_title: e.target.value },
                                        })
                                    }
                                    className="w-full px-3.5 py-2 text-sm rounded-control border border-border-default bg-surface-base focus:border-brand focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Personal Tagline / Headline Quote</label>
                                <input
                                    type="text"
                                    value={data.about.founder_tagline}
                                    onChange={(e) =>
                                        setData({
                                            ...data,
                                            about: { ...data.about, founder_tagline: e.target.value },
                                        })
                                    }
                                    className="w-full px-3.5 py-2 text-sm rounded-control border border-border-default bg-surface-base focus:border-brand focus:outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Bio Part 1: Engineering to Yogic Sciences Transition</label>
                            <textarea
                                rows={3}
                                value={data.about.founder_bio_p1}
                                onChange={(e) =>
                                    setData({
                                        ...data,
                                        about: { ...data.about, founder_bio_p1: e.target.value },
                                    })
                                }
                                className="w-full px-3.5 py-2 text-sm rounded-control border border-border-default bg-surface-base focus:border-brand focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Bio Part 2: M.Sc. in Yogic Science &amp; Classical Training</label>
                            <textarea
                                rows={3}
                                value={data.about.founder_bio_p2}
                                onChange={(e) =>
                                    setData({
                                        ...data,
                                        about: { ...data.about, founder_bio_p2: e.target.value },
                                    })
                                }
                                className="w-full px-3.5 py-2 text-sm rounded-control border border-border-default bg-surface-base focus:border-brand focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Bio Part 3: Devi Lineage &amp; Founding Shakti Yoga</label>
                            <textarea
                                rows={3}
                                value={data.about.founder_bio_p3}
                                onChange={(e) =>
                                    setData({
                                        ...data,
                                        about: { ...data.about, founder_bio_p3: e.target.value },
                                    })
                                }
                                className="w-full px-3.5 py-2 text-sm rounded-control border border-border-default bg-surface-base focus:border-brand focus:outline-none"
                            />
                        </div>
                    </Card>

                    <div className="flex justify-end pt-2">
                        <button
                            onClick={() => handleSave("about")}
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-control bg-brand text-white text-xs font-semibold uppercase tracking-widest hover:bg-brand-hover transition-colors disabled:opacity-50"
                        >
                            <LuSave className="text-sm" />
                            {saving ? "Saving Changes…" : "Save About Page"}
                        </button>
                    </div>
                </div>
            )}

            {/* HOMEPAGE EDITOR */}
            {tab === "home" && (
                <div className="space-y-6">
                    <Card padded className="space-y-4">
                        <div className="border-b border-border-subtle pb-3">
                            <h3 className="font-serif text-lg font-bold text-ink-base">Hero Section</h3>
                            <p className="text-xs text-ink-subtle">Primary headline and positioning shown to every first-time visitor.</p>
                        </div>
                        <div>
                            <label className={labelClass}>Main Hero Headline (H1)</label>
                            <input
                                type="text"
                                value={data.home.hero_headline}
                                onChange={(e) =>
                                    setData({
                                        ...data,
                                        home: { ...data.home, hero_headline: e.target.value },
                                    })
                                }
                                className="w-full px-3.5 py-2 text-sm rounded-control border border-border-default bg-surface-base focus:border-brand focus:outline-none font-serif text-base"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Hero Subtitle</label>
                            <textarea
                                rows={2}
                                value={data.home.hero_subtext}
                                onChange={(e) =>
                                    setData({
                                        ...data,
                                        home: { ...data.home, hero_subtext: e.target.value },
                                    })
                                }
                                className="w-full px-3.5 py-2 text-sm rounded-control border border-border-default bg-surface-base focus:border-brand focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Live Status Badge Text</label>
                            <input
                                type="text"
                                value={data.home.hero_badge}
                                onChange={(e) =>
                                    setData({
                                        ...data,
                                        home: { ...data.home, hero_badge: e.target.value },
                                    })
                                }
                                className="w-full px-3.5 py-2 text-sm rounded-control border border-border-default bg-surface-base focus:border-brand focus:outline-none"
                            />
                        </div>
                    </Card>

                    <Card padded className="space-y-4">
                        <div className="border-b border-border-subtle pb-3">
                            <h3 className="font-serif text-lg font-bold text-ink-base">Section Headings</h3>
                            <p className="text-xs text-ink-subtle">Headlines for Target Audience and Origin sections.</p>
                        </div>
                        <div>
                            <label className={labelClass}>Target Audience Section Title</label>
                            <input
                                type="text"
                                value={data.home.target_audience_title}
                                onChange={(e) =>
                                    setData({
                                        ...data,
                                        home: { ...data.home, target_audience_title: e.target.value },
                                    })
                                }
                                className="w-full px-3.5 py-2 text-sm rounded-control border border-border-default bg-surface-base focus:border-brand focus:outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Difference Heading (Udupi to World)</label>
                                <input
                                    type="text"
                                    value={data.home.difference_title}
                                    onChange={(e) =>
                                        setData({
                                            ...data,
                                            home: { ...data.home, difference_title: e.target.value },
                                        })
                                    }
                                    className="w-full px-3.5 py-2 text-sm rounded-control border border-border-default bg-surface-base focus:border-brand focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Difference Subtitle</label>
                                <input
                                    type="text"
                                    value={data.home.difference_subtitle}
                                    onChange={(e) =>
                                        setData({
                                            ...data,
                                            home: { ...data.home, difference_subtitle: e.target.value },
                                        })
                                    }
                                    className="w-full px-3.5 py-2 text-sm rounded-control border border-border-default bg-surface-base focus:border-brand focus:outline-none"
                                />
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end pt-2">
                        <button
                            onClick={() => handleSave("home")}
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-control bg-brand text-white text-xs font-semibold uppercase tracking-widest hover:bg-brand-hover transition-colors disabled:opacity-50"
                        >
                            <LuSave className="text-sm" />
                            {saving ? "Saving Changes…" : "Save Homepage Copy"}
                        </button>
                    </div>
                </div>
            )}

            {/* CORPORATE PAGE EDITOR */}
            {tab === "corporate" && (
                <div className="space-y-6">
                    <Card padded className="space-y-4">
                        <div className="border-b border-border-subtle pb-3">
                            <h3 className="font-serif text-lg font-bold text-ink-base">Header &amp; Subtitle</h3>
                            <p className="text-xs text-ink-subtle">Top banner title and subtitle on the Corporate page.</p>
                        </div>
                        <div>
                            <label className={labelClass}>Corporate Page Title</label>
                            <input
                                type="text"
                                value={data.corporate.title}
                                onChange={(e) =>
                                    setData({
                                        ...data,
                                        corporate: { ...data.corporate, title: e.target.value },
                                    })
                                }
                                className="w-full px-3.5 py-2 text-sm rounded-control border border-border-default bg-surface-base focus:border-brand focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Corporate Subtitle</label>
                            <textarea
                                rows={2}
                                value={data.corporate.subtitle}
                                onChange={(e) =>
                                    setData({
                                        ...data,
                                        corporate: { ...data.corporate, subtitle: e.target.value },
                                    })
                                }
                                className="w-full px-3.5 py-2 text-sm rounded-control border border-border-default bg-surface-base focus:border-brand focus:outline-none"
                            />
                        </div>
                    </Card>

                    <Card padded className="space-y-4">
                        <div className="border-b border-border-subtle pb-3">
                            <h3 className="font-serif text-lg font-bold text-ink-base">Value Metrics Callouts</h3>
                            <p className="text-xs text-ink-subtle">The three statistical ROI badges shown to enterprise decision-makers.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-3 bg-surface-subtle rounded-control space-y-2 border border-border-subtle">
                                <label className={labelClass}>Metric 1 Stat</label>
                                <input
                                    type="text"
                                    value={data.corporate.metric_1_stat}
                                    onChange={(e) =>
                                        setData({
                                            ...data,
                                            corporate: { ...data.corporate, metric_1_stat: e.target.value },
                                        })
                                    }
                                    className="w-full px-3 py-1.5 text-sm rounded-control border border-border-default bg-surface-base"
                                />
                                <label className={labelClass}>Metric 1 Label</label>
                                <textarea
                                    rows={2}
                                    value={data.corporate.metric_1_label}
                                    onChange={(e) =>
                                        setData({
                                            ...data,
                                            corporate: { ...data.corporate, metric_1_label: e.target.value },
                                        })
                                    }
                                    className="w-full px-3 py-1.5 text-xs rounded-control border border-border-default bg-surface-base"
                                />
                            </div>

                            <div className="p-3 bg-surface-subtle rounded-control space-y-2 border border-border-subtle">
                                <label className={labelClass}>Metric 2 Stat</label>
                                <input
                                    type="text"
                                    value={data.corporate.metric_2_stat}
                                    onChange={(e) =>
                                        setData({
                                            ...data,
                                            corporate: { ...data.corporate, metric_2_stat: e.target.value },
                                        })
                                    }
                                    className="w-full px-3 py-1.5 text-sm rounded-control border border-border-default bg-surface-base"
                                />
                                <label className={labelClass}>Metric 2 Label</label>
                                <textarea
                                    rows={2}
                                    value={data.corporate.metric_2_label}
                                    onChange={(e) =>
                                        setData({
                                            ...data,
                                            corporate: { ...data.corporate, metric_2_label: e.target.value },
                                        })
                                    }
                                    className="w-full px-3 py-1.5 text-xs rounded-control border border-border-default bg-surface-base"
                                />
                            </div>

                            <div className="p-3 bg-surface-subtle rounded-control space-y-2 border border-border-subtle">
                                <label className={labelClass}>Metric 3 Stat</label>
                                <input
                                    type="text"
                                    value={data.corporate.metric_3_stat}
                                    onChange={(e) =>
                                        setData({
                                            ...data,
                                            corporate: { ...data.corporate, metric_3_stat: e.target.value },
                                        })
                                    }
                                    className="w-full px-3 py-1.5 text-sm rounded-control border border-border-default bg-surface-base"
                                />
                                <label className={labelClass}>Metric 3 Label</label>
                                <textarea
                                    rows={2}
                                    value={data.corporate.metric_3_label}
                                    onChange={(e) =>
                                        setData({
                                            ...data,
                                            corporate: { ...data.corporate, metric_3_label: e.target.value },
                                        })
                                    }
                                    className="w-full px-3 py-1.5 text-xs rounded-control border border-border-default bg-surface-base"
                                />
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end pt-2">
                        <button
                            onClick={() => handleSave("corporate")}
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-control bg-brand text-white text-xs font-semibold uppercase tracking-widest hover:bg-brand-hover transition-colors disabled:opacity-50"
                        >
                            <LuSave className="text-sm" />
                            {saving ? "Saving Changes…" : "Save Corporate Copy"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminPagesCms() {
    return <AdminPagesContent />;
}

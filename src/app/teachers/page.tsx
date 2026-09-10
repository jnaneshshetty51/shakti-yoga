import Image from "next/image";
import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const metadata: Metadata = {
    title: "Meet Our Teachers",
    description: "The teachers behind Shakti Yoga Kendra's live classes and 1:1 yoga therapy.",
    alternates: { canonical: "/teachers" },
};

const STAFF_ROLES: Role[] = [Role.TEACHER, Role.STAFF_ADMIN, Role.SUPER_ADMIN];

async function getTeachers() {
    const staff = await prisma.user.findMany({
        where: { role: { in: STAFF_ROLES }, staffProfile: { publicVisible: true } },
        select: {
            id: true,
            name: true,
            avatarUrl: true,
            staffProfile: { select: { title: true, bio: true, specialties: true, yearsExperience: true } },
        },
        orderBy: [{ staffProfile: { displayOrder: "asc" } }, { name: "asc" }],
    });
    return staff.map((s) => ({
        id: s.id,
        name: s.name,
        photoUrl: s.avatarUrl ?? null,
        title: s.staffProfile?.title ?? null,
        bio: s.staffProfile?.bio ?? null,
        specialties: s.staffProfile?.specialties ?? [],
        yearsExperience: s.staffProfile?.yearsExperience ?? null,
    }));
}

function initials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default async function TeachersPage() {
    const teachers = await getTeachers();

    return (
        <main>
            <PageHeader
                title="Meet Our Teachers"
                subtitle="Every class and therapy session is led by a teacher trained in the living tradition Shakti draws from."
            />

            <section className="py-16 sm:py-20 px-4 sm:px-8 bg-background">
                <div className="max-w-6xl mx-auto">
                    {teachers.length === 0 ? (
                        <p className="text-center text-text/60 font-sans">Teacher profiles are being updated — check back soon.</p>
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
                            {teachers.map((t) => (
                                <div key={t.id} className="bg-white rounded-2xl shadow-sm border border-primary/10 overflow-hidden flex flex-col">
                                    <div className="relative w-full aspect-square bg-primary/10">
                                        {t.photoUrl ? (
                                            <Image src={t.photoUrl} alt={t.name} fill className="object-cover" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-primary font-serif text-4xl font-bold">
                                                {initials(t.name)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5 sm:p-6 flex-1 flex flex-col">
                                        <h3 className="font-serif text-lg sm:text-xl text-primary font-bold">{t.name}</h3>
                                        {t.title && <p className="font-sans text-sm text-secondary font-semibold mt-0.5">{t.title}</p>}
                                        {t.yearsExperience != null && (
                                            <p className="font-sans text-xs text-text/50 mt-1">{t.yearsExperience}+ years experience</p>
                                        )}
                                        {t.bio && <p className="font-sans text-sm text-text/70 leading-relaxed mt-3">{t.bio}</p>}
                                        {t.specialties.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-4">
                                                {t.specialties.map((s) => (
                                                    <span key={s} className="text-[11px] font-sans font-medium px-2.5 py-1 rounded-full bg-primary/8 text-primary">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}

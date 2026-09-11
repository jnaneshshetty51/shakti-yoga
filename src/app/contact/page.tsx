import { Suspense } from "react";
import PageHeader from "@/components/PageHeader";
import ContactForm from "./ContactForm";
import { getSocialLinks } from "@/lib/settings";

import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Contact",
    description: "Questions about classes, therapy or your membership? Reach the Shakti Yoga team.",
    alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
    const social = await getSocialLinks();
    return (
        <main>
            <PageHeader
                title="Get in Touch"
                subtitle="We are here to answer your questions and guide you on your yoga journey."
            />

            <section className="py-20 px-8 bg-background">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16">
                    <div>
                        <h2 className="font-serif text-3xl text-primary mb-8">Contact Information</h2>
                        <div className="space-y-6 font-sans text-text/80">
                            <div>
                                <h3 className="font-bold text-lg text-text mb-2">Address</h3>
                                <p>LIG 77, Hudco 4th Main Rd, near Netaji Nandanavana Park,<br />Karnataka Housing Board Colony, Doddangudde,<br />Udupi, Karnataka 576102</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-text mb-2">Email</h3>
                                <p>contactus@shaktiyoga.in</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-text mb-2">Phone / WhatsApp</h3>
                                <p>+91 7760222478</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-text mb-2">Office Hours</h3>
                                <p>Mon - Fri: 9:00 AM - 6:00 PM IST</p>
                            </div>
                        </div>

                        <div className="mt-12 p-6 bg-accent/30 rounded-lg border border-primary/10">
                            <h3 className="font-serif text-xl text-secondary mb-4">Join our Community</h3>
                            <p className="font-sans text-sm mb-4">
                                Get daily updates, tips, and inspiration on our WhatsApp channel.
                            </p>
                            {social.whatsapp ? (
                                <a
                                    href={social.whatsapp}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-block px-6 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition-colors"
                                >
                                    Join WhatsApp Group
                                </a>
                            ) : (
                                <a
                                    href="https://wa.me/917760222478"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-block px-6 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition-colors"
                                >
                                    Message us on WhatsApp
                                </a>
                            )}
                        </div>
                    </div>

                    <Suspense fallback={<div className="bg-white p-8 rounded-lg shadow-lg border-t-4 border-primary h-[520px]" />}>
                        <ContactForm />
                    </Suspense>
                </div>
            </section>
        </main>
    );
}

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-background py-16 px-6 md:px-16">
            <div className="max-w-4xl mx-auto">
                <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-8">
                    Privacy Policy
                </h1>

                <div className="prose prose-lg max-w-none space-y-8 text-text">
                    <section>
                        <p className="text-sm text-gray-600 mb-8">
                            Last Updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">1. Introduction</h2>
                        <p className="leading-relaxed mb-4">
                            At Shakti Yoga Kendra, we are committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">2. Information We Collect</h2>
                        <p className="leading-relaxed mb-4">
                            We collect information that you provide directly to us, including:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Personal Information:</strong> Name, email address, phone number, date of birth</li>
                            <li><strong>Health Information:</strong> Medical history, health conditions, injuries (for yoga therapy sessions)</li>
                            <li><strong>Payment Information:</strong> Billing details processed securely through our payment gateway</li>
                            <li><strong>Usage Data:</strong> Class attendance, session recordings, interaction with our platform</li>
                            <li><strong>Technical Data:</strong> IP address, browser type, device information, cookies</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">3. How We Use Your Information</h2>
                        <p className="leading-relaxed mb-4">
                            We use the collected information for the following purposes:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Provide and maintain our yoga classes and therapy services</li>
                            <li>Process payments and manage subscriptions</li>
                            <li>Personalize your yoga therapy sessions based on health information</li>
                            <li>Send class schedules, reminders, and important updates</li>
                            <li>Respond to your inquiries and provide customer support</li>
                            <li>Improve our services and develop new features</li>
                            <li>Send marketing communications (with your consent)</li>
                            <li>Comply with legal obligations</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">4. Information Sharing and Disclosure</h2>
                        <p className="leading-relaxed mb-4">
                            We do not sell your personal information. We may share your information in the following circumstances:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Service Providers:</strong> With third-party vendors who assist in providing our services (e.g., payment processors, email services)</li>
                            <li><strong>Yoga Instructors:</strong> Relevant health information with your assigned yoga therapist for personalized sessions</li>
                            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
                            <li><strong>Business Transfers:</strong> In connection with a merger, sale, or acquisition</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">5. Data Security</h2>
                        <p className="leading-relaxed mb-4">
                            We implement appropriate technical and organizational security measures to protect your personal information, including:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>SSL encryption for data transmission</li>
                            <li>Secure payment processing through Razorpay</li>
                            <li>Regular security audits and updates</li>
                            <li>Access controls and authentication measures</li>
                            <li>Encrypted storage of sensitive health information</li>
                        </ul>
                        <p className="leading-relaxed mt-4">
                            However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">6. Your Privacy Rights</h2>
                        <p className="leading-relaxed mb-4">
                            You have the following rights regarding your personal information:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Access:</strong> Request a copy of your personal information</li>
                            <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                            <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                            <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                            <li><strong>Data Portability:</strong> Receive your data in a portable format</li>
                        </ul>
                        <p className="leading-relaxed mt-4">
                            To exercise these rights, please contact us at contactus@shaktiyoga.in
                        </p>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">7. Cookies and Tracking Technologies</h2>
                        <p className="leading-relaxed mb-4">
                            We use cookies and similar tracking technologies to enhance your experience. You can control cookies through your browser settings, but disabling cookies may affect functionality.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">8. Third-Party Links</h2>
                        <p className="leading-relaxed mb-4">
                            Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">9. Children's Privacy</h2>
                        <p className="leading-relaxed mb-4">
                            Our services are not intended for children under 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">10. International Data Transfers</h2>
                        <p className="leading-relaxed mb-4">
                            Your information may be transferred to and processed in India. By using our services, you consent to the transfer of your information to India and other countries where we operate.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">11. Changes to This Privacy Policy</h2>
                        <p className="leading-relaxed mb-4">
                            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">12. Contact Us</h2>
                        <p className="leading-relaxed mb-4">
                            If you have any questions about this Privacy Policy, please contact us:
                        </p>
                        <ul className="list-none space-y-2">
                            <li><strong>Email:</strong> contactus@shaktiyoga.in</li>
                            <li><strong>Phone:</strong> +91 7760222478</li>
                            <li><strong>Address:</strong> LIG 77, Hudco 4th Main Rd, near Netaji Nandanavana Park, Doddangudde, Udupi, Karnataka 576102</li>
                        </ul>
                    </section>
                </div>
            </div>
        </main>
    );
}

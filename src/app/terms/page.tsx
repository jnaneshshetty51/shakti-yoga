export default function TermsPage() {
    return (
        <main className="min-h-screen bg-background py-16 px-6 md:px-16">
            <div className="max-w-4xl mx-auto">
                <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-8">
                    Terms of Service
                </h1>

                <div className="prose prose-lg max-w-none space-y-8 text-text">
                    <section>
                        <p className="text-sm text-gray-600 mb-8">
                            Last Updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">1. Acceptance of Terms</h2>
                        <p className="leading-relaxed mb-4">
                            By accessing and using Shakti Yoga Kendra's services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use our services.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">2. Services Provided</h2>
                        <p className="leading-relaxed mb-4">
                            Shakti Yoga Kendra provides online yoga classes, personalized 1:1 yoga therapy sessions, and related wellness services. All classes are conducted live via video conferencing platforms.
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Everyday Yoga Classes (5 days per week)</li>
                            <li>Personalized 1:1 Yoga Therapy Sessions</li>
                            <li>Free Trial Classes</li>
                            <li>WhatsApp Support Community</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">3. Registration and Account</h2>
                        <p className="leading-relaxed mb-4">
                            To access our services, you must create an account and provide accurate, complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">4. Payment Terms</h2>
                        <p className="leading-relaxed mb-4">
                            Payment for services must be made in advance through our secure payment gateway. We accept payments via credit/debit cards, UPI, and other methods as displayed on our platform.
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>All prices are listed in Indian Rupees (INR)</li>
                            <li>Payments are processed securely through Razorpay</li>
                            <li>Subscription renewals are automatic unless cancelled</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">5. Cancellation and Refund Policy</h2>
                        <p className="leading-relaxed mb-4">
                            You may cancel your subscription at any time. Refunds are provided according to our refund policy:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Full refund if cancelled within 7 days of purchase and no classes attended</li>
                            <li>Pro-rated refund for unused classes if cancelled after 7 days</li>
                            <li>No refund for 1:1 therapy sessions cancelled less than 24 hours before scheduled time</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">6. Class Attendance and Conduct</h2>
                        <p className="leading-relaxed mb-4">
                            Students are expected to:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Join classes on time (classes start at 5:00 AM IST)</li>
                            <li>Maintain a respectful and supportive environment</li>
                            <li>Not record or share class content without permission</li>
                            <li>Follow instructor guidance and practice safely</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">7. Intellectual Property</h2>
                        <p className="leading-relaxed mb-4">
                            All content, including class recordings, materials, and resources provided by Shakti Yoga Kendra, are protected by copyright and intellectual property laws. Unauthorized use, reproduction, or distribution is prohibited.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">8. Limitation of Liability</h2>
                        <p className="leading-relaxed mb-4">
                            Shakti Yoga Kendra and its instructors are not liable for any injuries, damages, or losses incurred during or as a result of participation in our classes. Students participate at their own risk.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">9. Modifications to Terms</h2>
                        <p className="leading-relaxed mb-4">
                            We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Continued use of our services constitutes acceptance of modified terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">10. Contact Information</h2>
                        <p className="leading-relaxed mb-4">
                            For questions about these Terms of Service, please contact us:
                        </p>
                        <ul className="list-none space-y-2">
                            <li><strong>Email:</strong> contactus@shaktiyoga.in</li>
                            <li><strong>Phone:</strong> +91 7204050478</li>
                            <li><strong>Address:</strong> LIG 77, Hudco 4th Main Rd, near Netaji Nandanavana Park, Doddangudde, Udupi, Karnataka 576102</li>
                        </ul>
                    </section>
                </div>
            </div>
        </main>
    );
}

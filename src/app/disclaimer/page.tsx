export default function DisclaimerPage() {
    return (
        <main className="min-h-screen bg-background py-16 px-6 md:px-16">
            <div className="max-w-4xl mx-auto">
                <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-8">
                    Disclaimer
                </h1>

                <div className="prose prose-lg max-w-none space-y-8 text-text">
                    <section>
                        <p className="text-sm text-gray-600 mb-8">
                            Last Updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">Medical Disclaimer</h2>
                        <p className="leading-relaxed mb-4">
                            <strong>IMPORTANT: Yoga is not a substitute for medical treatment or professional medical advice.</strong>
                        </p>
                        <p className="leading-relaxed mb-4">
                            The yoga classes, yoga therapy sessions, and wellness information provided by Shakti Yoga Kendra are for educational and informational purposes only. They are not intended to diagnose, treat, cure, or prevent any disease or medical condition.
                        </p>
                        <p className="leading-relaxed mb-4">
                            Before beginning any yoga practice or wellness program, you should:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Consult with your physician or qualified healthcare provider</li>
                            <li>Disclose any pre-existing medical conditions, injuries, or health concerns</li>
                            <li>Obtain medical clearance if you are pregnant, have chronic conditions, or recent injuries</li>
                            <li>Follow your doctor's advice regarding physical activity limitations</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">Assumption of Risk</h2>
                        <p className="leading-relaxed mb-4">
                            By participating in yoga classes and therapy sessions offered by Shakti Yoga Kendra, you acknowledge and accept the following:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Yoga practice involves physical activity that may carry inherent risks</li>
                            <li>You participate voluntarily and at your own risk</li>
                            <li>You are responsible for knowing your physical limitations</li>
                            <li>You should stop immediately if you experience pain, discomfort, or dizziness</li>
                            <li>You are responsible for creating a safe practice environment at home</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">No Medical Advice</h2>
                        <p className="leading-relaxed mb-4">
                            Our yoga instructors and therapists are certified yoga professionals but are not licensed medical practitioners. Any information or guidance provided during sessions:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Should not be considered medical advice</li>
                            <li>Cannot replace consultation with qualified healthcare professionals</li>
                            <li>Is based on traditional yoga practices and wellness principles</li>
                            <li>May not be suitable for everyone's individual health circumstances</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">Individual Results May Vary</h2>
                        <p className="leading-relaxed mb-4">
                            Results from yoga practice vary from person to person. We cannot guarantee specific outcomes, benefits, or results from our classes or therapy sessions. Factors affecting results include:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Individual health conditions and physical capabilities</li>
                            <li>Consistency and dedication to practice</li>
                            <li>Lifestyle factors and overall health habits</li>
                            <li>Proper technique and following instructor guidance</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">Pregnancy and Special Conditions</h2>
                        <p className="leading-relaxed mb-4">
                            If you are pregnant, have recently given birth, or have any of the following conditions, you MUST consult your doctor before participating:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Pregnancy or postpartum period (within 6 months)</li>
                            <li>Heart conditions or cardiovascular disease</li>
                            <li>High or low blood pressure</li>
                            <li>Recent surgery or injuries</li>
                            <li>Chronic pain conditions</li>
                            <li>Respiratory conditions (asthma, COPD)</li>
                            <li>Neurological disorders</li>
                            <li>Joint problems or arthritis</li>
                            <li>Any other serious medical condition</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">Online Class Limitations</h2>
                        <p className="leading-relaxed mb-4">
                            Our classes are conducted online via video conferencing. Please be aware:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Instructors cannot physically adjust your posture or alignment</li>
                            <li>Technical issues may affect class quality or accessibility</li>
                            <li>You are responsible for ensuring adequate space and safety at your location</li>
                            <li>Internet connectivity and device quality may vary</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">Limitation of Liability</h2>
                        <p className="leading-relaxed mb-4">
                            To the fullest extent permitted by law, Shakti Yoga Kendra, its instructors, employees, and affiliates shall not be liable for:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Any injuries, damages, or losses incurred during or after participation</li>
                            <li>Aggravation of pre-existing conditions</li>
                            <li>Consequences of not following medical advice or instructor guidance</li>
                            <li>Technical issues affecting online class delivery</li>
                            <li>Any indirect, incidental, or consequential damages</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">Your Responsibilities</h2>
                        <p className="leading-relaxed mb-4">
                            As a participant, you are responsible for:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Informing instructors of any health conditions or limitations</li>
                            <li>Practicing within your personal limits and comfort zone</li>
                            <li>Stopping immediately if you experience pain or discomfort</li>
                            <li>Maintaining proper hydration and nutrition</li>
                            <li>Creating a safe practice space free from hazards</li>
                            <li>Following instructor guidance and modifications</li>
                            <li>Seeking immediate medical attention if needed</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">Information Accuracy</h2>
                        <p className="leading-relaxed mb-4">
                            While we strive to provide accurate and up-to-date information, we make no warranties or representations about:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>The completeness, accuracy, or reliability of information provided</li>
                            <li>The suitability of practices for your individual circumstances</li>
                            <li>The availability or continuity of services</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">Emergency Situations</h2>
                        <p className="leading-relaxed mb-4">
                            In case of medical emergency during or after class:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Stop practice immediately</li>
                            <li>Seek immediate medical attention or call emergency services</li>
                            <li>Do not rely on instructors for medical emergency response</li>
                            <li>Inform us of the incident for our records</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">Acknowledgment</h2>
                        <p className="leading-relaxed mb-4">
                            By using our services, you acknowledge that you have read, understood, and agree to this disclaimer. You confirm that:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>You are participating voluntarily and at your own risk</li>
                            <li>You have consulted with your healthcare provider if necessary</li>
                            <li>You understand yoga is not a substitute for medical treatment</li>
                            <li>You accept full responsibility for your participation</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">Contact Information</h2>
                        <p className="leading-relaxed mb-4">
                            If you have questions about this disclaimer, please contact us:
                        </p>
                        <ul className="list-none space-y-2">
                            <li><strong>Email:</strong> contactus@shaktiyoga.in</li>
                            <li><strong>Phone:</strong> +91 7760222478</li>
                            <li><strong>Address:</strong> LIG 77, Hudco 4th Main Rd, near Netaji Nandanavana Park, Doddangudde, Udupi, Karnataka 576102</li>
                        </ul>
                    </section>

                    <div className="mt-12 p-6 bg-amber-50 border-l-4 border-amber-500 rounded">
                        <p className="font-bold text-amber-900 mb-2">⚠️ Important Reminder</p>
                        <p className="text-amber-800">
                            Always listen to your body. If something doesn't feel right, stop immediately and consult a healthcare professional. Your health and safety are your responsibility.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}

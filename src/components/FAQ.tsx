export default function FAQ() {
    const faqs = [
        {
            question: "What time zones do you support?",
            answer: "We have batches running from 6:00 AM to 10:15 PM IST, which covers most global time zones including US, UK, Europe, and Australia."
        },
        {
            question: "Do I need prior experience?",
            answer: "Not at all. Our Everyday Yoga classes are beginner-friendly, and our 1:1 Therapy is completely personalized to your level."
        },
        {
            question: "What if I miss a live class?",
            answer: "We provide recordings of the sessions so you can practice at your own convenience if you miss a live slot."
        },
        {
            question: "How does the payment work?",
            answer: "We accept international payments via Stripe/PayPal. You are billed monthly and can cancel anytime."
        }
    ];

    return (
        <section className="py-20 px-8 bg-background">
            <div className="max-w-3xl mx-auto">
                <h2 className="font-serif text-3xl md:text-4xl text-primary text-center mb-12">Frequently Asked Questions</h2>

                <div className="space-y-6">
                    {faqs.map((faq, index) => (
                        <div key={index} className="border-b border-primary/10 pb-6">
                            <h3 className="font-serif text-lg text-text font-bold mb-2">{faq.question}</h3>
                            <p className="font-sans text-text/70 leading-relaxed">{faq.answer}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

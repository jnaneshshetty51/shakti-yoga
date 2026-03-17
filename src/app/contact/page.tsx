import PageHeader from "@/components/PageHeader";

export default function ContactPage() {
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
                                <p>+91 7204050478</p>
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
                            <a href="#" className="inline-block px-6 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition-colors">
                                Join WhatsApp Group
                            </a>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-lg shadow-lg border-t-4 border-primary">
                        <h2 className="font-serif text-2xl text-text mb-6">Send us a Message</h2>
                        <form className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-bold text-text/70 mb-1 uppercase tracking-wider">Name</label>
                                <input type="text" id="name" className="w-full p-3 bg-accent/20 border border-gray-200 rounded focus:outline-none focus:border-primary transition-colors" placeholder="Your Name" />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-bold text-text/70 mb-1 uppercase tracking-wider">Email</label>
                                <input type="email" id="email" className="w-full p-3 bg-accent/20 border border-gray-200 rounded focus:outline-none focus:border-primary transition-colors" placeholder="your@email.com" />
                            </div>
                            <div>
                                <label htmlFor="subject" className="block text-sm font-bold text-text/70 mb-1 uppercase tracking-wider">Subject</label>
                                <select id="subject" className="w-full p-3 bg-accent/20 border border-gray-200 rounded focus:outline-none focus:border-primary transition-colors">
                                    <option>General Inquiry</option>
                                    <option>Free Trial Class</option>
                                    <option>Yoga Therapy Consultation</option>
                                    <option>Billing Issue</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="message" className="block text-sm font-bold text-text/70 mb-1 uppercase tracking-wider">Message</label>
                                <textarea id="message" rows={4} className="w-full p-3 bg-accent/20 border border-gray-200 rounded focus:outline-none focus:border-primary transition-colors" placeholder="How can we help you?"></textarea>
                            </div>
                            <button type="submit" className="w-full py-4 bg-primary text-white font-bold uppercase tracking-widest rounded hover:bg-secondary transition-colors">
                                Send Message
                            </button>
                        </form>
                    </div>
                </div>
            </section>
        </main>
    );
}

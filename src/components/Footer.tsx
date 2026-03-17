import Link from 'next/link';
import { FaInstagram, FaYoutube, FaFacebook, FaWhatsapp, FaCreditCard, FaLock } from 'react-icons/fa';
import { SiRazorpay } from 'react-icons/si';

export default function Footer() {
    return (
        <footer className="bg-primary text-white pt-16 pb-8 px-6 md:px-16 mt-auto border-t border-white/10">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

                {/* 1. Brand & Description */}
                <div className="space-y-6">
                    <div>
                        <h2 className="font-serif text-2xl font-bold tracking-wider mb-2">Shakti Yoga</h2>
                        <p className="text-xs uppercase tracking-widest opacity-70">Kendra</p>
                    </div>
                    <p className="font-sans text-sm leading-relaxed opacity-90 text-white/80">
                        Yoga is not just a practice. It’s a way of life. Whether you seek stress relief, physical well-being, or a deeper connection to yourself, Shakti Yoga Kendra welcomes you to embark on this journey with us.
                    </p>
                    <div className="flex gap-4">
                        <a href="#" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors" aria-label="Instagram"><FaInstagram /></a>
                        <a href="#" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors" aria-label="YouTube"><FaYoutube /></a>
                        <a href="#" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors" aria-label="Facebook"><FaFacebook /></a>
                        <a href="https://wa.me/917204050478" className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors" aria-label="WhatsApp"><FaWhatsapp /></a>
                    </div>
                </div>

                {/* 2. Quick Navigation */}
                <div className="grid grid-cols-2 gap-8 lg:col-span-2">
                    <div>
                        <h3 className="font-serif text-lg mb-6 text-secondary">Programs</h3>
                        <ul className="space-y-4 text-sm opacity-80 font-sans">
                            <li><Link href="/everyday-yoga" className="hover:text-secondary transition-colors">Everyday Yoga</Link></li>
                            <li><Link href="/yoga-therapy" className="hover:text-secondary transition-colors">Yoga Therapy (1:1)</Link></li>
                            <li><Link href="/trial" className="hover:text-secondary transition-colors font-bold">Free Trial Class</Link></li>
                            <li><Link href="/yoga-therapy/start" className="hover:text-secondary transition-colors">Consultation Call</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-serif text-lg mb-6 text-secondary">Explore</h3>
                        <ul className="space-y-4 text-sm opacity-80 font-sans">
                            <li><Link href="/" className="hover:text-secondary transition-colors">Home</Link></li>
                            <li><Link href="/about" className="hover:text-secondary transition-colors">About</Link></li>
                            <li><Link href="/stories" className="hover:text-secondary transition-colors">Success Stories</Link></li>
                            <li><Link href="/blog" className="hover:text-secondary transition-colors">Blog & Resources</Link></li>
                            <li><Link href="/contact" className="hover:text-secondary transition-colors">Contact & Support</Link></li>
                        </ul>
                    </div>
                </div>

                {/* 3. Newsletter & Contact */}
                <div className="space-y-8">
                    <div>
                        <h3 className="font-serif text-lg mb-4 text-secondary">Stay Connected</h3>
                        <p className="text-xs opacity-70 mb-4">Get weekly yoga tips and short routines in your inbox.</p>
                        <form className="flex gap-2">
                            <input
                                type="email"
                                placeholder="Your email address"
                                className="bg-white/10 border border-white/20 rounded px-4 py-2 text-sm w-full focus:outline-none focus:border-secondary placeholder:text-white/30"
                            />
                            <button className="px-4 py-2 bg-secondary text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-white hover:text-primary transition-colors">
                                Join
                            </button>
                        </form>
                    </div>

                    <div className="text-sm space-y-2 opacity-80 font-sans">
                        <p><strong className="text-white">Email:</strong> <a href="mailto:contactus@shaktiyoga.in" className="hover:text-secondary">contactus@shaktiyoga.in</a></p>
                        <p><strong className="text-white">Phone:</strong> <a href="tel:+917204050478" className="hover:text-secondary">+91 7204050478</a></p>
                        <p className="text-xs opacity-60 mt-2">We respond between 9 AM – 9 PM IST</p>
                    </div>
                </div>
            </div>

            {/* 4. Bottom Bar: Legal, Address, Copyright */}
            <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-6 text-xs opacity-60 font-sans">
                <div className="text-center md:text-left space-y-2">
                    <p>LIG 77, Hudco 4th Main Rd, near Netaji Nandanavana Park, Doddangudde, Udupi, Karnataka 576102</p>
                    <p>&copy; {new Date().getFullYear()} Shakti Yoga Kendra. All rights reserved. <span className="mx-2">|</span> Made with ❤️ in India</p>
                </div>

                <div className="flex flex-wrap justify-center gap-6 uppercase tracking-wider">
                    <Link href="/terms" className="hover:text-secondary transition-colors">Terms</Link>
                    <Link href="/privacy" className="hover:text-secondary transition-colors">Privacy</Link>
                    <Link href="#" className="hover:text-secondary transition-colors">Refunds</Link>
                    <Link href="/disclaimer" className="hover:text-secondary transition-colors">Disclaimer</Link>
                </div>

                <div className="flex items-center gap-3 opacity-80">
                    <span className="flex items-center gap-1"><FaLock /> SSL Secured</span>
                    <span className="h-4 w-px bg-white/20"></span>
                    <div className="flex gap-2 text-lg">
                        <FaCreditCard title="Card Payment" />
                        <SiRazorpay title="Razorpay" />
                    </div>
                </div>
            </div>

            <div className="text-center mt-8 text-[10px] opacity-30">
                Yoga is not a replacement for medical treatment; consult your doctor before starting any new exercise regime.
            </div>
        </footer>
    );
}

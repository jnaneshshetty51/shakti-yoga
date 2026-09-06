"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

/**
 * Marketing Navbar/Footer wrap the public site only. Dashboard and admin have
 * their own sidebar chrome, so hide the site chrome there (was double-stacked).
 * `footer` is the server-rendered <Footer/> passed through the client boundary.
 */
export default function ChromeGate({
    children,
    footer,
}: {
    children: React.ReactNode;
    footer: React.ReactNode;
}) {
    const pathname = usePathname() || "/";
    const bare = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

    return (
        <>
            {!bare && <Navbar />}
            {children}
            {!bare && footer}
        </>
    );
}

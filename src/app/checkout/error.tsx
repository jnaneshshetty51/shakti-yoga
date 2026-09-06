"use client";

import SectionError from "@/components/SectionError";

export default function CheckoutError(props: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <SectionError
            {...props}
            title="Checkout"
            homeHref="/programs"
            homeLabel="Back to plans"
        />
    );
}

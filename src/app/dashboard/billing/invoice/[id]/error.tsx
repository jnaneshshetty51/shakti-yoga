"use client";

import SectionError from "@/components/SectionError";

export default function InvoiceError(props: { error: Error & { digest?: string }; reset: () => void }) {
    return <SectionError {...props} title="This invoice" homeHref="/dashboard/billing" homeLabel="Back to billing" />;
}

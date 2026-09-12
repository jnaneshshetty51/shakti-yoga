import Link from "next/link";

export interface Crumb {
    label: string;
    href?: string;
}

/** Simple text breadcrumb trail for deep public pages. Last crumb is the current page (no link). */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
    return (
        <nav aria-label="Breadcrumb" className="text-sm text-gray-400 mb-6">
            <ol className="flex flex-wrap items-center gap-1.5">
                {items.map((item, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                        {i > 0 && <span aria-hidden="true">/</span>}
                        {item.href ? (
                            <Link href={item.href} className="hover:text-primary transition-colors">
                                {item.label}
                            </Link>
                        ) : (
                            <span className="text-gray-600" aria-current="page">{item.label}</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

export default function AdminLoading() {
    return (
        <div className="animate-pulse space-y-6" role="status" aria-label="Loading">
            <div className="h-7 w-48 bg-primary/10 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 bg-white rounded-lg border border-gray-200" />
                ))}
            </div>
            <div className="h-80 bg-white rounded-lg border border-gray-200" />
        </div>
    );
}

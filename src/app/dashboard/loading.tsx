export default function DashboardLoading() {
    return (
        <div className="animate-pulse space-y-6" role="status" aria-label="Loading">
            <div className="h-8 w-56 bg-primary/10 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-28 bg-white rounded-lg border border-primary/10" />
                ))}
            </div>
            <div className="h-64 bg-white rounded-lg border border-primary/10" />
        </div>
    );
}

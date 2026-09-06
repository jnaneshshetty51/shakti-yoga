export default function TeacherLoading() {
    return (
        <div className="animate-pulse space-y-6" role="status" aria-label="Loading">
            <div className="h-7 w-44 bg-primary/10 rounded" />
            <div className="h-40 bg-white rounded-lg border border-gray-200" />
            <div className="h-40 bg-white rounded-lg border border-gray-200" />
        </div>
    );
}

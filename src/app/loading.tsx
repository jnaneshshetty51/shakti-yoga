export default function Loading() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-label="Loading">
            <div className="h-8 w-8 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
        </div>
    );
}

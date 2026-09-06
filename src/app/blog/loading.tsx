export default function BlogLoading() {
    return (
        <main className="min-h-screen bg-white">
            <section className="bg-secondary/10 py-20 px-4">
                <div className="max-w-4xl mx-auto text-center animate-pulse">
                    <div className="h-4 w-40 bg-secondary/20 rounded mx-auto mb-6" />
                    <div className="h-10 w-2/3 bg-primary/15 rounded mx-auto mb-6" />
                    <div className="h-4 w-1/2 bg-text/10 rounded mx-auto" />
                </div>
            </section>
            <section className="py-20 px-4">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="animate-pulse">
                            <div className="bg-gray-100 aspect-[4/3] rounded-lg mb-6" />
                            <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
                            <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
                            <div className="h-4 w-full bg-gray-100 rounded" />
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}

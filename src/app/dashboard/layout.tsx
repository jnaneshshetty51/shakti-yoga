import Sidebar from "@/components/dashboard/Sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-accent/20">
            <Sidebar />
            <div className="lg:ml-64 p-4 md:p-8">
                {children}
            </div>
        </div>
    );
}

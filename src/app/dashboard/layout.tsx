import Sidebar from "@/components/dashboard/Sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#FBFAF7]">
            <Sidebar />
            <div className="pt-[4.5rem] lg:pt-0 lg:ml-64 p-4 lg:p-8">{children}</div>
        </div>
    );
}

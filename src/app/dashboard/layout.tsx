import Sidebar from "@/components/dashboard/Sidebar";
import { ToastProvider } from "@/components/admin/Toast";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ToastProvider>
            <div className="min-h-screen bg-[#FBFAF7]">
                <Sidebar />
                <div className="pt-[4.5rem] lg:pt-0 lg:ml-64 p-4 lg:p-8">{children}</div>
            </div>
        </ToastProvider>
    );
}

import { redirect } from "next/navigation";

// Consultations and 1:1 therapy sessions are managed on one page now.
export default function ConsultationsPage() {
    redirect("/dashboard/therapy/book");
}

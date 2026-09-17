"use client";

import { use } from "react";
import BlogEditor from "@/components/admin/BlogEditor";

export default function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <BlogEditor mode="edit" id={id} />;
}

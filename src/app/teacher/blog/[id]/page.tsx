"use client";

import { use } from "react";
import TeacherBlogEditor from "@/components/teacher/TeacherBlogEditor";

export default function EditTeacherArticlePage(props: { params: Promise<{ id: string }> }) {
    const { id } = use(props.params);
    return <TeacherBlogEditor mode="edit" postId={id} />;
}

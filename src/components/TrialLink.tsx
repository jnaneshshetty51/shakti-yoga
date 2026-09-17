"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import AlreadyMemberModal from "@/components/AlreadyMemberModal";

interface TrialLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    href?: string;
    children: React.ReactNode;
    className?: string;
}

export default function TrialLink({
    href = "/trial",
    children,
    className,
    onClick,
    ...props
}: TrialLinkProps) {
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const isMember =
        user &&
        (user.role === "member_everyday" ||
            user.role === "member_starter" ||
            user.role === "member_therapy" ||
            user.role === "trial" ||
            user.role === "admin");

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (isMember) {
            e.preventDefault();
            setIsModalOpen(true);
            if (onClick) onClick(e);
            return;
        }
        if (onClick) onClick(e);
    };

    return (
        <>
            <Link href={href} onClick={handleClick} className={className} {...props}>
                {children}
            </Link>

            <AlreadyMemberModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                memberRole={user?.role}
            />
        </>
    );
}

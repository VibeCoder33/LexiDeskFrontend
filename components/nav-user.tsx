"use client";

import * as React from "react";
import { User } from "@/types/auth";
import { performLogout } from "@/lib/auth";
import { getRoleConfig } from "@/lib/roleConfig";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FirmSettingsModal } from "./firm-settings-modal";
import { Building2, LogOut, ChevronUp } from "lucide-react";

interface NavUserProps {
    user: User;
    onUserUpdate?: (updated: User) => void;
}

export function NavUser({ user, onUserUpdate }: NavUserProps) {
    const [isFirmModalOpen, setIsFirmModalOpen] = React.useState(false);

    const roleConfig = getRoleConfig(user.role);
    const roleLabel = roleConfig ? roleConfig.label : user.role;

    const initials = user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--muted)] transition-colors text-left cursor-pointer outline-none border border-transparent hover:border-[var(--border)]">
                    <Avatar className="w-8 h-8 rounded-md bg-[var(--primary)] text-white font-semibold text-xs shrink-0 flex items-center justify-center">
                        <AvatarFallback className="bg-[var(--primary)] text-white">
                            {initials}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 leading-tight">
                        <p className="text-xs font-semibold text-[var(--foreground)] truncate">
                            {user.name}
                        </p>
                        <p className="text-[11px] text-[var(--muted-foreground)] truncate font-medium">
                            {roleLabel}
                        </p>
                    </div>

                    <ChevronUp className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    align="start"
                    side="top"
                    className="w-56 bg-[var(--card)] border border-[var(--border)] shadow-elevation-2 rounded-lg p-1"
                >
                    {/* Wrap DropdownMenuLabel inside DropdownMenuGroup or replace with a div */}
                    <DropdownMenu>
                        <DropdownMenuLabel className="p-2 text-xs">
                            <span className="block font-semibold text-[var(--foreground)] truncate">
                                {user.name}
                            </span>
                            <span className="block text-[11px] text-[var(--muted-foreground)] truncate font-normal">
                                {user.email}
                            </span>
                            {user.firmName && (
                                <span className="block text-[11px] text-[var(--primary)] font-medium truncate mt-0.5">
                                    {user.firmName}
                                </span>
                            )}
                        </DropdownMenuLabel>
                    </DropdownMenu>

                    <DropdownMenuSeparator className="bg-[var(--border)]" />

                    <DropdownMenuItem
                        onClick={() => setIsFirmModalOpen(true)}
                        className="text-xs flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-[var(--muted)] text-[var(--foreground)]"
                    >
                        <Building2 className="w-4 h-4 text-[var(--primary)]" />
                        <span>Firm Settings</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-[var(--border)]" />

                    <DropdownMenuItem
                        onClick={() => performLogout()}
                        className="text-xs flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)]"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <FirmSettingsModal
                user={user}
                isOpen={isFirmModalOpen}
                onClose={() => setIsFirmModalOpen(false)}
                onUpdate={(updated) => onUserUpdate?.(updated)}
            />
        </>
    );
}

"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type UserMenuProps = {
  logoutAction: (formData: FormData) => void | Promise<void>;
};

export function UserMenu({ logoutAction }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-colors"
          style={{
            backgroundColor: "var(--theme-card-header-bg)",
            border: "1px solid var(--theme-card-border)",
            boxShadow: "var(--theme-card-shadow)",
          }}
        >
          <Avatar>
            <AvatarFallback
              style={{
                backgroundColor: "transparent",
                color: "var(--theme-page-fg)",
              }}
            >
              U
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="bottom"
        className="min-w-[160px] p-0"
      >
        {/* ✅ Container wrapper */}
        <div
          style={{
            backgroundColor: "var(--theme-card-bg)",
            color: "var(--theme-card-fg)",
            border: "1px solid var(--theme-card-border)",
            boxShadow: "var(--theme-card-shadow)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link
              href="/home/profile"
              className="block w-full cursor-pointer px-4 py-2 text-sm"
              style={{ color: "var(--theme-card-fg)" }}
            >
              Profile
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="cursor-pointer">
            <Link
              href="/home/settings"
              className="block w-full cursor-pointer px-4 py-2 text-sm"
              style={{ color: "var(--theme-card-fg)" }}
            >
              Settings
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="cursor-pointer">
            <form action={logoutAction} className="w-full">
              <button
                type="submit"
                className="block w-full cursor-pointer px-4 py-2 text-left text-sm"
                style={{ color: "var(--theme-card-fg)" }}
              >
                Logout
              </button>
            </form>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
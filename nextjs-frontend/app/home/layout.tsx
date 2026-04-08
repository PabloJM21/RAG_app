import Link from "next/link";
import Image from "next/image";
import { Home, Users2, List } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { logout } from "@/app/api/login/logout-action";
import { fetchThemes } from "@/app/api/rag/settings/themes-action";
import { THEME_PRESETS, ThemeName } from "@/components/frontend_data/themes";
import { ThemeScope } from "@/components/custom-ui/ThemeScope";

export default async function DashboardParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeSettings = await fetchThemes();

  const selectedTheme: ThemeName =
    themeSettings?.selectedTheme && themeSettings.selectedTheme in THEME_PRESETS
      ? (themeSettings.selectedTheme as ThemeName)
      : "neutral";

  const theme = THEME_PRESETS[selectedTheme];

  return (
    <ThemeScope theme={theme} className="min-h-screen">
      <div
        className="flex min-h-screen"
        style={{
          backgroundColor: "var(--theme-page-bg)",
          color: "var(--theme-page-fg)",
        }}
      >
        {/* Sidebar */}


        {/* Main */}
        <main
          className="ml-16 w-full p-4 md:p-5"
          style={{
            backgroundColor: "var(--theme-page-bg)",
          }}
        >
          <header className="mb-6 flex items-center justify-between">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link
                      href="/home/rag"
                      className="flex items-center gap-2"
                      style={{ color: "var(--theme-page-muted-fg)" }}
                    >
                      <Home className="h-4 w-4" />
                      <span>Home</span>
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>

                <BreadcrumbSeparator
                  style={{ color: "var(--theme-page-muted-fg)" }}
                >
                  /
                </BreadcrumbSeparator>


              </BreadcrumbList>
            </Breadcrumb>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
                  style={{
                    backgroundColor: "var(--theme-card-header-bg)",
                    border: "1px solid var(--theme-card-border)",
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
                style={{
                  backgroundColor: "var(--theme-card-bg)",
                  color: "var(--theme-card-fg)",
                  border: "1px solid var(--theme-card-border)",
                  boxShadow: "var(--theme-card-shadow)",
                }}
              >
                <DropdownMenuItem asChild>
                  <Link
                    href="/home/profile"
                    className="block px-4 py-2 text-sm"
                    style={{ color: "var(--theme-card-fg)" }}
                  >
                    Profile
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    href="/home/settings"
                    className="block px-4 py-2 text-sm"
                    style={{ color: "var(--theme-card-fg)" }}
                  >
                    Settings
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <button
                    onClick={logout}
                    className="block w-full px-4 py-2 text-left text-sm"
                    style={{ color: "var(--theme-card-fg)" }}
                  >
                    Logout
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {children}
        </main>
      </div>
    </ThemeScope>
  );
}
import Link from "next/link";
import { Home, MessageCircle } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/../components/ui/breadcrumb";

import { logout } from "@/api/login/logout-action";
import { fetchThemes } from "@/api/rag/settings/themes-action";
import { THEME_PRESETS, ThemeName } from "@/../components/frontend_data/themes";
import { ThemeScope } from "@/../components/custom-ui/ThemeScope";

import { UserMenu } from "./UserMenu";

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

  async function logoutAction(_formData: FormData): Promise<void> {
    "use server";
    await logout();
  }

  return (
    <ThemeScope theme={theme} className="min-h-screen">
      <div
        className="flex min-h-screen"
        style={{
          backgroundColor: "var(--theme-page-bg)",
          color: "var(--theme-page-fg)",
        }}
      >
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

                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link
                      href="/home/chat"
                      className="flex items-center gap-2"
                      style={{ color: "var(--theme-page-muted-fg)" }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Chat</span>
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <UserMenu logoutAction={logoutAction} />
          </header>

          {children}
        </main>
      </div>
    </ThemeScope>
  );
}
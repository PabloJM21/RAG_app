import { fetchColors } from "@/app/api/rag/settings/colors-action";
import { fetchThemes } from "@/app/api/rag/settings/themes-action";
import ColorsPageClient from "./ColorsPageClient";
import { ThemeName, THEME_PRESETS } from "@/components/frontend_data/themes";

export default async function SettingsPage() {
  const [colors, themeSettings] = await Promise.all([
    fetchColors(),
    fetchThemes(),
  ]);

  const initialTheme: ThemeName =
    themeSettings?.selectedTheme && themeSettings.selectedTheme in THEME_PRESETS
      ? (themeSettings.selectedTheme as ThemeName)
      : "neutral";

  return (
    <ColorsPageClient
      pipeline={colors}
      initialTheme={initialTheme}
    />
  );
}
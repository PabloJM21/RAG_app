"use client";

import * as React from "react";
import { ThemeSpec } from "@/components/frontend_data/themes";

export function ThemeScope({
  theme,
  children,
  className,
}: {
  theme: ThemeSpec;
  children: React.ReactNode;
  className?: string;
}) {
  const style = {
    "--theme-page-bg": theme.page.background,
    "--theme-page-fg": theme.page.foreground,
    "--theme-page-muted-fg": theme.page.mutedForeground,
    "--theme-panel-bg": theme.page.panelBackground,
    "--theme-inner-panel-bg": theme.page.innerPanelBackground,

    "--theme-card-bg": theme.card.background,
    "--theme-card-fg": theme.card.foreground,
    "--theme-card-border": theme.card.border,
    "--theme-card-shadow": theme.card.shadow,
    "--theme-card-header-bg": theme.card.headerBackground,
    "--theme-card-header-border": theme.card.headerBorder,
    "--theme-card-title": theme.card.title,
    "--theme-card-muted": theme.card.mutedText,

    "--theme-accent-border": theme.accent.border,
    "--theme-accent-ring": theme.accent.ring,
    "--theme-accent-outline": theme.accent.outline,
    "--theme-accent-top-line": theme.accent.topLine,
    "--theme-accent-glow": theme.accent.glow,
    "--theme-accent-header-glow": theme.accent.headerGlow,

    "--theme-button-primary-bg": theme.button.primaryBackground,
    "--theme-button-primary-fg": theme.button.primaryForeground,
    "--theme-button-primary-border": theme.button.primaryBorder,
    "--theme-button-primary-hover-bg": theme.button.primaryHoverBackground,

    "--theme-button-outline-bg": theme.button.outlineBackground,
    "--theme-button-outline-fg": theme.button.outlineForeground,
    "--theme-button-outline-border": theme.button.outlineBorder,
    "--theme-button-outline-hover-bg": theme.button.outlineHoverBackground,

    "--theme-input-bg": theme.input.background,
    "--theme-input-fg": theme.input.foreground,
    "--theme-input-border": theme.input.border,
    "--theme-input-focus-ring": theme.input.focusRing,
  } as React.CSSProperties;

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
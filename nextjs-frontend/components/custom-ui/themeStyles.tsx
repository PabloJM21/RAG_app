import React from "react";

export const themedPageStyle: React.CSSProperties = {
  backgroundColor: "var(--theme-page-bg)",
  color: "var(--theme-page-fg)",
};

export const themedCardStyle: React.CSSProperties = {
  backgroundColor: "var(--theme-card-bg)",
  color: "var(--theme-card-fg)",
  borderColor: "var(--theme-card-border)",
  boxShadow: "var(--theme-card-shadow)",
};

export const themedCardHeaderStyle: React.CSSProperties = {
  backgroundColor: "var(--theme-card-header-bg)",
  borderColor: "var(--theme-card-header-border)",
};

export const themedMutedTextStyle: React.CSSProperties = {
  color: "var(--theme-card-muted)",
};

export const themedTitleTextStyle: React.CSSProperties = {
  color: "var(--theme-card-title)",
};

export const themedPrimaryButtonStyle: React.CSSProperties = {
  backgroundColor: "var(--theme-button-primary-bg)",
  color: "var(--theme-button-primary-fg)",
  borderColor: "var(--theme-button-primary-border)",
};

export const themedOutlineButtonStyle: React.CSSProperties = {
  backgroundColor: "var(--theme-button-outline-bg)",
  color: "var(--theme-button-outline-fg)",
  borderColor: "var(--theme-button-outline-border)",
};

export const themedInputStyle: React.CSSProperties = {
  backgroundColor: "var(--theme-input-bg)",
  color: "var(--theme-input-fg)",
  borderColor: "var(--theme-input-border)",
};

/* added, without removing anything */

export const themedPanelStyle: React.CSSProperties = {
  backgroundColor: "var(--theme-panel-bg)",
  color: "var(--theme-page-fg)",
  borderColor: "var(--theme-card-border)",
};

export const themedInnerPanelStyle: React.CSSProperties = {
  backgroundColor: "var(--theme-inner-panel-bg)",
  color: "var(--theme-card-fg)",
  borderColor: "var(--theme-card-border)",
};

export const themedMenuContentStyle: React.CSSProperties = {
  backgroundColor: "var(--theme-card-bg)",
  color: "var(--theme-card-fg)",
  borderColor: "var(--theme-card-border)",
  boxShadow: "var(--theme-card-shadow)",
};

export const themedMenuItemStyle: React.CSSProperties = {
  color: "var(--theme-card-fg)",
};

export const themedDangerMenuItemStyle: React.CSSProperties = {
  color: "var(--theme-card-fg)",
};

export const themedSubtleIconButtonStyle: React.CSSProperties = {
  color: "var(--theme-card-muted)",
};

export const themedSeparatorStyle: React.CSSProperties = {
  backgroundColor: "var(--theme-card-border)",
  borderColor: "var(--theme-card-border)",
};

export const themedDialogContentStyle: React.CSSProperties = {
  backgroundColor: "var(--theme-card-bg)",
  color: "var(--theme-card-fg)",
  borderColor: "var(--theme-card-border)",
  boxShadow: "var(--theme-card-shadow)",
};

export const themedScrollAreaStyle: React.CSSProperties = {
  backgroundColor: "var(--theme-inner-panel-bg)",
  borderColor: "var(--theme-card-border)",
  color: "var(--theme-card-fg)",
};

export const themedInteractiveRowStyle: React.CSSProperties = {
  color: "var(--theme-card-fg)",
};

export const themedResizerLineStyle: React.CSSProperties = {
  backgroundColor: "var(--theme-card-border)",
};

export const themedResizerLineActiveStyle: React.CSSProperties = {
  backgroundColor: "var(--theme-accent-ring)",
  boxShadow: "0 0 10px var(--theme-accent-glow)",
};



export const themeClassNames = {
  menuContent:
  "border bg-[var(--theme-card-bg)] text-[var(--theme-card-fg)]",

  menuItem:
    "relative cursor-pointer rounded-sm text-[var(--theme-card-fg)] outline-none transition-colors " +
    "focus:bg-[var(--theme-card-header-bg)] focus:text-[var(--theme-card-fg)] " +
    "data-[highlighted]:bg-[var(--theme-card-header-bg)] data-[highlighted]:text-[var(--theme-card-fg)]",

  menuItemDanger:
    "relative cursor-pointer rounded-sm text-destructive outline-none transition-colors " +
    "focus:bg-[var(--theme-card-header-bg)] data-[highlighted]:bg-[var(--theme-card-header-bg)]",

  menuGhostTrigger:
    "text-[var(--theme-card-muted)] hover:text-[var(--theme-card-fg)] hover:bg-[var(--theme-button-outline-hover-bg)]",

  menuRowButton:
    "w-full text-left text-sm",

  menuSubmitButton:
    "w-full text-left text-sm px-2 py-1.5 rounded-sm outline-none transition-colors bg-transparent text-inherit disabled:opacity-50 disabled:pointer-events-none",
  subtleIconButton:
    "hover:bg-[var(--theme-button-outline-hover-bg)] hover:text-[var(--theme-button-outline-fg)]",
  primaryButton:
    "hover:bg-[var(--theme-button-primary-hover-bg)]",
  outlineButton:
    "hover:bg-[var(--theme-button-outline-hover-bg)]",
  dialogRowButton:
    "hover:bg-[var(--theme-card-header-bg)] focus:bg-[var(--theme-card-header-bg)]",
};






// Containers


export const themedContainerCardStyle: React.CSSProperties = {
  ...themedCardStyle,
  borderColor: "var(--theme-accent-border)",
};

export const themedContainerInnerRingStyle: React.CSSProperties = {
  outlineColor: "var(--theme-accent-outline)",
};

export const themedContainerTopLineStyle: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, transparent, var(--theme-accent-top-line), transparent)",
};

export const themedContainerHeaderGlowStyle: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(600px 120px at 20% 0%, var(--theme-accent-header-glow), transparent 70%)",
};

export const themedContainerTextureStyle: React.CSSProperties = {
  backgroundImage: [
    "linear-gradient(135deg, color-mix(in srgb, var(--theme-accent-glow) 28%, transparent) 0%, transparent 35%, color-mix(in srgb, var(--theme-accent-glow) 22%, transparent) 70%, transparent 100%)",
    "radial-gradient(1200px 260px at 20% 0%, color-mix(in srgb, white 40%, transparent), transparent 60%)",
    "radial-gradient(800px 260px at 80% 100%, color-mix(in srgb, black 8%, transparent), transparent 55%)",
  ].join(","),
};

export const themedContainerConnectorLineStyle: React.CSSProperties = {
  stroke: "var(--theme-accent-ring)",
  filter: "drop-shadow(0 0 6px var(--theme-accent-glow))",
};

export const themedContainerConnectorArrowStyle: React.CSSProperties = {
  fill: "var(--theme-accent-ring)",
  filter: "drop-shadow(0 0 6px var(--theme-accent-glow))",
};
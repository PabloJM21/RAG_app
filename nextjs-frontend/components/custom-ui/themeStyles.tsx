import React from "react";









export const themedPrimaryButtonStyle: React.CSSProperties = {
  backgroundColor: "var(--theme-button-primary-bg)",
  color: "var(--theme-button-primary-fg)",
  borderColor: "var(--theme-button-primary-border)",
};



/* added, without removing anything */


export const themedResizerLineStyle: React.CSSProperties = {
  backgroundColor: "var(--theme-card-border)",
};

export const themedResizerLineActiveStyle: React.CSSProperties = {
  backgroundColor: "var(--theme-accent-ring)",
  boxShadow: "0 0 10px var(--theme-accent-glow)",
};


/* Cards */

export const themedCardStyle: React.CSSProperties = {
  background: "var(--theme-card-bg)",
  color: "var(--theme-card-fg)",
  borderColor: "var(--theme-card-border)",
  boxShadow: "var(--theme-card-shadow)",
  position: "relative",
  overflow: "hidden",
};

export const themedCardInnerOverlayStyle: React.CSSProperties = {
  pointerEvents: "none",
  position: "absolute",
  inset: 0,
  borderRadius: "inherit",
  outline: "1px solid var(--theme-accent-outline)",
  outlineOffset: "-1px",
  backgroundImage: [
    "linear-gradient(135deg, color-mix(in srgb, var(--theme-accent-ring) 24%, transparent) 0%, transparent 30%, color-mix(in srgb, var(--theme-accent-ring) 18%, transparent) 68%, transparent 100%)",
    "radial-gradient(1200px 260px at 20% 0%, color-mix(in srgb, white 22%, transparent), transparent 60%)",
    "radial-gradient(900px 280px at 80% 100%, color-mix(in srgb, black 16%, transparent), transparent 58%)",
    "radial-gradient(900px 400px at 50% -10%, color-mix(in srgb, var(--theme-accent-glow) 30%, transparent), transparent 70%)",
  ].join(", "),
};

export const themedHeaderStyle: React.CSSProperties = {
  position: "relative",
  background: "var(--theme-card-header-bg)",
  borderBottomColor: "var(--theme-card-header-border)",
};

export const themedTopLineStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 1,
  backgroundImage:
    "linear-gradient(to right, transparent, var(--theme-accent-top-line), transparent)",
  boxShadow: "0 0 12px var(--theme-accent-glow)",
};

export const themedHeaderGlowStyle: React.CSSProperties = {
  pointerEvents: "none",
  position: "absolute",
  inset: 0,
  backgroundImage:
    "radial-gradient(700px 140px at 20% 0%, color-mix(in srgb, var(--theme-accent-header-glow) 95%, transparent), transparent 72%)",
};

export const themedTitleStyle: React.CSSProperties = {
  color: "var(--theme-card-title)",
};

export const themedMutedStyle: React.CSSProperties = {
  color: "var(--theme-card-muted)",
};

export const themedLabelStyle: React.CSSProperties = {
  color: "var(--theme-card-title)",
};

export const themedInputStyle: React.CSSProperties = {
  background: "var(--theme-card-header-bg)",
  color: "var(--theme-doc-title)",
  borderColor: "var(--theme-input-border)",
};

export const themedContentStyle: React.CSSProperties = {
  color: "var(--theme-card-title)",
  background: "var(--theme-card-header-bg)",
};

export const themedSectionStyle: React.CSSProperties = {
  background: "var(--theme-card-header-bg)",
  borderColor: "var(--theme-card-header-border)",
};

export const themedSectionTitleStyle: React.CSSProperties = {
  color: "var(--theme-card-title)",
};

export const themedSectionMutedStyle: React.CSSProperties = {
  color: "var(--theme-card-muted)",
};

export const themedSectionContentStyle: React.CSSProperties = {
  background: "var(--theme-card-header-bg)",
  borderTopColor: "var(--theme-card-header-border)",
};

export const themedValueStyle: React.CSSProperties = {
  color: "var(--theme-doc-title)",
};


// theme-classes.ts
export const themeClasses = {
  panel:
    "bg-[var(--theme-panel-bg)] text-[var(--theme-page-fg)] border border-[var(--theme-card-border)]",

  card:
    "bg-[var(--theme-card-bg)] text-[var(--theme-card-fg)] border border-[var(--theme-card-border)] shadow-[var(--theme-card-shadow)]",

  cardHeader:
    "bg-[var(--theme-card-header-bg)] border-b border-[var(--theme-card-header-border)]",

  title:
    "text-[var(--theme-card-title)]",

  muted:
    "text-[var(--theme-card-muted)]",

  input:
    "bg-[var(--theme-input-bg)] text-[var(--theme-input-fg)] border-[var(--theme-input-border)] placeholder:text-[var(--theme-card-muted)] focus-visible:ring-[var(--theme-input-focus-ring)] focus-visible:border-[var(--theme-input-border)]",

  buttonPrimary:
    "bg-[var(--theme-button-primary-bg)] text-[var(--theme-button-primary-fg)] border border-[var(--theme-button-primary-border)] hover:bg-[var(--theme-button-primary-hover-bg)]",

  buttonOutline:
    "bg-[var(--theme-button-outline-bg)] text-[var(--theme-button-outline-fg)] border border-[var(--theme-button-outline-border)] hover:bg-[var(--theme-button-outline-hover-bg)]",

  menuContent:
    "bg-[var(--theme-card-bg)] text-[var(--theme-card-fg)] border border-[var(--theme-card-border)] shadow-[var(--theme-card-shadow)]",

  menuItem:
    "focus:bg-[var(--theme-card-header-bg)] focus:text-[var(--theme-card-fg)] data-[highlighted]:bg-[var(--theme-card-header-bg)] data-[highlighted]:text-[var(--theme-card-fg)]",

  subtleIconButton:
    "text-[var(--theme-card-muted)] hover:text-[var(--theme-card-fg)] hover:bg-[var(--theme-button-outline-hover-bg)]",

  scrollArea:
    "rounded-md border border-[var(--theme-card-border)] bg-[var(--theme-inner-panel-bg)]",

  separator:
    "bg-[var(--theme-accent-border)]",

  accentRing:
    "focus-visible:ring-2 focus-visible:ring-[var(--theme-accent-ring)] focus-visible:ring-offset-0",

  danger:
    "text-red-500",
};
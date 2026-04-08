export type ThemeName = "neutral" | "dark" | "bright";

export type ThemeSpec = {
  name: ThemeName;
  label: string;

  page: {
    background: string;
    foreground: string;
    mutedForeground: string;
    panelBackground: string;
    innerPanelBackground: string;
  };

  card: {
    background: string;
    foreground: string;
    border: string;
    shadow: string;
    headerBackground: string;
    headerBorder: string;
    title: string;
    mutedText: string;
  };

  accent: {
    border: string;
    ring: string;
    outline: string;
    topLine: string;
    glow: string;
    headerGlow: string;
  };

  button: {
    primaryBackground: string;
    primaryForeground: string;
    primaryBorder: string;
    primaryHoverBackground: string;

    outlineBackground: string;
    outlineForeground: string;
    outlineBorder: string;
    outlineHoverBackground: string;
  };

  input: {
    background: string;
    foreground: string;
    border: string;
    focusRing: string;
  };
};

export const THEME_PRESETS: Record<ThemeName, ThemeSpec> = {
  neutral: {
    name: "neutral",
    label: "Neutral",
    page: {
      background: "#f8fafc",
      foreground: "#111827",
      mutedForeground: "#6b7280",
      panelBackground: "#ffffff",
      innerPanelBackground: "#e9eef5",
    },
    card: {
      background: "#ffffff",
      foreground: "#111827",
      border: "#e5e7eb",
      shadow: "0 1px 2px rgba(15,23,42,0.06)",
      headerBackground: "#f8fafc",
      headerBorder: "#e5e7eb",
      title: "#374151",
      mutedText: "#6b7280",
    },
    accent: {
      border: "rgba(100,116,139,0.24)",
      ring: "rgba(100,116,139,0.18)",
      outline: "rgba(100,116,139,0.18)",
      topLine: "rgba(100,116,139,0.22)",
      glow:
        "linear-gradient(135deg, rgba(148,163,184,0.08) 0%, rgba(148,163,184,0) 35%, rgba(203,213,225,0.10) 70%, rgba(148,163,184,0) 100%), radial-gradient(1200px 260px at 20% 0%, rgba(255,255,255,0.40), rgba(255,255,255,0) 60%), radial-gradient(800px 260px at 80% 100%, rgba(15,23,42,0.05), rgba(15,23,42,0) 55%)",
      headerGlow:
        "radial-gradient(600px 120px at 20% 0%, rgba(148,163,184,0.16), rgba(148,163,184,0) 70%)",
    },
    button: {
      primaryBackground: "#334155",
      primaryForeground: "#ffffff",
      primaryBorder: "#334155",
      primaryHoverBackground: "#1e293b",

      outlineBackground: "#ffffff",
      outlineForeground: "#334155",
      outlineBorder: "#cbd5e1",
      outlineHoverBackground: "#f8fafc",
    },
    input: {
      background: "#ffffff",
      foreground: "#111827",
      border: "#d1d5db",
      focusRing: "rgba(100,116,139,0.22)",
    },
  },

  dark: {
    name: "dark",
    label: "Dark",
    page: {
      background: "#f3efff",
      foreground: "#2f2340",
      mutedForeground: "#6f5c8f",
      panelBackground: "#fbf8ff",
      innerPanelBackground: "#e7dcff",
    },
    card: {
      background: "#ffffff",
      foreground: "#2f2340",
      border: "#d9cdf4",
      shadow: "0 8px 24px rgba(91, 65, 143, 0.10)",
      headerBackground: "#f3edff",
      headerBorder: "#cbb6f6",
      title: "#5b3b8a",
      mutedText: "#7d68a6",
    },
    accent: {
      border: "rgba(139,92,246,0.20)",
      ring: "rgba(168,85,247,0.18)",
      outline: "rgba(139,92,246,0.16)",
      topLine: "rgba(168,85,247,0.22)",
      glow:
        "linear-gradient(135deg, rgba(192,132,252,0.10) 0%, rgba(255,255,255,0) 35%, rgba(167,139,250,0.10) 70%, rgba(255,255,255,0) 100%), radial-gradient(1200px 260px at 20% 0%, rgba(255,255,255,0.50), rgba(255,255,255,0) 60%), radial-gradient(800px 260px at 80% 100%, rgba(139,92,246,0.08), rgba(139,92,246,0) 55%)",
      headerGlow:
        "radial-gradient(600px 120px at 20% 0%, rgba(192,132,252,0.18), rgba(192,132,252,0) 70%)",
    },
    button: {
      primaryBackground: "#8b5cf6",
      primaryForeground: "#ffffff",
      primaryBorder: "#8b5cf6",
      primaryHoverBackground: "#7c3aed",

      outlineBackground: "#f8f4ff",
      outlineForeground: "#5b3b8a",
      outlineBorder: "#ccb8f5",
      outlineHoverBackground: "#f3edff",
    },
    input: {
      background: "#ffffff",
      foreground: "#2f2340",
      border: "#d6c8f1",
      focusRing: "rgba(168,85,247,0.18)",
    },
  },

  bright: {
    name: "bright",
    label: "Bright",
    page: {
      background: "#fff7ed",
      foreground: "#7c2d12",
      mutedForeground: "#c2410c",
      panelBackground: "#fffaf5",
      innerPanelBackground: "#ffe3c2",
    },
    card: {
      background: "#fffaf5",
      foreground: "#7c2d12",
      border: "#fdba74",
      shadow: "0 1px 3px rgba(251,146,60,0.18)",
      headerBackground: "#fef3c7",
      headerBorder: "#fb7185",
      title: "#9a3412",
      mutedText: "#c2410c",
    },
    accent: {
      border: "rgba(251,146,60,0.30)",
      ring: "rgba(244,114,182,0.22)",
      outline: "rgba(251,146,60,0.22)",
      topLine: "rgba(244,114,182,0.28)",
      glow:
        "linear-gradient(135deg, rgba(251,146,60,0.10) 0%, rgba(255,255,255,0) 35%, rgba(244,114,182,0.10) 70%, rgba(255,255,255,0) 100%), radial-gradient(1200px 260px at 20% 0%, rgba(255,255,255,0.45), rgba(255,255,255,0) 60%), radial-gradient(800px 260px at 80% 100%, rgba(251,146,60,0.08), rgba(251,146,60,0) 55%)",
      headerGlow:
        "radial-gradient(600px 120px at 20% 0%, rgba(251,146,60,0.20), rgba(251,146,60,0) 70%)",
    },
    button: {
      primaryBackground: "#f97316",
      primaryForeground: "#ffffff",
      primaryBorder: "#f97316",
      primaryHoverBackground: "#ea580c",

      outlineBackground: "#fff7ed",
      outlineForeground: "#be123c",
      outlineBorder: "#fb7185",
      outlineHoverBackground: "#fff1f2",
    },
    input: {
      background: "#ffffff",
      foreground: "#7c2d12",
      border: "#fdba74",
      focusRing: "rgba(251,146,60,0.24)",
    },
  },
};
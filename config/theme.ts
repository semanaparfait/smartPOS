// SmartPOS brand tokens for places that need raw color values
// (icon colors, StatusBar, placeholderTextColor, inline styles).
// Keep in sync with global.css.
export const brand = {
  ink: "#20283B", // Text, dark sections, active states
  inkSoft: "#2E3850", // Hover / pressed on navy surfaces
  lime: "#D0E66B", // Buttons, highlights, accents
  limeDark: "#BFD655", // Hover / pressed on lime buttons
  ivory: "#F4F5EF", // Page background and soft panels
  white: "#FFFFFF", // Cards, alternating sections, navbar

  // Supporting colors
  inkMuted: "#6B7690",
  inkDisabled: "#9AA4BA",
  danger: "#DC2626",
  success: "#16A34A",
} as const;

export const brandLogos = {
  // Ink wordmark — use on white / ivory backgrounds
  light: require("@/assets/brand/smartpos-logo-light.png"),
  // White wordmark — use on ink backgrounds
  dark: require("@/assets/brand/smartpos-logo-dark.png"),
};

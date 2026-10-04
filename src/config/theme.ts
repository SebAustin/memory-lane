/**
 * `theme-color` for the browser chrome. A meta tag cannot read CSS custom
 * properties, so these mirror `--paper-50` (light and dark) in `globals.css`;
 * `theme.test.ts` fails if they drift from the tokens.
 */
export const THEME_COLOR = {
  light: "#fcf8f0",
  dark: "#19120d",
} as const;

/**
 * Validated color swatches for categories and charts.
 *
 * These are the eight categorical slots of the app's data-viz palette, in a
 * FIXED order chosen to maximise adjacent-pair distinguishability for color
 * vision deficiencies (validated with the dataviz palette validator). Each
 * swatch carries a separate step for light and dark surfaces — dark mode is
 * a selected color, not an automatic flip.
 *
 * Categories reference swatches by id, so custom categories can only pick
 * validated colors and every visualization stays accessible.
 */

export interface Swatch {
  id: string;
  /** Hex for light surfaces (#fcfcfb). */
  light: string;
  /** Hex for dark surfaces (#1a1a19). */
  dark: string;
}

/** Categorical slots 1–8. Assign in this order; never generate new hues. */
export const SWATCHES: Swatch[] = [
  { id: 'blue', light: '#2a78d6', dark: '#3987e5' },
  { id: 'aqua', light: '#1baf7a', dark: '#199e70' },
  { id: 'yellow', light: '#eda100', dark: '#c98500' },
  { id: 'green', light: '#008300', dark: '#008300' },
  { id: 'violet', light: '#4a3aa7', dark: '#9085e9' },
  { id: 'red', light: '#e34948', dark: '#e66767' },
  { id: 'magenta', light: '#e87ba4', dark: '#d55181' },
  { id: 'orange', light: '#eb6834', dark: '#d95926' },
];

const byId = new Map(SWATCHES.map((s) => [s.id, s]));

/** Resolve a swatch id to its hex for the given mode. Falls back to slot 8 ("other"). */
export function swatchColor(id: string, mode: 'light' | 'dark'): string {
  const s = byId.get(id) ?? SWATCHES[7];
  return mode === 'dark' ? s.dark : s.light;
}

/**
 * A translucent wash of the swatch for large fills (timeline blocks, week
 * cells) where the solid hue would overpower text. Text on top of a wash
 * always uses the normal ink tokens, which keeps WCAG contrast intact.
 */
export function swatchWash(id: string, mode: 'light' | 'dark'): string {
  const hex = swatchColor(id, mode);
  return hex + (mode === 'dark' ? '3d' : '2e'); // ~24% / ~18% alpha
}

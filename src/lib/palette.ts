/**
 * Validated color swatches for categories and charts.
 *
 * These are the eight categorical slots of the app's data-viz palette, in a
 * FIXED order chosen to maximise adjacent-pair distinguishability for color
 * vision deficiencies (validated with the dataviz palette validator against
 * the white chart surface). The app ships a single light theme.
 *
 * Categories reference swatches by id, so custom categories can only pick
 * validated colors and every visualization stays accessible.
 */

export interface Swatch {
  id: string;
  /** Hex for the white chart surface. */
  hex: string;
}

/** Categorical slots 1–8. Assign in this order; never generate new hues. */
export const SWATCHES: Swatch[] = [
  { id: 'blue', hex: '#2a78d6' },
  { id: 'aqua', hex: '#1baf7a' },
  { id: 'yellow', hex: '#eda100' },
  { id: 'green', hex: '#008300' },
  { id: 'violet', hex: '#4a3aa7' },
  { id: 'red', hex: '#e34948' },
  { id: 'magenta', hex: '#e87ba4' },
  { id: 'orange', hex: '#eb6834' },
];

const byId = new Map(SWATCHES.map((s) => [s.id, s]));

/** Resolve a swatch id to its hex. Falls back to slot 8 ("other"). */
export function swatchColor(id: string): string {
  return (byId.get(id) ?? SWATCHES[7]).hex;
}

/**
 * A translucent wash of the swatch for large fills (timeline blocks, week
 * cells) where the solid hue would overpower text. Text on top of a wash
 * always uses the normal ink tokens, which keeps WCAG contrast intact.
 */
export function swatchWash(id: string): string {
  return swatchColor(id) + '2e'; // ~18% alpha
}

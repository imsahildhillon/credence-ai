/**
 * Resolves an element's computed CSS `color` (which may be an `oklch()`
 * design token, per CLAUDE.md §12) into normalized 0–1 RGB floats suitable
 * for a WebGL uniform. Browsers won't hand back raw RGB for an arbitrary
 * color space on request, so this paints a 1x1 canvas with the computed
 * color string and reads the rasterized pixel back — the same "let the
 * browser resolve it" approach `ReadingTraceCanvas` already uses for
 * Canvas2D, extended to produce numeric floats instead of a CSS string.
 */
export function resolveThemeColorRgb(element: Element): readonly [number, number, number] {
  const cssColor = getComputedStyle(element).color;
  const probe = document.createElement('canvas');
  probe.width = 1;
  probe.height = 1;
  const ctx = probe.getContext('2d');
  if (!ctx) {
    return [0, 0, 0];
  }
  ctx.fillStyle = cssColor;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [(r ?? 0) / 255, (g ?? 0) / 255, (b ?? 0) / 255];
}

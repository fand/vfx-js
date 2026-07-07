/**
 * Return the currently selected image URL for an `<img>`.
 *
 * Prefers `currentSrc` so responsive images (`srcset` / `picture`) use the
 * actual candidate the browser chose, and falls back to `src` when needed.
 */
export function getImageSourceUrl(img: HTMLImageElement): string {
    return img.currentSrc || img.src;
}

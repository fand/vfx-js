/**
 * Return the currently selected image URL for an `<img>`.
 *
 * Prefers `currentSrc` so responsive images (`srcset` / `picture`) use the
 * actual candidate the browser chose, and falls back to `src` when needed.
 */
export function getImageSourceUrl(img: HTMLImageElement): string {
    return img.currentSrc || img.src;
}

/** Load an image from URL with CORS enabled. @internal */
export function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

/**
 * Check whether the user asks for reduced motion.
 * @returns `true` when `prefers-reduced-motion: reduce` matches.
 */
export function prefersReducedMotion(): boolean {
    try {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
        return false;
    }
}

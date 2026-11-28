// Smooth, deterministic brightness noise; independent of frame order/rate.
export function saberFlickerGain(
    time: number,
    intensity: number,
    speed: number,
    seed: number,
): number {
    const amount = Math.min(1, Math.max(0, intensity));
    if (amount === 0) {
        return 1;
    }
    const t = time * Math.max(0, speed);
    const index = Math.floor(t);
    const fraction = t - index;
    const blend = fraction * fraction * (3 - 2 * fraction);
    const random = (key: number) => {
        let x = (key | 0) ^ Math.imul(seed | 0, 0x9e3779b1);
        x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
        x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
        return ((x ^ (x >>> 15)) >>> 0) / 4294967295;
    };
    const a = random(index);
    const b = random(index + 1);
    return 1 - amount * (a + (b - a) * blend);
}

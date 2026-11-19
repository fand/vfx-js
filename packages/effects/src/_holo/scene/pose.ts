// Card pose: rest pose + pointer tilt, driven by holospot's default `motion.spring` (stiffness 190, damping 22, mass 1),
// plus an idle wobble. holospot's site pose controller is not part of its kit, so the wobble is this port's own: a
// slow Lissajous of amplitude `motion.wobbleAmp` that only runs while the pointer is away.

export interface PoseTarget {
    rx: number;
    ry: number;
}

export class PoseSpring {
    rx = 0;
    ry = 0;
    private vx = 0;
    private vy = 0;
    private started = false;

    constructor(
        private readonly stiffness = 190,
        private readonly damping = 22,
        private readonly mass = 1,
    ) {}

    /** Advances toward the target by dt seconds (sub-stepped, semi-implicit Euler). */
    step(target: PoseTarget, dt: number): void {
        if (!this.started) {
            this.rx = target.rx;
            this.ry = target.ry;
            this.started = true;
            return;
        }
        const n = Math.max(1, Math.ceil(dt / (1 / 240)));
        const h = dt / n;
        for (let i = 0; i < n; i++) {
            const ax =
                (-this.stiffness * (this.rx - target.rx) -
                    this.damping * this.vx) /
                this.mass;
            const ay =
                (-this.stiffness * (this.ry - target.ry) -
                    this.damping * this.vy) /
                this.mass;
            this.vx += ax * h;
            this.vy += ay * h;
            this.rx += this.vx * h;
            this.ry += this.vy * h;
        }
    }

    /** Snaps to the target (used when motion is reduced). */
    snap(target: PoseTarget): void {
        this.rx = target.rx;
        this.ry = target.ry;
        this.vx = 0;
        this.vy = 0;
        this.started = true;
    }
}

/**
 * The quaternion (x, y, z, w) of the inverse of the card rotation eulerXYZ(rx, ry, 0) = Rx·Ry: flat mode turns the
 * light rig by it instead of turning the card (holospot's light-rig rotation `Q_L`, scene/lights.ts).
 */
export function inversePoseQuat(
    rxDeg: number,
    ryDeg: number,
): { x: number; y: number; z: number; w: number } {
    const a = (rxDeg * Math.PI) / 360;
    const b = (ryDeg * Math.PI) / 360;
    const sa = Math.sin(a);
    const ca = Math.cos(a);
    const sb = Math.sin(b);
    const cb = Math.cos(b);
    // q = qx(rx)·qy(ry) = (sa·cb, ca·sb, sa·sb, ca·cb); its conjugate is the inverse
    return { x: -sa * cb, y: -ca * sb, z: -sa * sb, w: ca * cb };
}

/** Idle wobble offset [deg] at time t [s]. */
export function wobbleOffset(t: number, ampDeg: number): PoseTarget {
    return {
        rx: 0.45 * ampDeg * Math.sin(0.53 * t),
        ry: ampDeg * Math.sin(0.37 * t + 1.1),
    };
}

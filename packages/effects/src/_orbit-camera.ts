// The orbit camera shared by the 3D shape effects (GlassEffect,
// SwirlParticleEffect): the shape's rotation from the camera params, the
// orbit animation, pointer drags and the hover tilt, and the perspective
// that maps the shape's z = 0 plane onto the element's rect.
//
// Inputs in, camera out: `OrbitCamera.update` takes the params and this
// frame's inputs and returns an `OrbitCameraView`; it keeps only the
// pointer state (drag, tilt, pointer in the page) between frames, and the
// window listeners that feed it.
//
// View space: +x right, +y up, +z towards the viewer, in world units (the
// element's long side is 2 at zoom 1). The shape's centre is the origin;
// `viewRot` turns the shape about it. The eye is at `eye`, looking down
// -z, and the screen is parallel to the z = 0 plane. A point q in view
// space lands on the output at
//
//   principalPx + (q.xy - eye.xy) * focalPx / (eye.z - q.z)
//
// in output px (bottom-left origin), and eye.z - q.z is its depth. With
// principalPx = centerPx + eye.xy * unitPx and focalPx = eye.z * unitPx,
// the z = 0 plane lands on centerPx + q.xy * unitPx wherever the eye is:
// moving the eye sideways only moves the vanishing point.
//
// Hit geometry: the DOM element stays flat where it was, so the browser
// hit tests its untransformed box. With `hitGeometry` on, the effect
// reports the matrix that lays the box over the drawn front face
// (`elementGeometryMatrix`) with `ctx.setElementGeometry`, and VFX-JS
// hands it to the browser for elements added with `addHTML`.

import type { EffectDims } from "@vfx-js/core";

/**
 * The camera params of the 3D shape effects ({@link GlassEffect},
 * {@link SwirlParticleEffect}). Angles are in degrees.
 */
export type OrbitCameraParams = {
    /**
     * Camera yaw in degrees. 0 looks straight at the front cap; positive
     * turns the front cap to the right.
     */
    yaw: number;
    /**
     * Camera pitch in degrees. 0 looks straight at the front cap;
     * positive turns the front cap down, showing the top.
     */
    pitch: number;
    /**
     * Amplitude of the orbit animation, a slow back-and-forth swing of
     * the camera, in degrees of yaw (the pitch swings 0.3 times as far).
     * 0 keeps the camera still (pointer drags still orbit it when
     * {@link drag} is on).
     */
    orbitAnimation: number;
    /**
     * Speed of the {@link orbitAnimation}, as a multiple of the base
     * speed: at 1, a yaw swing takes about 48 seconds. 0 holds the
     * animation where it is. A change while it runs carries on from
     * there.
     */
    orbitSpeed: number;
    /**
     * Field of view in degrees, measured across the element's long side.
     * The camera moves so the z = 0 plane keeps the element's size, so this
     * only changes the strength of the perspective (like a dolly zoom).
     */
    fov: number;
    /** Camera zoom. 1 = the z = 0 plane matches the element size. */
    zoom: number;
    /**
     * Orbit the camera by dragging the pointer. A drag starts on the
     * element's box and can then leave it. While on, it listens for
     * pointer events on `window`, and a drag that orbits keeps the
     * browser from dragging the element (an image, a link) or selecting
     * its text; UI on top of the element that should not orbit can stop
     * `pointerdown` propagation.
     */
    drag: boolean;
    /**
     * Where the camera stands:
     *
     * - `"element"` (default): in front of the element's centre, so the
     *   shape looks the same wherever the element is on the page.
     * - `"viewport"`: in front of the centre of the viewport, at the
     *   same distance. The z = 0 plane still lands on the element's rect,
     *   but the perspective converges on the viewport's centre: an
     *   element away from the centre is seen from the side, shows its
     *   side walls (those facing the centre), and changes as the page
     *   scrolls. Its front draws further out from the centre than the
     *   element, so a small `pad` can clip it.
     *
     * The rotations ({@link yaw}, {@link pitch}, the
     * {@link orbitAnimation}, drags, the hover tilt) turn the shape about
     * its own centre in both cases.
     */
    cameraOrigin: "element" | "viewport";
    /**
     * Strength of the pointer interaction, 0 to 100 (default 1). With
     * the effect's `pointer` at `"tilt"`, the shape turns to face the
     * pointer by up to 20° × `pointerStrength` (capped at 90°), reached
     * when the pointer is half a viewport away from the element's
     * centre, and eases back to the rest pose once the pointer leaves
     * the page; 0 turns it off. The tilt adds to {@link yaw} /
     * {@link pitch}, the {@link orbitAnimation} and drags. Other
     * `pointer` modes say what it does for them.
     */
    pointerStrength: number;
    /**
     * Make the browser's hit testing (clicks, `:hover`, the cursor) and
     * accessibility bounds follow the drawn shape instead of the
     * element's flat box. Default `false`.
     *
     * Each frame the effect reports where the front face of the shape is
     * drawn (the flat cap at `depth / 2` in front of the mid-plane; a
     * `bulge` or `relief` is not followed), and while the face points
     * away from the camera, a box that catches nothing. The element's
     * own `getBoundingClientRect()` follows it too.
     *
     * Works only for an element added with `vfx.addHTML()`, in a browser
     * with `HTMLCanvasElement.updateElementGeometry` (Chrome 157+); a
     * no-op otherwise (see `EffectContext.setElementGeometry`).
     */
    hitGeometry: boolean;
};

type NumKey =
    | "yaw"
    | "pitch"
    | "orbitAnimation"
    | "orbitSpeed"
    | "fov"
    | "zoom"
    | "pointerStrength";

/**
 * [min, max] of each numeric camera param. A finite value is clamped
 * into it; anything else falls back to the effect's default.
 */
export const ORBIT_CAMERA_RANGE: Readonly<
    Record<NumKey, readonly [number, number]>
> = {
    yaw: [-36000, 36000],
    pitch: [-36000, 36000],
    orbitAnimation: [-720, 720],
    orbitSpeed: [0, 100],
    fov: [1, 150],
    zoom: [0.01, 100],
    pointerStrength: [0, 100],
};
const NUM_KEYS = Object.keys(ORBIT_CAMERA_RANGE) as NumKey[];

// The orbit animation at orbitSpeed 1: angular speeds of the yaw and
// pitch swings (rad/s of the sine's argument), and the pitch's phase.
const ORBIT_YAW_SPEED = 0.13;
const ORBIT_PITCH_SPEED = 0.09;
const ORBIT_PITCH_PHASE = 1.3;
// Pitch swing relative to the yaw swing.
const ORBIT_PITCH_RATIO = 0.3;
// Pointer drags: radians per CSS px, and the pitch they can reach.
export const DRAG_RAD_PER_PX = 0.006;
export const DRAG_PITCH_MAX = 1.2;
// Time constant of the hover tilt's easing, seconds.
export const TILT_TAU = 0.25;
// Largest hover tilt at pointerStrength 1, degrees, and the cap.
export const TILT_DEG = 20;
export const TILT_MAX_DEG = 90;
// Degrees to radians: the camera angles in params are degrees.
const DEG = Math.PI / 180;

/** Params checked: finite and in range, or the default. */
export function resolveOrbitCamera(
    p: OrbitCameraParams,
    defaults: OrbitCameraParams,
    out: OrbitCameraParams = { ...defaults },
): OrbitCameraParams {
    for (const k of NUM_KEYS) {
        const v = p[k];
        const [lo, hi] = ORBIT_CAMERA_RANGE[k];
        out[k] =
            typeof v === "number" && Number.isFinite(v)
                ? Math.min(Math.max(v, lo), hi)
                : defaults[k];
    }
    out.drag = !!p.drag;
    out.hitGeometry = !!p.hitGeometry;
    out.cameraOrigin =
        p.cameraOrigin === "viewport" || p.cameraOrigin === "element"
            ? p.cameraOrigin
            : defaults.cameraOrigin;
    return out;
}

/** What the camera needs from a frame. */
export type OrbitCameraInput = {
    /** Clock of the orbit animation, in seconds. */
    time: number;
    /** Seconds since the last update, for easing the tilt. 0 holds it. */
    dt: number;
    /** The effect's layout (`ctx.dims`). */
    dims: Pick<EffectDims, "elementPixel" | "canvasPixel" | "canvasRect">;
    /**
     * The rect the effect draws into, element-local px (its
     * `outputRect`). Positions in the returned view are relative to it.
     */
    outputRect: readonly [number, number, number, number];
    /** `ctx.mouse`: the pointer, element-local px, bottom-left origin. */
    mouse: readonly [number, number];
    /** `ctx.mouseViewport`: the pointer, viewport px, bottom-left origin. */
    mouseViewport: readonly [number, number];
    pixelRatio: number;
    /**
     * Whether the camera may listen for the pointer: false for still
     * frames, which then get no drags and no tilt.
     */
    live: boolean;
    /**
     * Whether the hover tilt is on (the effect's `pointer` is `"tilt"`).
     * Its largest angle is 20° × the params' `pointerStrength`.
     */
    tilt: boolean;
    /**
     * Keep {@link OrbitCamera.pointerIn} up to date even with the tilt
     * off, for an effect's own pointer interaction.
     */
    trackPointer?: boolean;
};

/** The camera of a frame. Positions are output px, bottom-left origin. */
export type OrbitCameraView = {
    /** Rotation from the shape to view space: column-major mat3. */
    viewRot: number[];
    /** Distance from the eye to the z = 0 plane, world units. */
    camDist: number;
    /** Output px per world unit on the z = 0 plane. */
    unitPx: number;
    /** `camDist * unitPx`: the focal length, output px. */
    focalPx: number;
    /** Where the shape's centre (the element's centre) is drawn. */
    centerPx: [number, number];
    /** The eye in view space: x, y (0 with `"element"`) and `camDist`. */
    eye: [number, number, number];
    /** The vanishing point: where the eye's axis meets the output. */
    principalPx: [number, number];
    /** The output rect's origin, element-local px. */
    origin: [number, number];
};

// Column-major rotation: pitch (around X) after yaw (around Y). Radians.
export function viewMatrix(yaw: number, pitch: number): number[] {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    // R = Rx(pitch) * Ry(yaw)
    // Ry = [cy 0 sy; 0 1 0; -sy 0 cy], Rx = [1 0 0; 0 cp -sp; 0 sp cp]
    const r00 = cy;
    const r01 = 0;
    const r02 = sy;
    const r10 = sp * sy;
    const r11 = cp;
    const r12 = -sp * cy;
    const r20 = -cp * sy;
    const r21 = sp;
    const r22 = cp * cy;
    return [r00, r10, r20, r01, r11, r21, r02, r12, r22];
}

/**
 * The centre of the viewport, element-local px. The canvas is the
 * viewport plus the same scroll padding on each side, so the canvas's
 * centre is the viewport's.
 */
function viewportCenter(
    dims: Pick<EffectDims, "canvasRect">,
): [number, number] {
    const [x, y, w, h] = dims.canvasRect;
    return [x + w / 2, y + h / 2];
}

/**
 * The CSS transform that lays an element's box over the shape's plane
 * z = `faceZ` as drawn: 16 numbers (column-major, like `matrix3d()`),
 * with the transform origin at the element's centre.
 *
 * The element's box is the source element's (`elementPx`, physical px):
 * its CSS point (x, y) from the centre, y down, is the shape point
 * ((x, -y) * pixelRatio / (long side / 2), faceZ), which the camera
 * projects as in the header comment. That is a homography in (x, y, 1);
 * the matrix is it in rows x, y and w, with z passed through so it stays
 * invertible, scaled so w = 1 at the centre when the centre is in front
 * of the eye.
 *
 * Null when the plane faces away from the eye or passes through it, or
 * when a number is not finite.
 */
export function hitAreaMatrix(
    view: OrbitCameraView,
    elementPx: readonly [number, number],
    pixelRatio: number,
    faceZ: number,
): number[] | null {
    const half = Math.max(elementPx[0], elementPx[1]) / 2;
    const pr = pixelRatio;
    if (!(half > 0) || !(pr > 0)) {
        return null;
    }
    const R = view.viewRot;
    const [ex, ey, ez] = view.eye;
    // The face's normal in view space is R's third column; its centre is
    // faceZ along it. It faces the eye if the eye is on its front side.
    const facing = ex * R[6] + ey * R[7] + ez * R[8] - faceZ;
    if (!(facing > 1e-6)) {
        return null;
    }
    // Shape units per CSS px, and the face's axes per CSS px (y down).
    const k = pr / half;
    const ax = [k * R[0], k * R[1], k * R[2]];
    const ay = [-k * R[3], -k * R[4], -k * R[5]];
    // The face's centre relative to the eye's xy (z as is).
    const c = [faceZ * R[6] - ex, faceZ * R[7] - ey, faceZ * R[8]];
    // Depth: w = eye.z - q.z, affine in (x, y).
    const w = [-ax[2], -ay[2], ez - c[2]];
    // Output px from the drawn centre, y up, times w:
    //   (principalPx - centerPx) * w + (q.xy - eye.xy) * focalPx
    // then CSS px, y down.
    const f = view.focalPx;
    const dx = view.principalPx[0] - view.centerPx[0];
    const dy = view.principalPx[1] - view.centerPx[1];
    const X = [
        (dx * w[0] + f * ax[0]) / pr,
        (dx * w[1] + f * ay[0]) / pr,
        (dx * w[2] + f * c[0]) / pr,
    ];
    const Y = [
        -(dy * w[0] + f * ax[1]) / pr,
        -(dy * w[1] + f * ay[1]) / pr,
        -(dy * w[2] + f * c[1]) / pr,
    ];
    const s = 1 / (w[2] > 1e-6 ? w[2] : ez);
    // biome-ignore format: a 4 × 4 matrix, one column per row
    const m = [
        X[0] * s, Y[0] * s, 0, w[0] * s,
        X[1] * s, Y[1] * s, 0, w[1] * s,
        0, 0, s, 0,
        X[2] * s, Y[2] * s, 0, w[2] * s,
    ];
    return m.every(Number.isFinite) ? m : null;
}

/**
 * The element geometry for `ctx.setElementGeometry`: the matrix that maps
 * the element's box (CSS px, origin at its top-left, y down) onto the
 * shape's plane z = `faceZ` as drawn. {@link hitAreaMatrix} moved from
 * the box's centre to its top-left.
 *
 * While the plane faces away (or a number is broken), the box squashed
 * to a point at its centre, which the browser hit tests as nothing.
 */
export function elementGeometryMatrix(
    view: OrbitCameraView,
    elementPx: readonly [number, number],
    pixelRatio: number,
    faceZ: number,
): number[] {
    const cx = elementPx[0] / pixelRatio / 2 || 0;
    const cy = elementPx[1] / pixelRatio / 2 || 0;
    const m = hitAreaMatrix(view, elementPx, pixelRatio, faceZ);
    if (!m) {
        // biome-ignore format: a 4 × 4 matrix, one column per row
        return [
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 1, 0,
            cx, cy, 0, 1,
        ];
    }
    // T(c) · m · T(-c): the last column first, then the rows x and y.
    for (let i = 0; i < 4; i++) {
        m[12 + i] -= cx * m[i] + cy * m[4 + i];
    }
    for (let col = 0; col < 4; col++) {
        const w = m[col * 4 + 3];
        m[col * 4] += cx * w;
        m[col * 4 + 1] += cy * w;
    }
    return m;
}

/**
 * The orbit camera: params and a frame's inputs in, the camera out. Owns
 * the pointer drag, the hover tilt and whether the pointer is in the
 * page, and the window listeners for them, which are there only while
 * `drag`, the tilt or `trackPointer` is on and the input is `live`.
 * Call {@link dispose} when the effect is removed.
 */
export class OrbitCamera {
    readonly #defaults: OrbitCameraParams;
    readonly #p: OrbitCameraParams;

    #dragYaw = 0;
    #dragPitch = 0;
    #dragging = false;
    #lastPointer: [number, number] = [0, 0];
    #unlistenDrag: (() => void) | null = null;
    // As of the last update: the map from viewport to element-local px
    // (add to (clientX, innerHeight - clientY) × pr), for where drags
    // start.
    #toElement: [number, number] = [0, 0];
    #pixelRatio = 1;
    #elementPx: [number, number] = [0, 0];

    // The core has no "pointer left" signal: window listeners tell.
    #pointerIn = false;
    #unlistenHover: (() => void) | null = null;
    // Smoothed tilt, radians.
    #tiltYaw = 0;
    #tiltPitch = 0;

    // The orbit animation's phase (seconds at orbitSpeed 1), and the
    // clock it was advanced to; null before the first update.
    #orbitPhase = 0;
    #orbitTime: number | null = null;

    /** `defaults` replace params that are not finite numbers. */
    constructor(defaults: OrbitCameraParams) {
        this.#defaults = { ...defaults };
        this.#p = { ...defaults };
    }

    /** Whether the pointer is over the page (tracked while listening). */
    get pointerIn(): boolean {
        return this.#pointerIn;
    }

    /** Whether a drag is in progress. */
    get dragging(): boolean {
        return this.#dragging;
    }

    /** Drag and tilt offsets so far, radians. */
    get offsets(): {
        dragYaw: number;
        dragPitch: number;
        tiltYaw: number;
        tiltPitch: number;
    } {
        return {
            dragYaw: this.#dragYaw,
            dragPitch: this.#dragPitch,
            tiltYaw: this.#tiltYaw,
            tiltPitch: this.#tiltPitch,
        };
    }

    /**
     * Sync the listeners, ease the tilt over `dt`, and return this
     * frame's camera.
     */
    update(
        params: OrbitCameraParams,
        input: OrbitCameraInput,
    ): OrbitCameraView {
        const p = resolveOrbitCamera(params, this.#defaults, this.#p);
        const { dims } = input;
        const [ew, eh] = dims.elementPixel;
        const pr = input.pixelRatio;
        this.#toElement[0] = input.mouse[0] - input.mouseViewport[0];
        this.#toElement[1] = input.mouse[1] - input.mouseViewport[1];
        this.#pixelRatio = pr;
        this.#elementPx[0] = ew;
        this.#elementPx[1] = eh;

        // Largest tilt, degrees.
        const tilt = input.tilt
            ? Math.min(TILT_DEG * p.pointerStrength, TILT_MAX_DEG)
            : 0;
        const live = input.live && typeof window !== "undefined";
        this.#syncListeners(
            live && p.drag,
            live && (tilt > 0 || !!input.trackPointer),
        );

        // Tilt: the pointer relative to the element's centre, over half
        // the viewport. Positive yaw turns the front cap to the right,
        // positive pitch down, so the shape faces the pointer.
        let yawT = 0;
        let pitchT = 0;
        if (live && tilt > 0 && this.#pointerIn) {
            const [mx, my] = input.mouse;
            const vw = window.innerWidth * pr || dims.canvasPixel[0];
            const vh = window.innerHeight * pr || dims.canvasPixel[1];
            const nx = clamp((mx - ew / 2) / Math.max(vw / 2, 1), -1, 1);
            const ny = clamp((my - eh / 2) / Math.max(vh / 2, 1), -1, 1);
            const max = tilt * DEG;
            yawT = max * nx;
            pitchT = -max * ny;
        }
        const dt = Number.isFinite(input.dt) ? Math.max(input.dt, 0) : 0;
        const k = 1 - Math.exp(-dt / TILT_TAU);
        this.#tiltYaw += (yawT - this.#tiltYaw) * k;
        this.#tiltPitch += (pitchT - this.#tiltPitch) * k;

        // Base angles and the orbit animation (params, degrees), drag and
        // tilt (radians).
        // The animation's phase advances by the clock's step times
        // orbitSpeed, so a change of speed carries on from where it is
        // instead of jumping. It starts at time × orbitSpeed.
        const t = Number.isFinite(input.time) ? input.time : 0;
        this.#orbitPhase =
            this.#orbitTime === null
                ? t * p.orbitSpeed
                : this.#orbitPhase + (t - this.#orbitTime) * p.orbitSpeed;
        this.#orbitTime = t;
        const ph = this.#orbitPhase;
        const amp = p.orbitAnimation;
        const yaw =
            (p.yaw + amp * Math.sin(ph * ORBIT_YAW_SPEED)) * DEG +
            this.#dragYaw +
            this.#tiltYaw;
        const pitch =
            (p.pitch +
                amp *
                    ORBIT_PITCH_RATIO *
                    Math.sin(ph * ORBIT_PITCH_SPEED + ORBIT_PITCH_PHASE)) *
                DEG +
            this.#dragPitch +
            this.#tiltPitch;

        // Distance so that the long side (2 world units) spans `fov`.
        const camDist = 1 / Math.tan((p.fov * Math.PI) / 360);
        const unitPx = (Math.max(ew, eh) / 2) * p.zoom;
        const [ox, oy] = input.outputRect;
        const cx = ew / 2;
        const cy = eh / 2;
        let ex = 0;
        let ey = 0;
        let px = cx;
        let py = cy;
        if (p.cameraOrigin === "viewport" && unitPx > 0) {
            [px, py] = viewportCenter(dims);
            ex = (px - cx) / unitPx;
            ey = (py - cy) / unitPx;
        }
        return {
            viewRot: viewMatrix(yaw, pitch),
            camDist,
            unitPx,
            focalPx: camDist * unitPx,
            centerPx: [cx - ox, cy - oy],
            eye: [ex, ey, camDist],
            principalPx: [px - ox, py - oy],
            origin: [ox, oy],
        };
    }

    /** Remove the listeners and forget the pointer state. */
    dispose(): void {
        this.#syncListeners(false, false);
        this.#dragYaw = 0;
        this.#dragPitch = 0;
        this.#tiltYaw = 0;
        this.#tiltPitch = 0;
        this.#orbitPhase = 0;
        this.#orbitTime = null;
        this.#toElement = [0, 0];
        this.#elementPx = [0, 0];
    }

    #syncListeners(drag: boolean, hover: boolean): void {
        if (drag) {
            this.#listenDrag();
        } else if (this.#unlistenDrag) {
            this.#unlistenDrag();
            this.#unlistenDrag = null;
            this.#dragging = false;
        }
        if (hover) {
            this.#listenHover();
        } else if (this.#unlistenHover) {
            this.#unlistenHover();
            this.#unlistenHover = null;
            this.#pointerIn = false;
        }
    }

    #listenDrag(): void {
        if (this.#unlistenDrag) {
            return;
        }
        const down = (e: PointerEvent) => {
            if (!this.#onElement(e.clientX, e.clientY)) {
                return;
            }
            this.#dragging = true;
            this.#lastPointer = [e.clientX, e.clientY];
        };
        const move = (e: PointerEvent) => {
            if (!this.#dragging) {
                return;
            }
            const dx = e.clientX - this.#lastPointer[0];
            const dy = e.clientY - this.#lastPointer[1];
            this.#lastPointer = [e.clientX, e.clientY];
            this.#dragYaw += dx * DRAG_RAD_PER_PX;
            this.#dragPitch = clamp(
                this.#dragPitch + dy * DRAG_RAD_PER_PX,
                -DRAG_PITCH_MAX,
                DRAG_PITCH_MAX,
            );
        };
        const up = () => {
            this.#dragging = false;
        };
        // The browser's own drag (of an image, a link, selected text) and
        // text selection would take the pointer over and cancel ours.
        const prevent = (e: Event) => {
            if (this.#dragging) {
                e.preventDefault();
            }
        };
        window.addEventListener("dragstart", prevent);
        window.addEventListener("selectstart", prevent);
        window.addEventListener("pointerdown", down);
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
        this.#unlistenDrag = () => {
            window.removeEventListener("dragstart", prevent);
            window.removeEventListener("selectstart", prevent);
            window.removeEventListener("pointerdown", down);
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            window.removeEventListener("pointercancel", up);
        };
    }

    // Whether a client point is on the element's box, as of the last
    // update. Same mapping as `ctx.mouse`.
    #onElement(clientX: number, clientY: number): boolean {
        const pr = this.#pixelRatio;
        const x = clientX * pr + this.#toElement[0];
        const y = (window.innerHeight - clientY) * pr + this.#toElement[1];
        const [ew, eh] = this.#elementPx;
        return x >= 0 && y >= 0 && x <= ew && y <= eh;
    }

    #listenHover(): void {
        if (this.#unlistenHover) {
            return;
        }
        // A move inside the viewport means the pointer is over the page;
        // leaving the document (relatedTarget null: out of the window,
        // or a touch that ended) or losing focus means it is gone.
        const move = (e: PointerEvent) => {
            this.#pointerIn =
                e.clientX >= 0 &&
                e.clientY >= 0 &&
                e.clientX < window.innerWidth &&
                e.clientY < window.innerHeight;
        };
        const out = (e: PointerEvent) => {
            if (!e.relatedTarget) {
                this.#pointerIn = false;
            }
        };
        const blur = () => {
            this.#pointerIn = false;
        };
        window.addEventListener("pointermove", move, { passive: true });
        window.addEventListener("pointerout", out, { passive: true });
        window.addEventListener("blur", blur);
        this.#unlistenHover = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerout", out);
            window.removeEventListener("blur", blur);
        };
    }
}

function clamp(x: number, lo: number, hi: number): number {
    return Math.min(Math.max(x, lo), hi);
}

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
    DRAG_PITCH_MAX,
    DRAG_RAD_PER_PX,
    elementGeometryMatrix,
    hitAreaMatrix,
    OrbitCamera,
    type OrbitCameraInput,
    type OrbitCameraParams,
    type OrbitCameraView,
    resolveOrbitCamera,
    TILT_DEG,
    TILT_MAX_DEG,
    TILT_TAU,
    viewMatrix,
} from "./_orbit-camera.js";

const DEG = Math.PI / 180;

const PARAMS: OrbitCameraParams = {
    yaw: 0,
    pitch: 0,
    orbitAnimation: 0,
    orbitSpeed: 1,
    fov: 35,
    zoom: 1,
    drag: false,
    cameraOrigin: "element",
    pointerStrength: 1,
    hitGeometry: false,
};

// The matrix as it was built before the camera moved here, radians.
function oldViewMatrix(yaw: number, pitch: number): number[] {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    return [cy, sp * sy, -cp * sy, 0, cp, sp, sy, -sp * cy, cp * cy];
}

/**
 * A 400 × 200 element whose bottom-left corner is at (x, y) on a canvas
 * of 1000 × 800 (no scroll padding), drawn into `pad` px around it.
 */
function input(
    over: Partial<OrbitCameraInput> = {},
    x = 300,
    y = 300,
    pad = 50,
): OrbitCameraInput {
    return {
        time: 0,
        dt: 0,
        dims: {
            elementPixel: [400, 200],
            canvasPixel: [1000, 800],
            canvasRect: [-x, -y, 1000, 800],
        },
        outputRect: [-pad, -pad, 400 + 2 * pad, 200 + 2 * pad],
        mouse: [0, 0],
        mouseViewport: [x, y],
        pixelRatio: 1,
        live: false,
        tilt: false,
        ...over,
    };
}

// Column-major mat3 × vector.
function mul(m: number[], v: readonly number[]): [number, number, number] {
    return [
        m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
        m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
        m[2] * v[0] + m[5] * v[1] + m[8] * v[2],
    ];
}

/** Where a point of the shape lands on the output, as the shaders do it. */
function project(cam: OrbitCameraView, p: readonly number[]): [number, number] {
    const q = mul(cam.viewRot, p);
    const depth = cam.eye[2] - q[2];
    return [
        cam.principalPx[0] + ((q[0] - cam.eye[0]) * cam.focalPx) / depth,
        cam.principalPx[1] + ((q[1] - cam.eye[1]) * cam.focalPx) / depth,
    ];
}

/** Where the glass ray through output px `px` meets the plane z = 0. */
function unproject(cam: OrbitCameraView, px: readonly number[]): number[] {
    const d = [
        (px[0] - cam.principalPx[0]) / cam.focalPx,
        (px[1] - cam.principalPx[1]) / cam.focalPx,
        -1,
    ];
    const t = cam.eye[2];
    return [cam.eye[0] + d[0] * t, cam.eye[1] + d[1] * t];
}

function expectClose(a: readonly number[], b: readonly number[], digits = 9) {
    expect(a.length).toBe(b.length);
    a.forEach((v, i) => {
        expect(v).toBeCloseTo(b[i], digits);
    });
}

describe("viewMatrix", () => {
    test("matches the old matrix, which took radians", () => {
        for (const [y, p] of [
            [0, 0],
            [0.5, 0.25],
            [-2, 1.1],
        ]) {
            expect(viewMatrix(y, p)).toEqual(oldViewMatrix(y, p));
        }
    });

    test("the camera takes degrees", () => {
        const cam = new OrbitCamera(PARAMS).update(
            { ...PARAMS, yaw: 29, pitch: 14 },
            input(),
        );
        expectClose(cam.viewRot, oldViewMatrix(29 * DEG, 14 * DEG), 12);
    });
});

describe("OrbitCamera, element origin", () => {
    test("reproduces the old camera", () => {
        const p = {
            ...PARAMS,
            yaw: 10,
            pitch: -5,
            orbitAnimation: 23,
            fov: 35,
        };
        const t = 3.7;
        const cam = new OrbitCamera(PARAMS).update(p, input({ time: t }));
        // As SwirlParticleEffect computed it.
        const yaw = (10 + 23 * Math.sin(t * 0.13)) * DEG;
        const pitch = (-5 + 23 * 0.3 * Math.sin(t * 0.09 + 1.3)) * DEG;
        const camDist = 1 / Math.tan((35 * Math.PI) / 360);
        expect(cam.viewRot).toEqual(viewMatrix(yaw, pitch));
        expect(cam.camDist).toBe(camDist);
        expect(cam.unitPx).toBe(200);
        expect(cam.focalPx).toBe(camDist * 200);
        expect(cam.centerPx).toEqual([250, 150]);
        expect(cam.principalPx).toEqual([250, 150]);
        expect(cam.eye).toEqual([0, 0, camDist]);
        expect(cam.origin).toEqual([-50, -50]);
    });

    test("orbitSpeed scales the orbit animation's clock; 0 stops it", () => {
        // Each camera runs at one speed from the start.
        const at = (orbitSpeed: number, time: number) =>
            new OrbitCamera(PARAMS).update(
                { ...PARAMS, orbitAnimation: 20, orbitSpeed },
                input({ time }),
            );
        expectClose(at(2, 1.5).viewRot, at(1, 3).viewRot, 12);
        expect(at(0, 9).viewRot).toEqual(at(1, 0).viewRot);
        // 0 holds a running animation where it is.
        const c = new OrbitCamera(PARAMS);
        const p = { ...PARAMS, orbitAnimation: 20, orbitSpeed: 1 };
        const running = c.update(p, input({ time: 4 }));
        const held = c.update({ ...p, orbitSpeed: 0 }, input({ time: 9 }));
        expectClose(held.viewRot, running.viewRot, 12);
    });

    test("orbitAnimation 0 holds the camera still", () => {
        const c = new OrbitCamera(PARAMS);
        const p = { ...PARAMS, yaw: 12, pitch: 5, orbitAnimation: 0 };
        const a = c.update(p, input({ time: 0 }));
        const b = c.update(p, input({ time: 17.3 }));
        expect(b.viewRot).toEqual(a.viewRot);
        expect(a.viewRot).toEqual(viewMatrix(12 * DEG, 5 * DEG));
    });

    test("a live change of orbitSpeed carries on from where it is", () => {
        const c = new OrbitCamera(PARAMS);
        const p = { ...PARAMS, orbitAnimation: 20, orbitSpeed: 1 };
        c.update(p, input({ time: 0 }));
        const at600 = c.update(p, input({ time: 600 }));
        // Same instant, new speed: no jump.
        const fast = { ...p, orbitSpeed: 3 };
        expectClose(
            c.update(fast, input({ time: 600 })).viewRot,
            at600.viewRot,
        );
        // One second later the phase is 600 + 3 s, not 601 × 3.
        const ph = 603;
        expectClose(
            c.update(fast, input({ time: 601 })).viewRot,
            viewMatrix(
                20 * Math.sin(ph * 0.13) * DEG,
                20 * 0.3 * Math.sin(ph * 0.09 + 1.3) * DEG,
            ),
        );
        // A new instance (or one disposed) starts at time × orbitSpeed.
        c.dispose();
        expectClose(
            c.update(fast, input({ time: 10 })).viewRot,
            new OrbitCamera(PARAMS).update(fast, input({ time: 10 })).viewRot,
        );
    });

    test("zoom scales the px per unit; fov sets the distance", () => {
        const cam = new OrbitCamera(PARAMS).update(
            { ...PARAMS, zoom: 0.7, fov: 30 },
            input(),
        );
        expect(cam.unitPx).toBeCloseTo(140, 12);
        expect(cam.camDist).toBeCloseTo(1 / Math.tan(15 * DEG), 12);
    });

    test("bad numbers fall back to the defaults, and are clamped", () => {
        const defaults = { ...PARAMS, fov: 40, yaw: 7 };
        const r = resolveOrbitCamera(
            {
                ...PARAMS,
                fov: 1000,
                yaw: Number.NaN,
                zoom: -1,
                cameraOrigin: "nope" as "element",
                pointerStrength: 400,
            },
            defaults,
        );
        expect(r.fov).toBe(150);
        expect(r.pointerStrength).toBe(100);
        expect(r.yaw).toBe(7);
        expect(r.zoom).toBe(0.01);
        expect(r.cameraOrigin).toBe("element");
    });
});

describe("OrbitCamera, viewport origin", () => {
    const p = { ...PARAMS, yaw: 17, pitch: -9, fov: 75 };

    test("with the element at the viewport's centre, the same as element", () => {
        // 1000 × 800 canvas, 400 × 200 element centred: corner at (300, 300).
        const c = new OrbitCamera(PARAMS);
        const a = c.update(p, input());
        const b = c.update({ ...p, cameraOrigin: "viewport" }, input());
        expect(b).toEqual(a);
    });

    test("the z = 0 plane lands on the element's rect in both modes", () => {
        // Near the bottom-left corner of the viewport.
        const at = input({}, 20, 30);
        const corners = [
            [-1, -0.5, 0],
            [1, -0.5, 0],
            [1, 0.5, 0],
            [-1, 0.5, 0],
        ];
        // The element's corners in output px (origin at -50, -50).
        const rect = [
            [50, 50],
            [450, 50],
            [450, 250],
            [50, 250],
        ];
        for (const origin of ["element", "viewport"] as const) {
            // No rotation: the shape's z = 0 plane is the view's.
            const cam = new OrbitCamera(PARAMS).update(
                { ...p, yaw: 0, pitch: 0, cameraOrigin: origin },
                at,
            );
            corners.forEach((c, i) => {
                expectClose(project(cam, c), rect[i]);
                expectClose(unproject(cam, rect[i]), c.slice(0, 2));
            });
        }
    });

    test("the eye stands in front of the viewport's centre", () => {
        const cam = new OrbitCamera(PARAMS).update(
            { ...p, cameraOrigin: "viewport" },
            input({}, 20, 30),
        );
        // Viewport centre (500, 400) is (500 - 20 - 200, 400 - 30 - 100)
        // px from the element's centre: (280, 270), in units of 200 px.
        expectClose(cam.eye.slice(0, 2), [1.4, 1.35]);
        expect(cam.eye[2]).toBe(cam.camDist);
        expectClose(cam.principalPx, [530, 420]);
        expectClose(cam.centerPx, [250, 150]);
        // Rotations turn the shape, not the camera.
        expectClose(
            cam.viewRot,
            new OrbitCamera(PARAMS).update(p, input()).viewRot,
            12,
        );
    });

    test("off the plane, points move away from the vanishing point in front of it and towards it behind", () => {
        const at = input({}, 20, 30);
        const q = { ...p, yaw: 0, pitch: 0 };
        const el = new OrbitCamera(PARAMS).update(q, at);
        const vp = new OrbitCamera(PARAMS).update(
            { ...q, cameraOrigin: "viewport" },
            at,
        );
        // The element's centre, in front of and behind the plane.
        const front = [0, 0, 0.2];
        const back = [0, 0, -0.2];
        // Element origin: on the axis, it stays put.
        expectClose(project(el, front), el.centerPx);
        expectClose(project(el, back), el.centerPx);
        // Viewport origin: the vanishing point is up and to the right
        // (towards the viewport's centre). The front moves away from it
        // (down-left), the back towards it, so the walls facing the
        // viewport's centre show.
        const f = project(vp, front);
        const b = project(vp, back);
        expect(f[0]).toBeLessThan(vp.centerPx[0]);
        expect(f[1]).toBeLessThan(vp.centerPx[1]);
        expect(b[0]).toBeGreaterThan(vp.centerPx[0]);
        expect(b[1]).toBeGreaterThan(vp.centerPx[1]);
        // Along the line through the vanishing point.
        const dir = [
            vp.principalPx[0] - vp.centerPx[0],
            vp.principalPx[1] - vp.centerPx[1],
        ];
        const cross = (v: number[]) =>
            (v[0] - vp.centerPx[0]) * dir[1] - (v[1] - vp.centerPx[1]) * dir[0];
        expect(cross(f)).toBeCloseTo(0, 6);
        expect(cross(b)).toBeCloseTo(0, 6);
    });

    test("follows the canvas's scroll padding: its centre is the viewport's", () => {
        // 100 px of scroll padding on each side of an 800 × 600 viewport.
        const at = input({
            dims: {
                elementPixel: [400, 200],
                canvasPixel: [1000, 800],
                canvasRect: [-120, -130, 1000, 800],
            },
        });
        const cam = new OrbitCamera(PARAMS).update(
            { ...p, cameraOrigin: "viewport" },
            at,
        );
        // Viewport centre: canvas origin + 500, 400 = (380, 270).
        expectClose(cam.principalPx, [380 + 50, 270 + 50]);
    });
});

type Listener = (e: Event) => void;

// A window with the listeners and size the camera uses.
function fakeWindow(width = 1000, height = 800) {
    const target = new EventTarget();
    const added: string[] = [];
    const win = {
        innerWidth: width,
        innerHeight: height,
        addEventListener(type: string, fn: Listener, opts?: unknown) {
            added.push(type);
            target.addEventListener(type, fn, opts as AddEventListenerOptions);
        },
        removeEventListener(type: string, fn: Listener) {
            added.splice(added.indexOf(type), 1);
            target.removeEventListener(type, fn);
        },
    };
    const fire = (type: string, props: Record<string, unknown> = {}) => {
        const e = Object.assign(new Event(type, { cancelable: true }), props);
        target.dispatchEvent(e);
        return e;
    };
    return { win, added, fire };
}

describe("OrbitCamera, pointer", () => {
    let w: ReturnType<typeof fakeWindow>;
    beforeEach(() => {
        w = fakeWindow();
        vi.stubGlobal("window", w.win);
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test("listens only while live and drag or tilt is on", () => {
        const c = new OrbitCamera(PARAMS);
        c.update(PARAMS, input({ live: true }));
        expect(w.added).toEqual([]);
        c.update({ ...PARAMS, drag: true }, input({ live: false }));
        expect(w.added).toEqual([]);
        c.update({ ...PARAMS, drag: true }, input({ live: true }));
        expect(w.added.sort()).toEqual(
            [
                "dragstart",
                "pointercancel",
                "pointerdown",
                "pointermove",
                "pointerup",
                "selectstart",
            ].sort(),
        );
        c.update({ ...PARAMS, drag: true }, input({ live: true, tilt: true }));
        expect(w.added).toHaveLength(9);
        c.update(PARAMS, input({ live: true, tilt: true }));
        expect(w.added.sort()).toEqual(
            ["blur", "pointermove", "pointerout"].sort(),
        );
        c.update(PARAMS, input({ live: true, trackPointer: true }));
        expect(w.added).toHaveLength(3);
        // pointerStrength 0 turns the tilt off.
        c.update(
            { ...PARAMS, pointerStrength: 0 },
            input({ live: true, tilt: true }),
        );
        expect(w.added).toEqual([]);
        c.update({ ...PARAMS, drag: true }, input({ live: true, tilt: true }));
        c.dispose();
        expect(w.added).toEqual([]);
    });

    test("a drag that starts on the element orbits; one that starts off it does not", () => {
        const c = new OrbitCamera(PARAMS);
        const p = { ...PARAMS, drag: true };
        // Element 400 × 200, bottom-left at (300, 300) of an 800 px high
        // viewport: client x 300..700, y 300..500.
        c.update(p, input({ live: true }));
        w.fire("pointerdown", { clientX: 100, clientY: 100 });
        w.fire("pointermove", { clientX: 150, clientY: 100 });
        expect(c.dragging).toBe(false);
        expect(c.offsets.dragYaw).toBe(0);

        w.fire("pointerdown", { clientX: 400, clientY: 400 });
        expect(c.dragging).toBe(true);
        w.fire("pointermove", { clientX: 450, clientY: 420 });
        expect(c.offsets.dragYaw).toBeCloseTo(50 * DRAG_RAD_PER_PX, 12);
        expect(c.offsets.dragPitch).toBeCloseTo(20 * DRAG_RAD_PER_PX, 12);
        w.fire("pointermove", { clientX: 450, clientY: 5000 });
        expect(c.offsets.dragPitch).toBe(DRAG_PITCH_MAX);
        w.fire("pointerup");
        expect(c.dragging).toBe(false);

        const cam = c.update(p, input({ live: true }));
        expectClose(
            cam.viewRot,
            viewMatrix(50 * DRAG_RAD_PER_PX, DRAG_PITCH_MAX),
            12,
        );
        // Turning drag off stops a drag and keeps the offsets.
        w.fire("pointerdown", { clientX: 400, clientY: 400 });
        c.update(PARAMS, input({ live: true }));
        expect(c.dragging).toBe(false);
        expect(c.offsets.dragYaw).toBeCloseTo(50 * DRAG_RAD_PER_PX, 12);
        c.dispose();
        expect(c.offsets.dragYaw).toBe(0);
    });

    test("a drag that orbits prevents the browser's drag and text selection", () => {
        const c = new OrbitCamera(PARAMS);
        c.update({ ...PARAMS, drag: true }, input({ live: true }));
        // Not ours: a drag elsewhere on the page is left alone.
        w.fire("pointerdown", { clientX: 100, clientY: 100 });
        expect(w.fire("dragstart").defaultPrevented).toBe(false);
        expect(w.fire("selectstart").defaultPrevented).toBe(false);
        w.fire("pointerup");

        w.fire("pointerdown", { clientX: 400, clientY: 400 });
        expect(w.fire("dragstart").defaultPrevented).toBe(true);
        expect(w.fire("selectstart").defaultPrevented).toBe(true);
        w.fire("pointerup");
        expect(w.fire("dragstart").defaultPrevented).toBe(false);
        c.dispose();
    });

    test("the tilt eases towards the pointer while it is in the page, and back when it leaves", () => {
        const c = new OrbitCamera(PARAMS);
        // Pointer at the right edge of the element's row, half a viewport
        // (500 px) right of its centre: the full tilt in yaw.
        const at = (dt: number, over: Partial<OrbitCameraInput> = {}) =>
            input({
                live: true,
                tilt: true,
                dt,
                mouse: [200 + 500, 100],
                ...over,
            });
        c.update(PARAMS, at(0));
        // Not in the page yet: no tilt.
        c.update(PARAMS, at(0.1));
        expect(c.offsets.tiltYaw).toBe(0);
        w.fire("pointermove", { clientX: 10, clientY: 10 });
        expect(c.pointerIn).toBe(true);
        c.update(PARAMS, at(TILT_TAU));
        const k = 1 - Math.exp(-1);
        expect(c.offsets.tiltYaw).toBeCloseTo(20 * DEG * k, 12);
        expect(c.offsets.tiltPitch).toBeCloseTo(0, 12);
        // dt 0 holds it.
        c.update(PARAMS, at(0));
        expect(c.offsets.tiltYaw).toBeCloseTo(20 * DEG * k, 12);
        // Out of the window: eases back.
        w.fire("pointerout", { relatedTarget: null });
        expect(c.pointerIn).toBe(false);
        c.update(PARAMS, at(TILT_TAU));
        expect(c.offsets.tiltYaw).toBeCloseTo(20 * DEG * k * (1 - k), 12);
        // Above the element's centre (y is up): pitch goes negative, which
        // turns the front cap up, towards the pointer.
        w.fire("pointermove", { clientX: 10, clientY: 10 });
        c.update(PARAMS, at(100, { mouse: [200, 100 + 400] }));
        expect(c.offsets.tiltPitch).toBeCloseTo(-20 * DEG, 12);
        expect(c.offsets.tiltYaw).toBeCloseTo(0, 12);
        // 20° × pointerStrength is the largest angle, capped at 90°.
        expect(TILT_DEG).toBe(20);
        c.update(
            { ...PARAMS, pointerStrength: 0.4 },
            at(100, { mouse: [200, 100 + 400] }),
        );
        expect(c.offsets.tiltPitch).toBeCloseTo(-8 * DEG, 12);
        c.update(
            { ...PARAMS, pointerStrength: 2 },
            at(100, { mouse: [200, 100 + 400] }),
        );
        expect(c.offsets.tiltPitch).toBeCloseTo(-40 * DEG, 12);
        c.update(
            { ...PARAMS, pointerStrength: 10 },
            at(100, { mouse: [200, 100 + 400] }),
        );
        expect(c.offsets.tiltPitch).toBeCloseTo(-TILT_MAX_DEG * DEG, 12);
        // Not live (a still frame): eases to 0.
        c.update(PARAMS, at(100, { live: false }));
        expect(c.offsets.tiltPitch).toBeCloseTo(0, 12);
        expect(w.added).toEqual([]);
    });
});

/**
 * Where CSS point (x, y) of a box of w × h CSS px lands under a
 * `matrix3d` with `transform-origin` at its centre, as the browser does
 * it: from the centre, through the matrix, divided by w.
 */
function applyCss(
    m: readonly number[],
    size: readonly [number, number],
    p: readonly [number, number],
): [number, number] {
    const x = p[0] - size[0] / 2;
    const y = p[1] - size[1] / 2;
    const X = m[0] * x + m[4] * y + m[12];
    const Y = m[1] * x + m[5] * y + m[13];
    const W = m[3] * x + m[7] * y + m[15];
    return [X / W + size[0] / 2, Y / W + size[1] / 2];
}

/** A point through a 4 × 4 matrix (column-major), z = 0, divided by w. */
function applyMatrix(
    m: readonly number[],
    p: readonly [number, number],
): [number, number] {
    const W = m[3] * p[0] + m[7] * p[1] + m[15];
    return [
        (m[0] * p[0] + m[4] * p[1] + m[12]) / W,
        (m[1] * p[0] + m[5] * p[1] + m[13]) / W,
    ];
}

/**
 * Where the shape point under CSS point (x, y) of the element (CSS px,
 * top-left origin) is drawn on its plane z = faceZ, in CSS px of the
 * element's box (top-left origin): the projection of the header comment,
 * then output px (bottom-left, physical) to CSS.
 */
function drawnCss(
    cam: OrbitCameraView,
    at: OrbitCameraInput,
    faceZ: number,
    p: readonly [number, number],
): [number, number] {
    const pr = at.pixelRatio;
    const [ew, eh] = at.dims.elementPixel;
    const half = Math.max(ew, eh) / 2;
    const shape = [
        (p[0] * pr - ew / 2) / half,
        (eh / 2 - p[1] * pr) / half,
        faceZ,
    ];
    const out = project(cam, shape);
    const lx = out[0] + cam.origin[0];
    const ly = out[1] + cam.origin[1];
    return [lx / pr, eh / pr - ly / pr];
}

// 400 × 200 physical px at pixel ratio 2: a 200 × 100 CSS box.
const BOX: [number, number] = [200, 100];
const BOX_POINTS: [number, number][] = [
    [0, 0],
    [200, 0],
    [200, 100],
    [0, 100],
    [100, 50],
    [30, 80],
];
const CAMERAS: [string, Partial<OrbitCameraParams>, number, number][] = [
    ["element", { yaw: 33, pitch: -12, zoom: 0.7, fov: 60 }, 300, 300],
    ["element, front cap far", { yaw: -50, pitch: 25, fov: 90 }, 300, 300],
    [
        "viewport, off-centre",
        { yaw: 25, pitch: 18, zoom: 1.3, fov: 75, cameraOrigin: "viewport" },
        20,
        30,
    ],
    [
        "viewport, other corner",
        { yaw: -40, pitch: -8, zoom: 0.8, fov: 50, cameraOrigin: "viewport" },
        580,
        560,
    ],
];

describe("hitAreaMatrix", () => {
    for (const [name, over, x, y] of CAMERAS) {
        test(`maps the box onto the drawn face: ${name}`, () => {
            const at = input({ pixelRatio: 2 }, x, y, 50);
            const cam = new OrbitCamera(PARAMS).update(
                { ...PARAMS, ...over },
                at,
            );
            for (const faceZ of [0, 0.1, 0.35]) {
                const m = hitAreaMatrix(
                    cam,
                    at.dims.elementPixel,
                    at.pixelRatio,
                    faceZ,
                );
                expect(m).not.toBeNull();
                for (const p of BOX_POINTS) {
                    expectClose(
                        applyCss(m as number[], BOX, p),
                        drawnCss(cam, at, faceZ, p),
                        6,
                    );
                }
            }
        });
    }

    test("front-on, the z = 0 plane is the identity in both modes", () => {
        for (const cameraOrigin of ["element", "viewport"] as const) {
            const at = input({ pixelRatio: 2 }, 20, 30);
            const cam = new OrbitCamera(PARAMS).update(
                { ...PARAMS, cameraOrigin, fov: 70 },
                at,
            );
            const m = hitAreaMatrix(cam, at.dims.elementPixel, 2, 0);
            // biome-ignore format: a 4 × 4 matrix
            expectClose(m as number[], [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1 / cam.camDist, 0,
                0, 0, 0, 1,
            ]);
        }
    });

    test("none while the face points away from the eye or is edge-on", () => {
        const at = input();
        const el = new OrbitCamera(PARAMS);
        const get = (over: Partial<OrbitCameraParams>, faceZ = 0.1) =>
            hitAreaMatrix(
                el.update({ ...PARAMS, ...over }, at),
                at.dims.elementPixel,
                1,
                faceZ,
            );
        expect(get({ yaw: 120 })).toBeNull();
        expect(get({ yaw: 180 })).toBeNull();
        expect(get({ pitch: -100 })).toBeNull();
        expect(get({ yaw: 90 }, 0)).toBeNull();
        expect(get({ yaw: 85 })).not.toBeNull();
        const cam = el.update(PARAMS, at);
        expect(hitAreaMatrix(cam, [0, 0], 1, 0)).toBeNull();
        expect(hitAreaMatrix(cam, [400, 200], 0, 0)).toBeNull();
        expect(hitAreaMatrix(cam, [400, 200], 1, Number.NaN)).toBeNull();
    });
});

describe("elementGeometryMatrix", () => {
    for (const [name, over, x, y] of CAMERAS) {
        test(`maps the box from its top-left onto the drawn face: ${name}`, () => {
            const at = input({ pixelRatio: 2 }, x, y, 50);
            const cam = new OrbitCamera(PARAMS).update(
                { ...PARAMS, ...over },
                at,
            );
            for (const faceZ of [0, 0.11]) {
                const m = elementGeometryMatrix(
                    cam,
                    at.dims.elementPixel,
                    at.pixelRatio,
                    faceZ,
                );
                for (const p of BOX_POINTS) {
                    expectClose(
                        applyMatrix(m, p),
                        drawnCss(cam, at, faceZ, p),
                        6,
                    );
                }
            }
        });
    }

    test("front-on at z = 0, the box stays where it is", () => {
        const at = input({ pixelRatio: 2 });
        const cam = new OrbitCamera(PARAMS).update(PARAMS, at);
        const m = elementGeometryMatrix(cam, at.dims.elementPixel, 2, 0);
        for (const p of BOX_POINTS) {
            expectClose(applyMatrix(m, p), p);
        }
    });

    test("facing away, the box is squashed to its centre", () => {
        const at = input({ pixelRatio: 2 });
        const cam = new OrbitCamera(PARAMS).update({ ...PARAMS, yaw: 180 }, at);
        const m = elementGeometryMatrix(cam, at.dims.elementPixel, 2, 0.1);
        for (const p of BOX_POINTS) {
            expectClose(applyMatrix(m, p), [100, 50]);
        }
    });

    test("hitGeometry resolves to a boolean", () => {
        const r = (v: unknown) =>
            resolveOrbitCamera({ ...PARAMS, hitGeometry: v as boolean }, PARAMS)
                .hitGeometry;
        expect(r(true)).toBe(true);
        expect(r(undefined)).toBe(false);
        expect(r(1)).toBe(true);
    });
});

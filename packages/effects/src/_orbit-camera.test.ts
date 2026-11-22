import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
    DRAG_PITCH_MAX,
    DRAG_RAD_PER_PX,
    OrbitCamera,
    type OrbitCameraInput,
    type OrbitCameraParams,
    type OrbitCameraView,
    resolveOrbitCamera,
    TILT_TAU,
    viewMatrix,
} from "./_orbit-camera.js";

const DEG = Math.PI / 180;

const PARAMS: OrbitCameraParams = {
    yaw: 0,
    pitch: 0,
    orbit: 0,
    orbitSpeed: 1,
    fov: 35,
    zoom: 1,
    drag: false,
    cameraOrigin: "element",
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
        tilt: 0,
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
        const p = { ...PARAMS, yaw: 10, pitch: -5, orbit: 23, fov: 35 };
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

    test("orbitSpeed scales the wobble's clock; 0 stops it", () => {
        const c = new OrbitCamera(PARAMS);
        const p = { ...PARAMS, orbit: 20 };
        const a = c.update({ ...p, orbitSpeed: 2 }, input({ time: 1.5 }));
        const b = c.update({ ...p, orbitSpeed: 1 }, input({ time: 3 }));
        expectClose(a.viewRot, b.viewRot, 12);
        const still = c.update({ ...p, orbitSpeed: 0 }, input({ time: 9 }));
        const start = c.update(p, input({ time: 0 }));
        expect(still.viewRot).toEqual(start.viewRot);
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
            },
            defaults,
        );
        expect(r.fov).toBe(150);
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
        target.dispatchEvent(Object.assign(new Event(type), props));
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
            ["pointercancel", "pointerdown", "pointermove", "pointerup"].sort(),
        );
        c.update({ ...PARAMS, drag: true }, input({ live: true, tilt: 20 }));
        expect(w.added).toHaveLength(7);
        c.update(PARAMS, input({ live: true, tilt: 20 }));
        expect(w.added.sort()).toEqual(
            ["blur", "pointermove", "pointerout"].sort(),
        );
        c.update(PARAMS, input({ live: true, trackPointer: true }));
        expect(w.added).toHaveLength(3);
        c.update({ ...PARAMS, drag: true }, input({ live: true, tilt: 20 }));
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

    test("the tilt eases towards the pointer while it is in the page, and back when it leaves", () => {
        const c = new OrbitCamera(PARAMS);
        // Pointer at the right edge of the element's row, half a viewport
        // (500 px) right of its centre: the full tilt in yaw.
        const at = (dt: number, over: Partial<OrbitCameraInput> = {}) =>
            input({
                live: true,
                tilt: 20,
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
        // Not live (a still frame): eases to 0.
        c.update(PARAMS, at(100, { live: false }));
        expect(c.offsets.tiltPitch).toBeCloseTo(0, 12);
        expect(w.added).toEqual([]);
    });
});

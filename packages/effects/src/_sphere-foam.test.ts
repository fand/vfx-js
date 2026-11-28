import { describe, expect, test } from "vitest";
import {
    borderDist,
    type FoamSphere,
    type SphereFilm,
    sphereFilms,
} from "./_sphere-foam.js";

// A ray along +x from x = -10.
const O = [-10, 0, 0] as const;
const D = [1, 0, 0] as const;

function kinds(films: SphereFilm[]): string[] {
    return films.map((f) =>
        f.kind === "wall" ? `wall ${f.from}>${f.to}` : `${f.kind} ${f.sphere}`,
    );
}

describe("sphereFilms", () => {
    test("one sphere: in and out at its surface", () => {
        const { films, inside } = sphereFilms(O, D, [[0, 0, 0, 1]], 0, 20);
        expect(kinds(films)).toEqual(["in 0", "out 0"]);
        expect(films[0].t).toBeCloseTo(9);
        expect(films[1].t).toBeCloseTo(11);
        expect(inside).toBe(false);
    });

    test("two overlapping spheres: in, one wall on the radical plane, out", () => {
        const s: FoamSphere[] = [
            [0, 0, 0, 1],
            [1.5, 0, 0, 1],
        ];
        const { films } = sphereFilms(O, D, s, 0, 20);
        expect(kinds(films)).toEqual(["in 0", "wall 0>1", "out 1"]);
        // Equal radii: the wall is half way between the centres.
        expect(films[1].t).toBeCloseTo(10.75);
        expect(films[2].t).toBeCloseTo(12.5);
    });

    test("unequal radii move the wall to the radical plane", () => {
        const s: FoamSphere[] = [
            [0, 0, 0, 1.2],
            [1.5, 0, 0, 0.8],
        ];
        const { films } = sphereFilms(O, D, s, 0, 20);
        // |x|^2 - 1.44 = (x - 1.5)^2 - 0.64 -> x = (2.25 + 0.8) / 3.
        expect(kinds(films)).toEqual(["in 0", "wall 0>1", "out 1"]);
        expect(films[1].t - 10).toBeCloseTo((2.25 + 0.8) / 3);
    });

    test("separate spheres: two in / out pairs, no wall", () => {
        const s: FoamSphere[] = [
            [0, 0, 0, 1],
            [3, 0, 0, 1],
        ];
        const { films } = sphereFilms(O, D, s, 0, 20);
        expect(kinds(films)).toEqual(["in 0", "out 0", "in 1", "out 1"]);
    });

    test("a sphere inside another owns nothing past it: no films of its own", () => {
        const s: FoamSphere[] = [
            [0, 0, 0, 2],
            [0.2, 0, 0, 0.5],
        ];
        const { films } = sphereFilms(O, D, s, 0, 20);
        // Its power is above the big one's everywhere on the ray.
        expect(kinds(films)).toEqual(["in 0", "out 0"]);
    });

    test("the order of the spheres does not matter", () => {
        const s: FoamSphere[] = [
            [3, 0.2, 0, 1],
            [0, 0, 0, 1],
            [1.5, -0.1, 0, 0.9],
        ];
        const a = sphereFilms(O, D, s, 0, 20).films.map((f) => f.t);
        const b = sphereFilms(O, D, [...s].reverse(), 0, 20).films.map(
            (f) => f.t,
        );
        expect(a.length).toBe(4);
        for (let i = 0; i < a.length; i++) {
            expect(b[i]).toBeCloseTo(a[i]);
        }
    });

    test("films are sorted and split segments agree with the whole ray", () => {
        const s: FoamSphere[] = [];
        for (let i = 0; i < 8; i++) {
            s.push([i * 0.9, Math.sin(i) * 0.3, Math.cos(i * 1.7) * 0.3, 0.7]);
        }
        const whole = sphereFilms(O, D, s, 0, 30).films;
        for (let i = 1; i < whole.length; i++) {
            expect(whole[i].t).toBeGreaterThanOrEqual(whole[i - 1].t);
        }
        // Segment by segment, carrying the inside state, as the shader
        // does across lattice cells.
        const parts: SphereFilm[] = [];
        let inside: boolean | undefined;
        for (let t = 0; t < 30; t += 1.3) {
            const r = sphereFilms(O, D, s, t, Math.min(t + 1.3, 30), inside);
            parts.push(...r.films);
            inside = r.inside;
        }
        expect(kinds(parts)).toEqual(kinds(whole));
        for (let i = 0; i < parts.length; i++) {
            expect(parts[i].t).toBeCloseTo(whole[i].t);
        }
    });

    test("a sphere the ray misses changes nothing", () => {
        const s: FoamSphere[] = [
            [0, 0, 0, 1],
            [1.5, 0, 0, 1],
        ];
        const a = sphereFilms(O, D, s, 0, 20).films;
        // Big and near, but the ray passes it by: its power is lowest
        // along much of the ray, yet positive.
        const b = sphereFilms(O, D, [[0.8, 3, 0, 2.5], ...s], 0, 20).films;
        expect(b.map((f) => f.t)).toEqual(a.map((f) => f.t));
    });

    test("a ray that misses gives nothing", () => {
        const r = sphereFilms(O, [0, 1, 0], [[0, 0, 0, 1]], 0, 20);
        expect(r.films).toEqual([]);
        expect(r.inside).toBe(false);
    });

    test("starting inside: only the way out", () => {
        const r = sphereFilms([0, 0, 0], D, [[0, 0, 0, 1]], 0, 5);
        expect(kinds(r.films)).toEqual(["out 0"]);
    });
});

describe("borderDist", () => {
    // Two overlapping unit spheres along x: the radical plane is x = 0.75,
    // the surfaces meet on a circle of radius sqrt(1 - 0.75^2) there.
    const two: FoamSphere[] = [
        [0, 0, 0, 1],
        [1.5, 0, 0, 1],
    ];
    const ring = Math.sqrt(1 - 0.75 * 0.75);

    test("two spheres: the distance to the radical plane", () => {
        for (const q of [
            [0, 0, 0],
            [0.2, 0.5, -0.1],
            [-0.6, 0.3, 0.4],
        ] as const) {
            const { e, across } = borderDist(q, 0, two);
            expect(e).toBeCloseTo(0.75 - q[0]);
            expect(across).toBe(1);
        }
    });

    test("two spheres: 0 on the circle where the surfaces meet", () => {
        for (let a = 0; a < 6; a++) {
            const q = [0.75, ring * Math.cos(a), ring * Math.sin(a)] as const;
            expect(borderDist(q, 0, two).e).toBeCloseTo(0);
            expect(borderDist(q, 1, two).e).toBeCloseTo(0);
        }
    });

    test("two spheres: symmetric from both cells", () => {
        // Mirrored points across the plane are as far from it.
        const a = borderDist([0.5, 0.3, 0.1], 0, two);
        const b = borderDist([1.0, 0.3, 0.1], 1, two);
        expect(a.e).toBeCloseTo(0.25);
        expect(b.e).toBeCloseTo(0.25);
        expect(b.across).toBe(0);
    });

    test("unequal radii: the plane moves, the distance stays exact", () => {
        const s: FoamSphere[] = [
            [0, 0, 0, 1.2],
            [1.5, 0, 0, 0.8],
        ];
        // Radical plane: x = (1.5^2 + 1.2^2 - 0.8^2) / (2 * 1.5).
        const x = (2.25 + 1.44 - 0.64) / 3;
        const { e } = borderDist([0.1, 0.4, 0.2], 0, s);
        expect(e).toBeCloseTo(x - 0.1);
        // On the surface of sphere 0, where it meets sphere 1.
        const y = Math.sqrt(1.44 - x * x);
        expect(borderDist([x, y, 0], 0, s).e).toBeCloseTo(0);
    });

    test("three spheres: the nearest wall wins", () => {
        const s: FoamSphere[] = [
            [0, 0, 0, 1],
            [1.5, 0, 0, 1],
            [0, 1.2, 0, 1],
        ];
        // Walls of cell 0: x = 0.75 (with 1) and y = 0.6 (with 2).
        const a = borderDist([0.6, 0.1, 0], 0, s);
        expect(a.e).toBeCloseTo(0.15);
        expect(a.across).toBe(1);
        const b = borderDist([0.1, 0.5, 0], 0, s);
        expect(b.e).toBeCloseTo(0.1);
        expect(b.across).toBe(2);
    });

    test("alone: no wall", () => {
        expect(borderDist([0, 0, 0], 0, [[0, 0, 0, 1]])).toEqual({
            e: Infinity,
            across: -1,
        });
    });
});

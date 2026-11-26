import { describe, expect, it } from "vitest";
import { Vec2, Vec4 } from "../vec.js";
import { packUniforms, reflectWgsl, samplerTextureName } from "./wgsl.js";

const header = (fields: string) => `
struct Uniforms {
${fields}
};
@group(0) @binding(0) var<uniform> u: Uniforms;
@fragment fn main() -> @location(0) vec4f { return vec4f(0.0); }
`;

function layoutOf(fields: string) {
    const layout = reflectWgsl(header(fields)).uniform?.layout;
    if (!layout) {
        throw new Error("no uniform");
    }
    return layout;
}

function offsets(fields: string): Record<string, number> {
    return Object.fromEntries(
        layoutOf(fields).fields.map((f) => [f.name, f.offset]),
    );
}

describe("reflectWgsl", () => {
    it("finds the uniform struct, textures and samplers", () => {
        const b = reflectWgsl(`
            struct U { time: f32 };
            // @group(0) @binding(9) var<uniform> commented: U;
            @group(0) @binding(0) var<uniform> u: U;
            @binding(1) @group(0) var src: texture_2d<f32>;
            @group(0) @binding(2) var srcSampler: sampler;
        `);
        expect(b.uniform?.binding).toBe(0);
        expect(b.uniform?.layout.name).toBe("U");
        expect(b.textures).toEqual([{ binding: 1, name: "src" }]);
        expect(b.samplers).toEqual([{ binding: 2, name: "srcSampler" }]);
    });

    it("works without a uniform struct", () => {
        const b = reflectWgsl(
            "@group(0) @binding(0) var src: texture_2d<f32>;",
        );
        expect(b.uniform).toBeNull();
    });

    it("rejects other groups, a second uniform and unknown bindings", () => {
        expect(() =>
            reflectWgsl("@group(1) @binding(0) var src: texture_2d<f32>;"),
        ).toThrow(/\[VFX-JS\].*group 1/);
        expect(() =>
            reflectWgsl(`
                struct U { a: f32 };
                @group(0) @binding(0) var<uniform> a: U;
                @group(0) @binding(1) var<uniform> b: U;
            `),
        ).toThrow(/only one/);
        expect(() =>
            reflectWgsl(
                "@group(0) @binding(0) var t: texture_storage_2d<rgba8unorm, write>;",
            ),
        ).toThrow(/unsupported binding/);
    });
});

describe("struct layout", () => {
    it("aligns scalars and vectors", () => {
        expect(
            offsets(`
                time: f32,
                resolution: vec2f,
                color: vec3<f32>,
                alpha: f32,
                viewport: vec4f,
                id: i32,
            `),
        ).toEqual({
            time: 0,
            resolution: 8,
            color: 16,
            alpha: 28,
            viewport: 32,
            id: 48,
        });
        // 52 bytes, rounded up to 16.
        expect(layoutOf("time: f32, id: i32, x: vec4f, y: f32").size).toBe(48);
    });

    it("pads vec3 to 16 and lays out mat3x3 as three vec4 columns", () => {
        const layout = layoutOf("a: f32, m: mat3x3f, b: f32");
        const m = layout.fields[1];
        expect(m.offset).toBe(16);
        expect(m.columnStride).toBe(16);
        expect(layout.fields[2].offset).toBe(64);
        expect(layout.size).toBe(80);
    });

    it("lays out mat2x2 with 8-byte columns", () => {
        const layout = layoutOf("a: f32, m: mat2x2<f32>");
        expect(layout.fields[1].offset).toBe(8);
        expect(layout.fields[1].columnStride).toBe(8);
        expect(layout.size).toBe(32);
    });

    it("aligns arrays to 16 and keeps a 16-byte stride", () => {
        const layout = layoutOf("a: f32, colors: array<vec4f, 3>, b: f32");
        expect(layout.fields[1].offset).toBe(16);
        expect(layout.fields[1].arrayStride).toBe(16);
        expect(layout.fields[2].offset).toBe(64);
    });

    it("rejects arrays that need a stride under 16", () => {
        expect(() => layoutOf("values: array<f32, 4>")).toThrow(/16-byte/);
    });

    it("rejects unsupported types", () => {
        expect(() => layoutOf("flag: bool")).toThrow(/unsupported/);
        expect(() => layoutOf("@align(16) a: f32")).toThrow(/attributes/);
    });
});

describe("packUniforms", () => {
    it("fills fields by name and leaves the rest zero", () => {
        const layout = layoutOf(`
            time: f32,
            resolution: vec2f,
            id: i32,
            count: u32,
            mouse: vec2f,
            viewport: vec4f,
            missing: f32,
        `);
        const f = new Float32Array(
            packUniforms(layout, {
                time: 1.5,
                resolution: new Vec2(640, 480),
                id: -3,
                count: true,
                mouse: [1, 2],
                viewport: new Vec4(1, 2, 3, 4),
                unknown: 99,
            }),
        );
        const i = new Int32Array(f.buffer);
        expect(f[0]).toBe(1.5);
        expect([f[2], f[3]]).toEqual([640, 480]);
        expect(i[4]).toBe(-3);
        expect(i[5]).toBe(1);
        expect([f[6], f[7]]).toEqual([1, 2]);
        expect(Array.from(f.slice(8, 12))).toEqual([1, 2, 3, 4]);
        expect(f[12]).toBe(0);
    });

    it("writes matrix columns with padding", () => {
        const layout = layoutOf("m: mat3x3f");
        const f = new Float32Array(
            packUniforms(layout, { m: [1, 2, 3, 4, 5, 6, 7, 8, 9] }),
        );
        expect(Array.from(f)).toEqual([1, 2, 3, 0, 4, 5, 6, 0, 7, 8, 9, 0]);
    });

    it("writes arrays element by element", () => {
        const layout = layoutOf("a: f32, v: array<vec4f, 2>");
        const f = new Float32Array(
            packUniforms(layout, {
                v: new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]),
            }),
        );
        expect(Array.from(f.slice(4, 12))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it("skips texture values", () => {
        const layout = layoutOf("time: f32");
        const f = new Float32Array(
            packUniforms(layout, { time: { texture: true } }),
        );
        expect(f[0]).toBe(0);
    });
});

describe("samplerTextureName", () => {
    it("pairs <name>Sampler with <name>", () => {
        expect(samplerTextureName("srcSampler")).toBe("src");
        expect(samplerTextureName("backbufferSampler")).toBe("backbuffer");
        expect(samplerTextureName("linear")).toBeNull();
    });
});

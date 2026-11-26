import { Vec2, Vec4 } from "../vec.js";

/*
 * Small WGSL reflection for user fragment shaders.
 * It reads the group 0 bindings and the layout of the uniform struct,
 * so uniforms can be filled by name.
 */

/** Scalar kind of a numeric WGSL type. @internal */
export type ScalarKind = "f32" | "i32" | "u32";

/** @internal */
export type FieldLayout = {
    name: string;
    offset: number;
    kind: ScalarKind;

    /** Components per column (1 for scalars, N for vecN, R for matCxR). */
    rows: number;

    /** Columns (1 for scalars and vectors, C for matCxR). */
    columns: number;

    /** Bytes between columns. */
    columnStride: number;

    /** Array length, or 0 when the field is not an array. */
    arrayLength: number;

    /** Bytes between array elements. */
    arrayStride: number;
};

/** @internal */
export type StructLayout = {
    name: string;
    size: number;
    fields: FieldLayout[];
};

/** @internal */
export type WgslBindings = {
    uniform: { binding: number; name: string; layout: StructLayout } | null;
    textures: { binding: number; name: string }[];
    samplers: { binding: number; name: string }[];
};

type TypeInfo = {
    kind: ScalarKind;
    rows: number;
    columns: number;
    columnStride: number;
    align: number;
    size: number;
};

const SCALARS: Record<string, ScalarKind> = {
    f: "f32",
    i: "i32",
    u: "u32",
    f32: "f32",
    i32: "i32",
    u32: "u32",
};

function roundUp(align: number, n: number): number {
    return Math.ceil(n / align) * align;
}

function fail(message: string): never {
    throw new Error(`[VFX-JS] WGSL: ${message}`);
}

function stripComments(code: string): string {
    return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/** Vector of `rows` components: WGSL alignment and size. */
function vectorInfo(kind: ScalarKind, rows: number): TypeInfo {
    const size = rows * 4;
    const align = rows === 3 ? 16 : size;
    return { kind, rows, columns: 1, columnStride: 0, align, size };
}

/** Layout of a numeric type in the uniform address space. */
function typeInfo(type: string): TypeInfo {
    const t = type.replace(/\s+/g, "");
    const scalar = SCALARS[t];
    if (scalar && t.length > 1) {
        return vectorInfo(scalar, 1);
    }
    const vec = /^vec([234])(?:<(f32|i32|u32)>|([fiu]))$/.exec(t);
    if (vec) {
        const kind = SCALARS[vec[2] ?? vec[3]];
        return vectorInfo(kind, Number(vec[1]));
    }
    const mat = /^mat([234])x([234])(?:<f32>|f)$/.exec(t);
    if (mat) {
        const columns = Number(mat[1]);
        const column = vectorInfo("f32", Number(mat[2]));
        const columnStride = roundUp(column.align, column.size);
        return {
            kind: "f32",
            rows: column.rows,
            columns,
            columnStride,
            align: column.align,
            size: columns * columnStride,
        };
    }
    return fail(`unsupported uniform type "${type}"`);
}

/** Split struct members on commas outside `<...>`. */
function splitFields(body: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < body.length; i++) {
        const ch = body[i];
        if (ch === "<") {
            depth++;
        } else if (ch === ">") {
            depth--;
        } else if (ch === "," && depth === 0) {
            out.push(body.slice(start, i));
            start = i + 1;
        }
    }
    out.push(body.slice(start));
    return out;
}

function parseStruct(code: string, name: string): StructLayout {
    const match = new RegExp(`struct\\s+${name}\\s*\\{([^}]*)\\}`).exec(code);
    if (!match) {
        return fail(`struct "${name}" not found`);
    }
    const fields: FieldLayout[] = [];
    let offset = 0;
    let structAlign = 4;
    for (const raw of splitFields(match[1])) {
        const decl = raw.trim();
        if (decl === "") {
            continue;
        }
        if (decl.startsWith("@")) {
            fail(`field attributes are not supported: "${decl}"`);
        }
        const field = /^(\w+)\s*:\s*(.+)$/.exec(decl);
        if (!field) {
            fail(`cannot read struct field "${decl}"`);
        }
        const [, fieldName, fieldType] = field;
        const array = /^array<(.+),\s*(\d+)u?\s*>$/.exec(fieldType.trim());
        let info: TypeInfo;
        let align: number;
        let size: number;
        let arrayLength = 0;
        let arrayStride = 0;
        if (array) {
            info = typeInfo(array[1]);
            arrayLength = Number(array[2]);
            arrayStride = roundUp(info.align, info.size);
            if (arrayStride % 16 !== 0) {
                fail(
                    `array "${fieldName}" needs a 16-byte stride in a uniform buffer; use vec4 elements`,
                );
            }
            align = roundUp(16, info.align);
            size = arrayLength * arrayStride;
        } else {
            info = typeInfo(fieldType);
            align = info.align;
            size = info.size;
        }
        offset = roundUp(align, offset);
        fields.push({
            name: fieldName,
            offset,
            kind: info.kind,
            rows: info.rows,
            columns: info.columns,
            columnStride: info.columnStride,
            arrayLength,
            arrayStride,
        });
        offset += size;
        structAlign = Math.max(structAlign, align);
    }
    // Uniform buffer bindings are sized in 16-byte steps.
    const size = roundUp(16, roundUp(structAlign, offset));
    return { name, size: Math.max(size, 16), fields };
}

/**
 * Read the group 0 bindings of a WGSL fragment module.
 * Throws a `[VFX-JS]` error on layouts it can't fill.
 * @internal
 */
export function reflectWgsl(source: string): WgslBindings {
    const code = stripComments(source);
    const result: WgslBindings = { uniform: null, textures: [], samplers: [] };
    const varRe =
        /((?:@\w+\s*\(\s*\w+\s*\)\s*)+)var\s*(<[^>]*>)?\s+(\w+)\s*:\s*([^;]+);/g;
    for (const m of code.matchAll(varRe)) {
        const attrs = m[1];
        const group = /@group\s*\(\s*(\d+)\s*\)/.exec(attrs);
        const binding = /@binding\s*\(\s*(\d+)\s*\)/.exec(attrs);
        if (!group || !binding) {
            continue;
        }
        const name = m[3];
        if (group[1] !== "0") {
            fail(
                `"${name}" is in group ${group[1]}; only group 0 is supported`,
            );
        }
        const index = Number(binding[1]);
        const space = m[2]?.replace(/[<>\s]/g, "");
        const type = m[4].trim();
        if (space === "uniform") {
            if (result.uniform) {
                fail("only one var<uniform> is supported");
            }
            result.uniform = {
                binding: index,
                name,
                layout: parseStruct(code, type),
            };
        } else if (/^texture_2d\s*<\s*f32\s*>$/.test(type)) {
            result.textures.push({ binding: index, name });
        } else if (type === "sampler") {
            result.samplers.push({ binding: index, name });
        } else {
            fail(`unsupported binding "${name}: ${type}"`);
        }
    }
    return result;
}

/** Sampler paired with a texture: `<name>Sampler`. @internal */
export function samplerTextureName(samplerName: string): string | null {
    return samplerName.endsWith("Sampler")
        ? samplerName.slice(0, -"Sampler".length)
        : null;
}

function flatten(value: unknown): ArrayLike<number> | null {
    if (typeof value === "number") {
        return [value];
    }
    if (typeof value === "boolean") {
        return [value ? 1 : 0];
    }
    if (value instanceof Vec2) {
        return [value.x, value.y];
    }
    if (value instanceof Vec4) {
        return [value.x, value.y, value.z, value.w];
    }
    if (Array.isArray(value)) {
        return value.map((v) => (typeof v === "boolean" ? Number(v) : v));
    }
    if (
        value instanceof Float32Array ||
        value instanceof Int32Array ||
        value instanceof Uint32Array
    ) {
        return value;
    }
    return null;
}

/**
 * Write `values` into a buffer laid out as `layout`.
 * Fields without a value stay zero. Matrices are column-major.
 * @internal
 */
export function packUniforms(
    layout: StructLayout,
    values: Readonly<Record<string, unknown>>,
): ArrayBuffer {
    const buffer = new ArrayBuffer(layout.size);
    const views = {
        f32: new Float32Array(buffer),
        i32: new Int32Array(buffer),
        u32: new Uint32Array(buffer),
    };
    for (const field of layout.fields) {
        const data = flatten(values[field.name]);
        if (!data) {
            continue;
        }
        const view = views[field.kind];
        const elements = Math.max(1, field.arrayLength);
        let i = 0;
        fill: for (let e = 0; e < elements; e++) {
            const base = field.offset + e * field.arrayStride;
            for (let c = 0; c < field.columns; c++) {
                const at = (base + c * field.columnStride) / 4;
                for (let r = 0; r < field.rows; r++) {
                    if (i >= data.length) {
                        break fill;
                    }
                    view[at + r] = data[i++];
                }
            }
        }
    }
    return buffer;
}

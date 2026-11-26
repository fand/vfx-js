/**
 * Vertex stage for user fragment shaders: a fullscreen quad.
 * Clip y is flipped, so render targets store rows bottom-up like WebGL,
 * and `@builtin(position)` matches `gl_FragCoord`.
 * @internal
 */
export const WGSL_VERTEX = /* wgsl */ `
struct VertexOut {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) uvContent: vec2f,
    @location(2) uvSrc: vec2f,
};

@vertex
fn main(@builtin(vertex_index) i: u32) -> VertexOut {
    var corners = array<vec2f, 6>(
        vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
        vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
    );
    let p = corners[i];
    var out: VertexOut;
    out.position = vec4f(p.x, -p.y, 0.0, 1.0);
    out.uv = p * 0.5 + 0.5;
    out.uvContent = out.uv;
    out.uvSrc = out.uv;
    return out;
}
`;

/**
 * Copies the bottom-up screen target to the canvas, flipping rows.
 * @internal
 */
export const WGSL_PRESENT = /* wgsl */ `
@group(0) @binding(0) var screen: texture_2d<f32>;

@vertex
fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
    var corners = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
    return vec4f(corners[i], 0.0, 1.0);
}

@fragment
fn fs(@builtin(position) position: vec4f) -> @location(0) vec4f {
    let size = vec2i(textureDimensions(screen));
    let p = vec2i(position.xy);
    return textureLoad(screen, vec2i(p.x, size.y - 1 - p.y), 0);
}
`;

/**
 * WGSL twin of `COPY_FRAGMENT_SHADER`.
 * @internal
 */
export const WGSL_COPY_FRAGMENT = /* wgsl */ `
struct Uniforms {
    offset: vec2f,
    resolution: vec2f,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var src: texture_2d<f32>;
@group(0) @binding(2) var srcSampler: sampler;

@fragment
fn main(@builtin(position) position: vec4f) -> @location(0) vec4f {
    let uv = (position.xy - u.offset) / u.resolution;
    let color = textureSample(src, srcSampler, uv);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        discard;
    }
    return color;
}
`;

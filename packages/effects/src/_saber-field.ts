// Compact field: signed distance in R, normal angle + 4 in G. G=0 is invalid;
// G=8 preserves the degenerate zero normal. Decode angles only at texel centers:
// interpolating angles across their wrap would corrupt normals.
export const GLSL_SABER_FIELD = `
uniform int compactField;
uniform vec2 fieldOrigin;
uniform vec2 fieldBufferSize;
vec4 fetchSaberField(sampler2D field, ivec2 globalPixel) {
    ivec2 p = globalPixel - ivec2(fieldOrigin);
    ivec2 size = textureSize(field, 0);
    if (any(lessThan(p, ivec2(0))) || any(greaterThanEqual(p, size))) return vec4(0.0);
    return texelFetch(field, p, 0);
}
vec2 saberFieldUv(vec2 p, ivec2 size) {
    if (all(equal(fieldOrigin, vec2(0.0))) && all(equal(vec2(size), fieldBufferSize))) return p;
    return (clamp(p * fieldBufferSize, vec2(0.5), fieldBufferSize - 0.5) - fieldOrigin) / vec2(size);
}
float sampleSaberDistance(sampler2D field, vec2 p) {
    ivec2 size = textureSize(field, 0);
    if (all(equal(fieldOrigin, vec2(0.0))) && all(equal(vec2(size), fieldBufferSize))) return texture(field, p).r;
    vec2 local = saberFieldUv(p, size);
    vec2 coverage = clamp(local * vec2(size) + 0.5, 0.0, 1.0)
        * clamp((1.0 - local) * vec2(size) + 0.5, 0.0, 1.0);
    return texture(field, local).r * coverage.x * coverage.y;
}
float saberFieldValidity(vec4 value) {
    return compactField == 0 ? value.a : step(0.000001, value.g);
}
vec4 decodeSaberField(vec4 value) {
    if (compactField == 0) return value;
    float angle = value.g - 4.0;
    vec2 normal = value.g == 8.0 ? vec2(0.0) : vec2(cos(angle), sin(angle));
    return vec4(value.r, normal, saberFieldValidity(value));
}

vec4 sampleSaberField(sampler2D field, vec2 p) {
    ivec2 size = textureSize(field, 0);
    vec2 local = saberFieldUv(p, size);
    vec4 value = texture(field, local);
    if (compactField == 0) return value;
    // Distorted cores use only distance and validity. Reconstruct the original
    // bilinear validity separately; an interpolated angle isn't a valid mask.
    vec2 position = clamp(p, 0.0, 1.0) * fieldBufferSize - 0.5;
    ivec2 lo = ivec2(floor(position));
    vec2 f = fract(position);
    vec4 valid = step(vec4(0.000001), vec4(
        fetchSaberField(field, clamp(lo, ivec2(0), ivec2(fieldBufferSize) - 1)).g,
        fetchSaberField(field, clamp(lo + ivec2(1, 0), ivec2(0), ivec2(fieldBufferSize) - 1)).g,
        fetchSaberField(field, clamp(lo + ivec2(0, 1), ivec2(0), ivec2(fieldBufferSize) - 1)).g,
        fetchSaberField(field, clamp(lo + ivec2(1), ivec2(0), ivec2(fieldBufferSize) - 1)).g));
    return vec4(sampleSaberDistance(field, p), 0.0, 0.0, mix(mix(valid.x, valid.y, f.x), mix(valid.z, valid.w, f.x), f.y));
}
`;

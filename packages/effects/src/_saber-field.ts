// Compact field: signed distance in R, normal angle + 4 in G. G=0 is invalid;
// G=8 preserves the degenerate zero normal. Decode angles only at texel centers:
// interpolating angles across their wrap would corrupt normals.
export const GLSL_SABER_FIELD = `
uniform int compactField;
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
    vec4 value = texture(field, p);
    if (compactField == 0) return value;
    // Distorted cores use only distance and validity. Reconstruct the original
    // bilinear validity separately; an interpolated angle isn't a valid mask.
    ivec2 size = textureSize(field, 0);
    vec2 position = p * vec2(size) - 0.5;
    ivec2 lo = ivec2(floor(position));
    vec2 f = fract(position);
    vec4 valid = step(vec4(0.000001), vec4(
        texelFetch(field, clamp(lo, ivec2(0), size - 1), 0).g,
        texelFetch(field, clamp(lo + ivec2(1, 0), ivec2(0), size - 1), 0).g,
        texelFetch(field, clamp(lo + ivec2(0, 1), ivec2(0), size - 1), 0).g,
        texelFetch(field, clamp(lo + ivec2(1), ivec2(0), size - 1), 0).g));
    return vec4(value.r, 0.0, 0.0, mix(mix(valid.x, valid.y, f.x), mix(valid.z, valid.w, f.x), f.y));
}
`;

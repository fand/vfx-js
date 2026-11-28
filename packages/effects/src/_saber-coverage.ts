// Exact box-filter coverage of a locally straight strip. A screen pixel projects
// to the convolution of two uniform intervals along the line's normal. Its CDF
// is linear in the middle and quadratic at the ends (a trapezoidal density).
export const GLSL_LINE_COVERAGE = `
float pixelCDF(float x, vec2 normal) {
    vec2 n = abs(normal);
    float a = max(max(n.x, n.y), 1e-5);
    float b = min(n.x, n.y);
    float u = abs(x);
    float tail;
    if (u <= 0.5 * (a - b)) {
        tail = 0.5 - u / a;
    } else {
        float cap = max(0.5 * (a + b) - u, 0.0);
        tail = cap * cap / max(2.0 * a * b, 1e-10);
    }
    return x < 0.0 ? tail : 1.0 - tail;
}

float lineCoverage(float distance, float width, vec2 normal) {
    float halfWidth = max(width, 0.0) * 0.5;
    return max(pixelCDF(halfWidth - distance, normal)
        - pixelCDF(-halfWidth - distance, normal), 0.0);
}
`;

const LEVELS = 28;
const SPEED = 0.04;
const OPACITY = 0.16;

const vertex = `#version 300 es
in vec2 position;
void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}`;

// 3D simplex noise by Ashima Arts (MIT).
const fragment = `#version 300 es
precision highp float;
uniform float time;
uniform float dpr;
uniform float levels;
uniform vec4 ink;
out vec4 outColor;

vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0 / 7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

void main() {
    vec2 p = gl_FragCoord.xy / dpr / 520.0;
    float n = snoise(vec3(p, time)) + 0.3 * snoise(vec3(p * 2.3, time * 1.4));
    float f = n * levels * 0.5;
    // Distance to the nearest level in pixels, for a 1px line.
    float d = abs(fract(f - 0.5) - 0.5) / fwidth(f);
    float a = (1.0 - clamp(d / dpr, 0.0, 1.0)) * ink.a;
    outColor = vec4(ink.rgb * a, a);
}`;

/** Starts drawing into `el`. Returns a function that stops it. */
export function startContour(el: HTMLCanvasElement) {
    const gl = el.getContext("webgl2", {
        premultipliedAlpha: true,
        preserveDrawingBuffer: true,
    });
    if (!gl) {
        return undefined;
    }
    let program: WebGLProgram;
    try {
        program = createProgram(gl);
    } catch (e) {
        console.error(e);
        return undefined;
    }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const [r, g, b] = parseColor(getComputedStyle(el).color);
    gl.uniform4f(uniform("ink"), r, g, b, OPACITY);
    gl.uniform1f(uniform("levels"), LEVELS);

    const dpr = Math.min(window.devicePixelRatio, 2);
    const resize = () => {
        el.width = Math.round(el.clientWidth * dpr);
        el.height = Math.round(el.clientHeight * dpr);
        gl.viewport(0, 0, el.width, el.height);
        gl.uniform1f(uniform("dpr"), dpr);
    };
    const start = performance.now();
    const draw = () => {
        const t = ((performance.now() - start) / 1000) * SPEED;
        gl.uniform1f(uniform("time"), t);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    resize();
    // Draw now so a transition capture sees the lines.
    draw();
    const ro = new ResizeObserver(() => {
        resize();
        draw();
    });
    ro.observe(el);

    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = true;
    const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
    });
    io.observe(el);
    let frame = 0;
    const loop = () => {
        frame = requestAnimationFrame(loop);
        if (visible && !document.hidden) {
            draw();
        }
    };
    if (!still) {
        frame = requestAnimationFrame(loop);
    }
    return () => {
        cancelAnimationFrame(frame);
        ro.disconnect();
        io.disconnect();
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        gl.clear(gl.COLOR_BUFFER_BIT);
    };
}

function createProgram(gl: WebGL2RenderingContext) {
    const program = gl.createProgram();
    for (const [type, source] of [
        [gl.VERTEX_SHADER, vertex],
        [gl.FRAGMENT_SHADER, fragment],
    ] as const) {
        const shader = gl.createShader(type);
        if (!shader) {
            throw new Error("Cannot create shader");
        }
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(shader) ?? "Shader error");
        }
        gl.attachShader(program, shader);
        gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL call, not a React hook.
    gl.useProgram(program);
    return program;
}

/** "rgb(r, g, b)" to 0..1 channels. */
function parseColor(color: string) {
    const [r = 0, g = 0, b = 0] = (color.match(/[\d.]+/g) ?? []).map(Number);
    return [r / 255, g / 255, b / 255];
}

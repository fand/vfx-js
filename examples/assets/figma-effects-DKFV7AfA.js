import"./modulepreload-polyfill-P2Xu9kJm.js";import{t as e}from"./esm-7cF1vuJP.js";import{r as t}from"./esm-DrExCSsC.js";import{t as n}from"./tweakpane-CejtfnN4.js";function r(e){let t=e.startsWith(`#`)?e.slice(1):e;return(t.length===3||t.length===4)&&(t=t.split(``).map(e=>e+e).join(``)),t.length===6&&(t+=`ff`),t.length===8?[Number.parseInt(t.slice(0,2),16)/255,Number.parseInt(t.slice(2,4),16)/255,Number.parseInt(t.slice(4,6),16)/255,Number.parseInt(t.slice(6,8),16)/255]:[0,0,0,0]}var i=`
mat2 rot2d(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}
`,a=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 resolution;
uniform float threshold;
uniform float thickness;
uniform float intensity;
uniform float opacity;
uniform vec4 color1;
uniform vec4 color2;
uniform vec4 background;

vec3 sampleSrc(vec2 uv) {
    return texture(src, srcRectUv.xy + uv * srcRectUv.zw).rgb;
}

float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main(void) {
    vec2 d = thickness / resolution;
    // Sobel gradient on luminance.
    float tl = lum(sampleSrc(uvContent + vec2(-d.x, d.y)));
    float tc = lum(sampleSrc(uvContent + vec2(0.0, d.y)));
    float tr = lum(sampleSrc(uvContent + vec2(d.x, d.y)));
    float ml = lum(sampleSrc(uvContent + vec2(-d.x, 0.0)));
    float mr = lum(sampleSrc(uvContent + vec2(d.x, 0.0)));
    float bl = lum(sampleSrc(uvContent + vec2(-d.x, -d.y)));
    float bc = lum(sampleSrc(uvContent + vec2(0.0, -d.y)));
    float br = lum(sampleSrc(uvContent + vec2(d.x, -d.y)));

    float gx = (tr + 2.0 * mr + br) - (tl + 2.0 * ml + bl);
    float gy = (tl + 2.0 * tc + tr) - (bl + 2.0 * bc + br);
    float g = length(vec2(gx, gy));

    float e = clamp(g * intensity - threshold, 0.0, 1.0);
    vec3 edgeCol = mix(color1.rgb, color2.rgb, clamp(g, 0.0, 1.0));
    vec3 base = mix(background.rgb, edgeCol, e);

    // Opacity blends the untouched source back in over the edge render.
    vec3 orig = sampleSrc(uvContent);
    outColor = vec4(mix(base, orig, opacity), 1.0);
}
`,o={threshold:.2,thickness:3,intensity:4,opacity:0,color1:`#ff0000`,color2:`#0000ff`,background:`#000000`},s=class{constructor(e={}){this.params={...o,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,i]=e.dims.elementPixel;e.draw({frag:a,uniforms:{src:e.src,resolution:[Math.max(1,n),Math.max(1,i)],threshold:t.threshold,thickness:Math.max(.5,t.thickness),intensity:Math.max(0,t.intensity),opacity:Math.min(1,Math.max(0,t.opacity)),color1:r(t.color1),color2:r(t.color2),background:r(t.background)},target:e.target})}},ee=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 resolution;
uniform int style;
uniform float size;
uniform float levels;
uniform float brightness;
uniform float contrast;
uniform float mono;
uniform vec4 monoColor;

// Recursive Bayer ordered-dither thresholds, in [0, 1).
float bayer2(vec2 a) {
    a = floor(a);
    return fract(a.x / 2.0 + a.y * a.y * 0.75);
}
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
float bayer16(vec2 a) { return bayer8(0.5 * a) * 0.25 + bayer2(a); }

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float threshold(vec2 cell) {
    if (style == 0) return bayer2(cell);
    if (style == 1) return bayer4(cell);
    if (style == 2) return bayer8(cell);
    if (style == 3) return bayer16(cell);
    // Blue noise: approximated by a per-cell hash (not a true blue spectrum).
    if (style == 4) return hash12(cell);
    return 0.5; // Threshold: no pattern, hard quantization.
}

void main(void) {
    float cellSize = max(1.0, size);
    // Content origin in fragment px (constant across the element). Bucketing
    // on the integer fragment grid keeps cells square; anchoring to this
    // origin (not raw gl_FragCoord) ties the pattern to the src rect, not
    // the screen.
    vec2 originPx = floor(gl_FragCoord.xy - uvContent * resolution + 0.5);
    // Pixel position measured from the src-rect center.
    vec2 centerPx = gl_FragCoord.xy - originPx - 0.5 * resolution;
    vec2 cell = floor(centerPx / cellSize);
    // Sample once per cell so each cell is a single flat color.
    vec2 cellUv = ((cell + 0.5) * cellSize) / resolution + 0.5;
    vec4 tex = texture(src, srcRectUv.xy + cellUv * srcRectUv.zw);
    vec3 c = tex.rgb;
    c = (c - 0.5) * contrast + 0.5;
    c *= brightness;

    float th = threshold(cell);
    float steps = max(1.0, levels - 1.0);

    if (mono > 0.5) {
        float l = dot(c, vec3(0.299, 0.587, 0.114));
        float q = clamp(floor(l * steps + th) / steps, 0.0, 1.0);
        outColor = vec4(monoColor.rgb * q, tex.a * monoColor.a);
    } else {
        vec3 q = clamp(floor(c * steps + th) / steps, 0.0, 1.0);
        outColor = vec4(q, tex.a);
    }
}
`,te={bayer2:0,bayer4:1,bayer8:2,bayer16:3,blueNoise:4,threshold:5},ne={style:`bayer16`,size:2,levels:3,brightness:1,contrast:1,mono:!1,monoColor:`#ffffff`},re=class{constructor(e={}){this.params={...ne,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,i]=e.dims.elementPixel;e.draw({frag:ee,uniforms:{src:e.src,resolution:[Math.max(1,n),Math.max(1,i)],style:te[t.style]??5,size:Math.max(1,t.size),levels:Math.max(2,t.levels),brightness:t.brightness,contrast:t.contrast,mono:+!!t.mono,monoColor:r(t.monoColor)},target:e.target})}},c=8,ie=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec3 colors[${c}];
uniform int colorCount;
uniform float scatter;
uniform float offset;
uniform int repeatType;
uniform float frequency;
uniform int mixSpace;
uniform float time;

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec3 srgb2lin(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }
// Clamp first: OKLab interpolation can leave the gamut, and pow() of a
// negative value is NaN (renders as garbage/magenta).
vec3 lin2srgb(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }

vec3 lin2oklab(vec3 c) {
    float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
    float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
    float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
    vec3 lms = pow(max(vec3(l, m, s), 0.0), vec3(1.0 / 3.0));
    return vec3(
        0.2104542553 * lms.x + 0.7936177850 * lms.y - 0.0040720468 * lms.z,
        1.9779984951 * lms.x - 2.4285922050 * lms.y + 0.4505937099 * lms.z,
        0.0259040371 * lms.x + 0.7827717662 * lms.y - 0.8086757660 * lms.z
    );
}
vec3 oklab2lin(vec3 lab) {
    float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
    float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
    float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
    vec3 lms = vec3(l_, m_, s_);
    lms = lms * lms * lms;
    return vec3(
        4.0767416621 * lms.x - 3.3077115913 * lms.y + 0.2309699292 * lms.z,
        -1.2684380046 * lms.x + 2.6097574011 * lms.y - 0.3413193965 * lms.z,
        -0.0041960863 * lms.x - 0.7034186147 * lms.y + 1.7076147010 * lms.z
    );
}

// Interpolate two sRGB colors in the selected space, returning sRGB.
vec3 mixColor(vec3 a, vec3 b, float t) {
    if (mixSpace == 1) {
        return lin2srgb(mix(srgb2lin(a), srgb2lin(b), t));
    } else if (mixSpace == 2) {
        vec3 oa = lin2oklab(srgb2lin(a));
        vec3 ob = lin2oklab(srgb2lin(b));
        return lin2srgb(oklab2lin(mix(oa, ob, t)));
    }
    return mix(a, b, t);
}

// Fold t into [0, 1] per the repeat mode (none = clamp).
float applyRepeat(float t) {
    if (repeatType == 1) return fract(t);
    if (repeatType == 2) return 1.0 - abs(1.0 - fract(t * 0.5) * 2.0);
    return clamp(t, 0.0, 1.0);
}

vec3 sampleGradient(float t) {
    float f = t * float(colorCount - 1);
    int i = int(floor(f));
    i = clamp(i, 0, colorCount - 2);
    float frac = clamp(f - float(i), 0.0, 1.0);
    return clamp(mixColor(colors[i], colors[i + 1], frac), 0.0, 1.0);
}

void main(void) {
    vec4 tex = texture(src, srcRectUv.xy + uvContent * srcRectUv.zw);
    float l = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    // Hash in pixel space (gl_FragCoord); hash12 degenerates on tiny
    // [0,1] uv inputs.
    l += scatter * (hash12(gl_FragCoord.xy) - 0.5);

    // offset (and time drift) advance one full cycle per unit, so a 0->1
    // offset sweep runs (frequency) cycles.
    float t = applyRepeat((l + offset + time) * frequency);
    // Premultiply: the final blit is premultiplied, so non-zero rgb in
    // transparent areas would add to the background as stray color.
    outColor = vec4(sampleGradient(t) * tex.a, tex.a);
}
`,l={none:0,repeat:1,mirror:2},u={srgb:0,linear:1,oklab:2},d={colors:[`#bbee00`,`#3aa0ff`,`#000000`],scatter:0,offset:0,repeat:`mirror`,frequency:1,mixSpace:`srgb`,speed:0},f=class{constructor(e={}){this.params={...d,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,n=t.colors.length>=2?t.colors:d.colors,i=Math.min(c,n.length),a=new Float32Array(24);for(let e=0;e<c;e++){let[t,o,s]=r(n[Math.min(e,i-1)]);a[e*3]=t,a[e*3+1]=o,a[e*3+2]=s}e.draw({frag:ie,uniforms:{src:e.src,colors:a,colorCount:i,scatter:Math.max(0,t.scatter),offset:t.offset,repeatType:l[t.repeat]??0,frequency:t.frequency,mixSpace:u[t.mixSpace]??0,time:e.time*t.speed},target:e.target})}},p=`#version 300 es
precision highp float;
#define TAU 6.28318530718
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 center;
uniform int pattern;
uniform int edgeWrap;
uniform float strength;
uniform float smoothness;
uniform float frost;
uniform float dispersion;
uniform float stripWidth;
uniform float angle;
uniform float aspect;
${i}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Smooth value noise: bilinear-interpolated lattice hash.
float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
        mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

// Edge sampling for out-of-range coordinates.
vec4 readTexWrap(vec2 uv) {
    if (edgeWrap == 0) {
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)
            return vec4(0.0);
    } else if (edgeWrap == 1) {
        uv = clamp(uv, 0.0, 1.0);
    } else if (edgeWrap == 2) {
        uv = fract(uv);
    } else {
        vec2 m = mod(uv, 2.0);
        uv = mix(m, 2.0 - m, step(1.0, m));
    }
    return texture(src, srcRectUv.xy + uv * srcRectUv.zw);
}

// Sample coordinate after the pattern displacement. stGrid fixes the pattern
// geometry (same for every channel); stDisp scales the displacement and is
// varied per channel to get dispersion, so RGB shifts within a strip while the
// strip boundaries stay aligned.
vec2 patternSample(vec2 uv, float stGrid, float stDisp) {
    vec2 q = rot2d(-radians(angle)) * (uv - center);
    float count = 1.0 / stripWidth;

    if (pattern == 2) {
        // Circular: shrink the content inside each grid circle toward the
        // circle's own center. aspect keeps the cells square so circles stay
        // round on any element shape.
        vec2 qa = vec2(q.x * aspect, q.y);
        vec2 g = qa * count;
        vec2 cl = fract(g) - 0.5;
        float r = length(cl);
        float edge = r * 2.0;
        float taper = smoothness > 0.0
            ? smoothstep(1.0, 1.0 - smoothness, edge)
            : step(edge, 1.0);
        float mask = r < 0.5 ? taper : 0.0;
        // Push the sample out from the circle center so a wider area maps in.
        vec2 offset = vec2(cl.x / aspect, cl.y) / count;
        q += offset * stDisp * mask;
        return rot2d(radians(angle)) * q + center;
    }

    // Lenticular: displace each strip's sample by its position within the
    // strip. n runs -1..1 across the strip. smoothness=0 keeps the interior
    // flat and spikes at the boundary (a jump, drawn as a tail); smoothness=1
    // is a sine: zero at the boundary, smooth wave that folds at the edges.
    float gx = q.x;
    float bendPhase = (q.y + 0.5) * TAU / (5.0 * stripWidth);
    if (pattern == 1) {
        // Waves: bend the lens grid along y. Frequency scales with 1/stripWidth.
        gx += sin(bendPhase) * stGrid * 0.5 * stripWidth;
    }
    float n = fract(gx * count) * 2.0 - 1.0;
    float sharp = sign(n) * pow(abs(n), 8.0);
    float soft = sin(n * TAU * 0.5);
    // Waves: keep the bend near the strip boundary so the interior stays flat
    // and adjacent strips join up; raising smoothness widens the connection.
    if (pattern == 1) soft *= n * n;
    float shape = mix(sharp, soft, smoothness);
    float disp = 0.3 * stripWidth * stDisp * shape;
    q.x += disp;
    if (pattern == 1) {
        // Refraction follows the bent grid: y shift = x shift times the grid's
        // slope along y, so where the bend rises the sample tilts up-right.
        q.y += disp * cos(bendPhase) * stGrid * 0.5 * TAU / 5.0;
    }
    return rot2d(radians(angle)) * q + center;
}

void main(void) {
    vec2 uvR = patternSample(uvContent, strength, strength * (1.0 + dispersion));
    vec2 uvG = patternSample(uvContent, strength, strength);
    vec2 uvB = patternSample(uvContent, strength, strength * (1.0 - dispersion));

    if (frost > 0.0) {
        // Frost: jitter the sample with value noise for a frosted-glass blur.
        vec2 j = (vec2(
            valueNoise(uvContent * 1024.0),
            valueNoise(uvContent * 1024.0 + 19.0)
        ) - 0.5) * frost * 0.05;
        uvR += j;
        uvG += j;
        uvB += j;
    }

    vec4 cg = readTexWrap(uvG);
    outColor = vec4(
        readTexWrap(uvR).r,
        cg.g,
        readTexWrap(uvB).b,
        cg.a
    );
}
`,m={lenticular:0,waves:1,circular:2},h={zero:0,clamp:1,repeat:2,mirror:3},g={pattern:`lenticular`,strength:.5,smoothness:0,frost:0,dispersion:.04,edgeWrap:`zero`,centerX:.5,centerY:.5,stripWidth:.05,angle:0},_=class{constructor(e={}){this.params={...g,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.element;e.draw({frag:p,uniforms:{src:e.src,center:[t.centerX,t.centerY],pattern:m[t.pattern]??0,edgeWrap:h[t.edgeWrap]??0,strength:t.strength,smoothness:Math.min(1,Math.max(0,t.smoothness)),frost:Math.max(0,t.frost),dispersion:Math.max(0,t.dispersion),stripWidth:Math.min(1,Math.max(.001,t.stripWidth)),angle:t.angle,aspect:(n||1)/(r||1)},target:e.target})}},ae=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 center;
uniform float angle;
uniform float offset;
uniform float reach;
uniform float smoothness;
${i}

vec4 readTex(vec2 c) {
    if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

// Quadratic smooth min/max (Inigo Quilez) to round the band corners.
float smin(float a, float b, float k) {
    k = max(k, 1e-4);
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}
float smax(float a, float b, float k) { return -smin(-a, -b, k); }

void main(void) {
    vec2 pr = rot2d(-radians(angle)) * (uvContent - center);

    // Line position along the rotated y axis (offset 0 = center).
    float line = offset * 0.5;
    float k = min(smoothness, max(reach, 0.0) * 0.49);

    // Source displacement: 0 below the line, ramps to reach across the
    // band, then holds at reach (shifting the rest of the image up).
    float disp = smin(smax(pr.y - line, 0.0, k), reach, k);

    vec2 uv = rot2d(radians(angle)) * vec2(pr.x, pr.y - disp) + center;
    outColor = readTex(uv);
}
`,v={offset:0,reach:.1,smoothness:0,centerX:.5,centerY:.5,angle:45},oe=class{constructor(e={}){this.params={...v,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params;e.draw({frag:ae,uniforms:{src:e.src,center:[t.centerX,t.centerY],angle:t.angle,offset:t.offset,reach:Math.max(0,t.reach),smoothness:Math.max(0,t.smoothness)},target:e.target})}},se=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 center;
uniform vec2 resolution;
uniform float angle;
uniform float size;
uniform float shift;
uniform float random;
${i}

vec4 readTex(vec2 c) {
    return texture(src, srcRectUv.xy + fract(c) * srcRectUv.zw);
}

// Per-strip sample offset, in strip-size units, along the division axis.
// Strip n samples toward the center strip by n * shift, so shift = 1 makes
// every strip show the center strip. random adds a per-strip jitter.
float stripShift(float n) {
    float jitter = (hash11(n) * 2.0 - 1.0) * random;
    return n * shift + jitter;
}

void main(void) {
    // Division axis in element-pixel space; strips stack along it.
    vec2 dir = vec2(cos(radians(angle)), sin(radians(angle)));
    float t = dot((uvContent - center) * resolution, dir);
    float n = floor(t / size + 0.5);

    vec2 uv = uvContent - stripShift(n) * size * dir / resolution;
    outColor = readTex(uv);
}
`,ce={shift:.5,random:0,centerX:.5,centerY:.5,size:100,angle:0},le=class{constructor(e={}){this.params={...ce,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.element;e.draw({frag:se,uniforms:{src:e.src,center:[t.centerX,t.centerY],resolution:[n||1,r||1],angle:t.angle,size:Math.max(1,t.size),shift:t.shift,random:Math.min(1,Math.max(0,t.random))},target:e.target})}},ue=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 resolution;
uniform int shape;
uniform vec2 cellPx;
uniform float gap;
uniform float colorTrim;
uniform float averageColor;
uniform float dissolve;
uniform float falloff;
uniform float knockout;

vec4 sampleSrc(vec2 uv) {
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
    return texture(src, srcRectUv.xy + uv * srcRectUv.zw);
}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Distance to a pointy-top hexagon's edge.
float hexDist(vec2 p) {
    p = abs(p);
    return max(dot(p, vec2(0.5, 0.866025)), p.x);
}

// Nearest hexagon in a pointy-top honeycomb: local position (xy) and cell
// center (zw), in grid units.
vec4 hexCoords(vec2 g) {
    vec2 r = vec2(1.0, 1.7320508);
    vec2 h = r * 0.5;
    vec2 a = mod(g, r) - h;
    vec2 b = mod(g - h, r) - h;
    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    return vec4(gv, g - gv);
}

void main(void) {
    vec2 px = uvContent * resolution;
    vec2 g = px / cellPx; // grid units (1 = one cell)
    float gapHalf = gap * 0.5;

    // Per shape: the cell center (grid units) and the coverage mask.
    vec2 centerCell;
    float mask;
    if (shape == 0 || shape == 1) {
        // Rectangle / ellipse on a square grid.
        vec2 id = floor(g);
        centerCell = id + 0.5;
        vec2 lc = g - centerCell;
        float th = 0.5 - gapHalf;
        mask = shape == 0
            ? (max(abs(lc.x), abs(lc.y)) < th ? 1.0 : 0.0)
            : (length(lc) < th ? 1.0 : 0.0);
    } else if (shape == 2) {
        // Pointy-top honeycomb; Voronoi boundary sits at 0.5 for this lattice.
        vec4 hc = hexCoords(g);
        centerCell = hc.zw;
        mask = hexDist(hc.xy) < 0.5 * (1.0 - gap) ? 1.0 : 0.0;
    } else {
        // Right triangles: each square cell is split by a diagonal whose
        // direction flips per cell, tiling the plane with 45° triangles.
        vec2 id = floor(g);
        vec2 lc = g - (id + 0.5);
        float diag = mod(id.x + id.y, 2.0);
        float s = diag < 0.5 ? (lc.x + lc.y) : (lc.x - lc.y);
        float tri = step(0.0, s);
        // Centroid of the selected triangle, for a distinct per-cell color.
        vec2 cen = diag < 0.5
            ? (tri > 0.5 ? vec2(1.0) : vec2(-1.0)) / 6.0
            : (tri > 0.5 ? vec2(1.0, -1.0) : vec2(-1.0, 1.0)) / 6.0;
        centerCell = id + 0.5 + cen;
        float dEdge = 0.5 - max(abs(lc.x), abs(lc.y));
        float dDiag = abs(s) / 1.4142136;
        mask = min(dEdge, dDiag) > gapHalf ? 1.0 : 0.0;
    }

    vec2 centerUv = centerCell * cellPx / resolution;
    vec4 centerCol = sampleSrc(centerUv);

    // Average color: blend the center tap with a 3x3 in-cell average.
    vec4 avg = vec4(0.0);
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 o = vec2(x, y) * cellPx * 0.3 / resolution;
            avg += sampleSrc(centerUv + o);
        }
    }
    avg /= 9.0;
    vec4 col = mix(centerCol, avg, averageColor);

    // Color trim: posterize to fewer levels (more trim = fewer colors).
    float steps = max(1.0, 256.0 / exp2(colorTrim));
    col.rgb = floor(col.rgb * steps) / steps;

    // Dissolve: drop cells by hash, with falloff biasing toward the top.
    float bias = mix(1.0, smoothstep(0.0, 1.0, centerUv.y), falloff);
    if (hash12(centerCell) < dissolve * bias) {
        mask = 0.0;
    }

    if (mask > 0.5) {
        outColor = col;
    } else {
        // Outside the shape / dropped: punch transparency, or fall back
        // to the untouched source when knockout is off.
        outColor = knockout > 0.5 ? vec4(0.0) : sampleSrc(uvContent);
    }
}
`,de={rectangle:0,ellipse:1,hexagon:2,triangle:3},fe={shape:`rectangle`,size:10,stretch:1,gap:0,colorTrim:2,averageColor:.8,dissolve:0,falloff:0,knockout:!0},pe=class{constructor(e={}){this.params={...fe,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params,[n,r]=e.dims.elementPixel,i=Math.max(1,t.size);e.draw({frag:ue,uniforms:{src:e.src,resolution:[Math.max(1,n),Math.max(1,r)],shape:de[t.shape]??0,cellPx:[i*Math.max(.1,t.stretch),i],gap:Math.min(1,Math.max(0,t.gap)),colorTrim:Math.max(0,t.colorTrim),averageColor:Math.min(1,Math.max(0,t.averageColor)),dissolve:Math.min(1,Math.max(0,t.dissolve)),falloff:Math.min(1,Math.max(0,t.falloff)),knockout:+!!t.knockout},target:e.target})}},me=`#version 300 es
precision highp float;
#define TAU 6.28318530718
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 center;
uniform vec2 resolution;
uniform int mode;
uniform float amp;
uniform float freq;
uniform float time;
${i}

vec4 readTex(vec2 c) {
    c = clamp(c, 0.0, 1.0);
    return texture(src, srcRectUv.xy + c * srcRectUv.zw);
}

void main(void) {
    vec2 uv = uvContent;
    vec2 p = uv - center;
    float r = length(p);

    if (mode == 0) {
        // Sine wave: ripples per axis, centered so both diagonals stay straight.
        uv.x -= sin(p.y * freq * TAU + time) * amp * 0.05;
        uv.y -= sin(p.x * freq * TAU + time) * amp * 0.05;
    } else if (mode == 1) {
        // Twist: swirl that rotates most at the center and unwinds to the edge.
        // aspect scale keeps the field circular and contained in the element.
        vec2 s = resolution / max(resolution.x, resolution.y);
        vec2 tp = (uv - center) * 2.0 * s;
        float t = length(tp) / 1.41421356;
        tp = rot2d(amp * freq * (1.0 - t)) * tp;
        uv = tp / s * 0.5 + center;
    } else if (mode == 2) {
        // Ripple: scale the radius by a cosine of the distance from center.
        p *= 1.0 - cos((r-.5) * freq * 10.0 + time) * amp * 0.2;
        uv = p + center;
    }

    outColor = readTex(uv);
}
`,y={"sine wave":0,twist:1,ripple:2},b={type:`twist`,amplitude:3,frequency:1,centerX:.5,centerY:.5,speed:0},x=class{constructor(e={}){this.params={...b,...e}}setParams(e){Object.assign(this.params,e)}render(e){let t=this.params;e.draw({frag:me,uniforms:{src:e.src,center:[t.centerX,t.centerY],resolution:[e.dims.element[0]||1,e.dims.element[1]||1],mode:y[t.type]??0,amp:t.amplitude,freq:t.frequency,time:e.time*t.speed},target:e.target})}},S={Sculpt:{type:`image`,src:new URL(new URL(`sculpt2-BWfwxzXf.webp`,import.meta.url).href,``+import.meta.url).href},Tower:{type:`image`,src:new URL(new URL(`tower1-KQap6JXX.webp`,import.meta.url).href,``+import.meta.url).href},City:{type:`image`,src:new URL(new URL(`city1-Coz3EpIx.webp`,import.meta.url).href,``+import.meta.url).href},Octopus:{type:`image`,src:new URL(new URL(`octo-DE7N0SjU.webp`,import.meta.url).href,``+import.meta.url).href},Debug:{type:`image`,src:new URL(new URL(`debug-DhH--t9A.png`,import.meta.url).href,``+import.meta.url).href},"jellyfish (video)":{type:`video`,src:new URL(new URL(`jellyfish-1dlHXQ9J.mp4`,import.meta.url).href,``+import.meta.url).href},Text:{type:`text`,html:`<h1>Effects on Text</h1>
<p>VFX-JS applies WebGL shaders straight to live HTML — text included.</p>`},Webcam:{type:`webcam`}},C=(e,t,n)=>({min:e,max:t,step:n}),w={Warp:{make:()=>new x,controls:{type:{options:[`sine wave`,`twist`,`ripple`]},amplitude:C(-20,20,.1),frequency:C(.1,10,.1),centerX:C(0,1,.01),centerY:C(0,1,.01),speed:C(0,5,.05)}},"Slice shift":{make:()=>new le,controls:{shift:C(-2,2,.01),random:C(0,1,.01),centerX:C(0,1,.01),centerY:C(0,1,.01),size:C(4,400,1),angle:C(-180,180,1)}},"Pixel stretch":{make:()=>new oe,controls:{offset:C(-1,1,.01),reach:C(0,1,.01),smoothness:C(0,1,.01),centerX:C(0,1,.01),centerY:C(0,1,.01),angle:C(-180,180,1)}},"Pattern refraction":{make:()=>new _,controls:{pattern:{options:[`lenticular`,`waves`,`circular`]},strength:C(0,2,.01),smoothness:C(0,1,.01),frost:C(0,2,.01),dispersion:C(0,1,.01),edgeWrap:{options:[`zero`,`clamp`,`repeat`,`mirror`]},centerX:C(0,1,.01),centerY:C(0,1,.01),stripWidth:C(.02,1,.01),angle:C(-180,180,1)}},Pixelate:{make:()=>new pe,controls:{shape:{options:[`rectangle`,`ellipse`,`hexagon`,`triangle`]},size:C(2,80,1),stretch:C(.2,4,.1),gap:C(0,1,.01),colorTrim:C(0,8,1),averageColor:C(0,1,.01),dissolve:C(0,1,.01),falloff:C(0,1,.01),knockout:{}}},Dither:{make:()=>new re,controls:{style:{options:[`bayer2`,`bayer4`,`bayer8`,`bayer16`,`blueNoise`,`threshold`]},size:C(1,16,1),levels:C(2,16,1),brightness:C(0,2,.01),contrast:C(0,4,.05),mono:{},monoColor:{color:!0}}},Halftone:{make:()=>new t,controls:{gridSize:C(2,80,1),dotSize:C(0,2,.05),smoothing:C(0,1,.01),angle:C(-180,180,1),mode:{options:[`rgb`,`cmyk`]},blackAmount:C(0,1,.01),trimEdge:{}}},"Colored edges":{make:()=>new s,controls:{threshold:C(0,1,.01),thickness:C(.5,10,.5),intensity:C(0,20,.1),opacity:C(0,1,.01),color1:{color:!0},color2:{color:!0},background:{color:!0}}},"Gradient map":{make:()=>new f,colorStops:3,controls:{scatter:C(0,1,.01),offset:C(0,1,.01),repeat:{options:[`none`,`repeat`,`mirror`]},frequency:C(1,8,1),mixSpace:{options:[`srgb`,`linear`,`oklab`]},speed:C(-1,1,.01)}}},T=new e;function E(e){let t={};for(let n of e)t[n]=n;return t}var D=e=>e.replace(/\b\w/g,e=>e.toUpperCase()),O=[{name:`Pixel Stretch + Gradient Map + Dither`,source:`Sculpt`,effects:[`Pixel stretch`,{key:`Gradient map`,params:{frequency:2,speed:.12}},{key:`Dither`,params:{contrast:1.5}}]},{name:`Pattern Refraction`,source:`Tower`,effects:[{key:`Pattern refraction`,params:{pattern:`lenticular`,angle:30,strength:1.5,dispersion:.3,stripWidth:.1}}]},{name:`Pixel Stretch`,source:`City`,effects:[{key:`Pixel stretch`,params:{reach:1,angle:0}}]},{name:`Gradient Map + Halftone on Video`,source:`jellyfish (video)`,effects:[{key:`Gradient map`,params:{colors:[`#ff5500`,`#33ddff`,`#000000`]}},{key:`Halftone`,params:{smoothing:0,mode:`cmyk`,blackAmount:0}}]},{name:`Warp + Pixelate on Text`,source:`Text`,effects:[{key:`Warp`,params:{type:`ripple`,amplitude:.5,speed:2.5}},{key:`Pixelate`,params:{shape:`hexagon`,size:8}}]},{name:`Dither on WebCam`,source:`Webcam`,effects:[{key:`Dither`,params:{size:5,contrast:1.5}}]}],k=class{constructor(e,t){this.index=t,this.source=e.source,this.items=Object.keys(w).map((e,t)=>({key:e,uid:t+1,active:!1,effect:null})),this.applyPreset(e.effects),this.root=document.createElement(`div`),this.root.className=`frame-cell`,this.root.dataset.source=e.source;let n=document.createElement(`div`);n.className=`frame-name`,n.textContent=e.name;let r=document.createElement(`div`);r.className=`frame`,this.img=document.createElement(`img`),this.img.alt=`effect target`,this.video=document.createElement(`video`),this.video.muted=!0,this.video.loop=!0,this.video.playsInline=!0,this.video.hidden=!0,this.text=document.createElement(`div`),this.text.className=`frame-text`,this.text.hidden=!0,this.webcam=document.createElement(`div`),this.webcam.className=`frame-webcam`,this.webcam.hidden=!0;let i=document.createElement(`button`);i.className=`frame-webcam-btn`,i.textContent=`Start WebCam`,i.addEventListener(`click`,e=>{e.stopPropagation(),this.startWebcam()}),this.webcam.appendChild(i),r.append(this.img,this.video,this.text,this.webcam),this.root.append(n,r),this.root.addEventListener(`click`,()=>K(this.index,!0)),this.activeEl=this.img,this.addedEl=null,this.webcamStream=null,this.mountChain=Promise.resolve()}applyPreset(e){let t=e.map(e=>typeof e==`string`?{key:e}:e),n=t.map(e=>e.key),r=[...n,...this.items.map(e=>e.key).filter(e=>!n.includes(e))];this.items.sort((e,t)=>r.indexOf(e.key)-r.indexOf(t.key));for(let e of t){let t=this.items.find(t=>t.key===e.key);t&&(t.active=!0,t.effect=w[e.key].make(),e.params&&Object.assign(t.effect.params,e.params))}}activeItems(){return this.items.filter(e=>e.active)}stopWebcam(){if(this.webcamStream){for(let e of this.webcamStream.getTracks())e.stop();this.webcamStream=null}}loadImage(e){return this.stopWebcam(),this.video.hidden=!0,this.video.removeAttribute(`src`),this.text.hidden=!0,this.webcam.hidden=!0,this.img.hidden=!1,this.activeEl=this.img,new Promise(t=>{this.img.onload=()=>t(),this.img.src=e})}loadText(e){return this.stopWebcam(),this.img.hidden=!0,this.video.hidden=!0,this.video.removeAttribute(`src`),this.webcam.hidden=!0,this.text.innerHTML=e,this.text.hidden=!1,this.activeEl=this.text,Promise.resolve()}showWebcam(){return this.stopWebcam(),this.img.hidden=!0,this.video.hidden=!0,this.text.hidden=!0,this.webcam.hidden=!1,this.activeEl=null,Promise.resolve()}async startWebcam(){try{let e=await navigator.mediaDevices.getUserMedia({video:!0});this.webcamStream=e,await this.loadVideo(e,!0),await this.mount()}catch(e){console.error(`Webcam failed:`,e)}}async loadVideo(e,t){this.img.hidden=!0,this.text.hidden=!0,this.webcam.hidden=!0,this.video.hidden=!1,this.activeEl=this.video,t?(this.video.srcObject=e,this.video.removeAttribute(`src`)):(this.stopWebcam(),this.video.srcObject=null,this.video.src=e),await new Promise(e=>{this.video.onloadeddata=()=>e(),this.video.load()}),await this.video.play().catch(()=>{})}async loadSource(e){let t=S[e];t&&(this.source=e,t.type===`image`?await this.loadImage(t.src):t.type===`text`?await this.loadText(t.html):t.type===`video`?await this.loadVideo(t.src,!1):t.type===`webcam`&&await this.showWebcam())}mount(){return this.mountChain=this.mountChain.then(()=>this.doMount()),this.mountChain}async doMount(){this.addedEl&&=(T.remove(this.addedEl),null);let e=this.activeItems();e.length>0&&this.activeEl&&(await T.add(this.activeEl,{effect:e.map(e=>e.effect)}),this.addedEl=this.activeEl)}};function A(e,t,n,r){r.options?e.addBinding(t,n,{options:E(r.options)}):typeof r.min==`number`?e.addBinding(t,n,r):r.color?e.addBinding(t,n,{picker:`inline`}):e.addBinding(t,n)}function j(){U?.dispose(),U=new n({container:document.getElementById(`pane`),title:`Frame ${H+1}`});let e=W(),t={Source:e.source};U.addBinding(t,`Source`,{options:E(Object.keys(S))}).on(`change`,async t=>{try{await e.loadSource(t.value)}catch(e){console.error(`Failed to load source:`,e)}await e.mount()}),U.addButton({title:`Upload image…`}).on(`click`,()=>Q.click()),U.addBlade({view:`separator`}),e.activeItems().forEach((e,t)=>{let n=w[e.key],r=U.addFolder({title:`${t+1} · ${e.key}`,expanded:!0});n.colorStops&&he(r,e.effect,n.colorStops);for(let[t,i]of Object.entries(n.controls))A(r,e.effect.params,t,i)}),U.on(`change`,z)}function M(e){return Array.isArray(e)?`[${e.map(M).join(`, `)}]`:JSON.stringify(e)}function N(e){let t=e.params,n=new e.constructor().params,r={};for(let e of Object.keys(t))JSON.stringify(t[e])!==JSON.stringify(n[e])&&(r[e]=t[e]);return r}function P(){let e=W().activeItems();if(e.length===0)return`// Enable an effect to generate code.`;let t=[...new Set(e.map(e=>e.effect.constructor.name))],n=e.map(e=>{let t=e.effect.constructor.name,n=N(e.effect),r=Object.keys(n);return r.length===0?`    new ${t}(),`:`    new ${t}({ ${r.map(e=>`${e}: ${M(n[e])}`).join(`, `)} }),`});return[`import { VFX } from "@vfx-js/core";`,`import { ${t.join(`, `)} } from "@vfx-js/effects";`,``,`const vfx = new VFX();`,`vfx.add(element, {`,`  effect: [`,...n,`  ],`,`});`].join(`
`)}function F(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`)}var I=/(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|\b(import|from|const|new)\b|\b(\d+(?:\.\d+)?)\b|([A-Z][A-Za-z0-9]*)|([A-Za-z_]\w*)(?=\s*:)/g;function L(e){return F(e).replace(I,(e,t,n,r,i,a,o)=>t?`<span class="t-com">${t}</span>`:n?`<span class="t-str">${n}</span>`:r?`<span class="t-kw">${r}</span>`:i?`<span class="t-num">${i}</span>`:a?`<span class="t-cls">${a}</span>`:o?`<span class="t-prop">${o}</span>`:e)}var R=``;function z(){R=P(),document.getElementById(`snippet`).innerHTML=L(R)}function he(e,t,n){let r={};for(let e=0;e<n;e++)r[`stop${e}`]=t.params.colors[e]??`#ffffff`;let i=()=>{t.params.colors=Array.from({length:n},(e,t)=>r[`stop${t}`])};for(let t=0;t<n;t++)e.addBinding(r,`stop${t}`,{label:`color ${t+1}`,picker:`inline`}).on(`change`,i)}var B=null;function ge(){q.innerHTML=``;for(let e of W().items){let t=document.createElement(`div`);t.className=`side-btn`+(e.active?` active`:``),t.draggable=!0,t.innerHTML=`<span class="grip">⠿</span><span class="label">${D(e.key)}</span><span class="mark">${e.active?`✓`:`+`}</span>`,t.addEventListener(`click`,()=>_e(e.uid)),t.addEventListener(`dragstart`,n=>{B=e.uid,n.dataTransfer.effectAllowed=`move`,t.classList.add(`dragging`)}),t.addEventListener(`dragend`,()=>t.classList.remove(`dragging`)),t.addEventListener(`dragover`,e=>{e.preventDefault();let n=t.getBoundingClientRect(),r=e.clientY-n.top>n.height/2;t.classList.toggle(`drop-after`,r),t.classList.toggle(`drop-before`,!r)}),t.addEventListener(`dragleave`,()=>t.classList.remove(`drop-before`,`drop-after`)),t.addEventListener(`drop`,n=>{n.preventDefault(),n.stopPropagation();let r=t.getBoundingClientRect(),i=n.clientY-r.top>r.height/2;t.classList.remove(`drop-before`,`drop-after`),ve(B,e.uid,i)}),q.appendChild(t)}}function _e(e){let t=W().items.find(t=>t.uid===e);t&&(t.active=!t.active,t.active&&!t.effect&&(t.effect=w[t.key].make()),W().mount(),G())}function ve(e,t,n){if(e==null||e===t)return;let r=W().items,i=r.findIndex(t=>t.uid===e);if(i<0)return;let[a]=r.splice(i,1),o=r.findIndex(e=>e.uid===t);n&&(o+=1),r.splice(o,0,a),W().mount(),G()}function ye(e){if(e==null)return;let t=W().items,n=t.findIndex(t=>t.uid===e);if(n<0||n===t.length-1)return;let[r]=t.splice(n,1);t.push(r),W().mount(),G()}var V=[],H=0,U=null,W=()=>V[H];function G(){ge(),j(),z()}function K(e,t){if(e<0||e>=V.length)return;let n=e!==H;H=e,V.forEach((e,t)=>e.root.classList.toggle(`selected`,t===H)),t&&W().root.scrollIntoView({behavior:`smooth`,inline:`center`,block:`nearest`}),n&&G()}var q=document.getElementById(`effect-list`),J=document.getElementById(`stage`),Y=0;J.addEventListener(`scroll`,()=>{Y||=requestAnimationFrame(()=>{Y=0;let e=J.scrollLeft+J.clientWidth/2,t=0,n=1/0;V.forEach((r,i)=>{let a=r.root.offsetLeft+r.root.offsetWidth/2,o=Math.abs(a-e);o<n&&(n=o,t=i)}),t!==H&&K(t,!1)})});var X={effects:`sheet-effects`,controls:`sheet-controls`,code:`sheet-code`};function be(e){let t=X[e],n=document.body.classList.contains(t);document.body.classList.remove(...Object.values(X)),!n&&t&&document.body.classList.add(t)}document.getElementById(`mobile-tabs`).addEventListener(`click`,e=>{let t=e.target.closest(`button[data-sheet]`);t&&be(t.dataset.sheet)}),J.addEventListener(`pointerdown`,()=>document.body.classList.remove(...Object.values(X)));var Z=document.getElementById(`sidebar`);Z.addEventListener(`dragover`,e=>{e.preventDefault(),!e.target.closest(`.side-btn`)&&q.lastElementChild?.classList.add(`drop-after`)}),Z.addEventListener(`dragleave`,e=>{e.target.closest(`.side-btn`)||q.lastElementChild?.classList.remove(`drop-after`)}),Z.addEventListener(`drop`,e=>{e.preventDefault(),q.lastElementChild?.classList.remove(`drop-after`),ye(B)});var Q=document.createElement(`input`);Q.type=`file`,Q.accept=`image/*`,Q.style.display=`none`,document.body.appendChild(Q),Q.addEventListener(`change`,async()=>{let e=Q.files?.[0];e&&(await W().loadImage(URL.createObjectURL(e)),await W().mount())});var $=document.getElementById(`copy-btn`);$.addEventListener(`click`,async()=>{await navigator.clipboard.writeText(R),$.textContent=`Copied`,setTimeout(()=>$.textContent=`Copy`,1200)}),V=O.map((e,t)=>new k(e,t));for(let e of V)J.appendChild(e.root);await Promise.all(V.map(e=>e.loadSource(e.source).catch(t=>console.error(`Failed to load source "${e.source}":`,t)))),await Promise.all(V.map(e=>e.mount())),V[0].root.classList.add(`selected`),G(),document.getElementById(`loader`).classList.add(`done`);
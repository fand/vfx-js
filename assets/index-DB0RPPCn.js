import{r as e,t}from"./chunk-t0nojR_f.js";import"./modulepreload-polyfill-BxR_cmXS.js";var n=`
precision highp float;
in vec3 position;
void main() {
    gl_Position = vec4(position, 1.0);
}
`,r=`
precision highp float;
attribute vec3 position;
void main() {
    gl_Position = vec4(position, 1.0);
}
`,i=`
precision highp float;
uniform vec2 offset;
uniform vec2 resolution;
uniform sampler2D src;
out vec4 outColor;
void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) {
        discard;
    }
    outColor = texture(src, uv);
}
`,a=`precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform bool autoCrop;
uniform sampler2D src;
out vec4 outColor;
`,o=`vec4 readTex(sampler2D tex, vec2 uv) {
    if (autoCrop && (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.)) {
        return vec4(0);
    }
    return texture(tex, uv);
}`,s={none:i,uvGradient:`
    ${a}
    ${o}

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        outColor = vec4(uv, sin(time) * .5 + .5, 1);

        vec4 img = readTex(src, uv);
        outColor *= smoothstep(0., 1., img.a);
    }
    `,rainbow:`
    ${a}
    ${o}

    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }

    vec3 hueShift(vec3 rgb, float t) {
        vec3 hsv = rgb2hsv(rgb);
        hsv.x = fract(hsv.x + t);
        return hsv2rgb(hsv);
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec2 uv2 = uv;
        uv2.x *= resolution.x / resolution.y;

        float x = (uv2.x - uv2.y) - fract(time);

        vec4 img = readTex(src, uv);
        float gray = length(img.rgb);

        img.rgb = vec3(hueShift(vec3(1,0,0), x) * gray);

        outColor = img;
    }
    `,glitch:`
    ${a}
    ${o}

    float nn(float y, float t) {
        float n = (
            sin(y * .07 + t * 8. + sin(y * .5 + t * 10.)) +
            sin(y * .7 + t * 2. + sin(y * .3 + t * 8.)) * .7 +
            sin(y * 1.1 + t * 2.8) * .4
        );

        n += sin(y * 124. + t * 100.7) * sin(y * 877. - t * 38.8) * .3;

        return n;
    }

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 color = readTex(src, uv);

        float t = mod(time, 3.14 * 10.);

        // Seed value
        float v = fract(sin(t * 2.) * 700.);

        if (abs(nn(uv.y, t)) < 1.2) {
            v *= 0.01;
        }

        // Prepare for chromatic Abbreveation
        vec2 focus = vec2(0.5);
        float d = v * 0.6;
        vec2 ruv = focus + (uv - focus) * (1. - d);
        vec2 guv = focus + (uv - focus) * (1. - 2. * d);
        vec2 buv = focus + (uv - focus) * (1. - 3. * d);

        // Random Glitch
        if (v > 0.1) {
            // Randomize y
            float y = floor(uv.y * 13. * sin(35. * t)) + 1.;
            if (sin(36. * y * v) > 0.9) {
                ruv.x = uv.x + sin(76. * y) * 0.1;
                guv.x = uv.x + sin(34. * y) * 0.1;
                buv.x = uv.x + sin(59. * y) * 0.1;
            }

            // RGB Shift
            v = pow(v * 1.5, 2.) * 0.15;
            color.rgb *= 0.3;
            color.r += readTex(src, vec2(uv.x + sin(t * 123.45) * v, uv.y)).r;
            color.g += readTex(src, vec2(uv.x + sin(t * 157.67) * v, uv.y)).g;
            color.b += readTex(src, vec2(uv.x + sin(t * 143.67) * v, uv.y)).b;
        }

        // Compose Chromatic Abbreveation
        if (abs(nn(uv.y, t)) > 1.1) {
            color.r = color.r * 0.5 + color.r * texture(src, ruv).r;
            color.g = color.g * 0.5 + color.g * texture(src, guv).g;
            color.b = color.b * 0.5 + color.b * texture(src, buv).b;
            color *= 2.;
        }

        outColor = color;
        outColor.a = smoothstep(0.0, 0.8, max(color.r, max(color.g, color.b)));
    }
    `,pixelate:`
    ${a}
    ${o}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        float b = sin(time * 2.) * 32. + 48.;
        uv = floor(uv * b) / b;
        outColor = readTex(src, uv);
    }
    `,rgbGlitch:`
    ${a}
    ${o}

    float random(vec2 st) {
        return fract(sin(dot(st, vec2(948.,824.))) * 30284.);
    }

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec2 uvr = uv, uvg = uv, uvb = uv;

        float tt = mod(time, 17.);

        if (fract(tt * 0.73) > .8 || fract(tt * 0.91) > .8) {
            float t = floor(tt * 11.);

            float n = random(vec2(t, floor(uv.y * 17.7)));
            if (n > .7) {
                uvr.x += random(vec2(t, 1.)) * .1 - 0.05;
                uvg.x += random(vec2(t, 2.)) * .1 - 0.05;
                uvb.x += random(vec2(t, 3.)) * .1 - 0.05;
            }

            float ny = random(vec2(t * 17. + floor(uv * 19.7)));
            if (ny > .7) {
                uvr.x += random(vec2(t, 4.)) * .1 - 0.05;
                uvg.x += random(vec2(t, 5.)) * .1 - 0.05;
                uvb.x += random(vec2(t, 6.)) * .1 - 0.05;
            }
        }

        vec4 cr = readTex(src, uvr);
        vec4 cg = readTex(src, uvg);
        vec4 cb = readTex(src, uvb);

        outColor = vec4(
            cr.r,
            cg.g,
            cb.b,
            step(.1, cr.a + cg.a + cb.a)
        );
    }
    `,rgbShift:`
    ${a}
    ${o}

    float nn(float y, float t) {
        float n = (
            sin(y * .07 + t * 8. + sin(y * .5 + t * 10.)) +
            sin(y * .7 + t * 2. + sin(y * .3 + t * 8.)) * .7 +
            sin(y * 1.1 + t * 2.8) * .4
        );

        n += sin(y * 124. + t * 100.7) * sin(y * 877. - t * 38.8) * .3;

        return n;
    }

    float step2(float t, vec2 uv) {
        return step(t, uv.x) * step(t, uv.y);
    }

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec2 uvr = uv, uvg = uv, uvb = uv;

        float t = mod(time, 30.);

        float amp = 10. / resolution.x;

        if (abs(nn(uv.y, t)) > 1.) {
            uvr.x += nn(uv.y, t) * amp;
            uvg.x += nn(uv.y, t + 10.) * amp;
            uvb.x += nn(uv.y, t + 20.) * amp;
        }

        vec4 cr = readTex(src, uvr);
        vec4 cg = readTex(src, uvg);
        vec4 cb = readTex(src, uvb);

        outColor = vec4(
            cr.r,
            cg.g,
            cb.b,
            smoothstep(.0, 1., cr.a + cg.a + cb.a)
        );
    }
    `,halftone:`
    // Halftone Effect by zoidberg
    // https://www.interactiveshaderformat.com/sketches/234

    ${a}
    ${o}

    // TODO: uniform
    #define gridSize 10.0
    #define dotSize 0.7
    #define smoothing 0.15
    #define speed 1.0

    #define IMG_PIXEL(x, y) readTex(x, (y - offset) / resolution);

    vec4 gridRot = vec4(15.0, 45.0, 75.0, 0.0);

    // during calculation we find the closest dot to a frag, determine its size, and then determine the size of the four dots above/below/right/left of it. this array of offsets move "one left", "one up", "one right", and "one down"...
    vec2 originOffsets[4];

    void main() {
        vec2 fragCoord = gl_FragCoord.xy - offset;

        // a halftone is an overlapping series of grids of dots
        // each grid of dots is rotated by a different amount
        // the size of the dots determines the colors. the shape of the dot should never change (always be a dot with regular edges)
        originOffsets[0] = vec2(-1.0, 0.0);
        originOffsets[1] = vec2(0.0, 1.0);
        originOffsets[2] = vec2(1.0, 0.0);
        originOffsets[3] = vec2(0.0, -1.0);

        vec3 rgbAmounts = vec3(0.0);

        // for each of the channels (i) of RGB...
        for (float i=0.0; i<3.0; ++i) {
            // figure out the rotation of the grid in radians
            float rotRad = radians(gridRot[int(i)]);

            // the grids are rotated counter-clockwise- to find the nearest dot, take the fragment pixel loc,
            // rotate it clockwise, and split by the grid to find the center of the dot. then rotate this
            // coord counter-clockwise to yield the location of the center of the dot in pixel coords local to the render space
            mat2 ccTrans = mat2(vec2(cos(rotRad), sin(rotRad)), vec2(-1.0*sin(rotRad), cos(rotRad)));
            mat2 cTrans = mat2(vec2(cos(rotRad), -1.0*sin(rotRad)), vec2(sin(rotRad), cos(rotRad)));

            // find the location of the frag in the grid (prior to rotating it)
            vec2 gridFragLoc = cTrans * fragCoord.xy;

            // find the center of the dot closest to the frag- there's no "round" in GLSL 1.2, so do a "floor" to find the dot to the bottom-left of the frag, then figure out if the frag would be in the top and right halves of that square to find the closest dot to the frag
            vec2 gridOriginLoc = vec2(floor(gridFragLoc.x/gridSize), floor(gridFragLoc.y/gridSize));

            vec2 tmpGridCoords = gridFragLoc/vec2(gridSize);
            bool fragAtTopOfGrid = ((tmpGridCoords.y-floor(tmpGridCoords.y)) > (gridSize/2.0)) ? true : false;
            bool fragAtRightOfGrid = ((tmpGridCoords.x-floor(tmpGridCoords.x)) > (gridSize/2.0)) ? true : false;
            if (fragAtTopOfGrid)
                gridOriginLoc.y = gridOriginLoc.y + 1.0;
            if (fragAtRightOfGrid)
                gridOriginLoc.x = gridOriginLoc.x + 1.0;

            // ...at this point, "gridOriginLoc" contains the grid coords of the nearest dot to the fragment being rendered
            // convert the location of the center of the dot from grid coords to pixel coords
            vec2 gridDotLoc = vec2(gridOriginLoc.x*gridSize, gridOriginLoc.y*gridSize) + vec2(gridSize/2.0);

            // rotate the pixel coords of the center of the dot so they become relative to the rendering space
            vec2 renderDotLoc = ccTrans * gridDotLoc;

            // get the color of the pixel of the input image under this dot (the color will ultimately determine the size of the dot)
            vec4 renderDotImageColorRGB = IMG_PIXEL(src, renderDotLoc + offset);

            // the amount of this channel is taken from the same channel of the color of the pixel of the input image under this halftone dot
            float imageChannelAmount = renderDotImageColorRGB[int(i)];

            // the size of the dot is determined by the value of the channel
            float dotRadius = imageChannelAmount * (gridSize * dotSize);
            float fragDistanceToDotCenter = distance(fragCoord.xy, renderDotLoc);
            if (fragDistanceToDotCenter < dotRadius) {
                rgbAmounts[int(i)] += smoothstep(dotRadius, dotRadius-(dotRadius*smoothing), fragDistanceToDotCenter);
            }

            // calcluate the size of the dots abov/below/to the left/right to see if they're overlapping
            for (float j=0.0; j<4.0; ++j) {
                gridDotLoc = vec2((gridOriginLoc.x+originOffsets[int(j)].x)*gridSize, (gridOriginLoc.y+originOffsets[int(j)].y)*gridSize) + vec2(gridSize/2.0);

                renderDotLoc = ccTrans * gridDotLoc;
                renderDotImageColorRGB = IMG_PIXEL(src, renderDotLoc + offset);

                imageChannelAmount = renderDotImageColorRGB[int(i)];
                dotRadius = imageChannelAmount * (gridSize*1.50/2.0);
                fragDistanceToDotCenter = distance(fragCoord.xy, renderDotLoc);
                if (fragDistanceToDotCenter < dotRadius) {
                    rgbAmounts[int(i)] += smoothstep(dotRadius, dotRadius-(dotRadius*smoothing), fragDistanceToDotCenter);
                }
            }
        }

        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 original = readTex(src, uv);
        float alpha = step(.1, rgbAmounts[0] + rgbAmounts[1] + rgbAmounts[2] + original.a);

        outColor = vec4(rgbAmounts[0], rgbAmounts[1], rgbAmounts[2], alpha);
    }
    `,sinewave:`
    ${a}
    ${o}

    vec4 draw(vec2 uv) {
        vec2 uvr = uv, uvg = uv, uvb = uv;

        float amp = 20. / resolution.x;

        uvr.x += sin(uv.y * 7. + time * 3.) * amp;
        uvg.x += sin(uv.y * 7. + time * 3. + .4) * amp;
        uvb.x += sin(uv.y * 7. + time * 3. + .8) * amp;

        vec4 cr = readTex(src, uvr);
        vec4 cg = readTex(src, uvg);
        vec4 cb = readTex(src, uvb);

        return vec4(
            cr.r,
            cg.g,
            cb.b,
            cr.a + cg.a + cb.a
        );
    }

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        // x blur
        vec2 dx = vec2(2, 0) / resolution.x;
        outColor = (draw(uv) * 2. + draw(uv + dx) + draw(uv - dx)) / 4.;
    }
    `,shine:`
    ${a}
    ${o}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        vec2 p = uv * 2. - 1.;
        float a = atan(p.y, p.x);

        vec4 col = readTex(src, uv);
        float gray = length(col.rgb);

        float level = 1. + sin(a * 10. + time * 3.) * 0.2;

        outColor = vec4(1, 1, .5, col.a) * level;
    }
    `,blink:`
    ${a}
    ${o}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        outColor = readTex(src, uv) * (sin(time * 5.) * 0.2 + 0.8);
    }

    `,spring:`
    ${a}
    ${o}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        uv = (uv - .5) * (1.05 + sin(time * 5.) * 0.05) + .5;
        outColor = readTex(src, uv);
    }
    `,duotone:`
    ${a}
    ${o}

    uniform vec4 color1;
    uniform vec4 color2;
    uniform float speed;

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 color = readTex(src, uv);

        float gray = dot(color.rgb, vec3(0.2, 0.7, 0.08));
        float t = mod(gray * 2.0 + time * speed, 2.0);

        if (t < 1.) {
            outColor = mix(color1, color2, fract(t));
        } else {
            outColor = mix(color2, color1, fract(t));
        }

        outColor.a *= color.a;
    }
    `,tritone:`
    ${a}
    ${o}

    uniform vec4 color1;
    uniform vec4 color2;
    uniform vec4 color3;
    uniform float speed;

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 color = readTex(src, uv);

        float gray = dot(color.rgb, vec3(0.2, 0.7, 0.08));
        float t = mod(gray * 3.0 + time * speed, 3.0);

        if (t < 1.) {
            outColor = mix(color1, color2, fract(t));
        } else if (t < 2.) {
            outColor = mix(color2, color3, fract(t));
        } else {
            outColor = mix(color3, color1, fract(t));
        }

        outColor.a *= color.a;
    }
    `,hueShift:`
    ${a}
    ${o}

    uniform float shift;

    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }

    vec3 hueShift(vec3 rgb, float t) {
        vec3 hsv = rgb2hsv(rgb);
        hsv.x = fract(hsv.x + t);
        return hsv2rgb(hsv);
    }

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 color = readTex(src, uv);
        color.rgb = hueShift(color.rgb, shift);
        outColor = color;
    }
    `,warpTransition:`
    ${a}
    uniform float enterTime;
    uniform float leaveTime;

    ${o}

    #define DURATION 1.0

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        float t1 = enterTime / DURATION;
        float t2 = leaveTime / DURATION;
        float t = clamp(min(t1, 1. - t2), 0., 1.);

        if (t == 0.) {
            discard;
        }

        if (t < 1.) {
            uv.x += sin(floor(uv.y * 300.)) * 3. * exp(t * -10.);
        }

        outColor = readTex(src, uv);
    }
    `,slitScanTransition:`
    ${a}
    ${o}

    uniform float enterTime;
    uniform float leaveTime;

    #define DURATION 1.0

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        float t1 = enterTime / DURATION;
        float t2 = leaveTime / DURATION;

        // Do not render before enter or after leave
        if (t1 < 0. || 1. < t2) {
            discard;
        }

        if (0. < t2) {
            // Leaving
            float t = 1. - t2;
            uv.y = uv.y < t ? uv.y : t;
        } else if (t1 < 1.) {
            // Entering
            float t = 1. - t1;
            uv.y = uv.y < t ? t : uv.y;
        }

        outColor = readTex(src, uv);
    }
    `,pixelateTransition:`
    ${a}
    ${o}

    uniform float enterTime;
    uniform float leaveTime;

    #define DURATION 1.0

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        float t1 = enterTime / DURATION;
        float t2 = leaveTime / DURATION;
        float t = clamp(min(t1, 1. - t2), 0., 1.);

        if (t == 0.) {
            discard;
        } else if (t < 1.) {
            float b = floor(t * 64.);
            uv = (floor(uv * b) + .5) / b;
        }

        outColor = readTex(src, uv);
    }
    `,focusTransition:`
    ${a}
    ${o}

    uniform float intersection;

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        float t = smoothstep(0., 1., intersection);

        outColor = mix(
            readTex(src, uv + vec2(1. - t, 0)),
            readTex(src, uv + vec2(-(1. - t), 0)),
            0.5
        ) * intersection;
    }
    `,invert:`
    ${a}
    ${o}

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 color = readTex(src, uv);
        outColor = vec4(1.0 - color.rgb, color.a);
    }
    `,grayscale:`
    ${a}
    ${o}

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 color = readTex(src, uv);
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        outColor = vec4(vec3(gray), color.a);
    }
    `,vignette:`
    ${a}
    ${o}

    uniform float intensity;
    uniform float radius;
    uniform float power;

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        outColor = readTex(src, uv);

        vec2 p = uv * 2.0 - 1.0;
        p.x *= resolution.x / resolution.y;

        float l = max(length(p) - radius, 0.);
        outColor *= 1. - pow(l, power) * intensity;
    }
    `,chromatic:`
    ${a}
    ${o}

    uniform float intensity;
    uniform float radius;
    uniform float power;


    vec4 mirrorTex(sampler2D tex, vec2 uv) {
        vec2 uv2 = 1. - abs(1. - mod(uv, 2.0));
        return texture(tex, uv2);
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        vec2 p = uv * 2.0 - 1.0;
        p.x *= resolution.x / resolution.y;

        float l = max(length(p) - radius, 0.);
        float d = pow(l, power) * (intensity * 0.1);

        vec2 uvR = (uv - .5) / (1.0 + d * 1.) + 0.5;
        vec2 uvG = (uv - .5) / (1.0 + d * 2.) + 0.5;
        vec2 uvB = (uv - .5) / (1.0 + d * 3.) + 0.5;

        vec4 cr = mirrorTex(src, uvR);
        vec4 cg = mirrorTex(src, uvG);
        vec4 cb = mirrorTex(src, uvB);

        outColor = vec4(cr.r, cg.g, cb.b, (cr.a + cg.a + cb.a) / 3.0);
    }
    `};function c(e){return e.currentSrc||e.src}function l(e){let t=c(e);if(!t||t.startsWith(`data:`))return!1;try{return new URL(t,location.href).origin!==location.origin}catch{return!1}}async function u(e){let t=await(await fetch(e)).blob();return URL.createObjectURL(t)}async function d(e){let t=Array.from(e.querySelectorAll(`img`)).filter(e=>e.complete&&e.naturalWidth>0&&l(e));if(t.length===0)return()=>{};let n=new Map,r=[];return await Promise.all(t.map(async e=>{try{let t=c(e),i=await u(t);n.set(e,t),r.push(i),await new Promise(t=>{e.addEventListener(`load`,()=>t(),{once:!0}),e.src=i})}catch{}})),()=>{for(let[e,t]of n)e.src=t;for(let e of r)URL.revokeObjectURL(e)}}var f=[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`],p=[`position`,`top`,`right`,`bottom`,`left`,`float`,`flex`,`flex-grow`,`flex-shrink`,`flex-basis`,`align-self`,`justify-self`,`place-self`,`order`,`grid-column`,`grid-column-start`,`grid-column-end`,`grid-row`,`grid-row-start`,`grid-row-end`,`grid-area`],m=new WeakMap,h=new WeakMap,g=new WeakMap,_=new WeakMap,v=new WeakMap,y=new WeakMap;async function ee(e,t){let n=e.getContext(`2d`);if(!n)throw Error(`Failed to get 2d context from layoutsubtree canvas`);let{onCapture:r,maxSize:i}=t,a=null,o=null,s=new Promise(e=>{o=e});e.onpaint=()=>{let t=e.firstElementChild;if(!t||e.width===0||e.height===0)return;n.clearRect(0,0,e.width,e.height),n.drawElementImage(t,0,0);let s=e.width,c=e.height;if(i&&(s>i||c>i)){let e=Math.min(i/s,i/c);s=Math.floor(s*e),c=Math.floor(c*e)}(!a||a.width!==s||a.height!==c)&&(a=new OffscreenCanvas(s,c));let l=a.getContext(`2d`);if(l){if(l.clearRect(0,0,s,c),l.drawImage(e,0,0,s,c),n.clearRect(0,0,e.width,e.height),o){o(a),o=null;return}r(a)}};let c=new ResizeObserver(t=>{for(let n of t){let t=n.devicePixelContentBoxSize?.[0];if(t)e.width=t.inlineSize,e.height=t.blockSize;else{let t=n.borderBoxSize?.[0];if(t){let n=window.devicePixelRatio;e.width=Math.round(t.inlineSize*n),e.height=Math.round(t.blockSize*n)}}}e.requestPaint()});c.observe(e,{box:`device-pixel-content-box`}),m.set(e,c);let l=e.firstElementChild,u=``;if(l){let t=new ResizeObserver(t=>{let n=t[0].borderBoxSize?.[0];if(!n)return;let r=`${Math.round(n.blockSize)}px`;r!==u&&(u=r,e.style.setProperty(`height`,r))});t.observe(l),h.set(e,t)}return s}function te(e){e.onpaint=null;let t=m.get(e);t&&(t.disconnect(),m.delete(e));let n=h.get(e);n&&(n.disconnect(),h.delete(e))}async function b(e,t){let n=e.getBoundingClientRect(),r=document.createElement(`canvas`);r.setAttribute(`layoutsubtree`,``),r.className=e.className;let i=e.getAttribute(`style`);i&&r.setAttribute(`style`,i),r.style.setProperty(`padding`,`0`),r.style.setProperty(`border`,`none`),r.style.setProperty(`box-sizing`,`content-box`),r.style.setProperty(`background`,`transparent`);let a=getComputedStyle(e),o=a.display===`inline`?`block`:a.display;r.style.setProperty(`display`,o);for(let e of f)r.style.setProperty(e,a.getPropertyValue(e));for(let e of p)r.style.setProperty(e,a.getPropertyValue(e));e.style.width.endsWith(`px`)?r.style.setProperty(`width`,`${n.width}px`):r.style.setProperty(`width`,`100%`),r.style.height||r.style.setProperty(`height`,`${n.height}px`);let s=window.devicePixelRatio;r.width=Math.round(n.width*s),r.height=Math.round(n.height*s),g.set(e,e.style.margin),_.set(e,e.style.width),v.set(e,e.style.boxSizing),e.parentNode?.insertBefore(r,e),r.appendChild(e),e.style.setProperty(`margin`,`0`),e.style.setProperty(`width`,`100%`),e.style.setProperty(`box-sizing`,`border-box`);let c=await d(e);return y.set(r,c),{canvas:r,initialCapture:await ee(r,t)}}function x(e,t){te(e);let n=y.get(e);n&&(n(),y.delete(e)),e.parentNode?.insertBefore(t,e),e.remove();let r=g.get(t);r!==void 0&&(t.style.margin=r,g.delete(t));let i=_.get(t);i!==void 0&&(t.style.width=i,_.delete(t));let a=v.get(t);a!==void 0&&(t.style.boxSizing=a,v.delete(t))}var S;function ne(){if(S!==void 0)return S;try{let e=document.createElement(`canvas`),t=e.getContext(`2d`);S=t!==null&&typeof t.drawElementImage==`function`&&typeof e.requestPaint==`function`}catch{S=!1}return S}function re(e){let t=typeof window<`u`?window.devicePixelRatio:1,n;n=e.scrollPadding===void 0?[.1,.1]:e.scrollPadding===!1?[0,0]:Array.isArray(e.scrollPadding)?[e.scrollPadding[0]??.1,e.scrollPadding[1]??.1]:[e.scrollPadding,e.scrollPadding];let r;return r=e.postEffect===void 0?[]:Array.isArray(e.postEffect)?e.postEffect:[e.postEffect],{pixelRatio:e.pixelRatio??t,zIndex:e.zIndex??void 0,autoplay:e.autoplay??!0,fixedCanvas:e.scrollPadding===!1,scrollPadding:n,wrapper:e.wrapper,postEffects:r,preserveDrawingBuffer:e.preserveDrawingBuffer??!1,timeScale:e.timeScale??1}}var ie=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},ae=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},C,oe,se,ce,le,ue,de,fe,w=class{constructor(e,t,n){C.add(this),this.wrapS=`clamp`,this.wrapT=`clamp`,this.minFilter=`linear`,this.magFilter=`linear`,this.needsUpdate=!0,this.source=null,oe.set(this,void 0),se.set(this,!1),ce.set(this,void 0),le.set(this,void 0),ie(this,oe,e,`f`),this.gl=e.gl;let r=n?.externalHandle;ie(this,le,r!==void 0,`f`),r===void 0?ae(this,C,`m`,ue).call(this):(this.texture=r,ie(this,se,!0,`f`),this.needsUpdate=!1),t&&(this.source=t),ie(this,ce,n?.autoRegister!==!1&&!ae(this,le,`f`),`f`),ae(this,ce,`f`)&&e.addResource(this)}restore(){ae(this,le,`f`)||(ae(this,C,`m`,ue).call(this),ie(this,se,!1,`f`),this.needsUpdate=!0)}bind(e){let t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&=(ae(this,C,`m`,de).call(this),!1)}dispose(){ae(this,ce,`f`)&&ae(this,oe,`f`).removeResource(this),ae(this,le,`f`)||this.gl.deleteTexture(this.texture)}};oe=new WeakMap,se=new WeakMap,ce=new WeakMap,le=new WeakMap,C=new WeakSet,ue=function(){let e=this.gl.createTexture();if(!e)throw Error(`[VFX-JS] Failed to create texture`);this.texture=e},de=function(){let e=this.gl,t=this.source;if(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4),t)try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)}catch(e){console.error(e)}else if(!ae(this,se,`f`)){let t=new Uint8Array([0,0,0,0]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,t)}ae(this,C,`m`,fe).call(this),ie(this,se,!0,`f`)},fe=function(){let e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,pe(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,pe(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,me(e,this.minFilter)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,me(e,this.magFilter))};function pe(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function me(e,t){return t===`nearest`?e.NEAREST:e.LINEAR}function he(e){return new Promise((t,n)=>{let r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>t(r),r.onerror=n,r.src=e})}var ge=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},_e=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ve,ye,be,xe=class{constructor(e,t,n,r={}){ve.add(this),ye.set(this,void 0),ge(this,ye,e,`f`),this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(n)),this.float=r.float??!1,this.mipmap=r.mipmap??!1,this.texture=new w(e,void 0,{autoRegister:!1});let i=r.wrap;i!==void 0&&(typeof i==`string`?(this.texture.wrapS=i,this.texture.wrapT=i):(this.texture.wrapS=i[0],this.texture.wrapT=i[1])),r.filter!==void 0&&(this.texture.minFilter=r.filter,this.texture.magFilter=r.filter),_e(this,ve,`m`,be).call(this),e.addResource(this)}setSize(e,t){let n=Math.max(1,Math.floor(e)),r=Math.max(1,Math.floor(t));n===this.width&&r===this.height||(this.width=n,this.height=r,_e(this,ve,`m`,be).call(this))}restore(){this.texture.restore(),_e(this,ve,`m`,be).call(this)}dispose(){_e(this,ye,`f`).removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.texture.dispose()}generateMipmaps(){if(!this.mipmap)return;let e=this.gl;e.bindTexture(e.TEXTURE_2D,this.texture.texture),e.generateMipmap(e.TEXTURE_2D),e.bindTexture(e.TEXTURE_2D,null)}};ye=new WeakMap,ve=new WeakSet,be=function(){let e=this.gl,t=this.fbo,n=e.createFramebuffer();if(!n)throw Error(`[VFX-JS] Failed to create framebuffer`);this.fbo=n;let r=this.texture.texture;e.bindTexture(e.TEXTURE_2D,r);let i=_e(this,ye,`f`).floatLinearFilter,a=this.float?i?e.RGBA32F:e.RGBA16F:e.RGBA8,o=this.float?i?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;if(this.mipmap){let t=Math.floor(Math.log2(Math.max(this.width,this.height)))+1,n=this.width,r=this.height;for(let i=0;i<t;i++)e.texImage2D(e.TEXTURE_2D,i,a,n,r,0,e.RGBA,o,null),n=Math.max(1,n>>1),r=Math.max(1,r>>1)}else e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,e.RGBA,o,null);let s=this.texture.minFilter===`nearest`?e.NEAREST:e.LINEAR,c=this.texture.magFilter===`nearest`?e.NEAREST:e.LINEAR,l=this.mipmap?this.texture.minFilter===`nearest`?e.NEAREST_MIPMAP_NEAREST:e.LINEAR_MIPMAP_LINEAR:s,u=Se(e,this.texture.wrapS),d=Se(e,this.texture.wrapT);e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,l),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,c),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,u),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,d),e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.texture.needsUpdate=!1,this.texture.source=null,t&&e.deleteFramebuffer(t)};function Se(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function Ce(e,t,n,r){return{x:e.left+n,y:t-r-e.bottom,w:e.right-e.left,h:e.bottom-e.top}}function we(e,t,n,r){return{x:e,y:t,w:n,h:r}}var Te=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},T=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ee,De,Oe,ke,Ae=class{constructor(e,t,n,r,i,a={}){Ee.set(this,void 0),De.set(this,void 0),Oe.set(this,void 0),ke.set(this,void 0),Te(this,Ee,t,`f`),Te(this,De,n,`f`),Te(this,Oe,r,`f`);let o=t*r,s=n*r,c={float:i,wrap:a.wrap,filter:a.filter,mipmap:a.mipmap};Te(this,ke,[new xe(e,o,s,c),new xe(e,o,s,c)],`f`)}get texture(){return T(this,ke,`f`)[0].texture}get target(){return T(this,ke,`f`)[1]}resize(e,t){if(e===T(this,Ee,`f`)&&t===T(this,De,`f`))return;Te(this,Ee,e,`f`),Te(this,De,t,`f`);let n=e*T(this,Oe,`f`),r=t*T(this,Oe,`f`);T(this,ke,`f`)[0].setSize(n,r),T(this,ke,`f`)[1].setSize(n,r)}swap(){Te(this,ke,[T(this,ke,`f`)[1],T(this,ke,`f`)[0]],`f`)}getViewport(){return we(0,0,T(this,Ee,`f`),T(this,De,`f`))}dispose(){T(this,ke,`f`)[0].dispose(),T(this,ke,`f`)[1].dispose()}};Ee=new WeakMap,De=new WeakMap,Oe=new WeakMap,ke=new WeakMap;var je=class{constructor(e=0,t=0){this.x=0,this.y=0,this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}},Me=class{constructor(e=0,t=0,n=0,r=0){this.x=0,this.y=0,this.z=0,this.w=0,this.x=e,this.y=t,this.z=n,this.w=r}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}},Ne=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Pe=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Fe,Ie,Le,Re,ze,Be,Ve;function He(e){return/#version\s+300\s+es\b/.test(e)?`300 es`:/#version\s+100\b/.test(e)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(e)?`100`:`300 es`}var Ue=class{constructor(e,t,n,r){Fe.add(this),Ie.set(this,void 0),Le.set(this,void 0),Re.set(this,void 0),ze.set(this,void 0),Be.set(this,new Map),Ne(this,Ie,e,`f`),this.gl=e.gl,Ne(this,Le,t,`f`),Ne(this,Re,n,`f`),Ne(this,ze,r??He(n),`f`),Pe(this,Fe,`m`,Ve).call(this),e.addResource(this)}restore(){Pe(this,Fe,`m`,Ve).call(this)}use(){this.gl.useProgram(this.program)}hasUniform(e){return Pe(this,Be,`f`).has(e)}uploadUniforms(e){let t=this.gl,n=0;for(let[r,i]of Pe(this,Be,`f`)){let a=e[r];if(!a)continue;let o=a.value;if(o!=null){if(Ke(i.type)){o instanceof w&&(o.bind(n),t.uniform1i(i.location,n),n++);continue}o instanceof w||Je(t,i,o)}}}dispose(){Pe(this,Ie,`f`).removeResource(this),this.gl.deleteProgram(this.program)}};Ie=new WeakMap,Le=new WeakMap,Re=new WeakMap,ze=new WeakMap,Be=new WeakMap,Fe=new WeakSet,Ve=function(){let e=this.gl,t=We(e,e.VERTEX_SHADER,Ge(Pe(this,Le,`f`),Pe(this,ze,`f`))),n=We(e,e.FRAGMENT_SHADER,Ge(Pe(this,Re,`f`),Pe(this,ze,`f`))),r=e.createProgram();if(!r)throw Error(`[VFX-JS] Failed to create program`);if(e.attachShader(r,t),e.attachShader(r,n),e.bindAttribLocation(r,0,`position`),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let i=e.getProgramInfoLog(r)??``;throw e.deleteShader(t),e.deleteShader(n),e.deleteProgram(r),Error(`[VFX-JS] Program link failed: ${i}`)}e.detachShader(r,t),e.detachShader(r,n),e.deleteShader(t),e.deleteShader(n),this.program=r,Pe(this,Be,`f`).clear();let i=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<i;t++){let n=e.getActiveUniform(r,t);if(!n)continue;let i=n.name.replace(/\[0\]$/,``),a=e.getUniformLocation(r,n.name);a&&Pe(this,Be,`f`).set(i,{location:a,type:n.type,size:n.size})}};function We(e,t,n){let r=e.createShader(t);if(!r)throw Error(`[VFX-JS] Failed to create shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)??``;throw e.deleteShader(r),Error(`[VFX-JS] Shader compile failed: ${t}\n\n${n}`)}return r}function Ge(e,t){return e.replace(/^\s+/,``).startsWith(`#version`)||t===`100`?e:`#version 300 es\n${e}`}function Ke(e){return e===35678||e===36298||e===36306||e===35682}var qe=new Set;function Je(e,t,n){let r=t.location,i=t.size>1,a=n,o=n,s=n;switch(t.type){case e.FLOAT:i?e.uniform1fv(r,a):e.uniform1f(r,n);return;case e.FLOAT_VEC2:if(i)e.uniform2fv(r,a);else if(n instanceof je)e.uniform2f(r,n.x,n.y);else{let t=n;e.uniform2f(r,t[0],t[1])}return;case e.FLOAT_VEC3:if(i)e.uniform3fv(r,a);else{let t=n;e.uniform3f(r,t[0],t[1],t[2])}return;case e.FLOAT_VEC4:if(i)e.uniform4fv(r,a);else if(n instanceof Me)e.uniform4f(r,n.x,n.y,n.z,n.w);else{let t=n;e.uniform4f(r,t[0],t[1],t[2],t[3])}return;case e.INT:i?e.uniform1iv(r,o):e.uniform1i(r,n);return;case e.INT_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,t[0],t[1])}return;case e.INT_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,t[0],t[1],t[2])}return;case e.INT_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,t[0],t[1],t[2],t[3])}return;case e.BOOL:i?e.uniform1iv(r,o):e.uniform1i(r,+!!n);return;case e.BOOL_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,+!!t[0],+!!t[1])}return;case e.BOOL_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,+!!t[0],+!!t[1],+!!t[2])}return;case e.BOOL_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,+!!t[0],+!!t[1],+!!t[2],+!!t[3])}return;case e.FLOAT_MAT2:e.uniformMatrix2fv(r,!1,a);return;case e.FLOAT_MAT3:e.uniformMatrix3fv(r,!1,a);return;case e.FLOAT_MAT4:e.uniformMatrix4fv(r,!1,a);return;case e.UNSIGNED_INT:i?e.uniform1uiv(r,s):e.uniform1ui(r,n);return;case e.UNSIGNED_INT_VEC2:if(i)e.uniform2uiv(r,s);else{let t=n;e.uniform2ui(r,t[0],t[1])}return;case e.UNSIGNED_INT_VEC3:if(i)e.uniform3uiv(r,s);else{let t=n;e.uniform3ui(r,t[0],t[1],t[2])}return;case e.UNSIGNED_INT_VEC4:if(i)e.uniform4uiv(r,s);else{let t=n;e.uniform4ui(r,t[0],t[1],t[2],t[3])}return;default:qe.has(t.type)||(qe.add(t.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${t.type.toString(16)}; skipping upload.`));return}}var Ye=class{constructor(e,t,n,r,i,a){this.gl=e.gl,this.program=new Ue(e,t,n,a),this.uniforms=r,this.blend=i}dispose(){this.program.dispose()}};function Xe(e,t,n,r,i,a,o,s){let c=r?r.width/s:a,l=r?r.height/s:o,u=Math.max(0,i.x),d=Math.max(0,i.y),f=Math.min(c,i.x+i.w),p=Math.min(l,i.y+i.h),m=f-u,h=p-d;m<=0||h<=0||(e.bindFramebuffer(e.FRAMEBUFFER,r?r.fbo:null),e.viewport(Math.round(u*s),Math.round(d*s),Math.round(m*s),Math.round(h*s)),Ze(e,n.blend),n.program.use(),n.program.uploadUniforms(n.uniforms),t.draw())}function Ze(e,t){if(t===`none`){e.disable(e.BLEND);return}e.enable(e.BLEND),e.blendEquation(e.FUNC_ADD),t===`premultiplied`?e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA):t===`additive`?e.blendFuncSeparate(e.ONE,e.ONE,e.ONE,e.ONE):e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA)}var Qe=class{constructor(e){this.uniforms={src:{value:null},offset:{value:new je},resolution:{value:new je},viewport:{value:new Me}},this.pass=new Ye(e,n,i,this.uniforms,`premultiplied`)}setUniforms(e,t,n){this.uniforms.src.value=e,this.uniforms.resolution.value.set(n.w*t,n.h*t),this.uniforms.offset.value.set(n.x*t,n.y*t)}dispose(){this.pass.dispose()}},$e=e=>{let t=document.implementation.createHTMLDocument(`test`),n=t.createRange();n.selectNodeContents(t.documentElement),n.deleteContents();let r=document.createElement(`head`);return t.documentElement.appendChild(r),t.documentElement.appendChild(n.createContextualFragment(e)),t.documentElement.setAttribute(`xmlns`,t.documentElement.namespaceURI),new XMLSerializer().serializeToString(t).replace(/<!DOCTYPE html>/,``)};async function et(e,t,n,r){let i=e.getBoundingClientRect(),a=window.devicePixelRatio,o=Math.ceil(i.width),s=Math.ceil(i.height),c=o*a,l=s*a,u=1,d=c,f=l;r&&(d>r||f>r)&&(u=Math.min(r/d,r/f),d=Math.floor(d*u),f=Math.floor(f*u));let p=n&&n.width===d&&n.height===f?n:new OffscreenCanvas(d,f),m=e.cloneNode(!0);await tt(e,m),nt(e,m),m.style.setProperty(`opacity`,t.toString()),m.style.setProperty(`margin`,`0px`),rt(m),m.style.setProperty(`box-sizing`,`border-box`),m.style.setProperty(`width`,`${o}px`),m.style.setProperty(`height`,`${s}px`);let h=m.outerHTML,g=`<svg xmlns="http://www.w3.org/2000/svg" width="${c}" height="${l}"><foreignObject width="100%" height="100%">${$e(h)}</foreignObject></svg>`;return new Promise((e,t)=>{let n=new Image;n.onload=()=>{let r=p.getContext(`2d`);if(r===null)return t();r.clearRect(0,0,d,f);let i=a*u;r.scale(i,i),r.drawImage(n,0,0,c,l),r.setTransform(1,0,0,1,0,0),e(p)},n.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(g)}`})}async function tt(e,t){let n=window.getComputedStyle(e);for(let e of Array.from(n))/(-inline-|-block-|^inline-|^block-)/.test(e)||/^-webkit-.*(start|end|before|after|logical)/.test(e)||t.style.setProperty(e,n.getPropertyValue(e),n.getPropertyPriority(e));if(t.tagName===`INPUT`)t.setAttribute(`value`,t.value);else if(t.tagName===`TEXTAREA`)t.innerHTML=t.value;else if(t.tagName===`IMG`)try{t.src=await it(c(e))}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];await tt(r,i)}}function nt(e,t){if(typeof e.computedStyleMap==`function`)try{let n=e.computedStyleMap();for(let e of[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`]){let r=n.get(e);r instanceof CSSKeywordValue&&r.value===`auto`&&t.style.setProperty(e,`auto`)}}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];r instanceof HTMLElement&&i instanceof HTMLElement&&nt(r,i)}}function rt(e){let t=e;for(;;){let e=t.style;if(Number.parseFloat(e.paddingTop)>0||Number.parseFloat(e.borderTopWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.firstElementChild;if(!n)break;n.style.setProperty(`margin-top`,`0px`),t=n}for(t=e;;){let e=t.style;if(Number.parseFloat(e.paddingBottom)>0||Number.parseFloat(e.borderBottomWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.lastElementChild;if(!n)break;n.style.setProperty(`margin-bottom`,`0px`),t=n}}async function it(e){let t=await fetch(e).then(e=>e.blob());return new Promise(e=>{let n=new FileReader;n.onload=function(){e(this.result)},n.readAsDataURL(t)})}var at=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},E=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ot,st,ct,lt,ut,dt,ft,pt,mt,ht,gt,_t,vt=Object.freeze({__brand:`EffectQuad`});function yt(e){return e===vt}function bt(e,t){switch(t){case`lines`:return e.LINES;case`lineStrip`:return e.LINE_STRIP;case`points`:return e.POINTS;default:return e.TRIANGLES}}function xt(e,t){if(t instanceof Float32Array)return e.FLOAT;if(t instanceof Uint8Array)return e.UNSIGNED_BYTE;if(t instanceof Uint16Array)return e.UNSIGNED_SHORT;if(t instanceof Uint32Array)return e.UNSIGNED_INT;if(t instanceof Int8Array)return e.BYTE;if(t instanceof Int16Array)return e.SHORT;if(t instanceof Int32Array)return e.INT;throw Error(`[VFX-JS] Unsupported attribute typed array`)}function St(e,t){if(ArrayBuffer.isView(t)&&!(t instanceof DataView))return{name:e,data:t,itemSize:2,normalized:!1,perInstance:!1};let n=t;return{name:e,data:n.data,itemSize:n.itemSize,normalized:n.normalized??!1,perInstance:n.perInstance??!1}}var Ct=class{constructor(e,t,n){ot.add(this),st.set(this,void 0),ct.set(this,void 0),lt.set(this,void 0),ut.set(this,[]),dt.set(this,null),this.indexType=0,this.hasIndices=!1,this.drawCount=0,this.drawStart=0,ft.set(this,!1),at(this,st,e,`f`),this.gl=e.gl,at(this,ct,t,`f`),at(this,lt,n,`f`),this.mode=bt(this.gl,t.mode),this.instanceCount=t.instanceCount??0,E(this,ot,`m`,pt).call(this),e.addResource(this),at(this,ft,!0,`f`)}restore(){at(this,ut,[],`f`),at(this,dt,null,`f`),E(this,ot,`m`,pt).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),this.hasIndices?this.instanceCount>0?e.drawElementsInstanced(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2),this.instanceCount):e.drawElements(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2)):this.instanceCount>0?e.drawArraysInstanced(this.mode,this.drawStart,this.drawCount,this.instanceCount):e.drawArrays(this.mode,this.drawStart,this.drawCount)}dispose(){E(this,ft,`f`)&&(E(this,st,`f`).removeResource(this),at(this,ft,!1,`f`));let e=this.gl;e.deleteVertexArray(this.vao);for(let t of E(this,ut,`f`))e.deleteBuffer(t);E(this,dt,`f`)&&e.deleteBuffer(E(this,dt,`f`)),at(this,ut,[],`f`),at(this,dt,null,`f`)}};st=new WeakMap,ct=new WeakMap,lt=new WeakMap,ut=new WeakMap,dt=new WeakMap,ft=new WeakMap,ot=new WeakSet,pt=function(){let e=this.gl,t=e.createVertexArray();if(!t)throw Error(`[VFX-JS] Failed to create VAO`);this.vao=t,e.bindVertexArray(t);let n=E(this,lt,`f`).program,r=null;for(let[t,i]of Object.entries(E(this,ct,`f`).attributes)){let a=St(t,i),o=e.getAttribLocation(n,a.name);if(o<0)continue;let s=e.createBuffer();if(!s)throw Error(`[VFX-JS] Failed to create VBO for "${a.name}"`);E(this,ut,`f`).push(s),e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,a.data,e.STATIC_DRAW);let c=xt(e,a.data);e.enableVertexAttribArray(o),c===e.FLOAT||c===e.HALF_FLOAT||a.normalized?e.vertexAttribPointer(o,a.itemSize,c,a.normalized,0,0):e.vertexAttribIPointer(o,a.itemSize,c,0,0),a.perInstance&&e.vertexAttribDivisor(o,1),t===`position`&&r===null&&(r=a.data.length/a.itemSize)}let i=0,a=E(this,ct,`f`).indices;if(a){let t=e.createBuffer();if(!t)throw Error(`[VFX-JS] Failed to create IBO`);at(this,dt,t,`f`),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t),e.bufferData(e.ELEMENT_ARRAY_BUFFER,a,e.STATIC_DRAW),this.hasIndices=!0,this.indexType=a instanceof Uint32Array?e.UNSIGNED_INT:e.UNSIGNED_SHORT,i=a.length}else this.hasIndices=!1;e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null),E(this,dt,`f`)&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null);let o=this.hasIndices?i:r??0,s=E(this,ct,`f`).drawRange;this.drawStart=s?.start??0,this.drawCount=s?.count===void 0?Math.max(0,o-this.drawStart):s.count};var wt=class{constructor(e,t){mt.set(this,void 0),ht.set(this,void 0),gt.set(this,new WeakMap),_t.set(this,new Set),at(this,mt,e,`f`),at(this,ht,t,`f`)}get quad(){return E(this,ht,`f`)}resolve(e,t){let n=E(this,gt,`f`).get(e);n||(n=new Map,E(this,gt,`f`).set(e,n));let r=n.get(t);return r||(r=new Ct(E(this,mt,`f`),e,t),n.set(t,r),E(this,_t,`f`).add(r)),r}dispose(){for(let e of E(this,_t,`f`))e.dispose();E(this,_t,`f`).clear()}};mt=new WeakMap,ht=new WeakMap,gt=new WeakMap,_t=new WeakMap;var D=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},O=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Tt,Et,Dt,Ot,kt,At,jt,Mt,Nt,Pt,Ft,It,k,A,Lt,Rt,zt,Bt,Vt,Ht,Ut,Wt,Gt=Symbol.for(`@vfx-js/effect.resolve-texture`),Kt=Symbol.for(`@vfx-js/effect.resolve-rt`);function qt(e){return e[Gt]()}function Jt(e){return e[Kt]}var Yt=`#version 300 es
precision highp float;
in vec3 position;
out vec2 uv;
out vec2 uvContent;
out vec2 uvSrc;
uniform vec4 contentRectUv;
uniform vec4 srcRectUv;
void main() {
    vec2 bufferUV = position.xy * 0.5 + 0.5;
    uv = bufferUV;
    uvContent = (bufferUV - contentRectUv.xy) / contentRectUv.zw;
    uvSrc = srcRectUv.xy + uvContent * srcRectUv.zw;
    gl_Position = vec4(position, 1.0);
}
`,Xt=`
precision highp float;
attribute vec3 position;
varying vec2 uv;
varying vec2 uvContent;
varying vec2 uvSrc;
uniform vec4 contentRectUv;
uniform vec4 srcRectUv;
void main() {
    vec2 bufferUV = position.xy * 0.5 + 0.5;
    uv = bufferUV;
    uvContent = (bufferUV - contentRectUv.xy) / contentRectUv.zw;
    uvSrc = srcRectUv.xy + uvContent * srcRectUv.zw;
    gl_Position = vec4(position, 1.0);
}
`,Zt=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`,Qt=`
precision highp float;
varying vec2 uv;
uniform sampler2D src;
void main() {
    gl_FragColor = texture2D(src, uv);
}
`,$t=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uvSrc);
}
`,en=`
precision highp float;
varying vec2 uvSrc;
uniform sampler2D src;
void main() {
    gl_FragColor = texture2D(src, uvSrc);
}
`,tn=class{constructor(e,t,n,r,i,a){Tt.add(this),Et.set(this,void 0),Dt.set(this,void 0),Ot.set(this,void 0),kt.set(this,void 0),At.set(this,void 0),jt.set(this,[]),Mt.set(this,[]),Nt.set(this,[]),Pt.set(this,[]),Ft.set(this,`init`),It.set(this,!1),k.set(this,void 0),A.set(this,void 0),Bt.set(this,[]),D(this,Et,e,`f`),D(this,Dt,e.gl,`f`),D(this,Ot,n,`f`),D(this,kt,a,`f`),D(this,At,new wt(e,t),`f`),D(this,k,{outputBufferW:1,outputBufferH:1,canvasBufferSize:[1,1],outputViewport:{x:0,y:0,w:1,h:1},elementBufferW:1,elementBufferH:1,contentRectUv:[0,0,1,1],srcRectUv:[0,0,1,1]},`f`);let o={time:0,deltaTime:0,pixelRatio:n,resolution:[1,1],mouse:[0,0],mouseViewport:[0,0],intersection:0,enterTime:0,leaveTime:0,src:r,target:null,uniforms:{},vfxProps:i,dims:{element:[1,1],elementPixel:[1,1],canvas:[1,1],canvasPixel:[1,1],pixelRatio:n,contentRect:[0,0,1,1],srcRect:[0,0,1,1],canvasRect:[0,0,1,1]},quad:vt,gl:O(this,Dt,`f`),createRenderTarget:e=>O(this,Tt,`m`,Lt).call(this,e),wrapTexture:(e,t)=>O(this,Tt,`m`,zt).call(this,e,t),draw:e=>O(this,Tt,`m`,Vt).call(this,e),blit:(e,t,n)=>O(this,Tt,`m`,Ht).call(this,e,t,n),onContextRestored:e=>{let t=O(this,Et,`f`).onContextRestored(e);return O(this,Pt,`f`).push(t),t}};D(this,A,o,`f`)}get ctx(){return O(this,A,`f`)}setPhase(e){D(this,Ft,e,`f`)}setFrameDims(e){D(this,k,e,`f`),O(this,A,`f`).resolution=[e.canvasBufferSize[0],e.canvasBufferSize[1]];for(let t of O(this,Nt,`f`))t.resolver.resize?.(e.outputBufferW,e.outputBufferH)}setEffectDims(e){O(this,A,`f`).dims=e}setFrameState(e){let t=O(this,A,`f`);t.time=e.time,t.deltaTime=e.deltaTime,t.mouse=e.mouse,t.mouseViewport=e.mouseViewport,t.intersection=e.intersection,t.enterTime=e.enterTime,t.leaveTime=e.leaveTime,t.uniforms=e.uniforms}setSrc(e){O(this,A,`f`).src=e}setOutput(e){O(this,A,`f`).target=e}passthroughCopy(e,t,n){let r=O(this,Ft,`f`);D(this,Ft,`render`,`f`);let i=O(this,A,`f`).target;O(this,A,`f`).target=t;try{let r=O(this,k,`f`).outputViewport;O(this,k,`f`).outputViewport={...n};let i=O(this,A,`f`).vfxProps.glslVersion===`100`?Qt:Zt;O(this,Tt,`m`,Ut).call(this,{frag:i,uniforms:{src:e},target:t}),O(this,k,`f`).outputViewport=r}finally{O(this,A,`f`).target=i,D(this,Ft,r,`f`)}}clearRt(e){let t=O(this,Dt,`f`),n=Jt(e);t.bindFramebuffer(t.FRAMEBUFFER,n.getWriteFbo().fbo),t.viewport(0,0,e.width,e.height),t.clearColor(0,0,0,0),t.disable(t.SCISSOR_TEST),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)}tickAutoUpdates(){for(let e of O(this,Bt,`f`))e()}dispose(){D(this,Ft,`disposed`,`f`);for(let e of O(this,Pt,`f`))e();D(this,Pt,[],`f`);for(let e of O(this,Mt,`f`))e.resolver.dispose?.();D(this,Mt,[],`f`),D(this,Nt,[],`f`);for(let e of O(this,jt,`f`))e.dispose();D(this,jt,[],`f`),O(this,At,`f`).dispose(),D(this,Bt,[],`f`)}};Et=new WeakMap,Dt=new WeakMap,Ot=new WeakMap,kt=new WeakMap,At=new WeakMap,jt=new WeakMap,Mt=new WeakMap,Nt=new WeakMap,Pt=new WeakMap,Ft=new WeakMap,It=new WeakMap,k=new WeakMap,A=new WeakMap,Bt=new WeakMap,Tt=new WeakSet,Lt=function(e){let t=e?.persistent??!1,n=e?.float??!1,r=rn(e?.wrap),i=e?.filter,a=e?.mipmap??!1,o=a!==!1,s=a===!0,c=e?.size,l=c?c[0]:O(this,k,`f`).outputBufferW,u=c?c[1]:O(this,k,`f`).outputBufferH,d,f,p;if(t){let e=c?1:O(this,Ot,`f`),t=c?l:l/e,a=c?u:u/e,m=new Ae(O(this,Et,`f`),t,a,e,n,{wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>m.texture,getWriteFbo:()=>m.target,swap:()=>m.swap(),resize:c?void 0:(e,t)=>{m.resize(e/O(this,Ot,`f`),t/O(this,Ot,`f`))},dispose:()=>m.dispose()},o&&(d.regenerateMipmaps=()=>m.target.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>m.target.width,p=()=>m.target.height}else{let e=new xe(O(this,Et,`f`),l,u,{float:n,wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>e.texture,getWriteFbo:()=>e,resize:c?void 0:(t,n)=>e.setSize(t,n),dispose:()=>e.dispose()},o&&(d.regenerateMipmaps=()=>e.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>e.width,p=()=>e.height}let m,h=sn(d,f,p,()=>O(this,Tt,`m`,Rt).call(this,m));return m={handle:h,resolver:d},O(this,Mt,`f`).push(m),c||O(this,Nt,`f`).push(m),h},Rt=function(e){let t=O(this,Mt,`f`).indexOf(e);if(t<0)return;O(this,Mt,`f`).splice(t,1);let n=O(this,Nt,`f`).indexOf(e);n>=0&&O(this,Nt,`f`).splice(n,1),e.resolver.dispose?.()},zt=function(e,t){let n=rn(t?.wrap),r=t?.filter,i,a,o,s=null;if(nn(e)){if(!t?.size)throw Error(`[VFX-JS] wrapTexture(WebGLTexture) requires opts.size`);let[n,r]=t.size;i=new w(O(this,Et,`f`),void 0,{autoRegister:!1,externalHandle:e}),a=()=>n,o=()=>r}else{let n=e;i=new w(O(this,Et,`f`),n);let r=t?.size,c=e=>{if(r)return e===`w`?r[0]:r[1];if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return e===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return e===`w`?n.videoWidth:n.videoHeight;let t=n;return e===`w`?t.width:t.height};a=()=>c(`w`),o=()=>c(`h`);let l=typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement||typeof HTMLCanvasElement<`u`&&n instanceof HTMLCanvasElement||typeof OffscreenCanvas<`u`&&n instanceof OffscreenCanvas;(t?.autoUpdate??l)&&(s=()=>{i.needsUpdate=!0})}i.wrapS=n[0],i.wrapT=n[1],r!==void 0&&(i.minFilter=r,i.magFilter=r),O(this,jt,`f`).push(i),s&&O(this,Bt,`f`).push(s);let c=!1;return on(()=>i,a,o,()=>{if(c)return;c=!0;let e=O(this,jt,`f`).indexOf(i);if(e!==-1&&O(this,jt,`f`).splice(e,1),s){let e=O(this,Bt,`f`).indexOf(s);e!==-1&&O(this,Bt,`f`).splice(e,1)}i.dispose()})},Vt=function(e){if(O(this,Ft,`f`)!==`render`){O(this,Ft,`f`)===`update`&&!O(this,It,`f`)&&(D(this,It,!0,`f`),console.warn(`[VFX-JS] ctx.draw() called in update(); ignored. Move draws to render().`));return}O(this,Tt,`m`,Ut).call(this,e)},Ht=function(e,t,n){if(O(this,Ft,`f`)!==`render`){O(this,Ft,`f`)===`update`&&!O(this,It,`f`)&&(D(this,It,!0,`f`),console.warn(`[VFX-JS] ctx.blit() called in update(); ignored. Move draws to render().`));return}let r=O(this,A,`f`).vfxProps.glslVersion===`100`?en:$t;O(this,Tt,`m`,Ut).call(this,{frag:r,uniforms:{src:e},target:t,blend:n?.blend,swap:n?.swap})},Ut=function(e){let t=O(this,Dt,`f`),n=e.vert??(O(this,A,`f`).vfxProps.glslVersion===`100`?Xt:Yt),r=O(this,kt,`f`).get(n,e.frag,O(this,A,`f`).vfxProps.glslVersion),i=O(this,A,`f`).target,a=e.target===void 0||e.target===null?i:e.target,o=a===null||a===i,s,c,l,u,d,f,p;if(a===null)s=null,c=O(this,k,`f`).outputViewport.x,l=O(this,k,`f`).outputViewport.y,u=O(this,k,`f`).outputViewport.w,d=O(this,k,`f`).outputViewport.h;else{let e=Jt(a);s=e.getWriteFbo().fbo,o?(c=O(this,k,`f`).outputViewport.x,l=O(this,k,`f`).outputViewport.y,u=O(this,k,`f`).outputViewport.w,d=O(this,k,`f`).outputViewport.h):(c=0,l=0,u=a.width,d=a.height),f=e.swap,e.mipmapAutoRegen&&(p=e.regenerateMipmaps)}t.bindFramebuffer(t.FRAMEBUFFER,s),t.viewport(c,l,u,d),t.disable(t.SCISSOR_TEST),Ze(t,e.blend??(a===null?`premultiplied`:`none`)),r.use();let m=O(this,Tt,`m`,Wt).call(this,e.uniforms);r.uploadUniforms(m);let h=e.geometry??vt;yt(h)?O(this,At,`f`).quad.draw():O(this,At,`f`).resolve(h,r).draw(),p?.(),f&&e.swap!==!1&&f()},Wt=function(e){let t={};if(t.contentRectUv={value:O(this,k,`f`).contentRectUv},t.srcRectUv={value:O(this,k,`f`).srcRectUv},!e)return t;for(let[n,r]of Object.entries(e))t[n]=an(r);return t};function nn(e){let t=globalThis.WebGLTexture;if(t&&typeof t==`function`&&e instanceof t)return!0;let n=e;return n.width===void 0&&n.naturalWidth===void 0&&n.videoWidth===void 0}function rn(e){return e===void 0?[`clamp`,`clamp`]:typeof e==`string`?[e,e]:[e[0],e[1]]}function an(e){return typeof e==`object`&&e&&`__brand`in e?e.__brand===`EffectRenderTarget`?{value:Jt(e).getReadTexture()}:{value:qt(e)}:{value:e}}function on(e,t,n,r){let i={__brand:`EffectTexture`,get width(){return t()},get height(){return n()},dispose(){r?.()}};return Object.defineProperty(i,Gt,{value:e}),i}function sn(e,t,n,r){let i={__brand:`EffectRenderTarget`,get width(){return t()},get height(){return n()},dispose:r??(()=>{}),generateMipmaps:()=>e.regenerateMipmaps?.()};return Object.defineProperty(i,Kt,{value:e}),i}function cn(e){return sn({getReadTexture:()=>e.texture,getWriteFbo:()=>e},()=>e.width,()=>e.height)}function ln(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:Array.isArray(e)?{top:e[0],right:e[1],bottom:e[2],left:e[3]}:{top:e.top??0,right:e.right??0,bottom:e.bottom??0,left:e.left??0}}function un(e){return ln(e)}var dn={top:0,right:0,bottom:0,left:0};function fn(e){return ln(e)}function pn(e){return{top:e.top,right:e.right,bottom:e.bottom,left:e.left}}function mn(e){return{top:e.top,left:e.left,right:e.left+Math.ceil(e.right-e.left),bottom:e.top+Math.ceil(e.bottom-e.top)}}function hn(e,t){return{top:e.top-t.top,right:e.right+t.right,bottom:e.bottom+t.bottom,left:e.left-t.left}}function gn(e,t,n){return Math.min(Math.max(e,t),n)}function _n(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return c<=0||l<=0?[0,0,1,1]:[(n-o)/c,(r-s)/l,i/c,a/l]}function vn(e,t){let n=gn(t.left,e.left,e.right),r=(gn(t.right,e.left,e.right)-n)/(t.right-t.left),i=gn(t.top,e.top,e.bottom);return r*((gn(t.bottom,e.top,e.bottom)-i)/(t.bottom-t.top))}var j=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},M=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},N,yn,bn,xn,Sn,Cn,P,F,wn,Tn,En,Dn,On,kn,An,jn,Mn,Nn,Pn,Fn,In,Ln,Rn,zn,Bn,Vn,Hn,Un=class{constructor(e,t,n,r,i,a,o,s){N.add(this),yn.set(this,void 0),bn.set(this,void 0),xn.set(this,void 0),Sn.set(this,void 0),Cn.set(this,void 0),P.set(this,void 0),F.set(this,void 0),wn.set(this,void 0),Tn.set(this,[]),En.set(this,[]),Dn.set(this,void 0),On.set(this,new Set),kn.set(this,!1),An.set(this,void 0),jn.set(this,un(0)),Mn.set(this,null),j(this,yn,e,`f`),j(this,bn,t,`f`),j(this,xn,n,`f`),j(this,Sn,i,`f`),j(this,Cn,s,`f`),j(this,P,r,`f`),j(this,Dn,a,`f`),j(this,An,o,`f`),j(this,F,r.map(()=>M(this,N,`m`,Pn).call(this)),`f`),r.length===0&&j(this,Mn,M(this,N,`m`,Pn).call(this),`f`),j(this,wn,M(this,N,`m`,Nn).call(this),`f`)}get effects(){return M(this,P,`f`)}get hosts(){return M(this,F,`f`)}get renderingIndices(){return M(this,wn,`f`)}get stages(){return M(this,En,`f`)}get hitTestPadBuffer(){return M(this,jn,`f`)}async initAll(){for(let e=0;e<M(this,P,`f`).length;e++){let t=M(this,P,`f`)[e],n=M(this,F,`f`)[e];n.setPhase(`init`);try{t.init&&await t.init(n.ctx)}catch(t){console.error(`[VFX-JS] effect[${e}].init() failed:`,t);for(let t=e-1;t>=0;t--)M(this,N,`m`,Fn).call(this,t),M(this,F,`f`)[t].dispose();throw M(this,F,`f`)[e].dispose(),t}n.setPhase(`update`)}}run(e){if(M(this,kn,`f`)||!e.isVisible)return;j(this,wn,M(this,N,`m`,Nn).call(this),`f`);let t=M(this,wn,`f`).length;for(let t of M(this,F,`f`))t.setFrameState({time:e.time,deltaTime:e.deltaTime,mouse:e.mouse,mouseViewport:e.mouseViewport,intersection:e.intersection,enterTime:e.enterTime,leaveTime:e.leaveTime,uniforms:e.resolvedUniforms});M(this,N,`m`,In).call(this,e);for(let t=0;t<M(this,F,`f`).length;t++)M(this,F,`f`)[t].setFrameDims(M(this,N,`m`,Hn).call(this,t,e)),M(this,F,`f`)[t].setEffectDims(M(this,N,`m`,zn).call(this,t,e));for(let e=0;e<M(this,P,`f`).length;e++){let t=M(this,P,`f`)[e];if(!t.update)continue;let n=M(this,F,`f`)[e];n.setPhase(`update`);try{t.update(n.ctx)}catch(t){let n=`${e}:update`;M(this,On,`f`).has(n)||(M(this,On,`f`).add(n),console.warn(`[VFX-JS] effect[${e}].update() threw; skipping this frame's update:`,t))}}if(t===0){(M(this,Mn,`f`)??M(this,F,`f`)[0]).passthroughCopy(M(this,Dn,`f`),e.finalTarget,e.elementRectOnCanvasPx);return}for(let n=0;n<t;n++){let r=M(this,wn,`f`)[n],i=M(this,F,`f`)[r],a=M(this,P,`f`)[r];if(!a.render)continue;i.setPhase(`render`),i.tickAutoUpdates();let o=n===0?M(this,Dn,`f`):M(this,Tn,`f`)[n-1].texHandle;i.setSrc(o);let s;n===t-1?s=e.finalTarget:(s=M(this,Tn,`f`)[n].rtHandle,i.clearRt(s)),i.setOutput(s);try{a.render(i.ctx)}catch(e){let a=`${r}:render`;M(this,On,`f`).has(a)||(M(this,On,`f`).add(a),console.warn(`[VFX-JS] effect[${r}].render() threw; falling back to passthrough:`,e));let c=M(this,En,`f`)[n].outputViewport;s===null?i.passthroughCopy(o,null,c):n===t-1?i.passthroughCopy(o,s,c):i.passthroughCopy(o,s,{x:0,y:0,w:s.width,h:s.height})}i.setPhase(`update`)}}dispose(){if(!M(this,kn,`f`)){j(this,kn,!0,`f`);for(let e=M(this,P,`f`).length-1;e>=0;e--)M(this,N,`m`,Fn).call(this,e),M(this,F,`f`)[e].dispose();M(this,Mn,`f`)&&(M(this,Mn,`f`).dispose(),j(this,Mn,null,`f`));for(let e of M(this,Tn,`f`))e.fb.dispose();j(this,Tn,[],`f`),j(this,En,[],`f`)}}async replaceEffects(e){if(M(this,kn,`f`))throw Error(`[VFX-JS] replaceEffects on disposed chain`);let t=M(this,P,`f`),n=M(this,F,`f`),r=new Map;for(let e=0;e<t.length;e++)r.set(t[e],n[e]);let i=Array(e.length),a=[];for(let t=0;t<e.length;t++){let n=e[t],o=r.get(n);if(o)i[t]=o,r.delete(n);else{let e=M(this,N,`m`,Pn).call(this);i[t]=e,a.push({host:e,effect:n})}}for(let e=0;e<a.length;e++){let{host:t,effect:n}=a[e];t.setPhase(`init`);try{n.init&&await n.init(t.ctx),t.setPhase(`update`)}catch(n){console.error(`[VFX-JS] replaceEffects: new effect init() failed:`,n);for(let t=e-1;t>=0;t--){let e=a[t];if(e.effect.dispose)try{e.effect.dispose()}catch(e){console.error(`[VFX-JS] dispose during init rollback threw:`,e)}e.host.dispose()}throw t.dispose(),n}}for(let[e,t]of r){if(e.dispose)try{e.dispose()}catch(e){console.error(`[VFX-JS] effect.dispose() threw during replaceEffects:`,e)}t.dispose()}for(let e of M(this,Tn,`f`))e.fb.dispose();j(this,Tn,[],`f`),j(this,En,[],`f`),e.length===0&&!M(this,Mn,`f`)?j(this,Mn,M(this,N,`m`,Pn).call(this),`f`):e.length>0&&M(this,Mn,`f`)&&(M(this,Mn,`f`).dispose(),j(this,Mn,null,`f`)),j(this,P,e,`f`),j(this,F,i,`f`),j(this,wn,M(this,N,`m`,Nn).call(this),`f`),M(this,On,`f`).clear()}};yn=new WeakMap,bn=new WeakMap,xn=new WeakMap,Sn=new WeakMap,Cn=new WeakMap,P=new WeakMap,F=new WeakMap,wn=new WeakMap,Tn=new WeakMap,En=new WeakMap,Dn=new WeakMap,On=new WeakMap,kn=new WeakMap,An=new WeakMap,jn=new WeakMap,Mn=new WeakMap,N=new WeakSet,Nn=function(){return M(this,P,`f`).map((e,t)=>typeof e.render==`function`&&e.enabled!==!1?t:-1).filter(e=>e>=0)},Pn=function(){return new tn(M(this,yn,`f`),M(this,bn,`f`),M(this,xn,`f`),M(this,Dn,`f`),M(this,Sn,`f`),M(this,Cn,`f`))},Fn=function(e){let t=M(this,P,`f`)[e];if(t.dispose)try{t.dispose()}catch(t){console.error(`[VFX-JS] effect[${e}].dispose() threw:`,t)}},In=function(e){let t=M(this,wn,`f`).length;if(j(this,En,Array(t),`f`),t===0)return;let n=M(this,An,`f`)?e.canvasBufferSize:e.elementBufferSize,r=[0,0,n[0],n[1]],i=M(this,N,`m`,Vn).call(this,e),a=r;for(let n=0;n<t;n++){let o=M(this,wn,`f`)[n],s=M(this,P,`f`)[o],c=n===t-1,l=M(this,N,`m`,Ln).call(this,s,a,r,i,e)??a,u=[l[2],l[3]],d=_n(r,l),f=c?{x:e.elementRectOnCanvasPx.x+l[0],y:e.elementRectOnCanvasPx.y+l[1],w:u[0],h:u[1]}:{x:0,y:0,w:u[0],h:u[1]};M(this,En,`f`)[n]={dstRect:l,dstBufferSize:u,contentRectUv:d,outputViewport:f},c||M(this,N,`m`,Bn).call(this,n,u),a=l}let[o,s,c,l]=M(this,En,`f`)[t-1].dstRect;j(this,jn,un({top:Math.max(0,s+l-n[1]),right:Math.max(0,o+c-n[0]),bottom:Math.max(0,-s),left:Math.max(0,-o)}),`f`)},Ln=function(e,t,n,r,i){if(e.outputRect)return e.outputRect(M(this,N,`m`,Rn).call(this,i,n,t,r))},Rn=function(e,t,n,r){let i=e.canvasBufferSize[0]/e.canvasSize[0]||1;return{element:M(this,An,`f`)?e.canvasSize:e.elementSize,elementPixel:M(this,An,`f`)?e.canvasBufferSize:e.elementBufferSize,canvas:e.canvasSize,canvasPixel:e.canvasBufferSize,pixelRatio:i,contentRect:t,srcRect:n,canvasRect:r}},zn=function(e,t){let n=M(this,An,`f`)?t.canvasBufferSize:t.elementBufferSize,r=[0,0,n[0],n[1]],i=M(this,N,`m`,Vn).call(this,t),a=M(this,wn,`f`).indexOf(e),o=a<=0?r:M(this,En,`f`)[a-1].dstRect;return M(this,N,`m`,Rn).call(this,t,r,o,i)},Bn=function(e,t){let n=M(this,Tn,`f`)[e];if(n&&n.fb.width===t[0]&&n.fb.height===t[1])return;n&&n.fb.dispose();let r=new xe(M(this,yn,`f`),t[0],t[1]),i=cn(r),a=on(()=>r.texture,()=>r.width,()=>r.height);M(this,Tn,`f`)[e]={fb:r,rtHandle:i,texHandle:a,bufferSize:t}},Vn=function(e){let[t,n]=e.canvasBufferSize;if(M(this,An,`f`))return[0,0,t,n];let{x:r,y:i}=e.elementRectOnCanvasPx;return[-r,-i,t,n]},Hn=function(e,t){let n=M(this,wn,`f`).indexOf(e),r,i,a,o,s;if(n<0)r=t.elementBufferSize[0],i=t.elementBufferSize[1],a={x:0,y:0,w:r,h:i},o=[0,0,1,1],s=[0,0,1,1];else{let e=M(this,En,`f`)[n];r=e.dstBufferSize[0],i=e.dstBufferSize[1],a=e.outputViewport,o=e.contentRectUv,s=n===0?[0,0,1,1]:M(this,En,`f`)[n-1].contentRectUv}return{outputBufferW:r,outputBufferH:i,canvasBufferSize:t.canvasBufferSize,outputViewport:a,elementBufferW:t.elementBufferSize[0],elementBufferH:t.elementBufferSize[1],contentRectUv:o,srcRectUv:s}};function Wn(e){this.data=e,this.pos=0}Wn.prototype.readByte=function(){return this.data[this.pos++]},Wn.prototype.peekByte=function(){return this.data[this.pos]},Wn.prototype.readBytes=function(e){return this.data.subarray(this.pos,this.pos+=e)},Wn.prototype.peekBytes=function(e){return this.data.subarray(this.pos,this.pos+e)},Wn.prototype.readString=function(e){for(var t=``,n=0;n<e;n++)t+=String.fromCharCode(this.readByte());return t},Wn.prototype.readBitArray=function(){for(var e=[],t=this.readByte(),n=7;n>=0;n--)e.push(!!(t&1<<n));return e},Wn.prototype.readUnsigned=function(e){var t=this.readBytes(2);return e?(t[1]<<8)+t[0]:(t[0]<<8)+t[1]};function Gn(e){this.stream=new Wn(e),this.output={}}Gn.prototype.parse=function(e){return this.parseParts(this.output,e),this.output},Gn.prototype.parseParts=function(e,t){for(var n=0;n<t.length;n++){var r=t[n];this.parsePart(e,r)}},Gn.prototype.parsePart=function(e,t){var n=t.label,r;if(!(t.requires&&!t.requires(this.stream,this.output,e)))if(t.loop){for(var i=[];t.loop(this.stream);){var a={};this.parseParts(a,t.parts),i.push(a)}e[n]=i}else t.parts?(r={},this.parseParts(r,t.parts),e[n]=r):t.parser?(r=t.parser(this.stream,this.output,e),t.skip||(e[n]=r)):t.bits&&(e[n]=this.parseBits(t.bits))};function Kn(e){return e.reduce(function(e,t){return e*2+t},0)}Gn.prototype.parseBits=function(e){var t={},n=this.stream.readBitArray();for(var r in e){var i=e[r];i.length?t[r]=Kn(n.slice(i.index,i.index+i.length)):t[r]=n[i.index]}return t};var I={readByte:function(){return function(e){return e.readByte()}},readBytes:function(e){return function(t){return t.readBytes(e)}},readString:function(e){return function(t){return t.readString(e)}},readUnsigned:function(e){return function(t){return t.readUnsigned(e)}},readArray:function(e,t){return function(n,r,i){for(var a=t(n,r,i),o=Array(a),s=0;s<a;s++)o[s]=n.readBytes(e);return o}}},qn={label:`blocks`,parser:function(e){for(var t=[],n=0,r=0,i=e.readByte();i!==r;i=e.readByte())t.push(e.readBytes(i)),n+=i;var a=new Uint8Array(n);n=0;for(var o=0;o<t.length;o++)a.set(t[o],n),n+=t[o].length;return a}},Jn={label:`gce`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===249},parts:[{label:`codes`,parser:I.readBytes(2),skip:!0},{label:`byteSize`,parser:I.readByte()},{label:`extras`,bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:`delay`,parser:I.readUnsigned(!0)},{label:`transparentColorIndex`,parser:I.readByte()},{label:`terminator`,parser:I.readByte(),skip:!0}]},Yn={label:`image`,requires:function(e){return e.peekByte()===44},parts:[{label:`code`,parser:I.readByte(),skip:!0},{label:`descriptor`,parts:[{label:`left`,parser:I.readUnsigned(!0)},{label:`top`,parser:I.readUnsigned(!0)},{label:`width`,parser:I.readUnsigned(!0)},{label:`height`,parser:I.readUnsigned(!0)},{label:`lct`,bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:`lct`,requires:function(e,t,n){return n.descriptor.lct.exists},parser:I.readArray(3,function(e,t,n){return 2**(n.descriptor.lct.size+1)})},{label:`data`,parts:[{label:`minCodeSize`,parser:I.readByte()},qn]}]},Xn={label:`text`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===1},parts:[{label:`codes`,parser:I.readBytes(2),skip:!0},{label:`blockSize`,parser:I.readByte()},{label:`preData`,parser:function(e,t,n){return e.readBytes(n.text.blockSize)}},qn]},Zn={label:`frames`,parts:[Jn,{label:`application`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===255},parts:[{label:`codes`,parser:I.readBytes(2),skip:!0},{label:`blockSize`,parser:I.readByte()},{label:`id`,parser:function(e,t,n){return e.readString(n.blockSize)}},qn]},{label:`comment`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===254},parts:[{label:`codes`,parser:I.readBytes(2),skip:!0},qn]},Yn,Xn],loop:function(e){var t=e.peekByte();return t===33||t===44}},Qn=[{label:`header`,parts:[{label:`signature`,parser:I.readString(3)},{label:`version`,parser:I.readString(3)}]},{label:`lsd`,parts:[{label:`width`,parser:I.readUnsigned(!0)},{label:`height`,parser:I.readUnsigned(!0)},{label:`gct`,bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:`backgroundColorIndex`,parser:I.readByte()},{label:`pixelAspectRatio`,parser:I.readByte()}]},{label:`gct`,requires:function(e,t){return t.lsd.gct.exists},parser:I.readArray(3,function(e,t){return 2**(t.lsd.gct.size+1)})},Zn];function $n(e){this.raw=new Gn(new Uint8Array(e)).parse(Qn),this.raw.hasImages=!1;for(var t=0;t<this.raw.frames.length;t++)if(this.raw.frames[t].image){this.raw.hasImages=!0;break}}$n.prototype.decompressFrame=function(e,t){if(e>=this.raw.frames.length)return null;var n=this.raw.frames[e];if(n.image){var r=n.image.descriptor.width*n.image.descriptor.height,i=o(n.image.data.minCodeSize,n.image.data.blocks,r);n.image.descriptor.lct.interlaced&&(i=s(i,n.image.descriptor.width));var a={pixels:i,dims:{top:n.image.descriptor.top,left:n.image.descriptor.left,width:n.image.descriptor.width,height:n.image.descriptor.height}};return n.image.descriptor.lct&&n.image.descriptor.lct.exists?a.colorTable=n.image.lct:a.colorTable=this.raw.gct,n.gce&&(a.delay=(n.gce.delay||10)*10,a.disposalType=n.gce.extras.disposal,n.gce.extras.transparentColorGiven&&(a.transparentIndex=n.gce.transparentColorIndex)),t&&(a.patch=c(a)),a}return null;function o(e,t,n){var r=4096,i=-1,a=n,o,s,c,l,u,d,f,p,m,h,g,_,v,y,ee,te,b=Array(n),x=Array(r),S=Array(r),ne=Array(r+1);for(_=e,s=1<<_,u=s+1,o=s+2,f=i,l=_+1,c=(1<<l)-1,m=0;m<s;m++)x[m]=0,S[m]=m;for(g=p=v=y=te=ee=0,h=0;h<a;){if(y===0){if(p<l){g+=t[ee]<<p,p+=8,ee++;continue}if(m=g&c,g>>=l,p-=l,m>o||m==u)break;if(m==s){l=_+1,c=(1<<l)-1,o=s+2,f=i;continue}if(f==i){ne[y++]=S[m],f=m,v=m;continue}for(d=m,m==o&&(ne[y++]=v,m=f);m>s;)ne[y++]=S[m],m=x[m];v=S[m]&255,ne[y++]=v,o<r&&(x[o]=f,S[o]=v,o++,(o&c)===0&&o<r&&(l++,c+=o)),f=d}y--,b[te++]=ne[y],h++}for(h=te;h<a;h++)b[h]=0;return b}function s(e,t){for(var n=Array(e.length),r=e.length/t,i=function(r,i){var a=e.slice(i*t,(i+1)*t);n.splice.apply(n,[r*t,t].concat(a))},a=[0,4,2,1],o=[8,8,4,2],s=0,c=0;c<4;c++)for(var l=a[c];l<r;l+=o[c])i(l,s),s++;return n}function c(e){for(var t=e.pixels.length,n=new Uint8ClampedArray(t*4),r=0;r<t;r++){var i=r*4,a=e.pixels[r],o=e.colorTable[a];n[i]=o[0],n[i+1]=o[1],n[i+2]=o[2],n[i+3]=a===e.transparentIndex?0:255}return n}},$n.prototype.decompressFrames=function(e,t,n){t===void 0&&(t=0),n=n===void 0?this.raw.frames.length:Math.min(n,this.raw.frames.length);for(var r=[],i=t;i<n;i++)this.raw.frames[i].image&&r.push(this.decompressFrame(i,e));return r};var er=$n,tr=class e{static async create(t,n){let r=await fetch(t).then(e=>e.arrayBuffer()).then(e=>new er(e)),i=r.decompressFrames(!0,void 0,void 0),{width:a,height:o}=r.raw.lsd;return new e(i,a,o,n)}constructor(e,t,n,r){this.frames=[],this.index=0,this.playTime=0,this.frames=e,this.canvas=document.createElement(`canvas`),this.ctx=this.canvas.getContext(`2d`),this.pixelRatio=r,this.canvas.width=t,this.canvas.height=n,this.startTime=Date.now()}getCanvas(){return this.canvas}update(){let e=Date.now()-this.startTime;for(;this.playTime<e;){let e=this.frames[this.index%this.frames.length];this.playTime+=e.delay,this.index++}let t=this.frames[this.index%this.frames.length],n=new ImageData(t.patch,t.dims.width,t.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(n,t.dims.left,t.dims.top)}},nr=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},rr,ir,ar,or,sr,cr=class{constructor(e,t=!1){this.isContextLost=!1,rr.set(this,new Set),ir.set(this,new Set),ar.set(this,new Set),or.set(this,e=>{e.preventDefault(),this.isContextLost=!0;for(let e of nr(this,ir,`f`))e()}),sr.set(this,()=>{this.isContextLost=!1;let e=this.gl;e.getExtension(`EXT_color_buffer_float`),e.getExtension(`EXT_color_buffer_half_float`);for(let e of nr(this,rr,`f`))e.restore();for(let e of nr(this,ar,`f`))e()});let n=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:t});if(!n)throw Error(`[VFX-JS] WebGL2 is not available.`);this.gl=n,this.canvas=e,n.getExtension(`EXT_color_buffer_float`),n.getExtension(`EXT_color_buffer_half_float`),this.floatLinearFilter=!!n.getExtension(`OES_texture_float_linear`),this.maxTextureSize=n.getParameter(n.MAX_TEXTURE_SIZE),e.addEventListener(`webglcontextlost`,nr(this,or,`f`),!1),e.addEventListener(`webglcontextrestored`,nr(this,sr,`f`),!1)}setSize(e,t,n){let r=Math.floor(e*n),i=Math.floor(t*n);(this.canvas.width!==r||this.canvas.height!==i)&&(this.canvas.width=r,this.canvas.height=i)}addResource(e){nr(this,rr,`f`).add(e)}removeResource(e){nr(this,rr,`f`).delete(e)}onContextLost(e){return nr(this,ir,`f`).add(e),()=>nr(this,ir,`f`).delete(e)}onContextRestored(e){return nr(this,ar,`f`).add(e),()=>nr(this,ar,`f`).delete(e)}};rr=new WeakMap,ir=new WeakMap,ar=new WeakMap,or=new WeakMap,sr=new WeakMap;var lr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},ur=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},dr,fr,pr,mr,hr=class{constructor(e){dr.add(this),fr.set(this,void 0),pr.set(this,void 0),lr(this,fr,e,`f`),this.gl=e.gl,ur(this,dr,`m`,mr).call(this),e.addResource(this)}restore(){ur(this,dr,`m`,mr).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){ur(this,fr,`f`).removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(ur(this,pr,`f`))}};fr=new WeakMap,pr=new WeakMap,dr=new WeakSet,mr=function(){let e=this.gl,t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw Error(`[VFX-JS] Failed to create quad VAO`);this.vao=t,lr(this,pr,n,`f`);let r=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)};function gr(e,t,n,r={}){return new xe(e,t,n,{float:r.float??!1})}function _r(e,t){let i=t.renderingToBuffer??!1,a;a=i?`none`:t.premultipliedAlpha?`premultiplied`:`normal`;let o=t.glslVersion??He(t.fragmentShader);return new Ye(e,t.vertexShader??(o===`100`?r:n),t.fragmentShader,t.uniforms,a,o)}var vr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},L=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},R,yr,br,xr,Sr,Cr,wr=class{constructor(e,t,n,r,i,a,o,s){if(R.set(this,void 0),yr.set(this,void 0),br.set(this,void 0),xr.set(this,void 0),Sr.set(this,void 0),Cr.set(this,void 0),vr(this,xr,r??!1,`f`),vr(this,Sr,i??!1,`f`),vr(this,Cr,a,`f`),vr(this,yr,{},`f`),vr(this,R,{src:{value:null},offset:{value:new je},resolution:{value:new je},viewport:{value:new Me},time:{value:0},mouse:{value:new je},passIndex:{value:0}},`f`),n)for(let[e,t]of Object.entries(n))typeof t==`function`?(L(this,yr,`f`)[e]=t,L(this,R,`f`)[e]={value:t()}):L(this,R,`f`)[e]={value:t};this.pass=_r(e,{fragmentShader:t,uniforms:L(this,R,`f`),renderingToBuffer:o??!1,premultipliedAlpha:!0,glslVersion:s})}get uniforms(){return L(this,R,`f`)}setUniforms(e,t,n,r,i,a){L(this,R,`f`).src.value=e,L(this,R,`f`).resolution.value.set(n.w*t,n.h*t),L(this,R,`f`).offset.value.set(n.x*t,n.y*t),L(this,R,`f`).time.value=r,L(this,R,`f`).mouse.value.set(i*t,a*t)}updateCustomUniforms(e){for(let[e,t]of Object.entries(L(this,yr,`f`)))L(this,R,`f`)[e]&&(L(this,R,`f`)[e].value=t());if(e)for(let[t,n]of Object.entries(e))L(this,R,`f`)[t]&&(L(this,R,`f`)[t].value=n())}initializeBackbuffer(e,t,n,r){L(this,xr,`f`)&&!L(this,br,`f`)&&(L(this,Cr,`f`)?vr(this,br,new Ae(e,L(this,Cr,`f`)[0],L(this,Cr,`f`)[1],1,L(this,Sr,`f`)),`f`):vr(this,br,new Ae(e,t,n,r,L(this,Sr,`f`)),`f`))}resizeBackbuffer(e,t){L(this,br,`f`)&&!L(this,Cr,`f`)&&L(this,br,`f`).resize(e,t)}registerBufferUniform(e){L(this,R,`f`)[e]||(L(this,R,`f`)[e]={value:null})}get backbuffer(){return L(this,br,`f`)}get persistent(){return L(this,xr,`f`)}get float(){return L(this,Sr,`f`)}get size(){return L(this,Cr,`f`)}dispose(){this.pass.dispose(),L(this,br,`f`)?.dispose()}};R=new WeakMap,yr=new WeakMap,br=new WeakMap,xr=new WeakMap,Sr=new WeakMap,Cr=new WeakMap;var Tr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Er=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Dr,Or,kr=class{constructor(e){Dr.set(this,void 0),Or.set(this,new Map),Tr(this,Dr,e,`f`)}get(e,t,n){let r=`${t}\0${e}\0${n??``}`,i=Er(this,Or,`f`).get(r);return i||(i=new Ue(Er(this,Dr,`f`),e,t,n),Er(this,Or,`f`).set(r,i)),i}get size(){return Er(this,Or,`f`).size}dispose(){for(let e of Er(this,Or,`f`).values())e.dispose();Er(this,Or,`f`).clear()}};Dr=new WeakMap,Or=new WeakMap;var z=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},B=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},V,Ar,jr,H,Mr,Nr,Pr,U,Fr,W,Ir,G,Lr,Rr,zr,Br,Vr,Hr,K,q,Ur,Wr,Gr,Kr,J,qr,Jr,Yr,Xr,Zr,Qr,$r,ei,ti,ni,ri,ii,ai,oi,si,ci,li,ui,di,fi,pi,mi,hi,gi,_i,vi,yi,bi,xi=new Map,Si=class{constructor(e,t){V.add(this),Ar.set(this,void 0),jr.set(this,void 0),H.set(this,void 0),Mr.set(this,void 0),Nr.set(this,void 0),Pr.set(this,void 0),U.set(this,void 0),Fr.set(this,[]),W.set(this,void 0),Ir.set(this,new Map),G.set(this,null),Lr.set(this,!1),Rr.set(this,new WeakSet),zr.set(this,{}),Br.set(this,{}),Vr.set(this,0),Hr.set(this,void 0),K.set(this,2),q.set(this,[]),Ur.set(this,0),Wr.set(this,1),Gr.set(this,Date.now()/1e3),Kr.set(this,!1),J.set(this,fn(0)),qr.set(this,fn(0)),Jr.set(this,[0,0]),Yr.set(this,0),Xr.set(this,0),Zr.set(this,0),Qr.set(this,0),$r.set(this,new WeakMap),ti.set(this,async()=>{if(typeof window<`u`){for(let e of B(this,q,`f`))if(e.type===`text`&&e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await B(this,V,`m`,ri).call(this,e),e.width=n,e.height=r)}for(let e of B(this,q,`f`))if(e.type===`text`&&!e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await B(this,V,`m`,ri).call(this,e),e.width=n,e.height=r)}}}),ni.set(this,e=>{typeof window<`u`&&(z(this,Zr,e.clientX,`f`),z(this,Qr,window.innerHeight-e.clientY,`f`))}),oi.set(this,()=>{this.isPlaying()&&(this.render(),z(this,Hr,requestAnimationFrame(B(this,oi,`f`)),`f`))}),z(this,Ar,e,`f`),z(this,jr,t,`f`),z(this,H,new cr(t,e.preserveDrawingBuffer),`f`),z(this,Mr,B(this,H,`f`).gl,`f`),B(this,Mr,`f`).clearColor(0,0,0,0),z(this,K,e.pixelRatio,`f`),z(this,Wr,e.timeScale,`f`),z(this,Gr,Date.now()/1e3,`f`),z(this,Nr,new hr(B(this,H,`f`)),`f`),z(this,Pr,new kr(B(this,H,`f`)),`f`),typeof window<`u`&&(window.addEventListener(`resize`,B(this,ti,`f`)),window.addEventListener(`pointermove`,B(this,ni,`f`))),B(this,ti,`f`).call(this),z(this,U,new Qe(B(this,H,`f`)),`f`),B(this,V,`m`,gi).call(this,e.postEffects),B(this,H,`f`).onContextRestored(()=>{B(this,Mr,`f`).clearColor(0,0,0,0)})}destroy(){this.stop(),typeof window<`u`&&(window.removeEventListener(`resize`,B(this,ti,`f`)),window.removeEventListener(`pointermove`,B(this,ni,`f`))),B(this,W,`f`)?.dispose();for(let e of B(this,Ir,`f`).values())e?.dispose();for(let e of B(this,Fr,`f`))e.pass.dispose();B(this,G,`f`)&&(B(this,G,`f`).dispose(),z(this,G,null,`f`),z(this,Lr,!1,`f`)),B(this,U,`f`).dispose(),B(this,Pr,`f`).dispose(),B(this,Nr,`f`).dispose()}async addElement(e,t={},n){if(t.effect!==void 0)return B(this,V,`m`,ii).call(this,e,t,t.effect,n);let r=B(this,V,`m`,ai).call(this,t),i=e.getBoundingClientRect(),a=ji(e)?mn(i):pn(i),[o,s]=Ti(t.overflow),l=hn(a,s),u=Ei(t.intersection),d=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),f,p,m=!1;if(e instanceof HTMLImageElement){p=`img`;let t=c(e);if(m=!!t.match(/\.gif/i),m){let n=await tr.create(t,B(this,K,`f`));xi.set(e,n),f=new w(B(this,H,`f`),n.getCanvas())}else{let e=await he(t);f=new w(B(this,H,`f`),e)}}else if(e instanceof HTMLVideoElement)f=new w(B(this,H,`f`),e),p=`video`;else if(e instanceof HTMLCanvasElement)e.hasAttribute(`layoutsubtree`)&&n?(f=new w(B(this,H,`f`),n),p=`hic`):(f=new w(B(this,H,`f`),e),p=`canvas`);else{let t=await et(e,d,void 0,this.maxTextureSize);f=new w(B(this,H,`f`),t),p=`text`}let[h,g]=ki(t.wrap);f.wrapS=h,f.wrapT=g,f.needsUpdate=!0;let _=t.autoCrop??!0;if(p!==`hic`&&t.overlay!==!0)if(typeof t.overlay==`number`)e.style.setProperty(`opacity`,t.overlay.toString());else{let t=p===`video`?`0.0001`:`0`;e.style.setProperty(`opacity`,t.toString())}let v={src:{value:f},resolution:{value:new je},offset:{value:new je},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},mouse:{value:new je},intersection:{value:0},viewport:{value:new Me},autoCrop:{value:_}},y={};if(t.uniforms!==void 0)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(v[e]={value:n()},y[e]=n):v[e]={value:n};let ee;t.backbuffer&&(ee=(()=>{let e=(l.right-l.left)*B(this,K,`f`),t=(l.bottom-l.top)*B(this,K,`f`);return new Ae(B(this,H,`f`),e,t,B(this,K,`f`),!1)})(),v.backbuffer={value:ee.texture});let te=new Map,b=new Map;for(let e=0;e<r.length-1;e++){let t=r[e].target??`pass${e}`;r[e]={...r[e],target:t};let n=r[e].size,i=n?n[0]:(l.right-l.left)*B(this,K,`f`),a=n?n[1]:(l.bottom-l.top)*B(this,K,`f`);if(r[e].persistent){let i=n?1:B(this,K,`f`),a=n?n[0]:l.right-l.left,o=n?n[1]:l.bottom-l.top;b.set(t,new Ae(B(this,H,`f`),a,o,i,r[e].float))}else te.set(t,gr(B(this,H,`f`),i,a,{float:r[e].float}))}let x=[];for(let e=0;e<r.length;e++){let t=r[e],n=t.frag,i={...v},a={};for(let[e,r]of te)e!==t.target&&n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:r.texture});for(let[e,t]of b)n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:t.texture});if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(i[e]={value:n()},a[e]=n):i[e]={value:n};let o=_r(B(this,H,`f`),{vertexShader:t.vert,fragmentShader:n,uniforms:i,renderingToBuffer:t.target!==void 0,glslVersion:t.glslVersion});x.push({pass:o,uniforms:i,uniformGenerators:{...y,...a},target:t.target,persistent:t.persistent,float:t.float,size:t.size,backbuffer:t.target?b.get(t.target):void 0})}let S=B(this,Ur,`f`),ne={type:p,element:e,isInViewport:!1,isInLogicalViewport:!1,width:a.right-a.left,height:a.bottom-a.top,passes:x,bufferTargets:te,startTime:S,enterTime:S,leaveTime:-1/0,release:t.release??1/0,isGif:m,isFullScreen:o,overflow:s,intersection:u,originalOpacity:d,srcTexture:f,zIndex:t.zIndex??0,backbuffer:ee,autoCrop:_};B(this,V,`m`,fi).call(this,ne,a,S),B(this,q,`f`).push(ne),B(this,q,`f`).sort((e,t)=>e.zIndex-t.zIndex)}async updateElementEffects(e,t){let n=B(this,q,`f`).find(t=>t.element===e);if(!n)throw Error(`[VFX-JS] updateElementEffects: element not registered`);if(!n.chain)throw Error(`[VFX-JS] updateElementEffects: element is on the shader path; effect-only updates are not supported`);let r=Array.isArray(t)?[...t]:[t],i=n.chain.effects,a=new Set(i),o=[];for(let e of r)if(!a.has(e)){if(B(this,Rr,`f`).has(e))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");o.push(e)}await n.chain.replaceEffects(r);let s=new Set(r);for(let e of i)s.has(e)||B(this,Rr,`f`).delete(e);for(let e of o)B(this,Rr,`f`).add(e)}removeElement(e){let t=B(this,q,`f`).findIndex(t=>t.element===e);if(t!==-1){let n=B(this,q,`f`).splice(t,1)[0];if(n.chain)B(this,V,`m`,ui).call(this,n.chain.effects),n.chain.dispose();else{for(let e of n.bufferTargets.values())e.dispose();for(let e of n.passes)e.pass.dispose(),e.backbuffer?.dispose();n.backbuffer?.dispose()}n.srcTexture.dispose(),e.style.setProperty(`opacity`,n.originalOpacity.toString())}}updateTextElement(e){let t=B(this,q,`f`).findIndex(t=>t.element===e);return t===-1?Promise.resolve():B(this,V,`m`,ri).call(this,B(this,q,`f`)[t])}async updateImageElement(e){let t=B(this,q,`f`).find(t=>t.element===e);if(!t||t.type!==`img`||t.isGif)return;let n=await he(c(e)),r=t.srcTexture,i=new w(B(this,H,`f`),n);i.wrapS=r.wrapS,i.wrapT=r.wrapT,i.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=i),t.srcTexture=i,r.dispose()}updateCanvasElement(e){let t=B(this,q,`f`).find(t=>t.element===e);if(t){let n=t.srcTexture,r=new w(B(this,H,`f`),e);r.wrapS=n.wrapS,r.wrapT=n.wrapT,r.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=r),t.srcTexture=r,n.dispose()}}updateHICTexture(e,t){let n=B(this,q,`f`).find(t=>t.element===e);if(!n||n.type!==`hic`)return;let r=n.srcTexture;if(r.source===t)r.needsUpdate=!0;else{let e=new w(B(this,H,`f`),t);e.wrapS=r.wrapS,e.wrapT=r.wrapT,e.needsUpdate=!0,!n.chain&&n.passes.length>0&&(n.passes[0].uniforms.src.value=e),n.srcTexture=e,r.dispose()}}get maxTextureSize(){return B(this,H,`f`).maxTextureSize}isPlaying(){return B(this,Hr,`f`)!==void 0}play(){this.isPlaying()||(z(this,Gr,Date.now()/1e3,`f`),z(this,Hr,requestAnimationFrame(B(this,oi,`f`)),`f`))}get time(){return B(this,Ur,`f`)}setTime(e){z(this,Ur,e,`f`),z(this,Kr,!0,`f`)}get timeScale(){return B(this,Wr,`f`)}set timeScale(e){z(this,Wr,e,`f`)}stop(){B(this,Hr,`f`)!==void 0&&(cancelAnimationFrame(B(this,Hr,`f`)),z(this,Hr,void 0,`f`))}render(){let e=Date.now()/1e3;B(this,Kr,`f`)?z(this,Kr,!1,`f`):z(this,Ur,B(this,Ur,`f`)+(e-B(this,Gr,`f`))*B(this,Wr,`f`),`f`),z(this,Gr,e,`f`);let t=B(this,Ur,`f`),n=B(this,Mr,`f`);B(this,V,`m`,ei).call(this),n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,B(this,jr,`f`).width,B(this,jr,`f`).height),n.clear(n.COLOR_BUFFER_BIT);let r=B(this,J,`f`).right-B(this,J,`f`).left,i=B(this,J,`f`).bottom-B(this,J,`f`).top,a=we(0,0,r,i),o=B(this,V,`m`,ci).call(this);o&&(B(this,V,`m`,bi).call(this,r,i),B(this,W,`f`)&&(n.bindFramebuffer(n.FRAMEBUFFER,B(this,W,`f`).fbo),n.clear(n.COLOR_BUFFER_BIT),n.bindFramebuffer(n.FRAMEBUFFER,null)));for(let e of B(this,q,`f`)){let n=e.element.getBoundingClientRect(),s=e.type===`text`?mn(n):pn(n),c=B(this,V,`m`,fi).call(this,e,s,t);if(!c.isVisible)continue;if(e.chain){B(this,V,`m`,si).call(this,e,s,c,t);continue}let l=e.passes[0].uniforms;l.time.value=t-e.startTime,l.resolution.value.set((s.right-s.left)*B(this,K,`f`),(s.bottom-s.top)*B(this,K,`f`)),l.mouse.value.set((B(this,Zr,`f`)+B(this,Yr,`f`))*B(this,K,`f`),(B(this,Qr,`f`)+B(this,Xr,`f`))*B(this,K,`f`));for(let t of e.passes)for(let[e,n]of Object.entries(t.uniformGenerators))t.uniforms[e].value=n();xi.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(l.src.value.needsUpdate=!0);let u=Ce(s,i,B(this,Yr,`f`),B(this,Xr,`f`)),d=Ce(c.rectWithOverflow,i,B(this,Yr,`f`),B(this,Xr,`f`));e.backbuffer&&(e.passes[0].uniforms.backbuffer.value=e.backbuffer.texture);{let t=e.isFullScreen?a:d,n=Math.max(1,t.w*B(this,K,`f`)),r=Math.max(1,t.h*B(this,K,`f`)),i=Math.max(1,t.w),o=Math.max(1,t.h);for(let t=0;t<e.passes.length-1;t++){let a=e.passes[t];if(!a.size)if(a.backbuffer)a.backbuffer.resize(i,o);else{let t=e.bufferTargets.get(a.target);t&&(t.width!==n||t.height!==r)&&t.setSize(n,r)}}}let f=new Map;for(let t of e.passes)t.backbuffer&&t.target&&f.set(t.target,t.backbuffer.texture);let p=e.srcTexture,m=B(this,Zr,`f`)+B(this,Yr,`f`)-u.x,h=B(this,Qr,`f`)+B(this,Xr,`f`)-u.y;for(let t=0;t<e.passes.length-1;t++){let n=e.passes[t],r=e.isFullScreen?a:d;n.uniforms.src.value=p;for(let[e,t]of f)n.uniforms[e]&&(n.uniforms[e].value=t);for(let[e,t]of Object.entries(n.uniformGenerators))n.uniforms[e]&&(n.uniforms[e].value=t());let i=n.size?n.size[0]:r.w*B(this,K,`f`),o=n.size?n.size[1]:r.h*B(this,K,`f`),s=n.size?we(0,0,n.size[0],n.size[1]):we(0,0,r.w,r.h);if(n.uniforms.resolution.value.set(i,o),n.uniforms.offset.value.set(0,0),n.uniforms.mouse.value.set(m/r.w*i,h/r.h*o),n.backbuffer)B(this,V,`m`,mi).call(this,n.pass,n.backbuffer.target,s,n.uniforms,!0),n.backbuffer.swap(),p=n.backbuffer.texture;else{let t=e.bufferTargets.get(n.target);if(!t)continue;B(this,V,`m`,mi).call(this,n.pass,t,s,n.uniforms,!0),p=t.texture}n.target&&f.set(n.target,p)}let g=e.passes[e.passes.length-1];g.uniforms.src.value=p,g.uniforms.resolution.value.set(n.width*B(this,K,`f`),n.height*B(this,K,`f`)),g.uniforms.offset.value.set(u.x*B(this,K,`f`),u.y*B(this,K,`f`)),g.uniforms.mouse.value.set((B(this,Zr,`f`)+B(this,Yr,`f`))*B(this,K,`f`),(B(this,Qr,`f`)+B(this,Xr,`f`))*B(this,K,`f`));for(let[e,t]of f)g.uniforms[e]&&(g.uniforms[e].value=t);for(let[e,t]of Object.entries(g.uniformGenerators))g.uniforms[e]&&(g.uniforms[e].value=t());e.backbuffer?(g.uniforms.backbuffer.value=e.backbuffer.texture,e.isFullScreen?(e.backbuffer.resize(r,i),B(this,V,`m`,hi).call(this,e,u.x,u.y),B(this,V,`m`,mi).call(this,g.pass,e.backbuffer.target,a,g.uniforms,!0),e.backbuffer.swap(),B(this,U,`f`).setUniforms(e.backbuffer.texture,B(this,K,`f`),a),B(this,V,`m`,mi).call(this,B(this,U,`f`).pass,o&&B(this,W,`f`)||null,a,B(this,U,`f`).uniforms,!1)):(e.backbuffer.resize(d.w,d.h),B(this,V,`m`,hi).call(this,e,e.overflow.left,e.overflow.bottom),B(this,V,`m`,mi).call(this,g.pass,e.backbuffer.target,e.backbuffer.getViewport(),g.uniforms,!0),e.backbuffer.swap(),B(this,U,`f`).setUniforms(e.backbuffer.texture,B(this,K,`f`),d),B(this,V,`m`,mi).call(this,B(this,U,`f`).pass,o&&B(this,W,`f`)||null,d,B(this,U,`f`).uniforms,!1))):(B(this,V,`m`,hi).call(this,e,u.x,u.y),B(this,V,`m`,mi).call(this,g.pass,o&&B(this,W,`f`)||null,e.isFullScreen?a:d,g.uniforms,!1))}o&&B(this,W,`f`)&&(B(this,G,`f`)&&B(this,Lr,`f`)?B(this,V,`m`,vi).call(this,a,t):B(this,V,`m`,yi).call(this,a,t))}};Ar=new WeakMap,jr=new WeakMap,H=new WeakMap,Mr=new WeakMap,Nr=new WeakMap,Pr=new WeakMap,U=new WeakMap,Fr=new WeakMap,W=new WeakMap,Ir=new WeakMap,G=new WeakMap,Lr=new WeakMap,Rr=new WeakMap,zr=new WeakMap,Br=new WeakMap,Vr=new WeakMap,Hr=new WeakMap,K=new WeakMap,q=new WeakMap,Ur=new WeakMap,Wr=new WeakMap,Gr=new WeakMap,Kr=new WeakMap,J=new WeakMap,qr=new WeakMap,Jr=new WeakMap,Yr=new WeakMap,Xr=new WeakMap,Zr=new WeakMap,Qr=new WeakMap,$r=new WeakMap,ti=new WeakMap,ni=new WeakMap,oi=new WeakMap,V=new WeakSet,ei=function(){if(typeof window>`u`)return;let e=B(this,jr,`f`).ownerDocument,t=e.compatMode===`BackCompat`?e.body:e.documentElement,n=t.clientWidth,r=t.clientHeight,i=window.scrollX,a=window.scrollY,o,s;if(B(this,Ar,`f`).fixedCanvas)o=0,s=0;else if(B(this,Ar,`f`).wrapper)o=n*B(this,Ar,`f`).scrollPadding[0],s=r*B(this,Ar,`f`).scrollPadding[1];else{let t=e.body.scrollWidth-(i+n),c=e.body.scrollHeight-(a+r);o=Ai(n*B(this,Ar,`f`).scrollPadding[0],0,t),s=Ai(r*B(this,Ar,`f`).scrollPadding[1],0,c)}let c=n+o*2,l=r+s*2;(c!==B(this,Jr,`f`)[0]||l!==B(this,Jr,`f`)[1])&&(B(this,jr,`f`).style.width=`${c}px`,B(this,jr,`f`).style.height=`${l}px`,B(this,H,`f`).setSize(c,l,B(this,K,`f`)),z(this,J,fn({top:-s,left:-o,right:n+o,bottom:r+s}),`f`),z(this,qr,fn({top:0,left:0,right:n,bottom:r}),`f`),z(this,Jr,[c,l],`f`),z(this,Yr,o,`f`),z(this,Xr,s,`f`)),B(this,Ar,`f`).fixedCanvas||B(this,jr,`f`).style.setProperty(`transform`,`translate(${i-o}px, ${a-s}px)`)},ri=async function(e){if(!B(this,$r,`f`).get(e.element)){B(this,$r,`f`).set(e.element,!0);try{let t=e.srcTexture,n=t.source instanceof OffscreenCanvas?t.source:void 0,r=await et(e.element,e.originalOpacity,n,this.maxTextureSize);if(r.width===0||r.width===0)throw`omg`;let i=new w(B(this,H,`f`),r);i.wrapS=t.wrapS,i.wrapT=t.wrapT,i.needsUpdate=!0,!e.chain&&e.passes.length>0&&(e.passes[0].uniforms.src.value=i),e.srcTexture=i,t.dispose()}catch(e){console.error(e)}B(this,$r,`f`).set(e.element,!1)}},ii=async function(e,t,n,r){t.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified; `effect` takes precedence."),t.overflow!==void 0&&console.warn("[VFX-JS] `overflow` is shader-path only and is ignored by the effect path. Use each effect's own `outputRect` (with `dims.canvasRect` for fullscreen) to control its dst rect.");let i=Array.isArray(n)?[...n]:[n];B(this,V,`m`,li).call(this,i);let a=e.getBoundingClientRect(),o=ji(e)?mn(a):pn(a),[s,l]=Ti(t.overflow),u=Ei(t.intersection),d=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),f,p,m=!1;if(e instanceof HTMLImageElement){p=`img`;let t=c(e);if(m=!!t.match(/\.gif/i),m){let n=await tr.create(t,B(this,K,`f`));xi.set(e,n),f=new w(B(this,H,`f`),n.getCanvas())}else{let e=await he(t);f=new w(B(this,H,`f`),e)}}else if(e instanceof HTMLVideoElement)f=new w(B(this,H,`f`),e),p=`video`;else if(e instanceof HTMLCanvasElement)e.hasAttribute(`layoutsubtree`)&&r?(f=new w(B(this,H,`f`),r),p=`hic`):(f=new w(B(this,H,`f`),e),p=`canvas`);else{let t=await et(e,d,void 0,this.maxTextureSize);f=new w(B(this,H,`f`),t),p=`text`}let[h,g]=ki(t.wrap);f.wrapS=h,f.wrapT=g,f.needsUpdate=!0;let _=t.autoCrop??!0;if(p!==`hic`&&t.overlay!==!0)if(typeof t.overlay==`number`)e.style.setProperty(`opacity`,t.overlay.toString());else{let t=p===`video`?`0.0001`:`0`;e.style.setProperty(`opacity`,t.toString())}let v=B(this,Ur,`f`),y={type:p,element:e,isInViewport:!1,isInLogicalViewport:!1,width:o.right-o.left,height:o.bottom-o.top,passes:[],bufferTargets:new Map,startTime:v,enterTime:v,leaveTime:-1/0,release:t.release??1/0,isGif:m,isFullScreen:s,overflow:l,intersection:u,originalOpacity:d,srcTexture:f,zIndex:t.zIndex??0,backbuffer:void 0,autoCrop:_,effectLastRenderTime:v},ee=on(()=>y.srcTexture,()=>Di(y.srcTexture,`w`),()=>Di(y.srcTexture,`h`)),te={},b={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(b[e]=n,te[e]=n()):te[e]=n;y.effectUniformGenerators=b,y.effectStaticUniforms=te;let x={autoCrop:_,glslVersion:t.glslVersion??`300 es`},S=new Un(B(this,H,`f`),B(this,Nr,`f`),B(this,K,`f`),i,x,ee,!1,B(this,Pr,`f`));try{await S.initAll()}catch(t){throw B(this,V,`m`,ui).call(this,i),f.dispose(),e.style.setProperty(`opacity`,d.toString()),t}y.chain=S,B(this,V,`m`,fi).call(this,y,o,v),B(this,q,`f`).push(y),B(this,q,`f`).sort((e,t)=>e.zIndex-t.zIndex)},ai=function(e){let t=t=>t.glslVersion===void 0&&e.glslVersion!==void 0?{...t,glslVersion:e.glslVersion}:t;return Array.isArray(e.shader)?e.shader.map(t):[t({frag:B(this,V,`m`,pi).call(this,e.shader||`uvGradient`)})]},si=function(e,t,n,r){let i=e.chain;if(!i)return;let a=B(this,K,`f`);xi.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(e.srcTexture.needsUpdate=!0);let o={...e.effectStaticUniforms??{}};if(e.effectUniformGenerators)for(let[t,n]of Object.entries(e.effectUniformGenerators))o[t]=n();let s=B(this,J,`f`).right-B(this,J,`f`).left,c=B(this,J,`f`).bottom-B(this,J,`f`).top,l=Ce(t,c,B(this,Yr,`f`),B(this,Xr,`f`)),u=B(this,Zr,`f`)+B(this,Yr,`f`)-l.x,d=B(this,Qr,`f`)+B(this,Xr,`f`)-l.y,f=t.right-t.left,p=t.bottom-t.top,m=r-(e.effectLastRenderTime??r);e.effectLastRenderTime=r;let h=B(this,V,`m`,ci).call(this)&&B(this,W,`f`)?cn(B(this,W,`f`)):null;i.run({time:r-e.startTime,deltaTime:m,mouse:[u*a,d*a],mouseViewport:[B(this,Zr,`f`)*a,B(this,Qr,`f`)*a],intersection:n.intersection,enterTime:r-e.enterTime,leaveTime:r-e.leaveTime,resolvedUniforms:o,canvasSize:[s,c],canvasBufferSize:[s*a,c*a],elementSize:[f,p],elementBufferSize:[f*a,p*a],elementRectOnCanvasPx:{x:l.x*a,y:l.y*a,w:l.w*a,h:l.h*a},finalTarget:h,isVisible:n.isVisible})},ci=function(){return B(this,Fr,`f`).length>0||B(this,G,`f`)!==null&&B(this,Lr,`f`)},li=function(e){for(let t of e)if(B(this,Rr,`f`).has(t))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");for(let t of e)B(this,Rr,`f`).add(t)},ui=function(e){for(let t of e)B(this,Rr,`f`).delete(t)},di=function(e){let t=e.hitTestPadBuffer,n=B(this,K,`f`);return un({top:t.top/n,right:t.right/n,bottom:t.bottom/n,left:t.left/n})},fi=function(e,t,n){let r=hn(t,e.chain?B(this,V,`m`,di).call(this,e.chain):e.overflow),i=e.isFullScreen||Ci(B(this,qr,`f`),r),a=hn(B(this,qr,`f`),e.intersection.rootMargin),o=vn(a,t),s=e.isFullScreen||wi(a,t,o,e.intersection.threshold);!e.isInLogicalViewport&&s&&(e.enterTime=n,e.leaveTime=1/0),e.isInLogicalViewport&&!s&&(e.leaveTime=n),e.isInViewport=i,e.isInLogicalViewport=s;let c=i&&n-e.leaveTime<=e.release;if(c&&!e.chain&&e.passes.length>0){let t=e.passes[0].uniforms;t.intersection.value=o,t.enterTime.value=n-e.enterTime,t.leaveTime.value=n-e.leaveTime}return{isVisible:c,intersection:o,rectWithOverflow:r}},pi=function(e){return e in s?s[e]:e},mi=function(e,t,n,r,i){let a=B(this,Mr,`f`);i&&t!==null&&t!==B(this,W,`f`)&&(a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.viewport(0,0,t.width,t.height),a.clear(a.COLOR_BUFFER_BIT));let o=r.viewport;o&&o.value instanceof Me&&o.value.set(n.x*B(this,K,`f`),n.y*B(this,K,`f`),n.w*B(this,K,`f`),n.h*B(this,K,`f`));try{Xe(a,B(this,Nr,`f`),e,t,n,B(this,Jr,`f`)[0],B(this,Jr,`f`)[1],B(this,K,`f`))}catch(e){console.error(e)}},hi=function(e,t,n){let r=e.passes[0].uniforms.offset.value;r.x=t*B(this,K,`f`),r.y=n*B(this,K,`f`)},gi=function(e){let t=e.length===1&&!(`frag`in e[0])?e[0]:null;if(t&&t.effect!==void 0){B(this,V,`m`,_i).call(this,t,t.effect);return}let n=[],r=[];for(let t of e)`frag`in t&&r.push(t);for(let e=0;e<r.length-1;e++)r[e].target||(r[e]={...r[e],target:`pass${e}`});for(let t of e){let e,r,i;if(`frag`in t)e=t.frag,r=new wr(B(this,H,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,t.size,t.target!==void 0,t.glslVersion),i=t.target;else{if(t.shader===void 0)throw Error("VFXPostEffect requires `shader` (the `effect` path is not implemented yet).");e=B(this,V,`m`,pi).call(this,t.shader),r=new wr(B(this,H,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,void 0,!1,t.glslVersion),t.persistent&&r.registerBufferUniform(`backbuffer`),i=void 0}n.push(e);let a={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`&&(a[e]=n);B(this,Fr,`f`).push({pass:r,target:i,generators:a})}for(let e of r)e.target&&B(this,Ir,`f`).set(e.target,void 0);let i=B(this,Fr,`f`).map(e=>e.target).filter(e=>e!==void 0);for(let e=0;e<B(this,Fr,`f`).length;e++)for(let t of i)n[e].match(RegExp(`uniform\\s+sampler2D\\s+${t}\\b`))&&B(this,Fr,`f`)[e].pass.registerBufferUniform(t)},_i=function(e,t){e.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified on post-effect; `effect` takes precedence.");let n=Array.isArray(t)?[...t]:[t];B(this,V,`m`,li).call(this,n);let r=on(()=>{let e=B(this,W,`f`);if(!e)throw Error(`[VFX-JS] post-effect chain active without target`);return e.texture},()=>B(this,W,`f`)?.width??0,()=>B(this,W,`f`)?.height??0),i={autoCrop:!0,glslVersion:e.glslVersion??`300 es`},a=new Un(B(this,H,`f`),B(this,Nr,`f`),B(this,K,`f`),n,i,r,!0,B(this,Pr,`f`));if(e.uniforms)for(let[t,n]of Object.entries(e.uniforms))typeof n==`function`?(B(this,Br,`f`)[t]=n,B(this,zr,`f`)[t]=n()):B(this,zr,`f`)[t]=n;z(this,G,a,`f`),z(this,Vr,B(this,Ur,`f`),`f`),a.initAll().then(()=>{B(this,G,`f`)===a&&z(this,Lr,!0,`f`)}).catch(e=>{console.error(`[VFX-JS] Post-effect init failed; post-effect disabled:`,e),B(this,G,`f`)===a&&(B(this,V,`m`,ui).call(this,B(this,G,`f`).effects),B(this,G,`f`).dispose(),z(this,G,null,`f`),z(this,Lr,!1,`f`))})},vi=function(e,t){let n=B(this,G,`f`);if(!n)return;let r=B(this,K,`f`),i={...B(this,zr,`f`)};for(let[e,t]of Object.entries(B(this,Br,`f`)))i[e]=t();let a=B(this,J,`f`).right-B(this,J,`f`).left,o=B(this,J,`f`).bottom-B(this,J,`f`).top,s=t-B(this,Vr,`f`);z(this,Vr,t,`f`);let c=[a,o],l=[a*r,o*r],u={x:e.x*r,y:e.y*r,w:e.w*r,h:e.h*r};n.run({time:t,deltaTime:s,mouse:[B(this,Zr,`f`)*r,B(this,Qr,`f`)*r],mouseViewport:[B(this,Zr,`f`)*r,B(this,Qr,`f`)*r],intersection:1,enterTime:0,leaveTime:0,resolvedUniforms:i,canvasSize:c,canvasBufferSize:l,elementSize:c,elementBufferSize:l,elementRectOnCanvasPx:u,finalTarget:null,isVisible:!0})},yi=function(e,t){if(!B(this,W,`f`))return;let n=B(this,W,`f`).texture,r=new Map;for(let{pass:e,target:t}of B(this,Fr,`f`))t&&e.backbuffer&&r.set(t,e.backbuffer.texture);for(let i=0;i<B(this,Fr,`f`).length;i++){let{pass:a,target:o,generators:s}=B(this,Fr,`f`)[i],c=i===B(this,Fr,`f`).length-1,l=B(this,Zr,`f`)+B(this,Yr,`f`),u=B(this,Qr,`f`)+B(this,Xr,`f`),d=a.size;if(d){let[r,i]=d;a.uniforms.src.value=n,a.uniforms.resolution.value.set(r,i),a.uniforms.offset.value.set(0,0),a.uniforms.time.value=t,a.uniforms.mouse.value.set(l/e.w*r,u/e.h*i)}else a.setUniforms(n,B(this,K,`f`),e,t,l,u);a.uniforms.passIndex.value=i,a.updateCustomUniforms(s);for(let[e,t]of r){let n=a.uniforms[e];n&&(n.value=t)}if(c)a.backbuffer?(a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture),B(this,V,`m`,mi).call(this,a.pass,a.backbuffer.target,e,a.uniforms,!0),a.backbuffer.swap(),B(this,U,`f`).setUniforms(a.backbuffer.texture,B(this,K,`f`),e),B(this,V,`m`,mi).call(this,B(this,U,`f`).pass,null,e,B(this,U,`f`).uniforms,!1)):B(this,V,`m`,mi).call(this,a.pass,null,e,a.uniforms,!1);else if(a.backbuffer){a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture);let t=d?we(0,0,d[0]/B(this,K,`f`),d[1]/B(this,K,`f`)):e;B(this,V,`m`,mi).call(this,a.pass,a.backbuffer.target,t,a.uniforms,!0),a.backbuffer.swap(),n=a.backbuffer.texture,o&&r.set(o,a.backbuffer.texture)}else{let t=o??`postEffect${i}`,s=B(this,Ir,`f`).get(t),c=d?d[0]:e.w*B(this,K,`f`),l=d?d[1]:e.h*B(this,K,`f`);(!s||s.width!==c||s.height!==l)&&(s?.dispose(),s=gr(B(this,H,`f`),c,l,{float:a.float}),B(this,Ir,`f`).set(t,s));let u=d?we(0,0,d[0]/B(this,K,`f`),d[1]/B(this,K,`f`)):e;B(this,V,`m`,mi).call(this,a.pass,s,u,a.uniforms,!0),n=s.texture,o&&r.set(o,s.texture)}}},bi=function(e,t){let n=e*B(this,K,`f`),r=t*B(this,K,`f`);(!B(this,W,`f`)||B(this,W,`f`).width!==n||B(this,W,`f`).height!==r)&&(B(this,W,`f`)?.dispose(),z(this,W,gr(B(this,H,`f`),n,r),`f`));for(let{pass:n}of B(this,Fr,`f`))n.persistent&&!n.backbuffer?n.initializeBackbuffer(B(this,H,`f`),e,t,B(this,K,`f`)):n.backbuffer&&n.resizeBackbuffer(e,t)};function Ci(e,t){return t.left<=e.right&&t.right>=e.left&&t.top<=e.bottom&&t.bottom>=e.top}function wi(e,t,n,r){return r===0?Ci(e,t):n>=r}function Ti(e){return e===!0?[!0,dn]:e===void 0?[!1,dn]:[!1,un(e)]}function Ei(e){return{threshold:e?.threshold??0,rootMargin:un(e?.rootMargin??0)}}function Di(e,t){let n=e.source;if(!n)return 0;if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return t===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return t===`w`?n.videoWidth:n.videoHeight;let r=n;return t===`w`?r.width:r.height}function Oi(e){return e===`repeat`?`repeat`:e===`mirror`?`mirror`:`clamp`}function ki(e){if(!e)return[`clamp`,`clamp`];if(Array.isArray(e))return[Oi(e[0]),Oi(e[1])];let t=Oi(e);return[t,t]}function Ai(e,t,n){return Math.max(t,Math.min(n,e))}function ji(e){return!(e instanceof HTMLImageElement||e instanceof HTMLVideoElement||e instanceof HTMLCanvasElement)}function Mi(){try{let e=document.createElement(`canvas`);return(e.getContext(`webgl2`)||e.getContext(`webgl`))!==null}catch{return!1}}var Ni=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Y=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Pi,X,Fi,Ii,Li,Ri,zi,Bi;function Vi(){if(typeof window>`u`)throw`Cannot find 'window'. VFX-JS only runs on the browser.`;if(typeof document>`u`)throw`Cannot find 'document'. VFX-JS only runs on the browser.`}function Hi(e){return{position:e?`fixed`:`absolute`,top:0,left:0,width:`0px`,height:`0px`,"z-index":9999,"pointer-events":`none`}}var Ui=class e{static init(t){try{return new e(t)}catch{return null}}constructor(e={}){if(Pi.add(this),X.set(this,void 0),Fi.set(this,void 0),Ii.set(this,new Map),Vi(),!Mi())throw Error(`[VFX-JS] WebGL is not available in this environment.`);let t=re(e),n=document.createElement(`canvas`),r=Hi(t.fixedCanvas);for(let[e,t]of Object.entries(r))n.style.setProperty(e,t.toString());t.zIndex!==void 0&&n.style.setProperty(`z-index`,t.zIndex.toString()),(t.wrapper??document.body).appendChild(n),Ni(this,Fi,n,`f`),Ni(this,X,new Si(t,n),`f`),t.autoplay&&Y(this,X,`f`).play()}async add(e,t,n){e instanceof HTMLImageElement?await Y(this,Pi,`m`,Li).call(this,e,t):e instanceof HTMLVideoElement?await Y(this,Pi,`m`,Ri).call(this,e,t):e instanceof HTMLCanvasElement?e.hasAttribute(`layoutsubtree`)&&n?await Y(this,X,`f`).addElement(e,t,n):await Y(this,Pi,`m`,zi).call(this,e,t):await Y(this,Pi,`m`,Bi).call(this,e,t)}updateHICTexture(e,t){Y(this,X,`f`).updateHICTexture(e,t)}get maxTextureSize(){return Y(this,X,`f`).maxTextureSize}get canvas(){return Y(this,Fi,`f`)}async addHTML(e,t){if(!ne())return console.warn(`html-in-canvas not supported, falling back to dom-to-canvas`),this.add(e,t);t.overlay!==void 0&&console.warn(`addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.`);let{overlay:n,...r}=t,i=Y(this,Ii,`f`).get(e);i&&Y(this,X,`f`).removeElement(i);let{canvas:a,initialCapture:o}=await b(e,{onCapture:e=>{Y(this,X,`f`).updateHICTexture(a,e)},maxSize:Y(this,X,`f`).maxTextureSize});i=a,Y(this,Ii,`f`).set(e,i),await Y(this,X,`f`).addElement(i,r,o)}remove(e){let t=Y(this,Ii,`f`).get(e);t?(x(t,e),Y(this,Ii,`f`).delete(e),Y(this,X,`f`).removeElement(t)):Y(this,X,`f`).removeElement(e)}updateEffects(e,t){let n=Y(this,Ii,`f`).get(e)??e;return Y(this,X,`f`).updateElementEffects(n,t)}async update(e){let t=Y(this,Ii,`f`).get(e);if(t){t.requestPaint();return}if(e instanceof HTMLImageElement)return Y(this,X,`f`).updateImageElement(e);if(e instanceof HTMLCanvasElement){Y(this,X,`f`).updateCanvasElement(e);return}else return Y(this,X,`f`).updateTextElement(e)}play(){Y(this,X,`f`).play()}stop(){Y(this,X,`f`).stop()}render(){Y(this,X,`f`).render()}get time(){return Y(this,X,`f`).time}setTime(e){Y(this,X,`f`).setTime(e)}get timeScale(){return Y(this,X,`f`).timeScale}set timeScale(e){Y(this,X,`f`).timeScale=e}destroy(){for(let[e,t]of Y(this,Ii,`f`))x(t,e);Y(this,Ii,`f`).clear(),Y(this,X,`f`).destroy(),Y(this,Fi,`f`).remove()}};X=new WeakMap,Fi=new WeakMap,Ii=new WeakMap,Pi=new WeakSet,Li=function(e,t){return e.complete?Y(this,X,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`load`,()=>{Y(this,X,`f`).addElement(e,t),n()},{once:!0})})},Ri=function(e,t){return e.readyState>=3?Y(this,X,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`canplay`,()=>{Y(this,X,`f`).addElement(e,t),n()},{once:!0})})},zi=function(e,t){return Y(this,X,`f`).addElement(e,t)},Bi=function(e,t){return Y(this,X,`f`).addElement(e,t)};var Wi=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
`,Gi=`
const float PI = 3.141592653589793;
float cc(int k){ return k == 0 ? 0.7071067811865476 : 1.0; }
`,Ki=`
vec3 rgb2ycc(vec3 c){
  return vec3(
     0.299*c.r + 0.587*c.g + 0.114*c.b,
    -0.168736*c.r - 0.331264*c.g + 0.5*c.b,
     0.5*c.r - 0.418688*c.g - 0.081312*c.b);
}
vec3 ycc2rgb(vec3 y){
  return vec3(
    y.x + 1.402   * y.z,
    y.x - 0.344136* y.y - 0.714136 * y.z,
    y.x + 1.772   * y.y);
}
`,qi=`
  ivec2 res = textureSize(src, 0);
  ivec2 p   = ivec2(uvSrc * vec2(res));
  ivec2 b   = (p / 8) * 8;
  ivec2 l   = p - b;
`;`${Wi}`,`${Wi}${Gi}${Ki}${qi}`,`${Wi}${Gi}${qi}`,`${Wi}${Gi}${qi}`,`${Wi}${Gi}${Ki}${qi}`,`${Wi}${Ki}`;var Ji=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Z=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Yi,Q,$,Xi,Zi,Qi,$i,ea,ta=`#version 300 es
precision highp float;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform float threshold;
uniform float softness;
uniform float edgeFade;

void main() {
    // Hard-gate sampling to uvSrc in [0,1]: a bare clamp would smear
    // src's edge pixels into the pad (visible as a stretched image
    // when edgeFade x pad reaches past the src buffer). The clamp on
    // texture() keeps the sampler happy; srcMask zeroes what lies
    // outside the actual src content.
    vec2 insideSrc = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    float srcMask = insideSrc.x * insideSrc.y;
    vec3 srgb = texture(src, clamp(uvSrc, 0.0, 1.0)).rgb * srcMask;
    vec3 lin = pow(srgb, vec3(2.2));

    // COD:AW (Jimenez 2014) / Unity HDRP soft-knee brightness
    // response. Quadratic ramp of half-width (threshold * softness)
    // centred on the cutoff — softness gates mid-luma pixels on
    // BOTH sides of threshold, so raising it *widens* the bloom
    // (the previous one-sided smoothstep did the opposite).
    // softness=0 collapses to a hard threshold; softness=1 extends
    // the knee down to zero. br uses max-channel (COD convention)
    // so saturated primaries still trigger bloom where a Rec.709
    // luma would have hidden them.
    float br = max(max(lin.r, lin.g), lin.b);
    float knee = threshold * softness;
    float rq = clamp(br - threshold + knee, 0.0, 2.0 * knee);
    rq = rq * rq / (4.0 * knee + 1e-4);
    float contribution = max(rq, br - threshold) / max(br, 1e-4);

    // Chebyshev distance outside the inner rect in uvContent units;
    // 0 inside, positive in the pad region.
    vec2 outside = max(vec2(0.0), max(-uvContent, uvContent - 1.0));
    float outDist = max(outside.x, outside.y);
    float mask = 1.0 - smoothstep(0.0, edgeFade, outDist);
    float f = contribution * mask;

    outColor = vec4(lin * f, f);
}
`,na=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
uniform vec2 texelSize;
uniform int karis;

vec4 s(vec2 o) { return texture(src, uv + o); }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main() {
    vec2 t = texelSize;
    vec4 a = s(vec2(-2.0 * t.x, -2.0 * t.y));
    vec4 b = s(vec2( 0.0,       -2.0 * t.y));
    vec4 c = s(vec2( 2.0 * t.x, -2.0 * t.y));
    vec4 d = s(vec2(-2.0 * t.x,  0.0));
    vec4 e = s(vec2( 0.0,        0.0));
    vec4 f = s(vec2( 2.0 * t.x,  0.0));
    vec4 g = s(vec2(-2.0 * t.x,  2.0 * t.y));
    vec4 h = s(vec2( 0.0,        2.0 * t.y));
    vec4 i = s(vec2( 2.0 * t.x,  2.0 * t.y));
    vec4 j = s(vec2(-1.0 * t.x, -1.0 * t.y));
    vec4 k = s(vec2( 1.0 * t.x, -1.0 * t.y));
    vec4 l = s(vec2(-1.0 * t.x,  1.0 * t.y));
    vec4 m = s(vec2( 1.0 * t.x,  1.0 * t.y));

    vec4 box1 = (a + b + d + e) * 0.25;
    vec4 box2 = (b + c + e + f) * 0.25;
    vec4 box3 = (d + e + g + h) * 0.25;
    vec4 box4 = (e + f + h + i) * 0.25;
    vec4 box5 = (j + k + l + m) * 0.25;

    vec4 color;
    if (karis == 1) {
        float w1 = 1.0 / (1.0 + luma(box1.rgb));
        float w2 = 1.0 / (1.0 + luma(box2.rgb));
        float w3 = 1.0 / (1.0 + luma(box3.rgb));
        float w4 = 1.0 / (1.0 + luma(box4.rgb));
        float w5 = 1.0 / (1.0 + luma(box5.rgb));
        color = (box1 * w1 + box2 * w2 + box3 * w3 + box4 * w4 + box5 * w5)
              / (w1 + w2 + w3 + w4 + w5);
    } else {
        color = box1 * 0.125 + box2 * 0.125 + box3 * 0.125 + box4 * 0.125
              + box5 * 0.5;
    }
    outColor = color;
}
`,ra=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D srcSmall;
uniform sampler2D srcLarge;
uniform vec2 texelSize;
uniform float weightLarge;
uniform float weightSmall;

void main() {
    vec2 t = texelSize;
    vec4 sum = vec4(0.0);
    sum += texture(srcSmall, uv + vec2(-t.x, -t.y)) * 1.0;
    sum += texture(srcSmall, uv + vec2( 0.0, -t.y)) * 2.0;
    sum += texture(srcSmall, uv + vec2( t.x, -t.y)) * 1.0;
    sum += texture(srcSmall, uv + vec2(-t.x,  0.0)) * 2.0;
    sum += texture(srcSmall, uv                  ) * 4.0;
    sum += texture(srcSmall, uv + vec2( t.x,  0.0)) * 2.0;
    sum += texture(srcSmall, uv + vec2(-t.x,  t.y)) * 1.0;
    sum += texture(srcSmall, uv + vec2( 0.0,  t.y)) * 2.0;
    sum += texture(srcSmall, uv + vec2( t.x,  t.y)) * 1.0;
    sum *= (1.0 / 16.0);
    outColor = texture(srcLarge, uv) * weightLarge + sum * weightSmall;
}
`,ia=`#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D bloom;
uniform vec2 texelSize;
uniform float intensity;
uniform float dither;
uniform float edgeFade;

// Interleaved gradient noise (Jimenez 2014). Cheap, high-quality,
// spatially decorrelated — perfect for breaking 8-bit quantisation
// bands in the gamma-encoded bloom halo.
float ign(vec2 p) {
    return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

void main() {
    // 5×5 binomial gaussian ([1,4,6,4,1]/16 outer-producted) via 9
    // bilinear taps at ±1.2 source texels. Each bilinear fetch
    // integrates a tap-pair perfectly, so result ≡ 25-tap convolution.
    vec2 t = texelSize * 1.2;
    vec4 b = vec4(0.0);
    b += texture(bloom, uv + vec2(-t.x, -t.y)) * 25.0;
    b += texture(bloom, uv + vec2( 0.0, -t.y)) * 30.0;
    b += texture(bloom, uv + vec2( t.x, -t.y)) * 25.0;
    b += texture(bloom, uv + vec2(-t.x,  0.0)) * 30.0;
    b += texture(bloom, uv                  ) * 36.0;
    b += texture(bloom, uv + vec2( t.x,  0.0)) * 30.0;
    b += texture(bloom, uv + vec2(-t.x,  t.y)) * 25.0;
    b += texture(bloom, uv + vec2( 0.0,  t.y)) * 30.0;
    b += texture(bloom, uv + vec2( t.x,  t.y)) * 25.0;
    b *= (1.0 / 256.0);

    // Same soft edge-fade as threshold so base and bloom share a
    // coverage footprint — base alpha tapers into the pad instead of
    // stepping from 1 to 0. The hard srcMask (same shape as the
    // threshold pass) kills anything outside src's valid [0,1] so
    // bloom pad extending past the src buffer doesn't repeat edge
    // pixels.
    vec2 insideSrc = step(vec2(0.0), uvSrc) * step(uvSrc, vec2(1.0));
    float srcMask = insideSrc.x * insideSrc.y;
    vec4 baseColor = texture(src, clamp(uvSrc, 0.0, 1.0)) * srcMask;
    vec2 outside = max(vec2(0.0), max(-uvContent, uvContent - 1.0));
    float outDist = max(outside.x, outside.y);
    float baseMask = 1.0 - smoothstep(0.0, edgeFade, outDist);
    baseColor.a *= baseMask;

    // Linear composite: decode base, add linear bloom, single pow out.
    vec3 baseLin = pow(baseColor.rgb, vec3(2.2));
    vec3 lin = baseLin + max(b.rgb, vec3(0.0)) * intensity;
    vec3 rgb = pow(max(lin, vec3(0.0)), vec3(1.0 / 2.2));

    // TPDF dither just before 8-bit quantisation. Two IGN samples
    // summed give a triangular PDF in [-1, 1], which decorrelates the
    // quantisation error from the signal (uniform dither doesn't).
    // Independent per channel to avoid tinted bands.
    vec3 n1 = vec3(
        ign(gl_FragCoord.xy),
        ign(gl_FragCoord.xy + 17.0),
        ign(gl_FragCoord.xy + 41.0)
    );
    vec3 n2 = vec3(
        ign(gl_FragCoord.xy + 113.0),
        ign(gl_FragCoord.xy + 131.0),
        ign(gl_FragCoord.xy + 149.0)
    );
    vec3 n = n1 + n2 - 1.0;
    rgb += n * dither / 255.0;

    // Premultiply with the union coverage of base and bloom. At pad
    // edges both feed zero so rgb × a → 0 and the halo dissolves
    // instead of leaving a gamma-boosted floor behind.
    float a = clamp(max(baseColor.a, b.a * intensity), 0.0, 1.0);
    outColor = vec4(rgb * a, a);
}
`,aa={threshold:.7,softness:.1,intensity:1.2,scatter:.7,pad:50,dither:0,edgeFade:.02},oa=.5,sa=class{constructor(e={}){Yi.add(this),Q.set(this,null),$.set(this,[]),Xi.set(this,[]),Zi.set(this,!1),Qi.set(this,0),$i.set(this,0),this.params={...aa,...e}}setParams(e){Object.assign(this.params,e)}init(e){Ji(this,Q,e.createRenderTarget({float:!0}),`f`)}render(e){if(!Z(this,Q,`f`))return;let{threshold:t,softness:n,intensity:r}=this.params,i=Math.min(Math.max(this.params.scatter,0),1),a=Math.max(0,this.params.dither),o=Math.max(1e-6,this.params.edgeFade);(Z(this,Q,`f`).width!==Z(this,Qi,`f`)||Z(this,Q,`f`).height!==Z(this,$i,`f`))&&(Z(this,$,`f`).length=0,Z(this,Xi,`f`).length=0,Ji(this,Zi,!1,`f`),Ji(this,Qi,Z(this,Q,`f`).width,`f`),Ji(this,$i,Z(this,Q,`f`).height,`f`)),Z(this,Yi,`m`,ea).call(this,e,Z(this,Q,`f`).width,Z(this,Q,`f`).height);let s=Z(this,$,`f`).length;if(s===0)return;e.draw({frag:ta,uniforms:{src:e.src,threshold:t,softness:n,edgeFade:o},target:Z(this,Q,`f`)}),e.draw({frag:na,uniforms:{src:Z(this,Q,`f`),texelSize:[1/Z(this,Q,`f`).width,1/Z(this,Q,`f`).height],karis:1},target:Z(this,$,`f`)[0]});for(let t=1;t<s;t++){let n=Z(this,$,`f`)[t-1];e.draw({frag:na,uniforms:{src:n,texelSize:[1/n.width,1/n.height],karis:0},target:Z(this,$,`f`)[t]})}let c=Z(this,Q,`f`).width,l=Z(this,Q,`f`).height,u=1+i*Math.max(0,s-1),d=e=>Math.min(1,Math.max(0,u-e));for(let t=s-2;t>=0;t--){let n=t===s-2?Z(this,$,`f`)[s-1]:Z(this,Xi,`f`)[t+1],r=2**(t+2),i=t===s-2?d(s-1):1;e.draw({frag:ra,uniforms:{srcSmall:n,srcLarge:Z(this,$,`f`)[t],texelSize:[oa*r/c,oa*r/l],weightLarge:d(t),weightSmall:i},target:Z(this,Xi,`f`)[t]})}let f=s>=2?Z(this,Xi,`f`)[0]:Z(this,$,`f`)[0],p=r/Math.max(1,u);e.draw({frag:ia,uniforms:{src:e.src,bloom:f,texelSize:[oa*2/c,oa*2/l],intensity:p,dither:a,edgeFade:o},target:e.target})}outputRect(e){let{pad:t}=this.params;if(t===`fullscreen`)return e.canvasRect;let n=t*e.pixelRatio,[,,r,i]=e.contentRect;return[-n,-n,r+2*n,i+2*n]}dispose(){Ji(this,Q,null,`f`),Z(this,$,`f`).length=0,Z(this,Xi,`f`).length=0,Ji(this,Zi,!1,`f`),Ji(this,Qi,0,`f`),Ji(this,$i,0,`f`)}};Q=new WeakMap,$=new WeakMap,Xi=new WeakMap,Zi=new WeakMap,Qi=new WeakMap,$i=new WeakMap,Yi=new WeakSet,ea=function(e,t,n){if(Z(this,Zi,`f`))return;let r=Math.max(1,Math.floor(t/2)),i=Math.max(1,Math.floor(n/2));for(let t=0;t<8;t++){Z(this,$,`f`).push(e.createRenderTarget({size:[r,i],float:!0}));let t=Math.max(1,Math.floor(r/2)),n=Math.max(1,Math.floor(i/2));if(t===r&&n===i)break;r=t,i=n}for(let t=0;t<Z(this,$,`f`).length-1;t++)Z(this,Xi,`f`).push(e.createRenderTarget({size:[Z(this,$,`f`)[t].width,Z(this,$,`f`)[t].height],float:!0}));Ji(this,Zi,!0,`f`)};var ca=`
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
`,la=`
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec2 chroma(vec3 c) {
    return vec2(dot(c, vec3(-0.168736, -0.331264, 0.5)),
                dot(c, vec3(0.5, -0.418688, -0.081312))) + 0.5;
}
`;`${la}`,`${la}`,`${la}`;var ua={pure:{cyan:[0,1,1,1],magenta:[1,0,1,1],yellow:[1,1,0,1],black:[0,0,0,1],red:[1,0,0,1],green:[0,1,0,1],blue:[0,0,1,1]},newsprint:{cyan:[.15,.73,.88,1],magenta:[.88,.12,.55,1],yellow:[.97,.93,.08,1],black:[.1,.1,.1,1]},fogra51:{cyan:[0,.525,.765,1],magenta:[.827,0,.486,1],yellow:[.984,.91,0,1],black:[.145,.145,.145,1]},swop:{cyan:[0,.557,.769,1],magenta:[.827,.02,.478,1],yellow:[.984,.902,.027,1],black:[.169,.169,.169,1]}};({...ua.pure,...ua.newsprint});var da=.7,fa=1.3,pa=`
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
float mod289(float x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
float permute(float x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float taylorInvSqrt(float r) { return 1.79284291400159 - 0.85373472095314 * r; }

vec4 grad4(float j, vec4 ip) {
    const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
    vec4 p, s;
    p.xyz = floor(fract(vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
    p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
    s = vec4(lessThan(p, vec4(0.0)));
    p.xyz = p.xyz + (s.xyz * 2.0 - 1.0) * s.www;
    return p;
}

float snoise(vec4 v) {
    const vec2 C = vec2(0.138196601125010504,
                        0.309016994374947451);
    vec4 i = floor(v + dot(v, C.yyyy));
    vec4 x0 = v - i + dot(i, C.xxxx);
    vec4 i0;
    vec3 isX = step(x0.yzw, x0.xxx);
    vec3 isYZ = step(x0.zww, x0.yyz);
    i0.x = isX.x + isX.y + isX.z;
    i0.yzw = 1.0 - isX;
    i0.y += isYZ.x + isYZ.y;
    i0.zw += 1.0 - isYZ.xy;
    i0.z += isYZ.z;
    i0.w += 1.0 - isYZ.z;
    vec4 i3 = clamp(i0, 0.0, 1.0);
    vec4 i2 = clamp(i0 - 1.0, 0.0, 1.0);
    vec4 i1 = clamp(i0 - 2.0, 0.0, 1.0);
    vec4 x1 = x0 - i1 + 1.0 * C.xxxx;
    vec4 x2 = x0 - i2 + 2.0 * C.xxxx;
    vec4 x3 = x0 - i3 + 3.0 * C.xxxx;
    vec4 x4 = x0 - 1.0 + 4.0 * C.xxxx;
    i = mod289(i);
    float j0 = permute(
        permute(permute(permute(i.w) + i.z) + i.y) + i.x
    );
    vec4 j1 = permute(
        permute(
            permute(
                permute(i.w + vec4(i1.w, i2.w, i3.w, 1.0))
                + i.z + vec4(i1.z, i2.z, i3.z, 1.0)
            )
            + i.y + vec4(i1.y, i2.y, i3.y, 1.0)
        )
        + i.x + vec4(i1.x, i2.x, i3.x, 1.0)
    );
    vec4 ip = vec4(1.0 / 294.0, 1.0 / 49.0, 1.0 / 7.0, 0.0);
    vec4 p0 = grad4(j0,   ip);
    vec4 p1 = grad4(j1.x, ip);
    vec4 p2 = grad4(j1.y, ip);
    vec4 p3 = grad4(j1.z, ip);
    vec4 p4 = grad4(j1.w, ip);
    vec4 norm = taylorInvSqrt(vec4(
        dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)
    ));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    p4 *= taylorInvSqrt(dot(p4, p4));
    vec3 m0 = max(0.6 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2)), 0.0);
    vec2 m1 = max(0.6 - vec2(dot(x3, x3), dot(x4, x4)), 0.0);
    m0 = m0 * m0;
    m1 = m1 * m1;
    return 49.0 * (
        dot(m0 * m0, vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2)))
        + dot(m1 * m1, vec2(dot(p3, x3), dot(p4, x4)))
    );
}

vec3 curl3D(vec3 p, float t) {
    float eps = 0.01;
    vec4 dx = vec4(eps, 0.0, 0.0, 0.0);
    vec4 dy = vec4(0.0, eps, 0.0, 0.0);
    vec4 dz = vec4(0.0, 0.0, eps, 0.0);
    vec4 pa = vec4(p,                                          t);
    vec4 pb = vec4(p + vec3(31.341, 47.853, 19.287),           t);
    vec4 pc = vec4(p + vec3(83.519, 71.523, 53.819),           t);
    float dPzdy = snoise(pc + dy) - snoise(pc - dy);
    float dPydz = snoise(pb + dz) - snoise(pb - dz);
    float dPxdz = snoise(pa + dz) - snoise(pa - dz);
    float dPzdx = snoise(pc + dx) - snoise(pc - dx);
    float dPydx = snoise(pb + dx) - snoise(pb - dx);
    float dPxdy = snoise(pa + dy) - snoise(pa - dy);
    return vec3(dPzdy - dPydz, dPxdz - dPzdx, dPydx - dPxdy) / (2.0 * eps);
}

// Aspect-corrected curl sampler. stretch maps element px so the noise
// grid is isotropic in screen space; the inverse scaling on the output
// keeps the velocity field circular regardless of element aspect.
vec3 sampleCurl(vec3 pos, vec2 elementPixel, float scale, float animTime) {
    float shortAxis = min(elementPixel.x, elementPixel.y);
    vec3 stretch = vec3(elementPixel / shortAxis, 1.0);
    vec3 noiseInput = pos * stretch / max(scale, 1e-4);
    return curl3D(noiseInput, animTime) / stretch;
}
`;new Float32Array([-.5,-.5,.5,-.5,.5,.5,-.5,-.5,.5,.5,-.5,.5]);var ma=`
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`,ha=64,ga=ha*ha,_a=new Float32Array(ga);for(let e=0;e<ga;e++)_a[e]=e;`${pa}`,`${ma}`,`${ma}${pa}${da.toFixed(4)}${fa.toFixed(4)}`,`${ma}`,`${ca}`,`${ca}`;var va=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform vec2 cellUv;

void main() {
    vec4 c = vec4(0.0);
    if (uvContent.x >= 0.0 && uvContent.x <= 1.0 &&
        uvContent.y >= 0.0 && uvContent.y <= 1.0) {
        // Snap to cell centers in dst inner UV, then remap into src
        // inner region via srcRectUv so sampling is correct whether
        // src is capture or a prior stage's padded intermediate.
        vec2 cell = (floor(uvContent / cellUv) + 0.5) * cellUv;
        vec2 uv = srcRectUv.xy + clamp(cell, 0.0, 1.0) * srcRectUv.zw;
        c = texture(src, uv);
    }
    outColor = c;
}
`,ya={size:10},ba=class{constructor(e={}){this.params={...ya,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element,{size:r}=this.params;e.draw({frag:va,uniforms:{src:e.src,cellUv:[r/(t||1),r/(n||1)]},target:e.target})}},xa=`
float key(vec3 c, int mode) {
    if (mode == 0) return dot(c, vec3(0.299, 0.587, 0.114));
    if (mode == 1) return c.r;
    if (mode == 2) return c.g;
    if (mode == 3) return c.b;
    float mx = max(max(c.r, c.g), c.b);
    float mn = min(min(c.r, c.g), c.b);
    float d  = mx - mn;
    if (mode == 5) return mx > 0.0 ? d / mx : 0.0;
    if (d < 1e-5) return 0.0;
    float h;
    if (mx == c.r)      h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    else if (mx == c.g) h = (c.b - c.r) / d + 2.0;
    else                h = (c.r - c.g) / d + 4.0;
    return h / 6.0;
}
`,Sa=`
ivec2 toXY(int a, int b, int axis) { return axis == 0 ? ivec2(a, b) : ivec2(b, a); }

// Map a box point (centred coords) back into source pixel space — the same
// box -> source rotation rotate-in uses.
vec2 boxToSrc(vec2 boxPx, vec2 imgSize, vec2 rot) {
    vec2 dSrc = vec2(rot.x * boxPx.x + rot.y * boxPx.y, -rot.y * boxPx.x + rot.x * boxPx.y);
    return dSrc + imgSize * 0.5;
}

// Rotated path: does the low-res cell (a along axis, b across) overlap the
// source rect? Run membership is LENIENT — the bound is grown by one cell so a
// boundary cell straddling the source edge still counts as inside. That keeps
// every full-res inside pixel backed by a sorted cell; the crisp edge is
// reimposed per output pixel in the gather (see boxToSrc clip). Without the
// slack, boundary cells fall out of the run at coarse sortRes and the gather
// shows the original image in a staircase along the edge.
bool insideSrc(int a, int b, int axis, vec2 lowSize, vec2 boxSize, vec2 imgSize, vec2 rot) {
    vec2 boxPx = (vec2(toXY(a, b, axis)) + 0.5) / lowSize * boxSize - boxSize * 0.5;
    vec2 sp = boxToSrc(boxPx, imgSize, rot);
    float m = axis == 0 ? boxSize.x / lowSize.x : boxSize.y / lowSize.y;
    return sp.x >= -m && sp.x <= imgSize.x + m && sp.y >= -m && sp.y <= imgSize.y + m;
}

// A cell belongs to a sort run when it is inside the source AND its key falls
// in the [lo, hi] band. Both ends are inclusive so the defaults lo == 0 /
// hi == 1 keep every source pixel instead of dropping pure-black or pure-white
// ones. In the rotated path the source bound comes from \`insideSrc\`
// (coordinate), decoupled from the band, so the run never extends into padding.
bool runActive(sampler2D s, int a, int b, int axis, int keyMode, float lo, float hi, int masked, vec2 lowSize, vec2 boxSize, vec2 imgSize, vec2 rot) {
    if (masked == 1 && !insideSrc(a, b, axis, lowSize, boxSize, imgSize, rot)) return false;
    float k = key(texelFetch(s, toXY(a, b, axis), 0).rgb, keyMode);
    return k >= lo && k <= hi;
}

void scanSegment(sampler2D s, int a, int b, int L, int keyMode, float lo, float hi, int axis, int masked, vec2 lowSize, vec2 boxSize, vec2 imgSize, vec2 rot, out int segStart, out int segEnd) {
    segStart = a;
    for (int i = 0; i < 8192; i++) {
        if (segStart <= 0) break;
        if (i >= L) break;
        if (!runActive(s, segStart - 1, b, axis, keyMode, lo, hi, masked, lowSize, boxSize, imgSize, rot)) break;
        segStart--;
    }
    segEnd = a + 1;
    for (int i = 0; i < 8192; i++) {
        if (segEnd >= L) break;
        if (i >= L) break;
        if (!runActive(s, segEnd, b, axis, keyMode, lo, hi, masked, lowSize, boxSize, imgSize, rot)) break;
        segEnd++;
    }
}
`;`${xa}${Sa}`,`${xa}${Sa}`;var Ca=`#version 300 es
precision highp float;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform float innerHeight;
uniform float spacing;

void main() {
    vec4 c = vec4(0.0);
    if (uvContent.x >= 0.0 && uvContent.x <= 1.0 &&
        uvContent.y >= 0.0 && uvContent.y <= 1.0) {
        // Keep one 1-px line per spacing-px band; rest goes black.
        float yPx = uvContent.y * innerHeight;
        if (mod(floor(yPx), spacing) < 1.0) {
            c = texture(src, uvSrc);
        }
    }
    outColor = c;
}
`,wa={spacing:4},Ta=class{constructor(e={}){this.params={...wa,...e}}setParams(e){Object.assign(this.params,e)}render(e){let{spacing:t}=this.params;e.draw({frag:Ca,uniforms:{src:e.src,innerHeight:e.dims.element[1]||1,spacing:t},target:e.target})}};`${ca}`,`${ca}`;var Ea=e(t(((e,t)=>{var n=function(e){var t=/(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i,n=0,r={},i={manual:e.Prism&&e.Prism.manual,disableWorkerMessageHandler:e.Prism&&e.Prism.disableWorkerMessageHandler,util:{encode:function e(t){return t instanceof a?new a(t.type,e(t.content),t.alias):Array.isArray(t)?t.map(e):t.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/\u00a0/g,` `)},type:function(e){return Object.prototype.toString.call(e).slice(8,-1)},objId:function(e){return e.__id||Object.defineProperty(e,`__id`,{value:++n}),e.__id},clone:function e(t,n){n||={};var r,a;switch(i.util.type(t)){case`Object`:if(a=i.util.objId(t),n[a])return n[a];for(var o in r={},n[a]=r,t)t.hasOwnProperty(o)&&(r[o]=e(t[o],n));return r;case`Array`:return a=i.util.objId(t),n[a]?n[a]:(r=[],n[a]=r,t.forEach(function(t,i){r[i]=e(t,n)}),r);default:return t}},getLanguage:function(e){for(;e;){var n=t.exec(e.className);if(n)return n[1].toLowerCase();e=e.parentElement}return`none`},setLanguage:function(e,n){e.className=e.className.replace(RegExp(t,`gi`),``),e.classList.add(`language-`+n)},currentScript:function(){if(typeof document>`u`)return null;if(document.currentScript&&document.currentScript.tagName===`SCRIPT`)return document.currentScript;try{throw Error()}catch(r){var e=(/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(r.stack)||[])[1];if(e){var t=document.getElementsByTagName(`script`);for(var n in t)if(t[n].src==e)return t[n]}return null}},isActive:function(e,t,n){for(var r=`no-`+t;e;){var i=e.classList;if(i.contains(t))return!0;if(i.contains(r))return!1;e=e.parentElement}return!!n}},languages:{plain:r,plaintext:r,text:r,txt:r,extend:function(e,t){var n=i.util.clone(i.languages[e]);for(var r in t)n[r]=t[r];return n},insertBefore:function(e,t,n,r){r||=i.languages;var a=r[e],o={};for(var s in a)if(a.hasOwnProperty(s)){if(s==t)for(var c in n)n.hasOwnProperty(c)&&(o[c]=n[c]);n.hasOwnProperty(s)||(o[s]=a[s])}var l=r[e];return r[e]=o,i.languages.DFS(i.languages,function(t,n){n===l&&t!=e&&(this[t]=o)}),o},DFS:function e(t,n,r,a){a||={};var o=i.util.objId;for(var s in t)if(t.hasOwnProperty(s)){n.call(t,s,t[s],r||s);var c=t[s],l=i.util.type(c);l===`Object`&&!a[o(c)]?(a[o(c)]=!0,e(c,n,null,a)):l===`Array`&&!a[o(c)]&&(a[o(c)]=!0,e(c,n,s,a))}}},plugins:{},highlightAll:function(e,t){i.highlightAllUnder(document,e,t)},highlightAllUnder:function(e,t,n){var r={callback:n,container:e,selector:`code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code`};i.hooks.run(`before-highlightall`,r),r.elements=Array.prototype.slice.apply(r.container.querySelectorAll(r.selector)),i.hooks.run(`before-all-elements-highlight`,r);for(var a=0,o;o=r.elements[a++];)i.highlightElement(o,t===!0,r.callback)},highlightElement:function(t,n,r){var a=i.util.getLanguage(t),o=i.languages[a];i.util.setLanguage(t,a);var s=t.parentElement;s&&s.nodeName.toLowerCase()===`pre`&&i.util.setLanguage(s,a);var c={element:t,language:a,grammar:o,code:t.textContent};function l(e){c.highlightedCode=e,i.hooks.run(`before-insert`,c),c.element.innerHTML=c.highlightedCode,i.hooks.run(`after-highlight`,c),i.hooks.run(`complete`,c),r&&r.call(c.element)}if(i.hooks.run(`before-sanity-check`,c),s=c.element.parentElement,s&&s.nodeName.toLowerCase()===`pre`&&!s.hasAttribute(`tabindex`)&&s.setAttribute(`tabindex`,`0`),!c.code){i.hooks.run(`complete`,c),r&&r.call(c.element);return}if(i.hooks.run(`before-highlight`,c),!c.grammar){l(i.util.encode(c.code));return}if(n&&e.Worker){var u=new Worker(i.filename);u.onmessage=function(e){l(e.data)},u.postMessage(JSON.stringify({language:c.language,code:c.code,immediateClose:!0}))}else l(i.highlight(c.code,c.grammar,c.language))},highlight:function(e,t,n){var r={code:e,grammar:t,language:n};if(i.hooks.run(`before-tokenize`,r),!r.grammar)throw Error(`The language "`+r.language+`" has no grammar.`);return r.tokens=i.tokenize(r.code,r.grammar),i.hooks.run(`after-tokenize`,r),a.stringify(i.util.encode(r.tokens),r.language)},tokenize:function(e,t){var n=t.rest;if(n){for(var r in n)t[r]=n[r];delete t.rest}var i=new c;return l(i,i.head,e),s(e,i,t,i.head,0),d(i)},hooks:{all:{},add:function(e,t){var n=i.hooks.all;n[e]=n[e]||[],n[e].push(t)},run:function(e,t){var n=i.hooks.all[e];if(!(!n||!n.length))for(var r=0,a;a=n[r++];)a(t)}},Token:a};e.Prism=i;function a(e,t,n,r){this.type=e,this.content=t,this.alias=n,this.length=(r||``).length|0}a.stringify=function e(t,n){if(typeof t==`string`)return t;if(Array.isArray(t)){var r=``;return t.forEach(function(t){r+=e(t,n)}),r}var a={type:t.type,content:e(t.content,n),tag:`span`,classes:[`token`,t.type],attributes:{},language:n},o=t.alias;o&&(Array.isArray(o)?Array.prototype.push.apply(a.classes,o):a.classes.push(o)),i.hooks.run(`wrap`,a);var s=``;for(var c in a.attributes)s+=` `+c+`="`+(a.attributes[c]||``).replace(/"/g,`&quot;`)+`"`;return`<`+a.tag+` class="`+a.classes.join(` `)+`"`+s+`>`+a.content+`</`+a.tag+`>`};function o(e,t,n,r){e.lastIndex=t;var i=e.exec(n);if(i&&r&&i[1]){var a=i[1].length;i.index+=a,i[0]=i[0].slice(a)}return i}function s(e,t,n,r,c,d){for(var f in n)if(!(!n.hasOwnProperty(f)||!n[f])){var p=n[f];p=Array.isArray(p)?p:[p];for(var m=0;m<p.length;++m){if(d&&d.cause==f+`,`+m)return;var h=p[m],g=h.inside,_=!!h.lookbehind,v=!!h.greedy,y=h.alias;if(v&&!h.pattern.global){var ee=h.pattern.toString().match(/[imsuy]*$/)[0];h.pattern=RegExp(h.pattern.source,ee+`g`)}for(var te=h.pattern||h,b=r.next,x=c;b!==t.tail&&!(d&&x>=d.reach);x+=b.value.length,b=b.next){var S=b.value;if(t.length>e.length)return;if(!(S instanceof a)){var ne=1,re;if(v){if(re=o(te,x,e,_),!re||re.index>=e.length)break;var ie=re.index,ae=re.index+re[0].length,C=x;for(C+=b.value.length;ie>=C;)b=b.next,C+=b.value.length;if(C-=b.value.length,x=C,b.value instanceof a)continue;for(var oe=b;oe!==t.tail&&(C<ae||typeof oe.value==`string`);oe=oe.next)ne++,C+=oe.value.length;ne--,S=e.slice(x,C),re.index-=x}else if(re=o(te,0,S,_),!re)continue;var ie=re.index,se=re[0],ce=S.slice(0,ie),le=S.slice(ie+se.length),ue=x+S.length;d&&ue>d.reach&&(d.reach=ue);var de=b.prev;ce&&(de=l(t,de,ce),x+=ce.length),u(t,de,ne);var fe=new a(f,g?i.tokenize(se,g):se,y,se);if(b=l(t,de,fe),le&&l(t,b,le),ne>1){var w={cause:f+`,`+m,reach:ue};s(e,t,n,b.prev,x,w),d&&w.reach>d.reach&&(d.reach=w.reach)}}}}}}function c(){var e={value:null,prev:null,next:null},t={value:null,prev:e,next:null};e.next=t,this.head=e,this.tail=t,this.length=0}function l(e,t,n){var r=t.next,i={value:n,prev:t,next:r};return t.next=i,r.prev=i,e.length++,i}function u(e,t,n){for(var r=t.next,i=0;i<n&&r!==e.tail;i++)r=r.next;t.next=r,r.prev=t,e.length-=i}function d(e){for(var t=[],n=e.head.next;n!==e.tail;)t.push(n.value),n=n.next;return t}if(!e.document)return e.addEventListener&&(i.disableWorkerMessageHandler||e.addEventListener(`message`,function(t){var n=JSON.parse(t.data),r=n.language,a=n.code,o=n.immediateClose;e.postMessage(i.highlight(a,i.languages[r],r)),o&&e.close()},!1)),i;var f=i.util.currentScript();f&&(i.filename=f.src,f.hasAttribute(`data-manual`)&&(i.manual=!0));function p(){i.manual||i.highlightAll()}if(!i.manual){var m=document.readyState;m===`loading`||m===`interactive`&&f&&f.defer?document.addEventListener(`DOMContentLoaded`,p):window.requestAnimationFrame?window.requestAnimationFrame(p):window.setTimeout(p,16)}return i}(typeof window<`u`?window:typeof WorkerGlobalScope<`u`&&self instanceof WorkerGlobalScope?self:{});t!==void 0&&t.exports&&(t.exports=n),typeof global<`u`&&(global.Prism=n),n.languages.markup={comment:{pattern:/<!--(?:(?!<!--)[\s\S])*?-->/,greedy:!0},prolog:{pattern:/<\?[\s\S]+?\?>/,greedy:!0},doctype:{pattern:/<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,greedy:!0,inside:{"internal-subset":{pattern:/(^[^\[]*\[)[\s\S]+(?=\]>$)/,lookbehind:!0,greedy:!0,inside:null},string:{pattern:/"[^"]*"|'[^']*'/,greedy:!0},punctuation:/^<!|>$|[[\]]/,"doctype-tag":/^DOCTYPE/i,name:/[^\s<>'"]+/}},cdata:{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,greedy:!0},tag:{pattern:/<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,greedy:!0,inside:{tag:{pattern:/^<\/?[^\s>\/]+/,inside:{punctuation:/^<\/?/,namespace:/^[^\s>\/:]+:/}},"special-attr":[],"attr-value":{pattern:/=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,inside:{punctuation:[{pattern:/^=/,alias:`attr-equals`},{pattern:/^(\s*)["']|["']$/,lookbehind:!0}]}},punctuation:/\/?>/,"attr-name":{pattern:/[^\s>\/]+/,inside:{namespace:/^[^\s>\/:]+:/}}}},entity:[{pattern:/&[\da-z]{1,8};/i,alias:`named-entity`},/&#x?[\da-f]{1,8};/i]},n.languages.markup.tag.inside[`attr-value`].inside.entity=n.languages.markup.entity,n.languages.markup.doctype.inside[`internal-subset`].inside=n.languages.markup,n.hooks.add(`wrap`,function(e){e.type===`entity`&&(e.attributes.title=e.content.replace(/&amp;/,`&`))}),Object.defineProperty(n.languages.markup.tag,`addInlined`,{value:function(e,t){var r={};r[`language-`+t]={pattern:/(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,lookbehind:!0,inside:n.languages[t]},r.cdata=/^<!\[CDATA\[|\]\]>$/i;var i={"included-cdata":{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,inside:r}};i[`language-`+t]={pattern:/[\s\S]+/,inside:n.languages[t]};var a={};a[e]={pattern:RegExp(`(<__[^>]*>)(?:<!\\[CDATA\\[(?:[^\\]]|\\](?!\\]>))*\\]\\]>|(?!<!\\[CDATA\\[)[\\s\\S])*?(?=<\\/__>)`.replace(/__/g,function(){return e}),`i`),lookbehind:!0,greedy:!0,inside:i},n.languages.insertBefore(`markup`,`cdata`,a)}}),Object.defineProperty(n.languages.markup.tag,`addAttribute`,{value:function(e,t){n.languages.markup.tag.inside[`special-attr`].push({pattern:RegExp(`(^|["'\\s])(?:`+e+`)\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s'">=]+(?=[\\s>]))`,`i`),lookbehind:!0,inside:{"attr-name":/^[^\s=]+/,"attr-value":{pattern:/=[\s\S]+/,inside:{value:{pattern:/(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,lookbehind:!0,alias:[t,`language-`+t],inside:n.languages[t]},punctuation:[{pattern:/^=/,alias:`attr-equals`},/"|'/]}}}})}}),n.languages.html=n.languages.markup,n.languages.mathml=n.languages.markup,n.languages.svg=n.languages.markup,n.languages.xml=n.languages.extend(`markup`,{}),n.languages.ssml=n.languages.xml,n.languages.atom=n.languages.xml,n.languages.rss=n.languages.xml,(function(e){var t=/(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;e.languages.css={comment:/\/\*[\s\S]*?\*\//,atrule:{pattern:RegExp(`@[\\w-](?:[^;{\\s"']|\\s+(?!\\s)|`+t.source+`)*?(?:;|(?=\\s*\\{))`),inside:{rule:/^@[\w-]+/,"selector-function-argument":{pattern:/(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,lookbehind:!0,alias:`selector`},keyword:{pattern:/(^|[^\w-])(?:and|not|only|or)(?![\w-])/,lookbehind:!0}}},url:{pattern:RegExp(`\\burl\\((?:`+t.source+`|(?:[^\\\\\\r\\n()"']|\\\\[\\s\\S])*)\\)`,`i`),greedy:!0,inside:{function:/^url/i,punctuation:/^\(|\)$/,string:{pattern:RegExp(`^`+t.source+`$`),alias:`url`}}},selector:{pattern:RegExp(`(^|[{}\\s])[^{}\\s](?:[^{};"'\\s]|\\s+(?![\\s{])|`+t.source+`)*(?=\\s*\\{)`),lookbehind:!0},string:{pattern:t,greedy:!0},property:{pattern:/(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,lookbehind:!0},important:/!important\b/i,function:{pattern:/(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,lookbehind:!0},punctuation:/[(){};:,]/},e.languages.css.atrule.inside.rest=e.languages.css;var n=e.languages.markup;n&&(n.tag.addInlined(`style`,`css`),n.tag.addAttribute(`style`,`css`))})(n),n.languages.clike={comment:[{pattern:/(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,lookbehind:!0,greedy:!0},{pattern:/(^|[^\\:])\/\/.*/,lookbehind:!0,greedy:!0}],string:{pattern:/(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,greedy:!0},"class-name":{pattern:/(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,lookbehind:!0,inside:{punctuation:/[.\\]/}},keyword:/\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,boolean:/\b(?:false|true)\b/,function:/\b\w+(?=\()/,number:/\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,operator:/[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,punctuation:/[{}[\];(),.:]/},n.languages.javascript=n.languages.extend(`clike`,{"class-name":[n.languages.clike[`class-name`],{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,lookbehind:!0}],keyword:[{pattern:/((?:^|\})\s*)catch\b/,lookbehind:!0},{pattern:/(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,lookbehind:!0}],function:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,number:{pattern:RegExp(`(^|[^\\w$])(?:NaN|Infinity|0[bB][01]+(?:_[01]+)*n?|0[oO][0-7]+(?:_[0-7]+)*n?|0[xX][\\dA-Fa-f]+(?:_[\\dA-Fa-f]+)*n?|\\d+(?:_\\d+)*n|(?:\\d+(?:_\\d+)*(?:\\.(?:\\d+(?:_\\d+)*)?)?|\\.\\d+(?:_\\d+)*)(?:[Ee][+-]?\\d+(?:_\\d+)*)?)(?![\\w$])`),lookbehind:!0},operator:/--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/}),n.languages.javascript[`class-name`][0].pattern=/(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/,n.languages.insertBefore(`javascript`,`keyword`,{regex:{pattern:RegExp(`((?:^|[^$\\w\\xA0-\\uFFFF."'\\])\\s]|\\b(?:return|yield))\\s*)\\/(?:(?:\\[(?:[^\\]\\\\\\r\\n]|\\\\.)*\\]|\\\\.|[^/\\\\\\[\\r\\n])+\\/[dgimyus]{0,7}|(?:\\[(?:[^[\\]\\\\\\r\\n]|\\\\.|\\[(?:[^[\\]\\\\\\r\\n]|\\\\.|\\[(?:[^[\\]\\\\\\r\\n]|\\\\.)*\\])*\\])*\\]|\\\\.|[^/\\\\\\[\\r\\n])+\\/[dgimyus]{0,7}v[dgimyus]{0,7})(?=(?:\\s|\\/\\*(?:[^*]|\\*(?!\\/))*\\*\\/)*(?:$|[\\r\\n,.;:})\\]]|\\/\\/))`),lookbehind:!0,greedy:!0,inside:{"regex-source":{pattern:/^(\/)[\s\S]+(?=\/[a-z]*$)/,lookbehind:!0,alias:`language-regex`,inside:n.languages.regex},"regex-delimiter":/^\/|\/$/,"regex-flags":/^[a-z]+$/}},"function-variable":{pattern:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,alias:`function`},parameter:[{pattern:/(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,lookbehind:!0,inside:n.languages.javascript},{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,lookbehind:!0,inside:n.languages.javascript},{pattern:/(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,lookbehind:!0,inside:n.languages.javascript},{pattern:/((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,lookbehind:!0,inside:n.languages.javascript}],constant:/\b[A-Z](?:[A-Z_]|\dx?)*\b/}),n.languages.insertBefore(`javascript`,`string`,{hashbang:{pattern:/^#!.*/,greedy:!0,alias:`comment`},"template-string":{pattern:/`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,greedy:!0,inside:{"template-punctuation":{pattern:/^`|`$/,alias:`string`},interpolation:{pattern:/((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,lookbehind:!0,inside:{"interpolation-punctuation":{pattern:/^\$\{|\}$/,alias:`punctuation`},rest:n.languages.javascript}},string:/[\s\S]+/}},"string-property":{pattern:/((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,lookbehind:!0,greedy:!0,alias:`property`}}),n.languages.insertBefore(`javascript`,`operator`,{"literal-property":{pattern:/((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,lookbehind:!0,alias:`property`}}),n.languages.markup&&(n.languages.markup.tag.addInlined(`script`,`javascript`),n.languages.markup.tag.addAttribute(`on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)`,`javascript`)),n.languages.js=n.languages.javascript,(function(){if(n===void 0||typeof document>`u`)return;Element.prototype.matches||(Element.prototype.matches=Element.prototype.msMatchesSelector||Element.prototype.webkitMatchesSelector);var e=`Loading…`,t=function(e,t){return`✖ Error `+e+` while fetching file: `+t},r=`✖ Error: File does not exist or is empty`,i={js:`javascript`,py:`python`,rb:`ruby`,ps1:`powershell`,psm1:`powershell`,sh:`bash`,bat:`batch`,h:`c`,tex:`latex`},a=`data-src-status`,o=`loading`,s=`loaded`,c=`failed`,l=`pre[data-src]:not([`+a+`="`+s+`"]):not([`+a+`="`+o+`"])`;function u(e,n,i){var a=new XMLHttpRequest;a.open(`GET`,e,!0),a.onreadystatechange=function(){a.readyState==4&&(a.status<400&&a.responseText?n(a.responseText):a.status>=400?i(t(a.status,a.statusText)):i(r))},a.send(null)}function d(e){var t=/^\s*(\d+)\s*(?:(,)\s*(?:(\d+)\s*)?)?$/.exec(e||``);if(t){var n=Number(t[1]),r=t[2],i=t[3];return r?i?[n,Number(i)]:[n,void 0]:[n,n]}}n.hooks.add(`before-highlightall`,function(e){e.selector+=`, `+l}),n.hooks.add(`before-sanity-check`,function(t){var r=t.element;if(r.matches(l)){t.code=``,r.setAttribute(a,o);var f=r.appendChild(document.createElement(`CODE`));f.textContent=e;var p=r.getAttribute(`data-src`),m=t.language;if(m===`none`){var h=(/\.(\w+)$/.exec(p)||[,`none`])[1];m=i[h]||h}n.util.setLanguage(f,m),n.util.setLanguage(r,m);var g=n.plugins.autoloader;g&&g.loadLanguages(m),u(p,function(e){r.setAttribute(a,s);var t=d(r.getAttribute(`data-range`));if(t){var i=e.split(/\r\n?|\n/g),o=t[0],c=t[1]==null?i.length:t[1];o<0&&(o+=i.length),o=Math.max(0,Math.min(o-1,i.length)),c<0&&(c+=i.length),c=Math.max(0,Math.min(c,i.length)),e=i.slice(o,c).join(`
`),r.hasAttribute(`data-start`)||r.setAttribute(`data-start`,String(o+1))}f.textContent=e,n.highlightElement(f)},function(e){r.setAttribute(a,c),f.textContent=e})}}),n.plugins.fileHighlight={highlight:function(e){for(var t=(e||document).querySelectorAll(l),r=0,i;i=t[r++];)n.highlightElement(i)}};var f=!1;n.fileHighlight=function(){f||=(console.warn("Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead."),!0),n.plugins.fileHighlight.highlight.apply(this,arguments)}})()}))(),1);Ea.default.manual=!0,Ea.default.highlightAll();function Da(e,t){return(t??document).querySelector(e)}function Oa(e,t,n){return e*(1-n)+t*n}var ka={logo:`
    precision highp float;
    uniform vec2 resolution;
    uniform vec2 offset;
    uniform float time;
    uniform float enterTime;
    uniform float leaveTime;
    uniform sampler2D src;

    uniform float delay;
    #define speed 2.0

    out vec4 outColor;

    float nn(float y, float t) {
        float n = (
            sin(y * .07 + t * 8. + sin(y * .5 + t * 10.)) +
            sin(y * .7 + t * 2. + sin(y * .3 + t * 8.)) * .7 +
            sin(y * 1.1 + t * 2.8) * .4
        );
        n += sin(y * 124. + t * 100.7) * sin(y * 877. - t * 38.8) * .3;
        return n;
    }

    vec4 readTex(sampler2D tex, vec2 uv) {
        if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) { return vec4(0); }
        return texture(tex, uv);
    }

    vec4 glitch(vec2 uv) {
        vec2 uvr = uv, uvg = uv, uvb = uv;
        float t = mod(time, 30.);
        float amp = 10. / resolution.x;
        if (abs(nn(uv.y, t)) > 1.) {
            uvr.x += nn(uv.y, t) * amp;
            uvg.x += nn(uv.y, t + 10.) * amp;
            uvb.x += nn(uv.y, t + 20.) * amp;
        }
        vec4 cr = readTex(src, uvr);
        vec4 cg = readTex(src, uvg);
        vec4 cb = readTex(src, uvb);

        return vec4(
            cr.r,
            cg.g,
            cb.b,
            smoothstep(.0, 1., cr.a + cg.a + cb.a)
        );
    }
    vec4 slitscan(vec2 uv) {
        float t = max(enterTime - delay, 0.) * speed;
        if (t <= 0.0) {
            return vec4(0);
        }

        vec2 uvr = uv, uvg = uv, uvb = uv;
        uvr.x = min(uvr.x, t);
        uvg.x = min(uvg.x, max(t - 0.2, 0.));
        uvb.x = min(uvb.x, max(t - 0.4, 0.));

        vec4 cr = readTex(src, uvr);
        vec4 cg = readTex(src, uvg);
        vec4 cb = readTex(src, uvb);

        return vec4(
            cr.r, cg.g, cb.b, (cr.a + cg.a + cb.a) / 1.
        );
    }

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        if (leaveTime > 0.) {
            float t = clamp(leaveTime - 0.5, 0., 1.);
            outColor = glitch(uv) * (1. - t);
        } else if (enterTime < 1.0) {
            outColor = slitscan(uv);
        } else {
            outColor = glitch(uv);
        }
    }
    `,blob:`
    precision highp float;
    uniform vec2 resolution;
    uniform vec2 offset;
    uniform float time;
    uniform sampler2D src;
    out vec4 outColor;

    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }

    vec3 hueShift(vec3 rgb, float t) {
        vec3 hsv = rgb2hsv(rgb);
        hsv.x = fract(hsv.x + t);
        return hsv2rgb(hsv);
    }

    vec4 readTex(vec2 uv) {
        vec2 d = 3. / resolution.xy;
        vec4 c = vec4(0);
        c += texture(src, uv + vec2(1, 0) * d);
        c += texture(src, uv - vec2(1, 0) * d);
        c += texture(src, uv + vec2(0, 1) * d);
        c += texture(src, uv - vec2(0, 1) * d);
        return c / 4.;
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        vec4 img = texture(src, uv);

        float gray = dot(img.rgb, vec3(0.2, 0.7, 0.1));

        vec2 d = (uv - .5) * vec2(resolution.x / resolution.y, 1);
        float l = length(d);

        // Colorize
        img.rgb = mix(img.rgb, vec3(.8, .4, .4), sin(gray * 3. - time));

        // Hue shift
        float shift = fract(gray + l - time * 0.2);
        img.rgb = hueShift(img.rgb, shift);

        img.a *= 0.5;
        outColor = img;
    }
    `,canvas:`
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform sampler2D src;
out vec4 outColor;

#define ZOOM(uv, x) ((uv - .5) / x + .5)

void main (void) {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;

    float r = sin(time) * 0.5 + 0.5;

    float l = pow(length(uv - .5), 2.);
    uv = (uv - .5) *  (1. - l * 0.3 * r) + .5;


    float n = 0.02 + r * 0.03;
    vec4 cr = texture(src, ZOOM(uv, 1.00));
    vec4 cg = texture(src, ZOOM(uv, (1. + n)));
    vec4 cb = texture(src, ZOOM(uv, (1. + n * 2.)));

    outColor = vec4(cr.r, cg.g, cb.b, 1);
}
    `,custom:`
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform sampler2D src;
uniform float scroll;
out vec4 outColor;

void main (void) {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    uv.x = fract(uv.x + scroll + time * 0.2);
    outColor = texture(src, uv);
}
    `},Aa=class{vfx=new Ui({pixelRatio:window.devicePixelRatio,zIndex:-1});vfx2=new Ui({pixelRatio:1,zIndex:-2,scrollPadding:!1});async initBG(){let e=Da(`#BG`),t=0;function n(e,t,n){return e*(1-n)+t*n}function r(){t=n(t,window.scrollY,.03),e.style.setProperty(`transform`,`translateY(-${t*.1}px)`),requestAnimationFrame(r)}r(),await this.vfx2.add(e,{shader:ka.blob})}async initVFX(){await Promise.all(Array.from(document.querySelectorAll(`*[data-shader]`)).map(e=>{let t=e.getAttribute(`data-shader`),n=e.getAttribute(`data-uniforms`),r=n?JSON.parse(n):void 0;return this.vfx.add(e,{shader:t,overflow:Number.parseFloat(e.getAttribute(`data-overflow`)??`0`),uniforms:r,intersection:{threshold:Number.parseFloat(e.getAttribute(`data-threshold`)??`0`)}})}))}async initDiv(){let e=Da(`#div`);await this.vfx.add(e,{shader:`rgbShift`,overflow:100});for(let t of e.querySelectorAll(`input,textarea`))t.addEventListener(`input`,()=>this.vfx.update(e));let t=Da(`textarea`,e);new MutationObserver(()=>this.vfx.update(e)).observe(t,{attributes:!0})}async initCanvas(){let e=document.getElementById(`canvas`),t=e.getContext(`2d`);if(!t)throw`Failed to get the canvas context`;let{width:n,height:r}=e.getBoundingClientRect(),i=window.devicePixelRatio??1;e.width=n*i,e.height=r*i,t.scale(i,i);let a=[n/2,r/2],o=a,s=[o],c=!1,l=Date.now();e.addEventListener(`mousemove`,e=>{c=!0,a=[e.offsetX,e.offsetY]}),e.addEventListener(`mouseleave`,e=>{c=!1});let u=!1;new IntersectionObserver(e=>{for(let t of e)u=t.intersectionRatio>.1},{threshold:[0,1,.2,.8]}).observe(e);let d=()=>{if(requestAnimationFrame(d),u){if(!c){let e=Date.now()/1e3-l;a=[n*.5+Math.sin(e*1.3)*n*.3,r*.5+Math.sin(e*1.7)*r*.3]}o=[Oa(o[0],a[0],.1),Oa(o[1],a[1],.1)],s.push(o),s.splice(0,s.length-30),t.clearRect(0,0,n,r),t.fillStyle=`black`,t.fillRect(0,0,n,r),t.fillStyle=`white`,t.font=`bold ${n*.14}px sans-serif`,t.fillText(`HOVER ME`,n/2,r/2),t.textBaseline=`middle`,t.textAlign=`center`;for(let e=0;e<s.length;e++){let[n,r]=s[e],i=e/s.length*255;t.fillStyle=`rgba(${255-i}, 255, ${i}, ${e/s.length*.5+.5})`,t.beginPath(),t.arc(n,r,e+20,0,2*Math.PI),t.fill()}this.vfx.update(e)}};d(),await this.vfx.add(e,{shader:ka.canvas})}async initCustomShader(){let e=Da(`#custom`);await this.vfx.add(e,{shader:ka.custom,uniforms:{scroll:()=>window.scrollY/window.innerHeight}})}async initEffects(){let e=Da(`#effect-bloom`);await this.vfx.add(e,{effect:new sa({threshold:.2,intensity:5})});let t=Da(`#effect-crt`);await this.vfx.add(t,{effect:[new ba({size:10}),new Ta({spacing:5}),new sa({threshold:.01,softness:.2,intensity:10,scatter:1,pad:200})]})}async initMultipass(){let e=Da(`#multipass`);await this.vfx.add(e,{shader:[{frag:`
                        precision highp float;
                        uniform sampler2D src;
                        uniform vec2 resolution;
                        uniform vec2 offset;
                        out vec4 outColor;
                        void main() {
                            vec2 uv = (gl_FragCoord.xy - offset) / resolution;
                            vec2 t = 4.0 / resolution;
                            vec4 c = texture(src, uv) * 0.4;
                            c += texture(src, uv + vec2(t.x, 0)) * 0.15;
                            c += texture(src, uv - vec2(t.x, 0)) * 0.15;
                            c += texture(src, uv + vec2(0, t.y)) * 0.15;
                            c += texture(src, uv - vec2(0, t.y)) * 0.15;
                            outColor = c;
                        }
                    `,target:`blur`},{frag:`
                        precision highp float;
                        uniform sampler2D src;
                        uniform sampler2D blur;
                        uniform vec2 resolution;
                        uniform vec2 offset;
                        out vec4 outColor;
                        void main() {
                            vec2 uv = (gl_FragCoord.xy - offset) / resolution;
                            vec4 c = texture(src, uv);
                            vec4 b = texture(blur, uv);
                            outColor = c + b * 0.6;
                        }
                    `}]})}hideMask(){Da(`#MaskTop`).style.setProperty(`height`,`0`),Da(`#MaskBottom`).style.setProperty(`opacity`,`0`)}async showLogo(){let e=Da(`#Logo`),t=Da(`#LogoTagline`);return Promise.all([this.vfx.add(e,{shader:ka.logo,overflow:[0,3e3,0,100],uniforms:{delay:0},intersection:{threshold:1}}),this.vfx.add(t,{shader:ka.logo,overflow:[0,3e3,0,1e3],uniforms:{delay:.3},intersection:{threshold:1}})])}async showProfile(){let e=Da(`#profile`);await this.vfx.add(e,{shader:ka.logo,overflow:[0,3e3,0,2e3],uniforms:{delay:.5},intersection:{rootMargin:[-100,0,-100,0],threshold:1}})}};window.addEventListener(`load`,async()=>{let e=new Aa;await e.initBG(),await Promise.all([await e.initVFX(),e.initDiv(),e.initCanvas(),e.initCustomShader(),e.initMultipass(),e.initEffects()]),e.hideMask(),setTimeout(()=>{e.showLogo(),e.showProfile()},2e3)});
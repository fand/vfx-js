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
    `};function c(e){if(!e.src||e.src.startsWith(`data:`))return!1;try{return new URL(e.src,location.href).origin!==location.origin}catch{return!1}}async function l(e){let t=await(await fetch(e)).blob();return URL.createObjectURL(t)}async function u(e){let t=Array.from(e.querySelectorAll(`img`)).filter(e=>e.complete&&e.naturalWidth>0&&c(e));if(t.length===0)return()=>{};let n=new Map,r=[];return await Promise.all(t.map(async e=>{try{let t=await l(e.src);n.set(e,e.src),r.push(t),await new Promise(n=>{e.addEventListener(`load`,()=>n(),{once:!0}),e.src=t})}catch{}})),()=>{for(let[e,t]of n)e.src=t;for(let e of r)URL.revokeObjectURL(e)}}var d=[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`],f=[`position`,`top`,`right`,`bottom`,`left`,`float`,`flex`,`flex-grow`,`flex-shrink`,`flex-basis`,`align-self`,`justify-self`,`place-self`,`order`,`grid-column`,`grid-column-start`,`grid-column-end`,`grid-row`,`grid-row-start`,`grid-row-end`,`grid-area`],p=new WeakMap,m=new WeakMap,h=new WeakMap,g=new WeakMap,_=new WeakMap,v=new WeakMap;async function y(e,t){let n=e.getContext(`2d`);if(!n)throw Error(`Failed to get 2d context from layoutsubtree canvas`);let{onCapture:r,maxSize:i}=t,a=null,o=null,s=new Promise(e=>{o=e});e.onpaint=()=>{let t=e.firstElementChild;if(!t||e.width===0||e.height===0)return;n.clearRect(0,0,e.width,e.height),n.drawElementImage(t,0,0);let s=e.width,c=e.height;if(i&&(s>i||c>i)){let e=Math.min(i/s,i/c);s=Math.floor(s*e),c=Math.floor(c*e)}(!a||a.width!==s||a.height!==c)&&(a=new OffscreenCanvas(s,c));let l=a.getContext(`2d`);if(l){if(l.clearRect(0,0,s,c),l.drawImage(e,0,0,s,c),n.clearRect(0,0,e.width,e.height),o){o(a),o=null;return}r(a)}};let c=new ResizeObserver(t=>{for(let n of t){let t=n.devicePixelContentBoxSize?.[0];if(t)e.width=t.inlineSize,e.height=t.blockSize;else{let t=n.borderBoxSize?.[0];if(t){let n=window.devicePixelRatio;e.width=Math.round(t.inlineSize*n),e.height=Math.round(t.blockSize*n)}}}e.requestPaint()});c.observe(e,{box:`device-pixel-content-box`}),p.set(e,c);let l=e.firstElementChild,u=``;if(l){let t=new ResizeObserver(t=>{let n=t[0].borderBoxSize?.[0];if(!n)return;let r=`${Math.round(n.blockSize)}px`;r!==u&&(u=r,e.style.setProperty(`height`,r))});t.observe(l),m.set(e,t)}return s}function ee(e){e.onpaint=null;let t=p.get(e);t&&(t.disconnect(),p.delete(e));let n=m.get(e);n&&(n.disconnect(),m.delete(e))}async function te(e,t){let n=e.getBoundingClientRect(),r=document.createElement(`canvas`);r.setAttribute(`layoutsubtree`,``),r.className=e.className;let i=e.getAttribute(`style`);i&&r.setAttribute(`style`,i),r.style.setProperty(`padding`,`0`),r.style.setProperty(`border`,`none`),r.style.setProperty(`box-sizing`,`content-box`);let a=getComputedStyle(e),o=a.display===`inline`?`block`:a.display;r.style.setProperty(`display`,o);for(let e of d)r.style.setProperty(e,a.getPropertyValue(e));for(let e of f)r.style.setProperty(e,a.getPropertyValue(e));let s=e=>Number.parseFloat(e),c=s(a.paddingLeft)+s(a.paddingRight)+s(a.borderLeftWidth)+s(a.borderRightWidth),l=s(a.paddingTop)+s(a.paddingBottom)+s(a.borderTopWidth)+s(a.borderBottomWidth);c>0&&r.style.setProperty(`width`,`${n.width}px`),l>0&&r.style.setProperty(`height`,`${n.height}px`),r.style.width||r.style.setProperty(`width`,`100%`),r.style.height||r.style.setProperty(`height`,`${n.height}px`);let p=window.devicePixelRatio;r.width=Math.round(n.width*p),r.height=Math.round(n.height*p),h.set(e,e.style.margin),g.set(e,e.style.width),_.set(e,e.style.boxSizing),e.parentNode?.insertBefore(r,e),r.appendChild(e),e.style.setProperty(`margin`,`0`),e.style.setProperty(`width`,`100%`),e.style.setProperty(`box-sizing`,`border-box`);let m=await u(e);return v.set(r,m),{canvas:r,initialCapture:await y(r,t)}}function b(e,t){ee(e);let n=v.get(e);n&&(n(),v.delete(e)),e.parentNode?.insertBefore(t,e),e.remove();let r=h.get(t);r!==void 0&&(t.style.margin=r,h.delete(t));let i=g.get(t);i!==void 0&&(t.style.width=i,g.delete(t));let a=_.get(t);a!==void 0&&(t.style.boxSizing=a,_.delete(t))}var x;function S(){if(x!==void 0)return x;try{let e=document.createElement(`canvas`),t=e.getContext(`2d`);x=t!==null&&typeof t.drawElementImage==`function`&&typeof e.requestPaint==`function`}catch{x=!1}return x}function C(e){let t=typeof window<`u`?window.devicePixelRatio:1,n;n=e.scrollPadding===void 0?[.1,.1]:e.scrollPadding===!1?[0,0]:Array.isArray(e.scrollPadding)?[e.scrollPadding[0]??.1,e.scrollPadding[1]??.1]:[e.scrollPadding,e.scrollPadding];let r;return r=e.postEffect===void 0?[]:Array.isArray(e.postEffect)?e.postEffect:[e.postEffect],{pixelRatio:e.pixelRatio??t,zIndex:e.zIndex??void 0,autoplay:e.autoplay??!0,fixedCanvas:e.scrollPadding===!1,scrollPadding:n,wrapper:e.wrapper,postEffects:r}}var w=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},T=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ne,E,D,O,re,ie,ae,k=class{constructor(e,t,n){ne.add(this),this.wrapS=`clamp`,this.wrapT=`clamp`,this.needsUpdate=!0,this.source=null,E.set(this,void 0),D.set(this,!1),O.set(this,void 0),w(this,E,e,`f`),this.gl=e.gl,T(this,ne,`m`,re).call(this),t&&(this.source=t),w(this,O,n?.autoRegister!==!1,`f`),T(this,O,`f`)&&e.addResource(this)}restore(){T(this,ne,`m`,re).call(this),w(this,D,!1,`f`),this.needsUpdate=!0}bind(e){let t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&=(T(this,ne,`m`,ie).call(this),!1)}dispose(){T(this,O,`f`)&&T(this,E,`f`).removeResource(this),this.gl.deleteTexture(this.texture)}};E=new WeakMap,D=new WeakMap,O=new WeakMap,ne=new WeakSet,re=function(){let e=this.gl.createTexture();if(!e)throw Error(`[VFX-JS] Failed to create texture`);this.texture=e},ie=function(){let e=this.gl,t=this.source;if(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4),t)try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)}catch(e){console.error(e)}else if(!T(this,D,`f`)){let t=new Uint8Array([0,0,0,0]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,t)}T(this,ne,`m`,ae).call(this),w(this,D,!0,`f`)},ae=function(){let e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,oe(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,oe(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR)};function oe(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function se(e){return new Promise((t,n)=>{let r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>t(r),r.onerror=n,r.src=e})}var ce=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},le=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ue,de,fe,pe=class{constructor(e,t,n,r={}){ue.add(this),de.set(this,void 0),ce(this,de,e,`f`),this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(n)),this.float=r.float??!1,this.texture=new k(e,void 0,{autoRegister:!1}),le(this,ue,`m`,fe).call(this),e.addResource(this)}setSize(e,t){let n=Math.max(1,Math.floor(e)),r=Math.max(1,Math.floor(t));n===this.width&&r===this.height||(this.width=n,this.height=r,le(this,ue,`m`,fe).call(this))}restore(){this.texture.restore(),le(this,ue,`m`,fe).call(this)}dispose(){le(this,de,`f`).removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.texture.dispose()}};de=new WeakMap,ue=new WeakSet,fe=function(){let e=this.gl,t=this.fbo,n=e.createFramebuffer();if(!n)throw Error(`[VFX-JS] Failed to create framebuffer`);this.fbo=n;let r=this.texture.texture;e.bindTexture(e.TEXTURE_2D,r);let i=le(this,de,`f`).floatLinearFilter,a=this.float?i?e.RGBA32F:e.RGBA16F:e.RGBA8,o=this.float?i?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,e.RGBA,o,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.texture.needsUpdate=!1,this.texture.source=null,t&&e.deleteFramebuffer(t)};function me(e,t,n,r){return{x:e.left+n,y:t-r-e.bottom,w:e.right-e.left,h:e.bottom-e.top}}function he(e,t,n,r){return{x:e,y:t,w:n,h:r}}var ge=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},A=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},_e,ve,ye,j,be=class{constructor(e,t,n,r,i){_e.set(this,void 0),ve.set(this,void 0),ye.set(this,void 0),j.set(this,void 0),ge(this,_e,t,`f`),ge(this,ve,n,`f`),ge(this,ye,r,`f`);let a=t*r,o=n*r;ge(this,j,[new pe(e,a,o,{float:i}),new pe(e,a,o,{float:i})],`f`)}get texture(){return A(this,j,`f`)[0].texture}get target(){return A(this,j,`f`)[1]}resize(e,t){if(e===A(this,_e,`f`)&&t===A(this,ve,`f`))return;ge(this,_e,e,`f`),ge(this,ve,t,`f`);let n=e*A(this,ye,`f`),r=t*A(this,ye,`f`);A(this,j,`f`)[0].setSize(n,r),A(this,j,`f`)[1].setSize(n,r)}swap(){ge(this,j,[A(this,j,`f`)[1],A(this,j,`f`)[0]],`f`)}getViewport(){return he(0,0,A(this,_e,`f`),A(this,ve,`f`))}dispose(){A(this,j,`f`)[0].dispose(),A(this,j,`f`)[1].dispose()}};_e=new WeakMap,ve=new WeakMap,ye=new WeakMap,j=new WeakMap;var xe=class{constructor(e=0,t=0){this.x=0,this.y=0,this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}},Se=class{constructor(e=0,t=0,n=0,r=0){this.x=0,this.y=0,this.z=0,this.w=0,this.x=e,this.y=t,this.z=n,this.w=r}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}},Ce=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},M=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},we,Te,Ee,De,Oe,ke,Ae;function je(e){return/#version\s+300\s+es\b/.test(e)?`300 es`:/#version\s+100\b/.test(e)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(e)?`100`:`300 es`}var Me=class{constructor(e,t,n,r){we.add(this),Te.set(this,void 0),Ee.set(this,void 0),De.set(this,void 0),Oe.set(this,void 0),ke.set(this,new Map),Ce(this,Te,e,`f`),this.gl=e.gl,Ce(this,Ee,t,`f`),Ce(this,De,n,`f`),Ce(this,Oe,r??je(n),`f`),M(this,we,`m`,Ae).call(this),e.addResource(this)}restore(){M(this,we,`m`,Ae).call(this)}use(){this.gl.useProgram(this.program)}hasUniform(e){return M(this,ke,`f`).has(e)}uploadUniforms(e){let t=this.gl,n=0;for(let[r,i]of M(this,ke,`f`)){let a=e[r];if(!a)continue;let o=a.value;if(o!=null){if(Fe(i.type)){o instanceof k&&(o.bind(n),t.uniform1i(i.location,n),n++);continue}o instanceof k||Le(t,i,o)}}}dispose(){M(this,Te,`f`).removeResource(this),this.gl.deleteProgram(this.program)}};Te=new WeakMap,Ee=new WeakMap,De=new WeakMap,Oe=new WeakMap,ke=new WeakMap,we=new WeakSet,Ae=function(){let e=this.gl,t=Ne(e,e.VERTEX_SHADER,Pe(M(this,Ee,`f`),M(this,Oe,`f`))),n=Ne(e,e.FRAGMENT_SHADER,Pe(M(this,De,`f`),M(this,Oe,`f`))),r=e.createProgram();if(!r)throw Error(`[VFX-JS] Failed to create program`);if(e.attachShader(r,t),e.attachShader(r,n),e.bindAttribLocation(r,0,`position`),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let i=e.getProgramInfoLog(r)??``;throw e.deleteShader(t),e.deleteShader(n),e.deleteProgram(r),Error(`[VFX-JS] Program link failed: ${i}`)}e.detachShader(r,t),e.detachShader(r,n),e.deleteShader(t),e.deleteShader(n),this.program=r,M(this,ke,`f`).clear();let i=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<i;t++){let n=e.getActiveUniform(r,t);if(!n)continue;let i=n.name.replace(/\[0\]$/,``),a=e.getUniformLocation(r,n.name);a&&M(this,ke,`f`).set(i,{location:a,type:n.type,size:n.size})}};function Ne(e,t,n){let r=e.createShader(t);if(!r)throw Error(`[VFX-JS] Failed to create shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)??``;throw e.deleteShader(r),Error(`[VFX-JS] Shader compile failed: ${t}\n\n${n}`)}return r}function Pe(e,t){return e.replace(/^\s+/,``).startsWith(`#version`)||t===`100`?e:`#version 300 es\n${e}`}function Fe(e){return e===35678||e===36298||e===36306||e===35682}var Ie=new Set;function Le(e,t,n){let r=t.location,i=t.size>1,a=n,o=n,s=n;switch(t.type){case e.FLOAT:i?e.uniform1fv(r,a):e.uniform1f(r,n);return;case e.FLOAT_VEC2:if(i)e.uniform2fv(r,a);else if(n instanceof xe)e.uniform2f(r,n.x,n.y);else{let t=n;e.uniform2f(r,t[0],t[1])}return;case e.FLOAT_VEC3:if(i)e.uniform3fv(r,a);else{let t=n;e.uniform3f(r,t[0],t[1],t[2])}return;case e.FLOAT_VEC4:if(i)e.uniform4fv(r,a);else if(n instanceof Se)e.uniform4f(r,n.x,n.y,n.z,n.w);else{let t=n;e.uniform4f(r,t[0],t[1],t[2],t[3])}return;case e.INT:i?e.uniform1iv(r,o):e.uniform1i(r,n);return;case e.INT_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,t[0],t[1])}return;case e.INT_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,t[0],t[1],t[2])}return;case e.INT_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,t[0],t[1],t[2],t[3])}return;case e.BOOL:i?e.uniform1iv(r,o):e.uniform1i(r,+!!n);return;case e.BOOL_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,+!!t[0],+!!t[1])}return;case e.BOOL_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,+!!t[0],+!!t[1],+!!t[2])}return;case e.BOOL_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,+!!t[0],+!!t[1],+!!t[2],+!!t[3])}return;case e.FLOAT_MAT2:e.uniformMatrix2fv(r,!1,a);return;case e.FLOAT_MAT3:e.uniformMatrix3fv(r,!1,a);return;case e.FLOAT_MAT4:e.uniformMatrix4fv(r,!1,a);return;case e.UNSIGNED_INT:i?e.uniform1uiv(r,s):e.uniform1ui(r,n);return;case e.UNSIGNED_INT_VEC2:if(i)e.uniform2uiv(r,s);else{let t=n;e.uniform2ui(r,t[0],t[1])}return;case e.UNSIGNED_INT_VEC3:if(i)e.uniform3uiv(r,s);else{let t=n;e.uniform3ui(r,t[0],t[1],t[2])}return;case e.UNSIGNED_INT_VEC4:if(i)e.uniform4uiv(r,s);else{let t=n;e.uniform4ui(r,t[0],t[1],t[2],t[3])}return;default:Ie.has(t.type)||(Ie.add(t.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${t.type.toString(16)}; skipping upload.`));return}}var Re=class{constructor(e,t,n,r,i,a){this.gl=e.gl,this.program=new Me(e,t,n,a),this.uniforms=r,this.blend=i}dispose(){this.program.dispose()}};function ze(e,t,n,r,i,a,o,s){let c=r?r.width/s:a,l=r?r.height/s:o,u=Math.max(0,i.x),d=Math.max(0,i.y),f=Math.min(c,i.x+i.w),p=Math.min(l,i.y+i.h),m=f-u,h=p-d;m<=0||h<=0||(e.bindFramebuffer(e.FRAMEBUFFER,r?r.fbo:null),e.viewport(Math.round(u*s),Math.round(d*s),Math.round(m*s),Math.round(h*s)),Be(e,n.blend),n.program.use(),n.program.uploadUniforms(n.uniforms),t.draw())}function Be(e,t){if(t===`none`){e.disable(e.BLEND);return}e.enable(e.BLEND),e.blendEquation(e.FUNC_ADD),t===`premultiplied`?e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA):e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA)}var Ve=class{constructor(e){this.uniforms={src:{value:null},offset:{value:new xe},resolution:{value:new xe},viewport:{value:new Se}},this.pass=new Re(e,n,i,this.uniforms,`premultiplied`)}setUniforms(e,t,n){this.uniforms.src.value=e,this.uniforms.resolution.value.set(n.w*t,n.h*t),this.uniforms.offset.value.set(n.x*t,n.y*t)}dispose(){this.pass.dispose()}},He=e=>{let t=document.implementation.createHTMLDocument(`test`),n=t.createRange();n.selectNodeContents(t.documentElement),n.deleteContents();let r=document.createElement(`head`);return t.documentElement.appendChild(r),t.documentElement.appendChild(n.createContextualFragment(e)),t.documentElement.setAttribute(`xmlns`,t.documentElement.namespaceURI),new XMLSerializer().serializeToString(t).replace(/<!DOCTYPE html>/,``)};async function Ue(e,t,n,r){let i=e.getBoundingClientRect(),a=window.devicePixelRatio,o=i.width*a,s=i.height*a,c=1,l=o,u=s;r&&(l>r||u>r)&&(c=Math.min(r/l,r/u),l=Math.floor(l*c),u=Math.floor(u*c));let d=n&&n.width===l&&n.height===u?n:new OffscreenCanvas(l,u),f=e.cloneNode(!0);await We(e,f),Ge(e,f),f.style.setProperty(`opacity`,t.toString()),f.style.setProperty(`margin`,`0px`),Ke(f);let p=f.outerHTML,m=`<svg xmlns="http://www.w3.org/2000/svg" width="${o}" height="${s}"><foreignObject width="100%" height="100%">${He(p)}</foreignObject></svg>`;return new Promise((e,t)=>{let n=new Image;n.onload=()=>{let r=d.getContext(`2d`);if(r===null)return t();r.clearRect(0,0,l,u);let i=a*c;r.scale(i,i),r.drawImage(n,0,0,o,s),r.setTransform(1,0,0,1,0,0),e(d)},n.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(m)}`})}async function We(e,t){let n=window.getComputedStyle(e);for(let e of Array.from(n))/(-inline-|-block-|^inline-|^block-)/.test(e)||/^-webkit-.*(start|end|before|after|logical)/.test(e)||t.style.setProperty(e,n.getPropertyValue(e),n.getPropertyPriority(e));if(t.tagName===`INPUT`)t.setAttribute(`value`,t.value);else if(t.tagName===`TEXTAREA`)t.innerHTML=t.value;else if(t.tagName===`IMG`)try{t.src=await qe(e.src)}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];await We(r,i)}}function Ge(e,t){if(typeof e.computedStyleMap==`function`)try{let n=e.computedStyleMap();for(let e of[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`]){let r=n.get(e);r instanceof CSSKeywordValue&&r.value===`auto`&&t.style.setProperty(e,`auto`)}}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];r instanceof HTMLElement&&i instanceof HTMLElement&&Ge(r,i)}}function Ke(e){let t=e;for(;;){let e=t.style;if(Number.parseFloat(e.paddingTop)>0||Number.parseFloat(e.borderTopWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.firstElementChild;if(!n)break;n.style.setProperty(`margin-top`,`0px`),t=n}for(t=e;;){let e=t.style;if(Number.parseFloat(e.paddingBottom)>0||Number.parseFloat(e.borderBottomWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.lastElementChild;if(!n)break;n.style.setProperty(`margin-bottom`,`0px`),t=n}}async function qe(e){let t=await fetch(e).then(e=>e.blob());return new Promise(e=>{let n=new FileReader;n.onload=function(){e(this.result)},n.readAsDataURL(t)})}function Je(e){this.data=e,this.pos=0}Je.prototype.readByte=function(){return this.data[this.pos++]},Je.prototype.peekByte=function(){return this.data[this.pos]},Je.prototype.readBytes=function(e){return this.data.subarray(this.pos,this.pos+=e)},Je.prototype.peekBytes=function(e){return this.data.subarray(this.pos,this.pos+e)},Je.prototype.readString=function(e){for(var t=``,n=0;n<e;n++)t+=String.fromCharCode(this.readByte());return t},Je.prototype.readBitArray=function(){for(var e=[],t=this.readByte(),n=7;n>=0;n--)e.push(!!(t&1<<n));return e},Je.prototype.readUnsigned=function(e){var t=this.readBytes(2);return e?(t[1]<<8)+t[0]:(t[0]<<8)+t[1]};function Ye(e){this.stream=new Je(e),this.output={}}Ye.prototype.parse=function(e){return this.parseParts(this.output,e),this.output},Ye.prototype.parseParts=function(e,t){for(var n=0;n<t.length;n++){var r=t[n];this.parsePart(e,r)}},Ye.prototype.parsePart=function(e,t){var n=t.label,r;if(!(t.requires&&!t.requires(this.stream,this.output,e)))if(t.loop){for(var i=[];t.loop(this.stream);){var a={};this.parseParts(a,t.parts),i.push(a)}e[n]=i}else t.parts?(r={},this.parseParts(r,t.parts),e[n]=r):t.parser?(r=t.parser(this.stream,this.output,e),t.skip||(e[n]=r)):t.bits&&(e[n]=this.parseBits(t.bits))};function Xe(e){return e.reduce(function(e,t){return e*2+t},0)}Ye.prototype.parseBits=function(e){var t={},n=this.stream.readBitArray();for(var r in e){var i=e[r];i.length?t[r]=Xe(n.slice(i.index,i.index+i.length)):t[r]=n[i.index]}return t};var N={readByte:function(){return function(e){return e.readByte()}},readBytes:function(e){return function(t){return t.readBytes(e)}},readString:function(e){return function(t){return t.readString(e)}},readUnsigned:function(e){return function(t){return t.readUnsigned(e)}},readArray:function(e,t){return function(n,r,i){for(var a=t(n,r,i),o=Array(a),s=0;s<a;s++)o[s]=n.readBytes(e);return o}}},Ze={label:`blocks`,parser:function(e){for(var t=[],n=0,r=0,i=e.readByte();i!==r;i=e.readByte())t.push(e.readBytes(i)),n+=i;var a=new Uint8Array(n);n=0;for(var o=0;o<t.length;o++)a.set(t[o],n),n+=t[o].length;return a}},Qe={label:`gce`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===249},parts:[{label:`codes`,parser:N.readBytes(2),skip:!0},{label:`byteSize`,parser:N.readByte()},{label:`extras`,bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:`delay`,parser:N.readUnsigned(!0)},{label:`transparentColorIndex`,parser:N.readByte()},{label:`terminator`,parser:N.readByte(),skip:!0}]},$e={label:`image`,requires:function(e){return e.peekByte()===44},parts:[{label:`code`,parser:N.readByte(),skip:!0},{label:`descriptor`,parts:[{label:`left`,parser:N.readUnsigned(!0)},{label:`top`,parser:N.readUnsigned(!0)},{label:`width`,parser:N.readUnsigned(!0)},{label:`height`,parser:N.readUnsigned(!0)},{label:`lct`,bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:`lct`,requires:function(e,t,n){return n.descriptor.lct.exists},parser:N.readArray(3,function(e,t,n){return 2**(n.descriptor.lct.size+1)})},{label:`data`,parts:[{label:`minCodeSize`,parser:N.readByte()},Ze]}]},et={label:`text`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===1},parts:[{label:`codes`,parser:N.readBytes(2),skip:!0},{label:`blockSize`,parser:N.readByte()},{label:`preData`,parser:function(e,t,n){return e.readBytes(n.text.blockSize)}},Ze]},tt={label:`frames`,parts:[Qe,{label:`application`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===255},parts:[{label:`codes`,parser:N.readBytes(2),skip:!0},{label:`blockSize`,parser:N.readByte()},{label:`id`,parser:function(e,t,n){return e.readString(n.blockSize)}},Ze]},{label:`comment`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===254},parts:[{label:`codes`,parser:N.readBytes(2),skip:!0},Ze]},$e,et],loop:function(e){var t=e.peekByte();return t===33||t===44}},nt=[{label:`header`,parts:[{label:`signature`,parser:N.readString(3)},{label:`version`,parser:N.readString(3)}]},{label:`lsd`,parts:[{label:`width`,parser:N.readUnsigned(!0)},{label:`height`,parser:N.readUnsigned(!0)},{label:`gct`,bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:`backgroundColorIndex`,parser:N.readByte()},{label:`pixelAspectRatio`,parser:N.readByte()}]},{label:`gct`,requires:function(e,t){return t.lsd.gct.exists},parser:N.readArray(3,function(e,t){return 2**(t.lsd.gct.size+1)})},tt];function rt(e){this.raw=new Ye(new Uint8Array(e)).parse(nt),this.raw.hasImages=!1;for(var t=0;t<this.raw.frames.length;t++)if(this.raw.frames[t].image){this.raw.hasImages=!0;break}}rt.prototype.decompressFrame=function(e,t){if(e>=this.raw.frames.length)return null;var n=this.raw.frames[e];if(n.image){var r=n.image.descriptor.width*n.image.descriptor.height,i=o(n.image.data.minCodeSize,n.image.data.blocks,r);n.image.descriptor.lct.interlaced&&(i=s(i,n.image.descriptor.width));var a={pixels:i,dims:{top:n.image.descriptor.top,left:n.image.descriptor.left,width:n.image.descriptor.width,height:n.image.descriptor.height}};return n.image.descriptor.lct&&n.image.descriptor.lct.exists?a.colorTable=n.image.lct:a.colorTable=this.raw.gct,n.gce&&(a.delay=(n.gce.delay||10)*10,a.disposalType=n.gce.extras.disposal,n.gce.extras.transparentColorGiven&&(a.transparentIndex=n.gce.transparentColorIndex)),t&&(a.patch=c(a)),a}return null;function o(e,t,n){var r=4096,i=-1,a=n,o,s,c,l,u,d,f,p,m,h,g,_,v,y,ee,te,b=Array(n),x=Array(r),S=Array(r),C=Array(r+1);for(_=e,s=1<<_,u=s+1,o=s+2,f=i,l=_+1,c=(1<<l)-1,m=0;m<s;m++)x[m]=0,S[m]=m;for(g=p=v=y=te=ee=0,h=0;h<a;){if(y===0){if(p<l){g+=t[ee]<<p,p+=8,ee++;continue}if(m=g&c,g>>=l,p-=l,m>o||m==u)break;if(m==s){l=_+1,c=(1<<l)-1,o=s+2,f=i;continue}if(f==i){C[y++]=S[m],f=m,v=m;continue}for(d=m,m==o&&(C[y++]=v,m=f);m>s;)C[y++]=S[m],m=x[m];v=S[m]&255,C[y++]=v,o<r&&(x[o]=f,S[o]=v,o++,(o&c)===0&&o<r&&(l++,c+=o)),f=d}y--,b[te++]=C[y],h++}for(h=te;h<a;h++)b[h]=0;return b}function s(e,t){for(var n=Array(e.length),r=e.length/t,i=function(r,i){var a=e.slice(i*t,(i+1)*t);n.splice.apply(n,[r*t,t].concat(a))},a=[0,4,2,1],o=[8,8,4,2],s=0,c=0;c<4;c++)for(var l=a[c];l<r;l+=o[c])i(l,s),s++;return n}function c(e){for(var t=e.pixels.length,n=new Uint8ClampedArray(t*4),r=0;r<t;r++){var i=r*4,a=e.pixels[r],o=e.colorTable[a];n[i]=o[0],n[i+1]=o[1],n[i+2]=o[2],n[i+3]=a===e.transparentIndex?0:255}return n}},rt.prototype.decompressFrames=function(e,t,n){t===void 0&&(t=0),n=n===void 0?this.raw.frames.length:Math.min(n,this.raw.frames.length);for(var r=[],i=t;i<n;i++)this.raw.frames[i].image&&r.push(this.decompressFrame(i,e));return r};var it=rt,at=class e{static async create(t,n){let r=await fetch(t).then(e=>e.arrayBuffer()).then(e=>new it(e)),i=r.decompressFrames(!0,void 0,void 0),{width:a,height:o}=r.raw.lsd;return new e(i,a,o,n)}constructor(e,t,n,r){this.frames=[],this.index=0,this.playTime=0,this.frames=e,this.canvas=document.createElement(`canvas`),this.ctx=this.canvas.getContext(`2d`),this.pixelRatio=r,this.canvas.width=t,this.canvas.height=n,this.startTime=Date.now()}getCanvas(){return this.canvas}update(){let e=Date.now()-this.startTime;for(;this.playTime<e;){let e=this.frames[this.index%this.frames.length];this.playTime+=e.delay,this.index++}let t=this.frames[this.index%this.frames.length],n=new ImageData(t.patch,t.dims.width,t.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(n,t.dims.left,t.dims.top)}},P=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ot,st,ct,lt,ut,dt=class{constructor(e){this.isContextLost=!1,ot.set(this,new Set),st.set(this,new Set),ct.set(this,new Set),lt.set(this,e=>{e.preventDefault(),this.isContextLost=!0;for(let e of P(this,st,`f`))e()}),ut.set(this,()=>{this.isContextLost=!1;let e=this.gl;e.getExtension(`EXT_color_buffer_float`),e.getExtension(`EXT_color_buffer_half_float`);for(let e of P(this,ot,`f`))e.restore();for(let e of P(this,ct,`f`))e()});let t=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1});if(!t)throw Error(`[VFX-JS] WebGL2 is not available.`);this.gl=t,this.canvas=e,t.getExtension(`EXT_color_buffer_float`),t.getExtension(`EXT_color_buffer_half_float`),this.floatLinearFilter=!!t.getExtension(`OES_texture_float_linear`),this.maxTextureSize=t.getParameter(t.MAX_TEXTURE_SIZE),e.addEventListener(`webglcontextlost`,P(this,lt,`f`),!1),e.addEventListener(`webglcontextrestored`,P(this,ut,`f`),!1)}setSize(e,t,n){let r=Math.floor(e*n),i=Math.floor(t*n);(this.canvas.width!==r||this.canvas.height!==i)&&(this.canvas.width=r,this.canvas.height=i)}addResource(e){P(this,ot,`f`).add(e)}removeResource(e){P(this,ot,`f`).delete(e)}onContextLost(e){return P(this,st,`f`).add(e),()=>P(this,st,`f`).delete(e)}onContextRestored(e){return P(this,ct,`f`).add(e),()=>P(this,ct,`f`).delete(e)}};ot=new WeakMap,st=new WeakMap,ct=new WeakMap,lt=new WeakMap,ut=new WeakMap;var ft=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},pt=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},mt,ht,gt,_t,vt=class{constructor(e){mt.add(this),ht.set(this,void 0),gt.set(this,void 0),ft(this,ht,e,`f`),this.gl=e.gl,pt(this,mt,`m`,_t).call(this),e.addResource(this)}restore(){pt(this,mt,`m`,_t).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){pt(this,ht,`f`).removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(pt(this,gt,`f`))}};ht=new WeakMap,gt=new WeakMap,mt=new WeakSet,_t=function(){let e=this.gl,t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw Error(`[VFX-JS] Failed to create quad VAO`);this.vao=t,ft(this,gt,n,`f`);let r=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)};function yt(e,t,n,r={}){return new pe(e,t,n,{float:r.float??!1})}function bt(e,t){let i=t.renderingToBuffer??!1,a;a=i?`none`:t.premultipliedAlpha?`premultiplied`:`normal`;let o=t.glslVersion??je(t.fragmentShader);return new Re(e,t.vertexShader??(o===`100`?r:n),t.fragmentShader,t.uniforms,a,o)}var xt=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},F=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},I,St,L,Ct,wt,R,Tt=class{constructor(e,t,n,r,i,a,o,s){if(I.set(this,void 0),St.set(this,void 0),L.set(this,void 0),Ct.set(this,void 0),wt.set(this,void 0),R.set(this,void 0),xt(this,Ct,r??!1,`f`),xt(this,wt,i??!1,`f`),xt(this,R,a,`f`),xt(this,St,{},`f`),xt(this,I,{src:{value:null},offset:{value:new xe},resolution:{value:new xe},viewport:{value:new Se},time:{value:0},mouse:{value:new xe},passIndex:{value:0}},`f`),n)for(let[e,t]of Object.entries(n))typeof t==`function`?(F(this,St,`f`)[e]=t,F(this,I,`f`)[e]={value:t()}):F(this,I,`f`)[e]={value:t};this.pass=bt(e,{fragmentShader:t,uniforms:F(this,I,`f`),renderingToBuffer:o??!1,premultipliedAlpha:!0,glslVersion:s})}get uniforms(){return F(this,I,`f`)}setUniforms(e,t,n,r,i,a){F(this,I,`f`).src.value=e,F(this,I,`f`).resolution.value.set(n.w*t,n.h*t),F(this,I,`f`).offset.value.set(n.x*t,n.y*t),F(this,I,`f`).time.value=r,F(this,I,`f`).mouse.value.set(i*t,a*t)}updateCustomUniforms(e){for(let[e,t]of Object.entries(F(this,St,`f`)))F(this,I,`f`)[e]&&(F(this,I,`f`)[e].value=t());if(e)for(let[t,n]of Object.entries(e))F(this,I,`f`)[t]&&(F(this,I,`f`)[t].value=n())}initializeBackbuffer(e,t,n,r){F(this,Ct,`f`)&&!F(this,L,`f`)&&(F(this,R,`f`)?xt(this,L,new be(e,F(this,R,`f`)[0],F(this,R,`f`)[1],1,F(this,wt,`f`)),`f`):xt(this,L,new be(e,t,n,r,F(this,wt,`f`)),`f`))}resizeBackbuffer(e,t){F(this,L,`f`)&&!F(this,R,`f`)&&F(this,L,`f`).resize(e,t)}registerBufferUniform(e){F(this,I,`f`)[e]||(F(this,I,`f`)[e]={value:null})}get backbuffer(){return F(this,L,`f`)}get persistent(){return F(this,Ct,`f`)}get float(){return F(this,wt,`f`)}get size(){return F(this,R,`f`)}getTargetDimensions(){return F(this,R,`f`)}dispose(){this.pass.dispose(),F(this,L,`f`)?.dispose()}};I=new WeakMap,St=new WeakMap,L=new WeakMap,Ct=new WeakMap,wt=new WeakMap,R=new WeakMap;function Et(e,t,n,r){return{top:e,right:t,bottom:n,left:r}}function Dt(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:Array.isArray(e)?{top:e[0],right:e[1],bottom:e[2],left:e[3]}:{top:e.top??0,right:e.right??0,bottom:e.bottom??0,left:e.left??0}}function Ot(e){return Dt(e)}var kt=Et(0,0,0,0);function At(e){return Dt(e)}function jt(e){return{top:e.top,right:e.right,bottom:e.bottom,left:e.left}}function Mt(e,t){return{top:e.top-t.top,right:e.right+t.right,bottom:e.bottom+t.bottom,left:e.left-t.left}}function Nt(e,t,n){return Math.min(Math.max(e,t),n)}function Pt(e,t){let n=Nt(t.left,e.left,e.right),r=(Nt(t.right,e.left,e.right)-n)/(t.right-t.left),i=Nt(t.top,e.top,e.bottom);return r*((Nt(t.bottom,e.top,e.bottom)-i)/(t.bottom-t.top))}var z=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},B=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},V,H,U,W,Ft,It,G,K,Lt,q,Rt,zt,Bt,J,Y,Vt,Ht,Ut,Wt,Gt,Kt,qt,Jt,Yt,Xt,Zt,Qt,$t,en,tn,nn,rn,X,an,on,sn,cn,ln=new Map,un=class{constructor(e,t){V.add(this),H.set(this,void 0),U.set(this,void 0),W.set(this,void 0),Ft.set(this,void 0),It.set(this,void 0),G.set(this,void 0),K.set(this,[]),Lt.set(this,[]),q.set(this,void 0),Rt.set(this,[]),zt.set(this,new Map),Bt.set(this,void 0),J.set(this,2),Y.set(this,[]),Vt.set(this,Date.now()/1e3),Ht.set(this,At(0)),Ut.set(this,At(0)),Wt.set(this,[0,0]),Gt.set(this,0),Kt.set(this,0),qt.set(this,0),Jt.set(this,0),Yt.set(this,new WeakMap),Zt.set(this,async()=>{if(typeof window<`u`){for(let e of B(this,Y,`f`))if(e.type===`text`&&e.isInViewport){let t=e.element.getBoundingClientRect();(t.width!==e.width||t.height!==e.height)&&(await B(this,V,`m`,$t).call(this,e),e.width=t.width,e.height=t.height)}for(let e of B(this,Y,`f`))if(e.type===`text`&&!e.isInViewport){let t=e.element.getBoundingClientRect();(t.width!==e.width||t.height!==e.height)&&(await B(this,V,`m`,$t).call(this,e),e.width=t.width,e.height=t.height)}}}),Qt.set(this,e=>{typeof window<`u`&&(z(this,qt,e.clientX,`f`),z(this,Jt,window.innerHeight-e.clientY,`f`))}),tn.set(this,()=>{this.isPlaying()&&(this.render(),z(this,Bt,requestAnimationFrame(B(this,tn,`f`)),`f`))}),z(this,H,e,`f`),z(this,U,t,`f`),z(this,W,new dt(t),`f`),z(this,Ft,B(this,W,`f`).gl,`f`),B(this,Ft,`f`).clearColor(0,0,0,0),z(this,J,e.pixelRatio,`f`),z(this,It,new vt(B(this,W,`f`)),`f`),typeof window<`u`&&(window.addEventListener(`resize`,B(this,Zt,`f`)),window.addEventListener(`pointermove`,B(this,Qt,`f`))),B(this,Zt,`f`).call(this),z(this,G,new Ve(B(this,W,`f`)),`f`),B(this,V,`m`,on).call(this,e.postEffects),B(this,W,`f`).onContextRestored(()=>{B(this,Ft,`f`).clearColor(0,0,0,0)})}destroy(){this.stop(),typeof window<`u`&&(window.removeEventListener(`resize`,B(this,Zt,`f`)),window.removeEventListener(`pointermove`,B(this,Qt,`f`))),B(this,q,`f`)?.dispose();for(let e of B(this,zt,`f`).values())e?.dispose();for(let e of B(this,K,`f`))e.dispose();B(this,G,`f`).dispose(),B(this,It,`f`).dispose()}async addElement(e,t={},n){let r=B(this,V,`m`,en).call(this,t),i=e.getBoundingClientRect(),a=jt(i),[o,s]=pn(t.overflow),c=Mt(a,s),l=mn(t.intersection),u=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),d,f,p=!1;if(e instanceof HTMLImageElement)if(f=`img`,p=!!e.src.match(/\.gif/i),p){let t=await at.create(e.src,B(this,J,`f`));ln.set(e,t),d=new k(B(this,W,`f`),t.getCanvas())}else{let t=await se(e.src);d=new k(B(this,W,`f`),t)}else if(e instanceof HTMLVideoElement)d=new k(B(this,W,`f`),e),f=`video`;else if(e instanceof HTMLCanvasElement)e.hasAttribute(`layoutsubtree`)&&n?(d=new k(B(this,W,`f`),n),f=`hic`):(d=new k(B(this,W,`f`),e),f=`canvas`);else{let t=await Ue(e,u,void 0,this.maxTextureSize);d=new k(B(this,W,`f`),t),f=`text`}let[m,h]=gn(t.wrap);d.wrapS=m,d.wrapT=h,d.needsUpdate=!0;let g=t.autoCrop??!0;if(f!==`hic`&&t.overlay!==!0)if(typeof t.overlay==`number`)e.style.setProperty(`opacity`,t.overlay.toString());else{let t=f===`video`?`0.0001`:`0`;e.style.setProperty(`opacity`,t.toString())}let _={src:{value:d},resolution:{value:new xe},offset:{value:new xe},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},mouse:{value:new xe},intersection:{value:0},viewport:{value:new Se},autoCrop:{value:g}},v={};if(t.uniforms!==void 0)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(_[e]={value:n()},v[e]=n):_[e]={value:n};let y;t.backbuffer&&(y=(()=>{let e=(c.right-c.left)*B(this,J,`f`),t=(c.bottom-c.top)*B(this,J,`f`);return new be(B(this,W,`f`),e,t,B(this,J,`f`),!1)})(),_.backbuffer={value:y.texture});let ee=new Map,te=new Map;for(let e=0;e<r.length-1;e++){let t=r[e].target??`pass${e}`;r[e]={...r[e],target:t};let n=r[e].size,i=n?n[0]:(c.right-c.left)*B(this,J,`f`),a=n?n[1]:(c.bottom-c.top)*B(this,J,`f`);if(r[e].persistent){let i=n?1:B(this,J,`f`),a=n?n[0]:c.right-c.left,o=n?n[1]:c.bottom-c.top;te.set(t,new be(B(this,W,`f`),a,o,i,r[e].float))}else ee.set(t,yt(B(this,W,`f`),i,a,{float:r[e].float}))}let b=[];for(let e=0;e<r.length;e++){let t=r[e],n=t.frag,i={..._},a={};for(let[e,r]of ee)e!==t.target&&n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:r.texture});for(let[e,t]of te)n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:t.texture});if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(i[e]={value:n()},a[e]=n):i[e]={value:n};let o=bt(B(this,W,`f`),{vertexShader:t.vert,fragmentShader:n,uniforms:i,renderingToBuffer:t.target!==void 0,glslVersion:t.glslVersion});b.push({pass:o,uniforms:i,uniformGenerators:{...v,...a},target:t.target,persistent:t.persistent,float:t.float,size:t.size,backbuffer:t.target?te.get(t.target):void 0})}let x=Date.now()/1e3,S={type:f,element:e,isInViewport:!1,isInLogicalViewport:!1,width:i.width,height:i.height,passes:b,bufferTargets:ee,startTime:x,enterTime:x,leaveTime:-1/0,release:t.release??1/0,isGif:p,isFullScreen:o,overflow:s,intersection:l,originalOpacity:u,srcTexture:d,zIndex:t.zIndex??0,backbuffer:y,autoCrop:g};B(this,V,`m`,nn).call(this,S,a,x),B(this,Y,`f`).push(S),B(this,Y,`f`).sort((e,t)=>e.zIndex-t.zIndex)}removeElement(e){let t=B(this,Y,`f`).findIndex(t=>t.element===e);if(t!==-1){let n=B(this,Y,`f`).splice(t,1)[0];for(let e of n.bufferTargets.values())e.dispose();for(let e of n.passes)e.pass.dispose(),e.backbuffer?.dispose();n.backbuffer?.dispose(),n.srcTexture.dispose(),e.style.setProperty(`opacity`,n.originalOpacity.toString())}}updateTextElement(e){let t=B(this,Y,`f`).findIndex(t=>t.element===e);return t===-1?Promise.resolve():B(this,V,`m`,$t).call(this,B(this,Y,`f`)[t])}updateCanvasElement(e){let t=B(this,Y,`f`).find(t=>t.element===e);if(t){let n=t.passes[0].uniforms.src,r=n.value,i=new k(B(this,W,`f`),e);i.wrapS=r.wrapS,i.wrapT=r.wrapT,i.needsUpdate=!0,n.value=i,t.srcTexture=i,r.dispose()}}updateHICTexture(e,t){let n=B(this,Y,`f`).find(t=>t.element===e);if(!n||n.type!==`hic`)return;let r=n.passes[0].uniforms.src,i=r.value;if(i.source===t)i.needsUpdate=!0;else{let e=new k(B(this,W,`f`),t);e.wrapS=i.wrapS,e.wrapT=i.wrapT,e.needsUpdate=!0,r.value=e,n.srcTexture=e,i.dispose()}}get maxTextureSize(){return B(this,W,`f`).maxTextureSize}isPlaying(){return B(this,Bt,`f`)!==void 0}play(){this.isPlaying()||z(this,Bt,requestAnimationFrame(B(this,tn,`f`)),`f`)}stop(){B(this,Bt,`f`)!==void 0&&(cancelAnimationFrame(B(this,Bt,`f`)),z(this,Bt,void 0,`f`))}render(){let e=Date.now()/1e3,t=B(this,Ft,`f`);B(this,V,`m`,Xt).call(this),t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,B(this,U,`f`).width,B(this,U,`f`).height),t.clear(t.COLOR_BUFFER_BIT);let n=B(this,Ht,`f`).right-B(this,Ht,`f`).left,r=B(this,Ht,`f`).bottom-B(this,Ht,`f`).top,i=he(0,0,n,r),a=B(this,K,`f`).length>0;a&&(B(this,V,`m`,cn).call(this,n,r),B(this,q,`f`)&&(t.bindFramebuffer(t.FRAMEBUFFER,B(this,q,`f`).fbo),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)));for(let t of B(this,Y,`f`)){let o=t.element.getBoundingClientRect(),s=jt(o),c=B(this,V,`m`,nn).call(this,t,s,e);if(!c.isVisible)continue;let l=t.passes[0].uniforms;l.time.value=e-t.startTime,l.resolution.value.set(o.width*B(this,J,`f`),o.height*B(this,J,`f`)),l.mouse.value.set((B(this,qt,`f`)+B(this,Gt,`f`))*B(this,J,`f`),(B(this,Jt,`f`)+B(this,Kt,`f`))*B(this,J,`f`));for(let e of t.passes)for(let[t,n]of Object.entries(e.uniformGenerators))e.uniforms[t].value=n();ln.get(t.element)?.update(),(t.type===`video`||t.isGif)&&(l.src.value.needsUpdate=!0);let u=me(s,r,B(this,Gt,`f`),B(this,Kt,`f`)),d=me(c.rectWithOverflow,r,B(this,Gt,`f`),B(this,Kt,`f`));t.backbuffer&&(t.passes[0].uniforms.backbuffer.value=t.backbuffer.texture);{let e=t.isFullScreen?i:d,n=Math.max(1,e.w*B(this,J,`f`)),r=Math.max(1,e.h*B(this,J,`f`)),a=Math.max(1,e.w),o=Math.max(1,e.h);for(let e=0;e<t.passes.length-1;e++){let i=t.passes[e];if(!i.size)if(i.backbuffer)i.backbuffer.resize(a,o);else{let e=t.bufferTargets.get(i.target);e&&(e.width!==n||e.height!==r)&&e.setSize(n,r)}}}let f=new Map;for(let e of t.passes)e.backbuffer&&e.target&&f.set(e.target,e.backbuffer.texture);let p=t.srcTexture,m=B(this,qt,`f`)+B(this,Gt,`f`)-u.x,h=B(this,Jt,`f`)+B(this,Kt,`f`)-u.y;for(let e=0;e<t.passes.length-1;e++){let n=t.passes[e],r=t.isFullScreen?i:d;n.uniforms.src.value=p;for(let[e,t]of f)n.uniforms[e]&&(n.uniforms[e].value=t);for(let[e,t]of Object.entries(n.uniformGenerators))n.uniforms[e]&&(n.uniforms[e].value=t());let a=n.size?n.size[0]:r.w*B(this,J,`f`),o=n.size?n.size[1]:r.h*B(this,J,`f`),s=n.size?he(0,0,n.size[0],n.size[1]):he(0,0,r.w,r.h);if(n.uniforms.resolution.value.set(a,o),n.uniforms.offset.value.set(0,0),n.uniforms.mouse.value.set(m/r.w*a,h/r.h*o),n.backbuffer)B(this,V,`m`,X).call(this,n.pass,n.backbuffer.target,s,n.uniforms,!0),n.backbuffer.swap(),p=n.backbuffer.texture;else{let e=t.bufferTargets.get(n.target);if(!e)continue;B(this,V,`m`,X).call(this,n.pass,e,s,n.uniforms,!0),p=e.texture}n.target&&f.set(n.target,p)}let g=t.passes[t.passes.length-1];g.uniforms.src.value=p,g.uniforms.resolution.value.set(o.width*B(this,J,`f`),o.height*B(this,J,`f`)),g.uniforms.offset.value.set(u.x*B(this,J,`f`),u.y*B(this,J,`f`)),g.uniforms.mouse.value.set((B(this,qt,`f`)+B(this,Gt,`f`))*B(this,J,`f`),(B(this,Jt,`f`)+B(this,Kt,`f`))*B(this,J,`f`));for(let[e,t]of f)g.uniforms[e]&&(g.uniforms[e].value=t);for(let[e,t]of Object.entries(g.uniformGenerators))g.uniforms[e]&&(g.uniforms[e].value=t());t.backbuffer?(g.uniforms.backbuffer.value=t.backbuffer.texture,t.isFullScreen?(t.backbuffer.resize(n,r),B(this,V,`m`,an).call(this,t,u.x,u.y),B(this,V,`m`,X).call(this,g.pass,t.backbuffer.target,i,g.uniforms,!0),t.backbuffer.swap(),B(this,G,`f`).setUniforms(t.backbuffer.texture,B(this,J,`f`),i),B(this,V,`m`,X).call(this,B(this,G,`f`).pass,a&&B(this,q,`f`)||null,i,B(this,G,`f`).uniforms,!1)):(t.backbuffer.resize(d.w,d.h),B(this,V,`m`,an).call(this,t,t.overflow.left,t.overflow.bottom),B(this,V,`m`,X).call(this,g.pass,t.backbuffer.target,t.backbuffer.getViewport(),g.uniforms,!0),t.backbuffer.swap(),B(this,G,`f`).setUniforms(t.backbuffer.texture,B(this,J,`f`),d),B(this,V,`m`,X).call(this,B(this,G,`f`).pass,a&&B(this,q,`f`)||null,d,B(this,G,`f`).uniforms,!1))):(B(this,V,`m`,an).call(this,t,u.x,u.y),B(this,V,`m`,X).call(this,g.pass,a&&B(this,q,`f`)||null,t.isFullScreen?i:d,g.uniforms,!1))}a&&B(this,q,`f`)&&B(this,V,`m`,sn).call(this,i,e)}};H=new WeakMap,U=new WeakMap,W=new WeakMap,Ft=new WeakMap,It=new WeakMap,G=new WeakMap,K=new WeakMap,Lt=new WeakMap,q=new WeakMap,Rt=new WeakMap,zt=new WeakMap,Bt=new WeakMap,J=new WeakMap,Y=new WeakMap,Vt=new WeakMap,Ht=new WeakMap,Ut=new WeakMap,Wt=new WeakMap,Gt=new WeakMap,Kt=new WeakMap,qt=new WeakMap,Jt=new WeakMap,Yt=new WeakMap,Zt=new WeakMap,Qt=new WeakMap,tn=new WeakMap,V=new WeakSet,Xt=function(){if(typeof window>`u`)return;let e=B(this,U,`f`).ownerDocument,t=e.compatMode===`BackCompat`?e.body:e.documentElement,n=t.clientWidth,r=t.clientHeight,i=window.scrollX,a=window.scrollY,o,s;if(B(this,H,`f`).fixedCanvas)o=0,s=0;else if(B(this,H,`f`).wrapper)o=n*B(this,H,`f`).scrollPadding[0],s=r*B(this,H,`f`).scrollPadding[1];else{let t=e.body.scrollWidth-(i+n),c=e.body.scrollHeight-(a+r);o=_n(n*B(this,H,`f`).scrollPadding[0],0,t),s=_n(r*B(this,H,`f`).scrollPadding[1],0,c)}let c=n+o*2,l=r+s*2;(c!==B(this,Wt,`f`)[0]||l!==B(this,Wt,`f`)[1])&&(B(this,U,`f`).style.width=`${c}px`,B(this,U,`f`).style.height=`${l}px`,B(this,W,`f`).setSize(c,l,B(this,J,`f`)),z(this,Ht,At({top:-s,left:-o,right:n+o,bottom:r+s}),`f`),z(this,Ut,At({top:0,left:0,right:n,bottom:r}),`f`),z(this,Wt,[c,l],`f`),z(this,Gt,o,`f`),z(this,Kt,s,`f`)),B(this,H,`f`).fixedCanvas||B(this,U,`f`).style.setProperty(`transform`,`translate(${i-o}px, ${a-s}px)`)},$t=async function(e){if(!B(this,Yt,`f`).get(e.element)){B(this,Yt,`f`).set(e.element,!0);try{let t=e.passes[0].uniforms.src,n=t.value,r=n.source instanceof OffscreenCanvas?n.source:void 0,i=await Ue(e.element,e.originalOpacity,r,this.maxTextureSize);if(i.width===0||i.width===0)throw`omg`;let a=new k(B(this,W,`f`),i);a.wrapS=n.wrapS,a.wrapT=n.wrapT,a.needsUpdate=!0,t.value=a,e.srcTexture=a,n.dispose()}catch(e){console.error(e)}B(this,Yt,`f`).set(e.element,!1)}},en=function(e){let t=t=>t.glslVersion===void 0&&e.glslVersion!==void 0?{...t,glslVersion:e.glslVersion}:t;return Array.isArray(e.shader)?e.shader.map(t):[t({frag:B(this,V,`m`,rn).call(this,e.shader||`uvGradient`)})]},nn=function(e,t,n){let r=Mt(t,e.overflow),i=e.isFullScreen||dn(B(this,Ut,`f`),r),a=Mt(B(this,Ut,`f`),e.intersection.rootMargin),o=Pt(a,t),s=e.isFullScreen||fn(a,t,o,e.intersection.threshold);!e.isInLogicalViewport&&s&&(e.enterTime=n,e.leaveTime=1/0),e.isInLogicalViewport&&!s&&(e.leaveTime=n),e.isInViewport=i,e.isInLogicalViewport=s;let c=i&&n-e.leaveTime<=e.release;if(c){let t=e.passes[0].uniforms;t.intersection.value=o,t.enterTime.value=n-e.enterTime,t.leaveTime.value=n-e.leaveTime}return{isVisible:c,intersection:o,rectWithOverflow:r}},rn=function(e){return e in s?s[e]:e},X=function(e,t,n,r,i){let a=B(this,Ft,`f`);i&&t!==null&&t!==B(this,q,`f`)&&(a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.viewport(0,0,t.width,t.height),a.clear(a.COLOR_BUFFER_BIT));let o=r.viewport;o&&o.value instanceof Se&&o.value.set(n.x*B(this,J,`f`),n.y*B(this,J,`f`),n.w*B(this,J,`f`),n.h*B(this,J,`f`));try{ze(a,B(this,It,`f`),e,t,n,B(this,Wt,`f`)[0],B(this,Wt,`f`)[1],B(this,J,`f`))}catch(e){console.error(e)}},an=function(e,t,n){let r=e.passes[0].uniforms.offset.value;r.x=t*B(this,J,`f`),r.y=n*B(this,J,`f`)},on=function(e){let t=[],n=[],r=[];for(let t of e)`frag`in t&&r.push(t);for(let e=0;e<r.length-1;e++)r[e].target||(r[e]={...r[e],target:`pass${e}`});for(let r of e){let e,i;`frag`in r?(e=r.frag,i=new Tt(B(this,W,`f`),e,r.uniforms,r.persistent??!1,r.float??!1,r.size,r.target!==void 0,r.glslVersion),n.push(r.target)):(e=B(this,V,`m`,rn).call(this,r.shader),i=new Tt(B(this,W,`f`),e,r.uniforms,r.persistent??!1,r.float??!1,void 0,!1,r.glslVersion),r.persistent&&i.registerBufferUniform(`backbuffer`),n.push(void 0)),B(this,K,`f`).push(i),t.push(e);let a={};if(r.uniforms)for(let[e,t]of Object.entries(r.uniforms))typeof t==`function`&&(a[e]=t);B(this,Rt,`f`).push(a)}z(this,Lt,n,`f`);for(let e of r)e.target&&B(this,zt,`f`).set(e.target,void 0);let i=n.filter(e=>e!==void 0);for(let e=0;e<B(this,K,`f`).length;e++)for(let n of i)t[e].match(RegExp(`uniform\\s+sampler2D\\s+${n}\\b`))&&B(this,K,`f`)[e].registerBufferUniform(n)},sn=function(e,t){if(!B(this,q,`f`))return;let n=B(this,q,`f`).texture,r=new Map;for(let e=0;e<B(this,K,`f`).length;e++){let t=B(this,K,`f`)[e],n=B(this,Lt,`f`)[e];n&&t.backbuffer&&r.set(n,t.backbuffer.texture)}for(let i=0;i<B(this,K,`f`).length;i++){let a=B(this,K,`f`)[i],o=i===B(this,K,`f`).length-1,s=B(this,Rt,`f`)[i],c=B(this,Lt,`f`)[i],l=B(this,qt,`f`)+B(this,Gt,`f`),u=B(this,Jt,`f`)+B(this,Kt,`f`),d=a.getTargetDimensions();if(d){let[r,i]=d;a.uniforms.src.value=n,a.uniforms.resolution.value.set(r,i),a.uniforms.offset.value.set(0,0),a.uniforms.time.value=t-B(this,Vt,`f`),a.uniforms.mouse.value.set(l/e.w*r,u/e.h*i)}else a.setUniforms(n,B(this,J,`f`),e,t-B(this,Vt,`f`),l,u);a.uniforms.passIndex.value=i,a.updateCustomUniforms(s);for(let[e,t]of r){let n=a.uniforms[e];n&&(n.value=t)}if(o)a.backbuffer?(a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture),B(this,V,`m`,X).call(this,a.pass,a.backbuffer.target,e,a.uniforms,!0),a.backbuffer.swap(),B(this,G,`f`).setUniforms(a.backbuffer.texture,B(this,J,`f`),e),B(this,V,`m`,X).call(this,B(this,G,`f`).pass,null,e,B(this,G,`f`).uniforms,!1)):B(this,V,`m`,X).call(this,a.pass,null,e,a.uniforms,!1);else if(a.backbuffer){a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture);let t=d?he(0,0,d[0]/B(this,J,`f`),d[1]/B(this,J,`f`)):e;B(this,V,`m`,X).call(this,a.pass,a.backbuffer.target,t,a.uniforms,!0),a.backbuffer.swap(),n=a.backbuffer.texture,c&&r.set(c,a.backbuffer.texture)}else{let t=c??`postEffect${i}`,o=B(this,zt,`f`).get(t),s=d?d[0]:e.w*B(this,J,`f`),l=d?d[1]:e.h*B(this,J,`f`);(!o||o.width!==s||o.height!==l)&&(o?.dispose(),o=yt(B(this,W,`f`),s,l,{float:a.float}),B(this,zt,`f`).set(t,o));let u=d?he(0,0,d[0]/B(this,J,`f`),d[1]/B(this,J,`f`)):e;B(this,V,`m`,X).call(this,a.pass,o,u,a.uniforms,!0),n=o.texture,c&&r.set(c,o.texture)}}},cn=function(e,t){let n=e*B(this,J,`f`),r=t*B(this,J,`f`);(!B(this,q,`f`)||B(this,q,`f`).width!==n||B(this,q,`f`).height!==r)&&(B(this,q,`f`)?.dispose(),z(this,q,yt(B(this,W,`f`),n,r),`f`));for(let n of B(this,K,`f`))n.persistent&&!n.backbuffer?n.initializeBackbuffer(B(this,W,`f`),e,t,B(this,J,`f`)):n.backbuffer&&n.resizeBackbuffer(e,t)};function dn(e,t){return t.left<=e.right&&t.right>=e.left&&t.top<=e.bottom&&t.bottom>=e.top}function fn(e,t,n,r){return r===0?dn(e,t):n>=r}function pn(e){return e===!0?[!0,kt]:e===void 0?[!1,kt]:[!1,Ot(e)]}function mn(e){return{threshold:e?.threshold??0,rootMargin:Ot(e?.rootMargin??0)}}function hn(e){return e===`repeat`?`repeat`:e===`mirror`?`mirror`:`clamp`}function gn(e){if(!e)return[`clamp`,`clamp`];if(Array.isArray(e))return[hn(e[0]),hn(e[1])];let t=hn(e);return[t,t]}function _n(e,t,n){return Math.max(t,Math.min(n,e))}function vn(){try{let e=document.createElement(`canvas`);return(e.getContext(`webgl2`)||e.getContext(`webgl`))!==null}catch{return!1}}var yn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Z=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},bn,Q,xn,Sn,Cn,wn,Tn,En;function Dn(){if(typeof window>`u`)throw`Cannot find 'window'. VFX-JS only runs on the browser.`;if(typeof document>`u`)throw`Cannot find 'document'. VFX-JS only runs on the browser.`}function On(e){return{position:e?`fixed`:`absolute`,top:0,left:0,width:`0px`,height:`0px`,"z-index":9999,"pointer-events":`none`}}var kn=class e{static init(t){try{return new e(t)}catch{return null}}constructor(e={}){if(bn.add(this),Q.set(this,void 0),xn.set(this,void 0),Sn.set(this,new Map),Dn(),!vn())throw Error(`[VFX-JS] WebGL is not available in this environment.`);let t=C(e),n=document.createElement(`canvas`),r=On(t.fixedCanvas);for(let[e,t]of Object.entries(r))n.style.setProperty(e,t.toString());t.zIndex!==void 0&&n.style.setProperty(`z-index`,t.zIndex.toString()),(t.wrapper??document.body).appendChild(n),yn(this,xn,n,`f`),yn(this,Q,new un(t,n),`f`),t.autoplay&&Z(this,Q,`f`).play()}async add(e,t,n){e instanceof HTMLImageElement?await Z(this,bn,`m`,Cn).call(this,e,t):e instanceof HTMLVideoElement?await Z(this,bn,`m`,wn).call(this,e,t):e instanceof HTMLCanvasElement?e.hasAttribute(`layoutsubtree`)&&n?await Z(this,Q,`f`).addElement(e,t,n):await Z(this,bn,`m`,Tn).call(this,e,t):await Z(this,bn,`m`,En).call(this,e,t)}updateHICTexture(e,t){Z(this,Q,`f`).updateHICTexture(e,t)}get maxTextureSize(){return Z(this,Q,`f`).maxTextureSize}async addHTML(e,t){if(!S())return console.warn(`html-in-canvas not supported, falling back to dom-to-canvas`),this.add(e,t);t.overlay!==void 0&&console.warn(`addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.`);let{overlay:n,...r}=t,i=Z(this,Sn,`f`).get(e);i&&Z(this,Q,`f`).removeElement(i);let{canvas:a,initialCapture:o}=await te(e,{onCapture:e=>{Z(this,Q,`f`).updateHICTexture(a,e)},maxSize:Z(this,Q,`f`).maxTextureSize});i=a,Z(this,Sn,`f`).set(e,i),await Z(this,Q,`f`).addElement(i,r,o)}remove(e){let t=Z(this,Sn,`f`).get(e);t?(b(t,e),Z(this,Sn,`f`).delete(e),Z(this,Q,`f`).removeElement(t)):Z(this,Q,`f`).removeElement(e)}async update(e){let t=Z(this,Sn,`f`).get(e);if(t){t.requestPaint();return}if(e instanceof HTMLCanvasElement){Z(this,Q,`f`).updateCanvasElement(e);return}else return Z(this,Q,`f`).updateTextElement(e)}play(){Z(this,Q,`f`).play()}stop(){Z(this,Q,`f`).stop()}render(){Z(this,Q,`f`).render()}destroy(){for(let[e,t]of Z(this,Sn,`f`))b(t,e);Z(this,Sn,`f`).clear(),Z(this,Q,`f`).destroy(),Z(this,xn,`f`).remove()}};Q=new WeakMap,xn=new WeakMap,Sn=new WeakMap,bn=new WeakSet,Cn=function(e,t){return e.complete?Z(this,Q,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`load`,()=>{Z(this,Q,`f`).addElement(e,t),n()},{once:!0})})},wn=function(e,t){return e.readyState>=3?Z(this,Q,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`canplay`,()=>{Z(this,Q,`f`).addElement(e,t),n()},{once:!0})})},Tn=function(e,t){return Z(this,Q,`f`).addElement(e,t)},En=function(e,t){return Z(this,Q,`f`).addElement(e,t)};var An=e(t(((e,t)=>{var n=function(e){var t=/(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i,n=0,r={},i={manual:e.Prism&&e.Prism.manual,disableWorkerMessageHandler:e.Prism&&e.Prism.disableWorkerMessageHandler,util:{encode:function e(t){return t instanceof a?new a(t.type,e(t.content),t.alias):Array.isArray(t)?t.map(e):t.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/\u00a0/g,` `)},type:function(e){return Object.prototype.toString.call(e).slice(8,-1)},objId:function(e){return e.__id||Object.defineProperty(e,`__id`,{value:++n}),e.__id},clone:function e(t,n){n||={};var r,a;switch(i.util.type(t)){case`Object`:if(a=i.util.objId(t),n[a])return n[a];for(var o in r={},n[a]=r,t)t.hasOwnProperty(o)&&(r[o]=e(t[o],n));return r;case`Array`:return a=i.util.objId(t),n[a]?n[a]:(r=[],n[a]=r,t.forEach(function(t,i){r[i]=e(t,n)}),r);default:return t}},getLanguage:function(e){for(;e;){var n=t.exec(e.className);if(n)return n[1].toLowerCase();e=e.parentElement}return`none`},setLanguage:function(e,n){e.className=e.className.replace(RegExp(t,`gi`),``),e.classList.add(`language-`+n)},currentScript:function(){if(typeof document>`u`)return null;if(document.currentScript&&document.currentScript.tagName===`SCRIPT`)return document.currentScript;try{throw Error()}catch(r){var e=(/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(r.stack)||[])[1];if(e){var t=document.getElementsByTagName(`script`);for(var n in t)if(t[n].src==e)return t[n]}return null}},isActive:function(e,t,n){for(var r=`no-`+t;e;){var i=e.classList;if(i.contains(t))return!0;if(i.contains(r))return!1;e=e.parentElement}return!!n}},languages:{plain:r,plaintext:r,text:r,txt:r,extend:function(e,t){var n=i.util.clone(i.languages[e]);for(var r in t)n[r]=t[r];return n},insertBefore:function(e,t,n,r){r||=i.languages;var a=r[e],o={};for(var s in a)if(a.hasOwnProperty(s)){if(s==t)for(var c in n)n.hasOwnProperty(c)&&(o[c]=n[c]);n.hasOwnProperty(s)||(o[s]=a[s])}var l=r[e];return r[e]=o,i.languages.DFS(i.languages,function(t,n){n===l&&t!=e&&(this[t]=o)}),o},DFS:function e(t,n,r,a){a||={};var o=i.util.objId;for(var s in t)if(t.hasOwnProperty(s)){n.call(t,s,t[s],r||s);var c=t[s],l=i.util.type(c);l===`Object`&&!a[o(c)]?(a[o(c)]=!0,e(c,n,null,a)):l===`Array`&&!a[o(c)]&&(a[o(c)]=!0,e(c,n,s,a))}}},plugins:{},highlightAll:function(e,t){i.highlightAllUnder(document,e,t)},highlightAllUnder:function(e,t,n){var r={callback:n,container:e,selector:`code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code`};i.hooks.run(`before-highlightall`,r),r.elements=Array.prototype.slice.apply(r.container.querySelectorAll(r.selector)),i.hooks.run(`before-all-elements-highlight`,r);for(var a=0,o;o=r.elements[a++];)i.highlightElement(o,t===!0,r.callback)},highlightElement:function(t,n,r){var a=i.util.getLanguage(t),o=i.languages[a];i.util.setLanguage(t,a);var s=t.parentElement;s&&s.nodeName.toLowerCase()===`pre`&&i.util.setLanguage(s,a);var c={element:t,language:a,grammar:o,code:t.textContent};function l(e){c.highlightedCode=e,i.hooks.run(`before-insert`,c),c.element.innerHTML=c.highlightedCode,i.hooks.run(`after-highlight`,c),i.hooks.run(`complete`,c),r&&r.call(c.element)}if(i.hooks.run(`before-sanity-check`,c),s=c.element.parentElement,s&&s.nodeName.toLowerCase()===`pre`&&!s.hasAttribute(`tabindex`)&&s.setAttribute(`tabindex`,`0`),!c.code){i.hooks.run(`complete`,c),r&&r.call(c.element);return}if(i.hooks.run(`before-highlight`,c),!c.grammar){l(i.util.encode(c.code));return}if(n&&e.Worker){var u=new Worker(i.filename);u.onmessage=function(e){l(e.data)},u.postMessage(JSON.stringify({language:c.language,code:c.code,immediateClose:!0}))}else l(i.highlight(c.code,c.grammar,c.language))},highlight:function(e,t,n){var r={code:e,grammar:t,language:n};if(i.hooks.run(`before-tokenize`,r),!r.grammar)throw Error(`The language "`+r.language+`" has no grammar.`);return r.tokens=i.tokenize(r.code,r.grammar),i.hooks.run(`after-tokenize`,r),a.stringify(i.util.encode(r.tokens),r.language)},tokenize:function(e,t){var n=t.rest;if(n){for(var r in n)t[r]=n[r];delete t.rest}var i=new c;return l(i,i.head,e),s(e,i,t,i.head,0),d(i)},hooks:{all:{},add:function(e,t){var n=i.hooks.all;n[e]=n[e]||[],n[e].push(t)},run:function(e,t){var n=i.hooks.all[e];if(!(!n||!n.length))for(var r=0,a;a=n[r++];)a(t)}},Token:a};e.Prism=i;function a(e,t,n,r){this.type=e,this.content=t,this.alias=n,this.length=(r||``).length|0}a.stringify=function e(t,n){if(typeof t==`string`)return t;if(Array.isArray(t)){var r=``;return t.forEach(function(t){r+=e(t,n)}),r}var a={type:t.type,content:e(t.content,n),tag:`span`,classes:[`token`,t.type],attributes:{},language:n},o=t.alias;o&&(Array.isArray(o)?Array.prototype.push.apply(a.classes,o):a.classes.push(o)),i.hooks.run(`wrap`,a);var s=``;for(var c in a.attributes)s+=` `+c+`="`+(a.attributes[c]||``).replace(/"/g,`&quot;`)+`"`;return`<`+a.tag+` class="`+a.classes.join(` `)+`"`+s+`>`+a.content+`</`+a.tag+`>`};function o(e,t,n,r){e.lastIndex=t;var i=e.exec(n);if(i&&r&&i[1]){var a=i[1].length;i.index+=a,i[0]=i[0].slice(a)}return i}function s(e,t,n,r,c,d){for(var f in n)if(!(!n.hasOwnProperty(f)||!n[f])){var p=n[f];p=Array.isArray(p)?p:[p];for(var m=0;m<p.length;++m){if(d&&d.cause==f+`,`+m)return;var h=p[m],g=h.inside,_=!!h.lookbehind,v=!!h.greedy,y=h.alias;if(v&&!h.pattern.global){var ee=h.pattern.toString().match(/[imsuy]*$/)[0];h.pattern=RegExp(h.pattern.source,ee+`g`)}for(var te=h.pattern||h,b=r.next,x=c;b!==t.tail&&!(d&&x>=d.reach);x+=b.value.length,b=b.next){var S=b.value;if(t.length>e.length)return;if(!(S instanceof a)){var C=1,w;if(v){if(w=o(te,x,e,_),!w||w.index>=e.length)break;var T=w.index,ne=w.index+w[0].length,E=x;for(E+=b.value.length;T>=E;)b=b.next,E+=b.value.length;if(E-=b.value.length,x=E,b.value instanceof a)continue;for(var D=b;D!==t.tail&&(E<ne||typeof D.value==`string`);D=D.next)C++,E+=D.value.length;C--,S=e.slice(x,E),w.index-=x}else if(w=o(te,0,S,_),!w)continue;var T=w.index,O=w[0],re=S.slice(0,T),ie=S.slice(T+O.length),ae=x+S.length;d&&ae>d.reach&&(d.reach=ae);var k=b.prev;re&&(k=l(t,k,re),x+=re.length),u(t,k,C);var oe=new a(f,g?i.tokenize(O,g):O,y,O);if(b=l(t,k,oe),ie&&l(t,b,ie),C>1){var se={cause:f+`,`+m,reach:ae};s(e,t,n,b.prev,x,se),d&&se.reach>d.reach&&(d.reach=se.reach)}}}}}}function c(){var e={value:null,prev:null,next:null},t={value:null,prev:e,next:null};e.next=t,this.head=e,this.tail=t,this.length=0}function l(e,t,n){var r=t.next,i={value:n,prev:t,next:r};return t.next=i,r.prev=i,e.length++,i}function u(e,t,n){for(var r=t.next,i=0;i<n&&r!==e.tail;i++)r=r.next;t.next=r,r.prev=t,e.length-=i}function d(e){for(var t=[],n=e.head.next;n!==e.tail;)t.push(n.value),n=n.next;return t}if(!e.document)return e.addEventListener&&(i.disableWorkerMessageHandler||e.addEventListener(`message`,function(t){var n=JSON.parse(t.data),r=n.language,a=n.code,o=n.immediateClose;e.postMessage(i.highlight(a,i.languages[r],r)),o&&e.close()},!1)),i;var f=i.util.currentScript();f&&(i.filename=f.src,f.hasAttribute(`data-manual`)&&(i.manual=!0));function p(){i.manual||i.highlightAll()}if(!i.manual){var m=document.readyState;m===`loading`||m===`interactive`&&f&&f.defer?document.addEventListener(`DOMContentLoaded`,p):window.requestAnimationFrame?window.requestAnimationFrame(p):window.setTimeout(p,16)}return i}(typeof window<`u`?window:typeof WorkerGlobalScope<`u`&&self instanceof WorkerGlobalScope?self:{});t!==void 0&&t.exports&&(t.exports=n),typeof global<`u`&&(global.Prism=n),n.languages.markup={comment:{pattern:/<!--(?:(?!<!--)[\s\S])*?-->/,greedy:!0},prolog:{pattern:/<\?[\s\S]+?\?>/,greedy:!0},doctype:{pattern:/<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,greedy:!0,inside:{"internal-subset":{pattern:/(^[^\[]*\[)[\s\S]+(?=\]>$)/,lookbehind:!0,greedy:!0,inside:null},string:{pattern:/"[^"]*"|'[^']*'/,greedy:!0},punctuation:/^<!|>$|[[\]]/,"doctype-tag":/^DOCTYPE/i,name:/[^\s<>'"]+/}},cdata:{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,greedy:!0},tag:{pattern:/<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,greedy:!0,inside:{tag:{pattern:/^<\/?[^\s>\/]+/,inside:{punctuation:/^<\/?/,namespace:/^[^\s>\/:]+:/}},"special-attr":[],"attr-value":{pattern:/=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,inside:{punctuation:[{pattern:/^=/,alias:`attr-equals`},{pattern:/^(\s*)["']|["']$/,lookbehind:!0}]}},punctuation:/\/?>/,"attr-name":{pattern:/[^\s>\/]+/,inside:{namespace:/^[^\s>\/:]+:/}}}},entity:[{pattern:/&[\da-z]{1,8};/i,alias:`named-entity`},/&#x?[\da-f]{1,8};/i]},n.languages.markup.tag.inside[`attr-value`].inside.entity=n.languages.markup.entity,n.languages.markup.doctype.inside[`internal-subset`].inside=n.languages.markup,n.hooks.add(`wrap`,function(e){e.type===`entity`&&(e.attributes.title=e.content.replace(/&amp;/,`&`))}),Object.defineProperty(n.languages.markup.tag,`addInlined`,{value:function(e,t){var r={};r[`language-`+t]={pattern:/(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,lookbehind:!0,inside:n.languages[t]},r.cdata=/^<!\[CDATA\[|\]\]>$/i;var i={"included-cdata":{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,inside:r}};i[`language-`+t]={pattern:/[\s\S]+/,inside:n.languages[t]};var a={};a[e]={pattern:RegExp(`(<__[^>]*>)(?:<!\\[CDATA\\[(?:[^\\]]|\\](?!\\]>))*\\]\\]>|(?!<!\\[CDATA\\[)[\\s\\S])*?(?=<\\/__>)`.replace(/__/g,function(){return e}),`i`),lookbehind:!0,greedy:!0,inside:i},n.languages.insertBefore(`markup`,`cdata`,a)}}),Object.defineProperty(n.languages.markup.tag,`addAttribute`,{value:function(e,t){n.languages.markup.tag.inside[`special-attr`].push({pattern:RegExp(`(^|["'\\s])(?:`+e+`)\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s'">=]+(?=[\\s>]))`,`i`),lookbehind:!0,inside:{"attr-name":/^[^\s=]+/,"attr-value":{pattern:/=[\s\S]+/,inside:{value:{pattern:/(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,lookbehind:!0,alias:[t,`language-`+t],inside:n.languages[t]},punctuation:[{pattern:/^=/,alias:`attr-equals`},/"|'/]}}}})}}),n.languages.html=n.languages.markup,n.languages.mathml=n.languages.markup,n.languages.svg=n.languages.markup,n.languages.xml=n.languages.extend(`markup`,{}),n.languages.ssml=n.languages.xml,n.languages.atom=n.languages.xml,n.languages.rss=n.languages.xml,(function(e){var t=/(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;e.languages.css={comment:/\/\*[\s\S]*?\*\//,atrule:{pattern:RegExp(`@[\\w-](?:[^;{\\s"']|\\s+(?!\\s)|`+t.source+`)*?(?:;|(?=\\s*\\{))`),inside:{rule:/^@[\w-]+/,"selector-function-argument":{pattern:/(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,lookbehind:!0,alias:`selector`},keyword:{pattern:/(^|[^\w-])(?:and|not|only|or)(?![\w-])/,lookbehind:!0}}},url:{pattern:RegExp(`\\burl\\((?:`+t.source+`|(?:[^\\\\\\r\\n()"']|\\\\[\\s\\S])*)\\)`,`i`),greedy:!0,inside:{function:/^url/i,punctuation:/^\(|\)$/,string:{pattern:RegExp(`^`+t.source+`$`),alias:`url`}}},selector:{pattern:RegExp(`(^|[{}\\s])[^{}\\s](?:[^{};"'\\s]|\\s+(?![\\s{])|`+t.source+`)*(?=\\s*\\{)`),lookbehind:!0},string:{pattern:t,greedy:!0},property:{pattern:/(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,lookbehind:!0},important:/!important\b/i,function:{pattern:/(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,lookbehind:!0},punctuation:/[(){};:,]/},e.languages.css.atrule.inside.rest=e.languages.css;var n=e.languages.markup;n&&(n.tag.addInlined(`style`,`css`),n.tag.addAttribute(`style`,`css`))})(n),n.languages.clike={comment:[{pattern:/(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,lookbehind:!0,greedy:!0},{pattern:/(^|[^\\:])\/\/.*/,lookbehind:!0,greedy:!0}],string:{pattern:/(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,greedy:!0},"class-name":{pattern:/(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,lookbehind:!0,inside:{punctuation:/[.\\]/}},keyword:/\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,boolean:/\b(?:false|true)\b/,function:/\b\w+(?=\()/,number:/\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,operator:/[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,punctuation:/[{}[\];(),.:]/},n.languages.javascript=n.languages.extend(`clike`,{"class-name":[n.languages.clike[`class-name`],{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,lookbehind:!0}],keyword:[{pattern:/((?:^|\})\s*)catch\b/,lookbehind:!0},{pattern:/(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,lookbehind:!0}],function:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,number:{pattern:RegExp(`(^|[^\\w$])(?:NaN|Infinity|0[bB][01]+(?:_[01]+)*n?|0[oO][0-7]+(?:_[0-7]+)*n?|0[xX][\\dA-Fa-f]+(?:_[\\dA-Fa-f]+)*n?|\\d+(?:_\\d+)*n|(?:\\d+(?:_\\d+)*(?:\\.(?:\\d+(?:_\\d+)*)?)?|\\.\\d+(?:_\\d+)*)(?:[Ee][+-]?\\d+(?:_\\d+)*)?)(?![\\w$])`),lookbehind:!0},operator:/--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/}),n.languages.javascript[`class-name`][0].pattern=/(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/,n.languages.insertBefore(`javascript`,`keyword`,{regex:{pattern:RegExp(`((?:^|[^$\\w\\xA0-\\uFFFF."'\\])\\s]|\\b(?:return|yield))\\s*)\\/(?:(?:\\[(?:[^\\]\\\\\\r\\n]|\\\\.)*\\]|\\\\.|[^/\\\\\\[\\r\\n])+\\/[dgimyus]{0,7}|(?:\\[(?:[^[\\]\\\\\\r\\n]|\\\\.|\\[(?:[^[\\]\\\\\\r\\n]|\\\\.|\\[(?:[^[\\]\\\\\\r\\n]|\\\\.)*\\])*\\])*\\]|\\\\.|[^/\\\\\\[\\r\\n])+\\/[dgimyus]{0,7}v[dgimyus]{0,7})(?=(?:\\s|\\/\\*(?:[^*]|\\*(?!\\/))*\\*\\/)*(?:$|[\\r\\n,.;:})\\]]|\\/\\/))`),lookbehind:!0,greedy:!0,inside:{"regex-source":{pattern:/^(\/)[\s\S]+(?=\/[a-z]*$)/,lookbehind:!0,alias:`language-regex`,inside:n.languages.regex},"regex-delimiter":/^\/|\/$/,"regex-flags":/^[a-z]+$/}},"function-variable":{pattern:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,alias:`function`},parameter:[{pattern:/(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,lookbehind:!0,inside:n.languages.javascript},{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,lookbehind:!0,inside:n.languages.javascript},{pattern:/(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,lookbehind:!0,inside:n.languages.javascript},{pattern:/((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,lookbehind:!0,inside:n.languages.javascript}],constant:/\b[A-Z](?:[A-Z_]|\dx?)*\b/}),n.languages.insertBefore(`javascript`,`string`,{hashbang:{pattern:/^#!.*/,greedy:!0,alias:`comment`},"template-string":{pattern:/`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,greedy:!0,inside:{"template-punctuation":{pattern:/^`|`$/,alias:`string`},interpolation:{pattern:/((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,lookbehind:!0,inside:{"interpolation-punctuation":{pattern:/^\$\{|\}$/,alias:`punctuation`},rest:n.languages.javascript}},string:/[\s\S]+/}},"string-property":{pattern:/((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,lookbehind:!0,greedy:!0,alias:`property`}}),n.languages.insertBefore(`javascript`,`operator`,{"literal-property":{pattern:/((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,lookbehind:!0,alias:`property`}}),n.languages.markup&&(n.languages.markup.tag.addInlined(`script`,`javascript`),n.languages.markup.tag.addAttribute(`on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)`,`javascript`)),n.languages.js=n.languages.javascript,(function(){if(n===void 0||typeof document>`u`)return;Element.prototype.matches||(Element.prototype.matches=Element.prototype.msMatchesSelector||Element.prototype.webkitMatchesSelector);var e=`Loading…`,t=function(e,t){return`✖ Error `+e+` while fetching file: `+t},r=`✖ Error: File does not exist or is empty`,i={js:`javascript`,py:`python`,rb:`ruby`,ps1:`powershell`,psm1:`powershell`,sh:`bash`,bat:`batch`,h:`c`,tex:`latex`},a=`data-src-status`,o=`loading`,s=`loaded`,c=`failed`,l=`pre[data-src]:not([`+a+`="`+s+`"]):not([`+a+`="`+o+`"])`;function u(e,n,i){var a=new XMLHttpRequest;a.open(`GET`,e,!0),a.onreadystatechange=function(){a.readyState==4&&(a.status<400&&a.responseText?n(a.responseText):a.status>=400?i(t(a.status,a.statusText)):i(r))},a.send(null)}function d(e){var t=/^\s*(\d+)\s*(?:(,)\s*(?:(\d+)\s*)?)?$/.exec(e||``);if(t){var n=Number(t[1]),r=t[2],i=t[3];return r?i?[n,Number(i)]:[n,void 0]:[n,n]}}n.hooks.add(`before-highlightall`,function(e){e.selector+=`, `+l}),n.hooks.add(`before-sanity-check`,function(t){var r=t.element;if(r.matches(l)){t.code=``,r.setAttribute(a,o);var f=r.appendChild(document.createElement(`CODE`));f.textContent=e;var p=r.getAttribute(`data-src`),m=t.language;if(m===`none`){var h=(/\.(\w+)$/.exec(p)||[,`none`])[1];m=i[h]||h}n.util.setLanguage(f,m),n.util.setLanguage(r,m);var g=n.plugins.autoloader;g&&g.loadLanguages(m),u(p,function(e){r.setAttribute(a,s);var t=d(r.getAttribute(`data-range`));if(t){var i=e.split(/\r\n?|\n/g),o=t[0],c=t[1]==null?i.length:t[1];o<0&&(o+=i.length),o=Math.max(0,Math.min(o-1,i.length)),c<0&&(c+=i.length),c=Math.max(0,Math.min(c,i.length)),e=i.slice(o,c).join(`
`),r.hasAttribute(`data-start`)||r.setAttribute(`data-start`,String(o+1))}f.textContent=e,n.highlightElement(f)},function(e){r.setAttribute(a,c),f.textContent=e})}}),n.plugins.fileHighlight={highlight:function(e){for(var t=(e||document).querySelectorAll(l),r=0,i;i=t[r++];)n.highlightElement(i)}};var f=!1;n.fileHighlight=function(){f||=(console.warn("Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead."),!0),n.plugins.fileHighlight.highlight.apply(this,arguments)}})()}))(),1);An.default.manual=!0,An.default.highlightAll();function $(e,t){return(t??document).querySelector(e)}function jn(e,t,n){return e*(1-n)+t*n}var Mn={logo:`
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
    `},Nn=class{vfx=new kn({pixelRatio:window.devicePixelRatio,zIndex:-1});vfx2=new kn({pixelRatio:1,zIndex:-2,scrollPadding:!1});async initBG(){let e=$(`#BG`),t=0;function n(e,t,n){return e*(1-n)+t*n}function r(){t=n(t,window.scrollY,.03),e.style.setProperty(`transform`,`translateY(-${t*.1}px)`),requestAnimationFrame(r)}r(),await this.vfx2.add(e,{shader:Mn.blob})}async initVFX(){await Promise.all(Array.from(document.querySelectorAll(`*[data-shader]`)).map(e=>{let t=e.getAttribute(`data-shader`),n=e.getAttribute(`data-uniforms`),r=n?JSON.parse(n):void 0;return this.vfx.add(e,{shader:t,overflow:Number.parseFloat(e.getAttribute(`data-overflow`)??`0`),uniforms:r,intersection:{threshold:Number.parseFloat(e.getAttribute(`data-threshold`)??`0`)}})}))}async initDiv(){let e=$(`#div`);await this.vfx.add(e,{shader:`rgbShift`,overflow:100});for(let t of e.querySelectorAll(`input,textarea`))t.addEventListener(`input`,()=>this.vfx.update(e));let t=$(`textarea`,e);new MutationObserver(()=>this.vfx.update(e)).observe(t,{attributes:!0})}async initCanvas(){let e=document.getElementById(`canvas`),t=e.getContext(`2d`);if(!t)throw`Failed to get the canvas context`;let{width:n,height:r}=e.getBoundingClientRect(),i=window.devicePixelRatio??1;e.width=n*i,e.height=r*i,t.scale(i,i);let a=[n/2,r/2],o=a,s=[o],c=!1,l=Date.now();e.addEventListener(`mousemove`,e=>{c=!0,a=[e.offsetX,e.offsetY]}),e.addEventListener(`mouseleave`,e=>{c=!1});let u=!1;new IntersectionObserver(e=>{for(let t of e)u=t.intersectionRatio>.1},{threshold:[0,1,.2,.8]}).observe(e);let d=()=>{if(requestAnimationFrame(d),u){if(!c){let e=Date.now()/1e3-l;a=[n*.5+Math.sin(e*1.3)*n*.3,r*.5+Math.sin(e*1.7)*r*.3]}o=[jn(o[0],a[0],.1),jn(o[1],a[1],.1)],s.push(o),s.splice(0,s.length-30),t.clearRect(0,0,n,r),t.fillStyle=`black`,t.fillRect(0,0,n,r),t.fillStyle=`white`,t.font=`bold ${n*.14}px sans-serif`,t.fillText(`HOVER ME`,n/2,r/2),t.textBaseline=`middle`,t.textAlign=`center`;for(let e=0;e<s.length;e++){let[n,r]=s[e],i=e/s.length*255;t.fillStyle=`rgba(${255-i}, 255, ${i}, ${e/s.length*.5+.5})`,t.beginPath(),t.arc(n,r,e+20,0,2*Math.PI),t.fill()}this.vfx.update(e)}};d(),await this.vfx.add(e,{shader:Mn.canvas})}async initCustomShader(){let e=$(`#custom`);await this.vfx.add(e,{shader:Mn.custom,uniforms:{scroll:()=>window.scrollY/window.innerHeight}})}async initMultipass(){let e=$(`#multipass`);await this.vfx.add(e,{shader:[{frag:`
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
                    `}]})}hideMask(){$(`#MaskTop`).style.setProperty(`height`,`0`),$(`#MaskBottom`).style.setProperty(`opacity`,`0`)}async showLogo(){let e=$(`#Logo`),t=$(`#LogoTagline`);return Promise.all([this.vfx.add(e,{shader:Mn.logo,overflow:[0,3e3,0,100],uniforms:{delay:0},intersection:{threshold:1}}),this.vfx.add(t,{shader:Mn.logo,overflow:[0,3e3,0,1e3],uniforms:{delay:.3},intersection:{threshold:1}})])}async showProfile(){let e=$(`#profile`);await this.vfx.add(e,{shader:Mn.logo,overflow:[0,3e3,0,2e3],uniforms:{delay:.5},intersection:{rootMargin:[-100,0,-100,0],threshold:1}})}};window.addEventListener(`load`,async()=>{let e=new Nn;await e.initBG(),await Promise.all([await e.initVFX(),e.initDiv(),e.initCanvas(),e.initCustomShader(),e.initMultipass()]),e.hideMask(),setTimeout(()=>{e.showLogo(),e.showProfile()},2e3)});
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
    `};function c(e){if(!e.src||e.src.startsWith(`data:`))return!1;try{return new URL(e.src,location.href).origin!==location.origin}catch{return!1}}async function l(e){let t=await(await fetch(e)).blob();return URL.createObjectURL(t)}async function u(e){let t=Array.from(e.querySelectorAll(`img`)).filter(e=>e.complete&&e.naturalWidth>0&&c(e));if(t.length===0)return()=>{};let n=new Map,r=[];return await Promise.all(t.map(async e=>{try{let t=await l(e.src);n.set(e,e.src),r.push(t),await new Promise(n=>{e.addEventListener(`load`,()=>n(),{once:!0}),e.src=t})}catch{}})),()=>{for(let[e,t]of n)e.src=t;for(let e of r)URL.revokeObjectURL(e)}}var d=[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`],f=[`position`,`top`,`right`,`bottom`,`left`,`float`,`flex`,`flex-grow`,`flex-shrink`,`flex-basis`,`align-self`,`justify-self`,`place-self`,`order`,`grid-column`,`grid-column-start`,`grid-column-end`,`grid-row`,`grid-row-start`,`grid-row-end`,`grid-area`],p=new WeakMap,m=new WeakMap,h=new WeakMap,g=new WeakMap,_=new WeakMap,v=new WeakMap;async function y(e,t){let n=e.getContext(`2d`);if(!n)throw Error(`Failed to get 2d context from layoutsubtree canvas`);let{onCapture:r,maxSize:i}=t,a=null,o=null,s=new Promise(e=>{o=e});e.onpaint=()=>{let t=e.firstElementChild;if(!t||e.width===0||e.height===0)return;n.clearRect(0,0,e.width,e.height),n.drawElementImage(t,0,0);let s=e.width,c=e.height;if(i&&(s>i||c>i)){let e=Math.min(i/s,i/c);s=Math.floor(s*e),c=Math.floor(c*e)}(!a||a.width!==s||a.height!==c)&&(a=new OffscreenCanvas(s,c));let l=a.getContext(`2d`);if(l){if(l.clearRect(0,0,s,c),l.drawImage(e,0,0,s,c),n.clearRect(0,0,e.width,e.height),o){o(a),o=null;return}r(a)}};let c=new ResizeObserver(t=>{for(let n of t){let t=n.devicePixelContentBoxSize?.[0];if(t)e.width=t.inlineSize,e.height=t.blockSize;else{let t=n.borderBoxSize?.[0];if(t){let n=window.devicePixelRatio;e.width=Math.round(t.inlineSize*n),e.height=Math.round(t.blockSize*n)}}}e.requestPaint()});c.observe(e,{box:`device-pixel-content-box`}),p.set(e,c);let l=e.firstElementChild,u=``;if(l){let t=new ResizeObserver(t=>{let n=t[0].borderBoxSize?.[0];if(!n)return;let r=`${Math.round(n.blockSize)}px`;r!==u&&(u=r,e.style.setProperty(`height`,r))});t.observe(l),m.set(e,t)}return s}function ee(e){e.onpaint=null;let t=p.get(e);t&&(t.disconnect(),p.delete(e));let n=m.get(e);n&&(n.disconnect(),m.delete(e))}async function te(e,t){let n=e.getBoundingClientRect(),r=document.createElement(`canvas`);r.setAttribute(`layoutsubtree`,``),r.className=e.className;let i=e.getAttribute(`style`);i&&r.setAttribute(`style`,i),r.style.setProperty(`padding`,`0`),r.style.setProperty(`border`,`none`),r.style.setProperty(`box-sizing`,`content-box`),r.style.setProperty(`background`,`transparent`);let a=getComputedStyle(e),o=a.display===`inline`?`block`:a.display;r.style.setProperty(`display`,o);for(let e of d)r.style.setProperty(e,a.getPropertyValue(e));for(let e of f)r.style.setProperty(e,a.getPropertyValue(e));let s=e=>Number.parseFloat(e),c=s(a.paddingLeft)+s(a.paddingRight)+s(a.borderLeftWidth)+s(a.borderRightWidth),l=s(a.paddingTop)+s(a.paddingBottom)+s(a.borderTopWidth)+s(a.borderBottomWidth);c>0&&r.style.setProperty(`width`,`${n.width}px`),l>0&&r.style.setProperty(`height`,`${n.height}px`),r.style.width||r.style.setProperty(`width`,`100%`),r.style.height||r.style.setProperty(`height`,`${n.height}px`);let p=window.devicePixelRatio;r.width=Math.round(n.width*p),r.height=Math.round(n.height*p),h.set(e,e.style.margin),g.set(e,e.style.width),_.set(e,e.style.boxSizing),e.parentNode?.insertBefore(r,e),r.appendChild(e),e.style.setProperty(`margin`,`0`),e.style.setProperty(`width`,`100%`),e.style.setProperty(`box-sizing`,`border-box`);let m=await u(e);return v.set(r,m),{canvas:r,initialCapture:await y(r,t)}}function b(e,t){ee(e);let n=v.get(e);n&&(n(),v.delete(e)),e.parentNode?.insertBefore(t,e),e.remove();let r=h.get(t);r!==void 0&&(t.style.margin=r,h.delete(t));let i=g.get(t);i!==void 0&&(t.style.width=i,g.delete(t));let a=_.get(t);a!==void 0&&(t.style.boxSizing=a,_.delete(t))}var x;function S(){if(x!==void 0)return x;try{let e=document.createElement(`canvas`),t=e.getContext(`2d`);x=t!==null&&typeof t.drawElementImage==`function`&&typeof e.requestPaint==`function`}catch{x=!1}return x}function ne(e){let t=typeof window<`u`?window.devicePixelRatio:1,n;n=e.scrollPadding===void 0?[.1,.1]:e.scrollPadding===!1?[0,0]:Array.isArray(e.scrollPadding)?[e.scrollPadding[0]??.1,e.scrollPadding[1]??.1]:[e.scrollPadding,e.scrollPadding];let r;return r=e.postEffect===void 0?[]:Array.isArray(e.postEffect)?e.postEffect:[e.postEffect],{pixelRatio:e.pixelRatio??t,zIndex:e.zIndex??void 0,autoplay:e.autoplay??!0,fixedCanvas:e.scrollPadding===!1,scrollPadding:n,wrapper:e.wrapper,postEffects:r}}var C=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},w=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},re,ie,ae,oe,se,ce,le,ue,T=class{constructor(e,t,n){re.add(this),this.wrapS=`clamp`,this.wrapT=`clamp`,this.minFilter=`linear`,this.magFilter=`linear`,this.needsUpdate=!0,this.source=null,ie.set(this,void 0),ae.set(this,!1),oe.set(this,void 0),se.set(this,void 0),C(this,ie,e,`f`),this.gl=e.gl;let r=n?.externalHandle;C(this,se,r!==void 0,`f`),r===void 0?w(this,re,`m`,ce).call(this):(this.texture=r,C(this,ae,!0,`f`),this.needsUpdate=!1),t&&(this.source=t),C(this,oe,n?.autoRegister!==!1&&!w(this,se,`f`),`f`),w(this,oe,`f`)&&e.addResource(this)}restore(){w(this,se,`f`)||(w(this,re,`m`,ce).call(this),C(this,ae,!1,`f`),this.needsUpdate=!0)}bind(e){let t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&=(w(this,re,`m`,le).call(this),!1)}dispose(){w(this,oe,`f`)&&w(this,ie,`f`).removeResource(this),w(this,se,`f`)||this.gl.deleteTexture(this.texture)}};ie=new WeakMap,ae=new WeakMap,oe=new WeakMap,se=new WeakMap,re=new WeakSet,ce=function(){let e=this.gl.createTexture();if(!e)throw Error(`[VFX-JS] Failed to create texture`);this.texture=e},le=function(){let e=this.gl,t=this.source;if(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4),t)try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)}catch(e){console.error(e)}else if(!w(this,ae,`f`)){let t=new Uint8Array([0,0,0,0]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,t)}w(this,re,`m`,ue).call(this),C(this,ae,!0,`f`)},ue=function(){let e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,de(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,de(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,fe(e,this.minFilter)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,fe(e,this.magFilter))};function de(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function fe(e,t){return t===`nearest`?e.NEAREST:e.LINEAR}function pe(e){return new Promise((t,n)=>{let r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>t(r),r.onerror=n,r.src=e})}var me=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},he=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ge,_e,ve,ye=class{constructor(e,t,n,r={}){ge.add(this),_e.set(this,void 0),me(this,_e,e,`f`),this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(n)),this.float=r.float??!1,this.texture=new T(e,void 0,{autoRegister:!1});let i=r.wrap;i!==void 0&&(typeof i==`string`?(this.texture.wrapS=i,this.texture.wrapT=i):(this.texture.wrapS=i[0],this.texture.wrapT=i[1])),r.filter!==void 0&&(this.texture.minFilter=r.filter,this.texture.magFilter=r.filter),he(this,ge,`m`,ve).call(this),e.addResource(this)}setSize(e,t){let n=Math.max(1,Math.floor(e)),r=Math.max(1,Math.floor(t));n===this.width&&r===this.height||(this.width=n,this.height=r,he(this,ge,`m`,ve).call(this))}restore(){this.texture.restore(),he(this,ge,`m`,ve).call(this)}dispose(){he(this,_e,`f`).removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.texture.dispose()}};_e=new WeakMap,ge=new WeakSet,ve=function(){let e=this.gl,t=this.fbo,n=e.createFramebuffer();if(!n)throw Error(`[VFX-JS] Failed to create framebuffer`);this.fbo=n;let r=this.texture.texture;e.bindTexture(e.TEXTURE_2D,r);let i=he(this,_e,`f`).floatLinearFilter,a=this.float?i?e.RGBA32F:e.RGBA16F:e.RGBA8,o=this.float?i?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,e.RGBA,o,null);let s=this.texture.minFilter===`nearest`?e.NEAREST:e.LINEAR,c=this.texture.magFilter===`nearest`?e.NEAREST:e.LINEAR,l=be(e,this.texture.wrapS),u=be(e,this.texture.wrapT);e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,s),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,c),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,l),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,u),e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.texture.needsUpdate=!1,this.texture.source=null,t&&e.deleteFramebuffer(t)};function be(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function xe(e,t,n,r){return{x:e.left+n,y:t-r-e.bottom,w:e.right-e.left,h:e.bottom-e.top}}function Se(e,t,n,r){return{x:e,y:t,w:n,h:r}}var Ce=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},E=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},we,Te,Ee,De,Oe=class{constructor(e,t,n,r,i,a={}){we.set(this,void 0),Te.set(this,void 0),Ee.set(this,void 0),De.set(this,void 0),Ce(this,we,t,`f`),Ce(this,Te,n,`f`),Ce(this,Ee,r,`f`);let o=t*r,s=n*r,c={float:i,wrap:a.wrap,filter:a.filter};Ce(this,De,[new ye(e,o,s,c),new ye(e,o,s,c)],`f`)}get texture(){return E(this,De,`f`)[0].texture}get target(){return E(this,De,`f`)[1]}resize(e,t){if(e===E(this,we,`f`)&&t===E(this,Te,`f`))return;Ce(this,we,e,`f`),Ce(this,Te,t,`f`);let n=e*E(this,Ee,`f`),r=t*E(this,Ee,`f`);E(this,De,`f`)[0].setSize(n,r),E(this,De,`f`)[1].setSize(n,r)}swap(){Ce(this,De,[E(this,De,`f`)[1],E(this,De,`f`)[0]],`f`)}getViewport(){return Se(0,0,E(this,we,`f`),E(this,Te,`f`))}dispose(){E(this,De,`f`)[0].dispose(),E(this,De,`f`)[1].dispose()}};we=new WeakMap,Te=new WeakMap,Ee=new WeakMap,De=new WeakMap;var ke=class{constructor(e=0,t=0){this.x=0,this.y=0,this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}},Ae=class{constructor(e=0,t=0,n=0,r=0){this.x=0,this.y=0,this.z=0,this.w=0,this.x=e,this.y=t,this.z=n,this.w=r}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}},je=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Me=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ne,Pe,Fe,Ie,Le,Re,ze;function Be(e){return/#version\s+300\s+es\b/.test(e)?`300 es`:/#version\s+100\b/.test(e)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(e)?`100`:`300 es`}var Ve=class{constructor(e,t,n,r){Ne.add(this),Pe.set(this,void 0),Fe.set(this,void 0),Ie.set(this,void 0),Le.set(this,void 0),Re.set(this,new Map),je(this,Pe,e,`f`),this.gl=e.gl,je(this,Fe,t,`f`),je(this,Ie,n,`f`),je(this,Le,r??Be(n),`f`),Me(this,Ne,`m`,ze).call(this),e.addResource(this)}restore(){Me(this,Ne,`m`,ze).call(this)}use(){this.gl.useProgram(this.program)}hasUniform(e){return Me(this,Re,`f`).has(e)}uploadUniforms(e){let t=this.gl,n=0;for(let[r,i]of Me(this,Re,`f`)){let a=e[r];if(!a)continue;let o=a.value;if(o!=null){if(We(i.type)){o instanceof T&&(o.bind(n),t.uniform1i(i.location,n),n++);continue}o instanceof T||Ke(t,i,o)}}}dispose(){Me(this,Pe,`f`).removeResource(this),this.gl.deleteProgram(this.program)}};Pe=new WeakMap,Fe=new WeakMap,Ie=new WeakMap,Le=new WeakMap,Re=new WeakMap,Ne=new WeakSet,ze=function(){let e=this.gl,t=He(e,e.VERTEX_SHADER,Ue(Me(this,Fe,`f`),Me(this,Le,`f`))),n=He(e,e.FRAGMENT_SHADER,Ue(Me(this,Ie,`f`),Me(this,Le,`f`))),r=e.createProgram();if(!r)throw Error(`[VFX-JS] Failed to create program`);if(e.attachShader(r,t),e.attachShader(r,n),e.bindAttribLocation(r,0,`position`),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let i=e.getProgramInfoLog(r)??``;throw e.deleteShader(t),e.deleteShader(n),e.deleteProgram(r),Error(`[VFX-JS] Program link failed: ${i}`)}e.detachShader(r,t),e.detachShader(r,n),e.deleteShader(t),e.deleteShader(n),this.program=r,Me(this,Re,`f`).clear();let i=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<i;t++){let n=e.getActiveUniform(r,t);if(!n)continue;let i=n.name.replace(/\[0\]$/,``),a=e.getUniformLocation(r,n.name);a&&Me(this,Re,`f`).set(i,{location:a,type:n.type,size:n.size})}};function He(e,t,n){let r=e.createShader(t);if(!r)throw Error(`[VFX-JS] Failed to create shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)??``;throw e.deleteShader(r),Error(`[VFX-JS] Shader compile failed: ${t}\n\n${n}`)}return r}function Ue(e,t){return e.replace(/^\s+/,``).startsWith(`#version`)||t===`100`?e:`#version 300 es\n${e}`}function We(e){return e===35678||e===36298||e===36306||e===35682}var Ge=new Set;function Ke(e,t,n){let r=t.location,i=t.size>1,a=n,o=n,s=n;switch(t.type){case e.FLOAT:i?e.uniform1fv(r,a):e.uniform1f(r,n);return;case e.FLOAT_VEC2:if(i)e.uniform2fv(r,a);else if(n instanceof ke)e.uniform2f(r,n.x,n.y);else{let t=n;e.uniform2f(r,t[0],t[1])}return;case e.FLOAT_VEC3:if(i)e.uniform3fv(r,a);else{let t=n;e.uniform3f(r,t[0],t[1],t[2])}return;case e.FLOAT_VEC4:if(i)e.uniform4fv(r,a);else if(n instanceof Ae)e.uniform4f(r,n.x,n.y,n.z,n.w);else{let t=n;e.uniform4f(r,t[0],t[1],t[2],t[3])}return;case e.INT:i?e.uniform1iv(r,o):e.uniform1i(r,n);return;case e.INT_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,t[0],t[1])}return;case e.INT_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,t[0],t[1],t[2])}return;case e.INT_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,t[0],t[1],t[2],t[3])}return;case e.BOOL:i?e.uniform1iv(r,o):e.uniform1i(r,+!!n);return;case e.BOOL_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,+!!t[0],+!!t[1])}return;case e.BOOL_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,+!!t[0],+!!t[1],+!!t[2])}return;case e.BOOL_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,+!!t[0],+!!t[1],+!!t[2],+!!t[3])}return;case e.FLOAT_MAT2:e.uniformMatrix2fv(r,!1,a);return;case e.FLOAT_MAT3:e.uniformMatrix3fv(r,!1,a);return;case e.FLOAT_MAT4:e.uniformMatrix4fv(r,!1,a);return;case e.UNSIGNED_INT:i?e.uniform1uiv(r,s):e.uniform1ui(r,n);return;case e.UNSIGNED_INT_VEC2:if(i)e.uniform2uiv(r,s);else{let t=n;e.uniform2ui(r,t[0],t[1])}return;case e.UNSIGNED_INT_VEC3:if(i)e.uniform3uiv(r,s);else{let t=n;e.uniform3ui(r,t[0],t[1],t[2])}return;case e.UNSIGNED_INT_VEC4:if(i)e.uniform4uiv(r,s);else{let t=n;e.uniform4ui(r,t[0],t[1],t[2],t[3])}return;default:Ge.has(t.type)||(Ge.add(t.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${t.type.toString(16)}; skipping upload.`));return}}var qe=class{constructor(e,t,n,r,i,a){this.gl=e.gl,this.program=new Ve(e,t,n,a),this.uniforms=r,this.blend=i}dispose(){this.program.dispose()}};function Je(e,t,n,r,i,a,o,s){let c=r?r.width/s:a,l=r?r.height/s:o,u=Math.max(0,i.x),d=Math.max(0,i.y),f=Math.min(c,i.x+i.w),p=Math.min(l,i.y+i.h),m=f-u,h=p-d;m<=0||h<=0||(e.bindFramebuffer(e.FRAMEBUFFER,r?r.fbo:null),e.viewport(Math.round(u*s),Math.round(d*s),Math.round(m*s),Math.round(h*s)),Ye(e,n.blend),n.program.use(),n.program.uploadUniforms(n.uniforms),t.draw())}function Ye(e,t){if(t===`none`){e.disable(e.BLEND);return}e.enable(e.BLEND),e.blendEquation(e.FUNC_ADD),t===`premultiplied`?e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA):t===`additive`?e.blendFuncSeparate(e.ONE,e.ONE,e.ONE,e.ONE):e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA)}var Xe=class{constructor(e){this.uniforms={src:{value:null},offset:{value:new ke},resolution:{value:new ke},viewport:{value:new Ae}},this.pass=new qe(e,n,i,this.uniforms,`premultiplied`)}setUniforms(e,t,n){this.uniforms.src.value=e,this.uniforms.resolution.value.set(n.w*t,n.h*t),this.uniforms.offset.value.set(n.x*t,n.y*t)}dispose(){this.pass.dispose()}},Ze=e=>{let t=document.implementation.createHTMLDocument(`test`),n=t.createRange();n.selectNodeContents(t.documentElement),n.deleteContents();let r=document.createElement(`head`);return t.documentElement.appendChild(r),t.documentElement.appendChild(n.createContextualFragment(e)),t.documentElement.setAttribute(`xmlns`,t.documentElement.namespaceURI),new XMLSerializer().serializeToString(t).replace(/<!DOCTYPE html>/,``)};async function Qe(e,t,n,r){let i=e.getBoundingClientRect(),a=window.devicePixelRatio,o=i.width*a,s=i.height*a,c=1,l=o,u=s;r&&(l>r||u>r)&&(c=Math.min(r/l,r/u),l=Math.floor(l*c),u=Math.floor(u*c));let d=n&&n.width===l&&n.height===u?n:new OffscreenCanvas(l,u),f=e.cloneNode(!0);await $e(e,f),et(e,f),f.style.setProperty(`opacity`,t.toString()),f.style.setProperty(`margin`,`0px`),tt(f);let p=f.outerHTML,m=`<svg xmlns="http://www.w3.org/2000/svg" width="${o}" height="${s}"><foreignObject width="100%" height="100%">${Ze(p)}</foreignObject></svg>`;return new Promise((e,t)=>{let n=new Image;n.onload=()=>{let r=d.getContext(`2d`);if(r===null)return t();r.clearRect(0,0,l,u);let i=a*c;r.scale(i,i),r.drawImage(n,0,0,o,s),r.setTransform(1,0,0,1,0,0),e(d)},n.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(m)}`})}async function $e(e,t){let n=window.getComputedStyle(e);for(let e of Array.from(n))/(-inline-|-block-|^inline-|^block-)/.test(e)||/^-webkit-.*(start|end|before|after|logical)/.test(e)||t.style.setProperty(e,n.getPropertyValue(e),n.getPropertyPriority(e));if(t.tagName===`INPUT`)t.setAttribute(`value`,t.value);else if(t.tagName===`TEXTAREA`)t.innerHTML=t.value;else if(t.tagName===`IMG`)try{t.src=await nt(e.src)}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];await $e(r,i)}}function et(e,t){if(typeof e.computedStyleMap==`function`)try{let n=e.computedStyleMap();for(let e of[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`]){let r=n.get(e);r instanceof CSSKeywordValue&&r.value===`auto`&&t.style.setProperty(e,`auto`)}}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];r instanceof HTMLElement&&i instanceof HTMLElement&&et(r,i)}}function tt(e){let t=e;for(;;){let e=t.style;if(Number.parseFloat(e.paddingTop)>0||Number.parseFloat(e.borderTopWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.firstElementChild;if(!n)break;n.style.setProperty(`margin-top`,`0px`),t=n}for(t=e;;){let e=t.style;if(Number.parseFloat(e.paddingBottom)>0||Number.parseFloat(e.borderBottomWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.lastElementChild;if(!n)break;n.style.setProperty(`margin-bottom`,`0px`),t=n}}async function nt(e){let t=await fetch(e).then(e=>e.blob());return new Promise(e=>{let n=new FileReader;n.onload=function(){e(this.result)},n.readAsDataURL(t)})}var D=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},O=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},rt,it,at,ot,st,ct,lt,ut,dt,ft,pt,mt,ht=Object.freeze({__brand:`EffectQuad`});function gt(e){return e===ht}function _t(e,t){switch(t){case`lines`:return e.LINES;case`lineStrip`:return e.LINE_STRIP;case`points`:return e.POINTS;default:return e.TRIANGLES}}function vt(e,t){if(t instanceof Float32Array)return e.FLOAT;if(t instanceof Uint8Array)return e.UNSIGNED_BYTE;if(t instanceof Uint16Array)return e.UNSIGNED_SHORT;if(t instanceof Uint32Array)return e.UNSIGNED_INT;if(t instanceof Int8Array)return e.BYTE;if(t instanceof Int16Array)return e.SHORT;if(t instanceof Int32Array)return e.INT;throw Error(`[VFX-JS] Unsupported attribute typed array`)}function yt(e,t){if(ArrayBuffer.isView(t)&&!(t instanceof DataView))return{name:e,data:t,itemSize:2,normalized:!1,perInstance:!1};let n=t;return{name:e,data:n.data,itemSize:n.itemSize,normalized:n.normalized??!1,perInstance:n.perInstance??!1}}var bt=class{constructor(e,t,n){rt.add(this),it.set(this,void 0),at.set(this,void 0),ot.set(this,void 0),st.set(this,[]),ct.set(this,null),this.indexType=0,this.hasIndices=!1,this.drawCount=0,this.drawStart=0,lt.set(this,!1),D(this,it,e,`f`),this.gl=e.gl,D(this,at,t,`f`),D(this,ot,n,`f`),this.mode=_t(this.gl,t.mode),this.instanceCount=t.instanceCount??0,O(this,rt,`m`,ut).call(this),e.addResource(this),D(this,lt,!0,`f`)}restore(){D(this,st,[],`f`),D(this,ct,null,`f`),O(this,rt,`m`,ut).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),this.hasIndices?this.instanceCount>0?e.drawElementsInstanced(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2),this.instanceCount):e.drawElements(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2)):this.instanceCount>0?e.drawArraysInstanced(this.mode,this.drawStart,this.drawCount,this.instanceCount):e.drawArrays(this.mode,this.drawStart,this.drawCount)}dispose(){O(this,lt,`f`)&&(O(this,it,`f`).removeResource(this),D(this,lt,!1,`f`));let e=this.gl;e.deleteVertexArray(this.vao);for(let t of O(this,st,`f`))e.deleteBuffer(t);O(this,ct,`f`)&&e.deleteBuffer(O(this,ct,`f`)),D(this,st,[],`f`),D(this,ct,null,`f`)}};it=new WeakMap,at=new WeakMap,ot=new WeakMap,st=new WeakMap,ct=new WeakMap,lt=new WeakMap,rt=new WeakSet,ut=function(){let e=this.gl,t=e.createVertexArray();if(!t)throw Error(`[VFX-JS] Failed to create VAO`);this.vao=t,e.bindVertexArray(t);let n=O(this,ot,`f`).program,r=null;for(let[t,i]of Object.entries(O(this,at,`f`).attributes)){let a=yt(t,i),o=e.getAttribLocation(n,a.name);if(o<0)continue;let s=e.createBuffer();if(!s)throw Error(`[VFX-JS] Failed to create VBO for "${a.name}"`);O(this,st,`f`).push(s),e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,a.data,e.STATIC_DRAW);let c=vt(e,a.data);e.enableVertexAttribArray(o),c===e.FLOAT||c===e.HALF_FLOAT||a.normalized?e.vertexAttribPointer(o,a.itemSize,c,a.normalized,0,0):e.vertexAttribIPointer(o,a.itemSize,c,0,0),a.perInstance&&e.vertexAttribDivisor(o,1),t===`position`&&r===null&&(r=a.data.length/a.itemSize)}let i=0,a=O(this,at,`f`).indices;if(a){let t=e.createBuffer();if(!t)throw Error(`[VFX-JS] Failed to create IBO`);D(this,ct,t,`f`),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t),e.bufferData(e.ELEMENT_ARRAY_BUFFER,a,e.STATIC_DRAW),this.hasIndices=!0,this.indexType=a instanceof Uint32Array?e.UNSIGNED_INT:e.UNSIGNED_SHORT,i=a.length}else this.hasIndices=!1;e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null),O(this,ct,`f`)&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null);let o=this.hasIndices?i:r??0,s=O(this,at,`f`).drawRange;this.drawStart=s?.start??0,this.drawCount=s?.count===void 0?Math.max(0,o-this.drawStart):s.count};var xt=class{constructor(e,t){dt.set(this,void 0),ft.set(this,void 0),pt.set(this,new WeakMap),mt.set(this,new Set),D(this,dt,e,`f`),D(this,ft,t,`f`)}get quad(){return O(this,ft,`f`)}resolve(e,t){let n=O(this,pt,`f`).get(e);n||(n=new Map,O(this,pt,`f`).set(e,n));let r=n.get(t);return r||(r=new bt(O(this,dt,`f`),e,t),n.set(t,r),O(this,mt,`f`).add(r)),r}dispose(){for(let e of O(this,mt,`f`))e.dispose();O(this,mt,`f`).clear()}};dt=new WeakMap,ft=new WeakMap,pt=new WeakMap,mt=new WeakMap;var k=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},A=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},St,Ct,wt,Tt,Et,Dt,Ot,kt,At,jt,Mt,Nt,j,M,Pt,Ft,It,Lt,Rt,zt,Bt=Symbol.for(`@vfx-js/effect.resolve-texture`),Vt=Symbol.for(`@vfx-js/effect.resolve-rt`);function Ht(e){return e[Bt]()}function Ut(e){return e[Vt]}var Wt=`#version 300 es
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
`,Gt=`
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
`,Kt=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`,qt=`
precision highp float;
varying vec2 uv;
uniform sampler2D src;
void main() {
    gl_FragColor = texture2D(src, uv);
}
`,Jt=class{constructor(e,t,n,r,i){St.add(this),Ct.set(this,void 0),wt.set(this,void 0),Tt.set(this,void 0),Et.set(this,new Map),Dt.set(this,void 0),Ot.set(this,[]),kt.set(this,[]),At.set(this,[]),jt.set(this,[]),Mt.set(this,`init`),Nt.set(this,!1),j.set(this,void 0),M.set(this,void 0),It.set(this,[]),k(this,Ct,e,`f`),k(this,wt,e.gl,`f`),k(this,Tt,n,`f`),k(this,Dt,new xt(e,t),`f`),k(this,j,{outputBufferW:1,outputBufferH:1,canvasBufferSize:[1,1],outputViewport:{x:0,y:0,w:1,h:1},elementBufferW:1,elementBufferH:1,contentRectUv:[0,0,1,1],srcRectUv:[0,0,1,1]},`f`);let a={time:0,deltaTime:0,pixelRatio:n,resolution:[1,1],mouse:[0,0],mouseViewport:[0,0],intersection:0,enterTime:0,leaveTime:0,src:r,target:null,uniforms:{},vfxProps:i,dims:{element:[1,1],elementPixel:[1,1],canvas:[1,1],canvasPixel:[1,1],pixelRatio:n,contentRect:[0,0,1,1],srcRect:[0,0,1,1],canvasRect:[0,0,1,1]},quad:ht,gl:A(this,wt,`f`),createRenderTarget:e=>A(this,St,`m`,Pt).call(this,e),wrapTexture:(e,t)=>A(this,St,`m`,Ft).call(this,e,t),draw:e=>A(this,St,`m`,Lt).call(this,e),onContextRestored:e=>{let t=A(this,Ct,`f`).onContextRestored(e);return A(this,jt,`f`).push(t),t}};k(this,M,a,`f`)}get ctx(){return A(this,M,`f`)}setPhase(e){k(this,Mt,e,`f`)}setFrameDims(e){k(this,j,e,`f`),A(this,M,`f`).resolution=[e.canvasBufferSize[0],e.canvasBufferSize[1]];for(let t of A(this,At,`f`))t.resolver.resize?.(e.outputBufferW,e.outputBufferH)}setEffectDims(e){A(this,M,`f`).dims=e}setFrameState(e){let t=A(this,M,`f`);t.time=e.time,t.deltaTime=e.deltaTime,t.mouse=e.mouse,t.mouseViewport=e.mouseViewport,t.intersection=e.intersection,t.enterTime=e.enterTime,t.leaveTime=e.leaveTime,t.uniforms=e.uniforms}setSrc(e){A(this,M,`f`).src=e}setOutput(e){A(this,M,`f`).target=e}passthroughCopy(e,t,n){let r=A(this,Mt,`f`);k(this,Mt,`render`,`f`);let i=A(this,M,`f`).target;A(this,M,`f`).target=t;try{let r=A(this,j,`f`).outputViewport;A(this,j,`f`).outputViewport={...n};let i=A(this,M,`f`).vfxProps.glslVersion===`100`?qt:Kt;A(this,St,`m`,Rt).call(this,{frag:i,uniforms:{src:e},target:t}),A(this,j,`f`).outputViewport=r}finally{A(this,M,`f`).target=i,k(this,Mt,r,`f`)}}clearRt(e){let t=A(this,wt,`f`),n=Ut(e);t.bindFramebuffer(t.FRAMEBUFFER,n.getWriteFbo().fbo),t.viewport(0,0,e.width,e.height),t.clearColor(0,0,0,0),t.disable(t.SCISSOR_TEST),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)}tickAutoUpdates(){for(let e of A(this,It,`f`))e()}dispose(){k(this,Mt,`disposed`,`f`);for(let e of A(this,jt,`f`))e();k(this,jt,[],`f`);for(let e of A(this,kt,`f`))e.resolver.dispose?.();k(this,kt,[],`f`),k(this,At,[],`f`);for(let e of A(this,Ot,`f`))e.dispose();k(this,Ot,[],`f`);for(let e of A(this,Et,`f`).values())e.dispose();A(this,Et,`f`).clear(),A(this,Dt,`f`).dispose(),k(this,It,[],`f`)}};Ct=new WeakMap,wt=new WeakMap,Tt=new WeakMap,Et=new WeakMap,Dt=new WeakMap,Ot=new WeakMap,kt=new WeakMap,At=new WeakMap,jt=new WeakMap,Mt=new WeakMap,Nt=new WeakMap,j=new WeakMap,M=new WeakMap,It=new WeakMap,St=new WeakSet,Pt=function(e){let t=e?.persistent??!1,n=e?.float??!1,r=Xt(e?.wrap),i=e?.filter,a=e?.size,o=a?a[0]:A(this,j,`f`).outputBufferW,s=a?a[1]:A(this,j,`f`).outputBufferH,c,l,u;if(t){let e=a?1:A(this,Tt,`f`),t=a?o:o/e,d=a?s:s/e,f=new Oe(A(this,Ct,`f`),t,d,e,n,{wrap:r,filter:i});c={getReadTexture:()=>f.texture,getWriteFbo:()=>f.target,swap:()=>f.swap(),resize:a?void 0:(e,t)=>{f.resize(e/A(this,Tt,`f`),t/A(this,Tt,`f`))},dispose:()=>f.dispose()},l=()=>f.target.width,u=()=>f.target.height}else{let e=new ye(A(this,Ct,`f`),o,s,{float:n,wrap:r,filter:i});c={getReadTexture:()=>e.texture,getWriteFbo:()=>e,resize:a?void 0:(t,n)=>e.setSize(t,n),dispose:()=>e.dispose()},l=()=>e.width,u=()=>e.height}let d=$t(c,l,u),f={handle:d,resolver:c};return A(this,kt,`f`).push(f),a||A(this,At,`f`).push(f),d},Ft=function(e,t){let n=Xt(t?.wrap),r=t?.filter,i,a,o,s=null;if(Yt(e)){if(!t?.size)throw Error(`[VFX-JS] wrapTexture(WebGLTexture) requires opts.size`);let[n,r]=t.size;i=new T(A(this,Ct,`f`),void 0,{autoRegister:!1,externalHandle:e}),a=()=>n,o=()=>r}else{let n=e;i=new T(A(this,Ct,`f`),n);let r=t?.size,c=e=>{if(r)return e===`w`?r[0]:r[1];if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return e===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return e===`w`?n.videoWidth:n.videoHeight;let t=n;return e===`w`?t.width:t.height};a=()=>c(`w`),o=()=>c(`h`);let l=typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement||typeof HTMLCanvasElement<`u`&&n instanceof HTMLCanvasElement||typeof OffscreenCanvas<`u`&&n instanceof OffscreenCanvas;(t?.autoUpdate??l)&&(s=()=>{i.needsUpdate=!0})}return i.wrapS=n[0],i.wrapT=n[1],r!==void 0&&(i.minFilter=r,i.magFilter=r),A(this,Ot,`f`).push(i),s&&A(this,It,`f`).push(s),Qt(()=>i,a,o)},Lt=function(e){if(A(this,Mt,`f`)!==`render`){A(this,Mt,`f`)===`update`&&!A(this,Nt,`f`)&&(k(this,Nt,!0,`f`),console.warn(`[VFX-JS] ctx.draw() called in update(); ignored. Move draws to render().`));return}A(this,St,`m`,Rt).call(this,e)},Rt=function(e){let t=A(this,wt,`f`),n=e.vert??(A(this,M,`f`).vfxProps.glslVersion===`100`?Gt:Wt),r=`${e.frag} ${n}`,i=A(this,Et,`f`).get(r);i||(i=new Ve(A(this,Ct,`f`),n,e.frag,A(this,M,`f`).vfxProps.glslVersion),A(this,Et,`f`).set(r,i));let a=A(this,M,`f`).target,o=e.target===void 0||e.target===null?a:e.target,s=o===null||o===a,c,l,u,d,f,p;if(o===null)c=null,l=A(this,j,`f`).outputViewport.x,u=A(this,j,`f`).outputViewport.y,d=A(this,j,`f`).outputViewport.w,f=A(this,j,`f`).outputViewport.h;else{let e=Ut(o);c=e.getWriteFbo().fbo,s?(l=A(this,j,`f`).outputViewport.x,u=A(this,j,`f`).outputViewport.y,d=A(this,j,`f`).outputViewport.w,f=A(this,j,`f`).outputViewport.h):(l=0,u=0,d=o.width,f=o.height),p=e.swap}t.bindFramebuffer(t.FRAMEBUFFER,c),t.viewport(l,u,d,f),t.disable(t.SCISSOR_TEST),Ye(t,e.blend??(o===null?`premultiplied`:`none`)),i.use();let m=A(this,St,`m`,zt).call(this,e.uniforms);i.uploadUniforms(m);let h=e.geometry??ht;gt(h)?A(this,Dt,`f`).quad.draw():A(this,Dt,`f`).resolve(h,i).draw(),p&&p()},zt=function(e){let t={};if(t.contentRectUv={value:A(this,j,`f`).contentRectUv},t.srcRectUv={value:A(this,j,`f`).srcRectUv},!e)return t;for(let[n,r]of Object.entries(e))t[n]=Zt(r);return t};function Yt(e){let t=globalThis.WebGLTexture;if(t&&typeof t==`function`&&e instanceof t)return!0;let n=e;return n.width===void 0&&n.naturalWidth===void 0&&n.videoWidth===void 0}function Xt(e){return e===void 0?[`clamp`,`clamp`]:typeof e==`string`?[e,e]:[e[0],e[1]]}function Zt(e){return typeof e==`object`&&e&&`__brand`in e?e.__brand===`EffectRenderTarget`?{value:Ut(e).getReadTexture()}:{value:Ht(e)}:{value:e}}function Qt(e,t,n){let r={__brand:`EffectTexture`,get width(){return t()},get height(){return n()}};return Object.defineProperty(r,Bt,{value:e}),r}function $t(e,t,n){let r={__brand:`EffectRenderTarget`,get width(){return t()},get height(){return n()}};return Object.defineProperty(r,Vt,{value:e}),r}function en(e){return $t({getReadTexture:()=>e.texture,getWriteFbo:()=>e},()=>e.width,()=>e.height)}function tn(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:Array.isArray(e)?{top:e[0],right:e[1],bottom:e[2],left:e[3]}:{top:e.top??0,right:e.right??0,bottom:e.bottom??0,left:e.left??0}}function nn(e){return tn(e)}var rn={top:0,right:0,bottom:0,left:0};function an(e){return tn(e)}function on(e){return{top:e.top,right:e.right,bottom:e.bottom,left:e.left}}function sn(e,t){return{top:e.top-t.top,right:e.right+t.right,bottom:e.bottom+t.bottom,left:e.left-t.left}}function cn(e,t,n){return Math.min(Math.max(e,t),n)}function ln(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return c<=0||l<=0?[0,0,1,1]:[(n-o)/c,(r-s)/l,i/c,a/l]}function un(e,t){let n=cn(t.left,e.left,e.right),r=(cn(t.right,e.left,e.right)-n)/(t.right-t.left),i=cn(t.top,e.top,e.bottom);return r*((cn(t.bottom,e.top,e.bottom)-i)/(t.bottom-t.top))}var N=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},P=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},F,dn,fn,I,pn,mn,hn,gn,_n,vn,yn,bn,xn,Sn,Cn,wn,Tn,En,Dn,On,kn,An=class{constructor(e,t,n,r,i,a,o){F.add(this),dn.set(this,void 0),fn.set(this,void 0),I.set(this,void 0),pn.set(this,void 0),mn.set(this,[]),hn.set(this,[]),gn.set(this,void 0),_n.set(this,new Set),vn.set(this,!1),yn.set(this,void 0),bn.set(this,nn(0)),xn.set(this,null),N(this,dn,e,`f`),N(this,fn,r,`f`),N(this,gn,a,`f`),N(this,yn,o,`f`),N(this,I,r.map(()=>new Jt(e,t,n,a,i)),`f`),r.length===0&&N(this,xn,new Jt(e,t,n,a,i),`f`),N(this,pn,r.map((e,t)=>typeof e.render==`function`?t:-1).filter(e=>e>=0),`f`)}get effects(){return P(this,fn,`f`)}get hosts(){return P(this,I,`f`)}get renderingIndices(){return P(this,pn,`f`)}get stages(){return P(this,hn,`f`)}get hitTestPadBuffer(){return P(this,bn,`f`)}async initAll(){for(let e=0;e<P(this,fn,`f`).length;e++){let t=P(this,fn,`f`)[e],n=P(this,I,`f`)[e];n.setPhase(`init`);try{t.init&&await t.init(n.ctx)}catch(t){console.error(`[VFX-JS] effect[${e}].init() failed:`,t);for(let t=e-1;t>=0;t--)P(this,F,`m`,Sn).call(this,t),P(this,I,`f`)[t].dispose();throw P(this,I,`f`)[e].dispose(),t}n.setPhase(`update`)}}run(e){if(P(this,vn,`f`)||!e.isVisible)return;let t=P(this,pn,`f`).length;for(let t of P(this,I,`f`))t.setFrameState({time:e.time,deltaTime:e.deltaTime,mouse:e.mouse,mouseViewport:e.mouseViewport,intersection:e.intersection,enterTime:e.enterTime,leaveTime:e.leaveTime,uniforms:e.resolvedUniforms});P(this,F,`m`,Cn).call(this,e);for(let t=0;t<P(this,I,`f`).length;t++)P(this,I,`f`)[t].setFrameDims(P(this,F,`m`,kn).call(this,t,e)),P(this,I,`f`)[t].setEffectDims(P(this,F,`m`,En).call(this,t,e));for(let e=0;e<P(this,fn,`f`).length;e++){let t=P(this,fn,`f`)[e];if(!t.update)continue;let n=P(this,I,`f`)[e];n.setPhase(`update`);try{t.update(n.ctx)}catch(t){let n=`${e}:update`;P(this,_n,`f`).has(n)||(P(this,_n,`f`).add(n),console.warn(`[VFX-JS] effect[${e}].update() threw; skipping this frame's update:`,t))}}if(t===0){(P(this,xn,`f`)??P(this,I,`f`)[0]).passthroughCopy(P(this,gn,`f`),e.finalTarget,e.elementRectOnCanvasPx);return}for(let n=0;n<t;n++){let r=P(this,pn,`f`)[n],i=P(this,I,`f`)[r],a=P(this,fn,`f`)[r];if(!a.render)continue;i.setPhase(`render`),i.tickAutoUpdates();let o=n===0?P(this,gn,`f`):P(this,mn,`f`)[n-1].texHandle;i.setSrc(o);let s;n===t-1?s=e.finalTarget:(s=P(this,mn,`f`)[n].rtHandle,i.clearRt(s)),i.setOutput(s);try{a.render(i.ctx)}catch(e){let a=`${r}:render`;P(this,_n,`f`).has(a)||(P(this,_n,`f`).add(a),console.warn(`[VFX-JS] effect[${r}].render() threw; falling back to passthrough:`,e));let c=P(this,hn,`f`)[n].outputViewport;s===null?i.passthroughCopy(o,null,c):n===t-1?i.passthroughCopy(o,s,c):i.passthroughCopy(o,s,{x:0,y:0,w:s.width,h:s.height})}i.setPhase(`update`)}}dispose(){if(!P(this,vn,`f`)){N(this,vn,!0,`f`);for(let e=P(this,fn,`f`).length-1;e>=0;e--)P(this,F,`m`,Sn).call(this,e),P(this,I,`f`)[e].dispose();P(this,xn,`f`)&&(P(this,xn,`f`).dispose(),N(this,xn,null,`f`));for(let e of P(this,mn,`f`))e.fb.dispose();N(this,mn,[],`f`),N(this,hn,[],`f`)}}};dn=new WeakMap,fn=new WeakMap,I=new WeakMap,pn=new WeakMap,mn=new WeakMap,hn=new WeakMap,gn=new WeakMap,_n=new WeakMap,vn=new WeakMap,yn=new WeakMap,bn=new WeakMap,xn=new WeakMap,F=new WeakSet,Sn=function(e){let t=P(this,fn,`f`)[e];if(t.dispose)try{t.dispose()}catch(t){console.error(`[VFX-JS] effect[${e}].dispose() threw:`,t)}},Cn=function(e){let t=P(this,pn,`f`).length;if(N(this,hn,Array(t),`f`),t===0)return;let n=P(this,yn,`f`)?e.canvasBufferSize:e.elementBufferSize,r=[0,0,n[0],n[1]],i=P(this,F,`m`,On).call(this,e),a=r;for(let n=0;n<t;n++){let o=P(this,pn,`f`)[n],s=P(this,fn,`f`)[o],c=n===t-1,l=P(this,F,`m`,wn).call(this,s,a,r,i,e)??a,u=[l[2],l[3]],d=ln(r,l),f=c?{x:e.elementRectOnCanvasPx.x+l[0],y:e.elementRectOnCanvasPx.y+l[1],w:u[0],h:u[1]}:{x:0,y:0,w:u[0],h:u[1]};P(this,hn,`f`)[n]={dstRect:l,dstBufferSize:u,contentRectUv:d,outputViewport:f},c||P(this,F,`m`,Dn).call(this,n,u),a=l}let[o,s,c,l]=P(this,hn,`f`)[t-1].dstRect;N(this,bn,nn({top:Math.max(0,s+l-n[1]),right:Math.max(0,o+c-n[0]),bottom:Math.max(0,-s),left:Math.max(0,-o)}),`f`)},wn=function(e,t,n,r,i){if(e.outputRect)return e.outputRect(P(this,F,`m`,Tn).call(this,i,n,t,r))},Tn=function(e,t,n,r){let i=e.canvasBufferSize[0]/e.canvasSize[0]||1;return{element:P(this,yn,`f`)?e.canvasSize:e.elementSize,elementPixel:P(this,yn,`f`)?e.canvasBufferSize:e.elementBufferSize,canvas:e.canvasSize,canvasPixel:e.canvasBufferSize,pixelRatio:i,contentRect:t,srcRect:n,canvasRect:r}},En=function(e,t){let n=P(this,yn,`f`)?t.canvasBufferSize:t.elementBufferSize,r=[0,0,n[0],n[1]],i=P(this,F,`m`,On).call(this,t),a=P(this,pn,`f`).indexOf(e),o=a<=0?r:P(this,hn,`f`)[a-1].dstRect;return P(this,F,`m`,Tn).call(this,t,r,o,i)},Dn=function(e,t){let n=P(this,mn,`f`)[e];if(n&&n.fb.width===t[0]&&n.fb.height===t[1])return;n&&n.fb.dispose();let r=new ye(P(this,dn,`f`),t[0],t[1]),i=en(r),a=Qt(()=>r.texture,()=>r.width,()=>r.height);P(this,mn,`f`)[e]={fb:r,rtHandle:i,texHandle:a,bufferSize:t}},On=function(e){let[t,n]=e.canvasBufferSize;if(P(this,yn,`f`))return[0,0,t,n];let{x:r,y:i}=e.elementRectOnCanvasPx;return[-r,-i,t,n]},kn=function(e,t){let n=P(this,pn,`f`).indexOf(e),r,i,a,o,s;if(n<0)r=t.elementBufferSize[0],i=t.elementBufferSize[1],a={x:0,y:0,w:r,h:i},o=[0,0,1,1],s=[0,0,1,1];else{let e=P(this,hn,`f`)[n];r=e.dstBufferSize[0],i=e.dstBufferSize[1],a=e.outputViewport,o=e.contentRectUv,s=n===0?[0,0,1,1]:P(this,hn,`f`)[n-1].contentRectUv}return{outputBufferW:r,outputBufferH:i,canvasBufferSize:t.canvasBufferSize,outputViewport:a,elementBufferW:t.elementBufferSize[0],elementBufferH:t.elementBufferSize[1],contentRectUv:o,srcRectUv:s}};function jn(e){this.data=e,this.pos=0}jn.prototype.readByte=function(){return this.data[this.pos++]},jn.prototype.peekByte=function(){return this.data[this.pos]},jn.prototype.readBytes=function(e){return this.data.subarray(this.pos,this.pos+=e)},jn.prototype.peekBytes=function(e){return this.data.subarray(this.pos,this.pos+e)},jn.prototype.readString=function(e){for(var t=``,n=0;n<e;n++)t+=String.fromCharCode(this.readByte());return t},jn.prototype.readBitArray=function(){for(var e=[],t=this.readByte(),n=7;n>=0;n--)e.push(!!(t&1<<n));return e},jn.prototype.readUnsigned=function(e){var t=this.readBytes(2);return e?(t[1]<<8)+t[0]:(t[0]<<8)+t[1]};function Mn(e){this.stream=new jn(e),this.output={}}Mn.prototype.parse=function(e){return this.parseParts(this.output,e),this.output},Mn.prototype.parseParts=function(e,t){for(var n=0;n<t.length;n++){var r=t[n];this.parsePart(e,r)}},Mn.prototype.parsePart=function(e,t){var n=t.label,r;if(!(t.requires&&!t.requires(this.stream,this.output,e)))if(t.loop){for(var i=[];t.loop(this.stream);){var a={};this.parseParts(a,t.parts),i.push(a)}e[n]=i}else t.parts?(r={},this.parseParts(r,t.parts),e[n]=r):t.parser?(r=t.parser(this.stream,this.output,e),t.skip||(e[n]=r)):t.bits&&(e[n]=this.parseBits(t.bits))};function Nn(e){return e.reduce(function(e,t){return e*2+t},0)}Mn.prototype.parseBits=function(e){var t={},n=this.stream.readBitArray();for(var r in e){var i=e[r];i.length?t[r]=Nn(n.slice(i.index,i.index+i.length)):t[r]=n[i.index]}return t};var L={readByte:function(){return function(e){return e.readByte()}},readBytes:function(e){return function(t){return t.readBytes(e)}},readString:function(e){return function(t){return t.readString(e)}},readUnsigned:function(e){return function(t){return t.readUnsigned(e)}},readArray:function(e,t){return function(n,r,i){for(var a=t(n,r,i),o=Array(a),s=0;s<a;s++)o[s]=n.readBytes(e);return o}}},Pn={label:`blocks`,parser:function(e){for(var t=[],n=0,r=0,i=e.readByte();i!==r;i=e.readByte())t.push(e.readBytes(i)),n+=i;var a=new Uint8Array(n);n=0;for(var o=0;o<t.length;o++)a.set(t[o],n),n+=t[o].length;return a}},Fn={label:`gce`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===249},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`byteSize`,parser:L.readByte()},{label:`extras`,bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:`delay`,parser:L.readUnsigned(!0)},{label:`transparentColorIndex`,parser:L.readByte()},{label:`terminator`,parser:L.readByte(),skip:!0}]},In={label:`image`,requires:function(e){return e.peekByte()===44},parts:[{label:`code`,parser:L.readByte(),skip:!0},{label:`descriptor`,parts:[{label:`left`,parser:L.readUnsigned(!0)},{label:`top`,parser:L.readUnsigned(!0)},{label:`width`,parser:L.readUnsigned(!0)},{label:`height`,parser:L.readUnsigned(!0)},{label:`lct`,bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:`lct`,requires:function(e,t,n){return n.descriptor.lct.exists},parser:L.readArray(3,function(e,t,n){return 2**(n.descriptor.lct.size+1)})},{label:`data`,parts:[{label:`minCodeSize`,parser:L.readByte()},Pn]}]},Ln={label:`text`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===1},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`blockSize`,parser:L.readByte()},{label:`preData`,parser:function(e,t,n){return e.readBytes(n.text.blockSize)}},Pn]},Rn={label:`frames`,parts:[Fn,{label:`application`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===255},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`blockSize`,parser:L.readByte()},{label:`id`,parser:function(e,t,n){return e.readString(n.blockSize)}},Pn]},{label:`comment`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===254},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},Pn]},In,Ln],loop:function(e){var t=e.peekByte();return t===33||t===44}},zn=[{label:`header`,parts:[{label:`signature`,parser:L.readString(3)},{label:`version`,parser:L.readString(3)}]},{label:`lsd`,parts:[{label:`width`,parser:L.readUnsigned(!0)},{label:`height`,parser:L.readUnsigned(!0)},{label:`gct`,bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:`backgroundColorIndex`,parser:L.readByte()},{label:`pixelAspectRatio`,parser:L.readByte()}]},{label:`gct`,requires:function(e,t){return t.lsd.gct.exists},parser:L.readArray(3,function(e,t){return 2**(t.lsd.gct.size+1)})},Rn];function Bn(e){this.raw=new Mn(new Uint8Array(e)).parse(zn),this.raw.hasImages=!1;for(var t=0;t<this.raw.frames.length;t++)if(this.raw.frames[t].image){this.raw.hasImages=!0;break}}Bn.prototype.decompressFrame=function(e,t){if(e>=this.raw.frames.length)return null;var n=this.raw.frames[e];if(n.image){var r=n.image.descriptor.width*n.image.descriptor.height,i=o(n.image.data.minCodeSize,n.image.data.blocks,r);n.image.descriptor.lct.interlaced&&(i=s(i,n.image.descriptor.width));var a={pixels:i,dims:{top:n.image.descriptor.top,left:n.image.descriptor.left,width:n.image.descriptor.width,height:n.image.descriptor.height}};return n.image.descriptor.lct&&n.image.descriptor.lct.exists?a.colorTable=n.image.lct:a.colorTable=this.raw.gct,n.gce&&(a.delay=(n.gce.delay||10)*10,a.disposalType=n.gce.extras.disposal,n.gce.extras.transparentColorGiven&&(a.transparentIndex=n.gce.transparentColorIndex)),t&&(a.patch=c(a)),a}return null;function o(e,t,n){var r=4096,i=-1,a=n,o,s,c,l,u,d,f,p,m,h,g,_,v,y,ee,te,b=Array(n),x=Array(r),S=Array(r),ne=Array(r+1);for(_=e,s=1<<_,u=s+1,o=s+2,f=i,l=_+1,c=(1<<l)-1,m=0;m<s;m++)x[m]=0,S[m]=m;for(g=p=v=y=te=ee=0,h=0;h<a;){if(y===0){if(p<l){g+=t[ee]<<p,p+=8,ee++;continue}if(m=g&c,g>>=l,p-=l,m>o||m==u)break;if(m==s){l=_+1,c=(1<<l)-1,o=s+2,f=i;continue}if(f==i){ne[y++]=S[m],f=m,v=m;continue}for(d=m,m==o&&(ne[y++]=v,m=f);m>s;)ne[y++]=S[m],m=x[m];v=S[m]&255,ne[y++]=v,o<r&&(x[o]=f,S[o]=v,o++,(o&c)===0&&o<r&&(l++,c+=o)),f=d}y--,b[te++]=ne[y],h++}for(h=te;h<a;h++)b[h]=0;return b}function s(e,t){for(var n=Array(e.length),r=e.length/t,i=function(r,i){var a=e.slice(i*t,(i+1)*t);n.splice.apply(n,[r*t,t].concat(a))},a=[0,4,2,1],o=[8,8,4,2],s=0,c=0;c<4;c++)for(var l=a[c];l<r;l+=o[c])i(l,s),s++;return n}function c(e){for(var t=e.pixels.length,n=new Uint8ClampedArray(t*4),r=0;r<t;r++){var i=r*4,a=e.pixels[r],o=e.colorTable[a];n[i]=o[0],n[i+1]=o[1],n[i+2]=o[2],n[i+3]=a===e.transparentIndex?0:255}return n}},Bn.prototype.decompressFrames=function(e,t,n){t===void 0&&(t=0),n=n===void 0?this.raw.frames.length:Math.min(n,this.raw.frames.length);for(var r=[],i=t;i<n;i++)this.raw.frames[i].image&&r.push(this.decompressFrame(i,e));return r};var Vn=Bn,Hn=class e{static async create(t,n){let r=await fetch(t).then(e=>e.arrayBuffer()).then(e=>new Vn(e)),i=r.decompressFrames(!0,void 0,void 0),{width:a,height:o}=r.raw.lsd;return new e(i,a,o,n)}constructor(e,t,n,r){this.frames=[],this.index=0,this.playTime=0,this.frames=e,this.canvas=document.createElement(`canvas`),this.ctx=this.canvas.getContext(`2d`),this.pixelRatio=r,this.canvas.width=t,this.canvas.height=n,this.startTime=Date.now()}getCanvas(){return this.canvas}update(){let e=Date.now()-this.startTime;for(;this.playTime<e;){let e=this.frames[this.index%this.frames.length];this.playTime+=e.delay,this.index++}let t=this.frames[this.index%this.frames.length],n=new ImageData(t.patch,t.dims.width,t.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(n,t.dims.left,t.dims.top)}},Un=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Wn,Gn,Kn,qn,Jn,Yn=class{constructor(e){this.isContextLost=!1,Wn.set(this,new Set),Gn.set(this,new Set),Kn.set(this,new Set),qn.set(this,e=>{e.preventDefault(),this.isContextLost=!0;for(let e of Un(this,Gn,`f`))e()}),Jn.set(this,()=>{this.isContextLost=!1;let e=this.gl;e.getExtension(`EXT_color_buffer_float`),e.getExtension(`EXT_color_buffer_half_float`);for(let e of Un(this,Wn,`f`))e.restore();for(let e of Un(this,Kn,`f`))e()});let t=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1});if(!t)throw Error(`[VFX-JS] WebGL2 is not available.`);this.gl=t,this.canvas=e,t.getExtension(`EXT_color_buffer_float`),t.getExtension(`EXT_color_buffer_half_float`),this.floatLinearFilter=!!t.getExtension(`OES_texture_float_linear`),this.maxTextureSize=t.getParameter(t.MAX_TEXTURE_SIZE),e.addEventListener(`webglcontextlost`,Un(this,qn,`f`),!1),e.addEventListener(`webglcontextrestored`,Un(this,Jn,`f`),!1)}setSize(e,t,n){let r=Math.floor(e*n),i=Math.floor(t*n);(this.canvas.width!==r||this.canvas.height!==i)&&(this.canvas.width=r,this.canvas.height=i)}addResource(e){Un(this,Wn,`f`).add(e)}removeResource(e){Un(this,Wn,`f`).delete(e)}onContextLost(e){return Un(this,Gn,`f`).add(e),()=>Un(this,Gn,`f`).delete(e)}onContextRestored(e){return Un(this,Kn,`f`).add(e),()=>Un(this,Kn,`f`).delete(e)}};Wn=new WeakMap,Gn=new WeakMap,Kn=new WeakMap,qn=new WeakMap,Jn=new WeakMap;var Xn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Zn=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Qn,$n,er,tr,nr=class{constructor(e){Qn.add(this),$n.set(this,void 0),er.set(this,void 0),Xn(this,$n,e,`f`),this.gl=e.gl,Zn(this,Qn,`m`,tr).call(this),e.addResource(this)}restore(){Zn(this,Qn,`m`,tr).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){Zn(this,$n,`f`).removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(Zn(this,er,`f`))}};$n=new WeakMap,er=new WeakMap,Qn=new WeakSet,tr=function(){let e=this.gl,t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw Error(`[VFX-JS] Failed to create quad VAO`);this.vao=t,Xn(this,er,n,`f`);let r=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)};function rr(e,t,n,r={}){return new ye(e,t,n,{float:r.float??!1})}function ir(e,t){let i=t.renderingToBuffer??!1,a;a=i?`none`:t.premultipliedAlpha?`premultiplied`:`normal`;let o=t.glslVersion??Be(t.fragmentShader);return new qe(e,t.vertexShader??(o===`100`?r:n),t.fragmentShader,t.uniforms,a,o)}var ar=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},R=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},z,or,sr,cr,lr,ur,dr=class{constructor(e,t,n,r,i,a,o,s){if(z.set(this,void 0),or.set(this,void 0),sr.set(this,void 0),cr.set(this,void 0),lr.set(this,void 0),ur.set(this,void 0),ar(this,cr,r??!1,`f`),ar(this,lr,i??!1,`f`),ar(this,ur,a,`f`),ar(this,or,{},`f`),ar(this,z,{src:{value:null},offset:{value:new ke},resolution:{value:new ke},viewport:{value:new Ae},time:{value:0},mouse:{value:new ke},passIndex:{value:0}},`f`),n)for(let[e,t]of Object.entries(n))typeof t==`function`?(R(this,or,`f`)[e]=t,R(this,z,`f`)[e]={value:t()}):R(this,z,`f`)[e]={value:t};this.pass=ir(e,{fragmentShader:t,uniforms:R(this,z,`f`),renderingToBuffer:o??!1,premultipliedAlpha:!0,glslVersion:s})}get uniforms(){return R(this,z,`f`)}setUniforms(e,t,n,r,i,a){R(this,z,`f`).src.value=e,R(this,z,`f`).resolution.value.set(n.w*t,n.h*t),R(this,z,`f`).offset.value.set(n.x*t,n.y*t),R(this,z,`f`).time.value=r,R(this,z,`f`).mouse.value.set(i*t,a*t)}updateCustomUniforms(e){for(let[e,t]of Object.entries(R(this,or,`f`)))R(this,z,`f`)[e]&&(R(this,z,`f`)[e].value=t());if(e)for(let[t,n]of Object.entries(e))R(this,z,`f`)[t]&&(R(this,z,`f`)[t].value=n())}initializeBackbuffer(e,t,n,r){R(this,cr,`f`)&&!R(this,sr,`f`)&&(R(this,ur,`f`)?ar(this,sr,new Oe(e,R(this,ur,`f`)[0],R(this,ur,`f`)[1],1,R(this,lr,`f`)),`f`):ar(this,sr,new Oe(e,t,n,r,R(this,lr,`f`)),`f`))}resizeBackbuffer(e,t){R(this,sr,`f`)&&!R(this,ur,`f`)&&R(this,sr,`f`).resize(e,t)}registerBufferUniform(e){R(this,z,`f`)[e]||(R(this,z,`f`)[e]={value:null})}get backbuffer(){return R(this,sr,`f`)}get persistent(){return R(this,cr,`f`)}get float(){return R(this,lr,`f`)}get size(){return R(this,ur,`f`)}dispose(){this.pass.dispose(),R(this,sr,`f`)?.dispose()}};z=new WeakMap,or=new WeakMap,sr=new WeakMap,cr=new WeakMap,lr=new WeakMap,ur=new WeakMap;var B=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},V=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},H,fr,pr,U,mr,hr,W,G,K,gr,q,_r,vr,yr,br,xr,Sr,J,Y,Cr,X,wr,Tr,Er,Dr,Or,kr,Ar,jr,Mr,Nr,Pr,Fr,Ir,Lr,Rr,zr,Br,Vr,Hr,Ur,Wr,Z,Gr,Kr,qr,Jr,Yr,Xr,Zr=new Map,Qr=class{constructor(e,t){H.add(this),fr.set(this,void 0),pr.set(this,void 0),U.set(this,void 0),mr.set(this,void 0),hr.set(this,void 0),W.set(this,void 0),G.set(this,[]),K.set(this,void 0),gr.set(this,new Map),q.set(this,null),_r.set(this,!1),vr.set(this,new WeakSet),yr.set(this,{}),br.set(this,{}),xr.set(this,0),Sr.set(this,void 0),J.set(this,2),Y.set(this,[]),Cr.set(this,Date.now()/1e3),X.set(this,an(0)),wr.set(this,an(0)),Tr.set(this,[0,0]),Er.set(this,0),Dr.set(this,0),Or.set(this,0),kr.set(this,0),Ar.set(this,new WeakMap),Mr.set(this,async()=>{if(typeof window<`u`){for(let e of V(this,Y,`f`))if(e.type===`text`&&e.isInViewport){let t=e.element.getBoundingClientRect();(t.width!==e.width||t.height!==e.height)&&(await V(this,H,`m`,Pr).call(this,e),e.width=t.width,e.height=t.height)}for(let e of V(this,Y,`f`))if(e.type===`text`&&!e.isInViewport){let t=e.element.getBoundingClientRect();(t.width!==e.width||t.height!==e.height)&&(await V(this,H,`m`,Pr).call(this,e),e.width=t.width,e.height=t.height)}}}),Nr.set(this,e=>{typeof window<`u`&&(B(this,Or,e.clientX,`f`),B(this,kr,window.innerHeight-e.clientY,`f`))}),Lr.set(this,()=>{this.isPlaying()&&(this.render(),B(this,Sr,requestAnimationFrame(V(this,Lr,`f`)),`f`))}),B(this,fr,e,`f`),B(this,pr,t,`f`),B(this,U,new Yn(t),`f`),B(this,mr,V(this,U,`f`).gl,`f`),V(this,mr,`f`).clearColor(0,0,0,0),B(this,J,e.pixelRatio,`f`),B(this,hr,new nr(V(this,U,`f`)),`f`),typeof window<`u`&&(window.addEventListener(`resize`,V(this,Mr,`f`)),window.addEventListener(`pointermove`,V(this,Nr,`f`))),V(this,Mr,`f`).call(this),B(this,W,new Xe(V(this,U,`f`)),`f`),V(this,H,`m`,Kr).call(this,e.postEffects),V(this,U,`f`).onContextRestored(()=>{V(this,mr,`f`).clearColor(0,0,0,0)})}destroy(){this.stop(),typeof window<`u`&&(window.removeEventListener(`resize`,V(this,Mr,`f`)),window.removeEventListener(`pointermove`,V(this,Nr,`f`))),V(this,K,`f`)?.dispose();for(let e of V(this,gr,`f`).values())e?.dispose();for(let e of V(this,G,`f`))e.pass.dispose();V(this,q,`f`)&&(V(this,q,`f`).dispose(),B(this,q,null,`f`),B(this,_r,!1,`f`)),V(this,W,`f`).dispose(),V(this,hr,`f`).dispose()}async addElement(e,t={},n){if(t.effect!==void 0)return V(this,H,`m`,Fr).call(this,e,t,t.effect,n);let r=V(this,H,`m`,Ir).call(this,t),i=e.getBoundingClientRect(),a=on(i),[o,s]=ti(t.overflow),c=sn(a,s),l=ni(t.intersection),u=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),d,f,p=!1;if(e instanceof HTMLImageElement)if(f=`img`,p=!!e.src.match(/\.gif/i),p){let t=await Hn.create(e.src,V(this,J,`f`));Zr.set(e,t),d=new T(V(this,U,`f`),t.getCanvas())}else{let t=await pe(e.src);d=new T(V(this,U,`f`),t)}else if(e instanceof HTMLVideoElement)d=new T(V(this,U,`f`),e),f=`video`;else if(e instanceof HTMLCanvasElement)e.hasAttribute(`layoutsubtree`)&&n?(d=new T(V(this,U,`f`),n),f=`hic`):(d=new T(V(this,U,`f`),e),f=`canvas`);else{let t=await Qe(e,u,void 0,this.maxTextureSize);d=new T(V(this,U,`f`),t),f=`text`}let[m,h]=ai(t.wrap);d.wrapS=m,d.wrapT=h,d.needsUpdate=!0;let g=t.autoCrop??!0;if(f!==`hic`&&t.overlay!==!0)if(typeof t.overlay==`number`)e.style.setProperty(`opacity`,t.overlay.toString());else{let t=f===`video`?`0.0001`:`0`;e.style.setProperty(`opacity`,t.toString())}let _={src:{value:d},resolution:{value:new ke},offset:{value:new ke},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},mouse:{value:new ke},intersection:{value:0},viewport:{value:new Ae},autoCrop:{value:g}},v={};if(t.uniforms!==void 0)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(_[e]={value:n()},v[e]=n):_[e]={value:n};let y;t.backbuffer&&(y=(()=>{let e=(c.right-c.left)*V(this,J,`f`),t=(c.bottom-c.top)*V(this,J,`f`);return new Oe(V(this,U,`f`),e,t,V(this,J,`f`),!1)})(),_.backbuffer={value:y.texture});let ee=new Map,te=new Map;for(let e=0;e<r.length-1;e++){let t=r[e].target??`pass${e}`;r[e]={...r[e],target:t};let n=r[e].size,i=n?n[0]:(c.right-c.left)*V(this,J,`f`),a=n?n[1]:(c.bottom-c.top)*V(this,J,`f`);if(r[e].persistent){let i=n?1:V(this,J,`f`),a=n?n[0]:c.right-c.left,o=n?n[1]:c.bottom-c.top;te.set(t,new Oe(V(this,U,`f`),a,o,i,r[e].float))}else ee.set(t,rr(V(this,U,`f`),i,a,{float:r[e].float}))}let b=[];for(let e=0;e<r.length;e++){let t=r[e],n=t.frag,i={..._},a={};for(let[e,r]of ee)e!==t.target&&n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:r.texture});for(let[e,t]of te)n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:t.texture});if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(i[e]={value:n()},a[e]=n):i[e]={value:n};let o=ir(V(this,U,`f`),{vertexShader:t.vert,fragmentShader:n,uniforms:i,renderingToBuffer:t.target!==void 0,glslVersion:t.glslVersion});b.push({pass:o,uniforms:i,uniformGenerators:{...v,...a},target:t.target,persistent:t.persistent,float:t.float,size:t.size,backbuffer:t.target?te.get(t.target):void 0})}let x=Date.now()/1e3,S={type:f,element:e,isInViewport:!1,isInLogicalViewport:!1,width:i.width,height:i.height,passes:b,bufferTargets:ee,startTime:x,enterTime:x,leaveTime:-1/0,release:t.release??1/0,isGif:p,isFullScreen:o,overflow:s,intersection:l,originalOpacity:u,srcTexture:d,zIndex:t.zIndex??0,backbuffer:y,autoCrop:g};V(this,H,`m`,Ur).call(this,S,a,x),V(this,Y,`f`).push(S),V(this,Y,`f`).sort((e,t)=>e.zIndex-t.zIndex)}removeElement(e){let t=V(this,Y,`f`).findIndex(t=>t.element===e);if(t!==-1){let n=V(this,Y,`f`).splice(t,1)[0];if(n.chain)V(this,H,`m`,Vr).call(this,n.chain.effects),n.chain.dispose();else{for(let e of n.bufferTargets.values())e.dispose();for(let e of n.passes)e.pass.dispose(),e.backbuffer?.dispose();n.backbuffer?.dispose()}n.srcTexture.dispose(),e.style.setProperty(`opacity`,n.originalOpacity.toString())}}updateTextElement(e){let t=V(this,Y,`f`).findIndex(t=>t.element===e);return t===-1?Promise.resolve():V(this,H,`m`,Pr).call(this,V(this,Y,`f`)[t])}updateCanvasElement(e){let t=V(this,Y,`f`).find(t=>t.element===e);if(t){let n=t.srcTexture,r=new T(V(this,U,`f`),e);r.wrapS=n.wrapS,r.wrapT=n.wrapT,r.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=r),t.srcTexture=r,n.dispose()}}updateHICTexture(e,t){let n=V(this,Y,`f`).find(t=>t.element===e);if(!n||n.type!==`hic`)return;let r=n.srcTexture;if(r.source===t)r.needsUpdate=!0;else{let e=new T(V(this,U,`f`),t);e.wrapS=r.wrapS,e.wrapT=r.wrapT,e.needsUpdate=!0,!n.chain&&n.passes.length>0&&(n.passes[0].uniforms.src.value=e),n.srcTexture=e,r.dispose()}}get maxTextureSize(){return V(this,U,`f`).maxTextureSize}isPlaying(){return V(this,Sr,`f`)!==void 0}play(){this.isPlaying()||B(this,Sr,requestAnimationFrame(V(this,Lr,`f`)),`f`)}stop(){V(this,Sr,`f`)!==void 0&&(cancelAnimationFrame(V(this,Sr,`f`)),B(this,Sr,void 0,`f`))}render(){let e=Date.now()/1e3,t=V(this,mr,`f`);V(this,H,`m`,jr).call(this),t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,V(this,pr,`f`).width,V(this,pr,`f`).height),t.clear(t.COLOR_BUFFER_BIT);let n=V(this,X,`f`).right-V(this,X,`f`).left,r=V(this,X,`f`).bottom-V(this,X,`f`).top,i=Se(0,0,n,r),a=V(this,H,`m`,zr).call(this);a&&(V(this,H,`m`,Xr).call(this,n,r),V(this,K,`f`)&&(t.bindFramebuffer(t.FRAMEBUFFER,V(this,K,`f`).fbo),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)));for(let t of V(this,Y,`f`)){let o=t.element.getBoundingClientRect(),s=on(o),c=V(this,H,`m`,Ur).call(this,t,s,e);if(!c.isVisible)continue;if(t.chain){V(this,H,`m`,Rr).call(this,t,s,c,e);continue}let l=t.passes[0].uniforms;l.time.value=e-t.startTime,l.resolution.value.set(o.width*V(this,J,`f`),o.height*V(this,J,`f`)),l.mouse.value.set((V(this,Or,`f`)+V(this,Er,`f`))*V(this,J,`f`),(V(this,kr,`f`)+V(this,Dr,`f`))*V(this,J,`f`));for(let e of t.passes)for(let[t,n]of Object.entries(e.uniformGenerators))e.uniforms[t].value=n();Zr.get(t.element)?.update(),(t.type===`video`||t.isGif)&&(l.src.value.needsUpdate=!0);let u=xe(s,r,V(this,Er,`f`),V(this,Dr,`f`)),d=xe(c.rectWithOverflow,r,V(this,Er,`f`),V(this,Dr,`f`));t.backbuffer&&(t.passes[0].uniforms.backbuffer.value=t.backbuffer.texture);{let e=t.isFullScreen?i:d,n=Math.max(1,e.w*V(this,J,`f`)),r=Math.max(1,e.h*V(this,J,`f`)),a=Math.max(1,e.w),o=Math.max(1,e.h);for(let e=0;e<t.passes.length-1;e++){let i=t.passes[e];if(!i.size)if(i.backbuffer)i.backbuffer.resize(a,o);else{let e=t.bufferTargets.get(i.target);e&&(e.width!==n||e.height!==r)&&e.setSize(n,r)}}}let f=new Map;for(let e of t.passes)e.backbuffer&&e.target&&f.set(e.target,e.backbuffer.texture);let p=t.srcTexture,m=V(this,Or,`f`)+V(this,Er,`f`)-u.x,h=V(this,kr,`f`)+V(this,Dr,`f`)-u.y;for(let e=0;e<t.passes.length-1;e++){let n=t.passes[e],r=t.isFullScreen?i:d;n.uniforms.src.value=p;for(let[e,t]of f)n.uniforms[e]&&(n.uniforms[e].value=t);for(let[e,t]of Object.entries(n.uniformGenerators))n.uniforms[e]&&(n.uniforms[e].value=t());let a=n.size?n.size[0]:r.w*V(this,J,`f`),o=n.size?n.size[1]:r.h*V(this,J,`f`),s=n.size?Se(0,0,n.size[0],n.size[1]):Se(0,0,r.w,r.h);if(n.uniforms.resolution.value.set(a,o),n.uniforms.offset.value.set(0,0),n.uniforms.mouse.value.set(m/r.w*a,h/r.h*o),n.backbuffer)V(this,H,`m`,Z).call(this,n.pass,n.backbuffer.target,s,n.uniforms,!0),n.backbuffer.swap(),p=n.backbuffer.texture;else{let e=t.bufferTargets.get(n.target);if(!e)continue;V(this,H,`m`,Z).call(this,n.pass,e,s,n.uniforms,!0),p=e.texture}n.target&&f.set(n.target,p)}let g=t.passes[t.passes.length-1];g.uniforms.src.value=p,g.uniforms.resolution.value.set(o.width*V(this,J,`f`),o.height*V(this,J,`f`)),g.uniforms.offset.value.set(u.x*V(this,J,`f`),u.y*V(this,J,`f`)),g.uniforms.mouse.value.set((V(this,Or,`f`)+V(this,Er,`f`))*V(this,J,`f`),(V(this,kr,`f`)+V(this,Dr,`f`))*V(this,J,`f`));for(let[e,t]of f)g.uniforms[e]&&(g.uniforms[e].value=t);for(let[e,t]of Object.entries(g.uniformGenerators))g.uniforms[e]&&(g.uniforms[e].value=t());t.backbuffer?(g.uniforms.backbuffer.value=t.backbuffer.texture,t.isFullScreen?(t.backbuffer.resize(n,r),V(this,H,`m`,Gr).call(this,t,u.x,u.y),V(this,H,`m`,Z).call(this,g.pass,t.backbuffer.target,i,g.uniforms,!0),t.backbuffer.swap(),V(this,W,`f`).setUniforms(t.backbuffer.texture,V(this,J,`f`),i),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,a&&V(this,K,`f`)||null,i,V(this,W,`f`).uniforms,!1)):(t.backbuffer.resize(d.w,d.h),V(this,H,`m`,Gr).call(this,t,t.overflow.left,t.overflow.bottom),V(this,H,`m`,Z).call(this,g.pass,t.backbuffer.target,t.backbuffer.getViewport(),g.uniforms,!0),t.backbuffer.swap(),V(this,W,`f`).setUniforms(t.backbuffer.texture,V(this,J,`f`),d),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,a&&V(this,K,`f`)||null,d,V(this,W,`f`).uniforms,!1))):(V(this,H,`m`,Gr).call(this,t,u.x,u.y),V(this,H,`m`,Z).call(this,g.pass,a&&V(this,K,`f`)||null,t.isFullScreen?i:d,g.uniforms,!1))}a&&V(this,K,`f`)&&(V(this,q,`f`)&&V(this,_r,`f`)?V(this,H,`m`,Jr).call(this,i,e):V(this,H,`m`,Yr).call(this,i,e))}};fr=new WeakMap,pr=new WeakMap,U=new WeakMap,mr=new WeakMap,hr=new WeakMap,W=new WeakMap,G=new WeakMap,K=new WeakMap,gr=new WeakMap,q=new WeakMap,_r=new WeakMap,vr=new WeakMap,yr=new WeakMap,br=new WeakMap,xr=new WeakMap,Sr=new WeakMap,J=new WeakMap,Y=new WeakMap,Cr=new WeakMap,X=new WeakMap,wr=new WeakMap,Tr=new WeakMap,Er=new WeakMap,Dr=new WeakMap,Or=new WeakMap,kr=new WeakMap,Ar=new WeakMap,Mr=new WeakMap,Nr=new WeakMap,Lr=new WeakMap,H=new WeakSet,jr=function(){if(typeof window>`u`)return;let e=V(this,pr,`f`).ownerDocument,t=e.compatMode===`BackCompat`?e.body:e.documentElement,n=t.clientWidth,r=t.clientHeight,i=window.scrollX,a=window.scrollY,o,s;if(V(this,fr,`f`).fixedCanvas)o=0,s=0;else if(V(this,fr,`f`).wrapper)o=n*V(this,fr,`f`).scrollPadding[0],s=r*V(this,fr,`f`).scrollPadding[1];else{let t=e.body.scrollWidth-(i+n),c=e.body.scrollHeight-(a+r);o=oi(n*V(this,fr,`f`).scrollPadding[0],0,t),s=oi(r*V(this,fr,`f`).scrollPadding[1],0,c)}let c=n+o*2,l=r+s*2;(c!==V(this,Tr,`f`)[0]||l!==V(this,Tr,`f`)[1])&&(V(this,pr,`f`).style.width=`${c}px`,V(this,pr,`f`).style.height=`${l}px`,V(this,U,`f`).setSize(c,l,V(this,J,`f`)),B(this,X,an({top:-s,left:-o,right:n+o,bottom:r+s}),`f`),B(this,wr,an({top:0,left:0,right:n,bottom:r}),`f`),B(this,Tr,[c,l],`f`),B(this,Er,o,`f`),B(this,Dr,s,`f`)),V(this,fr,`f`).fixedCanvas||V(this,pr,`f`).style.setProperty(`transform`,`translate(${i-o}px, ${a-s}px)`)},Pr=async function(e){if(!V(this,Ar,`f`).get(e.element)){V(this,Ar,`f`).set(e.element,!0);try{let t=e.srcTexture,n=t.source instanceof OffscreenCanvas?t.source:void 0,r=await Qe(e.element,e.originalOpacity,n,this.maxTextureSize);if(r.width===0||r.width===0)throw`omg`;let i=new T(V(this,U,`f`),r);i.wrapS=t.wrapS,i.wrapT=t.wrapT,i.needsUpdate=!0,!e.chain&&e.passes.length>0&&(e.passes[0].uniforms.src.value=i),e.srcTexture=i,t.dispose()}catch(e){console.error(e)}V(this,Ar,`f`).set(e.element,!1)}},Fr=async function(e,t,n,r){t.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified; `effect` takes precedence."),t.overflow!==void 0&&console.warn("[VFX-JS] `overflow` is shader-path only and is ignored by the effect path. Use each effect's own `outputRect` (with `dims.canvasRect` for fullscreen) to control its dst rect.");let i=Array.isArray(n)?[...n]:[n];V(this,H,`m`,Br).call(this,i);let a=e.getBoundingClientRect(),o=on(a),[s,c]=ti(t.overflow),l=ni(t.intersection),u=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),d,f,p=!1;if(e instanceof HTMLImageElement)if(f=`img`,p=!!e.src.match(/\.gif/i),p){let t=await Hn.create(e.src,V(this,J,`f`));Zr.set(e,t),d=new T(V(this,U,`f`),t.getCanvas())}else{let t=await pe(e.src);d=new T(V(this,U,`f`),t)}else if(e instanceof HTMLVideoElement)d=new T(V(this,U,`f`),e),f=`video`;else if(e instanceof HTMLCanvasElement)e.hasAttribute(`layoutsubtree`)&&r?(d=new T(V(this,U,`f`),r),f=`hic`):(d=new T(V(this,U,`f`),e),f=`canvas`);else{let t=await Qe(e,u,void 0,this.maxTextureSize);d=new T(V(this,U,`f`),t),f=`text`}let[m,h]=ai(t.wrap);d.wrapS=m,d.wrapT=h,d.needsUpdate=!0;let g=t.autoCrop??!0;if(f!==`hic`&&t.overlay!==!0)if(typeof t.overlay==`number`)e.style.setProperty(`opacity`,t.overlay.toString());else{let t=f===`video`?`0.0001`:`0`;e.style.setProperty(`opacity`,t.toString())}let _=Date.now()/1e3,v={type:f,element:e,isInViewport:!1,isInLogicalViewport:!1,width:a.width,height:a.height,passes:[],bufferTargets:new Map,startTime:_,enterTime:_,leaveTime:-1/0,release:t.release??1/0,isGif:p,isFullScreen:s,overflow:c,intersection:l,originalOpacity:u,srcTexture:d,zIndex:t.zIndex??0,backbuffer:void 0,autoCrop:g,effectLastRenderTime:_},y=Qt(()=>v.srcTexture,()=>ri(v.srcTexture,`w`),()=>ri(v.srcTexture,`h`)),ee={},te={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(te[e]=n,ee[e]=n()):ee[e]=n;v.effectUniformGenerators=te,v.effectStaticUniforms=ee;let b={autoCrop:g,glslVersion:t.glslVersion??`300 es`},x=new An(V(this,U,`f`),V(this,hr,`f`),V(this,J,`f`),i,b,y,!1);try{await x.initAll()}catch(t){throw V(this,H,`m`,Vr).call(this,i),d.dispose(),e.style.setProperty(`opacity`,u.toString()),t}v.chain=x,V(this,H,`m`,Ur).call(this,v,o,_),V(this,Y,`f`).push(v),V(this,Y,`f`).sort((e,t)=>e.zIndex-t.zIndex)},Ir=function(e){let t=t=>t.glslVersion===void 0&&e.glslVersion!==void 0?{...t,glslVersion:e.glslVersion}:t;return Array.isArray(e.shader)?e.shader.map(t):[t({frag:V(this,H,`m`,Wr).call(this,e.shader||`uvGradient`)})]},Rr=function(e,t,n,r){let i=e.chain;if(!i)return;let a=V(this,J,`f`);Zr.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(e.srcTexture.needsUpdate=!0);let o={...e.effectStaticUniforms??{}};if(e.effectUniformGenerators)for(let[t,n]of Object.entries(e.effectUniformGenerators))o[t]=n();let s=V(this,X,`f`).right-V(this,X,`f`).left,c=V(this,X,`f`).bottom-V(this,X,`f`).top,l=xe(t,c,V(this,Er,`f`),V(this,Dr,`f`)),u=V(this,Or,`f`)+V(this,Er,`f`)-l.x,d=V(this,kr,`f`)+V(this,Dr,`f`)-l.y,f=t.right-t.left,p=t.bottom-t.top,m=r-(e.effectLastRenderTime??r);e.effectLastRenderTime=r;let h=V(this,H,`m`,zr).call(this)&&V(this,K,`f`)?en(V(this,K,`f`)):null;i.run({time:r-e.startTime,deltaTime:m,mouse:[u*a,d*a],mouseViewport:[V(this,Or,`f`)*a,V(this,kr,`f`)*a],intersection:n.intersection,enterTime:r-e.enterTime,leaveTime:r-e.leaveTime,resolvedUniforms:o,canvasSize:[s,c],canvasBufferSize:[s*a,c*a],elementSize:[f,p],elementBufferSize:[f*a,p*a],elementRectOnCanvasPx:{x:l.x*a,y:l.y*a,w:l.w*a,h:l.h*a},finalTarget:h,isVisible:n.isVisible})},zr=function(){return V(this,G,`f`).length>0||V(this,q,`f`)!==null&&V(this,_r,`f`)},Br=function(e){for(let t of e)if(V(this,vr,`f`).has(t))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");for(let t of e)V(this,vr,`f`).add(t)},Vr=function(e){for(let t of e)V(this,vr,`f`).delete(t)},Hr=function(e){let t=e.hitTestPadBuffer,n=V(this,J,`f`);return nn({top:t.top/n,right:t.right/n,bottom:t.bottom/n,left:t.left/n})},Ur=function(e,t,n){let r=sn(t,e.chain?V(this,H,`m`,Hr).call(this,e.chain):e.overflow),i=e.isFullScreen||$r(V(this,wr,`f`),r),a=sn(V(this,wr,`f`),e.intersection.rootMargin),o=un(a,t),s=e.isFullScreen||ei(a,t,o,e.intersection.threshold);!e.isInLogicalViewport&&s&&(e.enterTime=n,e.leaveTime=1/0),e.isInLogicalViewport&&!s&&(e.leaveTime=n),e.isInViewport=i,e.isInLogicalViewport=s;let c=i&&n-e.leaveTime<=e.release;if(c&&!e.chain&&e.passes.length>0){let t=e.passes[0].uniforms;t.intersection.value=o,t.enterTime.value=n-e.enterTime,t.leaveTime.value=n-e.leaveTime}return{isVisible:c,intersection:o,rectWithOverflow:r}},Wr=function(e){return e in s?s[e]:e},Z=function(e,t,n,r,i){let a=V(this,mr,`f`);i&&t!==null&&t!==V(this,K,`f`)&&(a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.viewport(0,0,t.width,t.height),a.clear(a.COLOR_BUFFER_BIT));let o=r.viewport;o&&o.value instanceof Ae&&o.value.set(n.x*V(this,J,`f`),n.y*V(this,J,`f`),n.w*V(this,J,`f`),n.h*V(this,J,`f`));try{Je(a,V(this,hr,`f`),e,t,n,V(this,Tr,`f`)[0],V(this,Tr,`f`)[1],V(this,J,`f`))}catch(e){console.error(e)}},Gr=function(e,t,n){let r=e.passes[0].uniforms.offset.value;r.x=t*V(this,J,`f`),r.y=n*V(this,J,`f`)},Kr=function(e){let t=e.length===1&&!(`frag`in e[0])?e[0]:null;if(t&&t.effect!==void 0){V(this,H,`m`,qr).call(this,t,t.effect);return}let n=[],r=[];for(let t of e)`frag`in t&&r.push(t);for(let e=0;e<r.length-1;e++)r[e].target||(r[e]={...r[e],target:`pass${e}`});for(let t of e){let e,r,i;if(`frag`in t)e=t.frag,r=new dr(V(this,U,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,t.size,t.target!==void 0,t.glslVersion),i=t.target;else{if(t.shader===void 0)throw Error("VFXPostEffect requires `shader` (the `effect` path is not implemented yet).");e=V(this,H,`m`,Wr).call(this,t.shader),r=new dr(V(this,U,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,void 0,!1,t.glslVersion),t.persistent&&r.registerBufferUniform(`backbuffer`),i=void 0}n.push(e);let a={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`&&(a[e]=n);V(this,G,`f`).push({pass:r,target:i,generators:a})}for(let e of r)e.target&&V(this,gr,`f`).set(e.target,void 0);let i=V(this,G,`f`).map(e=>e.target).filter(e=>e!==void 0);for(let e=0;e<V(this,G,`f`).length;e++)for(let t of i)n[e].match(RegExp(`uniform\\s+sampler2D\\s+${t}\\b`))&&V(this,G,`f`)[e].pass.registerBufferUniform(t)},qr=function(e,t){e.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified on post-effect; `effect` takes precedence.");let n=Array.isArray(t)?[...t]:[t];V(this,H,`m`,Br).call(this,n);let r=Qt(()=>{let e=V(this,K,`f`);if(!e)throw Error(`[VFX-JS] post-effect chain active without target`);return e.texture},()=>V(this,K,`f`)?.width??0,()=>V(this,K,`f`)?.height??0),i={autoCrop:!0,glslVersion:e.glslVersion??`300 es`},a=new An(V(this,U,`f`),V(this,hr,`f`),V(this,J,`f`),n,i,r,!0);if(e.uniforms)for(let[t,n]of Object.entries(e.uniforms))typeof n==`function`?(V(this,br,`f`)[t]=n,V(this,yr,`f`)[t]=n()):V(this,yr,`f`)[t]=n;B(this,q,a,`f`),B(this,xr,Date.now()/1e3,`f`),a.initAll().then(()=>{V(this,q,`f`)===a&&B(this,_r,!0,`f`)}).catch(e=>{console.error(`[VFX-JS] Post-effect init failed; post-effect disabled:`,e),V(this,q,`f`)===a&&(V(this,H,`m`,Vr).call(this,V(this,q,`f`).effects),V(this,q,`f`).dispose(),B(this,q,null,`f`),B(this,_r,!1,`f`))})},Jr=function(e,t){let n=V(this,q,`f`);if(!n)return;let r=V(this,J,`f`),i={...V(this,yr,`f`)};for(let[e,t]of Object.entries(V(this,br,`f`)))i[e]=t();let a=V(this,X,`f`).right-V(this,X,`f`).left,o=V(this,X,`f`).bottom-V(this,X,`f`).top,s=t-V(this,xr,`f`);B(this,xr,t,`f`);let c=[a,o],l=[a*r,o*r],u={x:e.x*r,y:e.y*r,w:e.w*r,h:e.h*r};n.run({time:t-V(this,Cr,`f`),deltaTime:s,mouse:[V(this,Or,`f`)*r,V(this,kr,`f`)*r],mouseViewport:[V(this,Or,`f`)*r,V(this,kr,`f`)*r],intersection:1,enterTime:0,leaveTime:0,resolvedUniforms:i,canvasSize:c,canvasBufferSize:l,elementSize:c,elementBufferSize:l,elementRectOnCanvasPx:u,finalTarget:null,isVisible:!0})},Yr=function(e,t){if(!V(this,K,`f`))return;let n=V(this,K,`f`).texture,r=new Map;for(let{pass:e,target:t}of V(this,G,`f`))t&&e.backbuffer&&r.set(t,e.backbuffer.texture);for(let i=0;i<V(this,G,`f`).length;i++){let{pass:a,target:o,generators:s}=V(this,G,`f`)[i],c=i===V(this,G,`f`).length-1,l=V(this,Or,`f`)+V(this,Er,`f`),u=V(this,kr,`f`)+V(this,Dr,`f`),d=a.size;if(d){let[r,i]=d;a.uniforms.src.value=n,a.uniforms.resolution.value.set(r,i),a.uniforms.offset.value.set(0,0),a.uniforms.time.value=t-V(this,Cr,`f`),a.uniforms.mouse.value.set(l/e.w*r,u/e.h*i)}else a.setUniforms(n,V(this,J,`f`),e,t-V(this,Cr,`f`),l,u);a.uniforms.passIndex.value=i,a.updateCustomUniforms(s);for(let[e,t]of r){let n=a.uniforms[e];n&&(n.value=t)}if(c)a.backbuffer?(a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture),V(this,H,`m`,Z).call(this,a.pass,a.backbuffer.target,e,a.uniforms,!0),a.backbuffer.swap(),V(this,W,`f`).setUniforms(a.backbuffer.texture,V(this,J,`f`),e),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,null,e,V(this,W,`f`).uniforms,!1)):V(this,H,`m`,Z).call(this,a.pass,null,e,a.uniforms,!1);else if(a.backbuffer){a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture);let t=d?Se(0,0,d[0]/V(this,J,`f`),d[1]/V(this,J,`f`)):e;V(this,H,`m`,Z).call(this,a.pass,a.backbuffer.target,t,a.uniforms,!0),a.backbuffer.swap(),n=a.backbuffer.texture,o&&r.set(o,a.backbuffer.texture)}else{let t=o??`postEffect${i}`,s=V(this,gr,`f`).get(t),c=d?d[0]:e.w*V(this,J,`f`),l=d?d[1]:e.h*V(this,J,`f`);(!s||s.width!==c||s.height!==l)&&(s?.dispose(),s=rr(V(this,U,`f`),c,l,{float:a.float}),V(this,gr,`f`).set(t,s));let u=d?Se(0,0,d[0]/V(this,J,`f`),d[1]/V(this,J,`f`)):e;V(this,H,`m`,Z).call(this,a.pass,s,u,a.uniforms,!0),n=s.texture,o&&r.set(o,s.texture)}}},Xr=function(e,t){let n=e*V(this,J,`f`),r=t*V(this,J,`f`);(!V(this,K,`f`)||V(this,K,`f`).width!==n||V(this,K,`f`).height!==r)&&(V(this,K,`f`)?.dispose(),B(this,K,rr(V(this,U,`f`),n,r),`f`));for(let{pass:n}of V(this,G,`f`))n.persistent&&!n.backbuffer?n.initializeBackbuffer(V(this,U,`f`),e,t,V(this,J,`f`)):n.backbuffer&&n.resizeBackbuffer(e,t)};function $r(e,t){return t.left<=e.right&&t.right>=e.left&&t.top<=e.bottom&&t.bottom>=e.top}function ei(e,t,n,r){return r===0?$r(e,t):n>=r}function ti(e){return e===!0?[!0,rn]:e===void 0?[!1,rn]:[!1,nn(e)]}function ni(e){return{threshold:e?.threshold??0,rootMargin:nn(e?.rootMargin??0)}}function ri(e,t){let n=e.source;if(!n)return 0;if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return t===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return t===`w`?n.videoWidth:n.videoHeight;let r=n;return t===`w`?r.width:r.height}function ii(e){return e===`repeat`?`repeat`:e===`mirror`?`mirror`:`clamp`}function ai(e){if(!e)return[`clamp`,`clamp`];if(Array.isArray(e))return[ii(e[0]),ii(e[1])];let t=ii(e);return[t,t]}function oi(e,t,n){return Math.max(t,Math.min(n,e))}function si(){try{let e=document.createElement(`canvas`);return(e.getContext(`webgl2`)||e.getContext(`webgl`))!==null}catch{return!1}}var ci=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Q=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},li,$,ui,di,fi,pi,mi,hi;function gi(){if(typeof window>`u`)throw`Cannot find 'window'. VFX-JS only runs on the browser.`;if(typeof document>`u`)throw`Cannot find 'document'. VFX-JS only runs on the browser.`}function _i(e){return{position:e?`fixed`:`absolute`,top:0,left:0,width:`0px`,height:`0px`,"z-index":9999,"pointer-events":`none`}}var vi=class e{static init(t){try{return new e(t)}catch{return null}}constructor(e={}){if(li.add(this),$.set(this,void 0),ui.set(this,void 0),di.set(this,new Map),gi(),!si())throw Error(`[VFX-JS] WebGL is not available in this environment.`);let t=ne(e),n=document.createElement(`canvas`),r=_i(t.fixedCanvas);for(let[e,t]of Object.entries(r))n.style.setProperty(e,t.toString());t.zIndex!==void 0&&n.style.setProperty(`z-index`,t.zIndex.toString()),(t.wrapper??document.body).appendChild(n),ci(this,ui,n,`f`),ci(this,$,new Qr(t,n),`f`),t.autoplay&&Q(this,$,`f`).play()}async add(e,t,n){e instanceof HTMLImageElement?await Q(this,li,`m`,fi).call(this,e,t):e instanceof HTMLVideoElement?await Q(this,li,`m`,pi).call(this,e,t):e instanceof HTMLCanvasElement?e.hasAttribute(`layoutsubtree`)&&n?await Q(this,$,`f`).addElement(e,t,n):await Q(this,li,`m`,mi).call(this,e,t):await Q(this,li,`m`,hi).call(this,e,t)}updateHICTexture(e,t){Q(this,$,`f`).updateHICTexture(e,t)}get maxTextureSize(){return Q(this,$,`f`).maxTextureSize}async addHTML(e,t){if(!S())return console.warn(`html-in-canvas not supported, falling back to dom-to-canvas`),this.add(e,t);t.overlay!==void 0&&console.warn(`addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.`);let{overlay:n,...r}=t,i=Q(this,di,`f`).get(e);i&&Q(this,$,`f`).removeElement(i);let{canvas:a,initialCapture:o}=await te(e,{onCapture:e=>{Q(this,$,`f`).updateHICTexture(a,e)},maxSize:Q(this,$,`f`).maxTextureSize});i=a,Q(this,di,`f`).set(e,i),await Q(this,$,`f`).addElement(i,r,o)}remove(e){let t=Q(this,di,`f`).get(e);t?(b(t,e),Q(this,di,`f`).delete(e),Q(this,$,`f`).removeElement(t)):Q(this,$,`f`).removeElement(e)}async update(e){let t=Q(this,di,`f`).get(e);if(t){t.requestPaint();return}if(e instanceof HTMLCanvasElement){Q(this,$,`f`).updateCanvasElement(e);return}else return Q(this,$,`f`).updateTextElement(e)}play(){Q(this,$,`f`).play()}stop(){Q(this,$,`f`).stop()}render(){Q(this,$,`f`).render()}destroy(){for(let[e,t]of Q(this,di,`f`))b(t,e);Q(this,di,`f`).clear(),Q(this,$,`f`).destroy(),Q(this,ui,`f`).remove()}};$=new WeakMap,ui=new WeakMap,di=new WeakMap,li=new WeakSet,fi=function(e,t){return e.complete?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`load`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},pi=function(e,t){return e.readyState>=3?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`canplay`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},mi=function(e,t){return Q(this,$,`f`).addElement(e,t)},hi=function(e,t){return Q(this,$,`f`).addElement(e,t)};var yi=e(t(((e,t)=>{var n=function(e){var t=/(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i,n=0,r={},i={manual:e.Prism&&e.Prism.manual,disableWorkerMessageHandler:e.Prism&&e.Prism.disableWorkerMessageHandler,util:{encode:function e(t){return t instanceof a?new a(t.type,e(t.content),t.alias):Array.isArray(t)?t.map(e):t.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/\u00a0/g,` `)},type:function(e){return Object.prototype.toString.call(e).slice(8,-1)},objId:function(e){return e.__id||Object.defineProperty(e,`__id`,{value:++n}),e.__id},clone:function e(t,n){n||={};var r,a;switch(i.util.type(t)){case`Object`:if(a=i.util.objId(t),n[a])return n[a];for(var o in r={},n[a]=r,t)t.hasOwnProperty(o)&&(r[o]=e(t[o],n));return r;case`Array`:return a=i.util.objId(t),n[a]?n[a]:(r=[],n[a]=r,t.forEach(function(t,i){r[i]=e(t,n)}),r);default:return t}},getLanguage:function(e){for(;e;){var n=t.exec(e.className);if(n)return n[1].toLowerCase();e=e.parentElement}return`none`},setLanguage:function(e,n){e.className=e.className.replace(RegExp(t,`gi`),``),e.classList.add(`language-`+n)},currentScript:function(){if(typeof document>`u`)return null;if(document.currentScript&&document.currentScript.tagName===`SCRIPT`)return document.currentScript;try{throw Error()}catch(r){var e=(/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(r.stack)||[])[1];if(e){var t=document.getElementsByTagName(`script`);for(var n in t)if(t[n].src==e)return t[n]}return null}},isActive:function(e,t,n){for(var r=`no-`+t;e;){var i=e.classList;if(i.contains(t))return!0;if(i.contains(r))return!1;e=e.parentElement}return!!n}},languages:{plain:r,plaintext:r,text:r,txt:r,extend:function(e,t){var n=i.util.clone(i.languages[e]);for(var r in t)n[r]=t[r];return n},insertBefore:function(e,t,n,r){r||=i.languages;var a=r[e],o={};for(var s in a)if(a.hasOwnProperty(s)){if(s==t)for(var c in n)n.hasOwnProperty(c)&&(o[c]=n[c]);n.hasOwnProperty(s)||(o[s]=a[s])}var l=r[e];return r[e]=o,i.languages.DFS(i.languages,function(t,n){n===l&&t!=e&&(this[t]=o)}),o},DFS:function e(t,n,r,a){a||={};var o=i.util.objId;for(var s in t)if(t.hasOwnProperty(s)){n.call(t,s,t[s],r||s);var c=t[s],l=i.util.type(c);l===`Object`&&!a[o(c)]?(a[o(c)]=!0,e(c,n,null,a)):l===`Array`&&!a[o(c)]&&(a[o(c)]=!0,e(c,n,s,a))}}},plugins:{},highlightAll:function(e,t){i.highlightAllUnder(document,e,t)},highlightAllUnder:function(e,t,n){var r={callback:n,container:e,selector:`code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code`};i.hooks.run(`before-highlightall`,r),r.elements=Array.prototype.slice.apply(r.container.querySelectorAll(r.selector)),i.hooks.run(`before-all-elements-highlight`,r);for(var a=0,o;o=r.elements[a++];)i.highlightElement(o,t===!0,r.callback)},highlightElement:function(t,n,r){var a=i.util.getLanguage(t),o=i.languages[a];i.util.setLanguage(t,a);var s=t.parentElement;s&&s.nodeName.toLowerCase()===`pre`&&i.util.setLanguage(s,a);var c={element:t,language:a,grammar:o,code:t.textContent};function l(e){c.highlightedCode=e,i.hooks.run(`before-insert`,c),c.element.innerHTML=c.highlightedCode,i.hooks.run(`after-highlight`,c),i.hooks.run(`complete`,c),r&&r.call(c.element)}if(i.hooks.run(`before-sanity-check`,c),s=c.element.parentElement,s&&s.nodeName.toLowerCase()===`pre`&&!s.hasAttribute(`tabindex`)&&s.setAttribute(`tabindex`,`0`),!c.code){i.hooks.run(`complete`,c),r&&r.call(c.element);return}if(i.hooks.run(`before-highlight`,c),!c.grammar){l(i.util.encode(c.code));return}if(n&&e.Worker){var u=new Worker(i.filename);u.onmessage=function(e){l(e.data)},u.postMessage(JSON.stringify({language:c.language,code:c.code,immediateClose:!0}))}else l(i.highlight(c.code,c.grammar,c.language))},highlight:function(e,t,n){var r={code:e,grammar:t,language:n};if(i.hooks.run(`before-tokenize`,r),!r.grammar)throw Error(`The language "`+r.language+`" has no grammar.`);return r.tokens=i.tokenize(r.code,r.grammar),i.hooks.run(`after-tokenize`,r),a.stringify(i.util.encode(r.tokens),r.language)},tokenize:function(e,t){var n=t.rest;if(n){for(var r in n)t[r]=n[r];delete t.rest}var i=new c;return l(i,i.head,e),s(e,i,t,i.head,0),d(i)},hooks:{all:{},add:function(e,t){var n=i.hooks.all;n[e]=n[e]||[],n[e].push(t)},run:function(e,t){var n=i.hooks.all[e];if(!(!n||!n.length))for(var r=0,a;a=n[r++];)a(t)}},Token:a};e.Prism=i;function a(e,t,n,r){this.type=e,this.content=t,this.alias=n,this.length=(r||``).length|0}a.stringify=function e(t,n){if(typeof t==`string`)return t;if(Array.isArray(t)){var r=``;return t.forEach(function(t){r+=e(t,n)}),r}var a={type:t.type,content:e(t.content,n),tag:`span`,classes:[`token`,t.type],attributes:{},language:n},o=t.alias;o&&(Array.isArray(o)?Array.prototype.push.apply(a.classes,o):a.classes.push(o)),i.hooks.run(`wrap`,a);var s=``;for(var c in a.attributes)s+=` `+c+`="`+(a.attributes[c]||``).replace(/"/g,`&quot;`)+`"`;return`<`+a.tag+` class="`+a.classes.join(` `)+`"`+s+`>`+a.content+`</`+a.tag+`>`};function o(e,t,n,r){e.lastIndex=t;var i=e.exec(n);if(i&&r&&i[1]){var a=i[1].length;i.index+=a,i[0]=i[0].slice(a)}return i}function s(e,t,n,r,c,d){for(var f in n)if(!(!n.hasOwnProperty(f)||!n[f])){var p=n[f];p=Array.isArray(p)?p:[p];for(var m=0;m<p.length;++m){if(d&&d.cause==f+`,`+m)return;var h=p[m],g=h.inside,_=!!h.lookbehind,v=!!h.greedy,y=h.alias;if(v&&!h.pattern.global){var ee=h.pattern.toString().match(/[imsuy]*$/)[0];h.pattern=RegExp(h.pattern.source,ee+`g`)}for(var te=h.pattern||h,b=r.next,x=c;b!==t.tail&&!(d&&x>=d.reach);x+=b.value.length,b=b.next){var S=b.value;if(t.length>e.length)return;if(!(S instanceof a)){var ne=1,C;if(v){if(C=o(te,x,e,_),!C||C.index>=e.length)break;var w=C.index,re=C.index+C[0].length,ie=x;for(ie+=b.value.length;w>=ie;)b=b.next,ie+=b.value.length;if(ie-=b.value.length,x=ie,b.value instanceof a)continue;for(var ae=b;ae!==t.tail&&(ie<re||typeof ae.value==`string`);ae=ae.next)ne++,ie+=ae.value.length;ne--,S=e.slice(x,ie),C.index-=x}else if(C=o(te,0,S,_),!C)continue;var w=C.index,oe=C[0],se=S.slice(0,w),ce=S.slice(w+oe.length),le=x+S.length;d&&le>d.reach&&(d.reach=le);var ue=b.prev;se&&(ue=l(t,ue,se),x+=se.length),u(t,ue,ne);var T=new a(f,g?i.tokenize(oe,g):oe,y,oe);if(b=l(t,ue,T),ce&&l(t,b,ce),ne>1){var de={cause:f+`,`+m,reach:le};s(e,t,n,b.prev,x,de),d&&de.reach>d.reach&&(d.reach=de.reach)}}}}}}function c(){var e={value:null,prev:null,next:null},t={value:null,prev:e,next:null};e.next=t,this.head=e,this.tail=t,this.length=0}function l(e,t,n){var r=t.next,i={value:n,prev:t,next:r};return t.next=i,r.prev=i,e.length++,i}function u(e,t,n){for(var r=t.next,i=0;i<n&&r!==e.tail;i++)r=r.next;t.next=r,r.prev=t,e.length-=i}function d(e){for(var t=[],n=e.head.next;n!==e.tail;)t.push(n.value),n=n.next;return t}if(!e.document)return e.addEventListener&&(i.disableWorkerMessageHandler||e.addEventListener(`message`,function(t){var n=JSON.parse(t.data),r=n.language,a=n.code,o=n.immediateClose;e.postMessage(i.highlight(a,i.languages[r],r)),o&&e.close()},!1)),i;var f=i.util.currentScript();f&&(i.filename=f.src,f.hasAttribute(`data-manual`)&&(i.manual=!0));function p(){i.manual||i.highlightAll()}if(!i.manual){var m=document.readyState;m===`loading`||m===`interactive`&&f&&f.defer?document.addEventListener(`DOMContentLoaded`,p):window.requestAnimationFrame?window.requestAnimationFrame(p):window.setTimeout(p,16)}return i}(typeof window<`u`?window:typeof WorkerGlobalScope<`u`&&self instanceof WorkerGlobalScope?self:{});t!==void 0&&t.exports&&(t.exports=n),typeof global<`u`&&(global.Prism=n),n.languages.markup={comment:{pattern:/<!--(?:(?!<!--)[\s\S])*?-->/,greedy:!0},prolog:{pattern:/<\?[\s\S]+?\?>/,greedy:!0},doctype:{pattern:/<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,greedy:!0,inside:{"internal-subset":{pattern:/(^[^\[]*\[)[\s\S]+(?=\]>$)/,lookbehind:!0,greedy:!0,inside:null},string:{pattern:/"[^"]*"|'[^']*'/,greedy:!0},punctuation:/^<!|>$|[[\]]/,"doctype-tag":/^DOCTYPE/i,name:/[^\s<>'"]+/}},cdata:{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,greedy:!0},tag:{pattern:/<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,greedy:!0,inside:{tag:{pattern:/^<\/?[^\s>\/]+/,inside:{punctuation:/^<\/?/,namespace:/^[^\s>\/:]+:/}},"special-attr":[],"attr-value":{pattern:/=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,inside:{punctuation:[{pattern:/^=/,alias:`attr-equals`},{pattern:/^(\s*)["']|["']$/,lookbehind:!0}]}},punctuation:/\/?>/,"attr-name":{pattern:/[^\s>\/]+/,inside:{namespace:/^[^\s>\/:]+:/}}}},entity:[{pattern:/&[\da-z]{1,8};/i,alias:`named-entity`},/&#x?[\da-f]{1,8};/i]},n.languages.markup.tag.inside[`attr-value`].inside.entity=n.languages.markup.entity,n.languages.markup.doctype.inside[`internal-subset`].inside=n.languages.markup,n.hooks.add(`wrap`,function(e){e.type===`entity`&&(e.attributes.title=e.content.replace(/&amp;/,`&`))}),Object.defineProperty(n.languages.markup.tag,`addInlined`,{value:function(e,t){var r={};r[`language-`+t]={pattern:/(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,lookbehind:!0,inside:n.languages[t]},r.cdata=/^<!\[CDATA\[|\]\]>$/i;var i={"included-cdata":{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,inside:r}};i[`language-`+t]={pattern:/[\s\S]+/,inside:n.languages[t]};var a={};a[e]={pattern:RegExp(`(<__[^>]*>)(?:<!\\[CDATA\\[(?:[^\\]]|\\](?!\\]>))*\\]\\]>|(?!<!\\[CDATA\\[)[\\s\\S])*?(?=<\\/__>)`.replace(/__/g,function(){return e}),`i`),lookbehind:!0,greedy:!0,inside:i},n.languages.insertBefore(`markup`,`cdata`,a)}}),Object.defineProperty(n.languages.markup.tag,`addAttribute`,{value:function(e,t){n.languages.markup.tag.inside[`special-attr`].push({pattern:RegExp(`(^|["'\\s])(?:`+e+`)\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s'">=]+(?=[\\s>]))`,`i`),lookbehind:!0,inside:{"attr-name":/^[^\s=]+/,"attr-value":{pattern:/=[\s\S]+/,inside:{value:{pattern:/(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,lookbehind:!0,alias:[t,`language-`+t],inside:n.languages[t]},punctuation:[{pattern:/^=/,alias:`attr-equals`},/"|'/]}}}})}}),n.languages.html=n.languages.markup,n.languages.mathml=n.languages.markup,n.languages.svg=n.languages.markup,n.languages.xml=n.languages.extend(`markup`,{}),n.languages.ssml=n.languages.xml,n.languages.atom=n.languages.xml,n.languages.rss=n.languages.xml,(function(e){var t=/(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;e.languages.css={comment:/\/\*[\s\S]*?\*\//,atrule:{pattern:RegExp(`@[\\w-](?:[^;{\\s"']|\\s+(?!\\s)|`+t.source+`)*?(?:;|(?=\\s*\\{))`),inside:{rule:/^@[\w-]+/,"selector-function-argument":{pattern:/(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,lookbehind:!0,alias:`selector`},keyword:{pattern:/(^|[^\w-])(?:and|not|only|or)(?![\w-])/,lookbehind:!0}}},url:{pattern:RegExp(`\\burl\\((?:`+t.source+`|(?:[^\\\\\\r\\n()"']|\\\\[\\s\\S])*)\\)`,`i`),greedy:!0,inside:{function:/^url/i,punctuation:/^\(|\)$/,string:{pattern:RegExp(`^`+t.source+`$`),alias:`url`}}},selector:{pattern:RegExp(`(^|[{}\\s])[^{}\\s](?:[^{};"'\\s]|\\s+(?![\\s{])|`+t.source+`)*(?=\\s*\\{)`),lookbehind:!0},string:{pattern:t,greedy:!0},property:{pattern:/(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,lookbehind:!0},important:/!important\b/i,function:{pattern:/(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,lookbehind:!0},punctuation:/[(){};:,]/},e.languages.css.atrule.inside.rest=e.languages.css;var n=e.languages.markup;n&&(n.tag.addInlined(`style`,`css`),n.tag.addAttribute(`style`,`css`))})(n),n.languages.clike={comment:[{pattern:/(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,lookbehind:!0,greedy:!0},{pattern:/(^|[^\\:])\/\/.*/,lookbehind:!0,greedy:!0}],string:{pattern:/(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,greedy:!0},"class-name":{pattern:/(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,lookbehind:!0,inside:{punctuation:/[.\\]/}},keyword:/\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,boolean:/\b(?:false|true)\b/,function:/\b\w+(?=\()/,number:/\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,operator:/[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,punctuation:/[{}[\];(),.:]/},n.languages.javascript=n.languages.extend(`clike`,{"class-name":[n.languages.clike[`class-name`],{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,lookbehind:!0}],keyword:[{pattern:/((?:^|\})\s*)catch\b/,lookbehind:!0},{pattern:/(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,lookbehind:!0}],function:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,number:{pattern:RegExp(`(^|[^\\w$])(?:NaN|Infinity|0[bB][01]+(?:_[01]+)*n?|0[oO][0-7]+(?:_[0-7]+)*n?|0[xX][\\dA-Fa-f]+(?:_[\\dA-Fa-f]+)*n?|\\d+(?:_\\d+)*n|(?:\\d+(?:_\\d+)*(?:\\.(?:\\d+(?:_\\d+)*)?)?|\\.\\d+(?:_\\d+)*)(?:[Ee][+-]?\\d+(?:_\\d+)*)?)(?![\\w$])`),lookbehind:!0},operator:/--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/}),n.languages.javascript[`class-name`][0].pattern=/(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/,n.languages.insertBefore(`javascript`,`keyword`,{regex:{pattern:RegExp(`((?:^|[^$\\w\\xA0-\\uFFFF."'\\])\\s]|\\b(?:return|yield))\\s*)\\/(?:(?:\\[(?:[^\\]\\\\\\r\\n]|\\\\.)*\\]|\\\\.|[^/\\\\\\[\\r\\n])+\\/[dgimyus]{0,7}|(?:\\[(?:[^[\\]\\\\\\r\\n]|\\\\.|\\[(?:[^[\\]\\\\\\r\\n]|\\\\.|\\[(?:[^[\\]\\\\\\r\\n]|\\\\.)*\\])*\\])*\\]|\\\\.|[^/\\\\\\[\\r\\n])+\\/[dgimyus]{0,7}v[dgimyus]{0,7})(?=(?:\\s|\\/\\*(?:[^*]|\\*(?!\\/))*\\*\\/)*(?:$|[\\r\\n,.;:})\\]]|\\/\\/))`),lookbehind:!0,greedy:!0,inside:{"regex-source":{pattern:/^(\/)[\s\S]+(?=\/[a-z]*$)/,lookbehind:!0,alias:`language-regex`,inside:n.languages.regex},"regex-delimiter":/^\/|\/$/,"regex-flags":/^[a-z]+$/}},"function-variable":{pattern:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,alias:`function`},parameter:[{pattern:/(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,lookbehind:!0,inside:n.languages.javascript},{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,lookbehind:!0,inside:n.languages.javascript},{pattern:/(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,lookbehind:!0,inside:n.languages.javascript},{pattern:/((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,lookbehind:!0,inside:n.languages.javascript}],constant:/\b[A-Z](?:[A-Z_]|\dx?)*\b/}),n.languages.insertBefore(`javascript`,`string`,{hashbang:{pattern:/^#!.*/,greedy:!0,alias:`comment`},"template-string":{pattern:/`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,greedy:!0,inside:{"template-punctuation":{pattern:/^`|`$/,alias:`string`},interpolation:{pattern:/((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,lookbehind:!0,inside:{"interpolation-punctuation":{pattern:/^\$\{|\}$/,alias:`punctuation`},rest:n.languages.javascript}},string:/[\s\S]+/}},"string-property":{pattern:/((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,lookbehind:!0,greedy:!0,alias:`property`}}),n.languages.insertBefore(`javascript`,`operator`,{"literal-property":{pattern:/((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,lookbehind:!0,alias:`property`}}),n.languages.markup&&(n.languages.markup.tag.addInlined(`script`,`javascript`),n.languages.markup.tag.addAttribute(`on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)`,`javascript`)),n.languages.js=n.languages.javascript,(function(){if(n===void 0||typeof document>`u`)return;Element.prototype.matches||(Element.prototype.matches=Element.prototype.msMatchesSelector||Element.prototype.webkitMatchesSelector);var e=`Loading…`,t=function(e,t){return`✖ Error `+e+` while fetching file: `+t},r=`✖ Error: File does not exist or is empty`,i={js:`javascript`,py:`python`,rb:`ruby`,ps1:`powershell`,psm1:`powershell`,sh:`bash`,bat:`batch`,h:`c`,tex:`latex`},a=`data-src-status`,o=`loading`,s=`loaded`,c=`failed`,l=`pre[data-src]:not([`+a+`="`+s+`"]):not([`+a+`="`+o+`"])`;function u(e,n,i){var a=new XMLHttpRequest;a.open(`GET`,e,!0),a.onreadystatechange=function(){a.readyState==4&&(a.status<400&&a.responseText?n(a.responseText):a.status>=400?i(t(a.status,a.statusText)):i(r))},a.send(null)}function d(e){var t=/^\s*(\d+)\s*(?:(,)\s*(?:(\d+)\s*)?)?$/.exec(e||``);if(t){var n=Number(t[1]),r=t[2],i=t[3];return r?i?[n,Number(i)]:[n,void 0]:[n,n]}}n.hooks.add(`before-highlightall`,function(e){e.selector+=`, `+l}),n.hooks.add(`before-sanity-check`,function(t){var r=t.element;if(r.matches(l)){t.code=``,r.setAttribute(a,o);var f=r.appendChild(document.createElement(`CODE`));f.textContent=e;var p=r.getAttribute(`data-src`),m=t.language;if(m===`none`){var h=(/\.(\w+)$/.exec(p)||[,`none`])[1];m=i[h]||h}n.util.setLanguage(f,m),n.util.setLanguage(r,m);var g=n.plugins.autoloader;g&&g.loadLanguages(m),u(p,function(e){r.setAttribute(a,s);var t=d(r.getAttribute(`data-range`));if(t){var i=e.split(/\r\n?|\n/g),o=t[0],c=t[1]==null?i.length:t[1];o<0&&(o+=i.length),o=Math.max(0,Math.min(o-1,i.length)),c<0&&(c+=i.length),c=Math.max(0,Math.min(c,i.length)),e=i.slice(o,c).join(`
`),r.hasAttribute(`data-start`)||r.setAttribute(`data-start`,String(o+1))}f.textContent=e,n.highlightElement(f)},function(e){r.setAttribute(a,c),f.textContent=e})}}),n.plugins.fileHighlight={highlight:function(e){for(var t=(e||document).querySelectorAll(l),r=0,i;i=t[r++];)n.highlightElement(i)}};var f=!1;n.fileHighlight=function(){f||=(console.warn("Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead."),!0),n.plugins.fileHighlight.highlight.apply(this,arguments)}})()}))(),1);yi.default.manual=!0,yi.default.highlightAll();function bi(e,t){return(t??document).querySelector(e)}function xi(e,t,n){return e*(1-n)+t*n}var Si={logo:`
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
    `},Ci=class{vfx=new vi({pixelRatio:window.devicePixelRatio,zIndex:-1});vfx2=new vi({pixelRatio:1,zIndex:-2,scrollPadding:!1});async initBG(){let e=bi(`#BG`),t=0;function n(e,t,n){return e*(1-n)+t*n}function r(){t=n(t,window.scrollY,.03),e.style.setProperty(`transform`,`translateY(-${t*.1}px)`),requestAnimationFrame(r)}r(),await this.vfx2.add(e,{shader:Si.blob})}async initVFX(){await Promise.all(Array.from(document.querySelectorAll(`*[data-shader]`)).map(e=>{let t=e.getAttribute(`data-shader`),n=e.getAttribute(`data-uniforms`),r=n?JSON.parse(n):void 0;return this.vfx.add(e,{shader:t,overflow:Number.parseFloat(e.getAttribute(`data-overflow`)??`0`),uniforms:r,intersection:{threshold:Number.parseFloat(e.getAttribute(`data-threshold`)??`0`)}})}))}async initDiv(){let e=bi(`#div`);await this.vfx.add(e,{shader:`rgbShift`,overflow:100});for(let t of e.querySelectorAll(`input,textarea`))t.addEventListener(`input`,()=>this.vfx.update(e));let t=bi(`textarea`,e);new MutationObserver(()=>this.vfx.update(e)).observe(t,{attributes:!0})}async initCanvas(){let e=document.getElementById(`canvas`),t=e.getContext(`2d`);if(!t)throw`Failed to get the canvas context`;let{width:n,height:r}=e.getBoundingClientRect(),i=window.devicePixelRatio??1;e.width=n*i,e.height=r*i,t.scale(i,i);let a=[n/2,r/2],o=a,s=[o],c=!1,l=Date.now();e.addEventListener(`mousemove`,e=>{c=!0,a=[e.offsetX,e.offsetY]}),e.addEventListener(`mouseleave`,e=>{c=!1});let u=!1;new IntersectionObserver(e=>{for(let t of e)u=t.intersectionRatio>.1},{threshold:[0,1,.2,.8]}).observe(e);let d=()=>{if(requestAnimationFrame(d),u){if(!c){let e=Date.now()/1e3-l;a=[n*.5+Math.sin(e*1.3)*n*.3,r*.5+Math.sin(e*1.7)*r*.3]}o=[xi(o[0],a[0],.1),xi(o[1],a[1],.1)],s.push(o),s.splice(0,s.length-30),t.clearRect(0,0,n,r),t.fillStyle=`black`,t.fillRect(0,0,n,r),t.fillStyle=`white`,t.font=`bold ${n*.14}px sans-serif`,t.fillText(`HOVER ME`,n/2,r/2),t.textBaseline=`middle`,t.textAlign=`center`;for(let e=0;e<s.length;e++){let[n,r]=s[e],i=e/s.length*255;t.fillStyle=`rgba(${255-i}, 255, ${i}, ${e/s.length*.5+.5})`,t.beginPath(),t.arc(n,r,e+20,0,2*Math.PI),t.fill()}this.vfx.update(e)}};d(),await this.vfx.add(e,{shader:Si.canvas})}async initCustomShader(){let e=bi(`#custom`);await this.vfx.add(e,{shader:Si.custom,uniforms:{scroll:()=>window.scrollY/window.innerHeight}})}async initMultipass(){let e=bi(`#multipass`);await this.vfx.add(e,{shader:[{frag:`
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
                    `}]})}hideMask(){bi(`#MaskTop`).style.setProperty(`height`,`0`),bi(`#MaskBottom`).style.setProperty(`opacity`,`0`)}async showLogo(){let e=bi(`#Logo`),t=bi(`#LogoTagline`);return Promise.all([this.vfx.add(e,{shader:Si.logo,overflow:[0,3e3,0,100],uniforms:{delay:0},intersection:{threshold:1}}),this.vfx.add(t,{shader:Si.logo,overflow:[0,3e3,0,1e3],uniforms:{delay:.3},intersection:{threshold:1}})])}async showProfile(){let e=bi(`#profile`);await this.vfx.add(e,{shader:Si.logo,overflow:[0,3e3,0,2e3],uniforms:{delay:.5},intersection:{rootMargin:[-100,0,-100,0],threshold:1}})}};window.addEventListener(`load`,async()=>{let e=new Ci;await e.initBG(),await Promise.all([await e.initVFX(),e.initDiv(),e.initCanvas(),e.initCustomShader(),e.initMultipass()]),e.hideMask(),setTimeout(()=>{e.showLogo(),e.showProfile()},2e3)});
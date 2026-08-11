var e=`
precision highp float;
in vec3 position;
void main() {
    gl_Position = vec4(position, 1.0);
}
`,t=`
precision highp float;
attribute vec3 position;
void main() {
    gl_Position = vec4(position, 1.0);
}
`,n=`
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
`,r=`precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform bool autoCrop;
uniform sampler2D src;
out vec4 outColor;
`,i=`vec4 readTex(sampler2D tex, vec2 uv) {
    if (autoCrop && (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.)) {
        return vec4(0);
    }
    return texture(tex, uv);
}`,a={none:n,uvGradient:`
    ${r}
    ${i}

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        outColor = vec4(uv, sin(time) * .5 + .5, 1);

        vec4 img = readTex(src, uv);
        outColor *= smoothstep(0., 1., img.a);
    }
    `,rainbow:`
    ${r}
    ${i}

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
    ${r}
    ${i}

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
    ${r}
    ${i}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        float b = sin(time * 2.) * 32. + 48.;
        uv = floor(uv * b) / b;
        outColor = readTex(src, uv);
    }
    `,rgbGlitch:`
    ${r}
    ${i}

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
    ${r}
    ${i}

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

    ${r}
    ${i}

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
    ${r}
    ${i}

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
    ${r}
    ${i}

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
    ${r}
    ${i}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        outColor = readTex(src, uv) * (sin(time * 5.) * 0.2 + 0.8);
    }

    `,spring:`
    ${r}
    ${i}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        uv = (uv - .5) * (1.05 + sin(time * 5.) * 0.05) + .5;
        outColor = readTex(src, uv);
    }
    `,duotone:`
    ${r}
    ${i}

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
    ${r}
    ${i}

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
    ${r}
    ${i}

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
    ${r}
    uniform float enterTime;
    uniform float leaveTime;

    ${i}

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
    ${r}
    ${i}

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
    ${r}
    ${i}

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
    ${r}
    ${i}

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
    ${r}
    ${i}

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 color = readTex(src, uv);
        outColor = vec4(1.0 - color.rgb, color.a);
    }
    `,grayscale:`
    ${r}
    ${i}

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 color = readTex(src, uv);
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        outColor = vec4(vec3(gray), color.a);
    }
    `,vignette:`
    ${r}
    ${i}

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
    ${r}
    ${i}

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
    `};function o(e){return e.currentSrc||e.src}function s(e){let t=o(e);if(!t||t.startsWith(`data:`))return!1;try{return new URL(t,location.href).origin!==location.origin}catch{return!1}}async function c(e){let t=await(await fetch(e)).blob();return URL.createObjectURL(t)}async function l(e){let t=Array.from(e.querySelectorAll(`img`)).filter(e=>e.complete&&e.naturalWidth>0&&s(e));if(t.length===0)return()=>{};let n=new Map,r=[];return await Promise.all(t.map(async e=>{try{let t=o(e),i=await c(t);n.set(e,t),r.push(i),await new Promise(t=>{e.addEventListener(`load`,()=>t(),{once:!0}),e.src=i})}catch{}})),()=>{for(let[e,t]of n)e.src=t;for(let e of r)URL.revokeObjectURL(e)}}var u=[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`],d=[`position`,`top`,`right`,`bottom`,`left`,`float`,`flex`,`flex-grow`,`flex-shrink`,`flex-basis`,`align-self`,`justify-self`,`place-self`,`order`,`grid-column`,`grid-column-start`,`grid-column-end`,`grid-row`,`grid-row-start`,`grid-row-end`,`grid-area`],f=new WeakMap,p=new WeakMap,m=new WeakMap,h=new WeakMap,g=new WeakMap,ee=new WeakMap;async function _(e,t){let n=e.getContext(`2d`);if(!n)throw Error(`Failed to get 2d context from layoutsubtree canvas`);let{onCapture:r,maxSize:i}=t,a=null,o=null,s=new Promise(e=>{o=e});e.onpaint=()=>{let t=e.firstElementChild;if(!t||e.width===0||e.height===0)return;n.clearRect(0,0,e.width,e.height),n.drawElementImage(t,0,0);let s=e.width,c=e.height;if(i&&(s>i||c>i)){let e=Math.min(i/s,i/c);s=Math.floor(s*e),c=Math.floor(c*e)}(!a||a.width!==s||a.height!==c)&&(a=new OffscreenCanvas(s,c));let l=a.getContext(`2d`);if(l){if(l.clearRect(0,0,s,c),l.drawImage(e,0,0,s,c),n.clearRect(0,0,e.width,e.height),o){o(a),o=null;return}r(a)}};let c=new ResizeObserver(t=>{for(let n of t){let t=n.devicePixelContentBoxSize?.[0];if(t)e.width=t.inlineSize,e.height=t.blockSize;else{let t=n.borderBoxSize?.[0];if(t){let n=window.devicePixelRatio;e.width=Math.round(t.inlineSize*n),e.height=Math.round(t.blockSize*n)}}}e.requestPaint()});c.observe(e,{box:`device-pixel-content-box`}),f.set(e,c);let l=e.firstElementChild,u=``;if(l){let t=new ResizeObserver(t=>{let n=t[0].borderBoxSize?.[0];if(!n)return;let r=`${Math.round(n.blockSize)}px`;r!==u&&(u=r,e.style.setProperty(`height`,r))});t.observe(l),p.set(e,t)}return s}function v(e){e.onpaint=null;let t=f.get(e);t&&(t.disconnect(),f.delete(e));let n=p.get(e);n&&(n.disconnect(),p.delete(e))}async function te(e,t){let n=e.getBoundingClientRect(),r=document.createElement(`canvas`);r.setAttribute(`layoutsubtree`,``),r.className=e.className;let i=e.getAttribute(`style`);i&&r.setAttribute(`style`,i),r.style.setProperty(`padding`,`0`),r.style.setProperty(`border`,`none`),r.style.setProperty(`box-sizing`,`content-box`),r.style.setProperty(`background`,`transparent`);let a=getComputedStyle(e),o=a.display===`inline`?`block`:a.display;r.style.setProperty(`display`,o);for(let e of u)r.style.setProperty(e,a.getPropertyValue(e));for(let e of d)r.style.setProperty(e,a.getPropertyValue(e));e.style.width.endsWith(`px`)?r.style.setProperty(`width`,`${n.width}px`):r.style.setProperty(`width`,`100%`),r.style.height||r.style.setProperty(`height`,`${n.height}px`);let s=window.devicePixelRatio;r.width=Math.round(n.width*s),r.height=Math.round(n.height*s),m.set(e,e.style.margin),h.set(e,e.style.width),g.set(e,e.style.boxSizing),e.parentNode?.insertBefore(r,e),r.appendChild(e),e.style.setProperty(`margin`,`0`),e.style.setProperty(`width`,`100%`),e.style.setProperty(`box-sizing`,`border-box`);let c=await l(e);return ee.set(r,c),{canvas:r,initialCapture:await _(r,t)}}function ne(e,t){v(e);let n=ee.get(e);n&&(n(),ee.delete(e)),e.parentNode?.insertBefore(t,e),e.remove();let r=m.get(t);r!==void 0&&(t.style.margin=r,m.delete(t));let i=h.get(t);i!==void 0&&(t.style.width=i,h.delete(t));let a=g.get(t);a!==void 0&&(t.style.boxSizing=a,g.delete(t))}var y;function re(){if(y!==void 0)return y;try{let e=document.createElement(`canvas`),t=e.getContext(`2d`);y=t!==null&&typeof t.drawElementImage==`function`&&typeof e.requestPaint==`function`}catch{y=!1}return y}function ie(e){let t=typeof window<`u`?window.devicePixelRatio:1,n;n=e.scrollPadding===void 0?[.1,.1]:e.scrollPadding===!1?[0,0]:Array.isArray(e.scrollPadding)?[e.scrollPadding[0]??.1,e.scrollPadding[1]??.1]:[e.scrollPadding,e.scrollPadding];let r;return r=e.postEffect===void 0?[]:Array.isArray(e.postEffect)?e.postEffect:[e.postEffect],{pixelRatio:e.pixelRatio??t,zIndex:e.zIndex??void 0,autoplay:e.autoplay??!0,fixedCanvas:e.scrollPadding===!1,scrollPadding:n,wrapper:e.wrapper,postEffects:r,preserveDrawingBuffer:e.preserveDrawingBuffer??!1,timeScale:e.timeScale??1}}var b=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},ae=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},oe,se,ce,le,ue,de,fe,pe,x=class{constructor(e,t,n){oe.add(this),this.wrapS=`clamp`,this.wrapT=`clamp`,this.minFilter=`linear`,this.magFilter=`linear`,this.needsUpdate=!0,this.source=null,se.set(this,void 0),ce.set(this,!1),le.set(this,void 0),ue.set(this,void 0),b(this,se,e,`f`),this.gl=e.gl;let r=n?.externalHandle;b(this,ue,r!==void 0,`f`),r===void 0?ae(this,oe,`m`,de).call(this):(this.texture=r,b(this,ce,!0,`f`),this.needsUpdate=!1),t&&(this.source=t),b(this,le,n?.autoRegister!==!1&&!ae(this,ue,`f`),`f`),ae(this,le,`f`)&&e.addResource(this)}restore(){ae(this,ue,`f`)||(ae(this,oe,`m`,de).call(this),b(this,ce,!1,`f`),this.needsUpdate=!0)}bind(e){let t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&=(ae(this,oe,`m`,fe).call(this),!1)}dispose(){ae(this,le,`f`)&&ae(this,se,`f`).removeResource(this),ae(this,ue,`f`)||this.gl.deleteTexture(this.texture)}};se=new WeakMap,ce=new WeakMap,le=new WeakMap,ue=new WeakMap,oe=new WeakSet,de=function(){let e=this.gl.createTexture();if(!e)throw Error(`[VFX-JS] Failed to create texture`);this.texture=e},fe=function(){let e=this.gl,t=this.source;if(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4),t)try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)}catch(e){console.error(e)}else if(!ae(this,ce,`f`)){let t=new Uint8Array([0,0,0,0]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,t)}ae(this,oe,`m`,pe).call(this),b(this,ce,!0,`f`)},pe=function(){let e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,me(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,me(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,he(e,this.minFilter)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,he(e,this.magFilter))};function me(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function he(e,t){return t===`nearest`?e.NEAREST:e.LINEAR}function ge(e){return new Promise((t,n)=>{let r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>t(r),r.onerror=n,r.src=e})}var _e=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},ve=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ye,be,xe,Se=class{constructor(e,t,n,r={}){ye.add(this),be.set(this,void 0),_e(this,be,e,`f`),this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(n)),this.float=r.float??!1,this.mipmap=r.mipmap??!1,this.texture=new x(e,void 0,{autoRegister:!1});let i=r.wrap;i!==void 0&&(typeof i==`string`?(this.texture.wrapS=i,this.texture.wrapT=i):(this.texture.wrapS=i[0],this.texture.wrapT=i[1])),r.filter!==void 0&&(this.texture.minFilter=r.filter,this.texture.magFilter=r.filter),ve(this,ye,`m`,xe).call(this),e.addResource(this)}setSize(e,t){let n=Math.max(1,Math.floor(e)),r=Math.max(1,Math.floor(t));n===this.width&&r===this.height||(this.width=n,this.height=r,ve(this,ye,`m`,xe).call(this))}restore(){this.texture.restore(),ve(this,ye,`m`,xe).call(this)}dispose(){ve(this,be,`f`).removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.texture.dispose()}generateMipmaps(){if(!this.mipmap)return;let e=this.gl;e.bindTexture(e.TEXTURE_2D,this.texture.texture),e.generateMipmap(e.TEXTURE_2D),e.bindTexture(e.TEXTURE_2D,null)}};be=new WeakMap,ye=new WeakSet,xe=function(){let e=this.gl,t=this.fbo,n=e.createFramebuffer();if(!n)throw Error(`[VFX-JS] Failed to create framebuffer`);this.fbo=n;let r=this.texture.texture;e.bindTexture(e.TEXTURE_2D,r);let i=ve(this,be,`f`).floatLinearFilter;if(this.float&&i&&!ve(this,be,`f`).floatBlend)throw Error(`[VFX-JS] EXT_float_blend is not supported.`);let a=this.float?i?e.RGBA32F:e.RGBA16F:e.RGBA8,o=this.float?i?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;if(this.mipmap){let t=Math.floor(Math.log2(Math.max(this.width,this.height)))+1,n=this.width,r=this.height;for(let i=0;i<t;i++)e.texImage2D(e.TEXTURE_2D,i,a,n,r,0,e.RGBA,o,null),n=Math.max(1,n>>1),r=Math.max(1,r>>1)}else e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,e.RGBA,o,null);let s=this.texture.minFilter===`nearest`?e.NEAREST:e.LINEAR,c=this.texture.magFilter===`nearest`?e.NEAREST:e.LINEAR,l=this.mipmap?this.texture.minFilter===`nearest`?e.NEAREST_MIPMAP_NEAREST:e.LINEAR_MIPMAP_LINEAR:s,u=Ce(e,this.texture.wrapS),d=Ce(e,this.texture.wrapT);e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,l),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,c),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,u),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,d),e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.texture.needsUpdate=!1,this.texture.source=null,t&&e.deleteFramebuffer(t)};function Ce(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function we(e,t,n,r){return{x:e.left+n,y:t-r-e.bottom,w:e.right-e.left,h:e.bottom-e.top}}function Te(e,t,n,r){return{x:e,y:t,w:n,h:r}}var Ee=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},S=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},De,Oe,ke,C,Ae=class{constructor(e,t,n,r,i,a={}){De.set(this,void 0),Oe.set(this,void 0),ke.set(this,void 0),C.set(this,void 0),Ee(this,De,t,`f`),Ee(this,Oe,n,`f`),Ee(this,ke,r,`f`);let o=t*r,s=n*r,c={float:i,wrap:a.wrap,filter:a.filter,mipmap:a.mipmap};Ee(this,C,[new Se(e,o,s,c),new Se(e,o,s,c)],`f`)}get texture(){return S(this,C,`f`)[0].texture}get target(){return S(this,C,`f`)[1]}resize(e,t){if(e===S(this,De,`f`)&&t===S(this,Oe,`f`))return;Ee(this,De,e,`f`),Ee(this,Oe,t,`f`);let n=e*S(this,ke,`f`),r=t*S(this,ke,`f`);S(this,C,`f`)[0].setSize(n,r),S(this,C,`f`)[1].setSize(n,r)}swap(){Ee(this,C,[S(this,C,`f`)[1],S(this,C,`f`)[0]],`f`)}getViewport(){return Te(0,0,S(this,De,`f`),S(this,Oe,`f`))}dispose(){S(this,C,`f`)[0].dispose(),S(this,C,`f`)[1].dispose()}};De=new WeakMap,Oe=new WeakMap,ke=new WeakMap,C=new WeakMap;var je=class{constructor(e=0,t=0){this.x=0,this.y=0,this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}},Me=class{constructor(e=0,t=0,n=0,r=0){this.x=0,this.y=0,this.z=0,this.w=0,this.x=e,this.y=t,this.z=n,this.w=r}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}},Ne=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Pe=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Fe,Ie,Le,Re,ze,Be,Ve;function He(e){return/#version\s+300\s+es\b/.test(e)?`300 es`:/#version\s+100\b/.test(e)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(e)?`100`:`300 es`}var Ue=class{constructor(e,t,n,r){Fe.add(this),Ie.set(this,void 0),Le.set(this,void 0),Re.set(this,void 0),ze.set(this,void 0),Be.set(this,new Map),Ne(this,Ie,e,`f`),this.gl=e.gl,Ne(this,Le,t,`f`),Ne(this,Re,n,`f`),Ne(this,ze,r??He(n),`f`),Pe(this,Fe,`m`,Ve).call(this),e.addResource(this)}restore(){Pe(this,Fe,`m`,Ve).call(this)}use(){this.gl.useProgram(this.program)}hasUniform(e){return Pe(this,Be,`f`).has(e)}uploadUniforms(e){let t=this.gl,n=0;for(let[r,i]of Pe(this,Be,`f`)){let a=e[r];if(!a)continue;let o=a.value;if(o!=null){if(Ke(i.type)){o instanceof x&&(o.bind(n),t.uniform1i(i.location,n),n++);continue}o instanceof x||Je(t,i,o)}}}dispose(){Pe(this,Ie,`f`).removeResource(this),this.gl.deleteProgram(this.program)}};Ie=new WeakMap,Le=new WeakMap,Re=new WeakMap,ze=new WeakMap,Be=new WeakMap,Fe=new WeakSet,Ve=function(){let e=this.gl,t=We(e,e.VERTEX_SHADER,Ge(Pe(this,Le,`f`),Pe(this,ze,`f`))),n=We(e,e.FRAGMENT_SHADER,Ge(Pe(this,Re,`f`),Pe(this,ze,`f`))),r=e.createProgram();if(!r)throw Error(`[VFX-JS] Failed to create program`);if(e.attachShader(r,t),e.attachShader(r,n),e.bindAttribLocation(r,0,`position`),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let i=e.getProgramInfoLog(r)??``;throw e.deleteShader(t),e.deleteShader(n),e.deleteProgram(r),Error(`[VFX-JS] Program link failed: ${i}`)}e.detachShader(r,t),e.detachShader(r,n),e.deleteShader(t),e.deleteShader(n),this.program=r,Pe(this,Be,`f`).clear();let i=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<i;t++){let n=e.getActiveUniform(r,t);if(!n)continue;let i=n.name.replace(/\[0\]$/,``),a=e.getUniformLocation(r,n.name);a&&Pe(this,Be,`f`).set(i,{location:a,type:n.type,size:n.size})}};function We(e,t,n){let r=e.createShader(t);if(!r)throw Error(`[VFX-JS] Failed to create shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)??``;throw e.deleteShader(r),Error(`[VFX-JS] Shader compile failed: ${t}\n\n${n}`)}return r}function Ge(e,t){return e.replace(/^\s+/,``).startsWith(`#version`)||t===`100`?e:`#version 300 es\n${e}`}function Ke(e){return e===35678||e===36298||e===36306||e===35682}var qe=new Set;function Je(e,t,n){let r=t.location,i=t.size>1,a=n,o=n,s=n;switch(t.type){case e.FLOAT:i?e.uniform1fv(r,a):e.uniform1f(r,n);return;case e.FLOAT_VEC2:if(i)e.uniform2fv(r,a);else if(n instanceof je)e.uniform2f(r,n.x,n.y);else{let t=n;e.uniform2f(r,t[0],t[1])}return;case e.FLOAT_VEC3:if(i)e.uniform3fv(r,a);else{let t=n;e.uniform3f(r,t[0],t[1],t[2])}return;case e.FLOAT_VEC4:if(i)e.uniform4fv(r,a);else if(n instanceof Me)e.uniform4f(r,n.x,n.y,n.z,n.w);else{let t=n;e.uniform4f(r,t[0],t[1],t[2],t[3])}return;case e.INT:i?e.uniform1iv(r,o):e.uniform1i(r,n);return;case e.INT_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,t[0],t[1])}return;case e.INT_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,t[0],t[1],t[2])}return;case e.INT_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,t[0],t[1],t[2],t[3])}return;case e.BOOL:i?e.uniform1iv(r,o):e.uniform1i(r,+!!n);return;case e.BOOL_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,+!!t[0],+!!t[1])}return;case e.BOOL_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,+!!t[0],+!!t[1],+!!t[2])}return;case e.BOOL_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,+!!t[0],+!!t[1],+!!t[2],+!!t[3])}return;case e.FLOAT_MAT2:e.uniformMatrix2fv(r,!1,a);return;case e.FLOAT_MAT3:e.uniformMatrix3fv(r,!1,a);return;case e.FLOAT_MAT4:e.uniformMatrix4fv(r,!1,a);return;case e.UNSIGNED_INT:i?e.uniform1uiv(r,s):e.uniform1ui(r,n);return;case e.UNSIGNED_INT_VEC2:if(i)e.uniform2uiv(r,s);else{let t=n;e.uniform2ui(r,t[0],t[1])}return;case e.UNSIGNED_INT_VEC3:if(i)e.uniform3uiv(r,s);else{let t=n;e.uniform3ui(r,t[0],t[1],t[2])}return;case e.UNSIGNED_INT_VEC4:if(i)e.uniform4uiv(r,s);else{let t=n;e.uniform4ui(r,t[0],t[1],t[2],t[3])}return;default:qe.has(t.type)||(qe.add(t.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${t.type.toString(16)}; skipping upload.`));return}}var Ye=class{constructor(e,t,n,r,i,a){this.gl=e.gl,this.program=new Ue(e,t,n,a),this.uniforms=r,this.blend=i}dispose(){this.program.dispose()}};function Xe(e,t,n,r,i,a,o,s){let c=r?r.width/s:a,l=r?r.height/s:o,u=Math.max(0,i.x),d=Math.max(0,i.y),f=Math.min(c,i.x+i.w),p=Math.min(l,i.y+i.h),m=f-u,h=p-d;m<=0||h<=0||(e.bindFramebuffer(e.FRAMEBUFFER,r?r.fbo:null),e.viewport(Math.round(u*s),Math.round(d*s),Math.round(m*s),Math.round(h*s)),Ze(e,n.blend),n.program.use(),n.program.uploadUniforms(n.uniforms),t.draw())}function Ze(e,t){if(t===`none`){e.disable(e.BLEND);return}e.enable(e.BLEND),e.blendEquation(e.FUNC_ADD),t===`premultiplied`?e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA):t===`additive`?e.blendFuncSeparate(e.ONE,e.ONE,e.ONE,e.ONE):e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA)}var Qe=class{constructor(t){this.uniforms={src:{value:null},offset:{value:new je},resolution:{value:new je},viewport:{value:new Me}},this.pass=new Ye(t,e,n,this.uniforms,`premultiplied`)}setUniforms(e,t,n){this.uniforms.src.value=e,this.uniforms.resolution.value.set(n.w*t,n.h*t),this.uniforms.offset.value.set(n.x*t,n.y*t)}dispose(){this.pass.dispose()}},$e=e=>{let t=document.implementation.createHTMLDocument(`test`),n=t.createRange();n.selectNodeContents(t.documentElement),n.deleteContents();let r=document.createElement(`head`);return t.documentElement.appendChild(r),t.documentElement.appendChild(n.createContextualFragment(e)),t.documentElement.setAttribute(`xmlns`,t.documentElement.namespaceURI),new XMLSerializer().serializeToString(t).replace(/<!DOCTYPE html>/,``)};async function et(e,t,n,r){let i=e.getBoundingClientRect(),a=window.devicePixelRatio,o=Math.ceil(i.width),s=Math.ceil(i.height),c=o*a,l=s*a,u=1,d=c,f=l;r&&(d>r||f>r)&&(u=Math.min(r/d,r/f),d=Math.floor(d*u),f=Math.floor(f*u));let p=n&&n.width===d&&n.height===f?n:new OffscreenCanvas(d,f),m=e.cloneNode(!0);await tt(e,m),nt(e,m),m.style.setProperty(`opacity`,t.toString()),m.style.setProperty(`margin`,`0px`),rt(m),m.style.setProperty(`box-sizing`,`border-box`),m.style.setProperty(`width`,`${o}px`),m.style.setProperty(`height`,`${s}px`);let h=m.outerHTML,g=`<svg xmlns="http://www.w3.org/2000/svg" width="${c}" height="${l}"><foreignObject width="100%" height="100%">${$e(h)}</foreignObject></svg>`;return new Promise((e,t)=>{let n=new Image;n.onload=()=>{let r=p.getContext(`2d`);if(r===null)return t();r.clearRect(0,0,d,f);let i=a*u;r.scale(i,i),r.drawImage(n,0,0,c,l),r.setTransform(1,0,0,1,0,0),e(p)},n.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(g)}`})}async function tt(e,t){let n=window.getComputedStyle(e);for(let e of Array.from(n))/(-inline-|-block-|^inline-|^block-)/.test(e)||/^-webkit-.*(start|end|before|after|logical)/.test(e)||t.style.setProperty(e,n.getPropertyValue(e),n.getPropertyPriority(e));if(t.tagName===`INPUT`)t.setAttribute(`value`,t.value);else if(t.tagName===`TEXTAREA`)t.innerHTML=t.value;else if(t.tagName===`IMG`)try{t.src=await it(o(e))}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];await tt(r,i)}}function nt(e,t){if(typeof e.computedStyleMap==`function`)try{let n=e.computedStyleMap();for(let e of[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`]){let r=n.get(e);r instanceof CSSKeywordValue&&r.value===`auto`&&t.style.setProperty(e,`auto`)}}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];r instanceof HTMLElement&&i instanceof HTMLElement&&nt(r,i)}}function rt(e){let t=e;for(;;){let e=t.style;if(Number.parseFloat(e.paddingTop)>0||Number.parseFloat(e.borderTopWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.firstElementChild;if(!n)break;n.style.setProperty(`margin-top`,`0px`),t=n}for(t=e;;){let e=t.style;if(Number.parseFloat(e.paddingBottom)>0||Number.parseFloat(e.borderBottomWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.lastElementChild;if(!n)break;n.style.setProperty(`margin-bottom`,`0px`),t=n}}async function it(e){let t=await fetch(e).then(e=>e.blob());return new Promise(e=>{let n=new FileReader;n.onload=function(){e(this.result)},n.readAsDataURL(t)})}var w=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},T=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},at,ot,st,ct,lt,ut,dt,ft,pt,mt,ht,gt,_t=Object.freeze({__brand:`EffectQuad`});function vt(e){return e===_t}function yt(e,t){switch(t){case`lines`:return e.LINES;case`lineStrip`:return e.LINE_STRIP;case`points`:return e.POINTS;default:return e.TRIANGLES}}function bt(e,t){if(t instanceof Float32Array)return e.FLOAT;if(t instanceof Uint8Array)return e.UNSIGNED_BYTE;if(t instanceof Uint16Array)return e.UNSIGNED_SHORT;if(t instanceof Uint32Array)return e.UNSIGNED_INT;if(t instanceof Int8Array)return e.BYTE;if(t instanceof Int16Array)return e.SHORT;if(t instanceof Int32Array)return e.INT;throw Error(`[VFX-JS] Unsupported attribute typed array`)}function xt(e,t){if(ArrayBuffer.isView(t)&&!(t instanceof DataView))return{name:e,data:t,itemSize:2,normalized:!1,perInstance:!1};let n=t;return{name:e,data:n.data,itemSize:n.itemSize,normalized:n.normalized??!1,perInstance:n.perInstance??!1}}var St=class{constructor(e,t,n){at.add(this),ot.set(this,void 0),st.set(this,void 0),ct.set(this,void 0),lt.set(this,[]),ut.set(this,null),this.indexType=0,this.hasIndices=!1,this.drawCount=0,this.drawStart=0,dt.set(this,!1),w(this,ot,e,`f`),this.gl=e.gl,w(this,st,t,`f`),w(this,ct,n,`f`),this.mode=yt(this.gl,t.mode),this.instanceCount=t.instanceCount??0,T(this,at,`m`,ft).call(this),e.addResource(this),w(this,dt,!0,`f`)}restore(){w(this,lt,[],`f`),w(this,ut,null,`f`),T(this,at,`m`,ft).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),this.hasIndices?this.instanceCount>0?e.drawElementsInstanced(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2),this.instanceCount):e.drawElements(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2)):this.instanceCount>0?e.drawArraysInstanced(this.mode,this.drawStart,this.drawCount,this.instanceCount):e.drawArrays(this.mode,this.drawStart,this.drawCount)}dispose(){T(this,dt,`f`)&&(T(this,ot,`f`).removeResource(this),w(this,dt,!1,`f`));let e=this.gl;e.deleteVertexArray(this.vao);for(let t of T(this,lt,`f`))e.deleteBuffer(t);T(this,ut,`f`)&&e.deleteBuffer(T(this,ut,`f`)),w(this,lt,[],`f`),w(this,ut,null,`f`)}};ot=new WeakMap,st=new WeakMap,ct=new WeakMap,lt=new WeakMap,ut=new WeakMap,dt=new WeakMap,at=new WeakSet,ft=function(){let e=this.gl,t=e.createVertexArray();if(!t)throw Error(`[VFX-JS] Failed to create VAO`);this.vao=t,e.bindVertexArray(t);let n=T(this,ct,`f`).program,r=null;for(let[t,i]of Object.entries(T(this,st,`f`).attributes)){let a=xt(t,i),o=e.getAttribLocation(n,a.name);if(o<0)continue;let s=e.createBuffer();if(!s)throw Error(`[VFX-JS] Failed to create VBO for "${a.name}"`);T(this,lt,`f`).push(s),e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,a.data,e.STATIC_DRAW);let c=bt(e,a.data);e.enableVertexAttribArray(o),c===e.FLOAT||c===e.HALF_FLOAT||a.normalized?e.vertexAttribPointer(o,a.itemSize,c,a.normalized,0,0):e.vertexAttribIPointer(o,a.itemSize,c,0,0),a.perInstance&&e.vertexAttribDivisor(o,1),t===`position`&&r===null&&(r=a.data.length/a.itemSize)}let i=0,a=T(this,st,`f`).indices;if(a){let t=e.createBuffer();if(!t)throw Error(`[VFX-JS] Failed to create IBO`);w(this,ut,t,`f`),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t),e.bufferData(e.ELEMENT_ARRAY_BUFFER,a,e.STATIC_DRAW),this.hasIndices=!0,this.indexType=a instanceof Uint32Array?e.UNSIGNED_INT:e.UNSIGNED_SHORT,i=a.length}else this.hasIndices=!1;e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null),T(this,ut,`f`)&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null);let o=this.hasIndices?i:r??0,s=T(this,st,`f`).drawRange;this.drawStart=s?.start??0,this.drawCount=s?.count===void 0?Math.max(0,o-this.drawStart):s.count};var Ct=class{constructor(e,t){pt.set(this,void 0),mt.set(this,void 0),ht.set(this,new WeakMap),gt.set(this,new Set),w(this,pt,e,`f`),w(this,mt,t,`f`)}get quad(){return T(this,mt,`f`)}resolve(e,t){let n=T(this,ht,`f`).get(e);n||(n=new Map,T(this,ht,`f`).set(e,n));let r=n.get(t);return r||(r=new St(T(this,pt,`f`),e,t),n.set(t,r),T(this,gt,`f`).add(r)),r}release(e){let t=T(this,ht,`f`).get(e);if(t){for(let e of t.values())e.dispose(),T(this,gt,`f`).delete(e);T(this,ht,`f`).delete(e)}}dispose(){for(let e of T(this,gt,`f`))e.dispose();T(this,gt,`f`).clear()}};pt=new WeakMap,mt=new WeakMap,ht=new WeakMap,gt=new WeakMap;var E=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},D=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},O,wt,Tt,Et,Dt,Ot,kt,At,jt,Mt,k,Nt,A,j,Pt,Ft,It,Lt,Rt,zt,Bt,Vt,Ht,Ut=Symbol.for(`@vfx-js/effect.resolve-texture`),Wt=Symbol.for(`@vfx-js/effect.resolve-rt`);function Gt(e){return e[Ut]()}function Kt(e){return e[Wt]}var qt=`#version 300 es
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
`,Jt=`
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
`,Yt=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`,Xt=`
precision highp float;
varying vec2 uv;
uniform sampler2D src;
void main() {
    gl_FragColor = texture2D(src, uv);
}
`,Zt=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uvSrc);
}
`,Qt=`
precision highp float;
varying vec2 uvSrc;
uniform sampler2D src;
void main() {
    gl_FragColor = texture2D(src, uvSrc);
}
`,$t=class{constructor(e,t,n,r,i,a){O.add(this),wt.set(this,void 0),Tt.set(this,void 0),Et.set(this,void 0),Dt.set(this,void 0),Ot.set(this,void 0),kt.set(this,[]),At.set(this,[]),jt.set(this,[]),Mt.set(this,[]),k.set(this,`init`),Nt.set(this,!1),A.set(this,void 0),j.set(this,void 0),Lt.set(this,[]),E(this,wt,e,`f`),E(this,Tt,e.gl,`f`),E(this,Et,n,`f`),E(this,Dt,a,`f`),E(this,Ot,new Ct(e,t),`f`),E(this,A,{outputBufferW:1,outputBufferH:1,canvasBufferSize:[1,1],outputViewport:{x:0,y:0,w:1,h:1},elementBufferW:1,elementBufferH:1,contentRectUv:[0,0,1,1],srcRectUv:[0,0,1,1]},`f`);let o={time:0,deltaTime:0,pixelRatio:n,resolution:[1,1],mouse:[0,0],mouseViewport:[0,0],intersection:0,enterTime:0,leaveTime:0,src:r,target:null,uniforms:{},vfxProps:i,dims:{element:[1,1],elementPixel:[1,1],canvas:[1,1],canvasPixel:[1,1],pixelRatio:n,contentRect:[0,0,1,1],srcRect:[0,0,1,1],canvasRect:[0,0,1,1]},quad:_t,gl:D(this,Tt,`f`),createRenderTarget:e=>D(this,O,`m`,Pt).call(this,e),releaseGeometry:e=>D(this,Ot,`f`).release(e),wrapTexture:(e,t)=>D(this,O,`m`,It).call(this,e,t),draw:e=>D(this,O,`m`,Rt).call(this,e),blit:(e,t,n)=>D(this,O,`m`,zt).call(this,e,t,n),clear:e=>D(this,O,`m`,Bt).call(this,e),onContextRestored:e=>{let t=D(this,wt,`f`).onContextRestored(e);return D(this,Mt,`f`).push(t),t}};E(this,j,o,`f`)}get ctx(){return D(this,j,`f`)}setPhase(e){E(this,k,e,`f`)}setFrameDims(e){E(this,A,e,`f`),D(this,j,`f`).resolution=[e.canvasBufferSize[0],e.canvasBufferSize[1]];for(let t of D(this,jt,`f`))t.resolver.resize?.(e.outputBufferW,e.outputBufferH)}setEffectDims(e){D(this,j,`f`).dims=e}setFrameState(e){let t=D(this,j,`f`);t.time=e.time,t.deltaTime=e.deltaTime,t.mouse=e.mouse,t.mouseViewport=e.mouseViewport,t.intersection=e.intersection,t.enterTime=e.enterTime,t.leaveTime=e.leaveTime,t.uniforms=e.uniforms}setSrc(e){D(this,j,`f`).src=e}setOutput(e){D(this,j,`f`).target=e}passthroughCopy(e,t,n){let r=D(this,k,`f`);E(this,k,`render`,`f`);let i=D(this,j,`f`).target;D(this,j,`f`).target=t;try{let r=D(this,A,`f`).outputViewport;D(this,A,`f`).outputViewport={...n};let i=D(this,j,`f`).vfxProps.glslVersion===`100`?Xt:Yt;D(this,O,`m`,Vt).call(this,{frag:i,uniforms:{src:e},target:t}),D(this,A,`f`).outputViewport=r}finally{D(this,j,`f`).target=i,E(this,k,r,`f`)}}clearRt(e){let t=D(this,Tt,`f`),n=Kt(e);t.bindFramebuffer(t.FRAMEBUFFER,n.getWriteFbo().fbo),t.viewport(0,0,e.width,e.height),t.clearColor(0,0,0,0),t.disable(t.SCISSOR_TEST),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)}tickAutoUpdates(){for(let e of D(this,Lt,`f`))e()}dispose(){E(this,k,`disposed`,`f`);for(let e of D(this,Mt,`f`))e();E(this,Mt,[],`f`);for(let e of D(this,At,`f`))e.resolver.dispose?.();E(this,At,[],`f`),E(this,jt,[],`f`);for(let e of D(this,kt,`f`))e.dispose();E(this,kt,[],`f`),D(this,Ot,`f`).dispose(),E(this,Lt,[],`f`)}};wt=new WeakMap,Tt=new WeakMap,Et=new WeakMap,Dt=new WeakMap,Ot=new WeakMap,kt=new WeakMap,At=new WeakMap,jt=new WeakMap,Mt=new WeakMap,k=new WeakMap,Nt=new WeakMap,A=new WeakMap,j=new WeakMap,Lt=new WeakMap,O=new WeakSet,Pt=function(e){let t=e?.persistent??!1,n=e?.float??!1,r=tn(e?.wrap),i=e?.filter,a=e?.mipmap??!1,o=a!==!1,s=a===!0,c=e?.size,l=c?c[0]:D(this,A,`f`).outputBufferW,u=c?c[1]:D(this,A,`f`).outputBufferH,d,f,p;if(t){let e=c?1:D(this,Et,`f`),t=c?l:l/e,a=c?u:u/e,m=new Ae(D(this,wt,`f`),t,a,e,n,{wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>m.texture,getWriteFbo:()=>m.target,swap:()=>m.swap(),resize:c?void 0:(e,t)=>{m.resize(e/D(this,Et,`f`),t/D(this,Et,`f`))},dispose:()=>m.dispose()},o&&(d.regenerateMipmaps=()=>m.target.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>m.target.width,p=()=>m.target.height}else{let e=new Se(D(this,wt,`f`),l,u,{float:n,wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>e.texture,getWriteFbo:()=>e,resize:c?void 0:(t,n)=>e.setSize(t,n),dispose:()=>e.dispose()},o&&(d.regenerateMipmaps=()=>e.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>e.width,p=()=>e.height}let m,h=an(d,f,p,()=>D(this,O,`m`,Ft).call(this,m));return m={handle:h,resolver:d},D(this,At,`f`).push(m),c||D(this,jt,`f`).push(m),h},Ft=function(e){let t=D(this,At,`f`).indexOf(e);if(t<0)return;D(this,At,`f`).splice(t,1);let n=D(this,jt,`f`).indexOf(e);n>=0&&D(this,jt,`f`).splice(n,1),e.resolver.dispose?.()},It=function(e,t){let n=tn(t?.wrap),r=t?.filter,i,a,o,s=null;if(en(e)){if(!t?.size)throw Error(`[VFX-JS] wrapTexture(WebGLTexture) requires opts.size`);let[n,r]=t.size;i=new x(D(this,wt,`f`),void 0,{autoRegister:!1,externalHandle:e}),a=()=>n,o=()=>r}else{let n=e;i=new x(D(this,wt,`f`),n);let r=t?.size,c=e=>{if(r)return e===`w`?r[0]:r[1];if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return e===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return e===`w`?n.videoWidth:n.videoHeight;let t=n;return e===`w`?t.width:t.height};a=()=>c(`w`),o=()=>c(`h`);let l=typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement||typeof HTMLCanvasElement<`u`&&n instanceof HTMLCanvasElement||typeof OffscreenCanvas<`u`&&n instanceof OffscreenCanvas;(t?.autoUpdate??l)&&(s=()=>{i.needsUpdate=!0})}i.wrapS=n[0],i.wrapT=n[1],r!==void 0&&(i.minFilter=r,i.magFilter=r),D(this,kt,`f`).push(i),s&&D(this,Lt,`f`).push(s);let c=!1;return rn(()=>i,a,o,()=>{if(c)return;c=!0;let e=D(this,kt,`f`).indexOf(i);if(e!==-1&&D(this,kt,`f`).splice(e,1),s){let e=D(this,Lt,`f`).indexOf(s);e!==-1&&D(this,Lt,`f`).splice(e,1)}i.dispose()})},Rt=function(e){if(D(this,k,`f`)!==`render`){D(this,k,`f`)===`update`&&!D(this,Nt,`f`)&&(E(this,Nt,!0,`f`),console.warn(`[VFX-JS] ctx.draw() called in update(); ignored. Move draws to render().`));return}D(this,O,`m`,Vt).call(this,e)},zt=function(e,t,n){if(D(this,k,`f`)!==`render`){D(this,k,`f`)===`update`&&!D(this,Nt,`f`)&&(E(this,Nt,!0,`f`),console.warn(`[VFX-JS] ctx.blit() called in update(); ignored. Move draws to render().`));return}let r=D(this,j,`f`).vfxProps.glslVersion===`100`?Qt:Zt;D(this,O,`m`,Vt).call(this,{frag:r,uniforms:{src:e},target:t,blend:n?.blend,swap:n?.swap})},Bt=function(e){if(D(this,k,`f`)!==`render`){D(this,k,`f`)===`update`&&!D(this,Nt,`f`)&&(E(this,Nt,!0,`f`),console.warn(`[VFX-JS] ctx.clear() called in update(); ignored. Move draws to render().`));return}let t=D(this,Tt,`f`),n=D(this,j,`f`).target,r=e??n,i=r===null||r===n;if(t.clearColor(0,0,0,0),i){let e=r===null?null:Kt(r).getWriteFbo().fbo,n=D(this,A,`f`).outputViewport;t.bindFramebuffer(t.FRAMEBUFFER,e),t.enable(t.SCISSOR_TEST),t.scissor(n.x,n.y,n.w,n.h),t.clear(t.COLOR_BUFFER_BIT),t.disable(t.SCISSOR_TEST),t.bindFramebuffer(t.FRAMEBUFFER,null);return}let a=Kt(r);t.disable(t.SCISSOR_TEST);let o=()=>{t.bindFramebuffer(t.FRAMEBUFFER,a.getWriteFbo().fbo),t.clear(t.COLOR_BUFFER_BIT)};o(),a.swap&&(a.swap(),o(),a.swap()),t.bindFramebuffer(t.FRAMEBUFFER,null)},Vt=function(e){let t=D(this,Tt,`f`),n=e.vert??(D(this,j,`f`).vfxProps.glslVersion===`100`?Jt:qt),r=D(this,Dt,`f`).get(n,e.frag,D(this,j,`f`).vfxProps.glslVersion),i=D(this,j,`f`).target,a=e.target===void 0||e.target===null?i:e.target,o=a===null||a===i,s,c,l,u,d,f,p;if(a===null)s=null,c=D(this,A,`f`).outputViewport.x,l=D(this,A,`f`).outputViewport.y,u=D(this,A,`f`).outputViewport.w,d=D(this,A,`f`).outputViewport.h;else{let e=Kt(a);s=e.getWriteFbo().fbo,o?(c=D(this,A,`f`).outputViewport.x,l=D(this,A,`f`).outputViewport.y,u=D(this,A,`f`).outputViewport.w,d=D(this,A,`f`).outputViewport.h):(c=0,l=0,u=a.width,d=a.height),f=e.swap,e.mipmapAutoRegen&&(p=e.regenerateMipmaps)}t.bindFramebuffer(t.FRAMEBUFFER,s),t.viewport(c,l,u,d),t.disable(t.SCISSOR_TEST),Ze(t,e.blend??(a===null?`premultiplied`:`none`)),r.use();let m=D(this,O,`m`,Ht).call(this,e.uniforms);r.uploadUniforms(m);let h=e.geometry??_t;vt(h)?D(this,Ot,`f`).quad.draw():D(this,Ot,`f`).resolve(h,r).draw(),p?.(),f&&e.swap!==!1&&f()},Ht=function(e){let t={};if(t.contentRectUv={value:D(this,A,`f`).contentRectUv},t.srcRectUv={value:D(this,A,`f`).srcRectUv},!e)return t;for(let[n,r]of Object.entries(e))t[n]=nn(r);return t};function en(e){let t=globalThis.WebGLTexture;if(t&&typeof t==`function`&&e instanceof t)return!0;let n=e;return n.width===void 0&&n.naturalWidth===void 0&&n.videoWidth===void 0}function tn(e){return e===void 0?[`clamp`,`clamp`]:typeof e==`string`?[e,e]:[e[0],e[1]]}function nn(e){return typeof e==`object`&&e&&`__brand`in e?e.__brand===`EffectRenderTarget`?{value:Kt(e).getReadTexture()}:{value:Gt(e)}:{value:e}}function rn(e,t,n,r){let i={__brand:`EffectTexture`,get width(){return t()},get height(){return n()},dispose(){r?.()}};return Object.defineProperty(i,Ut,{value:e}),i}function an(e,t,n,r){let i={__brand:`EffectRenderTarget`,get width(){return t()},get height(){return n()},dispose:r??(()=>{}),generateMipmaps:()=>e.regenerateMipmaps?.()};return Object.defineProperty(i,Wt,{value:e}),i}function on(e){return an({getReadTexture:()=>e.texture,getWriteFbo:()=>e},()=>e.width,()=>e.height)}function sn(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:Array.isArray(e)?{top:e[0],right:e[1],bottom:e[2],left:e[3]}:{top:e.top??0,right:e.right??0,bottom:e.bottom??0,left:e.left??0}}function cn(e){return sn(e)}var ln={top:0,right:0,bottom:0,left:0};function un(e){return sn(e)}function dn(e){return{top:e.top,right:e.right,bottom:e.bottom,left:e.left}}function fn(e){return{top:e.top,left:e.left,right:e.left+Math.ceil(e.right-e.left),bottom:e.top+Math.ceil(e.bottom-e.top)}}function pn(e,t){return{top:e.top-t.top,right:e.right+t.right,bottom:e.bottom+t.bottom,left:e.left-t.left}}function mn(e,t,n){return Math.min(Math.max(e,t),n)}function hn(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return c<=0||l<=0?[0,0,1,1]:[(n-o)/c,(r-s)/l,i/c,a/l]}function gn(e,t){let n=mn(t.left,e.left,e.right),r=(mn(t.right,e.left,e.right)-n)/(t.right-t.left),i=mn(t.top,e.top,e.bottom);return r*((mn(t.bottom,e.top,e.bottom)-i)/(t.bottom-t.top))}var M=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},N=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},P,_n,vn,yn,bn,xn,F,I,Sn,Cn,wn,Tn,En,Dn,On,kn,An,jn,Mn,Nn,Pn,Fn,In,Ln,Rn,zn,Bn,Vn=class{constructor(e,t,n,r,i,a,o,s){P.add(this),_n.set(this,void 0),vn.set(this,void 0),yn.set(this,void 0),bn.set(this,void 0),xn.set(this,void 0),F.set(this,void 0),I.set(this,void 0),Sn.set(this,void 0),Cn.set(this,[]),wn.set(this,[]),Tn.set(this,void 0),En.set(this,new Set),Dn.set(this,!1),On.set(this,void 0),kn.set(this,cn(0)),An.set(this,null),M(this,_n,e,`f`),M(this,vn,t,`f`),M(this,yn,n,`f`),M(this,bn,i,`f`),M(this,xn,s,`f`),M(this,F,r,`f`),M(this,Tn,a,`f`),M(this,On,o,`f`),M(this,I,r.map(()=>N(this,P,`m`,Mn).call(this)),`f`),r.length===0&&M(this,An,N(this,P,`m`,Mn).call(this),`f`),M(this,Sn,N(this,P,`m`,jn).call(this),`f`)}get effects(){return N(this,F,`f`)}get hosts(){return N(this,I,`f`)}get renderingIndices(){return N(this,Sn,`f`)}get stages(){return N(this,wn,`f`)}get hitTestPadBuffer(){return N(this,kn,`f`)}async initAll(){for(let e=0;e<N(this,F,`f`).length;e++){let t=N(this,F,`f`)[e],n=N(this,I,`f`)[e];n.setPhase(`init`);try{t.init&&await t.init(n.ctx)}catch(t){console.error(`[VFX-JS] effect[${e}].init() failed:`,t);for(let t=e-1;t>=0;t--)N(this,P,`m`,Nn).call(this,t),N(this,I,`f`)[t].dispose();throw N(this,I,`f`)[e].dispose(),t}n.setPhase(`update`)}}run(e){if(N(this,Dn,`f`)||!e.isVisible)return;M(this,Sn,N(this,P,`m`,jn).call(this),`f`);let t=N(this,Sn,`f`).length;for(let t of N(this,I,`f`))t.setFrameState({time:e.time,deltaTime:e.deltaTime,mouse:e.mouse,mouseViewport:e.mouseViewport,intersection:e.intersection,enterTime:e.enterTime,leaveTime:e.leaveTime,uniforms:e.resolvedUniforms});N(this,P,`m`,Pn).call(this,e);for(let t=0;t<N(this,I,`f`).length;t++)N(this,I,`f`)[t].setFrameDims(N(this,P,`m`,Bn).call(this,t,e)),N(this,I,`f`)[t].setEffectDims(N(this,P,`m`,Ln).call(this,t,e));for(let e=0;e<N(this,F,`f`).length;e++){let t=N(this,F,`f`)[e];if(!t.update)continue;let n=N(this,I,`f`)[e];n.setPhase(`update`);try{t.update(n.ctx)}catch(t){let n=`${e}:update`;N(this,En,`f`).has(n)||(N(this,En,`f`).add(n),console.warn(`[VFX-JS] effect[${e}].update() threw; skipping this frame's update:`,t))}}if(t===0){(N(this,An,`f`)??N(this,I,`f`)[0]).passthroughCopy(N(this,Tn,`f`),e.finalTarget,e.elementRectOnCanvasPx);return}for(let n=0;n<t;n++){let r=N(this,Sn,`f`)[n],i=N(this,I,`f`)[r],a=N(this,F,`f`)[r];if(!a.render)continue;i.setPhase(`render`),i.tickAutoUpdates();let o=n===0?N(this,Tn,`f`):N(this,Cn,`f`)[n-1].texHandle;i.setSrc(o);let s;n===t-1?s=e.finalTarget:(s=N(this,Cn,`f`)[n].rtHandle,i.clearRt(s)),i.setOutput(s);try{a.render(i.ctx)}catch(e){let a=`${r}:render`;N(this,En,`f`).has(a)||(N(this,En,`f`).add(a),console.warn(`[VFX-JS] effect[${r}].render() threw; falling back to passthrough:`,e));let c=N(this,wn,`f`)[n].outputViewport;s===null?i.passthroughCopy(o,null,c):n===t-1?i.passthroughCopy(o,s,c):i.passthroughCopy(o,s,{x:0,y:0,w:s.width,h:s.height})}i.setPhase(`update`)}}dispose(){if(!N(this,Dn,`f`)){M(this,Dn,!0,`f`);for(let e=N(this,F,`f`).length-1;e>=0;e--)N(this,P,`m`,Nn).call(this,e),N(this,I,`f`)[e].dispose();N(this,An,`f`)&&(N(this,An,`f`).dispose(),M(this,An,null,`f`));for(let e of N(this,Cn,`f`))e.fb.dispose();M(this,Cn,[],`f`),M(this,wn,[],`f`)}}async replaceEffects(e){if(N(this,Dn,`f`))throw Error(`[VFX-JS] replaceEffects on disposed chain`);let t=N(this,F,`f`),n=N(this,I,`f`),r=new Map;for(let e=0;e<t.length;e++)r.set(t[e],n[e]);let i=Array(e.length),a=[];for(let t=0;t<e.length;t++){let n=e[t],o=r.get(n);if(o)i[t]=o,r.delete(n);else{let e=N(this,P,`m`,Mn).call(this);i[t]=e,a.push({host:e,effect:n})}}for(let e=0;e<a.length;e++){let{host:t,effect:n}=a[e];t.setPhase(`init`);try{n.init&&await n.init(t.ctx),t.setPhase(`update`)}catch(n){console.error(`[VFX-JS] replaceEffects: new effect init() failed:`,n);for(let t=e-1;t>=0;t--){let e=a[t];if(e.effect.dispose)try{e.effect.dispose()}catch(e){console.error(`[VFX-JS] dispose during init rollback threw:`,e)}e.host.dispose()}throw t.dispose(),n}}for(let[e,t]of r){if(e.dispose)try{e.dispose()}catch(e){console.error(`[VFX-JS] effect.dispose() threw during replaceEffects:`,e)}t.dispose()}for(let e of N(this,Cn,`f`))e.fb.dispose();M(this,Cn,[],`f`),M(this,wn,[],`f`),e.length===0&&!N(this,An,`f`)?M(this,An,N(this,P,`m`,Mn).call(this),`f`):e.length>0&&N(this,An,`f`)&&(N(this,An,`f`).dispose(),M(this,An,null,`f`)),M(this,F,e,`f`),M(this,I,i,`f`),M(this,Sn,N(this,P,`m`,jn).call(this),`f`),N(this,En,`f`).clear()}};_n=new WeakMap,vn=new WeakMap,yn=new WeakMap,bn=new WeakMap,xn=new WeakMap,F=new WeakMap,I=new WeakMap,Sn=new WeakMap,Cn=new WeakMap,wn=new WeakMap,Tn=new WeakMap,En=new WeakMap,Dn=new WeakMap,On=new WeakMap,kn=new WeakMap,An=new WeakMap,P=new WeakSet,jn=function(){return N(this,F,`f`).map((e,t)=>typeof e.render==`function`&&e.enabled!==!1?t:-1).filter(e=>e>=0)},Mn=function(){return new $t(N(this,_n,`f`),N(this,vn,`f`),N(this,yn,`f`),N(this,Tn,`f`),N(this,bn,`f`),N(this,xn,`f`))},Nn=function(e){let t=N(this,F,`f`)[e];if(t.dispose)try{t.dispose()}catch(t){console.error(`[VFX-JS] effect[${e}].dispose() threw:`,t)}},Pn=function(e){let t=N(this,Sn,`f`).length;if(M(this,wn,Array(t),`f`),t===0)return;let n=N(this,On,`f`)?e.canvasBufferSize:e.elementBufferSize,r=[0,0,n[0],n[1]],i=N(this,P,`m`,zn).call(this,e),a=r;for(let n=0;n<t;n++){let o=N(this,Sn,`f`)[n],s=N(this,F,`f`)[o],c=n===t-1,l=N(this,P,`m`,Fn).call(this,s,a,r,i,e)??a,u=[l[2],l[3]],d=hn(r,l),f=c?{x:e.elementRectOnCanvasPx.x+l[0],y:e.elementRectOnCanvasPx.y+l[1],w:u[0],h:u[1]}:{x:0,y:0,w:u[0],h:u[1]};N(this,wn,`f`)[n]={dstRect:l,dstBufferSize:u,contentRectUv:d,outputViewport:f},c||N(this,P,`m`,Rn).call(this,n,u),a=l}let[o,s,c,l]=N(this,wn,`f`)[t-1].dstRect;M(this,kn,cn({top:Math.max(0,s+l-n[1]),right:Math.max(0,o+c-n[0]),bottom:Math.max(0,-s),left:Math.max(0,-o)}),`f`)},Fn=function(e,t,n,r,i){if(e.outputRect)return e.outputRect(N(this,P,`m`,In).call(this,i,n,t,r))},In=function(e,t,n,r){let i=e.canvasBufferSize[0]/e.canvasSize[0]||1;return{element:N(this,On,`f`)?e.canvasSize:e.elementSize,elementPixel:N(this,On,`f`)?e.canvasBufferSize:e.elementBufferSize,canvas:e.canvasSize,canvasPixel:e.canvasBufferSize,pixelRatio:i,contentRect:t,srcRect:n,canvasRect:r}},Ln=function(e,t){let n=N(this,On,`f`)?t.canvasBufferSize:t.elementBufferSize,r=[0,0,n[0],n[1]],i=N(this,P,`m`,zn).call(this,t),a=N(this,Sn,`f`).indexOf(e),o=a<=0?r:N(this,wn,`f`)[a-1].dstRect;return N(this,P,`m`,In).call(this,t,r,o,i)},Rn=function(e,t){let n=N(this,Cn,`f`)[e];if(n&&n.fb.width===t[0]&&n.fb.height===t[1])return;n&&n.fb.dispose();let r=new Se(N(this,_n,`f`),t[0],t[1]),i=on(r),a=rn(()=>r.texture,()=>r.width,()=>r.height);N(this,Cn,`f`)[e]={fb:r,rtHandle:i,texHandle:a,bufferSize:t}},zn=function(e){let[t,n]=e.canvasBufferSize;if(N(this,On,`f`))return[0,0,t,n];let{x:r,y:i}=e.elementRectOnCanvasPx;return[-r,-i,t,n]},Bn=function(e,t){let n=N(this,Sn,`f`).indexOf(e),r,i,a,o,s;if(n<0)r=t.elementBufferSize[0],i=t.elementBufferSize[1],a={x:0,y:0,w:r,h:i},o=[0,0,1,1],s=[0,0,1,1];else{let e=N(this,wn,`f`)[n];r=e.dstBufferSize[0],i=e.dstBufferSize[1],a=e.outputViewport,o=e.contentRectUv,s=n===0?[0,0,1,1]:N(this,wn,`f`)[n-1].contentRectUv}return{outputBufferW:r,outputBufferH:i,canvasBufferSize:t.canvasBufferSize,outputViewport:a,elementBufferW:t.elementBufferSize[0],elementBufferH:t.elementBufferSize[1],contentRectUv:o,srcRectUv:s}};function Hn(e){this.data=e,this.pos=0}Hn.prototype.readByte=function(){return this.data[this.pos++]},Hn.prototype.peekByte=function(){return this.data[this.pos]},Hn.prototype.readBytes=function(e){return this.data.subarray(this.pos,this.pos+=e)},Hn.prototype.peekBytes=function(e){return this.data.subarray(this.pos,this.pos+e)},Hn.prototype.readString=function(e){for(var t=``,n=0;n<e;n++)t+=String.fromCharCode(this.readByte());return t},Hn.prototype.readBitArray=function(){for(var e=[],t=this.readByte(),n=7;n>=0;n--)e.push(!!(t&1<<n));return e},Hn.prototype.readUnsigned=function(e){var t=this.readBytes(2);return e?(t[1]<<8)+t[0]:(t[0]<<8)+t[1]};function Un(e){this.stream=new Hn(e),this.output={}}Un.prototype.parse=function(e){return this.parseParts(this.output,e),this.output},Un.prototype.parseParts=function(e,t){for(var n=0;n<t.length;n++){var r=t[n];this.parsePart(e,r)}},Un.prototype.parsePart=function(e,t){var n=t.label,r;if(!(t.requires&&!t.requires(this.stream,this.output,e)))if(t.loop){for(var i=[];t.loop(this.stream);){var a={};this.parseParts(a,t.parts),i.push(a)}e[n]=i}else t.parts?(r={},this.parseParts(r,t.parts),e[n]=r):t.parser?(r=t.parser(this.stream,this.output,e),t.skip||(e[n]=r)):t.bits&&(e[n]=this.parseBits(t.bits))};function Wn(e){return e.reduce(function(e,t){return e*2+t},0)}Un.prototype.parseBits=function(e){var t={},n=this.stream.readBitArray();for(var r in e){var i=e[r];i.length?t[r]=Wn(n.slice(i.index,i.index+i.length)):t[r]=n[i.index]}return t};var L={readByte:function(){return function(e){return e.readByte()}},readBytes:function(e){return function(t){return t.readBytes(e)}},readString:function(e){return function(t){return t.readString(e)}},readUnsigned:function(e){return function(t){return t.readUnsigned(e)}},readArray:function(e,t){return function(n,r,i){for(var a=t(n,r,i),o=Array(a),s=0;s<a;s++)o[s]=n.readBytes(e);return o}}},Gn={label:`blocks`,parser:function(e){for(var t=[],n=0,r=0,i=e.readByte();i!==r;i=e.readByte())t.push(e.readBytes(i)),n+=i;var a=new Uint8Array(n);n=0;for(var o=0;o<t.length;o++)a.set(t[o],n),n+=t[o].length;return a}},Kn={label:`gce`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===249},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`byteSize`,parser:L.readByte()},{label:`extras`,bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:`delay`,parser:L.readUnsigned(!0)},{label:`transparentColorIndex`,parser:L.readByte()},{label:`terminator`,parser:L.readByte(),skip:!0}]},qn={label:`image`,requires:function(e){return e.peekByte()===44},parts:[{label:`code`,parser:L.readByte(),skip:!0},{label:`descriptor`,parts:[{label:`left`,parser:L.readUnsigned(!0)},{label:`top`,parser:L.readUnsigned(!0)},{label:`width`,parser:L.readUnsigned(!0)},{label:`height`,parser:L.readUnsigned(!0)},{label:`lct`,bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:`lct`,requires:function(e,t,n){return n.descriptor.lct.exists},parser:L.readArray(3,function(e,t,n){return 2**(n.descriptor.lct.size+1)})},{label:`data`,parts:[{label:`minCodeSize`,parser:L.readByte()},Gn]}]},Jn={label:`text`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===1},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`blockSize`,parser:L.readByte()},{label:`preData`,parser:function(e,t,n){return e.readBytes(n.text.blockSize)}},Gn]},Yn={label:`frames`,parts:[Kn,{label:`application`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===255},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`blockSize`,parser:L.readByte()},{label:`id`,parser:function(e,t,n){return e.readString(n.blockSize)}},Gn]},{label:`comment`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===254},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},Gn]},qn,Jn],loop:function(e){var t=e.peekByte();return t===33||t===44}},Xn=[{label:`header`,parts:[{label:`signature`,parser:L.readString(3)},{label:`version`,parser:L.readString(3)}]},{label:`lsd`,parts:[{label:`width`,parser:L.readUnsigned(!0)},{label:`height`,parser:L.readUnsigned(!0)},{label:`gct`,bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:`backgroundColorIndex`,parser:L.readByte()},{label:`pixelAspectRatio`,parser:L.readByte()}]},{label:`gct`,requires:function(e,t){return t.lsd.gct.exists},parser:L.readArray(3,function(e,t){return 2**(t.lsd.gct.size+1)})},Yn];function Zn(e){var t=new Un(new Uint8Array(e));this.raw=t.parse(Xn),this.raw.hasImages=!1;for(var n=0;n<this.raw.frames.length;n++)if(this.raw.frames[n].image){this.raw.hasImages=!0;break}}Zn.prototype.decompressFrame=function(e,t){if(e>=this.raw.frames.length)return null;var n=this.raw.frames[e];if(n.image){var r=n.image.descriptor.width*n.image.descriptor.height,i=o(n.image.data.minCodeSize,n.image.data.blocks,r);n.image.descriptor.lct.interlaced&&(i=s(i,n.image.descriptor.width));var a={pixels:i,dims:{top:n.image.descriptor.top,left:n.image.descriptor.left,width:n.image.descriptor.width,height:n.image.descriptor.height}};return n.image.descriptor.lct&&n.image.descriptor.lct.exists?a.colorTable=n.image.lct:a.colorTable=this.raw.gct,n.gce&&(a.delay=(n.gce.delay||10)*10,a.disposalType=n.gce.extras.disposal,n.gce.extras.transparentColorGiven&&(a.transparentIndex=n.gce.transparentColorIndex)),t&&(a.patch=c(a)),a}return null;function o(e,t,n){var r=4096,i=-1,a=n,o,s,c,l,u,d,f,p,m,h,g,ee,_,v,te,ne,y=Array(n),re=Array(r),ie=Array(r),b=Array(r+1);for(ee=e,s=1<<ee,u=s+1,o=s+2,f=i,l=ee+1,c=(1<<l)-1,m=0;m<s;m++)re[m]=0,ie[m]=m;for(g=p=_=v=ne=te=0,h=0;h<a;){if(v===0){if(p<l){g+=t[te]<<p,p+=8,te++;continue}if(m=g&c,g>>=l,p-=l,m>o||m==u)break;if(m==s){l=ee+1,c=(1<<l)-1,o=s+2,f=i;continue}if(f==i){b[v++]=ie[m],f=m,_=m;continue}for(d=m,m==o&&(b[v++]=_,m=f);m>s;)b[v++]=ie[m],m=re[m];_=ie[m]&255,b[v++]=_,o<r&&(re[o]=f,ie[o]=_,o++,(o&c)===0&&o<r&&(l++,c+=o)),f=d}v--,y[ne++]=b[v],h++}for(h=ne;h<a;h++)y[h]=0;return y}function s(e,t){for(var n=Array(e.length),r=e.length/t,i=function(r,i){var a=e.slice(i*t,(i+1)*t);n.splice.apply(n,[r*t,t].concat(a))},a=[0,4,2,1],o=[8,8,4,2],s=0,c=0;c<4;c++)for(var l=a[c];l<r;l+=o[c])i(l,s),s++;return n}function c(e){for(var t=e.pixels.length,n=new Uint8ClampedArray(t*4),r=0;r<t;r++){var i=r*4,a=e.pixels[r],o=e.colorTable[a];n[i]=o[0],n[i+1]=o[1],n[i+2]=o[2],n[i+3]=a===e.transparentIndex?0:255}return n}},Zn.prototype.decompressFrames=function(e,t,n){t===void 0&&(t=0),n=n===void 0?this.raw.frames.length:Math.min(n,this.raw.frames.length);for(var r=[],i=t;i<n;i++)this.raw.frames[i].image&&r.push(this.decompressFrame(i,e));return r};var Qn=Zn,$n=class e{static async create(t,n){let r=await fetch(t).then(e=>e.arrayBuffer()).then(e=>new Qn(e)),i=r.decompressFrames(!0,void 0,void 0),{width:a,height:o}=r.raw.lsd;return new e(i,a,o,n)}constructor(e,t,n,r){this.frames=[],this.index=0,this.playTime=0,this.frames=e,this.canvas=document.createElement(`canvas`),this.ctx=this.canvas.getContext(`2d`),this.pixelRatio=r,this.canvas.width=t,this.canvas.height=n,this.startTime=Date.now()}getCanvas(){return this.canvas}update(){let e=Date.now()-this.startTime;for(;this.playTime<e;){let e=this.frames[this.index%this.frames.length];this.playTime+=e.delay,this.index++}let t=this.frames[this.index%this.frames.length],n=new ImageData(t.patch,t.dims.width,t.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(n,t.dims.left,t.dims.top)}},er=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},tr,nr,rr,ir,ar,or=class{constructor(e,t=!1){this.isContextLost=!1,tr.set(this,new Set),nr.set(this,new Set),rr.set(this,new Set),ir.set(this,e=>{e.preventDefault(),this.isContextLost=!0;for(let e of er(this,nr,`f`))e()}),ar.set(this,()=>{this.isContextLost=!1;let e=this.gl;e.getExtension(`EXT_color_buffer_float`),e.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!e.getExtension(`EXT_float_blend`);for(let e of er(this,tr,`f`))e.restore();for(let e of er(this,rr,`f`))e()});let n=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:t});if(!n)throw Error(`[VFX-JS] WebGL2 is not available.`);this.gl=n,this.canvas=e,n.getExtension(`EXT_color_buffer_float`),n.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!n.getExtension(`EXT_float_blend`),this.floatLinearFilter=!!n.getExtension(`OES_texture_float_linear`),this.maxTextureSize=n.getParameter(n.MAX_TEXTURE_SIZE),e.addEventListener(`webglcontextlost`,er(this,ir,`f`),!1),e.addEventListener(`webglcontextrestored`,er(this,ar,`f`),!1)}setSize(e,t,n){let r=Math.floor(e*n),i=Math.floor(t*n);(this.canvas.width!==r||this.canvas.height!==i)&&(this.canvas.width=r,this.canvas.height=i)}addResource(e){er(this,tr,`f`).add(e)}removeResource(e){er(this,tr,`f`).delete(e)}onContextLost(e){return er(this,nr,`f`).add(e),()=>er(this,nr,`f`).delete(e)}onContextRestored(e){return er(this,rr,`f`).add(e),()=>er(this,rr,`f`).delete(e)}};tr=new WeakMap,nr=new WeakMap,rr=new WeakMap,ir=new WeakMap,ar=new WeakMap;var sr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},cr=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},lr,ur,dr,fr,pr=class{constructor(e){lr.add(this),ur.set(this,void 0),dr.set(this,void 0),sr(this,ur,e,`f`),this.gl=e.gl,cr(this,lr,`m`,fr).call(this),e.addResource(this)}restore(){cr(this,lr,`m`,fr).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){cr(this,ur,`f`).removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(cr(this,dr,`f`))}};ur=new WeakMap,dr=new WeakMap,lr=new WeakSet,fr=function(){let e=this.gl,t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw Error(`[VFX-JS] Failed to create quad VAO`);this.vao=t,sr(this,dr,n,`f`);let r=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)};function mr(e,t,n,r={}){return new Se(e,t,n,{float:r.float??!1})}function hr(n,r){let i=r.renderingToBuffer??!1,a;a=i?`none`:r.premultipliedAlpha?`premultiplied`:`normal`;let o=r.glslVersion??He(r.fragmentShader);return new Ye(n,r.vertexShader??(o===`100`?t:e),r.fragmentShader,r.uniforms,a,o)}var gr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},R=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},z,_r,vr,yr,br,xr,Sr=class{constructor(e,t,n,r,i,a,o,s){if(z.set(this,void 0),_r.set(this,void 0),vr.set(this,void 0),yr.set(this,void 0),br.set(this,void 0),xr.set(this,void 0),gr(this,yr,r??!1,`f`),gr(this,br,i??!1,`f`),gr(this,xr,a,`f`),gr(this,_r,{},`f`),gr(this,z,{src:{value:null},offset:{value:new je},resolution:{value:new je},viewport:{value:new Me},time:{value:0},mouse:{value:new je},passIndex:{value:0}},`f`),n)for(let[e,t]of Object.entries(n))typeof t==`function`?(R(this,_r,`f`)[e]=t,R(this,z,`f`)[e]={value:t()}):R(this,z,`f`)[e]={value:t};this.pass=hr(e,{fragmentShader:t,uniforms:R(this,z,`f`),renderingToBuffer:o??!1,premultipliedAlpha:!0,glslVersion:s})}get uniforms(){return R(this,z,`f`)}setUniforms(e,t,n,r,i,a){R(this,z,`f`).src.value=e,R(this,z,`f`).resolution.value.set(n.w*t,n.h*t),R(this,z,`f`).offset.value.set(n.x*t,n.y*t),R(this,z,`f`).time.value=r,R(this,z,`f`).mouse.value.set(i*t,a*t)}updateCustomUniforms(e){for(let[e,t]of Object.entries(R(this,_r,`f`)))R(this,z,`f`)[e]&&(R(this,z,`f`)[e].value=t());if(e)for(let[t,n]of Object.entries(e))R(this,z,`f`)[t]&&(R(this,z,`f`)[t].value=n())}initializeBackbuffer(e,t,n,r){R(this,yr,`f`)&&!R(this,vr,`f`)&&(R(this,xr,`f`)?gr(this,vr,new Ae(e,R(this,xr,`f`)[0],R(this,xr,`f`)[1],1,R(this,br,`f`)),`f`):gr(this,vr,new Ae(e,t,n,r,R(this,br,`f`)),`f`))}resizeBackbuffer(e,t){R(this,vr,`f`)&&!R(this,xr,`f`)&&R(this,vr,`f`).resize(e,t)}registerBufferUniform(e){R(this,z,`f`)[e]||(R(this,z,`f`)[e]={value:null})}get backbuffer(){return R(this,vr,`f`)}get persistent(){return R(this,yr,`f`)}get float(){return R(this,br,`f`)}get size(){return R(this,xr,`f`)}dispose(){this.pass.dispose(),R(this,vr,`f`)?.dispose()}};z=new WeakMap,_r=new WeakMap,vr=new WeakMap,yr=new WeakMap,br=new WeakMap,xr=new WeakMap;var Cr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},wr=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Tr,Er,Dr=class{constructor(e){Tr.set(this,void 0),Er.set(this,new Map),Cr(this,Tr,e,`f`)}get(e,t,n){let r=`${t}\0${e}\0${n??``}`,i=wr(this,Er,`f`).get(r);return i||(i=new Ue(wr(this,Tr,`f`),e,t,n),wr(this,Er,`f`).set(r,i)),i}get size(){return wr(this,Er,`f`).size}dispose(){for(let e of wr(this,Er,`f`).values())e.dispose();wr(this,Er,`f`).clear()}};Tr=new WeakMap,Er=new WeakMap;var B=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},V=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},H,Or,kr,U,Ar,jr,Mr,W,G,K,Nr,q,Pr,Fr,Ir,Lr,Rr,zr,J,Y,Br,Vr,Hr,Ur,X,Wr,Gr,Kr,qr,Jr,Yr,Xr,Zr,Qr,$r,ei,ti,ni,ri,ii,ai,oi,si,ci,li,ui,Z,di,fi,pi,mi,hi,gi,_i=new Map,vi=class{constructor(e,t){H.add(this),Or.set(this,void 0),kr.set(this,void 0),U.set(this,void 0),Ar.set(this,void 0),jr.set(this,void 0),Mr.set(this,void 0),W.set(this,void 0),G.set(this,[]),K.set(this,void 0),Nr.set(this,new Map),q.set(this,null),Pr.set(this,!1),Fr.set(this,new WeakSet),Ir.set(this,{}),Lr.set(this,{}),Rr.set(this,0),zr.set(this,void 0),J.set(this,2),Y.set(this,[]),Br.set(this,0),Vr.set(this,1),Hr.set(this,Date.now()/1e3),Ur.set(this,!1),X.set(this,un(0)),Wr.set(this,un(0)),Gr.set(this,[0,0]),Kr.set(this,0),qr.set(this,0),Jr.set(this,0),Yr.set(this,0),Xr.set(this,new WeakMap),Qr.set(this,async()=>{if(typeof window<`u`){for(let e of V(this,Y,`f`))if(e.type===`text`&&e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await V(this,H,`m`,ei).call(this,e),e.width=n,e.height=r)}for(let e of V(this,Y,`f`))if(e.type===`text`&&!e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await V(this,H,`m`,ei).call(this,e),e.width=n,e.height=r)}}}),$r.set(this,e=>{typeof window<`u`&&(B(this,Jr,e.clientX,`f`),B(this,Yr,window.innerHeight-e.clientY,`f`))}),ri.set(this,()=>{this.isPlaying()&&(this.render(),B(this,zr,requestAnimationFrame(V(this,ri,`f`)),`f`))}),B(this,Or,e,`f`),B(this,kr,t,`f`),B(this,U,new or(t,e.preserveDrawingBuffer),`f`),B(this,Ar,V(this,U,`f`).gl,`f`),V(this,Ar,`f`).clearColor(0,0,0,0),B(this,J,e.pixelRatio,`f`),B(this,Vr,e.timeScale,`f`),B(this,Hr,Date.now()/1e3,`f`),B(this,jr,new pr(V(this,U,`f`)),`f`),B(this,Mr,new Dr(V(this,U,`f`)),`f`),typeof window<`u`&&(window.addEventListener(`resize`,V(this,Qr,`f`)),window.addEventListener(`pointermove`,V(this,$r,`f`))),V(this,Qr,`f`).call(this),B(this,W,new Qe(V(this,U,`f`)),`f`),V(this,H,`m`,fi).call(this,e.postEffects),V(this,U,`f`).onContextRestored(()=>{V(this,Ar,`f`).clearColor(0,0,0,0)})}destroy(){this.stop(),typeof window<`u`&&(window.removeEventListener(`resize`,V(this,Qr,`f`)),window.removeEventListener(`pointermove`,V(this,$r,`f`))),V(this,K,`f`)?.dispose();for(let e of V(this,Nr,`f`).values())e?.dispose();for(let e of V(this,G,`f`))e.pass.dispose();V(this,q,`f`)&&(V(this,q,`f`).dispose(),B(this,q,null,`f`),B(this,Pr,!1,`f`)),V(this,W,`f`).dispose(),V(this,Mr,`f`).dispose(),V(this,jr,`f`).dispose()}async addElement(e,t={},n){if(t.effect!==void 0)return V(this,H,`m`,ti).call(this,e,t,t.effect,n);let r=V(this,H,`m`,ni).call(this,t),i=e.getBoundingClientRect(),a=Di(e)?fn(i):dn(i),[s,c]=xi(t.overflow),l=pn(a,c),u=Si(t.intersection),d=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),f,p,m=!1;if(e instanceof HTMLImageElement){p=`img`;let t=o(e);if(m=!!t.match(/\.gif/i),m){let n=await $n.create(t,V(this,J,`f`));_i.set(e,n),f=new x(V(this,U,`f`),n.getCanvas())}else{let e=await ge(t);f=new x(V(this,U,`f`),e)}}else if(e instanceof HTMLVideoElement)f=new x(V(this,U,`f`),e),p=`video`;else if(e instanceof HTMLCanvasElement)e.hasAttribute(`layoutsubtree`)&&n?(f=new x(V(this,U,`f`),n),p=`hic`):(f=new x(V(this,U,`f`),e),p=`canvas`);else{let t=await et(e,d,void 0,this.maxTextureSize);f=new x(V(this,U,`f`),t),p=`text`}let[h,g]=Ti(t.wrap);f.wrapS=h,f.wrapT=g,f.needsUpdate=!0;let ee=t.autoCrop??!0;if(p!==`hic`&&t.overlay!==!0)if(typeof t.overlay==`number`)e.style.setProperty(`opacity`,t.overlay.toString());else{let t=p===`video`?`0.0001`:`0`;e.style.setProperty(`opacity`,t.toString())}let _={src:{value:f},resolution:{value:new je},offset:{value:new je},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},mouse:{value:new je},intersection:{value:0},viewport:{value:new Me},autoCrop:{value:ee}},v={};if(t.uniforms!==void 0)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(_[e]={value:n()},v[e]=n):_[e]={value:n};let te;t.backbuffer&&(te=(()=>{let e=(l.right-l.left)*V(this,J,`f`),t=(l.bottom-l.top)*V(this,J,`f`);return new Ae(V(this,U,`f`),e,t,V(this,J,`f`),!1)})(),_.backbuffer={value:te.texture});let ne=new Map,y=new Map;for(let e=0;e<r.length-1;e++){let t=r[e].target??`pass${e}`;r[e]={...r[e],target:t};let n=r[e].size,i=n?n[0]:(l.right-l.left)*V(this,J,`f`),a=n?n[1]:(l.bottom-l.top)*V(this,J,`f`);if(r[e].persistent){let i=n?1:V(this,J,`f`),a=n?n[0]:l.right-l.left,o=n?n[1]:l.bottom-l.top;y.set(t,new Ae(V(this,U,`f`),a,o,i,r[e].float))}else ne.set(t,mr(V(this,U,`f`),i,a,{float:r[e].float}))}let re=[];for(let e=0;e<r.length;e++){let t=r[e],n=t.frag,i={..._},a={};for(let[e,r]of ne)e!==t.target&&n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:r.texture});for(let[e,t]of y)n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:t.texture});if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(i[e]={value:n()},a[e]=n):i[e]={value:n};let o=hr(V(this,U,`f`),{vertexShader:t.vert,fragmentShader:n,uniforms:i,renderingToBuffer:t.target!==void 0,glslVersion:t.glslVersion});re.push({pass:o,uniforms:i,uniformGenerators:{...v,...a},target:t.target,persistent:t.persistent,float:t.float,size:t.size,backbuffer:t.target?y.get(t.target):void 0})}let ie=V(this,Br,`f`),b={type:p,element:e,isInViewport:!1,isInLogicalViewport:!1,width:a.right-a.left,height:a.bottom-a.top,passes:re,bufferTargets:ne,startTime:ie,enterTime:ie,leaveTime:-1/0,release:t.release??1/0,isGif:m,isFullScreen:s,overflow:c,intersection:u,originalOpacity:d,srcTexture:f,zIndex:t.zIndex??0,backbuffer:te,autoCrop:ee};V(this,H,`m`,li).call(this,b,a,ie),V(this,Y,`f`).push(b),V(this,Y,`f`).sort((e,t)=>e.zIndex-t.zIndex)}async updateElementEffects(e,t){let n=V(this,Y,`f`).find(t=>t.element===e);if(!n)throw Error(`[VFX-JS] updateElementEffects: element not registered`);if(!n.chain)throw Error(`[VFX-JS] updateElementEffects: element is on the shader path; effect-only updates are not supported`);let r=Array.isArray(t)?[...t]:[t],i=n.chain.effects,a=new Set(i),o=[];for(let e of r)if(!a.has(e)){if(V(this,Fr,`f`).has(e))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");o.push(e)}await n.chain.replaceEffects(r);let s=new Set(r);for(let e of i)s.has(e)||V(this,Fr,`f`).delete(e);for(let e of o)V(this,Fr,`f`).add(e)}removeElement(e){let t=V(this,Y,`f`).findIndex(t=>t.element===e);if(t!==-1){let n=V(this,Y,`f`).splice(t,1)[0];if(n.chain)V(this,H,`m`,si).call(this,n.chain.effects),n.chain.dispose();else{for(let e of n.bufferTargets.values())e.dispose();for(let e of n.passes)e.pass.dispose(),e.backbuffer?.dispose();n.backbuffer?.dispose()}n.srcTexture.dispose(),e.style.setProperty(`opacity`,n.originalOpacity.toString())}}updateTextElement(e){let t=V(this,Y,`f`).findIndex(t=>t.element===e);return t===-1?Promise.resolve():V(this,H,`m`,ei).call(this,V(this,Y,`f`)[t])}async updateImageElement(e){let t=V(this,Y,`f`).find(t=>t.element===e);if(!t||t.type!==`img`||t.isGif)return;let n=await ge(o(e)),r=t.srcTexture,i=new x(V(this,U,`f`),n);i.wrapS=r.wrapS,i.wrapT=r.wrapT,i.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=i),t.srcTexture=i,r.dispose()}updateCanvasElement(e){let t=V(this,Y,`f`).find(t=>t.element===e);if(t){let n=t.srcTexture,r=new x(V(this,U,`f`),e);r.wrapS=n.wrapS,r.wrapT=n.wrapT,r.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=r),t.srcTexture=r,n.dispose()}}updateHICTexture(e,t){let n=V(this,Y,`f`).find(t=>t.element===e);if(!n||n.type!==`hic`)return;let r=n.srcTexture;if(r.source===t)r.needsUpdate=!0;else{let e=new x(V(this,U,`f`),t);e.wrapS=r.wrapS,e.wrapT=r.wrapT,e.needsUpdate=!0,!n.chain&&n.passes.length>0&&(n.passes[0].uniforms.src.value=e),n.srcTexture=e,r.dispose()}}get maxTextureSize(){return V(this,U,`f`).maxTextureSize}isPlaying(){return V(this,zr,`f`)!==void 0}play(){this.isPlaying()||(B(this,Hr,Date.now()/1e3,`f`),B(this,zr,requestAnimationFrame(V(this,ri,`f`)),`f`))}get time(){return V(this,Br,`f`)}setTime(e){B(this,Br,e,`f`),B(this,Ur,!0,`f`)}get timeScale(){return V(this,Vr,`f`)}set timeScale(e){B(this,Vr,e,`f`)}stop(){V(this,zr,`f`)!==void 0&&(cancelAnimationFrame(V(this,zr,`f`)),B(this,zr,void 0,`f`))}render(){let e=Date.now()/1e3;V(this,Ur,`f`)?B(this,Ur,!1,`f`):B(this,Br,V(this,Br,`f`)+(e-V(this,Hr,`f`))*V(this,Vr,`f`),`f`),B(this,Hr,e,`f`);let t=V(this,Br,`f`),n=V(this,Ar,`f`);V(this,H,`m`,Zr).call(this),n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,V(this,kr,`f`).width,V(this,kr,`f`).height),n.clear(n.COLOR_BUFFER_BIT);let r=V(this,X,`f`).right-V(this,X,`f`).left,i=V(this,X,`f`).bottom-V(this,X,`f`).top,a=Te(0,0,r,i),o=V(this,H,`m`,ai).call(this);o&&(V(this,H,`m`,gi).call(this,r,i),V(this,K,`f`)&&(n.bindFramebuffer(n.FRAMEBUFFER,V(this,K,`f`).fbo),n.clear(n.COLOR_BUFFER_BIT),n.bindFramebuffer(n.FRAMEBUFFER,null)));for(let e of V(this,Y,`f`)){let n=e.element.getBoundingClientRect(),s=e.type===`text`?fn(n):dn(n),c=V(this,H,`m`,li).call(this,e,s,t);if(!c.isVisible)continue;if(e.chain){V(this,H,`m`,ii).call(this,e,s,c,t);continue}let l=e.passes[0].uniforms;l.time.value=t-e.startTime,l.resolution.value.set((s.right-s.left)*V(this,J,`f`),(s.bottom-s.top)*V(this,J,`f`)),l.mouse.value.set((V(this,Jr,`f`)+V(this,Kr,`f`))*V(this,J,`f`),(V(this,Yr,`f`)+V(this,qr,`f`))*V(this,J,`f`));for(let t of e.passes)for(let[e,n]of Object.entries(t.uniformGenerators))t.uniforms[e].value=n();_i.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(l.src.value.needsUpdate=!0);let u=we(s,i,V(this,Kr,`f`),V(this,qr,`f`)),d=we(c.rectWithOverflow,i,V(this,Kr,`f`),V(this,qr,`f`));e.backbuffer&&(e.passes[0].uniforms.backbuffer.value=e.backbuffer.texture);{let t=e.isFullScreen?a:d,n=Math.max(1,t.w*V(this,J,`f`)),r=Math.max(1,t.h*V(this,J,`f`)),i=Math.max(1,t.w),o=Math.max(1,t.h);for(let t=0;t<e.passes.length-1;t++){let a=e.passes[t];if(!a.size)if(a.backbuffer)a.backbuffer.resize(i,o);else{let t=e.bufferTargets.get(a.target);t&&(t.width!==n||t.height!==r)&&t.setSize(n,r)}}}let f=new Map;for(let t of e.passes)t.backbuffer&&t.target&&f.set(t.target,t.backbuffer.texture);let p=e.srcTexture,m=V(this,Jr,`f`)+V(this,Kr,`f`)-u.x,h=V(this,Yr,`f`)+V(this,qr,`f`)-u.y;for(let t=0;t<e.passes.length-1;t++){let n=e.passes[t],r=e.isFullScreen?a:d;n.uniforms.src.value=p;for(let[e,t]of f)n.uniforms[e]&&(n.uniforms[e].value=t);for(let[e,t]of Object.entries(n.uniformGenerators))n.uniforms[e]&&(n.uniforms[e].value=t());let i=n.size?n.size[0]:r.w*V(this,J,`f`),o=n.size?n.size[1]:r.h*V(this,J,`f`),s=n.size?Te(0,0,n.size[0],n.size[1]):Te(0,0,r.w,r.h);if(n.uniforms.resolution.value.set(i,o),n.uniforms.offset.value.set(0,0),n.uniforms.mouse.value.set(m/r.w*i,h/r.h*o),n.backbuffer)V(this,H,`m`,Z).call(this,n.pass,n.backbuffer.target,s,n.uniforms,!0),n.backbuffer.swap(),p=n.backbuffer.texture;else{let t=e.bufferTargets.get(n.target);if(!t)continue;V(this,H,`m`,Z).call(this,n.pass,t,s,n.uniforms,!0),p=t.texture}n.target&&f.set(n.target,p)}let g=e.passes[e.passes.length-1];g.uniforms.src.value=p,g.uniforms.resolution.value.set(n.width*V(this,J,`f`),n.height*V(this,J,`f`)),g.uniforms.offset.value.set(u.x*V(this,J,`f`),u.y*V(this,J,`f`)),g.uniforms.mouse.value.set((V(this,Jr,`f`)+V(this,Kr,`f`))*V(this,J,`f`),(V(this,Yr,`f`)+V(this,qr,`f`))*V(this,J,`f`));for(let[e,t]of f)g.uniforms[e]&&(g.uniforms[e].value=t);for(let[e,t]of Object.entries(g.uniformGenerators))g.uniforms[e]&&(g.uniforms[e].value=t());e.backbuffer?(g.uniforms.backbuffer.value=e.backbuffer.texture,e.isFullScreen?(e.backbuffer.resize(r,i),V(this,H,`m`,di).call(this,e,u.x,u.y),V(this,H,`m`,Z).call(this,g.pass,e.backbuffer.target,a,g.uniforms,!0),e.backbuffer.swap(),V(this,W,`f`).setUniforms(e.backbuffer.texture,V(this,J,`f`),a),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,o&&V(this,K,`f`)||null,a,V(this,W,`f`).uniforms,!1)):(e.backbuffer.resize(d.w,d.h),V(this,H,`m`,di).call(this,e,e.overflow.left,e.overflow.bottom),V(this,H,`m`,Z).call(this,g.pass,e.backbuffer.target,e.backbuffer.getViewport(),g.uniforms,!0),e.backbuffer.swap(),V(this,W,`f`).setUniforms(e.backbuffer.texture,V(this,J,`f`),d),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,o&&V(this,K,`f`)||null,d,V(this,W,`f`).uniforms,!1))):(V(this,H,`m`,di).call(this,e,u.x,u.y),V(this,H,`m`,Z).call(this,g.pass,o&&V(this,K,`f`)||null,e.isFullScreen?a:d,g.uniforms,!1))}o&&V(this,K,`f`)&&(V(this,q,`f`)&&V(this,Pr,`f`)?V(this,H,`m`,mi).call(this,a,t):V(this,H,`m`,hi).call(this,a,t))}};Or=new WeakMap,kr=new WeakMap,U=new WeakMap,Ar=new WeakMap,jr=new WeakMap,Mr=new WeakMap,W=new WeakMap,G=new WeakMap,K=new WeakMap,Nr=new WeakMap,q=new WeakMap,Pr=new WeakMap,Fr=new WeakMap,Ir=new WeakMap,Lr=new WeakMap,Rr=new WeakMap,zr=new WeakMap,J=new WeakMap,Y=new WeakMap,Br=new WeakMap,Vr=new WeakMap,Hr=new WeakMap,Ur=new WeakMap,X=new WeakMap,Wr=new WeakMap,Gr=new WeakMap,Kr=new WeakMap,qr=new WeakMap,Jr=new WeakMap,Yr=new WeakMap,Xr=new WeakMap,Qr=new WeakMap,$r=new WeakMap,ri=new WeakMap,H=new WeakSet,Zr=function(){if(typeof window>`u`)return;let e=V(this,kr,`f`).ownerDocument,t=e.compatMode===`BackCompat`?e.body:e.documentElement,n=t.clientWidth,r=t.clientHeight,i=window.scrollX,a=window.scrollY,o,s;if(V(this,Or,`f`).fixedCanvas)o=0,s=0;else if(V(this,Or,`f`).wrapper)o=n*V(this,Or,`f`).scrollPadding[0],s=r*V(this,Or,`f`).scrollPadding[1];else{let t=e.body.scrollWidth-(i+n),c=e.body.scrollHeight-(a+r);o=Ei(n*V(this,Or,`f`).scrollPadding[0],0,t),s=Ei(r*V(this,Or,`f`).scrollPadding[1],0,c)}let c=n+o*2,l=r+s*2;(c!==V(this,Gr,`f`)[0]||l!==V(this,Gr,`f`)[1])&&(V(this,kr,`f`).style.width=`${c}px`,V(this,kr,`f`).style.height=`${l}px`,V(this,U,`f`).setSize(c,l,V(this,J,`f`)),B(this,X,un({top:-s,left:-o,right:n+o,bottom:r+s}),`f`),B(this,Wr,un({top:0,left:0,right:n,bottom:r}),`f`),B(this,Gr,[c,l],`f`),B(this,Kr,o,`f`),B(this,qr,s,`f`)),V(this,Or,`f`).fixedCanvas||V(this,kr,`f`).style.setProperty(`transform`,`translate(${i-o}px, ${a-s}px)`)},ei=async function(e){if(!V(this,Xr,`f`).get(e.element)){V(this,Xr,`f`).set(e.element,!0);try{let t=e.srcTexture,n=t.source instanceof OffscreenCanvas?t.source:void 0,r=await et(e.element,e.originalOpacity,n,this.maxTextureSize);if(r.width===0||r.height===0)return;let i=new x(V(this,U,`f`),r);i.wrapS=t.wrapS,i.wrapT=t.wrapT,i.needsUpdate=!0,!e.chain&&e.passes.length>0&&(e.passes[0].uniforms.src.value=i),e.srcTexture=i,t.dispose()}catch(e){console.error(e)}finally{V(this,Xr,`f`).set(e.element,!1)}}},ti=async function(e,t,n,r){t.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified; `effect` takes precedence."),t.overflow!==void 0&&console.warn("[VFX-JS] `overflow` is shader-path only and is ignored by the effect path. Use each effect's own `outputRect` (with `dims.canvasRect` for fullscreen) to control its dst rect.");let i=Array.isArray(n)?[...n]:[n];V(this,H,`m`,oi).call(this,i);let a=e.getBoundingClientRect(),s=Di(e)?fn(a):dn(a),[c,l]=xi(t.overflow),u=Si(t.intersection),d=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),f,p,m=!1;if(e instanceof HTMLImageElement){p=`img`;let t=o(e);if(m=!!t.match(/\.gif/i),m){let n=await $n.create(t,V(this,J,`f`));_i.set(e,n),f=new x(V(this,U,`f`),n.getCanvas())}else{let e=await ge(t);f=new x(V(this,U,`f`),e)}}else if(e instanceof HTMLVideoElement)f=new x(V(this,U,`f`),e),p=`video`;else if(e instanceof HTMLCanvasElement)e.hasAttribute(`layoutsubtree`)&&r?(f=new x(V(this,U,`f`),r),p=`hic`):(f=new x(V(this,U,`f`),e),p=`canvas`);else{let t=await et(e,d,void 0,this.maxTextureSize);f=new x(V(this,U,`f`),t),p=`text`}let[h,g]=Ti(t.wrap);f.wrapS=h,f.wrapT=g,f.needsUpdate=!0;let ee=t.autoCrop??!0;if(p!==`hic`&&t.overlay!==!0)if(typeof t.overlay==`number`)e.style.setProperty(`opacity`,t.overlay.toString());else{let t=p===`video`?`0.0001`:`0`;e.style.setProperty(`opacity`,t.toString())}let _=V(this,Br,`f`),v={type:p,element:e,isInViewport:!1,isInLogicalViewport:!1,width:s.right-s.left,height:s.bottom-s.top,passes:[],bufferTargets:new Map,startTime:_,enterTime:_,leaveTime:-1/0,release:t.release??1/0,isGif:m,isFullScreen:c,overflow:l,intersection:u,originalOpacity:d,srcTexture:f,zIndex:t.zIndex??0,backbuffer:void 0,autoCrop:ee,effectLastRenderTime:_},te=rn(()=>v.srcTexture,()=>Ci(v.srcTexture,`w`),()=>Ci(v.srcTexture,`h`)),ne={},y={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(y[e]=n,ne[e]=n()):ne[e]=n;v.effectUniformGenerators=y,v.effectStaticUniforms=ne;let re={autoCrop:ee,glslVersion:t.glslVersion??`300 es`},ie=new Vn(V(this,U,`f`),V(this,jr,`f`),V(this,J,`f`),i,re,te,!1,V(this,Mr,`f`));try{await ie.initAll()}catch(t){throw V(this,H,`m`,si).call(this,i),f.dispose(),e.style.setProperty(`opacity`,d.toString()),t}v.chain=ie,V(this,H,`m`,li).call(this,v,s,_),V(this,Y,`f`).push(v),V(this,Y,`f`).sort((e,t)=>e.zIndex-t.zIndex)},ni=function(e){let t=t=>t.glslVersion===void 0&&e.glslVersion!==void 0?{...t,glslVersion:e.glslVersion}:t;return Array.isArray(e.shader)?e.shader.map(t):[t({frag:V(this,H,`m`,ui).call(this,e.shader||`uvGradient`)})]},ii=function(e,t,n,r){let i=e.chain;if(!i)return;let a=V(this,J,`f`);_i.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(e.srcTexture.needsUpdate=!0);let o={...e.effectStaticUniforms??{}};if(e.effectUniformGenerators)for(let[t,n]of Object.entries(e.effectUniformGenerators))o[t]=n();let s=V(this,X,`f`).right-V(this,X,`f`).left,c=V(this,X,`f`).bottom-V(this,X,`f`).top,l=we(t,c,V(this,Kr,`f`),V(this,qr,`f`)),u=V(this,Jr,`f`)+V(this,Kr,`f`)-l.x,d=V(this,Yr,`f`)+V(this,qr,`f`)-l.y,f=t.right-t.left,p=t.bottom-t.top,m=r-(e.effectLastRenderTime??r);e.effectLastRenderTime=r;let h=V(this,H,`m`,ai).call(this)&&V(this,K,`f`)?on(V(this,K,`f`)):null;i.run({time:r-e.startTime,deltaTime:m,mouse:[u*a,d*a],mouseViewport:[V(this,Jr,`f`)*a,V(this,Yr,`f`)*a],intersection:n.intersection,enterTime:r-e.enterTime,leaveTime:r-e.leaveTime,resolvedUniforms:o,canvasSize:[s,c],canvasBufferSize:[s*a,c*a],elementSize:[f,p],elementBufferSize:[f*a,p*a],elementRectOnCanvasPx:{x:l.x*a,y:l.y*a,w:l.w*a,h:l.h*a},finalTarget:h,isVisible:n.isVisible})},ai=function(){return V(this,G,`f`).length>0||V(this,q,`f`)!==null&&V(this,Pr,`f`)},oi=function(e){for(let t of e)if(V(this,Fr,`f`).has(t))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");for(let t of e)V(this,Fr,`f`).add(t)},si=function(e){for(let t of e)V(this,Fr,`f`).delete(t)},ci=function(e){let t=e.hitTestPadBuffer,n=V(this,J,`f`);return cn({top:t.top/n,right:t.right/n,bottom:t.bottom/n,left:t.left/n})},li=function(e,t,n){let r=pn(t,e.chain?V(this,H,`m`,ci).call(this,e.chain):e.overflow),i=e.isFullScreen||yi(V(this,Wr,`f`),r),a=pn(V(this,Wr,`f`),e.intersection.rootMargin),o=gn(a,t),s=e.isFullScreen||bi(a,t,o,e.intersection.threshold);!e.isInLogicalViewport&&s&&(e.enterTime=n,e.leaveTime=1/0),e.isInLogicalViewport&&!s&&(e.leaveTime=n),e.isInViewport=i,e.isInLogicalViewport=s;let c=i&&n-e.leaveTime<=e.release;if(c&&!e.chain&&e.passes.length>0){let t=e.passes[0].uniforms;t.intersection.value=o,t.enterTime.value=n-e.enterTime,t.leaveTime.value=n-e.leaveTime}return{isVisible:c,intersection:o,rectWithOverflow:r}},ui=function(e){return e in a?a[e]:e},Z=function(e,t,n,r,i){let a=V(this,Ar,`f`);i&&t!==null&&t!==V(this,K,`f`)&&(a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.viewport(0,0,t.width,t.height),a.clear(a.COLOR_BUFFER_BIT));let o=r.viewport;o&&o.value instanceof Me&&o.value.set(n.x*V(this,J,`f`),n.y*V(this,J,`f`),n.w*V(this,J,`f`),n.h*V(this,J,`f`));try{Xe(a,V(this,jr,`f`),e,t,n,V(this,Gr,`f`)[0],V(this,Gr,`f`)[1],V(this,J,`f`))}catch(e){console.error(e)}},di=function(e,t,n){let r=e.passes[0].uniforms.offset.value;r.x=t*V(this,J,`f`),r.y=n*V(this,J,`f`)},fi=function(e){let t=e.length===1&&!(`frag`in e[0])?e[0]:null;if(t&&t.effect!==void 0){V(this,H,`m`,pi).call(this,t,t.effect);return}let n=[],r=[];for(let t of e)`frag`in t&&r.push(t);for(let e=0;e<r.length-1;e++)r[e].target||(r[e]={...r[e],target:`pass${e}`});for(let t of e){let e,r,i;if(`frag`in t)e=t.frag,r=new Sr(V(this,U,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,t.size,t.target!==void 0,t.glslVersion),i=t.target;else{if(t.shader===void 0)throw Error("VFXPostEffect requires `shader` (the `effect` path is not implemented yet).");e=V(this,H,`m`,ui).call(this,t.shader),r=new Sr(V(this,U,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,void 0,!1,t.glslVersion),t.persistent&&r.registerBufferUniform(`backbuffer`),i=void 0}n.push(e);let a={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`&&(a[e]=n);V(this,G,`f`).push({pass:r,target:i,generators:a})}for(let e of r)e.target&&V(this,Nr,`f`).set(e.target,void 0);let i=V(this,G,`f`).map(e=>e.target).filter(e=>e!==void 0);for(let e=0;e<V(this,G,`f`).length;e++)for(let t of i)n[e].match(RegExp(`uniform\\s+sampler2D\\s+${t}\\b`))&&V(this,G,`f`)[e].pass.registerBufferUniform(t)},pi=function(e,t){e.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified on post-effect; `effect` takes precedence.");let n=Array.isArray(t)?[...t]:[t];V(this,H,`m`,oi).call(this,n);let r=rn(()=>{let e=V(this,K,`f`);if(!e)throw Error(`[VFX-JS] post-effect chain active without target`);return e.texture},()=>V(this,K,`f`)?.width??0,()=>V(this,K,`f`)?.height??0),i={autoCrop:!0,glslVersion:e.glslVersion??`300 es`},a=new Vn(V(this,U,`f`),V(this,jr,`f`),V(this,J,`f`),n,i,r,!0,V(this,Mr,`f`));if(e.uniforms)for(let[t,n]of Object.entries(e.uniforms))typeof n==`function`?(V(this,Lr,`f`)[t]=n,V(this,Ir,`f`)[t]=n()):V(this,Ir,`f`)[t]=n;B(this,q,a,`f`),B(this,Rr,V(this,Br,`f`),`f`),a.initAll().then(()=>{V(this,q,`f`)===a&&B(this,Pr,!0,`f`)}).catch(e=>{console.error(`[VFX-JS] Post-effect init failed; post-effect disabled:`,e),V(this,q,`f`)===a&&(V(this,H,`m`,si).call(this,V(this,q,`f`).effects),V(this,q,`f`).dispose(),B(this,q,null,`f`),B(this,Pr,!1,`f`))})},mi=function(e,t){let n=V(this,q,`f`);if(!n)return;let r=V(this,J,`f`),i={...V(this,Ir,`f`)};for(let[e,t]of Object.entries(V(this,Lr,`f`)))i[e]=t();let a=V(this,X,`f`).right-V(this,X,`f`).left,o=V(this,X,`f`).bottom-V(this,X,`f`).top,s=t-V(this,Rr,`f`);B(this,Rr,t,`f`);let c=[a,o],l=[a*r,o*r],u={x:e.x*r,y:e.y*r,w:e.w*r,h:e.h*r};n.run({time:t,deltaTime:s,mouse:[V(this,Jr,`f`)*r,V(this,Yr,`f`)*r],mouseViewport:[V(this,Jr,`f`)*r,V(this,Yr,`f`)*r],intersection:1,enterTime:0,leaveTime:0,resolvedUniforms:i,canvasSize:c,canvasBufferSize:l,elementSize:c,elementBufferSize:l,elementRectOnCanvasPx:u,finalTarget:null,isVisible:!0})},hi=function(e,t){if(!V(this,K,`f`))return;let n=V(this,K,`f`).texture,r=new Map;for(let{pass:e,target:t}of V(this,G,`f`))t&&e.backbuffer&&r.set(t,e.backbuffer.texture);for(let i=0;i<V(this,G,`f`).length;i++){let{pass:a,target:o,generators:s}=V(this,G,`f`)[i],c=i===V(this,G,`f`).length-1,l=V(this,Jr,`f`)+V(this,Kr,`f`),u=V(this,Yr,`f`)+V(this,qr,`f`),d=a.size;if(d){let[r,i]=d;a.uniforms.src.value=n,a.uniforms.resolution.value.set(r,i),a.uniforms.offset.value.set(0,0),a.uniforms.time.value=t,a.uniforms.mouse.value.set(l/e.w*r,u/e.h*i)}else a.setUniforms(n,V(this,J,`f`),e,t,l,u);a.uniforms.passIndex.value=i,a.updateCustomUniforms(s);for(let[e,t]of r){let n=a.uniforms[e];n&&(n.value=t)}if(c)a.backbuffer?(a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture),V(this,H,`m`,Z).call(this,a.pass,a.backbuffer.target,e,a.uniforms,!0),a.backbuffer.swap(),V(this,W,`f`).setUniforms(a.backbuffer.texture,V(this,J,`f`),e),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,null,e,V(this,W,`f`).uniforms,!1)):V(this,H,`m`,Z).call(this,a.pass,null,e,a.uniforms,!1);else if(a.backbuffer){a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture);let t=d?Te(0,0,d[0]/V(this,J,`f`),d[1]/V(this,J,`f`)):e;V(this,H,`m`,Z).call(this,a.pass,a.backbuffer.target,t,a.uniforms,!0),a.backbuffer.swap(),n=a.backbuffer.texture,o&&r.set(o,a.backbuffer.texture)}else{let t=o??`postEffect${i}`,s=V(this,Nr,`f`).get(t),c=d?d[0]:e.w*V(this,J,`f`),l=d?d[1]:e.h*V(this,J,`f`);(!s||s.width!==c||s.height!==l)&&(s?.dispose(),s=mr(V(this,U,`f`),c,l,{float:a.float}),V(this,Nr,`f`).set(t,s));let u=d?Te(0,0,d[0]/V(this,J,`f`),d[1]/V(this,J,`f`)):e;V(this,H,`m`,Z).call(this,a.pass,s,u,a.uniforms,!0),n=s.texture,o&&r.set(o,s.texture)}}},gi=function(e,t){let n=e*V(this,J,`f`),r=t*V(this,J,`f`);(!V(this,K,`f`)||V(this,K,`f`).width!==n||V(this,K,`f`).height!==r)&&(V(this,K,`f`)?.dispose(),B(this,K,mr(V(this,U,`f`),n,r),`f`));for(let{pass:n}of V(this,G,`f`))n.persistent&&!n.backbuffer?n.initializeBackbuffer(V(this,U,`f`),e,t,V(this,J,`f`)):n.backbuffer&&n.resizeBackbuffer(e,t)};function yi(e,t){return t.left<=e.right&&t.right>=e.left&&t.top<=e.bottom&&t.bottom>=e.top}function bi(e,t,n,r){return r===0?yi(e,t):n>=r}function xi(e){return e===!0?[!0,ln]:e===void 0?[!1,ln]:[!1,cn(e)]}function Si(e){return{threshold:e?.threshold??0,rootMargin:cn(e?.rootMargin??0)}}function Ci(e,t){let n=e.source;if(!n)return 0;if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return t===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return t===`w`?n.videoWidth:n.videoHeight;let r=n;return t===`w`?r.width:r.height}function wi(e){return e===`repeat`?`repeat`:e===`mirror`?`mirror`:`clamp`}function Ti(e){if(!e)return[`clamp`,`clamp`];if(Array.isArray(e))return[wi(e[0]),wi(e[1])];let t=wi(e);return[t,t]}function Ei(e,t,n){return Math.max(t,Math.min(n,e))}function Di(e){return!(e instanceof HTMLImageElement||e instanceof HTMLVideoElement||e instanceof HTMLCanvasElement)}function Oi(){try{let e=document.createElement(`canvas`);return(e.getContext(`webgl2`)||e.getContext(`webgl`))!==null}catch{return!1}}var ki=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Q=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ai,$,ji,Mi,Ni,Pi,Fi,Ii;function Li(){if(typeof window>`u`)throw`Cannot find 'window'. VFX-JS only runs on the browser.`;if(typeof document>`u`)throw`Cannot find 'document'. VFX-JS only runs on the browser.`}function Ri(e){return{position:e?`fixed`:`absolute`,top:0,left:0,width:`0px`,height:`0px`,"z-index":9999,"pointer-events":`none`}}var zi=class e{static init(t){try{return new e(t)}catch{return null}}constructor(e={}){if(Ai.add(this),$.set(this,void 0),ji.set(this,void 0),Mi.set(this,new Map),Li(),!Oi())throw Error(`[VFX-JS] WebGL is not available in this environment.`);let t=ie(e),n=document.createElement(`canvas`),r=Ri(t.fixedCanvas);for(let[e,t]of Object.entries(r))n.style.setProperty(e,t.toString());t.zIndex!==void 0&&n.style.setProperty(`z-index`,t.zIndex.toString()),(t.wrapper??document.body).appendChild(n),ki(this,ji,n,`f`),ki(this,$,new vi(t,n),`f`),t.autoplay&&Q(this,$,`f`).play()}async add(e,t,n){e instanceof HTMLImageElement?await Q(this,Ai,`m`,Ni).call(this,e,t):e instanceof HTMLVideoElement?await Q(this,Ai,`m`,Pi).call(this,e,t):e instanceof HTMLCanvasElement?e.hasAttribute(`layoutsubtree`)&&n?await Q(this,$,`f`).addElement(e,t,n):await Q(this,Ai,`m`,Fi).call(this,e,t):await Q(this,Ai,`m`,Ii).call(this,e,t)}updateHICTexture(e,t){Q(this,$,`f`).updateHICTexture(e,t)}get maxTextureSize(){return Q(this,$,`f`).maxTextureSize}get canvas(){return Q(this,ji,`f`)}async addHTML(e,t){if(!re())return console.warn(`html-in-canvas not supported, falling back to dom-to-canvas`),this.add(e,t);t.overlay!==void 0&&console.warn(`addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.`);let{overlay:n,...r}=t,i=Q(this,Mi,`f`).get(e);i&&Q(this,$,`f`).removeElement(i);let{canvas:a,initialCapture:o}=await te(e,{onCapture:e=>{Q(this,$,`f`).updateHICTexture(a,e)},maxSize:Q(this,$,`f`).maxTextureSize});i=a,Q(this,Mi,`f`).set(e,i),await Q(this,$,`f`).addElement(i,r,o)}remove(e){let t=Q(this,Mi,`f`).get(e);t?(ne(t,e),Q(this,Mi,`f`).delete(e),Q(this,$,`f`).removeElement(t)):Q(this,$,`f`).removeElement(e)}updateEffects(e,t){let n=Q(this,Mi,`f`).get(e)??e;return Q(this,$,`f`).updateElementEffects(n,t)}async update(e){let t=Q(this,Mi,`f`).get(e);if(t){t.requestPaint();return}if(e instanceof HTMLImageElement)return Q(this,$,`f`).updateImageElement(e);if(e instanceof HTMLCanvasElement){Q(this,$,`f`).updateCanvasElement(e);return}else return Q(this,$,`f`).updateTextElement(e)}play(){Q(this,$,`f`).play()}stop(){Q(this,$,`f`).stop()}render(){Q(this,$,`f`).render()}get time(){return Q(this,$,`f`).time}setTime(e){Q(this,$,`f`).setTime(e)}get timeScale(){return Q(this,$,`f`).timeScale}set timeScale(e){Q(this,$,`f`).timeScale=e}destroy(){for(let[e,t]of Q(this,Mi,`f`))ne(t,e);Q(this,Mi,`f`).clear(),Q(this,$,`f`).destroy(),Q(this,ji,`f`).remove()}};$=new WeakMap,ji=new WeakMap,Mi=new WeakMap,Ai=new WeakSet,Ni=function(e,t){return e.complete?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`load`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},Pi=function(e,t){return e.readyState>=3?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`canplay`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},Fi=function(e,t){return Q(this,$,`f`).addElement(e,t)},Ii=function(e,t){return Q(this,$,`f`).addElement(e,t)};export{zi as t};
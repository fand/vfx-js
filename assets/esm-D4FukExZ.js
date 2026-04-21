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
    `};function o(e){if(!e.src||e.src.startsWith(`data:`))return!1;try{return new URL(e.src,location.href).origin!==location.origin}catch{return!1}}async function s(e){let t=await(await fetch(e)).blob();return URL.createObjectURL(t)}async function c(e){let t=Array.from(e.querySelectorAll(`img`)).filter(e=>e.complete&&e.naturalWidth>0&&o(e));if(t.length===0)return()=>{};let n=new Map,r=[];return await Promise.all(t.map(async e=>{try{let t=await s(e.src);n.set(e,e.src),r.push(t),await new Promise(n=>{e.addEventListener(`load`,()=>n(),{once:!0}),e.src=t})}catch{}})),()=>{for(let[e,t]of n)e.src=t;for(let e of r)URL.revokeObjectURL(e)}}var l=[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`],u=[`position`,`top`,`right`,`bottom`,`left`,`float`,`flex`,`flex-grow`,`flex-shrink`,`flex-basis`,`align-self`,`justify-self`,`place-self`,`order`,`grid-column`,`grid-column-start`,`grid-column-end`,`grid-row`,`grid-row-start`,`grid-row-end`,`grid-area`],d=new WeakMap,f=new WeakMap,p=new WeakMap,m=new WeakMap,h=new WeakMap,g=new WeakMap;async function _(e,t){let n=e.getContext(`2d`);if(!n)throw Error(`Failed to get 2d context from layoutsubtree canvas`);let{onCapture:r,maxSize:i}=t,a=null,o=null,s=new Promise(e=>{o=e});e.onpaint=()=>{let t=e.firstElementChild;if(!t||e.width===0||e.height===0)return;n.clearRect(0,0,e.width,e.height),n.drawElementImage(t,0,0);let s=e.width,c=e.height;if(i&&(s>i||c>i)){let e=Math.min(i/s,i/c);s=Math.floor(s*e),c=Math.floor(c*e)}(!a||a.width!==s||a.height!==c)&&(a=new OffscreenCanvas(s,c));let l=a.getContext(`2d`);if(l){if(l.clearRect(0,0,s,c),l.drawImage(e,0,0,s,c),n.clearRect(0,0,e.width,e.height),o){o(a),o=null;return}r(a)}};let c=new ResizeObserver(t=>{for(let n of t){let t=n.devicePixelContentBoxSize?.[0];if(t)e.width=t.inlineSize,e.height=t.blockSize;else{let t=n.borderBoxSize?.[0];if(t){let n=window.devicePixelRatio;e.width=Math.round(t.inlineSize*n),e.height=Math.round(t.blockSize*n)}}}e.requestPaint()});c.observe(e,{box:`device-pixel-content-box`}),d.set(e,c);let l=e.firstElementChild,u=``;if(l){let t=new ResizeObserver(t=>{let n=t[0].borderBoxSize?.[0];if(!n)return;let r=`${Math.round(n.blockSize)}px`;r!==u&&(u=r,e.style.setProperty(`height`,r))});t.observe(l),f.set(e,t)}return s}function v(e){e.onpaint=null;let t=d.get(e);t&&(t.disconnect(),d.delete(e));let n=f.get(e);n&&(n.disconnect(),f.delete(e))}async function y(e,t){let n=e.getBoundingClientRect(),r=document.createElement(`canvas`);r.setAttribute(`layoutsubtree`,``),r.className=e.className;let i=e.getAttribute(`style`);i&&r.setAttribute(`style`,i),r.style.setProperty(`padding`,`0`),r.style.setProperty(`border`,`none`),r.style.setProperty(`box-sizing`,`content-box`);let a=getComputedStyle(e),o=a.display===`inline`?`block`:a.display;r.style.setProperty(`display`,o);for(let e of l)r.style.setProperty(e,a.getPropertyValue(e));for(let e of u)r.style.setProperty(e,a.getPropertyValue(e));let s=e=>Number.parseFloat(e),d=s(a.paddingLeft)+s(a.paddingRight)+s(a.borderLeftWidth)+s(a.borderRightWidth),f=s(a.paddingTop)+s(a.paddingBottom)+s(a.borderTopWidth)+s(a.borderBottomWidth);d>0&&r.style.setProperty(`width`,`${n.width}px`),f>0&&r.style.setProperty(`height`,`${n.height}px`),r.style.width||r.style.setProperty(`width`,`100%`),r.style.height||r.style.setProperty(`height`,`${n.height}px`);let v=window.devicePixelRatio;r.width=Math.round(n.width*v),r.height=Math.round(n.height*v),p.set(e,e.style.margin),m.set(e,e.style.width),h.set(e,e.style.boxSizing),e.parentNode?.insertBefore(r,e),r.appendChild(e),e.style.setProperty(`margin`,`0`),e.style.setProperty(`width`,`100%`),e.style.setProperty(`box-sizing`,`border-box`);let y=await c(e);return g.set(r,y),{canvas:r,initialCapture:await _(r,t)}}function b(e,t){v(e);let n=g.get(e);n&&(n(),g.delete(e)),e.parentNode?.insertBefore(t,e),e.remove();let r=p.get(t);r!==void 0&&(t.style.margin=r,p.delete(t));let i=m.get(t);i!==void 0&&(t.style.width=i,m.delete(t));let a=h.get(t);a!==void 0&&(t.style.boxSizing=a,h.delete(t))}var x;function ee(){if(x!==void 0)return x;try{let e=document.createElement(`canvas`),t=e.getContext(`2d`);x=t!==null&&typeof t.drawElementImage==`function`&&typeof e.requestPaint==`function`}catch{x=!1}return x}function te(e){let t=typeof window<`u`?window.devicePixelRatio:1,n;n=e.scrollPadding===void 0?[.1,.1]:e.scrollPadding===!1?[0,0]:Array.isArray(e.scrollPadding)?[e.scrollPadding[0]??.1,e.scrollPadding[1]??.1]:[e.scrollPadding,e.scrollPadding];let r;return r=e.postEffect===void 0?[]:Array.isArray(e.postEffect)?e.postEffect:[e.postEffect],{pixelRatio:e.pixelRatio??t,zIndex:e.zIndex??void 0,autoplay:e.autoplay??!0,fixedCanvas:e.scrollPadding===!1,scrollPadding:n,wrapper:e.wrapper,postEffects:r}}var S=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},C=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ne,re,ie,ae,oe,se,ce,w=class{constructor(e,t,n){ne.add(this),this.wrapS=`clamp`,this.wrapT=`clamp`,this.needsUpdate=!0,this.source=null,re.set(this,void 0),ie.set(this,!1),ae.set(this,void 0),S(this,re,e,`f`),this.gl=e.gl,C(this,ne,`m`,oe).call(this),t&&(this.source=t),S(this,ae,n?.autoRegister!==!1,`f`),C(this,ae,`f`)&&e.addResource(this)}restore(){C(this,ne,`m`,oe).call(this),S(this,ie,!1,`f`),this.needsUpdate=!0}bind(e){let t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&=(C(this,ne,`m`,se).call(this),!1)}dispose(){C(this,ae,`f`)&&C(this,re,`f`).removeResource(this),this.gl.deleteTexture(this.texture)}};re=new WeakMap,ie=new WeakMap,ae=new WeakMap,ne=new WeakSet,oe=function(){let e=this.gl.createTexture();if(!e)throw Error(`[VFX-JS] Failed to create texture`);this.texture=e},se=function(){let e=this.gl,t=this.source;if(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4),t)try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)}catch(e){console.error(e)}else if(!C(this,ie,`f`)){let t=new Uint8Array([0,0,0,0]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,t)}C(this,ne,`m`,ce).call(this),S(this,ie,!0,`f`)},ce=function(){let e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,le(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,le(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR)};function le(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function ue(e){return new Promise((t,n)=>{let r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>t(r),r.onerror=n,r.src=e})}var de=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},fe=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},pe,me,he,ge=class{constructor(e,t,n,r={}){pe.add(this),me.set(this,void 0),de(this,me,e,`f`),this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(n)),this.float=r.float??!1,this.texture=new w(e,void 0,{autoRegister:!1}),fe(this,pe,`m`,he).call(this),e.addResource(this)}setSize(e,t){let n=Math.max(1,Math.floor(e)),r=Math.max(1,Math.floor(t));n===this.width&&r===this.height||(this.width=n,this.height=r,fe(this,pe,`m`,he).call(this))}restore(){this.texture.restore(),fe(this,pe,`m`,he).call(this)}dispose(){fe(this,me,`f`).removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.texture.dispose()}};me=new WeakMap,pe=new WeakSet,he=function(){let e=this.gl,t=this.fbo,n=e.createFramebuffer();if(!n)throw Error(`[VFX-JS] Failed to create framebuffer`);this.fbo=n;let r=this.texture.texture;e.bindTexture(e.TEXTURE_2D,r);let i=fe(this,me,`f`).floatLinearFilter,a=this.float?i?e.RGBA32F:e.RGBA16F:e.RGBA8,o=this.float?i?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,e.RGBA,o,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.texture.needsUpdate=!1,this.texture.source=null,t&&e.deleteFramebuffer(t)};function _e(e,t,n,r){return{x:e.left+n,y:t-r-e.bottom,w:e.right-e.left,h:e.bottom-e.top}}function ve(e,t,n,r){return{x:e,y:t,w:n,h:r}}var ye=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},T=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},be,xe,Se,E,Ce=class{constructor(e,t,n,r,i){be.set(this,void 0),xe.set(this,void 0),Se.set(this,void 0),E.set(this,void 0),ye(this,be,t,`f`),ye(this,xe,n,`f`),ye(this,Se,r,`f`);let a=t*r,o=n*r;ye(this,E,[new ge(e,a,o,{float:i}),new ge(e,a,o,{float:i})],`f`)}get texture(){return T(this,E,`f`)[0].texture}get target(){return T(this,E,`f`)[1]}resize(e,t){if(e===T(this,be,`f`)&&t===T(this,xe,`f`))return;ye(this,be,e,`f`),ye(this,xe,t,`f`);let n=e*T(this,Se,`f`),r=t*T(this,Se,`f`);T(this,E,`f`)[0].setSize(n,r),T(this,E,`f`)[1].setSize(n,r)}swap(){ye(this,E,[T(this,E,`f`)[1],T(this,E,`f`)[0]],`f`)}getViewport(){return ve(0,0,T(this,be,`f`),T(this,xe,`f`))}dispose(){T(this,E,`f`)[0].dispose(),T(this,E,`f`)[1].dispose()}};be=new WeakMap,xe=new WeakMap,Se=new WeakMap,E=new WeakMap;var D=class{constructor(e=0,t=0){this.x=0,this.y=0,this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}},we=class{constructor(e=0,t=0,n=0,r=0){this.x=0,this.y=0,this.z=0,this.w=0,this.x=e,this.y=t,this.z=n,this.w=r}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}},Te=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},O=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ee,De,Oe,ke,Ae,je,Me;function Ne(e){return/#version\s+300\s+es\b/.test(e)?`300 es`:/#version\s+100\b/.test(e)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(e)?`100`:`300 es`}var Pe=class{constructor(e,t,n,r){Ee.add(this),De.set(this,void 0),Oe.set(this,void 0),ke.set(this,void 0),Ae.set(this,void 0),je.set(this,new Map),Te(this,De,e,`f`),this.gl=e.gl,Te(this,Oe,t,`f`),Te(this,ke,n,`f`),Te(this,Ae,r??Ne(n),`f`),O(this,Ee,`m`,Me).call(this),e.addResource(this)}restore(){O(this,Ee,`m`,Me).call(this)}use(){this.gl.useProgram(this.program)}hasUniform(e){return O(this,je,`f`).has(e)}uploadUniforms(e){let t=this.gl,n=0;for(let[r,i]of O(this,je,`f`)){let a=e[r];if(!a)continue;let o=a.value;if(o!=null){if(Le(i.type)){o instanceof w&&(o.bind(n),t.uniform1i(i.location,n),n++);continue}o instanceof w||ze(t,i,o)}}}dispose(){O(this,De,`f`).removeResource(this),this.gl.deleteProgram(this.program)}};De=new WeakMap,Oe=new WeakMap,ke=new WeakMap,Ae=new WeakMap,je=new WeakMap,Ee=new WeakSet,Me=function(){let e=this.gl,t=Fe(e,e.VERTEX_SHADER,Ie(O(this,Oe,`f`),O(this,Ae,`f`))),n=Fe(e,e.FRAGMENT_SHADER,Ie(O(this,ke,`f`),O(this,Ae,`f`))),r=e.createProgram();if(!r)throw Error(`[VFX-JS] Failed to create program`);if(e.attachShader(r,t),e.attachShader(r,n),e.bindAttribLocation(r,0,`position`),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let i=e.getProgramInfoLog(r)??``;throw e.deleteShader(t),e.deleteShader(n),e.deleteProgram(r),Error(`[VFX-JS] Program link failed: ${i}`)}e.detachShader(r,t),e.detachShader(r,n),e.deleteShader(t),e.deleteShader(n),this.program=r,O(this,je,`f`).clear();let i=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<i;t++){let n=e.getActiveUniform(r,t);if(!n)continue;let i=n.name.replace(/\[0\]$/,``),a=e.getUniformLocation(r,n.name);a&&O(this,je,`f`).set(i,{location:a,type:n.type,size:n.size})}};function Fe(e,t,n){let r=e.createShader(t);if(!r)throw Error(`[VFX-JS] Failed to create shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)??``;throw e.deleteShader(r),Error(`[VFX-JS] Shader compile failed: ${t}\n\n${n}`)}return r}function Ie(e,t){return e.replace(/^\s+/,``).startsWith(`#version`)||t===`100`?e:`#version 300 es\n${e}`}function Le(e){return e===35678||e===36298||e===36306||e===35682}var Re=new Set;function ze(e,t,n){let r=t.location,i=t.size>1,a=n,o=n,s=n;switch(t.type){case e.FLOAT:i?e.uniform1fv(r,a):e.uniform1f(r,n);return;case e.FLOAT_VEC2:if(i)e.uniform2fv(r,a);else if(n instanceof D)e.uniform2f(r,n.x,n.y);else{let t=n;e.uniform2f(r,t[0],t[1])}return;case e.FLOAT_VEC3:if(i)e.uniform3fv(r,a);else{let t=n;e.uniform3f(r,t[0],t[1],t[2])}return;case e.FLOAT_VEC4:if(i)e.uniform4fv(r,a);else if(n instanceof we)e.uniform4f(r,n.x,n.y,n.z,n.w);else{let t=n;e.uniform4f(r,t[0],t[1],t[2],t[3])}return;case e.INT:i?e.uniform1iv(r,o):e.uniform1i(r,n);return;case e.INT_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,t[0],t[1])}return;case e.INT_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,t[0],t[1],t[2])}return;case e.INT_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,t[0],t[1],t[2],t[3])}return;case e.BOOL:i?e.uniform1iv(r,o):e.uniform1i(r,+!!n);return;case e.BOOL_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,+!!t[0],+!!t[1])}return;case e.BOOL_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,+!!t[0],+!!t[1],+!!t[2])}return;case e.BOOL_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,+!!t[0],+!!t[1],+!!t[2],+!!t[3])}return;case e.FLOAT_MAT2:e.uniformMatrix2fv(r,!1,a);return;case e.FLOAT_MAT3:e.uniformMatrix3fv(r,!1,a);return;case e.FLOAT_MAT4:e.uniformMatrix4fv(r,!1,a);return;case e.UNSIGNED_INT:i?e.uniform1uiv(r,s):e.uniform1ui(r,n);return;case e.UNSIGNED_INT_VEC2:if(i)e.uniform2uiv(r,s);else{let t=n;e.uniform2ui(r,t[0],t[1])}return;case e.UNSIGNED_INT_VEC3:if(i)e.uniform3uiv(r,s);else{let t=n;e.uniform3ui(r,t[0],t[1],t[2])}return;case e.UNSIGNED_INT_VEC4:if(i)e.uniform4uiv(r,s);else{let t=n;e.uniform4ui(r,t[0],t[1],t[2],t[3])}return;default:Re.has(t.type)||(Re.add(t.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${t.type.toString(16)}; skipping upload.`));return}}var Be=class{constructor(e,t,n,r,i,a){this.gl=e.gl,this.program=new Pe(e,t,n,a),this.uniforms=r,this.blend=i}dispose(){this.program.dispose()}};function Ve(e,t,n,r,i,a,o,s){let c=r?r.width/s:a,l=r?r.height/s:o,u=Math.max(0,i.x),d=Math.max(0,i.y),f=Math.min(c,i.x+i.w),p=Math.min(l,i.y+i.h),m=f-u,h=p-d;m<=0||h<=0||(e.bindFramebuffer(e.FRAMEBUFFER,r?r.fbo:null),e.viewport(Math.round(u*s),Math.round(d*s),Math.round(m*s),Math.round(h*s)),He(e,n.blend),n.program.use(),n.program.uploadUniforms(n.uniforms),t.draw())}function He(e,t){if(t===`none`){e.disable(e.BLEND);return}e.enable(e.BLEND),e.blendEquation(e.FUNC_ADD),t===`premultiplied`?e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA):e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA)}var Ue=class{constructor(t){this.uniforms={src:{value:null},offset:{value:new D},resolution:{value:new D},viewport:{value:new we}},this.pass=new Be(t,e,n,this.uniforms,`premultiplied`)}setUniforms(e,t,n){this.uniforms.src.value=e,this.uniforms.resolution.value.set(n.w*t,n.h*t),this.uniforms.offset.value.set(n.x*t,n.y*t)}dispose(){this.pass.dispose()}},We=e=>{let t=document.implementation.createHTMLDocument(`test`),n=t.createRange();n.selectNodeContents(t.documentElement),n.deleteContents();let r=document.createElement(`head`);return t.documentElement.appendChild(r),t.documentElement.appendChild(n.createContextualFragment(e)),t.documentElement.setAttribute(`xmlns`,t.documentElement.namespaceURI),new XMLSerializer().serializeToString(t).replace(/<!DOCTYPE html>/,``)};async function Ge(e,t,n,r){let i=e.getBoundingClientRect(),a=window.devicePixelRatio,o=i.width*a,s=i.height*a,c=1,l=o,u=s;r&&(l>r||u>r)&&(c=Math.min(r/l,r/u),l=Math.floor(l*c),u=Math.floor(u*c));let d=n&&n.width===l&&n.height===u?n:new OffscreenCanvas(l,u),f=e.cloneNode(!0);await Ke(e,f),qe(e,f),f.style.setProperty(`opacity`,t.toString()),f.style.setProperty(`margin`,`0px`),Je(f);let p=f.outerHTML,m=`<svg xmlns="http://www.w3.org/2000/svg" width="${o}" height="${s}"><foreignObject width="100%" height="100%">${We(p)}</foreignObject></svg>`;return new Promise((e,t)=>{let n=new Image;n.onload=()=>{let r=d.getContext(`2d`);if(r===null)return t();r.clearRect(0,0,l,u);let i=a*c;r.scale(i,i),r.drawImage(n,0,0,o,s),r.setTransform(1,0,0,1,0,0),e(d)},n.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(m)}`})}async function Ke(e,t){let n=window.getComputedStyle(e);for(let e of Array.from(n))/(-inline-|-block-|^inline-|^block-)/.test(e)||/^-webkit-.*(start|end|before|after|logical)/.test(e)||t.style.setProperty(e,n.getPropertyValue(e),n.getPropertyPriority(e));if(t.tagName===`INPUT`)t.setAttribute(`value`,t.value);else if(t.tagName===`TEXTAREA`)t.innerHTML=t.value;else if(t.tagName===`IMG`)try{t.src=await Ye(e.src)}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];await Ke(r,i)}}function qe(e,t){if(typeof e.computedStyleMap==`function`)try{let n=e.computedStyleMap();for(let e of[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`]){let r=n.get(e);r instanceof CSSKeywordValue&&r.value===`auto`&&t.style.setProperty(e,`auto`)}}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];r instanceof HTMLElement&&i instanceof HTMLElement&&qe(r,i)}}function Je(e){let t=e;for(;;){let e=t.style;if(Number.parseFloat(e.paddingTop)>0||Number.parseFloat(e.borderTopWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.firstElementChild;if(!n)break;n.style.setProperty(`margin-top`,`0px`),t=n}for(t=e;;){let e=t.style;if(Number.parseFloat(e.paddingBottom)>0||Number.parseFloat(e.borderBottomWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.lastElementChild;if(!n)break;n.style.setProperty(`margin-bottom`,`0px`),t=n}}async function Ye(e){let t=await fetch(e).then(e=>e.blob());return new Promise(e=>{let n=new FileReader;n.onload=function(){e(this.result)},n.readAsDataURL(t)})}function k(e){this.data=e,this.pos=0}k.prototype.readByte=function(){return this.data[this.pos++]},k.prototype.peekByte=function(){return this.data[this.pos]},k.prototype.readBytes=function(e){return this.data.subarray(this.pos,this.pos+=e)},k.prototype.peekBytes=function(e){return this.data.subarray(this.pos,this.pos+e)},k.prototype.readString=function(e){for(var t=``,n=0;n<e;n++)t+=String.fromCharCode(this.readByte());return t},k.prototype.readBitArray=function(){for(var e=[],t=this.readByte(),n=7;n>=0;n--)e.push(!!(t&1<<n));return e},k.prototype.readUnsigned=function(e){var t=this.readBytes(2);return e?(t[1]<<8)+t[0]:(t[0]<<8)+t[1]};function Xe(e){this.stream=new k(e),this.output={}}Xe.prototype.parse=function(e){return this.parseParts(this.output,e),this.output},Xe.prototype.parseParts=function(e,t){for(var n=0;n<t.length;n++){var r=t[n];this.parsePart(e,r)}},Xe.prototype.parsePart=function(e,t){var n=t.label,r;if(!(t.requires&&!t.requires(this.stream,this.output,e)))if(t.loop){for(var i=[];t.loop(this.stream);){var a={};this.parseParts(a,t.parts),i.push(a)}e[n]=i}else t.parts?(r={},this.parseParts(r,t.parts),e[n]=r):t.parser?(r=t.parser(this.stream,this.output,e),t.skip||(e[n]=r)):t.bits&&(e[n]=this.parseBits(t.bits))};function Ze(e){return e.reduce(function(e,t){return e*2+t},0)}Xe.prototype.parseBits=function(e){var t={},n=this.stream.readBitArray();for(var r in e){var i=e[r];i.length?t[r]=Ze(n.slice(i.index,i.index+i.length)):t[r]=n[i.index]}return t};var A={readByte:function(){return function(e){return e.readByte()}},readBytes:function(e){return function(t){return t.readBytes(e)}},readString:function(e){return function(t){return t.readString(e)}},readUnsigned:function(e){return function(t){return t.readUnsigned(e)}},readArray:function(e,t){return function(n,r,i){for(var a=t(n,r,i),o=Array(a),s=0;s<a;s++)o[s]=n.readBytes(e);return o}}},Qe={label:`blocks`,parser:function(e){for(var t=[],n=0,r=0,i=e.readByte();i!==r;i=e.readByte())t.push(e.readBytes(i)),n+=i;var a=new Uint8Array(n);n=0;for(var o=0;o<t.length;o++)a.set(t[o],n),n+=t[o].length;return a}},$e={label:`gce`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===249},parts:[{label:`codes`,parser:A.readBytes(2),skip:!0},{label:`byteSize`,parser:A.readByte()},{label:`extras`,bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:`delay`,parser:A.readUnsigned(!0)},{label:`transparentColorIndex`,parser:A.readByte()},{label:`terminator`,parser:A.readByte(),skip:!0}]},et={label:`image`,requires:function(e){return e.peekByte()===44},parts:[{label:`code`,parser:A.readByte(),skip:!0},{label:`descriptor`,parts:[{label:`left`,parser:A.readUnsigned(!0)},{label:`top`,parser:A.readUnsigned(!0)},{label:`width`,parser:A.readUnsigned(!0)},{label:`height`,parser:A.readUnsigned(!0)},{label:`lct`,bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:`lct`,requires:function(e,t,n){return n.descriptor.lct.exists},parser:A.readArray(3,function(e,t,n){return 2**(n.descriptor.lct.size+1)})},{label:`data`,parts:[{label:`minCodeSize`,parser:A.readByte()},Qe]}]},tt={label:`text`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===1},parts:[{label:`codes`,parser:A.readBytes(2),skip:!0},{label:`blockSize`,parser:A.readByte()},{label:`preData`,parser:function(e,t,n){return e.readBytes(n.text.blockSize)}},Qe]},nt={label:`frames`,parts:[$e,{label:`application`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===255},parts:[{label:`codes`,parser:A.readBytes(2),skip:!0},{label:`blockSize`,parser:A.readByte()},{label:`id`,parser:function(e,t,n){return e.readString(n.blockSize)}},Qe]},{label:`comment`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===254},parts:[{label:`codes`,parser:A.readBytes(2),skip:!0},Qe]},et,tt],loop:function(e){var t=e.peekByte();return t===33||t===44}},rt=[{label:`header`,parts:[{label:`signature`,parser:A.readString(3)},{label:`version`,parser:A.readString(3)}]},{label:`lsd`,parts:[{label:`width`,parser:A.readUnsigned(!0)},{label:`height`,parser:A.readUnsigned(!0)},{label:`gct`,bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:`backgroundColorIndex`,parser:A.readByte()},{label:`pixelAspectRatio`,parser:A.readByte()}]},{label:`gct`,requires:function(e,t){return t.lsd.gct.exists},parser:A.readArray(3,function(e,t){return 2**(t.lsd.gct.size+1)})},nt];function it(e){this.raw=new Xe(new Uint8Array(e)).parse(rt),this.raw.hasImages=!1;for(var t=0;t<this.raw.frames.length;t++)if(this.raw.frames[t].image){this.raw.hasImages=!0;break}}it.prototype.decompressFrame=function(e,t){if(e>=this.raw.frames.length)return null;var n=this.raw.frames[e];if(n.image){var r=n.image.descriptor.width*n.image.descriptor.height,i=o(n.image.data.minCodeSize,n.image.data.blocks,r);n.image.descriptor.lct.interlaced&&(i=s(i,n.image.descriptor.width));var a={pixels:i,dims:{top:n.image.descriptor.top,left:n.image.descriptor.left,width:n.image.descriptor.width,height:n.image.descriptor.height}};return n.image.descriptor.lct&&n.image.descriptor.lct.exists?a.colorTable=n.image.lct:a.colorTable=this.raw.gct,n.gce&&(a.delay=(n.gce.delay||10)*10,a.disposalType=n.gce.extras.disposal,n.gce.extras.transparentColorGiven&&(a.transparentIndex=n.gce.transparentColorIndex)),t&&(a.patch=c(a)),a}return null;function o(e,t,n){var r=4096,i=-1,a=n,o,s,c,l,u,d,f,p,m,h,g,_,v,y,b,x,ee=Array(n),te=Array(r),S=Array(r),C=Array(r+1);for(_=e,s=1<<_,u=s+1,o=s+2,f=i,l=_+1,c=(1<<l)-1,m=0;m<s;m++)te[m]=0,S[m]=m;for(g=p=v=y=x=b=0,h=0;h<a;){if(y===0){if(p<l){g+=t[b]<<p,p+=8,b++;continue}if(m=g&c,g>>=l,p-=l,m>o||m==u)break;if(m==s){l=_+1,c=(1<<l)-1,o=s+2,f=i;continue}if(f==i){C[y++]=S[m],f=m,v=m;continue}for(d=m,m==o&&(C[y++]=v,m=f);m>s;)C[y++]=S[m],m=te[m];v=S[m]&255,C[y++]=v,o<r&&(te[o]=f,S[o]=v,o++,(o&c)===0&&o<r&&(l++,c+=o)),f=d}y--,ee[x++]=C[y],h++}for(h=x;h<a;h++)ee[h]=0;return ee}function s(e,t){for(var n=Array(e.length),r=e.length/t,i=function(r,i){var a=e.slice(i*t,(i+1)*t);n.splice.apply(n,[r*t,t].concat(a))},a=[0,4,2,1],o=[8,8,4,2],s=0,c=0;c<4;c++)for(var l=a[c];l<r;l+=o[c])i(l,s),s++;return n}function c(e){for(var t=e.pixels.length,n=new Uint8ClampedArray(t*4),r=0;r<t;r++){var i=r*4,a=e.pixels[r],o=e.colorTable[a];n[i]=o[0],n[i+1]=o[1],n[i+2]=o[2],n[i+3]=a===e.transparentIndex?0:255}return n}},it.prototype.decompressFrames=function(e,t,n){t===void 0&&(t=0),n=n===void 0?this.raw.frames.length:Math.min(n,this.raw.frames.length);for(var r=[],i=t;i<n;i++)this.raw.frames[i].image&&r.push(this.decompressFrame(i,e));return r};var at=it,ot=class e{static async create(t,n){let r=await fetch(t).then(e=>e.arrayBuffer()).then(e=>new at(e)),i=r.decompressFrames(!0,void 0,void 0),{width:a,height:o}=r.raw.lsd;return new e(i,a,o,n)}constructor(e,t,n,r){this.frames=[],this.index=0,this.playTime=0,this.frames=e,this.canvas=document.createElement(`canvas`),this.ctx=this.canvas.getContext(`2d`),this.pixelRatio=r,this.canvas.width=t,this.canvas.height=n,this.startTime=Date.now()}getCanvas(){return this.canvas}update(){let e=Date.now()-this.startTime;for(;this.playTime<e;){let e=this.frames[this.index%this.frames.length];this.playTime+=e.delay,this.index++}let t=this.frames[this.index%this.frames.length],n=new ImageData(t.patch,t.dims.width,t.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(n,t.dims.left,t.dims.top)}},j=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},st,ct,lt,ut,dt,ft=class{constructor(e){this.isContextLost=!1,st.set(this,new Set),ct.set(this,new Set),lt.set(this,new Set),ut.set(this,e=>{e.preventDefault(),this.isContextLost=!0;for(let e of j(this,ct,`f`))e()}),dt.set(this,()=>{this.isContextLost=!1;let e=this.gl;e.getExtension(`EXT_color_buffer_float`),e.getExtension(`EXT_color_buffer_half_float`);for(let e of j(this,st,`f`))e.restore();for(let e of j(this,lt,`f`))e()});let t=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1});if(!t)throw Error(`[VFX-JS] WebGL2 is not available.`);this.gl=t,this.canvas=e,t.getExtension(`EXT_color_buffer_float`),t.getExtension(`EXT_color_buffer_half_float`),this.floatLinearFilter=!!t.getExtension(`OES_texture_float_linear`),this.maxTextureSize=t.getParameter(t.MAX_TEXTURE_SIZE),e.addEventListener(`webglcontextlost`,j(this,ut,`f`),!1),e.addEventListener(`webglcontextrestored`,j(this,dt,`f`),!1)}setSize(e,t,n){let r=Math.floor(e*n),i=Math.floor(t*n);(this.canvas.width!==r||this.canvas.height!==i)&&(this.canvas.width=r,this.canvas.height=i)}addResource(e){j(this,st,`f`).add(e)}removeResource(e){j(this,st,`f`).delete(e)}onContextLost(e){return j(this,ct,`f`).add(e),()=>j(this,ct,`f`).delete(e)}onContextRestored(e){return j(this,lt,`f`).add(e),()=>j(this,lt,`f`).delete(e)}};st=new WeakMap,ct=new WeakMap,lt=new WeakMap,ut=new WeakMap,dt=new WeakMap;var pt=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},mt=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ht,gt,_t,vt,yt=class{constructor(e){ht.add(this),gt.set(this,void 0),_t.set(this,void 0),pt(this,gt,e,`f`),this.gl=e.gl,mt(this,ht,`m`,vt).call(this),e.addResource(this)}restore(){mt(this,ht,`m`,vt).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){mt(this,gt,`f`).removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(mt(this,_t,`f`))}};gt=new WeakMap,_t=new WeakMap,ht=new WeakSet,vt=function(){let e=this.gl,t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw Error(`[VFX-JS] Failed to create quad VAO`);this.vao=t,pt(this,_t,n,`f`);let r=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)};function bt(e,t,n,r={}){return new ge(e,t,n,{float:r.float??!1})}function xt(n,r){let i=r.renderingToBuffer??!1,a;a=i?`none`:r.premultipliedAlpha?`premultiplied`:`normal`;let o=r.glslVersion??Ne(r.fragmentShader);return new Be(n,r.vertexShader??(o===`100`?t:e),r.fragmentShader,r.uniforms,a,o)}var St=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},M=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},N,Ct,P,wt,Tt,F,Et=class{constructor(e,t,n,r,i,a,o,s){if(N.set(this,void 0),Ct.set(this,void 0),P.set(this,void 0),wt.set(this,void 0),Tt.set(this,void 0),F.set(this,void 0),St(this,wt,r??!1,`f`),St(this,Tt,i??!1,`f`),St(this,F,a,`f`),St(this,Ct,{},`f`),St(this,N,{src:{value:null},offset:{value:new D},resolution:{value:new D},viewport:{value:new we},time:{value:0},mouse:{value:new D},passIndex:{value:0}},`f`),n)for(let[e,t]of Object.entries(n))typeof t==`function`?(M(this,Ct,`f`)[e]=t,M(this,N,`f`)[e]={value:t()}):M(this,N,`f`)[e]={value:t};this.pass=xt(e,{fragmentShader:t,uniforms:M(this,N,`f`),renderingToBuffer:o??!1,premultipliedAlpha:!0,glslVersion:s})}get uniforms(){return M(this,N,`f`)}setUniforms(e,t,n,r,i,a){M(this,N,`f`).src.value=e,M(this,N,`f`).resolution.value.set(n.w*t,n.h*t),M(this,N,`f`).offset.value.set(n.x*t,n.y*t),M(this,N,`f`).time.value=r,M(this,N,`f`).mouse.value.set(i*t,a*t)}updateCustomUniforms(e){for(let[e,t]of Object.entries(M(this,Ct,`f`)))M(this,N,`f`)[e]&&(M(this,N,`f`)[e].value=t());if(e)for(let[t,n]of Object.entries(e))M(this,N,`f`)[t]&&(M(this,N,`f`)[t].value=n())}initializeBackbuffer(e,t,n,r){M(this,wt,`f`)&&!M(this,P,`f`)&&(M(this,F,`f`)?St(this,P,new Ce(e,M(this,F,`f`)[0],M(this,F,`f`)[1],1,M(this,Tt,`f`)),`f`):St(this,P,new Ce(e,t,n,r,M(this,Tt,`f`)),`f`))}resizeBackbuffer(e,t){M(this,P,`f`)&&!M(this,F,`f`)&&M(this,P,`f`).resize(e,t)}registerBufferUniform(e){M(this,N,`f`)[e]||(M(this,N,`f`)[e]={value:null})}get backbuffer(){return M(this,P,`f`)}get persistent(){return M(this,wt,`f`)}get float(){return M(this,Tt,`f`)}get size(){return M(this,F,`f`)}getTargetDimensions(){return M(this,F,`f`)}dispose(){this.pass.dispose(),M(this,P,`f`)?.dispose()}};N=new WeakMap,Ct=new WeakMap,P=new WeakMap,wt=new WeakMap,Tt=new WeakMap,F=new WeakMap;function Dt(e,t,n,r){return{top:e,right:t,bottom:n,left:r}}function Ot(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:Array.isArray(e)?{top:e[0],right:e[1],bottom:e[2],left:e[3]}:{top:e.top??0,right:e.right??0,bottom:e.bottom??0,left:e.left??0}}function kt(e){return Ot(e)}var At=Dt(0,0,0,0);function jt(e){return Ot(e)}function Mt(e){return{top:e.top,right:e.right,bottom:e.bottom,left:e.left}}function Nt(e,t){return{top:e.top-t.top,right:e.right+t.right,bottom:e.bottom+t.bottom,left:e.left-t.left}}function Pt(e,t,n){return Math.min(Math.max(e,t),n)}function Ft(e,t){let n=Pt(t.left,e.left,e.right),r=(Pt(t.right,e.left,e.right)-n)/(t.right-t.left),i=Pt(t.top,e.top,e.bottom);return r*((Pt(t.bottom,e.top,e.bottom)-i)/(t.bottom-t.top))}var I=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},L=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},R,z,B,V,It,Lt,H,U,Rt,W,zt,Bt,G,K,q,Vt,Ht,Ut,Wt,J,Y,Gt,Kt,qt,Jt,Yt,Xt,Zt,Qt,$t,en,tn,X,nn,rn,an,on,sn=new Map,cn=class{constructor(e,t){R.add(this),z.set(this,void 0),B.set(this,void 0),V.set(this,void 0),It.set(this,void 0),Lt.set(this,void 0),H.set(this,void 0),U.set(this,[]),Rt.set(this,[]),W.set(this,void 0),zt.set(this,[]),Bt.set(this,new Map),G.set(this,void 0),K.set(this,2),q.set(this,[]),Vt.set(this,Date.now()/1e3),Ht.set(this,jt(0)),Ut.set(this,jt(0)),Wt.set(this,[0,0]),J.set(this,0),Y.set(this,0),Gt.set(this,0),Kt.set(this,0),qt.set(this,new WeakMap),Yt.set(this,async()=>{if(typeof window<`u`){for(let e of L(this,q,`f`))if(e.type===`text`&&e.isInViewport){let t=e.element.getBoundingClientRect();(t.width!==e.width||t.height!==e.height)&&(await L(this,R,`m`,Zt).call(this,e),e.width=t.width,e.height=t.height)}for(let e of L(this,q,`f`))if(e.type===`text`&&!e.isInViewport){let t=e.element.getBoundingClientRect();(t.width!==e.width||t.height!==e.height)&&(await L(this,R,`m`,Zt).call(this,e),e.width=t.width,e.height=t.height)}}}),Xt.set(this,e=>{typeof window<`u`&&(I(this,Gt,e.clientX,`f`),I(this,Kt,window.innerHeight-e.clientY,`f`))}),$t.set(this,()=>{this.isPlaying()&&(this.render(),I(this,G,requestAnimationFrame(L(this,$t,`f`)),`f`))}),I(this,z,e,`f`),I(this,B,t,`f`),I(this,V,new ft(t),`f`),I(this,It,L(this,V,`f`).gl,`f`),L(this,It,`f`).clearColor(0,0,0,0),I(this,K,e.pixelRatio,`f`),I(this,Lt,new yt(L(this,V,`f`)),`f`),typeof window<`u`&&(window.addEventListener(`resize`,L(this,Yt,`f`)),window.addEventListener(`pointermove`,L(this,Xt,`f`))),L(this,Yt,`f`).call(this),I(this,H,new Ue(L(this,V,`f`)),`f`),L(this,R,`m`,rn).call(this,e.postEffects),L(this,V,`f`).onContextRestored(()=>{L(this,It,`f`).clearColor(0,0,0,0)})}destroy(){this.stop(),typeof window<`u`&&(window.removeEventListener(`resize`,L(this,Yt,`f`)),window.removeEventListener(`pointermove`,L(this,Xt,`f`))),L(this,W,`f`)?.dispose();for(let e of L(this,Bt,`f`).values())e?.dispose();for(let e of L(this,U,`f`))e.dispose();L(this,H,`f`).dispose(),L(this,Lt,`f`).dispose()}async addElement(e,t={},n){let r=L(this,R,`m`,Qt).call(this,t),i=e.getBoundingClientRect(),a=Mt(i),[o,s]=dn(t.overflow),c=Nt(a,s),l=fn(t.intersection),u=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),d,f,p=!1;if(e instanceof HTMLImageElement)if(f=`img`,p=!!e.src.match(/\.gif/i),p){let t=await ot.create(e.src,L(this,K,`f`));sn.set(e,t),d=new w(L(this,V,`f`),t.getCanvas())}else{let t=await ue(e.src);d=new w(L(this,V,`f`),t)}else if(e instanceof HTMLVideoElement)d=new w(L(this,V,`f`),e),f=`video`;else if(e instanceof HTMLCanvasElement)e.hasAttribute(`layoutsubtree`)&&n?(d=new w(L(this,V,`f`),n),f=`hic`):(d=new w(L(this,V,`f`),e),f=`canvas`);else{let t=await Ge(e,u,void 0,this.maxTextureSize);d=new w(L(this,V,`f`),t),f=`text`}let[m,h]=mn(t.wrap);d.wrapS=m,d.wrapT=h,d.needsUpdate=!0;let g=t.autoCrop??!0;if(f!==`hic`&&t.overlay!==!0)if(typeof t.overlay==`number`)e.style.setProperty(`opacity`,t.overlay.toString());else{let t=f===`video`?`0.0001`:`0`;e.style.setProperty(`opacity`,t.toString())}let _={src:{value:d},resolution:{value:new D},offset:{value:new D},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},mouse:{value:new D},intersection:{value:0},viewport:{value:new we},autoCrop:{value:g}},v={};if(t.uniforms!==void 0)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(_[e]={value:n()},v[e]=n):_[e]={value:n};let y;t.backbuffer&&(y=(()=>{let e=(c.right-c.left)*L(this,K,`f`),t=(c.bottom-c.top)*L(this,K,`f`);return new Ce(L(this,V,`f`),e,t,L(this,K,`f`),!1)})(),_.backbuffer={value:y.texture});let b=new Map,x=new Map;for(let e=0;e<r.length-1;e++){let t=r[e].target??`pass${e}`;r[e]={...r[e],target:t};let n=r[e].size,i=n?n[0]:(c.right-c.left)*L(this,K,`f`),a=n?n[1]:(c.bottom-c.top)*L(this,K,`f`);if(r[e].persistent){let i=n?1:L(this,K,`f`),a=n?n[0]:c.right-c.left,o=n?n[1]:c.bottom-c.top;x.set(t,new Ce(L(this,V,`f`),a,o,i,r[e].float))}else b.set(t,bt(L(this,V,`f`),i,a,{float:r[e].float}))}let ee=[];for(let e=0;e<r.length;e++){let t=r[e],n=t.frag,i={..._},a={};for(let[e,r]of b)e!==t.target&&n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:r.texture});for(let[e,t]of x)n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:t.texture});if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(i[e]={value:n()},a[e]=n):i[e]={value:n};let o=xt(L(this,V,`f`),{vertexShader:t.vert,fragmentShader:n,uniforms:i,renderingToBuffer:t.target!==void 0,glslVersion:t.glslVersion});ee.push({pass:o,uniforms:i,uniformGenerators:{...v,...a},target:t.target,persistent:t.persistent,float:t.float,size:t.size,backbuffer:t.target?x.get(t.target):void 0})}let te=Date.now()/1e3,S={type:f,element:e,isInViewport:!1,isInLogicalViewport:!1,width:i.width,height:i.height,passes:ee,bufferTargets:b,startTime:te,enterTime:te,leaveTime:-1/0,release:t.release??1/0,isGif:p,isFullScreen:o,overflow:s,intersection:l,originalOpacity:u,srcTexture:d,zIndex:t.zIndex??0,backbuffer:y,autoCrop:g};L(this,R,`m`,en).call(this,S,a,te),L(this,q,`f`).push(S),L(this,q,`f`).sort((e,t)=>e.zIndex-t.zIndex)}removeElement(e){let t=L(this,q,`f`).findIndex(t=>t.element===e);if(t!==-1){let n=L(this,q,`f`).splice(t,1)[0];for(let e of n.bufferTargets.values())e.dispose();for(let e of n.passes)e.pass.dispose(),e.backbuffer?.dispose();n.backbuffer?.dispose(),n.srcTexture.dispose(),e.style.setProperty(`opacity`,n.originalOpacity.toString())}}updateTextElement(e){let t=L(this,q,`f`).findIndex(t=>t.element===e);return t===-1?Promise.resolve():L(this,R,`m`,Zt).call(this,L(this,q,`f`)[t])}updateCanvasElement(e){let t=L(this,q,`f`).find(t=>t.element===e);if(t){let n=t.passes[0].uniforms.src,r=n.value,i=new w(L(this,V,`f`),e);i.wrapS=r.wrapS,i.wrapT=r.wrapT,i.needsUpdate=!0,n.value=i,t.srcTexture=i,r.dispose()}}updateHICTexture(e,t){let n=L(this,q,`f`).find(t=>t.element===e);if(!n||n.type!==`hic`)return;let r=n.passes[0].uniforms.src,i=r.value;if(i.source===t)i.needsUpdate=!0;else{let e=new w(L(this,V,`f`),t);e.wrapS=i.wrapS,e.wrapT=i.wrapT,e.needsUpdate=!0,r.value=e,n.srcTexture=e,i.dispose()}}get maxTextureSize(){return L(this,V,`f`).maxTextureSize}isPlaying(){return L(this,G,`f`)!==void 0}play(){this.isPlaying()||I(this,G,requestAnimationFrame(L(this,$t,`f`)),`f`)}stop(){L(this,G,`f`)!==void 0&&(cancelAnimationFrame(L(this,G,`f`)),I(this,G,void 0,`f`))}render(){let e=Date.now()/1e3,t=L(this,It,`f`);L(this,R,`m`,Jt).call(this),t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,L(this,B,`f`).width,L(this,B,`f`).height),t.clear(t.COLOR_BUFFER_BIT);let n=L(this,Ht,`f`).right-L(this,Ht,`f`).left,r=L(this,Ht,`f`).bottom-L(this,Ht,`f`).top,i=ve(0,0,n,r),a=L(this,U,`f`).length>0;a&&(L(this,R,`m`,on).call(this,n,r),L(this,W,`f`)&&(t.bindFramebuffer(t.FRAMEBUFFER,L(this,W,`f`).fbo),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)));for(let t of L(this,q,`f`)){let o=t.element.getBoundingClientRect(),s=Mt(o),c=L(this,R,`m`,en).call(this,t,s,e);if(!c.isVisible)continue;let l=t.passes[0].uniforms;l.time.value=e-t.startTime,l.resolution.value.set(o.width*L(this,K,`f`),o.height*L(this,K,`f`)),l.mouse.value.set((L(this,Gt,`f`)+L(this,J,`f`))*L(this,K,`f`),(L(this,Kt,`f`)+L(this,Y,`f`))*L(this,K,`f`));for(let e of t.passes)for(let[t,n]of Object.entries(e.uniformGenerators))e.uniforms[t].value=n();sn.get(t.element)?.update(),(t.type===`video`||t.isGif)&&(l.src.value.needsUpdate=!0);let u=_e(s,r,L(this,J,`f`),L(this,Y,`f`)),d=_e(c.rectWithOverflow,r,L(this,J,`f`),L(this,Y,`f`));t.backbuffer&&(t.passes[0].uniforms.backbuffer.value=t.backbuffer.texture);{let e=t.isFullScreen?i:d,n=Math.max(1,e.w*L(this,K,`f`)),r=Math.max(1,e.h*L(this,K,`f`)),a=Math.max(1,e.w),o=Math.max(1,e.h);for(let e=0;e<t.passes.length-1;e++){let i=t.passes[e];if(!i.size)if(i.backbuffer)i.backbuffer.resize(a,o);else{let e=t.bufferTargets.get(i.target);e&&(e.width!==n||e.height!==r)&&e.setSize(n,r)}}}let f=new Map;for(let e of t.passes)e.backbuffer&&e.target&&f.set(e.target,e.backbuffer.texture);let p=t.srcTexture,m=L(this,Gt,`f`)+L(this,J,`f`)-u.x,h=L(this,Kt,`f`)+L(this,Y,`f`)-u.y;for(let e=0;e<t.passes.length-1;e++){let n=t.passes[e],r=t.isFullScreen?i:d;n.uniforms.src.value=p;for(let[e,t]of f)n.uniforms[e]&&(n.uniforms[e].value=t);for(let[e,t]of Object.entries(n.uniformGenerators))n.uniforms[e]&&(n.uniforms[e].value=t());let a=n.size?n.size[0]:r.w*L(this,K,`f`),o=n.size?n.size[1]:r.h*L(this,K,`f`),s=n.size?ve(0,0,n.size[0],n.size[1]):ve(0,0,r.w,r.h);if(n.uniforms.resolution.value.set(a,o),n.uniforms.offset.value.set(0,0),n.uniforms.mouse.value.set(m/r.w*a,h/r.h*o),n.backbuffer)L(this,R,`m`,X).call(this,n.pass,n.backbuffer.target,s,n.uniforms,!0),n.backbuffer.swap(),p=n.backbuffer.texture;else{let e=t.bufferTargets.get(n.target);if(!e)continue;L(this,R,`m`,X).call(this,n.pass,e,s,n.uniforms,!0),p=e.texture}n.target&&f.set(n.target,p)}let g=t.passes[t.passes.length-1];g.uniforms.src.value=p,g.uniforms.resolution.value.set(o.width*L(this,K,`f`),o.height*L(this,K,`f`)),g.uniforms.offset.value.set(u.x*L(this,K,`f`),u.y*L(this,K,`f`)),g.uniforms.mouse.value.set((L(this,Gt,`f`)+L(this,J,`f`))*L(this,K,`f`),(L(this,Kt,`f`)+L(this,Y,`f`))*L(this,K,`f`));for(let[e,t]of f)g.uniforms[e]&&(g.uniforms[e].value=t);for(let[e,t]of Object.entries(g.uniformGenerators))g.uniforms[e]&&(g.uniforms[e].value=t());t.backbuffer?(g.uniforms.backbuffer.value=t.backbuffer.texture,t.isFullScreen?(t.backbuffer.resize(n,r),L(this,R,`m`,nn).call(this,t,u.x,u.y),L(this,R,`m`,X).call(this,g.pass,t.backbuffer.target,i,g.uniforms,!0),t.backbuffer.swap(),L(this,H,`f`).setUniforms(t.backbuffer.texture,L(this,K,`f`),i),L(this,R,`m`,X).call(this,L(this,H,`f`).pass,a&&L(this,W,`f`)||null,i,L(this,H,`f`).uniforms,!1)):(t.backbuffer.resize(d.w,d.h),L(this,R,`m`,nn).call(this,t,t.overflow.left,t.overflow.bottom),L(this,R,`m`,X).call(this,g.pass,t.backbuffer.target,t.backbuffer.getViewport(),g.uniforms,!0),t.backbuffer.swap(),L(this,H,`f`).setUniforms(t.backbuffer.texture,L(this,K,`f`),d),L(this,R,`m`,X).call(this,L(this,H,`f`).pass,a&&L(this,W,`f`)||null,d,L(this,H,`f`).uniforms,!1))):(L(this,R,`m`,nn).call(this,t,u.x,u.y),L(this,R,`m`,X).call(this,g.pass,a&&L(this,W,`f`)||null,t.isFullScreen?i:d,g.uniforms,!1))}a&&L(this,W,`f`)&&L(this,R,`m`,an).call(this,i,e)}};z=new WeakMap,B=new WeakMap,V=new WeakMap,It=new WeakMap,Lt=new WeakMap,H=new WeakMap,U=new WeakMap,Rt=new WeakMap,W=new WeakMap,zt=new WeakMap,Bt=new WeakMap,G=new WeakMap,K=new WeakMap,q=new WeakMap,Vt=new WeakMap,Ht=new WeakMap,Ut=new WeakMap,Wt=new WeakMap,J=new WeakMap,Y=new WeakMap,Gt=new WeakMap,Kt=new WeakMap,qt=new WeakMap,Yt=new WeakMap,Xt=new WeakMap,$t=new WeakMap,R=new WeakSet,Jt=function(){if(typeof window>`u`)return;let e=L(this,B,`f`).ownerDocument,t=e.compatMode===`BackCompat`?e.body:e.documentElement,n=t.clientWidth,r=t.clientHeight,i=window.scrollX,a=window.scrollY,o,s;if(L(this,z,`f`).fixedCanvas)o=0,s=0;else if(L(this,z,`f`).wrapper)o=n*L(this,z,`f`).scrollPadding[0],s=r*L(this,z,`f`).scrollPadding[1];else{let t=e.body.scrollWidth-(i+n),c=e.body.scrollHeight-(a+r);o=hn(n*L(this,z,`f`).scrollPadding[0],0,t),s=hn(r*L(this,z,`f`).scrollPadding[1],0,c)}let c=n+o*2,l=r+s*2;(c!==L(this,Wt,`f`)[0]||l!==L(this,Wt,`f`)[1])&&(L(this,B,`f`).style.width=`${c}px`,L(this,B,`f`).style.height=`${l}px`,L(this,V,`f`).setSize(c,l,L(this,K,`f`)),I(this,Ht,jt({top:-s,left:-o,right:n+o,bottom:r+s}),`f`),I(this,Ut,jt({top:0,left:0,right:n,bottom:r}),`f`),I(this,Wt,[c,l],`f`),I(this,J,o,`f`),I(this,Y,s,`f`)),L(this,z,`f`).fixedCanvas||L(this,B,`f`).style.setProperty(`transform`,`translate(${i-o}px, ${a-s}px)`)},Zt=async function(e){if(!L(this,qt,`f`).get(e.element)){L(this,qt,`f`).set(e.element,!0);try{let t=e.passes[0].uniforms.src,n=t.value,r=n.source instanceof OffscreenCanvas?n.source:void 0,i=await Ge(e.element,e.originalOpacity,r,this.maxTextureSize);if(i.width===0||i.width===0)throw`omg`;let a=new w(L(this,V,`f`),i);a.wrapS=n.wrapS,a.wrapT=n.wrapT,a.needsUpdate=!0,t.value=a,e.srcTexture=a,n.dispose()}catch(e){console.error(e)}L(this,qt,`f`).set(e.element,!1)}},Qt=function(e){let t=t=>t.glslVersion===void 0&&e.glslVersion!==void 0?{...t,glslVersion:e.glslVersion}:t;return Array.isArray(e.shader)?e.shader.map(t):[t({frag:L(this,R,`m`,tn).call(this,e.shader||`uvGradient`)})]},en=function(e,t,n){let r=Nt(t,e.overflow),i=e.isFullScreen||ln(L(this,Ut,`f`),r),a=Nt(L(this,Ut,`f`),e.intersection.rootMargin),o=Ft(a,t),s=e.isFullScreen||un(a,t,o,e.intersection.threshold);!e.isInLogicalViewport&&s&&(e.enterTime=n,e.leaveTime=1/0),e.isInLogicalViewport&&!s&&(e.leaveTime=n),e.isInViewport=i,e.isInLogicalViewport=s;let c=i&&n-e.leaveTime<=e.release;if(c){let t=e.passes[0].uniforms;t.intersection.value=o,t.enterTime.value=n-e.enterTime,t.leaveTime.value=n-e.leaveTime}return{isVisible:c,intersection:o,rectWithOverflow:r}},tn=function(e){return e in a?a[e]:e},X=function(e,t,n,r,i){let a=L(this,It,`f`);i&&t!==null&&t!==L(this,W,`f`)&&(a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.viewport(0,0,t.width,t.height),a.clear(a.COLOR_BUFFER_BIT));let o=r.viewport;o&&o.value instanceof we&&o.value.set(n.x*L(this,K,`f`),n.y*L(this,K,`f`),n.w*L(this,K,`f`),n.h*L(this,K,`f`));try{Ve(a,L(this,Lt,`f`),e,t,n,L(this,Wt,`f`)[0],L(this,Wt,`f`)[1],L(this,K,`f`))}catch(e){console.error(e)}},nn=function(e,t,n){let r=e.passes[0].uniforms.offset.value;r.x=t*L(this,K,`f`),r.y=n*L(this,K,`f`)},rn=function(e){let t=[],n=[],r=[];for(let t of e)`frag`in t&&r.push(t);for(let e=0;e<r.length-1;e++)r[e].target||(r[e]={...r[e],target:`pass${e}`});for(let r of e){let e,i;`frag`in r?(e=r.frag,i=new Et(L(this,V,`f`),e,r.uniforms,r.persistent??!1,r.float??!1,r.size,r.target!==void 0,r.glslVersion),n.push(r.target)):(e=L(this,R,`m`,tn).call(this,r.shader),i=new Et(L(this,V,`f`),e,r.uniforms,r.persistent??!1,r.float??!1,void 0,!1,r.glslVersion),r.persistent&&i.registerBufferUniform(`backbuffer`),n.push(void 0)),L(this,U,`f`).push(i),t.push(e);let a={};if(r.uniforms)for(let[e,t]of Object.entries(r.uniforms))typeof t==`function`&&(a[e]=t);L(this,zt,`f`).push(a)}I(this,Rt,n,`f`);for(let e of r)e.target&&L(this,Bt,`f`).set(e.target,void 0);let i=n.filter(e=>e!==void 0);for(let e=0;e<L(this,U,`f`).length;e++)for(let n of i)t[e].match(RegExp(`uniform\\s+sampler2D\\s+${n}\\b`))&&L(this,U,`f`)[e].registerBufferUniform(n)},an=function(e,t){if(!L(this,W,`f`))return;let n=L(this,W,`f`).texture,r=new Map;for(let e=0;e<L(this,U,`f`).length;e++){let t=L(this,U,`f`)[e],n=L(this,Rt,`f`)[e];n&&t.backbuffer&&r.set(n,t.backbuffer.texture)}for(let i=0;i<L(this,U,`f`).length;i++){let a=L(this,U,`f`)[i],o=i===L(this,U,`f`).length-1,s=L(this,zt,`f`)[i],c=L(this,Rt,`f`)[i],l=L(this,Gt,`f`)+L(this,J,`f`),u=L(this,Kt,`f`)+L(this,Y,`f`),d=a.getTargetDimensions();if(d){let[r,i]=d;a.uniforms.src.value=n,a.uniforms.resolution.value.set(r,i),a.uniforms.offset.value.set(0,0),a.uniforms.time.value=t-L(this,Vt,`f`),a.uniforms.mouse.value.set(l/e.w*r,u/e.h*i)}else a.setUniforms(n,L(this,K,`f`),e,t-L(this,Vt,`f`),l,u);a.uniforms.passIndex.value=i,a.updateCustomUniforms(s);for(let[e,t]of r){let n=a.uniforms[e];n&&(n.value=t)}if(o)a.backbuffer?(a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture),L(this,R,`m`,X).call(this,a.pass,a.backbuffer.target,e,a.uniforms,!0),a.backbuffer.swap(),L(this,H,`f`).setUniforms(a.backbuffer.texture,L(this,K,`f`),e),L(this,R,`m`,X).call(this,L(this,H,`f`).pass,null,e,L(this,H,`f`).uniforms,!1)):L(this,R,`m`,X).call(this,a.pass,null,e,a.uniforms,!1);else if(a.backbuffer){a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture);let t=d?ve(0,0,d[0]/L(this,K,`f`),d[1]/L(this,K,`f`)):e;L(this,R,`m`,X).call(this,a.pass,a.backbuffer.target,t,a.uniforms,!0),a.backbuffer.swap(),n=a.backbuffer.texture,c&&r.set(c,a.backbuffer.texture)}else{let t=c??`postEffect${i}`,o=L(this,Bt,`f`).get(t),s=d?d[0]:e.w*L(this,K,`f`),l=d?d[1]:e.h*L(this,K,`f`);(!o||o.width!==s||o.height!==l)&&(o?.dispose(),o=bt(L(this,V,`f`),s,l,{float:a.float}),L(this,Bt,`f`).set(t,o));let u=d?ve(0,0,d[0]/L(this,K,`f`),d[1]/L(this,K,`f`)):e;L(this,R,`m`,X).call(this,a.pass,o,u,a.uniforms,!0),n=o.texture,c&&r.set(c,o.texture)}}},on=function(e,t){let n=e*L(this,K,`f`),r=t*L(this,K,`f`);(!L(this,W,`f`)||L(this,W,`f`).width!==n||L(this,W,`f`).height!==r)&&(L(this,W,`f`)?.dispose(),I(this,W,bt(L(this,V,`f`),n,r),`f`));for(let n of L(this,U,`f`))n.persistent&&!n.backbuffer?n.initializeBackbuffer(L(this,V,`f`),e,t,L(this,K,`f`)):n.backbuffer&&n.resizeBackbuffer(e,t)};function ln(e,t){return t.left<=e.right&&t.right>=e.left&&t.top<=e.bottom&&t.bottom>=e.top}function un(e,t,n,r){return r===0?ln(e,t):n>=r}function dn(e){return e===!0?[!0,At]:e===void 0?[!1,At]:[!1,kt(e)]}function fn(e){return{threshold:e?.threshold??0,rootMargin:kt(e?.rootMargin??0)}}function pn(e){return e===`repeat`?`repeat`:e===`mirror`?`mirror`:`clamp`}function mn(e){if(!e)return[`clamp`,`clamp`];if(Array.isArray(e))return[pn(e[0]),pn(e[1])];let t=pn(e);return[t,t]}function hn(e,t,n){return Math.max(t,Math.min(n,e))}function gn(){try{let e=document.createElement(`canvas`);return(e.getContext(`webgl2`)||e.getContext(`webgl`))!==null}catch{return!1}}var _n=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Z=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},vn,Q,yn,$,bn,xn,Sn,Cn;function wn(){if(typeof window>`u`)throw`Cannot find 'window'. VFX-JS only runs on the browser.`;if(typeof document>`u`)throw`Cannot find 'document'. VFX-JS only runs on the browser.`}function Tn(e){return{position:e?`fixed`:`absolute`,top:0,left:0,width:`0px`,height:`0px`,"z-index":9999,"pointer-events":`none`}}var En=class e{static init(t){try{return new e(t)}catch{return null}}constructor(e={}){if(vn.add(this),Q.set(this,void 0),yn.set(this,void 0),$.set(this,new Map),wn(),!gn())throw Error(`[VFX-JS] WebGL is not available in this environment.`);let t=te(e),n=document.createElement(`canvas`),r=Tn(t.fixedCanvas);for(let[e,t]of Object.entries(r))n.style.setProperty(e,t.toString());t.zIndex!==void 0&&n.style.setProperty(`z-index`,t.zIndex.toString()),(t.wrapper??document.body).appendChild(n),_n(this,yn,n,`f`),_n(this,Q,new cn(t,n),`f`),t.autoplay&&Z(this,Q,`f`).play()}async add(e,t,n){e instanceof HTMLImageElement?await Z(this,vn,`m`,bn).call(this,e,t):e instanceof HTMLVideoElement?await Z(this,vn,`m`,xn).call(this,e,t):e instanceof HTMLCanvasElement?e.hasAttribute(`layoutsubtree`)&&n?await Z(this,Q,`f`).addElement(e,t,n):await Z(this,vn,`m`,Sn).call(this,e,t):await Z(this,vn,`m`,Cn).call(this,e,t)}updateHICTexture(e,t){Z(this,Q,`f`).updateHICTexture(e,t)}get maxTextureSize(){return Z(this,Q,`f`).maxTextureSize}async addHTML(e,t){if(!ee())return console.warn(`html-in-canvas not supported, falling back to dom-to-canvas`),this.add(e,t);t.overlay!==void 0&&console.warn(`addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.`);let{overlay:n,...r}=t,i=Z(this,$,`f`).get(e);i&&Z(this,Q,`f`).removeElement(i);let{canvas:a,initialCapture:o}=await y(e,{onCapture:e=>{Z(this,Q,`f`).updateHICTexture(a,e)},maxSize:Z(this,Q,`f`).maxTextureSize});i=a,Z(this,$,`f`).set(e,i),await Z(this,Q,`f`).addElement(i,r,o)}remove(e){let t=Z(this,$,`f`).get(e);t?(b(t,e),Z(this,$,`f`).delete(e),Z(this,Q,`f`).removeElement(t)):Z(this,Q,`f`).removeElement(e)}async update(e){let t=Z(this,$,`f`).get(e);if(t){t.requestPaint();return}if(e instanceof HTMLCanvasElement){Z(this,Q,`f`).updateCanvasElement(e);return}else return Z(this,Q,`f`).updateTextElement(e)}play(){Z(this,Q,`f`).play()}stop(){Z(this,Q,`f`).stop()}render(){Z(this,Q,`f`).render()}destroy(){for(let[e,t]of Z(this,$,`f`))b(t,e);Z(this,$,`f`).clear(),Z(this,Q,`f`).destroy(),Z(this,yn,`f`).remove()}};Q=new WeakMap,yn=new WeakMap,$=new WeakMap,vn=new WeakSet,bn=function(e,t){return e.complete?Z(this,Q,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`load`,()=>{Z(this,Q,`f`).addElement(e,t),n()},{once:!0})})},xn=function(e,t){return e.readyState>=3?Z(this,Q,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`canplay`,()=>{Z(this,Q,`f`).addElement(e,t),n()},{once:!0})})},Sn=function(e,t){return Z(this,Q,`f`).addElement(e,t)},Cn=function(e,t){return Z(this,Q,`f`).addElement(e,t)};export{En as t};
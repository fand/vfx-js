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
    `};function o(e){if(!e.src||e.src.startsWith(`data:`))return!1;try{return new URL(e.src,location.href).origin!==location.origin}catch{return!1}}async function s(e){let t=await(await fetch(e)).blob();return URL.createObjectURL(t)}async function c(e){let t=Array.from(e.querySelectorAll(`img`)).filter(e=>e.complete&&e.naturalWidth>0&&o(e));if(t.length===0)return()=>{};let n=new Map,r=[];return await Promise.all(t.map(async e=>{try{let t=await s(e.src);n.set(e,e.src),r.push(t),await new Promise(n=>{e.addEventListener(`load`,()=>n(),{once:!0}),e.src=t})}catch{}})),()=>{for(let[e,t]of n)e.src=t;for(let e of r)URL.revokeObjectURL(e)}}var l=[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`],u=[`position`,`top`,`right`,`bottom`,`left`,`float`,`flex`,`flex-grow`,`flex-shrink`,`flex-basis`,`align-self`,`justify-self`,`place-self`,`order`,`grid-column`,`grid-column-start`,`grid-column-end`,`grid-row`,`grid-row-start`,`grid-row-end`,`grid-area`],d=new WeakMap,f=new WeakMap,p=new WeakMap,m=new WeakMap,h=new WeakMap,g=new WeakMap;async function _(e,t){let n=e.getContext(`2d`);if(!n)throw Error(`Failed to get 2d context from layoutsubtree canvas`);let{onCapture:r,maxSize:i}=t,a=null,o=null,s=new Promise(e=>{o=e});e.onpaint=()=>{let t=e.firstElementChild;if(!t||e.width===0||e.height===0)return;n.clearRect(0,0,e.width,e.height),n.drawElementImage(t,0,0);let s=e.width,c=e.height;if(i&&(s>i||c>i)){let e=Math.min(i/s,i/c);s=Math.floor(s*e),c=Math.floor(c*e)}(!a||a.width!==s||a.height!==c)&&(a=new OffscreenCanvas(s,c));let l=a.getContext(`2d`);if(l){if(l.clearRect(0,0,s,c),l.drawImage(e,0,0,s,c),n.clearRect(0,0,e.width,e.height),o){o(a),o=null;return}r(a)}};let c=new ResizeObserver(t=>{for(let n of t){let t=n.devicePixelContentBoxSize?.[0];if(t)e.width=t.inlineSize,e.height=t.blockSize;else{let t=n.borderBoxSize?.[0];if(t){let n=window.devicePixelRatio;e.width=Math.round(t.inlineSize*n),e.height=Math.round(t.blockSize*n)}}}e.requestPaint()});c.observe(e,{box:`device-pixel-content-box`}),d.set(e,c);let l=e.firstElementChild,u=``;if(l){let t=new ResizeObserver(t=>{let n=t[0].borderBoxSize?.[0];if(!n)return;let r=`${Math.round(n.blockSize)}px`;r!==u&&(u=r,e.style.setProperty(`height`,r))});t.observe(l),f.set(e,t)}return s}function v(e){e.onpaint=null;let t=d.get(e);t&&(t.disconnect(),d.delete(e));let n=f.get(e);n&&(n.disconnect(),f.delete(e))}async function y(e,t){let n=e.getBoundingClientRect(),r=document.createElement(`canvas`);r.setAttribute(`layoutsubtree`,``),r.className=e.className;let i=e.getAttribute(`style`);i&&r.setAttribute(`style`,i),r.style.setProperty(`padding`,`0`),r.style.setProperty(`border`,`none`),r.style.setProperty(`box-sizing`,`content-box`);let a=getComputedStyle(e),o=a.display===`inline`?`block`:a.display;r.style.setProperty(`display`,o);for(let e of l)r.style.setProperty(e,a.getPropertyValue(e));for(let e of u)r.style.setProperty(e,a.getPropertyValue(e));let s=e=>Number.parseFloat(e),d=s(a.paddingLeft)+s(a.paddingRight)+s(a.borderLeftWidth)+s(a.borderRightWidth),f=s(a.paddingTop)+s(a.paddingBottom)+s(a.borderTopWidth)+s(a.borderBottomWidth);d>0&&r.style.setProperty(`width`,`${n.width}px`),f>0&&r.style.setProperty(`height`,`${n.height}px`),r.style.width||r.style.setProperty(`width`,`100%`),r.style.height||r.style.setProperty(`height`,`${n.height}px`);let v=window.devicePixelRatio;r.width=Math.round(n.width*v),r.height=Math.round(n.height*v),p.set(e,e.style.margin),m.set(e,e.style.width),h.set(e,e.style.boxSizing),e.parentNode?.insertBefore(r,e),r.appendChild(e),e.style.setProperty(`margin`,`0`),e.style.setProperty(`width`,`100%`),e.style.setProperty(`box-sizing`,`border-box`);let y=await c(e);return g.set(r,y),{canvas:r,initialCapture:await _(r,t)}}function b(e,t){v(e);let n=g.get(e);n&&(n(),g.delete(e)),e.parentNode?.insertBefore(t,e),e.remove();let r=p.get(t);r!==void 0&&(t.style.margin=r,p.delete(t));let i=m.get(t);i!==void 0&&(t.style.width=i,m.delete(t));let a=h.get(t);a!==void 0&&(t.style.boxSizing=a,h.delete(t))}var x;function ee(){if(x!==void 0)return x;try{let e=document.createElement(`canvas`),t=e.getContext(`2d`);x=t!==null&&typeof t.drawElementImage==`function`&&typeof e.requestPaint==`function`}catch{x=!1}return x}function te(e){let t=typeof window<`u`?window.devicePixelRatio:1,n;n=e.scrollPadding===void 0?[.1,.1]:e.scrollPadding===!1?[0,0]:Array.isArray(e.scrollPadding)?[e.scrollPadding[0]??.1,e.scrollPadding[1]??.1]:[e.scrollPadding,e.scrollPadding];let r;return r=e.postEffect===void 0?[]:Array.isArray(e.postEffect)?e.postEffect:[e.postEffect],{pixelRatio:e.pixelRatio??t,zIndex:e.zIndex??void 0,autoplay:e.autoplay??!0,fixedCanvas:e.scrollPadding===!1,scrollPadding:n,wrapper:e.wrapper,postEffects:r}}var S=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},C=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ne,re,ie,ae,oe,se,ce,le,w=class{constructor(e,t,n){ne.add(this),this.wrapS=`clamp`,this.wrapT=`clamp`,this.minFilter=`linear`,this.magFilter=`linear`,this.needsUpdate=!0,this.source=null,re.set(this,void 0),ie.set(this,!1),ae.set(this,void 0),oe.set(this,void 0),S(this,re,e,`f`),this.gl=e.gl;let r=n?.externalHandle;S(this,oe,r!==void 0,`f`),r===void 0?C(this,ne,`m`,se).call(this):(this.texture=r,S(this,ie,!0,`f`),this.needsUpdate=!1),t&&(this.source=t),S(this,ae,n?.autoRegister!==!1&&!C(this,oe,`f`),`f`),C(this,ae,`f`)&&e.addResource(this)}restore(){C(this,oe,`f`)||(C(this,ne,`m`,se).call(this),S(this,ie,!1,`f`),this.needsUpdate=!0)}bind(e){let t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&=(C(this,ne,`m`,ce).call(this),!1)}dispose(){C(this,ae,`f`)&&C(this,re,`f`).removeResource(this),C(this,oe,`f`)||this.gl.deleteTexture(this.texture)}};re=new WeakMap,ie=new WeakMap,ae=new WeakMap,oe=new WeakMap,ne=new WeakSet,se=function(){let e=this.gl.createTexture();if(!e)throw Error(`[VFX-JS] Failed to create texture`);this.texture=e},ce=function(){let e=this.gl,t=this.source;if(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4),t)try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)}catch(e){console.error(e)}else if(!C(this,ie,`f`)){let t=new Uint8Array([0,0,0,0]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,t)}C(this,ne,`m`,le).call(this),S(this,ie,!0,`f`)},le=function(){let e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,ue(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,ue(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,de(e,this.minFilter)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,de(e,this.magFilter))};function ue(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function de(e,t){return t===`nearest`?e.NEAREST:e.LINEAR}function fe(e){return new Promise((t,n)=>{let r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>t(r),r.onerror=n,r.src=e})}var pe=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},me=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},he,ge,_e,ve=class{constructor(e,t,n,r={}){he.add(this),ge.set(this,void 0),pe(this,ge,e,`f`),this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(n)),this.float=r.float??!1,this.texture=new w(e,void 0,{autoRegister:!1});let i=r.wrap;i!==void 0&&(typeof i==`string`?(this.texture.wrapS=i,this.texture.wrapT=i):(this.texture.wrapS=i[0],this.texture.wrapT=i[1])),r.filter!==void 0&&(this.texture.minFilter=r.filter,this.texture.magFilter=r.filter),me(this,he,`m`,_e).call(this),e.addResource(this)}setSize(e,t){let n=Math.max(1,Math.floor(e)),r=Math.max(1,Math.floor(t));n===this.width&&r===this.height||(this.width=n,this.height=r,me(this,he,`m`,_e).call(this))}restore(){this.texture.restore(),me(this,he,`m`,_e).call(this)}dispose(){me(this,ge,`f`).removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.texture.dispose()}};ge=new WeakMap,he=new WeakSet,_e=function(){let e=this.gl,t=this.fbo,n=e.createFramebuffer();if(!n)throw Error(`[VFX-JS] Failed to create framebuffer`);this.fbo=n;let r=this.texture.texture;e.bindTexture(e.TEXTURE_2D,r);let i=me(this,ge,`f`).floatLinearFilter,a=this.float?i?e.RGBA32F:e.RGBA16F:e.RGBA8,o=this.float?i?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,e.RGBA,o,null);let s=this.texture.minFilter===`nearest`?e.NEAREST:e.LINEAR,c=this.texture.magFilter===`nearest`?e.NEAREST:e.LINEAR,l=ye(e,this.texture.wrapS),u=ye(e,this.texture.wrapT);e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,s),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,c),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,l),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,u),e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.texture.needsUpdate=!1,this.texture.source=null,t&&e.deleteFramebuffer(t)};function ye(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function be(e,t,n,r){return{x:e.left+n,y:t-r-e.bottom,w:e.right-e.left,h:e.bottom-e.top}}function xe(e,t,n,r){return{x:e,y:t,w:n,h:r}}var Se=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},T=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ce,we,Te,E,Ee=class{constructor(e,t,n,r,i,a={}){Ce.set(this,void 0),we.set(this,void 0),Te.set(this,void 0),E.set(this,void 0),Se(this,Ce,t,`f`),Se(this,we,n,`f`),Se(this,Te,r,`f`);let o=t*r,s=n*r,c={float:i,wrap:a.wrap,filter:a.filter};Se(this,E,[new ve(e,o,s,c),new ve(e,o,s,c)],`f`)}get texture(){return T(this,E,`f`)[0].texture}get target(){return T(this,E,`f`)[1]}resize(e,t){if(e===T(this,Ce,`f`)&&t===T(this,we,`f`))return;Se(this,Ce,e,`f`),Se(this,we,t,`f`);let n=e*T(this,Te,`f`),r=t*T(this,Te,`f`);T(this,E,`f`)[0].setSize(n,r),T(this,E,`f`)[1].setSize(n,r)}swap(){Se(this,E,[T(this,E,`f`)[1],T(this,E,`f`)[0]],`f`)}getViewport(){return xe(0,0,T(this,Ce,`f`),T(this,we,`f`))}dispose(){T(this,E,`f`)[0].dispose(),T(this,E,`f`)[1].dispose()}};Ce=new WeakMap,we=new WeakMap,Te=new WeakMap,E=new WeakMap;var De=class{constructor(e=0,t=0){this.x=0,this.y=0,this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}},Oe=class{constructor(e=0,t=0,n=0,r=0){this.x=0,this.y=0,this.z=0,this.w=0,this.x=e,this.y=t,this.z=n,this.w=r}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}},ke=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Ae=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},je,Me,Ne,Pe,Fe,Ie,Le;function Re(e){return/#version\s+300\s+es\b/.test(e)?`300 es`:/#version\s+100\b/.test(e)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(e)?`100`:`300 es`}var ze=class{constructor(e,t,n,r){je.add(this),Me.set(this,void 0),Ne.set(this,void 0),Pe.set(this,void 0),Fe.set(this,void 0),Ie.set(this,new Map),ke(this,Me,e,`f`),this.gl=e.gl,ke(this,Ne,t,`f`),ke(this,Pe,n,`f`),ke(this,Fe,r??Re(n),`f`),Ae(this,je,`m`,Le).call(this),e.addResource(this)}restore(){Ae(this,je,`m`,Le).call(this)}use(){this.gl.useProgram(this.program)}hasUniform(e){return Ae(this,Ie,`f`).has(e)}uploadUniforms(e){let t=this.gl,n=0;for(let[r,i]of Ae(this,Ie,`f`)){let a=e[r];if(!a)continue;let o=a.value;if(o!=null){if(He(i.type)){o instanceof w&&(o.bind(n),t.uniform1i(i.location,n),n++);continue}o instanceof w||We(t,i,o)}}}dispose(){Ae(this,Me,`f`).removeResource(this),this.gl.deleteProgram(this.program)}};Me=new WeakMap,Ne=new WeakMap,Pe=new WeakMap,Fe=new WeakMap,Ie=new WeakMap,je=new WeakSet,Le=function(){let e=this.gl,t=Be(e,e.VERTEX_SHADER,Ve(Ae(this,Ne,`f`),Ae(this,Fe,`f`))),n=Be(e,e.FRAGMENT_SHADER,Ve(Ae(this,Pe,`f`),Ae(this,Fe,`f`))),r=e.createProgram();if(!r)throw Error(`[VFX-JS] Failed to create program`);if(e.attachShader(r,t),e.attachShader(r,n),e.bindAttribLocation(r,0,`position`),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let i=e.getProgramInfoLog(r)??``;throw e.deleteShader(t),e.deleteShader(n),e.deleteProgram(r),Error(`[VFX-JS] Program link failed: ${i}`)}e.detachShader(r,t),e.detachShader(r,n),e.deleteShader(t),e.deleteShader(n),this.program=r,Ae(this,Ie,`f`).clear();let i=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<i;t++){let n=e.getActiveUniform(r,t);if(!n)continue;let i=n.name.replace(/\[0\]$/,``),a=e.getUniformLocation(r,n.name);a&&Ae(this,Ie,`f`).set(i,{location:a,type:n.type,size:n.size})}};function Be(e,t,n){let r=e.createShader(t);if(!r)throw Error(`[VFX-JS] Failed to create shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)??``;throw e.deleteShader(r),Error(`[VFX-JS] Shader compile failed: ${t}\n\n${n}`)}return r}function Ve(e,t){return e.replace(/^\s+/,``).startsWith(`#version`)||t===`100`?e:`#version 300 es\n${e}`}function He(e){return e===35678||e===36298||e===36306||e===35682}var Ue=new Set;function We(e,t,n){let r=t.location,i=t.size>1,a=n,o=n,s=n;switch(t.type){case e.FLOAT:i?e.uniform1fv(r,a):e.uniform1f(r,n);return;case e.FLOAT_VEC2:if(i)e.uniform2fv(r,a);else if(n instanceof De)e.uniform2f(r,n.x,n.y);else{let t=n;e.uniform2f(r,t[0],t[1])}return;case e.FLOAT_VEC3:if(i)e.uniform3fv(r,a);else{let t=n;e.uniform3f(r,t[0],t[1],t[2])}return;case e.FLOAT_VEC4:if(i)e.uniform4fv(r,a);else if(n instanceof Oe)e.uniform4f(r,n.x,n.y,n.z,n.w);else{let t=n;e.uniform4f(r,t[0],t[1],t[2],t[3])}return;case e.INT:i?e.uniform1iv(r,o):e.uniform1i(r,n);return;case e.INT_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,t[0],t[1])}return;case e.INT_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,t[0],t[1],t[2])}return;case e.INT_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,t[0],t[1],t[2],t[3])}return;case e.BOOL:i?e.uniform1iv(r,o):e.uniform1i(r,+!!n);return;case e.BOOL_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,+!!t[0],+!!t[1])}return;case e.BOOL_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,+!!t[0],+!!t[1],+!!t[2])}return;case e.BOOL_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,+!!t[0],+!!t[1],+!!t[2],+!!t[3])}return;case e.FLOAT_MAT2:e.uniformMatrix2fv(r,!1,a);return;case e.FLOAT_MAT3:e.uniformMatrix3fv(r,!1,a);return;case e.FLOAT_MAT4:e.uniformMatrix4fv(r,!1,a);return;case e.UNSIGNED_INT:i?e.uniform1uiv(r,s):e.uniform1ui(r,n);return;case e.UNSIGNED_INT_VEC2:if(i)e.uniform2uiv(r,s);else{let t=n;e.uniform2ui(r,t[0],t[1])}return;case e.UNSIGNED_INT_VEC3:if(i)e.uniform3uiv(r,s);else{let t=n;e.uniform3ui(r,t[0],t[1],t[2])}return;case e.UNSIGNED_INT_VEC4:if(i)e.uniform4uiv(r,s);else{let t=n;e.uniform4ui(r,t[0],t[1],t[2],t[3])}return;default:Ue.has(t.type)||(Ue.add(t.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${t.type.toString(16)}; skipping upload.`));return}}var Ge=class{constructor(e,t,n,r,i,a){this.gl=e.gl,this.program=new ze(e,t,n,a),this.uniforms=r,this.blend=i}dispose(){this.program.dispose()}};function Ke(e,t,n,r,i,a,o,s){let c=r?r.width/s:a,l=r?r.height/s:o,u=Math.max(0,i.x),d=Math.max(0,i.y),f=Math.min(c,i.x+i.w),p=Math.min(l,i.y+i.h),m=f-u,h=p-d;m<=0||h<=0||(e.bindFramebuffer(e.FRAMEBUFFER,r?r.fbo:null),e.viewport(Math.round(u*s),Math.round(d*s),Math.round(m*s),Math.round(h*s)),qe(e,n.blend),n.program.use(),n.program.uploadUniforms(n.uniforms),t.draw())}function qe(e,t){if(t===`none`){e.disable(e.BLEND);return}e.enable(e.BLEND),e.blendEquation(e.FUNC_ADD),t===`premultiplied`?e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA):e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA)}var Je=class{constructor(t){this.uniforms={src:{value:null},offset:{value:new De},resolution:{value:new De},viewport:{value:new Oe}},this.pass=new Ge(t,e,n,this.uniforms,`premultiplied`)}setUniforms(e,t,n){this.uniforms.src.value=e,this.uniforms.resolution.value.set(n.w*t,n.h*t),this.uniforms.offset.value.set(n.x*t,n.y*t)}dispose(){this.pass.dispose()}},Ye=e=>{let t=document.implementation.createHTMLDocument(`test`),n=t.createRange();n.selectNodeContents(t.documentElement),n.deleteContents();let r=document.createElement(`head`);return t.documentElement.appendChild(r),t.documentElement.appendChild(n.createContextualFragment(e)),t.documentElement.setAttribute(`xmlns`,t.documentElement.namespaceURI),new XMLSerializer().serializeToString(t).replace(/<!DOCTYPE html>/,``)};async function Xe(e,t,n,r){let i=e.getBoundingClientRect(),a=window.devicePixelRatio,o=i.width*a,s=i.height*a,c=1,l=o,u=s;r&&(l>r||u>r)&&(c=Math.min(r/l,r/u),l=Math.floor(l*c),u=Math.floor(u*c));let d=n&&n.width===l&&n.height===u?n:new OffscreenCanvas(l,u),f=e.cloneNode(!0);await Ze(e,f),Qe(e,f),f.style.setProperty(`opacity`,t.toString()),f.style.setProperty(`margin`,`0px`),$e(f);let p=f.outerHTML,m=`<svg xmlns="http://www.w3.org/2000/svg" width="${o}" height="${s}"><foreignObject width="100%" height="100%">${Ye(p)}</foreignObject></svg>`;return new Promise((e,t)=>{let n=new Image;n.onload=()=>{let r=d.getContext(`2d`);if(r===null)return t();r.clearRect(0,0,l,u);let i=a*c;r.scale(i,i),r.drawImage(n,0,0,o,s),r.setTransform(1,0,0,1,0,0),e(d)},n.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(m)}`})}async function Ze(e,t){let n=window.getComputedStyle(e);for(let e of Array.from(n))/(-inline-|-block-|^inline-|^block-)/.test(e)||/^-webkit-.*(start|end|before|after|logical)/.test(e)||t.style.setProperty(e,n.getPropertyValue(e),n.getPropertyPriority(e));if(t.tagName===`INPUT`)t.setAttribute(`value`,t.value);else if(t.tagName===`TEXTAREA`)t.innerHTML=t.value;else if(t.tagName===`IMG`)try{t.src=await et(e.src)}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];await Ze(r,i)}}function Qe(e,t){if(typeof e.computedStyleMap==`function`)try{let n=e.computedStyleMap();for(let e of[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`]){let r=n.get(e);r instanceof CSSKeywordValue&&r.value===`auto`&&t.style.setProperty(e,`auto`)}}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];r instanceof HTMLElement&&i instanceof HTMLElement&&Qe(r,i)}}function $e(e){let t=e;for(;;){let e=t.style;if(Number.parseFloat(e.paddingTop)>0||Number.parseFloat(e.borderTopWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.firstElementChild;if(!n)break;n.style.setProperty(`margin-top`,`0px`),t=n}for(t=e;;){let e=t.style;if(Number.parseFloat(e.paddingBottom)>0||Number.parseFloat(e.borderBottomWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.lastElementChild;if(!n)break;n.style.setProperty(`margin-bottom`,`0px`),t=n}}async function et(e){let t=await fetch(e).then(e=>e.blob());return new Promise(e=>{let n=new FileReader;n.onload=function(){e(this.result)},n.readAsDataURL(t)})}var D=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},O=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},tt,nt,rt,it,at,ot,st,ct,lt,ut,dt,ft,pt=Object.freeze({__brand:`EffectQuad`});function mt(e){return e===pt||typeof e==`object`&&!!e&&e.__brand===`EffectQuad`}function ht(e,t){switch(t){case`lines`:return e.LINES;case`lineStrip`:return e.LINE_STRIP;case`points`:return e.POINTS;default:return e.TRIANGLES}}function gt(e,t){if(t instanceof Float32Array)return e.FLOAT;if(t instanceof Uint8Array)return e.UNSIGNED_BYTE;if(t instanceof Uint16Array)return e.UNSIGNED_SHORT;if(t instanceof Uint32Array)return e.UNSIGNED_INT;if(t instanceof Int8Array)return e.BYTE;if(t instanceof Int16Array)return e.SHORT;if(t instanceof Int32Array)return e.INT;throw Error(`[VFX-JS] Unsupported attribute typed array`)}function _t(e,t){if(ArrayBuffer.isView(t)&&!(t instanceof DataView))return{name:e,data:t,itemSize:2,normalized:!1,perInstance:!1};let n=t;return{name:e,data:n.data,itemSize:n.itemSize,normalized:n.normalized??!1,perInstance:n.perInstance??!1}}var vt=class{constructor(e,t,n){tt.add(this),nt.set(this,void 0),rt.set(this,void 0),it.set(this,void 0),at.set(this,[]),ot.set(this,null),this.indexType=0,this.hasIndices=!1,this.drawCount=0,this.drawStart=0,st.set(this,!1),D(this,nt,e,`f`),this.gl=e.gl,D(this,rt,t,`f`),D(this,it,n,`f`),this.mode=ht(this.gl,t.mode),this.instanceCount=t.instanceCount??0,O(this,tt,`m`,ct).call(this),e.addResource(this),D(this,st,!0,`f`)}restore(){D(this,at,[],`f`),D(this,ot,null,`f`),O(this,tt,`m`,ct).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),this.hasIndices?this.instanceCount>0?e.drawElementsInstanced(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2),this.instanceCount):e.drawElements(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2)):this.instanceCount>0?e.drawArraysInstanced(this.mode,this.drawStart,this.drawCount,this.instanceCount):e.drawArrays(this.mode,this.drawStart,this.drawCount)}dispose(){O(this,st,`f`)&&(O(this,nt,`f`).removeResource(this),D(this,st,!1,`f`));let e=this.gl;e.deleteVertexArray(this.vao);for(let t of O(this,at,`f`))e.deleteBuffer(t);O(this,ot,`f`)&&e.deleteBuffer(O(this,ot,`f`)),D(this,at,[],`f`),D(this,ot,null,`f`)}};nt=new WeakMap,rt=new WeakMap,it=new WeakMap,at=new WeakMap,ot=new WeakMap,st=new WeakMap,tt=new WeakSet,ct=function(){let e=this.gl,t=e.createVertexArray();if(!t)throw Error(`[VFX-JS] Failed to create VAO`);this.vao=t,e.bindVertexArray(t);let n=O(this,it,`f`).program,r=null;for(let[t,i]of Object.entries(O(this,rt,`f`).attributes)){let a=_t(t,i),o=e.getAttribLocation(n,a.name);if(o<0)continue;let s=e.createBuffer();if(!s)throw Error(`[VFX-JS] Failed to create VBO for "${a.name}"`);O(this,at,`f`).push(s),e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,a.data,e.STATIC_DRAW);let c=gt(e,a.data);e.enableVertexAttribArray(o),c===e.FLOAT||c===e.HALF_FLOAT||a.normalized?e.vertexAttribPointer(o,a.itemSize,c,a.normalized,0,0):e.vertexAttribIPointer(o,a.itemSize,c,0,0),a.perInstance&&e.vertexAttribDivisor(o,1),t===`position`&&r===null&&(r=a.data.length/a.itemSize)}let i=0,a=O(this,rt,`f`).indices;if(a){let t=e.createBuffer();if(!t)throw Error(`[VFX-JS] Failed to create IBO`);D(this,ot,t,`f`),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t),e.bufferData(e.ELEMENT_ARRAY_BUFFER,a,e.STATIC_DRAW),this.hasIndices=!0,this.indexType=a instanceof Uint32Array?e.UNSIGNED_INT:e.UNSIGNED_SHORT,i=a.length}else this.hasIndices=!1;e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null),O(this,ot,`f`)&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null);let o=this.hasIndices?i:r??0,s=O(this,rt,`f`).drawRange;this.drawStart=s?.start??0,this.drawCount=s?.count===void 0?Math.max(0,o-this.drawStart):s.count};var yt=class{constructor(e,t){lt.set(this,void 0),ut.set(this,void 0),dt.set(this,new WeakMap),ft.set(this,new Set),D(this,lt,e,`f`),D(this,ut,t,`f`)}get quad(){return O(this,ut,`f`)}resolve(e,t){let n=O(this,dt,`f`).get(e);n||(n=new Map,O(this,dt,`f`).set(e,n));let r=n.get(t);return r||(r=new vt(O(this,lt,`f`),e,t),n.set(t,r),O(this,ft,`f`).add(r)),r}dispose(){for(let e of O(this,ft,`f`))e.dispose();O(this,ft,`f`).clear()}};lt=new WeakMap,ut=new WeakMap,dt=new WeakMap,ft=new WeakMap;var k=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},A=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},bt,xt,St,Ct,wt,Tt,Et,Dt,Ot,kt,At,jt,Mt,Nt,j,M,Pt,Ft,It,Lt,Rt,zt,Bt,Vt=Symbol.for(`@vfx-js/effect.resolve-texture`),Ht=Symbol.for(`@vfx-js/effect.resolve-rt`);function Ut(e){return e[Vt]()}function Wt(e){return e[Ht]}function Gt(e){return typeof e==`object`&&!!e&&e.__brand===`EffectRenderTarget`}function Kt(e){return typeof e==`object`&&!!e&&e.__brand===`EffectTexture`}var qt=`#version 300 es
precision highp float;
in vec3 position;
out vec2 uv;
out vec2 uvContent;
out vec2 uvSrc;
uniform vec4 rectContent;
uniform vec4 rectSrc;
void main() {
    vec2 bufferUV = position.xy * 0.5 + 0.5;
    uv = bufferUV;
    uvContent = (bufferUV - rectContent.xy) / rectContent.zw;
    uvSrc = rectSrc.xy + uvContent * rectSrc.zw;
    gl_Position = vec4(position, 1.0);
}
`,Jt=`
precision highp float;
attribute vec3 position;
varying vec2 uv;
varying vec2 uvContent;
varying vec2 uvSrc;
uniform vec4 rectContent;
uniform vec4 rectSrc;
void main() {
    vec2 bufferUV = position.xy * 0.5 + 0.5;
    uv = bufferUV;
    uvContent = (bufferUV - rectContent.xy) / rectContent.zw;
    uvSrc = rectSrc.xy + uvContent * rectSrc.zw;
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
`,Zt=class{constructor(e,t,n,r,i){bt.add(this),xt.set(this,void 0),St.set(this,void 0),Ct.set(this,void 0),wt.set(this,new Map),Tt.set(this,void 0),Et.set(this,[]),Dt.set(this,[]),Ot.set(this,[]),kt.set(this,[]),At.set(this,[]),jt.set(this,[]),Mt.set(this,`init`),Nt.set(this,!1),j.set(this,void 0),M.set(this,void 0),Lt.set(this,[]),k(this,xt,e,`f`),k(this,St,e.gl,`f`),k(this,Ct,n,`f`),k(this,Tt,new yt(e,t),`f`),k(this,j,{outputPhysW:1,outputPhysH:1,canvasPhys:[1,1],outputViewport:{x:0,y:0,w:1,h:1},elementPhysW:1,elementPhysH:1,rectContent:[0,0,1,1],rectSrc:[0,0,1,1]},`f`),k(this,M,{time:0,deltaTime:0,pixelRatio:n,resolution:[1,1],mouse:[0,0],mouseViewport:[0,0],intersection:0,enterTime:0,leaveTime:0,src:r,target:null,uniforms:{},vfxProps:i},`f`),this.ctx=A(this,bt,`m`,Pt).call(this)}setPhase(e){k(this,Mt,e,`f`)}setFrameDims(e){k(this,j,e,`f`),A(this,M,`f`).resolution=[e.canvasPhys[0],e.canvasPhys[1]];for(let t of A(this,At,`f`))t.resolver.resize?.(e.outputPhysW,e.outputPhysH)}setFrameState(e){let t=A(this,M,`f`);t.time=e.time,t.deltaTime=e.deltaTime,t.mouse=e.mouse,t.mouseViewport=e.mouseViewport,t.intersection=e.intersection,t.enterTime=e.enterTime,t.leaveTime=e.leaveTime,t.uniforms=e.uniforms}setSrc(e){A(this,M,`f`).src=e}setOutput(e){A(this,M,`f`).target=e}passthroughCopy(e,t,n){let r=A(this,Mt,`f`);k(this,Mt,`render`,`f`);let i=A(this,M,`f`).target;A(this,M,`f`).target=t;try{let r=A(this,j,`f`).outputViewport;A(this,j,`f`).outputViewport={...n};let i=A(this,M,`f`).vfxProps.glslVersion===`100`?Xt:Yt;A(this,bt,`m`,zt).call(this,{frag:i,uniforms:{src:e},target:t}),A(this,j,`f`).outputViewport=r}finally{A(this,M,`f`).target=i,k(this,Mt,r,`f`)}}clearRt(e){let t=A(this,St,`f`),n=Wt(e);t.bindFramebuffer(t.FRAMEBUFFER,n.getWriteFbo().fbo),t.viewport(0,0,e.width,e.height),t.clearColor(0,0,0,0),t.disable(t.SCISSOR_TEST),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)}tickAutoUpdates(){for(let e of A(this,Lt,`f`))e()}dispose(){k(this,Mt,`disposed`,`f`);for(let e of A(this,jt,`f`))e();k(this,jt,[],`f`);for(let e of A(this,kt,`f`))e.resolver.dispose();k(this,kt,[],`f`),k(this,Et,[],`f`),k(this,Dt,[],`f`),k(this,At,[],`f`);for(let e of A(this,Ot,`f`))e.dispose();k(this,Ot,[],`f`);for(let e of A(this,wt,`f`).values())e.dispose();A(this,wt,`f`).clear(),A(this,Tt,`f`).dispose(),k(this,Lt,[],`f`)}};xt=new WeakMap,St=new WeakMap,Ct=new WeakMap,wt=new WeakMap,Tt=new WeakMap,Et=new WeakMap,Dt=new WeakMap,Ot=new WeakMap,kt=new WeakMap,At=new WeakMap,jt=new WeakMap,Mt=new WeakMap,Nt=new WeakMap,j=new WeakMap,M=new WeakMap,Lt=new WeakMap,bt=new WeakSet,Pt=function(){let e=this,t=A(this,M,`f`);return{get time(){return t.time},get deltaTime(){return t.deltaTime},get pixelRatio(){return t.pixelRatio},get resolution(){return t.resolution},get mouse(){return t.mouse},get mouseViewport(){return t.mouseViewport},get intersection(){return t.intersection},get enterTime(){return t.enterTime},get leaveTime(){return t.leaveTime},get src(){return t.src},get target(){return t.target},get uniforms(){return t.uniforms},get vfxProps(){return t.vfxProps},quad:pt,get gl(){return A(e,St,`f`)},createRenderTarget:t=>A(e,bt,`m`,Ft).call(e,t),wrapTexture:(t,n)=>A(e,bt,`m`,It).call(e,t,n),draw:t=>A(e,bt,`m`,Rt).call(e,t),onContextRestored:t=>{let n=A(e,xt,`f`).onContextRestored(t);return A(e,jt,`f`).push(n),n}}},Ft=function(e){let t=e?.persistent??!1,n=e?.float??!1,r=$t(e?.wrap),i=e?.filter,a=e?.size,o=a?a[0]:A(this,j,`f`).outputPhysW,s=a?a[1]:A(this,j,`f`).outputPhysH,c,l,u;if(t){let e=a?1:A(this,Ct,`f`),t=a?o:o/e,d=a?s:s/e,f=new Ee(A(this,xt,`f`),t,d,e,n,{wrap:r,filter:i});A(this,Dt,`f`).push(f),c={getReadTexture:()=>f.texture,getWriteFbo:()=>f.target,swap:()=>f.swap(),resize:a?void 0:(e,t)=>{f.resize(e/A(this,Ct,`f`),t/A(this,Ct,`f`))},dispose:()=>f.dispose()},l=()=>f.target.width,u=()=>f.target.height}else{let e=new ve(A(this,xt,`f`),o,s,{float:n,wrap:r,filter:i});A(this,Et,`f`).push(e),c={getReadTexture:()=>e.texture,getWriteFbo:()=>e,resize:a?void 0:(t,n)=>e.setSize(t,n),dispose:()=>e.dispose()},l=()=>e.width,u=()=>e.height}let d=Object.create(null);Object.defineProperties(d,{__brand:{value:`EffectRenderTarget`,enumerable:!0},width:{get:l,enumerable:!0},height:{get:u,enumerable:!0},[Ht]:{value:c}});let f={handle:d,resolver:c};return A(this,kt,`f`).push(f),a||A(this,At,`f`).push(f),d},It=function(e,t){let n=$t(t?.wrap),r=t?.filter,i,a,o,s=null;if(Qt(e)){if(!t?.size)throw Error(`[VFX-JS] wrapTexture(WebGLTexture) requires opts.size`);let[n,r]=t.size;i=new w(A(this,xt,`f`),void 0,{autoRegister:!1,externalHandle:e}),a=()=>n,o=()=>r}else{let n=e;i=new w(A(this,xt,`f`),n);let r=t?.size,c=e=>{if(r)return e===`w`?r[0]:r[1];if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return e===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return e===`w`?n.videoWidth:n.videoHeight;let t=n;return e===`w`?t.width:t.height};a=()=>c(`w`),o=()=>c(`h`);let l=typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement||typeof HTMLCanvasElement<`u`&&n instanceof HTMLCanvasElement||typeof OffscreenCanvas<`u`&&n instanceof OffscreenCanvas;(t?.autoUpdate??l)&&(s=()=>{i.needsUpdate=!0})}i.wrapS=n[0],i.wrapT=n[1],r!==void 0&&(i.minFilter=r,i.magFilter=r),A(this,Ot,`f`).push(i),s&&A(this,Lt,`f`).push(s);let c=Object.create(null);return Object.defineProperties(c,{__brand:{value:`EffectTexture`,enumerable:!0},width:{get:a,enumerable:!0},height:{get:o,enumerable:!0},[Vt]:{value:()=>i}}),c},Rt=function(e){if(A(this,Mt,`f`)!==`render`){A(this,Mt,`f`)===`update`&&!A(this,Nt,`f`)&&(k(this,Nt,!0,`f`),console.warn(`[VFX-JS] ctx.draw() called in update(); ignored. Move draws to render().`));return}A(this,bt,`m`,zt).call(this,e)},zt=function(e){let t=A(this,St,`f`),n=e.vert??(A(this,M,`f`).vfxProps.glslVersion===`100`?Jt:qt),r=`${e.frag}�${n}`,i=A(this,wt,`f`).get(r);i||(i=new ze(A(this,xt,`f`),n,e.frag,A(this,M,`f`).vfxProps.glslVersion),A(this,wt,`f`).set(r,i));let a=A(this,M,`f`).target,o=e.target===void 0||e.target===null?a:e.target,s=o===null||o===a,c,l,u,d,f,p;if(o===null)c=null,l=A(this,j,`f`).outputViewport.x,u=A(this,j,`f`).outputViewport.y,d=A(this,j,`f`).outputViewport.w,f=A(this,j,`f`).outputViewport.h;else{let e=Wt(o);c=e.getWriteFbo().fbo,s?(l=A(this,j,`f`).outputViewport.x,u=A(this,j,`f`).outputViewport.y,d=A(this,j,`f`).outputViewport.w,f=A(this,j,`f`).outputViewport.h):(l=0,u=0,d=o.width,f=o.height),p=e.swap}t.bindFramebuffer(t.FRAMEBUFFER,c),t.viewport(l,u,d,f),t.disable(t.SCISSOR_TEST),qe(t,o===null?`premultiplied`:`none`),i.use();let m=A(this,bt,`m`,Bt).call(this,e.uniforms);i.uploadUniforms(m);let h=e.geometry??pt;mt(h)?A(this,Tt,`f`).quad.draw():A(this,Tt,`f`).resolve(h,i).draw(),p&&p()},Bt=function(e){let t={};if(t.rectContent={value:A(this,j,`f`).rectContent},t.rectSrc={value:A(this,j,`f`).rectSrc},!e)return t;for(let[n,r]of Object.entries(e))t[n]=en(r);return t};function Qt(e){let t=globalThis.WebGLTexture;if(t&&typeof t==`function`&&e instanceof t)return!0;let n=e;return n.width===void 0&&n.naturalWidth===void 0&&n.videoWidth===void 0}function $t(e){return e===void 0?[`clamp`,`clamp`]:typeof e==`string`?[e,e]:[e[0],e[1]]}function en(e){return Gt(e)?{value:Wt(e).getReadTexture()}:Kt(e)?{value:Ut(e)}:{value:e}}function tn(e,t,n){let r=Object.create(null);return Object.defineProperties(r,{__brand:{value:`EffectTexture`,enumerable:!0},width:{get:t,enumerable:!0},height:{get:n,enumerable:!0},[Vt]:{value:e}}),r}function nn(e){let t={getReadTexture:()=>e.texture,getWriteFbo:()=>e,dispose:()=>{}},n=Object.create(null);return Object.defineProperties(n,{__brand:{value:`EffectRenderTarget`,enumerable:!0},width:{get:()=>e.width,enumerable:!0},height:{get:()=>e.height,enumerable:!0},[Ht]:{value:t}}),n}function rn(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:Array.isArray(e)?{top:e[0],right:e[1],bottom:e[2],left:e[3]}:{top:e.top??0,right:e.right??0,bottom:e.bottom??0,left:e.left??0}}function an(e){return rn(e)}var on={top:0,right:0,bottom:0,left:0};function sn(e){return rn(e)}function cn(e){return{top:e.top,right:e.right,bottom:e.bottom,left:e.left}}function ln(e,t){return{top:e.top-t.top,right:e.right+t.right,bottom:e.bottom+t.bottom,left:e.left-t.left}}function un(e,t,n){return Math.min(Math.max(e,t),n)}function dn(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return c<=0||l<=0?[0,0,1,1]:[(n-o)/c,(r-s)/l,i/c,a/l]}function fn(e,t){let n=un(t.left,e.left,e.right),r=(un(t.right,e.left,e.right)-n)/(t.right-t.left),i=un(t.top,e.top,e.bottom);return r*((un(t.bottom,e.top,e.bottom)-i)/(t.bottom-t.top))}var N=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},P=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},pn,mn,F,I,hn,gn,_n,vn,yn,bn,xn,Sn,Cn,wn,Tn,En,Dn,On,kn,An,jn,Mn,Nn,Pn,Fn=class{constructor(e,t,n,r,i,a,o){pn.add(this),mn.set(this,void 0),F.set(this,void 0),I.set(this,void 0),hn.set(this,void 0),gn.set(this,[]),_n.set(this,[]),vn.set(this,void 0),yn.set(this,null),bn.set(this,null),xn.set(this,new Set),Sn.set(this,new Set),Cn.set(this,!1),wn.set(this,void 0),Tn.set(this,an(0)),En.set(this,null),Dn.set(this,void 0),N(this,mn,e,`f`),N(this,F,r,`f`),N(this,vn,a,`f`),N(this,wn,o,`f`),N(this,I,r.map(()=>new Zt(e,t,n,a,i)),`f`),r.length===0?(N(this,En,new Zt(e,t,n,a,i),`f`),N(this,Dn,P(this,En,`f`),`f`)):N(this,Dn,P(this,I,`f`)[0],`f`),N(this,hn,r.map((e,t)=>typeof e.render==`function`?t:-1).filter(e=>e>=0),`f`)}get effects(){return P(this,F,`f`)}get hosts(){return P(this,I,`f`)}get renderingIndices(){return P(this,hn,`f`)}get stages(){return P(this,_n,`f`)}get hitTestPadPhys(){return P(this,Tn,`f`)}async initAll(){for(let e=0;e<P(this,F,`f`).length;e++){let t=P(this,F,`f`)[e],n=P(this,I,`f`)[e];n.setPhase(`init`);try{t.init&&await t.init(n.ctx)}catch(t){console.error(`[VFX-JS] effect[${e}].init() failed:`,t);for(let t=e-1;t>=0;t--)P(this,pn,`m`,On).call(this,t),P(this,I,`f`)[t].dispose();throw P(this,I,`f`)[e].dispose(),t}n.setPhase(`update`)}}run(e){if(P(this,Cn,`f`)||!e.isVisible)return;let t=P(this,hn,`f`).length;for(let t of P(this,I,`f`))t.setFrameState({time:e.time,deltaTime:e.deltaTime,mouse:e.mouse,mouseViewport:e.mouseViewport,intersection:e.intersection,enterTime:e.enterTime,leaveTime:e.leaveTime,uniforms:e.resolvedUniforms});P(this,pn,`m`,kn).call(this,e);for(let t=0;t<P(this,I,`f`).length;t++)P(this,I,`f`)[t].setFrameDims(P(this,pn,`m`,Nn).call(this,t,e));for(let e=0;e<P(this,F,`f`).length;e++){let t=P(this,F,`f`)[e];if(!t.update)continue;let n=P(this,I,`f`)[e];n.setPhase(`update`);try{t.update(n.ctx)}catch(t){P(this,xn,`f`).has(e)||(P(this,xn,`f`).add(e),console.warn(`[VFX-JS] effect[${e}].update() threw; skipping this frame's update:`,t))}}if(t===0){let t=e.finalTarget===null?null:P(this,pn,`m`,Pn).call(this,e.finalTarget);P(this,Dn,`f`).passthroughCopy(P(this,vn,`f`),t,e.elementRectOnCanvasPx);return}for(let n=0;n<t;n++){let r=P(this,hn,`f`)[n],i=P(this,I,`f`)[r],a=P(this,F,`f`)[r];if(!a.render)continue;i.setPhase(`render`),i.tickAutoUpdates();let o=n===0?P(this,vn,`f`):P(this,gn,`f`)[n-1].texHandle;i.setSrc(o);let s;n===t-1?s=e.finalTarget===null?null:P(this,pn,`m`,Pn).call(this,e.finalTarget):(s=P(this,gn,`f`)[n].rtHandle,i.clearRt(s)),i.setOutput(s);try{a.render(i.ctx)}catch(e){P(this,Sn,`f`).has(r)||(P(this,Sn,`f`).add(r),console.warn(`[VFX-JS] effect[${r}].render() threw; falling back to passthrough:`,e));let a=P(this,_n,`f`)[n].outputViewport;s===null?i.passthroughCopy(o,null,a):n===t-1?i.passthroughCopy(o,s,a):i.passthroughCopy(o,s,{x:0,y:0,w:s.width,h:s.height})}i.setPhase(`update`)}}dispose(){if(!P(this,Cn,`f`)){N(this,Cn,!0,`f`);for(let e=P(this,F,`f`).length-1;e>=0;e--)P(this,pn,`m`,On).call(this,e),P(this,I,`f`)[e].dispose();P(this,En,`f`)&&(P(this,En,`f`).dispose(),N(this,En,null,`f`));for(let e of P(this,gn,`f`))e.fb.dispose();N(this,gn,[],`f`),N(this,_n,[],`f`),P(this,bn,`f`)&&(P(this,bn,`f`).dispose(),N(this,bn,null,`f`))}}};mn=new WeakMap,F=new WeakMap,I=new WeakMap,hn=new WeakMap,gn=new WeakMap,_n=new WeakMap,vn=new WeakMap,yn=new WeakMap,bn=new WeakMap,xn=new WeakMap,Sn=new WeakMap,Cn=new WeakMap,wn=new WeakMap,Tn=new WeakMap,En=new WeakMap,Dn=new WeakMap,pn=new WeakSet,On=function(e){let t=P(this,F,`f`)[e];if(t.dispose)try{t.dispose()}catch(t){console.error(`[VFX-JS] effect[${e}].dispose() threw:`,t)}},kn=function(e){let t=P(this,hn,`f`).length;if(N(this,_n,Array(t),`f`),t===0)return;let n=P(this,wn,`f`)?e.canvasPhys:e.elementPhys,r=[0,0,n[0],n[1]],i=P(this,pn,`m`,Mn).call(this,e),a=r;for(let n=0;n<t;n++){let o=P(this,hn,`f`)[n],s=P(this,F,`f`)[o],c=n===t-1,l=P(this,pn,`m`,An).call(this,s,a,r,i,e)??a,u=[l[2],l[3]],d=dn(r,l),f=c?{x:e.elementRectOnCanvasPx.x+l[0],y:e.elementRectOnCanvasPx.y+l[1],w:u[0],h:u[1]}:{x:0,y:0,w:u[0],h:u[1]};P(this,_n,`f`)[n]={dstRect:l,dstBufferSize:u,rectContent:d,outputViewport:f},c||P(this,pn,`m`,jn).call(this,n,u),a=l}let[o,s,c,l]=P(this,_n,`f`)[t-1].dstRect;N(this,Tn,an({top:Math.max(0,s+l-n[1]),right:Math.max(0,o+c-n[0]),bottom:Math.max(0,-s),left:Math.max(0,-o)}),`f`)},An=function(e,t,n,r,i){if(!e.outputRect)return;let a=i.canvasPhys[0]/i.canvasLogical[0]||1,o={element:P(this,wn,`f`)?i.canvasLogical:i.elementLogical,elementPixel:P(this,wn,`f`)?i.canvasPhys:i.elementPhys,canvas:i.canvasLogical,canvasPixel:i.canvasPhys,pixelRatio:a,contentRect:n,srcRect:t,canvasRect:r};return e.outputRect(o)},jn=function(e,t){let n=P(this,gn,`f`)[e];if(n&&n.fb.width===t[0]&&n.fb.height===t[1])return;n&&n.fb.dispose();let r=new ve(P(this,mn,`f`),t[0],t[1]),i=nn(r),a=tn(()=>r.texture,()=>r.width,()=>r.height);P(this,gn,`f`)[e]={fb:r,rtHandle:i,texHandle:a,bufferSize:t}},Mn=function(e){let[t,n]=e.canvasPhys;if(P(this,wn,`f`))return[0,0,t,n];let{x:r,y:i}=e.elementRectOnCanvasPx;return[-r,-i,t,n]},Nn=function(e,t){let n=P(this,hn,`f`).indexOf(e),r,i,a,o,s;if(n<0)r=t.elementPhys[0],i=t.elementPhys[1],a={x:0,y:0,w:r,h:i},o=[0,0,1,1],s=[0,0,1,1];else{let e=P(this,_n,`f`)[n];r=e.dstBufferSize[0],i=e.dstBufferSize[1],a=e.outputViewport,o=e.rectContent,s=n===0?[0,0,1,1]:P(this,_n,`f`)[n-1].rectContent}return{outputPhysW:r,outputPhysH:i,canvasPhys:t.canvasPhys,outputViewport:a,elementPhysW:t.elementPhys[0],elementPhysH:t.elementPhys[1],rectContent:o,rectSrc:s}},Pn=function(e){return(P(this,bn,`f`)!==e||P(this,yn,`f`)===null)&&(N(this,bn,e,`f`),N(this,yn,nn(e),`f`)),P(this,yn,`f`)};function In(e){this.data=e,this.pos=0}In.prototype.readByte=function(){return this.data[this.pos++]},In.prototype.peekByte=function(){return this.data[this.pos]},In.prototype.readBytes=function(e){return this.data.subarray(this.pos,this.pos+=e)},In.prototype.peekBytes=function(e){return this.data.subarray(this.pos,this.pos+e)},In.prototype.readString=function(e){for(var t=``,n=0;n<e;n++)t+=String.fromCharCode(this.readByte());return t},In.prototype.readBitArray=function(){for(var e=[],t=this.readByte(),n=7;n>=0;n--)e.push(!!(t&1<<n));return e},In.prototype.readUnsigned=function(e){var t=this.readBytes(2);return e?(t[1]<<8)+t[0]:(t[0]<<8)+t[1]};function Ln(e){this.stream=new In(e),this.output={}}Ln.prototype.parse=function(e){return this.parseParts(this.output,e),this.output},Ln.prototype.parseParts=function(e,t){for(var n=0;n<t.length;n++){var r=t[n];this.parsePart(e,r)}},Ln.prototype.parsePart=function(e,t){var n=t.label,r;if(!(t.requires&&!t.requires(this.stream,this.output,e)))if(t.loop){for(var i=[];t.loop(this.stream);){var a={};this.parseParts(a,t.parts),i.push(a)}e[n]=i}else t.parts?(r={},this.parseParts(r,t.parts),e[n]=r):t.parser?(r=t.parser(this.stream,this.output,e),t.skip||(e[n]=r)):t.bits&&(e[n]=this.parseBits(t.bits))};function Rn(e){return e.reduce(function(e,t){return e*2+t},0)}Ln.prototype.parseBits=function(e){var t={},n=this.stream.readBitArray();for(var r in e){var i=e[r];i.length?t[r]=Rn(n.slice(i.index,i.index+i.length)):t[r]=n[i.index]}return t};var L={readByte:function(){return function(e){return e.readByte()}},readBytes:function(e){return function(t){return t.readBytes(e)}},readString:function(e){return function(t){return t.readString(e)}},readUnsigned:function(e){return function(t){return t.readUnsigned(e)}},readArray:function(e,t){return function(n,r,i){for(var a=t(n,r,i),o=Array(a),s=0;s<a;s++)o[s]=n.readBytes(e);return o}}},zn={label:`blocks`,parser:function(e){for(var t=[],n=0,r=0,i=e.readByte();i!==r;i=e.readByte())t.push(e.readBytes(i)),n+=i;var a=new Uint8Array(n);n=0;for(var o=0;o<t.length;o++)a.set(t[o],n),n+=t[o].length;return a}},Bn={label:`gce`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===249},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`byteSize`,parser:L.readByte()},{label:`extras`,bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:`delay`,parser:L.readUnsigned(!0)},{label:`transparentColorIndex`,parser:L.readByte()},{label:`terminator`,parser:L.readByte(),skip:!0}]},Vn={label:`image`,requires:function(e){return e.peekByte()===44},parts:[{label:`code`,parser:L.readByte(),skip:!0},{label:`descriptor`,parts:[{label:`left`,parser:L.readUnsigned(!0)},{label:`top`,parser:L.readUnsigned(!0)},{label:`width`,parser:L.readUnsigned(!0)},{label:`height`,parser:L.readUnsigned(!0)},{label:`lct`,bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:`lct`,requires:function(e,t,n){return n.descriptor.lct.exists},parser:L.readArray(3,function(e,t,n){return 2**(n.descriptor.lct.size+1)})},{label:`data`,parts:[{label:`minCodeSize`,parser:L.readByte()},zn]}]},Hn={label:`text`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===1},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`blockSize`,parser:L.readByte()},{label:`preData`,parser:function(e,t,n){return e.readBytes(n.text.blockSize)}},zn]},Un={label:`frames`,parts:[Bn,{label:`application`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===255},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`blockSize`,parser:L.readByte()},{label:`id`,parser:function(e,t,n){return e.readString(n.blockSize)}},zn]},{label:`comment`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===254},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},zn]},Vn,Hn],loop:function(e){var t=e.peekByte();return t===33||t===44}},Wn=[{label:`header`,parts:[{label:`signature`,parser:L.readString(3)},{label:`version`,parser:L.readString(3)}]},{label:`lsd`,parts:[{label:`width`,parser:L.readUnsigned(!0)},{label:`height`,parser:L.readUnsigned(!0)},{label:`gct`,bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:`backgroundColorIndex`,parser:L.readByte()},{label:`pixelAspectRatio`,parser:L.readByte()}]},{label:`gct`,requires:function(e,t){return t.lsd.gct.exists},parser:L.readArray(3,function(e,t){return 2**(t.lsd.gct.size+1)})},Un];function Gn(e){this.raw=new Ln(new Uint8Array(e)).parse(Wn),this.raw.hasImages=!1;for(var t=0;t<this.raw.frames.length;t++)if(this.raw.frames[t].image){this.raw.hasImages=!0;break}}Gn.prototype.decompressFrame=function(e,t){if(e>=this.raw.frames.length)return null;var n=this.raw.frames[e];if(n.image){var r=n.image.descriptor.width*n.image.descriptor.height,i=o(n.image.data.minCodeSize,n.image.data.blocks,r);n.image.descriptor.lct.interlaced&&(i=s(i,n.image.descriptor.width));var a={pixels:i,dims:{top:n.image.descriptor.top,left:n.image.descriptor.left,width:n.image.descriptor.width,height:n.image.descriptor.height}};return n.image.descriptor.lct&&n.image.descriptor.lct.exists?a.colorTable=n.image.lct:a.colorTable=this.raw.gct,n.gce&&(a.delay=(n.gce.delay||10)*10,a.disposalType=n.gce.extras.disposal,n.gce.extras.transparentColorGiven&&(a.transparentIndex=n.gce.transparentColorIndex)),t&&(a.patch=c(a)),a}return null;function o(e,t,n){var r=4096,i=-1,a=n,o,s,c,l,u,d,f,p,m,h,g,_,v,y,b,x,ee=Array(n),te=Array(r),S=Array(r),C=Array(r+1);for(_=e,s=1<<_,u=s+1,o=s+2,f=i,l=_+1,c=(1<<l)-1,m=0;m<s;m++)te[m]=0,S[m]=m;for(g=p=v=y=x=b=0,h=0;h<a;){if(y===0){if(p<l){g+=t[b]<<p,p+=8,b++;continue}if(m=g&c,g>>=l,p-=l,m>o||m==u)break;if(m==s){l=_+1,c=(1<<l)-1,o=s+2,f=i;continue}if(f==i){C[y++]=S[m],f=m,v=m;continue}for(d=m,m==o&&(C[y++]=v,m=f);m>s;)C[y++]=S[m],m=te[m];v=S[m]&255,C[y++]=v,o<r&&(te[o]=f,S[o]=v,o++,(o&c)===0&&o<r&&(l++,c+=o)),f=d}y--,ee[x++]=C[y],h++}for(h=x;h<a;h++)ee[h]=0;return ee}function s(e,t){for(var n=Array(e.length),r=e.length/t,i=function(r,i){var a=e.slice(i*t,(i+1)*t);n.splice.apply(n,[r*t,t].concat(a))},a=[0,4,2,1],o=[8,8,4,2],s=0,c=0;c<4;c++)for(var l=a[c];l<r;l+=o[c])i(l,s),s++;return n}function c(e){for(var t=e.pixels.length,n=new Uint8ClampedArray(t*4),r=0;r<t;r++){var i=r*4,a=e.pixels[r],o=e.colorTable[a];n[i]=o[0],n[i+1]=o[1],n[i+2]=o[2],n[i+3]=a===e.transparentIndex?0:255}return n}},Gn.prototype.decompressFrames=function(e,t,n){t===void 0&&(t=0),n=n===void 0?this.raw.frames.length:Math.min(n,this.raw.frames.length);for(var r=[],i=t;i<n;i++)this.raw.frames[i].image&&r.push(this.decompressFrame(i,e));return r};var Kn=Gn,qn=class e{static async create(t,n){let r=await fetch(t).then(e=>e.arrayBuffer()).then(e=>new Kn(e)),i=r.decompressFrames(!0,void 0,void 0),{width:a,height:o}=r.raw.lsd;return new e(i,a,o,n)}constructor(e,t,n,r){this.frames=[],this.index=0,this.playTime=0,this.frames=e,this.canvas=document.createElement(`canvas`),this.ctx=this.canvas.getContext(`2d`),this.pixelRatio=r,this.canvas.width=t,this.canvas.height=n,this.startTime=Date.now()}getCanvas(){return this.canvas}update(){let e=Date.now()-this.startTime;for(;this.playTime<e;){let e=this.frames[this.index%this.frames.length];this.playTime+=e.delay,this.index++}let t=this.frames[this.index%this.frames.length],n=new ImageData(t.patch,t.dims.width,t.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(n,t.dims.left,t.dims.top)}},Jn=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Yn,Xn,Zn,Qn,$n,er=class{constructor(e){this.isContextLost=!1,Yn.set(this,new Set),Xn.set(this,new Set),Zn.set(this,new Set),Qn.set(this,e=>{e.preventDefault(),this.isContextLost=!0;for(let e of Jn(this,Xn,`f`))e()}),$n.set(this,()=>{this.isContextLost=!1;let e=this.gl;e.getExtension(`EXT_color_buffer_float`),e.getExtension(`EXT_color_buffer_half_float`);for(let e of Jn(this,Yn,`f`))e.restore();for(let e of Jn(this,Zn,`f`))e()});let t=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1});if(!t)throw Error(`[VFX-JS] WebGL2 is not available.`);this.gl=t,this.canvas=e,t.getExtension(`EXT_color_buffer_float`),t.getExtension(`EXT_color_buffer_half_float`),this.floatLinearFilter=!!t.getExtension(`OES_texture_float_linear`),this.maxTextureSize=t.getParameter(t.MAX_TEXTURE_SIZE),e.addEventListener(`webglcontextlost`,Jn(this,Qn,`f`),!1),e.addEventListener(`webglcontextrestored`,Jn(this,$n,`f`),!1)}setSize(e,t,n){let r=Math.floor(e*n),i=Math.floor(t*n);(this.canvas.width!==r||this.canvas.height!==i)&&(this.canvas.width=r,this.canvas.height=i)}addResource(e){Jn(this,Yn,`f`).add(e)}removeResource(e){Jn(this,Yn,`f`).delete(e)}onContextLost(e){return Jn(this,Xn,`f`).add(e),()=>Jn(this,Xn,`f`).delete(e)}onContextRestored(e){return Jn(this,Zn,`f`).add(e),()=>Jn(this,Zn,`f`).delete(e)}};Yn=new WeakMap,Xn=new WeakMap,Zn=new WeakMap,Qn=new WeakMap,$n=new WeakMap;var tr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},nr=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},rr,ir,ar,or,sr=class{constructor(e){rr.add(this),ir.set(this,void 0),ar.set(this,void 0),tr(this,ir,e,`f`),this.gl=e.gl,nr(this,rr,`m`,or).call(this),e.addResource(this)}restore(){nr(this,rr,`m`,or).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){nr(this,ir,`f`).removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(nr(this,ar,`f`))}};ir=new WeakMap,ar=new WeakMap,rr=new WeakSet,or=function(){let e=this.gl,t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw Error(`[VFX-JS] Failed to create quad VAO`);this.vao=t,tr(this,ar,n,`f`);let r=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)};function cr(e,t,n,r={}){return new ve(e,t,n,{float:r.float??!1})}function lr(n,r){let i=r.renderingToBuffer??!1,a;a=i?`none`:r.premultipliedAlpha?`premultiplied`:`normal`;let o=r.glslVersion??Re(r.fragmentShader);return new Ge(n,r.vertexShader??(o===`100`?t:e),r.fragmentShader,r.uniforms,a,o)}var ur=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},R=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},z,dr,fr,pr,mr,hr,gr=class{constructor(e,t,n,r,i,a,o,s){if(z.set(this,void 0),dr.set(this,void 0),fr.set(this,void 0),pr.set(this,void 0),mr.set(this,void 0),hr.set(this,void 0),ur(this,pr,r??!1,`f`),ur(this,mr,i??!1,`f`),ur(this,hr,a,`f`),ur(this,dr,{},`f`),ur(this,z,{src:{value:null},offset:{value:new De},resolution:{value:new De},viewport:{value:new Oe},time:{value:0},mouse:{value:new De},passIndex:{value:0}},`f`),n)for(let[e,t]of Object.entries(n))typeof t==`function`?(R(this,dr,`f`)[e]=t,R(this,z,`f`)[e]={value:t()}):R(this,z,`f`)[e]={value:t};this.pass=lr(e,{fragmentShader:t,uniforms:R(this,z,`f`),renderingToBuffer:o??!1,premultipliedAlpha:!0,glslVersion:s})}get uniforms(){return R(this,z,`f`)}setUniforms(e,t,n,r,i,a){R(this,z,`f`).src.value=e,R(this,z,`f`).resolution.value.set(n.w*t,n.h*t),R(this,z,`f`).offset.value.set(n.x*t,n.y*t),R(this,z,`f`).time.value=r,R(this,z,`f`).mouse.value.set(i*t,a*t)}updateCustomUniforms(e){for(let[e,t]of Object.entries(R(this,dr,`f`)))R(this,z,`f`)[e]&&(R(this,z,`f`)[e].value=t());if(e)for(let[t,n]of Object.entries(e))R(this,z,`f`)[t]&&(R(this,z,`f`)[t].value=n())}initializeBackbuffer(e,t,n,r){R(this,pr,`f`)&&!R(this,fr,`f`)&&(R(this,hr,`f`)?ur(this,fr,new Ee(e,R(this,hr,`f`)[0],R(this,hr,`f`)[1],1,R(this,mr,`f`)),`f`):ur(this,fr,new Ee(e,t,n,r,R(this,mr,`f`)),`f`))}resizeBackbuffer(e,t){R(this,fr,`f`)&&!R(this,hr,`f`)&&R(this,fr,`f`).resize(e,t)}registerBufferUniform(e){R(this,z,`f`)[e]||(R(this,z,`f`)[e]={value:null})}get backbuffer(){return R(this,fr,`f`)}get persistent(){return R(this,pr,`f`)}get float(){return R(this,mr,`f`)}get size(){return R(this,hr,`f`)}getTargetDimensions(){return R(this,hr,`f`)}dispose(){this.pass.dispose(),R(this,fr,`f`)?.dispose()}};z=new WeakMap,dr=new WeakMap,fr=new WeakMap,pr=new WeakMap,mr=new WeakMap,hr=new WeakMap;var B=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},V=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},H,_r,vr,U,yr,br,W,G,xr,K,Sr,Cr,q,wr,Tr,Er,Dr,Or,kr,J,Y,Ar,X,jr,Mr,Nr,Pr,Fr,Ir,Lr,Rr,zr,Br,Vr,Hr,Ur,Wr,Gr,Kr,qr,Jr,Yr,Xr,Zr,Z,Qr,$r,ei,ti,ni,ri,ii=new Map,ai=class{constructor(e,t){H.add(this),_r.set(this,void 0),vr.set(this,void 0),U.set(this,void 0),yr.set(this,void 0),br.set(this,void 0),W.set(this,void 0),G.set(this,[]),xr.set(this,[]),K.set(this,void 0),Sr.set(this,[]),Cr.set(this,new Map),q.set(this,null),wr.set(this,!1),Tr.set(this,new WeakSet),Er.set(this,{}),Dr.set(this,{}),Or.set(this,0),kr.set(this,void 0),J.set(this,2),Y.set(this,[]),Ar.set(this,Date.now()/1e3),X.set(this,sn(0)),jr.set(this,sn(0)),Mr.set(this,[0,0]),Nr.set(this,0),Pr.set(this,0),Fr.set(this,0),Ir.set(this,0),Lr.set(this,new WeakMap),zr.set(this,async()=>{if(typeof window<`u`){for(let e of V(this,Y,`f`))if(e.type===`text`&&e.isInViewport){let t=e.element.getBoundingClientRect();(t.width!==e.width||t.height!==e.height)&&(await V(this,H,`m`,Vr).call(this,e),e.width=t.width,e.height=t.height)}for(let e of V(this,Y,`f`))if(e.type===`text`&&!e.isInViewport){let t=e.element.getBoundingClientRect();(t.width!==e.width||t.height!==e.height)&&(await V(this,H,`m`,Vr).call(this,e),e.width=t.width,e.height=t.height)}}}),Br.set(this,e=>{typeof window<`u`&&(B(this,Fr,e.clientX,`f`),B(this,Ir,window.innerHeight-e.clientY,`f`))}),Wr.set(this,()=>{this.isPlaying()&&(this.render(),B(this,kr,requestAnimationFrame(V(this,Wr,`f`)),`f`))}),B(this,_r,e,`f`),B(this,vr,t,`f`),B(this,U,new er(t),`f`),B(this,yr,V(this,U,`f`).gl,`f`),V(this,yr,`f`).clearColor(0,0,0,0),B(this,J,e.pixelRatio,`f`),B(this,br,new sr(V(this,U,`f`)),`f`),typeof window<`u`&&(window.addEventListener(`resize`,V(this,zr,`f`)),window.addEventListener(`pointermove`,V(this,Br,`f`))),V(this,zr,`f`).call(this),B(this,W,new Je(V(this,U,`f`)),`f`),V(this,H,`m`,$r).call(this,e.postEffects),V(this,U,`f`).onContextRestored(()=>{V(this,yr,`f`).clearColor(0,0,0,0)})}destroy(){this.stop(),typeof window<`u`&&(window.removeEventListener(`resize`,V(this,zr,`f`)),window.removeEventListener(`pointermove`,V(this,Br,`f`))),V(this,K,`f`)?.dispose();for(let e of V(this,Cr,`f`).values())e?.dispose();for(let e of V(this,G,`f`))e.dispose();V(this,q,`f`)&&(V(this,q,`f`).dispose(),B(this,q,null,`f`),B(this,wr,!1,`f`)),V(this,W,`f`).dispose(),V(this,br,`f`).dispose()}async addElement(e,t={},n){if(t.effect!==void 0)return V(this,H,`m`,Hr).call(this,e,t,t.effect,n);let r=V(this,H,`m`,Ur).call(this,t),i=e.getBoundingClientRect(),a=cn(i),[o,s]=ci(t.overflow),c=ln(a,s),l=li(t.intersection),u=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),d,f,p=!1;if(e instanceof HTMLImageElement)if(f=`img`,p=!!e.src.match(/\.gif/i),p){let t=await qn.create(e.src,V(this,J,`f`));ii.set(e,t),d=new w(V(this,U,`f`),t.getCanvas())}else{let t=await fe(e.src);d=new w(V(this,U,`f`),t)}else if(e instanceof HTMLVideoElement)d=new w(V(this,U,`f`),e),f=`video`;else if(e instanceof HTMLCanvasElement)e.hasAttribute(`layoutsubtree`)&&n?(d=new w(V(this,U,`f`),n),f=`hic`):(d=new w(V(this,U,`f`),e),f=`canvas`);else{let t=await Xe(e,u,void 0,this.maxTextureSize);d=new w(V(this,U,`f`),t),f=`text`}let[m,h]=fi(t.wrap);d.wrapS=m,d.wrapT=h,d.needsUpdate=!0;let g=t.autoCrop??!0;if(f!==`hic`&&t.overlay!==!0)if(typeof t.overlay==`number`)e.style.setProperty(`opacity`,t.overlay.toString());else{let t=f===`video`?`0.0001`:`0`;e.style.setProperty(`opacity`,t.toString())}let _={src:{value:d},resolution:{value:new De},offset:{value:new De},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},mouse:{value:new De},intersection:{value:0},viewport:{value:new Oe},autoCrop:{value:g}},v={};if(t.uniforms!==void 0)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(_[e]={value:n()},v[e]=n):_[e]={value:n};let y;t.backbuffer&&(y=(()=>{let e=(c.right-c.left)*V(this,J,`f`),t=(c.bottom-c.top)*V(this,J,`f`);return new Ee(V(this,U,`f`),e,t,V(this,J,`f`),!1)})(),_.backbuffer={value:y.texture});let b=new Map,x=new Map;for(let e=0;e<r.length-1;e++){let t=r[e].target??`pass${e}`;r[e]={...r[e],target:t};let n=r[e].size,i=n?n[0]:(c.right-c.left)*V(this,J,`f`),a=n?n[1]:(c.bottom-c.top)*V(this,J,`f`);if(r[e].persistent){let i=n?1:V(this,J,`f`),a=n?n[0]:c.right-c.left,o=n?n[1]:c.bottom-c.top;x.set(t,new Ee(V(this,U,`f`),a,o,i,r[e].float))}else b.set(t,cr(V(this,U,`f`),i,a,{float:r[e].float}))}let ee=[];for(let e=0;e<r.length;e++){let t=r[e],n=t.frag,i={..._},a={};for(let[e,r]of b)e!==t.target&&n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:r.texture});for(let[e,t]of x)n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:t.texture});if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(i[e]={value:n()},a[e]=n):i[e]={value:n};let o=lr(V(this,U,`f`),{vertexShader:t.vert,fragmentShader:n,uniforms:i,renderingToBuffer:t.target!==void 0,glslVersion:t.glslVersion});ee.push({pass:o,uniforms:i,uniformGenerators:{...v,...a},target:t.target,persistent:t.persistent,float:t.float,size:t.size,backbuffer:t.target?x.get(t.target):void 0})}let te=Date.now()/1e3,S={type:f,element:e,isInViewport:!1,isInLogicalViewport:!1,width:i.width,height:i.height,passes:ee,bufferTargets:b,startTime:te,enterTime:te,leaveTime:-1/0,release:t.release??1/0,isGif:p,isFullScreen:o,overflow:s,intersection:l,originalOpacity:u,srcTexture:d,zIndex:t.zIndex??0,backbuffer:y,autoCrop:g};V(this,H,`m`,Xr).call(this,S,a,te),V(this,Y,`f`).push(S),V(this,Y,`f`).sort((e,t)=>e.zIndex-t.zIndex)}removeElement(e){let t=V(this,Y,`f`).findIndex(t=>t.element===e);if(t!==-1){let n=V(this,Y,`f`).splice(t,1)[0];if(n.chain)V(this,H,`m`,Jr).call(this,n.chain.effects),n.chain.dispose();else{for(let e of n.bufferTargets.values())e.dispose();for(let e of n.passes)e.pass.dispose(),e.backbuffer?.dispose();n.backbuffer?.dispose()}n.srcTexture.dispose(),e.style.setProperty(`opacity`,n.originalOpacity.toString())}}updateTextElement(e){let t=V(this,Y,`f`).findIndex(t=>t.element===e);return t===-1?Promise.resolve():V(this,H,`m`,Vr).call(this,V(this,Y,`f`)[t])}updateCanvasElement(e){let t=V(this,Y,`f`).find(t=>t.element===e);if(t){let n=t.srcTexture,r=new w(V(this,U,`f`),e);r.wrapS=n.wrapS,r.wrapT=n.wrapT,r.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=r),t.srcTexture=r,n.dispose()}}updateHICTexture(e,t){let n=V(this,Y,`f`).find(t=>t.element===e);if(!n||n.type!==`hic`)return;let r=n.srcTexture;if(r.source===t)r.needsUpdate=!0;else{let e=new w(V(this,U,`f`),t);e.wrapS=r.wrapS,e.wrapT=r.wrapT,e.needsUpdate=!0,!n.chain&&n.passes.length>0&&(n.passes[0].uniforms.src.value=e),n.srcTexture=e,r.dispose()}}get maxTextureSize(){return V(this,U,`f`).maxTextureSize}isPlaying(){return V(this,kr,`f`)!==void 0}play(){this.isPlaying()||B(this,kr,requestAnimationFrame(V(this,Wr,`f`)),`f`)}stop(){V(this,kr,`f`)!==void 0&&(cancelAnimationFrame(V(this,kr,`f`)),B(this,kr,void 0,`f`))}render(){let e=Date.now()/1e3,t=V(this,yr,`f`);V(this,H,`m`,Rr).call(this),t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,V(this,vr,`f`).width,V(this,vr,`f`).height),t.clear(t.COLOR_BUFFER_BIT);let n=V(this,X,`f`).right-V(this,X,`f`).left,r=V(this,X,`f`).bottom-V(this,X,`f`).top,i=xe(0,0,n,r),a=V(this,H,`m`,Kr).call(this);a&&(V(this,H,`m`,ri).call(this,n,r),V(this,K,`f`)&&(t.bindFramebuffer(t.FRAMEBUFFER,V(this,K,`f`).fbo),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)));for(let t of V(this,Y,`f`)){let o=t.element.getBoundingClientRect(),s=cn(o),c=V(this,H,`m`,Xr).call(this,t,s,e);if(!c.isVisible)continue;if(t.chain){V(this,H,`m`,Gr).call(this,t,s,c,e);continue}let l=t.passes[0].uniforms;l.time.value=e-t.startTime,l.resolution.value.set(o.width*V(this,J,`f`),o.height*V(this,J,`f`)),l.mouse.value.set((V(this,Fr,`f`)+V(this,Nr,`f`))*V(this,J,`f`),(V(this,Ir,`f`)+V(this,Pr,`f`))*V(this,J,`f`));for(let e of t.passes)for(let[t,n]of Object.entries(e.uniformGenerators))e.uniforms[t].value=n();ii.get(t.element)?.update(),(t.type===`video`||t.isGif)&&(l.src.value.needsUpdate=!0);let u=be(s,r,V(this,Nr,`f`),V(this,Pr,`f`)),d=be(c.rectWithOverflow,r,V(this,Nr,`f`),V(this,Pr,`f`));t.backbuffer&&(t.passes[0].uniforms.backbuffer.value=t.backbuffer.texture);{let e=t.isFullScreen?i:d,n=Math.max(1,e.w*V(this,J,`f`)),r=Math.max(1,e.h*V(this,J,`f`)),a=Math.max(1,e.w),o=Math.max(1,e.h);for(let e=0;e<t.passes.length-1;e++){let i=t.passes[e];if(!i.size)if(i.backbuffer)i.backbuffer.resize(a,o);else{let e=t.bufferTargets.get(i.target);e&&(e.width!==n||e.height!==r)&&e.setSize(n,r)}}}let f=new Map;for(let e of t.passes)e.backbuffer&&e.target&&f.set(e.target,e.backbuffer.texture);let p=t.srcTexture,m=V(this,Fr,`f`)+V(this,Nr,`f`)-u.x,h=V(this,Ir,`f`)+V(this,Pr,`f`)-u.y;for(let e=0;e<t.passes.length-1;e++){let n=t.passes[e],r=t.isFullScreen?i:d;n.uniforms.src.value=p;for(let[e,t]of f)n.uniforms[e]&&(n.uniforms[e].value=t);for(let[e,t]of Object.entries(n.uniformGenerators))n.uniforms[e]&&(n.uniforms[e].value=t());let a=n.size?n.size[0]:r.w*V(this,J,`f`),o=n.size?n.size[1]:r.h*V(this,J,`f`),s=n.size?xe(0,0,n.size[0],n.size[1]):xe(0,0,r.w,r.h);if(n.uniforms.resolution.value.set(a,o),n.uniforms.offset.value.set(0,0),n.uniforms.mouse.value.set(m/r.w*a,h/r.h*o),n.backbuffer)V(this,H,`m`,Z).call(this,n.pass,n.backbuffer.target,s,n.uniforms,!0),n.backbuffer.swap(),p=n.backbuffer.texture;else{let e=t.bufferTargets.get(n.target);if(!e)continue;V(this,H,`m`,Z).call(this,n.pass,e,s,n.uniforms,!0),p=e.texture}n.target&&f.set(n.target,p)}let g=t.passes[t.passes.length-1];g.uniforms.src.value=p,g.uniforms.resolution.value.set(o.width*V(this,J,`f`),o.height*V(this,J,`f`)),g.uniforms.offset.value.set(u.x*V(this,J,`f`),u.y*V(this,J,`f`)),g.uniforms.mouse.value.set((V(this,Fr,`f`)+V(this,Nr,`f`))*V(this,J,`f`),(V(this,Ir,`f`)+V(this,Pr,`f`))*V(this,J,`f`));for(let[e,t]of f)g.uniforms[e]&&(g.uniforms[e].value=t);for(let[e,t]of Object.entries(g.uniformGenerators))g.uniforms[e]&&(g.uniforms[e].value=t());t.backbuffer?(g.uniforms.backbuffer.value=t.backbuffer.texture,t.isFullScreen?(t.backbuffer.resize(n,r),V(this,H,`m`,Qr).call(this,t,u.x,u.y),V(this,H,`m`,Z).call(this,g.pass,t.backbuffer.target,i,g.uniforms,!0),t.backbuffer.swap(),V(this,W,`f`).setUniforms(t.backbuffer.texture,V(this,J,`f`),i),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,a&&V(this,K,`f`)||null,i,V(this,W,`f`).uniforms,!1)):(t.backbuffer.resize(d.w,d.h),V(this,H,`m`,Qr).call(this,t,t.overflow.left,t.overflow.bottom),V(this,H,`m`,Z).call(this,g.pass,t.backbuffer.target,t.backbuffer.getViewport(),g.uniforms,!0),t.backbuffer.swap(),V(this,W,`f`).setUniforms(t.backbuffer.texture,V(this,J,`f`),d),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,a&&V(this,K,`f`)||null,d,V(this,W,`f`).uniforms,!1))):(V(this,H,`m`,Qr).call(this,t,u.x,u.y),V(this,H,`m`,Z).call(this,g.pass,a&&V(this,K,`f`)||null,t.isFullScreen?i:d,g.uniforms,!1))}a&&V(this,K,`f`)&&(V(this,q,`f`)&&V(this,wr,`f`)?V(this,H,`m`,ti).call(this,i,e):V(this,H,`m`,ni).call(this,i,e))}};_r=new WeakMap,vr=new WeakMap,U=new WeakMap,yr=new WeakMap,br=new WeakMap,W=new WeakMap,G=new WeakMap,xr=new WeakMap,K=new WeakMap,Sr=new WeakMap,Cr=new WeakMap,q=new WeakMap,wr=new WeakMap,Tr=new WeakMap,Er=new WeakMap,Dr=new WeakMap,Or=new WeakMap,kr=new WeakMap,J=new WeakMap,Y=new WeakMap,Ar=new WeakMap,X=new WeakMap,jr=new WeakMap,Mr=new WeakMap,Nr=new WeakMap,Pr=new WeakMap,Fr=new WeakMap,Ir=new WeakMap,Lr=new WeakMap,zr=new WeakMap,Br=new WeakMap,Wr=new WeakMap,H=new WeakSet,Rr=function(){if(typeof window>`u`)return;let e=V(this,vr,`f`).ownerDocument,t=e.compatMode===`BackCompat`?e.body:e.documentElement,n=t.clientWidth,r=t.clientHeight,i=window.scrollX,a=window.scrollY,o,s;if(V(this,_r,`f`).fixedCanvas)o=0,s=0;else if(V(this,_r,`f`).wrapper)o=n*V(this,_r,`f`).scrollPadding[0],s=r*V(this,_r,`f`).scrollPadding[1];else{let t=e.body.scrollWidth-(i+n),c=e.body.scrollHeight-(a+r);o=pi(n*V(this,_r,`f`).scrollPadding[0],0,t),s=pi(r*V(this,_r,`f`).scrollPadding[1],0,c)}let c=n+o*2,l=r+s*2;(c!==V(this,Mr,`f`)[0]||l!==V(this,Mr,`f`)[1])&&(V(this,vr,`f`).style.width=`${c}px`,V(this,vr,`f`).style.height=`${l}px`,V(this,U,`f`).setSize(c,l,V(this,J,`f`)),B(this,X,sn({top:-s,left:-o,right:n+o,bottom:r+s}),`f`),B(this,jr,sn({top:0,left:0,right:n,bottom:r}),`f`),B(this,Mr,[c,l],`f`),B(this,Nr,o,`f`),B(this,Pr,s,`f`)),V(this,_r,`f`).fixedCanvas||V(this,vr,`f`).style.setProperty(`transform`,`translate(${i-o}px, ${a-s}px)`)},Vr=async function(e){if(!V(this,Lr,`f`).get(e.element)){V(this,Lr,`f`).set(e.element,!0);try{let t=e.srcTexture,n=t.source instanceof OffscreenCanvas?t.source:void 0,r=await Xe(e.element,e.originalOpacity,n,this.maxTextureSize);if(r.width===0||r.width===0)throw`omg`;let i=new w(V(this,U,`f`),r);i.wrapS=t.wrapS,i.wrapT=t.wrapT,i.needsUpdate=!0,!e.chain&&e.passes.length>0&&(e.passes[0].uniforms.src.value=i),e.srcTexture=i,t.dispose()}catch(e){console.error(e)}V(this,Lr,`f`).set(e.element,!1)}},Hr=async function(e,t,n,r){t.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified; `effect` takes precedence."),t.overflow!==void 0&&console.warn("[VFX-JS] `overflow` is shader-path only and is ignored by the effect path. Use each effect's own `outputRect` (with `dims.canvasRect` for fullscreen) to control its dst rect.");let i=Array.isArray(n)?[...n]:[n];V(this,H,`m`,qr).call(this,i);let a=e.getBoundingClientRect(),o=cn(a),[s,c]=ci(t.overflow),l=li(t.intersection),u=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),d,f,p=!1;if(e instanceof HTMLImageElement)if(f=`img`,p=!!e.src.match(/\.gif/i),p){let t=await qn.create(e.src,V(this,J,`f`));ii.set(e,t),d=new w(V(this,U,`f`),t.getCanvas())}else{let t=await fe(e.src);d=new w(V(this,U,`f`),t)}else if(e instanceof HTMLVideoElement)d=new w(V(this,U,`f`),e),f=`video`;else if(e instanceof HTMLCanvasElement)e.hasAttribute(`layoutsubtree`)&&r?(d=new w(V(this,U,`f`),r),f=`hic`):(d=new w(V(this,U,`f`),e),f=`canvas`);else{let t=await Xe(e,u,void 0,this.maxTextureSize);d=new w(V(this,U,`f`),t),f=`text`}let[m,h]=fi(t.wrap);d.wrapS=m,d.wrapT=h,d.needsUpdate=!0;let g=t.autoCrop??!0;if(f!==`hic`&&t.overlay!==!0)if(typeof t.overlay==`number`)e.style.setProperty(`opacity`,t.overlay.toString());else{let t=f===`video`?`0.0001`:`0`;e.style.setProperty(`opacity`,t.toString())}let _=Date.now()/1e3,v={type:f,element:e,isInViewport:!1,isInLogicalViewport:!1,width:a.width,height:a.height,passes:[],bufferTargets:new Map,startTime:_,enterTime:_,leaveTime:-1/0,release:t.release??1/0,isGif:p,isFullScreen:s,overflow:c,intersection:l,originalOpacity:u,srcTexture:d,zIndex:t.zIndex??0,backbuffer:void 0,autoCrop:g,effectLastRenderTime:_},y=tn(()=>v.srcTexture,()=>ui(v.srcTexture,`w`),()=>ui(v.srcTexture,`h`)),b={},x={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(x[e]=n,b[e]=n()):b[e]=n;v.effectUniformGenerators=x,v.effectStaticUniforms=b;let ee={autoCrop:g,glslVersion:t.glslVersion??`300 es`},te=new Fn(V(this,U,`f`),V(this,br,`f`),V(this,J,`f`),i,ee,y,!1);try{await te.initAll()}catch(t){throw V(this,H,`m`,Jr).call(this,i),d.dispose(),e.style.setProperty(`opacity`,u.toString()),t}v.chain=te,V(this,H,`m`,Xr).call(this,v,o,_),V(this,Y,`f`).push(v),V(this,Y,`f`).sort((e,t)=>e.zIndex-t.zIndex)},Ur=function(e){let t=t=>t.glslVersion===void 0&&e.glslVersion!==void 0?{...t,glslVersion:e.glslVersion}:t;return Array.isArray(e.shader)?e.shader.map(t):[t({frag:V(this,H,`m`,Zr).call(this,e.shader||`uvGradient`)})]},Gr=function(e,t,n,r){let i=e.chain;if(!i)return;let a=V(this,J,`f`);ii.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(e.srcTexture.needsUpdate=!0);let o={...e.effectStaticUniforms??{}};if(e.effectUniformGenerators)for(let[t,n]of Object.entries(e.effectUniformGenerators))o[t]=n();let s=V(this,X,`f`).right-V(this,X,`f`).left,c=V(this,X,`f`).bottom-V(this,X,`f`).top,l=be(t,c,V(this,Nr,`f`),V(this,Pr,`f`)),u=V(this,Fr,`f`)+V(this,Nr,`f`)-l.x,d=V(this,Ir,`f`)+V(this,Pr,`f`)-l.y,f=t.right-t.left,p=t.bottom-t.top,m=r-(e.effectLastRenderTime??r);e.effectLastRenderTime=r;let h=V(this,H,`m`,Kr).call(this)&&V(this,K,`f`)?V(this,K,`f`):null;i.run({time:r-e.startTime,deltaTime:m,mouse:[u*a,d*a],mouseViewport:[V(this,Fr,`f`)*a,V(this,Ir,`f`)*a],intersection:n.intersection,enterTime:r-e.enterTime,leaveTime:r-e.leaveTime,resolvedUniforms:o,canvasLogical:[s,c],canvasPhys:[s*a,c*a],elementLogical:[f,p],elementPhys:[f*a,p*a],elementRectOnCanvasPx:{x:l.x*a,y:l.y*a,w:l.w*a,h:l.h*a},finalTarget:h,isVisible:n.isVisible})},Kr=function(){return V(this,G,`f`).length>0||V(this,q,`f`)!==null&&V(this,wr,`f`)},qr=function(e){for(let t of e)if(V(this,Tr,`f`).has(t))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");for(let t of e)V(this,Tr,`f`).add(t)},Jr=function(e){for(let t of e)V(this,Tr,`f`).delete(t)},Yr=function(e){let t=e.hitTestPadPhys,n=V(this,J,`f`);return an({top:t.top/n,right:t.right/n,bottom:t.bottom/n,left:t.left/n})},Xr=function(e,t,n){let r=ln(t,e.chain?V(this,H,`m`,Yr).call(this,e.chain):e.overflow),i=e.isFullScreen||oi(V(this,jr,`f`),r),a=ln(V(this,jr,`f`),e.intersection.rootMargin),o=fn(a,t),s=e.isFullScreen||si(a,t,o,e.intersection.threshold);!e.isInLogicalViewport&&s&&(e.enterTime=n,e.leaveTime=1/0),e.isInLogicalViewport&&!s&&(e.leaveTime=n),e.isInViewport=i,e.isInLogicalViewport=s;let c=i&&n-e.leaveTime<=e.release;if(c&&!e.chain&&e.passes.length>0){let t=e.passes[0].uniforms;t.intersection.value=o,t.enterTime.value=n-e.enterTime,t.leaveTime.value=n-e.leaveTime}return{isVisible:c,intersection:o,rectWithOverflow:r}},Zr=function(e){return e in a?a[e]:e},Z=function(e,t,n,r,i){let a=V(this,yr,`f`);i&&t!==null&&t!==V(this,K,`f`)&&(a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.viewport(0,0,t.width,t.height),a.clear(a.COLOR_BUFFER_BIT));let o=r.viewport;o&&o.value instanceof Oe&&o.value.set(n.x*V(this,J,`f`),n.y*V(this,J,`f`),n.w*V(this,J,`f`),n.h*V(this,J,`f`));try{Ke(a,V(this,br,`f`),e,t,n,V(this,Mr,`f`)[0],V(this,Mr,`f`)[1],V(this,J,`f`))}catch(e){console.error(e)}},Qr=function(e,t,n){let r=e.passes[0].uniforms.offset.value;r.x=t*V(this,J,`f`),r.y=n*V(this,J,`f`)},$r=function(e){let t=e.length===1&&!(`frag`in e[0])?e[0]:null;if(t&&t.effect!==void 0){V(this,H,`m`,ei).call(this,t,t.effect);return}let n=[],r=[],i=[];for(let t of e)`frag`in t&&i.push(t);for(let e=0;e<i.length-1;e++)i[e].target||(i[e]={...i[e],target:`pass${e}`});for(let t of e){let e,i;if(`frag`in t)e=t.frag,i=new gr(V(this,U,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,t.size,t.target!==void 0,t.glslVersion),r.push(t.target);else{if(t.shader===void 0)throw Error("VFXPostEffect requires `shader` (the `effect` path is not implemented yet).");e=V(this,H,`m`,Zr).call(this,t.shader),i=new gr(V(this,U,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,void 0,!1,t.glslVersion),t.persistent&&i.registerBufferUniform(`backbuffer`),r.push(void 0)}V(this,G,`f`).push(i),n.push(e);let a={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`&&(a[e]=n);V(this,Sr,`f`).push(a)}B(this,xr,r,`f`);for(let e of i)e.target&&V(this,Cr,`f`).set(e.target,void 0);let a=r.filter(e=>e!==void 0);for(let e=0;e<V(this,G,`f`).length;e++)for(let t of a)n[e].match(RegExp(`uniform\\s+sampler2D\\s+${t}\\b`))&&V(this,G,`f`)[e].registerBufferUniform(t)},ei=function(e,t){e.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified on post-effect; `effect` takes precedence.");let n=Array.isArray(t)?[...t]:[t];V(this,H,`m`,qr).call(this,n);let r=tn(()=>{let e=V(this,K,`f`);if(!e)throw Error(`[VFX-JS] post-effect chain active without target`);return e.texture},()=>V(this,K,`f`)?.width??0,()=>V(this,K,`f`)?.height??0),i={autoCrop:!0,glslVersion:e.glslVersion??`300 es`},a=new Fn(V(this,U,`f`),V(this,br,`f`),V(this,J,`f`),n,i,r,!0);if(e.uniforms)for(let[t,n]of Object.entries(e.uniforms))typeof n==`function`?(V(this,Dr,`f`)[t]=n,V(this,Er,`f`)[t]=n()):V(this,Er,`f`)[t]=n;B(this,q,a,`f`),B(this,Or,Date.now()/1e3,`f`),a.initAll().then(()=>{V(this,q,`f`)===a&&B(this,wr,!0,`f`)}).catch(e=>{console.error(`[VFX-JS] Post-effect init failed; post-effect disabled:`,e),V(this,q,`f`)===a&&(V(this,H,`m`,Jr).call(this,V(this,q,`f`).effects),V(this,q,`f`).dispose(),B(this,q,null,`f`),B(this,wr,!1,`f`))})},ti=function(e,t){let n=V(this,q,`f`);if(!n)return;let r=V(this,J,`f`),i={...V(this,Er,`f`)};for(let[e,t]of Object.entries(V(this,Dr,`f`)))i[e]=t();let a=V(this,X,`f`).right-V(this,X,`f`).left,o=V(this,X,`f`).bottom-V(this,X,`f`).top,s=t-V(this,Or,`f`);B(this,Or,t,`f`);let c=[a,o],l=[a*r,o*r],u={x:e.x*r,y:e.y*r,w:e.w*r,h:e.h*r};n.run({time:t-V(this,Ar,`f`),deltaTime:s,mouse:[V(this,Fr,`f`)*r,V(this,Ir,`f`)*r],mouseViewport:[V(this,Fr,`f`)*r,V(this,Ir,`f`)*r],intersection:1,enterTime:0,leaveTime:0,resolvedUniforms:i,canvasLogical:c,canvasPhys:l,elementLogical:c,elementPhys:l,elementRectOnCanvasPx:u,finalTarget:null,isVisible:!0})},ni=function(e,t){if(!V(this,K,`f`))return;let n=V(this,K,`f`).texture,r=new Map;for(let e=0;e<V(this,G,`f`).length;e++){let t=V(this,G,`f`)[e],n=V(this,xr,`f`)[e];n&&t.backbuffer&&r.set(n,t.backbuffer.texture)}for(let i=0;i<V(this,G,`f`).length;i++){let a=V(this,G,`f`)[i],o=i===V(this,G,`f`).length-1,s=V(this,Sr,`f`)[i],c=V(this,xr,`f`)[i],l=V(this,Fr,`f`)+V(this,Nr,`f`),u=V(this,Ir,`f`)+V(this,Pr,`f`),d=a.getTargetDimensions();if(d){let[r,i]=d;a.uniforms.src.value=n,a.uniforms.resolution.value.set(r,i),a.uniforms.offset.value.set(0,0),a.uniforms.time.value=t-V(this,Ar,`f`),a.uniforms.mouse.value.set(l/e.w*r,u/e.h*i)}else a.setUniforms(n,V(this,J,`f`),e,t-V(this,Ar,`f`),l,u);a.uniforms.passIndex.value=i,a.updateCustomUniforms(s);for(let[e,t]of r){let n=a.uniforms[e];n&&(n.value=t)}if(o)a.backbuffer?(a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture),V(this,H,`m`,Z).call(this,a.pass,a.backbuffer.target,e,a.uniforms,!0),a.backbuffer.swap(),V(this,W,`f`).setUniforms(a.backbuffer.texture,V(this,J,`f`),e),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,null,e,V(this,W,`f`).uniforms,!1)):V(this,H,`m`,Z).call(this,a.pass,null,e,a.uniforms,!1);else if(a.backbuffer){a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture);let t=d?xe(0,0,d[0]/V(this,J,`f`),d[1]/V(this,J,`f`)):e;V(this,H,`m`,Z).call(this,a.pass,a.backbuffer.target,t,a.uniforms,!0),a.backbuffer.swap(),n=a.backbuffer.texture,c&&r.set(c,a.backbuffer.texture)}else{let t=c??`postEffect${i}`,o=V(this,Cr,`f`).get(t),s=d?d[0]:e.w*V(this,J,`f`),l=d?d[1]:e.h*V(this,J,`f`);(!o||o.width!==s||o.height!==l)&&(o?.dispose(),o=cr(V(this,U,`f`),s,l,{float:a.float}),V(this,Cr,`f`).set(t,o));let u=d?xe(0,0,d[0]/V(this,J,`f`),d[1]/V(this,J,`f`)):e;V(this,H,`m`,Z).call(this,a.pass,o,u,a.uniforms,!0),n=o.texture,c&&r.set(c,o.texture)}}},ri=function(e,t){let n=e*V(this,J,`f`),r=t*V(this,J,`f`);(!V(this,K,`f`)||V(this,K,`f`).width!==n||V(this,K,`f`).height!==r)&&(V(this,K,`f`)?.dispose(),B(this,K,cr(V(this,U,`f`),n,r),`f`));for(let n of V(this,G,`f`))n.persistent&&!n.backbuffer?n.initializeBackbuffer(V(this,U,`f`),e,t,V(this,J,`f`)):n.backbuffer&&n.resizeBackbuffer(e,t)};function oi(e,t){return t.left<=e.right&&t.right>=e.left&&t.top<=e.bottom&&t.bottom>=e.top}function si(e,t,n,r){return r===0?oi(e,t):n>=r}function ci(e){return e===!0?[!0,on]:e===void 0?[!1,on]:[!1,an(e)]}function li(e){return{threshold:e?.threshold??0,rootMargin:an(e?.rootMargin??0)}}function ui(e,t){let n=e.source;if(!n)return 0;if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return t===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return t===`w`?n.videoWidth:n.videoHeight;let r=n;return t===`w`?r.width:r.height}function di(e){return e===`repeat`?`repeat`:e===`mirror`?`mirror`:`clamp`}function fi(e){if(!e)return[`clamp`,`clamp`];if(Array.isArray(e))return[di(e[0]),di(e[1])];let t=di(e);return[t,t]}function pi(e,t,n){return Math.max(t,Math.min(n,e))}function mi(){try{let e=document.createElement(`canvas`);return(e.getContext(`webgl2`)||e.getContext(`webgl`))!==null}catch{return!1}}var hi=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Q=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},gi,$,_i,vi,yi,bi,xi,Si;function Ci(){if(typeof window>`u`)throw`Cannot find 'window'. VFX-JS only runs on the browser.`;if(typeof document>`u`)throw`Cannot find 'document'. VFX-JS only runs on the browser.`}function wi(e){return{position:e?`fixed`:`absolute`,top:0,left:0,width:`0px`,height:`0px`,"z-index":9999,"pointer-events":`none`}}var Ti=class e{static init(t){try{return new e(t)}catch{return null}}constructor(e={}){if(gi.add(this),$.set(this,void 0),_i.set(this,void 0),vi.set(this,new Map),Ci(),!mi())throw Error(`[VFX-JS] WebGL is not available in this environment.`);let t=te(e),n=document.createElement(`canvas`),r=wi(t.fixedCanvas);for(let[e,t]of Object.entries(r))n.style.setProperty(e,t.toString());t.zIndex!==void 0&&n.style.setProperty(`z-index`,t.zIndex.toString()),(t.wrapper??document.body).appendChild(n),hi(this,_i,n,`f`),hi(this,$,new ai(t,n),`f`),t.autoplay&&Q(this,$,`f`).play()}async add(e,t,n){e instanceof HTMLImageElement?await Q(this,gi,`m`,yi).call(this,e,t):e instanceof HTMLVideoElement?await Q(this,gi,`m`,bi).call(this,e,t):e instanceof HTMLCanvasElement?e.hasAttribute(`layoutsubtree`)&&n?await Q(this,$,`f`).addElement(e,t,n):await Q(this,gi,`m`,xi).call(this,e,t):await Q(this,gi,`m`,Si).call(this,e,t)}updateHICTexture(e,t){Q(this,$,`f`).updateHICTexture(e,t)}get maxTextureSize(){return Q(this,$,`f`).maxTextureSize}async addHTML(e,t){if(!ee())return console.warn(`html-in-canvas not supported, falling back to dom-to-canvas`),this.add(e,t);t.overlay!==void 0&&console.warn(`addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.`);let{overlay:n,...r}=t,i=Q(this,vi,`f`).get(e);i&&Q(this,$,`f`).removeElement(i);let{canvas:a,initialCapture:o}=await y(e,{onCapture:e=>{Q(this,$,`f`).updateHICTexture(a,e)},maxSize:Q(this,$,`f`).maxTextureSize});i=a,Q(this,vi,`f`).set(e,i),await Q(this,$,`f`).addElement(i,r,o)}remove(e){let t=Q(this,vi,`f`).get(e);t?(b(t,e),Q(this,vi,`f`).delete(e),Q(this,$,`f`).removeElement(t)):Q(this,$,`f`).removeElement(e)}async update(e){let t=Q(this,vi,`f`).get(e);if(t){t.requestPaint();return}if(e instanceof HTMLCanvasElement){Q(this,$,`f`).updateCanvasElement(e);return}else return Q(this,$,`f`).updateTextElement(e)}play(){Q(this,$,`f`).play()}stop(){Q(this,$,`f`).stop()}render(){Q(this,$,`f`).render()}destroy(){for(let[e,t]of Q(this,vi,`f`))b(t,e);Q(this,vi,`f`).clear(),Q(this,$,`f`).destroy(),Q(this,_i,`f`).remove()}};$=new WeakMap,_i=new WeakMap,vi=new WeakMap,gi=new WeakSet,yi=function(e,t){return e.complete?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`load`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},bi=function(e,t){return e.readyState>=3?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`canplay`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},xi=function(e,t){return Q(this,$,`f`).addElement(e,t)},Si=function(e,t){return Q(this,$,`f`).addElement(e,t)};export{Ti as t};
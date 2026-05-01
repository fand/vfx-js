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
    `};function o(e){if(!e.src||e.src.startsWith(`data:`))return!1;try{return new URL(e.src,location.href).origin!==location.origin}catch{return!1}}async function s(e){let t=await(await fetch(e)).blob();return URL.createObjectURL(t)}async function c(e){let t=Array.from(e.querySelectorAll(`img`)).filter(e=>e.complete&&e.naturalWidth>0&&o(e));if(t.length===0)return()=>{};let n=new Map,r=[];return await Promise.all(t.map(async e=>{try{let t=await s(e.src);n.set(e,e.src),r.push(t),await new Promise(n=>{e.addEventListener(`load`,()=>n(),{once:!0}),e.src=t})}catch{}})),()=>{for(let[e,t]of n)e.src=t;for(let e of r)URL.revokeObjectURL(e)}}var l=[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`],u=[`position`,`top`,`right`,`bottom`,`left`,`float`,`flex`,`flex-grow`,`flex-shrink`,`flex-basis`,`align-self`,`justify-self`,`place-self`,`order`,`grid-column`,`grid-column-start`,`grid-column-end`,`grid-row`,`grid-row-start`,`grid-row-end`,`grid-area`],d=new WeakMap,f=new WeakMap,p=new WeakMap,m=new WeakMap,h=new WeakMap,g=new WeakMap;async function _(e,t){let n=e.getContext(`2d`);if(!n)throw Error(`Failed to get 2d context from layoutsubtree canvas`);let{onCapture:r,maxSize:i}=t,a=null,o=null,s=new Promise(e=>{o=e});e.onpaint=()=>{let t=e.firstElementChild;if(!t||e.width===0||e.height===0)return;n.clearRect(0,0,e.width,e.height),n.drawElementImage(t,0,0);let s=e.width,c=e.height;if(i&&(s>i||c>i)){let e=Math.min(i/s,i/c);s=Math.floor(s*e),c=Math.floor(c*e)}(!a||a.width!==s||a.height!==c)&&(a=new OffscreenCanvas(s,c));let l=a.getContext(`2d`);if(l){if(l.clearRect(0,0,s,c),l.drawImage(e,0,0,s,c),n.clearRect(0,0,e.width,e.height),o){o(a),o=null;return}r(a)}};let c=new ResizeObserver(t=>{for(let n of t){let t=n.devicePixelContentBoxSize?.[0];if(t)e.width=t.inlineSize,e.height=t.blockSize;else{let t=n.borderBoxSize?.[0];if(t){let n=window.devicePixelRatio;e.width=Math.round(t.inlineSize*n),e.height=Math.round(t.blockSize*n)}}}e.requestPaint()});c.observe(e,{box:`device-pixel-content-box`}),d.set(e,c);let l=e.firstElementChild,u=``;if(l){let t=new ResizeObserver(t=>{let n=t[0].borderBoxSize?.[0];if(!n)return;let r=`${Math.round(n.blockSize)}px`;r!==u&&(u=r,e.style.setProperty(`height`,r))});t.observe(l),f.set(e,t)}return s}function v(e){e.onpaint=null;let t=d.get(e);t&&(t.disconnect(),d.delete(e));let n=f.get(e);n&&(n.disconnect(),f.delete(e))}async function y(e,t){let n=e.getBoundingClientRect(),r=document.createElement(`canvas`);r.setAttribute(`layoutsubtree`,``),r.className=e.className;let i=e.getAttribute(`style`);i&&r.setAttribute(`style`,i),r.style.setProperty(`padding`,`0`),r.style.setProperty(`border`,`none`),r.style.setProperty(`box-sizing`,`content-box`),r.style.setProperty(`background`,`transparent`);let a=getComputedStyle(e),o=a.display===`inline`?`block`:a.display;r.style.setProperty(`display`,o);for(let e of l)r.style.setProperty(e,a.getPropertyValue(e));for(let e of u)r.style.setProperty(e,a.getPropertyValue(e));let s=e=>Number.parseFloat(e),d=s(a.paddingLeft)+s(a.paddingRight)+s(a.borderLeftWidth)+s(a.borderRightWidth),f=s(a.paddingTop)+s(a.paddingBottom)+s(a.borderTopWidth)+s(a.borderBottomWidth);d>0&&r.style.setProperty(`width`,`${n.width}px`),f>0&&r.style.setProperty(`height`,`${n.height}px`),r.style.width||r.style.setProperty(`width`,`100%`),r.style.height||r.style.setProperty(`height`,`${n.height}px`);let v=window.devicePixelRatio;r.width=Math.round(n.width*v),r.height=Math.round(n.height*v),p.set(e,e.style.margin),m.set(e,e.style.width),h.set(e,e.style.boxSizing),e.parentNode?.insertBefore(r,e),r.appendChild(e),e.style.setProperty(`margin`,`0`),e.style.setProperty(`width`,`100%`),e.style.setProperty(`box-sizing`,`border-box`);let y=await c(e);return g.set(r,y),{canvas:r,initialCapture:await _(r,t)}}function ee(e,t){v(e);let n=g.get(e);n&&(n(),g.delete(e)),e.parentNode?.insertBefore(t,e),e.remove();let r=p.get(t);r!==void 0&&(t.style.margin=r,p.delete(t));let i=m.get(t);i!==void 0&&(t.style.width=i,m.delete(t));let a=h.get(t);a!==void 0&&(t.style.boxSizing=a,h.delete(t))}var b;function te(){if(b!==void 0)return b;try{let e=document.createElement(`canvas`),t=e.getContext(`2d`);b=t!==null&&typeof t.drawElementImage==`function`&&typeof e.requestPaint==`function`}catch{b=!1}return b}function ne(e){let t=typeof window<`u`?window.devicePixelRatio:1,n;n=e.scrollPadding===void 0?[.1,.1]:e.scrollPadding===!1?[0,0]:Array.isArray(e.scrollPadding)?[e.scrollPadding[0]??.1,e.scrollPadding[1]??.1]:[e.scrollPadding,e.scrollPadding];let r;return r=e.postEffect===void 0?[]:Array.isArray(e.postEffect)?e.postEffect:[e.postEffect],{pixelRatio:e.pixelRatio??t,zIndex:e.zIndex??void 0,autoplay:e.autoplay??!0,fixedCanvas:e.scrollPadding===!1,scrollPadding:n,wrapper:e.wrapper,postEffects:r}}var x=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},S=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},re,ie,ae,oe,se,ce,le,ue,C=class{constructor(e,t,n){re.add(this),this.wrapS=`clamp`,this.wrapT=`clamp`,this.minFilter=`linear`,this.magFilter=`linear`,this.needsUpdate=!0,this.source=null,ie.set(this,void 0),ae.set(this,!1),oe.set(this,void 0),se.set(this,void 0),x(this,ie,e,`f`),this.gl=e.gl;let r=n?.externalHandle;x(this,se,r!==void 0,`f`),r===void 0?S(this,re,`m`,ce).call(this):(this.texture=r,x(this,ae,!0,`f`),this.needsUpdate=!1),t&&(this.source=t),x(this,oe,n?.autoRegister!==!1&&!S(this,se,`f`),`f`),S(this,oe,`f`)&&e.addResource(this)}restore(){S(this,se,`f`)||(S(this,re,`m`,ce).call(this),x(this,ae,!1,`f`),this.needsUpdate=!0)}bind(e){let t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&=(S(this,re,`m`,le).call(this),!1)}dispose(){S(this,oe,`f`)&&S(this,ie,`f`).removeResource(this),S(this,se,`f`)||this.gl.deleteTexture(this.texture)}};ie=new WeakMap,ae=new WeakMap,oe=new WeakMap,se=new WeakMap,re=new WeakSet,ce=function(){let e=this.gl.createTexture();if(!e)throw Error(`[VFX-JS] Failed to create texture`);this.texture=e},le=function(){let e=this.gl,t=this.source;if(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4),t)try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)}catch(e){console.error(e)}else if(!S(this,ae,`f`)){let t=new Uint8Array([0,0,0,0]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,t)}S(this,re,`m`,ue).call(this),x(this,ae,!0,`f`)},ue=function(){let e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,de(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,de(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,fe(e,this.minFilter)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,fe(e,this.magFilter))};function de(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function fe(e,t){return t===`nearest`?e.NEAREST:e.LINEAR}function pe(e){return new Promise((t,n)=>{let r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>t(r),r.onerror=n,r.src=e})}var me=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},he=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ge,_e,ve,ye=class{constructor(e,t,n,r={}){ge.add(this),_e.set(this,void 0),me(this,_e,e,`f`),this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(n)),this.float=r.float??!1,this.texture=new C(e,void 0,{autoRegister:!1});let i=r.wrap;i!==void 0&&(typeof i==`string`?(this.texture.wrapS=i,this.texture.wrapT=i):(this.texture.wrapS=i[0],this.texture.wrapT=i[1])),r.filter!==void 0&&(this.texture.minFilter=r.filter,this.texture.magFilter=r.filter),he(this,ge,`m`,ve).call(this),e.addResource(this)}setSize(e,t){let n=Math.max(1,Math.floor(e)),r=Math.max(1,Math.floor(t));n===this.width&&r===this.height||(this.width=n,this.height=r,he(this,ge,`m`,ve).call(this))}restore(){this.texture.restore(),he(this,ge,`m`,ve).call(this)}dispose(){he(this,_e,`f`).removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.texture.dispose()}};_e=new WeakMap,ge=new WeakSet,ve=function(){let e=this.gl,t=this.fbo,n=e.createFramebuffer();if(!n)throw Error(`[VFX-JS] Failed to create framebuffer`);this.fbo=n;let r=this.texture.texture;e.bindTexture(e.TEXTURE_2D,r);let i=he(this,_e,`f`).floatLinearFilter,a=this.float?i?e.RGBA32F:e.RGBA16F:e.RGBA8,o=this.float?i?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,e.RGBA,o,null);let s=this.texture.minFilter===`nearest`?e.NEAREST:e.LINEAR,c=this.texture.magFilter===`nearest`?e.NEAREST:e.LINEAR,l=be(e,this.texture.wrapS),u=be(e,this.texture.wrapT);e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,s),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,c),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,l),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,u),e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.texture.needsUpdate=!1,this.texture.source=null,t&&e.deleteFramebuffer(t)};function be(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function xe(e,t,n,r){return{x:e.left+n,y:t-r-e.bottom,w:e.right-e.left,h:e.bottom-e.top}}function Se(e,t,n,r){return{x:e,y:t,w:n,h:r}}var Ce=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},w=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},we,Te,Ee,T,De=class{constructor(e,t,n,r,i,a={}){we.set(this,void 0),Te.set(this,void 0),Ee.set(this,void 0),T.set(this,void 0),Ce(this,we,t,`f`),Ce(this,Te,n,`f`),Ce(this,Ee,r,`f`);let o=t*r,s=n*r,c={float:i,wrap:a.wrap,filter:a.filter};Ce(this,T,[new ye(e,o,s,c),new ye(e,o,s,c)],`f`)}get texture(){return w(this,T,`f`)[0].texture}get target(){return w(this,T,`f`)[1]}resize(e,t){if(e===w(this,we,`f`)&&t===w(this,Te,`f`))return;Ce(this,we,e,`f`),Ce(this,Te,t,`f`);let n=e*w(this,Ee,`f`),r=t*w(this,Ee,`f`);w(this,T,`f`)[0].setSize(n,r),w(this,T,`f`)[1].setSize(n,r)}swap(){Ce(this,T,[w(this,T,`f`)[1],w(this,T,`f`)[0]],`f`)}getViewport(){return Se(0,0,w(this,we,`f`),w(this,Te,`f`))}dispose(){w(this,T,`f`)[0].dispose(),w(this,T,`f`)[1].dispose()}};we=new WeakMap,Te=new WeakMap,Ee=new WeakMap,T=new WeakMap;var Oe=class{constructor(e=0,t=0){this.x=0,this.y=0,this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}},ke=class{constructor(e=0,t=0,n=0,r=0){this.x=0,this.y=0,this.z=0,this.w=0,this.x=e,this.y=t,this.z=n,this.w=r}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}},Ae=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},je=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Me,Ne,Pe,Fe,Ie,Le,Re;function ze(e){return/#version\s+300\s+es\b/.test(e)?`300 es`:/#version\s+100\b/.test(e)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(e)?`100`:`300 es`}var Be=class{constructor(e,t,n,r){Me.add(this),Ne.set(this,void 0),Pe.set(this,void 0),Fe.set(this,void 0),Ie.set(this,void 0),Le.set(this,new Map),Ae(this,Ne,e,`f`),this.gl=e.gl,Ae(this,Pe,t,`f`),Ae(this,Fe,n,`f`),Ae(this,Ie,r??ze(n),`f`),je(this,Me,`m`,Re).call(this),e.addResource(this)}restore(){je(this,Me,`m`,Re).call(this)}use(){this.gl.useProgram(this.program)}hasUniform(e){return je(this,Le,`f`).has(e)}uploadUniforms(e){let t=this.gl,n=0;for(let[r,i]of je(this,Le,`f`)){let a=e[r];if(!a)continue;let o=a.value;if(o!=null){if(Ue(i.type)){o instanceof C&&(o.bind(n),t.uniform1i(i.location,n),n++);continue}o instanceof C||Ge(t,i,o)}}}dispose(){je(this,Ne,`f`).removeResource(this),this.gl.deleteProgram(this.program)}};Ne=new WeakMap,Pe=new WeakMap,Fe=new WeakMap,Ie=new WeakMap,Le=new WeakMap,Me=new WeakSet,Re=function(){let e=this.gl,t=Ve(e,e.VERTEX_SHADER,He(je(this,Pe,`f`),je(this,Ie,`f`))),n=Ve(e,e.FRAGMENT_SHADER,He(je(this,Fe,`f`),je(this,Ie,`f`))),r=e.createProgram();if(!r)throw Error(`[VFX-JS] Failed to create program`);if(e.attachShader(r,t),e.attachShader(r,n),e.bindAttribLocation(r,0,`position`),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let i=e.getProgramInfoLog(r)??``;throw e.deleteShader(t),e.deleteShader(n),e.deleteProgram(r),Error(`[VFX-JS] Program link failed: ${i}`)}e.detachShader(r,t),e.detachShader(r,n),e.deleteShader(t),e.deleteShader(n),this.program=r,je(this,Le,`f`).clear();let i=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<i;t++){let n=e.getActiveUniform(r,t);if(!n)continue;let i=n.name.replace(/\[0\]$/,``),a=e.getUniformLocation(r,n.name);a&&je(this,Le,`f`).set(i,{location:a,type:n.type,size:n.size})}};function Ve(e,t,n){let r=e.createShader(t);if(!r)throw Error(`[VFX-JS] Failed to create shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)??``;throw e.deleteShader(r),Error(`[VFX-JS] Shader compile failed: ${t}\n\n${n}`)}return r}function He(e,t){return e.replace(/^\s+/,``).startsWith(`#version`)||t===`100`?e:`#version 300 es\n${e}`}function Ue(e){return e===35678||e===36298||e===36306||e===35682}var We=new Set;function Ge(e,t,n){let r=t.location,i=t.size>1,a=n,o=n,s=n;switch(t.type){case e.FLOAT:i?e.uniform1fv(r,a):e.uniform1f(r,n);return;case e.FLOAT_VEC2:if(i)e.uniform2fv(r,a);else if(n instanceof Oe)e.uniform2f(r,n.x,n.y);else{let t=n;e.uniform2f(r,t[0],t[1])}return;case e.FLOAT_VEC3:if(i)e.uniform3fv(r,a);else{let t=n;e.uniform3f(r,t[0],t[1],t[2])}return;case e.FLOAT_VEC4:if(i)e.uniform4fv(r,a);else if(n instanceof ke)e.uniform4f(r,n.x,n.y,n.z,n.w);else{let t=n;e.uniform4f(r,t[0],t[1],t[2],t[3])}return;case e.INT:i?e.uniform1iv(r,o):e.uniform1i(r,n);return;case e.INT_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,t[0],t[1])}return;case e.INT_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,t[0],t[1],t[2])}return;case e.INT_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,t[0],t[1],t[2],t[3])}return;case e.BOOL:i?e.uniform1iv(r,o):e.uniform1i(r,+!!n);return;case e.BOOL_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,+!!t[0],+!!t[1])}return;case e.BOOL_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,+!!t[0],+!!t[1],+!!t[2])}return;case e.BOOL_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,+!!t[0],+!!t[1],+!!t[2],+!!t[3])}return;case e.FLOAT_MAT2:e.uniformMatrix2fv(r,!1,a);return;case e.FLOAT_MAT3:e.uniformMatrix3fv(r,!1,a);return;case e.FLOAT_MAT4:e.uniformMatrix4fv(r,!1,a);return;case e.UNSIGNED_INT:i?e.uniform1uiv(r,s):e.uniform1ui(r,n);return;case e.UNSIGNED_INT_VEC2:if(i)e.uniform2uiv(r,s);else{let t=n;e.uniform2ui(r,t[0],t[1])}return;case e.UNSIGNED_INT_VEC3:if(i)e.uniform3uiv(r,s);else{let t=n;e.uniform3ui(r,t[0],t[1],t[2])}return;case e.UNSIGNED_INT_VEC4:if(i)e.uniform4uiv(r,s);else{let t=n;e.uniform4ui(r,t[0],t[1],t[2],t[3])}return;default:We.has(t.type)||(We.add(t.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${t.type.toString(16)}; skipping upload.`));return}}var Ke=class{constructor(e,t,n,r,i,a){this.gl=e.gl,this.program=new Be(e,t,n,a),this.uniforms=r,this.blend=i}dispose(){this.program.dispose()}};function qe(e,t,n,r,i,a,o,s){let c=r?r.width/s:a,l=r?r.height/s:o,u=Math.max(0,i.x),d=Math.max(0,i.y),f=Math.min(c,i.x+i.w),p=Math.min(l,i.y+i.h),m=f-u,h=p-d;m<=0||h<=0||(e.bindFramebuffer(e.FRAMEBUFFER,r?r.fbo:null),e.viewport(Math.round(u*s),Math.round(d*s),Math.round(m*s),Math.round(h*s)),Je(e,n.blend),n.program.use(),n.program.uploadUniforms(n.uniforms),t.draw())}function Je(e,t){if(t===`none`){e.disable(e.BLEND);return}e.enable(e.BLEND),e.blendEquation(e.FUNC_ADD),t===`premultiplied`?e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA):t===`additive`?e.blendFuncSeparate(e.ONE,e.ONE,e.ONE,e.ONE):e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA)}var Ye=class{constructor(t){this.uniforms={src:{value:null},offset:{value:new Oe},resolution:{value:new Oe},viewport:{value:new ke}},this.pass=new Ke(t,e,n,this.uniforms,`premultiplied`)}setUniforms(e,t,n){this.uniforms.src.value=e,this.uniforms.resolution.value.set(n.w*t,n.h*t),this.uniforms.offset.value.set(n.x*t,n.y*t)}dispose(){this.pass.dispose()}},Xe=e=>{let t=document.implementation.createHTMLDocument(`test`),n=t.createRange();n.selectNodeContents(t.documentElement),n.deleteContents();let r=document.createElement(`head`);return t.documentElement.appendChild(r),t.documentElement.appendChild(n.createContextualFragment(e)),t.documentElement.setAttribute(`xmlns`,t.documentElement.namespaceURI),new XMLSerializer().serializeToString(t).replace(/<!DOCTYPE html>/,``)};async function Ze(e,t,n,r){let i=e.getBoundingClientRect(),a=window.devicePixelRatio,o=i.width*a,s=i.height*a,c=1,l=o,u=s;r&&(l>r||u>r)&&(c=Math.min(r/l,r/u),l=Math.floor(l*c),u=Math.floor(u*c));let d=n&&n.width===l&&n.height===u?n:new OffscreenCanvas(l,u),f=e.cloneNode(!0);await Qe(e,f),$e(e,f),f.style.setProperty(`opacity`,t.toString()),f.style.setProperty(`margin`,`0px`),et(f);let p=f.outerHTML,m=`<svg xmlns="http://www.w3.org/2000/svg" width="${o}" height="${s}"><foreignObject width="100%" height="100%">${Xe(p)}</foreignObject></svg>`;return new Promise((e,t)=>{let n=new Image;n.onload=()=>{let r=d.getContext(`2d`);if(r===null)return t();r.clearRect(0,0,l,u);let i=a*c;r.scale(i,i),r.drawImage(n,0,0,o,s),r.setTransform(1,0,0,1,0,0),e(d)},n.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(m)}`})}async function Qe(e,t){let n=window.getComputedStyle(e);for(let e of Array.from(n))/(-inline-|-block-|^inline-|^block-)/.test(e)||/^-webkit-.*(start|end|before|after|logical)/.test(e)||t.style.setProperty(e,n.getPropertyValue(e),n.getPropertyPriority(e));if(t.tagName===`INPUT`)t.setAttribute(`value`,t.value);else if(t.tagName===`TEXTAREA`)t.innerHTML=t.value;else if(t.tagName===`IMG`)try{t.src=await tt(e.src)}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];await Qe(r,i)}}function $e(e,t){if(typeof e.computedStyleMap==`function`)try{let n=e.computedStyleMap();for(let e of[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`]){let r=n.get(e);r instanceof CSSKeywordValue&&r.value===`auto`&&t.style.setProperty(e,`auto`)}}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];r instanceof HTMLElement&&i instanceof HTMLElement&&$e(r,i)}}function et(e){let t=e;for(;;){let e=t.style;if(Number.parseFloat(e.paddingTop)>0||Number.parseFloat(e.borderTopWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.firstElementChild;if(!n)break;n.style.setProperty(`margin-top`,`0px`),t=n}for(t=e;;){let e=t.style;if(Number.parseFloat(e.paddingBottom)>0||Number.parseFloat(e.borderBottomWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.lastElementChild;if(!n)break;n.style.setProperty(`margin-bottom`,`0px`),t=n}}async function tt(e){let t=await fetch(e).then(e=>e.blob());return new Promise(e=>{let n=new FileReader;n.onload=function(){e(this.result)},n.readAsDataURL(t)})}var E=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},D=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},nt,rt,it,at,ot,st,ct,lt,ut,dt,ft,pt,mt=Object.freeze({__brand:`EffectQuad`});function ht(e){return e===mt}function gt(e,t){switch(t){case`lines`:return e.LINES;case`lineStrip`:return e.LINE_STRIP;case`points`:return e.POINTS;default:return e.TRIANGLES}}function _t(e,t){if(t instanceof Float32Array)return e.FLOAT;if(t instanceof Uint8Array)return e.UNSIGNED_BYTE;if(t instanceof Uint16Array)return e.UNSIGNED_SHORT;if(t instanceof Uint32Array)return e.UNSIGNED_INT;if(t instanceof Int8Array)return e.BYTE;if(t instanceof Int16Array)return e.SHORT;if(t instanceof Int32Array)return e.INT;throw Error(`[VFX-JS] Unsupported attribute typed array`)}function vt(e,t){if(ArrayBuffer.isView(t)&&!(t instanceof DataView))return{name:e,data:t,itemSize:2,normalized:!1,perInstance:!1};let n=t;return{name:e,data:n.data,itemSize:n.itemSize,normalized:n.normalized??!1,perInstance:n.perInstance??!1}}var yt=class{constructor(e,t,n){nt.add(this),rt.set(this,void 0),it.set(this,void 0),at.set(this,void 0),ot.set(this,[]),st.set(this,null),this.indexType=0,this.hasIndices=!1,this.drawCount=0,this.drawStart=0,ct.set(this,!1),E(this,rt,e,`f`),this.gl=e.gl,E(this,it,t,`f`),E(this,at,n,`f`),this.mode=gt(this.gl,t.mode),this.instanceCount=t.instanceCount??0,D(this,nt,`m`,lt).call(this),e.addResource(this),E(this,ct,!0,`f`)}restore(){E(this,ot,[],`f`),E(this,st,null,`f`),D(this,nt,`m`,lt).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),this.hasIndices?this.instanceCount>0?e.drawElementsInstanced(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2),this.instanceCount):e.drawElements(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2)):this.instanceCount>0?e.drawArraysInstanced(this.mode,this.drawStart,this.drawCount,this.instanceCount):e.drawArrays(this.mode,this.drawStart,this.drawCount)}dispose(){D(this,ct,`f`)&&(D(this,rt,`f`).removeResource(this),E(this,ct,!1,`f`));let e=this.gl;e.deleteVertexArray(this.vao);for(let t of D(this,ot,`f`))e.deleteBuffer(t);D(this,st,`f`)&&e.deleteBuffer(D(this,st,`f`)),E(this,ot,[],`f`),E(this,st,null,`f`)}};rt=new WeakMap,it=new WeakMap,at=new WeakMap,ot=new WeakMap,st=new WeakMap,ct=new WeakMap,nt=new WeakSet,lt=function(){let e=this.gl,t=e.createVertexArray();if(!t)throw Error(`[VFX-JS] Failed to create VAO`);this.vao=t,e.bindVertexArray(t);let n=D(this,at,`f`).program,r=null;for(let[t,i]of Object.entries(D(this,it,`f`).attributes)){let a=vt(t,i),o=e.getAttribLocation(n,a.name);if(o<0)continue;let s=e.createBuffer();if(!s)throw Error(`[VFX-JS] Failed to create VBO for "${a.name}"`);D(this,ot,`f`).push(s),e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,a.data,e.STATIC_DRAW);let c=_t(e,a.data);e.enableVertexAttribArray(o),c===e.FLOAT||c===e.HALF_FLOAT||a.normalized?e.vertexAttribPointer(o,a.itemSize,c,a.normalized,0,0):e.vertexAttribIPointer(o,a.itemSize,c,0,0),a.perInstance&&e.vertexAttribDivisor(o,1),t===`position`&&r===null&&(r=a.data.length/a.itemSize)}let i=0,a=D(this,it,`f`).indices;if(a){let t=e.createBuffer();if(!t)throw Error(`[VFX-JS] Failed to create IBO`);E(this,st,t,`f`),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t),e.bufferData(e.ELEMENT_ARRAY_BUFFER,a,e.STATIC_DRAW),this.hasIndices=!0,this.indexType=a instanceof Uint32Array?e.UNSIGNED_INT:e.UNSIGNED_SHORT,i=a.length}else this.hasIndices=!1;e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null),D(this,st,`f`)&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null);let o=this.hasIndices?i:r??0,s=D(this,it,`f`).drawRange;this.drawStart=s?.start??0,this.drawCount=s?.count===void 0?Math.max(0,o-this.drawStart):s.count};var bt=class{constructor(e,t){ut.set(this,void 0),dt.set(this,void 0),ft.set(this,new WeakMap),pt.set(this,new Set),E(this,ut,e,`f`),E(this,dt,t,`f`)}get quad(){return D(this,dt,`f`)}resolve(e,t){let n=D(this,ft,`f`).get(e);n||(n=new Map,D(this,ft,`f`).set(e,n));let r=n.get(t);return r||(r=new yt(D(this,ut,`f`),e,t),n.set(t,r),D(this,pt,`f`).add(r)),r}dispose(){for(let e of D(this,pt,`f`))e.dispose();D(this,pt,`f`).clear()}};ut=new WeakMap,dt=new WeakMap,ft=new WeakMap,pt=new WeakMap;var O=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},k=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},xt,St,Ct,wt,Tt,Et,Dt,Ot,kt,At,jt,Mt,A,j,Nt,Pt,Ft,It,Lt,Rt,zt=Symbol.for(`@vfx-js/effect.resolve-texture`),Bt=Symbol.for(`@vfx-js/effect.resolve-rt`);function Vt(e){return e[zt]()}function Ht(e){return e[Bt]}var Ut=`#version 300 es
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
`,Wt=`
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
`,Gt=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`,Kt=`
precision highp float;
varying vec2 uv;
uniform sampler2D src;
void main() {
    gl_FragColor = texture2D(src, uv);
}
`,qt=class{constructor(e,t,n,r,i){xt.add(this),St.set(this,void 0),Ct.set(this,void 0),wt.set(this,void 0),Tt.set(this,new Map),Et.set(this,void 0),Dt.set(this,[]),Ot.set(this,[]),kt.set(this,[]),At.set(this,[]),jt.set(this,`init`),Mt.set(this,!1),A.set(this,void 0),j.set(this,void 0),Ft.set(this,[]),O(this,St,e,`f`),O(this,Ct,e.gl,`f`),O(this,wt,n,`f`),O(this,Et,new bt(e,t),`f`),O(this,A,{outputBufferW:1,outputBufferH:1,canvasBufferSize:[1,1],outputViewport:{x:0,y:0,w:1,h:1},elementBufferW:1,elementBufferH:1,contentRectUv:[0,0,1,1],srcRectUv:[0,0,1,1]},`f`);let a={time:0,deltaTime:0,pixelRatio:n,resolution:[1,1],mouse:[0,0],mouseViewport:[0,0],intersection:0,enterTime:0,leaveTime:0,src:r,target:null,uniforms:{},vfxProps:i,dims:{element:[1,1],elementPixel:[1,1],canvas:[1,1],canvasPixel:[1,1],pixelRatio:n,contentRect:[0,0,1,1],srcRect:[0,0,1,1],canvasRect:[0,0,1,1]},quad:mt,gl:k(this,Ct,`f`),createRenderTarget:e=>k(this,xt,`m`,Nt).call(this,e),wrapTexture:(e,t)=>k(this,xt,`m`,Pt).call(this,e,t),draw:e=>k(this,xt,`m`,It).call(this,e),onContextRestored:e=>{let t=k(this,St,`f`).onContextRestored(e);return k(this,At,`f`).push(t),t}};O(this,j,a,`f`)}get ctx(){return k(this,j,`f`)}setPhase(e){O(this,jt,e,`f`)}setFrameDims(e){O(this,A,e,`f`),k(this,j,`f`).resolution=[e.canvasBufferSize[0],e.canvasBufferSize[1]];for(let t of k(this,kt,`f`))t.resolver.resize?.(e.outputBufferW,e.outputBufferH)}setEffectDims(e){k(this,j,`f`).dims=e}setFrameState(e){let t=k(this,j,`f`);t.time=e.time,t.deltaTime=e.deltaTime,t.mouse=e.mouse,t.mouseViewport=e.mouseViewport,t.intersection=e.intersection,t.enterTime=e.enterTime,t.leaveTime=e.leaveTime,t.uniforms=e.uniforms}setSrc(e){k(this,j,`f`).src=e}setOutput(e){k(this,j,`f`).target=e}passthroughCopy(e,t,n){let r=k(this,jt,`f`);O(this,jt,`render`,`f`);let i=k(this,j,`f`).target;k(this,j,`f`).target=t;try{let r=k(this,A,`f`).outputViewport;k(this,A,`f`).outputViewport={...n};let i=k(this,j,`f`).vfxProps.glslVersion===`100`?Kt:Gt;k(this,xt,`m`,Lt).call(this,{frag:i,uniforms:{src:e},target:t}),k(this,A,`f`).outputViewport=r}finally{k(this,j,`f`).target=i,O(this,jt,r,`f`)}}clearRt(e){let t=k(this,Ct,`f`),n=Ht(e);t.bindFramebuffer(t.FRAMEBUFFER,n.getWriteFbo().fbo),t.viewport(0,0,e.width,e.height),t.clearColor(0,0,0,0),t.disable(t.SCISSOR_TEST),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)}tickAutoUpdates(){for(let e of k(this,Ft,`f`))e()}dispose(){O(this,jt,`disposed`,`f`);for(let e of k(this,At,`f`))e();O(this,At,[],`f`);for(let e of k(this,Ot,`f`))e.resolver.dispose?.();O(this,Ot,[],`f`),O(this,kt,[],`f`);for(let e of k(this,Dt,`f`))e.dispose();O(this,Dt,[],`f`);for(let e of k(this,Tt,`f`).values())e.dispose();k(this,Tt,`f`).clear(),k(this,Et,`f`).dispose(),O(this,Ft,[],`f`)}};St=new WeakMap,Ct=new WeakMap,wt=new WeakMap,Tt=new WeakMap,Et=new WeakMap,Dt=new WeakMap,Ot=new WeakMap,kt=new WeakMap,At=new WeakMap,jt=new WeakMap,Mt=new WeakMap,A=new WeakMap,j=new WeakMap,Ft=new WeakMap,xt=new WeakSet,Nt=function(e){let t=e?.persistent??!1,n=e?.float??!1,r=Yt(e?.wrap),i=e?.filter,a=e?.size,o=a?a[0]:k(this,A,`f`).outputBufferW,s=a?a[1]:k(this,A,`f`).outputBufferH,c,l,u;if(t){let e=a?1:k(this,wt,`f`),t=a?o:o/e,d=a?s:s/e,f=new De(k(this,St,`f`),t,d,e,n,{wrap:r,filter:i});c={getReadTexture:()=>f.texture,getWriteFbo:()=>f.target,swap:()=>f.swap(),resize:a?void 0:(e,t)=>{f.resize(e/k(this,wt,`f`),t/k(this,wt,`f`))},dispose:()=>f.dispose()},l=()=>f.target.width,u=()=>f.target.height}else{let e=new ye(k(this,St,`f`),o,s,{float:n,wrap:r,filter:i});c={getReadTexture:()=>e.texture,getWriteFbo:()=>e,resize:a?void 0:(t,n)=>e.setSize(t,n),dispose:()=>e.dispose()},l=()=>e.width,u=()=>e.height}let d=Qt(c,l,u),f={handle:d,resolver:c};return k(this,Ot,`f`).push(f),a||k(this,kt,`f`).push(f),d},Pt=function(e,t){let n=Yt(t?.wrap),r=t?.filter,i,a,o,s=null;if(Jt(e)){if(!t?.size)throw Error(`[VFX-JS] wrapTexture(WebGLTexture) requires opts.size`);let[n,r]=t.size;i=new C(k(this,St,`f`),void 0,{autoRegister:!1,externalHandle:e}),a=()=>n,o=()=>r}else{let n=e;i=new C(k(this,St,`f`),n);let r=t?.size,c=e=>{if(r)return e===`w`?r[0]:r[1];if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return e===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return e===`w`?n.videoWidth:n.videoHeight;let t=n;return e===`w`?t.width:t.height};a=()=>c(`w`),o=()=>c(`h`);let l=typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement||typeof HTMLCanvasElement<`u`&&n instanceof HTMLCanvasElement||typeof OffscreenCanvas<`u`&&n instanceof OffscreenCanvas;(t?.autoUpdate??l)&&(s=()=>{i.needsUpdate=!0})}return i.wrapS=n[0],i.wrapT=n[1],r!==void 0&&(i.minFilter=r,i.magFilter=r),k(this,Dt,`f`).push(i),s&&k(this,Ft,`f`).push(s),Zt(()=>i,a,o)},It=function(e){if(k(this,jt,`f`)!==`render`){k(this,jt,`f`)===`update`&&!k(this,Mt,`f`)&&(O(this,Mt,!0,`f`),console.warn(`[VFX-JS] ctx.draw() called in update(); ignored. Move draws to render().`));return}k(this,xt,`m`,Lt).call(this,e)},Lt=function(e){let t=k(this,Ct,`f`),n=e.vert??(k(this,j,`f`).vfxProps.glslVersion===`100`?Wt:Ut),r=`${e.frag} ${n}`,i=k(this,Tt,`f`).get(r);i||(i=new Be(k(this,St,`f`),n,e.frag,k(this,j,`f`).vfxProps.glslVersion),k(this,Tt,`f`).set(r,i));let a=k(this,j,`f`).target,o=e.target===void 0||e.target===null?a:e.target,s=o===null||o===a,c,l,u,d,f,p;if(o===null)c=null,l=k(this,A,`f`).outputViewport.x,u=k(this,A,`f`).outputViewport.y,d=k(this,A,`f`).outputViewport.w,f=k(this,A,`f`).outputViewport.h;else{let e=Ht(o);c=e.getWriteFbo().fbo,s?(l=k(this,A,`f`).outputViewport.x,u=k(this,A,`f`).outputViewport.y,d=k(this,A,`f`).outputViewport.w,f=k(this,A,`f`).outputViewport.h):(l=0,u=0,d=o.width,f=o.height),p=e.swap}t.bindFramebuffer(t.FRAMEBUFFER,c),t.viewport(l,u,d,f),t.disable(t.SCISSOR_TEST),Je(t,e.blend??(o===null?`premultiplied`:`none`)),i.use();let m=k(this,xt,`m`,Rt).call(this,e.uniforms);i.uploadUniforms(m);let h=e.geometry??mt;ht(h)?k(this,Et,`f`).quad.draw():k(this,Et,`f`).resolve(h,i).draw(),p&&p()},Rt=function(e){let t={};if(t.contentRectUv={value:k(this,A,`f`).contentRectUv},t.srcRectUv={value:k(this,A,`f`).srcRectUv},!e)return t;for(let[n,r]of Object.entries(e))t[n]=Xt(r);return t};function Jt(e){let t=globalThis.WebGLTexture;if(t&&typeof t==`function`&&e instanceof t)return!0;let n=e;return n.width===void 0&&n.naturalWidth===void 0&&n.videoWidth===void 0}function Yt(e){return e===void 0?[`clamp`,`clamp`]:typeof e==`string`?[e,e]:[e[0],e[1]]}function Xt(e){return typeof e==`object`&&e&&`__brand`in e?e.__brand===`EffectRenderTarget`?{value:Ht(e).getReadTexture()}:{value:Vt(e)}:{value:e}}function Zt(e,t,n){let r={__brand:`EffectTexture`,get width(){return t()},get height(){return n()}};return Object.defineProperty(r,zt,{value:e}),r}function Qt(e,t,n){let r={__brand:`EffectRenderTarget`,get width(){return t()},get height(){return n()}};return Object.defineProperty(r,Bt,{value:e}),r}function $t(e){return Qt({getReadTexture:()=>e.texture,getWriteFbo:()=>e},()=>e.width,()=>e.height)}function en(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:Array.isArray(e)?{top:e[0],right:e[1],bottom:e[2],left:e[3]}:{top:e.top??0,right:e.right??0,bottom:e.bottom??0,left:e.left??0}}function tn(e){return en(e)}var nn={top:0,right:0,bottom:0,left:0};function rn(e){return en(e)}function an(e){return{top:e.top,right:e.right,bottom:e.bottom,left:e.left}}function on(e,t){return{top:e.top-t.top,right:e.right+t.right,bottom:e.bottom+t.bottom,left:e.left-t.left}}function sn(e,t,n){return Math.min(Math.max(e,t),n)}function cn(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return c<=0||l<=0?[0,0,1,1]:[(n-o)/c,(r-s)/l,i/c,a/l]}function ln(e,t){let n=sn(t.left,e.left,e.right),r=(sn(t.right,e.left,e.right)-n)/(t.right-t.left),i=sn(t.top,e.top,e.bottom);return r*((sn(t.bottom,e.top,e.bottom)-i)/(t.bottom-t.top))}var M=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},N=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},P,un,F,I,dn,fn,pn,mn,hn,gn,_n,vn,yn,bn,xn,Sn,Cn,wn,Tn,En,Dn,On=class{constructor(e,t,n,r,i,a,o){P.add(this),un.set(this,void 0),F.set(this,void 0),I.set(this,void 0),dn.set(this,void 0),fn.set(this,[]),pn.set(this,[]),mn.set(this,void 0),hn.set(this,new Set),gn.set(this,!1),_n.set(this,void 0),vn.set(this,tn(0)),yn.set(this,null),M(this,un,e,`f`),M(this,F,r,`f`),M(this,mn,a,`f`),M(this,_n,o,`f`),M(this,I,r.map(()=>new qt(e,t,n,a,i)),`f`),r.length===0&&M(this,yn,new qt(e,t,n,a,i),`f`),M(this,dn,r.map((e,t)=>typeof e.render==`function`?t:-1).filter(e=>e>=0),`f`)}get effects(){return N(this,F,`f`)}get hosts(){return N(this,I,`f`)}get renderingIndices(){return N(this,dn,`f`)}get stages(){return N(this,pn,`f`)}get hitTestPadBuffer(){return N(this,vn,`f`)}async initAll(){for(let e=0;e<N(this,F,`f`).length;e++){let t=N(this,F,`f`)[e],n=N(this,I,`f`)[e];n.setPhase(`init`);try{t.init&&await t.init(n.ctx)}catch(t){console.error(`[VFX-JS] effect[${e}].init() failed:`,t);for(let t=e-1;t>=0;t--)N(this,P,`m`,bn).call(this,t),N(this,I,`f`)[t].dispose();throw N(this,I,`f`)[e].dispose(),t}n.setPhase(`update`)}}run(e){if(N(this,gn,`f`)||!e.isVisible)return;let t=N(this,dn,`f`).length;for(let t of N(this,I,`f`))t.setFrameState({time:e.time,deltaTime:e.deltaTime,mouse:e.mouse,mouseViewport:e.mouseViewport,intersection:e.intersection,enterTime:e.enterTime,leaveTime:e.leaveTime,uniforms:e.resolvedUniforms});N(this,P,`m`,xn).call(this,e);for(let t=0;t<N(this,I,`f`).length;t++)N(this,I,`f`)[t].setFrameDims(N(this,P,`m`,Dn).call(this,t,e)),N(this,I,`f`)[t].setEffectDims(N(this,P,`m`,wn).call(this,t,e));for(let e=0;e<N(this,F,`f`).length;e++){let t=N(this,F,`f`)[e];if(!t.update)continue;let n=N(this,I,`f`)[e];n.setPhase(`update`);try{t.update(n.ctx)}catch(t){let n=`${e}:update`;N(this,hn,`f`).has(n)||(N(this,hn,`f`).add(n),console.warn(`[VFX-JS] effect[${e}].update() threw; skipping this frame's update:`,t))}}if(t===0){(N(this,yn,`f`)??N(this,I,`f`)[0]).passthroughCopy(N(this,mn,`f`),e.finalTarget,e.elementRectOnCanvasPx);return}for(let n=0;n<t;n++){let r=N(this,dn,`f`)[n],i=N(this,I,`f`)[r],a=N(this,F,`f`)[r];if(!a.render)continue;i.setPhase(`render`),i.tickAutoUpdates();let o=n===0?N(this,mn,`f`):N(this,fn,`f`)[n-1].texHandle;i.setSrc(o);let s;n===t-1?s=e.finalTarget:(s=N(this,fn,`f`)[n].rtHandle,i.clearRt(s)),i.setOutput(s);try{a.render(i.ctx)}catch(e){let a=`${r}:render`;N(this,hn,`f`).has(a)||(N(this,hn,`f`).add(a),console.warn(`[VFX-JS] effect[${r}].render() threw; falling back to passthrough:`,e));let c=N(this,pn,`f`)[n].outputViewport;s===null?i.passthroughCopy(o,null,c):n===t-1?i.passthroughCopy(o,s,c):i.passthroughCopy(o,s,{x:0,y:0,w:s.width,h:s.height})}i.setPhase(`update`)}}dispose(){if(!N(this,gn,`f`)){M(this,gn,!0,`f`);for(let e=N(this,F,`f`).length-1;e>=0;e--)N(this,P,`m`,bn).call(this,e),N(this,I,`f`)[e].dispose();N(this,yn,`f`)&&(N(this,yn,`f`).dispose(),M(this,yn,null,`f`));for(let e of N(this,fn,`f`))e.fb.dispose();M(this,fn,[],`f`),M(this,pn,[],`f`)}}};un=new WeakMap,F=new WeakMap,I=new WeakMap,dn=new WeakMap,fn=new WeakMap,pn=new WeakMap,mn=new WeakMap,hn=new WeakMap,gn=new WeakMap,_n=new WeakMap,vn=new WeakMap,yn=new WeakMap,P=new WeakSet,bn=function(e){let t=N(this,F,`f`)[e];if(t.dispose)try{t.dispose()}catch(t){console.error(`[VFX-JS] effect[${e}].dispose() threw:`,t)}},xn=function(e){let t=N(this,dn,`f`).length;if(M(this,pn,Array(t),`f`),t===0)return;let n=N(this,_n,`f`)?e.canvasBufferSize:e.elementBufferSize,r=[0,0,n[0],n[1]],i=N(this,P,`m`,En).call(this,e),a=r;for(let n=0;n<t;n++){let o=N(this,dn,`f`)[n],s=N(this,F,`f`)[o],c=n===t-1,l=N(this,P,`m`,Sn).call(this,s,a,r,i,e)??a,u=[l[2],l[3]],d=cn(r,l),f=c?{x:e.elementRectOnCanvasPx.x+l[0],y:e.elementRectOnCanvasPx.y+l[1],w:u[0],h:u[1]}:{x:0,y:0,w:u[0],h:u[1]};N(this,pn,`f`)[n]={dstRect:l,dstBufferSize:u,contentRectUv:d,outputViewport:f},c||N(this,P,`m`,Tn).call(this,n,u),a=l}let[o,s,c,l]=N(this,pn,`f`)[t-1].dstRect;M(this,vn,tn({top:Math.max(0,s+l-n[1]),right:Math.max(0,o+c-n[0]),bottom:Math.max(0,-s),left:Math.max(0,-o)}),`f`)},Sn=function(e,t,n,r,i){if(e.outputRect)return e.outputRect(N(this,P,`m`,Cn).call(this,i,n,t,r))},Cn=function(e,t,n,r){let i=e.canvasBufferSize[0]/e.canvasSize[0]||1;return{element:N(this,_n,`f`)?e.canvasSize:e.elementSize,elementPixel:N(this,_n,`f`)?e.canvasBufferSize:e.elementBufferSize,canvas:e.canvasSize,canvasPixel:e.canvasBufferSize,pixelRatio:i,contentRect:t,srcRect:n,canvasRect:r}},wn=function(e,t){let n=N(this,_n,`f`)?t.canvasBufferSize:t.elementBufferSize,r=[0,0,n[0],n[1]],i=N(this,P,`m`,En).call(this,t),a=N(this,dn,`f`).indexOf(e),o=a<=0?r:N(this,pn,`f`)[a-1].dstRect;return N(this,P,`m`,Cn).call(this,t,r,o,i)},Tn=function(e,t){let n=N(this,fn,`f`)[e];if(n&&n.fb.width===t[0]&&n.fb.height===t[1])return;n&&n.fb.dispose();let r=new ye(N(this,un,`f`),t[0],t[1]),i=$t(r),a=Zt(()=>r.texture,()=>r.width,()=>r.height);N(this,fn,`f`)[e]={fb:r,rtHandle:i,texHandle:a,bufferSize:t}},En=function(e){let[t,n]=e.canvasBufferSize;if(N(this,_n,`f`))return[0,0,t,n];let{x:r,y:i}=e.elementRectOnCanvasPx;return[-r,-i,t,n]},Dn=function(e,t){let n=N(this,dn,`f`).indexOf(e),r,i,a,o,s;if(n<0)r=t.elementBufferSize[0],i=t.elementBufferSize[1],a={x:0,y:0,w:r,h:i},o=[0,0,1,1],s=[0,0,1,1];else{let e=N(this,pn,`f`)[n];r=e.dstBufferSize[0],i=e.dstBufferSize[1],a=e.outputViewport,o=e.contentRectUv,s=n===0?[0,0,1,1]:N(this,pn,`f`)[n-1].contentRectUv}return{outputBufferW:r,outputBufferH:i,canvasBufferSize:t.canvasBufferSize,outputViewport:a,elementBufferW:t.elementBufferSize[0],elementBufferH:t.elementBufferSize[1],contentRectUv:o,srcRectUv:s}};function kn(e){this.data=e,this.pos=0}kn.prototype.readByte=function(){return this.data[this.pos++]},kn.prototype.peekByte=function(){return this.data[this.pos]},kn.prototype.readBytes=function(e){return this.data.subarray(this.pos,this.pos+=e)},kn.prototype.peekBytes=function(e){return this.data.subarray(this.pos,this.pos+e)},kn.prototype.readString=function(e){for(var t=``,n=0;n<e;n++)t+=String.fromCharCode(this.readByte());return t},kn.prototype.readBitArray=function(){for(var e=[],t=this.readByte(),n=7;n>=0;n--)e.push(!!(t&1<<n));return e},kn.prototype.readUnsigned=function(e){var t=this.readBytes(2);return e?(t[1]<<8)+t[0]:(t[0]<<8)+t[1]};function An(e){this.stream=new kn(e),this.output={}}An.prototype.parse=function(e){return this.parseParts(this.output,e),this.output},An.prototype.parseParts=function(e,t){for(var n=0;n<t.length;n++){var r=t[n];this.parsePart(e,r)}},An.prototype.parsePart=function(e,t){var n=t.label,r;if(!(t.requires&&!t.requires(this.stream,this.output,e)))if(t.loop){for(var i=[];t.loop(this.stream);){var a={};this.parseParts(a,t.parts),i.push(a)}e[n]=i}else t.parts?(r={},this.parseParts(r,t.parts),e[n]=r):t.parser?(r=t.parser(this.stream,this.output,e),t.skip||(e[n]=r)):t.bits&&(e[n]=this.parseBits(t.bits))};function jn(e){return e.reduce(function(e,t){return e*2+t},0)}An.prototype.parseBits=function(e){var t={},n=this.stream.readBitArray();for(var r in e){var i=e[r];i.length?t[r]=jn(n.slice(i.index,i.index+i.length)):t[r]=n[i.index]}return t};var L={readByte:function(){return function(e){return e.readByte()}},readBytes:function(e){return function(t){return t.readBytes(e)}},readString:function(e){return function(t){return t.readString(e)}},readUnsigned:function(e){return function(t){return t.readUnsigned(e)}},readArray:function(e,t){return function(n,r,i){for(var a=t(n,r,i),o=Array(a),s=0;s<a;s++)o[s]=n.readBytes(e);return o}}},Mn={label:`blocks`,parser:function(e){for(var t=[],n=0,r=0,i=e.readByte();i!==r;i=e.readByte())t.push(e.readBytes(i)),n+=i;var a=new Uint8Array(n);n=0;for(var o=0;o<t.length;o++)a.set(t[o],n),n+=t[o].length;return a}},Nn={label:`gce`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===249},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`byteSize`,parser:L.readByte()},{label:`extras`,bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:`delay`,parser:L.readUnsigned(!0)},{label:`transparentColorIndex`,parser:L.readByte()},{label:`terminator`,parser:L.readByte(),skip:!0}]},Pn={label:`image`,requires:function(e){return e.peekByte()===44},parts:[{label:`code`,parser:L.readByte(),skip:!0},{label:`descriptor`,parts:[{label:`left`,parser:L.readUnsigned(!0)},{label:`top`,parser:L.readUnsigned(!0)},{label:`width`,parser:L.readUnsigned(!0)},{label:`height`,parser:L.readUnsigned(!0)},{label:`lct`,bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:`lct`,requires:function(e,t,n){return n.descriptor.lct.exists},parser:L.readArray(3,function(e,t,n){return 2**(n.descriptor.lct.size+1)})},{label:`data`,parts:[{label:`minCodeSize`,parser:L.readByte()},Mn]}]},Fn={label:`text`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===1},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`blockSize`,parser:L.readByte()},{label:`preData`,parser:function(e,t,n){return e.readBytes(n.text.blockSize)}},Mn]},In={label:`frames`,parts:[Nn,{label:`application`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===255},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`blockSize`,parser:L.readByte()},{label:`id`,parser:function(e,t,n){return e.readString(n.blockSize)}},Mn]},{label:`comment`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===254},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},Mn]},Pn,Fn],loop:function(e){var t=e.peekByte();return t===33||t===44}},Ln=[{label:`header`,parts:[{label:`signature`,parser:L.readString(3)},{label:`version`,parser:L.readString(3)}]},{label:`lsd`,parts:[{label:`width`,parser:L.readUnsigned(!0)},{label:`height`,parser:L.readUnsigned(!0)},{label:`gct`,bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:`backgroundColorIndex`,parser:L.readByte()},{label:`pixelAspectRatio`,parser:L.readByte()}]},{label:`gct`,requires:function(e,t){return t.lsd.gct.exists},parser:L.readArray(3,function(e,t){return 2**(t.lsd.gct.size+1)})},In];function Rn(e){this.raw=new An(new Uint8Array(e)).parse(Ln),this.raw.hasImages=!1;for(var t=0;t<this.raw.frames.length;t++)if(this.raw.frames[t].image){this.raw.hasImages=!0;break}}Rn.prototype.decompressFrame=function(e,t){if(e>=this.raw.frames.length)return null;var n=this.raw.frames[e];if(n.image){var r=n.image.descriptor.width*n.image.descriptor.height,i=o(n.image.data.minCodeSize,n.image.data.blocks,r);n.image.descriptor.lct.interlaced&&(i=s(i,n.image.descriptor.width));var a={pixels:i,dims:{top:n.image.descriptor.top,left:n.image.descriptor.left,width:n.image.descriptor.width,height:n.image.descriptor.height}};return n.image.descriptor.lct&&n.image.descriptor.lct.exists?a.colorTable=n.image.lct:a.colorTable=this.raw.gct,n.gce&&(a.delay=(n.gce.delay||10)*10,a.disposalType=n.gce.extras.disposal,n.gce.extras.transparentColorGiven&&(a.transparentIndex=n.gce.transparentColorIndex)),t&&(a.patch=c(a)),a}return null;function o(e,t,n){var r=4096,i=-1,a=n,o,s,c,l,u,d,f,p,m,h,g,_,v,y,ee,b,te=Array(n),ne=Array(r),x=Array(r),S=Array(r+1);for(_=e,s=1<<_,u=s+1,o=s+2,f=i,l=_+1,c=(1<<l)-1,m=0;m<s;m++)ne[m]=0,x[m]=m;for(g=p=v=y=b=ee=0,h=0;h<a;){if(y===0){if(p<l){g+=t[ee]<<p,p+=8,ee++;continue}if(m=g&c,g>>=l,p-=l,m>o||m==u)break;if(m==s){l=_+1,c=(1<<l)-1,o=s+2,f=i;continue}if(f==i){S[y++]=x[m],f=m,v=m;continue}for(d=m,m==o&&(S[y++]=v,m=f);m>s;)S[y++]=x[m],m=ne[m];v=x[m]&255,S[y++]=v,o<r&&(ne[o]=f,x[o]=v,o++,(o&c)===0&&o<r&&(l++,c+=o)),f=d}y--,te[b++]=S[y],h++}for(h=b;h<a;h++)te[h]=0;return te}function s(e,t){for(var n=Array(e.length),r=e.length/t,i=function(r,i){var a=e.slice(i*t,(i+1)*t);n.splice.apply(n,[r*t,t].concat(a))},a=[0,4,2,1],o=[8,8,4,2],s=0,c=0;c<4;c++)for(var l=a[c];l<r;l+=o[c])i(l,s),s++;return n}function c(e){for(var t=e.pixels.length,n=new Uint8ClampedArray(t*4),r=0;r<t;r++){var i=r*4,a=e.pixels[r],o=e.colorTable[a];n[i]=o[0],n[i+1]=o[1],n[i+2]=o[2],n[i+3]=a===e.transparentIndex?0:255}return n}},Rn.prototype.decompressFrames=function(e,t,n){t===void 0&&(t=0),n=n===void 0?this.raw.frames.length:Math.min(n,this.raw.frames.length);for(var r=[],i=t;i<n;i++)this.raw.frames[i].image&&r.push(this.decompressFrame(i,e));return r};var zn=Rn,Bn=class e{static async create(t,n){let r=await fetch(t).then(e=>e.arrayBuffer()).then(e=>new zn(e)),i=r.decompressFrames(!0,void 0,void 0),{width:a,height:o}=r.raw.lsd;return new e(i,a,o,n)}constructor(e,t,n,r){this.frames=[],this.index=0,this.playTime=0,this.frames=e,this.canvas=document.createElement(`canvas`),this.ctx=this.canvas.getContext(`2d`),this.pixelRatio=r,this.canvas.width=t,this.canvas.height=n,this.startTime=Date.now()}getCanvas(){return this.canvas}update(){let e=Date.now()-this.startTime;for(;this.playTime<e;){let e=this.frames[this.index%this.frames.length];this.playTime+=e.delay,this.index++}let t=this.frames[this.index%this.frames.length],n=new ImageData(t.patch,t.dims.width,t.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(n,t.dims.left,t.dims.top)}},Vn=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Hn,Un,Wn,Gn,Kn,qn=class{constructor(e){this.isContextLost=!1,Hn.set(this,new Set),Un.set(this,new Set),Wn.set(this,new Set),Gn.set(this,e=>{e.preventDefault(),this.isContextLost=!0;for(let e of Vn(this,Un,`f`))e()}),Kn.set(this,()=>{this.isContextLost=!1;let e=this.gl;e.getExtension(`EXT_color_buffer_float`),e.getExtension(`EXT_color_buffer_half_float`);for(let e of Vn(this,Hn,`f`))e.restore();for(let e of Vn(this,Wn,`f`))e()});let t=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1});if(!t)throw Error(`[VFX-JS] WebGL2 is not available.`);this.gl=t,this.canvas=e,t.getExtension(`EXT_color_buffer_float`),t.getExtension(`EXT_color_buffer_half_float`),this.floatLinearFilter=!!t.getExtension(`OES_texture_float_linear`),this.maxTextureSize=t.getParameter(t.MAX_TEXTURE_SIZE),e.addEventListener(`webglcontextlost`,Vn(this,Gn,`f`),!1),e.addEventListener(`webglcontextrestored`,Vn(this,Kn,`f`),!1)}setSize(e,t,n){let r=Math.floor(e*n),i=Math.floor(t*n);(this.canvas.width!==r||this.canvas.height!==i)&&(this.canvas.width=r,this.canvas.height=i)}addResource(e){Vn(this,Hn,`f`).add(e)}removeResource(e){Vn(this,Hn,`f`).delete(e)}onContextLost(e){return Vn(this,Un,`f`).add(e),()=>Vn(this,Un,`f`).delete(e)}onContextRestored(e){return Vn(this,Wn,`f`).add(e),()=>Vn(this,Wn,`f`).delete(e)}};Hn=new WeakMap,Un=new WeakMap,Wn=new WeakMap,Gn=new WeakMap,Kn=new WeakMap;var Jn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Yn=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Xn,Zn,Qn,$n,er=class{constructor(e){Xn.add(this),Zn.set(this,void 0),Qn.set(this,void 0),Jn(this,Zn,e,`f`),this.gl=e.gl,Yn(this,Xn,`m`,$n).call(this),e.addResource(this)}restore(){Yn(this,Xn,`m`,$n).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){Yn(this,Zn,`f`).removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(Yn(this,Qn,`f`))}};Zn=new WeakMap,Qn=new WeakMap,Xn=new WeakSet,$n=function(){let e=this.gl,t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw Error(`[VFX-JS] Failed to create quad VAO`);this.vao=t,Jn(this,Qn,n,`f`);let r=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)};function tr(e,t,n,r={}){return new ye(e,t,n,{float:r.float??!1})}function nr(n,r){let i=r.renderingToBuffer??!1,a;a=i?`none`:r.premultipliedAlpha?`premultiplied`:`normal`;let o=r.glslVersion??ze(r.fragmentShader);return new Ke(n,r.vertexShader??(o===`100`?t:e),r.fragmentShader,r.uniforms,a,o)}var rr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},R=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},z,ir,ar,or,sr,cr,lr=class{constructor(e,t,n,r,i,a,o,s){if(z.set(this,void 0),ir.set(this,void 0),ar.set(this,void 0),or.set(this,void 0),sr.set(this,void 0),cr.set(this,void 0),rr(this,or,r??!1,`f`),rr(this,sr,i??!1,`f`),rr(this,cr,a,`f`),rr(this,ir,{},`f`),rr(this,z,{src:{value:null},offset:{value:new Oe},resolution:{value:new Oe},viewport:{value:new ke},time:{value:0},mouse:{value:new Oe},passIndex:{value:0}},`f`),n)for(let[e,t]of Object.entries(n))typeof t==`function`?(R(this,ir,`f`)[e]=t,R(this,z,`f`)[e]={value:t()}):R(this,z,`f`)[e]={value:t};this.pass=nr(e,{fragmentShader:t,uniforms:R(this,z,`f`),renderingToBuffer:o??!1,premultipliedAlpha:!0,glslVersion:s})}get uniforms(){return R(this,z,`f`)}setUniforms(e,t,n,r,i,a){R(this,z,`f`).src.value=e,R(this,z,`f`).resolution.value.set(n.w*t,n.h*t),R(this,z,`f`).offset.value.set(n.x*t,n.y*t),R(this,z,`f`).time.value=r,R(this,z,`f`).mouse.value.set(i*t,a*t)}updateCustomUniforms(e){for(let[e,t]of Object.entries(R(this,ir,`f`)))R(this,z,`f`)[e]&&(R(this,z,`f`)[e].value=t());if(e)for(let[t,n]of Object.entries(e))R(this,z,`f`)[t]&&(R(this,z,`f`)[t].value=n())}initializeBackbuffer(e,t,n,r){R(this,or,`f`)&&!R(this,ar,`f`)&&(R(this,cr,`f`)?rr(this,ar,new De(e,R(this,cr,`f`)[0],R(this,cr,`f`)[1],1,R(this,sr,`f`)),`f`):rr(this,ar,new De(e,t,n,r,R(this,sr,`f`)),`f`))}resizeBackbuffer(e,t){R(this,ar,`f`)&&!R(this,cr,`f`)&&R(this,ar,`f`).resize(e,t)}registerBufferUniform(e){R(this,z,`f`)[e]||(R(this,z,`f`)[e]={value:null})}get backbuffer(){return R(this,ar,`f`)}get persistent(){return R(this,or,`f`)}get float(){return R(this,sr,`f`)}get size(){return R(this,cr,`f`)}dispose(){this.pass.dispose(),R(this,ar,`f`)?.dispose()}};z=new WeakMap,ir=new WeakMap,ar=new WeakMap,or=new WeakMap,sr=new WeakMap,cr=new WeakMap;var B=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},V=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},H,ur,dr,U,fr,pr,W,G,K,mr,q,hr,gr,_r,vr,yr,br,J,Y,xr,X,Sr,Cr,wr,Tr,Er,Dr,Or,kr,Ar,jr,Mr,Nr,Pr,Fr,Ir,Lr,Rr,zr,Br,Vr,Hr,Z,Ur,Wr,Gr,Kr,qr,Jr,Yr=new Map,Xr=class{constructor(e,t){H.add(this),ur.set(this,void 0),dr.set(this,void 0),U.set(this,void 0),fr.set(this,void 0),pr.set(this,void 0),W.set(this,void 0),G.set(this,[]),K.set(this,void 0),mr.set(this,new Map),q.set(this,null),hr.set(this,!1),gr.set(this,new WeakSet),_r.set(this,{}),vr.set(this,{}),yr.set(this,0),br.set(this,void 0),J.set(this,2),Y.set(this,[]),xr.set(this,Date.now()/1e3),X.set(this,rn(0)),Sr.set(this,rn(0)),Cr.set(this,[0,0]),wr.set(this,0),Tr.set(this,0),Er.set(this,0),Dr.set(this,0),Or.set(this,new WeakMap),Ar.set(this,async()=>{if(typeof window<`u`){for(let e of V(this,Y,`f`))if(e.type===`text`&&e.isInViewport){let t=e.element.getBoundingClientRect();(t.width!==e.width||t.height!==e.height)&&(await V(this,H,`m`,Mr).call(this,e),e.width=t.width,e.height=t.height)}for(let e of V(this,Y,`f`))if(e.type===`text`&&!e.isInViewport){let t=e.element.getBoundingClientRect();(t.width!==e.width||t.height!==e.height)&&(await V(this,H,`m`,Mr).call(this,e),e.width=t.width,e.height=t.height)}}}),jr.set(this,e=>{typeof window<`u`&&(B(this,Er,e.clientX,`f`),B(this,Dr,window.innerHeight-e.clientY,`f`))}),Fr.set(this,()=>{this.isPlaying()&&(this.render(),B(this,br,requestAnimationFrame(V(this,Fr,`f`)),`f`))}),B(this,ur,e,`f`),B(this,dr,t,`f`),B(this,U,new qn(t),`f`),B(this,fr,V(this,U,`f`).gl,`f`),V(this,fr,`f`).clearColor(0,0,0,0),B(this,J,e.pixelRatio,`f`),B(this,pr,new er(V(this,U,`f`)),`f`),typeof window<`u`&&(window.addEventListener(`resize`,V(this,Ar,`f`)),window.addEventListener(`pointermove`,V(this,jr,`f`))),V(this,Ar,`f`).call(this),B(this,W,new Ye(V(this,U,`f`)),`f`),V(this,H,`m`,Wr).call(this,e.postEffects),V(this,U,`f`).onContextRestored(()=>{V(this,fr,`f`).clearColor(0,0,0,0)})}destroy(){this.stop(),typeof window<`u`&&(window.removeEventListener(`resize`,V(this,Ar,`f`)),window.removeEventListener(`pointermove`,V(this,jr,`f`))),V(this,K,`f`)?.dispose();for(let e of V(this,mr,`f`).values())e?.dispose();for(let e of V(this,G,`f`))e.pass.dispose();V(this,q,`f`)&&(V(this,q,`f`).dispose(),B(this,q,null,`f`),B(this,hr,!1,`f`)),V(this,W,`f`).dispose(),V(this,pr,`f`).dispose()}async addElement(e,t={},n){if(t.effect!==void 0)return V(this,H,`m`,Nr).call(this,e,t,t.effect,n);let r=V(this,H,`m`,Pr).call(this,t),i=e.getBoundingClientRect(),a=an(i),[o,s]=$r(t.overflow),c=on(a,s),l=ei(t.intersection),u=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),d,f,p=!1;if(e instanceof HTMLImageElement)if(f=`img`,p=!!e.src.match(/\.gif/i),p){let t=await Bn.create(e.src,V(this,J,`f`));Yr.set(e,t),d=new C(V(this,U,`f`),t.getCanvas())}else{let t=await pe(e.src);d=new C(V(this,U,`f`),t)}else if(e instanceof HTMLVideoElement)d=new C(V(this,U,`f`),e),f=`video`;else if(e instanceof HTMLCanvasElement)e.hasAttribute(`layoutsubtree`)&&n?(d=new C(V(this,U,`f`),n),f=`hic`):(d=new C(V(this,U,`f`),e),f=`canvas`);else{let t=await Ze(e,u,void 0,this.maxTextureSize);d=new C(V(this,U,`f`),t),f=`text`}let[m,h]=ri(t.wrap);d.wrapS=m,d.wrapT=h,d.needsUpdate=!0;let g=t.autoCrop??!0;if(f!==`hic`&&t.overlay!==!0)if(typeof t.overlay==`number`)e.style.setProperty(`opacity`,t.overlay.toString());else{let t=f===`video`?`0.0001`:`0`;e.style.setProperty(`opacity`,t.toString())}let _={src:{value:d},resolution:{value:new Oe},offset:{value:new Oe},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},mouse:{value:new Oe},intersection:{value:0},viewport:{value:new ke},autoCrop:{value:g}},v={};if(t.uniforms!==void 0)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(_[e]={value:n()},v[e]=n):_[e]={value:n};let y;t.backbuffer&&(y=(()=>{let e=(c.right-c.left)*V(this,J,`f`),t=(c.bottom-c.top)*V(this,J,`f`);return new De(V(this,U,`f`),e,t,V(this,J,`f`),!1)})(),_.backbuffer={value:y.texture});let ee=new Map,b=new Map;for(let e=0;e<r.length-1;e++){let t=r[e].target??`pass${e}`;r[e]={...r[e],target:t};let n=r[e].size,i=n?n[0]:(c.right-c.left)*V(this,J,`f`),a=n?n[1]:(c.bottom-c.top)*V(this,J,`f`);if(r[e].persistent){let i=n?1:V(this,J,`f`),a=n?n[0]:c.right-c.left,o=n?n[1]:c.bottom-c.top;b.set(t,new De(V(this,U,`f`),a,o,i,r[e].float))}else ee.set(t,tr(V(this,U,`f`),i,a,{float:r[e].float}))}let te=[];for(let e=0;e<r.length;e++){let t=r[e],n=t.frag,i={..._},a={};for(let[e,r]of ee)e!==t.target&&n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:r.texture});for(let[e,t]of b)n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:t.texture});if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(i[e]={value:n()},a[e]=n):i[e]={value:n};let o=nr(V(this,U,`f`),{vertexShader:t.vert,fragmentShader:n,uniforms:i,renderingToBuffer:t.target!==void 0,glslVersion:t.glslVersion});te.push({pass:o,uniforms:i,uniformGenerators:{...v,...a},target:t.target,persistent:t.persistent,float:t.float,size:t.size,backbuffer:t.target?b.get(t.target):void 0})}let ne=Date.now()/1e3,x={type:f,element:e,isInViewport:!1,isInLogicalViewport:!1,width:i.width,height:i.height,passes:te,bufferTargets:ee,startTime:ne,enterTime:ne,leaveTime:-1/0,release:t.release??1/0,isGif:p,isFullScreen:o,overflow:s,intersection:l,originalOpacity:u,srcTexture:d,zIndex:t.zIndex??0,backbuffer:y,autoCrop:g};V(this,H,`m`,Vr).call(this,x,a,ne),V(this,Y,`f`).push(x),V(this,Y,`f`).sort((e,t)=>e.zIndex-t.zIndex)}removeElement(e){let t=V(this,Y,`f`).findIndex(t=>t.element===e);if(t!==-1){let n=V(this,Y,`f`).splice(t,1)[0];if(n.chain)V(this,H,`m`,zr).call(this,n.chain.effects),n.chain.dispose();else{for(let e of n.bufferTargets.values())e.dispose();for(let e of n.passes)e.pass.dispose(),e.backbuffer?.dispose();n.backbuffer?.dispose()}n.srcTexture.dispose(),e.style.setProperty(`opacity`,n.originalOpacity.toString())}}updateTextElement(e){let t=V(this,Y,`f`).findIndex(t=>t.element===e);return t===-1?Promise.resolve():V(this,H,`m`,Mr).call(this,V(this,Y,`f`)[t])}updateCanvasElement(e){let t=V(this,Y,`f`).find(t=>t.element===e);if(t){let n=t.srcTexture,r=new C(V(this,U,`f`),e);r.wrapS=n.wrapS,r.wrapT=n.wrapT,r.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=r),t.srcTexture=r,n.dispose()}}updateHICTexture(e,t){let n=V(this,Y,`f`).find(t=>t.element===e);if(!n||n.type!==`hic`)return;let r=n.srcTexture;if(r.source===t)r.needsUpdate=!0;else{let e=new C(V(this,U,`f`),t);e.wrapS=r.wrapS,e.wrapT=r.wrapT,e.needsUpdate=!0,!n.chain&&n.passes.length>0&&(n.passes[0].uniforms.src.value=e),n.srcTexture=e,r.dispose()}}get maxTextureSize(){return V(this,U,`f`).maxTextureSize}isPlaying(){return V(this,br,`f`)!==void 0}play(){this.isPlaying()||B(this,br,requestAnimationFrame(V(this,Fr,`f`)),`f`)}stop(){V(this,br,`f`)!==void 0&&(cancelAnimationFrame(V(this,br,`f`)),B(this,br,void 0,`f`))}render(){let e=Date.now()/1e3,t=V(this,fr,`f`);V(this,H,`m`,kr).call(this),t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,V(this,dr,`f`).width,V(this,dr,`f`).height),t.clear(t.COLOR_BUFFER_BIT);let n=V(this,X,`f`).right-V(this,X,`f`).left,r=V(this,X,`f`).bottom-V(this,X,`f`).top,i=Se(0,0,n,r),a=V(this,H,`m`,Lr).call(this);a&&(V(this,H,`m`,Jr).call(this,n,r),V(this,K,`f`)&&(t.bindFramebuffer(t.FRAMEBUFFER,V(this,K,`f`).fbo),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)));for(let t of V(this,Y,`f`)){let o=t.element.getBoundingClientRect(),s=an(o),c=V(this,H,`m`,Vr).call(this,t,s,e);if(!c.isVisible)continue;if(t.chain){V(this,H,`m`,Ir).call(this,t,s,c,e);continue}let l=t.passes[0].uniforms;l.time.value=e-t.startTime,l.resolution.value.set(o.width*V(this,J,`f`),o.height*V(this,J,`f`)),l.mouse.value.set((V(this,Er,`f`)+V(this,wr,`f`))*V(this,J,`f`),(V(this,Dr,`f`)+V(this,Tr,`f`))*V(this,J,`f`));for(let e of t.passes)for(let[t,n]of Object.entries(e.uniformGenerators))e.uniforms[t].value=n();Yr.get(t.element)?.update(),(t.type===`video`||t.isGif)&&(l.src.value.needsUpdate=!0);let u=xe(s,r,V(this,wr,`f`),V(this,Tr,`f`)),d=xe(c.rectWithOverflow,r,V(this,wr,`f`),V(this,Tr,`f`));t.backbuffer&&(t.passes[0].uniforms.backbuffer.value=t.backbuffer.texture);{let e=t.isFullScreen?i:d,n=Math.max(1,e.w*V(this,J,`f`)),r=Math.max(1,e.h*V(this,J,`f`)),a=Math.max(1,e.w),o=Math.max(1,e.h);for(let e=0;e<t.passes.length-1;e++){let i=t.passes[e];if(!i.size)if(i.backbuffer)i.backbuffer.resize(a,o);else{let e=t.bufferTargets.get(i.target);e&&(e.width!==n||e.height!==r)&&e.setSize(n,r)}}}let f=new Map;for(let e of t.passes)e.backbuffer&&e.target&&f.set(e.target,e.backbuffer.texture);let p=t.srcTexture,m=V(this,Er,`f`)+V(this,wr,`f`)-u.x,h=V(this,Dr,`f`)+V(this,Tr,`f`)-u.y;for(let e=0;e<t.passes.length-1;e++){let n=t.passes[e],r=t.isFullScreen?i:d;n.uniforms.src.value=p;for(let[e,t]of f)n.uniforms[e]&&(n.uniforms[e].value=t);for(let[e,t]of Object.entries(n.uniformGenerators))n.uniforms[e]&&(n.uniforms[e].value=t());let a=n.size?n.size[0]:r.w*V(this,J,`f`),o=n.size?n.size[1]:r.h*V(this,J,`f`),s=n.size?Se(0,0,n.size[0],n.size[1]):Se(0,0,r.w,r.h);if(n.uniforms.resolution.value.set(a,o),n.uniforms.offset.value.set(0,0),n.uniforms.mouse.value.set(m/r.w*a,h/r.h*o),n.backbuffer)V(this,H,`m`,Z).call(this,n.pass,n.backbuffer.target,s,n.uniforms,!0),n.backbuffer.swap(),p=n.backbuffer.texture;else{let e=t.bufferTargets.get(n.target);if(!e)continue;V(this,H,`m`,Z).call(this,n.pass,e,s,n.uniforms,!0),p=e.texture}n.target&&f.set(n.target,p)}let g=t.passes[t.passes.length-1];g.uniforms.src.value=p,g.uniforms.resolution.value.set(o.width*V(this,J,`f`),o.height*V(this,J,`f`)),g.uniforms.offset.value.set(u.x*V(this,J,`f`),u.y*V(this,J,`f`)),g.uniforms.mouse.value.set((V(this,Er,`f`)+V(this,wr,`f`))*V(this,J,`f`),(V(this,Dr,`f`)+V(this,Tr,`f`))*V(this,J,`f`));for(let[e,t]of f)g.uniforms[e]&&(g.uniforms[e].value=t);for(let[e,t]of Object.entries(g.uniformGenerators))g.uniforms[e]&&(g.uniforms[e].value=t());t.backbuffer?(g.uniforms.backbuffer.value=t.backbuffer.texture,t.isFullScreen?(t.backbuffer.resize(n,r),V(this,H,`m`,Ur).call(this,t,u.x,u.y),V(this,H,`m`,Z).call(this,g.pass,t.backbuffer.target,i,g.uniforms,!0),t.backbuffer.swap(),V(this,W,`f`).setUniforms(t.backbuffer.texture,V(this,J,`f`),i),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,a&&V(this,K,`f`)||null,i,V(this,W,`f`).uniforms,!1)):(t.backbuffer.resize(d.w,d.h),V(this,H,`m`,Ur).call(this,t,t.overflow.left,t.overflow.bottom),V(this,H,`m`,Z).call(this,g.pass,t.backbuffer.target,t.backbuffer.getViewport(),g.uniforms,!0),t.backbuffer.swap(),V(this,W,`f`).setUniforms(t.backbuffer.texture,V(this,J,`f`),d),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,a&&V(this,K,`f`)||null,d,V(this,W,`f`).uniforms,!1))):(V(this,H,`m`,Ur).call(this,t,u.x,u.y),V(this,H,`m`,Z).call(this,g.pass,a&&V(this,K,`f`)||null,t.isFullScreen?i:d,g.uniforms,!1))}a&&V(this,K,`f`)&&(V(this,q,`f`)&&V(this,hr,`f`)?V(this,H,`m`,Kr).call(this,i,e):V(this,H,`m`,qr).call(this,i,e))}};ur=new WeakMap,dr=new WeakMap,U=new WeakMap,fr=new WeakMap,pr=new WeakMap,W=new WeakMap,G=new WeakMap,K=new WeakMap,mr=new WeakMap,q=new WeakMap,hr=new WeakMap,gr=new WeakMap,_r=new WeakMap,vr=new WeakMap,yr=new WeakMap,br=new WeakMap,J=new WeakMap,Y=new WeakMap,xr=new WeakMap,X=new WeakMap,Sr=new WeakMap,Cr=new WeakMap,wr=new WeakMap,Tr=new WeakMap,Er=new WeakMap,Dr=new WeakMap,Or=new WeakMap,Ar=new WeakMap,jr=new WeakMap,Fr=new WeakMap,H=new WeakSet,kr=function(){if(typeof window>`u`)return;let e=V(this,dr,`f`).ownerDocument,t=e.compatMode===`BackCompat`?e.body:e.documentElement,n=t.clientWidth,r=t.clientHeight,i=window.scrollX,a=window.scrollY,o,s;if(V(this,ur,`f`).fixedCanvas)o=0,s=0;else if(V(this,ur,`f`).wrapper)o=n*V(this,ur,`f`).scrollPadding[0],s=r*V(this,ur,`f`).scrollPadding[1];else{let t=e.body.scrollWidth-(i+n),c=e.body.scrollHeight-(a+r);o=ii(n*V(this,ur,`f`).scrollPadding[0],0,t),s=ii(r*V(this,ur,`f`).scrollPadding[1],0,c)}let c=n+o*2,l=r+s*2;(c!==V(this,Cr,`f`)[0]||l!==V(this,Cr,`f`)[1])&&(V(this,dr,`f`).style.width=`${c}px`,V(this,dr,`f`).style.height=`${l}px`,V(this,U,`f`).setSize(c,l,V(this,J,`f`)),B(this,X,rn({top:-s,left:-o,right:n+o,bottom:r+s}),`f`),B(this,Sr,rn({top:0,left:0,right:n,bottom:r}),`f`),B(this,Cr,[c,l],`f`),B(this,wr,o,`f`),B(this,Tr,s,`f`)),V(this,ur,`f`).fixedCanvas||V(this,dr,`f`).style.setProperty(`transform`,`translate(${i-o}px, ${a-s}px)`)},Mr=async function(e){if(!V(this,Or,`f`).get(e.element)){V(this,Or,`f`).set(e.element,!0);try{let t=e.srcTexture,n=t.source instanceof OffscreenCanvas?t.source:void 0,r=await Ze(e.element,e.originalOpacity,n,this.maxTextureSize);if(r.width===0||r.width===0)throw`omg`;let i=new C(V(this,U,`f`),r);i.wrapS=t.wrapS,i.wrapT=t.wrapT,i.needsUpdate=!0,!e.chain&&e.passes.length>0&&(e.passes[0].uniforms.src.value=i),e.srcTexture=i,t.dispose()}catch(e){console.error(e)}V(this,Or,`f`).set(e.element,!1)}},Nr=async function(e,t,n,r){t.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified; `effect` takes precedence."),t.overflow!==void 0&&console.warn("[VFX-JS] `overflow` is shader-path only and is ignored by the effect path. Use each effect's own `outputRect` (with `dims.canvasRect` for fullscreen) to control its dst rect.");let i=Array.isArray(n)?[...n]:[n];V(this,H,`m`,Rr).call(this,i);let a=e.getBoundingClientRect(),o=an(a),[s,c]=$r(t.overflow),l=ei(t.intersection),u=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),d,f,p=!1;if(e instanceof HTMLImageElement)if(f=`img`,p=!!e.src.match(/\.gif/i),p){let t=await Bn.create(e.src,V(this,J,`f`));Yr.set(e,t),d=new C(V(this,U,`f`),t.getCanvas())}else{let t=await pe(e.src);d=new C(V(this,U,`f`),t)}else if(e instanceof HTMLVideoElement)d=new C(V(this,U,`f`),e),f=`video`;else if(e instanceof HTMLCanvasElement)e.hasAttribute(`layoutsubtree`)&&r?(d=new C(V(this,U,`f`),r),f=`hic`):(d=new C(V(this,U,`f`),e),f=`canvas`);else{let t=await Ze(e,u,void 0,this.maxTextureSize);d=new C(V(this,U,`f`),t),f=`text`}let[m,h]=ri(t.wrap);d.wrapS=m,d.wrapT=h,d.needsUpdate=!0;let g=t.autoCrop??!0;if(f!==`hic`&&t.overlay!==!0)if(typeof t.overlay==`number`)e.style.setProperty(`opacity`,t.overlay.toString());else{let t=f===`video`?`0.0001`:`0`;e.style.setProperty(`opacity`,t.toString())}let _=Date.now()/1e3,v={type:f,element:e,isInViewport:!1,isInLogicalViewport:!1,width:a.width,height:a.height,passes:[],bufferTargets:new Map,startTime:_,enterTime:_,leaveTime:-1/0,release:t.release??1/0,isGif:p,isFullScreen:s,overflow:c,intersection:l,originalOpacity:u,srcTexture:d,zIndex:t.zIndex??0,backbuffer:void 0,autoCrop:g,effectLastRenderTime:_},y=Zt(()=>v.srcTexture,()=>ti(v.srcTexture,`w`),()=>ti(v.srcTexture,`h`)),ee={},b={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(b[e]=n,ee[e]=n()):ee[e]=n;v.effectUniformGenerators=b,v.effectStaticUniforms=ee;let te={autoCrop:g,glslVersion:t.glslVersion??`300 es`},ne=new On(V(this,U,`f`),V(this,pr,`f`),V(this,J,`f`),i,te,y,!1);try{await ne.initAll()}catch(t){throw V(this,H,`m`,zr).call(this,i),d.dispose(),e.style.setProperty(`opacity`,u.toString()),t}v.chain=ne,V(this,H,`m`,Vr).call(this,v,o,_),V(this,Y,`f`).push(v),V(this,Y,`f`).sort((e,t)=>e.zIndex-t.zIndex)},Pr=function(e){let t=t=>t.glslVersion===void 0&&e.glslVersion!==void 0?{...t,glslVersion:e.glslVersion}:t;return Array.isArray(e.shader)?e.shader.map(t):[t({frag:V(this,H,`m`,Hr).call(this,e.shader||`uvGradient`)})]},Ir=function(e,t,n,r){let i=e.chain;if(!i)return;let a=V(this,J,`f`);Yr.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(e.srcTexture.needsUpdate=!0);let o={...e.effectStaticUniforms??{}};if(e.effectUniformGenerators)for(let[t,n]of Object.entries(e.effectUniformGenerators))o[t]=n();let s=V(this,X,`f`).right-V(this,X,`f`).left,c=V(this,X,`f`).bottom-V(this,X,`f`).top,l=xe(t,c,V(this,wr,`f`),V(this,Tr,`f`)),u=V(this,Er,`f`)+V(this,wr,`f`)-l.x,d=V(this,Dr,`f`)+V(this,Tr,`f`)-l.y,f=t.right-t.left,p=t.bottom-t.top,m=r-(e.effectLastRenderTime??r);e.effectLastRenderTime=r;let h=V(this,H,`m`,Lr).call(this)&&V(this,K,`f`)?$t(V(this,K,`f`)):null;i.run({time:r-e.startTime,deltaTime:m,mouse:[u*a,d*a],mouseViewport:[V(this,Er,`f`)*a,V(this,Dr,`f`)*a],intersection:n.intersection,enterTime:r-e.enterTime,leaveTime:r-e.leaveTime,resolvedUniforms:o,canvasSize:[s,c],canvasBufferSize:[s*a,c*a],elementSize:[f,p],elementBufferSize:[f*a,p*a],elementRectOnCanvasPx:{x:l.x*a,y:l.y*a,w:l.w*a,h:l.h*a},finalTarget:h,isVisible:n.isVisible})},Lr=function(){return V(this,G,`f`).length>0||V(this,q,`f`)!==null&&V(this,hr,`f`)},Rr=function(e){for(let t of e)if(V(this,gr,`f`).has(t))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");for(let t of e)V(this,gr,`f`).add(t)},zr=function(e){for(let t of e)V(this,gr,`f`).delete(t)},Br=function(e){let t=e.hitTestPadBuffer,n=V(this,J,`f`);return tn({top:t.top/n,right:t.right/n,bottom:t.bottom/n,left:t.left/n})},Vr=function(e,t,n){let r=on(t,e.chain?V(this,H,`m`,Br).call(this,e.chain):e.overflow),i=e.isFullScreen||Zr(V(this,Sr,`f`),r),a=on(V(this,Sr,`f`),e.intersection.rootMargin),o=ln(a,t),s=e.isFullScreen||Qr(a,t,o,e.intersection.threshold);!e.isInLogicalViewport&&s&&(e.enterTime=n,e.leaveTime=1/0),e.isInLogicalViewport&&!s&&(e.leaveTime=n),e.isInViewport=i,e.isInLogicalViewport=s;let c=i&&n-e.leaveTime<=e.release;if(c&&!e.chain&&e.passes.length>0){let t=e.passes[0].uniforms;t.intersection.value=o,t.enterTime.value=n-e.enterTime,t.leaveTime.value=n-e.leaveTime}return{isVisible:c,intersection:o,rectWithOverflow:r}},Hr=function(e){return e in a?a[e]:e},Z=function(e,t,n,r,i){let a=V(this,fr,`f`);i&&t!==null&&t!==V(this,K,`f`)&&(a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.viewport(0,0,t.width,t.height),a.clear(a.COLOR_BUFFER_BIT));let o=r.viewport;o&&o.value instanceof ke&&o.value.set(n.x*V(this,J,`f`),n.y*V(this,J,`f`),n.w*V(this,J,`f`),n.h*V(this,J,`f`));try{qe(a,V(this,pr,`f`),e,t,n,V(this,Cr,`f`)[0],V(this,Cr,`f`)[1],V(this,J,`f`))}catch(e){console.error(e)}},Ur=function(e,t,n){let r=e.passes[0].uniforms.offset.value;r.x=t*V(this,J,`f`),r.y=n*V(this,J,`f`)},Wr=function(e){let t=e.length===1&&!(`frag`in e[0])?e[0]:null;if(t&&t.effect!==void 0){V(this,H,`m`,Gr).call(this,t,t.effect);return}let n=[],r=[];for(let t of e)`frag`in t&&r.push(t);for(let e=0;e<r.length-1;e++)r[e].target||(r[e]={...r[e],target:`pass${e}`});for(let t of e){let e,r,i;if(`frag`in t)e=t.frag,r=new lr(V(this,U,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,t.size,t.target!==void 0,t.glslVersion),i=t.target;else{if(t.shader===void 0)throw Error("VFXPostEffect requires `shader` (the `effect` path is not implemented yet).");e=V(this,H,`m`,Hr).call(this,t.shader),r=new lr(V(this,U,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,void 0,!1,t.glslVersion),t.persistent&&r.registerBufferUniform(`backbuffer`),i=void 0}n.push(e);let a={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`&&(a[e]=n);V(this,G,`f`).push({pass:r,target:i,generators:a})}for(let e of r)e.target&&V(this,mr,`f`).set(e.target,void 0);let i=V(this,G,`f`).map(e=>e.target).filter(e=>e!==void 0);for(let e=0;e<V(this,G,`f`).length;e++)for(let t of i)n[e].match(RegExp(`uniform\\s+sampler2D\\s+${t}\\b`))&&V(this,G,`f`)[e].pass.registerBufferUniform(t)},Gr=function(e,t){e.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified on post-effect; `effect` takes precedence.");let n=Array.isArray(t)?[...t]:[t];V(this,H,`m`,Rr).call(this,n);let r=Zt(()=>{let e=V(this,K,`f`);if(!e)throw Error(`[VFX-JS] post-effect chain active without target`);return e.texture},()=>V(this,K,`f`)?.width??0,()=>V(this,K,`f`)?.height??0),i={autoCrop:!0,glslVersion:e.glslVersion??`300 es`},a=new On(V(this,U,`f`),V(this,pr,`f`),V(this,J,`f`),n,i,r,!0);if(e.uniforms)for(let[t,n]of Object.entries(e.uniforms))typeof n==`function`?(V(this,vr,`f`)[t]=n,V(this,_r,`f`)[t]=n()):V(this,_r,`f`)[t]=n;B(this,q,a,`f`),B(this,yr,Date.now()/1e3,`f`),a.initAll().then(()=>{V(this,q,`f`)===a&&B(this,hr,!0,`f`)}).catch(e=>{console.error(`[VFX-JS] Post-effect init failed; post-effect disabled:`,e),V(this,q,`f`)===a&&(V(this,H,`m`,zr).call(this,V(this,q,`f`).effects),V(this,q,`f`).dispose(),B(this,q,null,`f`),B(this,hr,!1,`f`))})},Kr=function(e,t){let n=V(this,q,`f`);if(!n)return;let r=V(this,J,`f`),i={...V(this,_r,`f`)};for(let[e,t]of Object.entries(V(this,vr,`f`)))i[e]=t();let a=V(this,X,`f`).right-V(this,X,`f`).left,o=V(this,X,`f`).bottom-V(this,X,`f`).top,s=t-V(this,yr,`f`);B(this,yr,t,`f`);let c=[a,o],l=[a*r,o*r],u={x:e.x*r,y:e.y*r,w:e.w*r,h:e.h*r};n.run({time:t-V(this,xr,`f`),deltaTime:s,mouse:[V(this,Er,`f`)*r,V(this,Dr,`f`)*r],mouseViewport:[V(this,Er,`f`)*r,V(this,Dr,`f`)*r],intersection:1,enterTime:0,leaveTime:0,resolvedUniforms:i,canvasSize:c,canvasBufferSize:l,elementSize:c,elementBufferSize:l,elementRectOnCanvasPx:u,finalTarget:null,isVisible:!0})},qr=function(e,t){if(!V(this,K,`f`))return;let n=V(this,K,`f`).texture,r=new Map;for(let{pass:e,target:t}of V(this,G,`f`))t&&e.backbuffer&&r.set(t,e.backbuffer.texture);for(let i=0;i<V(this,G,`f`).length;i++){let{pass:a,target:o,generators:s}=V(this,G,`f`)[i],c=i===V(this,G,`f`).length-1,l=V(this,Er,`f`)+V(this,wr,`f`),u=V(this,Dr,`f`)+V(this,Tr,`f`),d=a.size;if(d){let[r,i]=d;a.uniforms.src.value=n,a.uniforms.resolution.value.set(r,i),a.uniforms.offset.value.set(0,0),a.uniforms.time.value=t-V(this,xr,`f`),a.uniforms.mouse.value.set(l/e.w*r,u/e.h*i)}else a.setUniforms(n,V(this,J,`f`),e,t-V(this,xr,`f`),l,u);a.uniforms.passIndex.value=i,a.updateCustomUniforms(s);for(let[e,t]of r){let n=a.uniforms[e];n&&(n.value=t)}if(c)a.backbuffer?(a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture),V(this,H,`m`,Z).call(this,a.pass,a.backbuffer.target,e,a.uniforms,!0),a.backbuffer.swap(),V(this,W,`f`).setUniforms(a.backbuffer.texture,V(this,J,`f`),e),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,null,e,V(this,W,`f`).uniforms,!1)):V(this,H,`m`,Z).call(this,a.pass,null,e,a.uniforms,!1);else if(a.backbuffer){a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture);let t=d?Se(0,0,d[0]/V(this,J,`f`),d[1]/V(this,J,`f`)):e;V(this,H,`m`,Z).call(this,a.pass,a.backbuffer.target,t,a.uniforms,!0),a.backbuffer.swap(),n=a.backbuffer.texture,o&&r.set(o,a.backbuffer.texture)}else{let t=o??`postEffect${i}`,s=V(this,mr,`f`).get(t),c=d?d[0]:e.w*V(this,J,`f`),l=d?d[1]:e.h*V(this,J,`f`);(!s||s.width!==c||s.height!==l)&&(s?.dispose(),s=tr(V(this,U,`f`),c,l,{float:a.float}),V(this,mr,`f`).set(t,s));let u=d?Se(0,0,d[0]/V(this,J,`f`),d[1]/V(this,J,`f`)):e;V(this,H,`m`,Z).call(this,a.pass,s,u,a.uniforms,!0),n=s.texture,o&&r.set(o,s.texture)}}},Jr=function(e,t){let n=e*V(this,J,`f`),r=t*V(this,J,`f`);(!V(this,K,`f`)||V(this,K,`f`).width!==n||V(this,K,`f`).height!==r)&&(V(this,K,`f`)?.dispose(),B(this,K,tr(V(this,U,`f`),n,r),`f`));for(let{pass:n}of V(this,G,`f`))n.persistent&&!n.backbuffer?n.initializeBackbuffer(V(this,U,`f`),e,t,V(this,J,`f`)):n.backbuffer&&n.resizeBackbuffer(e,t)};function Zr(e,t){return t.left<=e.right&&t.right>=e.left&&t.top<=e.bottom&&t.bottom>=e.top}function Qr(e,t,n,r){return r===0?Zr(e,t):n>=r}function $r(e){return e===!0?[!0,nn]:e===void 0?[!1,nn]:[!1,tn(e)]}function ei(e){return{threshold:e?.threshold??0,rootMargin:tn(e?.rootMargin??0)}}function ti(e,t){let n=e.source;if(!n)return 0;if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return t===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return t===`w`?n.videoWidth:n.videoHeight;let r=n;return t===`w`?r.width:r.height}function ni(e){return e===`repeat`?`repeat`:e===`mirror`?`mirror`:`clamp`}function ri(e){if(!e)return[`clamp`,`clamp`];if(Array.isArray(e))return[ni(e[0]),ni(e[1])];let t=ni(e);return[t,t]}function ii(e,t,n){return Math.max(t,Math.min(n,e))}function ai(){try{let e=document.createElement(`canvas`);return(e.getContext(`webgl2`)||e.getContext(`webgl`))!==null}catch{return!1}}var oi=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Q=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},si,$,ci,li,ui,di,fi,pi;function mi(){if(typeof window>`u`)throw`Cannot find 'window'. VFX-JS only runs on the browser.`;if(typeof document>`u`)throw`Cannot find 'document'. VFX-JS only runs on the browser.`}function hi(e){return{position:e?`fixed`:`absolute`,top:0,left:0,width:`0px`,height:`0px`,"z-index":9999,"pointer-events":`none`}}var gi=class e{static init(t){try{return new e(t)}catch{return null}}constructor(e={}){if(si.add(this),$.set(this,void 0),ci.set(this,void 0),li.set(this,new Map),mi(),!ai())throw Error(`[VFX-JS] WebGL is not available in this environment.`);let t=ne(e),n=document.createElement(`canvas`),r=hi(t.fixedCanvas);for(let[e,t]of Object.entries(r))n.style.setProperty(e,t.toString());t.zIndex!==void 0&&n.style.setProperty(`z-index`,t.zIndex.toString()),(t.wrapper??document.body).appendChild(n),oi(this,ci,n,`f`),oi(this,$,new Xr(t,n),`f`),t.autoplay&&Q(this,$,`f`).play()}async add(e,t,n){e instanceof HTMLImageElement?await Q(this,si,`m`,ui).call(this,e,t):e instanceof HTMLVideoElement?await Q(this,si,`m`,di).call(this,e,t):e instanceof HTMLCanvasElement?e.hasAttribute(`layoutsubtree`)&&n?await Q(this,$,`f`).addElement(e,t,n):await Q(this,si,`m`,fi).call(this,e,t):await Q(this,si,`m`,pi).call(this,e,t)}updateHICTexture(e,t){Q(this,$,`f`).updateHICTexture(e,t)}get maxTextureSize(){return Q(this,$,`f`).maxTextureSize}async addHTML(e,t){if(!te())return console.warn(`html-in-canvas not supported, falling back to dom-to-canvas`),this.add(e,t);t.overlay!==void 0&&console.warn(`addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.`);let{overlay:n,...r}=t,i=Q(this,li,`f`).get(e);i&&Q(this,$,`f`).removeElement(i);let{canvas:a,initialCapture:o}=await y(e,{onCapture:e=>{Q(this,$,`f`).updateHICTexture(a,e)},maxSize:Q(this,$,`f`).maxTextureSize});i=a,Q(this,li,`f`).set(e,i),await Q(this,$,`f`).addElement(i,r,o)}remove(e){let t=Q(this,li,`f`).get(e);t?(ee(t,e),Q(this,li,`f`).delete(e),Q(this,$,`f`).removeElement(t)):Q(this,$,`f`).removeElement(e)}async update(e){let t=Q(this,li,`f`).get(e);if(t){t.requestPaint();return}if(e instanceof HTMLCanvasElement){Q(this,$,`f`).updateCanvasElement(e);return}else return Q(this,$,`f`).updateTextElement(e)}play(){Q(this,$,`f`).play()}stop(){Q(this,$,`f`).stop()}render(){Q(this,$,`f`).render()}destroy(){for(let[e,t]of Q(this,li,`f`))ee(t,e);Q(this,li,`f`).clear(),Q(this,$,`f`).destroy(),Q(this,ci,`f`).remove()}};$=new WeakMap,ci=new WeakMap,li=new WeakMap,si=new WeakSet,ui=function(e,t){return e.complete?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`load`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},di=function(e,t){return e.readyState>=3?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`canplay`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},fi=function(e,t){return Q(this,$,`f`).addElement(e,t)},pi=function(e,t){return Q(this,$,`f`).addElement(e,t)};export{gi as t};
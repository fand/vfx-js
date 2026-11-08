import{r as e,t}from"./rolldown-runtime-pP25SEvz.js";import"./modulepreload-polyfill-P2Xu9kJm.js";var n=`
precision highp float;
in vec3 position;
void main() {
    gl_Position = vec4(position, 1.0);
}
`,r=`
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
`,i=`precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform bool autoCrop;
uniform sampler2D src;
out vec4 outColor;
`,a=`vec4 readTex(sampler2D tex, vec2 uv) {
    if (autoCrop && (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.)) {
        return vec4(0);
    }
    return texture(tex, uv);
}`,o={none:r,uvGradient:`
    ${i}
    ${a}

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        outColor = vec4(uv, sin(time) * .5 + .5, 1);

        vec4 img = readTex(src, uv);
        outColor *= smoothstep(0., 1., img.a);
    }
    `,rainbow:`
    ${i}
    ${a}

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
    ${i}
    ${a}

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
    ${i}
    ${a}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        float b = sin(time * 2.) * 32. + 48.;
        uv = floor(uv * b) / b;
        outColor = readTex(src, uv);
    }
    `,rgbGlitch:`
    ${i}
    ${a}

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
    ${i}
    ${a}

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

    ${i}
    ${a}

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
    ${i}
    ${a}

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
    ${i}
    ${a}

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
    ${i}
    ${a}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        outColor = readTex(src, uv) * (sin(time * 5.) * 0.2 + 0.8);
    }

    `,spring:`
    ${i}
    ${a}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        uv = (uv - .5) * (1.05 + sin(time * 5.) * 0.05) + .5;
        outColor = readTex(src, uv);
    }
    `,duotone:`
    ${i}
    ${a}

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
    ${i}
    ${a}

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
    ${i}
    ${a}

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
    ${i}
    uniform float enterTime;
    uniform float leaveTime;

    ${a}

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
    ${i}
    ${a}

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
    ${i}
    ${a}

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
    ${i}
    ${a}

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
    ${i}
    ${a}

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 color = readTex(src, uv);
        outColor = vec4(1.0 - color.rgb, color.a);
    }
    `,grayscale:`
    ${i}
    ${a}

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 color = readTex(src, uv);
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        outColor = vec4(vec3(gray), color.a);
    }
    `,vignette:`
    ${i}
    ${a}

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
    ${i}
    ${a}

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
    `};function s(e){return e.tagName===`CANVAS`&&(e.hasAttribute(`layoutsubtree`)||e.getAttribute(`content`)===`drawable`)}function c(e,t){e.setAttribute(`layoutsubtree`,``),e.setAttribute(`content`,`drawable`),t?.setAttribute(`drawable`,``)}function l(e,t,n,r){if(t.width<=0||t.height<=0)return null;let i=t.left-e.left,a=t.top-e.top;return i+t.width<=0||a+t.height<=0||i>=e.width||a>=e.height?null:[i*n,a*r,t.width*n,t.height*r]}function u(e){let t=e.getBoundingClientRect(),n=getComputedStyle(e),r=Number.parseFloat(n.paddingLeft)||0,i=Number.parseFloat(n.paddingRight)||0,a=Number.parseFloat(n.paddingTop)||0,o=Number.parseFloat(n.paddingBottom)||0,s=e.clientWidth>0?t.width/e.offsetWidth:1,c=e.clientHeight>0?t.height/e.offsetHeight:1;return{left:t.left+(e.clientLeft+r)*s,top:t.top+(e.clientTop+a)*c,width:Math.max(0,e.clientWidth-r-i)*s,height:Math.max(0,e.clientHeight-a-o)*c}}function d(e){return typeof e.checkVisibility==`function`?e.checkVisibility({visibilityProperty:!0,opacityProperty:!0}):getComputedStyle(e).visibility!==`hidden`}function f(e,t){let n=t.querySelectorAll(`canvas`);if(n.length===0)return;let r=t.getBoundingClientRect();if(r.width<=0||r.height<=0)return;let i=e.canvas.width/r.width,a=e.canvas.height/r.height;for(let t of n){if(t.width===0||t.height===0||!d(t))continue;let n=l(r,u(t),i,a);if(n)try{e.drawImage(t,...n)}catch{}}}function p(e){return e.currentSrc||e.src}function m(e,t){let n=e.getBoundingClientRect(),r=e.cloneNode(!0),i=[e,...e.querySelectorAll(`*`)],a=[r,...r.querySelectorAll(`*`)],o=[],s=[];for(let e=0;e<i.length&&e<a.length;e++){let t=i[e],n=a[e];(t.scrollTop||t.scrollLeft)&&o.push([n,t.scrollTop,t.scrollLeft]),t instanceof HTMLScriptElement?s.push([n,document.createComment(`script`)]):t instanceof HTMLCanvasElement||t instanceof HTMLVideoElement?s.push([n,te(t)]):t instanceof HTMLIFrameElement?s.push([n,ne(t)]):t instanceof HTMLInputElement&&n instanceof HTMLInputElement?(n.value=t.value,n.checked=t.checked):t instanceof HTMLTextAreaElement&&n instanceof HTMLTextAreaElement?n.value=t.value:t instanceof HTMLSelectElement&&n instanceof HTMLSelectElement?n.selectedIndex=t.selectedIndex:t instanceof HTMLMediaElement&&n.removeAttribute(`autoplay`)}for(let[e,t]of s)e.replaceWith(t);r.setAttribute(`aria-hidden`,`true`);let c=r.style;c.setProperty(`position`,`fixed`),c.setProperty(`left`,`${n.left}px`),c.setProperty(`top`,`${n.top}px`),c.setProperty(`width`,`${n.width}px`),c.setProperty(`height`,`${n.height}px`),c.setProperty(`box-sizing`,`border-box`),c.setProperty(`margin`,`0`),c.setProperty(`pointer-events`,`none`),c.setProperty(`z-index`,t.toString()),e.parentNode?.insertBefore(r,e);let l=r.getBoundingClientRect();(l.left!==n.left||l.top!==n.top)&&(c.setProperty(`left`,`${n.left*2-l.left}px`),c.setProperty(`top`,`${n.top*2-l.top}px`));for(let[e,t,n]of o)e.scrollTop=t,e.scrollLeft=n;return h(i,a),()=>{r.remove()}}function h(e,t){let n=e[0],r=t[0];if(!n||!r||typeof n.getAnimations!=`function`)return;let i=(e,t)=>{if(!(`animationName`in e))return null;let n=e.effect,r=n?.target,i=r?t.get(r):void 0;return i===void 0?null:`${i}|${n?.pseudoElement??``}|${e.animationName}`},a=new Map(t.map((e,t)=>[e,t])),o=new Map;for(let e of r.getAnimations({subtree:!0})){let t=i(e,a);t&&o.set(t,e)}let s=new Map(e.map((e,t)=>[e,t]));for(let e of n.getAnimations({subtree:!0})){let t=i(e,s),n=t&&o.get(t);n&&(n.currentTime=e.currentTime,n.pause())}}function ee(e,t){let n=e.getBoundingClientRect(),r=getComputedStyle(e);t.className=e.className,t.style.cssText=e.style.cssText,t.style.width=`${n.width}px`,t.style.height=`${n.height}px`,t.style.display=r.display===`inline`?`inline-block`:r.display,t.style.boxSizing=`border-box`}function te(e){let t=document.createElement(`canvas`),n=e instanceof HTMLVideoElement?e.videoWidth:e.width,r=e instanceof HTMLVideoElement?e.videoHeight:e.height;t.width=Math.max(1,n),t.height=Math.max(1,r),ee(e,t);try{t.getContext(`2d`)?.drawImage(e,0,0,t.width,t.height)}catch{}return t}function ne(e){let t=document.createElement(`div`);return ee(e,t),t}function re(e){let t=p(e);if(!t||t.startsWith(`data:`))return!1;try{return new URL(t,location.href).origin!==location.origin}catch{return!1}}async function ie(e){let t=await(await fetch(e)).blob();return URL.createObjectURL(t)}async function g(e){let t=Array.from(e.querySelectorAll(`img`)).filter(e=>e.complete&&e.naturalWidth>0&&re(e));if(t.length===0)return()=>{};let n=new Map,r=[];return await Promise.all(t.map(async e=>{try{let t=p(e),i=await ie(t);n.set(e,t),r.push(i),await new Promise(t=>{e.addEventListener(`load`,()=>t(),{once:!0}),e.src=i})}catch{}})),()=>{for(let[e,t]of n)e.src=t;for(let e of r)URL.revokeObjectURL(e)}}var _=[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`],v=new Set([`IMG`,`VIDEO`,`CANVAS`,`IFRAME`,`EMBED`,`OBJECT`,`INPUT`,`TEXTAREA`,`SELECT`]),y=[`position`,`top`,`right`,`bottom`,`left`,`float`,`flex`,`flex-grow`,`flex-shrink`,`flex-basis`,`align-self`,`justify-self`,`place-self`,`order`,`grid-column`,`grid-column-start`,`grid-column-end`,`grid-row`,`grid-row-start`,`grid-row-end`,`grid-area`],b=new WeakMap,x=new WeakMap,ae=new WeakMap,oe=new WeakMap,se=new WeakMap,ce=new WeakMap,le=new WeakMap,ue=new WeakMap,de=new WeakMap,fe=new WeakSet,pe=new WeakMap,me=new WeakMap,he=new WeakSet,ge=new WeakSet,_e=300;function ve(e,t){return new Promise(n=>{let r=t=>{clearTimeout(a),e.delete(i),n(t)},i=()=>r(!0),a=setTimeout(()=>r(!1),t);e.add(i)})}function ye(e){if(e)for(let t of[...e])t()}function be(e,t,n){if(typeof e.moveBefore==`function`)try{e.moveBefore(t,n);return}catch{}e.insertBefore(t,n)}function xe(e,t=_e){let n=me.get(e);if(!n)return;let r=ve(n,t);return e.requestPaint(),r}function Se(e){if(he.has(e))return()=>{};he.add(e);let{width:t,height:n,overflow:r}=e.style,i=e.getBoundingClientRect();return e.style.setProperty(`width`,`${i.width}px`),e.style.setProperty(`height`,`${i.height}px`),e.style.setProperty(`overflow`,`hidden`),()=>{if(!he.has(e))return;he.delete(e),e.style.width=t,e.style.height=n,e.style.overflow=r;let i=e.firstElementChild;if(i&&!ge.has(e)){let t=Math.round(i.getBoundingClientRect().height);e.style.setProperty(`height`,`${t}px`)}}}function Ce(e){pe.get(e)?.(),pe.delete(e)}function we(e,t=!1){requestAnimationFrame(()=>{t||e.getContext(`2d`)?.clearRect(0,0,e.width,e.height),Ce(e)})}async function Te(e,t){c(e,e.firstElementChild);let n=e.getContext(`2d`);if(!n)throw Error(`Failed to get 2d context from layoutsubtree canvas`);let{onCapture:r,maxSize:i}=t,a=new Set;me.set(e,a);let o=null,s=null,l=new Promise(e=>{s=e}),u=null,d=t=>{if(t){if(t===u)return;u=t}let c=e.firstElementChild;if(!c||e.width===0||e.height===0||c.getClientRects().length===0)return;c.hasAttribute(`drawable`)||c.setAttribute(`drawable`,``),n.clearRect(0,0,e.width,e.height),n.drawElementImage(c,0,0),f(n,c);let l=e.width,d=e.height;if(i&&(l>i||d>i)){let e=Math.min(i/l,i/d);l=Math.floor(l*e),d=Math.floor(d*e)}o&&o.width===l&&o.height===d||(o=new OffscreenCanvas(l,d));let p=o.getContext(`2d`);p&&(p.clearRect(0,0,l,d),p.drawImage(e,0,0,l,d),s?(s(o),s=null,ye(a)):(n.clearRect(0,0,e.width,e.height),r(o),ye(a)))};e.onpaint=d,e.addEventListener(`paint`,d),x.set(e,d);let p=new ResizeObserver(t=>{for(let n of t){let t=n.devicePixelContentBoxSize?.[0];if(t)e.width=t.inlineSize,e.height=t.blockSize;else{let t=n.borderBoxSize?.[0];if(t){let n=window.devicePixelRatio;e.width=Math.round(t.inlineSize*n),e.height=Math.round(t.blockSize*n)}}}e.requestPaint()});p.observe(e,{box:`device-pixel-content-box`}),b.set(e,p);let m=e.firstElementChild;if(m){let t=new ResizeObserver(t=>{if(he.has(e)||ge.has(e))return;let n=t[0].borderBoxSize?.[0];if(!n)return;let r=`${Math.round(n.blockSize)}px`;r!==e.style.height&&e.style.setProperty(`height`,r)});t.observe(m),ae.set(e,t)}return l}function Ee(e){e.onpaint=null,ye(me.get(e)),me.delete(e);let t=x.get(e);t&&(e.removeEventListener(`paint`,t),x.delete(e));let n=b.get(e);n&&(n.disconnect(),b.delete(e));let r=ae.get(e);r&&(r.disconnect(),ae.delete(e))}function De(e){let t={width:null,height:null};if(typeof e.computedStyleMap!=`function`||v.has(e.tagName))return t;let n=e.computedStyleMap(),r=e=>n.get(e)?.toString()??`auto`,i=r(`position`);if(i!==`fixed`&&i!==`absolute`)return t;let a=(t,n,i)=>{let a=r(n),o=r(i);return r(t)!==`auto`||a===`auto`||o===`auto`?null:`calc(${[`100%`,a,o,...[`margin-${n}`,`margin-${i}`].map(n=>{let i=r(n);return t===`height`&&i.includes(`%`)?getComputedStyle(e).getPropertyValue(n):i}).filter(e=>e!==`auto`)].join(` - `)})`};return{width:a(`width`,`left`,`right`),height:a(`height`,`top`,`bottom`)}}function Oe(e){return v.has(e.tagName)&&typeof e.computedStyleMap==`function`&&e.computedStyleMap().get(`width`)?.toString()===`auto`}async function ke(e,t){let n=e.getBoundingClientRect(),r=De(e),i=document.createElement(`canvas`);e.hasAttribute(`drawable`)||fe.add(e),c(i,e),i.className=e.className;let a=e.getAttribute(`style`);a&&i.setAttribute(`style`,a),i.style.setProperty(`padding`,`0`),i.style.setProperty(`border`,`none`),i.style.setProperty(`box-sizing`,`content-box`),i.style.setProperty(`background`,`transparent`);let o=getComputedStyle(e),s=o.display===`inline`?`block`:o.display;i.style.setProperty(`display`,s);for(let e of _)i.style.setProperty(e,o.getPropertyValue(e));for(let e of y)i.style.setProperty(e,o.getPropertyValue(e));r.width?i.style.setProperty(`width`,r.width):e.style.width.endsWith(`px`)||Oe(e)?i.style.setProperty(`width`,`${n.width}px`):i.style.setProperty(`width`,`100%`),r.height?(i.style.setProperty(`height`,r.height),ge.add(i)):i.style.height||i.style.setProperty(`height`,`${n.height}px`);let l=window.devicePixelRatio;i.width=Math.round(n.width*l),i.height=Math.round(n.height*l),t.stillCover&&pe.set(i,m(e,t.stillCover.zIndex)),oe.set(e,e.style.margin),se.set(e,e.style.width),ce.set(e,e.style.boxSizing),e.parentNode?.insertBefore(i,e),getComputedStyle(i).display,be(i,e,null),e.style.setProperty(`margin`,`0`),e.style.setProperty(`width`,`100%`),e.style.setProperty(`box-sizing`,`border-box`),(r.width||r.height)&&(le.set(e,e.style.position),e.style.setProperty(`position`,`static`)),r.height&&(ue.set(e,e.style.height),e.style.setProperty(`height`,`100%`));let u=await g(e);return de.set(i,u),{canvas:i,initialCapture:await Te(i,t)}}function Ae(e,t){Ee(e),Ce(e);let n=de.get(e);n&&(n(),de.delete(e));let r=e.parentNode;r&&be(r,t,e),e.remove(),fe.has(t)&&(t.removeAttribute(`drawable`),fe.delete(t));let i=oe.get(t);i!==void 0&&(t.style.margin=i,oe.delete(t));let a=se.get(t);a!==void 0&&(t.style.width=a,se.delete(t));let o=ce.get(t);o!==void 0&&(t.style.boxSizing=o,ce.delete(t));let s=le.get(t);s!==void 0&&(t.style.position=s,le.delete(t));let c=ue.get(t);c!==void 0&&(t.style.height=c,ue.delete(t))}var je;function Me(){if(je!==void 0)return je;try{let e=document.createElement(`canvas`),t=e.getContext(`2d`);je=t!==null&&typeof t.drawElementImage==`function`&&typeof e.requestPaint==`function`}catch{je=!1}return je}var Ne=`#version 300 es
precision highp float;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D from;
uniform sampler2D src;
uniform vec4 srcRectUv;
uniform float t;
uniform float reverse;
uniform vec2 resolution;
uniform float time;

bool inRange(vec2 p) {
  return all(greaterThanEqual(p, vec2(0.0))) && all(lessThanEqual(p, vec2(1.0)));
}
vec4 premultiply(vec4 c) {
  return vec4(c.rgb * c.a, c.a);
}
vec4 readFrom(vec2 p) {
  if (!inRange(p)) return vec4(0.0);
  return premultiply(reverse > 0.5 ? texture(src, srcRectUv.xy + p * srcRectUv.zw) : texture(from, p));
}
vec4 readTo(vec2 p) {
  if (!inRange(p)) return vec4(0.0);
  return premultiply(reverse > 0.5 ? texture(from, p) : texture(src, srcRectUv.xy + p * srcRectUv.zw));
}
`,Pe=`
void main() {
  outColor = transition(uvContent, reverse > 0.5 ? 1.0 - t : t);
}
`;function Fe(e){return`${Ne}\n${e}\n${Pe}`}var Ie=Ne.split(`
`).length;function Le(e){let t=e instanceof Error?e.message:String(e);if(!/compile failed|link failed/i.test(t))return null;let n=[];for(let e of t.matchAll(/ERROR:\s*\d+:(\d+):\s*(.*)/g)){let t=Number(e[1])-Ie;n.push(t>=1?`line ${t}: ${e[2]}`:e[2])}return n.length>0?n:[t.split(`
`)[0]]}var Re=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},ze=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Be,Ve=new Map;function He(e){let t=Ve.get(e);return t===void 0&&(t=Fe(e),Ve.set(e,t)),t}var Ue=new WeakMap;function We(e){let t=Ue.get(e);return t||(t=new Set,Ue.set(e,t)),t}function Ge(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return n<=o&&r<=s&&n+i>=o+c&&r+a>=s+l}function Ke(e,t){let n=Le(t);n?(console.error(`[VFX-JS] transition "${e}" failed to compile; cutting to the new content.\n  ${n.join(`
  `)}`),console.debug(t)):console.error(`[VFX-JS] transition "${e}" failed; cutting to the new content.`,t)}var qe=class{constructor(e={}){Be.set(this,null),this.params=e}uniforms(e){return{}}start(e){Re(this,Be,e,`f`)}end(){Re(this,Be,null,`f`)}outputRect(e){let t=ze(this,Be,`f`)?.overflow??this.overflow;if(t===void 0||Ge(e.contentRect,e.canvasRect))return;if(t===!0)return e.canvasRect;let n=t*e.pixelRatio,[r,i,a,o]=e.contentRect;return[r-n,i-n,a+n*2,o+n*2]}render(e){if(e.holding){e.blit(e.src);return}let t=He(this.frag),n=We(e.gl);if(n.has(t))e.cut(),e.blit(e.src);else try{e.draw({frag:t,uniforms:{...this.uniforms(e),from:e.from,src:e.src,t:e.progress.t,reverse:+!!e.reverse,resolution:[e.dims.elementPixel[0],e.dims.elementPixel[1]],time:e.time},target:e.target})}catch(r){n.add(t),Ke(this.name,r),e.cut(),e.blit(e.src)}}};Be=new WeakMap;var Je=class extends qe{constructor(){super(...arguments),this.name=`crossfade`,this.frag=`
vec4 transition(vec2 uv, float t) {
  return mix(readFrom(uv), readTo(uv), t);
}
`}},S=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},C=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Ye,Xe,Ze,Qe,$e,et,tt,nt,rt,it,at,ot,st,ct,lt,ut,dt,ft=e=>e*e*(3-2*e);function pt(e,t){return typeof e==`function`?e(t):e===`linear`?t:ft(t)}var mt={t:0,x:0},ht=class{constructor(){Ye.add(this),this.enabled=!1,Xe.set(this,null),Ze.set(this,[0,0]),Qe.set(this,[]),$e.set(this,!1),et.set(this,null),tt.set(this,null),nt.set(this,mt),rt.set(this,null),it.set(this,null)}snapshot(){return S(this,Ye,`m`,at).call(this),C(this,et,null,`f`),this.enabled=!0,new Promise(e=>S(this,Qe,`f`).push(e))}start(e){return S(this,Ye,`m`,at).call(this),C(this,et,e,`f`),C(this,it,e.onEnd??null,`f`),C(this,tt,null,`f`),C(this,nt,mt,`f`),C(this,$e,!1,`f`),this.enabled=!1,new Promise(e=>{C(this,rt,e,`f`)})}cancel(){S(this,Ye,`m`,at).call(this),C(this,et,null,`f`),C(this,$e,!1,`f`),this.enabled=!1,S(this,Ye,`m`,ot).call(this)}get frame(){let e=S(this,Xe,`f`);return!e||!S(this,$e,`f`)&&!S(this,et,`f`)?null:{from:e,progress:S(this,nt,`f`),holding:S(this,et,`f`)===null}}cut(){S(this,et,`f`)&&(C(this,et,null,`f`),S(this,Ye,`m`,at).call(this))}update(e){let t=S(this,et,`f`);if(!t)return;S(this,tt,`f`)===null&&C(this,tt,e.time,`f`);let n=(e.time-S(this,tt,`f`))/t.duration;if(n>=1){C(this,et,null,`f`),S(this,Ye,`m`,at).call(this);return}let r=Math.max(n,0);C(this,nt,{t:pt(t.ease,r),x:r},`f`)}render(e){S(this,Qe,`f`).length>0&&(e.blit(e.src,S(this,Ye,`m`,st).call(this,e)),C(this,$e,!0,`f`),S(this,Ye,`m`,ot).call(this)),S(this,Xe,`f`)&&S(this,$e,`f`)?e.blit(S(this,Xe,`f`)):(this.enabled=!1,e.blit(e.src))}dispose(){C(this,Xe,null,`f`),C(this,Ze,[0,0],`f`),S(this,Ye,`m`,at).call(this),S(this,Ye,`m`,ot).call(this)}};Xe=new WeakMap,Ze=new WeakMap,Qe=new WeakMap,$e=new WeakMap,et=new WeakMap,tt=new WeakMap,nt=new WeakMap,rt=new WeakMap,it=new WeakMap,Ye=new WeakSet,at=function(){let e=S(this,it,`f`);C(this,it,null,`f`),e?.();let t=S(this,rt,`f`);C(this,rt,null,`f`),t?.()},ot=function(){let e=S(this,Qe,`f`);C(this,Qe,[],`f`);for(let t of e)t()},st=function(e){let[t,n]=e.dims.elementPixel;return S(this,Xe,`f`)&&S(this,Ze,`f`)[0]===t&&S(this,Ze,`f`)[1]===n||(S(this,Xe,`f`)?.dispose(),C(this,Xe,e.createRenderTarget({size:[t,n]}),`f`),C(this,Ze,[t,n],`f`)),S(this,Xe,`f`)};var gt=class{constructor(e,t){ct.add(this),lt.set(this,void 0),ut.set(this,null),this.effect=e,C(this,lt,t,`f`)}get enabled(){return S(this,ut,`f`)!==null&&typeof this.effect.render==`function`&&this.effect.enabled!==!1}start(e){C(this,ut,e,`f`),this.effect.start?.(e)}end(){S(this,ut,`f`)!==null&&(C(this,ut,null,`f`),this.effect.end?.())}init(e){return this.effect.init?.(e)}update(e){let t=S(this,lt,`f`).frame;if(!t||t.holding)return;let n=S(this,ct,`m`,dt).call(this,e);n&&this.effect.update?.(n)}render(e){let t=S(this,ct,`m`,dt).call(this,e);t&&this.effect.render?this.effect.render(t):e.blit(e.src)}outputRect(e){return S(this,ut,`f`)?this.effect.outputRect?.(e):void 0}dispose(){this.effect.dispose?.()}};lt=new WeakMap,ut=new WeakMap,ct=new WeakSet,dt=function(e){let t=S(this,lt,`f`).frame,n=S(this,ut,`f`);return!t||!n?null:{...e,from:t.from,progress:t.progress,holding:t.holding,reverse:n.reverse,run:n,cut:()=>S(this,lt,`f`).cut()}};var w=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},T=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},E,_t,D,vt,yt,bt,xt,St,Ct,wt,Tt,Et,Dt,Ot,kt,At,jt,Mt,Nt,Pt,Ft,It,Lt,Rt,zt,Bt,Vt,Ht,Ut,Wt,Gt,Kt,qt,Jt,Yt,Xt,Zt,Qt=.6,$t=300,en=1e3;function tn(e,t){let n=t.transition===void 0?e.params===void 0&&t.params===void 0?void 0:{...e.params,...t.params}:t.params;return{transition:t.transition??e.transition,params:n,reverse:t.reverse??e.reverse,duration:t.duration??e.duration,overflow:t.overflow??e.overflow,ease:t.ease??e.ease}}function nn(e,t={}){let n=tn(e,t);return{transition:n.transition??Je,params:n.params,reverse:n.reverse??!1,duration:n.duration??Qt,overflow:n.overflow,ease:n.ease}}var rn=e=>typeof e==`function`;function an(e,t){return Array.isArray(e)&&Array.isArray(t)?e.length===t.length&&e.every((e,n)=>e===t[n]):e===t}function on(e,t){let n=e??{},r=t??{},i=Object.keys(n);return i.length===Object.keys(r).length&&i.every(e=>e in r&&an(n[e],r[e]))}var sn=new WeakMap;function cn(e){let t=e.getBoundingClientRect();return t.right>0&&t.bottom>0&&t.left<window.innerWidth&&t.top<window.innerHeight}function ln(e){return e.tagName===`IMG`?e.loading===`lazy`&&!cn(e):e.preload===`none`}function un(e,t,n=$t){let r=[];for(let t of e.querySelectorAll(`img, video`)){let e=t.tagName===`IMG`;!(e?t.complete:t.readyState>=2)&&!ln(t)&&r.push(new Promise(n=>{let r=()=>n();t.addEventListener(e?`load`:`loadeddata`,r,{once:!0}),t.addEventListener(`error`,r,{once:!0})}))}return t&&r.push(t),r.length===0?Promise.resolve():new Promise(e=>{let t=setTimeout(e,n),i=()=>{clearTimeout(t),e()};Promise.all(r).then(i,i)})}function dn(e,t){return new Promise((n,r)=>{let i=setTimeout(()=>n(!1),t);e.then(()=>{clearTimeout(i),n(!0)},e=>{clearTimeout(i),r(e)})})}var fn=()=>new Promise(e=>requestAnimationFrame(()=>e()));function pn(e,t){return e.length===t.length&&e.every((e,n)=>e===t[n])}var mn=class{constructor(e,t,n={},r,i=new ht){E.add(this),_t.set(this,void 0),D.set(this,void 0),vt.set(this,void 0),yt.set(this,void 0),bt.set(this,void 0),xt.set(this,void 0),St.set(this,[]),Ct.set(this,[]),wt.set(this,!1),Tt.set(this,!1),Et.set(this,!1),Dt.set(this,0),Ot.set(this,null),kt.set(this,!1),At.set(this,!1),jt.set(this,null),Mt.set(this,[]),Nt.set(this,null),Pt.set(this,null),Ft.set(this,null),w(this,xt,r,`f`),w(this,_t,e,`f`),w(this,D,t,`f`),w(this,vt,n,`f`),w(this,yt,i,`f`),w(this,bt,n.keepWrapped??!1,`f`)}get running(){return T(this,Ot,`f`)!==null}show(e,t={}){let n=T(this,E,`m`,It).call(this,e),{remove:r=!1,...i}=t;if(!this.running&&T(this,E,`m`,Lt).call(this,n))return Promise.resolve();let a=T(this,vt,`f`).slideSpec?.(n),o=a?tn(a,i):i;return this.run(()=>{n.parentElement!==T(this,D,`f`)&&T(this,D,`f`).append(n);for(let e of Array.from(T(this,D,`f`).children))e!==n&&(r?e.remove():e.hidden=!0);n.hidden=!1},o)}async run(e,t={}){var n;if(T(this,kt,`f`)){await e();return}let r=w(this,Dt,(n=T(this,Dt,`f`),++n),`f`);w(this,Ot,r,`f`);try{await T(this,E,`m`,Rt).call(this,r,e,t)}finally{T(this,Ot,`f`)===r&&w(this,Ot,null,`f`),T(this,Dt,`f`)===r&&(T(this,E,`m`,Kt).call(this),T(this,E,`m`,Gt).call(this),T(this,E,`m`,Vt).call(this))}}cancel(){var e;let t=w(this,Dt,(e=T(this,Dt,`f`),++e),`f`);w(this,Ot,null,`f`),T(this,E,`m`,Jt).call(this),T(this,yt,`f`).cancel(),T(this,E,`m`,Kt).call(this),T(this,E,`m`,Gt).call(this),T(this,E,`m`,Vt).call(this),T(this,E,`m`,Xt).call(this,t)}destroy(){T(this,kt,`f`)||(w(this,kt,!0,`f`),this.cancel(),w(this,Nt,null,`f`),T(this,xt,`f`)?.call(this))}};_t=new WeakMap,D=new WeakMap,vt=new WeakMap,yt=new WeakMap,bt=new WeakMap,xt=new WeakMap,St=new WeakMap,Ct=new WeakMap,wt=new WeakMap,Tt=new WeakMap,Et=new WeakMap,Dt=new WeakMap,Ot=new WeakMap,kt=new WeakMap,At=new WeakMap,jt=new WeakMap,Mt=new WeakMap,Nt=new WeakMap,Pt=new WeakMap,Ft=new WeakMap,E=new WeakSet,It=function(e){let t=T(this,D,`f`),n=typeof e==`number`?t.children[e]:typeof e==`string`?t.querySelector(e):e;if(!n)throw TypeError(`[VFX-JS] show(): no slide for ${e}.`);if(n.parentElement!==t&&(n.isConnected||t.contains(n)))throw TypeError(`[VFX-JS] show(): the slide must be a direct child of the container.`);return n},Lt=function(e){return e.parentElement!==T(this,D,`f`)||e.hidden?!1:Array.from(T(this,D,`f`).children).every(t=>t===e||t.hidden)},Rt=async function(e,t,n){let r=()=>e===T(this,Dt,`f`),i=!1,a=async()=>{i||(i=!0,await t())},o=async()=>{T(this,E,`m`,Jt).call(this),T(this,yt,`f`).cancel(),await a(),r()&&(T(this,At,`f`)&&T(this,bt,`f`)&&await T(this,_t,`f`).update(T(this,D,`f`)),T(this,E,`m`,Xt).call(this,e))},s=null;if(typeof n!=`function`){if(s=T(this,E,`m`,zt).call(this,nn(T(this,vt,`f`),n)),!r())return a();if(s===null)return o()}T(this,E,`m`,Wt).call(this);try{await T(this,E,`m`,Yt).call(this,s?.slots??null,r,!0)}catch(e){return console.error(`[VFX-JS] transition failed to wrap the element; cutting to the new content.`,e),a()}if(!r())return a();T(this,Ct,`f`).push(T(this,_t,`f`).lockSize(T(this,D,`f`))),T(this,Ct,`f`).push(T(this,_t,`f`).forceRender(T(this,D,`f`)));let c=await dn(T(this,yt,`f`).snapshot(),en);if(!r())return a();if(!c){T(this,E,`m`,Ut).call(this),await a(),r()&&T(this,E,`m`,Xt).call(this,e);return}s&&T(this,E,`m`,Ht).call(this,e,s);let l;try{await a(),typeof n==`function`&&r()&&(l=n())}catch(t){throw r()&&(T(this,E,`m`,Jt).call(this),T(this,yt,`f`).cancel(),T(this,E,`m`,Xt).call(this,e)),t}if(!r())return;if(s===null){if(s=T(this,E,`m`,zt).call(this,nn(T(this,vt,`f`),l)),!r())return;if(s===null)return o();try{await T(this,E,`m`,Yt).call(this,s.slots,r,!1)}catch(e){return console.error(`[VFX-JS] transition failed to swap the effects; cutting to the new content.`,e),o()}if(!r())return;T(this,E,`m`,Ht).call(this,e,s)}T(this,E,`m`,Wt).call(this);try{await T(this,E,`m`,Zt).call(this)}catch(e){console.error(`[VFX-JS] transition waitFor failed:`,e)}if(!r()||(!await T(this,_t,`f`).updateInTime(T(this,D,`f`))&&!T(this,Tt,`f`)&&(w(this,Tt,!0,`f`),console.warn(`[VFX-JS] transition: the new content was not captured in time; it may pop in during the run.`)),!r())||(await fn(),!r()))return;let u=await dn(T(this,yt,`f`).start({duration:s.run.duration,ease:s.ease,onEnd:()=>T(this,E,`m`,Jt).call(this,e)}),s.run.duration*1e3+en);r()&&(u||T(this,E,`m`,Ut).call(this),T(this,E,`m`,Xt).call(this,e))},zt=function(e){if(e.duration<=0)return null;let t=e.transition;if(!rn(t)&&!T(this,E,`m`,Bt).call(this,t))return null;let n,r;try{({transition:n,slots:r}=T(this,E,`m`,qt).call(this,t,e.params))}catch(e){return console.error(`[VFX-JS] transition "${t.name}" constructor failed; cutting to the new content.`,e),null}let i={reverse:e.reverse,duration:e.duration},a=e.overflow??n.overflow;return a!==void 0&&(i.overflow=a),{run:i,ease:e.ease??n.ease??`smoothstep`,slots:r}},Bt=function(e){let t=sn.get(e);return t&&t!==this?(T(this,Et,`f`)||(w(this,Et,!0,`f`),console.warn(`[VFX-JS] transition "${e.name??`unnamed`}" instance is running in another container; cutting to the new content. Pass the class to share it.`)),!1):(T(this,Pt,`f`)!==e&&T(this,E,`m`,Vt).call(this),sn.set(e,this),w(this,Pt,e,`f`),!0)},Vt=function(){let e=T(this,Pt,`f`);w(this,Pt,null,`f`),e&&sn.get(e)===this&&sn.delete(e)},Ht=function(e,{run:t,slots:n}){T(this,E,`m`,Jt).call(this),w(this,Ft,{id:e,slots:n},`f`);for(let e of n)e.start(t)},Ut=function(){T(this,wt,`f`)||(w(this,wt,!0,`f`),console.warn(`[VFX-JS] transition target did not render in time; cutting to the new content.`)),T(this,E,`m`,Jt).call(this),T(this,yt,`f`).cancel()},Wt=function(){T(this,St,`f`).push(T(this,_t,`f`).freezeInside(T(this,D,`f`)))},Gt=function(){let e=T(this,Ct,`f`);w(this,Ct,[],`f`);for(let t of e)t()},Kt=function(){let e=T(this,St,`f`);w(this,St,[],`f`);for(let t of e)t()},qt=function(e,t){let n=T(this,Nt,`f`);if(n?.key.source===e&&(!rn(e)||on(n.key.params,t)))return n;let r=rn(e)?new e(t):e,i=[new gt(r,T(this,yt,`f`))];return w(this,Nt,{key:{source:e,params:t},transition:r,slots:i},`f`),{transition:r,slots:i}},Jt=function(e){let t=T(this,Ft,`f`);if(t&&(e===void 0||t.id===e)){w(this,Ft,null,`f`);for(let e of t.slots)e.end()}},Yt=async function(e,t,n){if(T(this,jt,`f`)&&await T(this,jt,`f`),!t())return;let r=e===null?T(this,At,`f`)?T(this,Mt,`f`):[T(this,yt,`f`)]:[T(this,yt,`f`),...e];if(T(this,At,`f`)){if(!pn(r,T(this,Mt,`f`))){w(this,Mt,r,`f`);let e=T(this,_t,`f`).updateEffects(T(this,D,`f`),r).finally(()=>{w(this,jt,null,`f`)});w(this,jt,e,`f`),await e}n&&await T(this,_t,`f`).update(T(this,D,`f`))}else{let e=T(this,_t,`f`).addHTMLWithStill(T(this,D,`f`),{effect:r}).then(()=>{w(this,At,!0,`f`),w(this,Mt,r,`f`)}).finally(()=>{w(this,jt,null,`f`)});w(this,jt,e,`f`),await e}},Xt=function(e){if(T(this,bt,`f`)&&!T(this,kt,`f`))return;let t=()=>{e===T(this,Dt,`f`)&&T(this,At,`f`)&&(w(this,At,!1,`f`),w(this,Mt,[],`f`),T(this,_t,`f`).remove(T(this,D,`f`)))};T(this,jt,`f`)?T(this,jt,`f`).then(t,()=>{}):t()},Zt=function(){let e=T(this,vt,`f`).waitFor??`media`;return e===`none`?Promise.resolve():e===`media`?un(T(this,D,`f`),document.fonts?.ready):e(T(this,D,`f`))};function hn(e){let t=typeof window<`u`?window.devicePixelRatio:1,n;n=e.scrollPadding===void 0?[.1,.1]:e.scrollPadding===!1?[0,0]:Array.isArray(e.scrollPadding)?[e.scrollPadding[0]??.1,e.scrollPadding[1]??.1]:[e.scrollPadding,e.scrollPadding];let r;return r=e.postEffect===void 0?[]:Array.isArray(e.postEffect)?e.postEffect:[e.postEffect],{pixelRatio:e.pixelRatio??t,zIndex:e.zIndex??void 0,autoplay:e.autoplay??!0,fixedCanvas:e.scrollPadding===!1,scrollPadding:n,wrapper:e.wrapper,postEffects:r,preserveDrawingBuffer:e.preserveDrawingBuffer??!1,timeScale:e.timeScale??1}}var gn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},_n=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},vn,yn,bn,xn,Sn,Cn,wn,Tn,O=class{constructor(e,t,n){vn.add(this),this.wrapS=`clamp`,this.wrapT=`clamp`,this.minFilter=`linear`,this.magFilter=`linear`,this.needsUpdate=!0,this.source=null,yn.set(this,void 0),bn.set(this,!1),xn.set(this,void 0),Sn.set(this,void 0),gn(this,yn,e,`f`),this.gl=e.gl;let r=n?.externalHandle;gn(this,Sn,r!==void 0,`f`),r===void 0?_n(this,vn,`m`,Cn).call(this):(this.texture=r,gn(this,bn,!0,`f`),this.needsUpdate=!1),t&&(this.source=t),gn(this,xn,n?.autoRegister!==!1&&!_n(this,Sn,`f`),`f`),_n(this,xn,`f`)&&e.addResource(this)}restore(){_n(this,Sn,`f`)||(_n(this,vn,`m`,Cn).call(this),gn(this,bn,!1,`f`),this.needsUpdate=!0)}bind(e){let t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&=(_n(this,vn,`m`,wn).call(this),!1)}dispose(){_n(this,xn,`f`)&&_n(this,yn,`f`).removeResource(this),_n(this,Sn,`f`)||this.gl.deleteTexture(this.texture)}};yn=new WeakMap,bn=new WeakMap,xn=new WeakMap,Sn=new WeakMap,vn=new WeakSet,Cn=function(){let e=this.gl.createTexture();if(!e)throw Error(`[VFX-JS] Failed to create texture`);this.texture=e},wn=function(){let e=this.gl,t=this.source;if(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4),t)try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)}catch(e){console.error(e)}else if(!_n(this,bn,`f`)){let t=new Uint8Array([0,0,0,0]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,t)}_n(this,vn,`m`,Tn).call(this),gn(this,bn,!0,`f`)},Tn=function(){let e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,En(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,En(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,Dn(e,this.minFilter)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,Dn(e,this.magFilter))};function En(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function Dn(e,t){return t===`nearest`?e.NEAREST:e.LINEAR}function On(e){return new Promise((t,n)=>{let r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>t(r),r.onerror=n,r.src=e})}var kn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},An=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},jn,Mn,Nn,Pn=class{constructor(e,t,n,r={}){jn.add(this),Mn.set(this,void 0),kn(this,Mn,e,`f`),this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(n)),this.float=r.float??!1,this.mipmap=r.mipmap??!1,this.texture=new O(e,void 0,{autoRegister:!1});let i=r.wrap;i!==void 0&&(typeof i==`string`?(this.texture.wrapS=i,this.texture.wrapT=i):(this.texture.wrapS=i[0],this.texture.wrapT=i[1])),r.filter!==void 0&&(this.texture.minFilter=r.filter,this.texture.magFilter=r.filter),An(this,jn,`m`,Nn).call(this),e.addResource(this)}setSize(e,t){let n=Math.max(1,Math.floor(e)),r=Math.max(1,Math.floor(t));(n!==this.width||r!==this.height)&&(this.width=n,this.height=r,An(this,jn,`m`,Nn).call(this))}restore(){this.texture.restore(),An(this,jn,`m`,Nn).call(this)}dispose(){An(this,Mn,`f`).removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.texture.dispose()}generateMipmaps(){if(!this.mipmap)return;let e=this.gl;e.bindTexture(e.TEXTURE_2D,this.texture.texture),e.generateMipmap(e.TEXTURE_2D),e.bindTexture(e.TEXTURE_2D,null)}};Mn=new WeakMap,jn=new WeakSet,Nn=function(){let e=this.gl,t=this.fbo,n=e.createFramebuffer();if(!n)throw Error(`[VFX-JS] Failed to create framebuffer`);this.fbo=n;let r=this.texture.texture;e.bindTexture(e.TEXTURE_2D,r);let i=An(this,Mn,`f`).floatLinearFilter;if(this.float&&i&&!An(this,Mn,`f`).floatBlend)throw Error(`[VFX-JS] EXT_float_blend is not supported.`);let a=this.float?i?e.RGBA32F:e.RGBA16F:e.RGBA8,o=this.float?i?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;if(this.mipmap){let t=Math.floor(Math.log2(Math.max(this.width,this.height)))+1,n=this.width,r=this.height;for(let i=0;i<t;i++)e.texImage2D(e.TEXTURE_2D,i,a,n,r,0,e.RGBA,o,null),n=Math.max(1,n>>1),r=Math.max(1,r>>1)}else e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,e.RGBA,o,null);let s=this.texture.minFilter===`nearest`?e.NEAREST:e.LINEAR,c=this.texture.magFilter===`nearest`?e.NEAREST:e.LINEAR,l=this.mipmap?this.texture.minFilter===`nearest`?e.NEAREST_MIPMAP_NEAREST:e.LINEAR_MIPMAP_LINEAR:s,u=Fn(e,this.texture.wrapS),d=Fn(e,this.texture.wrapT);e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,l),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,c),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,u),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,d),e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.texture.needsUpdate=!1,this.texture.source=null,t&&e.deleteFramebuffer(t)};function Fn(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function In(e,t,n,r){return{x:e.left+n,y:t-r-e.bottom,w:e.right-e.left,h:e.bottom-e.top}}function Ln(e,t,n,r){return{x:e,y:t,w:n,h:r}}var Rn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},zn=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Bn,Vn,Hn,Un,Wn=class{constructor(e,t,n,r,i,a={}){Bn.set(this,void 0),Vn.set(this,void 0),Hn.set(this,void 0),Un.set(this,void 0),Rn(this,Bn,t,`f`),Rn(this,Vn,n,`f`),Rn(this,Hn,r,`f`);let o=t*r,s=n*r,c={float:i,wrap:a.wrap,filter:a.filter,mipmap:a.mipmap};Rn(this,Un,[new Pn(e,o,s,c),new Pn(e,o,s,c)],`f`)}get texture(){return zn(this,Un,`f`)[0].texture}get target(){return zn(this,Un,`f`)[1]}resize(e,t){if(e===zn(this,Bn,`f`)&&t===zn(this,Vn,`f`))return;Rn(this,Bn,e,`f`),Rn(this,Vn,t,`f`);let n=e*zn(this,Hn,`f`),r=t*zn(this,Hn,`f`);zn(this,Un,`f`)[0].setSize(n,r),zn(this,Un,`f`)[1].setSize(n,r)}swap(){Rn(this,Un,[zn(this,Un,`f`)[1],zn(this,Un,`f`)[0]],`f`)}getViewport(){return Ln(0,0,zn(this,Bn,`f`),zn(this,Vn,`f`))}dispose(){zn(this,Un,`f`)[0].dispose(),zn(this,Un,`f`)[1].dispose()}};Bn=new WeakMap,Vn=new WeakMap,Hn=new WeakMap,Un=new WeakMap;var Gn=class{constructor(e=0,t=0){this.x=0,this.y=0,this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}},Kn=class{constructor(e=0,t=0,n=0,r=0){this.x=0,this.y=0,this.z=0,this.w=0,this.x=e,this.y=t,this.z=n,this.w=r}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}},qn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Jn=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Yn,Xn,Zn,Qn,$n,er,tr;function nr(e){return/#version\s+300\s+es\b/.test(e)?`300 es`:/#version\s+100\b/.test(e)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(e)?`100`:`300 es`}var rr=class{constructor(e,t,n,r){Yn.add(this),Xn.set(this,void 0),Zn.set(this,void 0),Qn.set(this,void 0),$n.set(this,void 0),er.set(this,new Map),qn(this,Xn,e,`f`),this.gl=e.gl,qn(this,Zn,t,`f`),qn(this,Qn,n,`f`),qn(this,$n,r??nr(n),`f`),Jn(this,Yn,`m`,tr).call(this),e.addResource(this)}restore(){Jn(this,Yn,`m`,tr).call(this)}use(){this.gl.useProgram(this.program)}hasUniform(e){return Jn(this,er,`f`).has(e)}uploadUniforms(e){let t=this.gl,n=0;for(let[r,i]of Jn(this,er,`f`)){let a=e[r];if(!a)continue;let o=a.value;o!=null&&(or(i.type)?o instanceof O&&(o.bind(n),t.uniform1i(i.location,n),n++):o instanceof O||cr(t,i,o))}}dispose(){Jn(this,Xn,`f`).removeResource(this),this.gl.deleteProgram(this.program)}};Xn=new WeakMap,Zn=new WeakMap,Qn=new WeakMap,$n=new WeakMap,er=new WeakMap,Yn=new WeakSet,tr=function(){let e=this.gl,t=ir(e,e.VERTEX_SHADER,ar(Jn(this,Zn,`f`),Jn(this,$n,`f`))),n=ir(e,e.FRAGMENT_SHADER,ar(Jn(this,Qn,`f`),Jn(this,$n,`f`))),r=e.createProgram();if(!r)throw Error(`[VFX-JS] Failed to create program`);if(e.attachShader(r,t),e.attachShader(r,n),e.bindAttribLocation(r,0,`position`),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let i=e.getProgramInfoLog(r)??``;throw e.deleteShader(t),e.deleteShader(n),e.deleteProgram(r),Error(`[VFX-JS] Program link failed: ${i}`)}e.detachShader(r,t),e.detachShader(r,n),e.deleteShader(t),e.deleteShader(n),this.program=r,Jn(this,er,`f`).clear();let i=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<i;t++){let n=e.getActiveUniform(r,t);if(!n)continue;let i=n.name.replace(/\[0\]$/,``),a=e.getUniformLocation(r,n.name);a&&Jn(this,er,`f`).set(i,{location:a,type:n.type,size:n.size})}};function ir(e,t,n){let r=e.createShader(t);if(!r)throw Error(`[VFX-JS] Failed to create shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)??``;throw e.deleteShader(r),Error(`[VFX-JS] Shader compile failed: ${t}\n\n${n}`)}return r}function ar(e,t){return e.replace(/^\s+/,``).startsWith(`#version`)||t===`100`?e:`#version 300 es\n${e}`}function or(e){return e===35678||e===36298||e===36306||e===35682}var sr=new Set;function cr(e,t,n){let r=t.location,i=t.size>1,a=n,o=n,s=n;switch(t.type){case e.FLOAT:i?e.uniform1fv(r,a):e.uniform1f(r,n);return;case e.FLOAT_VEC2:if(i)e.uniform2fv(r,a);else if(n instanceof Gn)e.uniform2f(r,n.x,n.y);else{let t=n;e.uniform2f(r,t[0],t[1])}return;case e.FLOAT_VEC3:if(i)e.uniform3fv(r,a);else{let t=n;e.uniform3f(r,t[0],t[1],t[2])}return;case e.FLOAT_VEC4:if(i)e.uniform4fv(r,a);else if(n instanceof Kn)e.uniform4f(r,n.x,n.y,n.z,n.w);else{let t=n;e.uniform4f(r,t[0],t[1],t[2],t[3])}return;case e.INT:i?e.uniform1iv(r,o):e.uniform1i(r,n);return;case e.INT_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,t[0],t[1])}return;case e.INT_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,t[0],t[1],t[2])}return;case e.INT_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,t[0],t[1],t[2],t[3])}return;case e.BOOL:i?e.uniform1iv(r,o):e.uniform1i(r,+!!n);return;case e.BOOL_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,+!!t[0],+!!t[1])}return;case e.BOOL_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,+!!t[0],+!!t[1],+!!t[2])}return;case e.BOOL_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,+!!t[0],+!!t[1],+!!t[2],+!!t[3])}return;case e.FLOAT_MAT2:e.uniformMatrix2fv(r,!1,a);return;case e.FLOAT_MAT3:e.uniformMatrix3fv(r,!1,a);return;case e.FLOAT_MAT4:e.uniformMatrix4fv(r,!1,a);return;case e.UNSIGNED_INT:i?e.uniform1uiv(r,s):e.uniform1ui(r,n);return;case e.UNSIGNED_INT_VEC2:if(i)e.uniform2uiv(r,s);else{let t=n;e.uniform2ui(r,t[0],t[1])}return;case e.UNSIGNED_INT_VEC3:if(i)e.uniform3uiv(r,s);else{let t=n;e.uniform3ui(r,t[0],t[1],t[2])}return;case e.UNSIGNED_INT_VEC4:if(i)e.uniform4uiv(r,s);else{let t=n;e.uniform4ui(r,t[0],t[1],t[2],t[3])}return;default:sr.has(t.type)||(sr.add(t.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${t.type.toString(16)}; skipping upload.`));return}}var lr=class{constructor(e,t,n,r,i,a){this.gl=e.gl,this.program=new rr(e,t,n,a),this.uniforms=r,this.blend=i}dispose(){this.program.dispose()}};function ur(e,t,n,r,i,a,o,s){let c=r?r.width/s:a,l=r?r.height/s:o,u=Math.max(0,i.x),d=Math.max(0,i.y),f=Math.min(c,i.x+i.w),p=Math.min(l,i.y+i.h),m=f-u,h=p-d;m<=0||h<=0||(e.bindFramebuffer(e.FRAMEBUFFER,r?r.fbo:null),e.viewport(Math.round(u*s),Math.round(d*s),Math.round(m*s),Math.round(h*s)),dr(e,n.blend),n.program.use(),n.program.uploadUniforms(n.uniforms),t.draw())}function dr(e,t){t===`none`?e.disable(e.BLEND):(e.enable(e.BLEND),e.blendEquation(e.FUNC_ADD),t===`premultiplied`?e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA):t===`additive`?e.blendFuncSeparate(e.ONE,e.ONE,e.ONE,e.ONE):e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA))}var fr=class{constructor(e){this.uniforms={src:{value:null},offset:{value:new Gn},resolution:{value:new Gn},viewport:{value:new Kn}},this.pass=new lr(e,n,r,this.uniforms,`premultiplied`)}setUniforms(e,t,n){this.uniforms.src.value=e,this.uniforms.resolution.value.set(n.w*t,n.h*t),this.uniforms.offset.value.set(n.x*t,n.y*t)}dispose(){this.pass.dispose()}},pr=e=>{let t=document.implementation.createHTMLDocument(`test`),n=t.createRange();n.selectNodeContents(t.documentElement),n.deleteContents();let r=document.createElement(`head`);return t.documentElement.appendChild(r),t.documentElement.appendChild(n.createContextualFragment(e)),t.documentElement.setAttribute(`xmlns`,t.documentElement.namespaceURI),new XMLSerializer().serializeToString(t).replace(/<!DOCTYPE html>/,``)};async function mr(e,t,n,r){let i=e.getBoundingClientRect(),a=window.devicePixelRatio,o=Math.ceil(i.width),s=Math.ceil(i.height),c=o*a,l=s*a,u=1,d=c,f=l;r&&(d>r||f>r)&&(u=Math.min(r/d,r/f),d=Math.floor(d*u),f=Math.floor(f*u));let p=n&&n.width===d&&n.height===f?n:new OffscreenCanvas(d,f),m=e.cloneNode(!0);await hr(e,m),gr(e,m),m.style.setProperty(`opacity`,t.toString()),m.style.setProperty(`margin`,`0px`),_r(m),vr(e,m),m.style.setProperty(`box-sizing`,`border-box`),m.style.setProperty(`width`,`${o}px`),m.style.setProperty(`height`,`${s}px`);let h=m.outerHTML,ee=`<svg xmlns="http://www.w3.org/2000/svg" width="${c}" height="${l}"><foreignObject width="100%" height="100%">${pr(h)}</foreignObject></svg>`;return new Promise((e,t)=>{let n=new Image;n.onload=()=>{let r=p.getContext(`2d`);if(r===null)return t();r.clearRect(0,0,d,f);let i=a*u;r.scale(i,i),r.drawImage(n,0,0,c,l),r.setTransform(1,0,0,1,0,0),e(p)},n.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(ee)}`})}async function hr(e,t){let n=window.getComputedStyle(e);for(let e of Array.from(n))/(-inline-|-block-|^inline-|^block-)/.test(e)||/^-webkit-.*(start|end|before|after|logical)/.test(e)||t.style.setProperty(e,n.getPropertyValue(e),n.getPropertyPriority(e));if(t.tagName===`INPUT`)t.setAttribute(`value`,t.value);else if(t.tagName===`TEXTAREA`)t.innerHTML=t.value;else if(t.tagName===`IMG`)try{t.src=await xr(p(e))}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];await hr(r,i)}}function gr(e,t){if(typeof e.computedStyleMap==`function`)try{let n=e.computedStyleMap();for(let e of[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`]){let r=n.get(e);r instanceof CSSKeywordValue&&r.value===`auto`&&t.style.setProperty(e,`auto`)}}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];r instanceof HTMLElement&&i instanceof HTMLElement&&gr(r,i)}}function _r(e){let t=e;for(;;){let e=t.style;if(Number.parseFloat(e.paddingTop)>0||Number.parseFloat(e.borderTopWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.firstElementChild;if(!n)break;n.style.setProperty(`margin-top`,`0px`),t=n}for(t=e;;){let e=t.style;if(Number.parseFloat(e.paddingBottom)>0||Number.parseFloat(e.borderBottomWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.lastElementChild;if(!n)break;n.style.setProperty(`margin-bottom`,`0px`),t=n}}function vr(e,t){let n=-e.scrollLeft,r=-e.scrollTop;for(let i=0;i<e.children.length;i++){let a=e.children[i],o=t.children[i];a&&(o instanceof HTMLElement||o instanceof SVGElement)&&((n!==0||r!==0)&&yr(o,n,r),vr(a,o))}}function yr(e,t,n){let r=e.style.getPropertyValue(`translate`),[i=`0px`,a=`0px`,o]=r&&r!==`none`?br(r):[],s=`calc(${i} + ${t}px) calc(${a} + ${n}px)`;e.style.setProperty(`translate`,o?`${s} ${o}`:s)}function br(e){let t=[],n=0,r=``;for(let i of e.trim())i===`(`?n++:i===`)`&&n--,i===` `&&n===0?(r&&t.push(r),r=``):r+=i;return r&&t.push(r),t}async function xr(e){let t=await fetch(e).then(e=>e.blob());return new Promise(e=>{let n=new FileReader;n.onload=function(){e(this.result)},n.readAsDataURL(t)})}var Sr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},k=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Cr,wr,Tr,Er,Dr,Or,kr,Ar,jr,Mr,Nr,Pr,Fr=Object.freeze({__brand:`EffectQuad`});function Ir(e){return e===Fr}function Lr(e,t){switch(t){case`lines`:return e.LINES;case`lineStrip`:return e.LINE_STRIP;case`points`:return e.POINTS;default:return e.TRIANGLES}}function Rr(e,t){if(t instanceof Float32Array)return e.FLOAT;if(t instanceof Uint8Array)return e.UNSIGNED_BYTE;if(t instanceof Uint16Array)return e.UNSIGNED_SHORT;if(t instanceof Uint32Array)return e.UNSIGNED_INT;if(t instanceof Int8Array)return e.BYTE;if(t instanceof Int16Array)return e.SHORT;if(t instanceof Int32Array)return e.INT;throw Error(`[VFX-JS] Unsupported attribute typed array`)}function zr(e,t){if(ArrayBuffer.isView(t)&&!(t instanceof DataView))return{name:e,data:t,itemSize:2,normalized:!1,perInstance:!1};let n=t;return{name:e,data:n.data,itemSize:n.itemSize,normalized:n.normalized??!1,perInstance:n.perInstance??!1}}var Br=class{constructor(e,t,n){Cr.add(this),wr.set(this,void 0),Tr.set(this,void 0),Er.set(this,void 0),Dr.set(this,[]),Or.set(this,null),this.indexType=0,this.hasIndices=!1,this.drawCount=0,this.drawStart=0,kr.set(this,!1),Sr(this,wr,e,`f`),this.gl=e.gl,Sr(this,Tr,t,`f`),Sr(this,Er,n,`f`),this.mode=Lr(this.gl,t.mode),this.instanceCount=t.instanceCount??0,k(this,Cr,`m`,Ar).call(this),e.addResource(this),Sr(this,kr,!0,`f`)}restore(){Sr(this,Dr,[],`f`),Sr(this,Or,null,`f`),k(this,Cr,`m`,Ar).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),this.hasIndices?this.instanceCount>0?e.drawElementsInstanced(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2),this.instanceCount):e.drawElements(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2)):this.instanceCount>0?e.drawArraysInstanced(this.mode,this.drawStart,this.drawCount,this.instanceCount):e.drawArrays(this.mode,this.drawStart,this.drawCount)}dispose(){k(this,kr,`f`)&&(k(this,wr,`f`).removeResource(this),Sr(this,kr,!1,`f`));let e=this.gl;e.deleteVertexArray(this.vao);for(let t of k(this,Dr,`f`))e.deleteBuffer(t);k(this,Or,`f`)&&e.deleteBuffer(k(this,Or,`f`)),Sr(this,Dr,[],`f`),Sr(this,Or,null,`f`)}};wr=new WeakMap,Tr=new WeakMap,Er=new WeakMap,Dr=new WeakMap,Or=new WeakMap,kr=new WeakMap,Cr=new WeakSet,Ar=function(){let e=this.gl,t=e.createVertexArray();if(!t)throw Error(`[VFX-JS] Failed to create VAO`);this.vao=t,e.bindVertexArray(t);let n=k(this,Er,`f`).program,r=null;for(let[t,i]of Object.entries(k(this,Tr,`f`).attributes)){let a=zr(t,i),o=e.getAttribLocation(n,a.name);if(o<0)continue;let s=e.createBuffer();if(!s)throw Error(`[VFX-JS] Failed to create VBO for "${a.name}"`);k(this,Dr,`f`).push(s),e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,a.data,e.STATIC_DRAW);let c=Rr(e,a.data);e.enableVertexAttribArray(o),c===e.FLOAT||c===e.HALF_FLOAT||a.normalized?e.vertexAttribPointer(o,a.itemSize,c,a.normalized,0,0):e.vertexAttribIPointer(o,a.itemSize,c,0,0),a.perInstance&&e.vertexAttribDivisor(o,1),t===`position`&&r===null&&(r=a.data.length/a.itemSize)}let i=0,a=k(this,Tr,`f`).indices;if(a){let t=e.createBuffer();if(!t)throw Error(`[VFX-JS] Failed to create IBO`);Sr(this,Or,t,`f`),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t),e.bufferData(e.ELEMENT_ARRAY_BUFFER,a,e.STATIC_DRAW),this.hasIndices=!0,this.indexType=a instanceof Uint32Array?e.UNSIGNED_INT:e.UNSIGNED_SHORT,i=a.length}else this.hasIndices=!1;e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null),k(this,Or,`f`)&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null);let o=this.hasIndices?i:r??0,s=k(this,Tr,`f`).drawRange;this.drawStart=s?.start??0,this.drawCount=s?.count===void 0?Math.max(0,o-this.drawStart):s.count};var Vr=class{constructor(e,t){jr.set(this,void 0),Mr.set(this,void 0),Nr.set(this,new WeakMap),Pr.set(this,new Set),Sr(this,jr,e,`f`),Sr(this,Mr,t,`f`)}get quad(){return k(this,Mr,`f`)}resolve(e,t){let n=k(this,Nr,`f`).get(e);n||(n=new Map,k(this,Nr,`f`).set(e,n));let r=n.get(t);return r||(r=new Br(k(this,jr,`f`),e,t),n.set(t,r),k(this,Pr,`f`).add(r)),r}release(e){let t=k(this,Nr,`f`).get(e);if(t){for(let e of t.values())e.dispose(),k(this,Pr,`f`).delete(e);k(this,Nr,`f`).delete(e)}}dispose(){for(let e of k(this,Pr,`f`))e.dispose();k(this,Pr,`f`).clear()}};jr=new WeakMap,Mr=new WeakMap,Nr=new WeakMap,Pr=new WeakMap;var A=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},j=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Hr,Ur,Wr,Gr,Kr,qr,Jr,Yr,Xr,Zr,Qr,$r,M,N,ei,ti,ni,ri,ii,ai,oi,si,ci,li=Symbol.for(`@vfx-js/effect.resolve-texture`),ui=Symbol.for(`@vfx-js/effect.resolve-rt`);function di(e){return e[li]()}function fi(e){return e[ui]}var pi=`#version 300 es
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
`,mi=`
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
`,hi=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`,gi=`
precision highp float;
varying vec2 uv;
uniform sampler2D src;
void main() {
    gl_FragColor = texture2D(src, uv);
}
`,_i=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    bool inside = all(greaterThanEqual(uvSrc, vec2(0.0))) && all(lessThanEqual(uvSrc, vec2(1.0)));
    outColor = inside ? texture(src, uvSrc) : vec4(0.0);
}
`,vi=`
precision highp float;
varying vec2 uvSrc;
uniform sampler2D src;
void main() {
    bool inside = all(greaterThanEqual(uvSrc, vec2(0.0))) && all(lessThanEqual(uvSrc, vec2(1.0)));
    gl_FragColor = inside ? texture2D(src, uvSrc) : vec4(0.0);
}
`,yi=class{constructor(e,t,n,r,i,a){Hr.add(this),Ur.set(this,void 0),Wr.set(this,void 0),Gr.set(this,void 0),Kr.set(this,void 0),qr.set(this,void 0),Jr.set(this,[]),Yr.set(this,[]),Xr.set(this,[]),Zr.set(this,[]),Qr.set(this,`init`),$r.set(this,!1),M.set(this,void 0),N.set(this,void 0),ri.set(this,[]),A(this,Ur,e,`f`),A(this,Wr,e.gl,`f`),A(this,Gr,n,`f`),A(this,Kr,a,`f`),A(this,qr,new Vr(e,t),`f`),A(this,M,{outputBufferW:1,outputBufferH:1,canvasBufferSize:[1,1],outputViewport:{x:0,y:0,w:1,h:1},elementBufferW:1,elementBufferH:1,contentRectUv:[0,0,1,1],srcRectUv:[0,0,1,1]},`f`);let o={time:0,deltaTime:0,pixelRatio:n,resolution:[1,1],mouse:[0,0],mouseViewport:[0,0],intersection:0,enterTime:0,leaveTime:0,src:r,target:null,uniforms:{},vfxProps:i,dims:{element:[1,1],elementPixel:[1,1],canvas:[1,1],canvasPixel:[1,1],pixelRatio:n,contentRect:[0,0,1,1],srcRect:[0,0,1,1],canvasRect:[0,0,1,1]},quad:Fr,gl:j(this,Wr,`f`),createRenderTarget:e=>j(this,Hr,`m`,ei).call(this,e),releaseGeometry:e=>j(this,qr,`f`).release(e),wrapTexture:(e,t)=>j(this,Hr,`m`,ni).call(this,e,t),draw:e=>j(this,Hr,`m`,ii).call(this,e),blit:(e,t,n)=>j(this,Hr,`m`,ai).call(this,e,t,n),clear:e=>j(this,Hr,`m`,oi).call(this,e),onContextRestored:e=>{let t=j(this,Ur,`f`).onContextRestored(e);return j(this,Zr,`f`).push(t),t}};A(this,N,o,`f`)}get ctx(){return j(this,N,`f`)}setPhase(e){A(this,Qr,e,`f`)}setFrameDims(e){A(this,M,e,`f`),j(this,N,`f`).resolution=[e.canvasBufferSize[0],e.canvasBufferSize[1]];for(let t of j(this,Xr,`f`))t.resolver.resize?.(e.outputBufferW,e.outputBufferH)}setEffectDims(e){j(this,N,`f`).dims=e}setFrameState(e){let t=j(this,N,`f`);t.time=e.time,t.deltaTime=e.deltaTime,t.mouse=e.mouse,t.mouseViewport=e.mouseViewport,t.intersection=e.intersection,t.enterTime=e.enterTime,t.leaveTime=e.leaveTime,t.uniforms=e.uniforms}setSrc(e){j(this,N,`f`).src=e}setOutput(e){j(this,N,`f`).target=e}passthroughCopy(e,t,n){let r=j(this,Qr,`f`);A(this,Qr,`render`,`f`);let i=j(this,N,`f`).target;j(this,N,`f`).target=t;try{let r=j(this,M,`f`).outputViewport;j(this,M,`f`).outputViewport={...n};let i=j(this,N,`f`).vfxProps.glslVersion===`100`?gi:hi;j(this,Hr,`m`,si).call(this,{frag:i,uniforms:{src:e},target:t}),j(this,M,`f`).outputViewport=r}finally{j(this,N,`f`).target=i,A(this,Qr,r,`f`)}}clearRt(e){let t=j(this,Wr,`f`),n=fi(e);t.bindFramebuffer(t.FRAMEBUFFER,n.getWriteFbo().fbo),t.viewport(0,0,e.width,e.height),t.clearColor(0,0,0,0),t.disable(t.SCISSOR_TEST),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)}tickAutoUpdates(){for(let e of j(this,ri,`f`))e()}dispose(){A(this,Qr,`disposed`,`f`);for(let e of j(this,Zr,`f`))e();A(this,Zr,[],`f`);for(let e of j(this,Yr,`f`))e.resolver.dispose?.();A(this,Yr,[],`f`),A(this,Xr,[],`f`);for(let e of j(this,Jr,`f`))e.dispose();A(this,Jr,[],`f`),j(this,qr,`f`).dispose(),A(this,ri,[],`f`)}};Ur=new WeakMap,Wr=new WeakMap,Gr=new WeakMap,Kr=new WeakMap,qr=new WeakMap,Jr=new WeakMap,Yr=new WeakMap,Xr=new WeakMap,Zr=new WeakMap,Qr=new WeakMap,$r=new WeakMap,M=new WeakMap,N=new WeakMap,ri=new WeakMap,Hr=new WeakSet,ei=function(e){let t=e?.persistent??!1,n=e?.float??!1,r=xi(e?.wrap),i=e?.filter,a=e?.mipmap??!1,o=a!==!1,s=a===!0,c=e?.size,l=c?c[0]:j(this,M,`f`).outputBufferW,u=c?c[1]:j(this,M,`f`).outputBufferH,d,f,p;if(t){let e=c?1:j(this,Gr,`f`),t=c?l:l/e,a=c?u:u/e,m=new Wn(j(this,Ur,`f`),t,a,e,n,{wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>m.texture,getWriteFbo:()=>m.target,swap:()=>m.swap(),resize:c?void 0:(e,t)=>{m.resize(e/j(this,Gr,`f`),t/j(this,Gr,`f`))},dispose:()=>m.dispose()},o&&(d.regenerateMipmaps=()=>m.target.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>m.target.width,p=()=>m.target.height}else{let e=new Pn(j(this,Ur,`f`),l,u,{float:n,wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>e.texture,getWriteFbo:()=>e,resize:c?void 0:(t,n)=>e.setSize(t,n),dispose:()=>e.dispose()},o&&(d.regenerateMipmaps=()=>e.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>e.width,p=()=>e.height}let m,h=wi(d,f,p,()=>j(this,Hr,`m`,ti).call(this,m));return m={handle:h,resolver:d},j(this,Yr,`f`).push(m),c||j(this,Xr,`f`).push(m),h},ti=function(e){let t=j(this,Yr,`f`).indexOf(e);if(t<0)return;j(this,Yr,`f`).splice(t,1);let n=j(this,Xr,`f`).indexOf(e);n>=0&&j(this,Xr,`f`).splice(n,1),e.resolver.dispose?.()},ni=function(e,t){let n=xi(t?.wrap),r=t?.filter,i,a,o,s=null;if(bi(e)){if(!t?.size)throw Error(`[VFX-JS] wrapTexture(WebGLTexture) requires opts.size`);let[n,r]=t.size;i=new O(j(this,Ur,`f`),void 0,{autoRegister:!1,externalHandle:e}),a=()=>n,o=()=>r}else{let n=e;i=new O(j(this,Ur,`f`),n);let r=t?.size,c=e=>{if(r)return e===`w`?r[0]:r[1];if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return e===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return e===`w`?n.videoWidth:n.videoHeight;let t=n;return e===`w`?t.width:t.height};a=()=>c(`w`),o=()=>c(`h`);let l=typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement||typeof HTMLCanvasElement<`u`&&n instanceof HTMLCanvasElement||typeof OffscreenCanvas<`u`&&n instanceof OffscreenCanvas;(t?.autoUpdate??l)&&(s=()=>{i.needsUpdate=!0})}i.wrapS=n[0],i.wrapT=n[1],r!==void 0&&(i.minFilter=r,i.magFilter=r),j(this,Jr,`f`).push(i),s&&j(this,ri,`f`).push(s);let c=!1;return Ci(()=>i,a,o,()=>{if(c)return;c=!0;let e=j(this,Jr,`f`).indexOf(i);if(e!==-1&&j(this,Jr,`f`).splice(e,1),s){let e=j(this,ri,`f`).indexOf(s);e!==-1&&j(this,ri,`f`).splice(e,1)}i.dispose()})},ii=function(e){j(this,Qr,`f`)===`render`?j(this,Hr,`m`,si).call(this,e):j(this,Qr,`f`)===`update`&&!j(this,$r,`f`)&&(A(this,$r,!0,`f`),console.warn(`[VFX-JS] ctx.draw() called in update(); ignored. Move draws to render().`))},ai=function(e,t,n){if(j(this,Qr,`f`)!==`render`){j(this,Qr,`f`)===`update`&&!j(this,$r,`f`)&&(A(this,$r,!0,`f`),console.warn(`[VFX-JS] ctx.blit() called in update(); ignored. Move draws to render().`));return}let r=j(this,N,`f`).vfxProps.glslVersion===`100`?vi:_i;j(this,Hr,`m`,si).call(this,{frag:r,uniforms:{src:e},target:t,blend:n?.blend,swap:n?.swap})},oi=function(e){if(j(this,Qr,`f`)!==`render`){j(this,Qr,`f`)===`update`&&!j(this,$r,`f`)&&(A(this,$r,!0,`f`),console.warn(`[VFX-JS] ctx.clear() called in update(); ignored. Move draws to render().`));return}let t=j(this,Wr,`f`),n=j(this,N,`f`).target,r=e??n,i=r===null||r===n;if(t.clearColor(0,0,0,0),i){let e=r===null?null:fi(r).getWriteFbo().fbo,n=j(this,M,`f`).outputViewport;t.bindFramebuffer(t.FRAMEBUFFER,e),t.enable(t.SCISSOR_TEST),t.scissor(n.x,n.y,n.w,n.h),t.clear(t.COLOR_BUFFER_BIT),t.disable(t.SCISSOR_TEST),t.bindFramebuffer(t.FRAMEBUFFER,null);return}let a=fi(r);t.disable(t.SCISSOR_TEST);let o=()=>{t.bindFramebuffer(t.FRAMEBUFFER,a.getWriteFbo().fbo),t.clear(t.COLOR_BUFFER_BIT)};o(),a.swap&&(a.swap(),o(),a.swap()),t.bindFramebuffer(t.FRAMEBUFFER,null)},si=function(e){let t=j(this,Wr,`f`),n=e.vert??(j(this,N,`f`).vfxProps.glslVersion===`100`?mi:pi),r=j(this,Kr,`f`).get(n,e.frag,j(this,N,`f`).vfxProps.glslVersion),i=j(this,N,`f`).target,a=e.target===void 0||e.target===null?i:e.target,o=a===null||a===i,s,c,l,u,d,f,p;if(a===null)s=null,c=j(this,M,`f`).outputViewport.x,l=j(this,M,`f`).outputViewport.y,u=j(this,M,`f`).outputViewport.w,d=j(this,M,`f`).outputViewport.h;else{let e=fi(a);s=e.getWriteFbo().fbo,o?(c=j(this,M,`f`).outputViewport.x,l=j(this,M,`f`).outputViewport.y,u=j(this,M,`f`).outputViewport.w,d=j(this,M,`f`).outputViewport.h):(c=0,l=0,u=a.width,d=a.height),f=e.swap,e.mipmapAutoRegen&&(p=e.regenerateMipmaps)}t.bindFramebuffer(t.FRAMEBUFFER,s),t.viewport(c,l,u,d),t.disable(t.SCISSOR_TEST),dr(t,e.blend??(a===null?`premultiplied`:`none`)),r.use();let m=j(this,Hr,`m`,ci).call(this,e.uniforms);r.uploadUniforms(m);let h=e.geometry??Fr;Ir(h)?j(this,qr,`f`).quad.draw():j(this,qr,`f`).resolve(h,r).draw(),p?.(),f&&e.swap!==!1&&f()},ci=function(e){let t={};if(t.contentRectUv={value:j(this,M,`f`).contentRectUv},t.srcRectUv={value:j(this,M,`f`).srcRectUv},!e)return t;for(let[n,r]of Object.entries(e))t[n]=Si(r);return t};function bi(e){let t=globalThis.WebGLTexture;if(t&&typeof t==`function`&&e instanceof t)return!0;let n=e;return n.width===void 0&&n.naturalWidth===void 0&&n.videoWidth===void 0}function xi(e){return e===void 0?[`clamp`,`clamp`]:typeof e==`string`?[e,e]:[e[0],e[1]]}function Si(e){return typeof e==`object`&&e&&`__brand`in e?e.__brand===`EffectRenderTarget`?{value:fi(e).getReadTexture()}:{value:di(e)}:{value:e}}function Ci(e,t,n,r){let i={__brand:`EffectTexture`,get width(){return t()},get height(){return n()},dispose(){r?.()}};return Object.defineProperty(i,li,{value:e}),i}function wi(e,t,n,r){let i={__brand:`EffectRenderTarget`,get width(){return t()},get height(){return n()},dispose:r??(()=>{}),generateMipmaps:()=>e.regenerateMipmaps?.()};return Object.defineProperty(i,ui,{value:e}),i}function Ti(e){return wi({getReadTexture:()=>e.texture,getWriteFbo:()=>e},()=>e.width,()=>e.height)}function Ei(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:Array.isArray(e)?{top:e[0],right:e[1],bottom:e[2],left:e[3]}:{top:e.top??0,right:e.right??0,bottom:e.bottom??0,left:e.left??0}}function Di(e){return Ei(e)}var Oi={top:0,right:0,bottom:0,left:0};function ki(e){return Ei(e)}function Ai(e){return{top:e.top,right:e.right,bottom:e.bottom,left:e.left}}function ji(e){return{top:e.top,left:e.left,right:e.left+Math.ceil(e.right-e.left),bottom:e.top+Math.ceil(e.bottom-e.top)}}function Mi(e,t){return{top:e.top-t.top,right:e.right+t.right,bottom:e.bottom+t.bottom,left:e.left-t.left}}function Ni(e,t,n){return Math.min(Math.max(e,t),n)}function Pi(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return c<=0||l<=0?[0,0,1,1]:[(n-o)/c,(r-s)/l,i/c,a/l]}function Fi(e,t){let n=Ni(t.left,e.left,e.right),r=(Ni(t.right,e.left,e.right)-n)/(t.right-t.left),i=Ni(t.top,e.top,e.bottom);return r*((Ni(t.bottom,e.top,e.bottom)-i)/(t.bottom-t.top))}var P=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},F=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},I,Ii,Li,Ri,zi,Bi,L,R,Vi,Hi,Ui,Wi,Gi,Ki,qi,Ji,Yi,Xi,Zi,Qi,$i,ea,ta,na,ra,ia,aa,oa=class{constructor(e,t,n,r,i,a,o,s){I.add(this),Ii.set(this,void 0),Li.set(this,void 0),Ri.set(this,void 0),zi.set(this,void 0),Bi.set(this,void 0),L.set(this,void 0),R.set(this,void 0),Vi.set(this,void 0),Hi.set(this,[]),Ui.set(this,[]),Wi.set(this,void 0),Gi.set(this,new Set),Ki.set(this,!1),qi.set(this,void 0),Ji.set(this,Di(0)),Yi.set(this,null),P(this,Ii,e,`f`),P(this,Li,t,`f`),P(this,Ri,n,`f`),P(this,zi,i,`f`),P(this,Bi,s,`f`),P(this,L,r,`f`),P(this,Wi,a,`f`),P(this,qi,o,`f`),P(this,R,r.map(()=>F(this,I,`m`,Zi).call(this)),`f`),r.length===0&&P(this,Yi,F(this,I,`m`,Zi).call(this),`f`),P(this,Vi,F(this,I,`m`,Xi).call(this),`f`)}get effects(){return F(this,L,`f`)}get hosts(){return F(this,R,`f`)}get renderingIndices(){return F(this,Vi,`f`)}get stages(){return F(this,Ui,`f`)}get hitTestPadBuffer(){return F(this,Ji,`f`)}async initAll(){for(let e=0;e<F(this,L,`f`).length;e++){let t=F(this,L,`f`)[e],n=F(this,R,`f`)[e];n.setPhase(`init`);try{t.init&&await t.init(n.ctx)}catch(t){console.error(`[VFX-JS] effect[${e}].init() failed:`,t);for(let t=e-1;t>=0;t--)F(this,I,`m`,Qi).call(this,t),F(this,R,`f`)[t].dispose();throw F(this,R,`f`)[e].dispose(),t}n.setPhase(`update`)}}run(e){if(F(this,Ki,`f`)||!e.isVisible)return;P(this,Vi,F(this,I,`m`,Xi).call(this),`f`);let t=F(this,Vi,`f`).length;for(let t of F(this,R,`f`))t.setFrameState({time:e.time,deltaTime:e.deltaTime,mouse:e.mouse,mouseViewport:e.mouseViewport,intersection:e.intersection,enterTime:e.enterTime,leaveTime:e.leaveTime,uniforms:e.resolvedUniforms});F(this,I,`m`,$i).call(this,e);for(let t=0;t<F(this,R,`f`).length;t++)F(this,R,`f`)[t].setFrameDims(F(this,I,`m`,aa).call(this,t,e)),F(this,R,`f`)[t].setEffectDims(F(this,I,`m`,na).call(this,t,e));for(let e=0;e<F(this,L,`f`).length;e++){let t=F(this,L,`f`)[e];if(!t.update)continue;let n=F(this,R,`f`)[e];n.setPhase(`update`);try{t.update(n.ctx)}catch(t){let n=`${e}:update`;F(this,Gi,`f`).has(n)||(F(this,Gi,`f`).add(n),console.warn(`[VFX-JS] effect[${e}].update() threw; skipping this frame's update:`,t))}}if(t===0)(F(this,Yi,`f`)??F(this,R,`f`)[0]).passthroughCopy(F(this,Wi,`f`),e.finalTarget,e.elementRectOnCanvasPx);else for(let n=0;n<t;n++){let r=F(this,Vi,`f`)[n],i=F(this,R,`f`)[r],a=F(this,L,`f`)[r];if(!a.render)continue;i.setPhase(`render`),i.tickAutoUpdates();let o=n===0?F(this,Wi,`f`):F(this,Hi,`f`)[n-1].texHandle;i.setSrc(o);let s;n===t-1?s=e.finalTarget:(s=F(this,Hi,`f`)[n].rtHandle,i.clearRt(s)),i.setOutput(s);try{a.render(i.ctx)}catch(e){let a=`${r}:render`;F(this,Gi,`f`).has(a)||(F(this,Gi,`f`).add(a),console.warn(`[VFX-JS] effect[${r}].render() threw; falling back to passthrough:`,e));let c=F(this,Ui,`f`)[n].outputViewport;s===null?i.passthroughCopy(o,null,c):n===t-1?i.passthroughCopy(o,s,c):i.passthroughCopy(o,s,{x:0,y:0,w:s.width,h:s.height})}i.setPhase(`update`)}}dispose(){if(!F(this,Ki,`f`)){P(this,Ki,!0,`f`);for(let e=F(this,L,`f`).length-1;e>=0;e--)F(this,I,`m`,Qi).call(this,e),F(this,R,`f`)[e].dispose();F(this,Yi,`f`)&&(F(this,Yi,`f`).dispose(),P(this,Yi,null,`f`));for(let e of F(this,Hi,`f`))e.fb.dispose();P(this,Hi,[],`f`),P(this,Ui,[],`f`)}}async replaceEffects(e){if(F(this,Ki,`f`))throw Error(`[VFX-JS] replaceEffects on disposed chain`);let t=F(this,L,`f`),n=F(this,R,`f`),r=new Map;for(let e=0;e<t.length;e++)r.set(t[e],n[e]);let i=Array(e.length),a=[];for(let t=0;t<e.length;t++){let n=e[t],o=r.get(n);if(o)i[t]=o,r.delete(n);else{let e=F(this,I,`m`,Zi).call(this);i[t]=e,a.push({host:e,effect:n})}}for(let e=0;e<a.length;e++){let{host:t,effect:n}=a[e];t.setPhase(`init`);try{n.init&&await n.init(t.ctx),t.setPhase(`update`)}catch(n){console.error(`[VFX-JS] replaceEffects: new effect init() failed:`,n);for(let t=e-1;t>=0;t--){let e=a[t];if(e.effect.dispose)try{e.effect.dispose()}catch(e){console.error(`[VFX-JS] dispose during init rollback threw:`,e)}e.host.dispose()}throw t.dispose(),n}}for(let[e,t]of r){if(e.dispose)try{e.dispose()}catch(e){console.error(`[VFX-JS] effect.dispose() threw during replaceEffects:`,e)}t.dispose()}for(let e of F(this,Hi,`f`))e.fb.dispose();P(this,Hi,[],`f`),P(this,Ui,[],`f`),e.length===0&&!F(this,Yi,`f`)?P(this,Yi,F(this,I,`m`,Zi).call(this),`f`):e.length>0&&F(this,Yi,`f`)&&(F(this,Yi,`f`).dispose(),P(this,Yi,null,`f`)),P(this,L,e,`f`),P(this,R,i,`f`),P(this,Vi,F(this,I,`m`,Xi).call(this),`f`),F(this,Gi,`f`).clear()}};Ii=new WeakMap,Li=new WeakMap,Ri=new WeakMap,zi=new WeakMap,Bi=new WeakMap,L=new WeakMap,R=new WeakMap,Vi=new WeakMap,Hi=new WeakMap,Ui=new WeakMap,Wi=new WeakMap,Gi=new WeakMap,Ki=new WeakMap,qi=new WeakMap,Ji=new WeakMap,Yi=new WeakMap,I=new WeakSet,Xi=function(){return F(this,L,`f`).map((e,t)=>typeof e.render==`function`&&e.enabled!==!1?t:-1).filter(e=>e>=0)},Zi=function(){return new yi(F(this,Ii,`f`),F(this,Li,`f`),F(this,Ri,`f`),F(this,Wi,`f`),F(this,zi,`f`),F(this,Bi,`f`))},Qi=function(e){let t=F(this,L,`f`)[e];if(t.dispose)try{t.dispose()}catch(t){console.error(`[VFX-JS] effect[${e}].dispose() threw:`,t)}},$i=function(e){let t=F(this,Vi,`f`).length;if(P(this,Ui,Array(t),`f`),t===0)return;let n=F(this,qi,`f`)?e.canvasBufferSize:e.elementBufferSize,r=[0,0,n[0],n[1]],i=F(this,I,`m`,ia).call(this,e),a=r;for(let n=0;n<t;n++){let o=F(this,Vi,`f`)[n],s=F(this,L,`f`)[o],c=n===t-1,l=F(this,I,`m`,ea).call(this,s,a,r,i,e)??a,u=[l[2],l[3]],d=Pi(r,l),f=c?{x:e.elementRectOnCanvasPx.x+l[0],y:e.elementRectOnCanvasPx.y+l[1],w:u[0],h:u[1]}:{x:0,y:0,w:u[0],h:u[1]};F(this,Ui,`f`)[n]={dstRect:l,dstBufferSize:u,contentRectUv:d,outputViewport:f},c||F(this,I,`m`,ra).call(this,n,u),a=l}let[o,s,c,l]=F(this,Ui,`f`)[t-1].dstRect;P(this,Ji,Di({top:Math.max(0,s+l-n[1]),right:Math.max(0,o+c-n[0]),bottom:Math.max(0,-s),left:Math.max(0,-o)}),`f`)},ea=function(e,t,n,r,i){if(e.outputRect)return e.outputRect(F(this,I,`m`,ta).call(this,i,n,t,r))},ta=function(e,t,n,r){let i=e.canvasBufferSize[0]/e.canvasSize[0]||1;return{element:F(this,qi,`f`)?e.canvasSize:e.elementSize,elementPixel:F(this,qi,`f`)?e.canvasBufferSize:e.elementBufferSize,canvas:e.canvasSize,canvasPixel:e.canvasBufferSize,pixelRatio:i,contentRect:t,srcRect:n,canvasRect:r}},na=function(e,t){let n=F(this,qi,`f`)?t.canvasBufferSize:t.elementBufferSize,r=[0,0,n[0],n[1]],i=F(this,I,`m`,ia).call(this,t),a=F(this,Vi,`f`).indexOf(e),o=a<=0?r:F(this,Ui,`f`)[a-1].dstRect;return F(this,I,`m`,ta).call(this,t,r,o,i)},ra=function(e,t){let n=F(this,Hi,`f`)[e];if(n&&n.fb.width===t[0]&&n.fb.height===t[1])return;n&&n.fb.dispose();let r=new Pn(F(this,Ii,`f`),t[0],t[1]),i=Ti(r),a=Ci(()=>r.texture,()=>r.width,()=>r.height);F(this,Hi,`f`)[e]={fb:r,rtHandle:i,texHandle:a,bufferSize:t}},ia=function(e){let[t,n]=e.canvasBufferSize;if(F(this,qi,`f`))return[0,0,t,n];let{x:r,y:i}=e.elementRectOnCanvasPx;return[-r,-i,t,n]},aa=function(e,t){let n=F(this,Vi,`f`).indexOf(e),r,i,a,o,s;if(n<0)r=t.elementBufferSize[0],i=t.elementBufferSize[1],a={x:0,y:0,w:r,h:i},o=[0,0,1,1],s=[0,0,1,1];else{let e=F(this,Ui,`f`)[n];r=e.dstBufferSize[0],i=e.dstBufferSize[1],a=e.outputViewport,o=e.contentRectUv,s=n===0?[0,0,1,1]:F(this,Ui,`f`)[n-1].contentRectUv}return{outputBufferW:r,outputBufferH:i,canvasBufferSize:t.canvasBufferSize,outputViewport:a,elementBufferW:t.elementBufferSize[0],elementBufferH:t.elementBufferSize[1],contentRectUv:o,srcRectUv:s}};var sa=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},ca=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},la,ua,da,fa,pa=class{constructor(e){la.add(this),ua.set(this,void 0),da.set(this,new Set),sa(this,ua,e,`f`)}freezeInside(e,t){let n={root:e,entries:[]};for(let r of t)!r.frozen&&ma(e,r.element)&&(r.frozen=!0,n.entries.push({e:r,opacity:r.element.style.opacity}),ca(this,ua,`f`).showPlain(r));ca(this,da,`f`).add(n);let r=!1;return()=>{if(!r){r=!0,ca(this,da,`f`).delete(n);for(let{e}of n.entries)e.frozen=!1;requestAnimationFrame(()=>{for(let{e,opacity:t}of n.entries)!e.frozen&&ca(this,ua,`f`).isRegistered(e)&&ca(this,ua,`f`).hidePlain(e,t)})}}}adopt(e,t){let n=ca(this,la,`m`,fa).call(this,e.element);return n?(e.frozen=!0,n.entries.push({e,opacity:t??e.element.style.opacity}),!0):!1}};ua=new WeakMap,da=new WeakMap,la=new WeakSet,fa=function(e){for(let t of ca(this,da,`f`))if(ma(t.root,e))return t};function ma(e,t){return t!==e&&e.contains(t)}function ha(e){this.data=e,this.pos=0}ha.prototype.readByte=function(){return this.data[this.pos++]},ha.prototype.peekByte=function(){return this.data[this.pos]},ha.prototype.readBytes=function(e){return this.data.subarray(this.pos,this.pos+=e)},ha.prototype.peekBytes=function(e){return this.data.subarray(this.pos,this.pos+e)},ha.prototype.readString=function(e){for(var t=``,n=0;n<e;n++)t+=String.fromCharCode(this.readByte());return t},ha.prototype.readBitArray=function(){for(var e=[],t=this.readByte(),n=7;n>=0;n--)e.push(!!(t&1<<n));return e},ha.prototype.readUnsigned=function(e){var t=this.readBytes(2);return e?(t[1]<<8)+t[0]:(t[0]<<8)+t[1]};function ga(e){this.stream=new ha(e),this.output={}}ga.prototype.parse=function(e){return this.parseParts(this.output,e),this.output},ga.prototype.parseParts=function(e,t){for(var n=0;n<t.length;n++){var r=t[n];this.parsePart(e,r)}},ga.prototype.parsePart=function(e,t){var n=t.label,r;if(!t.requires||t.requires(this.stream,this.output,e)){if(t.loop){for(var i=[];t.loop(this.stream);){var a={};this.parseParts(a,t.parts),i.push(a)}e[n]=i}else t.parts?(r={},this.parseParts(r,t.parts),e[n]=r):t.parser?(r=t.parser(this.stream,this.output,e),t.skip||(e[n]=r)):t.bits&&(e[n]=this.parseBits(t.bits))}};function _a(e){return e.reduce(function(e,t){return e*2+t},0)}ga.prototype.parseBits=function(e){var t={},n=this.stream.readBitArray();for(var r in e){var i=e[r];t[r]=i.length?_a(n.slice(i.index,i.index+i.length)):n[i.index]}return t};var z={readByte:function(){return function(e){return e.readByte()}},readBytes:function(e){return function(t){return t.readBytes(e)}},readString:function(e){return function(t){return t.readString(e)}},readUnsigned:function(e){return function(t){return t.readUnsigned(e)}},readArray:function(e,t){return function(n,r,i){for(var a=t(n,r,i),o=Array(a),s=0;s<a;s++)o[s]=n.readBytes(e);return o}}},va={label:`blocks`,parser:function(e){for(var t=[],n=0,r=0,i=e.readByte();i!==r;i=e.readByte())t.push(e.readBytes(i)),n+=i;var a=new Uint8Array(n);n=0;for(var o=0;o<t.length;o++)a.set(t[o],n),n+=t[o].length;return a}},ya={label:`gce`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===249},parts:[{label:`codes`,parser:z.readBytes(2),skip:!0},{label:`byteSize`,parser:z.readByte()},{label:`extras`,bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:`delay`,parser:z.readUnsigned(!0)},{label:`transparentColorIndex`,parser:z.readByte()},{label:`terminator`,parser:z.readByte(),skip:!0}]},ba={label:`image`,requires:function(e){return e.peekByte()===44},parts:[{label:`code`,parser:z.readByte(),skip:!0},{label:`descriptor`,parts:[{label:`left`,parser:z.readUnsigned(!0)},{label:`top`,parser:z.readUnsigned(!0)},{label:`width`,parser:z.readUnsigned(!0)},{label:`height`,parser:z.readUnsigned(!0)},{label:`lct`,bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:`lct`,requires:function(e,t,n){return n.descriptor.lct.exists},parser:z.readArray(3,function(e,t,n){return 2**(n.descriptor.lct.size+1)})},{label:`data`,parts:[{label:`minCodeSize`,parser:z.readByte()},va]}]},xa={label:`text`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===1},parts:[{label:`codes`,parser:z.readBytes(2),skip:!0},{label:`blockSize`,parser:z.readByte()},{label:`preData`,parser:function(e,t,n){return e.readBytes(n.text.blockSize)}},va]},Sa={label:`frames`,parts:[ya,{label:`application`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===255},parts:[{label:`codes`,parser:z.readBytes(2),skip:!0},{label:`blockSize`,parser:z.readByte()},{label:`id`,parser:function(e,t,n){return e.readString(n.blockSize)}},va]},{label:`comment`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===254},parts:[{label:`codes`,parser:z.readBytes(2),skip:!0},va]},ba,xa],loop:function(e){var t=e.peekByte();return t===33||t===44}},Ca=[{label:`header`,parts:[{label:`signature`,parser:z.readString(3)},{label:`version`,parser:z.readString(3)}]},{label:`lsd`,parts:[{label:`width`,parser:z.readUnsigned(!0)},{label:`height`,parser:z.readUnsigned(!0)},{label:`gct`,bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:`backgroundColorIndex`,parser:z.readByte()},{label:`pixelAspectRatio`,parser:z.readByte()}]},{label:`gct`,requires:function(e,t){return t.lsd.gct.exists},parser:z.readArray(3,function(e,t){return 2**(t.lsd.gct.size+1)})},Sa];function wa(e){var t=new ga(new Uint8Array(e));this.raw=t.parse(Ca),this.raw.hasImages=!1;for(var n=0;n<this.raw.frames.length;n++)if(this.raw.frames[n].image){this.raw.hasImages=!0;break}}wa.prototype.decompressFrame=function(e,t){if(e>=this.raw.frames.length)return null;var n=this.raw.frames[e];if(n.image){var r=n.image.descriptor.width*n.image.descriptor.height,i=o(n.image.data.minCodeSize,n.image.data.blocks,r);n.image.descriptor.lct.interlaced&&(i=s(i,n.image.descriptor.width));var a={pixels:i,dims:{top:n.image.descriptor.top,left:n.image.descriptor.left,width:n.image.descriptor.width,height:n.image.descriptor.height}};return a.colorTable=n.image.descriptor.lct&&n.image.descriptor.lct.exists?n.image.lct:this.raw.gct,n.gce&&(a.delay=(n.gce.delay||10)*10,a.disposalType=n.gce.extras.disposal,n.gce.extras.transparentColorGiven&&(a.transparentIndex=n.gce.transparentColorIndex)),t&&(a.patch=c(a)),a}return null;function o(e,t,n){var r=4096,i=-1,a=n,o,s,c,l,u,d,f,p,m,h,ee,te,ne,re,ie,g,_=Array(n),v=Array(r),y=Array(r),b=Array(r+1);for(te=e,s=1<<te,u=s+1,o=s+2,f=i,l=te+1,c=(1<<l)-1,m=0;m<s;m++)v[m]=0,y[m]=m;for(ee=p=ne=re=g=ie=0,h=0;h<a;){if(re===0){if(p<l){ee+=t[ie]<<p,p+=8,ie++;continue}if(m=ee&c,ee>>=l,p-=l,m>o||m==u)break;if(m==s){l=te+1,c=(1<<l)-1,o=s+2,f=i;continue}if(f==i){b[re++]=y[m],f=m,ne=m;continue}for(d=m,m==o&&(b[re++]=ne,m=f);m>s;)b[re++]=y[m],m=v[m];ne=y[m]&255,b[re++]=ne,o<r&&(v[o]=f,y[o]=ne,o++,(o&c)===0&&o<r&&(l++,c+=o)),f=d}re--,_[g++]=b[re],h++}for(h=g;h<a;h++)_[h]=0;return _}function s(e,t){for(var n=Array(e.length),r=e.length/t,i=function(r,i){var a=e.slice(i*t,(i+1)*t);n.splice.apply(n,[r*t,t].concat(a))},a=[0,4,2,1],o=[8,8,4,2],s=0,c=0;c<4;c++)for(var l=a[c];l<r;l+=o[c])i(l,s),s++;return n}function c(e){for(var t=e.pixels.length,n=new Uint8ClampedArray(t*4),r=0;r<t;r++){var i=r*4,a=e.pixels[r],o=e.colorTable[a];n[i]=o[0],n[i+1]=o[1],n[i+2]=o[2],n[i+3]=a===e.transparentIndex?0:255}return n}},wa.prototype.decompressFrames=function(e,t,n){t===void 0&&(t=0),n=n===void 0?this.raw.frames.length:Math.min(n,this.raw.frames.length);for(var r=[],i=t;i<n;i++)this.raw.frames[i].image&&r.push(this.decompressFrame(i,e));return r};var Ta=wa,Ea=class e{static async create(t,n){let r=await fetch(t).then(e=>e.arrayBuffer()).then(e=>new Ta(e)),i=r.decompressFrames(!0,void 0,void 0),{width:a,height:o}=r.raw.lsd;return new e(i,a,o,n)}constructor(e,t,n,r){this.frames=[],this.index=0,this.playTime=0,this.frames=e,this.canvas=document.createElement(`canvas`),this.ctx=this.canvas.getContext(`2d`),this.pixelRatio=r,this.canvas.width=t,this.canvas.height=n,this.startTime=Date.now()}getCanvas(){return this.canvas}update(){let e=Date.now()-this.startTime;for(;this.playTime<e;){let e=this.frames[this.index%this.frames.length];this.playTime+=e.delay,this.index++}let t=this.frames[this.index%this.frames.length],n=new ImageData(t.patch,t.dims.width,t.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(n,t.dims.left,t.dims.top)}},Da=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Oa,ka,Aa,ja,Ma,Na=class{constructor(e,t=!1){this.isContextLost=!1,Oa.set(this,new Set),ka.set(this,new Set),Aa.set(this,new Set),ja.set(this,e=>{e.preventDefault(),this.isContextLost=!0;for(let e of Da(this,ka,`f`))e()}),Ma.set(this,()=>{this.isContextLost=!1;let e=this.gl;e.getExtension(`EXT_color_buffer_float`),e.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!e.getExtension(`EXT_float_blend`);for(let e of Da(this,Oa,`f`))e.restore();for(let e of Da(this,Aa,`f`))e()});let n=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:t});if(!n)throw Error(`[VFX-JS] WebGL2 is not available.`);this.gl=n,this.canvas=e,n.getExtension(`EXT_color_buffer_float`),n.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!n.getExtension(`EXT_float_blend`),this.floatLinearFilter=!!n.getExtension(`OES_texture_float_linear`),this.maxTextureSize=n.getParameter(n.MAX_TEXTURE_SIZE),e.addEventListener(`webglcontextlost`,Da(this,ja,`f`),!1),e.addEventListener(`webglcontextrestored`,Da(this,Ma,`f`),!1)}setSize(e,t,n){let r=Math.floor(e*n),i=Math.floor(t*n);(this.canvas.width!==r||this.canvas.height!==i)&&(this.canvas.width=r,this.canvas.height=i)}addResource(e){Da(this,Oa,`f`).add(e)}removeResource(e){Da(this,Oa,`f`).delete(e)}onContextLost(e){return Da(this,ka,`f`).add(e),()=>Da(this,ka,`f`).delete(e)}onContextRestored(e){return Da(this,Aa,`f`).add(e),()=>Da(this,Aa,`f`).delete(e)}};Oa=new WeakMap,ka=new WeakMap,Aa=new WeakMap,ja=new WeakMap,Ma=new WeakMap;var Pa=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Fa=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ia,La,Ra,za,Ba=class{constructor(e){Ia.add(this),La.set(this,void 0),Ra.set(this,void 0),Pa(this,La,e,`f`),this.gl=e.gl,Fa(this,Ia,`m`,za).call(this),e.addResource(this)}restore(){Fa(this,Ia,`m`,za).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){Fa(this,La,`f`).removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(Fa(this,Ra,`f`))}};La=new WeakMap,Ra=new WeakMap,Ia=new WeakSet,za=function(){let e=this.gl,t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw Error(`[VFX-JS] Failed to create quad VAO`);this.vao=t,Pa(this,Ra,n,`f`);let r=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)};function Va(e,t,n,r={}){return new Pn(e,t,n,{float:r.float??!1})}function Ha(e,t){let n=t.renderingToBuffer??!1,r;r=n?`none`:t.premultipliedAlpha?`premultiplied`:`normal`;let i=t.glslVersion??nr(t.fragmentShader);return new lr(e,t.vertexShader??(i===`100`?`
precision highp float;
attribute vec3 position;
void main() {
    gl_Position = vec4(position, 1.0);
}
`:`
precision highp float;
in vec3 position;
void main() {
    gl_Position = vec4(position, 1.0);
}
`),t.fragmentShader,t.uniforms,r,i)}var Ua=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},B=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},V,Wa,Ga,Ka,qa,Ja,Ya=class{constructor(e,t,n,r,i,a,o,s){if(V.set(this,void 0),Wa.set(this,void 0),Ga.set(this,void 0),Ka.set(this,void 0),qa.set(this,void 0),Ja.set(this,void 0),Ua(this,Ka,r??!1,`f`),Ua(this,qa,i??!1,`f`),Ua(this,Ja,a,`f`),Ua(this,Wa,{},`f`),Ua(this,V,{src:{value:null},offset:{value:new Gn},resolution:{value:new Gn},viewport:{value:new Kn},time:{value:0},mouse:{value:new Gn},passIndex:{value:0}},`f`),n)for(let[e,t]of Object.entries(n))typeof t==`function`?(B(this,Wa,`f`)[e]=t,B(this,V,`f`)[e]={value:t()}):B(this,V,`f`)[e]={value:t};this.pass=Ha(e,{fragmentShader:t,uniforms:B(this,V,`f`),renderingToBuffer:o??!1,premultipliedAlpha:!0,glslVersion:s})}get uniforms(){return B(this,V,`f`)}setUniforms(e,t,n,r,i,a){B(this,V,`f`).src.value=e,B(this,V,`f`).resolution.value.set(n.w*t,n.h*t),B(this,V,`f`).offset.value.set(n.x*t,n.y*t),B(this,V,`f`).time.value=r,B(this,V,`f`).mouse.value.set(i*t,a*t)}updateCustomUniforms(e){for(let[e,t]of Object.entries(B(this,Wa,`f`)))B(this,V,`f`)[e]&&(B(this,V,`f`)[e].value=t());if(e)for(let[t,n]of Object.entries(e))B(this,V,`f`)[t]&&(B(this,V,`f`)[t].value=n())}initializeBackbuffer(e,t,n,r){B(this,Ka,`f`)&&!B(this,Ga,`f`)&&(B(this,Ja,`f`)?Ua(this,Ga,new Wn(e,B(this,Ja,`f`)[0],B(this,Ja,`f`)[1],1,B(this,qa,`f`)),`f`):Ua(this,Ga,new Wn(e,t,n,r,B(this,qa,`f`)),`f`))}resizeBackbuffer(e,t){B(this,Ga,`f`)&&!B(this,Ja,`f`)&&B(this,Ga,`f`).resize(e,t)}registerBufferUniform(e){B(this,V,`f`)[e]||(B(this,V,`f`)[e]={value:null})}get backbuffer(){return B(this,Ga,`f`)}get persistent(){return B(this,Ka,`f`)}get float(){return B(this,qa,`f`)}get size(){return B(this,Ja,`f`)}dispose(){this.pass.dispose(),B(this,Ga,`f`)?.dispose()}};V=new WeakMap,Wa=new WeakMap,Ga=new WeakMap,Ka=new WeakMap,qa=new WeakMap,Ja=new WeakMap;var Xa=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Za=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Qa,$a,eo=class{constructor(e){Qa.set(this,void 0),$a.set(this,new Map),Xa(this,Qa,e,`f`)}get(e,t,n){let r=`${t}\0${e}\0${n??``}`,i=Za(this,$a,`f`).get(r);return i||(i=new rr(Za(this,Qa,`f`),e,t,n),Za(this,$a,`f`).set(r,i)),i}get size(){return Za(this,$a,`f`).size}dispose(){for(let e of Za(this,$a,`f`).values())e.dispose();Za(this,$a,`f`).clear()}};Qa=new WeakMap,$a=new WeakMap;var H=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},U=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},W,to,no,G,ro,io,ao,oo,so,K,co,lo,uo,fo,po,mo,ho,go,q,J,_o,vo,yo,bo,xo,Y,So,Co,wo,To,Eo,Do,Oo,ko,Ao,jo,Mo,No,Po,Fo,Io,Lo,Ro,zo,Bo,Vo,Ho,Uo,Wo,Go,Ko,qo,Jo,Yo,Xo,Zo=new Map;function Qo(e,t){return e===`hic`||t===!0?null:typeof t==`number`?t.toString():e===`video`?`0.0001`:`0`}function $o(e,t){let n=e.getContext(`2d`);n&&(n.clearRect(0,0,e.width,e.height),n.drawImage(t,0,0,e.width,e.height))}var es=class{constructor(e,t){W.add(this),to.set(this,void 0),no.set(this,void 0),G.set(this,void 0),ro.set(this,void 0),io.set(this,void 0),ao.set(this,void 0),oo.set(this,void 0),so.set(this,[]),K.set(this,void 0),co.set(this,new Map),lo.set(this,null),uo.set(this,!1),fo.set(this,new WeakSet),po.set(this,{}),mo.set(this,{}),ho.set(this,0),go.set(this,void 0),q.set(this,2),J.set(this,[]),_o.set(this,new pa({showPlain:e=>{if(e.type===`hic`){let t=e.srcTexture.source;t instanceof OffscreenCanvas&&$o(e.element,t)}else e.element.style.setProperty(`opacity`,e.originalOpacity.toString())},hidePlain:(e,t)=>{if(e.type===`hic`){let t=e.element;t.getContext(`2d`)?.clearRect(0,0,t.width,t.height)}else e.element.style.opacity=t},isRegistered:e=>U(this,J,`f`).includes(e)})),vo.set(this,0),yo.set(this,1),bo.set(this,Date.now()/1e3),xo.set(this,!1),Y.set(this,ki(0)),So.set(this,ki(0)),Co.set(this,[0,0]),wo.set(this,0),To.set(this,0),Eo.set(this,0),Do.set(this,0),Oo.set(this,new WeakMap),Ao.set(this,async()=>{if(typeof window<`u`){for(let e of U(this,J,`f`))if(e.type===`text`&&e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await U(this,W,`m`,Mo).call(this,e),e.width=n,e.height=r)}for(let e of U(this,J,`f`))if(e.type===`text`&&!e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await U(this,W,`m`,Mo).call(this,e),e.width=n,e.height=r)}}}),jo.set(this,e=>{typeof window<`u`&&(H(this,Eo,e.clientX,`f`),H(this,Do,window.innerHeight-e.clientY,`f`))}),Io.set(this,()=>{this.isPlaying()&&(this.render(),H(this,go,requestAnimationFrame(U(this,Io,`f`)),`f`))}),H(this,to,e,`f`),H(this,no,t,`f`),H(this,G,new Na(t,e.preserveDrawingBuffer),`f`),H(this,ro,U(this,G,`f`).gl,`f`),U(this,ro,`f`).clearColor(0,0,0,0),H(this,q,e.pixelRatio,`f`),H(this,yo,e.timeScale,`f`),H(this,bo,Date.now()/1e3,`f`),H(this,io,new Ba(U(this,G,`f`)),`f`),H(this,ao,new eo(U(this,G,`f`)),`f`),typeof window<`u`&&(window.addEventListener(`resize`,U(this,Ao,`f`)),window.addEventListener(`pointermove`,U(this,jo,`f`))),U(this,Ao,`f`).call(this),H(this,oo,new fr(U(this,G,`f`)),`f`),U(this,W,`m`,Ko).call(this,e.postEffects),U(this,G,`f`).onContextRestored(()=>{U(this,ro,`f`).clearColor(0,0,0,0)})}destroy(){this.stop(),typeof window<`u`&&(window.removeEventListener(`resize`,U(this,Ao,`f`)),window.removeEventListener(`pointermove`,U(this,jo,`f`))),U(this,K,`f`)?.dispose();for(let e of U(this,co,`f`).values())e?.dispose();for(let e of U(this,so,`f`))e.pass.dispose();U(this,lo,`f`)&&(U(this,lo,`f`).dispose(),H(this,lo,null,`f`),H(this,uo,!1,`f`)),U(this,oo,`f`).dispose(),U(this,ao,`f`).dispose(),U(this,io,`f`).dispose()}async addElement(e,t={},n){if(t.effect!==void 0)return U(this,W,`m`,Po).call(this,e,t,t.effect,n);let r=U(this,W,`m`,Fo).call(this,t),i=e.getBoundingClientRect(),a=us(e)?ji(i):Ai(i),[o,c]=rs(t.overflow),l=Mi(a,c),u=as(t.intersection),d=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),f,m,h=!1;if(e instanceof HTMLImageElement){m=`img`;let t=p(e);if(h=!!t.match(/\.gif/i),h){let n=await Ea.create(t,U(this,q,`f`));Zo.set(e,n),f=new O(U(this,G,`f`),n.getCanvas())}else{let e=await On(t);f=new O(U(this,G,`f`),e)}}else if(e instanceof HTMLVideoElement)f=new O(U(this,G,`f`),e),m=`video`;else if(e instanceof HTMLCanvasElement)s(e)&&n?(f=new O(U(this,G,`f`),n),m=`hic`):(f=new O(U(this,G,`f`),e),m=`canvas`);else{let t=await mr(e,d,void 0,this.maxTextureSize);f=new O(U(this,G,`f`),t),m=`text`}let[ee,te]=cs(t.wrap);f.wrapS=ee,f.wrapT=te,f.needsUpdate=!0;let ne=t.autoCrop??!0,re=Qo(m,t.overlay),ie={src:{value:f},resolution:{value:new Gn},offset:{value:new Gn},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},mouse:{value:new Gn},intersection:{value:0},viewport:{value:new Kn},autoCrop:{value:ne}},g={};if(t.uniforms!==void 0)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(ie[e]={value:n()},g[e]=n):ie[e]={value:n};let _;t.backbuffer&&(_=(()=>{let e=(l.right-l.left)*U(this,q,`f`),t=(l.bottom-l.top)*U(this,q,`f`);return new Wn(U(this,G,`f`),e,t,U(this,q,`f`),!1)})(),ie.backbuffer={value:_.texture});let v=new Map,y=new Map;for(let e=0;e<r.length-1;e++){let t=r[e].target??`pass${e}`;r[e]={...r[e],target:t};let n=r[e].size,i=n?n[0]:(l.right-l.left)*U(this,q,`f`),a=n?n[1]:(l.bottom-l.top)*U(this,q,`f`);if(r[e].persistent){let i=n?1:U(this,q,`f`),a=n?n[0]:l.right-l.left,o=n?n[1]:l.bottom-l.top;y.set(t,new Wn(U(this,G,`f`),a,o,i,r[e].float))}else v.set(t,Va(U(this,G,`f`),i,a,{float:r[e].float}))}let b=[];for(let e=0;e<r.length;e++){let t=r[e],n=t.frag,i={...ie},a={};for(let[e,r]of v)e!==t.target&&n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:r.texture});for(let[e,t]of y)n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:t.texture});if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(i[e]={value:n()},a[e]=n):i[e]={value:n};let o=Ha(U(this,G,`f`),{vertexShader:t.vert,fragmentShader:n,uniforms:i,renderingToBuffer:t.target!==void 0,glslVersion:t.glslVersion});b.push({pass:o,uniforms:i,uniformGenerators:{...g,...a},target:t.target,persistent:t.persistent,float:t.float,size:t.size,backbuffer:t.target?y.get(t.target):void 0})}let x=U(this,vo,`f`),ae={type:m,element:e,isInViewport:!1,isInLogicalViewport:!1,width:a.right-a.left,height:a.bottom-a.top,passes:b,bufferTargets:v,startTime:x,enterTime:x,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:o,overflow:c,intersection:u,originalOpacity:d,srcTexture:f,zIndex:t.zIndex??0,backbuffer:_,autoCrop:ne};U(this,W,`m`,Ho).call(this,ae,a,x),U(this,W,`m`,No).call(this,ae,re)}async updateElementEffects(e,t){let n=U(this,J,`f`).find(t=>t.element===e);if(!n)throw Error(`[VFX-JS] updateElementEffects: element not registered`);if(!n.chain)throw Error(`[VFX-JS] updateElementEffects: element is on the shader path; effect-only updates are not supported`);let r=Array.isArray(t)?[...t]:[t],i=n.chain.effects,a=new Set(i),o=[];for(let e of r)if(!a.has(e)){if(U(this,fo,`f`).has(e))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");o.push(e)}await n.chain.replaceEffects(r);let s=new Set(r);for(let e of i)s.has(e)||U(this,fo,`f`).delete(e);for(let e of o)U(this,fo,`f`).add(e)}removeElement(e){let t=U(this,J,`f`).findIndex(t=>t.element===e);if(t!==-1){let n=U(this,J,`f`).splice(t,1)[0];if(n.chain)U(this,W,`m`,Bo).call(this,n.chain.effects),n.chain.dispose();else{for(let e of n.bufferTargets.values())e.dispose();for(let e of n.passes)e.pass.dispose(),e.backbuffer?.dispose();n.backbuffer?.dispose()}n.srcTexture.dispose(),e.style.setProperty(`opacity`,n.originalOpacity.toString())}}updateTextElement(e){let t=U(this,J,`f`).findIndex(t=>t.element===e);return t===-1?Promise.resolve():U(this,W,`m`,Mo).call(this,U(this,J,`f`)[t])}async updateImageElement(e){let t=U(this,J,`f`).find(t=>t.element===e);if(t?.type!==`img`||t.isGif)return;let n=await On(p(e)),r=t.srcTexture,i=new O(U(this,G,`f`),n);i.wrapS=r.wrapS,i.wrapT=r.wrapT,i.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=i),t.srcTexture=i,r.dispose()}updateCanvasElement(e){let t=U(this,J,`f`).find(t=>t.element===e);if(t){let n=t.srcTexture,r=new O(U(this,G,`f`),e);r.wrapS=n.wrapS,r.wrapT=n.wrapT,r.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=r),t.srcTexture=r,n.dispose()}}updateHICTexture(e,t){let n=U(this,J,`f`).find(t=>t.element===e);if(n?.type!==`hic`)return;n.frozen&&$o(e,t);let r=n.srcTexture;if(r.source===t)r.needsUpdate=!0;else{let e=new O(U(this,G,`f`),t);e.wrapS=r.wrapS,e.wrapT=r.wrapT,e.needsUpdate=!0,!n.chain&&n.passes.length>0&&(n.passes[0].uniforms.src.value=e),n.srcTexture=e,r.dispose()}}freezeInside(e){return U(this,_o,`f`).freezeInside(e,U(this,J,`f`))}isFrozen(e){return U(this,J,`f`).some(t=>t.element===e&&t.frozen)}forceRender(e){let t=U(this,J,`f`).find(t=>t.element===e);return!t||t.forceRender?()=>{}:(t.forceRender=!0,()=>{t.forceRender=!1})}get maxTextureSize(){return U(this,G,`f`).maxTextureSize}isPlaying(){return U(this,go,`f`)!==void 0}play(){this.isPlaying()||(H(this,bo,Date.now()/1e3,`f`),H(this,go,requestAnimationFrame(U(this,Io,`f`)),`f`))}get time(){return U(this,vo,`f`)}setTime(e){H(this,vo,e,`f`),H(this,xo,!0,`f`)}get timeScale(){return U(this,yo,`f`)}set timeScale(e){H(this,yo,e,`f`)}stop(){U(this,go,`f`)!==void 0&&(cancelAnimationFrame(U(this,go,`f`)),H(this,go,void 0,`f`))}render(){let e=Date.now()/1e3;U(this,xo,`f`)?H(this,xo,!1,`f`):H(this,vo,U(this,vo,`f`)+(e-U(this,bo,`f`))*U(this,yo,`f`),`f`),H(this,bo,e,`f`);let t=U(this,vo,`f`),n=U(this,ro,`f`);U(this,W,`m`,ko).call(this),n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,U(this,no,`f`).width,U(this,no,`f`).height),n.clear(n.COLOR_BUFFER_BIT);let r=U(this,Y,`f`).right-U(this,Y,`f`).left,i=U(this,Y,`f`).bottom-U(this,Y,`f`).top,a=Ln(0,0,r,i),o=U(this,W,`m`,Ro).call(this);o&&(U(this,W,`m`,Xo).call(this,r,i),U(this,K,`f`)&&(n.bindFramebuffer(n.FRAMEBUFFER,U(this,K,`f`).fbo),n.clear(n.COLOR_BUFFER_BIT),n.bindFramebuffer(n.FRAMEBUFFER,null)));for(let e of U(this,J,`f`)){if(e.frozen)continue;let n=e.element.getBoundingClientRect(),s=e.type===`text`?ji(n):Ai(n),c=U(this,W,`m`,Ho).call(this,e,s,t);if(!c.isVisible)continue;if(e.chain){U(this,W,`m`,Lo).call(this,e,s,c,t);continue}let l=e.passes[0].uniforms;l.time.value=t-e.startTime,l.resolution.value.set((s.right-s.left)*U(this,q,`f`),(s.bottom-s.top)*U(this,q,`f`)),l.mouse.value.set((U(this,Eo,`f`)+U(this,wo,`f`))*U(this,q,`f`),(U(this,Do,`f`)+U(this,To,`f`))*U(this,q,`f`));for(let t of e.passes)for(let[e,n]of Object.entries(t.uniformGenerators))t.uniforms[e].value=n();Zo.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(l.src.value.needsUpdate=!0);let u=In(s,i,U(this,wo,`f`),U(this,To,`f`)),d=In(c.rectWithOverflow,i,U(this,wo,`f`),U(this,To,`f`));e.backbuffer&&(e.passes[0].uniforms.backbuffer.value=e.backbuffer.texture);{let t=e.isFullScreen?a:d,n=Math.max(1,t.w*U(this,q,`f`)),r=Math.max(1,t.h*U(this,q,`f`)),i=Math.max(1,t.w),o=Math.max(1,t.h);for(let t=0;t<e.passes.length-1;t++){let a=e.passes[t];if(!a.size){if(a.backbuffer)a.backbuffer.resize(i,o);else{let t=e.bufferTargets.get(a.target);t&&(t.width!==n||t.height!==r)&&t.setSize(n,r)}}}}let f=new Map;for(let t of e.passes)t.backbuffer&&t.target&&f.set(t.target,t.backbuffer.texture);let p=e.srcTexture;for(let t=0;t<e.passes.length-1;t++){let r=e.passes[t],i=e.isFullScreen?a:d;r.uniforms.src.value=p;for(let[e,t]of f)r.uniforms[e]&&(r.uniforms[e].value=t);for(let[e,t]of Object.entries(r.uniformGenerators))r.uniforms[e]&&(r.uniforms[e].value=t());let o=r.size?Ln(0,0,r.size[0],r.size[1]):Ln(0,0,i.w,i.h),s=is(n,u,i,r.size,[U(this,Eo,`f`),U(this,Do,`f`)],[U(this,wo,`f`),U(this,To,`f`)],U(this,q,`f`));if(r.uniforms.resolution.value.set(...s.resolution),r.uniforms.offset.value.set(...s.offset),r.uniforms.mouse.value.set(...s.mouse),r.backbuffer)U(this,W,`m`,Wo).call(this,r.pass,r.backbuffer.target,o,r.uniforms,!0),r.backbuffer.swap(),p=r.backbuffer.texture;else{let t=e.bufferTargets.get(r.target);if(!t)continue;U(this,W,`m`,Wo).call(this,r.pass,t,o,r.uniforms,!0),p=t.texture}r.target&&f.set(r.target,p)}let m=e.passes[e.passes.length-1];m.uniforms.src.value=p,m.uniforms.resolution.value.set(n.width*U(this,q,`f`),n.height*U(this,q,`f`)),m.uniforms.offset.value.set(u.x*U(this,q,`f`),u.y*U(this,q,`f`)),m.uniforms.mouse.value.set((U(this,Eo,`f`)+U(this,wo,`f`))*U(this,q,`f`),(U(this,Do,`f`)+U(this,To,`f`))*U(this,q,`f`));for(let[e,t]of f)m.uniforms[e]&&(m.uniforms[e].value=t);for(let[e,t]of Object.entries(m.uniformGenerators))m.uniforms[e]&&(m.uniforms[e].value=t());e.backbuffer?(m.uniforms.backbuffer.value=e.backbuffer.texture,e.isFullScreen?(e.backbuffer.resize(r,i),U(this,W,`m`,Go).call(this,e,u.x,u.y),U(this,W,`m`,Wo).call(this,m.pass,e.backbuffer.target,a,m.uniforms,!0),e.backbuffer.swap(),U(this,oo,`f`).setUniforms(e.backbuffer.texture,U(this,q,`f`),a),U(this,W,`m`,Wo).call(this,U(this,oo,`f`).pass,o&&U(this,K,`f`)||null,a,U(this,oo,`f`).uniforms,!1)):(e.backbuffer.resize(d.w,d.h),U(this,W,`m`,Go).call(this,e,e.overflow.left,e.overflow.bottom),U(this,W,`m`,Wo).call(this,m.pass,e.backbuffer.target,e.backbuffer.getViewport(),m.uniforms,!0),e.backbuffer.swap(),U(this,oo,`f`).setUniforms(e.backbuffer.texture,U(this,q,`f`),d),U(this,W,`m`,Wo).call(this,U(this,oo,`f`).pass,o&&U(this,K,`f`)||null,d,U(this,oo,`f`).uniforms,!1))):(U(this,W,`m`,Go).call(this,e,u.x,u.y),U(this,W,`m`,Wo).call(this,m.pass,o&&U(this,K,`f`)||null,e.isFullScreen?a:d,m.uniforms,!1))}o&&U(this,K,`f`)&&(U(this,lo,`f`)&&U(this,uo,`f`)?U(this,W,`m`,Jo).call(this,a,t):U(this,W,`m`,Yo).call(this,a,t))}};to=new WeakMap,no=new WeakMap,G=new WeakMap,ro=new WeakMap,io=new WeakMap,ao=new WeakMap,oo=new WeakMap,so=new WeakMap,K=new WeakMap,co=new WeakMap,lo=new WeakMap,uo=new WeakMap,fo=new WeakMap,po=new WeakMap,mo=new WeakMap,ho=new WeakMap,go=new WeakMap,q=new WeakMap,J=new WeakMap,_o=new WeakMap,vo=new WeakMap,yo=new WeakMap,bo=new WeakMap,xo=new WeakMap,Y=new WeakMap,So=new WeakMap,Co=new WeakMap,wo=new WeakMap,To=new WeakMap,Eo=new WeakMap,Do=new WeakMap,Oo=new WeakMap,Ao=new WeakMap,jo=new WeakMap,Io=new WeakMap,W=new WeakSet,ko=function(){if(typeof window>`u`)return;let e=U(this,no,`f`).ownerDocument,t=e.compatMode===`BackCompat`?e.body:e.documentElement,n=t.clientWidth,r=t.clientHeight,i=window.scrollX,a=window.scrollY,o,s;if(U(this,to,`f`).fixedCanvas)o=0,s=0;else if(U(this,to,`f`).wrapper)o=n*U(this,to,`f`).scrollPadding[0],s=r*U(this,to,`f`).scrollPadding[1];else{let t=e.body.scrollWidth-(i+n),c=e.body.scrollHeight-(a+r);o=ls(n*U(this,to,`f`).scrollPadding[0],0,t),s=ls(r*U(this,to,`f`).scrollPadding[1],0,c)}let c=n+o*2,l=r+s*2;(c!==U(this,Co,`f`)[0]||l!==U(this,Co,`f`)[1])&&(U(this,no,`f`).style.width=`${c}px`,U(this,no,`f`).style.height=`${l}px`,U(this,G,`f`).setSize(c,l,U(this,q,`f`)),H(this,Y,ki({top:-s,left:-o,right:n+o,bottom:r+s}),`f`),H(this,So,ki({top:0,left:0,right:n,bottom:r}),`f`),H(this,Co,[c,l],`f`),H(this,wo,o,`f`),H(this,To,s,`f`)),U(this,to,`f`).fixedCanvas||U(this,no,`f`).style.setProperty(`transform`,`translate(${i-o}px, ${a-s}px)`)},Mo=async function(e){if(!U(this,Oo,`f`).get(e.element)){U(this,Oo,`f`).set(e.element,!0);try{let t=e.srcTexture,n=t.source instanceof OffscreenCanvas?t.source:void 0,r=await mr(e.element,e.originalOpacity,n,this.maxTextureSize);if(r.width===0||r.height===0)return;let i=new O(U(this,G,`f`),r);i.wrapS=t.wrapS,i.wrapT=t.wrapT,i.needsUpdate=!0,!e.chain&&e.passes.length>0&&(e.passes[0].uniforms.src.value=i),e.srcTexture=i,t.dispose()}catch(e){console.error(e)}finally{U(this,Oo,`f`).set(e.element,!1)}}},No=function(e,t){!U(this,_o,`f`).adopt(e,t)&&t!==null&&e.element.style.setProperty(`opacity`,t),U(this,J,`f`).push(e),U(this,J,`f`).sort((e,t)=>e.zIndex-t.zIndex)},Po=async function(e,t,n,r){t.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified; `effect` takes precedence."),t.overflow!==void 0&&console.warn("[VFX-JS] `overflow` is shader-path only and is ignored by the effect path. Use each effect's own `outputRect` (with `dims.canvasRect` for fullscreen) to control its dst rect.");let i=Array.isArray(n)?[...n]:[n];U(this,W,`m`,zo).call(this,i);let a=e.getBoundingClientRect(),o=us(e)?ji(a):Ai(a),[c,l]=rs(t.overflow),u=as(t.intersection),d=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),f,m,h=!1;if(e instanceof HTMLImageElement){m=`img`;let t=p(e);if(h=!!t.match(/\.gif/i),h){let n=await Ea.create(t,U(this,q,`f`));Zo.set(e,n),f=new O(U(this,G,`f`),n.getCanvas())}else{let e=await On(t);f=new O(U(this,G,`f`),e)}}else if(e instanceof HTMLVideoElement)f=new O(U(this,G,`f`),e),m=`video`;else if(e instanceof HTMLCanvasElement)s(e)&&r?(f=new O(U(this,G,`f`),r),m=`hic`):(f=new O(U(this,G,`f`),e),m=`canvas`);else{let t=await mr(e,d,void 0,this.maxTextureSize);f=new O(U(this,G,`f`),t),m=`text`}let[ee,te]=cs(t.wrap);f.wrapS=ee,f.wrapT=te,f.needsUpdate=!0;let ne=t.autoCrop??!0,re=Qo(m,t.overlay),ie=U(this,vo,`f`),g={type:m,element:e,isInViewport:!1,isInLogicalViewport:!1,width:o.right-o.left,height:o.bottom-o.top,passes:[],bufferTargets:new Map,startTime:ie,enterTime:ie,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:c,overflow:l,intersection:u,originalOpacity:d,srcTexture:f,zIndex:t.zIndex??0,backbuffer:void 0,autoCrop:ne,effectLastRenderTime:ie},_=Ci(()=>g.srcTexture,()=>os(g.srcTexture,`w`),()=>os(g.srcTexture,`h`)),v={},y={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(y[e]=n,v[e]=n()):v[e]=n;g.effectUniformGenerators=y,g.effectStaticUniforms=v;let b={autoCrop:ne,glslVersion:t.glslVersion??`300 es`},x=new oa(U(this,G,`f`),U(this,io,`f`),U(this,q,`f`),i,b,_,!1,U(this,ao,`f`));try{await x.initAll()}catch(t){throw U(this,W,`m`,Bo).call(this,i),f.dispose(),e.style.setProperty(`opacity`,d.toString()),t}g.chain=x,U(this,W,`m`,Ho).call(this,g,o,ie),U(this,W,`m`,No).call(this,g,re)},Fo=function(e){let t=t=>t.glslVersion===void 0&&e.glslVersion!==void 0?{...t,glslVersion:e.glslVersion}:t;return Array.isArray(e.shader)?e.shader.map(t):[t({frag:U(this,W,`m`,Uo).call(this,e.shader||`uvGradient`)})]},Lo=function(e,t,n,r){let i=e.chain;if(!i)return;let a=U(this,q,`f`);Zo.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(e.srcTexture.needsUpdate=!0);let o={...e.effectStaticUniforms??{}};if(e.effectUniformGenerators)for(let[t,n]of Object.entries(e.effectUniformGenerators))o[t]=n();let s=U(this,Y,`f`).right-U(this,Y,`f`).left,c=U(this,Y,`f`).bottom-U(this,Y,`f`).top,l=In(t,c,U(this,wo,`f`),U(this,To,`f`)),u=U(this,Eo,`f`)+U(this,wo,`f`)-l.x,d=U(this,Do,`f`)+U(this,To,`f`)-l.y,f=t.right-t.left,p=t.bottom-t.top,m=r-(e.effectLastRenderTime??r);e.effectLastRenderTime=r;let h=U(this,W,`m`,Ro).call(this)&&U(this,K,`f`)?Ti(U(this,K,`f`)):null;i.run({time:r-e.startTime,deltaTime:m,mouse:[u*a,d*a],mouseViewport:[U(this,Eo,`f`)*a,U(this,Do,`f`)*a],intersection:n.intersection,enterTime:r-e.enterTime,leaveTime:r-e.leaveTime,resolvedUniforms:o,canvasSize:[s,c],canvasBufferSize:[s*a,c*a],elementSize:[f,p],elementBufferSize:[f*a,p*a],elementRectOnCanvasPx:{x:l.x*a,y:l.y*a,w:l.w*a,h:l.h*a},finalTarget:h,isVisible:n.isVisible})},Ro=function(){return U(this,so,`f`).length>0||U(this,lo,`f`)!==null&&U(this,uo,`f`)},zo=function(e){for(let t of e)if(U(this,fo,`f`).has(t))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");for(let t of e)U(this,fo,`f`).add(t)},Bo=function(e){for(let t of e)U(this,fo,`f`).delete(t)},Vo=function(e){let t=e.hitTestPadBuffer,n=U(this,q,`f`);return Di({top:t.top/n,right:t.right/n,bottom:t.bottom/n,left:t.left/n})},Ho=function(e,t,n){let r=Mi(t,e.chain?U(this,W,`m`,Vo).call(this,e.chain):e.overflow),i=e.isFullScreen||ts(U(this,So,`f`),r),a=Mi(U(this,So,`f`),e.intersection.rootMargin),o=Fi(a,t),s=e.isFullScreen||ns(a,t,o,e.intersection.threshold);!e.isInLogicalViewport&&s&&(e.enterTime=n,e.leaveTime=1/0),e.isInLogicalViewport&&!s&&(e.leaveTime=n),e.isInViewport=i,e.isInLogicalViewport=s;let c=i&&n-e.leaveTime<=e.release||e.forceRender===!0&&t.right>t.left&&t.bottom>t.top;if(c&&!e.chain&&e.passes.length>0){let t=e.passes[0].uniforms;t.intersection.value=o,t.enterTime.value=n-e.enterTime,t.leaveTime.value=n-e.leaveTime}return{isVisible:c,intersection:o,rectWithOverflow:r}},Uo=function(e){return e in o?o[e]:e},Wo=function(e,t,n,r,i){let a=U(this,ro,`f`);i&&t!==null&&t!==U(this,K,`f`)&&(a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.viewport(0,0,t.width,t.height),a.clear(a.COLOR_BUFFER_BIT));let o=r.viewport;o&&o.value instanceof Kn&&o.value.set(n.x*U(this,q,`f`),n.y*U(this,q,`f`),n.w*U(this,q,`f`),n.h*U(this,q,`f`));try{ur(a,U(this,io,`f`),e,t,n,U(this,Co,`f`)[0],U(this,Co,`f`)[1],U(this,q,`f`))}catch(e){console.error(e)}},Go=function(e,t,n){let r=e.passes[0].uniforms.offset.value;r.x=t*U(this,q,`f`),r.y=n*U(this,q,`f`)},Ko=function(e){let t=e.length===1&&!(`frag`in e[0])?e[0]:null;if(t&&t.effect!==void 0){U(this,W,`m`,qo).call(this,t,t.effect);return}let n=[],r=[];for(let t of e)`frag`in t&&r.push(t);for(let e=0;e<r.length-1;e++)r[e].target||(r[e]={...r[e],target:`pass${e}`});for(let t of e){let e,r,i;if(`frag`in t)e=t.frag,r=new Ya(U(this,G,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,t.size,t.target!==void 0,t.glslVersion),i=t.target;else{if(t.shader===void 0)throw Error("VFXPostEffect requires `shader` (the `effect` path is not implemented yet).");e=U(this,W,`m`,Uo).call(this,t.shader),r=new Ya(U(this,G,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,void 0,!1,t.glslVersion),t.persistent&&r.registerBufferUniform(`backbuffer`),i=void 0}n.push(e);let a={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`&&(a[e]=n);U(this,so,`f`).push({pass:r,target:i,generators:a})}for(let e of r)e.target&&U(this,co,`f`).set(e.target,void 0);let i=U(this,so,`f`).map(e=>e.target).filter(e=>e!==void 0);for(let e=0;e<U(this,so,`f`).length;e++)for(let t of i)n[e].match(RegExp(`uniform\\s+sampler2D\\s+${t}\\b`))&&U(this,so,`f`)[e].pass.registerBufferUniform(t)},qo=function(e,t){e.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified on post-effect; `effect` takes precedence.");let n=Array.isArray(t)?[...t]:[t];U(this,W,`m`,zo).call(this,n);let r=Ci(()=>{let e=U(this,K,`f`);if(!e)throw Error(`[VFX-JS] post-effect chain active without target`);return e.texture},()=>U(this,K,`f`)?.width??0,()=>U(this,K,`f`)?.height??0),i={autoCrop:!0,glslVersion:e.glslVersion??`300 es`},a=new oa(U(this,G,`f`),U(this,io,`f`),U(this,q,`f`),n,i,r,!0,U(this,ao,`f`));if(e.uniforms)for(let[t,n]of Object.entries(e.uniforms))typeof n==`function`?(U(this,mo,`f`)[t]=n,U(this,po,`f`)[t]=n()):U(this,po,`f`)[t]=n;H(this,lo,a,`f`),H(this,ho,U(this,vo,`f`),`f`),a.initAll().then(()=>{U(this,lo,`f`)===a&&H(this,uo,!0,`f`)}).catch(e=>{console.error(`[VFX-JS] Post-effect init failed; post-effect disabled:`,e),U(this,lo,`f`)===a&&(U(this,W,`m`,Bo).call(this,U(this,lo,`f`).effects),U(this,lo,`f`).dispose(),H(this,lo,null,`f`),H(this,uo,!1,`f`))})},Jo=function(e,t){let n=U(this,lo,`f`);if(!n)return;let r=U(this,q,`f`),i={...U(this,po,`f`)};for(let[e,t]of Object.entries(U(this,mo,`f`)))i[e]=t();let a=U(this,Y,`f`).right-U(this,Y,`f`).left,o=U(this,Y,`f`).bottom-U(this,Y,`f`).top,s=t-U(this,ho,`f`);H(this,ho,t,`f`);let c=[a,o],l=[a*r,o*r],u={x:e.x*r,y:e.y*r,w:e.w*r,h:e.h*r};n.run({time:t,deltaTime:s,mouse:[U(this,Eo,`f`)*r,U(this,Do,`f`)*r],mouseViewport:[U(this,Eo,`f`)*r,U(this,Do,`f`)*r],intersection:1,enterTime:0,leaveTime:0,resolvedUniforms:i,canvasSize:c,canvasBufferSize:l,elementSize:c,elementBufferSize:l,elementRectOnCanvasPx:u,finalTarget:null,isVisible:!0})},Yo=function(e,t){if(!U(this,K,`f`))return;let n=U(this,K,`f`).texture,r=new Map;for(let{pass:e,target:t}of U(this,so,`f`))t&&e.backbuffer&&r.set(t,e.backbuffer.texture);for(let i=0;i<U(this,so,`f`).length;i++){let{pass:a,target:o,generators:s}=U(this,so,`f`)[i],c=i===U(this,so,`f`).length-1,l=U(this,Eo,`f`)+U(this,wo,`f`),u=U(this,Do,`f`)+U(this,To,`f`),d=a.size;if(d){let[r,i]=d;a.uniforms.src.value=n,a.uniforms.resolution.value.set(r,i),a.uniforms.offset.value.set(0,0),a.uniforms.time.value=t,a.uniforms.mouse.value.set(l/e.w*r,u/e.h*i)}else a.setUniforms(n,U(this,q,`f`),e,t,l,u);a.uniforms.passIndex.value=i,a.updateCustomUniforms(s);for(let[e,t]of r){let n=a.uniforms[e];n&&(n.value=t)}if(c)a.backbuffer?(a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture),U(this,W,`m`,Wo).call(this,a.pass,a.backbuffer.target,e,a.uniforms,!0),a.backbuffer.swap(),U(this,oo,`f`).setUniforms(a.backbuffer.texture,U(this,q,`f`),e),U(this,W,`m`,Wo).call(this,U(this,oo,`f`).pass,null,e,U(this,oo,`f`).uniforms,!1)):U(this,W,`m`,Wo).call(this,a.pass,null,e,a.uniforms,!1);else if(a.backbuffer){a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture);let t=d?Ln(0,0,d[0]/U(this,q,`f`),d[1]/U(this,q,`f`)):e;U(this,W,`m`,Wo).call(this,a.pass,a.backbuffer.target,t,a.uniforms,!0),a.backbuffer.swap(),n=a.backbuffer.texture,o&&r.set(o,a.backbuffer.texture)}else{let t=o??`postEffect${i}`,s=U(this,co,`f`).get(t),c=d?d[0]:e.w*U(this,q,`f`),l=d?d[1]:e.h*U(this,q,`f`);s&&s.width===c&&s.height===l||(s?.dispose(),s=Va(U(this,G,`f`),c,l,{float:a.float}),U(this,co,`f`).set(t,s));let u=d?Ln(0,0,d[0]/U(this,q,`f`),d[1]/U(this,q,`f`)):e;U(this,W,`m`,Wo).call(this,a.pass,s,u,a.uniforms,!0),n=s.texture,o&&r.set(o,s.texture)}}},Xo=function(e,t){let n=e*U(this,q,`f`),r=t*U(this,q,`f`);U(this,K,`f`)&&U(this,K,`f`).width===n&&U(this,K,`f`).height===r||(U(this,K,`f`)?.dispose(),H(this,K,Va(U(this,G,`f`),n,r),`f`));for(let{pass:n}of U(this,so,`f`))n.persistent&&!n.backbuffer?n.initializeBackbuffer(U(this,G,`f`),e,t,U(this,q,`f`)):n.backbuffer&&n.resizeBackbuffer(e,t)};function ts(e,t){return t.left<=e.right&&t.right>=e.left&&t.top<=e.bottom&&t.bottom>=e.top}function ns(e,t,n,r){return r===0?ts(e,t):n>=r}function rs(e){return e===!0?[!0,Oi]:e===void 0?[!1,Oi]:[!1,Di(e)]}function is(e,t,n,r,i,a,o){let s=i[0]+a[0]-n.x,c=i[1]+a[1]-n.y;return r?{resolution:[r[0],r[1]],offset:[0,0],mouse:[s/n.w*r[0],c/n.h*r[1]]}:{resolution:[e.width*o,e.height*o],offset:[(t.x-n.x)*o,(t.y-n.y)*o],mouse:[s*o,c*o]}}function as(e){return{threshold:e?.threshold??0,rootMargin:Di(e?.rootMargin??0)}}function os(e,t){let n=e.source;if(!n)return 0;if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return t===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return t===`w`?n.videoWidth:n.videoHeight;let r=n;return t===`w`?r.width:r.height}function ss(e){return e===`repeat`?`repeat`:e===`mirror`?`mirror`:`clamp`}function cs(e){if(!e)return[`clamp`,`clamp`];if(Array.isArray(e))return[ss(e[0]),ss(e[1])];let t=ss(e);return[t,t]}function ls(e,t,n){return Math.max(t,Math.min(n,e))}function us(e){return!(e instanceof HTMLImageElement||e instanceof HTMLVideoElement||e instanceof HTMLCanvasElement)}function ds(){try{let e=document.createElement(`canvas`);return(e.getContext(`webgl2`)||e.getContext(`webgl`))!==null}catch{return!1}}var fs=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},X=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ps,Z,ms,hs,gs,_s,vs,ys,bs,xs,Ss,Cs;function ws(){if(typeof window>`u`)throw`Cannot find 'window'. VFX-JS only runs on the browser.`;if(typeof document>`u`)throw`Cannot find 'document'. VFX-JS only runs on the browser.`}function Ts(e){return{position:e?`fixed`:`absolute`,top:0,left:0,width:`0px`,height:`0px`,"z-index":9999,"pointer-events":`none`}}var Es=class e{static init(t){try{return new e(t)}catch{return null}}constructor(e={}){if(ps.add(this),Z.set(this,void 0),ms.set(this,void 0),hs.set(this,new Map),gs.set(this,new Set),ws(),!ds())throw Error(`[VFX-JS] WebGL is not available in this environment.`);let t=hn(e),n=document.createElement(`canvas`),r=Ts(t.fixedCanvas);for(let[e,t]of Object.entries(r))n.style.setProperty(e,t.toString());t.zIndex!==void 0&&n.style.setProperty(`z-index`,t.zIndex.toString()),(t.wrapper??document.body).appendChild(n),fs(this,ms,n,`f`),fs(this,Z,new es(t,n),`f`),t.autoplay&&X(this,Z,`f`).play()}async add(e,t,n){e instanceof HTMLImageElement?await X(this,ps,`m`,bs).call(this,e,t):e instanceof HTMLVideoElement?await X(this,ps,`m`,xs).call(this,e,t):e instanceof HTMLCanvasElement?s(e)&&n?await X(this,ps,`m`,ys).call(this,e,t,n):await X(this,ps,`m`,Ss).call(this,e,t):await X(this,ps,`m`,Cs).call(this,e,t)}updateHICTexture(e,t){X(this,Z,`f`).updateHICTexture(e,t)}get maxTextureSize(){return X(this,Z,`f`).maxTextureSize}get canvas(){return X(this,ms,`f`)}addHTML(e,t){return X(this,ps,`m`,_s).call(this,e,t,!1)}addHTMLWithStill(e,t){return X(this,ps,`m`,_s).call(this,e,t,!0)}addTransition(e,t={}){let n=new mn(this,e,t,()=>X(this,gs,`f`).delete(n));return X(this,gs,`f`).add(n),n}freezeInside(e){return X(this,Z,`f`).freezeInside(e)}lockSize(e){let t=X(this,hs,`f`).get(e);return t?Se(t):()=>{}}forceRender(e){let t=X(this,hs,`f`).get(e)??e;return X(this,Z,`f`).forceRender(t)}remove(e){let t=X(this,hs,`f`).get(e);t?(Ae(t,e),X(this,hs,`f`).delete(e),X(this,Z,`f`).removeElement(t)):X(this,Z,`f`).removeElement(e)}updateEffects(e,t){let n=X(this,hs,`f`).get(e)??e;return X(this,Z,`f`).updateElementEffects(n,t)}async update(e){await this.updateInTime(e)}async updateInTime(e){let t=X(this,hs,`f`).get(e)??(e instanceof HTMLCanvasElement?e:null);return(t?xe(t):void 0)||(e instanceof HTMLImageElement?await X(this,Z,`f`).updateImageElement(e):e instanceof HTMLCanvasElement?X(this,Z,`f`).updateCanvasElement(e):await X(this,Z,`f`).updateTextElement(e),!0)}play(){X(this,Z,`f`).play()}stop(){X(this,Z,`f`).stop()}render(){X(this,Z,`f`).render()}get time(){return X(this,Z,`f`).time}setTime(e){X(this,Z,`f`).setTime(e)}get timeScale(){return X(this,Z,`f`).timeScale}set timeScale(e){X(this,Z,`f`).timeScale=e}destroy(){for(let e of X(this,gs,`f`))e.destroy();X(this,gs,`f`).clear();for(let[e,t]of X(this,hs,`f`))Ae(t,e);X(this,hs,`f`).clear(),X(this,Z,`f`).destroy(),X(this,ms,`f`).remove()}};Z=new WeakMap,ms=new WeakMap,hs=new WeakMap,gs=new WeakMap,ps=new WeakSet,_s=async function(e,t,n){if(!Me())return console.warn(`html-in-canvas not supported, falling back to dom-to-canvas`),this.add(e,t);t.overlay!==void 0&&console.warn(`addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.`);let{overlay:r,...i}=t,a=X(this,hs,`f`).get(e);a&&X(this,Z,`f`).removeElement(a);let{canvas:o,initialCapture:s}=await ke(e,{onCapture:e=>{X(this,Z,`f`).updateHICTexture(o,e)},maxSize:X(this,Z,`f`).maxTextureSize,stillCover:n?{zIndex:X(this,ps,`m`,vs).call(this)}:void 0});a=o,X(this,hs,`f`).set(e,a),await X(this,ps,`m`,ys).call(this,a,i,s)},vs=function(){let e=Number.parseInt(X(this,ms,`f`).style.zIndex,10);return Number.isNaN(e)?9998:e-1},ys=async function(e,t,n){try{await X(this,Z,`f`).addElement(e,t,n)}finally{we(e,X(this,Z,`f`).isFrozen(e))}},bs=function(e,t){return e.complete?X(this,Z,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`load`,()=>{X(this,Z,`f`).addElement(e,t),n()},{once:!0})})},xs=function(e,t){return e.readyState>=3?X(this,Z,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`canplay`,()=>{X(this,Z,`f`).addElement(e,t),n()},{once:!0})})},Ss=function(e,t){return X(this,Z,`f`).addElement(e,t)},Cs=function(e,t){return X(this,Z,`f`).addElement(e,t)};function Ds(e,t){if(e===`fullscreen`)return t.canvasRect;let n=e*t.pixelRatio,[,,r,i]=t.contentRect;return[-n,-n,r+2*n,i+2*n]}var Os=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Q=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ks,$,As,js,Ms,Ns,Ps,Fs,Is=`#version 300 es
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
`,Ls=`#version 300 es
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
`,Rs=`#version 300 es
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
`,zs=`#version 300 es
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
`,Bs={threshold:.7,softness:.1,intensity:1.2,scatter:.7,pad:50,dither:0,edgeFade:.02},Vs=.5,Hs=class{constructor(e={}){ks.add(this),$.set(this,null),As.set(this,[]),js.set(this,[]),Ms.set(this,!1),Ns.set(this,0),Ps.set(this,0),this.params={...Bs,...e}}setParams(e){Object.assign(this.params,e)}init(e){Os(this,$,e.createRenderTarget({float:!0}),`f`)}render(e){if(!Q(this,$,`f`))return;let{threshold:t,softness:n,intensity:r}=this.params,i=Math.min(Math.max(this.params.scatter,0),1),a=Math.max(0,this.params.dither),o=Math.max(1e-6,this.params.edgeFade);(Q(this,$,`f`).width!==Q(this,Ns,`f`)||Q(this,$,`f`).height!==Q(this,Ps,`f`))&&(Q(this,As,`f`).length=0,Q(this,js,`f`).length=0,Os(this,Ms,!1,`f`),Os(this,Ns,Q(this,$,`f`).width,`f`),Os(this,Ps,Q(this,$,`f`).height,`f`)),Q(this,ks,`m`,Fs).call(this,e,Q(this,$,`f`).width,Q(this,$,`f`).height);let s=Q(this,As,`f`).length;if(s===0)return;e.draw({frag:Is,uniforms:{src:e.src,threshold:t,softness:n,edgeFade:o},target:Q(this,$,`f`)}),e.draw({frag:Ls,uniforms:{src:Q(this,$,`f`),texelSize:[1/Q(this,$,`f`).width,1/Q(this,$,`f`).height],karis:1},target:Q(this,As,`f`)[0]});for(let t=1;t<s;t++){let n=Q(this,As,`f`)[t-1];e.draw({frag:Ls,uniforms:{src:n,texelSize:[1/n.width,1/n.height],karis:0},target:Q(this,As,`f`)[t]})}let c=Q(this,$,`f`).width,l=Q(this,$,`f`).height,u=1+i*Math.max(0,s-1),d=e=>Math.min(1,Math.max(0,u-e));for(let t=s-2;t>=0;t--){let n=t===s-2?Q(this,As,`f`)[s-1]:Q(this,js,`f`)[t+1],r=2**(t+2),i=t===s-2?d(s-1):1;e.draw({frag:Rs,uniforms:{srcSmall:n,srcLarge:Q(this,As,`f`)[t],texelSize:[Vs*r/c,Vs*r/l],weightLarge:d(t),weightSmall:i},target:Q(this,js,`f`)[t]})}let f=s>=2?Q(this,js,`f`)[0]:Q(this,As,`f`)[0],p=r/Math.max(1,u);e.draw({frag:zs,uniforms:{src:e.src,bloom:f,texelSize:[Vs*2/c,Vs*2/l],intensity:p,dither:a,edgeFade:o},target:e.target})}outputRect(e){return Ds(this.params.pad,e)}dispose(){Os(this,$,null,`f`),Q(this,As,`f`).length=0,Q(this,js,`f`).length=0,Os(this,Ms,!1,`f`),Os(this,Ns,0,`f`),Os(this,Ps,0,`f`)}};$=new WeakMap,As=new WeakMap,js=new WeakMap,Ms=new WeakMap,Ns=new WeakMap,Ps=new WeakMap,ks=new WeakSet,Fs=function(e,t,n){if(Q(this,Ms,`f`))return;let r=Math.max(1,Math.floor(t/2)),i=Math.max(1,Math.floor(n/2));for(let t=0;t<8;t++){Q(this,As,`f`).push(e.createRenderTarget({size:[r,i],float:!0}));let t=Math.max(1,Math.floor(r/2)),n=Math.max(1,Math.floor(i/2));if(t===r&&n===i)break;r=t,i=n}for(let t=0;t<Q(this,As,`f`).length-1;t++)Q(this,js,`f`).push(e.createRenderTarget({size:[Q(this,As,`f`)[t].width,Q(this,As,`f`)[t].height],float:!0}));Os(this,Ms,!0,`f`)};var Us={pure:{cyan:[0,1,1,1],magenta:[1,0,1,1],yellow:[1,1,0,1],black:[0,0,0,1],red:[1,0,0,1],green:[0,1,0,1],blue:[0,0,1,1]},newsprint:{cyan:[.15,.73,.88,1],magenta:[.88,.12,.55,1],yellow:[.97,.93,.08,1],black:[.1,.1,.1,1]},fogra51:{cyan:[0,.525,.765,1],magenta:[.827,0,.486,1],yellow:[.984,.91,0,1],black:[.145,.145,.145,1]},swop:{cyan:[0,.557,.769,1],magenta:[.827,.02,.478,1],yellow:[.984,.902,.027,1],black:[.169,.169,.169,1]}};({...Us.pure,...Us.newsprint});var Ws=.7,Gs=1.3,Ks=`
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
`;new Float32Array([-.5,-.5,.5,-.5,.5,.5,-.5,-.5,.5,.5,-.5,.5]);var qs=`
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`,Js=4096,Ys=new Float32Array(Js);for(let e=0;e<Js;e++)Ys[e]=e;`${qs}${Ks}${Ws.toFixed(4)}${Gs.toFixed(4)}`;var Xs=`#version 300 es
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
`,Zs={size:10},Qs=class{constructor(e={}){this.params={...Zs,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element,{size:r}=this.params;e.draw({frag:Xs,uniforms:{src:e.src,cellUv:[r/(t||1),r/(n||1)]},target:e.target})}},$s=`#version 300 es
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
`,ec={spacing:4},tc=class{constructor(e={}){this.params={...ec,...e}}setParams(e){Object.assign(this.params,e)}render(e){let{spacing:t}=this.params;e.draw({frag:$s,uniforms:{src:e.src,innerHeight:e.dims.element[1]||1,spacing:t},target:e.target})}},nc=e(t(((e,t)=>{var n=function(e){var t=/(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i,n=0,r={},i={manual:e.Prism&&e.Prism.manual,disableWorkerMessageHandler:e.Prism&&e.Prism.disableWorkerMessageHandler,util:{encode:function e(t){return t instanceof a?new a(t.type,e(t.content),t.alias):Array.isArray(t)?t.map(e):t.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/\u00a0/g,` `)},type:function(e){return Object.prototype.toString.call(e).slice(8,-1)},objId:function(e){return e.__id||Object.defineProperty(e,"__id",{value:++n}),e.__id},clone:function e(t,n){n||={};var r,a;switch(i.util.type(t)){case`Object`:if(a=i.util.objId(t),n[a])return n[a];for(var o in r={},n[a]=r,t)t.hasOwnProperty(o)&&(r[o]=e(t[o],n));return r;case`Array`:return a=i.util.objId(t),n[a]?n[a]:(r=[],n[a]=r,t.forEach(function(t,i){r[i]=e(t,n)}),r);default:return t}},getLanguage:function(e){for(;e;){var n=t.exec(e.className);if(n)return n[1].toLowerCase();e=e.parentElement}return`none`},setLanguage:function(e,n){e.className=e.className.replace(RegExp(t,`gi`),``),e.classList.add(`language-`+n)},currentScript:function(){if(typeof document>`u`)return null;if(document.currentScript&&document.currentScript.tagName===`SCRIPT`)return document.currentScript;try{throw Error()}catch(r){var e=(/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(r.stack)||[])[1];if(e){var t=document.getElementsByTagName(`script`);for(var n in t)if(t[n].src==e)return t[n]}return null}},isActive:function(e,t,n){for(var r=`no-`+t;e;){var i=e.classList;if(i.contains(t))return!0;if(i.contains(r))return!1;e=e.parentElement}return!!n}},languages:{plain:r,plaintext:r,text:r,txt:r,extend:function(e,t){var n=i.util.clone(i.languages[e]);for(var r in t)n[r]=t[r];return n},insertBefore:function(e,t,n,r){r||=i.languages;var a=r[e],o={};for(var s in a)if(a.hasOwnProperty(s)){if(s==t)for(var c in n)n.hasOwnProperty(c)&&(o[c]=n[c]);n.hasOwnProperty(s)||(o[s]=a[s])}var l=r[e];return r[e]=o,i.languages.DFS(i.languages,function(t,n){n===l&&t!=e&&(this[t]=o)}),o},DFS:function e(t,n,r,a){a||={};var o=i.util.objId;for(var s in t)if(t.hasOwnProperty(s)){n.call(t,s,t[s],r||s);var c=t[s],l=i.util.type(c);l===`Object`&&!a[o(c)]?(a[o(c)]=!0,e(c,n,null,a)):l===`Array`&&!a[o(c)]&&(a[o(c)]=!0,e(c,n,s,a))}}},plugins:{},highlightAll:function(e,t){i.highlightAllUnder(document,e,t)},highlightAllUnder:function(e,t,n){var r={callback:n,container:e,selector:`code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code`};i.hooks.run(`before-highlightall`,r),r.elements=Array.prototype.slice.apply(r.container.querySelectorAll(r.selector)),i.hooks.run(`before-all-elements-highlight`,r);for(var a=0,o;o=r.elements[a++];)i.highlightElement(o,t===!0,r.callback)},highlightElement:function(t,n,r){var a=i.util.getLanguage(t),o=i.languages[a];i.util.setLanguage(t,a);var s=t.parentElement;s&&s.nodeName.toLowerCase()===`pre`&&i.util.setLanguage(s,a);var c={element:t,language:a,grammar:o,code:t.textContent};function l(e){c.highlightedCode=e,i.hooks.run(`before-insert`,c),c.element.innerHTML=c.highlightedCode,i.hooks.run(`after-highlight`,c),i.hooks.run(`complete`,c),r&&r.call(c.element)}if(i.hooks.run(`before-sanity-check`,c),s=c.element.parentElement,s&&s.nodeName.toLowerCase()===`pre`&&!s.hasAttribute(`tabindex`)&&s.setAttribute(`tabindex`,`0`),!c.code)i.hooks.run(`complete`,c),r&&r.call(c.element);else if(i.hooks.run(`before-highlight`,c),!c.grammar)l(i.util.encode(c.code));else if(n&&e.Worker){var u=new Worker(i.filename);u.onmessage=function(e){l(e.data)},u.postMessage(JSON.stringify({language:c.language,code:c.code,immediateClose:!0}))}else l(i.highlight(c.code,c.grammar,c.language))},highlight:function(e,t,n){var r={code:e,grammar:t,language:n};if(i.hooks.run(`before-tokenize`,r),!r.grammar)throw Error(`The language "`+r.language+`" has no grammar.`);return r.tokens=i.tokenize(r.code,r.grammar),i.hooks.run(`after-tokenize`,r),a.stringify(i.util.encode(r.tokens),r.language)},tokenize:function(e,t){var n=t.rest;if(n){for(var r in n)t[r]=n[r];delete t.rest}var i=new c;return l(i,i.head,e),s(e,i,t,i.head,0),d(i)},hooks:{all:{},add:function(e,t){var n=i.hooks.all;n[e]=n[e]||[],n[e].push(t)},run:function(e,t){var n=i.hooks.all[e];if(n&&n.length)for(var r=0,a;a=n[r++];)a(t)}},Token:a};e.Prism=i;function a(e,t,n,r){this.type=e,this.content=t,this.alias=n,this.length=(r||``).length|0}a.stringify=function e(t,n){if(typeof t==`string`)return t;if(Array.isArray(t)){var r=``;return t.forEach(function(t){r+=e(t,n)}),r}var a={type:t.type,content:e(t.content,n),tag:`span`,classes:[`token`,t.type],attributes:{},language:n},o=t.alias;o&&(Array.isArray(o)?Array.prototype.push.apply(a.classes,o):a.classes.push(o)),i.hooks.run(`wrap`,a);var s=``;for(var c in a.attributes)s+=` `+c+`="`+(a.attributes[c]||``).replace(/"/g,`&quot;`)+`"`;return`<`+a.tag+` class="`+a.classes.join(` `)+`"`+s+`>`+a.content+`</`+a.tag+`>`};function o(e,t,n,r){e.lastIndex=t;var i=e.exec(n);if(i&&r&&i[1]){var a=i[1].length;i.index+=a,i[0]=i[0].slice(a)}return i}function s(e,t,n,r,c,d){for(var f in n)if(n.hasOwnProperty(f)&&n[f]){var p=n[f];p=Array.isArray(p)?p:[p];for(var m=0;m<p.length;++m){if(d&&d.cause==f+`,`+m)return;var h=p[m],ee=h.inside,te=!!h.lookbehind,ne=!!h.greedy,re=h.alias;if(ne&&!h.pattern.global){var ie=h.pattern.toString().match(/[imsuy]*$/)[0];h.pattern=RegExp(h.pattern.source,ie+`g`)}for(var g=h.pattern||h,_=r.next,v=c;_!==t.tail&&!(d&&v>=d.reach);v+=_.value.length,_=_.next){var y=_.value;if(t.length>e.length)return;if(!(y instanceof a)){var b=1,x;if(ne){if(x=o(g,v,e,te),!x||x.index>=e.length)break;var ae=x.index,oe=x.index+x[0].length,se=v;for(se+=_.value.length;ae>=se;)_=_.next,se+=_.value.length;if(se-=_.value.length,v=se,_.value instanceof a)continue;for(var ce=_;ce!==t.tail&&(se<oe||typeof ce.value==`string`);ce=ce.next)b++,se+=ce.value.length;b--,y=e.slice(v,se),x.index-=v}else if(x=o(g,0,y,te),!x)continue;var ae=x.index,le=x[0],ue=y.slice(0,ae),de=y.slice(ae+le.length),fe=v+y.length;d&&fe>d.reach&&(d.reach=fe);var pe=_.prev;ue&&(pe=l(t,pe,ue),v+=ue.length),u(t,pe,b);var me=new a(f,ee?i.tokenize(le,ee):le,re,le);if(_=l(t,pe,me),de&&l(t,_,de),b>1){var he={cause:f+`,`+m,reach:fe};s(e,t,n,_.prev,v,he),d&&he.reach>d.reach&&(d.reach=he.reach)}}}}}}function c(){var e={value:null,prev:null,next:null},t={value:null,prev:e,next:null};e.next=t,this.head=e,this.tail=t,this.length=0}function l(e,t,n){var r=t.next,i={value:n,prev:t,next:r};return t.next=i,r.prev=i,e.length++,i}function u(e,t,n){for(var r=t.next,i=0;i<n&&r!==e.tail;i++)r=r.next;t.next=r,r.prev=t,e.length-=i}function d(e){for(var t=[],n=e.head.next;n!==e.tail;)t.push(n.value),n=n.next;return t}if(!e.document)return e.addEventListener&&(i.disableWorkerMessageHandler||e.addEventListener(`message`,function(t){var n=JSON.parse(t.data),r=n.language,a=n.code,o=n.immediateClose;e.postMessage(i.highlight(a,i.languages[r],r)),o&&e.close()},!1)),i;var f=i.util.currentScript();f&&(i.filename=f.src,f.hasAttribute(`data-manual`)&&(i.manual=!0));function p(){i.manual||i.highlightAll()}if(!i.manual){var m=document.readyState;m===`loading`||m===`interactive`&&f&&f.defer?document.addEventListener(`DOMContentLoaded`,p):window.requestAnimationFrame?window.requestAnimationFrame(p):window.setTimeout(p,16)}return i}(typeof window<`u`?window:typeof WorkerGlobalScope<`u`&&self instanceof WorkerGlobalScope?self:{});t!==void 0&&t.exports&&(t.exports=n),typeof global<`u`&&(global.Prism=n),n.languages.markup={comment:{pattern:/<!--(?:(?!<!--)[\s\S])*?-->/,greedy:!0},prolog:{pattern:/<\?[\s\S]+?\?>/,greedy:!0},doctype:{pattern:/<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,greedy:!0,inside:{"internal-subset":{pattern:/(^[^\[]*\[)[\s\S]+(?=\]>$)/,lookbehind:!0,greedy:!0,inside:null},string:{pattern:/"[^"]*"|'[^']*'/,greedy:!0},punctuation:/^<!|>$|[[\]]/,"doctype-tag":/^DOCTYPE/i,name:/[^\s<>'"]+/}},cdata:{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,greedy:!0},tag:{pattern:/<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,greedy:!0,inside:{tag:{pattern:/^<\/?[^\s>\/]+/,inside:{punctuation:/^<\/?/,namespace:/^[^\s>\/:]+:/}},"special-attr":[],"attr-value":{pattern:/=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,inside:{punctuation:[{pattern:/^=/,alias:`attr-equals`},{pattern:/^(\s*)["']|["']$/,lookbehind:!0}]}},punctuation:/\/?>/,"attr-name":{pattern:/[^\s>\/]+/,inside:{namespace:/^[^\s>\/:]+:/}}}},entity:[{pattern:/&[\da-z]{1,8};/i,alias:`named-entity`},/&#x?[\da-f]{1,8};/i]},n.languages.markup.tag.inside[`attr-value`].inside.entity=n.languages.markup.entity,n.languages.markup.doctype.inside[`internal-subset`].inside=n.languages.markup,n.hooks.add(`wrap`,function(e){e.type===`entity`&&(e.attributes.title=e.content.replace(/&amp;/,`&`))}),Object.defineProperty(n.languages.markup.tag,"addInlined",{value:function(e,t){var r={};r[`language-`+t]={pattern:/(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,lookbehind:!0,inside:n.languages[t]},r.cdata=/^<!\[CDATA\[|\]\]>$/i;var i={"included-cdata":{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,inside:r}};i[`language-`+t]={pattern:/[\s\S]+/,inside:n.languages[t]};var a={};a[e]={pattern:RegExp(`(<__[^>]*>)(?:<!\\[CDATA\\[(?:[^\\]]|\\](?!\\]>))*\\]\\]>|(?!<!\\[CDATA\\[)[\\s\\S])*?(?=<\\/__>)`.replace(/__/g,function(){return e}),`i`),lookbehind:!0,greedy:!0,inside:i},n.languages.insertBefore(`markup`,`cdata`,a)}}),Object.defineProperty(n.languages.markup.tag,"addAttribute",{value:function(e,t){n.languages.markup.tag.inside[`special-attr`].push({pattern:RegExp(`(^|["'\\s])(?:`+e+`)\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s'">=]+(?=[\\s>]))`,`i`),lookbehind:!0,inside:{"attr-name":/^[^\s=]+/,"attr-value":{pattern:/=[\s\S]+/,inside:{value:{pattern:/(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,lookbehind:!0,alias:[t,`language-`+t],inside:n.languages[t]},punctuation:[{pattern:/^=/,alias:`attr-equals`},/"|'/]}}}})}}),n.languages.html=n.languages.markup,n.languages.mathml=n.languages.markup,n.languages.svg=n.languages.markup,n.languages.xml=n.languages.extend(`markup`,{}),n.languages.ssml=n.languages.xml,n.languages.atom=n.languages.xml,n.languages.rss=n.languages.xml,(function(e){var t=/(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;e.languages.css={comment:/\/\*[\s\S]*?\*\//,atrule:{pattern:RegExp(`@[\\w-](?:[^;{\\s"']|\\s+(?!\\s)|`+t.source+`)*?(?:;|(?=\\s*\\{))`),inside:{rule:/^@[\w-]+/,"selector-function-argument":{pattern:/(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,lookbehind:!0,alias:`selector`},keyword:{pattern:/(^|[^\w-])(?:and|not|only|or)(?![\w-])/,lookbehind:!0}}},url:{pattern:RegExp(`\\burl\\((?:`+t.source+`|(?:[^\\\\\\r\\n()"']|\\\\[\\s\\S])*)\\)`,`i`),greedy:!0,inside:{function:/^url/i,punctuation:/^\(|\)$/,string:{pattern:RegExp(`^`+t.source+`$`),alias:`url`}}},selector:{pattern:RegExp(`(^|[{}\\s])[^{}\\s](?:[^{};"'\\s]|\\s+(?![\\s{])|`+t.source+`)*(?=\\s*\\{)`),lookbehind:!0},string:{pattern:t,greedy:!0},property:{pattern:/(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,lookbehind:!0},important:/!important\b/i,function:{pattern:/(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,lookbehind:!0},punctuation:/[(){};:,]/},e.languages.css.atrule.inside.rest=e.languages.css;var n=e.languages.markup;n&&(n.tag.addInlined(`style`,`css`),n.tag.addAttribute(`style`,`css`))})(n),n.languages.clike={comment:[{pattern:/(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,lookbehind:!0,greedy:!0},{pattern:/(^|[^\\:])\/\/.*/,lookbehind:!0,greedy:!0}],string:{pattern:/(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,greedy:!0},"class-name":{pattern:/(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,lookbehind:!0,inside:{punctuation:/[.\\]/}},keyword:/\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,boolean:/\b(?:false|true)\b/,function:/\b\w+(?=\()/,number:/\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,operator:/[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,punctuation:/[{}[\];(),.:]/},n.languages.javascript=n.languages.extend(`clike`,{"class-name":[n.languages.clike[`class-name`],{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,lookbehind:!0}],keyword:[{pattern:/((?:^|\})\s*)catch\b/,lookbehind:!0},{pattern:/(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,lookbehind:!0}],function:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,number:{pattern:RegExp(`(^|[^\\w$])(?:NaN|Infinity|0[bB][01]+(?:_[01]+)*n?|0[oO][0-7]+(?:_[0-7]+)*n?|0[xX][\\dA-Fa-f]+(?:_[\\dA-Fa-f]+)*n?|\\d+(?:_\\d+)*n|(?:\\d+(?:_\\d+)*(?:\\.(?:\\d+(?:_\\d+)*)?)?|\\.\\d+(?:_\\d+)*)(?:[Ee][+-]?\\d+(?:_\\d+)*)?)(?![\\w$])`),lookbehind:!0},operator:/--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/}),n.languages.javascript[`class-name`][0].pattern=/(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/,n.languages.insertBefore(`javascript`,`keyword`,{regex:{pattern:RegExp(`((?:^|[^$\\w\\xA0-\\uFFFF."'\\])\\s]|\\b(?:return|yield))\\s*)\\/(?:(?:\\[(?:[^\\]\\\\\\r\\n]|\\\\.)*\\]|\\\\.|[^/\\\\\\[\\r\\n])+\\/[dgimyus]{0,7}|(?:\\[(?:[^[\\]\\\\\\r\\n]|\\\\.|\\[(?:[^[\\]\\\\\\r\\n]|\\\\.|\\[(?:[^[\\]\\\\\\r\\n]|\\\\.)*\\])*\\])*\\]|\\\\.|[^/\\\\\\[\\r\\n])+\\/[dgimyus]{0,7}v[dgimyus]{0,7})(?=(?:\\s|\\/\\*(?:[^*]|\\*(?!\\/))*\\*\\/)*(?:$|[\\r\\n,.;:})\\]]|\\/\\/))`),lookbehind:!0,greedy:!0,inside:{"regex-source":{pattern:/^(\/)[\s\S]+(?=\/[a-z]*$)/,lookbehind:!0,alias:`language-regex`,inside:n.languages.regex},"regex-delimiter":/^\/|\/$/,"regex-flags":/^[a-z]+$/}},"function-variable":{pattern:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,alias:`function`},parameter:[{pattern:/(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,lookbehind:!0,inside:n.languages.javascript},{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,lookbehind:!0,inside:n.languages.javascript},{pattern:/(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,lookbehind:!0,inside:n.languages.javascript},{pattern:/((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,lookbehind:!0,inside:n.languages.javascript}],constant:/\b[A-Z](?:[A-Z_]|\dx?)*\b/}),n.languages.insertBefore(`javascript`,`string`,{hashbang:{pattern:/^#!.*/,greedy:!0,alias:`comment`},"template-string":{pattern:/`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,greedy:!0,inside:{"template-punctuation":{pattern:/^`|`$/,alias:`string`},interpolation:{pattern:/((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,lookbehind:!0,inside:{"interpolation-punctuation":{pattern:/^\$\{|\}$/,alias:`punctuation`},rest:n.languages.javascript}},string:/[\s\S]+/}},"string-property":{pattern:/((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,lookbehind:!0,greedy:!0,alias:`property`}}),n.languages.insertBefore(`javascript`,`operator`,{"literal-property":{pattern:/((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,lookbehind:!0,alias:`property`}}),n.languages.markup&&(n.languages.markup.tag.addInlined(`script`,`javascript`),n.languages.markup.tag.addAttribute(`on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)`,`javascript`)),n.languages.js=n.languages.javascript,(function(){if(n===void 0||typeof document>`u`)return;Element.prototype.matches||(Element.prototype.matches=Element.prototype.msMatchesSelector||Element.prototype.webkitMatchesSelector);var e=`Loading…`,t=function(e,t){return`✖ Error `+e+` while fetching file: `+t},r=`✖ Error: File does not exist or is empty`,i={js:`javascript`,py:`python`,rb:`ruby`,ps1:`powershell`,psm1:`powershell`,sh:`bash`,bat:`batch`,h:`c`,tex:`latex`},a=`data-src-status`,o=`loading`,s=`loaded`,c=`failed`,l=`pre[data-src]:not([`+a+`="`+s+`"]):not([`+a+`="`+o+`"])`;function u(e,n,i){var a=new XMLHttpRequest;a.open(`GET`,e,!0),a.onreadystatechange=function(){a.readyState==4&&(a.status<400&&a.responseText?n(a.responseText):a.status>=400?i(t(a.status,a.statusText)):i(r))},a.send(null)}function d(e){var t=/^\s*(\d+)\s*(?:(,)\s*(?:(\d+)\s*)?)?$/.exec(e||``);if(t){var n=Number(t[1]),r=t[2],i=t[3];return r?i?[n,Number(i)]:[n,void 0]:[n,n]}}n.hooks.add(`before-highlightall`,function(e){e.selector+=`, `+l}),n.hooks.add(`before-sanity-check`,function(t){var r=t.element;if(r.matches(l)){t.code=``,r.setAttribute(a,o);var f=r.appendChild(document.createElement(`CODE`));f.textContent=e;var p=r.getAttribute(`data-src`),m=t.language;if(m===`none`){var h=(/\.(\w+)$/.exec(p)||[,`none`])[1];m=i[h]||h}n.util.setLanguage(f,m),n.util.setLanguage(r,m);var ee=n.plugins.autoloader;ee&&ee.loadLanguages(m),u(p,function(e){r.setAttribute(a,s);var t=d(r.getAttribute(`data-range`));if(t){var i=e.split(/\r\n?|\n/g),o=t[0],c=t[1]==null?i.length:t[1];o<0&&(o+=i.length),o=Math.max(0,Math.min(o-1,i.length)),c<0&&(c+=i.length),c=Math.max(0,Math.min(c,i.length)),e=i.slice(o,c).join(`
`),r.hasAttribute(`data-start`)||r.setAttribute(`data-start`,String(o+1))}f.textContent=e,n.highlightElement(f)},function(e){r.setAttribute(a,c),f.textContent=e})}}),n.plugins.fileHighlight={highlight:function(e){for(var t=(e||document).querySelectorAll(l),r=0,i;i=t[r++];)n.highlightElement(i)}};var f=!1;n.fileHighlight=function(){f||=(console.warn("Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead."),!0),n.plugins.fileHighlight.highlight.apply(this,arguments)}})()}))(),1);nc.default.manual=!0,nc.default.highlightAll();function rc(e,t){return(t??document).querySelector(e)}function ic(e,t,n){return e*(1-n)+t*n}var ac={logo:`
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
    `},oc=class{vfx=new Es({pixelRatio:window.devicePixelRatio,zIndex:-1});vfx2=new Es({pixelRatio:1,zIndex:-2,scrollPadding:!1});async initBG(){let e=rc(`#BG`),t=0;function n(e,t,n){return e*(1-n)+t*n}function r(){t=n(t,window.scrollY,.03),e.style.setProperty(`transform`,`translateY(-${t*.1}px)`),requestAnimationFrame(r)}r(),await this.vfx2.add(e,{shader:ac.blob})}async initVFX(){await Promise.all(Array.from(document.querySelectorAll(`*[data-shader]`)).map(e=>{let t=e.getAttribute(`data-shader`),n=e.getAttribute(`data-uniforms`),r=n?JSON.parse(n):void 0;return this.vfx.add(e,{shader:t,overflow:Number.parseFloat(e.getAttribute(`data-overflow`)??`0`),uniforms:r,intersection:{threshold:Number.parseFloat(e.getAttribute(`data-threshold`)??`0`)}})}))}async initDiv(){let e=rc(`#div`);await this.vfx.add(e,{shader:`rgbShift`,overflow:100});for(let t of e.querySelectorAll(`input,textarea`))t.addEventListener(`input`,()=>this.vfx.update(e));let t=rc(`textarea`,e);new MutationObserver(()=>this.vfx.update(e)).observe(t,{attributes:!0})}async initCanvas(){let e=document.getElementById(`canvas`),t=e.getContext(`2d`);if(!t)throw`Failed to get the canvas context`;let{width:n,height:r}=e.getBoundingClientRect(),i=window.devicePixelRatio??1;e.width=n*i,e.height=r*i,t.scale(i,i);let a=[n/2,r/2],o=a,s=[o],c=!1,l=Date.now();e.addEventListener(`mousemove`,e=>{c=!0,a=[e.offsetX,e.offsetY]}),e.addEventListener(`mouseleave`,e=>{c=!1});let u=!1;new IntersectionObserver(e=>{for(let t of e)u=t.intersectionRatio>.1},{threshold:[0,1,.2,.8]}).observe(e);let d=()=>{if(requestAnimationFrame(d),u){if(!c){let e=Date.now()/1e3-l;a=[n*.5+Math.sin(e*1.3)*n*.3,r*.5+Math.sin(e*1.7)*r*.3]}o=[ic(o[0],a[0],.1),ic(o[1],a[1],.1)],s.push(o),s.splice(0,s.length-30),t.clearRect(0,0,n,r),t.fillStyle=`black`,t.fillRect(0,0,n,r),t.fillStyle=`white`,t.font=`bold ${n*.14}px sans-serif`,t.fillText(`HOVER ME`,n/2,r/2),t.textBaseline=`middle`,t.textAlign=`center`;for(let e=0;e<s.length;e++){let[n,r]=s[e],i=e/s.length*255;t.fillStyle=`rgba(${255-i}, 255, ${i}, ${e/s.length*.5+.5})`,t.beginPath(),t.arc(n,r,e+20,0,2*Math.PI),t.fill()}this.vfx.update(e)}};d(),await this.vfx.add(e,{shader:ac.canvas})}async initCustomShader(){let e=rc(`#custom`);await this.vfx.add(e,{shader:ac.custom,uniforms:{scroll:()=>window.scrollY/window.innerHeight}})}async initEffects(){let e=rc(`#effect-bloom`);await this.vfx.add(e,{effect:new Hs({threshold:.2,intensity:5})});let t=rc(`#effect-crt`);await this.vfx.add(t,{effect:[new Qs({size:10}),new tc({spacing:5}),new Hs({threshold:.01,softness:.2,intensity:10,scatter:1,pad:200})]})}async initMultipass(){let e=rc(`#multipass`);await this.vfx.add(e,{shader:[{frag:`
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
                    `}]})}hideMask(){rc(`#MaskTop`).style.setProperty(`height`,`0`),rc(`#MaskBottom`).style.setProperty(`opacity`,`0`)}async showLogo(){let e=rc(`#Logo`),t=rc(`#LogoTagline`);return Promise.all([this.vfx.add(e,{shader:ac.logo,overflow:[0,3e3,0,100],uniforms:{delay:0},intersection:{threshold:1}}),this.vfx.add(t,{shader:ac.logo,overflow:[0,3e3,0,1e3],uniforms:{delay:.3},intersection:{threshold:1}})])}async showProfile(){let e=rc(`#profile`);await this.vfx.add(e,{shader:ac.logo,overflow:[0,3e3,0,2e3],uniforms:{delay:.5},intersection:{rootMargin:[-100,0,-100,0],threshold:1}})}};window.addEventListener(`load`,async()=>{let e=new oc;await e.initBG(),await Promise.all([await e.initVFX(),e.initDiv(),e.initCanvas(),e.initCustomShader(),e.initMultipass(),e.initEffects()]),e.hideMask(),setTimeout(()=>{e.showLogo(),e.showProfile()},2e3)});
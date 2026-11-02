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
    `};function o(e){return e.tagName===`CANVAS`&&(e.hasAttribute(`layoutsubtree`)||e.getAttribute(`content`)===`drawable`)}function s(e,t){e.setAttribute(`layoutsubtree`,``),e.setAttribute(`content`,`drawable`),t?.setAttribute(`drawable`,``)}function c(e,t,n,r){if(t.width<=0||t.height<=0)return null;let i=t.left-e.left,a=t.top-e.top;return i+t.width<=0||a+t.height<=0||i>=e.width||a>=e.height?null:[i*n,a*r,t.width*n,t.height*r]}function l(e){let t=e.getBoundingClientRect(),n=getComputedStyle(e),r=Number.parseFloat(n.paddingLeft)||0,i=Number.parseFloat(n.paddingRight)||0,a=Number.parseFloat(n.paddingTop)||0,o=Number.parseFloat(n.paddingBottom)||0,s=e.clientWidth>0?t.width/e.offsetWidth:1,c=e.clientHeight>0?t.height/e.offsetHeight:1;return{left:t.left+(e.clientLeft+r)*s,top:t.top+(e.clientTop+a)*c,width:Math.max(0,e.clientWidth-r-i)*s,height:Math.max(0,e.clientHeight-a-o)*c}}function u(e){return typeof e.checkVisibility==`function`?e.checkVisibility({visibilityProperty:!0,opacityProperty:!0}):getComputedStyle(e).visibility!==`hidden`}function d(e,t){let n=t.querySelectorAll(`canvas`);if(n.length===0)return;let r=t.getBoundingClientRect();if(r.width<=0||r.height<=0)return;let i=e.canvas.width/r.width,a=e.canvas.height/r.height;for(let t of n){if(t.width===0||t.height===0||!u(t))continue;let n=c(r,l(t),i,a);if(n)try{e.drawImage(t,...n)}catch{}}}function f(e){return e.currentSrc||e.src}function p(e){let t=f(e);if(!t||t.startsWith(`data:`))return!1;try{return new URL(t,location.href).origin!==location.origin}catch{return!1}}async function m(e){let t=await(await fetch(e)).blob();return URL.createObjectURL(t)}async function h(e){let t=Array.from(e.querySelectorAll(`img`)).filter(e=>e.complete&&e.naturalWidth>0&&p(e));if(t.length===0)return()=>{};let n=new Map,r=[];return await Promise.all(t.map(async e=>{try{let t=f(e),i=await m(t);n.set(e,t),r.push(i),await new Promise(t=>{e.addEventListener(`load`,()=>t(),{once:!0}),e.src=i})}catch{}})),()=>{for(let[e,t]of n)e.src=t;for(let e of r)URL.revokeObjectURL(e)}}var g=[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`],ee=[`position`,`top`,`right`,`bottom`,`left`,`float`,`flex`,`flex-grow`,`flex-shrink`,`flex-basis`,`align-self`,`justify-self`,`place-self`,`order`,`grid-column`,`grid-column-start`,`grid-column-end`,`grid-row`,`grid-row-start`,`grid-row-end`,`grid-area`],_=new WeakMap,v=new WeakMap,y=new WeakMap,te=new WeakMap,b=new WeakMap,ne=new WeakMap,re=new WeakMap,x=new WeakSet;async function ie(e,t){s(e,e.firstElementChild);let n=e.getContext(`2d`);if(!n)throw Error(`Failed to get 2d context from layoutsubtree canvas`);let{onCapture:r,maxSize:i}=t,a=null,o=null,c=new Promise(e=>{o=e}),l=null,u=t=>{if(t){if(t===l)return;l=t}let s=e.firstElementChild;if(!s||e.width===0||e.height===0)return;s.hasAttribute(`drawable`)||s.setAttribute(`drawable`,``),n.clearRect(0,0,e.width,e.height),n.drawElementImage(s,0,0),d(n,s);let c=e.width,u=e.height;if(i&&(c>i||u>i)){let e=Math.min(i/c,i/u);c=Math.floor(c*e),u=Math.floor(u*e)}(!a||a.width!==c||a.height!==u)&&(a=new OffscreenCanvas(c,u));let f=a.getContext(`2d`);if(f){if(f.clearRect(0,0,c,u),f.drawImage(e,0,0,c,u),n.clearRect(0,0,e.width,e.height),o){o(a),o=null;return}r(a)}};e.onpaint=u,e.addEventListener(`paint`,u),v.set(e,u);let f=new ResizeObserver(t=>{for(let n of t){let t=n.devicePixelContentBoxSize?.[0];if(t)e.width=t.inlineSize,e.height=t.blockSize;else{let t=n.borderBoxSize?.[0];if(t){let n=window.devicePixelRatio;e.width=Math.round(t.inlineSize*n),e.height=Math.round(t.blockSize*n)}}}e.requestPaint()});f.observe(e,{box:`device-pixel-content-box`}),_.set(e,f);let p=e.firstElementChild,m=``;if(p){let t=new ResizeObserver(t=>{let n=t[0].borderBoxSize?.[0];if(!n)return;let r=`${Math.round(n.blockSize)}px`;r!==m&&(m=r,e.style.setProperty(`height`,r))});t.observe(p),y.set(e,t)}return c}function ae(e){e.onpaint=null;let t=v.get(e);t&&(e.removeEventListener(`paint`,t),v.delete(e));let n=_.get(e);n&&(n.disconnect(),_.delete(e));let r=y.get(e);r&&(r.disconnect(),y.delete(e))}async function oe(e,t){let n=e.getBoundingClientRect(),r=document.createElement(`canvas`);e.hasAttribute(`drawable`)||x.add(e),s(r,e),r.className=e.className;let i=e.getAttribute(`style`);i&&r.setAttribute(`style`,i),r.style.setProperty(`padding`,`0`),r.style.setProperty(`border`,`none`),r.style.setProperty(`box-sizing`,`content-box`),r.style.setProperty(`background`,`transparent`);let a=getComputedStyle(e),o=a.display===`inline`?`block`:a.display;r.style.setProperty(`display`,o);for(let e of g)r.style.setProperty(e,a.getPropertyValue(e));for(let e of ee)r.style.setProperty(e,a.getPropertyValue(e));e.style.width.endsWith(`px`)?r.style.setProperty(`width`,`${n.width}px`):r.style.setProperty(`width`,`100%`),r.style.height||r.style.setProperty(`height`,`${n.height}px`);let c=window.devicePixelRatio;r.width=Math.round(n.width*c),r.height=Math.round(n.height*c),te.set(e,e.style.margin),b.set(e,e.style.width),ne.set(e,e.style.boxSizing),e.parentNode?.insertBefore(r,e),r.appendChild(e),e.style.setProperty(`margin`,`0`),e.style.setProperty(`width`,`100%`),e.style.setProperty(`box-sizing`,`border-box`);let l=await h(e);return re.set(r,l),{canvas:r,initialCapture:await ie(r,t)}}function se(e,t){ae(e);let n=re.get(e);n&&(n(),re.delete(e)),e.parentNode?.insertBefore(t,e),e.remove(),x.has(t)&&(t.removeAttribute(`drawable`),x.delete(t));let r=te.get(t);r!==void 0&&(t.style.margin=r,te.delete(t));let i=b.get(t);i!==void 0&&(t.style.width=i,b.delete(t));let a=ne.get(t);a!==void 0&&(t.style.boxSizing=a,ne.delete(t))}var ce;function le(){if(ce!==void 0)return ce;try{let e=document.createElement(`canvas`),t=e.getContext(`2d`);ce=t!==null&&typeof t.drawElementImage==`function`&&typeof e.requestPaint==`function`}catch{ce=!1}return ce}function ue(e){let t=typeof window<`u`?window.devicePixelRatio:1,n;n=e.scrollPadding===void 0?[.1,.1]:e.scrollPadding===!1?[0,0]:Array.isArray(e.scrollPadding)?[e.scrollPadding[0]??.1,e.scrollPadding[1]??.1]:[e.scrollPadding,e.scrollPadding];let r;return r=e.postEffect===void 0?[]:Array.isArray(e.postEffect)?e.postEffect:[e.postEffect],{pixelRatio:e.pixelRatio??t,zIndex:e.zIndex??void 0,autoplay:e.autoplay??!0,fixedCanvas:e.scrollPadding===!1,scrollPadding:n,wrapper:e.wrapper,postEffects:r,preserveDrawingBuffer:e.preserveDrawingBuffer??!1,timeScale:e.timeScale??1}}var de=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},fe=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},pe,me,he,ge,_e,ve,ye,be,S=class{constructor(e,t,n){pe.add(this),this.wrapS=`clamp`,this.wrapT=`clamp`,this.minFilter=`linear`,this.magFilter=`linear`,this.needsUpdate=!0,this.source=null,me.set(this,void 0),he.set(this,!1),ge.set(this,void 0),_e.set(this,void 0),de(this,me,e,`f`),this.gl=e.gl;let r=n?.externalHandle;de(this,_e,r!==void 0,`f`),r===void 0?fe(this,pe,`m`,ve).call(this):(this.texture=r,de(this,he,!0,`f`),this.needsUpdate=!1),t&&(this.source=t),de(this,ge,n?.autoRegister!==!1&&!fe(this,_e,`f`),`f`),fe(this,ge,`f`)&&e.addResource(this)}restore(){fe(this,_e,`f`)||(fe(this,pe,`m`,ve).call(this),de(this,he,!1,`f`),this.needsUpdate=!0)}bind(e){let t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&=(fe(this,pe,`m`,ye).call(this),!1)}dispose(){fe(this,ge,`f`)&&fe(this,me,`f`).removeResource(this),fe(this,_e,`f`)||this.gl.deleteTexture(this.texture)}};me=new WeakMap,he=new WeakMap,ge=new WeakMap,_e=new WeakMap,pe=new WeakSet,ve=function(){let e=this.gl.createTexture();if(!e)throw Error(`[VFX-JS] Failed to create texture`);this.texture=e},ye=function(){let e=this.gl,t=this.source;if(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4),t)try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)}catch(e){console.error(e)}else if(!fe(this,he,`f`)){let t=new Uint8Array([0,0,0,0]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,t)}fe(this,pe,`m`,be).call(this),de(this,he,!0,`f`)},be=function(){let e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,xe(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,xe(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,Se(e,this.minFilter)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,Se(e,this.magFilter))};function xe(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function Se(e,t){return t===`nearest`?e.NEAREST:e.LINEAR}function Ce(e){return new Promise((t,n)=>{let r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>t(r),r.onerror=n,r.src=e})}var we=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Te=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ee,De,Oe,ke=class{constructor(e,t,n,r={}){Ee.add(this),De.set(this,void 0),we(this,De,e,`f`),this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(n)),this.float=r.float??!1,this.mipmap=r.mipmap??!1,this.texture=new S(e,void 0,{autoRegister:!1});let i=r.wrap;i!==void 0&&(typeof i==`string`?(this.texture.wrapS=i,this.texture.wrapT=i):(this.texture.wrapS=i[0],this.texture.wrapT=i[1])),r.filter!==void 0&&(this.texture.minFilter=r.filter,this.texture.magFilter=r.filter),Te(this,Ee,`m`,Oe).call(this),e.addResource(this)}setSize(e,t){let n=Math.max(1,Math.floor(e)),r=Math.max(1,Math.floor(t));n===this.width&&r===this.height||(this.width=n,this.height=r,Te(this,Ee,`m`,Oe).call(this))}restore(){this.texture.restore(),Te(this,Ee,`m`,Oe).call(this)}dispose(){Te(this,De,`f`).removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.texture.dispose()}generateMipmaps(){if(!this.mipmap)return;let e=this.gl;e.bindTexture(e.TEXTURE_2D,this.texture.texture),e.generateMipmap(e.TEXTURE_2D),e.bindTexture(e.TEXTURE_2D,null)}};De=new WeakMap,Ee=new WeakSet,Oe=function(){let e=this.gl,t=this.fbo,n=e.createFramebuffer();if(!n)throw Error(`[VFX-JS] Failed to create framebuffer`);this.fbo=n;let r=this.texture.texture;e.bindTexture(e.TEXTURE_2D,r);let i=Te(this,De,`f`).floatLinearFilter;if(this.float&&i&&!Te(this,De,`f`).floatBlend)throw Error(`[VFX-JS] EXT_float_blend is not supported.`);let a=this.float?i?e.RGBA32F:e.RGBA16F:e.RGBA8,o=this.float?i?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;if(this.mipmap){let t=Math.floor(Math.log2(Math.max(this.width,this.height)))+1,n=this.width,r=this.height;for(let i=0;i<t;i++)e.texImage2D(e.TEXTURE_2D,i,a,n,r,0,e.RGBA,o,null),n=Math.max(1,n>>1),r=Math.max(1,r>>1)}else e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,e.RGBA,o,null);let s=this.texture.minFilter===`nearest`?e.NEAREST:e.LINEAR,c=this.texture.magFilter===`nearest`?e.NEAREST:e.LINEAR,l=this.mipmap?this.texture.minFilter===`nearest`?e.NEAREST_MIPMAP_NEAREST:e.LINEAR_MIPMAP_LINEAR:s,u=Ae(e,this.texture.wrapS),d=Ae(e,this.texture.wrapT);e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,l),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,c),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,u),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,d),e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.texture.needsUpdate=!1,this.texture.source=null,t&&e.deleteFramebuffer(t)};function Ae(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function je(e,t,n,r){return{x:e.left+n,y:t-r-e.bottom,w:e.right-e.left,h:e.bottom-e.top}}function Me(e,t,n,r){return{x:e,y:t,w:n,h:r}}var Ne=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},C=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Pe,Fe,Ie,Le,Re=class{constructor(e,t,n,r,i,a={}){Pe.set(this,void 0),Fe.set(this,void 0),Ie.set(this,void 0),Le.set(this,void 0),Ne(this,Pe,t,`f`),Ne(this,Fe,n,`f`),Ne(this,Ie,r,`f`);let o=t*r,s=n*r,c={float:i,wrap:a.wrap,filter:a.filter,mipmap:a.mipmap};Ne(this,Le,[new ke(e,o,s,c),new ke(e,o,s,c)],`f`)}get texture(){return C(this,Le,`f`)[0].texture}get target(){return C(this,Le,`f`)[1]}resize(e,t){if(e===C(this,Pe,`f`)&&t===C(this,Fe,`f`))return;Ne(this,Pe,e,`f`),Ne(this,Fe,t,`f`);let n=e*C(this,Ie,`f`),r=t*C(this,Ie,`f`);C(this,Le,`f`)[0].setSize(n,r),C(this,Le,`f`)[1].setSize(n,r)}swap(){Ne(this,Le,[C(this,Le,`f`)[1],C(this,Le,`f`)[0]],`f`)}getViewport(){return Me(0,0,C(this,Pe,`f`),C(this,Fe,`f`))}dispose(){C(this,Le,`f`)[0].dispose(),C(this,Le,`f`)[1].dispose()}};Pe=new WeakMap,Fe=new WeakMap,Ie=new WeakMap,Le=new WeakMap;var ze=class{constructor(e=0,t=0){this.x=0,this.y=0,this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}},Be=class{constructor(e=0,t=0,n=0,r=0){this.x=0,this.y=0,this.z=0,this.w=0,this.x=e,this.y=t,this.z=n,this.w=r}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}},Ve=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},He=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ue,We,Ge,Ke,qe,Je,Ye;function Xe(e){return/#version\s+300\s+es\b/.test(e)?`300 es`:/#version\s+100\b/.test(e)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(e)?`100`:`300 es`}var Ze=class{constructor(e,t,n,r){Ue.add(this),We.set(this,void 0),Ge.set(this,void 0),Ke.set(this,void 0),qe.set(this,void 0),Je.set(this,new Map),Ve(this,We,e,`f`),this.gl=e.gl,Ve(this,Ge,t,`f`),Ve(this,Ke,n,`f`),Ve(this,qe,r??Xe(n),`f`),He(this,Ue,`m`,Ye).call(this),e.addResource(this)}restore(){He(this,Ue,`m`,Ye).call(this)}use(){this.gl.useProgram(this.program)}hasUniform(e){return He(this,Je,`f`).has(e)}uploadUniforms(e){let t=this.gl,n=0;for(let[r,i]of He(this,Je,`f`)){let a=e[r];if(!a)continue;let o=a.value;if(o!=null){if(et(i.type)){o instanceof S&&(o.bind(n),t.uniform1i(i.location,n),n++);continue}o instanceof S||nt(t,i,o)}}}dispose(){He(this,We,`f`).removeResource(this),this.gl.deleteProgram(this.program)}};We=new WeakMap,Ge=new WeakMap,Ke=new WeakMap,qe=new WeakMap,Je=new WeakMap,Ue=new WeakSet,Ye=function(){let e=this.gl,t=Qe(e,e.VERTEX_SHADER,$e(He(this,Ge,`f`),He(this,qe,`f`))),n=Qe(e,e.FRAGMENT_SHADER,$e(He(this,Ke,`f`),He(this,qe,`f`))),r=e.createProgram();if(!r)throw Error(`[VFX-JS] Failed to create program`);if(e.attachShader(r,t),e.attachShader(r,n),e.bindAttribLocation(r,0,`position`),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let i=e.getProgramInfoLog(r)??``;throw e.deleteShader(t),e.deleteShader(n),e.deleteProgram(r),Error(`[VFX-JS] Program link failed: ${i}`)}e.detachShader(r,t),e.detachShader(r,n),e.deleteShader(t),e.deleteShader(n),this.program=r,He(this,Je,`f`).clear();let i=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<i;t++){let n=e.getActiveUniform(r,t);if(!n)continue;let i=n.name.replace(/\[0\]$/,``),a=e.getUniformLocation(r,n.name);a&&He(this,Je,`f`).set(i,{location:a,type:n.type,size:n.size})}};function Qe(e,t,n){let r=e.createShader(t);if(!r)throw Error(`[VFX-JS] Failed to create shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)??``;throw e.deleteShader(r),Error(`[VFX-JS] Shader compile failed: ${t}\n\n${n}`)}return r}function $e(e,t){return e.replace(/^\s+/,``).startsWith(`#version`)||t===`100`?e:`#version 300 es\n${e}`}function et(e){return e===35678||e===36298||e===36306||e===35682}var tt=new Set;function nt(e,t,n){let r=t.location,i=t.size>1,a=n,o=n,s=n;switch(t.type){case e.FLOAT:i?e.uniform1fv(r,a):e.uniform1f(r,n);return;case e.FLOAT_VEC2:if(i)e.uniform2fv(r,a);else if(n instanceof ze)e.uniform2f(r,n.x,n.y);else{let t=n;e.uniform2f(r,t[0],t[1])}return;case e.FLOAT_VEC3:if(i)e.uniform3fv(r,a);else{let t=n;e.uniform3f(r,t[0],t[1],t[2])}return;case e.FLOAT_VEC4:if(i)e.uniform4fv(r,a);else if(n instanceof Be)e.uniform4f(r,n.x,n.y,n.z,n.w);else{let t=n;e.uniform4f(r,t[0],t[1],t[2],t[3])}return;case e.INT:i?e.uniform1iv(r,o):e.uniform1i(r,n);return;case e.INT_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,t[0],t[1])}return;case e.INT_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,t[0],t[1],t[2])}return;case e.INT_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,t[0],t[1],t[2],t[3])}return;case e.BOOL:i?e.uniform1iv(r,o):e.uniform1i(r,+!!n);return;case e.BOOL_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,+!!t[0],+!!t[1])}return;case e.BOOL_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,+!!t[0],+!!t[1],+!!t[2])}return;case e.BOOL_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,+!!t[0],+!!t[1],+!!t[2],+!!t[3])}return;case e.FLOAT_MAT2:e.uniformMatrix2fv(r,!1,a);return;case e.FLOAT_MAT3:e.uniformMatrix3fv(r,!1,a);return;case e.FLOAT_MAT4:e.uniformMatrix4fv(r,!1,a);return;case e.UNSIGNED_INT:i?e.uniform1uiv(r,s):e.uniform1ui(r,n);return;case e.UNSIGNED_INT_VEC2:if(i)e.uniform2uiv(r,s);else{let t=n;e.uniform2ui(r,t[0],t[1])}return;case e.UNSIGNED_INT_VEC3:if(i)e.uniform3uiv(r,s);else{let t=n;e.uniform3ui(r,t[0],t[1],t[2])}return;case e.UNSIGNED_INT_VEC4:if(i)e.uniform4uiv(r,s);else{let t=n;e.uniform4ui(r,t[0],t[1],t[2],t[3])}return;default:tt.has(t.type)||(tt.add(t.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${t.type.toString(16)}; skipping upload.`));return}}var rt=class{constructor(e,t,n,r,i,a){this.gl=e.gl,this.program=new Ze(e,t,n,a),this.uniforms=r,this.blend=i}dispose(){this.program.dispose()}};function it(e,t,n,r,i,a,o,s){let c=r?r.width/s:a,l=r?r.height/s:o,u=Math.max(0,i.x),d=Math.max(0,i.y),f=Math.min(c,i.x+i.w),p=Math.min(l,i.y+i.h),m=f-u,h=p-d;m<=0||h<=0||(e.bindFramebuffer(e.FRAMEBUFFER,r?r.fbo:null),e.viewport(Math.round(u*s),Math.round(d*s),Math.round(m*s),Math.round(h*s)),at(e,n.blend),n.program.use(),n.program.uploadUniforms(n.uniforms),t.draw())}function at(e,t){if(t===`none`){e.disable(e.BLEND);return}e.enable(e.BLEND),e.blendEquation(e.FUNC_ADD),t===`premultiplied`?e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA):t===`additive`?e.blendFuncSeparate(e.ONE,e.ONE,e.ONE,e.ONE):e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA)}var ot=class{constructor(t){this.uniforms={src:{value:null},offset:{value:new ze},resolution:{value:new ze},viewport:{value:new Be}},this.pass=new rt(t,e,n,this.uniforms,`premultiplied`)}setUniforms(e,t,n){this.uniforms.src.value=e,this.uniforms.resolution.value.set(n.w*t,n.h*t),this.uniforms.offset.value.set(n.x*t,n.y*t)}dispose(){this.pass.dispose()}},st=e=>{let t=document.implementation.createHTMLDocument(`test`),n=t.createRange();n.selectNodeContents(t.documentElement),n.deleteContents();let r=document.createElement(`head`);return t.documentElement.appendChild(r),t.documentElement.appendChild(n.createContextualFragment(e)),t.documentElement.setAttribute(`xmlns`,t.documentElement.namespaceURI),new XMLSerializer().serializeToString(t).replace(/<!DOCTYPE html>/,``)};async function ct(e,t,n,r){let i=e.getBoundingClientRect(),a=window.devicePixelRatio,o=Math.ceil(i.width),s=Math.ceil(i.height),c=o*a,l=s*a,u=1,d=c,f=l;r&&(d>r||f>r)&&(u=Math.min(r/d,r/f),d=Math.floor(d*u),f=Math.floor(f*u));let p=n&&n.width===d&&n.height===f?n:new OffscreenCanvas(d,f),m=e.cloneNode(!0);await lt(e,m),ut(e,m),m.style.setProperty(`opacity`,t.toString()),m.style.setProperty(`margin`,`0px`),dt(m),m.style.setProperty(`box-sizing`,`border-box`),m.style.setProperty(`width`,`${o}px`),m.style.setProperty(`height`,`${s}px`);let h=m.outerHTML,g=`<svg xmlns="http://www.w3.org/2000/svg" width="${c}" height="${l}"><foreignObject width="100%" height="100%">${st(h)}</foreignObject></svg>`;return new Promise((e,t)=>{let n=new Image;n.onload=()=>{let r=p.getContext(`2d`);if(r===null)return t();r.clearRect(0,0,d,f);let i=a*u;r.scale(i,i),r.drawImage(n,0,0,c,l),r.setTransform(1,0,0,1,0,0),e(p)},n.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(g)}`})}async function lt(e,t){let n=window.getComputedStyle(e);for(let e of Array.from(n))/(-inline-|-block-|^inline-|^block-)/.test(e)||/^-webkit-.*(start|end|before|after|logical)/.test(e)||t.style.setProperty(e,n.getPropertyValue(e),n.getPropertyPriority(e));if(t.tagName===`INPUT`)t.setAttribute(`value`,t.value);else if(t.tagName===`TEXTAREA`)t.innerHTML=t.value;else if(t.tagName===`IMG`)try{t.src=await ft(f(e))}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];await lt(r,i)}}function ut(e,t){if(typeof e.computedStyleMap==`function`)try{let n=e.computedStyleMap();for(let e of[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`]){let r=n.get(e);r instanceof CSSKeywordValue&&r.value===`auto`&&t.style.setProperty(e,`auto`)}}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];r instanceof HTMLElement&&i instanceof HTMLElement&&ut(r,i)}}function dt(e){let t=e;for(;;){let e=t.style;if(Number.parseFloat(e.paddingTop)>0||Number.parseFloat(e.borderTopWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.firstElementChild;if(!n)break;n.style.setProperty(`margin-top`,`0px`),t=n}for(t=e;;){let e=t.style;if(Number.parseFloat(e.paddingBottom)>0||Number.parseFloat(e.borderBottomWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.lastElementChild;if(!n)break;n.style.setProperty(`margin-bottom`,`0px`),t=n}}async function ft(e){let t=await fetch(e).then(e=>e.blob());return new Promise(e=>{let n=new FileReader;n.onload=function(){e(this.result)},n.readAsDataURL(t)})}var pt=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},w=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},mt,ht,gt,_t,vt,yt,bt,xt,St,Ct,wt,Tt,Et=Object.freeze({__brand:`EffectQuad`});function Dt(e){return e===Et}function Ot(e,t){switch(t){case`lines`:return e.LINES;case`lineStrip`:return e.LINE_STRIP;case`points`:return e.POINTS;default:return e.TRIANGLES}}function kt(e,t){if(t instanceof Float32Array)return e.FLOAT;if(t instanceof Uint8Array)return e.UNSIGNED_BYTE;if(t instanceof Uint16Array)return e.UNSIGNED_SHORT;if(t instanceof Uint32Array)return e.UNSIGNED_INT;if(t instanceof Int8Array)return e.BYTE;if(t instanceof Int16Array)return e.SHORT;if(t instanceof Int32Array)return e.INT;throw Error(`[VFX-JS] Unsupported attribute typed array`)}function At(e,t){if(ArrayBuffer.isView(t)&&!(t instanceof DataView))return{name:e,data:t,itemSize:2,normalized:!1,perInstance:!1};let n=t;return{name:e,data:n.data,itemSize:n.itemSize,normalized:n.normalized??!1,perInstance:n.perInstance??!1}}var jt=class{constructor(e,t,n){mt.add(this),ht.set(this,void 0),gt.set(this,void 0),_t.set(this,void 0),vt.set(this,[]),yt.set(this,null),this.indexType=0,this.hasIndices=!1,this.drawCount=0,this.drawStart=0,bt.set(this,!1),pt(this,ht,e,`f`),this.gl=e.gl,pt(this,gt,t,`f`),pt(this,_t,n,`f`),this.mode=Ot(this.gl,t.mode),this.instanceCount=t.instanceCount??0,w(this,mt,`m`,xt).call(this),e.addResource(this),pt(this,bt,!0,`f`)}restore(){pt(this,vt,[],`f`),pt(this,yt,null,`f`),w(this,mt,`m`,xt).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),this.hasIndices?this.instanceCount>0?e.drawElementsInstanced(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2),this.instanceCount):e.drawElements(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2)):this.instanceCount>0?e.drawArraysInstanced(this.mode,this.drawStart,this.drawCount,this.instanceCount):e.drawArrays(this.mode,this.drawStart,this.drawCount)}dispose(){w(this,bt,`f`)&&(w(this,ht,`f`).removeResource(this),pt(this,bt,!1,`f`));let e=this.gl;e.deleteVertexArray(this.vao);for(let t of w(this,vt,`f`))e.deleteBuffer(t);w(this,yt,`f`)&&e.deleteBuffer(w(this,yt,`f`)),pt(this,vt,[],`f`),pt(this,yt,null,`f`)}};ht=new WeakMap,gt=new WeakMap,_t=new WeakMap,vt=new WeakMap,yt=new WeakMap,bt=new WeakMap,mt=new WeakSet,xt=function(){let e=this.gl,t=e.createVertexArray();if(!t)throw Error(`[VFX-JS] Failed to create VAO`);this.vao=t,e.bindVertexArray(t);let n=w(this,_t,`f`).program,r=null;for(let[t,i]of Object.entries(w(this,gt,`f`).attributes)){let a=At(t,i),o=e.getAttribLocation(n,a.name);if(o<0)continue;let s=e.createBuffer();if(!s)throw Error(`[VFX-JS] Failed to create VBO for "${a.name}"`);w(this,vt,`f`).push(s),e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,a.data,e.STATIC_DRAW);let c=kt(e,a.data);e.enableVertexAttribArray(o),c===e.FLOAT||c===e.HALF_FLOAT||a.normalized?e.vertexAttribPointer(o,a.itemSize,c,a.normalized,0,0):e.vertexAttribIPointer(o,a.itemSize,c,0,0),a.perInstance&&e.vertexAttribDivisor(o,1),t===`position`&&r===null&&(r=a.data.length/a.itemSize)}let i=0,a=w(this,gt,`f`).indices;if(a){let t=e.createBuffer();if(!t)throw Error(`[VFX-JS] Failed to create IBO`);pt(this,yt,t,`f`),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t),e.bufferData(e.ELEMENT_ARRAY_BUFFER,a,e.STATIC_DRAW),this.hasIndices=!0,this.indexType=a instanceof Uint32Array?e.UNSIGNED_INT:e.UNSIGNED_SHORT,i=a.length}else this.hasIndices=!1;e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null),w(this,yt,`f`)&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null);let o=this.hasIndices?i:r??0,s=w(this,gt,`f`).drawRange;this.drawStart=s?.start??0,this.drawCount=s?.count===void 0?Math.max(0,o-this.drawStart):s.count};var Mt=class{constructor(e,t){St.set(this,void 0),Ct.set(this,void 0),wt.set(this,new WeakMap),Tt.set(this,new Set),pt(this,St,e,`f`),pt(this,Ct,t,`f`)}get quad(){return w(this,Ct,`f`)}resolve(e,t){let n=w(this,wt,`f`).get(e);n||(n=new Map,w(this,wt,`f`).set(e,n));let r=n.get(t);return r||(r=new jt(w(this,St,`f`),e,t),n.set(t,r),w(this,Tt,`f`).add(r)),r}release(e){let t=w(this,wt,`f`).get(e);if(t){for(let e of t.values())e.dispose(),w(this,Tt,`f`).delete(e);w(this,wt,`f`).delete(e)}}dispose(){for(let e of w(this,Tt,`f`))e.dispose();w(this,Tt,`f`).clear()}};St=new WeakMap,Ct=new WeakMap,wt=new WeakMap,Tt=new WeakMap;var T=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},E=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},D,Nt,Pt,Ft,It,Lt,Rt,zt,Bt,Vt,O,Ht,k,A,Ut,Wt,Gt,Kt,qt,Jt,Yt,Xt,Zt,Qt=Symbol.for(`@vfx-js/effect.resolve-texture`),$t=Symbol.for(`@vfx-js/effect.resolve-rt`);function en(e){return e[Qt]()}function tn(e){return e[$t]}var nn=`#version 300 es
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
`,rn=`
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
`,an=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`,on=`
precision highp float;
varying vec2 uv;
uniform sampler2D src;
void main() {
    gl_FragColor = texture2D(src, uv);
}
`,sn=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uvSrc);
}
`,cn=`
precision highp float;
varying vec2 uvSrc;
uniform sampler2D src;
void main() {
    gl_FragColor = texture2D(src, uvSrc);
}
`,ln=class{constructor(e,t,n,r,i,a){D.add(this),Nt.set(this,void 0),Pt.set(this,void 0),Ft.set(this,void 0),It.set(this,void 0),Lt.set(this,void 0),Rt.set(this,[]),zt.set(this,[]),Bt.set(this,[]),Vt.set(this,[]),O.set(this,`init`),Ht.set(this,!1),k.set(this,void 0),A.set(this,void 0),Kt.set(this,[]),T(this,Nt,e,`f`),T(this,Pt,e.gl,`f`),T(this,Ft,n,`f`),T(this,It,a,`f`),T(this,Lt,new Mt(e,t),`f`),T(this,k,{outputBufferW:1,outputBufferH:1,canvasBufferSize:[1,1],outputViewport:{x:0,y:0,w:1,h:1},elementBufferW:1,elementBufferH:1,contentRectUv:[0,0,1,1],srcRectUv:[0,0,1,1]},`f`);let o={time:0,deltaTime:0,pixelRatio:n,resolution:[1,1],mouse:[0,0],mouseViewport:[0,0],intersection:0,enterTime:0,leaveTime:0,src:r,target:null,uniforms:{},vfxProps:i,dims:{element:[1,1],elementPixel:[1,1],canvas:[1,1],canvasPixel:[1,1],pixelRatio:n,contentRect:[0,0,1,1],srcRect:[0,0,1,1],canvasRect:[0,0,1,1]},quad:Et,gl:E(this,Pt,`f`),createRenderTarget:e=>E(this,D,`m`,Ut).call(this,e),releaseGeometry:e=>E(this,Lt,`f`).release(e),wrapTexture:(e,t)=>E(this,D,`m`,Gt).call(this,e,t),draw:e=>E(this,D,`m`,qt).call(this,e),blit:(e,t,n)=>E(this,D,`m`,Jt).call(this,e,t,n),clear:e=>E(this,D,`m`,Yt).call(this,e),onContextRestored:e=>{let t=E(this,Nt,`f`).onContextRestored(e);return E(this,Vt,`f`).push(t),t}};T(this,A,o,`f`)}get ctx(){return E(this,A,`f`)}setPhase(e){T(this,O,e,`f`)}setFrameDims(e){T(this,k,e,`f`),E(this,A,`f`).resolution=[e.canvasBufferSize[0],e.canvasBufferSize[1]];for(let t of E(this,Bt,`f`))t.resolver.resize?.(e.outputBufferW,e.outputBufferH)}setEffectDims(e){E(this,A,`f`).dims=e}setFrameState(e){let t=E(this,A,`f`);t.time=e.time,t.deltaTime=e.deltaTime,t.mouse=e.mouse,t.mouseViewport=e.mouseViewport,t.intersection=e.intersection,t.enterTime=e.enterTime,t.leaveTime=e.leaveTime,t.uniforms=e.uniforms}setSrc(e){E(this,A,`f`).src=e}setOutput(e){E(this,A,`f`).target=e}passthroughCopy(e,t,n){let r=E(this,O,`f`);T(this,O,`render`,`f`);let i=E(this,A,`f`).target;E(this,A,`f`).target=t;try{let r=E(this,k,`f`).outputViewport;E(this,k,`f`).outputViewport={...n};let i=E(this,A,`f`).vfxProps.glslVersion===`100`?on:an;E(this,D,`m`,Xt).call(this,{frag:i,uniforms:{src:e},target:t}),E(this,k,`f`).outputViewport=r}finally{E(this,A,`f`).target=i,T(this,O,r,`f`)}}clearRt(e){let t=E(this,Pt,`f`),n=tn(e);t.bindFramebuffer(t.FRAMEBUFFER,n.getWriteFbo().fbo),t.viewport(0,0,e.width,e.height),t.clearColor(0,0,0,0),t.disable(t.SCISSOR_TEST),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)}tickAutoUpdates(){for(let e of E(this,Kt,`f`))e()}dispose(){T(this,O,`disposed`,`f`);for(let e of E(this,Vt,`f`))e();T(this,Vt,[],`f`);for(let e of E(this,zt,`f`))e.resolver.dispose?.();T(this,zt,[],`f`),T(this,Bt,[],`f`);for(let e of E(this,Rt,`f`))e.dispose();T(this,Rt,[],`f`),E(this,Lt,`f`).dispose(),T(this,Kt,[],`f`)}};Nt=new WeakMap,Pt=new WeakMap,Ft=new WeakMap,It=new WeakMap,Lt=new WeakMap,Rt=new WeakMap,zt=new WeakMap,Bt=new WeakMap,Vt=new WeakMap,O=new WeakMap,Ht=new WeakMap,k=new WeakMap,A=new WeakMap,Kt=new WeakMap,D=new WeakSet,Ut=function(e){let t=e?.persistent??!1,n=e?.float??!1,r=dn(e?.wrap),i=e?.filter,a=e?.mipmap??!1,o=a!==!1,s=a===!0,c=e?.size,l=c?c[0]:E(this,k,`f`).outputBufferW,u=c?c[1]:E(this,k,`f`).outputBufferH,d,f,p;if(t){let e=c?1:E(this,Ft,`f`),t=c?l:l/e,a=c?u:u/e,m=new Re(E(this,Nt,`f`),t,a,e,n,{wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>m.texture,getWriteFbo:()=>m.target,swap:()=>m.swap(),resize:c?void 0:(e,t)=>{m.resize(e/E(this,Ft,`f`),t/E(this,Ft,`f`))},dispose:()=>m.dispose()},o&&(d.regenerateMipmaps=()=>m.target.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>m.target.width,p=()=>m.target.height}else{let e=new ke(E(this,Nt,`f`),l,u,{float:n,wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>e.texture,getWriteFbo:()=>e,resize:c?void 0:(t,n)=>e.setSize(t,n),dispose:()=>e.dispose()},o&&(d.regenerateMipmaps=()=>e.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>e.width,p=()=>e.height}let m,h=mn(d,f,p,()=>E(this,D,`m`,Wt).call(this,m));return m={handle:h,resolver:d},E(this,zt,`f`).push(m),c||E(this,Bt,`f`).push(m),h},Wt=function(e){let t=E(this,zt,`f`).indexOf(e);if(t<0)return;E(this,zt,`f`).splice(t,1);let n=E(this,Bt,`f`).indexOf(e);n>=0&&E(this,Bt,`f`).splice(n,1),e.resolver.dispose?.()},Gt=function(e,t){let n=dn(t?.wrap),r=t?.filter,i,a,o,s=null;if(un(e)){if(!t?.size)throw Error(`[VFX-JS] wrapTexture(WebGLTexture) requires opts.size`);let[n,r]=t.size;i=new S(E(this,Nt,`f`),void 0,{autoRegister:!1,externalHandle:e}),a=()=>n,o=()=>r}else{let n=e;i=new S(E(this,Nt,`f`),n);let r=t?.size,c=e=>{if(r)return e===`w`?r[0]:r[1];if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return e===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return e===`w`?n.videoWidth:n.videoHeight;let t=n;return e===`w`?t.width:t.height};a=()=>c(`w`),o=()=>c(`h`);let l=typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement||typeof HTMLCanvasElement<`u`&&n instanceof HTMLCanvasElement||typeof OffscreenCanvas<`u`&&n instanceof OffscreenCanvas;(t?.autoUpdate??l)&&(s=()=>{i.needsUpdate=!0})}i.wrapS=n[0],i.wrapT=n[1],r!==void 0&&(i.minFilter=r,i.magFilter=r),E(this,Rt,`f`).push(i),s&&E(this,Kt,`f`).push(s);let c=!1;return pn(()=>i,a,o,()=>{if(c)return;c=!0;let e=E(this,Rt,`f`).indexOf(i);if(e!==-1&&E(this,Rt,`f`).splice(e,1),s){let e=E(this,Kt,`f`).indexOf(s);e!==-1&&E(this,Kt,`f`).splice(e,1)}i.dispose()})},qt=function(e){if(E(this,O,`f`)!==`render`){E(this,O,`f`)===`update`&&!E(this,Ht,`f`)&&(T(this,Ht,!0,`f`),console.warn(`[VFX-JS] ctx.draw() called in update(); ignored. Move draws to render().`));return}E(this,D,`m`,Xt).call(this,e)},Jt=function(e,t,n){if(E(this,O,`f`)!==`render`){E(this,O,`f`)===`update`&&!E(this,Ht,`f`)&&(T(this,Ht,!0,`f`),console.warn(`[VFX-JS] ctx.blit() called in update(); ignored. Move draws to render().`));return}let r=E(this,A,`f`).vfxProps.glslVersion===`100`?cn:sn;E(this,D,`m`,Xt).call(this,{frag:r,uniforms:{src:e},target:t,blend:n?.blend,swap:n?.swap})},Yt=function(e){if(E(this,O,`f`)!==`render`){E(this,O,`f`)===`update`&&!E(this,Ht,`f`)&&(T(this,Ht,!0,`f`),console.warn(`[VFX-JS] ctx.clear() called in update(); ignored. Move draws to render().`));return}let t=E(this,Pt,`f`),n=E(this,A,`f`).target,r=e??n,i=r===null||r===n;if(t.clearColor(0,0,0,0),i){let e=r===null?null:tn(r).getWriteFbo().fbo,n=E(this,k,`f`).outputViewport;t.bindFramebuffer(t.FRAMEBUFFER,e),t.enable(t.SCISSOR_TEST),t.scissor(n.x,n.y,n.w,n.h),t.clear(t.COLOR_BUFFER_BIT),t.disable(t.SCISSOR_TEST),t.bindFramebuffer(t.FRAMEBUFFER,null);return}let a=tn(r);t.disable(t.SCISSOR_TEST);let o=()=>{t.bindFramebuffer(t.FRAMEBUFFER,a.getWriteFbo().fbo),t.clear(t.COLOR_BUFFER_BIT)};o(),a.swap&&(a.swap(),o(),a.swap()),t.bindFramebuffer(t.FRAMEBUFFER,null)},Xt=function(e){let t=E(this,Pt,`f`),n=e.vert??(E(this,A,`f`).vfxProps.glslVersion===`100`?rn:nn),r=E(this,It,`f`).get(n,e.frag,E(this,A,`f`).vfxProps.glslVersion),i=E(this,A,`f`).target,a=e.target===void 0||e.target===null?i:e.target,o=a===null||a===i,s,c,l,u,d,f,p;if(a===null)s=null,c=E(this,k,`f`).outputViewport.x,l=E(this,k,`f`).outputViewport.y,u=E(this,k,`f`).outputViewport.w,d=E(this,k,`f`).outputViewport.h;else{let e=tn(a);s=e.getWriteFbo().fbo,o?(c=E(this,k,`f`).outputViewport.x,l=E(this,k,`f`).outputViewport.y,u=E(this,k,`f`).outputViewport.w,d=E(this,k,`f`).outputViewport.h):(c=0,l=0,u=a.width,d=a.height),f=e.swap,e.mipmapAutoRegen&&(p=e.regenerateMipmaps)}t.bindFramebuffer(t.FRAMEBUFFER,s),t.viewport(c,l,u,d),t.disable(t.SCISSOR_TEST),at(t,e.blend??(a===null?`premultiplied`:`none`)),r.use();let m=E(this,D,`m`,Zt).call(this,e.uniforms);r.uploadUniforms(m);let h=e.geometry??Et;Dt(h)?E(this,Lt,`f`).quad.draw():E(this,Lt,`f`).resolve(h,r).draw(),p?.(),f&&e.swap!==!1&&f()},Zt=function(e){let t={};if(t.contentRectUv={value:E(this,k,`f`).contentRectUv},t.srcRectUv={value:E(this,k,`f`).srcRectUv},!e)return t;for(let[n,r]of Object.entries(e))t[n]=fn(r);return t};function un(e){let t=globalThis.WebGLTexture;if(t&&typeof t==`function`&&e instanceof t)return!0;let n=e;return n.width===void 0&&n.naturalWidth===void 0&&n.videoWidth===void 0}function dn(e){return e===void 0?[`clamp`,`clamp`]:typeof e==`string`?[e,e]:[e[0],e[1]]}function fn(e){return typeof e==`object`&&e&&`__brand`in e?e.__brand===`EffectRenderTarget`?{value:tn(e).getReadTexture()}:{value:en(e)}:{value:e}}function pn(e,t,n,r){let i={__brand:`EffectTexture`,get width(){return t()},get height(){return n()},dispose(){r?.()}};return Object.defineProperty(i,Qt,{value:e}),i}function mn(e,t,n,r){let i={__brand:`EffectRenderTarget`,get width(){return t()},get height(){return n()},dispose:r??(()=>{}),generateMipmaps:()=>e.regenerateMipmaps?.()};return Object.defineProperty(i,$t,{value:e}),i}function hn(e){return mn({getReadTexture:()=>e.texture,getWriteFbo:()=>e},()=>e.width,()=>e.height)}function gn(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:Array.isArray(e)?{top:e[0],right:e[1],bottom:e[2],left:e[3]}:{top:e.top??0,right:e.right??0,bottom:e.bottom??0,left:e.left??0}}function _n(e){return gn(e)}var vn={top:0,right:0,bottom:0,left:0};function yn(e){return gn(e)}function bn(e){return{top:e.top,right:e.right,bottom:e.bottom,left:e.left}}function xn(e){return{top:e.top,left:e.left,right:e.left+Math.ceil(e.right-e.left),bottom:e.top+Math.ceil(e.bottom-e.top)}}function Sn(e,t){return{top:e.top-t.top,right:e.right+t.right,bottom:e.bottom+t.bottom,left:e.left-t.left}}function Cn(e,t,n){return Math.min(Math.max(e,t),n)}function wn(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return c<=0||l<=0?[0,0,1,1]:[(n-o)/c,(r-s)/l,i/c,a/l]}function Tn(e,t){let n=Cn(t.left,e.left,e.right),r=(Cn(t.right,e.left,e.right)-n)/(t.right-t.left),i=Cn(t.top,e.top,e.bottom);return r*((Cn(t.bottom,e.top,e.bottom)-i)/(t.bottom-t.top))}var j=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},M=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},N,En,Dn,On,kn,An,P,F,I,jn,Mn,Nn,Pn,Fn,In,Ln,Rn,zn,Bn,Vn,Hn,Un,Wn,Gn,Kn,qn,Jn,Yn=class{constructor(e,t,n,r,i,a,o,s){N.add(this),En.set(this,void 0),Dn.set(this,void 0),On.set(this,void 0),kn.set(this,void 0),An.set(this,void 0),P.set(this,void 0),F.set(this,void 0),I.set(this,void 0),jn.set(this,[]),Mn.set(this,[]),Nn.set(this,void 0),Pn.set(this,new Set),Fn.set(this,!1),In.set(this,void 0),Ln.set(this,_n(0)),Rn.set(this,null),j(this,En,e,`f`),j(this,Dn,t,`f`),j(this,On,n,`f`),j(this,kn,i,`f`),j(this,An,s,`f`),j(this,P,r,`f`),j(this,Nn,a,`f`),j(this,In,o,`f`),j(this,F,r.map(()=>M(this,N,`m`,Bn).call(this)),`f`),r.length===0&&j(this,Rn,M(this,N,`m`,Bn).call(this),`f`),j(this,I,M(this,N,`m`,zn).call(this),`f`)}get effects(){return M(this,P,`f`)}get hosts(){return M(this,F,`f`)}get renderingIndices(){return M(this,I,`f`)}get stages(){return M(this,Mn,`f`)}get hitTestPadBuffer(){return M(this,Ln,`f`)}async initAll(){for(let e=0;e<M(this,P,`f`).length;e++){let t=M(this,P,`f`)[e],n=M(this,F,`f`)[e];n.setPhase(`init`);try{t.init&&await t.init(n.ctx)}catch(t){console.error(`[VFX-JS] effect[${e}].init() failed:`,t);for(let t=e-1;t>=0;t--)M(this,N,`m`,Vn).call(this,t),M(this,F,`f`)[t].dispose();throw M(this,F,`f`)[e].dispose(),t}n.setPhase(`update`)}}run(e){if(M(this,Fn,`f`)||!e.isVisible)return;j(this,I,M(this,N,`m`,zn).call(this),`f`);let t=M(this,I,`f`).length;for(let t of M(this,F,`f`))t.setFrameState({time:e.time,deltaTime:e.deltaTime,mouse:e.mouse,mouseViewport:e.mouseViewport,intersection:e.intersection,enterTime:e.enterTime,leaveTime:e.leaveTime,uniforms:e.resolvedUniforms});M(this,N,`m`,Hn).call(this,e);for(let t=0;t<M(this,F,`f`).length;t++)M(this,F,`f`)[t].setFrameDims(M(this,N,`m`,Jn).call(this,t,e)),M(this,F,`f`)[t].setEffectDims(M(this,N,`m`,Gn).call(this,t,e));for(let e=0;e<M(this,P,`f`).length;e++){let t=M(this,P,`f`)[e];if(!t.update)continue;let n=M(this,F,`f`)[e];n.setPhase(`update`);try{t.update(n.ctx)}catch(t){let n=`${e}:update`;M(this,Pn,`f`).has(n)||(M(this,Pn,`f`).add(n),console.warn(`[VFX-JS] effect[${e}].update() threw; skipping this frame's update:`,t))}}if(t===0){(M(this,Rn,`f`)??M(this,F,`f`)[0]).passthroughCopy(M(this,Nn,`f`),e.finalTarget,e.elementRectOnCanvasPx);return}for(let n=0;n<t;n++){let r=M(this,I,`f`)[n],i=M(this,F,`f`)[r],a=M(this,P,`f`)[r];if(!a.render)continue;i.setPhase(`render`),i.tickAutoUpdates();let o=n===0?M(this,Nn,`f`):M(this,jn,`f`)[n-1].texHandle;i.setSrc(o);let s;n===t-1?s=e.finalTarget:(s=M(this,jn,`f`)[n].rtHandle,i.clearRt(s)),i.setOutput(s);try{a.render(i.ctx)}catch(e){let a=`${r}:render`;M(this,Pn,`f`).has(a)||(M(this,Pn,`f`).add(a),console.warn(`[VFX-JS] effect[${r}].render() threw; falling back to passthrough:`,e));let c=M(this,Mn,`f`)[n].outputViewport;s===null?i.passthroughCopy(o,null,c):n===t-1?i.passthroughCopy(o,s,c):i.passthroughCopy(o,s,{x:0,y:0,w:s.width,h:s.height})}i.setPhase(`update`)}}dispose(){if(!M(this,Fn,`f`)){j(this,Fn,!0,`f`);for(let e=M(this,P,`f`).length-1;e>=0;e--)M(this,N,`m`,Vn).call(this,e),M(this,F,`f`)[e].dispose();M(this,Rn,`f`)&&(M(this,Rn,`f`).dispose(),j(this,Rn,null,`f`));for(let e of M(this,jn,`f`))e.fb.dispose();j(this,jn,[],`f`),j(this,Mn,[],`f`)}}async replaceEffects(e){if(M(this,Fn,`f`))throw Error(`[VFX-JS] replaceEffects on disposed chain`);let t=M(this,P,`f`),n=M(this,F,`f`),r=new Map;for(let e=0;e<t.length;e++)r.set(t[e],n[e]);let i=Array(e.length),a=[];for(let t=0;t<e.length;t++){let n=e[t],o=r.get(n);if(o)i[t]=o,r.delete(n);else{let e=M(this,N,`m`,Bn).call(this);i[t]=e,a.push({host:e,effect:n})}}for(let e=0;e<a.length;e++){let{host:t,effect:n}=a[e];t.setPhase(`init`);try{n.init&&await n.init(t.ctx),t.setPhase(`update`)}catch(n){console.error(`[VFX-JS] replaceEffects: new effect init() failed:`,n);for(let t=e-1;t>=0;t--){let e=a[t];if(e.effect.dispose)try{e.effect.dispose()}catch(e){console.error(`[VFX-JS] dispose during init rollback threw:`,e)}e.host.dispose()}throw t.dispose(),n}}for(let[e,t]of r){if(e.dispose)try{e.dispose()}catch(e){console.error(`[VFX-JS] effect.dispose() threw during replaceEffects:`,e)}t.dispose()}for(let e of M(this,jn,`f`))e.fb.dispose();j(this,jn,[],`f`),j(this,Mn,[],`f`),e.length===0&&!M(this,Rn,`f`)?j(this,Rn,M(this,N,`m`,Bn).call(this),`f`):e.length>0&&M(this,Rn,`f`)&&(M(this,Rn,`f`).dispose(),j(this,Rn,null,`f`)),j(this,P,e,`f`),j(this,F,i,`f`),j(this,I,M(this,N,`m`,zn).call(this),`f`),M(this,Pn,`f`).clear()}};En=new WeakMap,Dn=new WeakMap,On=new WeakMap,kn=new WeakMap,An=new WeakMap,P=new WeakMap,F=new WeakMap,I=new WeakMap,jn=new WeakMap,Mn=new WeakMap,Nn=new WeakMap,Pn=new WeakMap,Fn=new WeakMap,In=new WeakMap,Ln=new WeakMap,Rn=new WeakMap,N=new WeakSet,zn=function(){return M(this,P,`f`).map((e,t)=>typeof e.render==`function`&&e.enabled!==!1?t:-1).filter(e=>e>=0)},Bn=function(){return new ln(M(this,En,`f`),M(this,Dn,`f`),M(this,On,`f`),M(this,Nn,`f`),M(this,kn,`f`),M(this,An,`f`))},Vn=function(e){let t=M(this,P,`f`)[e];if(t.dispose)try{t.dispose()}catch(t){console.error(`[VFX-JS] effect[${e}].dispose() threw:`,t)}},Hn=function(e){let t=M(this,I,`f`).length;if(j(this,Mn,Array(t),`f`),t===0)return;let n=M(this,In,`f`)?e.canvasBufferSize:e.elementBufferSize,r=[0,0,n[0],n[1]],i=M(this,N,`m`,qn).call(this,e),a=r;for(let n=0;n<t;n++){let o=M(this,I,`f`)[n],s=M(this,P,`f`)[o],c=n===t-1,l=M(this,N,`m`,Un).call(this,s,a,r,i,e)??a,u=[l[2],l[3]],d=wn(r,l),f=c?{x:e.elementRectOnCanvasPx.x+l[0],y:e.elementRectOnCanvasPx.y+l[1],w:u[0],h:u[1]}:{x:0,y:0,w:u[0],h:u[1]};M(this,Mn,`f`)[n]={dstRect:l,dstBufferSize:u,contentRectUv:d,outputViewport:f},c||M(this,N,`m`,Kn).call(this,n,u),a=l}let[o,s,c,l]=M(this,Mn,`f`)[t-1].dstRect;j(this,Ln,_n({top:Math.max(0,s+l-n[1]),right:Math.max(0,o+c-n[0]),bottom:Math.max(0,-s),left:Math.max(0,-o)}),`f`)},Un=function(e,t,n,r,i){if(e.outputRect)return e.outputRect(M(this,N,`m`,Wn).call(this,i,n,t,r))},Wn=function(e,t,n,r){let i=e.canvasBufferSize[0]/e.canvasSize[0]||1;return{element:M(this,In,`f`)?e.canvasSize:e.elementSize,elementPixel:M(this,In,`f`)?e.canvasBufferSize:e.elementBufferSize,canvas:e.canvasSize,canvasPixel:e.canvasBufferSize,pixelRatio:i,contentRect:t,srcRect:n,canvasRect:r}},Gn=function(e,t){let n=M(this,In,`f`)?t.canvasBufferSize:t.elementBufferSize,r=[0,0,n[0],n[1]],i=M(this,N,`m`,qn).call(this,t),a=M(this,I,`f`).indexOf(e),o=a<=0?r:M(this,Mn,`f`)[a-1].dstRect;return M(this,N,`m`,Wn).call(this,t,r,o,i)},Kn=function(e,t){let n=M(this,jn,`f`)[e];if(n&&n.fb.width===t[0]&&n.fb.height===t[1])return;n&&n.fb.dispose();let r=new ke(M(this,En,`f`),t[0],t[1]),i=hn(r),a=pn(()=>r.texture,()=>r.width,()=>r.height);M(this,jn,`f`)[e]={fb:r,rtHandle:i,texHandle:a,bufferSize:t}},qn=function(e){let[t,n]=e.canvasBufferSize;if(M(this,In,`f`))return[0,0,t,n];let{x:r,y:i}=e.elementRectOnCanvasPx;return[-r,-i,t,n]},Jn=function(e,t){let n=M(this,I,`f`).indexOf(e),r,i,a,o,s;if(n<0)r=t.elementBufferSize[0],i=t.elementBufferSize[1],a={x:0,y:0,w:r,h:i},o=[0,0,1,1],s=[0,0,1,1];else{let e=M(this,Mn,`f`)[n];r=e.dstBufferSize[0],i=e.dstBufferSize[1],a=e.outputViewport,o=e.contentRectUv,s=n===0?[0,0,1,1]:M(this,Mn,`f`)[n-1].contentRectUv}return{outputBufferW:r,outputBufferH:i,canvasBufferSize:t.canvasBufferSize,outputViewport:a,elementBufferW:t.elementBufferSize[0],elementBufferH:t.elementBufferSize[1],contentRectUv:o,srcRectUv:s}};function Xn(e){this.data=e,this.pos=0}Xn.prototype.readByte=function(){return this.data[this.pos++]},Xn.prototype.peekByte=function(){return this.data[this.pos]},Xn.prototype.readBytes=function(e){return this.data.subarray(this.pos,this.pos+=e)},Xn.prototype.peekBytes=function(e){return this.data.subarray(this.pos,this.pos+e)},Xn.prototype.readString=function(e){for(var t=``,n=0;n<e;n++)t+=String.fromCharCode(this.readByte());return t},Xn.prototype.readBitArray=function(){for(var e=[],t=this.readByte(),n=7;n>=0;n--)e.push(!!(t&1<<n));return e},Xn.prototype.readUnsigned=function(e){var t=this.readBytes(2);return e?(t[1]<<8)+t[0]:(t[0]<<8)+t[1]};function Zn(e){this.stream=new Xn(e),this.output={}}Zn.prototype.parse=function(e){return this.parseParts(this.output,e),this.output},Zn.prototype.parseParts=function(e,t){for(var n=0;n<t.length;n++){var r=t[n];this.parsePart(e,r)}},Zn.prototype.parsePart=function(e,t){var n=t.label,r;if(!(t.requires&&!t.requires(this.stream,this.output,e)))if(t.loop){for(var i=[];t.loop(this.stream);){var a={};this.parseParts(a,t.parts),i.push(a)}e[n]=i}else t.parts?(r={},this.parseParts(r,t.parts),e[n]=r):t.parser?(r=t.parser(this.stream,this.output,e),t.skip||(e[n]=r)):t.bits&&(e[n]=this.parseBits(t.bits))};function Qn(e){return e.reduce(function(e,t){return e*2+t},0)}Zn.prototype.parseBits=function(e){var t={},n=this.stream.readBitArray();for(var r in e){var i=e[r];i.length?t[r]=Qn(n.slice(i.index,i.index+i.length)):t[r]=n[i.index]}return t};var L={readByte:function(){return function(e){return e.readByte()}},readBytes:function(e){return function(t){return t.readBytes(e)}},readString:function(e){return function(t){return t.readString(e)}},readUnsigned:function(e){return function(t){return t.readUnsigned(e)}},readArray:function(e,t){return function(n,r,i){for(var a=t(n,r,i),o=Array(a),s=0;s<a;s++)o[s]=n.readBytes(e);return o}}},$n={label:`blocks`,parser:function(e){for(var t=[],n=0,r=0,i=e.readByte();i!==r;i=e.readByte())t.push(e.readBytes(i)),n+=i;var a=new Uint8Array(n);n=0;for(var o=0;o<t.length;o++)a.set(t[o],n),n+=t[o].length;return a}},er={label:`gce`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===249},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`byteSize`,parser:L.readByte()},{label:`extras`,bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:`delay`,parser:L.readUnsigned(!0)},{label:`transparentColorIndex`,parser:L.readByte()},{label:`terminator`,parser:L.readByte(),skip:!0}]},tr={label:`image`,requires:function(e){return e.peekByte()===44},parts:[{label:`code`,parser:L.readByte(),skip:!0},{label:`descriptor`,parts:[{label:`left`,parser:L.readUnsigned(!0)},{label:`top`,parser:L.readUnsigned(!0)},{label:`width`,parser:L.readUnsigned(!0)},{label:`height`,parser:L.readUnsigned(!0)},{label:`lct`,bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:`lct`,requires:function(e,t,n){return n.descriptor.lct.exists},parser:L.readArray(3,function(e,t,n){return 2**(n.descriptor.lct.size+1)})},{label:`data`,parts:[{label:`minCodeSize`,parser:L.readByte()},$n]}]},nr={label:`text`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===1},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`blockSize`,parser:L.readByte()},{label:`preData`,parser:function(e,t,n){return e.readBytes(n.text.blockSize)}},$n]},rr={label:`frames`,parts:[er,{label:`application`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===255},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`blockSize`,parser:L.readByte()},{label:`id`,parser:function(e,t,n){return e.readString(n.blockSize)}},$n]},{label:`comment`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===254},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},$n]},tr,nr],loop:function(e){var t=e.peekByte();return t===33||t===44}},ir=[{label:`header`,parts:[{label:`signature`,parser:L.readString(3)},{label:`version`,parser:L.readString(3)}]},{label:`lsd`,parts:[{label:`width`,parser:L.readUnsigned(!0)},{label:`height`,parser:L.readUnsigned(!0)},{label:`gct`,bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:`backgroundColorIndex`,parser:L.readByte()},{label:`pixelAspectRatio`,parser:L.readByte()}]},{label:`gct`,requires:function(e,t){return t.lsd.gct.exists},parser:L.readArray(3,function(e,t){return 2**(t.lsd.gct.size+1)})},rr];function ar(e){var t=new Zn(new Uint8Array(e));this.raw=t.parse(ir),this.raw.hasImages=!1;for(var n=0;n<this.raw.frames.length;n++)if(this.raw.frames[n].image){this.raw.hasImages=!0;break}}ar.prototype.decompressFrame=function(e,t){if(e>=this.raw.frames.length)return null;var n=this.raw.frames[e];if(n.image){var r=n.image.descriptor.width*n.image.descriptor.height,i=o(n.image.data.minCodeSize,n.image.data.blocks,r);n.image.descriptor.lct.interlaced&&(i=s(i,n.image.descriptor.width));var a={pixels:i,dims:{top:n.image.descriptor.top,left:n.image.descriptor.left,width:n.image.descriptor.width,height:n.image.descriptor.height}};return n.image.descriptor.lct&&n.image.descriptor.lct.exists?a.colorTable=n.image.lct:a.colorTable=this.raw.gct,n.gce&&(a.delay=(n.gce.delay||10)*10,a.disposalType=n.gce.extras.disposal,n.gce.extras.transparentColorGiven&&(a.transparentIndex=n.gce.transparentColorIndex)),t&&(a.patch=c(a)),a}return null;function o(e,t,n){var r=4096,i=-1,a=n,o,s,c,l,u,d,f,p,m,h,g,ee,_,v,y,te,b=Array(n),ne=Array(r),re=Array(r),x=Array(r+1);for(ee=e,s=1<<ee,u=s+1,o=s+2,f=i,l=ee+1,c=(1<<l)-1,m=0;m<s;m++)ne[m]=0,re[m]=m;for(g=p=_=v=te=y=0,h=0;h<a;){if(v===0){if(p<l){g+=t[y]<<p,p+=8,y++;continue}if(m=g&c,g>>=l,p-=l,m>o||m==u)break;if(m==s){l=ee+1,c=(1<<l)-1,o=s+2,f=i;continue}if(f==i){x[v++]=re[m],f=m,_=m;continue}for(d=m,m==o&&(x[v++]=_,m=f);m>s;)x[v++]=re[m],m=ne[m];_=re[m]&255,x[v++]=_,o<r&&(ne[o]=f,re[o]=_,o++,(o&c)===0&&o<r&&(l++,c+=o)),f=d}v--,b[te++]=x[v],h++}for(h=te;h<a;h++)b[h]=0;return b}function s(e,t){for(var n=Array(e.length),r=e.length/t,i=function(r,i){var a=e.slice(i*t,(i+1)*t);n.splice.apply(n,[r*t,t].concat(a))},a=[0,4,2,1],o=[8,8,4,2],s=0,c=0;c<4;c++)for(var l=a[c];l<r;l+=o[c])i(l,s),s++;return n}function c(e){for(var t=e.pixels.length,n=new Uint8ClampedArray(t*4),r=0;r<t;r++){var i=r*4,a=e.pixels[r],o=e.colorTable[a];n[i]=o[0],n[i+1]=o[1],n[i+2]=o[2],n[i+3]=a===e.transparentIndex?0:255}return n}},ar.prototype.decompressFrames=function(e,t,n){t===void 0&&(t=0),n=n===void 0?this.raw.frames.length:Math.min(n,this.raw.frames.length);for(var r=[],i=t;i<n;i++)this.raw.frames[i].image&&r.push(this.decompressFrame(i,e));return r};var or=ar,sr=class e{static async create(t,n){let r=await fetch(t).then(e=>e.arrayBuffer()).then(e=>new or(e)),i=r.decompressFrames(!0,void 0,void 0),{width:a,height:o}=r.raw.lsd;return new e(i,a,o,n)}constructor(e,t,n,r){this.frames=[],this.index=0,this.playTime=0,this.frames=e,this.canvas=document.createElement(`canvas`),this.ctx=this.canvas.getContext(`2d`),this.pixelRatio=r,this.canvas.width=t,this.canvas.height=n,this.startTime=Date.now()}getCanvas(){return this.canvas}update(){let e=Date.now()-this.startTime;for(;this.playTime<e;){let e=this.frames[this.index%this.frames.length];this.playTime+=e.delay,this.index++}let t=this.frames[this.index%this.frames.length],n=new ImageData(t.patch,t.dims.width,t.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(n,t.dims.left,t.dims.top)}},cr=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},lr,ur,dr,fr,pr,mr=class{constructor(e,t=!1){this.isContextLost=!1,lr.set(this,new Set),ur.set(this,new Set),dr.set(this,new Set),fr.set(this,e=>{e.preventDefault(),this.isContextLost=!0;for(let e of cr(this,ur,`f`))e()}),pr.set(this,()=>{this.isContextLost=!1;let e=this.gl;e.getExtension(`EXT_color_buffer_float`),e.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!e.getExtension(`EXT_float_blend`);for(let e of cr(this,lr,`f`))e.restore();for(let e of cr(this,dr,`f`))e()});let n=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:t});if(!n)throw Error(`[VFX-JS] WebGL2 is not available.`);this.gl=n,this.canvas=e,n.getExtension(`EXT_color_buffer_float`),n.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!n.getExtension(`EXT_float_blend`),this.floatLinearFilter=!!n.getExtension(`OES_texture_float_linear`),this.maxTextureSize=n.getParameter(n.MAX_TEXTURE_SIZE),e.addEventListener(`webglcontextlost`,cr(this,fr,`f`),!1),e.addEventListener(`webglcontextrestored`,cr(this,pr,`f`),!1)}setSize(e,t,n){let r=Math.floor(e*n),i=Math.floor(t*n);(this.canvas.width!==r||this.canvas.height!==i)&&(this.canvas.width=r,this.canvas.height=i)}addResource(e){cr(this,lr,`f`).add(e)}removeResource(e){cr(this,lr,`f`).delete(e)}onContextLost(e){return cr(this,ur,`f`).add(e),()=>cr(this,ur,`f`).delete(e)}onContextRestored(e){return cr(this,dr,`f`).add(e),()=>cr(this,dr,`f`).delete(e)}};lr=new WeakMap,ur=new WeakMap,dr=new WeakMap,fr=new WeakMap,pr=new WeakMap;var hr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},gr=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},_r,vr,yr,br,xr=class{constructor(e){_r.add(this),vr.set(this,void 0),yr.set(this,void 0),hr(this,vr,e,`f`),this.gl=e.gl,gr(this,_r,`m`,br).call(this),e.addResource(this)}restore(){gr(this,_r,`m`,br).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){gr(this,vr,`f`).removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(gr(this,yr,`f`))}};vr=new WeakMap,yr=new WeakMap,_r=new WeakSet,br=function(){let e=this.gl,t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw Error(`[VFX-JS] Failed to create quad VAO`);this.vao=t,hr(this,yr,n,`f`);let r=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)};function Sr(e,t,n,r={}){return new ke(e,t,n,{float:r.float??!1})}function Cr(n,r){let i=r.renderingToBuffer??!1,a;a=i?`none`:r.premultipliedAlpha?`premultiplied`:`normal`;let o=r.glslVersion??Xe(r.fragmentShader);return new rt(n,r.vertexShader??(o===`100`?t:e),r.fragmentShader,r.uniforms,a,o)}var wr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},R=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},z,Tr,Er,Dr,Or,kr,Ar=class{constructor(e,t,n,r,i,a,o,s){if(z.set(this,void 0),Tr.set(this,void 0),Er.set(this,void 0),Dr.set(this,void 0),Or.set(this,void 0),kr.set(this,void 0),wr(this,Dr,r??!1,`f`),wr(this,Or,i??!1,`f`),wr(this,kr,a,`f`),wr(this,Tr,{},`f`),wr(this,z,{src:{value:null},offset:{value:new ze},resolution:{value:new ze},viewport:{value:new Be},time:{value:0},mouse:{value:new ze},passIndex:{value:0}},`f`),n)for(let[e,t]of Object.entries(n))typeof t==`function`?(R(this,Tr,`f`)[e]=t,R(this,z,`f`)[e]={value:t()}):R(this,z,`f`)[e]={value:t};this.pass=Cr(e,{fragmentShader:t,uniforms:R(this,z,`f`),renderingToBuffer:o??!1,premultipliedAlpha:!0,glslVersion:s})}get uniforms(){return R(this,z,`f`)}setUniforms(e,t,n,r,i,a){R(this,z,`f`).src.value=e,R(this,z,`f`).resolution.value.set(n.w*t,n.h*t),R(this,z,`f`).offset.value.set(n.x*t,n.y*t),R(this,z,`f`).time.value=r,R(this,z,`f`).mouse.value.set(i*t,a*t)}updateCustomUniforms(e){for(let[e,t]of Object.entries(R(this,Tr,`f`)))R(this,z,`f`)[e]&&(R(this,z,`f`)[e].value=t());if(e)for(let[t,n]of Object.entries(e))R(this,z,`f`)[t]&&(R(this,z,`f`)[t].value=n())}initializeBackbuffer(e,t,n,r){R(this,Dr,`f`)&&!R(this,Er,`f`)&&(R(this,kr,`f`)?wr(this,Er,new Re(e,R(this,kr,`f`)[0],R(this,kr,`f`)[1],1,R(this,Or,`f`)),`f`):wr(this,Er,new Re(e,t,n,r,R(this,Or,`f`)),`f`))}resizeBackbuffer(e,t){R(this,Er,`f`)&&!R(this,kr,`f`)&&R(this,Er,`f`).resize(e,t)}registerBufferUniform(e){R(this,z,`f`)[e]||(R(this,z,`f`)[e]={value:null})}get backbuffer(){return R(this,Er,`f`)}get persistent(){return R(this,Dr,`f`)}get float(){return R(this,Or,`f`)}get size(){return R(this,kr,`f`)}dispose(){this.pass.dispose(),R(this,Er,`f`)?.dispose()}};z=new WeakMap,Tr=new WeakMap,Er=new WeakMap,Dr=new WeakMap,Or=new WeakMap,kr=new WeakMap;var jr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Mr=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Nr,Pr,Fr=class{constructor(e){Nr.set(this,void 0),Pr.set(this,new Map),jr(this,Nr,e,`f`)}get(e,t,n){let r=`${t}\0${e}\0${n??``}`,i=Mr(this,Pr,`f`).get(r);return i||(i=new Ze(Mr(this,Nr,`f`),e,t,n),Mr(this,Pr,`f`).set(r,i)),i}get size(){return Mr(this,Pr,`f`).size}dispose(){for(let e of Mr(this,Pr,`f`).values())e.dispose();Mr(this,Pr,`f`).clear()}};Nr=new WeakMap,Pr=new WeakMap;var B=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},V=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},H,Ir,Lr,U,Rr,zr,Br,W,G,K,Vr,q,Hr,Ur,Wr,Gr,Kr,qr,J,Y,Jr,Yr,Xr,Zr,X,Qr,$r,ei,ti,ni,ri,ii,ai,oi,si,ci,li,ui,di,fi,pi,mi,hi,gi,_i,vi,Z,yi,bi,xi,Si,Ci,wi,Ti=new Map,Ei=class{constructor(e,t){H.add(this),Ir.set(this,void 0),Lr.set(this,void 0),U.set(this,void 0),Rr.set(this,void 0),zr.set(this,void 0),Br.set(this,void 0),W.set(this,void 0),G.set(this,[]),K.set(this,void 0),Vr.set(this,new Map),q.set(this,null),Hr.set(this,!1),Ur.set(this,new WeakSet),Wr.set(this,{}),Gr.set(this,{}),Kr.set(this,0),qr.set(this,void 0),J.set(this,2),Y.set(this,[]),Jr.set(this,0),Yr.set(this,1),Xr.set(this,Date.now()/1e3),Zr.set(this,!1),X.set(this,yn(0)),Qr.set(this,yn(0)),$r.set(this,[0,0]),ei.set(this,0),ti.set(this,0),ni.set(this,0),ri.set(this,0),ii.set(this,new WeakMap),oi.set(this,async()=>{if(typeof window<`u`){for(let e of V(this,Y,`f`))if(e.type===`text`&&e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await V(this,H,`m`,ci).call(this,e),e.width=n,e.height=r)}for(let e of V(this,Y,`f`))if(e.type===`text`&&!e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await V(this,H,`m`,ci).call(this,e),e.width=n,e.height=r)}}}),si.set(this,e=>{typeof window<`u`&&(B(this,ni,e.clientX,`f`),B(this,ri,window.innerHeight-e.clientY,`f`))}),di.set(this,()=>{this.isPlaying()&&(this.render(),B(this,qr,requestAnimationFrame(V(this,di,`f`)),`f`))}),B(this,Ir,e,`f`),B(this,Lr,t,`f`),B(this,U,new mr(t,e.preserveDrawingBuffer),`f`),B(this,Rr,V(this,U,`f`).gl,`f`),V(this,Rr,`f`).clearColor(0,0,0,0),B(this,J,e.pixelRatio,`f`),B(this,Yr,e.timeScale,`f`),B(this,Xr,Date.now()/1e3,`f`),B(this,zr,new xr(V(this,U,`f`)),`f`),B(this,Br,new Fr(V(this,U,`f`)),`f`),typeof window<`u`&&(window.addEventListener(`resize`,V(this,oi,`f`)),window.addEventListener(`pointermove`,V(this,si,`f`))),V(this,oi,`f`).call(this),B(this,W,new ot(V(this,U,`f`)),`f`),V(this,H,`m`,bi).call(this,e.postEffects),V(this,U,`f`).onContextRestored(()=>{V(this,Rr,`f`).clearColor(0,0,0,0)})}destroy(){this.stop(),typeof window<`u`&&(window.removeEventListener(`resize`,V(this,oi,`f`)),window.removeEventListener(`pointermove`,V(this,si,`f`))),V(this,K,`f`)?.dispose();for(let e of V(this,Vr,`f`).values())e?.dispose();for(let e of V(this,G,`f`))e.pass.dispose();V(this,q,`f`)&&(V(this,q,`f`).dispose(),B(this,q,null,`f`),B(this,Hr,!1,`f`)),V(this,W,`f`).dispose(),V(this,Br,`f`).dispose(),V(this,zr,`f`).dispose()}async addElement(e,t={},n){if(t.effect!==void 0)return V(this,H,`m`,li).call(this,e,t,t.effect,n);let r=V(this,H,`m`,ui).call(this,t),i=e.getBoundingClientRect(),a=Fi(e)?xn(i):bn(i),[s,c]=ki(t.overflow),l=Sn(a,c),u=Ai(t.intersection),d=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),p,m,h=!1;if(e instanceof HTMLImageElement){m=`img`;let t=f(e);if(h=!!t.match(/\.gif/i),h){let n=await sr.create(t,V(this,J,`f`));Ti.set(e,n),p=new S(V(this,U,`f`),n.getCanvas())}else{let e=await Ce(t);p=new S(V(this,U,`f`),e)}}else if(e instanceof HTMLVideoElement)p=new S(V(this,U,`f`),e),m=`video`;else if(e instanceof HTMLCanvasElement)o(e)&&n?(p=new S(V(this,U,`f`),n),m=`hic`):(p=new S(V(this,U,`f`),e),m=`canvas`);else{let t=await ct(e,d,void 0,this.maxTextureSize);p=new S(V(this,U,`f`),t),m=`text`}let[g,ee]=Ni(t.wrap);p.wrapS=g,p.wrapT=ee,p.needsUpdate=!0;let _=t.autoCrop??!0;if(m!==`hic`&&t.overlay!==!0)if(typeof t.overlay==`number`)e.style.setProperty(`opacity`,t.overlay.toString());else{let t=m===`video`?`0.0001`:`0`;e.style.setProperty(`opacity`,t.toString())}let v={src:{value:p},resolution:{value:new ze},offset:{value:new ze},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},mouse:{value:new ze},intersection:{value:0},viewport:{value:new Be},autoCrop:{value:_}},y={};if(t.uniforms!==void 0)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(v[e]={value:n()},y[e]=n):v[e]={value:n};let te;t.backbuffer&&(te=(()=>{let e=(l.right-l.left)*V(this,J,`f`),t=(l.bottom-l.top)*V(this,J,`f`);return new Re(V(this,U,`f`),e,t,V(this,J,`f`),!1)})(),v.backbuffer={value:te.texture});let b=new Map,ne=new Map;for(let e=0;e<r.length-1;e++){let t=r[e].target??`pass${e}`;r[e]={...r[e],target:t};let n=r[e].size,i=n?n[0]:(l.right-l.left)*V(this,J,`f`),a=n?n[1]:(l.bottom-l.top)*V(this,J,`f`);if(r[e].persistent){let i=n?1:V(this,J,`f`),a=n?n[0]:l.right-l.left,o=n?n[1]:l.bottom-l.top;ne.set(t,new Re(V(this,U,`f`),a,o,i,r[e].float))}else b.set(t,Sr(V(this,U,`f`),i,a,{float:r[e].float}))}let re=[];for(let e=0;e<r.length;e++){let t=r[e],n=t.frag,i={...v},a={};for(let[e,r]of b)e!==t.target&&n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:r.texture});for(let[e,t]of ne)n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:t.texture});if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(i[e]={value:n()},a[e]=n):i[e]={value:n};let o=Cr(V(this,U,`f`),{vertexShader:t.vert,fragmentShader:n,uniforms:i,renderingToBuffer:t.target!==void 0,glslVersion:t.glslVersion});re.push({pass:o,uniforms:i,uniformGenerators:{...y,...a},target:t.target,persistent:t.persistent,float:t.float,size:t.size,backbuffer:t.target?ne.get(t.target):void 0})}let x=V(this,Jr,`f`),ie={type:m,element:e,isInViewport:!1,isInLogicalViewport:!1,width:a.right-a.left,height:a.bottom-a.top,passes:re,bufferTargets:b,startTime:x,enterTime:x,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:s,overflow:c,intersection:u,originalOpacity:d,srcTexture:p,zIndex:t.zIndex??0,backbuffer:te,autoCrop:_};V(this,H,`m`,_i).call(this,ie,a,x),V(this,Y,`f`).push(ie),V(this,Y,`f`).sort((e,t)=>e.zIndex-t.zIndex)}async updateElementEffects(e,t){let n=V(this,Y,`f`).find(t=>t.element===e);if(!n)throw Error(`[VFX-JS] updateElementEffects: element not registered`);if(!n.chain)throw Error(`[VFX-JS] updateElementEffects: element is on the shader path; effect-only updates are not supported`);let r=Array.isArray(t)?[...t]:[t],i=n.chain.effects,a=new Set(i),o=[];for(let e of r)if(!a.has(e)){if(V(this,Ur,`f`).has(e))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");o.push(e)}await n.chain.replaceEffects(r);let s=new Set(r);for(let e of i)s.has(e)||V(this,Ur,`f`).delete(e);for(let e of o)V(this,Ur,`f`).add(e)}removeElement(e){let t=V(this,Y,`f`).findIndex(t=>t.element===e);if(t!==-1){let n=V(this,Y,`f`).splice(t,1)[0];if(n.chain)V(this,H,`m`,hi).call(this,n.chain.effects),n.chain.dispose();else{for(let e of n.bufferTargets.values())e.dispose();for(let e of n.passes)e.pass.dispose(),e.backbuffer?.dispose();n.backbuffer?.dispose()}n.srcTexture.dispose(),e.style.setProperty(`opacity`,n.originalOpacity.toString())}}updateTextElement(e){let t=V(this,Y,`f`).findIndex(t=>t.element===e);return t===-1?Promise.resolve():V(this,H,`m`,ci).call(this,V(this,Y,`f`)[t])}async updateImageElement(e){let t=V(this,Y,`f`).find(t=>t.element===e);if(!t||t.type!==`img`||t.isGif)return;let n=await Ce(f(e)),r=t.srcTexture,i=new S(V(this,U,`f`),n);i.wrapS=r.wrapS,i.wrapT=r.wrapT,i.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=i),t.srcTexture=i,r.dispose()}updateCanvasElement(e){let t=V(this,Y,`f`).find(t=>t.element===e);if(t){let n=t.srcTexture,r=new S(V(this,U,`f`),e);r.wrapS=n.wrapS,r.wrapT=n.wrapT,r.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=r),t.srcTexture=r,n.dispose()}}updateHICTexture(e,t){let n=V(this,Y,`f`).find(t=>t.element===e);if(!n||n.type!==`hic`)return;let r=n.srcTexture;if(r.source===t)r.needsUpdate=!0;else{let e=new S(V(this,U,`f`),t);e.wrapS=r.wrapS,e.wrapT=r.wrapT,e.needsUpdate=!0,!n.chain&&n.passes.length>0&&(n.passes[0].uniforms.src.value=e),n.srcTexture=e,r.dispose()}}get maxTextureSize(){return V(this,U,`f`).maxTextureSize}isPlaying(){return V(this,qr,`f`)!==void 0}play(){this.isPlaying()||(B(this,Xr,Date.now()/1e3,`f`),B(this,qr,requestAnimationFrame(V(this,di,`f`)),`f`))}get time(){return V(this,Jr,`f`)}setTime(e){B(this,Jr,e,`f`),B(this,Zr,!0,`f`)}get timeScale(){return V(this,Yr,`f`)}set timeScale(e){B(this,Yr,e,`f`)}stop(){V(this,qr,`f`)!==void 0&&(cancelAnimationFrame(V(this,qr,`f`)),B(this,qr,void 0,`f`))}render(){let e=Date.now()/1e3;V(this,Zr,`f`)?B(this,Zr,!1,`f`):B(this,Jr,V(this,Jr,`f`)+(e-V(this,Xr,`f`))*V(this,Yr,`f`),`f`),B(this,Xr,e,`f`);let t=V(this,Jr,`f`),n=V(this,Rr,`f`);V(this,H,`m`,ai).call(this),n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,V(this,Lr,`f`).width,V(this,Lr,`f`).height),n.clear(n.COLOR_BUFFER_BIT);let r=V(this,X,`f`).right-V(this,X,`f`).left,i=V(this,X,`f`).bottom-V(this,X,`f`).top,a=Me(0,0,r,i),o=V(this,H,`m`,pi).call(this);o&&(V(this,H,`m`,wi).call(this,r,i),V(this,K,`f`)&&(n.bindFramebuffer(n.FRAMEBUFFER,V(this,K,`f`).fbo),n.clear(n.COLOR_BUFFER_BIT),n.bindFramebuffer(n.FRAMEBUFFER,null)));for(let e of V(this,Y,`f`)){let n=e.element.getBoundingClientRect(),s=e.type===`text`?xn(n):bn(n),c=V(this,H,`m`,_i).call(this,e,s,t);if(!c.isVisible)continue;if(e.chain){V(this,H,`m`,fi).call(this,e,s,c,t);continue}let l=e.passes[0].uniforms;l.time.value=t-e.startTime,l.resolution.value.set((s.right-s.left)*V(this,J,`f`),(s.bottom-s.top)*V(this,J,`f`)),l.mouse.value.set((V(this,ni,`f`)+V(this,ei,`f`))*V(this,J,`f`),(V(this,ri,`f`)+V(this,ti,`f`))*V(this,J,`f`));for(let t of e.passes)for(let[e,n]of Object.entries(t.uniformGenerators))t.uniforms[e].value=n();Ti.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(l.src.value.needsUpdate=!0);let u=je(s,i,V(this,ei,`f`),V(this,ti,`f`)),d=je(c.rectWithOverflow,i,V(this,ei,`f`),V(this,ti,`f`));e.backbuffer&&(e.passes[0].uniforms.backbuffer.value=e.backbuffer.texture);{let t=e.isFullScreen?a:d,n=Math.max(1,t.w*V(this,J,`f`)),r=Math.max(1,t.h*V(this,J,`f`)),i=Math.max(1,t.w),o=Math.max(1,t.h);for(let t=0;t<e.passes.length-1;t++){let a=e.passes[t];if(!a.size)if(a.backbuffer)a.backbuffer.resize(i,o);else{let t=e.bufferTargets.get(a.target);t&&(t.width!==n||t.height!==r)&&t.setSize(n,r)}}}let f=new Map;for(let t of e.passes)t.backbuffer&&t.target&&f.set(t.target,t.backbuffer.texture);let p=e.srcTexture,m=V(this,ni,`f`)+V(this,ei,`f`)-u.x,h=V(this,ri,`f`)+V(this,ti,`f`)-u.y;for(let t=0;t<e.passes.length-1;t++){let n=e.passes[t],r=e.isFullScreen?a:d;n.uniforms.src.value=p;for(let[e,t]of f)n.uniforms[e]&&(n.uniforms[e].value=t);for(let[e,t]of Object.entries(n.uniformGenerators))n.uniforms[e]&&(n.uniforms[e].value=t());let i=n.size?n.size[0]:r.w*V(this,J,`f`),o=n.size?n.size[1]:r.h*V(this,J,`f`),s=n.size?Me(0,0,n.size[0],n.size[1]):Me(0,0,r.w,r.h);if(n.uniforms.resolution.value.set(i,o),n.uniforms.offset.value.set(0,0),n.uniforms.mouse.value.set(m/r.w*i,h/r.h*o),n.backbuffer)V(this,H,`m`,Z).call(this,n.pass,n.backbuffer.target,s,n.uniforms,!0),n.backbuffer.swap(),p=n.backbuffer.texture;else{let t=e.bufferTargets.get(n.target);if(!t)continue;V(this,H,`m`,Z).call(this,n.pass,t,s,n.uniforms,!0),p=t.texture}n.target&&f.set(n.target,p)}let g=e.passes[e.passes.length-1];g.uniforms.src.value=p,g.uniforms.resolution.value.set(n.width*V(this,J,`f`),n.height*V(this,J,`f`)),g.uniforms.offset.value.set(u.x*V(this,J,`f`),u.y*V(this,J,`f`)),g.uniforms.mouse.value.set((V(this,ni,`f`)+V(this,ei,`f`))*V(this,J,`f`),(V(this,ri,`f`)+V(this,ti,`f`))*V(this,J,`f`));for(let[e,t]of f)g.uniforms[e]&&(g.uniforms[e].value=t);for(let[e,t]of Object.entries(g.uniformGenerators))g.uniforms[e]&&(g.uniforms[e].value=t());e.backbuffer?(g.uniforms.backbuffer.value=e.backbuffer.texture,e.isFullScreen?(e.backbuffer.resize(r,i),V(this,H,`m`,yi).call(this,e,u.x,u.y),V(this,H,`m`,Z).call(this,g.pass,e.backbuffer.target,a,g.uniforms,!0),e.backbuffer.swap(),V(this,W,`f`).setUniforms(e.backbuffer.texture,V(this,J,`f`),a),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,o&&V(this,K,`f`)||null,a,V(this,W,`f`).uniforms,!1)):(e.backbuffer.resize(d.w,d.h),V(this,H,`m`,yi).call(this,e,e.overflow.left,e.overflow.bottom),V(this,H,`m`,Z).call(this,g.pass,e.backbuffer.target,e.backbuffer.getViewport(),g.uniforms,!0),e.backbuffer.swap(),V(this,W,`f`).setUniforms(e.backbuffer.texture,V(this,J,`f`),d),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,o&&V(this,K,`f`)||null,d,V(this,W,`f`).uniforms,!1))):(V(this,H,`m`,yi).call(this,e,u.x,u.y),V(this,H,`m`,Z).call(this,g.pass,o&&V(this,K,`f`)||null,e.isFullScreen?a:d,g.uniforms,!1))}o&&V(this,K,`f`)&&(V(this,q,`f`)&&V(this,Hr,`f`)?V(this,H,`m`,Si).call(this,a,t):V(this,H,`m`,Ci).call(this,a,t))}};Ir=new WeakMap,Lr=new WeakMap,U=new WeakMap,Rr=new WeakMap,zr=new WeakMap,Br=new WeakMap,W=new WeakMap,G=new WeakMap,K=new WeakMap,Vr=new WeakMap,q=new WeakMap,Hr=new WeakMap,Ur=new WeakMap,Wr=new WeakMap,Gr=new WeakMap,Kr=new WeakMap,qr=new WeakMap,J=new WeakMap,Y=new WeakMap,Jr=new WeakMap,Yr=new WeakMap,Xr=new WeakMap,Zr=new WeakMap,X=new WeakMap,Qr=new WeakMap,$r=new WeakMap,ei=new WeakMap,ti=new WeakMap,ni=new WeakMap,ri=new WeakMap,ii=new WeakMap,oi=new WeakMap,si=new WeakMap,di=new WeakMap,H=new WeakSet,ai=function(){if(typeof window>`u`)return;let e=V(this,Lr,`f`).ownerDocument,t=e.compatMode===`BackCompat`?e.body:e.documentElement,n=t.clientWidth,r=t.clientHeight,i=window.scrollX,a=window.scrollY,o,s;if(V(this,Ir,`f`).fixedCanvas)o=0,s=0;else if(V(this,Ir,`f`).wrapper)o=n*V(this,Ir,`f`).scrollPadding[0],s=r*V(this,Ir,`f`).scrollPadding[1];else{let t=e.body.scrollWidth-(i+n),c=e.body.scrollHeight-(a+r);o=Pi(n*V(this,Ir,`f`).scrollPadding[0],0,t),s=Pi(r*V(this,Ir,`f`).scrollPadding[1],0,c)}let c=n+o*2,l=r+s*2;(c!==V(this,$r,`f`)[0]||l!==V(this,$r,`f`)[1])&&(V(this,Lr,`f`).style.width=`${c}px`,V(this,Lr,`f`).style.height=`${l}px`,V(this,U,`f`).setSize(c,l,V(this,J,`f`)),B(this,X,yn({top:-s,left:-o,right:n+o,bottom:r+s}),`f`),B(this,Qr,yn({top:0,left:0,right:n,bottom:r}),`f`),B(this,$r,[c,l],`f`),B(this,ei,o,`f`),B(this,ti,s,`f`)),V(this,Ir,`f`).fixedCanvas||V(this,Lr,`f`).style.setProperty(`transform`,`translate(${i-o}px, ${a-s}px)`)},ci=async function(e){if(!V(this,ii,`f`).get(e.element)){V(this,ii,`f`).set(e.element,!0);try{let t=e.srcTexture,n=t.source instanceof OffscreenCanvas?t.source:void 0,r=await ct(e.element,e.originalOpacity,n,this.maxTextureSize);if(r.width===0||r.height===0)return;let i=new S(V(this,U,`f`),r);i.wrapS=t.wrapS,i.wrapT=t.wrapT,i.needsUpdate=!0,!e.chain&&e.passes.length>0&&(e.passes[0].uniforms.src.value=i),e.srcTexture=i,t.dispose()}catch(e){console.error(e)}finally{V(this,ii,`f`).set(e.element,!1)}}},li=async function(e,t,n,r){t.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified; `effect` takes precedence."),t.overflow!==void 0&&console.warn("[VFX-JS] `overflow` is shader-path only and is ignored by the effect path. Use each effect's own `outputRect` (with `dims.canvasRect` for fullscreen) to control its dst rect.");let i=Array.isArray(n)?[...n]:[n];V(this,H,`m`,mi).call(this,i);let a=e.getBoundingClientRect(),s=Fi(e)?xn(a):bn(a),[c,l]=ki(t.overflow),u=Ai(t.intersection),d=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),p,m,h=!1;if(e instanceof HTMLImageElement){m=`img`;let t=f(e);if(h=!!t.match(/\.gif/i),h){let n=await sr.create(t,V(this,J,`f`));Ti.set(e,n),p=new S(V(this,U,`f`),n.getCanvas())}else{let e=await Ce(t);p=new S(V(this,U,`f`),e)}}else if(e instanceof HTMLVideoElement)p=new S(V(this,U,`f`),e),m=`video`;else if(e instanceof HTMLCanvasElement)o(e)&&r?(p=new S(V(this,U,`f`),r),m=`hic`):(p=new S(V(this,U,`f`),e),m=`canvas`);else{let t=await ct(e,d,void 0,this.maxTextureSize);p=new S(V(this,U,`f`),t),m=`text`}let[g,ee]=Ni(t.wrap);p.wrapS=g,p.wrapT=ee,p.needsUpdate=!0;let _=t.autoCrop??!0;if(m!==`hic`&&t.overlay!==!0)if(typeof t.overlay==`number`)e.style.setProperty(`opacity`,t.overlay.toString());else{let t=m===`video`?`0.0001`:`0`;e.style.setProperty(`opacity`,t.toString())}let v=V(this,Jr,`f`),y={type:m,element:e,isInViewport:!1,isInLogicalViewport:!1,width:s.right-s.left,height:s.bottom-s.top,passes:[],bufferTargets:new Map,startTime:v,enterTime:v,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:c,overflow:l,intersection:u,originalOpacity:d,srcTexture:p,zIndex:t.zIndex??0,backbuffer:void 0,autoCrop:_,effectLastRenderTime:v},te=pn(()=>y.srcTexture,()=>ji(y.srcTexture,`w`),()=>ji(y.srcTexture,`h`)),b={},ne={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(ne[e]=n,b[e]=n()):b[e]=n;y.effectUniformGenerators=ne,y.effectStaticUniforms=b;let re={autoCrop:_,glslVersion:t.glslVersion??`300 es`},x=new Yn(V(this,U,`f`),V(this,zr,`f`),V(this,J,`f`),i,re,te,!1,V(this,Br,`f`));try{await x.initAll()}catch(t){throw V(this,H,`m`,hi).call(this,i),p.dispose(),e.style.setProperty(`opacity`,d.toString()),t}y.chain=x,V(this,H,`m`,_i).call(this,y,s,v),V(this,Y,`f`).push(y),V(this,Y,`f`).sort((e,t)=>e.zIndex-t.zIndex)},ui=function(e){let t=t=>t.glslVersion===void 0&&e.glslVersion!==void 0?{...t,glslVersion:e.glslVersion}:t;return Array.isArray(e.shader)?e.shader.map(t):[t({frag:V(this,H,`m`,vi).call(this,e.shader||`uvGradient`)})]},fi=function(e,t,n,r){let i=e.chain;if(!i)return;let a=V(this,J,`f`);Ti.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(e.srcTexture.needsUpdate=!0);let o={...e.effectStaticUniforms??{}};if(e.effectUniformGenerators)for(let[t,n]of Object.entries(e.effectUniformGenerators))o[t]=n();let s=V(this,X,`f`).right-V(this,X,`f`).left,c=V(this,X,`f`).bottom-V(this,X,`f`).top,l=je(t,c,V(this,ei,`f`),V(this,ti,`f`)),u=V(this,ni,`f`)+V(this,ei,`f`)-l.x,d=V(this,ri,`f`)+V(this,ti,`f`)-l.y,f=t.right-t.left,p=t.bottom-t.top,m=r-(e.effectLastRenderTime??r);e.effectLastRenderTime=r;let h=V(this,H,`m`,pi).call(this)&&V(this,K,`f`)?hn(V(this,K,`f`)):null;i.run({time:r-e.startTime,deltaTime:m,mouse:[u*a,d*a],mouseViewport:[V(this,ni,`f`)*a,V(this,ri,`f`)*a],intersection:n.intersection,enterTime:r-e.enterTime,leaveTime:r-e.leaveTime,resolvedUniforms:o,canvasSize:[s,c],canvasBufferSize:[s*a,c*a],elementSize:[f,p],elementBufferSize:[f*a,p*a],elementRectOnCanvasPx:{x:l.x*a,y:l.y*a,w:l.w*a,h:l.h*a},finalTarget:h,isVisible:n.isVisible})},pi=function(){return V(this,G,`f`).length>0||V(this,q,`f`)!==null&&V(this,Hr,`f`)},mi=function(e){for(let t of e)if(V(this,Ur,`f`).has(t))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");for(let t of e)V(this,Ur,`f`).add(t)},hi=function(e){for(let t of e)V(this,Ur,`f`).delete(t)},gi=function(e){let t=e.hitTestPadBuffer,n=V(this,J,`f`);return _n({top:t.top/n,right:t.right/n,bottom:t.bottom/n,left:t.left/n})},_i=function(e,t,n){let r=Sn(t,e.chain?V(this,H,`m`,gi).call(this,e.chain):e.overflow),i=e.isFullScreen||Di(V(this,Qr,`f`),r),a=Sn(V(this,Qr,`f`),e.intersection.rootMargin),o=Tn(a,t),s=e.isFullScreen||Oi(a,t,o,e.intersection.threshold);!e.isInLogicalViewport&&s&&(e.enterTime=n,e.leaveTime=1/0),e.isInLogicalViewport&&!s&&(e.leaveTime=n),e.isInViewport=i,e.isInLogicalViewport=s;let c=i&&n-e.leaveTime<=e.release;if(c&&!e.chain&&e.passes.length>0){let t=e.passes[0].uniforms;t.intersection.value=o,t.enterTime.value=n-e.enterTime,t.leaveTime.value=n-e.leaveTime}return{isVisible:c,intersection:o,rectWithOverflow:r}},vi=function(e){return e in a?a[e]:e},Z=function(e,t,n,r,i){let a=V(this,Rr,`f`);i&&t!==null&&t!==V(this,K,`f`)&&(a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.viewport(0,0,t.width,t.height),a.clear(a.COLOR_BUFFER_BIT));let o=r.viewport;o&&o.value instanceof Be&&o.value.set(n.x*V(this,J,`f`),n.y*V(this,J,`f`),n.w*V(this,J,`f`),n.h*V(this,J,`f`));try{it(a,V(this,zr,`f`),e,t,n,V(this,$r,`f`)[0],V(this,$r,`f`)[1],V(this,J,`f`))}catch(e){console.error(e)}},yi=function(e,t,n){let r=e.passes[0].uniforms.offset.value;r.x=t*V(this,J,`f`),r.y=n*V(this,J,`f`)},bi=function(e){let t=e.length===1&&!(`frag`in e[0])?e[0]:null;if(t&&t.effect!==void 0){V(this,H,`m`,xi).call(this,t,t.effect);return}let n=[],r=[];for(let t of e)`frag`in t&&r.push(t);for(let e=0;e<r.length-1;e++)r[e].target||(r[e]={...r[e],target:`pass${e}`});for(let t of e){let e,r,i;if(`frag`in t)e=t.frag,r=new Ar(V(this,U,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,t.size,t.target!==void 0,t.glslVersion),i=t.target;else{if(t.shader===void 0)throw Error("VFXPostEffect requires `shader` (the `effect` path is not implemented yet).");e=V(this,H,`m`,vi).call(this,t.shader),r=new Ar(V(this,U,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,void 0,!1,t.glslVersion),t.persistent&&r.registerBufferUniform(`backbuffer`),i=void 0}n.push(e);let a={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`&&(a[e]=n);V(this,G,`f`).push({pass:r,target:i,generators:a})}for(let e of r)e.target&&V(this,Vr,`f`).set(e.target,void 0);let i=V(this,G,`f`).map(e=>e.target).filter(e=>e!==void 0);for(let e=0;e<V(this,G,`f`).length;e++)for(let t of i)n[e].match(RegExp(`uniform\\s+sampler2D\\s+${t}\\b`))&&V(this,G,`f`)[e].pass.registerBufferUniform(t)},xi=function(e,t){e.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified on post-effect; `effect` takes precedence.");let n=Array.isArray(t)?[...t]:[t];V(this,H,`m`,mi).call(this,n);let r=pn(()=>{let e=V(this,K,`f`);if(!e)throw Error(`[VFX-JS] post-effect chain active without target`);return e.texture},()=>V(this,K,`f`)?.width??0,()=>V(this,K,`f`)?.height??0),i={autoCrop:!0,glslVersion:e.glslVersion??`300 es`},a=new Yn(V(this,U,`f`),V(this,zr,`f`),V(this,J,`f`),n,i,r,!0,V(this,Br,`f`));if(e.uniforms)for(let[t,n]of Object.entries(e.uniforms))typeof n==`function`?(V(this,Gr,`f`)[t]=n,V(this,Wr,`f`)[t]=n()):V(this,Wr,`f`)[t]=n;B(this,q,a,`f`),B(this,Kr,V(this,Jr,`f`),`f`),a.initAll().then(()=>{V(this,q,`f`)===a&&B(this,Hr,!0,`f`)}).catch(e=>{console.error(`[VFX-JS] Post-effect init failed; post-effect disabled:`,e),V(this,q,`f`)===a&&(V(this,H,`m`,hi).call(this,V(this,q,`f`).effects),V(this,q,`f`).dispose(),B(this,q,null,`f`),B(this,Hr,!1,`f`))})},Si=function(e,t){let n=V(this,q,`f`);if(!n)return;let r=V(this,J,`f`),i={...V(this,Wr,`f`)};for(let[e,t]of Object.entries(V(this,Gr,`f`)))i[e]=t();let a=V(this,X,`f`).right-V(this,X,`f`).left,o=V(this,X,`f`).bottom-V(this,X,`f`).top,s=t-V(this,Kr,`f`);B(this,Kr,t,`f`);let c=[a,o],l=[a*r,o*r],u={x:e.x*r,y:e.y*r,w:e.w*r,h:e.h*r};n.run({time:t,deltaTime:s,mouse:[V(this,ni,`f`)*r,V(this,ri,`f`)*r],mouseViewport:[V(this,ni,`f`)*r,V(this,ri,`f`)*r],intersection:1,enterTime:0,leaveTime:0,resolvedUniforms:i,canvasSize:c,canvasBufferSize:l,elementSize:c,elementBufferSize:l,elementRectOnCanvasPx:u,finalTarget:null,isVisible:!0})},Ci=function(e,t){if(!V(this,K,`f`))return;let n=V(this,K,`f`).texture,r=new Map;for(let{pass:e,target:t}of V(this,G,`f`))t&&e.backbuffer&&r.set(t,e.backbuffer.texture);for(let i=0;i<V(this,G,`f`).length;i++){let{pass:a,target:o,generators:s}=V(this,G,`f`)[i],c=i===V(this,G,`f`).length-1,l=V(this,ni,`f`)+V(this,ei,`f`),u=V(this,ri,`f`)+V(this,ti,`f`),d=a.size;if(d){let[r,i]=d;a.uniforms.src.value=n,a.uniforms.resolution.value.set(r,i),a.uniforms.offset.value.set(0,0),a.uniforms.time.value=t,a.uniforms.mouse.value.set(l/e.w*r,u/e.h*i)}else a.setUniforms(n,V(this,J,`f`),e,t,l,u);a.uniforms.passIndex.value=i,a.updateCustomUniforms(s);for(let[e,t]of r){let n=a.uniforms[e];n&&(n.value=t)}if(c)a.backbuffer?(a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture),V(this,H,`m`,Z).call(this,a.pass,a.backbuffer.target,e,a.uniforms,!0),a.backbuffer.swap(),V(this,W,`f`).setUniforms(a.backbuffer.texture,V(this,J,`f`),e),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,null,e,V(this,W,`f`).uniforms,!1)):V(this,H,`m`,Z).call(this,a.pass,null,e,a.uniforms,!1);else if(a.backbuffer){a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture);let t=d?Me(0,0,d[0]/V(this,J,`f`),d[1]/V(this,J,`f`)):e;V(this,H,`m`,Z).call(this,a.pass,a.backbuffer.target,t,a.uniforms,!0),a.backbuffer.swap(),n=a.backbuffer.texture,o&&r.set(o,a.backbuffer.texture)}else{let t=o??`postEffect${i}`,s=V(this,Vr,`f`).get(t),c=d?d[0]:e.w*V(this,J,`f`),l=d?d[1]:e.h*V(this,J,`f`);(!s||s.width!==c||s.height!==l)&&(s?.dispose(),s=Sr(V(this,U,`f`),c,l,{float:a.float}),V(this,Vr,`f`).set(t,s));let u=d?Me(0,0,d[0]/V(this,J,`f`),d[1]/V(this,J,`f`)):e;V(this,H,`m`,Z).call(this,a.pass,s,u,a.uniforms,!0),n=s.texture,o&&r.set(o,s.texture)}}},wi=function(e,t){let n=e*V(this,J,`f`),r=t*V(this,J,`f`);(!V(this,K,`f`)||V(this,K,`f`).width!==n||V(this,K,`f`).height!==r)&&(V(this,K,`f`)?.dispose(),B(this,K,Sr(V(this,U,`f`),n,r),`f`));for(let{pass:n}of V(this,G,`f`))n.persistent&&!n.backbuffer?n.initializeBackbuffer(V(this,U,`f`),e,t,V(this,J,`f`)):n.backbuffer&&n.resizeBackbuffer(e,t)};function Di(e,t){return t.left<=e.right&&t.right>=e.left&&t.top<=e.bottom&&t.bottom>=e.top}function Oi(e,t,n,r){return r===0?Di(e,t):n>=r}function ki(e){return e===!0?[!0,vn]:e===void 0?[!1,vn]:[!1,_n(e)]}function Ai(e){return{threshold:e?.threshold??0,rootMargin:_n(e?.rootMargin??0)}}function ji(e,t){let n=e.source;if(!n)return 0;if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return t===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return t===`w`?n.videoWidth:n.videoHeight;let r=n;return t===`w`?r.width:r.height}function Mi(e){return e===`repeat`?`repeat`:e===`mirror`?`mirror`:`clamp`}function Ni(e){if(!e)return[`clamp`,`clamp`];if(Array.isArray(e))return[Mi(e[0]),Mi(e[1])];let t=Mi(e);return[t,t]}function Pi(e,t,n){return Math.max(t,Math.min(n,e))}function Fi(e){return!(e instanceof HTMLImageElement||e instanceof HTMLVideoElement||e instanceof HTMLCanvasElement)}function Ii(){try{let e=document.createElement(`canvas`);return(e.getContext(`webgl2`)||e.getContext(`webgl`))!==null}catch{return!1}}var Li=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Q=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ri,$,zi,Bi,Vi,Hi,Ui,Wi;function Gi(){if(typeof window>`u`)throw`Cannot find 'window'. VFX-JS only runs on the browser.`;if(typeof document>`u`)throw`Cannot find 'document'. VFX-JS only runs on the browser.`}function Ki(e){return{position:e?`fixed`:`absolute`,top:0,left:0,width:`0px`,height:`0px`,"z-index":9999,"pointer-events":`none`}}var qi=class e{static init(t){try{return new e(t)}catch{return null}}constructor(e={}){if(Ri.add(this),$.set(this,void 0),zi.set(this,void 0),Bi.set(this,new Map),Gi(),!Ii())throw Error(`[VFX-JS] WebGL is not available in this environment.`);let t=ue(e),n=document.createElement(`canvas`),r=Ki(t.fixedCanvas);for(let[e,t]of Object.entries(r))n.style.setProperty(e,t.toString());t.zIndex!==void 0&&n.style.setProperty(`z-index`,t.zIndex.toString()),(t.wrapper??document.body).appendChild(n),Li(this,zi,n,`f`),Li(this,$,new Ei(t,n),`f`),t.autoplay&&Q(this,$,`f`).play()}async add(e,t,n){e instanceof HTMLImageElement?await Q(this,Ri,`m`,Vi).call(this,e,t):e instanceof HTMLVideoElement?await Q(this,Ri,`m`,Hi).call(this,e,t):e instanceof HTMLCanvasElement?o(e)&&n?await Q(this,$,`f`).addElement(e,t,n):await Q(this,Ri,`m`,Ui).call(this,e,t):await Q(this,Ri,`m`,Wi).call(this,e,t)}updateHICTexture(e,t){Q(this,$,`f`).updateHICTexture(e,t)}get maxTextureSize(){return Q(this,$,`f`).maxTextureSize}get canvas(){return Q(this,zi,`f`)}async addHTML(e,t){if(!le())return console.warn(`html-in-canvas not supported, falling back to dom-to-canvas`),this.add(e,t);t.overlay!==void 0&&console.warn(`addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.`);let{overlay:n,...r}=t,i=Q(this,Bi,`f`).get(e);i&&Q(this,$,`f`).removeElement(i);let{canvas:a,initialCapture:o}=await oe(e,{onCapture:e=>{Q(this,$,`f`).updateHICTexture(a,e)},maxSize:Q(this,$,`f`).maxTextureSize});i=a,Q(this,Bi,`f`).set(e,i),await Q(this,$,`f`).addElement(i,r,o)}remove(e){let t=Q(this,Bi,`f`).get(e);t?(se(t,e),Q(this,Bi,`f`).delete(e),Q(this,$,`f`).removeElement(t)):Q(this,$,`f`).removeElement(e)}updateEffects(e,t){let n=Q(this,Bi,`f`).get(e)??e;return Q(this,$,`f`).updateElementEffects(n,t)}async update(e){let t=Q(this,Bi,`f`).get(e);if(t){t.requestPaint();return}if(e instanceof HTMLImageElement)return Q(this,$,`f`).updateImageElement(e);if(e instanceof HTMLCanvasElement){Q(this,$,`f`).updateCanvasElement(e);return}else return Q(this,$,`f`).updateTextElement(e)}play(){Q(this,$,`f`).play()}stop(){Q(this,$,`f`).stop()}render(){Q(this,$,`f`).render()}get time(){return Q(this,$,`f`).time}setTime(e){Q(this,$,`f`).setTime(e)}get timeScale(){return Q(this,$,`f`).timeScale}set timeScale(e){Q(this,$,`f`).timeScale=e}destroy(){for(let[e,t]of Q(this,Bi,`f`))se(t,e);Q(this,Bi,`f`).clear(),Q(this,$,`f`).destroy(),Q(this,zi,`f`).remove()}};$=new WeakMap,zi=new WeakMap,Bi=new WeakMap,Ri=new WeakSet,Vi=function(e,t){return e.complete?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`load`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},Hi=function(e,t){return e.readyState>=3?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`canplay`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},Ui=function(e,t){return Q(this,$,`f`).addElement(e,t)},Wi=function(e,t){return Q(this,$,`f`).addElement(e,t)};export{qi as t};
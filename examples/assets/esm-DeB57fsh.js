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
    `};function o(e){return e.tagName===`CANVAS`&&(e.hasAttribute(`layoutsubtree`)||e.getAttribute(`content`)===`drawable`)}function s(e,t){e.setAttribute(`layoutsubtree`,``),e.setAttribute(`content`,`drawable`),t?.setAttribute(`drawable`,``)}function c(e,t,n,r){if(t.width<=0||t.height<=0)return null;let i=t.left-e.left,a=t.top-e.top;return i+t.width<=0||a+t.height<=0||i>=e.width||a>=e.height?null:[i*n,a*r,t.width*n,t.height*r]}function l(e){let t=e.getBoundingClientRect(),n=getComputedStyle(e),r=Number.parseFloat(n.paddingLeft)||0,i=Number.parseFloat(n.paddingRight)||0,a=Number.parseFloat(n.paddingTop)||0,o=Number.parseFloat(n.paddingBottom)||0,s=e.clientWidth>0?t.width/e.offsetWidth:1,c=e.clientHeight>0?t.height/e.offsetHeight:1;return{left:t.left+(e.clientLeft+r)*s,top:t.top+(e.clientTop+a)*c,width:Math.max(0,e.clientWidth-r-i)*s,height:Math.max(0,e.clientHeight-a-o)*c}}function u(e){return typeof e.checkVisibility==`function`?e.checkVisibility({visibilityProperty:!0,opacityProperty:!0}):getComputedStyle(e).visibility!==`hidden`}function d(e,t){let n=t.querySelectorAll(`canvas`);if(n.length===0)return;let r=t.getBoundingClientRect();if(r.width<=0||r.height<=0)return;let i=e.canvas.width/r.width,a=e.canvas.height/r.height;for(let t of n){if(t.width===0||t.height===0||!u(t))continue;let n=c(r,l(t),i,a);if(n)try{e.drawImage(t,...n)}catch{}}}function f(e){return e.currentSrc||e.src}function p(e){let t=f(e);if(!t||t.startsWith(`data:`))return!1;try{return new URL(t,location.href).origin!==location.origin}catch{return!1}}async function m(e){let t=await(await fetch(e)).blob();return URL.createObjectURL(t)}async function h(e){let t=Array.from(e.querySelectorAll(`img`)).filter(e=>e.complete&&e.naturalWidth>0&&p(e));if(t.length===0)return()=>{};let n=new Map,r=[];return await Promise.all(t.map(async e=>{try{let t=f(e),i=await m(t);n.set(e,t),r.push(i),await new Promise(t=>{e.addEventListener(`load`,()=>t(),{once:!0}),e.src=i})}catch{}})),()=>{for(let[e,t]of n)e.src=t;for(let e of r)URL.revokeObjectURL(e)}}var ee=[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`],te=[`position`,`top`,`right`,`bottom`,`left`,`float`,`flex`,`flex-grow`,`flex-shrink`,`flex-basis`,`align-self`,`justify-self`,`place-self`,`order`,`grid-column`,`grid-column-start`,`grid-column-end`,`grid-row`,`grid-row-start`,`grid-row-end`,`grid-area`],g=new WeakMap,_=new WeakMap,v=new WeakMap,ne=new WeakMap,re=new WeakMap,ie=new WeakMap,ae=new WeakMap,y=new WeakSet;async function oe(e,t){s(e,e.firstElementChild);let n=e.getContext(`2d`);if(!n)throw Error(`Failed to get 2d context from layoutsubtree canvas`);let{onCapture:r,maxSize:i}=t,a=null,o=null,c=new Promise(e=>{o=e}),l=null,u=t=>{if(t){if(t===l)return;l=t}let s=e.firstElementChild;if(!s||e.width===0||e.height===0)return;s.hasAttribute(`drawable`)||s.setAttribute(`drawable`,``),n.clearRect(0,0,e.width,e.height),n.drawElementImage(s,0,0),d(n,s);let c=e.width,u=e.height;if(i&&(c>i||u>i)){let e=Math.min(i/c,i/u);c=Math.floor(c*e),u=Math.floor(u*e)}(!a||a.width!==c||a.height!==u)&&(a=new OffscreenCanvas(c,u));let f=a.getContext(`2d`);if(f){if(f.clearRect(0,0,c,u),f.drawImage(e,0,0,c,u),n.clearRect(0,0,e.width,e.height),o){o(a),o=null;return}r(a)}};e.onpaint=u,e.addEventListener(`paint`,u),_.set(e,u);let f=new ResizeObserver(t=>{for(let n of t){let t=n.devicePixelContentBoxSize?.[0];if(t)e.width=t.inlineSize,e.height=t.blockSize;else{let t=n.borderBoxSize?.[0];if(t){let n=window.devicePixelRatio;e.width=Math.round(t.inlineSize*n),e.height=Math.round(t.blockSize*n)}}}e.requestPaint()});f.observe(e,{box:`device-pixel-content-box`}),g.set(e,f);let p=e.firstElementChild,m=``;if(p){let t=new ResizeObserver(t=>{let n=t[0].borderBoxSize?.[0];if(!n)return;let r=`${Math.round(n.blockSize)}px`;r!==m&&(m=r,e.style.setProperty(`height`,r))});t.observe(p),v.set(e,t)}return c}function se(e){e.onpaint=null;let t=_.get(e);t&&(e.removeEventListener(`paint`,t),_.delete(e));let n=g.get(e);n&&(n.disconnect(),g.delete(e));let r=v.get(e);r&&(r.disconnect(),v.delete(e))}async function ce(e,t){let n=e.getBoundingClientRect(),r=document.createElement(`canvas`);e.hasAttribute(`drawable`)||y.add(e),s(r,e),r.className=e.className;let i=e.getAttribute(`style`);i&&r.setAttribute(`style`,i),r.style.setProperty(`padding`,`0`),r.style.setProperty(`border`,`none`),r.style.setProperty(`box-sizing`,`content-box`),r.style.setProperty(`background`,`transparent`);let a=getComputedStyle(e),o=a.display===`inline`?`block`:a.display;r.style.setProperty(`display`,o);for(let e of ee)r.style.setProperty(e,a.getPropertyValue(e));for(let e of te)r.style.setProperty(e,a.getPropertyValue(e));e.style.width.endsWith(`px`)?r.style.setProperty(`width`,`${n.width}px`):r.style.setProperty(`width`,`100%`),r.style.height||r.style.setProperty(`height`,`${n.height}px`);let c=window.devicePixelRatio;r.width=Math.round(n.width*c),r.height=Math.round(n.height*c),ne.set(e,e.style.margin),re.set(e,e.style.width),ie.set(e,e.style.boxSizing),e.parentNode?.insertBefore(r,e),r.appendChild(e),e.style.setProperty(`margin`,`0`),e.style.setProperty(`width`,`100%`),e.style.setProperty(`box-sizing`,`border-box`);let l=await h(e);return ae.set(r,l),{canvas:r,initialCapture:await oe(r,t)}}function le(e,t){se(e);let n=ae.get(e);n&&(n(),ae.delete(e)),e.parentNode?.insertBefore(t,e),e.remove(),y.has(t)&&(t.removeAttribute(`drawable`),y.delete(t));let r=ne.get(t);r!==void 0&&(t.style.margin=r,ne.delete(t));let i=re.get(t);i!==void 0&&(t.style.width=i,re.delete(t));let a=ie.get(t);a!==void 0&&(t.style.boxSizing=a,ie.delete(t))}var ue;function de(){if(ue!==void 0)return ue;try{let e=document.createElement(`canvas`),t=e.getContext(`2d`);ue=t!==null&&typeof t.drawElementImage==`function`&&typeof e.requestPaint==`function`}catch{ue=!1}return ue}function fe(e){let t=typeof window<`u`?window.devicePixelRatio:1,n;n=e.scrollPadding===void 0?[.1,.1]:e.scrollPadding===!1?[0,0]:Array.isArray(e.scrollPadding)?[e.scrollPadding[0]??.1,e.scrollPadding[1]??.1]:[e.scrollPadding,e.scrollPadding];let r;return r=e.postEffect===void 0?[]:Array.isArray(e.postEffect)?e.postEffect:[e.postEffect],{pixelRatio:e.pixelRatio??t,zIndex:e.zIndex??void 0,autoplay:e.autoplay??!0,fixedCanvas:e.scrollPadding===!1,scrollPadding:n,wrapper:e.wrapper,postEffects:r,preserveDrawingBuffer:e.preserveDrawingBuffer??!1,timeScale:e.timeScale??1}}var pe=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},me=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},he,ge,_e,ve,ye,be,xe,Se,b=class{constructor(e,t,n){he.add(this),this.wrapS=`clamp`,this.wrapT=`clamp`,this.minFilter=`linear`,this.magFilter=`linear`,this.needsUpdate=!0,this.source=null,ge.set(this,void 0),_e.set(this,!1),ve.set(this,void 0),ye.set(this,void 0),pe(this,ge,e,`f`),this.gl=e.gl;let r=n?.externalHandle;pe(this,ye,r!==void 0,`f`),r===void 0?me(this,he,`m`,be).call(this):(this.texture=r,pe(this,_e,!0,`f`),this.needsUpdate=!1),t&&(this.source=t),pe(this,ve,n?.autoRegister!==!1&&!me(this,ye,`f`),`f`),me(this,ve,`f`)&&e.addResource(this)}restore(){me(this,ye,`f`)||(me(this,he,`m`,be).call(this),pe(this,_e,!1,`f`),this.needsUpdate=!0)}bind(e){let t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&=(me(this,he,`m`,xe).call(this),!1)}dispose(){me(this,ve,`f`)&&me(this,ge,`f`).removeResource(this),me(this,ye,`f`)||this.gl.deleteTexture(this.texture)}};ge=new WeakMap,_e=new WeakMap,ve=new WeakMap,ye=new WeakMap,he=new WeakSet,be=function(){let e=this.gl.createTexture();if(!e)throw Error(`[VFX-JS] Failed to create texture`);this.texture=e},xe=function(){let e=this.gl,t=this.source;if(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4),t)try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)}catch(e){console.error(e)}else if(!me(this,_e,`f`)){let t=new Uint8Array([0,0,0,0]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,t)}me(this,he,`m`,Se).call(this),pe(this,_e,!0,`f`)},Se=function(){let e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,Ce(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,Ce(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,we(e,this.minFilter)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,we(e,this.magFilter))};function Ce(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function we(e,t){return t===`nearest`?e.NEAREST:e.LINEAR}function Te(e){return new Promise((t,n)=>{let r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>t(r),r.onerror=n,r.src=e})}var Ee=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},De=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Oe,ke,Ae,je=class{constructor(e,t,n,r={}){Oe.add(this),ke.set(this,void 0),Ee(this,ke,e,`f`),this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(n)),this.float=r.float??!1,this.mipmap=r.mipmap??!1,this.texture=new b(e,void 0,{autoRegister:!1});let i=r.wrap;i!==void 0&&(typeof i==`string`?(this.texture.wrapS=i,this.texture.wrapT=i):(this.texture.wrapS=i[0],this.texture.wrapT=i[1])),r.filter!==void 0&&(this.texture.minFilter=r.filter,this.texture.magFilter=r.filter),De(this,Oe,`m`,Ae).call(this),e.addResource(this)}setSize(e,t){let n=Math.max(1,Math.floor(e)),r=Math.max(1,Math.floor(t));n===this.width&&r===this.height||(this.width=n,this.height=r,De(this,Oe,`m`,Ae).call(this))}restore(){this.texture.restore(),De(this,Oe,`m`,Ae).call(this)}dispose(){De(this,ke,`f`).removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.texture.dispose()}generateMipmaps(){if(!this.mipmap)return;let e=this.gl;e.bindTexture(e.TEXTURE_2D,this.texture.texture),e.generateMipmap(e.TEXTURE_2D),e.bindTexture(e.TEXTURE_2D,null)}};ke=new WeakMap,Oe=new WeakSet,Ae=function(){let e=this.gl,t=this.fbo,n=e.createFramebuffer();if(!n)throw Error(`[VFX-JS] Failed to create framebuffer`);this.fbo=n;let r=this.texture.texture;e.bindTexture(e.TEXTURE_2D,r);let i=De(this,ke,`f`).floatLinearFilter;if(this.float&&i&&!De(this,ke,`f`).floatBlend)throw Error(`[VFX-JS] EXT_float_blend is not supported.`);let a=this.float?i?e.RGBA32F:e.RGBA16F:e.RGBA8,o=this.float?i?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;if(this.mipmap){let t=Math.floor(Math.log2(Math.max(this.width,this.height)))+1,n=this.width,r=this.height;for(let i=0;i<t;i++)e.texImage2D(e.TEXTURE_2D,i,a,n,r,0,e.RGBA,o,null),n=Math.max(1,n>>1),r=Math.max(1,r>>1)}else e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,e.RGBA,o,null);let s=this.texture.minFilter===`nearest`?e.NEAREST:e.LINEAR,c=this.texture.magFilter===`nearest`?e.NEAREST:e.LINEAR,l=this.mipmap?this.texture.minFilter===`nearest`?e.NEAREST_MIPMAP_NEAREST:e.LINEAR_MIPMAP_LINEAR:s,u=Me(e,this.texture.wrapS),d=Me(e,this.texture.wrapT);e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,l),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,c),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,u),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,d),e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.texture.needsUpdate=!1,this.texture.source=null,t&&e.deleteFramebuffer(t)};function Me(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function Ne(e,t,n,r){return{x:e.left+n,y:t-r-e.bottom,w:e.right-e.left,h:e.bottom-e.top}}function Pe(e,t,n,r){return{x:e,y:t,w:n,h:r}}var Fe=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},x=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ie,Le,Re,ze,Be=class{constructor(e,t,n,r,i,a={}){Ie.set(this,void 0),Le.set(this,void 0),Re.set(this,void 0),ze.set(this,void 0),Fe(this,Ie,t,`f`),Fe(this,Le,n,`f`),Fe(this,Re,r,`f`);let o=t*r,s=n*r,c={float:i,wrap:a.wrap,filter:a.filter,mipmap:a.mipmap};Fe(this,ze,[new je(e,o,s,c),new je(e,o,s,c)],`f`)}get texture(){return x(this,ze,`f`)[0].texture}get target(){return x(this,ze,`f`)[1]}resize(e,t){if(e===x(this,Ie,`f`)&&t===x(this,Le,`f`))return;Fe(this,Ie,e,`f`),Fe(this,Le,t,`f`);let n=e*x(this,Re,`f`),r=t*x(this,Re,`f`);x(this,ze,`f`)[0].setSize(n,r),x(this,ze,`f`)[1].setSize(n,r)}swap(){Fe(this,ze,[x(this,ze,`f`)[1],x(this,ze,`f`)[0]],`f`)}getViewport(){return Pe(0,0,x(this,Ie,`f`),x(this,Le,`f`))}dispose(){x(this,ze,`f`)[0].dispose(),x(this,ze,`f`)[1].dispose()}};Ie=new WeakMap,Le=new WeakMap,Re=new WeakMap,ze=new WeakMap;var Ve=class{constructor(e=0,t=0){this.x=0,this.y=0,this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}},He=class{constructor(e=0,t=0,n=0,r=0){this.x=0,this.y=0,this.z=0,this.w=0,this.x=e,this.y=t,this.z=n,this.w=r}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}},Ue=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},We=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ge,Ke,qe,Je,Ye,Xe,Ze;function Qe(e){return/#version\s+300\s+es\b/.test(e)?`300 es`:/#version\s+100\b/.test(e)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(e)?`100`:`300 es`}var $e=class{constructor(e,t,n,r){Ge.add(this),Ke.set(this,void 0),qe.set(this,void 0),Je.set(this,void 0),Ye.set(this,void 0),Xe.set(this,new Map),Ue(this,Ke,e,`f`),this.gl=e.gl,Ue(this,qe,t,`f`),Ue(this,Je,n,`f`),Ue(this,Ye,r??Qe(n),`f`),We(this,Ge,`m`,Ze).call(this),e.addResource(this)}restore(){We(this,Ge,`m`,Ze).call(this)}use(){this.gl.useProgram(this.program)}hasUniform(e){return We(this,Xe,`f`).has(e)}uploadUniforms(e){let t=this.gl,n=0;for(let[r,i]of We(this,Xe,`f`)){let a=e[r];if(!a)continue;let o=a.value;if(o!=null){if(nt(i.type)){o instanceof b&&(o.bind(n),t.uniform1i(i.location,n),n++);continue}o instanceof b||it(t,i,o)}}}dispose(){We(this,Ke,`f`).removeResource(this),this.gl.deleteProgram(this.program)}};Ke=new WeakMap,qe=new WeakMap,Je=new WeakMap,Ye=new WeakMap,Xe=new WeakMap,Ge=new WeakSet,Ze=function(){let e=this.gl,t=et(e,e.VERTEX_SHADER,tt(We(this,qe,`f`),We(this,Ye,`f`))),n=et(e,e.FRAGMENT_SHADER,tt(We(this,Je,`f`),We(this,Ye,`f`))),r=e.createProgram();if(!r)throw Error(`[VFX-JS] Failed to create program`);if(e.attachShader(r,t),e.attachShader(r,n),e.bindAttribLocation(r,0,`position`),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let i=e.getProgramInfoLog(r)??``;throw e.deleteShader(t),e.deleteShader(n),e.deleteProgram(r),Error(`[VFX-JS] Program link failed: ${i}`)}e.detachShader(r,t),e.detachShader(r,n),e.deleteShader(t),e.deleteShader(n),this.program=r,We(this,Xe,`f`).clear();let i=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<i;t++){let n=e.getActiveUniform(r,t);if(!n)continue;let i=n.name.replace(/\[0\]$/,``),a=e.getUniformLocation(r,n.name);a&&We(this,Xe,`f`).set(i,{location:a,type:n.type,size:n.size})}};function et(e,t,n){let r=e.createShader(t);if(!r)throw Error(`[VFX-JS] Failed to create shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)??``;throw e.deleteShader(r),Error(`[VFX-JS] Shader compile failed: ${t}\n\n${n}`)}return r}function tt(e,t){return e.replace(/^\s+/,``).startsWith(`#version`)||t===`100`?e:`#version 300 es\n${e}`}function nt(e){return e===35678||e===36298||e===36306||e===35682}var rt=new Set;function it(e,t,n){let r=t.location,i=t.size>1,a=n,o=n,s=n;switch(t.type){case e.FLOAT:i?e.uniform1fv(r,a):e.uniform1f(r,n);return;case e.FLOAT_VEC2:if(i)e.uniform2fv(r,a);else if(n instanceof Ve)e.uniform2f(r,n.x,n.y);else{let t=n;e.uniform2f(r,t[0],t[1])}return;case e.FLOAT_VEC3:if(i)e.uniform3fv(r,a);else{let t=n;e.uniform3f(r,t[0],t[1],t[2])}return;case e.FLOAT_VEC4:if(i)e.uniform4fv(r,a);else if(n instanceof He)e.uniform4f(r,n.x,n.y,n.z,n.w);else{let t=n;e.uniform4f(r,t[0],t[1],t[2],t[3])}return;case e.INT:i?e.uniform1iv(r,o):e.uniform1i(r,n);return;case e.INT_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,t[0],t[1])}return;case e.INT_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,t[0],t[1],t[2])}return;case e.INT_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,t[0],t[1],t[2],t[3])}return;case e.BOOL:i?e.uniform1iv(r,o):e.uniform1i(r,+!!n);return;case e.BOOL_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,+!!t[0],+!!t[1])}return;case e.BOOL_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,+!!t[0],+!!t[1],+!!t[2])}return;case e.BOOL_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,+!!t[0],+!!t[1],+!!t[2],+!!t[3])}return;case e.FLOAT_MAT2:e.uniformMatrix2fv(r,!1,a);return;case e.FLOAT_MAT3:e.uniformMatrix3fv(r,!1,a);return;case e.FLOAT_MAT4:e.uniformMatrix4fv(r,!1,a);return;case e.UNSIGNED_INT:i?e.uniform1uiv(r,s):e.uniform1ui(r,n);return;case e.UNSIGNED_INT_VEC2:if(i)e.uniform2uiv(r,s);else{let t=n;e.uniform2ui(r,t[0],t[1])}return;case e.UNSIGNED_INT_VEC3:if(i)e.uniform3uiv(r,s);else{let t=n;e.uniform3ui(r,t[0],t[1],t[2])}return;case e.UNSIGNED_INT_VEC4:if(i)e.uniform4uiv(r,s);else{let t=n;e.uniform4ui(r,t[0],t[1],t[2],t[3])}return;default:rt.has(t.type)||(rt.add(t.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${t.type.toString(16)}; skipping upload.`));return}}var at=class{constructor(e,t,n,r,i,a){this.gl=e.gl,this.program=new $e(e,t,n,a),this.uniforms=r,this.blend=i}dispose(){this.program.dispose()}};function ot(e,t,n,r,i,a,o,s){let c=r?r.width/s:a,l=r?r.height/s:o,u=Math.max(0,i.x),d=Math.max(0,i.y),f=Math.min(c,i.x+i.w),p=Math.min(l,i.y+i.h),m=f-u,h=p-d;m<=0||h<=0||(e.bindFramebuffer(e.FRAMEBUFFER,r?r.fbo:null),e.viewport(Math.round(u*s),Math.round(d*s),Math.round(m*s),Math.round(h*s)),st(e,n.blend),n.program.use(),n.program.uploadUniforms(n.uniforms),t.draw())}function st(e,t){if(t===`none`){e.disable(e.BLEND);return}e.enable(e.BLEND),e.blendEquation(e.FUNC_ADD),t===`premultiplied`?e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA):t===`additive`?e.blendFuncSeparate(e.ONE,e.ONE,e.ONE,e.ONE):e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA)}var ct=class{constructor(t){this.uniforms={src:{value:null},offset:{value:new Ve},resolution:{value:new Ve},viewport:{value:new He}},this.pass=new at(t,e,n,this.uniforms,`premultiplied`)}setUniforms(e,t,n){this.uniforms.src.value=e,this.uniforms.resolution.value.set(n.w*t,n.h*t),this.uniforms.offset.value.set(n.x*t,n.y*t)}dispose(){this.pass.dispose()}},lt=e=>{let t=document.implementation.createHTMLDocument(`test`),n=t.createRange();n.selectNodeContents(t.documentElement),n.deleteContents();let r=document.createElement(`head`);return t.documentElement.appendChild(r),t.documentElement.appendChild(n.createContextualFragment(e)),t.documentElement.setAttribute(`xmlns`,t.documentElement.namespaceURI),new XMLSerializer().serializeToString(t).replace(/<!DOCTYPE html>/,``)};async function ut(e,t,n,r){let i=e.getBoundingClientRect(),a=window.devicePixelRatio,o=Math.ceil(i.width),s=Math.ceil(i.height),c=o*a,l=s*a,u=1,d=c,f=l;r&&(d>r||f>r)&&(u=Math.min(r/d,r/f),d=Math.floor(d*u),f=Math.floor(f*u));let p=n&&n.width===d&&n.height===f?n:new OffscreenCanvas(d,f),m=e.cloneNode(!0);await dt(e,m),ft(e,m),m.style.setProperty(`opacity`,t.toString()),m.style.setProperty(`margin`,`0px`),pt(m),m.style.setProperty(`box-sizing`,`border-box`),m.style.setProperty(`width`,`${o}px`),m.style.setProperty(`height`,`${s}px`);let h=m.outerHTML,ee=`<svg xmlns="http://www.w3.org/2000/svg" width="${c}" height="${l}"><foreignObject width="100%" height="100%">${lt(h)}</foreignObject></svg>`;return new Promise((e,t)=>{let n=new Image;n.onload=()=>{let r=p.getContext(`2d`);if(r===null)return t();r.clearRect(0,0,d,f);let i=a*u;r.scale(i,i),r.drawImage(n,0,0,c,l),r.setTransform(1,0,0,1,0,0),e(p)},n.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(ee)}`})}async function dt(e,t){let n=window.getComputedStyle(e);for(let e of Array.from(n))/(-inline-|-block-|^inline-|^block-)/.test(e)||/^-webkit-.*(start|end|before|after|logical)/.test(e)||t.style.setProperty(e,n.getPropertyValue(e),n.getPropertyPriority(e));if(t.tagName===`INPUT`)t.setAttribute(`value`,t.value);else if(t.tagName===`TEXTAREA`)t.innerHTML=t.value;else if(t.tagName===`IMG`)try{t.src=await mt(f(e))}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];await dt(r,i)}}function ft(e,t){if(typeof e.computedStyleMap==`function`)try{let n=e.computedStyleMap();for(let e of[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`]){let r=n.get(e);r instanceof CSSKeywordValue&&r.value===`auto`&&t.style.setProperty(e,`auto`)}}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];r instanceof HTMLElement&&i instanceof HTMLElement&&ft(r,i)}}function pt(e){let t=e;for(;;){let e=t.style;if(Number.parseFloat(e.paddingTop)>0||Number.parseFloat(e.borderTopWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.firstElementChild;if(!n)break;n.style.setProperty(`margin-top`,`0px`),t=n}for(t=e;;){let e=t.style;if(Number.parseFloat(e.paddingBottom)>0||Number.parseFloat(e.borderBottomWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.lastElementChild;if(!n)break;n.style.setProperty(`margin-bottom`,`0px`),t=n}}async function mt(e){let t=await fetch(e).then(e=>e.blob());return new Promise(e=>{let n=new FileReader;n.onload=function(){e(this.result)},n.readAsDataURL(t)})}var S=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},C=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ht,gt,_t,vt,yt,bt,xt,St,Ct,wt,Tt,Et,Dt=Object.freeze({__brand:`EffectQuad`});function Ot(e){return e===Dt}function kt(e,t){switch(t){case`lines`:return e.LINES;case`lineStrip`:return e.LINE_STRIP;case`points`:return e.POINTS;default:return e.TRIANGLES}}function At(e,t){if(t instanceof Float32Array)return e.FLOAT;if(t instanceof Uint8Array)return e.UNSIGNED_BYTE;if(t instanceof Uint16Array)return e.UNSIGNED_SHORT;if(t instanceof Uint32Array)return e.UNSIGNED_INT;if(t instanceof Int8Array)return e.BYTE;if(t instanceof Int16Array)return e.SHORT;if(t instanceof Int32Array)return e.INT;throw Error(`[VFX-JS] Unsupported attribute typed array`)}function jt(e,t){if(ArrayBuffer.isView(t)&&!(t instanceof DataView))return{name:e,data:t,itemSize:2,normalized:!1,perInstance:!1};let n=t;return{name:e,data:n.data,itemSize:n.itemSize,normalized:n.normalized??!1,perInstance:n.perInstance??!1}}var Mt=class{constructor(e,t,n){ht.add(this),gt.set(this,void 0),_t.set(this,void 0),vt.set(this,void 0),yt.set(this,[]),bt.set(this,null),this.indexType=0,this.hasIndices=!1,this.drawCount=0,this.drawStart=0,xt.set(this,!1),S(this,gt,e,`f`),this.gl=e.gl,S(this,_t,t,`f`),S(this,vt,n,`f`),this.mode=kt(this.gl,t.mode),this.instanceCount=t.instanceCount??0,C(this,ht,`m`,St).call(this),e.addResource(this),S(this,xt,!0,`f`)}restore(){S(this,yt,[],`f`),S(this,bt,null,`f`),C(this,ht,`m`,St).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),this.hasIndices?this.instanceCount>0?e.drawElementsInstanced(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2),this.instanceCount):e.drawElements(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2)):this.instanceCount>0?e.drawArraysInstanced(this.mode,this.drawStart,this.drawCount,this.instanceCount):e.drawArrays(this.mode,this.drawStart,this.drawCount)}dispose(){C(this,xt,`f`)&&(C(this,gt,`f`).removeResource(this),S(this,xt,!1,`f`));let e=this.gl;e.deleteVertexArray(this.vao);for(let t of C(this,yt,`f`))e.deleteBuffer(t);C(this,bt,`f`)&&e.deleteBuffer(C(this,bt,`f`)),S(this,yt,[],`f`),S(this,bt,null,`f`)}};gt=new WeakMap,_t=new WeakMap,vt=new WeakMap,yt=new WeakMap,bt=new WeakMap,xt=new WeakMap,ht=new WeakSet,St=function(){let e=this.gl,t=e.createVertexArray();if(!t)throw Error(`[VFX-JS] Failed to create VAO`);this.vao=t,e.bindVertexArray(t);let n=C(this,vt,`f`).program,r=null;for(let[t,i]of Object.entries(C(this,_t,`f`).attributes)){let a=jt(t,i),o=e.getAttribLocation(n,a.name);if(o<0)continue;let s=e.createBuffer();if(!s)throw Error(`[VFX-JS] Failed to create VBO for "${a.name}"`);C(this,yt,`f`).push(s),e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,a.data,e.STATIC_DRAW);let c=At(e,a.data);e.enableVertexAttribArray(o),c===e.FLOAT||c===e.HALF_FLOAT||a.normalized?e.vertexAttribPointer(o,a.itemSize,c,a.normalized,0,0):e.vertexAttribIPointer(o,a.itemSize,c,0,0),a.perInstance&&e.vertexAttribDivisor(o,1),t===`position`&&r===null&&(r=a.data.length/a.itemSize)}let i=0,a=C(this,_t,`f`).indices;if(a){let t=e.createBuffer();if(!t)throw Error(`[VFX-JS] Failed to create IBO`);S(this,bt,t,`f`),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t),e.bufferData(e.ELEMENT_ARRAY_BUFFER,a,e.STATIC_DRAW),this.hasIndices=!0,this.indexType=a instanceof Uint32Array?e.UNSIGNED_INT:e.UNSIGNED_SHORT,i=a.length}else this.hasIndices=!1;e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null),C(this,bt,`f`)&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null);let o=this.hasIndices?i:r??0,s=C(this,_t,`f`).drawRange;this.drawStart=s?.start??0,this.drawCount=s?.count===void 0?Math.max(0,o-this.drawStart):s.count};var Nt=class{constructor(e,t){Ct.set(this,void 0),wt.set(this,void 0),Tt.set(this,new WeakMap),Et.set(this,new Set),S(this,Ct,e,`f`),S(this,wt,t,`f`)}get quad(){return C(this,wt,`f`)}resolve(e,t){let n=C(this,Tt,`f`).get(e);n||(n=new Map,C(this,Tt,`f`).set(e,n));let r=n.get(t);return r||(r=new Mt(C(this,Ct,`f`),e,t),n.set(t,r),C(this,Et,`f`).add(r)),r}release(e){let t=C(this,Tt,`f`).get(e);if(t){for(let e of t.values())e.dispose(),C(this,Et,`f`).delete(e);C(this,Tt,`f`).delete(e)}}dispose(){for(let e of C(this,Et,`f`))e.dispose();C(this,Et,`f`).clear()}};Ct=new WeakMap,wt=new WeakMap,Tt=new WeakMap,Et=new WeakMap;var w=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},T=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Pt,Ft,It,Lt,Rt,zt,Bt,Vt,Ht,Ut,E,Wt,D,O,Gt,Kt,qt,Jt,Yt,Xt,Zt,Qt,$t,en=Symbol.for(`@vfx-js/effect.resolve-texture`),tn=Symbol.for(`@vfx-js/effect.resolve-rt`);function nn(e){return e[en]()}function rn(e){return e[tn]}var an=`#version 300 es
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
`,on=`
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
`,sn=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`,cn=`
precision highp float;
varying vec2 uv;
uniform sampler2D src;
void main() {
    gl_FragColor = texture2D(src, uv);
}
`,ln=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uvSrc);
}
`,un=`
precision highp float;
varying vec2 uvSrc;
uniform sampler2D src;
void main() {
    gl_FragColor = texture2D(src, uvSrc);
}
`,dn=class{constructor(e,t,n,r,i,a){Pt.add(this),Ft.set(this,void 0),It.set(this,void 0),Lt.set(this,void 0),Rt.set(this,void 0),zt.set(this,void 0),Bt.set(this,[]),Vt.set(this,[]),Ht.set(this,[]),Ut.set(this,[]),E.set(this,`init`),Wt.set(this,!1),D.set(this,void 0),O.set(this,void 0),Jt.set(this,[]),w(this,Ft,e,`f`),w(this,It,e.gl,`f`),w(this,Lt,n,`f`),w(this,Rt,a,`f`),w(this,zt,new Nt(e,t),`f`),w(this,D,{outputBufferW:1,outputBufferH:1,canvasBufferSize:[1,1],outputViewport:{x:0,y:0,w:1,h:1},elementBufferW:1,elementBufferH:1,contentRectUv:[0,0,1,1],srcRectUv:[0,0,1,1]},`f`);let o={time:0,deltaTime:0,pixelRatio:n,resolution:[1,1],mouse:[0,0],mouseViewport:[0,0],intersection:0,enterTime:0,leaveTime:0,src:r,target:null,uniforms:{},vfxProps:i,dims:{element:[1,1],elementPixel:[1,1],canvas:[1,1],canvasPixel:[1,1],pixelRatio:n,contentRect:[0,0,1,1],srcRect:[0,0,1,1],canvasRect:[0,0,1,1]},quad:Dt,gl:T(this,It,`f`),createRenderTarget:e=>T(this,Pt,`m`,Gt).call(this,e),releaseGeometry:e=>T(this,zt,`f`).release(e),wrapTexture:(e,t)=>T(this,Pt,`m`,qt).call(this,e,t),draw:e=>T(this,Pt,`m`,Yt).call(this,e),blit:(e,t,n)=>T(this,Pt,`m`,Xt).call(this,e,t,n),clear:e=>T(this,Pt,`m`,Zt).call(this,e),onContextRestored:e=>{let t=T(this,Ft,`f`).onContextRestored(e);return T(this,Ut,`f`).push(t),t}};w(this,O,o,`f`)}get ctx(){return T(this,O,`f`)}setPhase(e){w(this,E,e,`f`)}setFrameDims(e){w(this,D,e,`f`),T(this,O,`f`).resolution=[e.canvasBufferSize[0],e.canvasBufferSize[1]];for(let t of T(this,Ht,`f`))t.resolver.resize?.(e.outputBufferW,e.outputBufferH)}setEffectDims(e){T(this,O,`f`).dims=e}setFrameState(e){let t=T(this,O,`f`);t.time=e.time,t.deltaTime=e.deltaTime,t.mouse=e.mouse,t.mouseViewport=e.mouseViewport,t.intersection=e.intersection,t.enterTime=e.enterTime,t.leaveTime=e.leaveTime,t.uniforms=e.uniforms}setSrc(e){T(this,O,`f`).src=e}setOutput(e){T(this,O,`f`).target=e}passthroughCopy(e,t,n){let r=T(this,E,`f`);w(this,E,`render`,`f`);let i=T(this,O,`f`).target;T(this,O,`f`).target=t;try{let r=T(this,D,`f`).outputViewport;T(this,D,`f`).outputViewport={...n};let i=T(this,O,`f`).vfxProps.glslVersion===`100`?cn:sn;T(this,Pt,`m`,Qt).call(this,{frag:i,uniforms:{src:e},target:t}),T(this,D,`f`).outputViewport=r}finally{T(this,O,`f`).target=i,w(this,E,r,`f`)}}clearRt(e){let t=T(this,It,`f`),n=rn(e);t.bindFramebuffer(t.FRAMEBUFFER,n.getWriteFbo().fbo),t.viewport(0,0,e.width,e.height),t.clearColor(0,0,0,0),t.disable(t.SCISSOR_TEST),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)}tickAutoUpdates(){for(let e of T(this,Jt,`f`))e()}dispose(){w(this,E,`disposed`,`f`);for(let e of T(this,Ut,`f`))e();w(this,Ut,[],`f`);for(let e of T(this,Vt,`f`))e.resolver.dispose?.();w(this,Vt,[],`f`),w(this,Ht,[],`f`);for(let e of T(this,Bt,`f`))e.dispose();w(this,Bt,[],`f`),T(this,zt,`f`).dispose(),w(this,Jt,[],`f`)}};Ft=new WeakMap,It=new WeakMap,Lt=new WeakMap,Rt=new WeakMap,zt=new WeakMap,Bt=new WeakMap,Vt=new WeakMap,Ht=new WeakMap,Ut=new WeakMap,E=new WeakMap,Wt=new WeakMap,D=new WeakMap,O=new WeakMap,Jt=new WeakMap,Pt=new WeakSet,Gt=function(e){let t=e?.persistent??!1,n=e?.float??!1,r=pn(e?.wrap),i=e?.filter,a=e?.mipmap??!1,o=a!==!1,s=a===!0,c=e?.size,l=c?c[0]:T(this,D,`f`).outputBufferW,u=c?c[1]:T(this,D,`f`).outputBufferH,d,f,p;if(t){let e=c?1:T(this,Lt,`f`),t=c?l:l/e,a=c?u:u/e,m=new Be(T(this,Ft,`f`),t,a,e,n,{wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>m.texture,getWriteFbo:()=>m.target,swap:()=>m.swap(),resize:c?void 0:(e,t)=>{m.resize(e/T(this,Lt,`f`),t/T(this,Lt,`f`))},dispose:()=>m.dispose()},o&&(d.regenerateMipmaps=()=>m.target.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>m.target.width,p=()=>m.target.height}else{let e=new je(T(this,Ft,`f`),l,u,{float:n,wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>e.texture,getWriteFbo:()=>e,resize:c?void 0:(t,n)=>e.setSize(t,n),dispose:()=>e.dispose()},o&&(d.regenerateMipmaps=()=>e.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>e.width,p=()=>e.height}let m,h=gn(d,f,p,()=>T(this,Pt,`m`,Kt).call(this,m));return m={handle:h,resolver:d},T(this,Vt,`f`).push(m),c||T(this,Ht,`f`).push(m),h},Kt=function(e){let t=T(this,Vt,`f`).indexOf(e);if(t<0)return;T(this,Vt,`f`).splice(t,1);let n=T(this,Ht,`f`).indexOf(e);n>=0&&T(this,Ht,`f`).splice(n,1),e.resolver.dispose?.()},qt=function(e,t){let n=pn(t?.wrap),r=t?.filter,i,a,o,s=null;if(fn(e)){if(!t?.size)throw Error(`[VFX-JS] wrapTexture(WebGLTexture) requires opts.size`);let[n,r]=t.size;i=new b(T(this,Ft,`f`),void 0,{autoRegister:!1,externalHandle:e}),a=()=>n,o=()=>r}else{let n=e;i=new b(T(this,Ft,`f`),n);let r=t?.size,c=e=>{if(r)return e===`w`?r[0]:r[1];if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return e===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return e===`w`?n.videoWidth:n.videoHeight;let t=n;return e===`w`?t.width:t.height};a=()=>c(`w`),o=()=>c(`h`);let l=typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement||typeof HTMLCanvasElement<`u`&&n instanceof HTMLCanvasElement||typeof OffscreenCanvas<`u`&&n instanceof OffscreenCanvas;(t?.autoUpdate??l)&&(s=()=>{i.needsUpdate=!0})}i.wrapS=n[0],i.wrapT=n[1],r!==void 0&&(i.minFilter=r,i.magFilter=r),T(this,Bt,`f`).push(i),s&&T(this,Jt,`f`).push(s);let c=!1;return hn(()=>i,a,o,()=>{if(c)return;c=!0;let e=T(this,Bt,`f`).indexOf(i);if(e!==-1&&T(this,Bt,`f`).splice(e,1),s){let e=T(this,Jt,`f`).indexOf(s);e!==-1&&T(this,Jt,`f`).splice(e,1)}i.dispose()})},Yt=function(e){if(T(this,E,`f`)!==`render`){T(this,E,`f`)===`update`&&!T(this,Wt,`f`)&&(w(this,Wt,!0,`f`),console.warn(`[VFX-JS] ctx.draw() called in update(); ignored. Move draws to render().`));return}T(this,Pt,`m`,Qt).call(this,e)},Xt=function(e,t,n){if(T(this,E,`f`)!==`render`){T(this,E,`f`)===`update`&&!T(this,Wt,`f`)&&(w(this,Wt,!0,`f`),console.warn(`[VFX-JS] ctx.blit() called in update(); ignored. Move draws to render().`));return}let r=T(this,O,`f`).vfxProps.glslVersion===`100`?un:ln;T(this,Pt,`m`,Qt).call(this,{frag:r,uniforms:{src:e},target:t,blend:n?.blend,swap:n?.swap})},Zt=function(e){if(T(this,E,`f`)!==`render`){T(this,E,`f`)===`update`&&!T(this,Wt,`f`)&&(w(this,Wt,!0,`f`),console.warn(`[VFX-JS] ctx.clear() called in update(); ignored. Move draws to render().`));return}let t=T(this,It,`f`),n=T(this,O,`f`).target,r=e??n,i=r===null||r===n;if(t.clearColor(0,0,0,0),i){let e=r===null?null:rn(r).getWriteFbo().fbo,n=T(this,D,`f`).outputViewport;t.bindFramebuffer(t.FRAMEBUFFER,e),t.enable(t.SCISSOR_TEST),t.scissor(n.x,n.y,n.w,n.h),t.clear(t.COLOR_BUFFER_BIT),t.disable(t.SCISSOR_TEST),t.bindFramebuffer(t.FRAMEBUFFER,null);return}let a=rn(r);t.disable(t.SCISSOR_TEST);let o=()=>{t.bindFramebuffer(t.FRAMEBUFFER,a.getWriteFbo().fbo),t.clear(t.COLOR_BUFFER_BIT)};o(),a.swap&&(a.swap(),o(),a.swap()),t.bindFramebuffer(t.FRAMEBUFFER,null)},Qt=function(e){let t=T(this,It,`f`),n=e.vert??(T(this,O,`f`).vfxProps.glslVersion===`100`?on:an),r=T(this,Rt,`f`).get(n,e.frag,T(this,O,`f`).vfxProps.glslVersion),i=T(this,O,`f`).target,a=e.target===void 0||e.target===null?i:e.target,o=a===null||a===i,s,c,l,u,d,f,p;if(a===null)s=null,c=T(this,D,`f`).outputViewport.x,l=T(this,D,`f`).outputViewport.y,u=T(this,D,`f`).outputViewport.w,d=T(this,D,`f`).outputViewport.h;else{let e=rn(a);s=e.getWriteFbo().fbo,o?(c=T(this,D,`f`).outputViewport.x,l=T(this,D,`f`).outputViewport.y,u=T(this,D,`f`).outputViewport.w,d=T(this,D,`f`).outputViewport.h):(c=0,l=0,u=a.width,d=a.height),f=e.swap,e.mipmapAutoRegen&&(p=e.regenerateMipmaps)}t.bindFramebuffer(t.FRAMEBUFFER,s),t.viewport(c,l,u,d),t.disable(t.SCISSOR_TEST),st(t,e.blend??(a===null?`premultiplied`:`none`)),r.use();let m=T(this,Pt,`m`,$t).call(this,e.uniforms);r.uploadUniforms(m);let h=e.geometry??Dt;Ot(h)?T(this,zt,`f`).quad.draw():T(this,zt,`f`).resolve(h,r).draw(),p?.(),f&&e.swap!==!1&&f()},$t=function(e){let t={};if(t.contentRectUv={value:T(this,D,`f`).contentRectUv},t.srcRectUv={value:T(this,D,`f`).srcRectUv},!e)return t;for(let[n,r]of Object.entries(e))t[n]=mn(r);return t};function fn(e){let t=globalThis.WebGLTexture;if(t&&typeof t==`function`&&e instanceof t)return!0;let n=e;return n.width===void 0&&n.naturalWidth===void 0&&n.videoWidth===void 0}function pn(e){return e===void 0?[`clamp`,`clamp`]:typeof e==`string`?[e,e]:[e[0],e[1]]}function mn(e){return typeof e==`object`&&e&&`__brand`in e?e.__brand===`EffectRenderTarget`?{value:rn(e).getReadTexture()}:{value:nn(e)}:{value:e}}function hn(e,t,n,r){let i={__brand:`EffectTexture`,get width(){return t()},get height(){return n()},dispose(){r?.()}};return Object.defineProperty(i,en,{value:e}),i}function gn(e,t,n,r){let i={__brand:`EffectRenderTarget`,get width(){return t()},get height(){return n()},dispose:r??(()=>{}),generateMipmaps:()=>e.regenerateMipmaps?.()};return Object.defineProperty(i,tn,{value:e}),i}function _n(e){return gn({getReadTexture:()=>e.texture,getWriteFbo:()=>e},()=>e.width,()=>e.height)}function vn(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:Array.isArray(e)?{top:e[0],right:e[1],bottom:e[2],left:e[3]}:{top:e.top??0,right:e.right??0,bottom:e.bottom??0,left:e.left??0}}function yn(e){return vn(e)}var bn={top:0,right:0,bottom:0,left:0};function xn(e){return vn(e)}function Sn(e){return{top:e.top,right:e.right,bottom:e.bottom,left:e.left}}function Cn(e){return{top:e.top,left:e.left,right:e.left+Math.ceil(e.right-e.left),bottom:e.top+Math.ceil(e.bottom-e.top)}}function wn(e,t){return{top:e.top-t.top,right:e.right+t.right,bottom:e.bottom+t.bottom,left:e.left-t.left}}function Tn(e,t,n){return Math.min(Math.max(e,t),n)}function En(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return c<=0||l<=0?[0,0,1,1]:[(n-o)/c,(r-s)/l,i/c,a/l]}function Dn(e,t){let n=Tn(t.left,e.left,e.right),r=(Tn(t.right,e.left,e.right)-n)/(t.right-t.left),i=Tn(t.top,e.top,e.bottom);return r*((Tn(t.bottom,e.top,e.bottom)-i)/(t.bottom-t.top))}var k=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},A=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},j,On,kn,An,jn,Mn,M,N,P,Nn,F,Pn,Fn,In,Ln,Rn,I,zn,Bn,Vn,Hn,Un,Wn,Gn,Kn,qn,Jn,Yn=class{constructor(e,t,n,r,i,a,o,s){j.add(this),On.set(this,void 0),kn.set(this,void 0),An.set(this,void 0),jn.set(this,void 0),Mn.set(this,void 0),M.set(this,void 0),N.set(this,void 0),P.set(this,void 0),Nn.set(this,[]),F.set(this,[]),Pn.set(this,void 0),Fn.set(this,new Set),In.set(this,!1),Ln.set(this,void 0),Rn.set(this,yn(0)),I.set(this,null),k(this,On,e,`f`),k(this,kn,t,`f`),k(this,An,n,`f`),k(this,jn,i,`f`),k(this,Mn,s,`f`),k(this,M,r,`f`),k(this,Pn,a,`f`),k(this,Ln,o,`f`),k(this,N,r.map(()=>A(this,j,`m`,Bn).call(this)),`f`),r.length===0&&k(this,I,A(this,j,`m`,Bn).call(this),`f`),k(this,P,A(this,j,`m`,zn).call(this),`f`)}get effects(){return A(this,M,`f`)}get hosts(){return A(this,N,`f`)}get renderingIndices(){return A(this,P,`f`)}get stages(){return A(this,F,`f`)}get hitTestPadBuffer(){return A(this,Rn,`f`)}async initAll(){for(let e=0;e<A(this,M,`f`).length;e++){let t=A(this,M,`f`)[e],n=A(this,N,`f`)[e];n.setPhase(`init`);try{t.init&&await t.init(n.ctx)}catch(t){console.error(`[VFX-JS] effect[${e}].init() failed:`,t);for(let t=e-1;t>=0;t--)A(this,j,`m`,Vn).call(this,t),A(this,N,`f`)[t].dispose();throw A(this,N,`f`)[e].dispose(),t}n.setPhase(`update`)}}run(e){if(A(this,In,`f`)||!e.isVisible)return;k(this,P,A(this,j,`m`,zn).call(this),`f`);let t=A(this,P,`f`).length;for(let t of A(this,N,`f`))t.setFrameState({time:e.time,deltaTime:e.deltaTime,mouse:e.mouse,mouseViewport:e.mouseViewport,intersection:e.intersection,enterTime:e.enterTime,leaveTime:e.leaveTime,uniforms:e.resolvedUniforms});A(this,j,`m`,Hn).call(this,e);for(let t=0;t<A(this,N,`f`).length;t++)A(this,N,`f`)[t].setFrameDims(A(this,j,`m`,Jn).call(this,t,e)),A(this,N,`f`)[t].setEffectDims(A(this,j,`m`,Gn).call(this,t,e));for(let e=0;e<A(this,M,`f`).length;e++){let t=A(this,M,`f`)[e];if(!t.update)continue;let n=A(this,N,`f`)[e];n.setPhase(`update`);try{t.update(n.ctx)}catch(t){let n=`${e}:update`;A(this,Fn,`f`).has(n)||(A(this,Fn,`f`).add(n),console.warn(`[VFX-JS] effect[${e}].update() threw; skipping this frame's update:`,t))}}if(t===0){(A(this,I,`f`)??A(this,N,`f`)[0]).passthroughCopy(A(this,Pn,`f`),e.finalTarget,e.elementRectOnCanvasPx);return}for(let n=0;n<t;n++){let r=A(this,P,`f`)[n],i=A(this,N,`f`)[r],a=A(this,M,`f`)[r];if(!a.render)continue;i.setPhase(`render`),i.tickAutoUpdates();let o=n===0?A(this,Pn,`f`):A(this,Nn,`f`)[n-1].texHandle;i.setSrc(o);let s;n===t-1?s=e.finalTarget:(s=A(this,Nn,`f`)[n].rtHandle,i.clearRt(s)),i.setOutput(s);try{a.render(i.ctx)}catch(e){let a=`${r}:render`;A(this,Fn,`f`).has(a)||(A(this,Fn,`f`).add(a),console.warn(`[VFX-JS] effect[${r}].render() threw; falling back to passthrough:`,e));let c=A(this,F,`f`)[n].outputViewport;s===null?i.passthroughCopy(o,null,c):n===t-1?i.passthroughCopy(o,s,c):i.passthroughCopy(o,s,{x:0,y:0,w:s.width,h:s.height})}i.setPhase(`update`)}}dispose(){if(!A(this,In,`f`)){k(this,In,!0,`f`);for(let e=A(this,M,`f`).length-1;e>=0;e--)A(this,j,`m`,Vn).call(this,e),A(this,N,`f`)[e].dispose();A(this,I,`f`)&&(A(this,I,`f`).dispose(),k(this,I,null,`f`));for(let e of A(this,Nn,`f`))e.fb.dispose();k(this,Nn,[],`f`),k(this,F,[],`f`)}}async replaceEffects(e){if(A(this,In,`f`))throw Error(`[VFX-JS] replaceEffects on disposed chain`);let t=A(this,M,`f`),n=A(this,N,`f`),r=new Map;for(let e=0;e<t.length;e++)r.set(t[e],n[e]);let i=Array(e.length),a=[];for(let t=0;t<e.length;t++){let n=e[t],o=r.get(n);if(o)i[t]=o,r.delete(n);else{let e=A(this,j,`m`,Bn).call(this);i[t]=e,a.push({host:e,effect:n})}}for(let e=0;e<a.length;e++){let{host:t,effect:n}=a[e];t.setPhase(`init`);try{n.init&&await n.init(t.ctx),t.setPhase(`update`)}catch(n){console.error(`[VFX-JS] replaceEffects: new effect init() failed:`,n);for(let t=e-1;t>=0;t--){let e=a[t];if(e.effect.dispose)try{e.effect.dispose()}catch(e){console.error(`[VFX-JS] dispose during init rollback threw:`,e)}e.host.dispose()}throw t.dispose(),n}}for(let[e,t]of r){if(e.dispose)try{e.dispose()}catch(e){console.error(`[VFX-JS] effect.dispose() threw during replaceEffects:`,e)}t.dispose()}for(let e of A(this,Nn,`f`))e.fb.dispose();k(this,Nn,[],`f`),k(this,F,[],`f`),e.length===0&&!A(this,I,`f`)?k(this,I,A(this,j,`m`,Bn).call(this),`f`):e.length>0&&A(this,I,`f`)&&(A(this,I,`f`).dispose(),k(this,I,null,`f`)),k(this,M,e,`f`),k(this,N,i,`f`),k(this,P,A(this,j,`m`,zn).call(this),`f`),A(this,Fn,`f`).clear()}};On=new WeakMap,kn=new WeakMap,An=new WeakMap,jn=new WeakMap,Mn=new WeakMap,M=new WeakMap,N=new WeakMap,P=new WeakMap,Nn=new WeakMap,F=new WeakMap,Pn=new WeakMap,Fn=new WeakMap,In=new WeakMap,Ln=new WeakMap,Rn=new WeakMap,I=new WeakMap,j=new WeakSet,zn=function(){return A(this,M,`f`).map((e,t)=>typeof e.render==`function`&&e.enabled!==!1?t:-1).filter(e=>e>=0)},Bn=function(){return new dn(A(this,On,`f`),A(this,kn,`f`),A(this,An,`f`),A(this,Pn,`f`),A(this,jn,`f`),A(this,Mn,`f`))},Vn=function(e){let t=A(this,M,`f`)[e];if(t.dispose)try{t.dispose()}catch(t){console.error(`[VFX-JS] effect[${e}].dispose() threw:`,t)}},Hn=function(e){let t=A(this,P,`f`).length;if(k(this,F,Array(t),`f`),t===0)return;let n=A(this,Ln,`f`)?e.canvasBufferSize:e.elementBufferSize,r=[0,0,n[0],n[1]],i=A(this,j,`m`,qn).call(this,e),a=r;for(let n=0;n<t;n++){let o=A(this,P,`f`)[n],s=A(this,M,`f`)[o],c=n===t-1,l=A(this,j,`m`,Un).call(this,s,a,r,i,e)??a,u=[l[2],l[3]],d=En(r,l),f=c?{x:e.elementRectOnCanvasPx.x+l[0],y:e.elementRectOnCanvasPx.y+l[1],w:u[0],h:u[1]}:{x:0,y:0,w:u[0],h:u[1]};A(this,F,`f`)[n]={dstRect:l,dstBufferSize:u,contentRectUv:d,outputViewport:f},c||A(this,j,`m`,Kn).call(this,n,u),a=l}let[o,s,c,l]=A(this,F,`f`)[t-1].dstRect;k(this,Rn,yn({top:Math.max(0,s+l-n[1]),right:Math.max(0,o+c-n[0]),bottom:Math.max(0,-s),left:Math.max(0,-o)}),`f`)},Un=function(e,t,n,r,i){if(e.outputRect)return e.outputRect(A(this,j,`m`,Wn).call(this,i,n,t,r))},Wn=function(e,t,n,r){let i=e.canvasBufferSize[0]/e.canvasSize[0]||1;return{element:A(this,Ln,`f`)?e.canvasSize:e.elementSize,elementPixel:A(this,Ln,`f`)?e.canvasBufferSize:e.elementBufferSize,canvas:e.canvasSize,canvasPixel:e.canvasBufferSize,pixelRatio:i,contentRect:t,srcRect:n,canvasRect:r}},Gn=function(e,t){let n=A(this,Ln,`f`)?t.canvasBufferSize:t.elementBufferSize,r=[0,0,n[0],n[1]],i=A(this,j,`m`,qn).call(this,t),a=A(this,P,`f`).indexOf(e),o=a<=0?r:A(this,F,`f`)[a-1].dstRect;return A(this,j,`m`,Wn).call(this,t,r,o,i)},Kn=function(e,t){let n=A(this,Nn,`f`)[e];if(n&&n.fb.width===t[0]&&n.fb.height===t[1])return;n&&n.fb.dispose();let r=new je(A(this,On,`f`),t[0],t[1]),i=_n(r),a=hn(()=>r.texture,()=>r.width,()=>r.height);A(this,Nn,`f`)[e]={fb:r,rtHandle:i,texHandle:a,bufferSize:t}},qn=function(e){let[t,n]=e.canvasBufferSize;if(A(this,Ln,`f`))return[0,0,t,n];let{x:r,y:i}=e.elementRectOnCanvasPx;return[-r,-i,t,n]},Jn=function(e,t){let n=A(this,P,`f`).indexOf(e),r,i,a,o,s;if(n<0)r=t.elementBufferSize[0],i=t.elementBufferSize[1],a={x:0,y:0,w:r,h:i},o=[0,0,1,1],s=[0,0,1,1];else{let e=A(this,F,`f`)[n];r=e.dstBufferSize[0],i=e.dstBufferSize[1],a=e.outputViewport,o=e.contentRectUv,s=n===0?[0,0,1,1]:A(this,F,`f`)[n-1].contentRectUv}return{outputBufferW:r,outputBufferH:i,canvasBufferSize:t.canvasBufferSize,outputViewport:a,elementBufferW:t.elementBufferSize[0],elementBufferH:t.elementBufferSize[1],contentRectUv:o,srcRectUv:s}};function Xn(e){this.data=e,this.pos=0}Xn.prototype.readByte=function(){return this.data[this.pos++]},Xn.prototype.peekByte=function(){return this.data[this.pos]},Xn.prototype.readBytes=function(e){return this.data.subarray(this.pos,this.pos+=e)},Xn.prototype.peekBytes=function(e){return this.data.subarray(this.pos,this.pos+e)},Xn.prototype.readString=function(e){for(var t=``,n=0;n<e;n++)t+=String.fromCharCode(this.readByte());return t},Xn.prototype.readBitArray=function(){for(var e=[],t=this.readByte(),n=7;n>=0;n--)e.push(!!(t&1<<n));return e},Xn.prototype.readUnsigned=function(e){var t=this.readBytes(2);return e?(t[1]<<8)+t[0]:(t[0]<<8)+t[1]};function Zn(e){this.stream=new Xn(e),this.output={}}Zn.prototype.parse=function(e){return this.parseParts(this.output,e),this.output},Zn.prototype.parseParts=function(e,t){for(var n=0;n<t.length;n++){var r=t[n];this.parsePart(e,r)}},Zn.prototype.parsePart=function(e,t){var n=t.label,r;if(!(t.requires&&!t.requires(this.stream,this.output,e)))if(t.loop){for(var i=[];t.loop(this.stream);){var a={};this.parseParts(a,t.parts),i.push(a)}e[n]=i}else t.parts?(r={},this.parseParts(r,t.parts),e[n]=r):t.parser?(r=t.parser(this.stream,this.output,e),t.skip||(e[n]=r)):t.bits&&(e[n]=this.parseBits(t.bits))};function Qn(e){return e.reduce(function(e,t){return e*2+t},0)}Zn.prototype.parseBits=function(e){var t={},n=this.stream.readBitArray();for(var r in e){var i=e[r];i.length?t[r]=Qn(n.slice(i.index,i.index+i.length)):t[r]=n[i.index]}return t};var L={readByte:function(){return function(e){return e.readByte()}},readBytes:function(e){return function(t){return t.readBytes(e)}},readString:function(e){return function(t){return t.readString(e)}},readUnsigned:function(e){return function(t){return t.readUnsigned(e)}},readArray:function(e,t){return function(n,r,i){for(var a=t(n,r,i),o=Array(a),s=0;s<a;s++)o[s]=n.readBytes(e);return o}}},$n={label:`blocks`,parser:function(e){for(var t=[],n=0,r=0,i=e.readByte();i!==r;i=e.readByte())t.push(e.readBytes(i)),n+=i;var a=new Uint8Array(n);n=0;for(var o=0;o<t.length;o++)a.set(t[o],n),n+=t[o].length;return a}},er={label:`gce`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===249},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`byteSize`,parser:L.readByte()},{label:`extras`,bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:`delay`,parser:L.readUnsigned(!0)},{label:`transparentColorIndex`,parser:L.readByte()},{label:`terminator`,parser:L.readByte(),skip:!0}]},tr={label:`image`,requires:function(e){return e.peekByte()===44},parts:[{label:`code`,parser:L.readByte(),skip:!0},{label:`descriptor`,parts:[{label:`left`,parser:L.readUnsigned(!0)},{label:`top`,parser:L.readUnsigned(!0)},{label:`width`,parser:L.readUnsigned(!0)},{label:`height`,parser:L.readUnsigned(!0)},{label:`lct`,bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:`lct`,requires:function(e,t,n){return n.descriptor.lct.exists},parser:L.readArray(3,function(e,t,n){return 2**(n.descriptor.lct.size+1)})},{label:`data`,parts:[{label:`minCodeSize`,parser:L.readByte()},$n]}]},nr={label:`text`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===1},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`blockSize`,parser:L.readByte()},{label:`preData`,parser:function(e,t,n){return e.readBytes(n.text.blockSize)}},$n]},rr={label:`frames`,parts:[er,{label:`application`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===255},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`blockSize`,parser:L.readByte()},{label:`id`,parser:function(e,t,n){return e.readString(n.blockSize)}},$n]},{label:`comment`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===254},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},$n]},tr,nr],loop:function(e){var t=e.peekByte();return t===33||t===44}},ir=[{label:`header`,parts:[{label:`signature`,parser:L.readString(3)},{label:`version`,parser:L.readString(3)}]},{label:`lsd`,parts:[{label:`width`,parser:L.readUnsigned(!0)},{label:`height`,parser:L.readUnsigned(!0)},{label:`gct`,bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:`backgroundColorIndex`,parser:L.readByte()},{label:`pixelAspectRatio`,parser:L.readByte()}]},{label:`gct`,requires:function(e,t){return t.lsd.gct.exists},parser:L.readArray(3,function(e,t){return 2**(t.lsd.gct.size+1)})},rr];function ar(e){var t=new Zn(new Uint8Array(e));this.raw=t.parse(ir),this.raw.hasImages=!1;for(var n=0;n<this.raw.frames.length;n++)if(this.raw.frames[n].image){this.raw.hasImages=!0;break}}ar.prototype.decompressFrame=function(e,t){if(e>=this.raw.frames.length)return null;var n=this.raw.frames[e];if(n.image){var r=n.image.descriptor.width*n.image.descriptor.height,i=o(n.image.data.minCodeSize,n.image.data.blocks,r);n.image.descriptor.lct.interlaced&&(i=s(i,n.image.descriptor.width));var a={pixels:i,dims:{top:n.image.descriptor.top,left:n.image.descriptor.left,width:n.image.descriptor.width,height:n.image.descriptor.height}};return n.image.descriptor.lct&&n.image.descriptor.lct.exists?a.colorTable=n.image.lct:a.colorTable=this.raw.gct,n.gce&&(a.delay=(n.gce.delay||10)*10,a.disposalType=n.gce.extras.disposal,n.gce.extras.transparentColorGiven&&(a.transparentIndex=n.gce.transparentColorIndex)),t&&(a.patch=c(a)),a}return null;function o(e,t,n){var r=4096,i=-1,a=n,o,s,c,l,u,d,f,p,m,h,ee,te,g,_,v,ne,re=Array(n),ie=Array(r),ae=Array(r),y=Array(r+1);for(te=e,s=1<<te,u=s+1,o=s+2,f=i,l=te+1,c=(1<<l)-1,m=0;m<s;m++)ie[m]=0,ae[m]=m;for(ee=p=g=_=ne=v=0,h=0;h<a;){if(_===0){if(p<l){ee+=t[v]<<p,p+=8,v++;continue}if(m=ee&c,ee>>=l,p-=l,m>o||m==u)break;if(m==s){l=te+1,c=(1<<l)-1,o=s+2,f=i;continue}if(f==i){y[_++]=ae[m],f=m,g=m;continue}for(d=m,m==o&&(y[_++]=g,m=f);m>s;)y[_++]=ae[m],m=ie[m];g=ae[m]&255,y[_++]=g,o<r&&(ie[o]=f,ae[o]=g,o++,(o&c)===0&&o<r&&(l++,c+=o)),f=d}_--,re[ne++]=y[_],h++}for(h=ne;h<a;h++)re[h]=0;return re}function s(e,t){for(var n=Array(e.length),r=e.length/t,i=function(r,i){var a=e.slice(i*t,(i+1)*t);n.splice.apply(n,[r*t,t].concat(a))},a=[0,4,2,1],o=[8,8,4,2],s=0,c=0;c<4;c++)for(var l=a[c];l<r;l+=o[c])i(l,s),s++;return n}function c(e){for(var t=e.pixels.length,n=new Uint8ClampedArray(t*4),r=0;r<t;r++){var i=r*4,a=e.pixels[r],o=e.colorTable[a];n[i]=o[0],n[i+1]=o[1],n[i+2]=o[2],n[i+3]=a===e.transparentIndex?0:255}return n}},ar.prototype.decompressFrames=function(e,t,n){t===void 0&&(t=0),n=n===void 0?this.raw.frames.length:Math.min(n,this.raw.frames.length);for(var r=[],i=t;i<n;i++)this.raw.frames[i].image&&r.push(this.decompressFrame(i,e));return r};var or=ar,sr=class e{static async create(t,n){let r=await fetch(t).then(e=>e.arrayBuffer()).then(e=>new or(e)),i=r.decompressFrames(!0,void 0,void 0),{width:a,height:o}=r.raw.lsd;return new e(i,a,o,n)}constructor(e,t,n,r){this.frames=[],this.index=0,this.playTime=0,this.frames=e,this.canvas=document.createElement(`canvas`),this.ctx=this.canvas.getContext(`2d`),this.pixelRatio=r,this.canvas.width=t,this.canvas.height=n,this.startTime=Date.now()}getCanvas(){return this.canvas}update(){let e=Date.now()-this.startTime;for(;this.playTime<e;){let e=this.frames[this.index%this.frames.length];this.playTime+=e.delay,this.index++}let t=this.frames[this.index%this.frames.length],n=new ImageData(t.patch,t.dims.width,t.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(n,t.dims.left,t.dims.top)}},cr=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},lr,ur,dr,fr,pr,mr=class{constructor(e,t=!1){this.isContextLost=!1,lr.set(this,new Set),ur.set(this,new Set),dr.set(this,new Set),fr.set(this,e=>{e.preventDefault(),this.isContextLost=!0;for(let e of cr(this,ur,`f`))e()}),pr.set(this,()=>{this.isContextLost=!1;let e=this.gl;e.getExtension(`EXT_color_buffer_float`),e.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!e.getExtension(`EXT_float_blend`);for(let e of cr(this,lr,`f`))e.restore();for(let e of cr(this,dr,`f`))e()});let n=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:t});if(!n)throw Error(`[VFX-JS] WebGL2 is not available.`);this.gl=n,this.canvas=e,n.getExtension(`EXT_color_buffer_float`),n.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!n.getExtension(`EXT_float_blend`),this.floatLinearFilter=!!n.getExtension(`OES_texture_float_linear`),this.maxTextureSize=n.getParameter(n.MAX_TEXTURE_SIZE),e.addEventListener(`webglcontextlost`,cr(this,fr,`f`),!1),e.addEventListener(`webglcontextrestored`,cr(this,pr,`f`),!1)}setSize(e,t,n){let r=Math.floor(e*n),i=Math.floor(t*n);(this.canvas.width!==r||this.canvas.height!==i)&&(this.canvas.width=r,this.canvas.height=i)}addResource(e){cr(this,lr,`f`).add(e)}removeResource(e){cr(this,lr,`f`).delete(e)}onContextLost(e){return cr(this,ur,`f`).add(e),()=>cr(this,ur,`f`).delete(e)}onContextRestored(e){return cr(this,dr,`f`).add(e),()=>cr(this,dr,`f`).delete(e)}};lr=new WeakMap,ur=new WeakMap,dr=new WeakMap,fr=new WeakMap,pr=new WeakMap;var hr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},gr=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},_r,vr,yr,br,xr=class{constructor(e){_r.add(this),vr.set(this,void 0),yr.set(this,void 0),hr(this,vr,e,`f`),this.gl=e.gl,gr(this,_r,`m`,br).call(this),e.addResource(this)}restore(){gr(this,_r,`m`,br).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){gr(this,vr,`f`).removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(gr(this,yr,`f`))}};vr=new WeakMap,yr=new WeakMap,_r=new WeakSet,br=function(){let e=this.gl,t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw Error(`[VFX-JS] Failed to create quad VAO`);this.vao=t,hr(this,yr,n,`f`);let r=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)};function Sr(e,t,n,r={}){return new je(e,t,n,{float:r.float??!1})}function Cr(n,r){let i=r.renderingToBuffer??!1,a;a=i?`none`:r.premultipliedAlpha?`premultiplied`:`normal`;let o=r.glslVersion??Qe(r.fragmentShader);return new at(n,r.vertexShader??(o===`100`?t:e),r.fragmentShader,r.uniforms,a,o)}var wr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},R=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},z,Tr,Er,Dr,Or,kr,Ar=class{constructor(e,t,n,r,i,a,o,s){if(z.set(this,void 0),Tr.set(this,void 0),Er.set(this,void 0),Dr.set(this,void 0),Or.set(this,void 0),kr.set(this,void 0),wr(this,Dr,r??!1,`f`),wr(this,Or,i??!1,`f`),wr(this,kr,a,`f`),wr(this,Tr,{},`f`),wr(this,z,{src:{value:null},offset:{value:new Ve},resolution:{value:new Ve},viewport:{value:new He},time:{value:0},mouse:{value:new Ve},passIndex:{value:0}},`f`),n)for(let[e,t]of Object.entries(n))typeof t==`function`?(R(this,Tr,`f`)[e]=t,R(this,z,`f`)[e]={value:t()}):R(this,z,`f`)[e]={value:t};this.pass=Cr(e,{fragmentShader:t,uniforms:R(this,z,`f`),renderingToBuffer:o??!1,premultipliedAlpha:!0,glslVersion:s})}get uniforms(){return R(this,z,`f`)}setUniforms(e,t,n,r,i,a){R(this,z,`f`).src.value=e,R(this,z,`f`).resolution.value.set(n.w*t,n.h*t),R(this,z,`f`).offset.value.set(n.x*t,n.y*t),R(this,z,`f`).time.value=r,R(this,z,`f`).mouse.value.set(i*t,a*t)}updateCustomUniforms(e){for(let[e,t]of Object.entries(R(this,Tr,`f`)))R(this,z,`f`)[e]&&(R(this,z,`f`)[e].value=t());if(e)for(let[t,n]of Object.entries(e))R(this,z,`f`)[t]&&(R(this,z,`f`)[t].value=n())}initializeBackbuffer(e,t,n,r){R(this,Dr,`f`)&&!R(this,Er,`f`)&&(R(this,kr,`f`)?wr(this,Er,new Be(e,R(this,kr,`f`)[0],R(this,kr,`f`)[1],1,R(this,Or,`f`)),`f`):wr(this,Er,new Be(e,t,n,r,R(this,Or,`f`)),`f`))}resizeBackbuffer(e,t){R(this,Er,`f`)&&!R(this,kr,`f`)&&R(this,Er,`f`).resize(e,t)}registerBufferUniform(e){R(this,z,`f`)[e]||(R(this,z,`f`)[e]={value:null})}get backbuffer(){return R(this,Er,`f`)}get persistent(){return R(this,Dr,`f`)}get float(){return R(this,Or,`f`)}get size(){return R(this,kr,`f`)}dispose(){this.pass.dispose(),R(this,Er,`f`)?.dispose()}};z=new WeakMap,Tr=new WeakMap,Er=new WeakMap,Dr=new WeakMap,Or=new WeakMap,kr=new WeakMap;var jr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Mr=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Nr,Pr,Fr=class{constructor(e){Nr.set(this,void 0),Pr.set(this,new Map),jr(this,Nr,e,`f`)}get(e,t,n){let r=`${t}\0${e}\0${n??``}`,i=Mr(this,Pr,`f`).get(r);return i||(i=new $e(Mr(this,Nr,`f`),e,t,n),Mr(this,Pr,`f`).set(r,i)),i}get size(){return Mr(this,Pr,`f`).size}dispose(){for(let e of Mr(this,Pr,`f`).values())e.dispose();Mr(this,Pr,`f`).clear()}};Nr=new WeakMap,Pr=new WeakMap;var B=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},V=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},H,Ir,Lr,U,Rr,zr,Br,W,G,K,Vr,q,Hr,Ur,Wr,Gr,Kr,qr,J,Y,Jr,Yr,Xr,Zr,X,Qr,$r,ei,ti,ni,ri,ii,ai,oi,si,ci,li,ui,di,fi,pi,mi,hi,gi,_i,vi,Z,yi,bi,xi,Si,Ci,wi,Ti=new Map,Ei=class{constructor(e,t){H.add(this),Ir.set(this,void 0),Lr.set(this,void 0),U.set(this,void 0),Rr.set(this,void 0),zr.set(this,void 0),Br.set(this,void 0),W.set(this,void 0),G.set(this,[]),K.set(this,void 0),Vr.set(this,new Map),q.set(this,null),Hr.set(this,!1),Ur.set(this,new WeakSet),Wr.set(this,{}),Gr.set(this,{}),Kr.set(this,0),qr.set(this,void 0),J.set(this,2),Y.set(this,[]),Jr.set(this,0),Yr.set(this,1),Xr.set(this,Date.now()/1e3),Zr.set(this,!1),X.set(this,xn(0)),Qr.set(this,xn(0)),$r.set(this,[0,0]),ei.set(this,0),ti.set(this,0),ni.set(this,0),ri.set(this,0),ii.set(this,new WeakMap),oi.set(this,async()=>{if(typeof window<`u`){for(let e of V(this,Y,`f`))if(e.type===`text`&&e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await V(this,H,`m`,ci).call(this,e),e.width=n,e.height=r)}for(let e of V(this,Y,`f`))if(e.type===`text`&&!e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await V(this,H,`m`,ci).call(this,e),e.width=n,e.height=r)}}}),si.set(this,e=>{typeof window<`u`&&(B(this,ni,e.clientX,`f`),B(this,ri,window.innerHeight-e.clientY,`f`))}),di.set(this,()=>{this.isPlaying()&&(this.render(),B(this,qr,requestAnimationFrame(V(this,di,`f`)),`f`))}),B(this,Ir,e,`f`),B(this,Lr,t,`f`),B(this,U,new mr(t,e.preserveDrawingBuffer),`f`),B(this,Rr,V(this,U,`f`).gl,`f`),V(this,Rr,`f`).clearColor(0,0,0,0),B(this,J,e.pixelRatio,`f`),B(this,Yr,e.timeScale,`f`),B(this,Xr,Date.now()/1e3,`f`),B(this,zr,new xr(V(this,U,`f`)),`f`),B(this,Br,new Fr(V(this,U,`f`)),`f`),typeof window<`u`&&(window.addEventListener(`resize`,V(this,oi,`f`)),window.addEventListener(`pointermove`,V(this,si,`f`))),V(this,oi,`f`).call(this),B(this,W,new ct(V(this,U,`f`)),`f`),V(this,H,`m`,bi).call(this,e.postEffects),V(this,U,`f`).onContextRestored(()=>{V(this,Rr,`f`).clearColor(0,0,0,0)})}destroy(){this.stop(),typeof window<`u`&&(window.removeEventListener(`resize`,V(this,oi,`f`)),window.removeEventListener(`pointermove`,V(this,si,`f`))),V(this,K,`f`)?.dispose();for(let e of V(this,Vr,`f`).values())e?.dispose();for(let e of V(this,G,`f`))e.pass.dispose();V(this,q,`f`)&&(V(this,q,`f`).dispose(),B(this,q,null,`f`),B(this,Hr,!1,`f`)),V(this,W,`f`).dispose(),V(this,Br,`f`).dispose(),V(this,zr,`f`).dispose()}async addElement(e,t={},n){if(t.effect!==void 0)return V(this,H,`m`,li).call(this,e,t,t.effect,n);let r=V(this,H,`m`,ui).call(this,t),i=e.getBoundingClientRect(),a=Ii(e)?Cn(i):Sn(i),[s,c]=ki(t.overflow),l=wn(a,c),u=ji(t.intersection),d=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),p,m,h=!1;if(e instanceof HTMLImageElement){m=`img`;let t=f(e);if(h=!!t.match(/\.gif/i),h){let n=await sr.create(t,V(this,J,`f`));Ti.set(e,n),p=new b(V(this,U,`f`),n.getCanvas())}else{let e=await Te(t);p=new b(V(this,U,`f`),e)}}else if(e instanceof HTMLVideoElement)p=new b(V(this,U,`f`),e),m=`video`;else if(e instanceof HTMLCanvasElement)o(e)&&n?(p=new b(V(this,U,`f`),n),m=`hic`):(p=new b(V(this,U,`f`),e),m=`canvas`);else{let t=await ut(e,d,void 0,this.maxTextureSize);p=new b(V(this,U,`f`),t),m=`text`}let[ee,te]=Pi(t.wrap);p.wrapS=ee,p.wrapT=te,p.needsUpdate=!0;let g=t.autoCrop??!0;if(m!==`hic`&&t.overlay!==!0)if(typeof t.overlay==`number`)e.style.setProperty(`opacity`,t.overlay.toString());else{let t=m===`video`?`0.0001`:`0`;e.style.setProperty(`opacity`,t.toString())}let _={src:{value:p},resolution:{value:new Ve},offset:{value:new Ve},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},mouse:{value:new Ve},intersection:{value:0},viewport:{value:new He},autoCrop:{value:g}},v={};if(t.uniforms!==void 0)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(_[e]={value:n()},v[e]=n):_[e]={value:n};let ne;t.backbuffer&&(ne=(()=>{let e=(l.right-l.left)*V(this,J,`f`),t=(l.bottom-l.top)*V(this,J,`f`);return new Be(V(this,U,`f`),e,t,V(this,J,`f`),!1)})(),_.backbuffer={value:ne.texture});let re=new Map,ie=new Map;for(let e=0;e<r.length-1;e++){let t=r[e].target??`pass${e}`;r[e]={...r[e],target:t};let n=r[e].size,i=n?n[0]:(l.right-l.left)*V(this,J,`f`),a=n?n[1]:(l.bottom-l.top)*V(this,J,`f`);if(r[e].persistent){let i=n?1:V(this,J,`f`),a=n?n[0]:l.right-l.left,o=n?n[1]:l.bottom-l.top;ie.set(t,new Be(V(this,U,`f`),a,o,i,r[e].float))}else re.set(t,Sr(V(this,U,`f`),i,a,{float:r[e].float}))}let ae=[];for(let e=0;e<r.length;e++){let t=r[e],n=t.frag,i={..._},a={};for(let[e,r]of re)e!==t.target&&n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:r.texture});for(let[e,t]of ie)n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:t.texture});if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(i[e]={value:n()},a[e]=n):i[e]={value:n};let o=Cr(V(this,U,`f`),{vertexShader:t.vert,fragmentShader:n,uniforms:i,renderingToBuffer:t.target!==void 0,glslVersion:t.glslVersion});ae.push({pass:o,uniforms:i,uniformGenerators:{...v,...a},target:t.target,persistent:t.persistent,float:t.float,size:t.size,backbuffer:t.target?ie.get(t.target):void 0})}let y=V(this,Jr,`f`),oe={type:m,element:e,isInViewport:!1,isInLogicalViewport:!1,width:a.right-a.left,height:a.bottom-a.top,passes:ae,bufferTargets:re,startTime:y,enterTime:y,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:s,overflow:c,intersection:u,originalOpacity:d,srcTexture:p,zIndex:t.zIndex??0,backbuffer:ne,autoCrop:g};V(this,H,`m`,_i).call(this,oe,a,y),V(this,Y,`f`).push(oe),V(this,Y,`f`).sort((e,t)=>e.zIndex-t.zIndex)}async updateElementEffects(e,t){let n=V(this,Y,`f`).find(t=>t.element===e);if(!n)throw Error(`[VFX-JS] updateElementEffects: element not registered`);if(!n.chain)throw Error(`[VFX-JS] updateElementEffects: element is on the shader path; effect-only updates are not supported`);let r=Array.isArray(t)?[...t]:[t],i=n.chain.effects,a=new Set(i),o=[];for(let e of r)if(!a.has(e)){if(V(this,Ur,`f`).has(e))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");o.push(e)}await n.chain.replaceEffects(r);let s=new Set(r);for(let e of i)s.has(e)||V(this,Ur,`f`).delete(e);for(let e of o)V(this,Ur,`f`).add(e)}removeElement(e){let t=V(this,Y,`f`).findIndex(t=>t.element===e);if(t!==-1){let n=V(this,Y,`f`).splice(t,1)[0];if(n.chain)V(this,H,`m`,hi).call(this,n.chain.effects),n.chain.dispose();else{for(let e of n.bufferTargets.values())e.dispose();for(let e of n.passes)e.pass.dispose(),e.backbuffer?.dispose();n.backbuffer?.dispose()}n.srcTexture.dispose(),e.style.setProperty(`opacity`,n.originalOpacity.toString())}}updateTextElement(e){let t=V(this,Y,`f`).findIndex(t=>t.element===e);return t===-1?Promise.resolve():V(this,H,`m`,ci).call(this,V(this,Y,`f`)[t])}async updateImageElement(e){let t=V(this,Y,`f`).find(t=>t.element===e);if(!t||t.type!==`img`||t.isGif)return;let n=await Te(f(e)),r=t.srcTexture,i=new b(V(this,U,`f`),n);i.wrapS=r.wrapS,i.wrapT=r.wrapT,i.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=i),t.srcTexture=i,r.dispose()}updateCanvasElement(e){let t=V(this,Y,`f`).find(t=>t.element===e);if(t){let n=t.srcTexture,r=new b(V(this,U,`f`),e);r.wrapS=n.wrapS,r.wrapT=n.wrapT,r.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=r),t.srcTexture=r,n.dispose()}}updateHICTexture(e,t){let n=V(this,Y,`f`).find(t=>t.element===e);if(!n||n.type!==`hic`)return;let r=n.srcTexture;if(r.source===t)r.needsUpdate=!0;else{let e=new b(V(this,U,`f`),t);e.wrapS=r.wrapS,e.wrapT=r.wrapT,e.needsUpdate=!0,!n.chain&&n.passes.length>0&&(n.passes[0].uniforms.src.value=e),n.srcTexture=e,r.dispose()}}get maxTextureSize(){return V(this,U,`f`).maxTextureSize}isPlaying(){return V(this,qr,`f`)!==void 0}play(){this.isPlaying()||(B(this,Xr,Date.now()/1e3,`f`),B(this,qr,requestAnimationFrame(V(this,di,`f`)),`f`))}get time(){return V(this,Jr,`f`)}setTime(e){B(this,Jr,e,`f`),B(this,Zr,!0,`f`)}get timeScale(){return V(this,Yr,`f`)}set timeScale(e){B(this,Yr,e,`f`)}stop(){V(this,qr,`f`)!==void 0&&(cancelAnimationFrame(V(this,qr,`f`)),B(this,qr,void 0,`f`))}render(){let e=Date.now()/1e3;V(this,Zr,`f`)?B(this,Zr,!1,`f`):B(this,Jr,V(this,Jr,`f`)+(e-V(this,Xr,`f`))*V(this,Yr,`f`),`f`),B(this,Xr,e,`f`);let t=V(this,Jr,`f`),n=V(this,Rr,`f`);V(this,H,`m`,ai).call(this),n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,V(this,Lr,`f`).width,V(this,Lr,`f`).height),n.clear(n.COLOR_BUFFER_BIT);let r=V(this,X,`f`).right-V(this,X,`f`).left,i=V(this,X,`f`).bottom-V(this,X,`f`).top,a=Pe(0,0,r,i),o=V(this,H,`m`,pi).call(this);o&&(V(this,H,`m`,wi).call(this,r,i),V(this,K,`f`)&&(n.bindFramebuffer(n.FRAMEBUFFER,V(this,K,`f`).fbo),n.clear(n.COLOR_BUFFER_BIT),n.bindFramebuffer(n.FRAMEBUFFER,null)));for(let e of V(this,Y,`f`)){let n=e.element.getBoundingClientRect(),s=e.type===`text`?Cn(n):Sn(n),c=V(this,H,`m`,_i).call(this,e,s,t);if(!c.isVisible)continue;if(e.chain){V(this,H,`m`,fi).call(this,e,s,c,t);continue}let l=e.passes[0].uniforms;l.time.value=t-e.startTime,l.resolution.value.set((s.right-s.left)*V(this,J,`f`),(s.bottom-s.top)*V(this,J,`f`)),l.mouse.value.set((V(this,ni,`f`)+V(this,ei,`f`))*V(this,J,`f`),(V(this,ri,`f`)+V(this,ti,`f`))*V(this,J,`f`));for(let t of e.passes)for(let[e,n]of Object.entries(t.uniformGenerators))t.uniforms[e].value=n();Ti.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(l.src.value.needsUpdate=!0);let u=Ne(s,i,V(this,ei,`f`),V(this,ti,`f`)),d=Ne(c.rectWithOverflow,i,V(this,ei,`f`),V(this,ti,`f`));e.backbuffer&&(e.passes[0].uniforms.backbuffer.value=e.backbuffer.texture);{let t=e.isFullScreen?a:d,n=Math.max(1,t.w*V(this,J,`f`)),r=Math.max(1,t.h*V(this,J,`f`)),i=Math.max(1,t.w),o=Math.max(1,t.h);for(let t=0;t<e.passes.length-1;t++){let a=e.passes[t];if(!a.size)if(a.backbuffer)a.backbuffer.resize(i,o);else{let t=e.bufferTargets.get(a.target);t&&(t.width!==n||t.height!==r)&&t.setSize(n,r)}}}let f=new Map;for(let t of e.passes)t.backbuffer&&t.target&&f.set(t.target,t.backbuffer.texture);let p=e.srcTexture;for(let t=0;t<e.passes.length-1;t++){let r=e.passes[t],i=e.isFullScreen?a:d;r.uniforms.src.value=p;for(let[e,t]of f)r.uniforms[e]&&(r.uniforms[e].value=t);for(let[e,t]of Object.entries(r.uniformGenerators))r.uniforms[e]&&(r.uniforms[e].value=t());let o=r.size?Pe(0,0,r.size[0],r.size[1]):Pe(0,0,i.w,i.h),s=Ai(n,u,i,r.size,[V(this,ni,`f`),V(this,ri,`f`)],[V(this,ei,`f`),V(this,ti,`f`)],V(this,J,`f`));if(r.uniforms.resolution.value.set(...s.resolution),r.uniforms.offset.value.set(...s.offset),r.uniforms.mouse.value.set(...s.mouse),r.backbuffer)V(this,H,`m`,Z).call(this,r.pass,r.backbuffer.target,o,r.uniforms,!0),r.backbuffer.swap(),p=r.backbuffer.texture;else{let t=e.bufferTargets.get(r.target);if(!t)continue;V(this,H,`m`,Z).call(this,r.pass,t,o,r.uniforms,!0),p=t.texture}r.target&&f.set(r.target,p)}let m=e.passes[e.passes.length-1];m.uniforms.src.value=p,m.uniforms.resolution.value.set(n.width*V(this,J,`f`),n.height*V(this,J,`f`)),m.uniforms.offset.value.set(u.x*V(this,J,`f`),u.y*V(this,J,`f`)),m.uniforms.mouse.value.set((V(this,ni,`f`)+V(this,ei,`f`))*V(this,J,`f`),(V(this,ri,`f`)+V(this,ti,`f`))*V(this,J,`f`));for(let[e,t]of f)m.uniforms[e]&&(m.uniforms[e].value=t);for(let[e,t]of Object.entries(m.uniformGenerators))m.uniforms[e]&&(m.uniforms[e].value=t());e.backbuffer?(m.uniforms.backbuffer.value=e.backbuffer.texture,e.isFullScreen?(e.backbuffer.resize(r,i),V(this,H,`m`,yi).call(this,e,u.x,u.y),V(this,H,`m`,Z).call(this,m.pass,e.backbuffer.target,a,m.uniforms,!0),e.backbuffer.swap(),V(this,W,`f`).setUniforms(e.backbuffer.texture,V(this,J,`f`),a),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,o&&V(this,K,`f`)||null,a,V(this,W,`f`).uniforms,!1)):(e.backbuffer.resize(d.w,d.h),V(this,H,`m`,yi).call(this,e,e.overflow.left,e.overflow.bottom),V(this,H,`m`,Z).call(this,m.pass,e.backbuffer.target,e.backbuffer.getViewport(),m.uniforms,!0),e.backbuffer.swap(),V(this,W,`f`).setUniforms(e.backbuffer.texture,V(this,J,`f`),d),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,o&&V(this,K,`f`)||null,d,V(this,W,`f`).uniforms,!1))):(V(this,H,`m`,yi).call(this,e,u.x,u.y),V(this,H,`m`,Z).call(this,m.pass,o&&V(this,K,`f`)||null,e.isFullScreen?a:d,m.uniforms,!1))}o&&V(this,K,`f`)&&(V(this,q,`f`)&&V(this,Hr,`f`)?V(this,H,`m`,Si).call(this,a,t):V(this,H,`m`,Ci).call(this,a,t))}};Ir=new WeakMap,Lr=new WeakMap,U=new WeakMap,Rr=new WeakMap,zr=new WeakMap,Br=new WeakMap,W=new WeakMap,G=new WeakMap,K=new WeakMap,Vr=new WeakMap,q=new WeakMap,Hr=new WeakMap,Ur=new WeakMap,Wr=new WeakMap,Gr=new WeakMap,Kr=new WeakMap,qr=new WeakMap,J=new WeakMap,Y=new WeakMap,Jr=new WeakMap,Yr=new WeakMap,Xr=new WeakMap,Zr=new WeakMap,X=new WeakMap,Qr=new WeakMap,$r=new WeakMap,ei=new WeakMap,ti=new WeakMap,ni=new WeakMap,ri=new WeakMap,ii=new WeakMap,oi=new WeakMap,si=new WeakMap,di=new WeakMap,H=new WeakSet,ai=function(){if(typeof window>`u`)return;let e=V(this,Lr,`f`).ownerDocument,t=e.compatMode===`BackCompat`?e.body:e.documentElement,n=t.clientWidth,r=t.clientHeight,i=window.scrollX,a=window.scrollY,o,s;if(V(this,Ir,`f`).fixedCanvas)o=0,s=0;else if(V(this,Ir,`f`).wrapper)o=n*V(this,Ir,`f`).scrollPadding[0],s=r*V(this,Ir,`f`).scrollPadding[1];else{let t=e.body.scrollWidth-(i+n),c=e.body.scrollHeight-(a+r);o=Fi(n*V(this,Ir,`f`).scrollPadding[0],0,t),s=Fi(r*V(this,Ir,`f`).scrollPadding[1],0,c)}let c=n+o*2,l=r+s*2;(c!==V(this,$r,`f`)[0]||l!==V(this,$r,`f`)[1])&&(V(this,Lr,`f`).style.width=`${c}px`,V(this,Lr,`f`).style.height=`${l}px`,V(this,U,`f`).setSize(c,l,V(this,J,`f`)),B(this,X,xn({top:-s,left:-o,right:n+o,bottom:r+s}),`f`),B(this,Qr,xn({top:0,left:0,right:n,bottom:r}),`f`),B(this,$r,[c,l],`f`),B(this,ei,o,`f`),B(this,ti,s,`f`)),V(this,Ir,`f`).fixedCanvas||V(this,Lr,`f`).style.setProperty(`transform`,`translate(${i-o}px, ${a-s}px)`)},ci=async function(e){if(!V(this,ii,`f`).get(e.element)){V(this,ii,`f`).set(e.element,!0);try{let t=e.srcTexture,n=t.source instanceof OffscreenCanvas?t.source:void 0,r=await ut(e.element,e.originalOpacity,n,this.maxTextureSize);if(r.width===0||r.height===0)return;let i=new b(V(this,U,`f`),r);i.wrapS=t.wrapS,i.wrapT=t.wrapT,i.needsUpdate=!0,!e.chain&&e.passes.length>0&&(e.passes[0].uniforms.src.value=i),e.srcTexture=i,t.dispose()}catch(e){console.error(e)}finally{V(this,ii,`f`).set(e.element,!1)}}},li=async function(e,t,n,r){t.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified; `effect` takes precedence."),t.overflow!==void 0&&console.warn("[VFX-JS] `overflow` is shader-path only and is ignored by the effect path. Use each effect's own `outputRect` (with `dims.canvasRect` for fullscreen) to control its dst rect.");let i=Array.isArray(n)?[...n]:[n];V(this,H,`m`,mi).call(this,i);let a=e.getBoundingClientRect(),s=Ii(e)?Cn(a):Sn(a),[c,l]=ki(t.overflow),u=ji(t.intersection),d=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),p,m,h=!1;if(e instanceof HTMLImageElement){m=`img`;let t=f(e);if(h=!!t.match(/\.gif/i),h){let n=await sr.create(t,V(this,J,`f`));Ti.set(e,n),p=new b(V(this,U,`f`),n.getCanvas())}else{let e=await Te(t);p=new b(V(this,U,`f`),e)}}else if(e instanceof HTMLVideoElement)p=new b(V(this,U,`f`),e),m=`video`;else if(e instanceof HTMLCanvasElement)o(e)&&r?(p=new b(V(this,U,`f`),r),m=`hic`):(p=new b(V(this,U,`f`),e),m=`canvas`);else{let t=await ut(e,d,void 0,this.maxTextureSize);p=new b(V(this,U,`f`),t),m=`text`}let[ee,te]=Pi(t.wrap);p.wrapS=ee,p.wrapT=te,p.needsUpdate=!0;let g=t.autoCrop??!0;if(m!==`hic`&&t.overlay!==!0)if(typeof t.overlay==`number`)e.style.setProperty(`opacity`,t.overlay.toString());else{let t=m===`video`?`0.0001`:`0`;e.style.setProperty(`opacity`,t.toString())}let _=V(this,Jr,`f`),v={type:m,element:e,isInViewport:!1,isInLogicalViewport:!1,width:s.right-s.left,height:s.bottom-s.top,passes:[],bufferTargets:new Map,startTime:_,enterTime:_,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:c,overflow:l,intersection:u,originalOpacity:d,srcTexture:p,zIndex:t.zIndex??0,backbuffer:void 0,autoCrop:g,effectLastRenderTime:_},ne=hn(()=>v.srcTexture,()=>Mi(v.srcTexture,`w`),()=>Mi(v.srcTexture,`h`)),re={},ie={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(ie[e]=n,re[e]=n()):re[e]=n;v.effectUniformGenerators=ie,v.effectStaticUniforms=re;let ae={autoCrop:g,glslVersion:t.glslVersion??`300 es`},y=new Yn(V(this,U,`f`),V(this,zr,`f`),V(this,J,`f`),i,ae,ne,!1,V(this,Br,`f`));try{await y.initAll()}catch(t){throw V(this,H,`m`,hi).call(this,i),p.dispose(),e.style.setProperty(`opacity`,d.toString()),t}v.chain=y,V(this,H,`m`,_i).call(this,v,s,_),V(this,Y,`f`).push(v),V(this,Y,`f`).sort((e,t)=>e.zIndex-t.zIndex)},ui=function(e){let t=t=>t.glslVersion===void 0&&e.glslVersion!==void 0?{...t,glslVersion:e.glslVersion}:t;return Array.isArray(e.shader)?e.shader.map(t):[t({frag:V(this,H,`m`,vi).call(this,e.shader||`uvGradient`)})]},fi=function(e,t,n,r){let i=e.chain;if(!i)return;let a=V(this,J,`f`);Ti.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(e.srcTexture.needsUpdate=!0);let o={...e.effectStaticUniforms??{}};if(e.effectUniformGenerators)for(let[t,n]of Object.entries(e.effectUniformGenerators))o[t]=n();let s=V(this,X,`f`).right-V(this,X,`f`).left,c=V(this,X,`f`).bottom-V(this,X,`f`).top,l=Ne(t,c,V(this,ei,`f`),V(this,ti,`f`)),u=V(this,ni,`f`)+V(this,ei,`f`)-l.x,d=V(this,ri,`f`)+V(this,ti,`f`)-l.y,f=t.right-t.left,p=t.bottom-t.top,m=r-(e.effectLastRenderTime??r);e.effectLastRenderTime=r;let h=V(this,H,`m`,pi).call(this)&&V(this,K,`f`)?_n(V(this,K,`f`)):null;i.run({time:r-e.startTime,deltaTime:m,mouse:[u*a,d*a],mouseViewport:[V(this,ni,`f`)*a,V(this,ri,`f`)*a],intersection:n.intersection,enterTime:r-e.enterTime,leaveTime:r-e.leaveTime,resolvedUniforms:o,canvasSize:[s,c],canvasBufferSize:[s*a,c*a],elementSize:[f,p],elementBufferSize:[f*a,p*a],elementRectOnCanvasPx:{x:l.x*a,y:l.y*a,w:l.w*a,h:l.h*a},finalTarget:h,isVisible:n.isVisible})},pi=function(){return V(this,G,`f`).length>0||V(this,q,`f`)!==null&&V(this,Hr,`f`)},mi=function(e){for(let t of e)if(V(this,Ur,`f`).has(t))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");for(let t of e)V(this,Ur,`f`).add(t)},hi=function(e){for(let t of e)V(this,Ur,`f`).delete(t)},gi=function(e){let t=e.hitTestPadBuffer,n=V(this,J,`f`);return yn({top:t.top/n,right:t.right/n,bottom:t.bottom/n,left:t.left/n})},_i=function(e,t,n){let r=wn(t,e.chain?V(this,H,`m`,gi).call(this,e.chain):e.overflow),i=e.isFullScreen||Di(V(this,Qr,`f`),r),a=wn(V(this,Qr,`f`),e.intersection.rootMargin),o=Dn(a,t),s=e.isFullScreen||Oi(a,t,o,e.intersection.threshold);!e.isInLogicalViewport&&s&&(e.enterTime=n,e.leaveTime=1/0),e.isInLogicalViewport&&!s&&(e.leaveTime=n),e.isInViewport=i,e.isInLogicalViewport=s;let c=i&&n-e.leaveTime<=e.release;if(c&&!e.chain&&e.passes.length>0){let t=e.passes[0].uniforms;t.intersection.value=o,t.enterTime.value=n-e.enterTime,t.leaveTime.value=n-e.leaveTime}return{isVisible:c,intersection:o,rectWithOverflow:r}},vi=function(e){return e in a?a[e]:e},Z=function(e,t,n,r,i){let a=V(this,Rr,`f`);i&&t!==null&&t!==V(this,K,`f`)&&(a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.viewport(0,0,t.width,t.height),a.clear(a.COLOR_BUFFER_BIT));let o=r.viewport;o&&o.value instanceof He&&o.value.set(n.x*V(this,J,`f`),n.y*V(this,J,`f`),n.w*V(this,J,`f`),n.h*V(this,J,`f`));try{ot(a,V(this,zr,`f`),e,t,n,V(this,$r,`f`)[0],V(this,$r,`f`)[1],V(this,J,`f`))}catch(e){console.error(e)}},yi=function(e,t,n){let r=e.passes[0].uniforms.offset.value;r.x=t*V(this,J,`f`),r.y=n*V(this,J,`f`)},bi=function(e){let t=e.length===1&&!(`frag`in e[0])?e[0]:null;if(t&&t.effect!==void 0){V(this,H,`m`,xi).call(this,t,t.effect);return}let n=[],r=[];for(let t of e)`frag`in t&&r.push(t);for(let e=0;e<r.length-1;e++)r[e].target||(r[e]={...r[e],target:`pass${e}`});for(let t of e){let e,r,i;if(`frag`in t)e=t.frag,r=new Ar(V(this,U,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,t.size,t.target!==void 0,t.glslVersion),i=t.target;else{if(t.shader===void 0)throw Error("VFXPostEffect requires `shader` (the `effect` path is not implemented yet).");e=V(this,H,`m`,vi).call(this,t.shader),r=new Ar(V(this,U,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,void 0,!1,t.glslVersion),t.persistent&&r.registerBufferUniform(`backbuffer`),i=void 0}n.push(e);let a={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`&&(a[e]=n);V(this,G,`f`).push({pass:r,target:i,generators:a})}for(let e of r)e.target&&V(this,Vr,`f`).set(e.target,void 0);let i=V(this,G,`f`).map(e=>e.target).filter(e=>e!==void 0);for(let e=0;e<V(this,G,`f`).length;e++)for(let t of i)n[e].match(RegExp(`uniform\\s+sampler2D\\s+${t}\\b`))&&V(this,G,`f`)[e].pass.registerBufferUniform(t)},xi=function(e,t){e.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified on post-effect; `effect` takes precedence.");let n=Array.isArray(t)?[...t]:[t];V(this,H,`m`,mi).call(this,n);let r=hn(()=>{let e=V(this,K,`f`);if(!e)throw Error(`[VFX-JS] post-effect chain active without target`);return e.texture},()=>V(this,K,`f`)?.width??0,()=>V(this,K,`f`)?.height??0),i={autoCrop:!0,glslVersion:e.glslVersion??`300 es`},a=new Yn(V(this,U,`f`),V(this,zr,`f`),V(this,J,`f`),n,i,r,!0,V(this,Br,`f`));if(e.uniforms)for(let[t,n]of Object.entries(e.uniforms))typeof n==`function`?(V(this,Gr,`f`)[t]=n,V(this,Wr,`f`)[t]=n()):V(this,Wr,`f`)[t]=n;B(this,q,a,`f`),B(this,Kr,V(this,Jr,`f`),`f`),a.initAll().then(()=>{V(this,q,`f`)===a&&B(this,Hr,!0,`f`)}).catch(e=>{console.error(`[VFX-JS] Post-effect init failed; post-effect disabled:`,e),V(this,q,`f`)===a&&(V(this,H,`m`,hi).call(this,V(this,q,`f`).effects),V(this,q,`f`).dispose(),B(this,q,null,`f`),B(this,Hr,!1,`f`))})},Si=function(e,t){let n=V(this,q,`f`);if(!n)return;let r=V(this,J,`f`),i={...V(this,Wr,`f`)};for(let[e,t]of Object.entries(V(this,Gr,`f`)))i[e]=t();let a=V(this,X,`f`).right-V(this,X,`f`).left,o=V(this,X,`f`).bottom-V(this,X,`f`).top,s=t-V(this,Kr,`f`);B(this,Kr,t,`f`);let c=[a,o],l=[a*r,o*r],u={x:e.x*r,y:e.y*r,w:e.w*r,h:e.h*r};n.run({time:t,deltaTime:s,mouse:[V(this,ni,`f`)*r,V(this,ri,`f`)*r],mouseViewport:[V(this,ni,`f`)*r,V(this,ri,`f`)*r],intersection:1,enterTime:0,leaveTime:0,resolvedUniforms:i,canvasSize:c,canvasBufferSize:l,elementSize:c,elementBufferSize:l,elementRectOnCanvasPx:u,finalTarget:null,isVisible:!0})},Ci=function(e,t){if(!V(this,K,`f`))return;let n=V(this,K,`f`).texture,r=new Map;for(let{pass:e,target:t}of V(this,G,`f`))t&&e.backbuffer&&r.set(t,e.backbuffer.texture);for(let i=0;i<V(this,G,`f`).length;i++){let{pass:a,target:o,generators:s}=V(this,G,`f`)[i],c=i===V(this,G,`f`).length-1,l=V(this,ni,`f`)+V(this,ei,`f`),u=V(this,ri,`f`)+V(this,ti,`f`),d=a.size;if(d){let[r,i]=d;a.uniforms.src.value=n,a.uniforms.resolution.value.set(r,i),a.uniforms.offset.value.set(0,0),a.uniforms.time.value=t,a.uniforms.mouse.value.set(l/e.w*r,u/e.h*i)}else a.setUniforms(n,V(this,J,`f`),e,t,l,u);a.uniforms.passIndex.value=i,a.updateCustomUniforms(s);for(let[e,t]of r){let n=a.uniforms[e];n&&(n.value=t)}if(c)a.backbuffer?(a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture),V(this,H,`m`,Z).call(this,a.pass,a.backbuffer.target,e,a.uniforms,!0),a.backbuffer.swap(),V(this,W,`f`).setUniforms(a.backbuffer.texture,V(this,J,`f`),e),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,null,e,V(this,W,`f`).uniforms,!1)):V(this,H,`m`,Z).call(this,a.pass,null,e,a.uniforms,!1);else if(a.backbuffer){a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture);let t=d?Pe(0,0,d[0]/V(this,J,`f`),d[1]/V(this,J,`f`)):e;V(this,H,`m`,Z).call(this,a.pass,a.backbuffer.target,t,a.uniforms,!0),a.backbuffer.swap(),n=a.backbuffer.texture,o&&r.set(o,a.backbuffer.texture)}else{let t=o??`postEffect${i}`,s=V(this,Vr,`f`).get(t),c=d?d[0]:e.w*V(this,J,`f`),l=d?d[1]:e.h*V(this,J,`f`);(!s||s.width!==c||s.height!==l)&&(s?.dispose(),s=Sr(V(this,U,`f`),c,l,{float:a.float}),V(this,Vr,`f`).set(t,s));let u=d?Pe(0,0,d[0]/V(this,J,`f`),d[1]/V(this,J,`f`)):e;V(this,H,`m`,Z).call(this,a.pass,s,u,a.uniforms,!0),n=s.texture,o&&r.set(o,s.texture)}}},wi=function(e,t){let n=e*V(this,J,`f`),r=t*V(this,J,`f`);(!V(this,K,`f`)||V(this,K,`f`).width!==n||V(this,K,`f`).height!==r)&&(V(this,K,`f`)?.dispose(),B(this,K,Sr(V(this,U,`f`),n,r),`f`));for(let{pass:n}of V(this,G,`f`))n.persistent&&!n.backbuffer?n.initializeBackbuffer(V(this,U,`f`),e,t,V(this,J,`f`)):n.backbuffer&&n.resizeBackbuffer(e,t)};function Di(e,t){return t.left<=e.right&&t.right>=e.left&&t.top<=e.bottom&&t.bottom>=e.top}function Oi(e,t,n,r){return r===0?Di(e,t):n>=r}function ki(e){return e===!0?[!0,bn]:e===void 0?[!1,bn]:[!1,yn(e)]}function Ai(e,t,n,r,i,a,o){let s=i[0]+a[0]-n.x,c=i[1]+a[1]-n.y;return r?{resolution:[r[0],r[1]],offset:[0,0],mouse:[s/n.w*r[0],c/n.h*r[1]]}:{resolution:[e.width*o,e.height*o],offset:[(t.x-n.x)*o,(t.y-n.y)*o],mouse:[s*o,c*o]}}function ji(e){return{threshold:e?.threshold??0,rootMargin:yn(e?.rootMargin??0)}}function Mi(e,t){let n=e.source;if(!n)return 0;if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return t===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return t===`w`?n.videoWidth:n.videoHeight;let r=n;return t===`w`?r.width:r.height}function Ni(e){return e===`repeat`?`repeat`:e===`mirror`?`mirror`:`clamp`}function Pi(e){if(!e)return[`clamp`,`clamp`];if(Array.isArray(e))return[Ni(e[0]),Ni(e[1])];let t=Ni(e);return[t,t]}function Fi(e,t,n){return Math.max(t,Math.min(n,e))}function Ii(e){return!(e instanceof HTMLImageElement||e instanceof HTMLVideoElement||e instanceof HTMLCanvasElement)}function Li(){try{let e=document.createElement(`canvas`);return(e.getContext(`webgl2`)||e.getContext(`webgl`))!==null}catch{return!1}}var Ri=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Q=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},zi,$,Bi,Vi,Hi,Ui,Wi,Gi;function Ki(){if(typeof window>`u`)throw`Cannot find 'window'. VFX-JS only runs on the browser.`;if(typeof document>`u`)throw`Cannot find 'document'. VFX-JS only runs on the browser.`}function qi(e){return{position:e?`fixed`:`absolute`,top:0,left:0,width:`0px`,height:`0px`,"z-index":9999,"pointer-events":`none`}}var Ji=class e{static init(t){try{return new e(t)}catch{return null}}constructor(e={}){if(zi.add(this),$.set(this,void 0),Bi.set(this,void 0),Vi.set(this,new Map),Ki(),!Li())throw Error(`[VFX-JS] WebGL is not available in this environment.`);let t=fe(e),n=document.createElement(`canvas`),r=qi(t.fixedCanvas);for(let[e,t]of Object.entries(r))n.style.setProperty(e,t.toString());t.zIndex!==void 0&&n.style.setProperty(`z-index`,t.zIndex.toString()),(t.wrapper??document.body).appendChild(n),Ri(this,Bi,n,`f`),Ri(this,$,new Ei(t,n),`f`),t.autoplay&&Q(this,$,`f`).play()}async add(e,t,n){e instanceof HTMLImageElement?await Q(this,zi,`m`,Hi).call(this,e,t):e instanceof HTMLVideoElement?await Q(this,zi,`m`,Ui).call(this,e,t):e instanceof HTMLCanvasElement?o(e)&&n?await Q(this,$,`f`).addElement(e,t,n):await Q(this,zi,`m`,Wi).call(this,e,t):await Q(this,zi,`m`,Gi).call(this,e,t)}updateHICTexture(e,t){Q(this,$,`f`).updateHICTexture(e,t)}get maxTextureSize(){return Q(this,$,`f`).maxTextureSize}get canvas(){return Q(this,Bi,`f`)}async addHTML(e,t){if(!de())return console.warn(`html-in-canvas not supported, falling back to dom-to-canvas`),this.add(e,t);t.overlay!==void 0&&console.warn(`addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.`);let{overlay:n,...r}=t,i=Q(this,Vi,`f`).get(e);i&&Q(this,$,`f`).removeElement(i);let{canvas:a,initialCapture:o}=await ce(e,{onCapture:e=>{Q(this,$,`f`).updateHICTexture(a,e)},maxSize:Q(this,$,`f`).maxTextureSize});i=a,Q(this,Vi,`f`).set(e,i),await Q(this,$,`f`).addElement(i,r,o)}remove(e){let t=Q(this,Vi,`f`).get(e);t?(le(t,e),Q(this,Vi,`f`).delete(e),Q(this,$,`f`).removeElement(t)):Q(this,$,`f`).removeElement(e)}updateEffects(e,t){let n=Q(this,Vi,`f`).get(e)??e;return Q(this,$,`f`).updateElementEffects(n,t)}async update(e){let t=Q(this,Vi,`f`).get(e);if(t){t.requestPaint();return}if(e instanceof HTMLImageElement)return Q(this,$,`f`).updateImageElement(e);if(e instanceof HTMLCanvasElement){Q(this,$,`f`).updateCanvasElement(e);return}else return Q(this,$,`f`).updateTextElement(e)}play(){Q(this,$,`f`).play()}stop(){Q(this,$,`f`).stop()}render(){Q(this,$,`f`).render()}get time(){return Q(this,$,`f`).time}setTime(e){Q(this,$,`f`).setTime(e)}get timeScale(){return Q(this,$,`f`).timeScale}set timeScale(e){Q(this,$,`f`).timeScale=e}destroy(){for(let[e,t]of Q(this,Vi,`f`))le(t,e);Q(this,Vi,`f`).clear(),Q(this,$,`f`).destroy(),Q(this,Bi,`f`).remove()}};$=new WeakMap,Bi=new WeakMap,Vi=new WeakMap,zi=new WeakSet,Hi=function(e,t){return e.complete?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`load`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},Ui=function(e,t){return e.readyState>=3?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`canplay`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},Wi=function(e,t){return Q(this,$,`f`).addElement(e,t)},Gi=function(e,t){return Q(this,$,`f`).addElement(e,t)};export{Ji as t};
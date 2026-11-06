var e=`
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
`,t=`precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform bool autoCrop;
uniform sampler2D src;
out vec4 outColor;
`,n=`vec4 readTex(sampler2D tex, vec2 uv) {
    if (autoCrop && (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.)) {
        return vec4(0);
    }
    return texture(tex, uv);
}`,r={none:e,uvGradient:`
    ${t}
    ${n}

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        outColor = vec4(uv, sin(time) * .5 + .5, 1);

        vec4 img = readTex(src, uv);
        outColor *= smoothstep(0., 1., img.a);
    }
    `,rainbow:`
    ${t}
    ${n}

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
    ${t}
    ${n}

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
    ${t}
    ${n}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        float b = sin(time * 2.) * 32. + 48.;
        uv = floor(uv * b) / b;
        outColor = readTex(src, uv);
    }
    `,rgbGlitch:`
    ${t}
    ${n}

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
    ${t}
    ${n}

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

    ${t}
    ${n}

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
    ${t}
    ${n}

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
    ${t}
    ${n}

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
    ${t}
    ${n}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        outColor = readTex(src, uv) * (sin(time * 5.) * 0.2 + 0.8);
    }

    `,spring:`
    ${t}
    ${n}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        uv = (uv - .5) * (1.05 + sin(time * 5.) * 0.05) + .5;
        outColor = readTex(src, uv);
    }
    `,duotone:`
    ${t}
    ${n}

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
    ${t}
    ${n}

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
    ${t}
    ${n}

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
    ${t}
    uniform float enterTime;
    uniform float leaveTime;

    ${n}

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
    ${t}
    ${n}

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
    ${t}
    ${n}

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
    ${t}
    ${n}

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
    ${t}
    ${n}

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 color = readTex(src, uv);
        outColor = vec4(1.0 - color.rgb, color.a);
    }
    `,grayscale:`
    ${t}
    ${n}

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 color = readTex(src, uv);
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        outColor = vec4(vec3(gray), color.a);
    }
    `,vignette:`
    ${t}
    ${n}

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
    ${t}
    ${n}

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
    `};function i(e){return e.tagName===`CANVAS`&&(e.hasAttribute(`layoutsubtree`)||e.getAttribute(`content`)===`drawable`)}function a(e,t){e.setAttribute(`layoutsubtree`,``),e.setAttribute(`content`,`drawable`),t?.setAttribute(`drawable`,``)}function o(e,t,n,r){if(t.width<=0||t.height<=0)return null;let i=t.left-e.left,a=t.top-e.top;return i+t.width<=0||a+t.height<=0||i>=e.width||a>=e.height?null:[i*n,a*r,t.width*n,t.height*r]}function s(e){let t=e.getBoundingClientRect(),n=getComputedStyle(e),r=Number.parseFloat(n.paddingLeft)||0,i=Number.parseFloat(n.paddingRight)||0,a=Number.parseFloat(n.paddingTop)||0,o=Number.parseFloat(n.paddingBottom)||0,s=e.clientWidth>0?t.width/e.offsetWidth:1,c=e.clientHeight>0?t.height/e.offsetHeight:1;return{left:t.left+(e.clientLeft+r)*s,top:t.top+(e.clientTop+a)*c,width:Math.max(0,e.clientWidth-r-i)*s,height:Math.max(0,e.clientHeight-a-o)*c}}function c(e){return typeof e.checkVisibility==`function`?e.checkVisibility({visibilityProperty:!0,opacityProperty:!0}):getComputedStyle(e).visibility!==`hidden`}function l(e,t){let n=t.querySelectorAll(`canvas`);if(n.length===0)return;let r=t.getBoundingClientRect();if(r.width<=0||r.height<=0)return;let i=e.canvas.width/r.width,a=e.canvas.height/r.height;for(let t of n){if(t.width===0||t.height===0||!c(t))continue;let n=o(r,s(t),i,a);if(n)try{e.drawImage(t,...n)}catch{}}}function u(e){return e.currentSrc||e.src}function d(e,t){let n=e.getBoundingClientRect(),r=e.cloneNode(!0),i=[e,...e.querySelectorAll(`*`)],a=[r,...r.querySelectorAll(`*`)],o=[],s=[];for(let e=0;e<i.length&&e<a.length;e++){let t=i[e],n=a[e];(t.scrollTop||t.scrollLeft)&&o.push([n,t.scrollTop,t.scrollLeft]),t instanceof HTMLScriptElement?s.push([n,document.createComment(`script`)]):t instanceof HTMLCanvasElement||t instanceof HTMLVideoElement?s.push([n,m(t)]):t instanceof HTMLIFrameElement?s.push([n,h(t)]):t instanceof HTMLInputElement&&n instanceof HTMLInputElement?(n.value=t.value,n.checked=t.checked):t instanceof HTMLTextAreaElement&&n instanceof HTMLTextAreaElement?n.value=t.value:t instanceof HTMLSelectElement&&n instanceof HTMLSelectElement?n.selectedIndex=t.selectedIndex:t instanceof HTMLMediaElement&&n.removeAttribute(`autoplay`)}for(let[e,t]of s)e.replaceWith(t);r.setAttribute(`aria-hidden`,`true`);let c=r.style;c.setProperty(`position`,`fixed`),c.setProperty(`left`,`${n.left}px`),c.setProperty(`top`,`${n.top}px`),c.setProperty(`width`,`${n.width}px`),c.setProperty(`height`,`${n.height}px`),c.setProperty(`box-sizing`,`border-box`),c.setProperty(`margin`,`0`),c.setProperty(`pointer-events`,`none`),c.setProperty(`z-index`,t.toString()),e.parentNode?.insertBefore(r,e);let l=r.getBoundingClientRect();(l.left!==n.left||l.top!==n.top)&&(c.setProperty(`left`,`${n.left*2-l.left}px`),c.setProperty(`top`,`${n.top*2-l.top}px`));for(let[e,t,n]of o)e.scrollTop=t,e.scrollLeft=n;return f(i,a),()=>{r.remove()}}function f(e,t){let n=e[0],r=t[0];if(!n||!r||typeof n.getAnimations!=`function`)return;let i=(e,t)=>{if(!(`animationName`in e))return null;let n=e.effect,r=n?.target,i=r?t.get(r):void 0;return i===void 0?null:`${i}|${n?.pseudoElement??``}|${e.animationName}`},a=new Map(t.map((e,t)=>[e,t])),o=new Map;for(let e of r.getAnimations({subtree:!0})){let t=i(e,a);t&&o.set(t,e)}let s=new Map(e.map((e,t)=>[e,t]));for(let e of n.getAnimations({subtree:!0})){let t=i(e,s),n=t&&o.get(t);n&&(n.currentTime=e.currentTime,n.pause())}}function p(e,t){let n=e.getBoundingClientRect(),r=getComputedStyle(e);t.className=e.className,t.style.cssText=e.style.cssText,t.style.width=`${n.width}px`,t.style.height=`${n.height}px`,t.style.display=r.display===`inline`?`inline-block`:r.display,t.style.boxSizing=`border-box`}function m(e){let t=document.createElement(`canvas`),n=e instanceof HTMLVideoElement?e.videoWidth:e.width,r=e instanceof HTMLVideoElement?e.videoHeight:e.height;t.width=Math.max(1,n),t.height=Math.max(1,r),p(e,t);try{t.getContext(`2d`)?.drawImage(e,0,0,t.width,t.height)}catch{}return t}function h(e){let t=document.createElement(`div`);return p(e,t),t}function ee(e){let t=u(e);if(!t||t.startsWith(`data:`))return!1;try{return new URL(t,location.href).origin!==location.origin}catch{return!1}}async function te(e){let t=await(await fetch(e)).blob();return URL.createObjectURL(t)}async function ne(e){let t=Array.from(e.querySelectorAll(`img`)).filter(e=>e.complete&&e.naturalWidth>0&&ee(e));if(t.length===0)return()=>{};let n=new Map,r=[];return await Promise.all(t.map(async e=>{try{let t=u(e),i=await te(t);n.set(e,t),r.push(i),await new Promise(t=>{e.addEventListener(`load`,()=>t(),{once:!0}),e.src=i})}catch{}})),()=>{for(let[e,t]of n)e.src=t;for(let e of r)URL.revokeObjectURL(e)}}var re=[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`],ie=[`position`,`top`,`right`,`bottom`,`left`,`float`,`flex`,`flex-grow`,`flex-shrink`,`flex-basis`,`align-self`,`justify-self`,`place-self`,`order`,`grid-column`,`grid-column-start`,`grid-column-end`,`grid-row`,`grid-row-start`,`grid-row-end`,`grid-area`],g=new WeakMap,ae=new WeakMap,oe=new WeakMap,_=new WeakMap,se=new WeakMap,ce=new WeakMap,le=new WeakMap,ue=new WeakSet,de=new WeakMap,fe=new WeakMap,pe=new WeakSet,me=300;function he(e,t){return new Promise(n=>{let r=t=>{clearTimeout(a),e.delete(i),n(t)},i=()=>r(!0),a=setTimeout(()=>r(!1),t);e.add(i)})}function ge(e){if(e)for(let t of[...e])t()}function _e(e,t,n){if(typeof e.moveBefore==`function`)try{e.moveBefore(t,n);return}catch{}e.insertBefore(t,n)}function ve(e,t=me){let n=fe.get(e);if(!n)return;let r=he(n,t);return e.requestPaint(),r}function ye(e){if(pe.has(e))return()=>{};pe.add(e);let{width:t,height:n,overflow:r}=e.style,i=e.getBoundingClientRect();return e.style.setProperty(`width`,`${i.width}px`),e.style.setProperty(`height`,`${i.height}px`),e.style.setProperty(`overflow`,`hidden`),()=>{if(!pe.has(e))return;pe.delete(e),e.style.width=t,e.style.height=n,e.style.overflow=r;let i=e.firstElementChild;if(i){let t=Math.round(i.getBoundingClientRect().height);e.style.setProperty(`height`,`${t}px`)}}}function be(e){de.get(e)?.(),de.delete(e)}function xe(e,t=!1){requestAnimationFrame(()=>{t||e.getContext(`2d`)?.clearRect(0,0,e.width,e.height),be(e)})}async function Se(e,t){a(e,e.firstElementChild);let n=e.getContext(`2d`);if(!n)throw Error(`Failed to get 2d context from layoutsubtree canvas`);let{onCapture:r,maxSize:i}=t,o=new Set;fe.set(e,o);let s=null,c=null,u=new Promise(e=>{c=e}),d=null,f=t=>{if(t){if(t===d)return;d=t}let a=e.firstElementChild;if(!a||e.width===0||e.height===0)return;a.hasAttribute(`drawable`)||a.setAttribute(`drawable`,``),n.clearRect(0,0,e.width,e.height),n.drawElementImage(a,0,0),l(n,a);let u=e.width,f=e.height;if(i&&(u>i||f>i)){let e=Math.min(i/u,i/f);u=Math.floor(u*e),f=Math.floor(f*e)}s&&s.width===u&&s.height===f||(s=new OffscreenCanvas(u,f));let p=s.getContext(`2d`);p&&(p.clearRect(0,0,u,f),p.drawImage(e,0,0,u,f),c?(c(s),c=null,ge(o)):(n.clearRect(0,0,e.width,e.height),r(s),ge(o)))};e.onpaint=f,e.addEventListener(`paint`,f),ae.set(e,f);let p=new ResizeObserver(t=>{for(let n of t){let t=n.devicePixelContentBoxSize?.[0];if(t)e.width=t.inlineSize,e.height=t.blockSize;else{let t=n.borderBoxSize?.[0];if(t){let n=window.devicePixelRatio;e.width=Math.round(t.inlineSize*n),e.height=Math.round(t.blockSize*n)}}}e.requestPaint()});p.observe(e,{box:`device-pixel-content-box`}),g.set(e,p);let m=e.firstElementChild;if(m){let t=new ResizeObserver(t=>{if(pe.has(e))return;let n=t[0].borderBoxSize?.[0];if(!n)return;let r=`${Math.round(n.blockSize)}px`;r!==e.style.height&&e.style.setProperty(`height`,r)});t.observe(m),oe.set(e,t)}return u}function Ce(e){e.onpaint=null,ge(fe.get(e)),fe.delete(e);let t=ae.get(e);t&&(e.removeEventListener(`paint`,t),ae.delete(e));let n=g.get(e);n&&(n.disconnect(),g.delete(e));let r=oe.get(e);r&&(r.disconnect(),oe.delete(e))}async function we(e,t){let n=e.getBoundingClientRect(),r=document.createElement(`canvas`);e.hasAttribute(`drawable`)||ue.add(e),a(r,e),r.className=e.className;let i=e.getAttribute(`style`);i&&r.setAttribute(`style`,i),r.style.setProperty(`padding`,`0`),r.style.setProperty(`border`,`none`),r.style.setProperty(`box-sizing`,`content-box`),r.style.setProperty(`background`,`transparent`);let o=getComputedStyle(e),s=o.display===`inline`?`block`:o.display;r.style.setProperty(`display`,s);for(let e of re)r.style.setProperty(e,o.getPropertyValue(e));for(let e of ie)r.style.setProperty(e,o.getPropertyValue(e));e.style.width.endsWith(`px`)?r.style.setProperty(`width`,`${n.width}px`):r.style.setProperty(`width`,`100%`),r.style.height||r.style.setProperty(`height`,`${n.height}px`);let c=window.devicePixelRatio;r.width=Math.round(n.width*c),r.height=Math.round(n.height*c),t.stillCover&&de.set(r,d(e,t.stillCover.zIndex)),_.set(e,e.style.margin),se.set(e,e.style.width),ce.set(e,e.style.boxSizing),e.parentNode?.insertBefore(r,e),getComputedStyle(r).display,_e(r,e,null),e.style.setProperty(`margin`,`0`),e.style.setProperty(`width`,`100%`),e.style.setProperty(`box-sizing`,`border-box`);let l=await ne(e);return le.set(r,l),{canvas:r,initialCapture:await Se(r,t)}}function Te(e,t){Ce(e),be(e);let n=le.get(e);n&&(n(),le.delete(e));let r=e.parentNode;r&&_e(r,t,e),e.remove(),ue.has(t)&&(t.removeAttribute(`drawable`),ue.delete(t));let i=_.get(t);i!==void 0&&(t.style.margin=i,_.delete(t));let a=se.get(t);a!==void 0&&(t.style.width=a,se.delete(t));let o=ce.get(t);o!==void 0&&(t.style.boxSizing=o,ce.delete(t))}var Ee;function De(){if(Ee!==void 0)return Ee;try{let e=document.createElement(`canvas`),t=e.getContext(`2d`);Ee=t!==null&&typeof t.drawElementImage==`function`&&typeof e.requestPaint==`function`}catch{Ee=!1}return Ee}var Oe=`#version 300 es
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
`,ke=`
void main() {
  outColor = transition(uvContent, reverse > 0.5 ? 1.0 - t : t);
}
`;function Ae(e){return`${Oe}\n${e}\n${ke}`}var je=Oe.split(`
`).length;function Me(e){let t=e instanceof Error?e.message:String(e);if(!/compile failed|link failed/i.test(t))return null;let n=[];for(let e of t.matchAll(/ERROR:\s*\d+:(\d+):\s*(.*)/g)){let t=Number(e[1])-je;n.push(t>=1?`line ${t}: ${e[2]}`:e[2])}return n.length>0?n:[t.split(`
`)[0]]}var Ne=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Pe=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Fe,Ie,Le,Re,ze,Be=new WeakMap;function Ve(e){let t=Be.get(e);return t||(t=new Set,Be.set(e,t)),t}function He(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return n<=o&&r<=s&&n+i>=o+c&&r+a>=s+l}function Ue(e,t){let n=Me(t);n?(console.error(`[VFX-JS] transition "${e}" failed to compile; cutting to the new content.\n  ${n.join(`
  `)}`),console.debug(t)):console.error(`[VFX-JS] transition "${e}" failed; cutting to the new content.`,t)}var We=class{constructor(e,t,n,r){Fe.set(this,void 0),Ie.set(this,void 0),Le.set(this,void 0),Re.set(this,void 0),ze.set(this,null),Ne(this,Fe,e,`f`),Ne(this,Ie,t,`f`),Ne(this,Le,n,`f`),Ne(this,Re,r,`f`)}start(e){Ne(this,ze,e,`f`)}end(){Ne(this,ze,null,`f`)}outputRect(e){let t=Pe(this,ze,`f`)?.overflow??Pe(this,Re,`f`);if(t===void 0||He(e.contentRect,e.canvasRect))return;if(t===!0)return e.canvasRect;let n=t*e.pixelRatio,[r,i,a,o]=e.contentRect;return[r-n,i-n,a+n*2,o+n*2]}render(e){if(e.holding){e.blit(e.src);return}let t=Ve(e.gl);if(t.has(Pe(this,Ie,`f`)))e.cut(),e.blit(e.src);else try{e.draw({frag:Pe(this,Ie,`f`),uniforms:{...Pe(this,Le,`f`),...e.run.uniforms,from:e.from,src:e.src,t:e.progress.t,reverse:+!!e.reverse,resolution:[e.dims.elementPixel[0],e.dims.elementPixel[1]],time:e.time},target:e.target})}catch(n){t.add(Pe(this,Ie,`f`)),Ue(Pe(this,Fe,`f`),n),e.cut(),e.blit(e.src)}}};Fe=new WeakMap,Ie=new WeakMap,Le=new WeakMap,Re=new WeakMap,ze=new WeakMap;function Ge(e){let t=e.uniforms??{},n=null;return{name:e.name,frag:e.frag,uniforms:t,overflow:e.overflow,ease:e.ease,create(){return n??=Ae(e.frag),new We(e.name,n,t,e.overflow)}}}var Ke=Ge({name:`crossfade`,frag:`
vec4 transition(vec2 uv, float t) {
  return mix(readFrom(uv), readTo(uv), t);
}
`}),v=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},y=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},qe,Je,Ye,Xe,Ze,Qe,$e,et,tt,nt,rt,it,at,ot,st,ct,lt,ut=e=>e*e*(3-2*e);function dt(e,t){return typeof e==`function`?e(t):e===`linear`?t:ut(t)}var ft={t:0,x:0},pt=class{constructor(){qe.add(this),this.enabled=!1,Je.set(this,null),Ye.set(this,[0,0]),Xe.set(this,[]),Ze.set(this,!1),Qe.set(this,null),$e.set(this,null),et.set(this,ft),tt.set(this,null),nt.set(this,null)}snapshot(){return v(this,qe,`m`,rt).call(this),y(this,Qe,null,`f`),this.enabled=!0,new Promise(e=>v(this,Xe,`f`).push(e))}start(e){return v(this,qe,`m`,rt).call(this),y(this,Qe,e,`f`),y(this,nt,e.onEnd??null,`f`),y(this,$e,null,`f`),y(this,et,ft,`f`),y(this,Ze,!1,`f`),this.enabled=!1,new Promise(e=>{y(this,tt,e,`f`)})}cancel(){v(this,qe,`m`,rt).call(this),y(this,Qe,null,`f`),y(this,Ze,!1,`f`),this.enabled=!1,v(this,qe,`m`,it).call(this)}get frame(){let e=v(this,Je,`f`);return!e||!v(this,Ze,`f`)&&!v(this,Qe,`f`)?null:{from:e,progress:v(this,et,`f`),holding:v(this,Qe,`f`)===null}}cut(){v(this,Qe,`f`)&&(y(this,Qe,null,`f`),v(this,qe,`m`,rt).call(this))}update(e){let t=v(this,Qe,`f`);if(!t)return;v(this,$e,`f`)===null&&y(this,$e,e.time,`f`);let n=(e.time-v(this,$e,`f`))/t.duration;if(n>=1){y(this,Qe,null,`f`),v(this,qe,`m`,rt).call(this);return}let r=Math.max(n,0);y(this,et,{t:dt(t.ease,r),x:r},`f`)}render(e){v(this,Xe,`f`).length>0&&(e.blit(e.src,v(this,qe,`m`,at).call(this,e)),y(this,Ze,!0,`f`),v(this,qe,`m`,it).call(this)),v(this,Je,`f`)&&v(this,Ze,`f`)?e.blit(v(this,Je,`f`)):(this.enabled=!1,e.blit(e.src))}dispose(){y(this,Je,null,`f`),y(this,Ye,[0,0],`f`),v(this,qe,`m`,rt).call(this),v(this,qe,`m`,it).call(this)}};Je=new WeakMap,Ye=new WeakMap,Xe=new WeakMap,Ze=new WeakMap,Qe=new WeakMap,$e=new WeakMap,et=new WeakMap,tt=new WeakMap,nt=new WeakMap,qe=new WeakSet,rt=function(){let e=v(this,nt,`f`);y(this,nt,null,`f`),e?.();let t=v(this,tt,`f`);y(this,tt,null,`f`),t?.()},it=function(){let e=v(this,Xe,`f`);y(this,Xe,[],`f`);for(let t of e)t()},at=function(e){let[t,n]=e.dims.elementPixel;return v(this,Je,`f`)&&v(this,Ye,`f`)[0]===t&&v(this,Ye,`f`)[1]===n||(v(this,Je,`f`)?.dispose(),y(this,Je,e.createRenderTarget({size:[t,n]}),`f`),y(this,Ye,[t,n],`f`)),v(this,Je,`f`)};var mt=class{constructor(e,t){ot.add(this),st.set(this,void 0),ct.set(this,null),this.effect=e,y(this,st,t,`f`)}get enabled(){return v(this,ct,`f`)!==null&&typeof this.effect.render==`function`&&this.effect.enabled!==!1}start(e){y(this,ct,e,`f`),this.effect.start?.(e)}end(){v(this,ct,`f`)!==null&&(y(this,ct,null,`f`),this.effect.end?.())}init(e){return this.effect.init?.(e)}update(e){let t=v(this,st,`f`).frame;if(!t||t.holding)return;let n=v(this,ot,`m`,lt).call(this,e);n&&this.effect.update?.(n)}render(e){let t=v(this,ot,`m`,lt).call(this,e);t&&this.effect.render?this.effect.render(t):e.blit(e.src)}outputRect(e){return v(this,ct,`f`)?this.effect.outputRect?.(e):void 0}dispose(){this.effect.dispose?.()}};st=new WeakMap,ct=new WeakMap,ot=new WeakSet,lt=function(e){let t=v(this,st,`f`).frame,n=v(this,ct,`f`);return!t||!n?null:{...e,from:t.from,progress:t.progress,holding:t.holding,reverse:n.reverse,run:n,cut:()=>v(this,st,`f`).cut()}};var b=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},x=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},S,ht,C,gt,_t,vt,yt,bt,xt,St,Ct,wt,Tt,Et,Dt,Ot,kt,At,jt,Mt,Nt,Pt,Ft,It,Lt,Rt,zt,Bt,Vt,Ht,Ut,Wt,Gt,Kt=.6,qt=300,Jt=1e3;function Yt(e,t={}){let n=t.transition!==void 0,r=t.transition??e.transition??Ke;return{transition:r,uniforms:n?{...t.uniforms}:{...e.uniforms,...t.uniforms},reverse:t.reverse??e.reverse??!1,duration:t.duration??e.duration??Kt,overflow:t.overflow??e.overflow,ease:t.ease??e.ease??r.ease??`smoothstep`}}function Xt(e){let t=e.getBoundingClientRect();return t.right>0&&t.bottom>0&&t.left<window.innerWidth&&t.top<window.innerHeight}function Zt(e){return e.tagName===`IMG`?e.loading===`lazy`&&!Xt(e):e.preload===`none`}function Qt(e,t,n=qt){let r=[];for(let t of e.querySelectorAll(`img, video`)){let e=t.tagName===`IMG`;!(e?t.complete:t.readyState>=2)&&!Zt(t)&&r.push(new Promise(n=>{let r=()=>n();t.addEventListener(e?`load`:`loadeddata`,r,{once:!0}),t.addEventListener(`error`,r,{once:!0})}))}return t&&r.push(t),r.length===0?Promise.resolve():new Promise(e=>{let t=setTimeout(e,n),i=()=>{clearTimeout(t),e()};Promise.all(r).then(i,i)})}function $t(e,t){return new Promise((n,r)=>{let i=setTimeout(()=>n(!1),t);e.then(()=>{clearTimeout(i),n(!0)},e=>{clearTimeout(i),r(e)})})}var en=()=>new Promise(e=>requestAnimationFrame(()=>e()));function tn(e,t){return e.length===t.length&&e.every((e,n)=>e===t[n])}var nn=class{constructor(e,t,n={},r,i=new pt){S.add(this),ht.set(this,void 0),C.set(this,void 0),gt.set(this,void 0),_t.set(this,void 0),vt.set(this,void 0),yt.set(this,void 0),bt.set(this,[]),xt.set(this,[]),St.set(this,!1),Ct.set(this,!1),wt.set(this,0),Tt.set(this,null),Et.set(this,!1),Dt.set(this,!1),Ot.set(this,null),kt.set(this,[]),At.set(this,null),jt.set(this,null),b(this,yt,r,`f`),b(this,ht,e,`f`),b(this,C,t,`f`),b(this,gt,n,`f`),b(this,_t,i,`f`),b(this,vt,n.keepWrapped??!1,`f`)}get running(){return x(this,Tt,`f`)!==null}show(e,t={}){let n=x(this,S,`m`,Mt).call(this,e),{remove:r=!1,...i}=t;return!this.running&&x(this,S,`m`,Nt).call(this,n)?Promise.resolve():this.run(()=>{n.parentElement!==x(this,C,`f`)&&x(this,C,`f`).append(n);for(let e of Array.from(x(this,C,`f`).children))e!==n&&(r?e.remove():e.hidden=!0);n.hidden=!1},i)}async run(e,t={}){var n;if(x(this,Et,`f`)){await e();return}let r=b(this,wt,(n=x(this,wt,`f`),++n),`f`);b(this,Tt,r,`f`);try{await x(this,S,`m`,Pt).call(this,r,e,t)}finally{x(this,Tt,`f`)===r&&b(this,Tt,null,`f`),x(this,wt,`f`)===r&&(x(this,S,`m`,Bt).call(this),x(this,S,`m`,zt).call(this))}}cancel(){var e;let t=b(this,wt,(e=x(this,wt,`f`),++e),`f`);b(this,Tt,null,`f`),x(this,S,`m`,Ht).call(this),x(this,_t,`f`).cancel(),x(this,S,`m`,Bt).call(this),x(this,S,`m`,zt).call(this),x(this,S,`m`,Wt).call(this,t)}destroy(){x(this,Et,`f`)||(b(this,Et,!0,`f`),this.cancel(),b(this,At,null,`f`),x(this,yt,`f`)?.call(this))}};ht=new WeakMap,C=new WeakMap,gt=new WeakMap,_t=new WeakMap,vt=new WeakMap,yt=new WeakMap,bt=new WeakMap,xt=new WeakMap,St=new WeakMap,Ct=new WeakMap,wt=new WeakMap,Tt=new WeakMap,Et=new WeakMap,Dt=new WeakMap,Ot=new WeakMap,kt=new WeakMap,At=new WeakMap,jt=new WeakMap,S=new WeakSet,Mt=function(e){let t=x(this,C,`f`),n=typeof e==`number`?t.children[e]:typeof e==`string`?t.querySelector(e):e;if(!n)throw TypeError(`[VFX-JS] show(): no slide for ${e}.`);if(n.parentElement!==t&&(n.isConnected||t.contains(n)))throw TypeError(`[VFX-JS] show(): the slide must be a direct child of the container.`);return n},Nt=function(e){return e.parentElement!==x(this,C,`f`)||e.hidden?!1:Array.from(x(this,C,`f`).children).every(t=>t===e||t.hidden)},Pt=async function(e,t,n){let r=()=>e===x(this,wt,`f`),i=!1,a=async()=>{i||(i=!0,await t())},o=async()=>{x(this,S,`m`,Ht).call(this),x(this,_t,`f`).cancel(),await a(),r()&&(x(this,Dt,`f`)&&x(this,vt,`f`)&&await x(this,ht,`f`).update(x(this,C,`f`)),x(this,S,`m`,Wt).call(this,e))},s=null;if(typeof n!=`function`){if(s=x(this,S,`m`,Ft).call(this,Yt(x(this,gt,`f`),n)),!r())return a();if(s===null)return o()}x(this,S,`m`,Rt).call(this);try{await x(this,S,`m`,Ut).call(this,s?.slots??null,r,!0)}catch(e){return console.error(`[VFX-JS] transition failed to wrap the element; cutting to the new content.`,e),a()}if(!r())return a();x(this,xt,`f`).push(x(this,ht,`f`).lockSize(x(this,C,`f`))),x(this,xt,`f`).push(x(this,ht,`f`).forceRender(x(this,C,`f`)));let c=await $t(x(this,_t,`f`).snapshot(),Jt);if(!r())return a();if(!c){x(this,S,`m`,Lt).call(this),await a(),r()&&x(this,S,`m`,Wt).call(this,e);return}s&&x(this,S,`m`,It).call(this,e,s);let l;try{await a(),typeof n==`function`&&r()&&(l=n())}catch(t){throw r()&&(x(this,S,`m`,Ht).call(this),x(this,_t,`f`).cancel(),x(this,S,`m`,Wt).call(this,e)),t}if(!r())return;if(s===null){if(s=x(this,S,`m`,Ft).call(this,Yt(x(this,gt,`f`),l)),!r())return;if(s===null)return o();try{await x(this,S,`m`,Ut).call(this,s.slots,r,!1)}catch(e){return console.error(`[VFX-JS] transition failed to swap the effects; cutting to the new content.`,e),o()}if(!r())return;x(this,S,`m`,It).call(this,e,s)}x(this,S,`m`,Rt).call(this);try{await x(this,S,`m`,Gt).call(this)}catch(e){console.error(`[VFX-JS] transition waitFor failed:`,e)}if(!r()||(!await x(this,ht,`f`).updateInTime(x(this,C,`f`))&&!x(this,Ct,`f`)&&(b(this,Ct,!0,`f`),console.warn(`[VFX-JS] transition: the new content was not captured in time; it may pop in during the run.`)),!r())||(await en(),!r()))return;let{spec:u}=s,d=await $t(x(this,_t,`f`).start({duration:u.duration,ease:u.ease,onEnd:()=>x(this,S,`m`,Ht).call(this,e)}),u.duration*1e3+Jt);r()&&(d||x(this,S,`m`,Lt).call(this),x(this,S,`m`,Wt).call(this,e))},Ft=function(e){if(e.duration<=0)return null;let t=e.transition;try{return{spec:e,slots:x(this,S,`m`,Vt).call(this,t)}}catch(e){return console.error(`[VFX-JS] transition "${t.name}" create() failed; cutting to the new content.`,e),null}},It=function(e,{spec:t,slots:n}){x(this,S,`m`,Ht).call(this),b(this,jt,{id:e,slots:n},`f`);let r={reverse:t.reverse,uniforms:t.uniforms,duration:t.duration};t.overflow!==void 0&&(r.overflow=t.overflow);for(let e of n)e.start(r)},Lt=function(){x(this,St,`f`)||(b(this,St,!0,`f`),console.warn(`[VFX-JS] transition target did not render in time; cutting to the new content.`)),x(this,S,`m`,Ht).call(this),x(this,_t,`f`).cancel()},Rt=function(){x(this,bt,`f`).push(x(this,ht,`f`).freezeInside(x(this,C,`f`)))},zt=function(){let e=x(this,xt,`f`);b(this,xt,[],`f`);for(let t of e)t()},Bt=function(){let e=x(this,bt,`f`);b(this,bt,[],`f`);for(let t of e)t()},Vt=function(e){if(x(this,At,`f`)?.def===e)return x(this,At,`f`).slots;let t=[e.create()].flat().map(e=>new mt(e,x(this,_t,`f`)));return b(this,At,{def:e,slots:t},`f`),t},Ht=function(e){let t=x(this,jt,`f`);if(t&&(e===void 0||t.id===e)){b(this,jt,null,`f`);for(let e of t.slots)e.end()}},Ut=async function(e,t,n){if(x(this,Ot,`f`)&&await x(this,Ot,`f`),!t())return;let r=e===null?x(this,Dt,`f`)?x(this,kt,`f`):[x(this,_t,`f`)]:[x(this,_t,`f`),...e];if(x(this,Dt,`f`)){if(!tn(r,x(this,kt,`f`))){b(this,kt,r,`f`);let e=x(this,ht,`f`).updateEffects(x(this,C,`f`),r).finally(()=>{b(this,Ot,null,`f`)});b(this,Ot,e,`f`),await e}n&&await x(this,ht,`f`).update(x(this,C,`f`))}else{let e=x(this,ht,`f`).addHTMLWithStill(x(this,C,`f`),{effect:r}).then(()=>{b(this,Dt,!0,`f`),b(this,kt,r,`f`)}).finally(()=>{b(this,Ot,null,`f`)});b(this,Ot,e,`f`),await e}},Wt=function(e){if(x(this,vt,`f`)&&!x(this,Et,`f`))return;let t=()=>{e===x(this,wt,`f`)&&x(this,Dt,`f`)&&(b(this,Dt,!1,`f`),b(this,kt,[],`f`),x(this,ht,`f`).remove(x(this,C,`f`)))};x(this,Ot,`f`)?x(this,Ot,`f`).then(t,()=>{}):t()},Gt=function(){let e=x(this,gt,`f`).waitFor??`media`;return e===`none`?Promise.resolve():e===`media`?Qt(x(this,C,`f`),document.fonts?.ready):e(x(this,C,`f`))};function rn(e){let t=typeof window<`u`?window.devicePixelRatio:1,n;n=e.scrollPadding===void 0?[.1,.1]:e.scrollPadding===!1?[0,0]:Array.isArray(e.scrollPadding)?[e.scrollPadding[0]??.1,e.scrollPadding[1]??.1]:[e.scrollPadding,e.scrollPadding];let r;return r=e.postEffect===void 0?[]:Array.isArray(e.postEffect)?e.postEffect:[e.postEffect],{pixelRatio:e.pixelRatio??t,zIndex:e.zIndex??void 0,autoplay:e.autoplay??!0,fixedCanvas:e.scrollPadding===!1,scrollPadding:n,wrapper:e.wrapper,postEffects:r,preserveDrawingBuffer:e.preserveDrawingBuffer??!1,timeScale:e.timeScale??1}}var an=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},on=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},sn,cn,ln,un,dn,fn,pn,mn,w=class{constructor(e,t,n){sn.add(this),this.wrapS=`clamp`,this.wrapT=`clamp`,this.minFilter=`linear`,this.magFilter=`linear`,this.needsUpdate=!0,this.source=null,cn.set(this,void 0),ln.set(this,!1),un.set(this,void 0),dn.set(this,void 0),an(this,cn,e,`f`),this.gl=e.gl;let r=n?.externalHandle;an(this,dn,r!==void 0,`f`),r===void 0?on(this,sn,`m`,fn).call(this):(this.texture=r,an(this,ln,!0,`f`),this.needsUpdate=!1),t&&(this.source=t),an(this,un,n?.autoRegister!==!1&&!on(this,dn,`f`),`f`),on(this,un,`f`)&&e.addResource(this)}restore(){on(this,dn,`f`)||(on(this,sn,`m`,fn).call(this),an(this,ln,!1,`f`),this.needsUpdate=!0)}bind(e){let t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&=(on(this,sn,`m`,pn).call(this),!1)}dispose(){on(this,un,`f`)&&on(this,cn,`f`).removeResource(this),on(this,dn,`f`)||this.gl.deleteTexture(this.texture)}};cn=new WeakMap,ln=new WeakMap,un=new WeakMap,dn=new WeakMap,sn=new WeakSet,fn=function(){let e=this.gl.createTexture();if(!e)throw Error(`[VFX-JS] Failed to create texture`);this.texture=e},pn=function(){let e=this.gl,t=this.source;if(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4),t)try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)}catch(e){console.error(e)}else if(!on(this,ln,`f`)){let t=new Uint8Array([0,0,0,0]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,t)}on(this,sn,`m`,mn).call(this),an(this,ln,!0,`f`)},mn=function(){let e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,hn(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,hn(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,gn(e,this.minFilter)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,gn(e,this.magFilter))};function hn(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function gn(e,t){return t===`nearest`?e.NEAREST:e.LINEAR}function _n(e){return new Promise((t,n)=>{let r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>t(r),r.onerror=n,r.src=e})}var vn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},yn=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},bn,xn,Sn,Cn=class{constructor(e,t,n,r={}){bn.add(this),xn.set(this,void 0),vn(this,xn,e,`f`),this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(n)),this.float=r.float??!1,this.mipmap=r.mipmap??!1,this.texture=new w(e,void 0,{autoRegister:!1});let i=r.wrap;i!==void 0&&(typeof i==`string`?(this.texture.wrapS=i,this.texture.wrapT=i):(this.texture.wrapS=i[0],this.texture.wrapT=i[1])),r.filter!==void 0&&(this.texture.minFilter=r.filter,this.texture.magFilter=r.filter),yn(this,bn,`m`,Sn).call(this),e.addResource(this)}setSize(e,t){let n=Math.max(1,Math.floor(e)),r=Math.max(1,Math.floor(t));(n!==this.width||r!==this.height)&&(this.width=n,this.height=r,yn(this,bn,`m`,Sn).call(this))}restore(){this.texture.restore(),yn(this,bn,`m`,Sn).call(this)}dispose(){yn(this,xn,`f`).removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.texture.dispose()}generateMipmaps(){if(!this.mipmap)return;let e=this.gl;e.bindTexture(e.TEXTURE_2D,this.texture.texture),e.generateMipmap(e.TEXTURE_2D),e.bindTexture(e.TEXTURE_2D,null)}};xn=new WeakMap,bn=new WeakSet,Sn=function(){let e=this.gl,t=this.fbo,n=e.createFramebuffer();if(!n)throw Error(`[VFX-JS] Failed to create framebuffer`);this.fbo=n;let r=this.texture.texture;e.bindTexture(e.TEXTURE_2D,r);let i=yn(this,xn,`f`).floatLinearFilter;if(this.float&&i&&!yn(this,xn,`f`).floatBlend)throw Error(`[VFX-JS] EXT_float_blend is not supported.`);let a=this.float?i?e.RGBA32F:e.RGBA16F:e.RGBA8,o=this.float?i?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;if(this.mipmap){let t=Math.floor(Math.log2(Math.max(this.width,this.height)))+1,n=this.width,r=this.height;for(let i=0;i<t;i++)e.texImage2D(e.TEXTURE_2D,i,a,n,r,0,e.RGBA,o,null),n=Math.max(1,n>>1),r=Math.max(1,r>>1)}else e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,e.RGBA,o,null);let s=this.texture.minFilter===`nearest`?e.NEAREST:e.LINEAR,c=this.texture.magFilter===`nearest`?e.NEAREST:e.LINEAR,l=this.mipmap?this.texture.minFilter===`nearest`?e.NEAREST_MIPMAP_NEAREST:e.LINEAR_MIPMAP_LINEAR:s,u=wn(e,this.texture.wrapS),d=wn(e,this.texture.wrapT);e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,l),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,c),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,u),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,d),e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.texture.needsUpdate=!1,this.texture.source=null,t&&e.deleteFramebuffer(t)};function wn(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function Tn(e,t,n,r){return{x:e.left+n,y:t-r-e.bottom,w:e.right-e.left,h:e.bottom-e.top}}function En(e,t,n,r){return{x:e,y:t,w:n,h:r}}var Dn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},T=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},On,kn,An,jn,Mn=class{constructor(e,t,n,r,i,a={}){On.set(this,void 0),kn.set(this,void 0),An.set(this,void 0),jn.set(this,void 0),Dn(this,On,t,`f`),Dn(this,kn,n,`f`),Dn(this,An,r,`f`);let o=t*r,s=n*r,c={float:i,wrap:a.wrap,filter:a.filter,mipmap:a.mipmap};Dn(this,jn,[new Cn(e,o,s,c),new Cn(e,o,s,c)],`f`)}get texture(){return T(this,jn,`f`)[0].texture}get target(){return T(this,jn,`f`)[1]}resize(e,t){if(e===T(this,On,`f`)&&t===T(this,kn,`f`))return;Dn(this,On,e,`f`),Dn(this,kn,t,`f`);let n=e*T(this,An,`f`),r=t*T(this,An,`f`);T(this,jn,`f`)[0].setSize(n,r),T(this,jn,`f`)[1].setSize(n,r)}swap(){Dn(this,jn,[T(this,jn,`f`)[1],T(this,jn,`f`)[0]],`f`)}getViewport(){return En(0,0,T(this,On,`f`),T(this,kn,`f`))}dispose(){T(this,jn,`f`)[0].dispose(),T(this,jn,`f`)[1].dispose()}};On=new WeakMap,kn=new WeakMap,An=new WeakMap,jn=new WeakMap;var Nn=class{constructor(e=0,t=0){this.x=0,this.y=0,this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}},Pn=class{constructor(e=0,t=0,n=0,r=0){this.x=0,this.y=0,this.z=0,this.w=0,this.x=e,this.y=t,this.z=n,this.w=r}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}},Fn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},In=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ln,Rn,zn,Bn,Vn,Hn,Un;function Wn(e){return/#version\s+300\s+es\b/.test(e)?`300 es`:/#version\s+100\b/.test(e)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(e)?`100`:`300 es`}var Gn=class{constructor(e,t,n,r){Ln.add(this),Rn.set(this,void 0),zn.set(this,void 0),Bn.set(this,void 0),Vn.set(this,void 0),Hn.set(this,new Map),Fn(this,Rn,e,`f`),this.gl=e.gl,Fn(this,zn,t,`f`),Fn(this,Bn,n,`f`),Fn(this,Vn,r??Wn(n),`f`),In(this,Ln,`m`,Un).call(this),e.addResource(this)}restore(){In(this,Ln,`m`,Un).call(this)}use(){this.gl.useProgram(this.program)}hasUniform(e){return In(this,Hn,`f`).has(e)}uploadUniforms(e){let t=this.gl,n=0;for(let[r,i]of In(this,Hn,`f`)){let a=e[r];if(!a)continue;let o=a.value;o!=null&&(Jn(i.type)?o instanceof w&&(o.bind(n),t.uniform1i(i.location,n),n++):o instanceof w||Xn(t,i,o))}}dispose(){In(this,Rn,`f`).removeResource(this),this.gl.deleteProgram(this.program)}};Rn=new WeakMap,zn=new WeakMap,Bn=new WeakMap,Vn=new WeakMap,Hn=new WeakMap,Ln=new WeakSet,Un=function(){let e=this.gl,t=Kn(e,e.VERTEX_SHADER,qn(In(this,zn,`f`),In(this,Vn,`f`))),n=Kn(e,e.FRAGMENT_SHADER,qn(In(this,Bn,`f`),In(this,Vn,`f`))),r=e.createProgram();if(!r)throw Error(`[VFX-JS] Failed to create program`);if(e.attachShader(r,t),e.attachShader(r,n),e.bindAttribLocation(r,0,`position`),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let i=e.getProgramInfoLog(r)??``;throw e.deleteShader(t),e.deleteShader(n),e.deleteProgram(r),Error(`[VFX-JS] Program link failed: ${i}`)}e.detachShader(r,t),e.detachShader(r,n),e.deleteShader(t),e.deleteShader(n),this.program=r,In(this,Hn,`f`).clear();let i=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<i;t++){let n=e.getActiveUniform(r,t);if(!n)continue;let i=n.name.replace(/\[0\]$/,``),a=e.getUniformLocation(r,n.name);a&&In(this,Hn,`f`).set(i,{location:a,type:n.type,size:n.size})}};function Kn(e,t,n){let r=e.createShader(t);if(!r)throw Error(`[VFX-JS] Failed to create shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)??``;throw e.deleteShader(r),Error(`[VFX-JS] Shader compile failed: ${t}\n\n${n}`)}return r}function qn(e,t){return e.replace(/^\s+/,``).startsWith(`#version`)||t===`100`?e:`#version 300 es\n${e}`}function Jn(e){return e===35678||e===36298||e===36306||e===35682}var Yn=new Set;function Xn(e,t,n){let r=t.location,i=t.size>1,a=n,o=n,s=n;switch(t.type){case e.FLOAT:i?e.uniform1fv(r,a):e.uniform1f(r,n);return;case e.FLOAT_VEC2:if(i)e.uniform2fv(r,a);else if(n instanceof Nn)e.uniform2f(r,n.x,n.y);else{let t=n;e.uniform2f(r,t[0],t[1])}return;case e.FLOAT_VEC3:if(i)e.uniform3fv(r,a);else{let t=n;e.uniform3f(r,t[0],t[1],t[2])}return;case e.FLOAT_VEC4:if(i)e.uniform4fv(r,a);else if(n instanceof Pn)e.uniform4f(r,n.x,n.y,n.z,n.w);else{let t=n;e.uniform4f(r,t[0],t[1],t[2],t[3])}return;case e.INT:i?e.uniform1iv(r,o):e.uniform1i(r,n);return;case e.INT_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,t[0],t[1])}return;case e.INT_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,t[0],t[1],t[2])}return;case e.INT_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,t[0],t[1],t[2],t[3])}return;case e.BOOL:i?e.uniform1iv(r,o):e.uniform1i(r,+!!n);return;case e.BOOL_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,+!!t[0],+!!t[1])}return;case e.BOOL_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,+!!t[0],+!!t[1],+!!t[2])}return;case e.BOOL_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,+!!t[0],+!!t[1],+!!t[2],+!!t[3])}return;case e.FLOAT_MAT2:e.uniformMatrix2fv(r,!1,a);return;case e.FLOAT_MAT3:e.uniformMatrix3fv(r,!1,a);return;case e.FLOAT_MAT4:e.uniformMatrix4fv(r,!1,a);return;case e.UNSIGNED_INT:i?e.uniform1uiv(r,s):e.uniform1ui(r,n);return;case e.UNSIGNED_INT_VEC2:if(i)e.uniform2uiv(r,s);else{let t=n;e.uniform2ui(r,t[0],t[1])}return;case e.UNSIGNED_INT_VEC3:if(i)e.uniform3uiv(r,s);else{let t=n;e.uniform3ui(r,t[0],t[1],t[2])}return;case e.UNSIGNED_INT_VEC4:if(i)e.uniform4uiv(r,s);else{let t=n;e.uniform4ui(r,t[0],t[1],t[2],t[3])}return;default:Yn.has(t.type)||(Yn.add(t.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${t.type.toString(16)}; skipping upload.`));return}}var Zn=class{constructor(e,t,n,r,i,a){this.gl=e.gl,this.program=new Gn(e,t,n,a),this.uniforms=r,this.blend=i}dispose(){this.program.dispose()}};function Qn(e,t,n,r,i,a,o,s){let c=r?r.width/s:a,l=r?r.height/s:o,u=Math.max(0,i.x),d=Math.max(0,i.y),f=Math.min(c,i.x+i.w),p=Math.min(l,i.y+i.h),m=f-u,h=p-d;m<=0||h<=0||(e.bindFramebuffer(e.FRAMEBUFFER,r?r.fbo:null),e.viewport(Math.round(u*s),Math.round(d*s),Math.round(m*s),Math.round(h*s)),$n(e,n.blend),n.program.use(),n.program.uploadUniforms(n.uniforms),t.draw())}function $n(e,t){t===`none`?e.disable(e.BLEND):(e.enable(e.BLEND),e.blendEquation(e.FUNC_ADD),t===`premultiplied`?e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA):t===`additive`?e.blendFuncSeparate(e.ONE,e.ONE,e.ONE,e.ONE):e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA))}var er=class{constructor(t){this.uniforms={src:{value:null},offset:{value:new Nn},resolution:{value:new Nn},viewport:{value:new Pn}},this.pass=new Zn(t,`
precision highp float;
in vec3 position;
void main() {
    gl_Position = vec4(position, 1.0);
}
`,e,this.uniforms,`premultiplied`)}setUniforms(e,t,n){this.uniforms.src.value=e,this.uniforms.resolution.value.set(n.w*t,n.h*t),this.uniforms.offset.value.set(n.x*t,n.y*t)}dispose(){this.pass.dispose()}},tr=e=>{let t=document.implementation.createHTMLDocument(`test`),n=t.createRange();n.selectNodeContents(t.documentElement),n.deleteContents();let r=document.createElement(`head`);return t.documentElement.appendChild(r),t.documentElement.appendChild(n.createContextualFragment(e)),t.documentElement.setAttribute(`xmlns`,t.documentElement.namespaceURI),new XMLSerializer().serializeToString(t).replace(/<!DOCTYPE html>/,``)};async function nr(e,t,n,r){let i=e.getBoundingClientRect(),a=window.devicePixelRatio,o=Math.ceil(i.width),s=Math.ceil(i.height),c=o*a,l=s*a,u=1,d=c,f=l;r&&(d>r||f>r)&&(u=Math.min(r/d,r/f),d=Math.floor(d*u),f=Math.floor(f*u));let p=n&&n.width===d&&n.height===f?n:new OffscreenCanvas(d,f),m=e.cloneNode(!0);await rr(e,m),ir(e,m),m.style.setProperty(`opacity`,t.toString()),m.style.setProperty(`margin`,`0px`),ar(m),m.style.setProperty(`box-sizing`,`border-box`),m.style.setProperty(`width`,`${o}px`),m.style.setProperty(`height`,`${s}px`);let h=m.outerHTML,ee=`<svg xmlns="http://www.w3.org/2000/svg" width="${c}" height="${l}"><foreignObject width="100%" height="100%">${tr(h)}</foreignObject></svg>`;return new Promise((e,t)=>{let n=new Image;n.onload=()=>{let r=p.getContext(`2d`);if(r===null)return t();r.clearRect(0,0,d,f);let i=a*u;r.scale(i,i),r.drawImage(n,0,0,c,l),r.setTransform(1,0,0,1,0,0),e(p)},n.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(ee)}`})}async function rr(e,t){let n=window.getComputedStyle(e);for(let e of Array.from(n))/(-inline-|-block-|^inline-|^block-)/.test(e)||/^-webkit-.*(start|end|before|after|logical)/.test(e)||t.style.setProperty(e,n.getPropertyValue(e),n.getPropertyPriority(e));if(t.tagName===`INPUT`)t.setAttribute(`value`,t.value);else if(t.tagName===`TEXTAREA`)t.innerHTML=t.value;else if(t.tagName===`IMG`)try{t.src=await or(u(e))}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];await rr(r,i)}}function ir(e,t){if(typeof e.computedStyleMap==`function`)try{let n=e.computedStyleMap();for(let e of[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`]){let r=n.get(e);r instanceof CSSKeywordValue&&r.value===`auto`&&t.style.setProperty(e,`auto`)}}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];r instanceof HTMLElement&&i instanceof HTMLElement&&ir(r,i)}}function ar(e){let t=e;for(;;){let e=t.style;if(Number.parseFloat(e.paddingTop)>0||Number.parseFloat(e.borderTopWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.firstElementChild;if(!n)break;n.style.setProperty(`margin-top`,`0px`),t=n}for(t=e;;){let e=t.style;if(Number.parseFloat(e.paddingBottom)>0||Number.parseFloat(e.borderBottomWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.lastElementChild;if(!n)break;n.style.setProperty(`margin-bottom`,`0px`),t=n}}async function or(e){let t=await fetch(e).then(e=>e.blob());return new Promise(e=>{let n=new FileReader;n.onload=function(){e(this.result)},n.readAsDataURL(t)})}var sr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},E=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},cr,lr,ur,dr,fr,pr,mr,hr,gr,_r,vr,yr,br=Object.freeze({__brand:`EffectQuad`});function xr(e){return e===br}function Sr(e,t){switch(t){case`lines`:return e.LINES;case`lineStrip`:return e.LINE_STRIP;case`points`:return e.POINTS;default:return e.TRIANGLES}}function Cr(e,t){if(t instanceof Float32Array)return e.FLOAT;if(t instanceof Uint8Array)return e.UNSIGNED_BYTE;if(t instanceof Uint16Array)return e.UNSIGNED_SHORT;if(t instanceof Uint32Array)return e.UNSIGNED_INT;if(t instanceof Int8Array)return e.BYTE;if(t instanceof Int16Array)return e.SHORT;if(t instanceof Int32Array)return e.INT;throw Error(`[VFX-JS] Unsupported attribute typed array`)}function wr(e,t){if(ArrayBuffer.isView(t)&&!(t instanceof DataView))return{name:e,data:t,itemSize:2,normalized:!1,perInstance:!1};let n=t;return{name:e,data:n.data,itemSize:n.itemSize,normalized:n.normalized??!1,perInstance:n.perInstance??!1}}var Tr=class{constructor(e,t,n){cr.add(this),lr.set(this,void 0),ur.set(this,void 0),dr.set(this,void 0),fr.set(this,[]),pr.set(this,null),this.indexType=0,this.hasIndices=!1,this.drawCount=0,this.drawStart=0,mr.set(this,!1),sr(this,lr,e,`f`),this.gl=e.gl,sr(this,ur,t,`f`),sr(this,dr,n,`f`),this.mode=Sr(this.gl,t.mode),this.instanceCount=t.instanceCount??0,E(this,cr,`m`,hr).call(this),e.addResource(this),sr(this,mr,!0,`f`)}restore(){sr(this,fr,[],`f`),sr(this,pr,null,`f`),E(this,cr,`m`,hr).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),this.hasIndices?this.instanceCount>0?e.drawElementsInstanced(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2),this.instanceCount):e.drawElements(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2)):this.instanceCount>0?e.drawArraysInstanced(this.mode,this.drawStart,this.drawCount,this.instanceCount):e.drawArrays(this.mode,this.drawStart,this.drawCount)}dispose(){E(this,mr,`f`)&&(E(this,lr,`f`).removeResource(this),sr(this,mr,!1,`f`));let e=this.gl;e.deleteVertexArray(this.vao);for(let t of E(this,fr,`f`))e.deleteBuffer(t);E(this,pr,`f`)&&e.deleteBuffer(E(this,pr,`f`)),sr(this,fr,[],`f`),sr(this,pr,null,`f`)}};lr=new WeakMap,ur=new WeakMap,dr=new WeakMap,fr=new WeakMap,pr=new WeakMap,mr=new WeakMap,cr=new WeakSet,hr=function(){let e=this.gl,t=e.createVertexArray();if(!t)throw Error(`[VFX-JS] Failed to create VAO`);this.vao=t,e.bindVertexArray(t);let n=E(this,dr,`f`).program,r=null;for(let[t,i]of Object.entries(E(this,ur,`f`).attributes)){let a=wr(t,i),o=e.getAttribLocation(n,a.name);if(o<0)continue;let s=e.createBuffer();if(!s)throw Error(`[VFX-JS] Failed to create VBO for "${a.name}"`);E(this,fr,`f`).push(s),e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,a.data,e.STATIC_DRAW);let c=Cr(e,a.data);e.enableVertexAttribArray(o),c===e.FLOAT||c===e.HALF_FLOAT||a.normalized?e.vertexAttribPointer(o,a.itemSize,c,a.normalized,0,0):e.vertexAttribIPointer(o,a.itemSize,c,0,0),a.perInstance&&e.vertexAttribDivisor(o,1),t===`position`&&r===null&&(r=a.data.length/a.itemSize)}let i=0,a=E(this,ur,`f`).indices;if(a){let t=e.createBuffer();if(!t)throw Error(`[VFX-JS] Failed to create IBO`);sr(this,pr,t,`f`),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t),e.bufferData(e.ELEMENT_ARRAY_BUFFER,a,e.STATIC_DRAW),this.hasIndices=!0,this.indexType=a instanceof Uint32Array?e.UNSIGNED_INT:e.UNSIGNED_SHORT,i=a.length}else this.hasIndices=!1;e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null),E(this,pr,`f`)&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null);let o=this.hasIndices?i:r??0,s=E(this,ur,`f`).drawRange;this.drawStart=s?.start??0,this.drawCount=s?.count===void 0?Math.max(0,o-this.drawStart):s.count};var Er=class{constructor(e,t){gr.set(this,void 0),_r.set(this,void 0),vr.set(this,new WeakMap),yr.set(this,new Set),sr(this,gr,e,`f`),sr(this,_r,t,`f`)}get quad(){return E(this,_r,`f`)}resolve(e,t){let n=E(this,vr,`f`).get(e);n||(n=new Map,E(this,vr,`f`).set(e,n));let r=n.get(t);return r||(r=new Tr(E(this,gr,`f`),e,t),n.set(t,r),E(this,yr,`f`).add(r)),r}release(e){let t=E(this,vr,`f`).get(e);if(t){for(let e of t.values())e.dispose(),E(this,yr,`f`).delete(e);E(this,vr,`f`).delete(e)}}dispose(){for(let e of E(this,yr,`f`))e.dispose();E(this,yr,`f`).clear()}};gr=new WeakMap,_r=new WeakMap,vr=new WeakMap,yr=new WeakMap;var D=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},O=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Dr,Or,kr,Ar,jr,Mr,Nr,Pr,Fr,Ir,k,Lr,A,j,Rr,zr,Br,Vr,Hr,Ur,Wr,Gr,Kr,qr=Symbol.for(`@vfx-js/effect.resolve-texture`),Jr=Symbol.for(`@vfx-js/effect.resolve-rt`);function Yr(e){return e[qr]()}function Xr(e){return e[Jr]}var Zr=`#version 300 es
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
`,Qr=`
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
`,$r=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`,ei=`
precision highp float;
varying vec2 uv;
uniform sampler2D src;
void main() {
    gl_FragColor = texture2D(src, uv);
}
`,ti=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    bool inside = all(greaterThanEqual(uvSrc, vec2(0.0))) && all(lessThanEqual(uvSrc, vec2(1.0)));
    outColor = inside ? texture(src, uvSrc) : vec4(0.0);
}
`,ni=`
precision highp float;
varying vec2 uvSrc;
uniform sampler2D src;
void main() {
    bool inside = all(greaterThanEqual(uvSrc, vec2(0.0))) && all(lessThanEqual(uvSrc, vec2(1.0)));
    gl_FragColor = inside ? texture2D(src, uvSrc) : vec4(0.0);
}
`,ri=class{constructor(e,t,n,r,i,a){Dr.add(this),Or.set(this,void 0),kr.set(this,void 0),Ar.set(this,void 0),jr.set(this,void 0),Mr.set(this,void 0),Nr.set(this,[]),Pr.set(this,[]),Fr.set(this,[]),Ir.set(this,[]),k.set(this,`init`),Lr.set(this,!1),A.set(this,void 0),j.set(this,void 0),Vr.set(this,[]),D(this,Or,e,`f`),D(this,kr,e.gl,`f`),D(this,Ar,n,`f`),D(this,jr,a,`f`),D(this,Mr,new Er(e,t),`f`),D(this,A,{outputBufferW:1,outputBufferH:1,canvasBufferSize:[1,1],outputViewport:{x:0,y:0,w:1,h:1},elementBufferW:1,elementBufferH:1,contentRectUv:[0,0,1,1],srcRectUv:[0,0,1,1]},`f`);let o={time:0,deltaTime:0,pixelRatio:n,resolution:[1,1],mouse:[0,0],mouseViewport:[0,0],intersection:0,enterTime:0,leaveTime:0,src:r,target:null,uniforms:{},vfxProps:i,dims:{element:[1,1],elementPixel:[1,1],canvas:[1,1],canvasPixel:[1,1],pixelRatio:n,contentRect:[0,0,1,1],srcRect:[0,0,1,1],canvasRect:[0,0,1,1]},quad:br,gl:O(this,kr,`f`),createRenderTarget:e=>O(this,Dr,`m`,Rr).call(this,e),releaseGeometry:e=>O(this,Mr,`f`).release(e),wrapTexture:(e,t)=>O(this,Dr,`m`,Br).call(this,e,t),draw:e=>O(this,Dr,`m`,Hr).call(this,e),blit:(e,t,n)=>O(this,Dr,`m`,Ur).call(this,e,t,n),clear:e=>O(this,Dr,`m`,Wr).call(this,e),onContextRestored:e=>{let t=O(this,Or,`f`).onContextRestored(e);return O(this,Ir,`f`).push(t),t}};D(this,j,o,`f`)}get ctx(){return O(this,j,`f`)}setPhase(e){D(this,k,e,`f`)}setFrameDims(e){D(this,A,e,`f`),O(this,j,`f`).resolution=[e.canvasBufferSize[0],e.canvasBufferSize[1]];for(let t of O(this,Fr,`f`))t.resolver.resize?.(e.outputBufferW,e.outputBufferH)}setEffectDims(e){O(this,j,`f`).dims=e}setFrameState(e){let t=O(this,j,`f`);t.time=e.time,t.deltaTime=e.deltaTime,t.mouse=e.mouse,t.mouseViewport=e.mouseViewport,t.intersection=e.intersection,t.enterTime=e.enterTime,t.leaveTime=e.leaveTime,t.uniforms=e.uniforms}setSrc(e){O(this,j,`f`).src=e}setOutput(e){O(this,j,`f`).target=e}passthroughCopy(e,t,n){let r=O(this,k,`f`);D(this,k,`render`,`f`);let i=O(this,j,`f`).target;O(this,j,`f`).target=t;try{let r=O(this,A,`f`).outputViewport;O(this,A,`f`).outputViewport={...n};let i=O(this,j,`f`).vfxProps.glslVersion===`100`?ei:$r;O(this,Dr,`m`,Gr).call(this,{frag:i,uniforms:{src:e},target:t}),O(this,A,`f`).outputViewport=r}finally{O(this,j,`f`).target=i,D(this,k,r,`f`)}}clearRt(e){let t=O(this,kr,`f`),n=Xr(e);t.bindFramebuffer(t.FRAMEBUFFER,n.getWriteFbo().fbo),t.viewport(0,0,e.width,e.height),t.clearColor(0,0,0,0),t.disable(t.SCISSOR_TEST),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)}tickAutoUpdates(){for(let e of O(this,Vr,`f`))e()}dispose(){D(this,k,`disposed`,`f`);for(let e of O(this,Ir,`f`))e();D(this,Ir,[],`f`);for(let e of O(this,Pr,`f`))e.resolver.dispose?.();D(this,Pr,[],`f`),D(this,Fr,[],`f`);for(let e of O(this,Nr,`f`))e.dispose();D(this,Nr,[],`f`),O(this,Mr,`f`).dispose(),D(this,Vr,[],`f`)}};Or=new WeakMap,kr=new WeakMap,Ar=new WeakMap,jr=new WeakMap,Mr=new WeakMap,Nr=new WeakMap,Pr=new WeakMap,Fr=new WeakMap,Ir=new WeakMap,k=new WeakMap,Lr=new WeakMap,A=new WeakMap,j=new WeakMap,Vr=new WeakMap,Dr=new WeakSet,Rr=function(e){let t=e?.persistent??!1,n=e?.float??!1,r=ai(e?.wrap),i=e?.filter,a=e?.mipmap??!1,o=a!==!1,s=a===!0,c=e?.size,l=c?c[0]:O(this,A,`f`).outputBufferW,u=c?c[1]:O(this,A,`f`).outputBufferH,d,f,p;if(t){let e=c?1:O(this,Ar,`f`),t=c?l:l/e,a=c?u:u/e,m=new Mn(O(this,Or,`f`),t,a,e,n,{wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>m.texture,getWriteFbo:()=>m.target,swap:()=>m.swap(),resize:c?void 0:(e,t)=>{m.resize(e/O(this,Ar,`f`),t/O(this,Ar,`f`))},dispose:()=>m.dispose()},o&&(d.regenerateMipmaps=()=>m.target.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>m.target.width,p=()=>m.target.height}else{let e=new Cn(O(this,Or,`f`),l,u,{float:n,wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>e.texture,getWriteFbo:()=>e,resize:c?void 0:(t,n)=>e.setSize(t,n),dispose:()=>e.dispose()},o&&(d.regenerateMipmaps=()=>e.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>e.width,p=()=>e.height}let m,h=ci(d,f,p,()=>O(this,Dr,`m`,zr).call(this,m));return m={handle:h,resolver:d},O(this,Pr,`f`).push(m),c||O(this,Fr,`f`).push(m),h},zr=function(e){let t=O(this,Pr,`f`).indexOf(e);if(t<0)return;O(this,Pr,`f`).splice(t,1);let n=O(this,Fr,`f`).indexOf(e);n>=0&&O(this,Fr,`f`).splice(n,1),e.resolver.dispose?.()},Br=function(e,t){let n=ai(t?.wrap),r=t?.filter,i,a,o,s=null;if(ii(e)){if(!t?.size)throw Error(`[VFX-JS] wrapTexture(WebGLTexture) requires opts.size`);let[n,r]=t.size;i=new w(O(this,Or,`f`),void 0,{autoRegister:!1,externalHandle:e}),a=()=>n,o=()=>r}else{let n=e;i=new w(O(this,Or,`f`),n);let r=t?.size,c=e=>{if(r)return e===`w`?r[0]:r[1];if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return e===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return e===`w`?n.videoWidth:n.videoHeight;let t=n;return e===`w`?t.width:t.height};a=()=>c(`w`),o=()=>c(`h`);let l=typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement||typeof HTMLCanvasElement<`u`&&n instanceof HTMLCanvasElement||typeof OffscreenCanvas<`u`&&n instanceof OffscreenCanvas;(t?.autoUpdate??l)&&(s=()=>{i.needsUpdate=!0})}i.wrapS=n[0],i.wrapT=n[1],r!==void 0&&(i.minFilter=r,i.magFilter=r),O(this,Nr,`f`).push(i),s&&O(this,Vr,`f`).push(s);let c=!1;return si(()=>i,a,o,()=>{if(c)return;c=!0;let e=O(this,Nr,`f`).indexOf(i);if(e!==-1&&O(this,Nr,`f`).splice(e,1),s){let e=O(this,Vr,`f`).indexOf(s);e!==-1&&O(this,Vr,`f`).splice(e,1)}i.dispose()})},Hr=function(e){O(this,k,`f`)===`render`?O(this,Dr,`m`,Gr).call(this,e):O(this,k,`f`)===`update`&&!O(this,Lr,`f`)&&(D(this,Lr,!0,`f`),console.warn(`[VFX-JS] ctx.draw() called in update(); ignored. Move draws to render().`))},Ur=function(e,t,n){if(O(this,k,`f`)!==`render`){O(this,k,`f`)===`update`&&!O(this,Lr,`f`)&&(D(this,Lr,!0,`f`),console.warn(`[VFX-JS] ctx.blit() called in update(); ignored. Move draws to render().`));return}let r=O(this,j,`f`).vfxProps.glslVersion===`100`?ni:ti;O(this,Dr,`m`,Gr).call(this,{frag:r,uniforms:{src:e},target:t,blend:n?.blend,swap:n?.swap})},Wr=function(e){if(O(this,k,`f`)!==`render`){O(this,k,`f`)===`update`&&!O(this,Lr,`f`)&&(D(this,Lr,!0,`f`),console.warn(`[VFX-JS] ctx.clear() called in update(); ignored. Move draws to render().`));return}let t=O(this,kr,`f`),n=O(this,j,`f`).target,r=e??n,i=r===null||r===n;if(t.clearColor(0,0,0,0),i){let e=r===null?null:Xr(r).getWriteFbo().fbo,n=O(this,A,`f`).outputViewport;t.bindFramebuffer(t.FRAMEBUFFER,e),t.enable(t.SCISSOR_TEST),t.scissor(n.x,n.y,n.w,n.h),t.clear(t.COLOR_BUFFER_BIT),t.disable(t.SCISSOR_TEST),t.bindFramebuffer(t.FRAMEBUFFER,null);return}let a=Xr(r);t.disable(t.SCISSOR_TEST);let o=()=>{t.bindFramebuffer(t.FRAMEBUFFER,a.getWriteFbo().fbo),t.clear(t.COLOR_BUFFER_BIT)};o(),a.swap&&(a.swap(),o(),a.swap()),t.bindFramebuffer(t.FRAMEBUFFER,null)},Gr=function(e){let t=O(this,kr,`f`),n=e.vert??(O(this,j,`f`).vfxProps.glslVersion===`100`?Qr:Zr),r=O(this,jr,`f`).get(n,e.frag,O(this,j,`f`).vfxProps.glslVersion),i=O(this,j,`f`).target,a=e.target===void 0||e.target===null?i:e.target,o=a===null||a===i,s,c,l,u,d,f,p;if(a===null)s=null,c=O(this,A,`f`).outputViewport.x,l=O(this,A,`f`).outputViewport.y,u=O(this,A,`f`).outputViewport.w,d=O(this,A,`f`).outputViewport.h;else{let e=Xr(a);s=e.getWriteFbo().fbo,o?(c=O(this,A,`f`).outputViewport.x,l=O(this,A,`f`).outputViewport.y,u=O(this,A,`f`).outputViewport.w,d=O(this,A,`f`).outputViewport.h):(c=0,l=0,u=a.width,d=a.height),f=e.swap,e.mipmapAutoRegen&&(p=e.regenerateMipmaps)}t.bindFramebuffer(t.FRAMEBUFFER,s),t.viewport(c,l,u,d),t.disable(t.SCISSOR_TEST),$n(t,e.blend??(a===null?`premultiplied`:`none`)),r.use();let m=O(this,Dr,`m`,Kr).call(this,e.uniforms);r.uploadUniforms(m);let h=e.geometry??br;xr(h)?O(this,Mr,`f`).quad.draw():O(this,Mr,`f`).resolve(h,r).draw(),p?.(),f&&e.swap!==!1&&f()},Kr=function(e){let t={};if(t.contentRectUv={value:O(this,A,`f`).contentRectUv},t.srcRectUv={value:O(this,A,`f`).srcRectUv},!e)return t;for(let[n,r]of Object.entries(e))t[n]=oi(r);return t};function ii(e){let t=globalThis.WebGLTexture;if(t&&typeof t==`function`&&e instanceof t)return!0;let n=e;return n.width===void 0&&n.naturalWidth===void 0&&n.videoWidth===void 0}function ai(e){return e===void 0?[`clamp`,`clamp`]:typeof e==`string`?[e,e]:[e[0],e[1]]}function oi(e){return typeof e==`object`&&e&&`__brand`in e?e.__brand===`EffectRenderTarget`?{value:Xr(e).getReadTexture()}:{value:Yr(e)}:{value:e}}function si(e,t,n,r){let i={__brand:`EffectTexture`,get width(){return t()},get height(){return n()},dispose(){r?.()}};return Object.defineProperty(i,qr,{value:e}),i}function ci(e,t,n,r){let i={__brand:`EffectRenderTarget`,get width(){return t()},get height(){return n()},dispose:r??(()=>{}),generateMipmaps:()=>e.regenerateMipmaps?.()};return Object.defineProperty(i,Jr,{value:e}),i}function li(e){return ci({getReadTexture:()=>e.texture,getWriteFbo:()=>e},()=>e.width,()=>e.height)}function ui(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:Array.isArray(e)?{top:e[0],right:e[1],bottom:e[2],left:e[3]}:{top:e.top??0,right:e.right??0,bottom:e.bottom??0,left:e.left??0}}function di(e){return ui(e)}var fi={top:0,right:0,bottom:0,left:0};function pi(e){return ui(e)}function mi(e){return{top:e.top,right:e.right,bottom:e.bottom,left:e.left}}function hi(e){return{top:e.top,left:e.left,right:e.left+Math.ceil(e.right-e.left),bottom:e.top+Math.ceil(e.bottom-e.top)}}function gi(e,t){return{top:e.top-t.top,right:e.right+t.right,bottom:e.bottom+t.bottom,left:e.left-t.left}}function _i(e,t,n){return Math.min(Math.max(e,t),n)}function vi(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return c<=0||l<=0?[0,0,1,1]:[(n-o)/c,(r-s)/l,i/c,a/l]}function yi(e,t){let n=_i(t.left,e.left,e.right),r=(_i(t.right,e.left,e.right)-n)/(t.right-t.left),i=_i(t.top,e.top,e.bottom);return r*((_i(t.bottom,e.top,e.bottom)-i)/(t.bottom-t.top))}var M=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},N=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},P,bi,xi,Si,Ci,wi,F,I,Ti,Ei,Di,Oi,ki,Ai,ji,Mi,Ni,Pi,Fi,Ii,Li,Ri,zi,Bi,Vi,Hi,Ui,Wi=class{constructor(e,t,n,r,i,a,o,s){P.add(this),bi.set(this,void 0),xi.set(this,void 0),Si.set(this,void 0),Ci.set(this,void 0),wi.set(this,void 0),F.set(this,void 0),I.set(this,void 0),Ti.set(this,void 0),Ei.set(this,[]),Di.set(this,[]),Oi.set(this,void 0),ki.set(this,new Set),Ai.set(this,!1),ji.set(this,void 0),Mi.set(this,di(0)),Ni.set(this,null),M(this,bi,e,`f`),M(this,xi,t,`f`),M(this,Si,n,`f`),M(this,Ci,i,`f`),M(this,wi,s,`f`),M(this,F,r,`f`),M(this,Oi,a,`f`),M(this,ji,o,`f`),M(this,I,r.map(()=>N(this,P,`m`,Fi).call(this)),`f`),r.length===0&&M(this,Ni,N(this,P,`m`,Fi).call(this),`f`),M(this,Ti,N(this,P,`m`,Pi).call(this),`f`)}get effects(){return N(this,F,`f`)}get hosts(){return N(this,I,`f`)}get renderingIndices(){return N(this,Ti,`f`)}get stages(){return N(this,Di,`f`)}get hitTestPadBuffer(){return N(this,Mi,`f`)}async initAll(){for(let e=0;e<N(this,F,`f`).length;e++){let t=N(this,F,`f`)[e],n=N(this,I,`f`)[e];n.setPhase(`init`);try{t.init&&await t.init(n.ctx)}catch(t){console.error(`[VFX-JS] effect[${e}].init() failed:`,t);for(let t=e-1;t>=0;t--)N(this,P,`m`,Ii).call(this,t),N(this,I,`f`)[t].dispose();throw N(this,I,`f`)[e].dispose(),t}n.setPhase(`update`)}}run(e){if(N(this,Ai,`f`)||!e.isVisible)return;M(this,Ti,N(this,P,`m`,Pi).call(this),`f`);let t=N(this,Ti,`f`).length;for(let t of N(this,I,`f`))t.setFrameState({time:e.time,deltaTime:e.deltaTime,mouse:e.mouse,mouseViewport:e.mouseViewport,intersection:e.intersection,enterTime:e.enterTime,leaveTime:e.leaveTime,uniforms:e.resolvedUniforms});N(this,P,`m`,Li).call(this,e);for(let t=0;t<N(this,I,`f`).length;t++)N(this,I,`f`)[t].setFrameDims(N(this,P,`m`,Ui).call(this,t,e)),N(this,I,`f`)[t].setEffectDims(N(this,P,`m`,Bi).call(this,t,e));for(let e=0;e<N(this,F,`f`).length;e++){let t=N(this,F,`f`)[e];if(!t.update)continue;let n=N(this,I,`f`)[e];n.setPhase(`update`);try{t.update(n.ctx)}catch(t){let n=`${e}:update`;N(this,ki,`f`).has(n)||(N(this,ki,`f`).add(n),console.warn(`[VFX-JS] effect[${e}].update() threw; skipping this frame's update:`,t))}}if(t===0)(N(this,Ni,`f`)??N(this,I,`f`)[0]).passthroughCopy(N(this,Oi,`f`),e.finalTarget,e.elementRectOnCanvasPx);else for(let n=0;n<t;n++){let r=N(this,Ti,`f`)[n],i=N(this,I,`f`)[r],a=N(this,F,`f`)[r];if(!a.render)continue;i.setPhase(`render`),i.tickAutoUpdates();let o=n===0?N(this,Oi,`f`):N(this,Ei,`f`)[n-1].texHandle;i.setSrc(o);let s;n===t-1?s=e.finalTarget:(s=N(this,Ei,`f`)[n].rtHandle,i.clearRt(s)),i.setOutput(s);try{a.render(i.ctx)}catch(e){let a=`${r}:render`;N(this,ki,`f`).has(a)||(N(this,ki,`f`).add(a),console.warn(`[VFX-JS] effect[${r}].render() threw; falling back to passthrough:`,e));let c=N(this,Di,`f`)[n].outputViewport;s===null?i.passthroughCopy(o,null,c):n===t-1?i.passthroughCopy(o,s,c):i.passthroughCopy(o,s,{x:0,y:0,w:s.width,h:s.height})}i.setPhase(`update`)}}dispose(){if(!N(this,Ai,`f`)){M(this,Ai,!0,`f`);for(let e=N(this,F,`f`).length-1;e>=0;e--)N(this,P,`m`,Ii).call(this,e),N(this,I,`f`)[e].dispose();N(this,Ni,`f`)&&(N(this,Ni,`f`).dispose(),M(this,Ni,null,`f`));for(let e of N(this,Ei,`f`))e.fb.dispose();M(this,Ei,[],`f`),M(this,Di,[],`f`)}}async replaceEffects(e){if(N(this,Ai,`f`))throw Error(`[VFX-JS] replaceEffects on disposed chain`);let t=N(this,F,`f`),n=N(this,I,`f`),r=new Map;for(let e=0;e<t.length;e++)r.set(t[e],n[e]);let i=Array(e.length),a=[];for(let t=0;t<e.length;t++){let n=e[t],o=r.get(n);if(o)i[t]=o,r.delete(n);else{let e=N(this,P,`m`,Fi).call(this);i[t]=e,a.push({host:e,effect:n})}}for(let e=0;e<a.length;e++){let{host:t,effect:n}=a[e];t.setPhase(`init`);try{n.init&&await n.init(t.ctx),t.setPhase(`update`)}catch(n){console.error(`[VFX-JS] replaceEffects: new effect init() failed:`,n);for(let t=e-1;t>=0;t--){let e=a[t];if(e.effect.dispose)try{e.effect.dispose()}catch(e){console.error(`[VFX-JS] dispose during init rollback threw:`,e)}e.host.dispose()}throw t.dispose(),n}}for(let[e,t]of r){if(e.dispose)try{e.dispose()}catch(e){console.error(`[VFX-JS] effect.dispose() threw during replaceEffects:`,e)}t.dispose()}for(let e of N(this,Ei,`f`))e.fb.dispose();M(this,Ei,[],`f`),M(this,Di,[],`f`),e.length===0&&!N(this,Ni,`f`)?M(this,Ni,N(this,P,`m`,Fi).call(this),`f`):e.length>0&&N(this,Ni,`f`)&&(N(this,Ni,`f`).dispose(),M(this,Ni,null,`f`)),M(this,F,e,`f`),M(this,I,i,`f`),M(this,Ti,N(this,P,`m`,Pi).call(this),`f`),N(this,ki,`f`).clear()}};bi=new WeakMap,xi=new WeakMap,Si=new WeakMap,Ci=new WeakMap,wi=new WeakMap,F=new WeakMap,I=new WeakMap,Ti=new WeakMap,Ei=new WeakMap,Di=new WeakMap,Oi=new WeakMap,ki=new WeakMap,Ai=new WeakMap,ji=new WeakMap,Mi=new WeakMap,Ni=new WeakMap,P=new WeakSet,Pi=function(){return N(this,F,`f`).map((e,t)=>typeof e.render==`function`&&e.enabled!==!1?t:-1).filter(e=>e>=0)},Fi=function(){return new ri(N(this,bi,`f`),N(this,xi,`f`),N(this,Si,`f`),N(this,Oi,`f`),N(this,Ci,`f`),N(this,wi,`f`))},Ii=function(e){let t=N(this,F,`f`)[e];if(t.dispose)try{t.dispose()}catch(t){console.error(`[VFX-JS] effect[${e}].dispose() threw:`,t)}},Li=function(e){let t=N(this,Ti,`f`).length;if(M(this,Di,Array(t),`f`),t===0)return;let n=N(this,ji,`f`)?e.canvasBufferSize:e.elementBufferSize,r=[0,0,n[0],n[1]],i=N(this,P,`m`,Hi).call(this,e),a=r;for(let n=0;n<t;n++){let o=N(this,Ti,`f`)[n],s=N(this,F,`f`)[o],c=n===t-1,l=N(this,P,`m`,Ri).call(this,s,a,r,i,e)??a,u=[l[2],l[3]],d=vi(r,l),f=c?{x:e.elementRectOnCanvasPx.x+l[0],y:e.elementRectOnCanvasPx.y+l[1],w:u[0],h:u[1]}:{x:0,y:0,w:u[0],h:u[1]};N(this,Di,`f`)[n]={dstRect:l,dstBufferSize:u,contentRectUv:d,outputViewport:f},c||N(this,P,`m`,Vi).call(this,n,u),a=l}let[o,s,c,l]=N(this,Di,`f`)[t-1].dstRect;M(this,Mi,di({top:Math.max(0,s+l-n[1]),right:Math.max(0,o+c-n[0]),bottom:Math.max(0,-s),left:Math.max(0,-o)}),`f`)},Ri=function(e,t,n,r,i){if(e.outputRect)return e.outputRect(N(this,P,`m`,zi).call(this,i,n,t,r))},zi=function(e,t,n,r){let i=e.canvasBufferSize[0]/e.canvasSize[0]||1;return{element:N(this,ji,`f`)?e.canvasSize:e.elementSize,elementPixel:N(this,ji,`f`)?e.canvasBufferSize:e.elementBufferSize,canvas:e.canvasSize,canvasPixel:e.canvasBufferSize,pixelRatio:i,contentRect:t,srcRect:n,canvasRect:r}},Bi=function(e,t){let n=N(this,ji,`f`)?t.canvasBufferSize:t.elementBufferSize,r=[0,0,n[0],n[1]],i=N(this,P,`m`,Hi).call(this,t),a=N(this,Ti,`f`).indexOf(e),o=a<=0?r:N(this,Di,`f`)[a-1].dstRect;return N(this,P,`m`,zi).call(this,t,r,o,i)},Vi=function(e,t){let n=N(this,Ei,`f`)[e];if(n&&n.fb.width===t[0]&&n.fb.height===t[1])return;n&&n.fb.dispose();let r=new Cn(N(this,bi,`f`),t[0],t[1]),i=li(r),a=si(()=>r.texture,()=>r.width,()=>r.height);N(this,Ei,`f`)[e]={fb:r,rtHandle:i,texHandle:a,bufferSize:t}},Hi=function(e){let[t,n]=e.canvasBufferSize;if(N(this,ji,`f`))return[0,0,t,n];let{x:r,y:i}=e.elementRectOnCanvasPx;return[-r,-i,t,n]},Ui=function(e,t){let n=N(this,Ti,`f`).indexOf(e),r,i,a,o,s;if(n<0)r=t.elementBufferSize[0],i=t.elementBufferSize[1],a={x:0,y:0,w:r,h:i},o=[0,0,1,1],s=[0,0,1,1];else{let e=N(this,Di,`f`)[n];r=e.dstBufferSize[0],i=e.dstBufferSize[1],a=e.outputViewport,o=e.contentRectUv,s=n===0?[0,0,1,1]:N(this,Di,`f`)[n-1].contentRectUv}return{outputBufferW:r,outputBufferH:i,canvasBufferSize:t.canvasBufferSize,outputViewport:a,elementBufferW:t.elementBufferSize[0],elementBufferH:t.elementBufferSize[1],contentRectUv:o,srcRectUv:s}};var Gi=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Ki=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},qi,Ji,Yi,Xi,Zi=class{constructor(e){qi.add(this),Ji.set(this,void 0),Yi.set(this,new Set),Gi(this,Ji,e,`f`)}freezeInside(e,t){let n={root:e,entries:[]};for(let r of t)!r.frozen&&Qi(e,r.element)&&(r.frozen=!0,n.entries.push({e:r,opacity:r.element.style.opacity}),Ki(this,Ji,`f`).showPlain(r));Ki(this,Yi,`f`).add(n);let r=!1;return()=>{if(!r){r=!0,Ki(this,Yi,`f`).delete(n);for(let{e}of n.entries)e.frozen=!1;requestAnimationFrame(()=>{for(let{e,opacity:t}of n.entries)!e.frozen&&Ki(this,Ji,`f`).isRegistered(e)&&Ki(this,Ji,`f`).hidePlain(e,t)})}}}adopt(e,t){let n=Ki(this,qi,`m`,Xi).call(this,e.element);return n?(e.frozen=!0,n.entries.push({e,opacity:t??e.element.style.opacity}),!0):!1}};Ji=new WeakMap,Yi=new WeakMap,qi=new WeakSet,Xi=function(e){for(let t of Ki(this,Yi,`f`))if(Qi(t.root,e))return t};function Qi(e,t){return t!==e&&e.contains(t)}function $i(e){this.data=e,this.pos=0}$i.prototype.readByte=function(){return this.data[this.pos++]},$i.prototype.peekByte=function(){return this.data[this.pos]},$i.prototype.readBytes=function(e){return this.data.subarray(this.pos,this.pos+=e)},$i.prototype.peekBytes=function(e){return this.data.subarray(this.pos,this.pos+e)},$i.prototype.readString=function(e){for(var t=``,n=0;n<e;n++)t+=String.fromCharCode(this.readByte());return t},$i.prototype.readBitArray=function(){for(var e=[],t=this.readByte(),n=7;n>=0;n--)e.push(!!(t&1<<n));return e},$i.prototype.readUnsigned=function(e){var t=this.readBytes(2);return e?(t[1]<<8)+t[0]:(t[0]<<8)+t[1]};function ea(e){this.stream=new $i(e),this.output={}}ea.prototype.parse=function(e){return this.parseParts(this.output,e),this.output},ea.prototype.parseParts=function(e,t){for(var n=0;n<t.length;n++){var r=t[n];this.parsePart(e,r)}},ea.prototype.parsePart=function(e,t){var n=t.label,r;if(!t.requires||t.requires(this.stream,this.output,e)){if(t.loop){for(var i=[];t.loop(this.stream);){var a={};this.parseParts(a,t.parts),i.push(a)}e[n]=i}else t.parts?(r={},this.parseParts(r,t.parts),e[n]=r):t.parser?(r=t.parser(this.stream,this.output,e),t.skip||(e[n]=r)):t.bits&&(e[n]=this.parseBits(t.bits))}};function ta(e){return e.reduce(function(e,t){return e*2+t},0)}ea.prototype.parseBits=function(e){var t={},n=this.stream.readBitArray();for(var r in e){var i=e[r];t[r]=i.length?ta(n.slice(i.index,i.index+i.length)):n[i.index]}return t};var L={readByte:function(){return function(e){return e.readByte()}},readBytes:function(e){return function(t){return t.readBytes(e)}},readString:function(e){return function(t){return t.readString(e)}},readUnsigned:function(e){return function(t){return t.readUnsigned(e)}},readArray:function(e,t){return function(n,r,i){for(var a=t(n,r,i),o=Array(a),s=0;s<a;s++)o[s]=n.readBytes(e);return o}}},na={label:`blocks`,parser:function(e){for(var t=[],n=0,r=0,i=e.readByte();i!==r;i=e.readByte())t.push(e.readBytes(i)),n+=i;var a=new Uint8Array(n);n=0;for(var o=0;o<t.length;o++)a.set(t[o],n),n+=t[o].length;return a}},ra={label:`gce`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===249},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`byteSize`,parser:L.readByte()},{label:`extras`,bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:`delay`,parser:L.readUnsigned(!0)},{label:`transparentColorIndex`,parser:L.readByte()},{label:`terminator`,parser:L.readByte(),skip:!0}]},ia={label:`image`,requires:function(e){return e.peekByte()===44},parts:[{label:`code`,parser:L.readByte(),skip:!0},{label:`descriptor`,parts:[{label:`left`,parser:L.readUnsigned(!0)},{label:`top`,parser:L.readUnsigned(!0)},{label:`width`,parser:L.readUnsigned(!0)},{label:`height`,parser:L.readUnsigned(!0)},{label:`lct`,bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:`lct`,requires:function(e,t,n){return n.descriptor.lct.exists},parser:L.readArray(3,function(e,t,n){return 2**(n.descriptor.lct.size+1)})},{label:`data`,parts:[{label:`minCodeSize`,parser:L.readByte()},na]}]},aa={label:`text`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===1},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`blockSize`,parser:L.readByte()},{label:`preData`,parser:function(e,t,n){return e.readBytes(n.text.blockSize)}},na]},oa={label:`frames`,parts:[ra,{label:`application`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===255},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`blockSize`,parser:L.readByte()},{label:`id`,parser:function(e,t,n){return e.readString(n.blockSize)}},na]},{label:`comment`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===254},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},na]},ia,aa],loop:function(e){var t=e.peekByte();return t===33||t===44}},sa=[{label:`header`,parts:[{label:`signature`,parser:L.readString(3)},{label:`version`,parser:L.readString(3)}]},{label:`lsd`,parts:[{label:`width`,parser:L.readUnsigned(!0)},{label:`height`,parser:L.readUnsigned(!0)},{label:`gct`,bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:`backgroundColorIndex`,parser:L.readByte()},{label:`pixelAspectRatio`,parser:L.readByte()}]},{label:`gct`,requires:function(e,t){return t.lsd.gct.exists},parser:L.readArray(3,function(e,t){return 2**(t.lsd.gct.size+1)})},oa];function ca(e){var t=new ea(new Uint8Array(e));this.raw=t.parse(sa),this.raw.hasImages=!1;for(var n=0;n<this.raw.frames.length;n++)if(this.raw.frames[n].image){this.raw.hasImages=!0;break}}ca.prototype.decompressFrame=function(e,t){if(e>=this.raw.frames.length)return null;var n=this.raw.frames[e];if(n.image){var r=n.image.descriptor.width*n.image.descriptor.height,i=o(n.image.data.minCodeSize,n.image.data.blocks,r);n.image.descriptor.lct.interlaced&&(i=s(i,n.image.descriptor.width));var a={pixels:i,dims:{top:n.image.descriptor.top,left:n.image.descriptor.left,width:n.image.descriptor.width,height:n.image.descriptor.height}};return a.colorTable=n.image.descriptor.lct&&n.image.descriptor.lct.exists?n.image.lct:this.raw.gct,n.gce&&(a.delay=(n.gce.delay||10)*10,a.disposalType=n.gce.extras.disposal,n.gce.extras.transparentColorGiven&&(a.transparentIndex=n.gce.transparentColorIndex)),t&&(a.patch=c(a)),a}return null;function o(e,t,n){var r=4096,i=-1,a=n,o,s,c,l,u,d,f,p,m,h,ee,te,ne,re,ie,g,ae=Array(n),oe=Array(r),_=Array(r),se=Array(r+1);for(te=e,s=1<<te,u=s+1,o=s+2,f=i,l=te+1,c=(1<<l)-1,m=0;m<s;m++)oe[m]=0,_[m]=m;for(ee=p=ne=re=g=ie=0,h=0;h<a;){if(re===0){if(p<l){ee+=t[ie]<<p,p+=8,ie++;continue}if(m=ee&c,ee>>=l,p-=l,m>o||m==u)break;if(m==s){l=te+1,c=(1<<l)-1,o=s+2,f=i;continue}if(f==i){se[re++]=_[m],f=m,ne=m;continue}for(d=m,m==o&&(se[re++]=ne,m=f);m>s;)se[re++]=_[m],m=oe[m];ne=_[m]&255,se[re++]=ne,o<r&&(oe[o]=f,_[o]=ne,o++,(o&c)===0&&o<r&&(l++,c+=o)),f=d}re--,ae[g++]=se[re],h++}for(h=g;h<a;h++)ae[h]=0;return ae}function s(e,t){for(var n=Array(e.length),r=e.length/t,i=function(r,i){var a=e.slice(i*t,(i+1)*t);n.splice.apply(n,[r*t,t].concat(a))},a=[0,4,2,1],o=[8,8,4,2],s=0,c=0;c<4;c++)for(var l=a[c];l<r;l+=o[c])i(l,s),s++;return n}function c(e){for(var t=e.pixels.length,n=new Uint8ClampedArray(t*4),r=0;r<t;r++){var i=r*4,a=e.pixels[r],o=e.colorTable[a];n[i]=o[0],n[i+1]=o[1],n[i+2]=o[2],n[i+3]=a===e.transparentIndex?0:255}return n}},ca.prototype.decompressFrames=function(e,t,n){t===void 0&&(t=0),n=n===void 0?this.raw.frames.length:Math.min(n,this.raw.frames.length);for(var r=[],i=t;i<n;i++)this.raw.frames[i].image&&r.push(this.decompressFrame(i,e));return r};var la=ca,ua=class e{static async create(t,n){let r=await fetch(t).then(e=>e.arrayBuffer()).then(e=>new la(e)),i=r.decompressFrames(!0,void 0,void 0),{width:a,height:o}=r.raw.lsd;return new e(i,a,o,n)}constructor(e,t,n,r){this.frames=[],this.index=0,this.playTime=0,this.frames=e,this.canvas=document.createElement(`canvas`),this.ctx=this.canvas.getContext(`2d`),this.pixelRatio=r,this.canvas.width=t,this.canvas.height=n,this.startTime=Date.now()}getCanvas(){return this.canvas}update(){let e=Date.now()-this.startTime;for(;this.playTime<e;){let e=this.frames[this.index%this.frames.length];this.playTime+=e.delay,this.index++}let t=this.frames[this.index%this.frames.length],n=new ImageData(t.patch,t.dims.width,t.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(n,t.dims.left,t.dims.top)}},da=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},fa,pa,ma,ha,ga,_a=class{constructor(e,t=!1){this.isContextLost=!1,fa.set(this,new Set),pa.set(this,new Set),ma.set(this,new Set),ha.set(this,e=>{e.preventDefault(),this.isContextLost=!0;for(let e of da(this,pa,`f`))e()}),ga.set(this,()=>{this.isContextLost=!1;let e=this.gl;e.getExtension(`EXT_color_buffer_float`),e.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!e.getExtension(`EXT_float_blend`);for(let e of da(this,fa,`f`))e.restore();for(let e of da(this,ma,`f`))e()});let n=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:t});if(!n)throw Error(`[VFX-JS] WebGL2 is not available.`);this.gl=n,this.canvas=e,n.getExtension(`EXT_color_buffer_float`),n.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!n.getExtension(`EXT_float_blend`),this.floatLinearFilter=!!n.getExtension(`OES_texture_float_linear`),this.maxTextureSize=n.getParameter(n.MAX_TEXTURE_SIZE),e.addEventListener(`webglcontextlost`,da(this,ha,`f`),!1),e.addEventListener(`webglcontextrestored`,da(this,ga,`f`),!1)}setSize(e,t,n){let r=Math.floor(e*n),i=Math.floor(t*n);(this.canvas.width!==r||this.canvas.height!==i)&&(this.canvas.width=r,this.canvas.height=i)}addResource(e){da(this,fa,`f`).add(e)}removeResource(e){da(this,fa,`f`).delete(e)}onContextLost(e){return da(this,pa,`f`).add(e),()=>da(this,pa,`f`).delete(e)}onContextRestored(e){return da(this,ma,`f`).add(e),()=>da(this,ma,`f`).delete(e)}};fa=new WeakMap,pa=new WeakMap,ma=new WeakMap,ha=new WeakMap,ga=new WeakMap;var va=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},ya=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ba,xa,Sa,Ca,wa=class{constructor(e){ba.add(this),xa.set(this,void 0),Sa.set(this,void 0),va(this,xa,e,`f`),this.gl=e.gl,ya(this,ba,`m`,Ca).call(this),e.addResource(this)}restore(){ya(this,ba,`m`,Ca).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){ya(this,xa,`f`).removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(ya(this,Sa,`f`))}};xa=new WeakMap,Sa=new WeakMap,ba=new WeakSet,Ca=function(){let e=this.gl,t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw Error(`[VFX-JS] Failed to create quad VAO`);this.vao=t,va(this,Sa,n,`f`);let r=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)};function Ta(e,t,n,r={}){return new Cn(e,t,n,{float:r.float??!1})}function Ea(e,t){let n=t.renderingToBuffer??!1,r;r=n?`none`:t.premultipliedAlpha?`premultiplied`:`normal`;let i=t.glslVersion??Wn(t.fragmentShader);return new Zn(e,t.vertexShader??(i===`100`?`
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
`),t.fragmentShader,t.uniforms,r,i)}var Da=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},R=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},z,Oa,ka,Aa,ja,Ma,Na=class{constructor(e,t,n,r,i,a,o,s){if(z.set(this,void 0),Oa.set(this,void 0),ka.set(this,void 0),Aa.set(this,void 0),ja.set(this,void 0),Ma.set(this,void 0),Da(this,Aa,r??!1,`f`),Da(this,ja,i??!1,`f`),Da(this,Ma,a,`f`),Da(this,Oa,{},`f`),Da(this,z,{src:{value:null},offset:{value:new Nn},resolution:{value:new Nn},viewport:{value:new Pn},time:{value:0},mouse:{value:new Nn},passIndex:{value:0}},`f`),n)for(let[e,t]of Object.entries(n))typeof t==`function`?(R(this,Oa,`f`)[e]=t,R(this,z,`f`)[e]={value:t()}):R(this,z,`f`)[e]={value:t};this.pass=Ea(e,{fragmentShader:t,uniforms:R(this,z,`f`),renderingToBuffer:o??!1,premultipliedAlpha:!0,glslVersion:s})}get uniforms(){return R(this,z,`f`)}setUniforms(e,t,n,r,i,a){R(this,z,`f`).src.value=e,R(this,z,`f`).resolution.value.set(n.w*t,n.h*t),R(this,z,`f`).offset.value.set(n.x*t,n.y*t),R(this,z,`f`).time.value=r,R(this,z,`f`).mouse.value.set(i*t,a*t)}updateCustomUniforms(e){for(let[e,t]of Object.entries(R(this,Oa,`f`)))R(this,z,`f`)[e]&&(R(this,z,`f`)[e].value=t());if(e)for(let[t,n]of Object.entries(e))R(this,z,`f`)[t]&&(R(this,z,`f`)[t].value=n())}initializeBackbuffer(e,t,n,r){R(this,Aa,`f`)&&!R(this,ka,`f`)&&(R(this,Ma,`f`)?Da(this,ka,new Mn(e,R(this,Ma,`f`)[0],R(this,Ma,`f`)[1],1,R(this,ja,`f`)),`f`):Da(this,ka,new Mn(e,t,n,r,R(this,ja,`f`)),`f`))}resizeBackbuffer(e,t){R(this,ka,`f`)&&!R(this,Ma,`f`)&&R(this,ka,`f`).resize(e,t)}registerBufferUniform(e){R(this,z,`f`)[e]||(R(this,z,`f`)[e]={value:null})}get backbuffer(){return R(this,ka,`f`)}get persistent(){return R(this,Aa,`f`)}get float(){return R(this,ja,`f`)}get size(){return R(this,Ma,`f`)}dispose(){this.pass.dispose(),R(this,ka,`f`)?.dispose()}};z=new WeakMap,Oa=new WeakMap,ka=new WeakMap,Aa=new WeakMap,ja=new WeakMap,Ma=new WeakMap;var Pa=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Fa=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ia,La,Ra=class{constructor(e){Ia.set(this,void 0),La.set(this,new Map),Pa(this,Ia,e,`f`)}get(e,t,n){let r=`${t}\0${e}\0${n??``}`,i=Fa(this,La,`f`).get(r);return i||(i=new Gn(Fa(this,Ia,`f`),e,t,n),Fa(this,La,`f`).set(r,i)),i}get size(){return Fa(this,La,`f`).size}dispose(){for(let e of Fa(this,La,`f`).values())e.dispose();Fa(this,La,`f`).clear()}};Ia=new WeakMap,La=new WeakMap;var B=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},V=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},H,za,Ba,U,Va,Ha,Ua,W,G,K,Wa,q,Ga,Ka,qa,Ja,Ya,Xa,J,Y,Za,Qa,$a,eo,to,X,no,ro,io,ao,oo,so,co,lo,uo,fo,po,mo,ho,go,_o,vo,yo,bo,xo,So,Co,wo,Z,To,Eo,Do,Oo,ko,Ao,jo=new Map;function Mo(e,t){return e===`hic`||t===!0?null:typeof t==`number`?t.toString():e===`video`?`0.0001`:`0`}function No(e,t){let n=e.getContext(`2d`);n&&(n.clearRect(0,0,e.width,e.height),n.drawImage(t,0,0,e.width,e.height))}var Po=class{constructor(e,t){H.add(this),za.set(this,void 0),Ba.set(this,void 0),U.set(this,void 0),Va.set(this,void 0),Ha.set(this,void 0),Ua.set(this,void 0),W.set(this,void 0),G.set(this,[]),K.set(this,void 0),Wa.set(this,new Map),q.set(this,null),Ga.set(this,!1),Ka.set(this,new WeakSet),qa.set(this,{}),Ja.set(this,{}),Ya.set(this,0),Xa.set(this,void 0),J.set(this,2),Y.set(this,[]),Za.set(this,new Zi({showPlain:e=>{if(e.type===`hic`){let t=e.srcTexture.source;t instanceof OffscreenCanvas&&No(e.element,t)}else e.element.style.setProperty(`opacity`,e.originalOpacity.toString())},hidePlain:(e,t)=>{if(e.type===`hic`){let t=e.element;t.getContext(`2d`)?.clearRect(0,0,t.width,t.height)}else e.element.style.opacity=t},isRegistered:e=>V(this,Y,`f`).includes(e)})),Qa.set(this,0),$a.set(this,1),eo.set(this,Date.now()/1e3),to.set(this,!1),X.set(this,pi(0)),no.set(this,pi(0)),ro.set(this,[0,0]),io.set(this,0),ao.set(this,0),oo.set(this,0),so.set(this,0),co.set(this,new WeakMap),uo.set(this,async()=>{if(typeof window<`u`){for(let e of V(this,Y,`f`))if(e.type===`text`&&e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await V(this,H,`m`,po).call(this,e),e.width=n,e.height=r)}for(let e of V(this,Y,`f`))if(e.type===`text`&&!e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await V(this,H,`m`,po).call(this,e),e.width=n,e.height=r)}}}),fo.set(this,e=>{typeof window<`u`&&(B(this,oo,e.clientX,`f`),B(this,so,window.innerHeight-e.clientY,`f`))}),_o.set(this,()=>{this.isPlaying()&&(this.render(),B(this,Xa,requestAnimationFrame(V(this,_o,`f`)),`f`))}),B(this,za,e,`f`),B(this,Ba,t,`f`),B(this,U,new _a(t,e.preserveDrawingBuffer),`f`),B(this,Va,V(this,U,`f`).gl,`f`),V(this,Va,`f`).clearColor(0,0,0,0),B(this,J,e.pixelRatio,`f`),B(this,$a,e.timeScale,`f`),B(this,eo,Date.now()/1e3,`f`),B(this,Ha,new wa(V(this,U,`f`)),`f`),B(this,Ua,new Ra(V(this,U,`f`)),`f`),typeof window<`u`&&(window.addEventListener(`resize`,V(this,uo,`f`)),window.addEventListener(`pointermove`,V(this,fo,`f`))),V(this,uo,`f`).call(this),B(this,W,new er(V(this,U,`f`)),`f`),V(this,H,`m`,Eo).call(this,e.postEffects),V(this,U,`f`).onContextRestored(()=>{V(this,Va,`f`).clearColor(0,0,0,0)})}destroy(){this.stop(),typeof window<`u`&&(window.removeEventListener(`resize`,V(this,uo,`f`)),window.removeEventListener(`pointermove`,V(this,fo,`f`))),V(this,K,`f`)?.dispose();for(let e of V(this,Wa,`f`).values())e?.dispose();for(let e of V(this,G,`f`))e.pass.dispose();V(this,q,`f`)&&(V(this,q,`f`).dispose(),B(this,q,null,`f`),B(this,Ga,!1,`f`)),V(this,W,`f`).dispose(),V(this,Ua,`f`).dispose(),V(this,Ha,`f`).dispose()}async addElement(e,t={},n){if(t.effect!==void 0)return V(this,H,`m`,ho).call(this,e,t,t.effect,n);let r=V(this,H,`m`,go).call(this,t),a=e.getBoundingClientRect(),o=Wo(e)?hi(a):mi(a),[s,c]=Lo(t.overflow),l=gi(o,c),d=zo(t.intersection),f=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),p,m,h=!1;if(e instanceof HTMLImageElement){m=`img`;let t=u(e);if(h=!!t.match(/\.gif/i),h){let n=await ua.create(t,V(this,J,`f`));jo.set(e,n),p=new w(V(this,U,`f`),n.getCanvas())}else{let e=await _n(t);p=new w(V(this,U,`f`),e)}}else if(e instanceof HTMLVideoElement)p=new w(V(this,U,`f`),e),m=`video`;else if(e instanceof HTMLCanvasElement)i(e)&&n?(p=new w(V(this,U,`f`),n),m=`hic`):(p=new w(V(this,U,`f`),e),m=`canvas`);else{let t=await nr(e,f,void 0,this.maxTextureSize);p=new w(V(this,U,`f`),t),m=`text`}let[ee,te]=Ho(t.wrap);p.wrapS=ee,p.wrapT=te,p.needsUpdate=!0;let ne=t.autoCrop??!0,re=Mo(m,t.overlay),ie={src:{value:p},resolution:{value:new Nn},offset:{value:new Nn},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},mouse:{value:new Nn},intersection:{value:0},viewport:{value:new Pn},autoCrop:{value:ne}},g={};if(t.uniforms!==void 0)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(ie[e]={value:n()},g[e]=n):ie[e]={value:n};let ae;t.backbuffer&&(ae=(()=>{let e=(l.right-l.left)*V(this,J,`f`),t=(l.bottom-l.top)*V(this,J,`f`);return new Mn(V(this,U,`f`),e,t,V(this,J,`f`),!1)})(),ie.backbuffer={value:ae.texture});let oe=new Map,_=new Map;for(let e=0;e<r.length-1;e++){let t=r[e].target??`pass${e}`;r[e]={...r[e],target:t};let n=r[e].size,i=n?n[0]:(l.right-l.left)*V(this,J,`f`),a=n?n[1]:(l.bottom-l.top)*V(this,J,`f`);if(r[e].persistent){let i=n?1:V(this,J,`f`),a=n?n[0]:l.right-l.left,o=n?n[1]:l.bottom-l.top;_.set(t,new Mn(V(this,U,`f`),a,o,i,r[e].float))}else oe.set(t,Ta(V(this,U,`f`),i,a,{float:r[e].float}))}let se=[];for(let e=0;e<r.length;e++){let t=r[e],n=t.frag,i={...ie},a={};for(let[e,r]of oe)e!==t.target&&n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:r.texture});for(let[e,t]of _)n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:t.texture});if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(i[e]={value:n()},a[e]=n):i[e]={value:n};let o=Ea(V(this,U,`f`),{vertexShader:t.vert,fragmentShader:n,uniforms:i,renderingToBuffer:t.target!==void 0,glslVersion:t.glslVersion});se.push({pass:o,uniforms:i,uniformGenerators:{...g,...a},target:t.target,persistent:t.persistent,float:t.float,size:t.size,backbuffer:t.target?_.get(t.target):void 0})}let ce=V(this,Qa,`f`),le={type:m,element:e,isInViewport:!1,isInLogicalViewport:!1,width:o.right-o.left,height:o.bottom-o.top,passes:se,bufferTargets:oe,startTime:ce,enterTime:ce,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:s,overflow:c,intersection:d,originalOpacity:f,srcTexture:p,zIndex:t.zIndex??0,backbuffer:ae,autoCrop:ne};V(this,H,`m`,Co).call(this,le,o,ce),V(this,H,`m`,mo).call(this,le,re)}async updateElementEffects(e,t){let n=V(this,Y,`f`).find(t=>t.element===e);if(!n)throw Error(`[VFX-JS] updateElementEffects: element not registered`);if(!n.chain)throw Error(`[VFX-JS] updateElementEffects: element is on the shader path; effect-only updates are not supported`);let r=Array.isArray(t)?[...t]:[t],i=n.chain.effects,a=new Set(i),o=[];for(let e of r)if(!a.has(e)){if(V(this,Ka,`f`).has(e))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");o.push(e)}await n.chain.replaceEffects(r);let s=new Set(r);for(let e of i)s.has(e)||V(this,Ka,`f`).delete(e);for(let e of o)V(this,Ka,`f`).add(e)}removeElement(e){let t=V(this,Y,`f`).findIndex(t=>t.element===e);if(t!==-1){let n=V(this,Y,`f`).splice(t,1)[0];if(n.chain)V(this,H,`m`,xo).call(this,n.chain.effects),n.chain.dispose();else{for(let e of n.bufferTargets.values())e.dispose();for(let e of n.passes)e.pass.dispose(),e.backbuffer?.dispose();n.backbuffer?.dispose()}n.srcTexture.dispose(),e.style.setProperty(`opacity`,n.originalOpacity.toString())}}updateTextElement(e){let t=V(this,Y,`f`).findIndex(t=>t.element===e);return t===-1?Promise.resolve():V(this,H,`m`,po).call(this,V(this,Y,`f`)[t])}async updateImageElement(e){let t=V(this,Y,`f`).find(t=>t.element===e);if(t?.type!==`img`||t.isGif)return;let n=await _n(u(e)),r=t.srcTexture,i=new w(V(this,U,`f`),n);i.wrapS=r.wrapS,i.wrapT=r.wrapT,i.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=i),t.srcTexture=i,r.dispose()}updateCanvasElement(e){let t=V(this,Y,`f`).find(t=>t.element===e);if(t){let n=t.srcTexture,r=new w(V(this,U,`f`),e);r.wrapS=n.wrapS,r.wrapT=n.wrapT,r.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=r),t.srcTexture=r,n.dispose()}}updateHICTexture(e,t){let n=V(this,Y,`f`).find(t=>t.element===e);if(n?.type!==`hic`)return;n.frozen&&No(e,t);let r=n.srcTexture;if(r.source===t)r.needsUpdate=!0;else{let e=new w(V(this,U,`f`),t);e.wrapS=r.wrapS,e.wrapT=r.wrapT,e.needsUpdate=!0,!n.chain&&n.passes.length>0&&(n.passes[0].uniforms.src.value=e),n.srcTexture=e,r.dispose()}}freezeInside(e){return V(this,Za,`f`).freezeInside(e,V(this,Y,`f`))}isFrozen(e){return V(this,Y,`f`).some(t=>t.element===e&&t.frozen)}forceRender(e){let t=V(this,Y,`f`).find(t=>t.element===e);return!t||t.forceRender?()=>{}:(t.forceRender=!0,()=>{t.forceRender=!1})}get maxTextureSize(){return V(this,U,`f`).maxTextureSize}isPlaying(){return V(this,Xa,`f`)!==void 0}play(){this.isPlaying()||(B(this,eo,Date.now()/1e3,`f`),B(this,Xa,requestAnimationFrame(V(this,_o,`f`)),`f`))}get time(){return V(this,Qa,`f`)}setTime(e){B(this,Qa,e,`f`),B(this,to,!0,`f`)}get timeScale(){return V(this,$a,`f`)}set timeScale(e){B(this,$a,e,`f`)}stop(){V(this,Xa,`f`)!==void 0&&(cancelAnimationFrame(V(this,Xa,`f`)),B(this,Xa,void 0,`f`))}render(){let e=Date.now()/1e3;V(this,to,`f`)?B(this,to,!1,`f`):B(this,Qa,V(this,Qa,`f`)+(e-V(this,eo,`f`))*V(this,$a,`f`),`f`),B(this,eo,e,`f`);let t=V(this,Qa,`f`),n=V(this,Va,`f`);V(this,H,`m`,lo).call(this),n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,V(this,Ba,`f`).width,V(this,Ba,`f`).height),n.clear(n.COLOR_BUFFER_BIT);let r=V(this,X,`f`).right-V(this,X,`f`).left,i=V(this,X,`f`).bottom-V(this,X,`f`).top,a=En(0,0,r,i),o=V(this,H,`m`,yo).call(this);o&&(V(this,H,`m`,Ao).call(this,r,i),V(this,K,`f`)&&(n.bindFramebuffer(n.FRAMEBUFFER,V(this,K,`f`).fbo),n.clear(n.COLOR_BUFFER_BIT),n.bindFramebuffer(n.FRAMEBUFFER,null)));for(let e of V(this,Y,`f`)){if(e.frozen)continue;let n=e.element.getBoundingClientRect(),s=e.type===`text`?hi(n):mi(n),c=V(this,H,`m`,Co).call(this,e,s,t);if(!c.isVisible)continue;if(e.chain){V(this,H,`m`,vo).call(this,e,s,c,t);continue}let l=e.passes[0].uniforms;l.time.value=t-e.startTime,l.resolution.value.set((s.right-s.left)*V(this,J,`f`),(s.bottom-s.top)*V(this,J,`f`)),l.mouse.value.set((V(this,oo,`f`)+V(this,io,`f`))*V(this,J,`f`),(V(this,so,`f`)+V(this,ao,`f`))*V(this,J,`f`));for(let t of e.passes)for(let[e,n]of Object.entries(t.uniformGenerators))t.uniforms[e].value=n();jo.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(l.src.value.needsUpdate=!0);let u=Tn(s,i,V(this,io,`f`),V(this,ao,`f`)),d=Tn(c.rectWithOverflow,i,V(this,io,`f`),V(this,ao,`f`));e.backbuffer&&(e.passes[0].uniforms.backbuffer.value=e.backbuffer.texture);{let t=e.isFullScreen?a:d,n=Math.max(1,t.w*V(this,J,`f`)),r=Math.max(1,t.h*V(this,J,`f`)),i=Math.max(1,t.w),o=Math.max(1,t.h);for(let t=0;t<e.passes.length-1;t++){let a=e.passes[t];if(!a.size){if(a.backbuffer)a.backbuffer.resize(i,o);else{let t=e.bufferTargets.get(a.target);t&&(t.width!==n||t.height!==r)&&t.setSize(n,r)}}}}let f=new Map;for(let t of e.passes)t.backbuffer&&t.target&&f.set(t.target,t.backbuffer.texture);let p=e.srcTexture;for(let t=0;t<e.passes.length-1;t++){let r=e.passes[t],i=e.isFullScreen?a:d;r.uniforms.src.value=p;for(let[e,t]of f)r.uniforms[e]&&(r.uniforms[e].value=t);for(let[e,t]of Object.entries(r.uniformGenerators))r.uniforms[e]&&(r.uniforms[e].value=t());let o=r.size?En(0,0,r.size[0],r.size[1]):En(0,0,i.w,i.h),s=Ro(n,u,i,r.size,[V(this,oo,`f`),V(this,so,`f`)],[V(this,io,`f`),V(this,ao,`f`)],V(this,J,`f`));if(r.uniforms.resolution.value.set(...s.resolution),r.uniforms.offset.value.set(...s.offset),r.uniforms.mouse.value.set(...s.mouse),r.backbuffer)V(this,H,`m`,Z).call(this,r.pass,r.backbuffer.target,o,r.uniforms,!0),r.backbuffer.swap(),p=r.backbuffer.texture;else{let t=e.bufferTargets.get(r.target);if(!t)continue;V(this,H,`m`,Z).call(this,r.pass,t,o,r.uniforms,!0),p=t.texture}r.target&&f.set(r.target,p)}let m=e.passes[e.passes.length-1];m.uniforms.src.value=p,m.uniforms.resolution.value.set(n.width*V(this,J,`f`),n.height*V(this,J,`f`)),m.uniforms.offset.value.set(u.x*V(this,J,`f`),u.y*V(this,J,`f`)),m.uniforms.mouse.value.set((V(this,oo,`f`)+V(this,io,`f`))*V(this,J,`f`),(V(this,so,`f`)+V(this,ao,`f`))*V(this,J,`f`));for(let[e,t]of f)m.uniforms[e]&&(m.uniforms[e].value=t);for(let[e,t]of Object.entries(m.uniformGenerators))m.uniforms[e]&&(m.uniforms[e].value=t());e.backbuffer?(m.uniforms.backbuffer.value=e.backbuffer.texture,e.isFullScreen?(e.backbuffer.resize(r,i),V(this,H,`m`,To).call(this,e,u.x,u.y),V(this,H,`m`,Z).call(this,m.pass,e.backbuffer.target,a,m.uniforms,!0),e.backbuffer.swap(),V(this,W,`f`).setUniforms(e.backbuffer.texture,V(this,J,`f`),a),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,o&&V(this,K,`f`)||null,a,V(this,W,`f`).uniforms,!1)):(e.backbuffer.resize(d.w,d.h),V(this,H,`m`,To).call(this,e,e.overflow.left,e.overflow.bottom),V(this,H,`m`,Z).call(this,m.pass,e.backbuffer.target,e.backbuffer.getViewport(),m.uniforms,!0),e.backbuffer.swap(),V(this,W,`f`).setUniforms(e.backbuffer.texture,V(this,J,`f`),d),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,o&&V(this,K,`f`)||null,d,V(this,W,`f`).uniforms,!1))):(V(this,H,`m`,To).call(this,e,u.x,u.y),V(this,H,`m`,Z).call(this,m.pass,o&&V(this,K,`f`)||null,e.isFullScreen?a:d,m.uniforms,!1))}o&&V(this,K,`f`)&&(V(this,q,`f`)&&V(this,Ga,`f`)?V(this,H,`m`,Oo).call(this,a,t):V(this,H,`m`,ko).call(this,a,t))}};za=new WeakMap,Ba=new WeakMap,U=new WeakMap,Va=new WeakMap,Ha=new WeakMap,Ua=new WeakMap,W=new WeakMap,G=new WeakMap,K=new WeakMap,Wa=new WeakMap,q=new WeakMap,Ga=new WeakMap,Ka=new WeakMap,qa=new WeakMap,Ja=new WeakMap,Ya=new WeakMap,Xa=new WeakMap,J=new WeakMap,Y=new WeakMap,Za=new WeakMap,Qa=new WeakMap,$a=new WeakMap,eo=new WeakMap,to=new WeakMap,X=new WeakMap,no=new WeakMap,ro=new WeakMap,io=new WeakMap,ao=new WeakMap,oo=new WeakMap,so=new WeakMap,co=new WeakMap,uo=new WeakMap,fo=new WeakMap,_o=new WeakMap,H=new WeakSet,lo=function(){if(typeof window>`u`)return;let e=V(this,Ba,`f`).ownerDocument,t=e.compatMode===`BackCompat`?e.body:e.documentElement,n=t.clientWidth,r=t.clientHeight,i=window.scrollX,a=window.scrollY,o,s;if(V(this,za,`f`).fixedCanvas)o=0,s=0;else if(V(this,za,`f`).wrapper)o=n*V(this,za,`f`).scrollPadding[0],s=r*V(this,za,`f`).scrollPadding[1];else{let t=e.body.scrollWidth-(i+n),c=e.body.scrollHeight-(a+r);o=Uo(n*V(this,za,`f`).scrollPadding[0],0,t),s=Uo(r*V(this,za,`f`).scrollPadding[1],0,c)}let c=n+o*2,l=r+s*2;(c!==V(this,ro,`f`)[0]||l!==V(this,ro,`f`)[1])&&(V(this,Ba,`f`).style.width=`${c}px`,V(this,Ba,`f`).style.height=`${l}px`,V(this,U,`f`).setSize(c,l,V(this,J,`f`)),B(this,X,pi({top:-s,left:-o,right:n+o,bottom:r+s}),`f`),B(this,no,pi({top:0,left:0,right:n,bottom:r}),`f`),B(this,ro,[c,l],`f`),B(this,io,o,`f`),B(this,ao,s,`f`)),V(this,za,`f`).fixedCanvas||V(this,Ba,`f`).style.setProperty(`transform`,`translate(${i-o}px, ${a-s}px)`)},po=async function(e){if(!V(this,co,`f`).get(e.element)){V(this,co,`f`).set(e.element,!0);try{let t=e.srcTexture,n=t.source instanceof OffscreenCanvas?t.source:void 0,r=await nr(e.element,e.originalOpacity,n,this.maxTextureSize);if(r.width===0||r.height===0)return;let i=new w(V(this,U,`f`),r);i.wrapS=t.wrapS,i.wrapT=t.wrapT,i.needsUpdate=!0,!e.chain&&e.passes.length>0&&(e.passes[0].uniforms.src.value=i),e.srcTexture=i,t.dispose()}catch(e){console.error(e)}finally{V(this,co,`f`).set(e.element,!1)}}},mo=function(e,t){!V(this,Za,`f`).adopt(e,t)&&t!==null&&e.element.style.setProperty(`opacity`,t),V(this,Y,`f`).push(e),V(this,Y,`f`).sort((e,t)=>e.zIndex-t.zIndex)},ho=async function(e,t,n,r){t.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified; `effect` takes precedence."),t.overflow!==void 0&&console.warn("[VFX-JS] `overflow` is shader-path only and is ignored by the effect path. Use each effect's own `outputRect` (with `dims.canvasRect` for fullscreen) to control its dst rect.");let a=Array.isArray(n)?[...n]:[n];V(this,H,`m`,bo).call(this,a);let o=e.getBoundingClientRect(),s=Wo(e)?hi(o):mi(o),[c,l]=Lo(t.overflow),d=zo(t.intersection),f=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),p,m,h=!1;if(e instanceof HTMLImageElement){m=`img`;let t=u(e);if(h=!!t.match(/\.gif/i),h){let n=await ua.create(t,V(this,J,`f`));jo.set(e,n),p=new w(V(this,U,`f`),n.getCanvas())}else{let e=await _n(t);p=new w(V(this,U,`f`),e)}}else if(e instanceof HTMLVideoElement)p=new w(V(this,U,`f`),e),m=`video`;else if(e instanceof HTMLCanvasElement)i(e)&&r?(p=new w(V(this,U,`f`),r),m=`hic`):(p=new w(V(this,U,`f`),e),m=`canvas`);else{let t=await nr(e,f,void 0,this.maxTextureSize);p=new w(V(this,U,`f`),t),m=`text`}let[ee,te]=Ho(t.wrap);p.wrapS=ee,p.wrapT=te,p.needsUpdate=!0;let ne=t.autoCrop??!0,re=Mo(m,t.overlay),ie=V(this,Qa,`f`),g={type:m,element:e,isInViewport:!1,isInLogicalViewport:!1,width:s.right-s.left,height:s.bottom-s.top,passes:[],bufferTargets:new Map,startTime:ie,enterTime:ie,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:c,overflow:l,intersection:d,originalOpacity:f,srcTexture:p,zIndex:t.zIndex??0,backbuffer:void 0,autoCrop:ne,effectLastRenderTime:ie},ae=si(()=>g.srcTexture,()=>Bo(g.srcTexture,`w`),()=>Bo(g.srcTexture,`h`)),oe={},_={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(_[e]=n,oe[e]=n()):oe[e]=n;g.effectUniformGenerators=_,g.effectStaticUniforms=oe;let se={autoCrop:ne,glslVersion:t.glslVersion??`300 es`},ce=new Wi(V(this,U,`f`),V(this,Ha,`f`),V(this,J,`f`),a,se,ae,!1,V(this,Ua,`f`));try{await ce.initAll()}catch(t){throw V(this,H,`m`,xo).call(this,a),p.dispose(),e.style.setProperty(`opacity`,f.toString()),t}g.chain=ce,V(this,H,`m`,Co).call(this,g,s,ie),V(this,H,`m`,mo).call(this,g,re)},go=function(e){let t=t=>t.glslVersion===void 0&&e.glslVersion!==void 0?{...t,glslVersion:e.glslVersion}:t;return Array.isArray(e.shader)?e.shader.map(t):[t({frag:V(this,H,`m`,wo).call(this,e.shader||`uvGradient`)})]},vo=function(e,t,n,r){let i=e.chain;if(!i)return;let a=V(this,J,`f`);jo.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(e.srcTexture.needsUpdate=!0);let o={...e.effectStaticUniforms??{}};if(e.effectUniformGenerators)for(let[t,n]of Object.entries(e.effectUniformGenerators))o[t]=n();let s=V(this,X,`f`).right-V(this,X,`f`).left,c=V(this,X,`f`).bottom-V(this,X,`f`).top,l=Tn(t,c,V(this,io,`f`),V(this,ao,`f`)),u=V(this,oo,`f`)+V(this,io,`f`)-l.x,d=V(this,so,`f`)+V(this,ao,`f`)-l.y,f=t.right-t.left,p=t.bottom-t.top,m=r-(e.effectLastRenderTime??r);e.effectLastRenderTime=r;let h=V(this,H,`m`,yo).call(this)&&V(this,K,`f`)?li(V(this,K,`f`)):null;i.run({time:r-e.startTime,deltaTime:m,mouse:[u*a,d*a],mouseViewport:[V(this,oo,`f`)*a,V(this,so,`f`)*a],intersection:n.intersection,enterTime:r-e.enterTime,leaveTime:r-e.leaveTime,resolvedUniforms:o,canvasSize:[s,c],canvasBufferSize:[s*a,c*a],elementSize:[f,p],elementBufferSize:[f*a,p*a],elementRectOnCanvasPx:{x:l.x*a,y:l.y*a,w:l.w*a,h:l.h*a},finalTarget:h,isVisible:n.isVisible})},yo=function(){return V(this,G,`f`).length>0||V(this,q,`f`)!==null&&V(this,Ga,`f`)},bo=function(e){for(let t of e)if(V(this,Ka,`f`).has(t))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");for(let t of e)V(this,Ka,`f`).add(t)},xo=function(e){for(let t of e)V(this,Ka,`f`).delete(t)},So=function(e){let t=e.hitTestPadBuffer,n=V(this,J,`f`);return di({top:t.top/n,right:t.right/n,bottom:t.bottom/n,left:t.left/n})},Co=function(e,t,n){let r=gi(t,e.chain?V(this,H,`m`,So).call(this,e.chain):e.overflow),i=e.isFullScreen||Fo(V(this,no,`f`),r),a=gi(V(this,no,`f`),e.intersection.rootMargin),o=yi(a,t),s=e.isFullScreen||Io(a,t,o,e.intersection.threshold);!e.isInLogicalViewport&&s&&(e.enterTime=n,e.leaveTime=1/0),e.isInLogicalViewport&&!s&&(e.leaveTime=n),e.isInViewport=i,e.isInLogicalViewport=s;let c=i&&n-e.leaveTime<=e.release||e.forceRender===!0&&t.right>t.left&&t.bottom>t.top;if(c&&!e.chain&&e.passes.length>0){let t=e.passes[0].uniforms;t.intersection.value=o,t.enterTime.value=n-e.enterTime,t.leaveTime.value=n-e.leaveTime}return{isVisible:c,intersection:o,rectWithOverflow:r}},wo=function(e){return e in r?r[e]:e},Z=function(e,t,n,r,i){let a=V(this,Va,`f`);i&&t!==null&&t!==V(this,K,`f`)&&(a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.viewport(0,0,t.width,t.height),a.clear(a.COLOR_BUFFER_BIT));let o=r.viewport;o&&o.value instanceof Pn&&o.value.set(n.x*V(this,J,`f`),n.y*V(this,J,`f`),n.w*V(this,J,`f`),n.h*V(this,J,`f`));try{Qn(a,V(this,Ha,`f`),e,t,n,V(this,ro,`f`)[0],V(this,ro,`f`)[1],V(this,J,`f`))}catch(e){console.error(e)}},To=function(e,t,n){let r=e.passes[0].uniforms.offset.value;r.x=t*V(this,J,`f`),r.y=n*V(this,J,`f`)},Eo=function(e){let t=e.length===1&&!(`frag`in e[0])?e[0]:null;if(t&&t.effect!==void 0){V(this,H,`m`,Do).call(this,t,t.effect);return}let n=[],r=[];for(let t of e)`frag`in t&&r.push(t);for(let e=0;e<r.length-1;e++)r[e].target||(r[e]={...r[e],target:`pass${e}`});for(let t of e){let e,r,i;if(`frag`in t)e=t.frag,r=new Na(V(this,U,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,t.size,t.target!==void 0,t.glslVersion),i=t.target;else{if(t.shader===void 0)throw Error("VFXPostEffect requires `shader` (the `effect` path is not implemented yet).");e=V(this,H,`m`,wo).call(this,t.shader),r=new Na(V(this,U,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,void 0,!1,t.glslVersion),t.persistent&&r.registerBufferUniform(`backbuffer`),i=void 0}n.push(e);let a={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`&&(a[e]=n);V(this,G,`f`).push({pass:r,target:i,generators:a})}for(let e of r)e.target&&V(this,Wa,`f`).set(e.target,void 0);let i=V(this,G,`f`).map(e=>e.target).filter(e=>e!==void 0);for(let e=0;e<V(this,G,`f`).length;e++)for(let t of i)n[e].match(RegExp(`uniform\\s+sampler2D\\s+${t}\\b`))&&V(this,G,`f`)[e].pass.registerBufferUniform(t)},Do=function(e,t){e.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified on post-effect; `effect` takes precedence.");let n=Array.isArray(t)?[...t]:[t];V(this,H,`m`,bo).call(this,n);let r=si(()=>{let e=V(this,K,`f`);if(!e)throw Error(`[VFX-JS] post-effect chain active without target`);return e.texture},()=>V(this,K,`f`)?.width??0,()=>V(this,K,`f`)?.height??0),i={autoCrop:!0,glslVersion:e.glslVersion??`300 es`},a=new Wi(V(this,U,`f`),V(this,Ha,`f`),V(this,J,`f`),n,i,r,!0,V(this,Ua,`f`));if(e.uniforms)for(let[t,n]of Object.entries(e.uniforms))typeof n==`function`?(V(this,Ja,`f`)[t]=n,V(this,qa,`f`)[t]=n()):V(this,qa,`f`)[t]=n;B(this,q,a,`f`),B(this,Ya,V(this,Qa,`f`),`f`),a.initAll().then(()=>{V(this,q,`f`)===a&&B(this,Ga,!0,`f`)}).catch(e=>{console.error(`[VFX-JS] Post-effect init failed; post-effect disabled:`,e),V(this,q,`f`)===a&&(V(this,H,`m`,xo).call(this,V(this,q,`f`).effects),V(this,q,`f`).dispose(),B(this,q,null,`f`),B(this,Ga,!1,`f`))})},Oo=function(e,t){let n=V(this,q,`f`);if(!n)return;let r=V(this,J,`f`),i={...V(this,qa,`f`)};for(let[e,t]of Object.entries(V(this,Ja,`f`)))i[e]=t();let a=V(this,X,`f`).right-V(this,X,`f`).left,o=V(this,X,`f`).bottom-V(this,X,`f`).top,s=t-V(this,Ya,`f`);B(this,Ya,t,`f`);let c=[a,o],l=[a*r,o*r],u={x:e.x*r,y:e.y*r,w:e.w*r,h:e.h*r};n.run({time:t,deltaTime:s,mouse:[V(this,oo,`f`)*r,V(this,so,`f`)*r],mouseViewport:[V(this,oo,`f`)*r,V(this,so,`f`)*r],intersection:1,enterTime:0,leaveTime:0,resolvedUniforms:i,canvasSize:c,canvasBufferSize:l,elementSize:c,elementBufferSize:l,elementRectOnCanvasPx:u,finalTarget:null,isVisible:!0})},ko=function(e,t){if(!V(this,K,`f`))return;let n=V(this,K,`f`).texture,r=new Map;for(let{pass:e,target:t}of V(this,G,`f`))t&&e.backbuffer&&r.set(t,e.backbuffer.texture);for(let i=0;i<V(this,G,`f`).length;i++){let{pass:a,target:o,generators:s}=V(this,G,`f`)[i],c=i===V(this,G,`f`).length-1,l=V(this,oo,`f`)+V(this,io,`f`),u=V(this,so,`f`)+V(this,ao,`f`),d=a.size;if(d){let[r,i]=d;a.uniforms.src.value=n,a.uniforms.resolution.value.set(r,i),a.uniforms.offset.value.set(0,0),a.uniforms.time.value=t,a.uniforms.mouse.value.set(l/e.w*r,u/e.h*i)}else a.setUniforms(n,V(this,J,`f`),e,t,l,u);a.uniforms.passIndex.value=i,a.updateCustomUniforms(s);for(let[e,t]of r){let n=a.uniforms[e];n&&(n.value=t)}if(c)a.backbuffer?(a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture),V(this,H,`m`,Z).call(this,a.pass,a.backbuffer.target,e,a.uniforms,!0),a.backbuffer.swap(),V(this,W,`f`).setUniforms(a.backbuffer.texture,V(this,J,`f`),e),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,null,e,V(this,W,`f`).uniforms,!1)):V(this,H,`m`,Z).call(this,a.pass,null,e,a.uniforms,!1);else if(a.backbuffer){a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture);let t=d?En(0,0,d[0]/V(this,J,`f`),d[1]/V(this,J,`f`)):e;V(this,H,`m`,Z).call(this,a.pass,a.backbuffer.target,t,a.uniforms,!0),a.backbuffer.swap(),n=a.backbuffer.texture,o&&r.set(o,a.backbuffer.texture)}else{let t=o??`postEffect${i}`,s=V(this,Wa,`f`).get(t),c=d?d[0]:e.w*V(this,J,`f`),l=d?d[1]:e.h*V(this,J,`f`);s&&s.width===c&&s.height===l||(s?.dispose(),s=Ta(V(this,U,`f`),c,l,{float:a.float}),V(this,Wa,`f`).set(t,s));let u=d?En(0,0,d[0]/V(this,J,`f`),d[1]/V(this,J,`f`)):e;V(this,H,`m`,Z).call(this,a.pass,s,u,a.uniforms,!0),n=s.texture,o&&r.set(o,s.texture)}}},Ao=function(e,t){let n=e*V(this,J,`f`),r=t*V(this,J,`f`);V(this,K,`f`)&&V(this,K,`f`).width===n&&V(this,K,`f`).height===r||(V(this,K,`f`)?.dispose(),B(this,K,Ta(V(this,U,`f`),n,r),`f`));for(let{pass:n}of V(this,G,`f`))n.persistent&&!n.backbuffer?n.initializeBackbuffer(V(this,U,`f`),e,t,V(this,J,`f`)):n.backbuffer&&n.resizeBackbuffer(e,t)};function Fo(e,t){return t.left<=e.right&&t.right>=e.left&&t.top<=e.bottom&&t.bottom>=e.top}function Io(e,t,n,r){return r===0?Fo(e,t):n>=r}function Lo(e){return e===!0?[!0,fi]:e===void 0?[!1,fi]:[!1,di(e)]}function Ro(e,t,n,r,i,a,o){let s=i[0]+a[0]-n.x,c=i[1]+a[1]-n.y;return r?{resolution:[r[0],r[1]],offset:[0,0],mouse:[s/n.w*r[0],c/n.h*r[1]]}:{resolution:[e.width*o,e.height*o],offset:[(t.x-n.x)*o,(t.y-n.y)*o],mouse:[s*o,c*o]}}function zo(e){return{threshold:e?.threshold??0,rootMargin:di(e?.rootMargin??0)}}function Bo(e,t){let n=e.source;if(!n)return 0;if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return t===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return t===`w`?n.videoWidth:n.videoHeight;let r=n;return t===`w`?r.width:r.height}function Vo(e){return e===`repeat`?`repeat`:e===`mirror`?`mirror`:`clamp`}function Ho(e){if(!e)return[`clamp`,`clamp`];if(Array.isArray(e))return[Vo(e[0]),Vo(e[1])];let t=Vo(e);return[t,t]}function Uo(e,t,n){return Math.max(t,Math.min(n,e))}function Wo(e){return!(e instanceof HTMLImageElement||e instanceof HTMLVideoElement||e instanceof HTMLCanvasElement)}function Go(){try{let e=document.createElement(`canvas`);return(e.getContext(`webgl2`)||e.getContext(`webgl`))!==null}catch{return!1}}var Ko=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Q=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},qo,$,Jo,Yo,Xo,Zo,Qo,$o,es,ts,ns,rs;function is(){if(typeof window>`u`)throw`Cannot find 'window'. VFX-JS only runs on the browser.`;if(typeof document>`u`)throw`Cannot find 'document'. VFX-JS only runs on the browser.`}function as(e){return{position:e?`fixed`:`absolute`,top:0,left:0,width:`0px`,height:`0px`,"z-index":9999,"pointer-events":`none`}}var os=class e{static init(t){try{return new e(t)}catch{return null}}constructor(e={}){if(qo.add(this),$.set(this,void 0),Jo.set(this,void 0),Yo.set(this,new Map),Xo.set(this,new Set),is(),!Go())throw Error(`[VFX-JS] WebGL is not available in this environment.`);let t=rn(e),n=document.createElement(`canvas`),r=as(t.fixedCanvas);for(let[e,t]of Object.entries(r))n.style.setProperty(e,t.toString());t.zIndex!==void 0&&n.style.setProperty(`z-index`,t.zIndex.toString()),(t.wrapper??document.body).appendChild(n),Ko(this,Jo,n,`f`),Ko(this,$,new Po(t,n),`f`),t.autoplay&&Q(this,$,`f`).play()}async add(e,t,n){e instanceof HTMLImageElement?await Q(this,qo,`m`,es).call(this,e,t):e instanceof HTMLVideoElement?await Q(this,qo,`m`,ts).call(this,e,t):e instanceof HTMLCanvasElement?i(e)&&n?await Q(this,qo,`m`,$o).call(this,e,t,n):await Q(this,qo,`m`,ns).call(this,e,t):await Q(this,qo,`m`,rs).call(this,e,t)}updateHICTexture(e,t){Q(this,$,`f`).updateHICTexture(e,t)}get maxTextureSize(){return Q(this,$,`f`).maxTextureSize}get canvas(){return Q(this,Jo,`f`)}addHTML(e,t){return Q(this,qo,`m`,Zo).call(this,e,t,!1)}addHTMLWithStill(e,t){return Q(this,qo,`m`,Zo).call(this,e,t,!0)}addTransition(e,t={}){let n=new nn(this,e,t,()=>Q(this,Xo,`f`).delete(n));return Q(this,Xo,`f`).add(n),n}freezeInside(e){return Q(this,$,`f`).freezeInside(e)}lockSize(e){let t=Q(this,Yo,`f`).get(e);return t?ye(t):()=>{}}forceRender(e){let t=Q(this,Yo,`f`).get(e)??e;return Q(this,$,`f`).forceRender(t)}remove(e){let t=Q(this,Yo,`f`).get(e);t?(Te(t,e),Q(this,Yo,`f`).delete(e),Q(this,$,`f`).removeElement(t)):Q(this,$,`f`).removeElement(e)}updateEffects(e,t){let n=Q(this,Yo,`f`).get(e)??e;return Q(this,$,`f`).updateElementEffects(n,t)}async update(e){await this.updateInTime(e)}async updateInTime(e){let t=Q(this,Yo,`f`).get(e)??(e instanceof HTMLCanvasElement?e:null);return(t?ve(t):void 0)||(e instanceof HTMLImageElement?await Q(this,$,`f`).updateImageElement(e):e instanceof HTMLCanvasElement?Q(this,$,`f`).updateCanvasElement(e):await Q(this,$,`f`).updateTextElement(e),!0)}play(){Q(this,$,`f`).play()}stop(){Q(this,$,`f`).stop()}render(){Q(this,$,`f`).render()}get time(){return Q(this,$,`f`).time}setTime(e){Q(this,$,`f`).setTime(e)}get timeScale(){return Q(this,$,`f`).timeScale}set timeScale(e){Q(this,$,`f`).timeScale=e}destroy(){for(let e of Q(this,Xo,`f`))e.destroy();Q(this,Xo,`f`).clear();for(let[e,t]of Q(this,Yo,`f`))Te(t,e);Q(this,Yo,`f`).clear(),Q(this,$,`f`).destroy(),Q(this,Jo,`f`).remove()}};$=new WeakMap,Jo=new WeakMap,Yo=new WeakMap,Xo=new WeakMap,qo=new WeakSet,Zo=async function(e,t,n){if(!De())return console.warn(`html-in-canvas not supported, falling back to dom-to-canvas`),this.add(e,t);t.overlay!==void 0&&console.warn(`addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.`);let{overlay:r,...i}=t,a=Q(this,Yo,`f`).get(e);a&&Q(this,$,`f`).removeElement(a);let{canvas:o,initialCapture:s}=await we(e,{onCapture:e=>{Q(this,$,`f`).updateHICTexture(o,e)},maxSize:Q(this,$,`f`).maxTextureSize,stillCover:n?{zIndex:Q(this,qo,`m`,Qo).call(this)}:void 0});a=o,Q(this,Yo,`f`).set(e,a),await Q(this,qo,`m`,$o).call(this,a,i,s)},Qo=function(){let e=Number.parseInt(Q(this,Jo,`f`).style.zIndex,10);return Number.isNaN(e)?9998:e-1},$o=async function(e,t,n){try{await Q(this,$,`f`).addElement(e,t,n)}finally{xe(e,Q(this,$,`f`).isFrozen(e))}},es=function(e,t){return e.complete?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`load`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},ts=function(e,t){return e.readyState>=3?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`canplay`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},ns=function(e,t){return Q(this,$,`f`).addElement(e,t)},rs=function(e,t){return Q(this,$,`f`).addElement(e,t)};export{os as t};
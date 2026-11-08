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
    `};function i(e){return e.tagName===`CANVAS`&&(e.hasAttribute(`layoutsubtree`)||e.getAttribute(`content`)===`drawable`)}function a(e,t){e.setAttribute(`layoutsubtree`,``),e.setAttribute(`content`,`drawable`),t?.setAttribute(`drawable`,``)}function o(e,t,n,r){if(t.width<=0||t.height<=0)return null;let i=t.left-e.left,a=t.top-e.top;return i+t.width<=0||a+t.height<=0||i>=e.width||a>=e.height?null:[i*n,a*r,t.width*n,t.height*r]}function s(e){let t=e.getBoundingClientRect(),n=getComputedStyle(e),r=Number.parseFloat(n.paddingLeft)||0,i=Number.parseFloat(n.paddingRight)||0,a=Number.parseFloat(n.paddingTop)||0,o=Number.parseFloat(n.paddingBottom)||0,s=e.clientWidth>0?t.width/e.offsetWidth:1,c=e.clientHeight>0?t.height/e.offsetHeight:1;return{left:t.left+(e.clientLeft+r)*s,top:t.top+(e.clientTop+a)*c,width:Math.max(0,e.clientWidth-r-i)*s,height:Math.max(0,e.clientHeight-a-o)*c}}function c(e){return typeof e.checkVisibility==`function`?e.checkVisibility({visibilityProperty:!0,opacityProperty:!0}):getComputedStyle(e).visibility!==`hidden`}function l(e,t){let n=t.querySelectorAll(`canvas`);if(n.length===0)return;let r=t.getBoundingClientRect();if(r.width<=0||r.height<=0)return;let i=e.canvas.width/r.width,a=e.canvas.height/r.height;for(let t of n){if(t.width===0||t.height===0||!c(t))continue;let n=o(r,s(t),i,a);if(n)try{e.drawImage(t,...n)}catch{}}}function u(e){return e.currentSrc||e.src}function d(e,t){let n=e.getBoundingClientRect(),r=e.cloneNode(!0),i=[e,...e.querySelectorAll(`*`)],a=[r,...r.querySelectorAll(`*`)],o=[],s=[];for(let e=0;e<i.length&&e<a.length;e++){let t=i[e],n=a[e];(t.scrollTop||t.scrollLeft)&&o.push([n,t.scrollTop,t.scrollLeft]),t instanceof HTMLScriptElement?s.push([n,document.createComment(`script`)]):t instanceof HTMLCanvasElement||t instanceof HTMLVideoElement?s.push([n,m(t)]):t instanceof HTMLIFrameElement?s.push([n,h(t)]):t instanceof HTMLInputElement&&n instanceof HTMLInputElement?(n.value=t.value,n.checked=t.checked):t instanceof HTMLTextAreaElement&&n instanceof HTMLTextAreaElement?n.value=t.value:t instanceof HTMLSelectElement&&n instanceof HTMLSelectElement?n.selectedIndex=t.selectedIndex:t instanceof HTMLMediaElement&&n.removeAttribute(`autoplay`)}for(let[e,t]of s)e.replaceWith(t);r.setAttribute(`aria-hidden`,`true`);let c=r.style;c.setProperty(`position`,`fixed`),c.setProperty(`left`,`${n.left}px`),c.setProperty(`top`,`${n.top}px`),c.setProperty(`width`,`${n.width}px`),c.setProperty(`height`,`${n.height}px`),c.setProperty(`box-sizing`,`border-box`),c.setProperty(`margin`,`0`),c.setProperty(`pointer-events`,`none`),c.setProperty(`z-index`,t.toString()),e.parentNode?.insertBefore(r,e);let l=r.getBoundingClientRect();(l.left!==n.left||l.top!==n.top)&&(c.setProperty(`left`,`${n.left*2-l.left}px`),c.setProperty(`top`,`${n.top*2-l.top}px`));for(let[e,t,n]of o)e.scrollTop=t,e.scrollLeft=n;return f(i,a),()=>{r.remove()}}function f(e,t){let n=e[0],r=t[0];if(!n||!r||typeof n.getAnimations!=`function`)return;let i=(e,t)=>{if(!(`animationName`in e))return null;let n=e.effect,r=n?.target,i=r?t.get(r):void 0;return i===void 0?null:`${i}|${n?.pseudoElement??``}|${e.animationName}`},a=new Map(t.map((e,t)=>[e,t])),o=new Map;for(let e of r.getAnimations({subtree:!0})){let t=i(e,a);t&&o.set(t,e)}let s=new Map(e.map((e,t)=>[e,t]));for(let e of n.getAnimations({subtree:!0})){let t=i(e,s),n=t&&o.get(t);n&&(n.currentTime=e.currentTime,n.pause())}}function p(e,t){let n=e.getBoundingClientRect(),r=getComputedStyle(e);t.className=e.className,t.style.cssText=e.style.cssText,t.style.width=`${n.width}px`,t.style.height=`${n.height}px`,t.style.display=r.display===`inline`?`inline-block`:r.display,t.style.boxSizing=`border-box`}function m(e){let t=document.createElement(`canvas`),n=e instanceof HTMLVideoElement?e.videoWidth:e.width,r=e instanceof HTMLVideoElement?e.videoHeight:e.height;t.width=Math.max(1,n),t.height=Math.max(1,r),p(e,t);try{t.getContext(`2d`)?.drawImage(e,0,0,t.width,t.height)}catch{}return t}function h(e){let t=document.createElement(`div`);return p(e,t),t}function ee(e){let t=u(e);if(!t||t.startsWith(`data:`))return!1;try{return new URL(t,location.href).origin!==location.origin}catch{return!1}}async function te(e){let t=await(await fetch(e)).blob();return URL.createObjectURL(t)}async function ne(e){let t=Array.from(e.querySelectorAll(`img`)).filter(e=>e.complete&&e.naturalWidth>0&&ee(e));if(t.length===0)return()=>{};let n=new Map,r=[];return await Promise.all(t.map(async e=>{try{let t=u(e),i=await te(t);n.set(e,t),r.push(i),await new Promise(t=>{e.addEventListener(`load`,()=>t(),{once:!0}),e.src=i})}catch{}})),()=>{for(let[e,t]of n)e.src=t;for(let e of r)URL.revokeObjectURL(e)}}var re=[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`],ie=[`position`,`top`,`right`,`bottom`,`left`,`float`,`flex`,`flex-grow`,`flex-shrink`,`flex-basis`,`align-self`,`justify-self`,`place-self`,`order`,`grid-column`,`grid-column-start`,`grid-column-end`,`grid-row`,`grid-row-start`,`grid-row-end`,`grid-area`],g=new WeakMap,ae=new WeakMap,oe=new WeakMap,_=new WeakMap,se=new WeakMap,ce=new WeakMap,le=new WeakMap,ue=new WeakSet,de=new WeakMap,fe=new WeakMap,pe=new WeakSet,me=300;function he(e,t){return new Promise(n=>{let r=t=>{clearTimeout(a),e.delete(i),n(t)},i=()=>r(!0),a=setTimeout(()=>r(!1),t);e.add(i)})}function ge(e){if(e)for(let t of[...e])t()}function _e(e,t,n){if(typeof e.moveBefore==`function`)try{e.moveBefore(t,n);return}catch{}e.insertBefore(t,n)}function ve(e,t=me){let n=fe.get(e);if(!n)return;let r=he(n,t);return e.requestPaint(),r}function ye(e){if(pe.has(e))return()=>{};pe.add(e);let{width:t,height:n,overflow:r}=e.style,i=e.getBoundingClientRect();return e.style.setProperty(`width`,`${i.width}px`),e.style.setProperty(`height`,`${i.height}px`),e.style.setProperty(`overflow`,`hidden`),()=>{if(!pe.has(e))return;pe.delete(e),e.style.width=t,e.style.height=n,e.style.overflow=r;let i=e.firstElementChild;if(i){let t=Math.round(i.getBoundingClientRect().height);e.style.setProperty(`height`,`${t}px`)}}}function be(e){de.get(e)?.(),de.delete(e)}function xe(e,t=!1){requestAnimationFrame(()=>{t||e.getContext(`2d`)?.clearRect(0,0,e.width,e.height),be(e)})}async function Se(e,t){a(e,e.firstElementChild);let n=e.getContext(`2d`);if(!n)throw Error(`Failed to get 2d context from layoutsubtree canvas`);let{onCapture:r,maxSize:i}=t,o=new Set;fe.set(e,o);let s=null,c=null,u=new Promise(e=>{c=e}),d=null,f=t=>{if(t){if(t===d)return;d=t}let a=e.firstElementChild;if(!a||e.width===0||e.height===0||a.getClientRects().length===0)return;a.hasAttribute(`drawable`)||a.setAttribute(`drawable`,``),n.clearRect(0,0,e.width,e.height),n.drawElementImage(a,0,0),l(n,a);let u=e.width,f=e.height;if(i&&(u>i||f>i)){let e=Math.min(i/u,i/f);u=Math.floor(u*e),f=Math.floor(f*e)}s&&s.width===u&&s.height===f||(s=new OffscreenCanvas(u,f));let p=s.getContext(`2d`);p&&(p.clearRect(0,0,u,f),p.drawImage(e,0,0,u,f),c?(c(s),c=null,ge(o)):(n.clearRect(0,0,e.width,e.height),r(s),ge(o)))};e.onpaint=f,e.addEventListener(`paint`,f),ae.set(e,f);let p=new ResizeObserver(t=>{for(let n of t){let t=n.devicePixelContentBoxSize?.[0];if(t)e.width=t.inlineSize,e.height=t.blockSize;else{let t=n.borderBoxSize?.[0];if(t){let n=window.devicePixelRatio;e.width=Math.round(t.inlineSize*n),e.height=Math.round(t.blockSize*n)}}}e.requestPaint()});p.observe(e,{box:`device-pixel-content-box`}),g.set(e,p);let m=e.firstElementChild;if(m){let t=new ResizeObserver(t=>{if(pe.has(e))return;let n=t[0].borderBoxSize?.[0];if(!n)return;let r=`${Math.round(n.blockSize)}px`;r!==e.style.height&&e.style.setProperty(`height`,r)});t.observe(m),oe.set(e,t)}return u}function Ce(e){e.onpaint=null,ge(fe.get(e)),fe.delete(e);let t=ae.get(e);t&&(e.removeEventListener(`paint`,t),ae.delete(e));let n=g.get(e);n&&(n.disconnect(),g.delete(e));let r=oe.get(e);r&&(r.disconnect(),oe.delete(e))}async function we(e,t){let n=e.getBoundingClientRect(),r=document.createElement(`canvas`);e.hasAttribute(`drawable`)||ue.add(e),a(r,e),r.className=e.className;let i=e.getAttribute(`style`);i&&r.setAttribute(`style`,i),r.style.setProperty(`padding`,`0`),r.style.setProperty(`border`,`none`),r.style.setProperty(`box-sizing`,`content-box`),r.style.setProperty(`background`,`transparent`);let o=getComputedStyle(e),s=o.display===`inline`?`block`:o.display;r.style.setProperty(`display`,s);for(let e of re)r.style.setProperty(e,o.getPropertyValue(e));for(let e of ie)r.style.setProperty(e,o.getPropertyValue(e));e.style.width.endsWith(`px`)?r.style.setProperty(`width`,`${n.width}px`):r.style.setProperty(`width`,`100%`),r.style.height||r.style.setProperty(`height`,`${n.height}px`);let c=window.devicePixelRatio;r.width=Math.round(n.width*c),r.height=Math.round(n.height*c),t.stillCover&&de.set(r,d(e,t.stillCover.zIndex)),_.set(e,e.style.margin),se.set(e,e.style.width),ce.set(e,e.style.boxSizing),e.parentNode?.insertBefore(r,e),getComputedStyle(r).display,_e(r,e,null),e.style.setProperty(`margin`,`0`),e.style.setProperty(`width`,`100%`),e.style.setProperty(`box-sizing`,`border-box`);let l=await ne(e);return le.set(r,l),{canvas:r,initialCapture:await Se(r,t)}}function Te(e,t){Ce(e),be(e);let n=le.get(e);n&&(n(),le.delete(e));let r=e.parentNode;r&&_e(r,t,e),e.remove(),ue.has(t)&&(t.removeAttribute(`drawable`),ue.delete(t));let i=_.get(t);i!==void 0&&(t.style.margin=i,_.delete(t));let a=se.get(t);a!==void 0&&(t.style.width=a,se.delete(t));let o=ce.get(t);o!==void 0&&(t.style.boxSizing=o,ce.delete(t))}var Ee;function De(){if(Ee!==void 0)return Ee;try{let e=document.createElement(`canvas`),t=e.getContext(`2d`);Ee=t!==null&&typeof t.drawElementImage==`function`&&typeof e.requestPaint==`function`}catch{Ee=!1}return Ee}var Oe=`#version 300 es
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
`)[0]]}var Ne=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Pe=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Fe,Ie=new Map;function Le(e){let t=Ie.get(e);return t===void 0&&(t=Ae(e),Ie.set(e,t)),t}var Re=new WeakMap;function ze(e){let t=Re.get(e);return t||(t=new Set,Re.set(e,t)),t}function Be(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return n<=o&&r<=s&&n+i>=o+c&&r+a>=s+l}function Ve(e,t){let n=Me(t);n?(console.error(`[VFX-JS] transition "${e}" failed to compile; cutting to the new content.\n  ${n.join(`
  `)}`),console.debug(t)):console.error(`[VFX-JS] transition "${e}" failed; cutting to the new content.`,t)}var He=class{constructor(e={}){Fe.set(this,null),this.params=e}uniforms(e){return{}}start(e){Ne(this,Fe,e,`f`)}end(){Ne(this,Fe,null,`f`)}outputRect(e){let t=Pe(this,Fe,`f`)?.overflow??this.overflow;if(t===void 0||Be(e.contentRect,e.canvasRect))return;if(t===!0)return e.canvasRect;let n=t*e.pixelRatio,[r,i,a,o]=e.contentRect;return[r-n,i-n,a+n*2,o+n*2]}render(e){if(e.holding){e.blit(e.src);return}let t=Le(this.frag),n=ze(e.gl);if(n.has(t))e.cut(),e.blit(e.src);else try{e.draw({frag:t,uniforms:{...this.uniforms(e),from:e.from,src:e.src,t:e.progress.t,reverse:+!!e.reverse,resolution:[e.dims.elementPixel[0],e.dims.elementPixel[1]],time:e.time},target:e.target})}catch(r){n.add(t),Ve(this.name,r),e.cut(),e.blit(e.src)}}};Fe=new WeakMap;var Ue=class extends He{constructor(){super(...arguments),this.name=`crossfade`,this.frag=`
vec4 transition(vec2 uv, float t) {
  return mix(readFrom(uv), readTo(uv), t);
}
`}},v=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},y=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},We,Ge,Ke,qe,Je,Ye,Xe,Ze,Qe,$e,et,tt,nt,rt,it,at,ot,st=e=>e*e*(3-2*e);function ct(e,t){return typeof e==`function`?e(t):e===`linear`?t:st(t)}var lt={t:0,x:0},ut=class{constructor(){We.add(this),this.enabled=!1,Ge.set(this,null),Ke.set(this,[0,0]),qe.set(this,[]),Je.set(this,!1),Ye.set(this,null),Xe.set(this,null),Ze.set(this,lt),Qe.set(this,null),$e.set(this,null)}snapshot(){return v(this,We,`m`,et).call(this),y(this,Ye,null,`f`),this.enabled=!0,new Promise(e=>v(this,qe,`f`).push(e))}start(e){return v(this,We,`m`,et).call(this),y(this,Ye,e,`f`),y(this,$e,e.onEnd??null,`f`),y(this,Xe,null,`f`),y(this,Ze,lt,`f`),y(this,Je,!1,`f`),this.enabled=!1,new Promise(e=>{y(this,Qe,e,`f`)})}cancel(){v(this,We,`m`,et).call(this),y(this,Ye,null,`f`),y(this,Je,!1,`f`),this.enabled=!1,v(this,We,`m`,tt).call(this)}get frame(){let e=v(this,Ge,`f`);return!e||!v(this,Je,`f`)&&!v(this,Ye,`f`)?null:{from:e,progress:v(this,Ze,`f`),holding:v(this,Ye,`f`)===null}}cut(){v(this,Ye,`f`)&&(y(this,Ye,null,`f`),v(this,We,`m`,et).call(this))}update(e){let t=v(this,Ye,`f`);if(!t)return;v(this,Xe,`f`)===null&&y(this,Xe,e.time,`f`);let n=(e.time-v(this,Xe,`f`))/t.duration;if(n>=1){y(this,Ye,null,`f`),v(this,We,`m`,et).call(this);return}let r=Math.max(n,0);y(this,Ze,{t:ct(t.ease,r),x:r},`f`)}render(e){v(this,qe,`f`).length>0&&(e.blit(e.src,v(this,We,`m`,nt).call(this,e)),y(this,Je,!0,`f`),v(this,We,`m`,tt).call(this)),v(this,Ge,`f`)&&v(this,Je,`f`)?e.blit(v(this,Ge,`f`)):(this.enabled=!1,e.blit(e.src))}dispose(){y(this,Ge,null,`f`),y(this,Ke,[0,0],`f`),v(this,We,`m`,et).call(this),v(this,We,`m`,tt).call(this)}};Ge=new WeakMap,Ke=new WeakMap,qe=new WeakMap,Je=new WeakMap,Ye=new WeakMap,Xe=new WeakMap,Ze=new WeakMap,Qe=new WeakMap,$e=new WeakMap,We=new WeakSet,et=function(){let e=v(this,$e,`f`);y(this,$e,null,`f`),e?.();let t=v(this,Qe,`f`);y(this,Qe,null,`f`),t?.()},tt=function(){let e=v(this,qe,`f`);y(this,qe,[],`f`);for(let t of e)t()},nt=function(e){let[t,n]=e.dims.elementPixel;return v(this,Ge,`f`)&&v(this,Ke,`f`)[0]===t&&v(this,Ke,`f`)[1]===n||(v(this,Ge,`f`)?.dispose(),y(this,Ge,e.createRenderTarget({size:[t,n]}),`f`),y(this,Ke,[t,n],`f`)),v(this,Ge,`f`)};var dt=class{constructor(e,t){rt.add(this),it.set(this,void 0),at.set(this,null),this.effect=e,y(this,it,t,`f`)}get enabled(){return v(this,at,`f`)!==null&&typeof this.effect.render==`function`&&this.effect.enabled!==!1}start(e){y(this,at,e,`f`),this.effect.start?.(e)}end(){v(this,at,`f`)!==null&&(y(this,at,null,`f`),this.effect.end?.())}init(e){return this.effect.init?.(e)}update(e){let t=v(this,it,`f`).frame;if(!t||t.holding)return;let n=v(this,rt,`m`,ot).call(this,e);n&&this.effect.update?.(n)}render(e){let t=v(this,rt,`m`,ot).call(this,e);t&&this.effect.render?this.effect.render(t):e.blit(e.src)}outputRect(e){return v(this,at,`f`)?this.effect.outputRect?.(e):void 0}dispose(){this.effect.dispose?.()}};it=new WeakMap,at=new WeakMap,rt=new WeakSet,ot=function(e){let t=v(this,it,`f`).frame,n=v(this,at,`f`);return!t||!n?null:{...e,from:t.from,progress:t.progress,holding:t.holding,reverse:n.reverse,run:n,cut:()=>v(this,it,`f`).cut()}};var b=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},x=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},S,ft,C,pt,mt,ht,gt,_t,vt,yt,bt,xt,St,Ct,wt,Tt,Et,Dt,Ot,kt,At,jt,Mt,Nt,Pt,Ft,It,Lt,Rt,zt,Bt,Vt,Ht,Ut,Wt,Gt,Kt,qt=.6,Jt=300,Yt=1e3;function Xt(e,t){let n=t.transition===void 0?e.params===void 0&&t.params===void 0?void 0:{...e.params,...t.params}:t.params;return{transition:t.transition??e.transition,params:n,reverse:t.reverse??e.reverse,duration:t.duration??e.duration,overflow:t.overflow??e.overflow,ease:t.ease??e.ease}}function Zt(e,t={}){let n=Xt(e,t);return{transition:n.transition??Ue,params:n.params,reverse:n.reverse??!1,duration:n.duration??qt,overflow:n.overflow,ease:n.ease}}var Qt=e=>typeof e==`function`;function $t(e,t){return Array.isArray(e)&&Array.isArray(t)?e.length===t.length&&e.every((e,n)=>e===t[n]):e===t}function en(e,t){let n=e??{},r=t??{},i=Object.keys(n);return i.length===Object.keys(r).length&&i.every(e=>e in r&&$t(n[e],r[e]))}var tn=new WeakMap;function nn(e){let t=e.getBoundingClientRect();return t.right>0&&t.bottom>0&&t.left<window.innerWidth&&t.top<window.innerHeight}function rn(e){return e.tagName===`IMG`?e.loading===`lazy`&&!nn(e):e.preload===`none`}function an(e,t,n=Jt){let r=[];for(let t of e.querySelectorAll(`img, video`)){let e=t.tagName===`IMG`;!(e?t.complete:t.readyState>=2)&&!rn(t)&&r.push(new Promise(n=>{let r=()=>n();t.addEventListener(e?`load`:`loadeddata`,r,{once:!0}),t.addEventListener(`error`,r,{once:!0})}))}return t&&r.push(t),r.length===0?Promise.resolve():new Promise(e=>{let t=setTimeout(e,n),i=()=>{clearTimeout(t),e()};Promise.all(r).then(i,i)})}function on(e,t){return new Promise((n,r)=>{let i=setTimeout(()=>n(!1),t);e.then(()=>{clearTimeout(i),n(!0)},e=>{clearTimeout(i),r(e)})})}var sn=()=>new Promise(e=>requestAnimationFrame(()=>e()));function cn(e,t){return e.length===t.length&&e.every((e,n)=>e===t[n])}var ln=class{constructor(e,t,n={},r,i=new ut){S.add(this),ft.set(this,void 0),C.set(this,void 0),pt.set(this,void 0),mt.set(this,void 0),ht.set(this,void 0),gt.set(this,void 0),_t.set(this,[]),vt.set(this,[]),yt.set(this,!1),bt.set(this,!1),xt.set(this,!1),St.set(this,0),Ct.set(this,null),wt.set(this,!1),Tt.set(this,!1),Et.set(this,null),Dt.set(this,[]),Ot.set(this,null),kt.set(this,null),At.set(this,null),b(this,gt,r,`f`),b(this,ft,e,`f`),b(this,C,t,`f`),b(this,pt,n,`f`),b(this,mt,i,`f`),b(this,ht,n.keepWrapped??!1,`f`)}get running(){return x(this,Ct,`f`)!==null}show(e,t={}){let n=x(this,S,`m`,jt).call(this,e),{remove:r=!1,...i}=t;if(!this.running&&x(this,S,`m`,Mt).call(this,n))return Promise.resolve();let a=x(this,pt,`f`).slideSpec?.(n),o=a?Xt(a,i):i;return this.run(()=>{n.parentElement!==x(this,C,`f`)&&x(this,C,`f`).append(n);for(let e of Array.from(x(this,C,`f`).children))e!==n&&(r?e.remove():e.hidden=!0);n.hidden=!1},o)}async run(e,t={}){var n;if(x(this,wt,`f`)){await e();return}let r=b(this,St,(n=x(this,St,`f`),++n),`f`);b(this,Ct,r,`f`);try{await x(this,S,`m`,Nt).call(this,r,e,t)}finally{x(this,Ct,`f`)===r&&b(this,Ct,null,`f`),x(this,St,`f`)===r&&(x(this,S,`m`,Vt).call(this),x(this,S,`m`,Bt).call(this),x(this,S,`m`,It).call(this))}}cancel(){var e;let t=b(this,St,(e=x(this,St,`f`),++e),`f`);b(this,Ct,null,`f`),x(this,S,`m`,Ut).call(this),x(this,mt,`f`).cancel(),x(this,S,`m`,Vt).call(this),x(this,S,`m`,Bt).call(this),x(this,S,`m`,It).call(this),x(this,S,`m`,Gt).call(this,t)}destroy(){x(this,wt,`f`)||(b(this,wt,!0,`f`),this.cancel(),b(this,Ot,null,`f`),x(this,gt,`f`)?.call(this))}};ft=new WeakMap,C=new WeakMap,pt=new WeakMap,mt=new WeakMap,ht=new WeakMap,gt=new WeakMap,_t=new WeakMap,vt=new WeakMap,yt=new WeakMap,bt=new WeakMap,xt=new WeakMap,St=new WeakMap,Ct=new WeakMap,wt=new WeakMap,Tt=new WeakMap,Et=new WeakMap,Dt=new WeakMap,Ot=new WeakMap,kt=new WeakMap,At=new WeakMap,S=new WeakSet,jt=function(e){let t=x(this,C,`f`),n=typeof e==`number`?t.children[e]:typeof e==`string`?t.querySelector(e):e;if(!n)throw TypeError(`[VFX-JS] show(): no slide for ${e}.`);if(n.parentElement!==t&&(n.isConnected||t.contains(n)))throw TypeError(`[VFX-JS] show(): the slide must be a direct child of the container.`);return n},Mt=function(e){return e.parentElement!==x(this,C,`f`)||e.hidden?!1:Array.from(x(this,C,`f`).children).every(t=>t===e||t.hidden)},Nt=async function(e,t,n){let r=()=>e===x(this,St,`f`),i=!1,a=async()=>{i||(i=!0,await t())},o=async()=>{x(this,S,`m`,Ut).call(this),x(this,mt,`f`).cancel(),await a(),r()&&(x(this,Tt,`f`)&&x(this,ht,`f`)&&await x(this,ft,`f`).update(x(this,C,`f`)),x(this,S,`m`,Gt).call(this,e))},s=null;if(typeof n!=`function`){if(s=x(this,S,`m`,Pt).call(this,Zt(x(this,pt,`f`),n)),!r())return a();if(s===null)return o()}x(this,S,`m`,zt).call(this);try{await x(this,S,`m`,Wt).call(this,s?.slots??null,r,!0)}catch(e){return console.error(`[VFX-JS] transition failed to wrap the element; cutting to the new content.`,e),a()}if(!r())return a();x(this,vt,`f`).push(x(this,ft,`f`).lockSize(x(this,C,`f`))),x(this,vt,`f`).push(x(this,ft,`f`).forceRender(x(this,C,`f`)));let c=await on(x(this,mt,`f`).snapshot(),Yt);if(!r())return a();if(!c){x(this,S,`m`,Rt).call(this),await a(),r()&&x(this,S,`m`,Gt).call(this,e);return}s&&x(this,S,`m`,Lt).call(this,e,s);let l;try{await a(),typeof n==`function`&&r()&&(l=n())}catch(t){throw r()&&(x(this,S,`m`,Ut).call(this),x(this,mt,`f`).cancel(),x(this,S,`m`,Gt).call(this,e)),t}if(!r())return;if(s===null){if(s=x(this,S,`m`,Pt).call(this,Zt(x(this,pt,`f`),l)),!r())return;if(s===null)return o();try{await x(this,S,`m`,Wt).call(this,s.slots,r,!1)}catch(e){return console.error(`[VFX-JS] transition failed to swap the effects; cutting to the new content.`,e),o()}if(!r())return;x(this,S,`m`,Lt).call(this,e,s)}x(this,S,`m`,zt).call(this);try{await x(this,S,`m`,Kt).call(this)}catch(e){console.error(`[VFX-JS] transition waitFor failed:`,e)}if(!r()||(!await x(this,ft,`f`).updateInTime(x(this,C,`f`))&&!x(this,bt,`f`)&&(b(this,bt,!0,`f`),console.warn(`[VFX-JS] transition: the new content was not captured in time; it may pop in during the run.`)),!r())||(await sn(),!r()))return;let u=await on(x(this,mt,`f`).start({duration:s.run.duration,ease:s.ease,onEnd:()=>x(this,S,`m`,Ut).call(this,e)}),s.run.duration*1e3+Yt);r()&&(u||x(this,S,`m`,Rt).call(this),x(this,S,`m`,Gt).call(this,e))},Pt=function(e){if(e.duration<=0)return null;let t=e.transition;if(!Qt(t)&&!x(this,S,`m`,Ft).call(this,t))return null;let n,r;try{({transition:n,slots:r}=x(this,S,`m`,Ht).call(this,t,e.params))}catch(e){return console.error(`[VFX-JS] transition "${t.name}" constructor failed; cutting to the new content.`,e),null}let i={reverse:e.reverse,duration:e.duration},a=e.overflow??n.overflow;return a!==void 0&&(i.overflow=a),{run:i,ease:e.ease??n.ease??`smoothstep`,slots:r}},Ft=function(e){let t=tn.get(e);return t&&t!==this?(x(this,xt,`f`)||(b(this,xt,!0,`f`),console.warn(`[VFX-JS] transition "${e.name??`unnamed`}" instance is running in another container; cutting to the new content. Pass the class to share it.`)),!1):(x(this,kt,`f`)!==e&&x(this,S,`m`,It).call(this),tn.set(e,this),b(this,kt,e,`f`),!0)},It=function(){let e=x(this,kt,`f`);b(this,kt,null,`f`),e&&tn.get(e)===this&&tn.delete(e)},Lt=function(e,{run:t,slots:n}){x(this,S,`m`,Ut).call(this),b(this,At,{id:e,slots:n},`f`);for(let e of n)e.start(t)},Rt=function(){x(this,yt,`f`)||(b(this,yt,!0,`f`),console.warn(`[VFX-JS] transition target did not render in time; cutting to the new content.`)),x(this,S,`m`,Ut).call(this),x(this,mt,`f`).cancel()},zt=function(){x(this,_t,`f`).push(x(this,ft,`f`).freezeInside(x(this,C,`f`)))},Bt=function(){let e=x(this,vt,`f`);b(this,vt,[],`f`);for(let t of e)t()},Vt=function(){let e=x(this,_t,`f`);b(this,_t,[],`f`);for(let t of e)t()},Ht=function(e,t){let n=x(this,Ot,`f`);if(n?.key.source===e&&(!Qt(e)||en(n.key.params,t)))return n;let r=Qt(e)?new e(t):e,i=[new dt(r,x(this,mt,`f`))];return b(this,Ot,{key:{source:e,params:t},transition:r,slots:i},`f`),{transition:r,slots:i}},Ut=function(e){let t=x(this,At,`f`);if(t&&(e===void 0||t.id===e)){b(this,At,null,`f`);for(let e of t.slots)e.end()}},Wt=async function(e,t,n){if(x(this,Et,`f`)&&await x(this,Et,`f`),!t())return;let r=e===null?x(this,Tt,`f`)?x(this,Dt,`f`):[x(this,mt,`f`)]:[x(this,mt,`f`),...e];if(x(this,Tt,`f`)){if(!cn(r,x(this,Dt,`f`))){b(this,Dt,r,`f`);let e=x(this,ft,`f`).updateEffects(x(this,C,`f`),r).finally(()=>{b(this,Et,null,`f`)});b(this,Et,e,`f`),await e}n&&await x(this,ft,`f`).update(x(this,C,`f`))}else{let e=x(this,ft,`f`).addHTMLWithStill(x(this,C,`f`),{effect:r}).then(()=>{b(this,Tt,!0,`f`),b(this,Dt,r,`f`)}).finally(()=>{b(this,Et,null,`f`)});b(this,Et,e,`f`),await e}},Gt=function(e){if(x(this,ht,`f`)&&!x(this,wt,`f`))return;let t=()=>{e===x(this,St,`f`)&&x(this,Tt,`f`)&&(b(this,Tt,!1,`f`),b(this,Dt,[],`f`),x(this,ft,`f`).remove(x(this,C,`f`)))};x(this,Et,`f`)?x(this,Et,`f`).then(t,()=>{}):t()},Kt=function(){let e=x(this,pt,`f`).waitFor??`media`;return e===`none`?Promise.resolve():e===`media`?an(x(this,C,`f`),document.fonts?.ready):e(x(this,C,`f`))};function un(e){let t=typeof window<`u`?window.devicePixelRatio:1,n;n=e.scrollPadding===void 0?[.1,.1]:e.scrollPadding===!1?[0,0]:Array.isArray(e.scrollPadding)?[e.scrollPadding[0]??.1,e.scrollPadding[1]??.1]:[e.scrollPadding,e.scrollPadding];let r;return r=e.postEffect===void 0?[]:Array.isArray(e.postEffect)?e.postEffect:[e.postEffect],{pixelRatio:e.pixelRatio??t,zIndex:e.zIndex??void 0,autoplay:e.autoplay??!0,fixedCanvas:e.scrollPadding===!1,scrollPadding:n,wrapper:e.wrapper,postEffects:r,preserveDrawingBuffer:e.preserveDrawingBuffer??!1,timeScale:e.timeScale??1}}var dn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},fn=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},pn,mn,hn,gn,_n,vn,yn,bn,w=class{constructor(e,t,n){pn.add(this),this.wrapS=`clamp`,this.wrapT=`clamp`,this.minFilter=`linear`,this.magFilter=`linear`,this.needsUpdate=!0,this.source=null,mn.set(this,void 0),hn.set(this,!1),gn.set(this,void 0),_n.set(this,void 0),dn(this,mn,e,`f`),this.gl=e.gl;let r=n?.externalHandle;dn(this,_n,r!==void 0,`f`),r===void 0?fn(this,pn,`m`,vn).call(this):(this.texture=r,dn(this,hn,!0,`f`),this.needsUpdate=!1),t&&(this.source=t),dn(this,gn,n?.autoRegister!==!1&&!fn(this,_n,`f`),`f`),fn(this,gn,`f`)&&e.addResource(this)}restore(){fn(this,_n,`f`)||(fn(this,pn,`m`,vn).call(this),dn(this,hn,!1,`f`),this.needsUpdate=!0)}bind(e){let t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&=(fn(this,pn,`m`,yn).call(this),!1)}dispose(){fn(this,gn,`f`)&&fn(this,mn,`f`).removeResource(this),fn(this,_n,`f`)||this.gl.deleteTexture(this.texture)}};mn=new WeakMap,hn=new WeakMap,gn=new WeakMap,_n=new WeakMap,pn=new WeakSet,vn=function(){let e=this.gl.createTexture();if(!e)throw Error(`[VFX-JS] Failed to create texture`);this.texture=e},yn=function(){let e=this.gl,t=this.source;if(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4),t)try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)}catch(e){console.error(e)}else if(!fn(this,hn,`f`)){let t=new Uint8Array([0,0,0,0]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,t)}fn(this,pn,`m`,bn).call(this),dn(this,hn,!0,`f`)},bn=function(){let e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,xn(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,xn(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,Sn(e,this.minFilter)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,Sn(e,this.magFilter))};function xn(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function Sn(e,t){return t===`nearest`?e.NEAREST:e.LINEAR}function Cn(e){return new Promise((t,n)=>{let r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>t(r),r.onerror=n,r.src=e})}var wn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Tn=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},En,Dn,On,kn=class{constructor(e,t,n,r={}){En.add(this),Dn.set(this,void 0),wn(this,Dn,e,`f`),this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(n)),this.float=r.float??!1,this.mipmap=r.mipmap??!1,this.texture=new w(e,void 0,{autoRegister:!1});let i=r.wrap;i!==void 0&&(typeof i==`string`?(this.texture.wrapS=i,this.texture.wrapT=i):(this.texture.wrapS=i[0],this.texture.wrapT=i[1])),r.filter!==void 0&&(this.texture.minFilter=r.filter,this.texture.magFilter=r.filter),Tn(this,En,`m`,On).call(this),e.addResource(this)}setSize(e,t){let n=Math.max(1,Math.floor(e)),r=Math.max(1,Math.floor(t));(n!==this.width||r!==this.height)&&(this.width=n,this.height=r,Tn(this,En,`m`,On).call(this))}restore(){this.texture.restore(),Tn(this,En,`m`,On).call(this)}dispose(){Tn(this,Dn,`f`).removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.texture.dispose()}generateMipmaps(){if(!this.mipmap)return;let e=this.gl;e.bindTexture(e.TEXTURE_2D,this.texture.texture),e.generateMipmap(e.TEXTURE_2D),e.bindTexture(e.TEXTURE_2D,null)}};Dn=new WeakMap,En=new WeakSet,On=function(){let e=this.gl,t=this.fbo,n=e.createFramebuffer();if(!n)throw Error(`[VFX-JS] Failed to create framebuffer`);this.fbo=n;let r=this.texture.texture;e.bindTexture(e.TEXTURE_2D,r);let i=Tn(this,Dn,`f`).floatLinearFilter;if(this.float&&i&&!Tn(this,Dn,`f`).floatBlend)throw Error(`[VFX-JS] EXT_float_blend is not supported.`);let a=this.float?i?e.RGBA32F:e.RGBA16F:e.RGBA8,o=this.float?i?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;if(this.mipmap){let t=Math.floor(Math.log2(Math.max(this.width,this.height)))+1,n=this.width,r=this.height;for(let i=0;i<t;i++)e.texImage2D(e.TEXTURE_2D,i,a,n,r,0,e.RGBA,o,null),n=Math.max(1,n>>1),r=Math.max(1,r>>1)}else e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,e.RGBA,o,null);let s=this.texture.minFilter===`nearest`?e.NEAREST:e.LINEAR,c=this.texture.magFilter===`nearest`?e.NEAREST:e.LINEAR,l=this.mipmap?this.texture.minFilter===`nearest`?e.NEAREST_MIPMAP_NEAREST:e.LINEAR_MIPMAP_LINEAR:s,u=An(e,this.texture.wrapS),d=An(e,this.texture.wrapT);e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,l),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,c),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,u),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,d),e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.texture.needsUpdate=!1,this.texture.source=null,t&&e.deleteFramebuffer(t)};function An(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function jn(e,t,n,r){return{x:e.left+n,y:t-r-e.bottom,w:e.right-e.left,h:e.bottom-e.top}}function Mn(e,t,n,r){return{x:e,y:t,w:n,h:r}}var Nn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},T=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Pn,Fn,In,Ln,Rn=class{constructor(e,t,n,r,i,a={}){Pn.set(this,void 0),Fn.set(this,void 0),In.set(this,void 0),Ln.set(this,void 0),Nn(this,Pn,t,`f`),Nn(this,Fn,n,`f`),Nn(this,In,r,`f`);let o=t*r,s=n*r,c={float:i,wrap:a.wrap,filter:a.filter,mipmap:a.mipmap};Nn(this,Ln,[new kn(e,o,s,c),new kn(e,o,s,c)],`f`)}get texture(){return T(this,Ln,`f`)[0].texture}get target(){return T(this,Ln,`f`)[1]}resize(e,t){if(e===T(this,Pn,`f`)&&t===T(this,Fn,`f`))return;Nn(this,Pn,e,`f`),Nn(this,Fn,t,`f`);let n=e*T(this,In,`f`),r=t*T(this,In,`f`);T(this,Ln,`f`)[0].setSize(n,r),T(this,Ln,`f`)[1].setSize(n,r)}swap(){Nn(this,Ln,[T(this,Ln,`f`)[1],T(this,Ln,`f`)[0]],`f`)}getViewport(){return Mn(0,0,T(this,Pn,`f`),T(this,Fn,`f`))}dispose(){T(this,Ln,`f`)[0].dispose(),T(this,Ln,`f`)[1].dispose()}};Pn=new WeakMap,Fn=new WeakMap,In=new WeakMap,Ln=new WeakMap;var zn=class{constructor(e=0,t=0){this.x=0,this.y=0,this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}},Bn=class{constructor(e=0,t=0,n=0,r=0){this.x=0,this.y=0,this.z=0,this.w=0,this.x=e,this.y=t,this.z=n,this.w=r}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}},Vn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Hn=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Un,Wn,Gn,Kn,qn,Jn,Yn;function Xn(e){return/#version\s+300\s+es\b/.test(e)?`300 es`:/#version\s+100\b/.test(e)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(e)?`100`:`300 es`}var Zn=class{constructor(e,t,n,r){Un.add(this),Wn.set(this,void 0),Gn.set(this,void 0),Kn.set(this,void 0),qn.set(this,void 0),Jn.set(this,new Map),Vn(this,Wn,e,`f`),this.gl=e.gl,Vn(this,Gn,t,`f`),Vn(this,Kn,n,`f`),Vn(this,qn,r??Xn(n),`f`),Hn(this,Un,`m`,Yn).call(this),e.addResource(this)}restore(){Hn(this,Un,`m`,Yn).call(this)}use(){this.gl.useProgram(this.program)}hasUniform(e){return Hn(this,Jn,`f`).has(e)}uploadUniforms(e){let t=this.gl,n=0;for(let[r,i]of Hn(this,Jn,`f`)){let a=e[r];if(!a)continue;let o=a.value;o!=null&&(er(i.type)?o instanceof w&&(o.bind(n),t.uniform1i(i.location,n),n++):o instanceof w||nr(t,i,o))}}dispose(){Hn(this,Wn,`f`).removeResource(this),this.gl.deleteProgram(this.program)}};Wn=new WeakMap,Gn=new WeakMap,Kn=new WeakMap,qn=new WeakMap,Jn=new WeakMap,Un=new WeakSet,Yn=function(){let e=this.gl,t=Qn(e,e.VERTEX_SHADER,$n(Hn(this,Gn,`f`),Hn(this,qn,`f`))),n=Qn(e,e.FRAGMENT_SHADER,$n(Hn(this,Kn,`f`),Hn(this,qn,`f`))),r=e.createProgram();if(!r)throw Error(`[VFX-JS] Failed to create program`);if(e.attachShader(r,t),e.attachShader(r,n),e.bindAttribLocation(r,0,`position`),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let i=e.getProgramInfoLog(r)??``;throw e.deleteShader(t),e.deleteShader(n),e.deleteProgram(r),Error(`[VFX-JS] Program link failed: ${i}`)}e.detachShader(r,t),e.detachShader(r,n),e.deleteShader(t),e.deleteShader(n),this.program=r,Hn(this,Jn,`f`).clear();let i=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<i;t++){let n=e.getActiveUniform(r,t);if(!n)continue;let i=n.name.replace(/\[0\]$/,``),a=e.getUniformLocation(r,n.name);a&&Hn(this,Jn,`f`).set(i,{location:a,type:n.type,size:n.size})}};function Qn(e,t,n){let r=e.createShader(t);if(!r)throw Error(`[VFX-JS] Failed to create shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)??``;throw e.deleteShader(r),Error(`[VFX-JS] Shader compile failed: ${t}\n\n${n}`)}return r}function $n(e,t){return e.replace(/^\s+/,``).startsWith(`#version`)||t===`100`?e:`#version 300 es\n${e}`}function er(e){return e===35678||e===36298||e===36306||e===35682}var tr=new Set;function nr(e,t,n){let r=t.location,i=t.size>1,a=n,o=n,s=n;switch(t.type){case e.FLOAT:i?e.uniform1fv(r,a):e.uniform1f(r,n);return;case e.FLOAT_VEC2:if(i)e.uniform2fv(r,a);else if(n instanceof zn)e.uniform2f(r,n.x,n.y);else{let t=n;e.uniform2f(r,t[0],t[1])}return;case e.FLOAT_VEC3:if(i)e.uniform3fv(r,a);else{let t=n;e.uniform3f(r,t[0],t[1],t[2])}return;case e.FLOAT_VEC4:if(i)e.uniform4fv(r,a);else if(n instanceof Bn)e.uniform4f(r,n.x,n.y,n.z,n.w);else{let t=n;e.uniform4f(r,t[0],t[1],t[2],t[3])}return;case e.INT:i?e.uniform1iv(r,o):e.uniform1i(r,n);return;case e.INT_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,t[0],t[1])}return;case e.INT_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,t[0],t[1],t[2])}return;case e.INT_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,t[0],t[1],t[2],t[3])}return;case e.BOOL:i?e.uniform1iv(r,o):e.uniform1i(r,+!!n);return;case e.BOOL_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,+!!t[0],+!!t[1])}return;case e.BOOL_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,+!!t[0],+!!t[1],+!!t[2])}return;case e.BOOL_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,+!!t[0],+!!t[1],+!!t[2],+!!t[3])}return;case e.FLOAT_MAT2:e.uniformMatrix2fv(r,!1,a);return;case e.FLOAT_MAT3:e.uniformMatrix3fv(r,!1,a);return;case e.FLOAT_MAT4:e.uniformMatrix4fv(r,!1,a);return;case e.UNSIGNED_INT:i?e.uniform1uiv(r,s):e.uniform1ui(r,n);return;case e.UNSIGNED_INT_VEC2:if(i)e.uniform2uiv(r,s);else{let t=n;e.uniform2ui(r,t[0],t[1])}return;case e.UNSIGNED_INT_VEC3:if(i)e.uniform3uiv(r,s);else{let t=n;e.uniform3ui(r,t[0],t[1],t[2])}return;case e.UNSIGNED_INT_VEC4:if(i)e.uniform4uiv(r,s);else{let t=n;e.uniform4ui(r,t[0],t[1],t[2],t[3])}return;default:tr.has(t.type)||(tr.add(t.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${t.type.toString(16)}; skipping upload.`));return}}var rr=class{constructor(e,t,n,r,i,a){this.gl=e.gl,this.program=new Zn(e,t,n,a),this.uniforms=r,this.blend=i}dispose(){this.program.dispose()}};function ir(e,t,n,r,i,a,o,s){let c=r?r.width/s:a,l=r?r.height/s:o,u=Math.max(0,i.x),d=Math.max(0,i.y),f=Math.min(c,i.x+i.w),p=Math.min(l,i.y+i.h),m=f-u,h=p-d;m<=0||h<=0||(e.bindFramebuffer(e.FRAMEBUFFER,r?r.fbo:null),e.viewport(Math.round(u*s),Math.round(d*s),Math.round(m*s),Math.round(h*s)),ar(e,n.blend),n.program.use(),n.program.uploadUniforms(n.uniforms),t.draw())}function ar(e,t){t===`none`?e.disable(e.BLEND):(e.enable(e.BLEND),e.blendEquation(e.FUNC_ADD),t===`premultiplied`?e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA):t===`additive`?e.blendFuncSeparate(e.ONE,e.ONE,e.ONE,e.ONE):e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA))}var or=class{constructor(t){this.uniforms={src:{value:null},offset:{value:new zn},resolution:{value:new zn},viewport:{value:new Bn}},this.pass=new rr(t,`
precision highp float;
in vec3 position;
void main() {
    gl_Position = vec4(position, 1.0);
}
`,e,this.uniforms,`premultiplied`)}setUniforms(e,t,n){this.uniforms.src.value=e,this.uniforms.resolution.value.set(n.w*t,n.h*t),this.uniforms.offset.value.set(n.x*t,n.y*t)}dispose(){this.pass.dispose()}},sr=e=>{let t=document.implementation.createHTMLDocument(`test`),n=t.createRange();n.selectNodeContents(t.documentElement),n.deleteContents();let r=document.createElement(`head`);return t.documentElement.appendChild(r),t.documentElement.appendChild(n.createContextualFragment(e)),t.documentElement.setAttribute(`xmlns`,t.documentElement.namespaceURI),new XMLSerializer().serializeToString(t).replace(/<!DOCTYPE html>/,``)};async function cr(e,t,n,r){let i=e.getBoundingClientRect(),a=window.devicePixelRatio,o=Math.ceil(i.width),s=Math.ceil(i.height),c=o*a,l=s*a,u=1,d=c,f=l;r&&(d>r||f>r)&&(u=Math.min(r/d,r/f),d=Math.floor(d*u),f=Math.floor(f*u));let p=n&&n.width===d&&n.height===f?n:new OffscreenCanvas(d,f),m=e.cloneNode(!0);await lr(e,m),ur(e,m),m.style.setProperty(`opacity`,t.toString()),m.style.setProperty(`margin`,`0px`),dr(m),fr(e,m),m.style.setProperty(`box-sizing`,`border-box`),m.style.setProperty(`width`,`${o}px`),m.style.setProperty(`height`,`${s}px`);let h=m.outerHTML,ee=`<svg xmlns="http://www.w3.org/2000/svg" width="${c}" height="${l}"><foreignObject width="100%" height="100%">${sr(h)}</foreignObject></svg>`;return new Promise((e,t)=>{let n=new Image;n.onload=()=>{let r=p.getContext(`2d`);if(r===null)return t();r.clearRect(0,0,d,f);let i=a*u;r.scale(i,i),r.drawImage(n,0,0,c,l),r.setTransform(1,0,0,1,0,0),e(p)},n.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(ee)}`})}async function lr(e,t){let n=window.getComputedStyle(e);for(let e of Array.from(n))/(-inline-|-block-|^inline-|^block-)/.test(e)||/^-webkit-.*(start|end|before|after|logical)/.test(e)||t.style.setProperty(e,n.getPropertyValue(e),n.getPropertyPriority(e));if(t.tagName===`INPUT`)t.setAttribute(`value`,t.value);else if(t.tagName===`TEXTAREA`)t.innerHTML=t.value;else if(t.tagName===`IMG`)try{t.src=await hr(u(e))}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];await lr(r,i)}}function ur(e,t){if(typeof e.computedStyleMap==`function`)try{let n=e.computedStyleMap();for(let e of[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`]){let r=n.get(e);r instanceof CSSKeywordValue&&r.value===`auto`&&t.style.setProperty(e,`auto`)}}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];r instanceof HTMLElement&&i instanceof HTMLElement&&ur(r,i)}}function dr(e){let t=e;for(;;){let e=t.style;if(Number.parseFloat(e.paddingTop)>0||Number.parseFloat(e.borderTopWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.firstElementChild;if(!n)break;n.style.setProperty(`margin-top`,`0px`),t=n}for(t=e;;){let e=t.style;if(Number.parseFloat(e.paddingBottom)>0||Number.parseFloat(e.borderBottomWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.lastElementChild;if(!n)break;n.style.setProperty(`margin-bottom`,`0px`),t=n}}function fr(e,t){let n=-e.scrollLeft,r=-e.scrollTop;for(let i=0;i<e.children.length;i++){let a=e.children[i],o=t.children[i];a&&(o instanceof HTMLElement||o instanceof SVGElement)&&((n!==0||r!==0)&&pr(o,n,r),fr(a,o))}}function pr(e,t,n){let r=e.style.getPropertyValue(`translate`),[i=`0px`,a=`0px`,o]=r&&r!==`none`?mr(r):[],s=`calc(${i} + ${t}px) calc(${a} + ${n}px)`;e.style.setProperty(`translate`,o?`${s} ${o}`:s)}function mr(e){let t=[],n=0,r=``;for(let i of e.trim())i===`(`?n++:i===`)`&&n--,i===` `&&n===0?(r&&t.push(r),r=``):r+=i;return r&&t.push(r),t}async function hr(e){let t=await fetch(e).then(e=>e.blob());return new Promise(e=>{let n=new FileReader;n.onload=function(){e(this.result)},n.readAsDataURL(t)})}var gr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},E=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},_r,vr,yr,br,xr,Sr,Cr,wr,Tr,Er,Dr,Or,kr=Object.freeze({__brand:`EffectQuad`});function Ar(e){return e===kr}function jr(e,t){switch(t){case`lines`:return e.LINES;case`lineStrip`:return e.LINE_STRIP;case`points`:return e.POINTS;default:return e.TRIANGLES}}function Mr(e,t){if(t instanceof Float32Array)return e.FLOAT;if(t instanceof Uint8Array)return e.UNSIGNED_BYTE;if(t instanceof Uint16Array)return e.UNSIGNED_SHORT;if(t instanceof Uint32Array)return e.UNSIGNED_INT;if(t instanceof Int8Array)return e.BYTE;if(t instanceof Int16Array)return e.SHORT;if(t instanceof Int32Array)return e.INT;throw Error(`[VFX-JS] Unsupported attribute typed array`)}function Nr(e,t){if(ArrayBuffer.isView(t)&&!(t instanceof DataView))return{name:e,data:t,itemSize:2,normalized:!1,perInstance:!1};let n=t;return{name:e,data:n.data,itemSize:n.itemSize,normalized:n.normalized??!1,perInstance:n.perInstance??!1}}var Pr=class{constructor(e,t,n){_r.add(this),vr.set(this,void 0),yr.set(this,void 0),br.set(this,void 0),xr.set(this,[]),Sr.set(this,null),this.indexType=0,this.hasIndices=!1,this.drawCount=0,this.drawStart=0,Cr.set(this,!1),gr(this,vr,e,`f`),this.gl=e.gl,gr(this,yr,t,`f`),gr(this,br,n,`f`),this.mode=jr(this.gl,t.mode),this.instanceCount=t.instanceCount??0,E(this,_r,`m`,wr).call(this),e.addResource(this),gr(this,Cr,!0,`f`)}restore(){gr(this,xr,[],`f`),gr(this,Sr,null,`f`),E(this,_r,`m`,wr).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),this.hasIndices?this.instanceCount>0?e.drawElementsInstanced(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2),this.instanceCount):e.drawElements(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2)):this.instanceCount>0?e.drawArraysInstanced(this.mode,this.drawStart,this.drawCount,this.instanceCount):e.drawArrays(this.mode,this.drawStart,this.drawCount)}dispose(){E(this,Cr,`f`)&&(E(this,vr,`f`).removeResource(this),gr(this,Cr,!1,`f`));let e=this.gl;e.deleteVertexArray(this.vao);for(let t of E(this,xr,`f`))e.deleteBuffer(t);E(this,Sr,`f`)&&e.deleteBuffer(E(this,Sr,`f`)),gr(this,xr,[],`f`),gr(this,Sr,null,`f`)}};vr=new WeakMap,yr=new WeakMap,br=new WeakMap,xr=new WeakMap,Sr=new WeakMap,Cr=new WeakMap,_r=new WeakSet,wr=function(){let e=this.gl,t=e.createVertexArray();if(!t)throw Error(`[VFX-JS] Failed to create VAO`);this.vao=t,e.bindVertexArray(t);let n=E(this,br,`f`).program,r=null;for(let[t,i]of Object.entries(E(this,yr,`f`).attributes)){let a=Nr(t,i),o=e.getAttribLocation(n,a.name);if(o<0)continue;let s=e.createBuffer();if(!s)throw Error(`[VFX-JS] Failed to create VBO for "${a.name}"`);E(this,xr,`f`).push(s),e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,a.data,e.STATIC_DRAW);let c=Mr(e,a.data);e.enableVertexAttribArray(o),c===e.FLOAT||c===e.HALF_FLOAT||a.normalized?e.vertexAttribPointer(o,a.itemSize,c,a.normalized,0,0):e.vertexAttribIPointer(o,a.itemSize,c,0,0),a.perInstance&&e.vertexAttribDivisor(o,1),t===`position`&&r===null&&(r=a.data.length/a.itemSize)}let i=0,a=E(this,yr,`f`).indices;if(a){let t=e.createBuffer();if(!t)throw Error(`[VFX-JS] Failed to create IBO`);gr(this,Sr,t,`f`),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t),e.bufferData(e.ELEMENT_ARRAY_BUFFER,a,e.STATIC_DRAW),this.hasIndices=!0,this.indexType=a instanceof Uint32Array?e.UNSIGNED_INT:e.UNSIGNED_SHORT,i=a.length}else this.hasIndices=!1;e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null),E(this,Sr,`f`)&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null);let o=this.hasIndices?i:r??0,s=E(this,yr,`f`).drawRange;this.drawStart=s?.start??0,this.drawCount=s?.count===void 0?Math.max(0,o-this.drawStart):s.count};var Fr=class{constructor(e,t){Tr.set(this,void 0),Er.set(this,void 0),Dr.set(this,new WeakMap),Or.set(this,new Set),gr(this,Tr,e,`f`),gr(this,Er,t,`f`)}get quad(){return E(this,Er,`f`)}resolve(e,t){let n=E(this,Dr,`f`).get(e);n||(n=new Map,E(this,Dr,`f`).set(e,n));let r=n.get(t);return r||(r=new Pr(E(this,Tr,`f`),e,t),n.set(t,r),E(this,Or,`f`).add(r)),r}release(e){let t=E(this,Dr,`f`).get(e);if(t){for(let e of t.values())e.dispose(),E(this,Or,`f`).delete(e);E(this,Dr,`f`).delete(e)}}dispose(){for(let e of E(this,Or,`f`))e.dispose();E(this,Or,`f`).clear()}};Tr=new WeakMap,Er=new WeakMap,Dr=new WeakMap,Or=new WeakMap;var D=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},O=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ir,Lr,Rr,zr,Br,Vr,Hr,Ur,Wr,Gr,k,Kr,A,j,qr,Jr,Yr,Xr,Zr,Qr,$r,ei,ti,ni=Symbol.for(`@vfx-js/effect.resolve-texture`),ri=Symbol.for(`@vfx-js/effect.resolve-rt`);function ii(e){return e[ni]()}function ai(e){return e[ri]}var oi=`#version 300 es
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
`,si=`
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
`,ci=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`,li=`
precision highp float;
varying vec2 uv;
uniform sampler2D src;
void main() {
    gl_FragColor = texture2D(src, uv);
}
`,ui=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    bool inside = all(greaterThanEqual(uvSrc, vec2(0.0))) && all(lessThanEqual(uvSrc, vec2(1.0)));
    outColor = inside ? texture(src, uvSrc) : vec4(0.0);
}
`,di=`
precision highp float;
varying vec2 uvSrc;
uniform sampler2D src;
void main() {
    bool inside = all(greaterThanEqual(uvSrc, vec2(0.0))) && all(lessThanEqual(uvSrc, vec2(1.0)));
    gl_FragColor = inside ? texture2D(src, uvSrc) : vec4(0.0);
}
`,fi=class{constructor(e,t,n,r,i,a){Ir.add(this),Lr.set(this,void 0),Rr.set(this,void 0),zr.set(this,void 0),Br.set(this,void 0),Vr.set(this,void 0),Hr.set(this,[]),Ur.set(this,[]),Wr.set(this,[]),Gr.set(this,[]),k.set(this,`init`),Kr.set(this,!1),A.set(this,void 0),j.set(this,void 0),Xr.set(this,[]),D(this,Lr,e,`f`),D(this,Rr,e.gl,`f`),D(this,zr,n,`f`),D(this,Br,a,`f`),D(this,Vr,new Fr(e,t),`f`),D(this,A,{outputBufferW:1,outputBufferH:1,canvasBufferSize:[1,1],outputViewport:{x:0,y:0,w:1,h:1},elementBufferW:1,elementBufferH:1,contentRectUv:[0,0,1,1],srcRectUv:[0,0,1,1]},`f`);let o={time:0,deltaTime:0,pixelRatio:n,resolution:[1,1],mouse:[0,0],mouseViewport:[0,0],intersection:0,enterTime:0,leaveTime:0,src:r,target:null,uniforms:{},vfxProps:i,dims:{element:[1,1],elementPixel:[1,1],canvas:[1,1],canvasPixel:[1,1],pixelRatio:n,contentRect:[0,0,1,1],srcRect:[0,0,1,1],canvasRect:[0,0,1,1]},quad:kr,gl:O(this,Rr,`f`),createRenderTarget:e=>O(this,Ir,`m`,qr).call(this,e),releaseGeometry:e=>O(this,Vr,`f`).release(e),wrapTexture:(e,t)=>O(this,Ir,`m`,Yr).call(this,e,t),draw:e=>O(this,Ir,`m`,Zr).call(this,e),blit:(e,t,n)=>O(this,Ir,`m`,Qr).call(this,e,t,n),clear:e=>O(this,Ir,`m`,$r).call(this,e),onContextRestored:e=>{let t=O(this,Lr,`f`).onContextRestored(e);return O(this,Gr,`f`).push(t),t}};D(this,j,o,`f`)}get ctx(){return O(this,j,`f`)}setPhase(e){D(this,k,e,`f`)}setFrameDims(e){D(this,A,e,`f`),O(this,j,`f`).resolution=[e.canvasBufferSize[0],e.canvasBufferSize[1]];for(let t of O(this,Wr,`f`))t.resolver.resize?.(e.outputBufferW,e.outputBufferH)}setEffectDims(e){O(this,j,`f`).dims=e}setFrameState(e){let t=O(this,j,`f`);t.time=e.time,t.deltaTime=e.deltaTime,t.mouse=e.mouse,t.mouseViewport=e.mouseViewport,t.intersection=e.intersection,t.enterTime=e.enterTime,t.leaveTime=e.leaveTime,t.uniforms=e.uniforms}setSrc(e){O(this,j,`f`).src=e}setOutput(e){O(this,j,`f`).target=e}passthroughCopy(e,t,n){let r=O(this,k,`f`);D(this,k,`render`,`f`);let i=O(this,j,`f`).target;O(this,j,`f`).target=t;try{let r=O(this,A,`f`).outputViewport;O(this,A,`f`).outputViewport={...n};let i=O(this,j,`f`).vfxProps.glslVersion===`100`?li:ci;O(this,Ir,`m`,ei).call(this,{frag:i,uniforms:{src:e},target:t}),O(this,A,`f`).outputViewport=r}finally{O(this,j,`f`).target=i,D(this,k,r,`f`)}}clearRt(e){let t=O(this,Rr,`f`),n=ai(e);t.bindFramebuffer(t.FRAMEBUFFER,n.getWriteFbo().fbo),t.viewport(0,0,e.width,e.height),t.clearColor(0,0,0,0),t.disable(t.SCISSOR_TEST),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)}tickAutoUpdates(){for(let e of O(this,Xr,`f`))e()}dispose(){D(this,k,`disposed`,`f`);for(let e of O(this,Gr,`f`))e();D(this,Gr,[],`f`);for(let e of O(this,Ur,`f`))e.resolver.dispose?.();D(this,Ur,[],`f`),D(this,Wr,[],`f`);for(let e of O(this,Hr,`f`))e.dispose();D(this,Hr,[],`f`),O(this,Vr,`f`).dispose(),D(this,Xr,[],`f`)}};Lr=new WeakMap,Rr=new WeakMap,zr=new WeakMap,Br=new WeakMap,Vr=new WeakMap,Hr=new WeakMap,Ur=new WeakMap,Wr=new WeakMap,Gr=new WeakMap,k=new WeakMap,Kr=new WeakMap,A=new WeakMap,j=new WeakMap,Xr=new WeakMap,Ir=new WeakSet,qr=function(e){let t=e?.persistent??!1,n=e?.float??!1,r=mi(e?.wrap),i=e?.filter,a=e?.mipmap??!1,o=a!==!1,s=a===!0,c=e?.size,l=c?c[0]:O(this,A,`f`).outputBufferW,u=c?c[1]:O(this,A,`f`).outputBufferH,d,f,p;if(t){let e=c?1:O(this,zr,`f`),t=c?l:l/e,a=c?u:u/e,m=new Rn(O(this,Lr,`f`),t,a,e,n,{wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>m.texture,getWriteFbo:()=>m.target,swap:()=>m.swap(),resize:c?void 0:(e,t)=>{m.resize(e/O(this,zr,`f`),t/O(this,zr,`f`))},dispose:()=>m.dispose()},o&&(d.regenerateMipmaps=()=>m.target.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>m.target.width,p=()=>m.target.height}else{let e=new kn(O(this,Lr,`f`),l,u,{float:n,wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>e.texture,getWriteFbo:()=>e,resize:c?void 0:(t,n)=>e.setSize(t,n),dispose:()=>e.dispose()},o&&(d.regenerateMipmaps=()=>e.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>e.width,p=()=>e.height}let m,h=_i(d,f,p,()=>O(this,Ir,`m`,Jr).call(this,m));return m={handle:h,resolver:d},O(this,Ur,`f`).push(m),c||O(this,Wr,`f`).push(m),h},Jr=function(e){let t=O(this,Ur,`f`).indexOf(e);if(t<0)return;O(this,Ur,`f`).splice(t,1);let n=O(this,Wr,`f`).indexOf(e);n>=0&&O(this,Wr,`f`).splice(n,1),e.resolver.dispose?.()},Yr=function(e,t){let n=mi(t?.wrap),r=t?.filter,i,a,o,s=null;if(pi(e)){if(!t?.size)throw Error(`[VFX-JS] wrapTexture(WebGLTexture) requires opts.size`);let[n,r]=t.size;i=new w(O(this,Lr,`f`),void 0,{autoRegister:!1,externalHandle:e}),a=()=>n,o=()=>r}else{let n=e;i=new w(O(this,Lr,`f`),n);let r=t?.size,c=e=>{if(r)return e===`w`?r[0]:r[1];if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return e===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return e===`w`?n.videoWidth:n.videoHeight;let t=n;return e===`w`?t.width:t.height};a=()=>c(`w`),o=()=>c(`h`);let l=typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement||typeof HTMLCanvasElement<`u`&&n instanceof HTMLCanvasElement||typeof OffscreenCanvas<`u`&&n instanceof OffscreenCanvas;(t?.autoUpdate??l)&&(s=()=>{i.needsUpdate=!0})}i.wrapS=n[0],i.wrapT=n[1],r!==void 0&&(i.minFilter=r,i.magFilter=r),O(this,Hr,`f`).push(i),s&&O(this,Xr,`f`).push(s);let c=!1;return gi(()=>i,a,o,()=>{if(c)return;c=!0;let e=O(this,Hr,`f`).indexOf(i);if(e!==-1&&O(this,Hr,`f`).splice(e,1),s){let e=O(this,Xr,`f`).indexOf(s);e!==-1&&O(this,Xr,`f`).splice(e,1)}i.dispose()})},Zr=function(e){O(this,k,`f`)===`render`?O(this,Ir,`m`,ei).call(this,e):O(this,k,`f`)===`update`&&!O(this,Kr,`f`)&&(D(this,Kr,!0,`f`),console.warn(`[VFX-JS] ctx.draw() called in update(); ignored. Move draws to render().`))},Qr=function(e,t,n){if(O(this,k,`f`)!==`render`){O(this,k,`f`)===`update`&&!O(this,Kr,`f`)&&(D(this,Kr,!0,`f`),console.warn(`[VFX-JS] ctx.blit() called in update(); ignored. Move draws to render().`));return}let r=O(this,j,`f`).vfxProps.glslVersion===`100`?di:ui;O(this,Ir,`m`,ei).call(this,{frag:r,uniforms:{src:e},target:t,blend:n?.blend,swap:n?.swap})},$r=function(e){if(O(this,k,`f`)!==`render`){O(this,k,`f`)===`update`&&!O(this,Kr,`f`)&&(D(this,Kr,!0,`f`),console.warn(`[VFX-JS] ctx.clear() called in update(); ignored. Move draws to render().`));return}let t=O(this,Rr,`f`),n=O(this,j,`f`).target,r=e??n,i=r===null||r===n;if(t.clearColor(0,0,0,0),i){let e=r===null?null:ai(r).getWriteFbo().fbo,n=O(this,A,`f`).outputViewport;t.bindFramebuffer(t.FRAMEBUFFER,e),t.enable(t.SCISSOR_TEST),t.scissor(n.x,n.y,n.w,n.h),t.clear(t.COLOR_BUFFER_BIT),t.disable(t.SCISSOR_TEST),t.bindFramebuffer(t.FRAMEBUFFER,null);return}let a=ai(r);t.disable(t.SCISSOR_TEST);let o=()=>{t.bindFramebuffer(t.FRAMEBUFFER,a.getWriteFbo().fbo),t.clear(t.COLOR_BUFFER_BIT)};o(),a.swap&&(a.swap(),o(),a.swap()),t.bindFramebuffer(t.FRAMEBUFFER,null)},ei=function(e){let t=O(this,Rr,`f`),n=e.vert??(O(this,j,`f`).vfxProps.glslVersion===`100`?si:oi),r=O(this,Br,`f`).get(n,e.frag,O(this,j,`f`).vfxProps.glslVersion),i=O(this,j,`f`).target,a=e.target===void 0||e.target===null?i:e.target,o=a===null||a===i,s,c,l,u,d,f,p;if(a===null)s=null,c=O(this,A,`f`).outputViewport.x,l=O(this,A,`f`).outputViewport.y,u=O(this,A,`f`).outputViewport.w,d=O(this,A,`f`).outputViewport.h;else{let e=ai(a);s=e.getWriteFbo().fbo,o?(c=O(this,A,`f`).outputViewport.x,l=O(this,A,`f`).outputViewport.y,u=O(this,A,`f`).outputViewport.w,d=O(this,A,`f`).outputViewport.h):(c=0,l=0,u=a.width,d=a.height),f=e.swap,e.mipmapAutoRegen&&(p=e.regenerateMipmaps)}t.bindFramebuffer(t.FRAMEBUFFER,s),t.viewport(c,l,u,d),t.disable(t.SCISSOR_TEST),ar(t,e.blend??(a===null?`premultiplied`:`none`)),r.use();let m=O(this,Ir,`m`,ti).call(this,e.uniforms);r.uploadUniforms(m);let h=e.geometry??kr;Ar(h)?O(this,Vr,`f`).quad.draw():O(this,Vr,`f`).resolve(h,r).draw(),p?.(),f&&e.swap!==!1&&f()},ti=function(e){let t={};if(t.contentRectUv={value:O(this,A,`f`).contentRectUv},t.srcRectUv={value:O(this,A,`f`).srcRectUv},!e)return t;for(let[n,r]of Object.entries(e))t[n]=hi(r);return t};function pi(e){let t=globalThis.WebGLTexture;if(t&&typeof t==`function`&&e instanceof t)return!0;let n=e;return n.width===void 0&&n.naturalWidth===void 0&&n.videoWidth===void 0}function mi(e){return e===void 0?[`clamp`,`clamp`]:typeof e==`string`?[e,e]:[e[0],e[1]]}function hi(e){return typeof e==`object`&&e&&`__brand`in e?e.__brand===`EffectRenderTarget`?{value:ai(e).getReadTexture()}:{value:ii(e)}:{value:e}}function gi(e,t,n,r){let i={__brand:`EffectTexture`,get width(){return t()},get height(){return n()},dispose(){r?.()}};return Object.defineProperty(i,ni,{value:e}),i}function _i(e,t,n,r){let i={__brand:`EffectRenderTarget`,get width(){return t()},get height(){return n()},dispose:r??(()=>{}),generateMipmaps:()=>e.regenerateMipmaps?.()};return Object.defineProperty(i,ri,{value:e}),i}function vi(e){return _i({getReadTexture:()=>e.texture,getWriteFbo:()=>e},()=>e.width,()=>e.height)}function yi(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:Array.isArray(e)?{top:e[0],right:e[1],bottom:e[2],left:e[3]}:{top:e.top??0,right:e.right??0,bottom:e.bottom??0,left:e.left??0}}function bi(e){return yi(e)}var xi={top:0,right:0,bottom:0,left:0};function Si(e){return yi(e)}function Ci(e){return{top:e.top,right:e.right,bottom:e.bottom,left:e.left}}function wi(e){return{top:e.top,left:e.left,right:e.left+Math.ceil(e.right-e.left),bottom:e.top+Math.ceil(e.bottom-e.top)}}function Ti(e,t){return{top:e.top-t.top,right:e.right+t.right,bottom:e.bottom+t.bottom,left:e.left-t.left}}function Ei(e,t,n){return Math.min(Math.max(e,t),n)}function Di(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return c<=0||l<=0?[0,0,1,1]:[(n-o)/c,(r-s)/l,i/c,a/l]}function Oi(e,t){let n=Ei(t.left,e.left,e.right),r=(Ei(t.right,e.left,e.right)-n)/(t.right-t.left),i=Ei(t.top,e.top,e.bottom);return r*((Ei(t.bottom,e.top,e.bottom)-i)/(t.bottom-t.top))}var M=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},N=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},P,ki,Ai,ji,Mi,Ni,F,I,Pi,Fi,Ii,Li,Ri,zi,Bi,Vi,Hi,Ui,Wi,Gi,Ki,qi,Ji,Yi,Xi,Zi,Qi,$i=class{constructor(e,t,n,r,i,a,o,s){P.add(this),ki.set(this,void 0),Ai.set(this,void 0),ji.set(this,void 0),Mi.set(this,void 0),Ni.set(this,void 0),F.set(this,void 0),I.set(this,void 0),Pi.set(this,void 0),Fi.set(this,[]),Ii.set(this,[]),Li.set(this,void 0),Ri.set(this,new Set),zi.set(this,!1),Bi.set(this,void 0),Vi.set(this,bi(0)),Hi.set(this,null),M(this,ki,e,`f`),M(this,Ai,t,`f`),M(this,ji,n,`f`),M(this,Mi,i,`f`),M(this,Ni,s,`f`),M(this,F,r,`f`),M(this,Li,a,`f`),M(this,Bi,o,`f`),M(this,I,r.map(()=>N(this,P,`m`,Wi).call(this)),`f`),r.length===0&&M(this,Hi,N(this,P,`m`,Wi).call(this),`f`),M(this,Pi,N(this,P,`m`,Ui).call(this),`f`)}get effects(){return N(this,F,`f`)}get hosts(){return N(this,I,`f`)}get renderingIndices(){return N(this,Pi,`f`)}get stages(){return N(this,Ii,`f`)}get hitTestPadBuffer(){return N(this,Vi,`f`)}async initAll(){for(let e=0;e<N(this,F,`f`).length;e++){let t=N(this,F,`f`)[e],n=N(this,I,`f`)[e];n.setPhase(`init`);try{t.init&&await t.init(n.ctx)}catch(t){console.error(`[VFX-JS] effect[${e}].init() failed:`,t);for(let t=e-1;t>=0;t--)N(this,P,`m`,Gi).call(this,t),N(this,I,`f`)[t].dispose();throw N(this,I,`f`)[e].dispose(),t}n.setPhase(`update`)}}run(e){if(N(this,zi,`f`)||!e.isVisible)return;M(this,Pi,N(this,P,`m`,Ui).call(this),`f`);let t=N(this,Pi,`f`).length;for(let t of N(this,I,`f`))t.setFrameState({time:e.time,deltaTime:e.deltaTime,mouse:e.mouse,mouseViewport:e.mouseViewport,intersection:e.intersection,enterTime:e.enterTime,leaveTime:e.leaveTime,uniforms:e.resolvedUniforms});N(this,P,`m`,Ki).call(this,e);for(let t=0;t<N(this,I,`f`).length;t++)N(this,I,`f`)[t].setFrameDims(N(this,P,`m`,Qi).call(this,t,e)),N(this,I,`f`)[t].setEffectDims(N(this,P,`m`,Yi).call(this,t,e));for(let e=0;e<N(this,F,`f`).length;e++){let t=N(this,F,`f`)[e];if(!t.update)continue;let n=N(this,I,`f`)[e];n.setPhase(`update`);try{t.update(n.ctx)}catch(t){let n=`${e}:update`;N(this,Ri,`f`).has(n)||(N(this,Ri,`f`).add(n),console.warn(`[VFX-JS] effect[${e}].update() threw; skipping this frame's update:`,t))}}if(t===0)(N(this,Hi,`f`)??N(this,I,`f`)[0]).passthroughCopy(N(this,Li,`f`),e.finalTarget,e.elementRectOnCanvasPx);else for(let n=0;n<t;n++){let r=N(this,Pi,`f`)[n],i=N(this,I,`f`)[r],a=N(this,F,`f`)[r];if(!a.render)continue;i.setPhase(`render`),i.tickAutoUpdates();let o=n===0?N(this,Li,`f`):N(this,Fi,`f`)[n-1].texHandle;i.setSrc(o);let s;n===t-1?s=e.finalTarget:(s=N(this,Fi,`f`)[n].rtHandle,i.clearRt(s)),i.setOutput(s);try{a.render(i.ctx)}catch(e){let a=`${r}:render`;N(this,Ri,`f`).has(a)||(N(this,Ri,`f`).add(a),console.warn(`[VFX-JS] effect[${r}].render() threw; falling back to passthrough:`,e));let c=N(this,Ii,`f`)[n].outputViewport;s===null?i.passthroughCopy(o,null,c):n===t-1?i.passthroughCopy(o,s,c):i.passthroughCopy(o,s,{x:0,y:0,w:s.width,h:s.height})}i.setPhase(`update`)}}dispose(){if(!N(this,zi,`f`)){M(this,zi,!0,`f`);for(let e=N(this,F,`f`).length-1;e>=0;e--)N(this,P,`m`,Gi).call(this,e),N(this,I,`f`)[e].dispose();N(this,Hi,`f`)&&(N(this,Hi,`f`).dispose(),M(this,Hi,null,`f`));for(let e of N(this,Fi,`f`))e.fb.dispose();M(this,Fi,[],`f`),M(this,Ii,[],`f`)}}async replaceEffects(e){if(N(this,zi,`f`))throw Error(`[VFX-JS] replaceEffects on disposed chain`);let t=N(this,F,`f`),n=N(this,I,`f`),r=new Map;for(let e=0;e<t.length;e++)r.set(t[e],n[e]);let i=Array(e.length),a=[];for(let t=0;t<e.length;t++){let n=e[t],o=r.get(n);if(o)i[t]=o,r.delete(n);else{let e=N(this,P,`m`,Wi).call(this);i[t]=e,a.push({host:e,effect:n})}}for(let e=0;e<a.length;e++){let{host:t,effect:n}=a[e];t.setPhase(`init`);try{n.init&&await n.init(t.ctx),t.setPhase(`update`)}catch(n){console.error(`[VFX-JS] replaceEffects: new effect init() failed:`,n);for(let t=e-1;t>=0;t--){let e=a[t];if(e.effect.dispose)try{e.effect.dispose()}catch(e){console.error(`[VFX-JS] dispose during init rollback threw:`,e)}e.host.dispose()}throw t.dispose(),n}}for(let[e,t]of r){if(e.dispose)try{e.dispose()}catch(e){console.error(`[VFX-JS] effect.dispose() threw during replaceEffects:`,e)}t.dispose()}for(let e of N(this,Fi,`f`))e.fb.dispose();M(this,Fi,[],`f`),M(this,Ii,[],`f`),e.length===0&&!N(this,Hi,`f`)?M(this,Hi,N(this,P,`m`,Wi).call(this),`f`):e.length>0&&N(this,Hi,`f`)&&(N(this,Hi,`f`).dispose(),M(this,Hi,null,`f`)),M(this,F,e,`f`),M(this,I,i,`f`),M(this,Pi,N(this,P,`m`,Ui).call(this),`f`),N(this,Ri,`f`).clear()}};ki=new WeakMap,Ai=new WeakMap,ji=new WeakMap,Mi=new WeakMap,Ni=new WeakMap,F=new WeakMap,I=new WeakMap,Pi=new WeakMap,Fi=new WeakMap,Ii=new WeakMap,Li=new WeakMap,Ri=new WeakMap,zi=new WeakMap,Bi=new WeakMap,Vi=new WeakMap,Hi=new WeakMap,P=new WeakSet,Ui=function(){return N(this,F,`f`).map((e,t)=>typeof e.render==`function`&&e.enabled!==!1?t:-1).filter(e=>e>=0)},Wi=function(){return new fi(N(this,ki,`f`),N(this,Ai,`f`),N(this,ji,`f`),N(this,Li,`f`),N(this,Mi,`f`),N(this,Ni,`f`))},Gi=function(e){let t=N(this,F,`f`)[e];if(t.dispose)try{t.dispose()}catch(t){console.error(`[VFX-JS] effect[${e}].dispose() threw:`,t)}},Ki=function(e){let t=N(this,Pi,`f`).length;if(M(this,Ii,Array(t),`f`),t===0)return;let n=N(this,Bi,`f`)?e.canvasBufferSize:e.elementBufferSize,r=[0,0,n[0],n[1]],i=N(this,P,`m`,Zi).call(this,e),a=r;for(let n=0;n<t;n++){let o=N(this,Pi,`f`)[n],s=N(this,F,`f`)[o],c=n===t-1,l=N(this,P,`m`,qi).call(this,s,a,r,i,e)??a,u=[l[2],l[3]],d=Di(r,l),f=c?{x:e.elementRectOnCanvasPx.x+l[0],y:e.elementRectOnCanvasPx.y+l[1],w:u[0],h:u[1]}:{x:0,y:0,w:u[0],h:u[1]};N(this,Ii,`f`)[n]={dstRect:l,dstBufferSize:u,contentRectUv:d,outputViewport:f},c||N(this,P,`m`,Xi).call(this,n,u),a=l}let[o,s,c,l]=N(this,Ii,`f`)[t-1].dstRect;M(this,Vi,bi({top:Math.max(0,s+l-n[1]),right:Math.max(0,o+c-n[0]),bottom:Math.max(0,-s),left:Math.max(0,-o)}),`f`)},qi=function(e,t,n,r,i){if(e.outputRect)return e.outputRect(N(this,P,`m`,Ji).call(this,i,n,t,r))},Ji=function(e,t,n,r){let i=e.canvasBufferSize[0]/e.canvasSize[0]||1;return{element:N(this,Bi,`f`)?e.canvasSize:e.elementSize,elementPixel:N(this,Bi,`f`)?e.canvasBufferSize:e.elementBufferSize,canvas:e.canvasSize,canvasPixel:e.canvasBufferSize,pixelRatio:i,contentRect:t,srcRect:n,canvasRect:r}},Yi=function(e,t){let n=N(this,Bi,`f`)?t.canvasBufferSize:t.elementBufferSize,r=[0,0,n[0],n[1]],i=N(this,P,`m`,Zi).call(this,t),a=N(this,Pi,`f`).indexOf(e),o=a<=0?r:N(this,Ii,`f`)[a-1].dstRect;return N(this,P,`m`,Ji).call(this,t,r,o,i)},Xi=function(e,t){let n=N(this,Fi,`f`)[e];if(n&&n.fb.width===t[0]&&n.fb.height===t[1])return;n&&n.fb.dispose();let r=new kn(N(this,ki,`f`),t[0],t[1]),i=vi(r),a=gi(()=>r.texture,()=>r.width,()=>r.height);N(this,Fi,`f`)[e]={fb:r,rtHandle:i,texHandle:a,bufferSize:t}},Zi=function(e){let[t,n]=e.canvasBufferSize;if(N(this,Bi,`f`))return[0,0,t,n];let{x:r,y:i}=e.elementRectOnCanvasPx;return[-r,-i,t,n]},Qi=function(e,t){let n=N(this,Pi,`f`).indexOf(e),r,i,a,o,s;if(n<0)r=t.elementBufferSize[0],i=t.elementBufferSize[1],a={x:0,y:0,w:r,h:i},o=[0,0,1,1],s=[0,0,1,1];else{let e=N(this,Ii,`f`)[n];r=e.dstBufferSize[0],i=e.dstBufferSize[1],a=e.outputViewport,o=e.contentRectUv,s=n===0?[0,0,1,1]:N(this,Ii,`f`)[n-1].contentRectUv}return{outputBufferW:r,outputBufferH:i,canvasBufferSize:t.canvasBufferSize,outputViewport:a,elementBufferW:t.elementBufferSize[0],elementBufferH:t.elementBufferSize[1],contentRectUv:o,srcRectUv:s}};var ea=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},ta=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},na,ra,ia,aa,oa=class{constructor(e){na.add(this),ra.set(this,void 0),ia.set(this,new Set),ea(this,ra,e,`f`)}freezeInside(e,t){let n={root:e,entries:[]};for(let r of t)!r.frozen&&sa(e,r.element)&&(r.frozen=!0,n.entries.push({e:r,opacity:r.element.style.opacity}),ta(this,ra,`f`).showPlain(r));ta(this,ia,`f`).add(n);let r=!1;return()=>{if(!r){r=!0,ta(this,ia,`f`).delete(n);for(let{e}of n.entries)e.frozen=!1;requestAnimationFrame(()=>{for(let{e,opacity:t}of n.entries)!e.frozen&&ta(this,ra,`f`).isRegistered(e)&&ta(this,ra,`f`).hidePlain(e,t)})}}}adopt(e,t){let n=ta(this,na,`m`,aa).call(this,e.element);return n?(e.frozen=!0,n.entries.push({e,opacity:t??e.element.style.opacity}),!0):!1}};ra=new WeakMap,ia=new WeakMap,na=new WeakSet,aa=function(e){for(let t of ta(this,ia,`f`))if(sa(t.root,e))return t};function sa(e,t){return t!==e&&e.contains(t)}function ca(e){this.data=e,this.pos=0}ca.prototype.readByte=function(){return this.data[this.pos++]},ca.prototype.peekByte=function(){return this.data[this.pos]},ca.prototype.readBytes=function(e){return this.data.subarray(this.pos,this.pos+=e)},ca.prototype.peekBytes=function(e){return this.data.subarray(this.pos,this.pos+e)},ca.prototype.readString=function(e){for(var t=``,n=0;n<e;n++)t+=String.fromCharCode(this.readByte());return t},ca.prototype.readBitArray=function(){for(var e=[],t=this.readByte(),n=7;n>=0;n--)e.push(!!(t&1<<n));return e},ca.prototype.readUnsigned=function(e){var t=this.readBytes(2);return e?(t[1]<<8)+t[0]:(t[0]<<8)+t[1]};function la(e){this.stream=new ca(e),this.output={}}la.prototype.parse=function(e){return this.parseParts(this.output,e),this.output},la.prototype.parseParts=function(e,t){for(var n=0;n<t.length;n++){var r=t[n];this.parsePart(e,r)}},la.prototype.parsePart=function(e,t){var n=t.label,r;if(!t.requires||t.requires(this.stream,this.output,e)){if(t.loop){for(var i=[];t.loop(this.stream);){var a={};this.parseParts(a,t.parts),i.push(a)}e[n]=i}else t.parts?(r={},this.parseParts(r,t.parts),e[n]=r):t.parser?(r=t.parser(this.stream,this.output,e),t.skip||(e[n]=r)):t.bits&&(e[n]=this.parseBits(t.bits))}};function ua(e){return e.reduce(function(e,t){return e*2+t},0)}la.prototype.parseBits=function(e){var t={},n=this.stream.readBitArray();for(var r in e){var i=e[r];t[r]=i.length?ua(n.slice(i.index,i.index+i.length)):n[i.index]}return t};var L={readByte:function(){return function(e){return e.readByte()}},readBytes:function(e){return function(t){return t.readBytes(e)}},readString:function(e){return function(t){return t.readString(e)}},readUnsigned:function(e){return function(t){return t.readUnsigned(e)}},readArray:function(e,t){return function(n,r,i){for(var a=t(n,r,i),o=Array(a),s=0;s<a;s++)o[s]=n.readBytes(e);return o}}},da={label:`blocks`,parser:function(e){for(var t=[],n=0,r=0,i=e.readByte();i!==r;i=e.readByte())t.push(e.readBytes(i)),n+=i;var a=new Uint8Array(n);n=0;for(var o=0;o<t.length;o++)a.set(t[o],n),n+=t[o].length;return a}},fa={label:`gce`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===249},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`byteSize`,parser:L.readByte()},{label:`extras`,bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:`delay`,parser:L.readUnsigned(!0)},{label:`transparentColorIndex`,parser:L.readByte()},{label:`terminator`,parser:L.readByte(),skip:!0}]},pa={label:`image`,requires:function(e){return e.peekByte()===44},parts:[{label:`code`,parser:L.readByte(),skip:!0},{label:`descriptor`,parts:[{label:`left`,parser:L.readUnsigned(!0)},{label:`top`,parser:L.readUnsigned(!0)},{label:`width`,parser:L.readUnsigned(!0)},{label:`height`,parser:L.readUnsigned(!0)},{label:`lct`,bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:`lct`,requires:function(e,t,n){return n.descriptor.lct.exists},parser:L.readArray(3,function(e,t,n){return 2**(n.descriptor.lct.size+1)})},{label:`data`,parts:[{label:`minCodeSize`,parser:L.readByte()},da]}]},ma={label:`text`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===1},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`blockSize`,parser:L.readByte()},{label:`preData`,parser:function(e,t,n){return e.readBytes(n.text.blockSize)}},da]},ha={label:`frames`,parts:[fa,{label:`application`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===255},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},{label:`blockSize`,parser:L.readByte()},{label:`id`,parser:function(e,t,n){return e.readString(n.blockSize)}},da]},{label:`comment`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===254},parts:[{label:`codes`,parser:L.readBytes(2),skip:!0},da]},pa,ma],loop:function(e){var t=e.peekByte();return t===33||t===44}},ga=[{label:`header`,parts:[{label:`signature`,parser:L.readString(3)},{label:`version`,parser:L.readString(3)}]},{label:`lsd`,parts:[{label:`width`,parser:L.readUnsigned(!0)},{label:`height`,parser:L.readUnsigned(!0)},{label:`gct`,bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:`backgroundColorIndex`,parser:L.readByte()},{label:`pixelAspectRatio`,parser:L.readByte()}]},{label:`gct`,requires:function(e,t){return t.lsd.gct.exists},parser:L.readArray(3,function(e,t){return 2**(t.lsd.gct.size+1)})},ha];function _a(e){var t=new la(new Uint8Array(e));this.raw=t.parse(ga),this.raw.hasImages=!1;for(var n=0;n<this.raw.frames.length;n++)if(this.raw.frames[n].image){this.raw.hasImages=!0;break}}_a.prototype.decompressFrame=function(e,t){if(e>=this.raw.frames.length)return null;var n=this.raw.frames[e];if(n.image){var r=n.image.descriptor.width*n.image.descriptor.height,i=o(n.image.data.minCodeSize,n.image.data.blocks,r);n.image.descriptor.lct.interlaced&&(i=s(i,n.image.descriptor.width));var a={pixels:i,dims:{top:n.image.descriptor.top,left:n.image.descriptor.left,width:n.image.descriptor.width,height:n.image.descriptor.height}};return a.colorTable=n.image.descriptor.lct&&n.image.descriptor.lct.exists?n.image.lct:this.raw.gct,n.gce&&(a.delay=(n.gce.delay||10)*10,a.disposalType=n.gce.extras.disposal,n.gce.extras.transparentColorGiven&&(a.transparentIndex=n.gce.transparentColorIndex)),t&&(a.patch=c(a)),a}return null;function o(e,t,n){var r=4096,i=-1,a=n,o,s,c,l,u,d,f,p,m,h,ee,te,ne,re,ie,g,ae=Array(n),oe=Array(r),_=Array(r),se=Array(r+1);for(te=e,s=1<<te,u=s+1,o=s+2,f=i,l=te+1,c=(1<<l)-1,m=0;m<s;m++)oe[m]=0,_[m]=m;for(ee=p=ne=re=g=ie=0,h=0;h<a;){if(re===0){if(p<l){ee+=t[ie]<<p,p+=8,ie++;continue}if(m=ee&c,ee>>=l,p-=l,m>o||m==u)break;if(m==s){l=te+1,c=(1<<l)-1,o=s+2,f=i;continue}if(f==i){se[re++]=_[m],f=m,ne=m;continue}for(d=m,m==o&&(se[re++]=ne,m=f);m>s;)se[re++]=_[m],m=oe[m];ne=_[m]&255,se[re++]=ne,o<r&&(oe[o]=f,_[o]=ne,o++,(o&c)===0&&o<r&&(l++,c+=o)),f=d}re--,ae[g++]=se[re],h++}for(h=g;h<a;h++)ae[h]=0;return ae}function s(e,t){for(var n=Array(e.length),r=e.length/t,i=function(r,i){var a=e.slice(i*t,(i+1)*t);n.splice.apply(n,[r*t,t].concat(a))},a=[0,4,2,1],o=[8,8,4,2],s=0,c=0;c<4;c++)for(var l=a[c];l<r;l+=o[c])i(l,s),s++;return n}function c(e){for(var t=e.pixels.length,n=new Uint8ClampedArray(t*4),r=0;r<t;r++){var i=r*4,a=e.pixels[r],o=e.colorTable[a];n[i]=o[0],n[i+1]=o[1],n[i+2]=o[2],n[i+3]=a===e.transparentIndex?0:255}return n}},_a.prototype.decompressFrames=function(e,t,n){t===void 0&&(t=0),n=n===void 0?this.raw.frames.length:Math.min(n,this.raw.frames.length);for(var r=[],i=t;i<n;i++)this.raw.frames[i].image&&r.push(this.decompressFrame(i,e));return r};var va=_a,ya=class e{static async create(t,n){let r=await fetch(t).then(e=>e.arrayBuffer()).then(e=>new va(e)),i=r.decompressFrames(!0,void 0,void 0),{width:a,height:o}=r.raw.lsd;return new e(i,a,o,n)}constructor(e,t,n,r){this.frames=[],this.index=0,this.playTime=0,this.frames=e,this.canvas=document.createElement(`canvas`),this.ctx=this.canvas.getContext(`2d`),this.pixelRatio=r,this.canvas.width=t,this.canvas.height=n,this.startTime=Date.now()}getCanvas(){return this.canvas}update(){let e=Date.now()-this.startTime;for(;this.playTime<e;){let e=this.frames[this.index%this.frames.length];this.playTime+=e.delay,this.index++}let t=this.frames[this.index%this.frames.length],n=new ImageData(t.patch,t.dims.width,t.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(n,t.dims.left,t.dims.top)}},ba=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},xa,Sa,Ca,wa,Ta,Ea=class{constructor(e,t=!1){this.isContextLost=!1,xa.set(this,new Set),Sa.set(this,new Set),Ca.set(this,new Set),wa.set(this,e=>{e.preventDefault(),this.isContextLost=!0;for(let e of ba(this,Sa,`f`))e()}),Ta.set(this,()=>{this.isContextLost=!1;let e=this.gl;e.getExtension(`EXT_color_buffer_float`),e.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!e.getExtension(`EXT_float_blend`);for(let e of ba(this,xa,`f`))e.restore();for(let e of ba(this,Ca,`f`))e()});let n=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:t});if(!n)throw Error(`[VFX-JS] WebGL2 is not available.`);this.gl=n,this.canvas=e,n.getExtension(`EXT_color_buffer_float`),n.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!n.getExtension(`EXT_float_blend`),this.floatLinearFilter=!!n.getExtension(`OES_texture_float_linear`),this.maxTextureSize=n.getParameter(n.MAX_TEXTURE_SIZE),e.addEventListener(`webglcontextlost`,ba(this,wa,`f`),!1),e.addEventListener(`webglcontextrestored`,ba(this,Ta,`f`),!1)}setSize(e,t,n){let r=Math.floor(e*n),i=Math.floor(t*n);(this.canvas.width!==r||this.canvas.height!==i)&&(this.canvas.width=r,this.canvas.height=i)}addResource(e){ba(this,xa,`f`).add(e)}removeResource(e){ba(this,xa,`f`).delete(e)}onContextLost(e){return ba(this,Sa,`f`).add(e),()=>ba(this,Sa,`f`).delete(e)}onContextRestored(e){return ba(this,Ca,`f`).add(e),()=>ba(this,Ca,`f`).delete(e)}};xa=new WeakMap,Sa=new WeakMap,Ca=new WeakMap,wa=new WeakMap,Ta=new WeakMap;var Da=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Oa=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ka,Aa,ja,Ma,Na=class{constructor(e){ka.add(this),Aa.set(this,void 0),ja.set(this,void 0),Da(this,Aa,e,`f`),this.gl=e.gl,Oa(this,ka,`m`,Ma).call(this),e.addResource(this)}restore(){Oa(this,ka,`m`,Ma).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){Oa(this,Aa,`f`).removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(Oa(this,ja,`f`))}};Aa=new WeakMap,ja=new WeakMap,ka=new WeakSet,Ma=function(){let e=this.gl,t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw Error(`[VFX-JS] Failed to create quad VAO`);this.vao=t,Da(this,ja,n,`f`);let r=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)};function Pa(e,t,n,r={}){return new kn(e,t,n,{float:r.float??!1})}function Fa(e,t){let n=t.renderingToBuffer??!1,r;r=n?`none`:t.premultipliedAlpha?`premultiplied`:`normal`;let i=t.glslVersion??Xn(t.fragmentShader);return new rr(e,t.vertexShader??(i===`100`?`
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
`),t.fragmentShader,t.uniforms,r,i)}var Ia=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},R=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},z,La,Ra,za,Ba,Va,Ha=class{constructor(e,t,n,r,i,a,o,s){if(z.set(this,void 0),La.set(this,void 0),Ra.set(this,void 0),za.set(this,void 0),Ba.set(this,void 0),Va.set(this,void 0),Ia(this,za,r??!1,`f`),Ia(this,Ba,i??!1,`f`),Ia(this,Va,a,`f`),Ia(this,La,{},`f`),Ia(this,z,{src:{value:null},offset:{value:new zn},resolution:{value:new zn},viewport:{value:new Bn},time:{value:0},mouse:{value:new zn},passIndex:{value:0}},`f`),n)for(let[e,t]of Object.entries(n))typeof t==`function`?(R(this,La,`f`)[e]=t,R(this,z,`f`)[e]={value:t()}):R(this,z,`f`)[e]={value:t};this.pass=Fa(e,{fragmentShader:t,uniforms:R(this,z,`f`),renderingToBuffer:o??!1,premultipliedAlpha:!0,glslVersion:s})}get uniforms(){return R(this,z,`f`)}setUniforms(e,t,n,r,i,a){R(this,z,`f`).src.value=e,R(this,z,`f`).resolution.value.set(n.w*t,n.h*t),R(this,z,`f`).offset.value.set(n.x*t,n.y*t),R(this,z,`f`).time.value=r,R(this,z,`f`).mouse.value.set(i*t,a*t)}updateCustomUniforms(e){for(let[e,t]of Object.entries(R(this,La,`f`)))R(this,z,`f`)[e]&&(R(this,z,`f`)[e].value=t());if(e)for(let[t,n]of Object.entries(e))R(this,z,`f`)[t]&&(R(this,z,`f`)[t].value=n())}initializeBackbuffer(e,t,n,r){R(this,za,`f`)&&!R(this,Ra,`f`)&&(R(this,Va,`f`)?Ia(this,Ra,new Rn(e,R(this,Va,`f`)[0],R(this,Va,`f`)[1],1,R(this,Ba,`f`)),`f`):Ia(this,Ra,new Rn(e,t,n,r,R(this,Ba,`f`)),`f`))}resizeBackbuffer(e,t){R(this,Ra,`f`)&&!R(this,Va,`f`)&&R(this,Ra,`f`).resize(e,t)}registerBufferUniform(e){R(this,z,`f`)[e]||(R(this,z,`f`)[e]={value:null})}get backbuffer(){return R(this,Ra,`f`)}get persistent(){return R(this,za,`f`)}get float(){return R(this,Ba,`f`)}get size(){return R(this,Va,`f`)}dispose(){this.pass.dispose(),R(this,Ra,`f`)?.dispose()}};z=new WeakMap,La=new WeakMap,Ra=new WeakMap,za=new WeakMap,Ba=new WeakMap,Va=new WeakMap;var Ua=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Wa=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ga,Ka,qa=class{constructor(e){Ga.set(this,void 0),Ka.set(this,new Map),Ua(this,Ga,e,`f`)}get(e,t,n){let r=`${t}\0${e}\0${n??``}`,i=Wa(this,Ka,`f`).get(r);return i||(i=new Zn(Wa(this,Ga,`f`),e,t,n),Wa(this,Ka,`f`).set(r,i)),i}get size(){return Wa(this,Ka,`f`).size}dispose(){for(let e of Wa(this,Ka,`f`).values())e.dispose();Wa(this,Ka,`f`).clear()}};Ga=new WeakMap,Ka=new WeakMap;var B=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},V=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},H,Ja,Ya,U,Xa,Za,Qa,W,G,K,$a,q,eo,to,no,ro,io,ao,J,Y,oo,so,co,lo,uo,X,fo,po,mo,ho,go,_o,vo,yo,bo,xo,So,Co,wo,To,Eo,Do,Oo,ko,Ao,jo,Mo,No,Z,Po,Fo,Io,Lo,Ro,zo,Bo=new Map;function Vo(e,t){return e===`hic`||t===!0?null:typeof t==`number`?t.toString():e===`video`?`0.0001`:`0`}function Ho(e,t){let n=e.getContext(`2d`);n&&(n.clearRect(0,0,e.width,e.height),n.drawImage(t,0,0,e.width,e.height))}var Uo=class{constructor(e,t){H.add(this),Ja.set(this,void 0),Ya.set(this,void 0),U.set(this,void 0),Xa.set(this,void 0),Za.set(this,void 0),Qa.set(this,void 0),W.set(this,void 0),G.set(this,[]),K.set(this,void 0),$a.set(this,new Map),q.set(this,null),eo.set(this,!1),to.set(this,new WeakSet),no.set(this,{}),ro.set(this,{}),io.set(this,0),ao.set(this,void 0),J.set(this,2),Y.set(this,[]),oo.set(this,new oa({showPlain:e=>{if(e.type===`hic`){let t=e.srcTexture.source;t instanceof OffscreenCanvas&&Ho(e.element,t)}else e.element.style.setProperty(`opacity`,e.originalOpacity.toString())},hidePlain:(e,t)=>{if(e.type===`hic`){let t=e.element;t.getContext(`2d`)?.clearRect(0,0,t.width,t.height)}else e.element.style.opacity=t},isRegistered:e=>V(this,Y,`f`).includes(e)})),so.set(this,0),co.set(this,1),lo.set(this,Date.now()/1e3),uo.set(this,!1),X.set(this,Si(0)),fo.set(this,Si(0)),po.set(this,[0,0]),mo.set(this,0),ho.set(this,0),go.set(this,0),_o.set(this,0),vo.set(this,new WeakMap),bo.set(this,async()=>{if(typeof window<`u`){for(let e of V(this,Y,`f`))if(e.type===`text`&&e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await V(this,H,`m`,So).call(this,e),e.width=n,e.height=r)}for(let e of V(this,Y,`f`))if(e.type===`text`&&!e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await V(this,H,`m`,So).call(this,e),e.width=n,e.height=r)}}}),xo.set(this,e=>{typeof window<`u`&&(B(this,go,e.clientX,`f`),B(this,_o,window.innerHeight-e.clientY,`f`))}),Eo.set(this,()=>{this.isPlaying()&&(this.render(),B(this,ao,requestAnimationFrame(V(this,Eo,`f`)),`f`))}),B(this,Ja,e,`f`),B(this,Ya,t,`f`),B(this,U,new Ea(t,e.preserveDrawingBuffer),`f`),B(this,Xa,V(this,U,`f`).gl,`f`),V(this,Xa,`f`).clearColor(0,0,0,0),B(this,J,e.pixelRatio,`f`),B(this,co,e.timeScale,`f`),B(this,lo,Date.now()/1e3,`f`),B(this,Za,new Na(V(this,U,`f`)),`f`),B(this,Qa,new qa(V(this,U,`f`)),`f`),typeof window<`u`&&(window.addEventListener(`resize`,V(this,bo,`f`)),window.addEventListener(`pointermove`,V(this,xo,`f`))),V(this,bo,`f`).call(this),B(this,W,new or(V(this,U,`f`)),`f`),V(this,H,`m`,Fo).call(this,e.postEffects),V(this,U,`f`).onContextRestored(()=>{V(this,Xa,`f`).clearColor(0,0,0,0)})}destroy(){this.stop(),typeof window<`u`&&(window.removeEventListener(`resize`,V(this,bo,`f`)),window.removeEventListener(`pointermove`,V(this,xo,`f`))),V(this,K,`f`)?.dispose();for(let e of V(this,$a,`f`).values())e?.dispose();for(let e of V(this,G,`f`))e.pass.dispose();V(this,q,`f`)&&(V(this,q,`f`).dispose(),B(this,q,null,`f`),B(this,eo,!1,`f`)),V(this,W,`f`).dispose(),V(this,Qa,`f`).dispose(),V(this,Za,`f`).dispose()}async addElement(e,t={},n){if(t.effect!==void 0)return V(this,H,`m`,wo).call(this,e,t,t.effect,n);let r=V(this,H,`m`,To).call(this,t),a=e.getBoundingClientRect(),o=$o(e)?wi(a):Ci(a),[s,c]=Ko(t.overflow),l=Ti(o,c),d=Jo(t.intersection),f=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),p,m,h=!1;if(e instanceof HTMLImageElement){m=`img`;let t=u(e);if(h=!!t.match(/\.gif/i),h){let n=await ya.create(t,V(this,J,`f`));Bo.set(e,n),p=new w(V(this,U,`f`),n.getCanvas())}else{let e=await Cn(t);p=new w(V(this,U,`f`),e)}}else if(e instanceof HTMLVideoElement)p=new w(V(this,U,`f`),e),m=`video`;else if(e instanceof HTMLCanvasElement)i(e)&&n?(p=new w(V(this,U,`f`),n),m=`hic`):(p=new w(V(this,U,`f`),e),m=`canvas`);else{let t=await cr(e,f,void 0,this.maxTextureSize);p=new w(V(this,U,`f`),t),m=`text`}let[ee,te]=Zo(t.wrap);p.wrapS=ee,p.wrapT=te,p.needsUpdate=!0;let ne=t.autoCrop??!0,re=Vo(m,t.overlay),ie={src:{value:p},resolution:{value:new zn},offset:{value:new zn},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},mouse:{value:new zn},intersection:{value:0},viewport:{value:new Bn},autoCrop:{value:ne}},g={};if(t.uniforms!==void 0)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(ie[e]={value:n()},g[e]=n):ie[e]={value:n};let ae;t.backbuffer&&(ae=(()=>{let e=(l.right-l.left)*V(this,J,`f`),t=(l.bottom-l.top)*V(this,J,`f`);return new Rn(V(this,U,`f`),e,t,V(this,J,`f`),!1)})(),ie.backbuffer={value:ae.texture});let oe=new Map,_=new Map;for(let e=0;e<r.length-1;e++){let t=r[e].target??`pass${e}`;r[e]={...r[e],target:t};let n=r[e].size,i=n?n[0]:(l.right-l.left)*V(this,J,`f`),a=n?n[1]:(l.bottom-l.top)*V(this,J,`f`);if(r[e].persistent){let i=n?1:V(this,J,`f`),a=n?n[0]:l.right-l.left,o=n?n[1]:l.bottom-l.top;_.set(t,new Rn(V(this,U,`f`),a,o,i,r[e].float))}else oe.set(t,Pa(V(this,U,`f`),i,a,{float:r[e].float}))}let se=[];for(let e=0;e<r.length;e++){let t=r[e],n=t.frag,i={...ie},a={};for(let[e,r]of oe)e!==t.target&&n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:r.texture});for(let[e,t]of _)n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:t.texture});if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(i[e]={value:n()},a[e]=n):i[e]={value:n};let o=Fa(V(this,U,`f`),{vertexShader:t.vert,fragmentShader:n,uniforms:i,renderingToBuffer:t.target!==void 0,glslVersion:t.glslVersion});se.push({pass:o,uniforms:i,uniformGenerators:{...g,...a},target:t.target,persistent:t.persistent,float:t.float,size:t.size,backbuffer:t.target?_.get(t.target):void 0})}let ce=V(this,so,`f`),le={type:m,element:e,isInViewport:!1,isInLogicalViewport:!1,width:o.right-o.left,height:o.bottom-o.top,passes:se,bufferTargets:oe,startTime:ce,enterTime:ce,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:s,overflow:c,intersection:d,originalOpacity:f,srcTexture:p,zIndex:t.zIndex??0,backbuffer:ae,autoCrop:ne};V(this,H,`m`,Mo).call(this,le,o,ce),V(this,H,`m`,Co).call(this,le,re)}async updateElementEffects(e,t){let n=V(this,Y,`f`).find(t=>t.element===e);if(!n)throw Error(`[VFX-JS] updateElementEffects: element not registered`);if(!n.chain)throw Error(`[VFX-JS] updateElementEffects: element is on the shader path; effect-only updates are not supported`);let r=Array.isArray(t)?[...t]:[t],i=n.chain.effects,a=new Set(i),o=[];for(let e of r)if(!a.has(e)){if(V(this,to,`f`).has(e))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");o.push(e)}await n.chain.replaceEffects(r);let s=new Set(r);for(let e of i)s.has(e)||V(this,to,`f`).delete(e);for(let e of o)V(this,to,`f`).add(e)}removeElement(e){let t=V(this,Y,`f`).findIndex(t=>t.element===e);if(t!==-1){let n=V(this,Y,`f`).splice(t,1)[0];if(n.chain)V(this,H,`m`,Ao).call(this,n.chain.effects),n.chain.dispose();else{for(let e of n.bufferTargets.values())e.dispose();for(let e of n.passes)e.pass.dispose(),e.backbuffer?.dispose();n.backbuffer?.dispose()}n.srcTexture.dispose(),e.style.setProperty(`opacity`,n.originalOpacity.toString())}}updateTextElement(e){let t=V(this,Y,`f`).findIndex(t=>t.element===e);return t===-1?Promise.resolve():V(this,H,`m`,So).call(this,V(this,Y,`f`)[t])}async updateImageElement(e){let t=V(this,Y,`f`).find(t=>t.element===e);if(t?.type!==`img`||t.isGif)return;let n=await Cn(u(e)),r=t.srcTexture,i=new w(V(this,U,`f`),n);i.wrapS=r.wrapS,i.wrapT=r.wrapT,i.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=i),t.srcTexture=i,r.dispose()}updateCanvasElement(e){let t=V(this,Y,`f`).find(t=>t.element===e);if(t){let n=t.srcTexture,r=new w(V(this,U,`f`),e);r.wrapS=n.wrapS,r.wrapT=n.wrapT,r.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=r),t.srcTexture=r,n.dispose()}}updateHICTexture(e,t){let n=V(this,Y,`f`).find(t=>t.element===e);if(n?.type!==`hic`)return;n.frozen&&Ho(e,t);let r=n.srcTexture;if(r.source===t)r.needsUpdate=!0;else{let e=new w(V(this,U,`f`),t);e.wrapS=r.wrapS,e.wrapT=r.wrapT,e.needsUpdate=!0,!n.chain&&n.passes.length>0&&(n.passes[0].uniforms.src.value=e),n.srcTexture=e,r.dispose()}}freezeInside(e){return V(this,oo,`f`).freezeInside(e,V(this,Y,`f`))}isFrozen(e){return V(this,Y,`f`).some(t=>t.element===e&&t.frozen)}forceRender(e){let t=V(this,Y,`f`).find(t=>t.element===e);return!t||t.forceRender?()=>{}:(t.forceRender=!0,()=>{t.forceRender=!1})}get maxTextureSize(){return V(this,U,`f`).maxTextureSize}isPlaying(){return V(this,ao,`f`)!==void 0}play(){this.isPlaying()||(B(this,lo,Date.now()/1e3,`f`),B(this,ao,requestAnimationFrame(V(this,Eo,`f`)),`f`))}get time(){return V(this,so,`f`)}setTime(e){B(this,so,e,`f`),B(this,uo,!0,`f`)}get timeScale(){return V(this,co,`f`)}set timeScale(e){B(this,co,e,`f`)}stop(){V(this,ao,`f`)!==void 0&&(cancelAnimationFrame(V(this,ao,`f`)),B(this,ao,void 0,`f`))}render(){let e=Date.now()/1e3;V(this,uo,`f`)?B(this,uo,!1,`f`):B(this,so,V(this,so,`f`)+(e-V(this,lo,`f`))*V(this,co,`f`),`f`),B(this,lo,e,`f`);let t=V(this,so,`f`),n=V(this,Xa,`f`);V(this,H,`m`,yo).call(this),n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,V(this,Ya,`f`).width,V(this,Ya,`f`).height),n.clear(n.COLOR_BUFFER_BIT);let r=V(this,X,`f`).right-V(this,X,`f`).left,i=V(this,X,`f`).bottom-V(this,X,`f`).top,a=Mn(0,0,r,i),o=V(this,H,`m`,Oo).call(this);o&&(V(this,H,`m`,zo).call(this,r,i),V(this,K,`f`)&&(n.bindFramebuffer(n.FRAMEBUFFER,V(this,K,`f`).fbo),n.clear(n.COLOR_BUFFER_BIT),n.bindFramebuffer(n.FRAMEBUFFER,null)));for(let e of V(this,Y,`f`)){if(e.frozen)continue;let n=e.element.getBoundingClientRect(),s=e.type===`text`?wi(n):Ci(n),c=V(this,H,`m`,Mo).call(this,e,s,t);if(!c.isVisible)continue;if(e.chain){V(this,H,`m`,Do).call(this,e,s,c,t);continue}let l=e.passes[0].uniforms;l.time.value=t-e.startTime,l.resolution.value.set((s.right-s.left)*V(this,J,`f`),(s.bottom-s.top)*V(this,J,`f`)),l.mouse.value.set((V(this,go,`f`)+V(this,mo,`f`))*V(this,J,`f`),(V(this,_o,`f`)+V(this,ho,`f`))*V(this,J,`f`));for(let t of e.passes)for(let[e,n]of Object.entries(t.uniformGenerators))t.uniforms[e].value=n();Bo.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(l.src.value.needsUpdate=!0);let u=jn(s,i,V(this,mo,`f`),V(this,ho,`f`)),d=jn(c.rectWithOverflow,i,V(this,mo,`f`),V(this,ho,`f`));e.backbuffer&&(e.passes[0].uniforms.backbuffer.value=e.backbuffer.texture);{let t=e.isFullScreen?a:d,n=Math.max(1,t.w*V(this,J,`f`)),r=Math.max(1,t.h*V(this,J,`f`)),i=Math.max(1,t.w),o=Math.max(1,t.h);for(let t=0;t<e.passes.length-1;t++){let a=e.passes[t];if(!a.size){if(a.backbuffer)a.backbuffer.resize(i,o);else{let t=e.bufferTargets.get(a.target);t&&(t.width!==n||t.height!==r)&&t.setSize(n,r)}}}}let f=new Map;for(let t of e.passes)t.backbuffer&&t.target&&f.set(t.target,t.backbuffer.texture);let p=e.srcTexture;for(let t=0;t<e.passes.length-1;t++){let r=e.passes[t],i=e.isFullScreen?a:d;r.uniforms.src.value=p;for(let[e,t]of f)r.uniforms[e]&&(r.uniforms[e].value=t);for(let[e,t]of Object.entries(r.uniformGenerators))r.uniforms[e]&&(r.uniforms[e].value=t());let o=r.size?Mn(0,0,r.size[0],r.size[1]):Mn(0,0,i.w,i.h),s=qo(n,u,i,r.size,[V(this,go,`f`),V(this,_o,`f`)],[V(this,mo,`f`),V(this,ho,`f`)],V(this,J,`f`));if(r.uniforms.resolution.value.set(...s.resolution),r.uniforms.offset.value.set(...s.offset),r.uniforms.mouse.value.set(...s.mouse),r.backbuffer)V(this,H,`m`,Z).call(this,r.pass,r.backbuffer.target,o,r.uniforms,!0),r.backbuffer.swap(),p=r.backbuffer.texture;else{let t=e.bufferTargets.get(r.target);if(!t)continue;V(this,H,`m`,Z).call(this,r.pass,t,o,r.uniforms,!0),p=t.texture}r.target&&f.set(r.target,p)}let m=e.passes[e.passes.length-1];m.uniforms.src.value=p,m.uniforms.resolution.value.set(n.width*V(this,J,`f`),n.height*V(this,J,`f`)),m.uniforms.offset.value.set(u.x*V(this,J,`f`),u.y*V(this,J,`f`)),m.uniforms.mouse.value.set((V(this,go,`f`)+V(this,mo,`f`))*V(this,J,`f`),(V(this,_o,`f`)+V(this,ho,`f`))*V(this,J,`f`));for(let[e,t]of f)m.uniforms[e]&&(m.uniforms[e].value=t);for(let[e,t]of Object.entries(m.uniformGenerators))m.uniforms[e]&&(m.uniforms[e].value=t());e.backbuffer?(m.uniforms.backbuffer.value=e.backbuffer.texture,e.isFullScreen?(e.backbuffer.resize(r,i),V(this,H,`m`,Po).call(this,e,u.x,u.y),V(this,H,`m`,Z).call(this,m.pass,e.backbuffer.target,a,m.uniforms,!0),e.backbuffer.swap(),V(this,W,`f`).setUniforms(e.backbuffer.texture,V(this,J,`f`),a),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,o&&V(this,K,`f`)||null,a,V(this,W,`f`).uniforms,!1)):(e.backbuffer.resize(d.w,d.h),V(this,H,`m`,Po).call(this,e,e.overflow.left,e.overflow.bottom),V(this,H,`m`,Z).call(this,m.pass,e.backbuffer.target,e.backbuffer.getViewport(),m.uniforms,!0),e.backbuffer.swap(),V(this,W,`f`).setUniforms(e.backbuffer.texture,V(this,J,`f`),d),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,o&&V(this,K,`f`)||null,d,V(this,W,`f`).uniforms,!1))):(V(this,H,`m`,Po).call(this,e,u.x,u.y),V(this,H,`m`,Z).call(this,m.pass,o&&V(this,K,`f`)||null,e.isFullScreen?a:d,m.uniforms,!1))}o&&V(this,K,`f`)&&(V(this,q,`f`)&&V(this,eo,`f`)?V(this,H,`m`,Lo).call(this,a,t):V(this,H,`m`,Ro).call(this,a,t))}};Ja=new WeakMap,Ya=new WeakMap,U=new WeakMap,Xa=new WeakMap,Za=new WeakMap,Qa=new WeakMap,W=new WeakMap,G=new WeakMap,K=new WeakMap,$a=new WeakMap,q=new WeakMap,eo=new WeakMap,to=new WeakMap,no=new WeakMap,ro=new WeakMap,io=new WeakMap,ao=new WeakMap,J=new WeakMap,Y=new WeakMap,oo=new WeakMap,so=new WeakMap,co=new WeakMap,lo=new WeakMap,uo=new WeakMap,X=new WeakMap,fo=new WeakMap,po=new WeakMap,mo=new WeakMap,ho=new WeakMap,go=new WeakMap,_o=new WeakMap,vo=new WeakMap,bo=new WeakMap,xo=new WeakMap,Eo=new WeakMap,H=new WeakSet,yo=function(){if(typeof window>`u`)return;let e=V(this,Ya,`f`).ownerDocument,t=e.compatMode===`BackCompat`?e.body:e.documentElement,n=t.clientWidth,r=t.clientHeight,i=window.scrollX,a=window.scrollY,o,s;if(V(this,Ja,`f`).fixedCanvas)o=0,s=0;else if(V(this,Ja,`f`).wrapper)o=n*V(this,Ja,`f`).scrollPadding[0],s=r*V(this,Ja,`f`).scrollPadding[1];else{let t=e.body.scrollWidth-(i+n),c=e.body.scrollHeight-(a+r);o=Qo(n*V(this,Ja,`f`).scrollPadding[0],0,t),s=Qo(r*V(this,Ja,`f`).scrollPadding[1],0,c)}let c=n+o*2,l=r+s*2;(c!==V(this,po,`f`)[0]||l!==V(this,po,`f`)[1])&&(V(this,Ya,`f`).style.width=`${c}px`,V(this,Ya,`f`).style.height=`${l}px`,V(this,U,`f`).setSize(c,l,V(this,J,`f`)),B(this,X,Si({top:-s,left:-o,right:n+o,bottom:r+s}),`f`),B(this,fo,Si({top:0,left:0,right:n,bottom:r}),`f`),B(this,po,[c,l],`f`),B(this,mo,o,`f`),B(this,ho,s,`f`)),V(this,Ja,`f`).fixedCanvas||V(this,Ya,`f`).style.setProperty(`transform`,`translate(${i-o}px, ${a-s}px)`)},So=async function(e){if(!V(this,vo,`f`).get(e.element)){V(this,vo,`f`).set(e.element,!0);try{let t=e.srcTexture,n=t.source instanceof OffscreenCanvas?t.source:void 0,r=await cr(e.element,e.originalOpacity,n,this.maxTextureSize);if(r.width===0||r.height===0)return;let i=new w(V(this,U,`f`),r);i.wrapS=t.wrapS,i.wrapT=t.wrapT,i.needsUpdate=!0,!e.chain&&e.passes.length>0&&(e.passes[0].uniforms.src.value=i),e.srcTexture=i,t.dispose()}catch(e){console.error(e)}finally{V(this,vo,`f`).set(e.element,!1)}}},Co=function(e,t){!V(this,oo,`f`).adopt(e,t)&&t!==null&&e.element.style.setProperty(`opacity`,t),V(this,Y,`f`).push(e),V(this,Y,`f`).sort((e,t)=>e.zIndex-t.zIndex)},wo=async function(e,t,n,r){t.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified; `effect` takes precedence."),t.overflow!==void 0&&console.warn("[VFX-JS] `overflow` is shader-path only and is ignored by the effect path. Use each effect's own `outputRect` (with `dims.canvasRect` for fullscreen) to control its dst rect.");let a=Array.isArray(n)?[...n]:[n];V(this,H,`m`,ko).call(this,a);let o=e.getBoundingClientRect(),s=$o(e)?wi(o):Ci(o),[c,l]=Ko(t.overflow),d=Jo(t.intersection),f=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),p,m,h=!1;if(e instanceof HTMLImageElement){m=`img`;let t=u(e);if(h=!!t.match(/\.gif/i),h){let n=await ya.create(t,V(this,J,`f`));Bo.set(e,n),p=new w(V(this,U,`f`),n.getCanvas())}else{let e=await Cn(t);p=new w(V(this,U,`f`),e)}}else if(e instanceof HTMLVideoElement)p=new w(V(this,U,`f`),e),m=`video`;else if(e instanceof HTMLCanvasElement)i(e)&&r?(p=new w(V(this,U,`f`),r),m=`hic`):(p=new w(V(this,U,`f`),e),m=`canvas`);else{let t=await cr(e,f,void 0,this.maxTextureSize);p=new w(V(this,U,`f`),t),m=`text`}let[ee,te]=Zo(t.wrap);p.wrapS=ee,p.wrapT=te,p.needsUpdate=!0;let ne=t.autoCrop??!0,re=Vo(m,t.overlay),ie=V(this,so,`f`),g={type:m,element:e,isInViewport:!1,isInLogicalViewport:!1,width:s.right-s.left,height:s.bottom-s.top,passes:[],bufferTargets:new Map,startTime:ie,enterTime:ie,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:c,overflow:l,intersection:d,originalOpacity:f,srcTexture:p,zIndex:t.zIndex??0,backbuffer:void 0,autoCrop:ne,effectLastRenderTime:ie},ae=gi(()=>g.srcTexture,()=>Yo(g.srcTexture,`w`),()=>Yo(g.srcTexture,`h`)),oe={},_={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(_[e]=n,oe[e]=n()):oe[e]=n;g.effectUniformGenerators=_,g.effectStaticUniforms=oe;let se={autoCrop:ne,glslVersion:t.glslVersion??`300 es`},ce=new $i(V(this,U,`f`),V(this,Za,`f`),V(this,J,`f`),a,se,ae,!1,V(this,Qa,`f`));try{await ce.initAll()}catch(t){throw V(this,H,`m`,Ao).call(this,a),p.dispose(),e.style.setProperty(`opacity`,f.toString()),t}g.chain=ce,V(this,H,`m`,Mo).call(this,g,s,ie),V(this,H,`m`,Co).call(this,g,re)},To=function(e){let t=t=>t.glslVersion===void 0&&e.glslVersion!==void 0?{...t,glslVersion:e.glslVersion}:t;return Array.isArray(e.shader)?e.shader.map(t):[t({frag:V(this,H,`m`,No).call(this,e.shader||`uvGradient`)})]},Do=function(e,t,n,r){let i=e.chain;if(!i)return;let a=V(this,J,`f`);Bo.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(e.srcTexture.needsUpdate=!0);let o={...e.effectStaticUniforms??{}};if(e.effectUniformGenerators)for(let[t,n]of Object.entries(e.effectUniformGenerators))o[t]=n();let s=V(this,X,`f`).right-V(this,X,`f`).left,c=V(this,X,`f`).bottom-V(this,X,`f`).top,l=jn(t,c,V(this,mo,`f`),V(this,ho,`f`)),u=V(this,go,`f`)+V(this,mo,`f`)-l.x,d=V(this,_o,`f`)+V(this,ho,`f`)-l.y,f=t.right-t.left,p=t.bottom-t.top,m=r-(e.effectLastRenderTime??r);e.effectLastRenderTime=r;let h=V(this,H,`m`,Oo).call(this)&&V(this,K,`f`)?vi(V(this,K,`f`)):null;i.run({time:r-e.startTime,deltaTime:m,mouse:[u*a,d*a],mouseViewport:[V(this,go,`f`)*a,V(this,_o,`f`)*a],intersection:n.intersection,enterTime:r-e.enterTime,leaveTime:r-e.leaveTime,resolvedUniforms:o,canvasSize:[s,c],canvasBufferSize:[s*a,c*a],elementSize:[f,p],elementBufferSize:[f*a,p*a],elementRectOnCanvasPx:{x:l.x*a,y:l.y*a,w:l.w*a,h:l.h*a},finalTarget:h,isVisible:n.isVisible})},Oo=function(){return V(this,G,`f`).length>0||V(this,q,`f`)!==null&&V(this,eo,`f`)},ko=function(e){for(let t of e)if(V(this,to,`f`).has(t))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");for(let t of e)V(this,to,`f`).add(t)},Ao=function(e){for(let t of e)V(this,to,`f`).delete(t)},jo=function(e){let t=e.hitTestPadBuffer,n=V(this,J,`f`);return bi({top:t.top/n,right:t.right/n,bottom:t.bottom/n,left:t.left/n})},Mo=function(e,t,n){let r=Ti(t,e.chain?V(this,H,`m`,jo).call(this,e.chain):e.overflow),i=e.isFullScreen||Wo(V(this,fo,`f`),r),a=Ti(V(this,fo,`f`),e.intersection.rootMargin),o=Oi(a,t),s=e.isFullScreen||Go(a,t,o,e.intersection.threshold);!e.isInLogicalViewport&&s&&(e.enterTime=n,e.leaveTime=1/0),e.isInLogicalViewport&&!s&&(e.leaveTime=n),e.isInViewport=i,e.isInLogicalViewport=s;let c=i&&n-e.leaveTime<=e.release||e.forceRender===!0&&t.right>t.left&&t.bottom>t.top;if(c&&!e.chain&&e.passes.length>0){let t=e.passes[0].uniforms;t.intersection.value=o,t.enterTime.value=n-e.enterTime,t.leaveTime.value=n-e.leaveTime}return{isVisible:c,intersection:o,rectWithOverflow:r}},No=function(e){return e in r?r[e]:e},Z=function(e,t,n,r,i){let a=V(this,Xa,`f`);i&&t!==null&&t!==V(this,K,`f`)&&(a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.viewport(0,0,t.width,t.height),a.clear(a.COLOR_BUFFER_BIT));let o=r.viewport;o&&o.value instanceof Bn&&o.value.set(n.x*V(this,J,`f`),n.y*V(this,J,`f`),n.w*V(this,J,`f`),n.h*V(this,J,`f`));try{ir(a,V(this,Za,`f`),e,t,n,V(this,po,`f`)[0],V(this,po,`f`)[1],V(this,J,`f`))}catch(e){console.error(e)}},Po=function(e,t,n){let r=e.passes[0].uniforms.offset.value;r.x=t*V(this,J,`f`),r.y=n*V(this,J,`f`)},Fo=function(e){let t=e.length===1&&!(`frag`in e[0])?e[0]:null;if(t&&t.effect!==void 0){V(this,H,`m`,Io).call(this,t,t.effect);return}let n=[],r=[];for(let t of e)`frag`in t&&r.push(t);for(let e=0;e<r.length-1;e++)r[e].target||(r[e]={...r[e],target:`pass${e}`});for(let t of e){let e,r,i;if(`frag`in t)e=t.frag,r=new Ha(V(this,U,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,t.size,t.target!==void 0,t.glslVersion),i=t.target;else{if(t.shader===void 0)throw Error("VFXPostEffect requires `shader` (the `effect` path is not implemented yet).");e=V(this,H,`m`,No).call(this,t.shader),r=new Ha(V(this,U,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,void 0,!1,t.glslVersion),t.persistent&&r.registerBufferUniform(`backbuffer`),i=void 0}n.push(e);let a={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`&&(a[e]=n);V(this,G,`f`).push({pass:r,target:i,generators:a})}for(let e of r)e.target&&V(this,$a,`f`).set(e.target,void 0);let i=V(this,G,`f`).map(e=>e.target).filter(e=>e!==void 0);for(let e=0;e<V(this,G,`f`).length;e++)for(let t of i)n[e].match(RegExp(`uniform\\s+sampler2D\\s+${t}\\b`))&&V(this,G,`f`)[e].pass.registerBufferUniform(t)},Io=function(e,t){e.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified on post-effect; `effect` takes precedence.");let n=Array.isArray(t)?[...t]:[t];V(this,H,`m`,ko).call(this,n);let r=gi(()=>{let e=V(this,K,`f`);if(!e)throw Error(`[VFX-JS] post-effect chain active without target`);return e.texture},()=>V(this,K,`f`)?.width??0,()=>V(this,K,`f`)?.height??0),i={autoCrop:!0,glslVersion:e.glslVersion??`300 es`},a=new $i(V(this,U,`f`),V(this,Za,`f`),V(this,J,`f`),n,i,r,!0,V(this,Qa,`f`));if(e.uniforms)for(let[t,n]of Object.entries(e.uniforms))typeof n==`function`?(V(this,ro,`f`)[t]=n,V(this,no,`f`)[t]=n()):V(this,no,`f`)[t]=n;B(this,q,a,`f`),B(this,io,V(this,so,`f`),`f`),a.initAll().then(()=>{V(this,q,`f`)===a&&B(this,eo,!0,`f`)}).catch(e=>{console.error(`[VFX-JS] Post-effect init failed; post-effect disabled:`,e),V(this,q,`f`)===a&&(V(this,H,`m`,Ao).call(this,V(this,q,`f`).effects),V(this,q,`f`).dispose(),B(this,q,null,`f`),B(this,eo,!1,`f`))})},Lo=function(e,t){let n=V(this,q,`f`);if(!n)return;let r=V(this,J,`f`),i={...V(this,no,`f`)};for(let[e,t]of Object.entries(V(this,ro,`f`)))i[e]=t();let a=V(this,X,`f`).right-V(this,X,`f`).left,o=V(this,X,`f`).bottom-V(this,X,`f`).top,s=t-V(this,io,`f`);B(this,io,t,`f`);let c=[a,o],l=[a*r,o*r],u={x:e.x*r,y:e.y*r,w:e.w*r,h:e.h*r};n.run({time:t,deltaTime:s,mouse:[V(this,go,`f`)*r,V(this,_o,`f`)*r],mouseViewport:[V(this,go,`f`)*r,V(this,_o,`f`)*r],intersection:1,enterTime:0,leaveTime:0,resolvedUniforms:i,canvasSize:c,canvasBufferSize:l,elementSize:c,elementBufferSize:l,elementRectOnCanvasPx:u,finalTarget:null,isVisible:!0})},Ro=function(e,t){if(!V(this,K,`f`))return;let n=V(this,K,`f`).texture,r=new Map;for(let{pass:e,target:t}of V(this,G,`f`))t&&e.backbuffer&&r.set(t,e.backbuffer.texture);for(let i=0;i<V(this,G,`f`).length;i++){let{pass:a,target:o,generators:s}=V(this,G,`f`)[i],c=i===V(this,G,`f`).length-1,l=V(this,go,`f`)+V(this,mo,`f`),u=V(this,_o,`f`)+V(this,ho,`f`),d=a.size;if(d){let[r,i]=d;a.uniforms.src.value=n,a.uniforms.resolution.value.set(r,i),a.uniforms.offset.value.set(0,0),a.uniforms.time.value=t,a.uniforms.mouse.value.set(l/e.w*r,u/e.h*i)}else a.setUniforms(n,V(this,J,`f`),e,t,l,u);a.uniforms.passIndex.value=i,a.updateCustomUniforms(s);for(let[e,t]of r){let n=a.uniforms[e];n&&(n.value=t)}if(c)a.backbuffer?(a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture),V(this,H,`m`,Z).call(this,a.pass,a.backbuffer.target,e,a.uniforms,!0),a.backbuffer.swap(),V(this,W,`f`).setUniforms(a.backbuffer.texture,V(this,J,`f`),e),V(this,H,`m`,Z).call(this,V(this,W,`f`).pass,null,e,V(this,W,`f`).uniforms,!1)):V(this,H,`m`,Z).call(this,a.pass,null,e,a.uniforms,!1);else if(a.backbuffer){a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture);let t=d?Mn(0,0,d[0]/V(this,J,`f`),d[1]/V(this,J,`f`)):e;V(this,H,`m`,Z).call(this,a.pass,a.backbuffer.target,t,a.uniforms,!0),a.backbuffer.swap(),n=a.backbuffer.texture,o&&r.set(o,a.backbuffer.texture)}else{let t=o??`postEffect${i}`,s=V(this,$a,`f`).get(t),c=d?d[0]:e.w*V(this,J,`f`),l=d?d[1]:e.h*V(this,J,`f`);s&&s.width===c&&s.height===l||(s?.dispose(),s=Pa(V(this,U,`f`),c,l,{float:a.float}),V(this,$a,`f`).set(t,s));let u=d?Mn(0,0,d[0]/V(this,J,`f`),d[1]/V(this,J,`f`)):e;V(this,H,`m`,Z).call(this,a.pass,s,u,a.uniforms,!0),n=s.texture,o&&r.set(o,s.texture)}}},zo=function(e,t){let n=e*V(this,J,`f`),r=t*V(this,J,`f`);V(this,K,`f`)&&V(this,K,`f`).width===n&&V(this,K,`f`).height===r||(V(this,K,`f`)?.dispose(),B(this,K,Pa(V(this,U,`f`),n,r),`f`));for(let{pass:n}of V(this,G,`f`))n.persistent&&!n.backbuffer?n.initializeBackbuffer(V(this,U,`f`),e,t,V(this,J,`f`)):n.backbuffer&&n.resizeBackbuffer(e,t)};function Wo(e,t){return t.left<=e.right&&t.right>=e.left&&t.top<=e.bottom&&t.bottom>=e.top}function Go(e,t,n,r){return r===0?Wo(e,t):n>=r}function Ko(e){return e===!0?[!0,xi]:e===void 0?[!1,xi]:[!1,bi(e)]}function qo(e,t,n,r,i,a,o){let s=i[0]+a[0]-n.x,c=i[1]+a[1]-n.y;return r?{resolution:[r[0],r[1]],offset:[0,0],mouse:[s/n.w*r[0],c/n.h*r[1]]}:{resolution:[e.width*o,e.height*o],offset:[(t.x-n.x)*o,(t.y-n.y)*o],mouse:[s*o,c*o]}}function Jo(e){return{threshold:e?.threshold??0,rootMargin:bi(e?.rootMargin??0)}}function Yo(e,t){let n=e.source;if(!n)return 0;if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return t===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return t===`w`?n.videoWidth:n.videoHeight;let r=n;return t===`w`?r.width:r.height}function Xo(e){return e===`repeat`?`repeat`:e===`mirror`?`mirror`:`clamp`}function Zo(e){if(!e)return[`clamp`,`clamp`];if(Array.isArray(e))return[Xo(e[0]),Xo(e[1])];let t=Xo(e);return[t,t]}function Qo(e,t,n){return Math.max(t,Math.min(n,e))}function $o(e){return!(e instanceof HTMLImageElement||e instanceof HTMLVideoElement||e instanceof HTMLCanvasElement)}function es(){try{let e=document.createElement(`canvas`);return(e.getContext(`webgl2`)||e.getContext(`webgl`))!==null}catch{return!1}}var ts=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Q=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ns,$,rs,is,as,os,ss,cs,ls,us,ds,fs;function ps(){if(typeof window>`u`)throw`Cannot find 'window'. VFX-JS only runs on the browser.`;if(typeof document>`u`)throw`Cannot find 'document'. VFX-JS only runs on the browser.`}function ms(e){return{position:e?`fixed`:`absolute`,top:0,left:0,width:`0px`,height:`0px`,"z-index":9999,"pointer-events":`none`}}var hs=class e{static init(t){try{return new e(t)}catch{return null}}constructor(e={}){if(ns.add(this),$.set(this,void 0),rs.set(this,void 0),is.set(this,new Map),as.set(this,new Set),ps(),!es())throw Error(`[VFX-JS] WebGL is not available in this environment.`);let t=un(e),n=document.createElement(`canvas`),r=ms(t.fixedCanvas);for(let[e,t]of Object.entries(r))n.style.setProperty(e,t.toString());t.zIndex!==void 0&&n.style.setProperty(`z-index`,t.zIndex.toString()),(t.wrapper??document.body).appendChild(n),ts(this,rs,n,`f`),ts(this,$,new Uo(t,n),`f`),t.autoplay&&Q(this,$,`f`).play()}async add(e,t,n){e instanceof HTMLImageElement?await Q(this,ns,`m`,ls).call(this,e,t):e instanceof HTMLVideoElement?await Q(this,ns,`m`,us).call(this,e,t):e instanceof HTMLCanvasElement?i(e)&&n?await Q(this,ns,`m`,cs).call(this,e,t,n):await Q(this,ns,`m`,ds).call(this,e,t):await Q(this,ns,`m`,fs).call(this,e,t)}updateHICTexture(e,t){Q(this,$,`f`).updateHICTexture(e,t)}get maxTextureSize(){return Q(this,$,`f`).maxTextureSize}get canvas(){return Q(this,rs,`f`)}addHTML(e,t){return Q(this,ns,`m`,os).call(this,e,t,!1)}addHTMLWithStill(e,t){return Q(this,ns,`m`,os).call(this,e,t,!0)}addTransition(e,t={}){let n=new ln(this,e,t,()=>Q(this,as,`f`).delete(n));return Q(this,as,`f`).add(n),n}freezeInside(e){return Q(this,$,`f`).freezeInside(e)}lockSize(e){let t=Q(this,is,`f`).get(e);return t?ye(t):()=>{}}forceRender(e){let t=Q(this,is,`f`).get(e)??e;return Q(this,$,`f`).forceRender(t)}remove(e){let t=Q(this,is,`f`).get(e);t?(Te(t,e),Q(this,is,`f`).delete(e),Q(this,$,`f`).removeElement(t)):Q(this,$,`f`).removeElement(e)}updateEffects(e,t){let n=Q(this,is,`f`).get(e)??e;return Q(this,$,`f`).updateElementEffects(n,t)}async update(e){await this.updateInTime(e)}async updateInTime(e){let t=Q(this,is,`f`).get(e)??(e instanceof HTMLCanvasElement?e:null);return(t?ve(t):void 0)||(e instanceof HTMLImageElement?await Q(this,$,`f`).updateImageElement(e):e instanceof HTMLCanvasElement?Q(this,$,`f`).updateCanvasElement(e):await Q(this,$,`f`).updateTextElement(e),!0)}play(){Q(this,$,`f`).play()}stop(){Q(this,$,`f`).stop()}render(){Q(this,$,`f`).render()}get time(){return Q(this,$,`f`).time}setTime(e){Q(this,$,`f`).setTime(e)}get timeScale(){return Q(this,$,`f`).timeScale}set timeScale(e){Q(this,$,`f`).timeScale=e}destroy(){for(let e of Q(this,as,`f`))e.destroy();Q(this,as,`f`).clear();for(let[e,t]of Q(this,is,`f`))Te(t,e);Q(this,is,`f`).clear(),Q(this,$,`f`).destroy(),Q(this,rs,`f`).remove()}};$=new WeakMap,rs=new WeakMap,is=new WeakMap,as=new WeakMap,ns=new WeakSet,os=async function(e,t,n){if(!De())return console.warn(`html-in-canvas not supported, falling back to dom-to-canvas`),this.add(e,t);t.overlay!==void 0&&console.warn(`addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.`);let{overlay:r,...i}=t,a=Q(this,is,`f`).get(e);a&&Q(this,$,`f`).removeElement(a);let{canvas:o,initialCapture:s}=await we(e,{onCapture:e=>{Q(this,$,`f`).updateHICTexture(o,e)},maxSize:Q(this,$,`f`).maxTextureSize,stillCover:n?{zIndex:Q(this,ns,`m`,ss).call(this)}:void 0});a=o,Q(this,is,`f`).set(e,a),await Q(this,ns,`m`,cs).call(this,a,i,s)},ss=function(){let e=Number.parseInt(Q(this,rs,`f`).style.zIndex,10);return Number.isNaN(e)?9998:e-1},cs=async function(e,t,n){try{await Q(this,$,`f`).addElement(e,t,n)}finally{xe(e,Q(this,$,`f`).isFrozen(e))}},ls=function(e,t){return e.complete?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`load`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},us=function(e,t){return e.readyState>=3?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`canplay`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},ds=function(e,t){return Q(this,$,`f`).addElement(e,t)},fs=function(e,t){return Q(this,$,`f`).addElement(e,t)};export{hs as t};
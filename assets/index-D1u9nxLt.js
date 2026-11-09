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
    `,warpReveal:`
    ${i}
    uniform float enterProgress;
    uniform float leaveProgress;

    ${a}

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        float t = enterProgress * (1. - leaveProgress);

        if (t == 0.) {
            discard;
        }

        if (t < 1.) {
            uv.x += sin(floor(uv.y * 300.)) * 3. * exp(t * -10.);
        }

        outColor = readTex(src, uv);
    }
    `,slitScanReveal:`
    ${i}
    ${a}

    uniform float enterProgress;
    uniform float leaveProgress;

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        // Hidden before enter and after leave
        if (enterProgress == 0.) {
            discard;
        }

        if (0. < leaveProgress) {
            // Leaving
            float t = 1. - leaveProgress;
            uv.y = uv.y < t ? uv.y : t;
        } else if (enterProgress < 1.) {
            // Entering
            float t = 1. - enterProgress;
            uv.y = uv.y < t ? t : uv.y;
        }

        outColor = readTex(src, uv);
    }
    `,pixelateReveal:`
    ${i}
    ${a}

    uniform float enterProgress;
    uniform float leaveProgress;

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        float t = enterProgress * (1. - leaveProgress);

        if (t == 0.) {
            discard;
        } else if (t < 1.) {
            float b = max(1., floor(t * 64.));
            uv = (floor(uv * b) + .5) / b;
        }

        outColor = readTex(src, uv);
    }
    `,focusReveal:`
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
    `},s={...o,slitScanTransition:o.slitScanReveal,warpTransition:o.warpReveal,pixelateTransition:o.pixelateReveal,focusTransition:o.focusReveal};function c(e){return e.tagName===`CANVAS`&&(e.hasAttribute(`layoutsubtree`)||e.getAttribute(`content`)===`drawable`)}function l(e,t){e.setAttribute(`layoutsubtree`,``),e.setAttribute(`content`,`drawable`),t?.setAttribute(`drawable`,``)}function u(e,t,n,r){if(t.width<=0||t.height<=0)return null;let i=t.left-e.left,a=t.top-e.top;return i+t.width<=0||a+t.height<=0||i>=e.width||a>=e.height?null:[i*n,a*r,t.width*n,t.height*r]}function d(e){let t=e.getBoundingClientRect(),n=getComputedStyle(e),r=Number.parseFloat(n.paddingLeft)||0,i=Number.parseFloat(n.paddingRight)||0,a=Number.parseFloat(n.paddingTop)||0,o=Number.parseFloat(n.paddingBottom)||0,s=e.clientWidth>0?t.width/e.offsetWidth:1,c=e.clientHeight>0?t.height/e.offsetHeight:1;return{left:t.left+(e.clientLeft+r)*s,top:t.top+(e.clientTop+a)*c,width:Math.max(0,e.clientWidth-r-i)*s,height:Math.max(0,e.clientHeight-a-o)*c}}function f(e){return typeof e.checkVisibility==`function`?e.checkVisibility({visibilityProperty:!0,opacityProperty:!0}):getComputedStyle(e).visibility!==`hidden`}function p(e,t){let n=t.querySelectorAll(`canvas`);if(n.length===0)return;let r=t.getBoundingClientRect();if(r.width<=0||r.height<=0)return;let i=e.canvas.width/r.width,a=e.canvas.height/r.height;for(let t of n){if(t.width===0||t.height===0||!f(t))continue;let n=u(r,d(t),i,a);if(n)try{e.drawImage(t,...n)}catch{}}}function m(e){return e.currentSrc||e.src}function h(e,t){let n=e.getBoundingClientRect(),r=e.cloneNode(!0),i=[e,...e.querySelectorAll(`*`)],a=[r,...r.querySelectorAll(`*`)],o=[],s=[];for(let e=0;e<i.length&&e<a.length;e++){let t=i[e],n=a[e];(t.scrollTop||t.scrollLeft)&&o.push([n,t.scrollTop,t.scrollLeft]),t instanceof HTMLScriptElement?s.push([n,document.createComment(`script`)]):t instanceof HTMLCanvasElement||t instanceof HTMLVideoElement?s.push([n,g(t)]):t instanceof HTMLIFrameElement?s.push([n,ne(t)]):t instanceof HTMLInputElement&&n instanceof HTMLInputElement?(n.value=t.value,n.checked=t.checked):t instanceof HTMLTextAreaElement&&n instanceof HTMLTextAreaElement?n.value=t.value:t instanceof HTMLSelectElement&&n instanceof HTMLSelectElement?n.selectedIndex=t.selectedIndex:t instanceof HTMLMediaElement&&n.removeAttribute(`autoplay`)}for(let[e,t]of s)e.replaceWith(t);r.setAttribute(`aria-hidden`,`true`);let c=r.style;c.setProperty(`position`,`fixed`),c.setProperty(`left`,`${n.left}px`),c.setProperty(`top`,`${n.top}px`),c.setProperty(`width`,`${n.width}px`),c.setProperty(`height`,`${n.height}px`),c.setProperty(`box-sizing`,`border-box`),c.setProperty(`margin`,`0`),c.setProperty(`pointer-events`,`none`),c.setProperty(`z-index`,t.toString()),e.parentNode?.insertBefore(r,e);let l=r.getBoundingClientRect();(l.left!==n.left||l.top!==n.top)&&(c.setProperty(`left`,`${n.left*2-l.left}px`),c.setProperty(`top`,`${n.top*2-l.top}px`));for(let[e,t,n]of o)e.scrollTop=t,e.scrollLeft=n;return ee(i,a),()=>{r.remove()}}function ee(e,t){let n=e[0],r=t[0];if(!n||!r||typeof n.getAnimations!=`function`)return;let i=(e,t)=>{if(!(`animationName`in e))return null;let n=e.effect,r=n?.target,i=r?t.get(r):void 0;return i===void 0?null:`${i}|${n?.pseudoElement??``}|${e.animationName}`},a=new Map(t.map((e,t)=>[e,t])),o=new Map;for(let e of r.getAnimations({subtree:!0})){let t=i(e,a);t&&o.set(t,e)}let s=new Map(e.map((e,t)=>[e,t]));for(let e of n.getAnimations({subtree:!0})){let t=i(e,s),n=t&&o.get(t);n&&(n.currentTime=e.currentTime,n.pause())}}function te(e,t){let n=e.getBoundingClientRect(),r=getComputedStyle(e);t.className=e.className,t.style.cssText=e.style.cssText,t.style.width=`${n.width}px`,t.style.height=`${n.height}px`,t.style.display=r.display===`inline`?`inline-block`:r.display,t.style.boxSizing=`border-box`}function g(e){let t=document.createElement(`canvas`),n=e instanceof HTMLVideoElement?e.videoWidth:e.width,r=e instanceof HTMLVideoElement?e.videoHeight:e.height;t.width=Math.max(1,n),t.height=Math.max(1,r),te(e,t);try{t.getContext(`2d`)?.drawImage(e,0,0,t.width,t.height)}catch{}return t}function ne(e){let t=document.createElement(`div`);return te(e,t),t}function re(e){let t=m(e);if(!t||t.startsWith(`data:`))return!1;try{return new URL(t,location.href).origin!==location.origin}catch{return!1}}async function _(e){let t=await(await fetch(e)).blob();return URL.createObjectURL(t)}async function v(e){let t=Array.from(e.querySelectorAll(`img`)).filter(e=>e.complete&&e.naturalWidth>0&&re(e));if(t.length===0)return()=>{};let n=new Map,r=[];return await Promise.all(t.map(async e=>{try{let t=m(e),i=await _(t);n.set(e,t),r.push(i),await new Promise(t=>{e.addEventListener(`load`,()=>t(),{once:!0}),e.src=i})}catch{}})),()=>{for(let[e,t]of n)e.src=t;for(let e of r)URL.revokeObjectURL(e)}}var y=[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`],b=new Set([`IMG`,`VIDEO`,`CANVAS`,`IFRAME`,`EMBED`,`OBJECT`,`INPUT`,`TEXTAREA`,`SELECT`]),ie=[`position`,`top`,`right`,`bottom`,`left`,`float`,`flex`,`flex-grow`,`flex-shrink`,`flex-basis`,`align-self`,`justify-self`,`place-self`,`order`,`grid-column`,`grid-column-start`,`grid-column-end`,`grid-row`,`grid-row-start`,`grid-row-end`,`grid-area`],x=new WeakMap,ae=new WeakMap,oe=new WeakMap,se=new WeakMap,ce=new WeakMap,le=new WeakMap,ue=new WeakMap,de=new WeakMap,fe=new WeakMap,pe=new WeakSet,me=new WeakMap,he=new WeakMap,ge=new WeakSet,_e=new WeakSet,ve=300;function ye(e,t){return new Promise(n=>{let r=t=>{clearTimeout(a),e.delete(i),n(t)},i=()=>r(!0),a=setTimeout(()=>r(!1),t);e.add(i)})}function be(e){if(e)for(let t of[...e])t()}function xe(e,t,n){if(typeof e.moveBefore==`function`)try{e.moveBefore(t,n);return}catch{}e.insertBefore(t,n)}function Se(e,t=ve){let n=he.get(e);if(!n)return;let r=ye(n,t);return e.requestPaint(),r}function Ce(e){if(ge.has(e))return()=>{};ge.add(e);let{width:t,height:n,overflow:r}=e.style,i=e.getBoundingClientRect();return e.style.setProperty(`width`,`${i.width}px`),e.style.setProperty(`height`,`${i.height}px`),e.style.setProperty(`overflow`,`hidden`),()=>{if(!ge.has(e))return;ge.delete(e),e.style.width=t,e.style.height=n,e.style.overflow=r;let i=e.firstElementChild;if(i&&!_e.has(e)){let t=Math.round(i.getBoundingClientRect().height);e.style.setProperty(`height`,`${t}px`)}}}function we(e){me.get(e)?.(),me.delete(e)}function Te(e,t=!1){requestAnimationFrame(()=>{t||e.getContext(`2d`)?.clearRect(0,0,e.width,e.height),we(e)})}async function Ee(e,t){l(e,e.firstElementChild);let n=e.getContext(`2d`);if(!n)throw Error(`Failed to get 2d context from layoutsubtree canvas`);let{onCapture:r,maxSize:i}=t,a=new Set;he.set(e,a);let o=null,s=null,c=new Promise(e=>{s=e}),u=null,d=t=>{if(t){if(t===u)return;u=t}let c=e.firstElementChild;if(!c||e.width===0||e.height===0||c.getClientRects().length===0)return;c.hasAttribute(`drawable`)||c.setAttribute(`drawable`,``),n.clearRect(0,0,e.width,e.height),n.drawElementImage(c,0,0),p(n,c);let l=e.width,d=e.height;if(i&&(l>i||d>i)){let e=Math.min(i/l,i/d);l=Math.floor(l*e),d=Math.floor(d*e)}o&&o.width===l&&o.height===d||(o=new OffscreenCanvas(l,d));let f=o.getContext(`2d`);f&&(f.clearRect(0,0,l,d),f.drawImage(e,0,0,l,d),s?(s(o),s=null,be(a)):(n.clearRect(0,0,e.width,e.height),r(o),be(a)))};e.onpaint=d,e.addEventListener(`paint`,d),ae.set(e,d);let f=new ResizeObserver(t=>{for(let n of t){let t=n.devicePixelContentBoxSize?.[0];if(t)e.width=t.inlineSize,e.height=t.blockSize;else{let t=n.borderBoxSize?.[0];if(t){let n=window.devicePixelRatio;e.width=Math.round(t.inlineSize*n),e.height=Math.round(t.blockSize*n)}}}e.requestPaint()});f.observe(e,{box:`device-pixel-content-box`}),x.set(e,f);let m=e.firstElementChild;if(m){let t=new ResizeObserver(t=>{if(ge.has(e)||_e.has(e))return;let n=t[0].borderBoxSize?.[0];if(!n)return;let r=`${Math.round(n.blockSize)}px`;r!==e.style.height&&e.style.setProperty(`height`,r)});t.observe(m),oe.set(e,t)}return c}function De(e){e.onpaint=null,be(he.get(e)),he.delete(e);let t=ae.get(e);t&&(e.removeEventListener(`paint`,t),ae.delete(e));let n=x.get(e);n&&(n.disconnect(),x.delete(e));let r=oe.get(e);r&&(r.disconnect(),oe.delete(e))}function Oe(e){let t={width:null,height:null};if(typeof e.computedStyleMap!=`function`||b.has(e.tagName))return t;let n=e.computedStyleMap(),r=e=>n.get(e)?.toString()??`auto`,i=r(`position`);if(i!==`fixed`&&i!==`absolute`)return t;let a=(t,n,i)=>{let a=r(n),o=r(i);return r(t)!==`auto`||a===`auto`||o===`auto`?null:`calc(${[`100%`,a,o,...[`margin-${n}`,`margin-${i}`].map(n=>{let i=r(n);return t===`height`&&i.includes(`%`)?getComputedStyle(e).getPropertyValue(n):i}).filter(e=>e!==`auto`)].join(` - `)})`};return{width:a(`width`,`left`,`right`),height:a(`height`,`top`,`bottom`)}}function ke(e){return b.has(e.tagName)&&typeof e.computedStyleMap==`function`&&e.computedStyleMap().get(`width`)?.toString()===`auto`}async function Ae(e,t){let n=e.getBoundingClientRect(),r=Oe(e),i=document.createElement(`canvas`);e.hasAttribute(`drawable`)||pe.add(e),l(i,e),i.className=e.className;let a=e.getAttribute(`style`);a&&i.setAttribute(`style`,a),i.style.setProperty(`padding`,`0`),i.style.setProperty(`border`,`none`),i.style.setProperty(`box-sizing`,`content-box`),i.style.setProperty(`background`,`transparent`);let o=getComputedStyle(e),s=o.display===`inline`?`block`:o.display;i.style.setProperty(`display`,s);for(let e of y)i.style.setProperty(e,o.getPropertyValue(e));for(let e of ie)i.style.setProperty(e,o.getPropertyValue(e));r.width?i.style.setProperty(`width`,r.width):e.style.width.endsWith(`px`)||ke(e)?i.style.setProperty(`width`,`${n.width}px`):i.style.setProperty(`width`,`100%`),r.height?(i.style.setProperty(`height`,r.height),_e.add(i)):i.style.height||i.style.setProperty(`height`,`${n.height}px`);let c=window.devicePixelRatio;i.width=Math.round(n.width*c),i.height=Math.round(n.height*c),t.stillCover&&me.set(i,h(e,t.stillCover.zIndex)),se.set(e,e.style.margin),ce.set(e,e.style.width),le.set(e,e.style.boxSizing),e.parentNode?.insertBefore(i,e),getComputedStyle(i).display,xe(i,e,null),e.style.setProperty(`margin`,`0`),e.style.setProperty(`width`,`100%`),e.style.setProperty(`box-sizing`,`border-box`),(r.width||r.height)&&(ue.set(e,e.style.position),e.style.setProperty(`position`,`static`)),r.height&&(de.set(e,e.style.height),e.style.setProperty(`height`,`100%`));let u=await v(e);return fe.set(i,u),{canvas:i,initialCapture:await Ee(i,t)}}function je(e,t){De(e),we(e);let n=fe.get(e);n&&(n(),fe.delete(e));let r=e.parentNode;r&&xe(r,t,e),e.remove(),pe.has(t)&&(t.removeAttribute(`drawable`),pe.delete(t));let i=se.get(t);i!==void 0&&(t.style.margin=i,se.delete(t));let a=ce.get(t);a!==void 0&&(t.style.width=a,ce.delete(t));let o=le.get(t);o!==void 0&&(t.style.boxSizing=o,le.delete(t));let s=ue.get(t);s!==void 0&&(t.style.position=s,ue.delete(t));let c=de.get(t);c!==void 0&&(t.style.height=c,de.delete(t))}var Me;function Ne(){if(Me!==void 0)return Me;try{let e=document.createElement(`canvas`),t=e.getContext(`2d`);Me=t!==null&&typeof t.drawElementImage==`function`&&typeof e.requestPaint==`function`}catch{Me=!1}return Me}var Pe=`#version 300 es
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
`,Fe=`
void main() {
  outColor = transition(uvContent, reverse > 0.5 ? 1.0 - t : t);
}
`;function Ie(e){return`${Pe}\n${e}\n${Fe}`}var Le=Pe.split(`
`).length;function Re(e){let t=e instanceof Error?e.message:String(e);if(!/compile failed|link failed/i.test(t))return null;let n=[];for(let e of t.matchAll(/ERROR:\s*\d+:(\d+):\s*(.*)/g)){let t=Number(e[1])-Le;n.push(t>=1?`line ${t}: ${e[2]}`:e[2])}return n.length>0?n:[t.split(`
`)[0]]}var ze=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Be=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ve,He=new Map;function Ue(e){let t=He.get(e);return t===void 0&&(t=Ie(e),He.set(e,t)),t}var We=new WeakMap;function Ge(e){let t=We.get(e);return t||(t=new Set,We.set(e,t)),t}function Ke(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return n<=o&&r<=s&&n+i>=o+c&&r+a>=s+l}function qe(e,t){let n=Re(t);n?(console.error(`[VFX-JS] transition "${e}" failed to compile; cutting to the new content.\n  ${n.join(`
  `)}`),console.debug(t)):console.error(`[VFX-JS] transition "${e}" failed; cutting to the new content.`,t)}var Je=class{constructor(e={}){Ve.set(this,null),this.params=e}uniforms(e){return{}}start(e){ze(this,Ve,e,`f`)}end(){ze(this,Ve,null,`f`)}outputRect(e){let t=Be(this,Ve,`f`)?.overflow??this.overflow;if(t===void 0||Ke(e.contentRect,e.canvasRect))return;if(t===!0)return e.canvasRect;let n=t*e.pixelRatio,[r,i,a,o]=e.contentRect;return[r-n,i-n,a+n*2,o+n*2]}render(e){if(e.holding){e.blit(e.src);return}let t=Ue(this.frag),n=Ge(e.gl);if(n.has(t))e.cut(),e.blit(e.src);else try{e.draw({frag:t,uniforms:{...this.uniforms(e),from:e.from,src:e.src,t:e.progress.t,reverse:+!!e.reverse,resolution:[e.dims.elementPixel[0],e.dims.elementPixel[1]],time:e.time},target:e.target})}catch(r){n.add(t),qe(this.name,r),e.cut(),e.blit(e.src)}}};Ve=new WeakMap;var Ye=class extends Je{constructor(){super(...arguments),this.name=`crossfade`,this.frag=`
vec4 transition(vec2 uv, float t) {
  return mix(readFrom(uv), readTo(uv), t);
}
`}},S=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},C=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Xe,Ze,Qe,$e,et,tt,nt,rt,it,at,ot,st,ct,lt,ut,dt,ft,pt=e=>e*e*(3-2*e);function mt(e,t){return typeof e==`function`?e(t):e===`linear`?t:pt(t)}var ht={t:0,x:0},gt=class{constructor(){Xe.add(this),this.enabled=!1,Ze.set(this,null),Qe.set(this,[0,0]),$e.set(this,[]),et.set(this,!1),tt.set(this,null),nt.set(this,null),rt.set(this,ht),it.set(this,null),at.set(this,null)}snapshot(){return S(this,Xe,`m`,ot).call(this),C(this,tt,null,`f`),this.enabled=!0,new Promise(e=>S(this,$e,`f`).push(e))}start(e){return S(this,Xe,`m`,ot).call(this),C(this,tt,e,`f`),C(this,at,e.onEnd??null,`f`),C(this,nt,null,`f`),C(this,rt,ht,`f`),C(this,et,!1,`f`),this.enabled=!1,new Promise(e=>{C(this,it,e,`f`)})}cancel(){S(this,Xe,`m`,ot).call(this),C(this,tt,null,`f`),C(this,et,!1,`f`),this.enabled=!1,S(this,Xe,`m`,st).call(this)}get frame(){let e=S(this,Ze,`f`);return!e||!S(this,et,`f`)&&!S(this,tt,`f`)?null:{from:e,progress:S(this,rt,`f`),holding:S(this,tt,`f`)===null}}cut(){S(this,tt,`f`)&&(C(this,tt,null,`f`),S(this,Xe,`m`,ot).call(this))}update(e){let t=S(this,tt,`f`);if(!t)return;S(this,nt,`f`)===null&&C(this,nt,e.time,`f`);let n=(e.time-S(this,nt,`f`))/t.duration;if(n>=1){C(this,tt,null,`f`),S(this,Xe,`m`,ot).call(this);return}let r=Math.max(n,0);C(this,rt,{t:mt(t.ease,r),x:r},`f`)}render(e){S(this,$e,`f`).length>0&&(e.blit(e.src,S(this,Xe,`m`,ct).call(this,e)),C(this,et,!0,`f`),S(this,Xe,`m`,st).call(this)),S(this,Ze,`f`)&&S(this,et,`f`)?e.blit(S(this,Ze,`f`)):(this.enabled=!1,e.blit(e.src))}dispose(){C(this,Ze,null,`f`),C(this,Qe,[0,0],`f`),S(this,Xe,`m`,ot).call(this),S(this,Xe,`m`,st).call(this)}};Ze=new WeakMap,Qe=new WeakMap,$e=new WeakMap,et=new WeakMap,tt=new WeakMap,nt=new WeakMap,rt=new WeakMap,it=new WeakMap,at=new WeakMap,Xe=new WeakSet,ot=function(){let e=S(this,at,`f`);C(this,at,null,`f`),e?.();let t=S(this,it,`f`);C(this,it,null,`f`),t?.()},st=function(){let e=S(this,$e,`f`);C(this,$e,[],`f`);for(let t of e)t()},ct=function(e){let[t,n]=e.dims.elementPixel;return S(this,Ze,`f`)&&S(this,Qe,`f`)[0]===t&&S(this,Qe,`f`)[1]===n||(S(this,Ze,`f`)?.dispose(),C(this,Ze,e.createRenderTarget({size:[t,n]}),`f`),C(this,Qe,[t,n],`f`)),S(this,Ze,`f`)};var _t=class{constructor(e,t){lt.add(this),ut.set(this,void 0),dt.set(this,null),this.effect=e,C(this,ut,t,`f`)}get enabled(){return S(this,dt,`f`)!==null&&typeof this.effect.render==`function`&&this.effect.enabled!==!1}start(e){C(this,dt,e,`f`),this.effect.start?.(e)}end(){S(this,dt,`f`)!==null&&(C(this,dt,null,`f`),this.effect.end?.())}init(e){return this.effect.init?.(e)}update(e){let t=S(this,ut,`f`).frame;if(!t||t.holding)return;let n=S(this,lt,`m`,ft).call(this,e);n&&this.effect.update?.(n)}render(e){let t=S(this,lt,`m`,ft).call(this,e);t&&this.effect.render?this.effect.render(t):e.blit(e.src)}outputRect(e){return S(this,dt,`f`)?this.effect.outputRect?.(e):void 0}dispose(){this.effect.dispose?.()}};ut=new WeakMap,dt=new WeakMap,lt=new WeakSet,ft=function(e){let t=S(this,ut,`f`).frame,n=S(this,dt,`f`);return!t||!n?null:{...e,from:t.from,progress:t.progress,holding:t.holding,reverse:n.reverse,run:n,cut:()=>S(this,ut,`f`).cut()}};function vt(){let e=globalThis.navigation?.currentEntry;if(!(!e||e.index<0||!e.key))return{index:e.index,key:e.key}}function yt(e=vt){let t=new Map,n;return{pick(r){let i=e();if(!i)return r;let a=n??i;n=i;let o=t.get(a.key);if(i.index<a.index&&o)return{...o,reverse:!0};let s=t.get(i.key);return i.index>a.index&&s?s:(t.set(i.key,r),r)}}}var bt=yt(),w=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},T=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},E,xt,D,St,Ct,wt,Tt,Et,Dt,Ot,kt,At,jt,Mt,Nt,Pt,Ft,It,Lt,Rt,zt,Bt,Vt,Ht,Ut,Wt,Gt,Kt,qt,Jt,Yt,Xt,Zt,Qt,$t,en,tn,nn,rn,an=.6,on=300,sn=1e3;function cn(e,t){let n=t.transition===void 0?e.params===void 0&&t.params===void 0?void 0:{...e.params,...t.params}:t.params;return{transition:t.transition??e.transition,params:n,reverse:t.reverse??e.reverse,duration:t.duration??e.duration,overflow:t.overflow??e.overflow,ease:t.ease??e.ease}}function ln(e,t={}){let n=cn(e,t);return{transition:n.transition??Ye,params:n.params,reverse:n.reverse??!1,duration:n.duration??an,overflow:n.overflow,ease:n.ease}}var un=e=>typeof e==`function`;function dn(e,t){return Array.isArray(e)&&Array.isArray(t)?e.length===t.length&&e.every((e,n)=>e===t[n]):e===t}function fn(e,t){let n=e??{},r=t??{},i=Object.keys(n);return i.length===Object.keys(r).length&&i.every(e=>e in r&&dn(n[e],r[e]))}var pn=new WeakMap;function mn(e){let t=e.getBoundingClientRect();return t.right>0&&t.bottom>0&&t.left<window.innerWidth&&t.top<window.innerHeight}function hn(e){return e.tagName===`IMG`?e.loading===`lazy`&&!mn(e):e.preload===`none`}function gn(e,t,n=on){let r=[];for(let t of e.querySelectorAll(`img, video`)){let e=t.tagName===`IMG`;!(e?t.complete:t.readyState>=2)&&!hn(t)&&r.push(new Promise(n=>{let r=()=>n();t.addEventListener(e?`load`:`loadeddata`,r,{once:!0}),t.addEventListener(`error`,r,{once:!0})}))}return t&&r.push(t),r.length===0?Promise.resolve():new Promise(e=>{let t=setTimeout(e,n),i=()=>{clearTimeout(t),e()};Promise.all(r).then(i,i)})}function _n(e,t){return new Promise((n,r)=>{let i=setTimeout(()=>n(!1),t);e.then(()=>{clearTimeout(i),n(!0)},e=>{clearTimeout(i),r(e)})})}var vn=()=>new Promise(e=>requestAnimationFrame(()=>e()));function yn(e,t){return e.length===t.length&&e.every((e,n)=>e===t[n])}var bn=class{constructor(e,t,n={},r,i=new gt,a=bt){E.add(this),xt.set(this,void 0),D.set(this,void 0),St.set(this,void 0),Ct.set(this,void 0),wt.set(this,void 0),Tt.set(this,void 0),Et.set(this,void 0),Dt.set(this,[]),Ot.set(this,[]),kt.set(this,!1),At.set(this,!1),jt.set(this,!1),Mt.set(this,0),Nt.set(this,null),Pt.set(this,!1),Ft.set(this,!1),It.set(this,null),Lt.set(this,[]),Rt.set(this,null),zt.set(this,null),Bt.set(this,null),w(this,Et,r,`f`),w(this,xt,e,`f`),w(this,D,t,`f`),w(this,St,n,`f`),w(this,Ct,i,`f`),w(this,wt,a,`f`),w(this,Tt,n.keepWrapped??!1,`f`)}get running(){return T(this,Nt,`f`)!==null}show(e,t={}){let n=T(this,E,`m`,Vt).call(this,e),{remove:r=!1,...i}=t;if(!this.running&&T(this,E,`m`,Ht).call(this,n))return Promise.resolve();let a=T(this,St,`f`).slideSpec?.(n),o=a?cn(a,i):i;return T(this,E,`m`,Ut).call(this,()=>{n.parentElement!==T(this,D,`f`)&&T(this,D,`f`).append(n);for(let e of Array.from(T(this,D,`f`).children))e!==n&&(r?e.remove():e.hidden=!0);n.hidden=!1},o)}run(e,t={}){return T(this,St,`f`).autoReverse?T(this,E,`m`,Ut).call(this,e,()=>T(this,wt,`f`).pick(typeof t==`function`?t():t)):T(this,E,`m`,Ut).call(this,e,t)}cancel(){var e;let t=w(this,Mt,(e=T(this,Mt,`f`),++e),`f`);w(this,Nt,null,`f`),T(this,E,`m`,en).call(this),T(this,Ct,`f`).cancel(),T(this,E,`m`,Qt).call(this),T(this,E,`m`,Zt).call(this),T(this,E,`m`,qt).call(this),T(this,E,`m`,nn).call(this,t)}destroy(){T(this,Pt,`f`)||(w(this,Pt,!0,`f`),this.cancel(),w(this,Rt,null,`f`),T(this,Et,`f`)?.call(this))}};xt=new WeakMap,D=new WeakMap,St=new WeakMap,Ct=new WeakMap,wt=new WeakMap,Tt=new WeakMap,Et=new WeakMap,Dt=new WeakMap,Ot=new WeakMap,kt=new WeakMap,At=new WeakMap,jt=new WeakMap,Mt=new WeakMap,Nt=new WeakMap,Pt=new WeakMap,Ft=new WeakMap,It=new WeakMap,Lt=new WeakMap,Rt=new WeakMap,zt=new WeakMap,Bt=new WeakMap,E=new WeakSet,Vt=function(e){let t=T(this,D,`f`),n=typeof e==`number`?t.children[e]:typeof e==`string`?t.querySelector(e):e;if(!n)throw TypeError(`[VFX-JS] show(): no slide for ${e}.`);if(n.parentElement!==t&&(n.isConnected||t.contains(n)))throw TypeError(`[VFX-JS] show(): the slide must be a direct child of the container.`);return n},Ht=function(e){return e.parentElement!==T(this,D,`f`)||e.hidden?!1:Array.from(T(this,D,`f`).children).every(t=>t===e||t.hidden)},Ut=async function(e,t){var n;if(T(this,Pt,`f`)){await e();return}let r=w(this,Mt,(n=T(this,Mt,`f`),++n),`f`);w(this,Nt,r,`f`);try{await T(this,E,`m`,Wt).call(this,r,e,t)}finally{T(this,Nt,`f`)===r&&w(this,Nt,null,`f`),T(this,Mt,`f`)===r&&(T(this,E,`m`,Qt).call(this),T(this,E,`m`,Zt).call(this),T(this,E,`m`,qt).call(this))}},Wt=async function(e,t,n){let r=()=>e===T(this,Mt,`f`),i=!1,a=async()=>{i||(i=!0,await t())},o=async()=>{T(this,E,`m`,en).call(this),T(this,Ct,`f`).cancel(),await a(),r()&&(T(this,Ft,`f`)&&T(this,Tt,`f`)&&await T(this,xt,`f`).update(T(this,D,`f`)),T(this,E,`m`,nn).call(this,e))},s=null;if(typeof n!=`function`){if(s=T(this,E,`m`,Gt).call(this,ln(T(this,St,`f`),n)),!r())return a();if(s===null)return o()}T(this,E,`m`,Xt).call(this);try{await T(this,E,`m`,tn).call(this,s?.slots??null,r,!0)}catch(e){return console.error(`[VFX-JS] transition failed to wrap the element; cutting to the new content.`,e),a()}if(!r())return a();T(this,Ot,`f`).push(T(this,xt,`f`).lockSize(T(this,D,`f`))),T(this,Ot,`f`).push(T(this,xt,`f`).forceRender(T(this,D,`f`)));let c=await _n(T(this,Ct,`f`).snapshot(),sn);if(!r())return a();if(!c){T(this,E,`m`,Yt).call(this),await a(),r()&&T(this,E,`m`,nn).call(this,e);return}s&&T(this,E,`m`,Jt).call(this,e,s);let l;try{await a(),typeof n==`function`&&r()&&(l=n())}catch(t){throw r()&&(T(this,E,`m`,en).call(this),T(this,Ct,`f`).cancel(),T(this,E,`m`,nn).call(this,e)),t}if(!r())return;if(s===null){if(s=T(this,E,`m`,Gt).call(this,ln(T(this,St,`f`),l)),!r())return;if(s===null)return o();try{await T(this,E,`m`,tn).call(this,s.slots,r,!1)}catch(e){return console.error(`[VFX-JS] transition failed to swap the effects; cutting to the new content.`,e),o()}if(!r())return;T(this,E,`m`,Jt).call(this,e,s)}T(this,E,`m`,Xt).call(this);try{await T(this,E,`m`,rn).call(this)}catch(e){console.error(`[VFX-JS] transition waitFor failed:`,e)}if(!r()||(!await T(this,xt,`f`).updateInTime(T(this,D,`f`))&&!T(this,At,`f`)&&(w(this,At,!0,`f`),console.warn(`[VFX-JS] transition: the new content was not captured in time; it may pop in during the run.`)),!r())||(await vn(),!r()))return;let u=await _n(T(this,Ct,`f`).start({duration:s.run.duration,ease:s.ease,onEnd:()=>T(this,E,`m`,en).call(this,e)}),s.run.duration*1e3+sn);r()&&(u||T(this,E,`m`,Yt).call(this),T(this,E,`m`,nn).call(this,e))},Gt=function(e){if(e.duration<=0)return null;let t=e.transition;if(!un(t)&&!T(this,E,`m`,Kt).call(this,t))return null;let n,r;try{({transition:n,slots:r}=T(this,E,`m`,$t).call(this,t,e.params))}catch(e){return console.error(`[VFX-JS] transition "${t.name}" constructor failed; cutting to the new content.`,e),null}let i={reverse:e.reverse,duration:e.duration},a=e.overflow??n.overflow;return a!==void 0&&(i.overflow=a),{run:i,ease:e.ease??n.ease??`smoothstep`,slots:r}},Kt=function(e){let t=pn.get(e);return t&&t!==this?(T(this,jt,`f`)||(w(this,jt,!0,`f`),console.warn(`[VFX-JS] transition "${e.name??`unnamed`}" instance is running in another container; cutting to the new content. Pass the class to share it.`)),!1):(T(this,zt,`f`)!==e&&T(this,E,`m`,qt).call(this),pn.set(e,this),w(this,zt,e,`f`),!0)},qt=function(){let e=T(this,zt,`f`);w(this,zt,null,`f`),e&&pn.get(e)===this&&pn.delete(e)},Jt=function(e,{run:t,slots:n}){T(this,E,`m`,en).call(this),w(this,Bt,{id:e,slots:n},`f`);for(let e of n)e.start(t)},Yt=function(){T(this,kt,`f`)||(w(this,kt,!0,`f`),console.warn(`[VFX-JS] transition target did not render in time; cutting to the new content.`)),T(this,E,`m`,en).call(this),T(this,Ct,`f`).cancel()},Xt=function(){T(this,Dt,`f`).push(T(this,xt,`f`).freezeInside(T(this,D,`f`)))},Zt=function(){let e=T(this,Ot,`f`);w(this,Ot,[],`f`);for(let t of e)t()},Qt=function(){let e=T(this,Dt,`f`);w(this,Dt,[],`f`);for(let t of e)t()},$t=function(e,t){let n=T(this,Rt,`f`);if(n?.key.source===e&&(!un(e)||fn(n.key.params,t)))return n;let r=un(e)?new e(t):e,i=[new _t(r,T(this,Ct,`f`))];return w(this,Rt,{key:{source:e,params:t},transition:r,slots:i},`f`),{transition:r,slots:i}},en=function(e){let t=T(this,Bt,`f`);if(t&&(e===void 0||t.id===e)){w(this,Bt,null,`f`);for(let e of t.slots)e.end()}},tn=async function(e,t,n){if(T(this,It,`f`)&&await T(this,It,`f`),!t())return;let r=e===null?T(this,Ft,`f`)?T(this,Lt,`f`):[T(this,Ct,`f`)]:[T(this,Ct,`f`),...e];if(T(this,Ft,`f`)){if(!yn(r,T(this,Lt,`f`))){w(this,Lt,r,`f`);let e=T(this,xt,`f`).updateEffects(T(this,D,`f`),r).finally(()=>{w(this,It,null,`f`)});w(this,It,e,`f`),await e}n&&await T(this,xt,`f`).update(T(this,D,`f`))}else{let e=T(this,xt,`f`).addHTMLWithStill(T(this,D,`f`),{effect:r}).then(()=>{w(this,Ft,!0,`f`),w(this,Lt,r,`f`)}).finally(()=>{w(this,It,null,`f`)});w(this,It,e,`f`),await e}},nn=function(e){if(T(this,Tt,`f`)&&!T(this,Pt,`f`))return;let t=()=>{e===T(this,Mt,`f`)&&T(this,Ft,`f`)&&(w(this,Ft,!1,`f`),w(this,Lt,[],`f`),T(this,xt,`f`).remove(T(this,D,`f`)))};T(this,It,`f`)?T(this,It,`f`).then(t,()=>{}):t()},rn=function(){let e=T(this,St,`f`).waitFor??`media`;return e===`none`?Promise.resolve():e===`media`?gn(T(this,D,`f`),document.fonts?.ready):e(T(this,D,`f`))};function xn(e){let t=typeof window<`u`?window.devicePixelRatio:1,n;n=e.scrollPadding===void 0?[.1,.1]:e.scrollPadding===!1?[0,0]:Array.isArray(e.scrollPadding)?[e.scrollPadding[0]??.1,e.scrollPadding[1]??.1]:[e.scrollPadding,e.scrollPadding];let r;return r=e.postEffect===void 0?[]:Array.isArray(e.postEffect)?e.postEffect:[e.postEffect],{pixelRatio:e.pixelRatio??t,zIndex:e.zIndex??void 0,autoplay:e.autoplay??!0,fixedCanvas:e.scrollPadding===!1,scrollPadding:n,wrapper:e.wrapper,postEffects:r,preserveDrawingBuffer:e.preserveDrawingBuffer??!1,timeScale:e.timeScale??1}}var Sn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Cn=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},wn,Tn,En,Dn,On,kn,An,jn,O=class{constructor(e,t,n){wn.add(this),this.wrapS=`clamp`,this.wrapT=`clamp`,this.minFilter=`linear`,this.magFilter=`linear`,this.needsUpdate=!0,this.source=null,Tn.set(this,void 0),En.set(this,!1),Dn.set(this,void 0),On.set(this,void 0),Sn(this,Tn,e,`f`),this.gl=e.gl;let r=n?.externalHandle;Sn(this,On,r!==void 0,`f`),r===void 0?Cn(this,wn,`m`,kn).call(this):(this.texture=r,Sn(this,En,!0,`f`),this.needsUpdate=!1),t&&(this.source=t),Sn(this,Dn,n?.autoRegister!==!1&&!Cn(this,On,`f`),`f`),Cn(this,Dn,`f`)&&e.addResource(this)}restore(){Cn(this,On,`f`)||(Cn(this,wn,`m`,kn).call(this),Sn(this,En,!1,`f`),this.needsUpdate=!0)}bind(e){let t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&=(Cn(this,wn,`m`,An).call(this),!1)}dispose(){Cn(this,Dn,`f`)&&Cn(this,Tn,`f`).removeResource(this),Cn(this,On,`f`)||this.gl.deleteTexture(this.texture)}};Tn=new WeakMap,En=new WeakMap,Dn=new WeakMap,On=new WeakMap,wn=new WeakSet,kn=function(){let e=this.gl.createTexture();if(!e)throw Error(`[VFX-JS] Failed to create texture`);this.texture=e},An=function(){let e=this.gl,t=this.source;if(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4),t)try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)}catch(e){console.error(e)}else if(!Cn(this,En,`f`)){let t=new Uint8Array([0,0,0,0]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,t)}Cn(this,wn,`m`,jn).call(this),Sn(this,En,!0,`f`)},jn=function(){let e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,Mn(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,Mn(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,Nn(e,this.minFilter)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,Nn(e,this.magFilter))};function Mn(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function Nn(e,t){return t===`nearest`?e.NEAREST:e.LINEAR}function Pn(e){return new Promise((t,n)=>{let r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>t(r),r.onerror=n,r.src=e})}var Fn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},In=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ln,Rn,zn,Bn=class{constructor(e,t,n,r={}){Ln.add(this),Rn.set(this,void 0),Fn(this,Rn,e,`f`),this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(n)),this.float=r.float??!1,this.mipmap=r.mipmap??!1,this.texture=new O(e,void 0,{autoRegister:!1});let i=r.wrap;i!==void 0&&(typeof i==`string`?(this.texture.wrapS=i,this.texture.wrapT=i):(this.texture.wrapS=i[0],this.texture.wrapT=i[1])),r.filter!==void 0&&(this.texture.minFilter=r.filter,this.texture.magFilter=r.filter),In(this,Ln,`m`,zn).call(this),e.addResource(this)}setSize(e,t){let n=Math.max(1,Math.floor(e)),r=Math.max(1,Math.floor(t));(n!==this.width||r!==this.height)&&(this.width=n,this.height=r,In(this,Ln,`m`,zn).call(this))}restore(){this.texture.restore(),In(this,Ln,`m`,zn).call(this)}dispose(){In(this,Rn,`f`).removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.texture.dispose()}generateMipmaps(){if(!this.mipmap)return;let e=this.gl;e.bindTexture(e.TEXTURE_2D,this.texture.texture),e.generateMipmap(e.TEXTURE_2D),e.bindTexture(e.TEXTURE_2D,null)}};Rn=new WeakMap,Ln=new WeakSet,zn=function(){let e=this.gl,t=this.fbo,n=e.createFramebuffer();if(!n)throw Error(`[VFX-JS] Failed to create framebuffer`);this.fbo=n;let r=this.texture.texture;e.bindTexture(e.TEXTURE_2D,r);let i=In(this,Rn,`f`).floatLinearFilter;if(this.float&&i&&!In(this,Rn,`f`).floatBlend)throw Error(`[VFX-JS] EXT_float_blend is not supported.`);let a=this.float?i?e.RGBA32F:e.RGBA16F:e.RGBA8,o=this.float?i?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;if(this.mipmap){let t=Math.floor(Math.log2(Math.max(this.width,this.height)))+1,n=this.width,r=this.height;for(let i=0;i<t;i++)e.texImage2D(e.TEXTURE_2D,i,a,n,r,0,e.RGBA,o,null),n=Math.max(1,n>>1),r=Math.max(1,r>>1)}else e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,e.RGBA,o,null);let s=this.texture.minFilter===`nearest`?e.NEAREST:e.LINEAR,c=this.texture.magFilter===`nearest`?e.NEAREST:e.LINEAR,l=this.mipmap?this.texture.minFilter===`nearest`?e.NEAREST_MIPMAP_NEAREST:e.LINEAR_MIPMAP_LINEAR:s,u=Vn(e,this.texture.wrapS),d=Vn(e,this.texture.wrapT);e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,l),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,c),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,u),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,d),e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.texture.needsUpdate=!1,this.texture.source=null,t&&e.deleteFramebuffer(t)};function Vn(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function Hn(e,t,n,r){return{x:e.left+n,y:t-r-e.bottom,w:e.right-e.left,h:e.bottom-e.top}}function Un(e,t,n,r){return{x:e,y:t,w:n,h:r}}var Wn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Gn=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Kn,qn,Jn,Yn,Xn=class{constructor(e,t,n,r,i,a={}){Kn.set(this,void 0),qn.set(this,void 0),Jn.set(this,void 0),Yn.set(this,void 0),Wn(this,Kn,t,`f`),Wn(this,qn,n,`f`),Wn(this,Jn,r,`f`);let o=t*r,s=n*r,c={float:i,wrap:a.wrap,filter:a.filter,mipmap:a.mipmap};Wn(this,Yn,[new Bn(e,o,s,c),new Bn(e,o,s,c)],`f`)}get texture(){return Gn(this,Yn,`f`)[0].texture}get target(){return Gn(this,Yn,`f`)[1]}resize(e,t){if(e===Gn(this,Kn,`f`)&&t===Gn(this,qn,`f`))return;Wn(this,Kn,e,`f`),Wn(this,qn,t,`f`);let n=e*Gn(this,Jn,`f`),r=t*Gn(this,Jn,`f`);Gn(this,Yn,`f`)[0].setSize(n,r),Gn(this,Yn,`f`)[1].setSize(n,r)}swap(){Wn(this,Yn,[Gn(this,Yn,`f`)[1],Gn(this,Yn,`f`)[0]],`f`)}getViewport(){return Un(0,0,Gn(this,Kn,`f`),Gn(this,qn,`f`))}dispose(){Gn(this,Yn,`f`)[0].dispose(),Gn(this,Yn,`f`)[1].dispose()}};Kn=new WeakMap,qn=new WeakMap,Jn=new WeakMap,Yn=new WeakMap;var Zn=class{constructor(e=0,t=0){this.x=0,this.y=0,this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}},Qn=class{constructor(e=0,t=0,n=0,r=0){this.x=0,this.y=0,this.z=0,this.w=0,this.x=e,this.y=t,this.z=n,this.w=r}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}},$n=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},er=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},tr,nr,rr,ir,ar,or,sr;function cr(e){return/#version\s+300\s+es\b/.test(e)?`300 es`:/#version\s+100\b/.test(e)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(e)?`100`:`300 es`}var lr=class{constructor(e,t,n,r){tr.add(this),nr.set(this,void 0),rr.set(this,void 0),ir.set(this,void 0),ar.set(this,void 0),or.set(this,new Map),$n(this,nr,e,`f`),this.gl=e.gl,$n(this,rr,t,`f`),$n(this,ir,n,`f`),$n(this,ar,r??cr(n),`f`),er(this,tr,`m`,sr).call(this),e.addResource(this)}restore(){er(this,tr,`m`,sr).call(this)}use(){this.gl.useProgram(this.program)}hasUniform(e){return er(this,or,`f`).has(e)}uploadUniforms(e){let t=this.gl,n=0;for(let[r,i]of er(this,or,`f`)){let a=e[r];if(!a)continue;let o=a.value;o!=null&&(fr(i.type)?o instanceof O&&(o.bind(n),t.uniform1i(i.location,n),n++):o instanceof O||mr(t,i,o))}}dispose(){er(this,nr,`f`).removeResource(this),this.gl.deleteProgram(this.program)}};nr=new WeakMap,rr=new WeakMap,ir=new WeakMap,ar=new WeakMap,or=new WeakMap,tr=new WeakSet,sr=function(){let e=this.gl,t=ur(e,e.VERTEX_SHADER,dr(er(this,rr,`f`),er(this,ar,`f`))),n=ur(e,e.FRAGMENT_SHADER,dr(er(this,ir,`f`),er(this,ar,`f`))),r=e.createProgram();if(!r)throw Error(`[VFX-JS] Failed to create program`);if(e.attachShader(r,t),e.attachShader(r,n),e.bindAttribLocation(r,0,`position`),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let i=e.getProgramInfoLog(r)??``;throw e.deleteShader(t),e.deleteShader(n),e.deleteProgram(r),Error(`[VFX-JS] Program link failed: ${i}`)}e.detachShader(r,t),e.detachShader(r,n),e.deleteShader(t),e.deleteShader(n),this.program=r,er(this,or,`f`).clear();let i=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<i;t++){let n=e.getActiveUniform(r,t);if(!n)continue;let i=n.name.replace(/\[0\]$/,``),a=e.getUniformLocation(r,n.name);a&&er(this,or,`f`).set(i,{location:a,type:n.type,size:n.size})}};function ur(e,t,n){let r=e.createShader(t);if(!r)throw Error(`[VFX-JS] Failed to create shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)??``;throw e.deleteShader(r),Error(`[VFX-JS] Shader compile failed: ${t}\n\n${n}`)}return r}function dr(e,t){return e.replace(/^\s+/,``).startsWith(`#version`)||t===`100`?e:`#version 300 es\n${e}`}function fr(e){return e===35678||e===36298||e===36306||e===35682}var pr=new Set;function mr(e,t,n){let r=t.location,i=t.size>1,a=n,o=n,s=n;switch(t.type){case e.FLOAT:i?e.uniform1fv(r,a):e.uniform1f(r,n);return;case e.FLOAT_VEC2:if(i)e.uniform2fv(r,a);else if(n instanceof Zn)e.uniform2f(r,n.x,n.y);else{let t=n;e.uniform2f(r,t[0],t[1])}return;case e.FLOAT_VEC3:if(i)e.uniform3fv(r,a);else{let t=n;e.uniform3f(r,t[0],t[1],t[2])}return;case e.FLOAT_VEC4:if(i)e.uniform4fv(r,a);else if(n instanceof Qn)e.uniform4f(r,n.x,n.y,n.z,n.w);else{let t=n;e.uniform4f(r,t[0],t[1],t[2],t[3])}return;case e.INT:i?e.uniform1iv(r,o):e.uniform1i(r,n);return;case e.INT_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,t[0],t[1])}return;case e.INT_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,t[0],t[1],t[2])}return;case e.INT_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,t[0],t[1],t[2],t[3])}return;case e.BOOL:i?e.uniform1iv(r,o):e.uniform1i(r,+!!n);return;case e.BOOL_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,+!!t[0],+!!t[1])}return;case e.BOOL_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,+!!t[0],+!!t[1],+!!t[2])}return;case e.BOOL_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,+!!t[0],+!!t[1],+!!t[2],+!!t[3])}return;case e.FLOAT_MAT2:e.uniformMatrix2fv(r,!1,a);return;case e.FLOAT_MAT3:e.uniformMatrix3fv(r,!1,a);return;case e.FLOAT_MAT4:e.uniformMatrix4fv(r,!1,a);return;case e.UNSIGNED_INT:i?e.uniform1uiv(r,s):e.uniform1ui(r,n);return;case e.UNSIGNED_INT_VEC2:if(i)e.uniform2uiv(r,s);else{let t=n;e.uniform2ui(r,t[0],t[1])}return;case e.UNSIGNED_INT_VEC3:if(i)e.uniform3uiv(r,s);else{let t=n;e.uniform3ui(r,t[0],t[1],t[2])}return;case e.UNSIGNED_INT_VEC4:if(i)e.uniform4uiv(r,s);else{let t=n;e.uniform4ui(r,t[0],t[1],t[2],t[3])}return;default:pr.has(t.type)||(pr.add(t.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${t.type.toString(16)}; skipping upload.`));return}}var hr=class{constructor(e,t,n,r,i,a){this.gl=e.gl,this.program=new lr(e,t,n,a),this.uniforms=r,this.blend=i}dispose(){this.program.dispose()}};function gr(e,t,n,r,i,a,o,s){let c=r?r.width/s:a,l=r?r.height/s:o,u=Math.max(0,i.x),d=Math.max(0,i.y),f=Math.min(c,i.x+i.w),p=Math.min(l,i.y+i.h),m=f-u,h=p-d;m<=0||h<=0||(e.bindFramebuffer(e.FRAMEBUFFER,r?r.fbo:null),e.viewport(Math.round(u*s),Math.round(d*s),Math.round(m*s),Math.round(h*s)),_r(e,n.blend),n.program.use(),n.program.uploadUniforms(n.uniforms),t.draw())}function _r(e,t){t===`none`?e.disable(e.BLEND):(e.enable(e.BLEND),e.blendEquation(e.FUNC_ADD),t===`premultiplied`?e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA):t===`additive`?e.blendFuncSeparate(e.ONE,e.ONE,e.ONE,e.ONE):e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA))}var vr=class{constructor(e){this.uniforms={src:{value:null},offset:{value:new Zn},resolution:{value:new Zn},viewport:{value:new Qn}},this.pass=new hr(e,n,r,this.uniforms,`premultiplied`)}setUniforms(e,t,n){this.uniforms.src.value=e,this.uniforms.resolution.value.set(n.w*t,n.h*t),this.uniforms.offset.value.set(n.x*t,n.y*t)}dispose(){this.pass.dispose()}},yr=e=>{let t=document.implementation.createHTMLDocument(`test`),n=t.createRange();n.selectNodeContents(t.documentElement),n.deleteContents();let r=document.createElement(`head`);return t.documentElement.appendChild(r),t.documentElement.appendChild(n.createContextualFragment(e)),t.documentElement.setAttribute(`xmlns`,t.documentElement.namespaceURI),new XMLSerializer().serializeToString(t).replace(/<!DOCTYPE html>/,``)};async function br(e,t,n,r){let i=e.getBoundingClientRect(),a=window.devicePixelRatio,o=Math.ceil(i.width),s=Math.ceil(i.height),c=o*a,l=s*a,u=1,d=c,f=l;r&&(d>r||f>r)&&(u=Math.min(r/d,r/f),d=Math.floor(d*u),f=Math.floor(f*u));let p=n&&n.width===d&&n.height===f?n:new OffscreenCanvas(d,f),m=e.cloneNode(!0);await Cr(e,m),wr(e,m),m.style.setProperty(`opacity`,t.toString()),m.style.setProperty(`margin`,`0px`),Tr(m),Er(e,m),m.style.setProperty(`box-sizing`,`border-box`),m.style.setProperty(`width`,`${o}px`),m.style.setProperty(`height`,`${s}px`);let h=m.outerHTML,ee=`<svg xmlns="http://www.w3.org/2000/svg" width="${c}" height="${l}"><foreignObject width="100%" height="100%">${yr(h)}</foreignObject></svg>`,te=await new Promise(e=>{let t=new Image;t.onload=()=>e(t),t.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(ee)}`}),g=p.getContext(`2d`);if(g===null)throw Error(`[VFX-JS] Failed to get 2D context`);let ne=()=>{g.clearRect(0,0,d,f);let e=a*u;g.scale(e,e),g.drawImage(te,0,0,c,l),g.setTransform(1,0,0,1,0,0)};if(ne(),Sr()&&m.querySelector(`img`))for(let e=0;e<xr;e++)await new Promise(e=>setTimeout(e,16)),ne();return p}var xr=3;function Sr(){let e=navigator.userAgent;return/AppleWebKit/.test(e)&&!/Chrome\/|Chromium\//.test(e)}async function Cr(e,t){let n=window.getComputedStyle(e);for(let e of Array.from(n))/(-inline-|-block-|^inline-|^block-)/.test(e)||/^-webkit-.*(start|end|before|after|logical)/.test(e)||t.style.setProperty(e,n.getPropertyValue(e),n.getPropertyPriority(e));if(t.tagName===`INPUT`)t.setAttribute(`value`,t.value);else if(t.tagName===`TEXTAREA`)t.innerHTML=t.value;else if(t.tagName===`IMG`)try{t.src=await kr(m(e))}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];await Cr(r,i)}}function wr(e,t){if(typeof e.computedStyleMap==`function`)try{let n=e.computedStyleMap();for(let e of[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`]){let r=n.get(e);r instanceof CSSKeywordValue&&r.value===`auto`&&t.style.setProperty(e,`auto`)}}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];r instanceof HTMLElement&&i instanceof HTMLElement&&wr(r,i)}}function Tr(e){let t=e;for(;;){let e=t.style;if(Number.parseFloat(e.paddingTop)>0||Number.parseFloat(e.borderTopWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.firstElementChild;if(!n)break;n.style.setProperty(`margin-top`,`0px`),t=n}for(t=e;;){let e=t.style;if(Number.parseFloat(e.paddingBottom)>0||Number.parseFloat(e.borderBottomWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.lastElementChild;if(!n)break;n.style.setProperty(`margin-bottom`,`0px`),t=n}}function Er(e,t){let n=-e.scrollLeft,r=-e.scrollTop;for(let i=0;i<e.children.length;i++){let a=e.children[i],o=t.children[i];a&&(o instanceof HTMLElement||o instanceof SVGElement)&&((n!==0||r!==0)&&Dr(o,n,r),Er(a,o))}}function Dr(e,t,n){let r=e.style.getPropertyValue(`translate`),[i=`0px`,a=`0px`,o]=r&&r!==`none`?Or(r):[],s=`calc(${i} + ${t}px) calc(${a} + ${n}px)`;e.style.setProperty(`translate`,o?`${s} ${o}`:s)}function Or(e){let t=[],n=0,r=``;for(let i of e.trim())i===`(`?n++:i===`)`&&n--,i===` `&&n===0?(r&&t.push(r),r=``):r+=i;return r&&t.push(r),t}async function kr(e){let t=await fetch(e).then(e=>e.blob());return new Promise(e=>{let n=new FileReader;n.onload=function(){e(this.result)},n.readAsDataURL(t)})}var Ar=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},k=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},jr,Mr,Nr,Pr,Fr,Ir,Lr,Rr,zr,Br,Vr,Hr,Ur=Object.freeze({__brand:`EffectQuad`});function Wr(e){return e===Ur}function Gr(e,t){switch(t){case`lines`:return e.LINES;case`lineStrip`:return e.LINE_STRIP;case`points`:return e.POINTS;default:return e.TRIANGLES}}function Kr(e,t){if(t instanceof Float32Array)return e.FLOAT;if(t instanceof Uint8Array)return e.UNSIGNED_BYTE;if(t instanceof Uint16Array)return e.UNSIGNED_SHORT;if(t instanceof Uint32Array)return e.UNSIGNED_INT;if(t instanceof Int8Array)return e.BYTE;if(t instanceof Int16Array)return e.SHORT;if(t instanceof Int32Array)return e.INT;throw Error(`[VFX-JS] Unsupported attribute typed array`)}function qr(e,t){if(ArrayBuffer.isView(t)&&!(t instanceof DataView))return{name:e,data:t,itemSize:2,normalized:!1,perInstance:!1};let n=t;return{name:e,data:n.data,itemSize:n.itemSize,normalized:n.normalized??!1,perInstance:n.perInstance??!1}}var Jr=class{constructor(e,t,n){jr.add(this),Mr.set(this,void 0),Nr.set(this,void 0),Pr.set(this,void 0),Fr.set(this,[]),Ir.set(this,null),this.indexType=0,this.hasIndices=!1,this.drawCount=0,this.drawStart=0,Lr.set(this,!1),Ar(this,Mr,e,`f`),this.gl=e.gl,Ar(this,Nr,t,`f`),Ar(this,Pr,n,`f`),this.mode=Gr(this.gl,t.mode),this.instanceCount=t.instanceCount??0,k(this,jr,`m`,Rr).call(this),e.addResource(this),Ar(this,Lr,!0,`f`)}restore(){Ar(this,Fr,[],`f`),Ar(this,Ir,null,`f`),k(this,jr,`m`,Rr).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),this.hasIndices?this.instanceCount>0?e.drawElementsInstanced(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2),this.instanceCount):e.drawElements(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2)):this.instanceCount>0?e.drawArraysInstanced(this.mode,this.drawStart,this.drawCount,this.instanceCount):e.drawArrays(this.mode,this.drawStart,this.drawCount)}dispose(){k(this,Lr,`f`)&&(k(this,Mr,`f`).removeResource(this),Ar(this,Lr,!1,`f`));let e=this.gl;e.deleteVertexArray(this.vao);for(let t of k(this,Fr,`f`))e.deleteBuffer(t);k(this,Ir,`f`)&&e.deleteBuffer(k(this,Ir,`f`)),Ar(this,Fr,[],`f`),Ar(this,Ir,null,`f`)}};Mr=new WeakMap,Nr=new WeakMap,Pr=new WeakMap,Fr=new WeakMap,Ir=new WeakMap,Lr=new WeakMap,jr=new WeakSet,Rr=function(){let e=this.gl,t=e.createVertexArray();if(!t)throw Error(`[VFX-JS] Failed to create VAO`);this.vao=t,e.bindVertexArray(t);let n=k(this,Pr,`f`).program,r=null;for(let[t,i]of Object.entries(k(this,Nr,`f`).attributes)){let a=qr(t,i),o=e.getAttribLocation(n,a.name);if(o<0)continue;let s=e.createBuffer();if(!s)throw Error(`[VFX-JS] Failed to create VBO for "${a.name}"`);k(this,Fr,`f`).push(s),e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,a.data,e.STATIC_DRAW);let c=Kr(e,a.data);e.enableVertexAttribArray(o),c===e.FLOAT||c===e.HALF_FLOAT||a.normalized?e.vertexAttribPointer(o,a.itemSize,c,a.normalized,0,0):e.vertexAttribIPointer(o,a.itemSize,c,0,0),a.perInstance&&e.vertexAttribDivisor(o,1),t===`position`&&r===null&&(r=a.data.length/a.itemSize)}let i=0,a=k(this,Nr,`f`).indices;if(a){let t=e.createBuffer();if(!t)throw Error(`[VFX-JS] Failed to create IBO`);Ar(this,Ir,t,`f`),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t),e.bufferData(e.ELEMENT_ARRAY_BUFFER,a,e.STATIC_DRAW),this.hasIndices=!0,this.indexType=a instanceof Uint32Array?e.UNSIGNED_INT:e.UNSIGNED_SHORT,i=a.length}else this.hasIndices=!1;e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null),k(this,Ir,`f`)&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null);let o=this.hasIndices?i:r??0,s=k(this,Nr,`f`).drawRange;this.drawStart=s?.start??0,this.drawCount=s?.count===void 0?Math.max(0,o-this.drawStart):s.count};var Yr=class{constructor(e,t){zr.set(this,void 0),Br.set(this,void 0),Vr.set(this,new WeakMap),Hr.set(this,new Set),Ar(this,zr,e,`f`),Ar(this,Br,t,`f`)}get quad(){return k(this,Br,`f`)}resolve(e,t){let n=k(this,Vr,`f`).get(e);n||(n=new Map,k(this,Vr,`f`).set(e,n));let r=n.get(t);return r||(r=new Jr(k(this,zr,`f`),e,t),n.set(t,r),k(this,Hr,`f`).add(r)),r}release(e){let t=k(this,Vr,`f`).get(e);if(t){for(let e of t.values())e.dispose(),k(this,Hr,`f`).delete(e);k(this,Vr,`f`).delete(e)}}dispose(){for(let e of k(this,Hr,`f`))e.dispose();k(this,Hr,`f`).clear()}};zr=new WeakMap,Br=new WeakMap,Vr=new WeakMap,Hr=new WeakMap;var A=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},j=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Xr,Zr,Qr,$r,ei,ti,ni,ri,ii,ai,oi,si,M,N,ci,li,ui,di,fi,pi,mi,hi,gi,_i=Symbol.for(`@vfx-js/effect.resolve-texture`),vi=Symbol.for(`@vfx-js/effect.resolve-rt`);function yi(e){return e[_i]()}function bi(e){return e[vi]}var xi=`#version 300 es
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
`,Si=`
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
`,Ci=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`,wi=`
precision highp float;
varying vec2 uv;
uniform sampler2D src;
void main() {
    gl_FragColor = texture2D(src, uv);
}
`,Ti=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    bool inside = all(greaterThanEqual(uvSrc, vec2(0.0))) && all(lessThanEqual(uvSrc, vec2(1.0)));
    outColor = inside ? texture(src, uvSrc) : vec4(0.0);
}
`,Ei=`
precision highp float;
varying vec2 uvSrc;
uniform sampler2D src;
void main() {
    bool inside = all(greaterThanEqual(uvSrc, vec2(0.0))) && all(lessThanEqual(uvSrc, vec2(1.0)));
    gl_FragColor = inside ? texture2D(src, uvSrc) : vec4(0.0);
}
`,Di=class{constructor(e,t,n,r,i,a){Xr.add(this),Zr.set(this,void 0),Qr.set(this,void 0),$r.set(this,void 0),ei.set(this,void 0),ti.set(this,void 0),ni.set(this,[]),ri.set(this,[]),ii.set(this,[]),ai.set(this,[]),oi.set(this,`init`),si.set(this,!1),M.set(this,void 0),N.set(this,void 0),di.set(this,[]),A(this,Zr,e,`f`),A(this,Qr,e.gl,`f`),A(this,$r,n,`f`),A(this,ei,a,`f`),A(this,ti,new Yr(e,t),`f`),A(this,M,{outputBufferW:1,outputBufferH:1,canvasBufferSize:[1,1],outputViewport:{x:0,y:0,w:1,h:1},elementBufferW:1,elementBufferH:1,contentRectUv:[0,0,1,1],srcRectUv:[0,0,1,1]},`f`);let o={time:0,deltaTime:0,pixelRatio:n,resolution:[1,1],mouse:[0,0],mouseViewport:[0,0],intersection:0,enterTime:0,leaveTime:0,enterProgress:0,leaveProgress:0,src:r,target:null,uniforms:{},vfxProps:i,dims:{element:[1,1],elementPixel:[1,1],canvas:[1,1],canvasPixel:[1,1],pixelRatio:n,contentRect:[0,0,1,1],srcRect:[0,0,1,1],canvasRect:[0,0,1,1]},quad:Ur,gl:j(this,Qr,`f`),createRenderTarget:e=>j(this,Xr,`m`,ci).call(this,e),releaseGeometry:e=>j(this,ti,`f`).release(e),wrapTexture:(e,t)=>j(this,Xr,`m`,ui).call(this,e,t),draw:e=>j(this,Xr,`m`,fi).call(this,e),blit:(e,t,n)=>j(this,Xr,`m`,pi).call(this,e,t,n),clear:e=>j(this,Xr,`m`,mi).call(this,e),onContextRestored:e=>{let t=j(this,Zr,`f`).onContextRestored(e);return j(this,ai,`f`).push(t),t}};A(this,N,o,`f`)}get ctx(){return j(this,N,`f`)}setPhase(e){A(this,oi,e,`f`)}setFrameDims(e){A(this,M,e,`f`),j(this,N,`f`).resolution=[e.canvasBufferSize[0],e.canvasBufferSize[1]];for(let t of j(this,ii,`f`))t.resolver.resize?.(e.outputBufferW,e.outputBufferH)}setEffectDims(e){j(this,N,`f`).dims=e}setFrameState(e){let t=j(this,N,`f`);t.time=e.time,t.deltaTime=e.deltaTime,t.mouse=e.mouse,t.mouseViewport=e.mouseViewport,t.intersection=e.intersection,t.enterTime=e.enterTime,t.leaveTime=e.leaveTime,t.enterProgress=e.enterProgress,t.leaveProgress=e.leaveProgress,t.uniforms=e.uniforms}setSrc(e){j(this,N,`f`).src=e}setOutput(e){j(this,N,`f`).target=e}passthroughCopy(e,t,n){let r=j(this,oi,`f`);A(this,oi,`render`,`f`);let i=j(this,N,`f`).target;j(this,N,`f`).target=t;try{let r=j(this,M,`f`).outputViewport;j(this,M,`f`).outputViewport={...n};let i=j(this,N,`f`).vfxProps.glslVersion===`100`?wi:Ci;j(this,Xr,`m`,hi).call(this,{frag:i,uniforms:{src:e},target:t}),j(this,M,`f`).outputViewport=r}finally{j(this,N,`f`).target=i,A(this,oi,r,`f`)}}clearRt(e){let t=j(this,Qr,`f`),n=bi(e);t.bindFramebuffer(t.FRAMEBUFFER,n.getWriteFbo().fbo),t.viewport(0,0,e.width,e.height),t.clearColor(0,0,0,0),t.disable(t.SCISSOR_TEST),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)}tickAutoUpdates(){for(let e of j(this,di,`f`))e()}dispose(){A(this,oi,`disposed`,`f`);for(let e of j(this,ai,`f`))e();A(this,ai,[],`f`);for(let e of j(this,ri,`f`))e.resolver.dispose?.();A(this,ri,[],`f`),A(this,ii,[],`f`);for(let e of j(this,ni,`f`))e.dispose();A(this,ni,[],`f`),j(this,ti,`f`).dispose(),A(this,di,[],`f`)}};Zr=new WeakMap,Qr=new WeakMap,$r=new WeakMap,ei=new WeakMap,ti=new WeakMap,ni=new WeakMap,ri=new WeakMap,ii=new WeakMap,ai=new WeakMap,oi=new WeakMap,si=new WeakMap,M=new WeakMap,N=new WeakMap,di=new WeakMap,Xr=new WeakSet,ci=function(e){let t=e?.persistent??!1,n=e?.float??!1,r=ki(e?.wrap),i=e?.filter,a=e?.mipmap??!1,o=a!==!1,s=a===!0,c=e?.size,l=c?c[0]:j(this,M,`f`).outputBufferW,u=c?c[1]:j(this,M,`f`).outputBufferH,d,f,p;if(t){let e=c?1:j(this,$r,`f`),t=c?l:l/e,a=c?u:u/e,m=new Xn(j(this,Zr,`f`),t,a,e,n,{wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>m.texture,getWriteFbo:()=>m.target,swap:()=>m.swap(),resize:c?void 0:(e,t)=>{m.resize(e/j(this,$r,`f`),t/j(this,$r,`f`))},dispose:()=>m.dispose()},o&&(d.regenerateMipmaps=()=>m.target.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>m.target.width,p=()=>m.target.height}else{let e=new Bn(j(this,Zr,`f`),l,u,{float:n,wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>e.texture,getWriteFbo:()=>e,resize:c?void 0:(t,n)=>e.setSize(t,n),dispose:()=>e.dispose()},o&&(d.regenerateMipmaps=()=>e.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>e.width,p=()=>e.height}let m,h=Mi(d,f,p,()=>j(this,Xr,`m`,li).call(this,m));return m={handle:h,resolver:d},j(this,ri,`f`).push(m),c||j(this,ii,`f`).push(m),h},li=function(e){let t=j(this,ri,`f`).indexOf(e);if(t<0)return;j(this,ri,`f`).splice(t,1);let n=j(this,ii,`f`).indexOf(e);n>=0&&j(this,ii,`f`).splice(n,1),e.resolver.dispose?.()},ui=function(e,t){let n=ki(t?.wrap),r=t?.filter,i,a,o,s=null,c=Oi(e);if(c){if(!t?.size)throw Error(`[VFX-JS] wrapTexture(WebGLTexture) requires opts.size`);let[n,r]=t.size;i=new O(j(this,Zr,`f`),void 0,{autoRegister:!1,externalHandle:e}),a=()=>n,o=()=>r}else{let n=e;i=new O(j(this,Zr,`f`),n);let r=t?.size,c=e=>{if(r)return e===`w`?r[0]:r[1];if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return e===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return e===`w`?n.videoWidth:n.videoHeight;let t=n;return e===`w`?t.width:t.height};a=()=>c(`w`),o=()=>c(`h`);let l=typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement||typeof HTMLCanvasElement<`u`&&n instanceof HTMLCanvasElement||typeof OffscreenCanvas<`u`&&n instanceof OffscreenCanvas;(t?.autoUpdate??l)&&(s=()=>{i.needsUpdate=!0})}i.wrapS=n[0],i.wrapT=n[1],r!==void 0&&(i.minFilter=r,i.magFilter=r),j(this,ni,`f`).push(i),s&&j(this,di,`f`).push(s);let l=!1;return ji(()=>i,a,o,()=>{if(l)return;l=!0;let e=j(this,ni,`f`).indexOf(i);if(e!==-1&&j(this,ni,`f`).splice(e,1),s){let e=j(this,di,`f`).indexOf(s);e!==-1&&j(this,di,`f`).splice(e,1)}i.dispose()},c?void 0:()=>{l||(i.needsUpdate=!0)})},fi=function(e){j(this,oi,`f`)===`render`?j(this,Xr,`m`,hi).call(this,e):j(this,oi,`f`)===`update`&&!j(this,si,`f`)&&(A(this,si,!0,`f`),console.warn(`[VFX-JS] ctx.draw() called in update(); ignored. Move draws to render().`))},pi=function(e,t,n){if(j(this,oi,`f`)!==`render`){j(this,oi,`f`)===`update`&&!j(this,si,`f`)&&(A(this,si,!0,`f`),console.warn(`[VFX-JS] ctx.blit() called in update(); ignored. Move draws to render().`));return}let r=j(this,N,`f`).vfxProps.glslVersion===`100`?Ei:Ti;j(this,Xr,`m`,hi).call(this,{frag:r,uniforms:{src:e},target:t,blend:n?.blend,swap:n?.swap})},mi=function(e){if(j(this,oi,`f`)!==`render`){j(this,oi,`f`)===`update`&&!j(this,si,`f`)&&(A(this,si,!0,`f`),console.warn(`[VFX-JS] ctx.clear() called in update(); ignored. Move draws to render().`));return}let t=j(this,Qr,`f`),n=j(this,N,`f`).target,r=e??n,i=r===null||r===n;if(t.clearColor(0,0,0,0),i){let e=r===null?null:bi(r).getWriteFbo().fbo,n=j(this,M,`f`).outputViewport;t.bindFramebuffer(t.FRAMEBUFFER,e),t.enable(t.SCISSOR_TEST),t.scissor(n.x,n.y,n.w,n.h),t.clear(t.COLOR_BUFFER_BIT),t.disable(t.SCISSOR_TEST),t.bindFramebuffer(t.FRAMEBUFFER,null);return}let a=bi(r);t.disable(t.SCISSOR_TEST);let o=()=>{t.bindFramebuffer(t.FRAMEBUFFER,a.getWriteFbo().fbo),t.clear(t.COLOR_BUFFER_BIT)};o(),a.swap&&(a.swap(),o(),a.swap()),t.bindFramebuffer(t.FRAMEBUFFER,null)},hi=function(e){let t=j(this,Qr,`f`),n=e.vert??(j(this,N,`f`).vfxProps.glslVersion===`100`?Si:xi),r=j(this,ei,`f`).get(n,e.frag,j(this,N,`f`).vfxProps.glslVersion),i=j(this,N,`f`).target,a=e.target===void 0||e.target===null?i:e.target,o=a===null||a===i,s,c,l,u,d,f,p;if(a===null)s=null,c=j(this,M,`f`).outputViewport.x,l=j(this,M,`f`).outputViewport.y,u=j(this,M,`f`).outputViewport.w,d=j(this,M,`f`).outputViewport.h;else{let e=bi(a);s=e.getWriteFbo().fbo,o?(c=j(this,M,`f`).outputViewport.x,l=j(this,M,`f`).outputViewport.y,u=j(this,M,`f`).outputViewport.w,d=j(this,M,`f`).outputViewport.h):(c=0,l=0,u=a.width,d=a.height),f=e.swap,e.mipmapAutoRegen&&(p=e.regenerateMipmaps)}t.bindFramebuffer(t.FRAMEBUFFER,s),t.viewport(c,l,u,d),t.disable(t.SCISSOR_TEST),_r(t,e.blend??(a===null?`premultiplied`:`none`)),r.use();let m=j(this,Xr,`m`,gi).call(this,e.uniforms);r.uploadUniforms(m);let h=e.geometry??Ur;Wr(h)?j(this,ti,`f`).quad.draw():j(this,ti,`f`).resolve(h,r).draw(),p?.(),f&&e.swap!==!1&&f()},gi=function(e){let t={};if(t.contentRectUv={value:j(this,M,`f`).contentRectUv},t.srcRectUv={value:j(this,M,`f`).srcRectUv},!e)return t;for(let[n,r]of Object.entries(e))t[n]=Ai(r);return t};function Oi(e){let t=globalThis.WebGLTexture;if(t&&typeof t==`function`&&e instanceof t)return!0;let n=e;return n.width===void 0&&n.naturalWidth===void 0&&n.videoWidth===void 0}function ki(e){return e===void 0?[`clamp`,`clamp`]:typeof e==`string`?[e,e]:[e[0],e[1]]}function Ai(e){return typeof e==`object`&&e&&`__brand`in e?e.__brand===`EffectRenderTarget`?{value:bi(e).getReadTexture()}:{value:yi(e)}:{value:e}}function ji(e,t,n,r,i){let a={__brand:`EffectTexture`,get width(){return t()},get height(){return n()},dispose(){r?.()},update(){i?.()}};return Object.defineProperty(a,_i,{value:e}),a}function Mi(e,t,n,r){let i={__brand:`EffectRenderTarget`,get width(){return t()},get height(){return n()},dispose:r??(()=>{}),generateMipmaps:()=>e.regenerateMipmaps?.()};return Object.defineProperty(i,vi,{value:e}),i}function Ni(e){return Mi({getReadTexture:()=>e.texture,getWriteFbo:()=>e},()=>e.width,()=>e.height)}function Pi(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:Array.isArray(e)?{top:e[0],right:e[1],bottom:e[2],left:e[3]}:{top:e.top??0,right:e.right??0,bottom:e.bottom??0,left:e.left??0}}function Fi(e){return Pi(e)}var Ii={top:0,right:0,bottom:0,left:0};function Li(e){return Pi(e)}function Ri(e){return{top:e.top,right:e.right,bottom:e.bottom,left:e.left}}function zi(e){return{top:e.top,left:e.left,right:e.left+Math.ceil(e.right-e.left),bottom:e.top+Math.ceil(e.bottom-e.top)}}function Bi(e,t){return{top:e.top-t.top,right:e.right+t.right,bottom:e.bottom+t.bottom,left:e.left-t.left}}function Vi(e,t,n){return Math.min(Math.max(e,t),n)}function Hi(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return c<=0||l<=0?[0,0,1,1]:[(n-o)/c,(r-s)/l,i/c,a/l]}function Ui(e,t){return Wi(e.left,e.right,t.left,t.right)*Wi(e.top,e.bottom,t.top,t.bottom)}function Wi(e,t,n,r){let i=Math.min(r-n,t-e);if(i<=0)return 0;let a=Vi(n,e,t);return(Vi(r,e,t)-a)/i}var P=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},F=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},I,Gi,Ki,qi,Ji,Yi,L,R,Xi,Zi,Qi,$i,ea,ta,na,ra,ia,aa,oa,sa,ca,la,ua,da,fa,pa,ma,ha=class{constructor(e,t,n,r,i,a,o,s){I.add(this),Gi.set(this,void 0),Ki.set(this,void 0),qi.set(this,void 0),Ji.set(this,void 0),Yi.set(this,void 0),L.set(this,void 0),R.set(this,void 0),Xi.set(this,void 0),Zi.set(this,[]),Qi.set(this,[]),$i.set(this,void 0),ea.set(this,new Set),ta.set(this,!1),na.set(this,void 0),ra.set(this,Fi(0)),ia.set(this,null),P(this,Gi,e,`f`),P(this,Ki,t,`f`),P(this,qi,n,`f`),P(this,Ji,i,`f`),P(this,Yi,s,`f`),P(this,L,r,`f`),P(this,$i,a,`f`),P(this,na,o,`f`),P(this,R,r.map(()=>F(this,I,`m`,oa).call(this)),`f`),r.length===0&&P(this,ia,F(this,I,`m`,oa).call(this),`f`),P(this,Xi,F(this,I,`m`,aa).call(this),`f`)}get effects(){return F(this,L,`f`)}get hosts(){return F(this,R,`f`)}get renderingIndices(){return F(this,Xi,`f`)}get stages(){return F(this,Qi,`f`)}get hitTestPadBuffer(){return F(this,ra,`f`)}async initAll(){for(let e=0;e<F(this,L,`f`).length;e++){let t=F(this,L,`f`)[e],n=F(this,R,`f`)[e];n.setPhase(`init`);try{t.init&&await t.init(n.ctx)}catch(t){console.error(`[VFX-JS] effect[${e}].init() failed:`,t);for(let t=e-1;t>=0;t--)F(this,I,`m`,sa).call(this,t),F(this,R,`f`)[t].dispose();throw F(this,R,`f`)[e].dispose(),t}n.setPhase(`update`)}}run(e){if(F(this,ta,`f`)||!e.isVisible)return;P(this,Xi,F(this,I,`m`,aa).call(this),`f`);let t=F(this,Xi,`f`).length;for(let t of F(this,R,`f`))t.setFrameState({time:e.time,deltaTime:e.deltaTime,mouse:e.mouse,mouseViewport:e.mouseViewport,intersection:e.intersection,enterTime:e.enterTime,leaveTime:e.leaveTime,enterProgress:e.enterProgress,leaveProgress:e.leaveProgress,uniforms:e.resolvedUniforms});F(this,I,`m`,ca).call(this,e);for(let t=0;t<F(this,R,`f`).length;t++)F(this,R,`f`)[t].setFrameDims(F(this,I,`m`,ma).call(this,t,e)),F(this,R,`f`)[t].setEffectDims(F(this,I,`m`,da).call(this,t,e));for(let e=0;e<F(this,L,`f`).length;e++){let t=F(this,L,`f`)[e];if(!t.update)continue;let n=F(this,R,`f`)[e];n.setPhase(`update`);try{t.update(n.ctx)}catch(t){let n=`${e}:update`;F(this,ea,`f`).has(n)||(F(this,ea,`f`).add(n),console.warn(`[VFX-JS] effect[${e}].update() threw; skipping this frame's update:`,t))}}if(t===0)(F(this,ia,`f`)??F(this,R,`f`)[0]).passthroughCopy(F(this,$i,`f`),e.finalTarget,e.elementRectOnCanvasPx);else for(let n=0;n<t;n++){let r=F(this,Xi,`f`)[n],i=F(this,R,`f`)[r],a=F(this,L,`f`)[r];if(!a.render)continue;i.setPhase(`render`),i.tickAutoUpdates();let o=n===0?F(this,$i,`f`):F(this,Zi,`f`)[n-1].texHandle;i.setSrc(o);let s;n===t-1?s=e.finalTarget:(s=F(this,Zi,`f`)[n].rtHandle,i.clearRt(s)),i.setOutput(s);try{a.render(i.ctx)}catch(e){let a=`${r}:render`;F(this,ea,`f`).has(a)||(F(this,ea,`f`).add(a),console.warn(`[VFX-JS] effect[${r}].render() threw; falling back to passthrough:`,e));let c=F(this,Qi,`f`)[n].outputViewport;s===null?i.passthroughCopy(o,null,c):n===t-1?i.passthroughCopy(o,s,c):i.passthroughCopy(o,s,{x:0,y:0,w:s.width,h:s.height})}i.setPhase(`update`)}}dispose(){if(!F(this,ta,`f`)){P(this,ta,!0,`f`);for(let e=F(this,L,`f`).length-1;e>=0;e--)F(this,I,`m`,sa).call(this,e),F(this,R,`f`)[e].dispose();F(this,ia,`f`)&&(F(this,ia,`f`).dispose(),P(this,ia,null,`f`));for(let e of F(this,Zi,`f`))e.fb.dispose();P(this,Zi,[],`f`),P(this,Qi,[],`f`)}}async replaceEffects(e){if(F(this,ta,`f`))throw Error(`[VFX-JS] replaceEffects on disposed chain`);let t=F(this,L,`f`),n=F(this,R,`f`),r=new Map;for(let e=0;e<t.length;e++)r.set(t[e],n[e]);let i=Array(e.length),a=[];for(let t=0;t<e.length;t++){let n=e[t],o=r.get(n);if(o)i[t]=o,r.delete(n);else{let e=F(this,I,`m`,oa).call(this);i[t]=e,a.push({host:e,effect:n})}}for(let e=0;e<a.length;e++){let{host:t,effect:n}=a[e];t.setPhase(`init`);try{n.init&&await n.init(t.ctx),t.setPhase(`update`)}catch(n){console.error(`[VFX-JS] replaceEffects: new effect init() failed:`,n);for(let t=e-1;t>=0;t--){let e=a[t];if(e.effect.dispose)try{e.effect.dispose()}catch(e){console.error(`[VFX-JS] dispose during init rollback threw:`,e)}e.host.dispose()}throw t.dispose(),n}}for(let[e,t]of r){if(e.dispose)try{e.dispose()}catch(e){console.error(`[VFX-JS] effect.dispose() threw during replaceEffects:`,e)}t.dispose()}for(let e of F(this,Zi,`f`))e.fb.dispose();P(this,Zi,[],`f`),P(this,Qi,[],`f`),e.length===0&&!F(this,ia,`f`)?P(this,ia,F(this,I,`m`,oa).call(this),`f`):e.length>0&&F(this,ia,`f`)&&(F(this,ia,`f`).dispose(),P(this,ia,null,`f`)),P(this,L,e,`f`),P(this,R,i,`f`),P(this,Xi,F(this,I,`m`,aa).call(this),`f`),F(this,ea,`f`).clear()}};Gi=new WeakMap,Ki=new WeakMap,qi=new WeakMap,Ji=new WeakMap,Yi=new WeakMap,L=new WeakMap,R=new WeakMap,Xi=new WeakMap,Zi=new WeakMap,Qi=new WeakMap,$i=new WeakMap,ea=new WeakMap,ta=new WeakMap,na=new WeakMap,ra=new WeakMap,ia=new WeakMap,I=new WeakSet,aa=function(){return F(this,L,`f`).map((e,t)=>typeof e.render==`function`&&e.enabled!==!1?t:-1).filter(e=>e>=0)},oa=function(){return new Di(F(this,Gi,`f`),F(this,Ki,`f`),F(this,qi,`f`),F(this,$i,`f`),F(this,Ji,`f`),F(this,Yi,`f`))},sa=function(e){let t=F(this,L,`f`)[e];if(t.dispose)try{t.dispose()}catch(t){console.error(`[VFX-JS] effect[${e}].dispose() threw:`,t)}},ca=function(e){let t=F(this,Xi,`f`).length;if(P(this,Qi,Array(t),`f`),t===0)return;let n=F(this,na,`f`)?e.canvasBufferSize:e.elementBufferSize,r=[0,0,n[0],n[1]],i=F(this,I,`m`,pa).call(this,e),a=r;for(let n=0;n<t;n++){let o=F(this,Xi,`f`)[n],s=F(this,L,`f`)[o],c=n===t-1,l=F(this,I,`m`,la).call(this,s,a,r,i,e)??a,u=[l[2],l[3]],d=Hi(r,l),f=c?{x:e.elementRectOnCanvasPx.x+l[0],y:e.elementRectOnCanvasPx.y+l[1],w:u[0],h:u[1]}:{x:0,y:0,w:u[0],h:u[1]};F(this,Qi,`f`)[n]={dstRect:l,dstBufferSize:u,contentRectUv:d,outputViewport:f},c||F(this,I,`m`,fa).call(this,n,u),a=l}let[o,s,c,l]=F(this,Qi,`f`)[t-1].dstRect;P(this,ra,Fi({top:Math.max(0,s+l-n[1]),right:Math.max(0,o+c-n[0]),bottom:Math.max(0,-s),left:Math.max(0,-o)}),`f`)},la=function(e,t,n,r,i){if(e.outputRect)return e.outputRect(F(this,I,`m`,ua).call(this,i,n,t,r))},ua=function(e,t,n,r){let i=e.canvasBufferSize[0]/e.canvasSize[0]||1;return{element:F(this,na,`f`)?e.canvasSize:e.elementSize,elementPixel:F(this,na,`f`)?e.canvasBufferSize:e.elementBufferSize,canvas:e.canvasSize,canvasPixel:e.canvasBufferSize,pixelRatio:i,contentRect:t,srcRect:n,canvasRect:r}},da=function(e,t){let n=F(this,na,`f`)?t.canvasBufferSize:t.elementBufferSize,r=[0,0,n[0],n[1]],i=F(this,I,`m`,pa).call(this,t),a=F(this,Xi,`f`).indexOf(e),o=a<=0?r:F(this,Qi,`f`)[a-1].dstRect;return F(this,I,`m`,ua).call(this,t,r,o,i)},fa=function(e,t){let n=F(this,Zi,`f`)[e];if(n&&n.fb.width===t[0]&&n.fb.height===t[1])return;n&&n.fb.dispose();let r=new Bn(F(this,Gi,`f`),t[0],t[1]),i=Ni(r),a=ji(()=>r.texture,()=>r.width,()=>r.height);F(this,Zi,`f`)[e]={fb:r,rtHandle:i,texHandle:a,bufferSize:t}},pa=function(e){let[t,n]=e.canvasBufferSize;if(F(this,na,`f`))return[0,0,t,n];let{x:r,y:i}=e.elementRectOnCanvasPx;return[-r,-i,t,n]},ma=function(e,t){let n=F(this,Xi,`f`).indexOf(e),r,i,a,o,s;if(n<0)r=t.elementBufferSize[0],i=t.elementBufferSize[1],a={x:0,y:0,w:r,h:i},o=[0,0,1,1],s=[0,0,1,1];else{let e=F(this,Qi,`f`)[n];r=e.dstBufferSize[0],i=e.dstBufferSize[1],a=e.outputViewport,o=e.contentRectUv,s=n===0?[0,0,1,1]:F(this,Qi,`f`)[n-1].contentRectUv}return{outputBufferW:r,outputBufferH:i,canvasBufferSize:t.canvasBufferSize,outputViewport:a,elementBufferW:t.elementBufferSize[0],elementBufferH:t.elementBufferSize[1],contentRectUv:o,srcRectUv:s}};var ga=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},_a=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},va,ya,ba,xa,Sa=class{constructor(e){va.add(this),ya.set(this,void 0),ba.set(this,new Set),ga(this,ya,e,`f`)}freezeInside(e,t){let n={root:e,entries:[]};for(let r of t)!r.frozen&&Ca(e,r.element)&&(r.frozen=!0,n.entries.push({e:r,opacity:r.element.style.opacity}),_a(this,ya,`f`).showPlain(r));_a(this,ba,`f`).add(n);let r=!1;return()=>{if(!r){r=!0,_a(this,ba,`f`).delete(n);for(let{e}of n.entries)e.frozen=!1;requestAnimationFrame(()=>{for(let{e,opacity:t}of n.entries)!e.frozen&&_a(this,ya,`f`).isRegistered(e)&&_a(this,ya,`f`).hidePlain(e,t)})}}}adopt(e,t){let n=_a(this,va,`m`,xa).call(this,e.element);return n?(e.frozen=!0,n.entries.push({e,opacity:t??e.element.style.opacity}),!0):!1}};ya=new WeakMap,ba=new WeakMap,va=new WeakSet,xa=function(e){for(let t of _a(this,ba,`f`))if(Ca(t.root,e))return t};function Ca(e,t){return t!==e&&e.contains(t)}function wa(e){this.data=e,this.pos=0}wa.prototype.readByte=function(){return this.data[this.pos++]},wa.prototype.peekByte=function(){return this.data[this.pos]},wa.prototype.readBytes=function(e){return this.data.subarray(this.pos,this.pos+=e)},wa.prototype.peekBytes=function(e){return this.data.subarray(this.pos,this.pos+e)},wa.prototype.readString=function(e){for(var t=``,n=0;n<e;n++)t+=String.fromCharCode(this.readByte());return t},wa.prototype.readBitArray=function(){for(var e=[],t=this.readByte(),n=7;n>=0;n--)e.push(!!(t&1<<n));return e},wa.prototype.readUnsigned=function(e){var t=this.readBytes(2);return e?(t[1]<<8)+t[0]:(t[0]<<8)+t[1]};function Ta(e){this.stream=new wa(e),this.output={}}Ta.prototype.parse=function(e){return this.parseParts(this.output,e),this.output},Ta.prototype.parseParts=function(e,t){for(var n=0;n<t.length;n++){var r=t[n];this.parsePart(e,r)}},Ta.prototype.parsePart=function(e,t){var n=t.label,r;if(!t.requires||t.requires(this.stream,this.output,e)){if(t.loop){for(var i=[];t.loop(this.stream);){var a={};this.parseParts(a,t.parts),i.push(a)}e[n]=i}else t.parts?(r={},this.parseParts(r,t.parts),e[n]=r):t.parser?(r=t.parser(this.stream,this.output,e),t.skip||(e[n]=r)):t.bits&&(e[n]=this.parseBits(t.bits))}};function Ea(e){return e.reduce(function(e,t){return e*2+t},0)}Ta.prototype.parseBits=function(e){var t={},n=this.stream.readBitArray();for(var r in e){var i=e[r];t[r]=i.length?Ea(n.slice(i.index,i.index+i.length)):n[i.index]}return t};var z={readByte:function(){return function(e){return e.readByte()}},readBytes:function(e){return function(t){return t.readBytes(e)}},readString:function(e){return function(t){return t.readString(e)}},readUnsigned:function(e){return function(t){return t.readUnsigned(e)}},readArray:function(e,t){return function(n,r,i){for(var a=t(n,r,i),o=Array(a),s=0;s<a;s++)o[s]=n.readBytes(e);return o}}},Da={label:`blocks`,parser:function(e){for(var t=[],n=0,r=0,i=e.readByte();i!==r;i=e.readByte())t.push(e.readBytes(i)),n+=i;var a=new Uint8Array(n);n=0;for(var o=0;o<t.length;o++)a.set(t[o],n),n+=t[o].length;return a}},Oa={label:`gce`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===249},parts:[{label:`codes`,parser:z.readBytes(2),skip:!0},{label:`byteSize`,parser:z.readByte()},{label:`extras`,bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:`delay`,parser:z.readUnsigned(!0)},{label:`transparentColorIndex`,parser:z.readByte()},{label:`terminator`,parser:z.readByte(),skip:!0}]},ka={label:`image`,requires:function(e){return e.peekByte()===44},parts:[{label:`code`,parser:z.readByte(),skip:!0},{label:`descriptor`,parts:[{label:`left`,parser:z.readUnsigned(!0)},{label:`top`,parser:z.readUnsigned(!0)},{label:`width`,parser:z.readUnsigned(!0)},{label:`height`,parser:z.readUnsigned(!0)},{label:`lct`,bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:`lct`,requires:function(e,t,n){return n.descriptor.lct.exists},parser:z.readArray(3,function(e,t,n){return 2**(n.descriptor.lct.size+1)})},{label:`data`,parts:[{label:`minCodeSize`,parser:z.readByte()},Da]}]},Aa={label:`text`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===1},parts:[{label:`codes`,parser:z.readBytes(2),skip:!0},{label:`blockSize`,parser:z.readByte()},{label:`preData`,parser:function(e,t,n){return e.readBytes(n.text.blockSize)}},Da]},ja={label:`frames`,parts:[Oa,{label:`application`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===255},parts:[{label:`codes`,parser:z.readBytes(2),skip:!0},{label:`blockSize`,parser:z.readByte()},{label:`id`,parser:function(e,t,n){return e.readString(n.blockSize)}},Da]},{label:`comment`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===254},parts:[{label:`codes`,parser:z.readBytes(2),skip:!0},Da]},ka,Aa],loop:function(e){var t=e.peekByte();return t===33||t===44}},Ma=[{label:`header`,parts:[{label:`signature`,parser:z.readString(3)},{label:`version`,parser:z.readString(3)}]},{label:`lsd`,parts:[{label:`width`,parser:z.readUnsigned(!0)},{label:`height`,parser:z.readUnsigned(!0)},{label:`gct`,bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:`backgroundColorIndex`,parser:z.readByte()},{label:`pixelAspectRatio`,parser:z.readByte()}]},{label:`gct`,requires:function(e,t){return t.lsd.gct.exists},parser:z.readArray(3,function(e,t){return 2**(t.lsd.gct.size+1)})},ja];function Na(e){var t=new Ta(new Uint8Array(e));this.raw=t.parse(Ma),this.raw.hasImages=!1;for(var n=0;n<this.raw.frames.length;n++)if(this.raw.frames[n].image){this.raw.hasImages=!0;break}}Na.prototype.decompressFrame=function(e,t){if(e>=this.raw.frames.length)return null;var n=this.raw.frames[e];if(n.image){var r=n.image.descriptor.width*n.image.descriptor.height,i=o(n.image.data.minCodeSize,n.image.data.blocks,r);n.image.descriptor.lct.interlaced&&(i=s(i,n.image.descriptor.width));var a={pixels:i,dims:{top:n.image.descriptor.top,left:n.image.descriptor.left,width:n.image.descriptor.width,height:n.image.descriptor.height}};return a.colorTable=n.image.descriptor.lct&&n.image.descriptor.lct.exists?n.image.lct:this.raw.gct,n.gce&&(a.delay=(n.gce.delay||10)*10,a.disposalType=n.gce.extras.disposal,n.gce.extras.transparentColorGiven&&(a.transparentIndex=n.gce.transparentColorIndex)),t&&(a.patch=c(a)),a}return null;function o(e,t,n){var r=4096,i=-1,a=n,o,s,c,l,u,d,f,p,m,h,ee,te,g,ne,re,_,v=Array(n),y=Array(r),b=Array(r),ie=Array(r+1);for(te=e,s=1<<te,u=s+1,o=s+2,f=i,l=te+1,c=(1<<l)-1,m=0;m<s;m++)y[m]=0,b[m]=m;for(ee=p=g=ne=_=re=0,h=0;h<a;){if(ne===0){if(p<l){ee+=t[re]<<p,p+=8,re++;continue}if(m=ee&c,ee>>=l,p-=l,m>o||m==u)break;if(m==s){l=te+1,c=(1<<l)-1,o=s+2,f=i;continue}if(f==i){ie[ne++]=b[m],f=m,g=m;continue}for(d=m,m==o&&(ie[ne++]=g,m=f);m>s;)ie[ne++]=b[m],m=y[m];g=b[m]&255,ie[ne++]=g,o<r&&(y[o]=f,b[o]=g,o++,(o&c)===0&&o<r&&(l++,c+=o)),f=d}ne--,v[_++]=ie[ne],h++}for(h=_;h<a;h++)v[h]=0;return v}function s(e,t){for(var n=Array(e.length),r=e.length/t,i=function(r,i){var a=e.slice(i*t,(i+1)*t);n.splice.apply(n,[r*t,t].concat(a))},a=[0,4,2,1],o=[8,8,4,2],s=0,c=0;c<4;c++)for(var l=a[c];l<r;l+=o[c])i(l,s),s++;return n}function c(e){for(var t=e.pixels.length,n=new Uint8ClampedArray(t*4),r=0;r<t;r++){var i=r*4,a=e.pixels[r],o=e.colorTable[a];n[i]=o[0],n[i+1]=o[1],n[i+2]=o[2],n[i+3]=a===e.transparentIndex?0:255}return n}},Na.prototype.decompressFrames=function(e,t,n){t===void 0&&(t=0),n=n===void 0?this.raw.frames.length:Math.min(n,this.raw.frames.length);for(var r=[],i=t;i<n;i++)this.raw.frames[i].image&&r.push(this.decompressFrame(i,e));return r};var Pa=Na,Fa=class e{static async create(t,n){let r=await fetch(t).then(e=>e.arrayBuffer()).then(e=>new Pa(e)),i=r.decompressFrames(!0,void 0,void 0),{width:a,height:o}=r.raw.lsd;return new e(i,a,o,n)}constructor(e,t,n,r){this.frames=[],this.index=0,this.playTime=0,this.frames=e,this.canvas=document.createElement(`canvas`),this.ctx=this.canvas.getContext(`2d`),this.pixelRatio=r,this.canvas.width=t,this.canvas.height=n,this.startTime=Date.now()}getCanvas(){return this.canvas}update(){let e=Date.now()-this.startTime;for(;this.playTime<e;){let e=this.frames[this.index%this.frames.length];this.playTime+=e.delay,this.index++}let t=this.frames[this.index%this.frames.length],n=new ImageData(t.patch,t.dims.width,t.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(n,t.dims.left,t.dims.top)}},Ia=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},La,Ra,za,Ba,Va,Ha=class{constructor(e,t=!1){this.isContextLost=!1,La.set(this,new Set),Ra.set(this,new Set),za.set(this,new Set),Ba.set(this,e=>{e.preventDefault(),this.isContextLost=!0;for(let e of Ia(this,Ra,`f`))e()}),Va.set(this,()=>{this.isContextLost=!1;let e=this.gl;e.getExtension(`EXT_color_buffer_float`),e.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!e.getExtension(`EXT_float_blend`);for(let e of Ia(this,La,`f`))e.restore();for(let e of Ia(this,za,`f`))e()});let n=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:t});if(!n)throw Error(`[VFX-JS] WebGL2 is not available.`);this.gl=n,this.canvas=e,n.getExtension(`EXT_color_buffer_float`),n.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!n.getExtension(`EXT_float_blend`),this.floatLinearFilter=!!n.getExtension(`OES_texture_float_linear`),this.maxTextureSize=n.getParameter(n.MAX_TEXTURE_SIZE),e.addEventListener(`webglcontextlost`,Ia(this,Ba,`f`),!1),e.addEventListener(`webglcontextrestored`,Ia(this,Va,`f`),!1)}setSize(e,t,n){let r=Math.floor(e*n),i=Math.floor(t*n);(this.canvas.width!==r||this.canvas.height!==i)&&(this.canvas.width=r,this.canvas.height=i)}addResource(e){Ia(this,La,`f`).add(e)}removeResource(e){Ia(this,La,`f`).delete(e)}onContextLost(e){return Ia(this,Ra,`f`).add(e),()=>Ia(this,Ra,`f`).delete(e)}onContextRestored(e){return Ia(this,za,`f`).add(e),()=>Ia(this,za,`f`).delete(e)}};La=new WeakMap,Ra=new WeakMap,za=new WeakMap,Ba=new WeakMap,Va=new WeakMap;var Ua=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Wa=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ga,Ka,qa,Ja,Ya=class{constructor(e){Ga.add(this),Ka.set(this,void 0),qa.set(this,void 0),Ua(this,Ka,e,`f`),this.gl=e.gl,Wa(this,Ga,`m`,Ja).call(this),e.addResource(this)}restore(){Wa(this,Ga,`m`,Ja).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){Wa(this,Ka,`f`).removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(Wa(this,qa,`f`))}};Ka=new WeakMap,qa=new WeakMap,Ga=new WeakSet,Ja=function(){let e=this.gl,t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw Error(`[VFX-JS] Failed to create quad VAO`);this.vao=t,Ua(this,qa,n,`f`);let r=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)};function Xa(e){return{phase:`hidden`,direction:1,enterProgress:0,leaveProgress:0,isIn:!1,wasAbove:!1,wasBelow:!1,lastTime:e}}function Za(e,t,n,r,i){let a=r===0?n:t>=r,o=i===0?!n:t<i,s=a&&!e.wasAbove,c=o&&!e.wasBelow;if(e.wasAbove=a,e.wasBelow=o,a&&!o)return!0;if(o&&!a)return!1;if(a&&o){if(s)return!0;if(c)return!1}return e.isIn}function Qa(e,t){e.lastTime=t}function $a(e,t,n,r){let i=n-e.lastTime;if(e.lastTime=n,e.isIn=t,eo(e,t))return e;let a=(i<0?i:e.direction*i)/r;if(e.phase===`entering`){let t=e.enterProgress+a;a>0&&t>=1?to(e,`shown`):a<0&&t<=0?to(e,`hidden`):e.enterProgress=no(t)}else if(e.phase===`leaving`){let t=e.leaveProgress+a;a>0&&t>=1?to(e,`hidden`):a<0&&t<=0?to(e,`shown`):e.leaveProgress=no(t)}return e}function eo(e,t){switch(e.phase){case`hidden`:return t?(e.phase=`entering`,e.direction=1,!0):!1;case`shown`:return!t&&(e.phase=`leaving`,e.direction=1,!0);case`entering`:return e.direction=t?1:-1,!1;case`leaving`:return e.direction=t?-1:1,!1}}function to(e,t){e.phase=t,e.direction=1,e.enterProgress=+(t===`shown`),e.leaveProgress=0}function no(e){return Math.min(Math.max(e,0),1)}function ro(e,t,n,r={}){return new Bn(e,t,n,{float:r.float??!1})}function io(e,t){let n=t.renderingToBuffer??!1,r;r=n?`none`:t.premultipliedAlpha?`premultiplied`:`normal`;let i=t.glslVersion??cr(t.fragmentShader);return new hr(e,t.vertexShader??(i===`100`?`
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
`),t.fragmentShader,t.uniforms,r,i)}var ao=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},B=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},V,oo,so,co,lo,uo,fo=class{constructor(e,t,n,r,i,a,o,s){if(V.set(this,void 0),oo.set(this,void 0),so.set(this,void 0),co.set(this,void 0),lo.set(this,void 0),uo.set(this,void 0),ao(this,co,r??!1,`f`),ao(this,lo,i??!1,`f`),ao(this,uo,a,`f`),ao(this,oo,{},`f`),ao(this,V,{src:{value:null},offset:{value:new Zn},resolution:{value:new Zn},viewport:{value:new Qn},time:{value:0},mouse:{value:new Zn},passIndex:{value:0}},`f`),n)for(let[e,t]of Object.entries(n))typeof t==`function`?(B(this,oo,`f`)[e]=t,B(this,V,`f`)[e]={value:t()}):B(this,V,`f`)[e]={value:t};this.pass=io(e,{fragmentShader:t,uniforms:B(this,V,`f`),renderingToBuffer:o??!1,premultipliedAlpha:!0,glslVersion:s})}get uniforms(){return B(this,V,`f`)}setUniforms(e,t,n,r,i,a){B(this,V,`f`).src.value=e,B(this,V,`f`).resolution.value.set(n.w*t,n.h*t),B(this,V,`f`).offset.value.set(n.x*t,n.y*t),B(this,V,`f`).time.value=r,B(this,V,`f`).mouse.value.set(i*t,a*t)}updateCustomUniforms(e){for(let[e,t]of Object.entries(B(this,oo,`f`)))B(this,V,`f`)[e]&&(B(this,V,`f`)[e].value=t());if(e)for(let[t,n]of Object.entries(e))B(this,V,`f`)[t]&&(B(this,V,`f`)[t].value=n())}initializeBackbuffer(e,t,n,r){B(this,co,`f`)&&!B(this,so,`f`)&&(B(this,uo,`f`)?ao(this,so,new Xn(e,B(this,uo,`f`)[0],B(this,uo,`f`)[1],1,B(this,lo,`f`)),`f`):ao(this,so,new Xn(e,t,n,r,B(this,lo,`f`)),`f`))}resizeBackbuffer(e,t){B(this,so,`f`)&&!B(this,uo,`f`)&&B(this,so,`f`).resize(e,t)}registerBufferUniform(e){B(this,V,`f`)[e]||(B(this,V,`f`)[e]={value:null})}get backbuffer(){return B(this,so,`f`)}get persistent(){return B(this,co,`f`)}get float(){return B(this,lo,`f`)}get size(){return B(this,uo,`f`)}dispose(){this.pass.dispose(),B(this,so,`f`)?.dispose()}};V=new WeakMap,oo=new WeakMap,so=new WeakMap,co=new WeakMap,lo=new WeakMap,uo=new WeakMap;var po=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},mo=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ho,go,_o=class{constructor(e){ho.set(this,void 0),go.set(this,new Map),po(this,ho,e,`f`)}get(e,t,n){let r=`${t}\0${e}\0${n??``}`,i=mo(this,go,`f`).get(r);return i||(i=new lr(mo(this,ho,`f`),e,t,n),mo(this,go,`f`).set(r,i)),i}get size(){return mo(this,go,`f`).size}dispose(){for(let e of mo(this,go,`f`).values())e.dispose();mo(this,go,`f`).clear()}};ho=new WeakMap,go=new WeakMap;var H=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},U=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},W,vo,yo,G,bo,xo,So,Co,wo,K,To,Eo,Do,Oo,ko,Ao,jo,Mo,q,J,No,Po,Fo,Io,Lo,Y,Ro,zo,Bo,Vo,Ho,Uo,Wo,Go,Ko,qo,Jo,Yo,Xo,Zo,Qo,$o,es,ts,ns,rs,is,as,os,ss,cs,ls,us,ds,fs,ps=new Map,ms=!1;function hs(e,t){return e===`hic`||t===!0?null:typeof t==`number`?t.toString():e===`video`?`0.0001`:`0`}function gs(e,t){let n=e.getContext(`2d`);n&&(n.clearRect(0,0,e.width,e.height),n.drawImage(t,0,0,e.width,e.height))}var _s=class{constructor(e,t){W.add(this),vo.set(this,void 0),yo.set(this,void 0),G.set(this,void 0),bo.set(this,void 0),xo.set(this,void 0),So.set(this,void 0),Co.set(this,void 0),wo.set(this,[]),K.set(this,void 0),To.set(this,new Map),Eo.set(this,null),Do.set(this,!1),Oo.set(this,new WeakSet),ko.set(this,{}),Ao.set(this,{}),jo.set(this,0),Mo.set(this,void 0),q.set(this,2),J.set(this,[]),No.set(this,new Sa({showPlain:e=>{if(e.type===`hic`){let t=e.srcTexture.source;t instanceof OffscreenCanvas&&gs(e.element,t)}else e.element.style.setProperty(`opacity`,e.originalOpacity.toString())},hidePlain:(e,t)=>{if(e.type===`hic`){let t=e.element;t.getContext(`2d`)?.clearRect(0,0,t.width,t.height)}else e.element.style.opacity=t},isRegistered:e=>U(this,J,`f`).includes(e)})),Po.set(this,0),Fo.set(this,1),Io.set(this,Date.now()/1e3),Lo.set(this,!1),Y.set(this,Li(0)),Ro.set(this,Li(0)),zo.set(this,[0,0]),Bo.set(this,0),Vo.set(this,0),Ho.set(this,0),Uo.set(this,0),Wo.set(this,new WeakMap),Ko.set(this,async()=>{if(typeof window<`u`){for(let e of U(this,J,`f`))if(e.type===`text`&&e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await U(this,W,`m`,Jo).call(this,e),e.width=n,e.height=r)}for(let e of U(this,J,`f`))if(e.type===`text`&&!e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await U(this,W,`m`,Jo).call(this,e),e.width=n,e.height=r)}}}),qo.set(this,e=>{typeof window<`u`&&(H(this,Ho,e.clientX,`f`),H(this,Uo,window.innerHeight-e.clientY,`f`))}),Qo.set(this,()=>{this.isPlaying()&&(this.render(),H(this,Mo,requestAnimationFrame(U(this,Qo,`f`)),`f`))}),H(this,vo,e,`f`),H(this,yo,t,`f`),H(this,G,new Ha(t,e.preserveDrawingBuffer),`f`),H(this,bo,U(this,G,`f`).gl,`f`),U(this,bo,`f`).clearColor(0,0,0,0),H(this,q,e.pixelRatio,`f`),H(this,Fo,e.timeScale,`f`),H(this,Io,Date.now()/1e3,`f`),H(this,xo,new Ya(U(this,G,`f`)),`f`),H(this,So,new _o(U(this,G,`f`)),`f`),typeof window<`u`&&(window.addEventListener(`resize`,U(this,Ko,`f`)),window.addEventListener(`pointermove`,U(this,qo,`f`))),U(this,Ko,`f`).call(this),H(this,Co,new vr(U(this,G,`f`)),`f`),U(this,W,`m`,cs).call(this,e.postEffects),U(this,G,`f`).onContextRestored(()=>{U(this,bo,`f`).clearColor(0,0,0,0)})}destroy(){this.stop(),typeof window<`u`&&(window.removeEventListener(`resize`,U(this,Ko,`f`)),window.removeEventListener(`pointermove`,U(this,qo,`f`))),U(this,K,`f`)?.dispose();for(let e of U(this,To,`f`).values())e?.dispose();for(let e of U(this,wo,`f`))e.pass.dispose();U(this,Eo,`f`)&&(U(this,Eo,`f`).dispose(),H(this,Eo,null,`f`),H(this,Do,!1,`f`)),U(this,Co,`f`).dispose(),U(this,So,`f`).dispose(),U(this,xo,`f`).dispose()}async addElement(e,t={},n){if(t.effect!==void 0)return U(this,W,`m`,Xo).call(this,e,t,t.effect,n);let r=U(this,W,`m`,Zo).call(this,t),i=e.getBoundingClientRect(),a=As(e)?zi(i):Ri(i),[o,s]=ys(t.overflow),l=Bi(a,s),u=Cs(t.intersection),d=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),f,p,h=!1;if(e instanceof HTMLImageElement){p=`img`;let t=m(e);if(h=!!t.match(/\.gif/i),h){let n=await Fa.create(t,U(this,q,`f`));ps.set(e,n),f=new O(U(this,G,`f`),n.getCanvas())}else{let e=await Pn(t);f=new O(U(this,G,`f`),e)}}else if(e instanceof HTMLVideoElement)f=new O(U(this,G,`f`),e),p=`video`;else if(e instanceof HTMLCanvasElement)c(e)&&n?(f=new O(U(this,G,`f`),n),p=`hic`):(f=new O(U(this,G,`f`),e),p=`canvas`);else{let t=await br(e,d,void 0,this.maxTextureSize);f=new O(U(this,G,`f`),t),p=`text`}let[ee,te]=Es(t.wrap);f.wrapS=ee,f.wrapT=te,f.needsUpdate=!0;let g=t.autoCrop??!0,ne=hs(p,t.overlay),re={src:{value:f},resolution:{value:new Zn},offset:{value:new Zn},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},enterProgress:{value:0},leaveProgress:{value:0},mouse:{value:new Zn},intersection:{value:0},viewport:{value:new Qn},autoCrop:{value:g}},_={};if(t.uniforms!==void 0)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(re[e]={value:n()},_[e]=n):re[e]={value:n};let v;t.backbuffer&&(v=(()=>{let e=(l.right-l.left)*U(this,q,`f`),t=(l.bottom-l.top)*U(this,q,`f`);return new Xn(U(this,G,`f`),e,t,U(this,q,`f`),!1)})(),re.backbuffer={value:v.texture});let y=new Map,b=new Map;for(let e=0;e<r.length-1;e++){let t=r[e].target??`pass${e}`;r[e]={...r[e],target:t};let n=r[e].size,i=n?n[0]:(l.right-l.left)*U(this,q,`f`),a=n?n[1]:(l.bottom-l.top)*U(this,q,`f`);if(r[e].persistent){let i=n?1:U(this,q,`f`),a=n?n[0]:l.right-l.left,o=n?n[1]:l.bottom-l.top;b.set(t,new Xn(U(this,G,`f`),a,o,i,r[e].float))}else y.set(t,ro(U(this,G,`f`),i,a,{float:r[e].float}))}let ie=[];for(let e=0;e<r.length;e++){let t=r[e],n=t.frag,i={...re},a={};for(let[e,r]of y)e!==t.target&&n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:r.texture});for(let[e,t]of b)n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:t.texture});if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(i[e]={value:n()},a[e]=n):i[e]={value:n};let o=io(U(this,G,`f`),{vertexShader:t.vert,fragmentShader:n,uniforms:i,renderingToBuffer:t.target!==void 0,glslVersion:t.glslVersion});ie.push({pass:o,uniforms:i,uniformGenerators:{..._,...a},target:t.target,persistent:t.persistent,float:t.float,size:t.size,backbuffer:t.target?b.get(t.target):void 0})}let x=U(this,Po,`f`),ae={type:p,element:e,isInViewport:!1,intersectionState:Xa(x),width:a.right-a.left,height:a.bottom-a.top,passes:ie,bufferTargets:y,startTime:x,enterTime:x,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:o,overflow:s,intersection:u,originalOpacity:d,srcTexture:f,zIndex:t.zIndex??0,backbuffer:v,autoCrop:g};U(this,W,`m`,is).call(this,ae,a,x),U(this,W,`m`,Yo).call(this,ae,ne)}async updateElementEffects(e,t){let n=U(this,J,`f`).find(t=>t.element===e);if(!n)throw Error(`[VFX-JS] updateElementEffects: element not registered`);if(!n.chain)throw Error(`[VFX-JS] updateElementEffects: element is on the shader path; effect-only updates are not supported`);let r=Array.isArray(t)?[...t]:[t],i=n.chain.effects,a=new Set(i),o=[];for(let e of r)if(!a.has(e)){if(U(this,Oo,`f`).has(e))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");o.push(e)}await n.chain.replaceEffects(r);let s=new Set(r);for(let e of i)s.has(e)||U(this,Oo,`f`).delete(e);for(let e of o)U(this,Oo,`f`).add(e)}removeElement(e){let t=U(this,J,`f`).findIndex(t=>t.element===e);if(t!==-1){let n=U(this,J,`f`).splice(t,1)[0];if(n.chain)U(this,W,`m`,ns).call(this,n.chain.effects),n.chain.dispose();else{for(let e of n.bufferTargets.values())e.dispose();for(let e of n.passes)e.pass.dispose(),e.backbuffer?.dispose();n.backbuffer?.dispose()}n.srcTexture.dispose(),e.style.setProperty(`opacity`,n.originalOpacity.toString())}}updateTextElement(e){let t=U(this,J,`f`).findIndex(t=>t.element===e);return t===-1?Promise.resolve():U(this,W,`m`,Jo).call(this,U(this,J,`f`)[t])}async updateImageElement(e){let t=U(this,J,`f`).find(t=>t.element===e);if(t?.type!==`img`||t.isGif)return;let n=await Pn(m(e)),r=t.srcTexture,i=new O(U(this,G,`f`),n);i.wrapS=r.wrapS,i.wrapT=r.wrapT,i.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=i),t.srcTexture=i,r.dispose()}updateCanvasElement(e){let t=U(this,J,`f`).find(t=>t.element===e);if(t){let n=t.srcTexture,r=new O(U(this,G,`f`),e);r.wrapS=n.wrapS,r.wrapT=n.wrapT,r.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=r),t.srcTexture=r,n.dispose()}}updateHICTexture(e,t){let n=U(this,J,`f`).find(t=>t.element===e);if(n?.type!==`hic`)return;n.frozen&&gs(e,t);let r=n.srcTexture;if(r.source===t)r.needsUpdate=!0;else{let e=new O(U(this,G,`f`),t);e.wrapS=r.wrapS,e.wrapT=r.wrapT,e.needsUpdate=!0,!n.chain&&n.passes.length>0&&(n.passes[0].uniforms.src.value=e),n.srcTexture=e,r.dispose()}}freezeInside(e){return U(this,No,`f`).freezeInside(e,U(this,J,`f`))}isFrozen(e){return U(this,J,`f`).some(t=>t.element===e&&t.frozen)}forceRender(e){let t=U(this,J,`f`).find(t=>t.element===e);return!t||t.forceRender?()=>{}:(t.forceRender=!0,()=>{t.forceRender=!1})}get maxTextureSize(){return U(this,G,`f`).maxTextureSize}isPlaying(){return U(this,Mo,`f`)!==void 0}play(){this.isPlaying()||(H(this,Io,Date.now()/1e3,`f`),H(this,Mo,requestAnimationFrame(U(this,Qo,`f`)),`f`))}get time(){return U(this,Po,`f`)}setTime(e){H(this,Po,e,`f`),H(this,Lo,!0,`f`)}get timeScale(){return U(this,Fo,`f`)}set timeScale(e){H(this,Fo,e,`f`)}stop(){U(this,Mo,`f`)!==void 0&&(cancelAnimationFrame(U(this,Mo,`f`)),H(this,Mo,void 0,`f`))}render(){let e=Date.now()/1e3;U(this,Lo,`f`)?H(this,Lo,!1,`f`):H(this,Po,U(this,Po,`f`)+(e-U(this,Io,`f`))*U(this,Fo,`f`),`f`),H(this,Io,e,`f`);let t=U(this,Po,`f`),n=U(this,bo,`f`);U(this,W,`m`,Go).call(this),n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,U(this,yo,`f`).width,U(this,yo,`f`).height),n.clear(n.COLOR_BUFFER_BIT);let r=U(this,Y,`f`).right-U(this,Y,`f`).left,i=U(this,Y,`f`).bottom-U(this,Y,`f`).top,a=Un(0,0,r,i),o=U(this,W,`m`,es).call(this);o&&(U(this,W,`m`,fs).call(this,r,i),U(this,K,`f`)&&(n.bindFramebuffer(n.FRAMEBUFFER,U(this,K,`f`).fbo),n.clear(n.COLOR_BUFFER_BIT),n.bindFramebuffer(n.FRAMEBUFFER,null)));for(let e of U(this,J,`f`)){if(e.frozen){Qa(e.intersectionState,t);continue}let n=e.element.getBoundingClientRect(),s=e.type===`text`?zi(n):Ri(n),c=U(this,W,`m`,is).call(this,e,s,t);if(!c.isVisible)continue;if(e.chain){U(this,W,`m`,$o).call(this,e,s,c,t);continue}let l=e.passes[0].uniforms;l.time.value=t-e.startTime,l.resolution.value.set((s.right-s.left)*U(this,q,`f`),(s.bottom-s.top)*U(this,q,`f`)),l.mouse.value.set((U(this,Ho,`f`)+U(this,Bo,`f`))*U(this,q,`f`),(U(this,Uo,`f`)+U(this,Vo,`f`))*U(this,q,`f`));for(let t of e.passes)for(let[e,n]of Object.entries(t.uniformGenerators))t.uniforms[e].value=n();ps.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(l.src.value.needsUpdate=!0);let u=Hn(s,i,U(this,Bo,`f`),U(this,Vo,`f`)),d=Hn(c.rectWithOverflow,i,U(this,Bo,`f`),U(this,Vo,`f`));e.backbuffer&&(e.passes[0].uniforms.backbuffer.value=e.backbuffer.texture);{let t=e.isFullScreen?a:d,n=Math.max(1,t.w*U(this,q,`f`)),r=Math.max(1,t.h*U(this,q,`f`)),i=Math.max(1,t.w),o=Math.max(1,t.h);for(let t=0;t<e.passes.length-1;t++){let a=e.passes[t];if(!a.size){if(a.backbuffer)a.backbuffer.resize(i,o);else{let t=e.bufferTargets.get(a.target);t&&(t.width!==n||t.height!==r)&&t.setSize(n,r)}}}}let f=new Map;for(let t of e.passes)t.backbuffer&&t.target&&f.set(t.target,t.backbuffer.texture);let p=e.srcTexture;for(let t=0;t<e.passes.length-1;t++){let r=e.passes[t],i=e.isFullScreen?a:d;r.uniforms.src.value=p;for(let[e,t]of f)r.uniforms[e]&&(r.uniforms[e].value=t);for(let[e,t]of Object.entries(r.uniformGenerators))r.uniforms[e]&&(r.uniforms[e].value=t());let o=r.size?Un(0,0,r.size[0],r.size[1]):Un(0,0,i.w,i.h),s=bs(n,u,i,r.size,[U(this,Ho,`f`),U(this,Uo,`f`)],[U(this,Bo,`f`),U(this,Vo,`f`)],U(this,q,`f`));if(r.uniforms.resolution.value.set(...s.resolution),r.uniforms.offset.value.set(...s.offset),r.uniforms.mouse.value.set(...s.mouse),r.backbuffer)U(this,W,`m`,os).call(this,r.pass,r.backbuffer.target,o,r.uniforms,!0),r.backbuffer.swap(),p=r.backbuffer.texture;else{let t=e.bufferTargets.get(r.target);if(!t)continue;U(this,W,`m`,os).call(this,r.pass,t,o,r.uniforms,!0),p=t.texture}r.target&&f.set(r.target,p)}let m=e.passes[e.passes.length-1];m.uniforms.src.value=p,m.uniforms.resolution.value.set(n.width*U(this,q,`f`),n.height*U(this,q,`f`)),m.uniforms.offset.value.set(u.x*U(this,q,`f`),u.y*U(this,q,`f`)),m.uniforms.mouse.value.set((U(this,Ho,`f`)+U(this,Bo,`f`))*U(this,q,`f`),(U(this,Uo,`f`)+U(this,Vo,`f`))*U(this,q,`f`));for(let[e,t]of f)m.uniforms[e]&&(m.uniforms[e].value=t);for(let[e,t]of Object.entries(m.uniformGenerators))m.uniforms[e]&&(m.uniforms[e].value=t());e.backbuffer?(m.uniforms.backbuffer.value=e.backbuffer.texture,e.isFullScreen?(e.backbuffer.resize(r,i),U(this,W,`m`,ss).call(this,e,u.x,u.y),U(this,W,`m`,os).call(this,m.pass,e.backbuffer.target,a,m.uniforms,!0),e.backbuffer.swap(),U(this,Co,`f`).setUniforms(e.backbuffer.texture,U(this,q,`f`),a),U(this,W,`m`,os).call(this,U(this,Co,`f`).pass,o&&U(this,K,`f`)||null,a,U(this,Co,`f`).uniforms,!1)):(e.backbuffer.resize(d.w,d.h),U(this,W,`m`,ss).call(this,e,e.overflow.left,e.overflow.bottom),U(this,W,`m`,os).call(this,m.pass,e.backbuffer.target,e.backbuffer.getViewport(),m.uniforms,!0),e.backbuffer.swap(),U(this,Co,`f`).setUniforms(e.backbuffer.texture,U(this,q,`f`),d),U(this,W,`m`,os).call(this,U(this,Co,`f`).pass,o&&U(this,K,`f`)||null,d,U(this,Co,`f`).uniforms,!1))):(U(this,W,`m`,ss).call(this,e,u.x,u.y),U(this,W,`m`,os).call(this,m.pass,o&&U(this,K,`f`)||null,e.isFullScreen?a:d,m.uniforms,!1))}o&&U(this,K,`f`)&&(U(this,Eo,`f`)&&U(this,Do,`f`)?U(this,W,`m`,us).call(this,a,t):U(this,W,`m`,ds).call(this,a,t))}};vo=new WeakMap,yo=new WeakMap,G=new WeakMap,bo=new WeakMap,xo=new WeakMap,So=new WeakMap,Co=new WeakMap,wo=new WeakMap,K=new WeakMap,To=new WeakMap,Eo=new WeakMap,Do=new WeakMap,Oo=new WeakMap,ko=new WeakMap,Ao=new WeakMap,jo=new WeakMap,Mo=new WeakMap,q=new WeakMap,J=new WeakMap,No=new WeakMap,Po=new WeakMap,Fo=new WeakMap,Io=new WeakMap,Lo=new WeakMap,Y=new WeakMap,Ro=new WeakMap,zo=new WeakMap,Bo=new WeakMap,Vo=new WeakMap,Ho=new WeakMap,Uo=new WeakMap,Wo=new WeakMap,Ko=new WeakMap,qo=new WeakMap,Qo=new WeakMap,W=new WeakSet,Go=function(){if(typeof window>`u`)return;let e=U(this,yo,`f`).ownerDocument,t=e.compatMode===`BackCompat`?e.body:e.documentElement,n=t.clientWidth,r=t.clientHeight,i=window.scrollX,a=window.scrollY,o,s;if(U(this,vo,`f`).fixedCanvas)o=0,s=0;else if(U(this,vo,`f`).wrapper)o=n*U(this,vo,`f`).scrollPadding[0],s=r*U(this,vo,`f`).scrollPadding[1];else{let t=e.body.scrollWidth-(i+n),c=e.body.scrollHeight-(a+r);o=Ds(n*U(this,vo,`f`).scrollPadding[0],0,t),s=Ds(r*U(this,vo,`f`).scrollPadding[1],0,c)}let c=n+o*2,l=r+s*2;(c!==U(this,zo,`f`)[0]||l!==U(this,zo,`f`)[1])&&(U(this,yo,`f`).style.width=`${c}px`,U(this,yo,`f`).style.height=`${l}px`,U(this,G,`f`).setSize(c,l,U(this,q,`f`)),H(this,Y,Li({top:-s,left:-o,right:n+o,bottom:r+s}),`f`),H(this,Ro,Li({top:0,left:0,right:n,bottom:r}),`f`),H(this,zo,[c,l],`f`),H(this,Bo,o,`f`),H(this,Vo,s,`f`)),U(this,vo,`f`).fixedCanvas||U(this,yo,`f`).style.setProperty(`transform`,`translate(${i-o}px, ${a-s}px)`)},Jo=async function(e){if(!U(this,Wo,`f`).get(e.element)){U(this,Wo,`f`).set(e.element,!0);try{let t=e.srcTexture,n=t.source instanceof OffscreenCanvas?t.source:void 0,r=await br(e.element,e.originalOpacity,n,this.maxTextureSize);if(r.width===0||r.height===0)return;let i=new O(U(this,G,`f`),r);i.wrapS=t.wrapS,i.wrapT=t.wrapT,i.needsUpdate=!0,!e.chain&&e.passes.length>0&&(e.passes[0].uniforms.src.value=i),e.srcTexture=i,t.dispose()}catch(e){console.error(e)}finally{U(this,Wo,`f`).set(e.element,!1)}}},Yo=function(e,t){!U(this,No,`f`).adopt(e,t)&&t!==null&&e.element.style.setProperty(`opacity`,t),U(this,J,`f`).push(e),U(this,J,`f`).sort((e,t)=>e.zIndex-t.zIndex)},Xo=async function(e,t,n,r){t.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified; `effect` takes precedence."),t.overflow!==void 0&&console.warn("[VFX-JS] `overflow` is shader-path only and is ignored by the effect path. Use each effect's own `outputRect` (with `dims.canvasRect` for fullscreen) to control its dst rect.");let i=Array.isArray(n)?[...n]:[n];U(this,W,`m`,ts).call(this,i);let a=e.getBoundingClientRect(),o=As(e)?zi(a):Ri(a),[s,l]=ys(t.overflow),u=Cs(t.intersection),d=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),f,p,h=!1;if(e instanceof HTMLImageElement){p=`img`;let t=m(e);if(h=!!t.match(/\.gif/i),h){let n=await Fa.create(t,U(this,q,`f`));ps.set(e,n),f=new O(U(this,G,`f`),n.getCanvas())}else{let e=await Pn(t);f=new O(U(this,G,`f`),e)}}else if(e instanceof HTMLVideoElement)f=new O(U(this,G,`f`),e),p=`video`;else if(e instanceof HTMLCanvasElement)c(e)&&r?(f=new O(U(this,G,`f`),r),p=`hic`):(f=new O(U(this,G,`f`),e),p=`canvas`);else{let t=await br(e,d,void 0,this.maxTextureSize);f=new O(U(this,G,`f`),t),p=`text`}let[ee,te]=Es(t.wrap);f.wrapS=ee,f.wrapT=te,f.needsUpdate=!0;let g=t.autoCrop??!0,ne=hs(p,t.overlay),re=U(this,Po,`f`),_={type:p,element:e,isInViewport:!1,intersectionState:Xa(re),width:o.right-o.left,height:o.bottom-o.top,passes:[],bufferTargets:new Map,startTime:re,enterTime:re,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:s,overflow:l,intersection:u,originalOpacity:d,srcTexture:f,zIndex:t.zIndex??0,backbuffer:void 0,autoCrop:g,effectLastRenderTime:re},v=ji(()=>_.srcTexture,()=>ws(_.srcTexture,`w`),()=>ws(_.srcTexture,`h`)),y={},b={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(b[e]=n,y[e]=n()):y[e]=n;_.effectUniformGenerators=b,_.effectStaticUniforms=y;let ie={autoCrop:g,glslVersion:t.glslVersion??`300 es`},x=new ha(U(this,G,`f`),U(this,xo,`f`),U(this,q,`f`),i,ie,v,!1,U(this,So,`f`));try{await x.initAll()}catch(t){throw U(this,W,`m`,ns).call(this,i),f.dispose(),e.style.setProperty(`opacity`,d.toString()),t}_.chain=x,U(this,W,`m`,is).call(this,_,o,re),U(this,W,`m`,Yo).call(this,_,ne)},Zo=function(e){let t=t=>t.glslVersion===void 0&&e.glslVersion!==void 0?{...t,glslVersion:e.glslVersion}:t;return Array.isArray(e.shader)?e.shader.map(t):[t({frag:U(this,W,`m`,as).call(this,e.shader||`uvGradient`)})]},$o=function(e,t,n,r){let i=e.chain;if(!i)return;let a=U(this,q,`f`);ps.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(e.srcTexture.needsUpdate=!0);let o={...e.effectStaticUniforms??{}};if(e.effectUniformGenerators)for(let[t,n]of Object.entries(e.effectUniformGenerators))o[t]=n();let s=U(this,Y,`f`).right-U(this,Y,`f`).left,c=U(this,Y,`f`).bottom-U(this,Y,`f`).top,l=Hn(t,c,U(this,Bo,`f`),U(this,Vo,`f`)),u=U(this,Ho,`f`)+U(this,Bo,`f`)-l.x,d=U(this,Uo,`f`)+U(this,Vo,`f`)-l.y,f=t.right-t.left,p=t.bottom-t.top,m=r-(e.effectLastRenderTime??r);e.effectLastRenderTime=r;let h=U(this,W,`m`,es).call(this)&&U(this,K,`f`)?Ni(U(this,K,`f`)):null;i.run({time:r-e.startTime,deltaTime:m,mouse:[u*a,d*a],mouseViewport:[U(this,Ho,`f`)*a,U(this,Uo,`f`)*a],intersection:n.intersection,enterTime:ks(r-e.enterTime),leaveTime:ks(r-e.leaveTime),enterProgress:n.enterProgress,leaveProgress:n.leaveProgress,resolvedUniforms:o,canvasSize:[s,c],canvasBufferSize:[s*a,c*a],elementSize:[f,p],elementBufferSize:[f*a,p*a],elementRectOnCanvasPx:{x:l.x*a,y:l.y*a,w:l.w*a,h:l.h*a},finalTarget:h,isVisible:n.isVisible})},es=function(){return U(this,wo,`f`).length>0||U(this,Eo,`f`)!==null&&U(this,Do,`f`)},ts=function(e){for(let t of e)if(U(this,Oo,`f`).has(t))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");for(let t of e)U(this,Oo,`f`).add(t)},ns=function(e){for(let t of e)U(this,Oo,`f`).delete(t)},rs=function(e){let t=e.hitTestPadBuffer,n=U(this,q,`f`);return Fi({top:t.top/n,right:t.right/n,bottom:t.bottom/n,left:t.left/n})},is=function(e,t,n){let r=Bi(t,e.chain?U(this,W,`m`,rs).call(this,e.chain):e.overflow),i=e.isFullScreen||vs(U(this,Ro,`f`),r),a=Bi(U(this,Ro,`f`),e.intersection.rootMargin),o=Ui(a,t);xs(e,o,vs(a,t),n);let{enterProgress:s,leaveProgress:c}=e.intersectionState;e.isInViewport=i;let l=i&&n-e.leaveTime<=e.release||e.forceRender===!0&&t.right>t.left&&t.bottom>t.top;return l&&!e.chain&&e.passes.length>0&&Ss(e.passes[0].uniforms,e,o,n),{isVisible:l,intersection:o,rectWithOverflow:r,enterProgress:s,leaveProgress:c}},as=function(e){return e in s?s[e]:e},os=function(e,t,n,r,i){let a=U(this,bo,`f`);i&&t!==null&&t!==U(this,K,`f`)&&(a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.viewport(0,0,t.width,t.height),a.clear(a.COLOR_BUFFER_BIT));let o=r.viewport;o&&o.value instanceof Qn&&o.value.set(n.x*U(this,q,`f`),n.y*U(this,q,`f`),n.w*U(this,q,`f`),n.h*U(this,q,`f`));try{gr(a,U(this,xo,`f`),e,t,n,U(this,zo,`f`)[0],U(this,zo,`f`)[1],U(this,q,`f`))}catch(e){console.error(e)}},ss=function(e,t,n){let r=e.passes[0].uniforms.offset.value;r.x=t*U(this,q,`f`),r.y=n*U(this,q,`f`)},cs=function(e){let t=e.length===1&&!(`frag`in e[0])?e[0]:null;if(t&&t.effect!==void 0){U(this,W,`m`,ls).call(this,t,t.effect);return}let n=[],r=[];for(let t of e)`frag`in t&&r.push(t);for(let e=0;e<r.length-1;e++)r[e].target||(r[e]={...r[e],target:`pass${e}`});for(let t of e){let e,r,i;if(`frag`in t)e=t.frag,r=new fo(U(this,G,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,t.size,t.target!==void 0,t.glslVersion),i=t.target;else{if(t.shader===void 0)throw Error("VFXPostEffect requires `shader` (the `effect` path is not implemented yet).");e=U(this,W,`m`,as).call(this,t.shader),r=new fo(U(this,G,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,void 0,!1,t.glslVersion),t.persistent&&r.registerBufferUniform(`backbuffer`),i=void 0}n.push(e);let a={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`&&(a[e]=n);U(this,wo,`f`).push({pass:r,target:i,generators:a})}for(let e of r)e.target&&U(this,To,`f`).set(e.target,void 0);let i=U(this,wo,`f`).map(e=>e.target).filter(e=>e!==void 0);for(let e=0;e<U(this,wo,`f`).length;e++)for(let t of i)n[e].match(RegExp(`uniform\\s+sampler2D\\s+${t}\\b`))&&U(this,wo,`f`)[e].pass.registerBufferUniform(t)},ls=function(e,t){e.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified on post-effect; `effect` takes precedence.");let n=Array.isArray(t)?[...t]:[t];U(this,W,`m`,ts).call(this,n);let r=ji(()=>{let e=U(this,K,`f`);if(!e)throw Error(`[VFX-JS] post-effect chain active without target`);return e.texture},()=>U(this,K,`f`)?.width??0,()=>U(this,K,`f`)?.height??0),i={autoCrop:!0,glslVersion:e.glslVersion??`300 es`},a=new ha(U(this,G,`f`),U(this,xo,`f`),U(this,q,`f`),n,i,r,!0,U(this,So,`f`));if(e.uniforms)for(let[t,n]of Object.entries(e.uniforms))typeof n==`function`?(U(this,Ao,`f`)[t]=n,U(this,ko,`f`)[t]=n()):U(this,ko,`f`)[t]=n;H(this,Eo,a,`f`),H(this,jo,U(this,Po,`f`),`f`),a.initAll().then(()=>{U(this,Eo,`f`)===a&&H(this,Do,!0,`f`)}).catch(e=>{console.error(`[VFX-JS] Post-effect init failed; post-effect disabled:`,e),U(this,Eo,`f`)===a&&(U(this,W,`m`,ns).call(this,U(this,Eo,`f`).effects),U(this,Eo,`f`).dispose(),H(this,Eo,null,`f`),H(this,Do,!1,`f`))})},us=function(e,t){let n=U(this,Eo,`f`);if(!n)return;let r=U(this,q,`f`),i={...U(this,ko,`f`)};for(let[e,t]of Object.entries(U(this,Ao,`f`)))i[e]=t();let a=U(this,Y,`f`).right-U(this,Y,`f`).left,o=U(this,Y,`f`).bottom-U(this,Y,`f`).top,s=t-U(this,jo,`f`);H(this,jo,t,`f`);let c=[a,o],l=[a*r,o*r],u={x:e.x*r,y:e.y*r,w:e.w*r,h:e.h*r};n.run({time:t,deltaTime:s,mouse:[U(this,Ho,`f`)*r,U(this,Uo,`f`)*r],mouseViewport:[U(this,Ho,`f`)*r,U(this,Uo,`f`)*r],intersection:1,enterTime:0,leaveTime:0,enterProgress:1,leaveProgress:0,resolvedUniforms:i,canvasSize:c,canvasBufferSize:l,elementSize:c,elementBufferSize:l,elementRectOnCanvasPx:u,finalTarget:null,isVisible:!0})},ds=function(e,t){if(!U(this,K,`f`))return;let n=U(this,K,`f`).texture,r=new Map;for(let{pass:e,target:t}of U(this,wo,`f`))t&&e.backbuffer&&r.set(t,e.backbuffer.texture);for(let i=0;i<U(this,wo,`f`).length;i++){let{pass:a,target:o,generators:s}=U(this,wo,`f`)[i],c=i===U(this,wo,`f`).length-1,l=U(this,Ho,`f`)+U(this,Bo,`f`),u=U(this,Uo,`f`)+U(this,Vo,`f`),d=a.size;if(d){let[r,i]=d;a.uniforms.src.value=n,a.uniforms.resolution.value.set(r,i),a.uniforms.offset.value.set(0,0),a.uniforms.time.value=t,a.uniforms.mouse.value.set(l/e.w*r,u/e.h*i)}else a.setUniforms(n,U(this,q,`f`),e,t,l,u);a.uniforms.passIndex.value=i,a.updateCustomUniforms(s);for(let[e,t]of r){let n=a.uniforms[e];n&&(n.value=t)}if(c)a.backbuffer?(a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture),U(this,W,`m`,os).call(this,a.pass,a.backbuffer.target,e,a.uniforms,!0),a.backbuffer.swap(),U(this,Co,`f`).setUniforms(a.backbuffer.texture,U(this,q,`f`),e),U(this,W,`m`,os).call(this,U(this,Co,`f`).pass,null,e,U(this,Co,`f`).uniforms,!1)):U(this,W,`m`,os).call(this,a.pass,null,e,a.uniforms,!1);else if(a.backbuffer){a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture);let t=d?Un(0,0,d[0]/U(this,q,`f`),d[1]/U(this,q,`f`)):e;U(this,W,`m`,os).call(this,a.pass,a.backbuffer.target,t,a.uniforms,!0),a.backbuffer.swap(),n=a.backbuffer.texture,o&&r.set(o,a.backbuffer.texture)}else{let t=o??`postEffect${i}`,s=U(this,To,`f`).get(t),c=d?d[0]:e.w*U(this,q,`f`),l=d?d[1]:e.h*U(this,q,`f`);s&&s.width===c&&s.height===l||(s?.dispose(),s=ro(U(this,G,`f`),c,l,{float:a.float}),U(this,To,`f`).set(t,s));let u=d?Un(0,0,d[0]/U(this,q,`f`),d[1]/U(this,q,`f`)):e;U(this,W,`m`,os).call(this,a.pass,s,u,a.uniforms,!0),n=s.texture,o&&r.set(o,s.texture)}}},fs=function(e,t){let n=e*U(this,q,`f`),r=t*U(this,q,`f`);U(this,K,`f`)&&U(this,K,`f`).width===n&&U(this,K,`f`).height===r||(U(this,K,`f`)?.dispose(),H(this,K,ro(U(this,G,`f`),n,r),`f`));for(let{pass:n}of U(this,wo,`f`))n.persistent&&!n.backbuffer?n.initializeBackbuffer(U(this,G,`f`),e,t,U(this,q,`f`)):n.backbuffer&&n.resizeBackbuffer(e,t)};function vs(e,t){return t.left<=e.right&&t.right>=e.left&&t.top<=e.bottom&&t.bottom>=e.top}function ys(e){return e===!0?[!0,Ii]:e===void 0?[!1,Ii]:[!1,Fi(e)]}function bs(e,t,n,r,i,a,o){let s=i[0]+a[0]-n.x,c=i[1]+a[1]-n.y;return r?{resolution:[r[0],r[1]],offset:[0,0],mouse:[s/n.w*r[0],c/n.h*r[1]]}:{resolution:[e.width*o,e.height*o],offset:[(t.x-n.x)*o,(t.y-n.y)*o],mouse:[s*o,c*o]}}function xs(e,t,n,r){let i=e.intersectionState,a=i.isIn,o=e.isFullScreen||Za(i,t,n,e.intersection.threshold,e.intersection.leaveThreshold);!a&&o&&(e.enterTime=r,e.leaveTime=1/0),a&&!o&&(e.leaveTime=r),$a(i,o,r,e.intersection.duration)}function Ss(e,t,n,r){e.intersection.value=n,e.enterTime.value=ks(r-t.enterTime),e.leaveTime.value=ks(r-t.leaveTime),e.enterProgress.value=t.intersectionState.enterProgress,e.leaveProgress.value=t.intersectionState.leaveProgress}function Cs(e){let t=e?.threshold??0,n=Fi(e?.rootMargin??0),r=e?.leaveThreshold??t,i=e?.duration??1;return Number.isFinite(i)&&i>0||(ms||(ms=!0,console.warn(`[VFX-JS] \`intersection.duration\` must be a finite number above 0, got ${i}. Using 1 instead.`)),i=1),{threshold:t,leaveThreshold:r,rootMargin:n,duration:i}}function ws(e,t){let n=e.source;if(!n)return 0;if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return t===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return t===`w`?n.videoWidth:n.videoHeight;let r=n;return t===`w`?r.width:r.height}function Ts(e){return e===`repeat`?`repeat`:e===`mirror`?`mirror`:`clamp`}function Es(e){if(!e)return[`clamp`,`clamp`];if(Array.isArray(e))return[Ts(e[0]),Ts(e[1])];let t=Ts(e);return[t,t]}function Ds(e,t,n){return Math.max(t,Math.min(n,e))}var Os=1e6;function ks(e){return Ds(e,-1e6,Os)}function As(e){return!(e instanceof HTMLImageElement||e instanceof HTMLVideoElement||e instanceof HTMLCanvasElement)}function js(){try{let e=document.createElement(`canvas`);return(e.getContext(`webgl2`)||e.getContext(`webgl`))!==null}catch{return!1}}var Ms=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},X=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ns,Z,Ps,Fs,Is,Ls,Rs,zs,Bs,Vs,Hs,Us;function Ws(){if(typeof window>`u`)throw`Cannot find 'window'. VFX-JS only runs on the browser.`;if(typeof document>`u`)throw`Cannot find 'document'. VFX-JS only runs on the browser.`}function Gs(e){return{position:e?`fixed`:`absolute`,top:0,left:0,width:`0px`,height:`0px`,"z-index":9999,"pointer-events":`none`}}var Ks=class e{static init(t){try{return new e(t)}catch{return null}}constructor(e={}){if(Ns.add(this),Z.set(this,void 0),Ps.set(this,void 0),Fs.set(this,new Map),Is.set(this,new Set),Ws(),!js())throw Error(`[VFX-JS] WebGL is not available in this environment.`);let t=xn(e),n=document.createElement(`canvas`),r=Gs(t.fixedCanvas);for(let[e,t]of Object.entries(r))n.style.setProperty(e,t.toString());t.zIndex!==void 0&&n.style.setProperty(`z-index`,t.zIndex.toString()),(t.wrapper??document.body).appendChild(n),Ms(this,Ps,n,`f`),Ms(this,Z,new _s(t,n),`f`),t.autoplay&&X(this,Z,`f`).play()}async add(e,t,n){e instanceof HTMLImageElement?await X(this,Ns,`m`,Bs).call(this,e,t):e instanceof HTMLVideoElement?await X(this,Ns,`m`,Vs).call(this,e,t):e instanceof HTMLCanvasElement?c(e)&&n?await X(this,Ns,`m`,zs).call(this,e,t,n):await X(this,Ns,`m`,Hs).call(this,e,t):await X(this,Ns,`m`,Us).call(this,e,t)}updateHICTexture(e,t){X(this,Z,`f`).updateHICTexture(e,t)}get maxTextureSize(){return X(this,Z,`f`).maxTextureSize}get canvas(){return X(this,Ps,`f`)}addHTML(e,t){return X(this,Ns,`m`,Ls).call(this,e,t,!1)}addHTMLWithStill(e,t){return X(this,Ns,`m`,Ls).call(this,e,t,!0)}addTransition(e,t={}){let n=new bn(this,e,t,()=>X(this,Is,`f`).delete(n));return X(this,Is,`f`).add(n),n}freezeInside(e){return X(this,Z,`f`).freezeInside(e)}lockSize(e){let t=X(this,Fs,`f`).get(e);return t?Ce(t):()=>{}}forceRender(e){let t=X(this,Fs,`f`).get(e)??e;return X(this,Z,`f`).forceRender(t)}remove(e){let t=X(this,Fs,`f`).get(e);t?(je(t,e),X(this,Fs,`f`).delete(e),X(this,Z,`f`).removeElement(t)):X(this,Z,`f`).removeElement(e)}updateEffects(e,t){let n=X(this,Fs,`f`).get(e)??e;return X(this,Z,`f`).updateElementEffects(n,t)}async update(e){await this.updateInTime(e)}async updateInTime(e){let t=X(this,Fs,`f`).get(e)??(e instanceof HTMLCanvasElement?e:null);return(t?Se(t):void 0)||(e instanceof HTMLImageElement?await X(this,Z,`f`).updateImageElement(e):e instanceof HTMLCanvasElement?X(this,Z,`f`).updateCanvasElement(e):await X(this,Z,`f`).updateTextElement(e),!0)}play(){X(this,Z,`f`).play()}stop(){X(this,Z,`f`).stop()}render(){X(this,Z,`f`).render()}get time(){return X(this,Z,`f`).time}setTime(e){X(this,Z,`f`).setTime(e)}get timeScale(){return X(this,Z,`f`).timeScale}set timeScale(e){X(this,Z,`f`).timeScale=e}destroy(){for(let e of X(this,Is,`f`))e.destroy();X(this,Is,`f`).clear();for(let[e,t]of X(this,Fs,`f`))je(t,e);X(this,Fs,`f`).clear(),X(this,Z,`f`).destroy(),X(this,Ps,`f`).remove()}};Z=new WeakMap,Ps=new WeakMap,Fs=new WeakMap,Is=new WeakMap,Ns=new WeakSet,Ls=async function(e,t,n){if(!Ne())return console.warn(`html-in-canvas not supported, falling back to dom-to-canvas`),this.add(e,t);t.overlay!==void 0&&console.warn(`addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.`);let{overlay:r,...i}=t,a=X(this,Fs,`f`).get(e);a&&X(this,Z,`f`).removeElement(a);let{canvas:o,initialCapture:s}=await Ae(e,{onCapture:e=>{X(this,Z,`f`).updateHICTexture(o,e)},maxSize:X(this,Z,`f`).maxTextureSize,stillCover:n?{zIndex:X(this,Ns,`m`,Rs).call(this)}:void 0});a=o,X(this,Fs,`f`).set(e,a),await X(this,Ns,`m`,zs).call(this,a,i,s)},Rs=function(){let e=Number.parseInt(X(this,Ps,`f`).style.zIndex,10);return Number.isNaN(e)?9998:e-1},zs=async function(e,t,n){try{await X(this,Z,`f`).addElement(e,t,n)}finally{Te(e,X(this,Z,`f`).isFrozen(e))}},Bs=function(e,t){return e.complete?X(this,Z,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`load`,()=>{X(this,Z,`f`).addElement(e,t),n()},{once:!0})})},Vs=function(e,t){return e.readyState>=3?X(this,Z,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`canplay`,()=>{X(this,Z,`f`).addElement(e,t),n()},{once:!0})})},Hs=function(e,t){return X(this,Z,`f`).addElement(e,t)},Us=function(e,t){return X(this,Z,`f`).addElement(e,t)};function qs(e,t){if(e===`fullscreen`)return t.canvasRect;let n=e*t.pixelRatio,[,,r,i]=t.contentRect;return[-n,-n,r+2*n,i+2*n]}var Js=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Q=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ys,$,Xs,Zs,Qs,$s,ec,tc,nc=`#version 300 es
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
`,rc=`#version 300 es
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
`,ic=`#version 300 es
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
`,ac=`#version 300 es
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
`,oc={threshold:.7,softness:.1,intensity:1.2,scatter:.7,pad:50,dither:0,edgeFade:.02},sc=.5,cc=class{constructor(e={}){Ys.add(this),$.set(this,null),Xs.set(this,[]),Zs.set(this,[]),Qs.set(this,!1),$s.set(this,0),ec.set(this,0),this.params={...oc,...e}}setParams(e){Object.assign(this.params,e)}init(e){Js(this,$,e.createRenderTarget({float:!0}),`f`)}render(e){if(!Q(this,$,`f`))return;let{threshold:t,softness:n,intensity:r}=this.params,i=Math.min(Math.max(this.params.scatter,0),1),a=Math.max(0,this.params.dither),o=Math.max(1e-6,this.params.edgeFade);(Q(this,$,`f`).width!==Q(this,$s,`f`)||Q(this,$,`f`).height!==Q(this,ec,`f`))&&(Q(this,Xs,`f`).length=0,Q(this,Zs,`f`).length=0,Js(this,Qs,!1,`f`),Js(this,$s,Q(this,$,`f`).width,`f`),Js(this,ec,Q(this,$,`f`).height,`f`)),Q(this,Ys,`m`,tc).call(this,e,Q(this,$,`f`).width,Q(this,$,`f`).height);let s=Q(this,Xs,`f`).length;if(s===0)return;e.draw({frag:nc,uniforms:{src:e.src,threshold:t,softness:n,edgeFade:o},target:Q(this,$,`f`)}),e.draw({frag:rc,uniforms:{src:Q(this,$,`f`),texelSize:[1/Q(this,$,`f`).width,1/Q(this,$,`f`).height],karis:1},target:Q(this,Xs,`f`)[0]});for(let t=1;t<s;t++){let n=Q(this,Xs,`f`)[t-1];e.draw({frag:rc,uniforms:{src:n,texelSize:[1/n.width,1/n.height],karis:0},target:Q(this,Xs,`f`)[t]})}let c=Q(this,$,`f`).width,l=Q(this,$,`f`).height,u=1+i*Math.max(0,s-1),d=e=>Math.min(1,Math.max(0,u-e));for(let t=s-2;t>=0;t--){let n=t===s-2?Q(this,Xs,`f`)[s-1]:Q(this,Zs,`f`)[t+1],r=2**(t+2),i=t===s-2?d(s-1):1;e.draw({frag:ic,uniforms:{srcSmall:n,srcLarge:Q(this,Xs,`f`)[t],texelSize:[sc*r/c,sc*r/l],weightLarge:d(t),weightSmall:i},target:Q(this,Zs,`f`)[t]})}let f=s>=2?Q(this,Zs,`f`)[0]:Q(this,Xs,`f`)[0],p=r/Math.max(1,u);e.draw({frag:ac,uniforms:{src:e.src,bloom:f,texelSize:[sc*2/c,sc*2/l],intensity:p,dither:a,edgeFade:o},target:e.target})}outputRect(e){return qs(this.params.pad,e)}dispose(){Js(this,$,null,`f`),Q(this,Xs,`f`).length=0,Q(this,Zs,`f`).length=0,Js(this,Qs,!1,`f`),Js(this,$s,0,`f`),Js(this,ec,0,`f`)}};$=new WeakMap,Xs=new WeakMap,Zs=new WeakMap,Qs=new WeakMap,$s=new WeakMap,ec=new WeakMap,Ys=new WeakSet,tc=function(e,t,n){if(Q(this,Qs,`f`))return;let r=Math.max(1,Math.floor(t/2)),i=Math.max(1,Math.floor(n/2));for(let t=0;t<8;t++){Q(this,Xs,`f`).push(e.createRenderTarget({size:[r,i],float:!0}));let t=Math.max(1,Math.floor(r/2)),n=Math.max(1,Math.floor(i/2));if(t===r&&n===i)break;r=t,i=n}for(let t=0;t<Q(this,Xs,`f`).length-1;t++)Q(this,Zs,`f`).push(e.createRenderTarget({size:[Q(this,Xs,`f`)[t].width,Q(this,Xs,`f`)[t].height],float:!0}));Js(this,Qs,!0,`f`)};var lc={pure:{cyan:[0,1,1,1],magenta:[1,0,1,1],yellow:[1,1,0,1],black:[0,0,0,1],red:[1,0,0,1],green:[0,1,0,1],blue:[0,0,1,1]},newsprint:{cyan:[.15,.73,.88,1],magenta:[.88,.12,.55,1],yellow:[.97,.93,.08,1],black:[.1,.1,.1,1]},fogra51:{cyan:[0,.525,.765,1],magenta:[.827,0,.486,1],yellow:[.984,.91,0,1],black:[.145,.145,.145,1]},swop:{cyan:[0,.557,.769,1],magenta:[.827,.02,.478,1],yellow:[.984,.902,.027,1],black:[.169,.169,.169,1]}};({...lc.pure,...lc.newsprint});var uc=.7,dc=1.3,fc=`
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
`;new Float32Array([-.5,-.5,.5,-.5,.5,.5,-.5,-.5,.5,.5,-.5,.5]);var pc=`
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`,mc=4096,hc=new Float32Array(mc);for(let e=0;e<mc;e++)hc[e]=e;`${pc}${fc}${uc.toFixed(4)}${dc.toFixed(4)}`;var gc=`#version 300 es
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
`,_c={size:10},vc=class{constructor(e={}){this.params={..._c,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element,{size:r}=this.params;e.draw({frag:gc,uniforms:{src:e.src,cellUv:[r/(t||1),r/(n||1)]},target:e.target})}},yc=`#version 300 es
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
`,bc={spacing:4},xc=class{constructor(e={}){this.params={...bc,...e}}setParams(e){Object.assign(this.params,e)}render(e){let{spacing:t}=this.params;e.draw({frag:yc,uniforms:{src:e.src,innerHeight:e.dims.element[1]||1,spacing:t},target:e.target})}},Sc=e(t(((e,t)=>{var n=function(e){var t=/(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i,n=0,r={},i={manual:e.Prism&&e.Prism.manual,disableWorkerMessageHandler:e.Prism&&e.Prism.disableWorkerMessageHandler,util:{encode:function e(t){return t instanceof a?new a(t.type,e(t.content),t.alias):Array.isArray(t)?t.map(e):t.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/\u00a0/g,` `)},type:function(e){return Object.prototype.toString.call(e).slice(8,-1)},objId:function(e){return e.__id||Object.defineProperty(e,"__id",{value:++n}),e.__id},clone:function e(t,n){n||={};var r,a;switch(i.util.type(t)){case`Object`:if(a=i.util.objId(t),n[a])return n[a];for(var o in r={},n[a]=r,t)t.hasOwnProperty(o)&&(r[o]=e(t[o],n));return r;case`Array`:return a=i.util.objId(t),n[a]?n[a]:(r=[],n[a]=r,t.forEach(function(t,i){r[i]=e(t,n)}),r);default:return t}},getLanguage:function(e){for(;e;){var n=t.exec(e.className);if(n)return n[1].toLowerCase();e=e.parentElement}return`none`},setLanguage:function(e,n){e.className=e.className.replace(RegExp(t,`gi`),``),e.classList.add(`language-`+n)},currentScript:function(){if(typeof document>`u`)return null;if(document.currentScript&&document.currentScript.tagName===`SCRIPT`)return document.currentScript;try{throw Error()}catch(r){var e=(/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(r.stack)||[])[1];if(e){var t=document.getElementsByTagName(`script`);for(var n in t)if(t[n].src==e)return t[n]}return null}},isActive:function(e,t,n){for(var r=`no-`+t;e;){var i=e.classList;if(i.contains(t))return!0;if(i.contains(r))return!1;e=e.parentElement}return!!n}},languages:{plain:r,plaintext:r,text:r,txt:r,extend:function(e,t){var n=i.util.clone(i.languages[e]);for(var r in t)n[r]=t[r];return n},insertBefore:function(e,t,n,r){r||=i.languages;var a=r[e],o={};for(var s in a)if(a.hasOwnProperty(s)){if(s==t)for(var c in n)n.hasOwnProperty(c)&&(o[c]=n[c]);n.hasOwnProperty(s)||(o[s]=a[s])}var l=r[e];return r[e]=o,i.languages.DFS(i.languages,function(t,n){n===l&&t!=e&&(this[t]=o)}),o},DFS:function e(t,n,r,a){a||={};var o=i.util.objId;for(var s in t)if(t.hasOwnProperty(s)){n.call(t,s,t[s],r||s);var c=t[s],l=i.util.type(c);l===`Object`&&!a[o(c)]?(a[o(c)]=!0,e(c,n,null,a)):l===`Array`&&!a[o(c)]&&(a[o(c)]=!0,e(c,n,s,a))}}},plugins:{},highlightAll:function(e,t){i.highlightAllUnder(document,e,t)},highlightAllUnder:function(e,t,n){var r={callback:n,container:e,selector:`code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code`};i.hooks.run(`before-highlightall`,r),r.elements=Array.prototype.slice.apply(r.container.querySelectorAll(r.selector)),i.hooks.run(`before-all-elements-highlight`,r);for(var a=0,o;o=r.elements[a++];)i.highlightElement(o,t===!0,r.callback)},highlightElement:function(t,n,r){var a=i.util.getLanguage(t),o=i.languages[a];i.util.setLanguage(t,a);var s=t.parentElement;s&&s.nodeName.toLowerCase()===`pre`&&i.util.setLanguage(s,a);var c={element:t,language:a,grammar:o,code:t.textContent};function l(e){c.highlightedCode=e,i.hooks.run(`before-insert`,c),c.element.innerHTML=c.highlightedCode,i.hooks.run(`after-highlight`,c),i.hooks.run(`complete`,c),r&&r.call(c.element)}if(i.hooks.run(`before-sanity-check`,c),s=c.element.parentElement,s&&s.nodeName.toLowerCase()===`pre`&&!s.hasAttribute(`tabindex`)&&s.setAttribute(`tabindex`,`0`),!c.code)i.hooks.run(`complete`,c),r&&r.call(c.element);else if(i.hooks.run(`before-highlight`,c),!c.grammar)l(i.util.encode(c.code));else if(n&&e.Worker){var u=new Worker(i.filename);u.onmessage=function(e){l(e.data)},u.postMessage(JSON.stringify({language:c.language,code:c.code,immediateClose:!0}))}else l(i.highlight(c.code,c.grammar,c.language))},highlight:function(e,t,n){var r={code:e,grammar:t,language:n};if(i.hooks.run(`before-tokenize`,r),!r.grammar)throw Error(`The language "`+r.language+`" has no grammar.`);return r.tokens=i.tokenize(r.code,r.grammar),i.hooks.run(`after-tokenize`,r),a.stringify(i.util.encode(r.tokens),r.language)},tokenize:function(e,t){var n=t.rest;if(n){for(var r in n)t[r]=n[r];delete t.rest}var i=new c;return l(i,i.head,e),s(e,i,t,i.head,0),d(i)},hooks:{all:{},add:function(e,t){var n=i.hooks.all;n[e]=n[e]||[],n[e].push(t)},run:function(e,t){var n=i.hooks.all[e];if(n&&n.length)for(var r=0,a;a=n[r++];)a(t)}},Token:a};e.Prism=i;function a(e,t,n,r){this.type=e,this.content=t,this.alias=n,this.length=(r||``).length|0}a.stringify=function e(t,n){if(typeof t==`string`)return t;if(Array.isArray(t)){var r=``;return t.forEach(function(t){r+=e(t,n)}),r}var a={type:t.type,content:e(t.content,n),tag:`span`,classes:[`token`,t.type],attributes:{},language:n},o=t.alias;o&&(Array.isArray(o)?Array.prototype.push.apply(a.classes,o):a.classes.push(o)),i.hooks.run(`wrap`,a);var s=``;for(var c in a.attributes)s+=` `+c+`="`+(a.attributes[c]||``).replace(/"/g,`&quot;`)+`"`;return`<`+a.tag+` class="`+a.classes.join(` `)+`"`+s+`>`+a.content+`</`+a.tag+`>`};function o(e,t,n,r){e.lastIndex=t;var i=e.exec(n);if(i&&r&&i[1]){var a=i[1].length;i.index+=a,i[0]=i[0].slice(a)}return i}function s(e,t,n,r,c,d){for(var f in n)if(n.hasOwnProperty(f)&&n[f]){var p=n[f];p=Array.isArray(p)?p:[p];for(var m=0;m<p.length;++m){if(d&&d.cause==f+`,`+m)return;var h=p[m],ee=h.inside,te=!!h.lookbehind,g=!!h.greedy,ne=h.alias;if(g&&!h.pattern.global){var re=h.pattern.toString().match(/[imsuy]*$/)[0];h.pattern=RegExp(h.pattern.source,re+`g`)}for(var _=h.pattern||h,v=r.next,y=c;v!==t.tail&&!(d&&y>=d.reach);y+=v.value.length,v=v.next){var b=v.value;if(t.length>e.length)return;if(!(b instanceof a)){var ie=1,x;if(g){if(x=o(_,y,e,te),!x||x.index>=e.length)break;var ae=x.index,oe=x.index+x[0].length,se=y;for(se+=v.value.length;ae>=se;)v=v.next,se+=v.value.length;if(se-=v.value.length,y=se,v.value instanceof a)continue;for(var ce=v;ce!==t.tail&&(se<oe||typeof ce.value==`string`);ce=ce.next)ie++,se+=ce.value.length;ie--,b=e.slice(y,se),x.index-=y}else if(x=o(_,0,b,te),!x)continue;var ae=x.index,le=x[0],ue=b.slice(0,ae),de=b.slice(ae+le.length),fe=y+b.length;d&&fe>d.reach&&(d.reach=fe);var pe=v.prev;ue&&(pe=l(t,pe,ue),y+=ue.length),u(t,pe,ie);var me=new a(f,ee?i.tokenize(le,ee):le,ne,le);if(v=l(t,pe,me),de&&l(t,v,de),ie>1){var he={cause:f+`,`+m,reach:fe};s(e,t,n,v.prev,y,he),d&&he.reach>d.reach&&(d.reach=he.reach)}}}}}}function c(){var e={value:null,prev:null,next:null},t={value:null,prev:e,next:null};e.next=t,this.head=e,this.tail=t,this.length=0}function l(e,t,n){var r=t.next,i={value:n,prev:t,next:r};return t.next=i,r.prev=i,e.length++,i}function u(e,t,n){for(var r=t.next,i=0;i<n&&r!==e.tail;i++)r=r.next;t.next=r,r.prev=t,e.length-=i}function d(e){for(var t=[],n=e.head.next;n!==e.tail;)t.push(n.value),n=n.next;return t}if(!e.document)return e.addEventListener&&(i.disableWorkerMessageHandler||e.addEventListener(`message`,function(t){var n=JSON.parse(t.data),r=n.language,a=n.code,o=n.immediateClose;e.postMessage(i.highlight(a,i.languages[r],r)),o&&e.close()},!1)),i;var f=i.util.currentScript();f&&(i.filename=f.src,f.hasAttribute(`data-manual`)&&(i.manual=!0));function p(){i.manual||i.highlightAll()}if(!i.manual){var m=document.readyState;m===`loading`||m===`interactive`&&f&&f.defer?document.addEventListener(`DOMContentLoaded`,p):window.requestAnimationFrame?window.requestAnimationFrame(p):window.setTimeout(p,16)}return i}(typeof window<`u`?window:typeof WorkerGlobalScope<`u`&&self instanceof WorkerGlobalScope?self:{});t!==void 0&&t.exports&&(t.exports=n),typeof global<`u`&&(global.Prism=n),n.languages.markup={comment:{pattern:/<!--(?:(?!<!--)[\s\S])*?-->/,greedy:!0},prolog:{pattern:/<\?[\s\S]+?\?>/,greedy:!0},doctype:{pattern:/<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,greedy:!0,inside:{"internal-subset":{pattern:/(^[^\[]*\[)[\s\S]+(?=\]>$)/,lookbehind:!0,greedy:!0,inside:null},string:{pattern:/"[^"]*"|'[^']*'/,greedy:!0},punctuation:/^<!|>$|[[\]]/,"doctype-tag":/^DOCTYPE/i,name:/[^\s<>'"]+/}},cdata:{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,greedy:!0},tag:{pattern:/<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,greedy:!0,inside:{tag:{pattern:/^<\/?[^\s>\/]+/,inside:{punctuation:/^<\/?/,namespace:/^[^\s>\/:]+:/}},"special-attr":[],"attr-value":{pattern:/=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,inside:{punctuation:[{pattern:/^=/,alias:`attr-equals`},{pattern:/^(\s*)["']|["']$/,lookbehind:!0}]}},punctuation:/\/?>/,"attr-name":{pattern:/[^\s>\/]+/,inside:{namespace:/^[^\s>\/:]+:/}}}},entity:[{pattern:/&[\da-z]{1,8};/i,alias:`named-entity`},/&#x?[\da-f]{1,8};/i]},n.languages.markup.tag.inside[`attr-value`].inside.entity=n.languages.markup.entity,n.languages.markup.doctype.inside[`internal-subset`].inside=n.languages.markup,n.hooks.add(`wrap`,function(e){e.type===`entity`&&(e.attributes.title=e.content.replace(/&amp;/,`&`))}),Object.defineProperty(n.languages.markup.tag,"addInlined",{value:function(e,t){var r={};r[`language-`+t]={pattern:/(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,lookbehind:!0,inside:n.languages[t]},r.cdata=/^<!\[CDATA\[|\]\]>$/i;var i={"included-cdata":{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,inside:r}};i[`language-`+t]={pattern:/[\s\S]+/,inside:n.languages[t]};var a={};a[e]={pattern:RegExp(`(<__[^>]*>)(?:<!\\[CDATA\\[(?:[^\\]]|\\](?!\\]>))*\\]\\]>|(?!<!\\[CDATA\\[)[\\s\\S])*?(?=<\\/__>)`.replace(/__/g,function(){return e}),`i`),lookbehind:!0,greedy:!0,inside:i},n.languages.insertBefore(`markup`,`cdata`,a)}}),Object.defineProperty(n.languages.markup.tag,"addAttribute",{value:function(e,t){n.languages.markup.tag.inside[`special-attr`].push({pattern:RegExp(`(^|["'\\s])(?:`+e+`)\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s'">=]+(?=[\\s>]))`,`i`),lookbehind:!0,inside:{"attr-name":/^[^\s=]+/,"attr-value":{pattern:/=[\s\S]+/,inside:{value:{pattern:/(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,lookbehind:!0,alias:[t,`language-`+t],inside:n.languages[t]},punctuation:[{pattern:/^=/,alias:`attr-equals`},/"|'/]}}}})}}),n.languages.html=n.languages.markup,n.languages.mathml=n.languages.markup,n.languages.svg=n.languages.markup,n.languages.xml=n.languages.extend(`markup`,{}),n.languages.ssml=n.languages.xml,n.languages.atom=n.languages.xml,n.languages.rss=n.languages.xml,(function(e){var t=/(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;e.languages.css={comment:/\/\*[\s\S]*?\*\//,atrule:{pattern:RegExp(`@[\\w-](?:[^;{\\s"']|\\s+(?!\\s)|`+t.source+`)*?(?:;|(?=\\s*\\{))`),inside:{rule:/^@[\w-]+/,"selector-function-argument":{pattern:/(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,lookbehind:!0,alias:`selector`},keyword:{pattern:/(^|[^\w-])(?:and|not|only|or)(?![\w-])/,lookbehind:!0}}},url:{pattern:RegExp(`\\burl\\((?:`+t.source+`|(?:[^\\\\\\r\\n()"']|\\\\[\\s\\S])*)\\)`,`i`),greedy:!0,inside:{function:/^url/i,punctuation:/^\(|\)$/,string:{pattern:RegExp(`^`+t.source+`$`),alias:`url`}}},selector:{pattern:RegExp(`(^|[{}\\s])[^{}\\s](?:[^{};"'\\s]|\\s+(?![\\s{])|`+t.source+`)*(?=\\s*\\{)`),lookbehind:!0},string:{pattern:t,greedy:!0},property:{pattern:/(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,lookbehind:!0},important:/!important\b/i,function:{pattern:/(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,lookbehind:!0},punctuation:/[(){};:,]/},e.languages.css.atrule.inside.rest=e.languages.css;var n=e.languages.markup;n&&(n.tag.addInlined(`style`,`css`),n.tag.addAttribute(`style`,`css`))})(n),n.languages.clike={comment:[{pattern:/(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,lookbehind:!0,greedy:!0},{pattern:/(^|[^\\:])\/\/.*/,lookbehind:!0,greedy:!0}],string:{pattern:/(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,greedy:!0},"class-name":{pattern:/(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,lookbehind:!0,inside:{punctuation:/[.\\]/}},keyword:/\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,boolean:/\b(?:false|true)\b/,function:/\b\w+(?=\()/,number:/\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,operator:/[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,punctuation:/[{}[\];(),.:]/},n.languages.javascript=n.languages.extend(`clike`,{"class-name":[n.languages.clike[`class-name`],{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,lookbehind:!0}],keyword:[{pattern:/((?:^|\})\s*)catch\b/,lookbehind:!0},{pattern:/(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,lookbehind:!0}],function:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,number:{pattern:RegExp(`(^|[^\\w$])(?:NaN|Infinity|0[bB][01]+(?:_[01]+)*n?|0[oO][0-7]+(?:_[0-7]+)*n?|0[xX][\\dA-Fa-f]+(?:_[\\dA-Fa-f]+)*n?|\\d+(?:_\\d+)*n|(?:\\d+(?:_\\d+)*(?:\\.(?:\\d+(?:_\\d+)*)?)?|\\.\\d+(?:_\\d+)*)(?:[Ee][+-]?\\d+(?:_\\d+)*)?)(?![\\w$])`),lookbehind:!0},operator:/--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/}),n.languages.javascript[`class-name`][0].pattern=/(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/,n.languages.insertBefore(`javascript`,`keyword`,{regex:{pattern:RegExp(`((?:^|[^$\\w\\xA0-\\uFFFF."'\\])\\s]|\\b(?:return|yield))\\s*)\\/(?:(?:\\[(?:[^\\]\\\\\\r\\n]|\\\\.)*\\]|\\\\.|[^/\\\\\\[\\r\\n])+\\/[dgimyus]{0,7}|(?:\\[(?:[^[\\]\\\\\\r\\n]|\\\\.|\\[(?:[^[\\]\\\\\\r\\n]|\\\\.|\\[(?:[^[\\]\\\\\\r\\n]|\\\\.)*\\])*\\])*\\]|\\\\.|[^/\\\\\\[\\r\\n])+\\/[dgimyus]{0,7}v[dgimyus]{0,7})(?=(?:\\s|\\/\\*(?:[^*]|\\*(?!\\/))*\\*\\/)*(?:$|[\\r\\n,.;:})\\]]|\\/\\/))`),lookbehind:!0,greedy:!0,inside:{"regex-source":{pattern:/^(\/)[\s\S]+(?=\/[a-z]*$)/,lookbehind:!0,alias:`language-regex`,inside:n.languages.regex},"regex-delimiter":/^\/|\/$/,"regex-flags":/^[a-z]+$/}},"function-variable":{pattern:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,alias:`function`},parameter:[{pattern:/(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,lookbehind:!0,inside:n.languages.javascript},{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,lookbehind:!0,inside:n.languages.javascript},{pattern:/(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,lookbehind:!0,inside:n.languages.javascript},{pattern:/((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,lookbehind:!0,inside:n.languages.javascript}],constant:/\b[A-Z](?:[A-Z_]|\dx?)*\b/}),n.languages.insertBefore(`javascript`,`string`,{hashbang:{pattern:/^#!.*/,greedy:!0,alias:`comment`},"template-string":{pattern:/`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,greedy:!0,inside:{"template-punctuation":{pattern:/^`|`$/,alias:`string`},interpolation:{pattern:/((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,lookbehind:!0,inside:{"interpolation-punctuation":{pattern:/^\$\{|\}$/,alias:`punctuation`},rest:n.languages.javascript}},string:/[\s\S]+/}},"string-property":{pattern:/((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,lookbehind:!0,greedy:!0,alias:`property`}}),n.languages.insertBefore(`javascript`,`operator`,{"literal-property":{pattern:/((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,lookbehind:!0,alias:`property`}}),n.languages.markup&&(n.languages.markup.tag.addInlined(`script`,`javascript`),n.languages.markup.tag.addAttribute(`on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)`,`javascript`)),n.languages.js=n.languages.javascript,(function(){if(n===void 0||typeof document>`u`)return;Element.prototype.matches||(Element.prototype.matches=Element.prototype.msMatchesSelector||Element.prototype.webkitMatchesSelector);var e=`Loading…`,t=function(e,t){return`✖ Error `+e+` while fetching file: `+t},r=`✖ Error: File does not exist or is empty`,i={js:`javascript`,py:`python`,rb:`ruby`,ps1:`powershell`,psm1:`powershell`,sh:`bash`,bat:`batch`,h:`c`,tex:`latex`},a=`data-src-status`,o=`loading`,s=`loaded`,c=`failed`,l=`pre[data-src]:not([`+a+`="`+s+`"]):not([`+a+`="`+o+`"])`;function u(e,n,i){var a=new XMLHttpRequest;a.open(`GET`,e,!0),a.onreadystatechange=function(){a.readyState==4&&(a.status<400&&a.responseText?n(a.responseText):a.status>=400?i(t(a.status,a.statusText)):i(r))},a.send(null)}function d(e){var t=/^\s*(\d+)\s*(?:(,)\s*(?:(\d+)\s*)?)?$/.exec(e||``);if(t){var n=Number(t[1]),r=t[2],i=t[3];return r?i?[n,Number(i)]:[n,void 0]:[n,n]}}n.hooks.add(`before-highlightall`,function(e){e.selector+=`, `+l}),n.hooks.add(`before-sanity-check`,function(t){var r=t.element;if(r.matches(l)){t.code=``,r.setAttribute(a,o);var f=r.appendChild(document.createElement(`CODE`));f.textContent=e;var p=r.getAttribute(`data-src`),m=t.language;if(m===`none`){var h=(/\.(\w+)$/.exec(p)||[,`none`])[1];m=i[h]||h}n.util.setLanguage(f,m),n.util.setLanguage(r,m);var ee=n.plugins.autoloader;ee&&ee.loadLanguages(m),u(p,function(e){r.setAttribute(a,s);var t=d(r.getAttribute(`data-range`));if(t){var i=e.split(/\r\n?|\n/g),o=t[0],c=t[1]==null?i.length:t[1];o<0&&(o+=i.length),o=Math.max(0,Math.min(o-1,i.length)),c<0&&(c+=i.length),c=Math.max(0,Math.min(c,i.length)),e=i.slice(o,c).join(`
`),r.hasAttribute(`data-start`)||r.setAttribute(`data-start`,String(o+1))}f.textContent=e,n.highlightElement(f)},function(e){r.setAttribute(a,c),f.textContent=e})}}),n.plugins.fileHighlight={highlight:function(e){for(var t=(e||document).querySelectorAll(l),r=0,i;i=t[r++];)n.highlightElement(i)}};var f=!1;n.fileHighlight=function(){f||=(console.warn("Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead."),!0),n.plugins.fileHighlight.highlight.apply(this,arguments)}})()}))(),1);Sc.default.manual=!0,Sc.default.highlightAll();function Cc(e,t){return(t??document).querySelector(e)}function wc(e,t,n){return e*(1-n)+t*n}var Tc={logo:`
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
    `},Ec=class{vfx=new Ks({pixelRatio:window.devicePixelRatio,zIndex:-1});vfx2=new Ks({pixelRatio:1,zIndex:-2,scrollPadding:!1});async initBG(){let e=Cc(`#BG`),t=0;function n(e,t,n){return e*(1-n)+t*n}function r(){t=n(t,window.scrollY,.03),e.style.setProperty(`transform`,`translateY(-${t*.1}px)`),requestAnimationFrame(r)}r(),await this.vfx2.add(e,{shader:Tc.blob})}async initVFX(){await Promise.all(Array.from(document.querySelectorAll(`*[data-shader]`)).map(e=>{let t=e.getAttribute(`data-shader`),n=e.getAttribute(`data-uniforms`),r=n?JSON.parse(n):void 0;return this.vfx.add(e,{shader:t,overflow:Number.parseFloat(e.getAttribute(`data-overflow`)??`0`),uniforms:r,intersection:{threshold:Number.parseFloat(e.getAttribute(`data-threshold`)??`0`)}})}))}async initDiv(){let e=Cc(`#div`);await this.vfx.add(e,{shader:`rgbShift`,overflow:100});for(let t of e.querySelectorAll(`input,textarea`))t.addEventListener(`input`,()=>this.vfx.update(e));let t=Cc(`textarea`,e);new MutationObserver(()=>this.vfx.update(e)).observe(t,{attributes:!0})}async initCanvas(){let e=document.getElementById(`canvas`),t=e.getContext(`2d`);if(!t)throw`Failed to get the canvas context`;let{width:n,height:r}=e.getBoundingClientRect(),i=window.devicePixelRatio??1;e.width=n*i,e.height=r*i,t.scale(i,i);let a=[n/2,r/2],o=a,s=[o],c=!1,l=Date.now();e.addEventListener(`mousemove`,e=>{c=!0,a=[e.offsetX,e.offsetY]}),e.addEventListener(`mouseleave`,e=>{c=!1});let u=!1;new IntersectionObserver(e=>{for(let t of e)u=t.intersectionRatio>.1},{threshold:[0,1,.2,.8]}).observe(e);let d=()=>{if(requestAnimationFrame(d),u){if(!c){let e=Date.now()/1e3-l;a=[n*.5+Math.sin(e*1.3)*n*.3,r*.5+Math.sin(e*1.7)*r*.3]}o=[wc(o[0],a[0],.1),wc(o[1],a[1],.1)],s.push(o),s.splice(0,s.length-30),t.clearRect(0,0,n,r),t.fillStyle=`black`,t.fillRect(0,0,n,r),t.fillStyle=`white`,t.font=`bold ${n*.14}px sans-serif`,t.fillText(`HOVER ME`,n/2,r/2),t.textBaseline=`middle`,t.textAlign=`center`;for(let e=0;e<s.length;e++){let[n,r]=s[e],i=e/s.length*255;t.fillStyle=`rgba(${255-i}, 255, ${i}, ${e/s.length*.5+.5})`,t.beginPath(),t.arc(n,r,e+20,0,2*Math.PI),t.fill()}this.vfx.update(e)}};d(),await this.vfx.add(e,{shader:Tc.canvas})}async initCustomShader(){let e=Cc(`#custom`);await this.vfx.add(e,{shader:Tc.custom,uniforms:{scroll:()=>window.scrollY/window.innerHeight}})}async initEffects(){let e=Cc(`#effect-bloom`);await this.vfx.add(e,{effect:new cc({threshold:.2,intensity:5})});let t=Cc(`#effect-crt`);await this.vfx.add(t,{effect:[new vc({size:10}),new xc({spacing:5}),new cc({threshold:.01,softness:.2,intensity:10,scatter:1,pad:200})]})}async initMultipass(){let e=Cc(`#multipass`);await this.vfx.add(e,{shader:[{frag:`
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
                    `}]})}hideMask(){Cc(`#MaskTop`).style.setProperty(`height`,`0`),Cc(`#MaskBottom`).style.setProperty(`opacity`,`0`)}async showLogo(){let e=Cc(`#Logo`),t=Cc(`#LogoTagline`);return Promise.all([this.vfx.add(e,{shader:Tc.logo,overflow:[0,3e3,0,100],uniforms:{delay:0},intersection:{threshold:1}}),this.vfx.add(t,{shader:Tc.logo,overflow:[0,3e3,0,1e3],uniforms:{delay:.3},intersection:{threshold:1}})])}async showProfile(){let e=Cc(`#profile`);await this.vfx.add(e,{shader:Tc.logo,overflow:[0,3e3,0,2e3],uniforms:{delay:.5},intersection:{rootMargin:[-100,0,-100,0],threshold:1}})}};window.addEventListener(`load`,async()=>{let e=new Ec;await e.initBG(),await Promise.all([await e.initVFX(),e.initDiv(),e.initCanvas(),e.initCustomShader(),e.initMultipass(),e.initEffects()]),e.hideMask(),setTimeout(()=>{e.showLogo(),e.showProfile()},2e3)});
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
    `},s={...o,slitScanTransition:o.slitScanReveal,warpTransition:o.warpReveal,pixelateTransition:o.pixelateReveal,focusTransition:o.focusReveal};function c(e){return e.tagName===`CANVAS`&&(e.hasAttribute(`layoutsubtree`)||e.getAttribute(`content`)===`drawable`)}function l(e,t){e.setAttribute(`layoutsubtree`,``),e.setAttribute(`content`,`drawable`),t?.setAttribute(`drawable`,``)}function u(e,t,n,r){if(t.width<=0||t.height<=0)return null;let i=t.left-e.left,a=t.top-e.top;return i+t.width<=0||a+t.height<=0||i>=e.width||a>=e.height?null:[i*n,a*r,t.width*n,t.height*r]}function d(e){let t=e.getBoundingClientRect(),n=getComputedStyle(e),r=Number.parseFloat(n.paddingLeft)||0,i=Number.parseFloat(n.paddingRight)||0,a=Number.parseFloat(n.paddingTop)||0,o=Number.parseFloat(n.paddingBottom)||0,s=e.clientWidth>0?t.width/e.offsetWidth:1,c=e.clientHeight>0?t.height/e.offsetHeight:1;return{left:t.left+(e.clientLeft+r)*s,top:t.top+(e.clientTop+a)*c,width:Math.max(0,e.clientWidth-r-i)*s,height:Math.max(0,e.clientHeight-a-o)*c}}function f(e){return typeof e.checkVisibility==`function`?e.checkVisibility({visibilityProperty:!0,opacityProperty:!0}):getComputedStyle(e).visibility!==`hidden`}function p(e,t){let n=t.querySelectorAll(`canvas`);if(n.length===0)return;let r=t.getBoundingClientRect();if(r.width<=0||r.height<=0)return;let i=e.canvas.width/r.width,a=e.canvas.height/r.height;for(let t of n){if(t.width===0||t.height===0||!f(t))continue;let n=u(r,d(t),i,a);if(n)try{e.drawImage(t,...n)}catch{}}}function m(e){return e.currentSrc||e.src}function h(e,t){let n=e.getBoundingClientRect(),r=e.cloneNode(!0),i=[e,...e.querySelectorAll(`*`)],a=[r,...r.querySelectorAll(`*`)],o=[],s=[];for(let e=0;e<i.length&&e<a.length;e++){let t=i[e],n=a[e];(t.scrollTop||t.scrollLeft)&&o.push([n,t.scrollTop,t.scrollLeft]),t instanceof HTMLScriptElement?s.push([n,document.createComment(`script`)]):t instanceof HTMLCanvasElement||t instanceof HTMLVideoElement?s.push([n,ne(t)]):t instanceof HTMLIFrameElement?s.push([n,re(t)]):t instanceof HTMLInputElement&&n instanceof HTMLInputElement?(n.value=t.value,n.checked=t.checked):t instanceof HTMLTextAreaElement&&n instanceof HTMLTextAreaElement?n.value=t.value:t instanceof HTMLSelectElement&&n instanceof HTMLSelectElement?n.selectedIndex=t.selectedIndex:t instanceof HTMLMediaElement&&n.removeAttribute(`autoplay`)}for(let[e,t]of s)e.replaceWith(t);r.setAttribute(`aria-hidden`,`true`);let c=r.style;c.setProperty(`position`,`fixed`),c.setProperty(`left`,`${n.left}px`),c.setProperty(`top`,`${n.top}px`),c.setProperty(`width`,`${n.width}px`),c.setProperty(`height`,`${n.height}px`),c.setProperty(`box-sizing`,`border-box`),c.setProperty(`margin`,`0`),c.setProperty(`pointer-events`,`none`),c.setProperty(`z-index`,t.toString()),e.parentNode?.insertBefore(r,e);let l=r.getBoundingClientRect();(l.left!==n.left||l.top!==n.top)&&(c.setProperty(`left`,`${n.left*2-l.left}px`),c.setProperty(`top`,`${n.top*2-l.top}px`));for(let[e,t,n]of o)e.scrollTop=t,e.scrollLeft=n;return ee(i,a),()=>{r.remove()}}function ee(e,t){let n=e[0],r=t[0];if(!n||!r||typeof n.getAnimations!=`function`)return;let i=(e,t)=>{if(!(`animationName`in e))return null;let n=e.effect,r=n?.target,i=r?t.get(r):void 0;return i===void 0?null:`${i}|${n?.pseudoElement??``}|${e.animationName}`},a=new Map(t.map((e,t)=>[e,t])),o=new Map;for(let e of r.getAnimations({subtree:!0})){let t=i(e,a);t&&o.set(t,e)}let s=new Map(e.map((e,t)=>[e,t]));for(let e of n.getAnimations({subtree:!0})){let t=i(e,s),n=t&&o.get(t);n&&(n.currentTime=e.currentTime,n.pause())}}function te(e,t){let n=e.getBoundingClientRect(),r=getComputedStyle(e);t.className=e.className,t.style.cssText=e.style.cssText,t.style.width=`${n.width}px`,t.style.height=`${n.height}px`,t.style.display=r.display===`inline`?`inline-block`:r.display,t.style.boxSizing=`border-box`}function ne(e){let t=document.createElement(`canvas`),n=e instanceof HTMLVideoElement?e.videoWidth:e.width,r=e instanceof HTMLVideoElement?e.videoHeight:e.height;t.width=Math.max(1,n),t.height=Math.max(1,r),te(e,t);try{t.getContext(`2d`)?.drawImage(e,0,0,t.width,t.height)}catch{}return t}function re(e){let t=document.createElement(`div`);return te(e,t),t}function ie(e){let t=m(e);if(!t||t.startsWith(`data:`))return!1;try{return new URL(t,location.href).origin!==location.origin}catch{return!1}}async function g(e){let t=await(await fetch(e)).blob();return URL.createObjectURL(t)}async function _(e){let t=Array.from(e.querySelectorAll(`img`)).filter(e=>e.complete&&e.naturalWidth>0&&ie(e));if(t.length===0)return()=>{};let n=new Map,r=[];return await Promise.all(t.map(async e=>{try{let t=m(e),i=await g(t);n.set(e,t),r.push(i),await new Promise(t=>{e.addEventListener(`load`,()=>t(),{once:!0}),e.src=i})}catch{}})),()=>{for(let[e,t]of n)e.src=t;for(let e of r)URL.revokeObjectURL(e)}}var v=[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`],y=new Set([`IMG`,`VIDEO`,`CANVAS`,`IFRAME`,`EMBED`,`OBJECT`,`INPUT`,`TEXTAREA`,`SELECT`]),ae=[`position`,`top`,`right`,`bottom`,`left`,`float`,`flex`,`flex-grow`,`flex-shrink`,`flex-basis`,`align-self`,`justify-self`,`place-self`,`order`,`grid-column`,`grid-column-start`,`grid-column-end`,`grid-row`,`grid-row-start`,`grid-row-end`,`grid-area`],b=new WeakMap,oe=new WeakMap,se=new WeakMap,ce=new WeakMap,le=new WeakMap,ue=new WeakMap,de=new WeakMap,fe=new WeakMap,pe=new WeakMap,me=new WeakSet,he=new WeakMap,ge=new WeakMap,_e=new WeakSet,ve=new WeakSet,ye=300;function be(e,t){return new Promise(n=>{let r=t=>{clearTimeout(a),e.delete(i),n(t)},i=()=>r(!0),a=setTimeout(()=>r(!1),t);e.add(i)})}function xe(e){if(e)for(let t of[...e])t()}function Se(e,t,n){if(typeof e.moveBefore==`function`)try{e.moveBefore(t,n);return}catch{}e.insertBefore(t,n)}function Ce(e,t=ye){let n=ge.get(e);if(!n)return;let r=be(n,t);return e.requestPaint(),r}function we(e){if(_e.has(e))return()=>{};_e.add(e);let{width:t,height:n,overflow:r}=e.style,i=e.getBoundingClientRect();return e.style.setProperty(`width`,`${i.width}px`),e.style.setProperty(`height`,`${i.height}px`),e.style.setProperty(`overflow`,`hidden`),()=>{if(!_e.has(e))return;_e.delete(e),e.style.width=t,e.style.height=n,e.style.overflow=r;let i=e.firstElementChild;if(i&&!ve.has(e)){let t=Math.round(i.getBoundingClientRect().height);e.style.setProperty(`height`,`${t}px`)}}}function Te(e){he.get(e)?.(),he.delete(e)}function Ee(e,t=!1){requestAnimationFrame(()=>{t||e.getContext(`2d`)?.clearRect(0,0,e.width,e.height),Te(e)})}async function De(e,t){l(e,e.firstElementChild);let n=e.getContext(`2d`);if(!n)throw Error(`Failed to get 2d context from layoutsubtree canvas`);let{onCapture:r,maxSize:i}=t,a=new Set;ge.set(e,a);let o=null,s=null,c=new Promise(e=>{s=e}),u=null,d=t=>{if(t){if(t===u)return;u=t}let c=e.firstElementChild;if(!c||e.width===0||e.height===0||c.getClientRects().length===0)return;c.hasAttribute(`drawable`)||c.setAttribute(`drawable`,``),n.clearRect(0,0,e.width,e.height),n.drawElementImage(c,0,0),p(n,c);let l=e.width,d=e.height;if(i&&(l>i||d>i)){let e=Math.min(i/l,i/d);l=Math.floor(l*e),d=Math.floor(d*e)}o&&o.width===l&&o.height===d||(o=new OffscreenCanvas(l,d));let f=o.getContext(`2d`);f&&(f.clearRect(0,0,l,d),f.drawImage(e,0,0,l,d),s?(s(o),s=null,xe(a)):(n.clearRect(0,0,e.width,e.height),r(o),xe(a)))};e.onpaint=d,e.addEventListener(`paint`,d),oe.set(e,d);let f=new ResizeObserver(t=>{for(let n of t){let t=n.devicePixelContentBoxSize?.[0];if(t)e.width=t.inlineSize,e.height=t.blockSize;else{let t=n.borderBoxSize?.[0];if(t){let n=window.devicePixelRatio;e.width=Math.round(t.inlineSize*n),e.height=Math.round(t.blockSize*n)}}}e.requestPaint()});f.observe(e,{box:`device-pixel-content-box`}),b.set(e,f);let m=e.firstElementChild;if(m){let t=new ResizeObserver(t=>{if(_e.has(e)||ve.has(e))return;let n=t[0].borderBoxSize?.[0];if(!n)return;let r=`${Math.round(n.blockSize)}px`;r!==e.style.height&&e.style.setProperty(`height`,r)});t.observe(m),se.set(e,t)}return c}function Oe(e){e.onpaint=null,xe(ge.get(e)),ge.delete(e);let t=oe.get(e);t&&(e.removeEventListener(`paint`,t),oe.delete(e));let n=b.get(e);n&&(n.disconnect(),b.delete(e));let r=se.get(e);r&&(r.disconnect(),se.delete(e))}function ke(e){let t={width:null,height:null};if(typeof e.computedStyleMap!=`function`||y.has(e.tagName))return t;let n=e.computedStyleMap(),r=e=>n.get(e)?.toString()??`auto`,i=r(`position`);if(i!==`fixed`&&i!==`absolute`)return t;let a=(t,n,i)=>{let a=r(n),o=r(i);return r(t)!==`auto`||a===`auto`||o===`auto`?null:`calc(${[`100%`,a,o,...[`margin-${n}`,`margin-${i}`].map(n=>{let i=r(n);return t===`height`&&i.includes(`%`)?getComputedStyle(e).getPropertyValue(n):i}).filter(e=>e!==`auto`)].join(` - `)})`};return{width:a(`width`,`left`,`right`),height:a(`height`,`top`,`bottom`)}}function Ae(e){return y.has(e.tagName)&&typeof e.computedStyleMap==`function`&&e.computedStyleMap().get(`width`)?.toString()===`auto`}async function je(e,t){let n=e.getBoundingClientRect(),r=ke(e),i=document.createElement(`canvas`);e.hasAttribute(`drawable`)||me.add(e),l(i,e),i.className=e.className;let a=e.getAttribute(`style`);a&&i.setAttribute(`style`,a),i.style.setProperty(`padding`,`0`),i.style.setProperty(`border`,`none`),i.style.setProperty(`box-sizing`,`content-box`),i.style.setProperty(`background`,`transparent`);let o=getComputedStyle(e),s=o.display===`inline`?`block`:o.display;i.style.setProperty(`display`,s);for(let e of v)i.style.setProperty(e,o.getPropertyValue(e));for(let e of ae)i.style.setProperty(e,o.getPropertyValue(e));r.width?i.style.setProperty(`width`,r.width):e.style.width.endsWith(`px`)||Ae(e)?i.style.setProperty(`width`,`${n.width}px`):i.style.setProperty(`width`,`100%`),r.height?(i.style.setProperty(`height`,r.height),ve.add(i)):i.style.height||i.style.setProperty(`height`,`${n.height}px`);let c=window.devicePixelRatio;i.width=Math.round(n.width*c),i.height=Math.round(n.height*c),t.stillCover&&he.set(i,h(e,t.stillCover.zIndex)),ce.set(e,e.style.margin),le.set(e,e.style.width),ue.set(e,e.style.boxSizing),e.parentNode?.insertBefore(i,e),getComputedStyle(i).display,Se(i,e,null),e.style.setProperty(`margin`,`0`),e.style.setProperty(`width`,`100%`),e.style.setProperty(`box-sizing`,`border-box`),(r.width||r.height)&&(de.set(e,e.style.position),e.style.setProperty(`position`,`static`)),r.height&&(fe.set(e,e.style.height),e.style.setProperty(`height`,`100%`));let u=await _(e);return pe.set(i,u),{canvas:i,initialCapture:await De(i,t)}}function Me(e,t){Oe(e),Te(e);let n=pe.get(e);n&&(n(),pe.delete(e));let r=e.parentNode;r&&Se(r,t,e),e.remove(),me.has(t)&&(t.removeAttribute(`drawable`),me.delete(t));let i=ce.get(t);i!==void 0&&(t.style.margin=i,ce.delete(t));let a=le.get(t);a!==void 0&&(t.style.width=a,le.delete(t));let o=ue.get(t);o!==void 0&&(t.style.boxSizing=o,ue.delete(t));let s=de.get(t);s!==void 0&&(t.style.position=s,de.delete(t));let c=fe.get(t);c!==void 0&&(t.style.height=c,fe.delete(t))}var Ne;function Pe(){if(Ne!==void 0)return Ne;try{let e=document.createElement(`canvas`),t=e.getContext(`2d`);Ne=t!==null&&typeof t.drawElementImage==`function`&&typeof e.requestPaint==`function`}catch{Ne=!1}return Ne}var Fe=`#version 300 es
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
`,Ie=`
void main() {
  outColor = transition(uvContent, reverse > 0.5 ? 1.0 - t : t);
}
`;function Le(e){return`${Fe}\n${e}\n${Ie}`}var Re=Fe.split(`
`).length;function ze(e){let t=e instanceof Error?e.message:String(e);if(!/compile failed|link failed/i.test(t))return null;let n=[];for(let e of t.matchAll(/ERROR:\s*\d+:(\d+):\s*(.*)/g)){let t=Number(e[1])-Re;n.push(t>=1?`line ${t}: ${e[2]}`:e[2])}return n.length>0?n:[t.split(`
`)[0]]}var Be=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Ve=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},He,Ue=new Map;function We(e){let t=Ue.get(e);return t===void 0&&(t=Le(e),Ue.set(e,t)),t}var Ge=new WeakMap;function Ke(e){let t=Ge.get(e);return t||(t=new Set,Ge.set(e,t)),t}function qe(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return n<=o&&r<=s&&n+i>=o+c&&r+a>=s+l}function Je(e,t){let n=ze(t);n?(console.error(`[VFX-JS] transition "${e}" failed to compile; cutting to the new content.\n  ${n.join(`
  `)}`),console.debug(t)):console.error(`[VFX-JS] transition "${e}" failed; cutting to the new content.`,t)}var Ye=class{constructor(e={}){He.set(this,null),this.params=e}uniforms(e){return{}}start(e){Be(this,He,e,`f`)}end(){Be(this,He,null,`f`)}outputRect(e){let t=Ve(this,He,`f`)?.overflow??this.overflow;if(t===void 0||qe(e.contentRect,e.canvasRect))return;if(t===!0)return e.canvasRect;let n=t*e.pixelRatio,[r,i,a,o]=e.contentRect;return[r-n,i-n,a+n*2,o+n*2]}render(e){if(e.holding){e.blit(e.src);return}let t=We(this.frag),n=Ke(e.gl);if(n.has(t))e.cut(),e.blit(e.src);else try{e.draw({frag:t,uniforms:{...this.uniforms(e),from:e.from,src:e.src,t:e.progress.t,reverse:+!!e.reverse,resolution:[e.dims.elementPixel[0],e.dims.elementPixel[1]],time:e.time},target:e.target})}catch(r){n.add(t),Je(this.name,r),e.cut(),e.blit(e.src)}}};He=new WeakMap;var Xe=class extends Ye{constructor(){super(...arguments),this.name=`crossfade`,this.frag=`
vec4 transition(vec2 uv, float t) {
  return mix(readFrom(uv), readTo(uv), t);
}
`}},x=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},S=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Ze,Qe,$e,et,tt,nt,rt,it,at,ot,st,ct,lt,ut,dt,ft,pt,mt=e=>e*e*(3-2*e);function ht(e,t){return typeof e==`function`?e(t):e===`linear`?t:mt(t)}var gt={t:0,x:0},_t=class{constructor(){Ze.add(this),this.enabled=!1,Qe.set(this,null),$e.set(this,[0,0]),et.set(this,[]),tt.set(this,!1),nt.set(this,null),rt.set(this,null),it.set(this,gt),at.set(this,null),ot.set(this,null)}snapshot(){return x(this,Ze,`m`,st).call(this),S(this,nt,null,`f`),this.enabled=!0,new Promise(e=>x(this,et,`f`).push(e))}start(e){return x(this,Ze,`m`,st).call(this),S(this,nt,e,`f`),S(this,ot,e.onEnd??null,`f`),S(this,rt,null,`f`),S(this,it,gt,`f`),S(this,tt,!1,`f`),this.enabled=!1,new Promise(e=>{S(this,at,e,`f`)})}cancel(){x(this,Ze,`m`,st).call(this),S(this,nt,null,`f`),S(this,tt,!1,`f`),this.enabled=!1,x(this,Ze,`m`,ct).call(this)}get frame(){let e=x(this,Qe,`f`);return!e||!x(this,tt,`f`)&&!x(this,nt,`f`)?null:{from:e,progress:x(this,it,`f`),holding:x(this,nt,`f`)===null}}cut(){x(this,nt,`f`)&&(S(this,nt,null,`f`),x(this,Ze,`m`,st).call(this))}update(e){let t=x(this,nt,`f`);if(!t)return;x(this,rt,`f`)===null&&S(this,rt,e.time,`f`);let n=(e.time-x(this,rt,`f`))/t.duration;if(n>=1){S(this,nt,null,`f`),x(this,Ze,`m`,st).call(this);return}let r=Math.max(n,0);S(this,it,{t:ht(t.ease,r),x:r},`f`)}render(e){x(this,et,`f`).length>0&&(e.blit(e.src,x(this,Ze,`m`,lt).call(this,e)),S(this,tt,!0,`f`),x(this,Ze,`m`,ct).call(this)),x(this,Qe,`f`)&&x(this,tt,`f`)?e.blit(x(this,Qe,`f`)):(this.enabled=!1,e.blit(e.src))}dispose(){S(this,Qe,null,`f`),S(this,$e,[0,0],`f`),x(this,Ze,`m`,st).call(this),x(this,Ze,`m`,ct).call(this)}};Qe=new WeakMap,$e=new WeakMap,et=new WeakMap,tt=new WeakMap,nt=new WeakMap,rt=new WeakMap,it=new WeakMap,at=new WeakMap,ot=new WeakMap,Ze=new WeakSet,st=function(){let e=x(this,ot,`f`);S(this,ot,null,`f`),e?.();let t=x(this,at,`f`);S(this,at,null,`f`),t?.()},ct=function(){let e=x(this,et,`f`);S(this,et,[],`f`);for(let t of e)t()},lt=function(e){let[t,n]=e.dims.elementPixel;return x(this,Qe,`f`)&&x(this,$e,`f`)[0]===t&&x(this,$e,`f`)[1]===n||(x(this,Qe,`f`)?.dispose(),S(this,Qe,e.createRenderTarget({size:[t,n]}),`f`),S(this,$e,[t,n],`f`)),x(this,Qe,`f`)};var vt=class{constructor(e,t){ut.add(this),dt.set(this,void 0),ft.set(this,null),this.effect=e,S(this,dt,t,`f`)}get enabled(){return x(this,ft,`f`)!==null&&typeof this.effect.render==`function`&&this.effect.enabled!==!1}start(e){S(this,ft,e,`f`),this.effect.start?.(e)}end(){x(this,ft,`f`)!==null&&(S(this,ft,null,`f`),this.effect.end?.())}init(e){return this.effect.init?.(e)}update(e){let t=x(this,dt,`f`).frame;if(!t||t.holding)return;let n=x(this,ut,`m`,pt).call(this,e);n&&this.effect.update?.(n)}render(e){let t=x(this,ut,`m`,pt).call(this,e);t&&this.effect.render?this.effect.render(t):e.blit(e.src)}outputRect(e){return x(this,ft,`f`)?this.effect.outputRect?.(e):void 0}dispose(){this.effect.dispose?.()}};dt=new WeakMap,ft=new WeakMap,ut=new WeakSet,pt=function(e){let t=x(this,dt,`f`).frame,n=x(this,ft,`f`);return!t||!n?null:{...e,from:t.from,progress:t.progress,holding:t.holding,reverse:n.reverse,run:n,cut:()=>x(this,dt,`f`).cut()}};var C=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},w=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},T,yt,E,bt,xt,St,Ct,wt,Tt,Et,Dt,Ot,kt,At,jt,Mt,Nt,Pt,Ft,It,Lt,Rt,zt,Bt,Vt,Ht,Ut,Wt,Gt,Kt,qt,Jt,Yt,Xt,Zt,Qt,$t,en=.6,tn=300,nn=1e3;function rn(e,t){let n=t.transition===void 0?e.params===void 0&&t.params===void 0?void 0:{...e.params,...t.params}:t.params;return{transition:t.transition??e.transition,params:n,reverse:t.reverse??e.reverse,duration:t.duration??e.duration,overflow:t.overflow??e.overflow,ease:t.ease??e.ease}}function an(e,t={}){let n=rn(e,t);return{transition:n.transition??Xe,params:n.params,reverse:n.reverse??!1,duration:n.duration??en,overflow:n.overflow,ease:n.ease}}var on=e=>typeof e==`function`;function sn(e,t){return Array.isArray(e)&&Array.isArray(t)?e.length===t.length&&e.every((e,n)=>e===t[n]):e===t}function cn(e,t){let n=e??{},r=t??{},i=Object.keys(n);return i.length===Object.keys(r).length&&i.every(e=>e in r&&sn(n[e],r[e]))}var ln=new WeakMap;function un(e){let t=e.getBoundingClientRect();return t.right>0&&t.bottom>0&&t.left<window.innerWidth&&t.top<window.innerHeight}function dn(e){return e.tagName===`IMG`?e.loading===`lazy`&&!un(e):e.preload===`none`}function fn(e,t,n=tn){let r=[];for(let t of e.querySelectorAll(`img, video`)){let e=t.tagName===`IMG`;!(e?t.complete:t.readyState>=2)&&!dn(t)&&r.push(new Promise(n=>{let r=()=>n();t.addEventListener(e?`load`:`loadeddata`,r,{once:!0}),t.addEventListener(`error`,r,{once:!0})}))}return t&&r.push(t),r.length===0?Promise.resolve():new Promise(e=>{let t=setTimeout(e,n),i=()=>{clearTimeout(t),e()};Promise.all(r).then(i,i)})}function pn(e,t){return new Promise((n,r)=>{let i=setTimeout(()=>n(!1),t);e.then(()=>{clearTimeout(i),n(!0)},e=>{clearTimeout(i),r(e)})})}var mn=()=>new Promise(e=>requestAnimationFrame(()=>e()));function hn(e,t){return e.length===t.length&&e.every((e,n)=>e===t[n])}var gn=class{constructor(e,t,n={},r,i=new _t){T.add(this),yt.set(this,void 0),E.set(this,void 0),bt.set(this,void 0),xt.set(this,void 0),St.set(this,void 0),Ct.set(this,void 0),wt.set(this,[]),Tt.set(this,[]),Et.set(this,!1),Dt.set(this,!1),Ot.set(this,!1),kt.set(this,0),At.set(this,null),jt.set(this,!1),Mt.set(this,!1),Nt.set(this,null),Pt.set(this,[]),Ft.set(this,null),It.set(this,null),Lt.set(this,null),C(this,Ct,r,`f`),C(this,yt,e,`f`),C(this,E,t,`f`),C(this,bt,n,`f`),C(this,xt,i,`f`),C(this,St,n.keepWrapped??!1,`f`)}get running(){return w(this,At,`f`)!==null}show(e,t={}){let n=w(this,T,`m`,Rt).call(this,e),{remove:r=!1,...i}=t;if(!this.running&&w(this,T,`m`,zt).call(this,n))return Promise.resolve();let a=w(this,bt,`f`).slideSpec?.(n),o=a?rn(a,i):i;return this.run(()=>{n.parentElement!==w(this,E,`f`)&&w(this,E,`f`).append(n);for(let e of Array.from(w(this,E,`f`).children))e!==n&&(r?e.remove():e.hidden=!0);n.hidden=!1},o)}async run(e,t={}){var n;if(w(this,jt,`f`)){await e();return}let r=C(this,kt,(n=w(this,kt,`f`),++n),`f`);C(this,At,r,`f`);try{await w(this,T,`m`,Bt).call(this,r,e,t)}finally{w(this,At,`f`)===r&&C(this,At,null,`f`),w(this,kt,`f`)===r&&(w(this,T,`m`,Jt).call(this),w(this,T,`m`,qt).call(this),w(this,T,`m`,Ut).call(this))}}cancel(){var e;let t=C(this,kt,(e=w(this,kt,`f`),++e),`f`);C(this,At,null,`f`),w(this,T,`m`,Xt).call(this),w(this,xt,`f`).cancel(),w(this,T,`m`,Jt).call(this),w(this,T,`m`,qt).call(this),w(this,T,`m`,Ut).call(this),w(this,T,`m`,Qt).call(this,t)}destroy(){w(this,jt,`f`)||(C(this,jt,!0,`f`),this.cancel(),C(this,Ft,null,`f`),w(this,Ct,`f`)?.call(this))}};yt=new WeakMap,E=new WeakMap,bt=new WeakMap,xt=new WeakMap,St=new WeakMap,Ct=new WeakMap,wt=new WeakMap,Tt=new WeakMap,Et=new WeakMap,Dt=new WeakMap,Ot=new WeakMap,kt=new WeakMap,At=new WeakMap,jt=new WeakMap,Mt=new WeakMap,Nt=new WeakMap,Pt=new WeakMap,Ft=new WeakMap,It=new WeakMap,Lt=new WeakMap,T=new WeakSet,Rt=function(e){let t=w(this,E,`f`),n=typeof e==`number`?t.children[e]:typeof e==`string`?t.querySelector(e):e;if(!n)throw TypeError(`[VFX-JS] show(): no slide for ${e}.`);if(n.parentElement!==t&&(n.isConnected||t.contains(n)))throw TypeError(`[VFX-JS] show(): the slide must be a direct child of the container.`);return n},zt=function(e){return e.parentElement!==w(this,E,`f`)||e.hidden?!1:Array.from(w(this,E,`f`).children).every(t=>t===e||t.hidden)},Bt=async function(e,t,n){let r=()=>e===w(this,kt,`f`),i=!1,a=async()=>{i||(i=!0,await t())},o=async()=>{w(this,T,`m`,Xt).call(this),w(this,xt,`f`).cancel(),await a(),r()&&(w(this,Mt,`f`)&&w(this,St,`f`)&&await w(this,yt,`f`).update(w(this,E,`f`)),w(this,T,`m`,Qt).call(this,e))},s=null;if(typeof n!=`function`){if(s=w(this,T,`m`,Vt).call(this,an(w(this,bt,`f`),n)),!r())return a();if(s===null)return o()}w(this,T,`m`,Kt).call(this);try{await w(this,T,`m`,Zt).call(this,s?.slots??null,r,!0)}catch(e){return console.error(`[VFX-JS] transition failed to wrap the element; cutting to the new content.`,e),a()}if(!r())return a();w(this,Tt,`f`).push(w(this,yt,`f`).lockSize(w(this,E,`f`))),w(this,Tt,`f`).push(w(this,yt,`f`).forceRender(w(this,E,`f`)));let c=await pn(w(this,xt,`f`).snapshot(),nn);if(!r())return a();if(!c){w(this,T,`m`,Gt).call(this),await a(),r()&&w(this,T,`m`,Qt).call(this,e);return}s&&w(this,T,`m`,Wt).call(this,e,s);let l;try{await a(),typeof n==`function`&&r()&&(l=n())}catch(t){throw r()&&(w(this,T,`m`,Xt).call(this),w(this,xt,`f`).cancel(),w(this,T,`m`,Qt).call(this,e)),t}if(!r())return;if(s===null){if(s=w(this,T,`m`,Vt).call(this,an(w(this,bt,`f`),l)),!r())return;if(s===null)return o();try{await w(this,T,`m`,Zt).call(this,s.slots,r,!1)}catch(e){return console.error(`[VFX-JS] transition failed to swap the effects; cutting to the new content.`,e),o()}if(!r())return;w(this,T,`m`,Wt).call(this,e,s)}w(this,T,`m`,Kt).call(this);try{await w(this,T,`m`,$t).call(this)}catch(e){console.error(`[VFX-JS] transition waitFor failed:`,e)}if(!r()||(!await w(this,yt,`f`).updateInTime(w(this,E,`f`))&&!w(this,Dt,`f`)&&(C(this,Dt,!0,`f`),console.warn(`[VFX-JS] transition: the new content was not captured in time; it may pop in during the run.`)),!r())||(await mn(),!r()))return;let u=await pn(w(this,xt,`f`).start({duration:s.run.duration,ease:s.ease,onEnd:()=>w(this,T,`m`,Xt).call(this,e)}),s.run.duration*1e3+nn);r()&&(u||w(this,T,`m`,Gt).call(this),w(this,T,`m`,Qt).call(this,e))},Vt=function(e){if(e.duration<=0)return null;let t=e.transition;if(!on(t)&&!w(this,T,`m`,Ht).call(this,t))return null;let n,r;try{({transition:n,slots:r}=w(this,T,`m`,Yt).call(this,t,e.params))}catch(e){return console.error(`[VFX-JS] transition "${t.name}" constructor failed; cutting to the new content.`,e),null}let i={reverse:e.reverse,duration:e.duration},a=e.overflow??n.overflow;return a!==void 0&&(i.overflow=a),{run:i,ease:e.ease??n.ease??`smoothstep`,slots:r}},Ht=function(e){let t=ln.get(e);return t&&t!==this?(w(this,Ot,`f`)||(C(this,Ot,!0,`f`),console.warn(`[VFX-JS] transition "${e.name??`unnamed`}" instance is running in another container; cutting to the new content. Pass the class to share it.`)),!1):(w(this,It,`f`)!==e&&w(this,T,`m`,Ut).call(this),ln.set(e,this),C(this,It,e,`f`),!0)},Ut=function(){let e=w(this,It,`f`);C(this,It,null,`f`),e&&ln.get(e)===this&&ln.delete(e)},Wt=function(e,{run:t,slots:n}){w(this,T,`m`,Xt).call(this),C(this,Lt,{id:e,slots:n},`f`);for(let e of n)e.start(t)},Gt=function(){w(this,Et,`f`)||(C(this,Et,!0,`f`),console.warn(`[VFX-JS] transition target did not render in time; cutting to the new content.`)),w(this,T,`m`,Xt).call(this),w(this,xt,`f`).cancel()},Kt=function(){w(this,wt,`f`).push(w(this,yt,`f`).freezeInside(w(this,E,`f`)))},qt=function(){let e=w(this,Tt,`f`);C(this,Tt,[],`f`);for(let t of e)t()},Jt=function(){let e=w(this,wt,`f`);C(this,wt,[],`f`);for(let t of e)t()},Yt=function(e,t){let n=w(this,Ft,`f`);if(n?.key.source===e&&(!on(e)||cn(n.key.params,t)))return n;let r=on(e)?new e(t):e,i=[new vt(r,w(this,xt,`f`))];return C(this,Ft,{key:{source:e,params:t},transition:r,slots:i},`f`),{transition:r,slots:i}},Xt=function(e){let t=w(this,Lt,`f`);if(t&&(e===void 0||t.id===e)){C(this,Lt,null,`f`);for(let e of t.slots)e.end()}},Zt=async function(e,t,n){if(w(this,Nt,`f`)&&await w(this,Nt,`f`),!t())return;let r=e===null?w(this,Mt,`f`)?w(this,Pt,`f`):[w(this,xt,`f`)]:[w(this,xt,`f`),...e];if(w(this,Mt,`f`)){if(!hn(r,w(this,Pt,`f`))){C(this,Pt,r,`f`);let e=w(this,yt,`f`).updateEffects(w(this,E,`f`),r).finally(()=>{C(this,Nt,null,`f`)});C(this,Nt,e,`f`),await e}n&&await w(this,yt,`f`).update(w(this,E,`f`))}else{let e=w(this,yt,`f`).addHTMLWithStill(w(this,E,`f`),{effect:r}).then(()=>{C(this,Mt,!0,`f`),C(this,Pt,r,`f`)}).finally(()=>{C(this,Nt,null,`f`)});C(this,Nt,e,`f`),await e}},Qt=function(e){if(w(this,St,`f`)&&!w(this,jt,`f`))return;let t=()=>{e===w(this,kt,`f`)&&w(this,Mt,`f`)&&(C(this,Mt,!1,`f`),C(this,Pt,[],`f`),w(this,yt,`f`).remove(w(this,E,`f`)))};w(this,Nt,`f`)?w(this,Nt,`f`).then(t,()=>{}):t()},$t=function(){let e=w(this,bt,`f`).waitFor??`media`;return e===`none`?Promise.resolve():e===`media`?fn(w(this,E,`f`),document.fonts?.ready):e(w(this,E,`f`))};function _n(e){let t=typeof window<`u`?window.devicePixelRatio:1,n;n=e.scrollPadding===void 0?[.1,.1]:e.scrollPadding===!1?[0,0]:Array.isArray(e.scrollPadding)?[e.scrollPadding[0]??.1,e.scrollPadding[1]??.1]:[e.scrollPadding,e.scrollPadding];let r;return r=e.postEffect===void 0?[]:Array.isArray(e.postEffect)?e.postEffect:[e.postEffect],{pixelRatio:e.pixelRatio??t,zIndex:e.zIndex??void 0,autoplay:e.autoplay??!0,fixedCanvas:e.scrollPadding===!1,scrollPadding:n,wrapper:e.wrapper,postEffects:r,preserveDrawingBuffer:e.preserveDrawingBuffer??!1,timeScale:e.timeScale??1}}var vn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},yn=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},bn,xn,Sn,Cn,wn,Tn,En,Dn,D=class{constructor(e,t,n){bn.add(this),this.wrapS=`clamp`,this.wrapT=`clamp`,this.minFilter=`linear`,this.magFilter=`linear`,this.needsUpdate=!0,this.source=null,xn.set(this,void 0),Sn.set(this,!1),Cn.set(this,void 0),wn.set(this,void 0),vn(this,xn,e,`f`),this.gl=e.gl;let r=n?.externalHandle;vn(this,wn,r!==void 0,`f`),r===void 0?yn(this,bn,`m`,Tn).call(this):(this.texture=r,vn(this,Sn,!0,`f`),this.needsUpdate=!1),t&&(this.source=t),vn(this,Cn,n?.autoRegister!==!1&&!yn(this,wn,`f`),`f`),yn(this,Cn,`f`)&&e.addResource(this)}restore(){yn(this,wn,`f`)||(yn(this,bn,`m`,Tn).call(this),vn(this,Sn,!1,`f`),this.needsUpdate=!0)}bind(e){let t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&=(yn(this,bn,`m`,En).call(this),!1)}dispose(){yn(this,Cn,`f`)&&yn(this,xn,`f`).removeResource(this),yn(this,wn,`f`)||this.gl.deleteTexture(this.texture)}};xn=new WeakMap,Sn=new WeakMap,Cn=new WeakMap,wn=new WeakMap,bn=new WeakSet,Tn=function(){let e=this.gl.createTexture();if(!e)throw Error(`[VFX-JS] Failed to create texture`);this.texture=e},En=function(){let e=this.gl,t=this.source;if(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4),t)try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)}catch(e){console.error(e)}else if(!yn(this,Sn,`f`)){let t=new Uint8Array([0,0,0,0]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,t)}yn(this,bn,`m`,Dn).call(this),vn(this,Sn,!0,`f`)},Dn=function(){let e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,On(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,On(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,kn(e,this.minFilter)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,kn(e,this.magFilter))};function On(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function kn(e,t){return t===`nearest`?e.NEAREST:e.LINEAR}function An(e){return new Promise((t,n)=>{let r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>t(r),r.onerror=n,r.src=e})}var jn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Mn=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Nn,Pn,Fn,In=class{constructor(e,t,n,r={}){Nn.add(this),Pn.set(this,void 0),jn(this,Pn,e,`f`),this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(n)),this.float=r.float??!1,this.mipmap=r.mipmap??!1,this.texture=new D(e,void 0,{autoRegister:!1});let i=r.wrap;i!==void 0&&(typeof i==`string`?(this.texture.wrapS=i,this.texture.wrapT=i):(this.texture.wrapS=i[0],this.texture.wrapT=i[1])),r.filter!==void 0&&(this.texture.minFilter=r.filter,this.texture.magFilter=r.filter),Mn(this,Nn,`m`,Fn).call(this),e.addResource(this)}setSize(e,t){let n=Math.max(1,Math.floor(e)),r=Math.max(1,Math.floor(t));(n!==this.width||r!==this.height)&&(this.width=n,this.height=r,Mn(this,Nn,`m`,Fn).call(this))}restore(){this.texture.restore(),Mn(this,Nn,`m`,Fn).call(this)}dispose(){Mn(this,Pn,`f`).removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.texture.dispose()}generateMipmaps(){if(!this.mipmap)return;let e=this.gl;e.bindTexture(e.TEXTURE_2D,this.texture.texture),e.generateMipmap(e.TEXTURE_2D),e.bindTexture(e.TEXTURE_2D,null)}};Pn=new WeakMap,Nn=new WeakSet,Fn=function(){let e=this.gl,t=this.fbo,n=e.createFramebuffer();if(!n)throw Error(`[VFX-JS] Failed to create framebuffer`);this.fbo=n;let r=this.texture.texture;e.bindTexture(e.TEXTURE_2D,r);let i=Mn(this,Pn,`f`).floatLinearFilter;if(this.float&&i&&!Mn(this,Pn,`f`).floatBlend)throw Error(`[VFX-JS] EXT_float_blend is not supported.`);let a=this.float?i?e.RGBA32F:e.RGBA16F:e.RGBA8,o=this.float?i?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;if(this.mipmap){let t=Math.floor(Math.log2(Math.max(this.width,this.height)))+1,n=this.width,r=this.height;for(let i=0;i<t;i++)e.texImage2D(e.TEXTURE_2D,i,a,n,r,0,e.RGBA,o,null),n=Math.max(1,n>>1),r=Math.max(1,r>>1)}else e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,e.RGBA,o,null);let s=this.texture.minFilter===`nearest`?e.NEAREST:e.LINEAR,c=this.texture.magFilter===`nearest`?e.NEAREST:e.LINEAR,l=this.mipmap?this.texture.minFilter===`nearest`?e.NEAREST_MIPMAP_NEAREST:e.LINEAR_MIPMAP_LINEAR:s,u=Ln(e,this.texture.wrapS),d=Ln(e,this.texture.wrapT);e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,l),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,c),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,u),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,d),e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.texture.needsUpdate=!1,this.texture.source=null,t&&e.deleteFramebuffer(t)};function Ln(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function Rn(e,t,n,r){return{x:e.left+n,y:t-r-e.bottom,w:e.right-e.left,h:e.bottom-e.top}}function zn(e,t,n,r){return{x:e,y:t,w:n,h:r}}var Bn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Vn=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Hn,Un,Wn,Gn,Kn=class{constructor(e,t,n,r,i,a={}){Hn.set(this,void 0),Un.set(this,void 0),Wn.set(this,void 0),Gn.set(this,void 0),Bn(this,Hn,t,`f`),Bn(this,Un,n,`f`),Bn(this,Wn,r,`f`);let o=t*r,s=n*r,c={float:i,wrap:a.wrap,filter:a.filter,mipmap:a.mipmap};Bn(this,Gn,[new In(e,o,s,c),new In(e,o,s,c)],`f`)}get texture(){return Vn(this,Gn,`f`)[0].texture}get target(){return Vn(this,Gn,`f`)[1]}resize(e,t){if(e===Vn(this,Hn,`f`)&&t===Vn(this,Un,`f`))return;Bn(this,Hn,e,`f`),Bn(this,Un,t,`f`);let n=e*Vn(this,Wn,`f`),r=t*Vn(this,Wn,`f`);Vn(this,Gn,`f`)[0].setSize(n,r),Vn(this,Gn,`f`)[1].setSize(n,r)}swap(){Bn(this,Gn,[Vn(this,Gn,`f`)[1],Vn(this,Gn,`f`)[0]],`f`)}getViewport(){return zn(0,0,Vn(this,Hn,`f`),Vn(this,Un,`f`))}dispose(){Vn(this,Gn,`f`)[0].dispose(),Vn(this,Gn,`f`)[1].dispose()}};Hn=new WeakMap,Un=new WeakMap,Wn=new WeakMap,Gn=new WeakMap;var qn=class{constructor(e=0,t=0){this.x=0,this.y=0,this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}},Jn=class{constructor(e=0,t=0,n=0,r=0){this.x=0,this.y=0,this.z=0,this.w=0,this.x=e,this.y=t,this.z=n,this.w=r}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}},Yn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Xn=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Zn,Qn,$n,er,tr,nr,rr;function ir(e){return/#version\s+300\s+es\b/.test(e)?`300 es`:/#version\s+100\b/.test(e)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(e)?`100`:`300 es`}var ar=class{constructor(e,t,n,r){Zn.add(this),Qn.set(this,void 0),$n.set(this,void 0),er.set(this,void 0),tr.set(this,void 0),nr.set(this,new Map),Yn(this,Qn,e,`f`),this.gl=e.gl,Yn(this,$n,t,`f`),Yn(this,er,n,`f`),Yn(this,tr,r??ir(n),`f`),Xn(this,Zn,`m`,rr).call(this),e.addResource(this)}restore(){Xn(this,Zn,`m`,rr).call(this)}use(){this.gl.useProgram(this.program)}hasUniform(e){return Xn(this,nr,`f`).has(e)}uploadUniforms(e){let t=this.gl,n=0;for(let[r,i]of Xn(this,nr,`f`)){let a=e[r];if(!a)continue;let o=a.value;o!=null&&(cr(i.type)?o instanceof D&&(o.bind(n),t.uniform1i(i.location,n),n++):o instanceof D||ur(t,i,o))}}dispose(){Xn(this,Qn,`f`).removeResource(this),this.gl.deleteProgram(this.program)}};Qn=new WeakMap,$n=new WeakMap,er=new WeakMap,tr=new WeakMap,nr=new WeakMap,Zn=new WeakSet,rr=function(){let e=this.gl,t=or(e,e.VERTEX_SHADER,sr(Xn(this,$n,`f`),Xn(this,tr,`f`))),n=or(e,e.FRAGMENT_SHADER,sr(Xn(this,er,`f`),Xn(this,tr,`f`))),r=e.createProgram();if(!r)throw Error(`[VFX-JS] Failed to create program`);if(e.attachShader(r,t),e.attachShader(r,n),e.bindAttribLocation(r,0,`position`),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let i=e.getProgramInfoLog(r)??``;throw e.deleteShader(t),e.deleteShader(n),e.deleteProgram(r),Error(`[VFX-JS] Program link failed: ${i}`)}e.detachShader(r,t),e.detachShader(r,n),e.deleteShader(t),e.deleteShader(n),this.program=r,Xn(this,nr,`f`).clear();let i=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<i;t++){let n=e.getActiveUniform(r,t);if(!n)continue;let i=n.name.replace(/\[0\]$/,``),a=e.getUniformLocation(r,n.name);a&&Xn(this,nr,`f`).set(i,{location:a,type:n.type,size:n.size})}};function or(e,t,n){let r=e.createShader(t);if(!r)throw Error(`[VFX-JS] Failed to create shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)??``;throw e.deleteShader(r),Error(`[VFX-JS] Shader compile failed: ${t}\n\n${n}`)}return r}function sr(e,t){return e.replace(/^\s+/,``).startsWith(`#version`)||t===`100`?e:`#version 300 es\n${e}`}function cr(e){return e===35678||e===36298||e===36306||e===35682}var lr=new Set;function ur(e,t,n){let r=t.location,i=t.size>1,a=n,o=n,s=n;switch(t.type){case e.FLOAT:i?e.uniform1fv(r,a):e.uniform1f(r,n);return;case e.FLOAT_VEC2:if(i)e.uniform2fv(r,a);else if(n instanceof qn)e.uniform2f(r,n.x,n.y);else{let t=n;e.uniform2f(r,t[0],t[1])}return;case e.FLOAT_VEC3:if(i)e.uniform3fv(r,a);else{let t=n;e.uniform3f(r,t[0],t[1],t[2])}return;case e.FLOAT_VEC4:if(i)e.uniform4fv(r,a);else if(n instanceof Jn)e.uniform4f(r,n.x,n.y,n.z,n.w);else{let t=n;e.uniform4f(r,t[0],t[1],t[2],t[3])}return;case e.INT:i?e.uniform1iv(r,o):e.uniform1i(r,n);return;case e.INT_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,t[0],t[1])}return;case e.INT_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,t[0],t[1],t[2])}return;case e.INT_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,t[0],t[1],t[2],t[3])}return;case e.BOOL:i?e.uniform1iv(r,o):e.uniform1i(r,+!!n);return;case e.BOOL_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,+!!t[0],+!!t[1])}return;case e.BOOL_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,+!!t[0],+!!t[1],+!!t[2])}return;case e.BOOL_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,+!!t[0],+!!t[1],+!!t[2],+!!t[3])}return;case e.FLOAT_MAT2:e.uniformMatrix2fv(r,!1,a);return;case e.FLOAT_MAT3:e.uniformMatrix3fv(r,!1,a);return;case e.FLOAT_MAT4:e.uniformMatrix4fv(r,!1,a);return;case e.UNSIGNED_INT:i?e.uniform1uiv(r,s):e.uniform1ui(r,n);return;case e.UNSIGNED_INT_VEC2:if(i)e.uniform2uiv(r,s);else{let t=n;e.uniform2ui(r,t[0],t[1])}return;case e.UNSIGNED_INT_VEC3:if(i)e.uniform3uiv(r,s);else{let t=n;e.uniform3ui(r,t[0],t[1],t[2])}return;case e.UNSIGNED_INT_VEC4:if(i)e.uniform4uiv(r,s);else{let t=n;e.uniform4ui(r,t[0],t[1],t[2],t[3])}return;default:lr.has(t.type)||(lr.add(t.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${t.type.toString(16)}; skipping upload.`));return}}var dr=class{constructor(e,t,n,r,i,a){this.gl=e.gl,this.program=new ar(e,t,n,a),this.uniforms=r,this.blend=i}dispose(){this.program.dispose()}};function fr(e,t,n,r,i,a,o,s){let c=r?r.width/s:a,l=r?r.height/s:o,u=Math.max(0,i.x),d=Math.max(0,i.y),f=Math.min(c,i.x+i.w),p=Math.min(l,i.y+i.h),m=f-u,h=p-d;m<=0||h<=0||(e.bindFramebuffer(e.FRAMEBUFFER,r?r.fbo:null),e.viewport(Math.round(u*s),Math.round(d*s),Math.round(m*s),Math.round(h*s)),pr(e,n.blend),n.program.use(),n.program.uploadUniforms(n.uniforms),t.draw())}function pr(e,t){t===`none`?e.disable(e.BLEND):(e.enable(e.BLEND),e.blendEquation(e.FUNC_ADD),t===`premultiplied`?e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA):t===`additive`?e.blendFuncSeparate(e.ONE,e.ONE,e.ONE,e.ONE):e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA))}var mr=class{constructor(e){this.uniforms={src:{value:null},offset:{value:new qn},resolution:{value:new qn},viewport:{value:new Jn}},this.pass=new dr(e,n,r,this.uniforms,`premultiplied`)}setUniforms(e,t,n){this.uniforms.src.value=e,this.uniforms.resolution.value.set(n.w*t,n.h*t),this.uniforms.offset.value.set(n.x*t,n.y*t)}dispose(){this.pass.dispose()}},hr=e=>{let t=document.implementation.createHTMLDocument(`test`),n=t.createRange();n.selectNodeContents(t.documentElement),n.deleteContents();let r=document.createElement(`head`);return t.documentElement.appendChild(r),t.documentElement.appendChild(n.createContextualFragment(e)),t.documentElement.setAttribute(`xmlns`,t.documentElement.namespaceURI),new XMLSerializer().serializeToString(t).replace(/<!DOCTYPE html>/,``)};async function gr(e,t,n,r){let i=e.getBoundingClientRect(),a=window.devicePixelRatio,o=Math.ceil(i.width),s=Math.ceil(i.height),c=o*a,l=s*a,u=1,d=c,f=l;r&&(d>r||f>r)&&(u=Math.min(r/d,r/f),d=Math.floor(d*u),f=Math.floor(f*u));let p=n&&n.width===d&&n.height===f?n:new OffscreenCanvas(d,f),m=e.cloneNode(!0);await _r(e,m),vr(e,m),m.style.setProperty(`opacity`,t.toString()),m.style.setProperty(`margin`,`0px`),yr(m),br(e,m),m.style.setProperty(`box-sizing`,`border-box`),m.style.setProperty(`width`,`${o}px`),m.style.setProperty(`height`,`${s}px`);let h=m.outerHTML,ee=`<svg xmlns="http://www.w3.org/2000/svg" width="${c}" height="${l}"><foreignObject width="100%" height="100%">${hr(h)}</foreignObject></svg>`;return new Promise((e,t)=>{let n=new Image;n.onload=()=>{let r=p.getContext(`2d`);if(r===null)return t();r.clearRect(0,0,d,f);let i=a*u;r.scale(i,i),r.drawImage(n,0,0,c,l),r.setTransform(1,0,0,1,0,0),e(p)},n.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(ee)}`})}async function _r(e,t){let n=window.getComputedStyle(e);for(let e of Array.from(n))/(-inline-|-block-|^inline-|^block-)/.test(e)||/^-webkit-.*(start|end|before|after|logical)/.test(e)||t.style.setProperty(e,n.getPropertyValue(e),n.getPropertyPriority(e));if(t.tagName===`INPUT`)t.setAttribute(`value`,t.value);else if(t.tagName===`TEXTAREA`)t.innerHTML=t.value;else if(t.tagName===`IMG`)try{t.src=await Cr(m(e))}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];await _r(r,i)}}function vr(e,t){if(typeof e.computedStyleMap==`function`)try{let n=e.computedStyleMap();for(let e of[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`]){let r=n.get(e);r instanceof CSSKeywordValue&&r.value===`auto`&&t.style.setProperty(e,`auto`)}}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];r instanceof HTMLElement&&i instanceof HTMLElement&&vr(r,i)}}function yr(e){let t=e;for(;;){let e=t.style;if(Number.parseFloat(e.paddingTop)>0||Number.parseFloat(e.borderTopWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.firstElementChild;if(!n)break;n.style.setProperty(`margin-top`,`0px`),t=n}for(t=e;;){let e=t.style;if(Number.parseFloat(e.paddingBottom)>0||Number.parseFloat(e.borderBottomWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.lastElementChild;if(!n)break;n.style.setProperty(`margin-bottom`,`0px`),t=n}}function br(e,t){let n=-e.scrollLeft,r=-e.scrollTop;for(let i=0;i<e.children.length;i++){let a=e.children[i],o=t.children[i];a&&(o instanceof HTMLElement||o instanceof SVGElement)&&((n!==0||r!==0)&&xr(o,n,r),br(a,o))}}function xr(e,t,n){let r=e.style.getPropertyValue(`translate`),[i=`0px`,a=`0px`,o]=r&&r!==`none`?Sr(r):[],s=`calc(${i} + ${t}px) calc(${a} + ${n}px)`;e.style.setProperty(`translate`,o?`${s} ${o}`:s)}function Sr(e){let t=[],n=0,r=``;for(let i of e.trim())i===`(`?n++:i===`)`&&n--,i===` `&&n===0?(r&&t.push(r),r=``):r+=i;return r&&t.push(r),t}async function Cr(e){let t=await fetch(e).then(e=>e.blob());return new Promise(e=>{let n=new FileReader;n.onload=function(){e(this.result)},n.readAsDataURL(t)})}var wr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},O=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Tr,Er,Dr,Or,kr,Ar,jr,Mr,Nr,Pr,Fr,Ir,Lr=Object.freeze({__brand:`EffectQuad`});function Rr(e){return e===Lr}function zr(e,t){switch(t){case`lines`:return e.LINES;case`lineStrip`:return e.LINE_STRIP;case`points`:return e.POINTS;default:return e.TRIANGLES}}function Br(e,t){if(t instanceof Float32Array)return e.FLOAT;if(t instanceof Uint8Array)return e.UNSIGNED_BYTE;if(t instanceof Uint16Array)return e.UNSIGNED_SHORT;if(t instanceof Uint32Array)return e.UNSIGNED_INT;if(t instanceof Int8Array)return e.BYTE;if(t instanceof Int16Array)return e.SHORT;if(t instanceof Int32Array)return e.INT;throw Error(`[VFX-JS] Unsupported attribute typed array`)}function Vr(e,t){if(ArrayBuffer.isView(t)&&!(t instanceof DataView))return{name:e,data:t,itemSize:2,normalized:!1,perInstance:!1};let n=t;return{name:e,data:n.data,itemSize:n.itemSize,normalized:n.normalized??!1,perInstance:n.perInstance??!1}}var Hr=class{constructor(e,t,n){Tr.add(this),Er.set(this,void 0),Dr.set(this,void 0),Or.set(this,void 0),kr.set(this,[]),Ar.set(this,null),this.indexType=0,this.hasIndices=!1,this.drawCount=0,this.drawStart=0,jr.set(this,!1),wr(this,Er,e,`f`),this.gl=e.gl,wr(this,Dr,t,`f`),wr(this,Or,n,`f`),this.mode=zr(this.gl,t.mode),this.instanceCount=t.instanceCount??0,O(this,Tr,`m`,Mr).call(this),e.addResource(this),wr(this,jr,!0,`f`)}restore(){wr(this,kr,[],`f`),wr(this,Ar,null,`f`),O(this,Tr,`m`,Mr).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),this.hasIndices?this.instanceCount>0?e.drawElementsInstanced(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2),this.instanceCount):e.drawElements(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2)):this.instanceCount>0?e.drawArraysInstanced(this.mode,this.drawStart,this.drawCount,this.instanceCount):e.drawArrays(this.mode,this.drawStart,this.drawCount)}dispose(){O(this,jr,`f`)&&(O(this,Er,`f`).removeResource(this),wr(this,jr,!1,`f`));let e=this.gl;e.deleteVertexArray(this.vao);for(let t of O(this,kr,`f`))e.deleteBuffer(t);O(this,Ar,`f`)&&e.deleteBuffer(O(this,Ar,`f`)),wr(this,kr,[],`f`),wr(this,Ar,null,`f`)}};Er=new WeakMap,Dr=new WeakMap,Or=new WeakMap,kr=new WeakMap,Ar=new WeakMap,jr=new WeakMap,Tr=new WeakSet,Mr=function(){let e=this.gl,t=e.createVertexArray();if(!t)throw Error(`[VFX-JS] Failed to create VAO`);this.vao=t,e.bindVertexArray(t);let n=O(this,Or,`f`).program,r=null;for(let[t,i]of Object.entries(O(this,Dr,`f`).attributes)){let a=Vr(t,i),o=e.getAttribLocation(n,a.name);if(o<0)continue;let s=e.createBuffer();if(!s)throw Error(`[VFX-JS] Failed to create VBO for "${a.name}"`);O(this,kr,`f`).push(s),e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,a.data,e.STATIC_DRAW);let c=Br(e,a.data);e.enableVertexAttribArray(o),c===e.FLOAT||c===e.HALF_FLOAT||a.normalized?e.vertexAttribPointer(o,a.itemSize,c,a.normalized,0,0):e.vertexAttribIPointer(o,a.itemSize,c,0,0),a.perInstance&&e.vertexAttribDivisor(o,1),t===`position`&&r===null&&(r=a.data.length/a.itemSize)}let i=0,a=O(this,Dr,`f`).indices;if(a){let t=e.createBuffer();if(!t)throw Error(`[VFX-JS] Failed to create IBO`);wr(this,Ar,t,`f`),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t),e.bufferData(e.ELEMENT_ARRAY_BUFFER,a,e.STATIC_DRAW),this.hasIndices=!0,this.indexType=a instanceof Uint32Array?e.UNSIGNED_INT:e.UNSIGNED_SHORT,i=a.length}else this.hasIndices=!1;e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null),O(this,Ar,`f`)&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null);let o=this.hasIndices?i:r??0,s=O(this,Dr,`f`).drawRange;this.drawStart=s?.start??0,this.drawCount=s?.count===void 0?Math.max(0,o-this.drawStart):s.count};var Ur=class{constructor(e,t){Nr.set(this,void 0),Pr.set(this,void 0),Fr.set(this,new WeakMap),Ir.set(this,new Set),wr(this,Nr,e,`f`),wr(this,Pr,t,`f`)}get quad(){return O(this,Pr,`f`)}resolve(e,t){let n=O(this,Fr,`f`).get(e);n||(n=new Map,O(this,Fr,`f`).set(e,n));let r=n.get(t);return r||(r=new Hr(O(this,Nr,`f`),e,t),n.set(t,r),O(this,Ir,`f`).add(r)),r}release(e){let t=O(this,Fr,`f`).get(e);if(t){for(let e of t.values())e.dispose(),O(this,Ir,`f`).delete(e);O(this,Fr,`f`).delete(e)}}dispose(){for(let e of O(this,Ir,`f`))e.dispose();O(this,Ir,`f`).clear()}};Nr=new WeakMap,Pr=new WeakMap,Fr=new WeakMap,Ir=new WeakMap;var k=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},A=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Wr,Gr,Kr,qr,Jr,Yr,Xr,Zr,Qr,$r,ei,ti,j,M,ni,ri,ii,ai,oi,si,ci,li,ui,di=Symbol.for(`@vfx-js/effect.resolve-texture`),fi=Symbol.for(`@vfx-js/effect.resolve-rt`);function pi(e){return e[di]()}function mi(e){return e[fi]}var hi=`#version 300 es
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
`,gi=`
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
`,_i=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`,vi=`
precision highp float;
varying vec2 uv;
uniform sampler2D src;
void main() {
    gl_FragColor = texture2D(src, uv);
}
`,yi=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    bool inside = all(greaterThanEqual(uvSrc, vec2(0.0))) && all(lessThanEqual(uvSrc, vec2(1.0)));
    outColor = inside ? texture(src, uvSrc) : vec4(0.0);
}
`,bi=`
precision highp float;
varying vec2 uvSrc;
uniform sampler2D src;
void main() {
    bool inside = all(greaterThanEqual(uvSrc, vec2(0.0))) && all(lessThanEqual(uvSrc, vec2(1.0)));
    gl_FragColor = inside ? texture2D(src, uvSrc) : vec4(0.0);
}
`,xi=class{constructor(e,t,n,r,i,a){Wr.add(this),Gr.set(this,void 0),Kr.set(this,void 0),qr.set(this,void 0),Jr.set(this,void 0),Yr.set(this,void 0),Xr.set(this,[]),Zr.set(this,[]),Qr.set(this,[]),$r.set(this,[]),ei.set(this,`init`),ti.set(this,!1),j.set(this,void 0),M.set(this,void 0),ai.set(this,[]),k(this,Gr,e,`f`),k(this,Kr,e.gl,`f`),k(this,qr,n,`f`),k(this,Jr,a,`f`),k(this,Yr,new Ur(e,t),`f`),k(this,j,{outputBufferW:1,outputBufferH:1,canvasBufferSize:[1,1],outputViewport:{x:0,y:0,w:1,h:1},elementBufferW:1,elementBufferH:1,contentRectUv:[0,0,1,1],srcRectUv:[0,0,1,1]},`f`);let o={time:0,deltaTime:0,pixelRatio:n,resolution:[1,1],mouse:[0,0],mouseViewport:[0,0],intersection:0,enterTime:0,leaveTime:0,enterProgress:0,leaveProgress:0,src:r,target:null,uniforms:{},vfxProps:i,dims:{element:[1,1],elementPixel:[1,1],canvas:[1,1],canvasPixel:[1,1],pixelRatio:n,contentRect:[0,0,1,1],srcRect:[0,0,1,1],canvasRect:[0,0,1,1]},quad:Lr,gl:A(this,Kr,`f`),createRenderTarget:e=>A(this,Wr,`m`,ni).call(this,e),releaseGeometry:e=>A(this,Yr,`f`).release(e),wrapTexture:(e,t)=>A(this,Wr,`m`,ii).call(this,e,t),draw:e=>A(this,Wr,`m`,oi).call(this,e),blit:(e,t,n)=>A(this,Wr,`m`,si).call(this,e,t,n),clear:e=>A(this,Wr,`m`,ci).call(this,e),onContextRestored:e=>{let t=A(this,Gr,`f`).onContextRestored(e);return A(this,$r,`f`).push(t),t}};k(this,M,o,`f`)}get ctx(){return A(this,M,`f`)}setPhase(e){k(this,ei,e,`f`)}setFrameDims(e){k(this,j,e,`f`),A(this,M,`f`).resolution=[e.canvasBufferSize[0],e.canvasBufferSize[1]];for(let t of A(this,Qr,`f`))t.resolver.resize?.(e.outputBufferW,e.outputBufferH)}setEffectDims(e){A(this,M,`f`).dims=e}setFrameState(e){let t=A(this,M,`f`);t.time=e.time,t.deltaTime=e.deltaTime,t.mouse=e.mouse,t.mouseViewport=e.mouseViewport,t.intersection=e.intersection,t.enterTime=e.enterTime,t.leaveTime=e.leaveTime,t.enterProgress=e.enterProgress,t.leaveProgress=e.leaveProgress,t.uniforms=e.uniforms}setSrc(e){A(this,M,`f`).src=e}setOutput(e){A(this,M,`f`).target=e}passthroughCopy(e,t,n){let r=A(this,ei,`f`);k(this,ei,`render`,`f`);let i=A(this,M,`f`).target;A(this,M,`f`).target=t;try{let r=A(this,j,`f`).outputViewport;A(this,j,`f`).outputViewport={...n};let i=A(this,M,`f`).vfxProps.glslVersion===`100`?vi:_i;A(this,Wr,`m`,li).call(this,{frag:i,uniforms:{src:e},target:t}),A(this,j,`f`).outputViewport=r}finally{A(this,M,`f`).target=i,k(this,ei,r,`f`)}}clearRt(e){let t=A(this,Kr,`f`),n=mi(e);t.bindFramebuffer(t.FRAMEBUFFER,n.getWriteFbo().fbo),t.viewport(0,0,e.width,e.height),t.clearColor(0,0,0,0),t.disable(t.SCISSOR_TEST),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)}tickAutoUpdates(){for(let e of A(this,ai,`f`))e()}dispose(){k(this,ei,`disposed`,`f`);for(let e of A(this,$r,`f`))e();k(this,$r,[],`f`);for(let e of A(this,Zr,`f`))e.resolver.dispose?.();k(this,Zr,[],`f`),k(this,Qr,[],`f`);for(let e of A(this,Xr,`f`))e.dispose();k(this,Xr,[],`f`),A(this,Yr,`f`).dispose(),k(this,ai,[],`f`)}};Gr=new WeakMap,Kr=new WeakMap,qr=new WeakMap,Jr=new WeakMap,Yr=new WeakMap,Xr=new WeakMap,Zr=new WeakMap,Qr=new WeakMap,$r=new WeakMap,ei=new WeakMap,ti=new WeakMap,j=new WeakMap,M=new WeakMap,ai=new WeakMap,Wr=new WeakSet,ni=function(e){let t=e?.persistent??!1,n=e?.float??!1,r=Ci(e?.wrap),i=e?.filter,a=e?.mipmap??!1,o=a!==!1,s=a===!0,c=e?.size,l=c?c[0]:A(this,j,`f`).outputBufferW,u=c?c[1]:A(this,j,`f`).outputBufferH,d,f,p;if(t){let e=c?1:A(this,qr,`f`),t=c?l:l/e,a=c?u:u/e,m=new Kn(A(this,Gr,`f`),t,a,e,n,{wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>m.texture,getWriteFbo:()=>m.target,swap:()=>m.swap(),resize:c?void 0:(e,t)=>{m.resize(e/A(this,qr,`f`),t/A(this,qr,`f`))},dispose:()=>m.dispose()},o&&(d.regenerateMipmaps=()=>m.target.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>m.target.width,p=()=>m.target.height}else{let e=new In(A(this,Gr,`f`),l,u,{float:n,wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>e.texture,getWriteFbo:()=>e,resize:c?void 0:(t,n)=>e.setSize(t,n),dispose:()=>e.dispose()},o&&(d.regenerateMipmaps=()=>e.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>e.width,p=()=>e.height}let m,h=Ei(d,f,p,()=>A(this,Wr,`m`,ri).call(this,m));return m={handle:h,resolver:d},A(this,Zr,`f`).push(m),c||A(this,Qr,`f`).push(m),h},ri=function(e){let t=A(this,Zr,`f`).indexOf(e);if(t<0)return;A(this,Zr,`f`).splice(t,1);let n=A(this,Qr,`f`).indexOf(e);n>=0&&A(this,Qr,`f`).splice(n,1),e.resolver.dispose?.()},ii=function(e,t){let n=Ci(t?.wrap),r=t?.filter,i,a,o,s=null,c=Si(e);if(c){if(!t?.size)throw Error(`[VFX-JS] wrapTexture(WebGLTexture) requires opts.size`);let[n,r]=t.size;i=new D(A(this,Gr,`f`),void 0,{autoRegister:!1,externalHandle:e}),a=()=>n,o=()=>r}else{let n=e;i=new D(A(this,Gr,`f`),n);let r=t?.size,c=e=>{if(r)return e===`w`?r[0]:r[1];if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return e===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return e===`w`?n.videoWidth:n.videoHeight;let t=n;return e===`w`?t.width:t.height};a=()=>c(`w`),o=()=>c(`h`);let l=typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement||typeof HTMLCanvasElement<`u`&&n instanceof HTMLCanvasElement||typeof OffscreenCanvas<`u`&&n instanceof OffscreenCanvas;(t?.autoUpdate??l)&&(s=()=>{i.needsUpdate=!0})}i.wrapS=n[0],i.wrapT=n[1],r!==void 0&&(i.minFilter=r,i.magFilter=r),A(this,Xr,`f`).push(i),s&&A(this,ai,`f`).push(s);let l=!1;return Ti(()=>i,a,o,()=>{if(l)return;l=!0;let e=A(this,Xr,`f`).indexOf(i);if(e!==-1&&A(this,Xr,`f`).splice(e,1),s){let e=A(this,ai,`f`).indexOf(s);e!==-1&&A(this,ai,`f`).splice(e,1)}i.dispose()},c?void 0:()=>{l||(i.needsUpdate=!0)})},oi=function(e){A(this,ei,`f`)===`render`?A(this,Wr,`m`,li).call(this,e):A(this,ei,`f`)===`update`&&!A(this,ti,`f`)&&(k(this,ti,!0,`f`),console.warn(`[VFX-JS] ctx.draw() called in update(); ignored. Move draws to render().`))},si=function(e,t,n){if(A(this,ei,`f`)!==`render`){A(this,ei,`f`)===`update`&&!A(this,ti,`f`)&&(k(this,ti,!0,`f`),console.warn(`[VFX-JS] ctx.blit() called in update(); ignored. Move draws to render().`));return}let r=A(this,M,`f`).vfxProps.glslVersion===`100`?bi:yi;A(this,Wr,`m`,li).call(this,{frag:r,uniforms:{src:e},target:t,blend:n?.blend,swap:n?.swap})},ci=function(e){if(A(this,ei,`f`)!==`render`){A(this,ei,`f`)===`update`&&!A(this,ti,`f`)&&(k(this,ti,!0,`f`),console.warn(`[VFX-JS] ctx.clear() called in update(); ignored. Move draws to render().`));return}let t=A(this,Kr,`f`),n=A(this,M,`f`).target,r=e??n,i=r===null||r===n;if(t.clearColor(0,0,0,0),i){let e=r===null?null:mi(r).getWriteFbo().fbo,n=A(this,j,`f`).outputViewport;t.bindFramebuffer(t.FRAMEBUFFER,e),t.enable(t.SCISSOR_TEST),t.scissor(n.x,n.y,n.w,n.h),t.clear(t.COLOR_BUFFER_BIT),t.disable(t.SCISSOR_TEST),t.bindFramebuffer(t.FRAMEBUFFER,null);return}let a=mi(r);t.disable(t.SCISSOR_TEST);let o=()=>{t.bindFramebuffer(t.FRAMEBUFFER,a.getWriteFbo().fbo),t.clear(t.COLOR_BUFFER_BIT)};o(),a.swap&&(a.swap(),o(),a.swap()),t.bindFramebuffer(t.FRAMEBUFFER,null)},li=function(e){let t=A(this,Kr,`f`),n=e.vert??(A(this,M,`f`).vfxProps.glslVersion===`100`?gi:hi),r=A(this,Jr,`f`).get(n,e.frag,A(this,M,`f`).vfxProps.glslVersion),i=A(this,M,`f`).target,a=e.target===void 0||e.target===null?i:e.target,o=a===null||a===i,s,c,l,u,d,f,p;if(a===null)s=null,c=A(this,j,`f`).outputViewport.x,l=A(this,j,`f`).outputViewport.y,u=A(this,j,`f`).outputViewport.w,d=A(this,j,`f`).outputViewport.h;else{let e=mi(a);s=e.getWriteFbo().fbo,o?(c=A(this,j,`f`).outputViewport.x,l=A(this,j,`f`).outputViewport.y,u=A(this,j,`f`).outputViewport.w,d=A(this,j,`f`).outputViewport.h):(c=0,l=0,u=a.width,d=a.height),f=e.swap,e.mipmapAutoRegen&&(p=e.regenerateMipmaps)}t.bindFramebuffer(t.FRAMEBUFFER,s),t.viewport(c,l,u,d),t.disable(t.SCISSOR_TEST),pr(t,e.blend??(a===null?`premultiplied`:`none`)),r.use();let m=A(this,Wr,`m`,ui).call(this,e.uniforms);r.uploadUniforms(m);let h=e.geometry??Lr;Rr(h)?A(this,Yr,`f`).quad.draw():A(this,Yr,`f`).resolve(h,r).draw(),p?.(),f&&e.swap!==!1&&f()},ui=function(e){let t={};if(t.contentRectUv={value:A(this,j,`f`).contentRectUv},t.srcRectUv={value:A(this,j,`f`).srcRectUv},!e)return t;for(let[n,r]of Object.entries(e))t[n]=wi(r);return t};function Si(e){let t=globalThis.WebGLTexture;if(t&&typeof t==`function`&&e instanceof t)return!0;let n=e;return n.width===void 0&&n.naturalWidth===void 0&&n.videoWidth===void 0}function Ci(e){return e===void 0?[`clamp`,`clamp`]:typeof e==`string`?[e,e]:[e[0],e[1]]}function wi(e){return typeof e==`object`&&e&&`__brand`in e?e.__brand===`EffectRenderTarget`?{value:mi(e).getReadTexture()}:{value:pi(e)}:{value:e}}function Ti(e,t,n,r,i){let a={__brand:`EffectTexture`,get width(){return t()},get height(){return n()},dispose(){r?.()},update(){i?.()}};return Object.defineProperty(a,di,{value:e}),a}function Ei(e,t,n,r){let i={__brand:`EffectRenderTarget`,get width(){return t()},get height(){return n()},dispose:r??(()=>{}),generateMipmaps:()=>e.regenerateMipmaps?.()};return Object.defineProperty(i,fi,{value:e}),i}function Di(e){return Ei({getReadTexture:()=>e.texture,getWriteFbo:()=>e},()=>e.width,()=>e.height)}function Oi(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:Array.isArray(e)?{top:e[0],right:e[1],bottom:e[2],left:e[3]}:{top:e.top??0,right:e.right??0,bottom:e.bottom??0,left:e.left??0}}function ki(e){return Oi(e)}var Ai={top:0,right:0,bottom:0,left:0};function ji(e){return Oi(e)}function Mi(e){return{top:e.top,right:e.right,bottom:e.bottom,left:e.left}}function Ni(e){return{top:e.top,left:e.left,right:e.left+Math.ceil(e.right-e.left),bottom:e.top+Math.ceil(e.bottom-e.top)}}function Pi(e,t){return{top:e.top-t.top,right:e.right+t.right,bottom:e.bottom+t.bottom,left:e.left-t.left}}function Fi(e,t,n){return Math.min(Math.max(e,t),n)}function Ii(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return c<=0||l<=0?[0,0,1,1]:[(n-o)/c,(r-s)/l,i/c,a/l]}function Li(e,t){return Ri(e.left,e.right,t.left,t.right)*Ri(e.top,e.bottom,t.top,t.bottom)}function Ri(e,t,n,r){let i=Math.min(r-n,t-e);if(i<=0)return 0;let a=Fi(n,e,t);return(Fi(r,e,t)-a)/i}var N=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},P=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},F,zi,Bi,Vi,Hi,Ui,I,L,Wi,Gi,Ki,qi,Ji,Yi,Xi,Zi,Qi,$i,ea,ta,na,ra,ia,aa,oa,sa,ca,la=class{constructor(e,t,n,r,i,a,o,s){F.add(this),zi.set(this,void 0),Bi.set(this,void 0),Vi.set(this,void 0),Hi.set(this,void 0),Ui.set(this,void 0),I.set(this,void 0),L.set(this,void 0),Wi.set(this,void 0),Gi.set(this,[]),Ki.set(this,[]),qi.set(this,void 0),Ji.set(this,new Set),Yi.set(this,!1),Xi.set(this,void 0),Zi.set(this,ki(0)),Qi.set(this,null),N(this,zi,e,`f`),N(this,Bi,t,`f`),N(this,Vi,n,`f`),N(this,Hi,i,`f`),N(this,Ui,s,`f`),N(this,I,r,`f`),N(this,qi,a,`f`),N(this,Xi,o,`f`),N(this,L,r.map(()=>P(this,F,`m`,ea).call(this)),`f`),r.length===0&&N(this,Qi,P(this,F,`m`,ea).call(this),`f`),N(this,Wi,P(this,F,`m`,$i).call(this),`f`)}get effects(){return P(this,I,`f`)}get hosts(){return P(this,L,`f`)}get renderingIndices(){return P(this,Wi,`f`)}get stages(){return P(this,Ki,`f`)}get hitTestPadBuffer(){return P(this,Zi,`f`)}async initAll(){for(let e=0;e<P(this,I,`f`).length;e++){let t=P(this,I,`f`)[e],n=P(this,L,`f`)[e];n.setPhase(`init`);try{t.init&&await t.init(n.ctx)}catch(t){console.error(`[VFX-JS] effect[${e}].init() failed:`,t);for(let t=e-1;t>=0;t--)P(this,F,`m`,ta).call(this,t),P(this,L,`f`)[t].dispose();throw P(this,L,`f`)[e].dispose(),t}n.setPhase(`update`)}}run(e){if(P(this,Yi,`f`)||!e.isVisible)return;N(this,Wi,P(this,F,`m`,$i).call(this),`f`);let t=P(this,Wi,`f`).length;for(let t of P(this,L,`f`))t.setFrameState({time:e.time,deltaTime:e.deltaTime,mouse:e.mouse,mouseViewport:e.mouseViewport,intersection:e.intersection,enterTime:e.enterTime,leaveTime:e.leaveTime,enterProgress:e.enterProgress,leaveProgress:e.leaveProgress,uniforms:e.resolvedUniforms});P(this,F,`m`,na).call(this,e);for(let t=0;t<P(this,L,`f`).length;t++)P(this,L,`f`)[t].setFrameDims(P(this,F,`m`,ca).call(this,t,e)),P(this,L,`f`)[t].setEffectDims(P(this,F,`m`,aa).call(this,t,e));for(let e=0;e<P(this,I,`f`).length;e++){let t=P(this,I,`f`)[e];if(!t.update)continue;let n=P(this,L,`f`)[e];n.setPhase(`update`);try{t.update(n.ctx)}catch(t){let n=`${e}:update`;P(this,Ji,`f`).has(n)||(P(this,Ji,`f`).add(n),console.warn(`[VFX-JS] effect[${e}].update() threw; skipping this frame's update:`,t))}}if(t===0)(P(this,Qi,`f`)??P(this,L,`f`)[0]).passthroughCopy(P(this,qi,`f`),e.finalTarget,e.elementRectOnCanvasPx);else for(let n=0;n<t;n++){let r=P(this,Wi,`f`)[n],i=P(this,L,`f`)[r],a=P(this,I,`f`)[r];if(!a.render)continue;i.setPhase(`render`),i.tickAutoUpdates();let o=n===0?P(this,qi,`f`):P(this,Gi,`f`)[n-1].texHandle;i.setSrc(o);let s;n===t-1?s=e.finalTarget:(s=P(this,Gi,`f`)[n].rtHandle,i.clearRt(s)),i.setOutput(s);try{a.render(i.ctx)}catch(e){let a=`${r}:render`;P(this,Ji,`f`).has(a)||(P(this,Ji,`f`).add(a),console.warn(`[VFX-JS] effect[${r}].render() threw; falling back to passthrough:`,e));let c=P(this,Ki,`f`)[n].outputViewport;s===null?i.passthroughCopy(o,null,c):n===t-1?i.passthroughCopy(o,s,c):i.passthroughCopy(o,s,{x:0,y:0,w:s.width,h:s.height})}i.setPhase(`update`)}}dispose(){if(!P(this,Yi,`f`)){N(this,Yi,!0,`f`);for(let e=P(this,I,`f`).length-1;e>=0;e--)P(this,F,`m`,ta).call(this,e),P(this,L,`f`)[e].dispose();P(this,Qi,`f`)&&(P(this,Qi,`f`).dispose(),N(this,Qi,null,`f`));for(let e of P(this,Gi,`f`))e.fb.dispose();N(this,Gi,[],`f`),N(this,Ki,[],`f`)}}async replaceEffects(e){if(P(this,Yi,`f`))throw Error(`[VFX-JS] replaceEffects on disposed chain`);let t=P(this,I,`f`),n=P(this,L,`f`),r=new Map;for(let e=0;e<t.length;e++)r.set(t[e],n[e]);let i=Array(e.length),a=[];for(let t=0;t<e.length;t++){let n=e[t],o=r.get(n);if(o)i[t]=o,r.delete(n);else{let e=P(this,F,`m`,ea).call(this);i[t]=e,a.push({host:e,effect:n})}}for(let e=0;e<a.length;e++){let{host:t,effect:n}=a[e];t.setPhase(`init`);try{n.init&&await n.init(t.ctx),t.setPhase(`update`)}catch(n){console.error(`[VFX-JS] replaceEffects: new effect init() failed:`,n);for(let t=e-1;t>=0;t--){let e=a[t];if(e.effect.dispose)try{e.effect.dispose()}catch(e){console.error(`[VFX-JS] dispose during init rollback threw:`,e)}e.host.dispose()}throw t.dispose(),n}}for(let[e,t]of r){if(e.dispose)try{e.dispose()}catch(e){console.error(`[VFX-JS] effect.dispose() threw during replaceEffects:`,e)}t.dispose()}for(let e of P(this,Gi,`f`))e.fb.dispose();N(this,Gi,[],`f`),N(this,Ki,[],`f`),e.length===0&&!P(this,Qi,`f`)?N(this,Qi,P(this,F,`m`,ea).call(this),`f`):e.length>0&&P(this,Qi,`f`)&&(P(this,Qi,`f`).dispose(),N(this,Qi,null,`f`)),N(this,I,e,`f`),N(this,L,i,`f`),N(this,Wi,P(this,F,`m`,$i).call(this),`f`),P(this,Ji,`f`).clear()}};zi=new WeakMap,Bi=new WeakMap,Vi=new WeakMap,Hi=new WeakMap,Ui=new WeakMap,I=new WeakMap,L=new WeakMap,Wi=new WeakMap,Gi=new WeakMap,Ki=new WeakMap,qi=new WeakMap,Ji=new WeakMap,Yi=new WeakMap,Xi=new WeakMap,Zi=new WeakMap,Qi=new WeakMap,F=new WeakSet,$i=function(){return P(this,I,`f`).map((e,t)=>typeof e.render==`function`&&e.enabled!==!1?t:-1).filter(e=>e>=0)},ea=function(){return new xi(P(this,zi,`f`),P(this,Bi,`f`),P(this,Vi,`f`),P(this,qi,`f`),P(this,Hi,`f`),P(this,Ui,`f`))},ta=function(e){let t=P(this,I,`f`)[e];if(t.dispose)try{t.dispose()}catch(t){console.error(`[VFX-JS] effect[${e}].dispose() threw:`,t)}},na=function(e){let t=P(this,Wi,`f`).length;if(N(this,Ki,Array(t),`f`),t===0)return;let n=P(this,Xi,`f`)?e.canvasBufferSize:e.elementBufferSize,r=[0,0,n[0],n[1]],i=P(this,F,`m`,sa).call(this,e),a=r;for(let n=0;n<t;n++){let o=P(this,Wi,`f`)[n],s=P(this,I,`f`)[o],c=n===t-1,l=P(this,F,`m`,ra).call(this,s,a,r,i,e)??a,u=[l[2],l[3]],d=Ii(r,l),f=c?{x:e.elementRectOnCanvasPx.x+l[0],y:e.elementRectOnCanvasPx.y+l[1],w:u[0],h:u[1]}:{x:0,y:0,w:u[0],h:u[1]};P(this,Ki,`f`)[n]={dstRect:l,dstBufferSize:u,contentRectUv:d,outputViewport:f},c||P(this,F,`m`,oa).call(this,n,u),a=l}let[o,s,c,l]=P(this,Ki,`f`)[t-1].dstRect;N(this,Zi,ki({top:Math.max(0,s+l-n[1]),right:Math.max(0,o+c-n[0]),bottom:Math.max(0,-s),left:Math.max(0,-o)}),`f`)},ra=function(e,t,n,r,i){if(e.outputRect)return e.outputRect(P(this,F,`m`,ia).call(this,i,n,t,r))},ia=function(e,t,n,r){let i=e.canvasBufferSize[0]/e.canvasSize[0]||1;return{element:P(this,Xi,`f`)?e.canvasSize:e.elementSize,elementPixel:P(this,Xi,`f`)?e.canvasBufferSize:e.elementBufferSize,canvas:e.canvasSize,canvasPixel:e.canvasBufferSize,pixelRatio:i,contentRect:t,srcRect:n,canvasRect:r}},aa=function(e,t){let n=P(this,Xi,`f`)?t.canvasBufferSize:t.elementBufferSize,r=[0,0,n[0],n[1]],i=P(this,F,`m`,sa).call(this,t),a=P(this,Wi,`f`).indexOf(e),o=a<=0?r:P(this,Ki,`f`)[a-1].dstRect;return P(this,F,`m`,ia).call(this,t,r,o,i)},oa=function(e,t){let n=P(this,Gi,`f`)[e];if(n&&n.fb.width===t[0]&&n.fb.height===t[1])return;n&&n.fb.dispose();let r=new In(P(this,zi,`f`),t[0],t[1]),i=Di(r),a=Ti(()=>r.texture,()=>r.width,()=>r.height);P(this,Gi,`f`)[e]={fb:r,rtHandle:i,texHandle:a,bufferSize:t}},sa=function(e){let[t,n]=e.canvasBufferSize;if(P(this,Xi,`f`))return[0,0,t,n];let{x:r,y:i}=e.elementRectOnCanvasPx;return[-r,-i,t,n]},ca=function(e,t){let n=P(this,Wi,`f`).indexOf(e),r,i,a,o,s;if(n<0)r=t.elementBufferSize[0],i=t.elementBufferSize[1],a={x:0,y:0,w:r,h:i},o=[0,0,1,1],s=[0,0,1,1];else{let e=P(this,Ki,`f`)[n];r=e.dstBufferSize[0],i=e.dstBufferSize[1],a=e.outputViewport,o=e.contentRectUv,s=n===0?[0,0,1,1]:P(this,Ki,`f`)[n-1].contentRectUv}return{outputBufferW:r,outputBufferH:i,canvasBufferSize:t.canvasBufferSize,outputViewport:a,elementBufferW:t.elementBufferSize[0],elementBufferH:t.elementBufferSize[1],contentRectUv:o,srcRectUv:s}};var ua=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},da=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},fa,pa,ma,ha,ga=class{constructor(e){fa.add(this),pa.set(this,void 0),ma.set(this,new Set),ua(this,pa,e,`f`)}freezeInside(e,t){let n={root:e,entries:[]};for(let r of t)!r.frozen&&_a(e,r.element)&&(r.frozen=!0,n.entries.push({e:r,opacity:r.element.style.opacity}),da(this,pa,`f`).showPlain(r));da(this,ma,`f`).add(n);let r=!1;return()=>{if(!r){r=!0,da(this,ma,`f`).delete(n);for(let{e}of n.entries)e.frozen=!1;requestAnimationFrame(()=>{for(let{e,opacity:t}of n.entries)!e.frozen&&da(this,pa,`f`).isRegistered(e)&&da(this,pa,`f`).hidePlain(e,t)})}}}adopt(e,t){let n=da(this,fa,`m`,ha).call(this,e.element);return n?(e.frozen=!0,n.entries.push({e,opacity:t??e.element.style.opacity}),!0):!1}};pa=new WeakMap,ma=new WeakMap,fa=new WeakSet,ha=function(e){for(let t of da(this,ma,`f`))if(_a(t.root,e))return t};function _a(e,t){return t!==e&&e.contains(t)}function va(e){this.data=e,this.pos=0}va.prototype.readByte=function(){return this.data[this.pos++]},va.prototype.peekByte=function(){return this.data[this.pos]},va.prototype.readBytes=function(e){return this.data.subarray(this.pos,this.pos+=e)},va.prototype.peekBytes=function(e){return this.data.subarray(this.pos,this.pos+e)},va.prototype.readString=function(e){for(var t=``,n=0;n<e;n++)t+=String.fromCharCode(this.readByte());return t},va.prototype.readBitArray=function(){for(var e=[],t=this.readByte(),n=7;n>=0;n--)e.push(!!(t&1<<n));return e},va.prototype.readUnsigned=function(e){var t=this.readBytes(2);return e?(t[1]<<8)+t[0]:(t[0]<<8)+t[1]};function ya(e){this.stream=new va(e),this.output={}}ya.prototype.parse=function(e){return this.parseParts(this.output,e),this.output},ya.prototype.parseParts=function(e,t){for(var n=0;n<t.length;n++){var r=t[n];this.parsePart(e,r)}},ya.prototype.parsePart=function(e,t){var n=t.label,r;if(!t.requires||t.requires(this.stream,this.output,e)){if(t.loop){for(var i=[];t.loop(this.stream);){var a={};this.parseParts(a,t.parts),i.push(a)}e[n]=i}else t.parts?(r={},this.parseParts(r,t.parts),e[n]=r):t.parser?(r=t.parser(this.stream,this.output,e),t.skip||(e[n]=r)):t.bits&&(e[n]=this.parseBits(t.bits))}};function ba(e){return e.reduce(function(e,t){return e*2+t},0)}ya.prototype.parseBits=function(e){var t={},n=this.stream.readBitArray();for(var r in e){var i=e[r];t[r]=i.length?ba(n.slice(i.index,i.index+i.length)):n[i.index]}return t};var R={readByte:function(){return function(e){return e.readByte()}},readBytes:function(e){return function(t){return t.readBytes(e)}},readString:function(e){return function(t){return t.readString(e)}},readUnsigned:function(e){return function(t){return t.readUnsigned(e)}},readArray:function(e,t){return function(n,r,i){for(var a=t(n,r,i),o=Array(a),s=0;s<a;s++)o[s]=n.readBytes(e);return o}}},xa={label:`blocks`,parser:function(e){for(var t=[],n=0,r=0,i=e.readByte();i!==r;i=e.readByte())t.push(e.readBytes(i)),n+=i;var a=new Uint8Array(n);n=0;for(var o=0;o<t.length;o++)a.set(t[o],n),n+=t[o].length;return a}},Sa={label:`gce`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===249},parts:[{label:`codes`,parser:R.readBytes(2),skip:!0},{label:`byteSize`,parser:R.readByte()},{label:`extras`,bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:`delay`,parser:R.readUnsigned(!0)},{label:`transparentColorIndex`,parser:R.readByte()},{label:`terminator`,parser:R.readByte(),skip:!0}]},Ca={label:`image`,requires:function(e){return e.peekByte()===44},parts:[{label:`code`,parser:R.readByte(),skip:!0},{label:`descriptor`,parts:[{label:`left`,parser:R.readUnsigned(!0)},{label:`top`,parser:R.readUnsigned(!0)},{label:`width`,parser:R.readUnsigned(!0)},{label:`height`,parser:R.readUnsigned(!0)},{label:`lct`,bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:`lct`,requires:function(e,t,n){return n.descriptor.lct.exists},parser:R.readArray(3,function(e,t,n){return 2**(n.descriptor.lct.size+1)})},{label:`data`,parts:[{label:`minCodeSize`,parser:R.readByte()},xa]}]},wa={label:`text`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===1},parts:[{label:`codes`,parser:R.readBytes(2),skip:!0},{label:`blockSize`,parser:R.readByte()},{label:`preData`,parser:function(e,t,n){return e.readBytes(n.text.blockSize)}},xa]},Ta={label:`frames`,parts:[Sa,{label:`application`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===255},parts:[{label:`codes`,parser:R.readBytes(2),skip:!0},{label:`blockSize`,parser:R.readByte()},{label:`id`,parser:function(e,t,n){return e.readString(n.blockSize)}},xa]},{label:`comment`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===254},parts:[{label:`codes`,parser:R.readBytes(2),skip:!0},xa]},Ca,wa],loop:function(e){var t=e.peekByte();return t===33||t===44}},Ea=[{label:`header`,parts:[{label:`signature`,parser:R.readString(3)},{label:`version`,parser:R.readString(3)}]},{label:`lsd`,parts:[{label:`width`,parser:R.readUnsigned(!0)},{label:`height`,parser:R.readUnsigned(!0)},{label:`gct`,bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:`backgroundColorIndex`,parser:R.readByte()},{label:`pixelAspectRatio`,parser:R.readByte()}]},{label:`gct`,requires:function(e,t){return t.lsd.gct.exists},parser:R.readArray(3,function(e,t){return 2**(t.lsd.gct.size+1)})},Ta];function Da(e){var t=new ya(new Uint8Array(e));this.raw=t.parse(Ea),this.raw.hasImages=!1;for(var n=0;n<this.raw.frames.length;n++)if(this.raw.frames[n].image){this.raw.hasImages=!0;break}}Da.prototype.decompressFrame=function(e,t){if(e>=this.raw.frames.length)return null;var n=this.raw.frames[e];if(n.image){var r=n.image.descriptor.width*n.image.descriptor.height,i=o(n.image.data.minCodeSize,n.image.data.blocks,r);n.image.descriptor.lct.interlaced&&(i=s(i,n.image.descriptor.width));var a={pixels:i,dims:{top:n.image.descriptor.top,left:n.image.descriptor.left,width:n.image.descriptor.width,height:n.image.descriptor.height}};return a.colorTable=n.image.descriptor.lct&&n.image.descriptor.lct.exists?n.image.lct:this.raw.gct,n.gce&&(a.delay=(n.gce.delay||10)*10,a.disposalType=n.gce.extras.disposal,n.gce.extras.transparentColorGiven&&(a.transparentIndex=n.gce.transparentColorIndex)),t&&(a.patch=c(a)),a}return null;function o(e,t,n){var r=4096,i=-1,a=n,o,s,c,l,u,d,f,p,m,h,ee,te,ne,re,ie,g,_=Array(n),v=Array(r),y=Array(r),ae=Array(r+1);for(te=e,s=1<<te,u=s+1,o=s+2,f=i,l=te+1,c=(1<<l)-1,m=0;m<s;m++)v[m]=0,y[m]=m;for(ee=p=ne=re=g=ie=0,h=0;h<a;){if(re===0){if(p<l){ee+=t[ie]<<p,p+=8,ie++;continue}if(m=ee&c,ee>>=l,p-=l,m>o||m==u)break;if(m==s){l=te+1,c=(1<<l)-1,o=s+2,f=i;continue}if(f==i){ae[re++]=y[m],f=m,ne=m;continue}for(d=m,m==o&&(ae[re++]=ne,m=f);m>s;)ae[re++]=y[m],m=v[m];ne=y[m]&255,ae[re++]=ne,o<r&&(v[o]=f,y[o]=ne,o++,(o&c)===0&&o<r&&(l++,c+=o)),f=d}re--,_[g++]=ae[re],h++}for(h=g;h<a;h++)_[h]=0;return _}function s(e,t){for(var n=Array(e.length),r=e.length/t,i=function(r,i){var a=e.slice(i*t,(i+1)*t);n.splice.apply(n,[r*t,t].concat(a))},a=[0,4,2,1],o=[8,8,4,2],s=0,c=0;c<4;c++)for(var l=a[c];l<r;l+=o[c])i(l,s),s++;return n}function c(e){for(var t=e.pixels.length,n=new Uint8ClampedArray(t*4),r=0;r<t;r++){var i=r*4,a=e.pixels[r],o=e.colorTable[a];n[i]=o[0],n[i+1]=o[1],n[i+2]=o[2],n[i+3]=a===e.transparentIndex?0:255}return n}},Da.prototype.decompressFrames=function(e,t,n){t===void 0&&(t=0),n=n===void 0?this.raw.frames.length:Math.min(n,this.raw.frames.length);for(var r=[],i=t;i<n;i++)this.raw.frames[i].image&&r.push(this.decompressFrame(i,e));return r};var Oa=Da,ka=class e{static async create(t,n){let r=await fetch(t).then(e=>e.arrayBuffer()).then(e=>new Oa(e)),i=r.decompressFrames(!0,void 0,void 0),{width:a,height:o}=r.raw.lsd;return new e(i,a,o,n)}constructor(e,t,n,r){this.frames=[],this.index=0,this.playTime=0,this.frames=e,this.canvas=document.createElement(`canvas`),this.ctx=this.canvas.getContext(`2d`),this.pixelRatio=r,this.canvas.width=t,this.canvas.height=n,this.startTime=Date.now()}getCanvas(){return this.canvas}update(){let e=Date.now()-this.startTime;for(;this.playTime<e;){let e=this.frames[this.index%this.frames.length];this.playTime+=e.delay,this.index++}let t=this.frames[this.index%this.frames.length],n=new ImageData(t.patch,t.dims.width,t.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(n,t.dims.left,t.dims.top)}},Aa=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ja,Ma,Na,Pa,Fa,Ia=class{constructor(e,t=!1){this.isContextLost=!1,ja.set(this,new Set),Ma.set(this,new Set),Na.set(this,new Set),Pa.set(this,e=>{e.preventDefault(),this.isContextLost=!0;for(let e of Aa(this,Ma,`f`))e()}),Fa.set(this,()=>{this.isContextLost=!1;let e=this.gl;e.getExtension(`EXT_color_buffer_float`),e.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!e.getExtension(`EXT_float_blend`);for(let e of Aa(this,ja,`f`))e.restore();for(let e of Aa(this,Na,`f`))e()});let n=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:t});if(!n)throw Error(`[VFX-JS] WebGL2 is not available.`);this.gl=n,this.canvas=e,n.getExtension(`EXT_color_buffer_float`),n.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!n.getExtension(`EXT_float_blend`),this.floatLinearFilter=!!n.getExtension(`OES_texture_float_linear`),this.maxTextureSize=n.getParameter(n.MAX_TEXTURE_SIZE),e.addEventListener(`webglcontextlost`,Aa(this,Pa,`f`),!1),e.addEventListener(`webglcontextrestored`,Aa(this,Fa,`f`),!1)}setSize(e,t,n){let r=Math.floor(e*n),i=Math.floor(t*n);(this.canvas.width!==r||this.canvas.height!==i)&&(this.canvas.width=r,this.canvas.height=i)}addResource(e){Aa(this,ja,`f`).add(e)}removeResource(e){Aa(this,ja,`f`).delete(e)}onContextLost(e){return Aa(this,Ma,`f`).add(e),()=>Aa(this,Ma,`f`).delete(e)}onContextRestored(e){return Aa(this,Na,`f`).add(e),()=>Aa(this,Na,`f`).delete(e)}};ja=new WeakMap,Ma=new WeakMap,Na=new WeakMap,Pa=new WeakMap,Fa=new WeakMap;var La=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Ra=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},za,Ba,Va,Ha,Ua=class{constructor(e){za.add(this),Ba.set(this,void 0),Va.set(this,void 0),La(this,Ba,e,`f`),this.gl=e.gl,Ra(this,za,`m`,Ha).call(this),e.addResource(this)}restore(){Ra(this,za,`m`,Ha).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){Ra(this,Ba,`f`).removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(Ra(this,Va,`f`))}};Ba=new WeakMap,Va=new WeakMap,za=new WeakSet,Ha=function(){let e=this.gl,t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw Error(`[VFX-JS] Failed to create quad VAO`);this.vao=t,La(this,Va,n,`f`);let r=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)};function Wa(e){return{phase:`hidden`,direction:1,enterProgress:0,leaveProgress:0,isIn:!1,wasAbove:!1,wasBelow:!1,lastTime:e}}function Ga(e,t,n,r,i){let a=r===0?n:t>=r,o=i===0?!n:t<i,s=a&&!e.wasAbove,c=o&&!e.wasBelow;if(e.wasAbove=a,e.wasBelow=o,a&&!o)return!0;if(o&&!a)return!1;if(a&&o){if(s)return!0;if(c)return!1}return e.isIn}function Ka(e,t){e.lastTime=t}function qa(e,t,n,r){let i=n-e.lastTime;if(e.lastTime=n,e.isIn=t,Ja(e,t))return e;let a=(i<0?i:e.direction*i)/r;if(e.phase===`entering`){let t=e.enterProgress+a;a>0&&t>=1?Ya(e,`shown`):a<0&&t<=0?Ya(e,`hidden`):e.enterProgress=Xa(t)}else if(e.phase===`leaving`){let t=e.leaveProgress+a;a>0&&t>=1?Ya(e,`hidden`):a<0&&t<=0?Ya(e,`shown`):e.leaveProgress=Xa(t)}return e}function Ja(e,t){switch(e.phase){case`hidden`:return t?(e.phase=`entering`,e.direction=1,!0):!1;case`shown`:return!t&&(e.phase=`leaving`,e.direction=1,!0);case`entering`:return e.direction=t?1:-1,!1;case`leaving`:return e.direction=t?-1:1,!1}}function Ya(e,t){e.phase=t,e.direction=1,e.enterProgress=+(t===`shown`),e.leaveProgress=0}function Xa(e){return Math.min(Math.max(e,0),1)}function Za(e,t,n,r={}){return new In(e,t,n,{float:r.float??!1})}function Qa(e,t){let n=t.renderingToBuffer??!1,r;r=n?`none`:t.premultipliedAlpha?`premultiplied`:`normal`;let i=t.glslVersion??ir(t.fragmentShader);return new dr(e,t.vertexShader??(i===`100`?`
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
`),t.fragmentShader,t.uniforms,r,i)}var $a=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},z=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},B,eo,to,no,ro,io,ao=class{constructor(e,t,n,r,i,a,o,s){if(B.set(this,void 0),eo.set(this,void 0),to.set(this,void 0),no.set(this,void 0),ro.set(this,void 0),io.set(this,void 0),$a(this,no,r??!1,`f`),$a(this,ro,i??!1,`f`),$a(this,io,a,`f`),$a(this,eo,{},`f`),$a(this,B,{src:{value:null},offset:{value:new qn},resolution:{value:new qn},viewport:{value:new Jn},time:{value:0},mouse:{value:new qn},passIndex:{value:0}},`f`),n)for(let[e,t]of Object.entries(n))typeof t==`function`?(z(this,eo,`f`)[e]=t,z(this,B,`f`)[e]={value:t()}):z(this,B,`f`)[e]={value:t};this.pass=Qa(e,{fragmentShader:t,uniforms:z(this,B,`f`),renderingToBuffer:o??!1,premultipliedAlpha:!0,glslVersion:s})}get uniforms(){return z(this,B,`f`)}setUniforms(e,t,n,r,i,a){z(this,B,`f`).src.value=e,z(this,B,`f`).resolution.value.set(n.w*t,n.h*t),z(this,B,`f`).offset.value.set(n.x*t,n.y*t),z(this,B,`f`).time.value=r,z(this,B,`f`).mouse.value.set(i*t,a*t)}updateCustomUniforms(e){for(let[e,t]of Object.entries(z(this,eo,`f`)))z(this,B,`f`)[e]&&(z(this,B,`f`)[e].value=t());if(e)for(let[t,n]of Object.entries(e))z(this,B,`f`)[t]&&(z(this,B,`f`)[t].value=n())}initializeBackbuffer(e,t,n,r){z(this,no,`f`)&&!z(this,to,`f`)&&(z(this,io,`f`)?$a(this,to,new Kn(e,z(this,io,`f`)[0],z(this,io,`f`)[1],1,z(this,ro,`f`)),`f`):$a(this,to,new Kn(e,t,n,r,z(this,ro,`f`)),`f`))}resizeBackbuffer(e,t){z(this,to,`f`)&&!z(this,io,`f`)&&z(this,to,`f`).resize(e,t)}registerBufferUniform(e){z(this,B,`f`)[e]||(z(this,B,`f`)[e]={value:null})}get backbuffer(){return z(this,to,`f`)}get persistent(){return z(this,no,`f`)}get float(){return z(this,ro,`f`)}get size(){return z(this,io,`f`)}dispose(){this.pass.dispose(),z(this,to,`f`)?.dispose()}};B=new WeakMap,eo=new WeakMap,to=new WeakMap,no=new WeakMap,ro=new WeakMap,io=new WeakMap;var oo=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},so=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},co,lo,uo=class{constructor(e){co.set(this,void 0),lo.set(this,new Map),oo(this,co,e,`f`)}get(e,t,n){let r=`${t}\0${e}\0${n??``}`,i=so(this,lo,`f`).get(r);return i||(i=new ar(so(this,co,`f`),e,t,n),so(this,lo,`f`).set(r,i)),i}get size(){return so(this,lo,`f`).size}dispose(){for(let e of so(this,lo,`f`).values())e.dispose();so(this,lo,`f`).clear()}};co=new WeakMap,lo=new WeakMap;var V=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},H=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},U,fo,po,W,mo,ho,go,_o,vo,G,yo,bo,xo,So,Co,wo,To,Eo,K,q,Do,Oo,ko,Ao,jo,J,Mo,No,Po,Fo,Io,Lo,Ro,zo,Bo,Vo,Ho,Uo,Wo,Go,Ko,qo,Jo,Yo,Xo,Zo,Qo,$o,es,ts,ns,rs,is,as,os,ss=new Map,cs=!1;function ls(e,t){return e===`hic`||t===!0?null:typeof t==`number`?t.toString():e===`video`?`0.0001`:`0`}function us(e,t){let n=e.getContext(`2d`);n&&(n.clearRect(0,0,e.width,e.height),n.drawImage(t,0,0,e.width,e.height))}var ds=class{constructor(e,t){U.add(this),fo.set(this,void 0),po.set(this,void 0),W.set(this,void 0),mo.set(this,void 0),ho.set(this,void 0),go.set(this,void 0),_o.set(this,void 0),vo.set(this,[]),G.set(this,void 0),yo.set(this,new Map),bo.set(this,null),xo.set(this,!1),So.set(this,new WeakSet),Co.set(this,{}),wo.set(this,{}),To.set(this,0),Eo.set(this,void 0),K.set(this,2),q.set(this,[]),Do.set(this,new ga({showPlain:e=>{if(e.type===`hic`){let t=e.srcTexture.source;t instanceof OffscreenCanvas&&us(e.element,t)}else e.element.style.setProperty(`opacity`,e.originalOpacity.toString())},hidePlain:(e,t)=>{if(e.type===`hic`){let t=e.element;t.getContext(`2d`)?.clearRect(0,0,t.width,t.height)}else e.element.style.opacity=t},isRegistered:e=>H(this,q,`f`).includes(e)})),Oo.set(this,0),ko.set(this,1),Ao.set(this,Date.now()/1e3),jo.set(this,!1),J.set(this,ji(0)),Mo.set(this,ji(0)),No.set(this,[0,0]),Po.set(this,0),Fo.set(this,0),Io.set(this,0),Lo.set(this,0),Ro.set(this,new WeakMap),Bo.set(this,async()=>{if(typeof window<`u`){for(let e of H(this,q,`f`))if(e.type===`text`&&e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await H(this,U,`m`,Ho).call(this,e),e.width=n,e.height=r)}for(let e of H(this,q,`f`))if(e.type===`text`&&!e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await H(this,U,`m`,Ho).call(this,e),e.width=n,e.height=r)}}}),Vo.set(this,e=>{typeof window<`u`&&(V(this,Io,e.clientX,`f`),V(this,Lo,window.innerHeight-e.clientY,`f`))}),Ko.set(this,()=>{this.isPlaying()&&(this.render(),V(this,Eo,requestAnimationFrame(H(this,Ko,`f`)),`f`))}),V(this,fo,e,`f`),V(this,po,t,`f`),V(this,W,new Ia(t,e.preserveDrawingBuffer),`f`),V(this,mo,H(this,W,`f`).gl,`f`),H(this,mo,`f`).clearColor(0,0,0,0),V(this,K,e.pixelRatio,`f`),V(this,ko,e.timeScale,`f`),V(this,Ao,Date.now()/1e3,`f`),V(this,ho,new Ua(H(this,W,`f`)),`f`),V(this,go,new uo(H(this,W,`f`)),`f`),typeof window<`u`&&(window.addEventListener(`resize`,H(this,Bo,`f`)),window.addEventListener(`pointermove`,H(this,Vo,`f`))),H(this,Bo,`f`).call(this),V(this,_o,new mr(H(this,W,`f`)),`f`),H(this,U,`m`,ns).call(this,e.postEffects),H(this,W,`f`).onContextRestored(()=>{H(this,mo,`f`).clearColor(0,0,0,0)})}destroy(){this.stop(),typeof window<`u`&&(window.removeEventListener(`resize`,H(this,Bo,`f`)),window.removeEventListener(`pointermove`,H(this,Vo,`f`))),H(this,G,`f`)?.dispose();for(let e of H(this,yo,`f`).values())e?.dispose();for(let e of H(this,vo,`f`))e.pass.dispose();H(this,bo,`f`)&&(H(this,bo,`f`).dispose(),V(this,bo,null,`f`),V(this,xo,!1,`f`)),H(this,_o,`f`).dispose(),H(this,go,`f`).dispose(),H(this,ho,`f`).dispose()}async addElement(e,t={},n){if(t.effect!==void 0)return H(this,U,`m`,Wo).call(this,e,t,t.effect,n);let r=H(this,U,`m`,Go).call(this,t),i=e.getBoundingClientRect(),a=ws(e)?Ni(i):Mi(i),[o,s]=ps(t.overflow),l=Pi(a,s),u=_s(t.intersection),d=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),f,p,h=!1;if(e instanceof HTMLImageElement){p=`img`;let t=m(e);if(h=!!t.match(/\.gif/i),h){let n=await ka.create(t,H(this,K,`f`));ss.set(e,n),f=new D(H(this,W,`f`),n.getCanvas())}else{let e=await An(t);f=new D(H(this,W,`f`),e)}}else if(e instanceof HTMLVideoElement)f=new D(H(this,W,`f`),e),p=`video`;else if(e instanceof HTMLCanvasElement)c(e)&&n?(f=new D(H(this,W,`f`),n),p=`hic`):(f=new D(H(this,W,`f`),e),p=`canvas`);else{let t=await gr(e,d,void 0,this.maxTextureSize);f=new D(H(this,W,`f`),t),p=`text`}let[ee,te]=bs(t.wrap);f.wrapS=ee,f.wrapT=te,f.needsUpdate=!0;let ne=t.autoCrop??!0,re=ls(p,t.overlay),ie={src:{value:f},resolution:{value:new qn},offset:{value:new qn},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},enterProgress:{value:0},leaveProgress:{value:0},mouse:{value:new qn},intersection:{value:0},viewport:{value:new Jn},autoCrop:{value:ne}},g={};if(t.uniforms!==void 0)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(ie[e]={value:n()},g[e]=n):ie[e]={value:n};let _;t.backbuffer&&(_=(()=>{let e=(l.right-l.left)*H(this,K,`f`),t=(l.bottom-l.top)*H(this,K,`f`);return new Kn(H(this,W,`f`),e,t,H(this,K,`f`),!1)})(),ie.backbuffer={value:_.texture});let v=new Map,y=new Map;for(let e=0;e<r.length-1;e++){let t=r[e].target??`pass${e}`;r[e]={...r[e],target:t};let n=r[e].size,i=n?n[0]:(l.right-l.left)*H(this,K,`f`),a=n?n[1]:(l.bottom-l.top)*H(this,K,`f`);if(r[e].persistent){let i=n?1:H(this,K,`f`),a=n?n[0]:l.right-l.left,o=n?n[1]:l.bottom-l.top;y.set(t,new Kn(H(this,W,`f`),a,o,i,r[e].float))}else v.set(t,Za(H(this,W,`f`),i,a,{float:r[e].float}))}let ae=[];for(let e=0;e<r.length;e++){let t=r[e],n=t.frag,i={...ie},a={};for(let[e,r]of v)e!==t.target&&n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:r.texture});for(let[e,t]of y)n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:t.texture});if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(i[e]={value:n()},a[e]=n):i[e]={value:n};let o=Qa(H(this,W,`f`),{vertexShader:t.vert,fragmentShader:n,uniforms:i,renderingToBuffer:t.target!==void 0,glslVersion:t.glslVersion});ae.push({pass:o,uniforms:i,uniformGenerators:{...g,...a},target:t.target,persistent:t.persistent,float:t.float,size:t.size,backbuffer:t.target?y.get(t.target):void 0})}let b=H(this,Oo,`f`),oe={type:p,element:e,isInViewport:!1,intersectionState:Wa(b),width:a.right-a.left,height:a.bottom-a.top,passes:ae,bufferTargets:v,startTime:b,enterTime:b,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:o,overflow:s,intersection:u,originalOpacity:d,srcTexture:f,zIndex:t.zIndex??0,backbuffer:_,autoCrop:ne};H(this,U,`m`,Qo).call(this,oe,a,b),H(this,U,`m`,Uo).call(this,oe,re)}async updateElementEffects(e,t){let n=H(this,q,`f`).find(t=>t.element===e);if(!n)throw Error(`[VFX-JS] updateElementEffects: element not registered`);if(!n.chain)throw Error(`[VFX-JS] updateElementEffects: element is on the shader path; effect-only updates are not supported`);let r=Array.isArray(t)?[...t]:[t],i=n.chain.effects,a=new Set(i),o=[];for(let e of r)if(!a.has(e)){if(H(this,So,`f`).has(e))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");o.push(e)}await n.chain.replaceEffects(r);let s=new Set(r);for(let e of i)s.has(e)||H(this,So,`f`).delete(e);for(let e of o)H(this,So,`f`).add(e)}removeElement(e){let t=H(this,q,`f`).findIndex(t=>t.element===e);if(t!==-1){let n=H(this,q,`f`).splice(t,1)[0];if(n.chain)H(this,U,`m`,Xo).call(this,n.chain.effects),n.chain.dispose();else{for(let e of n.bufferTargets.values())e.dispose();for(let e of n.passes)e.pass.dispose(),e.backbuffer?.dispose();n.backbuffer?.dispose()}n.srcTexture.dispose(),e.style.setProperty(`opacity`,n.originalOpacity.toString())}}updateTextElement(e){let t=H(this,q,`f`).findIndex(t=>t.element===e);return t===-1?Promise.resolve():H(this,U,`m`,Ho).call(this,H(this,q,`f`)[t])}async updateImageElement(e){let t=H(this,q,`f`).find(t=>t.element===e);if(t?.type!==`img`||t.isGif)return;let n=await An(m(e)),r=t.srcTexture,i=new D(H(this,W,`f`),n);i.wrapS=r.wrapS,i.wrapT=r.wrapT,i.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=i),t.srcTexture=i,r.dispose()}updateCanvasElement(e){let t=H(this,q,`f`).find(t=>t.element===e);if(t){let n=t.srcTexture,r=new D(H(this,W,`f`),e);r.wrapS=n.wrapS,r.wrapT=n.wrapT,r.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=r),t.srcTexture=r,n.dispose()}}updateHICTexture(e,t){let n=H(this,q,`f`).find(t=>t.element===e);if(n?.type!==`hic`)return;n.frozen&&us(e,t);let r=n.srcTexture;if(r.source===t)r.needsUpdate=!0;else{let e=new D(H(this,W,`f`),t);e.wrapS=r.wrapS,e.wrapT=r.wrapT,e.needsUpdate=!0,!n.chain&&n.passes.length>0&&(n.passes[0].uniforms.src.value=e),n.srcTexture=e,r.dispose()}}freezeInside(e){return H(this,Do,`f`).freezeInside(e,H(this,q,`f`))}isFrozen(e){return H(this,q,`f`).some(t=>t.element===e&&t.frozen)}forceRender(e){let t=H(this,q,`f`).find(t=>t.element===e);return!t||t.forceRender?()=>{}:(t.forceRender=!0,()=>{t.forceRender=!1})}get maxTextureSize(){return H(this,W,`f`).maxTextureSize}isPlaying(){return H(this,Eo,`f`)!==void 0}play(){this.isPlaying()||(V(this,Ao,Date.now()/1e3,`f`),V(this,Eo,requestAnimationFrame(H(this,Ko,`f`)),`f`))}get time(){return H(this,Oo,`f`)}setTime(e){V(this,Oo,e,`f`),V(this,jo,!0,`f`)}get timeScale(){return H(this,ko,`f`)}set timeScale(e){V(this,ko,e,`f`)}stop(){H(this,Eo,`f`)!==void 0&&(cancelAnimationFrame(H(this,Eo,`f`)),V(this,Eo,void 0,`f`))}render(){let e=Date.now()/1e3;H(this,jo,`f`)?V(this,jo,!1,`f`):V(this,Oo,H(this,Oo,`f`)+(e-H(this,Ao,`f`))*H(this,ko,`f`),`f`),V(this,Ao,e,`f`);let t=H(this,Oo,`f`),n=H(this,mo,`f`);H(this,U,`m`,zo).call(this),n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,H(this,po,`f`).width,H(this,po,`f`).height),n.clear(n.COLOR_BUFFER_BIT);let r=H(this,J,`f`).right-H(this,J,`f`).left,i=H(this,J,`f`).bottom-H(this,J,`f`).top,a=zn(0,0,r,i),o=H(this,U,`m`,Jo).call(this);o&&(H(this,U,`m`,os).call(this,r,i),H(this,G,`f`)&&(n.bindFramebuffer(n.FRAMEBUFFER,H(this,G,`f`).fbo),n.clear(n.COLOR_BUFFER_BIT),n.bindFramebuffer(n.FRAMEBUFFER,null)));for(let e of H(this,q,`f`)){if(e.frozen){Ka(e.intersectionState,t);continue}let n=e.element.getBoundingClientRect(),s=e.type===`text`?Ni(n):Mi(n),c=H(this,U,`m`,Qo).call(this,e,s,t);if(!c.isVisible)continue;if(e.chain){H(this,U,`m`,qo).call(this,e,s,c,t);continue}let l=e.passes[0].uniforms;l.time.value=t-e.startTime,l.resolution.value.set((s.right-s.left)*H(this,K,`f`),(s.bottom-s.top)*H(this,K,`f`)),l.mouse.value.set((H(this,Io,`f`)+H(this,Po,`f`))*H(this,K,`f`),(H(this,Lo,`f`)+H(this,Fo,`f`))*H(this,K,`f`));for(let t of e.passes)for(let[e,n]of Object.entries(t.uniformGenerators))t.uniforms[e].value=n();ss.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(l.src.value.needsUpdate=!0);let u=Rn(s,i,H(this,Po,`f`),H(this,Fo,`f`)),d=Rn(c.rectWithOverflow,i,H(this,Po,`f`),H(this,Fo,`f`));e.backbuffer&&(e.passes[0].uniforms.backbuffer.value=e.backbuffer.texture);{let t=e.isFullScreen?a:d,n=Math.max(1,t.w*H(this,K,`f`)),r=Math.max(1,t.h*H(this,K,`f`)),i=Math.max(1,t.w),o=Math.max(1,t.h);for(let t=0;t<e.passes.length-1;t++){let a=e.passes[t];if(!a.size){if(a.backbuffer)a.backbuffer.resize(i,o);else{let t=e.bufferTargets.get(a.target);t&&(t.width!==n||t.height!==r)&&t.setSize(n,r)}}}}let f=new Map;for(let t of e.passes)t.backbuffer&&t.target&&f.set(t.target,t.backbuffer.texture);let p=e.srcTexture;for(let t=0;t<e.passes.length-1;t++){let r=e.passes[t],i=e.isFullScreen?a:d;r.uniforms.src.value=p;for(let[e,t]of f)r.uniforms[e]&&(r.uniforms[e].value=t);for(let[e,t]of Object.entries(r.uniformGenerators))r.uniforms[e]&&(r.uniforms[e].value=t());let o=r.size?zn(0,0,r.size[0],r.size[1]):zn(0,0,i.w,i.h),s=ms(n,u,i,r.size,[H(this,Io,`f`),H(this,Lo,`f`)],[H(this,Po,`f`),H(this,Fo,`f`)],H(this,K,`f`));if(r.uniforms.resolution.value.set(...s.resolution),r.uniforms.offset.value.set(...s.offset),r.uniforms.mouse.value.set(...s.mouse),r.backbuffer)H(this,U,`m`,es).call(this,r.pass,r.backbuffer.target,o,r.uniforms,!0),r.backbuffer.swap(),p=r.backbuffer.texture;else{let t=e.bufferTargets.get(r.target);if(!t)continue;H(this,U,`m`,es).call(this,r.pass,t,o,r.uniforms,!0),p=t.texture}r.target&&f.set(r.target,p)}let m=e.passes[e.passes.length-1];m.uniforms.src.value=p,m.uniforms.resolution.value.set(n.width*H(this,K,`f`),n.height*H(this,K,`f`)),m.uniforms.offset.value.set(u.x*H(this,K,`f`),u.y*H(this,K,`f`)),m.uniforms.mouse.value.set((H(this,Io,`f`)+H(this,Po,`f`))*H(this,K,`f`),(H(this,Lo,`f`)+H(this,Fo,`f`))*H(this,K,`f`));for(let[e,t]of f)m.uniforms[e]&&(m.uniforms[e].value=t);for(let[e,t]of Object.entries(m.uniformGenerators))m.uniforms[e]&&(m.uniforms[e].value=t());e.backbuffer?(m.uniforms.backbuffer.value=e.backbuffer.texture,e.isFullScreen?(e.backbuffer.resize(r,i),H(this,U,`m`,ts).call(this,e,u.x,u.y),H(this,U,`m`,es).call(this,m.pass,e.backbuffer.target,a,m.uniforms,!0),e.backbuffer.swap(),H(this,_o,`f`).setUniforms(e.backbuffer.texture,H(this,K,`f`),a),H(this,U,`m`,es).call(this,H(this,_o,`f`).pass,o&&H(this,G,`f`)||null,a,H(this,_o,`f`).uniforms,!1)):(e.backbuffer.resize(d.w,d.h),H(this,U,`m`,ts).call(this,e,e.overflow.left,e.overflow.bottom),H(this,U,`m`,es).call(this,m.pass,e.backbuffer.target,e.backbuffer.getViewport(),m.uniforms,!0),e.backbuffer.swap(),H(this,_o,`f`).setUniforms(e.backbuffer.texture,H(this,K,`f`),d),H(this,U,`m`,es).call(this,H(this,_o,`f`).pass,o&&H(this,G,`f`)||null,d,H(this,_o,`f`).uniforms,!1))):(H(this,U,`m`,ts).call(this,e,u.x,u.y),H(this,U,`m`,es).call(this,m.pass,o&&H(this,G,`f`)||null,e.isFullScreen?a:d,m.uniforms,!1))}o&&H(this,G,`f`)&&(H(this,bo,`f`)&&H(this,xo,`f`)?H(this,U,`m`,is).call(this,a,t):H(this,U,`m`,as).call(this,a,t))}};fo=new WeakMap,po=new WeakMap,W=new WeakMap,mo=new WeakMap,ho=new WeakMap,go=new WeakMap,_o=new WeakMap,vo=new WeakMap,G=new WeakMap,yo=new WeakMap,bo=new WeakMap,xo=new WeakMap,So=new WeakMap,Co=new WeakMap,wo=new WeakMap,To=new WeakMap,Eo=new WeakMap,K=new WeakMap,q=new WeakMap,Do=new WeakMap,Oo=new WeakMap,ko=new WeakMap,Ao=new WeakMap,jo=new WeakMap,J=new WeakMap,Mo=new WeakMap,No=new WeakMap,Po=new WeakMap,Fo=new WeakMap,Io=new WeakMap,Lo=new WeakMap,Ro=new WeakMap,Bo=new WeakMap,Vo=new WeakMap,Ko=new WeakMap,U=new WeakSet,zo=function(){if(typeof window>`u`)return;let e=H(this,po,`f`).ownerDocument,t=e.compatMode===`BackCompat`?e.body:e.documentElement,n=t.clientWidth,r=t.clientHeight,i=window.scrollX,a=window.scrollY,o,s;if(H(this,fo,`f`).fixedCanvas)o=0,s=0;else if(H(this,fo,`f`).wrapper)o=n*H(this,fo,`f`).scrollPadding[0],s=r*H(this,fo,`f`).scrollPadding[1];else{let t=e.body.scrollWidth-(i+n),c=e.body.scrollHeight-(a+r);o=xs(n*H(this,fo,`f`).scrollPadding[0],0,t),s=xs(r*H(this,fo,`f`).scrollPadding[1],0,c)}let c=n+o*2,l=r+s*2;(c!==H(this,No,`f`)[0]||l!==H(this,No,`f`)[1])&&(H(this,po,`f`).style.width=`${c}px`,H(this,po,`f`).style.height=`${l}px`,H(this,W,`f`).setSize(c,l,H(this,K,`f`)),V(this,J,ji({top:-s,left:-o,right:n+o,bottom:r+s}),`f`),V(this,Mo,ji({top:0,left:0,right:n,bottom:r}),`f`),V(this,No,[c,l],`f`),V(this,Po,o,`f`),V(this,Fo,s,`f`)),H(this,fo,`f`).fixedCanvas||H(this,po,`f`).style.setProperty(`transform`,`translate(${i-o}px, ${a-s}px)`)},Ho=async function(e){if(!H(this,Ro,`f`).get(e.element)){H(this,Ro,`f`).set(e.element,!0);try{let t=e.srcTexture,n=t.source instanceof OffscreenCanvas?t.source:void 0,r=await gr(e.element,e.originalOpacity,n,this.maxTextureSize);if(r.width===0||r.height===0)return;let i=new D(H(this,W,`f`),r);i.wrapS=t.wrapS,i.wrapT=t.wrapT,i.needsUpdate=!0,!e.chain&&e.passes.length>0&&(e.passes[0].uniforms.src.value=i),e.srcTexture=i,t.dispose()}catch(e){console.error(e)}finally{H(this,Ro,`f`).set(e.element,!1)}}},Uo=function(e,t){!H(this,Do,`f`).adopt(e,t)&&t!==null&&e.element.style.setProperty(`opacity`,t),H(this,q,`f`).push(e),H(this,q,`f`).sort((e,t)=>e.zIndex-t.zIndex)},Wo=async function(e,t,n,r){t.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified; `effect` takes precedence."),t.overflow!==void 0&&console.warn("[VFX-JS] `overflow` is shader-path only and is ignored by the effect path. Use each effect's own `outputRect` (with `dims.canvasRect` for fullscreen) to control its dst rect.");let i=Array.isArray(n)?[...n]:[n];H(this,U,`m`,Yo).call(this,i);let a=e.getBoundingClientRect(),o=ws(e)?Ni(a):Mi(a),[s,l]=ps(t.overflow),u=_s(t.intersection),d=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),f,p,h=!1;if(e instanceof HTMLImageElement){p=`img`;let t=m(e);if(h=!!t.match(/\.gif/i),h){let n=await ka.create(t,H(this,K,`f`));ss.set(e,n),f=new D(H(this,W,`f`),n.getCanvas())}else{let e=await An(t);f=new D(H(this,W,`f`),e)}}else if(e instanceof HTMLVideoElement)f=new D(H(this,W,`f`),e),p=`video`;else if(e instanceof HTMLCanvasElement)c(e)&&r?(f=new D(H(this,W,`f`),r),p=`hic`):(f=new D(H(this,W,`f`),e),p=`canvas`);else{let t=await gr(e,d,void 0,this.maxTextureSize);f=new D(H(this,W,`f`),t),p=`text`}let[ee,te]=bs(t.wrap);f.wrapS=ee,f.wrapT=te,f.needsUpdate=!0;let ne=t.autoCrop??!0,re=ls(p,t.overlay),ie=H(this,Oo,`f`),g={type:p,element:e,isInViewport:!1,intersectionState:Wa(ie),width:o.right-o.left,height:o.bottom-o.top,passes:[],bufferTargets:new Map,startTime:ie,enterTime:ie,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:s,overflow:l,intersection:u,originalOpacity:d,srcTexture:f,zIndex:t.zIndex??0,backbuffer:void 0,autoCrop:ne,effectLastRenderTime:ie},_=Ti(()=>g.srcTexture,()=>vs(g.srcTexture,`w`),()=>vs(g.srcTexture,`h`)),v={},y={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(y[e]=n,v[e]=n()):v[e]=n;g.effectUniformGenerators=y,g.effectStaticUniforms=v;let ae={autoCrop:ne,glslVersion:t.glslVersion??`300 es`},b=new la(H(this,W,`f`),H(this,ho,`f`),H(this,K,`f`),i,ae,_,!1,H(this,go,`f`));try{await b.initAll()}catch(t){throw H(this,U,`m`,Xo).call(this,i),f.dispose(),e.style.setProperty(`opacity`,d.toString()),t}g.chain=b,H(this,U,`m`,Qo).call(this,g,o,ie),H(this,U,`m`,Uo).call(this,g,re)},Go=function(e){let t=t=>t.glslVersion===void 0&&e.glslVersion!==void 0?{...t,glslVersion:e.glslVersion}:t;return Array.isArray(e.shader)?e.shader.map(t):[t({frag:H(this,U,`m`,$o).call(this,e.shader||`uvGradient`)})]},qo=function(e,t,n,r){let i=e.chain;if(!i)return;let a=H(this,K,`f`);ss.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(e.srcTexture.needsUpdate=!0);let o={...e.effectStaticUniforms??{}};if(e.effectUniformGenerators)for(let[t,n]of Object.entries(e.effectUniformGenerators))o[t]=n();let s=H(this,J,`f`).right-H(this,J,`f`).left,c=H(this,J,`f`).bottom-H(this,J,`f`).top,l=Rn(t,c,H(this,Po,`f`),H(this,Fo,`f`)),u=H(this,Io,`f`)+H(this,Po,`f`)-l.x,d=H(this,Lo,`f`)+H(this,Fo,`f`)-l.y,f=t.right-t.left,p=t.bottom-t.top,m=r-(e.effectLastRenderTime??r);e.effectLastRenderTime=r;let h=H(this,U,`m`,Jo).call(this)&&H(this,G,`f`)?Di(H(this,G,`f`)):null;i.run({time:r-e.startTime,deltaTime:m,mouse:[u*a,d*a],mouseViewport:[H(this,Io,`f`)*a,H(this,Lo,`f`)*a],intersection:n.intersection,enterTime:Cs(r-e.enterTime),leaveTime:Cs(r-e.leaveTime),enterProgress:n.enterProgress,leaveProgress:n.leaveProgress,resolvedUniforms:o,canvasSize:[s,c],canvasBufferSize:[s*a,c*a],elementSize:[f,p],elementBufferSize:[f*a,p*a],elementRectOnCanvasPx:{x:l.x*a,y:l.y*a,w:l.w*a,h:l.h*a},finalTarget:h,isVisible:n.isVisible})},Jo=function(){return H(this,vo,`f`).length>0||H(this,bo,`f`)!==null&&H(this,xo,`f`)},Yo=function(e){for(let t of e)if(H(this,So,`f`).has(t))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");for(let t of e)H(this,So,`f`).add(t)},Xo=function(e){for(let t of e)H(this,So,`f`).delete(t)},Zo=function(e){let t=e.hitTestPadBuffer,n=H(this,K,`f`);return ki({top:t.top/n,right:t.right/n,bottom:t.bottom/n,left:t.left/n})},Qo=function(e,t,n){let r=Pi(t,e.chain?H(this,U,`m`,Zo).call(this,e.chain):e.overflow),i=e.isFullScreen||fs(H(this,Mo,`f`),r),a=Pi(H(this,Mo,`f`),e.intersection.rootMargin),o=Li(a,t);hs(e,o,fs(a,t),n);let{enterProgress:s,leaveProgress:c}=e.intersectionState;e.isInViewport=i;let l=i&&n-e.leaveTime<=e.release||e.forceRender===!0&&t.right>t.left&&t.bottom>t.top;return l&&!e.chain&&e.passes.length>0&&gs(e.passes[0].uniforms,e,o,n),{isVisible:l,intersection:o,rectWithOverflow:r,enterProgress:s,leaveProgress:c}},$o=function(e){return e in s?s[e]:e},es=function(e,t,n,r,i){let a=H(this,mo,`f`);i&&t!==null&&t!==H(this,G,`f`)&&(a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.viewport(0,0,t.width,t.height),a.clear(a.COLOR_BUFFER_BIT));let o=r.viewport;o&&o.value instanceof Jn&&o.value.set(n.x*H(this,K,`f`),n.y*H(this,K,`f`),n.w*H(this,K,`f`),n.h*H(this,K,`f`));try{fr(a,H(this,ho,`f`),e,t,n,H(this,No,`f`)[0],H(this,No,`f`)[1],H(this,K,`f`))}catch(e){console.error(e)}},ts=function(e,t,n){let r=e.passes[0].uniforms.offset.value;r.x=t*H(this,K,`f`),r.y=n*H(this,K,`f`)},ns=function(e){let t=e.length===1&&!(`frag`in e[0])?e[0]:null;if(t&&t.effect!==void 0){H(this,U,`m`,rs).call(this,t,t.effect);return}let n=[],r=[];for(let t of e)`frag`in t&&r.push(t);for(let e=0;e<r.length-1;e++)r[e].target||(r[e]={...r[e],target:`pass${e}`});for(let t of e){let e,r,i;if(`frag`in t)e=t.frag,r=new ao(H(this,W,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,t.size,t.target!==void 0,t.glslVersion),i=t.target;else{if(t.shader===void 0)throw Error("VFXPostEffect requires `shader` (the `effect` path is not implemented yet).");e=H(this,U,`m`,$o).call(this,t.shader),r=new ao(H(this,W,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,void 0,!1,t.glslVersion),t.persistent&&r.registerBufferUniform(`backbuffer`),i=void 0}n.push(e);let a={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`&&(a[e]=n);H(this,vo,`f`).push({pass:r,target:i,generators:a})}for(let e of r)e.target&&H(this,yo,`f`).set(e.target,void 0);let i=H(this,vo,`f`).map(e=>e.target).filter(e=>e!==void 0);for(let e=0;e<H(this,vo,`f`).length;e++)for(let t of i)n[e].match(RegExp(`uniform\\s+sampler2D\\s+${t}\\b`))&&H(this,vo,`f`)[e].pass.registerBufferUniform(t)},rs=function(e,t){e.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified on post-effect; `effect` takes precedence.");let n=Array.isArray(t)?[...t]:[t];H(this,U,`m`,Yo).call(this,n);let r=Ti(()=>{let e=H(this,G,`f`);if(!e)throw Error(`[VFX-JS] post-effect chain active without target`);return e.texture},()=>H(this,G,`f`)?.width??0,()=>H(this,G,`f`)?.height??0),i={autoCrop:!0,glslVersion:e.glslVersion??`300 es`},a=new la(H(this,W,`f`),H(this,ho,`f`),H(this,K,`f`),n,i,r,!0,H(this,go,`f`));if(e.uniforms)for(let[t,n]of Object.entries(e.uniforms))typeof n==`function`?(H(this,wo,`f`)[t]=n,H(this,Co,`f`)[t]=n()):H(this,Co,`f`)[t]=n;V(this,bo,a,`f`),V(this,To,H(this,Oo,`f`),`f`),a.initAll().then(()=>{H(this,bo,`f`)===a&&V(this,xo,!0,`f`)}).catch(e=>{console.error(`[VFX-JS] Post-effect init failed; post-effect disabled:`,e),H(this,bo,`f`)===a&&(H(this,U,`m`,Xo).call(this,H(this,bo,`f`).effects),H(this,bo,`f`).dispose(),V(this,bo,null,`f`),V(this,xo,!1,`f`))})},is=function(e,t){let n=H(this,bo,`f`);if(!n)return;let r=H(this,K,`f`),i={...H(this,Co,`f`)};for(let[e,t]of Object.entries(H(this,wo,`f`)))i[e]=t();let a=H(this,J,`f`).right-H(this,J,`f`).left,o=H(this,J,`f`).bottom-H(this,J,`f`).top,s=t-H(this,To,`f`);V(this,To,t,`f`);let c=[a,o],l=[a*r,o*r],u={x:e.x*r,y:e.y*r,w:e.w*r,h:e.h*r};n.run({time:t,deltaTime:s,mouse:[H(this,Io,`f`)*r,H(this,Lo,`f`)*r],mouseViewport:[H(this,Io,`f`)*r,H(this,Lo,`f`)*r],intersection:1,enterTime:0,leaveTime:0,enterProgress:1,leaveProgress:0,resolvedUniforms:i,canvasSize:c,canvasBufferSize:l,elementSize:c,elementBufferSize:l,elementRectOnCanvasPx:u,finalTarget:null,isVisible:!0})},as=function(e,t){if(!H(this,G,`f`))return;let n=H(this,G,`f`).texture,r=new Map;for(let{pass:e,target:t}of H(this,vo,`f`))t&&e.backbuffer&&r.set(t,e.backbuffer.texture);for(let i=0;i<H(this,vo,`f`).length;i++){let{pass:a,target:o,generators:s}=H(this,vo,`f`)[i],c=i===H(this,vo,`f`).length-1,l=H(this,Io,`f`)+H(this,Po,`f`),u=H(this,Lo,`f`)+H(this,Fo,`f`),d=a.size;if(d){let[r,i]=d;a.uniforms.src.value=n,a.uniforms.resolution.value.set(r,i),a.uniforms.offset.value.set(0,0),a.uniforms.time.value=t,a.uniforms.mouse.value.set(l/e.w*r,u/e.h*i)}else a.setUniforms(n,H(this,K,`f`),e,t,l,u);a.uniforms.passIndex.value=i,a.updateCustomUniforms(s);for(let[e,t]of r){let n=a.uniforms[e];n&&(n.value=t)}if(c)a.backbuffer?(a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture),H(this,U,`m`,es).call(this,a.pass,a.backbuffer.target,e,a.uniforms,!0),a.backbuffer.swap(),H(this,_o,`f`).setUniforms(a.backbuffer.texture,H(this,K,`f`),e),H(this,U,`m`,es).call(this,H(this,_o,`f`).pass,null,e,H(this,_o,`f`).uniforms,!1)):H(this,U,`m`,es).call(this,a.pass,null,e,a.uniforms,!1);else if(a.backbuffer){a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture);let t=d?zn(0,0,d[0]/H(this,K,`f`),d[1]/H(this,K,`f`)):e;H(this,U,`m`,es).call(this,a.pass,a.backbuffer.target,t,a.uniforms,!0),a.backbuffer.swap(),n=a.backbuffer.texture,o&&r.set(o,a.backbuffer.texture)}else{let t=o??`postEffect${i}`,s=H(this,yo,`f`).get(t),c=d?d[0]:e.w*H(this,K,`f`),l=d?d[1]:e.h*H(this,K,`f`);s&&s.width===c&&s.height===l||(s?.dispose(),s=Za(H(this,W,`f`),c,l,{float:a.float}),H(this,yo,`f`).set(t,s));let u=d?zn(0,0,d[0]/H(this,K,`f`),d[1]/H(this,K,`f`)):e;H(this,U,`m`,es).call(this,a.pass,s,u,a.uniforms,!0),n=s.texture,o&&r.set(o,s.texture)}}},os=function(e,t){let n=e*H(this,K,`f`),r=t*H(this,K,`f`);H(this,G,`f`)&&H(this,G,`f`).width===n&&H(this,G,`f`).height===r||(H(this,G,`f`)?.dispose(),V(this,G,Za(H(this,W,`f`),n,r),`f`));for(let{pass:n}of H(this,vo,`f`))n.persistent&&!n.backbuffer?n.initializeBackbuffer(H(this,W,`f`),e,t,H(this,K,`f`)):n.backbuffer&&n.resizeBackbuffer(e,t)};function fs(e,t){return t.left<=e.right&&t.right>=e.left&&t.top<=e.bottom&&t.bottom>=e.top}function ps(e){return e===!0?[!0,Ai]:e===void 0?[!1,Ai]:[!1,ki(e)]}function ms(e,t,n,r,i,a,o){let s=i[0]+a[0]-n.x,c=i[1]+a[1]-n.y;return r?{resolution:[r[0],r[1]],offset:[0,0],mouse:[s/n.w*r[0],c/n.h*r[1]]}:{resolution:[e.width*o,e.height*o],offset:[(t.x-n.x)*o,(t.y-n.y)*o],mouse:[s*o,c*o]}}function hs(e,t,n,r){let i=e.intersectionState,a=i.isIn,o=e.isFullScreen||Ga(i,t,n,e.intersection.threshold,e.intersection.leaveThreshold);!a&&o&&(e.enterTime=r,e.leaveTime=1/0),a&&!o&&(e.leaveTime=r),qa(i,o,r,e.intersection.duration)}function gs(e,t,n,r){e.intersection.value=n,e.enterTime.value=Cs(r-t.enterTime),e.leaveTime.value=Cs(r-t.leaveTime),e.enterProgress.value=t.intersectionState.enterProgress,e.leaveProgress.value=t.intersectionState.leaveProgress}function _s(e){let t=e?.threshold??0,n=ki(e?.rootMargin??0),r=e?.leaveThreshold??t,i=e?.duration??1;return Number.isFinite(i)&&i>0||(cs||(cs=!0,console.warn(`[VFX-JS] \`intersection.duration\` must be a finite number above 0, got ${i}. Using 1 instead.`)),i=1),{threshold:t,leaveThreshold:r,rootMargin:n,duration:i}}function vs(e,t){let n=e.source;if(!n)return 0;if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return t===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return t===`w`?n.videoWidth:n.videoHeight;let r=n;return t===`w`?r.width:r.height}function ys(e){return e===`repeat`?`repeat`:e===`mirror`?`mirror`:`clamp`}function bs(e){if(!e)return[`clamp`,`clamp`];if(Array.isArray(e))return[ys(e[0]),ys(e[1])];let t=ys(e);return[t,t]}function xs(e,t,n){return Math.max(t,Math.min(n,e))}var Ss=1e6;function Cs(e){return xs(e,-1e6,Ss)}function ws(e){return!(e instanceof HTMLImageElement||e instanceof HTMLVideoElement||e instanceof HTMLCanvasElement)}function Ts(){try{let e=document.createElement(`canvas`);return(e.getContext(`webgl2`)||e.getContext(`webgl`))!==null}catch{return!1}}var Es=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Y=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ds,X,Os,ks,As,js,Ms,Ns,Ps,Fs,Is,Ls;function Rs(){if(typeof window>`u`)throw`Cannot find 'window'. VFX-JS only runs on the browser.`;if(typeof document>`u`)throw`Cannot find 'document'. VFX-JS only runs on the browser.`}function zs(e){return{position:e?`fixed`:`absolute`,top:0,left:0,width:`0px`,height:`0px`,"z-index":9999,"pointer-events":`none`}}var Bs=class e{static init(t){try{return new e(t)}catch{return null}}constructor(e={}){if(Ds.add(this),X.set(this,void 0),Os.set(this,void 0),ks.set(this,new Map),As.set(this,new Set),Rs(),!Ts())throw Error(`[VFX-JS] WebGL is not available in this environment.`);let t=_n(e),n=document.createElement(`canvas`),r=zs(t.fixedCanvas);for(let[e,t]of Object.entries(r))n.style.setProperty(e,t.toString());t.zIndex!==void 0&&n.style.setProperty(`z-index`,t.zIndex.toString()),(t.wrapper??document.body).appendChild(n),Es(this,Os,n,`f`),Es(this,X,new ds(t,n),`f`),t.autoplay&&Y(this,X,`f`).play()}async add(e,t,n){e instanceof HTMLImageElement?await Y(this,Ds,`m`,Ps).call(this,e,t):e instanceof HTMLVideoElement?await Y(this,Ds,`m`,Fs).call(this,e,t):e instanceof HTMLCanvasElement?c(e)&&n?await Y(this,Ds,`m`,Ns).call(this,e,t,n):await Y(this,Ds,`m`,Is).call(this,e,t):await Y(this,Ds,`m`,Ls).call(this,e,t)}updateHICTexture(e,t){Y(this,X,`f`).updateHICTexture(e,t)}get maxTextureSize(){return Y(this,X,`f`).maxTextureSize}get canvas(){return Y(this,Os,`f`)}addHTML(e,t){return Y(this,Ds,`m`,js).call(this,e,t,!1)}addHTMLWithStill(e,t){return Y(this,Ds,`m`,js).call(this,e,t,!0)}addTransition(e,t={}){let n=new gn(this,e,t,()=>Y(this,As,`f`).delete(n));return Y(this,As,`f`).add(n),n}freezeInside(e){return Y(this,X,`f`).freezeInside(e)}lockSize(e){let t=Y(this,ks,`f`).get(e);return t?we(t):()=>{}}forceRender(e){let t=Y(this,ks,`f`).get(e)??e;return Y(this,X,`f`).forceRender(t)}remove(e){let t=Y(this,ks,`f`).get(e);t?(Me(t,e),Y(this,ks,`f`).delete(e),Y(this,X,`f`).removeElement(t)):Y(this,X,`f`).removeElement(e)}updateEffects(e,t){let n=Y(this,ks,`f`).get(e)??e;return Y(this,X,`f`).updateElementEffects(n,t)}async update(e){await this.updateInTime(e)}async updateInTime(e){let t=Y(this,ks,`f`).get(e)??(e instanceof HTMLCanvasElement?e:null);return(t?Ce(t):void 0)||(e instanceof HTMLImageElement?await Y(this,X,`f`).updateImageElement(e):e instanceof HTMLCanvasElement?Y(this,X,`f`).updateCanvasElement(e):await Y(this,X,`f`).updateTextElement(e),!0)}play(){Y(this,X,`f`).play()}stop(){Y(this,X,`f`).stop()}render(){Y(this,X,`f`).render()}get time(){return Y(this,X,`f`).time}setTime(e){Y(this,X,`f`).setTime(e)}get timeScale(){return Y(this,X,`f`).timeScale}set timeScale(e){Y(this,X,`f`).timeScale=e}destroy(){for(let e of Y(this,As,`f`))e.destroy();Y(this,As,`f`).clear();for(let[e,t]of Y(this,ks,`f`))Me(t,e);Y(this,ks,`f`).clear(),Y(this,X,`f`).destroy(),Y(this,Os,`f`).remove()}};X=new WeakMap,Os=new WeakMap,ks=new WeakMap,As=new WeakMap,Ds=new WeakSet,js=async function(e,t,n){if(!Pe())return console.warn(`html-in-canvas not supported, falling back to dom-to-canvas`),this.add(e,t);t.overlay!==void 0&&console.warn(`addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.`);let{overlay:r,...i}=t,a=Y(this,ks,`f`).get(e);a&&Y(this,X,`f`).removeElement(a);let{canvas:o,initialCapture:s}=await je(e,{onCapture:e=>{Y(this,X,`f`).updateHICTexture(o,e)},maxSize:Y(this,X,`f`).maxTextureSize,stillCover:n?{zIndex:Y(this,Ds,`m`,Ms).call(this)}:void 0});a=o,Y(this,ks,`f`).set(e,a),await Y(this,Ds,`m`,Ns).call(this,a,i,s)},Ms=function(){let e=Number.parseInt(Y(this,Os,`f`).style.zIndex,10);return Number.isNaN(e)?9998:e-1},Ns=async function(e,t,n){try{await Y(this,X,`f`).addElement(e,t,n)}finally{Ee(e,Y(this,X,`f`).isFrozen(e))}},Ps=function(e,t){return e.complete?Y(this,X,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`load`,()=>{Y(this,X,`f`).addElement(e,t),n()},{once:!0})})},Fs=function(e,t){return e.readyState>=3?Y(this,X,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`canplay`,()=>{Y(this,X,`f`).addElement(e,t),n()},{once:!0})})},Is=function(e,t){return Y(this,X,`f`).addElement(e,t)},Ls=function(e,t){return Y(this,X,`f`).addElement(e,t)};function Vs(e,t){if(e===`fullscreen`)return t.canvasRect;let n=e*t.pixelRatio,[,,r,i]=t.contentRect;return[-n,-n,r+2*n,i+2*n]}var Hs=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Z=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Us,Q,$,Ws,Gs,Ks,qs,Js,Ys=`#version 300 es
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
`,Xs=`#version 300 es
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
`,Zs=`#version 300 es
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
`,Qs=`#version 300 es
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
`,$s={threshold:.7,softness:.1,intensity:1.2,scatter:.7,pad:50,dither:0,edgeFade:.02},ec=.5,tc=class{constructor(e={}){Us.add(this),Q.set(this,null),$.set(this,[]),Ws.set(this,[]),Gs.set(this,!1),Ks.set(this,0),qs.set(this,0),this.params={...$s,...e}}setParams(e){Object.assign(this.params,e)}init(e){Hs(this,Q,e.createRenderTarget({float:!0}),`f`)}render(e){if(!Z(this,Q,`f`))return;let{threshold:t,softness:n,intensity:r}=this.params,i=Math.min(Math.max(this.params.scatter,0),1),a=Math.max(0,this.params.dither),o=Math.max(1e-6,this.params.edgeFade);(Z(this,Q,`f`).width!==Z(this,Ks,`f`)||Z(this,Q,`f`).height!==Z(this,qs,`f`))&&(Z(this,$,`f`).length=0,Z(this,Ws,`f`).length=0,Hs(this,Gs,!1,`f`),Hs(this,Ks,Z(this,Q,`f`).width,`f`),Hs(this,qs,Z(this,Q,`f`).height,`f`)),Z(this,Us,`m`,Js).call(this,e,Z(this,Q,`f`).width,Z(this,Q,`f`).height);let s=Z(this,$,`f`).length;if(s===0)return;e.draw({frag:Ys,uniforms:{src:e.src,threshold:t,softness:n,edgeFade:o},target:Z(this,Q,`f`)}),e.draw({frag:Xs,uniforms:{src:Z(this,Q,`f`),texelSize:[1/Z(this,Q,`f`).width,1/Z(this,Q,`f`).height],karis:1},target:Z(this,$,`f`)[0]});for(let t=1;t<s;t++){let n=Z(this,$,`f`)[t-1];e.draw({frag:Xs,uniforms:{src:n,texelSize:[1/n.width,1/n.height],karis:0},target:Z(this,$,`f`)[t]})}let c=Z(this,Q,`f`).width,l=Z(this,Q,`f`).height,u=1+i*Math.max(0,s-1),d=e=>Math.min(1,Math.max(0,u-e));for(let t=s-2;t>=0;t--){let n=t===s-2?Z(this,$,`f`)[s-1]:Z(this,Ws,`f`)[t+1],r=2**(t+2),i=t===s-2?d(s-1):1;e.draw({frag:Zs,uniforms:{srcSmall:n,srcLarge:Z(this,$,`f`)[t],texelSize:[ec*r/c,ec*r/l],weightLarge:d(t),weightSmall:i},target:Z(this,Ws,`f`)[t]})}let f=s>=2?Z(this,Ws,`f`)[0]:Z(this,$,`f`)[0],p=r/Math.max(1,u);e.draw({frag:Qs,uniforms:{src:e.src,bloom:f,texelSize:[ec*2/c,ec*2/l],intensity:p,dither:a,edgeFade:o},target:e.target})}outputRect(e){return Vs(this.params.pad,e)}dispose(){Hs(this,Q,null,`f`),Z(this,$,`f`).length=0,Z(this,Ws,`f`).length=0,Hs(this,Gs,!1,`f`),Hs(this,Ks,0,`f`),Hs(this,qs,0,`f`)}};Q=new WeakMap,$=new WeakMap,Ws=new WeakMap,Gs=new WeakMap,Ks=new WeakMap,qs=new WeakMap,Us=new WeakSet,Js=function(e,t,n){if(Z(this,Gs,`f`))return;let r=Math.max(1,Math.floor(t/2)),i=Math.max(1,Math.floor(n/2));for(let t=0;t<8;t++){Z(this,$,`f`).push(e.createRenderTarget({size:[r,i],float:!0}));let t=Math.max(1,Math.floor(r/2)),n=Math.max(1,Math.floor(i/2));if(t===r&&n===i)break;r=t,i=n}for(let t=0;t<Z(this,$,`f`).length-1;t++)Z(this,Ws,`f`).push(e.createRenderTarget({size:[Z(this,$,`f`)[t].width,Z(this,$,`f`)[t].height],float:!0}));Hs(this,Gs,!0,`f`)};var nc={pure:{cyan:[0,1,1,1],magenta:[1,0,1,1],yellow:[1,1,0,1],black:[0,0,0,1],red:[1,0,0,1],green:[0,1,0,1],blue:[0,0,1,1]},newsprint:{cyan:[.15,.73,.88,1],magenta:[.88,.12,.55,1],yellow:[.97,.93,.08,1],black:[.1,.1,.1,1]},fogra51:{cyan:[0,.525,.765,1],magenta:[.827,0,.486,1],yellow:[.984,.91,0,1],black:[.145,.145,.145,1]},swop:{cyan:[0,.557,.769,1],magenta:[.827,.02,.478,1],yellow:[.984,.902,.027,1],black:[.169,.169,.169,1]}};({...nc.pure,...nc.newsprint});var rc=.7,ic=1.3,ac=`
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
`;new Float32Array([-.5,-.5,.5,-.5,.5,.5,-.5,-.5,.5,.5,-.5,.5]);var oc=`
float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`,sc=4096,cc=new Float32Array(sc);for(let e=0;e<sc;e++)cc[e]=e;`${oc}${ac}${rc.toFixed(4)}${ic.toFixed(4)}`;var lc=`#version 300 es
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
`,uc={size:10},dc=class{constructor(e={}){this.params={...uc,...e}}setParams(e){Object.assign(this.params,e)}render(e){let[t,n]=e.dims.element,{size:r}=this.params;e.draw({frag:lc,uniforms:{src:e.src,cellUv:[r/(t||1),r/(n||1)]},target:e.target})}},fc=`#version 300 es
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
`,pc={spacing:4},mc=class{constructor(e={}){this.params={...pc,...e}}setParams(e){Object.assign(this.params,e)}render(e){let{spacing:t}=this.params;e.draw({frag:fc,uniforms:{src:e.src,innerHeight:e.dims.element[1]||1,spacing:t},target:e.target})}},hc=e(t(((e,t)=>{var n=function(e){var t=/(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i,n=0,r={},i={manual:e.Prism&&e.Prism.manual,disableWorkerMessageHandler:e.Prism&&e.Prism.disableWorkerMessageHandler,util:{encode:function e(t){return t instanceof a?new a(t.type,e(t.content),t.alias):Array.isArray(t)?t.map(e):t.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/\u00a0/g,` `)},type:function(e){return Object.prototype.toString.call(e).slice(8,-1)},objId:function(e){return e.__id||Object.defineProperty(e,"__id",{value:++n}),e.__id},clone:function e(t,n){n||={};var r,a;switch(i.util.type(t)){case`Object`:if(a=i.util.objId(t),n[a])return n[a];for(var o in r={},n[a]=r,t)t.hasOwnProperty(o)&&(r[o]=e(t[o],n));return r;case`Array`:return a=i.util.objId(t),n[a]?n[a]:(r=[],n[a]=r,t.forEach(function(t,i){r[i]=e(t,n)}),r);default:return t}},getLanguage:function(e){for(;e;){var n=t.exec(e.className);if(n)return n[1].toLowerCase();e=e.parentElement}return`none`},setLanguage:function(e,n){e.className=e.className.replace(RegExp(t,`gi`),``),e.classList.add(`language-`+n)},currentScript:function(){if(typeof document>`u`)return null;if(document.currentScript&&document.currentScript.tagName===`SCRIPT`)return document.currentScript;try{throw Error()}catch(r){var e=(/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(r.stack)||[])[1];if(e){var t=document.getElementsByTagName(`script`);for(var n in t)if(t[n].src==e)return t[n]}return null}},isActive:function(e,t,n){for(var r=`no-`+t;e;){var i=e.classList;if(i.contains(t))return!0;if(i.contains(r))return!1;e=e.parentElement}return!!n}},languages:{plain:r,plaintext:r,text:r,txt:r,extend:function(e,t){var n=i.util.clone(i.languages[e]);for(var r in t)n[r]=t[r];return n},insertBefore:function(e,t,n,r){r||=i.languages;var a=r[e],o={};for(var s in a)if(a.hasOwnProperty(s)){if(s==t)for(var c in n)n.hasOwnProperty(c)&&(o[c]=n[c]);n.hasOwnProperty(s)||(o[s]=a[s])}var l=r[e];return r[e]=o,i.languages.DFS(i.languages,function(t,n){n===l&&t!=e&&(this[t]=o)}),o},DFS:function e(t,n,r,a){a||={};var o=i.util.objId;for(var s in t)if(t.hasOwnProperty(s)){n.call(t,s,t[s],r||s);var c=t[s],l=i.util.type(c);l===`Object`&&!a[o(c)]?(a[o(c)]=!0,e(c,n,null,a)):l===`Array`&&!a[o(c)]&&(a[o(c)]=!0,e(c,n,s,a))}}},plugins:{},highlightAll:function(e,t){i.highlightAllUnder(document,e,t)},highlightAllUnder:function(e,t,n){var r={callback:n,container:e,selector:`code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code`};i.hooks.run(`before-highlightall`,r),r.elements=Array.prototype.slice.apply(r.container.querySelectorAll(r.selector)),i.hooks.run(`before-all-elements-highlight`,r);for(var a=0,o;o=r.elements[a++];)i.highlightElement(o,t===!0,r.callback)},highlightElement:function(t,n,r){var a=i.util.getLanguage(t),o=i.languages[a];i.util.setLanguage(t,a);var s=t.parentElement;s&&s.nodeName.toLowerCase()===`pre`&&i.util.setLanguage(s,a);var c={element:t,language:a,grammar:o,code:t.textContent};function l(e){c.highlightedCode=e,i.hooks.run(`before-insert`,c),c.element.innerHTML=c.highlightedCode,i.hooks.run(`after-highlight`,c),i.hooks.run(`complete`,c),r&&r.call(c.element)}if(i.hooks.run(`before-sanity-check`,c),s=c.element.parentElement,s&&s.nodeName.toLowerCase()===`pre`&&!s.hasAttribute(`tabindex`)&&s.setAttribute(`tabindex`,`0`),!c.code)i.hooks.run(`complete`,c),r&&r.call(c.element);else if(i.hooks.run(`before-highlight`,c),!c.grammar)l(i.util.encode(c.code));else if(n&&e.Worker){var u=new Worker(i.filename);u.onmessage=function(e){l(e.data)},u.postMessage(JSON.stringify({language:c.language,code:c.code,immediateClose:!0}))}else l(i.highlight(c.code,c.grammar,c.language))},highlight:function(e,t,n){var r={code:e,grammar:t,language:n};if(i.hooks.run(`before-tokenize`,r),!r.grammar)throw Error(`The language "`+r.language+`" has no grammar.`);return r.tokens=i.tokenize(r.code,r.grammar),i.hooks.run(`after-tokenize`,r),a.stringify(i.util.encode(r.tokens),r.language)},tokenize:function(e,t){var n=t.rest;if(n){for(var r in n)t[r]=n[r];delete t.rest}var i=new c;return l(i,i.head,e),s(e,i,t,i.head,0),d(i)},hooks:{all:{},add:function(e,t){var n=i.hooks.all;n[e]=n[e]||[],n[e].push(t)},run:function(e,t){var n=i.hooks.all[e];if(n&&n.length)for(var r=0,a;a=n[r++];)a(t)}},Token:a};e.Prism=i;function a(e,t,n,r){this.type=e,this.content=t,this.alias=n,this.length=(r||``).length|0}a.stringify=function e(t,n){if(typeof t==`string`)return t;if(Array.isArray(t)){var r=``;return t.forEach(function(t){r+=e(t,n)}),r}var a={type:t.type,content:e(t.content,n),tag:`span`,classes:[`token`,t.type],attributes:{},language:n},o=t.alias;o&&(Array.isArray(o)?Array.prototype.push.apply(a.classes,o):a.classes.push(o)),i.hooks.run(`wrap`,a);var s=``;for(var c in a.attributes)s+=` `+c+`="`+(a.attributes[c]||``).replace(/"/g,`&quot;`)+`"`;return`<`+a.tag+` class="`+a.classes.join(` `)+`"`+s+`>`+a.content+`</`+a.tag+`>`};function o(e,t,n,r){e.lastIndex=t;var i=e.exec(n);if(i&&r&&i[1]){var a=i[1].length;i.index+=a,i[0]=i[0].slice(a)}return i}function s(e,t,n,r,c,d){for(var f in n)if(n.hasOwnProperty(f)&&n[f]){var p=n[f];p=Array.isArray(p)?p:[p];for(var m=0;m<p.length;++m){if(d&&d.cause==f+`,`+m)return;var h=p[m],ee=h.inside,te=!!h.lookbehind,ne=!!h.greedy,re=h.alias;if(ne&&!h.pattern.global){var ie=h.pattern.toString().match(/[imsuy]*$/)[0];h.pattern=RegExp(h.pattern.source,ie+`g`)}for(var g=h.pattern||h,_=r.next,v=c;_!==t.tail&&!(d&&v>=d.reach);v+=_.value.length,_=_.next){var y=_.value;if(t.length>e.length)return;if(!(y instanceof a)){var ae=1,b;if(ne){if(b=o(g,v,e,te),!b||b.index>=e.length)break;var oe=b.index,se=b.index+b[0].length,ce=v;for(ce+=_.value.length;oe>=ce;)_=_.next,ce+=_.value.length;if(ce-=_.value.length,v=ce,_.value instanceof a)continue;for(var le=_;le!==t.tail&&(ce<se||typeof le.value==`string`);le=le.next)ae++,ce+=le.value.length;ae--,y=e.slice(v,ce),b.index-=v}else if(b=o(g,0,y,te),!b)continue;var oe=b.index,ue=b[0],de=y.slice(0,oe),fe=y.slice(oe+ue.length),pe=v+y.length;d&&pe>d.reach&&(d.reach=pe);var me=_.prev;de&&(me=l(t,me,de),v+=de.length),u(t,me,ae);var he=new a(f,ee?i.tokenize(ue,ee):ue,re,ue);if(_=l(t,me,he),fe&&l(t,_,fe),ae>1){var ge={cause:f+`,`+m,reach:pe};s(e,t,n,_.prev,v,ge),d&&ge.reach>d.reach&&(d.reach=ge.reach)}}}}}}function c(){var e={value:null,prev:null,next:null},t={value:null,prev:e,next:null};e.next=t,this.head=e,this.tail=t,this.length=0}function l(e,t,n){var r=t.next,i={value:n,prev:t,next:r};return t.next=i,r.prev=i,e.length++,i}function u(e,t,n){for(var r=t.next,i=0;i<n&&r!==e.tail;i++)r=r.next;t.next=r,r.prev=t,e.length-=i}function d(e){for(var t=[],n=e.head.next;n!==e.tail;)t.push(n.value),n=n.next;return t}if(!e.document)return e.addEventListener&&(i.disableWorkerMessageHandler||e.addEventListener(`message`,function(t){var n=JSON.parse(t.data),r=n.language,a=n.code,o=n.immediateClose;e.postMessage(i.highlight(a,i.languages[r],r)),o&&e.close()},!1)),i;var f=i.util.currentScript();f&&(i.filename=f.src,f.hasAttribute(`data-manual`)&&(i.manual=!0));function p(){i.manual||i.highlightAll()}if(!i.manual){var m=document.readyState;m===`loading`||m===`interactive`&&f&&f.defer?document.addEventListener(`DOMContentLoaded`,p):window.requestAnimationFrame?window.requestAnimationFrame(p):window.setTimeout(p,16)}return i}(typeof window<`u`?window:typeof WorkerGlobalScope<`u`&&self instanceof WorkerGlobalScope?self:{});t!==void 0&&t.exports&&(t.exports=n),typeof global<`u`&&(global.Prism=n),n.languages.markup={comment:{pattern:/<!--(?:(?!<!--)[\s\S])*?-->/,greedy:!0},prolog:{pattern:/<\?[\s\S]+?\?>/,greedy:!0},doctype:{pattern:/<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,greedy:!0,inside:{"internal-subset":{pattern:/(^[^\[]*\[)[\s\S]+(?=\]>$)/,lookbehind:!0,greedy:!0,inside:null},string:{pattern:/"[^"]*"|'[^']*'/,greedy:!0},punctuation:/^<!|>$|[[\]]/,"doctype-tag":/^DOCTYPE/i,name:/[^\s<>'"]+/}},cdata:{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,greedy:!0},tag:{pattern:/<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,greedy:!0,inside:{tag:{pattern:/^<\/?[^\s>\/]+/,inside:{punctuation:/^<\/?/,namespace:/^[^\s>\/:]+:/}},"special-attr":[],"attr-value":{pattern:/=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,inside:{punctuation:[{pattern:/^=/,alias:`attr-equals`},{pattern:/^(\s*)["']|["']$/,lookbehind:!0}]}},punctuation:/\/?>/,"attr-name":{pattern:/[^\s>\/]+/,inside:{namespace:/^[^\s>\/:]+:/}}}},entity:[{pattern:/&[\da-z]{1,8};/i,alias:`named-entity`},/&#x?[\da-f]{1,8};/i]},n.languages.markup.tag.inside[`attr-value`].inside.entity=n.languages.markup.entity,n.languages.markup.doctype.inside[`internal-subset`].inside=n.languages.markup,n.hooks.add(`wrap`,function(e){e.type===`entity`&&(e.attributes.title=e.content.replace(/&amp;/,`&`))}),Object.defineProperty(n.languages.markup.tag,"addInlined",{value:function(e,t){var r={};r[`language-`+t]={pattern:/(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,lookbehind:!0,inside:n.languages[t]},r.cdata=/^<!\[CDATA\[|\]\]>$/i;var i={"included-cdata":{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,inside:r}};i[`language-`+t]={pattern:/[\s\S]+/,inside:n.languages[t]};var a={};a[e]={pattern:RegExp(`(<__[^>]*>)(?:<!\\[CDATA\\[(?:[^\\]]|\\](?!\\]>))*\\]\\]>|(?!<!\\[CDATA\\[)[\\s\\S])*?(?=<\\/__>)`.replace(/__/g,function(){return e}),`i`),lookbehind:!0,greedy:!0,inside:i},n.languages.insertBefore(`markup`,`cdata`,a)}}),Object.defineProperty(n.languages.markup.tag,"addAttribute",{value:function(e,t){n.languages.markup.tag.inside[`special-attr`].push({pattern:RegExp(`(^|["'\\s])(?:`+e+`)\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s'">=]+(?=[\\s>]))`,`i`),lookbehind:!0,inside:{"attr-name":/^[^\s=]+/,"attr-value":{pattern:/=[\s\S]+/,inside:{value:{pattern:/(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,lookbehind:!0,alias:[t,`language-`+t],inside:n.languages[t]},punctuation:[{pattern:/^=/,alias:`attr-equals`},/"|'/]}}}})}}),n.languages.html=n.languages.markup,n.languages.mathml=n.languages.markup,n.languages.svg=n.languages.markup,n.languages.xml=n.languages.extend(`markup`,{}),n.languages.ssml=n.languages.xml,n.languages.atom=n.languages.xml,n.languages.rss=n.languages.xml,(function(e){var t=/(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;e.languages.css={comment:/\/\*[\s\S]*?\*\//,atrule:{pattern:RegExp(`@[\\w-](?:[^;{\\s"']|\\s+(?!\\s)|`+t.source+`)*?(?:;|(?=\\s*\\{))`),inside:{rule:/^@[\w-]+/,"selector-function-argument":{pattern:/(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,lookbehind:!0,alias:`selector`},keyword:{pattern:/(^|[^\w-])(?:and|not|only|or)(?![\w-])/,lookbehind:!0}}},url:{pattern:RegExp(`\\burl\\((?:`+t.source+`|(?:[^\\\\\\r\\n()"']|\\\\[\\s\\S])*)\\)`,`i`),greedy:!0,inside:{function:/^url/i,punctuation:/^\(|\)$/,string:{pattern:RegExp(`^`+t.source+`$`),alias:`url`}}},selector:{pattern:RegExp(`(^|[{}\\s])[^{}\\s](?:[^{};"'\\s]|\\s+(?![\\s{])|`+t.source+`)*(?=\\s*\\{)`),lookbehind:!0},string:{pattern:t,greedy:!0},property:{pattern:/(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,lookbehind:!0},important:/!important\b/i,function:{pattern:/(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,lookbehind:!0},punctuation:/[(){};:,]/},e.languages.css.atrule.inside.rest=e.languages.css;var n=e.languages.markup;n&&(n.tag.addInlined(`style`,`css`),n.tag.addAttribute(`style`,`css`))})(n),n.languages.clike={comment:[{pattern:/(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,lookbehind:!0,greedy:!0},{pattern:/(^|[^\\:])\/\/.*/,lookbehind:!0,greedy:!0}],string:{pattern:/(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,greedy:!0},"class-name":{pattern:/(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,lookbehind:!0,inside:{punctuation:/[.\\]/}},keyword:/\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,boolean:/\b(?:false|true)\b/,function:/\b\w+(?=\()/,number:/\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,operator:/[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,punctuation:/[{}[\];(),.:]/},n.languages.javascript=n.languages.extend(`clike`,{"class-name":[n.languages.clike[`class-name`],{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,lookbehind:!0}],keyword:[{pattern:/((?:^|\})\s*)catch\b/,lookbehind:!0},{pattern:/(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,lookbehind:!0}],function:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,number:{pattern:RegExp(`(^|[^\\w$])(?:NaN|Infinity|0[bB][01]+(?:_[01]+)*n?|0[oO][0-7]+(?:_[0-7]+)*n?|0[xX][\\dA-Fa-f]+(?:_[\\dA-Fa-f]+)*n?|\\d+(?:_\\d+)*n|(?:\\d+(?:_\\d+)*(?:\\.(?:\\d+(?:_\\d+)*)?)?|\\.\\d+(?:_\\d+)*)(?:[Ee][+-]?\\d+(?:_\\d+)*)?)(?![\\w$])`),lookbehind:!0},operator:/--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/}),n.languages.javascript[`class-name`][0].pattern=/(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/,n.languages.insertBefore(`javascript`,`keyword`,{regex:{pattern:RegExp(`((?:^|[^$\\w\\xA0-\\uFFFF."'\\])\\s]|\\b(?:return|yield))\\s*)\\/(?:(?:\\[(?:[^\\]\\\\\\r\\n]|\\\\.)*\\]|\\\\.|[^/\\\\\\[\\r\\n])+\\/[dgimyus]{0,7}|(?:\\[(?:[^[\\]\\\\\\r\\n]|\\\\.|\\[(?:[^[\\]\\\\\\r\\n]|\\\\.|\\[(?:[^[\\]\\\\\\r\\n]|\\\\.)*\\])*\\])*\\]|\\\\.|[^/\\\\\\[\\r\\n])+\\/[dgimyus]{0,7}v[dgimyus]{0,7})(?=(?:\\s|\\/\\*(?:[^*]|\\*(?!\\/))*\\*\\/)*(?:$|[\\r\\n,.;:})\\]]|\\/\\/))`),lookbehind:!0,greedy:!0,inside:{"regex-source":{pattern:/^(\/)[\s\S]+(?=\/[a-z]*$)/,lookbehind:!0,alias:`language-regex`,inside:n.languages.regex},"regex-delimiter":/^\/|\/$/,"regex-flags":/^[a-z]+$/}},"function-variable":{pattern:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,alias:`function`},parameter:[{pattern:/(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,lookbehind:!0,inside:n.languages.javascript},{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,lookbehind:!0,inside:n.languages.javascript},{pattern:/(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,lookbehind:!0,inside:n.languages.javascript},{pattern:/((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,lookbehind:!0,inside:n.languages.javascript}],constant:/\b[A-Z](?:[A-Z_]|\dx?)*\b/}),n.languages.insertBefore(`javascript`,`string`,{hashbang:{pattern:/^#!.*/,greedy:!0,alias:`comment`},"template-string":{pattern:/`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,greedy:!0,inside:{"template-punctuation":{pattern:/^`|`$/,alias:`string`},interpolation:{pattern:/((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,lookbehind:!0,inside:{"interpolation-punctuation":{pattern:/^\$\{|\}$/,alias:`punctuation`},rest:n.languages.javascript}},string:/[\s\S]+/}},"string-property":{pattern:/((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,lookbehind:!0,greedy:!0,alias:`property`}}),n.languages.insertBefore(`javascript`,`operator`,{"literal-property":{pattern:/((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,lookbehind:!0,alias:`property`}}),n.languages.markup&&(n.languages.markup.tag.addInlined(`script`,`javascript`),n.languages.markup.tag.addAttribute(`on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)`,`javascript`)),n.languages.js=n.languages.javascript,(function(){if(n===void 0||typeof document>`u`)return;Element.prototype.matches||(Element.prototype.matches=Element.prototype.msMatchesSelector||Element.prototype.webkitMatchesSelector);var e=`Loading…`,t=function(e,t){return`✖ Error `+e+` while fetching file: `+t},r=`✖ Error: File does not exist or is empty`,i={js:`javascript`,py:`python`,rb:`ruby`,ps1:`powershell`,psm1:`powershell`,sh:`bash`,bat:`batch`,h:`c`,tex:`latex`},a=`data-src-status`,o=`loading`,s=`loaded`,c=`failed`,l=`pre[data-src]:not([`+a+`="`+s+`"]):not([`+a+`="`+o+`"])`;function u(e,n,i){var a=new XMLHttpRequest;a.open(`GET`,e,!0),a.onreadystatechange=function(){a.readyState==4&&(a.status<400&&a.responseText?n(a.responseText):a.status>=400?i(t(a.status,a.statusText)):i(r))},a.send(null)}function d(e){var t=/^\s*(\d+)\s*(?:(,)\s*(?:(\d+)\s*)?)?$/.exec(e||``);if(t){var n=Number(t[1]),r=t[2],i=t[3];return r?i?[n,Number(i)]:[n,void 0]:[n,n]}}n.hooks.add(`before-highlightall`,function(e){e.selector+=`, `+l}),n.hooks.add(`before-sanity-check`,function(t){var r=t.element;if(r.matches(l)){t.code=``,r.setAttribute(a,o);var f=r.appendChild(document.createElement(`CODE`));f.textContent=e;var p=r.getAttribute(`data-src`),m=t.language;if(m===`none`){var h=(/\.(\w+)$/.exec(p)||[,`none`])[1];m=i[h]||h}n.util.setLanguage(f,m),n.util.setLanguage(r,m);var ee=n.plugins.autoloader;ee&&ee.loadLanguages(m),u(p,function(e){r.setAttribute(a,s);var t=d(r.getAttribute(`data-range`));if(t){var i=e.split(/\r\n?|\n/g),o=t[0],c=t[1]==null?i.length:t[1];o<0&&(o+=i.length),o=Math.max(0,Math.min(o-1,i.length)),c<0&&(c+=i.length),c=Math.max(0,Math.min(c,i.length)),e=i.slice(o,c).join(`
`),r.hasAttribute(`data-start`)||r.setAttribute(`data-start`,String(o+1))}f.textContent=e,n.highlightElement(f)},function(e){r.setAttribute(a,c),f.textContent=e})}}),n.plugins.fileHighlight={highlight:function(e){for(var t=(e||document).querySelectorAll(l),r=0,i;i=t[r++];)n.highlightElement(i)}};var f=!1;n.fileHighlight=function(){f||=(console.warn("Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead."),!0),n.plugins.fileHighlight.highlight.apply(this,arguments)}})()}))(),1);hc.default.manual=!0,hc.default.highlightAll();function gc(e,t){return(t??document).querySelector(e)}function _c(e,t,n){return e*(1-n)+t*n}var vc={logo:`
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
    `},yc=class{vfx=new Bs({pixelRatio:window.devicePixelRatio,zIndex:-1});vfx2=new Bs({pixelRatio:1,zIndex:-2,scrollPadding:!1});async initBG(){let e=gc(`#BG`),t=0;function n(e,t,n){return e*(1-n)+t*n}function r(){t=n(t,window.scrollY,.03),e.style.setProperty(`transform`,`translateY(-${t*.1}px)`),requestAnimationFrame(r)}r(),await this.vfx2.add(e,{shader:vc.blob})}async initVFX(){await Promise.all(Array.from(document.querySelectorAll(`*[data-shader]`)).map(e=>{let t=e.getAttribute(`data-shader`),n=e.getAttribute(`data-uniforms`),r=n?JSON.parse(n):void 0;return this.vfx.add(e,{shader:t,overflow:Number.parseFloat(e.getAttribute(`data-overflow`)??`0`),uniforms:r,intersection:{threshold:Number.parseFloat(e.getAttribute(`data-threshold`)??`0`)}})}))}async initDiv(){let e=gc(`#div`);await this.vfx.add(e,{shader:`rgbShift`,overflow:100});for(let t of e.querySelectorAll(`input,textarea`))t.addEventListener(`input`,()=>this.vfx.update(e));let t=gc(`textarea`,e);new MutationObserver(()=>this.vfx.update(e)).observe(t,{attributes:!0})}async initCanvas(){let e=document.getElementById(`canvas`),t=e.getContext(`2d`);if(!t)throw`Failed to get the canvas context`;let{width:n,height:r}=e.getBoundingClientRect(),i=window.devicePixelRatio??1;e.width=n*i,e.height=r*i,t.scale(i,i);let a=[n/2,r/2],o=a,s=[o],c=!1,l=Date.now();e.addEventListener(`mousemove`,e=>{c=!0,a=[e.offsetX,e.offsetY]}),e.addEventListener(`mouseleave`,e=>{c=!1});let u=!1;new IntersectionObserver(e=>{for(let t of e)u=t.intersectionRatio>.1},{threshold:[0,1,.2,.8]}).observe(e);let d=()=>{if(requestAnimationFrame(d),u){if(!c){let e=Date.now()/1e3-l;a=[n*.5+Math.sin(e*1.3)*n*.3,r*.5+Math.sin(e*1.7)*r*.3]}o=[_c(o[0],a[0],.1),_c(o[1],a[1],.1)],s.push(o),s.splice(0,s.length-30),t.clearRect(0,0,n,r),t.fillStyle=`black`,t.fillRect(0,0,n,r),t.fillStyle=`white`,t.font=`bold ${n*.14}px sans-serif`,t.fillText(`HOVER ME`,n/2,r/2),t.textBaseline=`middle`,t.textAlign=`center`;for(let e=0;e<s.length;e++){let[n,r]=s[e],i=e/s.length*255;t.fillStyle=`rgba(${255-i}, 255, ${i}, ${e/s.length*.5+.5})`,t.beginPath(),t.arc(n,r,e+20,0,2*Math.PI),t.fill()}this.vfx.update(e)}};d(),await this.vfx.add(e,{shader:vc.canvas})}async initCustomShader(){let e=gc(`#custom`);await this.vfx.add(e,{shader:vc.custom,uniforms:{scroll:()=>window.scrollY/window.innerHeight}})}async initEffects(){let e=gc(`#effect-bloom`);await this.vfx.add(e,{effect:new tc({threshold:.2,intensity:5})});let t=gc(`#effect-crt`);await this.vfx.add(t,{effect:[new dc({size:10}),new mc({spacing:5}),new tc({threshold:.01,softness:.2,intensity:10,scatter:1,pad:200})]})}async initMultipass(){let e=gc(`#multipass`);await this.vfx.add(e,{shader:[{frag:`
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
                    `}]})}hideMask(){gc(`#MaskTop`).style.setProperty(`height`,`0`),gc(`#MaskBottom`).style.setProperty(`opacity`,`0`)}async showLogo(){let e=gc(`#Logo`),t=gc(`#LogoTagline`);return Promise.all([this.vfx.add(e,{shader:vc.logo,overflow:[0,3e3,0,100],uniforms:{delay:0},intersection:{threshold:1}}),this.vfx.add(t,{shader:vc.logo,overflow:[0,3e3,0,1e3],uniforms:{delay:.3},intersection:{threshold:1}})])}async showProfile(){let e=gc(`#profile`);await this.vfx.add(e,{shader:vc.logo,overflow:[0,3e3,0,2e3],uniforms:{delay:.5},intersection:{rootMargin:[-100,0,-100,0],threshold:1}})}};window.addEventListener(`load`,async()=>{let e=new yc;await e.initBG(),await Promise.all([await e.initVFX(),e.initDiv(),e.initCanvas(),e.initCustomShader(),e.initMultipass(),e.initEffects()]),e.hideMask(),setTimeout(()=>{e.showLogo(),e.showProfile()},2e3)});
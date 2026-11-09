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
    `,warpReveal:`
    ${t}
    uniform float enterProgress;
    uniform float leaveProgress;

    ${n}

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
    ${t}
    ${n}

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
    ${t}
    ${n}

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
    `},i={...r,slitScanTransition:r.slitScanReveal,warpTransition:r.warpReveal,pixelateTransition:r.pixelateReveal,focusTransition:r.focusReveal};function a(e){return e.tagName===`CANVAS`&&(e.hasAttribute(`layoutsubtree`)||e.getAttribute(`content`)===`drawable`)}function o(e,t){e.setAttribute(`layoutsubtree`,``),e.setAttribute(`content`,`drawable`),t?.setAttribute(`drawable`,``)}function s(e,t,n,r){if(t.width<=0||t.height<=0)return null;let i=t.left-e.left,a=t.top-e.top;return i+t.width<=0||a+t.height<=0||i>=e.width||a>=e.height?null:[i*n,a*r,t.width*n,t.height*r]}function c(e){let t=e.getBoundingClientRect(),n=getComputedStyle(e),r=Number.parseFloat(n.paddingLeft)||0,i=Number.parseFloat(n.paddingRight)||0,a=Number.parseFloat(n.paddingTop)||0,o=Number.parseFloat(n.paddingBottom)||0,s=e.clientWidth>0?t.width/e.offsetWidth:1,c=e.clientHeight>0?t.height/e.offsetHeight:1;return{left:t.left+(e.clientLeft+r)*s,top:t.top+(e.clientTop+a)*c,width:Math.max(0,e.clientWidth-r-i)*s,height:Math.max(0,e.clientHeight-a-o)*c}}function l(e){return typeof e.checkVisibility==`function`?e.checkVisibility({visibilityProperty:!0,opacityProperty:!0}):getComputedStyle(e).visibility!==`hidden`}function u(e,t){let n=t.querySelectorAll(`canvas`);if(n.length===0)return;let r=t.getBoundingClientRect();if(r.width<=0||r.height<=0)return;let i=e.canvas.width/r.width,a=e.canvas.height/r.height;for(let t of n){if(t.width===0||t.height===0||!l(t))continue;let n=s(r,c(t),i,a);if(n)try{e.drawImage(t,...n)}catch{}}}function d(e){return e.currentSrc||e.src}function f(e,t){let n=e.getBoundingClientRect(),r=e.cloneNode(!0),i=[e,...e.querySelectorAll(`*`)],a=[r,...r.querySelectorAll(`*`)],o=[],s=[];for(let e=0;e<i.length&&e<a.length;e++){let t=i[e],n=a[e];(t.scrollTop||t.scrollLeft)&&o.push([n,t.scrollTop,t.scrollLeft]),t instanceof HTMLScriptElement?s.push([n,document.createComment(`script`)]):t instanceof HTMLCanvasElement||t instanceof HTMLVideoElement?s.push([n,h(t)]):t instanceof HTMLIFrameElement?s.push([n,ee(t)]):t instanceof HTMLInputElement&&n instanceof HTMLInputElement?(n.value=t.value,n.checked=t.checked):t instanceof HTMLTextAreaElement&&n instanceof HTMLTextAreaElement?n.value=t.value:t instanceof HTMLSelectElement&&n instanceof HTMLSelectElement?n.selectedIndex=t.selectedIndex:t instanceof HTMLMediaElement&&n.removeAttribute(`autoplay`)}for(let[e,t]of s)e.replaceWith(t);r.setAttribute(`aria-hidden`,`true`);let c=r.style;c.setProperty(`position`,`fixed`),c.setProperty(`left`,`${n.left}px`),c.setProperty(`top`,`${n.top}px`),c.setProperty(`width`,`${n.width}px`),c.setProperty(`height`,`${n.height}px`),c.setProperty(`box-sizing`,`border-box`),c.setProperty(`margin`,`0`),c.setProperty(`pointer-events`,`none`),c.setProperty(`z-index`,t.toString()),e.parentNode?.insertBefore(r,e);let l=r.getBoundingClientRect();(l.left!==n.left||l.top!==n.top)&&(c.setProperty(`left`,`${n.left*2-l.left}px`),c.setProperty(`top`,`${n.top*2-l.top}px`));for(let[e,t,n]of o)e.scrollTop=t,e.scrollLeft=n;return p(i,a),()=>{r.remove()}}function p(e,t){let n=e[0],r=t[0];if(!n||!r||typeof n.getAnimations!=`function`)return;let i=(e,t)=>{if(!(`animationName`in e))return null;let n=e.effect,r=n?.target,i=r?t.get(r):void 0;return i===void 0?null:`${i}|${n?.pseudoElement??``}|${e.animationName}`},a=new Map(t.map((e,t)=>[e,t])),o=new Map;for(let e of r.getAnimations({subtree:!0})){let t=i(e,a);t&&o.set(t,e)}let s=new Map(e.map((e,t)=>[e,t]));for(let e of n.getAnimations({subtree:!0})){let t=i(e,s),n=t&&o.get(t);n&&(n.currentTime=e.currentTime,n.pause())}}function m(e,t){let n=e.getBoundingClientRect(),r=getComputedStyle(e);t.className=e.className,t.style.cssText=e.style.cssText,t.style.width=`${n.width}px`,t.style.height=`${n.height}px`,t.style.display=r.display===`inline`?`inline-block`:r.display,t.style.boxSizing=`border-box`}function h(e){let t=document.createElement(`canvas`),n=e instanceof HTMLVideoElement?e.videoWidth:e.width,r=e instanceof HTMLVideoElement?e.videoHeight:e.height;t.width=Math.max(1,n),t.height=Math.max(1,r),m(e,t);try{t.getContext(`2d`)?.drawImage(e,0,0,t.width,t.height)}catch{}return t}function ee(e){let t=document.createElement(`div`);return m(e,t),t}function te(e){let t=d(e);if(!t||t.startsWith(`data:`))return!1;try{return new URL(t,location.href).origin!==location.origin}catch{return!1}}async function g(e){let t=await(await fetch(e)).blob();return URL.createObjectURL(t)}async function _(e){let t=Array.from(e.querySelectorAll(`img`)).filter(e=>e.complete&&e.naturalWidth>0&&te(e));if(t.length===0)return()=>{};let n=new Map,r=[];return await Promise.all(t.map(async e=>{try{let t=d(e),i=await g(t);n.set(e,t),r.push(i),await new Promise(t=>{e.addEventListener(`load`,()=>t(),{once:!0}),e.src=i})}catch{}})),()=>{for(let[e,t]of n)e.src=t;for(let e of r)URL.revokeObjectURL(e)}}var v=[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`],y=new Set([`IMG`,`VIDEO`,`CANVAS`,`IFRAME`,`EMBED`,`OBJECT`,`INPUT`,`TEXTAREA`,`SELECT`]),ne=[`position`,`top`,`right`,`bottom`,`left`,`float`,`flex`,`flex-grow`,`flex-shrink`,`flex-basis`,`align-self`,`justify-self`,`place-self`,`order`,`grid-column`,`grid-column-start`,`grid-column-end`,`grid-row`,`grid-row-start`,`grid-row-end`,`grid-area`],re=new WeakMap,b=new WeakMap,ie=new WeakMap,ae=new WeakMap,oe=new WeakMap,se=new WeakMap,ce=new WeakMap,le=new WeakMap,ue=new WeakMap,de=new WeakSet,fe=new WeakMap,pe=new WeakMap,me=new WeakSet,he=new WeakSet,ge=300;function _e(e,t){return new Promise(n=>{let r=t=>{clearTimeout(a),e.delete(i),n(t)},i=()=>r(!0),a=setTimeout(()=>r(!1),t);e.add(i)})}function ve(e){if(e)for(let t of[...e])t()}function ye(e,t,n){if(typeof e.moveBefore==`function`)try{e.moveBefore(t,n);return}catch{}e.insertBefore(t,n)}function be(e,t=ge){let n=pe.get(e);if(!n)return;let r=_e(n,t);return e.requestPaint(),r}function xe(e){if(me.has(e))return()=>{};me.add(e);let{width:t,height:n,overflow:r}=e.style,i=e.getBoundingClientRect();return e.style.setProperty(`width`,`${i.width}px`),e.style.setProperty(`height`,`${i.height}px`),e.style.setProperty(`overflow`,`hidden`),()=>{if(!me.has(e))return;me.delete(e),e.style.width=t,e.style.height=n,e.style.overflow=r;let i=e.firstElementChild;if(i&&!he.has(e)){let t=Math.round(i.getBoundingClientRect().height);e.style.setProperty(`height`,`${t}px`)}}}function Se(e){fe.get(e)?.(),fe.delete(e)}function Ce(e,t=!1){requestAnimationFrame(()=>{t||e.getContext(`2d`)?.clearRect(0,0,e.width,e.height),Se(e)})}async function we(e,t){o(e,e.firstElementChild);let n=e.getContext(`2d`);if(!n)throw Error(`Failed to get 2d context from layoutsubtree canvas`);let{onCapture:r,maxSize:i}=t,a=new Set;pe.set(e,a);let s=null,c=null,l=new Promise(e=>{c=e}),d=null,f=t=>{if(t){if(t===d)return;d=t}let o=e.firstElementChild;if(!o||e.width===0||e.height===0||o.getClientRects().length===0)return;o.hasAttribute(`drawable`)||o.setAttribute(`drawable`,``),n.clearRect(0,0,e.width,e.height),n.drawElementImage(o,0,0),u(n,o);let l=e.width,f=e.height;if(i&&(l>i||f>i)){let e=Math.min(i/l,i/f);l=Math.floor(l*e),f=Math.floor(f*e)}s&&s.width===l&&s.height===f||(s=new OffscreenCanvas(l,f));let p=s.getContext(`2d`);p&&(p.clearRect(0,0,l,f),p.drawImage(e,0,0,l,f),c?(c(s),c=null,ve(a)):(n.clearRect(0,0,e.width,e.height),r(s),ve(a)))};e.onpaint=f,e.addEventListener(`paint`,f),b.set(e,f);let p=new ResizeObserver(t=>{for(let n of t){let t=n.devicePixelContentBoxSize?.[0];if(t)e.width=t.inlineSize,e.height=t.blockSize;else{let t=n.borderBoxSize?.[0];if(t){let n=window.devicePixelRatio;e.width=Math.round(t.inlineSize*n),e.height=Math.round(t.blockSize*n)}}}e.requestPaint()});p.observe(e,{box:`device-pixel-content-box`}),re.set(e,p);let m=e.firstElementChild;if(m){let t=new ResizeObserver(t=>{if(me.has(e)||he.has(e))return;let n=t[0].borderBoxSize?.[0];if(!n)return;let r=`${Math.round(n.blockSize)}px`;r!==e.style.height&&e.style.setProperty(`height`,r)});t.observe(m),ie.set(e,t)}return l}function Te(e){e.onpaint=null,ve(pe.get(e)),pe.delete(e);let t=b.get(e);t&&(e.removeEventListener(`paint`,t),b.delete(e));let n=re.get(e);n&&(n.disconnect(),re.delete(e));let r=ie.get(e);r&&(r.disconnect(),ie.delete(e))}function Ee(e){let t={width:null,height:null};if(typeof e.computedStyleMap!=`function`||y.has(e.tagName))return t;let n=e.computedStyleMap(),r=e=>n.get(e)?.toString()??`auto`,i=r(`position`);if(i!==`fixed`&&i!==`absolute`)return t;let a=(t,n,i)=>{let a=r(n),o=r(i);return r(t)!==`auto`||a===`auto`||o===`auto`?null:`calc(${[`100%`,a,o,...[`margin-${n}`,`margin-${i}`].map(n=>{let i=r(n);return t===`height`&&i.includes(`%`)?getComputedStyle(e).getPropertyValue(n):i}).filter(e=>e!==`auto`)].join(` - `)})`};return{width:a(`width`,`left`,`right`),height:a(`height`,`top`,`bottom`)}}function De(e){return y.has(e.tagName)&&typeof e.computedStyleMap==`function`&&e.computedStyleMap().get(`width`)?.toString()===`auto`}async function Oe(e,t){let n=e.getBoundingClientRect(),r=Ee(e),i=document.createElement(`canvas`);e.hasAttribute(`drawable`)||de.add(e),o(i,e),i.className=e.className;let a=e.getAttribute(`style`);a&&i.setAttribute(`style`,a),i.style.setProperty(`padding`,`0`),i.style.setProperty(`border`,`none`),i.style.setProperty(`box-sizing`,`content-box`),i.style.setProperty(`background`,`transparent`);let s=getComputedStyle(e),c=s.display===`inline`?`block`:s.display;i.style.setProperty(`display`,c);for(let e of v)i.style.setProperty(e,s.getPropertyValue(e));for(let e of ne)i.style.setProperty(e,s.getPropertyValue(e));r.width?i.style.setProperty(`width`,r.width):e.style.width.endsWith(`px`)||De(e)?i.style.setProperty(`width`,`${n.width}px`):i.style.setProperty(`width`,`100%`),r.height?(i.style.setProperty(`height`,r.height),he.add(i)):i.style.height||i.style.setProperty(`height`,`${n.height}px`);let l=window.devicePixelRatio;i.width=Math.round(n.width*l),i.height=Math.round(n.height*l),t.stillCover&&fe.set(i,f(e,t.stillCover.zIndex)),ae.set(e,e.style.margin),oe.set(e,e.style.width),se.set(e,e.style.boxSizing),e.parentNode?.insertBefore(i,e),getComputedStyle(i).display,ye(i,e,null),e.style.setProperty(`margin`,`0`),e.style.setProperty(`width`,`100%`),e.style.setProperty(`box-sizing`,`border-box`),(r.width||r.height)&&(ce.set(e,e.style.position),e.style.setProperty(`position`,`static`)),r.height&&(le.set(e,e.style.height),e.style.setProperty(`height`,`100%`));let u=await _(e);return ue.set(i,u),{canvas:i,initialCapture:await we(i,t)}}function ke(e,t){Te(e),Se(e);let n=ue.get(e);n&&(n(),ue.delete(e));let r=e.parentNode;r&&ye(r,t,e),e.remove(),de.has(t)&&(t.removeAttribute(`drawable`),de.delete(t));let i=ae.get(t);i!==void 0&&(t.style.margin=i,ae.delete(t));let a=oe.get(t);a!==void 0&&(t.style.width=a,oe.delete(t));let o=se.get(t);o!==void 0&&(t.style.boxSizing=o,se.delete(t));let s=ce.get(t);s!==void 0&&(t.style.position=s,ce.delete(t));let c=le.get(t);c!==void 0&&(t.style.height=c,le.delete(t))}var Ae;function je(){if(Ae!==void 0)return Ae;try{let e=document.createElement(`canvas`),t=e.getContext(`2d`);Ae=t!==null&&typeof t.drawElementImage==`function`&&typeof e.requestPaint==`function`}catch{Ae=!1}return Ae}var Me=`#version 300 es
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
`,Ne=`
void main() {
  outColor = transition(uvContent, reverse > 0.5 ? 1.0 - t : t);
}
`;function Pe(e){return`${Me}\n${e}\n${Ne}`}var Fe=Me.split(`
`).length;function Ie(e){let t=e instanceof Error?e.message:String(e);if(!/compile failed|link failed/i.test(t))return null;let n=[];for(let e of t.matchAll(/ERROR:\s*\d+:(\d+):\s*(.*)/g)){let t=Number(e[1])-Fe;n.push(t>=1?`line ${t}: ${e[2]}`:e[2])}return n.length>0?n:[t.split(`
`)[0]]}var Le=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Re=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ze,Be=new Map;function Ve(e){let t=Be.get(e);return t===void 0&&(t=Pe(e),Be.set(e,t)),t}var He=new WeakMap;function Ue(e){let t=He.get(e);return t||(t=new Set,He.set(e,t)),t}function We(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return n<=o&&r<=s&&n+i>=o+c&&r+a>=s+l}function Ge(e,t){let n=Ie(t);n?(console.error(`[VFX-JS] transition "${e}" failed to compile; cutting to the new content.\n  ${n.join(`
  `)}`),console.debug(t)):console.error(`[VFX-JS] transition "${e}" failed; cutting to the new content.`,t)}var Ke=class{constructor(e={}){ze.set(this,null),this.params=e}uniforms(e){return{}}start(e){Le(this,ze,e,`f`)}end(){Le(this,ze,null,`f`)}outputRect(e){let t=Re(this,ze,`f`)?.overflow??this.overflow;if(t===void 0||We(e.contentRect,e.canvasRect))return;if(t===!0)return e.canvasRect;let n=t*e.pixelRatio,[r,i,a,o]=e.contentRect;return[r-n,i-n,a+n*2,o+n*2]}render(e){if(e.holding){e.blit(e.src);return}let t=Ve(this.frag),n=Ue(e.gl);if(n.has(t))e.cut(),e.blit(e.src);else try{e.draw({frag:t,uniforms:{...this.uniforms(e),from:e.from,src:e.src,t:e.progress.t,reverse:+!!e.reverse,resolution:[e.dims.elementPixel[0],e.dims.elementPixel[1]],time:e.time},target:e.target})}catch(r){n.add(t),Ge(this.name,r),e.cut(),e.blit(e.src)}}};ze=new WeakMap;var qe=class extends Ke{constructor(){super(...arguments),this.name=`crossfade`,this.frag=`
vec4 transition(vec2 uv, float t) {
  return mix(readFrom(uv), readTo(uv), t);
}
`}},x=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},S=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Je,Ye,Xe,Ze,Qe,$e,et,tt,nt,rt,it,at,ot,st,ct,lt,ut,dt=e=>e*e*(3-2*e);function ft(e,t){return typeof e==`function`?e(t):e===`linear`?t:dt(t)}var pt={t:0,x:0},mt=class{constructor(){Je.add(this),this.enabled=!1,Ye.set(this,null),Xe.set(this,[0,0]),Ze.set(this,[]),Qe.set(this,!1),$e.set(this,null),et.set(this,null),tt.set(this,pt),nt.set(this,null),rt.set(this,null)}snapshot(){return x(this,Je,`m`,it).call(this),S(this,$e,null,`f`),this.enabled=!0,new Promise(e=>x(this,Ze,`f`).push(e))}start(e){return x(this,Je,`m`,it).call(this),S(this,$e,e,`f`),S(this,rt,e.onEnd??null,`f`),S(this,et,null,`f`),S(this,tt,pt,`f`),S(this,Qe,!1,`f`),this.enabled=!1,new Promise(e=>{S(this,nt,e,`f`)})}cancel(){x(this,Je,`m`,it).call(this),S(this,$e,null,`f`),S(this,Qe,!1,`f`),this.enabled=!1,x(this,Je,`m`,at).call(this)}get frame(){let e=x(this,Ye,`f`);return!e||!x(this,Qe,`f`)&&!x(this,$e,`f`)?null:{from:e,progress:x(this,tt,`f`),holding:x(this,$e,`f`)===null}}cut(){x(this,$e,`f`)&&(S(this,$e,null,`f`),x(this,Je,`m`,it).call(this))}update(e){let t=x(this,$e,`f`);if(!t)return;x(this,et,`f`)===null&&S(this,et,e.time,`f`);let n=(e.time-x(this,et,`f`))/t.duration;if(n>=1){S(this,$e,null,`f`),x(this,Je,`m`,it).call(this);return}let r=Math.max(n,0);S(this,tt,{t:ft(t.ease,r),x:r},`f`)}render(e){x(this,Ze,`f`).length>0&&(e.blit(e.src,x(this,Je,`m`,ot).call(this,e)),S(this,Qe,!0,`f`),x(this,Je,`m`,at).call(this)),x(this,Ye,`f`)&&x(this,Qe,`f`)?e.blit(x(this,Ye,`f`)):(this.enabled=!1,e.blit(e.src))}dispose(){S(this,Ye,null,`f`),S(this,Xe,[0,0],`f`),x(this,Je,`m`,it).call(this),x(this,Je,`m`,at).call(this)}};Ye=new WeakMap,Xe=new WeakMap,Ze=new WeakMap,Qe=new WeakMap,$e=new WeakMap,et=new WeakMap,tt=new WeakMap,nt=new WeakMap,rt=new WeakMap,Je=new WeakSet,it=function(){let e=x(this,rt,`f`);S(this,rt,null,`f`),e?.();let t=x(this,nt,`f`);S(this,nt,null,`f`),t?.()},at=function(){let e=x(this,Ze,`f`);S(this,Ze,[],`f`);for(let t of e)t()},ot=function(e){let[t,n]=e.dims.elementPixel;return x(this,Ye,`f`)&&x(this,Xe,`f`)[0]===t&&x(this,Xe,`f`)[1]===n||(x(this,Ye,`f`)?.dispose(),S(this,Ye,e.createRenderTarget({size:[t,n]}),`f`),S(this,Xe,[t,n],`f`)),x(this,Ye,`f`)};var ht=class{constructor(e,t){st.add(this),ct.set(this,void 0),lt.set(this,null),this.effect=e,S(this,ct,t,`f`)}get enabled(){return x(this,lt,`f`)!==null&&typeof this.effect.render==`function`&&this.effect.enabled!==!1}start(e){S(this,lt,e,`f`),this.effect.start?.(e)}end(){x(this,lt,`f`)!==null&&(S(this,lt,null,`f`),this.effect.end?.())}init(e){return this.effect.init?.(e)}update(e){let t=x(this,ct,`f`).frame;if(!t||t.holding)return;let n=x(this,st,`m`,ut).call(this,e);n&&this.effect.update?.(n)}render(e){let t=x(this,st,`m`,ut).call(this,e);t&&this.effect.render?this.effect.render(t):e.blit(e.src)}outputRect(e){return x(this,lt,`f`)?this.effect.outputRect?.(e):void 0}dispose(){this.effect.dispose?.()}};ct=new WeakMap,lt=new WeakMap,st=new WeakSet,ut=function(e){let t=x(this,ct,`f`).frame,n=x(this,lt,`f`);return!t||!n?null:{...e,from:t.from,progress:t.progress,holding:t.holding,reverse:n.reverse,run:n,cut:()=>x(this,ct,`f`).cut()}};function gt(){let e=globalThis.navigation?.currentEntry;if(!(!e||e.index<0||!e.key))return{index:e.index,key:e.key}}function _t(e=gt){let t=new Map,n;return{pick(r){let i=e();if(!i)return r;let a=n??i;n=i;let o=t.get(a.key);if(i.index<a.index&&o)return{...o,reverse:!0};let s=t.get(i.key);return i.index>a.index&&s?s:(t.set(i.key,r),r)}}}var vt=_t(),C=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},w=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},T,yt,E,bt,xt,St,Ct,wt,Tt,Et,Dt,Ot,kt,At,jt,Mt,Nt,Pt,Ft,It,Lt,Rt,zt,Bt,Vt,Ht,Ut,Wt,Gt,Kt,qt,Jt,Yt,Xt,Zt,Qt,$t,en,tn,nn=.6,rn=300,an=1e3;function on(e,t){let n=t.transition===void 0?e.params===void 0&&t.params===void 0?void 0:{...e.params,...t.params}:t.params;return{transition:t.transition??e.transition,params:n,reverse:t.reverse??e.reverse,duration:t.duration??e.duration,overflow:t.overflow??e.overflow,ease:t.ease??e.ease}}function sn(e,t={}){let n=on(e,t);return{transition:n.transition??qe,params:n.params,reverse:n.reverse??!1,duration:n.duration??nn,overflow:n.overflow,ease:n.ease}}var cn=e=>typeof e==`function`;function ln(e,t){return Array.isArray(e)&&Array.isArray(t)?e.length===t.length&&e.every((e,n)=>e===t[n]):e===t}function un(e,t){let n=e??{},r=t??{},i=Object.keys(n);return i.length===Object.keys(r).length&&i.every(e=>e in r&&ln(n[e],r[e]))}var dn=new WeakMap;function fn(e){let t=e.getBoundingClientRect();return t.right>0&&t.bottom>0&&t.left<window.innerWidth&&t.top<window.innerHeight}function pn(e){return e.tagName===`IMG`?e.loading===`lazy`&&!fn(e):e.preload===`none`}function mn(e,t,n=rn){let r=[];for(let t of e.querySelectorAll(`img, video`)){let e=t.tagName===`IMG`;!(e?t.complete:t.readyState>=2)&&!pn(t)&&r.push(new Promise(n=>{let r=()=>n();t.addEventListener(e?`load`:`loadeddata`,r,{once:!0}),t.addEventListener(`error`,r,{once:!0})}))}return t&&r.push(t),r.length===0?Promise.resolve():new Promise(e=>{let t=setTimeout(e,n),i=()=>{clearTimeout(t),e()};Promise.all(r).then(i,i)})}function hn(e,t){return new Promise((n,r)=>{let i=setTimeout(()=>n(!1),t);e.then(()=>{clearTimeout(i),n(!0)},e=>{clearTimeout(i),r(e)})})}var gn=()=>new Promise(e=>requestAnimationFrame(()=>e()));function _n(e,t){return e.length===t.length&&e.every((e,n)=>e===t[n])}var vn=class{constructor(e,t,n={},r,i=new mt,a=vt){T.add(this),yt.set(this,void 0),E.set(this,void 0),bt.set(this,void 0),xt.set(this,void 0),St.set(this,void 0),Ct.set(this,void 0),wt.set(this,void 0),Tt.set(this,[]),Et.set(this,[]),Dt.set(this,!1),Ot.set(this,!1),kt.set(this,!1),At.set(this,0),jt.set(this,null),Mt.set(this,!1),Nt.set(this,!1),Pt.set(this,null),Ft.set(this,[]),It.set(this,null),Lt.set(this,null),Rt.set(this,null),C(this,wt,r,`f`),C(this,yt,e,`f`),C(this,E,t,`f`),C(this,bt,n,`f`),C(this,xt,i,`f`),C(this,St,a,`f`),C(this,Ct,n.keepWrapped??!1,`f`)}get running(){return w(this,jt,`f`)!==null}show(e,t={}){let n=w(this,T,`m`,zt).call(this,e),{remove:r=!1,...i}=t;if(!this.running&&w(this,T,`m`,Bt).call(this,n))return Promise.resolve();let a=w(this,bt,`f`).slideSpec?.(n),o=a?on(a,i):i;return w(this,T,`m`,Vt).call(this,()=>{n.parentElement!==w(this,E,`f`)&&w(this,E,`f`).append(n);for(let e of Array.from(w(this,E,`f`).children))e!==n&&(r?e.remove():e.hidden=!0);n.hidden=!1},o)}run(e,t={}){return w(this,bt,`f`).autoReverse?w(this,T,`m`,Vt).call(this,e,()=>w(this,St,`f`).pick(typeof t==`function`?t():t)):w(this,T,`m`,Vt).call(this,e,t)}cancel(){var e;let t=C(this,At,(e=w(this,At,`f`),++e),`f`);C(this,jt,null,`f`),w(this,T,`m`,Qt).call(this),w(this,xt,`f`).cancel(),w(this,T,`m`,Xt).call(this),w(this,T,`m`,Yt).call(this),w(this,T,`m`,Gt).call(this),w(this,T,`m`,en).call(this,t)}destroy(){w(this,Mt,`f`)||(C(this,Mt,!0,`f`),this.cancel(),C(this,It,null,`f`),w(this,wt,`f`)?.call(this))}};yt=new WeakMap,E=new WeakMap,bt=new WeakMap,xt=new WeakMap,St=new WeakMap,Ct=new WeakMap,wt=new WeakMap,Tt=new WeakMap,Et=new WeakMap,Dt=new WeakMap,Ot=new WeakMap,kt=new WeakMap,At=new WeakMap,jt=new WeakMap,Mt=new WeakMap,Nt=new WeakMap,Pt=new WeakMap,Ft=new WeakMap,It=new WeakMap,Lt=new WeakMap,Rt=new WeakMap,T=new WeakSet,zt=function(e){let t=w(this,E,`f`),n=typeof e==`number`?t.children[e]:typeof e==`string`?t.querySelector(e):e;if(!n)throw TypeError(`[VFX-JS] show(): no slide for ${e}.`);if(n.parentElement!==t&&(n.isConnected||t.contains(n)))throw TypeError(`[VFX-JS] show(): the slide must be a direct child of the container.`);return n},Bt=function(e){return e.parentElement!==w(this,E,`f`)||e.hidden?!1:Array.from(w(this,E,`f`).children).every(t=>t===e||t.hidden)},Vt=async function(e,t){var n;if(w(this,Mt,`f`)){await e();return}let r=C(this,At,(n=w(this,At,`f`),++n),`f`);C(this,jt,r,`f`);try{await w(this,T,`m`,Ht).call(this,r,e,t)}finally{w(this,jt,`f`)===r&&C(this,jt,null,`f`),w(this,At,`f`)===r&&(w(this,T,`m`,Xt).call(this),w(this,T,`m`,Yt).call(this),w(this,T,`m`,Gt).call(this))}},Ht=async function(e,t,n){let r=()=>e===w(this,At,`f`),i=!1,a=async()=>{i||(i=!0,await t())},o=async()=>{w(this,T,`m`,Qt).call(this),w(this,xt,`f`).cancel(),await a(),r()&&(w(this,Nt,`f`)&&w(this,Ct,`f`)&&await w(this,yt,`f`).update(w(this,E,`f`)),w(this,T,`m`,en).call(this,e))},s=null;if(typeof n!=`function`){if(s=w(this,T,`m`,Ut).call(this,sn(w(this,bt,`f`),n)),!r())return a();if(s===null)return o()}w(this,T,`m`,Jt).call(this);try{await w(this,T,`m`,$t).call(this,s?.slots??null,r,!0)}catch(e){return console.error(`[VFX-JS] transition failed to wrap the element; cutting to the new content.`,e),a()}if(!r())return a();w(this,Et,`f`).push(w(this,yt,`f`).lockSize(w(this,E,`f`))),w(this,Et,`f`).push(w(this,yt,`f`).forceRender(w(this,E,`f`)));let c=await hn(w(this,xt,`f`).snapshot(),an);if(!r())return a();if(!c){w(this,T,`m`,qt).call(this),await a(),r()&&w(this,T,`m`,en).call(this,e);return}s&&w(this,T,`m`,Kt).call(this,e,s);let l;try{await a(),typeof n==`function`&&r()&&(l=n())}catch(t){throw r()&&(w(this,T,`m`,Qt).call(this),w(this,xt,`f`).cancel(),w(this,T,`m`,en).call(this,e)),t}if(!r())return;if(s===null){if(s=w(this,T,`m`,Ut).call(this,sn(w(this,bt,`f`),l)),!r())return;if(s===null)return o();try{await w(this,T,`m`,$t).call(this,s.slots,r,!1)}catch(e){return console.error(`[VFX-JS] transition failed to swap the effects; cutting to the new content.`,e),o()}if(!r())return;w(this,T,`m`,Kt).call(this,e,s)}w(this,T,`m`,Jt).call(this);try{await w(this,T,`m`,tn).call(this)}catch(e){console.error(`[VFX-JS] transition waitFor failed:`,e)}if(!r()||(!await w(this,yt,`f`).updateInTime(w(this,E,`f`))&&!w(this,Ot,`f`)&&(C(this,Ot,!0,`f`),console.warn(`[VFX-JS] transition: the new content was not captured in time; it may pop in during the run.`)),!r())||(await gn(),!r()))return;let u=await hn(w(this,xt,`f`).start({duration:s.run.duration,ease:s.ease,onEnd:()=>w(this,T,`m`,Qt).call(this,e)}),s.run.duration*1e3+an);r()&&(u||w(this,T,`m`,qt).call(this),w(this,T,`m`,en).call(this,e))},Ut=function(e){if(e.duration<=0)return null;let t=e.transition;if(!cn(t)&&!w(this,T,`m`,Wt).call(this,t))return null;let n,r;try{({transition:n,slots:r}=w(this,T,`m`,Zt).call(this,t,e.params))}catch(e){return console.error(`[VFX-JS] transition "${t.name}" constructor failed; cutting to the new content.`,e),null}let i={reverse:e.reverse,duration:e.duration},a=e.overflow??n.overflow;return a!==void 0&&(i.overflow=a),{run:i,ease:e.ease??n.ease??`smoothstep`,slots:r}},Wt=function(e){let t=dn.get(e);return t&&t!==this?(w(this,kt,`f`)||(C(this,kt,!0,`f`),console.warn(`[VFX-JS] transition "${e.name??`unnamed`}" instance is running in another container; cutting to the new content. Pass the class to share it.`)),!1):(w(this,Lt,`f`)!==e&&w(this,T,`m`,Gt).call(this),dn.set(e,this),C(this,Lt,e,`f`),!0)},Gt=function(){let e=w(this,Lt,`f`);C(this,Lt,null,`f`),e&&dn.get(e)===this&&dn.delete(e)},Kt=function(e,{run:t,slots:n}){w(this,T,`m`,Qt).call(this),C(this,Rt,{id:e,slots:n},`f`);for(let e of n)e.start(t)},qt=function(){w(this,Dt,`f`)||(C(this,Dt,!0,`f`),console.warn(`[VFX-JS] transition target did not render in time; cutting to the new content.`)),w(this,T,`m`,Qt).call(this),w(this,xt,`f`).cancel()},Jt=function(){w(this,Tt,`f`).push(w(this,yt,`f`).freezeInside(w(this,E,`f`)))},Yt=function(){let e=w(this,Et,`f`);C(this,Et,[],`f`);for(let t of e)t()},Xt=function(){let e=w(this,Tt,`f`);C(this,Tt,[],`f`);for(let t of e)t()},Zt=function(e,t){let n=w(this,It,`f`);if(n?.key.source===e&&(!cn(e)||un(n.key.params,t)))return n;let r=cn(e)?new e(t):e,i=[new ht(r,w(this,xt,`f`))];return C(this,It,{key:{source:e,params:t},transition:r,slots:i},`f`),{transition:r,slots:i}},Qt=function(e){let t=w(this,Rt,`f`);if(t&&(e===void 0||t.id===e)){C(this,Rt,null,`f`);for(let e of t.slots)e.end()}},$t=async function(e,t,n){if(w(this,Pt,`f`)&&await w(this,Pt,`f`),!t())return;let r=e===null?w(this,Nt,`f`)?w(this,Ft,`f`):[w(this,xt,`f`)]:[w(this,xt,`f`),...e];if(w(this,Nt,`f`)){if(!_n(r,w(this,Ft,`f`))){C(this,Ft,r,`f`);let e=w(this,yt,`f`).updateEffects(w(this,E,`f`),r).finally(()=>{C(this,Pt,null,`f`)});C(this,Pt,e,`f`),await e}n&&await w(this,yt,`f`).update(w(this,E,`f`))}else{let e=w(this,yt,`f`).addHTMLWithStill(w(this,E,`f`),{effect:r}).then(()=>{C(this,Nt,!0,`f`),C(this,Ft,r,`f`)}).finally(()=>{C(this,Pt,null,`f`)});C(this,Pt,e,`f`),await e}},en=function(e){if(w(this,Ct,`f`)&&!w(this,Mt,`f`))return;let t=()=>{e===w(this,At,`f`)&&w(this,Nt,`f`)&&(C(this,Nt,!1,`f`),C(this,Ft,[],`f`),w(this,yt,`f`).remove(w(this,E,`f`)))};w(this,Pt,`f`)?w(this,Pt,`f`).then(t,()=>{}):t()},tn=function(){let e=w(this,bt,`f`).waitFor??`media`;return e===`none`?Promise.resolve():e===`media`?mn(w(this,E,`f`),document.fonts?.ready):e(w(this,E,`f`))};function yn(e){let t=typeof window<`u`?window.devicePixelRatio:1,n;n=e.scrollPadding===void 0?[.1,.1]:e.scrollPadding===!1?[0,0]:Array.isArray(e.scrollPadding)?[e.scrollPadding[0]??.1,e.scrollPadding[1]??.1]:[e.scrollPadding,e.scrollPadding];let r;return r=e.postEffect===void 0?[]:Array.isArray(e.postEffect)?e.postEffect:[e.postEffect],{pixelRatio:e.pixelRatio??t,zIndex:e.zIndex??void 0,autoplay:e.autoplay??!0,fixedCanvas:e.scrollPadding===!1,scrollPadding:n,wrapper:e.wrapper,postEffects:r,preserveDrawingBuffer:e.preserveDrawingBuffer??!1,timeScale:e.timeScale??1}}var bn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},xn=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Sn,Cn,wn,Tn,En,Dn,On,kn,D=class{constructor(e,t,n){Sn.add(this),this.wrapS=`clamp`,this.wrapT=`clamp`,this.minFilter=`linear`,this.magFilter=`linear`,this.needsUpdate=!0,this.source=null,Cn.set(this,void 0),wn.set(this,!1),Tn.set(this,void 0),En.set(this,void 0),bn(this,Cn,e,`f`),this.gl=e.gl;let r=n?.externalHandle;bn(this,En,r!==void 0,`f`),r===void 0?xn(this,Sn,`m`,Dn).call(this):(this.texture=r,bn(this,wn,!0,`f`),this.needsUpdate=!1),t&&(this.source=t),bn(this,Tn,n?.autoRegister!==!1&&!xn(this,En,`f`),`f`),xn(this,Tn,`f`)&&e.addResource(this)}restore(){xn(this,En,`f`)||(xn(this,Sn,`m`,Dn).call(this),bn(this,wn,!1,`f`),this.needsUpdate=!0)}bind(e){let t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&=(xn(this,Sn,`m`,On).call(this),!1)}dispose(){xn(this,Tn,`f`)&&xn(this,Cn,`f`).removeResource(this),xn(this,En,`f`)||this.gl.deleteTexture(this.texture)}};Cn=new WeakMap,wn=new WeakMap,Tn=new WeakMap,En=new WeakMap,Sn=new WeakSet,Dn=function(){let e=this.gl.createTexture();if(!e)throw Error(`[VFX-JS] Failed to create texture`);this.texture=e},On=function(){let e=this.gl,t=this.source;if(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4),t)try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)}catch(e){console.error(e)}else if(!xn(this,wn,`f`)){let t=new Uint8Array([0,0,0,0]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,t)}xn(this,Sn,`m`,kn).call(this),bn(this,wn,!0,`f`)},kn=function(){let e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,An(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,An(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,jn(e,this.minFilter)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,jn(e,this.magFilter))};function An(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function jn(e,t){return t===`nearest`?e.NEAREST:e.LINEAR}function Mn(e){return new Promise((t,n)=>{let r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>t(r),r.onerror=n,r.src=e})}var Nn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Pn=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Fn,In,Ln,Rn=class{constructor(e,t,n,r={}){Fn.add(this),In.set(this,void 0),Nn(this,In,e,`f`),this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(n)),this.float=r.float??!1,this.mipmap=r.mipmap??!1,this.texture=new D(e,void 0,{autoRegister:!1});let i=r.wrap;i!==void 0&&(typeof i==`string`?(this.texture.wrapS=i,this.texture.wrapT=i):(this.texture.wrapS=i[0],this.texture.wrapT=i[1])),r.filter!==void 0&&(this.texture.minFilter=r.filter,this.texture.magFilter=r.filter),Pn(this,Fn,`m`,Ln).call(this),e.addResource(this)}setSize(e,t){let n=Math.max(1,Math.floor(e)),r=Math.max(1,Math.floor(t));(n!==this.width||r!==this.height)&&(this.width=n,this.height=r,Pn(this,Fn,`m`,Ln).call(this))}restore(){this.texture.restore(),Pn(this,Fn,`m`,Ln).call(this)}dispose(){Pn(this,In,`f`).removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.texture.dispose()}generateMipmaps(){if(!this.mipmap)return;let e=this.gl;e.bindTexture(e.TEXTURE_2D,this.texture.texture),e.generateMipmap(e.TEXTURE_2D),e.bindTexture(e.TEXTURE_2D,null)}};In=new WeakMap,Fn=new WeakSet,Ln=function(){let e=this.gl,t=this.fbo,n=e.createFramebuffer();if(!n)throw Error(`[VFX-JS] Failed to create framebuffer`);this.fbo=n;let r=this.texture.texture;e.bindTexture(e.TEXTURE_2D,r);let i=Pn(this,In,`f`).floatLinearFilter;if(this.float&&i&&!Pn(this,In,`f`).floatBlend)throw Error(`[VFX-JS] EXT_float_blend is not supported.`);let a=this.float?i?e.RGBA32F:e.RGBA16F:e.RGBA8,o=this.float?i?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;if(this.mipmap){let t=Math.floor(Math.log2(Math.max(this.width,this.height)))+1,n=this.width,r=this.height;for(let i=0;i<t;i++)e.texImage2D(e.TEXTURE_2D,i,a,n,r,0,e.RGBA,o,null),n=Math.max(1,n>>1),r=Math.max(1,r>>1)}else e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,e.RGBA,o,null);let s=this.texture.minFilter===`nearest`?e.NEAREST:e.LINEAR,c=this.texture.magFilter===`nearest`?e.NEAREST:e.LINEAR,l=this.mipmap?this.texture.minFilter===`nearest`?e.NEAREST_MIPMAP_NEAREST:e.LINEAR_MIPMAP_LINEAR:s,u=zn(e,this.texture.wrapS),d=zn(e,this.texture.wrapT);e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,l),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,c),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,u),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,d),e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.texture.needsUpdate=!1,this.texture.source=null,t&&e.deleteFramebuffer(t)};function zn(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function Bn(e,t,n,r){return{x:e.left+n,y:t-r-e.bottom,w:e.right-e.left,h:e.bottom-e.top}}function Vn(e,t,n,r){return{x:e,y:t,w:n,h:r}}var Hn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},O=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Un,Wn,Gn,Kn,qn=class{constructor(e,t,n,r,i,a={}){Un.set(this,void 0),Wn.set(this,void 0),Gn.set(this,void 0),Kn.set(this,void 0),Hn(this,Un,t,`f`),Hn(this,Wn,n,`f`),Hn(this,Gn,r,`f`);let o=t*r,s=n*r,c={float:i,wrap:a.wrap,filter:a.filter,mipmap:a.mipmap};Hn(this,Kn,[new Rn(e,o,s,c),new Rn(e,o,s,c)],`f`)}get texture(){return O(this,Kn,`f`)[0].texture}get target(){return O(this,Kn,`f`)[1]}resize(e,t){if(e===O(this,Un,`f`)&&t===O(this,Wn,`f`))return;Hn(this,Un,e,`f`),Hn(this,Wn,t,`f`);let n=e*O(this,Gn,`f`),r=t*O(this,Gn,`f`);O(this,Kn,`f`)[0].setSize(n,r),O(this,Kn,`f`)[1].setSize(n,r)}swap(){Hn(this,Kn,[O(this,Kn,`f`)[1],O(this,Kn,`f`)[0]],`f`)}getViewport(){return Vn(0,0,O(this,Un,`f`),O(this,Wn,`f`))}dispose(){O(this,Kn,`f`)[0].dispose(),O(this,Kn,`f`)[1].dispose()}};Un=new WeakMap,Wn=new WeakMap,Gn=new WeakMap,Kn=new WeakMap;var Jn=class{constructor(e=0,t=0){this.x=0,this.y=0,this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}},Yn=class{constructor(e=0,t=0,n=0,r=0){this.x=0,this.y=0,this.z=0,this.w=0,this.x=e,this.y=t,this.z=n,this.w=r}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}},Xn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Zn=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Qn,$n,er,tr,nr,rr,ir;function ar(e){return/#version\s+300\s+es\b/.test(e)?`300 es`:/#version\s+100\b/.test(e)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(e)?`100`:`300 es`}var or=class{constructor(e,t,n,r){Qn.add(this),$n.set(this,void 0),er.set(this,void 0),tr.set(this,void 0),nr.set(this,void 0),rr.set(this,new Map),Xn(this,$n,e,`f`),this.gl=e.gl,Xn(this,er,t,`f`),Xn(this,tr,n,`f`),Xn(this,nr,r??ar(n),`f`),Zn(this,Qn,`m`,ir).call(this),e.addResource(this)}restore(){Zn(this,Qn,`m`,ir).call(this)}use(){this.gl.useProgram(this.program)}hasUniform(e){return Zn(this,rr,`f`).has(e)}uploadUniforms(e){let t=this.gl,n=0;for(let[r,i]of Zn(this,rr,`f`)){let a=e[r];if(!a)continue;let o=a.value;o!=null&&(lr(i.type)?o instanceof D&&(o.bind(n),t.uniform1i(i.location,n),n++):o instanceof D||dr(t,i,o))}}dispose(){Zn(this,$n,`f`).removeResource(this),this.gl.deleteProgram(this.program)}};$n=new WeakMap,er=new WeakMap,tr=new WeakMap,nr=new WeakMap,rr=new WeakMap,Qn=new WeakSet,ir=function(){let e=this.gl,t=sr(e,e.VERTEX_SHADER,cr(Zn(this,er,`f`),Zn(this,nr,`f`))),n=sr(e,e.FRAGMENT_SHADER,cr(Zn(this,tr,`f`),Zn(this,nr,`f`))),r=e.createProgram();if(!r)throw Error(`[VFX-JS] Failed to create program`);if(e.attachShader(r,t),e.attachShader(r,n),e.bindAttribLocation(r,0,`position`),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let i=e.getProgramInfoLog(r)??``;throw e.deleteShader(t),e.deleteShader(n),e.deleteProgram(r),Error(`[VFX-JS] Program link failed: ${i}`)}e.detachShader(r,t),e.detachShader(r,n),e.deleteShader(t),e.deleteShader(n),this.program=r,Zn(this,rr,`f`).clear();let i=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<i;t++){let n=e.getActiveUniform(r,t);if(!n)continue;let i=n.name.replace(/\[0\]$/,``),a=e.getUniformLocation(r,n.name);a&&Zn(this,rr,`f`).set(i,{location:a,type:n.type,size:n.size})}};function sr(e,t,n){let r=e.createShader(t);if(!r)throw Error(`[VFX-JS] Failed to create shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)??``;throw e.deleteShader(r),Error(`[VFX-JS] Shader compile failed: ${t}\n\n${n}`)}return r}function cr(e,t){return e.replace(/^\s+/,``).startsWith(`#version`)||t===`100`?e:`#version 300 es\n${e}`}function lr(e){return e===35678||e===36298||e===36306||e===35682}var ur=new Set;function dr(e,t,n){let r=t.location,i=t.size>1,a=n,o=n,s=n;switch(t.type){case e.FLOAT:i?e.uniform1fv(r,a):e.uniform1f(r,n);return;case e.FLOAT_VEC2:if(i)e.uniform2fv(r,a);else if(n instanceof Jn)e.uniform2f(r,n.x,n.y);else{let t=n;e.uniform2f(r,t[0],t[1])}return;case e.FLOAT_VEC3:if(i)e.uniform3fv(r,a);else{let t=n;e.uniform3f(r,t[0],t[1],t[2])}return;case e.FLOAT_VEC4:if(i)e.uniform4fv(r,a);else if(n instanceof Yn)e.uniform4f(r,n.x,n.y,n.z,n.w);else{let t=n;e.uniform4f(r,t[0],t[1],t[2],t[3])}return;case e.INT:i?e.uniform1iv(r,o):e.uniform1i(r,n);return;case e.INT_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,t[0],t[1])}return;case e.INT_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,t[0],t[1],t[2])}return;case e.INT_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,t[0],t[1],t[2],t[3])}return;case e.BOOL:i?e.uniform1iv(r,o):e.uniform1i(r,+!!n);return;case e.BOOL_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,+!!t[0],+!!t[1])}return;case e.BOOL_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,+!!t[0],+!!t[1],+!!t[2])}return;case e.BOOL_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,+!!t[0],+!!t[1],+!!t[2],+!!t[3])}return;case e.FLOAT_MAT2:e.uniformMatrix2fv(r,!1,a);return;case e.FLOAT_MAT3:e.uniformMatrix3fv(r,!1,a);return;case e.FLOAT_MAT4:e.uniformMatrix4fv(r,!1,a);return;case e.UNSIGNED_INT:i?e.uniform1uiv(r,s):e.uniform1ui(r,n);return;case e.UNSIGNED_INT_VEC2:if(i)e.uniform2uiv(r,s);else{let t=n;e.uniform2ui(r,t[0],t[1])}return;case e.UNSIGNED_INT_VEC3:if(i)e.uniform3uiv(r,s);else{let t=n;e.uniform3ui(r,t[0],t[1],t[2])}return;case e.UNSIGNED_INT_VEC4:if(i)e.uniform4uiv(r,s);else{let t=n;e.uniform4ui(r,t[0],t[1],t[2],t[3])}return;default:ur.has(t.type)||(ur.add(t.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${t.type.toString(16)}; skipping upload.`));return}}var fr=class{constructor(e,t,n,r,i,a){this.gl=e.gl,this.program=new or(e,t,n,a),this.uniforms=r,this.blend=i}dispose(){this.program.dispose()}};function pr(e,t,n,r,i,a,o,s){let c=r?r.width/s:a,l=r?r.height/s:o,u=Math.max(0,i.x),d=Math.max(0,i.y),f=Math.min(c,i.x+i.w),p=Math.min(l,i.y+i.h),m=f-u,h=p-d;m<=0||h<=0||(e.bindFramebuffer(e.FRAMEBUFFER,r?r.fbo:null),e.viewport(Math.round(u*s),Math.round(d*s),Math.round(m*s),Math.round(h*s)),mr(e,n.blend),n.program.use(),n.program.uploadUniforms(n.uniforms),t.draw())}function mr(e,t){t===`none`?e.disable(e.BLEND):(e.enable(e.BLEND),e.blendEquation(e.FUNC_ADD),t===`premultiplied`?e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA):t===`additive`?e.blendFuncSeparate(e.ONE,e.ONE,e.ONE,e.ONE):e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA))}var hr=class{constructor(t){this.uniforms={src:{value:null},offset:{value:new Jn},resolution:{value:new Jn},viewport:{value:new Yn}},this.pass=new fr(t,`
precision highp float;
in vec3 position;
void main() {
    gl_Position = vec4(position, 1.0);
}
`,e,this.uniforms,`premultiplied`)}setUniforms(e,t,n){this.uniforms.src.value=e,this.uniforms.resolution.value.set(n.w*t,n.h*t),this.uniforms.offset.value.set(n.x*t,n.y*t)}dispose(){this.pass.dispose()}},gr=e=>{let t=document.implementation.createHTMLDocument(`test`),n=t.createRange();n.selectNodeContents(t.documentElement),n.deleteContents();let r=document.createElement(`head`);return t.documentElement.appendChild(r),t.documentElement.appendChild(n.createContextualFragment(e)),t.documentElement.setAttribute(`xmlns`,t.documentElement.namespaceURI),new XMLSerializer().serializeToString(t).replace(/<!DOCTYPE html>/,``)};async function _r(e,t,n,r){let i=e.getBoundingClientRect(),a=window.devicePixelRatio,o=Math.ceil(i.width),s=Math.ceil(i.height),c=o*a,l=s*a,u=1,d=c,f=l;r&&(d>r||f>r)&&(u=Math.min(r/d,r/f),d=Math.floor(d*u),f=Math.floor(f*u));let p=n&&n.width===d&&n.height===f?n:new OffscreenCanvas(d,f),m=e.cloneNode(!0);await br(e,m),xr(e,m),m.style.setProperty(`opacity`,t.toString()),m.style.setProperty(`margin`,`0px`),Sr(m),Cr(e,m),m.style.setProperty(`box-sizing`,`border-box`),m.style.setProperty(`width`,`${o}px`),m.style.setProperty(`height`,`${s}px`);let h=m.outerHTML,ee=`<svg xmlns="http://www.w3.org/2000/svg" width="${c}" height="${l}"><foreignObject width="100%" height="100%">${gr(h)}</foreignObject></svg>`,te=await new Promise(e=>{let t=new Image;t.onload=()=>e(t),t.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(ee)}`}),g=p.getContext(`2d`);if(g===null)throw Error(`[VFX-JS] Failed to get 2D context`);let _=()=>{g.clearRect(0,0,d,f);let e=a*u;g.scale(e,e),g.drawImage(te,0,0,c,l),g.setTransform(1,0,0,1,0,0)};if(_(),yr()&&m.querySelector(`img`))for(let e=0;e<vr;e++)await new Promise(e=>setTimeout(e,16)),_();return p}var vr=3;function yr(){let e=navigator.userAgent;return/AppleWebKit/.test(e)&&!/Chrome\/|Chromium\//.test(e)}async function br(e,t){let n=window.getComputedStyle(e);for(let e of Array.from(n))/(-inline-|-block-|^inline-|^block-)/.test(e)||/^-webkit-.*(start|end|before|after|logical)/.test(e)||t.style.setProperty(e,n.getPropertyValue(e),n.getPropertyPriority(e));if(t.tagName===`INPUT`)t.setAttribute(`value`,t.value);else if(t.tagName===`TEXTAREA`)t.innerHTML=t.value;else if(t.tagName===`IMG`)try{t.src=await Er(d(e))}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];await br(r,i)}}function xr(e,t){if(typeof e.computedStyleMap==`function`)try{let n=e.computedStyleMap();for(let e of[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`]){let r=n.get(e);r instanceof CSSKeywordValue&&r.value===`auto`&&t.style.setProperty(e,`auto`)}}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];r instanceof HTMLElement&&i instanceof HTMLElement&&xr(r,i)}}function Sr(e){let t=e;for(;;){let e=t.style;if(Number.parseFloat(e.paddingTop)>0||Number.parseFloat(e.borderTopWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.firstElementChild;if(!n)break;n.style.setProperty(`margin-top`,`0px`),t=n}for(t=e;;){let e=t.style;if(Number.parseFloat(e.paddingBottom)>0||Number.parseFloat(e.borderBottomWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.lastElementChild;if(!n)break;n.style.setProperty(`margin-bottom`,`0px`),t=n}}function Cr(e,t){let n=-e.scrollLeft,r=-e.scrollTop;for(let i=0;i<e.children.length;i++){let a=e.children[i],o=t.children[i];a&&(o instanceof HTMLElement||o instanceof SVGElement)&&((n!==0||r!==0)&&wr(o,n,r),Cr(a,o))}}function wr(e,t,n){let r=e.style.getPropertyValue(`translate`),[i=`0px`,a=`0px`,o]=r&&r!==`none`?Tr(r):[],s=`calc(${i} + ${t}px) calc(${a} + ${n}px)`;e.style.setProperty(`translate`,o?`${s} ${o}`:s)}function Tr(e){let t=[],n=0,r=``;for(let i of e.trim())i===`(`?n++:i===`)`&&n--,i===` `&&n===0?(r&&t.push(r),r=``):r+=i;return r&&t.push(r),t}async function Er(e){let t=await fetch(e).then(e=>e.blob());return new Promise(e=>{let n=new FileReader;n.onload=function(){e(this.result)},n.readAsDataURL(t)})}var Dr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},k=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Or,kr,Ar,jr,Mr,Nr,Pr,Fr,Ir,Lr,Rr,zr,Br=Object.freeze({__brand:`EffectQuad`});function Vr(e){return e===Br}function Hr(e,t){switch(t){case`lines`:return e.LINES;case`lineStrip`:return e.LINE_STRIP;case`points`:return e.POINTS;default:return e.TRIANGLES}}function Ur(e,t){if(t instanceof Float32Array)return e.FLOAT;if(t instanceof Uint8Array)return e.UNSIGNED_BYTE;if(t instanceof Uint16Array)return e.UNSIGNED_SHORT;if(t instanceof Uint32Array)return e.UNSIGNED_INT;if(t instanceof Int8Array)return e.BYTE;if(t instanceof Int16Array)return e.SHORT;if(t instanceof Int32Array)return e.INT;throw Error(`[VFX-JS] Unsupported attribute typed array`)}function Wr(e,t){if(ArrayBuffer.isView(t)&&!(t instanceof DataView))return{name:e,data:t,itemSize:2,normalized:!1,perInstance:!1};let n=t;return{name:e,data:n.data,itemSize:n.itemSize,normalized:n.normalized??!1,perInstance:n.perInstance??!1}}var Gr=class{constructor(e,t,n){Or.add(this),kr.set(this,void 0),Ar.set(this,void 0),jr.set(this,void 0),Mr.set(this,[]),Nr.set(this,null),this.indexType=0,this.hasIndices=!1,this.drawCount=0,this.drawStart=0,Pr.set(this,!1),Dr(this,kr,e,`f`),this.gl=e.gl,Dr(this,Ar,t,`f`),Dr(this,jr,n,`f`),this.mode=Hr(this.gl,t.mode),this.instanceCount=t.instanceCount??0,k(this,Or,`m`,Fr).call(this),e.addResource(this),Dr(this,Pr,!0,`f`)}restore(){Dr(this,Mr,[],`f`),Dr(this,Nr,null,`f`),k(this,Or,`m`,Fr).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),this.hasIndices?this.instanceCount>0?e.drawElementsInstanced(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2),this.instanceCount):e.drawElements(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2)):this.instanceCount>0?e.drawArraysInstanced(this.mode,this.drawStart,this.drawCount,this.instanceCount):e.drawArrays(this.mode,this.drawStart,this.drawCount)}dispose(){k(this,Pr,`f`)&&(k(this,kr,`f`).removeResource(this),Dr(this,Pr,!1,`f`));let e=this.gl;e.deleteVertexArray(this.vao);for(let t of k(this,Mr,`f`))e.deleteBuffer(t);k(this,Nr,`f`)&&e.deleteBuffer(k(this,Nr,`f`)),Dr(this,Mr,[],`f`),Dr(this,Nr,null,`f`)}};kr=new WeakMap,Ar=new WeakMap,jr=new WeakMap,Mr=new WeakMap,Nr=new WeakMap,Pr=new WeakMap,Or=new WeakSet,Fr=function(){let e=this.gl,t=e.createVertexArray();if(!t)throw Error(`[VFX-JS] Failed to create VAO`);this.vao=t,e.bindVertexArray(t);let n=k(this,jr,`f`).program,r=null;for(let[t,i]of Object.entries(k(this,Ar,`f`).attributes)){let a=Wr(t,i),o=e.getAttribLocation(n,a.name);if(o<0)continue;let s=e.createBuffer();if(!s)throw Error(`[VFX-JS] Failed to create VBO for "${a.name}"`);k(this,Mr,`f`).push(s),e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,a.data,e.STATIC_DRAW);let c=Ur(e,a.data);e.enableVertexAttribArray(o),c===e.FLOAT||c===e.HALF_FLOAT||a.normalized?e.vertexAttribPointer(o,a.itemSize,c,a.normalized,0,0):e.vertexAttribIPointer(o,a.itemSize,c,0,0),a.perInstance&&e.vertexAttribDivisor(o,1),t===`position`&&r===null&&(r=a.data.length/a.itemSize)}let i=0,a=k(this,Ar,`f`).indices;if(a){let t=e.createBuffer();if(!t)throw Error(`[VFX-JS] Failed to create IBO`);Dr(this,Nr,t,`f`),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t),e.bufferData(e.ELEMENT_ARRAY_BUFFER,a,e.STATIC_DRAW),this.hasIndices=!0,this.indexType=a instanceof Uint32Array?e.UNSIGNED_INT:e.UNSIGNED_SHORT,i=a.length}else this.hasIndices=!1;e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null),k(this,Nr,`f`)&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null);let o=this.hasIndices?i:r??0,s=k(this,Ar,`f`).drawRange;this.drawStart=s?.start??0,this.drawCount=s?.count===void 0?Math.max(0,o-this.drawStart):s.count};var Kr=class{constructor(e,t){Ir.set(this,void 0),Lr.set(this,void 0),Rr.set(this,new WeakMap),zr.set(this,new Set),Dr(this,Ir,e,`f`),Dr(this,Lr,t,`f`)}get quad(){return k(this,Lr,`f`)}resolve(e,t){let n=k(this,Rr,`f`).get(e);n||(n=new Map,k(this,Rr,`f`).set(e,n));let r=n.get(t);return r||(r=new Gr(k(this,Ir,`f`),e,t),n.set(t,r),k(this,zr,`f`).add(r)),r}release(e){let t=k(this,Rr,`f`).get(e);if(t){for(let e of t.values())e.dispose(),k(this,zr,`f`).delete(e);k(this,Rr,`f`).delete(e)}}dispose(){for(let e of k(this,zr,`f`))e.dispose();k(this,zr,`f`).clear()}};Ir=new WeakMap,Lr=new WeakMap,Rr=new WeakMap,zr=new WeakMap;var A=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},j=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},qr,Jr,Yr,Xr,Zr,Qr,$r,ei,ti,ni,M,ri,N,P,ii,ai,oi,si,ci,li,ui,di,fi,pi=Symbol.for(`@vfx-js/effect.resolve-texture`),mi=Symbol.for(`@vfx-js/effect.resolve-rt`);function hi(e){return e[pi]()}function gi(e){return e[mi]}var _i=`#version 300 es
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
`,vi=`
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
`,yi=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`,bi=`
precision highp float;
varying vec2 uv;
uniform sampler2D src;
void main() {
    gl_FragColor = texture2D(src, uv);
}
`,xi=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    bool inside = all(greaterThanEqual(uvSrc, vec2(0.0))) && all(lessThanEqual(uvSrc, vec2(1.0)));
    outColor = inside ? texture(src, uvSrc) : vec4(0.0);
}
`,Si=`
precision highp float;
varying vec2 uvSrc;
uniform sampler2D src;
void main() {
    bool inside = all(greaterThanEqual(uvSrc, vec2(0.0))) && all(lessThanEqual(uvSrc, vec2(1.0)));
    gl_FragColor = inside ? texture2D(src, uvSrc) : vec4(0.0);
}
`,Ci=class{constructor(e,t,n,r,i,a){qr.add(this),Jr.set(this,void 0),Yr.set(this,void 0),Xr.set(this,void 0),Zr.set(this,void 0),Qr.set(this,void 0),$r.set(this,[]),ei.set(this,[]),ti.set(this,[]),ni.set(this,[]),M.set(this,`init`),ri.set(this,!1),N.set(this,void 0),P.set(this,void 0),si.set(this,[]),A(this,Jr,e,`f`),A(this,Yr,e.gl,`f`),A(this,Xr,n,`f`),A(this,Zr,a,`f`),A(this,Qr,new Kr(e,t),`f`),A(this,N,{outputBufferW:1,outputBufferH:1,canvasBufferSize:[1,1],outputViewport:{x:0,y:0,w:1,h:1},elementBufferW:1,elementBufferH:1,contentRectUv:[0,0,1,1],srcRectUv:[0,0,1,1]},`f`);let o={time:0,deltaTime:0,pixelRatio:n,resolution:[1,1],mouse:[0,0],mouseViewport:[0,0],intersection:0,enterTime:0,leaveTime:0,enterProgress:0,leaveProgress:0,src:r,target:null,uniforms:{},vfxProps:i,dims:{element:[1,1],elementPixel:[1,1],canvas:[1,1],canvasPixel:[1,1],pixelRatio:n,contentRect:[0,0,1,1],srcRect:[0,0,1,1],canvasRect:[0,0,1,1]},quad:Br,gl:j(this,Yr,`f`),createRenderTarget:e=>j(this,qr,`m`,ii).call(this,e),releaseGeometry:e=>j(this,Qr,`f`).release(e),wrapTexture:(e,t)=>j(this,qr,`m`,oi).call(this,e,t),draw:e=>j(this,qr,`m`,ci).call(this,e),blit:(e,t,n)=>j(this,qr,`m`,li).call(this,e,t,n),clear:e=>j(this,qr,`m`,ui).call(this,e),onContextRestored:e=>{let t=j(this,Jr,`f`).onContextRestored(e);return j(this,ni,`f`).push(t),t}};A(this,P,o,`f`)}get ctx(){return j(this,P,`f`)}setPhase(e){A(this,M,e,`f`)}setFrameDims(e){A(this,N,e,`f`),j(this,P,`f`).resolution=[e.canvasBufferSize[0],e.canvasBufferSize[1]];for(let t of j(this,ti,`f`))t.resolver.resize?.(e.outputBufferW,e.outputBufferH)}setEffectDims(e){j(this,P,`f`).dims=e}setFrameState(e){let t=j(this,P,`f`);t.time=e.time,t.deltaTime=e.deltaTime,t.mouse=e.mouse,t.mouseViewport=e.mouseViewport,t.intersection=e.intersection,t.enterTime=e.enterTime,t.leaveTime=e.leaveTime,t.enterProgress=e.enterProgress,t.leaveProgress=e.leaveProgress,t.uniforms=e.uniforms}setSrc(e){j(this,P,`f`).src=e}setOutput(e){j(this,P,`f`).target=e}passthroughCopy(e,t,n){let r=j(this,M,`f`);A(this,M,`render`,`f`);let i=j(this,P,`f`).target;j(this,P,`f`).target=t;try{let r=j(this,N,`f`).outputViewport;j(this,N,`f`).outputViewport={...n};let i=j(this,P,`f`).vfxProps.glslVersion===`100`?bi:yi;j(this,qr,`m`,di).call(this,{frag:i,uniforms:{src:e},target:t}),j(this,N,`f`).outputViewport=r}finally{j(this,P,`f`).target=i,A(this,M,r,`f`)}}clearRt(e){let t=j(this,Yr,`f`),n=gi(e);t.bindFramebuffer(t.FRAMEBUFFER,n.getWriteFbo().fbo),t.viewport(0,0,e.width,e.height),t.clearColor(0,0,0,0),t.disable(t.SCISSOR_TEST),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)}tickAutoUpdates(){for(let e of j(this,si,`f`))e()}dispose(){A(this,M,`disposed`,`f`);for(let e of j(this,ni,`f`))e();A(this,ni,[],`f`);for(let e of j(this,ei,`f`))e.resolver.dispose?.();A(this,ei,[],`f`),A(this,ti,[],`f`);for(let e of j(this,$r,`f`))e.dispose();A(this,$r,[],`f`),j(this,Qr,`f`).dispose(),A(this,si,[],`f`)}};Jr=new WeakMap,Yr=new WeakMap,Xr=new WeakMap,Zr=new WeakMap,Qr=new WeakMap,$r=new WeakMap,ei=new WeakMap,ti=new WeakMap,ni=new WeakMap,M=new WeakMap,ri=new WeakMap,N=new WeakMap,P=new WeakMap,si=new WeakMap,qr=new WeakSet,ii=function(e){let t=e?.persistent??!1,n=e?.float??!1,r=Ti(e?.wrap),i=e?.filter,a=e?.mipmap??!1,o=a!==!1,s=a===!0,c=e?.size,l=c?c[0]:j(this,N,`f`).outputBufferW,u=c?c[1]:j(this,N,`f`).outputBufferH,d,f,p;if(t){let e=c?1:j(this,Xr,`f`),t=c?l:l/e,a=c?u:u/e,m=new qn(j(this,Jr,`f`),t,a,e,n,{wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>m.texture,getWriteFbo:()=>m.target,swap:()=>m.swap(),resize:c?void 0:(e,t)=>{m.resize(e/j(this,Xr,`f`),t/j(this,Xr,`f`))},dispose:()=>m.dispose()},o&&(d.regenerateMipmaps=()=>m.target.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>m.target.width,p=()=>m.target.height}else{let e=new Rn(j(this,Jr,`f`),l,u,{float:n,wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>e.texture,getWriteFbo:()=>e,resize:c?void 0:(t,n)=>e.setSize(t,n),dispose:()=>e.dispose()},o&&(d.regenerateMipmaps=()=>e.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>e.width,p=()=>e.height}let m,h=Oi(d,f,p,()=>j(this,qr,`m`,ai).call(this,m));return m={handle:h,resolver:d},j(this,ei,`f`).push(m),c||j(this,ti,`f`).push(m),h},ai=function(e){let t=j(this,ei,`f`).indexOf(e);if(t<0)return;j(this,ei,`f`).splice(t,1);let n=j(this,ti,`f`).indexOf(e);n>=0&&j(this,ti,`f`).splice(n,1),e.resolver.dispose?.()},oi=function(e,t){let n=Ti(t?.wrap),r=t?.filter,i,a,o,s=null,c=wi(e);if(c){if(!t?.size)throw Error(`[VFX-JS] wrapTexture(WebGLTexture) requires opts.size`);let[n,r]=t.size;i=new D(j(this,Jr,`f`),void 0,{autoRegister:!1,externalHandle:e}),a=()=>n,o=()=>r}else{let n=e;i=new D(j(this,Jr,`f`),n);let r=t?.size,c=e=>{if(r)return e===`w`?r[0]:r[1];if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return e===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return e===`w`?n.videoWidth:n.videoHeight;let t=n;return e===`w`?t.width:t.height};a=()=>c(`w`),o=()=>c(`h`);let l=typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement||typeof HTMLCanvasElement<`u`&&n instanceof HTMLCanvasElement||typeof OffscreenCanvas<`u`&&n instanceof OffscreenCanvas;(t?.autoUpdate??l)&&(s=()=>{i.needsUpdate=!0})}i.wrapS=n[0],i.wrapT=n[1],r!==void 0&&(i.minFilter=r,i.magFilter=r),j(this,$r,`f`).push(i),s&&j(this,si,`f`).push(s);let l=!1;return Di(()=>i,a,o,()=>{if(l)return;l=!0;let e=j(this,$r,`f`).indexOf(i);if(e!==-1&&j(this,$r,`f`).splice(e,1),s){let e=j(this,si,`f`).indexOf(s);e!==-1&&j(this,si,`f`).splice(e,1)}i.dispose()},c?void 0:()=>{l||(i.needsUpdate=!0)})},ci=function(e){j(this,M,`f`)===`render`?j(this,qr,`m`,di).call(this,e):j(this,M,`f`)===`update`&&!j(this,ri,`f`)&&(A(this,ri,!0,`f`),console.warn(`[VFX-JS] ctx.draw() called in update(); ignored. Move draws to render().`))},li=function(e,t,n){if(j(this,M,`f`)!==`render`){j(this,M,`f`)===`update`&&!j(this,ri,`f`)&&(A(this,ri,!0,`f`),console.warn(`[VFX-JS] ctx.blit() called in update(); ignored. Move draws to render().`));return}let r=j(this,P,`f`).vfxProps.glslVersion===`100`?Si:xi;j(this,qr,`m`,di).call(this,{frag:r,uniforms:{src:e},target:t,blend:n?.blend,swap:n?.swap})},ui=function(e){if(j(this,M,`f`)!==`render`){j(this,M,`f`)===`update`&&!j(this,ri,`f`)&&(A(this,ri,!0,`f`),console.warn(`[VFX-JS] ctx.clear() called in update(); ignored. Move draws to render().`));return}let t=j(this,Yr,`f`),n=j(this,P,`f`).target,r=e??n,i=r===null||r===n;if(t.clearColor(0,0,0,0),i){let e=r===null?null:gi(r).getWriteFbo().fbo,n=j(this,N,`f`).outputViewport;t.bindFramebuffer(t.FRAMEBUFFER,e),t.enable(t.SCISSOR_TEST),t.scissor(n.x,n.y,n.w,n.h),t.clear(t.COLOR_BUFFER_BIT),t.disable(t.SCISSOR_TEST),t.bindFramebuffer(t.FRAMEBUFFER,null);return}let a=gi(r);t.disable(t.SCISSOR_TEST);let o=()=>{t.bindFramebuffer(t.FRAMEBUFFER,a.getWriteFbo().fbo),t.clear(t.COLOR_BUFFER_BIT)};o(),a.swap&&(a.swap(),o(),a.swap()),t.bindFramebuffer(t.FRAMEBUFFER,null)},di=function(e){let t=j(this,Yr,`f`),n=e.vert??(j(this,P,`f`).vfxProps.glslVersion===`100`?vi:_i),r=j(this,Zr,`f`).get(n,e.frag,j(this,P,`f`).vfxProps.glslVersion),i=j(this,P,`f`).target,a=e.target===void 0||e.target===null?i:e.target,o=a===null||a===i,s,c,l,u,d,f,p;if(a===null)s=null,c=j(this,N,`f`).outputViewport.x,l=j(this,N,`f`).outputViewport.y,u=j(this,N,`f`).outputViewport.w,d=j(this,N,`f`).outputViewport.h;else{let e=gi(a);s=e.getWriteFbo().fbo,o?(c=j(this,N,`f`).outputViewport.x,l=j(this,N,`f`).outputViewport.y,u=j(this,N,`f`).outputViewport.w,d=j(this,N,`f`).outputViewport.h):(c=0,l=0,u=a.width,d=a.height),f=e.swap,e.mipmapAutoRegen&&(p=e.regenerateMipmaps)}t.bindFramebuffer(t.FRAMEBUFFER,s),t.viewport(c,l,u,d),t.disable(t.SCISSOR_TEST),mr(t,e.blend??(a===null?`premultiplied`:`none`)),r.use();let m=j(this,qr,`m`,fi).call(this,e.uniforms);r.uploadUniforms(m);let h=e.geometry??Br;Vr(h)?j(this,Qr,`f`).quad.draw():j(this,Qr,`f`).resolve(h,r).draw(),p?.(),f&&e.swap!==!1&&f()},fi=function(e){let t={};if(t.contentRectUv={value:j(this,N,`f`).contentRectUv},t.srcRectUv={value:j(this,N,`f`).srcRectUv},!e)return t;for(let[n,r]of Object.entries(e))t[n]=Ei(r);return t};function wi(e){let t=globalThis.WebGLTexture;if(t&&typeof t==`function`&&e instanceof t)return!0;let n=e;return n.width===void 0&&n.naturalWidth===void 0&&n.videoWidth===void 0}function Ti(e){return e===void 0?[`clamp`,`clamp`]:typeof e==`string`?[e,e]:[e[0],e[1]]}function Ei(e){return typeof e==`object`&&e&&`__brand`in e?e.__brand===`EffectRenderTarget`?{value:gi(e).getReadTexture()}:{value:hi(e)}:{value:e}}function Di(e,t,n,r,i){let a={__brand:`EffectTexture`,get width(){return t()},get height(){return n()},dispose(){r?.()},update(){i?.()}};return Object.defineProperty(a,pi,{value:e}),a}function Oi(e,t,n,r){let i={__brand:`EffectRenderTarget`,get width(){return t()},get height(){return n()},dispose:r??(()=>{}),generateMipmaps:()=>e.regenerateMipmaps?.()};return Object.defineProperty(i,mi,{value:e}),i}function ki(e){return Oi({getReadTexture:()=>e.texture,getWriteFbo:()=>e},()=>e.width,()=>e.height)}function Ai(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:Array.isArray(e)?{top:e[0],right:e[1],bottom:e[2],left:e[3]}:{top:e.top??0,right:e.right??0,bottom:e.bottom??0,left:e.left??0}}function ji(e){return Ai(e)}var Mi={top:0,right:0,bottom:0,left:0};function Ni(e){return Ai(e)}function Pi(e){return{top:e.top,right:e.right,bottom:e.bottom,left:e.left}}function Fi(e){return{top:e.top,left:e.left,right:e.left+Math.ceil(e.right-e.left),bottom:e.top+Math.ceil(e.bottom-e.top)}}function Ii(e,t){return{top:e.top-t.top,right:e.right+t.right,bottom:e.bottom+t.bottom,left:e.left-t.left}}function Li(e,t,n){return Math.min(Math.max(e,t),n)}function Ri(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return c<=0||l<=0?[0,0,1,1]:[(n-o)/c,(r-s)/l,i/c,a/l]}function zi(e,t){return Bi(e.left,e.right,t.left,t.right)*Bi(e.top,e.bottom,t.top,t.bottom)}function Bi(e,t,n,r){let i=Math.min(r-n,t-e);if(i<=0)return 0;let a=Li(n,e,t);return(Li(r,e,t)-a)/i}var F=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},I=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},L,Vi,Hi,Ui,Wi,Gi,R,z,Ki,qi,Ji,Yi,Xi,Zi,Qi,$i,ea,ta,na,ra,ia,aa,oa,sa,ca,la,ua,da=class{constructor(e,t,n,r,i,a,o,s){L.add(this),Vi.set(this,void 0),Hi.set(this,void 0),Ui.set(this,void 0),Wi.set(this,void 0),Gi.set(this,void 0),R.set(this,void 0),z.set(this,void 0),Ki.set(this,void 0),qi.set(this,[]),Ji.set(this,[]),Yi.set(this,void 0),Xi.set(this,new Set),Zi.set(this,!1),Qi.set(this,void 0),$i.set(this,ji(0)),ea.set(this,null),F(this,Vi,e,`f`),F(this,Hi,t,`f`),F(this,Ui,n,`f`),F(this,Wi,i,`f`),F(this,Gi,s,`f`),F(this,R,r,`f`),F(this,Yi,a,`f`),F(this,Qi,o,`f`),F(this,z,r.map(()=>I(this,L,`m`,na).call(this)),`f`),r.length===0&&F(this,ea,I(this,L,`m`,na).call(this),`f`),F(this,Ki,I(this,L,`m`,ta).call(this),`f`)}get effects(){return I(this,R,`f`)}get hosts(){return I(this,z,`f`)}get renderingIndices(){return I(this,Ki,`f`)}get stages(){return I(this,Ji,`f`)}get hitTestPadBuffer(){return I(this,$i,`f`)}async initAll(){for(let e=0;e<I(this,R,`f`).length;e++){let t=I(this,R,`f`)[e],n=I(this,z,`f`)[e];n.setPhase(`init`);try{t.init&&await t.init(n.ctx)}catch(t){console.error(`[VFX-JS] effect[${e}].init() failed:`,t);for(let t=e-1;t>=0;t--)I(this,L,`m`,ra).call(this,t),I(this,z,`f`)[t].dispose();throw I(this,z,`f`)[e].dispose(),t}n.setPhase(`update`)}}run(e){if(I(this,Zi,`f`)||!e.isVisible)return;F(this,Ki,I(this,L,`m`,ta).call(this),`f`);let t=I(this,Ki,`f`).length;for(let t of I(this,z,`f`))t.setFrameState({time:e.time,deltaTime:e.deltaTime,mouse:e.mouse,mouseViewport:e.mouseViewport,intersection:e.intersection,enterTime:e.enterTime,leaveTime:e.leaveTime,enterProgress:e.enterProgress,leaveProgress:e.leaveProgress,uniforms:e.resolvedUniforms});I(this,L,`m`,ia).call(this,e);for(let t=0;t<I(this,z,`f`).length;t++)I(this,z,`f`)[t].setFrameDims(I(this,L,`m`,ua).call(this,t,e)),I(this,z,`f`)[t].setEffectDims(I(this,L,`m`,sa).call(this,t,e));for(let e=0;e<I(this,R,`f`).length;e++){let t=I(this,R,`f`)[e];if(!t.update)continue;let n=I(this,z,`f`)[e];n.setPhase(`update`);try{t.update(n.ctx)}catch(t){let n=`${e}:update`;I(this,Xi,`f`).has(n)||(I(this,Xi,`f`).add(n),console.warn(`[VFX-JS] effect[${e}].update() threw; skipping this frame's update:`,t))}}if(t===0)(I(this,ea,`f`)??I(this,z,`f`)[0]).passthroughCopy(I(this,Yi,`f`),e.finalTarget,e.elementRectOnCanvasPx);else for(let n=0;n<t;n++){let r=I(this,Ki,`f`)[n],i=I(this,z,`f`)[r],a=I(this,R,`f`)[r];if(!a.render)continue;i.setPhase(`render`),i.tickAutoUpdates();let o=n===0?I(this,Yi,`f`):I(this,qi,`f`)[n-1].texHandle;i.setSrc(o);let s;n===t-1?s=e.finalTarget:(s=I(this,qi,`f`)[n].rtHandle,i.clearRt(s)),i.setOutput(s);try{a.render(i.ctx)}catch(e){let a=`${r}:render`;I(this,Xi,`f`).has(a)||(I(this,Xi,`f`).add(a),console.warn(`[VFX-JS] effect[${r}].render() threw; falling back to passthrough:`,e));let c=I(this,Ji,`f`)[n].outputViewport;s===null?i.passthroughCopy(o,null,c):n===t-1?i.passthroughCopy(o,s,c):i.passthroughCopy(o,s,{x:0,y:0,w:s.width,h:s.height})}i.setPhase(`update`)}}dispose(){if(!I(this,Zi,`f`)){F(this,Zi,!0,`f`);for(let e=I(this,R,`f`).length-1;e>=0;e--)I(this,L,`m`,ra).call(this,e),I(this,z,`f`)[e].dispose();I(this,ea,`f`)&&(I(this,ea,`f`).dispose(),F(this,ea,null,`f`));for(let e of I(this,qi,`f`))e.fb.dispose();F(this,qi,[],`f`),F(this,Ji,[],`f`)}}async replaceEffects(e){if(I(this,Zi,`f`))throw Error(`[VFX-JS] replaceEffects on disposed chain`);let t=I(this,R,`f`),n=I(this,z,`f`),r=new Map;for(let e=0;e<t.length;e++)r.set(t[e],n[e]);let i=Array(e.length),a=[];for(let t=0;t<e.length;t++){let n=e[t],o=r.get(n);if(o)i[t]=o,r.delete(n);else{let e=I(this,L,`m`,na).call(this);i[t]=e,a.push({host:e,effect:n})}}for(let e=0;e<a.length;e++){let{host:t,effect:n}=a[e];t.setPhase(`init`);try{n.init&&await n.init(t.ctx),t.setPhase(`update`)}catch(n){console.error(`[VFX-JS] replaceEffects: new effect init() failed:`,n);for(let t=e-1;t>=0;t--){let e=a[t];if(e.effect.dispose)try{e.effect.dispose()}catch(e){console.error(`[VFX-JS] dispose during init rollback threw:`,e)}e.host.dispose()}throw t.dispose(),n}}for(let[e,t]of r){if(e.dispose)try{e.dispose()}catch(e){console.error(`[VFX-JS] effect.dispose() threw during replaceEffects:`,e)}t.dispose()}for(let e of I(this,qi,`f`))e.fb.dispose();F(this,qi,[],`f`),F(this,Ji,[],`f`),e.length===0&&!I(this,ea,`f`)?F(this,ea,I(this,L,`m`,na).call(this),`f`):e.length>0&&I(this,ea,`f`)&&(I(this,ea,`f`).dispose(),F(this,ea,null,`f`)),F(this,R,e,`f`),F(this,z,i,`f`),F(this,Ki,I(this,L,`m`,ta).call(this),`f`),I(this,Xi,`f`).clear()}};Vi=new WeakMap,Hi=new WeakMap,Ui=new WeakMap,Wi=new WeakMap,Gi=new WeakMap,R=new WeakMap,z=new WeakMap,Ki=new WeakMap,qi=new WeakMap,Ji=new WeakMap,Yi=new WeakMap,Xi=new WeakMap,Zi=new WeakMap,Qi=new WeakMap,$i=new WeakMap,ea=new WeakMap,L=new WeakSet,ta=function(){return I(this,R,`f`).map((e,t)=>typeof e.render==`function`&&e.enabled!==!1?t:-1).filter(e=>e>=0)},na=function(){return new Ci(I(this,Vi,`f`),I(this,Hi,`f`),I(this,Ui,`f`),I(this,Yi,`f`),I(this,Wi,`f`),I(this,Gi,`f`))},ra=function(e){let t=I(this,R,`f`)[e];if(t.dispose)try{t.dispose()}catch(t){console.error(`[VFX-JS] effect[${e}].dispose() threw:`,t)}},ia=function(e){let t=I(this,Ki,`f`).length;if(F(this,Ji,Array(t),`f`),t===0)return;let n=I(this,Qi,`f`)?e.canvasBufferSize:e.elementBufferSize,r=[0,0,n[0],n[1]],i=I(this,L,`m`,la).call(this,e),a=r;for(let n=0;n<t;n++){let o=I(this,Ki,`f`)[n],s=I(this,R,`f`)[o],c=n===t-1,l=I(this,L,`m`,aa).call(this,s,a,r,i,e)??a,u=[l[2],l[3]],d=Ri(r,l),f=c?{x:e.elementRectOnCanvasPx.x+l[0],y:e.elementRectOnCanvasPx.y+l[1],w:u[0],h:u[1]}:{x:0,y:0,w:u[0],h:u[1]};I(this,Ji,`f`)[n]={dstRect:l,dstBufferSize:u,contentRectUv:d,outputViewport:f},c||I(this,L,`m`,ca).call(this,n,u),a=l}let[o,s,c,l]=I(this,Ji,`f`)[t-1].dstRect;F(this,$i,ji({top:Math.max(0,s+l-n[1]),right:Math.max(0,o+c-n[0]),bottom:Math.max(0,-s),left:Math.max(0,-o)}),`f`)},aa=function(e,t,n,r,i){if(e.outputRect)return e.outputRect(I(this,L,`m`,oa).call(this,i,n,t,r))},oa=function(e,t,n,r){let i=e.canvasBufferSize[0]/e.canvasSize[0]||1;return{element:I(this,Qi,`f`)?e.canvasSize:e.elementSize,elementPixel:I(this,Qi,`f`)?e.canvasBufferSize:e.elementBufferSize,canvas:e.canvasSize,canvasPixel:e.canvasBufferSize,pixelRatio:i,contentRect:t,srcRect:n,canvasRect:r}},sa=function(e,t){let n=I(this,Qi,`f`)?t.canvasBufferSize:t.elementBufferSize,r=[0,0,n[0],n[1]],i=I(this,L,`m`,la).call(this,t),a=I(this,Ki,`f`).indexOf(e),o=a<=0?r:I(this,Ji,`f`)[a-1].dstRect;return I(this,L,`m`,oa).call(this,t,r,o,i)},ca=function(e,t){let n=I(this,qi,`f`)[e];if(n&&n.fb.width===t[0]&&n.fb.height===t[1])return;n&&n.fb.dispose();let r=new Rn(I(this,Vi,`f`),t[0],t[1]),i=ki(r),a=Di(()=>r.texture,()=>r.width,()=>r.height);I(this,qi,`f`)[e]={fb:r,rtHandle:i,texHandle:a,bufferSize:t}},la=function(e){let[t,n]=e.canvasBufferSize;if(I(this,Qi,`f`))return[0,0,t,n];let{x:r,y:i}=e.elementRectOnCanvasPx;return[-r,-i,t,n]},ua=function(e,t){let n=I(this,Ki,`f`).indexOf(e),r,i,a,o,s;if(n<0)r=t.elementBufferSize[0],i=t.elementBufferSize[1],a={x:0,y:0,w:r,h:i},o=[0,0,1,1],s=[0,0,1,1];else{let e=I(this,Ji,`f`)[n];r=e.dstBufferSize[0],i=e.dstBufferSize[1],a=e.outputViewport,o=e.contentRectUv,s=n===0?[0,0,1,1]:I(this,Ji,`f`)[n-1].contentRectUv}return{outputBufferW:r,outputBufferH:i,canvasBufferSize:t.canvasBufferSize,outputViewport:a,elementBufferW:t.elementBufferSize[0],elementBufferH:t.elementBufferSize[1],contentRectUv:o,srcRectUv:s}};var fa=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},pa=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ma,ha,ga,_a,va=class{constructor(e){ma.add(this),ha.set(this,void 0),ga.set(this,new Set),fa(this,ha,e,`f`)}freezeInside(e,t){let n={root:e,entries:[]};for(let r of t)!r.frozen&&ya(e,r.element)&&(r.frozen=!0,n.entries.push({e:r,opacity:r.element.style.opacity}),pa(this,ha,`f`).showPlain(r));pa(this,ga,`f`).add(n);let r=!1;return()=>{if(!r){r=!0,pa(this,ga,`f`).delete(n);for(let{e}of n.entries)e.frozen=!1;requestAnimationFrame(()=>{for(let{e,opacity:t}of n.entries)!e.frozen&&pa(this,ha,`f`).isRegistered(e)&&pa(this,ha,`f`).hidePlain(e,t)})}}}adopt(e,t){let n=pa(this,ma,`m`,_a).call(this,e.element);return n?(e.frozen=!0,n.entries.push({e,opacity:t??e.element.style.opacity}),!0):!1}};ha=new WeakMap,ga=new WeakMap,ma=new WeakSet,_a=function(e){for(let t of pa(this,ga,`f`))if(ya(t.root,e))return t};function ya(e,t){return t!==e&&e.contains(t)}function ba(e){this.data=e,this.pos=0}ba.prototype.readByte=function(){return this.data[this.pos++]},ba.prototype.peekByte=function(){return this.data[this.pos]},ba.prototype.readBytes=function(e){return this.data.subarray(this.pos,this.pos+=e)},ba.prototype.peekBytes=function(e){return this.data.subarray(this.pos,this.pos+e)},ba.prototype.readString=function(e){for(var t=``,n=0;n<e;n++)t+=String.fromCharCode(this.readByte());return t},ba.prototype.readBitArray=function(){for(var e=[],t=this.readByte(),n=7;n>=0;n--)e.push(!!(t&1<<n));return e},ba.prototype.readUnsigned=function(e){var t=this.readBytes(2);return e?(t[1]<<8)+t[0]:(t[0]<<8)+t[1]};function xa(e){this.stream=new ba(e),this.output={}}xa.prototype.parse=function(e){return this.parseParts(this.output,e),this.output},xa.prototype.parseParts=function(e,t){for(var n=0;n<t.length;n++){var r=t[n];this.parsePart(e,r)}},xa.prototype.parsePart=function(e,t){var n=t.label,r;if(!t.requires||t.requires(this.stream,this.output,e)){if(t.loop){for(var i=[];t.loop(this.stream);){var a={};this.parseParts(a,t.parts),i.push(a)}e[n]=i}else t.parts?(r={},this.parseParts(r,t.parts),e[n]=r):t.parser?(r=t.parser(this.stream,this.output,e),t.skip||(e[n]=r)):t.bits&&(e[n]=this.parseBits(t.bits))}};function Sa(e){return e.reduce(function(e,t){return e*2+t},0)}xa.prototype.parseBits=function(e){var t={},n=this.stream.readBitArray();for(var r in e){var i=e[r];t[r]=i.length?Sa(n.slice(i.index,i.index+i.length)):n[i.index]}return t};var B={readByte:function(){return function(e){return e.readByte()}},readBytes:function(e){return function(t){return t.readBytes(e)}},readString:function(e){return function(t){return t.readString(e)}},readUnsigned:function(e){return function(t){return t.readUnsigned(e)}},readArray:function(e,t){return function(n,r,i){for(var a=t(n,r,i),o=Array(a),s=0;s<a;s++)o[s]=n.readBytes(e);return o}}},Ca={label:`blocks`,parser:function(e){for(var t=[],n=0,r=0,i=e.readByte();i!==r;i=e.readByte())t.push(e.readBytes(i)),n+=i;var a=new Uint8Array(n);n=0;for(var o=0;o<t.length;o++)a.set(t[o],n),n+=t[o].length;return a}},wa={label:`gce`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===249},parts:[{label:`codes`,parser:B.readBytes(2),skip:!0},{label:`byteSize`,parser:B.readByte()},{label:`extras`,bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:`delay`,parser:B.readUnsigned(!0)},{label:`transparentColorIndex`,parser:B.readByte()},{label:`terminator`,parser:B.readByte(),skip:!0}]},Ta={label:`image`,requires:function(e){return e.peekByte()===44},parts:[{label:`code`,parser:B.readByte(),skip:!0},{label:`descriptor`,parts:[{label:`left`,parser:B.readUnsigned(!0)},{label:`top`,parser:B.readUnsigned(!0)},{label:`width`,parser:B.readUnsigned(!0)},{label:`height`,parser:B.readUnsigned(!0)},{label:`lct`,bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:`lct`,requires:function(e,t,n){return n.descriptor.lct.exists},parser:B.readArray(3,function(e,t,n){return 2**(n.descriptor.lct.size+1)})},{label:`data`,parts:[{label:`minCodeSize`,parser:B.readByte()},Ca]}]},Ea={label:`text`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===1},parts:[{label:`codes`,parser:B.readBytes(2),skip:!0},{label:`blockSize`,parser:B.readByte()},{label:`preData`,parser:function(e,t,n){return e.readBytes(n.text.blockSize)}},Ca]},Da={label:`frames`,parts:[wa,{label:`application`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===255},parts:[{label:`codes`,parser:B.readBytes(2),skip:!0},{label:`blockSize`,parser:B.readByte()},{label:`id`,parser:function(e,t,n){return e.readString(n.blockSize)}},Ca]},{label:`comment`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===254},parts:[{label:`codes`,parser:B.readBytes(2),skip:!0},Ca]},Ta,Ea],loop:function(e){var t=e.peekByte();return t===33||t===44}},Oa=[{label:`header`,parts:[{label:`signature`,parser:B.readString(3)},{label:`version`,parser:B.readString(3)}]},{label:`lsd`,parts:[{label:`width`,parser:B.readUnsigned(!0)},{label:`height`,parser:B.readUnsigned(!0)},{label:`gct`,bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:`backgroundColorIndex`,parser:B.readByte()},{label:`pixelAspectRatio`,parser:B.readByte()}]},{label:`gct`,requires:function(e,t){return t.lsd.gct.exists},parser:B.readArray(3,function(e,t){return 2**(t.lsd.gct.size+1)})},Da];function ka(e){var t=new xa(new Uint8Array(e));this.raw=t.parse(Oa),this.raw.hasImages=!1;for(var n=0;n<this.raw.frames.length;n++)if(this.raw.frames[n].image){this.raw.hasImages=!0;break}}ka.prototype.decompressFrame=function(e,t){if(e>=this.raw.frames.length)return null;var n=this.raw.frames[e];if(n.image){var r=n.image.descriptor.width*n.image.descriptor.height,i=o(n.image.data.minCodeSize,n.image.data.blocks,r);n.image.descriptor.lct.interlaced&&(i=s(i,n.image.descriptor.width));var a={pixels:i,dims:{top:n.image.descriptor.top,left:n.image.descriptor.left,width:n.image.descriptor.width,height:n.image.descriptor.height}};return a.colorTable=n.image.descriptor.lct&&n.image.descriptor.lct.exists?n.image.lct:this.raw.gct,n.gce&&(a.delay=(n.gce.delay||10)*10,a.disposalType=n.gce.extras.disposal,n.gce.extras.transparentColorGiven&&(a.transparentIndex=n.gce.transparentColorIndex)),t&&(a.patch=c(a)),a}return null;function o(e,t,n){var r=4096,i=-1,a=n,o,s,c,l,u,d,f,p,m,h,ee,te,g,_,v,y,ne=Array(n),re=Array(r),b=Array(r),ie=Array(r+1);for(te=e,s=1<<te,u=s+1,o=s+2,f=i,l=te+1,c=(1<<l)-1,m=0;m<s;m++)re[m]=0,b[m]=m;for(ee=p=g=_=y=v=0,h=0;h<a;){if(_===0){if(p<l){ee+=t[v]<<p,p+=8,v++;continue}if(m=ee&c,ee>>=l,p-=l,m>o||m==u)break;if(m==s){l=te+1,c=(1<<l)-1,o=s+2,f=i;continue}if(f==i){ie[_++]=b[m],f=m,g=m;continue}for(d=m,m==o&&(ie[_++]=g,m=f);m>s;)ie[_++]=b[m],m=re[m];g=b[m]&255,ie[_++]=g,o<r&&(re[o]=f,b[o]=g,o++,(o&c)===0&&o<r&&(l++,c+=o)),f=d}_--,ne[y++]=ie[_],h++}for(h=y;h<a;h++)ne[h]=0;return ne}function s(e,t){for(var n=Array(e.length),r=e.length/t,i=function(r,i){var a=e.slice(i*t,(i+1)*t);n.splice.apply(n,[r*t,t].concat(a))},a=[0,4,2,1],o=[8,8,4,2],s=0,c=0;c<4;c++)for(var l=a[c];l<r;l+=o[c])i(l,s),s++;return n}function c(e){for(var t=e.pixels.length,n=new Uint8ClampedArray(t*4),r=0;r<t;r++){var i=r*4,a=e.pixels[r],o=e.colorTable[a];n[i]=o[0],n[i+1]=o[1],n[i+2]=o[2],n[i+3]=a===e.transparentIndex?0:255}return n}},ka.prototype.decompressFrames=function(e,t,n){t===void 0&&(t=0),n=n===void 0?this.raw.frames.length:Math.min(n,this.raw.frames.length);for(var r=[],i=t;i<n;i++)this.raw.frames[i].image&&r.push(this.decompressFrame(i,e));return r};var Aa=ka,ja=class e{static async create(t,n){let r=await fetch(t).then(e=>e.arrayBuffer()).then(e=>new Aa(e)),i=r.decompressFrames(!0,void 0,void 0),{width:a,height:o}=r.raw.lsd;return new e(i,a,o,n)}constructor(e,t,n,r){this.frames=[],this.index=0,this.playTime=0,this.frames=e,this.canvas=document.createElement(`canvas`),this.ctx=this.canvas.getContext(`2d`),this.pixelRatio=r,this.canvas.width=t,this.canvas.height=n,this.startTime=Date.now()}getCanvas(){return this.canvas}update(){let e=Date.now()-this.startTime;for(;this.playTime<e;){let e=this.frames[this.index%this.frames.length];this.playTime+=e.delay,this.index++}let t=this.frames[this.index%this.frames.length],n=new ImageData(t.patch,t.dims.width,t.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(n,t.dims.left,t.dims.top)}},Ma=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Na,Pa,Fa,Ia,La,Ra=class{constructor(e,t=!1){this.isContextLost=!1,Na.set(this,new Set),Pa.set(this,new Set),Fa.set(this,new Set),Ia.set(this,e=>{e.preventDefault(),this.isContextLost=!0;for(let e of Ma(this,Pa,`f`))e()}),La.set(this,()=>{this.isContextLost=!1;let e=this.gl;e.getExtension(`EXT_color_buffer_float`),e.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!e.getExtension(`EXT_float_blend`);for(let e of Ma(this,Na,`f`))e.restore();for(let e of Ma(this,Fa,`f`))e()});let n=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:t});if(!n)throw Error(`[VFX-JS] WebGL2 is not available.`);this.gl=n,this.canvas=e,n.getExtension(`EXT_color_buffer_float`),n.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!n.getExtension(`EXT_float_blend`),this.floatLinearFilter=!!n.getExtension(`OES_texture_float_linear`),this.maxTextureSize=n.getParameter(n.MAX_TEXTURE_SIZE),e.addEventListener(`webglcontextlost`,Ma(this,Ia,`f`),!1),e.addEventListener(`webglcontextrestored`,Ma(this,La,`f`),!1)}setSize(e,t,n){let r=Math.floor(e*n),i=Math.floor(t*n);(this.canvas.width!==r||this.canvas.height!==i)&&(this.canvas.width=r,this.canvas.height=i)}addResource(e){Ma(this,Na,`f`).add(e)}removeResource(e){Ma(this,Na,`f`).delete(e)}onContextLost(e){return Ma(this,Pa,`f`).add(e),()=>Ma(this,Pa,`f`).delete(e)}onContextRestored(e){return Ma(this,Fa,`f`).add(e),()=>Ma(this,Fa,`f`).delete(e)}};Na=new WeakMap,Pa=new WeakMap,Fa=new WeakMap,Ia=new WeakMap,La=new WeakMap;var za=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Ba=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Va,Ha,Ua,Wa,Ga=class{constructor(e){Va.add(this),Ha.set(this,void 0),Ua.set(this,void 0),za(this,Ha,e,`f`),this.gl=e.gl,Ba(this,Va,`m`,Wa).call(this),e.addResource(this)}restore(){Ba(this,Va,`m`,Wa).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){Ba(this,Ha,`f`).removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(Ba(this,Ua,`f`))}};Ha=new WeakMap,Ua=new WeakMap,Va=new WeakSet,Wa=function(){let e=this.gl,t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw Error(`[VFX-JS] Failed to create quad VAO`);this.vao=t,za(this,Ua,n,`f`);let r=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)};function Ka(e){return{phase:`hidden`,direction:1,enterProgress:0,leaveProgress:0,isIn:!1,wasAbove:!1,wasBelow:!1,lastTime:e}}function qa(e,t,n,r,i){let a=r===0?n:t>=r,o=i===0?!n:t<i,s=a&&!e.wasAbove,c=o&&!e.wasBelow;if(e.wasAbove=a,e.wasBelow=o,a&&!o)return!0;if(o&&!a)return!1;if(a&&o){if(s)return!0;if(c)return!1}return e.isIn}function Ja(e,t){e.lastTime=t}function Ya(e,t,n,r){let i=n-e.lastTime;if(e.lastTime=n,e.isIn=t,Xa(e,t))return e;let a=(i<0?i:e.direction*i)/r;if(e.phase===`entering`){let t=e.enterProgress+a;a>0&&t>=1?Za(e,`shown`):a<0&&t<=0?Za(e,`hidden`):e.enterProgress=Qa(t)}else if(e.phase===`leaving`){let t=e.leaveProgress+a;a>0&&t>=1?Za(e,`hidden`):a<0&&t<=0?Za(e,`shown`):e.leaveProgress=Qa(t)}return e}function Xa(e,t){switch(e.phase){case`hidden`:return t?(e.phase=`entering`,e.direction=1,!0):!1;case`shown`:return!t&&(e.phase=`leaving`,e.direction=1,!0);case`entering`:return e.direction=t?1:-1,!1;case`leaving`:return e.direction=t?-1:1,!1}}function Za(e,t){e.phase=t,e.direction=1,e.enterProgress=+(t===`shown`),e.leaveProgress=0}function Qa(e){return Math.min(Math.max(e,0),1)}function $a(e,t,n,r={}){return new Rn(e,t,n,{float:r.float??!1})}function eo(e,t){let n=t.renderingToBuffer??!1,r;r=n?`none`:t.premultipliedAlpha?`premultiplied`:`normal`;let i=t.glslVersion??ar(t.fragmentShader);return new fr(e,t.vertexShader??(i===`100`?`
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
`),t.fragmentShader,t.uniforms,r,i)}var to=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},V=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},H,no,ro,io,ao,oo,so=class{constructor(e,t,n,r,i,a,o,s){if(H.set(this,void 0),no.set(this,void 0),ro.set(this,void 0),io.set(this,void 0),ao.set(this,void 0),oo.set(this,void 0),to(this,io,r??!1,`f`),to(this,ao,i??!1,`f`),to(this,oo,a,`f`),to(this,no,{},`f`),to(this,H,{src:{value:null},offset:{value:new Jn},resolution:{value:new Jn},viewport:{value:new Yn},time:{value:0},mouse:{value:new Jn},passIndex:{value:0}},`f`),n)for(let[e,t]of Object.entries(n))typeof t==`function`?(V(this,no,`f`)[e]=t,V(this,H,`f`)[e]={value:t()}):V(this,H,`f`)[e]={value:t};this.pass=eo(e,{fragmentShader:t,uniforms:V(this,H,`f`),renderingToBuffer:o??!1,premultipliedAlpha:!0,glslVersion:s})}get uniforms(){return V(this,H,`f`)}setUniforms(e,t,n,r,i,a){V(this,H,`f`).src.value=e,V(this,H,`f`).resolution.value.set(n.w*t,n.h*t),V(this,H,`f`).offset.value.set(n.x*t,n.y*t),V(this,H,`f`).time.value=r,V(this,H,`f`).mouse.value.set(i*t,a*t)}updateCustomUniforms(e){for(let[e,t]of Object.entries(V(this,no,`f`)))V(this,H,`f`)[e]&&(V(this,H,`f`)[e].value=t());if(e)for(let[t,n]of Object.entries(e))V(this,H,`f`)[t]&&(V(this,H,`f`)[t].value=n())}initializeBackbuffer(e,t,n,r){V(this,io,`f`)&&!V(this,ro,`f`)&&(V(this,oo,`f`)?to(this,ro,new qn(e,V(this,oo,`f`)[0],V(this,oo,`f`)[1],1,V(this,ao,`f`)),`f`):to(this,ro,new qn(e,t,n,r,V(this,ao,`f`)),`f`))}resizeBackbuffer(e,t){V(this,ro,`f`)&&!V(this,oo,`f`)&&V(this,ro,`f`).resize(e,t)}registerBufferUniform(e){V(this,H,`f`)[e]||(V(this,H,`f`)[e]={value:null})}get backbuffer(){return V(this,ro,`f`)}get persistent(){return V(this,io,`f`)}get float(){return V(this,ao,`f`)}get size(){return V(this,oo,`f`)}dispose(){this.pass.dispose(),V(this,ro,`f`)?.dispose()}};H=new WeakMap,no=new WeakMap,ro=new WeakMap,io=new WeakMap,ao=new WeakMap,oo=new WeakMap;var co=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},lo=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},uo,fo,po=class{constructor(e){uo.set(this,void 0),fo.set(this,new Map),co(this,uo,e,`f`)}get(e,t,n){let r=`${t}\0${e}\0${n??``}`,i=lo(this,fo,`f`).get(r);return i||(i=new or(lo(this,uo,`f`),e,t,n),lo(this,fo,`f`).set(r,i)),i}get size(){return lo(this,fo,`f`).size}dispose(){for(let e of lo(this,fo,`f`).values())e.dispose();lo(this,fo,`f`).clear()}};uo=new WeakMap,fo=new WeakMap;var U=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},W=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},G,mo,ho,K,go,_o,vo,yo,bo,q,xo,J,So,Co,wo,To,Eo,Do,Y,X,Oo,ko,Ao,jo,Mo,Z,No,Po,Fo,Io,Lo,Ro,zo,Bo,Vo,Ho,Uo,Wo,Go,Ko,qo,Jo,Yo,Xo,Zo,Qo,$o,es,ts,ns,rs,is,as,os,ss,cs=new Map,ls=!1;function us(e,t){return e===`hic`||t===!0?null:typeof t==`number`?t.toString():e===`video`?`0.0001`:`0`}function ds(e,t){let n=e.getContext(`2d`);n&&(n.clearRect(0,0,e.width,e.height),n.drawImage(t,0,0,e.width,e.height))}var fs=class{constructor(e,t){G.add(this),mo.set(this,void 0),ho.set(this,void 0),K.set(this,void 0),go.set(this,void 0),_o.set(this,void 0),vo.set(this,void 0),yo.set(this,void 0),bo.set(this,[]),q.set(this,void 0),xo.set(this,new Map),J.set(this,null),So.set(this,!1),Co.set(this,new WeakSet),wo.set(this,{}),To.set(this,{}),Eo.set(this,0),Do.set(this,void 0),Y.set(this,2),X.set(this,[]),Oo.set(this,new va({showPlain:e=>{if(e.type===`hic`){let t=e.srcTexture.source;t instanceof OffscreenCanvas&&ds(e.element,t)}else e.element.style.setProperty(`opacity`,e.originalOpacity.toString())},hidePlain:(e,t)=>{if(e.type===`hic`){let t=e.element;t.getContext(`2d`)?.clearRect(0,0,t.width,t.height)}else e.element.style.opacity=t},isRegistered:e=>W(this,X,`f`).includes(e)})),ko.set(this,0),Ao.set(this,1),jo.set(this,Date.now()/1e3),Mo.set(this,!1),Z.set(this,Ni(0)),No.set(this,Ni(0)),Po.set(this,[0,0]),Fo.set(this,0),Io.set(this,0),Lo.set(this,0),Ro.set(this,0),zo.set(this,new WeakMap),Vo.set(this,async()=>{if(typeof window<`u`){for(let e of W(this,X,`f`))if(e.type===`text`&&e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await W(this,G,`m`,Uo).call(this,e),e.width=n,e.height=r)}for(let e of W(this,X,`f`))if(e.type===`text`&&!e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await W(this,G,`m`,Uo).call(this,e),e.width=n,e.height=r)}}}),Ho.set(this,e=>{typeof window<`u`&&(U(this,Lo,e.clientX,`f`),U(this,Ro,window.innerHeight-e.clientY,`f`))}),qo.set(this,()=>{this.isPlaying()&&(this.render(),U(this,Do,requestAnimationFrame(W(this,qo,`f`)),`f`))}),U(this,mo,e,`f`),U(this,ho,t,`f`),U(this,K,new Ra(t,e.preserveDrawingBuffer),`f`),U(this,go,W(this,K,`f`).gl,`f`),W(this,go,`f`).clearColor(0,0,0,0),U(this,Y,e.pixelRatio,`f`),U(this,Ao,e.timeScale,`f`),U(this,jo,Date.now()/1e3,`f`),U(this,_o,new Ga(W(this,K,`f`)),`f`),U(this,vo,new po(W(this,K,`f`)),`f`),typeof window<`u`&&(window.addEventListener(`resize`,W(this,Vo,`f`)),window.addEventListener(`pointermove`,W(this,Ho,`f`))),W(this,Vo,`f`).call(this),U(this,yo,new hr(W(this,K,`f`)),`f`),W(this,G,`m`,rs).call(this,e.postEffects),W(this,K,`f`).onContextRestored(()=>{W(this,go,`f`).clearColor(0,0,0,0)})}destroy(){this.stop(),typeof window<`u`&&(window.removeEventListener(`resize`,W(this,Vo,`f`)),window.removeEventListener(`pointermove`,W(this,Ho,`f`))),W(this,q,`f`)?.dispose();for(let e of W(this,xo,`f`).values())e?.dispose();for(let e of W(this,bo,`f`))e.pass.dispose();W(this,J,`f`)&&(W(this,J,`f`).dispose(),U(this,J,null,`f`),U(this,So,!1,`f`)),W(this,yo,`f`).dispose(),W(this,vo,`f`).dispose(),W(this,_o,`f`).dispose()}async addElement(e,t={},n){if(t.effect!==void 0)return W(this,G,`m`,Go).call(this,e,t,t.effect,n);let r=W(this,G,`m`,Ko).call(this,t),i=e.getBoundingClientRect(),o=Ts(e)?Fi(i):Pi(i),[s,c]=ms(t.overflow),l=Ii(o,c),u=vs(t.intersection),f=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),p,m,h=!1;if(e instanceof HTMLImageElement){m=`img`;let t=d(e);if(h=!!t.match(/\.gif/i),h){let n=await ja.create(t,W(this,Y,`f`));cs.set(e,n),p=new D(W(this,K,`f`),n.getCanvas())}else{let e=await Mn(t);p=new D(W(this,K,`f`),e)}}else if(e instanceof HTMLVideoElement)p=new D(W(this,K,`f`),e),m=`video`;else if(e instanceof HTMLCanvasElement)a(e)&&n?(p=new D(W(this,K,`f`),n),m=`hic`):(p=new D(W(this,K,`f`),e),m=`canvas`);else{let t=await _r(e,f,void 0,this.maxTextureSize);p=new D(W(this,K,`f`),t),m=`text`}let[ee,te]=xs(t.wrap);p.wrapS=ee,p.wrapT=te,p.needsUpdate=!0;let g=t.autoCrop??!0,_=us(m,t.overlay),v={src:{value:p},resolution:{value:new Jn},offset:{value:new Jn},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},enterProgress:{value:0},leaveProgress:{value:0},mouse:{value:new Jn},intersection:{value:0},viewport:{value:new Yn},autoCrop:{value:g}},y={};if(t.uniforms!==void 0)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(v[e]={value:n()},y[e]=n):v[e]={value:n};let ne;t.backbuffer&&(ne=(()=>{let e=(l.right-l.left)*W(this,Y,`f`),t=(l.bottom-l.top)*W(this,Y,`f`);return new qn(W(this,K,`f`),e,t,W(this,Y,`f`),!1)})(),v.backbuffer={value:ne.texture});let re=new Map,b=new Map;for(let e=0;e<r.length-1;e++){let t=r[e].target??`pass${e}`;r[e]={...r[e],target:t};let n=r[e].size,i=n?n[0]:(l.right-l.left)*W(this,Y,`f`),a=n?n[1]:(l.bottom-l.top)*W(this,Y,`f`);if(r[e].persistent){let i=n?1:W(this,Y,`f`),a=n?n[0]:l.right-l.left,o=n?n[1]:l.bottom-l.top;b.set(t,new qn(W(this,K,`f`),a,o,i,r[e].float))}else re.set(t,$a(W(this,K,`f`),i,a,{float:r[e].float}))}let ie=[];for(let e=0;e<r.length;e++){let t=r[e],n=t.frag,i={...v},a={};for(let[e,r]of re)e!==t.target&&n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:r.texture});for(let[e,t]of b)n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:t.texture});if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(i[e]={value:n()},a[e]=n):i[e]={value:n};let o=eo(W(this,K,`f`),{vertexShader:t.vert,fragmentShader:n,uniforms:i,renderingToBuffer:t.target!==void 0,glslVersion:t.glslVersion});ie.push({pass:o,uniforms:i,uniformGenerators:{...y,...a},target:t.target,persistent:t.persistent,float:t.float,size:t.size,backbuffer:t.target?b.get(t.target):void 0})}let ae=W(this,ko,`f`),oe={type:m,element:e,isInViewport:!1,intersectionState:Ka(ae),width:o.right-o.left,height:o.bottom-o.top,passes:ie,bufferTargets:re,startTime:ae,enterTime:ae,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:s,overflow:c,intersection:u,originalOpacity:f,srcTexture:p,zIndex:t.zIndex??0,backbuffer:ne,autoCrop:g};W(this,G,`m`,$o).call(this,oe,o,ae),W(this,G,`m`,Wo).call(this,oe,_)}async updateElementEffects(e,t){let n=W(this,X,`f`).find(t=>t.element===e);if(!n)throw Error(`[VFX-JS] updateElementEffects: element not registered`);if(!n.chain)throw Error(`[VFX-JS] updateElementEffects: element is on the shader path; effect-only updates are not supported`);let r=Array.isArray(t)?[...t]:[t],i=n.chain.effects,a=new Set(i),o=[];for(let e of r)if(!a.has(e)){if(W(this,Co,`f`).has(e))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");o.push(e)}await n.chain.replaceEffects(r);let s=new Set(r);for(let e of i)s.has(e)||W(this,Co,`f`).delete(e);for(let e of o)W(this,Co,`f`).add(e)}removeElement(e){let t=W(this,X,`f`).findIndex(t=>t.element===e);if(t!==-1){let n=W(this,X,`f`).splice(t,1)[0];if(n.chain)W(this,G,`m`,Zo).call(this,n.chain.effects),n.chain.dispose();else{for(let e of n.bufferTargets.values())e.dispose();for(let e of n.passes)e.pass.dispose(),e.backbuffer?.dispose();n.backbuffer?.dispose()}n.srcTexture.dispose(),e.style.setProperty(`opacity`,n.originalOpacity.toString())}}updateTextElement(e){let t=W(this,X,`f`).findIndex(t=>t.element===e);return t===-1?Promise.resolve():W(this,G,`m`,Uo).call(this,W(this,X,`f`)[t])}async updateImageElement(e){let t=W(this,X,`f`).find(t=>t.element===e);if(t?.type!==`img`||t.isGif)return;let n=await Mn(d(e)),r=t.srcTexture,i=new D(W(this,K,`f`),n);i.wrapS=r.wrapS,i.wrapT=r.wrapT,i.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=i),t.srcTexture=i,r.dispose()}updateCanvasElement(e){let t=W(this,X,`f`).find(t=>t.element===e);if(t){let n=t.srcTexture,r=new D(W(this,K,`f`),e);r.wrapS=n.wrapS,r.wrapT=n.wrapT,r.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=r),t.srcTexture=r,n.dispose()}}updateHICTexture(e,t){let n=W(this,X,`f`).find(t=>t.element===e);if(n?.type!==`hic`)return;n.frozen&&ds(e,t);let r=n.srcTexture;if(r.source===t)r.needsUpdate=!0;else{let e=new D(W(this,K,`f`),t);e.wrapS=r.wrapS,e.wrapT=r.wrapT,e.needsUpdate=!0,!n.chain&&n.passes.length>0&&(n.passes[0].uniforms.src.value=e),n.srcTexture=e,r.dispose()}}freezeInside(e){return W(this,Oo,`f`).freezeInside(e,W(this,X,`f`))}isFrozen(e){return W(this,X,`f`).some(t=>t.element===e&&t.frozen)}forceRender(e){let t=W(this,X,`f`).find(t=>t.element===e);return!t||t.forceRender?()=>{}:(t.forceRender=!0,()=>{t.forceRender=!1})}get maxTextureSize(){return W(this,K,`f`).maxTextureSize}isPlaying(){return W(this,Do,`f`)!==void 0}play(){this.isPlaying()||(U(this,jo,Date.now()/1e3,`f`),U(this,Do,requestAnimationFrame(W(this,qo,`f`)),`f`))}get time(){return W(this,ko,`f`)}setTime(e){U(this,ko,e,`f`),U(this,Mo,!0,`f`)}get timeScale(){return W(this,Ao,`f`)}set timeScale(e){U(this,Ao,e,`f`)}stop(){W(this,Do,`f`)!==void 0&&(cancelAnimationFrame(W(this,Do,`f`)),U(this,Do,void 0,`f`))}render(){let e=Date.now()/1e3;W(this,Mo,`f`)?U(this,Mo,!1,`f`):U(this,ko,W(this,ko,`f`)+(e-W(this,jo,`f`))*W(this,Ao,`f`),`f`),U(this,jo,e,`f`);let t=W(this,ko,`f`),n=W(this,go,`f`);W(this,G,`m`,Bo).call(this),n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,W(this,ho,`f`).width,W(this,ho,`f`).height),n.clear(n.COLOR_BUFFER_BIT);let r=W(this,Z,`f`).right-W(this,Z,`f`).left,i=W(this,Z,`f`).bottom-W(this,Z,`f`).top,a=Vn(0,0,r,i),o=W(this,G,`m`,Yo).call(this);o&&(W(this,G,`m`,ss).call(this,r,i),W(this,q,`f`)&&(n.bindFramebuffer(n.FRAMEBUFFER,W(this,q,`f`).fbo),n.clear(n.COLOR_BUFFER_BIT),n.bindFramebuffer(n.FRAMEBUFFER,null)));for(let e of W(this,X,`f`)){if(e.frozen){Ja(e.intersectionState,t);continue}let n=e.element.getBoundingClientRect(),s=e.type===`text`?Fi(n):Pi(n),c=W(this,G,`m`,$o).call(this,e,s,t);if(!c.isVisible)continue;if(e.chain){W(this,G,`m`,Jo).call(this,e,s,c,t);continue}let l=e.passes[0].uniforms;l.time.value=t-e.startTime,l.resolution.value.set((s.right-s.left)*W(this,Y,`f`),(s.bottom-s.top)*W(this,Y,`f`)),l.mouse.value.set((W(this,Lo,`f`)+W(this,Fo,`f`))*W(this,Y,`f`),(W(this,Ro,`f`)+W(this,Io,`f`))*W(this,Y,`f`));for(let t of e.passes)for(let[e,n]of Object.entries(t.uniformGenerators))t.uniforms[e].value=n();cs.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(l.src.value.needsUpdate=!0);let u=Bn(s,i,W(this,Fo,`f`),W(this,Io,`f`)),d=Bn(c.rectWithOverflow,i,W(this,Fo,`f`),W(this,Io,`f`));e.backbuffer&&(e.passes[0].uniforms.backbuffer.value=e.backbuffer.texture);{let t=e.isFullScreen?a:d,n=Math.max(1,t.w*W(this,Y,`f`)),r=Math.max(1,t.h*W(this,Y,`f`)),i=Math.max(1,t.w),o=Math.max(1,t.h);for(let t=0;t<e.passes.length-1;t++){let a=e.passes[t];if(!a.size){if(a.backbuffer)a.backbuffer.resize(i,o);else{let t=e.bufferTargets.get(a.target);t&&(t.width!==n||t.height!==r)&&t.setSize(n,r)}}}}let f=new Map;for(let t of e.passes)t.backbuffer&&t.target&&f.set(t.target,t.backbuffer.texture);let p=e.srcTexture;for(let t=0;t<e.passes.length-1;t++){let r=e.passes[t],i=e.isFullScreen?a:d;r.uniforms.src.value=p;for(let[e,t]of f)r.uniforms[e]&&(r.uniforms[e].value=t);for(let[e,t]of Object.entries(r.uniformGenerators))r.uniforms[e]&&(r.uniforms[e].value=t());let o=r.size?Vn(0,0,r.size[0],r.size[1]):Vn(0,0,i.w,i.h),s=hs(n,u,i,r.size,[W(this,Lo,`f`),W(this,Ro,`f`)],[W(this,Fo,`f`),W(this,Io,`f`)],W(this,Y,`f`));if(r.uniforms.resolution.value.set(...s.resolution),r.uniforms.offset.value.set(...s.offset),r.uniforms.mouse.value.set(...s.mouse),r.backbuffer)W(this,G,`m`,ts).call(this,r.pass,r.backbuffer.target,o,r.uniforms,!0),r.backbuffer.swap(),p=r.backbuffer.texture;else{let t=e.bufferTargets.get(r.target);if(!t)continue;W(this,G,`m`,ts).call(this,r.pass,t,o,r.uniforms,!0),p=t.texture}r.target&&f.set(r.target,p)}let m=e.passes[e.passes.length-1];m.uniforms.src.value=p,m.uniforms.resolution.value.set(n.width*W(this,Y,`f`),n.height*W(this,Y,`f`)),m.uniforms.offset.value.set(u.x*W(this,Y,`f`),u.y*W(this,Y,`f`)),m.uniforms.mouse.value.set((W(this,Lo,`f`)+W(this,Fo,`f`))*W(this,Y,`f`),(W(this,Ro,`f`)+W(this,Io,`f`))*W(this,Y,`f`));for(let[e,t]of f)m.uniforms[e]&&(m.uniforms[e].value=t);for(let[e,t]of Object.entries(m.uniformGenerators))m.uniforms[e]&&(m.uniforms[e].value=t());e.backbuffer?(m.uniforms.backbuffer.value=e.backbuffer.texture,e.isFullScreen?(e.backbuffer.resize(r,i),W(this,G,`m`,ns).call(this,e,u.x,u.y),W(this,G,`m`,ts).call(this,m.pass,e.backbuffer.target,a,m.uniforms,!0),e.backbuffer.swap(),W(this,yo,`f`).setUniforms(e.backbuffer.texture,W(this,Y,`f`),a),W(this,G,`m`,ts).call(this,W(this,yo,`f`).pass,o&&W(this,q,`f`)||null,a,W(this,yo,`f`).uniforms,!1)):(e.backbuffer.resize(d.w,d.h),W(this,G,`m`,ns).call(this,e,e.overflow.left,e.overflow.bottom),W(this,G,`m`,ts).call(this,m.pass,e.backbuffer.target,e.backbuffer.getViewport(),m.uniforms,!0),e.backbuffer.swap(),W(this,yo,`f`).setUniforms(e.backbuffer.texture,W(this,Y,`f`),d),W(this,G,`m`,ts).call(this,W(this,yo,`f`).pass,o&&W(this,q,`f`)||null,d,W(this,yo,`f`).uniforms,!1))):(W(this,G,`m`,ns).call(this,e,u.x,u.y),W(this,G,`m`,ts).call(this,m.pass,o&&W(this,q,`f`)||null,e.isFullScreen?a:d,m.uniforms,!1))}o&&W(this,q,`f`)&&(W(this,J,`f`)&&W(this,So,`f`)?W(this,G,`m`,as).call(this,a,t):W(this,G,`m`,os).call(this,a,t))}};mo=new WeakMap,ho=new WeakMap,K=new WeakMap,go=new WeakMap,_o=new WeakMap,vo=new WeakMap,yo=new WeakMap,bo=new WeakMap,q=new WeakMap,xo=new WeakMap,J=new WeakMap,So=new WeakMap,Co=new WeakMap,wo=new WeakMap,To=new WeakMap,Eo=new WeakMap,Do=new WeakMap,Y=new WeakMap,X=new WeakMap,Oo=new WeakMap,ko=new WeakMap,Ao=new WeakMap,jo=new WeakMap,Mo=new WeakMap,Z=new WeakMap,No=new WeakMap,Po=new WeakMap,Fo=new WeakMap,Io=new WeakMap,Lo=new WeakMap,Ro=new WeakMap,zo=new WeakMap,Vo=new WeakMap,Ho=new WeakMap,qo=new WeakMap,G=new WeakSet,Bo=function(){if(typeof window>`u`)return;let e=W(this,ho,`f`).ownerDocument,t=e.compatMode===`BackCompat`?e.body:e.documentElement,n=t.clientWidth,r=t.clientHeight,i=window.scrollX,a=window.scrollY,o,s;if(W(this,mo,`f`).fixedCanvas)o=0,s=0;else if(W(this,mo,`f`).wrapper)o=n*W(this,mo,`f`).scrollPadding[0],s=r*W(this,mo,`f`).scrollPadding[1];else{let t=e.body.scrollWidth-(i+n),c=e.body.scrollHeight-(a+r);o=Ss(n*W(this,mo,`f`).scrollPadding[0],0,t),s=Ss(r*W(this,mo,`f`).scrollPadding[1],0,c)}let c=n+o*2,l=r+s*2;(c!==W(this,Po,`f`)[0]||l!==W(this,Po,`f`)[1])&&(W(this,ho,`f`).style.width=`${c}px`,W(this,ho,`f`).style.height=`${l}px`,W(this,K,`f`).setSize(c,l,W(this,Y,`f`)),U(this,Z,Ni({top:-s,left:-o,right:n+o,bottom:r+s}),`f`),U(this,No,Ni({top:0,left:0,right:n,bottom:r}),`f`),U(this,Po,[c,l],`f`),U(this,Fo,o,`f`),U(this,Io,s,`f`)),W(this,mo,`f`).fixedCanvas||W(this,ho,`f`).style.setProperty(`transform`,`translate(${i-o}px, ${a-s}px)`)},Uo=async function(e){if(!W(this,zo,`f`).get(e.element)){W(this,zo,`f`).set(e.element,!0);try{let t=e.srcTexture,n=t.source instanceof OffscreenCanvas?t.source:void 0,r=await _r(e.element,e.originalOpacity,n,this.maxTextureSize);if(r.width===0||r.height===0)return;let i=new D(W(this,K,`f`),r);i.wrapS=t.wrapS,i.wrapT=t.wrapT,i.needsUpdate=!0,!e.chain&&e.passes.length>0&&(e.passes[0].uniforms.src.value=i),e.srcTexture=i,t.dispose()}catch(e){console.error(e)}finally{W(this,zo,`f`).set(e.element,!1)}}},Wo=function(e,t){!W(this,Oo,`f`).adopt(e,t)&&t!==null&&e.element.style.setProperty(`opacity`,t),W(this,X,`f`).push(e),W(this,X,`f`).sort((e,t)=>e.zIndex-t.zIndex)},Go=async function(e,t,n,r){t.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified; `effect` takes precedence."),t.overflow!==void 0&&console.warn("[VFX-JS] `overflow` is shader-path only and is ignored by the effect path. Use each effect's own `outputRect` (with `dims.canvasRect` for fullscreen) to control its dst rect.");let i=Array.isArray(n)?[...n]:[n];W(this,G,`m`,Xo).call(this,i);let o=e.getBoundingClientRect(),s=Ts(e)?Fi(o):Pi(o),[c,l]=ms(t.overflow),u=vs(t.intersection),f=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),p,m,h=!1;if(e instanceof HTMLImageElement){m=`img`;let t=d(e);if(h=!!t.match(/\.gif/i),h){let n=await ja.create(t,W(this,Y,`f`));cs.set(e,n),p=new D(W(this,K,`f`),n.getCanvas())}else{let e=await Mn(t);p=new D(W(this,K,`f`),e)}}else if(e instanceof HTMLVideoElement)p=new D(W(this,K,`f`),e),m=`video`;else if(e instanceof HTMLCanvasElement)a(e)&&r?(p=new D(W(this,K,`f`),r),m=`hic`):(p=new D(W(this,K,`f`),e),m=`canvas`);else{let t=await _r(e,f,void 0,this.maxTextureSize);p=new D(W(this,K,`f`),t),m=`text`}let[ee,te]=xs(t.wrap);p.wrapS=ee,p.wrapT=te,p.needsUpdate=!0;let g=t.autoCrop??!0,_=us(m,t.overlay),v=W(this,ko,`f`),y={type:m,element:e,isInViewport:!1,intersectionState:Ka(v),width:s.right-s.left,height:s.bottom-s.top,passes:[],bufferTargets:new Map,startTime:v,enterTime:v,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:c,overflow:l,intersection:u,originalOpacity:f,srcTexture:p,zIndex:t.zIndex??0,backbuffer:void 0,autoCrop:g,effectLastRenderTime:v},ne=Di(()=>y.srcTexture,()=>ys(y.srcTexture,`w`),()=>ys(y.srcTexture,`h`)),re={},b={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(b[e]=n,re[e]=n()):re[e]=n;y.effectUniformGenerators=b,y.effectStaticUniforms=re;let ie={autoCrop:g,glslVersion:t.glslVersion??`300 es`},ae=new da(W(this,K,`f`),W(this,_o,`f`),W(this,Y,`f`),i,ie,ne,!1,W(this,vo,`f`));try{await ae.initAll()}catch(t){throw W(this,G,`m`,Zo).call(this,i),p.dispose(),e.style.setProperty(`opacity`,f.toString()),t}y.chain=ae,W(this,G,`m`,$o).call(this,y,s,v),W(this,G,`m`,Wo).call(this,y,_)},Ko=function(e){let t=t=>t.glslVersion===void 0&&e.glslVersion!==void 0?{...t,glslVersion:e.glslVersion}:t;return Array.isArray(e.shader)?e.shader.map(t):[t({frag:W(this,G,`m`,es).call(this,e.shader||`uvGradient`)})]},Jo=function(e,t,n,r){let i=e.chain;if(!i)return;let a=W(this,Y,`f`);cs.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(e.srcTexture.needsUpdate=!0);let o={...e.effectStaticUniforms??{}};if(e.effectUniformGenerators)for(let[t,n]of Object.entries(e.effectUniformGenerators))o[t]=n();let s=W(this,Z,`f`).right-W(this,Z,`f`).left,c=W(this,Z,`f`).bottom-W(this,Z,`f`).top,l=Bn(t,c,W(this,Fo,`f`),W(this,Io,`f`)),u=W(this,Lo,`f`)+W(this,Fo,`f`)-l.x,d=W(this,Ro,`f`)+W(this,Io,`f`)-l.y,f=t.right-t.left,p=t.bottom-t.top,m=r-(e.effectLastRenderTime??r);e.effectLastRenderTime=r;let h=W(this,G,`m`,Yo).call(this)&&W(this,q,`f`)?ki(W(this,q,`f`)):null;i.run({time:r-e.startTime,deltaTime:m,mouse:[u*a,d*a],mouseViewport:[W(this,Lo,`f`)*a,W(this,Ro,`f`)*a],intersection:n.intersection,enterTime:ws(r-e.enterTime),leaveTime:ws(r-e.leaveTime),enterProgress:n.enterProgress,leaveProgress:n.leaveProgress,resolvedUniforms:o,canvasSize:[s,c],canvasBufferSize:[s*a,c*a],elementSize:[f,p],elementBufferSize:[f*a,p*a],elementRectOnCanvasPx:{x:l.x*a,y:l.y*a,w:l.w*a,h:l.h*a},finalTarget:h,isVisible:n.isVisible})},Yo=function(){return W(this,bo,`f`).length>0||W(this,J,`f`)!==null&&W(this,So,`f`)},Xo=function(e){for(let t of e)if(W(this,Co,`f`).has(t))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");for(let t of e)W(this,Co,`f`).add(t)},Zo=function(e){for(let t of e)W(this,Co,`f`).delete(t)},Qo=function(e){let t=e.hitTestPadBuffer,n=W(this,Y,`f`);return ji({top:t.top/n,right:t.right/n,bottom:t.bottom/n,left:t.left/n})},$o=function(e,t,n){let r=Ii(t,e.chain?W(this,G,`m`,Qo).call(this,e.chain):e.overflow),i=e.isFullScreen||ps(W(this,No,`f`),r),a=Ii(W(this,No,`f`),e.intersection.rootMargin),o=zi(a,t);gs(e,o,ps(a,t),n);let{enterProgress:s,leaveProgress:c}=e.intersectionState;e.isInViewport=i;let l=i&&n-e.leaveTime<=e.release||e.forceRender===!0&&t.right>t.left&&t.bottom>t.top;return l&&!e.chain&&e.passes.length>0&&_s(e.passes[0].uniforms,e,o,n),{isVisible:l,intersection:o,rectWithOverflow:r,enterProgress:s,leaveProgress:c}},es=function(e){return e in i?i[e]:e},ts=function(e,t,n,r,i){let a=W(this,go,`f`);i&&t!==null&&t!==W(this,q,`f`)&&(a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.viewport(0,0,t.width,t.height),a.clear(a.COLOR_BUFFER_BIT));let o=r.viewport;o&&o.value instanceof Yn&&o.value.set(n.x*W(this,Y,`f`),n.y*W(this,Y,`f`),n.w*W(this,Y,`f`),n.h*W(this,Y,`f`));try{pr(a,W(this,_o,`f`),e,t,n,W(this,Po,`f`)[0],W(this,Po,`f`)[1],W(this,Y,`f`))}catch(e){console.error(e)}},ns=function(e,t,n){let r=e.passes[0].uniforms.offset.value;r.x=t*W(this,Y,`f`),r.y=n*W(this,Y,`f`)},rs=function(e){let t=e.length===1&&!(`frag`in e[0])?e[0]:null;if(t&&t.effect!==void 0){W(this,G,`m`,is).call(this,t,t.effect);return}let n=[],r=[];for(let t of e)`frag`in t&&r.push(t);for(let e=0;e<r.length-1;e++)r[e].target||(r[e]={...r[e],target:`pass${e}`});for(let t of e){let e,r,i;if(`frag`in t)e=t.frag,r=new so(W(this,K,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,t.size,t.target!==void 0,t.glslVersion),i=t.target;else{if(t.shader===void 0)throw Error("VFXPostEffect requires `shader` (the `effect` path is not implemented yet).");e=W(this,G,`m`,es).call(this,t.shader),r=new so(W(this,K,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,void 0,!1,t.glslVersion),t.persistent&&r.registerBufferUniform(`backbuffer`),i=void 0}n.push(e);let a={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`&&(a[e]=n);W(this,bo,`f`).push({pass:r,target:i,generators:a})}for(let e of r)e.target&&W(this,xo,`f`).set(e.target,void 0);let i=W(this,bo,`f`).map(e=>e.target).filter(e=>e!==void 0);for(let e=0;e<W(this,bo,`f`).length;e++)for(let t of i)n[e].match(RegExp(`uniform\\s+sampler2D\\s+${t}\\b`))&&W(this,bo,`f`)[e].pass.registerBufferUniform(t)},is=function(e,t){e.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified on post-effect; `effect` takes precedence.");let n=Array.isArray(t)?[...t]:[t];W(this,G,`m`,Xo).call(this,n);let r=Di(()=>{let e=W(this,q,`f`);if(!e)throw Error(`[VFX-JS] post-effect chain active without target`);return e.texture},()=>W(this,q,`f`)?.width??0,()=>W(this,q,`f`)?.height??0),i={autoCrop:!0,glslVersion:e.glslVersion??`300 es`},a=new da(W(this,K,`f`),W(this,_o,`f`),W(this,Y,`f`),n,i,r,!0,W(this,vo,`f`));if(e.uniforms)for(let[t,n]of Object.entries(e.uniforms))typeof n==`function`?(W(this,To,`f`)[t]=n,W(this,wo,`f`)[t]=n()):W(this,wo,`f`)[t]=n;U(this,J,a,`f`),U(this,Eo,W(this,ko,`f`),`f`),a.initAll().then(()=>{W(this,J,`f`)===a&&U(this,So,!0,`f`)}).catch(e=>{console.error(`[VFX-JS] Post-effect init failed; post-effect disabled:`,e),W(this,J,`f`)===a&&(W(this,G,`m`,Zo).call(this,W(this,J,`f`).effects),W(this,J,`f`).dispose(),U(this,J,null,`f`),U(this,So,!1,`f`))})},as=function(e,t){let n=W(this,J,`f`);if(!n)return;let r=W(this,Y,`f`),i={...W(this,wo,`f`)};for(let[e,t]of Object.entries(W(this,To,`f`)))i[e]=t();let a=W(this,Z,`f`).right-W(this,Z,`f`).left,o=W(this,Z,`f`).bottom-W(this,Z,`f`).top,s=t-W(this,Eo,`f`);U(this,Eo,t,`f`);let c=[a,o],l=[a*r,o*r],u={x:e.x*r,y:e.y*r,w:e.w*r,h:e.h*r};n.run({time:t,deltaTime:s,mouse:[W(this,Lo,`f`)*r,W(this,Ro,`f`)*r],mouseViewport:[W(this,Lo,`f`)*r,W(this,Ro,`f`)*r],intersection:1,enterTime:0,leaveTime:0,enterProgress:1,leaveProgress:0,resolvedUniforms:i,canvasSize:c,canvasBufferSize:l,elementSize:c,elementBufferSize:l,elementRectOnCanvasPx:u,finalTarget:null,isVisible:!0})},os=function(e,t){if(!W(this,q,`f`))return;let n=W(this,q,`f`).texture,r=new Map;for(let{pass:e,target:t}of W(this,bo,`f`))t&&e.backbuffer&&r.set(t,e.backbuffer.texture);for(let i=0;i<W(this,bo,`f`).length;i++){let{pass:a,target:o,generators:s}=W(this,bo,`f`)[i],c=i===W(this,bo,`f`).length-1,l=W(this,Lo,`f`)+W(this,Fo,`f`),u=W(this,Ro,`f`)+W(this,Io,`f`),d=a.size;if(d){let[r,i]=d;a.uniforms.src.value=n,a.uniforms.resolution.value.set(r,i),a.uniforms.offset.value.set(0,0),a.uniforms.time.value=t,a.uniforms.mouse.value.set(l/e.w*r,u/e.h*i)}else a.setUniforms(n,W(this,Y,`f`),e,t,l,u);a.uniforms.passIndex.value=i,a.updateCustomUniforms(s);for(let[e,t]of r){let n=a.uniforms[e];n&&(n.value=t)}if(c)a.backbuffer?(a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture),W(this,G,`m`,ts).call(this,a.pass,a.backbuffer.target,e,a.uniforms,!0),a.backbuffer.swap(),W(this,yo,`f`).setUniforms(a.backbuffer.texture,W(this,Y,`f`),e),W(this,G,`m`,ts).call(this,W(this,yo,`f`).pass,null,e,W(this,yo,`f`).uniforms,!1)):W(this,G,`m`,ts).call(this,a.pass,null,e,a.uniforms,!1);else if(a.backbuffer){a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture);let t=d?Vn(0,0,d[0]/W(this,Y,`f`),d[1]/W(this,Y,`f`)):e;W(this,G,`m`,ts).call(this,a.pass,a.backbuffer.target,t,a.uniforms,!0),a.backbuffer.swap(),n=a.backbuffer.texture,o&&r.set(o,a.backbuffer.texture)}else{let t=o??`postEffect${i}`,s=W(this,xo,`f`).get(t),c=d?d[0]:e.w*W(this,Y,`f`),l=d?d[1]:e.h*W(this,Y,`f`);s&&s.width===c&&s.height===l||(s?.dispose(),s=$a(W(this,K,`f`),c,l,{float:a.float}),W(this,xo,`f`).set(t,s));let u=d?Vn(0,0,d[0]/W(this,Y,`f`),d[1]/W(this,Y,`f`)):e;W(this,G,`m`,ts).call(this,a.pass,s,u,a.uniforms,!0),n=s.texture,o&&r.set(o,s.texture)}}},ss=function(e,t){let n=e*W(this,Y,`f`),r=t*W(this,Y,`f`);W(this,q,`f`)&&W(this,q,`f`).width===n&&W(this,q,`f`).height===r||(W(this,q,`f`)?.dispose(),U(this,q,$a(W(this,K,`f`),n,r),`f`));for(let{pass:n}of W(this,bo,`f`))n.persistent&&!n.backbuffer?n.initializeBackbuffer(W(this,K,`f`),e,t,W(this,Y,`f`)):n.backbuffer&&n.resizeBackbuffer(e,t)};function ps(e,t){return t.left<=e.right&&t.right>=e.left&&t.top<=e.bottom&&t.bottom>=e.top}function ms(e){return e===!0?[!0,Mi]:e===void 0?[!1,Mi]:[!1,ji(e)]}function hs(e,t,n,r,i,a,o){let s=i[0]+a[0]-n.x,c=i[1]+a[1]-n.y;return r?{resolution:[r[0],r[1]],offset:[0,0],mouse:[s/n.w*r[0],c/n.h*r[1]]}:{resolution:[e.width*o,e.height*o],offset:[(t.x-n.x)*o,(t.y-n.y)*o],mouse:[s*o,c*o]}}function gs(e,t,n,r){let i=e.intersectionState,a=i.isIn,o=e.isFullScreen||qa(i,t,n,e.intersection.threshold,e.intersection.leaveThreshold);!a&&o&&(e.enterTime=r,e.leaveTime=1/0),a&&!o&&(e.leaveTime=r),Ya(i,o,r,e.intersection.duration)}function _s(e,t,n,r){e.intersection.value=n,e.enterTime.value=ws(r-t.enterTime),e.leaveTime.value=ws(r-t.leaveTime),e.enterProgress.value=t.intersectionState.enterProgress,e.leaveProgress.value=t.intersectionState.leaveProgress}function vs(e){let t=e?.threshold??0,n=ji(e?.rootMargin??0),r=e?.leaveThreshold??t,i=e?.duration??1;return Number.isFinite(i)&&i>0||(ls||(ls=!0,console.warn(`[VFX-JS] \`intersection.duration\` must be a finite number above 0, got ${i}. Using 1 instead.`)),i=1),{threshold:t,leaveThreshold:r,rootMargin:n,duration:i}}function ys(e,t){let n=e.source;if(!n)return 0;if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return t===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return t===`w`?n.videoWidth:n.videoHeight;let r=n;return t===`w`?r.width:r.height}function bs(e){return e===`repeat`?`repeat`:e===`mirror`?`mirror`:`clamp`}function xs(e){if(!e)return[`clamp`,`clamp`];if(Array.isArray(e))return[bs(e[0]),bs(e[1])];let t=bs(e);return[t,t]}function Ss(e,t,n){return Math.max(t,Math.min(n,e))}var Cs=1e6;function ws(e){return Ss(e,-1e6,Cs)}function Ts(e){return!(e instanceof HTMLImageElement||e instanceof HTMLVideoElement||e instanceof HTMLCanvasElement)}function Es(){try{let e=document.createElement(`canvas`);return(e.getContext(`webgl2`)||e.getContext(`webgl`))!==null}catch{return!1}}var Ds=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Q=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Os,$,ks,As,js,Ms,Ns,Ps,Fs,Is,Ls,Rs;function zs(){if(typeof window>`u`)throw`Cannot find 'window'. VFX-JS only runs on the browser.`;if(typeof document>`u`)throw`Cannot find 'document'. VFX-JS only runs on the browser.`}function Bs(e){return{position:e?`fixed`:`absolute`,top:0,left:0,width:`0px`,height:`0px`,"z-index":9999,"pointer-events":`none`}}var Vs=class e{static init(t){try{return new e(t)}catch{return null}}constructor(e={}){if(Os.add(this),$.set(this,void 0),ks.set(this,void 0),As.set(this,new Map),js.set(this,new Set),zs(),!Es())throw Error(`[VFX-JS] WebGL is not available in this environment.`);let t=yn(e),n=document.createElement(`canvas`),r=Bs(t.fixedCanvas);for(let[e,t]of Object.entries(r))n.style.setProperty(e,t.toString());t.zIndex!==void 0&&n.style.setProperty(`z-index`,t.zIndex.toString()),(t.wrapper??document.body).appendChild(n),Ds(this,ks,n,`f`),Ds(this,$,new fs(t,n),`f`),t.autoplay&&Q(this,$,`f`).play()}async add(e,t,n){e instanceof HTMLImageElement?await Q(this,Os,`m`,Fs).call(this,e,t):e instanceof HTMLVideoElement?await Q(this,Os,`m`,Is).call(this,e,t):e instanceof HTMLCanvasElement?a(e)&&n?await Q(this,Os,`m`,Ps).call(this,e,t,n):await Q(this,Os,`m`,Ls).call(this,e,t):await Q(this,Os,`m`,Rs).call(this,e,t)}updateHICTexture(e,t){Q(this,$,`f`).updateHICTexture(e,t)}get maxTextureSize(){return Q(this,$,`f`).maxTextureSize}get canvas(){return Q(this,ks,`f`)}addHTML(e,t){return Q(this,Os,`m`,Ms).call(this,e,t,!1)}addHTMLWithStill(e,t){return Q(this,Os,`m`,Ms).call(this,e,t,!0)}addTransition(e,t={}){let n=new vn(this,e,t,()=>Q(this,js,`f`).delete(n));return Q(this,js,`f`).add(n),n}freezeInside(e){return Q(this,$,`f`).freezeInside(e)}lockSize(e){let t=Q(this,As,`f`).get(e);return t?xe(t):()=>{}}forceRender(e){let t=Q(this,As,`f`).get(e)??e;return Q(this,$,`f`).forceRender(t)}remove(e){let t=Q(this,As,`f`).get(e);t?(ke(t,e),Q(this,As,`f`).delete(e),Q(this,$,`f`).removeElement(t)):Q(this,$,`f`).removeElement(e)}updateEffects(e,t){let n=Q(this,As,`f`).get(e)??e;return Q(this,$,`f`).updateElementEffects(n,t)}async update(e){await this.updateInTime(e)}async updateInTime(e){let t=Q(this,As,`f`).get(e)??(e instanceof HTMLCanvasElement?e:null);return(t?be(t):void 0)||(e instanceof HTMLImageElement?await Q(this,$,`f`).updateImageElement(e):e instanceof HTMLCanvasElement?Q(this,$,`f`).updateCanvasElement(e):await Q(this,$,`f`).updateTextElement(e),!0)}play(){Q(this,$,`f`).play()}stop(){Q(this,$,`f`).stop()}render(){Q(this,$,`f`).render()}get time(){return Q(this,$,`f`).time}setTime(e){Q(this,$,`f`).setTime(e)}get timeScale(){return Q(this,$,`f`).timeScale}set timeScale(e){Q(this,$,`f`).timeScale=e}destroy(){for(let e of Q(this,js,`f`))e.destroy();Q(this,js,`f`).clear();for(let[e,t]of Q(this,As,`f`))ke(t,e);Q(this,As,`f`).clear(),Q(this,$,`f`).destroy(),Q(this,ks,`f`).remove()}};$=new WeakMap,ks=new WeakMap,As=new WeakMap,js=new WeakMap,Os=new WeakSet,Ms=async function(e,t,n){if(!je())return console.warn(`html-in-canvas not supported, falling back to dom-to-canvas`),this.add(e,t);t.overlay!==void 0&&console.warn(`addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.`);let{overlay:r,...i}=t,a=Q(this,As,`f`).get(e);a&&Q(this,$,`f`).removeElement(a);let{canvas:o,initialCapture:s}=await Oe(e,{onCapture:e=>{Q(this,$,`f`).updateHICTexture(o,e)},maxSize:Q(this,$,`f`).maxTextureSize,stillCover:n?{zIndex:Q(this,Os,`m`,Ns).call(this)}:void 0});a=o,Q(this,As,`f`).set(e,a),await Q(this,Os,`m`,Ps).call(this,a,i,s)},Ns=function(){let e=Number.parseInt(Q(this,ks,`f`).style.zIndex,10);return Number.isNaN(e)?9998:e-1},Ps=async function(e,t,n){try{await Q(this,$,`f`).addElement(e,t,n)}finally{Ce(e,Q(this,$,`f`).isFrozen(e))}},Fs=function(e,t){return e.complete?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`load`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},Is=function(e,t){return e.readyState>=3?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`canplay`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},Ls=function(e,t){return Q(this,$,`f`).addElement(e,t)},Rs=function(e,t){return Q(this,$,`f`).addElement(e,t)};export{Vs as t};
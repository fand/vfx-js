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
    `},i={...r,slitScanTransition:r.slitScanReveal,warpTransition:r.warpReveal,pixelateTransition:r.pixelateReveal,focusTransition:r.focusReveal};function a(e){return e.tagName===`CANVAS`&&(e.hasAttribute(`layoutsubtree`)||e.getAttribute(`content`)===`drawable`)}function o(e,t){e.setAttribute(`layoutsubtree`,``),e.setAttribute(`content`,`drawable`),t?.setAttribute(`drawable`,``)}function s(e,t,n,r){if(t.width<=0||t.height<=0)return null;let i=t.left-e.left,a=t.top-e.top;return i+t.width<=0||a+t.height<=0||i>=e.width||a>=e.height?null:[i*n,a*r,t.width*n,t.height*r]}function c(e){let t=e.getBoundingClientRect(),n=getComputedStyle(e),r=Number.parseFloat(n.paddingLeft)||0,i=Number.parseFloat(n.paddingRight)||0,a=Number.parseFloat(n.paddingTop)||0,o=Number.parseFloat(n.paddingBottom)||0,s=e.clientWidth>0?t.width/e.offsetWidth:1,c=e.clientHeight>0?t.height/e.offsetHeight:1;return{left:t.left+(e.clientLeft+r)*s,top:t.top+(e.clientTop+a)*c,width:Math.max(0,e.clientWidth-r-i)*s,height:Math.max(0,e.clientHeight-a-o)*c}}function l(e){return typeof e.checkVisibility==`function`?e.checkVisibility({visibilityProperty:!0,opacityProperty:!0}):getComputedStyle(e).visibility!==`hidden`}function u(e,t){let n=t.querySelectorAll(`canvas`);if(n.length===0)return;let r=t.getBoundingClientRect();if(r.width<=0||r.height<=0)return;let i=e.canvas.width/r.width,a=e.canvas.height/r.height;for(let t of n){if(t.width===0||t.height===0||!l(t))continue;let n=s(r,c(t),i,a);if(n)try{e.drawImage(t,...n)}catch{}}}function d(e){return e.currentSrc||e.src}function f(e,t){let n=e.getBoundingClientRect(),r=e.cloneNode(!0),i=[e,...e.querySelectorAll(`*`)],a=[r,...r.querySelectorAll(`*`)],o=[],s=[];for(let e=0;e<i.length&&e<a.length;e++){let t=i[e],n=a[e];(t.scrollTop||t.scrollLeft)&&o.push([n,t.scrollTop,t.scrollLeft]),t instanceof HTMLScriptElement?s.push([n,document.createComment(`script`)]):t instanceof HTMLCanvasElement||t instanceof HTMLVideoElement?s.push([n,h(t)]):t instanceof HTMLIFrameElement?s.push([n,ee(t)]):t instanceof HTMLInputElement&&n instanceof HTMLInputElement?(n.value=t.value,n.checked=t.checked):t instanceof HTMLTextAreaElement&&n instanceof HTMLTextAreaElement?n.value=t.value:t instanceof HTMLSelectElement&&n instanceof HTMLSelectElement?n.selectedIndex=t.selectedIndex:t instanceof HTMLMediaElement&&n.removeAttribute(`autoplay`)}for(let[e,t]of s)e.replaceWith(t);r.setAttribute(`aria-hidden`,`true`);let c=r.style;c.setProperty(`position`,`fixed`),c.setProperty(`left`,`${n.left}px`),c.setProperty(`top`,`${n.top}px`),c.setProperty(`width`,`${n.width}px`),c.setProperty(`height`,`${n.height}px`),c.setProperty(`box-sizing`,`border-box`),c.setProperty(`margin`,`0`),c.setProperty(`pointer-events`,`none`),c.setProperty(`z-index`,t.toString()),e.parentNode?.insertBefore(r,e);let l=r.getBoundingClientRect();(l.left!==n.left||l.top!==n.top)&&(c.setProperty(`left`,`${n.left*2-l.left}px`),c.setProperty(`top`,`${n.top*2-l.top}px`));for(let[e,t,n]of o)e.scrollTop=t,e.scrollLeft=n;return p(i,a),()=>{r.remove()}}function p(e,t){let n=e[0],r=t[0];if(!n||!r||typeof n.getAnimations!=`function`)return;let i=(e,t)=>{if(!(`animationName`in e))return null;let n=e.effect,r=n?.target,i=r?t.get(r):void 0;return i===void 0?null:`${i}|${n?.pseudoElement??``}|${e.animationName}`},a=new Map(t.map((e,t)=>[e,t])),o=new Map;for(let e of r.getAnimations({subtree:!0})){let t=i(e,a);t&&o.set(t,e)}let s=new Map(e.map((e,t)=>[e,t]));for(let e of n.getAnimations({subtree:!0})){let t=i(e,s),n=t&&o.get(t);n&&(n.currentTime=e.currentTime,n.pause())}}function m(e,t){let n=e.getBoundingClientRect(),r=getComputedStyle(e);t.className=e.className,t.style.cssText=e.style.cssText,t.style.width=`${n.width}px`,t.style.height=`${n.height}px`,t.style.display=r.display===`inline`?`inline-block`:r.display,t.style.boxSizing=`border-box`}function h(e){let t=document.createElement(`canvas`),n=e instanceof HTMLVideoElement?e.videoWidth:e.width,r=e instanceof HTMLVideoElement?e.videoHeight:e.height;t.width=Math.max(1,n),t.height=Math.max(1,r),m(e,t);try{t.getContext(`2d`)?.drawImage(e,0,0,t.width,t.height)}catch{}return t}function ee(e){let t=document.createElement(`div`);return m(e,t),t}function te(e){let t=d(e);if(!t||t.startsWith(`data:`))return!1;try{return new URL(t,location.href).origin!==location.origin}catch{return!1}}async function g(e){let t=await(await fetch(e)).blob();return URL.createObjectURL(t)}async function _(e){let t=Array.from(e.querySelectorAll(`img`)).filter(e=>e.complete&&e.naturalWidth>0&&te(e));if(t.length===0)return()=>{};let n=new Map,r=[];return await Promise.all(t.map(async e=>{try{let t=d(e),i=await g(t);n.set(e,t),r.push(i),await new Promise(t=>{e.addEventListener(`load`,()=>t(),{once:!0}),e.src=i})}catch{}})),()=>{for(let[e,t]of n)e.src=t;for(let e of r)URL.revokeObjectURL(e)}}var ne=[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`],v=new Set([`IMG`,`VIDEO`,`CANVAS`,`IFRAME`,`EMBED`,`OBJECT`,`INPUT`,`TEXTAREA`,`SELECT`]),re=[`position`,`top`,`right`,`bottom`,`left`,`float`,`flex`,`flex-grow`,`flex-shrink`,`flex-basis`,`align-self`,`justify-self`,`place-self`,`order`,`grid-column`,`grid-column-start`,`grid-column-end`,`grid-row`,`grid-row-start`,`grid-row-end`,`grid-area`],ie=new WeakMap,y=new WeakMap,ae=new WeakMap,oe=new WeakMap,se=new WeakMap,ce=new WeakMap,le=new WeakMap,ue=new WeakMap,de=new WeakMap,fe=new WeakSet,pe=new WeakMap,me=new WeakMap,he=new WeakSet,ge=new WeakSet,_e=300;function ve(e,t){return new Promise(n=>{let r=t=>{clearTimeout(a),e.delete(i),n(t)},i=()=>r(!0),a=setTimeout(()=>r(!1),t);e.add(i)})}function ye(e){if(e)for(let t of[...e])t()}function be(e,t,n){if(typeof e.moveBefore==`function`)try{e.moveBefore(t,n);return}catch{}e.insertBefore(t,n)}function xe(e,t=_e){let n=me.get(e);if(!n)return;let r=ve(n,t);return e.requestPaint(),r}function Se(e){if(he.has(e))return()=>{};he.add(e);let{width:t,height:n,overflow:r}=e.style,i=e.getBoundingClientRect();return e.style.setProperty(`width`,`${i.width}px`),e.style.setProperty(`height`,`${i.height}px`),e.style.setProperty(`overflow`,`hidden`),()=>{if(!he.has(e))return;he.delete(e),e.style.width=t,e.style.height=n,e.style.overflow=r;let i=e.firstElementChild;if(i&&!ge.has(e)){let t=Math.round(i.getBoundingClientRect().height);e.style.setProperty(`height`,`${t}px`)}}}function Ce(e){pe.get(e)?.(),pe.delete(e)}function we(e,t=!1){requestAnimationFrame(()=>{t||e.getContext(`2d`)?.clearRect(0,0,e.width,e.height),Ce(e)})}async function Te(e,t){o(e,e.firstElementChild);let n=e.getContext(`2d`);if(!n)throw Error(`Failed to get 2d context from layoutsubtree canvas`);let{onCapture:r,maxSize:i}=t,a=new Set;me.set(e,a);let s=null,c=null,l=new Promise(e=>{c=e}),d=null,f=t=>{if(t){if(t===d)return;d=t}let o=e.firstElementChild;if(!o||e.width===0||e.height===0||o.getClientRects().length===0)return;o.hasAttribute(`drawable`)||o.setAttribute(`drawable`,``),n.clearRect(0,0,e.width,e.height),n.drawElementImage(o,0,0),u(n,o);let l=e.width,f=e.height;if(i&&(l>i||f>i)){let e=Math.min(i/l,i/f);l=Math.floor(l*e),f=Math.floor(f*e)}s&&s.width===l&&s.height===f||(s=new OffscreenCanvas(l,f));let p=s.getContext(`2d`);p&&(p.clearRect(0,0,l,f),p.drawImage(e,0,0,l,f),c?(c(s),c=null,ye(a)):(n.clearRect(0,0,e.width,e.height),r(s),ye(a)))};e.onpaint=f,e.addEventListener(`paint`,f),y.set(e,f);let p=new ResizeObserver(t=>{for(let n of t){let t=n.devicePixelContentBoxSize?.[0];if(t)e.width=t.inlineSize,e.height=t.blockSize;else{let t=n.borderBoxSize?.[0];if(t){let n=window.devicePixelRatio;e.width=Math.round(t.inlineSize*n),e.height=Math.round(t.blockSize*n)}}}e.requestPaint()});p.observe(e,{box:`device-pixel-content-box`}),ie.set(e,p);let m=e.firstElementChild;if(m){let t=new ResizeObserver(t=>{if(he.has(e)||ge.has(e))return;let n=t[0].borderBoxSize?.[0];if(!n)return;let r=`${Math.round(n.blockSize)}px`;r!==e.style.height&&e.style.setProperty(`height`,r)});t.observe(m),ae.set(e,t)}return l}function Ee(e){e.onpaint=null,ye(me.get(e)),me.delete(e);let t=y.get(e);t&&(e.removeEventListener(`paint`,t),y.delete(e));let n=ie.get(e);n&&(n.disconnect(),ie.delete(e));let r=ae.get(e);r&&(r.disconnect(),ae.delete(e))}function De(e){let t={width:null,height:null};if(typeof e.computedStyleMap!=`function`||v.has(e.tagName))return t;let n=e.computedStyleMap(),r=e=>n.get(e)?.toString()??`auto`,i=r(`position`);if(i!==`fixed`&&i!==`absolute`)return t;let a=(t,n,i)=>{let a=r(n),o=r(i);return r(t)!==`auto`||a===`auto`||o===`auto`?null:`calc(${[`100%`,a,o,...[`margin-${n}`,`margin-${i}`].map(n=>{let i=r(n);return t===`height`&&i.includes(`%`)?getComputedStyle(e).getPropertyValue(n):i}).filter(e=>e!==`auto`)].join(` - `)})`};return{width:a(`width`,`left`,`right`),height:a(`height`,`top`,`bottom`)}}function Oe(e){return v.has(e.tagName)&&typeof e.computedStyleMap==`function`&&e.computedStyleMap().get(`width`)?.toString()===`auto`}async function ke(e,t){let n=e.getBoundingClientRect(),r=De(e),i=document.createElement(`canvas`);e.hasAttribute(`drawable`)||fe.add(e),o(i,e),i.className=e.className;let a=e.getAttribute(`style`);a&&i.setAttribute(`style`,a),i.style.setProperty(`padding`,`0`),i.style.setProperty(`border`,`none`),i.style.setProperty(`box-sizing`,`content-box`),i.style.setProperty(`background`,`transparent`);let s=getComputedStyle(e),c=s.display===`inline`?`block`:s.display;i.style.setProperty(`display`,c);for(let e of ne)i.style.setProperty(e,s.getPropertyValue(e));for(let e of re)i.style.setProperty(e,s.getPropertyValue(e));r.width?i.style.setProperty(`width`,r.width):e.style.width.endsWith(`px`)||Oe(e)?i.style.setProperty(`width`,`${n.width}px`):i.style.setProperty(`width`,`100%`),r.height?(i.style.setProperty(`height`,r.height),ge.add(i)):i.style.height||i.style.setProperty(`height`,`${n.height}px`);let l=window.devicePixelRatio;i.width=Math.round(n.width*l),i.height=Math.round(n.height*l),t.stillCover&&pe.set(i,f(e,t.stillCover.zIndex)),oe.set(e,e.style.margin),se.set(e,e.style.width),ce.set(e,e.style.boxSizing),e.parentNode?.insertBefore(i,e),getComputedStyle(i).display,be(i,e,null),e.style.setProperty(`margin`,`0`),e.style.setProperty(`width`,`100%`),e.style.setProperty(`box-sizing`,`border-box`),(r.width||r.height)&&(le.set(e,e.style.position),e.style.setProperty(`position`,`static`)),r.height&&(ue.set(e,e.style.height),e.style.setProperty(`height`,`100%`));let u=await _(e);return de.set(i,u),{canvas:i,initialCapture:await Te(i,t)}}function Ae(e,t){Ee(e),Ce(e);let n=de.get(e);n&&(n(),de.delete(e));let r=e.parentNode;r&&be(r,t,e),e.remove(),fe.has(t)&&(t.removeAttribute(`drawable`),fe.delete(t));let i=oe.get(t);i!==void 0&&(t.style.margin=i,oe.delete(t));let a=se.get(t);a!==void 0&&(t.style.width=a,se.delete(t));let o=ce.get(t);o!==void 0&&(t.style.boxSizing=o,ce.delete(t));let s=le.get(t);s!==void 0&&(t.style.position=s,le.delete(t));let c=ue.get(t);c!==void 0&&(t.style.height=c,ue.delete(t))}var je;function Me(){if(je!==void 0)return je;try{let e=document.createElement(`canvas`),t=e.getContext(`2d`);je=t!==null&&typeof t.drawElementImage==`function`&&typeof e.requestPaint==`function`}catch{je=!1}return je}var Ne=`#version 300 es
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
`}},b=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},x=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Ye,Xe,Ze,Qe,$e,et,tt,nt,rt,it,at,ot,st,ct,lt,ut,dt,ft=e=>e*e*(3-2*e);function pt(e,t){return typeof e==`function`?e(t):e===`linear`?t:ft(t)}var mt={t:0,x:0},ht=class{constructor(){Ye.add(this),this.enabled=!1,Xe.set(this,null),Ze.set(this,[0,0]),Qe.set(this,[]),$e.set(this,!1),et.set(this,null),tt.set(this,null),nt.set(this,mt),rt.set(this,null),it.set(this,null)}snapshot(){return b(this,Ye,`m`,at).call(this),x(this,et,null,`f`),this.enabled=!0,new Promise(e=>b(this,Qe,`f`).push(e))}start(e){return b(this,Ye,`m`,at).call(this),x(this,et,e,`f`),x(this,it,e.onEnd??null,`f`),x(this,tt,null,`f`),x(this,nt,mt,`f`),x(this,$e,!1,`f`),this.enabled=!1,new Promise(e=>{x(this,rt,e,`f`)})}cancel(){b(this,Ye,`m`,at).call(this),x(this,et,null,`f`),x(this,$e,!1,`f`),this.enabled=!1,b(this,Ye,`m`,ot).call(this)}get frame(){let e=b(this,Xe,`f`);return!e||!b(this,$e,`f`)&&!b(this,et,`f`)?null:{from:e,progress:b(this,nt,`f`),holding:b(this,et,`f`)===null}}cut(){b(this,et,`f`)&&(x(this,et,null,`f`),b(this,Ye,`m`,at).call(this))}update(e){let t=b(this,et,`f`);if(!t)return;b(this,tt,`f`)===null&&x(this,tt,e.time,`f`);let n=(e.time-b(this,tt,`f`))/t.duration;if(n>=1){x(this,et,null,`f`),b(this,Ye,`m`,at).call(this);return}let r=Math.max(n,0);x(this,nt,{t:pt(t.ease,r),x:r},`f`)}render(e){b(this,Qe,`f`).length>0&&(e.blit(e.src,b(this,Ye,`m`,st).call(this,e)),x(this,$e,!0,`f`),b(this,Ye,`m`,ot).call(this)),b(this,Xe,`f`)&&b(this,$e,`f`)?e.blit(b(this,Xe,`f`)):(this.enabled=!1,e.blit(e.src))}dispose(){x(this,Xe,null,`f`),x(this,Ze,[0,0],`f`),b(this,Ye,`m`,at).call(this),b(this,Ye,`m`,ot).call(this)}};Xe=new WeakMap,Ze=new WeakMap,Qe=new WeakMap,$e=new WeakMap,et=new WeakMap,tt=new WeakMap,nt=new WeakMap,rt=new WeakMap,it=new WeakMap,Ye=new WeakSet,at=function(){let e=b(this,it,`f`);x(this,it,null,`f`),e?.();let t=b(this,rt,`f`);x(this,rt,null,`f`),t?.()},ot=function(){let e=b(this,Qe,`f`);x(this,Qe,[],`f`);for(let t of e)t()},st=function(e){let[t,n]=e.dims.elementPixel;return b(this,Xe,`f`)&&b(this,Ze,`f`)[0]===t&&b(this,Ze,`f`)[1]===n||(b(this,Xe,`f`)?.dispose(),x(this,Xe,e.createRenderTarget({size:[t,n]}),`f`),x(this,Ze,[t,n],`f`)),b(this,Xe,`f`)};var gt=class{constructor(e,t){ct.add(this),lt.set(this,void 0),ut.set(this,null),this.effect=e,x(this,lt,t,`f`)}get enabled(){return b(this,ut,`f`)!==null&&typeof this.effect.render==`function`&&this.effect.enabled!==!1}start(e){x(this,ut,e,`f`),this.effect.start?.(e)}end(){b(this,ut,`f`)!==null&&(x(this,ut,null,`f`),this.effect.end?.())}init(e){return this.effect.init?.(e)}update(e){let t=b(this,lt,`f`).frame;if(!t||t.holding)return;let n=b(this,ct,`m`,dt).call(this,e);n&&this.effect.update?.(n)}render(e){let t=b(this,ct,`m`,dt).call(this,e);t&&this.effect.render?this.effect.render(t):e.blit(e.src)}outputRect(e){return b(this,ut,`f`)?this.effect.outputRect?.(e):void 0}dispose(){this.effect.dispose?.()}};lt=new WeakMap,ut=new WeakMap,ct=new WeakSet,dt=function(e){let t=b(this,lt,`f`).frame,n=b(this,ut,`f`);return!t||!n?null:{...e,from:t.from,progress:t.progress,holding:t.holding,reverse:n.reverse,run:n,cut:()=>b(this,lt,`f`).cut()}};var S=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},C=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},w,_t,T,vt,yt,bt,xt,St,Ct,wt,Tt,Et,Dt,Ot,kt,At,jt,Mt,Nt,Pt,Ft,It,Lt,Rt,zt,Bt,Vt,Ht,Ut,Wt,Gt,Kt,qt,Jt,Yt,Xt,Zt,Qt=.6,$t=300,en=1e3;function tn(e,t){let n=t.transition===void 0?e.params===void 0&&t.params===void 0?void 0:{...e.params,...t.params}:t.params;return{transition:t.transition??e.transition,params:n,reverse:t.reverse??e.reverse,duration:t.duration??e.duration,overflow:t.overflow??e.overflow,ease:t.ease??e.ease}}function nn(e,t={}){let n=tn(e,t);return{transition:n.transition??Je,params:n.params,reverse:n.reverse??!1,duration:n.duration??Qt,overflow:n.overflow,ease:n.ease}}var rn=e=>typeof e==`function`;function an(e,t){return Array.isArray(e)&&Array.isArray(t)?e.length===t.length&&e.every((e,n)=>e===t[n]):e===t}function on(e,t){let n=e??{},r=t??{},i=Object.keys(n);return i.length===Object.keys(r).length&&i.every(e=>e in r&&an(n[e],r[e]))}var sn=new WeakMap;function cn(e){let t=e.getBoundingClientRect();return t.right>0&&t.bottom>0&&t.left<window.innerWidth&&t.top<window.innerHeight}function ln(e){return e.tagName===`IMG`?e.loading===`lazy`&&!cn(e):e.preload===`none`}function un(e,t,n=$t){let r=[];for(let t of e.querySelectorAll(`img, video`)){let e=t.tagName===`IMG`;!(e?t.complete:t.readyState>=2)&&!ln(t)&&r.push(new Promise(n=>{let r=()=>n();t.addEventListener(e?`load`:`loadeddata`,r,{once:!0}),t.addEventListener(`error`,r,{once:!0})}))}return t&&r.push(t),r.length===0?Promise.resolve():new Promise(e=>{let t=setTimeout(e,n),i=()=>{clearTimeout(t),e()};Promise.all(r).then(i,i)})}function dn(e,t){return new Promise((n,r)=>{let i=setTimeout(()=>n(!1),t);e.then(()=>{clearTimeout(i),n(!0)},e=>{clearTimeout(i),r(e)})})}var fn=()=>new Promise(e=>requestAnimationFrame(()=>e()));function pn(e,t){return e.length===t.length&&e.every((e,n)=>e===t[n])}var mn=class{constructor(e,t,n={},r,i=new ht){w.add(this),_t.set(this,void 0),T.set(this,void 0),vt.set(this,void 0),yt.set(this,void 0),bt.set(this,void 0),xt.set(this,void 0),St.set(this,[]),Ct.set(this,[]),wt.set(this,!1),Tt.set(this,!1),Et.set(this,!1),Dt.set(this,0),Ot.set(this,null),kt.set(this,!1),At.set(this,!1),jt.set(this,null),Mt.set(this,[]),Nt.set(this,null),Pt.set(this,null),Ft.set(this,null),S(this,xt,r,`f`),S(this,_t,e,`f`),S(this,T,t,`f`),S(this,vt,n,`f`),S(this,yt,i,`f`),S(this,bt,n.keepWrapped??!1,`f`)}get running(){return C(this,Ot,`f`)!==null}show(e,t={}){let n=C(this,w,`m`,It).call(this,e),{remove:r=!1,...i}=t;if(!this.running&&C(this,w,`m`,Lt).call(this,n))return Promise.resolve();let a=C(this,vt,`f`).slideSpec?.(n),o=a?tn(a,i):i;return this.run(()=>{n.parentElement!==C(this,T,`f`)&&C(this,T,`f`).append(n);for(let e of Array.from(C(this,T,`f`).children))e!==n&&(r?e.remove():e.hidden=!0);n.hidden=!1},o)}async run(e,t={}){var n;if(C(this,kt,`f`)){await e();return}let r=S(this,Dt,(n=C(this,Dt,`f`),++n),`f`);S(this,Ot,r,`f`);try{await C(this,w,`m`,Rt).call(this,r,e,t)}finally{C(this,Ot,`f`)===r&&S(this,Ot,null,`f`),C(this,Dt,`f`)===r&&(C(this,w,`m`,Kt).call(this),C(this,w,`m`,Gt).call(this),C(this,w,`m`,Vt).call(this))}}cancel(){var e;let t=S(this,Dt,(e=C(this,Dt,`f`),++e),`f`);S(this,Ot,null,`f`),C(this,w,`m`,Jt).call(this),C(this,yt,`f`).cancel(),C(this,w,`m`,Kt).call(this),C(this,w,`m`,Gt).call(this),C(this,w,`m`,Vt).call(this),C(this,w,`m`,Xt).call(this,t)}destroy(){C(this,kt,`f`)||(S(this,kt,!0,`f`),this.cancel(),S(this,Nt,null,`f`),C(this,xt,`f`)?.call(this))}};_t=new WeakMap,T=new WeakMap,vt=new WeakMap,yt=new WeakMap,bt=new WeakMap,xt=new WeakMap,St=new WeakMap,Ct=new WeakMap,wt=new WeakMap,Tt=new WeakMap,Et=new WeakMap,Dt=new WeakMap,Ot=new WeakMap,kt=new WeakMap,At=new WeakMap,jt=new WeakMap,Mt=new WeakMap,Nt=new WeakMap,Pt=new WeakMap,Ft=new WeakMap,w=new WeakSet,It=function(e){let t=C(this,T,`f`),n=typeof e==`number`?t.children[e]:typeof e==`string`?t.querySelector(e):e;if(!n)throw TypeError(`[VFX-JS] show(): no slide for ${e}.`);if(n.parentElement!==t&&(n.isConnected||t.contains(n)))throw TypeError(`[VFX-JS] show(): the slide must be a direct child of the container.`);return n},Lt=function(e){return e.parentElement!==C(this,T,`f`)||e.hidden?!1:Array.from(C(this,T,`f`).children).every(t=>t===e||t.hidden)},Rt=async function(e,t,n){let r=()=>e===C(this,Dt,`f`),i=!1,a=async()=>{i||(i=!0,await t())},o=async()=>{C(this,w,`m`,Jt).call(this),C(this,yt,`f`).cancel(),await a(),r()&&(C(this,At,`f`)&&C(this,bt,`f`)&&await C(this,_t,`f`).update(C(this,T,`f`)),C(this,w,`m`,Xt).call(this,e))},s=null;if(typeof n!=`function`){if(s=C(this,w,`m`,zt).call(this,nn(C(this,vt,`f`),n)),!r())return a();if(s===null)return o()}C(this,w,`m`,Wt).call(this);try{await C(this,w,`m`,Yt).call(this,s?.slots??null,r,!0)}catch(e){return console.error(`[VFX-JS] transition failed to wrap the element; cutting to the new content.`,e),a()}if(!r())return a();C(this,Ct,`f`).push(C(this,_t,`f`).lockSize(C(this,T,`f`))),C(this,Ct,`f`).push(C(this,_t,`f`).forceRender(C(this,T,`f`)));let c=await dn(C(this,yt,`f`).snapshot(),en);if(!r())return a();if(!c){C(this,w,`m`,Ut).call(this),await a(),r()&&C(this,w,`m`,Xt).call(this,e);return}s&&C(this,w,`m`,Ht).call(this,e,s);let l;try{await a(),typeof n==`function`&&r()&&(l=n())}catch(t){throw r()&&(C(this,w,`m`,Jt).call(this),C(this,yt,`f`).cancel(),C(this,w,`m`,Xt).call(this,e)),t}if(!r())return;if(s===null){if(s=C(this,w,`m`,zt).call(this,nn(C(this,vt,`f`),l)),!r())return;if(s===null)return o();try{await C(this,w,`m`,Yt).call(this,s.slots,r,!1)}catch(e){return console.error(`[VFX-JS] transition failed to swap the effects; cutting to the new content.`,e),o()}if(!r())return;C(this,w,`m`,Ht).call(this,e,s)}C(this,w,`m`,Wt).call(this);try{await C(this,w,`m`,Zt).call(this)}catch(e){console.error(`[VFX-JS] transition waitFor failed:`,e)}if(!r()||(!await C(this,_t,`f`).updateInTime(C(this,T,`f`))&&!C(this,Tt,`f`)&&(S(this,Tt,!0,`f`),console.warn(`[VFX-JS] transition: the new content was not captured in time; it may pop in during the run.`)),!r())||(await fn(),!r()))return;let u=await dn(C(this,yt,`f`).start({duration:s.run.duration,ease:s.ease,onEnd:()=>C(this,w,`m`,Jt).call(this,e)}),s.run.duration*1e3+en);r()&&(u||C(this,w,`m`,Ut).call(this),C(this,w,`m`,Xt).call(this,e))},zt=function(e){if(e.duration<=0)return null;let t=e.transition;if(!rn(t)&&!C(this,w,`m`,Bt).call(this,t))return null;let n,r;try{({transition:n,slots:r}=C(this,w,`m`,qt).call(this,t,e.params))}catch(e){return console.error(`[VFX-JS] transition "${t.name}" constructor failed; cutting to the new content.`,e),null}let i={reverse:e.reverse,duration:e.duration},a=e.overflow??n.overflow;return a!==void 0&&(i.overflow=a),{run:i,ease:e.ease??n.ease??`smoothstep`,slots:r}},Bt=function(e){let t=sn.get(e);return t&&t!==this?(C(this,Et,`f`)||(S(this,Et,!0,`f`),console.warn(`[VFX-JS] transition "${e.name??`unnamed`}" instance is running in another container; cutting to the new content. Pass the class to share it.`)),!1):(C(this,Pt,`f`)!==e&&C(this,w,`m`,Vt).call(this),sn.set(e,this),S(this,Pt,e,`f`),!0)},Vt=function(){let e=C(this,Pt,`f`);S(this,Pt,null,`f`),e&&sn.get(e)===this&&sn.delete(e)},Ht=function(e,{run:t,slots:n}){C(this,w,`m`,Jt).call(this),S(this,Ft,{id:e,slots:n},`f`);for(let e of n)e.start(t)},Ut=function(){C(this,wt,`f`)||(S(this,wt,!0,`f`),console.warn(`[VFX-JS] transition target did not render in time; cutting to the new content.`)),C(this,w,`m`,Jt).call(this),C(this,yt,`f`).cancel()},Wt=function(){C(this,St,`f`).push(C(this,_t,`f`).freezeInside(C(this,T,`f`)))},Gt=function(){let e=C(this,Ct,`f`);S(this,Ct,[],`f`);for(let t of e)t()},Kt=function(){let e=C(this,St,`f`);S(this,St,[],`f`);for(let t of e)t()},qt=function(e,t){let n=C(this,Nt,`f`);if(n?.key.source===e&&(!rn(e)||on(n.key.params,t)))return n;let r=rn(e)?new e(t):e,i=[new gt(r,C(this,yt,`f`))];return S(this,Nt,{key:{source:e,params:t},transition:r,slots:i},`f`),{transition:r,slots:i}},Jt=function(e){let t=C(this,Ft,`f`);if(t&&(e===void 0||t.id===e)){S(this,Ft,null,`f`);for(let e of t.slots)e.end()}},Yt=async function(e,t,n){if(C(this,jt,`f`)&&await C(this,jt,`f`),!t())return;let r=e===null?C(this,At,`f`)?C(this,Mt,`f`):[C(this,yt,`f`)]:[C(this,yt,`f`),...e];if(C(this,At,`f`)){if(!pn(r,C(this,Mt,`f`))){S(this,Mt,r,`f`);let e=C(this,_t,`f`).updateEffects(C(this,T,`f`),r).finally(()=>{S(this,jt,null,`f`)});S(this,jt,e,`f`),await e}n&&await C(this,_t,`f`).update(C(this,T,`f`))}else{let e=C(this,_t,`f`).addHTMLWithStill(C(this,T,`f`),{effect:r}).then(()=>{S(this,At,!0,`f`),S(this,Mt,r,`f`)}).finally(()=>{S(this,jt,null,`f`)});S(this,jt,e,`f`),await e}},Xt=function(e){if(C(this,bt,`f`)&&!C(this,kt,`f`))return;let t=()=>{e===C(this,Dt,`f`)&&C(this,At,`f`)&&(S(this,At,!1,`f`),S(this,Mt,[],`f`),C(this,_t,`f`).remove(C(this,T,`f`)))};C(this,jt,`f`)?C(this,jt,`f`).then(t,()=>{}):t()},Zt=function(){let e=C(this,vt,`f`).waitFor??`media`;return e===`none`?Promise.resolve():e===`media`?un(C(this,T,`f`),document.fonts?.ready):e(C(this,T,`f`))};function hn(e){let t=typeof window<`u`?window.devicePixelRatio:1,n;n=e.scrollPadding===void 0?[.1,.1]:e.scrollPadding===!1?[0,0]:Array.isArray(e.scrollPadding)?[e.scrollPadding[0]??.1,e.scrollPadding[1]??.1]:[e.scrollPadding,e.scrollPadding];let r;return r=e.postEffect===void 0?[]:Array.isArray(e.postEffect)?e.postEffect:[e.postEffect],{pixelRatio:e.pixelRatio??t,zIndex:e.zIndex??void 0,autoplay:e.autoplay??!0,fixedCanvas:e.scrollPadding===!1,scrollPadding:n,wrapper:e.wrapper,postEffects:r,preserveDrawingBuffer:e.preserveDrawingBuffer??!1,timeScale:e.timeScale??1}}var gn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},_n=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},vn,yn,bn,xn,Sn,Cn,wn,Tn,E=class{constructor(e,t,n){vn.add(this),this.wrapS=`clamp`,this.wrapT=`clamp`,this.minFilter=`linear`,this.magFilter=`linear`,this.needsUpdate=!0,this.source=null,yn.set(this,void 0),bn.set(this,!1),xn.set(this,void 0),Sn.set(this,void 0),gn(this,yn,e,`f`),this.gl=e.gl;let r=n?.externalHandle;gn(this,Sn,r!==void 0,`f`),r===void 0?_n(this,vn,`m`,Cn).call(this):(this.texture=r,gn(this,bn,!0,`f`),this.needsUpdate=!1),t&&(this.source=t),gn(this,xn,n?.autoRegister!==!1&&!_n(this,Sn,`f`),`f`),_n(this,xn,`f`)&&e.addResource(this)}restore(){_n(this,Sn,`f`)||(_n(this,vn,`m`,Cn).call(this),gn(this,bn,!1,`f`),this.needsUpdate=!0)}bind(e){let t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&=(_n(this,vn,`m`,wn).call(this),!1)}dispose(){_n(this,xn,`f`)&&_n(this,yn,`f`).removeResource(this),_n(this,Sn,`f`)||this.gl.deleteTexture(this.texture)}};yn=new WeakMap,bn=new WeakMap,xn=new WeakMap,Sn=new WeakMap,vn=new WeakSet,Cn=function(){let e=this.gl.createTexture();if(!e)throw Error(`[VFX-JS] Failed to create texture`);this.texture=e},wn=function(){let e=this.gl,t=this.source;if(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4),t)try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)}catch(e){console.error(e)}else if(!_n(this,bn,`f`)){let t=new Uint8Array([0,0,0,0]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,t)}_n(this,vn,`m`,Tn).call(this),gn(this,bn,!0,`f`)},Tn=function(){let e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,En(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,En(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,Dn(e,this.minFilter)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,Dn(e,this.magFilter))};function En(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function Dn(e,t){return t===`nearest`?e.NEAREST:e.LINEAR}function On(e){return new Promise((t,n)=>{let r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>t(r),r.onerror=n,r.src=e})}var kn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},An=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},jn,Mn,Nn,Pn=class{constructor(e,t,n,r={}){jn.add(this),Mn.set(this,void 0),kn(this,Mn,e,`f`),this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(n)),this.float=r.float??!1,this.mipmap=r.mipmap??!1,this.texture=new E(e,void 0,{autoRegister:!1});let i=r.wrap;i!==void 0&&(typeof i==`string`?(this.texture.wrapS=i,this.texture.wrapT=i):(this.texture.wrapS=i[0],this.texture.wrapT=i[1])),r.filter!==void 0&&(this.texture.minFilter=r.filter,this.texture.magFilter=r.filter),An(this,jn,`m`,Nn).call(this),e.addResource(this)}setSize(e,t){let n=Math.max(1,Math.floor(e)),r=Math.max(1,Math.floor(t));(n!==this.width||r!==this.height)&&(this.width=n,this.height=r,An(this,jn,`m`,Nn).call(this))}restore(){this.texture.restore(),An(this,jn,`m`,Nn).call(this)}dispose(){An(this,Mn,`f`).removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.texture.dispose()}generateMipmaps(){if(!this.mipmap)return;let e=this.gl;e.bindTexture(e.TEXTURE_2D,this.texture.texture),e.generateMipmap(e.TEXTURE_2D),e.bindTexture(e.TEXTURE_2D,null)}};Mn=new WeakMap,jn=new WeakSet,Nn=function(){let e=this.gl,t=this.fbo,n=e.createFramebuffer();if(!n)throw Error(`[VFX-JS] Failed to create framebuffer`);this.fbo=n;let r=this.texture.texture;e.bindTexture(e.TEXTURE_2D,r);let i=An(this,Mn,`f`).floatLinearFilter;if(this.float&&i&&!An(this,Mn,`f`).floatBlend)throw Error(`[VFX-JS] EXT_float_blend is not supported.`);let a=this.float?i?e.RGBA32F:e.RGBA16F:e.RGBA8,o=this.float?i?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;if(this.mipmap){let t=Math.floor(Math.log2(Math.max(this.width,this.height)))+1,n=this.width,r=this.height;for(let i=0;i<t;i++)e.texImage2D(e.TEXTURE_2D,i,a,n,r,0,e.RGBA,o,null),n=Math.max(1,n>>1),r=Math.max(1,r>>1)}else e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,e.RGBA,o,null);let s=this.texture.minFilter===`nearest`?e.NEAREST:e.LINEAR,c=this.texture.magFilter===`nearest`?e.NEAREST:e.LINEAR,l=this.mipmap?this.texture.minFilter===`nearest`?e.NEAREST_MIPMAP_NEAREST:e.LINEAR_MIPMAP_LINEAR:s,u=Fn(e,this.texture.wrapS),d=Fn(e,this.texture.wrapT);e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,l),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,c),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,u),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,d),e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.texture.needsUpdate=!1,this.texture.source=null,t&&e.deleteFramebuffer(t)};function Fn(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function In(e,t,n,r){return{x:e.left+n,y:t-r-e.bottom,w:e.right-e.left,h:e.bottom-e.top}}function Ln(e,t,n,r){return{x:e,y:t,w:n,h:r}}var Rn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},D=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},zn,Bn,Vn,Hn,Un=class{constructor(e,t,n,r,i,a={}){zn.set(this,void 0),Bn.set(this,void 0),Vn.set(this,void 0),Hn.set(this,void 0),Rn(this,zn,t,`f`),Rn(this,Bn,n,`f`),Rn(this,Vn,r,`f`);let o=t*r,s=n*r,c={float:i,wrap:a.wrap,filter:a.filter,mipmap:a.mipmap};Rn(this,Hn,[new Pn(e,o,s,c),new Pn(e,o,s,c)],`f`)}get texture(){return D(this,Hn,`f`)[0].texture}get target(){return D(this,Hn,`f`)[1]}resize(e,t){if(e===D(this,zn,`f`)&&t===D(this,Bn,`f`))return;Rn(this,zn,e,`f`),Rn(this,Bn,t,`f`);let n=e*D(this,Vn,`f`),r=t*D(this,Vn,`f`);D(this,Hn,`f`)[0].setSize(n,r),D(this,Hn,`f`)[1].setSize(n,r)}swap(){Rn(this,Hn,[D(this,Hn,`f`)[1],D(this,Hn,`f`)[0]],`f`)}getViewport(){return Ln(0,0,D(this,zn,`f`),D(this,Bn,`f`))}dispose(){D(this,Hn,`f`)[0].dispose(),D(this,Hn,`f`)[1].dispose()}};zn=new WeakMap,Bn=new WeakMap,Vn=new WeakMap,Hn=new WeakMap;var Wn=class{constructor(e=0,t=0){this.x=0,this.y=0,this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}},Gn=class{constructor(e=0,t=0,n=0,r=0){this.x=0,this.y=0,this.z=0,this.w=0,this.x=e,this.y=t,this.z=n,this.w=r}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}},Kn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},qn=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Jn,Yn,Xn,Zn,Qn,$n,er;function tr(e){return/#version\s+300\s+es\b/.test(e)?`300 es`:/#version\s+100\b/.test(e)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(e)?`100`:`300 es`}var nr=class{constructor(e,t,n,r){Jn.add(this),Yn.set(this,void 0),Xn.set(this,void 0),Zn.set(this,void 0),Qn.set(this,void 0),$n.set(this,new Map),Kn(this,Yn,e,`f`),this.gl=e.gl,Kn(this,Xn,t,`f`),Kn(this,Zn,n,`f`),Kn(this,Qn,r??tr(n),`f`),qn(this,Jn,`m`,er).call(this),e.addResource(this)}restore(){qn(this,Jn,`m`,er).call(this)}use(){this.gl.useProgram(this.program)}hasUniform(e){return qn(this,$n,`f`).has(e)}uploadUniforms(e){let t=this.gl,n=0;for(let[r,i]of qn(this,$n,`f`)){let a=e[r];if(!a)continue;let o=a.value;o!=null&&(ar(i.type)?o instanceof E&&(o.bind(n),t.uniform1i(i.location,n),n++):o instanceof E||sr(t,i,o))}}dispose(){qn(this,Yn,`f`).removeResource(this),this.gl.deleteProgram(this.program)}};Yn=new WeakMap,Xn=new WeakMap,Zn=new WeakMap,Qn=new WeakMap,$n=new WeakMap,Jn=new WeakSet,er=function(){let e=this.gl,t=rr(e,e.VERTEX_SHADER,ir(qn(this,Xn,`f`),qn(this,Qn,`f`))),n=rr(e,e.FRAGMENT_SHADER,ir(qn(this,Zn,`f`),qn(this,Qn,`f`))),r=e.createProgram();if(!r)throw Error(`[VFX-JS] Failed to create program`);if(e.attachShader(r,t),e.attachShader(r,n),e.bindAttribLocation(r,0,`position`),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let i=e.getProgramInfoLog(r)??``;throw e.deleteShader(t),e.deleteShader(n),e.deleteProgram(r),Error(`[VFX-JS] Program link failed: ${i}`)}e.detachShader(r,t),e.detachShader(r,n),e.deleteShader(t),e.deleteShader(n),this.program=r,qn(this,$n,`f`).clear();let i=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<i;t++){let n=e.getActiveUniform(r,t);if(!n)continue;let i=n.name.replace(/\[0\]$/,``),a=e.getUniformLocation(r,n.name);a&&qn(this,$n,`f`).set(i,{location:a,type:n.type,size:n.size})}};function rr(e,t,n){let r=e.createShader(t);if(!r)throw Error(`[VFX-JS] Failed to create shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)??``;throw e.deleteShader(r),Error(`[VFX-JS] Shader compile failed: ${t}\n\n${n}`)}return r}function ir(e,t){return e.replace(/^\s+/,``).startsWith(`#version`)||t===`100`?e:`#version 300 es\n${e}`}function ar(e){return e===35678||e===36298||e===36306||e===35682}var or=new Set;function sr(e,t,n){let r=t.location,i=t.size>1,a=n,o=n,s=n;switch(t.type){case e.FLOAT:i?e.uniform1fv(r,a):e.uniform1f(r,n);return;case e.FLOAT_VEC2:if(i)e.uniform2fv(r,a);else if(n instanceof Wn)e.uniform2f(r,n.x,n.y);else{let t=n;e.uniform2f(r,t[0],t[1])}return;case e.FLOAT_VEC3:if(i)e.uniform3fv(r,a);else{let t=n;e.uniform3f(r,t[0],t[1],t[2])}return;case e.FLOAT_VEC4:if(i)e.uniform4fv(r,a);else if(n instanceof Gn)e.uniform4f(r,n.x,n.y,n.z,n.w);else{let t=n;e.uniform4f(r,t[0],t[1],t[2],t[3])}return;case e.INT:i?e.uniform1iv(r,o):e.uniform1i(r,n);return;case e.INT_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,t[0],t[1])}return;case e.INT_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,t[0],t[1],t[2])}return;case e.INT_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,t[0],t[1],t[2],t[3])}return;case e.BOOL:i?e.uniform1iv(r,o):e.uniform1i(r,+!!n);return;case e.BOOL_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,+!!t[0],+!!t[1])}return;case e.BOOL_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,+!!t[0],+!!t[1],+!!t[2])}return;case e.BOOL_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,+!!t[0],+!!t[1],+!!t[2],+!!t[3])}return;case e.FLOAT_MAT2:e.uniformMatrix2fv(r,!1,a);return;case e.FLOAT_MAT3:e.uniformMatrix3fv(r,!1,a);return;case e.FLOAT_MAT4:e.uniformMatrix4fv(r,!1,a);return;case e.UNSIGNED_INT:i?e.uniform1uiv(r,s):e.uniform1ui(r,n);return;case e.UNSIGNED_INT_VEC2:if(i)e.uniform2uiv(r,s);else{let t=n;e.uniform2ui(r,t[0],t[1])}return;case e.UNSIGNED_INT_VEC3:if(i)e.uniform3uiv(r,s);else{let t=n;e.uniform3ui(r,t[0],t[1],t[2])}return;case e.UNSIGNED_INT_VEC4:if(i)e.uniform4uiv(r,s);else{let t=n;e.uniform4ui(r,t[0],t[1],t[2],t[3])}return;default:or.has(t.type)||(or.add(t.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${t.type.toString(16)}; skipping upload.`));return}}var cr=class{constructor(e,t,n,r,i,a){this.gl=e.gl,this.program=new nr(e,t,n,a),this.uniforms=r,this.blend=i}dispose(){this.program.dispose()}};function lr(e,t,n,r,i,a,o,s){let c=r?r.width/s:a,l=r?r.height/s:o,u=Math.max(0,i.x),d=Math.max(0,i.y),f=Math.min(c,i.x+i.w),p=Math.min(l,i.y+i.h),m=f-u,h=p-d;m<=0||h<=0||(e.bindFramebuffer(e.FRAMEBUFFER,r?r.fbo:null),e.viewport(Math.round(u*s),Math.round(d*s),Math.round(m*s),Math.round(h*s)),ur(e,n.blend),n.program.use(),n.program.uploadUniforms(n.uniforms),t.draw())}function ur(e,t){t===`none`?e.disable(e.BLEND):(e.enable(e.BLEND),e.blendEquation(e.FUNC_ADD),t===`premultiplied`?e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA):t===`additive`?e.blendFuncSeparate(e.ONE,e.ONE,e.ONE,e.ONE):e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA))}var dr=class{constructor(t){this.uniforms={src:{value:null},offset:{value:new Wn},resolution:{value:new Wn},viewport:{value:new Gn}},this.pass=new cr(t,`
precision highp float;
in vec3 position;
void main() {
    gl_Position = vec4(position, 1.0);
}
`,e,this.uniforms,`premultiplied`)}setUniforms(e,t,n){this.uniforms.src.value=e,this.uniforms.resolution.value.set(n.w*t,n.h*t),this.uniforms.offset.value.set(n.x*t,n.y*t)}dispose(){this.pass.dispose()}},fr=e=>{let t=document.implementation.createHTMLDocument(`test`),n=t.createRange();n.selectNodeContents(t.documentElement),n.deleteContents();let r=document.createElement(`head`);return t.documentElement.appendChild(r),t.documentElement.appendChild(n.createContextualFragment(e)),t.documentElement.setAttribute(`xmlns`,t.documentElement.namespaceURI),new XMLSerializer().serializeToString(t).replace(/<!DOCTYPE html>/,``)};async function pr(e,t,n,r){let i=e.getBoundingClientRect(),a=window.devicePixelRatio,o=Math.ceil(i.width),s=Math.ceil(i.height),c=o*a,l=s*a,u=1,d=c,f=l;r&&(d>r||f>r)&&(u=Math.min(r/d,r/f),d=Math.floor(d*u),f=Math.floor(f*u));let p=n&&n.width===d&&n.height===f?n:new OffscreenCanvas(d,f),m=e.cloneNode(!0);await gr(e,m),_r(e,m),m.style.setProperty(`opacity`,t.toString()),m.style.setProperty(`margin`,`0px`),vr(m),yr(e,m),m.style.setProperty(`box-sizing`,`border-box`),m.style.setProperty(`width`,`${o}px`),m.style.setProperty(`height`,`${s}px`);let h=m.outerHTML,ee=`<svg xmlns="http://www.w3.org/2000/svg" width="${c}" height="${l}"><foreignObject width="100%" height="100%">${fr(h)}</foreignObject></svg>`,te=await new Promise(e=>{let t=new Image;t.onload=()=>e(t),t.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(ee)}`}),g=p.getContext(`2d`);if(g===null)throw Error(`[VFX-JS] Failed to get 2D context`);let _=()=>{g.clearRect(0,0,d,f);let e=a*u;g.scale(e,e),g.drawImage(te,0,0,c,l),g.setTransform(1,0,0,1,0,0)};if(_(),hr()&&m.querySelector(`img`))for(let e=0;e<mr;e++)await new Promise(e=>setTimeout(e,16)),_();return p}var mr=3;function hr(){let e=navigator.userAgent;return/AppleWebKit/.test(e)&&!/Chrome\/|Chromium\//.test(e)}async function gr(e,t){let n=window.getComputedStyle(e);for(let e of Array.from(n))/(-inline-|-block-|^inline-|^block-)/.test(e)||/^-webkit-.*(start|end|before|after|logical)/.test(e)||t.style.setProperty(e,n.getPropertyValue(e),n.getPropertyPriority(e));if(t.tagName===`INPUT`)t.setAttribute(`value`,t.value);else if(t.tagName===`TEXTAREA`)t.innerHTML=t.value;else if(t.tagName===`IMG`)try{t.src=await Sr(d(e))}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];await gr(r,i)}}function _r(e,t){if(typeof e.computedStyleMap==`function`)try{let n=e.computedStyleMap();for(let e of[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`]){let r=n.get(e);r instanceof CSSKeywordValue&&r.value===`auto`&&t.style.setProperty(e,`auto`)}}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];r instanceof HTMLElement&&i instanceof HTMLElement&&_r(r,i)}}function vr(e){let t=e;for(;;){let e=t.style;if(Number.parseFloat(e.paddingTop)>0||Number.parseFloat(e.borderTopWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.firstElementChild;if(!n)break;n.style.setProperty(`margin-top`,`0px`),t=n}for(t=e;;){let e=t.style;if(Number.parseFloat(e.paddingBottom)>0||Number.parseFloat(e.borderBottomWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.lastElementChild;if(!n)break;n.style.setProperty(`margin-bottom`,`0px`),t=n}}function yr(e,t){let n=-e.scrollLeft,r=-e.scrollTop;for(let i=0;i<e.children.length;i++){let a=e.children[i],o=t.children[i];a&&(o instanceof HTMLElement||o instanceof SVGElement)&&((n!==0||r!==0)&&br(o,n,r),yr(a,o))}}function br(e,t,n){let r=e.style.getPropertyValue(`translate`),[i=`0px`,a=`0px`,o]=r&&r!==`none`?xr(r):[],s=`calc(${i} + ${t}px) calc(${a} + ${n}px)`;e.style.setProperty(`translate`,o?`${s} ${o}`:s)}function xr(e){let t=[],n=0,r=``;for(let i of e.trim())i===`(`?n++:i===`)`&&n--,i===` `&&n===0?(r&&t.push(r),r=``):r+=i;return r&&t.push(r),t}async function Sr(e){let t=await fetch(e).then(e=>e.blob());return new Promise(e=>{let n=new FileReader;n.onload=function(){e(this.result)},n.readAsDataURL(t)})}var Cr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},O=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},wr,Tr,Er,Dr,Or,kr,Ar,jr,Mr,Nr,Pr,Fr,Ir=Object.freeze({__brand:`EffectQuad`});function Lr(e){return e===Ir}function Rr(e,t){switch(t){case`lines`:return e.LINES;case`lineStrip`:return e.LINE_STRIP;case`points`:return e.POINTS;default:return e.TRIANGLES}}function zr(e,t){if(t instanceof Float32Array)return e.FLOAT;if(t instanceof Uint8Array)return e.UNSIGNED_BYTE;if(t instanceof Uint16Array)return e.UNSIGNED_SHORT;if(t instanceof Uint32Array)return e.UNSIGNED_INT;if(t instanceof Int8Array)return e.BYTE;if(t instanceof Int16Array)return e.SHORT;if(t instanceof Int32Array)return e.INT;throw Error(`[VFX-JS] Unsupported attribute typed array`)}function Br(e,t){if(ArrayBuffer.isView(t)&&!(t instanceof DataView))return{name:e,data:t,itemSize:2,normalized:!1,perInstance:!1};let n=t;return{name:e,data:n.data,itemSize:n.itemSize,normalized:n.normalized??!1,perInstance:n.perInstance??!1}}var Vr=class{constructor(e,t,n){wr.add(this),Tr.set(this,void 0),Er.set(this,void 0),Dr.set(this,void 0),Or.set(this,[]),kr.set(this,null),this.indexType=0,this.hasIndices=!1,this.drawCount=0,this.drawStart=0,Ar.set(this,!1),Cr(this,Tr,e,`f`),this.gl=e.gl,Cr(this,Er,t,`f`),Cr(this,Dr,n,`f`),this.mode=Rr(this.gl,t.mode),this.instanceCount=t.instanceCount??0,O(this,wr,`m`,jr).call(this),e.addResource(this),Cr(this,Ar,!0,`f`)}restore(){Cr(this,Or,[],`f`),Cr(this,kr,null,`f`),O(this,wr,`m`,jr).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),this.hasIndices?this.instanceCount>0?e.drawElementsInstanced(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2),this.instanceCount):e.drawElements(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2)):this.instanceCount>0?e.drawArraysInstanced(this.mode,this.drawStart,this.drawCount,this.instanceCount):e.drawArrays(this.mode,this.drawStart,this.drawCount)}dispose(){O(this,Ar,`f`)&&(O(this,Tr,`f`).removeResource(this),Cr(this,Ar,!1,`f`));let e=this.gl;e.deleteVertexArray(this.vao);for(let t of O(this,Or,`f`))e.deleteBuffer(t);O(this,kr,`f`)&&e.deleteBuffer(O(this,kr,`f`)),Cr(this,Or,[],`f`),Cr(this,kr,null,`f`)}};Tr=new WeakMap,Er=new WeakMap,Dr=new WeakMap,Or=new WeakMap,kr=new WeakMap,Ar=new WeakMap,wr=new WeakSet,jr=function(){let e=this.gl,t=e.createVertexArray();if(!t)throw Error(`[VFX-JS] Failed to create VAO`);this.vao=t,e.bindVertexArray(t);let n=O(this,Dr,`f`).program,r=null;for(let[t,i]of Object.entries(O(this,Er,`f`).attributes)){let a=Br(t,i),o=e.getAttribLocation(n,a.name);if(o<0)continue;let s=e.createBuffer();if(!s)throw Error(`[VFX-JS] Failed to create VBO for "${a.name}"`);O(this,Or,`f`).push(s),e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,a.data,e.STATIC_DRAW);let c=zr(e,a.data);e.enableVertexAttribArray(o),c===e.FLOAT||c===e.HALF_FLOAT||a.normalized?e.vertexAttribPointer(o,a.itemSize,c,a.normalized,0,0):e.vertexAttribIPointer(o,a.itemSize,c,0,0),a.perInstance&&e.vertexAttribDivisor(o,1),t===`position`&&r===null&&(r=a.data.length/a.itemSize)}let i=0,a=O(this,Er,`f`).indices;if(a){let t=e.createBuffer();if(!t)throw Error(`[VFX-JS] Failed to create IBO`);Cr(this,kr,t,`f`),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t),e.bufferData(e.ELEMENT_ARRAY_BUFFER,a,e.STATIC_DRAW),this.hasIndices=!0,this.indexType=a instanceof Uint32Array?e.UNSIGNED_INT:e.UNSIGNED_SHORT,i=a.length}else this.hasIndices=!1;e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null),O(this,kr,`f`)&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null);let o=this.hasIndices?i:r??0,s=O(this,Er,`f`).drawRange;this.drawStart=s?.start??0,this.drawCount=s?.count===void 0?Math.max(0,o-this.drawStart):s.count};var Hr=class{constructor(e,t){Mr.set(this,void 0),Nr.set(this,void 0),Pr.set(this,new WeakMap),Fr.set(this,new Set),Cr(this,Mr,e,`f`),Cr(this,Nr,t,`f`)}get quad(){return O(this,Nr,`f`)}resolve(e,t){let n=O(this,Pr,`f`).get(e);n||(n=new Map,O(this,Pr,`f`).set(e,n));let r=n.get(t);return r||(r=new Vr(O(this,Mr,`f`),e,t),n.set(t,r),O(this,Fr,`f`).add(r)),r}release(e){let t=O(this,Pr,`f`).get(e);if(t){for(let e of t.values())e.dispose(),O(this,Fr,`f`).delete(e);O(this,Pr,`f`).delete(e)}}dispose(){for(let e of O(this,Fr,`f`))e.dispose();O(this,Fr,`f`).clear()}};Mr=new WeakMap,Nr=new WeakMap,Pr=new WeakMap,Fr=new WeakMap;var k=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},A=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ur,Wr,Gr,Kr,qr,Jr,Yr,Xr,Zr,Qr,j,$r,M,N,ei,ti,ni,ri,ii,ai,oi,si,ci,li=Symbol.for(`@vfx-js/effect.resolve-texture`),ui=Symbol.for(`@vfx-js/effect.resolve-rt`);function di(e){return e[li]()}function fi(e){return e[ui]}var pi=`#version 300 es
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
`,yi=class{constructor(e,t,n,r,i,a){Ur.add(this),Wr.set(this,void 0),Gr.set(this,void 0),Kr.set(this,void 0),qr.set(this,void 0),Jr.set(this,void 0),Yr.set(this,[]),Xr.set(this,[]),Zr.set(this,[]),Qr.set(this,[]),j.set(this,`init`),$r.set(this,!1),M.set(this,void 0),N.set(this,void 0),ri.set(this,[]),k(this,Wr,e,`f`),k(this,Gr,e.gl,`f`),k(this,Kr,n,`f`),k(this,qr,a,`f`),k(this,Jr,new Hr(e,t),`f`),k(this,M,{outputBufferW:1,outputBufferH:1,canvasBufferSize:[1,1],outputViewport:{x:0,y:0,w:1,h:1},elementBufferW:1,elementBufferH:1,contentRectUv:[0,0,1,1],srcRectUv:[0,0,1,1]},`f`);let o={time:0,deltaTime:0,pixelRatio:n,resolution:[1,1],mouse:[0,0],mouseViewport:[0,0],intersection:0,enterTime:0,leaveTime:0,enterProgress:0,leaveProgress:0,src:r,target:null,uniforms:{},vfxProps:i,dims:{element:[1,1],elementPixel:[1,1],canvas:[1,1],canvasPixel:[1,1],pixelRatio:n,contentRect:[0,0,1,1],srcRect:[0,0,1,1],canvasRect:[0,0,1,1]},quad:Ir,gl:A(this,Gr,`f`),createRenderTarget:e=>A(this,Ur,`m`,ei).call(this,e),releaseGeometry:e=>A(this,Jr,`f`).release(e),wrapTexture:(e,t)=>A(this,Ur,`m`,ni).call(this,e,t),draw:e=>A(this,Ur,`m`,ii).call(this,e),blit:(e,t,n)=>A(this,Ur,`m`,ai).call(this,e,t,n),clear:e=>A(this,Ur,`m`,oi).call(this,e),onContextRestored:e=>{let t=A(this,Wr,`f`).onContextRestored(e);return A(this,Qr,`f`).push(t),t}};k(this,N,o,`f`)}get ctx(){return A(this,N,`f`)}setPhase(e){k(this,j,e,`f`)}setFrameDims(e){k(this,M,e,`f`),A(this,N,`f`).resolution=[e.canvasBufferSize[0],e.canvasBufferSize[1]];for(let t of A(this,Zr,`f`))t.resolver.resize?.(e.outputBufferW,e.outputBufferH)}setEffectDims(e){A(this,N,`f`).dims=e}setFrameState(e){let t=A(this,N,`f`);t.time=e.time,t.deltaTime=e.deltaTime,t.mouse=e.mouse,t.mouseViewport=e.mouseViewport,t.intersection=e.intersection,t.enterTime=e.enterTime,t.leaveTime=e.leaveTime,t.enterProgress=e.enterProgress,t.leaveProgress=e.leaveProgress,t.uniforms=e.uniforms}setSrc(e){A(this,N,`f`).src=e}setOutput(e){A(this,N,`f`).target=e}passthroughCopy(e,t,n){let r=A(this,j,`f`);k(this,j,`render`,`f`);let i=A(this,N,`f`).target;A(this,N,`f`).target=t;try{let r=A(this,M,`f`).outputViewport;A(this,M,`f`).outputViewport={...n};let i=A(this,N,`f`).vfxProps.glslVersion===`100`?gi:hi;A(this,Ur,`m`,si).call(this,{frag:i,uniforms:{src:e},target:t}),A(this,M,`f`).outputViewport=r}finally{A(this,N,`f`).target=i,k(this,j,r,`f`)}}clearRt(e){let t=A(this,Gr,`f`),n=fi(e);t.bindFramebuffer(t.FRAMEBUFFER,n.getWriteFbo().fbo),t.viewport(0,0,e.width,e.height),t.clearColor(0,0,0,0),t.disable(t.SCISSOR_TEST),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)}tickAutoUpdates(){for(let e of A(this,ri,`f`))e()}dispose(){k(this,j,`disposed`,`f`);for(let e of A(this,Qr,`f`))e();k(this,Qr,[],`f`);for(let e of A(this,Xr,`f`))e.resolver.dispose?.();k(this,Xr,[],`f`),k(this,Zr,[],`f`);for(let e of A(this,Yr,`f`))e.dispose();k(this,Yr,[],`f`),A(this,Jr,`f`).dispose(),k(this,ri,[],`f`)}};Wr=new WeakMap,Gr=new WeakMap,Kr=new WeakMap,qr=new WeakMap,Jr=new WeakMap,Yr=new WeakMap,Xr=new WeakMap,Zr=new WeakMap,Qr=new WeakMap,j=new WeakMap,$r=new WeakMap,M=new WeakMap,N=new WeakMap,ri=new WeakMap,Ur=new WeakSet,ei=function(e){let t=e?.persistent??!1,n=e?.float??!1,r=xi(e?.wrap),i=e?.filter,a=e?.mipmap??!1,o=a!==!1,s=a===!0,c=e?.size,l=c?c[0]:A(this,M,`f`).outputBufferW,u=c?c[1]:A(this,M,`f`).outputBufferH,d,f,p;if(t){let e=c?1:A(this,Kr,`f`),t=c?l:l/e,a=c?u:u/e,m=new Un(A(this,Wr,`f`),t,a,e,n,{wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>m.texture,getWriteFbo:()=>m.target,swap:()=>m.swap(),resize:c?void 0:(e,t)=>{m.resize(e/A(this,Kr,`f`),t/A(this,Kr,`f`))},dispose:()=>m.dispose()},o&&(d.regenerateMipmaps=()=>m.target.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>m.target.width,p=()=>m.target.height}else{let e=new Pn(A(this,Wr,`f`),l,u,{float:n,wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>e.texture,getWriteFbo:()=>e,resize:c?void 0:(t,n)=>e.setSize(t,n),dispose:()=>e.dispose()},o&&(d.regenerateMipmaps=()=>e.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>e.width,p=()=>e.height}let m,h=wi(d,f,p,()=>A(this,Ur,`m`,ti).call(this,m));return m={handle:h,resolver:d},A(this,Xr,`f`).push(m),c||A(this,Zr,`f`).push(m),h},ti=function(e){let t=A(this,Xr,`f`).indexOf(e);if(t<0)return;A(this,Xr,`f`).splice(t,1);let n=A(this,Zr,`f`).indexOf(e);n>=0&&A(this,Zr,`f`).splice(n,1),e.resolver.dispose?.()},ni=function(e,t){let n=xi(t?.wrap),r=t?.filter,i,a,o,s=null,c=bi(e);if(c){if(!t?.size)throw Error(`[VFX-JS] wrapTexture(WebGLTexture) requires opts.size`);let[n,r]=t.size;i=new E(A(this,Wr,`f`),void 0,{autoRegister:!1,externalHandle:e}),a=()=>n,o=()=>r}else{let n=e;i=new E(A(this,Wr,`f`),n);let r=t?.size,c=e=>{if(r)return e===`w`?r[0]:r[1];if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return e===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return e===`w`?n.videoWidth:n.videoHeight;let t=n;return e===`w`?t.width:t.height};a=()=>c(`w`),o=()=>c(`h`);let l=typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement||typeof HTMLCanvasElement<`u`&&n instanceof HTMLCanvasElement||typeof OffscreenCanvas<`u`&&n instanceof OffscreenCanvas;(t?.autoUpdate??l)&&(s=()=>{i.needsUpdate=!0})}i.wrapS=n[0],i.wrapT=n[1],r!==void 0&&(i.minFilter=r,i.magFilter=r),A(this,Yr,`f`).push(i),s&&A(this,ri,`f`).push(s);let l=!1;return Ci(()=>i,a,o,()=>{if(l)return;l=!0;let e=A(this,Yr,`f`).indexOf(i);if(e!==-1&&A(this,Yr,`f`).splice(e,1),s){let e=A(this,ri,`f`).indexOf(s);e!==-1&&A(this,ri,`f`).splice(e,1)}i.dispose()},c?void 0:()=>{l||(i.needsUpdate=!0)})},ii=function(e){A(this,j,`f`)===`render`?A(this,Ur,`m`,si).call(this,e):A(this,j,`f`)===`update`&&!A(this,$r,`f`)&&(k(this,$r,!0,`f`),console.warn(`[VFX-JS] ctx.draw() called in update(); ignored. Move draws to render().`))},ai=function(e,t,n){if(A(this,j,`f`)!==`render`){A(this,j,`f`)===`update`&&!A(this,$r,`f`)&&(k(this,$r,!0,`f`),console.warn(`[VFX-JS] ctx.blit() called in update(); ignored. Move draws to render().`));return}let r=A(this,N,`f`).vfxProps.glslVersion===`100`?vi:_i;A(this,Ur,`m`,si).call(this,{frag:r,uniforms:{src:e},target:t,blend:n?.blend,swap:n?.swap})},oi=function(e){if(A(this,j,`f`)!==`render`){A(this,j,`f`)===`update`&&!A(this,$r,`f`)&&(k(this,$r,!0,`f`),console.warn(`[VFX-JS] ctx.clear() called in update(); ignored. Move draws to render().`));return}let t=A(this,Gr,`f`),n=A(this,N,`f`).target,r=e??n,i=r===null||r===n;if(t.clearColor(0,0,0,0),i){let e=r===null?null:fi(r).getWriteFbo().fbo,n=A(this,M,`f`).outputViewport;t.bindFramebuffer(t.FRAMEBUFFER,e),t.enable(t.SCISSOR_TEST),t.scissor(n.x,n.y,n.w,n.h),t.clear(t.COLOR_BUFFER_BIT),t.disable(t.SCISSOR_TEST),t.bindFramebuffer(t.FRAMEBUFFER,null);return}let a=fi(r);t.disable(t.SCISSOR_TEST);let o=()=>{t.bindFramebuffer(t.FRAMEBUFFER,a.getWriteFbo().fbo),t.clear(t.COLOR_BUFFER_BIT)};o(),a.swap&&(a.swap(),o(),a.swap()),t.bindFramebuffer(t.FRAMEBUFFER,null)},si=function(e){let t=A(this,Gr,`f`),n=e.vert??(A(this,N,`f`).vfxProps.glslVersion===`100`?mi:pi),r=A(this,qr,`f`).get(n,e.frag,A(this,N,`f`).vfxProps.glslVersion),i=A(this,N,`f`).target,a=e.target===void 0||e.target===null?i:e.target,o=a===null||a===i,s,c,l,u,d,f,p;if(a===null)s=null,c=A(this,M,`f`).outputViewport.x,l=A(this,M,`f`).outputViewport.y,u=A(this,M,`f`).outputViewport.w,d=A(this,M,`f`).outputViewport.h;else{let e=fi(a);s=e.getWriteFbo().fbo,o?(c=A(this,M,`f`).outputViewport.x,l=A(this,M,`f`).outputViewport.y,u=A(this,M,`f`).outputViewport.w,d=A(this,M,`f`).outputViewport.h):(c=0,l=0,u=a.width,d=a.height),f=e.swap,e.mipmapAutoRegen&&(p=e.regenerateMipmaps)}t.bindFramebuffer(t.FRAMEBUFFER,s),t.viewport(c,l,u,d),t.disable(t.SCISSOR_TEST),ur(t,e.blend??(a===null?`premultiplied`:`none`)),r.use();let m=A(this,Ur,`m`,ci).call(this,e.uniforms);r.uploadUniforms(m);let h=e.geometry??Ir;Lr(h)?A(this,Jr,`f`).quad.draw():A(this,Jr,`f`).resolve(h,r).draw(),p?.(),f&&e.swap!==!1&&f()},ci=function(e){let t={};if(t.contentRectUv={value:A(this,M,`f`).contentRectUv},t.srcRectUv={value:A(this,M,`f`).srcRectUv},!e)return t;for(let[n,r]of Object.entries(e))t[n]=Si(r);return t};function bi(e){let t=globalThis.WebGLTexture;if(t&&typeof t==`function`&&e instanceof t)return!0;let n=e;return n.width===void 0&&n.naturalWidth===void 0&&n.videoWidth===void 0}function xi(e){return e===void 0?[`clamp`,`clamp`]:typeof e==`string`?[e,e]:[e[0],e[1]]}function Si(e){return typeof e==`object`&&e&&`__brand`in e?e.__brand===`EffectRenderTarget`?{value:fi(e).getReadTexture()}:{value:di(e)}:{value:e}}function Ci(e,t,n,r,i){let a={__brand:`EffectTexture`,get width(){return t()},get height(){return n()},dispose(){r?.()},update(){i?.()}};return Object.defineProperty(a,li,{value:e}),a}function wi(e,t,n,r){let i={__brand:`EffectRenderTarget`,get width(){return t()},get height(){return n()},dispose:r??(()=>{}),generateMipmaps:()=>e.regenerateMipmaps?.()};return Object.defineProperty(i,ui,{value:e}),i}function Ti(e){return wi({getReadTexture:()=>e.texture,getWriteFbo:()=>e},()=>e.width,()=>e.height)}function Ei(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:Array.isArray(e)?{top:e[0],right:e[1],bottom:e[2],left:e[3]}:{top:e.top??0,right:e.right??0,bottom:e.bottom??0,left:e.left??0}}function Di(e){return Ei(e)}var Oi={top:0,right:0,bottom:0,left:0};function ki(e){return Ei(e)}function Ai(e){return{top:e.top,right:e.right,bottom:e.bottom,left:e.left}}function ji(e){return{top:e.top,left:e.left,right:e.left+Math.ceil(e.right-e.left),bottom:e.top+Math.ceil(e.bottom-e.top)}}function Mi(e,t){return{top:e.top-t.top,right:e.right+t.right,bottom:e.bottom+t.bottom,left:e.left-t.left}}function Ni(e,t,n){return Math.min(Math.max(e,t),n)}function Pi(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return c<=0||l<=0?[0,0,1,1]:[(n-o)/c,(r-s)/l,i/c,a/l]}function Fi(e,t){return Ii(e.left,e.right,t.left,t.right)*Ii(e.top,e.bottom,t.top,t.bottom)}function Ii(e,t,n,r){let i=Math.min(r-n,t-e);if(i<=0)return 0;let a=Ni(n,e,t);return(Ni(r,e,t)-a)/i}var P=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},F=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},I,Li,Ri,zi,Bi,Vi,L,R,Hi,Ui,Wi,Gi,Ki,qi,Ji,Yi,Xi,Zi,Qi,$i,ea,ta,na,ra,ia,aa,oa,sa=class{constructor(e,t,n,r,i,a,o,s){I.add(this),Li.set(this,void 0),Ri.set(this,void 0),zi.set(this,void 0),Bi.set(this,void 0),Vi.set(this,void 0),L.set(this,void 0),R.set(this,void 0),Hi.set(this,void 0),Ui.set(this,[]),Wi.set(this,[]),Gi.set(this,void 0),Ki.set(this,new Set),qi.set(this,!1),Ji.set(this,void 0),Yi.set(this,Di(0)),Xi.set(this,null),P(this,Li,e,`f`),P(this,Ri,t,`f`),P(this,zi,n,`f`),P(this,Bi,i,`f`),P(this,Vi,s,`f`),P(this,L,r,`f`),P(this,Gi,a,`f`),P(this,Ji,o,`f`),P(this,R,r.map(()=>F(this,I,`m`,Qi).call(this)),`f`),r.length===0&&P(this,Xi,F(this,I,`m`,Qi).call(this),`f`),P(this,Hi,F(this,I,`m`,Zi).call(this),`f`)}get effects(){return F(this,L,`f`)}get hosts(){return F(this,R,`f`)}get renderingIndices(){return F(this,Hi,`f`)}get stages(){return F(this,Wi,`f`)}get hitTestPadBuffer(){return F(this,Yi,`f`)}async initAll(){for(let e=0;e<F(this,L,`f`).length;e++){let t=F(this,L,`f`)[e],n=F(this,R,`f`)[e];n.setPhase(`init`);try{t.init&&await t.init(n.ctx)}catch(t){console.error(`[VFX-JS] effect[${e}].init() failed:`,t);for(let t=e-1;t>=0;t--)F(this,I,`m`,$i).call(this,t),F(this,R,`f`)[t].dispose();throw F(this,R,`f`)[e].dispose(),t}n.setPhase(`update`)}}run(e){if(F(this,qi,`f`)||!e.isVisible)return;P(this,Hi,F(this,I,`m`,Zi).call(this),`f`);let t=F(this,Hi,`f`).length;for(let t of F(this,R,`f`))t.setFrameState({time:e.time,deltaTime:e.deltaTime,mouse:e.mouse,mouseViewport:e.mouseViewport,intersection:e.intersection,enterTime:e.enterTime,leaveTime:e.leaveTime,enterProgress:e.enterProgress,leaveProgress:e.leaveProgress,uniforms:e.resolvedUniforms});F(this,I,`m`,ea).call(this,e);for(let t=0;t<F(this,R,`f`).length;t++)F(this,R,`f`)[t].setFrameDims(F(this,I,`m`,oa).call(this,t,e)),F(this,R,`f`)[t].setEffectDims(F(this,I,`m`,ra).call(this,t,e));for(let e=0;e<F(this,L,`f`).length;e++){let t=F(this,L,`f`)[e];if(!t.update)continue;let n=F(this,R,`f`)[e];n.setPhase(`update`);try{t.update(n.ctx)}catch(t){let n=`${e}:update`;F(this,Ki,`f`).has(n)||(F(this,Ki,`f`).add(n),console.warn(`[VFX-JS] effect[${e}].update() threw; skipping this frame's update:`,t))}}if(t===0)(F(this,Xi,`f`)??F(this,R,`f`)[0]).passthroughCopy(F(this,Gi,`f`),e.finalTarget,e.elementRectOnCanvasPx);else for(let n=0;n<t;n++){let r=F(this,Hi,`f`)[n],i=F(this,R,`f`)[r],a=F(this,L,`f`)[r];if(!a.render)continue;i.setPhase(`render`),i.tickAutoUpdates();let o=n===0?F(this,Gi,`f`):F(this,Ui,`f`)[n-1].texHandle;i.setSrc(o);let s;n===t-1?s=e.finalTarget:(s=F(this,Ui,`f`)[n].rtHandle,i.clearRt(s)),i.setOutput(s);try{a.render(i.ctx)}catch(e){let a=`${r}:render`;F(this,Ki,`f`).has(a)||(F(this,Ki,`f`).add(a),console.warn(`[VFX-JS] effect[${r}].render() threw; falling back to passthrough:`,e));let c=F(this,Wi,`f`)[n].outputViewport;s===null?i.passthroughCopy(o,null,c):n===t-1?i.passthroughCopy(o,s,c):i.passthroughCopy(o,s,{x:0,y:0,w:s.width,h:s.height})}i.setPhase(`update`)}}dispose(){if(!F(this,qi,`f`)){P(this,qi,!0,`f`);for(let e=F(this,L,`f`).length-1;e>=0;e--)F(this,I,`m`,$i).call(this,e),F(this,R,`f`)[e].dispose();F(this,Xi,`f`)&&(F(this,Xi,`f`).dispose(),P(this,Xi,null,`f`));for(let e of F(this,Ui,`f`))e.fb.dispose();P(this,Ui,[],`f`),P(this,Wi,[],`f`)}}async replaceEffects(e){if(F(this,qi,`f`))throw Error(`[VFX-JS] replaceEffects on disposed chain`);let t=F(this,L,`f`),n=F(this,R,`f`),r=new Map;for(let e=0;e<t.length;e++)r.set(t[e],n[e]);let i=Array(e.length),a=[];for(let t=0;t<e.length;t++){let n=e[t],o=r.get(n);if(o)i[t]=o,r.delete(n);else{let e=F(this,I,`m`,Qi).call(this);i[t]=e,a.push({host:e,effect:n})}}for(let e=0;e<a.length;e++){let{host:t,effect:n}=a[e];t.setPhase(`init`);try{n.init&&await n.init(t.ctx),t.setPhase(`update`)}catch(n){console.error(`[VFX-JS] replaceEffects: new effect init() failed:`,n);for(let t=e-1;t>=0;t--){let e=a[t];if(e.effect.dispose)try{e.effect.dispose()}catch(e){console.error(`[VFX-JS] dispose during init rollback threw:`,e)}e.host.dispose()}throw t.dispose(),n}}for(let[e,t]of r){if(e.dispose)try{e.dispose()}catch(e){console.error(`[VFX-JS] effect.dispose() threw during replaceEffects:`,e)}t.dispose()}for(let e of F(this,Ui,`f`))e.fb.dispose();P(this,Ui,[],`f`),P(this,Wi,[],`f`),e.length===0&&!F(this,Xi,`f`)?P(this,Xi,F(this,I,`m`,Qi).call(this),`f`):e.length>0&&F(this,Xi,`f`)&&(F(this,Xi,`f`).dispose(),P(this,Xi,null,`f`)),P(this,L,e,`f`),P(this,R,i,`f`),P(this,Hi,F(this,I,`m`,Zi).call(this),`f`),F(this,Ki,`f`).clear()}};Li=new WeakMap,Ri=new WeakMap,zi=new WeakMap,Bi=new WeakMap,Vi=new WeakMap,L=new WeakMap,R=new WeakMap,Hi=new WeakMap,Ui=new WeakMap,Wi=new WeakMap,Gi=new WeakMap,Ki=new WeakMap,qi=new WeakMap,Ji=new WeakMap,Yi=new WeakMap,Xi=new WeakMap,I=new WeakSet,Zi=function(){return F(this,L,`f`).map((e,t)=>typeof e.render==`function`&&e.enabled!==!1?t:-1).filter(e=>e>=0)},Qi=function(){return new yi(F(this,Li,`f`),F(this,Ri,`f`),F(this,zi,`f`),F(this,Gi,`f`),F(this,Bi,`f`),F(this,Vi,`f`))},$i=function(e){let t=F(this,L,`f`)[e];if(t.dispose)try{t.dispose()}catch(t){console.error(`[VFX-JS] effect[${e}].dispose() threw:`,t)}},ea=function(e){let t=F(this,Hi,`f`).length;if(P(this,Wi,Array(t),`f`),t===0)return;let n=F(this,Ji,`f`)?e.canvasBufferSize:e.elementBufferSize,r=[0,0,n[0],n[1]],i=F(this,I,`m`,aa).call(this,e),a=r;for(let n=0;n<t;n++){let o=F(this,Hi,`f`)[n],s=F(this,L,`f`)[o],c=n===t-1,l=F(this,I,`m`,ta).call(this,s,a,r,i,e)??a,u=[l[2],l[3]],d=Pi(r,l),f=c?{x:e.elementRectOnCanvasPx.x+l[0],y:e.elementRectOnCanvasPx.y+l[1],w:u[0],h:u[1]}:{x:0,y:0,w:u[0],h:u[1]};F(this,Wi,`f`)[n]={dstRect:l,dstBufferSize:u,contentRectUv:d,outputViewport:f},c||F(this,I,`m`,ia).call(this,n,u),a=l}let[o,s,c,l]=F(this,Wi,`f`)[t-1].dstRect;P(this,Yi,Di({top:Math.max(0,s+l-n[1]),right:Math.max(0,o+c-n[0]),bottom:Math.max(0,-s),left:Math.max(0,-o)}),`f`)},ta=function(e,t,n,r,i){if(e.outputRect)return e.outputRect(F(this,I,`m`,na).call(this,i,n,t,r))},na=function(e,t,n,r){let i=e.canvasBufferSize[0]/e.canvasSize[0]||1;return{element:F(this,Ji,`f`)?e.canvasSize:e.elementSize,elementPixel:F(this,Ji,`f`)?e.canvasBufferSize:e.elementBufferSize,canvas:e.canvasSize,canvasPixel:e.canvasBufferSize,pixelRatio:i,contentRect:t,srcRect:n,canvasRect:r}},ra=function(e,t){let n=F(this,Ji,`f`)?t.canvasBufferSize:t.elementBufferSize,r=[0,0,n[0],n[1]],i=F(this,I,`m`,aa).call(this,t),a=F(this,Hi,`f`).indexOf(e),o=a<=0?r:F(this,Wi,`f`)[a-1].dstRect;return F(this,I,`m`,na).call(this,t,r,o,i)},ia=function(e,t){let n=F(this,Ui,`f`)[e];if(n&&n.fb.width===t[0]&&n.fb.height===t[1])return;n&&n.fb.dispose();let r=new Pn(F(this,Li,`f`),t[0],t[1]),i=Ti(r),a=Ci(()=>r.texture,()=>r.width,()=>r.height);F(this,Ui,`f`)[e]={fb:r,rtHandle:i,texHandle:a,bufferSize:t}},aa=function(e){let[t,n]=e.canvasBufferSize;if(F(this,Ji,`f`))return[0,0,t,n];let{x:r,y:i}=e.elementRectOnCanvasPx;return[-r,-i,t,n]},oa=function(e,t){let n=F(this,Hi,`f`).indexOf(e),r,i,a,o,s;if(n<0)r=t.elementBufferSize[0],i=t.elementBufferSize[1],a={x:0,y:0,w:r,h:i},o=[0,0,1,1],s=[0,0,1,1];else{let e=F(this,Wi,`f`)[n];r=e.dstBufferSize[0],i=e.dstBufferSize[1],a=e.outputViewport,o=e.contentRectUv,s=n===0?[0,0,1,1]:F(this,Wi,`f`)[n-1].contentRectUv}return{outputBufferW:r,outputBufferH:i,canvasBufferSize:t.canvasBufferSize,outputViewport:a,elementBufferW:t.elementBufferSize[0],elementBufferH:t.elementBufferSize[1],contentRectUv:o,srcRectUv:s}};var ca=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},la=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ua,da,fa,pa,ma=class{constructor(e){ua.add(this),da.set(this,void 0),fa.set(this,new Set),ca(this,da,e,`f`)}freezeInside(e,t){let n={root:e,entries:[]};for(let r of t)!r.frozen&&ha(e,r.element)&&(r.frozen=!0,n.entries.push({e:r,opacity:r.element.style.opacity}),la(this,da,`f`).showPlain(r));la(this,fa,`f`).add(n);let r=!1;return()=>{if(!r){r=!0,la(this,fa,`f`).delete(n);for(let{e}of n.entries)e.frozen=!1;requestAnimationFrame(()=>{for(let{e,opacity:t}of n.entries)!e.frozen&&la(this,da,`f`).isRegistered(e)&&la(this,da,`f`).hidePlain(e,t)})}}}adopt(e,t){let n=la(this,ua,`m`,pa).call(this,e.element);return n?(e.frozen=!0,n.entries.push({e,opacity:t??e.element.style.opacity}),!0):!1}};da=new WeakMap,fa=new WeakMap,ua=new WeakSet,pa=function(e){for(let t of la(this,fa,`f`))if(ha(t.root,e))return t};function ha(e,t){return t!==e&&e.contains(t)}function ga(e){this.data=e,this.pos=0}ga.prototype.readByte=function(){return this.data[this.pos++]},ga.prototype.peekByte=function(){return this.data[this.pos]},ga.prototype.readBytes=function(e){return this.data.subarray(this.pos,this.pos+=e)},ga.prototype.peekBytes=function(e){return this.data.subarray(this.pos,this.pos+e)},ga.prototype.readString=function(e){for(var t=``,n=0;n<e;n++)t+=String.fromCharCode(this.readByte());return t},ga.prototype.readBitArray=function(){for(var e=[],t=this.readByte(),n=7;n>=0;n--)e.push(!!(t&1<<n));return e},ga.prototype.readUnsigned=function(e){var t=this.readBytes(2);return e?(t[1]<<8)+t[0]:(t[0]<<8)+t[1]};function _a(e){this.stream=new ga(e),this.output={}}_a.prototype.parse=function(e){return this.parseParts(this.output,e),this.output},_a.prototype.parseParts=function(e,t){for(var n=0;n<t.length;n++){var r=t[n];this.parsePart(e,r)}},_a.prototype.parsePart=function(e,t){var n=t.label,r;if(!t.requires||t.requires(this.stream,this.output,e)){if(t.loop){for(var i=[];t.loop(this.stream);){var a={};this.parseParts(a,t.parts),i.push(a)}e[n]=i}else t.parts?(r={},this.parseParts(r,t.parts),e[n]=r):t.parser?(r=t.parser(this.stream,this.output,e),t.skip||(e[n]=r)):t.bits&&(e[n]=this.parseBits(t.bits))}};function va(e){return e.reduce(function(e,t){return e*2+t},0)}_a.prototype.parseBits=function(e){var t={},n=this.stream.readBitArray();for(var r in e){var i=e[r];t[r]=i.length?va(n.slice(i.index,i.index+i.length)):n[i.index]}return t};var z={readByte:function(){return function(e){return e.readByte()}},readBytes:function(e){return function(t){return t.readBytes(e)}},readString:function(e){return function(t){return t.readString(e)}},readUnsigned:function(e){return function(t){return t.readUnsigned(e)}},readArray:function(e,t){return function(n,r,i){for(var a=t(n,r,i),o=Array(a),s=0;s<a;s++)o[s]=n.readBytes(e);return o}}},ya={label:`blocks`,parser:function(e){for(var t=[],n=0,r=0,i=e.readByte();i!==r;i=e.readByte())t.push(e.readBytes(i)),n+=i;var a=new Uint8Array(n);n=0;for(var o=0;o<t.length;o++)a.set(t[o],n),n+=t[o].length;return a}},ba={label:`gce`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===249},parts:[{label:`codes`,parser:z.readBytes(2),skip:!0},{label:`byteSize`,parser:z.readByte()},{label:`extras`,bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:`delay`,parser:z.readUnsigned(!0)},{label:`transparentColorIndex`,parser:z.readByte()},{label:`terminator`,parser:z.readByte(),skip:!0}]},xa={label:`image`,requires:function(e){return e.peekByte()===44},parts:[{label:`code`,parser:z.readByte(),skip:!0},{label:`descriptor`,parts:[{label:`left`,parser:z.readUnsigned(!0)},{label:`top`,parser:z.readUnsigned(!0)},{label:`width`,parser:z.readUnsigned(!0)},{label:`height`,parser:z.readUnsigned(!0)},{label:`lct`,bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:`lct`,requires:function(e,t,n){return n.descriptor.lct.exists},parser:z.readArray(3,function(e,t,n){return 2**(n.descriptor.lct.size+1)})},{label:`data`,parts:[{label:`minCodeSize`,parser:z.readByte()},ya]}]},Sa={label:`text`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===1},parts:[{label:`codes`,parser:z.readBytes(2),skip:!0},{label:`blockSize`,parser:z.readByte()},{label:`preData`,parser:function(e,t,n){return e.readBytes(n.text.blockSize)}},ya]},Ca={label:`frames`,parts:[ba,{label:`application`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===255},parts:[{label:`codes`,parser:z.readBytes(2),skip:!0},{label:`blockSize`,parser:z.readByte()},{label:`id`,parser:function(e,t,n){return e.readString(n.blockSize)}},ya]},{label:`comment`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===254},parts:[{label:`codes`,parser:z.readBytes(2),skip:!0},ya]},xa,Sa],loop:function(e){var t=e.peekByte();return t===33||t===44}},wa=[{label:`header`,parts:[{label:`signature`,parser:z.readString(3)},{label:`version`,parser:z.readString(3)}]},{label:`lsd`,parts:[{label:`width`,parser:z.readUnsigned(!0)},{label:`height`,parser:z.readUnsigned(!0)},{label:`gct`,bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:`backgroundColorIndex`,parser:z.readByte()},{label:`pixelAspectRatio`,parser:z.readByte()}]},{label:`gct`,requires:function(e,t){return t.lsd.gct.exists},parser:z.readArray(3,function(e,t){return 2**(t.lsd.gct.size+1)})},Ca];function Ta(e){var t=new _a(new Uint8Array(e));this.raw=t.parse(wa),this.raw.hasImages=!1;for(var n=0;n<this.raw.frames.length;n++)if(this.raw.frames[n].image){this.raw.hasImages=!0;break}}Ta.prototype.decompressFrame=function(e,t){if(e>=this.raw.frames.length)return null;var n=this.raw.frames[e];if(n.image){var r=n.image.descriptor.width*n.image.descriptor.height,i=o(n.image.data.minCodeSize,n.image.data.blocks,r);n.image.descriptor.lct.interlaced&&(i=s(i,n.image.descriptor.width));var a={pixels:i,dims:{top:n.image.descriptor.top,left:n.image.descriptor.left,width:n.image.descriptor.width,height:n.image.descriptor.height}};return a.colorTable=n.image.descriptor.lct&&n.image.descriptor.lct.exists?n.image.lct:this.raw.gct,n.gce&&(a.delay=(n.gce.delay||10)*10,a.disposalType=n.gce.extras.disposal,n.gce.extras.transparentColorGiven&&(a.transparentIndex=n.gce.transparentColorIndex)),t&&(a.patch=c(a)),a}return null;function o(e,t,n){var r=4096,i=-1,a=n,o,s,c,l,u,d,f,p,m,h,ee,te,g,_,ne,v,re=Array(n),ie=Array(r),y=Array(r),ae=Array(r+1);for(te=e,s=1<<te,u=s+1,o=s+2,f=i,l=te+1,c=(1<<l)-1,m=0;m<s;m++)ie[m]=0,y[m]=m;for(ee=p=g=_=v=ne=0,h=0;h<a;){if(_===0){if(p<l){ee+=t[ne]<<p,p+=8,ne++;continue}if(m=ee&c,ee>>=l,p-=l,m>o||m==u)break;if(m==s){l=te+1,c=(1<<l)-1,o=s+2,f=i;continue}if(f==i){ae[_++]=y[m],f=m,g=m;continue}for(d=m,m==o&&(ae[_++]=g,m=f);m>s;)ae[_++]=y[m],m=ie[m];g=y[m]&255,ae[_++]=g,o<r&&(ie[o]=f,y[o]=g,o++,(o&c)===0&&o<r&&(l++,c+=o)),f=d}_--,re[v++]=ae[_],h++}for(h=v;h<a;h++)re[h]=0;return re}function s(e,t){for(var n=Array(e.length),r=e.length/t,i=function(r,i){var a=e.slice(i*t,(i+1)*t);n.splice.apply(n,[r*t,t].concat(a))},a=[0,4,2,1],o=[8,8,4,2],s=0,c=0;c<4;c++)for(var l=a[c];l<r;l+=o[c])i(l,s),s++;return n}function c(e){for(var t=e.pixels.length,n=new Uint8ClampedArray(t*4),r=0;r<t;r++){var i=r*4,a=e.pixels[r],o=e.colorTable[a];n[i]=o[0],n[i+1]=o[1],n[i+2]=o[2],n[i+3]=a===e.transparentIndex?0:255}return n}},Ta.prototype.decompressFrames=function(e,t,n){t===void 0&&(t=0),n=n===void 0?this.raw.frames.length:Math.min(n,this.raw.frames.length);for(var r=[],i=t;i<n;i++)this.raw.frames[i].image&&r.push(this.decompressFrame(i,e));return r};var Ea=Ta,Da=class e{static async create(t,n){let r=await fetch(t).then(e=>e.arrayBuffer()).then(e=>new Ea(e)),i=r.decompressFrames(!0,void 0,void 0),{width:a,height:o}=r.raw.lsd;return new e(i,a,o,n)}constructor(e,t,n,r){this.frames=[],this.index=0,this.playTime=0,this.frames=e,this.canvas=document.createElement(`canvas`),this.ctx=this.canvas.getContext(`2d`),this.pixelRatio=r,this.canvas.width=t,this.canvas.height=n,this.startTime=Date.now()}getCanvas(){return this.canvas}update(){let e=Date.now()-this.startTime;for(;this.playTime<e;){let e=this.frames[this.index%this.frames.length];this.playTime+=e.delay,this.index++}let t=this.frames[this.index%this.frames.length],n=new ImageData(t.patch,t.dims.width,t.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(n,t.dims.left,t.dims.top)}},Oa=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ka,Aa,ja,Ma,Na,Pa=class{constructor(e,t=!1){this.isContextLost=!1,ka.set(this,new Set),Aa.set(this,new Set),ja.set(this,new Set),Ma.set(this,e=>{e.preventDefault(),this.isContextLost=!0;for(let e of Oa(this,Aa,`f`))e()}),Na.set(this,()=>{this.isContextLost=!1;let e=this.gl;e.getExtension(`EXT_color_buffer_float`),e.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!e.getExtension(`EXT_float_blend`);for(let e of Oa(this,ka,`f`))e.restore();for(let e of Oa(this,ja,`f`))e()});let n=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:t});if(!n)throw Error(`[VFX-JS] WebGL2 is not available.`);this.gl=n,this.canvas=e,n.getExtension(`EXT_color_buffer_float`),n.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!n.getExtension(`EXT_float_blend`),this.floatLinearFilter=!!n.getExtension(`OES_texture_float_linear`),this.maxTextureSize=n.getParameter(n.MAX_TEXTURE_SIZE),e.addEventListener(`webglcontextlost`,Oa(this,Ma,`f`),!1),e.addEventListener(`webglcontextrestored`,Oa(this,Na,`f`),!1)}setSize(e,t,n){let r=Math.floor(e*n),i=Math.floor(t*n);(this.canvas.width!==r||this.canvas.height!==i)&&(this.canvas.width=r,this.canvas.height=i)}addResource(e){Oa(this,ka,`f`).add(e)}removeResource(e){Oa(this,ka,`f`).delete(e)}onContextLost(e){return Oa(this,Aa,`f`).add(e),()=>Oa(this,Aa,`f`).delete(e)}onContextRestored(e){return Oa(this,ja,`f`).add(e),()=>Oa(this,ja,`f`).delete(e)}};ka=new WeakMap,Aa=new WeakMap,ja=new WeakMap,Ma=new WeakMap,Na=new WeakMap;var Fa=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Ia=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},La,Ra,za,Ba,Va=class{constructor(e){La.add(this),Ra.set(this,void 0),za.set(this,void 0),Fa(this,Ra,e,`f`),this.gl=e.gl,Ia(this,La,`m`,Ba).call(this),e.addResource(this)}restore(){Ia(this,La,`m`,Ba).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){Ia(this,Ra,`f`).removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(Ia(this,za,`f`))}};Ra=new WeakMap,za=new WeakMap,La=new WeakSet,Ba=function(){let e=this.gl,t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw Error(`[VFX-JS] Failed to create quad VAO`);this.vao=t,Fa(this,za,n,`f`);let r=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)};function Ha(e){return{phase:`hidden`,direction:1,enterProgress:0,leaveProgress:0,isIn:!1,wasAbove:!1,wasBelow:!1,lastTime:e}}function Ua(e,t,n,r,i){let a=r===0?n:t>=r,o=i===0?!n:t<i,s=a&&!e.wasAbove,c=o&&!e.wasBelow;if(e.wasAbove=a,e.wasBelow=o,a&&!o)return!0;if(o&&!a)return!1;if(a&&o){if(s)return!0;if(c)return!1}return e.isIn}function Wa(e,t){e.lastTime=t}function Ga(e,t,n,r){let i=n-e.lastTime;if(e.lastTime=n,e.isIn=t,Ka(e,t))return e;let a=(i<0?i:e.direction*i)/r;if(e.phase===`entering`){let t=e.enterProgress+a;a>0&&t>=1?qa(e,`shown`):a<0&&t<=0?qa(e,`hidden`):e.enterProgress=Ja(t)}else if(e.phase===`leaving`){let t=e.leaveProgress+a;a>0&&t>=1?qa(e,`hidden`):a<0&&t<=0?qa(e,`shown`):e.leaveProgress=Ja(t)}return e}function Ka(e,t){switch(e.phase){case`hidden`:return t?(e.phase=`entering`,e.direction=1,!0):!1;case`shown`:return!t&&(e.phase=`leaving`,e.direction=1,!0);case`entering`:return e.direction=t?1:-1,!1;case`leaving`:return e.direction=t?-1:1,!1}}function qa(e,t){e.phase=t,e.direction=1,e.enterProgress=+(t===`shown`),e.leaveProgress=0}function Ja(e){return Math.min(Math.max(e,0),1)}function Ya(e,t,n,r={}){return new Pn(e,t,n,{float:r.float??!1})}function Xa(e,t){let n=t.renderingToBuffer??!1,r;r=n?`none`:t.premultipliedAlpha?`premultiplied`:`normal`;let i=t.glslVersion??tr(t.fragmentShader);return new cr(e,t.vertexShader??(i===`100`?`
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
`),t.fragmentShader,t.uniforms,r,i)}var Za=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},B=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},V,Qa,$a,eo,to,no,ro=class{constructor(e,t,n,r,i,a,o,s){if(V.set(this,void 0),Qa.set(this,void 0),$a.set(this,void 0),eo.set(this,void 0),to.set(this,void 0),no.set(this,void 0),Za(this,eo,r??!1,`f`),Za(this,to,i??!1,`f`),Za(this,no,a,`f`),Za(this,Qa,{},`f`),Za(this,V,{src:{value:null},offset:{value:new Wn},resolution:{value:new Wn},viewport:{value:new Gn},time:{value:0},mouse:{value:new Wn},passIndex:{value:0}},`f`),n)for(let[e,t]of Object.entries(n))typeof t==`function`?(B(this,Qa,`f`)[e]=t,B(this,V,`f`)[e]={value:t()}):B(this,V,`f`)[e]={value:t};this.pass=Xa(e,{fragmentShader:t,uniforms:B(this,V,`f`),renderingToBuffer:o??!1,premultipliedAlpha:!0,glslVersion:s})}get uniforms(){return B(this,V,`f`)}setUniforms(e,t,n,r,i,a){B(this,V,`f`).src.value=e,B(this,V,`f`).resolution.value.set(n.w*t,n.h*t),B(this,V,`f`).offset.value.set(n.x*t,n.y*t),B(this,V,`f`).time.value=r,B(this,V,`f`).mouse.value.set(i*t,a*t)}updateCustomUniforms(e){for(let[e,t]of Object.entries(B(this,Qa,`f`)))B(this,V,`f`)[e]&&(B(this,V,`f`)[e].value=t());if(e)for(let[t,n]of Object.entries(e))B(this,V,`f`)[t]&&(B(this,V,`f`)[t].value=n())}initializeBackbuffer(e,t,n,r){B(this,eo,`f`)&&!B(this,$a,`f`)&&(B(this,no,`f`)?Za(this,$a,new Un(e,B(this,no,`f`)[0],B(this,no,`f`)[1],1,B(this,to,`f`)),`f`):Za(this,$a,new Un(e,t,n,r,B(this,to,`f`)),`f`))}resizeBackbuffer(e,t){B(this,$a,`f`)&&!B(this,no,`f`)&&B(this,$a,`f`).resize(e,t)}registerBufferUniform(e){B(this,V,`f`)[e]||(B(this,V,`f`)[e]={value:null})}get backbuffer(){return B(this,$a,`f`)}get persistent(){return B(this,eo,`f`)}get float(){return B(this,to,`f`)}get size(){return B(this,no,`f`)}dispose(){this.pass.dispose(),B(this,$a,`f`)?.dispose()}};V=new WeakMap,Qa=new WeakMap,$a=new WeakMap,eo=new WeakMap,to=new WeakMap,no=new WeakMap;var io=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},ao=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},oo,so,co=class{constructor(e){oo.set(this,void 0),so.set(this,new Map),io(this,oo,e,`f`)}get(e,t,n){let r=`${t}\0${e}\0${n??``}`,i=ao(this,so,`f`).get(r);return i||(i=new nr(ao(this,oo,`f`),e,t,n),ao(this,so,`f`).set(r,i)),i}get size(){return ao(this,so,`f`).size}dispose(){for(let e of ao(this,so,`f`).values())e.dispose();ao(this,so,`f`).clear()}};oo=new WeakMap,so=new WeakMap;var H=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},U=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},W,lo,uo,G,fo,po,mo,ho,go,K,_o,q,vo,yo,bo,xo,So,Co,J,Y,wo,To,Eo,Do,Oo,X,ko,Ao,jo,Mo,No,Po,Fo,Io,Lo,Ro,zo,Bo,Vo,Ho,Uo,Wo,Go,Ko,qo,Jo,Yo,Xo,Z,Zo,Qo,$o,es,ts,ns,rs=new Map,is=!1;function as(e,t){return e===`hic`||t===!0?null:typeof t==`number`?t.toString():e===`video`?`0.0001`:`0`}function os(e,t){let n=e.getContext(`2d`);n&&(n.clearRect(0,0,e.width,e.height),n.drawImage(t,0,0,e.width,e.height))}var ss=class{constructor(e,t){W.add(this),lo.set(this,void 0),uo.set(this,void 0),G.set(this,void 0),fo.set(this,void 0),po.set(this,void 0),mo.set(this,void 0),ho.set(this,void 0),go.set(this,[]),K.set(this,void 0),_o.set(this,new Map),q.set(this,null),vo.set(this,!1),yo.set(this,new WeakSet),bo.set(this,{}),xo.set(this,{}),So.set(this,0),Co.set(this,void 0),J.set(this,2),Y.set(this,[]),wo.set(this,new ma({showPlain:e=>{if(e.type===`hic`){let t=e.srcTexture.source;t instanceof OffscreenCanvas&&os(e.element,t)}else e.element.style.setProperty(`opacity`,e.originalOpacity.toString())},hidePlain:(e,t)=>{if(e.type===`hic`){let t=e.element;t.getContext(`2d`)?.clearRect(0,0,t.width,t.height)}else e.element.style.opacity=t},isRegistered:e=>U(this,Y,`f`).includes(e)})),To.set(this,0),Eo.set(this,1),Do.set(this,Date.now()/1e3),Oo.set(this,!1),X.set(this,ki(0)),ko.set(this,ki(0)),Ao.set(this,[0,0]),jo.set(this,0),Mo.set(this,0),No.set(this,0),Po.set(this,0),Fo.set(this,new WeakMap),Lo.set(this,async()=>{if(typeof window<`u`){for(let e of U(this,Y,`f`))if(e.type===`text`&&e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await U(this,W,`m`,zo).call(this,e),e.width=n,e.height=r)}for(let e of U(this,Y,`f`))if(e.type===`text`&&!e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await U(this,W,`m`,zo).call(this,e),e.width=n,e.height=r)}}}),Ro.set(this,e=>{typeof window<`u`&&(H(this,No,e.clientX,`f`),H(this,Po,window.innerHeight-e.clientY,`f`))}),Uo.set(this,()=>{this.isPlaying()&&(this.render(),H(this,Co,requestAnimationFrame(U(this,Uo,`f`)),`f`))}),H(this,lo,e,`f`),H(this,uo,t,`f`),H(this,G,new Pa(t,e.preserveDrawingBuffer),`f`),H(this,fo,U(this,G,`f`).gl,`f`),U(this,fo,`f`).clearColor(0,0,0,0),H(this,J,e.pixelRatio,`f`),H(this,Eo,e.timeScale,`f`),H(this,Do,Date.now()/1e3,`f`),H(this,po,new Va(U(this,G,`f`)),`f`),H(this,mo,new co(U(this,G,`f`)),`f`),typeof window<`u`&&(window.addEventListener(`resize`,U(this,Lo,`f`)),window.addEventListener(`pointermove`,U(this,Ro,`f`))),U(this,Lo,`f`).call(this),H(this,ho,new dr(U(this,G,`f`)),`f`),U(this,W,`m`,Qo).call(this,e.postEffects),U(this,G,`f`).onContextRestored(()=>{U(this,fo,`f`).clearColor(0,0,0,0)})}destroy(){this.stop(),typeof window<`u`&&(window.removeEventListener(`resize`,U(this,Lo,`f`)),window.removeEventListener(`pointermove`,U(this,Ro,`f`))),U(this,K,`f`)?.dispose();for(let e of U(this,_o,`f`).values())e?.dispose();for(let e of U(this,go,`f`))e.pass.dispose();U(this,q,`f`)&&(U(this,q,`f`).dispose(),H(this,q,null,`f`),H(this,vo,!1,`f`)),U(this,ho,`f`).dispose(),U(this,mo,`f`).dispose(),U(this,po,`f`).dispose()}async addElement(e,t={},n){if(t.effect!==void 0)return U(this,W,`m`,Vo).call(this,e,t,t.effect,n);let r=U(this,W,`m`,Ho).call(this,t),i=e.getBoundingClientRect(),o=bs(e)?ji(i):Ai(i),[s,c]=ls(t.overflow),l=Mi(o,c),u=ps(t.intersection),f=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),p,m,h=!1;if(e instanceof HTMLImageElement){m=`img`;let t=d(e);if(h=!!t.match(/\.gif/i),h){let n=await Da.create(t,U(this,J,`f`));rs.set(e,n),p=new E(U(this,G,`f`),n.getCanvas())}else{let e=await On(t);p=new E(U(this,G,`f`),e)}}else if(e instanceof HTMLVideoElement)p=new E(U(this,G,`f`),e),m=`video`;else if(e instanceof HTMLCanvasElement)a(e)&&n?(p=new E(U(this,G,`f`),n),m=`hic`):(p=new E(U(this,G,`f`),e),m=`canvas`);else{let t=await pr(e,f,void 0,this.maxTextureSize);p=new E(U(this,G,`f`),t),m=`text`}let[ee,te]=gs(t.wrap);p.wrapS=ee,p.wrapT=te,p.needsUpdate=!0;let g=t.autoCrop??!0,_=as(m,t.overlay),ne={src:{value:p},resolution:{value:new Wn},offset:{value:new Wn},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},enterProgress:{value:0},leaveProgress:{value:0},mouse:{value:new Wn},intersection:{value:0},viewport:{value:new Gn},autoCrop:{value:g}},v={};if(t.uniforms!==void 0)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(ne[e]={value:n()},v[e]=n):ne[e]={value:n};let re;t.backbuffer&&(re=(()=>{let e=(l.right-l.left)*U(this,J,`f`),t=(l.bottom-l.top)*U(this,J,`f`);return new Un(U(this,G,`f`),e,t,U(this,J,`f`),!1)})(),ne.backbuffer={value:re.texture});let ie=new Map,y=new Map;for(let e=0;e<r.length-1;e++){let t=r[e].target??`pass${e}`;r[e]={...r[e],target:t};let n=r[e].size,i=n?n[0]:(l.right-l.left)*U(this,J,`f`),a=n?n[1]:(l.bottom-l.top)*U(this,J,`f`);if(r[e].persistent){let i=n?1:U(this,J,`f`),a=n?n[0]:l.right-l.left,o=n?n[1]:l.bottom-l.top;y.set(t,new Un(U(this,G,`f`),a,o,i,r[e].float))}else ie.set(t,Ya(U(this,G,`f`),i,a,{float:r[e].float}))}let ae=[];for(let e=0;e<r.length;e++){let t=r[e],n=t.frag,i={...ne},a={};for(let[e,r]of ie)e!==t.target&&n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:r.texture});for(let[e,t]of y)n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:t.texture});if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(i[e]={value:n()},a[e]=n):i[e]={value:n};let o=Xa(U(this,G,`f`),{vertexShader:t.vert,fragmentShader:n,uniforms:i,renderingToBuffer:t.target!==void 0,glslVersion:t.glslVersion});ae.push({pass:o,uniforms:i,uniformGenerators:{...v,...a},target:t.target,persistent:t.persistent,float:t.float,size:t.size,backbuffer:t.target?y.get(t.target):void 0})}let oe=U(this,To,`f`),se={type:m,element:e,isInViewport:!1,intersectionState:Ha(oe),width:o.right-o.left,height:o.bottom-o.top,passes:ae,bufferTargets:ie,startTime:oe,enterTime:oe,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:s,overflow:c,intersection:u,originalOpacity:f,srcTexture:p,zIndex:t.zIndex??0,backbuffer:re,autoCrop:g};U(this,W,`m`,Yo).call(this,se,o,oe),U(this,W,`m`,Bo).call(this,se,_)}async updateElementEffects(e,t){let n=U(this,Y,`f`).find(t=>t.element===e);if(!n)throw Error(`[VFX-JS] updateElementEffects: element not registered`);if(!n.chain)throw Error(`[VFX-JS] updateElementEffects: element is on the shader path; effect-only updates are not supported`);let r=Array.isArray(t)?[...t]:[t],i=n.chain.effects,a=new Set(i),o=[];for(let e of r)if(!a.has(e)){if(U(this,yo,`f`).has(e))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");o.push(e)}await n.chain.replaceEffects(r);let s=new Set(r);for(let e of i)s.has(e)||U(this,yo,`f`).delete(e);for(let e of o)U(this,yo,`f`).add(e)}removeElement(e){let t=U(this,Y,`f`).findIndex(t=>t.element===e);if(t!==-1){let n=U(this,Y,`f`).splice(t,1)[0];if(n.chain)U(this,W,`m`,qo).call(this,n.chain.effects),n.chain.dispose();else{for(let e of n.bufferTargets.values())e.dispose();for(let e of n.passes)e.pass.dispose(),e.backbuffer?.dispose();n.backbuffer?.dispose()}n.srcTexture.dispose(),e.style.setProperty(`opacity`,n.originalOpacity.toString())}}updateTextElement(e){let t=U(this,Y,`f`).findIndex(t=>t.element===e);return t===-1?Promise.resolve():U(this,W,`m`,zo).call(this,U(this,Y,`f`)[t])}async updateImageElement(e){let t=U(this,Y,`f`).find(t=>t.element===e);if(t?.type!==`img`||t.isGif)return;let n=await On(d(e)),r=t.srcTexture,i=new E(U(this,G,`f`),n);i.wrapS=r.wrapS,i.wrapT=r.wrapT,i.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=i),t.srcTexture=i,r.dispose()}updateCanvasElement(e){let t=U(this,Y,`f`).find(t=>t.element===e);if(t){let n=t.srcTexture,r=new E(U(this,G,`f`),e);r.wrapS=n.wrapS,r.wrapT=n.wrapT,r.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=r),t.srcTexture=r,n.dispose()}}updateHICTexture(e,t){let n=U(this,Y,`f`).find(t=>t.element===e);if(n?.type!==`hic`)return;n.frozen&&os(e,t);let r=n.srcTexture;if(r.source===t)r.needsUpdate=!0;else{let e=new E(U(this,G,`f`),t);e.wrapS=r.wrapS,e.wrapT=r.wrapT,e.needsUpdate=!0,!n.chain&&n.passes.length>0&&(n.passes[0].uniforms.src.value=e),n.srcTexture=e,r.dispose()}}freezeInside(e){return U(this,wo,`f`).freezeInside(e,U(this,Y,`f`))}isFrozen(e){return U(this,Y,`f`).some(t=>t.element===e&&t.frozen)}forceRender(e){let t=U(this,Y,`f`).find(t=>t.element===e);return!t||t.forceRender?()=>{}:(t.forceRender=!0,()=>{t.forceRender=!1})}get maxTextureSize(){return U(this,G,`f`).maxTextureSize}isPlaying(){return U(this,Co,`f`)!==void 0}play(){this.isPlaying()||(H(this,Do,Date.now()/1e3,`f`),H(this,Co,requestAnimationFrame(U(this,Uo,`f`)),`f`))}get time(){return U(this,To,`f`)}setTime(e){H(this,To,e,`f`),H(this,Oo,!0,`f`)}get timeScale(){return U(this,Eo,`f`)}set timeScale(e){H(this,Eo,e,`f`)}stop(){U(this,Co,`f`)!==void 0&&(cancelAnimationFrame(U(this,Co,`f`)),H(this,Co,void 0,`f`))}render(){let e=Date.now()/1e3;U(this,Oo,`f`)?H(this,Oo,!1,`f`):H(this,To,U(this,To,`f`)+(e-U(this,Do,`f`))*U(this,Eo,`f`),`f`),H(this,Do,e,`f`);let t=U(this,To,`f`),n=U(this,fo,`f`);U(this,W,`m`,Io).call(this),n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,U(this,uo,`f`).width,U(this,uo,`f`).height),n.clear(n.COLOR_BUFFER_BIT);let r=U(this,X,`f`).right-U(this,X,`f`).left,i=U(this,X,`f`).bottom-U(this,X,`f`).top,a=Ln(0,0,r,i),o=U(this,W,`m`,Go).call(this);o&&(U(this,W,`m`,ns).call(this,r,i),U(this,K,`f`)&&(n.bindFramebuffer(n.FRAMEBUFFER,U(this,K,`f`).fbo),n.clear(n.COLOR_BUFFER_BIT),n.bindFramebuffer(n.FRAMEBUFFER,null)));for(let e of U(this,Y,`f`)){if(e.frozen){Wa(e.intersectionState,t);continue}let n=e.element.getBoundingClientRect(),s=e.type===`text`?ji(n):Ai(n),c=U(this,W,`m`,Yo).call(this,e,s,t);if(!c.isVisible)continue;if(e.chain){U(this,W,`m`,Wo).call(this,e,s,c,t);continue}let l=e.passes[0].uniforms;l.time.value=t-e.startTime,l.resolution.value.set((s.right-s.left)*U(this,J,`f`),(s.bottom-s.top)*U(this,J,`f`)),l.mouse.value.set((U(this,No,`f`)+U(this,jo,`f`))*U(this,J,`f`),(U(this,Po,`f`)+U(this,Mo,`f`))*U(this,J,`f`));for(let t of e.passes)for(let[e,n]of Object.entries(t.uniformGenerators))t.uniforms[e].value=n();rs.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(l.src.value.needsUpdate=!0);let u=In(s,i,U(this,jo,`f`),U(this,Mo,`f`)),d=In(c.rectWithOverflow,i,U(this,jo,`f`),U(this,Mo,`f`));e.backbuffer&&(e.passes[0].uniforms.backbuffer.value=e.backbuffer.texture);{let t=e.isFullScreen?a:d,n=Math.max(1,t.w*U(this,J,`f`)),r=Math.max(1,t.h*U(this,J,`f`)),i=Math.max(1,t.w),o=Math.max(1,t.h);for(let t=0;t<e.passes.length-1;t++){let a=e.passes[t];if(!a.size){if(a.backbuffer)a.backbuffer.resize(i,o);else{let t=e.bufferTargets.get(a.target);t&&(t.width!==n||t.height!==r)&&t.setSize(n,r)}}}}let f=new Map;for(let t of e.passes)t.backbuffer&&t.target&&f.set(t.target,t.backbuffer.texture);let p=e.srcTexture;for(let t=0;t<e.passes.length-1;t++){let r=e.passes[t],i=e.isFullScreen?a:d;r.uniforms.src.value=p;for(let[e,t]of f)r.uniforms[e]&&(r.uniforms[e].value=t);for(let[e,t]of Object.entries(r.uniformGenerators))r.uniforms[e]&&(r.uniforms[e].value=t());let o=r.size?Ln(0,0,r.size[0],r.size[1]):Ln(0,0,i.w,i.h),s=us(n,u,i,r.size,[U(this,No,`f`),U(this,Po,`f`)],[U(this,jo,`f`),U(this,Mo,`f`)],U(this,J,`f`));if(r.uniforms.resolution.value.set(...s.resolution),r.uniforms.offset.value.set(...s.offset),r.uniforms.mouse.value.set(...s.mouse),r.backbuffer)U(this,W,`m`,Z).call(this,r.pass,r.backbuffer.target,o,r.uniforms,!0),r.backbuffer.swap(),p=r.backbuffer.texture;else{let t=e.bufferTargets.get(r.target);if(!t)continue;U(this,W,`m`,Z).call(this,r.pass,t,o,r.uniforms,!0),p=t.texture}r.target&&f.set(r.target,p)}let m=e.passes[e.passes.length-1];m.uniforms.src.value=p,m.uniforms.resolution.value.set(n.width*U(this,J,`f`),n.height*U(this,J,`f`)),m.uniforms.offset.value.set(u.x*U(this,J,`f`),u.y*U(this,J,`f`)),m.uniforms.mouse.value.set((U(this,No,`f`)+U(this,jo,`f`))*U(this,J,`f`),(U(this,Po,`f`)+U(this,Mo,`f`))*U(this,J,`f`));for(let[e,t]of f)m.uniforms[e]&&(m.uniforms[e].value=t);for(let[e,t]of Object.entries(m.uniformGenerators))m.uniforms[e]&&(m.uniforms[e].value=t());e.backbuffer?(m.uniforms.backbuffer.value=e.backbuffer.texture,e.isFullScreen?(e.backbuffer.resize(r,i),U(this,W,`m`,Zo).call(this,e,u.x,u.y),U(this,W,`m`,Z).call(this,m.pass,e.backbuffer.target,a,m.uniforms,!0),e.backbuffer.swap(),U(this,ho,`f`).setUniforms(e.backbuffer.texture,U(this,J,`f`),a),U(this,W,`m`,Z).call(this,U(this,ho,`f`).pass,o&&U(this,K,`f`)||null,a,U(this,ho,`f`).uniforms,!1)):(e.backbuffer.resize(d.w,d.h),U(this,W,`m`,Zo).call(this,e,e.overflow.left,e.overflow.bottom),U(this,W,`m`,Z).call(this,m.pass,e.backbuffer.target,e.backbuffer.getViewport(),m.uniforms,!0),e.backbuffer.swap(),U(this,ho,`f`).setUniforms(e.backbuffer.texture,U(this,J,`f`),d),U(this,W,`m`,Z).call(this,U(this,ho,`f`).pass,o&&U(this,K,`f`)||null,d,U(this,ho,`f`).uniforms,!1))):(U(this,W,`m`,Zo).call(this,e,u.x,u.y),U(this,W,`m`,Z).call(this,m.pass,o&&U(this,K,`f`)||null,e.isFullScreen?a:d,m.uniforms,!1))}o&&U(this,K,`f`)&&(U(this,q,`f`)&&U(this,vo,`f`)?U(this,W,`m`,es).call(this,a,t):U(this,W,`m`,ts).call(this,a,t))}};lo=new WeakMap,uo=new WeakMap,G=new WeakMap,fo=new WeakMap,po=new WeakMap,mo=new WeakMap,ho=new WeakMap,go=new WeakMap,K=new WeakMap,_o=new WeakMap,q=new WeakMap,vo=new WeakMap,yo=new WeakMap,bo=new WeakMap,xo=new WeakMap,So=new WeakMap,Co=new WeakMap,J=new WeakMap,Y=new WeakMap,wo=new WeakMap,To=new WeakMap,Eo=new WeakMap,Do=new WeakMap,Oo=new WeakMap,X=new WeakMap,ko=new WeakMap,Ao=new WeakMap,jo=new WeakMap,Mo=new WeakMap,No=new WeakMap,Po=new WeakMap,Fo=new WeakMap,Lo=new WeakMap,Ro=new WeakMap,Uo=new WeakMap,W=new WeakSet,Io=function(){if(typeof window>`u`)return;let e=U(this,uo,`f`).ownerDocument,t=e.compatMode===`BackCompat`?e.body:e.documentElement,n=t.clientWidth,r=t.clientHeight,i=window.scrollX,a=window.scrollY,o,s;if(U(this,lo,`f`).fixedCanvas)o=0,s=0;else if(U(this,lo,`f`).wrapper)o=n*U(this,lo,`f`).scrollPadding[0],s=r*U(this,lo,`f`).scrollPadding[1];else{let t=e.body.scrollWidth-(i+n),c=e.body.scrollHeight-(a+r);o=_s(n*U(this,lo,`f`).scrollPadding[0],0,t),s=_s(r*U(this,lo,`f`).scrollPadding[1],0,c)}let c=n+o*2,l=r+s*2;(c!==U(this,Ao,`f`)[0]||l!==U(this,Ao,`f`)[1])&&(U(this,uo,`f`).style.width=`${c}px`,U(this,uo,`f`).style.height=`${l}px`,U(this,G,`f`).setSize(c,l,U(this,J,`f`)),H(this,X,ki({top:-s,left:-o,right:n+o,bottom:r+s}),`f`),H(this,ko,ki({top:0,left:0,right:n,bottom:r}),`f`),H(this,Ao,[c,l],`f`),H(this,jo,o,`f`),H(this,Mo,s,`f`)),U(this,lo,`f`).fixedCanvas||U(this,uo,`f`).style.setProperty(`transform`,`translate(${i-o}px, ${a-s}px)`)},zo=async function(e){if(!U(this,Fo,`f`).get(e.element)){U(this,Fo,`f`).set(e.element,!0);try{let t=e.srcTexture,n=t.source instanceof OffscreenCanvas?t.source:void 0,r=await pr(e.element,e.originalOpacity,n,this.maxTextureSize);if(r.width===0||r.height===0)return;let i=new E(U(this,G,`f`),r);i.wrapS=t.wrapS,i.wrapT=t.wrapT,i.needsUpdate=!0,!e.chain&&e.passes.length>0&&(e.passes[0].uniforms.src.value=i),e.srcTexture=i,t.dispose()}catch(e){console.error(e)}finally{U(this,Fo,`f`).set(e.element,!1)}}},Bo=function(e,t){!U(this,wo,`f`).adopt(e,t)&&t!==null&&e.element.style.setProperty(`opacity`,t),U(this,Y,`f`).push(e),U(this,Y,`f`).sort((e,t)=>e.zIndex-t.zIndex)},Vo=async function(e,t,n,r){t.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified; `effect` takes precedence."),t.overflow!==void 0&&console.warn("[VFX-JS] `overflow` is shader-path only and is ignored by the effect path. Use each effect's own `outputRect` (with `dims.canvasRect` for fullscreen) to control its dst rect.");let i=Array.isArray(n)?[...n]:[n];U(this,W,`m`,Ko).call(this,i);let o=e.getBoundingClientRect(),s=bs(e)?ji(o):Ai(o),[c,l]=ls(t.overflow),u=ps(t.intersection),f=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),p,m,h=!1;if(e instanceof HTMLImageElement){m=`img`;let t=d(e);if(h=!!t.match(/\.gif/i),h){let n=await Da.create(t,U(this,J,`f`));rs.set(e,n),p=new E(U(this,G,`f`),n.getCanvas())}else{let e=await On(t);p=new E(U(this,G,`f`),e)}}else if(e instanceof HTMLVideoElement)p=new E(U(this,G,`f`),e),m=`video`;else if(e instanceof HTMLCanvasElement)a(e)&&r?(p=new E(U(this,G,`f`),r),m=`hic`):(p=new E(U(this,G,`f`),e),m=`canvas`);else{let t=await pr(e,f,void 0,this.maxTextureSize);p=new E(U(this,G,`f`),t),m=`text`}let[ee,te]=gs(t.wrap);p.wrapS=ee,p.wrapT=te,p.needsUpdate=!0;let g=t.autoCrop??!0,_=as(m,t.overlay),ne=U(this,To,`f`),v={type:m,element:e,isInViewport:!1,intersectionState:Ha(ne),width:s.right-s.left,height:s.bottom-s.top,passes:[],bufferTargets:new Map,startTime:ne,enterTime:ne,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:c,overflow:l,intersection:u,originalOpacity:f,srcTexture:p,zIndex:t.zIndex??0,backbuffer:void 0,autoCrop:g,effectLastRenderTime:ne},re=Ci(()=>v.srcTexture,()=>ms(v.srcTexture,`w`),()=>ms(v.srcTexture,`h`)),ie={},y={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(y[e]=n,ie[e]=n()):ie[e]=n;v.effectUniformGenerators=y,v.effectStaticUniforms=ie;let ae={autoCrop:g,glslVersion:t.glslVersion??`300 es`},oe=new sa(U(this,G,`f`),U(this,po,`f`),U(this,J,`f`),i,ae,re,!1,U(this,mo,`f`));try{await oe.initAll()}catch(t){throw U(this,W,`m`,qo).call(this,i),p.dispose(),e.style.setProperty(`opacity`,f.toString()),t}v.chain=oe,U(this,W,`m`,Yo).call(this,v,s,ne),U(this,W,`m`,Bo).call(this,v,_)},Ho=function(e){let t=t=>t.glslVersion===void 0&&e.glslVersion!==void 0?{...t,glslVersion:e.glslVersion}:t;return Array.isArray(e.shader)?e.shader.map(t):[t({frag:U(this,W,`m`,Xo).call(this,e.shader||`uvGradient`)})]},Wo=function(e,t,n,r){let i=e.chain;if(!i)return;let a=U(this,J,`f`);rs.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(e.srcTexture.needsUpdate=!0);let o={...e.effectStaticUniforms??{}};if(e.effectUniformGenerators)for(let[t,n]of Object.entries(e.effectUniformGenerators))o[t]=n();let s=U(this,X,`f`).right-U(this,X,`f`).left,c=U(this,X,`f`).bottom-U(this,X,`f`).top,l=In(t,c,U(this,jo,`f`),U(this,Mo,`f`)),u=U(this,No,`f`)+U(this,jo,`f`)-l.x,d=U(this,Po,`f`)+U(this,Mo,`f`)-l.y,f=t.right-t.left,p=t.bottom-t.top,m=r-(e.effectLastRenderTime??r);e.effectLastRenderTime=r;let h=U(this,W,`m`,Go).call(this)&&U(this,K,`f`)?Ti(U(this,K,`f`)):null;i.run({time:r-e.startTime,deltaTime:m,mouse:[u*a,d*a],mouseViewport:[U(this,No,`f`)*a,U(this,Po,`f`)*a],intersection:n.intersection,enterTime:ys(r-e.enterTime),leaveTime:ys(r-e.leaveTime),enterProgress:n.enterProgress,leaveProgress:n.leaveProgress,resolvedUniforms:o,canvasSize:[s,c],canvasBufferSize:[s*a,c*a],elementSize:[f,p],elementBufferSize:[f*a,p*a],elementRectOnCanvasPx:{x:l.x*a,y:l.y*a,w:l.w*a,h:l.h*a},finalTarget:h,isVisible:n.isVisible})},Go=function(){return U(this,go,`f`).length>0||U(this,q,`f`)!==null&&U(this,vo,`f`)},Ko=function(e){for(let t of e)if(U(this,yo,`f`).has(t))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");for(let t of e)U(this,yo,`f`).add(t)},qo=function(e){for(let t of e)U(this,yo,`f`).delete(t)},Jo=function(e){let t=e.hitTestPadBuffer,n=U(this,J,`f`);return Di({top:t.top/n,right:t.right/n,bottom:t.bottom/n,left:t.left/n})},Yo=function(e,t,n){let r=Mi(t,e.chain?U(this,W,`m`,Jo).call(this,e.chain):e.overflow),i=e.isFullScreen||cs(U(this,ko,`f`),r),a=Mi(U(this,ko,`f`),e.intersection.rootMargin),o=Fi(a,t);ds(e,o,cs(a,t),n);let{enterProgress:s,leaveProgress:c}=e.intersectionState;e.isInViewport=i;let l=i&&n-e.leaveTime<=e.release||e.forceRender===!0&&t.right>t.left&&t.bottom>t.top;return l&&!e.chain&&e.passes.length>0&&fs(e.passes[0].uniforms,e,o,n),{isVisible:l,intersection:o,rectWithOverflow:r,enterProgress:s,leaveProgress:c}},Xo=function(e){return e in i?i[e]:e},Z=function(e,t,n,r,i){let a=U(this,fo,`f`);i&&t!==null&&t!==U(this,K,`f`)&&(a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.viewport(0,0,t.width,t.height),a.clear(a.COLOR_BUFFER_BIT));let o=r.viewport;o&&o.value instanceof Gn&&o.value.set(n.x*U(this,J,`f`),n.y*U(this,J,`f`),n.w*U(this,J,`f`),n.h*U(this,J,`f`));try{lr(a,U(this,po,`f`),e,t,n,U(this,Ao,`f`)[0],U(this,Ao,`f`)[1],U(this,J,`f`))}catch(e){console.error(e)}},Zo=function(e,t,n){let r=e.passes[0].uniforms.offset.value;r.x=t*U(this,J,`f`),r.y=n*U(this,J,`f`)},Qo=function(e){let t=e.length===1&&!(`frag`in e[0])?e[0]:null;if(t&&t.effect!==void 0){U(this,W,`m`,$o).call(this,t,t.effect);return}let n=[],r=[];for(let t of e)`frag`in t&&r.push(t);for(let e=0;e<r.length-1;e++)r[e].target||(r[e]={...r[e],target:`pass${e}`});for(let t of e){let e,r,i;if(`frag`in t)e=t.frag,r=new ro(U(this,G,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,t.size,t.target!==void 0,t.glslVersion),i=t.target;else{if(t.shader===void 0)throw Error("VFXPostEffect requires `shader` (the `effect` path is not implemented yet).");e=U(this,W,`m`,Xo).call(this,t.shader),r=new ro(U(this,G,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,void 0,!1,t.glslVersion),t.persistent&&r.registerBufferUniform(`backbuffer`),i=void 0}n.push(e);let a={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`&&(a[e]=n);U(this,go,`f`).push({pass:r,target:i,generators:a})}for(let e of r)e.target&&U(this,_o,`f`).set(e.target,void 0);let i=U(this,go,`f`).map(e=>e.target).filter(e=>e!==void 0);for(let e=0;e<U(this,go,`f`).length;e++)for(let t of i)n[e].match(RegExp(`uniform\\s+sampler2D\\s+${t}\\b`))&&U(this,go,`f`)[e].pass.registerBufferUniform(t)},$o=function(e,t){e.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified on post-effect; `effect` takes precedence.");let n=Array.isArray(t)?[...t]:[t];U(this,W,`m`,Ko).call(this,n);let r=Ci(()=>{let e=U(this,K,`f`);if(!e)throw Error(`[VFX-JS] post-effect chain active without target`);return e.texture},()=>U(this,K,`f`)?.width??0,()=>U(this,K,`f`)?.height??0),i={autoCrop:!0,glslVersion:e.glslVersion??`300 es`},a=new sa(U(this,G,`f`),U(this,po,`f`),U(this,J,`f`),n,i,r,!0,U(this,mo,`f`));if(e.uniforms)for(let[t,n]of Object.entries(e.uniforms))typeof n==`function`?(U(this,xo,`f`)[t]=n,U(this,bo,`f`)[t]=n()):U(this,bo,`f`)[t]=n;H(this,q,a,`f`),H(this,So,U(this,To,`f`),`f`),a.initAll().then(()=>{U(this,q,`f`)===a&&H(this,vo,!0,`f`)}).catch(e=>{console.error(`[VFX-JS] Post-effect init failed; post-effect disabled:`,e),U(this,q,`f`)===a&&(U(this,W,`m`,qo).call(this,U(this,q,`f`).effects),U(this,q,`f`).dispose(),H(this,q,null,`f`),H(this,vo,!1,`f`))})},es=function(e,t){let n=U(this,q,`f`);if(!n)return;let r=U(this,J,`f`),i={...U(this,bo,`f`)};for(let[e,t]of Object.entries(U(this,xo,`f`)))i[e]=t();let a=U(this,X,`f`).right-U(this,X,`f`).left,o=U(this,X,`f`).bottom-U(this,X,`f`).top,s=t-U(this,So,`f`);H(this,So,t,`f`);let c=[a,o],l=[a*r,o*r],u={x:e.x*r,y:e.y*r,w:e.w*r,h:e.h*r};n.run({time:t,deltaTime:s,mouse:[U(this,No,`f`)*r,U(this,Po,`f`)*r],mouseViewport:[U(this,No,`f`)*r,U(this,Po,`f`)*r],intersection:1,enterTime:0,leaveTime:0,enterProgress:1,leaveProgress:0,resolvedUniforms:i,canvasSize:c,canvasBufferSize:l,elementSize:c,elementBufferSize:l,elementRectOnCanvasPx:u,finalTarget:null,isVisible:!0})},ts=function(e,t){if(!U(this,K,`f`))return;let n=U(this,K,`f`).texture,r=new Map;for(let{pass:e,target:t}of U(this,go,`f`))t&&e.backbuffer&&r.set(t,e.backbuffer.texture);for(let i=0;i<U(this,go,`f`).length;i++){let{pass:a,target:o,generators:s}=U(this,go,`f`)[i],c=i===U(this,go,`f`).length-1,l=U(this,No,`f`)+U(this,jo,`f`),u=U(this,Po,`f`)+U(this,Mo,`f`),d=a.size;if(d){let[r,i]=d;a.uniforms.src.value=n,a.uniforms.resolution.value.set(r,i),a.uniforms.offset.value.set(0,0),a.uniforms.time.value=t,a.uniforms.mouse.value.set(l/e.w*r,u/e.h*i)}else a.setUniforms(n,U(this,J,`f`),e,t,l,u);a.uniforms.passIndex.value=i,a.updateCustomUniforms(s);for(let[e,t]of r){let n=a.uniforms[e];n&&(n.value=t)}if(c)a.backbuffer?(a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture),U(this,W,`m`,Z).call(this,a.pass,a.backbuffer.target,e,a.uniforms,!0),a.backbuffer.swap(),U(this,ho,`f`).setUniforms(a.backbuffer.texture,U(this,J,`f`),e),U(this,W,`m`,Z).call(this,U(this,ho,`f`).pass,null,e,U(this,ho,`f`).uniforms,!1)):U(this,W,`m`,Z).call(this,a.pass,null,e,a.uniforms,!1);else if(a.backbuffer){a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture);let t=d?Ln(0,0,d[0]/U(this,J,`f`),d[1]/U(this,J,`f`)):e;U(this,W,`m`,Z).call(this,a.pass,a.backbuffer.target,t,a.uniforms,!0),a.backbuffer.swap(),n=a.backbuffer.texture,o&&r.set(o,a.backbuffer.texture)}else{let t=o??`postEffect${i}`,s=U(this,_o,`f`).get(t),c=d?d[0]:e.w*U(this,J,`f`),l=d?d[1]:e.h*U(this,J,`f`);s&&s.width===c&&s.height===l||(s?.dispose(),s=Ya(U(this,G,`f`),c,l,{float:a.float}),U(this,_o,`f`).set(t,s));let u=d?Ln(0,0,d[0]/U(this,J,`f`),d[1]/U(this,J,`f`)):e;U(this,W,`m`,Z).call(this,a.pass,s,u,a.uniforms,!0),n=s.texture,o&&r.set(o,s.texture)}}},ns=function(e,t){let n=e*U(this,J,`f`),r=t*U(this,J,`f`);U(this,K,`f`)&&U(this,K,`f`).width===n&&U(this,K,`f`).height===r||(U(this,K,`f`)?.dispose(),H(this,K,Ya(U(this,G,`f`),n,r),`f`));for(let{pass:n}of U(this,go,`f`))n.persistent&&!n.backbuffer?n.initializeBackbuffer(U(this,G,`f`),e,t,U(this,J,`f`)):n.backbuffer&&n.resizeBackbuffer(e,t)};function cs(e,t){return t.left<=e.right&&t.right>=e.left&&t.top<=e.bottom&&t.bottom>=e.top}function ls(e){return e===!0?[!0,Oi]:e===void 0?[!1,Oi]:[!1,Di(e)]}function us(e,t,n,r,i,a,o){let s=i[0]+a[0]-n.x,c=i[1]+a[1]-n.y;return r?{resolution:[r[0],r[1]],offset:[0,0],mouse:[s/n.w*r[0],c/n.h*r[1]]}:{resolution:[e.width*o,e.height*o],offset:[(t.x-n.x)*o,(t.y-n.y)*o],mouse:[s*o,c*o]}}function ds(e,t,n,r){let i=e.intersectionState,a=i.isIn,o=e.isFullScreen||Ua(i,t,n,e.intersection.threshold,e.intersection.leaveThreshold);!a&&o&&(e.enterTime=r,e.leaveTime=1/0),a&&!o&&(e.leaveTime=r),Ga(i,o,r,e.intersection.duration)}function fs(e,t,n,r){e.intersection.value=n,e.enterTime.value=ys(r-t.enterTime),e.leaveTime.value=ys(r-t.leaveTime),e.enterProgress.value=t.intersectionState.enterProgress,e.leaveProgress.value=t.intersectionState.leaveProgress}function ps(e){let t=e?.threshold??0,n=Di(e?.rootMargin??0),r=e?.leaveThreshold??t,i=e?.duration??1;return Number.isFinite(i)&&i>0||(is||(is=!0,console.warn(`[VFX-JS] \`intersection.duration\` must be a finite number above 0, got ${i}. Using 1 instead.`)),i=1),{threshold:t,leaveThreshold:r,rootMargin:n,duration:i}}function ms(e,t){let n=e.source;if(!n)return 0;if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return t===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return t===`w`?n.videoWidth:n.videoHeight;let r=n;return t===`w`?r.width:r.height}function hs(e){return e===`repeat`?`repeat`:e===`mirror`?`mirror`:`clamp`}function gs(e){if(!e)return[`clamp`,`clamp`];if(Array.isArray(e))return[hs(e[0]),hs(e[1])];let t=hs(e);return[t,t]}function _s(e,t,n){return Math.max(t,Math.min(n,e))}var vs=1e6;function ys(e){return _s(e,-1e6,vs)}function bs(e){return!(e instanceof HTMLImageElement||e instanceof HTMLVideoElement||e instanceof HTMLCanvasElement)}function xs(){try{let e=document.createElement(`canvas`);return(e.getContext(`webgl2`)||e.getContext(`webgl`))!==null}catch{return!1}}var Ss=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Q=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Cs,$,ws,Ts,Es,Ds,Os,ks,As,js,Ms,Ns;function Ps(){if(typeof window>`u`)throw`Cannot find 'window'. VFX-JS only runs on the browser.`;if(typeof document>`u`)throw`Cannot find 'document'. VFX-JS only runs on the browser.`}function Fs(e){return{position:e?`fixed`:`absolute`,top:0,left:0,width:`0px`,height:`0px`,"z-index":9999,"pointer-events":`none`}}var Is=class e{static init(t){try{return new e(t)}catch{return null}}constructor(e={}){if(Cs.add(this),$.set(this,void 0),ws.set(this,void 0),Ts.set(this,new Map),Es.set(this,new Set),Ps(),!xs())throw Error(`[VFX-JS] WebGL is not available in this environment.`);let t=hn(e),n=document.createElement(`canvas`),r=Fs(t.fixedCanvas);for(let[e,t]of Object.entries(r))n.style.setProperty(e,t.toString());t.zIndex!==void 0&&n.style.setProperty(`z-index`,t.zIndex.toString()),(t.wrapper??document.body).appendChild(n),Ss(this,ws,n,`f`),Ss(this,$,new ss(t,n),`f`),t.autoplay&&Q(this,$,`f`).play()}async add(e,t,n){e instanceof HTMLImageElement?await Q(this,Cs,`m`,As).call(this,e,t):e instanceof HTMLVideoElement?await Q(this,Cs,`m`,js).call(this,e,t):e instanceof HTMLCanvasElement?a(e)&&n?await Q(this,Cs,`m`,ks).call(this,e,t,n):await Q(this,Cs,`m`,Ms).call(this,e,t):await Q(this,Cs,`m`,Ns).call(this,e,t)}updateHICTexture(e,t){Q(this,$,`f`).updateHICTexture(e,t)}get maxTextureSize(){return Q(this,$,`f`).maxTextureSize}get canvas(){return Q(this,ws,`f`)}addHTML(e,t){return Q(this,Cs,`m`,Ds).call(this,e,t,!1)}addHTMLWithStill(e,t){return Q(this,Cs,`m`,Ds).call(this,e,t,!0)}addTransition(e,t={}){let n=new mn(this,e,t,()=>Q(this,Es,`f`).delete(n));return Q(this,Es,`f`).add(n),n}freezeInside(e){return Q(this,$,`f`).freezeInside(e)}lockSize(e){let t=Q(this,Ts,`f`).get(e);return t?Se(t):()=>{}}forceRender(e){let t=Q(this,Ts,`f`).get(e)??e;return Q(this,$,`f`).forceRender(t)}remove(e){let t=Q(this,Ts,`f`).get(e);t?(Ae(t,e),Q(this,Ts,`f`).delete(e),Q(this,$,`f`).removeElement(t)):Q(this,$,`f`).removeElement(e)}updateEffects(e,t){let n=Q(this,Ts,`f`).get(e)??e;return Q(this,$,`f`).updateElementEffects(n,t)}async update(e){await this.updateInTime(e)}async updateInTime(e){let t=Q(this,Ts,`f`).get(e)??(e instanceof HTMLCanvasElement?e:null);return(t?xe(t):void 0)||(e instanceof HTMLImageElement?await Q(this,$,`f`).updateImageElement(e):e instanceof HTMLCanvasElement?Q(this,$,`f`).updateCanvasElement(e):await Q(this,$,`f`).updateTextElement(e),!0)}play(){Q(this,$,`f`).play()}stop(){Q(this,$,`f`).stop()}render(){Q(this,$,`f`).render()}get time(){return Q(this,$,`f`).time}setTime(e){Q(this,$,`f`).setTime(e)}get timeScale(){return Q(this,$,`f`).timeScale}set timeScale(e){Q(this,$,`f`).timeScale=e}destroy(){for(let e of Q(this,Es,`f`))e.destroy();Q(this,Es,`f`).clear();for(let[e,t]of Q(this,Ts,`f`))Ae(t,e);Q(this,Ts,`f`).clear(),Q(this,$,`f`).destroy(),Q(this,ws,`f`).remove()}};$=new WeakMap,ws=new WeakMap,Ts=new WeakMap,Es=new WeakMap,Cs=new WeakSet,Ds=async function(e,t,n){if(!Me())return console.warn(`html-in-canvas not supported, falling back to dom-to-canvas`),this.add(e,t);t.overlay!==void 0&&console.warn(`addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.`);let{overlay:r,...i}=t,a=Q(this,Ts,`f`).get(e);a&&Q(this,$,`f`).removeElement(a);let{canvas:o,initialCapture:s}=await ke(e,{onCapture:e=>{Q(this,$,`f`).updateHICTexture(o,e)},maxSize:Q(this,$,`f`).maxTextureSize,stillCover:n?{zIndex:Q(this,Cs,`m`,Os).call(this)}:void 0});a=o,Q(this,Ts,`f`).set(e,a),await Q(this,Cs,`m`,ks).call(this,a,i,s)},Os=function(){let e=Number.parseInt(Q(this,ws,`f`).style.zIndex,10);return Number.isNaN(e)?9998:e-1},ks=async function(e,t,n){try{await Q(this,$,`f`).addElement(e,t,n)}finally{we(e,Q(this,$,`f`).isFrozen(e))}},As=function(e,t){return e.complete?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`load`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},js=function(e,t){return e.readyState>=3?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`canplay`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},Ms=function(e,t){return Q(this,$,`f`).addElement(e,t)},Ns=function(e,t){return Q(this,$,`f`).addElement(e,t)};export{Is as t};
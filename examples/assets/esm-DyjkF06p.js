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
    `},i={...r,slitScanTransition:r.slitScanReveal,warpTransition:r.warpReveal,pixelateTransition:r.pixelateReveal,focusTransition:r.focusReveal};function a(e){return e.tagName===`CANVAS`&&(e.hasAttribute(`layoutsubtree`)||e.getAttribute(`content`)===`drawable`)}function o(e,t){e.setAttribute(`layoutsubtree`,``),e.setAttribute(`content`,`drawable`),t?.setAttribute(`drawable`,``)}function s(e,t,n,r){if(t.width<=0||t.height<=0)return null;let i=t.left-e.left,a=t.top-e.top;return i+t.width<=0||a+t.height<=0||i>=e.width||a>=e.height?null:[i*n,a*r,t.width*n,t.height*r]}function c(e){let t=e.getBoundingClientRect(),n=getComputedStyle(e),r=Number.parseFloat(n.paddingLeft)||0,i=Number.parseFloat(n.paddingRight)||0,a=Number.parseFloat(n.paddingTop)||0,o=Number.parseFloat(n.paddingBottom)||0,s=e.clientWidth>0?t.width/e.offsetWidth:1,c=e.clientHeight>0?t.height/e.offsetHeight:1;return{left:t.left+(e.clientLeft+r)*s,top:t.top+(e.clientTop+a)*c,width:Math.max(0,e.clientWidth-r-i)*s,height:Math.max(0,e.clientHeight-a-o)*c}}function l(e){return typeof e.checkVisibility==`function`?e.checkVisibility({visibilityProperty:!0,opacityProperty:!0}):getComputedStyle(e).visibility!==`hidden`}function u(e,t){let n=t.querySelectorAll(`canvas`);if(n.length===0)return;let r=t.getBoundingClientRect();if(r.width<=0||r.height<=0)return;let i=e.canvas.width/r.width,a=e.canvas.height/r.height;for(let t of n){if(t.width===0||t.height===0||!l(t))continue;let n=s(r,c(t),i,a);if(n)try{e.drawImage(t,...n)}catch{}}}function d(e){return e.currentSrc||e.src}function f(e,t){let n=e.getBoundingClientRect(),r=e.cloneNode(!0),i=[e,...e.querySelectorAll(`*`)],a=[r,...r.querySelectorAll(`*`)],o=[],s=[];for(let e=0;e<i.length&&e<a.length;e++){let t=i[e],n=a[e];(t.scrollTop||t.scrollLeft)&&o.push([n,t.scrollTop,t.scrollLeft]),t instanceof HTMLScriptElement?s.push([n,document.createComment(`script`)]):t instanceof HTMLCanvasElement||t instanceof HTMLVideoElement?s.push([n,h(t)]):t instanceof HTMLIFrameElement?s.push([n,ee(t)]):t instanceof HTMLInputElement&&n instanceof HTMLInputElement?(n.value=t.value,n.checked=t.checked):t instanceof HTMLTextAreaElement&&n instanceof HTMLTextAreaElement?n.value=t.value:t instanceof HTMLSelectElement&&n instanceof HTMLSelectElement?n.selectedIndex=t.selectedIndex:t instanceof HTMLMediaElement&&n.removeAttribute(`autoplay`)}for(let[e,t]of s)e.replaceWith(t);r.setAttribute(`aria-hidden`,`true`);let c=r.style;c.setProperty(`position`,`fixed`),c.setProperty(`left`,`${n.left}px`),c.setProperty(`top`,`${n.top}px`),c.setProperty(`width`,`${n.width}px`),c.setProperty(`height`,`${n.height}px`),c.setProperty(`box-sizing`,`border-box`),c.setProperty(`margin`,`0`),c.setProperty(`pointer-events`,`none`),c.setProperty(`z-index`,t.toString()),e.parentNode?.insertBefore(r,e);let l=r.getBoundingClientRect();(l.left!==n.left||l.top!==n.top)&&(c.setProperty(`left`,`${n.left*2-l.left}px`),c.setProperty(`top`,`${n.top*2-l.top}px`));for(let[e,t,n]of o)e.scrollTop=t,e.scrollLeft=n;return p(i,a),()=>{r.remove()}}function p(e,t){let n=e[0],r=t[0];if(!n||!r||typeof n.getAnimations!=`function`)return;let i=(e,t)=>{if(!(`animationName`in e))return null;let n=e.effect,r=n?.target,i=r?t.get(r):void 0;return i===void 0?null:`${i}|${n?.pseudoElement??``}|${e.animationName}`},a=new Map(t.map((e,t)=>[e,t])),o=new Map;for(let e of r.getAnimations({subtree:!0})){let t=i(e,a);t&&o.set(t,e)}let s=new Map(e.map((e,t)=>[e,t]));for(let e of n.getAnimations({subtree:!0})){let t=i(e,s),n=t&&o.get(t);n&&(n.currentTime=e.currentTime,n.pause())}}function m(e,t){let n=e.getBoundingClientRect(),r=getComputedStyle(e);t.className=e.className,t.style.cssText=e.style.cssText,t.style.width=`${n.width}px`,t.style.height=`${n.height}px`,t.style.display=r.display===`inline`?`inline-block`:r.display,t.style.boxSizing=`border-box`}function h(e){let t=document.createElement(`canvas`),n=e instanceof HTMLVideoElement?e.videoWidth:e.width,r=e instanceof HTMLVideoElement?e.videoHeight:e.height;t.width=Math.max(1,n),t.height=Math.max(1,r),m(e,t);try{t.getContext(`2d`)?.drawImage(e,0,0,t.width,t.height)}catch{}return t}function ee(e){let t=document.createElement(`div`);return m(e,t),t}function te(e){let t=d(e);if(!t||t.startsWith(`data:`))return!1;try{return new URL(t,location.href).origin!==location.origin}catch{return!1}}async function g(e){let t=await(await fetch(e)).blob();return URL.createObjectURL(t)}async function ne(e){let t=Array.from(e.querySelectorAll(`img`)).filter(e=>e.complete&&e.naturalWidth>0&&te(e));if(t.length===0)return()=>{};let n=new Map,r=[];return await Promise.all(t.map(async e=>{try{let t=d(e),i=await g(t);n.set(e,t),r.push(i),await new Promise(t=>{e.addEventListener(`load`,()=>t(),{once:!0}),e.src=i})}catch{}})),()=>{for(let[e,t]of n)e.src=t;for(let e of r)URL.revokeObjectURL(e)}}var _=[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`],v=new Set([`IMG`,`VIDEO`,`CANVAS`,`IFRAME`,`EMBED`,`OBJECT`,`INPUT`,`TEXTAREA`,`SELECT`]),re=[`position`,`top`,`right`,`bottom`,`left`,`float`,`flex`,`flex-grow`,`flex-shrink`,`flex-basis`,`align-self`,`justify-self`,`place-self`,`order`,`grid-column`,`grid-column-start`,`grid-column-end`,`grid-row`,`grid-row-start`,`grid-row-end`,`grid-area`],ie=new WeakMap,ae=new WeakMap,oe=new WeakMap,se=new WeakMap,ce=new WeakMap,le=new WeakMap,ue=new WeakMap,de=new WeakMap,fe=new WeakMap,pe=new WeakSet,me=new WeakMap,he=new WeakMap,ge=new WeakSet,_e=new WeakSet,ve=300;function ye(e,t){return new Promise(n=>{let r=t=>{clearTimeout(a),e.delete(i),n(t)},i=()=>r(!0),a=setTimeout(()=>r(!1),t);e.add(i)})}function be(e){if(e)for(let t of[...e])t()}function xe(e,t,n){if(typeof e.moveBefore==`function`)try{e.moveBefore(t,n);return}catch{}e.insertBefore(t,n)}function Se(e,t=ve){let n=he.get(e);if(!n)return;let r=ye(n,t);return e.requestPaint(),r}function Ce(e){if(ge.has(e))return()=>{};ge.add(e);let{width:t,height:n,overflow:r}=e.style,i=e.getBoundingClientRect();return e.style.setProperty(`width`,`${i.width}px`),e.style.setProperty(`height`,`${i.height}px`),e.style.setProperty(`overflow`,`hidden`),()=>{if(!ge.has(e))return;ge.delete(e),e.style.width=t,e.style.height=n,e.style.overflow=r;let i=e.firstElementChild;if(i&&!_e.has(e)){let t=Math.round(i.getBoundingClientRect().height);e.style.setProperty(`height`,`${t}px`)}}}function we(e){me.get(e)?.(),me.delete(e)}function Te(e,t=!1){requestAnimationFrame(()=>{t||e.getContext(`2d`)?.clearRect(0,0,e.width,e.height),we(e)})}async function Ee(e,t){o(e,e.firstElementChild);let n=e.getContext(`2d`);if(!n)throw Error(`Failed to get 2d context from layoutsubtree canvas`);let{onCapture:r,maxSize:i}=t,a=new Set;he.set(e,a);let s=null,c=null,l=new Promise(e=>{c=e}),d=null,f=t=>{if(t){if(t===d)return;d=t}let o=e.firstElementChild;if(!o||e.width===0||e.height===0||o.getClientRects().length===0)return;o.hasAttribute(`drawable`)||o.setAttribute(`drawable`,``),n.clearRect(0,0,e.width,e.height),n.drawElementImage(o,0,0),u(n,o);let l=e.width,f=e.height;if(i&&(l>i||f>i)){let e=Math.min(i/l,i/f);l=Math.floor(l*e),f=Math.floor(f*e)}s&&s.width===l&&s.height===f||(s=new OffscreenCanvas(l,f));let p=s.getContext(`2d`);p&&(p.clearRect(0,0,l,f),p.drawImage(e,0,0,l,f),c?(c(s),c=null,be(a)):(n.clearRect(0,0,e.width,e.height),r(s),be(a)))};e.onpaint=f,e.addEventListener(`paint`,f),ae.set(e,f);let p=new ResizeObserver(t=>{for(let n of t){let t=n.devicePixelContentBoxSize?.[0];if(t)e.width=t.inlineSize,e.height=t.blockSize;else{let t=n.borderBoxSize?.[0];if(t){let n=window.devicePixelRatio;e.width=Math.round(t.inlineSize*n),e.height=Math.round(t.blockSize*n)}}}e.requestPaint()});p.observe(e,{box:`device-pixel-content-box`}),ie.set(e,p);let m=e.firstElementChild;if(m){let t=new ResizeObserver(t=>{if(ge.has(e)||_e.has(e))return;let n=t[0].borderBoxSize?.[0];if(!n)return;let r=`${Math.round(n.blockSize)}px`;r!==e.style.height&&e.style.setProperty(`height`,r)});t.observe(m),oe.set(e,t)}return l}function De(e){e.onpaint=null,be(he.get(e)),he.delete(e);let t=ae.get(e);t&&(e.removeEventListener(`paint`,t),ae.delete(e));let n=ie.get(e);n&&(n.disconnect(),ie.delete(e));let r=oe.get(e);r&&(r.disconnect(),oe.delete(e))}function Oe(e){let t={width:null,height:null};if(typeof e.computedStyleMap!=`function`||v.has(e.tagName))return t;let n=e.computedStyleMap(),r=e=>n.get(e)?.toString()??`auto`,i=r(`position`);if(i!==`fixed`&&i!==`absolute`)return t;let a=(t,n,i)=>{let a=r(n),o=r(i);return r(t)!==`auto`||a===`auto`||o===`auto`?null:`calc(${[`100%`,a,o,...[`margin-${n}`,`margin-${i}`].map(n=>{let i=r(n);return t===`height`&&i.includes(`%`)?getComputedStyle(e).getPropertyValue(n):i}).filter(e=>e!==`auto`)].join(` - `)})`};return{width:a(`width`,`left`,`right`),height:a(`height`,`top`,`bottom`)}}function ke(e){return v.has(e.tagName)&&typeof e.computedStyleMap==`function`&&e.computedStyleMap().get(`width`)?.toString()===`auto`}async function Ae(e,t){let n=e.getBoundingClientRect(),r=Oe(e),i=document.createElement(`canvas`);e.hasAttribute(`drawable`)||pe.add(e),o(i,e),i.className=e.className;let a=e.getAttribute(`style`);a&&i.setAttribute(`style`,a),i.style.setProperty(`padding`,`0`),i.style.setProperty(`border`,`none`),i.style.setProperty(`box-sizing`,`content-box`),i.style.setProperty(`background`,`transparent`);let s=getComputedStyle(e),c=s.display===`inline`?`block`:s.display;i.style.setProperty(`display`,c);for(let e of _)i.style.setProperty(e,s.getPropertyValue(e));for(let e of re)i.style.setProperty(e,s.getPropertyValue(e));r.width?i.style.setProperty(`width`,r.width):e.style.width.endsWith(`px`)||ke(e)?i.style.setProperty(`width`,`${n.width}px`):i.style.setProperty(`width`,`100%`),r.height?(i.style.setProperty(`height`,r.height),_e.add(i)):i.style.height||i.style.setProperty(`height`,`${n.height}px`);let l=window.devicePixelRatio;i.width=Math.round(n.width*l),i.height=Math.round(n.height*l),t.stillCover&&me.set(i,f(e,t.stillCover.zIndex)),se.set(e,e.style.margin),ce.set(e,e.style.width),le.set(e,e.style.boxSizing),e.parentNode?.insertBefore(i,e),getComputedStyle(i).display,xe(i,e,null),e.style.setProperty(`margin`,`0`),e.style.setProperty(`width`,`100%`),e.style.setProperty(`box-sizing`,`border-box`),(r.width||r.height)&&(ue.set(e,e.style.position),e.style.setProperty(`position`,`static`)),r.height&&(de.set(e,e.style.height),e.style.setProperty(`height`,`100%`));let u=await ne(e);return fe.set(i,u),{canvas:i,initialCapture:await Ee(i,t)}}function je(e,t){De(e),we(e);let n=fe.get(e);n&&(n(),fe.delete(e));let r=e.parentNode;r&&xe(r,t,e),e.remove(),pe.has(t)&&(t.removeAttribute(`drawable`),pe.delete(t));let i=se.get(t);i!==void 0&&(t.style.margin=i,se.delete(t));let a=ce.get(t);a!==void 0&&(t.style.width=a,ce.delete(t));let o=le.get(t);o!==void 0&&(t.style.boxSizing=o,le.delete(t));let s=ue.get(t);s!==void 0&&(t.style.position=s,ue.delete(t));let c=de.get(t);c!==void 0&&(t.style.height=c,de.delete(t))}var Me;function Ne(){if(Me!==void 0)return Me;try{let e=document.createElement(`canvas`),t=e.getContext(`2d`);Me=t!==null&&typeof t.drawElementImage==`function`&&typeof e.requestPaint==`function`}catch{Me=!1}return Me}var Pe=`#version 300 es
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
`}},y=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},b=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Xe,Ze,Qe,$e,et,tt,nt,rt,it,at,ot,st,ct,lt,ut,dt,ft,pt=e=>e*e*(3-2*e);function mt(e,t){return typeof e==`function`?e(t):e===`linear`?t:pt(t)}var ht={t:0,x:0},gt=class{constructor(){Xe.add(this),this.enabled=!1,Ze.set(this,null),Qe.set(this,[0,0]),$e.set(this,[]),et.set(this,!1),tt.set(this,null),nt.set(this,null),rt.set(this,ht),it.set(this,null),at.set(this,null)}snapshot(){return y(this,Xe,`m`,ot).call(this),b(this,tt,null,`f`),this.enabled=!0,new Promise(e=>y(this,$e,`f`).push(e))}start(e){return y(this,Xe,`m`,ot).call(this),b(this,tt,e,`f`),b(this,at,e.onEnd??null,`f`),b(this,nt,null,`f`),b(this,rt,ht,`f`),b(this,et,!1,`f`),this.enabled=!1,new Promise(e=>{b(this,it,e,`f`)})}cancel(){y(this,Xe,`m`,ot).call(this),b(this,tt,null,`f`),b(this,et,!1,`f`),this.enabled=!1,y(this,Xe,`m`,st).call(this)}get frame(){let e=y(this,Ze,`f`);return!e||!y(this,et,`f`)&&!y(this,tt,`f`)?null:{from:e,progress:y(this,rt,`f`),holding:y(this,tt,`f`)===null}}cut(){y(this,tt,`f`)&&(b(this,tt,null,`f`),y(this,Xe,`m`,ot).call(this))}update(e){let t=y(this,tt,`f`);if(!t)return;y(this,nt,`f`)===null&&b(this,nt,e.time,`f`);let n=(e.time-y(this,nt,`f`))/t.duration;if(n>=1){b(this,tt,null,`f`),y(this,Xe,`m`,ot).call(this);return}let r=Math.max(n,0);b(this,rt,{t:mt(t.ease,r),x:r},`f`)}render(e){y(this,$e,`f`).length>0&&(e.blit(e.src,y(this,Xe,`m`,ct).call(this,e)),b(this,et,!0,`f`),y(this,Xe,`m`,st).call(this)),y(this,Ze,`f`)&&y(this,et,`f`)?e.blit(y(this,Ze,`f`)):(this.enabled=!1,e.blit(e.src))}dispose(){b(this,Ze,null,`f`),b(this,Qe,[0,0],`f`),y(this,Xe,`m`,ot).call(this),y(this,Xe,`m`,st).call(this)}};Ze=new WeakMap,Qe=new WeakMap,$e=new WeakMap,et=new WeakMap,tt=new WeakMap,nt=new WeakMap,rt=new WeakMap,it=new WeakMap,at=new WeakMap,Xe=new WeakSet,ot=function(){let e=y(this,at,`f`);b(this,at,null,`f`),e?.();let t=y(this,it,`f`);b(this,it,null,`f`),t?.()},st=function(){let e=y(this,$e,`f`);b(this,$e,[],`f`);for(let t of e)t()},ct=function(e){let[t,n]=e.dims.elementPixel;return y(this,Ze,`f`)&&y(this,Qe,`f`)[0]===t&&y(this,Qe,`f`)[1]===n||(y(this,Ze,`f`)?.dispose(),b(this,Ze,e.createRenderTarget({size:[t,n]}),`f`),b(this,Qe,[t,n],`f`)),y(this,Ze,`f`)};var _t=class{constructor(e,t){lt.add(this),ut.set(this,void 0),dt.set(this,null),this.effect=e,b(this,ut,t,`f`)}get enabled(){return y(this,dt,`f`)!==null&&typeof this.effect.render==`function`&&this.effect.enabled!==!1}start(e){b(this,dt,e,`f`),this.effect.start?.(e)}end(){y(this,dt,`f`)!==null&&(b(this,dt,null,`f`),this.effect.end?.())}init(e){return this.effect.init?.(e)}update(e){let t=y(this,ut,`f`).frame;if(!t||t.holding)return;let n=y(this,lt,`m`,ft).call(this,e);n&&this.effect.update?.(n)}render(e){let t=y(this,lt,`m`,ft).call(this,e);t&&this.effect.render?this.effect.render(t):e.blit(e.src)}outputRect(e){return y(this,dt,`f`)?this.effect.outputRect?.(e):void 0}dispose(){this.effect.dispose?.()}};ut=new WeakMap,dt=new WeakMap,lt=new WeakSet,ft=function(e){let t=y(this,ut,`f`).frame,n=y(this,dt,`f`);return!t||!n?null:{...e,from:t.from,progress:t.progress,holding:t.holding,reverse:n.reverse,run:n,cut:()=>y(this,ut,`f`).cut()}};function vt(){let e=globalThis.navigation?.currentEntry;if(!(!e||e.index<0||!e.key))return{index:e.index,key:e.key}}function yt(e=vt){let t=new Map,n;return{pick(r){let i=e();if(!i)return r;let a=n??i;n=i;let o=t.get(a.key);if(i.index<a.index&&o)return{...o,reverse:!0};let s=t.get(i.key);return i.index>a.index&&s?s:(t.set(i.key,r),r)}}}var bt=yt();function xt(e,t){let n=0,r;e?.addEventListener(`navigate`,e=>{let t=e;if(t.navigationType===`replace`)return;let i=t.hasUAVisualTransition&&t.destination?.key;r=i?{id:++n,key:i}:void 0}),!e&&t&&t.addEventListener(`popstate`,e=>{r=e.hasUAVisualTransition?{id:++n,href:t.location.href}:void 0},!0);let i=()=>{r=void 0};return t?.addEventListener(`pointerdown`,i,!0),t?.addEventListener(`keydown`,i,!0),{current(){if(r)return(r.key?e?.currentEntry?.key===r.key:t?.location.href===r.href)?r.id:void 0}}}var St;function Ct(){return St??=xt(globalThis.navigation,typeof window>`u`?void 0:window),St}var x=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},S=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},C,wt,w,Tt,Et,Dt,Ot,kt,At,jt,Mt,Nt,Pt,Ft,It,Lt,Rt,zt,Bt,Vt,Ht,Ut,Wt,Gt,Kt,qt,Jt,Yt,Xt,Zt,Qt,$t,en,tn,nn,rn,an,on,sn,cn,ln,un=.6,dn=300,fn=1e3;function pn(e,t){let n=t.transition===void 0?e.params===void 0&&t.params===void 0?void 0:{...e.params,...t.params}:t.params;return{transition:t.transition??e.transition,params:n,reverse:t.reverse??e.reverse,duration:t.duration??e.duration,overflow:t.overflow??e.overflow,ease:t.ease??e.ease}}function mn(e,t={}){let n=pn(e,t);return{transition:n.transition??Ye,params:n.params,reverse:n.reverse??!1,duration:n.duration??un,overflow:n.overflow,ease:n.ease}}var hn=e=>typeof e==`function`;function gn(e,t){return Array.isArray(e)&&Array.isArray(t)?e.length===t.length&&e.every((e,n)=>e===t[n]):e===t}function _n(e,t){let n=e??{},r=t??{},i=Object.keys(n);return i.length===Object.keys(r).length&&i.every(e=>e in r&&gn(n[e],r[e]))}var vn=new WeakMap;function yn(e){let t=e.getBoundingClientRect();return t.right>0&&t.bottom>0&&t.left<window.innerWidth&&t.top<window.innerHeight}function bn(e){return e.tagName===`IMG`?e.loading===`lazy`&&!yn(e):e.preload===`none`}function xn(e,t,n=dn){let r=[];for(let t of e.querySelectorAll(`img, video`)){let e=t.tagName===`IMG`;!(e?t.complete:t.readyState>=2)&&!bn(t)&&r.push(new Promise(n=>{let r=()=>n();t.addEventListener(e?`load`:`loadeddata`,r,{once:!0}),t.addEventListener(`error`,r,{once:!0})}))}return t&&r.push(t),r.length===0?Promise.resolve():new Promise(e=>{let t=setTimeout(e,n),i=()=>{clearTimeout(t),e()};Promise.all(r).then(i,i)})}function Sn(e,t){return new Promise((n,r)=>{let i=setTimeout(()=>n(!1),t);e.then(()=>{clearTimeout(i),n(!0)},e=>{clearTimeout(i),r(e)})})}var Cn=()=>new Promise(e=>requestAnimationFrame(()=>e()));function wn(e,t){return e.length===t.length&&e.every((e,n)=>e===t[n])}var Tn=class{constructor(e,t,n={},r,i=new gt,a=bt,o=Ct()){C.add(this),wt.set(this,void 0),w.set(this,void 0),Tt.set(this,void 0),Et.set(this,void 0),Dt.set(this,void 0),Ot.set(this,void 0),kt.set(this,void 0),At.set(this,void 0),jt.set(this,void 0),Mt.set(this,[]),Nt.set(this,[]),Pt.set(this,!1),Ft.set(this,!1),It.set(this,!1),Lt.set(this,0),Rt.set(this,null),zt.set(this,!1),Bt.set(this,!1),Vt.set(this,null),Ht.set(this,[]),Ut.set(this,null),Wt.set(this,null),Gt.set(this,null),x(this,jt,r,`f`),x(this,wt,e,`f`),x(this,w,t,`f`),x(this,Tt,n,`f`),x(this,Et,i,`f`),x(this,Dt,a,`f`),x(this,Ot,o,`f`),x(this,At,n.keepWrapped??!1,`f`)}get running(){return S(this,Rt,`f`)!==null}show(e,t={}){let n=S(this,C,`m`,Kt).call(this,e),{remove:r=!1,...i}=t;if(!this.running&&S(this,C,`m`,qt).call(this,n))return Promise.resolve();let a=S(this,Tt,`f`).slideSpec?.(n),o=a?pn(a,i):i;return S(this,C,`m`,Jt).call(this,()=>{n.parentElement!==S(this,w,`f`)&&S(this,w,`f`).append(n);for(let e of Array.from(S(this,w,`f`).children))e!==n&&(r?e.remove():e.hidden=!0);n.hidden=!1},o)}run(e,t={}){let n=S(this,zt,`f`)?void 0:S(this,Ot,`f`).current();return n!==void 0&&n!==S(this,kt,`f`)?(x(this,kt,n,`f`),S(this,C,`m`,Jt).call(this,async()=>{await e();let n=typeof t==`function`?t():t;S(this,Tt,`f`).autoReverse&&S(this,Dt,`f`).pick(n)},{duration:0})):S(this,Tt,`f`).autoReverse?S(this,C,`m`,Jt).call(this,e,()=>S(this,Dt,`f`).pick(typeof t==`function`?t():t)):S(this,C,`m`,Jt).call(this,e,t)}cancel(){var e;let t=x(this,Lt,(e=S(this,Lt,`f`),++e),`f`);x(this,Rt,null,`f`),S(this,C,`m`,on).call(this),S(this,Et,`f`).cancel(),S(this,C,`m`,rn).call(this),S(this,C,`m`,nn).call(this),S(this,C,`m`,Qt).call(this),S(this,C,`m`,cn).call(this,t)}destroy(){S(this,zt,`f`)||(x(this,zt,!0,`f`),this.cancel(),x(this,Ut,null,`f`),S(this,jt,`f`)?.call(this))}};wt=new WeakMap,w=new WeakMap,Tt=new WeakMap,Et=new WeakMap,Dt=new WeakMap,Ot=new WeakMap,kt=new WeakMap,At=new WeakMap,jt=new WeakMap,Mt=new WeakMap,Nt=new WeakMap,Pt=new WeakMap,Ft=new WeakMap,It=new WeakMap,Lt=new WeakMap,Rt=new WeakMap,zt=new WeakMap,Bt=new WeakMap,Vt=new WeakMap,Ht=new WeakMap,Ut=new WeakMap,Wt=new WeakMap,Gt=new WeakMap,C=new WeakSet,Kt=function(e){let t=S(this,w,`f`),n=typeof e==`number`?t.children[e]:typeof e==`string`?t.querySelector(e):e;if(!n)throw TypeError(`[VFX-JS] show(): no slide for ${e}.`);if(n.parentElement!==t&&(n.isConnected||t.contains(n)))throw TypeError(`[VFX-JS] show(): the slide must be a direct child of the container.`);return n},qt=function(e){return e.parentElement!==S(this,w,`f`)||e.hidden?!1:Array.from(S(this,w,`f`).children).every(t=>t===e||t.hidden)},Jt=async function(e,t){var n;if(S(this,zt,`f`)){await e();return}let r=x(this,Lt,(n=S(this,Lt,`f`),++n),`f`);x(this,Rt,r,`f`);try{await S(this,C,`m`,Yt).call(this,r,e,t)}finally{S(this,Rt,`f`)===r&&x(this,Rt,null,`f`),S(this,Lt,`f`)===r&&(S(this,C,`m`,rn).call(this),S(this,C,`m`,nn).call(this),S(this,C,`m`,Qt).call(this))}},Yt=async function(e,t,n){let r=()=>e===S(this,Lt,`f`),i=!1,a=async()=>{i||(i=!0,await t())},o=async()=>{S(this,C,`m`,on).call(this),S(this,Et,`f`).cancel(),await a(),r()&&(S(this,Bt,`f`)&&S(this,At,`f`)&&await S(this,wt,`f`).update(S(this,w,`f`)),S(this,C,`m`,cn).call(this,e))},s=null;if(typeof n!=`function`){if(s=S(this,C,`m`,Xt).call(this,mn(S(this,Tt,`f`),n)),!r())return a();if(s===null)return o()}S(this,C,`m`,tn).call(this);try{await S(this,C,`m`,sn).call(this,s?.slots??null,r,!0)}catch(e){return console.error(`[VFX-JS] transition failed to wrap the element; cutting to the new content.`,e),a()}if(!r())return a();S(this,Nt,`f`).push(S(this,wt,`f`).lockSize(S(this,w,`f`))),S(this,Nt,`f`).push(S(this,wt,`f`).forceRender(S(this,w,`f`)));let c=await Sn(S(this,Et,`f`).snapshot(),fn);if(!r())return a();if(!c){S(this,C,`m`,en).call(this),await a(),r()&&S(this,C,`m`,cn).call(this,e);return}s&&S(this,C,`m`,$t).call(this,e,s);let l;try{await a(),typeof n==`function`&&r()&&(l=n())}catch(t){throw r()&&(S(this,C,`m`,on).call(this),S(this,Et,`f`).cancel(),S(this,C,`m`,cn).call(this,e)),t}if(!r())return;if(s===null){if(s=S(this,C,`m`,Xt).call(this,mn(S(this,Tt,`f`),l)),!r())return;if(s===null)return o();try{await S(this,C,`m`,sn).call(this,s.slots,r,!1)}catch(e){return console.error(`[VFX-JS] transition failed to swap the effects; cutting to the new content.`,e),o()}if(!r())return;S(this,C,`m`,$t).call(this,e,s)}S(this,C,`m`,tn).call(this);try{await S(this,C,`m`,ln).call(this)}catch(e){console.error(`[VFX-JS] transition waitFor failed:`,e)}if(!r()||(!await S(this,wt,`f`).updateInTime(S(this,w,`f`))&&!S(this,Ft,`f`)&&(x(this,Ft,!0,`f`),console.warn(`[VFX-JS] transition: the new content was not captured in time; it may pop in during the run.`)),!r())||(await Cn(),!r()))return;let u=await Sn(S(this,Et,`f`).start({duration:s.run.duration,ease:s.ease,onEnd:()=>S(this,C,`m`,on).call(this,e)}),s.run.duration*1e3+fn);r()&&(u||S(this,C,`m`,en).call(this),S(this,C,`m`,cn).call(this,e))},Xt=function(e){if(e.duration<=0)return null;let t=e.transition;if(!hn(t)&&!S(this,C,`m`,Zt).call(this,t))return null;let n,r;try{({transition:n,slots:r}=S(this,C,`m`,an).call(this,t,e.params))}catch(e){return console.error(`[VFX-JS] transition "${t.name}" constructor failed; cutting to the new content.`,e),null}let i={reverse:e.reverse,duration:e.duration},a=e.overflow??n.overflow;return a!==void 0&&(i.overflow=a),{run:i,ease:e.ease??n.ease??`smoothstep`,slots:r}},Zt=function(e){let t=vn.get(e);return t&&t!==this?(S(this,It,`f`)||(x(this,It,!0,`f`),console.warn(`[VFX-JS] transition "${e.name??`unnamed`}" instance is running in another container; cutting to the new content. Pass the class to share it.`)),!1):(S(this,Wt,`f`)!==e&&S(this,C,`m`,Qt).call(this),vn.set(e,this),x(this,Wt,e,`f`),!0)},Qt=function(){let e=S(this,Wt,`f`);x(this,Wt,null,`f`),e&&vn.get(e)===this&&vn.delete(e)},$t=function(e,{run:t,slots:n}){S(this,C,`m`,on).call(this),x(this,Gt,{id:e,slots:n},`f`);for(let e of n)e.start(t)},en=function(){S(this,Pt,`f`)||(x(this,Pt,!0,`f`),console.warn(`[VFX-JS] transition target did not render in time; cutting to the new content.`)),S(this,C,`m`,on).call(this),S(this,Et,`f`).cancel()},tn=function(){S(this,Mt,`f`).push(S(this,wt,`f`).freezeInside(S(this,w,`f`)))},nn=function(){let e=S(this,Nt,`f`);x(this,Nt,[],`f`);for(let t of e)t()},rn=function(){let e=S(this,Mt,`f`);x(this,Mt,[],`f`);for(let t of e)t()},an=function(e,t){let n=S(this,Ut,`f`);if(n?.key.source===e&&(!hn(e)||_n(n.key.params,t)))return n;let r=hn(e)?new e(t):e,i=[new _t(r,S(this,Et,`f`))];return x(this,Ut,{key:{source:e,params:t},transition:r,slots:i},`f`),{transition:r,slots:i}},on=function(e){let t=S(this,Gt,`f`);if(t&&(e===void 0||t.id===e)){x(this,Gt,null,`f`);for(let e of t.slots)e.end()}},sn=async function(e,t,n){if(S(this,Vt,`f`)&&await S(this,Vt,`f`),!t())return;let r=e===null?S(this,Bt,`f`)?S(this,Ht,`f`):[S(this,Et,`f`)]:[S(this,Et,`f`),...e];if(S(this,Bt,`f`)){if(!wn(r,S(this,Ht,`f`))){x(this,Ht,r,`f`);let e=S(this,wt,`f`).updateEffects(S(this,w,`f`),r).finally(()=>{x(this,Vt,null,`f`)});x(this,Vt,e,`f`),await e}n&&await S(this,wt,`f`).update(S(this,w,`f`))}else{let e=S(this,wt,`f`).addHTMLWithStill(S(this,w,`f`),{effect:r}).then(()=>{x(this,Bt,!0,`f`),x(this,Ht,r,`f`)}).finally(()=>{x(this,Vt,null,`f`)});x(this,Vt,e,`f`),await e}},cn=function(e){if(S(this,At,`f`)&&!S(this,zt,`f`))return;let t=()=>{e===S(this,Lt,`f`)&&S(this,Bt,`f`)&&(x(this,Bt,!1,`f`),x(this,Ht,[],`f`),S(this,wt,`f`).remove(S(this,w,`f`)))};S(this,Vt,`f`)?S(this,Vt,`f`).then(t,()=>{}):t()},ln=function(){let e=S(this,Tt,`f`).waitFor??`media`;return e===`none`?Promise.resolve():e===`media`?xn(S(this,w,`f`),document.fonts?.ready):e(S(this,w,`f`))};function En(e){let t=typeof window<`u`?window.devicePixelRatio:1,n;n=e.scrollPadding===void 0?[.1,.1]:e.scrollPadding===!1?[0,0]:Array.isArray(e.scrollPadding)?[e.scrollPadding[0]??.1,e.scrollPadding[1]??.1]:[e.scrollPadding,e.scrollPadding];let r;return r=e.postEffect===void 0?[]:Array.isArray(e.postEffect)?e.postEffect:[e.postEffect],{pixelRatio:e.pixelRatio??t,zIndex:e.zIndex??void 0,autoplay:e.autoplay??!0,fixedCanvas:e.scrollPadding===!1,scrollPadding:n,wrapper:e.wrapper,postEffects:r,preserveDrawingBuffer:e.preserveDrawingBuffer??!1,timeScale:e.timeScale??1}}var Dn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},On=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},kn,An,jn,Mn,Nn,Pn,Fn,In,T=class{constructor(e,t,n){kn.add(this),this.wrapS=`clamp`,this.wrapT=`clamp`,this.minFilter=`linear`,this.magFilter=`linear`,this.needsUpdate=!0,this.source=null,An.set(this,void 0),jn.set(this,!1),Mn.set(this,void 0),Nn.set(this,void 0),Dn(this,An,e,`f`),this.gl=e.gl;let r=n?.externalHandle;Dn(this,Nn,r!==void 0,`f`),r===void 0?On(this,kn,`m`,Pn).call(this):(this.texture=r,Dn(this,jn,!0,`f`),this.needsUpdate=!1),t&&(this.source=t),Dn(this,Mn,n?.autoRegister!==!1&&!On(this,Nn,`f`),`f`),On(this,Mn,`f`)&&e.addResource(this)}restore(){On(this,Nn,`f`)||(On(this,kn,`m`,Pn).call(this),Dn(this,jn,!1,`f`),this.needsUpdate=!0)}bind(e){let t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&=(On(this,kn,`m`,Fn).call(this),!1)}dispose(){On(this,Mn,`f`)&&On(this,An,`f`).removeResource(this),On(this,Nn,`f`)||this.gl.deleteTexture(this.texture)}};An=new WeakMap,jn=new WeakMap,Mn=new WeakMap,Nn=new WeakMap,kn=new WeakSet,Pn=function(){let e=this.gl.createTexture();if(!e)throw Error(`[VFX-JS] Failed to create texture`);this.texture=e},Fn=function(){let e=this.gl,t=this.source;if(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4),t)try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)}catch(e){console.error(e)}else if(!On(this,jn,`f`)){let t=new Uint8Array([0,0,0,0]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,t)}On(this,kn,`m`,In).call(this),Dn(this,jn,!0,`f`)},In=function(){let e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,Ln(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,Ln(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,Rn(e,this.minFilter)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,Rn(e,this.magFilter))};function Ln(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function Rn(e,t){return t===`nearest`?e.NEAREST:e.LINEAR}function zn(e){return new Promise((t,n)=>{let r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>t(r),r.onerror=n,r.src=e})}var Bn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Vn=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Hn,Un,Wn,Gn=class{constructor(e,t,n,r={}){Hn.add(this),Un.set(this,void 0),Bn(this,Un,e,`f`),this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(n)),this.float=r.float??!1,this.mipmap=r.mipmap??!1,this.texture=new T(e,void 0,{autoRegister:!1});let i=r.wrap;i!==void 0&&(typeof i==`string`?(this.texture.wrapS=i,this.texture.wrapT=i):(this.texture.wrapS=i[0],this.texture.wrapT=i[1])),r.filter!==void 0&&(this.texture.minFilter=r.filter,this.texture.magFilter=r.filter),Vn(this,Hn,`m`,Wn).call(this),e.addResource(this)}setSize(e,t){let n=Math.max(1,Math.floor(e)),r=Math.max(1,Math.floor(t));(n!==this.width||r!==this.height)&&(this.width=n,this.height=r,Vn(this,Hn,`m`,Wn).call(this))}restore(){this.texture.restore(),Vn(this,Hn,`m`,Wn).call(this)}dispose(){Vn(this,Un,`f`).removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.texture.dispose()}generateMipmaps(){if(!this.mipmap)return;let e=this.gl;e.bindTexture(e.TEXTURE_2D,this.texture.texture),e.generateMipmap(e.TEXTURE_2D),e.bindTexture(e.TEXTURE_2D,null)}};Un=new WeakMap,Hn=new WeakSet,Wn=function(){let e=this.gl,t=this.fbo,n=e.createFramebuffer();if(!n)throw Error(`[VFX-JS] Failed to create framebuffer`);this.fbo=n;let r=this.texture.texture;e.bindTexture(e.TEXTURE_2D,r);let i=Vn(this,Un,`f`).floatLinearFilter;if(this.float&&i&&!Vn(this,Un,`f`).floatBlend)throw Error(`[VFX-JS] EXT_float_blend is not supported.`);let a=this.float?i?e.RGBA32F:e.RGBA16F:e.RGBA8,o=this.float?i?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;if(this.mipmap){let t=Math.floor(Math.log2(Math.max(this.width,this.height)))+1,n=this.width,r=this.height;for(let i=0;i<t;i++)e.texImage2D(e.TEXTURE_2D,i,a,n,r,0,e.RGBA,o,null),n=Math.max(1,n>>1),r=Math.max(1,r>>1)}else e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,e.RGBA,o,null);let s=this.texture.minFilter===`nearest`?e.NEAREST:e.LINEAR,c=this.texture.magFilter===`nearest`?e.NEAREST:e.LINEAR,l=this.mipmap?this.texture.minFilter===`nearest`?e.NEAREST_MIPMAP_NEAREST:e.LINEAR_MIPMAP_LINEAR:s,u=Kn(e,this.texture.wrapS),d=Kn(e,this.texture.wrapT);e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,l),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,c),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,u),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,d),e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.texture.needsUpdate=!1,this.texture.source=null,t&&e.deleteFramebuffer(t)};function Kn(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function qn(e,t,n,r){return{x:e.left+n,y:t-r-e.bottom,w:e.right-e.left,h:e.bottom-e.top}}function Jn(e,t,n,r){return{x:e,y:t,w:n,h:r}}var Yn=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},E=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Xn,Zn,Qn,$n,er=class{constructor(e,t,n,r,i,a={}){Xn.set(this,void 0),Zn.set(this,void 0),Qn.set(this,void 0),$n.set(this,void 0),Yn(this,Xn,t,`f`),Yn(this,Zn,n,`f`),Yn(this,Qn,r,`f`);let o=t*r,s=n*r,c={float:i,wrap:a.wrap,filter:a.filter,mipmap:a.mipmap};Yn(this,$n,[new Gn(e,o,s,c),new Gn(e,o,s,c)],`f`)}get texture(){return E(this,$n,`f`)[0].texture}get target(){return E(this,$n,`f`)[1]}resize(e,t){if(e===E(this,Xn,`f`)&&t===E(this,Zn,`f`))return;Yn(this,Xn,e,`f`),Yn(this,Zn,t,`f`);let n=e*E(this,Qn,`f`),r=t*E(this,Qn,`f`);E(this,$n,`f`)[0].setSize(n,r),E(this,$n,`f`)[1].setSize(n,r)}swap(){Yn(this,$n,[E(this,$n,`f`)[1],E(this,$n,`f`)[0]],`f`)}getViewport(){return Jn(0,0,E(this,Xn,`f`),E(this,Zn,`f`))}dispose(){E(this,$n,`f`)[0].dispose(),E(this,$n,`f`)[1].dispose()}};Xn=new WeakMap,Zn=new WeakMap,Qn=new WeakMap,$n=new WeakMap;var tr=class{constructor(e=0,t=0){this.x=0,this.y=0,this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}},nr=class{constructor(e=0,t=0,n=0,r=0){this.x=0,this.y=0,this.z=0,this.w=0,this.x=e,this.y=t,this.z=n,this.w=r}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}},rr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},ir=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ar,or,sr,cr,lr,ur,dr;function fr(e){return/#version\s+300\s+es\b/.test(e)?`300 es`:/#version\s+100\b/.test(e)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(e)?`100`:`300 es`}var pr=class{constructor(e,t,n,r){ar.add(this),or.set(this,void 0),sr.set(this,void 0),cr.set(this,void 0),lr.set(this,void 0),ur.set(this,new Map),rr(this,or,e,`f`),this.gl=e.gl,rr(this,sr,t,`f`),rr(this,cr,n,`f`),rr(this,lr,r??fr(n),`f`),ir(this,ar,`m`,dr).call(this),e.addResource(this)}restore(){ir(this,ar,`m`,dr).call(this)}use(){this.gl.useProgram(this.program)}hasUniform(e){return ir(this,ur,`f`).has(e)}uploadUniforms(e){let t=this.gl,n=0;for(let[r,i]of ir(this,ur,`f`)){let a=e[r];if(!a)continue;let o=a.value;o!=null&&(gr(i.type)?o instanceof T&&(o.bind(n),t.uniform1i(i.location,n),n++):o instanceof T||vr(t,i,o))}}dispose(){ir(this,or,`f`).removeResource(this),this.gl.deleteProgram(this.program)}};or=new WeakMap,sr=new WeakMap,cr=new WeakMap,lr=new WeakMap,ur=new WeakMap,ar=new WeakSet,dr=function(){let e=this.gl,t=mr(e,e.VERTEX_SHADER,hr(ir(this,sr,`f`),ir(this,lr,`f`))),n=mr(e,e.FRAGMENT_SHADER,hr(ir(this,cr,`f`),ir(this,lr,`f`))),r=e.createProgram();if(!r)throw Error(`[VFX-JS] Failed to create program`);if(e.attachShader(r,t),e.attachShader(r,n),e.bindAttribLocation(r,0,`position`),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let i=e.getProgramInfoLog(r)??``;throw e.deleteShader(t),e.deleteShader(n),e.deleteProgram(r),Error(`[VFX-JS] Program link failed: ${i}`)}e.detachShader(r,t),e.detachShader(r,n),e.deleteShader(t),e.deleteShader(n),this.program=r,ir(this,ur,`f`).clear();let i=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<i;t++){let n=e.getActiveUniform(r,t);if(!n)continue;let i=n.name.replace(/\[0\]$/,``),a=e.getUniformLocation(r,n.name);a&&ir(this,ur,`f`).set(i,{location:a,type:n.type,size:n.size})}};function mr(e,t,n){let r=e.createShader(t);if(!r)throw Error(`[VFX-JS] Failed to create shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)??``;throw e.deleteShader(r),Error(`[VFX-JS] Shader compile failed: ${t}\n\n${n}`)}return r}function hr(e,t){return e.replace(/^\s+/,``).startsWith(`#version`)||t===`100`?e:`#version 300 es\n${e}`}function gr(e){return e===35678||e===36298||e===36306||e===35682}var _r=new Set;function vr(e,t,n){let r=t.location,i=t.size>1,a=n,o=n,s=n;switch(t.type){case e.FLOAT:i?e.uniform1fv(r,a):e.uniform1f(r,n);return;case e.FLOAT_VEC2:if(i)e.uniform2fv(r,a);else if(n instanceof tr)e.uniform2f(r,n.x,n.y);else{let t=n;e.uniform2f(r,t[0],t[1])}return;case e.FLOAT_VEC3:if(i)e.uniform3fv(r,a);else{let t=n;e.uniform3f(r,t[0],t[1],t[2])}return;case e.FLOAT_VEC4:if(i)e.uniform4fv(r,a);else if(n instanceof nr)e.uniform4f(r,n.x,n.y,n.z,n.w);else{let t=n;e.uniform4f(r,t[0],t[1],t[2],t[3])}return;case e.INT:i?e.uniform1iv(r,o):e.uniform1i(r,n);return;case e.INT_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,t[0],t[1])}return;case e.INT_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,t[0],t[1],t[2])}return;case e.INT_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,t[0],t[1],t[2],t[3])}return;case e.BOOL:i?e.uniform1iv(r,o):e.uniform1i(r,+!!n);return;case e.BOOL_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,+!!t[0],+!!t[1])}return;case e.BOOL_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,+!!t[0],+!!t[1],+!!t[2])}return;case e.BOOL_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,+!!t[0],+!!t[1],+!!t[2],+!!t[3])}return;case e.FLOAT_MAT2:e.uniformMatrix2fv(r,!1,a);return;case e.FLOAT_MAT3:e.uniformMatrix3fv(r,!1,a);return;case e.FLOAT_MAT4:e.uniformMatrix4fv(r,!1,a);return;case e.UNSIGNED_INT:i?e.uniform1uiv(r,s):e.uniform1ui(r,n);return;case e.UNSIGNED_INT_VEC2:if(i)e.uniform2uiv(r,s);else{let t=n;e.uniform2ui(r,t[0],t[1])}return;case e.UNSIGNED_INT_VEC3:if(i)e.uniform3uiv(r,s);else{let t=n;e.uniform3ui(r,t[0],t[1],t[2])}return;case e.UNSIGNED_INT_VEC4:if(i)e.uniform4uiv(r,s);else{let t=n;e.uniform4ui(r,t[0],t[1],t[2],t[3])}return;default:_r.has(t.type)||(_r.add(t.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${t.type.toString(16)}; skipping upload.`));return}}var yr=class{constructor(e,t,n,r,i,a){this.gl=e.gl,this.program=new pr(e,t,n,a),this.uniforms=r,this.blend=i}dispose(){this.program.dispose()}};function br(e,t,n,r,i,a,o,s){let c=r?r.width/s:a,l=r?r.height/s:o,u=Math.max(0,i.x),d=Math.max(0,i.y),f=Math.min(c,i.x+i.w),p=Math.min(l,i.y+i.h),m=f-u,h=p-d;m<=0||h<=0||(e.bindFramebuffer(e.FRAMEBUFFER,r?r.fbo:null),e.viewport(Math.round(u*s),Math.round(d*s),Math.round(m*s),Math.round(h*s)),xr(e,n.blend),n.program.use(),n.program.uploadUniforms(n.uniforms),t.draw())}function xr(e,t){t===`none`?e.disable(e.BLEND):(e.enable(e.BLEND),e.blendEquation(e.FUNC_ADD),t===`premultiplied`?e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA):t===`additive`?e.blendFuncSeparate(e.ONE,e.ONE,e.ONE,e.ONE):e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA))}var Sr=class{constructor(t){this.uniforms={src:{value:null},offset:{value:new tr},resolution:{value:new tr},viewport:{value:new nr}},this.pass=new yr(t,`
precision highp float;
in vec3 position;
void main() {
    gl_Position = vec4(position, 1.0);
}
`,e,this.uniforms,`premultiplied`)}setUniforms(e,t,n){this.uniforms.src.value=e,this.uniforms.resolution.value.set(n.w*t,n.h*t),this.uniforms.offset.value.set(n.x*t,n.y*t)}dispose(){this.pass.dispose()}},Cr=e=>{let t=document.implementation.createHTMLDocument(`test`),n=t.createRange();n.selectNodeContents(t.documentElement),n.deleteContents();let r=document.createElement(`head`);return t.documentElement.appendChild(r),t.documentElement.appendChild(n.createContextualFragment(e)),t.documentElement.setAttribute(`xmlns`,t.documentElement.namespaceURI),new XMLSerializer().serializeToString(t).replace(/<!DOCTYPE html>/,``)};async function wr(e,t,n,r){let i=e.getBoundingClientRect(),a=window.devicePixelRatio,o=Math.ceil(i.width),s=Math.ceil(i.height),c=o*a,l=s*a,u=1,d=c,f=l;r&&(d>r||f>r)&&(u=Math.min(r/d,r/f),d=Math.floor(d*u),f=Math.floor(f*u));let p=n&&n.width===d&&n.height===f?n:new OffscreenCanvas(d,f),m=e.cloneNode(!0);await Dr(e,m),Or(e,m),m.style.setProperty(`opacity`,t.toString()),m.style.setProperty(`margin`,`0px`),kr(m),Ar(e,m),m.style.setProperty(`box-sizing`,`border-box`),m.style.setProperty(`width`,`${o}px`),m.style.setProperty(`height`,`${s}px`);let h=m.outerHTML,ee=`<svg xmlns="http://www.w3.org/2000/svg" width="${c}" height="${l}"><foreignObject width="100%" height="100%">${Cr(h)}</foreignObject></svg>`,te=await new Promise(e=>{let t=new Image;t.onload=()=>e(t),t.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(ee)}`}),g=p.getContext(`2d`);if(g===null)throw Error(`[VFX-JS] Failed to get 2D context`);let ne=()=>{g.clearRect(0,0,d,f);let e=a*u;g.scale(e,e),g.drawImage(te,0,0,c,l),g.setTransform(1,0,0,1,0,0)};if(ne(),Er()&&m.querySelector(`img`))for(let e=0;e<Tr;e++)await new Promise(e=>setTimeout(e,16)),ne();return p}var Tr=3;function Er(){let e=navigator.userAgent;return/AppleWebKit/.test(e)&&!/Chrome\/|Chromium\//.test(e)}async function Dr(e,t){let n=window.getComputedStyle(e);for(let e of Array.from(n))/(-inline-|-block-|^inline-|^block-)/.test(e)||/^-webkit-.*(start|end|before|after|logical)/.test(e)||t.style.setProperty(e,n.getPropertyValue(e),n.getPropertyPriority(e));if(t.tagName===`INPUT`)t.setAttribute(`value`,t.value);else if(t.tagName===`TEXTAREA`)t.innerHTML=t.value;else if(t.tagName===`IMG`)try{t.src=await Nr(d(e))}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];await Dr(r,i)}}function Or(e,t){if(typeof e.computedStyleMap==`function`)try{let n=e.computedStyleMap();for(let e of[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`]){let r=n.get(e);r instanceof CSSKeywordValue&&r.value===`auto`&&t.style.setProperty(e,`auto`)}}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];r instanceof HTMLElement&&i instanceof HTMLElement&&Or(r,i)}}function kr(e){let t=e;for(;;){let e=t.style;if(Number.parseFloat(e.paddingTop)>0||Number.parseFloat(e.borderTopWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.firstElementChild;if(!n)break;n.style.setProperty(`margin-top`,`0px`),t=n}for(t=e;;){let e=t.style;if(Number.parseFloat(e.paddingBottom)>0||Number.parseFloat(e.borderBottomWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.lastElementChild;if(!n)break;n.style.setProperty(`margin-bottom`,`0px`),t=n}}function Ar(e,t){let n=-e.scrollLeft,r=-e.scrollTop;for(let i=0;i<e.children.length;i++){let a=e.children[i],o=t.children[i];a&&(o instanceof HTMLElement||o instanceof SVGElement)&&((n!==0||r!==0)&&jr(o,n,r),Ar(a,o))}}function jr(e,t,n){let r=e.style.getPropertyValue(`translate`),[i=`0px`,a=`0px`,o]=r&&r!==`none`?Mr(r):[],s=`calc(${i} + ${t}px) calc(${a} + ${n}px)`;e.style.setProperty(`translate`,o?`${s} ${o}`:s)}function Mr(e){let t=[],n=0,r=``;for(let i of e.trim())i===`(`?n++:i===`)`&&n--,i===` `&&n===0?(r&&t.push(r),r=``):r+=i;return r&&t.push(r),t}async function Nr(e){let t=await fetch(e).then(e=>e.blob());return new Promise(e=>{let n=new FileReader;n.onload=function(){e(this.result)},n.readAsDataURL(t)})}var Pr=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},D=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Fr,Ir,Lr,Rr,zr,Br,Vr,Hr,Ur,Wr,Gr,Kr,qr=Object.freeze({__brand:`EffectQuad`});function Jr(e){return e===qr}function Yr(e,t){switch(t){case`lines`:return e.LINES;case`lineStrip`:return e.LINE_STRIP;case`points`:return e.POINTS;default:return e.TRIANGLES}}function Xr(e,t){if(t instanceof Float32Array)return e.FLOAT;if(t instanceof Uint8Array)return e.UNSIGNED_BYTE;if(t instanceof Uint16Array)return e.UNSIGNED_SHORT;if(t instanceof Uint32Array)return e.UNSIGNED_INT;if(t instanceof Int8Array)return e.BYTE;if(t instanceof Int16Array)return e.SHORT;if(t instanceof Int32Array)return e.INT;throw Error(`[VFX-JS] Unsupported attribute typed array`)}function Zr(e,t){if(ArrayBuffer.isView(t)&&!(t instanceof DataView))return{name:e,data:t,itemSize:2,normalized:!1,perInstance:!1};let n=t;return{name:e,data:n.data,itemSize:n.itemSize,normalized:n.normalized??!1,perInstance:n.perInstance??!1}}var Qr=class{constructor(e,t,n){Fr.add(this),Ir.set(this,void 0),Lr.set(this,void 0),Rr.set(this,void 0),zr.set(this,[]),Br.set(this,null),this.indexType=0,this.hasIndices=!1,this.drawCount=0,this.drawStart=0,Vr.set(this,!1),Pr(this,Ir,e,`f`),this.gl=e.gl,Pr(this,Lr,t,`f`),Pr(this,Rr,n,`f`),this.mode=Yr(this.gl,t.mode),this.instanceCount=t.instanceCount??0,D(this,Fr,`m`,Hr).call(this),e.addResource(this),Pr(this,Vr,!0,`f`)}restore(){Pr(this,zr,[],`f`),Pr(this,Br,null,`f`),D(this,Fr,`m`,Hr).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),this.hasIndices?this.instanceCount>0?e.drawElementsInstanced(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2),this.instanceCount):e.drawElements(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2)):this.instanceCount>0?e.drawArraysInstanced(this.mode,this.drawStart,this.drawCount,this.instanceCount):e.drawArrays(this.mode,this.drawStart,this.drawCount)}dispose(){D(this,Vr,`f`)&&(D(this,Ir,`f`).removeResource(this),Pr(this,Vr,!1,`f`));let e=this.gl;e.deleteVertexArray(this.vao);for(let t of D(this,zr,`f`))e.deleteBuffer(t);D(this,Br,`f`)&&e.deleteBuffer(D(this,Br,`f`)),Pr(this,zr,[],`f`),Pr(this,Br,null,`f`)}};Ir=new WeakMap,Lr=new WeakMap,Rr=new WeakMap,zr=new WeakMap,Br=new WeakMap,Vr=new WeakMap,Fr=new WeakSet,Hr=function(){let e=this.gl,t=e.createVertexArray();if(!t)throw Error(`[VFX-JS] Failed to create VAO`);this.vao=t,e.bindVertexArray(t);let n=D(this,Rr,`f`).program,r=null;for(let[t,i]of Object.entries(D(this,Lr,`f`).attributes)){let a=Zr(t,i),o=e.getAttribLocation(n,a.name);if(o<0)continue;let s=e.createBuffer();if(!s)throw Error(`[VFX-JS] Failed to create VBO for "${a.name}"`);D(this,zr,`f`).push(s),e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,a.data,e.STATIC_DRAW);let c=Xr(e,a.data);e.enableVertexAttribArray(o),c===e.FLOAT||c===e.HALF_FLOAT||a.normalized?e.vertexAttribPointer(o,a.itemSize,c,a.normalized,0,0):e.vertexAttribIPointer(o,a.itemSize,c,0,0),a.perInstance&&e.vertexAttribDivisor(o,1),t===`position`&&r===null&&(r=a.data.length/a.itemSize)}let i=0,a=D(this,Lr,`f`).indices;if(a){let t=e.createBuffer();if(!t)throw Error(`[VFX-JS] Failed to create IBO`);Pr(this,Br,t,`f`),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t),e.bufferData(e.ELEMENT_ARRAY_BUFFER,a,e.STATIC_DRAW),this.hasIndices=!0,this.indexType=a instanceof Uint32Array?e.UNSIGNED_INT:e.UNSIGNED_SHORT,i=a.length}else this.hasIndices=!1;e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null),D(this,Br,`f`)&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null);let o=this.hasIndices?i:r??0,s=D(this,Lr,`f`).drawRange;this.drawStart=s?.start??0,this.drawCount=s?.count===void 0?Math.max(0,o-this.drawStart):s.count};var $r=class{constructor(e,t){Ur.set(this,void 0),Wr.set(this,void 0),Gr.set(this,new WeakMap),Kr.set(this,new Set),Pr(this,Ur,e,`f`),Pr(this,Wr,t,`f`)}get quad(){return D(this,Wr,`f`)}resolve(e,t){let n=D(this,Gr,`f`).get(e);n||(n=new Map,D(this,Gr,`f`).set(e,n));let r=n.get(t);return r||(r=new Qr(D(this,Ur,`f`),e,t),n.set(t,r),D(this,Kr,`f`).add(r)),r}release(e){let t=D(this,Gr,`f`).get(e);if(t){for(let e of t.values())e.dispose(),D(this,Kr,`f`).delete(e);D(this,Gr,`f`).delete(e)}}dispose(){for(let e of D(this,Kr,`f`))e.dispose();D(this,Kr,`f`).clear()}};Ur=new WeakMap,Wr=new WeakMap,Gr=new WeakMap,Kr=new WeakMap;var O=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},k=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},ei,ti,ni,ri,ii,ai,oi,si,ci,li,A,ui,j,M,di,fi,pi,mi,hi,gi,_i,vi,yi,bi=Symbol.for(`@vfx-js/effect.resolve-texture`),xi=Symbol.for(`@vfx-js/effect.resolve-rt`);function Si(e){return e[bi]()}function Ci(e){return e[xi]}var wi=`#version 300 es
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
`,Ti=`
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
`,Ei=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`,Di=`
precision highp float;
varying vec2 uv;
uniform sampler2D src;
void main() {
    gl_FragColor = texture2D(src, uv);
}
`,Oi=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    bool inside = all(greaterThanEqual(uvSrc, vec2(0.0))) && all(lessThanEqual(uvSrc, vec2(1.0)));
    outColor = inside ? texture(src, uvSrc) : vec4(0.0);
}
`,ki=`
precision highp float;
varying vec2 uvSrc;
uniform sampler2D src;
void main() {
    bool inside = all(greaterThanEqual(uvSrc, vec2(0.0))) && all(lessThanEqual(uvSrc, vec2(1.0)));
    gl_FragColor = inside ? texture2D(src, uvSrc) : vec4(0.0);
}
`,Ai=class{constructor(e,t,n,r,i,a){ei.add(this),ti.set(this,void 0),ni.set(this,void 0),ri.set(this,void 0),ii.set(this,void 0),ai.set(this,void 0),oi.set(this,[]),si.set(this,[]),ci.set(this,[]),li.set(this,[]),A.set(this,`init`),ui.set(this,!1),j.set(this,void 0),M.set(this,void 0),mi.set(this,[]),O(this,ti,e,`f`),O(this,ni,e.gl,`f`),O(this,ri,n,`f`),O(this,ii,a,`f`),O(this,ai,new $r(e,t),`f`),O(this,j,{outputBufferW:1,outputBufferH:1,canvasBufferSize:[1,1],outputViewport:{x:0,y:0,w:1,h:1},elementBufferW:1,elementBufferH:1,contentRectUv:[0,0,1,1],srcRectUv:[0,0,1,1]},`f`);let o={time:0,deltaTime:0,pixelRatio:n,resolution:[1,1],mouse:[0,0],mouseViewport:[0,0],intersection:0,enterTime:0,leaveTime:0,enterProgress:0,leaveProgress:0,src:r,target:null,uniforms:{},vfxProps:i,dims:{element:[1,1],elementPixel:[1,1],canvas:[1,1],canvasPixel:[1,1],pixelRatio:n,contentRect:[0,0,1,1],srcRect:[0,0,1,1],canvasRect:[0,0,1,1]},quad:qr,gl:k(this,ni,`f`),createRenderTarget:e=>k(this,ei,`m`,di).call(this,e),releaseGeometry:e=>k(this,ai,`f`).release(e),wrapTexture:(e,t)=>k(this,ei,`m`,pi).call(this,e,t),draw:e=>k(this,ei,`m`,hi).call(this,e),blit:(e,t,n)=>k(this,ei,`m`,gi).call(this,e,t,n),clear:e=>k(this,ei,`m`,_i).call(this,e),onContextRestored:e=>{let t=k(this,ti,`f`).onContextRestored(e);return k(this,li,`f`).push(t),t}};O(this,M,o,`f`)}get ctx(){return k(this,M,`f`)}setPhase(e){O(this,A,e,`f`)}setFrameDims(e){O(this,j,e,`f`),k(this,M,`f`).resolution=[e.canvasBufferSize[0],e.canvasBufferSize[1]];for(let t of k(this,ci,`f`))t.resolver.resize?.(e.outputBufferW,e.outputBufferH)}setEffectDims(e){k(this,M,`f`).dims=e}setFrameState(e){let t=k(this,M,`f`);t.time=e.time,t.deltaTime=e.deltaTime,t.mouse=e.mouse,t.mouseViewport=e.mouseViewport,t.intersection=e.intersection,t.enterTime=e.enterTime,t.leaveTime=e.leaveTime,t.enterProgress=e.enterProgress,t.leaveProgress=e.leaveProgress,t.uniforms=e.uniforms}setSrc(e){k(this,M,`f`).src=e}setOutput(e){k(this,M,`f`).target=e}passthroughCopy(e,t,n){let r=k(this,A,`f`);O(this,A,`render`,`f`);let i=k(this,M,`f`).target;k(this,M,`f`).target=t;try{let r=k(this,j,`f`).outputViewport;k(this,j,`f`).outputViewport={...n};let i=k(this,M,`f`).vfxProps.glslVersion===`100`?Di:Ei;k(this,ei,`m`,vi).call(this,{frag:i,uniforms:{src:e},target:t}),k(this,j,`f`).outputViewport=r}finally{k(this,M,`f`).target=i,O(this,A,r,`f`)}}clearRt(e){let t=k(this,ni,`f`),n=Ci(e);t.bindFramebuffer(t.FRAMEBUFFER,n.getWriteFbo().fbo),t.viewport(0,0,e.width,e.height),t.clearColor(0,0,0,0),t.disable(t.SCISSOR_TEST),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)}tickAutoUpdates(){for(let e of k(this,mi,`f`))e()}dispose(){O(this,A,`disposed`,`f`);for(let e of k(this,li,`f`))e();O(this,li,[],`f`);for(let e of k(this,si,`f`))e.resolver.dispose?.();O(this,si,[],`f`),O(this,ci,[],`f`);for(let e of k(this,oi,`f`))e.dispose();O(this,oi,[],`f`),k(this,ai,`f`).dispose(),O(this,mi,[],`f`)}};ti=new WeakMap,ni=new WeakMap,ri=new WeakMap,ii=new WeakMap,ai=new WeakMap,oi=new WeakMap,si=new WeakMap,ci=new WeakMap,li=new WeakMap,A=new WeakMap,ui=new WeakMap,j=new WeakMap,M=new WeakMap,mi=new WeakMap,ei=new WeakSet,di=function(e){let t=e?.persistent??!1,n=e?.float??!1,r=Mi(e?.wrap),i=e?.filter,a=e?.mipmap??!1,o=a!==!1,s=a===!0,c=e?.size,l=c?c[0]:k(this,j,`f`).outputBufferW,u=c?c[1]:k(this,j,`f`).outputBufferH,d,f,p;if(t){let e=c?1:k(this,ri,`f`),t=c?l:l/e,a=c?u:u/e,m=new er(k(this,ti,`f`),t,a,e,n,{wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>m.texture,getWriteFbo:()=>m.target,swap:()=>m.swap(),resize:c?void 0:(e,t)=>{m.resize(e/k(this,ri,`f`),t/k(this,ri,`f`))},dispose:()=>m.dispose()},o&&(d.regenerateMipmaps=()=>m.target.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>m.target.width,p=()=>m.target.height}else{let e=new Gn(k(this,ti,`f`),l,u,{float:n,wrap:r,filter:i,mipmap:o});d={getReadTexture:()=>e.texture,getWriteFbo:()=>e,resize:c?void 0:(t,n)=>e.setSize(t,n),dispose:()=>e.dispose()},o&&(d.regenerateMipmaps=()=>e.generateMipmaps(),d.mipmapAutoRegen=s),f=()=>e.width,p=()=>e.height}let m,h=Fi(d,f,p,()=>k(this,ei,`m`,fi).call(this,m));return m={handle:h,resolver:d},k(this,si,`f`).push(m),c||k(this,ci,`f`).push(m),h},fi=function(e){let t=k(this,si,`f`).indexOf(e);if(t<0)return;k(this,si,`f`).splice(t,1);let n=k(this,ci,`f`).indexOf(e);n>=0&&k(this,ci,`f`).splice(n,1),e.resolver.dispose?.()},pi=function(e,t){let n=Mi(t?.wrap),r=t?.filter,i,a,o,s=null,c=ji(e);if(c){if(!t?.size)throw Error(`[VFX-JS] wrapTexture(WebGLTexture) requires opts.size`);let[n,r]=t.size;i=new T(k(this,ti,`f`),void 0,{autoRegister:!1,externalHandle:e}),a=()=>n,o=()=>r}else{let n=e;i=new T(k(this,ti,`f`),n);let r=t?.size,c=e=>{if(r)return e===`w`?r[0]:r[1];if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return e===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return e===`w`?n.videoWidth:n.videoHeight;let t=n;return e===`w`?t.width:t.height};a=()=>c(`w`),o=()=>c(`h`);let l=typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement||typeof HTMLCanvasElement<`u`&&n instanceof HTMLCanvasElement||typeof OffscreenCanvas<`u`&&n instanceof OffscreenCanvas;(t?.autoUpdate??l)&&(s=()=>{i.needsUpdate=!0})}i.wrapS=n[0],i.wrapT=n[1],r!==void 0&&(i.minFilter=r,i.magFilter=r),k(this,oi,`f`).push(i),s&&k(this,mi,`f`).push(s);let l=!1;return Pi(()=>i,a,o,()=>{if(l)return;l=!0;let e=k(this,oi,`f`).indexOf(i);if(e!==-1&&k(this,oi,`f`).splice(e,1),s){let e=k(this,mi,`f`).indexOf(s);e!==-1&&k(this,mi,`f`).splice(e,1)}i.dispose()},c?void 0:()=>{l||(i.needsUpdate=!0)})},hi=function(e){k(this,A,`f`)===`render`?k(this,ei,`m`,vi).call(this,e):k(this,A,`f`)===`update`&&!k(this,ui,`f`)&&(O(this,ui,!0,`f`),console.warn(`[VFX-JS] ctx.draw() called in update(); ignored. Move draws to render().`))},gi=function(e,t,n){if(k(this,A,`f`)!==`render`){k(this,A,`f`)===`update`&&!k(this,ui,`f`)&&(O(this,ui,!0,`f`),console.warn(`[VFX-JS] ctx.blit() called in update(); ignored. Move draws to render().`));return}let r=k(this,M,`f`).vfxProps.glslVersion===`100`?ki:Oi;k(this,ei,`m`,vi).call(this,{frag:r,uniforms:{src:e},target:t,blend:n?.blend,swap:n?.swap})},_i=function(e){if(k(this,A,`f`)!==`render`){k(this,A,`f`)===`update`&&!k(this,ui,`f`)&&(O(this,ui,!0,`f`),console.warn(`[VFX-JS] ctx.clear() called in update(); ignored. Move draws to render().`));return}let t=k(this,ni,`f`),n=k(this,M,`f`).target,r=e??n,i=r===null||r===n;if(t.clearColor(0,0,0,0),i){let e=r===null?null:Ci(r).getWriteFbo().fbo,n=k(this,j,`f`).outputViewport;t.bindFramebuffer(t.FRAMEBUFFER,e),t.enable(t.SCISSOR_TEST),t.scissor(n.x,n.y,n.w,n.h),t.clear(t.COLOR_BUFFER_BIT),t.disable(t.SCISSOR_TEST),t.bindFramebuffer(t.FRAMEBUFFER,null);return}let a=Ci(r);t.disable(t.SCISSOR_TEST);let o=()=>{t.bindFramebuffer(t.FRAMEBUFFER,a.getWriteFbo().fbo),t.clear(t.COLOR_BUFFER_BIT)};o(),a.swap&&(a.swap(),o(),a.swap()),t.bindFramebuffer(t.FRAMEBUFFER,null)},vi=function(e){let t=k(this,ni,`f`),n=e.vert??(k(this,M,`f`).vfxProps.glslVersion===`100`?Ti:wi),r=k(this,ii,`f`).get(n,e.frag,k(this,M,`f`).vfxProps.glslVersion),i=k(this,M,`f`).target,a=e.target===void 0||e.target===null?i:e.target,o=a===null||a===i,s,c,l,u,d,f,p;if(a===null)s=null,c=k(this,j,`f`).outputViewport.x,l=k(this,j,`f`).outputViewport.y,u=k(this,j,`f`).outputViewport.w,d=k(this,j,`f`).outputViewport.h;else{let e=Ci(a);s=e.getWriteFbo().fbo,o?(c=k(this,j,`f`).outputViewport.x,l=k(this,j,`f`).outputViewport.y,u=k(this,j,`f`).outputViewport.w,d=k(this,j,`f`).outputViewport.h):(c=0,l=0,u=a.width,d=a.height),f=e.swap,e.mipmapAutoRegen&&(p=e.regenerateMipmaps)}t.bindFramebuffer(t.FRAMEBUFFER,s),t.viewport(c,l,u,d),t.disable(t.SCISSOR_TEST),xr(t,e.blend??(a===null?`premultiplied`:`none`)),r.use();let m=k(this,ei,`m`,yi).call(this,e.uniforms);r.uploadUniforms(m);let h=e.geometry??qr;Jr(h)?k(this,ai,`f`).quad.draw():k(this,ai,`f`).resolve(h,r).draw(),p?.(),f&&e.swap!==!1&&f()},yi=function(e){let t={};if(t.contentRectUv={value:k(this,j,`f`).contentRectUv},t.srcRectUv={value:k(this,j,`f`).srcRectUv},!e)return t;for(let[n,r]of Object.entries(e))t[n]=Ni(r);return t};function ji(e){let t=globalThis.WebGLTexture;if(t&&typeof t==`function`&&e instanceof t)return!0;let n=e;return n.width===void 0&&n.naturalWidth===void 0&&n.videoWidth===void 0}function Mi(e){return e===void 0?[`clamp`,`clamp`]:typeof e==`string`?[e,e]:[e[0],e[1]]}function Ni(e){return typeof e==`object`&&e&&`__brand`in e?e.__brand===`EffectRenderTarget`?{value:Ci(e).getReadTexture()}:{value:Si(e)}:{value:e}}function Pi(e,t,n,r,i){let a={__brand:`EffectTexture`,get width(){return t()},get height(){return n()},dispose(){r?.()},update(){i?.()}};return Object.defineProperty(a,bi,{value:e}),a}function Fi(e,t,n,r){let i={__brand:`EffectRenderTarget`,get width(){return t()},get height(){return n()},dispose:r??(()=>{}),generateMipmaps:()=>e.regenerateMipmaps?.()};return Object.defineProperty(i,xi,{value:e}),i}function Ii(e){return Fi({getReadTexture:()=>e.texture,getWriteFbo:()=>e},()=>e.width,()=>e.height)}function Li(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:Array.isArray(e)?{top:e[0],right:e[1],bottom:e[2],left:e[3]}:{top:e.top??0,right:e.right??0,bottom:e.bottom??0,left:e.left??0}}function Ri(e){return Li(e)}var zi={top:0,right:0,bottom:0,left:0};function Bi(e){return Li(e)}function Vi(e){return{top:e.top,right:e.right,bottom:e.bottom,left:e.left}}function Hi(e){return{top:e.top,left:e.left,right:e.left+Math.ceil(e.right-e.left),bottom:e.top+Math.ceil(e.bottom-e.top)}}function Ui(e,t){return{top:e.top-t.top,right:e.right+t.right,bottom:e.bottom+t.bottom,left:e.left-t.left}}function Wi(e,t,n){return Math.min(Math.max(e,t),n)}function Gi(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return c<=0||l<=0?[0,0,1,1]:[(n-o)/c,(r-s)/l,i/c,a/l]}function Ki(e,t){return qi(e.left,e.right,t.left,t.right)*qi(e.top,e.bottom,t.top,t.bottom)}function qi(e,t,n,r){let i=Math.min(r-n,t-e);if(i<=0)return 0;let a=Wi(n,e,t);return(Wi(r,e,t)-a)/i}var N=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},P=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},F,Ji,Yi,Xi,Zi,Qi,I,L,$i,ea,ta,na,ra,ia,aa,oa,sa,ca,la,ua,da,fa,pa,ma,ha,ga,_a,va=class{constructor(e,t,n,r,i,a,o,s){F.add(this),Ji.set(this,void 0),Yi.set(this,void 0),Xi.set(this,void 0),Zi.set(this,void 0),Qi.set(this,void 0),I.set(this,void 0),L.set(this,void 0),$i.set(this,void 0),ea.set(this,[]),ta.set(this,[]),na.set(this,void 0),ra.set(this,new Set),ia.set(this,!1),aa.set(this,void 0),oa.set(this,Ri(0)),sa.set(this,null),N(this,Ji,e,`f`),N(this,Yi,t,`f`),N(this,Xi,n,`f`),N(this,Zi,i,`f`),N(this,Qi,s,`f`),N(this,I,r,`f`),N(this,na,a,`f`),N(this,aa,o,`f`),N(this,L,r.map(()=>P(this,F,`m`,la).call(this)),`f`),r.length===0&&N(this,sa,P(this,F,`m`,la).call(this),`f`),N(this,$i,P(this,F,`m`,ca).call(this),`f`)}get effects(){return P(this,I,`f`)}get hosts(){return P(this,L,`f`)}get renderingIndices(){return P(this,$i,`f`)}get stages(){return P(this,ta,`f`)}get hitTestPadBuffer(){return P(this,oa,`f`)}async initAll(){for(let e=0;e<P(this,I,`f`).length;e++){let t=P(this,I,`f`)[e],n=P(this,L,`f`)[e];n.setPhase(`init`);try{t.init&&await t.init(n.ctx)}catch(t){console.error(`[VFX-JS] effect[${e}].init() failed:`,t);for(let t=e-1;t>=0;t--)P(this,F,`m`,ua).call(this,t),P(this,L,`f`)[t].dispose();throw P(this,L,`f`)[e].dispose(),t}n.setPhase(`update`)}}run(e){if(P(this,ia,`f`)||!e.isVisible)return;N(this,$i,P(this,F,`m`,ca).call(this),`f`);let t=P(this,$i,`f`).length;for(let t of P(this,L,`f`))t.setFrameState({time:e.time,deltaTime:e.deltaTime,mouse:e.mouse,mouseViewport:e.mouseViewport,intersection:e.intersection,enterTime:e.enterTime,leaveTime:e.leaveTime,enterProgress:e.enterProgress,leaveProgress:e.leaveProgress,uniforms:e.resolvedUniforms});P(this,F,`m`,da).call(this,e);for(let t=0;t<P(this,L,`f`).length;t++)P(this,L,`f`)[t].setFrameDims(P(this,F,`m`,_a).call(this,t,e)),P(this,L,`f`)[t].setEffectDims(P(this,F,`m`,ma).call(this,t,e));for(let e=0;e<P(this,I,`f`).length;e++){let t=P(this,I,`f`)[e];if(!t.update)continue;let n=P(this,L,`f`)[e];n.setPhase(`update`);try{t.update(n.ctx)}catch(t){let n=`${e}:update`;P(this,ra,`f`).has(n)||(P(this,ra,`f`).add(n),console.warn(`[VFX-JS] effect[${e}].update() threw; skipping this frame's update:`,t))}}if(t===0)(P(this,sa,`f`)??P(this,L,`f`)[0]).passthroughCopy(P(this,na,`f`),e.finalTarget,e.elementRectOnCanvasPx);else for(let n=0;n<t;n++){let r=P(this,$i,`f`)[n],i=P(this,L,`f`)[r],a=P(this,I,`f`)[r];if(!a.render)continue;i.setPhase(`render`),i.tickAutoUpdates();let o=n===0?P(this,na,`f`):P(this,ea,`f`)[n-1].texHandle;i.setSrc(o);let s;n===t-1?s=e.finalTarget:(s=P(this,ea,`f`)[n].rtHandle,i.clearRt(s)),i.setOutput(s);try{a.render(i.ctx)}catch(e){let a=`${r}:render`;P(this,ra,`f`).has(a)||(P(this,ra,`f`).add(a),console.warn(`[VFX-JS] effect[${r}].render() threw; falling back to passthrough:`,e));let c=P(this,ta,`f`)[n].outputViewport;s===null?i.passthroughCopy(o,null,c):n===t-1?i.passthroughCopy(o,s,c):i.passthroughCopy(o,s,{x:0,y:0,w:s.width,h:s.height})}i.setPhase(`update`)}}dispose(){if(!P(this,ia,`f`)){N(this,ia,!0,`f`);for(let e=P(this,I,`f`).length-1;e>=0;e--)P(this,F,`m`,ua).call(this,e),P(this,L,`f`)[e].dispose();P(this,sa,`f`)&&(P(this,sa,`f`).dispose(),N(this,sa,null,`f`));for(let e of P(this,ea,`f`))e.fb.dispose();N(this,ea,[],`f`),N(this,ta,[],`f`)}}async replaceEffects(e){if(P(this,ia,`f`))throw Error(`[VFX-JS] replaceEffects on disposed chain`);let t=P(this,I,`f`),n=P(this,L,`f`),r=new Map;for(let e=0;e<t.length;e++)r.set(t[e],n[e]);let i=Array(e.length),a=[];for(let t=0;t<e.length;t++){let n=e[t],o=r.get(n);if(o)i[t]=o,r.delete(n);else{let e=P(this,F,`m`,la).call(this);i[t]=e,a.push({host:e,effect:n})}}for(let e=0;e<a.length;e++){let{host:t,effect:n}=a[e];t.setPhase(`init`);try{n.init&&await n.init(t.ctx),t.setPhase(`update`)}catch(n){console.error(`[VFX-JS] replaceEffects: new effect init() failed:`,n);for(let t=e-1;t>=0;t--){let e=a[t];if(e.effect.dispose)try{e.effect.dispose()}catch(e){console.error(`[VFX-JS] dispose during init rollback threw:`,e)}e.host.dispose()}throw t.dispose(),n}}for(let[e,t]of r){if(e.dispose)try{e.dispose()}catch(e){console.error(`[VFX-JS] effect.dispose() threw during replaceEffects:`,e)}t.dispose()}for(let e of P(this,ea,`f`))e.fb.dispose();N(this,ea,[],`f`),N(this,ta,[],`f`),e.length===0&&!P(this,sa,`f`)?N(this,sa,P(this,F,`m`,la).call(this),`f`):e.length>0&&P(this,sa,`f`)&&(P(this,sa,`f`).dispose(),N(this,sa,null,`f`)),N(this,I,e,`f`),N(this,L,i,`f`),N(this,$i,P(this,F,`m`,ca).call(this),`f`),P(this,ra,`f`).clear()}};Ji=new WeakMap,Yi=new WeakMap,Xi=new WeakMap,Zi=new WeakMap,Qi=new WeakMap,I=new WeakMap,L=new WeakMap,$i=new WeakMap,ea=new WeakMap,ta=new WeakMap,na=new WeakMap,ra=new WeakMap,ia=new WeakMap,aa=new WeakMap,oa=new WeakMap,sa=new WeakMap,F=new WeakSet,ca=function(){return P(this,I,`f`).map((e,t)=>typeof e.render==`function`&&e.enabled!==!1?t:-1).filter(e=>e>=0)},la=function(){return new Ai(P(this,Ji,`f`),P(this,Yi,`f`),P(this,Xi,`f`),P(this,na,`f`),P(this,Zi,`f`),P(this,Qi,`f`))},ua=function(e){let t=P(this,I,`f`)[e];if(t.dispose)try{t.dispose()}catch(t){console.error(`[VFX-JS] effect[${e}].dispose() threw:`,t)}},da=function(e){let t=P(this,$i,`f`).length;if(N(this,ta,Array(t),`f`),t===0)return;let n=P(this,aa,`f`)?e.canvasBufferSize:e.elementBufferSize,r=[0,0,n[0],n[1]],i=P(this,F,`m`,ga).call(this,e),a=r;for(let n=0;n<t;n++){let o=P(this,$i,`f`)[n],s=P(this,I,`f`)[o],c=n===t-1,l=P(this,F,`m`,fa).call(this,s,a,r,i,e)??a,u=[l[2],l[3]],d=Gi(r,l),f=c?{x:e.elementRectOnCanvasPx.x+l[0],y:e.elementRectOnCanvasPx.y+l[1],w:u[0],h:u[1]}:{x:0,y:0,w:u[0],h:u[1]};P(this,ta,`f`)[n]={dstRect:l,dstBufferSize:u,contentRectUv:d,outputViewport:f},c||P(this,F,`m`,ha).call(this,n,u),a=l}let[o,s,c,l]=P(this,ta,`f`)[t-1].dstRect;N(this,oa,Ri({top:Math.max(0,s+l-n[1]),right:Math.max(0,o+c-n[0]),bottom:Math.max(0,-s),left:Math.max(0,-o)}),`f`)},fa=function(e,t,n,r,i){if(e.outputRect)return e.outputRect(P(this,F,`m`,pa).call(this,i,n,t,r))},pa=function(e,t,n,r){let i=e.canvasBufferSize[0]/e.canvasSize[0]||1;return{element:P(this,aa,`f`)?e.canvasSize:e.elementSize,elementPixel:P(this,aa,`f`)?e.canvasBufferSize:e.elementBufferSize,canvas:e.canvasSize,canvasPixel:e.canvasBufferSize,pixelRatio:i,contentRect:t,srcRect:n,canvasRect:r}},ma=function(e,t){let n=P(this,aa,`f`)?t.canvasBufferSize:t.elementBufferSize,r=[0,0,n[0],n[1]],i=P(this,F,`m`,ga).call(this,t),a=P(this,$i,`f`).indexOf(e),o=a<=0?r:P(this,ta,`f`)[a-1].dstRect;return P(this,F,`m`,pa).call(this,t,r,o,i)},ha=function(e,t){let n=P(this,ea,`f`)[e];if(n&&n.fb.width===t[0]&&n.fb.height===t[1])return;n&&n.fb.dispose();let r=new Gn(P(this,Ji,`f`),t[0],t[1]),i=Ii(r),a=Pi(()=>r.texture,()=>r.width,()=>r.height);P(this,ea,`f`)[e]={fb:r,rtHandle:i,texHandle:a,bufferSize:t}},ga=function(e){let[t,n]=e.canvasBufferSize;if(P(this,aa,`f`))return[0,0,t,n];let{x:r,y:i}=e.elementRectOnCanvasPx;return[-r,-i,t,n]},_a=function(e,t){let n=P(this,$i,`f`).indexOf(e),r,i,a,o,s;if(n<0)r=t.elementBufferSize[0],i=t.elementBufferSize[1],a={x:0,y:0,w:r,h:i},o=[0,0,1,1],s=[0,0,1,1];else{let e=P(this,ta,`f`)[n];r=e.dstBufferSize[0],i=e.dstBufferSize[1],a=e.outputViewport,o=e.contentRectUv,s=n===0?[0,0,1,1]:P(this,ta,`f`)[n-1].contentRectUv}return{outputBufferW:r,outputBufferH:i,canvasBufferSize:t.canvasBufferSize,outputViewport:a,elementBufferW:t.elementBufferSize[0],elementBufferH:t.elementBufferSize[1],contentRectUv:o,srcRectUv:s}};var ya=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},ba=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},xa,Sa,Ca,wa,Ta=class{constructor(e){xa.add(this),Sa.set(this,void 0),Ca.set(this,new Set),ya(this,Sa,e,`f`)}freezeInside(e,t){let n={root:e,entries:[]};for(let r of t)!r.frozen&&Ea(e,r.element)&&(r.frozen=!0,n.entries.push({e:r,opacity:r.element.style.opacity}),ba(this,Sa,`f`).showPlain(r));ba(this,Ca,`f`).add(n);let r=!1;return()=>{if(!r){r=!0,ba(this,Ca,`f`).delete(n);for(let{e}of n.entries)e.frozen=!1;requestAnimationFrame(()=>{for(let{e,opacity:t}of n.entries)!e.frozen&&ba(this,Sa,`f`).isRegistered(e)&&ba(this,Sa,`f`).hidePlain(e,t)})}}}adopt(e,t){let n=ba(this,xa,`m`,wa).call(this,e.element);return n?(e.frozen=!0,n.entries.push({e,opacity:t??e.element.style.opacity}),!0):!1}};Sa=new WeakMap,Ca=new WeakMap,xa=new WeakSet,wa=function(e){for(let t of ba(this,Ca,`f`))if(Ea(t.root,e))return t};function Ea(e,t){return t!==e&&e.contains(t)}function Da(e){this.data=e,this.pos=0}Da.prototype.readByte=function(){return this.data[this.pos++]},Da.prototype.peekByte=function(){return this.data[this.pos]},Da.prototype.readBytes=function(e){return this.data.subarray(this.pos,this.pos+=e)},Da.prototype.peekBytes=function(e){return this.data.subarray(this.pos,this.pos+e)},Da.prototype.readString=function(e){for(var t=``,n=0;n<e;n++)t+=String.fromCharCode(this.readByte());return t},Da.prototype.readBitArray=function(){for(var e=[],t=this.readByte(),n=7;n>=0;n--)e.push(!!(t&1<<n));return e},Da.prototype.readUnsigned=function(e){var t=this.readBytes(2);return e?(t[1]<<8)+t[0]:(t[0]<<8)+t[1]};function Oa(e){this.stream=new Da(e),this.output={}}Oa.prototype.parse=function(e){return this.parseParts(this.output,e),this.output},Oa.prototype.parseParts=function(e,t){for(var n=0;n<t.length;n++){var r=t[n];this.parsePart(e,r)}},Oa.prototype.parsePart=function(e,t){var n=t.label,r;if(!t.requires||t.requires(this.stream,this.output,e)){if(t.loop){for(var i=[];t.loop(this.stream);){var a={};this.parseParts(a,t.parts),i.push(a)}e[n]=i}else t.parts?(r={},this.parseParts(r,t.parts),e[n]=r):t.parser?(r=t.parser(this.stream,this.output,e),t.skip||(e[n]=r)):t.bits&&(e[n]=this.parseBits(t.bits))}};function ka(e){return e.reduce(function(e,t){return e*2+t},0)}Oa.prototype.parseBits=function(e){var t={},n=this.stream.readBitArray();for(var r in e){var i=e[r];t[r]=i.length?ka(n.slice(i.index,i.index+i.length)):n[i.index]}return t};var R={readByte:function(){return function(e){return e.readByte()}},readBytes:function(e){return function(t){return t.readBytes(e)}},readString:function(e){return function(t){return t.readString(e)}},readUnsigned:function(e){return function(t){return t.readUnsigned(e)}},readArray:function(e,t){return function(n,r,i){for(var a=t(n,r,i),o=Array(a),s=0;s<a;s++)o[s]=n.readBytes(e);return o}}},Aa={label:`blocks`,parser:function(e){for(var t=[],n=0,r=0,i=e.readByte();i!==r;i=e.readByte())t.push(e.readBytes(i)),n+=i;var a=new Uint8Array(n);n=0;for(var o=0;o<t.length;o++)a.set(t[o],n),n+=t[o].length;return a}},ja={label:`gce`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===249},parts:[{label:`codes`,parser:R.readBytes(2),skip:!0},{label:`byteSize`,parser:R.readByte()},{label:`extras`,bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:`delay`,parser:R.readUnsigned(!0)},{label:`transparentColorIndex`,parser:R.readByte()},{label:`terminator`,parser:R.readByte(),skip:!0}]},Ma={label:`image`,requires:function(e){return e.peekByte()===44},parts:[{label:`code`,parser:R.readByte(),skip:!0},{label:`descriptor`,parts:[{label:`left`,parser:R.readUnsigned(!0)},{label:`top`,parser:R.readUnsigned(!0)},{label:`width`,parser:R.readUnsigned(!0)},{label:`height`,parser:R.readUnsigned(!0)},{label:`lct`,bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:`lct`,requires:function(e,t,n){return n.descriptor.lct.exists},parser:R.readArray(3,function(e,t,n){return 2**(n.descriptor.lct.size+1)})},{label:`data`,parts:[{label:`minCodeSize`,parser:R.readByte()},Aa]}]},Na={label:`text`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===1},parts:[{label:`codes`,parser:R.readBytes(2),skip:!0},{label:`blockSize`,parser:R.readByte()},{label:`preData`,parser:function(e,t,n){return e.readBytes(n.text.blockSize)}},Aa]},Pa={label:`frames`,parts:[ja,{label:`application`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===255},parts:[{label:`codes`,parser:R.readBytes(2),skip:!0},{label:`blockSize`,parser:R.readByte()},{label:`id`,parser:function(e,t,n){return e.readString(n.blockSize)}},Aa]},{label:`comment`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===254},parts:[{label:`codes`,parser:R.readBytes(2),skip:!0},Aa]},Ma,Na],loop:function(e){var t=e.peekByte();return t===33||t===44}},Fa=[{label:`header`,parts:[{label:`signature`,parser:R.readString(3)},{label:`version`,parser:R.readString(3)}]},{label:`lsd`,parts:[{label:`width`,parser:R.readUnsigned(!0)},{label:`height`,parser:R.readUnsigned(!0)},{label:`gct`,bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:`backgroundColorIndex`,parser:R.readByte()},{label:`pixelAspectRatio`,parser:R.readByte()}]},{label:`gct`,requires:function(e,t){return t.lsd.gct.exists},parser:R.readArray(3,function(e,t){return 2**(t.lsd.gct.size+1)})},Pa];function Ia(e){var t=new Oa(new Uint8Array(e));this.raw=t.parse(Fa),this.raw.hasImages=!1;for(var n=0;n<this.raw.frames.length;n++)if(this.raw.frames[n].image){this.raw.hasImages=!0;break}}Ia.prototype.decompressFrame=function(e,t){if(e>=this.raw.frames.length)return null;var n=this.raw.frames[e];if(n.image){var r=n.image.descriptor.width*n.image.descriptor.height,i=o(n.image.data.minCodeSize,n.image.data.blocks,r);n.image.descriptor.lct.interlaced&&(i=s(i,n.image.descriptor.width));var a={pixels:i,dims:{top:n.image.descriptor.top,left:n.image.descriptor.left,width:n.image.descriptor.width,height:n.image.descriptor.height}};return a.colorTable=n.image.descriptor.lct&&n.image.descriptor.lct.exists?n.image.lct:this.raw.gct,n.gce&&(a.delay=(n.gce.delay||10)*10,a.disposalType=n.gce.extras.disposal,n.gce.extras.transparentColorGiven&&(a.transparentIndex=n.gce.transparentColorIndex)),t&&(a.patch=c(a)),a}return null;function o(e,t,n){var r=4096,i=-1,a=n,o,s,c,l,u,d,f,p,m,h,ee,te,g,ne,_,v,re=Array(n),ie=Array(r),ae=Array(r),oe=Array(r+1);for(te=e,s=1<<te,u=s+1,o=s+2,f=i,l=te+1,c=(1<<l)-1,m=0;m<s;m++)ie[m]=0,ae[m]=m;for(ee=p=g=ne=v=_=0,h=0;h<a;){if(ne===0){if(p<l){ee+=t[_]<<p,p+=8,_++;continue}if(m=ee&c,ee>>=l,p-=l,m>o||m==u)break;if(m==s){l=te+1,c=(1<<l)-1,o=s+2,f=i;continue}if(f==i){oe[ne++]=ae[m],f=m,g=m;continue}for(d=m,m==o&&(oe[ne++]=g,m=f);m>s;)oe[ne++]=ae[m],m=ie[m];g=ae[m]&255,oe[ne++]=g,o<r&&(ie[o]=f,ae[o]=g,o++,(o&c)===0&&o<r&&(l++,c+=o)),f=d}ne--,re[v++]=oe[ne],h++}for(h=v;h<a;h++)re[h]=0;return re}function s(e,t){for(var n=Array(e.length),r=e.length/t,i=function(r,i){var a=e.slice(i*t,(i+1)*t);n.splice.apply(n,[r*t,t].concat(a))},a=[0,4,2,1],o=[8,8,4,2],s=0,c=0;c<4;c++)for(var l=a[c];l<r;l+=o[c])i(l,s),s++;return n}function c(e){for(var t=e.pixels.length,n=new Uint8ClampedArray(t*4),r=0;r<t;r++){var i=r*4,a=e.pixels[r],o=e.colorTable[a];n[i]=o[0],n[i+1]=o[1],n[i+2]=o[2],n[i+3]=a===e.transparentIndex?0:255}return n}},Ia.prototype.decompressFrames=function(e,t,n){t===void 0&&(t=0),n=n===void 0?this.raw.frames.length:Math.min(n,this.raw.frames.length);for(var r=[],i=t;i<n;i++)this.raw.frames[i].image&&r.push(this.decompressFrame(i,e));return r};var La=Ia,Ra=class e{static async create(t,n){let r=await fetch(t).then(e=>e.arrayBuffer()).then(e=>new La(e)),i=r.decompressFrames(!0,void 0,void 0),{width:a,height:o}=r.raw.lsd;return new e(i,a,o,n)}constructor(e,t,n,r){this.frames=[],this.index=0,this.playTime=0,this.frames=e,this.canvas=document.createElement(`canvas`),this.ctx=this.canvas.getContext(`2d`),this.pixelRatio=r,this.canvas.width=t,this.canvas.height=n,this.startTime=Date.now()}getCanvas(){return this.canvas}update(){let e=Date.now()-this.startTime;for(;this.playTime<e;){let e=this.frames[this.index%this.frames.length];this.playTime+=e.delay,this.index++}let t=this.frames[this.index%this.frames.length],n=new ImageData(t.patch,t.dims.width,t.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(n,t.dims.left,t.dims.top)}},za=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ba,Va,Ha,Ua,Wa,Ga=class{constructor(e,t=!1){this.isContextLost=!1,Ba.set(this,new Set),Va.set(this,new Set),Ha.set(this,new Set),Ua.set(this,e=>{e.preventDefault(),this.isContextLost=!0;for(let e of za(this,Va,`f`))e()}),Wa.set(this,()=>{this.isContextLost=!1;let e=this.gl;e.getExtension(`EXT_color_buffer_float`),e.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!e.getExtension(`EXT_float_blend`);for(let e of za(this,Ba,`f`))e.restore();for(let e of za(this,Ha,`f`))e()});let n=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:t});if(!n)throw Error(`[VFX-JS] WebGL2 is not available.`);this.gl=n,this.canvas=e,n.getExtension(`EXT_color_buffer_float`),n.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!n.getExtension(`EXT_float_blend`),this.floatLinearFilter=!!n.getExtension(`OES_texture_float_linear`),this.maxTextureSize=n.getParameter(n.MAX_TEXTURE_SIZE),e.addEventListener(`webglcontextlost`,za(this,Ua,`f`),!1),e.addEventListener(`webglcontextrestored`,za(this,Wa,`f`),!1)}setSize(e,t,n){let r=Math.floor(e*n),i=Math.floor(t*n);(this.canvas.width!==r||this.canvas.height!==i)&&(this.canvas.width=r,this.canvas.height=i)}addResource(e){za(this,Ba,`f`).add(e)}removeResource(e){za(this,Ba,`f`).delete(e)}onContextLost(e){return za(this,Va,`f`).add(e),()=>za(this,Va,`f`).delete(e)}onContextRestored(e){return za(this,Ha,`f`).add(e),()=>za(this,Ha,`f`).delete(e)}};Ba=new WeakMap,Va=new WeakMap,Ha=new WeakMap,Ua=new WeakMap,Wa=new WeakMap;var Ka=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},qa=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ja,Ya,Xa,Za,Qa=class{constructor(e){Ja.add(this),Ya.set(this,void 0),Xa.set(this,void 0),Ka(this,Ya,e,`f`),this.gl=e.gl,qa(this,Ja,`m`,Za).call(this),e.addResource(this)}restore(){qa(this,Ja,`m`,Za).call(this)}draw(){let e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){qa(this,Ya,`f`).removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(qa(this,Xa,`f`))}};Ya=new WeakMap,Xa=new WeakMap,Ja=new WeakSet,Za=function(){let e=this.gl,t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw Error(`[VFX-JS] Failed to create quad VAO`);this.vao=t,Ka(this,Xa,n,`f`);let r=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)};function $a(e){return{phase:`hidden`,direction:1,enterProgress:0,leaveProgress:0,isIn:!1,wasAbove:!1,wasBelow:!1,lastTime:e}}function eo(e,t,n,r,i){let a=r===0?n:t>=r,o=i===0?!n:t<i,s=a&&!e.wasAbove,c=o&&!e.wasBelow;if(e.wasAbove=a,e.wasBelow=o,a&&!o)return!0;if(o&&!a)return!1;if(a&&o){if(s)return!0;if(c)return!1}return e.isIn}function to(e,t){e.lastTime=t}function no(e,t,n,r){let i=n-e.lastTime;if(e.lastTime=n,e.isIn=t,ro(e,t))return e;let a=(i<0?i:e.direction*i)/r;if(e.phase===`entering`){let t=e.enterProgress+a;a>0&&t>=1?io(e,`shown`):a<0&&t<=0?io(e,`hidden`):e.enterProgress=ao(t)}else if(e.phase===`leaving`){let t=e.leaveProgress+a;a>0&&t>=1?io(e,`hidden`):a<0&&t<=0?io(e,`shown`):e.leaveProgress=ao(t)}return e}function ro(e,t){switch(e.phase){case`hidden`:return t?(e.phase=`entering`,e.direction=1,!0):!1;case`shown`:return!t&&(e.phase=`leaving`,e.direction=1,!0);case`entering`:return e.direction=t?1:-1,!1;case`leaving`:return e.direction=t?-1:1,!1}}function io(e,t){e.phase=t,e.direction=1,e.enterProgress=+(t===`shown`),e.leaveProgress=0}function ao(e){return Math.min(Math.max(e,0),1)}function oo(e,t,n,r={}){return new Gn(e,t,n,{float:r.float??!1})}function so(e,t){let n=t.renderingToBuffer??!1,r;r=n?`none`:t.premultipliedAlpha?`premultiplied`:`normal`;let i=t.glslVersion??fr(t.fragmentShader);return new yr(e,t.vertexShader??(i===`100`?`
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
`),t.fragmentShader,t.uniforms,r,i)}var co=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},z=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},B,lo,uo,fo,po,mo,ho=class{constructor(e,t,n,r,i,a,o,s){if(B.set(this,void 0),lo.set(this,void 0),uo.set(this,void 0),fo.set(this,void 0),po.set(this,void 0),mo.set(this,void 0),co(this,fo,r??!1,`f`),co(this,po,i??!1,`f`),co(this,mo,a,`f`),co(this,lo,{},`f`),co(this,B,{src:{value:null},offset:{value:new tr},resolution:{value:new tr},viewport:{value:new nr},time:{value:0},mouse:{value:new tr},passIndex:{value:0}},`f`),n)for(let[e,t]of Object.entries(n))typeof t==`function`?(z(this,lo,`f`)[e]=t,z(this,B,`f`)[e]={value:t()}):z(this,B,`f`)[e]={value:t};this.pass=so(e,{fragmentShader:t,uniforms:z(this,B,`f`),renderingToBuffer:o??!1,premultipliedAlpha:!0,glslVersion:s})}get uniforms(){return z(this,B,`f`)}setUniforms(e,t,n,r,i,a){z(this,B,`f`).src.value=e,z(this,B,`f`).resolution.value.set(n.w*t,n.h*t),z(this,B,`f`).offset.value.set(n.x*t,n.y*t),z(this,B,`f`).time.value=r,z(this,B,`f`).mouse.value.set(i*t,a*t)}updateCustomUniforms(e){for(let[e,t]of Object.entries(z(this,lo,`f`)))z(this,B,`f`)[e]&&(z(this,B,`f`)[e].value=t());if(e)for(let[t,n]of Object.entries(e))z(this,B,`f`)[t]&&(z(this,B,`f`)[t].value=n())}initializeBackbuffer(e,t,n,r){z(this,fo,`f`)&&!z(this,uo,`f`)&&(z(this,mo,`f`)?co(this,uo,new er(e,z(this,mo,`f`)[0],z(this,mo,`f`)[1],1,z(this,po,`f`)),`f`):co(this,uo,new er(e,t,n,r,z(this,po,`f`)),`f`))}resizeBackbuffer(e,t){z(this,uo,`f`)&&!z(this,mo,`f`)&&z(this,uo,`f`).resize(e,t)}registerBufferUniform(e){z(this,B,`f`)[e]||(z(this,B,`f`)[e]={value:null})}get backbuffer(){return z(this,uo,`f`)}get persistent(){return z(this,fo,`f`)}get float(){return z(this,po,`f`)}get size(){return z(this,mo,`f`)}dispose(){this.pass.dispose(),z(this,uo,`f`)?.dispose()}};B=new WeakMap,lo=new WeakMap,uo=new WeakMap,fo=new WeakMap,po=new WeakMap,mo=new WeakMap;var go=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},_o=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},vo,yo,bo=class{constructor(e){vo.set(this,void 0),yo.set(this,new Map),go(this,vo,e,`f`)}get(e,t,n){let r=`${t}\0${e}\0${n??``}`,i=_o(this,yo,`f`).get(r);return i||(i=new pr(_o(this,vo,`f`),e,t,n),_o(this,yo,`f`).set(r,i)),i}get size(){return _o(this,yo,`f`).size}dispose(){for(let e of _o(this,yo,`f`).values())e.dispose();_o(this,yo,`f`).clear()}};vo=new WeakMap,yo=new WeakMap;var V=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},H=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},U,xo,So,W,Co,wo,To,G,K,q,Eo,J,Do,Oo,ko,Ao,jo,Mo,Y,X,No,Po,Fo,Io,Lo,Z,Ro,zo,Bo,Vo,Ho,Uo,Wo,Go,Ko,qo,Jo,Yo,Xo,Zo,Qo,$o,es,ts,ns,rs,is,as,os,ss,cs,ls,us,ds,fs,ps=new Map,ms=!1;function hs(e,t){return e===`hic`||t===!0?null:typeof t==`number`?t.toString():e===`video`?`0.0001`:`0`}function gs(e,t){let n=e.getContext(`2d`);n&&(n.clearRect(0,0,e.width,e.height),n.drawImage(t,0,0,e.width,e.height))}var _s=class{constructor(e,t){U.add(this),xo.set(this,void 0),So.set(this,void 0),W.set(this,void 0),Co.set(this,void 0),wo.set(this,void 0),To.set(this,void 0),G.set(this,void 0),K.set(this,[]),q.set(this,void 0),Eo.set(this,new Map),J.set(this,null),Do.set(this,!1),Oo.set(this,new WeakSet),ko.set(this,{}),Ao.set(this,{}),jo.set(this,0),Mo.set(this,void 0),Y.set(this,2),X.set(this,[]),No.set(this,new Ta({showPlain:e=>{if(e.type===`hic`){let t=e.srcTexture.source;t instanceof OffscreenCanvas&&gs(e.element,t)}else e.element.style.setProperty(`opacity`,e.originalOpacity.toString())},hidePlain:(e,t)=>{if(e.type===`hic`){let t=e.element;t.getContext(`2d`)?.clearRect(0,0,t.width,t.height)}else e.element.style.opacity=t},isRegistered:e=>H(this,X,`f`).includes(e)})),Po.set(this,0),Fo.set(this,1),Io.set(this,Date.now()/1e3),Lo.set(this,!1),Z.set(this,Bi(0)),Ro.set(this,Bi(0)),zo.set(this,[0,0]),Bo.set(this,0),Vo.set(this,0),Ho.set(this,0),Uo.set(this,0),Wo.set(this,new WeakMap),Ko.set(this,async()=>{if(typeof window<`u`){for(let e of H(this,X,`f`))if(e.type===`text`&&e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await H(this,U,`m`,Jo).call(this,e),e.width=n,e.height=r)}for(let e of H(this,X,`f`))if(e.type===`text`&&!e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await H(this,U,`m`,Jo).call(this,e),e.width=n,e.height=r)}}}),qo.set(this,e=>{typeof window<`u`&&(V(this,Ho,e.clientX,`f`),V(this,Uo,window.innerHeight-e.clientY,`f`))}),Qo.set(this,()=>{this.isPlaying()&&(this.render(),V(this,Mo,requestAnimationFrame(H(this,Qo,`f`)),`f`))}),V(this,xo,e,`f`),V(this,So,t,`f`),V(this,W,new Ga(t,e.preserveDrawingBuffer),`f`),V(this,Co,H(this,W,`f`).gl,`f`),H(this,Co,`f`).clearColor(0,0,0,0),V(this,Y,e.pixelRatio,`f`),V(this,Fo,e.timeScale,`f`),V(this,Io,Date.now()/1e3,`f`),V(this,wo,new Qa(H(this,W,`f`)),`f`),V(this,To,new bo(H(this,W,`f`)),`f`),typeof window<`u`&&(window.addEventListener(`resize`,H(this,Ko,`f`)),window.addEventListener(`pointermove`,H(this,qo,`f`))),H(this,Ko,`f`).call(this),V(this,G,new Sr(H(this,W,`f`)),`f`),H(this,U,`m`,cs).call(this,e.postEffects),H(this,W,`f`).onContextRestored(()=>{H(this,Co,`f`).clearColor(0,0,0,0)})}destroy(){this.stop(),typeof window<`u`&&(window.removeEventListener(`resize`,H(this,Ko,`f`)),window.removeEventListener(`pointermove`,H(this,qo,`f`))),H(this,q,`f`)?.dispose();for(let e of H(this,Eo,`f`).values())e?.dispose();for(let e of H(this,K,`f`))e.pass.dispose();H(this,J,`f`)&&(H(this,J,`f`).dispose(),V(this,J,null,`f`),V(this,Do,!1,`f`)),H(this,G,`f`).dispose(),H(this,To,`f`).dispose(),H(this,wo,`f`).dispose()}async addElement(e,t={},n){if(t.effect!==void 0)return H(this,U,`m`,Xo).call(this,e,t,t.effect,n);let r=H(this,U,`m`,Zo).call(this,t),i=e.getBoundingClientRect(),o=As(e)?Hi(i):Vi(i),[s,c]=ys(t.overflow),l=Ui(o,c),u=Cs(t.intersection),f=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),p,m,h=!1;if(e instanceof HTMLImageElement){m=`img`;let t=d(e);if(h=!!t.match(/\.gif/i),h){let n=await Ra.create(t,H(this,Y,`f`));ps.set(e,n),p=new T(H(this,W,`f`),n.getCanvas())}else{let e=await zn(t);p=new T(H(this,W,`f`),e)}}else if(e instanceof HTMLVideoElement)p=new T(H(this,W,`f`),e),m=`video`;else if(e instanceof HTMLCanvasElement)a(e)&&n?(p=new T(H(this,W,`f`),n),m=`hic`):(p=new T(H(this,W,`f`),e),m=`canvas`);else{let t=await wr(e,f,void 0,this.maxTextureSize);p=new T(H(this,W,`f`),t),m=`text`}let[ee,te]=Es(t.wrap);p.wrapS=ee,p.wrapT=te,p.needsUpdate=!0;let g=t.autoCrop??!0,ne=hs(m,t.overlay),_={src:{value:p},resolution:{value:new tr},offset:{value:new tr},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},enterProgress:{value:0},leaveProgress:{value:0},mouse:{value:new tr},intersection:{value:0},viewport:{value:new nr},autoCrop:{value:g}},v={};if(t.uniforms!==void 0)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(_[e]={value:n()},v[e]=n):_[e]={value:n};let re;t.backbuffer&&(re=(()=>{let e=(l.right-l.left)*H(this,Y,`f`),t=(l.bottom-l.top)*H(this,Y,`f`);return new er(H(this,W,`f`),e,t,H(this,Y,`f`),!1)})(),_.backbuffer={value:re.texture});let ie=new Map,ae=new Map;for(let e=0;e<r.length-1;e++){let t=r[e].target??`pass${e}`;r[e]={...r[e],target:t};let n=r[e].size,i=n?n[0]:(l.right-l.left)*H(this,Y,`f`),a=n?n[1]:(l.bottom-l.top)*H(this,Y,`f`);if(r[e].persistent){let i=n?1:H(this,Y,`f`),a=n?n[0]:l.right-l.left,o=n?n[1]:l.bottom-l.top;ae.set(t,new er(H(this,W,`f`),a,o,i,r[e].float))}else ie.set(t,oo(H(this,W,`f`),i,a,{float:r[e].float}))}let oe=[];for(let e=0;e<r.length;e++){let t=r[e],n=t.frag,i={..._},a={};for(let[e,r]of ie)e!==t.target&&n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:r.texture});for(let[e,t]of ae)n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:t.texture});if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(i[e]={value:n()},a[e]=n):i[e]={value:n};let o=so(H(this,W,`f`),{vertexShader:t.vert,fragmentShader:n,uniforms:i,renderingToBuffer:t.target!==void 0,glslVersion:t.glslVersion});oe.push({pass:o,uniforms:i,uniformGenerators:{...v,...a},target:t.target,persistent:t.persistent,float:t.float,size:t.size,backbuffer:t.target?ae.get(t.target):void 0})}let se=H(this,Po,`f`),ce={type:m,element:e,isInViewport:!1,intersectionState:$a(se),width:o.right-o.left,height:o.bottom-o.top,passes:oe,bufferTargets:ie,startTime:se,enterTime:se,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:s,overflow:c,intersection:u,originalOpacity:f,srcTexture:p,zIndex:t.zIndex??0,backbuffer:re,autoCrop:g};H(this,U,`m`,is).call(this,ce,o,se),H(this,U,`m`,Yo).call(this,ce,ne)}async updateElementEffects(e,t){let n=H(this,X,`f`).find(t=>t.element===e);if(!n)throw Error(`[VFX-JS] updateElementEffects: element not registered`);if(!n.chain)throw Error(`[VFX-JS] updateElementEffects: element is on the shader path; effect-only updates are not supported`);let r=Array.isArray(t)?[...t]:[t],i=n.chain.effects,a=new Set(i),o=[];for(let e of r)if(!a.has(e)){if(H(this,Oo,`f`).has(e))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");o.push(e)}await n.chain.replaceEffects(r);let s=new Set(r);for(let e of i)s.has(e)||H(this,Oo,`f`).delete(e);for(let e of o)H(this,Oo,`f`).add(e)}removeElement(e){let t=H(this,X,`f`).findIndex(t=>t.element===e);if(t!==-1){let n=H(this,X,`f`).splice(t,1)[0];if(n.chain)H(this,U,`m`,ns).call(this,n.chain.effects),n.chain.dispose();else{for(let e of n.bufferTargets.values())e.dispose();for(let e of n.passes)e.pass.dispose(),e.backbuffer?.dispose();n.backbuffer?.dispose()}n.srcTexture.dispose(),e.style.setProperty(`opacity`,n.originalOpacity.toString())}}updateTextElement(e){let t=H(this,X,`f`).findIndex(t=>t.element===e);return t===-1?Promise.resolve():H(this,U,`m`,Jo).call(this,H(this,X,`f`)[t])}async updateImageElement(e){let t=H(this,X,`f`).find(t=>t.element===e);if(t?.type!==`img`||t.isGif)return;let n=await zn(d(e)),r=t.srcTexture,i=new T(H(this,W,`f`),n);i.wrapS=r.wrapS,i.wrapT=r.wrapT,i.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=i),t.srcTexture=i,r.dispose()}updateCanvasElement(e){let t=H(this,X,`f`).find(t=>t.element===e);if(t){let n=t.srcTexture,r=new T(H(this,W,`f`),e);r.wrapS=n.wrapS,r.wrapT=n.wrapT,r.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=r),t.srcTexture=r,n.dispose()}}updateHICTexture(e,t){let n=H(this,X,`f`).find(t=>t.element===e);if(n?.type!==`hic`)return;n.frozen&&gs(e,t);let r=n.srcTexture;if(r.source===t)r.needsUpdate=!0;else{let e=new T(H(this,W,`f`),t);e.wrapS=r.wrapS,e.wrapT=r.wrapT,e.needsUpdate=!0,!n.chain&&n.passes.length>0&&(n.passes[0].uniforms.src.value=e),n.srcTexture=e,r.dispose()}}freezeInside(e){return H(this,No,`f`).freezeInside(e,H(this,X,`f`))}isFrozen(e){return H(this,X,`f`).some(t=>t.element===e&&t.frozen)}forceRender(e){let t=H(this,X,`f`).find(t=>t.element===e);return!t||t.forceRender?()=>{}:(t.forceRender=!0,()=>{t.forceRender=!1})}get maxTextureSize(){return H(this,W,`f`).maxTextureSize}isPlaying(){return H(this,Mo,`f`)!==void 0}play(){this.isPlaying()||(V(this,Io,Date.now()/1e3,`f`),V(this,Mo,requestAnimationFrame(H(this,Qo,`f`)),`f`))}get time(){return H(this,Po,`f`)}setTime(e){V(this,Po,e,`f`),V(this,Lo,!0,`f`)}get timeScale(){return H(this,Fo,`f`)}set timeScale(e){V(this,Fo,e,`f`)}stop(){H(this,Mo,`f`)!==void 0&&(cancelAnimationFrame(H(this,Mo,`f`)),V(this,Mo,void 0,`f`))}render(){let e=Date.now()/1e3;H(this,Lo,`f`)?V(this,Lo,!1,`f`):V(this,Po,H(this,Po,`f`)+(e-H(this,Io,`f`))*H(this,Fo,`f`),`f`),V(this,Io,e,`f`);let t=H(this,Po,`f`),n=H(this,Co,`f`);H(this,U,`m`,Go).call(this),n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,H(this,So,`f`).width,H(this,So,`f`).height),n.clear(n.COLOR_BUFFER_BIT);let r=H(this,Z,`f`).right-H(this,Z,`f`).left,i=H(this,Z,`f`).bottom-H(this,Z,`f`).top,a=Jn(0,0,r,i),o=H(this,U,`m`,es).call(this);o&&(H(this,U,`m`,fs).call(this,r,i),H(this,q,`f`)&&(n.bindFramebuffer(n.FRAMEBUFFER,H(this,q,`f`).fbo),n.clear(n.COLOR_BUFFER_BIT),n.bindFramebuffer(n.FRAMEBUFFER,null)));for(let e of H(this,X,`f`)){if(e.frozen){to(e.intersectionState,t);continue}let n=e.element.getBoundingClientRect(),s=e.type===`text`?Hi(n):Vi(n),c=H(this,U,`m`,is).call(this,e,s,t);if(!c.isVisible)continue;if(e.chain){H(this,U,`m`,$o).call(this,e,s,c,t);continue}let l=e.passes[0].uniforms;l.time.value=t-e.startTime,l.resolution.value.set((s.right-s.left)*H(this,Y,`f`),(s.bottom-s.top)*H(this,Y,`f`)),l.mouse.value.set((H(this,Ho,`f`)+H(this,Bo,`f`))*H(this,Y,`f`),(H(this,Uo,`f`)+H(this,Vo,`f`))*H(this,Y,`f`));for(let t of e.passes)for(let[e,n]of Object.entries(t.uniformGenerators))t.uniforms[e].value=n();ps.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(l.src.value.needsUpdate=!0);let u=qn(s,i,H(this,Bo,`f`),H(this,Vo,`f`)),d=qn(c.rectWithOverflow,i,H(this,Bo,`f`),H(this,Vo,`f`));e.backbuffer&&(e.passes[0].uniforms.backbuffer.value=e.backbuffer.texture);{let t=e.isFullScreen?a:d,n=Math.max(1,t.w*H(this,Y,`f`)),r=Math.max(1,t.h*H(this,Y,`f`)),i=Math.max(1,t.w),o=Math.max(1,t.h);for(let t=0;t<e.passes.length-1;t++){let a=e.passes[t];if(!a.size){if(a.backbuffer)a.backbuffer.resize(i,o);else{let t=e.bufferTargets.get(a.target);t&&(t.width!==n||t.height!==r)&&t.setSize(n,r)}}}}let f=new Map;for(let t of e.passes)t.backbuffer&&t.target&&f.set(t.target,t.backbuffer.texture);let p=e.srcTexture;for(let t=0;t<e.passes.length-1;t++){let r=e.passes[t],i=e.isFullScreen?a:d;r.uniforms.src.value=p;for(let[e,t]of f)r.uniforms[e]&&(r.uniforms[e].value=t);for(let[e,t]of Object.entries(r.uniformGenerators))r.uniforms[e]&&(r.uniforms[e].value=t());let o=r.size?Jn(0,0,r.size[0],r.size[1]):Jn(0,0,i.w,i.h),s=bs(n,u,i,r.size,[H(this,Ho,`f`),H(this,Uo,`f`)],[H(this,Bo,`f`),H(this,Vo,`f`)],H(this,Y,`f`));if(r.uniforms.resolution.value.set(...s.resolution),r.uniforms.offset.value.set(...s.offset),r.uniforms.mouse.value.set(...s.mouse),r.backbuffer)H(this,U,`m`,os).call(this,r.pass,r.backbuffer.target,o,r.uniforms,!0),r.backbuffer.swap(),p=r.backbuffer.texture;else{let t=e.bufferTargets.get(r.target);if(!t)continue;H(this,U,`m`,os).call(this,r.pass,t,o,r.uniforms,!0),p=t.texture}r.target&&f.set(r.target,p)}let m=e.passes[e.passes.length-1];m.uniforms.src.value=p,m.uniforms.resolution.value.set(n.width*H(this,Y,`f`),n.height*H(this,Y,`f`)),m.uniforms.offset.value.set(u.x*H(this,Y,`f`),u.y*H(this,Y,`f`)),m.uniforms.mouse.value.set((H(this,Ho,`f`)+H(this,Bo,`f`))*H(this,Y,`f`),(H(this,Uo,`f`)+H(this,Vo,`f`))*H(this,Y,`f`));for(let[e,t]of f)m.uniforms[e]&&(m.uniforms[e].value=t);for(let[e,t]of Object.entries(m.uniformGenerators))m.uniforms[e]&&(m.uniforms[e].value=t());e.backbuffer?(m.uniforms.backbuffer.value=e.backbuffer.texture,e.isFullScreen?(e.backbuffer.resize(r,i),H(this,U,`m`,ss).call(this,e,u.x,u.y),H(this,U,`m`,os).call(this,m.pass,e.backbuffer.target,a,m.uniforms,!0),e.backbuffer.swap(),H(this,G,`f`).setUniforms(e.backbuffer.texture,H(this,Y,`f`),a),H(this,U,`m`,os).call(this,H(this,G,`f`).pass,o&&H(this,q,`f`)||null,a,H(this,G,`f`).uniforms,!1)):(e.backbuffer.resize(d.w,d.h),H(this,U,`m`,ss).call(this,e,e.overflow.left,e.overflow.bottom),H(this,U,`m`,os).call(this,m.pass,e.backbuffer.target,e.backbuffer.getViewport(),m.uniforms,!0),e.backbuffer.swap(),H(this,G,`f`).setUniforms(e.backbuffer.texture,H(this,Y,`f`),d),H(this,U,`m`,os).call(this,H(this,G,`f`).pass,o&&H(this,q,`f`)||null,d,H(this,G,`f`).uniforms,!1))):(H(this,U,`m`,ss).call(this,e,u.x,u.y),H(this,U,`m`,os).call(this,m.pass,o&&H(this,q,`f`)||null,e.isFullScreen?a:d,m.uniforms,!1))}o&&H(this,q,`f`)&&(H(this,J,`f`)&&H(this,Do,`f`)?H(this,U,`m`,us).call(this,a,t):H(this,U,`m`,ds).call(this,a,t))}};xo=new WeakMap,So=new WeakMap,W=new WeakMap,Co=new WeakMap,wo=new WeakMap,To=new WeakMap,G=new WeakMap,K=new WeakMap,q=new WeakMap,Eo=new WeakMap,J=new WeakMap,Do=new WeakMap,Oo=new WeakMap,ko=new WeakMap,Ao=new WeakMap,jo=new WeakMap,Mo=new WeakMap,Y=new WeakMap,X=new WeakMap,No=new WeakMap,Po=new WeakMap,Fo=new WeakMap,Io=new WeakMap,Lo=new WeakMap,Z=new WeakMap,Ro=new WeakMap,zo=new WeakMap,Bo=new WeakMap,Vo=new WeakMap,Ho=new WeakMap,Uo=new WeakMap,Wo=new WeakMap,Ko=new WeakMap,qo=new WeakMap,Qo=new WeakMap,U=new WeakSet,Go=function(){if(typeof window>`u`)return;let e=H(this,So,`f`).ownerDocument,t=e.compatMode===`BackCompat`?e.body:e.documentElement,n=t.clientWidth,r=t.clientHeight,i=window.scrollX,a=window.scrollY,o,s;if(H(this,xo,`f`).fixedCanvas)o=0,s=0;else if(H(this,xo,`f`).wrapper)o=n*H(this,xo,`f`).scrollPadding[0],s=r*H(this,xo,`f`).scrollPadding[1];else{let t=e.body.scrollWidth-(i+n),c=e.body.scrollHeight-(a+r);o=Ds(n*H(this,xo,`f`).scrollPadding[0],0,t),s=Ds(r*H(this,xo,`f`).scrollPadding[1],0,c)}let c=n+o*2,l=r+s*2;(c!==H(this,zo,`f`)[0]||l!==H(this,zo,`f`)[1])&&(H(this,So,`f`).style.width=`${c}px`,H(this,So,`f`).style.height=`${l}px`,H(this,W,`f`).setSize(c,l,H(this,Y,`f`)),V(this,Z,Bi({top:-s,left:-o,right:n+o,bottom:r+s}),`f`),V(this,Ro,Bi({top:0,left:0,right:n,bottom:r}),`f`),V(this,zo,[c,l],`f`),V(this,Bo,o,`f`),V(this,Vo,s,`f`)),H(this,xo,`f`).fixedCanvas||H(this,So,`f`).style.setProperty(`transform`,`translate(${i-o}px, ${a-s}px)`)},Jo=async function(e){if(!H(this,Wo,`f`).get(e.element)){H(this,Wo,`f`).set(e.element,!0);try{let t=e.srcTexture,n=t.source instanceof OffscreenCanvas?t.source:void 0,r=await wr(e.element,e.originalOpacity,n,this.maxTextureSize);if(r.width===0||r.height===0)return;let i=new T(H(this,W,`f`),r);i.wrapS=t.wrapS,i.wrapT=t.wrapT,i.needsUpdate=!0,!e.chain&&e.passes.length>0&&(e.passes[0].uniforms.src.value=i),e.srcTexture=i,t.dispose()}catch(e){console.error(e)}finally{H(this,Wo,`f`).set(e.element,!1)}}},Yo=function(e,t){!H(this,No,`f`).adopt(e,t)&&t!==null&&e.element.style.setProperty(`opacity`,t),H(this,X,`f`).push(e),H(this,X,`f`).sort((e,t)=>e.zIndex-t.zIndex)},Xo=async function(e,t,n,r){t.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified; `effect` takes precedence."),t.overflow!==void 0&&console.warn("[VFX-JS] `overflow` is shader-path only and is ignored by the effect path. Use each effect's own `outputRect` (with `dims.canvasRect` for fullscreen) to control its dst rect.");let i=Array.isArray(n)?[...n]:[n];H(this,U,`m`,ts).call(this,i);let o=e.getBoundingClientRect(),s=As(e)?Hi(o):Vi(o),[c,l]=ys(t.overflow),u=Cs(t.intersection),f=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),p,m,h=!1;if(e instanceof HTMLImageElement){m=`img`;let t=d(e);if(h=!!t.match(/\.gif/i),h){let n=await Ra.create(t,H(this,Y,`f`));ps.set(e,n),p=new T(H(this,W,`f`),n.getCanvas())}else{let e=await zn(t);p=new T(H(this,W,`f`),e)}}else if(e instanceof HTMLVideoElement)p=new T(H(this,W,`f`),e),m=`video`;else if(e instanceof HTMLCanvasElement)a(e)&&r?(p=new T(H(this,W,`f`),r),m=`hic`):(p=new T(H(this,W,`f`),e),m=`canvas`);else{let t=await wr(e,f,void 0,this.maxTextureSize);p=new T(H(this,W,`f`),t),m=`text`}let[ee,te]=Es(t.wrap);p.wrapS=ee,p.wrapT=te,p.needsUpdate=!0;let g=t.autoCrop??!0,ne=hs(m,t.overlay),_=H(this,Po,`f`),v={type:m,element:e,isInViewport:!1,intersectionState:$a(_),width:s.right-s.left,height:s.bottom-s.top,passes:[],bufferTargets:new Map,startTime:_,enterTime:_,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:c,overflow:l,intersection:u,originalOpacity:f,srcTexture:p,zIndex:t.zIndex??0,backbuffer:void 0,autoCrop:g,effectLastRenderTime:_},re=Pi(()=>v.srcTexture,()=>ws(v.srcTexture,`w`),()=>ws(v.srcTexture,`h`)),ie={},ae={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(ae[e]=n,ie[e]=n()):ie[e]=n;v.effectUniformGenerators=ae,v.effectStaticUniforms=ie;let oe={autoCrop:g,glslVersion:t.glslVersion??`300 es`},se=new va(H(this,W,`f`),H(this,wo,`f`),H(this,Y,`f`),i,oe,re,!1,H(this,To,`f`));try{await se.initAll()}catch(t){throw H(this,U,`m`,ns).call(this,i),p.dispose(),e.style.setProperty(`opacity`,f.toString()),t}v.chain=se,H(this,U,`m`,is).call(this,v,s,_),H(this,U,`m`,Yo).call(this,v,ne)},Zo=function(e){let t=t=>t.glslVersion===void 0&&e.glslVersion!==void 0?{...t,glslVersion:e.glslVersion}:t;return Array.isArray(e.shader)?e.shader.map(t):[t({frag:H(this,U,`m`,as).call(this,e.shader||`uvGradient`)})]},$o=function(e,t,n,r){let i=e.chain;if(!i)return;let a=H(this,Y,`f`);ps.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(e.srcTexture.needsUpdate=!0);let o={...e.effectStaticUniforms??{}};if(e.effectUniformGenerators)for(let[t,n]of Object.entries(e.effectUniformGenerators))o[t]=n();let s=H(this,Z,`f`).right-H(this,Z,`f`).left,c=H(this,Z,`f`).bottom-H(this,Z,`f`).top,l=qn(t,c,H(this,Bo,`f`),H(this,Vo,`f`)),u=H(this,Ho,`f`)+H(this,Bo,`f`)-l.x,d=H(this,Uo,`f`)+H(this,Vo,`f`)-l.y,f=t.right-t.left,p=t.bottom-t.top,m=r-(e.effectLastRenderTime??r);e.effectLastRenderTime=r;let h=H(this,U,`m`,es).call(this)&&H(this,q,`f`)?Ii(H(this,q,`f`)):null;i.run({time:r-e.startTime,deltaTime:m,mouse:[u*a,d*a],mouseViewport:[H(this,Ho,`f`)*a,H(this,Uo,`f`)*a],intersection:n.intersection,enterTime:ks(r-e.enterTime),leaveTime:ks(r-e.leaveTime),enterProgress:n.enterProgress,leaveProgress:n.leaveProgress,resolvedUniforms:o,canvasSize:[s,c],canvasBufferSize:[s*a,c*a],elementSize:[f,p],elementBufferSize:[f*a,p*a],elementRectOnCanvasPx:{x:l.x*a,y:l.y*a,w:l.w*a,h:l.h*a},finalTarget:h,isVisible:n.isVisible})},es=function(){return H(this,K,`f`).length>0||H(this,J,`f`)!==null&&H(this,Do,`f`)},ts=function(e){for(let t of e)if(H(this,Oo,`f`).has(t))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");for(let t of e)H(this,Oo,`f`).add(t)},ns=function(e){for(let t of e)H(this,Oo,`f`).delete(t)},rs=function(e){let t=e.hitTestPadBuffer,n=H(this,Y,`f`);return Ri({top:t.top/n,right:t.right/n,bottom:t.bottom/n,left:t.left/n})},is=function(e,t,n){let r=Ui(t,e.chain?H(this,U,`m`,rs).call(this,e.chain):e.overflow),i=e.isFullScreen||vs(H(this,Ro,`f`),r),a=Ui(H(this,Ro,`f`),e.intersection.rootMargin),o=Ki(a,t);xs(e,o,vs(a,t),n);let{enterProgress:s,leaveProgress:c}=e.intersectionState;e.isInViewport=i;let l=i&&n-e.leaveTime<=e.release||e.forceRender===!0&&t.right>t.left&&t.bottom>t.top;return l&&!e.chain&&e.passes.length>0&&Ss(e.passes[0].uniforms,e,o,n),{isVisible:l,intersection:o,rectWithOverflow:r,enterProgress:s,leaveProgress:c}},as=function(e){return e in i?i[e]:e},os=function(e,t,n,r,i){let a=H(this,Co,`f`);i&&t!==null&&t!==H(this,q,`f`)&&(a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.viewport(0,0,t.width,t.height),a.clear(a.COLOR_BUFFER_BIT));let o=r.viewport;o&&o.value instanceof nr&&o.value.set(n.x*H(this,Y,`f`),n.y*H(this,Y,`f`),n.w*H(this,Y,`f`),n.h*H(this,Y,`f`));try{br(a,H(this,wo,`f`),e,t,n,H(this,zo,`f`)[0],H(this,zo,`f`)[1],H(this,Y,`f`))}catch(e){console.error(e)}},ss=function(e,t,n){let r=e.passes[0].uniforms.offset.value;r.x=t*H(this,Y,`f`),r.y=n*H(this,Y,`f`)},cs=function(e){let t=e.length===1&&!(`frag`in e[0])?e[0]:null;if(t&&t.effect!==void 0){H(this,U,`m`,ls).call(this,t,t.effect);return}let n=[],r=[];for(let t of e)`frag`in t&&r.push(t);for(let e=0;e<r.length-1;e++)r[e].target||(r[e]={...r[e],target:`pass${e}`});for(let t of e){let e,r,i;if(`frag`in t)e=t.frag,r=new ho(H(this,W,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,t.size,t.target!==void 0,t.glslVersion),i=t.target;else{if(t.shader===void 0)throw Error("VFXPostEffect requires `shader` (the `effect` path is not implemented yet).");e=H(this,U,`m`,as).call(this,t.shader),r=new ho(H(this,W,`f`),e,t.uniforms,t.persistent??!1,t.float??!1,void 0,!1,t.glslVersion),t.persistent&&r.registerBufferUniform(`backbuffer`),i=void 0}n.push(e);let a={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`&&(a[e]=n);H(this,K,`f`).push({pass:r,target:i,generators:a})}for(let e of r)e.target&&H(this,Eo,`f`).set(e.target,void 0);let i=H(this,K,`f`).map(e=>e.target).filter(e=>e!==void 0);for(let e=0;e<H(this,K,`f`).length;e++)for(let t of i)n[e].match(RegExp(`uniform\\s+sampler2D\\s+${t}\\b`))&&H(this,K,`f`)[e].pass.registerBufferUniform(t)},ls=function(e,t){e.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified on post-effect; `effect` takes precedence.");let n=Array.isArray(t)?[...t]:[t];H(this,U,`m`,ts).call(this,n);let r=Pi(()=>{let e=H(this,q,`f`);if(!e)throw Error(`[VFX-JS] post-effect chain active without target`);return e.texture},()=>H(this,q,`f`)?.width??0,()=>H(this,q,`f`)?.height??0),i={autoCrop:!0,glslVersion:e.glslVersion??`300 es`},a=new va(H(this,W,`f`),H(this,wo,`f`),H(this,Y,`f`),n,i,r,!0,H(this,To,`f`));if(e.uniforms)for(let[t,n]of Object.entries(e.uniforms))typeof n==`function`?(H(this,Ao,`f`)[t]=n,H(this,ko,`f`)[t]=n()):H(this,ko,`f`)[t]=n;V(this,J,a,`f`),V(this,jo,H(this,Po,`f`),`f`),a.initAll().then(()=>{H(this,J,`f`)===a&&V(this,Do,!0,`f`)}).catch(e=>{console.error(`[VFX-JS] Post-effect init failed; post-effect disabled:`,e),H(this,J,`f`)===a&&(H(this,U,`m`,ns).call(this,H(this,J,`f`).effects),H(this,J,`f`).dispose(),V(this,J,null,`f`),V(this,Do,!1,`f`))})},us=function(e,t){let n=H(this,J,`f`);if(!n)return;let r=H(this,Y,`f`),i={...H(this,ko,`f`)};for(let[e,t]of Object.entries(H(this,Ao,`f`)))i[e]=t();let a=H(this,Z,`f`).right-H(this,Z,`f`).left,o=H(this,Z,`f`).bottom-H(this,Z,`f`).top,s=t-H(this,jo,`f`);V(this,jo,t,`f`);let c=[a,o],l=[a*r,o*r],u={x:e.x*r,y:e.y*r,w:e.w*r,h:e.h*r};n.run({time:t,deltaTime:s,mouse:[H(this,Ho,`f`)*r,H(this,Uo,`f`)*r],mouseViewport:[H(this,Ho,`f`)*r,H(this,Uo,`f`)*r],intersection:1,enterTime:0,leaveTime:0,enterProgress:1,leaveProgress:0,resolvedUniforms:i,canvasSize:c,canvasBufferSize:l,elementSize:c,elementBufferSize:l,elementRectOnCanvasPx:u,finalTarget:null,isVisible:!0})},ds=function(e,t){if(!H(this,q,`f`))return;let n=H(this,q,`f`).texture,r=new Map;for(let{pass:e,target:t}of H(this,K,`f`))t&&e.backbuffer&&r.set(t,e.backbuffer.texture);for(let i=0;i<H(this,K,`f`).length;i++){let{pass:a,target:o,generators:s}=H(this,K,`f`)[i],c=i===H(this,K,`f`).length-1,l=H(this,Ho,`f`)+H(this,Bo,`f`),u=H(this,Uo,`f`)+H(this,Vo,`f`),d=a.size;if(d){let[r,i]=d;a.uniforms.src.value=n,a.uniforms.resolution.value.set(r,i),a.uniforms.offset.value.set(0,0),a.uniforms.time.value=t,a.uniforms.mouse.value.set(l/e.w*r,u/e.h*i)}else a.setUniforms(n,H(this,Y,`f`),e,t,l,u);a.uniforms.passIndex.value=i,a.updateCustomUniforms(s);for(let[e,t]of r){let n=a.uniforms[e];n&&(n.value=t)}if(c)a.backbuffer?(a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture),H(this,U,`m`,os).call(this,a.pass,a.backbuffer.target,e,a.uniforms,!0),a.backbuffer.swap(),H(this,G,`f`).setUniforms(a.backbuffer.texture,H(this,Y,`f`),e),H(this,U,`m`,os).call(this,H(this,G,`f`).pass,null,e,H(this,G,`f`).uniforms,!1)):H(this,U,`m`,os).call(this,a.pass,null,e,a.uniforms,!1);else if(a.backbuffer){a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture);let t=d?Jn(0,0,d[0]/H(this,Y,`f`),d[1]/H(this,Y,`f`)):e;H(this,U,`m`,os).call(this,a.pass,a.backbuffer.target,t,a.uniforms,!0),a.backbuffer.swap(),n=a.backbuffer.texture,o&&r.set(o,a.backbuffer.texture)}else{let t=o??`postEffect${i}`,s=H(this,Eo,`f`).get(t),c=d?d[0]:e.w*H(this,Y,`f`),l=d?d[1]:e.h*H(this,Y,`f`);s&&s.width===c&&s.height===l||(s?.dispose(),s=oo(H(this,W,`f`),c,l,{float:a.float}),H(this,Eo,`f`).set(t,s));let u=d?Jn(0,0,d[0]/H(this,Y,`f`),d[1]/H(this,Y,`f`)):e;H(this,U,`m`,os).call(this,a.pass,s,u,a.uniforms,!0),n=s.texture,o&&r.set(o,s.texture)}}},fs=function(e,t){let n=e*H(this,Y,`f`),r=t*H(this,Y,`f`);H(this,q,`f`)&&H(this,q,`f`).width===n&&H(this,q,`f`).height===r||(H(this,q,`f`)?.dispose(),V(this,q,oo(H(this,W,`f`),n,r),`f`));for(let{pass:n}of H(this,K,`f`))n.persistent&&!n.backbuffer?n.initializeBackbuffer(H(this,W,`f`),e,t,H(this,Y,`f`)):n.backbuffer&&n.resizeBackbuffer(e,t)};function vs(e,t){return t.left<=e.right&&t.right>=e.left&&t.top<=e.bottom&&t.bottom>=e.top}function ys(e){return e===!0?[!0,zi]:e===void 0?[!1,zi]:[!1,Ri(e)]}function bs(e,t,n,r,i,a,o){let s=i[0]+a[0]-n.x,c=i[1]+a[1]-n.y;return r?{resolution:[r[0],r[1]],offset:[0,0],mouse:[s/n.w*r[0],c/n.h*r[1]]}:{resolution:[e.width*o,e.height*o],offset:[(t.x-n.x)*o,(t.y-n.y)*o],mouse:[s*o,c*o]}}function xs(e,t,n,r){let i=e.intersectionState,a=i.isIn,o=e.isFullScreen||eo(i,t,n,e.intersection.threshold,e.intersection.leaveThreshold);!a&&o&&(e.enterTime=r,e.leaveTime=1/0),a&&!o&&(e.leaveTime=r),no(i,o,r,e.intersection.duration)}function Ss(e,t,n,r){e.intersection.value=n,e.enterTime.value=ks(r-t.enterTime),e.leaveTime.value=ks(r-t.leaveTime),e.enterProgress.value=t.intersectionState.enterProgress,e.leaveProgress.value=t.intersectionState.leaveProgress}function Cs(e){let t=e?.threshold??0,n=Ri(e?.rootMargin??0),r=e?.leaveThreshold??t,i=e?.duration??1;return Number.isFinite(i)&&i>0||(ms||(ms=!0,console.warn(`[VFX-JS] \`intersection.duration\` must be a finite number above 0, got ${i}. Using 1 instead.`)),i=1),{threshold:t,leaveThreshold:r,rootMargin:n,duration:i}}function ws(e,t){let n=e.source;if(!n)return 0;if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return t===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return t===`w`?n.videoWidth:n.videoHeight;let r=n;return t===`w`?r.width:r.height}function Ts(e){return e===`repeat`?`repeat`:e===`mirror`?`mirror`:`clamp`}function Es(e){if(!e)return[`clamp`,`clamp`];if(Array.isArray(e))return[Ts(e[0]),Ts(e[1])];let t=Ts(e);return[t,t]}function Ds(e,t,n){return Math.max(t,Math.min(n,e))}var Os=1e6;function ks(e){return Ds(e,-1e6,Os)}function As(e){return!(e instanceof HTMLImageElement||e instanceof HTMLVideoElement||e instanceof HTMLCanvasElement)}function js(){try{let e=document.createElement(`canvas`);return(e.getContext(`webgl2`)||e.getContext(`webgl`))!==null}catch{return!1}}var Ms=function(e,t,n,r,i){if(r===`m`)throw TypeError(`Private method is not writable`);if(r===`a`&&!i)throw TypeError(`Private accessor was defined without a setter`);if(typeof t==`function`?e!==t||!i:!t.has(e))throw TypeError(`Cannot write private member to an object whose class did not declare it`);return r===`a`?i.call(e,n):i?i.value=n:t.set(e,n),n},Q=function(e,t,n,r){if(n===`a`&&!r)throw TypeError(`Private accessor was defined without a getter`);if(typeof t==`function`?e!==t||!r:!t.has(e))throw TypeError(`Cannot read private member from an object whose class did not declare it`);return n===`m`?r:n===`a`?r.call(e):r?r.value:t.get(e)},Ns,$,Ps,Fs,Is,Ls,Rs,zs,Bs,Vs,Hs,Us;function Ws(){if(typeof window>`u`)throw`Cannot find 'window'. VFX-JS only runs on the browser.`;if(typeof document>`u`)throw`Cannot find 'document'. VFX-JS only runs on the browser.`}function Gs(e){return{position:e?`fixed`:`absolute`,top:0,left:0,width:`0px`,height:`0px`,"z-index":9999,"pointer-events":`none`}}var Ks=class e{static init(t){try{return new e(t)}catch{return null}}constructor(e={}){if(Ns.add(this),$.set(this,void 0),Ps.set(this,void 0),Fs.set(this,new Map),Is.set(this,new Set),Ws(),!js())throw Error(`[VFX-JS] WebGL is not available in this environment.`);let t=En(e),n=document.createElement(`canvas`),r=Gs(t.fixedCanvas);for(let[e,t]of Object.entries(r))n.style.setProperty(e,t.toString());t.zIndex!==void 0&&n.style.setProperty(`z-index`,t.zIndex.toString()),(t.wrapper??document.body).appendChild(n),Ms(this,Ps,n,`f`),Ms(this,$,new _s(t,n),`f`),t.autoplay&&Q(this,$,`f`).play()}async add(e,t,n){e instanceof HTMLImageElement?await Q(this,Ns,`m`,Bs).call(this,e,t):e instanceof HTMLVideoElement?await Q(this,Ns,`m`,Vs).call(this,e,t):e instanceof HTMLCanvasElement?a(e)&&n?await Q(this,Ns,`m`,zs).call(this,e,t,n):await Q(this,Ns,`m`,Hs).call(this,e,t):await Q(this,Ns,`m`,Us).call(this,e,t)}updateHICTexture(e,t){Q(this,$,`f`).updateHICTexture(e,t)}get maxTextureSize(){return Q(this,$,`f`).maxTextureSize}get canvas(){return Q(this,Ps,`f`)}addHTML(e,t){return Q(this,Ns,`m`,Ls).call(this,e,t,!1)}addHTMLWithStill(e,t){return Q(this,Ns,`m`,Ls).call(this,e,t,!0)}addTransition(e,t={}){let n=new Tn(this,e,t,()=>Q(this,Is,`f`).delete(n));return Q(this,Is,`f`).add(n),n}freezeInside(e){return Q(this,$,`f`).freezeInside(e)}lockSize(e){let t=Q(this,Fs,`f`).get(e);return t?Ce(t):()=>{}}forceRender(e){let t=Q(this,Fs,`f`).get(e)??e;return Q(this,$,`f`).forceRender(t)}remove(e){let t=Q(this,Fs,`f`).get(e);t?(je(t,e),Q(this,Fs,`f`).delete(e),Q(this,$,`f`).removeElement(t)):Q(this,$,`f`).removeElement(e)}updateEffects(e,t){let n=Q(this,Fs,`f`).get(e)??e;return Q(this,$,`f`).updateElementEffects(n,t)}async update(e){await this.updateInTime(e)}async updateInTime(e){let t=Q(this,Fs,`f`).get(e)??(e instanceof HTMLCanvasElement?e:null);return(t?Se(t):void 0)||(e instanceof HTMLImageElement?await Q(this,$,`f`).updateImageElement(e):e instanceof HTMLCanvasElement?Q(this,$,`f`).updateCanvasElement(e):await Q(this,$,`f`).updateTextElement(e),!0)}play(){Q(this,$,`f`).play()}stop(){Q(this,$,`f`).stop()}render(){Q(this,$,`f`).render()}get time(){return Q(this,$,`f`).time}setTime(e){Q(this,$,`f`).setTime(e)}get timeScale(){return Q(this,$,`f`).timeScale}set timeScale(e){Q(this,$,`f`).timeScale=e}destroy(){for(let e of Q(this,Is,`f`))e.destroy();Q(this,Is,`f`).clear();for(let[e,t]of Q(this,Fs,`f`))je(t,e);Q(this,Fs,`f`).clear(),Q(this,$,`f`).destroy(),Q(this,Ps,`f`).remove()}};$=new WeakMap,Ps=new WeakMap,Fs=new WeakMap,Is=new WeakMap,Ns=new WeakSet,Ls=async function(e,t,n){if(!Ne())return console.warn(`html-in-canvas not supported, falling back to dom-to-canvas`),this.add(e,t);t.overlay!==void 0&&console.warn(`addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.`);let{overlay:r,...i}=t,a=Q(this,Fs,`f`).get(e);a&&Q(this,$,`f`).removeElement(a);let{canvas:o,initialCapture:s}=await Ae(e,{onCapture:e=>{Q(this,$,`f`).updateHICTexture(o,e)},maxSize:Q(this,$,`f`).maxTextureSize,stillCover:n?{zIndex:Q(this,Ns,`m`,Rs).call(this)}:void 0});a=o,Q(this,Fs,`f`).set(e,a),await Q(this,Ns,`m`,zs).call(this,a,i,s)},Rs=function(){let e=Number.parseInt(Q(this,Ps,`f`).style.zIndex,10);return Number.isNaN(e)?9998:e-1},zs=async function(e,t,n){try{await Q(this,$,`f`).addElement(e,t,n)}finally{Te(e,Q(this,$,`f`).isFrozen(e))}},Bs=function(e,t){return e.complete?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`load`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},Vs=function(e,t){return e.readyState>=3?Q(this,$,`f`).addElement(e,t):new Promise(n=>{e.addEventListener(`canplay`,()=>{Q(this,$,`f`).addElement(e,t),n()},{once:!0})})},Hs=function(e,t){return Q(this,$,`f`).addElement(e,t)},Us=function(e,t){return Q(this,$,`f`).addElement(e,t)};export{Ks as t};
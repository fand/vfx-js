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

        outColor *= color.a;
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

        outColor *= color.a;
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
    `},i={...r,slitScanTransition:r.slitScanReveal,warpTransition:r.warpReveal,pixelateTransition:r.pixelateReveal,focusTransition:r.focusReveal};function a(e){return e.tagName===`CANVAS`&&(e.hasAttribute(`layoutsubtree`)||e.getAttribute(`content`)===`drawable`)}function o(e,t){e.setAttribute(`layoutsubtree`,``),e.setAttribute(`content`,`drawable`),t?.setAttribute(`drawable`,``)}function s(e,t,n,r){if(t.width<=0||t.height<=0)return null;let i=t.left-e.left,a=t.top-e.top;return i+t.width<=0||a+t.height<=0||i>=e.width||a>=e.height?null:[i*n,a*r,t.width*n,t.height*r]}function c(e){let t=e.getBoundingClientRect(),n=getComputedStyle(e),r=Number.parseFloat(n.paddingLeft)||0,i=Number.parseFloat(n.paddingRight)||0,a=Number.parseFloat(n.paddingTop)||0,o=Number.parseFloat(n.paddingBottom)||0,s=e.clientWidth>0?t.width/e.offsetWidth:1,c=e.clientHeight>0?t.height/e.offsetHeight:1;return{left:t.left+(e.clientLeft+r)*s,top:t.top+(e.clientTop+a)*c,width:Math.max(0,e.clientWidth-r-i)*s,height:Math.max(0,e.clientHeight-a-o)*c}}function l(e){return typeof e.checkVisibility==`function`?e.checkVisibility({visibilityProperty:!0,opacityProperty:!0}):getComputedStyle(e).visibility!==`hidden`}function u(e,t){let n=t.querySelectorAll(`canvas`);if(n.length===0)return;let r=t.getBoundingClientRect();if(r.width<=0||r.height<=0)return;let i=e.canvas.width/r.width,a=e.canvas.height/r.height;for(let t of n){if(t.width===0||t.height===0||!l(t))continue;let n=s(r,c(t),i,a);if(n)try{e.drawImage(t,...n)}catch{}}}function d(e){return e.currentSrc||e.src}function f(e,t){let n=e.getBoundingClientRect(),r=e.cloneNode(!0),i=[e,...e.querySelectorAll(`*`)],a=[r,...r.querySelectorAll(`*`)],o=[],s=[];for(let e=0;e<i.length&&e<a.length;e++){let t=i[e],n=a[e];(t.scrollTop||t.scrollLeft)&&o.push([n,t.scrollTop,t.scrollLeft]),t instanceof HTMLScriptElement?s.push([n,document.createComment(`script`)]):t instanceof HTMLCanvasElement||t instanceof HTMLVideoElement?s.push([n,h(t)]):t instanceof HTMLIFrameElement?s.push([n,g(t)]):t instanceof HTMLInputElement&&n instanceof HTMLInputElement?(n.value=t.value,n.checked=t.checked):t instanceof HTMLTextAreaElement&&n instanceof HTMLTextAreaElement?n.value=t.value:t instanceof HTMLSelectElement&&n instanceof HTMLSelectElement?n.selectedIndex=t.selectedIndex:t instanceof HTMLMediaElement&&n.removeAttribute(`autoplay`)}for(let[e,t]of s)e.replaceWith(t);r.setAttribute(`aria-hidden`,`true`);let c=r.style;c.setProperty(`position`,`fixed`),c.setProperty(`left`,`${n.left}px`),c.setProperty(`top`,`${n.top}px`),c.setProperty(`width`,`${n.width}px`),c.setProperty(`height`,`${n.height}px`),c.setProperty(`box-sizing`,`border-box`),c.setProperty(`margin`,`0`),c.setProperty(`pointer-events`,`none`),c.setProperty(`z-index`,t.toString()),e.parentNode?.insertBefore(r,e);let l=r.getBoundingClientRect();(l.left!==n.left||l.top!==n.top)&&(c.setProperty(`left`,`${n.left*2-l.left}px`),c.setProperty(`top`,`${n.top*2-l.top}px`));for(let[e,t,n]of o)e.scrollTop=t,e.scrollLeft=n;return p(i,a),()=>{r.remove()}}function p(e,t){let n=e[0],r=t[0];if(!n||!r||typeof n.getAnimations!=`function`)return;let i=(e,t)=>{if(!(`animationName`in e))return null;let n=e.effect,r=n?.target,i=r?t.get(r):void 0;return i===void 0?null:`${i}|${n?.pseudoElement??``}|${e.animationName}`},a=new Map(t.map((e,t)=>[e,t])),o=new Map;for(let e of r.getAnimations({subtree:!0})){let t=i(e,a);t&&o.set(t,e)}let s=new Map(e.map((e,t)=>[e,t]));for(let e of n.getAnimations({subtree:!0})){let t=i(e,s),n=t&&o.get(t);n&&(n.currentTime=e.currentTime,n.pause())}}function m(e,t){let n=e.getBoundingClientRect(),r=getComputedStyle(e);t.className=e.className,t.style.cssText=e.style.cssText,t.style.width=`${n.width}px`,t.style.height=`${n.height}px`,t.style.display=r.display===`inline`?`inline-block`:r.display,t.style.boxSizing=`border-box`}function h(e){let t=document.createElement(`canvas`),n=e instanceof HTMLVideoElement?e.videoWidth:e.width,r=e instanceof HTMLVideoElement?e.videoHeight:e.height;t.width=Math.max(1,n),t.height=Math.max(1,r),m(e,t);try{t.getContext(`2d`)?.drawImage(e,0,0,t.width,t.height)}catch{}return t}function g(e){let t=document.createElement(`div`);return m(e,t),t}function _(e){let t=d(e);if(!t||t.startsWith(`data:`))return!1;try{return new URL(t,location.href).origin!==location.origin}catch{return!1}}async function v(e){let t=await(await fetch(e)).blob();return URL.createObjectURL(t)}async function y(e){let t=Array.from(e.querySelectorAll(`img`)).filter(e=>e.complete&&e.naturalWidth>0&&_(e));if(t.length===0)return()=>{};let n=new Map,r=[];return await Promise.all(t.map(async e=>{try{let t=d(e),i=await v(t);n.set(e,t),r.push(i),await new Promise(t=>{e.addEventListener(`load`,()=>t(),{once:!0}),e.src=i})}catch{}})),()=>{for(let[e,t]of n)e.src=t;for(let e of r)URL.revokeObjectURL(e)}}var b=[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`],x=new Set([`IMG`,`VIDEO`,`CANVAS`,`IFRAME`,`EMBED`,`OBJECT`,`INPUT`,`TEXTAREA`,`SELECT`]),S=[`position`,`top`,`right`,`bottom`,`left`,`float`,`flex`,`flex-grow`,`flex-shrink`,`flex-basis`,`align-self`,`justify-self`,`place-self`,`order`,`grid-column`,`grid-column-start`,`grid-column-end`,`grid-row`,`grid-row-start`,`grid-row-end`,`grid-area`],C=new Set([`top`,`right`,`bottom`,`left`]),w=[`width`,`height`,`flex-grow`,`flex-shrink`,`min-width`,`max-width`,`overflow`],T=new WeakMap,E=new WeakMap,D=new WeakMap,ee=new WeakMap,te=new WeakMap,ne=new WeakMap,re=new WeakMap,ie=new WeakMap,ae=new WeakMap,oe=new WeakSet,se=new WeakMap,O=new WeakMap,k=new WeakSet,ce=new WeakSet,le=300,ue=/^[\d.e+-]+px$/;function de(e,t){return new Promise(n=>{let r=t=>{clearTimeout(a),e.delete(i),n(t)},i=()=>r(!0),a=setTimeout(()=>r(!1),t);e.add(i)})}function fe(e){if(e)for(let t of[...e])t()}function A(e,t,n){if(typeof e.moveBefore==`function`)try{e.moveBefore(t,n);return}catch{}e.insertBefore(t,n)}function pe(e,t=le){let n=O.get(e);if(!n)return;let r=de(n,t);return e.requestPaint(),r}function me(e){if(k.has(e))return()=>{};k.add(e);let t=w.map(t=>[t,e.style.getPropertyValue(t)]),n=getComputedStyle(e),r=e.getBoundingClientRect(),i=(e,t)=>ue.test(e)?e:`${t}px`,a=i(n.width,r.width);return e.style.setProperty(`width`,a),e.style.setProperty(`height`,i(n.height,r.height)),e.style.setProperty(`flex-grow`,`0`),e.style.setProperty(`flex-shrink`,`0`),e.style.setProperty(`min-width`,a),e.style.setProperty(`max-width`,a),e.style.setProperty(`overflow`,`hidden`),()=>{if(!k.has(e))return;k.delete(e);for(let[n,r]of t)e.style.setProperty(n,r);let n=e.firstElementChild;if(n&&!ce.has(e)){let t=Math.round(n.getBoundingClientRect().height);e.style.setProperty(`height`,`${t}px`)}}}function he(e){se.get(e)?.(),se.delete(e)}function ge(e,t=!1){requestAnimationFrame(()=>{t||e.getContext(`2d`)?.clearRect(0,0,e.width,e.height),he(e)})}async function _e(e,t){o(e,e.firstElementChild);let n=e.getContext(`2d`);if(!n)throw Error(`Failed to get 2d context from layoutsubtree canvas`);let{onCapture:r,maxSize:i,keepDrawn:a}=t,s=new Set;O.set(e,s);let c=null,l=null,d=new Promise(e=>{l=e}),f=null,p=t=>{if(t){if(t===f)return;f=t}let o=e.firstElementChild;if(!o||e.width===0||e.height===0||o.getClientRects().length===0)return;o.hasAttribute(`drawable`)||o.setAttribute(`drawable`,``),n.clearRect(0,0,e.width,e.height),n.drawElementImage(o,0,0),u(n,o);let d=e.width,p=e.height;if(i&&(d>i||p>i)){let e=Math.min(i/d,i/p);d=Math.floor(d*e),p=Math.floor(p*e)}c&&c.width===d&&c.height===p||(c=new OffscreenCanvas(d,p));let m=c.getContext(`2d`);m&&(m.clearRect(0,0,d,p),m.drawImage(e,0,0,d,p),l?(l(c),l=null,fe(s)):(a||n.clearRect(0,0,e.width,e.height),r(c),fe(s)))};e.onpaint=p,e.addEventListener(`paint`,p),E.set(e,p);let m=new ResizeObserver(t=>{for(let n of t){let t=n.devicePixelContentBoxSize?.[0];if(t)e.width=t.inlineSize,e.height=t.blockSize;else{let t=n.borderBoxSize?.[0];if(t){let n=window.devicePixelRatio;e.width=Math.round(t.inlineSize*n),e.height=Math.round(t.blockSize*n)}}}e.requestPaint()});m.observe(e,{box:`device-pixel-content-box`}),T.set(e,m);let h=e.firstElementChild;if(h){let t=new ResizeObserver(t=>{if(k.has(e)||ce.has(e))return;let n=t[0].borderBoxSize?.[0];if(!n)return;let r=`${Math.round(n.blockSize)}px`;r!==e.style.height&&e.style.setProperty(`height`,r)});t.observe(h),D.set(e,t)}return d}function ve(e){e.onpaint=null,fe(O.get(e)),O.delete(e);let t=E.get(e);t&&(e.removeEventListener(`paint`,t),E.delete(e));let n=T.get(e);n&&(n.disconnect(),T.delete(e));let r=D.get(e);r&&(r.disconnect(),D.delete(e))}function ye(e){let t={width:null,height:null};if(typeof e.computedStyleMap!=`function`||x.has(e.tagName))return t;let n=e.computedStyleMap(),r=e=>n.get(e)?.toString()??`auto`,i=r(`position`);if(i!==`fixed`&&i!==`absolute`)return t;let a=(t,n,i)=>{let a=r(n),o=r(i);return r(t)!==`auto`||a===`auto`||o===`auto`?null:`calc(${[`100%`,a,o,...[`margin-${n}`,`margin-${i}`].map(n=>{let i=r(n);return t===`height`&&i.includes(`%`)?getComputedStyle(e).getPropertyValue(n):i}).filter(e=>e!==`auto`)].join(` - `)})`};return{width:a(`width`,`left`,`right`),height:a(`height`,`top`,`bottom`)}}var be=[`padding-left`,`padding-right`],xe=[`border-left-width`,`border-right-width`];function Se(e,t){let n=e=>({width:`${e}px`,minWidth:`auto`,maxWidth:`none`});if(typeof e.computedStyleMap!=`function`)return e.style.width.endsWith(`px`)?n(t.width):null;let r=e.computedStyleMap(),i=e=>r.get(e)?.toString()??`auto`,a=x.has(e.tagName),o=getComputedStyle(e),s=i(`width`);if(s===`auto`){if(!a)return null;s=o.width}if(!ue.test(s))return null;let c=i(`display`);if(!a&&c===`inline`)return n(t.width);let l=i(`min-width`),u=i(`max-width`);if(c===`table`||c===`inline-table`||!Ce(l,`auto`)||!Ce(u,`none`))return n(we(o));let d=[...be.map(i),...xe.map(e=>o.getPropertyValue(e))].filter(e=>e!==``&&!/^0(px)?$/.test(e)),f=e=>{if(d.length===0)return e;let t=[e,...d].join(` + `);return i(`box-sizing`)===`border-box`?`max(${e}, ${t.slice(e.length+3)})`:`calc(${t})`};return{width:f(s),minWidth:l===`auto`?`auto`:f(l),maxWidth:u===`none`?`none`:f(u)}}function Ce(e,t){return e===t||ue.test(e)||/^[\d.e+-]+%$/.test(e)||/^(calc|min|max|clamp)\(/.test(e)}function we(e){let t=t=>Number.parseFloat(e.getPropertyValue(t))||0,n=Number.parseFloat(e.width)||0;if(e.boxSizing!==`border-box`)for(let e of[...be,...xe])n+=t(e);return n}async function Te(e,t,n){let r=e.getBoundingClientRect(),i=ye(e),a=i.width?null:Se(e,r),s=document.createElement(`canvas`);e.hasAttribute(`drawable`)||oe.add(e),o(s,e),s.className=e.className;let c=e.getAttribute(`style`);c&&s.setAttribute(`style`,c),s.style.setProperty(`padding`,`0`),s.style.setProperty(`border`,`none`),s.style.setProperty(`box-sizing`,`content-box`),s.style.setProperty(`background`,`transparent`);let l=getComputedStyle(e),u=l.display===`inline`?`block`:l.display;s.style.setProperty(`display`,u);let d=typeof e.computedStyleMap==`function`?e.computedStyleMap():null,p=e=>d?.get(e)?.toString()??l.getPropertyValue(e),m=e=>l.getPropertyValue(e),h=!!(i.width||a);for(let e of b){let t=e!==`margin-left`&&e!==`margin-right`||h;s.style.setProperty(e,t?p(e):m(e))}let g=l.position===`absolute`||l.position===`fixed`,_=(e,t)=>g&&p(e)===`auto`&&p(t)===`auto`,v=_(`left`,`right`),x=_(`top`,`bottom`);for(let e of S){let t=m(e);C.has(e)&&(t=(e===`left`||e===`right`?v:x)?m(e):p(e)),s.style.setProperty(e,t)}i.width?s.style.setProperty(`width`,i.width):a?(s.style.setProperty(`width`,a.width),s.style.setProperty(`min-width`,a.minWidth),s.style.setProperty(`max-width`,a.maxWidth)):s.style.setProperty(`width`,`100%`),i.height?(s.style.setProperty(`height`,i.height),ce.add(s)):s.style.height||s.style.setProperty(`height`,`${r.height}px`);let w=window.devicePixelRatio;s.width=Math.round(r.width*w),s.height=Math.round(r.height*w),t.stillCover&&se.set(s,f(e,t.stillCover.zIndex)),ee.set(e,e.style.margin),te.set(e,e.style.width),ne.set(e,e.style.boxSizing),e.parentNode?.insertBefore(s,e),getComputedStyle(s).display,A(s,e,null),e.style.setProperty(`margin`,`0`),e.style.setProperty(`width`,`100%`),e.style.setProperty(`box-sizing`,`border-box`),(i.width||i.height)&&(re.set(e,e.style.position),e.style.setProperty(`position`,`static`)),i.height&&(ie.set(e,e.style.height),e.style.setProperty(`height`,`100%`));let T=await y(e);if(n?.aborted)throw T(),Error(`[VFX-JS] Wrapping was aborted.`);ae.set(s,T);let E=await _e(s,t);if(n?.aborted)throw ve(s),Error(`[VFX-JS] Wrapping was aborted.`);return{canvas:s,initialCapture:E}}function Ee(e,t){ve(e),he(e);let n=ae.get(e);n&&(n(),ae.delete(e));let r=e.parentNode;r&&t.parentNode===e&&A(r,t,e),e.remove(),oe.has(t)&&(t.removeAttribute(`drawable`),oe.delete(t));let i=ee.get(t);i!==void 0&&(t.style.margin=i,ee.delete(t));let a=te.get(t);a!==void 0&&(t.style.width=a,te.delete(t));let o=ne.get(t);o!==void 0&&(t.style.boxSizing=o,ne.delete(t));let s=re.get(t);s!==void 0&&(t.style.position=s,re.delete(t));let c=ie.get(t);c!==void 0&&(t.style.height=c,ie.delete(t))}var j;function De(){if(j!==void 0)return j;try{let e=document.createElement(`canvas`),t=e.getContext(`2d`);j=t!==null&&typeof t.drawElementImage==`function`&&typeof e.requestPaint==`function`}catch{j=!1}return j}var Oe=`#version 300 es
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
vec4 readFrom(vec2 p) {
  if (!inRange(p)) return vec4(0.0);
  return reverse > 0.5 ? texture(src, srcRectUv.xy + p * srcRectUv.zw) : texture(from, p);
}
vec4 readTo(vec2 p) {
  if (!inRange(p)) return vec4(0.0);
  return reverse > 0.5 ? texture(from, p) : texture(src, srcRectUv.xy + p * srcRectUv.zw);
}
`,ke=`
void main() {
  outColor = transition(uvContent, reverse > 0.5 ? 1.0 - t : t);
}
`;function Ae(e){return`${Oe}\n${e}\n${ke}`}var je=Oe.split(`
`).length;function Me(e){let t=e instanceof Error?e.message:String(e);if(!/compile failed|link failed/i.test(t))return null;let n=[];for(let e of t.matchAll(/ERROR:\s*\d+:(\d+):\s*(.*)/g)){let t=Number(e[1])-je;n.push(t>=1?`line ${t}: ${e[2]}`:e[2])}return n.length>0?n:[t.split(`
`)[0]]}var Ne=new Map;function Pe(e){let t=Ne.get(e);return t===void 0&&(t=Ae(e),Ne.set(e,t)),t}var Fe=new WeakMap;function Ie(e){let t=Fe.get(e);return t||(t=new Set,Fe.set(e,t)),t}function Le(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return n<=o&&r<=s&&n+i>=o+c&&r+a>=s+l}function Re(e,t){let n=Me(t);n?(console.error(`[VFX-JS] transition "${e}" failed to compile; cutting to the new content.\n  ${n.join(`
  `)}`),console.debug(t)):console.error(`[VFX-JS] transition "${e}" failed; cutting to the new content.`,t)}var ze=class{ease;overflow;params;#e=null;constructor(e={}){this.params=e}uniforms(e){return{}}start(e){this.#e=e}end(){this.#e=null}outputRect(e){let t=this.#e?.overflow??this.overflow;if(t===void 0||Le(e.contentRect,e.canvasRect))return;if(t===!0)return e.canvasRect;let n=t*e.pixelRatio,[r,i,a,o]=e.contentRect;return[r-n,i-n,a+n*2,o+n*2]}render(e){if(e.holding){e.blit(e.src);return}let t=Pe(this.frag),n=Ie(e.gl);if(n.has(t))e.cut(),e.blit(e.src);else try{e.draw({frag:t,uniforms:{...this.uniforms(e),from:e.from,src:e.src,t:e.progress.t,reverse:+!!e.reverse,resolution:[e.dims.elementPixel[0],e.dims.elementPixel[1]],time:e.time},target:e.target})}catch(r){n.add(t),Re(this.name,r),e.cut(),e.blit(e.src)}}},Be=class extends ze{name=`crossfade`;frag=`
vec4 transition(vec2 uv, float t) {
  return mix(readFrom(uv), readTo(uv), t);
}
`},Ve=e=>{let t=document.implementation.createHTMLDocument(`test`),n=t.createRange();n.selectNodeContents(t.documentElement),n.deleteContents();let r=document.createElement(`head`);return t.documentElement.appendChild(r),t.documentElement.appendChild(n.createContextualFragment(e)),t.documentElement.setAttribute(`xmlns`,t.documentElement.namespaceURI),new XMLSerializer().serializeToString(t).replace(/<!DOCTYPE html>/,``)};async function M(e,t,n,r){let i=e.getBoundingClientRect(),a=window.devicePixelRatio,o=Math.ceil(i.width),s=Math.ceil(i.height),c=o*a,l=s*a,u=1,d=c,f=l;r&&(d>r||f>r)&&(u=Math.min(r/d,r/f),d=Math.floor(d*u),f=Math.floor(f*u));let p=n&&n.width===d&&n.height===f?n:new OffscreenCanvas(d,f),m=e.cloneNode(!0);await We(e,m),Ge(e,m),m.style.setProperty(`opacity`,t.toString()),m.style.setProperty(`margin`,`0px`),Ke(m),qe(e,m),m.style.setProperty(`box-sizing`,`border-box`),m.style.setProperty(`width`,`${o}px`),m.style.setProperty(`height`,`${s}px`);let h=m.outerHTML,g=`<svg xmlns="http://www.w3.org/2000/svg" width="${c}" height="${l}"><foreignObject width="100%" height="100%">${Ve(h)}</foreignObject></svg>`,_=await new Promise(e=>{let t=new Image;t.onload=()=>e(t),t.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(g)}`}),v=p.getContext(`2d`);if(v===null)throw Error(`[VFX-JS] Failed to get 2D context`);let y=()=>{v.clearRect(0,0,d,f);let e=a*u;v.scale(e,e),v.drawImage(_,0,0,c,l),v.setTransform(1,0,0,1,0,0)};if(y(),Ue()&&m.querySelector(`img`))for(let e=0;e<He;e++)await new Promise(e=>setTimeout(e,16)),y();return p}var He=3;function Ue(){let e=navigator.userAgent;return/AppleWebKit/.test(e)&&!/Chrome\/|Chromium\//.test(e)}async function We(e,t){let n=window.getComputedStyle(e);for(let e of Array.from(n))/(-inline-|-block-|^inline-|^block-)/.test(e)||/^-webkit-.*(start|end|before|after|logical)/.test(e)||t.style.setProperty(e,n.getPropertyValue(e),n.getPropertyPriority(e));if(t.tagName===`INPUT`)t.setAttribute(`value`,t.value);else if(t.tagName===`TEXTAREA`)t.innerHTML=t.value;else if(t.tagName===`IMG`)try{t.src=await Xe(d(e))}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];await We(r,i)}}function Ge(e,t){if(typeof e.computedStyleMap==`function`)try{let n=e.computedStyleMap();for(let e of[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`]){let r=n.get(e);r instanceof CSSKeywordValue&&r.value===`auto`&&t.style.setProperty(e,`auto`)}}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];r instanceof HTMLElement&&i instanceof HTMLElement&&Ge(r,i)}}function Ke(e){let t=e;for(;;){let e=t.style;if(Number.parseFloat(e.paddingTop)>0||Number.parseFloat(e.borderTopWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.firstElementChild;if(!n)break;n.style.setProperty(`margin-top`,`0px`),t=n}for(t=e;;){let e=t.style;if(Number.parseFloat(e.paddingBottom)>0||Number.parseFloat(e.borderBottomWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.lastElementChild;if(!n)break;n.style.setProperty(`margin-bottom`,`0px`),t=n}}function qe(e,t){let n=-e.scrollLeft,r=-e.scrollTop;for(let i=0;i<e.children.length;i++){let a=e.children[i],o=t.children[i];a&&(o instanceof HTMLElement||o instanceof SVGElement)&&((n!==0||r!==0)&&Je(o,n,r),qe(a,o))}}function Je(e,t,n){let r=e.style.getPropertyValue(`translate`),[i=`0px`,a=`0px`,o]=r&&r!==`none`?Ye(r):[],s=`calc(${i} + ${t}px) calc(${a} + ${n}px)`;e.style.setProperty(`translate`,o?`${s} ${o}`:s)}function Ye(e){let t=[],n=0,r=``;for(let i of e.trim())i===`(`?n++:i===`)`&&n--,i===` `&&n===0?(r&&t.push(r),r=``):r+=i;return r&&t.push(r),t}async function Xe(e){let t=await fetch(e).then(e=>e.blob());return new Promise(e=>{let n=new FileReader;n.onload=function(){e(this.result)},n.readAsDataURL(t)})}var N=class{gl;texture;wrapS=`clamp`;wrapT=`clamp`;minFilter=`linear`;magFilter=`linear`;needsUpdate=!0;premultiplyAlpha=!1;source=null;#e;#t=!1;#n;#r;constructor(e,t,n){this.#e=e,this.gl=e.gl;let r=n?.externalHandle;this.#r=r!==void 0,r===void 0?this.#i():(this.texture=r,this.#t=!0,this.needsUpdate=!1),t&&(this.source=t),this.#n=n?.autoRegister!==!1&&!this.#r,this.#n&&e.addResource(this)}#i(){let e=this.gl.createTexture();if(!e)throw Error(`[VFX-JS] Failed to create texture`);this.texture=e}restore(){this.#r||(this.#i(),this.#t=!1,this.needsUpdate=!0)}bind(e){let t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&=(this.#a(!1),!1)}upload(e){let t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.#a(!0),this.needsUpdate=!1}#a(e){let t=this.gl,n=this.source;if(t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,!0),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,this.premultiplyAlpha),t.pixelStorei(t.UNPACK_ALIGNMENT,4),n)try{t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,n)}catch(t){if(e)throw t;console.error(t)}else if(!this.#t){let e=new Uint8Array([0,0,0,0]);t.texImage2D(t.TEXTURE_2D,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,e)}this.#o(),this.#t=!0}#o(){let e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,Ze(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,Ze(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,Qe(e,this.minFilter)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,Qe(e,this.magFilter))}dispose(){this.#n&&this.#e.removeResource(this),this.#r||this.gl.deleteTexture(this.texture)}};function Ze(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function Qe(e,t){return t===`nearest`?e.NEAREST:e.LINEAR}function $e(e){return new Promise((t,n)=>{let r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>t(r),r.onerror=n,r.src=e})}var et=new WeakSet,P=class{gl;width;height;float;mipmap;depth;samples;fbo;resolveFbo=null;texture;depthTexture;#e;#t=0;#n;#r=null;#i=null;#a=!1;#o=!1;constructor(e,t,n,r={}){this.#e=e,this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(n)),this.float=r.float??!1,this.mipmap=r.mipmap??!1,this.depth=r.depth??!1,this.#n=r.samples===4,this.samples=this.#n&&this.#s()?4:1,this.texture=new N(e,void 0,{autoRegister:!1});let i=r.wrap;i!==void 0&&(typeof i==`string`?(this.texture.wrapS=i,this.texture.wrapT=i):(this.texture.wrapS=i[0],this.texture.wrapT=i[1])),r.filter!==void 0&&(this.texture.minFilter=r.filter,this.texture.magFilter=r.filter),this.depthTexture=null,this.depth&&(this.depthTexture=new N(e,void 0,{autoRegister:!1}),this.depthTexture.minFilter=`nearest`,this.depthTexture.magFilter=`nearest`),this.#l(),e.addResource(this)}setSize(e,t){let n=Math.max(1,Math.floor(e)),r=Math.max(1,Math.floor(t));(n!==this.width||r!==this.height)&&(this.width=n,this.height=r,this.#l())}restore(){this.texture.restore(),this.depthTexture?.restore(),this.#l()}dispose(){this.#e.removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.#f(this.resolveFbo,this.#r,this.#i),this.texture.dispose(),this.depthTexture?.dispose()}#s(){let e=this.gl,t=this.float?e.RGBA16F:e.RGBA8,n=e.getInternalformatParameter(e.RENDERBUFFER,t,e.SAMPLES);return!n||n.length>0&&n[0]>=4||(et.has(e)||(et.add(e),console.warn(`[VFX-JS] This GPU can't use samples: 4 for this render target format; using samples: 1.`)),!1)}get version(){return this.#t}attachColorTo(e){let t=this.gl,n=t.COLOR_ATTACHMENT0+e;this.#r?t.framebufferRenderbuffer(t.FRAMEBUFFER,n,t.RENDERBUFFER,this.#r):t.framebufferTexture2D(t.FRAMEBUFFER,n,t.TEXTURE_2D,this.texture.texture,0)}attachDepthTo(){let e=this.gl;this.#i?e.framebufferRenderbuffer(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.RENDERBUFFER,this.#i):this.depthTexture&&e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,this.depthTexture.texture,0)}markDirty(){this.samples!==1&&(this.#a=!0,this.#o=this.depth)}resolveColor(){this.#a&&(this.#a=!1,this.#c(this.gl.COLOR_BUFFER_BIT))}resolveDepth(){this.#o&&(this.#o=!1,this.#c(this.gl.DEPTH_BUFFER_BIT))}#c(e){let t=this.gl;t.disable(t.SCISSOR_TEST),t.bindFramebuffer(t.READ_FRAMEBUFFER,this.fbo),t.bindFramebuffer(t.DRAW_FRAMEBUFFER,this.resolveFbo),t.blitFramebuffer(0,0,this.width,this.height,0,0,this.width,this.height,e,t.NEAREST),t.bindFramebuffer(t.READ_FRAMEBUFFER,null),t.bindFramebuffer(t.DRAW_FRAMEBUFFER,null)}generateMipmaps(){if(!this.mipmap)return;this.resolveColor();let e=this.gl;e.bindTexture(e.TEXTURE_2D,this.texture.texture),e.generateMipmap(e.TEXTURE_2D),e.bindTexture(e.TEXTURE_2D,null)}#l(){let e=this.gl,t=this.fbo,n=this.resolveFbo,r=this.#r,i=this.#i,a=e.createFramebuffer();if(!a)throw Error(`[VFX-JS] Failed to create framebuffer`);let o=null;if(this.samples>1){if(o=e.createFramebuffer(),!o)throw e.deleteFramebuffer(a),Error(`[VFX-JS] Failed to create framebuffer`);this.fbo=o,this.resolveFbo=a}else this.fbo=a;let s=this.texture.texture;e.bindTexture(e.TEXTURE_2D,s);let c=this.#e.floatLinearFilter&&!this.#n;if(this.float&&c&&!this.#e.floatBlend)throw Error(`[VFX-JS] EXT_float_blend is not supported.`);let l=this.float?c?e.RGBA32F:e.RGBA16F:e.RGBA8,u=this.float?c?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;if(this.mipmap){let t=Math.floor(Math.log2(Math.max(this.width,this.height)))+1,n=this.width,r=this.height;for(let i=0;i<t;i++)e.texImage2D(e.TEXTURE_2D,i,l,n,r,0,e.RGBA,u,null),n=Math.max(1,n>>1),r=Math.max(1,r>>1)}else e.texImage2D(e.TEXTURE_2D,0,l,this.width,this.height,0,e.RGBA,u,null);let d=this.texture.minFilter===`nearest`?e.NEAREST:e.LINEAR,f=this.texture.magFilter===`nearest`?e.NEAREST:e.LINEAR,p=this.mipmap?this.texture.minFilter===`nearest`?e.NEAREST_MIPMAP_NEAREST:e.LINEAR_MIPMAP_LINEAR:d,m=tt(e,this.texture.wrapS),h=tt(e,this.texture.wrapT);e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,p),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,f),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,m),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,h),e.bindFramebuffer(e.FRAMEBUFFER,a),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,s,0),this.depthTexture&&this.#p(this.depthTexture),o&&this.#u(o,l),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.#a=!1,this.#o=!1,this.#t++,this.texture.needsUpdate=!1,this.texture.source=null,t&&e.deleteFramebuffer(t),this.#f(n,r,i)}#u(e,t){let n=this.gl;n.bindFramebuffer(n.FRAMEBUFFER,e),this.#r=this.#d(t),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,this.#r),this.#i=null,this.depth&&(this.#i=this.#d(n.DEPTH_COMPONENT24),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.RENDERBUFFER,this.#i)),n.bindRenderbuffer(n.RENDERBUFFER,null)}#d(e){let t=this.gl,n=t.createRenderbuffer();if(!n)throw Error(`[VFX-JS] Failed to create renderbuffer`);return t.bindRenderbuffer(t.RENDERBUFFER,n),t.renderbufferStorageMultisample(t.RENDERBUFFER,this.samples,e,this.width,this.height),n}#f(e,t,n){let r=this.gl;e&&r.deleteFramebuffer(e),t&&r.deleteRenderbuffer(t),n&&r.deleteRenderbuffer(n)}#p(e){let t=this.gl;t.bindTexture(t.TEXTURE_2D,e.texture),t.texImage2D(t.TEXTURE_2D,0,t.DEPTH_COMPONENT24,this.width,this.height,0,t.DEPTH_COMPONENT,t.UNSIGNED_INT,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_COMPARE_MODE,t.NONE),t.framebufferTexture2D(t.FRAMEBUFFER,t.DEPTH_ATTACHMENT,t.TEXTURE_2D,e.texture,0),e.needsUpdate=!1,e.source=null}};function tt(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function nt(e,t,n,r){return{x:e.left+n,y:t-r-e.bottom,w:e.right-e.left,h:e.bottom-e.top}}function F(e,t,n,r){return{x:e,y:t,w:n,h:r}}var I=class{#e;#t;#n;#r;constructor(e,t,n,r,i,a={}){this.#e=t,this.#t=n,this.#n=r;let o=t*r,s=n*r,c={float:i,wrap:a.wrap,filter:a.filter,mipmap:a.mipmap,depth:a.depth,samples:a.samples};this.#r=[new P(e,o,s,c),new P(e,o,s,c)]}get read(){return this.#r[0]}get texture(){return this.#r[0].texture}get target(){return this.#r[1]}get framebuffers(){return this.#r}resize(e,t){if(e===this.#e&&t===this.#t)return;this.#e=e,this.#t=t;let n=e*this.#n,r=t*this.#n;this.#r[0].setSize(n,r),this.#r[1].setSize(n,r)}swap(){this.#r=[this.#r[1],this.#r[0]]}getViewport(){return F(0,0,this.#e,this.#t)}dispose(){this.#r[0].dispose(),this.#r[1].dispose()}},rt=Object.freeze({__brand:`EffectQuad`});function it(e){return e===rt}function at(e,t){switch(t){case`lines`:return e.LINES;case`lineStrip`:return e.LINE_STRIP;case`points`:return e.POINTS;default:return e.TRIANGLES}}function ot(e,t){if(t instanceof Float32Array)return e.FLOAT;if(t instanceof Uint8Array)return e.UNSIGNED_BYTE;if(t instanceof Uint16Array)return e.UNSIGNED_SHORT;if(t instanceof Uint32Array)return e.UNSIGNED_INT;if(t instanceof Int8Array)return e.BYTE;if(t instanceof Int16Array)return e.SHORT;if(t instanceof Int32Array)return e.INT;throw Error(`[VFX-JS] Unsupported attribute typed array`)}function st(e,t){if(ArrayBuffer.isView(t)&&!(t instanceof DataView))return{name:e,data:t,itemSize:2,normalized:!1,perInstance:!1};let n=t;return{name:e,data:n.data,itemSize:n.itemSize,normalized:n.normalized??!1,perInstance:n.perInstance??!1}}var ct=class{gl;vao;#e;#t;#n;#r=[];#i=null;mode;indexType=0;hasIndices=!1;drawCount=0;drawStart=0;instanceCount;#a=!1;constructor(e,t,n){this.#e=e,this.gl=e.gl,this.#t=t,this.#n=n,this.mode=at(this.gl,t.mode),this.instanceCount=t.instanceCount??0,this.#o(),e.addResource(this),this.#a=!0}#o(){let e=this.gl,t=e.createVertexArray();if(!t)throw Error(`[VFX-JS] Failed to create VAO`);this.vao=t,e.bindVertexArray(t);let n=this.#n.program,r=null;for(let[t,i]of Object.entries(this.#t.attributes)){let a=st(t,i),o=e.getAttribLocation(n,a.name);if(o<0)continue;let s=e.createBuffer();if(!s)throw Error(`[VFX-JS] Failed to create VBO for "${a.name}"`);this.#r.push(s),e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,a.data,e.STATIC_DRAW);let c=ot(e,a.data);e.enableVertexAttribArray(o),c===e.FLOAT||c===e.HALF_FLOAT||a.normalized?e.vertexAttribPointer(o,a.itemSize,c,a.normalized,0,0):e.vertexAttribIPointer(o,a.itemSize,c,0,0),a.perInstance&&e.vertexAttribDivisor(o,1),t===`position`&&r===null&&(r=a.data.length/a.itemSize)}let i=0,a=this.#t.indices;if(a){let t=e.createBuffer();if(!t)throw Error(`[VFX-JS] Failed to create IBO`);this.#i=t,e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t),e.bufferData(e.ELEMENT_ARRAY_BUFFER,a,e.STATIC_DRAW),this.hasIndices=!0,this.indexType=a instanceof Uint32Array?e.UNSIGNED_INT:e.UNSIGNED_SHORT,i=a.length}else this.hasIndices=!1;e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null),this.#i&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null);let o=this.hasIndices?i:r??0,s=this.#t.drawRange;this.drawStart=s?.start??0,this.drawCount=s?.count===void 0?Math.max(0,o-this.drawStart):s.count}restore(){this.#r=[],this.#i=null,this.#o()}draw(){let e=this.gl;e.bindVertexArray(this.vao),this.hasIndices?this.instanceCount>0?e.drawElementsInstanced(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2),this.instanceCount):e.drawElements(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2)):this.instanceCount>0?e.drawArraysInstanced(this.mode,this.drawStart,this.drawCount,this.instanceCount):e.drawArrays(this.mode,this.drawStart,this.drawCount)}dispose(){this.#a&&=(this.#e.removeResource(this),!1);let e=this.gl;e.deleteVertexArray(this.vao);for(let t of this.#r)e.deleteBuffer(t);this.#i&&e.deleteBuffer(this.#i),this.#r=[],this.#i=null}},lt=class{#e;#t;#n=new WeakMap;#r=new Set;constructor(e,t){this.#e=e,this.#t=t}get quad(){return this.#t}resolve(e,t){let n=this.#n.get(e);n||(n=new Map,this.#n.set(e,n));let r=n.get(t);return r||(r=new ct(this.#e,e,t),n.set(t,r),this.#r.add(r)),r}release(e){let t=this.#n.get(e);if(t){for(let e of t.values())e.dispose(),this.#r.delete(e);this.#n.delete(e)}}dispose(){for(let e of this.#r)e.dispose();this.#r.clear()}},ut=class{gl;fbo;members;#e;#t;#n=[];#r=-1;constructor(e,t,n){this.#e=e,this.gl=e.gl,this.members=t,this.#t=n,this.fbo=this.#i(),this.#o(),this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null),e.addResource(this)}get width(){return this.members[0].width}get height(){return this.members[0].height}bind(){this.#a()?this.#o():this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,this.fbo)}restore(){this.fbo=this.#i(),this.#o(),this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null)}dispose(){this.#e.removeResource(this),this.gl.deleteFramebuffer(this.fbo)}#i(){let e=this.gl.createFramebuffer();if(!e)throw Error(`[VFX-JS] Failed to create framebuffer`);return e}#a(){return this.#t&&this.#t.version!==this.#r?!0:this.members.some((e,t)=>e.version!==this.#n[t])}#o(){let e=this.gl;e.bindFramebuffer(e.FRAMEBUFFER,this.fbo);let t=[];this.members.forEach((n,r)=>{n.attachColorTo(r),t.push(e.COLOR_ATTACHMENT0+r)}),this.#t?.attachDepthTo(),e.drawBuffers(t),this.#n=this.members.map(e=>e.version),this.#r=this.#t?.version??-1}},L=class{x=0;y=0;constructor(e=0,t=0){this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}},R=class{x=0;y=0;z=0;w=0;constructor(e=0,t=0,n=0,r=0){this.x=e,this.y=t,this.z=n,this.w=r}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}};function dt(e){return/#version\s+300\s+es\b/.test(e)?`300 es`:/#version\s+100\b/.test(e)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(e)?`100`:`300 es`}var ft=class{gl;program;#e;#t;#n;#r;#i=new Map;constructor(e,t,n,r){this.#e=e,this.gl=e.gl,this.#t=t,this.#n=n,this.#r=r??dt(n),this.#a(),e.addResource(this)}get glslVersion(){return this.#r}#a(){let e=this.gl,t=ht(e,e.VERTEX_SHADER,gt(this.#t,this.#r)),n=ht(e,e.FRAGMENT_SHADER,gt(this.#n,this.#r)),r=e.createProgram();if(!r)throw Error(`[VFX-JS] Failed to create program`);if(e.attachShader(r,t),e.attachShader(r,n),e.bindAttribLocation(r,0,`position`),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let i=e.getProgramInfoLog(r)??``;throw e.deleteShader(t),e.deleteShader(n),e.deleteProgram(r),Error(`[VFX-JS] Program link failed: ${i}`)}e.detachShader(r,t),e.detachShader(r,n),e.deleteShader(t),e.deleteShader(n),this.program=r,this.#i.clear();let i=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<i;t++){let n=e.getActiveUniform(r,t);if(!n)continue;let i=n.name.replace(/\[0\]$/,``),a=e.getUniformLocation(r,n.name);a&&this.#i.set(i,{location:a,type:n.type,size:n.size})}}restore(){this.#a()}use(){this.gl.useProgram(this.program)}hasUniform(e){return this.#i.has(e)}uploadUniforms(e){let t=this.gl,n=0;for(let[r,i]of this.#i){let a=e[r];if(!a)continue;let o=a.value;o!=null&&(mt(o)||(_t(i.type)?o instanceof N&&(o.bind(n),t.uniform1i(i.location,n),n++):o instanceof N||yt(t,i,o)))}}dispose(){this.#e.removeResource(this),this.gl.deleteProgram(this.program)}},pt=!1;function mt(e){return typeof e!=`object`||!(`__brand`in e)?!1:(pt||(pt=!0,console.warn("[VFX-JS] Texture uniforms work with `effect` only, not with `shader`. Ignoring the value.")),!0)}function ht(e,t,n){let r=e.createShader(t);if(!r)throw Error(`[VFX-JS] Failed to create shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)??``;throw e.deleteShader(r),Error(`[VFX-JS] Shader compile failed: ${t}\n\n${n}`)}return r}function gt(e,t){return e.replace(/^\s+/,``).startsWith(`#version`)||t===`100`?e:`#version 300 es\n${e}`}function _t(e){return e===35678||e===36298||e===36306||e===35682}var vt=new Set;function yt(e,t,n){let r=t.location,i=t.size>1,a=n,o=n,s=n;switch(t.type){case e.FLOAT:i?e.uniform1fv(r,a):e.uniform1f(r,n);return;case e.FLOAT_VEC2:if(i)e.uniform2fv(r,a);else if(n instanceof L)e.uniform2f(r,n.x,n.y);else{let t=n;e.uniform2f(r,t[0],t[1])}return;case e.FLOAT_VEC3:if(i)e.uniform3fv(r,a);else{let t=n;e.uniform3f(r,t[0],t[1],t[2])}return;case e.FLOAT_VEC4:if(i)e.uniform4fv(r,a);else if(n instanceof R)e.uniform4f(r,n.x,n.y,n.z,n.w);else{let t=n;e.uniform4f(r,t[0],t[1],t[2],t[3])}return;case e.INT:i?e.uniform1iv(r,o):e.uniform1i(r,n);return;case e.INT_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,t[0],t[1])}return;case e.INT_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,t[0],t[1],t[2])}return;case e.INT_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,t[0],t[1],t[2],t[3])}return;case e.BOOL:i?e.uniform1iv(r,o):e.uniform1i(r,+!!n);return;case e.BOOL_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,+!!t[0],+!!t[1])}return;case e.BOOL_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,+!!t[0],+!!t[1],+!!t[2])}return;case e.BOOL_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,+!!t[0],+!!t[1],+!!t[2],+!!t[3])}return;case e.FLOAT_MAT2:e.uniformMatrix2fv(r,!1,a);return;case e.FLOAT_MAT3:e.uniformMatrix3fv(r,!1,a);return;case e.FLOAT_MAT4:e.uniformMatrix4fv(r,!1,a);return;case e.UNSIGNED_INT:i?e.uniform1uiv(r,s):e.uniform1ui(r,n);return;case e.UNSIGNED_INT_VEC2:if(i)e.uniform2uiv(r,s);else{let t=n;e.uniform2ui(r,t[0],t[1])}return;case e.UNSIGNED_INT_VEC3:if(i)e.uniform3uiv(r,s);else{let t=n;e.uniform3ui(r,t[0],t[1],t[2])}return;case e.UNSIGNED_INT_VEC4:if(i)e.uniform4uiv(r,s);else{let t=n;e.uniform4ui(r,t[0],t[1],t[2],t[3])}return;default:vt.has(t.type)||(vt.add(t.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${t.type.toString(16)}; skipping upload.`));return}}var bt=class{gl;program;uniforms;blend;constructor(e,t,n,r,i,a){this.gl=e.gl,this.program=new ft(e,t,n,a),this.uniforms=r,this.blend=i}dispose(){this.program.dispose()}};function xt(e,t,n,r,i,a,o,s){let c=r?r.width/s:a,l=r?r.height/s:o,u=Math.max(0,i.x),d=Math.max(0,i.y),f=Math.min(c,i.x+i.w),p=Math.min(l,i.y+i.h),m=f-u,h=p-d;m<=0||h<=0||(e.bindFramebuffer(e.FRAMEBUFFER,r?r.fbo:null),e.viewport(Math.round(u*s),Math.round(d*s),Math.round(m*s),Math.round(h*s)),St(e,n.blend),n.program.use(),n.program.uploadUniforms(n.uniforms),t.draw())}function St(e,t){t===`none`?e.disable(e.BLEND):(e.enable(e.BLEND),e.blendEquation(e.FUNC_ADD),t===`premultiplied`?e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA):t===`additive`?e.blendFuncSeparate(e.ONE,e.ONE,e.ONE,e.ONE):e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA))}function Ct(e,t){t.depthTest||t.depthWrite?(e.enable(e.DEPTH_TEST),e.depthFunc(t.depthTest?Tt(e,t.depthFunc):e.ALWAYS),e.depthMask(t.depthWrite)):e.disable(e.DEPTH_TEST),t.cull===`none`?e.disable(e.CULL_FACE):(e.enable(e.CULL_FACE),e.cullFace(t.cull===`front`?e.FRONT:e.BACK))}function wt(e){e.disable(e.DEPTH_TEST),e.disable(e.CULL_FACE),e.depthMask(!0),e.depthFunc(e.LESS),e.cullFace(e.BACK)}function Tt(e,t){switch(t){case`never`:return e.NEVER;case`less`:return e.LESS;case`equal`:return e.EQUAL;case`lequal`:return e.LEQUAL;case`greater`:return e.GREATER;case`notequal`:return e.NOTEQUAL;case`gequal`:return e.GEQUAL;case`always`:return e.ALWAYS}}var Et=4,Dt=class{promise;#e;#t=null;#n=null;#r;#i=new Uint8Array;#a=0;#o=0;#s=!1;#c=!1;#l;#u;#d;constructor(e,t,n,r){this.#e=e,this.#l=r,this.promise=new Promise((e,t)=>{this.#u=e,this.#d=t});try{this.#f(t,n)}catch(e){this.cancel(e instanceof Error?e:Error(String(e)))}}get settled(){return this.#c}cancel(e){this.#c||(this.#h(),this.#d(e))}#f(e,t){let n=this.#e,{width:r,height:i,float:a}=e,o=r*i*4;this.#i=a?new Float32Array(o):new Uint8Array(o),this.#a=r*4,this.#o=i,this.#s=t?.flipY??!1;let s=n.getParameter(n.DRAW_FRAMEBUFFER_BINDING),c=n.getParameter(n.READ_FRAMEBUFFER_BINDING),l=n.getParameter(n.PIXEL_PACK_BUFFER_BINDING);e.resolveColor();let u=n.createBuffer();if(!u)throw Error(`[VFX-JS] readPixels() could not create a buffer.`);if(this.#t=u,n.bindBuffer(n.PIXEL_PACK_BUFFER,u),n.bufferData(n.PIXEL_PACK_BUFFER,o*(a?4:1),n.STREAM_READ),n.bindFramebuffer(n.READ_FRAMEBUFFER,e.resolveFbo??e.fbo),n.readPixels(0,0,r,i,n.RGBA,a?n.FLOAT:n.UNSIGNED_BYTE,0),n.bindBuffer(n.PIXEL_PACK_BUFFER,l),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,s),n.bindFramebuffer(n.READ_FRAMEBUFFER,c),this.#n=n.fenceSync(n.SYNC_GPU_COMMANDS_COMPLETE,0),!this.#n)throw Error(`[VFX-JS] readPixels() could not create a fence.`);n.flush(),this.#p()}#p(){this.#r=setTimeout(()=>this.#m(),Et)}#m(){if(this.#r=void 0,this.#c)return;let e=this.#e,t=this.#n,n=t?e.getSyncParameter(t,e.SYNC_STATUS):null;if(n===e.UNSIGNALED){this.#p();return}if(n!==e.SIGNALED){this.cancel(Error(`[VFX-JS] readPixels() lost its fence.`));return}let r=this.#i,i=e.getParameter(e.PIXEL_PACK_BUFFER_BINDING);e.bindBuffer(e.PIXEL_PACK_BUFFER,this.#t),e.getBufferSubData(e.PIXEL_PACK_BUFFER,0,r),e.bindBuffer(e.PIXEL_PACK_BUFFER,i),this.#s&&Ot(r,this.#a,this.#o),this.#h(),this.#u(r)}#h(){this.#c=!0,this.#r!==void 0&&(clearTimeout(this.#r),this.#r=void 0);let e=this.#e;this.#n&&=(e.deleteSync(this.#n),null),this.#t&&=(e.deleteBuffer(this.#t),null),this.#l(this)}};function Ot(e,t,n){let r=e.slice(0,t);for(let i=0,a=n-1;i<a;i++,a--){let n=i*t,o=a*t;r.set(e.subarray(n,n+t)),e.copyWithin(n,o,o+t),e.set(r,o)}}var kt=Symbol.for(`@vfx-js/effect.resolve-texture`),At=Symbol.for(`@vfx-js/effect.resolve-rt`);function jt(e){return e[kt]()}function z(e){return e[At]}function Mt(e){return Array.isArray(e)}var Nt=new WeakMap,Pt=0;function Ft(e){let t=Nt.get(e);return t===void 0&&(t=Pt++,Nt.set(e,t)),t}var It=`#version 300 es
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
`,Lt=`
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
`,Rt=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`,zt=`
precision highp float;
varying vec2 uv;
uniform sampler2D src;
void main() {
    gl_FragColor = texture2D(src, uv);
}
`,Bt=`#version 300 es
precision highp float;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
void main() {
    bool inside = all(greaterThanEqual(uvSrc, vec2(0.0))) && all(lessThanEqual(uvSrc, vec2(1.0)));
    outColor = inside ? texture(src, uvSrc) : vec4(0.0);
}
`,Vt=`
precision highp float;
varying vec2 uvSrc;
uniform sampler2D src;
void main() {
    bool inside = all(greaterThanEqual(uvSrc, vec2(0.0))) && all(lessThanEqual(uvSrc, vec2(1.0)));
    gl_FragColor = inside ? texture2D(src, uvSrc) : vec4(0.0);
}
`,Ht=class{#e;#t;#n;#r;#i;#a=[];#o=[];#s=[];#c=[];#l=new Set;#u=null;#d=`init`;#f=!1;#p=!1;#m=!1;#h=new Set;#g;#_;#v=new Map;#y;#b;constructor(e,t,n,r,i,a){this.#e=e,this.#t=e.gl,this.#n=n,this.#r=a,this.#i=new lt(e,t),this.#y={outputBufferW:1,outputBufferH:1,canvasBufferSize:[1,1],outputViewport:{x:0,y:0,w:1,h:1},elementBufferW:1,elementBufferH:1,contentRectUv:[0,0,1,1],srcRectUv:[0,0,1,1]};let o={time:0,deltaTime:0,pixelRatio:n,resolution:[1,1],mouse:[0,0],mouseViewport:[0,0],intersection:0,enterTime:0,leaveTime:0,enterProgress:0,leaveProgress:0,src:r,target:null,uniforms:{},vfxProps:i,dims:{element:[1,1],elementPixel:[1,1],canvas:[1,1],canvasPixel:[1,1],pixelRatio:n,contentRect:[0,0,1,1],srcRect:[0,0,1,1],canvasRect:[0,0,1,1]},quad:rt,gl:this.#t,createRenderTarget:e=>this.#x(e),releaseGeometry:e=>this.#i.release(e),wrapTexture:(e,t)=>this.#E(e,t),draw:e=>this.#O(e),blit:(e,t,n)=>this.#k(e,t,n),clear:(e,t)=>this.#A(e,t),readPixels:(e,t)=>this.#w(e,t),resetState:()=>this.#j(),onContextRestored:e=>{let t=this.#e.onContextRestored(e);return this.#c.push(t),t}};this.#b=o}get ctx(){return this.#b}setPhase(e){this.#d=e}setFrameDims(e){this.#y=e,this.#b.resolution=[e.canvasBufferSize[0],e.canvasBufferSize[1]];for(let t of this.#s)t.resolver.resize?.(e.outputBufferW,e.outputBufferH)}setEffectDims(e){this.#b.dims=e}setFrameState(e){let t=this.#b;t.time=e.time,t.deltaTime=e.deltaTime,t.mouse=e.mouse,t.mouseViewport=e.mouseViewport,t.intersection=e.intersection,t.enterTime=e.enterTime,t.leaveTime=e.leaveTime,t.enterProgress=e.enterProgress,t.leaveProgress=e.leaveProgress,t.uniforms=e.uniforms}setSrc(e){this.#b.src=e}setOutput(e){this.#b.target=e}passthroughCopy(e,t,n){let r=this.#d;this.#d=`render`;let i=this.#b.target;this.#b.target=t;try{let r=this.#y.outputViewport;this.#y.outputViewport={...n};let i=this.#b.vfxProps.glslVersion===`100`?zt:Rt;this.#I({frag:i,uniforms:{src:e},target:t}),this.#y.outputViewport=r}finally{this.#b.target=i,this.#d=r}}clearRt(e){let t=this.#t,n=z(e);t.bindFramebuffer(t.FRAMEBUFFER,n.getWriteFbo().fbo),t.viewport(0,0,e.width,e.height),t.clearColor(0,0,0,0),t.disable(t.SCISSOR_TEST),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)}#x(e){let t=e?.persistent??!1,n=e?.float??!1,r=Wt(e?.wrap),i=e?.filter,a=e?.mipmap??!1,o=a!==!1,s=a===!0,c=e?.depth??!1,l=this.#S(e?.samples),u=e?.size,d=u?u[0]:this.#y.outputBufferW,f=u?u[1]:this.#y.outputBufferH,p,m,h;if(t){let e=u?1:this.#n,t=u?d:d/e,a=u?f:f/e,g=new I(this.#e,t,a,e,n,{wrap:r,filter:i,mipmap:o,depth:c,samples:l});p={getReadTexture:()=>(g.read.resolveColor(),g.read.texture),getWriteFbo:()=>g.target,getReadFbo:()=>g.read,getFramebuffers:()=>g.framebuffers,swap:()=>g.swap(),resize:u?void 0:(e,t)=>{g.resize(e/this.#n,t/this.#n)},dispose:()=>g.dispose()},o&&(p.regenerateMipmaps=()=>g.target.generateMipmaps(),p.mipmapAutoRegen=s),c&&(p.getDepthTexture=()=>(g.read.resolveDepth(),g.read.depthTexture)),m=()=>g.target.width,h=()=>g.target.height}else{let e=new P(this.#e,d,f,{float:n,wrap:r,filter:i,mipmap:o,depth:c,samples:l});p={getReadTexture:()=>(e.resolveColor(),e.texture),getWriteFbo:()=>e,getReadFbo:()=>e,getFramebuffers:()=>[e],resize:u?void 0:(t,n)=>e.setSize(t,n),dispose:()=>e.dispose()},o&&(p.regenerateMipmaps=()=>e.generateMipmaps(),p.mipmapAutoRegen=s);let t=e.depthTexture;t&&(p.getDepthTexture=()=>(e.resolveDepth(),t)),m=()=>e.width,h=()=>e.height}let g,_=Kt(p,m,h,()=>this.#C(g));return g={handle:_,resolver:p},this.#o.push(g),u||this.#s.push(g),_}#S(e){return e===void 0||e===1||e===4?e??1:(this.#m||(this.#m=!0,console.warn(`[VFX-JS] createRenderTarget() samples must be 1 or 4; using 1.`)),1)}#C(e){let t=this.#o.indexOf(e);if(t<0)return;this.#o.splice(t,1);let n=this.#s.indexOf(e);n>=0&&this.#s.splice(n,1);let r=e.resolver.getFramebuffers?.()??[];for(let[e,t]of this.#v)t.members.some(e=>r.includes(e))&&(t.dispose(),this.#v.delete(e));e.resolver.dispose?.()}#w(e,t){if(this.#d===`disposed`)return Promise.reject(Error(`[VFX-JS] readPixels() was called after the effect was disposed.`));if(this.#e.isContextLost)return Promise.reject(Error(`[VFX-JS] readPixels() was called while the WebGL context is lost.`));this.#u??=this.#e.onContextLost(()=>this.#T(`[VFX-JS] readPixels() was cancelled: the WebGL context was lost.`));let n=z(e).getReadFbo(),r=new Dt(this.#t,n,t,e=>this.#l.delete(e));return r.settled||this.#l.add(r),r.promise}#T(e){let t=[...this.#l];this.#l.clear();for(let n of t)n.cancel(Error(e))}#E(e,t){let n=Wt(t?.wrap),r=t?.filter,i,a,o,s=null,c=Ut(e);if(c){if(!t?.size)throw Error(`[VFX-JS] wrapTexture(WebGLTexture) requires opts.size`);let[n,r]=t.size;i=new N(this.#e,void 0,{autoRegister:!1,externalHandle:e}),a=()=>n,o=()=>r}else{let n=e;i=new N(this.#e,n);let r=t?.size,c=e=>{if(r)return e===`w`?r[0]:r[1];if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return e===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return e===`w`?n.videoWidth:n.videoHeight;let t=n;return e===`w`?t.width:t.height};a=()=>c(`w`),o=()=>c(`h`);let l=typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement||typeof HTMLCanvasElement<`u`&&n instanceof HTMLCanvasElement||typeof OffscreenCanvas<`u`&&n instanceof OffscreenCanvas;(t?.autoUpdate??l)&&(s=()=>{i.needsUpdate=!0})}i.wrapS=n[0],i.wrapT=n[1],r!==void 0&&(i.minFilter=r,i.magFilter=r),this.#a.push(i),s&&this.#D.push(s);let l=!1;return B(()=>i,a,o,()=>{if(l)return;l=!0;let e=this.#a.indexOf(i);if(e!==-1&&this.#a.splice(e,1),s){let e=this.#D.indexOf(s);e!==-1&&this.#D.splice(e,1)}i.dispose()},c?void 0:()=>{l||(i.needsUpdate=!0)})}#D=[];tickAutoUpdates(){for(let e of this.#D)e()}#O(e){this.#d===`render`?this.#I(e):this.#d===`update`&&!this.#f&&(this.#f=!0,console.warn(`[VFX-JS] ctx.draw() called in update(); ignored. Move draws to render().`))}#k(e,t,n){if(this.#d!==`render`){this.#d===`update`&&!this.#f&&(this.#f=!0,console.warn(`[VFX-JS] ctx.blit() called in update(); ignored. Move draws to render().`));return}let r=this.#b.vfxProps.glslVersion===`100`?Vt:Bt;this.#I({frag:r,uniforms:{src:e},target:t,blend:n?.blend,swap:n?.swap})}#A(e,t){if(this.#d!==`render`){this.#d===`update`&&!this.#f&&(this.#f=!0,console.warn(`[VFX-JS] ctx.clear() called in update(); ignored. Move draws to render().`));return}let n=this.#t,r=this.#b.target,i=e??r,a=i===null||i===r,o=i===null?null:z(i),s=!a&&!!o?.getDepthTexture,c=t?.color??!0,l=(t?.depth??!0)&&s;if(!c&&!l)return;let u=0;if(c&&(n.clearColor(0,0,0,0),u|=n.COLOR_BUFFER_BIT),l&&(n.clearDepth(1),u|=n.DEPTH_BUFFER_BIT),a||o===null){let e=o===null?null:o.getWriteFbo().fbo,t=this.#y.outputViewport;n.bindFramebuffer(n.FRAMEBUFFER,e),n.enable(n.SCISSOR_TEST),n.scissor(t.x,t.y,t.w,t.h),n.clear(u),o?.getWriteFbo().markDirty(),n.disable(n.SCISSOR_TEST),n.bindFramebuffer(n.FRAMEBUFFER,null);return}n.disable(n.SCISSOR_TEST);let d=()=>{let e=o.getWriteFbo();n.bindFramebuffer(n.FRAMEBUFFER,e.fbo),n.clear(u),e.markDirty()};d(),o.swap&&(o.swap(),d(),o.swap()),n.bindFramebuffer(n.FRAMEBUFFER,null)}#j(){if(this.#d===`disposed`||this.#e.isContextLost)return;let e=this.#t;e.bindFramebuffer(e.FRAMEBUFFER,null),e.drawBuffers([e.BACK]),e.readBuffer(e.BACK),e.viewport(0,0,e.drawingBufferWidth,e.drawingBufferHeight),e.disable(e.DEPTH_TEST),e.disable(e.CULL_FACE),e.disable(e.STENCIL_TEST),e.disable(e.SCISSOR_TEST),e.disable(e.BLEND),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.RASTERIZER_DISCARD),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.disable(e.SAMPLE_COVERAGE),e.depthMask(!0),e.clearColor(0,0,0,0),e.depthFunc(e.LESS),e.colorMask(!0,!0,!0,!0),e.stencilMask(4294967295),e.frontFace(e.CCW),e.cullFace(e.BACK),e.useProgram(null),e.bindVertexArray(null),e.bindTransformFeedback(e.TRANSFORM_FEEDBACK,null),e.bindBuffer(e.ARRAY_BUFFER,null),e.bindBuffer(e.PIXEL_PACK_BUFFER,null),e.bindBuffer(e.PIXEL_UNPACK_BUFFER,null),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBuffer(e.COPY_READ_BUFFER,null),e.bindBuffer(e.COPY_WRITE_BUFFER,null);let t=this.#M();for(let n=0;n<t;n++)e.bindSampler(n,null);e.activeTexture(e.TEXTURE0),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.pixelStorei(e.UNPACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_IMAGE_HEIGHT,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_SKIP_IMAGES,0),e.pixelStorei(e.PACK_ALIGNMENT,4),e.pixelStorei(e.PACK_ROW_LENGTH,0),e.pixelStorei(e.PACK_SKIP_PIXELS,0),e.pixelStorei(e.PACK_SKIP_ROWS,0)}#M(){if(this.#g===void 0){let e=this.#t,t=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS);this.#g=typeof t==`number`&&t>0?t:16}return this.#g}#N(){if(this.#_===void 0){let e=this.#t,t=e.getParameter(e.MAX_DRAW_BUFFERS);this.#_=typeof t==`number`&&t>0?t:4}return this.#_}#P(e,t){this.#h.has(e)||(this.#h.add(e),console.warn(t))}#F(e){let t=e.vert??(this.#b.vfxProps.glslVersion===`100`?Lt:It);return this.#r.get(t,e.frag,this.#b.vfxProps.glslVersion)}#I(e){let t=e.target;Mt(t)?t.length===1&&t[0]?this.#L(e,t[0]):this.#R(e,t):this.#L(e,t)}#L(e,t){let n=this.#t,r=this.#F(e),i=this.#b.target,a=t??i,o=a===null||a===i,s=this.#U(e.uniforms),c=null,l,u,d,f,p,m,h=!1;if(a===null)l=this.#y.outputViewport.x,u=this.#y.outputViewport.y,d=this.#y.outputViewport.w,f=this.#y.outputViewport.h;else{let e=z(a);c=e.getWriteFbo(),o?(l=this.#y.outputViewport.x,u=this.#y.outputViewport.y,d=this.#y.outputViewport.w,f=this.#y.outputViewport.h):(l=0,u=0,d=a.width,f=a.height),p=e.swap,h=!o&&!!e.getDepthTexture,e.mipmapAutoRegen&&(m=e.regenerateMipmaps)}n.bindFramebuffer(n.FRAMEBUFFER,c?c.fbo:null),n.viewport(l,u,d,f),n.disable(n.SCISSOR_TEST),St(n,e.blend??(a===null?`premultiplied`:`none`)),this.#V(e,r,s,h),c?.markDirty(),m?.(),p&&e.swap!==!1&&p()}#R(e,t){let n=this.#z(t);if(!n)return;let r=this.#F(e);if(r.glslVersion===`100`){this.#P(`glsl100`,`[VFX-JS] ctx.draw() with several targets needs a GLSL 300 es shader; draw skipped.`);return}let i=this.#t,a=this.#U(e.uniforms),o=n.map(e=>e.getWriteFbo()),s=n.flatMap((e,t)=>e.getDepthTexture?[t]:[]),c=e.depthTest??!1,l=c||(e.depthWrite??c);s.length>1&&l&&this.#P(`depths`,`[VFX-JS] ctx.draw() got several targets with depth; using the first one's depth.`);let u=s.length>0?o[s[0]]:null,d=this.#B(o,u);d.bind(),i.viewport(0,0,d.width,d.height),i.disable(i.SCISSOR_TEST),St(i,e.blend??`none`),this.#V(e,r,a,u!==null);for(let e of o)e.markDirty();for(let e of n)e.mipmapAutoRegen&&e.regenerateMipmaps?.();if(e.swap!==!1)for(let e of n)e.swap?.()}#z(e){if(e.length===0)return this.#P(`empty`,`[VFX-JS] ctx.draw() got an empty target array; draw skipped.`),null;if(e.some(e=>!e))return this.#P(`null`,`[VFX-JS] ctx.draw() target array can't contain null; draw skipped.`),null;let t=this.#b.target;if(t&&e.includes(t))return this.#P(`stageOutput`,`[VFX-JS] ctx.draw() target array can't contain ctx.target; draw skipped.`),null;if(new Set(e).size!==e.length)return this.#P(`duplicate`,`[VFX-JS] ctx.draw() target array has the same target twice; draw skipped.`),null;let n=e.map(z),r=n.map(e=>e.getWriteFbo()),i=r[0];if(r.some(e=>e.width!==i.width||e.height!==i.height))return this.#P(`size`,`[VFX-JS] ctx.draw() targets in an array must have the same size; draw skipped.`),null;if(r.some(e=>e.samples!==i.samples))return this.#P(`samples`,`[VFX-JS] ctx.draw() targets in an array must have the same samples; draw skipped.`),null;let a=this.#N();return e.length>a?(this.#P(`count`,`[VFX-JS] ctx.draw() got ${e.length} targets, but this GPU takes at most ${a}; draw skipped.`),null):n}#B(e,t){let n=e.map(e=>Ft(e)).join(`,`),r=this.#v.get(n);return r||(r=new ut(this.#e,e,t),this.#v.set(n,r)),r}#V(e,t,n,r){let i=this.#t,a=this.#H(e,r);t.use(),t.uploadUniforms(n);let o=e.geometry??rt,s=it(o)?this.#i.quad:this.#i.resolve(o,t);a&&Ct(i,a),s.draw(),a&&wt(i)}#H(e,t){let n=e.depthTest??!1,r=e.depthWrite??n,i=e.cull??`none`;return(n||r)&&!t&&(this.#p||(this.#p=!0,console.warn(`[VFX-JS] ctx.draw() depthTest / depthWrite needs a target created with depth: true; ignored.`)),n=!1,r=!1),!n&&!r&&i===`none`?null:{depthTest:n,depthWrite:r,depthFunc:e.depthFunc??`lequal`,cull:i}}#U(e){let t={};if(t.contentRectUv={value:this.#y.contentRectUv},t.srcRectUv={value:this.#y.srcRectUv},!e)return t;for(let[n,r]of Object.entries(e))t[n]=Gt(r,this.#t);return t}dispose(){this.#d=`disposed`,this.#T(`[VFX-JS] readPixels() was cancelled: the effect was disposed.`),this.#u?.(),this.#u=null;for(let e of this.#c)e();this.#c=[];for(let e of this.#v.values())e.dispose();this.#v.clear();for(let e of this.#o)e.resolver.dispose?.();this.#o=[],this.#s=[];for(let e of this.#a)e.dispose();this.#a=[],this.#i.dispose(),this.#D=[]}};function Ut(e){let t=globalThis.WebGLTexture;if(t&&typeof t==`function`&&e instanceof t)return!0;let n=e;return n.width===void 0&&n.naturalWidth===void 0&&n.videoWidth===void 0}function Wt(e){return e===void 0?[`clamp`,`clamp`]:typeof e==`string`?[e,e]:[e[0],e[1]]}function Gt(e,t){if(typeof e==`object`&&e&&`__brand`in e){if(e.__brand===`EffectRenderTarget`)return{value:z(e).getReadTexture()};let n=jt(e);if(n&&n.gl!==t)throw Error(`[VFX-JS] This texture belongs to another VFX instance.`);return{value:n}}return{value:e}}function B(e,t,n,r,i){let a={__brand:`EffectTexture`,get width(){return t()},get height(){return n()},dispose(){r?.()},update(){i?.()}};return Object.defineProperty(a,kt,{value:e}),a}function Kt(e,t,n,r){let i={__brand:`EffectRenderTarget`,get width(){return t()},get height(){return n()},dispose:r??(()=>{}),generateMipmaps:()=>e.regenerateMipmaps?.()};return e.getDepthTexture&&(i.depthTexture=B(e.getDepthTexture,t,n)),Object.defineProperty(i,At,{value:e}),i}function qt(e){return Kt({getReadTexture:()=>e.texture,getWriteFbo:()=>e,getReadFbo:()=>e},()=>e.width,()=>e.height)}var Jt={supportsHtmlInCanvas:De,wrapElement:Te,unwrapElement:Ee,requestCapture:pe,releaseFirstCapture:ge,dom2canvas:M,nextFrame:()=>new Promise(e=>requestAnimationFrame(()=>e()))},Yt=1e3;function Xt(e){let t=e.getBoundingClientRect();return t.width===0&&t.height===0&&e.getClientRects().length===0?null:t}async function Zt(e,t,n,r,i){let a={width:0,height:0},o=await Qt(e,t,n,a,i);try{e.uploadTexture(a.texture)}catch(e){throw o.dispose(),a.texture.dispose(),e}let s=!1,c=!1,l={x:0,y:0,width:0,height:0},u=!1,d=()=>{let e=o.inBox?.()===!1?null:Xt(o.box);u=e!==null,e&&(l.x=e.left,l.y=e.top,o.sizeFollowsBox&&(a.width=e.width,a.height=e.height),l.width=a.width,l.height=a.height)},f=()=>s?Promise.resolve(!1):o.update(),p={texture:B(()=>s?(c||(c=!0,console.warn(`[VFX-JS] This capture is disposed.`)),e.emptyTexture):a.texture,()=>s?0:e.textureSize(a.texture,`w`),()=>s?0:e.textureSize(a.texture,`h`),void 0,()=>{f().catch(e=>console.error(e))}),get rect(){return u?l:null},update:f,dispose(){s||(s=!0,o.dispose(),a.texture.dispose(),r?.())}};return d(),{capture:p,tick(){s||(d(),o.uploadEveryFrame&&(a.texture.needsUpdate=!0))},resize(){s||o.resize?.()}}}function Qt(e,t,n,r,i){let a={...Jt,...e.dom};if(t instanceof HTMLImageElement||t instanceof HTMLVideoElement||t instanceof HTMLCanvasElement)return on(e,t,n,r,i);let o=t.getBoundingClientRect();return t.getClientRects().length===0||o.width===0||o.height===0?Promise.reject(Error(`[VFX-JS] capture() needs an element with a size.`)):a.supportsHtmlInCanvas()?sn(e,a,t,n,r,i):cn(e,a,t,n,r)}function V(){return Error(`[VFX-JS] capture() was aborted.`)}function $t(e,t){return t?t.aborted?Promise.reject(V()):new Promise((n,r)=>{let i=()=>r(V());t.addEventListener(`abort`,i,{once:!0}),e.then(n,r).finally(()=>t.removeEventListener(`abort`,i))}):e}function en(e){if(e.error)return`failed to load`;let t=e.querySelectorAll(`source[src]`);return!e.srcObject&&!e.src&&t.length===0?`has no source`:e.preload===`none`&&e.paused&&!e.autoplay&&e.readyState===0?`is not loading (preload="none"). Call play() first`:null}function tn(e,t){let n=en(e);if(n)return Promise.reject(Error(`[VFX-JS] capture() got a video that ${n}.`));let r=e.querySelectorAll(`source`),i=r[r.length-1];return new Promise((n,r)=>{let a=()=>{e.removeEventListener(`canplay`,o),e.removeEventListener(`error`,s),i?.removeEventListener(`error`,s),t?.removeEventListener(`abort`,c)},o=()=>{a(),n()},s=()=>{a(),r(Error(`[VFX-JS] capture() could not load the video.`))},c=()=>{a(),r(V())};t?.aborted?r(V()):(e.addEventListener(`canplay`,o),e.addEventListener(`error`,s),i?.addEventListener(`error`,s),t?.addEventListener(`abort`,c))})}function nn(e,t){let n=t.getBoundingClientRect();e.width=n.width,e.height=n.height}function rn(e){let t=e.getBoundingClientRect();return[Math.ceil(t.width),Math.ceil(t.height)]}function an(e){return e instanceof HTMLImageElement?[e.naturalWidth,e.naturalHeight]:e instanceof HTMLVideoElement?[e.videoWidth,e.videoHeight]:[e.width,e.height]}async function on(e,t,n,r,i){t instanceof HTMLImageElement?await $t(t.decode(),i):t instanceof HTMLVideoElement&&t.readyState<3&&await tn(t,i);let[a,o]=an(t);if(a===0||o===0)throw Error(`[VFX-JS] capture() got a source with no pixels.`);if(a>e.maxTextureSize||o>e.maxTextureSize)throw Error(`[VFX-JS] capture() got a source larger than the max texture size (${e.maxTextureSize}px).`);r.texture=e.createTexture(t);let s=t.style.opacity;if(n.hide){let e=t instanceof HTMLVideoElement;t.style.setProperty(`opacity`,e?`0.0001`:`0`)}let c=()=>{n.hide&&(t.style.opacity=s)};return t instanceof HTMLImageElement?{box:t,sizeFollowsBox:!0,uploadEveryFrame:!1,async update(){return await t.decode(),r.texture.needsUpdate=!0,!0},dispose:c}:{box:t,sizeFollowsBox:!0,uploadEveryFrame:!0,update:()=>Promise.resolve(!0),dispose:c}}async function sn(e,t,n,r,i,a){let o=n.parentNode,s,c;try{let o=t.wrapElement(n,{onCapture:t=>{i.texture=e.refreshTexture(i.texture,t),nn(i,s)},maxSize:e.maxTextureSize,keepDrawn:!r.hide,stillCover:r.hide?void 0:{zIndex:e.stillZIndex}},a);({canvas:s,initialCapture:c}=await $t(o,a))}catch(e){let r=n.parentNode;throw r!==o&&r instanceof HTMLCanvasElement&&t.unwrapElement(r,n),e}return i.texture=e.createTexture(c),nn(i,s),t.releaseFirstCapture(s,!r.hide),r.hide||await t.nextFrame(),{box:s,inBox:()=>n.parentNode===s,sizeFollowsBox:!1,uploadEveryFrame:!1,async update(){return await t.requestCapture(s,Yt)??!1},dispose(){t.unwrapElement(s,n)}}}async function cn(e,t,n,r,i){let a=n.style.opacity,o=a===``?1:Number.parseFloat(a),[s,c]=rn(n),l=await t.dom2canvas(n,o,void 0,e.maxTextureSize);if(l.width===0||l.height===0)throw Error(`[VFX-JS] capture() got an empty snapshot.`);i.texture=e.createTexture(l),i.width=s,i.height=c,r.hide&&n.style.setProperty(`opacity`,`0`);let u=!1,d=null,f=null,p=async()=>{let r=i.texture.source,[a,s]=rn(n),c=await t.dom2canvas(n,o,r instanceof OffscreenCanvas?r:void 0,e.maxTextureSize);return u||c.width===0||c.height===0?!1:(i.texture=e.refreshTexture(i.texture,c),i.width=a,i.height=s,!0)},m=()=>u?Promise.resolve(!1):d?(f??=d.catch(()=>{}).then(()=>(f=null,m())),f):(d=p().finally(()=>{d=null}),d);return{box:n,sizeFollowsBox:!1,uploadEveryFrame:!1,update:m,resize(){let[e,t]=rn(n);(e!==i.width||t!==i.height)&&m().catch(e=>console.error(e))},dispose(){u=!0,r.hide&&(n.style.opacity=a)}}}function ln(e,t,n){let r=null,i=!1,a=B(()=>r,()=>r?n(r,`w`):0,()=>r?n(r,`h`):0);return{get texture(){return r?a:null},update(n){i||(r=r?t(r,n):e(n))},dispose(){i=!0,r?.dispose(),r=null}}}function un(e,t,n,r={setupCapture:_e,teardownCapture:ve}){let i=!1;return r.setupCapture(e,{onCapture:e=>t.update(e),maxSize:n}).then(n=>{i||(e.getContext(`2d`)?.clearRect(0,0,e.width,e.height),t.update(n))},e=>console.error(`[VFX-JS] live capture failed:`,e)),{get texture(){return t.texture},dispose(){i||(i=!0,r.teardownCapture(e),t.dispose())}}}function dn(){try{return window.matchMedia(`(prefers-reduced-motion: reduce)`).matches}catch{return!1}}var fn=e=>e*e*(3-2*e);function pn(e,t){return typeof e==`function`?e(t):e===`linear`?t:fn(t)}var mn={t:0,x:0},hn=class{enabled=!1;#e=null;#t=[0,0];#n=[];#r=!1;#i=null;#a=null;#o=mn;#s=null;#c=null;#l=null;#u(){let e=this.#c,t=this.#s;this.#c=null,this.#s=null;try{e?.()}finally{t?.()}}snapshot(){return this.#u(),this.#l=null,this.#i=null,this.enabled=!0,new Promise(e=>this.#n.push(e))}start(e){return this.#u(),this.#i=e,this.#c=e.onEnd??null,this.#a=null,this.#o=mn,this.#r=!1,this.enabled=this.#l!==null,new Promise(e=>{this.#s=e})}cancel(){this.#u(),this.#l=null,this.#i=null,this.#r=!1,this.enabled=!1,this.#d()}#d(){let e=this.#n;this.#n=[];for(let t of e)t()}setLiveSource(e){this.#l=e,e&&(this.#r||this.#i)&&(this.enabled=!0)}get frame(){let e=this.#e;return!e||!this.#r&&!this.#i?null:{from:e,progress:this.#o,holding:this.#i===null}}cut(){this.#i&&(this.#i=null,this.#u())}update(e){let t=this.#i;if(!t)return;this.#a===null&&(this.#a=e.time);let n=(e.time-this.#a)/t.duration;if(n>=1){this.#i=null,this.#u();return}let r=Math.max(n,0);this.#o={t:pn(t.ease,r),x:r}}#f(e){let[t,n]=e.dims.elementPixel;return this.#e&&this.#t[0]===t&&this.#t[1]===n||(this.#e?.dispose(),this.#e=e.createRenderTarget({size:[t,n]}),this.#t=[t,n]),this.#e}render(e){this.#n.length>0&&(e.blit(e.src,this.#f(e)),this.#r=!0,this.#d());let t=this.#l?.()??null;t&&(this.#r||this.#i)&&e.blit(t,this.#f(e)),this.#e&&this.#r?e.blit(this.#e):(this.#l&&this.#i||(this.enabled=!1),e.blit(e.src))}dispose(){this.#l=null,this.#e=null,this.#t=[0,0],this.#u(),this.#d()}},gn=class{effect;#e;#t=null;constructor(e,t){this.effect=e,this.#e=t}get enabled(){return this.#t!==null&&typeof this.effect.render==`function`&&this.effect.enabled!==!1}start(e){this.#t=e,this.effect.start?.(e)}end(){this.#t!==null&&(this.#t=null,this.effect.end?.())}#n(e){let t=this.#e.frame,n=this.#t;return!t||!n?null:{...e,from:t.from,progress:t.progress,holding:t.holding,reverse:n.reverse,run:n,cut:()=>this.#e.cut()}}init(e){return this.effect.init?.(e)}update(e){let t=this.#e.frame;if(!t||t.holding)return;let n=this.#n(e);n&&this.effect.update?.(n)}render(e){let t=this.#n(e);t&&this.effect.render?this.effect.render(t):e.blit(e.src)}outputRect(e){return this.#t?this.effect.outputRect?.(e):void 0}dispose(){this.effect.dispose?.()}};function _n(){let e=globalThis.navigation?.currentEntry;if(!(!e||e.index<0||!e.key))return{index:e.index,key:e.key}}function vn(e=_n){let t=new Map,n;return{pick(r){let i=e();if(!i)return r;let a=n??i;n=i;let o=t.get(a.key);if(i.index<a.index&&o)return{...o,reverse:!0};let s=t.get(i.key);return i.index>a.index&&s?s:(t.set(i.key,r),r)}}}var yn=vn(),bn=class{#e;#t;#n;#r=null;#i;#a=[];#o;#s=null;constructor(e,t){this.#e=e,this.#o=[t.scrollLeft,t.scrollTop];let n=t.parentElement??t,r=n.getBoundingClientRect(),i=document.createElement(`canvas`);i.inert=!0,i.setAttribute(`aria-hidden`,`true`),i.setAttribute(`data-vfx-keep-playing`,``);let a=i.style;a.setProperty(`position`,`absolute`),a.setProperty(`left`,`0px`),a.setProperty(`top`,`0px`),a.setProperty(`margin`,`0`),a.setProperty(`padding`,`0`),a.setProperty(`border`,`none`),a.setProperty(`pointer-events`,`none`);let s=t.cloneNode(!1);s.removeAttribute(`id`),s.style.setProperty(`margin`,`0`),s.style.setProperty(`box-sizing`,`border-box`),s.style.setProperty(`overflow`,`hidden`),i.append(s),o(i,s),n.parentNode&&n!==t?n.after(i):document.body.append(i);let c=i.getBoundingClientRect();a.setProperty(`left`,`${r.left-c.left}px`),a.setProperty(`top`,`${r.top-c.top}px`),getComputedStyle(s).display,this.#t=i,this.#n=s,this.#c(r.width,r.height),this.#i=e.freezeInside(i),n!==t&&typeof ResizeObserver<`u`&&(this.#s=new ResizeObserver(()=>{let{width:e,height:t}=n.getBoundingClientRect();this.#c(e,t)}),this.#s.observe(n))}#c(e,t){for(let n of[this.#t,this.#n])n.style.setProperty(`width`,`${e}px`),n.style.setProperty(`height`,`${t}px`)}get texture(){return this.#r?.texture??null}keep(e,t){for(let n of e){let e=n.parentNode;if(t){let r=e?document.createComment(``):null;r&&e?.insertBefore(r,n),this.#a.push({node:n,marker:r,onReturn:t})}A(this.#n,n,null)}[this.#n.scrollLeft,this.#n.scrollTop]=this.#o,this.#r??=this.#e.captureLive(this.#t)}dispose(){let e=this.#a;this.#a=[];try{this.#r?.dispose(),this.#r=null;for(let{node:t,marker:n,onReturn:r}of e){let e=n?.parentNode;e&&A(e,t,n),n?.remove();try{r(t)}catch(e){console.error(`[VFX-JS] keepPlaying onReturn failed:`,e)}}}finally{this.#s?.disconnect(),this.#t.remove(),this.#i()}}};function xn(e,t){let n=0,r;e?.addEventListener(`navigate`,e=>{let t=e;if(t.navigationType===`replace`)return;let i=t.hasUAVisualTransition&&t.destination?.key;r=i?{id:++n,key:i}:void 0}),!e&&t&&t.addEventListener(`popstate`,e=>{r=e.hasUAVisualTransition?{id:++n,href:t.location.href}:void 0},!0);let i=()=>{r=void 0};return t?.addEventListener(`pointerdown`,i,!0),t?.addEventListener(`keydown`,i,!0),{current(){if(r)return(r.key?e?.currentEntry?.key===r.key:t?.location.href===r.href)?r.id:void 0}}}var Sn;function Cn(){return Sn??=xn(globalThis.navigation,typeof window>`u`?void 0:window),Sn}var wn=.6,Tn=300,En=1e3,Dn={keepPlaying:()=>{}},On=e=>typeof e[Symbol.iterator]==`function`;function kn(e,t){let n=t.transition===void 0?e.params===void 0&&t.params===void 0?void 0:{...e.params,...t.params}:t.params;return{transition:t.transition??e.transition,params:n,reverse:t.reverse??e.reverse,duration:t.duration??e.duration,overflow:t.overflow??e.overflow,ease:t.ease??e.ease,keepPlaying:t.keepPlaying??e.keepPlaying}}function An(e,t={}){let n=kn(e,t);return{transition:n.transition??Be,params:n.params,reverse:n.reverse??!1,duration:n.duration??wn,overflow:n.overflow,ease:n.ease,keepPlaying:n.keepPlaying??!1}}var jn=e=>typeof e==`function`;function Mn(e,t){return Array.isArray(e)&&Array.isArray(t)?e.length===t.length&&e.every((e,n)=>e===t[n]):e===t}function Nn(e,t){let n=e??{},r=t??{},i=Object.keys(n);return i.length===Object.keys(r).length&&i.every(e=>e in r&&Mn(n[e],r[e]))}var H=new WeakMap;function Pn(e){let t=e.getBoundingClientRect();return t.right>0&&t.bottom>0&&t.left<window.innerWidth&&t.top<window.innerHeight}function Fn(e){return e.tagName===`IMG`?e.loading===`lazy`&&!Pn(e):e.preload===`none`}function In(e,t,n=Tn){let r=[];for(let t of e.querySelectorAll(`img, video`)){let e=t.tagName===`IMG`;!(e?t.complete:t.readyState>=2)&&!Fn(t)&&r.push(new Promise(n=>{let r=()=>n();t.addEventListener(e?`load`:`loadeddata`,r,{once:!0}),t.addEventListener(`error`,r,{once:!0})}))}return t&&r.push(t),r.length===0?Promise.resolve():new Promise(e=>{let t=setTimeout(e,n),i=()=>{clearTimeout(t),e()};Promise.all(r).then(i,i)})}function Ln(e,t){return new Promise((n,r)=>{let i=setTimeout(()=>n(!1),t);e.then(()=>{clearTimeout(i),n(!0)},e=>{clearTimeout(i),r(e)})})}var Rn=()=>new Promise(e=>requestAnimationFrame(()=>e()));function zn(e,t){return e.length===t.length&&e.every((e,n)=>e===t[n])}var Bn=class{#e;#t;#n;#r;#i;#a;#o;#s;#c;#l=[];#u=[];#d=!1;#f=!1;#p=!1;#m=0;#h=null;#g=!1;#_=!1;#v=null;#y=[];#b=null;#x=null;#S=null;#C=null;#w;constructor(e,t,n={},r,i=new hn,a=yn,o=Cn(),s=t=>new bn(e,t)){this.#w=s,this.#c=r,this.#e=e,this.#t=t,this.#n=n,this.#r=i,this.#i=a,this.#a=o,this.#s=n.keepWrapped??!1}get running(){return this.#h!==null}show(e,t={}){this.#z();let n=this.#T(e),{remove:r=!1,...i}=t;if(!this.running&&this.#E(n))return Promise.resolve();let a=this.#n.slideSpec?.(n),o=a?kn(a,i):i;return this.#D(e=>{let t=Array.from(this.#t.children).filter(e=>e!==n&&!e.hidden);e.keepPlaying(t,e=>{r?e.remove():e.hidden=!0}),n.parentElement!==this.#t&&this.#t.append(n);for(let e of Array.from(this.#t.children))e!==n&&(r?e.remove():e.hidden=!0);n.hidden=!1},o)}#T(e){let t=this.#t,n=typeof e==`number`?t.children[e]:typeof e==`string`?t.querySelector(e):e;if(!n)throw TypeError(`[VFX-JS] show(): no slide for ${e}.`);if(n.parentElement!==t&&(n.isConnected||t.contains(n)))throw TypeError(`[VFX-JS] show(): the slide must be a direct child of the container.`);return n}#E(e){return e.parentElement!==this.#t||e.hidden?!1:Array.from(this.#t.children).every(t=>t===e||t.hidden)}run(e,t={}){let n=this.#g?void 0:this.#a.current();if(n!==void 0&&n!==this.#o)return this.#o=n,this.#D(async n=>{await e(n);let r=typeof t==`function`?t():t;this.#n.autoReverse&&this.#i.pick(r)},{duration:0});if(!this.#n.autoReverse)return this.#D(e,t);let r=typeof t==`function`?void 0:t.keepPlaying??this.#n.keepPlaying;return this.#D(e,()=>this.#i.pick(typeof t==`function`?t():t),r)}async#D(e,t,n){if(this.#g){await e(Dn);return}this.#z();let r=++this.#m;this.#h=r;try{await this.#O(r,e,t,n)}finally{this.#h===r&&(this.#h=null),this.#m===r&&(this.#z(r),this.#I(),this.#F(),this.#j())}}async#O(e,t,n,r){let i=()=>e===this.#m,a=!1,o={keepPlaying:(t,n)=>{a&&i()&&this.#R(e,t,n)}},s=!1,c=async()=>{s||(s=!0,await t(o))};if(this.#e.reducedMotion){await c(),typeof n==`function`&&n();return}let l=async()=>{this.#B(),this.#z(e),this.#r.cancel(),await c(),i()&&(this.#_&&this.#s&&await this.#e.update(this.#t),this.#H(e))},u=null;if(typeof n!=`function`){if(u=this.#k(An(this.#n,n)),!i())return c();if(u===null)return l()}this.#P();try{await this.#V(u?.slots??null,i,!0)}catch(e){return console.error(`[VFX-JS] transition failed to wrap the element; cutting to the new content.`,e),c()}if(!i())return c();this.#u.push(this.#e.lockSize(this.#t)),this.#u.push(this.#e.forceRender(this.#t));let d=await Ln(this.#r.snapshot(),En);if(!i())return c();if(!d){this.#N(),await c(),i()&&this.#H(e);return}u&&this.#M(e,u);let f;a=u?u.keepPlaying:r??this.#n.keepPlaying??!1;try{await c(),typeof n==`function`&&i()&&(f=n())}catch(t){throw i()&&(this.#B(),this.#z(e),this.#r.cancel(),this.#H(e)),t}finally{a=!1}if(!i())return;if(u===null){if(u=this.#k(An(this.#n,f)),!i())return;if(u===null)return l();u.keepPlaying||this.#z(e);try{await this.#V(u.slots,i,!1)}catch(e){return console.error(`[VFX-JS] transition failed to swap the effects; cutting to the new content.`,e),l()}if(!i())return;this.#M(e,u)}this.#P();try{await this.#U()}catch(e){console.error(`[VFX-JS] transition waitFor failed:`,e)}if(!i()||(!await this.#e.updateInTime(this.#t)&&!this.#f&&(this.#f=!0,console.warn(`[VFX-JS] transition: the new content was not captured in time; it may pop in during the run.`)),!i())||(await Rn(),!i()))return;let p=await Ln(this.#r.start({duration:u.run.duration,ease:u.ease,onEnd:()=>{this.#B(e),this.#z(e)}}),u.run.duration*1e3+En);i()&&(p||this.#N(),this.#H(e))}#k(e){if(e.duration<=0)return null;let t=e.transition;if(!jn(t)&&!this.#A(t))return null;let n,r;try{({transition:n,slots:r}=this.#L(t,e.params))}catch(e){return console.error(`[VFX-JS] transition "${t.name}" constructor failed; cutting to the new content.`,e),null}let i={reverse:e.reverse,duration:e.duration},a=e.overflow??n.overflow;return a!==void 0&&(i.overflow=a),{run:i,ease:e.ease??n.ease??`smoothstep`,slots:r,keepPlaying:e.keepPlaying}}#A(e){let t=H.get(e);return t&&t!==this?(this.#p||(this.#p=!0,console.warn(`[VFX-JS] transition "${e.name??`unnamed`}" instance is running in another container; cutting to the new content. Pass the class to share it.`)),!1):(this.#x!==e&&this.#j(),H.set(e,this),this.#x=e,!0)}#j(){let e=this.#x;this.#x=null,e&&H.get(e)===this&&H.delete(e)}#M(e,{run:t,slots:n}){this.#B(),this.#S={id:e,slots:n};for(let e of n)e.start(t)}#N(){this.#d||(this.#d=!0,console.warn(`[VFX-JS] transition target did not render in time; cutting to the new content.`)),this.#B(),this.#z(),this.#r.cancel()}cancel(){let e=++this.#m;this.#h=null,this.#B(),this.#z(),this.#r.cancel(),this.#I(),this.#F(),this.#j(),this.#H(e)}destroy(){this.#g||(this.#g=!0,this.cancel(),this.#b=null,this.#c?.())}#P(){this.#l.push(this.#e.freezeInside(this.#t))}#F(){let e=this.#u;this.#u=[];for(let t of e)t()}#I(){let e=this.#l;this.#l=[];for(let t of e)t()}#L(e,t){let n=this.#b;if(n?.key.source===e&&(!jn(e)||Nn(n.key.params,t)))return n;let r=jn(e)?new e(t):e,i=[new gn(r,this.#r)];return this.#b={key:{source:e,params:t},transition:r,slots:i},{transition:r,slots:i}}#R(e,t,n){let r=On(t)?Array.from(t):[t];if(r.length!==0)try{if(this.#C?.id!==e){this.#z();let t=this.#w(this.#t);this.#C={id:e,from:t},this.#r.setLiveSource(()=>t.texture)}this.#C.from.keep(r,n)}catch(t){console.error(`[VFX-JS] transition failed to keep the old content; using a snapshot.`,t),this.#z(e)}}#z(e){let t=this.#C;!t||e!==void 0&&t.id!==e||(this.#C=null,this.#r.setLiveSource(null),t.from.dispose())}#B(e){let t=this.#S;if(t&&(e===void 0||t.id===e)){this.#S=null;for(let e of t.slots)e.end()}}async#V(e,t,n){if(this.#v&&await this.#v,!t())return;let r=e===null?this.#_?this.#y:[this.#r]:[this.#r,...e];if(this.#_){if(!zn(r,this.#y)){this.#y=r;let e=this.#e.updateEffects(this.#t,r).finally(()=>{this.#v=null});this.#v=e,await e}n&&await this.#e.update(this.#t)}else{let e=this.#e.addHTMLWithStill(this.#t,{effect:r}).then(()=>{this.#_=!0,this.#y=r}).finally(()=>{this.#v=null});this.#v=e,await e}}#H(e){if(this.#s&&!this.#g)return;let t=()=>{e===this.#m&&this.#_&&(this.#_=!1,this.#y=[],this.#e.remove(this.#t))};this.#v?this.#v.then(t,()=>{}):t()}#U(){let e=this.#n.waitFor??`media`;return e===`none`?Promise.resolve():e===`media`?In(this.#t,document.fonts?.ready):e(this.#t)}};function Vn(e){let t=typeof window<`u`?window.devicePixelRatio:1,n;n=e.scrollPadding===void 0?[.1,.1]:e.scrollPadding===!1?[0,0]:Array.isArray(e.scrollPadding)?[e.scrollPadding[0]??.1,e.scrollPadding[1]??.1]:[e.scrollPadding,e.scrollPadding];let r;return r=e.postEffect===void 0?[]:Array.isArray(e.postEffect)?e.postEffect:[e.postEffect],{pixelRatio:e.pixelRatio??t,zIndex:e.zIndex??void 0,autoplay:e.autoplay??!0,fixedCanvas:e.scrollPadding===!1,scrollPadding:n,wrapper:e.wrapper,postEffects:r,preserveDrawingBuffer:e.preserveDrawingBuffer??!1,timeScale:e.timeScale??1}}var Hn=class{pass;uniforms;constructor(t){this.uniforms={src:{value:null},offset:{value:new L},resolution:{value:new L},viewport:{value:new R}},this.pass=new bt(t,`
precision highp float;
in vec3 position;
void main() {
    gl_Position = vec4(position, 1.0);
}
`,e,this.uniforms,`premultiplied`)}setUniforms(e,t,n){this.uniforms.src.value=e,this.uniforms.resolution.value.set(n.w*t,n.h*t),this.uniforms.offset.value.set(n.x*t,n.y*t)}dispose(){this.pass.dispose()}};function Un(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:Array.isArray(e)?{top:e[0],right:e[1],bottom:e[2],left:e[3]}:{top:e.top??0,right:e.right??0,bottom:e.bottom??0,left:e.left??0}}function U(e){return Un(e)}var Wn={top:0,right:0,bottom:0,left:0};function W(e){return Un(e)}function Gn(e){return{top:e.top,right:e.right,bottom:e.bottom,left:e.left}}function Kn(e){return{top:e.top,left:e.left,right:e.left+Math.ceil(e.right-e.left),bottom:e.top+Math.ceil(e.bottom-e.top)}}function qn(e,t){return{top:e.top-t.top,right:e.right+t.right,bottom:e.bottom+t.bottom,left:e.left-t.left}}function Jn(e,t,n){return Math.min(Math.max(e,t),n)}function Yn(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return c<=0||l<=0?[0,0,1,1]:[(n-o)/c,(r-s)/l,i/c,a/l]}function Xn(e,t){return Zn(e.left,e.right,t.left,t.right)*Zn(e.top,e.bottom,t.top,t.bottom)}function Zn(e,t,n,r){let i=Math.min(r-n,t-e);if(i<=0)return 0;let a=Jn(n,e,t);return(Jn(r,e,t)-a)/i}var Qn=class{#e;#t;#n;#r;#i;#a;#o;#s;#c=[];#l=[];#u;#d=new Set;#f=!1;#p;#m=U(0);#h=null;constructor(e,t,n,r,i,a,o,s){this.#e=e,this.#t=t,this.#n=n,this.#r=i,this.#i=s,this.#a=r,this.#u=a,this.#p=o,this.#o=r.map(()=>this.#_()),r.length===0&&(this.#h=this.#_()),this.#s=this.#g()}#g(){return this.#a.map((e,t)=>typeof e.render==`function`&&e.enabled!==!1?t:-1).filter(e=>e>=0)}get effects(){return this.#a}get hosts(){return this.#o}get renderingIndices(){return this.#s}get stages(){return this.#l}get hitTestPadBuffer(){return this.#m}async initAll(){for(let e=0;e<this.#a.length;e++){let t=this.#a[e],n=this.#o[e];n.setPhase(`init`);try{t.init&&await t.init(n.ctx)}catch(t){console.error(`[VFX-JS] effect[${e}].init() failed:`,t);for(let t=e-1;t>=0;t--)this.#v(t),this.#o[t].dispose();throw this.#o[e].dispose(),t}n.setPhase(`update`)}}run(e){if(this.#f||!e.isVisible)return;this.#s=this.#g();let t=this.#s.length;for(let t of this.#o)t.setFrameState({time:e.time,deltaTime:e.deltaTime,mouse:e.mouse,mouseViewport:e.mouseViewport,intersection:e.intersection,enterTime:e.enterTime,leaveTime:e.leaveTime,enterProgress:e.enterProgress,leaveProgress:e.leaveProgress,uniforms:e.resolvedUniforms});this.#y(e);for(let t=0;t<this.#o.length;t++)this.#o[t].setFrameDims(this.#T(t,e)),this.#o[t].setEffectDims(this.#S(t,e));for(let e=0;e<this.#a.length;e++){let t=this.#a[e];if(!t.update)continue;let n=this.#o[e];n.setPhase(`update`);try{t.update(n.ctx)}catch(t){let n=`${e}:update`;this.#d.has(n)||(this.#d.add(n),console.warn(`[VFX-JS] effect[${e}].update() threw; skipping this frame's update:`,t))}}if(t===0)(this.#h??this.#o[0]).passthroughCopy(this.#u,e.finalTarget,e.elementRectOnCanvasPx);else for(let n=0;n<t;n++){let r=this.#s[n],i=this.#o[r],a=this.#a[r];if(!a.render)continue;i.setPhase(`render`),i.tickAutoUpdates();let o=n===0?this.#u:this.#c[n-1].texHandle;i.setSrc(o);let s;n===t-1?s=e.finalTarget:(s=this.#c[n].rtHandle,i.clearRt(s)),i.setOutput(s);try{a.render(i.ctx)}catch(e){let a=`${r}:render`;this.#d.has(a)||(this.#d.add(a),console.warn(`[VFX-JS] effect[${r}].render() threw; falling back to passthrough:`,e));let c=this.#l[n].outputViewport;s===null?i.passthroughCopy(o,null,c):n===t-1?i.passthroughCopy(o,s,c):i.passthroughCopy(o,s,{x:0,y:0,w:s.width,h:s.height})}i.setPhase(`update`)}}dispose(){if(!this.#f){this.#f=!0;for(let e=this.#a.length-1;e>=0;e--)this.#v(e),this.#o[e].dispose();this.#h&&=(this.#h.dispose(),null);for(let e of this.#c)e.fb.dispose();this.#c=[],this.#l=[]}}async replaceEffects(e){if(this.#f)throw Error(`[VFX-JS] replaceEffects on disposed chain`);let t=this.#a,n=this.#o,r=new Map;for(let e=0;e<t.length;e++)r.set(t[e],n[e]);let i=Array(e.length),a=[];for(let t=0;t<e.length;t++){let n=e[t],o=r.get(n);if(o)i[t]=o,r.delete(n);else{let e=this.#_();i[t]=e,a.push({host:e,effect:n})}}for(let e=0;e<a.length;e++){let{host:t,effect:n}=a[e];t.setPhase(`init`);try{n.init&&await n.init(t.ctx),t.setPhase(`update`)}catch(n){console.error(`[VFX-JS] replaceEffects: new effect init() failed:`,n);for(let t=e-1;t>=0;t--){let e=a[t];if(e.effect.dispose)try{e.effect.dispose()}catch(e){console.error(`[VFX-JS] dispose during init rollback threw:`,e)}e.host.dispose()}throw t.dispose(),n}}for(let[e,t]of r){if(e.dispose)try{e.dispose()}catch(e){console.error(`[VFX-JS] effect.dispose() threw during replaceEffects:`,e)}t.dispose()}for(let e of this.#c)e.fb.dispose();this.#c=[],this.#l=[],e.length===0&&!this.#h?this.#h=this.#_():e.length>0&&this.#h&&(this.#h.dispose(),this.#h=null),this.#a=e,this.#o=i,this.#s=this.#g(),this.#d.clear()}#_(){return new Ht(this.#e,this.#t,this.#n,this.#u,this.#r,this.#i)}#v(e){let t=this.#a[e];if(t.dispose)try{t.dispose()}catch(t){console.error(`[VFX-JS] effect[${e}].dispose() threw:`,t)}}#y(e){let t=this.#s.length;if(this.#l=Array(t),t===0)return;let n=this.#p?e.canvasBufferSize:e.elementBufferSize,r=[0,0,n[0],n[1]],i=this.#w(e),a=r;for(let n=0;n<t;n++){let o=this.#s[n],s=this.#a[o],c=n===t-1,l=this.#b(s,a,r,i,e)??a,u=[l[2],l[3]],d=Yn(r,l),f=c?{x:e.elementRectOnCanvasPx.x+l[0],y:e.elementRectOnCanvasPx.y+l[1],w:u[0],h:u[1]}:{x:0,y:0,w:u[0],h:u[1]};this.#l[n]={dstRect:l,dstBufferSize:u,contentRectUv:d,outputViewport:f},c||this.#C(n,u),a=l}let[o,s,c,l]=this.#l[t-1].dstRect;this.#m=U({top:Math.max(0,s+l-n[1]),right:Math.max(0,o+c-n[0]),bottom:Math.max(0,-s),left:Math.max(0,-o)})}#b(e,t,n,r,i){if(e.outputRect)return e.outputRect(this.#x(i,n,t,r))}#x(e,t,n,r){let i=e.canvasBufferSize[0]/e.canvasSize[0]||1;return{element:this.#p?e.canvasSize:e.elementSize,elementPixel:this.#p?e.canvasBufferSize:e.elementBufferSize,canvas:e.canvasSize,canvasPixel:e.canvasBufferSize,pixelRatio:i,contentRect:t,srcRect:n,canvasRect:r}}#S(e,t){let n=this.#p?t.canvasBufferSize:t.elementBufferSize,r=[0,0,n[0],n[1]],i=this.#w(t),a=this.#s.indexOf(e),o=a<=0?r:this.#l[a-1].dstRect;return this.#x(t,r,o,i)}#C(e,t){let n=this.#c[e];if(n&&n.fb.width===t[0]&&n.fb.height===t[1])return;n&&n.fb.dispose();let r=new P(this.#e,t[0],t[1]),i=qt(r),a=B(()=>r.texture,()=>r.width,()=>r.height);this.#c[e]={fb:r,rtHandle:i,texHandle:a,bufferSize:t}}#w(e){let[t,n]=e.canvasBufferSize;if(this.#p)return[0,0,t,n];let{x:r,y:i}=e.elementRectOnCanvasPx;return[-r,-i,t,n]}#T(e,t){let n=this.#s.indexOf(e),r,i,a,o,s;if(n<0)r=t.elementBufferSize[0],i=t.elementBufferSize[1],a={x:0,y:0,w:r,h:i},o=[0,0,1,1],s=[0,0,1,1];else{let e=this.#l[n];r=e.dstBufferSize[0],i=e.dstBufferSize[1],a=e.outputViewport,o=e.contentRectUv,s=n===0?[0,0,1,1]:this.#l[n-1].contentRectUv}return{outputBufferW:r,outputBufferH:i,canvasBufferSize:t.canvasBufferSize,outputViewport:a,elementBufferW:t.elementBufferSize[0],elementBufferH:t.elementBufferSize[1],contentRectUv:o,srcRectUv:s}}},$n=class{#e;#t=new Set;constructor(e){this.#e=e}freezeInside(e,t){let n={root:e,entries:[]};for(let r of t)!r.frozen&&er(e,r.element)&&(r.frozen=!0,n.entries.push({e:r,opacity:r.element.style.opacity}),this.#e.showPlain(r));this.#t.add(n);let r=!1;return()=>{if(!r){r=!0,this.#t.delete(n);for(let{e}of n.entries)e.frozen=!1;requestAnimationFrame(()=>{for(let{e,opacity:t}of n.entries)!e.frozen&&this.#e.isRegistered(e)&&this.#e.hidePlain(e,t)})}}}adopt(e,t){let n=this.#n(e.element);return n?(e.frozen=!0,n.entries.push({e,opacity:t??e.element.style.opacity}),!0):!1}#n(e){for(let t of this.#t)if(er(t.root,e))return t}};function er(e,t){return t!==e&&e.contains(t)}function G(e){this.data=e,this.pos=0}G.prototype.readByte=function(){return this.data[this.pos++]},G.prototype.peekByte=function(){return this.data[this.pos]},G.prototype.readBytes=function(e){return this.data.subarray(this.pos,this.pos+=e)},G.prototype.peekBytes=function(e){return this.data.subarray(this.pos,this.pos+e)},G.prototype.readString=function(e){for(var t=``,n=0;n<e;n++)t+=String.fromCharCode(this.readByte());return t},G.prototype.readBitArray=function(){for(var e=[],t=this.readByte(),n=7;n>=0;n--)e.push(!!(t&1<<n));return e},G.prototype.readUnsigned=function(e){var t=this.readBytes(2);return e?(t[1]<<8)+t[0]:(t[0]<<8)+t[1]};function K(e){this.stream=new G(e),this.output={}}K.prototype.parse=function(e){return this.parseParts(this.output,e),this.output},K.prototype.parseParts=function(e,t){for(var n=0;n<t.length;n++){var r=t[n];this.parsePart(e,r)}},K.prototype.parsePart=function(e,t){var n=t.label,r;if(!t.requires||t.requires(this.stream,this.output,e)){if(t.loop){for(var i=[];t.loop(this.stream);){var a={};this.parseParts(a,t.parts),i.push(a)}e[n]=i}else t.parts?(r={},this.parseParts(r,t.parts),e[n]=r):t.parser?(r=t.parser(this.stream,this.output,e),t.skip||(e[n]=r)):t.bits&&(e[n]=this.parseBits(t.bits))}};function tr(e){return e.reduce(function(e,t){return e*2+t},0)}K.prototype.parseBits=function(e){var t={},n=this.stream.readBitArray();for(var r in e){var i=e[r];t[r]=i.length?tr(n.slice(i.index,i.index+i.length)):n[i.index]}return t};var q={readByte:function(){return function(e){return e.readByte()}},readBytes:function(e){return function(t){return t.readBytes(e)}},readString:function(e){return function(t){return t.readString(e)}},readUnsigned:function(e){return function(t){return t.readUnsigned(e)}},readArray:function(e,t){return function(n,r,i){for(var a=t(n,r,i),o=Array(a),s=0;s<a;s++)o[s]=n.readBytes(e);return o}}},J={label:`blocks`,parser:function(e){for(var t=[],n=0,r=0,i=e.readByte();i!==r;i=e.readByte())t.push(e.readBytes(i)),n+=i;var a=new Uint8Array(n);n=0;for(var o=0;o<t.length;o++)a.set(t[o],n),n+=t[o].length;return a}},nr={label:`gce`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===249},parts:[{label:`codes`,parser:q.readBytes(2),skip:!0},{label:`byteSize`,parser:q.readByte()},{label:`extras`,bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:`delay`,parser:q.readUnsigned(!0)},{label:`transparentColorIndex`,parser:q.readByte()},{label:`terminator`,parser:q.readByte(),skip:!0}]},rr={label:`image`,requires:function(e){return e.peekByte()===44},parts:[{label:`code`,parser:q.readByte(),skip:!0},{label:`descriptor`,parts:[{label:`left`,parser:q.readUnsigned(!0)},{label:`top`,parser:q.readUnsigned(!0)},{label:`width`,parser:q.readUnsigned(!0)},{label:`height`,parser:q.readUnsigned(!0)},{label:`lct`,bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:`lct`,requires:function(e,t,n){return n.descriptor.lct.exists},parser:q.readArray(3,function(e,t,n){return 2**(n.descriptor.lct.size+1)})},{label:`data`,parts:[{label:`minCodeSize`,parser:q.readByte()},J]}]},ir={label:`text`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===1},parts:[{label:`codes`,parser:q.readBytes(2),skip:!0},{label:`blockSize`,parser:q.readByte()},{label:`preData`,parser:function(e,t,n){return e.readBytes(n.text.blockSize)}},J]},ar={label:`frames`,parts:[nr,{label:`application`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===255},parts:[{label:`codes`,parser:q.readBytes(2),skip:!0},{label:`blockSize`,parser:q.readByte()},{label:`id`,parser:function(e,t,n){return e.readString(n.blockSize)}},J]},{label:`comment`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===254},parts:[{label:`codes`,parser:q.readBytes(2),skip:!0},J]},rr,ir],loop:function(e){var t=e.peekByte();return t===33||t===44}},or=[{label:`header`,parts:[{label:`signature`,parser:q.readString(3)},{label:`version`,parser:q.readString(3)}]},{label:`lsd`,parts:[{label:`width`,parser:q.readUnsigned(!0)},{label:`height`,parser:q.readUnsigned(!0)},{label:`gct`,bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:`backgroundColorIndex`,parser:q.readByte()},{label:`pixelAspectRatio`,parser:q.readByte()}]},{label:`gct`,requires:function(e,t){return t.lsd.gct.exists},parser:q.readArray(3,function(e,t){return 2**(t.lsd.gct.size+1)})},ar];function sr(e){var t=new K(new Uint8Array(e));this.raw=t.parse(or),this.raw.hasImages=!1;for(var n=0;n<this.raw.frames.length;n++)if(this.raw.frames[n].image){this.raw.hasImages=!0;break}}sr.prototype.decompressFrame=function(e,t){if(e>=this.raw.frames.length)return null;var n=this.raw.frames[e];if(n.image){var r=n.image.descriptor.width*n.image.descriptor.height,i=o(n.image.data.minCodeSize,n.image.data.blocks,r);n.image.descriptor.lct.interlaced&&(i=s(i,n.image.descriptor.width));var a={pixels:i,dims:{top:n.image.descriptor.top,left:n.image.descriptor.left,width:n.image.descriptor.width,height:n.image.descriptor.height}};return a.colorTable=n.image.descriptor.lct&&n.image.descriptor.lct.exists?n.image.lct:this.raw.gct,n.gce&&(a.delay=(n.gce.delay||10)*10,a.disposalType=n.gce.extras.disposal,n.gce.extras.transparentColorGiven&&(a.transparentIndex=n.gce.transparentColorIndex)),t&&(a.patch=c(a)),a}return null;function o(e,t,n){var r=4096,i=-1,a=n,o,s,c,l,u,d,f,p,m,h,g,_,v,y,b,x,S=Array(n),C=Array(r),w=Array(r),T=Array(r+1);for(_=e,s=1<<_,u=s+1,o=s+2,f=i,l=_+1,c=(1<<l)-1,m=0;m<s;m++)C[m]=0,w[m]=m;for(g=p=v=y=x=b=0,h=0;h<a;){if(y===0){if(p<l){g+=t[b]<<p,p+=8,b++;continue}if(m=g&c,g>>=l,p-=l,m>o||m==u)break;if(m==s){l=_+1,c=(1<<l)-1,o=s+2,f=i;continue}if(f==i){T[y++]=w[m],f=m,v=m;continue}for(d=m,m==o&&(T[y++]=v,m=f);m>s;)T[y++]=w[m],m=C[m];v=w[m]&255,T[y++]=v,o<r&&(C[o]=f,w[o]=v,o++,(o&c)===0&&o<r&&(l++,c+=o)),f=d}y--,S[x++]=T[y],h++}for(h=x;h<a;h++)S[h]=0;return S}function s(e,t){for(var n=Array(e.length),r=e.length/t,i=function(r,i){var a=e.slice(i*t,(i+1)*t);n.splice.apply(n,[r*t,t].concat(a))},a=[0,4,2,1],o=[8,8,4,2],s=0,c=0;c<4;c++)for(var l=a[c];l<r;l+=o[c])i(l,s),s++;return n}function c(e){for(var t=e.pixels.length,n=new Uint8ClampedArray(t*4),r=0;r<t;r++){var i=r*4,a=e.pixels[r],o=e.colorTable[a];n[i]=o[0],n[i+1]=o[1],n[i+2]=o[2],n[i+3]=a===e.transparentIndex?0:255}return n}},sr.prototype.decompressFrames=function(e,t,n){t===void 0&&(t=0),n=n===void 0?this.raw.frames.length:Math.min(n,this.raw.frames.length);for(var r=[],i=t;i<n;i++)this.raw.frames[i].image&&r.push(this.decompressFrame(i,e));return r};var cr=sr,lr=class e{frames=[];index=0;canvas;ctx;pixelRatio;startTime;playTime=0;static async create(t,n){let r=await fetch(t).then(e=>e.arrayBuffer()).then(e=>new cr(e)),i=r.decompressFrames(!0,void 0,void 0),{width:a,height:o}=r.raw.lsd;return new e(i,a,o,n)}constructor(e,t,n,r){this.frames=e,this.canvas=document.createElement(`canvas`),this.ctx=this.canvas.getContext(`2d`),this.pixelRatio=r,this.canvas.width=t,this.canvas.height=n,this.startTime=Date.now()}getCanvas(){return this.canvas}update(){let e=Date.now()-this.startTime;for(;this.playTime<e;){let e=this.frames[this.index%this.frames.length];this.playTime+=e.delay,this.index++}let t=this.frames[this.index%this.frames.length],n=new ImageData(t.patch,t.dims.width,t.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(n,t.dims.left,t.dims.top)}},ur=class{gl;canvas;maxTextureSize;floatLinearFilter=!1;floatBlend=!1;isContextLost=!1;#e=new Set;#t=new Set;#n=new Set;constructor(e,t=!1){let n=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:t});if(!n)throw Error(`[VFX-JS] WebGL2 is not available.`);this.gl=n,this.canvas=e,this.#r(),this.maxTextureSize=n.getParameter(n.MAX_TEXTURE_SIZE),e.addEventListener(`webglcontextlost`,this.#i,!1),e.addEventListener(`webglcontextrestored`,this.#a,!1)}setSize(e,t,n){let r=Math.floor(e*n),i=Math.floor(t*n);(this.canvas.width!==r||this.canvas.height!==i)&&(this.canvas.width=r,this.canvas.height=i)}addResource(e){this.#e.add(e)}removeResource(e){this.#e.delete(e)}onContextLost(e){return this.#t.add(e),()=>this.#t.delete(e)}onContextRestored(e){return this.#n.add(e),()=>this.#n.delete(e)}#r(){let e=this.gl;e.getExtension(`EXT_color_buffer_float`),e.getExtension(`EXT_color_buffer_half_float`),this.floatBlend=!!e.getExtension(`EXT_float_blend`),this.floatLinearFilter=!!e.getExtension(`OES_texture_float_linear`)}#i=e=>{e.preventDefault(),this.isContextLost=!0;for(let e of this.#t)e()};#a=()=>{this.isContextLost=!1,this.#r();for(let e of this.#e)e.restore();for(let e of this.#n)e()}},dr=class{gl;vao;#e;#t;constructor(e){this.#e=e,this.gl=e.gl,this.#n(),e.addResource(this)}#n(){let e=this.gl,t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw Error(`[VFX-JS] Failed to create quad VAO`);this.vao=t,this.#t=n;let r=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)}restore(){this.#n()}draw(){let e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){this.#e.removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(this.#t)}};function fr(e){return{phase:`hidden`,direction:1,enterProgress:0,leaveProgress:0,isIn:!1,wasAbove:!1,wasBelow:!1,lastTime:e}}function pr(e,t,n,r,i){let a=r===0?n:t>=r,o=i===0?!n:t<i,s=a&&!e.wasAbove,c=o&&!e.wasBelow;if(e.wasAbove=a,e.wasBelow=o,a&&!o)return!0;if(o&&!a)return!1;if(a&&o){if(s)return!0;if(c)return!1}return e.isIn}function mr(e,t){e.lastTime=t}function hr(e,t,n,r){let i=n-e.lastTime;if(e.lastTime=n,e.isIn=t,gr(e,t))return e;let a=(i<0?i:e.direction*i)/r;if(e.phase===`entering`){let t=e.enterProgress+a;a>0&&t>=1?Y(e,`shown`):a<0&&t<=0?Y(e,`hidden`):e.enterProgress=_r(t)}else if(e.phase===`leaving`){let t=e.leaveProgress+a;a>0&&t>=1?Y(e,`hidden`):a<0&&t<=0?Y(e,`shown`):e.leaveProgress=_r(t)}return e}function gr(e,t){switch(e.phase){case`hidden`:return t?(e.phase=`entering`,e.direction=1,!0):!1;case`shown`:return!t&&(e.phase=`leaving`,e.direction=1,!0);case`entering`:return e.direction=t?1:-1,!1;case`leaving`:return e.direction=t?-1:1,!1}}function Y(e,t){e.phase=t,e.direction=1,e.enterProgress=+(t===`shown`),e.leaveProgress=0}function _r(e){return Math.min(Math.max(e,0),1)}function vr(e,t,n,r={}){return new P(e,t,n,{float:r.float??!1})}function yr(e,t){let n=t.renderingToBuffer??!1,r;r=n?`none`:t.premultipliedAlpha?`premultiplied`:`normal`;let i=t.glslVersion??dt(t.fragmentShader);return new bt(e,t.vertexShader??(i===`100`?`
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
`),t.fragmentShader,t.uniforms,r,i)}var br=class{pass;#e;#t;#n;#r;#i;#a;constructor(e,t,n,r,i,a,o,s){if(this.#r=r??!1,this.#i=i??!1,this.#a=a,this.#t={},this.#e={src:{value:null},offset:{value:new L},resolution:{value:new L},viewport:{value:new R},time:{value:0},mouse:{value:new L},passIndex:{value:0}},n)for(let[e,t]of Object.entries(n))typeof t==`function`?(this.#t[e]=t,this.#e[e]={value:t()}):this.#e[e]={value:t};this.pass=yr(e,{fragmentShader:t,uniforms:this.#e,renderingToBuffer:o??!1,premultipliedAlpha:!0,glslVersion:s})}get uniforms(){return this.#e}setUniforms(e,t,n,r,i,a){this.#e.src.value=e,this.#e.resolution.value.set(n.w*t,n.h*t),this.#e.offset.value.set(n.x*t,n.y*t),this.#e.time.value=r,this.#e.mouse.value.set(i*t,a*t)}updateCustomUniforms(e){for(let[e,t]of Object.entries(this.#t))this.#e[e]&&(this.#e[e].value=t());if(e)for(let[t,n]of Object.entries(e))this.#e[t]&&(this.#e[t].value=n())}initializeBackbuffer(e,t,n,r){this.#r&&!this.#n&&(this.#n=this.#a?new I(e,this.#a[0],this.#a[1],1,this.#i):new I(e,t,n,r,this.#i))}resizeBackbuffer(e,t){this.#n&&!this.#a&&this.#n.resize(e,t)}registerBufferUniform(e){this.#e[e]||(this.#e[e]={value:null})}get backbuffer(){return this.#n}get persistent(){return this.#r}get float(){return this.#i}get size(){return this.#a}dispose(){this.pass.dispose(),this.#n?.dispose()}},xr=class{#e;#t=new Map;constructor(e){this.#e=e}get(e,t,n){let r=`${t}\0${e}\0${n??``}`,i=this.#t.get(r);return i||(i=new ft(this.#e,e,t,n),this.#t.set(r,i)),i}get size(){return this.#t.size}dispose(){for(let e of this.#t.values())e.dispose();this.#t.clear()}},X=new Map,Sr=!1;function Cr(e,t){return e===`hic`||t===!0?null:typeof t==`number`?t.toString():e===`video`?`0.0001`:`0`}function wr(e,t){let n=e.getContext(`2d`);n&&(n.clearRect(0,0,e.width,e.height),n.drawImage(t,0,0,e.width,e.height))}var Tr=class{#e;#t;#n;#r;#i;#a;#o;#s=[];#c;#l=new Map;#u=null;#d=!1;#f=new WeakSet;#p={};#m={};#h=0;#g=void 0;#_=2;#v=[];#y=new $n({showPlain:e=>{if(e.type===`hic`){let t=e.srcTexture.source;t instanceof OffscreenCanvas&&wr(e.element,t)}else e.element.style.setProperty(`opacity`,e.originalOpacity.toString())},hidePlain:(e,t)=>{if(e.type===`hic`){let t=e.element;t.getContext(`2d`)?.clearRect(0,0,t.width,t.height)}else e.element.style.opacity=t},isRegistered:e=>this.#v.includes(e)});#b=0;#x=1;#S=Date.now()/1e3;#C=!1;#w=W(0);#T=W(0);#E=[0,0];#D=0;#O=0;#k=0;#A=0;#j=new WeakMap;#M=new Set;#N;constructor(e,t){this.#e=e,this.#t=t,this.#n=new ur(t,e.preserveDrawingBuffer),this.#r=this.#n.gl,this.#r.clearColor(0,0,0,0),this.#_=e.pixelRatio,this.#x=e.timeScale,this.#S=Date.now()/1e3,this.#i=new dr(this.#n),this.#a=new xr(this.#n),this.#N=new N(this.#n),typeof window<`u`&&(window.addEventListener(`resize`,this.#F),window.addEventListener(`pointermove`,this.#I)),this.#F(),this.#o=new Hn(this.#n),this.#ee(e.postEffects),this.#n.onContextRestored(()=>{this.#r.clearColor(0,0,0,0)})}destroy(){this.stop(),typeof window<`u`&&(window.removeEventListener(`resize`,this.#F),window.removeEventListener(`pointermove`,this.#I)),this.#c?.dispose();for(let e of this.#l.values())e?.dispose();for(let e of this.#s)e.pass.dispose();this.#u&&(this.#u.dispose(),this.#u=null,this.#d=!1);for(let e of[...this.#M])e.capture.dispose();this.#N.dispose(),this.#o.dispose(),this.#a.dispose(),this.#i.dispose()}#P(){if(typeof window>`u`)return;let e=this.#t.ownerDocument,t=e.compatMode===`BackCompat`?e.body:e.documentElement,n=t.clientWidth,r=t.clientHeight,i=window.scrollX,a=window.scrollY,o,s;if(this.#e.fixedCanvas)o=0,s=0;else if(this.#e.wrapper)o=n*this.#e.scrollPadding[0],s=r*this.#e.scrollPadding[1];else{let t=e.body.scrollWidth-(i+n),c=e.body.scrollHeight-(a+r);o=Pr(n*this.#e.scrollPadding[0],0,t),s=Pr(r*this.#e.scrollPadding[1],0,c)}let c=n+o*2,l=r+s*2;(c!==this.#E[0]||l!==this.#E[1])&&(this.#t.style.width=`${c}px`,this.#t.style.height=`${l}px`,this.#n.setSize(c,l,this.#_),this.#w=W({top:-s,left:-o,right:n+o,bottom:r+s}),this.#T=W({top:0,left:0,right:n,bottom:r}),this.#E=[c,l],this.#D=o,this.#O=s),this.#e.fixedCanvas||this.#t.style.setProperty(`transform`,`translate(${i-o}px, ${a-s}px)`)}#F=async()=>{if(typeof window<`u`){for(let e of this.#M)e.resize();for(let e of this.#v)if(e.type===`text`&&e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await this.#L(e),e.width=n,e.height=r)}for(let e of this.#v)if(e.type===`text`&&!e.isInViewport){let t=e.element.getBoundingClientRect(),n=Math.ceil(t.width),r=Math.ceil(t.height);(n!==e.width||r!==e.height)&&(await this.#L(e),e.width=n,e.height=r)}}};#I=e=>{typeof window<`u`&&(this.#k=e.clientX,this.#A=window.innerHeight-e.clientY)};async#L(e){if(!this.#j.get(e.element)){this.#j.set(e.element,!0);try{let t=e.srcTexture,n=t.source instanceof OffscreenCanvas?t.source:void 0,r=await M(e.element,e.originalOpacity,n,this.maxTextureSize);if(r.width===0||r.height===0)return;let i=new N(this.#n,r);i.wrapS=t.wrapS,i.wrapT=t.wrapT,i.premultiplyAlpha=t.premultiplyAlpha,i.needsUpdate=!0,!e.chain&&e.passes.length>0&&(e.passes[0].uniforms.src.value=i),e.srcTexture=i,t.dispose()}catch(e){console.error(e)}finally{this.#j.set(e.element,!1)}}}async addElement(e,t={},n){if(t.effect!==void 0)return this.#z(e,t,t.effect,n);let r=this.#B(t),i=e.getBoundingClientRect(),o=Ir(e)?Kn(i):Gn(i),[s,c]=Dr(t.overflow),l=qn(o,c),u=jr(t.intersection),f=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),p,m,h=!1;if(e instanceof HTMLImageElement){m=`img`;let t=d(e);if(h=!!t.match(/\.gif/i),h){let n=await lr.create(t,this.#_);X.set(e,n),p=new N(this.#n,n.getCanvas())}else{let e=await $e(t);p=new N(this.#n,e)}}else if(e instanceof HTMLVideoElement)p=new N(this.#n,e),m=`video`;else if(e instanceof HTMLCanvasElement)a(e)&&n?(p=new N(this.#n,n),m=`hic`):(p=new N(this.#n,e),m=`canvas`);else{let t=await M(e,f,void 0,this.maxTextureSize);p=new N(this.#n,t),m=`text`}let[g,_]=Nr(t.wrap);p.wrapS=g,p.wrapT=_,p.needsUpdate=!0;let v=t.autoCrop??!0,y=Cr(m,t.overlay),b={src:{value:p},resolution:{value:new L},offset:{value:new L},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},enterProgress:{value:0},leaveProgress:{value:0},mouse:{value:new L},intersection:{value:0},viewport:{value:new R},autoCrop:{value:v}},x={};if(t.uniforms!==void 0)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(b[e]={value:n()},x[e]=n):b[e]={value:n};let S;t.backbuffer&&(S=(()=>{let e=(l.right-l.left)*this.#_,t=(l.bottom-l.top)*this.#_;return new I(this.#n,e,t,this.#_,!1)})(),b.backbuffer={value:S.texture});let C=new Map,w=new Map;for(let e=0;e<r.length-1;e++){let t=r[e].target??`pass${e}`;r[e]={...r[e],target:t};let n=r[e].size,i=n?n[0]:(l.right-l.left)*this.#_,a=n?n[1]:(l.bottom-l.top)*this.#_;if(r[e].persistent){let i=n?1:this.#_,a=n?n[0]:l.right-l.left,o=n?n[1]:l.bottom-l.top;w.set(t,new I(this.#n,a,o,i,r[e].float))}else C.set(t,vr(this.#n,i,a,{float:r[e].float}))}let T=[];for(let e=0;e<r.length;e++){let t=r[e],n=t.frag,i={...b},a={};for(let[e,r]of C)e!==t.target&&n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:r.texture});for(let[e,t]of w)n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:t.texture});if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(i[e]={value:n()},a[e]=n):i[e]={value:n};let o=yr(this.#n,{vertexShader:t.vert,fragmentShader:n,uniforms:i,renderingToBuffer:t.target!==void 0,glslVersion:t.glslVersion});T.push({pass:o,uniforms:i,uniformGenerators:{...x,...a},target:t.target,persistent:t.persistent,float:t.float,size:t.size,backbuffer:t.target?w.get(t.target):void 0})}let E=this.#b,D={type:m,element:e,isInViewport:!1,intersectionState:fr(E),width:o.right-o.left,height:o.bottom-o.top,passes:T,bufferTargets:C,startTime:E,enterTime:E,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:s,overflow:c,intersection:u,originalOpacity:f,srcTexture:p,zIndex:t.zIndex??0,backbuffer:S,autoCrop:v};this.#X(D,o,E),this.#R(D,y)}#R(e,t){!this.#y.adopt(e,t)&&t!==null&&e.element.style.setProperty(`opacity`,t),this.#v.push(e),this.#v.sort((e,t)=>e.zIndex-t.zIndex)}async#z(e,t,n,r){t.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified; `effect` takes precedence."),t.overflow!==void 0&&console.warn("[VFX-JS] `overflow` is shader-path only and is ignored by the effect path. Use each effect's own `outputRect` (with `dims.canvasRect` for fullscreen) to control its dst rect.");let i=Array.isArray(n)?[...n]:[n];this.#q(i);let o=e.getBoundingClientRect(),s=Ir(e)?Kn(o):Gn(o),[c,l]=Dr(t.overflow),u=jr(t.intersection),f=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),p,m,h=!1;if(e instanceof HTMLImageElement){m=`img`;let t=d(e);if(h=!!t.match(/\.gif/i),h){let n=await lr.create(t,this.#_);X.set(e,n),p=new N(this.#n,n.getCanvas())}else{let e=await $e(t);p=new N(this.#n,e)}}else if(e instanceof HTMLVideoElement)p=new N(this.#n,e),m=`video`;else if(e instanceof HTMLCanvasElement)a(e)&&r?(p=new N(this.#n,r),m=`hic`):(p=new N(this.#n,e),m=`canvas`);else{let t=await M(e,f,void 0,this.maxTextureSize);p=new N(this.#n,t),m=`text`}let[g,_]=Nr(t.wrap);p.wrapS=g,p.wrapT=_,p.premultiplyAlpha=!0,p.needsUpdate=!0;let v=t.autoCrop??!0,y=Cr(m,t.overlay),b=this.#b,x={type:m,element:e,isInViewport:!1,intersectionState:fr(b),width:s.right-s.left,height:s.bottom-s.top,passes:[],bufferTargets:new Map,startTime:b,enterTime:b,leaveTime:-1/0,release:t.release??1/0,isGif:h,isFullScreen:c,overflow:l,intersection:u,originalOpacity:f,srcTexture:p,zIndex:t.zIndex??0,backbuffer:void 0,autoCrop:v,effectLastRenderTime:b},S=B(()=>x.srcTexture,()=>Z(x.srcTexture,`w`),()=>Z(x.srcTexture,`h`)),C={},w={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(w[e]=n,C[e]=n()):C[e]=n;x.effectUniformGenerators=w,x.effectStaticUniforms=C;let T={autoCrop:v,glslVersion:t.glslVersion??`300 es`},E=new Qn(this.#n,this.#i,this.#_,i,T,S,!1,this.#a);try{await E.initAll()}catch(t){throw this.#J(i),p.dispose(),e.style.setProperty(`opacity`,f.toString()),t}x.chain=E,this.#X(x,s,b),this.#R(x,y)}#B(e){let t=t=>t.glslVersion===void 0&&e.glslVersion!==void 0?{...t,glslVersion:e.glslVersion}:t;return Array.isArray(e.shader)?e.shader.map(t):[t({frag:this.#Z(e.shader||`uvGradient`)})]}async updateElementEffects(e,t){let n=this.#v.find(t=>t.element===e);if(!n)throw Error(`[VFX-JS] updateElementEffects: element not registered`);if(!n.chain)throw Error(`[VFX-JS] updateElementEffects: element is on the shader path; effect-only updates are not supported`);let r=Array.isArray(t)?[...t]:[t],i=n.chain.effects,a=new Set(i),o=[];for(let e of r)if(!a.has(e)){if(this.#f.has(e))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");o.push(e)}await n.chain.replaceEffects(r);let s=new Set(r);for(let e of i)s.has(e)||this.#f.delete(e);for(let e of o)this.#f.add(e)}removeElement(e){let t=this.#v.findIndex(t=>t.element===e);if(t!==-1){let n=this.#v.splice(t,1)[0];if(n.chain)this.#J(n.chain.effects),n.chain.dispose();else{for(let e of n.bufferTargets.values())e.dispose();for(let e of n.passes)e.pass.dispose(),e.backbuffer?.dispose();n.backbuffer?.dispose()}n.srcTexture.dispose(),e.style.setProperty(`opacity`,n.originalOpacity.toString())}}updateTextElement(e){let t=this.#v.findIndex(t=>t.element===e);return t===-1?Promise.resolve():this.#L(this.#v[t])}async updateImageElement(e){let t=this.#v.find(t=>t.element===e);if(t?.type!==`img`||t.isGif)return;let n=await $e(d(e)),r=t.srcTexture,i=new N(this.#n,n);i.wrapS=r.wrapS,i.wrapT=r.wrapT,i.premultiplyAlpha=r.premultiplyAlpha,i.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=i),t.srcTexture=i,r.dispose()}updateCanvasElement(e){let t=this.#v.find(t=>t.element===e);if(t){let n=t.srcTexture,r=new N(this.#n,e);r.wrapS=n.wrapS,r.wrapT=n.wrapT,r.premultiplyAlpha=n.premultiplyAlpha,r.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=r),t.srcTexture=r,n.dispose()}}updateHICTexture(e,t){let n=this.#v.find(t=>t.element===e);if(n?.type!==`hic`)return;n.frozen&&wr(e,t);let r=n.srcTexture,i=this.#V(r,t);i!==r&&(!n.chain&&n.passes.length>0&&(n.passes[0].uniforms.src.value=i),n.srcTexture=i)}#V(e,t){if(e.source===t)return e.needsUpdate=!0,e;let n=new N(this.#n,t);return n.wrapS=e.wrapS,n.wrapT=e.wrapT,n.premultiplyAlpha=e.premultiplyAlpha,n.needsUpdate=!0,e.dispose(),n}async addCapture(e,t,n,r,i){let a=await Zt({createTexture:e=>this.#U(e),uploadTexture:e=>this.#H(e),refreshTexture:(e,t)=>this.#V(e,t),textureSize:Z,emptyTexture:this.#N,maxTextureSize:this.maxTextureSize,stillZIndex:n},e,t,()=>{this.#M.delete(a),r?.()},i);return this.#M.add(a),a.capture}#H(e){try{e.upload(0)}catch(e){throw Error(`[VFX-JS] capture() could not upload the source: ${e}`)}}#U(e){let t=new N(this.#n,e);return t.premultiplyAlpha=!0,t}hasElement(e){return this.#v.some(t=>t.element===e)}emptyTexture(){return B(()=>this.#N,()=>0,()=>0)}liveTexture(){return ln(e=>this.#U(e),(e,t)=>this.#V(e,t),Z)}freezeInside(e){return this.#y.freezeInside(e,this.#v)}isFrozen(e){return this.#v.some(t=>t.element===e&&t.frozen)}forceRender(e){let t=this.#v.find(t=>t.element===e);return!t||t.forceRender?()=>{}:(t.forceRender=!0,()=>{t.forceRender=!1})}get maxTextureSize(){return this.#n.maxTextureSize}isPlaying(){return this.#g!==void 0}play(){this.isPlaying()||(this.#S=Date.now()/1e3,this.#g=requestAnimationFrame(this.#W))}get time(){return this.#b}setTime(e){this.#b=e,this.#C=!0}get timeScale(){return this.#x}set timeScale(e){this.#x=e}stop(){this.#g!==void 0&&(cancelAnimationFrame(this.#g),this.#g=void 0)}render(){let e=Date.now()/1e3;this.#C?this.#C=!1:this.#b+=(e-this.#S)*this.#x,this.#S=e;let t=this.#b,n=this.#r;this.#P(),n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,this.#t.width,this.#t.height),n.clear(n.COLOR_BUFFER_BIT);let r=this.#w.right-this.#w.left,i=this.#w.bottom-this.#w.top,a=F(0,0,r,i),o=this.#K();o&&(this.#ie(r,i),this.#c&&(n.bindFramebuffer(n.FRAMEBUFFER,this.#c.fbo),n.clear(n.COLOR_BUFFER_BIT),n.bindFramebuffer(n.FRAMEBUFFER,null)));for(let e of this.#M)e.tick();for(let e of this.#v){if(e.frozen){mr(e.intersectionState,t);continue}let n=e.element.getBoundingClientRect(),s=e.type===`text`?Kn(n):Gn(n),c=this.#X(e,s,t);if(!c.isVisible)continue;if(e.chain){this.#G(e,s,c,t);continue}let l=e.passes[0].uniforms;l.time.value=t-e.startTime,l.resolution.value.set((s.right-s.left)*this.#_,(s.bottom-s.top)*this.#_),l.mouse.value.set((this.#k+this.#D)*this.#_,(this.#A+this.#O)*this.#_);for(let t of e.passes)for(let[e,n]of Object.entries(t.uniformGenerators))t.uniforms[e].value=n();X.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(l.src.value.needsUpdate=!0);let u=nt(s,i,this.#D,this.#O),d=nt(c.rectWithOverflow,i,this.#D,this.#O);e.backbuffer&&(e.passes[0].uniforms.backbuffer.value=e.backbuffer.texture);{let t=e.isFullScreen?a:d,n=Math.max(1,t.w*this.#_),r=Math.max(1,t.h*this.#_),i=Math.max(1,t.w),o=Math.max(1,t.h);for(let t=0;t<e.passes.length-1;t++){let a=e.passes[t];if(!a.size){if(a.backbuffer)a.backbuffer.resize(i,o);else{let t=e.bufferTargets.get(a.target);t&&(t.width!==n||t.height!==r)&&t.setSize(n,r)}}}}let f=new Map;for(let t of e.passes)t.backbuffer&&t.target&&f.set(t.target,t.backbuffer.texture);let p=e.srcTexture;for(let t=0;t<e.passes.length-1;t++){let r=e.passes[t],i=e.isFullScreen?a:d;r.uniforms.src.value=p;for(let[e,t]of f)r.uniforms[e]&&(r.uniforms[e].value=t);for(let[e,t]of Object.entries(r.uniformGenerators))r.uniforms[e]&&(r.uniforms[e].value=t());let o=r.size?F(0,0,r.size[0],r.size[1]):F(0,0,i.w,i.h),s=Or(n,u,i,r.size,[this.#k,this.#A],[this.#D,this.#O],this.#_);if(r.uniforms.resolution.value.set(...s.resolution),r.uniforms.offset.value.set(...s.offset),r.uniforms.mouse.value.set(...s.mouse),r.backbuffer)this.#Q(r.pass,r.backbuffer.target,o,r.uniforms,!0),r.backbuffer.swap(),p=r.backbuffer.texture;else{let t=e.bufferTargets.get(r.target);if(!t)continue;this.#Q(r.pass,t,o,r.uniforms,!0),p=t.texture}r.target&&f.set(r.target,p)}let m=e.passes[e.passes.length-1];m.uniforms.src.value=p,m.uniforms.resolution.value.set(n.width*this.#_,n.height*this.#_),m.uniforms.offset.value.set(u.x*this.#_,u.y*this.#_),m.uniforms.mouse.value.set((this.#k+this.#D)*this.#_,(this.#A+this.#O)*this.#_);for(let[e,t]of f)m.uniforms[e]&&(m.uniforms[e].value=t);for(let[e,t]of Object.entries(m.uniformGenerators))m.uniforms[e]&&(m.uniforms[e].value=t());e.backbuffer?(m.uniforms.backbuffer.value=e.backbuffer.texture,e.isFullScreen?(e.backbuffer.resize(r,i),this.#$(e,u.x,u.y),this.#Q(m.pass,e.backbuffer.target,a,m.uniforms,!0),e.backbuffer.swap(),this.#o.setUniforms(e.backbuffer.texture,this.#_,a),this.#Q(this.#o.pass,o&&this.#c||null,a,this.#o.uniforms,!1)):(e.backbuffer.resize(d.w,d.h),this.#$(e,e.overflow.left,e.overflow.bottom),this.#Q(m.pass,e.backbuffer.target,e.backbuffer.getViewport(),m.uniforms,!0),e.backbuffer.swap(),this.#o.setUniforms(e.backbuffer.texture,this.#_,d),this.#Q(this.#o.pass,o&&this.#c||null,d,this.#o.uniforms,!1))):(this.#$(e,u.x,u.y),this.#Q(m.pass,o&&this.#c||null,e.isFullScreen?a:d,m.uniforms,!1))}o&&this.#c&&(this.#u&&this.#d?this.#ne(a,t):this.#re(a,t))}#W=()=>{this.isPlaying()&&(this.render(),this.#g=requestAnimationFrame(this.#W))};#G(e,t,n,r){let i=e.chain;if(!i)return;let a=this.#_;X.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(e.srcTexture.needsUpdate=!0);let o={...e.effectStaticUniforms??{}};if(e.effectUniformGenerators)for(let[t,n]of Object.entries(e.effectUniformGenerators))o[t]=n();let s=this.#w.right-this.#w.left,c=this.#w.bottom-this.#w.top,l=nt(t,c,this.#D,this.#O),u=this.#k+this.#D-l.x,d=this.#A+this.#O-l.y,f=t.right-t.left,p=t.bottom-t.top,m=r-(e.effectLastRenderTime??r);e.effectLastRenderTime=r;let h=this.#K()&&this.#c?qt(this.#c):null;i.run({time:r-e.startTime,deltaTime:m,mouse:[u*a,d*a],mouseViewport:[this.#k*a,this.#A*a],intersection:n.intersection,enterTime:Q(r-e.enterTime),leaveTime:Q(r-e.leaveTime),enterProgress:n.enterProgress,leaveProgress:n.leaveProgress,resolvedUniforms:o,canvasSize:[s,c],canvasBufferSize:[s*a,c*a],elementSize:[f,p],elementBufferSize:[f*a,p*a],elementRectOnCanvasPx:{x:l.x*a,y:l.y*a,w:l.w*a,h:l.h*a},finalTarget:h,isVisible:n.isVisible})}#K(){return this.#s.length>0||this.#u!==null&&this.#d}#q(e){for(let t of e)if(this.#f.has(t))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");for(let t of e)this.#f.add(t)}#J(e){for(let t of e)this.#f.delete(t)}#Y(e){let t=e.hitTestPadBuffer,n=this.#_;return U({top:t.top/n,right:t.right/n,bottom:t.bottom/n,left:t.left/n})}#X(e,t,n){let r=qn(t,e.chain?this.#Y(e.chain):e.overflow),i=e.isFullScreen||Er(this.#T,r),a=qn(this.#T,e.intersection.rootMargin),o=Xn(a,t);kr(e,o,Er(a,t),n);let{enterProgress:s,leaveProgress:c}=e.intersectionState;e.isInViewport=i;let l=i&&n-e.leaveTime<=e.release||e.forceRender===!0&&t.right>t.left&&t.bottom>t.top;return l&&!e.chain&&e.passes.length>0&&Ar(e.passes[0].uniforms,e,o,n),{isVisible:l,intersection:o,rectWithOverflow:r,enterProgress:s,leaveProgress:c}}#Z(e){return e in i?i[e]:e}#Q(e,t,n,r,i){let a=this.#r;i&&t!==null&&t!==this.#c&&(a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.viewport(0,0,t.width,t.height),a.clear(a.COLOR_BUFFER_BIT));let o=r.viewport;o&&o.value instanceof R&&o.value.set(n.x*this.#_,n.y*this.#_,n.w*this.#_,n.h*this.#_);try{xt(a,this.#i,e,t,n,this.#E[0],this.#E[1],this.#_)}catch(e){console.error(e)}}#$(e,t,n){let r=e.passes[0].uniforms.offset.value;r.x=t*this.#_,r.y=n*this.#_}#ee(e){let t=e.length===1&&!(`frag`in e[0])?e[0]:null;if(t&&t.effect!==void 0){this.#te(t,t.effect);return}let n=[],r=[];for(let t of e)`frag`in t&&r.push(t);for(let e=0;e<r.length-1;e++)r[e].target||(r[e]={...r[e],target:`pass${e}`});for(let t of e){let e,r,i;if(`frag`in t)e=t.frag,r=new br(this.#n,e,t.uniforms,t.persistent??!1,t.float??!1,t.size,t.target!==void 0,t.glslVersion),i=t.target;else{if(t.shader===void 0)throw Error("VFXPostEffect requires `shader` (the `effect` path is not implemented yet).");e=this.#Z(t.shader),r=new br(this.#n,e,t.uniforms,t.persistent??!1,t.float??!1,void 0,!1,t.glslVersion),t.persistent&&r.registerBufferUniform(`backbuffer`),i=void 0}n.push(e);let a={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`&&(a[e]=n);this.#s.push({pass:r,target:i,generators:a})}for(let e of r)e.target&&this.#l.set(e.target,void 0);let i=this.#s.map(e=>e.target).filter(e=>e!==void 0);for(let e=0;e<this.#s.length;e++)for(let t of i)n[e].match(RegExp(`uniform\\s+sampler2D\\s+${t}\\b`))&&this.#s[e].pass.registerBufferUniform(t)}#te(e,t){e.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified on post-effect; `effect` takes precedence.");let n=Array.isArray(t)?[...t]:[t];this.#q(n);let r=B(()=>{let e=this.#c;if(!e)throw Error(`[VFX-JS] post-effect chain active without target`);return e.texture},()=>this.#c?.width??0,()=>this.#c?.height??0),i={autoCrop:!0,glslVersion:e.glslVersion??`300 es`},a=new Qn(this.#n,this.#i,this.#_,n,i,r,!0,this.#a);if(e.uniforms)for(let[t,n]of Object.entries(e.uniforms))typeof n==`function`?(this.#m[t]=n,this.#p[t]=n()):this.#p[t]=n;this.#u=a,this.#h=this.#b,a.initAll().then(()=>{this.#u===a&&(this.#d=!0)}).catch(e=>{console.error(`[VFX-JS] Post-effect init failed; post-effect disabled:`,e),this.#u===a&&(this.#J(this.#u.effects),this.#u.dispose(),this.#u=null,this.#d=!1)})}#ne(e,t){let n=this.#u;if(!n)return;let r=this.#_,i={...this.#p};for(let[e,t]of Object.entries(this.#m))i[e]=t();let a=this.#w.right-this.#w.left,o=this.#w.bottom-this.#w.top,s=t-this.#h;this.#h=t;let c=[a,o],l=[a*r,o*r],u={x:e.x*r,y:e.y*r,w:e.w*r,h:e.h*r};n.run({time:t,deltaTime:s,mouse:[this.#k*r,this.#A*r],mouseViewport:[this.#k*r,this.#A*r],intersection:1,enterTime:0,leaveTime:0,enterProgress:1,leaveProgress:0,resolvedUniforms:i,canvasSize:c,canvasBufferSize:l,elementSize:c,elementBufferSize:l,elementRectOnCanvasPx:u,finalTarget:null,isVisible:!0})}#re(e,t){if(!this.#c)return;let n=this.#c.texture,r=new Map;for(let{pass:e,target:t}of this.#s)t&&e.backbuffer&&r.set(t,e.backbuffer.texture);for(let i=0;i<this.#s.length;i++){let{pass:a,target:o,generators:s}=this.#s[i],c=i===this.#s.length-1,l=this.#k+this.#D,u=this.#A+this.#O,d=a.size;if(d){let[r,i]=d;a.uniforms.src.value=n,a.uniforms.resolution.value.set(r,i),a.uniforms.offset.value.set(0,0),a.uniforms.time.value=t,a.uniforms.mouse.value.set(l/e.w*r,u/e.h*i)}else a.setUniforms(n,this.#_,e,t,l,u);a.uniforms.passIndex.value=i,a.updateCustomUniforms(s);for(let[e,t]of r){let n=a.uniforms[e];n&&(n.value=t)}if(c)a.backbuffer?(a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture),this.#Q(a.pass,a.backbuffer.target,e,a.uniforms,!0),a.backbuffer.swap(),this.#o.setUniforms(a.backbuffer.texture,this.#_,e),this.#Q(this.#o.pass,null,e,this.#o.uniforms,!1)):this.#Q(a.pass,null,e,a.uniforms,!1);else if(a.backbuffer){a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture);let t=d?F(0,0,d[0]/this.#_,d[1]/this.#_):e;this.#Q(a.pass,a.backbuffer.target,t,a.uniforms,!0),a.backbuffer.swap(),n=a.backbuffer.texture,o&&r.set(o,a.backbuffer.texture)}else{let t=o??`postEffect${i}`,s=this.#l.get(t),c=d?d[0]:e.w*this.#_,l=d?d[1]:e.h*this.#_;s&&s.width===c&&s.height===l||(s?.dispose(),s=vr(this.#n,c,l,{float:a.float}),this.#l.set(t,s));let u=d?F(0,0,d[0]/this.#_,d[1]/this.#_):e;this.#Q(a.pass,s,u,a.uniforms,!0),n=s.texture,o&&r.set(o,s.texture)}}}#ie(e,t){let n=e*this.#_,r=t*this.#_;this.#c&&this.#c.width===n&&this.#c.height===r||(this.#c?.dispose(),this.#c=vr(this.#n,n,r));for(let{pass:n}of this.#s)n.persistent&&!n.backbuffer?n.initializeBackbuffer(this.#n,e,t,this.#_):n.backbuffer&&n.resizeBackbuffer(e,t)}};function Er(e,t){return t.left<=e.right&&t.right>=e.left&&t.top<=e.bottom&&t.bottom>=e.top}function Dr(e){return e===!0?[!0,Wn]:e===void 0?[!1,Wn]:[!1,U(e)]}function Or(e,t,n,r,i,a,o){let s=i[0]+a[0]-n.x,c=i[1]+a[1]-n.y;return r?{resolution:[r[0],r[1]],offset:[0,0],mouse:[s/n.w*r[0],c/n.h*r[1]]}:{resolution:[e.width*o,e.height*o],offset:[(t.x-n.x)*o,(t.y-n.y)*o],mouse:[s*o,c*o]}}function kr(e,t,n,r){let i=e.intersectionState,a=i.isIn,o=e.isFullScreen||pr(i,t,n,e.intersection.threshold,e.intersection.leaveThreshold);!a&&o&&(e.enterTime=r,e.leaveTime=1/0),a&&!o&&(e.leaveTime=r),hr(i,o,r,e.intersection.duration)}function Ar(e,t,n,r){e.intersection.value=n,e.enterTime.value=Q(r-t.enterTime),e.leaveTime.value=Q(r-t.leaveTime),e.enterProgress.value=t.intersectionState.enterProgress,e.leaveProgress.value=t.intersectionState.leaveProgress}function jr(e){let t=e?.threshold??0,n=U(e?.rootMargin??0),r=e?.leaveThreshold??t,i=e?.duration??1;return Number.isFinite(i)&&i>0||(Sr||(Sr=!0,console.warn(`[VFX-JS] \`intersection.duration\` must be a finite number above 0, got ${i}. Using 1 instead.`)),i=1),{threshold:t,leaveThreshold:r,rootMargin:n,duration:i}}function Z(e,t){let n=e.source;if(!n)return 0;if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return t===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return t===`w`?n.videoWidth:n.videoHeight;let r=n;return t===`w`?r.width:r.height}function Mr(e){return e===`repeat`?`repeat`:e===`mirror`?`mirror`:`clamp`}function Nr(e){if(!e)return[`clamp`,`clamp`];if(Array.isArray(e))return[Mr(e[0]),Mr(e[1])];let t=Mr(e);return[t,t]}function Pr(e,t,n){return Math.max(t,Math.min(n,e))}var Fr=1e6;function Q(e){return Pr(e,-1e6,Fr)}function Ir(e){return!(e instanceof HTMLImageElement||e instanceof HTMLVideoElement||e instanceof HTMLCanvasElement)}function Lr(){try{let e=document.createElement(`canvas`);return(e.getContext(`webgl2`)||e.getContext(`webgl`))!==null}catch{return!1}}var $;function Rr(){if(typeof window>`u`)throw`Cannot find 'window'. VFX-JS only runs on the browser.`;if(typeof document>`u`)throw`Cannot find 'document'. VFX-JS only runs on the browser.`}function zr(e){return{position:e?`fixed`:`absolute`,top:0,left:0,width:`0px`,height:`0px`,"z-index":9999,"pointer-events":`none`}}function Br(e){return e instanceof HTMLImageElement||e instanceof HTMLVideoElement||e instanceof HTMLCanvasElement}function Vr(e,t){return t||!Br(e)}var Hr=class{static#e=new Set;#t;#n;#r=new Map;#i=new Set;#a=new Set;#o=new Set;#s=new Map;#c;#l=!1;static init(e){try{return new $(e)}catch{return null}}constructor(e={}){if(Rr(),!Lr())throw Error(`[VFX-JS] WebGL is not available in this environment.`);let t=Vn(e);this.#c=dn();let n=document.createElement(`canvas`),r=zr(t.fixedCanvas);for(let[e,t]of Object.entries(r))n.style.setProperty(e,t.toString());t.zIndex!==void 0&&n.style.setProperty(`z-index`,t.zIndex.toString()),(t.wrapper??document.body).appendChild(n),this.#n=n,this.#t=new Tr(t,n),$.#e.add(this),t.autoplay&&this.play()}async add(e,t,n){if(!this.#c){for(let t of $.#e){let n=t.#s.get(e);if(n&&Vr(e,n.hide))throw Error(`[VFX-JS] This element is captured. Dispose the capture before add.`)}this.#a.add(e);try{e instanceof HTMLImageElement?await this.#m(e,t):e instanceof HTMLVideoElement?await this.#h(e,t):e instanceof HTMLCanvasElement?a(e)&&n?await this.#p(e,t,n):await this.#g(e,t):await this.#_(e,t)}finally{this.#a.delete(e)}}}updateHICTexture(e,t){this.#t.updateHICTexture(e,t)}get reducedMotion(){return this.#c}get maxTextureSize(){return this.#t.maxTextureSize}get canvas(){return this.#n}addHTML(e,t){return this.#u(e,t,!1)}addHTMLWithStill(e,t){return this.#u(e,t,!0)}async#u(e,t,n){if(this.#c)return;for(let t of $.#e)if(t.#s.has(e))throw Error(`[VFX-JS] This element is captured. Dispose the capture before addHTML.`);if(!De())return console.warn(`html-in-canvas not supported, falling back to dom-to-canvas`),this.add(e,t);t.overlay!==void 0&&console.warn(`addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.`);let{overlay:r,...i}=t,a=this.#r.get(e);a&&this.#t.removeElement(a),this.#i.add(e);let o;try{let t=await Te(e,{onCapture:e=>{this.#t.updateHICTexture(t.canvas,e)},maxSize:this.#t.maxTextureSize,stillCover:n?{zIndex:this.#f()}:void 0});a=t.canvas,o=t.initialCapture,this.#r.set(e,a)}finally{this.#i.delete(e)}await this.#p(a,i,o)}async capture(e,t={}){if(this.#c)return this.#d(e);if(this.#l)throw Error(`[VFX-JS] This VFX instance is destroyed.`);if(e===document.documentElement||e===document.body||[...$.#e].some(t=>e.contains(t.#n)))throw Error(`[VFX-JS] capture() cannot take <html>, <body> or an element that contains a VFX canvas.`);let n=t.hide??!1;for(let t of $.#e){if(t.#s.has(e))throw Error(t===this?`[VFX-JS] This element is already captured. Share the capture instead.`:`[VFX-JS] This element is already captured by another VFX instance.`);if(t.#r.has(e)||t.#i.has(e))throw Error(`[VFX-JS] capture() cannot take an element that addHTML or a transition has wrapped.`);if((t.#t.hasElement(e)||t.#a.has(e))&&Vr(e,n))throw Error(`[VFX-JS] capture() cannot take an element added with add(). Remove it first.`)}let r={hide:n,abort:new AbortController};this.#s.set(e,r);let i;try{i=await this.#t.addCapture(e,t,this.#f(),()=>this.#s.delete(e),r.abort.signal)}catch(t){throw this.#s.delete(e),this.#l?Error(`[VFX-JS] This VFX instance was destroyed during capture().`):t}if(this.#l)throw i.dispose(),Error(`[VFX-JS] This VFX instance was destroyed during capture().`);return i}#d(e){let t=Xt(e);return{texture:this.#t.emptyTexture(),rect:t&&{x:t.left,y:t.top,width:t.width,height:t.height},update:()=>Promise.resolve(!1),dispose:()=>{}}}#f(){let e=Number.parseInt(this.#n.style.zIndex,10);return Number.isNaN(e)?9998:e-1}async#p(e,t,n){try{await this.#t.addElement(e,t,n)}finally{ge(e,this.#t.isFrozen(e))}}addTransition(e,t={}){let n=new Bn(this,e,t,()=>this.#o.delete(n));return this.#o.add(n),n}freezeInside(e){return this.#t.freezeInside(e)}captureLive(e){return De()?un(e,this.#t.liveTexture(),this.#t.maxTextureSize):{texture:null,dispose:()=>{}}}lockSize(e){let t=this.#r.get(e);return t?me(t):()=>{}}forceRender(e){let t=this.#r.get(e)??e;return this.#t.forceRender(t)}remove(e){let t=this.#r.get(e);t?(Ee(t,e),this.#r.delete(e),this.#t.removeElement(t)):this.#t.removeElement(e)}updateEffects(e,t){if(this.#c)return Promise.resolve();let n=this.#r.get(e)??e;return this.#t.updateElementEffects(n,t)}async update(e){await this.updateInTime(e)}async updateInTime(e){let t=this.#r.get(e)??(e instanceof HTMLCanvasElement?e:null);return(t?pe(t):void 0)||(e instanceof HTMLImageElement?await this.#t.updateImageElement(e):e instanceof HTMLCanvasElement?this.#t.updateCanvasElement(e):await this.#t.updateTextElement(e),!0)}play(){this.#c||this.#t.play()}stop(){this.#t.stop()}render(){this.#c||this.#t.render()}get time(){return this.#t.time}setTime(e){this.#t.setTime(e)}get timeScale(){return this.#t.timeScale}set timeScale(e){this.#t.timeScale=e}destroy(){this.#l=!0,$.#e.delete(this);for(let{abort:e}of this.#s.values())e.abort();for(let e of this.#o)e.destroy();this.#o.clear();for(let[e,t]of this.#r)Ee(t,e);this.#r.clear(),this.#t.destroy(),this.#n.remove()}#m(e,t){return e.complete?this.#t.addElement(e,t):new Promise((n,r)=>{e.addEventListener(`load`,()=>{this.#t.addElement(e,t).then(n,r)},{once:!0})})}#h(e,t){return e.readyState>=3?this.#t.addElement(e,t):new Promise((n,r)=>{e.addEventListener(`canplay`,()=>{this.#t.addElement(e,t).then(n,r)},{once:!0})})}#g(e,t){return this.#t.addElement(e,t)}#_(e,t){return this.#t.addElement(e,t)}};$=Hr;export{Hr as t};
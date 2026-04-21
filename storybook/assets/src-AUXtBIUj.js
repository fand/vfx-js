import{n as e}from"./chunk-BneVvdWh.js";var t,n,r,i,a,o,s=e((()=>{t=`
precision highp float;
in vec3 position;
void main() {
    gl_Position = vec4(position, 1.0);
}
`,n=`
precision highp float;
attribute vec3 position;
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
    `,warpTransition:`
    ${i}
    uniform float enterTime;
    uniform float leaveTime;

    ${a}

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
    ${i}
    ${a}

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
    ${i}
    ${a}

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
    `}}));function c(e){if(!e.src||e.src.startsWith(`data:`))return!1;try{return new URL(e.src,location.href).origin!==location.origin}catch{return!1}}async function l(e){let t=await(await fetch(e)).blob();return URL.createObjectURL(t)}async function u(e){let t=Array.from(e.querySelectorAll(`img`)).filter(e=>e.complete&&e.naturalWidth>0&&c(e));if(t.length===0)return()=>{};let n=new Map,r=[];return await Promise.all(t.map(async e=>{try{let t=await l(e.src);n.set(e,e.src),r.push(t),await new Promise(n=>{e.addEventListener(`load`,()=>n(),{once:!0}),e.src=t})}catch{}})),()=>{for(let[e,t]of n)e.src=t;for(let e of r)URL.revokeObjectURL(e)}}async function d(e,t){let n=e.getContext(`2d`);if(!n)throw Error(`Failed to get 2d context from layoutsubtree canvas`);let{onCapture:r,maxSize:i}=t,a=null,o=null,s=new Promise(e=>{o=e});e.onpaint=()=>{let t=e.firstElementChild;if(!t||e.width===0||e.height===0)return;n.clearRect(0,0,e.width,e.height),n.drawElementImage(t,0,0);let s=e.width,c=e.height;if(i&&(s>i||c>i)){let e=Math.min(i/s,i/c);s=Math.floor(s*e),c=Math.floor(c*e)}(!a||a.width!==s||a.height!==c)&&(a=new OffscreenCanvas(s,c));let l=a.getContext(`2d`);if(l){if(l.clearRect(0,0,s,c),l.drawImage(e,0,0,s,c),n.clearRect(0,0,e.width,e.height),o){o(a),o=null;return}r(a)}};let c=new ResizeObserver(t=>{for(let n of t){let t=n.devicePixelContentBoxSize?.[0];if(t)e.width=t.inlineSize,e.height=t.blockSize;else{let t=n.borderBoxSize?.[0];if(t){let n=window.devicePixelRatio;e.width=Math.round(t.inlineSize*n),e.height=Math.round(t.blockSize*n)}}}e.requestPaint()});c.observe(e,{box:`device-pixel-content-box`}),_.set(e,c);let l=e.firstElementChild,u=``;if(l){let t=new ResizeObserver(t=>{let n=t[0].borderBoxSize?.[0];if(!n)return;let r=`${Math.round(n.blockSize)}px`;r!==u&&(u=r,e.style.setProperty(`height`,r))});t.observe(l),v.set(e,t)}return s}function f(e){e.onpaint=null;let t=_.get(e);t&&(t.disconnect(),_.delete(e));let n=v.get(e);n&&(n.disconnect(),v.delete(e))}async function p(e,t){let n=e.getBoundingClientRect(),r=document.createElement(`canvas`);r.setAttribute(`layoutsubtree`,``),r.className=e.className;let i=e.getAttribute(`style`);i&&r.setAttribute(`style`,i),r.style.setProperty(`padding`,`0`),r.style.setProperty(`border`,`none`),r.style.setProperty(`box-sizing`,`content-box`);let a=getComputedStyle(e),o=a.display===`inline`?`block`:a.display;r.style.setProperty(`display`,o);for(let e of h)r.style.setProperty(e,a.getPropertyValue(e));for(let e of g)r.style.setProperty(e,a.getPropertyValue(e));let s=e=>Number.parseFloat(e),c=s(a.paddingLeft)+s(a.paddingRight)+s(a.borderLeftWidth)+s(a.borderRightWidth),l=s(a.paddingTop)+s(a.paddingBottom)+s(a.borderTopWidth)+s(a.borderBottomWidth);c>0&&r.style.setProperty(`width`,`${n.width}px`),l>0&&r.style.setProperty(`height`,`${n.height}px`),r.style.width||r.style.setProperty(`width`,`100%`),r.style.height||r.style.setProperty(`height`,`${n.height}px`);let f=window.devicePixelRatio;r.width=Math.round(n.width*f),r.height=Math.round(n.height*f),y.set(e,e.style.margin),b.set(e,e.style.width),x.set(e,e.style.boxSizing),e.parentNode?.insertBefore(r,e),r.appendChild(e),e.style.setProperty(`margin`,`0`),e.style.setProperty(`width`,`100%`),e.style.setProperty(`box-sizing`,`border-box`);let p=await u(e);return S.set(r,p),{canvas:r,initialCapture:await d(r,t)}}function m(e,t){f(e);let n=S.get(e);n&&(n(),S.delete(e)),e.parentNode?.insertBefore(t,e),e.remove();let r=y.get(t);r!==void 0&&(t.style.margin=r,y.delete(t));let i=b.get(t);i!==void 0&&(t.style.width=i,b.delete(t));let a=x.get(t);a!==void 0&&(t.style.boxSizing=a,x.delete(t))}var h,g,_,v,y,b,x,S,C=e((()=>{h=[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`],g=[`position`,`top`,`right`,`bottom`,`left`,`float`,`flex`,`flex-grow`,`flex-shrink`,`flex-basis`,`align-self`,`justify-self`,`place-self`,`order`,`grid-column`,`grid-column-start`,`grid-column-end`,`grid-row`,`grid-row-start`,`grid-row-end`,`grid-area`],_=new WeakMap,v=new WeakMap,y=new WeakMap,b=new WeakMap,x=new WeakMap,S=new WeakMap}));function w(){if(T!==void 0)return T;try{let e=document.createElement(`canvas`),t=e.getContext(`2d`);T=t!==null&&typeof t.drawElementImage==`function`&&typeof e.requestPaint==`function`}catch{T=!1}return T}var T,ee=e((()=>{}));function te(e){let t=typeof window<`u`?window.devicePixelRatio:1,n;n=e.scrollPadding===void 0?[.1,.1]:e.scrollPadding===!1?[0,0]:Array.isArray(e.scrollPadding)?[e.scrollPadding[0]??.1,e.scrollPadding[1]??.1]:[e.scrollPadding,e.scrollPadding];let r;return r=e.postEffect===void 0?[]:Array.isArray(e.postEffect)?e.postEffect:[e.postEffect],{pixelRatio:e.pixelRatio??t,zIndex:e.zIndex??void 0,autoplay:e.autoplay??!0,fixedCanvas:e.scrollPadding===!1,scrollPadding:n,wrapper:e.wrapper,postEffects:r}}var ne=e((()=>{}));function E(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function re(e){return new Promise((t,n)=>{let r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>t(r),r.onerror=n,r.src=e})}var D,O=e((()=>{D=class{#e;#t=!1;#n;constructor(e,t,n){this.wrapS=`clamp`,this.wrapT=`clamp`,this.needsUpdate=!0,this.source=null,this.#e=e,this.gl=e.gl,this.#r(),t&&(this.source=t),this.#n=n?.autoRegister!==!1,this.#n&&e.addResource(this)}#r(){let e=this.gl.createTexture();if(!e)throw Error(`[VFX-JS] Failed to create texture`);this.texture=e}restore(){this.#r(),this.#t=!1,this.needsUpdate=!0}bind(e){let t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&=(this.#i(),!1)}#i(){let e=this.gl,t=this.source;if(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4),t)try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)}catch(e){console.error(e)}else if(!this.#t){let t=new Uint8Array([0,0,0,0]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,t)}this.#a(),this.#t=!0}#a(){let e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,E(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,E(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR)}dispose(){this.#n&&this.#e.removeResource(this),this.gl.deleteTexture(this.texture)}}})),k,A=e((()=>{O(),k=class{#e;constructor(e,t,n,r={}){this.#e=e,this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(n)),this.float=r.float??!1,this.texture=new D(e,void 0,{autoRegister:!1}),this.#t(),e.addResource(this)}setSize(e,t){let n=Math.max(1,Math.floor(e)),r=Math.max(1,Math.floor(t));n===this.width&&r===this.height||(this.width=n,this.height=r,this.#t())}restore(){this.texture.restore(),this.#t()}dispose(){this.#e.removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.texture.dispose()}#t(){let e=this.gl,t=this.fbo,n=e.createFramebuffer();if(!n)throw Error(`[VFX-JS] Failed to create framebuffer`);this.fbo=n;let r=this.texture.texture;e.bindTexture(e.TEXTURE_2D,r);let i=this.#e.floatLinearFilter,a=this.float?i?e.RGBA32F:e.RGBA16F:e.RGBA8,o=this.float?i?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,e.RGBA,o,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.texture.needsUpdate=!1,this.texture.source=null,t&&e.deleteFramebuffer(t)}}}));function j(e,t,n,r){return{x:e.left+n,y:t-r-e.bottom,w:e.right-e.left,h:e.bottom-e.top}}function M(e,t,n,r){return{x:e,y:t,w:n,h:r}}var ie=e((()=>{})),N,ae=e((()=>{A(),ie(),N=class{#e;#t;#n;#r;constructor(e,t,n,r,i){this.#e=t,this.#t=n,this.#n=r;let a=t*r,o=n*r;this.#r=[new k(e,a,o,{float:i}),new k(e,a,o,{float:i})]}get texture(){return this.#r[0].texture}get target(){return this.#r[1]}resize(e,t){if(e===this.#e&&t===this.#t)return;this.#e=e,this.#t=t;let n=e*this.#n,r=t*this.#n;this.#r[0].setSize(n,r),this.#r[1].setSize(n,r)}swap(){this.#r=[this.#r[1],this.#r[0]]}getViewport(){return M(0,0,this.#e,this.#t)}dispose(){this.#r[0].dispose(),this.#r[1].dispose()}}})),P,F,I=e((()=>{P=class{constructor(e=0,t=0){this.x=0,this.y=0,this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}},F=class{constructor(e=0,t=0,n=0,r=0){this.x=0,this.y=0,this.z=0,this.w=0,this.x=e,this.y=t,this.z=n,this.w=r}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}}}));function oe(e){return/#version\s+300\s+es\b/.test(e)?`300 es`:/#version\s+100\b/.test(e)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(e)?`100`:`300 es`}function se(e,t,n){let r=e.createShader(t);if(!r)throw Error(`[VFX-JS] Failed to create shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)??``;throw e.deleteShader(r),Error(`[VFX-JS] Shader compile failed: ${t}\n\n${n}`)}return r}function ce(e,t){return e.replace(/^\s+/,``).startsWith(`#version`)||t===`100`?e:`#version 300 es\n${e}`}function le(e){return e===35678||e===36298||e===36306||e===35682}function ue(e,t,n){let r=t.location,i=t.size>1,a=n,o=n,s=n;switch(t.type){case e.FLOAT:i?e.uniform1fv(r,a):e.uniform1f(r,n);return;case e.FLOAT_VEC2:if(i)e.uniform2fv(r,a);else if(n instanceof P)e.uniform2f(r,n.x,n.y);else{let t=n;e.uniform2f(r,t[0],t[1])}return;case e.FLOAT_VEC3:if(i)e.uniform3fv(r,a);else{let t=n;e.uniform3f(r,t[0],t[1],t[2])}return;case e.FLOAT_VEC4:if(i)e.uniform4fv(r,a);else if(n instanceof F)e.uniform4f(r,n.x,n.y,n.z,n.w);else{let t=n;e.uniform4f(r,t[0],t[1],t[2],t[3])}return;case e.INT:i?e.uniform1iv(r,o):e.uniform1i(r,n);return;case e.INT_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,t[0],t[1])}return;case e.INT_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,t[0],t[1],t[2])}return;case e.INT_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,t[0],t[1],t[2],t[3])}return;case e.BOOL:i?e.uniform1iv(r,o):e.uniform1i(r,+!!n);return;case e.BOOL_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,+!!t[0],+!!t[1])}return;case e.BOOL_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,+!!t[0],+!!t[1],+!!t[2])}return;case e.BOOL_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,+!!t[0],+!!t[1],+!!t[2],+!!t[3])}return;case e.FLOAT_MAT2:e.uniformMatrix2fv(r,!1,a);return;case e.FLOAT_MAT3:e.uniformMatrix3fv(r,!1,a);return;case e.FLOAT_MAT4:e.uniformMatrix4fv(r,!1,a);return;case e.UNSIGNED_INT:i?e.uniform1uiv(r,s):e.uniform1ui(r,n);return;case e.UNSIGNED_INT_VEC2:if(i)e.uniform2uiv(r,s);else{let t=n;e.uniform2ui(r,t[0],t[1])}return;case e.UNSIGNED_INT_VEC3:if(i)e.uniform3uiv(r,s);else{let t=n;e.uniform3ui(r,t[0],t[1],t[2])}return;case e.UNSIGNED_INT_VEC4:if(i)e.uniform4uiv(r,s);else{let t=n;e.uniform4ui(r,t[0],t[1],t[2],t[3])}return;default:L.has(t.type)||(L.add(t.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${t.type.toString(16)}; skipping upload.`));return}}var de,L,fe=e((()=>{O(),I(),de=class{#e;#t;#n;#r;#i=new Map;constructor(e,t,n,r){this.#e=e,this.gl=e.gl,this.#t=t,this.#n=n,this.#r=r??oe(n),this.#a(),e.addResource(this)}#a(){let e=this.gl,t=se(e,e.VERTEX_SHADER,ce(this.#t,this.#r)),n=se(e,e.FRAGMENT_SHADER,ce(this.#n,this.#r)),r=e.createProgram();if(!r)throw Error(`[VFX-JS] Failed to create program`);if(e.attachShader(r,t),e.attachShader(r,n),e.bindAttribLocation(r,0,`position`),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let i=e.getProgramInfoLog(r)??``;throw e.deleteShader(t),e.deleteShader(n),e.deleteProgram(r),Error(`[VFX-JS] Program link failed: ${i}`)}e.detachShader(r,t),e.detachShader(r,n),e.deleteShader(t),e.deleteShader(n),this.program=r,this.#i.clear();let i=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<i;t++){let n=e.getActiveUniform(r,t);if(!n)continue;let i=n.name.replace(/\[0\]$/,``),a=e.getUniformLocation(r,n.name);a&&this.#i.set(i,{location:a,type:n.type,size:n.size})}}restore(){this.#a()}use(){this.gl.useProgram(this.program)}hasUniform(e){return this.#i.has(e)}uploadUniforms(e){let t=this.gl,n=0;for(let[r,i]of this.#i){let a=e[r];if(!a)continue;let o=a.value;if(o!=null){if(le(i.type)){o instanceof D&&(o.bind(n),t.uniform1i(i.location,n),n++);continue}o instanceof D||ue(t,i,o)}}}dispose(){this.#e.removeResource(this),this.gl.deleteProgram(this.program)}},L=new Set}));function pe(e,t,n,r,i,a,o,s){let c=r?r.width/s:a,l=r?r.height/s:o,u=Math.max(0,i.x),d=Math.max(0,i.y),f=Math.min(c,i.x+i.w),p=Math.min(l,i.y+i.h),m=f-u,h=p-d;m<=0||h<=0||(e.bindFramebuffer(e.FRAMEBUFFER,r?r.fbo:null),e.viewport(Math.round(u*s),Math.round(d*s),Math.round(m*s),Math.round(h*s)),me(e,n.blend),n.program.use(),n.program.uploadUniforms(n.uniforms),t.draw())}function me(e,t){if(t===`none`){e.disable(e.BLEND);return}e.enable(e.BLEND),e.blendEquation(e.FUNC_ADD),t===`premultiplied`?e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA):e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA)}var R,z=e((()=>{fe(),R=class{constructor(e,t,n,r,i,a){this.gl=e.gl,this.program=new de(e,t,n,a),this.uniforms=r,this.blend=i}dispose(){this.program.dispose()}}})),he,ge=e((()=>{s(),z(),I(),he=class{constructor(e){this.uniforms={src:{value:null},offset:{value:new P},resolution:{value:new P},viewport:{value:new F}},this.pass=new R(e,t,r,this.uniforms,`premultiplied`)}setUniforms(e,t,n){this.uniforms.src.value=e,this.uniforms.resolution.value.set(n.w*t,n.h*t),this.uniforms.offset.value.set(n.x*t,n.y*t)}dispose(){this.pass.dispose()}}}));async function _e(e,t,n,r){let i=e.getBoundingClientRect(),a=window.devicePixelRatio,o=i.width*a,s=i.height*a,c=1,l=o,u=s;r&&(l>r||u>r)&&(c=Math.min(r/l,r/u),l=Math.floor(l*c),u=Math.floor(u*c));let d=n&&n.width===l&&n.height===u?n:new OffscreenCanvas(l,u),f=e.cloneNode(!0);await ve(e,f),ye(e,f),f.style.setProperty(`opacity`,t.toString()),f.style.setProperty(`margin`,`0px`),be(f);let p=f.outerHTML,m=`<svg xmlns="http://www.w3.org/2000/svg" width="${o}" height="${s}"><foreignObject width="100%" height="100%">${Se(p)}</foreignObject></svg>`;return new Promise((e,t)=>{let n=new Image;n.onload=()=>{let r=d.getContext(`2d`);if(r===null)return t();r.clearRect(0,0,l,u);let i=a*c;r.scale(i,i),r.drawImage(n,0,0,o,s),r.setTransform(1,0,0,1,0,0),e(d)},n.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(m)}`})}async function ve(e,t){let n=window.getComputedStyle(e);for(let e of Array.from(n))/(-inline-|-block-|^inline-|^block-)/.test(e)||/^-webkit-.*(start|end|before|after|logical)/.test(e)||t.style.setProperty(e,n.getPropertyValue(e),n.getPropertyPriority(e));if(t.tagName===`INPUT`)t.setAttribute(`value`,t.value);else if(t.tagName===`TEXTAREA`)t.innerHTML=t.value;else if(t.tagName===`IMG`)try{t.src=await xe(e.src)}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];await ve(r,i)}}function ye(e,t){if(typeof e.computedStyleMap==`function`)try{let n=e.computedStyleMap();for(let e of[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`]){let r=n.get(e);r instanceof CSSKeywordValue&&r.value===`auto`&&t.style.setProperty(e,`auto`)}}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];r instanceof HTMLElement&&i instanceof HTMLElement&&ye(r,i)}}function be(e){let t=e;for(;;){let e=t.style;if(Number.parseFloat(e.paddingTop)>0||Number.parseFloat(e.borderTopWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.firstElementChild;if(!n)break;n.style.setProperty(`margin-top`,`0px`),t=n}for(t=e;;){let e=t.style;if(Number.parseFloat(e.paddingBottom)>0||Number.parseFloat(e.borderBottomWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.lastElementChild;if(!n)break;n.style.setProperty(`margin-bottom`,`0px`),t=n}}async function xe(e){let t=await fetch(e).then(e=>e.blob());return new Promise(e=>{let n=new FileReader;n.onload=function(){e(this.result)},n.readAsDataURL(t)})}var Se,Ce=e((()=>{Se=e=>{let t=document.implementation.createHTMLDocument(`test`),n=t.createRange();n.selectNodeContents(t.documentElement),n.deleteContents();let r=document.createElement(`head`);return t.documentElement.appendChild(r),t.documentElement.appendChild(n.createContextualFragment(e)),t.documentElement.setAttribute(`xmlns`,t.documentElement.namespaceURI),new XMLSerializer().serializeToString(t).replace(/<!DOCTYPE html>/,``)}}));function B(e){this.data=e,this.pos=0}var we=e((()=>{B.prototype.readByte=function(){return this.data[this.pos++]},B.prototype.peekByte=function(){return this.data[this.pos]},B.prototype.readBytes=function(e){return this.data.subarray(this.pos,this.pos+=e)},B.prototype.peekBytes=function(e){return this.data.subarray(this.pos,this.pos+e)},B.prototype.readString=function(e){for(var t=``,n=0;n<e;n++)t+=String.fromCharCode(this.readByte());return t},B.prototype.readBitArray=function(){for(var e=[],t=this.readByte(),n=7;n>=0;n--)e.push(!!(t&1<<n));return e},B.prototype.readUnsigned=function(e){var t=this.readBytes(2);return e?(t[1]<<8)+t[0]:(t[0]<<8)+t[1]}}));function V(e){this.stream=new B(e),this.output={}}function Te(e){return e.reduce(function(e,t){return e*2+t},0)}var Ee=e((()=>{we(),V.prototype.parse=function(e){return this.parseParts(this.output,e),this.output},V.prototype.parseParts=function(e,t){for(var n=0;n<t.length;n++){var r=t[n];this.parsePart(e,r)}},V.prototype.parsePart=function(e,t){var n=t.label,r;if(!(t.requires&&!t.requires(this.stream,this.output,e)))if(t.loop){for(var i=[];t.loop(this.stream);){var a={};this.parseParts(a,t.parts),i.push(a)}e[n]=i}else t.parts?(r={},this.parseParts(r,t.parts),e[n]=r):t.parser?(r=t.parser(this.stream,this.output,e),t.skip||(e[n]=r)):t.bits&&(e[n]=this.parseBits(t.bits))},V.prototype.parseBits=function(e){var t={},n=this.stream.readBitArray();for(var r in e){var i=e[r];i.length?t[r]=Te(n.slice(i.index,i.index+i.length)):t[r]=n[i.index]}return t}})),H,De=e((()=>{H={readByte:function(){return function(e){return e.readByte()}},readBytes:function(e){return function(t){return t.readBytes(e)}},readString:function(e){return function(t){return t.readString(e)}},readUnsigned:function(e){return function(t){return t.readUnsigned(e)}},readArray:function(e,t){return function(n,r,i){for(var a=t(n,r,i),o=Array(a),s=0;s<a;s++)o[s]=n.readBytes(e);return o}}}})),U,Oe,ke,Ae,je,Me,Ne=e((()=>{De(),U={label:`blocks`,parser:function(e){for(var t=[],n=0,r=0,i=e.readByte();i!==r;i=e.readByte())t.push(e.readBytes(i)),n+=i;var a=new Uint8Array(n);n=0;for(var o=0;o<t.length;o++)a.set(t[o],n),n+=t[o].length;return a}},Oe={label:`gce`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===249},parts:[{label:`codes`,parser:H.readBytes(2),skip:!0},{label:`byteSize`,parser:H.readByte()},{label:`extras`,bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:`delay`,parser:H.readUnsigned(!0)},{label:`transparentColorIndex`,parser:H.readByte()},{label:`terminator`,parser:H.readByte(),skip:!0}]},ke={label:`image`,requires:function(e){return e.peekByte()===44},parts:[{label:`code`,parser:H.readByte(),skip:!0},{label:`descriptor`,parts:[{label:`left`,parser:H.readUnsigned(!0)},{label:`top`,parser:H.readUnsigned(!0)},{label:`width`,parser:H.readUnsigned(!0)},{label:`height`,parser:H.readUnsigned(!0)},{label:`lct`,bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:`lct`,requires:function(e,t,n){return n.descriptor.lct.exists},parser:H.readArray(3,function(e,t,n){return 2**(n.descriptor.lct.size+1)})},{label:`data`,parts:[{label:`minCodeSize`,parser:H.readByte()},U]}]},Ae={label:`text`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===1},parts:[{label:`codes`,parser:H.readBytes(2),skip:!0},{label:`blockSize`,parser:H.readByte()},{label:`preData`,parser:function(e,t,n){return e.readBytes(n.text.blockSize)}},U]},je={label:`frames`,parts:[Oe,{label:`application`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===255},parts:[{label:`codes`,parser:H.readBytes(2),skip:!0},{label:`blockSize`,parser:H.readByte()},{label:`id`,parser:function(e,t,n){return e.readString(n.blockSize)}},U]},{label:`comment`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===254},parts:[{label:`codes`,parser:H.readBytes(2),skip:!0},U]},ke,Ae],loop:function(e){var t=e.peekByte();return t===33||t===44}},Me=[{label:`header`,parts:[{label:`signature`,parser:H.readString(3)},{label:`version`,parser:H.readString(3)}]},{label:`lsd`,parts:[{label:`width`,parser:H.readUnsigned(!0)},{label:`height`,parser:H.readUnsigned(!0)},{label:`gct`,bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:`backgroundColorIndex`,parser:H.readByte()},{label:`pixelAspectRatio`,parser:H.readByte()}]},{label:`gct`,requires:function(e,t){return t.lsd.gct.exists},parser:H.readArray(3,function(e,t){return 2**(t.lsd.gct.size+1)})},je]}));function W(e){this.raw=new V(new Uint8Array(e)).parse(Me),this.raw.hasImages=!1;for(var t=0;t<this.raw.frames.length;t++)if(this.raw.frames[t].image){this.raw.hasImages=!0;break}}var Pe=e((()=>{Ee(),Ne(),W.prototype.decompressFrame=function(e,t){if(e>=this.raw.frames.length)return null;var n=this.raw.frames[e];if(n.image){var r=n.image.descriptor.width*n.image.descriptor.height,i=o(n.image.data.minCodeSize,n.image.data.blocks,r);n.image.descriptor.lct.interlaced&&(i=s(i,n.image.descriptor.width));var a={pixels:i,dims:{top:n.image.descriptor.top,left:n.image.descriptor.left,width:n.image.descriptor.width,height:n.image.descriptor.height}};return n.image.descriptor.lct&&n.image.descriptor.lct.exists?a.colorTable=n.image.lct:a.colorTable=this.raw.gct,n.gce&&(a.delay=(n.gce.delay||10)*10,a.disposalType=n.gce.extras.disposal,n.gce.extras.transparentColorGiven&&(a.transparentIndex=n.gce.transparentColorIndex)),t&&(a.patch=c(a)),a}return null;function o(e,t,n){var r=4096,i=-1,a=n,o,s,c,l,u,d,f,p,m,h,g,_,v,y,b,x,S=Array(n),C=Array(r),w=Array(r),T=Array(r+1);for(_=e,s=1<<_,u=s+1,o=s+2,f=i,l=_+1,c=(1<<l)-1,m=0;m<s;m++)C[m]=0,w[m]=m;for(g=p=v=y=x=b=0,h=0;h<a;){if(y===0){if(p<l){g+=t[b]<<p,p+=8,b++;continue}if(m=g&c,g>>=l,p-=l,m>o||m==u)break;if(m==s){l=_+1,c=(1<<l)-1,o=s+2,f=i;continue}if(f==i){T[y++]=w[m],f=m,v=m;continue}for(d=m,m==o&&(T[y++]=v,m=f);m>s;)T[y++]=w[m],m=C[m];v=w[m]&255,T[y++]=v,o<r&&(C[o]=f,w[o]=v,o++,(o&c)===0&&o<r&&(l++,c+=o)),f=d}y--,S[x++]=T[y],h++}for(h=x;h<a;h++)S[h]=0;return S}function s(e,t){for(var n=Array(e.length),r=e.length/t,i=function(r,i){var a=e.slice(i*t,(i+1)*t);n.splice.apply(n,[r*t,t].concat(a))},a=[0,4,2,1],o=[8,8,4,2],s=0,c=0;c<4;c++)for(var l=a[c];l<r;l+=o[c])i(l,s),s++;return n}function c(e){for(var t=e.pixels.length,n=new Uint8ClampedArray(t*4),r=0;r<t;r++){var i=r*4,a=e.pixels[r],o=e.colorTable[a];n[i]=o[0],n[i+1]=o[1],n[i+2]=o[2],n[i+3]=a===e.transparentIndex?0:255}return n}},W.prototype.decompressFrames=function(e,t,n){t===void 0&&(t=0),n=n===void 0?this.raw.frames.length:Math.min(n,this.raw.frames.length);for(var r=[],i=t;i<n;i++)this.raw.frames[i].image&&r.push(this.decompressFrame(i,e));return r}})),Fe,Ie=e((()=>{Pe(),Fe=W})),Le,Re=e((()=>{Ie(),Le=class e{static async create(t,n){let r=await fetch(t).then(e=>e.arrayBuffer()).then(e=>new Fe(e)),i=r.decompressFrames(!0,void 0,void 0),{width:a,height:o}=r.raw.lsd;return new e(i,a,o,n)}constructor(e,t,n,r){this.frames=[],this.index=0,this.playTime=0,this.frames=e,this.canvas=document.createElement(`canvas`),this.ctx=this.canvas.getContext(`2d`),this.pixelRatio=r,this.canvas.width=t,this.canvas.height=n,this.startTime=Date.now()}getCanvas(){return this.canvas}update(){let e=Date.now()-this.startTime;for(;this.playTime<e;){let e=this.frames[this.index%this.frames.length];this.playTime+=e.delay,this.index++}let t=this.frames[this.index%this.frames.length],n=new ImageData(t.patch,t.dims.width,t.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(n,t.dims.left,t.dims.top)}}})),ze,Be=e((()=>{ze=class{#e=new Set;#t=new Set;#n=new Set;constructor(e){this.isContextLost=!1;let t=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1});if(!t)throw Error(`[VFX-JS] WebGL2 is not available.`);this.gl=t,this.canvas=e,t.getExtension(`EXT_color_buffer_float`),t.getExtension(`EXT_color_buffer_half_float`),this.floatLinearFilter=!!t.getExtension(`OES_texture_float_linear`),this.maxTextureSize=t.getParameter(t.MAX_TEXTURE_SIZE),e.addEventListener(`webglcontextlost`,this.#r,!1),e.addEventListener(`webglcontextrestored`,this.#i,!1)}setSize(e,t,n){let r=Math.floor(e*n),i=Math.floor(t*n);(this.canvas.width!==r||this.canvas.height!==i)&&(this.canvas.width=r,this.canvas.height=i)}addResource(e){this.#e.add(e)}removeResource(e){this.#e.delete(e)}onContextLost(e){return this.#t.add(e),()=>this.#t.delete(e)}onContextRestored(e){return this.#n.add(e),()=>this.#n.delete(e)}#r=e=>{e.preventDefault(),this.isContextLost=!0;for(let e of this.#t)e()};#i=()=>{this.isContextLost=!1;let e=this.gl;e.getExtension(`EXT_color_buffer_float`),e.getExtension(`EXT_color_buffer_half_float`);for(let e of this.#e)e.restore();for(let e of this.#n)e()}}})),Ve,He=e((()=>{Ve=class{#e;#t;constructor(e){this.#e=e,this.gl=e.gl,this.#n(),e.addResource(this)}#n(){let e=this.gl,t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw Error(`[VFX-JS] Failed to create quad VAO`);this.vao=t,this.#t=n;let r=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)}restore(){this.#n()}draw(){let e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){this.#e.removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(this.#t)}}}));function G(e,t,n,r={}){return new k(e,t,n,{float:r.float??!1})}function Ue(e,r){let i=r.renderingToBuffer??!1,a;a=i?`none`:r.premultipliedAlpha?`premultiplied`:`normal`;let o=r.glslVersion??oe(r.fragmentShader);return new R(e,r.vertexShader??(o===`100`?n:t),r.fragmentShader,r.uniforms,a,o)}var We=e((()=>{s(),A(),z(),fe()})),K,Ge=e((()=>{ae(),I(),We(),K=class{#e;#t;#n;#r;#i;#a;constructor(e,t,n,r,i,a,o,s){if(this.#r=r??!1,this.#i=i??!1,this.#a=a,this.#t={},this.#e={src:{value:null},offset:{value:new P},resolution:{value:new P},viewport:{value:new F},time:{value:0},mouse:{value:new P},passIndex:{value:0}},n)for(let[e,t]of Object.entries(n))typeof t==`function`?(this.#t[e]=t,this.#e[e]={value:t()}):this.#e[e]={value:t};this.pass=Ue(e,{fragmentShader:t,uniforms:this.#e,renderingToBuffer:o??!1,premultipliedAlpha:!0,glslVersion:s})}get uniforms(){return this.#e}setUniforms(e,t,n,r,i,a){this.#e.src.value=e,this.#e.resolution.value.set(n.w*t,n.h*t),this.#e.offset.value.set(n.x*t,n.y*t),this.#e.time.value=r,this.#e.mouse.value.set(i*t,a*t)}updateCustomUniforms(e){for(let[e,t]of Object.entries(this.#t))this.#e[e]&&(this.#e[e].value=t());if(e)for(let[t,n]of Object.entries(e))this.#e[t]&&(this.#e[t].value=n())}initializeBackbuffer(e,t,n,r){this.#r&&!this.#n&&(this.#a?this.#n=new N(e,this.#a[0],this.#a[1],1,this.#i):this.#n=new N(e,t,n,r,this.#i))}resizeBackbuffer(e,t){this.#n&&!this.#a&&this.#n.resize(e,t)}registerBufferUniform(e){this.#e[e]||(this.#e[e]={value:null})}get backbuffer(){return this.#n}get persistent(){return this.#r}get float(){return this.#i}get size(){return this.#a}getTargetDimensions(){return this.#a}dispose(){this.pass.dispose(),this.#n?.dispose()}}}));function Ke(e,t,n,r){return{top:e,right:t,bottom:n,left:r}}function qe(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:Array.isArray(e)?{top:e[0],right:e[1],bottom:e[2],left:e[3]}:{top:e.top??0,right:e.right??0,bottom:e.bottom??0,left:e.left??0}}function Je(e){return qe(e)}function q(e){return qe(e)}function Ye(e){return{top:e.top,right:e.right,bottom:e.bottom,left:e.left}}function J(e,t){return{top:e.top-t.top,right:e.right+t.right,bottom:e.bottom+t.bottom,left:e.left-t.left}}function Y(e,t,n){return Math.min(Math.max(e,t),n)}function Xe(e,t){let n=Y(t.left,e.left,e.right),r=(Y(t.right,e.left,e.right)-n)/(t.right-t.left),i=Y(t.top,e.top,e.bottom);return r*((Y(t.bottom,e.top,e.bottom)-i)/(t.bottom-t.top))}var X,Ze=e((()=>{X=Ke(0,0,0,0)}));function Z(e,t){return t.left<=e.right&&t.right>=e.left&&t.top<=e.bottom&&t.bottom>=e.top}function Qe(e,t,n,r){return r===0?Z(e,t):n>=r}function $e(e){return e===!0?[!0,X]:e===void 0?[!1,X]:[!1,Je(e)]}function et(e){return{threshold:e?.threshold??0,rootMargin:Je(e?.rootMargin??0)}}function Q(e){return e===`repeat`?`repeat`:e===`mirror`?`mirror`:`clamp`}function tt(e){if(!e)return[`clamp`,`clamp`];if(Array.isArray(e))return[Q(e[0]),Q(e[1])];let t=Q(e);return[t,t]}function nt(e,t,n){return Math.max(t,Math.min(n,e))}var $,rt,it=e((()=>{ae(),s(),ge(),Ce(),Re(),Be(),z(),He(),O(),I(),ie(),Ge(),Ze(),We(),$=new Map,rt=class{#e;#t;#n;#r;#i;#a;#o=[];#s=[];#c;#l=[];#u=new Map;#d=void 0;#f=2;#p=[];#m=Date.now()/1e3;#h=q(0);#g=q(0);#_=[0,0];#v=0;#y=0;#b=0;#x=0;#S=new WeakMap;constructor(e,t){this.#e=e,this.#t=t,this.#n=new ze(t),this.#r=this.#n.gl,this.#r.clearColor(0,0,0,0),this.#f=e.pixelRatio,this.#i=new Ve(this.#n),typeof window<`u`&&(window.addEventListener(`resize`,this.#w),window.addEventListener(`pointermove`,this.#T)),this.#w(),this.#a=new he(this.#n),this.#N(e.postEffects),this.#n.onContextRestored(()=>{this.#r.clearColor(0,0,0,0)})}destroy(){this.stop(),typeof window<`u`&&(window.removeEventListener(`resize`,this.#w),window.removeEventListener(`pointermove`,this.#T)),this.#c?.dispose();for(let e of this.#u.values())e?.dispose();for(let e of this.#o)e.dispose();this.#a.dispose(),this.#i.dispose()}#C(){if(typeof window>`u`)return;let e=this.#t.ownerDocument,t=e.compatMode===`BackCompat`?e.body:e.documentElement,n=t.clientWidth,r=t.clientHeight,i=window.scrollX,a=window.scrollY,o,s;if(this.#e.fixedCanvas)o=0,s=0;else if(this.#e.wrapper)o=n*this.#e.scrollPadding[0],s=r*this.#e.scrollPadding[1];else{let t=e.body.scrollWidth-(i+n),c=e.body.scrollHeight-(a+r);o=nt(n*this.#e.scrollPadding[0],0,t),s=nt(r*this.#e.scrollPadding[1],0,c)}let c=n+o*2,l=r+s*2;(c!==this.#_[0]||l!==this.#_[1])&&(this.#t.style.width=`${c}px`,this.#t.style.height=`${l}px`,this.#n.setSize(c,l,this.#f),this.#h=q({top:-s,left:-o,right:n+o,bottom:r+s}),this.#g=q({top:0,left:0,right:n,bottom:r}),this.#_=[c,l],this.#v=o,this.#y=s),this.#e.fixedCanvas||this.#t.style.setProperty(`transform`,`translate(${i-o}px, ${a-s}px)`)}#w=async()=>{if(typeof window<`u`){for(let e of this.#p)if(e.type===`text`&&e.isInViewport){let t=e.element.getBoundingClientRect();(t.width!==e.width||t.height!==e.height)&&(await this.#E(e),e.width=t.width,e.height=t.height)}for(let e of this.#p)if(e.type===`text`&&!e.isInViewport){let t=e.element.getBoundingClientRect();(t.width!==e.width||t.height!==e.height)&&(await this.#E(e),e.width=t.width,e.height=t.height)}}};#T=e=>{typeof window<`u`&&(this.#b=e.clientX,this.#x=window.innerHeight-e.clientY)};async#E(e){if(!this.#S.get(e.element)){this.#S.set(e.element,!0);try{let t=e.passes[0].uniforms.src,n=t.value,r=n.source instanceof OffscreenCanvas?n.source:void 0,i=await _e(e.element,e.originalOpacity,r,this.maxTextureSize);if(i.width===0||i.width===0)throw`omg`;let a=new D(this.#n,i);a.wrapS=n.wrapS,a.wrapT=n.wrapT,a.needsUpdate=!0,t.value=a,e.srcTexture=a,n.dispose()}catch(e){console.error(e)}this.#S.set(e.element,!1)}}async addElement(e,t={},n){let r=this.#D(t),i=e.getBoundingClientRect(),a=Ye(i),[o,s]=$e(t.overflow),c=J(a,s),l=et(t.intersection),u=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),d,f,p=!1;if(e instanceof HTMLImageElement)if(f=`img`,p=!!e.src.match(/\.gif/i),p){let t=await Le.create(e.src,this.#f);$.set(e,t),d=new D(this.#n,t.getCanvas())}else{let t=await re(e.src);d=new D(this.#n,t)}else if(e instanceof HTMLVideoElement)d=new D(this.#n,e),f=`video`;else if(e instanceof HTMLCanvasElement)e.hasAttribute(`layoutsubtree`)&&n?(d=new D(this.#n,n),f=`hic`):(d=new D(this.#n,e),f=`canvas`);else{let t=await _e(e,u,void 0,this.maxTextureSize);d=new D(this.#n,t),f=`text`}let[m,h]=tt(t.wrap);d.wrapS=m,d.wrapT=h,d.needsUpdate=!0;let g=t.autoCrop??!0;if(f!==`hic`&&t.overlay!==!0)if(typeof t.overlay==`number`)e.style.setProperty(`opacity`,t.overlay.toString());else{let t=f===`video`?`0.0001`:`0`;e.style.setProperty(`opacity`,t.toString())}let _={src:{value:d},resolution:{value:new P},offset:{value:new P},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},mouse:{value:new P},intersection:{value:0},viewport:{value:new F},autoCrop:{value:g}},v={};if(t.uniforms!==void 0)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(_[e]={value:n()},v[e]=n):_[e]={value:n};let y;t.backbuffer&&(y=(()=>{let e=(c.right-c.left)*this.#f,t=(c.bottom-c.top)*this.#f;return new N(this.#n,e,t,this.#f,!1)})(),_.backbuffer={value:y.texture});let b=new Map,x=new Map;for(let e=0;e<r.length-1;e++){let t=r[e].target??`pass${e}`;r[e]={...r[e],target:t};let n=r[e].size,i=n?n[0]:(c.right-c.left)*this.#f,a=n?n[1]:(c.bottom-c.top)*this.#f;if(r[e].persistent){let i=n?1:this.#f,a=n?n[0]:c.right-c.left,o=n?n[1]:c.bottom-c.top;x.set(t,new N(this.#n,a,o,i,r[e].float))}else b.set(t,G(this.#n,i,a,{float:r[e].float}))}let S=[];for(let e=0;e<r.length;e++){let t=r[e],n=t.frag,i={..._},a={};for(let[e,r]of b)e!==t.target&&n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:r.texture});for(let[e,t]of x)n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:t.texture});if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(i[e]={value:n()},a[e]=n):i[e]={value:n};let o=Ue(this.#n,{vertexShader:t.vert,fragmentShader:n,uniforms:i,renderingToBuffer:t.target!==void 0,glslVersion:t.glslVersion});S.push({pass:o,uniforms:i,uniformGenerators:{...v,...a},target:t.target,persistent:t.persistent,float:t.float,size:t.size,backbuffer:t.target?x.get(t.target):void 0})}let C=Date.now()/1e3,w={type:f,element:e,isInViewport:!1,isInLogicalViewport:!1,width:i.width,height:i.height,passes:S,bufferTargets:b,startTime:C,enterTime:C,leaveTime:-1/0,release:t.release??1/0,isGif:p,isFullScreen:o,overflow:s,intersection:l,originalOpacity:u,srcTexture:d,zIndex:t.zIndex??0,backbuffer:y,autoCrop:g};this.#k(w,a,C),this.#p.push(w),this.#p.sort((e,t)=>e.zIndex-t.zIndex)}#D(e){let t=t=>t.glslVersion===void 0&&e.glslVersion!==void 0?{...t,glslVersion:e.glslVersion}:t;return Array.isArray(e.shader)?e.shader.map(t):[t({frag:this.#A(e.shader||`uvGradient`)})]}removeElement(e){let t=this.#p.findIndex(t=>t.element===e);if(t!==-1){let n=this.#p.splice(t,1)[0];for(let e of n.bufferTargets.values())e.dispose();for(let e of n.passes)e.pass.dispose(),e.backbuffer?.dispose();n.backbuffer?.dispose(),n.srcTexture.dispose(),e.style.setProperty(`opacity`,n.originalOpacity.toString())}}updateTextElement(e){let t=this.#p.findIndex(t=>t.element===e);return t===-1?Promise.resolve():this.#E(this.#p[t])}updateCanvasElement(e){let t=this.#p.find(t=>t.element===e);if(t){let n=t.passes[0].uniforms.src,r=n.value,i=new D(this.#n,e);i.wrapS=r.wrapS,i.wrapT=r.wrapT,i.needsUpdate=!0,n.value=i,t.srcTexture=i,r.dispose()}}updateHICTexture(e,t){let n=this.#p.find(t=>t.element===e);if(!n||n.type!==`hic`)return;let r=n.passes[0].uniforms.src,i=r.value;if(i.source===t)i.needsUpdate=!0;else{let e=new D(this.#n,t);e.wrapS=i.wrapS,e.wrapT=i.wrapT,e.needsUpdate=!0,r.value=e,n.srcTexture=e,i.dispose()}}get maxTextureSize(){return this.#n.maxTextureSize}isPlaying(){return this.#d!==void 0}play(){this.isPlaying()||(this.#d=requestAnimationFrame(this.#O))}stop(){this.#d!==void 0&&(cancelAnimationFrame(this.#d),this.#d=void 0)}render(){let e=Date.now()/1e3,t=this.#r;this.#C(),t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,this.#t.width,this.#t.height),t.clear(t.COLOR_BUFFER_BIT);let n=this.#h.right-this.#h.left,r=this.#h.bottom-this.#h.top,i=M(0,0,n,r),a=this.#o.length>0;a&&(this.#F(n,r),this.#c&&(t.bindFramebuffer(t.FRAMEBUFFER,this.#c.fbo),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)));for(let t of this.#p){let o=t.element.getBoundingClientRect(),s=Ye(o),c=this.#k(t,s,e);if(!c.isVisible)continue;let l=t.passes[0].uniforms;l.time.value=e-t.startTime,l.resolution.value.set(o.width*this.#f,o.height*this.#f),l.mouse.value.set((this.#b+this.#v)*this.#f,(this.#x+this.#y)*this.#f);for(let e of t.passes)for(let[t,n]of Object.entries(e.uniformGenerators))e.uniforms[t].value=n();$.get(t.element)?.update(),(t.type===`video`||t.isGif)&&(l.src.value.needsUpdate=!0);let u=j(s,r,this.#v,this.#y),d=j(c.rectWithOverflow,r,this.#v,this.#y);t.backbuffer&&(t.passes[0].uniforms.backbuffer.value=t.backbuffer.texture);{let e=t.isFullScreen?i:d,n=Math.max(1,e.w*this.#f),r=Math.max(1,e.h*this.#f),a=Math.max(1,e.w),o=Math.max(1,e.h);for(let e=0;e<t.passes.length-1;e++){let i=t.passes[e];if(!i.size)if(i.backbuffer)i.backbuffer.resize(a,o);else{let e=t.bufferTargets.get(i.target);e&&(e.width!==n||e.height!==r)&&e.setSize(n,r)}}}let f=new Map;for(let e of t.passes)e.backbuffer&&e.target&&f.set(e.target,e.backbuffer.texture);let p=t.srcTexture,m=this.#b+this.#v-u.x,h=this.#x+this.#y-u.y;for(let e=0;e<t.passes.length-1;e++){let n=t.passes[e],r=t.isFullScreen?i:d;n.uniforms.src.value=p;for(let[e,t]of f)n.uniforms[e]&&(n.uniforms[e].value=t);for(let[e,t]of Object.entries(n.uniformGenerators))n.uniforms[e]&&(n.uniforms[e].value=t());let a=n.size?n.size[0]:r.w*this.#f,o=n.size?n.size[1]:r.h*this.#f,s=n.size?M(0,0,n.size[0],n.size[1]):M(0,0,r.w,r.h);if(n.uniforms.resolution.value.set(a,o),n.uniforms.offset.value.set(0,0),n.uniforms.mouse.value.set(m/r.w*a,h/r.h*o),n.backbuffer)this.#j(n.pass,n.backbuffer.target,s,n.uniforms,!0),n.backbuffer.swap(),p=n.backbuffer.texture;else{let e=t.bufferTargets.get(n.target);if(!e)continue;this.#j(n.pass,e,s,n.uniforms,!0),p=e.texture}n.target&&f.set(n.target,p)}let g=t.passes[t.passes.length-1];g.uniforms.src.value=p,g.uniforms.resolution.value.set(o.width*this.#f,o.height*this.#f),g.uniforms.offset.value.set(u.x*this.#f,u.y*this.#f),g.uniforms.mouse.value.set((this.#b+this.#v)*this.#f,(this.#x+this.#y)*this.#f);for(let[e,t]of f)g.uniforms[e]&&(g.uniforms[e].value=t);for(let[e,t]of Object.entries(g.uniformGenerators))g.uniforms[e]&&(g.uniforms[e].value=t());t.backbuffer?(g.uniforms.backbuffer.value=t.backbuffer.texture,t.isFullScreen?(t.backbuffer.resize(n,r),this.#M(t,u.x,u.y),this.#j(g.pass,t.backbuffer.target,i,g.uniforms,!0),t.backbuffer.swap(),this.#a.setUniforms(t.backbuffer.texture,this.#f,i),this.#j(this.#a.pass,a&&this.#c||null,i,this.#a.uniforms,!1)):(t.backbuffer.resize(d.w,d.h),this.#M(t,t.overflow.left,t.overflow.bottom),this.#j(g.pass,t.backbuffer.target,t.backbuffer.getViewport(),g.uniforms,!0),t.backbuffer.swap(),this.#a.setUniforms(t.backbuffer.texture,this.#f,d),this.#j(this.#a.pass,a&&this.#c||null,d,this.#a.uniforms,!1))):(this.#M(t,u.x,u.y),this.#j(g.pass,a&&this.#c||null,t.isFullScreen?i:d,g.uniforms,!1))}a&&this.#c&&this.#P(i,e)}#O=()=>{this.isPlaying()&&(this.render(),this.#d=requestAnimationFrame(this.#O))};#k(e,t,n){let r=J(t,e.overflow),i=e.isFullScreen||Z(this.#g,r),a=J(this.#g,e.intersection.rootMargin),o=Xe(a,t),s=e.isFullScreen||Qe(a,t,o,e.intersection.threshold);!e.isInLogicalViewport&&s&&(e.enterTime=n,e.leaveTime=1/0),e.isInLogicalViewport&&!s&&(e.leaveTime=n),e.isInViewport=i,e.isInLogicalViewport=s;let c=i&&n-e.leaveTime<=e.release;if(c){let t=e.passes[0].uniforms;t.intersection.value=o,t.enterTime.value=n-e.enterTime,t.leaveTime.value=n-e.leaveTime}return{isVisible:c,intersection:o,rectWithOverflow:r}}#A(e){return e in o?o[e]:e}#j(e,t,n,r,i){let a=this.#r;i&&t!==null&&t!==this.#c&&(a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.viewport(0,0,t.width,t.height),a.clear(a.COLOR_BUFFER_BIT));let o=r.viewport;o&&o.value instanceof F&&o.value.set(n.x*this.#f,n.y*this.#f,n.w*this.#f,n.h*this.#f);try{pe(a,this.#i,e,t,n,this.#_[0],this.#_[1],this.#f)}catch(e){console.error(e)}}#M(e,t,n){let r=e.passes[0].uniforms.offset.value;r.x=t*this.#f,r.y=n*this.#f}#N(e){let t=[],n=[],r=[];for(let t of e)`frag`in t&&r.push(t);for(let e=0;e<r.length-1;e++)r[e].target||(r[e]={...r[e],target:`pass${e}`});for(let r of e){let e,i;`frag`in r?(e=r.frag,i=new K(this.#n,e,r.uniforms,r.persistent??!1,r.float??!1,r.size,r.target!==void 0,r.glslVersion),n.push(r.target)):(e=this.#A(r.shader),i=new K(this.#n,e,r.uniforms,r.persistent??!1,r.float??!1,void 0,!1,r.glslVersion),r.persistent&&i.registerBufferUniform(`backbuffer`),n.push(void 0)),this.#o.push(i),t.push(e);let a={};if(r.uniforms)for(let[e,t]of Object.entries(r.uniforms))typeof t==`function`&&(a[e]=t);this.#l.push(a)}this.#s=n;for(let e of r)e.target&&this.#u.set(e.target,void 0);let i=n.filter(e=>e!==void 0);for(let e=0;e<this.#o.length;e++)for(let n of i)t[e].match(RegExp(`uniform\\s+sampler2D\\s+${n}\\b`))&&this.#o[e].registerBufferUniform(n)}#P(e,t){if(!this.#c)return;let n=this.#c.texture,r=new Map;for(let e=0;e<this.#o.length;e++){let t=this.#o[e],n=this.#s[e];n&&t.backbuffer&&r.set(n,t.backbuffer.texture)}for(let i=0;i<this.#o.length;i++){let a=this.#o[i],o=i===this.#o.length-1,s=this.#l[i],c=this.#s[i],l=this.#b+this.#v,u=this.#x+this.#y,d=a.getTargetDimensions();if(d){let[r,i]=d;a.uniforms.src.value=n,a.uniforms.resolution.value.set(r,i),a.uniforms.offset.value.set(0,0),a.uniforms.time.value=t-this.#m,a.uniforms.mouse.value.set(l/e.w*r,u/e.h*i)}else a.setUniforms(n,this.#f,e,t-this.#m,l,u);a.uniforms.passIndex.value=i,a.updateCustomUniforms(s);for(let[e,t]of r){let n=a.uniforms[e];n&&(n.value=t)}if(o)a.backbuffer?(a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture),this.#j(a.pass,a.backbuffer.target,e,a.uniforms,!0),a.backbuffer.swap(),this.#a.setUniforms(a.backbuffer.texture,this.#f,e),this.#j(this.#a.pass,null,e,this.#a.uniforms,!1)):this.#j(a.pass,null,e,a.uniforms,!1);else if(a.backbuffer){a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture);let t=d?M(0,0,d[0]/this.#f,d[1]/this.#f):e;this.#j(a.pass,a.backbuffer.target,t,a.uniforms,!0),a.backbuffer.swap(),n=a.backbuffer.texture,c&&r.set(c,a.backbuffer.texture)}else{let t=c??`postEffect${i}`,o=this.#u.get(t),s=d?d[0]:e.w*this.#f,l=d?d[1]:e.h*this.#f;(!o||o.width!==s||o.height!==l)&&(o?.dispose(),o=G(this.#n,s,l,{float:a.float}),this.#u.set(t,o));let u=d?M(0,0,d[0]/this.#f,d[1]/this.#f):e;this.#j(a.pass,o,u,a.uniforms,!0),n=o.texture,c&&r.set(c,o.texture)}}}#F(e,t){let n=e*this.#f,r=t*this.#f;(!this.#c||this.#c.width!==n||this.#c.height!==r)&&(this.#c?.dispose(),this.#c=G(this.#n,n,r));for(let n of this.#o)n.persistent&&!n.backbuffer?n.initializeBackbuffer(this.#n,e,t,this.#f):n.backbuffer&&n.resizeBackbuffer(e,t)}}}));function at(){try{let e=document.createElement(`canvas`);return(e.getContext(`webgl2`)||e.getContext(`webgl`))!==null}catch{return!1}}var ot=e((()=>{}));function st(){if(typeof window>`u`)throw`Cannot find 'window'. VFX-JS only runs on the browser.`;if(typeof document>`u`)throw`Cannot find 'document'. VFX-JS only runs on the browser.`}function ct(e){return{position:e?`fixed`:`absolute`,top:0,left:0,width:`0px`,height:`0px`,"z-index":9999,"pointer-events":`none`}}var lt,ut=e((()=>{C(),ee(),ne(),it(),ot(),lt=class e{#e;#t;#n=new Map;static init(t){try{return new e(t)}catch{return null}}constructor(e={}){if(st(),!at())throw Error(`[VFX-JS] WebGL is not available in this environment.`);let t=te(e),n=document.createElement(`canvas`),r=ct(t.fixedCanvas);for(let[e,t]of Object.entries(r))n.style.setProperty(e,t.toString());t.zIndex!==void 0&&n.style.setProperty(`z-index`,t.zIndex.toString()),(t.wrapper??document.body).appendChild(n),this.#t=n,this.#e=new rt(t,n),t.autoplay&&this.#e.play()}async add(e,t,n){e instanceof HTMLImageElement?await this.#r(e,t):e instanceof HTMLVideoElement?await this.#i(e,t):e instanceof HTMLCanvasElement?e.hasAttribute(`layoutsubtree`)&&n?await this.#e.addElement(e,t,n):await this.#a(e,t):await this.#o(e,t)}updateHICTexture(e,t){this.#e.updateHICTexture(e,t)}get maxTextureSize(){return this.#e.maxTextureSize}async addHTML(e,t){if(!w())return console.warn(`html-in-canvas not supported, falling back to dom-to-canvas`),this.add(e,t);t.overlay!==void 0&&console.warn(`addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.`);let{overlay:n,...r}=t,i=this.#n.get(e);i&&this.#e.removeElement(i);let{canvas:a,initialCapture:o}=await p(e,{onCapture:e=>{this.#e.updateHICTexture(a,e)},maxSize:this.#e.maxTextureSize});i=a,this.#n.set(e,i),await this.#e.addElement(i,r,o)}remove(e){let t=this.#n.get(e);t?(m(t,e),this.#n.delete(e),this.#e.removeElement(t)):this.#e.removeElement(e)}async update(e){let t=this.#n.get(e);if(t){t.requestPaint();return}if(e instanceof HTMLCanvasElement){this.#e.updateCanvasElement(e);return}else return this.#e.updateTextElement(e)}play(){this.#e.play()}stop(){this.#e.stop()}render(){this.#e.render()}destroy(){for(let[e,t]of this.#n)m(t,e);this.#n.clear(),this.#e.destroy(),this.#t.remove()}#r(e,t){return e.complete?this.#e.addElement(e,t):new Promise(n=>{e.addEventListener(`load`,()=>{this.#e.addElement(e,t),n()},{once:!0})})}#i(e,t){return e.readyState>=3?this.#e.addElement(e,t):new Promise(n=>{e.addEventListener(`canplay`,()=>{this.#e.addElement(e,t),n()},{once:!0})})}#a(e,t){return this.#e.addElement(e,t)}#o(e,t){return this.#e.addElement(e,t)}}})),dt=e((()=>{s(),C(),ee(),ut()}));export{f as a,d as i,lt as n,w as r,dt as t};
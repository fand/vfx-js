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
    `}}));function c(e){if(!e.src||e.src.startsWith(`data:`))return!1;try{return new URL(e.src,location.href).origin!==location.origin}catch{return!1}}async function l(e){let t=await(await fetch(e)).blob();return URL.createObjectURL(t)}async function u(e){let t=Array.from(e.querySelectorAll(`img`)).filter(e=>e.complete&&e.naturalWidth>0&&c(e));if(t.length===0)return()=>{};let n=new Map,r=[];return await Promise.all(t.map(async e=>{try{let t=await l(e.src);n.set(e,e.src),r.push(t),await new Promise(n=>{e.addEventListener(`load`,()=>n(),{once:!0}),e.src=t})}catch{}})),()=>{for(let[e,t]of n)e.src=t;for(let e of r)URL.revokeObjectURL(e)}}async function d(e,t){let n=e.getContext(`2d`);if(!n)throw Error(`Failed to get 2d context from layoutsubtree canvas`);let{onCapture:r,maxSize:i}=t,a=null,o=null,s=new Promise(e=>{o=e});e.onpaint=()=>{let t=e.firstElementChild;if(!t||e.width===0||e.height===0)return;n.clearRect(0,0,e.width,e.height),n.drawElementImage(t,0,0);let s=e.width,c=e.height;if(i&&(s>i||c>i)){let e=Math.min(i/s,i/c);s=Math.floor(s*e),c=Math.floor(c*e)}(!a||a.width!==s||a.height!==c)&&(a=new OffscreenCanvas(s,c));let l=a.getContext(`2d`);if(l){if(l.clearRect(0,0,s,c),l.drawImage(e,0,0,s,c),n.clearRect(0,0,e.width,e.height),o){o(a),o=null;return}r(a)}};let c=new ResizeObserver(t=>{for(let n of t){let t=n.devicePixelContentBoxSize?.[0];if(t)e.width=t.inlineSize,e.height=t.blockSize;else{let t=n.borderBoxSize?.[0];if(t){let n=window.devicePixelRatio;e.width=Math.round(t.inlineSize*n),e.height=Math.round(t.blockSize*n)}}}e.requestPaint()});c.observe(e,{box:`device-pixel-content-box`}),_.set(e,c);let l=e.firstElementChild,u=``;if(l){let t=new ResizeObserver(t=>{let n=t[0].borderBoxSize?.[0];if(!n)return;let r=`${Math.round(n.blockSize)}px`;r!==u&&(u=r,e.style.setProperty(`height`,r))});t.observe(l),v.set(e,t)}return s}function f(e){e.onpaint=null;let t=_.get(e);t&&(t.disconnect(),_.delete(e));let n=v.get(e);n&&(n.disconnect(),v.delete(e))}async function p(e,t){let n=e.getBoundingClientRect(),r=document.createElement(`canvas`);r.setAttribute(`layoutsubtree`,``),r.className=e.className;let i=e.getAttribute(`style`);i&&r.setAttribute(`style`,i),r.style.setProperty(`padding`,`0`),r.style.setProperty(`border`,`none`),r.style.setProperty(`box-sizing`,`content-box`);let a=getComputedStyle(e),o=a.display===`inline`?`block`:a.display;r.style.setProperty(`display`,o);for(let e of h)r.style.setProperty(e,a.getPropertyValue(e));for(let e of g)r.style.setProperty(e,a.getPropertyValue(e));let s=e=>Number.parseFloat(e),c=s(a.paddingLeft)+s(a.paddingRight)+s(a.borderLeftWidth)+s(a.borderRightWidth),l=s(a.paddingTop)+s(a.paddingBottom)+s(a.borderTopWidth)+s(a.borderBottomWidth);c>0&&r.style.setProperty(`width`,`${n.width}px`),l>0&&r.style.setProperty(`height`,`${n.height}px`),r.style.width||r.style.setProperty(`width`,`100%`),r.style.height||r.style.setProperty(`height`,`${n.height}px`);let f=window.devicePixelRatio;r.width=Math.round(n.width*f),r.height=Math.round(n.height*f),y.set(e,e.style.margin),b.set(e,e.style.width),x.set(e,e.style.boxSizing),e.parentNode?.insertBefore(r,e),r.appendChild(e),e.style.setProperty(`margin`,`0`),e.style.setProperty(`width`,`100%`),e.style.setProperty(`box-sizing`,`border-box`);let p=await u(e);return S.set(r,p),{canvas:r,initialCapture:await d(r,t)}}function m(e,t){f(e);let n=S.get(e);n&&(n(),S.delete(e)),e.parentNode?.insertBefore(t,e),e.remove();let r=y.get(t);r!==void 0&&(t.style.margin=r,y.delete(t));let i=b.get(t);i!==void 0&&(t.style.width=i,b.delete(t));let a=x.get(t);a!==void 0&&(t.style.boxSizing=a,x.delete(t))}var h,g,_,v,y,b,x,S,C=e((()=>{h=[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`],g=[`position`,`top`,`right`,`bottom`,`left`,`float`,`flex`,`flex-grow`,`flex-shrink`,`flex-basis`,`align-self`,`justify-self`,`place-self`,`order`,`grid-column`,`grid-column-start`,`grid-column-end`,`grid-row`,`grid-row-start`,`grid-row-end`,`grid-area`],_=new WeakMap,v=new WeakMap,y=new WeakMap,b=new WeakMap,x=new WeakMap,S=new WeakMap}));function w(){if(T!==void 0)return T;try{let e=document.createElement(`canvas`),t=e.getContext(`2d`);T=t!==null&&typeof t.drawElementImage==`function`&&typeof e.requestPaint==`function`}catch{T=!1}return T}var T,ee=e((()=>{}));function te(e){let t=typeof window<`u`?window.devicePixelRatio:1,n;n=e.scrollPadding===void 0?[.1,.1]:e.scrollPadding===!1?[0,0]:Array.isArray(e.scrollPadding)?[e.scrollPadding[0]??.1,e.scrollPadding[1]??.1]:[e.scrollPadding,e.scrollPadding];let r;return r=e.postEffect===void 0?[]:Array.isArray(e.postEffect)?e.postEffect:[e.postEffect],{pixelRatio:e.pixelRatio??t,zIndex:e.zIndex??void 0,autoplay:e.autoplay??!0,fixedCanvas:e.scrollPadding===!1,scrollPadding:n,wrapper:e.wrapper,postEffects:r}}var ne=e((()=>{}));function re(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}function ie(e,t){return t===`nearest`?e.NEAREST:e.LINEAR}function ae(e){return new Promise((t,n)=>{let r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>t(r),r.onerror=n,r.src=e})}var E,D=e((()=>{E=class{#e;#t=!1;#n;#r;constructor(e,t,n){this.wrapS=`clamp`,this.wrapT=`clamp`,this.minFilter=`linear`,this.magFilter=`linear`,this.needsUpdate=!0,this.source=null,this.#e=e,this.gl=e.gl;let r=n?.externalHandle;this.#r=r!==void 0,r===void 0?this.#i():(this.texture=r,this.#t=!0,this.needsUpdate=!1),t&&(this.source=t),this.#n=n?.autoRegister!==!1&&!this.#r,this.#n&&e.addResource(this)}#i(){let e=this.gl.createTexture();if(!e)throw Error(`[VFX-JS] Failed to create texture`);this.texture=e}restore(){this.#r||(this.#i(),this.#t=!1,this.needsUpdate=!0)}bind(e){let t=this.gl;t.activeTexture(t.TEXTURE0+e),t.bindTexture(t.TEXTURE_2D,this.texture),this.needsUpdate&&=(this.#a(),!1)}#a(){let e=this.gl,t=this.source;if(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4),t)try{e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t)}catch(e){console.error(e)}else if(!this.#t){let t=new Uint8Array([0,0,0,0]);e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,t)}this.#o(),this.#t=!0}#o(){let e=this.gl;e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,re(e,this.wrapS)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,re(e,this.wrapT)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,ie(e,this.minFilter)),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,ie(e,this.magFilter))}dispose(){this.#n&&this.#e.removeResource(this),this.#r||this.gl.deleteTexture(this.texture)}}}));function oe(e,t){return t===`repeat`?e.REPEAT:t===`mirror`?e.MIRRORED_REPEAT:e.CLAMP_TO_EDGE}var O,k=e((()=>{D(),O=class{#e;constructor(e,t,n,r={}){this.#e=e,this.gl=e.gl,this.width=Math.max(1,Math.floor(t)),this.height=Math.max(1,Math.floor(n)),this.float=r.float??!1,this.texture=new E(e,void 0,{autoRegister:!1});let i=r.wrap;i!==void 0&&(typeof i==`string`?(this.texture.wrapS=i,this.texture.wrapT=i):(this.texture.wrapS=i[0],this.texture.wrapT=i[1])),r.filter!==void 0&&(this.texture.minFilter=r.filter,this.texture.magFilter=r.filter),this.#t(),e.addResource(this)}setSize(e,t){let n=Math.max(1,Math.floor(e)),r=Math.max(1,Math.floor(t));n===this.width&&r===this.height||(this.width=n,this.height=r,this.#t())}restore(){this.texture.restore(),this.#t()}dispose(){this.#e.removeResource(this),this.gl.deleteFramebuffer(this.fbo),this.texture.dispose()}#t(){let e=this.gl,t=this.fbo,n=e.createFramebuffer();if(!n)throw Error(`[VFX-JS] Failed to create framebuffer`);this.fbo=n;let r=this.texture.texture;e.bindTexture(e.TEXTURE_2D,r);let i=this.#e.floatLinearFilter,a=this.float?i?e.RGBA32F:e.RGBA16F:e.RGBA8,o=this.float?i?e.FLOAT:e.HALF_FLOAT:e.UNSIGNED_BYTE;e.texImage2D(e.TEXTURE_2D,0,a,this.width,this.height,0,e.RGBA,o,null);let s=this.texture.minFilter===`nearest`?e.NEAREST:e.LINEAR,c=this.texture.magFilter===`nearest`?e.NEAREST:e.LINEAR,l=oe(e,this.texture.wrapS),u=oe(e,this.texture.wrapT);e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,s),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,c),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,l),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,u),e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindTexture(e.TEXTURE_2D,null),this.texture.needsUpdate=!1,this.texture.source=null,t&&e.deleteFramebuffer(t)}}}));function se(e,t,n,r){return{x:e.left+n,y:t-r-e.bottom,w:e.right-e.left,h:e.bottom-e.top}}function A(e,t,n,r){return{x:e,y:t,w:n,h:r}}var ce=e((()=>{})),j,le=e((()=>{k(),ce(),j=class{#e;#t;#n;#r;constructor(e,t,n,r,i,a={}){this.#e=t,this.#t=n,this.#n=r;let o=t*r,s=n*r,c={float:i,wrap:a.wrap,filter:a.filter};this.#r=[new O(e,o,s,c),new O(e,o,s,c)]}get texture(){return this.#r[0].texture}get target(){return this.#r[1]}resize(e,t){if(e===this.#e&&t===this.#t)return;this.#e=e,this.#t=t;let n=e*this.#n,r=t*this.#n;this.#r[0].setSize(n,r),this.#r[1].setSize(n,r)}swap(){this.#r=[this.#r[1],this.#r[0]]}getViewport(){return A(0,0,this.#e,this.#t)}dispose(){this.#r[0].dispose(),this.#r[1].dispose()}}})),M,N,P=e((()=>{M=class{constructor(e=0,t=0){this.x=0,this.y=0,this.x=e,this.y=t}set(e,t){return this.x=e,this.y=t,this}},N=class{constructor(e=0,t=0,n=0,r=0){this.x=0,this.y=0,this.z=0,this.w=0,this.x=e,this.y=t,this.z=n,this.w=r}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}}}));function ue(e){return/#version\s+300\s+es\b/.test(e)?`300 es`:/#version\s+100\b/.test(e)||/\bgl_FragColor\b|\btexture2D\b|\bvarying\b|\battribute\b/.test(e)?`100`:`300 es`}function de(e,t,n){let r=e.createShader(t);if(!r)throw Error(`[VFX-JS] Failed to create shader`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)??``;throw e.deleteShader(r),Error(`[VFX-JS] Shader compile failed: ${t}\n\n${n}`)}return r}function fe(e,t){return e.replace(/^\s+/,``).startsWith(`#version`)||t===`100`?e:`#version 300 es\n${e}`}function pe(e){return e===35678||e===36298||e===36306||e===35682}function me(e,t,n){let r=t.location,i=t.size>1,a=n,o=n,s=n;switch(t.type){case e.FLOAT:i?e.uniform1fv(r,a):e.uniform1f(r,n);return;case e.FLOAT_VEC2:if(i)e.uniform2fv(r,a);else if(n instanceof M)e.uniform2f(r,n.x,n.y);else{let t=n;e.uniform2f(r,t[0],t[1])}return;case e.FLOAT_VEC3:if(i)e.uniform3fv(r,a);else{let t=n;e.uniform3f(r,t[0],t[1],t[2])}return;case e.FLOAT_VEC4:if(i)e.uniform4fv(r,a);else if(n instanceof N)e.uniform4f(r,n.x,n.y,n.z,n.w);else{let t=n;e.uniform4f(r,t[0],t[1],t[2],t[3])}return;case e.INT:i?e.uniform1iv(r,o):e.uniform1i(r,n);return;case e.INT_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,t[0],t[1])}return;case e.INT_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,t[0],t[1],t[2])}return;case e.INT_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,t[0],t[1],t[2],t[3])}return;case e.BOOL:i?e.uniform1iv(r,o):e.uniform1i(r,+!!n);return;case e.BOOL_VEC2:if(i)e.uniform2iv(r,o);else{let t=n;e.uniform2i(r,+!!t[0],+!!t[1])}return;case e.BOOL_VEC3:if(i)e.uniform3iv(r,o);else{let t=n;e.uniform3i(r,+!!t[0],+!!t[1],+!!t[2])}return;case e.BOOL_VEC4:if(i)e.uniform4iv(r,o);else{let t=n;e.uniform4i(r,+!!t[0],+!!t[1],+!!t[2],+!!t[3])}return;case e.FLOAT_MAT2:e.uniformMatrix2fv(r,!1,a);return;case e.FLOAT_MAT3:e.uniformMatrix3fv(r,!1,a);return;case e.FLOAT_MAT4:e.uniformMatrix4fv(r,!1,a);return;case e.UNSIGNED_INT:i?e.uniform1uiv(r,s):e.uniform1ui(r,n);return;case e.UNSIGNED_INT_VEC2:if(i)e.uniform2uiv(r,s);else{let t=n;e.uniform2ui(r,t[0],t[1])}return;case e.UNSIGNED_INT_VEC3:if(i)e.uniform3uiv(r,s);else{let t=n;e.uniform3ui(r,t[0],t[1],t[2])}return;case e.UNSIGNED_INT_VEC4:if(i)e.uniform4uiv(r,s);else{let t=n;e.uniform4ui(r,t[0],t[1],t[2],t[3])}return;default:I.has(t.type)||(I.add(t.type),console.warn(`[VFX-JS] Unsupported uniform type 0x${t.type.toString(16)}; skipping upload.`));return}}var F,I,L=e((()=>{D(),P(),F=class{#e;#t;#n;#r;#i=new Map;constructor(e,t,n,r){this.#e=e,this.gl=e.gl,this.#t=t,this.#n=n,this.#r=r??ue(n),this.#a(),e.addResource(this)}#a(){let e=this.gl,t=de(e,e.VERTEX_SHADER,fe(this.#t,this.#r)),n=de(e,e.FRAGMENT_SHADER,fe(this.#n,this.#r)),r=e.createProgram();if(!r)throw Error(`[VFX-JS] Failed to create program`);if(e.attachShader(r,t),e.attachShader(r,n),e.bindAttribLocation(r,0,`position`),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let i=e.getProgramInfoLog(r)??``;throw e.deleteShader(t),e.deleteShader(n),e.deleteProgram(r),Error(`[VFX-JS] Program link failed: ${i}`)}e.detachShader(r,t),e.detachShader(r,n),e.deleteShader(t),e.deleteShader(n),this.program=r,this.#i.clear();let i=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<i;t++){let n=e.getActiveUniform(r,t);if(!n)continue;let i=n.name.replace(/\[0\]$/,``),a=e.getUniformLocation(r,n.name);a&&this.#i.set(i,{location:a,type:n.type,size:n.size})}}restore(){this.#a()}use(){this.gl.useProgram(this.program)}hasUniform(e){return this.#i.has(e)}uploadUniforms(e){let t=this.gl,n=0;for(let[r,i]of this.#i){let a=e[r];if(!a)continue;let o=a.value;if(o!=null){if(pe(i.type)){o instanceof E&&(o.bind(n),t.uniform1i(i.location,n),n++);continue}o instanceof E||me(t,i,o)}}}dispose(){this.#e.removeResource(this),this.gl.deleteProgram(this.program)}},I=new Set}));function he(e,t,n,r,i,a,o,s){let c=r?r.width/s:a,l=r?r.height/s:o,u=Math.max(0,i.x),d=Math.max(0,i.y),f=Math.min(c,i.x+i.w),p=Math.min(l,i.y+i.h),m=f-u,h=p-d;m<=0||h<=0||(e.bindFramebuffer(e.FRAMEBUFFER,r?r.fbo:null),e.viewport(Math.round(u*s),Math.round(d*s),Math.round(m*s),Math.round(h*s)),ge(e,n.blend),n.program.use(),n.program.uploadUniforms(n.uniforms),t.draw())}function ge(e,t){if(t===`none`){e.disable(e.BLEND);return}e.enable(e.BLEND),e.blendEquation(e.FUNC_ADD),t===`premultiplied`?e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA):e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA)}var R,z=e((()=>{L(),R=class{constructor(e,t,n,r,i,a){this.gl=e.gl,this.program=new F(e,t,n,a),this.uniforms=r,this.blend=i}dispose(){this.program.dispose()}}})),_e,ve=e((()=>{s(),z(),P(),_e=class{constructor(e){this.uniforms={src:{value:null},offset:{value:new M},resolution:{value:new M},viewport:{value:new N}},this.pass=new R(e,t,r,this.uniforms,`premultiplied`)}setUniforms(e,t,n){this.uniforms.src.value=e,this.uniforms.resolution.value.set(n.w*t,n.h*t),this.uniforms.offset.value.set(n.x*t,n.y*t)}dispose(){this.pass.dispose()}}}));async function B(e,t,n,r){let i=e.getBoundingClientRect(),a=window.devicePixelRatio,o=i.width*a,s=i.height*a,c=1,l=o,u=s;r&&(l>r||u>r)&&(c=Math.min(r/l,r/u),l=Math.floor(l*c),u=Math.floor(u*c));let d=n&&n.width===l&&n.height===u?n:new OffscreenCanvas(l,u),f=e.cloneNode(!0);await ye(e,f),be(e,f),f.style.setProperty(`opacity`,t.toString()),f.style.setProperty(`margin`,`0px`),xe(f);let p=f.outerHTML,m=`<svg xmlns="http://www.w3.org/2000/svg" width="${o}" height="${s}"><foreignObject width="100%" height="100%">${Ce(p)}</foreignObject></svg>`;return new Promise((e,t)=>{let n=new Image;n.onload=()=>{let r=d.getContext(`2d`);if(r===null)return t();r.clearRect(0,0,l,u);let i=a*c;r.scale(i,i),r.drawImage(n,0,0,o,s),r.setTransform(1,0,0,1,0,0),e(d)},n.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(m)}`})}async function ye(e,t){let n=window.getComputedStyle(e);for(let e of Array.from(n))/(-inline-|-block-|^inline-|^block-)/.test(e)||/^-webkit-.*(start|end|before|after|logical)/.test(e)||t.style.setProperty(e,n.getPropertyValue(e),n.getPropertyPriority(e));if(t.tagName===`INPUT`)t.setAttribute(`value`,t.value);else if(t.tagName===`TEXTAREA`)t.innerHTML=t.value;else if(t.tagName===`IMG`)try{t.src=await Se(e.src)}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];await ye(r,i)}}function be(e,t){if(typeof e.computedStyleMap==`function`)try{let n=e.computedStyleMap();for(let e of[`margin-top`,`margin-right`,`margin-bottom`,`margin-left`]){let r=n.get(e);r instanceof CSSKeywordValue&&r.value===`auto`&&t.style.setProperty(e,`auto`)}}catch{}for(let n=0;n<e.children.length;n++){let r=e.children[n],i=t.children[n];r instanceof HTMLElement&&i instanceof HTMLElement&&be(r,i)}}function xe(e){let t=e;for(;;){let e=t.style;if(Number.parseFloat(e.paddingTop)>0||Number.parseFloat(e.borderTopWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.firstElementChild;if(!n)break;n.style.setProperty(`margin-top`,`0px`),t=n}for(t=e;;){let e=t.style;if(Number.parseFloat(e.paddingBottom)>0||Number.parseFloat(e.borderBottomWidth)>0||e.getPropertyValue(`overflow-x`)&&e.getPropertyValue(`overflow-x`)!==`visible`||e.getPropertyValue(`overflow-y`)&&e.getPropertyValue(`overflow-y`)!==`visible`||e.display===`flex`||e.display===`grid`||e.display===`flow-root`||e.display===`inline-block`)break;let n=t.lastElementChild;if(!n)break;n.style.setProperty(`margin-bottom`,`0px`),t=n}}async function Se(e){let t=await fetch(e).then(e=>e.blob());return new Promise(e=>{let n=new FileReader;n.onload=function(){e(this.result)},n.readAsDataURL(t)})}var Ce,we=e((()=>{Ce=e=>{let t=document.implementation.createHTMLDocument(`test`),n=t.createRange();n.selectNodeContents(t.documentElement),n.deleteContents();let r=document.createElement(`head`);return t.documentElement.appendChild(r),t.documentElement.appendChild(n.createContextualFragment(e)),t.documentElement.setAttribute(`xmlns`,t.documentElement.namespaceURI),new XMLSerializer().serializeToString(t).replace(/<!DOCTYPE html>/,``)}}));function Te(e){return e===V||typeof e==`object`&&!!e&&e.__brand===`EffectQuad`}function Ee(e,t){switch(t){case`lines`:return e.LINES;case`lineStrip`:return e.LINE_STRIP;case`points`:return e.POINTS;default:return e.TRIANGLES}}function De(e,t){if(t instanceof Float32Array)return e.FLOAT;if(t instanceof Uint8Array)return e.UNSIGNED_BYTE;if(t instanceof Uint16Array)return e.UNSIGNED_SHORT;if(t instanceof Uint32Array)return e.UNSIGNED_INT;if(t instanceof Int8Array)return e.BYTE;if(t instanceof Int16Array)return e.SHORT;if(t instanceof Int32Array)return e.INT;throw Error(`[VFX-JS] Unsupported attribute typed array`)}function Oe(e,t){if(ArrayBuffer.isView(t)&&!(t instanceof DataView))return{name:e,data:t,itemSize:2,normalized:!1,perInstance:!1};let n=t;return{name:e,data:n.data,itemSize:n.itemSize,normalized:n.normalized??!1,perInstance:n.perInstance??!1}}var V,ke,Ae,je=e((()=>{V=Object.freeze({__brand:`EffectQuad`}),ke=class{#e;#t;#n;#r=[];#i=null;#a=!1;constructor(e,t,n){this.indexType=0,this.hasIndices=!1,this.drawCount=0,this.drawStart=0,this.#e=e,this.gl=e.gl,this.#t=t,this.#n=n,this.mode=Ee(this.gl,t.mode),this.instanceCount=t.instanceCount??0,this.#o(),e.addResource(this),this.#a=!0}#o(){let e=this.gl,t=e.createVertexArray();if(!t)throw Error(`[VFX-JS] Failed to create VAO`);this.vao=t,e.bindVertexArray(t);let n=this.#n.program,r=null;for(let[t,i]of Object.entries(this.#t.attributes)){let a=Oe(t,i),o=e.getAttribLocation(n,a.name);if(o<0)continue;let s=e.createBuffer();if(!s)throw Error(`[VFX-JS] Failed to create VBO for "${a.name}"`);this.#r.push(s),e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,a.data,e.STATIC_DRAW);let c=De(e,a.data);e.enableVertexAttribArray(o),c===e.FLOAT||c===e.HALF_FLOAT||a.normalized?e.vertexAttribPointer(o,a.itemSize,c,a.normalized,0,0):e.vertexAttribIPointer(o,a.itemSize,c,0,0),a.perInstance&&e.vertexAttribDivisor(o,1),t===`position`&&r===null&&(r=a.data.length/a.itemSize)}let i=0,a=this.#t.indices;if(a){let t=e.createBuffer();if(!t)throw Error(`[VFX-JS] Failed to create IBO`);this.#i=t,e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t),e.bufferData(e.ELEMENT_ARRAY_BUFFER,a,e.STATIC_DRAW),this.hasIndices=!0,this.indexType=a instanceof Uint32Array?e.UNSIGNED_INT:e.UNSIGNED_SHORT,i=a.length}else this.hasIndices=!1;e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null),this.#i&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,null);let o=this.hasIndices?i:r??0,s=this.#t.drawRange;this.drawStart=s?.start??0,this.drawCount=s?.count===void 0?Math.max(0,o-this.drawStart):s.count}restore(){this.#r=[],this.#i=null,this.#o()}draw(){let e=this.gl;e.bindVertexArray(this.vao),this.hasIndices?this.instanceCount>0?e.drawElementsInstanced(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2),this.instanceCount):e.drawElements(this.mode,this.drawCount,this.indexType,this.drawStart*(this.indexType===e.UNSIGNED_INT?4:2)):this.instanceCount>0?e.drawArraysInstanced(this.mode,this.drawStart,this.drawCount,this.instanceCount):e.drawArrays(this.mode,this.drawStart,this.drawCount)}dispose(){this.#a&&=(this.#e.removeResource(this),!1);let e=this.gl;e.deleteVertexArray(this.vao);for(let t of this.#r)e.deleteBuffer(t);this.#i&&e.deleteBuffer(this.#i),this.#r=[],this.#i=null}},Ae=class{#e;#t;#n=new WeakMap;#r=new Set;constructor(e,t){this.#e=e,this.#t=t}get quad(){return this.#t}resolve(e,t){let n=this.#n.get(e);n||(n=new Map,this.#n.set(e,n));let r=n.get(t);return r||(r=new ke(this.#e,e,t),n.set(t,r),this.#r.add(r)),r}dispose(){for(let e of this.#r)e.dispose();this.#r.clear()}}}));function Me(e){return e[W]()}function H(e){return e[G]}function Ne(e){return typeof e==`object`&&!!e&&e.__brand===`EffectRenderTarget`}function Pe(e){return typeof e==`object`&&!!e&&e.__brand===`EffectTexture`}function Fe(e){let t=globalThis.WebGLTexture;if(t&&typeof t==`function`&&e instanceof t)return!0;let n=e;return n.width===void 0&&n.naturalWidth===void 0&&n.videoWidth===void 0}function Ie(e){return e===void 0?[`clamp`,`clamp`]:typeof e==`string`?[e,e]:[e[0],e[1]]}function Le(e){return Ne(e)?{value:H(e).getReadTexture()}:Pe(e)?{value:Me(e)}:{value:e}}function U(e,t,n){let r=Object.create(null);return Object.defineProperties(r,{__brand:{value:`EffectTexture`,enumerable:!0},width:{get:t,enumerable:!0},height:{get:n,enumerable:!0},[W]:{value:e}}),r}function Re(e){let t={getReadTexture:()=>e.texture,getWriteFbo:()=>e,dispose:()=>{}},n=Object.create(null);return Object.defineProperties(n,{__brand:{value:`EffectRenderTarget`,enumerable:!0},width:{get:()=>e.width,enumerable:!0},height:{get:()=>e.height,enumerable:!0},[G]:{value:t}}),n}var W,G,ze,Be,Ve,He,Ue,We=e((()=>{le(),je(),k(),z(),L(),D(),W=Symbol.for(`@vfx-js/effect.resolve-texture`),G=Symbol.for(`@vfx-js/effect.resolve-rt`),ze=`#version 300 es
precision highp float;
in vec3 position;
out vec2 uv;
out vec2 uvContent;
out vec2 uvSrc;
uniform vec4 rectContent;
uniform vec4 rectSrc;
void main() {
    vec2 bufferUV = position.xy * 0.5 + 0.5;
    uv = bufferUV;
    uvContent = (bufferUV - rectContent.xy) / rectContent.zw;
    uvSrc = rectSrc.xy + uvContent * rectSrc.zw;
    gl_Position = vec4(position, 1.0);
}
`,Be=`
precision highp float;
attribute vec3 position;
varying vec2 uv;
varying vec2 uvContent;
varying vec2 uvSrc;
uniform vec4 rectContent;
uniform vec4 rectSrc;
void main() {
    vec2 bufferUV = position.xy * 0.5 + 0.5;
    uv = bufferUV;
    uvContent = (bufferUV - rectContent.xy) / rectContent.zw;
    uvSrc = rectSrc.xy + uvContent * rectSrc.zw;
    gl_Position = vec4(position, 1.0);
}
`,Ve=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D src;
void main() {
    outColor = texture(src, uv);
}
`,He=`
precision highp float;
varying vec2 uv;
uniform sampler2D src;
void main() {
    gl_FragColor = texture2D(src, uv);
}
`,Ue=class{#e;#t;#n;#r=new Map;#i;#a=[];#o=[];#s=[];#c=[];#l=[];#u=[];#d=`init`;#f=!1;#p;#m;constructor(e,t,n,r,i){this.#e=e,this.#t=e.gl,this.#n=n,this.#i=new Ae(e,t),this.#p={outputPhysW:1,outputPhysH:1,canvasPhys:[1,1],outputViewport:{x:0,y:0,w:1,h:1},elementPhysW:1,elementPhysH:1,rectContent:[0,0,1,1],rectSrc:[0,0,1,1]},this.#m={time:0,deltaTime:0,pixelRatio:n,resolution:[1,1],mouse:[0,0],mouseViewport:[0,0],intersection:0,enterTime:0,leaveTime:0,src:r,target:null,uniforms:{},vfxProps:i},this.ctx=this.#h()}setPhase(e){this.#d=e}setFrameDims(e){this.#p=e,this.#m.resolution=[e.canvasPhys[0],e.canvasPhys[1]];for(let t of this.#l)t.resolver.resize?.(e.outputPhysW,e.outputPhysH)}setFrameState(e){let t=this.#m;t.time=e.time,t.deltaTime=e.deltaTime,t.mouse=e.mouse,t.mouseViewport=e.mouseViewport,t.intersection=e.intersection,t.enterTime=e.enterTime,t.leaveTime=e.leaveTime,t.uniforms=e.uniforms}setSrc(e){this.#m.src=e}setOutput(e){this.#m.target=e}passthroughCopy(e,t,n){let r=this.#d;this.#d=`render`;let i=this.#m.target;this.#m.target=t;try{let r=this.#p.outputViewport;this.#p.outputViewport={...n};let i=this.#m.vfxProps.glslVersion===`100`?He:Ve;this.#b({frag:i,uniforms:{src:e},target:t}),this.#p.outputViewport=r}finally{this.#m.target=i,this.#d=r}}clearRt(e){let t=this.#t,n=H(e);t.bindFramebuffer(t.FRAMEBUFFER,n.getWriteFbo().fbo),t.viewport(0,0,e.width,e.height),t.clearColor(0,0,0,0),t.disable(t.SCISSOR_TEST),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)}#h(){let e=this,t=this.#m;return{get time(){return t.time},get deltaTime(){return t.deltaTime},get pixelRatio(){return t.pixelRatio},get resolution(){return t.resolution},get mouse(){return t.mouse},get mouseViewport(){return t.mouseViewport},get intersection(){return t.intersection},get enterTime(){return t.enterTime},get leaveTime(){return t.leaveTime},get src(){return t.src},get target(){return t.target},get uniforms(){return t.uniforms},get vfxProps(){return t.vfxProps},quad:V,get gl(){return e.#t},createRenderTarget:t=>e.#g(t),wrapTexture:(t,n)=>e.#_(t,n),draw:t=>e.#y(t),onContextRestored:t=>{let n=e.#e.onContextRestored(t);return e.#u.push(n),n}}}#g(e){let t=e?.persistent??!1,n=e?.float??!1,r=Ie(e?.wrap),i=e?.filter,a=e?.size,o=a?a[0]:this.#p.outputPhysW,s=a?a[1]:this.#p.outputPhysH,c,l,u;if(t){let e=a?1:this.#n,t=a?o:o/e,d=a?s:s/e,f=new j(this.#e,t,d,e,n,{wrap:r,filter:i});this.#o.push(f),c={getReadTexture:()=>f.texture,getWriteFbo:()=>f.target,swap:()=>f.swap(),resize:a?void 0:(e,t)=>{f.resize(e/this.#n,t/this.#n)},dispose:()=>f.dispose()},l=()=>f.target.width,u=()=>f.target.height}else{let e=new O(this.#e,o,s,{float:n,wrap:r,filter:i});this.#a.push(e),c={getReadTexture:()=>e.texture,getWriteFbo:()=>e,resize:a?void 0:(t,n)=>e.setSize(t,n),dispose:()=>e.dispose()},l=()=>e.width,u=()=>e.height}let d=Object.create(null);Object.defineProperties(d,{__brand:{value:`EffectRenderTarget`,enumerable:!0},width:{get:l,enumerable:!0},height:{get:u,enumerable:!0},[G]:{value:c}});let f={handle:d,resolver:c};return this.#c.push(f),a||this.#l.push(f),d}#_(e,t){let n=Ie(t?.wrap),r=t?.filter,i,a,o,s=null;if(Fe(e)){if(!t?.size)throw Error(`[VFX-JS] wrapTexture(WebGLTexture) requires opts.size`);let[n,r]=t.size;i=new E(this.#e,void 0,{autoRegister:!1,externalHandle:e}),a=()=>n,o=()=>r}else{let n=e;i=new E(this.#e,n);let r=t?.size,c=e=>{if(r)return e===`w`?r[0]:r[1];if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return e===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return e===`w`?n.videoWidth:n.videoHeight;let t=n;return e===`w`?t.width:t.height};a=()=>c(`w`),o=()=>c(`h`);let l=typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement||typeof HTMLCanvasElement<`u`&&n instanceof HTMLCanvasElement||typeof OffscreenCanvas<`u`&&n instanceof OffscreenCanvas;(t?.autoUpdate??l)&&(s=()=>{i.needsUpdate=!0})}i.wrapS=n[0],i.wrapT=n[1],r!==void 0&&(i.minFilter=r,i.magFilter=r),this.#s.push(i),s&&this.#v.push(s);let c=Object.create(null);return Object.defineProperties(c,{__brand:{value:`EffectTexture`,enumerable:!0},width:{get:a,enumerable:!0},height:{get:o,enumerable:!0},[W]:{value:()=>i}}),c}#v=[];tickAutoUpdates(){for(let e of this.#v)e()}#y(e){if(this.#d!==`render`){this.#d===`update`&&!this.#f&&(this.#f=!0,console.warn(`[VFX-JS] ctx.draw() called in update(); ignored. Move draws to render().`));return}this.#b(e)}#b(e){let t=this.#t,n=e.vert??(this.#m.vfxProps.glslVersion===`100`?Be:ze),r=`${e.frag}�${n}`,i=this.#r.get(r);i||(i=new F(this.#e,n,e.frag,this.#m.vfxProps.glslVersion),this.#r.set(r,i));let a=this.#m.target,o=e.target===void 0||e.target===null?a:e.target,s=o===null||o===a,c,l,u,d,f,p;if(o===null)c=null,l=this.#p.outputViewport.x,u=this.#p.outputViewport.y,d=this.#p.outputViewport.w,f=this.#p.outputViewport.h;else{let e=H(o);c=e.getWriteFbo().fbo,s?(l=this.#p.outputViewport.x,u=this.#p.outputViewport.y,d=this.#p.outputViewport.w,f=this.#p.outputViewport.h):(l=0,u=0,d=o.width,f=o.height),p=e.swap}t.bindFramebuffer(t.FRAMEBUFFER,c),t.viewport(l,u,d,f),t.disable(t.SCISSOR_TEST),ge(t,o===null?`premultiplied`:`none`),i.use();let m=this.#x(e.uniforms);i.uploadUniforms(m);let h=e.geometry??V;Te(h)?this.#i.quad.draw():this.#i.resolve(h,i).draw(),p&&p()}#x(e){let t={};if(t.rectContent={value:this.#p.rectContent},t.rectSrc={value:this.#p.rectSrc},!e)return t;for(let[n,r]of Object.entries(e))t[n]=Le(r);return t}dispose(){this.#d=`disposed`;for(let e of this.#u)e();this.#u=[];for(let e of this.#c)e.resolver.dispose();this.#c=[],this.#a=[],this.#o=[],this.#l=[];for(let e of this.#s)e.dispose();this.#s=[];for(let e of this.#r.values())e.dispose();this.#r.clear(),this.#i.dispose(),this.#v=[]}}}));function Ge(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:Array.isArray(e)?{top:e[0],right:e[1],bottom:e[2],left:e[3]}:{top:e.top??0,right:e.right??0,bottom:e.bottom??0,left:e.left??0}}function K(e){return Ge(e)}function q(e){return Ge(e)}function Ke(e){return{top:e.top,right:e.right,bottom:e.bottom,left:e.left}}function qe(e,t){return{top:e.top-t.top,right:e.right+t.right,bottom:e.bottom+t.bottom,left:e.left-t.left}}function J(e,t,n){return Math.min(Math.max(e,t),n)}function Je(e,t){let[n,r,i,a]=e,[o,s,c,l]=t;return c<=0||l<=0?[0,0,1,1]:[(n-o)/c,(r-s)/l,i/c,a/l]}function Ye(e,t){let n=J(t.left,e.left,e.right),r=(J(t.right,e.left,e.right)-n)/(t.right-t.left),i=J(t.top,e.top,e.bottom);return r*((J(t.bottom,e.top,e.bottom)-i)/(t.bottom-t.top))}var Xe,Ze=e((()=>{Xe={top:0,right:0,bottom:0,left:0}})),Qe,$e=e((()=>{We(),k(),Ze(),Qe=class{#e;#t;#n;#r;#i=[];#a=[];#o;#s=null;#c=null;#l=new Set;#u=new Set;#d=!1;#f;#p=K(0);#m=null;#h;constructor(e,t,n,r,i,a,o){this.#e=e,this.#t=r,this.#o=a,this.#f=o,this.#n=r.map(()=>new Ue(e,t,n,a,i)),r.length===0?(this.#m=new Ue(e,t,n,a,i),this.#h=this.#m):this.#h=this.#n[0],this.#r=r.map((e,t)=>typeof e.render==`function`?t:-1).filter(e=>e>=0)}get effects(){return this.#t}get hosts(){return this.#n}get renderingIndices(){return this.#r}get stages(){return this.#a}get hitTestPadPhys(){return this.#p}async initAll(){for(let e=0;e<this.#t.length;e++){let t=this.#t[e],n=this.#n[e];n.setPhase(`init`);try{t.init&&await t.init(n.ctx)}catch(t){console.error(`[VFX-JS] effect[${e}].init() failed:`,t);for(let t=e-1;t>=0;t--)this.#g(t),this.#n[t].dispose();throw this.#n[e].dispose(),t}n.setPhase(`update`)}}run(e){if(this.#d||!e.isVisible)return;let t=this.#r.length;for(let t of this.#n)t.setFrameState({time:e.time,deltaTime:e.deltaTime,mouse:e.mouse,mouseViewport:e.mouseViewport,intersection:e.intersection,enterTime:e.enterTime,leaveTime:e.leaveTime,uniforms:e.resolvedUniforms});this.#_(e);for(let t=0;t<this.#n.length;t++)this.#n[t].setFrameDims(this.#x(t,e));for(let e=0;e<this.#t.length;e++){let t=this.#t[e];if(!t.update)continue;let n=this.#n[e];n.setPhase(`update`);try{t.update(n.ctx)}catch(t){this.#l.has(e)||(this.#l.add(e),console.warn(`[VFX-JS] effect[${e}].update() threw; skipping this frame's update:`,t))}}if(t===0){let t=e.finalTarget===null?null:this.#S(e.finalTarget);this.#h.passthroughCopy(this.#o,t,e.elementRectOnCanvasPx);return}for(let n=0;n<t;n++){let r=this.#r[n],i=this.#n[r],a=this.#t[r];if(!a.render)continue;i.setPhase(`render`),i.tickAutoUpdates();let o=n===0?this.#o:this.#i[n-1].texHandle;i.setSrc(o);let s;n===t-1?s=e.finalTarget===null?null:this.#S(e.finalTarget):(s=this.#i[n].rtHandle,i.clearRt(s)),i.setOutput(s);try{a.render(i.ctx)}catch(e){this.#u.has(r)||(this.#u.add(r),console.warn(`[VFX-JS] effect[${r}].render() threw; falling back to passthrough:`,e));let a=this.#a[n].outputViewport;s===null?i.passthroughCopy(o,null,a):n===t-1?i.passthroughCopy(o,s,a):i.passthroughCopy(o,s,{x:0,y:0,w:s.width,h:s.height})}i.setPhase(`update`)}}dispose(){if(!this.#d){this.#d=!0;for(let e=this.#t.length-1;e>=0;e--)this.#g(e),this.#n[e].dispose();this.#m&&=(this.#m.dispose(),null);for(let e of this.#i)e.fb.dispose();this.#i=[],this.#a=[],this.#c&&=(this.#c.dispose(),null)}}#g(e){let t=this.#t[e];if(t.dispose)try{t.dispose()}catch(t){console.error(`[VFX-JS] effect[${e}].dispose() threw:`,t)}}#_(e){let t=this.#r.length;if(this.#a=Array(t),t===0)return;let n=this.#f?e.canvasPhys:e.elementPhys,r=[0,0,n[0],n[1]],i=this.#b(e),a=r;for(let n=0;n<t;n++){let o=this.#r[n],s=this.#t[o],c=n===t-1,l=this.#v(s,a,r,i,e)??a,u=[l[2],l[3]],d=Je(r,l),f=c?{x:e.elementRectOnCanvasPx.x+l[0],y:e.elementRectOnCanvasPx.y+l[1],w:u[0],h:u[1]}:{x:0,y:0,w:u[0],h:u[1]};this.#a[n]={dstRect:l,dstBufferSize:u,rectContent:d,outputViewport:f},c||this.#y(n,u),a=l}let[o,s,c,l]=this.#a[t-1].dstRect;this.#p=K({top:Math.max(0,s+l-n[1]),right:Math.max(0,o+c-n[0]),bottom:Math.max(0,-s),left:Math.max(0,-o)})}#v(e,t,n,r,i){if(!e.outputRect)return;let a=i.canvasPhys[0]/i.canvasLogical[0]||1,o={element:this.#f?i.canvasLogical:i.elementLogical,elementPixel:this.#f?i.canvasPhys:i.elementPhys,canvas:i.canvasLogical,canvasPixel:i.canvasPhys,pixelRatio:a,contentRect:n,srcRect:t,canvasRect:r};return e.outputRect(o)}#y(e,t){let n=this.#i[e];if(n&&n.fb.width===t[0]&&n.fb.height===t[1])return;n&&n.fb.dispose();let r=new O(this.#e,t[0],t[1]),i=Re(r),a=U(()=>r.texture,()=>r.width,()=>r.height);this.#i[e]={fb:r,rtHandle:i,texHandle:a,bufferSize:t}}#b(e){let[t,n]=e.canvasPhys;if(this.#f)return[0,0,t,n];let{x:r,y:i}=e.elementRectOnCanvasPx;return[-r,-i,t,n]}#x(e,t){let n=this.#r.indexOf(e),r,i,a,o,s;if(n<0)r=t.elementPhys[0],i=t.elementPhys[1],a={x:0,y:0,w:r,h:i},o=[0,0,1,1],s=[0,0,1,1];else{let e=this.#a[n];r=e.dstBufferSize[0],i=e.dstBufferSize[1],a=e.outputViewport,o=e.rectContent,s=n===0?[0,0,1,1]:this.#a[n-1].rectContent}return{outputPhysW:r,outputPhysH:i,canvasPhys:t.canvasPhys,outputViewport:a,elementPhysW:t.elementPhys[0],elementPhysH:t.elementPhys[1],rectContent:o,rectSrc:s}}#S(e){return(this.#c!==e||this.#s===null)&&(this.#c=e,this.#s=Re(e)),this.#s}}}));function Y(e){this.data=e,this.pos=0}var et=e((()=>{Y.prototype.readByte=function(){return this.data[this.pos++]},Y.prototype.peekByte=function(){return this.data[this.pos]},Y.prototype.readBytes=function(e){return this.data.subarray(this.pos,this.pos+=e)},Y.prototype.peekBytes=function(e){return this.data.subarray(this.pos,this.pos+e)},Y.prototype.readString=function(e){for(var t=``,n=0;n<e;n++)t+=String.fromCharCode(this.readByte());return t},Y.prototype.readBitArray=function(){for(var e=[],t=this.readByte(),n=7;n>=0;n--)e.push(!!(t&1<<n));return e},Y.prototype.readUnsigned=function(e){var t=this.readBytes(2);return e?(t[1]<<8)+t[0]:(t[0]<<8)+t[1]}}));function X(e){this.stream=new Y(e),this.output={}}function tt(e){return e.reduce(function(e,t){return e*2+t},0)}var nt=e((()=>{et(),X.prototype.parse=function(e){return this.parseParts(this.output,e),this.output},X.prototype.parseParts=function(e,t){for(var n=0;n<t.length;n++){var r=t[n];this.parsePart(e,r)}},X.prototype.parsePart=function(e,t){var n=t.label,r;if(!(t.requires&&!t.requires(this.stream,this.output,e)))if(t.loop){for(var i=[];t.loop(this.stream);){var a={};this.parseParts(a,t.parts),i.push(a)}e[n]=i}else t.parts?(r={},this.parseParts(r,t.parts),e[n]=r):t.parser?(r=t.parser(this.stream,this.output,e),t.skip||(e[n]=r)):t.bits&&(e[n]=this.parseBits(t.bits))},X.prototype.parseBits=function(e){var t={},n=this.stream.readBitArray();for(var r in e){var i=e[r];i.length?t[r]=tt(n.slice(i.index,i.index+i.length)):t[r]=n[i.index]}return t}})),Z,rt=e((()=>{Z={readByte:function(){return function(e){return e.readByte()}},readBytes:function(e){return function(t){return t.readBytes(e)}},readString:function(e){return function(t){return t.readString(e)}},readUnsigned:function(e){return function(t){return t.readUnsigned(e)}},readArray:function(e,t){return function(n,r,i){for(var a=t(n,r,i),o=Array(a),s=0;s<a;s++)o[s]=n.readBytes(e);return o}}}})),Q,it,at,ot,st,ct,lt=e((()=>{rt(),Q={label:`blocks`,parser:function(e){for(var t=[],n=0,r=0,i=e.readByte();i!==r;i=e.readByte())t.push(e.readBytes(i)),n+=i;var a=new Uint8Array(n);n=0;for(var o=0;o<t.length;o++)a.set(t[o],n),n+=t[o].length;return a}},it={label:`gce`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===249},parts:[{label:`codes`,parser:Z.readBytes(2),skip:!0},{label:`byteSize`,parser:Z.readByte()},{label:`extras`,bits:{future:{index:0,length:3},disposal:{index:3,length:3},userInput:{index:6},transparentColorGiven:{index:7}}},{label:`delay`,parser:Z.readUnsigned(!0)},{label:`transparentColorIndex`,parser:Z.readByte()},{label:`terminator`,parser:Z.readByte(),skip:!0}]},at={label:`image`,requires:function(e){return e.peekByte()===44},parts:[{label:`code`,parser:Z.readByte(),skip:!0},{label:`descriptor`,parts:[{label:`left`,parser:Z.readUnsigned(!0)},{label:`top`,parser:Z.readUnsigned(!0)},{label:`width`,parser:Z.readUnsigned(!0)},{label:`height`,parser:Z.readUnsigned(!0)},{label:`lct`,bits:{exists:{index:0},interlaced:{index:1},sort:{index:2},future:{index:3,length:2},size:{index:5,length:3}}}]},{label:`lct`,requires:function(e,t,n){return n.descriptor.lct.exists},parser:Z.readArray(3,function(e,t,n){return 2**(n.descriptor.lct.size+1)})},{label:`data`,parts:[{label:`minCodeSize`,parser:Z.readByte()},Q]}]},ot={label:`text`,requires:function(e){var t=e.peekBytes(2);return t[0]===33&&t[1]===1},parts:[{label:`codes`,parser:Z.readBytes(2),skip:!0},{label:`blockSize`,parser:Z.readByte()},{label:`preData`,parser:function(e,t,n){return e.readBytes(n.text.blockSize)}},Q]},st={label:`frames`,parts:[it,{label:`application`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===255},parts:[{label:`codes`,parser:Z.readBytes(2),skip:!0},{label:`blockSize`,parser:Z.readByte()},{label:`id`,parser:function(e,t,n){return e.readString(n.blockSize)}},Q]},{label:`comment`,requires:function(e,t,n){var r=e.peekBytes(2);return r[0]===33&&r[1]===254},parts:[{label:`codes`,parser:Z.readBytes(2),skip:!0},Q]},at,ot],loop:function(e){var t=e.peekByte();return t===33||t===44}},ct=[{label:`header`,parts:[{label:`signature`,parser:Z.readString(3)},{label:`version`,parser:Z.readString(3)}]},{label:`lsd`,parts:[{label:`width`,parser:Z.readUnsigned(!0)},{label:`height`,parser:Z.readUnsigned(!0)},{label:`gct`,bits:{exists:{index:0},resolution:{index:1,length:3},sort:{index:4},size:{index:5,length:3}}},{label:`backgroundColorIndex`,parser:Z.readByte()},{label:`pixelAspectRatio`,parser:Z.readByte()}]},{label:`gct`,requires:function(e,t){return t.lsd.gct.exists},parser:Z.readArray(3,function(e,t){return 2**(t.lsd.gct.size+1)})},st]}));function ut(e){this.raw=new X(new Uint8Array(e)).parse(ct),this.raw.hasImages=!1;for(var t=0;t<this.raw.frames.length;t++)if(this.raw.frames[t].image){this.raw.hasImages=!0;break}}var dt=e((()=>{nt(),lt(),ut.prototype.decompressFrame=function(e,t){if(e>=this.raw.frames.length)return null;var n=this.raw.frames[e];if(n.image){var r=n.image.descriptor.width*n.image.descriptor.height,i=o(n.image.data.minCodeSize,n.image.data.blocks,r);n.image.descriptor.lct.interlaced&&(i=s(i,n.image.descriptor.width));var a={pixels:i,dims:{top:n.image.descriptor.top,left:n.image.descriptor.left,width:n.image.descriptor.width,height:n.image.descriptor.height}};return n.image.descriptor.lct&&n.image.descriptor.lct.exists?a.colorTable=n.image.lct:a.colorTable=this.raw.gct,n.gce&&(a.delay=(n.gce.delay||10)*10,a.disposalType=n.gce.extras.disposal,n.gce.extras.transparentColorGiven&&(a.transparentIndex=n.gce.transparentColorIndex)),t&&(a.patch=c(a)),a}return null;function o(e,t,n){var r=4096,i=-1,a=n,o,s,c,l,u,d,f,p,m,h,g,_,v,y,b,x,S=Array(n),C=Array(r),w=Array(r),T=Array(r+1);for(_=e,s=1<<_,u=s+1,o=s+2,f=i,l=_+1,c=(1<<l)-1,m=0;m<s;m++)C[m]=0,w[m]=m;for(g=p=v=y=x=b=0,h=0;h<a;){if(y===0){if(p<l){g+=t[b]<<p,p+=8,b++;continue}if(m=g&c,g>>=l,p-=l,m>o||m==u)break;if(m==s){l=_+1,c=(1<<l)-1,o=s+2,f=i;continue}if(f==i){T[y++]=w[m],f=m,v=m;continue}for(d=m,m==o&&(T[y++]=v,m=f);m>s;)T[y++]=w[m],m=C[m];v=w[m]&255,T[y++]=v,o<r&&(C[o]=f,w[o]=v,o++,(o&c)===0&&o<r&&(l++,c+=o)),f=d}y--,S[x++]=T[y],h++}for(h=x;h<a;h++)S[h]=0;return S}function s(e,t){for(var n=Array(e.length),r=e.length/t,i=function(r,i){var a=e.slice(i*t,(i+1)*t);n.splice.apply(n,[r*t,t].concat(a))},a=[0,4,2,1],o=[8,8,4,2],s=0,c=0;c<4;c++)for(var l=a[c];l<r;l+=o[c])i(l,s),s++;return n}function c(e){for(var t=e.pixels.length,n=new Uint8ClampedArray(t*4),r=0;r<t;r++){var i=r*4,a=e.pixels[r],o=e.colorTable[a];n[i]=o[0],n[i+1]=o[1],n[i+2]=o[2],n[i+3]=a===e.transparentIndex?0:255}return n}},ut.prototype.decompressFrames=function(e,t,n){t===void 0&&(t=0),n=n===void 0?this.raw.frames.length:Math.min(n,this.raw.frames.length);for(var r=[],i=t;i<n;i++)this.raw.frames[i].image&&r.push(this.decompressFrame(i,e));return r}})),ft,pt=e((()=>{dt(),ft=ut})),mt,ht=e((()=>{pt(),mt=class e{static async create(t,n){let r=await fetch(t).then(e=>e.arrayBuffer()).then(e=>new ft(e)),i=r.decompressFrames(!0,void 0,void 0),{width:a,height:o}=r.raw.lsd;return new e(i,a,o,n)}constructor(e,t,n,r){this.frames=[],this.index=0,this.playTime=0,this.frames=e,this.canvas=document.createElement(`canvas`),this.ctx=this.canvas.getContext(`2d`),this.pixelRatio=r,this.canvas.width=t,this.canvas.height=n,this.startTime=Date.now()}getCanvas(){return this.canvas}update(){let e=Date.now()-this.startTime;for(;this.playTime<e;){let e=this.frames[this.index%this.frames.length];this.playTime+=e.delay,this.index++}let t=this.frames[this.index%this.frames.length],n=new ImageData(t.patch,t.dims.width,t.dims.height);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height),this.ctx.putImageData(n,t.dims.left,t.dims.top)}}})),gt,_t=e((()=>{gt=class{#e=new Set;#t=new Set;#n=new Set;constructor(e){this.isContextLost=!1;let t=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!1});if(!t)throw Error(`[VFX-JS] WebGL2 is not available.`);this.gl=t,this.canvas=e,t.getExtension(`EXT_color_buffer_float`),t.getExtension(`EXT_color_buffer_half_float`),this.floatLinearFilter=!!t.getExtension(`OES_texture_float_linear`),this.maxTextureSize=t.getParameter(t.MAX_TEXTURE_SIZE),e.addEventListener(`webglcontextlost`,this.#r,!1),e.addEventListener(`webglcontextrestored`,this.#i,!1)}setSize(e,t,n){let r=Math.floor(e*n),i=Math.floor(t*n);(this.canvas.width!==r||this.canvas.height!==i)&&(this.canvas.width=r,this.canvas.height=i)}addResource(e){this.#e.add(e)}removeResource(e){this.#e.delete(e)}onContextLost(e){return this.#t.add(e),()=>this.#t.delete(e)}onContextRestored(e){return this.#n.add(e),()=>this.#n.delete(e)}#r=e=>{e.preventDefault(),this.isContextLost=!0;for(let e of this.#t)e()};#i=()=>{this.isContextLost=!1;let e=this.gl;e.getExtension(`EXT_color_buffer_float`),e.getExtension(`EXT_color_buffer_half_float`);for(let e of this.#e)e.restore();for(let e of this.#n)e()}}})),vt,yt=e((()=>{vt=class{#e;#t;constructor(e){this.#e=e,this.gl=e.gl,this.#n(),e.addResource(this)}#n(){let e=this.gl,t=e.createVertexArray(),n=e.createBuffer();if(!t||!n)throw Error(`[VFX-JS] Failed to create quad VAO`);this.vao=t,this.#t=n;let r=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,-1,1,0,1,-1,0,1,1,0]);e.bindVertexArray(t),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,0,0),e.bindVertexArray(null),e.bindBuffer(e.ARRAY_BUFFER,null)}restore(){this.#n()}draw(){let e=this.gl;e.bindVertexArray(this.vao),e.drawArrays(e.TRIANGLES,0,6)}dispose(){this.#e.removeResource(this),this.gl.deleteVertexArray(this.vao),this.gl.deleteBuffer(this.#t)}}}));function bt(e,t,n,r={}){return new O(e,t,n,{float:r.float??!1})}function xt(e,r){let i=r.renderingToBuffer??!1,a;a=i?`none`:r.premultipliedAlpha?`premultiplied`:`normal`;let o=r.glslVersion??ue(r.fragmentShader);return new R(e,r.vertexShader??(o===`100`?n:t),r.fragmentShader,r.uniforms,a,o)}var St=e((()=>{s(),k(),z(),L()})),Ct,wt=e((()=>{le(),P(),St(),Ct=class{#e;#t;#n;#r;#i;#a;constructor(e,t,n,r,i,a,o,s){if(this.#r=r??!1,this.#i=i??!1,this.#a=a,this.#t={},this.#e={src:{value:null},offset:{value:new M},resolution:{value:new M},viewport:{value:new N},time:{value:0},mouse:{value:new M},passIndex:{value:0}},n)for(let[e,t]of Object.entries(n))typeof t==`function`?(this.#t[e]=t,this.#e[e]={value:t()}):this.#e[e]={value:t};this.pass=xt(e,{fragmentShader:t,uniforms:this.#e,renderingToBuffer:o??!1,premultipliedAlpha:!0,glslVersion:s})}get uniforms(){return this.#e}setUniforms(e,t,n,r,i,a){this.#e.src.value=e,this.#e.resolution.value.set(n.w*t,n.h*t),this.#e.offset.value.set(n.x*t,n.y*t),this.#e.time.value=r,this.#e.mouse.value.set(i*t,a*t)}updateCustomUniforms(e){for(let[e,t]of Object.entries(this.#t))this.#e[e]&&(this.#e[e].value=t());if(e)for(let[t,n]of Object.entries(e))this.#e[t]&&(this.#e[t].value=n())}initializeBackbuffer(e,t,n,r){this.#r&&!this.#n&&(this.#a?this.#n=new j(e,this.#a[0],this.#a[1],1,this.#i):this.#n=new j(e,t,n,r,this.#i))}resizeBackbuffer(e,t){this.#n&&!this.#a&&this.#n.resize(e,t)}registerBufferUniform(e){this.#e[e]||(this.#e[e]={value:null})}get backbuffer(){return this.#n}get persistent(){return this.#r}get float(){return this.#i}get size(){return this.#a}getTargetDimensions(){return this.#a}dispose(){this.pass.dispose(),this.#n?.dispose()}}}));function Tt(e,t){return t.left<=e.right&&t.right>=e.left&&t.top<=e.bottom&&t.bottom>=e.top}function Et(e,t,n,r){return r===0?Tt(e,t):n>=r}function Dt(e){return e===!0?[!0,Xe]:e===void 0?[!1,Xe]:[!1,K(e)]}function Ot(e){return{threshold:e?.threshold??0,rootMargin:K(e?.rootMargin??0)}}function kt(e,t){let n=e.source;if(!n)return 0;if(typeof HTMLImageElement<`u`&&n instanceof HTMLImageElement)return t===`w`?n.naturalWidth:n.naturalHeight;if(typeof HTMLVideoElement<`u`&&n instanceof HTMLVideoElement)return t===`w`?n.videoWidth:n.videoHeight;let r=n;return t===`w`?r.width:r.height}function At(e){return e===`repeat`?`repeat`:e===`mirror`?`mirror`:`clamp`}function jt(e){if(!e)return[`clamp`,`clamp`];if(Array.isArray(e))return[At(e[0]),At(e[1])];let t=At(e);return[t,t]}function Mt(e,t,n){return Math.max(t,Math.min(n,e))}var $,Nt,Pt=e((()=>{le(),s(),ve(),we(),$e(),We(),ht(),_t(),z(),yt(),D(),P(),ce(),wt(),Ze(),St(),$=new Map,Nt=class{#e;#t;#n;#r;#i;#a;#o=[];#s=[];#c;#l=[];#u=new Map;#d=null;#f=!1;#p=new WeakSet;#m={};#h={};#g=0;#_=void 0;#v=2;#y=[];#b=Date.now()/1e3;#x=q(0);#S=q(0);#C=[0,0];#w=0;#T=0;#E=0;#D=0;#O=new WeakMap;constructor(e,t){this.#e=e,this.#t=t,this.#n=new gt(t),this.#r=this.#n.gl,this.#r.clearColor(0,0,0,0),this.#v=e.pixelRatio,this.#i=new vt(this.#n),typeof window<`u`&&(window.addEventListener(`resize`,this.#A),window.addEventListener(`pointermove`,this.#j)),this.#A(),this.#a=new _e(this.#n),this.#G(e.postEffects),this.#n.onContextRestored(()=>{this.#r.clearColor(0,0,0,0)})}destroy(){this.stop(),typeof window<`u`&&(window.removeEventListener(`resize`,this.#A),window.removeEventListener(`pointermove`,this.#j)),this.#c?.dispose();for(let e of this.#u.values())e?.dispose();for(let e of this.#o)e.dispose();this.#d&&(this.#d.dispose(),this.#d=null,this.#f=!1),this.#a.dispose(),this.#i.dispose()}#k(){if(typeof window>`u`)return;let e=this.#t.ownerDocument,t=e.compatMode===`BackCompat`?e.body:e.documentElement,n=t.clientWidth,r=t.clientHeight,i=window.scrollX,a=window.scrollY,o,s;if(this.#e.fixedCanvas)o=0,s=0;else if(this.#e.wrapper)o=n*this.#e.scrollPadding[0],s=r*this.#e.scrollPadding[1];else{let t=e.body.scrollWidth-(i+n),c=e.body.scrollHeight-(a+r);o=Mt(n*this.#e.scrollPadding[0],0,t),s=Mt(r*this.#e.scrollPadding[1],0,c)}let c=n+o*2,l=r+s*2;(c!==this.#C[0]||l!==this.#C[1])&&(this.#t.style.width=`${c}px`,this.#t.style.height=`${l}px`,this.#n.setSize(c,l,this.#v),this.#x=q({top:-s,left:-o,right:n+o,bottom:r+s}),this.#S=q({top:0,left:0,right:n,bottom:r}),this.#C=[c,l],this.#w=o,this.#T=s),this.#e.fixedCanvas||this.#t.style.setProperty(`transform`,`translate(${i-o}px, ${a-s}px)`)}#A=async()=>{if(typeof window<`u`){for(let e of this.#y)if(e.type===`text`&&e.isInViewport){let t=e.element.getBoundingClientRect();(t.width!==e.width||t.height!==e.height)&&(await this.#M(e),e.width=t.width,e.height=t.height)}for(let e of this.#y)if(e.type===`text`&&!e.isInViewport){let t=e.element.getBoundingClientRect();(t.width!==e.width||t.height!==e.height)&&(await this.#M(e),e.width=t.width,e.height=t.height)}}};#j=e=>{typeof window<`u`&&(this.#E=e.clientX,this.#D=window.innerHeight-e.clientY)};async#M(e){if(!this.#O.get(e.element)){this.#O.set(e.element,!0);try{let t=e.srcTexture,n=t.source instanceof OffscreenCanvas?t.source:void 0,r=await B(e.element,e.originalOpacity,n,this.maxTextureSize);if(r.width===0||r.width===0)throw`omg`;let i=new E(this.#n,r);i.wrapS=t.wrapS,i.wrapT=t.wrapT,i.needsUpdate=!0,!e.chain&&e.passes.length>0&&(e.passes[0].uniforms.src.value=i),e.srcTexture=i,t.dispose()}catch(e){console.error(e)}this.#O.set(e.element,!1)}}async addElement(e,t={},n){if(t.effect!==void 0)return this.#N(e,t,t.effect,n);let r=this.#P(t),i=e.getBoundingClientRect(),a=Ke(i),[o,s]=Dt(t.overflow),c=qe(a,s),l=Ot(t.intersection),u=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),d,f,p=!1;if(e instanceof HTMLImageElement)if(f=`img`,p=!!e.src.match(/\.gif/i),p){let t=await mt.create(e.src,this.#v);$.set(e,t),d=new E(this.#n,t.getCanvas())}else{let t=await ae(e.src);d=new E(this.#n,t)}else if(e instanceof HTMLVideoElement)d=new E(this.#n,e),f=`video`;else if(e instanceof HTMLCanvasElement)e.hasAttribute(`layoutsubtree`)&&n?(d=new E(this.#n,n),f=`hic`):(d=new E(this.#n,e),f=`canvas`);else{let t=await B(e,u,void 0,this.maxTextureSize);d=new E(this.#n,t),f=`text`}let[m,h]=jt(t.wrap);d.wrapS=m,d.wrapT=h,d.needsUpdate=!0;let g=t.autoCrop??!0;if(f!==`hic`&&t.overlay!==!0)if(typeof t.overlay==`number`)e.style.setProperty(`opacity`,t.overlay.toString());else{let t=f===`video`?`0.0001`:`0`;e.style.setProperty(`opacity`,t.toString())}let _={src:{value:d},resolution:{value:new M},offset:{value:new M},time:{value:0},enterTime:{value:-1},leaveTime:{value:-1},mouse:{value:new M},intersection:{value:0},viewport:{value:new N},autoCrop:{value:g}},v={};if(t.uniforms!==void 0)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(_[e]={value:n()},v[e]=n):_[e]={value:n};let y;t.backbuffer&&(y=(()=>{let e=(c.right-c.left)*this.#v,t=(c.bottom-c.top)*this.#v;return new j(this.#n,e,t,this.#v,!1)})(),_.backbuffer={value:y.texture});let b=new Map,x=new Map;for(let e=0;e<r.length-1;e++){let t=r[e].target??`pass${e}`;r[e]={...r[e],target:t};let n=r[e].size,i=n?n[0]:(c.right-c.left)*this.#v,a=n?n[1]:(c.bottom-c.top)*this.#v;if(r[e].persistent){let i=n?1:this.#v,a=n?n[0]:c.right-c.left,o=n?n[1]:c.bottom-c.top;x.set(t,new j(this.#n,a,o,i,r[e].float))}else b.set(t,bt(this.#n,i,a,{float:r[e].float}))}let S=[];for(let e=0;e<r.length;e++){let t=r[e],n=t.frag,i={..._},a={};for(let[e,r]of b)e!==t.target&&n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:r.texture});for(let[e,t]of x)n.match(RegExp(`uniform\\s+sampler2D\\s+${e}\\b`))&&(i[e]={value:t.texture});if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(i[e]={value:n()},a[e]=n):i[e]={value:n};let o=xt(this.#n,{vertexShader:t.vert,fragmentShader:n,uniforms:i,renderingToBuffer:t.target!==void 0,glslVersion:t.glslVersion});S.push({pass:o,uniforms:i,uniformGenerators:{...v,...a},target:t.target,persistent:t.persistent,float:t.float,size:t.size,backbuffer:t.target?x.get(t.target):void 0})}let C=Date.now()/1e3,w={type:f,element:e,isInViewport:!1,isInLogicalViewport:!1,width:i.width,height:i.height,passes:S,bufferTargets:b,startTime:C,enterTime:C,leaveTime:-1/0,release:t.release??1/0,isGif:p,isFullScreen:o,overflow:s,intersection:l,originalOpacity:u,srcTexture:d,zIndex:t.zIndex??0,backbuffer:y,autoCrop:g};this.#V(w,a,C),this.#y.push(w),this.#y.sort((e,t)=>e.zIndex-t.zIndex)}async#N(e,t,n,r){t.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified; `effect` takes precedence."),t.overflow!==void 0&&console.warn("[VFX-JS] `overflow` is shader-path only and is ignored by the effect path. Use each effect's own `outputRect` (with `dims.canvasRect` for fullscreen) to control its dst rect.");let i=Array.isArray(n)?[...n]:[n];this.#R(i);let a=e.getBoundingClientRect(),o=Ke(a),[s,c]=Dt(t.overflow),l=Ot(t.intersection),u=e.style.opacity===``?1:Number.parseFloat(e.style.opacity),d,f,p=!1;if(e instanceof HTMLImageElement)if(f=`img`,p=!!e.src.match(/\.gif/i),p){let t=await mt.create(e.src,this.#v);$.set(e,t),d=new E(this.#n,t.getCanvas())}else{let t=await ae(e.src);d=new E(this.#n,t)}else if(e instanceof HTMLVideoElement)d=new E(this.#n,e),f=`video`;else if(e instanceof HTMLCanvasElement)e.hasAttribute(`layoutsubtree`)&&r?(d=new E(this.#n,r),f=`hic`):(d=new E(this.#n,e),f=`canvas`);else{let t=await B(e,u,void 0,this.maxTextureSize);d=new E(this.#n,t),f=`text`}let[m,h]=jt(t.wrap);d.wrapS=m,d.wrapT=h,d.needsUpdate=!0;let g=t.autoCrop??!0;if(f!==`hic`&&t.overlay!==!0)if(typeof t.overlay==`number`)e.style.setProperty(`opacity`,t.overlay.toString());else{let t=f===`video`?`0.0001`:`0`;e.style.setProperty(`opacity`,t.toString())}let _=Date.now()/1e3,v={type:f,element:e,isInViewport:!1,isInLogicalViewport:!1,width:a.width,height:a.height,passes:[],bufferTargets:new Map,startTime:_,enterTime:_,leaveTime:-1/0,release:t.release??1/0,isGif:p,isFullScreen:s,overflow:c,intersection:l,originalOpacity:u,srcTexture:d,zIndex:t.zIndex??0,backbuffer:void 0,autoCrop:g,effectLastRenderTime:_},y=U(()=>v.srcTexture,()=>kt(v.srcTexture,`w`),()=>kt(v.srcTexture,`h`)),b={},x={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`?(x[e]=n,b[e]=n()):b[e]=n;v.effectUniformGenerators=x,v.effectStaticUniforms=b;let S={autoCrop:g,glslVersion:t.glslVersion??`300 es`},C=new Qe(this.#n,this.#i,this.#v,i,S,y,!1);try{await C.initAll()}catch(t){throw this.#z(i),d.dispose(),e.style.setProperty(`opacity`,u.toString()),t}v.chain=C,this.#V(v,o,_),this.#y.push(v),this.#y.sort((e,t)=>e.zIndex-t.zIndex)}#P(e){let t=t=>t.glslVersion===void 0&&e.glslVersion!==void 0?{...t,glslVersion:e.glslVersion}:t;return Array.isArray(e.shader)?e.shader.map(t):[t({frag:this.#H(e.shader||`uvGradient`)})]}removeElement(e){let t=this.#y.findIndex(t=>t.element===e);if(t!==-1){let n=this.#y.splice(t,1)[0];if(n.chain)this.#z(n.chain.effects),n.chain.dispose();else{for(let e of n.bufferTargets.values())e.dispose();for(let e of n.passes)e.pass.dispose(),e.backbuffer?.dispose();n.backbuffer?.dispose()}n.srcTexture.dispose(),e.style.setProperty(`opacity`,n.originalOpacity.toString())}}updateTextElement(e){let t=this.#y.findIndex(t=>t.element===e);return t===-1?Promise.resolve():this.#M(this.#y[t])}updateCanvasElement(e){let t=this.#y.find(t=>t.element===e);if(t){let n=t.srcTexture,r=new E(this.#n,e);r.wrapS=n.wrapS,r.wrapT=n.wrapT,r.needsUpdate=!0,!t.chain&&t.passes.length>0&&(t.passes[0].uniforms.src.value=r),t.srcTexture=r,n.dispose()}}updateHICTexture(e,t){let n=this.#y.find(t=>t.element===e);if(!n||n.type!==`hic`)return;let r=n.srcTexture;if(r.source===t)r.needsUpdate=!0;else{let e=new E(this.#n,t);e.wrapS=r.wrapS,e.wrapT=r.wrapT,e.needsUpdate=!0,!n.chain&&n.passes.length>0&&(n.passes[0].uniforms.src.value=e),n.srcTexture=e,r.dispose()}}get maxTextureSize(){return this.#n.maxTextureSize}isPlaying(){return this.#_!==void 0}play(){this.isPlaying()||(this.#_=requestAnimationFrame(this.#F))}stop(){this.#_!==void 0&&(cancelAnimationFrame(this.#_),this.#_=void 0)}render(){let e=Date.now()/1e3,t=this.#r;this.#k(),t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,this.#t.width,this.#t.height),t.clear(t.COLOR_BUFFER_BIT);let n=this.#x.right-this.#x.left,r=this.#x.bottom-this.#x.top,i=A(0,0,n,r),a=this.#L();a&&(this.#Y(n,r),this.#c&&(t.bindFramebuffer(t.FRAMEBUFFER,this.#c.fbo),t.clear(t.COLOR_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null)));for(let t of this.#y){let o=t.element.getBoundingClientRect(),s=Ke(o),c=this.#V(t,s,e);if(!c.isVisible)continue;if(t.chain){this.#I(t,s,c,e);continue}let l=t.passes[0].uniforms;l.time.value=e-t.startTime,l.resolution.value.set(o.width*this.#v,o.height*this.#v),l.mouse.value.set((this.#E+this.#w)*this.#v,(this.#D+this.#T)*this.#v);for(let e of t.passes)for(let[t,n]of Object.entries(e.uniformGenerators))e.uniforms[t].value=n();$.get(t.element)?.update(),(t.type===`video`||t.isGif)&&(l.src.value.needsUpdate=!0);let u=se(s,r,this.#w,this.#T),d=se(c.rectWithOverflow,r,this.#w,this.#T);t.backbuffer&&(t.passes[0].uniforms.backbuffer.value=t.backbuffer.texture);{let e=t.isFullScreen?i:d,n=Math.max(1,e.w*this.#v),r=Math.max(1,e.h*this.#v),a=Math.max(1,e.w),o=Math.max(1,e.h);for(let e=0;e<t.passes.length-1;e++){let i=t.passes[e];if(!i.size)if(i.backbuffer)i.backbuffer.resize(a,o);else{let e=t.bufferTargets.get(i.target);e&&(e.width!==n||e.height!==r)&&e.setSize(n,r)}}}let f=new Map;for(let e of t.passes)e.backbuffer&&e.target&&f.set(e.target,e.backbuffer.texture);let p=t.srcTexture,m=this.#E+this.#w-u.x,h=this.#D+this.#T-u.y;for(let e=0;e<t.passes.length-1;e++){let n=t.passes[e],r=t.isFullScreen?i:d;n.uniforms.src.value=p;for(let[e,t]of f)n.uniforms[e]&&(n.uniforms[e].value=t);for(let[e,t]of Object.entries(n.uniformGenerators))n.uniforms[e]&&(n.uniforms[e].value=t());let a=n.size?n.size[0]:r.w*this.#v,o=n.size?n.size[1]:r.h*this.#v,s=n.size?A(0,0,n.size[0],n.size[1]):A(0,0,r.w,r.h);if(n.uniforms.resolution.value.set(a,o),n.uniforms.offset.value.set(0,0),n.uniforms.mouse.value.set(m/r.w*a,h/r.h*o),n.backbuffer)this.#U(n.pass,n.backbuffer.target,s,n.uniforms,!0),n.backbuffer.swap(),p=n.backbuffer.texture;else{let e=t.bufferTargets.get(n.target);if(!e)continue;this.#U(n.pass,e,s,n.uniforms,!0),p=e.texture}n.target&&f.set(n.target,p)}let g=t.passes[t.passes.length-1];g.uniforms.src.value=p,g.uniforms.resolution.value.set(o.width*this.#v,o.height*this.#v),g.uniforms.offset.value.set(u.x*this.#v,u.y*this.#v),g.uniforms.mouse.value.set((this.#E+this.#w)*this.#v,(this.#D+this.#T)*this.#v);for(let[e,t]of f)g.uniforms[e]&&(g.uniforms[e].value=t);for(let[e,t]of Object.entries(g.uniformGenerators))g.uniforms[e]&&(g.uniforms[e].value=t());t.backbuffer?(g.uniforms.backbuffer.value=t.backbuffer.texture,t.isFullScreen?(t.backbuffer.resize(n,r),this.#W(t,u.x,u.y),this.#U(g.pass,t.backbuffer.target,i,g.uniforms,!0),t.backbuffer.swap(),this.#a.setUniforms(t.backbuffer.texture,this.#v,i),this.#U(this.#a.pass,a&&this.#c||null,i,this.#a.uniforms,!1)):(t.backbuffer.resize(d.w,d.h),this.#W(t,t.overflow.left,t.overflow.bottom),this.#U(g.pass,t.backbuffer.target,t.backbuffer.getViewport(),g.uniforms,!0),t.backbuffer.swap(),this.#a.setUniforms(t.backbuffer.texture,this.#v,d),this.#U(this.#a.pass,a&&this.#c||null,d,this.#a.uniforms,!1))):(this.#W(t,u.x,u.y),this.#U(g.pass,a&&this.#c||null,t.isFullScreen?i:d,g.uniforms,!1))}a&&this.#c&&(this.#d&&this.#f?this.#q(i,e):this.#J(i,e))}#F=()=>{this.isPlaying()&&(this.render(),this.#_=requestAnimationFrame(this.#F))};#I(e,t,n,r){let i=e.chain;if(!i)return;let a=this.#v;$.get(e.element)?.update(),(e.type===`video`||e.isGif)&&(e.srcTexture.needsUpdate=!0);let o={...e.effectStaticUniforms??{}};if(e.effectUniformGenerators)for(let[t,n]of Object.entries(e.effectUniformGenerators))o[t]=n();let s=this.#x.right-this.#x.left,c=this.#x.bottom-this.#x.top,l=se(t,c,this.#w,this.#T),u=this.#E+this.#w-l.x,d=this.#D+this.#T-l.y,f=t.right-t.left,p=t.bottom-t.top,m=r-(e.effectLastRenderTime??r);e.effectLastRenderTime=r;let h=this.#L()&&this.#c?this.#c:null;i.run({time:r-e.startTime,deltaTime:m,mouse:[u*a,d*a],mouseViewport:[this.#E*a,this.#D*a],intersection:n.intersection,enterTime:r-e.enterTime,leaveTime:r-e.leaveTime,resolvedUniforms:o,canvasLogical:[s,c],canvasPhys:[s*a,c*a],elementLogical:[f,p],elementPhys:[f*a,p*a],elementRectOnCanvasPx:{x:l.x*a,y:l.y*a,w:l.w*a,h:l.h*a},finalTarget:h,isVisible:n.isVisible})}#L(){return this.#o.length>0||this.#d!==null&&this.#f}#R(e){for(let t of e)if(this.#p.has(t))throw Error("[VFX-JS] Effect instance already attached. Construct a new instance per `vfx.add()` / `postEffect`.");for(let t of e)this.#p.add(t)}#z(e){for(let t of e)this.#p.delete(t)}#B(e){let t=e.hitTestPadPhys,n=this.#v;return K({top:t.top/n,right:t.right/n,bottom:t.bottom/n,left:t.left/n})}#V(e,t,n){let r=qe(t,e.chain?this.#B(e.chain):e.overflow),i=e.isFullScreen||Tt(this.#S,r),a=qe(this.#S,e.intersection.rootMargin),o=Ye(a,t),s=e.isFullScreen||Et(a,t,o,e.intersection.threshold);!e.isInLogicalViewport&&s&&(e.enterTime=n,e.leaveTime=1/0),e.isInLogicalViewport&&!s&&(e.leaveTime=n),e.isInViewport=i,e.isInLogicalViewport=s;let c=i&&n-e.leaveTime<=e.release;if(c&&!e.chain&&e.passes.length>0){let t=e.passes[0].uniforms;t.intersection.value=o,t.enterTime.value=n-e.enterTime,t.leaveTime.value=n-e.leaveTime}return{isVisible:c,intersection:o,rectWithOverflow:r}}#H(e){return e in o?o[e]:e}#U(e,t,n,r,i){let a=this.#r;i&&t!==null&&t!==this.#c&&(a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.viewport(0,0,t.width,t.height),a.clear(a.COLOR_BUFFER_BIT));let o=r.viewport;o&&o.value instanceof N&&o.value.set(n.x*this.#v,n.y*this.#v,n.w*this.#v,n.h*this.#v);try{he(a,this.#i,e,t,n,this.#C[0],this.#C[1],this.#v)}catch(e){console.error(e)}}#W(e,t,n){let r=e.passes[0].uniforms.offset.value;r.x=t*this.#v,r.y=n*this.#v}#G(e){let t=e.length===1&&!(`frag`in e[0])?e[0]:null;if(t&&t.effect!==void 0){this.#K(t,t.effect);return}let n=[],r=[],i=[];for(let t of e)`frag`in t&&i.push(t);for(let e=0;e<i.length-1;e++)i[e].target||(i[e]={...i[e],target:`pass${e}`});for(let t of e){let e,i;if(`frag`in t)e=t.frag,i=new Ct(this.#n,e,t.uniforms,t.persistent??!1,t.float??!1,t.size,t.target!==void 0,t.glslVersion),r.push(t.target);else{if(t.shader===void 0)throw Error("VFXPostEffect requires `shader` (the `effect` path is not implemented yet).");e=this.#H(t.shader),i=new Ct(this.#n,e,t.uniforms,t.persistent??!1,t.float??!1,void 0,!1,t.glslVersion),t.persistent&&i.registerBufferUniform(`backbuffer`),r.push(void 0)}this.#o.push(i),n.push(e);let a={};if(t.uniforms)for(let[e,n]of Object.entries(t.uniforms))typeof n==`function`&&(a[e]=n);this.#l.push(a)}this.#s=r;for(let e of i)e.target&&this.#u.set(e.target,void 0);let a=r.filter(e=>e!==void 0);for(let e=0;e<this.#o.length;e++)for(let t of a)n[e].match(RegExp(`uniform\\s+sampler2D\\s+${t}\\b`))&&this.#o[e].registerBufferUniform(t)}#K(e,t){e.shader!==void 0&&console.warn("[VFX-JS] Both `shader` and `effect` specified on post-effect; `effect` takes precedence.");let n=Array.isArray(t)?[...t]:[t];this.#R(n);let r=U(()=>{let e=this.#c;if(!e)throw Error(`[VFX-JS] post-effect chain active without target`);return e.texture},()=>this.#c?.width??0,()=>this.#c?.height??0),i={autoCrop:!0,glslVersion:e.glslVersion??`300 es`},a=new Qe(this.#n,this.#i,this.#v,n,i,r,!0);if(e.uniforms)for(let[t,n]of Object.entries(e.uniforms))typeof n==`function`?(this.#h[t]=n,this.#m[t]=n()):this.#m[t]=n;this.#d=a,this.#g=Date.now()/1e3,a.initAll().then(()=>{this.#d===a&&(this.#f=!0)}).catch(e=>{console.error(`[VFX-JS] Post-effect init failed; post-effect disabled:`,e),this.#d===a&&(this.#z(this.#d.effects),this.#d.dispose(),this.#d=null,this.#f=!1)})}#q(e,t){let n=this.#d;if(!n)return;let r=this.#v,i={...this.#m};for(let[e,t]of Object.entries(this.#h))i[e]=t();let a=this.#x.right-this.#x.left,o=this.#x.bottom-this.#x.top,s=t-this.#g;this.#g=t;let c=[a,o],l=[a*r,o*r],u={x:e.x*r,y:e.y*r,w:e.w*r,h:e.h*r};n.run({time:t-this.#b,deltaTime:s,mouse:[this.#E*r,this.#D*r],mouseViewport:[this.#E*r,this.#D*r],intersection:1,enterTime:0,leaveTime:0,resolvedUniforms:i,canvasLogical:c,canvasPhys:l,elementLogical:c,elementPhys:l,elementRectOnCanvasPx:u,finalTarget:null,isVisible:!0})}#J(e,t){if(!this.#c)return;let n=this.#c.texture,r=new Map;for(let e=0;e<this.#o.length;e++){let t=this.#o[e],n=this.#s[e];n&&t.backbuffer&&r.set(n,t.backbuffer.texture)}for(let i=0;i<this.#o.length;i++){let a=this.#o[i],o=i===this.#o.length-1,s=this.#l[i],c=this.#s[i],l=this.#E+this.#w,u=this.#D+this.#T,d=a.getTargetDimensions();if(d){let[r,i]=d;a.uniforms.src.value=n,a.uniforms.resolution.value.set(r,i),a.uniforms.offset.value.set(0,0),a.uniforms.time.value=t-this.#b,a.uniforms.mouse.value.set(l/e.w*r,u/e.h*i)}else a.setUniforms(n,this.#v,e,t-this.#b,l,u);a.uniforms.passIndex.value=i,a.updateCustomUniforms(s);for(let[e,t]of r){let n=a.uniforms[e];n&&(n.value=t)}if(o)a.backbuffer?(a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture),this.#U(a.pass,a.backbuffer.target,e,a.uniforms,!0),a.backbuffer.swap(),this.#a.setUniforms(a.backbuffer.texture,this.#v,e),this.#U(this.#a.pass,null,e,this.#a.uniforms,!1)):this.#U(a.pass,null,e,a.uniforms,!1);else if(a.backbuffer){a.uniforms.backbuffer&&(a.uniforms.backbuffer.value=a.backbuffer.texture);let t=d?A(0,0,d[0]/this.#v,d[1]/this.#v):e;this.#U(a.pass,a.backbuffer.target,t,a.uniforms,!0),a.backbuffer.swap(),n=a.backbuffer.texture,c&&r.set(c,a.backbuffer.texture)}else{let t=c??`postEffect${i}`,o=this.#u.get(t),s=d?d[0]:e.w*this.#v,l=d?d[1]:e.h*this.#v;(!o||o.width!==s||o.height!==l)&&(o?.dispose(),o=bt(this.#n,s,l,{float:a.float}),this.#u.set(t,o));let u=d?A(0,0,d[0]/this.#v,d[1]/this.#v):e;this.#U(a.pass,o,u,a.uniforms,!0),n=o.texture,c&&r.set(c,o.texture)}}}#Y(e,t){let n=e*this.#v,r=t*this.#v;(!this.#c||this.#c.width!==n||this.#c.height!==r)&&(this.#c?.dispose(),this.#c=bt(this.#n,n,r));for(let n of this.#o)n.persistent&&!n.backbuffer?n.initializeBackbuffer(this.#n,e,t,this.#v):n.backbuffer&&n.resizeBackbuffer(e,t)}}}));function Ft(){try{let e=document.createElement(`canvas`);return(e.getContext(`webgl2`)||e.getContext(`webgl`))!==null}catch{return!1}}var It=e((()=>{}));function Lt(){if(typeof window>`u`)throw`Cannot find 'window'. VFX-JS only runs on the browser.`;if(typeof document>`u`)throw`Cannot find 'document'. VFX-JS only runs on the browser.`}function Rt(e){return{position:e?`fixed`:`absolute`,top:0,left:0,width:`0px`,height:`0px`,"z-index":9999,"pointer-events":`none`}}var zt,Bt=e((()=>{C(),ee(),ne(),Pt(),It(),zt=class e{#e;#t;#n=new Map;static init(t){try{return new e(t)}catch{return null}}constructor(e={}){if(Lt(),!Ft())throw Error(`[VFX-JS] WebGL is not available in this environment.`);let t=te(e),n=document.createElement(`canvas`),r=Rt(t.fixedCanvas);for(let[e,t]of Object.entries(r))n.style.setProperty(e,t.toString());t.zIndex!==void 0&&n.style.setProperty(`z-index`,t.zIndex.toString()),(t.wrapper??document.body).appendChild(n),this.#t=n,this.#e=new Nt(t,n),t.autoplay&&this.#e.play()}async add(e,t,n){e instanceof HTMLImageElement?await this.#r(e,t):e instanceof HTMLVideoElement?await this.#i(e,t):e instanceof HTMLCanvasElement?e.hasAttribute(`layoutsubtree`)&&n?await this.#e.addElement(e,t,n):await this.#a(e,t):await this.#o(e,t)}updateHICTexture(e,t){this.#e.updateHICTexture(e,t)}get maxTextureSize(){return this.#e.maxTextureSize}async addHTML(e,t){if(!w())return console.warn(`html-in-canvas not supported, falling back to dom-to-canvas`),this.add(e,t);t.overlay!==void 0&&console.warn(`addHTML does not support overlay mode (layoutsubtree hides children). Ignoring overlay option.`);let{overlay:n,...r}=t,i=this.#n.get(e);i&&this.#e.removeElement(i);let{canvas:a,initialCapture:o}=await p(e,{onCapture:e=>{this.#e.updateHICTexture(a,e)},maxSize:this.#e.maxTextureSize});i=a,this.#n.set(e,i),await this.#e.addElement(i,r,o)}remove(e){let t=this.#n.get(e);t?(m(t,e),this.#n.delete(e),this.#e.removeElement(t)):this.#e.removeElement(e)}async update(e){let t=this.#n.get(e);if(t){t.requestPaint();return}if(e instanceof HTMLCanvasElement){this.#e.updateCanvasElement(e);return}else return this.#e.updateTextElement(e)}play(){this.#e.play()}stop(){this.#e.stop()}render(){this.#e.render()}destroy(){for(let[e,t]of this.#n)m(t,e);this.#n.clear(),this.#e.destroy(),this.#t.remove()}#r(e,t){return e.complete?this.#e.addElement(e,t):new Promise(n=>{e.addEventListener(`load`,()=>{this.#e.addElement(e,t),n()},{once:!0})})}#i(e,t){return e.readyState>=3?this.#e.addElement(e,t):new Promise(n=>{e.addEventListener(`canplay`,()=>{this.#e.addElement(e,t),n()},{once:!0})})}#a(e,t){return this.#e.addElement(e,t)}#o(e,t){return this.#e.addElement(e,t)}}})),Vt=e((()=>{s(),C(),ee(),Bt()}));export{f as a,d as i,zt as n,w as r,Vt as t};
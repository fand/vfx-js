export const DEFAULT_VERTEX_SHADER = `
precision mediump float;
void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const shaders = {
    uvGradient: `
    precision mediump float;
    uniform vec2 resolution;
    uniform vec2 offset;
    uniform float time;
    uniform sampler2D src;
    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        gl_FragColor = vec4(uv, sin(time) * .5 + .5, 1);

        vec4 img = texture2D(src, uv);
        gl_FragColor *= smoothstep(0., 1., img.a);
    }
    `,
    rainbow: `
    precision mediump float;
    uniform vec2 resolution;
    uniform vec2 offset;
    uniform float time;
    uniform sampler2D src;

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

        float x = (uv.x - uv.y) - time;

        vec4 img = texture2D(src, uv);
        img.rgb *= hueShift(vec3(1,0,0), x);

        gl_FragColor = img;
    }
    `,
    glitch: `
    precision mediump float;
    uniform vec2 resolution;
    uniform vec2 offset;
    uniform float time;
    uniform sampler2D src;

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        vec4 color = texture2D(src, uv);

        // Seed value
        float v = fract(sin(time * 9.));

        // Prepare for chromatic Abbreveation
        vec2 focus = vec2(0.5, 0.2);
        float d = v * 0.06;
        vec2 ruv = focus + (uv - focus) * (1. - d);
        vec2 guv = focus + (uv - focus) * (1. - 2. * d);
        vec2 buv = focus + (uv - focus) * (1. - 3. * d);

        // Random Glitch
        if (v > 0.1) {
            // Randomize y
            float y = floor(uv.y * 13. * sin(35. * time)) + 1.;
            if (sin(36. * y * v) > 0.9) {
                ruv.x = fract(uv.x + sin(76. * y) * 0.1);
                guv.x = fract(uv.x + sin(34. * y) * 0.1);
                buv.x = fract(uv.x + sin(199. * y) * 0.1);
            }

            // RGB Shift
            v = pow(v * 1.5, 2.) * 0.15;
            color.r = texture2D(src, vec2(uv.x + sin(time * 123.45) * v, uv.y)).r;
            color.g = texture2D(src, vec2(uv.x + sin(time * 457.67) * v, uv.y)).g;
            color.b = texture2D(src, vec2(uv.x + sin(time * 923.67) * v, uv.y)).b;
        }

        // Compose Chromatic Abbreveation
        color.r = color.r * 0.5 + color.r * texture2D(src, ruv).r;
        color.g = color.g * 0.5 + color.g * texture2D(src, guv).g;
        color.b = color.b * 0.5 + color.b * texture2D(src, buv).b;

        gl_FragColor = color;
        gl_FragColor.a = step(.1, length(color.rgb));
    }
    `,
    pixelate: `
    precision mediump float;
    uniform vec2 resolution;
    uniform vec2 offset;
    uniform float time;
    uniform sampler2D src;

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        float b = sin(time * 2.) * 32. + 48.;
        uv = floor(uv * b) / b;
        gl_FragColor = texture2D(src, uv);
    }
    `,
    halftone: `
    // Halftone Effect by zoidberg
    // https://www.interactiveshaderformat.com/sketches/234

    precision mediump float;
    uniform vec2 resolution;
    uniform vec2 offset;
    uniform float time;
    uniform sampler2D src;

    // TODO: uniform
    #define gridSize 15.0
    #define smoothing 0.15

    #define IMG_PIXEL(x, y)  texture2D(x, (y - offset) / resolution);

    vec4		gridRot = vec4(15.0, 45.0, 75.0, 0.0);

    //	during calculation we find the closest dot to a frag, determine its size, and then determine the size of the four dots above/below/right/left of it. this array of offsets move "one left", "one up", "one right", and "one down"...
    vec2		originOffsets[4];

    void main() {
        //	a halftone is an overlapping series of grids of dots
        //	each grid of dots is rotated by a different amount
        //	the size of the dots determines the colors. the shape of the dot should never change (always be a dot with regular edges)
        originOffsets[0] = vec2(-1.0, 0.0);
        originOffsets[1] = vec2(0.0, 1.0);
        originOffsets[2] = vec2(1.0, 0.0);
        originOffsets[3] = vec2(0.0, -1.0);

        vec3		rgbAmounts = vec3(0.0);

        //	for each of the channels (i) of RGB...
        for (float i=0.0; i<3.0; ++i)	{
            //	figure out the rotation of the grid in radians
            float		rotRad = radians(gridRot[int(i)]);
            //	the grids are rotated counter-clockwise- to find the nearest dot, take the fragment pixel loc,
            //	rotate it clockwise, and split by the grid to find the center of the dot. then rotate this
            //	coord counter-clockwise to yield the location of the center of the dot in pixel coords local to the render space
            mat2		ccTrans = mat2(vec2(cos(rotRad), sin(rotRad)), vec2(-1.0*sin(rotRad), cos(rotRad)));
            mat2		cTrans = mat2(vec2(cos(rotRad), -1.0*sin(rotRad)), vec2(sin(rotRad), cos(rotRad)));

            //	find the location of the frag in the grid (prior to rotating it)
            vec2		gridFragLoc = cTrans * gl_FragCoord.xy;
            //	find the center of the dot closest to the frag- there's no "round" in GLSL 1.2, so do a "floor" to find the dot to the bottom-left of the frag, then figure out if the frag would be in the top and right halves of that square to find the closest dot to the frag
            vec2		gridOriginLoc = vec2(floor(gridFragLoc.x/gridSize), floor(gridFragLoc.y/gridSize));

            vec2		tmpGridCoords = gridFragLoc/vec2(gridSize);
            bool		fragAtTopOfGrid = ((tmpGridCoords.y-floor(tmpGridCoords.y)) > (gridSize/2.0)) ? true : false;
            bool		fragAtRightOfGrid = ((tmpGridCoords.x-floor(tmpGridCoords.x)) > (gridSize/2.0)) ? true : false;
            if (fragAtTopOfGrid)
                gridOriginLoc.y = gridOriginLoc.y + 1.0;
            if (fragAtRightOfGrid)
                gridOriginLoc.x = gridOriginLoc.x + 1.0;
            //	...at this point, "gridOriginLoc" contains the grid coords of the nearest dot to the fragment being rendered
            //	convert the location of the center of the dot from grid coords to pixel coords
            vec2		gridDotLoc = vec2(gridOriginLoc.x*gridSize, gridOriginLoc.y*gridSize) + vec2(gridSize/2.0);
            //	rotate the pixel coords of the center of the dot so they become relative to the rendering space
            vec2		renderDotLoc = ccTrans * gridDotLoc;
            //	get the color of the pixel of the input image under this dot (the color will ultimately determine the size of the dot)
            vec4		renderDotImageColorRGB = IMG_PIXEL(src, renderDotLoc);


            //	the amount of this channel is taken from the same channel of the color of the pixel of the input image under this halftone dot
            float		imageChannelAmount = renderDotImageColorRGB[int(i)];
            //	the size of the dot is determined by the value of the channel
            float		dotRadius = imageChannelAmount * (gridSize*1.50/2.0);
            float		fragDistanceToDotCenter = distance(gl_FragCoord.xy, renderDotLoc);
            if (fragDistanceToDotCenter < dotRadius)	{
                rgbAmounts[int(i)] += smoothstep(dotRadius, dotRadius-(dotRadius*smoothing), fragDistanceToDotCenter);
            }

            //	calcluate the size of the dots abov/below/to the left/right to see if they're overlapping
            for (float j=0.0; j<4.0; ++j)	{
                gridDotLoc = vec2((gridOriginLoc.x+originOffsets[int(j)].x)*gridSize, (gridOriginLoc.y+originOffsets[int(j)].y)*gridSize) + vec2(gridSize/2.0);
                renderDotLoc = ccTrans * gridDotLoc;
                renderDotImageColorRGB = IMG_PIXEL(src, renderDotLoc);

                imageChannelAmount = renderDotImageColorRGB[int(i)];
                dotRadius = imageChannelAmount * (gridSize*1.50/2.0);
                fragDistanceToDotCenter = distance(gl_FragCoord.xy, renderDotLoc);
                if (fragDistanceToDotCenter < dotRadius)	{
                    rgbAmounts[int(i)] += smoothstep(dotRadius, dotRadius-(dotRadius*smoothing), fragDistanceToDotCenter);
                }
            }
        }

        gl_FragColor = vec4(rgbAmounts[0], rgbAmounts[1], rgbAmounts[2], 1.0);
    }
    `
};

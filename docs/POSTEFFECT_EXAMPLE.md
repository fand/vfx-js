# Post Effect Feature Example

This document demonstrates how to use the new post effect feature in VFX-JS.

## Basic Usage

```javascript
import { VFX } from '@vfx-js/core';

// Create VFX instance with a post effect
const vfx = new VFX({
    postEffect: {
        shader: `
            precision highp float;
            uniform sampler2D src;
            uniform vec2 resolution;
            uniform vec2 offset;
            out vec4 outColor;
            
            void main() {
                vec2 uv = (gl_FragCoord.xy - offset) / resolution;
                vec4 color = texture(src, uv);
                // Apply grayscale effect
                float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                outColor = vec4(vec3(gray), color.a);
            }
        `
    }
});

// Add elements as usual
const img = document.querySelector('img');
vfx.add(img, { shader: 'glitch' });
```

## Post Effect with Custom Uniforms

```javascript
const vfx = new VFX({
    postEffect: {
        shader: `
            precision highp float;
            uniform sampler2D src;
            uniform vec2 resolution;
            uniform vec2 offset;
            uniform float time;
            uniform float intensity;
            out vec4 outColor;
            
            void main() {
                vec2 uv = (gl_FragCoord.xy - offset) / resolution;
                vec4 color = texture(src, uv);
                
                // Animated sepia effect
                vec3 sepia = vec3(
                    dot(color.rgb, vec3(0.393, 0.769, 0.189)),
                    dot(color.rgb, vec3(0.349, 0.686, 0.168)),
                    dot(color.rgb, vec3(0.272, 0.534, 0.131))
                );
                
                float animatedIntensity = intensity * (sin(time * 2.0) * 0.5 + 0.5);
                outColor = vec4(mix(color.rgb, sepia, animatedIntensity), color.a);
            }
        `,
        uniforms: {
            intensity: 0.8,
        }
    }
});
```

## Available Uniforms

The post effect shader automatically receives these uniforms:

- `sampler2D src`: The rendered canvas texture
- `vec2 resolution`: Canvas resolution in pixels
- `vec2 offset`: Offset values
- `vec4 viewport`: Viewport information  
- `float time`: Time in seconds since VFX started
- `vec2 mouse`: Mouse position in pixels

You can also define custom uniforms in the `uniforms` object, including dynamic uniforms using functions:

```javascript
const vfx = new VFX({
    postEffect: {
        shader: `...`,
        uniforms: {
            staticValue: 1.0,
            dynamicValue: () => Math.sin(Date.now() / 1000),
            colorTint: [1.0, 0.5, 0.2, 1.0]
        }
    }
});
```

## Example Effects

### Invert Colors
```glsl
precision highp float;
uniform sampler2D src;
uniform vec2 resolution;
uniform vec2 offset;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec4 color = texture(src, uv);
    outColor = vec4(1.0 - color.rgb, color.a);
}
```

### Chromatic Aberration
```glsl
precision highp float;
uniform sampler2D src;
uniform vec2 resolution;
uniform vec2 offset;
uniform float aberrationStrength;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec2 center = vec2(0.5);
    vec2 direction = normalize(uv - center);
    float distance = length(uv - center);
    
    vec2 offsetR = direction * distance * aberrationStrength;
    vec2 offsetB = direction * distance * aberrationStrength * -1.0;
    
    float r = texture(src, uv + offsetR).r;
    float g = texture(src, uv).g;
    float b = texture(src, uv + offsetB).b;
    float a = texture(src, uv).a;
    
    outColor = vec4(r, g, b, a);
}
```

### Animated Vignette
```glsl
precision highp float;
uniform sampler2D src;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform float vignetteStrength;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec4 color = texture(src, uv);
    
    vec2 center = vec2(0.5);
    float dist = distance(uv, center);
    float vignette = 1.0 - smoothstep(0.3, 1.0, dist * vignetteStrength);
    vignette += sin(time * 2.0) * 0.1;
    
    outColor = vec4(color.rgb * vignette, color.a);
}
```
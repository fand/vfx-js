import { VFX } from "@vfx-js/core";

import Jelyfish from "../assets/jellyfish.webp";

export default {
  title: "Tests/GLSL Version Auto Detection",
  parameters: {
    layout: "fullscreen",
  },
};

const glsl100Shader = `
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform sampler2D src;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec4 color = texture2D(src, uv);
    color.rgb = 1.0 - color.rgb; // invert RGB
    gl_FragColor = color;
}
`;

const glsl300Shader = `
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform sampler2D src;
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec4 color = texture(src, uv);
    color.rgb = 1.0 - color.rgb; // invert RGB
    outColor = color;
}
`;

// Test story that shows all versions side by side
export const AllVersionsComparison = () => {
  const container = document.createElement("div");
  container.style.cssText = `
    display: flex;
    gap: 20px;
    padding: 20px;
    font-weight: bold;
  `;

  const createTestElement = (title, shader, glslVersion = undefined) => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    `;

    const titleEl = document.createElement("h3");
    titleEl.textContent = title;
    titleEl.style.cssText = `
      margin: 0;
      font-family: Arial, sans-serif;
      color: white;
    `;

    const testEl = document.createElement("img");
    testEl.src = Jelyfish;

    testEl.alt = "Jellyfish";
    testEl.style.cssText = `
      width: 200px;
      height: 200px;
      object-fit: cover;
      border-radius: 15px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.2);
    `;

    const statusEl = document.createElement("div");
    statusEl.style.cssText = `
      font-family: monospace;
      font-size: 12px;
      text-align: center;
      min-height: 20px;
    `;
    statusEl.textContent = "Loading...";

    wrapper.appendChild(titleEl);
    wrapper.appendChild(testEl);
    wrapper.appendChild(statusEl);

    // Apply VFX
    const vfx = new VFX();
    const options = { shader };
    if (glslVersion !== undefined) {
      options.glslVersion = glslVersion;
    }

    vfx
      .add(testEl, options)
      .then(() => {
        statusEl.textContent = "✅ Success!";
        statusEl.style.color = "green";
      })
      .catch((error) => {
        console.error(`Error in ${title}:`, error);
        statusEl.textContent = `❌ Error: ${error.message}`;
        statusEl.style.color = "red";
      });

    return wrapper;
  };

  // Create test elements
  container.appendChild(
    createTestElement("GLSL 1.0 Auto-detect", glsl100Shader)
  );
  container.appendChild(
    createTestElement("GLSL 3.0 Auto-detect", glsl300Shader)
  );
  container.appendChild(
    createTestElement("GLSL 1.0 Explicit", glsl100Shader, "100")
  );
  container.appendChild(
    createTestElement("GLSL 3.0 Explicit", glsl300Shader, "300 es")
  );

  return container;
};

AllVersionsComparison.parameters = {
  docs: {
    description: {
      story:
        "This story tests the GLSL version detection fix. All four variants should work without errors.",
    },
  },
};

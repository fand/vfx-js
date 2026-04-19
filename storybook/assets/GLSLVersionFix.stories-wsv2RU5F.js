import{V as E}from"./vfx-wGJBmbdk.js";import{J as y}from"./jellyfish-qrbjulKw.js";const L={title:"Tests/GLSL Version Auto Detection",parameters:{layout:"fullscreen"}},p=`
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
`,m=`
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
`,r=()=>{const t=document.createElement("div");t.style.cssText=`
    display: flex;
    gap: 20px;
    padding: 20px;
    font-weight: bold;
  `;const s=(i,h,c=void 0)=>{const n=document.createElement("div");n.style.cssText=`
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    `;const l=document.createElement("h3");l.textContent=i,l.style.cssText=`
      margin: 0;
      font-family: Arial, sans-serif;
      color: white;
    `;const o=document.createElement("img");o.src=y,o.alt="Jellyfish",o.style.cssText=`
      width: 200px;
      height: 200px;
      object-fit: cover;
      border-radius: 15px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.2);
    `;const e=document.createElement("div");e.style.cssText=`
      font-family: monospace;
      font-size: 12px;
      text-align: center;
      min-height: 20px;
    `,e.textContent="Loading...",n.appendChild(l),n.appendChild(o),n.appendChild(e);const g=new E,a={shader:h};return c!==void 0&&(a.glslVersion=c),g.add(o,a).then(()=>{e.textContent="✅ Success!",e.style.color="green"}).catch(d=>{console.error(`Error in ${i}:`,d),e.textContent=`❌ Error: ${d.message}`,e.style.color="red"}),n};return t.appendChild(s("GLSL 1.0 Auto-detect",p)),t.appendChild(s("GLSL 3.0 Auto-detect",m)),t.appendChild(s("GLSL 1.0 Explicit",p,"100")),t.appendChild(s("GLSL 3.0 Explicit",m,"300 es")),t};r.parameters={docs:{description:{story:"This story tests the GLSL version detection fix. All four variants should work without errors."}}};var u,x,f;r.parameters={...r.parameters,docs:{...(u=r.parameters)==null?void 0:u.docs,source:{originalSource:`() => {
  const container = document.createElement("div");
  container.style.cssText = \`
    display: flex;
    gap: 20px;
    padding: 20px;
    font-weight: bold;
  \`;
  const createTestElement = (title, shader, glslVersion = undefined) => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = \`
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    \`;
    const titleEl = document.createElement("h3");
    titleEl.textContent = title;
    titleEl.style.cssText = \`
      margin: 0;
      font-family: Arial, sans-serif;
      color: white;
    \`;
    const testEl = document.createElement("img");
    testEl.src = Jelyfish;
    testEl.alt = "Jellyfish";
    testEl.style.cssText = \`
      width: 200px;
      height: 200px;
      object-fit: cover;
      border-radius: 15px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.2);
    \`;
    const statusEl = document.createElement("div");
    statusEl.style.cssText = \`
      font-family: monospace;
      font-size: 12px;
      text-align: center;
      min-height: 20px;
    \`;
    statusEl.textContent = "Loading...";
    wrapper.appendChild(titleEl);
    wrapper.appendChild(testEl);
    wrapper.appendChild(statusEl);

    // Apply VFX
    const vfx = new VFX();
    const options = {
      shader
    };
    if (glslVersion !== undefined) {
      options.glslVersion = glslVersion;
    }
    vfx.add(testEl, options).then(() => {
      statusEl.textContent = "✅ Success!";
      statusEl.style.color = "green";
    }).catch(error => {
      console.error(\`Error in \${title}:\`, error);
      statusEl.textContent = \`❌ Error: \${error.message}\`;
      statusEl.style.color = "red";
    });
    return wrapper;
  };

  // Create test elements
  container.appendChild(createTestElement("GLSL 1.0 Auto-detect", glsl100Shader));
  container.appendChild(createTestElement("GLSL 3.0 Auto-detect", glsl300Shader));
  container.appendChild(createTestElement("GLSL 1.0 Explicit", glsl100Shader, "100"));
  container.appendChild(createTestElement("GLSL 3.0 Explicit", glsl300Shader, "300 es"));
  return container;
}`,...(f=(x=r.parameters)==null?void 0:x.docs)==null?void 0:f.source}}};const S=["AllVersionsComparison"];export{r as AllVersionsComparison,S as __namedExportsOrder,L as default};

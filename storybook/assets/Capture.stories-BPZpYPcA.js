import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{d as t,f as n}from"./utils-BL_BUetj.js";import{n as r,t as i}from"./jellyfish-D_mofjh4.js";import{n as a,t as o}from"./jellyfish-DtC6VyHr.js";function s(){let e=document.getElementById(`storybook-root`);e.style.height=`auto`,e.style.display=`block`}var c,l,u,d,f,p,m,h,g,_,v,y,b,x,S,C;function w(){return(w=e((()=>{i(),o(),n(),c=(e,t)=>e.querySelector(t),l=()=>new Promise(e=>requestAnimationFrame(e)),u=e=>[e.x,e.y,e.width,e.height],d=()=>[document.documentElement.clientWidth,document.documentElement.clientHeight],f={title:`Capture`,parameters:{layout:`fullscreen`,chromatic:{disableSnapshot:!0}}},p=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D page;
uniform vec2 size;      // minimap, CSS px
uniform vec4 pageRect;  // captured element in the viewport, CSS px
uniform vec2 viewport;  // CSS px
void main() {
    vec2 p = vec2(uv.x, 1.0 - uv.y) * size;
    float s = min(size.x / pageRect.z, size.y / pageRect.w);
    vec2 off = (size - pageRect.zw * s) * 0.5;
    vec2 a = (p - off) / s;

    vec4 col = vec4(0.0, 0.0, 0.0, 0.6);
    if (all(greaterThanEqual(a, vec2(0.0))) && all(lessThan(a, pageRect.zw))) {
        col = texture(page, vec2(a.x / pageRect.z, 1.0 - a.y / pageRect.w));
    }

    // The visible rows of the page, in minimap px. The frame spans the page width.
    vec2 vmin = vec2(off.x, off.y - pageRect.y * s);
    vec2 vmax = vec2(off.x + pageRect.z * s, vmin.y + viewport.y * s);
    bool inView = all(greaterThanEqual(p, vmin)) && all(lessThan(p, vmax));
    bool inInner = all(greaterThanEqual(p, vmin + 2.0)) && all(lessThan(p, vmax - 2.0));
    if (inView && !inInner) {
        col = vec4(1.0, 0.3, 0.2, 1.0);
    } else if (!inView) {
        col.rgb *= 0.5;
    }
    outColor = col;
}
`,m=class{page;constructor(e){this.page=e}render(e){let t=this.page.rect;t&&e.draw({frag:p,uniforms:{page:this.page.texture,size:[e.dims.element[0],e.dims.element[1]],pageRect:u(t),viewport:d()}})}},h=`VFX-JS captures this article into a texture with vfx.capture(). The minimap is a separate element, drawn by an effect that reads capture.texture and capture.rect. Scroll to move the frame.`,g={render:()=>{s();let e=document.createElement(`div`);e.style.cssText=`padding:48px 220px 96px 48px; font-family:sans-serif; color:white; background:#111`;let t=Array.from({length:8},(e,t)=>`
                <h2 style="margin:48px 0 16px">Section ${t+1}</h2>
                <p style="font-size:1.1rem; line-height:1.7">${h}</p>
                <p style="font-size:1.1rem; line-height:1.7">${h}</p>
            `).join(``),n=document.createElement(`article`);n.id=`capture-article`,n.style.cssText=`max-width:640px; padding:24px; background:#223; border-radius:12px`,n.innerHTML=`
            <h1 style="margin:0">Minimap</h1>
            <p>Updated <span id="capture-clock">0</span>s ago.
               <button id="capture-toggle">Toggle box</button>
               <a href="#capture-article" style="color:#8cf">A link</a>
               <input placeholder="Type here" style="margin-left:8px" /></p>
            <div id="capture-box" style="height:80px; background:#e63; border-radius:8px"></div>
            <img src="${a}" style="display:block; width:100%; margin-top:24px; border-radius:8px" />
            ${t}
        `,e.appendChild(n);let r=document.createElement(`div`);return r.id=`capture-minimap`,r.style.cssText=`position:fixed; top:16px; right:16px; width:160px; height:60vh`,e.appendChild(r),e},play:async({canvasElement:e})=>{await l();let n=c(e,`#capture-article`),r=c(e,`#capture-minimap`),i=c(e,`#capture-clock`),a=c(e,`#capture-box`),o=c(e,`#capture-toggle`),s=t({scrollPadding:!1}),u=await s.capture(n),d=Date.now(),f=setInterval(()=>{i.isConnected?(i.textContent=String(Math.floor((Date.now()-d)/1e3)),u.update()):clearInterval(f)},1e3),p=!1;o.addEventListener(`click`,()=>{p=!p,a.style.background=p?`#38e`:`#e63`,u.update()}),await s.add(r,{effect:new m(u)})}},_=`#version 300 es
precision highp float;
in vec2 uv;
in vec2 uvSrc;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D page;
uniform vec2 canvas;    // VFX canvas, CSS px
uniform vec2 viewport;  // CSS px
uniform vec4 pageRect;  // captured element in the viewport, CSS px
uniform vec2 pointer;   // viewport, CSS px
uniform float radius;   // lens radius, CSS px
uniform float time;

vec4 samplePage(vec2 q) {
    vec2 l = q / pageRect.zw;
    if (any(lessThan(l, vec2(0.0))) || any(greaterThanEqual(l, vec2(1.0)))) {
        return vec4(0.0);
    }
    return texture(page, vec2(l.x, 1.0 - l.y));
}

void main() {
    vec4 base = texture(src, uvSrc);
    // The canvas is the viewport plus the same scroll padding on each side.
    vec2 pad = (canvas - viewport) * 0.5;
    vec2 p = vec2(uv.x, 1.0 - uv.y) * canvas - pad;
    vec2 q = p - pageRect.xy;

    // Outside the lens: wobbly and pixelated.
    vec2 w = q + 10.0 * vec2(sin(q.y * 0.04 + time * 2.0), sin(q.x * 0.03 + time * 1.7));
    vec2 cell = (floor(w / 14.0) + 0.5) * 14.0;
    vec4 rough = samplePage(cell);
    rough.rgb = mix(rough.rgb, vec3(dot(rough.rgb, vec3(0.3, 0.59, 0.11))), 0.6);

    float inLens = 1.0 - smoothstep(radius - 16.0, radius, length(p - pointer));
    vec4 c = mix(rough, samplePage(q), inLens);
    outColor = c + base * (1.0 - c.a);
}
`,v=class{page=null;reveal=!1;#e=0;get enabled(){return this.page?.rect!=null}update(e){let t=this.reveal?120:0;this.#e+=(t-this.#e)*Math.min(1,e.deltaTime*8)}render(e){let t=this.page?.rect;if(!this.page||!t)return;let[n,r]=e.mouseViewport,i=[n/e.pixelRatio,window.innerHeight-r/e.pixelRatio];e.draw({frag:_,uniforms:{src:e.src,page:this.page.texture,canvas:[e.dims.canvas[0],e.dims.canvas[1]],viewport:d(),pageRect:u(t),pointer:i,radius:this.#e,time:e.time}})}},y={render:()=>{s();let e=document.createElement(`div`);e.style.cssText=`padding:96px 48px 150vh; font-family:sans-serif; color:white; background:#111`;let t=document.createElement(`div`);return t.id=`capture-hidden`,t.style.cssText=`width:480px; padding:24px; background:#235; border-radius:12px`,t.innerHTML=`
            <img src="${a}" style="display:block; width:100%; border-radius:8px" />
            <h2>Hover to look through the lens</h2>
            <p style="line-height:1.6">This card is captured with
               <code>hide: true</code>, so you only see a post effect's
               drawing of it: wobbly and pixelated, and sharp around the
               pointer while you hover it.</p>
        `,e.appendChild(t),e},play:async({canvasElement:e})=>{await l();let n=c(e,`#capture-hidden`),r=new v;n.addEventListener(`pointerenter`,()=>{r.reveal=!0}),n.addEventListener(`pointerleave`,()=>{r.reveal=!1}),r.page=await t({postEffect:{effect:r}}).capture(n,{hide:!0})}},b=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outColor;
uniform sampler2D image;
uniform sampler2D video;
uniform sampler2D canvas;
void main() {
    float i = floor(uv.x * 3.0);
    vec2 st = vec2(fract(uv.x * 3.0), uv.y);
    outColor = i < 1.0 ? texture(image, st)
        : i < 2.0 ? texture(video, st)
        : texture(canvas, st);
}
`,x=class{render(e){e.draw({frag:b,uniforms:e.uniforms})}},S={render:()=>{s();let e=document.createElement(`div`);e.style.cssText=`padding:48px; min-height:100vh; font-family:sans-serif; color:white; background:#111`;let t=`width:240px; height:160px; object-fit:cover`;return e.innerHTML=`
            <p>Sources: an image, a video and a 2D canvas.</p>
            <div style="display:flex; gap:16px">
                <img id="capture-img" src="${a}" style="${t}" />
                <video id="capture-video" src="${r}" muted loop autoplay playsinline style="${t}"></video>
                <canvas id="capture-canvas" width="240" height="160" style="${t}"></canvas>
            </div>
            <p>Captured and drawn by one effect:</p>
            <div id="capture-strip" style="width:752px; height:160px"></div>
        `,e},play:async({canvasElement:e})=>{await l();let n=c(e,`#capture-img`),r=c(e,`#capture-video`),i=c(e,`#capture-canvas`),a=c(e,`#capture-strip`),o=i.getContext(`2d`),s=e=>{i.isConnected&&(o.fillStyle=`#123`,o.fillRect(0,0,i.width,i.height),o.save(),o.translate(i.width/2,i.height/2),o.rotate(e/500),o.fillStyle=`#e63`,o.fillRect(-40,-40,80,80),o.restore(),requestAnimationFrame(s))};requestAnimationFrame(s);let u=t(),[d,f,p]=await Promise.all([u.capture(n),u.capture(r),u.capture(i)]);await u.add(a,{effect:new x,uniforms:{image:d.texture,video:f.texture,canvas:p.texture}})}},C=[`Minimap`,`Hide`,`Sources`],g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => {
    fullscreenRoot();
    const container = document.createElement("div");
    container.style.cssText = "padding:48px 220px 96px 48px; font-family:sans-serif; color:white; background:#111";
    const sections = Array.from({
      length: 8
    }, (_, i) => \`
                <h2 style="margin:48px 0 16px">Section \${i + 1}</h2>
                <p style="font-size:1.1rem; line-height:1.7">\${ARTICLE_TEXT}</p>
                <p style="font-size:1.1rem; line-height:1.7">\${ARTICLE_TEXT}</p>
            \`).join("");
    const article = document.createElement("article");
    article.id = "capture-article";
    article.style.cssText = "max-width:640px; padding:24px; background:#223; border-radius:12px";
    article.innerHTML = \`
            <h1 style="margin:0">Minimap</h1>
            <p>Updated <span id="capture-clock">0</span>s ago.
               <button id="capture-toggle">Toggle box</button>
               <a href="#capture-article" style="color:#8cf">A link</a>
               <input placeholder="Type here" style="margin-left:8px" /></p>
            <div id="capture-box" style="height:80px; background:#e63; border-radius:8px"></div>
            <img src="\${Jellyfish}" style="display:block; width:100%; margin-top:24px; border-radius:8px" />
            \${sections}
        \`;
    container.appendChild(article);
    const minimap = document.createElement("div");
    minimap.id = "capture-minimap";
    minimap.style.cssText = "position:fixed; top:16px; right:16px; width:160px; height:60vh";
    container.appendChild(minimap);
    return container;
  },
  play: async ({
    canvasElement
  }) => {
    await nextFrame();
    const article = qs<HTMLElement>(canvasElement, "#capture-article");
    const minimap = qs<HTMLElement>(canvasElement, "#capture-minimap");
    const clock = qs<HTMLElement>(canvasElement, "#capture-clock");
    const box = qs<HTMLElement>(canvasElement, "#capture-box");
    const toggle = qs(canvasElement, "#capture-toggle");

    // The minimap is fixed, so it needs a fixed canvas. With scroll padding it lags on scroll.
    const vfx = initVFX({
      scrollPadding: false
    });
    const page = await vfx.capture(article);

    // Live updates: a ticking clock, and a box that changes on click.
    // html-in-canvas re-captures on its own; update() covers the fallback.
    const start = Date.now();
    const timer = setInterval(() => {
      if (!clock.isConnected) {
        clearInterval(timer);
        return;
      }
      clock.textContent = String(Math.floor((Date.now() - start) / 1000));
      page.update();
    }, 1000);
    let blue = false;
    toggle.addEventListener("click", () => {
      blue = !blue;
      box.style.background = blue ? "#38e" : "#e63";
      page.update();
    });
    await vfx.add(minimap, {
      effect: new MinimapEffect(page)
    });
  }
}`,...g.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: () => {
    fullscreenRoot();
    const container = document.createElement("div");
    container.style.cssText = "padding:96px 48px 150vh; font-family:sans-serif; color:white; background:#111";
    const card = document.createElement("div");
    card.id = "capture-hidden";
    card.style.cssText = "width:480px; padding:24px; background:#235; border-radius:12px";
    card.innerHTML = \`
            <img src="\${Jellyfish}" style="display:block; width:100%; border-radius:8px" />
            <h2>Hover to look through the lens</h2>
            <p style="line-height:1.6">This card is captured with
               <code>hide: true</code>, so you only see a post effect's
               drawing of it: wobbly and pixelated, and sharp around the
               pointer while you hover it.</p>
        \`;
    container.appendChild(card);
    return container;
  },
  play: async ({
    canvasElement
  }) => {
    await nextFrame();
    const card = qs<HTMLElement>(canvasElement, "#capture-hidden");
    // The capture needs the VFX instance, so the post effect gets it afterwards.
    const effect = new LensEffect();
    card.addEventListener("pointerenter", () => {
      effect.reveal = true;
    });
    card.addEventListener("pointerleave", () => {
      effect.reveal = false;
    });
    const vfx = initVFX({
      postEffect: {
        effect
      }
    });
    effect.page = await vfx.capture(card, {
      hide: true
    });
  }
}`,...y.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: () => {
    fullscreenRoot();
    const container = document.createElement("div");
    container.style.cssText = "padding:48px; min-height:100vh; font-family:sans-serif; color:white; background:#111";
    const cell = "width:240px; height:160px; object-fit:cover";
    container.innerHTML = \`
            <p>Sources: an image, a video and a 2D canvas.</p>
            <div style="display:flex; gap:16px">
                <img id="capture-img" src="\${Jellyfish}" style="\${cell}" />
                <video id="capture-video" src="\${JellyfishMp4}" muted loop autoplay playsinline style="\${cell}"></video>
                <canvas id="capture-canvas" width="240" height="160" style="\${cell}"></canvas>
            </div>
            <p>Captured and drawn by one effect:</p>
            <div id="capture-strip" style="width:752px; height:160px"></div>
        \`;
    return container;
  },
  play: async ({
    canvasElement
  }) => {
    await nextFrame();
    const img = qs<HTMLImageElement>(canvasElement, "#capture-img");
    const video = qs<HTMLVideoElement>(canvasElement, "#capture-video");
    const canvas = qs<HTMLCanvasElement>(canvasElement, "#capture-canvas");
    const strip = qs<HTMLElement>(canvasElement, "#capture-strip");

    // biome-ignore lint/style/noNonNullAssertion: 2D context always exists
    const g = canvas.getContext("2d")!;
    const draw = (t: number) => {
      if (!canvas.isConnected) {
        return;
      }
      g.fillStyle = "#123";
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.save();
      g.translate(canvas.width / 2, canvas.height / 2);
      g.rotate(t / 500);
      g.fillStyle = "#e63";
      g.fillRect(-40, -40, 80, 80);
      g.restore();
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    const vfx = initVFX();
    const [image, clip, drawing] = await Promise.all([vfx.capture(img), vfx.capture(video), vfx.capture(canvas)]);
    await vfx.add(strip, {
      effect: new SideBySideEffect(),
      uniforms: {
        image: image.texture,
        video: clip.texture,
        canvas: drawing.texture
      }
    });
  }
}`,...S.parameters?.docs?.source}}}})))()}w();export{y as Hide,g as Minimap,S as Sources,C as __namedExportsOrder,f as default};
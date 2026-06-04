import{n as e}from"./chunk-BneVvdWh.js";import{a as t,c as n,i as r,l as i,o as a,r as o,s,t as c,u as l}from"./utils-CkQEfjYT.js";import{n as u,t as d}from"./logo-640w-20p-DamX1-bG.js";import{t as f}from"./preset-B7f9t9lo.js";import{a as p,c as m,f as h,i as g,l as _,n as v,o as y,r as b,s as x,t as S,u as C}from"./esm-B38yg5pr.js";import{n as w,t as T}from"./bbb-aniiCR4j.js";import{n as E,t as D}from"./jellyfish-CbdkhNBT.js";import{n as O,t as k}from"./pigeon-CsBwBuXA.js";function A(){let e=document.createElement(`article`);e.style.cssText=`width: 600px; padding: 32px; background: #fff; color: #202122; font-family: sans-serif; line-height: 1.6; border: 1px solid #a2a9b1;`;let t=`font-family: serif; font-weight: normal; border-bottom: 1px solid #a2a9b1; padding-bottom: 4px; margin-top: 24px;`,n=`margin: 20px 0; text-align: center;`,r=`font-size: 0.85em; color: #54595d; margin-top: 4px;`,i=`width: 100%; height: auto; max-width: 480px; background: #f8f9fa; border: 1px solid #a2a9b1;`;return e.innerHTML=`
        <h1 style="font-family: serif; font-weight: normal;
                   border-bottom: 1px solid #a2a9b1;
                   padding-bottom: 4px; margin: 0 0 4px;">
            Voronoi diagram
        </h1>
        <div style="font-size: 0.85em; color: #54595d; margin-bottom: 16px;">
            From Wikipedia, the free encyclopedia
        </div>
        <p>
            In mathematics, a <b>Voronoi diagram</b> is a partition of a
            plane into regions close to each of a given set of objects.
            It is named after Georgy Voronoy and is also known as a
            Dirichlet tessellation or Thiessen polygons.
        </p>
        <figure style="${n}">
            ${`
        <svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg"
             style="${i}">
            <polygon points="0,0 110,0 100,55 0,70" fill="#fce5cd" stroke="#54595d"/>
            <polygon points="110,0 240,0 220,75 100,55" fill="#d9ead3" stroke="#54595d"/>
            <polygon points="240,0 400,0 400,80 220,75" fill="#cfe2f3" stroke="#54595d"/>
            <polygon points="0,70 100,55 130,140 0,160" fill="#ead1dc" stroke="#54595d"/>
            <polygon points="100,55 220,75 240,150 130,140" fill="#fff2cc" stroke="#54595d"/>
            <polygon points="220,75 400,80 400,170 240,150" fill="#d0e0e3" stroke="#54595d"/>
            <polygon points="0,160 130,140 145,240 0,240" fill="#f4cccc" stroke="#54595d"/>
            <polygon points="130,140 240,150 250,240 145,240" fill="#d9d2e9" stroke="#54595d"/>
            <polygon points="240,150 400,170 400,240 250,240" fill="#fff2cc" stroke="#54595d"/>
            <circle cx="50" cy="30" r="3" fill="#202122"/>
            <circle cx="170" cy="30" r="3" fill="#202122"/>
            <circle cx="320" cy="35" r="3" fill="#202122"/>
            <circle cx="50" cy="110" r="3" fill="#202122"/>
            <circle cx="170" cy="105" r="3" fill="#202122"/>
            <circle cx="320" cy="120" r="3" fill="#202122"/>
            <circle cx="65" cy="200" r="3" fill="#202122"/>
            <circle cx="190" cy="195" r="3" fill="#202122"/>
            <circle cx="320" cy="205" r="3" fill="#202122"/>
        </svg>
    `}
            <figcaption style="${r}">
                Figure 1. A Voronoi diagram with 9 sites in the plane.
            </figcaption>
        </figure>
        <h2 style="${t}">Definition</h2>
        <p>
            For each seed there is a corresponding region, called a
            <i>Voronoi cell</i>, consisting of all points of the plane
            closer to that seed than to any other. Cell boundaries are
            segments of the perpendicular bisectors between pairs of
            neighbouring sites.
        </p>
        <h2 style="${t}">History</h2>
        <p>
            Informal use dates back to Descartes (<i>Principia
            Philosophiae</i>, 1644). Lejeune Dirichlet studied the 2D
            and 3D cases in 1850, and Georgy Voronoy generalized the
            construction to higher dimensions in 1908. In meteorology,
            Alfred Thiessen rediscovered the planar version in 1911 to
            estimate rainfall over a region.
        </p>
        <h2 style="${t}">Properties</h2>
        <ul>
            <li>Each Voronoi cell is a convex polygon (or polytope).</li>
            <li>The number of edges of an unbounded cell equals the
                number of its Voronoi neighbours.</li>
            <li>For sites in general position, each Voronoi vertex is
                the centre of a circle that passes through three sites
                and contains no other site in its interior.</li>
            <li>The diagram has at most <i>2n − 5</i> vertices and
                <i>3n − 6</i> edges for <i>n</i> sites.</li>
        </ul>
        <h2 style="${t}">Dual: Delaunay triangulation</h2>
        <p>
            The dual graph of a Voronoi diagram is the <b>Delaunay
            triangulation</b>: connect two sites by an edge whenever
            their cells share a boundary segment. The Delaunay
            triangulation maximizes the minimum interior angle of all
            triangles, avoiding sliver triangles.
        </p>
        <figure style="${n}">
            ${`
        <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg"
             style="${i}">
            <g fill="none" stroke="#54595d" stroke-width="1.2">
                <line x1="60" y1="40" x2="180" y2="60"/>
                <line x1="180" y1="60" x2="320" y2="35"/>
                <line x1="60" y1="40" x2="80" y2="140"/>
                <line x1="180" y1="60" x2="80" y2="140"/>
                <line x1="180" y1="60" x2="220" y2="150"/>
                <line x1="320" y1="35" x2="220" y2="150"/>
                <line x1="320" y1="35" x2="340" y2="140"/>
                <line x1="220" y1="150" x2="340" y2="140"/>
                <line x1="80" y1="140" x2="220" y2="150"/>
            </g>
            <circle cx="60" cy="40" r="4" fill="#cc0000"/>
            <circle cx="180" cy="60" r="4" fill="#cc0000"/>
            <circle cx="320" cy="35" r="4" fill="#cc0000"/>
            <circle cx="80" cy="140" r="4" fill="#cc0000"/>
            <circle cx="220" cy="150" r="4" fill="#cc0000"/>
            <circle cx="340" cy="140" r="4" fill="#cc0000"/>
        </svg>
    `}
            <figcaption style="${r}">
                Figure 2. Delaunay triangulation of 6 sites.
            </figcaption>
        </figure>
        <h2 style="${t}">Algorithms</h2>
        <p>
            Several algorithms construct Voronoi diagrams in
            <i>O(n log n)</i> time, matching the lower bound:
        </p>
        <ul>
            <li><b>Fortune's algorithm</b> (1987) — sweepline approach
                using a parabolic beach line.</li>
            <li><b>Bowyer–Watson algorithm</b> — incremental
                construction of the dual Delaunay triangulation.</li>
            <li><b>Lloyd's relaxation</b> — iterative method that moves
                each site to its cell's centroid, producing centroidal
                Voronoi tessellations.</li>
            <li><b>Divide and conquer</b> — Shamos and Hoey, 1975.</li>
        </ul>
        <h2 style="${t}">Applications</h2>
        <p>
            Voronoi diagrams have practical and theoretical uses in
            many fields, mainly in science and technology, but also in
            visual art:
        </p>
        <ul>
            <li>Computational geometry — nearest-neighbour search,
                largest empty circle, motion planning.</li>
            <li>Solid-state physics — Wigner–Seitz cells of crystal
                lattices.</li>
            <li>Cellular biology — modelling tissue packing and
                epithelial cell shapes.</li>
            <li>Networking and infrastructure — service-area
                assignment, cellphone tower coverage, school
                catchments.</li>
            <li>Procedural graphics — texture synthesis, terrain
                generation, stylized shading.</li>
            <li>Astronomy — analysing galaxy distribution and the
                cosmic web.</li>
        </ul>
        <h2 style="${t}">See also</h2>
        <ul>
            <li>Centroidal Voronoi tessellation</li>
            <li>Power diagram (weighted Voronoi)</li>
            <li>Apollonius diagram</li>
            <li>Worley noise</li>
        </ul>
        <h2 style="${t}">References</h2>
        <ol style="font-size: 0.9em; color: #202122;">
            <li>Voronoy, G. (1908). "Nouvelles applications des
                paramètres continus à la théorie des formes
                quadratiques." <i>J. Reine Angew. Math.</i> 133.</li>
            <li>Aurenhammer, F. (1991). "Voronoi diagrams — a survey of
                a fundamental geometric data structure." <i>ACM
                Computing Surveys</i> 23 (3): 345–405.</li>
            <li>Fortune, S. (1987). "A sweepline algorithm for Voronoi
                diagrams." <i>Algorithmica</i> 2: 153–174.</li>
            <li>Okabe, A.; Boots, B.; Sugihara, K.; Chiu, S. N. (2000).
                <i>Spatial Tessellations: Concepts and Applications of
                Voronoi Diagrams</i> (2nd ed.). Wiley.</li>
        </ol>
    `,e}function j(e){document.getElementById(`jpeg-glitch-fps`)?.remove();let t=document.createElement(`div`);t.id=`jpeg-glitch-fps`,t.style.cssText=`position:fixed;top:8px;left:8px;z-index:2147483647;font:12px/1.4 monospace;color:#0f0;background:rgba(0,0,0,0.6);padding:2px 8px;border-radius:3px;pointer-events:none;`,t.textContent=`-- fps`,document.body.appendChild(t);let n=performance.now(),r=e.producedFrames,i=()=>{if(!t.isConnected)return;let a=performance.now(),o=a-n;if(o>=500){let i=e.producedFrames;t.textContent=`${((i-r)*1e3/o).toFixed(1)} fps`,n=a,r=i}requestAnimationFrame(i)};requestAnimationFrame(i)}function M(e){let t=Math.round(window.innerWidth/2),n=Math.round(window.innerHeight/2),r=Math.min(t,n)*.4,i=0,a=window.setInterval(()=>{let o=i/60*Math.PI*2;e.dispatchEvent(new MouseEvent(`pointermove`,{clientX:t+Math.cos(o)*r,clientY:n+Math.sin(o)*r,bubbles:!0})),i++,i>120&&clearInterval(a)},16)}var N,P,F,I,L,R,z,B,V,H,U,W,G;e((()=>{w(),D(),d(),k(),S(),f(),l(),N={title:`Effect`,parameters:{layout:`fullscreen`}},P=()=>typeof navigator<`u`&&/Chromatic/.test(navigator.userAgent),F={render:()=>{let e=document.createElement(`img`);return e.src=u,e.style.display=`block`,e.style.margin=`40px auto`,e},args:void 0},F.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let n=i(),r=new h({threshold:.2,softness:.1,intensity:5,scatter:1,dither:0,edgeFade:0,pad:50});await n.add(t,{effect:r}),c(`Bloom`,r)},I={render:()=>{let e=document.createElement(`img`);return e.src=E,e},args:void 0},I.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let n=i(),r=new h({threshold:.01,softness:.2,intensity:10,scatter:1,dither:0,edgeFade:.02,pad:200});await n.add(t,{effect:[new p({size:10}),new b({spacing:5}),r]}),c(`CRT Bloom`,r)},L={render:()=>{let e=document.createElement(`img`);return e.src=E,e},args:void 0,parameters:{chromatic:{disableSnapshot:!0}}},L.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let n=i(),r=new g({range:[.5,1],direction:`up`,angle:30});await n.add(t,{effect:r}),s(`Pixel Sort`,r)},R={Jellyfish:E,Logo:u,Pigeon:O},z={render:e=>{let{src:t,...n}=e,r=i(),a=new m(n);if(j(a),t===`bbb`){let e=document.createElement(`video`);return e.src=T,e.muted=!0,e.loop=!0,e.playsInline=!0,e.autoplay=!0,e.crossOrigin=`anonymous`,e.style.display=`block`,e.style.margin=`40px auto`,e.style.maxWidth=`80vw`,e.play(),r.add(e,{effect:a}),e}let o=document.createElement(`img`);return o.src=R[t],o.style.display=`block`,o.style.margin=`40px auto`,r.add(o,{effect:a}),o},args:{src:`Jellyfish`,quality:.4,seed:.25,iterations:24,resolutionScale:1,randomFlip:!0,vertical:!1,speed:0},argTypes:{src:{control:{type:`select`},options:[`Jellyfish`,`Logo`,`Pigeon`,`bbb`]},quality:{control:{type:`range`,min:0,max:1,step:.01}},seed:{control:{type:`range`,min:0,max:1,step:.01}},iterations:{control:{type:`range`,min:1,max:30,step:1}},resolutionScale:{control:{type:`range`,min:0,max:1,step:.01}},randomFlip:{control:{type:`boolean`}},vertical:{control:{type:`boolean`}},speed:{control:{type:`range`,min:0,max:30,step:.5}}},parameters:{chromatic:{disableSnapshot:!0}}},B={render:()=>{let e=document.createElement(`img`);return e.src=E,e},args:void 0},B.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let n=i(),r=new C;await n.add(t,{effect:r}),o(`Fluid`,r),M(e)},V={render:()=>{let e=document.createElement(`img`);return e.src=E,e},args:void 0},V.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let a=i(),o={Jellyfish:E,Logo:u},s=null,c=async()=>{let e=s?{...s.params}:{};s&&(a.remove(t),n()),s=new _(e),await a.add(t,{effect:s}),r(`Halftone`,s,{img:t,sources:o,onSrcChange:async e=>{t.src=o[e],await new Promise(e=>{t.onload=()=>e()}),await c()}})};await c()},H={render:()=>{let e=document.createElement(`img`);return e.src=u,e},args:void 0},H.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=()=>e()});let r=i(),o={Jellyfish:E,Logo:u},s=null,c=async()=>{let e=s?{...s.params}:P()?{count:256*256}:{};s&&(r.remove(t),n()),s=new x(e),await r.add(t,{effect:s}),a(`Particle`,s,{img:t,sources:o,onSrcChange:async e=>{t.src=o[e],await new Promise(e=>{t.onload=()=>e()}),await c()}})};await c(),M(e)},U={render:()=>{let e=document.createElement(`img`);return e.src=u,e},args:void 0},U.play=async({canvasElement:e})=>{let r=e.querySelector(`img`);await new Promise(e=>{r.onload=()=>e()}),await new Promise(e=>requestAnimationFrame(()=>e(void 0)));let a=i(),o={Logo:u,Jellyfish:E},s=null,c=async()=>{let e=s?{...s.params}:{};s&&(a.remove(r),n()),await new Promise(e=>requestAnimationFrame(()=>e(void 0))),s=new y(e),await a.add(r,{effect:s}),t(`Particle Explode`,s,{img:r,sources:o,onSrcChange:async e=>{r.src=o[e],await new Promise(e=>{r.onload=()=>e()}),await c()}})};await c()},W={render:e=>{let{src:t,...n}=e,r=i(),a=new v(n);if(t===`Webpage`){let e=document.getElementById(`storybook-root`);e&&(e.style.height=`auto`,e.style.display=`block`);let t=document.createElement(`div`);t.style.display=`flex`,t.style.justifyContent=`center`;let n=A();return t.appendChild(n),r.addHTML(n,{effect:a}),t}let o=document.createElement(`img`);return o.src=t===`Jellyfish`?E:u,r.add(o,{effect:a}),o},args:{src:`Webpage`,cellSize:40,pressRadius:200,press:1,flatCells:!1,seed:0,speed:0,breathe:0,breatheSpeed:0,breatheScale:40,bgColor:`#00000000`},argTypes:{src:{control:{type:`select`},options:[`Logo`,`Jellyfish`,`Webpage`]},cellSize:{control:{type:`range`,min:5,max:200,step:1}},pressRadius:{control:{type:`range`,min:0,max:800,step:10}},press:{control:{type:`range`,min:0,max:1,step:.01}},flatCells:{control:{type:`boolean`}},seed:{control:{type:`range`,min:0,max:1e3,step:1}},speed:{control:{type:`range`,min:0,max:5,step:.05}},breathe:{control:{type:`range`,min:0,max:1,step:.01}},breatheSpeed:{control:{type:`range`,min:0,max:5,step:.05}},breatheScale:{control:{type:`range`,min:10,max:500,step:5}},bgColor:{control:{type:`color`}}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    img.style.display = "block";
    img.style.margin = "40px auto";
    return img;
  },
  args: undefined
}`,...F.parameters?.docs?.source}}},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Jellyfish;
    return img;
  },
  args: undefined
}`,...I.parameters?.docs?.source}}},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Jellyfish;
    return img;
  },
  args: undefined,
  parameters: {
    chromatic: {
      disableSnapshot: true
    }
  }
}`,...L.parameters?.docs?.source}}},z.parameters={...z.parameters,docs:{...z.parameters?.docs,source:{originalSource:`{
  render: args => {
    const {
      src,
      ...params
    } = args;
    const vfx = initVFX();
    const effect = new JPEGGlitchEffect(params);
    attachOutputFpsMeter(effect);

    // bbb is a video; the rest are images.
    if (src === "bbb") {
      const video = document.createElement("video");
      video.src = BbbWebm;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.autoplay = true;
      video.crossOrigin = "anonymous";
      video.style.display = "block";
      video.style.margin = "40px auto";
      video.style.maxWidth = "80vw";
      void video.play();
      vfx.add(video, {
        effect
      });
      return video;
    }
    const img = document.createElement("img");
    img.src = JPEG_GLITCH_IMAGES[src];
    img.style.display = "block";
    img.style.margin = "40px auto";
    vfx.add(img, {
      effect
    });
    return img;
  },
  args: {
    src: "Jellyfish",
    quality: 0.4,
    seed: 0.25,
    iterations: 24,
    resolutionScale: 1,
    randomFlip: true,
    vertical: false,
    speed: 0
  },
  argTypes: {
    src: {
      control: {
        type: "select"
      },
      options: ["Jellyfish", "Logo", "Pigeon", "bbb"]
    },
    quality: {
      control: {
        type: "range",
        min: 0,
        max: 1,
        step: 0.01
      }
    },
    seed: {
      control: {
        type: "range",
        min: 0,
        max: 1,
        step: 0.01
      }
    },
    iterations: {
      control: {
        type: "range",
        min: 1,
        max: 30,
        step: 1
      }
    },
    resolutionScale: {
      control: {
        type: "range",
        min: 0,
        max: 1,
        step: 0.01
      }
    },
    randomFlip: {
      control: {
        type: "boolean"
      }
    },
    vertical: {
      control: {
        type: "boolean"
      }
    },
    speed: {
      control: {
        type: "range",
        min: 0,
        max: 30,
        step: 0.5
      }
    }
  },
  parameters: {
    chromatic: {
      disableSnapshot: true
    }
  }
}`,...z.parameters?.docs?.source}}},B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Jellyfish;
    return img;
  },
  args: undefined
}`,...B.parameters?.docs?.source}}},V.parameters={...V.parameters,docs:{...V.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Jellyfish;
    return img;
  },
  args: undefined
}`,...V.parameters?.docs?.source}}},H.parameters={...H.parameters,docs:{...H.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
  },
  args: undefined
}`,...H.parameters?.docs?.source}}},U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
  },
  args: undefined
}`,...U.parameters?.docs?.source}}},W.parameters={...W.parameters,docs:{...W.parameters?.docs,source:{originalSource:`{
  render: args => {
    const {
      src,
      ...effectArgs
    } = args;
    const vfx = initVFX();
    const effect = new VoronoiEffect(effectArgs);
    if (src === "Webpage") {
      // Webpage is taller than the viewport — switch storybook-root
      // from its default flex-centred layout (preset.css) to block
      // so the article anchors at the top and the page scrolls.
      const root = document.getElementById("storybook-root");
      if (root) {
        root.style.height = "auto";
        root.style.display = "block";
      }

      // wrapElement needs a parentNode at addHTML time so it can
      // splice the canvas wrapper between parent and target.
      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.justifyContent = "center";
      const article = createVoronoiWebpage();
      wrapper.appendChild(article);
      vfx.addHTML(article, {
        effect
      });
      return wrapper;
    }
    const img = document.createElement("img");
    img.src = src === "Jellyfish" ? Jellyfish : Logo;
    vfx.add(img, {
      effect
    });
    return img;
  },
  args: {
    src: "Webpage",
    cellSize: 40,
    pressRadius: 200,
    press: 1,
    flatCells: false,
    seed: 0,
    speed: 0,
    breathe: 0,
    breatheSpeed: 0,
    breatheScale: 40,
    bgColor: "#00000000"
  },
  argTypes: {
    src: {
      control: {
        type: "select"
      },
      options: ["Logo", "Jellyfish", "Webpage"]
    },
    cellSize: {
      control: {
        type: "range",
        min: 5,
        max: 200,
        step: 1
      }
    },
    pressRadius: {
      control: {
        type: "range",
        min: 0,
        max: 800,
        step: 10
      }
    },
    press: {
      control: {
        type: "range",
        min: 0,
        max: 1,
        step: 0.01
      }
    },
    flatCells: {
      control: {
        type: "boolean"
      }
    },
    seed: {
      control: {
        type: "range",
        min: 0,
        max: 1000,
        step: 1
      }
    },
    speed: {
      control: {
        type: "range",
        min: 0,
        max: 5,
        step: 0.05
      }
    },
    breathe: {
      control: {
        type: "range",
        min: 0,
        max: 1,
        step: 0.01
      }
    },
    breatheSpeed: {
      control: {
        type: "range",
        min: 0,
        max: 5,
        step: 0.05
      }
    },
    breatheScale: {
      control: {
        type: "range",
        min: 10,
        max: 500,
        step: 5
      }
    },
    bgColor: {
      control: {
        type: "color"
      }
    }
  }
}`,...W.parameters?.docs?.source}}},G=[`bloom`,`crtBloom`,`pixelSort`,`jpegGlitch`,`fluid`,`halftone`,`particle`,`particleExplode`,`voronoi`]}))();export{G as __namedExportsOrder,F as bloom,I as crtBloom,N as default,B as fluid,V as halftone,z as jpegGlitch,H as particle,U as particleExplode,L as pixelSort,W as voronoi};
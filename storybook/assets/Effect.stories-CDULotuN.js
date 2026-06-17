import{n as e}from"./chunk-BneVvdWh.js";import{a as t,c as n,d as r,i,l as a,n as o,o as s,s as c,t as l,u}from"./utils-BZfInwET.js";import{n as d,t as f}from"./logo-640w-20p-DamX1-bG.js";import{t as ee}from"./preset-B7f9t9lo.js";import{C as te,S as p,_ as ne,a as re,c as ie,d as ae,f as m,g as oe,h as se,i as ce,l as le,m as ue,n as de,o as fe,p as pe,r as me,s as he,t as ge,u as _e,v as ve,w as h,x as ye,y as be}from"./esm-BuZrl-JN.js";import{n as xe,t as g}from"./bbb-aniiCR4j.js";import{n as _,t as v}from"./jellyfish-CbdkhNBT.js";import{n as y,t as Se}from"./pigeon-CsBwBuXA.js";function b(e,t,n,r={}){let{src:i=_,clock:a=!0}=r;return{render:t=>{let n=a&&T(),r=u(n?{timeScale:0}:void 0),s=document.createElement(`img`);s.src=i,s.style.display=`block`,s.style.margin=`40px auto`,s.style.maxWidth=`80vw`;let c=r.add(s,{effect:e(t)});return a&&(n?c.then(()=>{r.setTime(E),r.render()}):o(r)),s},args:t,argTypes:n}}function x(e){let t=e.trim().replace(/^#/,``);if(t.length===3&&(t=t.split(``).map(e=>e+e).join(``)),t.length!==6)return[0,0,0,1];let n=Number.parseInt(t,16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255,1]}function Ce(){let e=document.createElement(`article`);e.style.cssText=`width: 600px; padding: 32px; background: #fff; color: #202122; font-family: sans-serif; line-height: 1.6; border: 1px solid #a2a9b1;`;let t=`font-family: serif; font-weight: normal; border-bottom: 1px solid #a2a9b1; padding-bottom: 4px; margin-top: 24px;`,n=`margin: 20px 0; text-align: center;`,r=`font-size: 0.85em; color: #54595d; margin-top: 4px;`,i=`width: 100%; height: auto; max-width: 480px; background: #f8f9fa; border: 1px solid #a2a9b1;`;return e.innerHTML=`
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
    `,e}function we(e){document.getElementById(`jpeg-glitch-fps`)?.remove();let t=document.createElement(`div`);t.id=`jpeg-glitch-fps`,t.style.cssText=`position:fixed;top:8px;left:8px;z-index:2147483647;font:12px/1.4 monospace;color:#0f0;background:rgba(0,0,0,0.6);padding:2px 8px;border-radius:3px;pointer-events:none;`,t.textContent=`-- fps`,document.body.appendChild(t);let n=performance.now(),r=e.producedFrames,i=()=>{if(!t.isConnected)return;let a=performance.now(),o=a-n;if(o>=500){let i=e.producedFrames;t.textContent=`${((i-r)*1e3/o).toFixed(1)} fps`,n=a,r=i}requestAnimationFrame(i)};requestAnimationFrame(i)}function S(e){let t=Math.round(window.innerWidth/2),n=Math.round(window.innerHeight/2),r=Math.min(t,n)*.4,i=0,a=window.setInterval(()=>{let o=i/60*Math.PI*2;e.dispatchEvent(new MouseEvent(`pointermove`,{clientX:t+Math.cos(o)*r,clientY:n+Math.sin(o)*r,bubbles:!0})),i++,i>120&&clearInterval(a)},16)}function Te(){let e=document.createElement(`div`);return e.style.width=`100%`,e.style.boxSizing=`border-box`,e.style.padding=`24px`,e.style.background=`#ffffff`,e.style.color=`#111111`,e.style.fontFamily=`sans-serif`,e.style.fontSize=`2.5rem`,e.innerHTML=`
        <h1 style="margin: 0 0 12px;">HTML input sample</h1>
        <p style="margin: 0 0 16px; line-height: 1.5;">
            A plain HTML block captured by VFX-JS and turned into ASCII.
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
        <input type="text" value="Type here"
               style="font-size: inherit; padding: 6px 8px; margin-right: 8px;" />
        <button style="font-size: inherit; padding: 6px 14px;">Submit</button>
    `,e}function C(e,t,n){let r=e=>{e.style.display=`block`,e.style.margin=`40px auto`,e.style.maxWidth=`80vw`};if(t===`HTML`){let t=document.createElement(`div`);t.style.display=`flex`,t.style.justifyContent=`center`,t.style.margin=`40px auto`;let r=document.createElement(`div`);r.style.width=`900px`,r.style.maxWidth=`90vw`;let i=Te();return r.appendChild(i),t.appendChild(r),e.addHTML(i,{effect:n}),t}if(t===`WebCam`){let t=document.createElement(`video`);return t.muted=!0,t.loop=!0,t.playsInline=!0,t.autoplay=!0,r(t),navigator.mediaDevices?.getUserMedia({video:!0}).then(e=>{t.srcObject=e,t.play()}).catch(e=>console.warn(`[ascii story] webcam unavailable:`,e)),e.add(t,{effect:n}),t}let i=document.createElement(`img`);return i.src=t===`Jellyfish`?_:y,r(i),e.add(i,{effect:n}),i}function Ee(e,t,n){let r=document.createElement(`canvas`);r.width=64,r.height=64;let i=r.getContext(`2d`);if(i){let r=t>1?e/(t-1):1,a=`hsl(${e/Math.max(1,t)*360}, 85%, 55%)`;if(i.fillStyle=a,i.strokeStyle=a,n===`squares`){let e=6+r*50;i.fillRect(32-e/2,32-e/2,e,e)}else n===`rings`?(i.lineWidth=2+r*9,i.beginPath(),i.arc(32,32,6+r*22,0,Math.PI*2),i.stroke()):(i.beginPath(),i.arc(32,32,3+r*27,0,Math.PI*2),i.fill())}return r}var w,T,E,D,O,k,A,j,M,N,P,F,I,L,R,z,B,V,H,U,W,G,K,q,J,Y,X,Z,Q,$;e((()=>{ge(),xe(),v(),f(),Se(),ee(),r(),w={title:`Effect`,parameters:{layout:`fullscreen`}},T=()=>typeof navigator<`u`&&/Chromatic/.test(navigator.userAgent),E=2,D={render:()=>{let e=document.createElement(`img`);return e.src=d,e.style.display=`block`,e.style.margin=`40px auto`,e},args:void 0},D.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let n=u(),r=new p({threshold:.2,softness:.1,intensity:5,scatter:1,dither:0,edgeFade:0,pad:50});await n.add(t,{effect:r}),l(`Bloom`,r)},O={render:()=>{let e=document.createElement(`img`);return e.src=_,e},args:void 0},O.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let n=u(),r=new p({threshold:.01,softness:.2,intensity:10,scatter:1,dither:0,edgeFade:.02,pad:200});await n.add(t,{effect:[new ae({size:10}),new fe({spacing:5}),r]}),l(`CRT Bloom`,r)},k={render:()=>{let e=document.createElement(`img`);return e.src=_,e},args:void 0,parameters:{chromatic:{disableSnapshot:!0}}},k.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let r=u(),i=new _e({range:[.5,1],direction:`up`,angle:30});await r.add(t,{effect:i}),n(`Pixel Sort`,i)},A={Jellyfish:_,Logo:d,Pigeon:y},j={render:e=>{let{src:t,...n}=e,r=u(),i=new ue(n);if(we(i),t===`bbb`){let e=document.createElement(`video`);return e.src=g,e.muted=!0,e.loop=!0,e.playsInline=!0,e.autoplay=!0,e.crossOrigin=`anonymous`,e.style.display=`block`,e.style.margin=`40px auto`,e.style.maxWidth=`80vw`,e.play(),r.add(e,{effect:i}),e}let a=document.createElement(`img`);return a.src=A[t],a.style.display=`block`,a.style.margin=`40px auto`,r.add(a,{effect:i}),a},args:{src:`Jellyfish`,quality:.4,seed:.25,iterations:24,resolutionScale:1,randomFlip:!0,vertical:!1,speed:0},argTypes:{src:{control:{type:`select`},options:[`Jellyfish`,`Logo`,`Pigeon`,`bbb`]},quality:{control:{type:`range`,min:0,max:1,step:.01}},seed:{control:{type:`range`,min:0,max:1,step:.01}},iterations:{control:{type:`range`,min:1,max:30,step:1}},resolutionScale:{control:{type:`range`,min:0,max:1,step:.01}},randomFlip:{control:{type:`boolean`}},vertical:{control:{type:`boolean`}},speed:{control:{type:`range`,min:0,max:30,step:.5}}},parameters:{chromatic:{disableSnapshot:!0}}},M={Jellyfish:_,Logo:d,Pigeon:y},N={render:e=>{let{src:t,...n}=e,r=u(),i=new te(n);if(t===`bbb`){let e=document.createElement(`video`);return e.src=g,e.muted=!0,e.loop=!0,e.playsInline=!0,e.autoplay=!0,e.crossOrigin=`anonymous`,e.style.display=`block`,e.style.margin=`40px auto`,e.style.maxWidth=`80vw`,e.play(),r.add(e,{effect:i}),e}let a=document.createElement(`img`);return a.src=M[t],a.style.display=`block`,a.style.margin=`40px auto`,r.add(a,{effect:i}),a},args:{src:`Jellyfish`,quality:8,iterations:3,downscale:1},argTypes:{src:{control:{type:`select`},options:[`Jellyfish`,`Logo`,`Pigeon`,`bbb`]},quality:{control:{type:`range`,min:1,max:100,step:1}},iterations:{control:{type:`range`,min:1,max:10,step:1}},downscale:{control:{type:`range`,min:.02,max:1,step:.01}}},parameters:{chromatic:{disableSnapshot:!0}}},P={render:()=>{let e=document.createElement(`img`);return e.src=_,e},args:void 0},P.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let n=u(),r=new ve;await n.add(t,{effect:r}),i(`Fluid`,r),S(e)},F={render:()=>{let e=document.createElement(`img`);return e.src=_,e},args:void 0},F.play=async({canvasElement:e})=>{let n=e.querySelector(`img`);await new Promise(e=>{n.onload=e});let r=u(),i={Jellyfish:_,Logo:d},o=null,s=async()=>{let e=o?{...o.params}:{};o&&(r.remove(n),a()),o=new oe(e),await r.add(n,{effect:o}),t(`Halftone`,o,{img:n,sources:i,onSrcChange:async e=>{n.src=i[e],await new Promise(e=>{n.onload=()=>e()}),await s()}})};await s()},I={render:()=>{let e=document.createElement(`img`);return e.src=d,e},args:void 0},I.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=()=>e()});let n=u(),r={Jellyfish:_,Logo:d},i=null,o=async()=>{let e=i?{...i.params}:T()?{count:256*256}:{};i&&(n.remove(t),a()),i=new pe(e),await n.add(t,{effect:i}),c(`Particle`,i,{img:t,sources:r,onSrcChange:async e=>{t.src=r[e],await new Promise(e=>{t.onload=()=>e()}),await o()}})};await o(),S(e)},L={render:()=>{let e=document.createElement(`img`);return e.src=d,e},args:void 0},L.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=()=>e()}),await new Promise(e=>requestAnimationFrame(()=>e(void 0)));let n=u(),r={Logo:d,Jellyfish:_},i=null,o=async()=>{let e=i?{...i.params}:{};i&&(n.remove(t),a()),await new Promise(e=>requestAnimationFrame(()=>e(void 0))),i=new m(e),await n.add(t,{effect:i}),s(`Particle Explode`,i,{img:t,sources:r,onSrcChange:async e=>{t.src=r[e],await new Promise(e=>{t.onload=()=>e()}),await o()}})};await o()},R={render:e=>{let{src:t,...n}=e,r=u(),i=new de(n);if(t===`Webpage`){let e=document.getElementById(`storybook-root`);e&&(e.style.height=`auto`,e.style.display=`block`);let t=document.createElement(`div`);t.style.display=`flex`,t.style.justifyContent=`center`;let n=Ce();return t.appendChild(n),r.addHTML(n,{effect:i}),t}let a=document.createElement(`img`);return a.src=t===`Jellyfish`?_:d,r.add(a,{effect:i}),a},args:{src:`Webpage`,cellSize:40,pressRadius:200,press:1,flatCells:!1,seed:0,speed:0,breathe:0,breatheSpeed:0,breatheScale:40,bgColor:`#00000000`},argTypes:{src:{control:{type:`select`},options:[`Logo`,`Jellyfish`,`Webpage`]},cellSize:{control:{type:`range`,min:5,max:200,step:1}},pressRadius:{control:{type:`range`,min:0,max:800,step:10}},press:{control:{type:`range`,min:0,max:1,step:.01}},flatCells:{control:{type:`boolean`}},seed:{control:{type:`range`,min:0,max:1e3,step:1}},speed:{control:{type:`range`,min:0,max:5,step:.05}},breathe:{control:{type:`range`,min:0,max:1,step:.01}},breatheSpeed:{control:{type:`range`,min:0,max:5,step:.05}},breatheScale:{control:{type:`range`,min:10,max:500,step:5}},bgColor:{control:{type:`color`}}}},z=b(e=>new ne(e),{speed:1,intensity:1},{speed:{control:{type:`range`,min:0,max:5,step:.05}},intensity:{control:{type:`range`,min:0,max:3,step:.05}}}),B=b(e=>new he(e),{speed:1,amount:10},{speed:{control:{type:`range`,min:0,max:5,step:.05}},amount:{control:{type:`range`,min:0,max:60,step:1}}}),V=b(e=>new ie(e),{speed:1,amount:.05},{speed:{control:{type:`range`,min:0,max:5,step:.05}},amount:{control:{type:`range`,min:0,max:.3,step:.005}}}),H=b(e=>new le(e),{speed:1,frequency:1},{speed:{control:{type:`range`,min:0,max:5,step:.05}},frequency:{control:{type:`range`,min:.1,max:8,step:.1}}}),U=b(e=>new re(e),{speed:1,amount:20,frequency:7,blur:2},{speed:{control:{type:`range`,min:0,max:5,step:.05}},amount:{control:{type:`range`,min:0,max:100,step:1}},frequency:{control:{type:`range`,min:1,max:30,step:.5}},blur:{control:{type:`range`,min:0,max:20,step:.5}}}),W=b(e=>new be({color1:x(e.color1),color2:x(e.color2),speed:e.speed}),{color1:`#ff0000`,color2:`#0000ff`,speed:.2},{color1:{control:{type:`color`}},color2:{control:{type:`color`}},speed:{control:{type:`range`,min:0,max:5,step:.05}}}),G=b(e=>new ce({color1:x(e.color1),color2:x(e.color2),color3:x(e.color3),speed:e.speed}),{color1:`#ff0000`,color2:`#00ff00`,color3:`#0000ff`,speed:.2},{color1:{control:{type:`color`}},color2:{control:{type:`color`}},color3:{control:{type:`color`}},speed:{control:{type:`range`,min:0,max:5,step:.05}}}),K=b(e=>new se(e),{shift:.5},{shift:{control:{type:`range`,min:0,max:1,step:.01}}},{clock:!1}),q=b(e=>new me(e),{intensity:.5,radius:1,power:2},{intensity:{control:{type:`range`,min:0,max:2,step:.01}},radius:{control:{type:`range`,min:0,max:2,step:.01}},power:{control:{type:`range`,min:.1,max:5,step:.1}}},{clock:!1,src:y}),J=b(e=>new ye(e),{intensity:.3,radius:0,power:2},{intensity:{control:{type:`range`,min:0,max:3,step:.01}},radius:{control:{type:`range`,min:0,max:2,step:.01}},power:{control:{type:`range`,min:.1,max:5,step:.1}}},{clock:!1,src:y}),Y=[`Pigeon`,`Jellyfish`,`WebCam`,`HTML`],X={render:e=>{let t=u(),n=new h({preset:e.preset,grid:[e.gridX,e.gridY],font:e.font,fontWeight:e.fontWeight,color:x(e.color),background:x(e.background),colorFromSource:e.colorFromSource,invert:e.invert,dither:e.dither});return C(t,e.src,n)},args:{src:`Pigeon`,preset:`standard`,gridX:8,gridY:14,font:`monospace`,fontWeight:`normal`,color:`#ffffff`,background:`#000000`,colorFromSource:!1,invert:!1,dither:0},argTypes:{src:{control:{type:`select`},options:Y},preset:{control:{type:`select`},options:[`standard`,`minimal`,`blocks`,`dots`,`circles`,`detailed`]},gridX:{control:{type:`range`,min:4,max:48,step:1}},gridY:{control:{type:`range`,min:4,max:48,step:1}},font:{control:{type:`text`}},fontWeight:{control:{type:`select`},options:[`normal`,`bold`,`100`,`300`,`600`,`900`]},color:{control:{type:`color`}},background:{control:{type:`color`}},colorFromSource:{control:{type:`boolean`}},invert:{control:{type:`boolean`}},dither:{control:{type:`range`,min:0,max:1,step:.05}}}},Z=[`dots`,`rings`,`squares`],Q={render:e=>{let t=u(),n=new h({tiles:Array.from({length:6},(t,n)=>Ee(n,6,e.preset)),grid:e.grid,background:[0,0,0,1]});return C(t,e.src,n)},args:{src:`Pigeon`,preset:`dots`,grid:14},argTypes:{src:{control:{type:`select`},options:Y},preset:{control:{type:`select`},options:Z},grid:{control:{type:`range`,min:4,max:48,step:1}}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    img.style.display = "block";
    img.style.margin = "40px auto";
    return img;
  },
  args: undefined
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Jellyfish;
    return img;
  },
  args: undefined
}`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
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
}`,...k.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
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
}`,...j.parameters?.docs?.source}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  render: args => {
    const {
      src,
      ...params
    } = args;
    const vfx = initVFX();
    const effect = new BadJpegEffect(params);

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
    img.src = BAD_JPEG_IMAGES[src];
    img.style.display = "block";
    img.style.margin = "40px auto";
    vfx.add(img, {
      effect
    });
    return img;
  },
  args: {
    src: "Jellyfish",
    quality: 8,
    iterations: 3,
    downscale: 1
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
        min: 1,
        max: 100,
        step: 1
      }
    },
    iterations: {
      control: {
        type: "range",
        min: 1,
        max: 10,
        step: 1
      }
    },
    downscale: {
      control: {
        type: "range",
        min: 0.02,
        max: 1,
        step: 0.01
      }
    }
  },
  parameters: {
    chromatic: {
      disableSnapshot: true
    }
  }
}`,...N.parameters?.docs?.source}}},P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Jellyfish;
    return img;
  },
  args: undefined
}`,...P.parameters?.docs?.source}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Jellyfish;
    return img;
  },
  args: undefined
}`,...F.parameters?.docs?.source}}},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
  },
  args: undefined
}`,...I.parameters?.docs?.source}}},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
  },
  args: undefined
}`,...L.parameters?.docs?.source}}},R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
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
}`,...R.parameters?.docs?.source}}},z.parameters={...z.parameters,docs:{...z.parameters?.docs,source:{originalSource:`presetStory<GlitchArgs>(a => new GlitchEffect(a), {
  speed: 1,
  intensity: 1
}, {
  speed: {
    control: {
      type: "range",
      min: 0,
      max: 5,
      step: 0.05
    }
  },
  intensity: {
    control: {
      type: "range",
      min: 0,
      max: 3,
      step: 0.05
    }
  }
})`,...z.parameters?.docs?.source}}},B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`presetStory<RgbShiftArgs>(a => new RgbShiftEffect(a), {
  speed: 1,
  amount: 10
}, {
  speed: {
    control: {
      type: "range",
      min: 0,
      max: 5,
      step: 0.05
    }
  },
  amount: {
    control: {
      type: "range",
      min: 0,
      max: 60,
      step: 1
    }
  }
})`,...B.parameters?.docs?.source}}},V.parameters={...V.parameters,docs:{...V.parameters?.docs,source:{originalSource:`presetStory<RgbGlitchArgs>(a => new RgbGlitchEffect(a), {
  speed: 1,
  amount: 0.05
}, {
  speed: {
    control: {
      type: "range",
      min: 0,
      max: 5,
      step: 0.05
    }
  },
  amount: {
    control: {
      type: "range",
      min: 0,
      max: 0.3,
      step: 0.005
    }
  }
})`,...V.parameters?.docs?.source}}},H.parameters={...H.parameters,docs:{...H.parameters?.docs,source:{originalSource:`presetStory<RainbowArgs>(a => new RainbowEffect(a), {
  speed: 1,
  frequency: 1
}, {
  speed: {
    control: {
      type: "range",
      min: 0,
      max: 5,
      step: 0.05
    }
  },
  frequency: {
    control: {
      type: "range",
      min: 0.1,
      max: 8,
      step: 0.1
    }
  }
})`,...H.parameters?.docs?.source}}},U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`presetStory<SinewaveArgs>(a => new SinewaveEffect(a), {
  speed: 1,
  amount: 20,
  frequency: 7,
  blur: 2
}, {
  speed: {
    control: {
      type: "range",
      min: 0,
      max: 5,
      step: 0.05
    }
  },
  amount: {
    control: {
      type: "range",
      min: 0,
      max: 100,
      step: 1
    }
  },
  frequency: {
    control: {
      type: "range",
      min: 1,
      max: 30,
      step: 0.5
    }
  },
  blur: {
    control: {
      type: "range",
      min: 0,
      max: 20,
      step: 0.5
    }
  }
})`,...U.parameters?.docs?.source}}},W.parameters={...W.parameters,docs:{...W.parameters?.docs,source:{originalSource:`presetStory<DuotoneArgs>(a => new DuotoneEffect({
  color1: hexToRgba(a.color1),
  color2: hexToRgba(a.color2),
  speed: a.speed
}), {
  color1: "#ff0000",
  color2: "#0000ff",
  speed: 0.2
}, {
  color1: {
    control: {
      type: "color"
    }
  },
  color2: {
    control: {
      type: "color"
    }
  },
  speed: {
    control: {
      type: "range",
      min: 0,
      max: 5,
      step: 0.05
    }
  }
})`,...W.parameters?.docs?.source}}},G.parameters={...G.parameters,docs:{...G.parameters?.docs,source:{originalSource:`presetStory<TritoneArgs>(a => new TritoneEffect({
  color1: hexToRgba(a.color1),
  color2: hexToRgba(a.color2),
  color3: hexToRgba(a.color3),
  speed: a.speed
}), {
  color1: "#ff0000",
  color2: "#00ff00",
  color3: "#0000ff",
  speed: 0.2
}, {
  color1: {
    control: {
      type: "color"
    }
  },
  color2: {
    control: {
      type: "color"
    }
  },
  color3: {
    control: {
      type: "color"
    }
  },
  speed: {
    control: {
      type: "range",
      min: 0,
      max: 5,
      step: 0.05
    }
  }
})`,...G.parameters?.docs?.source}}},K.parameters={...K.parameters,docs:{...K.parameters?.docs,source:{originalSource:`presetStory<HueShiftArgs>(a => new HueShiftEffect(a), {
  shift: 0.5
}, {
  shift: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  }
}, {
  clock: false
})`,...K.parameters?.docs?.source}}},q.parameters={...q.parameters,docs:{...q.parameters?.docs,source:{originalSource:`presetStory<VignetteArgs>(a => new VignetteEffect(a), {
  intensity: 0.5,
  radius: 1.0,
  power: 2.0
}, {
  intensity: {
    control: {
      type: "range",
      min: 0,
      max: 2,
      step: 0.01
    }
  },
  radius: {
    control: {
      type: "range",
      min: 0,
      max: 2,
      step: 0.01
    }
  },
  power: {
    control: {
      type: "range",
      min: 0.1,
      max: 5,
      step: 0.1
    }
  }
}, {
  clock: false,
  src: Pigeon
})`,...q.parameters?.docs?.source}}},J.parameters={...J.parameters,docs:{...J.parameters?.docs,source:{originalSource:`presetStory<ChromaticArgs>(a => new ChromaticEffect(a), {
  intensity: 0.3,
  radius: 0.0,
  power: 2.0
}, {
  intensity: {
    control: {
      type: "range",
      min: 0,
      max: 3,
      step: 0.01
    }
  },
  radius: {
    control: {
      type: "range",
      min: 0,
      max: 2,
      step: 0.01
    }
  },
  power: {
    control: {
      type: "range",
      min: 0.1,
      max: 5,
      step: 0.1
    }
  }
}, {
  clock: false,
  src: Pigeon
})`,...J.parameters?.docs?.source}}},X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`{
  render: a => {
    const vfx = initVFX();
    const effect = new AsciiEffect({
      preset: a.preset,
      grid: [a.gridX, a.gridY],
      font: a.font,
      fontWeight: a.fontWeight,
      color: hexToRgba(a.color),
      background: hexToRgba(a.background),
      colorFromSource: a.colorFromSource,
      invert: a.invert,
      dither: a.dither
    });
    return addAsciiSource(vfx, a.src, effect);
  },
  args: {
    src: "Pigeon",
    preset: "standard",
    gridX: 8,
    gridY: 14,
    font: "monospace",
    fontWeight: "normal",
    color: "#ffffff",
    background: "#000000",
    colorFromSource: false,
    invert: false,
    dither: 0
  },
  argTypes: {
    src: {
      control: {
        type: "select"
      },
      options: ASCII_SRCS
    },
    preset: {
      control: {
        type: "select"
      },
      options: ["standard", "minimal", "blocks", "dots", "circles", "detailed"]
    },
    gridX: {
      control: {
        type: "range",
        min: 4,
        max: 48,
        step: 1
      }
    },
    gridY: {
      control: {
        type: "range",
        min: 4,
        max: 48,
        step: 1
      }
    },
    font: {
      control: {
        type: "text"
      }
    },
    fontWeight: {
      control: {
        type: "select"
      },
      options: ["normal", "bold", "100", "300", "600", "900"]
    },
    color: {
      control: {
        type: "color"
      }
    },
    background: {
      control: {
        type: "color"
      }
    },
    colorFromSource: {
      control: {
        type: "boolean"
      }
    },
    invert: {
      control: {
        type: "boolean"
      }
    },
    dither: {
      control: {
        type: "range",
        min: 0,
        max: 1,
        step: 0.05
      }
    }
  }
}`,...X.parameters?.docs?.source}}},Q.parameters={...Q.parameters,docs:{...Q.parameters?.docs,source:{originalSource:`{
  render: a => {
    const vfx = initVFX();
    const count = 6;
    const tiles = Array.from({
      length: count
    }, (_, i) => makeTileCanvas(i, count, a.preset));
    const effect = new AsciiEffect({
      tiles,
      grid: a.grid,
      background: [0, 0, 0, 1]
    });
    return addAsciiSource(vfx, a.src, effect);
  },
  args: {
    src: "Pigeon",
    preset: "dots",
    grid: 14
  },
  argTypes: {
    src: {
      control: {
        type: "select"
      },
      options: ASCII_SRCS
    },
    preset: {
      control: {
        type: "select"
      },
      options: ASCII_TILE_SHAPES
    },
    grid: {
      control: {
        type: "range",
        min: 4,
        max: 48,
        step: 1
      }
    }
  }
}`,...Q.parameters?.docs?.source}}},$=[`bloom`,`crtBloom`,`pixelSort`,`jpegGlitch`,`badJpeg`,`fluid`,`halftone`,`particle`,`particleExplode`,`voronoi`,`glitch`,`rgbShift`,`rgbGlitch`,`rainbow`,`sinewave`,`duotone`,`tritone`,`hueShift`,`vignette`,`chromatic`,`ascii`,`asciiTiles`]}))();export{$ as __namedExportsOrder,X as ascii,Q as asciiTiles,N as badJpeg,D as bloom,J as chromatic,O as crtBloom,w as default,W as duotone,P as fluid,z as glitch,F as halftone,K as hueShift,j as jpegGlitch,I as particle,L as particleExplode,k as pixelSort,H as rainbow,V as rgbGlitch,B as rgbShift,U as sinewave,G as tritone,q as vignette,R as voronoi};
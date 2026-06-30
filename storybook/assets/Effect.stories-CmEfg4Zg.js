import{n as e}from"./chunk-BneVvdWh.js";import{a as t,c as n,d as r,i,l as a,n as o,o as s,s as c,t as ee,u as l}from"./utils-Cw42DJk4.js";import{n as u,t as te}from"./logo-640w-20p-DamX1-bG.js";import{t as ne}from"./preset-B7f9t9lo.js";import{A as re,C as ie,D as ae,E as oe,M as se,N as ce,S as le,T as ue,_ as de,a as fe,b as pe,c as me,d as he,f as ge,g as _e,h as ve,i as ye,j as d,k as be,l as xe,m as Se,n as Ce,o as we,p as Te,r as Ee,s as De,t as Oe,u as ke,v as Ae,w as je,x as Me,y as Ne}from"./esm-BWVJBmaL.js";import{n as Pe,t as Fe}from"./bbb-aniiCR4j.js";import{n as f,t as Ie}from"./jellyfish-CbdkhNBT.js";import{n as p,t as Le}from"./pigeon-CsBwBuXA.js";function m(e,t,n,r={}){let{src:i=f,clock:a=!0}=r;return{render:t=>{let n=a&&v(),r=l(n?{timeScale:0}:void 0),s=document.createElement(`img`);s.src=i,s.style.display=`block`,s.style.margin=`40px auto`,s.style.maxWidth=`80vw`;let c=r.add(s,{effect:e(t)});return a&&(n?c.then(()=>{r.setTime(y),r.render()}):o(r)),s},args:t,argTypes:n}}function h(e){let t=e.trim().replace(/^#/,``);if(t.length===3&&(t=t.split(``).map(e=>e+e).join(``)),t.length!==6)return[0,0,0,1];let n=Number.parseInt(t,16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255,1]}function Re(e){let t=e>>>0;return()=>{t=t+1831565813|0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}async function g(e,t,n={}){let r=n.steps??qe,i=t.getBoundingClientRect(),a=i.left+i.width/2,o=i.top+i.height/2,s=Math.min(i.width,i.height)*.3,c=Math.random;Math.random=Re(2654435769);try{n.onReady?.();let t=0;for(let n=0;n<r;n++){await new Promise(e=>setTimeout(e,0));let i=n/r*Math.PI*2;window.dispatchEvent(new MouseEvent(`pointermove`,{clientX:a+Math.cos(i)*s,clientY:o+Math.sin(i)*s,bubbles:!0})),t+=Je,e.setTime(t),e.render()}}finally{Math.random=c}}function ze(){let e=document.createElement(`article`);e.style.cssText=`width: 600px; padding: 32px; background: #fff; color: #202122; font-family: sans-serif; line-height: 1.6; border: 1px solid #a2a9b1;`;let t=`font-family: serif; font-weight: normal; border-bottom: 1px solid #a2a9b1; padding-bottom: 4px; margin-top: 24px;`,n=`margin: 20px 0; text-align: center;`,r=`font-size: 0.85em; color: #54595d; margin-top: 4px;`,i=`width: 100%; height: auto; max-width: 480px; background: #f8f9fa; border: 1px solid #a2a9b1;`;return e.innerHTML=`
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
    `,e}function Be(e){document.getElementById(`jpeg-glitch-fps`)?.remove();let t=document.createElement(`div`);t.id=`jpeg-glitch-fps`,t.style.cssText=`position:fixed;top:8px;left:8px;z-index:2147483647;font:12px/1.4 monospace;color:#0f0;background:rgba(0,0,0,0.6);padding:2px 8px;border-radius:3px;pointer-events:none;`,t.textContent=`-- fps`,document.body.appendChild(t);let n=performance.now(),r=e.producedFrames,i=()=>{if(!t.isConnected)return;let a=performance.now(),o=a-n;if(o>=500){let i=e.producedFrames;t.textContent=`${((i-r)*1e3/o).toFixed(1)} fps`,n=a,r=i}requestAnimationFrame(i)};requestAnimationFrame(i)}function Ve(e){let t=Math.round(window.innerWidth/2),n=Math.round(window.innerHeight/2),r=Math.min(t,n)*.4,i=0,a=window.setInterval(()=>{let o=i/60*Math.PI*2;e.dispatchEvent(new MouseEvent(`pointermove`,{clientX:t+Math.cos(o)*r,clientY:n+Math.sin(o)*r,bubbles:!0})),i++,i>120&&clearInterval(a)},16)}function He(){let e=document.createElement(`div`);return e.style.width=`100%`,e.style.boxSizing=`border-box`,e.style.padding=`24px`,e.style.background=`#ffffff`,e.style.color=`#111111`,e.style.fontFamily=`sans-serif`,e.style.fontSize=`2.5rem`,e.innerHTML=`
        <h1 style="margin: 0 0 12px;">HTML input sample</h1>
        <p style="margin: 0 0 16px; line-height: 1.5;">
            A plain HTML block captured by VFX-JS and turned into ASCII.
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
        <input type="text" value="Type here"
               style="font-size: inherit; padding: 6px 8px; margin-right: 8px;" />
        <button style="font-size: inherit; padding: 6px 14px;">Submit</button>
    `,e}function _(e,t,n,r){let i=e=>{r&&Promise.resolve(e).then(r)},a=e=>{e.style.display=`block`,e.style.margin=`40px auto`,e.style.maxWidth=`80vw`};if(t===`HTML`){let t=document.createElement(`div`);t.style.display=`flex`,t.style.justifyContent=`center`,t.style.margin=`40px auto`;let r=document.createElement(`div`);r.style.width=`900px`,r.style.maxWidth=`90vw`;let a=He();return r.appendChild(a),t.appendChild(r),i(e.addHTML(a,{effect:n})),t}if(t===`WebCam`){let t=document.createElement(`video`);return t.muted=!0,t.loop=!0,t.playsInline=!0,t.autoplay=!0,a(t),navigator.mediaDevices?.getUserMedia({video:!0}).then(e=>{t.srcObject=e,t.play()}).catch(e=>console.warn(`[ascii story] webcam unavailable:`,e)),i(e.add(t,{effect:n})),t}let o=document.createElement(`img`);return o.src=it[t]??``+new URL(`pigeon-ScEf6bli.webp`,import.meta.url).href,a(o),i(e.add(o,{effect:n})),o}function Ue(e,t,n){let r=document.createElement(`canvas`);r.width=64,r.height=64;let i=r.getContext(`2d`);if(i){let r=t>1?e/(t-1):1,a=`hsl(${e/Math.max(1,t)*360}, 85%, 55%)`;if(i.fillStyle=a,i.strokeStyle=a,n===`squares`){let e=6+r*50;i.fillRect(32-e/2,32-e/2,e,e)}else n===`rings`?(i.lineWidth=2+r*9,i.beginPath(),i.arc(32,32,6+r*22,0,Math.PI*2),i.stroke()):(i.beginPath(),i.arc(32,32,3+r*27,0,Math.PI*2),i.fill())}return r}var We,v,y,b,x,S,Ge,C,Ke,w,qe,Je,Ye,Xe,T,E,D,O,k,A,j,M,N,P,F,I,Ze,Qe,L,R,z,$e,B,et,V,tt,H,nt,rt,U,W,G,K,q,J,Y,it,X,Z,Q,at,$,ot;e((()=>{Oe(),Pe(),Ie(),te(),Le(),ne(),r(),We={title:`Effect`,parameters:{layout:`fullscreen`}},v=()=>typeof navigator<`u`&&/Chromatic/.test(navigator.userAgent),y=2,b={render:()=>{let e=document.createElement(`img`);return e.src=u,e.style.display=`block`,e.style.margin=`40px auto`,e},args:void 0},b.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let n=l(),r=new d({threshold:.2,softness:.1,intensity:5,scatter:1,dither:0,edgeFade:0,pad:50});await n.add(t,{effect:r}),ee(`Bloom`,r)},x={render:()=>{let e=document.createElement(`img`);return e.src=f,e},args:void 0},x.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let n=l(),r=new d({threshold:.01,softness:.2,intensity:10,scatter:1,dither:0,edgeFade:.02,pad:200});await n.add(t,{effect:[new Se({size:10}),new xe({spacing:5}),r]}),ee(`CRT Bloom`,r)},S={render:()=>{let e=document.createElement(`img`);return e.src=f,e},args:void 0,parameters:{chromatic:{disableSnapshot:!0}}},S.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let r=l(),i=new Te({range:[.5,1],direction:`up`,angle:30});await r.add(t,{effect:i}),n(`Pixel Sort`,i)},Ge={Jellyfish:f,Logo:u,Pigeon:p},C={render:e=>{let{src:t,...n}=e,r=l(),i=new pe(n);if(Be(i),t===`bbb`){let e=document.createElement(`video`);return e.src=Fe,e.muted=!0,e.loop=!0,e.playsInline=!0,e.autoplay=!0,e.crossOrigin=`anonymous`,e.style.display=`block`,e.style.margin=`40px auto`,e.style.maxWidth=`80vw`,e.play(),r.add(e,{effect:i}),e}let a=document.createElement(`img`);return a.src=Ge[t],a.style.display=`block`,a.style.margin=`40px auto`,r.add(a,{effect:i}),a},args:{src:`Jellyfish`,quality:.4,seed:.25,iterations:24,resolutionScale:1,randomFlip:!0,vertical:!1,speed:0},argTypes:{src:{control:{type:`select`},options:[`Jellyfish`,`Logo`,`Pigeon`,`bbb`]},quality:{control:{type:`range`,min:0,max:1,step:.01}},seed:{control:{type:`range`,min:0,max:1,step:.01}},iterations:{control:{type:`range`,min:1,max:30,step:1}},resolutionScale:{control:{type:`range`,min:0,max:1,step:.01}},randomFlip:{control:{type:`boolean`}},vertical:{control:{type:`boolean`}},speed:{control:{type:`range`,min:0,max:30,step:.5}}},parameters:{chromatic:{disableSnapshot:!0}}},Ke={Jellyfish:f,Logo:u,Pigeon:p},w={render:e=>{let{src:t,...n}=e,r=l(),i=new se(n);if(t===`bbb`){let e=document.createElement(`video`);return e.src=Fe,e.muted=!0,e.loop=!0,e.playsInline=!0,e.autoplay=!0,e.crossOrigin=`anonymous`,e.style.display=`block`,e.style.margin=`40px auto`,e.style.maxWidth=`80vw`,e.play(),r.add(e,{effect:i}),e}let a=document.createElement(`img`);return a.src=Ke[t],a.style.display=`block`,a.style.margin=`40px auto`,r.add(a,{effect:i}),a},args:{src:`Jellyfish`,quality:8,iterations:3,downscale:1},argTypes:{src:{control:{type:`select`},options:[`Jellyfish`,`Logo`,`Pigeon`,`bbb`]},quality:{control:{type:`range`,min:1,max:100,step:1}},iterations:{control:{type:`range`,min:1,max:10,step:1}},downscale:{control:{type:`range`,min:.02,max:1,step:.01}}},parameters:{chromatic:{disableSnapshot:!0}}},qe=60,Je=1/60,Ye=40,Xe=24,T=16384,E={render:()=>{let e=document.createElement(`img`);return e.src=f,e},args:void 0},E.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let n=v(),r=l(n?{autoplay:!1}:void 0),a=new ue;if(await r.add(t,{effect:a}),n){await g(r,t);return}i(`Fluid`,a),Ve(e)},D={render:()=>{let e=document.createElement(`img`);return e.src=f,e},args:void 0},D.play=async({canvasElement:e})=>{let n=e.querySelector(`img`);await new Promise(e=>{n.onload=e});let r=l(),i={Jellyfish:f,Logo:u},o=null,s=async()=>{let e=o?{...o.params}:{};o&&(r.remove(n),a()),o=new le(e),await r.add(n,{effect:o}),t(`Halftone`,o,{img:n,sources:i,onSrcChange:async e=>{n.src=i[e],await new Promise(e=>{n.onload=()=>e()}),await s()}})};await s()},O={render:()=>{let e=document.createElement(`img`);return e.src=u,e},args:void 0},O.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);if(await new Promise(e=>{t.onload=()=>e()}),v()){let e=l({autoplay:!1});await e.add(t,{effect:new Ae({count:T})}),await g(e,t,{steps:Ye});return}let n=l(),r={Jellyfish:f,Logo:u},i=null,o=async()=>{let e=i?{...i.params}:{};i&&(n.remove(t),a()),i=new Ae(e),await n.add(t,{effect:i}),c(`Particle`,i,{img:t,sources:r,onSrcChange:async e=>{t.src=r[e],await new Promise(e=>{t.onload=()=>e()}),await o()}})};await o(),Ve(e)},k={render:()=>{let e=document.createElement(`img`);return e.src=u,e},args:void 0},k.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);if(await new Promise(e=>{t.onload=()=>e()}),await new Promise(e=>requestAnimationFrame(()=>e(void 0))),v()){let e=l({autoplay:!1}),n=new de({count:T});await e.add(t,{effect:n}),await g(e,t,{steps:Xe,onReady:()=>n.trigger()});return}let n=l(),r={Logo:u,Jellyfish:f},i=null,o=async()=>{let e=i?{...i.params}:{};i&&(n.remove(t),a()),await new Promise(e=>requestAnimationFrame(()=>e(void 0))),i=new de(e),await n.add(t,{effect:i}),s(`Particle Explode`,i,{img:t,sources:r,onSrcChange:async e=>{t.src=r[e],await new Promise(e=>{t.onload=()=>e()}),await o()}})};await o()},A={render:e=>{let{src:t,...n}=e,r=l(),i=new Ee(n);if(t===`Webpage`){let e=document.getElementById(`storybook-root`);e&&(e.style.height=`auto`,e.style.display=`block`);let t=document.createElement(`div`);t.style.display=`flex`,t.style.justifyContent=`center`;let n=ze();return t.appendChild(n),r.addHTML(n,{effect:i}),t}let a=document.createElement(`img`);return a.src=t===`Jellyfish`?f:u,r.add(a,{effect:i}),a},args:{src:`Webpage`,cellSize:40,pressRadius:200,press:1,flatCells:!1,seed:0,speed:0,breathe:0,breatheSpeed:0,breatheScale:40,bgColor:`#00000000`},argTypes:{src:{control:{type:`select`},options:[`Logo`,`Jellyfish`,`Webpage`]},cellSize:{control:{type:`range`,min:5,max:200,step:1}},pressRadius:{control:{type:`range`,min:0,max:800,step:10}},press:{control:{type:`range`,min:0,max:1,step:.01}},flatCells:{control:{type:`boolean`}},seed:{control:{type:`range`,min:0,max:1e3,step:1}},speed:{control:{type:`range`,min:0,max:5,step:.05}},breathe:{control:{type:`range`,min:0,max:1,step:.01}},breatheSpeed:{control:{type:`range`,min:0,max:5,step:.05}},breatheScale:{control:{type:`range`,min:10,max:500,step:5}},bgColor:{control:{type:`color`}}}},j=m(e=>new je(e),{speed:1,intensity:1},{speed:{control:{type:`range`,min:0,max:5,step:.05}},intensity:{control:{type:`range`,min:0,max:3,step:.05}}}),M=m(e=>new ke(e),{speed:1,amount:10},{speed:{control:{type:`range`,min:0,max:5,step:.05}},amount:{control:{type:`range`,min:0,max:60,step:1}}}),N=m(e=>new he(e),{speed:1,amount:.05},{speed:{control:{type:`range`,min:0,max:5,step:.05}},amount:{control:{type:`range`,min:0,max:.3,step:.005}}}),P=m(e=>new ge(e),{speed:1,frequency:1},{speed:{control:{type:`range`,min:0,max:5,step:.05}},frequency:{control:{type:`range`,min:.1,max:8,step:.1}}}),F=m(e=>new me(e),{speed:1,amount:20,frequency:7,blur:2},{speed:{control:{type:`range`,min:0,max:5,step:.05}},amount:{control:{type:`range`,min:0,max:100,step:1}},frequency:{control:{type:`range`,min:1,max:30,step:.5}},blur:{control:{type:`range`,min:0,max:20,step:.5}}}),I=m(e=>new be(e),{threshold:.2,thickness:3,intensity:4,opacity:0,color1:`#ff0000`,color2:`#0000ff`,background:`#000000`},{threshold:{control:{type:`range`,min:0,max:1,step:.01}},thickness:{control:{type:`range`,min:.5,max:10,step:.5}},intensity:{control:{type:`range`,min:0,max:20,step:.1}},opacity:{control:{type:`range`,min:0,max:1,step:.01}},color1:{control:{type:`color`}},color2:{control:{type:`color`}},background:{control:{type:`color`}}},{clock:!1,src:p}),Ze=[`none`,`repeat`,`mirror`],Qe=[`srgb`,`linear`,`oklab`],L=m(e=>new ie({colors:[e.color1,e.color2,e.color3],scatter:e.scatter,offset:e.offset,repeat:e.repeat,frequency:e.frequency,mixSpace:e.mixSpace,speed:e.speed}),{color1:`#ffffff`,color2:`#3aa0ff`,color3:`#000000`,scatter:0,offset:0,repeat:`none`,frequency:1,mixSpace:`srgb`,speed:0},{color1:{control:{type:`color`}},color2:{control:{type:`color`}},color3:{control:{type:`color`}},scatter:{control:{type:`range`,min:0,max:1,step:.01}},offset:{control:{type:`range`,min:0,max:1,step:.01}},repeat:{control:{type:`select`},options:Ze},frequency:{control:{type:`range`,min:1,max:8,step:1}},mixSpace:{control:{type:`select`},options:Qe},speed:{control:{type:`range`,min:-1,max:1,step:.01}}}),R=m(e=>new De(e),{shift:.5,random:0,centerX:.5,centerY:.5,size:100,angle:0},{shift:{control:{type:`range`,min:-1,max:1,step:.01}},random:{control:{type:`range`,min:0,max:1,step:.01}},centerX:{control:{type:`range`,min:0,max:1,step:.01}},centerY:{control:{type:`range`,min:0,max:1,step:.01}},size:{control:{type:`range`,min:1,max:300,step:1}},angle:{control:{type:`range`,min:-180,max:180,step:1}}},{clock:!1}),z=m(e=>new ve(e),{offset:0,reach:.2,smoothness:0,centerX:.5,centerY:.5,angle:0},{offset:{control:{type:`range`,min:-1,max:1,step:.01}},reach:{control:{type:`range`,min:0,max:1,step:.01}},smoothness:{control:{type:`range`,min:0,max:1,step:.01}},centerX:{control:{type:`range`,min:0,max:1,step:.01}},centerY:{control:{type:`range`,min:0,max:1,step:.01}},angle:{control:{type:`range`,min:-180,max:180,step:1}}},{clock:!1}),$e=[`sine wave`,`twist`,`ripple`],B=m(e=>new Ce(e),{type:`twist`,amplitude:3,frequency:1,centerX:.5,centerY:.5,speed:0},{type:{control:{type:`select`},options:$e},amplitude:{control:{type:`range`,min:-10,max:10,step:.1}},frequency:{control:{type:`range`,min:.1,max:10,step:.1}},centerX:{control:{type:`range`,min:0,max:1,step:.01}},centerY:{control:{type:`range`,min:0,max:1,step:.01}},speed:{control:{type:`range`,min:0,max:5,step:.05}}}),et=[`bayer2`,`bayer4`,`bayer8`,`bayer16`,`blueNoise`,`threshold`],V=m(e=>new ae(e),{style:`threshold`,size:2,levels:3,brightness:1,contrast:1,mono:!1,monoColor:`#ffffff`},{style:{control:{type:`select`},options:et},size:{control:{type:`range`,min:1,max:16,step:1}},levels:{control:{type:`range`,min:2,max:16,step:1}},brightness:{control:{type:`range`,min:0,max:2,step:.01}},contrast:{control:{type:`range`,min:0,max:4,step:.05}},mono:{control:{type:`boolean`}},monoColor:{control:{type:`color`}}},{clock:!1}),V.parameters={chromatic:{disableSnapshot:!0}},tt=[`rectangle`,`ellipse`,`hexagon`,`triangle`],H=m(e=>new we(e),{shape:`triangle`,size:10,stretch:1,gap:0,colorTrim:2,averageColor:.8,dissolve:0,falloff:0,knockout:!0},{shape:{control:{type:`select`},options:tt},size:{control:{type:`range`,min:2,max:80,step:1}},stretch:{control:{type:`range`,min:.2,max:4,step:.1}},gap:{control:{type:`range`,min:0,max:1,step:.01}},colorTrim:{control:{type:`range`,min:0,max:8,step:1}},averageColor:{control:{type:`range`,min:0,max:1,step:.01}},dissolve:{control:{type:`range`,min:0,max:1,step:.01}},falloff:{control:{type:`range`,min:0,max:1,step:.01}},knockout:{control:{type:`boolean`}}},{clock:!1}),nt=[`lenticular`,`waves`,`circular`],rt=[`zero`,`clamp`,`repeat`,`mirror`],U=m(e=>new _e(e),{pattern:`lenticular`,strength:.5,smoothness:0,frost:0,dispersion:.04,edgeWrap:`zero`,centerX:.5,centerY:.5,stripWidth:.05,angle:0},{pattern:{control:{type:`select`},options:nt},strength:{control:{type:`range`,min:0,max:2,step:.01}},smoothness:{control:{type:`range`,min:0,max:1,step:.01}},frost:{control:{type:`range`,min:0,max:2,step:.01}},dispersion:{control:{type:`range`,min:0,max:1,step:.01}},edgeWrap:{control:{type:`select`},options:rt},centerX:{control:{type:`range`,min:0,max:1,step:.01}},centerY:{control:{type:`range`,min:0,max:1,step:.01}},stripWidth:{control:{type:`range`,min:.02,max:1,step:.01}},angle:{control:{type:`range`,min:-180,max:180,step:1}}},{clock:!1}),W=m(e=>new oe({color1:h(e.color1),color2:h(e.color2),speed:e.speed}),{color1:`#ff0000`,color2:`#0000ff`,speed:.2},{color1:{control:{type:`color`}},color2:{control:{type:`color`}},speed:{control:{type:`range`,min:0,max:5,step:.05}}}),G=m(e=>new fe({color1:h(e.color1),color2:h(e.color2),color3:h(e.color3),speed:e.speed}),{color1:`#ff0000`,color2:`#00ff00`,color3:`#0000ff`,speed:.2},{color1:{control:{type:`color`}},color2:{control:{type:`color`}},color3:{control:{type:`color`}},speed:{control:{type:`range`,min:0,max:5,step:.05}}}),K=m(e=>new Me(e),{shift:.5},{shift:{control:{type:`range`,min:0,max:1,step:.01}}},{clock:!1}),q=m(e=>new ye(e),{intensity:.5,radius:1,power:2},{intensity:{control:{type:`range`,min:0,max:2,step:.01}},radius:{control:{type:`range`,min:0,max:2,step:.01}},power:{control:{type:`range`,min:.1,max:5,step:.1}}},{clock:!1,src:p}),J=m(e=>new re(e),{intensity:.3,radius:0,power:2},{intensity:{control:{type:`range`,min:0,max:3,step:.01}},radius:{control:{type:`range`,min:0,max:2,step:.01}},power:{control:{type:`range`,min:.1,max:5,step:.1}}},{clock:!1,src:p}),Y=[`Pigeon`,`Jellyfish`,`Logo`,`WebCam`,`HTML`],it={Pigeon:p,Jellyfish:f,Logo:u},X=[`normal`,`bold`,`100`,`300`,`600`,`900`],Z={render:e=>{let t=l(),n=new ce({preset:e.preset,grid:[e.gridX,e.gridY],font:e.font,fontWeight:e.fontWeight,color:h(e.color),background:h(e.background),colorFromSource:e.colorFromSource,invert:e.invert,dither:e.dither});return _(t,e.src,n)},args:{src:`Pigeon`,preset:`standard`,gridX:8,gridY:14,font:`monospace`,fontWeight:`normal`,color:`#ffffff`,background:`#000000`,colorFromSource:!1,invert:!1,dither:0},argTypes:{src:{control:{type:`select`},options:Y},preset:{control:{type:`select`},options:[`standard`,`minimal`,`blocks`,`dots`,`circles`,`detailed`]},gridX:{control:{type:`range`,min:4,max:48,step:1}},gridY:{control:{type:`range`,min:4,max:48,step:1}},font:{control:{type:`text`}},fontWeight:{control:{type:`select`},options:X},color:{control:{type:`color`}},background:{control:{type:`color`}},colorFromSource:{control:{type:`boolean`}},invert:{control:{type:`boolean`}},dither:{control:{type:`range`,min:0,max:1,step:.05}}}},Q={render:e=>{let t=v(),n=l(t?{timeScale:0}:void 0),r=new Ne({grid:[e.gridX,e.gridY],glyphs:e.glyphs||void 0,font:e.font,fontWeight:e.fontWeight,color:e.gradient?[h(e.color),h(e.color2)]:h(e.color),headColor:h(e.headColor),background:h(e.background),speed:e.speed,tail:e.tail,tailFade:e.tailFade,birthRate:e.birthRate,glyphSpeed:e.glyphSpeed,brightness:e.brightness,contrast:e.contrast,invert:e.invert,seed:e.seed}),i=e.bloom>0?[r,new d({threshold:.1,softness:.2,intensity:e.bloom,scatter:.8,dither:0,edgeFade:.02,pad:60})]:r,a=_(n,e.src,i,t?()=>{n.setTime(y),n.render()}:void 0);return t||o(n),a},args:{src:`Logo`,gridX:8,gridY:8,glyphs:``,font:`monospace`,fontWeight:`normal`,color:`#2dff5c`,gradient:!1,color2:`#00b3ff`,headColor:`#d9ffe6`,background:`#000000`,speed:10,tail:18,tailFade:1,birthRate:.6,glyphSpeed:8,brightness:1,contrast:1,invert:!1,seed:0,bloom:1},argTypes:{src:{control:{type:`select`},options:Y},gridX:{control:{type:`range`,min:4,max:48,step:1}},gridY:{control:{type:`range`,min:4,max:48,step:1}},glyphs:{control:{type:`text`}},font:{control:{type:`text`}},fontWeight:{control:{type:`select`},options:X},color:{control:{type:`color`}},gradient:{control:{type:`boolean`}},color2:{control:{type:`color`}},headColor:{control:{type:`color`}},background:{control:{type:`color`}},speed:{control:{type:`range`,min:1,max:40,step:1}},tail:{control:{type:`range`,min:2,max:48,step:1}},tailFade:{control:{type:`range`,min:0,max:1,step:.05}},birthRate:{control:{type:`range`,min:.05,max:5,step:.05}},glyphSpeed:{control:{type:`range`,min:0,max:30,step:1}},brightness:{control:{type:`range`,min:.2,max:3,step:.1}},contrast:{control:{type:`range`,min:0,max:4,step:.1}},invert:{control:{type:`boolean`}},seed:{control:{type:`range`,min:0,max:100,step:1}},bloom:{control:{type:`range`,min:0,max:8,step:.1}}}},at=[`dots`,`rings`,`squares`],$={render:e=>{let t=l(),n=new ce({tiles:Array.from({length:6},(t,n)=>Ue(n,6,e.preset)),grid:e.grid,background:[0,0,0,1]});return _(t,e.src,n)},args:{src:`Pigeon`,preset:`dots`,grid:14},argTypes:{src:{control:{type:`select`},options:Y},preset:{control:{type:`select`},options:at},grid:{control:{type:`range`,min:4,max:48,step:1}}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    img.style.display = "block";
    img.style.margin = "40px auto";
    return img;
  },
  args: undefined
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Jellyfish;
    return img;
  },
  args: undefined
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
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
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
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
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
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
}`,...w.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Jellyfish;
    return img;
  },
  args: undefined
}`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Jellyfish;
    return img;
  },
  args: undefined
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
  },
  args: undefined
}`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    return img;
  },
  args: undefined
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
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
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`presetStory<GlitchArgs>(a => new GlitchEffect(a), {
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
})`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`presetStory<RgbShiftArgs>(a => new RgbShiftEffect(a), {
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
})`,...M.parameters?.docs?.source}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`presetStory<RgbGlitchArgs>(a => new RgbGlitchEffect(a), {
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
})`,...N.parameters?.docs?.source}}},P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`presetStory<RainbowArgs>(a => new RainbowEffect(a), {
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
})`,...P.parameters?.docs?.source}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`presetStory<SinewaveArgs>(a => new SinewaveEffect(a), {
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
})`,...F.parameters?.docs?.source}}},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`presetStory<ColoredEdgesArgs>(a => new ColoredEdgesEffect(a), {
  threshold: 0.2,
  thickness: 3,
  intensity: 4,
  opacity: 0,
  color1: "#ff0000",
  color2: "#0000ff",
  background: "#000000"
}, {
  threshold: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  thickness: {
    control: {
      type: "range",
      min: 0.5,
      max: 10,
      step: 0.5
    }
  },
  intensity: {
    control: {
      type: "range",
      min: 0,
      max: 20,
      step: 0.1
    }
  },
  opacity: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
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
  background: {
    control: {
      type: "color"
    }
  }
}, {
  clock: false,
  src: Pigeon
})`,...I.parameters?.docs?.source}}},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`presetStory<GradientMapArgs>(a => new GradientMapEffect({
  colors: [a.color1, a.color2, a.color3],
  scatter: a.scatter,
  offset: a.offset,
  repeat: a.repeat,
  frequency: a.frequency,
  mixSpace: a.mixSpace,
  speed: a.speed
}), {
  color1: "#ffffff",
  color2: "#3aa0ff",
  color3: "#000000",
  scatter: 0,
  offset: 0,
  repeat: "none",
  frequency: 1,
  mixSpace: "srgb",
  speed: 0
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
  scatter: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  offset: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  repeat: {
    control: {
      type: "select"
    },
    options: GRADIENT_REPEATS
  },
  frequency: {
    control: {
      type: "range",
      min: 1,
      max: 8,
      step: 1
    }
  },
  mixSpace: {
    control: {
      type: "select"
    },
    options: GRADIENT_MIX_SPACES
  },
  speed: {
    control: {
      type: "range",
      min: -1,
      max: 1,
      step: 0.01
    }
  }
})`,...L.parameters?.docs?.source}}},R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`presetStory<SliceShiftArgs>(a => new SliceShiftEffect(a), {
  shift: 0.5,
  random: 0,
  centerX: 0.5,
  centerY: 0.5,
  size: 100,
  angle: 0
}, {
  shift: {
    control: {
      type: "range",
      min: -1,
      max: 1,
      step: 0.01
    }
  },
  random: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  centerX: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  centerY: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  size: {
    control: {
      type: "range",
      min: 1,
      max: 300,
      step: 1
    }
  },
  angle: {
    control: {
      type: "range",
      min: -180,
      max: 180,
      step: 1
    }
  }
}, {
  clock: false
})`,...R.parameters?.docs?.source}}},z.parameters={...z.parameters,docs:{...z.parameters?.docs,source:{originalSource:`presetStory<PixelStretchArgs>(a => new PixelStretchEffect(a), {
  offset: 0,
  reach: 0.2,
  smoothness: 0,
  centerX: 0.5,
  centerY: 0.5,
  angle: 0
}, {
  offset: {
    control: {
      type: "range",
      min: -1,
      max: 1,
      step: 0.01
    }
  },
  reach: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  smoothness: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  centerX: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  centerY: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  angle: {
    control: {
      type: "range",
      min: -180,
      max: 180,
      step: 1
    }
  }
}, {
  clock: false
})`,...z.parameters?.docs?.source}}},B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`presetStory<WarpArgs>(a => new WarpEffect(a), {
  type: "twist",
  amplitude: 3,
  frequency: 1,
  centerX: 0.5,
  centerY: 0.5,
  speed: 0
}, {
  type: {
    control: {
      type: "select"
    },
    options: WARP_TYPES
  },
  amplitude: {
    control: {
      type: "range",
      min: -10,
      max: 10,
      step: 0.1
    }
  },
  frequency: {
    control: {
      type: "range",
      min: 0.1,
      max: 10,
      step: 0.1
    }
  },
  centerX: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  centerY: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
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
})`,...B.parameters?.docs?.source}}},V.parameters={...V.parameters,docs:{...V.parameters?.docs,source:{originalSource:`presetStory<DitherArgs>(a => new DitherEffect(a), {
  style: "threshold",
  size: 2,
  levels: 3,
  brightness: 1,
  contrast: 1,
  mono: false,
  monoColor: "#ffffff"
}, {
  style: {
    control: {
      type: "select"
    },
    options: DITHER_STYLES
  },
  size: {
    control: {
      type: "range",
      min: 1,
      max: 16,
      step: 1
    }
  },
  levels: {
    control: {
      type: "range",
      min: 2,
      max: 16,
      step: 1
    }
  },
  brightness: {
    control: {
      type: "range",
      min: 0,
      max: 2,
      step: 0.01
    }
  },
  contrast: {
    control: {
      type: "range",
      min: 0,
      max: 4,
      step: 0.05
    }
  },
  mono: {
    control: {
      type: "boolean"
    }
  },
  monoColor: {
    control: {
      type: "color"
    }
  }
}, {
  clock: false
})`,...V.parameters?.docs?.source}}},H.parameters={...H.parameters,docs:{...H.parameters?.docs,source:{originalSource:`presetStory<TilePixelateArgs>(a => new TilePixelateEffect(a), {
  shape: "triangle",
  size: 10,
  stretch: 1,
  gap: 0,
  colorTrim: 2,
  averageColor: 0.8,
  dissolve: 0,
  falloff: 0,
  knockout: true
}, {
  shape: {
    control: {
      type: "select"
    },
    options: PIXELATE_SHAPES
  },
  size: {
    control: {
      type: "range",
      min: 2,
      max: 80,
      step: 1
    }
  },
  stretch: {
    control: {
      type: "range",
      min: 0.2,
      max: 4,
      step: 0.1
    }
  },
  gap: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  colorTrim: {
    control: {
      type: "range",
      min: 0,
      max: 8,
      step: 1
    }
  },
  averageColor: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  dissolve: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  falloff: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  knockout: {
    control: {
      type: "boolean"
    }
  }
}, {
  clock: false
})`,...H.parameters?.docs?.source}}},U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`presetStory<PatternRefractionArgs>(a => new PatternRefractionEffect(a), {
  pattern: "lenticular",
  strength: 0.5,
  smoothness: 0,
  frost: 0,
  dispersion: 0.04,
  edgeWrap: "zero",
  centerX: 0.5,
  centerY: 0.5,
  stripWidth: 0.05,
  angle: 0
}, {
  pattern: {
    control: {
      type: "select"
    },
    options: REFRACTION_PATTERNS
  },
  strength: {
    control: {
      type: "range",
      min: 0,
      max: 2,
      step: 0.01
    }
  },
  smoothness: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  frost: {
    control: {
      type: "range",
      min: 0,
      max: 2,
      step: 0.01
    }
  },
  dispersion: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  edgeWrap: {
    control: {
      type: "select"
    },
    options: REFRACTION_EDGE_WRAPS
  },
  centerX: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  centerY: {
    control: {
      type: "range",
      min: 0,
      max: 1,
      step: 0.01
    }
  },
  stripWidth: {
    control: {
      type: "range",
      min: 0.02,
      max: 1,
      step: 0.01
    }
  },
  angle: {
    control: {
      type: "range",
      min: -180,
      max: 180,
      step: 1
    }
  }
}, {
  clock: false
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
})`,...J.parameters?.docs?.source}}},Z.parameters={...Z.parameters,docs:{...Z.parameters?.docs,source:{originalSource:`{
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
      options: FONT_WEIGHTS
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
}`,...Z.parameters?.docs?.source}}},Q.parameters={...Q.parameters,docs:{...Q.parameters?.docs,source:{originalSource:`{
  render: a => {
    // The rain is a pure function of the clock + seed (no Math.random),
    // so under VRT freeze the clock (timeScale 0) and pin it to a fixed
    // frame once added — Chromatic then captures the same pattern every
    // run.
    const vrt = isChromatic();
    const vfx = initVFX(vrt ? {
      timeScale: 0
    } : undefined);
    const effect = new MatrixEffect({
      grid: [a.gridX, a.gridY],
      glyphs: a.glyphs || undefined,
      font: a.font,
      fontWeight: a.fontWeight,
      // gradient on → two-stop vertical gradient (top → bottom),
      // interpolated in OKLCH; off → a single flat colour.
      color: a.gradient ? [hexToRgba(a.color), hexToRgba(a.color2)] : hexToRgba(a.color),
      headColor: hexToRgba(a.headColor),
      background: hexToRgba(a.background),
      speed: a.speed,
      tail: a.tail,
      tailFade: a.tailFade,
      birthRate: a.birthRate,
      glyphSpeed: a.glyphSpeed,
      brightness: a.brightness,
      contrast: a.contrast,
      invert: a.invert,
      seed: a.seed
    });
    // bloom = 0 → bypass (rain only); otherwise chain a low-threshold
    // BloomEffect whose intensity is the slider value, so the green
    // glyphs glow like the film's phosphor CRT.
    const effects = a.bloom > 0 ? [effect, new BloomEffect({
      threshold: 0.1,
      softness: 0.2,
      intensity: a.bloom,
      scatter: 0.8,
      dither: 0,
      edgeFade: 0.02,
      pad: 60
    })] : effect;
    const el = addAsciiSource(vfx, a.src, effects, vrt ? () => {
      vfx.setTime(VRT_TIME);
      vfx.render();
    } : undefined);
    if (!vrt) {
      attachClockPane(vfx);
    }
    return el;
  },
  args: {
    src: "Logo",
    gridX: 8,
    gridY: 8,
    glyphs: "",
    font: "monospace",
    fontWeight: "normal",
    color: "#2dff5c",
    gradient: false,
    color2: "#00b3ff",
    headColor: "#d9ffe6",
    background: "#000000",
    speed: 10,
    tail: 18,
    tailFade: 1,
    birthRate: 0.6,
    glyphSpeed: 8,
    brightness: 1,
    contrast: 1,
    invert: false,
    seed: 0,
    bloom: 1.0
  },
  argTypes: {
    src: {
      control: {
        type: "select"
      },
      options: ASCII_SRCS
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
    glyphs: {
      control: {
        type: "text"
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
      options: FONT_WEIGHTS
    },
    color: {
      control: {
        type: "color"
      }
    },
    gradient: {
      control: {
        type: "boolean"
      }
    },
    color2: {
      control: {
        type: "color"
      }
    },
    headColor: {
      control: {
        type: "color"
      }
    },
    background: {
      control: {
        type: "color"
      }
    },
    speed: {
      control: {
        type: "range",
        min: 1,
        max: 40,
        step: 1
      }
    },
    tail: {
      control: {
        type: "range",
        min: 2,
        max: 48,
        step: 1
      }
    },
    tailFade: {
      control: {
        type: "range",
        min: 0,
        max: 1,
        step: 0.05
      }
    },
    birthRate: {
      control: {
        type: "range",
        min: 0.05,
        max: 5,
        step: 0.05
      }
    },
    glyphSpeed: {
      control: {
        type: "range",
        min: 0,
        max: 30,
        step: 1
      }
    },
    brightness: {
      control: {
        type: "range",
        min: 0.2,
        max: 3,
        step: 0.1
      }
    },
    contrast: {
      control: {
        type: "range",
        min: 0,
        max: 4,
        step: 0.1
      }
    },
    invert: {
      control: {
        type: "boolean"
      }
    },
    seed: {
      control: {
        type: "range",
        min: 0,
        max: 100,
        step: 1
      }
    },
    bloom: {
      control: {
        type: "range",
        min: 0,
        max: 8,
        step: 0.1
      }
    }
  }
}`,...Q.parameters?.docs?.source}}},$.parameters={...$.parameters,docs:{...$.parameters?.docs,source:{originalSource:`{
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
}`,...$.parameters?.docs?.source}}},ot=`bloom.crtBloom.pixelSort.jpegGlitch.badJpeg.fluid.halftone.particle.particleExplode.voronoi.glitch.rgbShift.rgbGlitch.rainbow.sinewave.coloredEdges.gradientMap.sliceShift.pixelStretch.warp.dither.tilePixelate.patternRefraction.duotone.tritone.hueShift.vignette.chromatic.ascii.matrix.asciiTiles`.split(`.`)}))();export{ot as __namedExportsOrder,Z as ascii,$ as asciiTiles,w as badJpeg,b as bloom,J as chromatic,I as coloredEdges,x as crtBloom,We as default,V as dither,W as duotone,E as fluid,j as glitch,L as gradientMap,D as halftone,K as hueShift,C as jpegGlitch,Q as matrix,O as particle,k as particleExplode,U as patternRefraction,S as pixelSort,z as pixelStretch,P as rainbow,N as rgbGlitch,M as rgbShift,F as sinewave,R as sliceShift,H as tilePixelate,G as tritone,q as vignette,A as voronoi,B as warp};
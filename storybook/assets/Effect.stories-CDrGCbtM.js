import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./logo-640w-20p-22Elz6NL.js";import{a as r,c as i,d as a,f as o,i as s,l as c,n as ee,p as l,s as te,t as ne,u}from"./utils-C2DuqTxv.js";import"./preset-DFGAZ5Mi.js";import{A as re,B as ie,E as ae,H as oe,I as se,J as ce,K as le,M as ue,O as de,P as fe,Q as pe,S as me,W as he,X as ge,b as _e,c as ve,ct as d,et as ye,f as be,ft as xe,g as Se,i as Ce,it as we,m as Te,n as Ee,o as De,ot as Oe,t as ke,u as Ae,ut as je,v as Me,w as Ne}from"./esm-Dh2VieTG.js";import{n as Pe,t as Fe}from"./bbb-BpWt09Zd.js";import{n as f,t as Ie}from"./jellyfish-DtC6VyHr.js";import{n as p,t as Le}from"./pigeon-Dic8r3mQ.js";function m(e,t,n,r={}){let{src:i=f,clock:o=!0}=r;return{render:t=>{let n=o&&l(),r=a(n?{timeScale:0}:void 0),s=document.createElement(`img`);s.src=i,s.style.display=`block`,s.style.margin=`40px auto`,s.style.maxWidth=`80vw`;let c=r.add(s,{effect:e(t)});return o&&(n?c.then(()=>{r.setTime(v),r.render()}):ee(r)),s},args:t,argTypes:n}}function h(e){let t=e.trim().replace(/^#/,``);if(t.length===3&&(t=t.split(``).map(e=>e+e).join(``)),t.length!==6)return[0,0,0,1];let n=Number.parseInt(t,16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255,1]}function Re(e){let t=e>>>0;return()=>{t=t+1831565813|0;let e=Math.imul(t^t>>>15,1|t);return e=e+Math.imul(e^e>>>7,61|e)^e,((e^e>>>14)>>>0)/4294967296}}async function g(e,t,n={}){let r=n.steps??qe,i=t.getBoundingClientRect(),a=i.left+i.width/2,o=i.top+i.height/2,s=Math.min(i.width,i.height)*.3,c=Math.random;Math.random=Re(2654435769);try{n.onReady?.();let t=0;for(let n=0;n<r;n++){await new Promise(e=>setTimeout(e,0));let i=n/r*Math.PI*2;window.dispatchEvent(new MouseEvent(`pointermove`,{clientX:a+Math.cos(i)*s,clientY:o+Math.sin(i)*s,bubbles:!0})),t+=Je,e.setTime(t),e.render()}}finally{Math.random=c}}function ze(){let e=document.createElement(`article`);e.style.cssText=`width: 600px; padding: 32px; background: #fff; color: #202122; font-family: sans-serif; line-height: 1.6; border: 1px solid #a2a9b1;`;let t=`font-family: serif; font-weight: normal; border-bottom: 1px solid #a2a9b1; padding-bottom: 4px; margin-top: 24px;`,n=`margin: 20px 0; text-align: center;`,r=`font-size: 0.85em; color: #54595d; margin-top: 4px;`,i=`width: 100%; height: auto; max-width: 480px; background: #f8f9fa; border: 1px solid #a2a9b1;`;return e.innerHTML=`
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
    `,e}function _(e,t,n,r){let i=e=>{r&&Promise.resolve(e).then(r)},a=e=>{e.style.display=`block`,e.style.margin=`40px auto`,e.style.maxWidth=`80vw`};if(t===`HTML`){let t=document.createElement(`div`);t.style.display=`flex`,t.style.justifyContent=`center`,t.style.margin=`40px auto`;let r=document.createElement(`div`);r.style.width=`900px`,r.style.maxWidth=`90vw`;let a=He();return r.appendChild(a),t.appendChild(r),i(e.addHTML(a,{effect:n})),t}if(t===`WebCam`){let t=document.createElement(`video`);return t.muted=!0,t.loop=!0,t.playsInline=!0,t.autoplay=!0,a(t),navigator.mediaDevices?.getUserMedia({video:!0}).then(e=>{t.srcObject=e,t.play()}).catch(e=>console.warn(`[ascii story] webcam unavailable:`,e)),i(e.add(t,{effect:n})),t}let o=document.createElement(`img`);return o.src=rt[t]??p,a(o),i(e.add(o,{effect:n})),o}function Ue(e,t,n){let r=document.createElement(`canvas`);r.width=64,r.height=64;let i=r.getContext(`2d`);if(i){let r=t>1?e/(t-1):1,a=`hsl(${e/Math.max(1,t)*360}, 85%, 55%)`;if(i.fillStyle=a,i.strokeStyle=a,n===`squares`){let e=6+r*50;i.fillRect(32-e/2,32-e/2,e,e)}else n===`rings`?(i.lineWidth=2+r*9,i.beginPath(),i.arc(32,32,6+r*22,0,Math.PI*2),i.stroke()):(i.beginPath(),i.arc(32,32,3+r*27,0,Math.PI*2),i.fill())}return r}var We,v,y,b,x,Ge,S,Ke,C,qe,Je,w,Ye,T,E,D,O,k,A,j,M,N,P,F,I,Xe,Ze,L,R,z,Qe,B,$e,V,et,H,tt,nt,U,W,G,K,q,J,Y,rt,X,Z,Q,it,$,at;function ot(){return(ot=e((()=>{ke(),Pe(),Ie(),n(),Le(),o(),We={title:`Effect`,parameters:{layout:`fullscreen`}},v=2,y={render:()=>{let e=document.createElement(`img`);return e.src=t,e.style.display=`block`,e.style.margin=`40px auto`,e},args:void 0},y.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let n=a(),r=new d({threshold:.2,softness:.1,intensity:5,scatter:1,dither:0,edgeFade:0,pad:50});await n.add(t,{effect:r}),ne(`Bloom`,r)},b={render:()=>{let e=document.createElement(`img`);return e.src=f,e},args:void 0},b.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let n=a(),r=new d({threshold:.01,softness:.2,intensity:10,scatter:1,dither:0,edgeFade:.02,pad:200});await n.add(t,{effect:[new ae({size:10}),new Se({spacing:5}),r]}),ne(`CRT Bloom`,r)},x={render:()=>{let e=document.createElement(`img`);return e.src=f,e},args:void 0,parameters:{chromatic:{disableSnapshot:!0}}},x.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let n=a(),r=new Ne({range:[.5,1],direction:`up`,angle:30});await n.add(t,{effect:r}),c(`Pixel Sort`,r)},Ge={Jellyfish:f,Logo:t,Pigeon:p},S={render:e=>{let{src:t,...n}=e,r=a(),i=new ie(n);if(Be(i),t===`bbb`){let e=document.createElement(`video`);return e.src=Fe,e.muted=!0,e.loop=!0,e.playsInline=!0,e.autoplay=!0,e.crossOrigin=`anonymous`,e.style.display=`block`,e.style.margin=`40px auto`,e.style.maxWidth=`80vw`,e.play(),r.add(e,{effect:i}),e}let o=document.createElement(`img`);return o.src=Ge[t],o.style.display=`block`,o.style.margin=`40px auto`,r.add(o,{effect:i}),o},args:{src:`Jellyfish`,quality:.4,seed:.25,iterations:24,resolutionScale:1,randomFlip:!0,vertical:!1,speed:0},argTypes:{src:{control:{type:`select`},options:[`Jellyfish`,`Logo`,`Pigeon`,`bbb`]},quality:{control:{type:`range`,min:0,max:1,step:.01}},seed:{control:{type:`range`,min:0,max:1,step:.01}},iterations:{control:{type:`range`,min:1,max:30,step:1}},resolutionScale:{control:{type:`range`,min:0,max:1,step:.01}},randomFlip:{control:{type:`boolean`}},vertical:{control:{type:`boolean`}},speed:{control:{type:`range`,min:0,max:30,step:.5}}},parameters:{chromatic:{disableSnapshot:!0}}},Ke={Jellyfish:f,Logo:t,Pigeon:p},C={render:e=>{let{src:t,...n}=e,r=a(),i=new je(n);if(t===`bbb`){let e=document.createElement(`video`);return e.src=Fe,e.muted=!0,e.loop=!0,e.playsInline=!0,e.autoplay=!0,e.crossOrigin=`anonymous`,e.style.display=`block`,e.style.margin=`40px auto`,e.style.maxWidth=`80vw`,e.play(),r.add(e,{effect:i}),e}let o=document.createElement(`img`);return o.src=Ke[t],o.style.display=`block`,o.style.margin=`40px auto`,r.add(o,{effect:i}),o},args:{src:`Jellyfish`,quality:8,iterations:3,downscale:1},argTypes:{src:{control:{type:`select`},options:[`Jellyfish`,`Logo`,`Pigeon`,`bbb`]},quality:{control:{type:`range`,min:1,max:100,step:1}},iterations:{control:{type:`range`,min:1,max:10,step:1}},downscale:{control:{type:`range`,min:.02,max:1,step:.01}}},parameters:{chromatic:{disableSnapshot:!0}}},qe=60,Je=1/60,w=20,Ye=24,T=4096,E={render:()=>{let e=document.createElement(`img`);return e.src=f,e},args:void 0},E.play=async({canvasElement:e})=>{let t=e.querySelector(`img`);await new Promise(e=>{t.onload=e});let n=l(),r=a(n?{autoplay:!1}:void 0),i=new ge;await r.add(t,{effect:i}),n?await g(r,t):(s(`Fluid`,i),Ve(e))},D={render:()=>{let e=document.createElement(`img`);return e.src=f,e},args:void 0},D.play=async({canvasElement:e})=>{let n=e.querySelector(`img`);await new Promise(e=>{n.onload=e});let i=a(),o={Jellyfish:f,Logo:t},s=null,c=async()=>{let e=s?{...s.params}:{};s&&(i.remove(n),u()),s=new he(e),await i.add(n,{effect:s}),r(`Halftone`,s,{img:n,sources:o,onSrcChange:async e=>{n.src=o[e],await new Promise(e=>{n.onload=()=>e()}),await c()}})};await c()},O={render:()=>{let e=document.createElement(`img`);return e.src=t,e},args:void 0},O.play=async({canvasElement:e})=>{let n=e.querySelector(`img`);if(await new Promise(e=>{n.onload=()=>e()}),l()){let e=a({autoplay:!1});await e.add(n,{effect:new fe({count:T})}),await g(e,n,{steps:w});return}let r=a(),o={Jellyfish:f,Logo:t},s=null,c=async()=>{let e=s?{...s.params}:{};s&&(r.remove(n),u()),s=new fe(e),await r.add(n,{effect:s}),i(`Particle`,s,{img:n,sources:o,onSrcChange:async e=>{n.src=o[e],await new Promise(e=>{n.onload=()=>e()}),await c()}})};await c(),Ve(e)},k={render:()=>{let e=document.createElement(`img`);return e.src=t,e},args:void 0},k.play=async({canvasElement:e})=>{let n=e.querySelector(`img`);if(await new Promise(e=>{n.onload=()=>e()}),await new Promise(e=>requestAnimationFrame(()=>e(void 0))),l()){let e=a({autoplay:!1}),t=new ue({count:T});await e.add(n,{effect:t}),await g(e,n,{steps:Ye,onReady:()=>t.trigger()});return}let r=a(),i={Logo:t,Jellyfish:f},o=null,s=async()=>{let e=o?{...o.params}:{};o&&(r.remove(n),u()),await new Promise(e=>requestAnimationFrame(()=>e(void 0))),o=new ue(e),await r.add(n,{effect:o}),te(`Particle Explode`,o,{img:n,sources:i,onSrcChange:async e=>{n.src=i[e],await new Promise(e=>{n.onload=()=>e()}),await s()}})};await s()},A={render:e=>{let{src:n,...r}=e,i=a(),o=new Ce(r);if(n===`Webpage`){let e=document.getElementById(`storybook-root`);e&&(e.style.height=`auto`,e.style.display=`block`);let t=document.createElement(`div`);t.style.display=`flex`,t.style.justifyContent=`center`;let n=ze();return t.appendChild(n),i.addHTML(n,{effect:o}),t}let s=document.createElement(`img`);return s.src=n===`Jellyfish`?f:t,i.add(s,{effect:o}),s},args:{src:`Webpage`,cellSize:40,pressRadius:200,press:1,flatCells:!1,seed:0,speed:0,breathe:0,breatheSpeed:0,breatheScale:40,bgColor:`#00000000`},argTypes:{src:{control:{type:`select`},options:[`Logo`,`Jellyfish`,`Webpage`]},cellSize:{control:{type:`range`,min:5,max:200,step:1}},pressRadius:{control:{type:`range`,min:0,max:800,step:10}},press:{control:{type:`range`,min:0,max:1,step:.01}},flatCells:{control:{type:`boolean`}},seed:{control:{type:`range`,min:0,max:1e3,step:1}},speed:{control:{type:`range`,min:0,max:5,step:.05}},breathe:{control:{type:`range`,min:0,max:1,step:.01}},breatheSpeed:{control:{type:`range`,min:0,max:5,step:.05}},breatheScale:{control:{type:`range`,min:10,max:500,step:5}},bgColor:{control:{type:`color`}}}},j=m(e=>new ce(e),{speed:1,intensity:1},{speed:{control:{type:`range`,min:0,max:5,step:.05}},intensity:{control:{type:`range`,min:0,max:3,step:.05}}}),M=m(e=>new Me(e),{speed:1,amount:10},{speed:{control:{type:`range`,min:0,max:5,step:.05}},amount:{control:{type:`range`,min:0,max:60,step:1}}}),N=m(e=>new _e(e),{speed:1,amount:.05},{speed:{control:{type:`range`,min:0,max:5,step:.05}},amount:{control:{type:`range`,min:0,max:.3,step:.005}}}),P=m(e=>new me(e),{speed:1,frequency:1},{speed:{control:{type:`range`,min:0,max:5,step:.05}},frequency:{control:{type:`range`,min:.1,max:8,step:.1}}}),F=m(e=>new Te(e),{speed:1,amount:20,frequency:7,blur:2},{speed:{control:{type:`range`,min:0,max:5,step:.05}},amount:{control:{type:`range`,min:0,max:100,step:1}},frequency:{control:{type:`range`,min:1,max:30,step:.5}},blur:{control:{type:`range`,min:0,max:20,step:.5}}}),I=m(e=>new we(e),{threshold:.2,thickness:3,intensity:4,opacity:0,color1:`#ff0000`,color2:`#0000ff`,background:`#000000`},{threshold:{control:{type:`range`,min:0,max:1,step:.01}},thickness:{control:{type:`range`,min:.5,max:10,step:.5}},intensity:{control:{type:`range`,min:0,max:20,step:.1}},opacity:{control:{type:`range`,min:0,max:1,step:.01}},color1:{control:{type:`color`}},color2:{control:{type:`color`}},background:{control:{type:`color`}}},{clock:!1,src:p}),Xe=[`none`,`repeat`,`mirror`],Ze=[`srgb`,`linear`,`oklab`],L=m(e=>new le({colors:[e.color1,e.color2,e.color3],scatter:e.scatter,offset:e.offset,repeat:e.repeat,frequency:e.frequency,mixSpace:e.mixSpace,speed:e.speed}),{color1:`#ffffff`,color2:`#3aa0ff`,color3:`#000000`,scatter:0,offset:0,repeat:`none`,frequency:1,mixSpace:`srgb`,speed:0},{color1:{control:{type:`color`}},color2:{control:{type:`color`}},color3:{control:{type:`color`}},scatter:{control:{type:`range`,min:0,max:1,step:.01}},offset:{control:{type:`range`,min:0,max:1,step:.01}},repeat:{control:{type:`select`},options:Xe},frequency:{control:{type:`range`,min:1,max:8,step:1}},mixSpace:{control:{type:`select`},options:Ze},speed:{control:{type:`range`,min:-1,max:1,step:.01}}}),R=m(e=>new be(e),{shift:.5,random:0,centerX:.5,centerY:.5,size:100,angle:0},{shift:{control:{type:`range`,min:-1,max:1,step:.01}},random:{control:{type:`range`,min:0,max:1,step:.01}},centerX:{control:{type:`range`,min:0,max:1,step:.01}},centerY:{control:{type:`range`,min:0,max:1,step:.01}},size:{control:{type:`range`,min:1,max:300,step:1}},angle:{control:{type:`range`,min:-180,max:180,step:1}}},{clock:!1}),z=m(e=>new de(e),{offset:0,reach:.2,smoothness:0,centerX:.5,centerY:.5,angle:0},{offset:{control:{type:`range`,min:-1,max:1,step:.01}},reach:{control:{type:`range`,min:0,max:1,step:.01}},smoothness:{control:{type:`range`,min:0,max:1,step:.01}},centerX:{control:{type:`range`,min:0,max:1,step:.01}},centerY:{control:{type:`range`,min:0,max:1,step:.01}},angle:{control:{type:`range`,min:-180,max:180,step:1}}},{clock:!1}),Qe=[`sine wave`,`twist`,`ripple`],B=m(e=>new Ee(e),{type:`twist`,amplitude:3,frequency:1,centerX:.5,centerY:.5,speed:0},{type:{control:{type:`select`},options:Qe},amplitude:{control:{type:`range`,min:-10,max:10,step:.1}},frequency:{control:{type:`range`,min:.1,max:10,step:.1}},centerX:{control:{type:`range`,min:0,max:1,step:.01}},centerY:{control:{type:`range`,min:0,max:1,step:.01}},speed:{control:{type:`range`,min:0,max:5,step:.05}}}),$e=[`bayer2`,`bayer4`,`bayer8`,`bayer16`,`blueNoise`,`threshold`],V=m(e=>new ye(e),{style:`threshold`,size:2,levels:3,brightness:1,contrast:1,mono:!1,monoColor:`#ffffff`},{style:{control:{type:`select`},options:$e},size:{control:{type:`range`,min:1,max:16,step:1}},levels:{control:{type:`range`,min:2,max:16,step:1}},brightness:{control:{type:`range`,min:0,max:2,step:.01}},contrast:{control:{type:`range`,min:0,max:4,step:.05}},mono:{control:{type:`boolean`}},monoColor:{control:{type:`color`}}},{clock:!1}),V.parameters={chromatic:{disableSnapshot:!0}},et=[`rectangle`,`ellipse`,`hexagon`,`triangle`],H=m(e=>new Ae(e),{shape:`triangle`,size:10,stretch:1,gap:0,colorTrim:2,averageColor:.8,dissolve:0,falloff:0,knockout:!0},{shape:{control:{type:`select`},options:et},size:{control:{type:`range`,min:2,max:80,step:1}},stretch:{control:{type:`range`,min:.2,max:4,step:.1}},gap:{control:{type:`range`,min:0,max:1,step:.01}},colorTrim:{control:{type:`range`,min:0,max:8,step:1}},averageColor:{control:{type:`range`,min:0,max:1,step:.01}},dissolve:{control:{type:`range`,min:0,max:1,step:.01}},falloff:{control:{type:`range`,min:0,max:1,step:.01}},knockout:{control:{type:`boolean`}}},{clock:!1}),tt=[`lenticular`,`waves`,`circular`],nt=[`zero`,`clamp`,`repeat`,`mirror`],U=m(e=>new re(e),{pattern:`lenticular`,strength:.5,smoothness:0,frost:0,dispersion:.04,edgeWrap:`zero`,centerX:.5,centerY:.5,stripWidth:.05,angle:0},{pattern:{control:{type:`select`},options:tt},strength:{control:{type:`range`,min:0,max:2,step:.01}},smoothness:{control:{type:`range`,min:0,max:1,step:.01}},frost:{control:{type:`range`,min:0,max:2,step:.01}},dispersion:{control:{type:`range`,min:0,max:1,step:.01}},edgeWrap:{control:{type:`select`},options:nt},centerX:{control:{type:`range`,min:0,max:1,step:.01}},centerY:{control:{type:`range`,min:0,max:1,step:.01}},stripWidth:{control:{type:`range`,min:.02,max:1,step:.01}},angle:{control:{type:`range`,min:-180,max:180,step:1}}},{clock:!1}),W=m(e=>new pe({color1:h(e.color1),color2:h(e.color2),speed:e.speed}),{color1:`#ff0000`,color2:`#0000ff`,speed:.2},{color1:{control:{type:`color`}},color2:{control:{type:`color`}},speed:{control:{type:`range`,min:0,max:5,step:.05}}}),G=m(e=>new ve({color1:h(e.color1),color2:h(e.color2),color3:h(e.color3),speed:e.speed}),{color1:`#ff0000`,color2:`#00ff00`,color3:`#0000ff`,speed:.2},{color1:{control:{type:`color`}},color2:{control:{type:`color`}},color3:{control:{type:`color`}},speed:{control:{type:`range`,min:0,max:5,step:.05}}}),K=m(e=>new oe(e),{shift:.5},{shift:{control:{type:`range`,min:0,max:1,step:.01}}},{clock:!1}),q=m(e=>new De(e),{intensity:.5,radius:1,power:2},{intensity:{control:{type:`range`,min:0,max:2,step:.01}},radius:{control:{type:`range`,min:0,max:2,step:.01}},power:{control:{type:`range`,min:.1,max:5,step:.1}}},{clock:!1,src:p}),J=m(e=>new Oe(e),{intensity:.3,radius:0,power:2},{intensity:{control:{type:`range`,min:0,max:3,step:.01}},radius:{control:{type:`range`,min:0,max:2,step:.01}},power:{control:{type:`range`,min:.1,max:5,step:.1}}},{clock:!1,src:p}),Y=[`Pigeon`,`Jellyfish`,`Logo`,`WebCam`,`HTML`],rt={Pigeon:p,Jellyfish:f,Logo:t},X=[`normal`,`bold`,`100`,`300`,`600`,`900`],Z={render:e=>{let t=a(),n=new xe({preset:e.preset,grid:[e.gridX,e.gridY],font:e.font,fontWeight:e.fontWeight,color:h(e.color),background:h(e.background),colorFromSource:e.colorFromSource,invert:e.invert,dither:e.dither});return _(t,e.src,n)},args:{src:`Pigeon`,preset:`standard`,gridX:8,gridY:14,font:`monospace`,fontWeight:`normal`,color:`#ffffff`,background:`#000000`,colorFromSource:!1,invert:!1,dither:0},argTypes:{src:{control:{type:`select`},options:Y},preset:{control:{type:`select`},options:[`standard`,`minimal`,`blocks`,`dots`,`circles`,`detailed`]},gridX:{control:{type:`range`,min:4,max:48,step:1}},gridY:{control:{type:`range`,min:4,max:48,step:1}},font:{control:{type:`text`}},fontWeight:{control:{type:`select`},options:X},color:{control:{type:`color`}},background:{control:{type:`color`}},colorFromSource:{control:{type:`boolean`}},invert:{control:{type:`boolean`}},dither:{control:{type:`range`,min:0,max:1,step:.05}}}},Q={render:e=>{let t=l(),n=a(t?{timeScale:0}:void 0),r=new se({grid:[e.gridX,e.gridY],glyphs:e.glyphs||void 0,font:e.font,fontWeight:e.fontWeight,color:e.gradient?[h(e.color),h(e.color2)]:h(e.color),headColor:h(e.headColor),background:h(e.background),speed:e.speed,tail:e.tail,tailFade:e.tailFade,birthRate:e.birthRate,glyphSpeed:e.glyphSpeed,brightness:e.brightness,contrast:e.contrast,invert:e.invert,seed:e.seed}),i=e.bloom>0?[r,new d({threshold:.1,softness:.2,intensity:e.bloom,scatter:.8,dither:0,edgeFade:.02,pad:60})]:r,o=_(n,e.src,i,t?()=>{n.setTime(v),n.render()}:void 0);return t||ee(n),o},args:{src:`Logo`,gridX:8,gridY:8,glyphs:``,font:`monospace`,fontWeight:`normal`,color:`#2dff5c`,gradient:!1,color2:`#00b3ff`,headColor:`#d9ffe6`,background:`#000000`,speed:10,tail:18,tailFade:1,birthRate:.6,glyphSpeed:8,brightness:1,contrast:1,invert:!1,seed:0,bloom:1},argTypes:{src:{control:{type:`select`},options:Y},gridX:{control:{type:`range`,min:4,max:48,step:1}},gridY:{control:{type:`range`,min:4,max:48,step:1}},glyphs:{control:{type:`text`}},font:{control:{type:`text`}},fontWeight:{control:{type:`select`},options:X},color:{control:{type:`color`}},gradient:{control:{type:`boolean`}},color2:{control:{type:`color`}},headColor:{control:{type:`color`}},background:{control:{type:`color`}},speed:{control:{type:`range`,min:1,max:40,step:1}},tail:{control:{type:`range`,min:2,max:48,step:1}},tailFade:{control:{type:`range`,min:0,max:1,step:.05}},birthRate:{control:{type:`range`,min:.05,max:5,step:.05}},glyphSpeed:{control:{type:`range`,min:0,max:30,step:1}},brightness:{control:{type:`range`,min:.2,max:3,step:.1}},contrast:{control:{type:`range`,min:0,max:4,step:.1}},invert:{control:{type:`boolean`}},seed:{control:{type:`range`,min:0,max:100,step:1}},bloom:{control:{type:`range`,min:0,max:8,step:.1}}}},it=[`dots`,`rings`,`squares`],$={render:e=>{let t=a(),n=Array.from({length:6},(t,n)=>Ue(n,6,e.preset)),r=new xe({tiles:n,grid:e.grid,background:[0,0,0,1]});return _(t,e.src,r)},args:{src:`Pigeon`,preset:`dots`,grid:14},argTypes:{src:{control:{type:`select`},options:Y},preset:{control:{type:`select`},options:it},grid:{control:{type:`range`,min:4,max:48,step:1}}}},at=`bloom.crtBloom.pixelSort.jpegGlitch.badJpeg.fluid.halftone.particle.particleExplode.voronoi.glitch.rgbShift.rgbGlitch.rainbow.sinewave.coloredEdges.gradientMap.sliceShift.pixelStretch.warp.dither.tilePixelate.patternRefraction.duotone.tritone.hueShift.vignette.chromatic.ascii.matrix.asciiTiles`.split(`.`),y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Logo;
    img.style.display = "block";
    img.style.margin = "40px auto";
    return img;
  },
  args: undefined
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => {
    const img = document.createElement("img");
    img.src = Jellyfish;
    return img;
  },
  args: undefined
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
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
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
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
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
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
}`,...C.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
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
}`,...$.parameters?.docs?.source}}}})))()}ot();export{at as __namedExportsOrder,Z as ascii,$ as asciiTiles,C as badJpeg,y as bloom,J as chromatic,I as coloredEdges,b as crtBloom,We as default,V as dither,W as duotone,E as fluid,j as glitch,L as gradientMap,D as halftone,K as hueShift,S as jpegGlitch,Q as matrix,O as particle,k as particleExplode,U as patternRefraction,x as pixelSort,z as pixelStretch,P as rainbow,N as rgbGlitch,M as rgbShift,F as sinewave,R as sliceShift,H as tilePixelate,G as tritone,q as vignette,A as voronoi,B as warp};
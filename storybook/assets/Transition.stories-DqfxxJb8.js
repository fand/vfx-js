import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{i as t}from"./src-CqQFdW81.js";import{d as n,f as r,p as i}from"./utils-DMbXPY5c.js";import{E as a,O as o,S as s,b as c,c as l,f as u,g as d,i as f,m as p,n as m,o as h,t as g,u as _,v,w as y}from"./esm-DHO4CCJJ.js";function b(e){let t=C[e],n=[1,2,3].map(e=>`<li style="flex:1; padding:16px; border-radius:12px; background:${t.color}; color:#111">Card ${e}</li>`).join(``),r=document.createElement(`section`);return r.innerHTML=`
        <h2 style="margin:0 0 12px">${t.title}</h2>
        <p style="margin:0 0 24px; line-height:1.6">${t.body}</p>
        <ul style="display:flex; gap:16px; margin:0; padding:0; list-style:none">${n}</ul>
    `,r.hidden=e>0,r}var x,S,C,w,T,E;function D(){return(D=e((()=>{g(),r(),x={crossfade:{transition:t},swipe:{transition:l},swipeUp:{transition:l,params:{direction:`up`}},zoom:{transition:f},zoomBlur:{transition:m},crosszoom:{transition:o},glitch:{transition:s},glitchSlide:{transition:c},datamosh:{transition:a},pixelsort:{transition:u},pixelsortRight:{transition:u,params:{direction:`right`}},lensDistortion:{transition:v},slitScan:{transition:_},pixelScan:{transition:d},pixelStretch:{transition:p},tile:{transition:h},tileUp:{transition:h,params:{direction:`up`}},tileSquare:{transition:h,params:{shape:`square`}},distortFade:{transition:y}},S={none:void 0,"48px":48,full:!0},C=[{title:`Tab one`,color:`#ff4f6d`,body:`Click Next to swap this panel with a shader transition.`},{title:`Tab two`,color:`#3fb6ff`,body:`The old content is held while the DOM changes, then mixed into the new one.`},{title:`Tab three`,color:`#7bdc6b`,body:`A new run during a transition drops the old one.`}],w={title:`Transition`,parameters:{layout:`fullscreen`}},T={args:{transition:`crossfade`,reverse:!1,duration:.8,overflow:`none`},argTypes:{transition:{control:{type:`select`},options:Object.keys(x)},overflow:{control:{type:`select`},options:Object.keys(S)},duration:{control:{type:`range`,min:0,max:3,step:.1}}},render:e=>{let t=document.createElement(`div`);t.style.cssText=`padding:64px; font-family:sans-serif; color:white; max-width:720px`;let r=document.createElement(`button`);r.textContent=`Next`,r.style.cssText=`margin-bottom:24px; font-size:1rem`;let a=document.createElement(`div`);a.style.cssText=`width:560px; height:240px; box-sizing:border-box; padding:24px; border-radius:16px; background:#222`;let o=0;a.append(...C.map((e,t)=>b(t))),t.append(r,a);let s=i(),c=n(s?{timeScale:0}:void 0),l=c.addTransition(a,{...x[e.transition],reverse:e.reverse,duration:e.duration,overflow:S[e.overflow],waitFor:`none`}),u=()=>(o=(o+1)%C.length,l.show(o));return r.addEventListener(`click`,()=>void u()),s&&requestAnimationFrame(()=>{u(),setTimeout(()=>{c.setTime(e.duration/2),c.render()},1e3)}),t}},E=[`Tabs`],T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    transition: "crossfade",
    reverse: false,
    duration: 0.8,
    overflow: "none"
  },
  argTypes: {
    transition: {
      control: {
        type: "select"
      },
      options: Object.keys(TRANSITIONS)
    },
    overflow: {
      control: {
        type: "select"
      },
      options: Object.keys(OVERFLOW)
    },
    duration: {
      control: {
        type: "range",
        min: 0,
        max: 3,
        step: 0.1
      }
    }
  },
  render: args => {
    const root = document.createElement("div");
    root.style.cssText = "padding:64px; font-family:sans-serif; color:white; max-width:720px";

    // Keep the button outside the container, so the capture never covers it.
    const next = document.createElement("button");
    next.textContent = "Next";
    next.style.cssText = "margin-bottom:24px; font-size:1rem";

    // A fixed-size box: the tabs share one size, so nothing moves between them.
    // Width is explicit too; the story root shrinks to its content otherwise.
    const container = document.createElement("div");
    container.style.cssText = "width:560px; height:240px; box-sizing:border-box; padding:24px; border-radius:16px; background:#222";
    let index = 0;
    container.append(...PAGES.map((_, i) => renderPage(i)));
    root.append(next, container);
    const chromatic = isChromatic();
    const vfx = initVFX(chromatic ? {
      timeScale: 0
    } : undefined);
    const transition = vfx.addTransition(container, {
      ...TRANSITIONS[args.transition],
      reverse: args.reverse,
      duration: args.duration,
      overflow: OVERFLOW[args.overflow],
      waitFor: "none"
    });
    const swap = () => {
      index = (index + 1) % PAGES.length;
      return transition.show(index);
    };
    next.addEventListener("click", () => void swap());
    if (chromatic) {
      // Pin the clock halfway through one run for a stable snapshot.
      requestAnimationFrame(() => {
        void swap();
        setTimeout(() => {
          vfx.setTime(args.duration / 2);
          vfx.render();
        }, 1000);
      });
    }
    return root;
  }
}`,...T.parameters?.docs?.source}}}})))()}D();export{T as Tabs,E as __namedExportsOrder,w as default};
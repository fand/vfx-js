import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{d as t,f as n}from"./utils-BDkCp7KQ.js";import{n as r,t as i}from"./jellyfish-DtC6VyHr.js";function a(e){let t=document.createElement(`div`);return t.style.cssText=`position:fixed;left:0;right:0;top:${e*100}%;border-top:2px dashed #f0f;z-index:10000;pointer-events:none`,t}function o(e){return{args:{preset:e.preset},argTypes:{preset:{control:`select`,options:[`warpReveal`,`slitScanReveal`,`pixelateReveal`,`focusReveal`]}},render:({preset:n})=>{let i=document.getElementById(`storybook-root`);i.style.height=`auto`,i.style.display=`block`;let o=document.createElement(`div`);o.style.cssText=`background:#222;color:white`;let c=()=>{let e=document.createElement(`div`);return e.style.height=s,e},l=document.createElement(`img`);l.src=r,l.style.cssText=e.tall?`display:block;width:100%;height:200vh;object-fit:cover`:`display:block;width:480px;height:270px;margin:0 auto;object-fit:cover`,o.append(c(),l,c());let u=e.marginRatio??.2;u>0&&o.append(a(u),a(1-u));let d=t();e.timeScale!==void 0&&(d.timeScale=e.timeScale);let f=()=>l.getBoundingClientRect().top+scrollY,p={vfx:d,img:l,scrollIn:()=>scrollTo(0,f()-innerHeight/2+l.offsetHeight/2),scrollOut:()=>scrollTo(0,f()-innerHeight*.9),scrollAway:()=>scrollTo(0,0)},m=document.createElement(`div`);m.style.cssText=`position:fixed;top:16px;left:16px;max-width:360px;padding:12px;background:#000c;color:white;font:13px/1.5 sans-serif;z-index:10001`;let h=document.createElement(`p`);h.style.margin=`0 0 8px`,h.textContent=`Expected: ${e.expected}`,m.append(h);for(let t of e.steps){let e=document.createElement(`button`);e.textContent=t.label,e.style.cssText=`display:block;margin-top:4px`,e.onclick=()=>t.run(p),m.append(e)}o.append(m);let g=-innerHeight*u;return requestAnimationFrame(()=>{scrollTo(0,0),d.add(l,{shader:n,intersection:{rootMargin:[g,0,g,0],...e.intersection}})}),o},parameters:{layout:`fullscreen`,chromatic:{disableSnapshot:!0}}}}var s,c,l,u,d,f,p,m,h,g;function _(){return(_=e((()=>{i(),n(),s=`150vh`,c=e=>new Promise(t=>setTimeout(t,e)),l={title:`Scroll Reveal`},u={label:`Reset (scroll away)`,run:async({scrollAway:e})=>e()},d=o({preset:`warpReveal`,expected:`Scrolling back mid-leave plays the leave backward, so the image comes back from where it was.`,steps:[u,{label:`Enter, leave, come back after 0.4s`,run:async({scrollIn:e,scrollOut:t})=>{e(),await c(1500),t(),await c(400),e()}}]}),f=o({preset:`slitScanReveal`,expected:`Leaving mid-enter turns the wipe back from where it was, with no jump to the fully shown image.`,steps:[u,{label:`Enter, leave after 0.3s`,run:async({scrollIn:e,scrollOut:t})=>{e(),await c(300),t()}}]}),p=o({preset:`pixelateReveal`,expected:`Right after enter, the image shows as one large block, with no broken frame. timeScale is slowed so this lasts about 3s.`,timeScale:.005,steps:[u,{label:`Enter`,run:async({scrollIn:e})=>e()}]}),m=o({preset:`warpReveal`,expected:`The image is twice the viewport height. It still reaches threshold 0.6 and enters.`,tall:!0,marginRatio:0,intersection:{threshold:.6},steps:[u,{label:`Enter`,run:async({scrollIn:e})=>e()}]}),h=o({preset:`focusReveal`,expected:`The image is twice the viewport height. It is sharp and bright when it fills the screen.`,tall:!0,marginRatio:0,steps:[u,{label:`Enter`,run:async({scrollIn:e})=>e()}]}),g=[`ReverseMidLeave`,`LeaveMidEnter`,`PixelateDivideByZero`,`TallElementThreshold`,`TallElementFocus`],d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`scene({
  preset: "warpReveal",
  expected: "Scrolling back mid-leave plays the leave backward, so the image comes back from where it was.",
  steps: [reset, {
    label: "Enter, leave, come back after 0.4s",
    run: async ({
      scrollIn,
      scrollOut
    }) => {
      scrollIn();
      await wait(1500);
      scrollOut();
      await wait(400);
      scrollIn();
    }
  }]
})`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`scene({
  preset: "slitScanReveal",
  expected: "Leaving mid-enter turns the wipe back from where it was, with no jump to the fully shown image.",
  steps: [reset, {
    label: "Enter, leave after 0.3s",
    run: async ({
      scrollIn,
      scrollOut
    }) => {
      scrollIn();
      await wait(300);
      scrollOut();
    }
  }]
})`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`scene({
  preset: "pixelateReveal",
  expected: "Right after enter, the image shows as one large block, with no broken frame. timeScale is slowed so this lasts about 3s.",
  timeScale: 0.005,
  steps: [reset, {
    label: "Enter",
    run: async ({
      scrollIn
    }) => scrollIn()
  }]
})`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`scene({
  preset: "warpReveal",
  expected: "The image is twice the viewport height. It still reaches threshold 0.6 and enters.",
  tall: true,
  marginRatio: 0,
  intersection: {
    threshold: 0.6
  },
  steps: [reset, {
    label: "Enter",
    run: async ({
      scrollIn
    }) => scrollIn()
  }]
})`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`scene({
  preset: "focusReveal",
  expected: "The image is twice the viewport height. It is sharp and bright when it fills the screen.",
  tall: true,
  marginRatio: 0,
  steps: [reset, {
    label: "Enter",
    run: async ({
      scrollIn
    }) => scrollIn()
  }]
})`,...h.parameters?.docs?.source}}}})))()}_();export{f as LeaveMidEnter,p as PixelateDivideByZero,d as ReverseMidLeave,h as TallElementFocus,m as TallElementThreshold,g as __namedExportsOrder,l as default};
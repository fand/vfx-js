import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./logo-640w-20p-22Elz6NL.js";import{f as r,g as i,h as a,m as o,v as s,y as c}from"./utils-AjYcdxV6.js";import"./preset-DFGAZ5Mi.js";import{n as l,t as u}from"./amagi-rvGYqYQ3.js";import{n as d,t as f}from"./jellyfish-DtC6VyHr.js";import{n as p,t as m}from"./jellyfish-D_mofjh4.js";import{n as h,t as g}from"./bbb-BpWt09Zd.js";import{n as _,t as v}from"./pigeon-Dic8r3mQ.js";import{i as y,n as b,r as x,t as S}from"./robot-DYF1cG3Q.js";function C(e){if(e.video){let t=document.createElement(`video`);return t.muted=!0,t.loop=!0,t.playsInline=!0,t.autoplay=!0,t.crossOrigin=`anonymous`,t.style.cssText=e.style,t.src=e.src,t}let t=document.createElement(`img`);return t.style.cssText=e.style,t.src=e.src,t}function w(e){return new Promise((t,n)=>{if(e instanceof HTMLVideoElement){if(e.readyState>=2){t();return}e.addEventListener(`loadeddata`,()=>t(),{once:!0})}else{if(e.complete&&e.naturalWidth>0){t();return}e.addEventListener(`load`,()=>t(),{once:!0})}e.addEventListener(`error`,()=>n(Error(`load failed`)),{once:!0})})}var T,E,D,O,k,A,j,M,N,P,F;function I(){return(I=e((()=>{c(),l(),h(),m(),f(),x(),n(),v(),S(),a(),T=`max-width: min(70vw, 900px); max-height: 70vh`,E={"VFX-JS logo":{src:t,style:`width: min(80vw, 960px)`},amagi:{src:u,style:`height: min(70vh, 640px)`},jellyfish:{src:d,style:T},pigeon:{src:_,style:T},robot:{src:b,style:T},live:{src:y,style:T},"jellyfish (video)":{src:p,video:!0,style:T},"bbb (video)":{src:g,video:!0,style:T}},D=`radial-gradient(circle farthest-corner at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.047) 50%, rgba(0,0,0,0.105) 75%, rgba(0,0,0,0.187) 100%), radial-gradient(circle 200vh at 70% 95%, rgba(169,178,191,0.9) 0%, rgba(169,178,191,0.85) 12.5%, rgba(169,178,191,0.72) 25%, rgba(169,178,191,0.55) 37.5%, rgba(169,178,191,0.37) 50%, rgba(169,178,191,0.22) 62.5%, rgba(169,178,191,0.12) 75%, rgba(169,178,191,0) 100%), linear-gradient(to bottom, #5f6b80, #707d90)`,O={count:262144,pad:`fullscreen`,yaw:0,pitch:0,drag:!0,pointer:`repel`,shadow:!0},k={title:`Effect/Swirl Particles`,parameters:{layout:`fullscreen`,controls:{disable:!0}},render:e=>{let t=document.createElement(`div`);t.style.cssText=`position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: ${D}`;let n=o(),a=i(),c={...new s({...O,...e.params}).params},l=e.source,u=null,d=null,f=0,p=Promise.resolve(),m=async()=>{let e=++f,r=u,i=C(E[l]);u=i,r?(r.replaceWith(i),await p.catch(()=>{}),n.remove(r)):t.appendChild(i);try{await w(i),await new Promise(e=>requestAnimationFrame(e))}catch(e){console.error(e);return}e===f&&(d=new s(c,{still:a}),p=n.add(i,{effect:d}),await p)};return m().then(()=>{a||r(`Swirl Particles`,c,()=>{d&&Object.assign(d.params,c)},{keys:Object.keys(E),value:l,onChange:e=>{l=e,m()}},()=>void m())}),t}},A={args:{source:`VFX-JS logo`}},j={args:{source:`amagi`,params:{depth:.3,shadowDistance:.3}}},M={args:{source:`jellyfish`,params:{sourceColor:1}}},N=[`Every particle in this heading is born on the surface of the extruded letters and carried along a flow that curls around them. Most stay close and comb the surface into fibres; a few peel off and drift away as wisps before they fade and respawn.`,`The heading is a plain <h1> in the page. VFX-JS hides it and draws the effect on a canvas over the page, at the heading's position, so the layout, the text selection and the scroll all stay with the document.`,`The drop shadow falls on the page behind, a plane parallel to the screen. It is drawn on the same canvas, so it darkens this text too, as a shadow cast on a sheet of paper would.`,`With the default pad of 200 CSS px, the effect only renders around the heading. Scroll down and the effect scrolls with it; the paragraphs below keep their normal rendering.`],P={args:{source:`VFX-JS logo`},render:()=>{let e=document.createElement(`div`);e.style.cssText=`align-self: flex-start; width: 100%; min-height: 100vh; background: #f4f1ea; color: #2b2b2b; font: 18px/1.7 Georgia, 'Times New Roman', serif`;let t=document.createElement(`article`);t.style.cssText=`max-width: 760px; margin: 0 auto; padding: 160px 24px 240px`;let n=document.createElement(`p`);n.textContent=`VFX-JS / Effects`,n.style.cssText=`margin: 0 0 8px; font: 600 13px/1 system-ui, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; color: #8a8270`;let a=document.createElement(`h1`);a.textContent=`Swirl`,a.style.cssText=`width: fit-content; margin: 0 0 48px; font: 900 clamp(72px, 14vw, 180px)/1 system-ui, 'Helvetica Neue', Arial, sans-serif; letter-spacing: -0.02em; color: #222`,t.append(n,a);for(let e=0;e<3;e++)for(let e of N){let n=document.createElement(`p`);n.textContent=e,n.style.cssText=`margin: 0 0 1.2em`,t.appendChild(n)}e.appendChild(t);let c=o(),l=i(),u={...new s({depth:.3,shadow:!0,shadowDistance:.3,pointer:`repel`}).params},d=null,f=async()=>{d&&c.remove(a),await document.fonts?.ready,await new Promise(e=>requestAnimationFrame(e)),d=new s(u,{still:l}),await c.add(a,{effect:d})};return f().then(()=>{l||r(`Swirl Particles`,u,()=>{d&&Object.assign(d.params,u)},void 0,()=>void f())}),e}},F=[`logo`,`amagi`,`photo`,`heading`],A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  args: {
    source: "VFX-JS logo"
  }
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  // shadowDistance: the page where the default puts it at depth 0.22.
  args: {
    source: "amagi",
    params: {
      depth: 0.3,
      shadowDistance: 0.3
    }
  }
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  args: {
    source: "jellyfish",
    params: {
      sourceColor: 1
    }
  }
}`,...M.parameters?.docs?.source}}},P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  args: {
    source: "VFX-JS logo"
  },
  render: () => {
    const page = document.createElement("div");
    page.style.cssText =
    // The preset centres #storybook-root's content; start at the top.
    "align-self: flex-start; width: 100%; min-height: 100vh; background: #f4f1ea; color: #2b2b2b; font: 18px/1.7 Georgia, 'Times New Roman', serif";
    const article = document.createElement("article");
    article.style.cssText = "max-width: 760px; margin: 0 auto; padding: 160px 24px 240px";
    const kicker = document.createElement("p");
    kicker.textContent = "VFX-JS / Effects";
    kicker.style.cssText = "margin: 0 0 8px; font: 600 13px/1 system-ui, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; color: #8a8270";
    const h1 = document.createElement("h1");
    h1.textContent = "Swirl";
    // \`fit-content\`: the box hugs the text, left in the column, so its
    // centre is off the viewport's and \`cameraOrigin\` "element" and
    // "viewport" differ. A block-wide box would centre it.
    h1.style.cssText = "width: fit-content; margin: 0 0 48px; font: 900 clamp(72px, 14vw, 180px)/1 system-ui, 'Helvetica Neue', Arial, sans-serif; letter-spacing: -0.02em; color: #222";
    article.append(kicker, h1);
    for (let i = 0; i < 3; i++) {
      for (const text of ARTICLE_TEXT) {
        const p = document.createElement("p");
        p.textContent = text;
        p.style.cssText = "margin: 0 0 1.2em";
        article.appendChild(p);
      }
    }
    page.appendChild(article);
    const vfx = initVFX();
    const still = isChromatic();
    const params: SwirlParticleParams = {
      ...new SwirlParticleEffect({
        depth: 0.3,
        shadow: true,
        shadowDistance: 0.3,
        pointer: "repel"
      }).params
    };
    let effect: SwirlParticleEffect | null = null;
    const mount = async (): Promise<void> => {
      if (effect) {
        vfx.remove(h1);
      }
      // Wait for the web font fallback and for Storybook to attach
      // the page before VFX measures the heading.
      await document.fonts?.ready;
      await new Promise(r => requestAnimationFrame(r));
      effect = new SwirlParticleEffect(params, {
        still
      });
      await vfx.add(h1, {
        effect
      });
    };
    void mount().then(() => {
      if (still) {
        return;
      }
      attachSwirlParticlePane("Swirl Particles", params, () => {
        if (effect) {
          Object.assign(effect.params, params);
        }
      }, undefined, () => void mount());
    });
    return page;
  }
}`,...P.parameters?.docs?.source},description:{story:"A heading in an article page: the `<h1>` becomes the swirl, with the\nlibrary defaults (numeric `pad`, 65k particles) plus a drop shadow on\nthe page and the cursor repelling the particles.",...P.parameters?.docs?.description}}}})))()}I();export{F as __namedExportsOrder,j as amagi,k as default,P as heading,A as logo,M as photo};
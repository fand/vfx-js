import{T as Ge}from"./Timer-D64dUIku.js";import{i as xe}from"./utils-C00prF83.js";import{L as Re}from"./preset-B_9u5Dmn.js";import{J as v}from"./jellyfish-qrbjulKw.js";import"./vfx-CaMVhH5E.js";const Je=""+new URL("pigeon-ScEf6bli.webp",import.meta.url).href,_e={title:"Presets",render:r=>{const b=new Ge(r.defaultTime??0,[0,10]);document.body.append(b.element);const w=document.createElement("img");return w.src=r.src??Re,xe().add(w,{shader:r.preset,overflow:r.overflow,uniforms:{...r.uniforms??{},time:()=>b.time}}),w},parameters:{layout:"fullscreen"},args:{preset:"uvGradient"}},e=r=>({args:r}),s=e({preset:"uvGradient"}),t=e({preset:"glitch",overflow:100,defaultTime:2.5}),o=e({preset:"rgbGlitch",defaultTime:1}),a=e({preset:"rgbShift",defaultTime:2}),n=e({preset:"rainbow",defaultTime:0}),c=e({preset:"shine",defaultTime:0}),i=e({preset:"blink",defaultTime:1}),m=e({preset:"spring",defaultTime:1}),p=e({src:v,preset:"duotone",uniforms:{color1:[1,0,0,1],color2:[0,0,1,1]}}),u=e({src:v,preset:"tritone",uniforms:{color1:[1,0,0,1],color2:[0,1,0,1],color3:[0,0,1,1]}}),d=e({src:v,preset:"hueShift",defaultTime:1,uniforms:{shift:.5}}),l=e({preset:"sinewave",defaultTime:1}),f=e({preset:"pixelate",defaultTime:1}),g=e({src:v,preset:"halftone"}),h=e({preset:"invert"}),y=e({preset:"grayscale"}),S=e({preset:"vignette",uniforms:{intensity:.5,radius:1,power:2}}),T=e({src:Je,preset:"chromatic",uniforms:{intensity:.3,radius:0,power:2}});var G,x,R;s.parameters={...s.parameters,docs:{...(G=s.parameters)==null?void 0:G.docs,source:{originalSource:`story({
  preset: "uvGradient"
})`,...(R=(x=s.parameters)==null?void 0:x.docs)==null?void 0:R.source}}};var J,k,P;t.parameters={...t.parameters,docs:{...(J=t.parameters)==null?void 0:J.docs,source:{originalSource:`story({
  preset: "glitch",
  overflow: 100,
  defaultTime: 2.5
})`,...(P=(k=t.parameters)==null?void 0:k.docs)==null?void 0:P.source}}};var E,L,U;o.parameters={...o.parameters,docs:{...(E=o.parameters)==null?void 0:E.docs,source:{originalSource:`story({
  preset: "rgbGlitch",
  defaultTime: 1.0
})`,...(U=(L=o.parameters)==null?void 0:L.docs)==null?void 0:U.source}}};var V,_,B;a.parameters={...a.parameters,docs:{...(V=a.parameters)==null?void 0:V.docs,source:{originalSource:`story({
  preset: "rgbShift",
  defaultTime: 2.0
})`,...(B=(_=a.parameters)==null?void 0:_.docs)==null?void 0:B.source}}};var C,I,F;n.parameters={...n.parameters,docs:{...(C=n.parameters)==null?void 0:C.docs,source:{originalSource:`story({
  preset: "rainbow",
  defaultTime: 0.0
})`,...(F=(I=n.parameters)==null?void 0:I.docs)==null?void 0:F.source}}};var O,X,j;c.parameters={...c.parameters,docs:{...(O=c.parameters)==null?void 0:O.docs,source:{originalSource:`story({
  preset: "shine",
  defaultTime: 0.0
})`,...(j=(X=c.parameters)==null?void 0:X.docs)==null?void 0:j.source}}};var q,z,A;i.parameters={...i.parameters,docs:{...(q=i.parameters)==null?void 0:q.docs,source:{originalSource:`story({
  preset: "blink",
  defaultTime: 1.0
})`,...(A=(z=i.parameters)==null?void 0:z.docs)==null?void 0:A.source}}};var D,H,K;m.parameters={...m.parameters,docs:{...(D=m.parameters)==null?void 0:D.docs,source:{originalSource:`story({
  preset: "spring",
  defaultTime: 1.0
})`,...(K=(H=m.parameters)==null?void 0:H.docs)==null?void 0:K.source}}};var M,N,Q;p.parameters={...p.parameters,docs:{...(M=p.parameters)==null?void 0:M.docs,source:{originalSource:`story({
  src: Jellyfish,
  preset: "duotone",
  uniforms: {
    color1: [1, 0, 0, 1],
    color2: [0, 0, 1, 1]
  }
})`,...(Q=(N=p.parameters)==null?void 0:N.docs)==null?void 0:Q.source}}};var W,Y,Z;u.parameters={...u.parameters,docs:{...(W=u.parameters)==null?void 0:W.docs,source:{originalSource:`story({
  src: Jellyfish,
  preset: "tritone",
  uniforms: {
    color1: [1, 0, 0, 1],
    color2: [0, 1, 0, 1],
    color3: [0, 0, 1, 1]
  }
})`,...(Z=(Y=u.parameters)==null?void 0:Y.docs)==null?void 0:Z.source}}};var $,ee,re;d.parameters={...d.parameters,docs:{...($=d.parameters)==null?void 0:$.docs,source:{originalSource:`story({
  src: Jellyfish,
  preset: "hueShift",
  defaultTime: 1.0,
  uniforms: {
    shift: 0.5
  }
})`,...(re=(ee=d.parameters)==null?void 0:ee.docs)==null?void 0:re.source}}};var se,te,oe;l.parameters={...l.parameters,docs:{...(se=l.parameters)==null?void 0:se.docs,source:{originalSource:`story({
  preset: "sinewave",
  defaultTime: 1.0
})`,...(oe=(te=l.parameters)==null?void 0:te.docs)==null?void 0:oe.source}}};var ae,ne,ce;f.parameters={...f.parameters,docs:{...(ae=f.parameters)==null?void 0:ae.docs,source:{originalSource:`story({
  preset: "pixelate",
  defaultTime: 1.0
})`,...(ce=(ne=f.parameters)==null?void 0:ne.docs)==null?void 0:ce.source}}};var ie,me,pe;g.parameters={...g.parameters,docs:{...(ie=g.parameters)==null?void 0:ie.docs,source:{originalSource:`story({
  src: Jellyfish,
  preset: "halftone"
})`,...(pe=(me=g.parameters)==null?void 0:me.docs)==null?void 0:pe.source}}};var ue,de,le;h.parameters={...h.parameters,docs:{...(ue=h.parameters)==null?void 0:ue.docs,source:{originalSource:`story({
  preset: "invert"
})`,...(le=(de=h.parameters)==null?void 0:de.docs)==null?void 0:le.source}}};var fe,ge,he;y.parameters={...y.parameters,docs:{...(fe=y.parameters)==null?void 0:fe.docs,source:{originalSource:`story({
  preset: "grayscale"
})`,...(he=(ge=y.parameters)==null?void 0:ge.docs)==null?void 0:he.source}}};var ye,Se,Te;S.parameters={...S.parameters,docs:{...(ye=S.parameters)==null?void 0:ye.docs,source:{originalSource:`story({
  preset: "vignette",
  uniforms: {
    intensity: 0.5,
    radius: 1.0,
    power: 2.0
  }
})`,...(Te=(Se=S.parameters)==null?void 0:Se.docs)==null?void 0:Te.source}}};var ve,we,be;T.parameters={...T.parameters,docs:{...(ve=T.parameters)==null?void 0:ve.docs,source:{originalSource:`story({
  src: Pigeon,
  preset: "chromatic",
  uniforms: {
    intensity: 0.3,
    radius: 0.0,
    power: 2.0
  }
})`,...(be=(we=T.parameters)==null?void 0:we.docs)==null?void 0:be.source}}};const Be=["UvGradient","Glitch","RgbGlitch","RgbShift","Rainbow","Shine","Blink","spring","duotone","Tritone","hueShift","sinewave","pixelate","halftone","Invert","Grayscale","Vignette","Chromatic"];export{i as Blink,T as Chromatic,t as Glitch,y as Grayscale,h as Invert,n as Rainbow,o as RgbGlitch,a as RgbShift,c as Shine,u as Tritone,s as UvGradient,S as Vignette,Be as __namedExportsOrder,_e as default,p as duotone,g as halftone,d as hueShift,f as pixelate,l as sinewave,m as spring};

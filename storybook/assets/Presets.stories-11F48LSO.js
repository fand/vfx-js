import{n as e}from"./chunk-BneVvdWh.js";import{a as t,o as n}from"./utils-BLrKilFH.js";import{n as r,t as i}from"./preset-hB8Fk8QM.js";import{n as a,t as o}from"./jellyfish-D2xsay8i.js";import{n as s,t as c}from"./Timer-D-Ck6ryf.js";var l,u=e((()=>{l=``+new URL(`pigeon-ScEf6bli.webp`,import.meta.url).href})),d,f,p,m,h,g,_,v,y,b,x,S,C,w,T,E,D,O,k,A,j;e((()=>{s(),n(),r(),o(),u(),i(),d={title:`Presets`,render:e=>{let n=new c(e.defaultTime??0,[0,10]);document.body.append(n.element);let r=document.createElement(`img`);return r.src=e.src??`data:image/svg+xml,%3csvg%20width='640'%20height='265'%20viewBox='0%200%20640%20265'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M479.823%20190.844V159.355H543.798L438.836%2054.3939H597.643V85.8823H515.039L620%20190.844H479.823Z'%20fill='white'/%3e%3cpath%20fill-rule='evenodd'%20clip-rule='evenodd'%20d='M395.933%20159.355H430.208V20H461.696V190.844H364.445L395.933%20159.355Z'%20fill='white'/%3e%3cpath%20d='M412.659%20106.874V137.82H381.714L366.357%20122.615L381.714%20106.874H412.659Z'%20fill='white'/%3e%3cpath%20fill-rule='evenodd'%20clip-rule='evenodd'%20d='M226.839%2054.3939L295.064%20122.619L172.382%20245.301H217.096L317.421%20144.976L350.732%20178.287L373.089%20155.93L339.778%20122.619L408.003%2054.3939H363.289L317.421%20100.262L271.553%2054.3939H226.839ZM386.223%20169.065L364.444%20190.844H408.003L386.223%20169.065Z'%20fill='white'/%3e%3cpath%20d='M204.928%2085.8824V185.112L173.439%20216.639V54.3939H259.299V85.8824H204.928ZM221.621%20137.82V106.875H252.566L267.923%20122.615L252.566%20137.82H221.621Z'%20fill='white'/%3e%3cpath%20d='M124.961%20147.494V54.3935H156.45V223.696L20%2087.2464V42.5328L124.961%20147.494Z'%20fill='white'/%3e%3c/svg%3e`,t().add(r,{shader:e.preset,overflow:e.overflow,uniforms:{...e.uniforms??{},time:()=>n.time}}),r},parameters:{layout:`fullscreen`},args:{preset:`uvGradient`}},f=e=>({args:e}),p=f({preset:`uvGradient`}),m=f({preset:`glitch`,overflow:100,defaultTime:2.5}),h=f({preset:`rgbGlitch`,defaultTime:1}),g=f({preset:`rgbShift`,defaultTime:2}),_=f({preset:`rainbow`,defaultTime:0}),v=f({preset:`shine`,defaultTime:0}),y=f({preset:`blink`,defaultTime:1}),b=f({preset:`spring`,defaultTime:1}),x=f({src:a,preset:`duotone`,uniforms:{color1:[1,0,0,1],color2:[0,0,1,1]}}),S=f({src:a,preset:`tritone`,uniforms:{color1:[1,0,0,1],color2:[0,1,0,1],color3:[0,0,1,1]}}),C=f({src:a,preset:`hueShift`,defaultTime:1,uniforms:{shift:.5}}),w=f({preset:`sinewave`,defaultTime:1}),T=f({preset:`pixelate`,defaultTime:1}),E=f({src:a,preset:`halftone`}),D=f({preset:`invert`}),O=f({preset:`grayscale`}),k=f({preset:`vignette`,uniforms:{intensity:.5,radius:1,power:2}}),A=f({src:l,preset:`chromatic`,uniforms:{intensity:.3,radius:0,power:2}}),p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`story({
  preset: "uvGradient"
})`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`story({
  preset: "glitch",
  overflow: 100,
  defaultTime: 2.5
})`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`story({
  preset: "rgbGlitch",
  defaultTime: 1.0
})`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`story({
  preset: "rgbShift",
  defaultTime: 2.0
})`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`story({
  preset: "rainbow",
  defaultTime: 0.0
})`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`story({
  preset: "shine",
  defaultTime: 0.0
})`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`story({
  preset: "blink",
  defaultTime: 1.0
})`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`story({
  preset: "spring",
  defaultTime: 1.0
})`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`story({
  src: Jellyfish,
  preset: "duotone",
  uniforms: {
    color1: [1, 0, 0, 1],
    color2: [0, 0, 1, 1]
  }
})`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`story({
  src: Jellyfish,
  preset: "tritone",
  uniforms: {
    color1: [1, 0, 0, 1],
    color2: [0, 1, 0, 1],
    color3: [0, 0, 1, 1]
  }
})`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`story({
  src: Jellyfish,
  preset: "hueShift",
  defaultTime: 1.0,
  uniforms: {
    shift: 0.5
  }
})`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`story({
  preset: "sinewave",
  defaultTime: 1.0
})`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`story({
  preset: "pixelate",
  defaultTime: 1.0
})`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`story({
  src: Jellyfish,
  preset: "halftone"
})`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`story({
  preset: "invert"
})`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`story({
  preset: "grayscale"
})`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`story({
  preset: "vignette",
  uniforms: {
    intensity: 0.5,
    radius: 1.0,
    power: 2.0
  }
})`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`story({
  src: Pigeon,
  preset: "chromatic",
  uniforms: {
    intensity: 0.3,
    radius: 0.0,
    power: 2.0
  }
})`,...A.parameters?.docs?.source}}},j=[`UvGradient`,`Glitch`,`RgbGlitch`,`RgbShift`,`Rainbow`,`Shine`,`Blink`,`spring`,`duotone`,`Tritone`,`hueShift`,`sinewave`,`pixelate`,`halftone`,`Invert`,`Grayscale`,`Vignette`,`Chromatic`]}))();export{y as Blink,A as Chromatic,m as Glitch,O as Grayscale,D as Invert,_ as Rainbow,h as RgbGlitch,g as RgbShift,v as Shine,S as Tritone,p as UvGradient,k as Vignette,j as __namedExportsOrder,d as default,x as duotone,E as halftone,C as hueShift,T as pixelate,w as sinewave,b as spring};
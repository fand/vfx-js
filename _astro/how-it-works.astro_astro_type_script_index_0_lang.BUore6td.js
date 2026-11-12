import{t as e}from"./lifecycle.v3sQOfPt.js";import{t}from"./page-vfx.BmXFWMzi.js";import{t as n}from"./lazy.D1Bm5Zq-.js";var r=`
precision highp float;
uniform sampler2D src;
uniform vec2 resolution;
uniform vec2 offset;
uniform float intersection;  // 0..1, how much of the element is in view
uniform float enterProgress; // 0..1 after it enters
uniform float leaveProgress; // 0..1 after it leaves
out vec4 outColor;

void main() {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    vec4 color = texture(src, uv);
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // Color fills in from the left as more of the element is in view.
    float colored = step(uv.x, intersection);
    color.rgb = mix(vec3(gray), color.rgb, colored);

    // Fade in on enter, out on leave. Turns back if you scroll back mid-way.
    outColor = color * enterProgress * (1.0 - leaveProgress);
}
`,i={threshold:.5,duration:.8};e(()=>{let e=document.getElementById(`ClickDemo`);if(e){let r=0;n(e,()=>({shader:`rainbow`})),e.addEventListener(`click`,()=>{r++,e.textContent=`Clicked ${r} ${r===1?`time`:`times`}`,t().update(e)})}let a=document.getElementById(`ScrollDemo`);a&&n(a,()=>({shader:r,intersection:i}))});
import { ShaderTransition } from "./shader.js";

export class Crossfade extends ShaderTransition {
    readonly name = "crossfade";
    readonly frag = `
vec4 transition(vec2 uv, float t) {
  return mix(readFrom(uv), readTo(uv), t);
}
`;
}

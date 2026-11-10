import type { Effect, EffectContext, EffectTexture } from "@vfx-js/core";

const frag = `#version 300 es
precision highp float;
in vec2 uvSrc;
in vec2 uvContent;
out vec4 outColor;
uniform sampler2D src;
uniform sampler2D tiles;

void main() {
    vec4 color = texture(src, uvSrc);
    vec3 tint = texture(tiles, uvContent).rgb;
    outColor = vec4(color.rgb * tint, color.a);
}
`;

export class TileEffect implements Effect {
    #canvas = document.createElement("canvas");
    #texture: EffectTexture | null = null;

    constructor() {
        this.#canvas.width = 8;
        this.#canvas.height = 4;
        this.#paint();
    }

    init(ctx: EffectContext) {
        // A canvas updates every frame by default. Turn it off.
        this.#texture = ctx.wrapTexture(this.#canvas, {
            autoUpdate: false,
            filter: "nearest",
        });
    }

    /** Paint new colors, then upload them once. */
    shuffle() {
        this.#paint();
        this.#texture?.update();
    }

    render(ctx: EffectContext) {
        if (!this.#texture) {
            return;
        }
        ctx.draw({
            frag,
            uniforms: { src: ctx.src, tiles: this.#texture },
            target: ctx.target,
        });
    }

    dispose() {
        this.#texture?.dispose();
        this.#texture = null;
    }

    #paint() {
        const c = this.#canvas.getContext("2d");
        if (!c) {
            return;
        }
        for (let x = 0; x < this.#canvas.width; x++) {
            for (let y = 0; y < this.#canvas.height; y++) {
                c.fillStyle = `hsl(${Math.random() * 360} 90% 65%)`;
                c.fillRect(x, y, 1, 1);
            }
        }
    }
}

import { describe, expect, it } from "vitest";
import { detectGlslVersion } from "./program.js";

describe("detectGlslVersion", () => {
    it("picks 300 es when #version 300 es directive is present", () => {
        expect(
            detectGlslVersion(
                "#version 300 es\nprecision highp float;\nout vec4 outColor; void main(){ outColor = vec4(1); }",
            ),
        ).toBe("300 es");
    });

    it("picks 100 when #version 100 directive is present", () => {
        expect(
            detectGlslVersion(
                "#version 100\nprecision highp float; void main(){ gl_FragColor = vec4(1); }",
            ),
        ).toBe("100");
    });

    it("picks 100 on gl_FragColor usage", () => {
        expect(
            detectGlslVersion(
                "precision highp float; void main(){ gl_FragColor = vec4(1.); }",
            ),
        ).toBe("100");
    });

    it("picks 100 on texture2D usage", () => {
        expect(
            detectGlslVersion(
                "precision highp float; uniform sampler2D src; varying vec2 vUv; void main(){ gl_FragColor = texture2D(src, vUv); }",
            ),
        ).toBe("100");
    });

    it("picks 100 on varying declaration", () => {
        expect(
            detectGlslVersion(
                "precision highp float; varying vec2 vUv; void main(){}",
            ),
        ).toBe("100");
    });

    it("picks 100 on attribute declaration", () => {
        expect(
            detectGlslVersion(
                "precision highp float; attribute vec3 position; void main(){}",
            ),
        ).toBe("100");
    });

    it("defaults to 300 es when no markers are present", () => {
        expect(
            detectGlslVersion(
                "precision highp float; in vec3 position; void main(){}",
            ),
        ).toBe("300 es");
    });

    it("defaults to 300 es on empty source", () => {
        expect(detectGlslVersion("")).toBe("300 es");
    });
});

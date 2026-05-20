import { describe, expect, it, vi } from "vitest";

type MockProgram = {
    vert: string;
    frag: string;
    glslVersion: string | undefined;
    disposed: boolean;
    dispose: () => void;
};

const programs: MockProgram[] = [];

vi.mock("./gl/program.js", () => {
    class Program {
        vert: string;
        frag: string;
        glslVersion: string | undefined;
        disposed = false;
        constructor(
            _ctx: unknown,
            vert: string,
            frag: string,
            glslVersion?: string,
        ) {
            this.vert = vert;
            this.frag = frag;
            this.glslVersion = glslVersion;
            programs.push(this as unknown as MockProgram);
        }
        dispose() {
            this.disposed = true;
        }
    }
    return { Program };
});

import type { GLContext } from "./gl/context.js";
import { ProgramCache } from "./program-cache.js";

function makeCtx(): GLContext {
    return {} as unknown as GLContext;
}

describe("ProgramCache", () => {
    it("compiles each (frag, vert) pair exactly once", () => {
        programs.length = 0;
        const cache = new ProgramCache(makeCtx());
        const a = cache.get("VERT", "FRAG");
        const b = cache.get("VERT", "FRAG");
        expect(a).toBe(b);
        expect(programs).toHaveLength(1);
        expect(cache.size).toBe(1);
    });

    it("different frag → new Program", () => {
        programs.length = 0;
        const cache = new ProgramCache(makeCtx());
        cache.get("VERT", "FRAG_A");
        cache.get("VERT", "FRAG_B");
        expect(programs).toHaveLength(2);
        expect(cache.size).toBe(2);
    });

    it("different vert → new Program", () => {
        programs.length = 0;
        const cache = new ProgramCache(makeCtx());
        cache.get("VERT_A", "FRAG");
        cache.get("VERT_B", "FRAG");
        expect(programs).toHaveLength(2);
    });

    it("passes glslVersion through to Program", () => {
        programs.length = 0;
        const cache = new ProgramCache(makeCtx());
        cache.get("VERT", "FRAG", "300 es");
        expect(programs[0].glslVersion).toBe("300 es");
    });

    it("key collision guard: concatenated frag+vert that overlaps another pair", () => {
        // Without the NUL separator, ("a", "bc") and ("ab", "c") would
        // share a key. The \0 delimiter prevents that.
        programs.length = 0;
        const cache = new ProgramCache(makeCtx());
        const p1 = cache.get("bc", "a");
        const p2 = cache.get("c", "ab");
        expect(p1).not.toBe(p2);
        expect(programs).toHaveLength(2);
    });

    it("dispose() disposes every cached Program and clears the map", () => {
        programs.length = 0;
        const cache = new ProgramCache(makeCtx());
        cache.get("VERT", "FRAG_A");
        cache.get("VERT", "FRAG_B");
        cache.dispose();
        expect(programs[0].disposed).toBe(true);
        expect(programs[1].disposed).toBe(true);
        expect(cache.size).toBe(0);
    });

    it("get() after dispose() recompiles (no reuse of disposed handles)", () => {
        programs.length = 0;
        const cache = new ProgramCache(makeCtx());
        cache.get("VERT", "FRAG");
        cache.dispose();
        cache.get("VERT", "FRAG");
        expect(programs).toHaveLength(2);
        expect(programs[0].disposed).toBe(true);
        expect(programs[1].disposed).toBe(false);
    });
});

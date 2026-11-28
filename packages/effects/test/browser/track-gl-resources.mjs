// Opt-in diagnostics; never enabled during timing runs. Counts only objects
// created after attachment and estimates render-target texture storage.
export function trackGLResources(gl) {
    const original = new Map();
    const live = new Map();
    const bytes = new Map();
    const bound = new Map();
    let unit = gl.getParameter(gl.ACTIVE_TEXTURE);
    let textureBytes = 0;
    let peakTextureBytes = 0;
    const wrap = (name, callback) => {
        const method = gl[name];
        original.set(name, method);
        gl[name] = (...args) => callback(method.bind(gl), ...args);
    };
    for (const kind of [
        "Texture",
        "Framebuffer",
        "Renderbuffer",
        "Buffer",
        "Program",
        "Shader",
        "VertexArray",
        "Query",
    ]) {
        const objects = new Set();
        live.set(kind, objects);
        wrap(`create${kind}`, (create, ...args) => {
            const object = create(...args);
            if (object) {
                objects.add(object);
            }
            return object;
        });
        wrap(`delete${kind}`, (remove, object) => {
            objects.delete(object);
            if (kind === "Texture") {
                textureBytes -= bytes.get(object) ?? 0;
                bytes.delete(object);
            }
            return remove(object);
        });
    }
    wrap("activeTexture", (activate, next) => {
        unit = next;
        return activate(next);
    });
    wrap("bindTexture", (bind, target, texture) => {
        if (target === gl.TEXTURE_2D) {
            bound.set(unit, texture);
        }
        return bind(target, texture);
    });
    wrap("texImage2D", (allocate, ...args) => {
        const texture = bound.get(unit);
        // Explicit width/height allocation, level zero. Saber has no hardware
        // mipmaps; its manually sized levels are individual texture objects.
        if (
            args.length >= 9 &&
            args[1] === 0 &&
            live.get("Texture").has(texture)
        ) {
            const [, , format, width, height] = args;
            const stride =
                format === gl.RGBA32F
                    ? 16
                    : format === gl.RGBA16F || format === gl.RG32F
                      ? 8
                      : format === gl.R16F
                        ? 2
                        : 4;
            const size = width * height * stride;
            textureBytes += size - (bytes.get(texture) ?? 0);
            bytes.set(texture, size);
            peakTextureBytes = Math.max(peakTextureBytes, textureBytes);
        }
        return allocate(...args);
    });
    const lost = () => {
        for (const objects of live.values()) {
            objects.clear();
        }
        bytes.clear();
        bound.clear();
        unit = gl.TEXTURE0;
        textureBytes = 0;
    };
    gl.canvas.addEventListener("webglcontextlost", lost);
    return {
        snapshot() {
            return {
                objects: Object.fromEntries(
                    [...live].map(([kind, objects]) => [kind, objects.size]),
                ),
                textureBytes,
                peakTextureBytes,
            };
        },
        detach() {
            for (const [name, method] of original) {
                gl[name] = method;
            }
            gl.canvas.removeEventListener("webglcontextlost", lost);
        },
    };
}

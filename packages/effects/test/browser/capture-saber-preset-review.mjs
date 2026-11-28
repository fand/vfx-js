// Import from a frozen comparison harness. The local server must accept POST
// under /results/. See README for the reference frame layout and preparation.
import { SABER_PRESETS } from "./candidate/saber-presets.js";
import { createSaberFixture } from "./saber-quality.mjs";

export async function capturePresetReview({
    destination = "preset-review",
} = {}) {
    if (!/^[a-z0-9-]+$/.test(destination)) {
        throw new Error("Invalid capture destination");
    }
    const aeNames = new Set([
        "arc-reactor",
        "burning",
        "electric",
        "energy",
        "fog",
        "kryptonite",
        "fire",
        "torch",
        "tractor-beam",
        "windy",
        "wormhole",
    ]);
    const source = new Image();
    source.src = "../ae-source.png";
    await source.decode();
    const snapshot = await (await fetch("./manifest.json")).json();
    const manifest = {
        createdAt: new Date().toISOString(),
        width: 960,
        height: 540,
        fps: 24,
        startTime: 1,
        frameCount: 72,
        hashes: snapshot.hashes,
        presets: [],
    };
    const progress = { done: false, preset: "", frame: 0, completed: 0 };
    window.presetReviewJob = progress;
    const canvas = document.createElement("canvas");
    canvas.width = manifest.width;
    canvas.height = manifest.height;
    const context = canvas.getContext("2d");
    const pixels = context.createImageData(canvas.width, canvas.height);
    async function save(path, body) {
        const response = await fetch(`/results/${destination}/${path}`, {
            method: "POST",
            body,
        });
        if (!response.ok) {
            throw new Error(`Could not save ${path}: ${response.status}`);
        }
    }
    try {
        for (const key of Object.keys(SABER_PRESETS)) {
            progress.preset = key;
            const edgeThreshold = key === "wormhole" ? 1 : 0.5;
            const fixture = await createSaberFixture({
                width: 960,
                height: 540,
                sourceWidth: 960,
                sourceHeight: 540,
                pixelRatio: 1,
                options: {
                    preset: key,
                    source: false,
                    pad: 320,
                    edgeThreshold,
                },
                paint: (c) => c.drawImage(source, 0, 0),
            });
            try {
                for (let frame = 0; frame < manifest.frameCount; frame++) {
                    progress.frame = frame;
                    const shot = fixture.screen(
                        manifest.startTime + frame / manifest.fps,
                    );
                    for (let y = 0; y < canvas.height; y++) {
                        const offset = (shot.height - 1 - y) * shot.width * 4;
                        pixels.data.set(
                            shot.pixels.subarray(
                                offset,
                                offset + canvas.width * 4,
                            ),
                            y * canvas.width * 4,
                        );
                    }
                    // Compare emission on black; do not composite premultiplied
                    // light onto black a second time through a PNG alpha channel.
                    for (let i = 3; i < pixels.data.length; i += 4) {
                        pixels.data[i] = 255;
                    }
                    context.putImageData(pixels, 0, 0);
                    const blob = await new Promise((resolve) =>
                        canvas.toBlob(resolve),
                    );
                    if (!blob) {
                        throw new Error("PNG encoding failed");
                    }
                    await save(
                        `${key}/${String(frame).padStart(3, "0")}.png`,
                        blob,
                    );
                }
                const glError = fixture.gl.getError();
                if (glError) {
                    throw new Error(`${key}: WebGL error ${glError}`);
                }
                manifest.presets.push({
                    key,
                    ae: aeNames.has(key)
                        ? key
                        : key === "embers"
                          ? "burning"
                          : null,
                    edgeThreshold,
                    options: SABER_PRESETS[key],
                    glError,
                });
                progress.completed++;
            } finally {
                fixture.destroy();
            }
        }
        await save("manifest.json", JSON.stringify(manifest, null, 2));
        progress.done = true;
        return manifest;
    } catch (error) {
        progress.error = String(error);
        throw error;
    }
}

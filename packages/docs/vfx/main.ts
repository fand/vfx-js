import { VFX } from "web-vfx";
import "./index.css";

const vfx = new VFX({});

const shaders = ["rgbShift", "glitch", "halftone", "pixelate"];

for (const img of document.querySelectorAll("img")) {
    vfx.addImage(img, {
        shader: img.getAttribute("data-shader") ?? "glitch",
    });
}

for (const video of document.querySelectorAll("video")) {
    vfx.addVideo(video, {
        shader: "sinewave",
        overflow: 200,
    });
}

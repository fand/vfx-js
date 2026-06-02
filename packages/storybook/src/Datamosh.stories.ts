import type { Meta, StoryObj } from "@storybook/html-vite";

import { DatamoshEffect } from "@vfx-js/effects";
import JellyfishMp4 from "./assets/jellyfish.mp4";
import "./preset.css";
import { attachDatamoshPane, type DatamoshSource, initVFX } from "./utils";

export default {
    title: "Datamosh",
    parameters: { layout: "fullscreen" },
} satisfies Meta<undefined>;

export const datamosh: StoryObj<undefined> = {
    render: () => {
        const video = document.createElement("video");
        video.src = JellyfishMp4;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.autoplay = true;
        video.crossOrigin = "anonymous";
        video.style.display = "block";
        video.style.margin = "40px auto";
        video.style.maxWidth = "80vw";
        void video.play();
        return video;
    },
    args: undefined,
};

datamosh.play = async ({ canvasElement }) => {
    const video = canvasElement.querySelector("video") as HTMLVideoElement;
    if (video.readyState < 3) {
        await new Promise<void>((o) => {
            video.addEventListener("canplay", () => o(), { once: true });
        });
    }

    const vfx = initVFX();
    const effect = new DatamoshEffect();
    await vfx.add(video, { effect });

    let stream: MediaStream | null = null;
    attachDatamoshPane("Datamosh", effect, async (source: DatamoshSource) => {
        if (source === "webcam") {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            video.removeAttribute("src");
        } else {
            for (const t of stream?.getTracks() ?? []) {
                t.stop();
            }
            stream = null;
            video.srcObject = null;
            video.src = JellyfishMp4;
        }
        await video.play();
    });
};

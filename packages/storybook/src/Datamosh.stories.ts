import type { Meta, StoryObj } from "@storybook/html-vite";

import { DatamoshEffect } from "@vfx-js/effects";
import BbbWebm from "./assets/bbb.webm";
import JellyfishMp4 from "./assets/jellyfish.mp4";
import "./preset.css";
import { attachDatamoshPane, type DatamoshSource, initVFX } from "./utils";

const VIDEO_SRC: Record<"jellyfish" | "bbb", string> = {
    jellyfish: JellyfishMp4,
    bbb: BbbWebm,
};

export default {
    title: "Effect/Datamosh",
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
        for (const t of stream?.getTracks() ?? []) {
            t.stop();
        }
        stream = null;
        if (source === "webcam") {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            video.removeAttribute("src");
        } else {
            video.srcObject = null;
            video.src = VIDEO_SRC[source];
        }
        await video.play();
    });
};

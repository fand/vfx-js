import React, { useState, useCallback } from "react";
import * as VFX from "react-vfx";

const ExamplesSection: React.FC = () => {
    return (
        <section>
            <h2 id="examples">Examples</h2>
            <section>
                <h3>Glitch your images!!</h3>
                <VFX.VFXImg
                    src="react-logo.png"
                    shader="rgbShift"
                    width="320px"
                />
            </section>
            <section>
                <h3>⚡Animated GIFs are also supported!!⚡</h3>
                <div className="GifContainer">
                    <VFX.VFXImg src="chill.gif" shader="sinewave" />
                    <VFX.VFXImg src="octocat.gif" shader="glitch" />
                    <VFX.VFXImg src="cat.gif" shader="rainbow" />
                    <VFX.VFXImg src="doge.gif" shader="pixelate" />
                </div>
            </section>
            <section>
                <h3>Videos works well!</h3>
                <VFX.VFXVideo
                    src="mind_blown.mp4"
                    shader="halftone"
                    autoPlay
                    loop
                    muted
                    playsInline
                />
            </section>
            <section>
                <h3>
                    <VFX.VFXSpan
                        style={{ fontSize: "72px", fontWeight: "bold" }}
                        shader="sinewave"
                    >
                        You can also add effects to plain text!!!!!
                    </VFX.VFXSpan>
                </h3>
            </section>
        </section>
    );
};

export default ExamplesSection;

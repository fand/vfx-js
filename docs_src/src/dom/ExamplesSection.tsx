import React, { useState, useCallback } from "react";
import * as VFX from "react-vfx";
import "./ExampleSection.css";

const ExamplesSection: React.FC = () => {
    return (
        <section className="ExamplesSection">
            <h2 id="examples">Examples</h2>
            <section>
                <h3>Add effects to your images!!</h3>
                <div className="ImgContainer">
                    <VFX.VFXImg src="react-logo.png" shader="rainbow" />
                    <VFX.VFXImg src="david.png" shader="rgbShift" />
                </div>
            </section>
            <section>
                <h3>⚡Animated GIFs are also supported!!⚡</h3>
                <div className="ImgContainer">
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
            <section className="VFXSpanExample">
                <VFX.VFXSpan shader="sinewave">
                    You can also add effects to <br />
                    plain text!!!!!
                </VFX.VFXSpan>
            </section>
            <section>
                <h3>... and make Transition Effects!</h3>
                <VFX.VFXImg shader="warpTransition" src="logo.png" />
                <br />
                <VFX.VFXImg shader="slitScanTransition" src="logo.png" />
                <br />
                <VFX.VFXImg shader="pixelateTransition" src="logo.png" />
                <br />
            </section>
        </section>
    );
};

export default ExamplesSection;

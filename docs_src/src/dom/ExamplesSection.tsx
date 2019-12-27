import React from "react";
import LazyLoad from "react-lazyload";
import * as VFX from "react-vfx";
import "./ExamplesSection.css";

const ExamplesSection: React.FC = () => {
    return (
        <section className="ExamplesSection">
            <h2 id="examples">Examples</h2>
            <section>
                <h3>Add effects to your images!!</h3>
                <div className="ImgContainer">
                    <LazyLoad height={320}>
                        <VFX.VFXImg src="react-logo.png" shader="rainbow" />
                    </LazyLoad>
                    <LazyLoad height={320}>
                        <VFX.VFXImg src="david.png" shader="rgbShift" />
                    </LazyLoad>
                </div>
            </section>
            <section>
                <h3>
                    <span role="img" aria-label="zap">
                        ⚡
                    </span>
                    Animated GIFs are also supported!!
                    <span role="img" aria-label="zap">
                        ⚡
                    </span>
                </h3>
                <div className="ImgContainer">
                    <LazyLoad height={320}>
                        <VFX.VFXImg src="chill.gif" shader="sinewave" />
                    </LazyLoad>
                    <LazyLoad height={320}>
                        <VFX.VFXImg src="octocat.gif" shader="glitch" />
                    </LazyLoad>
                    <LazyLoad height={320}>
                        <VFX.VFXImg src="cat.gif" shader="rainbow" />
                    </LazyLoad>
                    <LazyLoad height={320}>
                        <VFX.VFXImg src="doge.gif" shader="pixelate" />
                    </LazyLoad>
                </div>
            </section>
            <section>
                <h3>Videos work well!</h3>
                <LazyLoad height={320}>
                    <VFX.VFXVideo
                        src="mind_blown.mp4"
                        shader="halftone"
                        autoPlay
                        loop
                        muted
                        playsInline
                    />
                    {/* Dummy video element to help browser decoding video. I don't know why this works... */}
                    <video
                        src="mind_blown.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{ width: "0.1px", height: "0.1px" }}
                    />
                </LazyLoad>
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

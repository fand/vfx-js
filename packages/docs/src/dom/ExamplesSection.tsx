import React from "react";
import LazyLoad from "react-lazyload";
import * as VFX from "react-vfx";
import "./ExamplesSection.css";

function pub(name: string): string {
    return `${import.meta.env.BASE_URL}${name}`;
}

const ExamplesSection: React.FC = () => {
    return (
        <section className="ExamplesSection">
            <h2 id="examples">Examples</h2>
            <section>
                <h3>Add effects to your images!!</h3>
                <div className="ImgContainer">
                    <LazyLoad height={320}>
                        <VFX.VFXImg
                            src={pub("react-logo.png")}
                            shader="rainbow"
                        />
                    </LazyLoad>
                    <LazyLoad height={320}>
                        <VFX.VFXImg
                            src={pub("david.png")}
                            shader="rgbShift"
                            overflow
                        />
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
                        <VFX.VFXImg
                            src={pub("chill.gif")}
                            shader="sinewave"
                            overflow={30}
                        />
                    </LazyLoad>
                    <LazyLoad height={320}>
                        <VFX.VFXImg
                            src={pub("octocat.gif")}
                            shader="glitch"
                            overflow={[0, 100, 0, 100]}
                        />
                    </LazyLoad>
                    <LazyLoad height={320}>
                        <VFX.VFXImg src={pub("cat.gif")} shader="rainbow" />
                    </LazyLoad>
                    <LazyLoad height={320}>
                        <VFX.VFXImg src={pub("doge.gif")} shader="pixelate" />
                    </LazyLoad>
                </div>
            </section>
            <section>
                <h3>Videos work well!</h3>
                <LazyLoad height={320}>
                    <VFX.VFXVideo
                        src={pub("mind_blown.mp4")}
                        shader="halftone"
                        autoPlay
                        loop
                        muted
                        playsInline
                    />
                </LazyLoad>
            </section>
            <section className="VFXSpanExample">
                <VFX.VFXSpan shader="sinewave" overflow>
                    You can also add effects to <br />
                    plain text!!!!!
                </VFX.VFXSpan>
            </section>
            <section>
                <h3>... and make Transition Effects!</h3>
                <VFX.VFXImg
                    shader="warpTransition"
                    src={pub("logo.png")}
                    overflow={[0, 1000, 0, 1000]}
                />
                <br />
                <VFX.VFXImg shader="slitScanTransition" src={pub("logo.png")} />
                <br />
                <VFX.VFXImg shader="pixelateTransition" src={pub("logo.png")} />
                <br />
            </section>
        </section>
    );
};

export default ExamplesSection;

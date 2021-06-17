import React from "react";
import * as VFX from "react-vfx";
import "./IntroSection.css";

const IntroSection: React.FC = () => {
    return (
        <section className="IntroSection">
            <p>
                <VFX.VFXImg src="./logo-oneline.png" shader="rgbGlitch" /> is a{" "}
                <VFX.VFXImg src="./react-logo-oneline.png" shader="rainbow" />{" "}
                component library. It allows you to add{" "}
                <VFX.VFXImg src="./webgl-logo.png" shader="spring" /> powered
                effects to your{" "}
                <VFX.VFXImg src="./react-logo-oneline.png" shader="rainbow" />{" "}
                application. You can easily add{" "}
                <VFX.VFXSpan style={{ display: "block" }} shader="glitch">
                    glitched images,{" "}
                </VFX.VFXSpan>
                <VFX.VFXSpan style={{ display: "block" }} shader="sinewave">
                    stylized videos
                </VFX.VFXSpan>{" "}
                and
                <VFX.VFXSpan style={{ display: "block" }} shader="shine">
                    {" "}
                    shiny texts{" "}
                </VFX.VFXSpan>
                to your website!!
            </p>
        </section>
    );
};

export default IntroSection;

import React, { useState, useCallback } from "react";
import * as VFX from "react-vfx";
import "./IntroSection.css";

const IntroSection: React.FC = () => {
    return (
        <section className="IntroSection">
            <p>
                <VFX.VFXImg src="./logo-oneline.png" shader="rgbShift" /> is a{" "}
                <VFX.VFXImg src="./react-logo-oneline.png" shader="rainbow" />{" "}
                component library. It allows you to add{" "}
                <VFX.VFXImg src="./webgl-logo.png" shader="rainbow" />
                -powered effects to your{" "}
                <VFX.VFXImg
                    src="./react-logo-oneline.png"
                    shader="rainbow"
                />{" "}
                application. You can easily add{" "}
                <VFX.VFXDiv shader="glitch">glitched images, </VFX.VFXDiv>
                <VFX.VFXDiv shader="rgbGlitch">stylized videos</VFX.VFXDiv> and
                <VFX.VFXDiv shader="rainbow"> shiny texts </VFX.VFXDiv>
                to your website!!
            </p>
        </section>
    );
};

export default IntroSection;

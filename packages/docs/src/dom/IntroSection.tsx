import React from "react";
import * as VFX from "react-vfx";
import "./IntroSection.css";

function pub(name: string): string {
    return `${import.meta.env.BASE_URL}${name}`;
}

const IntroSection: React.FC = () => {
    return (
        <section className="IntroSection">
            <p>
                <VFX.VFXImg src={pub("logo-oneline.png")} shader="rgbGlitch" />{" "}
                is a{" "}
                <VFX.VFXImg
                    src={pub("react-logo-oneline.png")}
                    shader="rainbow"
                />{" "}
                component library. It allows you to add{" "}
                <VFX.VFXImg src={pub("webgl-logo.png")} shader="spring" />{" "}
                powered effects to your{" "}
                <VFX.VFXImg
                    src={pub("react-logo-oneline.png")}
                    shader="rainbow"
                />{" "}
                application. You can easily add{" "}
                <VFX.VFXSpan
                    style={{ display: "block" }}
                    shader="glitch"
                    overflow={[0, 200, 0, 200]}
                >
                    glitched images,{" "}
                </VFX.VFXSpan>
                <VFX.VFXSpan
                    style={{ display: "block" }}
                    shader="sinewave"
                    overflow
                >
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

import React from "react";
import * as VFX from "react-vfx";
import "./LogoSection.css";

function pub(name: string): string {
    return `${import.meta.env.BASE_URL}${name}`;
}

const LogoSection: React.FC = () => {
    return (
        <section className="LogoSection">
            <VFX.VFXImg
                className="logo"
                src={pub("logo.png")}
                shader={"rgbShift"}
            />
        </section>
    );
};
export default LogoSection;

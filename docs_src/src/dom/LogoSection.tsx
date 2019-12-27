import React from "react";
import * as VFX from "react-vfx";
import "./LogoSection.css";

const LogoSection: React.FC = () => {
    return (
        <section className="LogoSection">
            <VFX.VFXImg className="logo" src="logo.png" shader={"rgbShift"} />
        </section>
    );
};
export default LogoSection;

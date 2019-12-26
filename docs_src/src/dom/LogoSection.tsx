import React, { useRef, useEffect } from "react";
import * as VFX from "react-vfx";
import "./LogoSection.css";

const LogoSection: React.FC = () => {
    const ref = useRef<HTMLElement>(null);

    // Shrink height on iOS
    useEffect(() => {
        if (ref.current != null && typeof window !== "undefined") {
            ref.current.style.minHeight = window.innerHeight + "px";
        }
    }, []);

    return (
        <section className="LogoSection" ref={ref}>
            <VFX.VFXImg
                className="logo"
                src="logo-mobile@2x.png"
                shader={"rgbShift"}
            />
        </section>
    );
};
export default LogoSection;

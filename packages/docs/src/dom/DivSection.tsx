import React, { useState, useCallback, useRef } from "react";
import * as VFX from "react-vfx";
import "./InputSection.css";
import { InlineCode } from "./Code";

const InputSection: React.FC = () => {
    const divRef = useRef<HTMLDivElement>(null);
    const rerender = VFX.useVfx();

    const onChange = () => {
        divRef.current && rerender(divRef.current);
    };

    return (
        <section className="DivSection">
            <h3>Div (experimental)</h3>
            <p>
                REACT-VFX also has <InlineCode>VFXDiv</InlineCode>, which allow
                us to wrap any elements...
                <br />
                so you can make an interactive form with WebGL effects!!
            </p>
            <VFX.VFXDiv shader="rgbShift" ref={divRef}>
                <textarea onChange={onChange} onResize={onChange}>
                    Hello
                </textarea>
                <br />
                <input type="text" defaultValue="Hello" onChange={onChange} />
                <br />
                <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="0"
                    onChange={onChange}
                />
            </VFX.VFXDiv>
        </section>
    );
};

export default InputSection;

import React, { useState, useCallback, useRef } from "react";
import * as VFX from "react-vfx";
import "./DivSection.css";
import { InlineCode } from "./Code";

const DivSection: React.FC = () => {
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
                <div className="DivSections">
                    <div className="DivSectionField">
                        <label htmlFor="DivTextArea">Textarea</label>
                        <textarea
                            id="DivTextArea"
                            onChange={onChange}
                            onResize={onChange}
                        >
                            Hello
                        </textarea>
                    </div>

                    <div className="DivSectionField">
                        <label htmlFor="DivInput">Input</label>
                        <input
                            id="DivInput"
                            type="text"
                            defaultValue="Hello"
                            onChange={onChange}
                        />
                    </div>

                    <div className="DivSectionField">
                        <label htmlFor="DivInputRange">Range</label>
                        <input
                            id="DivInputRange"
                            type="range"
                            min="0"
                            max="100"
                            defaultValue="0"
                            onChange={onChange}
                        />
                    </div>
                </div>
            </VFX.VFXDiv>
        </section>
    );
};

export default DivSection;

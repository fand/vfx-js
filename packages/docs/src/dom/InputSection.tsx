import React, { useState, useCallback } from "react";
import * as VFX from "react-vfx";
import "./InputSection.css";
import { Code, InlineCode } from "./Code";
import dedent from "dedent";
import debounce from "lodash.debounce";

const InputSection: React.FC = () => {
    const [text, setText] = useState("Try editing text!");
    const [debouncedText, setDebouncedText] = useState(text);

    const update = useCallback(
        debounce(() => {
            setDebouncedText(text);
        }),
        [text],
    );

    return (
        <section>
            <h3>Text</h3>
            <p>
                Use <InlineCode>{"<VFXSpan>"}</InlineCode> instead of{" "}
                <InlineCode>{"<span>"}</InlineCode>.<br />
            </p>
            <Code>
                {dedent`
                import { VFXSpan } from 'react-vfx';

                <VFXSpan>Hello world!</VFXSpan>
            `}
            </Code>
            <p>
                <InlineCode>{"<VFXSpan>"}</InlineCode> automatically re-renders
                when its content is updated.
            </p>

            <section className="InputSection">
                <p style={{ fontSize: "48px", fontWeight: "bold" }}>
                    <VFX.VFXSpan shader="rainbow">{debouncedText}</VFX.VFXSpan>
                </p>
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <button type="button" onClick={update}>
                    Update!
                </button>
            </section>
        </section>
    );
};

export default InputSection;

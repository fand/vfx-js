import React, { useState, useCallback } from "react";
import * as VFX from "react-vfx";
import "./InputSection.css";
import { Code, InlineCode } from "./Code";
import dedent from "dedent";
import debounce from "lodash.debounce";

const InputSection: React.FC = () => {
    const [text, setText] = useState("Edit me!!!");

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
                <p
                    style={{
                        fontSize: "48px",
                        fontWeight: "bold",
                    }}
                >
                    <VFX.VFXSpan shader="rainbow">
                        {text === "" ? "Input something..." : text}
                    </VFX.VFXSpan>
                </p>
                <input
                    type="text"
                    value={text}
                    placeholder="Input something..."
                    onChange={(e) => setText(e.target.value)}
                />
            </section>
        </section>
    );
};

export default InputSection;

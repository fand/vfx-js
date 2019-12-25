import React, { useState, useCallback } from "react";
import * as VFX from "react-vfx";
import "./InputSection.css";

const InputSection: React.FC = () => {
    const [text, setText] = useState("Try editing text!");
    const [debouncedText, setDebouncedText] = useState(text);

    const update = useCallback(() => {
        setDebouncedText(text);
    }, [text]);

    return (
        <section className="InputSection">
            <h2>
                <VFX.VFXSpan shader="rainbow">{debouncedText}</VFX.VFXSpan>
            </h2>
            <textarea
                value={text}
                onChange={e => setText(e.target.value)}
            ></textarea>
            <button type="button" onClick={update}>
                <VFX.VFXSpan shader="rainbow">FIRE</VFX.VFXSpan>
            </button>
        </section>
    );
};

export default InputSection;

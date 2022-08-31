import React, { useState, useCallback } from "react";
import VFX from "react-vfx";
import "./InputSection.css";

const InputSection: React.FC = () => {
    const [text, setText] = useState("Try editing text!");
    const [debouncedText, setDebouncedText] = useState(text);

    const update = useCallback(() => {
        setDebouncedText(text);
    }, [text]);

    return (
        <section className="InputSection">
            <p style={{ fontSize: "48px", fontWeight: "bold" }}>
                <VFX.VFXSpan shader="rainbow">{debouncedText}</VFX.VFXSpan>
            </p>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
            ></textarea>
            <button type="button" onClick={update}>
                <VFX.VFXSpan shader="rainbow">FIRE</VFX.VFXSpan>
            </button>
        </section>
    );
};

export default InputSection;

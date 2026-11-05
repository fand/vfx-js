"use client";

import { useEffect, useState } from "react";

const variants = [
    { key: "serif", text: "transitions" },
    { key: "thin", text: "TRANSITIONS" },
    { key: "acid", text: "transitions" },
    { key: "kana", text: "トランジション" },
    { key: "mono", text: "transitions_" },
    { key: "outline", text: "transitions" },
    { key: "gradient", text: "transitions" },
    { key: "block", text: "TRANSITIONS" },
];

const INTERVAL = 500;

/** Cycles through styled variants without moving the layout. */
export function HeroWord() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }
        const id = setInterval(
            () => setIndex((i) => (i + 1) % variants.length),
            INTERVAL,
        );
        return () => clearInterval(id);
    }, []);

    return (
        <>
            <span className="sr-only">transitions</span>
            <span className="hero-word" aria-hidden>
                {variants.map((v, i) => (
                    <span
                        key={v.key}
                        className={`hero-word-${v.key}`}
                        data-active={i === index || undefined}
                    >
                        {v.text}
                    </span>
                ))}
            </span>
        </>
    );
}

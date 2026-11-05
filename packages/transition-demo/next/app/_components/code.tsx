"use client";

import { useState } from "react";
import { highlight } from "./highlight";

export function Code({
    children,
    label,
}: {
    children: string;
    label?: string;
}) {
    const code = children.trim();
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard?.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        });
    };
    return (
        <div className="code">
            <div className="code-bar">
                <span>{label}</span>
                <button type="button" onClick={copy}>
                    {copied ? "Copied" : "Copy"}
                </button>
            </div>
            <pre>
                <code>{highlight(code)}</code>
            </pre>
        </div>
    );
}

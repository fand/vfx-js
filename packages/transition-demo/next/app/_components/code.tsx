"use client";

import { useState } from "react";

const TOKEN =
    /(\/\/[^\n]*|<!--[\s\S]*?-->)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(import|from|export|const|let|return|await|async|new|function|type|if|else|for|of|uniform|vec2|vec3|vec4|float|bool|true|false)\b|\b(\d+(?:\.\d+)?)\b|(<\/?[A-Za-z][\w.-]*|\/?>)/g;

function highlight(src: string): React.ReactNode[] {
    const out: React.ReactNode[] = [];
    let last = 0;
    for (const m of src.matchAll(TOKEN)) {
        const i = m.index ?? 0;
        if (i > last) {
            out.push(src.slice(last, i));
        }
        const cls = m[1]
            ? "tk-c"
            : m[2]
              ? "tk-s"
              : m[3]
                ? "tk-k"
                : m[4]
                  ? "tk-n"
                  : "tk-t";
        out.push(
            <span key={i} className={cls}>
                {m[0]}
            </span>,
        );
        last = i + m[0].length;
    }
    out.push(src.slice(last));
    return out;
}

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

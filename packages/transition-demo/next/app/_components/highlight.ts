import { createElement, type ReactNode } from "react";

const KEYWORDS =
    "import|from|export|const|let|return|await|async|new|function|type|if|else|for|of|in|out|uniform|precision|void|int|bool|float|vec2|vec3|vec4|mat2|mat3|mat4|sampler2D|discard|true|false";
const BUILTINS =
    "mix|smoothstep|step|fract|clamp|texture|length|dot|sin|cos|floor|abs|min|max|pow|normalize";

// Groups, in order: comment (incl. GLSL `#` lines), string, keyword, builtin, number, tag.
const TOKEN = new RegExp(
    [
        /(\/\/[^\n]*|<!--[\s\S]*?-->|^[ \t]*#[^\n]*)/.source,
        /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/.source,
        `\\b(${KEYWORDS})\\b`,
        `\\b(${BUILTINS})(?=\\s*\\()`,
        /\b(\d+(?:\.\d+)?)\b/.source,
        /(<\/?[A-Za-z][\w.-]*|\/?>)/.source,
    ].join("|"),
    "gm",
);

const CLASSES = ["tk-c", "tk-s", "tk-k", "tk-f", "tk-n", "tk-t"];

export function highlight(src: string): ReactNode[] {
    const out: ReactNode[] = [];
    let last = 0;
    for (const m of src.matchAll(TOKEN)) {
        const i = m.index ?? 0;
        if (i > last) {
            out.push(src.slice(last, i));
        }
        const group = m.findIndex((g, n) => n > 0 && g !== undefined);
        out.push(
            createElement(
                "span",
                { key: i, className: CLASSES[group - 1] },
                m[0],
            ),
        );
        last = i + m[0].length;
    }
    out.push(src.slice(last));
    return out;
}

import { createElement, type ReactNode } from "react";

const TOKEN =
    /(\/\/[^\n]*|<!--[\s\S]*?-->)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(import|from|export|const|let|return|await|async|new|function|type|if|else|for|of|uniform|vec2|vec3|vec4|float|bool|true|false)\b|\b(\d+(?:\.\d+)?)\b|(<\/?[A-Za-z][\w.-]*|\/?>)/g;

export function highlight(src: string): ReactNode[] {
    const out: ReactNode[] = [];
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
        out.push(createElement("span", { key: i, className: cls }, m[0]));
        last = i + m[0].length;
    }
    out.push(src.slice(last));
    return out;
}

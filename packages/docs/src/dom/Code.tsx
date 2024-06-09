import React from "react";

// import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
// import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
// import { darcula } from "react-syntax-highlighter/dist/esm/styles/prism";

// SyntaxHighlighter.registerLanguage("jsx", jsx);

import hljs from "highlight.js/lib/core";
import "highlight.js/styles/tokyo-night-dark.min.css";

import javascript from "highlight.js/lib/languages/javascript";
hljs.registerLanguage("javascript", javascript);
import glsl from "highlight.js/lib/languages/glsl";
hljs.registerLanguage("glsl", glsl);
// import jsx from "highlight.js/lib/languages/jsx";
// hljs.registerLanguage("jsx", jsx);

const Frag = ({ children }: any) => <>{children}</>;

const style = {
    fontSize: "20px",
    width: "960px",
    maxWidth: "calc(100% - 40px)",
    margin: "0 auto",
    textAlign: "left",
};

export const Code = ({ children }: any) => {
    const c = hljs.highlight("javascript", children);

    return (
        <pre style={style}>
            <div dangerouslySetInnerHTML={{ __html: c.value }} />
        </pre>
    );
};

export const InlineCode = ({ children }: any) => (
    <code>{children}</code>
    // <SyntaxHighlighter
    //     language="jsx"
    //     style={darcula}
    //     customStyle={style}
    //     PreTag={Frag}
    // >
    //     {children}
    // </SyntaxHighlighter>
);

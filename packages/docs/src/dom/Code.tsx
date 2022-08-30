import React from "react";

import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import { darcula } from "react-syntax-highlighter/dist/esm/styles/prism";

SyntaxHighlighter.registerLanguage("jsx", jsx);

const Frag = ({ children }: any) => <>{children}</>;

const style = {
    fontSize: "20px",
    width: "960px",
    maxWidth: "calc(100% - 40px)",
    margin: "0 auto"
};

export const Code = ({ children }: any) => (
    <SyntaxHighlighter language="jsx" style={darcula} customStyle={style}>
        {children}
    </SyntaxHighlighter>
);

export const InlineCode = ({ children }: any) => (
    <SyntaxHighlighter
        language="jsx"
        style={darcula}
        customStyle={style}
        PreTag={Frag}
    >
        {children}
    </SyntaxHighlighter>
);

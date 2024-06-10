import { Highlight, themes } from "prism-react-renderer";

const preStyle = {
    fontSize: "0.6em",
    width: "960px",
    maxWidth: "calc(100% - 40px)",
    margin: "0 auto",
    padding: "16px",
    lineHeight: 1.5,
    textAlign: "left",
    overflowX: "auto",
};

const inlineStyle = {
    fontSize: "0.8em",
    margin: "4px",
    padding: "4px 8px",
};

export const Code = ({ children }: any) => (
    <div>
        <Highlight language="jsx" theme={themes.oneDark} code={children}>
            {({ style, tokens, getLineProps, getTokenProps }) => (
                <pre style={{ ...style, ...preStyle }}>
                    {tokens.map((line, i) => (
                        <div key={i} {...getLineProps({ line })}>
                            {line.map((token, key) => (
                                <span key={key} {...getTokenProps({ token })} />
                            ))}
                        </div>
                    ))}
                </pre>
            )}
        </Highlight>
    </div>
);

export const InlineCode = ({ children }: any) => (
    <Highlight language="jsx" theme={themes.oneDark} code={children}>
        {({ style, tokens, getLineProps, getTokenProps }) => (
            <code style={{ ...style, ...inlineStyle }}>
                {tokens.map((line, i) => (
                    <span key={i} {...getLineProps({ line })}>
                        {line.map((token, key) => (
                            <span key={key} {...getTokenProps({ token })} />
                        ))}
                    </span>
                ))}
            </code>
        )}
    </Highlight>
);

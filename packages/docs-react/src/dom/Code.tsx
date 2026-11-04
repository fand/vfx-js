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
    backgroundColor: "rgba(0,0,0,0.8)",
} as const;

const inlineStyle = {
    fontSize: "0.8em",
    margin: "4px",
    padding: "4px 8px",
    color: "#EEEEEE",
    backgroundColor: "rgba(0,0,0,0.8)",
} as const;

type Token = { content: string };

const lineLength = (line: Token[]): number =>
    line.reduce((n, t) => n + t.content.length, 0) + 1;

// Pairs each item with its start offset in the source, for a stable key.
function withOffsets<T>(
    items: T[],
    length: (item: T) => number,
): [T, number][] {
    let offset = 0;
    return items.map((item) => {
        const start = offset;
        offset += length(item);
        return [item, start];
    });
}

export const Code = ({ children }: any) => (
    <div>
        <Highlight language="jsx" theme={themes.oneDark} code={children}>
            {({ style, tokens, getLineProps, getTokenProps }) => (
                <pre style={{ ...style, ...preStyle }}>
                    {withOffsets(tokens, lineLength).map(
                        ([line, lineOffset]) => (
                            <div key={lineOffset} {...getLineProps({ line })}>
                                {withOffsets(line, (t) => t.content.length).map(
                                    ([token, tokenOffset]) => (
                                        <span
                                            key={tokenOffset}
                                            {...getTokenProps({ token })}
                                        />
                                    ),
                                )}
                            </div>
                        ),
                    )}
                </pre>
            )}
        </Highlight>
    </div>
);

export const InlineCode = ({ children }: any) => (
    <code style={inlineStyle}>{children}</code>
);

const scenes = [
    {
        id: "a",
        title: "Plain HTML, in a shader",
        body: (
            <>
                This card is an <code>&lt;article&gt;</code> with text, SVG and
                CSS animation. Select the text: it is real.
            </>
        ),
        action: "Read the docs",
    },
    {
        id: "b",
        title: "The new side stays live",
        body: (
            <>
                The shapes and the spinner keep moving during the run. Turn on{" "}
                <code>liveFrom</code> and the old side keeps moving too.
            </>
        ),
        action: "How it works",
    },
    {
        id: "c",
        title: "Fonts, SVG, CSS",
        body: (
            <>
                Whatever the browser paints reaches the shader through{" "}
                <code>readFrom</code> and <code>readTo</code>.
            </>
        ),
        action: "See presets",
    },
    {
        id: "d",
        title: "Change it, then play",
        body: (
            <>
                Your callback edits the DOM. The shader mixes the old page with
                the new one.
            </>
        ),
        action: "Get started",
    },
];

/** A small web page to transition between: text, SVG shapes and CSS animation. */
export function LabScene({ index }: { index: number }) {
    const s = scenes[index % scenes.length];
    return (
        <article
            className="lab-scene"
            data-scene={s.id}
            data-layout={index % 2 === 0 ? "a" : "b"}
        >
            <svg
                className="lab-scene-art"
                viewBox="0 0 100 100"
                aria-hidden="true"
            >
                <circle className="shape-circle" cx="38" cy="40" r="22" />
                <rect
                    className="shape-square"
                    x="50"
                    y="48"
                    width="34"
                    height="34"
                    rx="6"
                />
                <polygon className="shape-tri" points="20,88 40,56 60,88" />
            </svg>
            <div className="lab-scene-text">
                <span className="lab-scene-kicker">
                    &lt;article&gt; ·{" "}
                    {String((index % scenes.length) + 1).padStart(2, "0")}
                </span>
                <h2>{s.title}</h2>
                <p>{s.body}</p>
                <span className="lab-scene-action">{s.action} →</span>
            </div>
            <span className="lab-scene-live">
                <span className="lab-scene-spinner" aria-hidden />
                LIVE
            </span>
        </article>
    );
}

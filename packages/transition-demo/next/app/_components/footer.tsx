import { links } from "../_lib/site";
import { BrandMarkPaths } from "./header";

const columns = [
    {
        title: "Project",
        items: [
            { label: "VFX-JS", href: links.vfxjs },
            { label: "GitHub", href: links.github },
            { label: "npm", href: links.npm },
        ],
    },
    {
        title: "Docs",
        items: [
            { label: "Transition API", href: links.docs },
            {
                label: "Effect API",
                href: "https://github.com/fand/vfx-js/blob/main/docs/EFFECT.md",
            },
            { label: "Issues", href: links.issues },
        ],
    },
];

export function Footer({ simple = false }: { simple?: boolean }) {
    if (simple) {
        return (
            <footer className="footer-simple">
                <p>
                    Part of{" "}
                    <a href={links.vfxjs} target="_blank" rel="noreferrer">
                        VFX-JS
                    </a>
                    . MIT License.
                </p>
                <a href={links.github} target="_blank" rel="noreferrer">
                    GitHub <span aria-hidden>↗</span>
                </a>
            </footer>
        );
    }
    return (
        <footer className="footer">
            <div className="footer-inner">
                <div className="footer-brand">
                    <p className="footer-big">
                        Make the <em>swap</em> the show.
                    </p>
                    <p className="footer-small">
                        Part of{" "}
                        <a href={links.vfxjs} target="_blank" rel="noreferrer">
                            VFX-JS
                        </a>
                        . MIT License. Made by{" "}
                        <a
                            href="https://amagi.dev/"
                            target="_blank"
                            rel="noreferrer"
                        >
                            AMAGI
                        </a>
                        .
                    </p>
                </div>
                {columns.map((col) => (
                    <div key={col.title} className="footer-col">
                        <h4>{col.title}</h4>
                        <ul>
                            {col.items.map((item) => (
                                <li key={item.label}>
                                    <a
                                        href={item.href}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {item.label} <span aria-hidden>↗</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            {/* textLength stretches the wordmark to the full width. */}
            <svg
                className="footer-logo"
                viewBox="0 0 1000 125"
                role="img"
                aria-label="vfx-js/transitions"
            >
                <g transform="translate(0 5) scale(0.4455) translate(-25 -70)">
                    <BrandMarkPaths />
                </g>
                <text
                    x="135"
                    y="95"
                    textLength="865"
                    lengthAdjust="spacingAndGlyphs"
                >
                    vfx-js<tspan className="footer-logo-slash">/</tspan>
                    transitions
                </text>
            </svg>
        </footer>
    );
}

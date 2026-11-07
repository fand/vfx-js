import { links } from "../_lib/site";

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
                        @vfx-js/<em>transitions</em>
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
            {/* The VFX-JS logo, from packages/docs/public/vfx-js-logo-no-padding.svg. */}
            <svg
                className="footer-logo"
                viewBox="0 0 960 361"
                fill="currentColor"
                role="img"
                aria-label="VFX-JS"
            >
                <path d="M735.716 273.351V222.969H838.076L670.137 55.0303H924.229V105.412H792.061L960 273.351H735.716Z" />
                <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M601.492 222.969H656.333V0H706.714V273.351H551.111L601.492 222.969Z"
                />
                <path d="M628.262 139V188.513H578.749L554.178 164.185L578.749 139H628.262Z" />
                <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M330.942 55.0303L440.103 164.191L243.811 360.482H315.353L475.874 199.962L529.171 253.259L564.942 217.488L511.645 164.191L620.805 55.0303H549.263L475.874 128.42L402.484 55.0303H330.942ZM585.958 238.504L551.111 273.351H620.805L585.958 238.504Z"
                />
                <path d="M295.883 105.412V264.179L245.502 314.624V55.0303H383.57V105.412H295.883ZM322.592 188.513V139H372.105L396.676 164.185L372.105 188.513H322.592Z" />
                <path d="M167.939 203.992V55.0303H218.321V325.916L0 107.595V36.0531L167.939 203.992Z" />
            </svg>
        </footer>
    );
}

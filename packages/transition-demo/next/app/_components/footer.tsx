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

export function Footer() {
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
        </footer>
    );
}

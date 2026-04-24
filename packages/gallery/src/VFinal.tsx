import { useState } from "react";
import type { Work } from "./works";

const GHIcon = () => (
    <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
    >
        <path d="M12 .5C5.73.5.67 5.56.67 11.83c0 4.98 3.23 9.2 7.71 10.69.56.1.77-.24.77-.54 0-.27-.01-1.16-.02-2.1-3.14.68-3.8-1.34-3.8-1.34-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.4-1.22.72-1.5-2.5-.29-5.14-1.25-5.14-5.57 0-1.23.44-2.24 1.16-3.03-.12-.29-.5-1.44.11-3 0 0 .95-.3 3.1 1.16a10.8 10.8 0 015.65 0c2.15-1.46 3.1-1.16 3.1-1.16.62 1.56.23 2.71.11 3 .72.79 1.16 1.8 1.16 3.03 0 4.33-2.64 5.28-5.15 5.56.4.35.77 1.04.77 2.1 0 1.52-.01 2.74-.01 3.12 0 .3.2.65.78.54 4.48-1.49 7.7-5.71 7.7-10.69C23.33 5.56 18.27.5 12 .5z" />
    </svg>
);

type Props = {
    works: Work[];
    mobile?: boolean;
};

export const VFinal = ({ works, mobile = false }: Props) => {
    const [activeId, setActiveId] = useState(works[0].id);
    const [mobileOpen, setMobileOpen] = useState(false);
    const active = works.find((w) => w.id === activeId) ?? works[0];

    if (mobile) {
        return (
            <div className="vf-root">
                <div className="vf-mobile">
                    <header className="vf-mtop">
                        <div className="vf-mlogo">
                            VFX<span className="vf-iri">·</span>JS
                        </div>
                        <button
                            type="button"
                            className="vf-mmenu"
                            onClick={() => setMobileOpen(!mobileOpen)}
                        >
                            {mobileOpen ? "CLOSE" : "INDEX"}
                        </button>
                    </header>
                    <div className="vf-mstage">
                        <iframe
                            key={`m-${active.id}`}
                            src={active.url}
                            title={active.title}
                            className="vf-iframe"
                        />
                    </div>
                    <div className="vf-mcaption">
                        <div className="vf-mcap-title">{active.title}</div>
                        <div className="vf-mcap-specs">
                            <span>{active.index}</span>
                            <span>·</span>
                            <span>{active.category}</span>
                            <span>·</span>
                            <span>{active.author}</span>
                        </div>
                    </div>
                    <div className={`vf-mdrawer ${mobileOpen ? "open" : ""}`}>
                        <div className="vf-mdrawer-head">
                            <div className="vf-sublabel">GALLERY / INDEX</div>
                            <button
                                type="button"
                                className="vf-mmenu"
                                onClick={() => setMobileOpen(false)}
                            >
                                CLOSE
                            </button>
                        </div>
                        <div className="vf-mlist">
                            {works.map((w) => (
                                <button
                                    type="button"
                                    key={w.id}
                                    className={`vf-mitem ${activeId === w.id ? "vf-active" : ""}`}
                                    onClick={() => {
                                        setActiveId(w.id);
                                        setMobileOpen(false);
                                    }}
                                >
                                    <div className="vf-midx">{w.index}</div>
                                    <div className="vf-mtitle">{w.title}</div>
                                    <div className="vf-mcat">{w.category}</div>
                                </button>
                            ))}
                        </div>
                        <div className="vf-mfoot">
                            <a
                                href="https://github.com/fand/vfx-js"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="GitHub"
                                className="vf-gh"
                            >
                                <GHIcon /> <span>fand/vfx-js</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="vf-root">
            <div className="vf-desktop">
                <aside className="vf-sidebar">
                    <div className="vf-brand">
                        <div className="vf-logo">
                            VFX<span className="vf-iri">·</span>JS
                        </div>
                        <div className="vf-sublabel">GALLERY / 2024</div>
                    </div>
                    <div className="vf-list">
                        {works.map((w) => (
                            <button
                                type="button"
                                key={w.id}
                                className={`vf-item ${activeId === w.id ? "vf-active" : ""}`}
                                onClick={() => setActiveId(w.id)}
                            >
                                <div className="vf-idx">{w.index}</div>
                                <div className="vf-meta">
                                    <div className="vf-title">{w.title}</div>
                                    <div className="vf-cat">
                                        {w.category} — {w.year}
                                    </div>
                                </div>
                                <div className="vf-arrow">↗</div>
                            </button>
                        ))}
                    </div>
                    <div className="vf-foot">
                        <a
                            href="https://github.com/fand/vfx-js"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="vf-gh"
                            aria-label="GitHub"
                        >
                            <GHIcon />
                        </a>
                        <div className="vf-coord">fand/vfx-js</div>
                    </div>
                </aside>
                <main className="vf-main">
                    <div className="vf-stage">
                        <iframe
                            key={active.id}
                            src={active.url}
                            title={active.title}
                            className="vf-iframe"
                        />
                        <div className="vf-scanlines" />
                    </div>
                    <div className="vf-bottom">
                        <div className="vf-bigtitle">{active.title}</div>
                        <div className="vf-desc">{active.description}</div>
                        <div className="vf-specs">
                            <div>
                                <span>IDX</span>
                                {active.index}
                            </div>
                            <div>
                                <span>CAT</span>
                                {active.category}
                            </div>
                            <div>
                                <span>AUTHOR</span>
                                {active.author}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

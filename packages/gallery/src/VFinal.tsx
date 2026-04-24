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

const VfxJsLogo = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 459 211"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="VFX-JS"
        className={className}
    >
        <path d="M342.863 147V125.027H387.505L314.263 51.7852H425.078V73.7578H367.437L440.679 147H342.863Z" />
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M265 144.352L277.55 131.802L284.325 125.027H308.242V73.41V73.4062L308.24 51.79L308.242 27.7852H330.215V147H292.748H265H262.353L265 144.352Z"
        />
        <path d="M296 110H295.379H274.406L263.69 99.39L274.406 88.4062H296V110Z" />
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M166.332 51.7852L213.939 99.3926L128.332 185H159.533L229.54 114.993L252.784 138.237L268.385 122.637L245.14 99.3926L292.748 51.7852H261.547L229.54 83.792L197.533 51.7852H166.332ZM277.55 131.802L262.352 147H292.748L277.55 131.802Z"
        />
        <path d="M151.042 73.7578V143L129.069 165V51.7852H188.284V73.7578H151.042ZM163.311 110H162.69V88.4062H184.284L195 99.39L184.284 110H163.311Z" />
        <path d="M95.2422 116.751V51.7852H117.215V169.925L22 74.71V43.5088L95.2422 116.751Z" />
    </svg>
);

type Props = {
    works: Work[];
    mobile?: boolean;
};

const SOURCE_BASE =
    "https://github.com/fand/vfx-js/blob/main/packages/gallery/works";

export const VFinal = ({ works, mobile = false }: Props) => {
    const [activeId, setActiveId] = useState(works[0].id);
    const [mobileOpen, setMobileOpen] = useState(false);
    const active = works.find((w) => w.id === activeId) ?? works[0];
    const sourceUrl = active.sourceUrl ?? `${SOURCE_BASE}/${active.id}.html`;

    if (mobile) {
        return (
            <div className="vf-root">
                <div className="vf-mobile">
                    <header className="vf-mtop">
                        <div className="vf-mlogo">
                            <VfxJsLogo className="vf-mlogo-svg" />
                            <span className="vf-mlogo-examples">Examples</span>
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
                        <VfxJsLogo className="vf-logo-svg" />
                        <div className="vf-examples">Examples</div>
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
                                    <div className="vf-cat">{w.category}</div>
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
                            <div>
                                <span>SRC</span>
                                <a
                                    href={sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="vf-src-link"
                                >
                                    GitHub ↗
                                </a>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

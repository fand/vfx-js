import { TransitionIn } from "@vfx-js/react";
import { findPage } from "@vfx-js/testbed-shared";
import { presets } from "@vfx-js/testbed-shared/transitions";

export function PageView({ path }: { path: string }) {
    const page = findPage(path);
    return (
        <section className="page" style={{ background: page.theme }}>
            <TransitionIn transition={presets[page.transition]} />
            <h1>{page.title}</h1>
            <p>{page.lead}</p>
            {page.images.length > 0 && (
                <div className="grid">
                    {page.images.map((src) => (
                        <img
                            key={src}
                            src={src}
                            alt=""
                            crossOrigin="anonymous"
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

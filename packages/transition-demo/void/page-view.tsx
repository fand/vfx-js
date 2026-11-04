import { findPage } from "@vfx-js/transition-demo-shared";

export function PageView({ path }: { path: string }) {
    const page = findPage(path);
    return (
        <section className="page" style={{ background: page.theme }}>
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

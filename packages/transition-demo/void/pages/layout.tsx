import "@vfx-js/transition-demo-shared/style.css";
import { VFXTransition } from "@vfx-js/react";
import { pages } from "@vfx-js/transition-demo-shared";
import { swipe } from "@vfx-js/transitions";
import { Link, useRouter } from "@void/react";

// Void passes the page as an element with its own props,
// so the kept old element still renders the old page.
export default function Layout({ children }: { children: React.ReactNode }) {
    const { path } = useRouter();
    return (
        <>
            <nav className="nav">
                {pages.map((p) => (
                    <Link
                        key={p.path}
                        href={p.path}
                        aria-current={p.path === path ? "page" : undefined}
                    >
                        {p.label}
                    </Link>
                ))}
                <span className="framework">Void</span>
            </nav>
            <VFXTransition
                unstyled
                className="outlet"
                pageKey={path}
                duration={0.8}
                types={{ back: { transition: swipe, reverse: true } }}
            >
                <div style={{ height: "100%" }}>{children}</div>
            </VFXTransition>
        </>
    );
}

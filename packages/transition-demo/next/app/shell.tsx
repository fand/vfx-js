"use client";

import { transition, VFXProvider, VFXTransition } from "@vfx-js/react";
import { pages } from "@vfx-js/transition-demo-shared";
import { presets } from "@vfx-js/transition-demo-shared/transitions";
import { swipe } from "@vfx-js/transitions";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FrozenRouter } from "./frozen-router";

export function Shell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    return (
        <VFXProvider>
            <nav className="nav">
                {pages.map((p) => (
                    <Link
                        key={p.path}
                        href={p.path}
                        aria-current={p.path === pathname ? "page" : undefined}
                        onClick={transition({
                            transition: presets[p.transition],
                        })}
                    >
                        {p.label}
                    </Link>
                ))}
                <span className="framework">Next.js</span>
            </nav>
            <VFXTransition
                className="outlet"
                duration={0.8}
                types={{ back: { transition: swipe, reverse: true } }}
            >
                <div key={pathname} style={{ height: "100%" }}>
                    <FrozenRouter>{children}</FrozenRouter>
                </div>
            </VFXTransition>
        </VFXProvider>
    );
}

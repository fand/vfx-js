"use client";

import { VFXTransition } from "@vfx-js/react";
// Internal Next API, same as @vfx-js/react/next uses.
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { usePathname } from "next/navigation";
import { useContext, useRef } from "react";
import { DocSidebar } from "./_components/doc-sidebar";
import { Header } from "./_components/header";
import { LoaderCover, useLoaded } from "./_components/loader";

// Each page keeps the route it mounted with, so the old page does not render the new route.
function FrozenRouter({ children }: { children: React.ReactNode }) {
    const context = useContext(LayoutRouterContext);
    const frozen = useRef(context).current;
    return (
        <LayoutRouterContext.Provider value={frozen}>
            {children}
        </LayoutRouterContext.Provider>
    );
}

export function Shell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const loaded = useLoaded();
    // The loader is its own page, so leaving it is a normal run.
    const pageKey = loaded ? pathname : "loading";
    return (
        <>
            <Header />
            {/* overflow 0 keeps zoom presets from drawing over the header. */}
            {/* The header takes part of the viewport, so .outlet sets the height. */}
            <VFXTransition
                pageKey={pageKey}
                fullscreen={false}
                className="outlet"
                duration={0.9}
                overflow={0}
            >
                <FrozenRouter>
                    <div className="outlet-page">
                        <DocSidebar />
                        {children}
                        {!loaded && <LoaderCover />}
                    </div>
                </FrozenRouter>
            </VFXTransition>
        </>
    );
}

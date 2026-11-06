"use client";

import { VFXTransition } from "@vfx-js/react/next";
import { usePathname } from "next/navigation";
import { DocSidebar } from "./_components/doc-sidebar";
import { Header } from "./_components/header";
import { LoaderCover, useLoaded } from "./_components/loader";

export function Shell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const loaded = useLoaded();
    // The loader is its own page, so leaving it is a normal run.
    const pageKey = loaded ? pathname : "loading";
    return (
        <>
            <Header />
            {/* overflow 0 keeps zoom presets from drawing over the header. */}
            {/* The header floats over the outlet, so .outlet takes the full viewport. */}
            <VFXTransition
                pageKey={pageKey}
                fullscreen={false}
                className="outlet"
                duration={0.9}
                overflow={0}
            >
                <div className="outlet-page">
                    <DocSidebar />
                    {children}
                    {!loaded && <LoaderCover />}
                </div>
            </VFXTransition>
        </>
    );
}

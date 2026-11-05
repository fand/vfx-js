"use client";

import { VFXTransition } from "@vfx-js/react/next";
import { swipe } from "@vfx-js/transitions";
import { Header } from "./_components/header";

export function Shell({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Header />
            {/* overflow 0 keeps zoom presets from drawing over the header. */}
            <VFXTransition
                className="outlet"
                duration={0.9}
                overflow={0}
                types={{ back: { transition: swipe, reverse: true } }}
            >
                <div className="outlet-page">{children}</div>
            </VFXTransition>
        </>
    );
}

"use client";

import { VFXTransition } from "@vfx-js/react";
import { swipe } from "@vfx-js/transitions";
import { usePathname } from "next/navigation";
import { Header } from "./_components/header";
import { FrozenRouter } from "./frozen-router";

export function Shell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
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
                <div key={pathname} className="outlet-page">
                    <FrozenRouter>{children}</FrozenRouter>
                </div>
            </VFXTransition>
        </>
    );
}
